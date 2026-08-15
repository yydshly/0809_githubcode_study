import assert from "node:assert/strict";
import test from "node:test";

import {
  createSlice09CaseContext,
  createSlice09TypedDriver,
  runSlice09TypedOperation,
  SLICE09_CASE_CONTEXT_SCHEMA,
  Slice09CaseContextError,
  validateSlice09CaseContext,
} from "../scripts/research-gateb-case-context-slice09.mjs";
import { inspectSlice05Schema } from "../scripts/research-validate-slice05.mjs";

const H = (character) => character.repeat(64);
const ref = (id, contentHash = H("a"), path = `records/${id}.json`) => ({
  path, id, contentHash, byteLength: 100, fileSha256: H("b"),
});
const shared = (operation) => ({
  manifestRef: ref(`FM-GATEB-${operation.toUpperCase()}-PNG@0.9.0`),
  candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.9.0"),
  contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.9.0" : "CC-CAP02-EXPORT-PNG@0.9.0"),
  runtimeRef: ref("RUNTIME-SHARP-CANONICAL-PNG@0.9.0"),
  workerRef: { id: "WORKER-SHARP-RAW@0.9.0", implementationSha256: H("c") },
});

function applicableCase(operation, index) {
  const sourceId = `s09.${operation}.applicable.00${index}`;
  return {
    sourceId, sourceRef: ref(sourceId, H("d")), disposition: "applicable", expectedStableErrorCode: null,
    goldIdentityRef: ref(`gold-identity.${sourceId}`, H("e"), `gold-identities/${operation}/${sourceId}.json`),
    workerRequestRef: ref(`worker-request.${sourceId}`, H("f")),
  };
}

function rejectionCase(operation, index) {
  const sourceId = `s09.${operation}.rejection.00${index}`;
  const normalizeCodes = ["S09_INPUT_CRC_MISMATCH", "S09_INPUT_SRGB_REQUIRED", "S09_NORMALIZE_SOURCE_DECLARATION_INVALID"];
  return {
    sourceId, sourceRef: ref(sourceId, H("1")), disposition: "rejection",
    expectedStableErrorCode: operation === "normalize" ? normalizeCodes[index - 1] : "S09_EXPORT_NORMALIZED_ARTIFACT_INVALID",
    goldIdentityRef: null, workerRequestRef: ref(`worker-request.${sourceId}`, H("2")),
  };
}

test("Slice 09 context schema is closed and applicable context binds gold identity into idempotency", () => {
  assert.equal(SLICE09_CASE_CONTEXT_SCHEMA.additionalProperties, false);
  assert.deepEqual([...SLICE09_CASE_CONTEXT_SCHEMA.required].sort(), Object.keys(SLICE09_CASE_CONTEXT_SCHEMA.properties).sort());
  assert.equal(SLICE09_CASE_CONTEXT_SCHEMA.$id,
    "https://single-image-studio.invalid/research/slice-09/schemas/gateb-case-context.slice09.v0.schema.json");
  const vocabularyProbe = structuredClone(SLICE09_CASE_CONTEXT_SCHEMA);
  vocabularyProbe.$id = "https://single-image-studio.invalid/research/slice-05/schemas/slice09-context-vocabulary-probe.schema.json";
  assert.deepEqual(inspectSlice05Schema(vocabularyProbe, "slice09.caseContext"), []);
  const record = applicableCase("normalize", 1);
  const context = createSlice09CaseContext({ operation: "normalize", caseRecord: record, repetition: 1, ...shared("normalize") });
  assert.equal(validateSlice09CaseContext(context), true);
  const changedRecord = { ...record, goldIdentityRef: { ...record.goldIdentityRef, contentHash: H("9") } };
  const changed = createSlice09CaseContext({ operation: "normalize", caseRecord: changedRecord, repetition: 1, ...shared("normalize") });
  assert.notEqual(changed.attempt.idempotencyKey, context.attempt.idempotencyKey);
});

test("production-shaped typed callback accepts only one closed caseContext", async () => {
  const context = createSlice09CaseContext({ operation: "normalize", caseRecord: applicableCase("normalize", 1), repetition: 1, ...shared("normalize") });
  let calls = 0;
  const execute = createSlice09TypedDriver({
    executeApplicable: async (received) => { calls += 1; assert.equal(received.contentHash, context.contentHash); return "ok"; },
    executeRejection: async () => "rejected",
  });
  assert.equal(await execute({ caseContext: context }), "ok");
  assert.equal(calls, 1);
  await assert.rejects(execute({ caseContext: context, fallbackGoldId: "forbidden" }),
    (error) => error.code === "S09_CASE_CONTEXT_INVALID");
});

test("normalize and export each preserve the complete 3+3 by 3 denominator", async () => {
  for (const operation of ["normalize", "export"]) {
    const cases = [1, 2, 3].map((index) => applicableCase(operation, index))
      .concat([1, 2, 3].map((index) => rejectionCase(operation, index)));
    const report = await runSlice09TypedOperation({
      operation, cases, ...shared(operation),
      executeCase: async ({ caseContext }) => {
        if (caseContext.disposition === "rejection") {
          throw new Slice09CaseContextError(caseContext.expectedStableErrorCode, "expected worker-free rejection");
        }
        return { status: "pass", workerObservation: { exitConfirmed: true } };
      },
    });
    assert.equal(report.plannedSources, 6);
    assert.equal(report.plannedAttempts, 18);
    assert.equal(report.results.length, 18);
    assert.equal(report.results.filter((entry) => entry.status === "pass").length, 18);
    assert.equal(report.results.filter((entry) => entry.disposition === "applicable").length, 9);
    assert.equal(report.results.filter((entry) => entry.disposition === "rejection").length, 9);
  }
});

test("rejection cannot carry gold identity and old Slice 08 identities cannot replay", () => {
  const rejection = rejectionCase("normalize", 1);
  assert.throws(() => createSlice09CaseContext({
    operation: "normalize", caseRecord: { ...rejection, goldIdentityRef: ref("gold-identity.s09.normalize.rejection.001") },
    repetition: 1, ...shared("normalize"),
  }), (error) => error.code === "S09_CASE_CONTEXT_INVALID");
  const applicable = applicableCase("normalize", 1);
  assert.throws(() => createSlice09CaseContext({
    operation: "normalize", caseRecord: { ...applicable, sourceId: "s08.normalize.applicable.001", sourceRef: ref("s08.normalize.applicable.001") },
    repetition: 1, ...shared("normalize"),
  }), (error) => error.code === "S09_CASE_CONTEXT_INVALID");
});
