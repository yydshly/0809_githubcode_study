import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SLICE05_ROOT,
  generateSlice05,
  generateSlice05Schemas,
  SLICE05_GENERATED_SCHEMA_PATHS,
} from "../scripts/research-generate-slice05.mjs";
import { inventorySharpRuntimeSlice05 } from "../scripts/research-inventory-sharp-slice05.mjs";
import {
  SLICE05_RUNNER_RECORD_SCHEMAS,
  SLICE05_RUNNER_SCHEMA_PATHS,
} from "../scripts/research-run-slice05.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const TEST_FROZEN_AT = "2026-08-15T12:34:56.789Z";
const STABLE_SCHEMAS = [
  "delivery-artifact.slice04.v0.schema.json",
  "gold-record.slice05.v0.schema.json",
  "normalized-image.slice04.v0.schema.json",
  "oracle-result.slice05.v0.schema.json",
];
const TEST_README = "# Slice 05 test-only definition note\n\nNo results, holdout, escape, product support, or formal evidence.\n";

let inventoryPromise;

function inventory() {
  inventoryPromise ??= inventorySharpRuntimeSlice05();
  return inventoryPromise;
}

async function tempSliceRoot(t, prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const sliceRoot = path.join(wrapper, "slice-05");
  const schemaRoot = path.join(sliceRoot, "schemas");
  await mkdir(schemaRoot, { recursive: true });
  for (const schema of STABLE_SCHEMAS) {
    await cp(path.join(DEFAULT_SLICE05_ROOT, "schemas", schema), path.join(schemaRoot, schema));
  }
  await writeFile(path.join(sliceRoot, "README.md"), TEST_README, "utf8");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  return sliceRoot;
}

async function listFiles(root, base = "") {
  const entries = await readdir(path.join(root, base), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function treeDigest(root, files) {
  const digest = createHash("sha256");
  for (const relative of files) {
    const bytes = await readFile(path.join(root, relative));
    digest.update(relative);
    digest.update("\0");
    digest.update(String(bytes.byteLength));
    digest.update("\0");
    digest.update(createHash("sha256").update(bytes).digest("hex"));
    digest.update("\0");
  }
  return digest.digest("hex");
}

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

test("Slice 05 definition generator is byte-deterministic and creates only open, result-free research material", async (t) => {
  const [rootA, rootB, runtimeInventory] = await Promise.all([
    tempSliceRoot(t, "single-image-slice05-generator-a-"),
    tempSliceRoot(t, "single-image-slice05-generator-b-"),
    inventory(),
  ]);
  const [resultA, resultB] = await Promise.all([
    generateSlice05({ sliceRoot: rootA, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory }),
    generateSlice05({ sliceRoot: rootB, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory }),
  ]);
  assert.deepEqual({ ...resultA, sliceRoot: null }, { ...resultB, sliceRoot: null });
  const [filesA, filesB] = await Promise.all([listFiles(rootA), listFiles(rootB)]);
  assert.deepEqual(filesA, filesB);
  assert.equal(await treeDigest(rootA, filesA), await treeDigest(rootB, filesB));
  for (const relative of filesA) assert.deepEqual(await readFile(path.join(rootA, relative)), await readFile(path.join(rootB, relative)), relative);

  assert.equal(resultA.manifestCount, 6);
  assert.equal(resultA.sourceCount, 108);
  assert.equal(resultA.rawAssetCount, 108);
  assert.equal(resultA.normalizedInputArtifactCount, 54);
  assert.equal(resultA.goldRecordCount, 54);
  assert.equal(resultA.resultCount, 0);
  assert.ok(filesA.every((relative) => !/(?:^|\/)(?:results|holdout|escape)(?:\/|$)/u.test(relative)));
});

test("six operation-specific manifests freeze smoke and 30+18 open calibration denominators with unique lineage", async (t) => {
  const root = await tempSliceRoot(t, "single-image-slice05-manifests-");
  await generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory: await inventory() });
  const manifestPaths = [
    "manifests/normalize-smoke.v0.5.0.json",
    "manifests/export-smoke.v0.5.0.json",
    "manifests/normalize-dev.v0.5.0.json",
    "manifests/normalize-defect.v0.5.0.json",
    "manifests/export-dev.v0.5.0.json",
    "manifests/export-defect.v0.5.0.json",
  ];
  const manifests = await Promise.all(manifestPaths.map((relative) => readJson(root, relative)));
  assert.deepEqual(manifests.map(({ counts }) => [counts.totalSources, counts.applicableSources, counts.rejectionSources]), [
    [6, 3, 3], [6, 3, 3], [30, 18, 12], [18, 6, 12], [30, 18, 12], [18, 6, 12],
  ]);
  assert.ok(manifests.every(({ operationScope, contractRefs, counts }) => operationScope.length === 1 && contractRefs.length === 1 && counts.byOperation.length === 1));
  const entries = manifests.flatMap(({ entries }) => entries);
  assert.equal(entries.length, 108);
  assert.equal(new Set(entries.map(({ sourceId }) => sourceId)).size, 108);
  assert.equal(new Set(entries.map(({ sourceFamilyId }) => sourceFamilyId)).size, 108);
  assert.equal(new Set(entries.map(({ captureSessionId }) => captureSessionId)).size, 108);
  assert.equal(new Set(entries.map(({ rawAsset }) => rawAsset.fileSha256)).size, 108);
  assert.ok(entries.every(({ repetitions }) => repetitions === 3));
  assert.ok(entries.filter(({ operation }) => operation === "export").every(({ normalizedArtifactRef }) => normalizedArtifactRef !== null));
  assert.equal(entries.filter(({ operation, expectedDisposition, normalizedArtifactRef }) => (
    operation === "export" && expectedDisposition === "artifact-required" && normalizedArtifactRef?.producerKind === "independent-fixture-generator"
  )).length, 27);
  assert.equal(entries.filter(({ normalizedArtifactRef }) => normalizedArtifactRef !== null
    && normalizedArtifactRef.producerKind !== "independent-fixture-generator").length, 0);
  assert.ok(entries.filter(({ operation, expectedDisposition }) => operation === "export" && expectedDisposition === "rejection-required")
    .every(({ expectedStableErrorCode }) => expectedStableErrorCode === "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID"));
  const oversize = entries.filter(({ injectedDefect }) => injectedDefect?.defectId === "single-defect.byte-limit-plus-one");
  assert.equal(oversize.length, 2);
  assert.ok(oversize.every(({ rawAsset }) => rawAsset.mime === "image/png"
    && rawAsset.byteLength === 1024 * 1024 + 1 && rawAsset.decodedPixelSha256 === null && rawAsset.path.endsWith(".png")));
  assert.equal(entries.filter(({ goldRecordRef }) => goldRecordRef !== null).length, 54);
});

test("definition index is the closed DAG root and preserves zero evidence and no-results-at-freeze semantics", async (t) => {
  const root = await tempSliceRoot(t, "single-image-slice05-index-");
  const generated = await generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory: await inventory() });
  const index = await readJson(root, "definition-index.v0.5.0.json");
  assert.equal(index.contentHash, generated.definitionIndexContentHash);
  assert.equal(index.machineTree.sha256, generated.descendantTreeSha256);
  assert.equal(index.machineTree.fileCount, generated.descendantFileCount);
  assert.equal(index.machineTree.files.length, generated.descendantFileCount);
  assert.deepEqual(index.proseReadmeRef, {
    path: "README.md",
    byteLength: Buffer.byteLength(TEST_README),
    fileSha256: createHash("sha256").update(TEST_README).digest("hex"),
  });
  assert.equal(index.counts.schemas, SLICE05_GENERATED_SCHEMA_PATHS.length + STABLE_SCHEMAS.length);
  assert.deepEqual(index.initialResultStateAtDefinitionFreeze, {
    resultsDirectoryPresent: false,
    resultFilesPresent: 0,
    admissionRecordsPresent: 0,
    ledgersPresent: 0,
  });
  assert.ok(Object.entries(index.evidenceBoundary).every(([key, value]) => (
    key === "productSupport" || key === "formalEvidence" ? value === false
      : key === "releaseAllowlist" ? value === "none" : value === 0
  )));
  assert.equal(index.smokeManifestRefs.length, 2);
  assert.notEqual(index.smokeManifestRefs[0].ref.path, index.smokeManifestRefs[1].ref.path);
  assert.deepEqual(index.implementationRefs.map(({ role }) => role), [
    "candidate-adapter",
    "candidate-worker",
    "independent-oracle",
    "runtime-inventory",
    "independent-fixture-generator",
    "local-open-runner",
    "fault-semantics-worker",
  ]);
  assert.equal(index.expectedOptionalResults.length, 10);
  assert.ok(index.expectedOptionalResults.every(({ initialState, requiredForDefinitionValidity, pathPattern }) => (
    initialState === "not-created" && requiredForDefinitionValidity === false
      && !new RegExp(pathPattern, "u").test("results/holdout/forbidden.json")
      && !new RegExp(pathPattern, "u").test("results/escape/forbidden.json")
  )));
  const gateB = await readJson(root, index.gateBSmokePlanRef.path);
  assert.equal(gateB.crossOperationAggregationAllowed, false);
  assert.equal(gateB.implementationRefs.length, 7);
  assert.equal(gateB.resultSchemaRefs.length, 10);
  assert.equal(gateB.goldRecordSchemaRef.path, "schemas/gold-record.slice05.v0.schema.json");
  assert.deepEqual(
    gateB.resultSchemaRefs.map(({ path: schemaPath }) => schemaPath).sort(),
    Object.values(SLICE05_RUNNER_SCHEMA_PATHS).sort(),
  );
  for (const [key, schemaPath] of Object.entries(SLICE05_RUNNER_SCHEMA_PATHS)) {
    assert.deepEqual(await readJson(root, schemaPath), SLICE05_RUNNER_RECORD_SCHEMAS[key]);
  }
  for (const contractRef of index.contractRefs) {
    const contract = await readJson(root, contractRef.path);
    assert.deepEqual(contract.runnerRecordSchemaRefs.map(({ role }) => role), [
      "local-run-request", "terminal-run-result", "independent-oracle-result",
    ]);
  }
  for (const preregRef of index.calibrationPreregistrationRefs) {
    assert.equal((await readJson(root, preregRef.path)).goldRecordSchemaRef.path, "schemas/gold-record.slice05.v0.schema.json");
  }
  assert.deepEqual(gateB.operationPlans.map(({ operation, cases }) => [operation, cases.length]), [["normalize", 6], ["export", 6]]);
  assert.ok(gateB.operationPlans.flatMap(({ cases }) => cases).every(({ expectedDisposition, expectedStableErrorCode }) => (
    expectedDisposition === "artifact-required" ? expectedStableErrorCode === null : /^S05_/u.test(expectedStableErrorCode)
  )));
});

test("runtime schema accepts scoped package names and all generated schema paths reject traversal lexically", async (t) => {
  const root = await tempSliceRoot(t, "single-image-slice05-schemas-");
  await generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory: await inventory() });
  const runtimeSchema = await readJson(root, "schemas/runtime-attestation-record.slice05.v0.schema.json");
  const packageName = new RegExp(runtimeSchema.$defs.packageName.pattern, "u");
  const scopeDirectoryName = new RegExp(runtimeSchema.$defs.scopeDirectoryName.pattern, "u");
  const relativePath = new RegExp(runtimeSchema.$defs.relativePath.pattern, "u");
  assert.equal(packageName.test("@img/sharp-win32-x64"), true);
  assert.equal(packageName.test("sharp"), true);
  assert.equal(packageName.test("@img"), false);
  assert.equal(scopeDirectoryName.test("@emnapi"), true);
  assert.equal(scopeDirectoryName.test("emnapi"), false);
  assert.equal(relativePath.test("assets/open/normalize-smoke/source.png"), true);
  assert.equal(relativePath.test("node_modules/@img/sharp-win32-x64/lib/libvips-42.dll"), true);
  assert.equal(relativePath.test("../holdout/private.png"), false);
  assert.equal(relativePath.test("assets//source.png"), false);
  assert.equal(relativePath.test("assets/./source.png"), false);
  assert.equal(relativePath.test("C:\\private\\photo.png"), false);
});

test("definition regeneration cleans only owned stale files and refuses to touch evidence", async (t) => {
  const root = await tempSliceRoot(t, "single-image-slice05-regeneration-");
  const runtimeInventory = await inventory();
  await generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory });
  const stale = path.join(root, "assets", "open", "stale-generator-output.bin");
  const readme = path.join(root, "README.md");
  await writeFile(stale, "stale-owned-output", "utf8");
  await writeFile(readme, "handwritten definition note\n", "utf8");
  await generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory });
  await assert.rejects(readFile(stale), { code: "ENOENT" });
  assert.equal(await readFile(readme, "utf8"), "handwritten definition note\n");

  const evidence = path.join(root, "results", "open-smoke", "sentinel.json");
  await mkdir(path.dirname(evidence), { recursive: true });
  await writeFile(evidence, "{\"mustRemain\":true}\n", "utf8");
  await assert.rejects(
    generateSlice05({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory }),
    /definition regeneration is forbidden after evidence begins/u,
  );
  await assert.rejects(
    generateSlice05Schemas({ sliceRoot: root }),
    /definition regeneration is forbidden after evidence begins/u,
  );
  assert.equal(await readFile(evidence, "utf8"), "{\"mustRemain\":true}\n");
});
