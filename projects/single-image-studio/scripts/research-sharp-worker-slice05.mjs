/*
 * Slice 05 candidate worker.
 *
 * This is the only Slice 05 module allowed to import Sharp. The parent adapter
 * performs the closed canonical-PNG policy gate, owns timeout/cancellation and
 * sends exactly one IPC request. This worker never imports an oracle, reference
 * encoder or product/server module, and it never persists output itself.
 */

const PROTOCOL_VERSION = "sharp-worker.slice05.v0";
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DIMENSION = 256;
const MAX_PIXELS = 256 * 256;
const MAX_RAW_BYTES = MAX_PIXELS * 4;

const REQUIRED_ENVIRONMENT = Object.freeze({
  UV_THREADPOOL_SIZE: "1",
  VIPS_CONCURRENCY: "1",
  SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
  TZ: "UTC",
  LANG: "C",
  LC_ALL: "C",
});

const PNG_OPTIONS = Object.freeze({
  progressive: false,
  compressionLevel: 9,
  adaptiveFiltering: false,
  palette: false,
  effort: 10,
});

const NORMALIZE_REQUEST_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "inputBytes"]);
const EXPORT_REQUEST_KEYS = Object.freeze(["protocolVersion", "attemptId", "operation", "rgba", "width", "height"]);

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
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/.test(value)
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
    protocolVersion: PROTOCOL_VERSION,
    attemptId,
    operation,
    status: "failed",
    code,
  });
}

function environmentIsLocked() {
  return Object.entries(REQUIRED_ENVIRONMENT).every(([key, value]) => process.env[key] === value);
}

if (!environmentIsLocked()) {
  fail("S05_WORKER_RUNTIME_VERSION_MISMATCH");
} else {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    fail("S05_WORKER_RUNTIME_VERSION_MISMATCH");
  }

  if (sharp) {
    if (sharp.versions?.sharp !== "0.35.3") {
      fail("S05_WORKER_RUNTIME_VERSION_MISMATCH");
    } else {
      sharp.concurrency(1);
      sharp.cache(false);
      sharp.simd(false);

      const cacheSettings = sharp.cache();

      const runtime = Object.freeze({
        sharpVersion: sharp.versions.sharp,
        nativeVersions: Object.freeze({ ...sharp.versions }),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        settings: Object.freeze({
          concurrency: sharp.concurrency(),
          cacheMemoryMaxMiB: cacheSettings.memory.max,
          cacheFilesMax: cacheSettings.files.max,
          cacheItemsMax: cacheSettings.items.max,
          simd: sharp.simd(),
          uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE,
          vipsConcurrency: process.env.VIPS_CONCURRENCY,
          ignoreGlobalLibvips: process.env.SHARP_IGNORE_GLOBAL_LIBVIPS,
        }),
      });

      let handled = false;
      process.on("message", async (request) => {
        if (handled) {
          fail("S05_WORKER_PROTOCOL_INVALID");
          return;
        }
        handled = true;

        const attemptId = isPlainObject(request) && validAttemptId(request.attemptId)
          ? request.attemptId
          : "invalid-attempt";
        const operation = isPlainObject(request) && typeof request.operation === "string"
          ? request.operation
          : "unknown";

        if (!isPlainObject(request) || request.protocolVersion !== PROTOCOL_VERSION
          || !validAttemptId(request.attemptId) || !new Set(["normalize", "export"]).has(request.operation)) {
          fail("S05_WORKER_PROTOCOL_INVALID", attemptId, operation);
          return;
        }

        try {
          const monotonicStartedAt = process.hrtime.bigint();
          const usageStarted = process.resourceUsage();
          let result;
          if (request.operation === "normalize") {
            if (!hasExactKeys(request, NORMALIZE_REQUEST_KEYS)) {
              fail("S05_WORKER_PROTOCOL_INVALID", attemptId, operation);
              return;
            }
            const inputBytes = asBuffer(request.inputBytes, MAX_INPUT_BYTES);
            if (!inputBytes) {
              fail("S05_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            try {
              result = await sharp(inputBytes, {
                failOn: "warning",
                limitInputPixels: MAX_PIXELS,
                sequentialRead: true,
                animated: false,
              })
                .toColourspace("srgb")
                .png(PNG_OPTIONS)
                .toBuffer({ resolveWithObject: true });
            } catch {
              fail("S05_SHARP_NORMALIZE_FAILED", attemptId, operation);
              return;
            }
          } else {
            if (!hasExactKeys(request, EXPORT_REQUEST_KEYS)
              || !Number.isInteger(request.width) || request.width < 1 || request.width > MAX_DIMENSION
              || !Number.isInteger(request.height) || request.height < 1 || request.height > MAX_DIMENSION
              || request.width * request.height > MAX_PIXELS) {
              fail("S05_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            const rgba = asBuffer(request.rgba, MAX_RAW_BYTES);
            if (!rgba || rgba.length !== request.width * request.height * 4) {
              fail("S05_WORKER_INPUT_INVALID", attemptId, operation);
              return;
            }
            try {
              result = await sharp(rgba, {
                raw: {
                  width: request.width,
                  height: request.height,
                  channels: 4,
                  premultiplied: false,
                },
                failOn: "warning",
                limitInputPixels: MAX_PIXELS,
                sequentialRead: true,
                animated: false,
              })
                .toColourspace("srgb")
                .png(PNG_OPTIONS)
                .toBuffer({ resolveWithObject: true });
            } catch {
              fail("S05_SHARP_EXPORT_FAILED", attemptId, operation);
              return;
            }
          }

          const outputBytes = asBuffer(result?.data, MAX_OUTPUT_BYTES);
          const info = result?.info;
          if (!outputBytes || !isPlainObject(info) || info.format !== "png"
            || !Number.isInteger(info.width) || info.width < 1 || info.width > MAX_DIMENSION
            || !Number.isInteger(info.height) || info.height < 1 || info.height > MAX_DIMENSION
            || info.width * info.height > MAX_PIXELS || info.channels !== 4
            || info.size !== outputBytes.length) {
            fail("S05_WORKER_OUTPUT_INVALID", attemptId, operation);
            return;
          }

          const usageFinished = process.resourceUsage();
          const durationMs = Number((process.hrtime.bigint() - monotonicStartedAt) / 1_000_000n);
          const resourceUsage = Object.freeze({
            maxRssKiB: usageFinished.maxRSS,
            userCpuMicros: Math.max(0, usageFinished.userCPUTime - usageStarted.userCPUTime),
            systemCpuMicros: Math.max(0, usageFinished.systemCPUTime - usageStarted.systemCPUTime),
          });

          send({
            protocolVersion: PROTOCOL_VERSION,
            attemptId,
            operation,
            status: "succeeded",
            outputBytes,
            runtime,
            durationMs,
            resourceUsage,
          });
        } catch {
          fail("S05_WORKER_OUTPUT_INVALID", attemptId, operation);
        }
      });
    }
  }
}
