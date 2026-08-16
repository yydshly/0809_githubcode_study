import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MATTING_ACQUISITION_SCHEMAS,
  MATTING_ACQUISITION_ROOT,
  buildMattingAcquisitionGovernanceBundle,
  materializeMattingAcquisitionGovernance,
  sha256MattingAcquisition,
  stableStringifyMattingAcquisition,
  validateMattingAcquisitionGovernance,
  verifyTwoTempMattingAcquisitionGovernance,
} from "../scripts/research-generate-matting-acquisition-governance.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

function assertClosedSchema(schema, location = "#") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
  if (schema.type === "object") {
    assert.equal(schema.additionalProperties, false, `${location} must close additional properties`);
    const keys = Object.keys(schema.properties ?? {}).sort();
    assert.deepEqual([...(schema.required ?? [])].sort(), keys, `${location} must require every property`);
  }
  if (schema.type === "array") assert.ok(schema.items, `${location} array must define items`);
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties" || key === "$defs") for (const [child, nested] of Object.entries(value)) assertClosedSchema(nested, `${location}/${key}/${child}`);
    else if (key === "items") assertClosedSchema(value, `${location}/items`);
  }
}

function rehash(record) {
  const payload = { ...record }; delete payload.contentHash;
  return { ...record, contentHash: sha256MattingAcquisition(Buffer.from(`${stableStringifyMattingAcquisition(payload)}\n`, "utf8")) };
}

test("matting acquisition definition freezes governance and two blocked candidate plans with zero material", async () => {
  const bundle = await buildMattingAcquisitionGovernanceBundle();
  assert.equal(bundle.fileMap.size, 10);
  assert.equal(bundle.index.counts.selectedNaturalImages, 0);
  assert.equal(bundle.index.counts.downloadedModelArtifacts, 0);
  assert.equal(bundle.index.counts.installedCandidateDependencies, 0);
  assert.equal(bundle.index.counts.generatedResults, 0);
  assert.deepEqual(bundle.candidatePlans.map((item) => item.candidateId), ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"]);
  assert.deepEqual(bundle.candidatePlans.map((item) => item.artifact.acquisitionState), ["not-downloaded", "not-downloaded"]);
  assert.ok([...bundle.fileMap.keys()].every((relative) => !/\.(?:png|jpe?g|webp|pth|pt|ckpt|onnx|safetensors)$/i.test(relative)));
  for (const ref of bundle.index.sourceRefs) {
    const bytes = await readFile(path.resolve(MATTING_ACQUISITION_ROOT, ref.path));
    assert.equal(sha256MattingAcquisition(bytes), ref.fileSha256);
  }
});

test("all four governance schemas are recursively closed and validate their exact records", async () => {
  const bundle = await buildMattingAcquisitionGovernanceBundle();
  for (const schema of Object.values(MATTING_ACQUISITION_SCHEMAS)) assertClosedSchema(schema);
  const pairs = [
    [bundle.governance, MATTING_ACQUISITION_SCHEMAS["schemas/natural-person-data-governance.v0.schema.json"]],
    [bundle.runtimePolicy, MATTING_ACQUISITION_SCHEMAS["schemas/runtime-isolation-policy.v0.schema.json"]],
    ...bundle.candidatePlans.map((record) => [record, MATTING_ACQUISITION_SCHEMAS["schemas/model-acquisition-plan.v0.schema.json"]]),
    [bundle.index, MATTING_ACQUISITION_SCHEMAS["schemas/acquisition-definition-index.v0.schema.json"]],
  ];
  for (const [record, schema] of pairs) assert.deepEqual(validateJsonSchemaInstance(record, schema), []);
});

test("natural-person governance separates open and sealed partitions and forbids user photos", async () => {
  const { governance, runtimePolicy, candidatePlans } = await buildMattingAcquisitionGovernanceBundle();
  const partitions = Object.fromEntries(governance.partitionPlan.map((item) => [item.partition, item]));
  assert.deepEqual(Object.fromEntries(Object.entries(partitions).map(([key, value]) => [key, value.plannedMinimumIndependentSources])), { dev: 24, holdout: 24, defect: 12, "defect-holdout": 12, escape: 0 });
  assert.equal(partitions.dev.formal, false); assert.equal(partitions.holdout.formal, true);
  assert.equal(partitions.defect.formal, false); assert.equal(partitions["defect-holdout"].formal, true); assert.equal(partitions.escape.formal, false);
  assert.equal(governance.population.realUserUploadsAllowed, false);
  assert.equal(governance.authorization.sourceAcquisitionAuthorized, false);
  assert.equal(runtimePolicy.network.runtimeNetwork, "disabled");
  assert.equal(runtimePolicy.execution.inferenceAuthorized, false);
  assert.deepEqual(candidatePlans.map((item) => item.artifact.locatorState), ["unresolved-official-direct-artifact", "resolved-official-release-url"]);
  assert.ok(candidatePlans.every((item) => Object.values(item.admission).every((value) => value === false)));
});

test("governance rebuild is deterministic and rejects extra model bytes plus synchronized semantic drift", async () => {
  const rebuilt = await verifyTwoTempMattingAcquisitionGovernance(); assert.equal(rebuilt.identical, true); assert.equal(rebuilt.fileCount, 10);
  const root = path.join(tmpdir(), `matting-acquisition-adversarial-${process.pid}-${Date.now()}`); await materializeMattingAcquisitionGovernance({ outputRoot: root });
  const modelDir = path.join(root, "weights"); await mkdir(modelDir); await writeFile(path.join(modelDir, "candidate.ckpt"), Buffer.from("not-a-real-model"));
  await assert.rejects(() => validateMattingAcquisitionGovernance({ outputRoot: root }), /file count mismatch|forbidden/);

  const driftRoot = path.join(tmpdir(), `matting-acquisition-drift-${process.pid}-${Date.now()}`); await materializeMattingAcquisitionGovernance({ outputRoot: driftRoot });
  const indexPath = path.join(driftRoot, "definition-index.json"); const index = JSON.parse(await readFile(indexPath, "utf8"));
  index.counts.generatedResults = 1; await writeFile(indexPath, `${stableStringifyMattingAcquisition(rehash(index))}\n`);
  await assert.rejects(() => validateMattingAcquisitionGovernance({ outputRoot: driftRoot }), /governance drift/);
});
