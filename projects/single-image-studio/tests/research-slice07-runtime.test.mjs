import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SLICE07_GATEB_POLICY,
  Slice07GateBError,
  createSlice07RawWorkerExecutor,
  encodeAndVerifyWorkerPixelsSlice07,
} from "../scripts/research-gateb-adapter-slice07.mjs";
import { decodeIndependentPngSlice05 } from "../scripts/research-independent-png-oracle-slice05.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const RGBA = Buffer.from([
  255, 0, 0, 255,
  0, 255, 0, 128,
  0, 0, 255, 0,
  90, 80, 70, 200,
]);

const EXPECTED = Object.freeze({
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
});

const RUNTIME = Object.freeze({
  sharpVersion: "0.35.3",
  nativeVersions: Object.freeze({ sharp: "0.35.3", vips: "8.18.3" }),
  nodeVersion: process.version,
  platform: process.platform,
  architecture: process.arch,
  settings: Object.freeze({
    concurrency: 1,
    cacheMemoryMaxMiB: 0,
    cacheFilesMax: 0,
    cacheItemsMax: 0,
    simd: false,
    uvThreadpoolSize: "1",
    vipsConcurrency: "1",
    ignoreGlobalLibvips: "1",
  }),
});

function successMessage(overrides = {}) {
  return {
    protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    status: "succeeded",
    rgba: RGBA,
    width: 2,
    height: 2,
    runtime: RUNTIME,
    durationMs: 4,
    resourceUsage: { maxRssKiB: 64_000, userCpuMicros: 1000, systemCpuMicros: 500 },
    ...overrides,
  };
}

function independentVerify({ bytes, expected }) {
  const decoded = decodeIndependentPngSlice05(bytes);
  assert.equal(decoded.decodedPixelSha256, expected.decodedPixelSha256);
  assert.equal(decoded.width, expected.width);
  assert.equal(decoded.height, expected.height);
  assert.equal(decoded.pixelLayout, expected.pixelLayout);
  assert.equal(decoded.colorSpace, expected.colorSpace);
  assert.equal(decoded.alphaPresent, expected.alphaPresent);
  assert.equal(decoded.filter0Only, true);
  return {
    fileSha256: decoded.fileSha256,
    decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width,
    height: decoded.height,
    chunkTypes: decoded.chunkTypes,
  };
}

class FakeChild extends EventEmitter {
  constructor(script, { exitOnKill = true } = {}) {
    super();
    this.script = script;
    this.exitOnKill = exitOnKill;
    this.sent = [];
    this.kills = [];
  }

  send(request, callback) {
    this.sent.push(request);
    callback?.(null);
    queueMicrotask(() => this.script?.(this, request));
  }

  kill(signal) {
    this.kills.push(signal);
    if (this.exitOnKill) queueMicrotask(() => this.emit("exit", null, signal));
    return true;
  }
}

function workerRequest() {
  return {
    protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    inputBytes: Buffer.from("fake-policy-only"),
  };
}

function executorFor(script, options = {}) {
  let child;
  const executor = createSlice07RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    spawnWorker: () => {
      child = new FakeChild(script, options);
      return child;
    },
    timeoutMs: options.timeoutMs ?? 50,
    messageDrainMs: options.messageDrainMs ?? 10,
    killConfirmationMs: options.killConfirmationMs ?? 10,
  });
  return { executor, getChild: () => child };
}

async function execute(executor) {
  return executor.execute({
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    workerRequest: workerRequest(),
    expected: EXPECTED,
  });
}

test("worker and adapter source preserve the Sharp/raw/encoder/oracle separation", async () => {
  const worker = await readFile(new URL("../scripts/research-sharp-raw-worker-slice07.mjs", import.meta.url), "utf8");
  const adapter = await readFile(new URL("../scripts/research-gateb-adapter-slice07.mjs", import.meta.url), "utf8");
  assert.match(worker, /await import\("sharp"\)/);
  assert.match(worker, /\.raw\(\)\.toBuffer/);
  for (const forbidden of [".png(", "research-canonical-png-encoder", "research-independent-png-oracle", "research-diagnostic-png-oracle"]) {
    assert.equal(worker.includes(forbidden), false, `raw worker must not contain ${forbidden}`);
  }
  assert.match(adapter, /research-canonical-png-encoder-slice07/);
  assert.equal(adapter.includes("research-independent-png-oracle"), false);
  assert.equal(adapter.includes("research-diagnostic-png-oracle"), false);
});

test("validated raw pixels are encoded and independently reopened without running Sharp", () => {
  const result = encodeAndVerifyWorkerPixelsSlice07({
    message: successMessage(),
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    expectedRuntime: RUNTIME,
    expected: EXPECTED,
    verifyOutput: independentVerify,
  });
  assert.deepEqual(result.oracleFacts.chunkTypes, ["IHDR", "sRGB", "IDAT", "IEND"]);
  assert.equal(result.oracleFacts.fileSha256, sha256(result.outputBytes));
  assert.equal(result.encoderRef.id, "ENCODER-CANONICAL-PNG@0.7.0");
});

test("pixel, runtime, resource and oracle drift all fail before publication", () => {
  const cases = [
    [successMessage({ rgba: Buffer.from(RGBA).fill(0) }), "S07_WORKER_PIXEL_IDENTITY_MISMATCH"],
    [successMessage({ runtime: { ...RUNTIME, sharpVersion: "0.35.4" } }), "S07_WORKER_RUNTIME_VERSION_MISMATCH"],
    [successMessage({ resourceUsage: { maxRssKiB: 262_145, userCpuMicros: 0, systemCpuMicros: 0 } }), "S07_WORKER_RESOURCE_LIMIT_EXCEEDED"],
  ];
  for (const [message, code] of cases) {
    assert.throws(() => encodeAndVerifyWorkerPixelsSlice07({
      message,
      attemptId: "attempt.s07.fake.001",
      operation: "normalize",
      expectedRuntime: RUNTIME,
      expected: EXPECTED,
      verifyOutput: independentVerify,
    }), (error) => error instanceof Slice07GateBError && error.code === code);
  }
  assert.throws(() => encodeAndVerifyWorkerPixelsSlice07({
    message: successMessage(),
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    expectedRuntime: RUNTIME,
    expected: EXPECTED,
    verifyOutput: () => { throw new Error("oracle non-pass"); },
  }), (error) => error instanceof Slice07GateBError && error.code === "S07_OUTPUT_ORACLE_REJECTED");
});

for (const [label, script] of [
  ["message then exit", (child) => { child.emit("message", successMessage()); child.emit("exit", 0, null); }],
  ["exit then message", (child) => { child.emit("exit", 0, null); queueMicrotask(() => child.emit("message", successMessage())); }],
]) {
  test(`executor requires both a validated message and clean exit: ${label}`, async () => {
    const { executor } = executorFor(script);
    const result = await execute(executor);
    assert.equal(result.workerObservation.messageReceived, true);
    assert.equal(result.workerObservation.exitConfirmed, true);
    assert.equal(result.workerObservation.exitCode, 0);
    assert.equal(result.workerObservation.signal, null);
  });
}

test("a success message followed by non-zero exit is not publishable", async () => {
  const { executor } = executorFor((child) => {
    child.emit("message", successMessage());
    child.emit("exit", 7, null);
  });
  await assert.rejects(execute(executor), (error) => error.code === "S07_WORKER_EXIT_INVALID" && error.workerObservation.exitConfirmed);
});

test("duplicate messages and missing messages fail closed", async (t) => {
  await t.test("duplicate", async () => {
    const { executor } = executorFor((child) => {
      child.emit("message", successMessage());
      child.emit("message", successMessage());
      child.emit("exit", 0, null);
    });
    await assert.rejects(execute(executor), (error) => error.code === "S07_WORKER_PROTOCOL_INVALID");
  });
  await t.test("missing", async () => {
    const { executor } = executorFor((child) => child.emit("exit", 0, null));
    await assert.rejects(execute(executor), (error) => error.code === "S07_WORKER_MESSAGE_MISSING");
  });
});

test("stable worker failure is preserved only after exit confirmation", async () => {
  const { executor } = executorFor((child) => {
    child.emit("message", {
      protocolVersion: SLICE07_GATEB_POLICY.protocolVersion,
      attemptId: "attempt.s07.fake.001",
      operation: "normalize",
      status: "failed",
      code: "S07_SHARP_NORMALIZE_FAILED",
    });
    child.emit("exit", 0, null);
  });
  await assert.rejects(execute(executor), (error) => error.code === "S07_SHARP_NORMALIZE_FAILED"
    && error.workerObservation.exitConfirmed && error.workerObservation.exitCode === 0);
});

test("timeout requires kill confirmation and never accepts a late success", async () => {
  const { executor, getChild } = executorFor(() => {}, { timeoutMs: 5, killConfirmationMs: 20 });
  await assert.rejects(execute(executor), (error) => error.code === "S07_WORKER_TIMEOUT"
    && error.workerObservation.exitConfirmed && error.workerObservation.timedOut);
  assert.deepEqual(getChild().kills, ["SIGKILL"]);
});

test("unconfirmed termination becomes reconciliation unknown", async () => {
  const { executor } = executorFor(() => {}, { timeoutMs: 5, killConfirmationMs: 5, exitOnKill: false });
  await assert.rejects(execute(executor), (error) => error.code === "S07_WORKER_RECONCILIATION_UNKNOWN"
    && !error.workerObservation.exitConfirmed);
});

test("pre-aborted execution creates no worker", async () => {
  let spawned = 0;
  const adapter = createSlice07RawWorkerExecutor({
    expectedRuntime: RUNTIME,
    verifyOutput: independentVerify,
    spawnWorker: () => { spawned += 1; return new FakeChild(() => {}); },
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(adapter.execute({
    attemptId: "attempt.s07.fake.001",
    operation: "normalize",
    workerRequest: workerRequest(),
    expected: EXPECTED,
    signal: controller.signal,
  }), (error) => error.code === "S07_CANCELLED_BEFORE_WORKER");
  assert.equal(spawned, 0);
});
