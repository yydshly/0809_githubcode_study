import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const NORMALIZE_CONTRACT = "CC-CAP02-NORMALIZE@0.2.0";
const EXPORT_CONTRACT = "CC-CAP02-EXPORT@0.2.0";
const SOURCE_CARD_CONTRACT = "CC-CAP03-SOURCE-CARD-V0@0.2.0";
const MATTE_BASELINE_CONTRACT = "CC-CAP04-MATTE-SIMPLE@0.2.0";
const MAX_REFERENCE_PNG_BYTES = 1024 * 1024;
const NORMALIZED_ARTIFACT_KEYS = Object.freeze([
  "schemaVersion", "normalizedImageId", "parentImageAssetId", "capabilityContractRef", "mime",
  "width", "height", "orientation", "colorProfile", "alphaPresent", "premultiply",
  "metadataPolicy", "pixelSha256", "createdAt",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function assertExactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} must contain exactly: ${keys.join(", ")}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
}

export function isValidUtcDateTime(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const parsed = new Date(timestamp);
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month
    && parsed.getUTCDate() === day && parsed.getUTCHours() === hour
    && parsed.getUTCMinutes() === minute && parsed.getUTCSeconds() === second;
}

function assertUtcDateTime(value, label) {
  if (!isValidUtcDateTime(value)) {
    throw new TypeError(`${label} must be a valid UTC date-time`);
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.allocUnsafe(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

export function encodeReferenceSrgbPng(width, height, rgba) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new TypeError("PNG dimensions must be positive integers");
  }
  if (!(rgba instanceof Uint8Array) || rgba.length !== width * height * 4) {
    throw new TypeError("RGBA byte length does not match PNG dimensions");
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    scanlines[rowOffset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(scanlines, rowOffset + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("sRGB", Buffer.from([0])),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function decodeReferencePng(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("Reference adapter PNG input must be bytes");
  if (bytes.byteLength > MAX_REFERENCE_PNG_BYTES) throw new RangeError("Reference adapter PNG limit is 1 MiB");
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new TypeError("Reference adapter accepts only PNG input");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let sawHeader = false;
  let sawEnd = false;
  let srgbDeclared = false;
  let sawImageData = false;
  let imageDataEnded = false;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) throw new TypeError("PNG chunk exceeds input length");
    const storedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (storedCrc !== actualCrc) throw new TypeError(`PNG ${type} chunk CRC mismatch`);
    if (type === "IHDR") {
      if (sawHeader || offset !== 8 || length !== 13) throw new TypeError("PNG must contain one leading IHDR chunk");
      sawHeader = true;
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0) {
        throw new TypeError("Interlaced or non-standard PNG is outside the reference scope");
      }
    } else if (type === "sRGB") {
      if (!sawHeader || srgbDeclared || sawImageData || length !== 1 || bytes[dataStart] > 3) {
        throw new TypeError("PNG must contain one valid sRGB chunk before image data");
      }
      srgbDeclared = true;
    } else if (type === "IDAT") {
      if (!sawHeader || !srgbDeclared || imageDataEnded) throw new TypeError("PNG IDAT chunks must be contiguous and follow sRGB");
      sawImageData = true;
      idat.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      if (!sawImageData || length !== 0) throw new TypeError("PNG IEND must be empty and follow image data");
      sawEnd = true;
    } else {
      throw new TypeError(`PNG ${type} chunk is outside the closed reference profile`);
    }
    offset = dataEnd + 4;
    if (sawImageData && type !== "IDAT" && type !== "IEND") imageDataEnded = true;
    if (type === "IEND") break;
  }

  if (!sawHeader || !sawEnd || offset !== bytes.length) throw new TypeError("PNG must end exactly at IEND");
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("PNG is missing valid dimensions");
  }
  if (width > 256 || height > 256) throw new RangeError("Reference adapter fixture limit is 256x256");
  if (bitDepth !== 8 || colorType !== 6) throw new TypeError("Reference adapter accepts only RGBA8 PNG");
  if (idat.length === 0) throw new TypeError("PNG is missing image data");

  const stride = width * 4;
  const expectedScanlineLength = (stride + 1) * height;
  const scanlines = inflateSync(Buffer.concat(idat), { maxOutputLength: expectedScanlineLength });
  if (scanlines.length !== expectedScanlineLength) throw new TypeError("Unexpected PNG scanline length");
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    if (scanlines[rowStart] !== 0) throw new TypeError("Reference adapter accepts only PNG filter 0");
    rgba.set(scanlines.subarray(rowStart + 1, rowStart + 1 + stride), y * stride);
  }
  return { width, height, rgba, srgbDeclared };
}

export function normalizeFixturePng({ bytes, imageAsset, normalizedImageId, createdAt }) {
  assertExactObject(imageAsset, [
    "schemaVersion", "imageAssetId", "mime", "byteLength", "fileSha256", "orientation",
    "colorProfile", "premultiply", "sourceClass", "createdAt",
  ], "imageAsset");
  if (imageAsset.schemaVersion !== "image-asset.v0" || imageAsset.mime !== "image/png"
    || imageAsset.orientation !== 1 || imageAsset.colorProfile !== "srgb"
    || imageAsset.premultiply !== "straight" || imageAsset.sourceClass !== "project-original-synthetic") {
    throw new TypeError("ImageAsset is outside the frozen normalization profile");
  }
  if (!(bytes instanceof Uint8Array)) throw new TypeError("ImageAsset input must be bytes");
  if (bytes.byteLength > MAX_REFERENCE_PNG_BYTES || imageAsset.byteLength > MAX_REFERENCE_PNG_BYTES) {
    throw new RangeError("ImageAsset and PNG bytes must not exceed 1 MiB");
  }
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (imageAsset.byteLength !== bytes.length || imageAsset.fileSha256 !== sha256(bytes)) {
    throw new TypeError("ImageAsset byte length or SHA-256 does not match the supplied bytes");
  }
  assertNonEmptyString(imageAsset.imageAssetId, "imageAsset.imageAssetId");
  assertNonEmptyString(normalizedImageId, "normalizedImageId");
  assertUtcDateTime(imageAsset.createdAt, "imageAsset.createdAt");
  assertUtcDateTime(createdAt, "createdAt");
  const decoded = decodeReferencePng(bytes);
  if (!decoded.srgbDeclared) throw new TypeError("Reference normalization requires embedded sRGB input");
  const normalizedBytes = encodeReferenceSrgbPng(decoded.width, decoded.height, decoded.rgba);
  const reopened = decodeReferencePng(normalizedBytes);
  const inputPixelSha256 = sha256(Buffer.from(decoded.rgba));
  if (reopened.width !== decoded.width || reopened.height !== decoded.height
    || !reopened.srgbDeclared || sha256(Buffer.from(reopened.rgba)) !== inputPixelSha256) {
    throw new TypeError("Normalized PNG failed mandatory reopen verification");
  }
  const alphaPresent = reopened.rgba.some((value, index) => index % 4 === 3 && value < 255);
  return {
    bytes: normalizedBytes,
    artifact: {
      schemaVersion: "normalized-image.v0",
      normalizedImageId,
      parentImageAssetId: imageAsset.imageAssetId,
      capabilityContractRef: NORMALIZE_CONTRACT,
      mime: "image/png",
      width: decoded.width,
      height: decoded.height,
      orientation: 1,
      colorProfile: "srgb",
      alphaPresent,
      premultiply: "straight",
      metadataPolicy: "strip-all-except-color-contract",
      pixelSha256: inputPixelSha256,
      createdAt,
    },
  };
}

export function exportFixturePng({ rgba, pixelBuffer, deliveryArtifactId, createdAt }) {
  assertExactObject(pixelBuffer, [
    "schemaVersion", "pixelBufferId", "parentArtifactId", "width", "height", "mime", "colorProfile",
    "alphaPresent", "premultiply", "pixelSha256", "sourceClass",
  ], "pixelBuffer");
  if (pixelBuffer.schemaVersion !== "rgba8-pixel-buffer.v0" || pixelBuffer.mime !== "image/png"
    || pixelBuffer.colorProfile !== "srgb" || pixelBuffer.premultiply !== "straight"
    || pixelBuffer.sourceClass !== "project-original-synthetic") {
    throw new TypeError("RGBA8 pixel buffer is outside the frozen export profile");
  }
  const { width, height } = pixelBuffer;
  if (!Number.isInteger(width) || width < 1 || width > 256 || !Number.isInteger(height) || height < 1 || height > 256
    || !(rgba instanceof Uint8Array) || rgba.length !== width * height * 4) {
    throw new TypeError("RGBA byte length or dimensions do not match the delivery profile");
  }
  const inputPixelSha256 = sha256(Buffer.from(rgba));
  const inputAlphaPresent = rgba.some((value, index) => index % 4 === 3 && value < 255);
  if (pixelBuffer.pixelSha256 !== inputPixelSha256 || pixelBuffer.alphaPresent !== inputAlphaPresent) {
    throw new TypeError("RGBA8 pixel buffer declarations do not match supplied pixels");
  }
  assertNonEmptyString(pixelBuffer.pixelBufferId, "pixelBuffer.pixelBufferId");
  assertNonEmptyString(pixelBuffer.parentArtifactId, "pixelBuffer.parentArtifactId");
  assertNonEmptyString(deliveryArtifactId, "deliveryArtifactId");
  assertUtcDateTime(createdAt, "createdAt");
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  const reopened = decodeReferencePng(bytes);
  const alphaPresent = reopened.rgba.some((value, index) => index % 4 === 3 && value < 255);
  const reopenedPixelSha256 = sha256(Buffer.from(reopened.rgba));
  const reopenPassed = reopened.width === width && reopened.height === height && reopened.srgbDeclared
    && alphaPresent === inputAlphaPresent && reopenedPixelSha256 === inputPixelSha256;
  if (!reopenPassed) throw new TypeError("Delivery PNG failed mandatory reopen verification");
  return {
    bytes,
    artifact: {
      schemaVersion: "delivery-artifact.v0",
      deliveryArtifactId,
      parentArtifactId: pixelBuffer.parentArtifactId,
      capabilityContractRef: EXPORT_CONTRACT,
      mime: "image/png",
      width,
      height,
      colorProfile: "srgb",
      alphaPresent,
      premultiply: "straight",
      metadataPolicy: "strip-all-except-color-contract",
      byteLength: bytes.length,
      fileSha256: sha256(bytes),
      reopenVerification: {
        passed: true,
        decodedMime: "image/png",
        decodedWidth: reopened.width,
        decodedHeight: reopened.height,
        decodedAlphaPresent: alphaPresent,
        decodedColorProfile: reopened.srgbDeclared ? "srgb" : "unknown",
        decodedPixelSha256: reopenedPixelSha256,
      },
      createdAt,
    },
  };
}

function observation(value, observerContract, confidenceLower, confidenceUpper, unknownReason) {
  return {
    value,
    observerContract,
    confidence: { lower: confidenceLower, upper: confidenceUpper },
    unknownReason,
  };
}

export function inspectNormalizedImage({ normalizedArtifact, normalizedBytes }) {
  assertExactObject(normalizedArtifact, NORMALIZED_ARTIFACT_KEYS, "normalizedArtifact");
  if (normalizedArtifact.schemaVersion !== "normalized-image.v0"
    || normalizedArtifact.capabilityContractRef !== NORMALIZE_CONTRACT
    || normalizedArtifact.mime !== "image/png" || normalizedArtifact.orientation !== 1
    || normalizedArtifact.colorProfile !== "srgb" || normalizedArtifact.premultiply !== "straight"
    || normalizedArtifact.metadataPolicy !== "strip-all-except-color-contract") {
    throw new TypeError("NormalizedImage artifact is outside the frozen SourceCard profile");
  }
  assertNonEmptyString(normalizedArtifact.normalizedImageId, "normalizedArtifact.normalizedImageId");
  assertNonEmptyString(normalizedArtifact.parentImageAssetId, "normalizedArtifact.parentImageAssetId");
  assertUtcDateTime(normalizedArtifact.createdAt, "normalizedArtifact.createdAt");
  const decoded = decodeReferencePng(normalizedBytes);
  const alphaPresent = decoded.rgba.some((value, index) => index % 4 === 3 && value < 255);
  const pixelSha256 = sha256(Buffer.from(decoded.rgba));
  if (!decoded.srgbDeclared || normalizedArtifact.width !== decoded.width || normalizedArtifact.height !== decoded.height
    || normalizedArtifact.alphaPresent !== alphaPresent || normalizedArtifact.pixelSha256 !== pixelSha256) {
    throw new TypeError("NormalizedImage artifact does not match reopened normalized bytes");
  }
  return {
    mime: "image/png", width: decoded.width, height: decoded.height, orientation: 1,
    colorProfile: "srgb", alphaPresent, pixelSha256,
  };
}

export function buildSourceCardV0({ normalizedArtifact, normalizedBytes, sourceCardId, createdAt }) {
  const technicalFacts = inspectNormalizedImage({ normalizedArtifact, normalizedBytes });
  assertNonEmptyString(sourceCardId, "sourceCardId");
  assertUtcDateTime(createdAt, "createdAt");
  const technicalObserver = "reference-png-byte-observer.v0.2.0";
  const unresolvedObserver = "observer-not-frozen.v0.2.0";
  const unknown = (field) => observation("unknown", unresolvedObserver, 0, 0, `${field}-observer-not-frozen`);
  return {
    schemaVersion: "source-card.v0",
    sourceCardId,
    parentNormalizedImageId: normalizedArtifact.normalizedImageId,
    capabilityContractRef: SOURCE_CARD_CONTRACT,
    technical: {
      mime: observation(technicalFacts.mime, technicalObserver, 1, 1, "not-applicable"),
      width: observation(technicalFacts.width, technicalObserver, 1, 1, "not-applicable"),
      height: observation(technicalFacts.height, technicalObserver, 1, 1, "not-applicable"),
      orientation: observation(technicalFacts.orientation, technicalObserver, 1, 1, "not-applicable"),
      colorProfile: observation(technicalFacts.colorProfile, technicalObserver, 1, 1, "not-applicable"),
      alphaPresent: observation(technicalFacts.alphaPresent, technicalObserver, 1, 1, "not-applicable"),
    },
    quality: {
      blur: unknown("blur"),
      exposure: unknown("exposure"),
      noise: unknown("noise"),
    },
    subject: {
      primarySubjectType: unknown("primary-subject-type"),
      subjectCount: unknown("subject-count"),
      personCount: unknown("person-count"),
    },
    content: {
      textPresence: unknown("text-presence"),
      backgroundComplexity: unknown("background-complexity"),
    },
    createdAt,
  };
}

export function averageHashRgba(width, height, rgba) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1
    || !(rgba instanceof Uint8Array) || rgba.length !== width * height * 4) {
    throw new TypeError("Average hash input does not match RGBA dimensions");
  }
  const samples = [];
  for (let sy = 0; sy < 8; sy += 1) {
    for (let sx = 0; sx < 8; sx += 1) {
      const x = Math.min(width - 1, Math.floor((sx + 0.5) * width / 8));
      const y = Math.min(height - 1, Math.floor((sy + 0.5) * height / 8));
      const offset = (y * width + x) * 4;
      samples.push(rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114);
    }
  }
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  let bits = 0n;
  for (const sample of samples) bits = (bits << 1n) | (sample >= average ? 1n : 0n);
  return bits.toString(16).padStart(16, "0");
}

export function runColorDistanceMatteBaseline({
  normalizedBytes,
  normalizedArtifact,
  subjectMap,
  alphaMatteId,
  createdAt,
  lowThreshold,
  highThreshold,
}) {
  const normalizedFacts = inspectNormalizedImage({ normalizedArtifact, normalizedBytes });
  assertExactObject(subjectMap, [
    "schemaVersion", "subjectMapId", "parentNormalizedImageId", "subjectCount", "backgroundSample",
    "sourceClass", "containsRealPerson", "sourceAlpha",
  ], "subjectMap");
  if (subjectMap.schemaVersion !== "subject-map.v0" || subjectMap.parentNormalizedImageId !== normalizedArtifact.normalizedImageId
    || subjectMap.sourceClass !== "project-original-synthetic" || subjectMap.containsRealPerson !== false
    || subjectMap.sourceAlpha !== "opaque") {
    throw new TypeError("SubjectMap is outside the frozen synthetic baseline profile");
  }
  assertNonEmptyString(subjectMap.subjectMapId, "subjectMap.subjectMapId");
  assertNonEmptyString(alphaMatteId, "alphaMatteId");
  assertUtcDateTime(createdAt, "createdAt");
  if (subjectMap.subjectCount !== 1 || !subjectMap.backgroundSample || typeof subjectMap.backgroundSample !== "object"
    || Array.isArray(subjectMap.backgroundSample)
    || JSON.stringify(Object.keys(subjectMap.backgroundSample).sort()) !== JSON.stringify(["rgb", "uniform"])) {
    throw new TypeError("Reference baseline requires one subject and one strict background sample");
  }
  if (subjectMap.backgroundSample.uniform !== true) {
    throw new TypeError("Reference baseline requires a known uniform background");
  }
  const backgroundColor = subjectMap.backgroundSample.rgb;
  if (!Array.isArray(backgroundColor) || backgroundColor.length !== 3
    || backgroundColor.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new TypeError("backgroundColor must be an RGB byte triplet");
  }
  if (typeof lowThreshold !== "number" || !Number.isFinite(lowThreshold)
    || typeof highThreshold !== "number" || !Number.isFinite(highThreshold)
    || lowThreshold < 0 || lowThreshold > 441 || highThreshold < 1
    || highThreshold <= lowThreshold || highThreshold > 442) {
    throw new RangeError("Matting thresholds are outside the frozen reference range");
  }
  const decoded = decodeReferencePng(normalizedBytes);
  if (!decoded.srgbDeclared) throw new TypeError("Reference baseline requires an embedded sRGB declaration");
  if (normalizedFacts.alphaPresent || decoded.rgba.some((value, index) => index % 4 === 3 && value !== 255)) {
    throw new TypeError("Reference baseline requires a fully opaque normalized source");
  }
  const alphaRgba = new Uint8Array(decoded.width * decoded.height * 4);
  const alphaPlane = new Uint8Array(decoded.width * decoded.height);
  for (let offset = 0; offset < decoded.rgba.length; offset += 4) {
    const dr = decoded.rgba[offset] - backgroundColor[0];
    const dg = decoded.rgba[offset + 1] - backgroundColor[1];
    const db = decoded.rgba[offset + 2] - backgroundColor[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const alpha = clampByte(((distance - lowThreshold) / (highThreshold - lowThreshold)) * 255);
    alphaRgba.set([alpha, alpha, alpha, 255], offset);
    alphaPlane[offset / 4] = alpha;
  }
  const bytes = encodeReferenceSrgbPng(decoded.width, decoded.height, alphaRgba);
  return {
    contractRef: MATTE_BASELINE_CONTRACT,
    width: decoded.width,
    height: decoded.height,
    alphaRgba,
    bytes,
    artifact: {
      schemaVersion: "alpha-matte.v0",
      alphaMatteId,
      parentNormalizedImageId: normalizedArtifact.normalizedImageId,
      parentSubjectMapId: subjectMap.subjectMapId,
      capabilityContractRef: MATTE_BASELINE_CONTRACT,
      mime: "image/png",
      width: decoded.width,
      height: decoded.height,
      colorProfile: "srgb",
      matteEncoding: "grayscale-rgb-with-opaque-container",
      alphaPlaneSha256: sha256(alphaPlane),
      fileSha256: sha256(bytes),
      lowThreshold,
      highThreshold,
      createdAt,
    },
  };
}
