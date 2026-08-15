import assert from "node:assert/strict";
import test from "node:test";

import { createSlice11CalibrationAttemptExecutor } from "../scripts/research-calibration-case-slice11.mjs";
import {
  SLICE11_WORKER_LIFECYCLE_SCHEMA,
  contentHashLifecycleSlice11,
  createSlice11WorkerLifecycle,
  validateSlice11WorkerLifecycle,
} from "../scripts/research-calibration-lifecycle-slice11.mjs";
import { SLICE11_EXPECTED_PROJECTION_ID, projectGoldExpectedSlice11 } from "../scripts/research-expected-projection-slice11.mjs";

const GOLD = Object.freeze({
  fileSha256: "f".repeat(64), mime: "image/png", parentIdentity: { id: "parent.s11" },
  decodedPixelSha256: "a".repeat(64), width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB",
  orientation: 1, alphaMode: "straight-unpremultiplied", alphaPresent: true,
  metadataPolicy: "strip-all-except-color-contract", pngFilterPolicy: "filter-0-only", interlace: "forbidden", animation: "forbidden",
});
const EXIT = Object.freeze({
  stage: "exit-confirmed", workerInvoked: true, workerExitConfirmed: true, ipcMessageReceived: true,
  exitCode: 0, signal: null, timedOut: false, cancelled: false, observationSha256: "b".repeat(64),
});
const PREFLIGHT = Object.freeze({
  stage: "preflight-not-started", workerInvoked: false, workerExitConfirmed: null, ipcMessageReceived: false,
  exitCode: null, signal: null, timedOut: false, cancelled: false, observationSha256: null,
});

function request(overrides = {}) {
  return {
    requestId: "request.s11.normalize.001.r1",
    operation: "normalize",
    disposition: "applicable",
    expectedStableErrorCode: null,
    attempt: { sourceId: "source.s11.normalize.001", partition: "dev/calibration", repetition: 1, attemptNumber: 1 },
    ...overrides,
  };
}

test("worker lifecycle record binds projection, exact UTC and zero-evidence boundary", () => {
  const projection = projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: GOLD });
  const record = createSlice11WorkerLifecycle({
    lifecycleId: "lifecycle.s11.normalize.001.r1", attemptId: "request.s11.normalize.001.r1", operation: "normalize",
    projection, lifecycle: EXIT, recordedAt: "2026-08-16T01:00:00.000Z",
  });
  assert.equal(validateSlice11WorkerLifecycle(record), true);
  assert.equal(record.projectionRef.contentHash, projection.contentHash);
  assert.equal(record.workerInvoked, true);
});

test("rehashing cannot launder a preflight record that claims worker invocation", () => {
  const record = structuredClone(createSlice11WorkerLifecycle({
    lifecycleId: "lifecycle.s11.preflight.001", attemptId: "request.s11.preflight.001", operation: "normalize",
    projection: null, lifecycle: PREFLIGHT, recordedAt: "2026-08-16T01:00:00.000Z",
  }));
  record.workerInvoked = true;
  record.workerExitConfirmed = false;
  record.contentHash = contentHashLifecycleSlice11(record);
  assert.throws(() => validateSlice11WorkerLifecycle(record), (error) => error.code === "S11_WORKER_LIFECYCLE_INVALID");
});

test("lifecycle schema is namespaced and closes its root object", () => {
  assert.equal(SLICE11_WORKER_LIFECYCLE_SCHEMA.$id, "https://single-image-studio.invalid/research/slice-11/schemas/worker-lifecycle.slice11.v0.schema.json");
  assert.equal(SLICE11_WORKER_LIFECYCLE_SCHEMA.additionalProperties, false);
  assert.deepEqual([...SLICE11_WORKER_LIFECYCLE_SCHEMA.required].sort(), Object.keys(SLICE11_WORKER_LIFECYCLE_SCHEMA.properties).sort());
});

test("case executor passes complete gold only to the versioned adapter and retains its projection/lifecycle", async () => {
  let observed;
  const projection = projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: GOLD });
  const executor = createSlice11CalibrationAttemptExecutor({
    casesBySourceId: new Map([["source.s11.normalize.001", {
      sourceId: "source.s11.normalize.001", operation: "normalize", partition: "dev/calibration", disposition: "applicable",
      expectedStableErrorCode: null, workerInput: { inputBytes: Buffer.from("fake") }, goldExpected: GOLD,
    }]]),
    rawExecutor: { execute: async (value) => { observed = value; return { outputBytes: Buffer.from("candidate"), oracleFacts: {}, expectedProjection: projection, workerLifecycle: EXIT }; } },
    classifyRejection: () => { throw new Error("not called"); },
  });
  const result = await executor({ request: request() });
  assert.deepEqual(observed.goldExpected, GOLD);
  assert.equal(Object.hasOwn(observed, "expected"), false);
  assert.equal(result.expectedProjection.contentHash, projection.contentHash);
  assert.equal(result.workerLifecycle.stage, "exit-confirmed");
});

test("rejection remains worker-free and never receives a projection", async () => {
  let workerCalls = 0;
  const rejectionRequest = request({
    disposition: "rejection", expectedStableErrorCode: "S11_NORMALIZE_SOURCE_INVALID",
    attempt: { sourceId: "source.s11.normalize.reject.001", partition: "defect/calibration", repetition: 1, attemptNumber: 1 },
  });
  const executor = createSlice11CalibrationAttemptExecutor({
    casesBySourceId: new Map([["source.s11.normalize.reject.001", {
      sourceId: "source.s11.normalize.reject.001", operation: "normalize", partition: "defect/calibration", disposition: "rejection",
      expectedStableErrorCode: "S11_NORMALIZE_SOURCE_INVALID", workerInput: null, goldExpected: null,
    }]]),
    rawExecutor: { execute: async () => { workerCalls += 1; } },
    classifyRejection: () => "S11_NORMALIZE_SOURCE_INVALID",
  });
  const result = await executor({ request: rejectionRequest });
  assert.equal(workerCalls, 0);
  assert.equal(result.expectedProjection, null);
  assert.equal(result.workerLifecycle.workerInvoked, false);
});

test("request rebinding fails before adapter invocation with truthful lifecycle", async () => {
  let workerCalls = 0;
  const executor = createSlice11CalibrationAttemptExecutor({
    casesBySourceId: new Map([["source.s11.normalize.001", {
      sourceId: "source.s11.normalize.001", operation: "normalize", partition: "dev/calibration", disposition: "applicable",
      expectedStableErrorCode: null, workerInput: { inputBytes: Buffer.from("fake") }, goldExpected: GOLD,
    }]]),
    rawExecutor: { execute: async () => { workerCalls += 1; } },
    classifyRejection: () => null,
  });
  await assert.rejects(executor({ request: request({ operation: "export" }) }), (error) => error.code === "S11_CASE_REQUEST_BINDING_INVALID"
    && error.workerLifecycle.workerInvoked === false);
  assert.equal(workerCalls, 0);
});
