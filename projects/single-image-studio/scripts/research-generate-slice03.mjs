import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SLICE03_ROOT = path.resolve(SCRIPT_DIR, "../research/slice-03");
const OBSERVER_ADAPTER_PATH = path.resolve(SCRIPT_DIR, "research-reference-adapters-slice03.mjs");

const VERSION = "0.3.0";
const CREATED_AT = "2026-08-15T10:00:00.000Z";
const SOURCE_REVISION = "local-procedural-slice-03-format-policy-v0.3.0-seed-20260815";
const RIGHTS_RECORD_ID = "rights.project-original-synthetic.slice-03-formats.v1";
const SUITE_ID = "NORMALIZE-DELIVER";
const ONE_MIB = 1024 * 1024;
const CANONICAL_WIDTH = 64;
const CANONICAL_HEIGHT = 48;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FORMAT_ROW_ORDER = Object.freeze([
  "input:png", "input:jpeg", "input:webp", "input:heic", "input:heif", "input:avif",
  "input:gif", "input:apng", "input:tiff", "input:svg", "input:pdf", "input:raw",
  "output:png", "output:jpeg", "output:webp"
]);

const FORMAT_ROWS = Object.freeze([
  {
    formatId: "png",
    direction: "input",
    slug: "input.png-canonical",
    policyState: "reference-calibration-eligible",
    implementationState: "reference-executable",
    evidenceState: "structural-only",
    mediaTypes: ["image/png"],
    extensions: ["png"],
    rejectionCode: "S03_INPUT_PNG_OUTSIDE_CANONICAL_PROFILE",
    claimBoundary: "Executable only for project-original open calibration bytes matching the closed canonical RGBA8 PNG profile; this is not user PNG or product support.",
    bytePolicy: {
      probeKind: "canonical-png-closed-decode",
      decoderAllowed: true,
      encoderAllowed: false,
      maxByteLength: ONE_MIB,
      maxWidth: 256,
      maxHeight: 256,
      signatureLabels: ["PNG 8-byte signature"],
      constraints: [
        "Chunk sequence is exactly IHDR, sRGB, one-or-more IDAT, IEND.",
        "IHDR is bit-depth 8, color-type 6 RGBA, compression 0, filter method 0, interlace 0.",
        "Every decompressed scanline uses PNG filter byte 0.",
        "The sRGB chunk is present exactly once and orientation is 1 by the closed no-transform-metadata profile.",
        "Single-frame straight-alpha RGBA is required; dimensions are at most 256 by 256 and bytes at most 1 MiB."
      ]
    }
  },
  {
    formatId: "jpeg",
    direction: "input",
    slug: "input.jpeg-probe",
    policyState: "research-candidate",
    implementationState: "probe-only",
    evidenceState: "none",
    mediaTypes: ["image/jpeg"],
    extensions: ["jpg", "jpeg"],
    rejectionCode: "S03_INPUT_JPEG_PROBE_ONLY",
    claimBoundary: "Only signature and container probing is permitted; no decode, normalization, ability calibration, or product support follows from a JPEG match.",
    bytePolicy: {
      probeKind: "signature-only",
      decoderAllowed: false,
      encoderAllowed: false,
      maxByteLength: ONE_MIB,
      maxWidth: null,
      maxHeight: null,
      signatureLabels: ["JPEG SOI marker"],
      constraints: ["A signature match returns the stable probe-only code and never decoded pixels or a NormalizedImage."]
    }
  },
  {
    formatId: "webp",
    direction: "input",
    slug: "input.webp-probe",
    policyState: "research-candidate",
    implementationState: "probe-only",
    evidenceState: "none",
    mediaTypes: ["image/webp"],
    extensions: ["webp"],
    rejectionCode: "S03_INPUT_WEBP_PROBE_ONLY",
    claimBoundary: "Only RIFF/WEBP header probing is permitted; no decode, normalization, ability calibration, or product support follows from a WebP match.",
    bytePolicy: {
      probeKind: "signature-only",
      decoderAllowed: false,
      encoderAllowed: false,
      maxByteLength: ONE_MIB,
      maxWidth: null,
      maxHeight: null,
      signatureLabels: ["RIFF plus WEBP form type"],
      constraints: ["A header match returns the stable probe-only code and never decoded pixels or a NormalizedImage."]
    }
  },
  ...[
    ["heic", ["image/heic"], ["heic"], "ISO-BMFF ftyp heic", "S03_INPUT_HEIC_DEFERRED"],
    ["heif", ["image/heif"], ["heif"], "ISO-BMFF ftyp mif1", "S03_INPUT_HEIF_DEFERRED"],
    ["avif", ["image/avif"], ["avif"], "ISO-BMFF ftyp avif", "S03_INPUT_AVIF_DEFERRED"],
    ["gif", ["image/gif"], ["gif"], "GIF87a or GIF89a header", "S03_INPUT_GIF_DEFERRED"],
    ["tiff", ["image/tiff"], ["tif", "tiff"], "TIFF byte-order and magic header", "S03_INPUT_TIFF_DEFERRED"],
    ["svg", ["image/svg+xml"], ["svg"], "SVG XML token", "S03_INPUT_SVG_DEFERRED"],
    ["pdf", ["application/pdf"], ["pdf"], "PDF header token", "S03_INPUT_PDF_DEFERRED"],
    ["raw", ["application/x-camera-raw"], ["raw"], "No universal RAW signature", "S03_INPUT_RAW_DEFERRED"]
  ].map(([formatId, mediaTypes, extensions, signatureLabel, rejectionCode]) => ({
    formatId,
    direction: "input",
    slug: `input.${formatId}-reject`,
    policyState: "deferred-reject",
    implementationState: "reject-only",
    evidenceState: "none",
    mediaTypes,
    extensions,
    rejectionCode,
    claimBoundary: `${formatId.toUpperCase()} is a separately registered deferred rejection only; identifying a token or extension is not decoding, normalization, evidence, or product support.`,
    bytePolicy: {
      probeKind: "stable-policy-rejection",
      decoderAllowed: false,
      encoderAllowed: false,
      maxByteLength: ONE_MIB,
      maxWidth: null,
      maxHeight: null,
      signatureLabels: [signatureLabel],
      constraints: ["Return the format-specific deferred rejection without decoding or emitting an image artifact."]
    }
  })),
  {
    formatId: "apng",
    direction: "input",
    slug: "input.apng-reject",
    policyState: "deferred-reject",
    implementationState: "reject-only",
    evidenceState: "none",
    mediaTypes: ["image/apng"],
    extensions: ["png"],
    rejectionCode: "S03_INPUT_APNG_DEFERRED",
    claimBoundary: "An animation-control chunk is a stable deferred rejection; no APNG frame decode, normalization, evidence, or product support is provided.",
    bytePolicy: {
      probeKind: "structural-animation-rejection",
      decoderAllowed: false,
      encoderAllowed: false,
      maxByteLength: ONE_MIB,
      maxWidth: null,
      maxHeight: null,
      signatureLabels: ["PNG signature plus acTL animation-control chunk"],
      constraints: ["Reject an animation-control chunk before any frame decode or artifact creation."]
    }
  },
  {
    formatId: "png",
    direction: "output",
    slug: "output.png-reference",
    policyState: "reference-calibration-eligible",
    implementationState: "reference-executable",
    evidenceState: "structural-only",
    mediaTypes: ["image/png"],
    extensions: ["png"],
    rejectionCode: "S03_OUTPUT_PNG_OUTSIDE_REFERENCE_PROFILE",
    claimBoundary: "Executable only for the frozen fixture RGBA8 straight-alpha PNG encoder and reopen check; this is not a product export claim.",
    bytePolicy: {
      probeKind: "canonical-png-closed-encode-and-reopen",
      decoderAllowed: true,
      encoderAllowed: true,
      maxByteLength: ONE_MIB,
      maxWidth: 256,
      maxHeight: 256,
      signatureLabels: ["PNG 8-byte signature"],
      constraints: [
        "Encode RGBA8 straight-alpha pixels with an embedded sRGB declaration.",
        "Reopen output and require exact dimensions, decoded pixel SHA-256, byte length, and file SHA-256."
      ]
    }
  },
  ...[
    ["jpeg", ["image/jpeg"], ["jpg", "jpeg"], "S03_OUTPUT_JPEG_NOT_IMPLEMENTED"],
    ["webp", ["image/webp"], ["webp"], "S03_OUTPUT_WEBP_NOT_IMPLEMENTED"]
  ].map(([formatId, mediaTypes, extensions, rejectionCode]) => ({
    formatId,
    direction: "output",
    slug: `output.${formatId}-reject`,
    policyState: "deferred-reject",
    implementationState: "not-implemented",
    evidenceState: "none",
    mediaTypes,
    extensions,
    rejectionCode,
    claimBoundary: `${formatId.toUpperCase()} output has no encoder, artifact path, evidence, or product support in Slice 03.`,
    bytePolicy: {
      probeKind: "no-implementation",
      decoderAllowed: false,
      encoderAllowed: false,
      maxByteLength: null,
      maxWidth: null,
      maxHeight: null,
      signatureLabels: [],
      constraints: ["Reject before encoding and do not create a DeliveryArtifact."]
    }
  }))
].sort((left, right) => (
  FORMAT_ROW_ORDER.indexOf(`${left.direction}:${left.formatId}`)
  - FORMAT_ROW_ORDER.indexOf(`${right.direction}:${right.formatId}`)
)));

const PROFILE_REF_BY_KEY = new Map(
  FORMAT_ROWS.map((row) => [`${row.direction}:${row.formatId}`, `profiles/${row.slug}.v0.3.0.json`])
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function hashRecordWithout(record, omittedKey) {
  const copy = structuredClone(record);
  delete copy[omittedKey];
  return sha256(Buffer.from(stableStringify(copy), "utf8"));
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

function renderPixels(width, height, colorType) {
  const channels = colorType === 6 ? 4 : 3;
  const pixels = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const checker = ((Math.floor(x / 8) + Math.floor(y / 6)) & 1) * 28;
      pixels[offset] = 36 + checker + ((x * 3 + y) % 50);
      pixels[offset + 1] = 84 + ((x + y * 5) % 100);
      pixels[offset + 2] = 132 + ((x * 2 + y * 3) % 90);
      if (channels === 4) pixels[offset + 3] = x < Math.ceil(width / 5) ? 112 + ((x + y) % 96) : 255;
    }
  }
  return pixels;
}

function encodeProceduralPng({
  width = CANONICAL_WIDTH,
  height = CANONICAL_HEIGHT,
  colorType = 6,
  filterByte = 0,
  interlace = 0,
  includeSrgb = true,
  extraChunks = []
} = {}) {
  const channels = colorType === 6 ? 4 : 3;
  const pixels = renderPixels(width, height, colorType);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = interlace;
  const stride = width * channels;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    scanlines[rowOffset] = filterByte;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(scanlines, rowOffset + 1);
  }
  const chunks = [pngChunk("IHDR", ihdr)];
  if (includeSrgb) chunks.push(pngChunk("sRGB", Buffer.from([0])));
  for (const [type, data] of extraChunks) chunks.push(pngChunk(type, Buffer.from(data)));
  chunks.push(pngChunk("IDAT", deflateSync(scanlines, { level: 9 })));
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));
  return { bytes: Buffer.concat([PNG_SIGNATURE, ...chunks]), pixels };
}

function mutateIhdrCrc(bytes) {
  const mutated = Buffer.from(bytes);
  const ihdrCrcOffset = PNG_SIGNATURE.length + 4 + 4 + 13;
  mutated[ihdrCrcOffset] ^= 0x01;
  return mutated;
}

function averageHashRgba(width, height, rgba) {
  const samples = [];
  for (let sy = 0; sy < 8; sy += 1) {
    for (let sx = 0; sx < 8; sx += 1) {
      const x = Math.min(width - 1, Math.floor(((sx + 0.5) * width) / 8));
      const y = Math.min(height - 1, Math.floor(((sy + 0.5) * height) / 8));
      const offset = (y * width + x) * 4;
      samples.push((rgba[offset] * 299 + rgba[offset + 1] * 587 + rgba[offset + 2] * 114) / 1000);
    }
  }
  const mean = samples.reduce((total, value) => total + value, 0) / samples.length;
  let bits = 0n;
  for (const sample of samples) bits = (bits << 1n) | (sample >= mean ? 1n : 0n);
  return bits.toString(16).padStart(16, "0");
}

function jpegProbeBytes() {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
  ]);
}

function webpProbeBytes() {
  const bytes = Buffer.alloc(12);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(4, 4);
  bytes.write("WEBP", 8, "ascii");
  return bytes;
}

function bmffProbeBytes(brand) {
  const bytes = Buffer.alloc(20);
  bytes.writeUInt32BE(20, 0);
  bytes.write("ftyp", 4, "ascii");
  bytes.write(brand, 8, "ascii");
  bytes.writeUInt32BE(0, 12);
  bytes.write(brand, 16, "ascii");
  return bytes;
}

function profileRef(formatId) {
  const value = PROFILE_REF_BY_KEY.get(`input:${formatId}`);
  if (!value) throw new Error(`Missing Slice 03 input profile for ${formatId}`);
  return value;
}

function buildCaseDefinitions() {
  const canonical = encodeProceduralPng();
  const mimeConflict = encodeProceduralPng({ width: 61, height: 41 });
  const missingSrgb = encodeProceduralPng({ includeSrgb: false });
  const conflictingSrgb = encodeProceduralPng({ extraChunks: [["sRGB", Buffer.from([1])]] });
  const nonRgba = encodeProceduralPng({ colorType: 2 });
  const nonFilter0 = encodeProceduralPng({ filterByte: 1 });
  const interlaced = encodeProceduralPng({ interlace: 1 });
  const animated = encodeProceduralPng({ extraChunks: [["acTL", Buffer.from([0, 0, 0, 1, 0, 0, 0, 0])]] });
  const unknownCritical = encodeProceduralPng({ extraChunks: [["ABCD", Buffer.from([0x53, 0x30, 0x33])]] });
  const dimensionLimit = encodeProceduralPng({ width: 257, height: 1 });
  const badSignature = Buffer.from(canonical.bytes);
  badSignature[0] ^= 0xff;
  const truncated = canonical.bytes.subarray(0, canonical.bytes.length - 6);
  const trailing = Buffer.concat([canonical.bytes, Buffer.from("S03-TRAILING-BYTES", "ascii")]);
  const overByteLimit = Buffer.alloc(ONE_MIB + 1, 0x53);
  canonical.bytes.copy(overByteLimit, 0);

  return [
    {
      partition: "dev/calibration",
      fixtureId: "format-png-canonical-dev-calibration-s03-001",
      label: "Closed canonical RGBA8 PNG reference",
      caseKind: "canonical-reference",
      formatId: "png",
      expectedDisposition: "accept-reference-only",
      expectedCode: "S03_REFERENCE_PNG_ACCEPTED",
      filename: "source.png",
      declaredMime: "image/png",
      bytes: canonical.bytes,
      dimensions: { width: CANONICAL_WIDTH, height: CANONICAL_HEIGHT },
      perceptualHash: averageHashRgba(CANONICAL_WIDTH, CANONICAL_HEIGHT, canonical.pixels),
      evidenceState: "structural-only",
      injectionKind: "none-reference-generation",
      injectionSteps: ["Render project-original deterministic RGBA equations.", "Encode the exact IHDR, sRGB, IDAT, IEND canonical profile with filter byte 0."]
    },
    {
      partition: "dev/calibration",
      fixtureId: "format-jpeg-probe-dev-calibration-s03-001",
      label: "JPEG header-only research probe",
      caseKind: "header-probe-only",
      formatId: "jpeg",
      expectedDisposition: "probe-only-no-decode",
      expectedCode: "S03_INPUT_JPEG_PROBE_ONLY",
      filename: "source.jpg",
      declaredMime: "image/jpeg",
      bytes: jpegProbeBytes(),
      dimensions: null,
      perceptualHash: null,
      evidenceState: "none",
      injectionKind: "none-procedural-header-probe",
      injectionSteps: ["Construct a project-original minimal JPEG SOI/JFIF/EOI byte specimen.", "Do not decode pixels or emit a NormalizedImage."]
    },
    {
      partition: "dev/calibration",
      fixtureId: "format-webp-probe-dev-calibration-s03-001",
      label: "WebP header-only research probe",
      caseKind: "header-probe-only",
      formatId: "webp",
      expectedDisposition: "probe-only-no-decode",
      expectedCode: "S03_INPUT_WEBP_PROBE_ONLY",
      filename: "source.webp",
      declaredMime: "image/webp",
      bytes: webpProbeBytes(),
      dimensions: null,
      perceptualHash: null,
      evidenceState: "none",
      injectionKind: "none-procedural-header-probe",
      injectionSteps: ["Construct a project-original RIFF/WEBP header specimen with no decoded image payload.", "Do not decode pixels or emit a NormalizedImage."]
    },
    ...[
      ["format-png-mime-extension-conflict-defect-calibration-s03-001", "PNG bytes declared and named as JPEG", "png", "source.jpg", "image/jpeg", mimeConflict.bytes, { width: 61, height: 41 }, "S03_PNG_MIME_EXTENSION_MISMATCH", "mime-extension-conflict", ["Render a unique canonical PNG byte stream.", "Assign a .jpg path and image/jpeg declaration without changing the PNG signature."]],
      ["format-png-bad-signature-defect-calibration-s03-001", "PNG signature corruption", "png", "source.png", "image/png", badSignature, null, "S03_PNG_BAD_SIGNATURE", "bad-signature", ["Copy the canonical PNG bytes.", "Flip the first signature byte."]],
      ["format-png-crc-error-defect-calibration-s03-001", "PNG IHDR CRC corruption", "png", "source.png", "image/png", mutateIhdrCrc(canonical.bytes), null, "S03_PNG_CRC_MISMATCH", "crc-error", ["Copy the canonical PNG bytes.", "Flip one bit in the IHDR CRC without modifying IHDR data."]],
      ["format-png-truncated-chunk-defect-calibration-s03-001", "PNG truncated IEND chunk", "png", "source.png", "image/png", truncated, null, "S03_PNG_TRUNCATED_CHUNK", "truncated-chunk", ["Copy the canonical PNG bytes.", "Remove the final six bytes so IEND is incomplete."]],
      ["format-png-trailing-bytes-defect-calibration-s03-001", "PNG bytes after IEND", "png", "source.png", "image/png", trailing, null, "S03_PNG_TRAILING_BYTES", "iend-trailing-bytes", ["Copy the canonical PNG bytes.", "Append a fixed ASCII sentinel after IEND."]],
      ["format-png-missing-srgb-defect-calibration-s03-001", "PNG missing embedded sRGB declaration", "png", "source.png", "image/png", missingSrgb.bytes, { width: CANONICAL_WIDTH, height: CANONICAL_HEIGHT }, "S03_PNG_SRGB_MISSING", "missing-color-declaration", ["Render the same project-original RGBA equations.", "Encode without the required sRGB chunk."]],
      ["format-png-conflicting-srgb-defect-calibration-s03-001", "PNG conflicting duplicate sRGB declarations", "png", "source.png", "image/png", conflictingSrgb.bytes, null, "S03_PNG_SRGB_CONFLICT", "conflicting-color-declaration", ["Encode the required sRGB rendering intent 0 chunk.", "Inject a second sRGB chunk with rendering intent 1."]],
      ["format-png-byte-limit-defect-calibration-s03-001", "PNG input exceeds one MiB", "png", "source.png", "image/png", overByteLimit, null, "S03_PNG_BYTE_LIMIT_EXCEEDED", "byte-limit-exceeded", ["Copy canonical PNG bytes into a deterministic buffer.", "Pad the buffer to exactly 1 MiB plus one byte; rejection must occur before parsing."]],
      ["format-png-dimension-limit-defect-calibration-s03-001", "PNG width exceeds 256 pixels", "png", "source.png", "image/png", dimensionLimit.bytes, { width: 257, height: 1 }, "S03_PNG_DIMENSION_LIMIT_EXCEEDED", "dimension-limit-exceeded", ["Render project-original RGBA equations at 257 by 1.", "Encode otherwise canonical PNG structure."]],
      ["format-png-non-rgba8-defect-calibration-s03-001", "PNG RGB8 instead of RGBA8", "png", "source.png", "image/png", nonRgba.bytes, { width: CANONICAL_WIDTH, height: CANONICAL_HEIGHT }, "S03_PNG_RGBA8_REQUIRED", "non-rgba8", ["Render project-original RGB equations with no alpha channel.", "Encode IHDR color type 2 rather than required color type 6."]],
      ["format-png-non-filter0-defect-calibration-s03-001", "PNG scanline filter is not filter 0", "png", "source.png", "image/png", nonFilter0.bytes, null, "S03_PNG_FILTER0_REQUIRED", "non-filter0", ["Render project-original RGBA equations.", "Set every decompressed scanline filter byte to 1 rather than 0."]],
      ["format-png-interlace-defect-calibration-s03-001", "PNG interlace flag is enabled", "png", "source.png", "image/png", interlaced.bytes, null, "S03_PNG_INTERLACE_FORBIDDEN", "interlace-enabled", ["Render project-original RGBA equations.", "Set IHDR interlace method to 1."]],
      ["format-png-unknown-critical-defect-calibration-s03-001", "PNG contains an unknown critical chunk", "png", "source.png", "image/png", unknownCritical.bytes, null, "S03_PNG_UNKNOWN_CRITICAL_CHUNK", "unknown-critical-chunk", ["Render an otherwise canonical PNG.", "Insert the project-local unknown critical chunk ABCD before IDAT."]]
    ].map(([fixtureId, label, formatId, filename, declaredMime, bytes, dimensions, expectedCode, injectionKind, injectionSteps]) => ({
      partition: "defect/calibration",
      fixtureId,
      label,
      caseKind: "injected-format-defect",
      formatId,
      expectedDisposition: "reject",
      expectedCode,
      filename,
      declaredMime,
      bytes,
      dimensions,
      perceptualHash: null,
      evidenceState: "structural-only",
      injectionKind,
      injectionSteps
    })),
    ...[
      ["heic", "source.heic", "image/heic", bmffProbeBytes("heic"), "S03_INPUT_HEIC_DEFERRED"],
      ["heif", "source.heif", "image/heif", bmffProbeBytes("mif1"), "S03_INPUT_HEIF_DEFERRED"],
      ["avif", "source.avif", "image/avif", bmffProbeBytes("avif"), "S03_INPUT_AVIF_DEFERRED"],
      ["gif", "source.gif", "image/gif", Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x3b]), "S03_INPUT_GIF_DEFERRED"],
      ["apng", "source.png", "image/apng", animated.bytes, "S03_INPUT_APNG_DEFERRED"],
      ["tiff", "source.tiff", "image/tiff", Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]), "S03_INPUT_TIFF_DEFERRED"],
      ["svg", "source.svg", "image/svg+xml", Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"></svg>\n", "utf8"), "S03_INPUT_SVG_DEFERRED"],
      ["pdf", "source.pdf", "application/pdf", Buffer.from("%PDF-1.7\n% Slice 03 procedural rejection specimen\n%%EOF\n", "ascii"), "S03_INPUT_PDF_DEFERRED"],
      ["raw", "source.raw", "application/x-camera-raw", Buffer.from("S03RAW\u0000project-original-policy-rejection\n", "utf8"), "S03_INPUT_RAW_DEFERRED"]
    ].map(([formatId, filename, declaredMime, bytes, expectedCode]) => ({
      partition: "defect/calibration",
      fixtureId: `format-${formatId}-deferred-defect-calibration-s03-001`,
      label: `${formatId.toUpperCase()} separate deferred format rejection`,
      caseKind: "deferred-format-rejection",
      formatId,
      expectedDisposition: "reject",
      expectedCode,
      filename,
      declaredMime,
      bytes,
      dimensions: null,
      perceptualHash: null,
      evidenceState: "none",
      injectionKind: "out-of-policy-procedural-format-specimen",
      injectionSteps: [
        `Construct a project-original minimal ${formatId.toUpperCase()} policy-identification specimen.`,
        "Return the registered stable rejection without decoding or artifact creation."
      ]
    }))
  ];
}

function buildProfile(row) {
  const value = {
    schemaVersion: "slice03-format-profile.v0",
    formatProfileId: `format-profile.${row.slug}.v0.3.0`,
    profileVersion: VERSION,
    frozenAt: CREATED_AT,
    formatId: row.formatId,
    direction: row.direction,
    policyState: row.policyState,
    implementationState: row.implementationState,
    evidenceState: row.evidenceState,
    productSupport: false,
    mediaTypes: row.mediaTypes,
    extensions: row.extensions,
    bytePolicy: row.bytePolicy,
    rejectionCode: row.rejectionCode,
    claimBoundary: row.claimBoundary,
    profileHash: ""
  };
  value.profileHash = hashRecordWithout(value, "profileHash");
  return value;
}

function buildObserverContract(implementationSha256) {
  const value = {
    schemaVersion: "technical-observer-contract.slice03.v0",
    observerContractId: "S03-TECHNICAL-OBSERVER",
    contractVersion: VERSION,
    frozenAt: CREATED_AT,
    status: "frozen-research",
    inputContract: {
      artifactSchemaRef: "../slice-02/schemas/normalized-image.v0.schema.json",
      bytesType: "Uint8Array",
      maximumBytes: ONE_MIB,
      maximumWidth: 256,
      maximumHeight: 256,
      parentIdentityFields: [
        "normalizedImageId",
        "parentImageAssetId",
        "normalizedFileSha256",
        "decodedPixelSha256"
      ]
    },
    outputContract: {
      artifactType: "TechnicalObserverResult.slice03.v0",
      schemaRef: "schemas/technical-observer.slice03.schema.json",
      sourceFactsSeparated: true,
      byteBackedTechnicalFactsOnly: true
    },
    scope: "Project-original open-calibration normalized PNG bytes matching the closed Slice 03 fixture profile. The observer independently reopens bytes and cannot establish source-format, image-understanding, product, or production-decoder support.",
    eligibility: [
      "NormalizedImage.v0 artifact from CC-CAP02-NORMALIZE@0.2.0",
      "independently frozen parent artifact identity",
      "exact RGBA8 sRGB single-frame filter-0 PNG profile",
      "orientation 1 and straight/unpremultiplied alpha declaration",
      "maximum 1 MiB and 256 by 256"
    ],
    rejectionConditions: [
      "artifact shape or type mismatch",
      "MIME or PNG signature mismatch",
      "CRC, chunk profile, color profile, filter, interlace, or decode mismatch",
      "file, pixel, parent identity, dimensions, or alpha mismatch",
      "byte or dimension limit exceeded",
      "implementation reference absent or malformed"
    ],
    implementation: {
      adapterId: "observeNormalizedImageSlice03",
      adapterVersion: VERSION,
      scriptPath: "scripts/research-reference-adapters-slice03.mjs",
      implementationSha256,
      parserClass: "independent-closed-fixture-reference-not-production-decoder",
      executionLocation: "local-node-research-process"
    },
    unknownPolicy: {
      sections: ["quality", "subject", "content"],
      value: "unknown",
      confidenceLower: 0,
      confidenceUpper: 0,
      reasonRequired: true,
      forbiddenInferences: ["identity", "age", "person-category", "text-content", "aesthetic-score", "recommendation"]
    },
    evidenceStatus: {
      C1: 0,
      U1: 0,
      E1: 0,
      R1Pipeline: 0,
      R1ProductValidation: 0,
      R1ProductRelease: 0,
      O1: 0,
      G1: 0,
      V1: 0,
      evidenceManifestId: "not-established",
      claimBoundary: "Contract and byte/artifact consistency rehearsal only; no capability, effect, product, operational, governance, value, or release evidence."
    },
    releaseStatus: "research-only-not-product-fallback",
    contractHash: ""
  };
  value.contractHash = hashRecordWithout(value, "contractHash");
  return value;
}

async function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  const serialized = stableStringify(value);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    if (await readFile(target, "utf8") === serialized) return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(target, serialized, "utf8");
}

async function writeFixtureAsset(root, definition) {
  const relative = `fixtures/${definition.partition}/${SUITE_ID}/${definition.fixtureId}/${definition.filename}`;
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  let matches = false;
  try {
    matches = Buffer.from(await readFile(target)).equals(definition.bytes);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!matches) await writeFile(target, definition.bytes);
  return {
    assetId: `${definition.fixtureId}.source`,
    role: "source",
    path: relative,
    declaredMime: definition.declaredMime,
    byteLength: definition.bytes.length,
    sha256: sha256(definition.bytes),
    exposure: "catalog-denied"
  };
}

function fixtureRecord(definition, asset) {
  return {
    schemaVersion: "slice03-format-fixture.v0",
    fixtureId: definition.fixtureId,
    label: definition.label,
    caseKind: definition.caseKind,
    formatId: definition.formatId,
    direction: "input",
    profileRef: profileRef(definition.formatId),
    expectedDisposition: definition.expectedDisposition,
    expectedCode: definition.expectedCode,
    sourceFamilyId: `source-family.slice-03.formats.${definition.fixtureId}.v0`,
    captureSessionId: `capture-session.slice-03.generator.${definition.fixtureId}.v0`,
    derivationLineage: [
      `project-original-procedural:${definition.fixtureId}`,
      `${definition.injectionKind}:${definition.fixtureId}`
    ],
    injection: { kind: definition.injectionKind, steps: definition.injectionSteps },
    rightsRecordId: RIGHTS_RECORD_ID,
    sourceClass: "project-original-synthetic",
    containsRealPerson: false,
    productSupport: false,
    evidenceState: definition.evidenceState,
    observedDimensions: definition.dimensions,
    perceptualHash: definition.perceptualHash,
    assets: [asset]
  };
}

async function buildManifest(root, partition, definitions) {
  const fixtures = [];
  for (const definition of definitions) fixtures.push(fixtureRecord(definition, await writeFixtureAsset(root, definition)));
  const slug = partition.replace("/", "-");
  const value = {
    schemaVersion: "slice03-fixture-manifest.v0",
    fixtureManifestId: `fixture-manifest.normalize-deliver.${slug}.slice-03.v0`,
    manifestVersion: VERSION,
    createdAt: CREATED_AT,
    suiteId: SUITE_ID,
    suiteVersion: VERSION,
    partition,
    sealedState: "open-calibration",
    generator: {
      name: "research-generate-slice03",
      version: VERSION,
      sourceRevision: SOURCE_REVISION,
      scriptPath: "scripts/research-generate-slice03.mjs",
      seed: `20260815-${SUITE_ID}-${slug}`,
      externalInputs: []
    },
    sourcePopulation: "Project-original deterministic procedural byte specimens for the frozen Slice 03 NORMALIZE-DELIVER format policy; no real, user, or third-party images.",
    isolationPolicy: "Every fixture has a unique source-family ID, capture-session ID, and source SHA-256 across the two open calibration partitions; every asset is catalog-denied.",
    claimBoundary: "Open structural policy fixtures only. They establish neither general format support nor C1, effect, product, operational, governance, value, or release evidence.",
    evidenceStatus: { level: "C1=0", purpose: "open-format-policy-calibration-only" },
    profileRefs: [...new Set(fixtures.map((fixture) => fixture.profileRef))].sort(),
    fixtureCount: fixtures.length,
    fixtures,
    manifestHash: ""
  };
  value.manifestHash = hashRecordWithout(value, "manifestHash");
  const relative = `manifests/fixture-manifest.normalize-deliver.${slug}.slice-03.v0.json`;
  await writeJson(root, relative, value);
  return { relative, fixtures: fixtures.length, assets: fixtures.length, manifestHash: value.manifestHash };
}

export async function generateSlice03({ sliceRoot = DEFAULT_SLICE03_ROOT } = {}) {
  if (FORMAT_ROWS.length !== 15) throw new Error(`Slice 03 format matrix must have exactly 15 rows, got ${FORMAT_ROWS.length}`);
  const rowKeys = FORMAT_ROWS.map((row) => `${row.direction}:${row.formatId}`);
  if (new Set(rowKeys).size !== rowKeys.length) throw new Error("Slice 03 format matrix contains a duplicate direction/format row");
  if (JSON.stringify(rowKeys) !== JSON.stringify(FORMAT_ROW_ORDER)) throw new Error("Slice 03 format matrix row set or frozen order drifted");
  const rejectionCodes = FORMAT_ROWS.map((row) => row.rejectionCode);
  if (new Set(rejectionCodes).size !== rejectionCodes.length) throw new Error("Slice 03 matrix rejection codes must be unique per row");

  const profiles = FORMAT_ROWS.map(buildProfile);
  for (let index = 0; index < FORMAT_ROWS.length; index += 1) {
    await writeJson(sliceRoot, `profiles/${FORMAT_ROWS[index].slug}.v0.3.0.json`, profiles[index]);
  }

  const matrix = {
    schemaVersion: "slice03-format-matrix.v0",
    formatMatrixId: "format-matrix.normalize-deliver.slice-03.v0",
    matrixVersion: VERSION,
    frozenAt: CREATED_AT,
    status: "frozen-research-format-policy",
    capabilityId: SUITE_ID,
    rowCount: FORMAT_ROWS.length,
    claimBoundary: "Machine-readable Slice 03 research policy only. Probe, rejection, extension recognition, and structural fixtures do not establish product format support.",
    rows: FORMAT_ROWS.map((row) => ({
      formatId: row.formatId,
      direction: row.direction,
      policyState: row.policyState,
      implementationState: row.implementationState,
      evidenceState: row.evidenceState,
      productSupport: false,
      profileRef: `profiles/${row.slug}.v0.3.0.json`,
      rejectionCode: row.rejectionCode,
      claimBoundary: row.claimBoundary
    })),
    matrixHash: ""
  };
  matrix.matrixHash = hashRecordWithout(matrix, "matrixHash");
  await writeJson(sliceRoot, "format-matrix.json", matrix);

  const observerAdapterHash = sha256(await readFile(OBSERVER_ADAPTER_PATH));
  const observerContract = buildObserverContract(observerAdapterHash);
  await writeJson(sliceRoot, "contracts/technical-observer.slice03.v0.3.0.json", observerContract);

  const rights = {
    schemaVersion: "slice03-rights-record.v0",
    rightsRecordId: RIGHTS_RECORD_ID,
    recordVersion: VERSION,
    createdAt: CREATED_AT,
    assetClass: "project-original-synthetic",
    origin: { type: "project-original-procedural", generator: "scripts/research-generate-slice03.mjs", externalInputs: [] },
    permissions: {
      processingAllowed: true,
      researchUseAllowed: true,
      publicDisplayAllowed: false,
      redistributionAllowed: false,
      commercialMarketingAllowed: false,
      restrictions: "Private open-calibration research fixtures only; all assets remain catalog-denied and cannot support product or release claims."
    },
    privacy: { containsRealPerson: false, containsPersonalData: false, containsThirdPartyMarks: false },
    evidenceStatus: {
      level: "C1=0",
      purpose: "open-format-policy-calibration-only",
      claimBoundary: "Project-original byte-structure fixtures only; no format capability, effect, product, operational, governance, value, or release evidence."
    },
    rightsHash: ""
  };
  rights.rightsHash = hashRecordWithout(rights, "rightsHash");
  await writeJson(sliceRoot, "rights/rights.project-original-synthetic.slice-03-formats.v1.json", rights);

  const definitions = buildCaseDefinitions();
  const partitions = ["dev/calibration", "defect/calibration"];
  const manifests = [];
  for (const partition of partitions) {
    const selected = definitions.filter((definition) => definition.partition === partition);
    if (selected.length === 0) throw new Error(`Slice 03 open partition ${partition} has no fixture definitions`);
    manifests.push(await buildManifest(sliceRoot, partition, selected));
  }

  return {
    sliceRoot,
    matrixRows: matrix.rows.length,
    profiles: profiles.length,
    fixtures: manifests.reduce((total, manifest) => total + manifest.fixtures, 0),
    assets: manifests.reduce((total, manifest) => total + manifest.assets, 0),
    manifests: manifests.length,
    contracts: 1,
    matrixHash: matrix.matrixHash,
    observerAdapterHash,
    observerContractHash: observerContract.contractHash
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const result = await generateSlice03();
    console.log(`Generated Slice 03 format policy: ${result.matrixRows} rows, ${result.profiles} profiles, ${result.fixtures} fixtures, ${result.assets} assets.`);
    console.log(`Format matrix SHA-256: ${result.matrixHash}`);
    console.log(`Technical observer implementation SHA-256: ${result.observerAdapterHash}`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}
