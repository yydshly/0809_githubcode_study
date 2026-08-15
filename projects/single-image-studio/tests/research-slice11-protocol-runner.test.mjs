import assert from "node:assert/strict";
import test from "node:test";

import {
  contentHashLifecycleSlice11,
  createSlice11WorkerLifecycle,
} from "../scripts/research-calibration-lifecycle-slice11.mjs";
import {
  SLICE11_EXPECTED_PROJECTION_ID,
  projectGoldExpectedSlice11,
  sha256Slice11,
} from "../scripts/research-expected-projection-slice11.mjs";
import {
  SLICE11_PROTOCOL_SCHEMA_DOCUMENTS,
  contentHashProtocolSlice11,
  contentRefSlice11,
  createSlice11CalibrationRequest,
  createSlice11CalibrationTerminal,
  createSlice11LedgerEvent,
  validateSlice11CalibrationRequest,
  validateSlice11CalibrationSummary,
  validateSlice11CalibrationTerminal,
  validateSlice11Ledger,
} from "../scripts/research-calibration-protocol-slice11.mjs";
import { runSlice11CalibrationOperation } from "../scripts/research-calibration-runner-slice11.mjs";

const UTC = "2026-08-16T02:00:00.000Z";
const EXIT = Object.freeze({
  stage: "exit-confirmed", workerInvoked: true, workerExitConfirmed: true, ipcMessageReceived: true,
  exitCode: 0, signal: null, timedOut: false, cancelled: false, observationSha256: "b".repeat(64),
});
const PREFLIGHT = Object.freeze({
  stage: "preflight-not-started", workerInvoked: false, workerExitConfirmed: null, ipcMessageReceived: false,
  exitCode: null, signal: null, timedOut: false, cancelled: false, observationSha256: null,
});
const GOLD = Object.freeze({
  fileSha256: "f".repeat(64), mime: "image/png", parentIdentity: { id: "parent.s11" },
  decodedPixelSha256: "a".repeat(64), width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB",
  orientation: 1, alphaMode: "straight-unpremultiplied", alphaPresent: true,
  metadataPolicy: "strip-all-except-color-contract", pngFilterPolicy: "filter-0-only",
  interlace: "forbidden", animation: "forbidden",
});

function hash(label) { return sha256Slice11(Buffer.from(label)); }
function ref(id, path = `records/${id}.json`) {
  return Object.freeze({ id, path, byteLength: 100, contentHash: hash(`content:${id}`), fileSha256: hash(`file:${id}`) });
}
function refs(operation = "normalize") {
  return Object.freeze({
    candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.11.0"),
    contractRef: ref(`CC-CAP02-${operation.toUpperCase()}-PNG@0.11.0`),
    runtimeRef: ref("RUNTIME-SHARP@0.11.0"),
    workerRef: Object.freeze({ id: "ADAPTER-SHARP-CANONICAL-PNG@0.11.0", version: "0.11.0",
      path: "scripts/research-gateb-adapter-slice11.mjs", implementationSha256: hash("worker") }),
  });
}
function cases() {
  return Array.from({ length: 48 }, (_, index) => {
    const applicable = index < 24;
    const partition = index < 30 ? "dev/calibration" : "defect/calibration";
    return Object.freeze({
      sourceRef: ref(`source.s11.${String(index + 1).padStart(3, "0")}`),
      manifestRef: ref(`manifest.s11.${partition.replace("/", ".")}`), partition,
      disposition: applicable ? "applicable" : "rejection",
      expectedStableErrorCode: applicable ? null : "S11_SOURCE_REJECTION_EXPECTED",
      goldIdentityRef: applicable ? ref(`gold.s11.${String(index + 1).padStart(3, "0")}`) : null,
    });
  });
}
function projection() {
  return projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: GOLD });
}
function fakeExecutor({ drift = false } = {}) {
  const projected = projection();
  return async ({ request }) => {
    if (request.disposition === "rejection") {
      return { kind: "rejection-pass", actualStableErrorCode: request.expectedStableErrorCode,
        expectedProjection: null, workerLifecycle: PREFLIGHT };
    }
    const drifted = drift && request.attempt.sourceId.endsWith("001") && request.attempt.repetition === 3;
    return { kind: "applicable-pass", outputBytes: Buffer.from(drifted ? "candidate-b" : "candidate-a"),
      oracleFacts: { strictDecision: "pass", decodedPixelSha256: GOLD.decodedPixelSha256 },
      expectedProjection: projected, workerLifecycle: EXIT };
  };
}

function assertClosed(schema) {
  if (!schema || typeof schema !== "object") return;
  if (schema.type === "object") {
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  }
  if (schema.type === "array") assert.ok(schema.items);
  for (const value of Object.values(schema)) {
    if (Array.isArray(value)) value.forEach(assertClosed);
    else if (value && typeof value === "object") assertClosed(value);
  }
}

test("Slice 11 protocol exports six exact-id recursively closed schemas", () => {
  assert.equal(Object.keys(SLICE11_PROTOCOL_SCHEMA_DOCUMENTS).length, 6);
  for (const [relativePath, schema] of Object.entries(SLICE11_PROTOCOL_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-11/${relativePath}`);
    assertClosed(schema);
  }
});

test("request rejects Slice 10 identity, replacement attempts and evidence promotion after self rehash", () => {
  const item = cases()[0];
  const request = structuredClone(createSlice11CalibrationRequest({
    requestId: "request.s11.normalize.001.r1.a1", operation: "normalize",
    attempt: { sourceId: item.sourceRef.id, partition: item.partition, repetition: 1, attemptNumber: 1 },
    disposition: item.disposition, expectedStableErrorCode: null, sourceRef: item.sourceRef, manifestRef: item.manifestRef,
    goldIdentityRef: item.goldIdentityRef, ...refs("normalize"), createdAt: UTC, idempotencyKey: hash("request"),
  }));
  assert.equal(validateSlice11CalibrationRequest(request), true);
  for (const mutate of [
    (value) => { value.candidateRef.id = "REG-NORM-SHARP-CANONICAL-PNG@0.10.0"; },
    (value) => { value.attempt.attemptNumber = 2; },
    (value) => { value.evidenceBoundary.c1 = 1; },
  ]) {
    const tampered = structuredClone(request);
    mutate(tampered);
    tampered.contentHash = contentHashProtocolSlice11(tampered);
    assert.throws(() => validateSlice11CalibrationRequest(tampered), (error) => error.code === "S11_CALIBRATION_REQUEST_INVALID");
  }
});

test("terminal cross-validation rejects a self-rehashed preflight lifecycle substituted for a clean exit", () => {
  const item = cases()[0];
  const request = createSlice11CalibrationRequest({
    requestId: "request.s11.normalize.001.r1.a1", operation: "normalize",
    attempt: { sourceId: item.sourceRef.id, partition: item.partition, repetition: 1, attemptNumber: 1 },
    disposition: "applicable", expectedStableErrorCode: null, sourceRef: item.sourceRef, manifestRef: item.manifestRef,
    goldIdentityRef: item.goldIdentityRef, ...refs("normalize"), createdAt: UTC, idempotencyKey: hash("request"),
  });
  const projected = projection();
  const exited = createSlice11WorkerLifecycle({ lifecycleId: "lifecycle.request.s11.normalize.001.r1.a1",
    attemptId: request.requestId, operation: "normalize", projection: projected, lifecycle: EXIT, recordedAt: UTC });
  const terminal = createSlice11CalibrationTerminal({ terminalId: "terminal.request.s11.normalize.001.r1.a1",
    operation: "normalize", disposition: "applicable", requestRef: contentRefSlice11(request, "requestId"), status: "pass",
    actualStableErrorCode: null, reasonCode: null, expectedProjectionRef: contentRefSlice11(projected, "projectionId"),
    workerLifecycleRef: contentRefSlice11(exited, "lifecycleId"), outputFileSha256: hash("output"), outputByteLength: 12,
    oracleFactsSha256: hash("oracle"), startedAt: UTC, finishedAt: UTC }, { request, lifecycle: exited, projection: projected });
  assert.equal(validateSlice11CalibrationTerminal(terminal, { request, lifecycle: exited, projection: projected }), true);
  const preflight = structuredClone(createSlice11WorkerLifecycle({ lifecycleId: exited.lifecycleId,
    attemptId: request.requestId, operation: "normalize", projection: null, lifecycle: PREFLIGHT, recordedAt: UTC }));
  preflight.contentHash = contentHashLifecycleSlice11(preflight);
  const laundered = structuredClone(terminal);
  laundered.workerLifecycleRef.contentHash = preflight.contentHash;
  laundered.contentHash = contentHashProtocolSlice11(laundered);
  assert.throws(() => validateSlice11CalibrationTerminal(laundered, { request, lifecycle: preflight, projection: projected }),
    (error) => error.code === "S11_CALIBRATION_TERMINAL_INVALID");
});

test("ledger requires exact start-terminal pairs and rejects a self-rehashed predecessor rewrite", () => {
  const requestRef = { id: "request.s11.normalize.001.r1.a1", contentHash: hash("request") };
  const first = createSlice11LedgerEvent({ eventId: "event.s11.normalize.0001", sequence: 1, eventType: "attempt-started",
    requestRef, terminalRef: null, previousEventHash: null, payloadSha256: hash("start"), occurredAt: UTC });
  const second = createSlice11LedgerEvent({ eventId: "event.s11.normalize.0002", sequence: 2, eventType: "attempt-terminal",
    requestRef, terminalRef: { id: "terminal.request.s11.normalize.001.r1.a1", contentHash: hash("terminal") },
    previousEventHash: first.contentHash, payloadSha256: hash("finish"), occurredAt: UTC });
  assert.equal(validateSlice11Ledger([first, second]), true);
  const tampered = structuredClone(second);
  tampered.previousEventHash = hash("other");
  tampered.contentHash = contentHashProtocolSlice11(tampered);
  assert.throws(() => validateSlice11Ledger([first, tampered]), (error) => error.code === "S11_CALIBRATION_LEDGER_INVALID");
  const promoted = structuredClone(second);
  promoted.evidenceBoundary.c1 = 1;
  promoted.contentHash = contentHashProtocolSlice11(promoted);
  assert.throws(() => validateSlice11Ledger([first, promoted]), (error) => error.code === "S11_CALIBRATION_LEDGER_INVALID");
});

test("fake-only runner closes all 48x3 slots with exact lifecycle and a deterministic pass summary", async () => {
  const result = await runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: fakeExecutor(), now: () => UTC });
  assert.equal(result.status, "calibration-complete-pass");
  assert.equal(result.requests.length, 144);
  assert.equal(result.terminals.length, 144);
  assert.equal(result.ledger.length, 288);
  assert.equal(result.lifecycles.length, 144);
  assert.equal(result.projections.length, 72);
  assert.equal(result.summary.replacementAttemptCount, 0);
  assert.equal(result.summary.allApplicableSourcesByteDeterministic, true);
  assert.equal(validateSlice11CalibrationSummary(result.summary), true);
  assert.equal(validateSlice11Ledger(result.ledger), true);
  assert.ok(result.requests.every(({ attempt }) => attempt.attemptNumber === 1));
  const duplicated = structuredClone(result.summary);
  duplicated.caseResults[1].terminalRefs[0] = structuredClone(duplicated.caseResults[0].terminalRefs[0]);
  duplicated.contentHash = contentHashProtocolSlice11(duplicated);
  assert.throws(() => validateSlice11CalibrationSummary(duplicated), (error) => error.code === "S11_CALIBRATION_SUMMARY_INVALID");
  const crossHash = structuredClone(result.summary);
  crossHash.caseResults[0].terminalRefs[0].contentHash = hash("swapped-terminal-content");
  crossHash.contentHash = contentHashProtocolSlice11(crossHash);
  assert.throws(() => validateSlice11CalibrationSummary(crossHash), (error) => error.code === "S11_CALIBRATION_SUMMARY_INVALID");
  const laundered = structuredClone(result.summary);
  laundered.caseResults[0].allThreePass = false;
  laundered.contentHash = contentHashProtocolSlice11(laundered);
  assert.throws(() => validateSlice11CalibrationSummary(laundered), (error) => error.code === "S11_CALIBRATION_SUMMARY_INVALID");
});

test("byte drift remains visible as a complete non-pass summary instead of majority passing", async () => {
  const result = await runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: fakeExecutor({ drift: true }), now: () => UTC });
  assert.equal(result.terminals.length, 144);
  assert.equal(result.summary.allRegisteredAttemptsPass, true);
  assert.equal(result.summary.allApplicableSourcesByteDeterministic, false);
  assert.equal(result.status, "calibration-complete-non-pass");
});

test("a truthful pre-worker protocol failure writes one terminal and globally stops without replacement", async () => {
  const error = Object.assign(new Error("binding failed"), { code: "S11_CASE_REQUEST_BINDING_INVALID", workerLifecycle: PREFLIGHT });
  const result = await runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: async () => { throw error; }, now: () => UTC });
  assert.equal(result.status, "protocol-failed");
  assert.equal(result.requests.length, 1);
  assert.equal(result.terminals.length, 1);
  assert.equal(result.ledger.length, 2);
  assert.equal(result.summary, null);
  assert.equal(result.terminals[0].reasonCode, "S11_CASE_REQUEST_BINDING_INVALID");
  assert.equal(result.lifecycles[0].stage, "preflight-not-started");
  assert.equal(result.lifecycles[0].workerInvoked, false);
});

test("durability hooks are awaited before every execution and before advancing to the next slot", async () => {
  let executions = 0;
  let publications = 0;
  const base = fakeExecutor();
  const result = await runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: async (context) => {
      assert.equal(executions, publications);
      executions += 1;
      return base(context);
    },
    hooks: {
      beforeAttempt: async ({ request }) => { assert.equal(request.attempt.attemptNumber, 1); },
      afterAttempt: async ({ request, terminal }) => {
        assert.equal(terminal.requestRef.id, request.requestId);
        await Promise.resolve();
        publications += 1;
      },
    }, now: () => UTC });
  assert.equal(result.status, "calibration-complete-pass");
  assert.equal(executions, 144);
  assert.equal(publications, 144);
});

test("a durability hook failure stops globally without invoking or advancing another slot", async () => {
  let executions = 0;
  const beforeCause = Object.assign(new Error("claim exists"), { code: "S11_CLAIM_RECONCILIATION_UNKNOWN" });
  await assert.rejects(runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: async () => { executions += 1; return fakeExecutor()(); },
    hooks: { beforeAttempt: async () => { throw beforeCause; } }, now: () => UTC }), (error) => {
    assert.equal(error.code, "S11_BEFORE_ATTEMPT_DURABILITY_FAILED");
    assert.equal(error.cause, beforeCause);
    assert.equal(error.partial.requests.length, 0);
    assert.equal(error.partial.globalStop.reasonCode, beforeCause.code);
    return true;
  });
  assert.equal(executions, 0);

  const afterCause = Object.assign(new Error("rename uncertain"), { code: "S11_PUBLICATION_RECONCILIATION_UNKNOWN" });
  await assert.rejects(runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs("normalize"),
    executeAttempt: async (context) => { executions += 1; return fakeExecutor()(context); },
    hooks: { afterAttempt: async () => { throw afterCause; } }, now: () => UTC }), (error) => {
    assert.equal(error.code, "S11_AFTER_ATTEMPT_DURABILITY_FAILED");
    assert.equal(error.cause, afterCause);
    assert.equal(error.partial.requests.length, 1);
    assert.equal(error.partial.terminals.length, 1);
    assert.equal(error.partial.globalStop.reasonCode, afterCause.code);
    return true;
  });
  assert.equal(executions, 1);
});
