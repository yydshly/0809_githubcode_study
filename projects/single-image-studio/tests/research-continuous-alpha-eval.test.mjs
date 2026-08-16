import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildContinuousAlphaDefinitionBundle, materializeContinuousAlphaDefinition,
  scoreContinuousAlphaPlane, validateContinuousAlphaDefinition, verifyTwoTempContinuousAlphaTrees,
} from "../scripts/research-generate-continuous-alpha-eval.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

function assertSchemaClosed(node, pathLabel = "$") {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (node.type === "object") {
    assert.equal(node.additionalProperties, false, `${pathLabel} must reject additional properties`);
    assert.deepEqual(new Set(node.required ?? []), new Set(Object.keys(node.properties ?? {})), `${pathLabel} must require every property`);
  }
  if (node.properties) for (const [key, child] of Object.entries(node.properties)) assertSchemaClosed(child, `${pathLabel}.properties.${key}`);
  if (node.$defs) for (const [key, child] of Object.entries(node.$defs)) assertSchemaClosed(child, `${pathLabel}.$defs.${key}`);
  if (node.items && typeof node.items === "object") assertSchemaClosed(node.items, `${pathLabel}.items`);
  if (node.oneOf) node.oneOf.forEach((child, index) => assertSchemaClosed(child, `${pathLabel}.oneOf[${index}]`));
}

test("continuous-alpha definition freezes six source units, twelve assets, two candidates, and zero results", async () => {
  const bundle = await buildContinuousAlphaDefinitionBundle();
  assert.equal(bundle.fileMap.size, 20);
  assert.equal(bundle.manifest.sourceCount, 6);
  assert.equal(bundle.manifest.assetCount, 12);
  assert.deepEqual(bundle.manifest.fixtures.map((entry) => entry.category), [
    "binary-hard", "topology-hole", "radial-soft", "diagonal-feather", "thin-structure", "semi-transparent",
  ]);
  assert.deepEqual(bundle.plan.registeredCandidateIds, ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"]);
  assert.equal(bundle.plan.denominator.plannedAttemptsPerCandidate, 18);
  assert.equal(bundle.plan.denominator.plannedTotalAttempts, 36);
  assert.equal(bundle.plan.resultState, "not-created");
  assert.equal(bundle.plan.thresholdState, "not-frozen-no-capability-pass-decision");
  assert.equal(bundle.plan.evidenceBoundary.productSupport, false);
  assert.ok([...bundle.fileMap.keys()].every((name) => !/(^|\/)(results|holdout|formal|escape|weights|models|artifacts)(\/|$)/.test(name)));
});

test("continuous-alpha schemas are closed and generated records satisfy their exact schemas", async () => {
  const bundle = await buildContinuousAlphaDefinitionBundle();
  for (const [relativePath, bytes] of bundle.fileMap) {
    if (!relativePath.startsWith("schemas/")) continue;
    const schema = JSON.parse(bytes);
    assertSchemaClosed(schema, relativePath);
    const instance = relativePath.includes("contract") ? bundle.contract : relativePath.includes("manifest") ? bundle.manifest : relativePath.includes("plan") ? bundle.plan : null;
    if (instance) assert.deepEqual(validateJsonSchemaInstance(instance, schema), []);
  }
  const outputSchema = JSON.parse(bundle.fileMap.get("schemas/continuous-alpha-output.v0.schema.json"));
  const perfect = scoreContinuousAlphaPlane(new Uint8Array(19200), new Uint8Array(19200));
  const output = {
    schemaVersion: "continuous-alpha-output.v0", outputId: "output.test", candidateId: "candidate.test", sourceId: "source.test", repetition: 1,
    width: 160, height: 120, alphaPlane: { encoding: "row-major-alpha8", byteLength: 19200, sha256: "0".repeat(64) },
    metrics: perfect, createdAt: "2026-08-16T02:00:00.000Z",
    evidenceBoundary: { c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0, o1: 0, g1: 0, v1: 0, productSupport: false },
    contentHash: "1".repeat(64),
  };
  assert.deepEqual(validateJsonSchemaInstance(output, outputSchema), []);
  const laundered = structuredClone(output); laundered.evidenceBoundary.productSupport = true;
  assert.ok(validateJsonSchemaInstance(laundered, outputSchema).length > 0);
});

test("metric implementation keeps continuous boundary error separate from binary overlap", () => {
  const expected = new Uint8Array([0, 64, 128, 192, 255]);
  assert.deepEqual(scoreContinuousAlphaPlane(expected, expected), {
    meanAbsoluteError: 0, rootMeanSquaredError: 0, sumAbsoluteDifferenceNormalized: 0,
    maximumAbsoluteError: 0, exactPixelRate: 1, foregroundIouAt128: 1,
    boundaryPixelCount: 3, boundaryMeanAbsoluteError: 0,
  });
  const hardened = new Uint8Array([0, 0, 255, 255, 255]);
  const metrics = scoreContinuousAlphaPlane(hardened, expected);
  assert.equal(metrics.foregroundIouAt128, 1);
  assert.ok(metrics.boundaryMeanAbsoluteError > 0);
  assert.ok(metrics.meanAbsoluteError > 0);
  assert.throws(() => scoreContinuousAlphaPlane(new Uint8Array(1), new Uint8Array(2)), /equal non-empty/);
});

test("definition rebuild is byte-identical across two roots and rejects extra result material", async () => {
  const twin = await verifyTwoTempContinuousAlphaTrees();
  assert.equal(twin.identical, true);
  assert.equal(twin.fileCount, 20);
  const outputRoot = await mkdtemp(path.join(tmpdir(), "continuous-alpha-definition-"));
  await materializeContinuousAlphaDefinition({ outputRoot });
  const valid = await validateContinuousAlphaDefinition({ outputRoot });
  assert.equal(valid.valid, true);
  assert.equal(valid.sourceCount, 6);
  assert.equal(valid.plannedAttempts, 36);
  await writeFile(path.join(outputRoot, "rogue-result.json"), "{}\n", "utf8");
  await assert.rejects(() => validateContinuousAlphaDefinition({ outputRoot }), /file count mismatch/);
});
