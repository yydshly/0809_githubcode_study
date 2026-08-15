import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const WORKER_PATH = fileURLToPath(new URL("./research-sharp-worker-slice06.mjs", import.meta.url));
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SUCCESS_KEYS = Object.freeze([
  "protocolVersion", "attemptId", "operation", "status", "outputBytes", "runtime", "durationMs", "resourceUsage",
]);
const FAILURE_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "status", "code"]);
const RUNTIME_KEYS = Object.freeze([
  "sharpVersion", "nativeVersions", "nodeVersion", "platform", "architecture", "settings",
]);
const RUNTIME_SETTING_KEYS = Object.freeze([
  "concurrency", "cacheMemoryMaxMiB", "cacheFilesMax", "cacheItemsMax", "simd",
  "uvThreadpoolSize", "vipsConcurrency", "ignoreGlobalLibvips",
]);
const RESOURCE_KEYS = Object.freeze(["maxRssKiB", "userCpuMicros", "systemCpuMicros"]);
const ATTEMPT_KEYS = Object.freeze([
  "runId", "sourceId", "partition", "repetition", "attemptNumber", "idempotencyKey",
]);
const REF_KEYS = Object.freeze(["id", "contentHash"]);
const EXPECTED_KEYS = Object.freeze([
  "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "orientation",
  "alphaMode", "alphaPresent", "metadataPolicy", "pngFilterPolicy", "interlace", "animation",
]);
const NORMALIZE_KEYS = Object.freeze([
  "schemaVersion", "mode", "operation", "attempt", "candidateRef", "contractRef", "source", "sourceBytes",
]);
const NORMALIZE_SOURCE_KEYS = Object.freeze([
  "sourceId", "mime", "byteLength", "fileSha256", "decodedPixelSha256", "alphaPresent",
]);
const EXPORT_KEYS = Object.freeze([
  "schemaVersion", "mode", "operation", "attempt", "candidateRef", "contractRef",
  "normalizedArtifact", "normalizedBytes", "rgba",
]);
const EXPORT_PARENT_KEYS = Object.freeze([
  "schemaVersion", "artifactId", "contentHash", "fileSha256", "decodedPixelSha256",
  "width", "height", "alphaPresent", "image",
]);
const IMAGE_KEYS = Object.freeze([
  "pixelLayout", "colorSpace", "orientation", "alphaMode", "metadataPolicy", "pngFilterPolicy", "interlace", "animation",
]);

export const SLICE06_DIAGNOSTIC_POLICY = Object.freeze({
  protocolVersion: "sharp-worker.slice06.v0",
  normalizeRequestVersion: "diagnostic-normalize-request.slice06.v0",
  exportRequestVersion: "diagnostic-export-request.slice06.v0",
  candidateId: "REG-NORM-SHARP@0.6.0",
  normalizeContractId: "CC-CAP02-NORMALIZE-PNG@0.6.0",
  exportContractId: "CC-CAP02-EXPORT-PNG@0.6.0",
  mode: "open-diagnostic",
  partition: "diagnostic",
  maxInputBytes: 1024 * 1024,
  maxOutputBytes: 1024 * 1024,
  maxDimension: 256,
  maxPixels: 256 * 256,
  maxRawBytes: 256 * 256 * 4,
  timeoutMs: 10_000,
  killConfirmationMs: 1_000,
  messageDrainMs: 100,
  workerMaxOldSpaceMiB: 128,
  allowedPngChunks: Object.freeze(["IHDR", "sRGB", "IDAT", "IEND"]),
});

export class Slice06DiagnosticError extends Error {
  constructor(code, message, stage = "policy", { cause, workerObservation = null } = {}) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "Slice06DiagnosticError";
    this.code = code;
    this.stage = stage;
    this.workerObservation = workerObservation;
  }
}

function reject(code, message, stage = "policy", options = {}) {
  throw new Slice06DiagnosticError(code, message, stage, options);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactObject(value, keys, code, label) {
  if (!isPlainObject(value)) reject(code, `${label} must be a plain object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    reject(code, `${label} must contain exactly ${keys.join(", ")}`);
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object" && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  if (value instanceof Uint8Array) return { byteLength: value.byteLength, sha256: sha256Slice06(value) };
  return value;
}

export function stableStringifySlice06(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function sha256Slice06(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHashSlice06(record) {
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice06(Buffer.from(stableStringifySlice06(copy), "utf8"));
}

function assertSha256(value, code, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) reject(code, `${label} must be a lowercase SHA-256`);
}

function assertSafeId(value, code, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u.test(value) || value.includes("..")) {
    reject(code, `${label} is outside the closed identifier profile`);
  }
}

function assertRef(value, id, code, label) {
  exactObject(value, REF_KEYS, code, label);
  if (value.id !== id) reject(code, `${label}.id must be ${id}`);
  assertSha256(value.contentHash, code, `${label}.contentHash`);
}

function assertAttempt(value, code) {
  exactObject(value, ATTEMPT_KEYS, code, "attempt");
  for (const key of ["runId", "sourceId", "idempotencyKey"]) assertSafeId(value[key], code, `attempt.${key}`);
  if (value.partition !== SLICE06_DIAGNOSTIC_POLICY.partition || ![1, 2, 3].includes(value.repetition)
    || value.attemptNumber !== 1) {
    reject(code, "attempt must be one of three diagnostic repetitions with attemptNumber=1");
  }
}

function asBuffer(value, maximumBytes, code, label) {
  if (!(value instanceof Uint8Array) || value.byteLength < 1 || value.byteLength > maximumBytes) {
    reject(code, `${label} must be bounded non-empty bytes`);
  }
  return Buffer.isBuffer(value) ? value : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Closed candidate-input gate. Missing sRGB is deliberately classified before generic IDAT structure errors. */
export function preflightCanonicalPngSlice06(input) {
  const bytes = asBuffer(input, SLICE06_DIAGNOSTIC_POLICY.maxInputBytes, "S06_INPUT_BYTES_INVALID", "input");
  if (bytes.length < 33) reject("S06_INPUT_PNG_TRUNCATED", "input is too short for PNG");
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) reject("S06_INPUT_SIGNATURE_MISMATCH", "PNG signature is missing");
  let offset = 8;
  let width;
  let height;
  let sawHeader = false;
  let sawSrgb = false;
  let sawData = false;
  let dataEnded = false;
  let sawEnd = false;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) reject("S06_INPUT_CHUNK_TRUNCATED", `PNG ${type || "unknown"} is truncated`);
    if (bytes.readUInt32BE(end) !== crc32(bytes.subarray(offset + 4, end))) {
      reject("S06_INPUT_CRC_MISMATCH", `PNG ${type} CRC differs`);
    }
    if (!SLICE06_DIAGNOSTIC_POLICY.allowedPngChunks.includes(type)) {
      reject("S06_INPUT_CHUNK_PROFILE_INVALID", `PNG ${type} is outside the canonical profile`);
    }
    if (type === "IHDR") {
      if (sawHeader || offset !== 8 || length !== 13) reject("S06_INPUT_CHUNK_PROFILE_INVALID", "PNG requires one leading IHDR");
      sawHeader = true;
      width = bytes.readUInt32BE(start);
      height = bytes.readUInt32BE(start + 4);
      if (width < 1 || height < 1 || width > 256 || height > 256 || width * height > 256 * 256) {
        reject("S06_INPUT_DIMENSION_LIMIT_EXCEEDED", "PNG dimensions exceed the diagnostic profile");
      }
      if (bytes[start + 8] !== 8 || bytes[start + 9] !== 6 || bytes[start + 10] !== 0
        || bytes[start + 11] !== 0 || bytes[start + 12] !== 0) {
        reject("S06_INPUT_PIXEL_PROFILE_INVALID", "PNG must be non-interlaced RGBA8");
      }
    } else if (type === "sRGB") {
      if (!sawHeader || sawSrgb || sawData || length !== 1 || bytes[start] > 3) {
        reject("S06_INPUT_SRGB_REQUIRED", "PNG requires one valid sRGB chunk before IDAT");
      }
      sawSrgb = true;
    } else if (type === "IDAT") {
      if (!sawSrgb) reject("S06_INPUT_SRGB_REQUIRED", "PNG requires sRGB before IDAT");
      if (!sawHeader || dataEnded || length === 0) reject("S06_INPUT_CHUNK_PROFILE_INVALID", "PNG IDAT placement is invalid");
      sawData = true;
      compressed.push(bytes.subarray(start, end));
    } else if (type === "IEND") {
      if (!sawData || sawEnd || length !== 0) reject("S06_INPUT_CHUNK_PROFILE_INVALID", "PNG IEND placement is invalid");
      sawEnd = true;
    }
    offset = end + 4;
    if (sawData && type !== "IDAT" && type !== "IEND") dataEnded = true;
    if (type === "IEND") break;
  }
  if (!sawSrgb) reject("S06_INPUT_SRGB_REQUIRED", "PNG requires one valid sRGB chunk");
  if (!sawHeader || !sawData || !sawEnd || offset !== bytes.length) {
    reject("S06_INPUT_CHUNK_PROFILE_INVALID", "PNG must end after canonical IHDR/sRGB/IDAT/IEND content");
  }
  const stride = width * 4;
  const expectedLength = (stride + 1) * height;
  let inflated;
  let consumed;
  try {
    const result = inflateSync(Buffer.concat(compressed), { info: true, maxOutputLength: expectedLength });
    inflated = result.buffer;
    consumed = result.engine.bytesWritten;
  } catch (cause) {
    reject("S06_INPUT_DECODE_FAILED", "PNG zlib stream cannot be decoded", "policy", { cause });
  }
  if (inflated.length !== expectedLength || consumed !== Buffer.concat(compressed).length) {
    reject("S06_INPUT_DECODE_LENGTH_MISMATCH", "PNG decoded length differs from dimensions");
  }
  const pixels = createHash("sha256");
  let alphaPresent = false;
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    if (inflated[row] !== 0) reject("S06_INPUT_FILTER_INVALID", "PNG scanlines must use filter 0");
    const rgba = inflated.subarray(row + 1, row + 1 + stride);
    pixels.update(rgba);
    for (let index = 3; index < rgba.length; index += 4) if (rgba[index] < 255) alphaPresent = true;
  }
  return Object.freeze({
    decodedPixelSha256: pixels.digest("hex"), width, height, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB",
    orientation: 1, alphaMode: "straight-unpremultiplied", alphaPresent,
    metadataPolicy: "strip-all-except-color-contract", pngFilterPolicy: "filter-0-only",
    interlace: "forbidden", animation: "forbidden", fileSha256: sha256Slice06(bytes), byteLength: bytes.length,
  });
}

function defaultEnvironment() {
  const inherited = {};
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "PATHEXT", "ComSpec", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"]) {
    if (typeof process.env[key] === "string") inherited[key] = process.env[key];
  }
  return {
    ...inherited,
    UV_THREADPOOL_SIZE: "1",
    VIPS_CONCURRENCY: "1",
    SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
    TZ: "UTC",
    LANG: "C",
    LC_ALL: "C",
  };
}

function validateResourceUsage(value, code = "S06_WORKER_PROTOCOL_INVALID") {
  exactObject(value, RESOURCE_KEYS, code, "resourceUsage");
  for (const key of RESOURCE_KEYS) {
    if (!Number.isInteger(value[key]) || value[key] < 0) reject(code, `resourceUsage.${key} must be a non-negative integer`, "worker");
  }
  return value;
}

export function validateWorkerRuntimeSlice06(value, expected = undefined) {
  const code = "S06_WORKER_RUNTIME_VERSION_MISMATCH";
  exactObject(value, RUNTIME_KEYS, code, "runtime");
  exactObject(value.settings, RUNTIME_SETTING_KEYS, code, "runtime.settings");
  if (value.sharpVersion !== "0.35.3" || value.platform !== "win32" || value.architecture !== "x64"
    || typeof value.nodeVersion !== "string" || !isPlainObject(value.nativeVersions)
    || value.nativeVersions.sharp !== "0.35.3") reject(code, "worker runtime is outside the frozen family", "worker");
  const settings = value.settings;
  if (settings.concurrency !== 1 || settings.cacheMemoryMaxMiB !== 0 || settings.cacheFilesMax !== 0
    || settings.cacheItemsMax !== 0 || settings.simd !== false || settings.uvThreadpoolSize !== "1"
    || settings.vipsConcurrency !== "1" || settings.ignoreGlobalLibvips !== "1") {
    reject(code, "worker settings differ from the closed execution profile", "worker");
  }
  if (expected !== undefined && stableStringifySlice06(value) !== stableStringifySlice06(expected)) {
    reject(code, "worker runtime payload differs from the fresh frozen attestation", "worker");
  }
  return true;
}

function validSuccessMessage(message, request) {
  try {
    exactObject(message, SUCCESS_KEYS, "S06_WORKER_PROTOCOL_INVALID", "workerMessage");
    if (message.protocolVersion !== SLICE06_DIAGNOSTIC_POLICY.protocolVersion || message.attemptId !== request.attemptId
      || message.operation !== request.operation || message.status !== "succeeded") return false;
    asBuffer(message.outputBytes, SLICE06_DIAGNOSTIC_POLICY.maxOutputBytes, "S06_WORKER_PROTOCOL_INVALID", "outputBytes");
    validateWorkerRuntimeSlice06(message.runtime);
    validateResourceUsage(message.resourceUsage);
    return Number.isInteger(message.durationMs) && message.durationMs >= 0 && message.durationMs <= SLICE06_DIAGNOSTIC_POLICY.timeoutMs;
  } catch {
    return false;
  }
}

function validFailureMessage(message, request) {
  const allowed = new Set([
    "S06_WORKER_PROTOCOL_INVALID", "S06_WORKER_INPUT_INVALID", "S06_WORKER_RUNTIME_VERSION_MISMATCH",
    "S06_SHARP_NORMALIZE_FAILED", "S06_SHARP_EXPORT_FAILED", "S06_WORKER_OUTPUT_INVALID",
  ]);
  try {
    exactObject(message, FAILURE_KEYS, "S06_WORKER_PROTOCOL_INVALID", "workerMessage");
  } catch {
    return false;
  }
  return message.protocolVersion === SLICE06_DIAGNOSTIC_POLICY.protocolVersion && message.attemptId === request.attemptId
    && message.operation === request.operation && message.status === "failed" && allowed.has(message.code);
}

function wallDuration(startedAt, finishedAt) {
  return Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
}

/**
 * Execute exactly one child request. Success is impossible until both a valid
 * IPC message and a clean process exit have been observed.
 */
export function executeSlice06SharpWorker(request, {
  signal,
  timeoutMs = SLICE06_DIAGNOSTIC_POLICY.timeoutMs,
  forkImpl = fork,
  workerPath = WORKER_PATH,
  expectedRuntime,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > SLICE06_DIAGNOSTIC_POLICY.timeoutMs) {
    return Promise.reject(new Slice06DiagnosticError("S06_WORKER_TIMEOUT_POLICY_INVALID", "invalid timeout", "runner"));
  }
  if (signal?.aborted) return Promise.reject(new Slice06DiagnosticError("S06_WORKER_CANCELLED", "cancelled before spawn", "runner"));
  return new Promise((resolve, rejectPromise) => {
    const startedAt = clock();
    let child;
    let timer;
    let killTimer;
    let messageDrainTimer;
    let message = null;
    let messageSeen = false;
    let messageCount = 0;
    let messageAt = null;
    let messageValid = false;
    let exitSeen = false;
    let exitCode = null;
    let exitSignal = null;
    let exitedAt = null;
    let terminationRequested = false;
    let pendingTermination = null;
    let drainComplete = false;
    let channelClosed = false;
    let settled = false;

    const observation = (finishedAt = clock()) => {
      const runtimePayload = messageValid && message?.status === "succeeded" ? message.runtime : null;
      const runtimeMatches = runtimePayload && expectedRuntime !== undefined
        ? stableStringifySlice06(runtimePayload) === stableStringifySlice06(expectedRuntime)
        : runtimePayload ? null : null;
      return {
        message: {
          received: messageSeen,
          receivedAt: messageAt,
          protocolVersion: isPlainObject(message) && typeof message.protocolVersion === "string" ? message.protocolVersion : null,
          status: isPlainObject(message) && new Set(["succeeded", "failed"]).has(message.status) ? message.status : null,
          payloadSha256: messageSeen ? sha256Slice06(Buffer.from(stableStringifySlice06(
            messageCount === 1 ? message : { firstMessage: message, messageCount },
          ), "utf8")) : null,
        },
        runtime: {
          payloadSha256: runtimePayload ? sha256Slice06(Buffer.from(stableStringifySlice06(runtimePayload), "utf8")) : null,
          matchesFrozen: runtimeMatches,
        },
        telemetry: {
          source: messageValid && message?.status === "succeeded" ? "worker-self-reported-not-hard-isolation" : null,
          workerDurationMs: messageValid && message?.status === "succeeded" ? message.durationMs : null,
          resourceUsage: messageValid && message?.status === "succeeded" ? structuredClone(message.resourceUsage) : null,
        },
        parentWall: {
          startedAt,
          messageAt,
          exitedAt,
          finishedAt,
          durationMs: wallDuration(startedAt, finishedAt),
        },
        exit: { confirmed: exitSeen, exitCode, signal: exitSignal, terminationRequested },
      };
    };
    const settle = (action, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (messageDrainTimer) clearTimeout(messageDrainTimer);
      signal?.removeEventListener("abort", onAbort);
      action(value);
    };
    const failAfterExit = (code, text, stage = "worker") => {
      const workerObservation = observation();
      settle(rejectPromise, new Slice06DiagnosticError(code, text, stage, { workerObservation }));
    };
    const maybeFinish = () => {
      if (!exitSeen || !drainComplete || !messageSeen || settled) return;
      if (!messageValid) {
        failAfterExit("S06_WORKER_PROTOCOL_INVALID", "worker IPC message is outside the closed protocol");
      } else if (pendingTermination) {
        failAfterExit(pendingTermination.code, pendingTermination.message, "runner");
      } else if (exitCode !== 0 || exitSignal !== null) {
        failAfterExit("S06_WORKER_EXIT_NONZERO", "worker did not exit cleanly");
      } else if (message.status === "failed") {
        failAfterExit(message.code, "worker returned a fail-closed result");
      } else {
        const workerObservation = observation();
        settle(resolve, Object.freeze({ ...message, workerObservation }));
      }
    };
    const requestTermination = (code, text) => {
      if (settled || pendingTermination) return;
      pendingTermination = { code, message: text };
      terminationRequested = true;
      let killed = false;
      try { killed = Boolean(child && !child.killed && child.kill("SIGKILL")); } catch { killed = false; }
      if (!killed) {
        failAfterExit("S06_WORKER_RECONCILIATION_UNKNOWN", "termination could not be requested or confirmed", "runner");
        return;
      }
      killTimer = setTimeout(() => {
        failAfterExit("S06_WORKER_RECONCILIATION_UNKNOWN", "termination exit was not confirmed", "runner");
      }, SLICE06_DIAGNOSTIC_POLICY.killConfirmationMs);
      killTimer.unref?.();
    };
    const onAbort = () => requestTermination("S06_WORKER_CANCELLED", "worker cancellation and exit were confirmed");

    try {
      child = forkImpl(workerPath, [], {
        env: defaultEnvironment(),
        execArgv: [`--max-old-space-size=${SLICE06_DIAGNOSTIC_POLICY.workerMaxOldSpaceMiB}`],
        serialization: "advanced",
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        windowsHide: true,
      });
    } catch (cause) {
      settle(rejectPromise, new Slice06DiagnosticError("S06_WORKER_SPAWN_FAILED", "worker could not start", "runner", { cause }));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => requestTermination("S06_WORKER_TIMEOUT", "worker deadline and exit were confirmed"), timeoutMs);
    timer.unref?.();
    child.once("error", (cause) => {
      settle(rejectPromise, new Slice06DiagnosticError("S06_WORKER_PROCESS_ERROR", "worker process error", "runner", {
        cause,
        workerObservation: observation(),
      }));
    });
    child.on("message", (value) => {
      if (settled) return;
      messageCount += 1;
      if (!messageSeen) {
        messageSeen = true;
        message = value;
        messageAt = clock();
        messageValid = validSuccessMessage(value, request) || validFailureMessage(value, request);
      } else {
        messageValid = false;
      }
      maybeFinish();
    });
    child.once("exit", (code, signalName) => {
      exitSeen = true;
      exitCode = code;
      exitSignal = signalName;
      exitedAt = clock();
      if (channelClosed) {
        drainComplete = true;
        if (!messageSeen && pendingTermination) failAfterExit(pendingTermination.code, pendingTermination.message, "runner");
        else if (!messageSeen) failAfterExit("S06_WORKER_EXITED_WITHOUT_RESULT", "worker IPC channel closed without a result");
        else maybeFinish();
        return;
      }
      if (!messageSeen && pendingTermination) {
        failAfterExit(pendingTermination.code, pendingTermination.message, "runner");
        return;
      }
      if (!messageSeen) {
        // Node normally delivers an IPC message before exit, but the parent
        // must not rely on one microtask of event ordering. Drain the channel
        // until disconnect/close, with a short bounded fallback.
        messageDrainTimer = setTimeout(() => {
          if (settled) return;
          drainComplete = true;
          if (!messageSeen) failAfterExit("S06_WORKER_EXITED_WITHOUT_RESULT", "worker exited without IPC result");
          else maybeFinish();
        }, SLICE06_DIAGNOSTIC_POLICY.messageDrainMs);
        messageDrainTimer.unref?.();
      } else {
        messageDrainTimer = setTimeout(() => {
          if (settled) return;
          drainComplete = true;
          maybeFinish();
        }, SLICE06_DIAGNOSTIC_POLICY.messageDrainMs);
        messageDrainTimer.unref?.();
      }
    });
    const finishDrain = () => {
      channelClosed = true;
      if (!exitSeen || settled || drainComplete) return;
      drainComplete = true;
      if (!messageSeen) failAfterExit("S06_WORKER_EXITED_WITHOUT_RESULT", "worker IPC channel closed without a result");
      else maybeFinish();
    };
    child.once("disconnect", finishDrain);
    child.once("close", finishDrain);
    try {
      child.send(request, (cause) => {
        if (cause) requestTermination("S06_WORKER_SEND_FAILED", "worker send failed and exit was confirmed");
      });
    } catch {
      requestTermination("S06_WORKER_SEND_FAILED", "worker send failed and exit was confirmed");
    }
  });
}

function expectedFromFacts(facts) {
  return Object.freeze(Object.fromEntries(EXPECTED_KEYS.map((key) => [key, facts[key]])));
}

function validateVerification(value, operation) {
  const keys = [
    "schemaVersion", "verificationId", "operation", "overallStatus", "primaryCode", "expected",
    "actualBytes", "facts", "findings", "contentHash",
  ];
  exactObject(value, keys, "S06_ORACLE_RESULT_INVALID", "verification");
  if (value.schemaVersion !== "png-diagnostic-verification.slice06.v0" || value.operation !== operation
    || !new Set(["pass", "non-pass"]).has(value.overallStatus)
    || (value.overallStatus === "pass") !== (value.primaryCode === null)
    || !Array.isArray(value.findings)) reject("S06_ORACLE_RESULT_INVALID", "verification outcome is inconsistent", "oracle");
  assertSha256(value.contentHash, "S06_ORACLE_RESULT_INVALID", "verification.contentHash");
  return value;
}

function validateNormalizeRequest(request) {
  const code = "S06_NORMALIZE_REQUEST_INVALID";
  exactObject(request, NORMALIZE_KEYS, code, "normalizeRequest");
  if (request.schemaVersion !== SLICE06_DIAGNOSTIC_POLICY.normalizeRequestVersion || request.mode !== "open-diagnostic"
    || request.operation !== "normalize") reject(code, "normalize request type is invalid");
  assertAttempt(request.attempt, code);
  assertRef(request.candidateRef, SLICE06_DIAGNOSTIC_POLICY.candidateId, code, "candidateRef");
  assertRef(request.contractRef, SLICE06_DIAGNOSTIC_POLICY.normalizeContractId, code, "contractRef");
  exactObject(request.source, NORMALIZE_SOURCE_KEYS, code, "source");
  assertSafeId(request.source.sourceId, code, "source.sourceId");
  if (request.attempt.sourceId !== request.source.sourceId || request.source.mime !== "image/png"
    || !Number.isInteger(request.source.byteLength) || typeof request.source.alphaPresent !== "boolean") reject(code, "source declaration is invalid");
  assertSha256(request.source.fileSha256, code, "source.fileSha256");
  assertSha256(request.source.decodedPixelSha256, code, "source.decodedPixelSha256");
  const bytes = asBuffer(request.sourceBytes, SLICE06_DIAGNOSTIC_POLICY.maxInputBytes, code, "sourceBytes");
  const facts = preflightCanonicalPngSlice06(bytes);
  if (facts.byteLength !== request.source.byteLength || facts.fileSha256 !== request.source.fileSha256
    || facts.decodedPixelSha256 !== request.source.decodedPixelSha256 || facts.alphaPresent !== request.source.alphaPresent) {
    reject("S06_NORMALIZE_SOURCE_IDENTITY_MISMATCH", "source declaration differs from bytes");
  }
  return { bytes, expected: expectedFromFacts(facts) };
}

function validateExportRequest(request) {
  const code = "S06_EXPORT_REQUEST_INVALID";
  exactObject(request, EXPORT_KEYS, code, "exportRequest");
  if (request.schemaVersion !== SLICE06_DIAGNOSTIC_POLICY.exportRequestVersion || request.mode !== "open-diagnostic"
    || request.operation !== "export") reject(code, "export request type is invalid");
  assertAttempt(request.attempt, code);
  assertRef(request.candidateRef, SLICE06_DIAGNOSTIC_POLICY.candidateId, code, "candidateRef");
  assertRef(request.contractRef, SLICE06_DIAGNOSTIC_POLICY.exportContractId, code, "contractRef");
  exactObject(request.normalizedArtifact, EXPORT_PARENT_KEYS, "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", "normalizedArtifact");
  const parent = request.normalizedArtifact;
  if (parent.schemaVersion !== "normalized-image.slice04.v0") {
    reject("S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", "normalized artifact schema version is invalid");
  }
  for (const key of ["artifactId", "contentHash", "fileSha256", "decodedPixelSha256"]) {
    if (key === "artifactId") assertSafeId(parent[key], "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", `normalizedArtifact.${key}`);
    else assertSha256(parent[key], "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", `normalizedArtifact.${key}`);
  }
  exactObject(parent.image, IMAGE_KEYS, "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", "normalizedArtifact.image");
  if (!Number.isInteger(parent.width) || !Number.isInteger(parent.height) || typeof parent.alphaPresent !== "boolean") {
    reject("S06_EXPORT_NORMALIZED_ARTIFACT_INVALID", "normalized artifact dimensions or alpha are invalid");
  }
  const normalizedBytes = asBuffer(request.normalizedBytes, SLICE06_DIAGNOSTIC_POLICY.maxInputBytes, code, "normalizedBytes");
  const facts = preflightCanonicalPngSlice06(normalizedBytes);
  if (facts.fileSha256 !== parent.fileSha256 || facts.decodedPixelSha256 !== parent.decodedPixelSha256
    || facts.width !== parent.width || facts.height !== parent.height || facts.alphaPresent !== parent.alphaPresent
    || IMAGE_KEYS.some((key) => facts[key] !== parent.image[key])) {
    reject("S06_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH", "normalized parent differs from its bytes");
  }
  const rgba = asBuffer(request.rgba, SLICE06_DIAGNOSTIC_POLICY.maxRawBytes, code, "rgba");
  if (rgba.length !== parent.width * parent.height * 4 || sha256Slice06(rgba) !== parent.decodedPixelSha256) {
    reject("S06_EXPORT_RGBA_IDENTITY_MISMATCH", "RGBA differs from normalized parent");
  }
  return { rgba, expected: expectedFromFacts(facts) };
}

export function createSlice06DiagnosticAdapter({
  executeWorker = executeSlice06SharpWorker,
  verifyOutput,
  validateVerification: validateVerificationImpl = validateVerification,
  expectedRuntime,
} = {}) {
  if (typeof executeWorker !== "function" || typeof verifyOutput !== "function" || typeof validateVerificationImpl !== "function"
    || !isPlainObject(expectedRuntime)) reject("S06_ADAPTER_CONFIGURATION_INVALID", "adapter dependencies are incomplete", "configuration");
  const run = async (operation, request, validated, { signal } = {}) => {
    const workerRequest = operation === "normalize"
      ? { protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion, attemptId: request.attempt.idempotencyKey, operation, inputBytes: validated.bytes }
      : { protocolVersion: SLICE06_DIAGNOSTIC_POLICY.protocolVersion, attemptId: request.attempt.idempotencyKey, operation, rgba: validated.rgba, width: request.normalizedArtifact.width, height: request.normalizedArtifact.height };
    const response = await executeWorker(Object.freeze(workerRequest), {
      signal,
      timeoutMs: SLICE06_DIAGNOSTIC_POLICY.timeoutMs,
      expectedRuntime,
    });
    try {
      validateWorkerRuntimeSlice06(response.runtime, expectedRuntime);
    } catch (cause) {
      throw new Slice06DiagnosticError("S06_WORKER_RUNTIME_VERSION_MISMATCH", "worker runtime differs from the frozen attestation", "worker", {
        cause,
        workerObservation: response.workerObservation,
      });
    }
    validateResourceUsage(response.resourceUsage);
    const outputBytes = asBuffer(response.outputBytes, SLICE06_DIAGNOSTIC_POLICY.maxOutputBytes, "S06_WORKER_OUTPUT_INVALID", "outputBytes");
    let verification;
    try {
      verification = await verifyOutput(Object.freeze({ operation, bytes: outputBytes, expected: validated.expected }));
      validateVerificationImpl(verification, operation);
    } catch (cause) {
      if (isPlainObject(cause) && cause.candidateDefect === true) throw cause;
      reject("S06_ORACLE_PROTOCOL_INVALID", "oracle configuration or result shape is invalid", "oracle", {
        cause,
        workerObservation: response.workerObservation,
      });
    }
    return Object.freeze({
      status: verification.overallStatus === "pass" ? "oracle-pass-diagnostic" : "oracle-non-pass-diagnostic",
      operation,
      outputBytes,
      expected: validated.expected,
      verification,
      workerObservation: response.workerObservation,
      runtime: response.runtime,
      durationMs: response.durationMs,
      resourceUsage: response.resourceUsage,
    });
  };
  return Object.freeze({
    normalize(request, options) { return run("normalize", request, validateNormalizeRequest(request), options); },
    exportPng(request, options) { return run("export", request, validateExportRequest(request), options); },
  });
}

export const SLICE06_EXPECTED_OUTPUT_KEYS = EXPECTED_KEYS;
