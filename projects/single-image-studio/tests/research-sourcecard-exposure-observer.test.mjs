import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSourceCardExposureBundle, materializeSourceCardExposureBundle,
  observeSourceCardExposureSignals, validateSourceCardExposureBundle,
} from "../scripts/research-sourcecard-exposure-observer.mjs";
import { encodeReferenceSrgbPng, normalizeFixturePng, sha256 } from "../scripts/research-reference-adapters.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

const CREATED_AT = "2026-08-16T01:00:00.000Z";
const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

function normalizedFor(rgba, id = "test") {
  const bytes = encodeReferenceSrgbPng(2, 2, rgba);
  return normalizeFixturePng({
    bytes,
    imageAsset: {
      schemaVersion: "image-asset.v0", imageAssetId: `image-asset.${id}`, mime: "image/png",
      byteLength: bytes.length, fileSha256: sha256(bytes), orientation: 1, colorProfile: "srgb",
      premultiply: "straight", sourceClass: "project-original-synthetic", createdAt: CREATED_AT,
    },
    normalizedImageId: `normalized.${id}`, createdAt: CREATED_AT,
  });
}

test("exposure observer freezes four objective luminance bands while SourceCard projection stays unknown", async () => {
  const first = await buildSourceCardExposureBundle();
  const second = await buildSourceCardExposureBundle();
  assert.deepEqual([...first.fileMap], [...second.fileMap]);
  assert.deepEqual(first.report.calibration.map((entry) => entry.observation.exposureSignal), [
    "shadow-heavy", "balanced", "highlight-heavy", "mixed-extremes",
  ]);
  assert.equal(first.report.applications.length, 3);
  assert.ok([...first.report.calibration, ...first.report.applications].every(
    (entry) => entry.observation.sourceCardProjection.value === "unknown",
  ));
  assert.equal(first.report.evidenceBoundary.c1, 0);
  assert.equal(first.report.evidenceBoundary.productSupport, false);
});

test("exposure observer fails closed for alpha, invalid time, artifact mismatch, and schema laundering", async () => {
  const rgba = new Uint8Array([128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255]);
  const normalized = normalizedFor(rgba);
  const observation = observeSourceCardExposureSignals({
    normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes,
    observationId: "exposure-observation.test", createdAt: CREATED_AT,
  });
  assert.equal(observation.exposureSignal, "balanced");
  assert.throws(() => observeSourceCardExposureSignals({
    normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes,
    observationId: "bad-time", createdAt: "2026-02-31T00:00:00.000Z",
  }), /exact millisecond UTC/);
  assert.throws(() => observeSourceCardExposureSignals({
    normalizedArtifact: { ...normalized.artifact, width: 1 }, normalizedBytes: normalized.bytes,
    observationId: "bad-artifact", createdAt: CREATED_AT,
  }), /does not match/);
  const alpha = new Uint8Array(rgba); alpha[3] = 128;
  const alphaNormalized = normalizedFor(alpha, "alpha");
  assert.throws(() => observeSourceCardExposureSignals({
    normalizedArtifact: alphaNormalized.artifact, normalizedBytes: alphaNormalized.bytes,
    observationId: "alpha", createdAt: CREATED_AT,
  }), /only opaque/);
  const schema = JSON.parse(await readFile(path.join(PROJECT_ROOT, "research/sourcecard-observers/source-card-exposure-observation.v0.schema.json"), "utf8"));
  const laundered = structuredClone(observation);
  laundered.sourceCardProjection = { field: "quality.exposure", value: "known", reason: "synthetic-pass" };
  assert.ok(validateJsonSchemaInstance(laundered, schema).length > 0);
});

test("candidate registry contains exactly two license-resolved, not-downloaded continuous-alpha candidates", async () => {
  const root = path.join(PROJECT_ROOT, "research/matting-candidates");
  const registry = JSON.parse(await readFile(path.join(root, "continuous-alpha-candidates.v0.json"), "utf8"));
  const schema = JSON.parse(await readFile(path.join(root, "continuous-alpha-candidates.v0.schema.json"), "utf8"));
  assert.deepEqual(validateJsonSchemaInstance(registry, schema), []);
  assert.deepEqual(registry.candidates.map((entry) => entry.registryId), [
    "REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0",
  ]);
  assert.ok(registry.candidates.every((entry) => entry.selectedArtifact.acquisitionState === "not-downloaded"));
  assert.ok(registry.candidates.every((entry) => entry.output === "continuous-alpha-matte"));
  assert.equal(registry.evidenceBoundary.productSupport, false);
});

test("materialized exposure report is byte exact and no-overwrite", async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "sourcecard-exposure-"));
  const bundle = await materializeSourceCardExposureBundle({ outputRoot });
  const validation = await validateSourceCardExposureBundle({ outputRoot });
  assert.equal(validation.valid, true);
  assert.equal(validation.contentHash, bundle.report.contentHash);
  await assert.rejects(() => materializeSourceCardExposureBundle({ outputRoot }), { code: "EEXIST" });
});
