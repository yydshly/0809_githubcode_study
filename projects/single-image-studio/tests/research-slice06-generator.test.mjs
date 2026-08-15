import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SLICE06_ROOT,
  generateSlice06,
  SLICE06_COMMIT_PINS,
  SLICE06_DEFINITION_IDS,
  SLICE06_DEFINITION_PATHS,
  SLICE06_EXPECTED_SCHEMA_PATHS,
  SLICE06_FROZEN_AT,
  SLICE06_GENERATED_SCHEMA_DOCUMENTS,
  SLICE06_MACHINE_SCHEMA_DOCUMENTS,
  SLICE06_RESULT_ROOT,
  SLICE06_SOURCE_SPECS,
  contentHashSlice06Definition,
} from "../scripts/research-generate-slice06.mjs";
import { inventorySharpRuntimeSlice05 } from "../scripts/research-inventory-sharp-slice05.mjs";
import {
  SLICE06_EVIDENCE_BOUNDARY,
  SLICE06_RUNNER_SCHEMA_DOCUMENTS,
} from "../scripts/research-run-slice06.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const TEST_FROZEN_AT = SLICE06_FROZEN_AT;
const TEST_README = "# Slice 06 test-only definition preview\n\nNo results, Gate B authority, calibration, product support, holdout, or escape.\n";

let inventoryPromise;

function inventory() {
  inventoryPromise ??= inventorySharpRuntimeSlice05();
  return inventoryPromise;
}

async function tempSliceRoot(t, prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const sliceRoot = path.join(wrapper, "slice-06");
  await mkdir(sliceRoot, { recursive: true });
  await writeFile(path.join(sliceRoot, "README.md"), TEST_README, "utf8");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  return sliceRoot;
}

async function listFiles(root, base = "") {
  const entries = await readdir(path.join(root, base), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
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

async function generatedRoot(t, prefix = "single-image-slice06-generator-") {
  const root = await tempSliceRoot(t, prefix);
  const generated = await generateSlice06({
    sliceRoot: root,
    projectRoot: PROJECT_ROOT,
    frozenAt: TEST_FROZEN_AT,
    runtimeInventory: await inventory(),
  });
  return { root, generated };
}

const ALLOWED_SCHEMA_KEYWORDS = new Set([
  "$schema", "$id", "$ref", "$defs", "title", "description", "type", "const", "enum", "pattern", "format",
  "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "uniqueItems",
  "items", "properties", "required", "additionalProperties", "oneOf",
]);

function auditSchemaNode(value, location, issues) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => auditSchemaNode(entry, `${location}/${index}`, issues));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (!ALLOWED_SCHEMA_KEYWORDS.has(key) && location.includes("/schema")) issues.push(`${location}: unknown keyword ${key}`);
  }
  if (value.type === "object") {
    if (value.additionalProperties !== false) issues.push(`${location}: object is not closed`);
    const propertyKeys = Object.keys(value.properties ?? {}).sort();
    const requiredKeys = [...(value.required ?? [])].sort();
    if (!Array.isArray(value.required) || JSON.stringify(propertyKeys) !== JSON.stringify(requiredKeys)) {
      issues.push(`${location}: required does not equal properties`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "properties" || key === "$defs") {
      for (const [name, schema] of Object.entries(child)) {
        auditSchemaNode(schema, `${location}/${key}/${name}`, issues);
      }
    } else if (key === "items" || key === "oneOf") {
      auditSchemaNode(child, `${location}/${key}`, issues);
    }
  }
}

test("Slice 06 definition generator is byte deterministic across two fixed-UTC results-zero preview trees", async (t) => {
  const [rootA, rootB, runtimeInventory] = await Promise.all([
    tempSliceRoot(t, "single-image-slice06-generator-a-"),
    tempSliceRoot(t, "single-image-slice06-generator-b-"),
    inventory(),
  ]);
  const [generatedA, generatedB] = await Promise.all([
    generateSlice06({ sliceRoot: rootA, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory }),
    generateSlice06({ sliceRoot: rootB, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory }),
  ]);
  assert.deepEqual({ ...generatedA, sliceRoot: null }, { ...generatedB, sliceRoot: null });
  const [filesA, filesB] = await Promise.all([listFiles(rootA), listFiles(rootB)]);
  assert.deepEqual(filesA, filesB);
  assert.equal(await treeDigest(rootA, filesA), await treeDigest(rootB, filesB));
  for (const relative of filesA) {
    assert.deepEqual(await readFile(path.join(rootA, relative)), await readFile(path.join(rootB, relative)), relative);
  }
  assert.deepEqual({
    schemas: generatedA.schemaCount,
    recordsExcludingIndex: generatedA.machineRecordCountExcludingIndex,
    descendants: generatedA.descendantFileCount,
    fullMachine: generatedA.fullMachineFileCount,
    manifests: generatedA.manifestCount,
    sources: generatedA.sourceLineageCount,
    attempts: generatedA.plannedAttemptCount,
    copiedImageBytes: generatedA.copiedImageByteCount,
    results: generatedA.resultCount,
  }, {
    schemas: 26, recordsExcludingIndex: 23, descendants: 49, fullMachine: 50,
    manifests: 2, sources: 8, attempts: 24, copiedImageBytes: 0, results: 0,
  });
  assert.ok(filesA.every((relative) => !/(?:^|\/)(?:results|artifacts|holdout|defect-holdout|escape)(?:\/|$)/u.test(relative)));
});

test("all 26 materialized schemas are exact-id, recursively closed and backed by dynamic runner exports", async (t) => {
  const { root } = await generatedRoot(t, "single-image-slice06-schema-");
  const schemaFiles = (await listFiles(root)).filter((relative) => relative.startsWith("schemas/"));
  assert.deepEqual(schemaFiles, [...SLICE06_EXPECTED_SCHEMA_PATHS]);
  assert.equal(Object.keys(SLICE06_RUNNER_SCHEMA_DOCUMENTS).length, 10);
  assert.equal(Object.keys(SLICE06_MACHINE_SCHEMA_DOCUMENTS).length, 13);
  assert.equal(Object.keys(SLICE06_GENERATED_SCHEMA_DOCUMENTS).length, 23);
  for (const relative of schemaFiles) {
    const schema = await readJson(root, relative);
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relative)}`);
    const issues = [];
    auditSchemaNode(schema, `/schema/${relative}`, issues);
    assert.deepEqual(issues, [], relative);
  }
  for (const [relative, schema] of Object.entries(SLICE06_RUNNER_SCHEMA_DOCUMENTS)) {
    assert.deepEqual(await readJson(root, relative), schema, relative);
  }
});

test("eight wrappers use new identities while referencing only the exact committed Slice 05 regression material", async (t) => {
  const { root } = await generatedRoot(t, "single-image-slice06-lineage-");
  const wrappers = await Promise.all(SLICE06_SOURCE_SPECS.map((spec) => readJson(
    root,
    `sources/${spec.operation}-diagnostic/${spec.sourceId}.json`,
  )));
  assert.equal(new Set(wrappers.map(({ sourceId }) => sourceId)).size, 8);
  assert.equal(new Set(wrappers.map(({ sourceFamilyId }) => sourceFamilyId)).size, 8);
  assert.equal(new Set(wrappers.map(({ captureSessionId }) => captureSessionId)).size, 8);
  assert.deepEqual(wrappers.map(({ regressionLineageRef }) => regressionLineageRef.sourceId), SLICE06_SOURCE_SPECS.map(({ lineageId }) => lineageId));
  assert.ok(wrappers.every(({ independenceClaim, newIndependentSource, reuseBoundary, byteAssetRef }) => (
    independenceClaim === false && newIndependentSource === false
      && Object.values(reuseBoundary).every((value) => value === false)
      && byteAssetRef.path.startsWith("research/slice-05/assets/open/")
  )));
  assert.equal(wrappers.filter(({ operation, inputArtifactRef }) => operation === "normalize" && inputArtifactRef === null).length, 4);
  assert.equal(wrappers.filter(({ operation, inputArtifactRef }) => operation === "export" && inputArtifactRef !== null).length, 4);
  assert.equal(wrappers.filter(({ expectedDisposition, goldRef }) => expectedDisposition === "applicable" && goldRef !== null).length, 6);
  assert.equal(wrappers.filter(({ expectedDisposition, goldRef }) => expectedDisposition === "preflight-reject" && goldRef === null).length, 2);
  assert.deepEqual(wrappers.filter(({ expectedDisposition }) => expectedDisposition === "preflight-reject")
    .map(({ expectedStableErrorCode }) => expectedStableErrorCode), ["S06_INPUT_SRGB_REQUIRED", "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID"]);
});

test("definition index is the closed DAG root with driver/runtime/result protocol pins and every evidence axis zero", async (t) => {
  const { root, generated } = await generatedRoot(t, "single-image-slice06-index-");
  const index = await readJson(root, SLICE06_DEFINITION_PATHS.definition);
  assert.equal(index.definitionIndexId, SLICE06_DEFINITION_IDS.definition);
  assert.equal(index.definitionState, "frozen-definition-results-zero-diagnostic-only");
  assert.equal(index.contentHash, generated.definitionIndexContentHash);
  assert.equal(index.machineTree.sha256, generated.descendantTreeSha256);
  assert.equal(index.machineTree.fileCount, 49);
  assert.equal(index.machineTree.files.length, 49);
  assert.deepEqual(index.initialResultStateAtDefinitionFreeze, {
    resultsDirectoryPresent: false, resultFilesPresent: 0, ledgersPresent: 0, summariesPresent: 0,
    closeRecordsPresent: 0, specimensPresent: 0, quarantinePresent: 0,
  });
  assert.equal(index.resultProtocol.canonicalResultsRoot, SLICE06_RESULT_ROOT);
  assert.deepEqual(index.resultProtocol, {
    canonicalResultsRoot: "research/slice-06/results/open-diagnostic",
    maximumDriverInvocations: 1, plannedRegisteredOperationRuns: 2,
    plannedSourceUnits: 8, plannedAttempts: 24, replacementAttempts: 0,
    globalStop: {
      operationOrder: ["normalize", "export"],
      secondOperationRegistrationRequiresFirstStatus: "characterization-complete",
      firstOperationBlockingStatuses: ["protocol-failed", "inconclusive"],
      actualCountsRecordedOnlyByDriverAfterExecution: true,
    },
    resultAllowlist: index.resultProtocol.resultAllowlist,
  });
  assert.ok(Object.keys(index.resultProtocol).every((key) => !/^(?:actual|total)/u.test(key)));
  assert.equal(index.resultProtocolSchemaRefs.length, 13);
  assert.equal(index.implementationRefs.length, 8);
  assert.ok(index.implementationRefs.some(({ role, ref }) => role === "registered-diagnostic-driver"
    && ref.path === "scripts/research-execute-slice06.mjs"));
  assert.ok(index.implementationRefs.every(({ role, ref }) => role !== "central-validator"
    && ref.path !== "scripts/research-validate-slice06.mjs"));
  assert.ok(index.implementationRefs.some(({ role, ref }) => role === "regression-material-decoder"
    && ref.path === "scripts/research-independent-png-oracle-slice05.mjs" && ref.version === "0.5.0"));
  assert.deepEqual(index.executionAdmission, {
    definitionFrozen: true, resultsZero: true, containingGitCommitMustBePushedBeforeRun: true,
    containingCommitRecordedInDefinition: false, driverMustVerifyHeadAndOrigin: true,
    registeredInvocationPerOperation: 1,
  });
  assert.deepEqual(index.evidenceBoundary, SLICE06_EVIDENCE_BOUNDARY);
  for (const descriptor of index.machineTree.files) {
    const bytes = await readFile(path.join(root, descriptor.path));
    assert.equal(bytes.byteLength, descriptor.byteLength, descriptor.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), descriptor.fileSha256, descriptor.path);
  }
});

test("closure, fresh runtime, rights, retention and reconciliation stops preserve the diagnostic-only boundary", async (t) => {
  const { root } = await generatedRoot(t, "single-image-slice06-boundary-");
  const [closure, runtime, rights, retention, candidate, errorRegistry, normalizePlan, exportPlan] = await Promise.all([
    readJson(root, SLICE06_DEFINITION_PATHS.closureLineage),
    readJson(root, SLICE06_DEFINITION_PATHS.runtime),
    readJson(root, SLICE06_DEFINITION_PATHS.rights),
    readJson(root, SLICE06_DEFINITION_PATHS.retention),
    readJson(root, SLICE06_DEFINITION_PATHS.candidate),
    readJson(root, SLICE06_DEFINITION_PATHS.errorRegistry),
    readJson(root, SLICE06_DEFINITION_PATHS.normalizePlan),
    readJson(root, SLICE06_DEFINITION_PATHS.exportPlan),
  ]);
  assert.deepEqual(closure.commitPins, SLICE06_COMMIT_PINS);
  assert.equal(closure.commitPins.slice06PreviousProtocolBaselineCommit, "002e28963289e1f49e49a29ca78ebf820958f235");
  assert.equal(closure.commitPins.slice06ProtocolCommit, "ed5a60fb2f103494f78fda4260909c6e83a1baf6");
  assert.notEqual(closure.commitPins.slice06ProtocolCommit, closure.commitPins.slice06PreviousProtocolBaselineCommit);
  assert.equal(closure.slice05Definition.definitionRef.contentHash, "d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271");
  assert.equal(closure.slice05Definition.descendantMachineTree.sha256, "8b340918e423043538997250c63b9b49b175b2d2b349c4835de48dd017ed82c0");
  assert.equal(closure.slice05ResultClosure.resultTree.sha256, "e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b");
  assert.ok(closure.slice05ResultClosure.operations.every(({ decision, calibrationAuthorized, historicalOracleChildSubtype }) => (
    decision === "denied-not-entered" && calibrationAuthorized === false && historicalOracleChildSubtype === "unknown"
  )));
  assert.equal(runtime.observedCandidateId, "REG-NORM-SHARP@0.6.0");
  assert.equal(runtime.sourceSlice05RuntimeRef.id, "RUNTIME-SHARP-WIN32-X64@0.5.0");
  assert.deepEqual(runtime.observationBoundary, {
    freshInventoryRequired: true, sourceSlice05RuntimeRecordReusedAsObservation: false, inventoryHelperReusedReadOnly: true,
  });
  assert.equal(runtime.expectedWorkerRuntime.sharpVersion, "0.35.3");
  assert.equal(runtime.expectedWorkerRuntime.settings.concurrency, 1);
  assert.equal(runtime.executionBoundary.candidatePipelineInvoked, false);
  assert.equal(rights.independenceClaim, false);
  assert.equal(rights.permissions.candidateDerivativeRepositoryRetention, true);
  assert.equal(rights.permissions.artifactPublication, false);
  assert.equal(retention.maxPerOutputBytes, 1024 * 1024);
  assert.equal(retention.maxSessionBytes, 18 * 1024 * 1024);
  assert.equal(retention.disposition.oraclePass, "specimens-nonartifact");
  assert.equal(retention.disposition.oracleNonPass, "quarantine-nonartifact");
  assert.equal(candidate.selectionStatus, "diagnostic-only-not-selected");
  assert.equal(candidate.stateAtDefinitionFreeze.gateB, "not-entered-diagnostic-only");
  const registryByCode = new Map(errorRegistry.registeredCodes.map((entry) => [entry.code, entry]));
  for (const code of ["S06_PUBLICATION_RECONCILIATION_UNKNOWN", "S06_WORKER_RECONCILIATION_UNKNOWN"]) {
    assert.deepEqual(registryByCode.get(code), { code, class: "stop", terminalRole: "inconclusive" });
    for (const plan of [normalizePlan, exportPlan]) {
      assert.deepEqual(plan.stopRules.find((entry) => entry.code === code), {
        code,
        condition: code === "S06_PUBLICATION_RECONCILIATION_UNKNOWN"
          ? "durable closure publication cannot be reconciled"
          : "worker exit identity cannot be confirmed",
        disposition: "inconclusive",
      });
    }
  }
  for (const record of [closure, runtime, rights, retention, candidate, errorRegistry, normalizePlan, exportPlan]) {
    assert.equal(record.contentHash, contentHashSlice06Definition(record));
    assert.deepEqual(record.evidenceBoundary, SLICE06_EVIDENCE_BOUNDARY);
  }
});

test("generator requires an explicit freeze instant and refuses regeneration after any result material appears", async (t) => {
  const root = await tempSliceRoot(t, "single-image-slice06-guard-");
  await assert.rejects(generateSlice06({ sliceRoot: root, projectRoot: PROJECT_ROOT, runtimeInventory: await inventory() }), /must be supplied/u);
  await assert.rejects(
    generateSlice06({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: "2026-08-15T08:17:06.289Z", runtimeInventory: await inventory() }),
    /frozenAt is immutable/u,
  );
  await generateSlice06({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory: await inventory() });
  const resultSentinel = path.join(root, "results", "open-diagnostic", "sentinel.json");
  await mkdir(path.dirname(resultSentinel), { recursive: true });
  await writeFile(resultSentinel, "{\"mustRemain\":true}\n", "utf8");
  await assert.rejects(
    generateSlice06({ sliceRoot: root, projectRoot: PROJECT_ROOT, frozenAt: TEST_FROZEN_AT, runtimeInventory: await inventory() }),
    /regeneration is forbidden after characterization begins/u,
  );
  assert.equal(await readFile(resultSentinel, "utf8"), "{\"mustRemain\":true}\n");
  assert.equal(DEFAULT_SLICE06_ROOT, path.resolve(PROJECT_ROOT, "research/slice-06"));
});
