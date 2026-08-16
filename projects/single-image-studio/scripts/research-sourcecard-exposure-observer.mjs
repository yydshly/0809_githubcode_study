import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildResearchFixturePixels } from "./research-generate-fixtures.mjs";
import {
  decodeReferencePng, encodeReferenceSrgbPng, inspectNormalizedImage, normalizeFixturePng, sha256,
} from "./research-reference-adapters.mjs";
import { validateJsonSchemaInstance } from "./research-validate-slice02.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const RESEARCH_ROOT = path.join(PROJECT_ROOT, "research");
const OBSERVER_ROOT = path.join(RESEARCH_ROOT, "sourcecard-observers");
const OBSERVATION_SCHEMA_PATH = path.join(OBSERVER_ROOT, "source-card-exposure-observation.v0.schema.json");
export const SOURCECARD_EXPOSURE_OUTPUT_ROOT = path.join(RESEARCH_ROOT, "results", "sourcecard-exposure-observer-v0");
export const SOURCECARD_EXPOSURE_CREATED_AT = "2026-08-16T01:00:00.000Z";
export const SOURCECARD_EXPOSURE_CONTRACT = "SCO-EXPOSURE-SIGNALS@0.1.0";

const EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0,
  o1: 0, g1: 0, v1: 0, productSupport: false,
});

const CALIBRATION_FIXTURES = Object.freeze([
  { id: "exposure-shadow-uniform-001", expected: "shadow-heavy", pixel: () => [16, 16, 16, 255] },
  { id: "exposure-balanced-uniform-001", expected: "balanced", pixel: () => [128, 128, 128, 255] },
  { id: "exposure-highlight-uniform-001", expected: "highlight-heavy", pixel: () => [240, 240, 240, 255] },
  { id: "exposure-mixed-extremes-001", expected: "mixed-extremes", pixel: (x, y) => (x + y) % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255] },
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}
export function stableStringifyExposure(value) { return JSON.stringify(stableValue(value)); }
function canonicalBytes(value) { return Buffer.from(`${stableStringifyExposure(value)}\n`, "utf8"); }
function hashRecord(record) {
  const payload = { ...record };
  delete payload.contentHash;
  return createHash("sha256").update(canonicalBytes(payload)).digest("hex");
}
function withHash(record) {
  const value = { ...record, contentHash: "" };
  value.contentHash = hashRecord(value);
  return value;
}
function assertUtc(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${label} must be an exact millisecond UTC timestamp`);
  }
}
function round(value) { return Number(value.toFixed(9)); }
function percentile(sorted, q) { return sorted[Math.floor((sorted.length - 1) * q)]; }
function classify(metrics) {
  if (metrics.shadowPixelFraction >= 0.25 && metrics.highlightPixelFraction >= 0.25) return "mixed-extremes";
  if (metrics.p50Luma <= 64) return "shadow-heavy";
  if (metrics.p50Luma >= 192) return "highlight-heavy";
  return "balanced";
}
function imageAsset(bytes, id) {
  return {
    schemaVersion: "image-asset.v0", imageAssetId: `image-asset.exposure.${id}`,
    mime: "image/png", byteLength: bytes.length, fileSha256: sha256(bytes), orientation: 1,
    colorProfile: "srgb", premultiply: "straight", sourceClass: "project-original-synthetic",
    createdAt: SOURCECARD_EXPOSURE_CREATED_AT,
  };
}
function normalizedForRgba(id, width, height, rgba) {
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  const normalized = normalizeFixturePng({
    bytes, imageAsset: imageAsset(bytes, id), normalizedImageId: `normalized.exposure.${id}`,
    createdAt: SOURCECARD_EXPOSURE_CREATED_AT,
  });
  return normalized;
}
function uniformFixtureRgba(fixture, width = 8, height = 8) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) rgba.set(fixture.pixel(x, y), (y * width + x) * 4);
  }
  return { width, height, rgba };
}

export function observeSourceCardExposureSignals({ normalizedArtifact, normalizedBytes, observationId, createdAt }) {
  if (typeof observationId !== "string" || !observationId.trim()) throw new TypeError("observationId is required");
  assertUtc(createdAt, "createdAt");
  const technical = inspectNormalizedImage({ normalizedArtifact, normalizedBytes });
  if (technical.alphaPresent) throw new TypeError("exposure-signal observer v0 accepts only opaque normalized images");
  const decoded = decodeReferencePng(normalizedBytes);
  const luma = [];
  for (let offset = 0; offset < decoded.rgba.length; offset += 4) {
    if (decoded.rgba[offset + 3] !== 255) throw new TypeError("exposure-signal observer v0 requires every alpha sample to be opaque");
    luma.push((54 * decoded.rgba[offset] + 183 * decoded.rgba[offset + 1] + 19 * decoded.rgba[offset + 2] + 128) >> 8);
  }
  const sorted = [...luma].sort((left, right) => left - right);
  const metrics = {
    metricDefinition: "y-prime-integer-rec709-v0.1.0",
    sampleCount: luma.length,
    meanLuma: round(luma.reduce((sum, value) => sum + value, 0) / luma.length),
    p01Luma: percentile(sorted, 0.01), p50Luma: percentile(sorted, 0.5), p99Luma: percentile(sorted, 0.99),
    shadowPixelFraction: round(luma.filter((value) => value <= 16).length / luma.length),
    highlightPixelFraction: round(luma.filter((value) => value >= 239).length / luma.length),
  };
  return withHash({
    schemaVersion: "source-card-exposure-observation.v0", observationId,
    parentNormalizedImageId: normalizedArtifact.normalizedImageId,
    observerContractRef: SOURCECARD_EXPOSURE_CONTRACT,
    input: {
      mime: technical.mime, width: technical.width, height: technical.height, orientation: technical.orientation,
      colorProfile: technical.colorProfile, alphaPresent: technical.alphaPresent,
      fileSha256: sha256(normalizedBytes), pixelSha256: technical.pixelSha256,
    },
    metrics, exposureSignal: classify(metrics),
    sourceCardProjection: { field: "quality.exposure", value: "unknown", reason: "natural-image-calibration-not-frozen" },
    createdAt, evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
}

function assertObservation(observation, schema, label) {
  const issues = validateJsonSchemaInstance(observation, schema);
  if (issues.length) throw new TypeError(`${label} schema mismatch: ${JSON.stringify(issues)}`);
  if (observation.contentHash !== hashRecord(observation)) throw new TypeError(`${label} contentHash mismatch`);
}

export async function buildSourceCardExposureBundle() {
  const schema = JSON.parse(await readFile(OBSERVATION_SCHEMA_PATH, "utf8"));
  const calibration = [];
  for (const fixture of CALIBRATION_FIXTURES) {
    const input = uniformFixtureRgba(fixture);
    const normalized = normalizedForRgba(fixture.id, input.width, input.height, input.rgba);
    const observation = observeSourceCardExposureSignals({
      normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes,
      observationId: `exposure-observation.${fixture.id}`, createdAt: SOURCECARD_EXPOSURE_CREATED_AT,
    });
    assertObservation(observation, schema, fixture.id);
    if (observation.exposureSignal !== fixture.expected) throw new TypeError(`${fixture.id} classification drift`);
    calibration.push({ fixtureId: fixture.id, expectedSignal: fixture.expected, observation });
  }
  const applications = [];
  for (const item of buildResearchFixturePixels()) {
    const normalized = normalizedForRgba(item.fixture.id, item.width, item.height, item.rendered.compositeSaturated);
    const observation = observeSourceCardExposureSignals({
      normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes,
      observationId: `exposure-observation.matte-gt.${item.fixture.id}`, createdAt: SOURCECARD_EXPOSURE_CREATED_AT,
    });
    assertObservation(observation, schema, item.fixture.id);
    applications.push({ fixtureId: item.fixture.id, sourceClass: "project-original-synthetic-matte-gt", observation });
  }
  const report = withHash({
    schemaVersion: "source-card-exposure-observer-report.v0",
    reportId: "source-card-exposure-observer.synthetic-dev-calibration.v0",
    observerContractRef: SOURCECARD_EXPOSURE_CONTRACT, createdAt: SOURCECARD_EXPOSURE_CREATED_AT,
    calibration, applications,
    sourceCardProjection: { field: "quality.exposure", value: "unknown", reason: "natural-image-calibration-not-frozen" },
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
    limitations: [
      "objective opaque-image luminance signals only",
      "four project-original calibration patterns and three project-original MATTE-GT applications",
      "no natural-image semantic calibration, model, weight, user photo, product correction, C1, or release evidence",
    ],
  });
  return Object.freeze({ report: Object.freeze(report), fileMap: new Map([["report.json", canonicalBytes(report)]]) });
}

export async function materializeSourceCardExposureBundle({ outputRoot = SOURCECARD_EXPOSURE_OUTPUT_ROOT } = {}) {
  const bundle = await buildSourceCardExposureBundle();
  for (const [relativePath, bytes] of bundle.fileMap) {
    const target = path.join(outputRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  return bundle;
}

export async function validateSourceCardExposureBundle({ outputRoot = SOURCECARD_EXPOSURE_OUTPUT_ROOT } = {}) {
  const expected = await buildSourceCardExposureBundle();
  const entries = await readdir(outputRoot, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isFile() || entries[0].name !== "report.json") {
    throw new TypeError("exposure observer result root must contain only report.json");
  }
  const actual = await readFile(path.join(outputRoot, "report.json"));
  if (!actual.equals(expected.fileMap.get("report.json"))) throw new TypeError("exposure observer report differs from deterministic rebuild");
  return Object.freeze({ valid: true, reportId: expected.report.reportId, contentHash: expected.report.contentHash, fileCount: 1 });
}

async function main() {
  if (process.argv[2] === "--write") {
    const bundle = await materializeSourceCardExposureBundle();
    process.stdout.write(`${JSON.stringify({ written: true, reportId: bundle.report.reportId, contentHash: bundle.report.contentHash }, null, 2)}\n`);
  } else if (process.argv[2] === "--validate") {
    process.stdout.write(`${JSON.stringify(await validateSourceCardExposureBundle(), null, 2)}\n`);
  } else {
    process.stderr.write("Usage: node scripts/research-sourcecard-exposure-observer.mjs --write|--validate\n");
    process.exitCode = 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
