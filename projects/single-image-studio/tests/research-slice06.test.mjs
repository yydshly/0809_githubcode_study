import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SLICE06_RUNNER_SCHEMA_DOCUMENTS } from "../scripts/research-run-slice06.mjs";
import {
  SLICE06_DEFINITION_PATHS,
  SLICE06_EXPECTED_SCHEMA_PATHS,
  SLICE06_FROZEN_AT,
  SLICE06_GENERATED_SCHEMA_DOCUMENTS,
  SLICE06_SOURCE_SPECS,
  generateSlice06,
} from "../scripts/research-generate-slice06.mjs";
import {
  compareSlice06TreesByteForByte,
  collectSlice06References,
  contentHashSlice06Validation,
  deriveSlice06ProtocolSchemaVersion,
  digestSlice06FileRecords,
  digestSlice06Tree,
  inspectSlice06Schema,
  listSlice06Tree,
  sha256Slice06Validation,
  stableStringifySlice06Validation,
  validateSlice06ClosedDiagnosticResults,
  validateSlice06Definition,
  validateSlice06DefinitionBoundary,
  validateSlice06ExecutionAdmission,
  validateSlice06SchemaInstance,
} from "../scripts/research-validate-slice06.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const CANONICAL_SLICE_ROOT = process.env.SLICE06_TEST_DEFINITION_ROOT
  ? path.resolve(process.env.SLICE06_TEST_DEFINITION_ROOT)
  : path.join(PROJECT_ROOT, "research", "slice-06");
const HAS_FROZEN_DEFINITION = existsSync(path.join(CANONICAL_SLICE_ROOT, "definition-index.v0.6.0.json"));
const TEST_FREEZE = SLICE06_FROZEN_AT;
let GENERATED_PARENT;
let GENERATED_BASE_ROOT;

test.before(async () => {
  GENERATED_PARENT = await mkdtemp(path.join(tmpdir(), "single-image-studio-s06-test-base-"));
  GENERATED_BASE_ROOT = path.join(GENERATED_PARENT, "slice-06");
  await mkdir(GENERATED_BASE_ROOT, { recursive: true });
  await cp(path.join(CANONICAL_SLICE_ROOT, "README.md"), path.join(GENERATED_BASE_ROOT, "README.md"));
  await generateSlice06({ sliceRoot: GENERATED_BASE_ROOT, projectRoot: PROJECT_ROOT, frozenAt: TEST_FREEZE });
});

test.after(async () => {
  if (GENERATED_PARENT) await rm(GENERATED_PARENT, { recursive: true, force: true });
});

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function mutationRoot(t) {
  const parent = await temporaryDirectory(t, "single-image-studio-s06-mutation-");
  const root = path.join(parent, "slice-06");
  await cp(GENERATED_BASE_ROOT, root, { recursive: true });
  return root;
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, ...relativePath.split("/")), "utf8"));
}

async function writeCanonical(root, relativePath, value) {
  const bytes = Buffer.from(stableStringifySlice06Validation(value), "utf8");
  await writeFile(path.join(root, ...relativePath.split("/")), bytes);
  return bytes;
}

async function rewriteDefinitionRecord(root, relativePath, mutate, { updateSelfHash = true, updateIndex = true } = {}) {
  const record = await readJson(root, relativePath);
  mutate(record);
  if (updateSelfHash && Object.hasOwn(record, "contentHash")) record.contentHash = contentHashSlice06Validation(record);
  const bytes = await writeCanonical(root, relativePath, record);
  if (!updateIndex || relativePath === "definition-index.v0.6.0.json") return;
  const index = await readJson(root, "definition-index.v0.6.0.json");
  const descriptor = index.machineTree.files.find(({ path: candidate }) => candidate === relativePath);
  assert.ok(descriptor, `missing index descriptor for ${relativePath}`);
  descriptor.byteLength = bytes.byteLength;
  descriptor.fileSha256 = sha256Slice06Validation(bytes);
  index.machineTree.sha256 = digestSlice06FileRecords(index.machineTree.files.map((entry) => ({
    path: entry.path, byteLength: entry.byteLength, sha256: entry.fileSha256,
  })));
  index.contentHash = contentHashSlice06Validation(index);
  await writeCanonical(root, "definition-index.v0.6.0.json", index);
}

async function validateMutation(root, options = {}) {
  return validateSlice06Definition({
    sliceRoot: root, projectRoot: PROJECT_ROOT, requirePins: false,
    recheckRuntime: false, regenerate: false, ...options,
  });
}

function assertIssue(report, code) {
  assert.equal(report.valid, false, `expected invalid report containing ${code}`);
  assert.ok(report.issues.some((entry) => entry.code === code), `${code} absent: ${JSON.stringify(report.issues)}`);
}

test("Slice 06 strict schema inspector accepts all Phase B protocol schema sources", async () => {
  const documents = new Map(Object.entries(SLICE06_RUNNER_SCHEMA_DOCUMENTS));
  for (const name of [
    "candidate-output-observation.slice06.v0.schema.json",
    "diagnostic-envelope.slice06.v0.schema.json",
    "oracle-diagnostic.slice06.v0.schema.json",
  ]) {
    const relativePath = `schemas/${name}`;
    documents.set(relativePath, JSON.parse(await readFile(path.join(CANONICAL_SLICE_ROOT, relativePath), "utf8")));
  }
  assert.equal(documents.size, 13);
  for (const [relativePath, schema] of documents) {
    assert.deepEqual(inspectSlice06Schema(schema, relativePath), []);
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relativePath)}`);
  }
});

test("final definition materializes exactly 26 recursively closed schemas", async () => {
  assert.equal(SLICE06_EXPECTED_SCHEMA_PATHS.length, 26);
  assert.equal(Object.keys(SLICE06_GENERATED_SCHEMA_DOCUMENTS).length, 23);
  for (const relativePath of SLICE06_EXPECTED_SCHEMA_PATHS) {
    const schema = JSON.parse(await readFile(path.join(GENERATED_BASE_ROOT, ...relativePath.split("/")), "utf8"));
    assert.deepEqual(inspectSlice06Schema(schema, relativePath), []);
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relativePath)}`);
  }
});

test("schema vocabulary and recursive closure reject unknown, open and partially required objects", () => {
  const base = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-06/schemas/probe.schema.json",
    type: "object",
    additionalProperties: false,
    required: ["value"],
    properties: { value: { type: "string" } },
  };
  assert.deepEqual(inspectSlice06Schema(base), []);
  const unknown = structuredClone(base);
  unknown.properties.value.default = "silently accepted";
  assert.ok(inspectSlice06Schema(unknown).some(({ code }) => code === "SCHEMA_KEYWORD_UNSUPPORTED"));
  const open = structuredClone(base);
  open.additionalProperties = true;
  assert.ok(inspectSlice06Schema(open).some(({ code }) => code === "SCHEMA_OBJECT_OPEN"));
  const optional = structuredClone(base);
  optional.required = [];
  assert.ok(inspectSlice06Schema(optional).some(({ code }) => code === "SCHEMA_REQUIRED_INCOMPLETE"));
  const nested = structuredClone(base);
  nested.properties.value = { type: "object", additionalProperties: false, required: [], properties: { hidden: { type: "string" } } };
  assert.ok(inspectSlice06Schema(nested).some(({ code }) => code === "SCHEMA_REQUIRED_INCOMPLETE"));
  const malformedDefs = structuredClone(base);
  malformedDefs.$defs = [];
  assert.ok(inspectSlice06Schema(malformedDefs).some(({ code }) => code === "SCHEMA_DEFS_INVALID"));
  const oneOfSibling = structuredClone(base);
  oneOfSibling.properties.value = { type: "string", oneOf: [{ const: "x" }] };
  assert.ok(inspectSlice06Schema(oneOfSibling).some(({ code }) => code === "SCHEMA_ONE_OF_SIBLING_FORBIDDEN"));
});

test("schema instance validation fails closed on exact UTC, local refs, oneOf and extras", () => {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-06/schemas/instance-probe.schema.json",
    type: "object",
    additionalProperties: false,
    required: ["at", "value"],
    properties: {
      at: { $ref: "#/$defs/utc" },
      value: { oneOf: [{ type: "string", const: "yes" }, { type: "integer", const: 1 }] },
    },
    $defs: { utc: { type: "string", format: "date-time", pattern: "Z$" } },
  };
  assert.deepEqual(validateSlice06SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "yes" }, schema), []);
  assert.ok(validateSlice06SchemaInstance({ at: "2026-02-31T01:02:03.004Z", value: "yes" }, schema).length > 0);
  assert.ok(validateSlice06SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "no" }, schema).length > 0);
  assert.ok(validateSlice06SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "yes", extra: true }, schema).length > 0);
});

test("schemaVersion basename fallback is restricted to the two exact unversioned runner schemas", () => {
  assert.equal(deriveSlice06ProtocolSchemaVersion(
    "workerObservation", "schemas/worker-observation.slice06.v0.schema.json", { properties: {} },
  ), "worker-observation.slice06.v0");
  assert.equal(deriveSlice06ProtocolSchemaVersion(
    "closurePublication", "schemas/five-role-publication.slice06.v0.schema.json", { properties: {} },
  ), "five-role-publication.slice06.v0");
  assert.throws(() => deriveSlice06ProtocolSchemaVersion(
    "runResult", "schemas/run-result.slice06.v0.schema.json", { properties: {} },
  ), /allowed only for the two exact/u);
  assert.throws(() => deriveSlice06ProtocolSchemaVersion(
    "workerObservation", "schemas/lookalike.slice06.v0.schema.json", { properties: {} },
  ), /allowed only for the two exact/u);
  assert.throws(() => deriveSlice06ProtocolSchemaVersion(
    "workerObservation", "schemas/worker-observation.slice06.v0.schema.json",
    { properties: { schemaVersion: { const: "forged.slice06.v0" } } },
  ), /must remain the exact unversioned fallback/u);
});

test("canonical hashing, reference discovery and zero-evidence boundary are fail-closed", () => {
  const record = {
    recordRef: { path: "records/parent.json", id: "PARENT@0.6.0", contentHash: "a".repeat(64), byteLength: 10, fileSha256: "b".repeat(64) },
    fileRef: { path: "assets/input.bin", byteLength: 4, fileSha256: "c".repeat(64) },
    shortRef: { id: "SHORT@0.6.0", contentHash: "d".repeat(64) },
    implementationRef: { id: "IMPL@0.6.0", version: "0.6.0", path: "scripts/impl.mjs", implementationSha256: "e".repeat(64) },
    evidenceBoundary: { c1: 0, productSupport: false, gateBDecisionAuthority: false, calibrationAuthorized: false, releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0 },
    gateBState: "not-entered-diagnostic-only",
    contentHash: "",
  };
  record.contentHash = contentHashSlice06Validation(record);
  assert.match(record.contentHash, /^[0-9a-f]{64}$/u);
  const refs = collectSlice06References(record);
  assert.equal(refs.recordRefs.length, 1);
  assert.equal(refs.fileRefs.length, 1);
  assert.equal(refs.shortRefs.length, 1);
  assert.equal(refs.implementationRefs.length, 1);
  assert.deepEqual(validateSlice06DefinitionBoundary(record), []);
  const promoted = structuredClone(record);
  promoted.evidenceBoundary.c1 = 1;
  promoted.evidenceBoundary.productSupport = true;
  promoted.gateBState = "passed";
  const codes = new Set(validateSlice06DefinitionBoundary(promoted).map(({ code }) => code));
  assert.ok(codes.has("EVIDENCE_AXIS_UPGRADED"));
  assert.ok(codes.has("DEFINITION_BOUNDARY_UPGRADED"));
  assert.ok(codes.has("GATE_B_AUTHORITY_UPGRADED"));
});

test("tree enumeration and binary digest cover path, decimal length and file SHA", async (t) => {
  const root = await temporaryDirectory(t, "single-image-studio-s06-tree-");
  await mkdir(path.join(root, "nested"));
  await writeFile(path.join(root, "a.json"), "{}\n", "utf8");
  await writeFile(path.join(root, "nested", "fixture.bin"), Buffer.from([0, 1, 2, 3]));
  const tree = await listSlice06Tree(root);
  assert.deepEqual(tree.issues, []);
  assert.deepEqual(tree.files, ["a.json", "nested/fixture.bin"]);
  assert.deepEqual(tree.directories, ["nested"]);
  const digest = await digestSlice06Tree(root, tree.files);
  assert.equal(digest.sha256, digestSlice06FileRecords(digest.records));
  assert.equal(digest.records[0].sha256, sha256Slice06Validation(Buffer.from("{}\n")));
});

test("two-tree comparison detects both file-set and byte drift", async (t) => {
  const left = await temporaryDirectory(t, "single-image-studio-s06-left-");
  const right = await temporaryDirectory(t, "single-image-studio-s06-right-");
  await writeFile(path.join(left, "definition.json"), "{\"value\":1}\n", "utf8");
  await writeFile(path.join(right, "definition.json"), "{\"value\":1}\n", "utf8");
  assert.deepEqual(await compareSlice06TreesByteForByte(left, right), []);
  await writeFile(path.join(right, "definition.json"), "{\"value\":2}\n", "utf8");
  assert.ok((await compareSlice06TreesByteForByte(left, right)).some(({ code }) => code === "REGEN_BYTES_MISMATCH"));
  await writeFile(path.join(right, "extra.txt"), "not allowed\n", "utf8");
  assert.ok((await compareSlice06TreesByteForByte(left, right)).some(({ code }) => code === "REGEN_FILE_SET_MISMATCH"));
});

test("execution admission requires a valid results-zero report at the pushed clean definition commit", () => {
  const commit = "a".repeat(40);
  const definitionReport = {
    valid: true,
    index: {
      definitionIndexId: "DEFINITION-INDEX-SLICE06@0.6.0",
      contentHash: "c".repeat(64),
      definitionState: "frozen-definition-results-zero-diagnostic-only",
      initialResultStateAtDefinitionFreeze: {
        resultsDirectoryPresent: false, resultFilesPresent: 0, ledgersPresent: 0, summariesPresent: 0,
        closeRecordsPresent: 0, specimensPresent: 0, quarantinePresent: 0,
      },
    },
    definitionRef: {
      path: "definition-index.v0.6.0.json", id: "DEFINITION-INDEX-SLICE06@0.6.0",
      contentHash: "c".repeat(64), byteLength: 1234, fileSha256: "d".repeat(64),
    },
    counts: { generatedResults: 0 },
    pinsVerified: true,
    runtimeRechecked: true,
    regenerationVerified: true,
  };
  const gitState = {
    headCommit: commit,
    originMainCommit: commit,
    worktreeClean: true,
    definitionIndexTracked: true,
    definitionIndexCommit: commit,
    definitionIndexReachableFromHead: true,
  };
  assert.deepEqual(validateSlice06ExecutionAdmission({ definitionReport, gitState }), { valid: true, issues: [] });
  const notPushed = validateSlice06ExecutionAdmission({
    definitionReport,
    gitState: { ...gitState, originMainCommit: "b".repeat(40) },
  });
  assert.equal(notPushed.valid, false);
  assert.ok(notPushed.issues.some(({ code }) => code === "S06_EXECUTION_NOT_PUSHED"));
  const withResults = validateSlice06ExecutionAdmission({
    definitionReport: { ...definitionReport, counts: { generatedResults: 1 } },
    gitState,
  });
  assert.ok(withResults.issues.some(({ code }) => code === "S06_EXECUTION_RESULTS_ZERO_INVALID"));
  const missingDefinitionRef = validateSlice06ExecutionAdmission({
    definitionReport: { ...definitionReport, definitionRef: null }, gitState,
  });
  assert.ok(missingDefinitionRef.issues.some(({ code }) => code === "S06_EXECUTION_DEFINITION_REF_INVALID"));
});

test("generated Phase C definition passes full fresh-runtime and twin-regeneration validation with an exact index ref", async () => {
  const report = await validateSlice06Definition({
    sliceRoot: GENERATED_BASE_ROOT, projectRoot: PROJECT_ROOT, requirePins: false,
    recheckRuntime: true, regenerate: true,
  });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  const indexBytes = await readFile(path.join(GENERATED_BASE_ROOT, "definition-index.v0.6.0.json"));
  const index = JSON.parse(indexBytes);
  assert.deepEqual(report.definitionRef, {
    path: "definition-index.v0.6.0.json",
    id: index.definitionIndexId,
    contentHash: index.contentHash,
    byteLength: indexBytes.byteLength,
    fileSha256: sha256Slice06Validation(indexBytes),
  });
  assert.equal(report.counts.generatedResults, 0);
});

test("exact tree allowlist rejects extra files, forbidden result partitions and junctions", async (t) => {
  const extraRoot = await mutationRoot(t);
  await writeFile(path.join(extraRoot, "unregistered.txt"), "not registered\n");
  assertIssue(await validateMutation(extraRoot), "DEFINITION_FILE_ALLOWLIST_MISMATCH");

  const resultRoot = await mutationRoot(t);
  await mkdir(path.join(resultRoot, "results", "open-diagnostic"), { recursive: true });
  await writeFile(path.join(resultRoot, "results", "open-diagnostic", "leak.json"), "{}\n");
  const resultReport = await validateMutation(resultRoot);
  assertIssue(resultReport, "RESULT_FILE_ALLOWLIST_MISMATCH");

  const linkRoot = await mutationRoot(t);
  const outside = path.join(path.dirname(linkRoot), "junction-target");
  await mkdir(outside);
  await symlink(outside, path.join(linkRoot, "linked-secret"), process.platform === "win32" ? "junction" : "dir");
  assertIssue(await validateMutation(linkRoot), "SYMLINK_FORBIDDEN");
});

test("definition index cannot claim generated results or formal fixtures", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, "definition-index.v0.6.0.json", (index) => {
    index.counts.generatedResults = 1;
    index.counts.formalFixtures = 1;
  });
  const report = await validateMutation(root);
  assertIssue(report, "DEFINITION_INDEX_COUNTS_INVALID");
  assert.ok(report.issues.some(({ code }) => code === "EVIDENCE_AXIS_UPGRADED"));
});

test("schema vocabulary, recursive closure and materialized source reject schema drift", async (t) => {
  const root = await mutationRoot(t);
  const schemaPath = "schemas/diagnostic-manifest.slice06.v0.schema.json";
  await rewriteDefinitionRecord(root, schemaPath, (schema) => { schema.properties.mode.default = "open-diagnostic"; });
  const report = await validateMutation(root);
  assertIssue(report, "SCHEMA_KEYWORD_UNSUPPORTED");
  assert.ok(report.issues.some(({ code }) => code === "GENERATED_SCHEMA_SOURCE_DRIFT"));
});

test("content-addressed records reject changed semantics with a stale self-hash", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.reuseClass = "silently-rewritten";
  }, { updateSelfHash: false, updateIndex: false });
  assertIssue(await validateMutation(root), "CONTENT_HASH_MISMATCH");
});

test("allowed JSON paths still reject embedded credential-like material", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.reuseClass = `sk-${"x".repeat(32)}`;
  });
  assertIssue(await validateMutation(root), "MACHINE_EMBEDDED_MATERIAL_FORBIDDEN");
});

test("old Slice 05 source identity replay is not admitted as a new Slice 06 source", async (t) => {
  const root = await mutationRoot(t);
  const spec = SLICE06_SOURCE_SPECS[0];
  const sourcePath = `sources/${spec.operation}-diagnostic/${spec.sourceId}.json`;
  await rewriteDefinitionRecord(root, sourcePath, (source) => { source.sourceId = spec.lineageId; });
  assertIssue(await validateMutation(root), "SOURCE_IDENTITY_ISOLATION_INVALID");
});

test("closed Slice 05 result records cannot be replayed as current candidate state", async (t) => {
  const root = await mutationRoot(t);
  const summaryPath = path.join(PROJECT_ROOT, "research", "slice-05", "results", "open-smoke", "summaries", "normalize.smoke-summary.slice05.v0.json");
  const bytes = await readFile(summaryPath);
  const summary = JSON.parse(bytes);
  await rewriteDefinitionRecord(root, "definition-index.v0.6.0.json", (index) => {
    index.candidateRef = {
      path: "research/slice-05/results/open-smoke/summaries/normalize.smoke-summary.slice05.v0.json",
      id: summary.summaryId, contentHash: summary.contentHash, byteLength: bytes.byteLength,
      fileSha256: sha256Slice06Validation(bytes),
    };
  });
  const report = await validateMutation(root);
  assertIssue(report, "S05_RESULT_REPLAY_OUTSIDE_CLOSURE");
  assert.ok(report.issues.some(({ code }) => code === "INDEX_CORE_REF_INVALID"));
});

test("previous Phase B baseline commit cannot masquerade as the current pushed protocol commit", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.closureLineage, (closure) => {
    closure.commitPins.slice06ProtocolCommit = closure.commitPins.slice06PreviousProtocolBaselineCommit;
  });
  assertIssue(await validateMutation(root), "S05_COMMIT_LINEAGE_INVALID");
});

test("support, C1, Gate B and calibration promotion fails closed", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.evidenceBoundary.c1 = 1;
    rights.evidenceBoundary.productSupport = true;
    rights.evidenceBoundary.gateBDecisionAuthority = true;
  });
  const report = await validateMutation(root);
  assertIssue(report, "EVIDENCE_AXIS_UPGRADED");
  assert.ok(report.issues.some(({ code }) => code === "DEFINITION_BOUNDARY_UPGRADED"));
});

test("all definition records share one exact freeze chronology", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.frozenAt = "2026-08-15T12:34:56.788Z";
  });
  assertIssue(await validateMutation(root), "DEFINITION_CHRONOLOGY_INVALID");
});

test("denominator and repetition shrink cannot silently reduce the 4-by-3 operation plan", async (t) => {
  const root = await mutationRoot(t);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.normalizePlan, (plan) => {
    plan.denominator.repetitionsPerSource = 2;
    plan.denominator.attempts = 8;
    plan.cases[0].repetitions = 2;
  });
  const report = await validateMutation(root);
  assertIssue(report, "DIAGNOSTIC_PLAN_DENOMINATOR_INVALID");
  assert.ok(report.issues.some(({ code }) => code === "DIAGNOSTIC_PLAN_CASES_INVALID"));
});

test("unknown worker and publication reconciliation remain inconclusive in plans and registry", async (t) => {
  const planRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(planRoot, SLICE06_DEFINITION_PATHS.normalizePlan, (plan) => {
    plan.stopRules.find(({ code }) => code === "S06_WORKER_RECONCILIATION_UNKNOWN").disposition = "protocol-failed";
  });
  assertIssue(await validateMutation(planRoot), "DIAGNOSTIC_STOP_RULES_INVALID");

  const registryRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(registryRoot, SLICE06_DEFINITION_PATHS.errorRegistry, (registry) => {
    const entry = registry.registeredCodes.find(({ code }) => code === "S06_PUBLICATION_RECONCILIATION_UNKNOWN");
    entry.class = "protocol";
    entry.terminalRole = "protocol-failure";
  });
  assertIssue(await validateMutation(registryRoot), "RECONCILIATION_UNKNOWN_CLASS_INVALID");
});

test("definition protocol separates planned counts from actuals and freezes cross-operation global stop", async (t) => {
  const legacyRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(legacyRoot, "definition-index.v0.6.0.json", (index) => {
    index.resultProtocol.totalAttempts = index.resultProtocol.plannedAttempts;
  });
  assertIssue(await validateMutation(legacyRoot), "DEFINITION_RESULT_PROTOCOL_LEGACY_FIELD");

  const stopRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(stopRoot, "definition-index.v0.6.0.json", (index) => {
    index.resultProtocol.globalStop.firstOperationBlockingStatuses = ["protocol-failed"];
  });
  assertIssue(await validateMutation(stopRoot), "DEFINITION_RESULT_PROTOCOL_INVALID");
});

test("normalize and export run/session identities cannot leak across operations", async (t) => {
  const root = await mutationRoot(t);
  const exportManifest = await readJson(root, SLICE06_DEFINITION_PATHS.exportManifest);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.normalizeManifest, (manifest) => {
    manifest.runIdentity = structuredClone(exportManifest.runIdentity);
  });
  const report = await validateMutation(root);
  assertIssue(report, "MANIFEST_BOUNDARY_INVALID");
  assert.ok(report.issues.some(({ code }) => code === "CROSS_OPERATION_IDENTITY_LEAKAGE"));
});

test("rights and retention cannot drift toward product or artifact publication", async (t) => {
  const rightsRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(rightsRoot, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.permissions.productUseClaim = true;
    rights.permissions.artifactPublication = true;
  });
  assertIssue(await validateMutation(rightsRoot), "RIGHTS_BOUNDARY_INVALID");

  const retentionRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(retentionRoot, SLICE06_DEFINITION_PATHS.retention, (retention) => {
    retention.disposition.artifactsDirectoryAllowed = true;
    retention.disposition.productDownloadAllowed = true;
  });
  assertIssue(await validateMutation(retentionRoot), "RETENTION_DISPOSITION_INVALID");
});

test("implementation and runtime closure drift are detected against actual files and fresh inventory", async (t) => {
  const implementationRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(implementationRoot, "definition-index.v0.6.0.json", (index) => {
    index.implementationRefs[0].ref.implementationSha256 = "f".repeat(64);
  });
  assertIssue(await validateMutation(implementationRoot), "IMPLEMENTATION_REF_DRIFT");

  const runtimeRoot = await mutationRoot(t);
  await rewriteDefinitionRecord(runtimeRoot, SLICE06_DEFINITION_PATHS.runtime, (runtime) => {
    runtime.installedClosure.treeSha256 = "e".repeat(64);
  });
  assertIssue(await validateMutation(runtimeRoot, { recheckRuntime: true }), "RUNTIME_FRESH_INVENTORY_DRIFT");
});

test("README cannot smuggle secret-like or embedded image payloads", async (t) => {
  const root = await mutationRoot(t);
  await writeFile(path.join(root, "README.md"), `Slice 06\ndata:image/png;base64,${"A".repeat(512)}\n`, "utf8");
  assertIssue(await validateMutation(root), "README_EMBEDDED_MATERIAL_FORBIDDEN");
});

test("README cannot describe a frozen definition as unfrozen", async (t) => {
  const root = await mutationRoot(t);
  const readmePath = path.join(root, "README.md");
  const text = await readFile(readmePath, "utf8");
  assert.ok(text.includes("definition-frozen"));
  await writeFile(readmePath, text.replace("definition-frozen", "definition-not-frozen"), "utf8");
  assertIssue(await validateMutation(root), "README_DEFINITION_STATE_INVALID");
});

test("central validator implementation self-pin is forbidden", async (t) => {
  const root = await mutationRoot(t);
  const validatorBytes = await readFile(path.join(PROJECT_ROOT, "scripts", "research-validate-slice06.mjs"));
  await rewriteDefinitionRecord(root, "definition-index.v0.6.0.json", (index) => {
    index.implementationRefs[0] = {
      role: "central-validator",
      ref: {
        id: "VALIDATOR-CENTRAL-SLICE06@0.6.0", version: "0.6.0",
        path: "scripts/research-validate-slice06.mjs", implementationSha256: sha256Slice06Validation(validatorBytes),
      },
    };
  });
  assertIssue(await validateMutation(root), "CENTRAL_VALIDATOR_SELF_PIN_FORBIDDEN");
});

test("record reference DAG rejects an internal rights-retention cycle", async (t) => {
  const root = await mutationRoot(t);
  const retention = await readJson(root, SLICE06_DEFINITION_PATHS.retention);
  const index = await readJson(root, "definition-index.v0.6.0.json");
  const descriptor = index.machineTree.files.find(({ path: candidate }) => candidate === SLICE06_DEFINITION_PATHS.retention);
  await rewriteDefinitionRecord(root, SLICE06_DEFINITION_PATHS.rights, (rights) => {
    rights.sourceSlice05RightsRef = {
      path: SLICE06_DEFINITION_PATHS.retention, id: retention.retentionPolicyId, contentHash: retention.contentHash,
      byteLength: descriptor.byteLength, fileSha256: descriptor.fileSha256,
    };
  });
  assertIssue(await validateMutation(root), "RECORD_REFERENCE_CYCLE");
});

test("frozen Slice 06 definition passes central validation", { skip: !HAS_FROZEN_DEFINITION }, async () => {
  const report = await validateSlice06Definition({ sliceRoot: CANONICAL_SLICE_ROOT });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.equal(report.counts.generatedResults, 0);
  assert.equal(report.diagnosticResults.present, true);
  assert.equal(report.diagnosticResults.fileCount, 152);
  assert.equal(report.diagnosticResults.directoryCount, 34);
  assert.equal(report.diagnosticResults.treeSha256, "4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146");
});

test("registered diagnostic result closure reopens all bytes and recomputes summaries", { skip: !HAS_FROZEN_DEFINITION }, async () => {
  const report = await validateSlice06ClosedDiagnosticResults({
    sliceRoot: CANONICAL_SLICE_ROOT,
    definitionRef: {
      path: "definition-index.v0.6.0.json", id: "DEFINITION-INDEX-SLICE06@0.6.0",
      contentHash: "d537199c8bc6147761da297daeddb03e1ff837a83c8d2c57af29c9e5b9b67e08",
      byteLength: 31107, fileSha256: "1cb934a1d870a62e9ccb706e3c21dcdbb54de55f027a325e31230ac4bf3cb20c",
    },
  });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.deepEqual(report.counts, { requests: 24, claims: 24, results: 24, ledgers: 2, summaries: 2, closes: 2, retainedOutputs: 18 });
  for (const operation of ["normalize", "export"]) {
    assert.equal(report.operations[operation].summary.statusCounts["characterized-oracle-non-pass"], 9);
    assert.equal(report.operations[operation].summary.statusCounts["characterized-preflight-rejection"], 3);
    assert.equal(report.operations[operation].summary.allOutputBytesDeterministic, true);
    assert.equal(report.operations[operation].summary.allPixelsDeterministic, true);
    assert.equal(report.operations[operation].summary.gateBDecisionAuthority, false);
    assert.equal(report.operations[operation].summary.calibrationAuthorized, false);
  }
});

test("post-run validator rejects retained-byte, ledger, summary and extra-file tampering", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  async function resultCopy(label) {
    const parent = await temporaryDirectory(t, `single-image-studio-s06-postrun-${label}-`);
    const root = path.join(parent, "slice-06");
    await cp(CANONICAL_SLICE_ROOT, root, { recursive: true });
    return root;
  }

  const bytesRoot = await resultCopy("bytes");
  const outputPath = path.join(bytesRoot, "results", "open-diagnostic", "quarantine", "normalize", "source.s06.normalize.diagnostic.001", "r1", "candidate-output.bin");
  const output = await readFile(outputPath); output[output.length - 1] ^= 1; await writeFile(outputPath, output);
  assertIssue(await validateMutation(bytesRoot), "CANDIDATE_OUTPUT_BYTES_MISMATCH");

  const ledgerRoot = await resultCopy("ledger");
  const ledgerPath = path.join(ledgerRoot, "results", "open-diagnostic", "ledger", "normalize.ndjson");
  const ledger = await readFile(ledgerPath, "utf8");
  await writeFile(ledgerPath, ledger.replace('"sequence":1', '"sequence":2'), "utf8");
  assertIssue(await validateMutation(ledgerRoot), "LEDGER_CHAIN_INVALID");

  const summaryRoot = await resultCopy("summary");
  const summaryPath = "results/open-diagnostic/summaries/normalize.diagnostic-summary.slice06.v0.json";
  const summary = await readJson(summaryRoot, summaryPath);
  summary.retainedOutputBytes += 1; summary.contentHash = contentHashSlice06Validation(summary);
  await writeCanonical(summaryRoot, summaryPath, summary);
  assertIssue(await validateMutation(summaryRoot), "DIAGNOSTIC_SUMMARY_INVALID");

  const extraRoot = await resultCopy("extra");
  await writeFile(path.join(extraRoot, "results", "open-diagnostic", "unregistered.json"), "{}\n", "utf8");
  assertIssue(await validateMutation(extraRoot), "RESULT_FILE_ALLOWLIST_MISMATCH");
});
