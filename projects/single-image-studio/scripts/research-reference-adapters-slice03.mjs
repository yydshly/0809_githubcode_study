import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_SIGNATURE_HEX = PNG_SIGNATURE.toString("hex");
const MAX_REFERENCE_PNG_BYTES = 1024 * 1024;
const MAX_REFERENCE_DIMENSION = 256;
const NORMALIZE_CONTRACT = "CC-CAP02-NORMALIZE@0.2.0";

export const SLICE03_TECHNICAL_OBSERVER_CONTRACT = "S03-TECHNICAL-OBSERVER@0.3.0";

const NORMALIZED_ARTIFACT_KEYS = Object.freeze([
  "schemaVersion",
  "normalizedImageId",
  "parentImageAssetId",
  "capabilityContractRef",
  "mime",
  "width",
  "height",
  "orientation",
  "colorProfile",
  "alphaPresent",
  "premultiply",
  "metadataPolicy",
  "pixelSha256",
  "createdAt",
]);

const PARENT_IDENTITY_KEYS = Object.freeze([
  "normalizedImageId",
  "parentImageAssetId",
  "normalizedFileSha256",
  "decodedPixelSha256",
]);

export class Slice03ObserverError extends TypeError {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "Slice03ObserverError";
    this.code = code;
  }
}

function reject(code, message) {
  throw new Slice03ObserverError(code, message);
}

function assertExactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject("OBS_OBJECT_SHAPE_MISMATCH", `${label} must be an object`);
  }
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    reject("OBS_OBJECT_SHAPE_MISMATCH", `${label} must contain exactly: ${keys.join(", ")}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    reject("OBS_VALUE_INVALID", `${label} must be a non-empty string`);
  }
}

function assertSha256(value, label, prefix = false) {
  const pattern = prefix ? /^sha256:[a-f0-9]{64}$/ : /^[a-f0-9]{64}$/;
  if (typeof value !== "string" || !pattern.test(value)) {
    reject("OBS_HASH_DECLARATION_INVALID", `${label} must be a lowercase SHA-256${prefix ? " reference" : ""}`);
  }
}

function assertUtcDateTime(value, label) {
  if (typeof value !== "string") reject("OBS_DATE_INVALID", `${label} must be a UTC date-time`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  const timestamp = match ? Date.parse(value) : Number.NaN;
  if (!match || !Number.isFinite(timestamp)) reject("OBS_DATE_INVALID", `${label} must be a valid UTC date-time`);
  const parsed = new Date(timestamp);
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day || parsed.getUTCHours() !== hour
    || parsed.getUTCMinutes() !== minute || parsed.getUTCSeconds() !== second) {
    reject("OBS_DATE_INVALID", `${label} must be a valid UTC date-time`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checkedBytes(input) {
  if (!(input instanceof Uint8Array)) reject("OBS_BYTES_TYPE_INVALID", "normalizedBytes must be bytes");
  // This size gate intentionally precedes Buffer conversion and every hash operation.
  if (input.byteLength > MAX_REFERENCE_PNG_BYTES) {
    reject("OBS_BYTES_LIMIT_EXCEEDED", "normalizedBytes exceed the 1 MiB reference limit");
  }
  if (input.byteLength < 33) reject("OBS_PNG_TRUNCATED", "normalizedBytes are too short for a PNG");
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

/*
 * This small decoder is intentionally independent from the Slice 02 producer
 * adapter. Sharing the producer decoder would make the observer repeat the same
 * parser decision instead of independently reopening the normalized bytes.
 * It remains a closed fixture-reference parser, not a production decoder.
 */
function decodeClosedReferencePng(input) {
  const bytes = checkedBytes(input);
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    reject("OBS_PNG_SIGNATURE_MISMATCH", "normalizedBytes do not carry the PNG signature");
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
    if (dataEnd + 4 > bytes.length) reject("OBS_PNG_CHUNK_TRUNCATED", `PNG ${type} chunk exceeds input length`);
    const storedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (storedCrc !== actualCrc) reject("OBS_PNG_CRC_MISMATCH", `PNG ${type} chunk CRC does not match`);

    if (type === "IHDR") {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        reject("OBS_PNG_PROFILE_MISMATCH", "PNG must contain one leading 13-byte IHDR chunk");
      }
      sawHeader = true;
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      const bitDepth = bytes[dataStart + 8];
      const colorType = bytes[dataStart + 9];
      const compression = bytes[dataStart + 10];
      const filter = bytes[dataStart + 11];
      const interlace = bytes[dataStart + 12];
      if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
        reject("OBS_PNG_DIMENSIONS_INVALID", "PNG dimensions must be positive integers");
      }
      if (width > MAX_REFERENCE_DIMENSION || height > MAX_REFERENCE_DIMENSION) {
        reject("OBS_PNG_DIMENSION_LIMIT_EXCEEDED", "PNG dimensions exceed the 256x256 reference limit");
      }
      if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filter !== 0 || interlace !== 0) {
        reject("OBS_PNG_PROFILE_MISMATCH", "observer accepts only non-interlaced RGBA8 PNG with standard compression and filtering");
      }
    } else if (type === "sRGB") {
      if (!sawHeader || sawSrgb || sawImageData || length !== 1 || bytes[dataStart] > 3) {
        reject("OBS_PNG_COLOR_PROFILE_MISMATCH", "PNG must contain one valid sRGB chunk before image data");
      }
      sawSrgb = true;
    } else if (type === "IDAT") {
      if (!sawHeader || !sawSrgb || imageDataEnded || length === 0) {
        reject("OBS_PNG_PROFILE_MISMATCH", "PNG IDAT chunks must be non-empty, contiguous, and follow sRGB");
      }
      sawImageData = true;
      compressedParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      if (!sawImageData || sawEnd || length !== 0) {
        reject("OBS_PNG_PROFILE_MISMATCH", "PNG must contain one empty IEND after image data");
      }
      sawEnd = true;
    } else {
      reject("OBS_PNG_PROFILE_MISMATCH", `PNG ${type} chunk is outside the closed Slice 03 reference profile`);
    }

    offset = dataEnd + 4;
    if (sawImageData && type !== "IDAT" && type !== "IEND") imageDataEnded = true;
    if (type === "IEND") break;
  }

  if (!sawHeader || !sawSrgb || !sawImageData || !sawEnd || offset !== bytes.length) {
    reject("OBS_PNG_PROFILE_MISMATCH", "PNG must contain exact IHDR/sRGB/IDAT/IEND content and end at IEND");
  }

  const stride = width * 4;
  const expectedLength = (stride + 1) * height;
  const compressed = Buffer.concat(compressedParts);
  let inflated;
  let consumed;
  try {
    const result = inflateSync(compressed, { info: true, maxOutputLength: expectedLength });
    inflated = result.buffer;
    consumed = result.engine.bytesWritten;
  } catch (error) {
    reject("OBS_PNG_DECODE_FAILED", `PNG image data did not decode within the frozen profile: ${error.message}`);
  }
  if (consumed !== compressed.length || inflated.length !== expectedLength) {
    reject("OBS_PNG_DECODE_FAILED", "PNG image data has trailing compressed bytes or an unexpected decoded length");
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    if (inflated[rowStart] !== 0) reject("OBS_PNG_FILTER_MISMATCH", "observer accepts only PNG scanline filter 0");
    rgba.set(inflated.subarray(rowStart + 1, rowStart + 1 + stride), y * stride);
  }
  return { bytes, width, height, rgba };
}

function validateNormalizedArtifact(artifact) {
  assertExactObject(artifact, NORMALIZED_ARTIFACT_KEYS, "normalizedArtifact");
  assertNonEmptyString(artifact.normalizedImageId, "normalizedArtifact.normalizedImageId");
  assertNonEmptyString(artifact.parentImageAssetId, "normalizedArtifact.parentImageAssetId");
  assertSha256(artifact.pixelSha256, "normalizedArtifact.pixelSha256");
  assertUtcDateTime(artifact.createdAt, "normalizedArtifact.createdAt");
  if (artifact.mime !== "image/png") reject("OBS_MIME_MISMATCH", "normalizedArtifact.mime must be image/png");
  if (artifact.schemaVersion !== "normalized-image.v0"
    || artifact.capabilityContractRef !== NORMALIZE_CONTRACT
    || !Number.isInteger(artifact.width) || artifact.width < 1 || artifact.width > MAX_REFERENCE_DIMENSION
    || !Number.isInteger(artifact.height) || artifact.height < 1 || artifact.height > MAX_REFERENCE_DIMENSION
    || artifact.orientation !== 1 || artifact.colorProfile !== "srgb"
    || typeof artifact.alphaPresent !== "boolean" || artifact.premultiply !== "straight"
    || artifact.metadataPolicy !== "strip-all-except-color-contract") {
    reject("OBS_ARTIFACT_PROFILE_MISMATCH", "normalizedArtifact is outside the frozen Slice 03 reference profile");
  }
}

function validateParentIdentity(identity) {
  assertExactObject(identity, PARENT_IDENTITY_KEYS, "parentArtifactIdentity");
  assertNonEmptyString(identity.normalizedImageId, "parentArtifactIdentity.normalizedImageId");
  assertNonEmptyString(identity.parentImageAssetId, "parentArtifactIdentity.parentImageAssetId");
  assertSha256(identity.normalizedFileSha256, "parentArtifactIdentity.normalizedFileSha256");
  assertSha256(identity.decodedPixelSha256, "parentArtifactIdentity.decodedPixelSha256");
}

function unknown(reason) {
  return {
    value: "unknown",
    unknownReason: reason,
    confidence: { lower: 0, upper: 0 },
  };
}

/**
 * Reopens a normalized fixture PNG and emits only byte-backed technical facts.
 * `parentArtifactIdentity` is expected to come from an independently frozen
 * manifest/contract chain; requiring it prevents the supplied bytes from
 * self-asserting their own identity.
 */
export function observeNormalizedImageSlice03({
  normalizedArtifact,
  normalizedBytes,
  parentArtifactIdentity,
  implementationRef,
  observedAt,
}) {
  validateNormalizedArtifact(normalizedArtifact);
  validateParentIdentity(parentArtifactIdentity);
  assertSha256(implementationRef, "implementationRef", true);
  assertUtcDateTime(observedAt, "observedAt");

  const decoded = decodeClosedReferencePng(normalizedBytes);
  const normalizedFileSha256 = sha256(decoded.bytes);
  const decodedPixelSha256 = sha256(Buffer.from(decoded.rgba));
  const alphaPresent = decoded.rgba.some((value, index) => index % 4 === 3 && value < 255);

  if (parentArtifactIdentity.normalizedImageId !== normalizedArtifact.normalizedImageId
    || parentArtifactIdentity.parentImageAssetId !== normalizedArtifact.parentImageAssetId) {
    reject("OBS_PARENT_IDENTITY_MISMATCH", "parent identity does not match the normalized artifact");
  }
  if (parentArtifactIdentity.normalizedFileSha256 !== normalizedFileSha256) {
    reject("OBS_FILE_HASH_MISMATCH", "normalized byte hash does not match the frozen parent identity");
  }
  if (decoded.width !== normalizedArtifact.width || decoded.height !== normalizedArtifact.height) {
    reject("OBS_DIMENSION_MISMATCH", "decoded dimensions do not match the normalized artifact");
  }
  if (decodedPixelSha256 !== normalizedArtifact.pixelSha256
    || decodedPixelSha256 !== parentArtifactIdentity.decodedPixelSha256) {
    reject("OBS_PIXEL_HASH_MISMATCH", "decoded pixel hash does not match the artifact identity chain");
  }
  if (alphaPresent !== normalizedArtifact.alphaPresent) {
    reject("OBS_ALPHA_MISMATCH", "decoded non-opaque alpha presence does not match the normalized artifact");
  }

  return {
    schemaVersion: "technical-observer-result.slice03.v0",
    observerContractRef: SLICE03_TECHNICAL_OBSERVER_CONTRACT,
    implementationRef,
    parent: {
      normalizedImageId: normalizedArtifact.normalizedImageId,
      parentImageAssetId: normalizedArtifact.parentImageAssetId,
      normalizedFileSha256,
      decodedPixelSha256,
    },
    sourceFormatFacts: {
      status: "not-observed-from-normalized-bytes",
      mime: unknown("source-mime-not-observable-from-normalized-bytes"),
      format: unknown("source-format-not-observable-from-normalized-bytes"),
    },
    normalizedArtifactFacts: {
      mime: "image/png",
      fileSignatureHex: PNG_SIGNATURE_HEX,
      byteLength: decoded.bytes.length,
      fileSha256: normalizedFileSha256,
      decodedWidth: decoded.width,
      decodedHeight: decoded.height,
      orientation: 1,
      colorProfile: "srgb",
      alphaChannelPresent: true,
      alphaPresent,
      alphaRepresentation: "straight-unpremultiplied",
      decodedPixelSha256,
      evidenceMethod: "full-reference-decode-not-header-probe",
    },
    quality: {
      blur: unknown("blur-observer-not-frozen"),
      exposure: unknown("exposure-observer-not-frozen"),
      noise: unknown("noise-observer-not-frozen"),
    },
    subject: {
      primarySubjectType: unknown("primary-subject-type-observer-not-frozen"),
      subjectCount: unknown("subject-count-observer-not-frozen"),
      personCount: unknown("person-count-observer-not-frozen"),
    },
    content: {
      textPresence: unknown("text-presence-observer-not-frozen"),
      backgroundComplexity: unknown("background-complexity-observer-not-frozen"),
    },
    observedAt,
  };
}
