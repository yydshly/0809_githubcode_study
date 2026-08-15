import assert from "node:assert/strict";
import test from "node:test";

import {
  SLICE08_CASE_CONTEXT_SCHEMA,
  Slice08CaseContextError,
  createSlice08CaseContext,
  createSlice08TypedDriver,
  runSlice08TypedOperation,
  validateSlice08CaseContext,
} from "../scripts/research-gateb-case-context-slice08.mjs";

const H = (character) => character.repeat(64);
const ref = (id, suffix = id) => ({
  path: `records/${suffix}.json`, id, contentHash: H("a"), byteLength: 100, fileSha256: H("b"),
});
const implementationRef = { id: "WORKER-SHARP-RAW@0.8.0", implementationSha256: H("c") };
const shared = {
  manifestRef: ref("MANIFEST-S08", "manifest"),
  candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.8.0", "candidate"),
  contractRef: ref("CC-CAP02-NORMALIZE-PNG@0.8.0", "contract"),
  runtimeRef: ref("RUNTIME-S08", "runtime"),
  workerRef: implementationRef,
};

function cases(operation = "normalize") {
  const applicable = ["opaque", "partial", "holes"].map((kind, index) => ({
    sourceId: `s08.${operation}.applicable.${kind}`,
    sourceRef: ref(`s08.${operation}.applicable.${kind}`, `source-app-${index}`),
    disposition: "applicable",
    expectedStableErrorCode: null,
    expectedFactsRef: ref(`facts.${operation}.${kind}`, `facts-${index}`),
    goldRef: ref(`gold.${operation}.${kind}`, `gold-${index}`),
    workerRequestRef: ref(`worker-request.${operation}.${kind}`, `worker-request-app-${index}`),
  }));
  const codes = operation === "normalize"
    ? ["S08_INPUT_CRC_MISMATCH", "S08_INPUT_SRGB_REQUIRED", "S08_NORMALIZE_SOURCE_DECLARATION_INVALID"]
    : ["S08_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID"];
  const rejection = ["one", "two", "three"].map((kind, index) => ({
    sourceId: `s08.${operation}.rejection.${kind}`,
    sourceRef: ref(`s08.${operation}.rejection.${kind}`, `source-reject-${index}`),
    disposition: "rejection",
    expectedStableErrorCode: codes[index],
    expectedFactsRef: null,
    goldRef: null,
    workerRequestRef: ref(`worker-request.${operation}.rejection.${kind}`, `worker-request-reject-${index}`),
  }));
  return [...applicable, ...rejection];
}

function context(overrides = {}) {
  return createSlice08CaseContext({
    operation: "normalize", caseRecord: cases()[0], repetition: 1, ...shared, ...overrides,
  });
}

function rehash(record) {
  return createSlice08CaseContext({
    operation: record.operation,
    caseRecord: {
      sourceId: record.sourceId, sourceRef: record.sourceRef, disposition: record.disposition,
      expectedStableErrorCode: record.expectedStableErrorCode, expectedFactsRef: record.expectedFactsRef,
      goldRef: record.goldRef, workerRequestRef: record.workerRequestRef,
    },
    manifestRef: record.manifestRef,
    repetition: record.attempt.repetition,
    candidateRef: record.candidateRef,
    contractRef: record.contractRef,
    runtimeRef: record.runtimeRef,
    workerRef: record.workerRef,
  });
}

test("case context is closed, self-hashed, and binds attempt identity", () => {
  const value = context();
  assert.equal(validateSlice08CaseContext(value), true);
  assert.equal(value.attempt.attemptId, `s08.normalize.${value.sourceId}.r1`);
  assert.equal(value.disposition, "applicable");
});

test("exported case-context schema recursively closes every declared object", () => {
  const visit = (node, location = "$") => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${location} must be closed`);
      assert.deepEqual([...(node.required ?? [])].sort(), Object.keys(node.properties ?? {}).sort(), `${location} required/properties drift`);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "properties" || key === "$defs") {
        for (const [name, nested] of Object.entries(child)) visit(nested, `${location}/${key}/${name}`);
      } else if (key === "oneOf") {
        child.forEach((nested, index) => visit(nested, `${location}/oneOf/${index}`));
      }
    }
  };
  visit(SLICE08_CASE_CONTEXT_SCHEMA);
});

test("missing, additional, and mutated fields fail closed", () => {
  const value = structuredClone(context());
  delete value.disposition;
  assert.throws(() => validateSlice08CaseContext(value), /missing or additional fields/u);
  const extra = { ...context(), legacyDisposition: "rejection" };
  assert.throws(() => validateSlice08CaseContext(extra), /missing or additional fields/u);
  const mutated = structuredClone(context());
  mutated.operation = "export";
  assert.throws(() => validateSlice08CaseContext(mutated), (error) => error.code === "S08_CASE_CONTEXT_INVALID" || error.code === "S08_CASE_CONTEXT_HASH_MISMATCH");
});

test("rehashed source/code/operation laundering is rejected by typed semantics", () => {
  const rejection = createSlice08CaseContext({
    operation: "normalize", caseRecord: cases()[4], repetition: 2, ...shared,
  });
  const wrongCodeCase = { ...cases()[4], expectedStableErrorCode: "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID" };
  assert.throws(() => createSlice08CaseContext({ operation: "normalize", caseRecord: wrongCodeCase, repetition: 2, ...shared }), /exact operation code/u);
  const wrongSource = structuredClone(rejection);
  wrongSource.sourceRef.id = "different-source";
  assert.throws(() => rehash(wrongSource), /source ref does not bind/u);
  const wrongOperation = structuredClone(context());
  wrongOperation.operation = "export";
  wrongOperation.sourceId = wrongOperation.sourceId.replace("normalize", "export");
  wrongOperation.sourceRef.id = wrongOperation.sourceId;
  wrongOperation.contractRef = ref("CC-CAP02-NORMALIZE-PNG@0.8.0", "contract-wrong-operation");
  assert.throws(() => rehash(wrongOperation), /candidate, contract, source and operation bindings differ/u);
});

test("typed driver accepts only the exact {caseContext} production callback shape", async () => {
  const driver = createSlice08TypedDriver({
    executeApplicable: async () => ({ status: "pass", workerObservation: { exitConfirmed: true } }),
    executeRejection: async (value) => { throw new Slice08CaseContextError(value.expectedStableErrorCode, "expected preflight rejection"); },
  });
  await assert.rejects(driver({ attemptId: "legacy", caseContext: context() }), /missing or additional fields/u);
  await assert.rejects(driver({}), /missing or additional fields/u);
  const result = await driver({ caseContext: context() });
  assert.equal(result.status, "pass");
});

test("production boundary sends complete typed contexts and all rejection cases stay worker-free", async () => {
  let workerInvocations = 0;
  let rejectionInvocations = 0;
  const driver = createSlice08TypedDriver({
    executeApplicable: async (value) => {
      validateSlice08CaseContext(value);
      workerInvocations += 1;
      return { status: "pass", workerObservation: { exitConfirmed: true } };
    },
    executeRejection: async (value) => {
      validateSlice08CaseContext(value);
      rejectionInvocations += 1;
      throw new Slice08CaseContextError(value.expectedStableErrorCode, "exact preflight rejection");
    },
  });
  const report = await runSlice08TypedOperation({ operation: "normalize", cases: cases(), executeCase: driver, ...shared });
  assert.equal(report.results.length, 18);
  assert.equal(report.results.filter((item) => item.status === "pass").length, 18);
  assert.equal(report.results.filter((item) => item.disposition === "rejection" && item.workerInvoked).length, 0);
  assert.equal(workerInvocations, 9);
  assert.equal(rejectionInvocations, 9);
});

test("both operations close a full new 36-attempt denominator without reuse", async () => {
  const driver = createSlice08TypedDriver({
    executeApplicable: async () => ({ status: "pass", workerObservation: { exitConfirmed: true } }),
    executeRejection: async (value) => { throw new Slice08CaseContextError(value.expectedStableErrorCode, "expected"); },
  });
  const normalize = await runSlice08TypedOperation({ operation: "normalize", cases: cases("normalize"), executeCase: driver, ...shared });
  const exportReport = await runSlice08TypedOperation({
    operation: "export", cases: cases("export"), executeCase: driver,
    ...shared, contractRef: ref("CC-CAP02-EXPORT-PNG@0.8.0", "contract-export"),
  });
  assert.equal(normalize.results.length + exportReport.results.length, 36);
  assert.equal(new Set([...normalize.results, ...exportReport.results].map((item) => item.attemptId)).size, 36);
});

test("generic or worker-touched rejection cannot become an exact pass", async () => {
  const generic = createSlice08TypedDriver({
    executeApplicable: async () => ({ status: "pass", workerObservation: { exitConfirmed: true } }),
    executeRejection: async () => { throw new TypeError("legacy null gold failure"); },
  });
  const report = await runSlice08TypedOperation({ operation: "normalize", cases: cases(), executeCase: generic, ...shared });
  assert.equal(report.results.filter((item) => item.disposition === "rejection" && item.status === "non-pass").length, 9);

  const touched = createSlice08TypedDriver({
    executeApplicable: async () => ({ status: "pass", workerObservation: { exitConfirmed: true } }),
    executeRejection: async (value) => {
      const error = new Slice08CaseContextError(value.expectedStableErrorCode, "worker should not have run");
      error.workerObservation = { exitConfirmed: true };
      throw error;
    },
  });
  const touchedReport = await runSlice08TypedOperation({ operation: "normalize", cases: cases(), executeCase: touched, ...shared });
  assert.equal(touchedReport.results.filter((item) => item.disposition === "rejection" && item.status === "non-pass").length, 9);
});

test("legacy Slice 07 codes and incomplete denominator are rejected", async () => {
  const legacy = { ...cases()[3], expectedStableErrorCode: "S07_INPUT_CRC_MISMATCH" };
  assert.throws(() => createSlice08CaseContext({ operation: "normalize", caseRecord: legacy, repetition: 1, ...shared }), /exact operation code/u);
  await assert.rejects(runSlice08TypedOperation({
    operation: "normalize", cases: cases().slice(0, 5), executeCase: async () => null, ...shared,
  }), (error) => error.code === "S08_DENOMINATOR_INVALID");
});
