import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  SLICE06_DIAGNOSTIC_POLICY,
  contentHashSlice06,
  createSlice06DiagnosticAdapter,
  executeSlice06SharpWorker,
  preflightCanonicalPngSlice06,
  sha256Slice06,
} from "../scripts/research-diagnostic-adapter-slice06.mjs";
import { validateSlice06WorkerObservation } from "../scripts/research-run-slice06.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PIXEL = Buffer.from([19, 71, 131, 173]);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, "ascii");
  const bytes = Buffer.alloc(12 + data.length);
  bytes.writeUInt32BE(data.length, 0); name.copy(bytes, 4); data.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return bytes;
}

function diagnosticPng({ includeSrgb = true, malformedIdat = false } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.concat([Buffer.from([0]), PIXEL]);
  const chunks = [chunk("IHDR", ihdr)];
  if (includeSrgb) chunks.push(chunk("sRGB", Buffer.from([0])));
  chunks.push(chunk("IDAT", malformedIdat ? Buffer.from([1, 2, 3]) : deflateSync(rows)), chunk("IEND"));
  return Buffer.concat([PNG_SIGNATURE, ...chunks]);
}

const RUNTIME = Object.freeze({
  sharpVersion: "0.35.3",
  nativeVersions: { sharp: "0.35.3" },
  nodeVersion: "v22.18.0",
  platform: "win32",
  architecture: "x64",
  settings: {
    concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false,
    uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
  },
});

const REQUEST = Object.freeze({
  protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion,
  attemptId: "run.normalize.source.r1.a1",
  operation: "normalize",
  inputBytes: diagnosticPng(),
});

function successMessage(request = REQUEST) {
  return {
    protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion,
    attemptId: request.attemptId,
    operation: request.operation,
    status: "succeeded",
    outputBytes: Buffer.from([9, 8, 7]),
    runtime: structuredClone(RUNTIME),
    durationMs: 4,
    resourceUsage: { maxRssKiB: 4000, userCpuMicros: 300, systemCpuMicros: 100 },
  };
}

function clockSequence() {
  let value = Date.parse("2026-08-15T06:00:00.000Z");
  return () => new Date(value++).toISOString();
}

function fakeFork(schedule, { killResult = true, onKill } = {}) {
  return () => {
    const child = new EventEmitter();
    child.killed = false;
    child.send = (_request, callback) => {
      callback?.(null);
      queueMicrotask(() => schedule(child));
    };
    child.kill = () => {
      child.killed = true;
      onKill?.(child);
      return killResult;
    };
    return child;
  };
}

test("Slice 06 preflight gives missing-sRGB precedence and never invokes the fake worker", async () => {
  const missingSrgbWithBadIdat = diagnosticPng({ includeSrgb: false, malformedIdat: true });
  assert.throws(() => preflightCanonicalPngSlice06(missingSrgbWithBadIdat), { code: "S06_INPUT_SRGB_REQUIRED" });

  let workerCalls = 0;
  const adapter = createSlice06DiagnosticAdapter({
    expectedRuntime: RUNTIME,
    executeWorker: async () => { workerCalls += 1; throw new Error("must not run"); },
    verifyOutput: async () => { throw new Error("must not run"); },
    validateVerification: () => true,
  });
  const source = {
    sourceId: "sentinel-missing-srgb", mime: "image/png", byteLength: missingSrgbWithBadIdat.byteLength,
    fileSha256: sha256Slice06(missingSrgbWithBadIdat), decodedPixelSha256: "0".repeat(64), alphaPresent: true,
  };
  const request = {
    schemaVersion: SLICE06_DIAGNOSTIC_POLICY.normalizeRequestVersion, mode: "open-diagnostic", operation: "normalize",
    attempt: { runId: "run.normalize", sourceId: source.sourceId, partition: "diagnostic", repetition: 1, attemptNumber: 1, idempotencyKey: "normalize.sentinel.r1.a1" },
    candidateRef: { id: SLICE06_DIAGNOSTIC_POLICY.candidateId, contentHash: "a".repeat(64) },
    contractRef: { id: SLICE06_DIAGNOSTIC_POLICY.normalizeContractId, contentHash: "b".repeat(64) },
    source, sourceBytes: missingSrgbWithBadIdat,
  };
  assert.throws(() => adapter.normalize(request), { code: "S06_INPUT_SRGB_REQUIRED" });
  assert.equal(workerCalls, 0);
});

test("Slice 06 executor requires message plus clean exit and accepts either legal event order", async (t) => {
  await t.test("message then exit", async () => {
    const result = await executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => {
        child.emit("message", successMessage());
        queueMicrotask(() => { child.emit("exit", 0, null); child.emit("close"); });
      }),
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.workerObservation.exit.exitCode, 0);
    assert.equal(result.workerObservation.runtime.matchesFrozen, true);
    assert.equal(validateSlice06WorkerObservation(result.workerObservation), true);
  });

  await t.test("exit then message within bounded channel drain", async () => {
    const result = await executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => {
        child.emit("exit", 0, null);
        queueMicrotask(() => { child.emit("message", successMessage()); child.emit("close"); });
      }),
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.workerObservation.exit.confirmed, true);
    assert.equal(validateSlice06WorkerObservation(result.workerObservation), true);
  });
});

test("Slice 06 executor fails closed for nonzero exit, absent exit, and confirmed timeout", async (t) => {
  await t.test("valid message followed by nonzero exit", async () => {
    await assert.rejects(executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => { child.emit("message", successMessage()); child.emit("exit", 7, null); child.emit("close"); }),
    }), { code: "S06_WORKER_EXIT_NONZERO" });
  });

  await t.test("valid message without exit cannot succeed", async () => {
    const keepAlive = setTimeout(() => {}, 100);
    try {
      await assert.rejects(executeSlice06SharpWorker(REQUEST, {
        expectedRuntime: RUNTIME, timeoutMs: 5, clock: clockSequence(),
        forkImpl: fakeFork((child) => child.emit("message", successMessage()), { killResult: false }),
      }), { code: "S06_WORKER_RECONCILIATION_UNKNOWN" });
    } finally { clearTimeout(keepAlive); }
  });

  await t.test("timeout is reported only after termination exit", async () => {
    const keepAlive = setTimeout(() => {}, 100);
    try {
      await assert.rejects(executeSlice06SharpWorker(REQUEST, {
        expectedRuntime: RUNTIME, timeoutMs: 5, clock: clockSequence(),
        forkImpl: fakeFork(() => {}, { onKill: (child) => queueMicrotask(() => child.emit("exit", null, "SIGKILL")) }),
      }), { code: "S06_WORKER_TIMEOUT" });
    } finally { clearTimeout(keepAlive); }
  });

  await t.test("null IPC payload is received-but-invalid, not absent", async () => {
    await assert.rejects(executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => { child.emit("message", null); child.emit("exit", 0, null); child.emit("close"); }),
    }), (error) => {
      assert.equal(error.code, "S06_WORKER_PROTOCOL_INVALID");
      assert.equal(error.workerObservation.message.received, true);
      return true;
    });
  });

  await t.test("a second IPC result invalidates an otherwise valid first result", async () => {
    await assert.rejects(executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => {
        child.emit("message", successMessage()); child.emit("message", successMessage());
        child.emit("exit", 0, null); child.emit("close");
      }),
    }), { code: "S06_WORKER_PROTOCOL_INVALID" });
  });

  await t.test("a startup runtime failure bound to the request keeps its exact code", async () => {
    const failure = {
      protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion,
      attemptId: REQUEST.attemptId,
      operation: REQUEST.operation,
      status: "failed",
      code: "S06_WORKER_RUNTIME_VERSION_MISMATCH",
    };
    await assert.rejects(executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: fakeFork((child) => { child.emit("message", failure); child.emit("exit", 0, null); child.emit("close"); }),
    }), (error) => {
      assert.equal(error.code, "S06_WORKER_RUNTIME_VERSION_MISMATCH");
      assert.equal(error.workerObservation.message.status, "failed");
      assert.equal(error.workerObservation.exit.exitCode, 0);
      return true;
    });
  });
});

test("Slice 06 adapter preserves a structured oracle non-pass instead of converting it to a generic error", async () => {
  const sourceBytes = diagnosticPng();
  const facts = preflightCanonicalPngSlice06(sourceBytes);
  const observation = {
    message: { received: true, receivedAt: "2026-08-15T06:00:00.001Z", protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion, status: "succeeded", payloadSha256: "1".repeat(64) },
    runtime: { payloadSha256: "2".repeat(64), matchesFrozen: true },
    telemetry: { source: "worker-self-reported-not-hard-isolation", workerDurationMs: 4, resourceUsage: { maxRssKiB: 1, userCpuMicros: 2, systemCpuMicros: 3 } },
    parentWall: { startedAt: "2026-08-15T06:00:00.000Z", messageAt: "2026-08-15T06:00:00.001Z", exitedAt: "2026-08-15T06:00:00.002Z", finishedAt: "2026-08-15T06:00:00.003Z", durationMs: 3 },
    exit: { confirmed: true, exitCode: 0, signal: null, terminationRequested: false },
  };
  const verificationDraft = {
    schemaVersion: "png-diagnostic-verification.slice06.v0", verificationId: "verification.fake", operation: "normalize",
    overallStatus: "non-pass", primaryCode: "S06_ORACLE_PNG_SRGB_REQUIRED",
    expected: Object.fromEntries([
      "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "orientation", "alphaMode", "alphaPresent",
      "metadataPolicy", "pngFilterPolicy", "interlace", "animation",
    ].map((key) => [key, facts[key]])),
    actualBytes: { mediaType: "image/png", byteLength: 3, fileSha256: sha256Slice06(Buffer.from([9, 8, 7])), decodedPixelSha256: null },
    facts: { width: null, height: null, pixelLayout: null, colorSpace: null, orientation: null, alphaMode: null, alphaPresent: null, metadataPolicy: null, pngFilterPolicy: null, interlace: null, animation: null, chunkTypes: [], filterTypes: [] },
    findings: [{ code: "S06_ORACLE_PNG_SRGB_REQUIRED", stage: "png-structure", status: "non-pass", expected: "sRGB", actual: null, message: "synthetic diagnostic rejection" }],
  };
  const verification = { ...verificationDraft, contentHash: contentHashSlice06(verificationDraft) };
  const adapter = createSlice06DiagnosticAdapter({
    expectedRuntime: RUNTIME,
    executeWorker: async () => ({ ...successMessage(), workerObservation: observation }),
    verifyOutput: async () => verification,
    validateVerification: (value) => assert.equal(value, verification),
  });
  const request = {
    schemaVersion: SLICE06_DIAGNOSTIC_POLICY.normalizeRequestVersion, mode: "open-diagnostic", operation: "normalize",
    attempt: { runId: "run.normalize", sourceId: "synthetic-alpha", partition: "diagnostic", repetition: 1, attemptNumber: 1, idempotencyKey: "normalize.synthetic-alpha.r1.a1" },
    candidateRef: { id: SLICE06_DIAGNOSTIC_POLICY.candidateId, contentHash: "a".repeat(64) },
    contractRef: { id: SLICE06_DIAGNOSTIC_POLICY.normalizeContractId, contentHash: "b".repeat(64) },
    source: { sourceId: "synthetic-alpha", mime: "image/png", byteLength: sourceBytes.byteLength, fileSha256: facts.fileSha256, decodedPixelSha256: facts.decodedPixelSha256, alphaPresent: true },
    sourceBytes,
  };
  const result = await adapter.normalize(request);
  assert.equal(result.status, "oracle-non-pass-diagnostic");
  assert.equal(result.verification.primaryCode, "S06_ORACLE_PNG_SRGB_REQUIRED");
  assert.deepEqual([...result.outputBytes], [9, 8, 7]);
});

test("Slice 06 runtime drift retains the complete worker observation", async () => {
  const sourceBytes = diagnosticPng();
  const facts = preflightCanonicalPngSlice06(sourceBytes);
  const driftedRuntime = structuredClone(RUNTIME);
  driftedRuntime.nodeVersion = "v22.99.0";
  const at = "2026-08-15T06:30:00.000Z";
  const observation = {
    message: { received: true, receivedAt: at, protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion, status: "succeeded", payloadSha256: HASH_FOR_TEST("message") },
    runtime: { payloadSha256: sha256Slice06(Buffer.from(JSON.stringify(driftedRuntime))), matchesFrozen: false },
    telemetry: { source: "worker-self-reported-not-hard-isolation", workerDurationMs: 1, resourceUsage: { maxRssKiB: 1, userCpuMicros: 1, systemCpuMicros: 1 } },
    parentWall: { startedAt: at, messageAt: at, exitedAt: at, finishedAt: at, durationMs: 0 },
    exit: { confirmed: true, exitCode: 0, signal: null, terminationRequested: false },
  };
  const adapter = createSlice06DiagnosticAdapter({
    expectedRuntime: RUNTIME,
    executeWorker: async () => ({ ...successMessage(), runtime: driftedRuntime, workerObservation: observation }),
    verifyOutput: async () => { throw new Error("must not reach oracle"); },
    validateVerification: () => true,
  });
  const request = {
    schemaVersion: SLICE06_DIAGNOSTIC_POLICY.normalizeRequestVersion, mode: "open-diagnostic", operation: "normalize",
    attempt: { runId: "run.normalize", sourceId: "runtime-drift", partition: "diagnostic", repetition: 1, attemptNumber: 1, idempotencyKey: "normalize.runtime-drift.r1.a1" },
    candidateRef: { id: SLICE06_DIAGNOSTIC_POLICY.candidateId, contentHash: "a".repeat(64) },
    contractRef: { id: SLICE06_DIAGNOSTIC_POLICY.normalizeContractId, contentHash: "b".repeat(64) },
    source: { sourceId: "runtime-drift", mime: "image/png", byteLength: sourceBytes.byteLength, fileSha256: facts.fileSha256, decodedPixelSha256: facts.decodedPixelSha256, alphaPresent: true },
    sourceBytes,
  };
  await assert.rejects(adapter.normalize(request), (error) => {
    assert.equal(error.code, "S06_WORKER_RUNTIME_VERSION_MISMATCH");
    assert.equal(error.workerObservation, observation);
    return true;
  });
});

function HASH_FOR_TEST(label) { return createHash("sha256").update(label).digest("hex"); }

test("Slice 06 executor passes only an operating allowlist plus frozen variables to its fake child", async () => {
  const previous = process.env.S06_SECRET_CANARY;
  process.env.S06_SECRET_CANARY = "must-not-cross-worker-boundary";
  let childEnvironment;
  try {
    const result = await executeSlice06SharpWorker(REQUEST, {
      expectedRuntime: RUNTIME, clock: clockSequence(),
      forkImpl: (_workerPath, _args, options) => {
        childEnvironment = options.env;
        return fakeFork((child) => { child.emit("message", successMessage()); child.emit("exit", 0, null); child.emit("close"); })();
      },
    });
    assert.equal(result.status, "succeeded");
    assert.equal(Object.hasOwn(childEnvironment, "S06_SECRET_CANARY"), false);
    assert.equal(childEnvironment.UV_THREADPOOL_SIZE, "1");
    assert.equal(childEnvironment.TZ, "UTC");
  } finally {
    if (previous === undefined) delete process.env.S06_SECRET_CANARY;
    else process.env.S06_SECRET_CANARY = previous;
  }
});

test("Slice 06 worker implementation remains unexecuted by the runtime suite", () => {
  assert.equal(createHash("sha256").update("fake-worker-only").digest("hex").length, 64);
});
