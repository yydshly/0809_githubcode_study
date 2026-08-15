import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SLICE11_OPERATION_SCHEMA_DOCUMENTS,
  runSlice11DurableCalibrationOperation,
  validateSlice11DurableLedger,
  validateSlice11OperationClose,
} from "../scripts/research-calibration-operation-slice11.mjs";
import {
  SLICE11_EXPECTED_PROJECTION_ID,
  projectGoldExpectedSlice11,
  sha256Slice11,
  stableStringifySlice11,
} from "../scripts/research-expected-projection-slice11.mjs";
import { contentHashProtocolSlice11 } from "../scripts/research-calibration-protocol-slice11.mjs";

const UTC = "2026-08-16T05:00:00.000Z";
const RUNTIME = Object.freeze({ sharp: "0.35.3", node: "22.15.0", platform: "win32", arch: "x64" });
const RUNTIME_SHA = sha256Slice11(Buffer.from(`${stableStringifySlice11(RUNTIME)}\n`, "utf8"));
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
    return Object.freeze({ sourceRef: ref(`source.s11.${String(index + 1).padStart(3, "0")}`),
      manifestRef: ref(`manifest.s11.${partition.replace("/", ".")}`), partition,
      disposition: applicable ? "applicable" : "rejection",
      expectedStableErrorCode: applicable ? null : "S11_SOURCE_REJECTION_EXPECTED",
      goldIdentityRef: applicable ? ref(`gold.s11.${String(index + 1).padStart(3, "0")}`) : null });
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
async function tempOperation(t, label) {
  const parent = await mkdtemp(path.join(os.tmpdir(), `slice11-operation-${label}-`));
  t.after(async () => { await rm(parent, { recursive: true, force: true }); });
  return path.join(parent, "normalize");
}
async function exists(target) {
  try { await stat(target); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
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

test("operation layer exports eight exact-id recursively closed schemas", () => {
  assert.equal(Object.keys(SLICE11_OPERATION_SCHEMA_DOCUMENTS).length, 8);
  for (const [relativePath, schema] of Object.entries(SLICE11_OPERATION_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-11/${relativePath}`);
    assertClosed(schema);
  }
});

test("durable operation closes 144 attempts with a 288-event publication chain and atomic final record", async (t) => {
  const operationRoot = await tempOperation(t, "complete");
  const output = await runSlice11DurableCalibrationOperation({ operationRoot, runId: "run.s11.normalize.once",
    operation: "normalize", cases: cases(), refs: refs(), executeAttempt: fakeExecutor(),
    observeRuntime: async () => RUNTIME, frozenRuntimePayloadSha256: RUNTIME_SHA, now: () => UTC });
  assert.equal(output.close.status, "calibration-complete-pass");
  assert.equal(output.close.requestCount, 144);
  assert.equal(output.close.closureCount, 144);
  assert.equal(output.close.eventCount, 288);
  assert.equal(output.events.length, 288);
  assert.equal(validateSlice11DurableLedger(output.events), true);
  const ledgerBytes = await readFile(path.join(operationRoot, "publication-ledger.ndjson"));
  assert.equal(validateSlice11OperationClose(output.close, { claim: output.claim, runtimeStart: output.runtimeStart,
    runtimeEnd: output.runtimeEnd, summary: output.result.summary, ledgerBytes, events: output.events }), true);
  assert.throws(() => validateSlice11OperationClose(output.close, { claim: output.claim, runtimeStart: output.runtimeStart,
    runtimeEnd: output.runtimeEnd, summary: output.result.summary,
    ledgerBytes: Buffer.concat([ledgerBytes, Buffer.from("{}\n")]), events: output.events }),
  (error) => error.code === "S11_OPERATION_CLOSE_INVALID");
  assert.deepEqual((await readdir(output.destination)).sort(), ["operation-close.json", "runtime-end.json", "summary.json"]);
  assert.equal(await exists(path.join(operationRoot, ".operation-close")), false);
  assert.equal(await exists(path.join(operationRoot, ".staging")), false);

  let replayExecutions = 0;
  await assert.rejects(runSlice11DurableCalibrationOperation({ operationRoot, runId: "run.s11.normalize.once",
    operation: "normalize", cases: cases(), refs: refs(),
    executeAttempt: async (context) => { replayExecutions += 1; return fakeExecutor()(context); },
    observeRuntime: async () => RUNTIME, frozenRuntimePayloadSha256: RUNTIME_SHA, now: () => UTC }),
  (error) => error.code === "S11_OPERATION_ROOT_NOT_EMPTY");
  assert.equal(replayExecutions, 0);
});

test("durable ledger rejects a self-rehashed predecessor or publication-pair rewrite", async (t) => {
  const operationRoot = await tempOperation(t, "tamper");
  const output = await runSlice11DurableCalibrationOperation({ operationRoot, runId: "run.s11.normalize.tamper",
    operation: "normalize", cases: cases(), refs: refs(), executeAttempt: fakeExecutor(),
    observeRuntime: async () => RUNTIME, frozenRuntimePayloadSha256: RUNTIME_SHA, now: () => UTC });
  const predecessor = structuredClone(output.events);
  predecessor[1].previousEventHash = hash("other-predecessor");
  predecessor[1].contentHash = contentHashProtocolSlice11(predecessor[1]);
  assert.throws(() => validateSlice11DurableLedger(predecessor), (error) => error.code === "S11_DURABLE_LEDGER_INVALID");
  const operation = structuredClone(output.events);
  operation[0].operation = "export";
  operation[0].contentHash = contentHashProtocolSlice11(operation[0]);
  assert.throws(() => validateSlice11DurableLedger(operation), (error) => error.code === "S11_DURABLE_EVENT_INVALID");
  const paired = structuredClone(output.events);
  paired[1].publicationRef = structuredClone(paired[2].publicationRef);
  paired[1].contentHash = contentHashProtocolSlice11(paired[1]);
  paired[2].previousEventHash = paired[1].contentHash;
  paired[2].contentHash = contentHashProtocolSlice11(paired[2]);
  assert.throws(() => validateSlice11DurableLedger(paired), (error) => error.code === "S11_DURABLE_LEDGER_INVALID");
});

test("runtime-end drift closes no operation and a protocol failure never advances to a second worker", async (t) => {
  const operationRoot = await tempOperation(t, "drift");
  let executions = 0;
  const failure = Object.assign(new Error("preflight binding"), {
    code: "S11_CASE_REQUEST_BINDING_INVALID", workerLifecycle: PREFLIGHT,
  });
  await assert.rejects(runSlice11DurableCalibrationOperation({ operationRoot, runId: "run.s11.normalize.drift",
    operation: "normalize", cases: cases(), refs: refs(), executeAttempt: async () => { executions += 1; throw failure; },
    observeRuntime: async (phase) => phase === "start" ? RUNTIME : { ...RUNTIME, node: "22.16.0" },
    frozenRuntimePayloadSha256: RUNTIME_SHA, now: () => UTC }), (error) => {
    assert.equal(error.code, "S11_RUNTIME_END_DRIFT");
    assert.equal(error.partial.requests.length, 1);
    return true;
  });
  assert.equal(executions, 1);
  assert.equal((await readdir(path.join(operationRoot, "closures"))).length, 1);
  assert.equal(await exists(path.join(operationRoot, "final")), false);
  assert.equal(await exists(path.join(operationRoot, "runtime", "end-observation.json")), true);
});
