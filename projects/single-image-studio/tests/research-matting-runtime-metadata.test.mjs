import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MATTING_RUNTIME_METADATA_SCHEMAS,
  buildMattingRuntimeMetadataBundle,
  materializeMattingRuntimeMetadata,
  sha256MattingRuntimeMetadata,
  stableStringifyMattingRuntimeMetadata,
  validateMattingRuntimeMetadata,
  verifyTwoTempMattingRuntimeMetadata,
} from "../scripts/research-generate-matting-runtime-metadata.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

function assertClosedSchema(schema, location = "#") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
  if (schema.type === "object") {
    assert.equal(schema.additionalProperties, false, `${location} must close additional properties`);
    assert.deepEqual([...(schema.required ?? [])].sort(), Object.keys(schema.properties ?? {}).sort(), `${location} must require every property`);
  }
  if (schema.type === "array") assert.ok(schema.items, `${location} array must define items`);
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties") for (const [child, nested] of Object.entries(value)) assertClosedSchema(nested, `${location}/${key}/${child}`);
    else if (key === "items") assertClosedSchema(value, `${location}/items`);
  }
}

function rehash(record) {
  const payload = { ...record }; delete payload.contentHash;
  return { ...record, contentHash: sha256MattingRuntimeMetadata(Buffer.from(`${stableStringifyMattingRuntimeMetadata(payload)}\n`, "utf8")) };
}

test("runtime metadata freezes exact official source observations while all acquisition counters remain zero", async () => {
  const bundle = await buildMattingRuntimeMetadataBundle();
  assert.equal(bundle.fileMap.size, 10);
  assert.deepEqual(bundle.candidateMetadata.map((record) => record.candidateId), ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"]);
  assert.deepEqual(bundle.candidateMetadata.map((record) => record.officialFiles.length), [5, 5]);
  assert.equal(bundle.index.counts.registeredOfficialMetadataTexts, 10);
  for (const key of ["modelHeadRequests", "modelBodyRequests", "modelBytes", "installedCandidateDependencies", "naturalImages", "generatedResults"]) assert.equal(bundle.index.counts[key], 0);
  assert.ok([...bundle.fileMap.keys()].every((relativePath) => !/\.(?:pth|pt|ckpt|onnx|safetensors|whl|png|jpe?g|webp)$/i.test(relativePath)));
});

test("all four schemas are recursively closed and validate exact records", async () => {
  const bundle = await buildMattingRuntimeMetadataBundle();
  for (const schema of Object.values(MATTING_RUNTIME_METADATA_SCHEMAS)) assertClosedSchema(schema);
  const pairs = [
    ...bundle.candidateMetadata.map((record) => [record, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/candidate-runtime-metadata.v0.schema.json"]]),
    [bundle.loaderPolicy, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/safe-checkpoint-loader-policy.v0.schema.json"]],
    [bundle.requestTemplate, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/model-request-authorization-template.v0.schema.json"]],
    [bundle.index, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/runtime-metadata-definition-index.v0.schema.json"]],
  ];
  for (const [record, schema] of pairs) assert.deepEqual(validateJsonSchemaInstance(record, schema), []);
});

test("candidate metadata distinguishes official locator evidence from reproducible runtime readiness", async () => {
  const { candidateMetadata, loaderPolicy, requestTemplate } = await buildMattingRuntimeMetadataBundle();
  const [modnet, rvm] = candidateMetadata;
  assert.equal(modnet.artifact.locatorState, "official-drive-folder-resolved-object-and-hash-unresolved");
  assert.equal(rvm.artifact.locatorState, "official-release-url-resolved-by-fixed-hubconf-bytes-unpinned");
  assert.equal(modnet.dependencies.declarationState, "partial-unpinned-import-and-demo-declarations");
  assert.equal(rvm.dependencies.declarationState, "fixed-requirements-file-plus-broad-hubconf-declaration");
  assert.ok(candidateMetadata.every((record) => record.loading.unsafePickleCompatibleCallPresent));
  assert.ok(candidateMetadata.every((record) => Object.values(record.authorization).every((value) => value === false)));
  assert.equal(loaderPolicy.implementation.loaderImplemented, false);
  assert.equal(requestTemplate.headStage.authorized, false);
  assert.equal(requestTemplate.getStage.authorized, false);
});

test("two-tree rebuild is deterministic and extra model bytes plus synchronized authorization drift fail closed", async () => {
  const rebuilt = await verifyTwoTempMattingRuntimeMetadata(); assert.equal(rebuilt.identical, true); assert.equal(rebuilt.fileCount, 10);
  const extraRoot = path.join(tmpdir(), `matting-runtime-extra-${process.pid}-${Date.now()}`); await materializeMattingRuntimeMetadata({ outputRoot: extraRoot });
  const modelDir = path.join(extraRoot, "weights"); await mkdir(modelDir); await writeFile(path.join(modelDir, "candidate.pth"), Buffer.from("not-a-real-model"));
  await assert.rejects(() => validateMattingRuntimeMetadata({ outputRoot: extraRoot }), /file count mismatch|forbidden/);

  const driftRoot = path.join(tmpdir(), `matting-runtime-drift-${process.pid}-${Date.now()}`); await materializeMattingRuntimeMetadata({ outputRoot: driftRoot });
  const templatePath = path.join(driftRoot, "model-request-authorization-template.json"); const template = JSON.parse(await readFile(templatePath, "utf8"));
  template.getStage.authorized = true; await writeFile(templatePath, `${stableStringifyMattingRuntimeMetadata(rehash(template))}\n`);
  await assert.rejects(() => validateMattingRuntimeMetadata({ outputRoot: driftRoot }), /runtime metadata drift/);
});
