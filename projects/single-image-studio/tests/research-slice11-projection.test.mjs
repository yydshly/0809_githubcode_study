import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import test from "node:test";

import { SLICE07_GATEB_POLICY } from "../scripts/research-gateb-adapter-slice07.mjs";
import { encodeCanonicalPngSlice07 } from "../scripts/research-canonical-png-encoder-slice07.mjs";
import {
  SLICE11_ADAPTER_EXPECTED_KEYS,
  SLICE11_EXPECTED_PROJECTION_ID,
  SLICE11_EXPECTED_PROJECTION_SCHEMA,
  contentHashProjectionSlice11,
  projectGoldExpectedSlice11,
  sha256Slice11,
  stableStringifySlice11,
  validateExpectedProjectionSlice11,
} from "../scripts/research-expected-projection-slice11.mjs";
import {
  Slice11GateBError,
  createSlice11RawWorkerExecutor,
} from "../scripts/research-gateb-adapter-slice11.mjs";

const RGBA = Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const RUNTIME = Object.freeze({ sharp: "0.35.3", platform: "win32", arch: "x64" });

function assertClosedSchema(node, location = "$") {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (node.type === "object") {
    assert.equal(node.additionalProperties, false, `${location} must be closed`);
    assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${location} must require every property`);
  }
  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) assertClosedSchema(child, `${location}.${key}`);
  }
  if (node.items) assertClosedSchema(node.items, `${location}[]`);
}

function goldExpected(overrides = {}) {
  return {
    fileSha256: "f".repeat(64),
    mime: "image/png",
    parentIdentity: { id: "gold.parent.s11.001", contentHash: "e".repeat(64) },
    decodedPixelSha256: sha256(RGBA),
    width: 2,
    height: 2,
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    alphaPresent: true,
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
    ...overrides,
  };
}

function workerRequest() {
  return {
    protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
    attemptId: "attempt.s11.fake.001",
    operation: "normalize",
    inputBytes: Buffer.from("fake-only"),
  };
}

function successMessage() {
  return {
    protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
    attemptId: "attempt.s11.fake.001",
    operation: "normalize",
    status: "succeeded",
    rgba: RGBA,
    width: 2,
    height: 2,
    runtime: RUNTIME,
    durationMs: 4,
    resourceUsage: { maxRssKiB: 64_000, userCpuMicros: 1000, systemCpuMicros: 500 },
  };
}

class FakeChild extends EventEmitter {
  constructor(script) {
    super();
    this.script = script;
  }

  send() {
    queueMicrotask(() => this.script(this));
    return true;
  }

  kill() {
    queueMicrotask(() => this.emit("exit", null, "SIGKILL"));
    return true;
  }
}

function independentVerify({ bytes, expected }) {
  return {
    fileSha256: sha256(bytes),
    decodedPixelSha256: expected.decodedPixelSha256,
    width: expected.width,
    height: expected.height,
    chunkTypes: ["IHDR", "sRGB", "IDAT", "IEND"],
  };
}

test("Slice 11 projection removes provenance-only gold fields and is deterministically self-bound", () => {
  const gold = goldExpected();
  const projected = projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: gold });
  assert.deepEqual(Object.keys(projected.adapterExpected), SLICE11_ADAPTER_EXPECTED_KEYS);
  assert.equal(Object.hasOwn(projected.adapterExpected, "fileSha256"), false);
  assert.equal(Object.hasOwn(projected.adapterExpected, "mime"), false);
  assert.equal(Object.hasOwn(projected.adapterExpected, "parentIdentity"), false);
  assert.equal(validateExpectedProjectionSlice11(projected, { goldExpected: gold }), true);
  assert.deepEqual(projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: gold }), projected);
});

test("projection schema uses the Slice 11 namespace and recursively closes every object", () => {
  assert.equal(
    SLICE11_EXPECTED_PROJECTION_SCHEMA.$id,
    "https://single-image-studio.invalid/research/slice-11/schemas/expected-projection.slice11.v0.schema.json",
  );
  assertClosedSchema(SLICE11_EXPECTED_PROJECTION_SCHEMA);
});

test("projection rejects a missing canonical field and a self-rehashed-looking semantic mismatch", () => {
  const missing = goldExpected();
  delete missing.animation;
  assert.throws(
    () => projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: missing }),
    (error) => error.code === "S11_EXPECTED_PROJECTION_INVALID",
  );
  const gold = goldExpected();
  const projected = structuredClone(projectGoldExpectedSlice11({ projectionId: SLICE11_EXPECTED_PROJECTION_ID, goldExpected: gold }));
  projected.adapterExpected.width = 3;
  projected.adapterExpectedSha256 = sha256Slice11(Buffer.from(`${stableStringifySlice11(projected.adapterExpected)}\n`));
  projected.contentHash = contentHashProjectionSlice11(projected);
  assert.throws(
    () => validateExpectedProjectionSlice11(projected, { goldExpected: gold }),
    (error) => error.code === "S11_EXPECTED_PROJECTION_INVALID",
  );
});

test("preflight projection failure truthfully records that no worker was invoked", async () => {
  let spawnCount = 0;
  const executor = createSlice11RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    spawnWorker: () => { spawnCount += 1; return new FakeChild(() => {}); },
  });
  const missing = goldExpected();
  delete missing.width;
  await assert.rejects(
    executor.execute({ attemptId: "attempt.s11.fake.001", operation: "normalize", workerRequest: workerRequest(), goldExpected: missing }),
    (error) => error instanceof Slice11GateBError
      && error.code === "S11_EXPECTED_PROJECTION_INVALID"
      && error.workerLifecycle.stage === "preflight-not-started"
      && error.workerLifecycle.workerInvoked === false
      && error.workerLifecycle.workerExitConfirmed === null,
  );
  assert.equal(spawnCount, 0);
});

test("successful fake execution binds the exact projection to IPC plus confirmed clean exit", async () => {
  const executor = createSlice11RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    encodePng: encodeCanonicalPngSlice07,
    spawnWorker: () => new FakeChild((child) => {
      child.emit("message", successMessage());
      child.emit("exit", 0, null);
    }),
    timeoutMs: 50,
    messageDrainMs: 10,
    killConfirmationMs: 10,
  });
  const result = await executor.execute({
    attemptId: "attempt.s11.fake.001",
    operation: "normalize",
    workerRequest: workerRequest(),
    goldExpected: goldExpected(),
  });
  assert.equal(result.workerLifecycle.stage, "exit-confirmed");
  assert.equal(result.workerLifecycle.workerInvoked, true);
  assert.equal(result.workerLifecycle.workerExitConfirmed, true);
  assert.equal(result.workerLifecycle.ipcMessageReceived, true);
  assert.equal(result.workerLifecycle.exitCode, 0);
  assert.deepEqual(Object.keys(result.expectedProjection.adapterExpected), SLICE11_ADAPTER_EXPECTED_KEYS);
});

test("a failed spawn return cannot be laundered into a pre-worker lifecycle", async () => {
  const executor = createSlice11RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    spawnWorker: () => ({}),
  });
  await assert.rejects(
    executor.execute({
      attemptId: "attempt.s11.fake.001",
      operation: "normalize",
      workerRequest: workerRequest(),
      goldExpected: goldExpected(),
    }),
    (error) => error.code === "S11_WORKER_START_FAILED"
      && error.workerLifecycle.stage === "spawn-attempted"
      && error.workerLifecycle.workerInvoked === true
      && error.workerLifecycle.workerExitConfirmed === false,
  );
});

test("a worker-declared failure retains exact IPC and exit observations under the S11 namespace", async () => {
  const executor = createSlice11RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    spawnWorker: () => new FakeChild((child) => {
      child.emit("message", {
        protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
        attemptId: "attempt.s11.fake.001",
        operation: "normalize",
        status: "failed",
        code: "S07_SHARP_NORMALIZE_FAILED",
      });
      child.emit("exit", 0, null);
    }),
  });
  await assert.rejects(
    executor.execute({
      attemptId: "attempt.s11.fake.001",
      operation: "normalize",
      workerRequest: workerRequest(),
      goldExpected: goldExpected(),
    }),
    (error) => error.code === "S11_SHARP_NORMALIZE_FAILED"
      && error.priorCode === "S07_SHARP_NORMALIZE_FAILED"
      && error.workerLifecycle.stage === "exit-confirmed"
      && error.workerLifecycle.workerInvoked === true
      && error.workerLifecycle.workerExitConfirmed === true
      && error.workerLifecycle.ipcMessageReceived === true,
  );
});
