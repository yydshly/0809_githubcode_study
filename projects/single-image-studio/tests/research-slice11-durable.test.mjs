import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SLICE11_DURABLE_SCHEMA_DOCUMENTS,
  claimSlice11CalibrationRequest,
  createSlice11RuntimeObservation,
  publishSlice11ApplicableClosure,
  publishSlice11TerminalClosure,
  validateSlice11ApplicableClosure,
  validateSlice11RuntimeObservation,
  validateSlice11TerminalClosure,
} from "../scripts/research-calibration-durable-slice11.mjs";
import { createSlice11WorkerLifecycle } from "../scripts/research-calibration-lifecycle-slice11.mjs";
import {
  SLICE11_EXPECTED_PROJECTION_ID,
  projectGoldExpectedSlice11,
  sha256Slice11,
  stableStringifySlice11,
} from "../scripts/research-expected-projection-slice11.mjs";
import {
  contentHashProtocolSlice11,
  contentRefSlice11,
  createSlice11CalibrationRequest,
  createSlice11CalibrationTerminal,
} from "../scripts/research-calibration-protocol-slice11.mjs";

const UTC = "2026-08-16T03:00:00.000Z";
const GOLD = Object.freeze({
  fileSha256: "f".repeat(64), mime: "image/png", parentIdentity: { id: "parent.s11" },
  decodedPixelSha256: "a".repeat(64), width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB",
  orientation: 1, alphaMode: "straight-unpremultiplied", alphaPresent: true,
  metadataPolicy: "strip-all-except-color-contract", pngFilterPolicy: "filter-0-only",
  interlace: "forbidden", animation: "forbidden",
});
const EXIT = Object.freeze({
  stage: "exit-confirmed", workerInvoked: true, workerExitConfirmed: true, ipcMessageReceived: true,
  exitCode: 0, signal: null, timedOut: false, cancelled: false, observationSha256: "b".repeat(64),
});
const PREFLIGHT = Object.freeze({
  stage: "preflight-not-started", workerInvoked: false, workerExitConfirmed: null, ipcMessageReceived: false,
  exitCode: null, signal: null, timedOut: false, cancelled: false, observationSha256: null,
});

function hash(label) { return sha256Slice11(Buffer.from(label)); }
function ref(id, relativePath = `records/${id}.json`) {
  return Object.freeze({ id, path: relativePath, byteLength: 100, contentHash: hash(`content:${id}`), fileSha256: hash(`file:${id}`) });
}
function request({ createdAt = UTC, idempotencyKey = hash("request-idempotency"), disposition = "applicable" } = {}) {
  const applicable = disposition === "applicable";
  return createSlice11CalibrationRequest({
    requestId: "request.s11.normalize.source.s11.001.r1.a1", operation: "normalize",
    attempt: { sourceId: "source.s11.001", partition: "dev/calibration", repetition: 1, attemptNumber: 1 },
    disposition, expectedStableErrorCode: applicable ? null : "S11_SOURCE_REJECTION_EXPECTED", sourceRef: ref("source.s11.001"),
    manifestRef: ref("manifest.s11.normalize.dev"), goldIdentityRef: applicable ? ref("gold.s11.001") : null,
    candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.11.0"),
    contractRef: ref("CC-CAP02-NORMALIZE-PNG@0.11.0"), runtimeRef: ref("RUNTIME-SHARP@0.11.0"),
    workerRef: { id: "ADAPTER-SHARP-CANONICAL-PNG@0.11.0", version: "0.11.0",
      path: "scripts/research-gateb-adapter-slice11.mjs", implementationSha256: hash("adapter") },
    createdAt, idempotencyKey,
  });
}
function closure() {
  const currentRequest = request();
  const projection = projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: GOLD });
  const lifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${currentRequest.requestId}`,
    attemptId: currentRequest.requestId, operation: "normalize", projection, lifecycle: EXIT, recordedAt: UTC });
  const outputBytes = Buffer.from("canonical-candidate-output");
  const oracleFacts = { strictDecision: "pass", decodedPixelSha256: GOLD.decodedPixelSha256, profile: "canonical-png" };
  const oracleFactsSha256 = sha256Slice11(Buffer.from(`${stableStringifySlice11(oracleFacts)}\n`, "utf8"));
  const terminal = createSlice11CalibrationTerminal({
    terminalId: `terminal.${currentRequest.requestId}`, operation: "normalize", disposition: "applicable",
    requestRef: contentRefSlice11(currentRequest, "requestId"), status: "pass", actualStableErrorCode: null,
    reasonCode: null, expectedProjectionRef: contentRefSlice11(projection, "projectionId"),
    workerLifecycleRef: contentRefSlice11(lifecycle, "lifecycleId"), outputFileSha256: sha256Slice11(outputBytes),
    outputByteLength: outputBytes.length, oracleFactsSha256, startedAt: UTC, finishedAt: UTC,
  }, { request: currentRequest, projection, lifecycle });
  return { request: currentRequest, projection, lifecycle, terminal, outputBytes, oracleFacts };
}
async function tempRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "slice11-durable-"));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  return root;
}
async function exists(value) {
  try { await stat(value); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
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

test("Slice 11 durable layer exports five exact-id recursively closed schemas", () => {
  assert.equal(Object.keys(SLICE11_DURABLE_SCHEMA_DOCUMENTS).length, 5);
  for (const [relativePath, schema] of Object.entries(SLICE11_DURABLE_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-11/${relativePath}`);
    assertClosed(schema);
  }
});

test("durable claim is idempotent for one request and fail-closed for same-id drift", async (t) => {
  const root = await tempRoot(t);
  const current = request();
  const first = await claimSlice11CalibrationRequest({ operationRoot: root, request: current, claimedAt: UTC });
  const second = await claimSlice11CalibrationRequest({ operationRoot: root, request: current, claimedAt: UTC });
  assert.equal(first.status, "claimed");
  assert.equal(second.status, "existing-claim-no-execution-authority");
  assert.equal(second.claim.contentHash, first.claim.contentHash);
  const drifted = request({ idempotencyKey: hash("conflicting-idempotency") });
  await assert.rejects(claimSlice11CalibrationRequest({ operationRoot: root, request: drifted, claimedAt: UTC }),
    (error) => error.code === "S11_CLAIM_RECONCILIATION_UNKNOWN");
});

test("runtime observation preserves both exact match and explicit drift without boolean laundering", () => {
  const payload = { sharp: "0.35.3", node: "22.15.0", platform: "win32", arch: "x64" };
  const frozenPayloadSha256 = sha256Slice11(Buffer.from(`${stableStringifySlice11(payload)}\n`, "utf8"));
  const start = createSlice11RuntimeObservation({ observationId: "runtime-observation.s11.start", phase: "start",
    runtimeBindingRef: ref("RUNTIME-SHARP@0.11.0"), frozenPayloadSha256, observedPayload: payload, observedAt: UTC });
  assert.equal(start.matchesFrozen, true);
  assert.equal(validateSlice11RuntimeObservation(start), true);
  const end = createSlice11RuntimeObservation({ observationId: "runtime-observation.s11.end", phase: "end",
    runtimeBindingRef: ref("RUNTIME-SHARP@0.11.0"), frozenPayloadSha256,
    observedPayload: { ...payload, node: "22.16.0" }, observedAt: UTC });
  assert.equal(end.matchesFrozen, false);
  const laundered = structuredClone(end);
  laundered.matchesFrozen = true;
  laundered.contentHash = contentHashProtocolSlice11(laundered);
  assert.throws(() => validateSlice11RuntimeObservation(laundered), (error) => error.code === "S11_RUNTIME_OBSERVATION_INVALID");
});

test("applicable closure publishes six files only after intent and validates byte-for-byte", async (t) => {
  const root = await tempRoot(t);
  const values = closure();
  const events = [];
  const result = await publishSlice11ApplicableClosure({ operationRoot: root, ...values, preparedAt: UTC,
    appendPublicationIntent: async (publication) => { events.push(["intent", publication.contentHash]); },
    appendPublicationComplete: async (publication) => { events.push(["complete", publication.contentHash]); } });
  assert.deepEqual(events.map(([kind]) => kind), ["intent", "complete"]);
  assert.equal((await readdirNames(result.destination)).length, 6);
  assert.equal(await exists(path.join(root, ".staging")), false);
  const verified = await validateSlice11ApplicableClosure({ operationRoot: root, request: values.request,
    projection: values.projection, lifecycle: values.lifecycle, terminal: values.terminal });
  assert.deepEqual(verified.outputBytes, values.outputBytes);
  assert.equal(verified.publication.contentHash, result.publication.contentHash);
});

test("worker-free rejection publishes only lifecycle, terminal and a derived publication record", async (t) => {
  const root = await tempRoot(t);
  const currentRequest = request({ disposition: "rejection" });
  const lifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${currentRequest.requestId}`,
    attemptId: currentRequest.requestId, operation: "normalize", projection: null, lifecycle: PREFLIGHT, recordedAt: UTC });
  const terminal = createSlice11CalibrationTerminal({ terminalId: `terminal.${currentRequest.requestId}`,
    operation: "normalize", disposition: "rejection", requestRef: contentRefSlice11(currentRequest, "requestId"),
    status: "pass", actualStableErrorCode: currentRequest.expectedStableErrorCode, reasonCode: null,
    expectedProjectionRef: null, workerLifecycleRef: contentRefSlice11(lifecycle, "lifecycleId"),
    outputFileSha256: null, outputByteLength: null, oracleFactsSha256: null, startedAt: UTC, finishedAt: UTC,
  }, { request: currentRequest, projection: null, lifecycle });
  const events = [];
  const result = await publishSlice11TerminalClosure({ operationRoot: root, request: currentRequest, lifecycle, terminal,
    preparedAt: UTC, appendPublicationIntent: async (value) => events.push(["intent", value.contentHash]),
    appendPublicationComplete: async (value) => events.push(["complete", value.contentHash]) });
  assert.equal(result.publication.closureKind, "rejection-pass");
  assert.deepEqual(events.map(([kind]) => kind), ["intent", "complete"]);
  assert.deepEqual((await readdirNames(result.destination)).sort(),
    ["publication.json", "terminal.json", "worker-lifecycle.json"]);
  assert.equal((await validateSlice11TerminalClosure({ operationRoot: root, request: currentRequest,
    lifecycle, terminal })).publication.contentHash, result.publication.contentHash);
});

test("pre-worker failure publishes a terminal-only closure and rejects a self-rehashed kind rewrite", async (t) => {
  const root = await tempRoot(t);
  const currentRequest = request();
  const terminal = createSlice11CalibrationTerminal({ terminalId: `terminal.${currentRequest.requestId}`,
    operation: "normalize", disposition: "applicable", requestRef: contentRefSlice11(currentRequest, "requestId"),
    status: "protocol-failed", actualStableErrorCode: null, reasonCode: "S11_WORKER_LIFECYCLE_MISSING",
    expectedProjectionRef: null, workerLifecycleRef: null, outputFileSha256: null, outputByteLength: null,
    oracleFactsSha256: null, startedAt: UTC, finishedAt: UTC,
  }, { request: currentRequest, projection: null, lifecycle: null });
  const result = await publishSlice11TerminalClosure({ operationRoot: root, request: currentRequest, terminal,
    preparedAt: UTC, appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {} });
  assert.equal(result.publication.closureKind, "failure-terminal-only");
  assert.deepEqual((await readdirNames(result.destination)).sort(), ["publication.json", "terminal.json"]);
  assert.equal((await validateSlice11TerminalClosure({ operationRoot: root, request: currentRequest, terminal }))
    .publication.contentHash, result.publication.contentHash);

  const publicationPath = path.join(result.destination, "publication.json");
  const tampered = JSON.parse(await readFile(publicationPath, "utf8"));
  tampered.closureKind = "failure-with-lifecycle";
  tampered.contentHash = contentHashProtocolSlice11(tampered);
  await writeFile(publicationPath, `${stableStringifySlice11(tampered)}\n`);
  await assert.rejects(validateSlice11TerminalClosure({ operationRoot: root, request: currentRequest, terminal }),
    (error) => error.code === "S11_TERMINAL_PUBLICATION_INVALID");
});

async function readdirNames(directory) {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory);
}

test("pre-rename failure removes staging and never creates a committed closure", async (t) => {
  const root = await tempRoot(t);
  const values = closure();
  await assert.rejects(publishSlice11ApplicableClosure({ operationRoot: root, ...values, preparedAt: UTC,
    appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {},
    hooks: { beforeRename: async () => { throw new Error("injected-pre-rename"); } } }),
  (error) => error.code === "S11_PUBLICATION_COMMIT_FAILED" && error.committed === false);
  assert.equal(await exists(path.join(root, "closures", values.request.requestId)), false);
  assert.equal(await exists(path.join(root, ".staging")), false);
});

test("post-rename failure is reconciliation-unknown and preserves the only committed closure", async (t) => {
  const root = await tempRoot(t);
  const values = closure();
  let completeCalls = 0;
  await assert.rejects(publishSlice11ApplicableClosure({ operationRoot: root, ...values, preparedAt: UTC,
    appendPublicationIntent: async () => {}, appendPublicationComplete: async () => { completeCalls += 1; },
    hooks: { afterRename: async () => { throw new Error("injected-post-rename"); } } }),
  (error) => error.code === "S11_PUBLICATION_RECONCILIATION_UNKNOWN" && error.committed === true);
  assert.equal(completeCalls, 0);
  assert.equal(await exists(path.join(root, "closures", values.request.requestId)), true);
  await assert.rejects(publishSlice11ApplicableClosure({ operationRoot: root, ...values, preparedAt: UTC,
    appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {} }),
  (error) => error.code === "S11_PUBLICATION_ALREADY_EXISTS");
});

test("closure tamper and cross-attempt lifecycle substitution fail before evidence can be trusted", async (t) => {
  const root = await tempRoot(t);
  const values = closure();
  await publishSlice11ApplicableClosure({ operationRoot: root, ...values, preparedAt: UTC,
    appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {} });
  const outputPath = path.join(root, "closures", values.request.requestId, "output.png");
  await writeFile(outputPath, Buffer.from("tampered"));
  await assert.rejects(validateSlice11ApplicableClosure({ operationRoot: root, request: values.request,
    projection: values.projection, lifecycle: values.lifecycle, terminal: values.terminal }),
  (error) => error.code === "S11_PUBLICATION_CLOSURE_INVALID");

  const otherLifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${values.request.requestId}.other`,
    attemptId: "request.s11.normalize.other.r1.a1", operation: "normalize", projection: values.projection,
    lifecycle: EXIT, recordedAt: UTC });
  const otherRoot = await tempRoot(t);
  await assert.rejects(publishSlice11ApplicableClosure({ operationRoot: otherRoot, ...values,
    lifecycle: otherLifecycle, preparedAt: UTC, appendPublicationIntent: async () => {}, appendPublicationComplete: async () => {} }),
  (error) => error.code === "S11_CALIBRATION_TERMINAL_INVALID");
  assert.equal(await exists(path.join(otherRoot, "closures")), false);
});
