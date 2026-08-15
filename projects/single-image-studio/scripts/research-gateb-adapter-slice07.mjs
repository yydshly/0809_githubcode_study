import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  SLICE07_CANONICAL_ENCODER_ID,
  encodeCanonicalPngSlice07,
} from "./research-canonical-png-encoder-slice07.mjs";

const WORKER_PATH = fileURLToPath(new URL("./research-sharp-raw-worker-slice07.mjs", import.meta.url));
const SUCCESS_KEYS = Object.freeze([
  "protocolVersion", "attemptId", "operation", "status", "rgba", "width", "height",
  "runtime", "durationMs", "resourceUsage",
]);
const FAILURE_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "status", "code"]);
const RESOURCE_KEYS = Object.freeze(["maxRssKiB", "userCpuMicros", "systemCpuMicros"]);
const EXPECTED_KEYS = Object.freeze([
  "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "orientation",
  "alphaMode", "alphaPresent", "metadataPolicy", "pngFilterPolicy", "interlace", "animation",
]);

export const SLICE07_GATEB_ADAPTER_ID = "ADAPTER-SHARP-CANONICAL-PNG@0.7.0";

export const SLICE07_GATEB_POLICY = Object.freeze({
  protocolVersion: "sharp-raw-worker.slice07.v0",
  candidateId: "REG-NORM-SHARP-CANONICAL-PNG@0.7.0",
  normalizeContractId: "CC-CAP02-NORMALIZE-PNG@0.7.0",
  exportContractId: "CC-CAP02-EXPORT-PNG@0.7.0",
  encoderId: SLICE07_CANONICAL_ENCODER_ID,
  maxInputBytes: 1024 * 1024,
  maxRawBytes: 256 * 256 * 4,
  maxOutputBytes: 1024 * 1024,
  maxDimension: 256,
  timeoutMs: 10_000,
  messageDrainMs: 100,
  killConfirmationMs: 1_000,
  maxObservedRssKiB: 262_144,
  workerMaxOldSpaceMiB: 128,
});

export class Slice07GateBError extends Error {
  constructor(code, message, { workerObservation = null, candidateOutput = null, cause } = {}) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "Slice07GateBError";
    this.code = code;
    this.workerObservation = workerObservation;
    this.candidateOutput = candidateOutput;
  }
}

function reject(code, message, options = {}) {
  throw new Slice07GateBError(code, message, options);
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

function safeId(value, code, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u.test(value) || value.includes("..")) {
    reject(code, `${label} is outside the closed identifier profile`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableValue(value) {
  if (value instanceof Uint8Array) return { byteLength: value.byteLength, sha256: sha256(value) };
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableHash(value) {
  return sha256(Buffer.from(`${JSON.stringify(stableValue(value))}\n`, "utf8"));
}

function runtimeMatches(actual, expected) {
  return isPlainObject(actual) && isPlainObject(expected)
    && JSON.stringify(stableValue(actual)) === JSON.stringify(stableValue(expected));
}

function validateExpected(expected) {
  exactObject(expected, EXPECTED_KEYS, "S07_EXPECTED_OUTPUT_INVALID", "expected output");
  if (typeof expected.decodedPixelSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(expected.decodedPixelSha256)
    || !Number.isInteger(expected.width) || expected.width < 1 || expected.width > SLICE07_GATEB_POLICY.maxDimension
    || !Number.isInteger(expected.height) || expected.height < 1 || expected.height > SLICE07_GATEB_POLICY.maxDimension
    || expected.pixelLayout !== "RGBA8" || expected.colorSpace !== "embedded-sRGB"
    || expected.orientation !== 1 || expected.alphaMode !== "straight-unpremultiplied"
    || typeof expected.alphaPresent !== "boolean"
    || expected.metadataPolicy !== "strip-all-except-color-contract"
    || expected.pngFilterPolicy !== "filter-0-only"
    || expected.interlace !== "forbidden" || expected.animation !== "forbidden") {
    reject("S07_EXPECTED_OUTPUT_INVALID", "expected output is outside the frozen canonical identity");
  }
}

function validateResourceUsage(value) {
  exactObject(value, RESOURCE_KEYS, "S07_WORKER_RESOURCE_INVALID", "worker resourceUsage");
  for (const key of RESOURCE_KEYS) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
      reject("S07_WORKER_RESOURCE_INVALID", `worker resourceUsage.${key} must be a non-negative safe integer`);
    }
  }
  if (value.maxRssKiB > SLICE07_GATEB_POLICY.maxObservedRssKiB) {
    reject("S07_WORKER_RESOURCE_LIMIT_EXCEEDED", "worker observed RSS exceeds the frozen limit");
  }
}

function validateSuccessfulMessage(message, { attemptId, operation, expectedRuntime, expected }) {
  exactObject(message, SUCCESS_KEYS, "S07_WORKER_PROTOCOL_INVALID", "worker success message");
  if (message.protocolVersion !== SLICE07_GATEB_POLICY.protocolVersion || message.attemptId !== attemptId
    || message.operation !== operation || message.status !== "succeeded") {
    reject("S07_WORKER_PROTOCOL_INVALID", "worker success identity differs from the request");
  }
  if (!(message.rgba instanceof Uint8Array)
    || !Number.isInteger(message.width) || message.width < 1 || message.width > SLICE07_GATEB_POLICY.maxDimension
    || !Number.isInteger(message.height) || message.height < 1 || message.height > SLICE07_GATEB_POLICY.maxDimension
    || message.rgba.byteLength !== message.width * message.height * 4
    || message.rgba.byteLength > SLICE07_GATEB_POLICY.maxRawBytes) {
    reject("S07_WORKER_OUTPUT_INVALID", "worker must return bounded RGBA8 pixels matching its dimensions");
  }
  if (message.width !== expected.width || message.height !== expected.height
    || sha256(message.rgba) !== expected.decodedPixelSha256) {
    reject("S07_WORKER_PIXEL_IDENTITY_MISMATCH", "worker RGBA identity differs from the frozen expected pixels");
  }
  if (!runtimeMatches(message.runtime, expectedRuntime)) {
    reject("S07_WORKER_RUNTIME_VERSION_MISMATCH", "worker runtime differs from the frozen runtime");
  }
  if (!Number.isSafeInteger(message.durationMs) || message.durationMs < 0
    || message.durationMs > SLICE07_GATEB_POLICY.timeoutMs) {
    reject("S07_WORKER_DURATION_INVALID", "worker duration is outside the frozen wall-time range");
  }
  validateResourceUsage(message.resourceUsage);
  return Buffer.from(message.rgba.buffer, message.rgba.byteOffset, message.rgba.byteLength);
}

function validateFailureMessage(message, { attemptId, operation }) {
  exactObject(message, FAILURE_KEYS, "S07_WORKER_PROTOCOL_INVALID", "worker failure message");
  if (message.protocolVersion !== SLICE07_GATEB_POLICY.protocolVersion || message.attemptId !== attemptId
    || message.operation !== operation || message.status !== "failed"
    || typeof message.code !== "string" || !/^S07_[A-Z0-9_]+$/u.test(message.code)) {
    reject("S07_WORKER_PROTOCOL_INVALID", "worker failure identity or code differs from the request");
  }
  return message.code;
}

export function encodeAndVerifyWorkerPixelsSlice07({
  message,
  attemptId,
  operation,
  expectedRuntime,
  expected,
  verifyOutput,
  encodePng = encodeCanonicalPngSlice07,
}) {
  safeId(attemptId, "S07_ATTEMPT_ID_INVALID", "attemptId");
  if (operation !== "normalize" && operation !== "export") {
    reject("S07_OPERATION_INVALID", "operation must be normalize or export");
  }
  validateExpected(expected);
  if (typeof verifyOutput !== "function") reject("S07_ORACLE_UNAVAILABLE", "independent verifyOutput must be injected");
  const rgba = validateSuccessfulMessage(message, { attemptId, operation, expectedRuntime, expected });
  const outputBytes = Buffer.from(encodePng({ width: message.width, height: message.height, rgba }));
  if (outputBytes.length < 1 || outputBytes.length > SLICE07_GATEB_POLICY.maxOutputBytes) {
    reject("S07_ENCODER_OUTPUT_INVALID", "candidate encoder returned invalid output bytes");
  }
  let oracleFacts;
  try {
    oracleFacts = verifyOutput({ operation, bytes: outputBytes, expected });
  } catch (cause) {
    reject("S07_OUTPUT_ORACLE_REJECTED", "independent oracle rejected candidate bytes", {
      cause,
      candidateOutput: Object.freeze({
        outputBytes,
        decodedPixelSha256: expected.decodedPixelSha256,
        encoderRef: Object.freeze({ id: SLICE07_CANONICAL_ENCODER_ID }),
        workerMessageSha256: stableHash(message),
        workerRuntimeSha256: stableHash(message.runtime),
        workerRuntime: Object.freeze(structuredClone(message.runtime)),
        workerTelemetry: Object.freeze({
          durationMs: message.durationMs,
          resourceUsage: Object.freeze(structuredClone(message.resourceUsage)),
        }),
      }),
    });
  }
  if (!isPlainObject(oracleFacts) || oracleFacts.fileSha256 !== sha256(outputBytes)
    || oracleFacts.decodedPixelSha256 !== expected.decodedPixelSha256
    || oracleFacts.width !== expected.width || oracleFacts.height !== expected.height) {
    reject("S07_ORACLE_RESULT_INVALID", "independent oracle facts do not bind the encoded bytes and expected pixels");
  }
  return Object.freeze({
    outputBytes,
    oracleFacts: Object.freeze(structuredClone(oracleFacts)),
    encoderRef: Object.freeze({ id: SLICE07_CANONICAL_ENCODER_ID }),
    workerMessageSha256: stableHash(message),
    workerRuntimeSha256: stableHash(message.runtime),
    workerRuntime: Object.freeze(structuredClone(message.runtime)),
    workerTelemetry: Object.freeze({
      durationMs: message.durationMs,
      resourceUsage: Object.freeze(structuredClone(message.resourceUsage)),
    }),
  });
}

function defaultWorkerEnvironment() {
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

function defaultSpawnWorker() {
  return fork(WORKER_PATH, [], {
    env: defaultWorkerEnvironment(),
    execArgv: [`--max-old-space-size=${SLICE07_GATEB_POLICY.workerMaxOldSpaceMiB}`],
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
}

export function createSlice07RawWorkerExecutor({
  expectedRuntime,
  verifyOutput,
  spawnWorker = defaultSpawnWorker,
  encodePng = encodeCanonicalPngSlice07,
  timeoutMs = SLICE07_GATEB_POLICY.timeoutMs,
  messageDrainMs = SLICE07_GATEB_POLICY.messageDrainMs,
  killConfirmationMs = SLICE07_GATEB_POLICY.killConfirmationMs,
} = {}) {
  if (!isPlainObject(expectedRuntime)) reject("S07_RUNTIME_EXPECTATION_MISSING", "expectedRuntime is required");
  if (typeof verifyOutput !== "function") reject("S07_ORACLE_UNAVAILABLE", "verifyOutput is required");
  if (typeof spawnWorker !== "function" || typeof encodePng !== "function") {
    reject("S07_ADAPTER_CONFIGURATION_INVALID", "spawnWorker and encodePng must be functions");
  }
  for (const [label, value] of [["timeoutMs", timeoutMs], ["messageDrainMs", messageDrainMs], ["killConfirmationMs", killConfirmationMs]]) {
    if (!Number.isSafeInteger(value) || value < 1) reject("S07_ADAPTER_CONFIGURATION_INVALID", `${label} must be positive`);
  }

  return Object.freeze({
    async execute({ attemptId, operation, workerRequest, expected, signal } = {}) {
      safeId(attemptId, "S07_ATTEMPT_ID_INVALID", "attemptId");
      if (operation !== "normalize" && operation !== "export") reject("S07_OPERATION_INVALID", "operation must be normalize or export");
      validateExpected(expected);
      if (!isPlainObject(workerRequest) || workerRequest.protocolVersion !== SLICE07_GATEB_POLICY.protocolVersion
        || workerRequest.attemptId !== attemptId || workerRequest.operation !== operation) {
        reject("S07_WORKER_REQUEST_INVALID", "workerRequest identity differs from the execution request");
      }
      if (signal?.aborted) reject("S07_CANCELLED_BEFORE_WORKER", "execution was cancelled before worker start");

      const child = spawnWorker();
      if (!child || typeof child.once !== "function" || typeof child.on !== "function"
        || typeof child.send !== "function" || typeof child.kill !== "function") {
        reject("S07_WORKER_START_FAILED", "spawnWorker returned an invalid child process");
      }

      return new Promise((resolve, rejectPromise) => {
        let message = null;
        let messageSeen = false;
        let exit = null;
        let terminal = false;
        let timedOut = false;
        let cancelled = false;
        let drainTimer = null;
        let killTimer = null;

        const observation = () => Object.freeze({
          messageReceived: messageSeen,
          messageSha256: messageSeen ? stableHash(message) : null,
          exitConfirmed: exit !== null,
          exitCode: exit?.code ?? null,
          signal: exit?.signal ?? null,
          timedOut,
          cancelled,
        });

        const cleanup = () => {
          clearTimeout(timeoutTimer);
          clearTimeout(drainTimer);
          clearTimeout(killTimer);
          signal?.removeEventListener?.("abort", onAbort);
        };

        const finishError = (error) => {
          if (terminal) return;
          terminal = true;
          cleanup();
          error.workerObservation ??= observation();
          rejectPromise(error);
        };

        const finishIfComplete = () => {
          if (terminal || !messageSeen || exit === null || timedOut || cancelled) return;
          if (exit.code !== 0 || exit.signal !== null) {
            finishError(new Slice07GateBError("S07_WORKER_EXIT_INVALID", "worker must exit with code 0 and no signal", { workerObservation: observation() }));
            return;
          }
          if (message.status === "failed") {
            let code;
            try {
              code = validateFailureMessage(message, { attemptId, operation });
            } catch (error) {
              finishError(error);
              return;
            }
            finishError(new Slice07GateBError(code, "worker returned a stable failure", { workerObservation: observation() }));
            return;
          }
          try {
            const encoded = encodeAndVerifyWorkerPixelsSlice07({
              message, attemptId, operation, expectedRuntime, expected, verifyOutput, encodePng,
            });
            terminal = true;
            cleanup();
            resolve(Object.freeze({ ...encoded, workerObservation: observation() }));
          } catch (error) {
            finishError(error instanceof Slice07GateBError
              ? error
              : new Slice07GateBError("S07_ADAPTER_INTERNAL_ERROR", "adapter failed closed", { cause: error }));
          }
        };

        const beginKill = (code, messageText) => {
          if (terminal) return;
          try { child.kill("SIGKILL"); } catch {}
          killTimer = setTimeout(() => {
            finishError(new Slice07GateBError("S07_WORKER_RECONCILIATION_UNKNOWN", "worker termination was not confirmed", { workerObservation: observation() }));
          }, killConfirmationMs);
          const waitForExit = () => {
            if (terminal || exit === null) return;
            clearTimeout(killTimer);
            finishError(new Slice07GateBError(code, messageText, { workerObservation: observation() }));
          };
          child.once("exit", waitForExit);
          waitForExit();
        };

        const onAbort = () => {
          cancelled = true;
          beginKill("S07_CANCELLED", "worker execution was cancelled");
        };

        const timeoutTimer = setTimeout(() => {
          timedOut = true;
          beginKill("S07_WORKER_TIMEOUT", "worker exceeded the frozen wall-time limit");
        }, timeoutMs);

        child.on("message", (value) => {
          if (terminal) return;
          if (messageSeen) {
            finishError(new Slice07GateBError("S07_WORKER_PROTOCOL_INVALID", "worker emitted more than one IPC message", { workerObservation: observation() }));
            return;
          }
          message = value;
          messageSeen = true;
          clearTimeout(drainTimer);
          finishIfComplete();
        });
        child.once("error", (cause) => {
          finishError(new Slice07GateBError("S07_WORKER_START_FAILED", "worker process emitted an error", { cause, workerObservation: observation() }));
        });
        child.once("exit", (code, exitSignal) => {
          exit = { code, signal: exitSignal };
          if (!messageSeen && !timedOut && !cancelled) {
            drainTimer = setTimeout(() => {
              finishError(new Slice07GateBError("S07_WORKER_MESSAGE_MISSING", "worker exited without an IPC message", { workerObservation: observation() }));
            }, messageDrainMs);
          }
          finishIfComplete();
        });
        signal?.addEventListener?.("abort", onAbort, { once: true });
        try {
          child.send(workerRequest, (error) => {
            if (error) finishError(new Slice07GateBError("S07_WORKER_SEND_FAILED", "worker IPC send failed", { cause: error, workerObservation: observation() }));
          });
        } catch (cause) {
          finishError(new Slice07GateBError("S07_WORKER_SEND_FAILED", "worker IPC send threw", { cause, workerObservation: observation() }));
        }
      });
    },
  });
}
