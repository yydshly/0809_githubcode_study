import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectSlice05Schema } from "../scripts/research-validate-slice05.mjs";
import { Slice09CaseContextError } from "../scripts/research-gateb-case-context-slice09.mjs";
import {
  SLICE09_RUNNER_SCHEMA_DOCUMENTS,
  runSlice09GateBOperation,
  validateSlice09OperationTree,
} from "../scripts/research-gateb-runner-slice09.mjs";

const H = (character) => character.repeat(64);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};
const canonicalBytes = (value) => Buffer.from(`${JSON.stringify(stable(value))}\n`);
const rehash = (record) => {
  const { contentHash: _old, ...payload } = record;
  return { ...payload, contentHash: sha256(canonicalBytes(payload)) };
};
const ref = (id, suffix = id) => ({
  path: `records/${suffix}.json`, id, contentHash: H("a"), byteLength: 100, fileSha256: H("b"),
});
const refs = (operation = "normalize") => ({
  manifestRef: ref(`FM-GATEB-${operation.toUpperCase()}-PNG@0.9.0`),
  candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.9.0"),
  contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.9.0" : "CC-CAP02-EXPORT-PNG@0.9.0"),
  runtimeRef: ref("RUNTIME-SHARP-CANONICAL-PNG@0.9.0"),
  workerRef: { id: "WORKER-SHARP-RAW@0.9.0", implementationSha256: H("c") },
});

function cases(operation = "normalize") {
  const applicable = ["opaque", "partial", "holes"].map((kind, index) => {
    const sourceId = `s09.${operation}.applicable.${kind}`;
    return {
      sourceId, sourceRef: ref(sourceId, `source-a-${index}`), disposition: "applicable",
      expectedStableErrorCode: null,
      goldIdentityRef: ref(`gold-identity.${sourceId}`, `gold-identity-${index}`),
      workerRequestRef: ref(`worker-request.${sourceId}`, `worker-a-${index}`),
    };
  });
  const codes = operation === "normalize"
    ? ["S09_INPUT_CRC_MISMATCH", "S09_INPUT_SRGB_REQUIRED", "S09_NORMALIZE_SOURCE_DECLARATION_INVALID"]
    : Array(3).fill("S09_EXPORT_NORMALIZED_ARTIFACT_INVALID");
  const rejection = codes.map((code, index) => {
    const sourceId = `s09.${operation}.rejection.${index + 1}`;
    return {
      sourceId, sourceRef: ref(sourceId, `source-r-${index}`), disposition: "rejection",
      expectedStableErrorCode: code, goldIdentityRef: null,
      workerRequestRef: ref(`worker-request.${sourceId}`, `worker-r-${index}`),
    };
  });
  return [...applicable, ...rejection];
}

function clock() {
  let value = Date.parse("2026-08-15T16:00:00.000Z");
  return () => { const result = new Date(value).toISOString(); value += 1; return result; };
}

function allPassExecutor() {
  let workerCalls = 0;
  const execute = async ({ caseContext }) => {
    if (caseContext.disposition === "rejection") {
      throw new Slice09CaseContextError(caseContext.expectedStableErrorCode, "expected worker-free preflight rejection");
    }
    workerCalls += 1;
    const outputBytes = Buffer.from(`fake-png-${caseContext.sourceId}`);
    return {
      status: "pass", outputBytes,
      oracleFacts: { decodedPixelSha256: H("d"), fileSha256: sha256(outputBytes), width: 1, height: 1 },
      workerMessageSha256: H("e"), workerRuntimeSha256: H("f"),
      workerObservation: { exitConfirmed: true },
    };
  };
  return { execute, workerCalls: () => workerCalls };
}

test("Slice 09 runner schemas use the exact namespace and supported closed vocabulary", () => {
  assert.equal(Object.keys(SLICE09_RUNNER_SCHEMA_DOCUMENTS).length, 8);
  for (const [relativePath, schema] of Object.entries(SLICE09_RUNNER_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-09/${relativePath}`);
    const probe = structuredClone(schema);
    probe.$id = `https://single-image-studio.invalid/research/slice-05/schemas/s09-runner-probe-${path.basename(relativePath)}`;
    const issues = inspectSlice05Schema(probe, relativePath);
    assert.deepEqual(issues.filter((issue) => issue.code !== "SCHEMA_REF_UNRESOLVED"), []);
    for (const issue of issues) {
      assert.equal(issue.message, "gateb-case-context.slice09.v0.schema.json");
    }
  }
});

test("all-pass operation durably closes 18 attempts, 9 identity-bound closures and a pass decision", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-runner-pass-"));
  const resultsRoot = path.join(parent, "normalize");
  const executor = allPassExecutor();
  const report = await runSlice09GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: executor.execute, now: clock(),
  });
  assert.equal(report.results.length, 18);
  assert.equal(report.summary.passAttempts, 18);
  assert.equal(report.decision.state, "pass");
  assert.equal(report.decision.calibrationAuthorized, false);
  assert.equal(executor.workerCalls(), 9);
  const validated = await validateSlice09OperationTree(resultsRoot);
  assert.equal(validated.valid, true);
  assert.equal(validated.requestCount, 18);
  assert.equal(validated.claimCount, 18);
  assert.equal(validated.closureCount, 9);
});

test("generic rejection errors close non-pass and never authorize calibration", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-runner-reject-"));
  let workers = 0;
  const executeCase = async ({ caseContext }) => {
    if (caseContext.disposition === "rejection") throw new TypeError("generic historical bug");
    workers += 1;
    return allPassExecutor().execute({ caseContext });
  };
  const report = await runSlice09GateBOperation({
    resultsRoot: path.join(parent, "normalize"), operation: "normalize", cases: cases(), refs: refs(), executeCase, now: clock(),
  });
  assert.equal(report.summary.rejectionExactPasses, 0);
  assert.equal(report.summary.nonPassAttempts, 9);
  assert.equal(report.decision.state, "denied-closed-non-pass");
  assert.equal(report.decision.calibrationAuthorized, false);
  assert.equal(workers, 9);
});

test("protocol failure leaves an immutable partial root that cannot be replayed", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-runner-partial-"));
  const resultsRoot = path.join(parent, "normalize");
  await assert.rejects(runSlice09GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), now: clock(),
    executeCase: async ({ caseContext }) => {
      if (caseContext.disposition === "rejection") {
        throw new Slice09CaseContextError(caseContext.expectedStableErrorCode, "expected");
      }
      throw new Slice09CaseContextError("S09_WORKER_PROTOCOL_INVALID", "injected protocol failure");
    },
  }), (error) => error.code === "S09_WORKER_PROTOCOL_INVALID");
  await assert.rejects(runSlice09GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: allPassExecutor().execute, now: clock(),
  }), (error) => error.code === "S09_RESULT_ROOT_EXISTS");
});

test("self-rehashed gold identity, summary and ledger laundering are independently rejected", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-runner-tamper-"));
  const resultsRoot = path.join(parent, "normalize");
  await runSlice09GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), refs: refs(), executeCase: allPassExecutor().execute, now: clock(),
  });
  const attemptId = "s09.normalize.s09.normalize.applicable.opaque.r1";
  const closurePath = path.join(resultsRoot, "closures", attemptId, "closure.json");
  const originalClosureBytes = await readFile(closurePath);
  const closure = JSON.parse(originalClosureBytes);
  closure.goldIdentityRef = { ...closure.goldIdentityRef, contentHash: H("9") };
  await writeFile(closurePath, canonicalBytes(rehash(closure)));
  await assert.rejects(validateSlice09OperationTree(resultsRoot),
    (error) => error.code === "S09_RESULT_BINDING_INVALID");
  await writeFile(closurePath, originalClosureBytes);

  const summaryPath = path.join(resultsRoot, "summary.json");
  const originalSummaryBytes = await readFile(summaryPath);
  const summary = JSON.parse(originalSummaryBytes);
  summary.sourceThreeOfThreePasses = 5;
  await writeFile(summaryPath, canonicalBytes(rehash(summary)));
  await assert.rejects(validateSlice09OperationTree(resultsRoot), (error) => error.code === "S09_SUMMARY_INVALID");
  await writeFile(summaryPath, originalSummaryBytes);

  const ledgerPath = path.join(resultsRoot, "ledger.ndjson");
  const events = (await readFile(ledgerPath, "utf8")).trimEnd().split("\n").map((line) => JSON.parse(line));
  events[0].payloadSha256 = H("8");
  let previousEventHash = null;
  const laundered = events.map((event) => {
    event.previousEventHash = previousEventHash;
    const next = rehash(event);
    previousEventHash = next.contentHash;
    return JSON.stringify(stable(next));
  }).join("\n");
  await writeFile(ledgerPath, `${laundered}\n`);
  await assert.rejects(validateSlice09OperationTree(resultsRoot), (error) => error.code === "S09_LEDGER_CHAIN_INVALID");
});
