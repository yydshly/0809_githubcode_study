import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createSlice11DurableAttemptHooks } from "../scripts/research-calibration-durable-slice11.mjs";
import {
  SLICE11_EXPECTED_PROJECTION_ID,
  projectGoldExpectedSlice11,
  sha256Slice11,
} from "../scripts/research-expected-projection-slice11.mjs";
import { runSlice11CalibrationOperation } from "../scripts/research-calibration-runner-slice11.mjs";

const UTC = "2026-08-16T04:00:00.000Z";
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
function ref(id, relativePath = `records/${id}.json`) {
  return Object.freeze({ id, path: relativePath, byteLength: 100,
    contentHash: hash(`content:${id}`), fileSha256: hash(`file:${id}`) });
}
function refs() {
  return Object.freeze({
    candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.11.0"),
    contractRef: ref("CC-CAP02-NORMALIZE-PNG@0.11.0"), runtimeRef: ref("RUNTIME-SHARP@0.11.0"),
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
function fakeExecutor() {
  const projection = projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: GOLD });
  return async ({ request }) => request.disposition === "applicable"
    ? { kind: "applicable-pass", outputBytes: Buffer.from(`candidate:${request.attempt.sourceId}`),
      oracleFacts: { strictDecision: "pass", decodedPixelSha256: GOLD.decodedPixelSha256 },
      expectedProjection: projection, workerLifecycle: EXIT }
    : { kind: "rejection-pass", actualStableErrorCode: request.expectedStableErrorCode,
      expectedProjection: null, workerLifecycle: PREFLIGHT };
}
async function exists(target) {
  try { await stat(target); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

test("durable runner bridge closes all 48x3 slots before advancing and refuses replay authority", async (t) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "slice11-durable-runner-"));
  t.after(async () => { await rm(parent, { recursive: true, force: true }); });
  const operationRoot = path.join(parent, "normalize");
  const events = [];
  const hooks = createSlice11DurableAttemptHooks({ operationRoot, now: () => UTC,
    appendPublicationIntent: async (publication) => events.push(["intent", publication.requestRef.id]),
    appendPublicationComplete: async (publication) => events.push(["complete", publication.requestRef.id]) });
  const result = await runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs(),
    executeAttempt: fakeExecutor(), hooks, now: () => UTC });
  assert.equal(result.status, "calibration-complete-pass");
  assert.equal(result.requests.length, 144);
  assert.equal(result.terminals.length, 144);
  assert.equal((await readdir(path.join(operationRoot, "requests"))).length, 144);
  assert.equal((await readdir(path.join(operationRoot, "claims"))).length, 144);
  assert.equal((await readdir(path.join(operationRoot, "closures"))).length, 144);
  assert.equal(events.length, 288);
  assert.ok(events.every(([kind], index) => kind === (index % 2 === 0 ? "intent" : "complete")));
  const applicableFiles = await readdir(path.join(operationRoot, "closures", result.requests[0].requestId));
  const rejectionFiles = await readdir(path.join(operationRoot, "closures", result.requests[72].requestId));
  assert.equal(applicableFiles.length, 6);
  assert.equal(rejectionFiles.length, 3);
  assert.equal(await exists(path.join(operationRoot, ".staging")), false);

  let replayExecutions = 0;
  await assert.rejects(runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs(),
    executeAttempt: async (context) => { replayExecutions += 1; return fakeExecutor()(context); }, hooks, now: () => UTC }),
  (error) => error.code === "S11_BEFORE_ATTEMPT_DURABILITY_FAILED"
    && error.cause?.code === "S11_REQUEST_ALREADY_PERSISTED" && error.partial.requests.length === 0);
  assert.equal(replayExecutions, 0);
});

test("publication uncertainty stops before a second worker and preserves the single committed closure", async (t) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "slice11-durable-stop-"));
  t.after(async () => { await rm(parent, { recursive: true, force: true }); });
  const operationRoot = path.join(parent, "normalize");
  let executions = 0;
  const hooks = createSlice11DurableAttemptHooks({ operationRoot, now: () => UTC,
    appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {},
    publicationHooksForRequest: () => ({ afterRename: async () => { throw new Error("injected-after-rename"); } }) });
  await assert.rejects(runSlice11CalibrationOperation({ operation: "normalize", cases: cases(), refs: refs(),
    executeAttempt: async (context) => { executions += 1; return fakeExecutor()(context); }, hooks, now: () => UTC }), (error) => {
    assert.equal(error.code, "S11_AFTER_ATTEMPT_DURABILITY_FAILED");
    assert.equal(error.cause?.code, "S11_PUBLICATION_RECONCILIATION_UNKNOWN");
    assert.equal(error.partial.requests.length, 1);
    assert.equal(error.partial.terminals.length, 1);
    return true;
  });
  assert.equal(executions, 1);
  assert.equal((await readdir(path.join(operationRoot, "closures"))).length, 1);
});
