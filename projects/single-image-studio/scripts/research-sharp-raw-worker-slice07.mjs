/*
 * Slice 07 candidate pixel worker.
 *
 * This is the only Slice 07 module allowed to import Sharp. It returns bounded
 * RGBA8 pixels and dimensions; it never encodes PNG, writes a file, or imports
 * the candidate encoder / independent oracle. The parent adapter owns PNG
 * encoding, oracle evaluation, timeout, exit confirmation and publication.
 */

export const SLICE07_RAW_WORKER_PROTOCOL_VERSION = "sharp-raw-worker.slice07.v0";

const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_DIMENSION = 256;
const MAX_PIXELS = MAX_DIMENSION * MAX_DIMENSION;
const MAX_RAW_BYTES = MAX_PIXELS * 4;

const REQUIRED_ENVIRONMENT = Object.freeze({
  UV_THREADPOOL_SIZE: "1",
  VIPS_CONCURRENCY: "1",
  SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
  TZ: "UTC",
  LANG: "C",
  LC_ALL: "C",
});

const NORMALIZE_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "inputBytes"]);
const EXPORT_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "rgba", "width", "height"]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function validAttemptId(value) {
  return typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u.test(value)
    && !value.includes("..");
}

function asBuffer(value, maximumBytes) {
  if (!(value instanceof Uint8Array) || value.byteLength < 1 || value.byteLength > maximumBytes) return null;
  return Buffer.isBuffer(value) ? value : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function send(payload) {
  if (typeof process.send !== "function" || !process.connected) {
    process.exitCode = 1;
    return;
  }
  process.send(payload, (error) => {
    process.exitCode = error ? 1 : 0;
    process.disconnect?.();
  });
}

function fail(code, attemptId = "worker-startup", operation = "unknown") {
  send({
    protocolVersion: SLICE07_RAW_WORKER_PROTOCOL_VERSION,
    attemptId,
    operation,
    status: "failed",
    code,
  });
}

function environmentIsLocked() {
  return Object.entries(REQUIRED_ENVIRONMENT).every(([key, value]) => process.env[key] === value);
}

function waitForBoundStartupFailure(code) {
  let handled = false;
  process.on("message", (request) => {
    if (handled) return;
    handled = true;
    const attemptId = isPlainObject(request) && validAttemptId(request.attemptId)
      ? request.attemptId
      : "invalid-attempt";
    const operation = isPlainObject(request) && new Set(["normalize", "export"]).has(request.operation)
      ? request.operation
      : "unknown";
    fail(code, attemptId, operation);
  });
}

if (!environmentIsLocked()) {
  waitForBoundStartupFailure("S07_WORKER_RUNTIME_VERSION_MISMATCH");
} else {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    waitForBoundStartupFailure("S07_WORKER_RUNTIME_VERSION_MISMATCH");
  }

  if (sharp) {
    if (sharp.versions?.sharp !== "0.35.3") {
      waitForBoundStartupFailure("S07_WORKER_RUNTIME_VERSION_MISMATCH");
    } else {
      sharp.concurrency(1);
      sharp.cache(false);
      sharp.simd(false);
      const cache = sharp.cache();
      const runtime = Object.freeze({
        sharpVersion: sharp.versions.sharp,
        nativeVersions: Object.freeze({ ...sharp.versions }),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        settings: Object.freeze({
          concurrency: sharp.concurrency(),
          cacheMemoryMaxMiB: cache.memory.max,
          cacheFilesMax: cache.files.max,
          cacheItemsMax: cache.items.max,
          simd: sharp.simd(),
          uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE,
          vipsConcurrency: process.env.VIPS_CONCURRENCY,
          ignoreGlobalLibvips: process.env.SHARP_IGNORE_GLOBAL_LIBVIPS,
        }),
      });

      let handled = false;
      process.on("message", async (request) => {
        if (handled) {
          fail("S07_WORKER_PROTOCOL_INVALID");
          return;
        }
        handled = true;
        const attemptId = isPlainObject(request) && validAttemptId(request.attemptId)
          ? request.attemptId
          : "invalid-attempt";
        const operation = isPlainObject(request) && typeof request.operation === "string"
          ? request.operation
          : "unknown";
        if (!isPlainObject(request)
          || request.protocolVersion !== SLICE07_RAW_WORKER_PROTOCOL_VERSION
          || !validAttemptId(request.attemptId)
          || !new Set(["normalize", "export"]).has(request.operation)) {
          fail("S07_WORKER_PROTOCOL_INVALID", attemptId, operation);
          return;
        }

        const monotonicStartedAt = process.hrtime.bigint();
        const usageStarted = process.resourceUsage();
        let result;
        try {
          if (operation === "normalize") {
            const inputBytes = hasExactKeys(request, NORMALIZE_KEYS)
              ? asBuffer(request.inputBytes, MAX_INPUT_BYTES)
              : null;
            if (!inputBytes) {
              fail("S07_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            result = await sharp(inputBytes, {
              failOn: "warning",
              limitInputPixels: MAX_PIXELS,
              sequentialRead: true,
              animated: false,
            }).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          } else {
            if (!hasExactKeys(request, EXPORT_KEYS)
              || !Number.isInteger(request.width) || request.width < 1 || request.width > MAX_DIMENSION
              || !Number.isInteger(request.height) || request.height < 1 || request.height > MAX_DIMENSION
              || request.width * request.height > MAX_PIXELS) {
              fail("S07_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            const rgba = asBuffer(request.rgba, MAX_RAW_BYTES);
            if (!rgba || rgba.length !== request.width * request.height * 4) {
              fail("S07_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            result = await sharp(rgba, {
              raw: { width: request.width, height: request.height, channels: 4, premultiplied: false },
              failOn: "warning",
              limitInputPixels: MAX_PIXELS,
              sequentialRead: true,
              animated: false,
            }).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          }
        } catch {
          fail(operation === "normalize" ? "S07_SHARP_NORMALIZE_FAILED" : "S07_SHARP_EXPORT_FAILED", attemptId, operation);
          return;
        }

        const rgba = asBuffer(result?.data, MAX_RAW_BYTES);
        const info = result?.info;
        if (!rgba || !isPlainObject(info) || info.format !== "raw"
          || !Number.isInteger(info.width) || info.width < 1 || info.width > MAX_DIMENSION
          || !Number.isInteger(info.height) || info.height < 1 || info.height > MAX_DIMENSION
          || info.width * info.height > MAX_PIXELS || info.channels !== 4
          || info.size !== rgba.length || rgba.length !== info.width * info.height * 4) {
          fail("S07_WORKER_OUTPUT_INVALID", attemptId, operation);
          return;
        }

        const usageFinished = process.resourceUsage();
        send({
          protocolVersion: SLICE07_RAW_WORKER_PROTOCOL_VERSION,
          attemptId,
          operation,
          status: "succeeded",
          rgba,
          width: info.width,
          height: info.height,
          runtime,
          durationMs: Number((process.hrtime.bigint() - monotonicStartedAt) / 1_000_000n),
          resourceUsage: {
            maxRssKiB: usageFinished.maxRSS,
            userCpuMicros: Math.max(0, usageFinished.userCPUTime - usageStarted.userCPUTime),
            systemCpuMicros: Math.max(0, usageFinished.systemCPUTime - usageStarted.systemCPUTime),
          },
        });
      });
    }
  }
}
