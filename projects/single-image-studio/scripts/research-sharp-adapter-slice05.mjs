import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WORKER_PATH = fileURLToPath(new URL("./research-sharp-worker-slice05.mjs", import.meta.url));

export const SLICE05_SHARP_POLICY = Object.freeze({
  protocolVersion: "sharp-worker.slice05.v0",
  normalizeRequestVersion: "normalize-request.slice05.v0",
  exportRequestVersion: "export-request.slice05.v0",
  normalizedArtifactVersion: "normalized-image.slice04.v0",
  deliveryArtifactVersion: "delivery-artifact.slice04.v0",
  candidateId: "REG-NORM-SHARP@0.5.0",
  normalizeContractId: "CC-CAP02-NORMALIZE-PNG@0.5.0",
  exportContractId: "CC-CAP02-EXPORT-PNG@0.5.0",
  maxInputBytes: 1024 * 1024,
  maxOutputBytes: 1024 * 1024,
  maxDimension: 256,
  maxPixels: 256 * 256,
  maxRawBytes: 256 * 256 * 4,
  workerTimeoutMs: 10_000,
  workerKillConfirmationMs: 1_000,
  workerMaxOldSpaceMiB: 128,
  observedMaxRssKiB: 256 * 1024,
  allowedPartitions: Object.freeze(["smoke", "dev/calibration", "defect/calibration"]),
  allowedPngChunks: Object.freeze(["IHDR", "sRGB", "IDAT", "IEND"]),
});

export const SLICE05_ARTIFACT_KEYS = Object.freeze([
  "schemaVersion",
  "artifactId",
  "operation",
  "parent",
  "capabilityContractRef",
  "candidateRef",
  "adapterRef",
  "producerRef",
  "runtimeRef",
  "hardwareRef",
  "attempt",
  "bytes",
  "image",
  "createdAt",
  "contentHash",
]);

export const SLICE05_ATTEMPT_KEYS = Object.freeze([
  "runId",
  "sourceId",
  "partition",
  "repetition",
  "attemptNumber",
  "idempotencyKey",
]);

export const SLICE05_IMAGE_KEYS = Object.freeze([
  "width",
  "height",
  "pixelLayout",
  "colorSpace",
  "orientation",
  "alphaMode",
  "alphaPresent",
  "metadataPolicy",
  "pngFilterPolicy",
  "interlace",
  "animation",
]);

export const SLICE05_OUTPUT_FACT_KEYS = Object.freeze([
  "mime",
  "byteLength",
  "fileSha256",
  "decodedPixelSha256",
  ...SLICE05_IMAGE_KEYS,
]);

const NORMALIZE_REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "operation",
  "outputArtifactId",
  "outputRelativePath",
  "attempt",
  "capabilityContractRef",
  "candidateRef",
  "source",
  "sourceBytes",
]);

const NORMALIZE_SOURCE_KEYS = Object.freeze([
  "sourceAssetId",
  "sourceFileName",
  "sourceManifestSha256",
  "mime",
  "byteLength",
  "fileSha256",
  "decodedPixelSha256",
  "orientation",
  "pixelLayout",
  "colorSpace",
  "alphaMode",
  "alphaPresent",
]);

const EXPORT_REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "operation",
  "outputArtifactId",
  "outputRelativePath",
  "attempt",
  "capabilityContractRef",
  "candidateRef",
  "normalizedArtifact",
  "normalizedBytes",
  "rgba",
]);

const RGBA_BINDING_KEYS = Object.freeze(["bytes", "byteLength", "decodedPixelSha256"]);
const REF_KEYS = Object.freeze(["id", "contentHash"]);
const ADAPTER_REF_KEYS = Object.freeze(["id", "version", "implementationSha256"]);
const PRODUCER_REF_KEYS = Object.freeze(["kind", "id", "version", "implementationSha256"]);
const NORMALIZED_PARENT_KEYS = Object.freeze([
  "sourceAssetId",
  "sourceFileSha256",
  "sourceDecodedPixelSha256",
  "sourceManifestSha256",
]);
const DELIVERY_PARENT_KEYS = Object.freeze([
  "normalizedImageId",
  "normalizedArtifactSha256",
  "normalizedFileSha256",
  "normalizedDecodedPixelSha256",
]);
const ARTIFACT_BYTES_KEYS = Object.freeze([
  "relativePath",
  "mime",
  "byteLength",
  "fileSha256",
  "decodedPixelSha256",
]);

const OUTPUT_METADATA_POLICY = "strip-all-except-color-contract";
const OUTPUT_COLOR_SPACE = "embedded-sRGB";
const OUTPUT_ALPHA_MODE = "straight-unpremultiplied";
const OUTPUT_PIXEL_LAYOUT = "RGBA8";
const WORKER_RUNTIME_KEYS = Object.freeze([
  "sharpVersion",
  "nativeVersions",
  "nodeVersion",
  "platform",
  "architecture",
  "settings",
]);
const WORKER_RUNTIME_SETTING_KEYS = Object.freeze([
  "concurrency",
  "cacheMemoryMaxMiB",
  "cacheFilesMax",
  "cacheItemsMax",
  "simd",
  "uvThreadpoolSize",
  "vipsConcurrency",
  "ignoreGlobalLibvips",
]);
const WORKER_RESOURCE_KEYS = Object.freeze(["maxRssKiB", "userCpuMicros", "systemCpuMicros"]);

export class Slice05AdapterError extends Error {
  constructor(code, message, stage = "policy", options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "Slice05AdapterError";
    this.code = code;
    this.stage = stage;
  }
}

function reject(code, message, stage = "policy", options = undefined) {
  throw new Slice05AdapterError(code, message, stage, options);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(value, keys, code, label) {
  if (!isPlainObject(value)) reject(code, `${label} must be a plain object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    reject(code, `${label} must contain exactly: ${keys.join(", ")}`);
  }
}

function assertNonEmptyString(value, code, label) {
  if (typeof value !== "string" || value.trim() === "") {
    reject(code, `${label} must be a non-empty string`);
  }
}

function assertSafeId(value, code, label) {
  assertNonEmptyString(value, code, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/.test(value) || value.includes("..")) {
    reject(code, `${label} is outside the closed identifier profile`);
  }
}

function assertSha256(value, code, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    reject(code, `${label} must be a lowercase SHA-256`);
  }
}

function assertUtcDateTime(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    reject(code, `${label} must be a UTC date-time`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    reject(code, `${label} must be a valid millisecond-precision UTC date-time`);
  }
}

function assertRelativePath(value, code, label) {
  assertNonEmptyString(value, code, label);
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.includes("\\") || value.startsWith("/")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    reject(code, `${label} must be a normalized repository-relative path`);
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringifySlice05(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function sha256Slice05(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHashSlice05(record) {
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice05(Buffer.from(stableStringifySlice05(copy), "utf8"));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checkedByteBuffer(input, { codePrefix, label, maximumBytes }) {
  if (!(input instanceof Uint8Array)) {
    reject(`${codePrefix}_TYPE_INVALID`, `${label} must be Uint8Array bytes`);
  }
  // The size gate intentionally precedes Buffer conversion, hashing, parsing and allocation.
  if (input.byteLength > maximumBytes) {
    reject(`${codePrefix}_LIMIT_EXCEEDED`, `${label} exceed the frozen byte limit`);
  }
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

/**
 * Full closed-profile PNG policy gate for candidate input. This is part of the
 * candidate adapter boundary, not an evidence oracle. It permits only exact
 * IHDR/sRGB/IDAT/IEND RGBA8, non-interlaced, filter-0, single-frame PNG bytes.
 */
export function preflightCanonicalPngSlice05(input) {
  const bytes = checkedByteBuffer(input, {
    codePrefix: "S05_INPUT_BYTES",
    label: "sourceBytes",
    maximumBytes: SLICE05_SHARP_POLICY.maxInputBytes,
  });
  if (bytes.length < 33) reject("S05_INPUT_PNG_TRUNCATED", "sourceBytes are too short for a PNG");
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    reject("S05_INPUT_SIGNATURE_MISMATCH", "sourceBytes do not carry the PNG signature");
  }

  let offset = PNG_SIGNATURE.length;
  let width;
  let height;
  let sawHeader = false;
  let sawSrgb = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let sawEnd = false;
  const compressedParts = [];

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) {
      reject("S05_INPUT_CHUNK_TRUNCATED", `PNG ${type || "unknown"} chunk exceeds source length`);
    }
    const storedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (storedCrc !== actualCrc) {
      reject("S05_INPUT_CRC_MISMATCH", `PNG ${type} chunk CRC does not match`);
    }
    if (!SLICE05_SHARP_POLICY.allowedPngChunks.includes(type)) {
      reject("S05_INPUT_CHUNK_PROFILE_INVALID", `PNG ${type} is outside the closed canonical profile`);
    }

    if (type === "IHDR") {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        reject("S05_INPUT_CHUNK_PROFILE_INVALID", "PNG must contain one leading 13-byte IHDR");
      }
      sawHeader = true;
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      const bitDepth = bytes[dataStart + 8];
      const colorType = bytes[dataStart + 9];
      const compressionMethod = bytes[dataStart + 10];
      const filterMethod = bytes[dataStart + 11];
      const interlaceMethod = bytes[dataStart + 12];
      if (width < 1 || height < 1) {
        reject("S05_INPUT_DIMENSIONS_INVALID", "PNG dimensions must be positive integers");
      }
      if (width > SLICE05_SHARP_POLICY.maxDimension || height > SLICE05_SHARP_POLICY.maxDimension
        || width * height > SLICE05_SHARP_POLICY.maxPixels) {
        reject("S05_INPUT_DIMENSION_LIMIT_EXCEEDED", "PNG dimensions exceed the frozen 256 by 256 limit");
      }
      if (bitDepth !== 8 || colorType !== 6 || compressionMethod !== 0 || filterMethod !== 0
        || interlaceMethod !== 0) {
        reject(
          "S05_INPUT_PIXEL_PROFILE_INVALID",
          "PNG must be non-interlaced RGBA8 with standard compression and filter methods",
        );
      }
    } else if (type === "sRGB") {
      if (!sawHeader || sawSrgb || sawImageData || length !== 1 || bytes[dataStart] > 3) {
        reject("S05_INPUT_SRGB_REQUIRED", "PNG must contain one valid sRGB chunk before image data");
      }
      sawSrgb = true;
    } else if (type === "IDAT") {
      if (!sawHeader || !sawSrgb || imageDataEnded || length === 0) {
        reject("S05_INPUT_CHUNK_PROFILE_INVALID", "PNG IDAT must be non-empty, contiguous and follow sRGB");
      }
      sawImageData = true;
      compressedParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      if (!sawImageData || sawEnd || length !== 0) {
        reject("S05_INPUT_CHUNK_PROFILE_INVALID", "PNG must contain one empty IEND after image data");
      }
      sawEnd = true;
    }

    offset = dataEnd + 4;
    if (sawImageData && type !== "IDAT" && type !== "IEND") imageDataEnded = true;
    if (type === "IEND") break;
  }

  if (!sawHeader || !sawSrgb || !sawImageData || !sawEnd || offset !== bytes.length) {
    reject("S05_INPUT_CHUNK_PROFILE_INVALID", "PNG must contain exact IHDR/sRGB/IDAT/IEND content and end at IEND");
  }

  const stride = width * 4;
  const expectedInflatedLength = (stride + 1) * height;
  const compressed = Buffer.concat(compressedParts);
  let inflated;
  let consumed;
  try {
    const result = inflateSync(compressed, { info: true, maxOutputLength: expectedInflatedLength });
    inflated = result.buffer;
    consumed = result.engine.bytesWritten;
  } catch (cause) {
    reject("S05_INPUT_DECODE_FAILED", "PNG image data did not decode within the frozen resource profile", "policy", { cause });
  }
  if (consumed !== compressed.length || inflated.length !== expectedInflatedLength) {
    reject("S05_INPUT_DECODE_LENGTH_MISMATCH", "PNG image data has trailing compressed bytes or an invalid decoded length");
  }

  const pixelHash = createHash("sha256");
  let alphaPresent = false;
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    if (inflated[rowStart] !== 0) {
      reject("S05_INPUT_FILTER_INVALID", "PNG scanlines must all use filter 0");
    }
    const row = inflated.subarray(rowStart + 1, rowStart + 1 + stride);
    pixelHash.update(row);
    for (let index = 3; index < row.length; index += 4) {
      if (row[index] < 255) alphaPresent = true;
    }
  }

  return Object.freeze({
    mime: "image/png",
    byteLength: bytes.length,
    fileSha256: sha256Slice05(bytes),
    decodedPixelSha256: pixelHash.digest("hex"),
    width,
    height,
    pixelLayout: OUTPUT_PIXEL_LAYOUT,
    colorSpace: OUTPUT_COLOR_SPACE,
    orientation: 1,
    alphaMode: OUTPUT_ALPHA_MODE,
    alphaPresent,
    metadataPolicy: OUTPUT_METADATA_POLICY,
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  });
}

function validateContentRef(value, expectedId, code, label) {
  assertExactObject(value, REF_KEYS, code, label);
  if (value.id !== expectedId) reject(code, `${label}.id must be ${expectedId}`);
  assertSha256(value.contentHash, code, `${label}.contentHash`);
}

function validateAdapterRef(value, code, label) {
  assertExactObject(value, ADAPTER_REF_KEYS, code, label);
  assertSafeId(value.id, code, `${label}.id`);
  assertSafeId(value.version, code, `${label}.version`);
  assertSha256(value.implementationSha256, code, `${label}.implementationSha256`);
}

function validateProducerRef(value, adapterRef, code, label) {
  assertExactObject(value, PRODUCER_REF_KEYS, code, label);
  if (!new Set(["candidate-adapter", "independent-fixture-generator"]).has(value.kind)) {
    reject(code, `${label}.kind is outside the frozen producer classes`);
  }
  assertSafeId(value.id, code, `${label}.id`);
  assertSafeId(value.version, code, `${label}.version`);
  assertSha256(value.implementationSha256, code, `${label}.implementationSha256`);
  if (value.kind === "candidate-adapter"
    && (value.id !== adapterRef.id || value.version !== adapterRef.version
      || value.implementationSha256 !== adapterRef.implementationSha256)) {
    reject(code, `${label} candidate identity must exactly match adapterRef`);
  }
  if (value.kind === "independent-fixture-generator"
    && value.implementationSha256 === adapterRef.implementationSha256) {
    reject(code, `${label} independent producer must not share adapterRef implementation identity`);
  }
}

function candidateProducerRef(adapterRef) {
  return {
    kind: "candidate-adapter",
    id: adapterRef.id,
    version: adapterRef.version,
    implementationSha256: adapterRef.implementationSha256,
  };
}

function validateOpaqueRef(value, code, label) {
  assertExactObject(value, REF_KEYS, code, label);
  assertSafeId(value.id, code, `${label}.id`);
  assertSha256(value.contentHash, code, `${label}.contentHash`);
}

function validateAttempt(value, code, label = "attempt") {
  assertExactObject(value, SLICE05_ATTEMPT_KEYS, code, label);
  assertSafeId(value.runId, code, `${label}.runId`);
  assertSafeId(value.sourceId, code, `${label}.sourceId`);
  if (!SLICE05_SHARP_POLICY.allowedPartitions.includes(value.partition)) {
    reject(code, `${label}.partition is outside Slice 05 open research`);
  }
  if (!Number.isInteger(value.repetition) || value.repetition < 1 || value.repetition > 3) {
    reject(code, `${label}.repetition must be an integer from 1 to 3`);
  }
  if (!Number.isInteger(value.attemptNumber) || value.attemptNumber < 1 || value.attemptNumber > 2) {
    reject(code, `${label}.attemptNumber must be 1 or the sole allowed no-result replacement attempt 2`);
  }
  assertSafeId(value.idempotencyKey, code, `${label}.idempotencyKey`);
}

function validateImageFacts(value, code, label) {
  assertExactObject(value, SLICE05_IMAGE_KEYS, code, label);
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > SLICE05_SHARP_POLICY.maxDimension
    || !Number.isInteger(value.height) || value.height < 1 || value.height > SLICE05_SHARP_POLICY.maxDimension
    || value.width * value.height > SLICE05_SHARP_POLICY.maxPixels) {
    reject(code, `${label} dimensions exceed the closed profile`);
  }
  if (value.pixelLayout !== OUTPUT_PIXEL_LAYOUT || value.colorSpace !== OUTPUT_COLOR_SPACE
    || value.orientation !== 1 || value.alphaMode !== OUTPUT_ALPHA_MODE
    || typeof value.alphaPresent !== "boolean" || value.metadataPolicy !== OUTPUT_METADATA_POLICY
    || value.pngFilterPolicy !== "filter-0-only" || value.interlace !== "forbidden"
    || value.animation !== "forbidden") {
    reject(code, `${label} is outside the frozen RGBA8 sRGB PNG profile`);
  }
}

function validateArtifactBytes(value, code, label) {
  assertExactObject(value, ARTIFACT_BYTES_KEYS, code, label);
  assertRelativePath(value.relativePath, code, `${label}.relativePath`);
  if (value.mime !== "image/png" || !Number.isInteger(value.byteLength) || value.byteLength < 1
    || value.byteLength > SLICE05_SHARP_POLICY.maxOutputBytes) {
    reject(code, `${label} is outside the PNG byte profile`);
  }
  assertSha256(value.fileSha256, code, `${label}.fileSha256`);
  assertSha256(value.decodedPixelSha256, code, `${label}.decodedPixelSha256`);
}

export function validateNormalizedArtifactSlice05(artifact) {
  const code = "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID";
  assertExactObject(artifact, SLICE05_ARTIFACT_KEYS, code, "normalizedArtifact");
  if (artifact.schemaVersion !== SLICE05_SHARP_POLICY.normalizedArtifactVersion || artifact.operation !== "normalize") {
    reject(code, "normalizedArtifact type or operation does not match");
  }
  assertSafeId(artifact.artifactId, code, "normalizedArtifact.artifactId");
  assertExactObject(artifact.parent, NORMALIZED_PARENT_KEYS, code, "normalizedArtifact.parent");
  assertSafeId(artifact.parent.sourceAssetId, code, "normalizedArtifact.parent.sourceAssetId");
  assertSha256(artifact.parent.sourceFileSha256, code, "normalizedArtifact.parent.sourceFileSha256");
  assertSha256(artifact.parent.sourceDecodedPixelSha256, code, "normalizedArtifact.parent.sourceDecodedPixelSha256");
  assertSha256(artifact.parent.sourceManifestSha256, code, "normalizedArtifact.parent.sourceManifestSha256");
  validateContentRef(artifact.capabilityContractRef, SLICE05_SHARP_POLICY.normalizeContractId, code, "normalizedArtifact.capabilityContractRef");
  validateContentRef(artifact.candidateRef, SLICE05_SHARP_POLICY.candidateId, code, "normalizedArtifact.candidateRef");
  validateAdapterRef(artifact.adapterRef, code, "normalizedArtifact.adapterRef");
  validateProducerRef(artifact.producerRef, artifact.adapterRef, code, "normalizedArtifact.producerRef");
  validateOpaqueRef(artifact.runtimeRef, code, "normalizedArtifact.runtimeRef");
  validateOpaqueRef(artifact.hardwareRef, code, "normalizedArtifact.hardwareRef");
  validateAttempt(artifact.attempt, code, "normalizedArtifact.attempt");
  validateArtifactBytes(artifact.bytes, code, "normalizedArtifact.bytes");
  validateImageFacts(artifact.image, code, "normalizedArtifact.image");
  if (artifact.attempt.sourceId !== artifact.parent.sourceAssetId
    || artifact.bytes.decodedPixelSha256 !== artifact.parent.sourceDecodedPixelSha256) {
    reject(code, "normalizedArtifact source or decoded-pixel identity chain does not match");
  }
  assertUtcDateTime(artifact.createdAt, code, "normalizedArtifact.createdAt");
  assertSha256(artifact.contentHash, code, "normalizedArtifact.contentHash");
  if (contentHashSlice05(artifact) !== artifact.contentHash) {
    reject(code, "normalizedArtifact.contentHash does not match canonical content");
  }
  return artifact;
}

export function validateDeliveryArtifactSlice05(artifact) {
  const code = "S05_DELIVERY_ARTIFACT_INVALID";
  assertExactObject(artifact, SLICE05_ARTIFACT_KEYS, code, "deliveryArtifact");
  if (artifact.schemaVersion !== SLICE05_SHARP_POLICY.deliveryArtifactVersion || artifact.operation !== "export") {
    reject(code, "deliveryArtifact type or operation does not match");
  }
  assertSafeId(artifact.artifactId, code, "deliveryArtifact.artifactId");
  assertExactObject(artifact.parent, DELIVERY_PARENT_KEYS, code, "deliveryArtifact.parent");
  assertSafeId(artifact.parent.normalizedImageId, code, "deliveryArtifact.parent.normalizedImageId");
  assertSha256(artifact.parent.normalizedArtifactSha256, code, "deliveryArtifact.parent.normalizedArtifactSha256");
  assertSha256(artifact.parent.normalizedFileSha256, code, "deliveryArtifact.parent.normalizedFileSha256");
  assertSha256(artifact.parent.normalizedDecodedPixelSha256, code, "deliveryArtifact.parent.normalizedDecodedPixelSha256");
  validateContentRef(artifact.capabilityContractRef, SLICE05_SHARP_POLICY.exportContractId, code, "deliveryArtifact.capabilityContractRef");
  validateContentRef(artifact.candidateRef, SLICE05_SHARP_POLICY.candidateId, code, "deliveryArtifact.candidateRef");
  validateAdapterRef(artifact.adapterRef, code, "deliveryArtifact.adapterRef");
  validateProducerRef(artifact.producerRef, artifact.adapterRef, code, "deliveryArtifact.producerRef");
  if (artifact.producerRef.kind !== "candidate-adapter") {
    reject(code, "deliveryArtifact producer must be the frozen candidate adapter");
  }
  validateOpaqueRef(artifact.runtimeRef, code, "deliveryArtifact.runtimeRef");
  validateOpaqueRef(artifact.hardwareRef, code, "deliveryArtifact.hardwareRef");
  validateAttempt(artifact.attempt, code, "deliveryArtifact.attempt");
  validateArtifactBytes(artifact.bytes, code, "deliveryArtifact.bytes");
  validateImageFacts(artifact.image, code, "deliveryArtifact.image");
  if (artifact.attempt.sourceId !== artifact.parent.normalizedImageId
    || artifact.bytes.decodedPixelSha256 !== artifact.parent.normalizedDecodedPixelSha256) {
    reject(code, "deliveryArtifact parent or decoded-pixel identity chain does not match");
  }
  assertUtcDateTime(artifact.createdAt, code, "deliveryArtifact.createdAt");
  assertSha256(artifact.contentHash, code, "deliveryArtifact.contentHash");
  if (contentHashSlice05(artifact) !== artifact.contentHash) {
    reject(code, "deliveryArtifact.contentHash does not match canonical content");
  }
  return artifact;
}

function validateNormalizeSource(source) {
  const code = "S05_NORMALIZE_SOURCE_DECLARATION_INVALID";
  assertExactObject(source, NORMALIZE_SOURCE_KEYS, code, "source");
  assertSafeId(source.sourceAssetId, code, "source.sourceAssetId");
  if (typeof source.sourceFileName !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,190}\.png$/.test(source.sourceFileName)) {
    reject(code, "source.sourceFileName must be one safe lowercase .png basename");
  }
  assertSha256(source.sourceManifestSha256, code, "source.sourceManifestSha256");
  if (source.mime !== "image/png" || !Number.isInteger(source.byteLength) || source.byteLength < 1
    || source.byteLength > SLICE05_SHARP_POLICY.maxInputBytes || source.orientation !== 1
    || source.pixelLayout !== OUTPUT_PIXEL_LAYOUT || source.colorSpace !== OUTPUT_COLOR_SPACE
    || source.alphaMode !== OUTPUT_ALPHA_MODE || typeof source.alphaPresent !== "boolean") {
    reject(code, "source declaration is outside the canonical PNG profile");
  }
  assertSha256(source.fileSha256, code, "source.fileSha256");
  assertSha256(source.decodedPixelSha256, code, "source.decodedPixelSha256");
}

export function validateNormalizeRequestSlice05(request) {
  const code = "S05_NORMALIZE_REQUEST_INVALID";
  assertExactObject(request, NORMALIZE_REQUEST_KEYS, code, "normalizeRequest");
  if (request.schemaVersion !== SLICE05_SHARP_POLICY.normalizeRequestVersion || request.operation !== "normalize") {
    reject(code, "normalizeRequest type or operation does not match");
  }
  assertSafeId(request.outputArtifactId, code, "normalizeRequest.outputArtifactId");
  assertRelativePath(request.outputRelativePath, code, "normalizeRequest.outputRelativePath");
  validateAttempt(request.attempt, code, "normalizeRequest.attempt");
  validateContentRef(request.capabilityContractRef, SLICE05_SHARP_POLICY.normalizeContractId, code, "normalizeRequest.capabilityContractRef");
  validateContentRef(request.candidateRef, SLICE05_SHARP_POLICY.candidateId, code, "normalizeRequest.candidateRef");
  validateNormalizeSource(request.source);
  if (request.attempt.sourceId !== request.source.sourceAssetId) {
    reject(code, "normalizeRequest attempt sourceId does not bind the declared source asset");
  }
  const inputFacts = preflightCanonicalPngSlice05(request.sourceBytes);
  if (request.source.byteLength !== inputFacts.byteLength || request.source.fileSha256 !== inputFacts.fileSha256
    || request.source.decodedPixelSha256 !== inputFacts.decodedPixelSha256
    || request.source.alphaPresent !== inputFacts.alphaPresent) {
    reject("S05_NORMALIZE_SOURCE_IDENTITY_MISMATCH", "source declaration does not match the supplied PNG bytes");
  }
  return Object.freeze({ request, inputFacts });
}

export function validateExportRequestSlice05(request) {
  const code = "S05_EXPORT_REQUEST_INVALID";
  assertExactObject(request, EXPORT_REQUEST_KEYS, code, "exportRequest");
  if (request.schemaVersion !== SLICE05_SHARP_POLICY.exportRequestVersion || request.operation !== "export") {
    reject(code, "exportRequest type or operation does not match");
  }
  assertSafeId(request.outputArtifactId, code, "exportRequest.outputArtifactId");
  assertRelativePath(request.outputRelativePath, code, "exportRequest.outputRelativePath");
  validateAttempt(request.attempt, code, "exportRequest.attempt");
  validateContentRef(request.capabilityContractRef, SLICE05_SHARP_POLICY.exportContractId, code, "exportRequest.capabilityContractRef");
  validateContentRef(request.candidateRef, SLICE05_SHARP_POLICY.candidateId, code, "exportRequest.candidateRef");
  validateNormalizedArtifactSlice05(request.normalizedArtifact);
  if (request.normalizedArtifact.producerRef.kind !== "independent-fixture-generator") {
    reject(
      "S05_EXPORT_PARENT_PRODUCER_INVALID",
      "export input must be authored by the frozen independent fixture generator",
    );
  }
  if (request.attempt.partition !== request.normalizedArtifact.attempt.partition) {
    reject("S05_EXPORT_PARENT_BINDING_MISMATCH", "export request and normalized artifact partitions differ");
  }
  let parentFacts;
  try {
    parentFacts = preflightCanonicalPngSlice05(request.normalizedBytes);
  } catch (cause) {
    reject(
      "S05_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH",
      "normalized parent bytes do not satisfy the closed canonical PNG profile",
      "policy",
      { cause },
    );
  }
  if (parentFacts.byteLength !== request.normalizedArtifact.bytes.byteLength
    || parentFacts.fileSha256 !== request.normalizedArtifact.bytes.fileSha256
    || parentFacts.decodedPixelSha256 !== request.normalizedArtifact.bytes.decodedPixelSha256
    || SLICE05_IMAGE_KEYS.some((key) => parentFacts[key] !== request.normalizedArtifact.image[key])) {
    reject(
      "S05_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH",
      "normalized parent bytes do not match artifact file, decoded-pixel or image identity",
    );
  }
  if (request.attempt.sourceId !== request.normalizedArtifact.artifactId
    || request.candidateRef.id !== request.normalizedArtifact.candidateRef.id
    || request.candidateRef.contentHash !== request.normalizedArtifact.candidateRef.contentHash) {
    reject("S05_EXPORT_PARENT_BINDING_MISMATCH", "exportRequest does not bind the normalized parent and candidate identity");
  }
  assertExactObject(request.rgba, RGBA_BINDING_KEYS, code, "exportRequest.rgba");
  const rgba = checkedByteBuffer(request.rgba.bytes, {
    codePrefix: "S05_EXPORT_RGBA_BYTES",
    label: "exportRequest.rgba.bytes",
    maximumBytes: SLICE05_SHARP_POLICY.maxRawBytes,
  });
  const expectedLength = request.normalizedArtifact.image.width * request.normalizedArtifact.image.height * 4;
  if (!Number.isInteger(request.rgba.byteLength) || request.rgba.byteLength !== rgba.length
    || rgba.length !== expectedLength) {
    reject("S05_EXPORT_RGBA_LENGTH_MISMATCH", "bound RGBA bytes do not match declared and image dimensions");
  }
  assertSha256(request.rgba.decodedPixelSha256, code, "exportRequest.rgba.decodedPixelSha256");
  const actualPixelSha256 = sha256Slice05(rgba);
  if (request.rgba.decodedPixelSha256 !== actualPixelSha256
    || request.rgba.decodedPixelSha256 !== request.normalizedArtifact.bytes.decodedPixelSha256) {
    reject("S05_EXPORT_RGBA_IDENTITY_MISMATCH", "bound RGBA bytes do not match the normalized decoded-pixel identity");
  }
  let alphaPresent = false;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] < 255) alphaPresent = true;
  }
  if (alphaPresent !== request.normalizedArtifact.image.alphaPresent) {
    reject("S05_EXPORT_ALPHA_IDENTITY_MISMATCH", "bound RGBA alpha does not match the normalized artifact");
  }
  return Object.freeze({ request, rgba, inputFacts: request.normalizedArtifact.image });
}

function validateOutputFacts(facts, expected, actualBytes) {
  const code = "S05_OUTPUT_ORACLE_REJECTED";
  assertExactObject(facts, SLICE05_OUTPUT_FACT_KEYS, code, "oracleFacts");
  if (facts.mime !== "image/png" || !Number.isInteger(facts.byteLength) || facts.byteLength < 1
    || facts.byteLength > SLICE05_SHARP_POLICY.maxOutputBytes) {
    reject(code, "oracle output facts exceed the PNG byte boundary", "oracle");
  }
  assertSha256(facts.fileSha256, code, "oracleFacts.fileSha256");
  assertSha256(facts.decodedPixelSha256, code, "oracleFacts.decodedPixelSha256");
  if (facts.byteLength !== actualBytes.length || facts.fileSha256 !== sha256Slice05(actualBytes)) {
    reject(code, "oracle byte identity does not match the actual worker output", "oracle");
  }
  validateImageFacts(Object.fromEntries(SLICE05_IMAGE_KEYS.map((key) => [key, facts[key]])), code, "oracleFacts.image");
  for (const key of ["decodedPixelSha256", "width", "height", "alphaPresent"]) {
    if (facts[key] !== expected[key]) reject(code, `oracleFacts.${key} does not match the frozen input identity`, "oracle");
  }
  return facts;
}

function validateRuntimeShape(runtime, code, label) {
  assertExactObject(runtime, WORKER_RUNTIME_KEYS, code, label);
  if (runtime.sharpVersion !== "0.35.3" || runtime.platform !== "win32" || runtime.architecture !== "x64") {
    reject(code, `${label} is outside the frozen Sharp/win32-x64 runtime`, "worker");
  }
  assertNonEmptyString(runtime.nodeVersion, code, `${label}.nodeVersion`);
  if (!/^v22\.\d+\.\d+$/.test(runtime.nodeVersion)) {
    reject(code, `${label}.nodeVersion must be the frozen Node 22 runtime`, "worker");
  }
  if (!isPlainObject(runtime.nativeVersions) || Object.keys(runtime.nativeVersions).length !== 29
    || runtime.nativeVersions.sharp !== "0.35.3"
    || Object.entries(runtime.nativeVersions).some(([key, value]) => !/^[A-Za-z0-9_-]+$/.test(key)
      || typeof value !== "string" || value.trim() === "")) {
    reject(code, `${label}.nativeVersions must be the complete 29-entry runtime map`, "worker");
  }
  assertExactObject(runtime.settings, WORKER_RUNTIME_SETTING_KEYS, code, `${label}.settings`);
  const settings = runtime.settings;
  if (settings.concurrency !== 1 || settings.cacheMemoryMaxMiB !== 0 || settings.cacheFilesMax !== 0
    || settings.cacheItemsMax !== 0 || settings.simd !== false || settings.uvThreadpoolSize !== "1"
    || settings.vipsConcurrency !== "1" || settings.ignoreGlobalLibvips !== "1") {
    reject(code, `${label}.settings do not match the frozen deterministic worker policy`, "worker");
  }
}

export function validateWorkerRuntimeSlice05(runtime, expectedRuntime) {
  const code = "S05_WORKER_RUNTIME_VERSION_MISMATCH";
  validateRuntimeShape(expectedRuntime, code, "expectedRuntime");
  validateRuntimeShape(runtime, code, "workerRuntime");
  if (stableStringifySlice05(runtime) !== stableStringifySlice05(expectedRuntime)) {
    reject(code, "worker runtime differs from the frozen attestation-derived expectation", "worker");
  }
  return runtime;
}

export function validateWorkerResponseSlice05(response, { operation, attemptId, expectedRuntime }) {
  const code = "S05_WORKER_PROTOCOL_INVALID";
  assertExactObject(
    response,
    ["protocolVersion", "attemptId", "operation", "status", "outputBytes", "runtime", "durationMs", "resourceUsage"],
    code,
    "workerResponse",
  );
  if (response.protocolVersion !== SLICE05_SHARP_POLICY.protocolVersion || response.attemptId !== attemptId
    || response.operation !== operation || response.status !== "succeeded") {
    reject(code, "worker response identity or state does not match", "worker");
  }
  const outputBytes = checkedByteBuffer(response.outputBytes, {
    codePrefix: "S05_OUTPUT_BYTES",
    label: "workerResponse.outputBytes",
    maximumBytes: SLICE05_SHARP_POLICY.maxOutputBytes,
  });
  if (outputBytes.length === 0) reject("S05_OUTPUT_BYTES_EMPTY", "worker returned no output bytes", "worker");
  validateWorkerRuntimeSlice05(response.runtime, expectedRuntime);
  if (!Number.isInteger(response.durationMs) || response.durationMs < 0
    || response.durationMs > SLICE05_SHARP_POLICY.workerTimeoutMs) {
    reject("S05_WORKER_RESOURCE_LIMIT_EXCEEDED", "worker monotonic duration exceeds the observed deadline", "worker");
  }
  assertExactObject(response.resourceUsage, WORKER_RESOURCE_KEYS, code, "workerResponse.resourceUsage");
  if (WORKER_RESOURCE_KEYS.some((key) => !Number.isInteger(response.resourceUsage[key]) || response.resourceUsage[key] < 0)) {
    reject(code, "worker resource usage fields must be nonnegative integers", "worker");
  }
  if (response.resourceUsage.maxRssKiB > SLICE05_SHARP_POLICY.observedMaxRssKiB) {
    reject(
      "S05_WORKER_RESOURCE_LIMIT_EXCEEDED",
      "worker observed RSS exceeds the 256 MiB research gate; this is an observed gate, not a Windows Job Object cap",
      "worker",
    );
  }
  return {
    outputBytes,
    runtime: response.runtime,
    durationMs: response.durationMs,
    resourceUsage: response.resourceUsage,
  };
}

function outputImageFromFacts(facts) {
  return Object.fromEntries(SLICE05_IMAGE_KEYS.map((key) => [key, facts[key]]));
}

function outputBytesFromFacts(relativePath, facts) {
  return {
    relativePath,
    mime: facts.mime,
    byteLength: facts.byteLength,
    fileSha256: facts.fileSha256,
    decodedPixelSha256: facts.decodedPixelSha256,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function freezeArtifact(record) {
  return deepFreeze({ ...record, contentHash: contentHashSlice05(record) });
}

function defaultWorkerEnvironment() {
  return {
    ...process.env,
    UV_THREADPOOL_SIZE: "1",
    VIPS_CONCURRENCY: "1",
    SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
    TZ: "UTC",
    LANG: "C",
    LC_ALL: "C",
  };
}

export function executeSlice05SharpWorker(
  request,
  {
    signal,
    timeoutMs = SLICE05_SHARP_POLICY.workerTimeoutMs,
    forkImpl = fork,
    workerPath = WORKER_PATH,
  } = {},
) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > SLICE05_SHARP_POLICY.workerTimeoutMs) {
    return Promise.reject(new Slice05AdapterError(
      "S05_WORKER_TIMEOUT_POLICY_INVALID",
      "worker timeout must be within the frozen deadline",
      "runner",
    ));
  }
  if (signal?.aborted) {
    return Promise.reject(new Slice05AdapterError("S05_WORKER_CANCELLED", "worker attempt was cancelled before spawn", "runner"));
  }

  return new Promise((resolve, rejectPromise) => {
    let settled = false;
    let child;
    let timer;
    let killConfirmationTimer;
    let pendingTerminationError;

    const settle = (action, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (killConfirmationTimer) clearTimeout(killConfirmationTimer);
      signal?.removeEventListener("abort", onAbort);
      action(value);
    };
    const requestTermination = (confirmedError) => {
      if (settled || pendingTerminationError) return;
      pendingTerminationError = confirmedError;
      let killRequested = false;
      try {
        killRequested = Boolean(child && !child.killed && child.kill("SIGKILL"));
      } catch {
        killRequested = false;
      }
      if (!killRequested) {
        settle(rejectPromise, new Slice05AdapterError(
          "S05_WORKER_RECONCILIATION_UNKNOWN",
          "worker termination could not be requested or confirmed",
          "runner",
        ));
        return;
      }
      killConfirmationTimer = setTimeout(() => {
        settle(rejectPromise, new Slice05AdapterError(
          "S05_WORKER_RECONCILIATION_UNKNOWN",
          "worker termination was requested but exit was not confirmed",
          "runner",
        ));
      }, SLICE05_SHARP_POLICY.workerKillConfirmationMs);
      killConfirmationTimer.unref?.();
    };
    const onAbort = () => {
      requestTermination(new Slice05AdapterError(
        "S05_WORKER_CANCELLED",
        "worker attempt cancellation and process exit were confirmed",
        "runner",
      ));
    };

    try {
      child = forkImpl(workerPath, [], {
        env: defaultWorkerEnvironment(),
        execArgv: [`--max-old-space-size=${SLICE05_SHARP_POLICY.workerMaxOldSpaceMiB}`],
        serialization: "advanced",
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        windowsHide: true,
      });
    } catch (cause) {
      settle(rejectPromise, new Slice05AdapterError("S05_WORKER_SPAWN_FAILED", "worker process could not start", "runner", { cause }));
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      requestTermination(new Slice05AdapterError(
        "S05_WORKER_TIMEOUT",
        "worker exceeded the frozen deadline and process exit was confirmed",
        "runner",
      ));
    }, timeoutMs);
    timer.unref?.();

    child.once("error", (cause) => {
      if (pendingTerminationError) {
        settle(rejectPromise, new Slice05AdapterError(
          "S05_WORKER_RECONCILIATION_UNKNOWN",
          "worker failed while termination confirmation was pending",
          "runner",
          { cause },
        ));
        return;
      }
      settle(rejectPromise, new Slice05AdapterError("S05_WORKER_PROCESS_ERROR", "worker process failed before a result", "runner", { cause }));
    });
    child.once("exit", (exitCode, exitSignal) => {
      if (!settled) {
        if (pendingTerminationError) {
          settle(rejectPromise, pendingTerminationError);
          return;
        }
        settle(rejectPromise, new Slice05AdapterError(
          "S05_WORKER_EXITED_WITHOUT_RESULT",
          `worker exited before a result (${exitCode ?? "null"}/${exitSignal ?? "none"})`,
          "runner",
        ));
      }
    });
    child.once("message", (message) => {
      if (pendingTerminationError) return;
      if (isPlainObject(message) && message.status === "failed") {
        const allowed = new Set([
          "S05_WORKER_PROTOCOL_INVALID",
          "S05_WORKER_INPUT_INVALID",
          "S05_WORKER_RUNTIME_VERSION_MISMATCH",
          "S05_SHARP_NORMALIZE_FAILED",
          "S05_SHARP_EXPORT_FAILED",
          "S05_WORKER_OUTPUT_INVALID",
        ]);
        const workerCode = allowed.has(message.code) ? message.code : "S05_WORKER_PROTOCOL_INVALID";
        settle(rejectPromise, new Slice05AdapterError(workerCode, "worker returned a fail-closed result", "worker"));
        return;
      }
      settle(resolve, message);
    });
    try {
      child.send(request, (cause) => {
        if (cause) {
          requestTermination(new Slice05AdapterError(
            "S05_WORKER_SEND_FAILED",
            "worker request could not be sent and process exit was confirmed",
            "runner",
            { cause },
          ));
        }
      });
    } catch (cause) {
      requestTermination(new Slice05AdapterError(
        "S05_WORKER_SEND_FAILED",
        "worker request could not be sent and process exit was confirmed",
        "runner",
        { cause },
      ));
    }
  });
}

function validateExecutionDependencies({
  executeWorker,
  verifyOutput,
  commitOutput,
  adapterRef,
  runtimeRef,
  hardwareRef,
  expectedRuntime,
  clock,
}) {
  if (typeof executeWorker !== "function" || typeof verifyOutput !== "function" || typeof commitOutput !== "function"
    || typeof clock !== "function") {
    reject("S05_ADAPTER_DEPENDENCY_INVALID", "worker, oracle, atomic commit and clock must be injected", "configuration");
  }
  validateAdapterRef(adapterRef, "S05_ADAPTER_DEPENDENCY_INVALID", "adapterRef");
  validateOpaqueRef(runtimeRef, "S05_ADAPTER_DEPENDENCY_INVALID", "runtimeRef");
  validateOpaqueRef(hardwareRef, "S05_ADAPTER_DEPENDENCY_INVALID", "hardwareRef");
  try {
    validateWorkerRuntimeSlice05(expectedRuntime, expectedRuntime);
  } catch (cause) {
    reject("S05_ADAPTER_DEPENDENCY_INVALID", "expectedRuntime must be a frozen closed runtime expectation", "configuration", { cause });
  }
}

async function commitArtifact(commitOutput, operation, outputBytes, artifact) {
  let commit;
  try {
    commit = await commitOutput(Object.freeze({
      schemaVersion: "atomic-output-request.slice05.v0",
      operation,
      artifactId: artifact.artifactId,
      relativePath: artifact.bytes.relativePath,
      expectedFileSha256: artifact.bytes.fileSha256,
      bytes: outputBytes,
      artifact,
    }));
  } catch (cause) {
    reject("S05_ATOMIC_OUTPUT_COMMIT_FAILED", "atomic output commit did not complete", "commit", { cause });
  }
  assertExactObject(commit, ["status", "relativePath", "fileSha256"], "S05_ATOMIC_OUTPUT_COMMIT_FAILED", "commitResult");
  if (commit.status !== "committed" || commit.relativePath !== artifact.bytes.relativePath
    || commit.fileSha256 !== artifact.bytes.fileSha256) {
    reject("S05_ATOMIC_OUTPUT_COMMIT_FAILED", "atomic output commit identity does not match", "commit");
  }
  return Object.freeze(commit);
}

export function createSlice05SharpAdapter({
  executeWorker = executeSlice05SharpWorker,
  verifyOutput,
  commitOutput,
  adapterRef,
  runtimeRef,
  hardwareRef,
  expectedRuntime,
  clock = () => new Date().toISOString(),
}) {
  validateExecutionDependencies({
    executeWorker,
    verifyOutput,
    commitOutput,
    adapterRef,
    runtimeRef,
    hardwareRef,
    expectedRuntime,
    clock,
  });
  const frozenExpectedRuntime = deepFreeze(structuredClone(expectedRuntime));

  return Object.freeze({
    async normalize(request, { signal } = {}) {
      const validated = validateNormalizeRequestSlice05(request);
      const workerRequest = Object.freeze({
        protocolVersion: SLICE05_SHARP_POLICY.protocolVersion,
        attemptId: request.attempt.idempotencyKey,
        operation: "normalize",
        inputBytes: Buffer.from(request.sourceBytes.buffer, request.sourceBytes.byteOffset, request.sourceBytes.byteLength),
      });
      const workerResponse = await executeWorker(workerRequest, {
        signal,
        timeoutMs: SLICE05_SHARP_POLICY.workerTimeoutMs,
      });
      const { outputBytes, runtime, durationMs, resourceUsage } = validateWorkerResponseSlice05(workerResponse, {
        operation: "normalize",
        attemptId: workerRequest.attemptId,
        expectedRuntime: frozenExpectedRuntime,
      });
      let oracleFacts;
      try {
        oracleFacts = await verifyOutput(Object.freeze({
          operation: "normalize",
          bytes: outputBytes,
          expected: validated.inputFacts,
        }));
      } catch (cause) {
        reject("S05_OUTPUT_ORACLE_REJECTED", "independent oracle rejected normalized bytes", "oracle", { cause });
      }
      const facts = validateOutputFacts(oracleFacts, validated.inputFacts, outputBytes);
      const createdAt = clock();
      assertUtcDateTime(createdAt, "S05_ARTIFACT_DATE_INVALID", "createdAt");
      const artifact = freezeArtifact({
        schemaVersion: SLICE05_SHARP_POLICY.normalizedArtifactVersion,
        artifactId: request.outputArtifactId,
        operation: "normalize",
        parent: {
          sourceAssetId: request.source.sourceAssetId,
          sourceFileSha256: request.source.fileSha256,
          sourceDecodedPixelSha256: request.source.decodedPixelSha256,
          sourceManifestSha256: request.source.sourceManifestSha256,
        },
        capabilityContractRef: structuredClone(request.capabilityContractRef),
        candidateRef: structuredClone(request.candidateRef),
        adapterRef: structuredClone(adapterRef),
        producerRef: candidateProducerRef(adapterRef),
        runtimeRef: structuredClone(runtimeRef),
        hardwareRef: structuredClone(hardwareRef),
        attempt: structuredClone(request.attempt),
        bytes: outputBytesFromFacts(request.outputRelativePath, facts),
        image: outputImageFromFacts(facts),
        createdAt,
      });
      validateNormalizedArtifactSlice05(artifact);
      const commit = await commitArtifact(commitOutput, "normalize", outputBytes, artifact);
      return Object.freeze({ status: "succeeded", artifact, runtime, durationMs, resourceUsage, commit });
    },

    async exportPng(request, { signal } = {}) {
      const validated = validateExportRequestSlice05(request);
      const workerRequest = Object.freeze({
        protocolVersion: SLICE05_SHARP_POLICY.protocolVersion,
        attemptId: request.attempt.idempotencyKey,
        operation: "export",
        rgba: validated.rgba,
        width: request.normalizedArtifact.image.width,
        height: request.normalizedArtifact.image.height,
      });
      const workerResponse = await executeWorker(workerRequest, {
        signal,
        timeoutMs: SLICE05_SHARP_POLICY.workerTimeoutMs,
      });
      const { outputBytes, runtime, durationMs, resourceUsage } = validateWorkerResponseSlice05(workerResponse, {
        operation: "export",
        attemptId: workerRequest.attemptId,
        expectedRuntime: frozenExpectedRuntime,
      });
      const expected = {
        ...request.normalizedArtifact.image,
        decodedPixelSha256: request.rgba.decodedPixelSha256,
      };
      let oracleFacts;
      try {
        oracleFacts = await verifyOutput(Object.freeze({ operation: "export", bytes: outputBytes, expected }));
      } catch (cause) {
        reject("S05_OUTPUT_ORACLE_REJECTED", "independent oracle rejected delivery bytes", "oracle", { cause });
      }
      const facts = validateOutputFacts(oracleFacts, expected, outputBytes);
      const createdAt = clock();
      assertUtcDateTime(createdAt, "S05_ARTIFACT_DATE_INVALID", "createdAt");
      const artifact = freezeArtifact({
        schemaVersion: SLICE05_SHARP_POLICY.deliveryArtifactVersion,
        artifactId: request.outputArtifactId,
        operation: "export",
        parent: {
          normalizedImageId: request.normalizedArtifact.artifactId,
          normalizedArtifactSha256: request.normalizedArtifact.contentHash,
          normalizedFileSha256: request.normalizedArtifact.bytes.fileSha256,
          normalizedDecodedPixelSha256: request.normalizedArtifact.bytes.decodedPixelSha256,
        },
        capabilityContractRef: structuredClone(request.capabilityContractRef),
        candidateRef: structuredClone(request.candidateRef),
        adapterRef: structuredClone(adapterRef),
        producerRef: candidateProducerRef(adapterRef),
        runtimeRef: structuredClone(runtimeRef),
        hardwareRef: structuredClone(hardwareRef),
        attempt: structuredClone(request.attempt),
        bytes: outputBytesFromFacts(request.outputRelativePath, facts),
        image: outputImageFromFacts(facts),
        createdAt,
      });
      validateDeliveryArtifactSlice05(artifact);
      const commit = await commitArtifact(commitOutput, "export", outputBytes, artifact);
      return Object.freeze({ status: "succeeded", artifact, runtime, durationMs, resourceUsage, commit });
    },
  });
}
