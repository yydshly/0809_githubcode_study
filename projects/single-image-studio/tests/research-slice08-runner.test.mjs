import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Slice08CaseContextError } from "../scripts/research-gateb-case-context-slice08.mjs";
import { runSlice08GateBOperation, validateSlice08OperationTree } from "../scripts/research-gateb-runner-slice08.mjs";

const H = (character) => character.repeat(64);
const ref = (id, suffix = id) => ({ path: `records/${suffix}.json`, id, contentHash: H("a"), byteLength: 100, fileSha256: H("b") });
const refs = (operation = "normalize") => ({
  manifestRef: ref(`MANIFEST-S08-${operation}`), candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.8.0"),
  contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.8.0" : "CC-CAP02-EXPORT-PNG@0.8.0"),
  runtimeRef: ref("RUNTIME-S08"), workerRef: { id: "WORKER-SHARP-RAW@0.8.0", implementationSha256: H("c") },
});

function cases(operation = "normalize") {
  const applicable = ["opaque", "partial", "holes"].map((kind, index) => ({
    sourceId: `s08.${operation}.applicable.${kind}`, sourceRef: ref(`s08.${operation}.applicable.${kind}`, `source-a-${index}`),
    disposition: "applicable", expectedStableErrorCode: null,
    expectedFactsRef: ref(`facts.${operation}.${kind}`, `facts-${index}`), goldRef: ref(`gold.${operation}.${kind}`, `gold-${index}`),
    workerRequestRef: ref(`worker-request.${operation}.${kind}`, `worker-a-${index}`),
  }));
  const codes = operation === "normalize"
    ? ["S08_INPUT_CRC_MISMATCH", "S08_INPUT_SRGB_REQUIRED", "S08_NORMALIZE_SOURCE_DECLARATION_INVALID"]
    : Array(3).fill("S08_EXPORT_NORMALIZED_ARTIFACT_INVALID");
  const rejection = codes.map((code, index) => ({
    sourceId: `s08.${operation}.rejection.${index + 1}`, sourceRef: ref(`s08.${operation}.rejection.${index + 1}`, `source-r-${index}`),
    disposition: "rejection", expectedStableErrorCode: code, expectedFactsRef: null, goldRef: null,
    workerRequestRef: ref(`worker-request.${operation}.rejection.${index + 1}`, `worker-r-${index}`),
  }));
  return [...applicable, ...rejection];
}

function clock() {
  let value = Date.parse("2026-08-15T13:00:00.000Z");
  return () => { const result = new Date(value).toISOString(); value += 1; return result; };
}

function allPassExecutor() {
  let workerCalls = 0;
  const execute = async ({ caseContext }) => {
    if (caseContext.disposition === "rejection") throw new Slice08CaseContextError(caseContext.expectedStableErrorCode, "expected preflight");
    workerCalls += 1;
    const outputBytes = Buffer.from(`fake-png-${caseContext.sourceId}`);
    return {
      outputBytes,
      oracleFacts: { decodedPixelSha256: H("d"), fileSha256: H("e"), width: 1, height: 1 },
      workerMessageSha256: H("f"), workerRuntimeSha256: H("0"), workerObservation: { exitConfirmed: true },
    };
  };
  return { execute, workerCalls: () => workerCalls };
}

test("all-pass typed operation writes 18 terminals, 9 closures and a pass decision", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s08-runner-pass-"));
  const resultsRoot = path.join(parent, "normalize");
  const executor = allPassExecutor();
  const report = await runSlice08GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: executor.execute, now: clock(),
  });
  assert.equal(report.results.length, 18);
  assert.equal(report.summary.passAttempts, 18);
  assert.equal(report.decision.state, "pass");
  assert.equal(report.decision.calibrationAuthorized, false);
  assert.equal(executor.workerCalls(), 9);
  const validated = await validateSlice08OperationTree(resultsRoot);
  assert.equal(validated.valid, true);
  assert.equal(validated.closureCount, 9);
});

test("generic rejection errors close non-pass without worker or false authorization", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s08-runner-reject-"));
  let workers = 0;
  const executeCase = async ({ caseContext }) => {
    if (caseContext.disposition === "rejection") throw new TypeError("legacy null gold");
    workers += 1;
    return allPassExecutor().execute({ caseContext });
  };
  const report = await runSlice08GateBOperation({
    resultsRoot: path.join(parent, "normalize"), operation: "normalize", cases: cases(), refs: refs(), executeCase, now: clock(),
  });
  assert.equal(report.summary.rejectionExactPasses, 0);
  assert.equal(report.summary.nonPassAttempts, 9);
  assert.equal(report.decision.state, "denied-closed-non-pass");
  assert.equal(workers, 9);
});

test("partial protocol failure is not reusable and cannot produce a decision", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s08-runner-partial-"));
  const resultsRoot = path.join(parent, "normalize");
  await assert.rejects(runSlice08GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(),
    executeCase: async ({ caseContext }) => {
      if (caseContext.disposition === "rejection") throw new Slice08CaseContextError(caseContext.expectedStableErrorCode, "expected");
      throw new Slice08CaseContextError("S08_WORKER_PROTOCOL_INVALID", "injected failure");
    }, now: clock(),
  }), (error) => error.code === "S08_WORKER_PROTOCOL_INVALID");
  await assert.rejects(runSlice08GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: allPassExecutor().execute, now: clock(),
  }), (error) => error.code === "S08_RESULT_ROOT_EXISTS");
});

test("request/context tampering is independently rejected", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s08-runner-tamper-"));
  const resultsRoot = path.join(parent, "normalize");
  await runSlice08GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: allPassExecutor().execute, now: clock(),
  });
  const requestPath = path.join(resultsRoot, "requests", "s08.normalize.s08.normalize.applicable.opaque.r1.json");
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  request.caseContext.disposition = "rejection";
  await writeFile(requestPath, `${JSON.stringify(request)}\n`);
  await assert.rejects(validateSlice08OperationTree(resultsRoot), (error) => ["S08_CASE_CONTEXT_INVALID", "S08_CASE_CONTEXT_HASH_MISMATCH"].includes(error.code));
});
