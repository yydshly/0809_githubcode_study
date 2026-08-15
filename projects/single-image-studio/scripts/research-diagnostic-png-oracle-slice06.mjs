import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,239}$/u;
const SAFE_PATH_ATOM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9@._-]{0,119}$/u;
const SAFE_RELATIVE_PATTERN = /^(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)(?!.*:)[A-Za-z0-9@._-]+(?:\/[A-Za-z0-9@._-]+)*$/u;

export const SLICE06_DIAGNOSTIC_ORACLE_ID = "ORACLE-INDEPENDENT-PNG-DIAGNOSTIC@0.6.0";
export const SLICE06_DIAGNOSTIC_MODE = "open-diagnostic";
export const SLICE06_DIAGNOSTIC_LIMITS = Object.freeze({
  maxOutputBytes: 1024 * 1024,
  maxSessionBytes: 18 * 1024 * 1024,
  maxDimension: 256,
  maxPixels: 256 * 256,
  maxFindings: 32,
  maxFindingTextLength: 240,
});

export const SLICE06_SCHEMA_VERSIONS = Object.freeze({
  verification: "png-diagnostic-verification.slice06.v0",
  candidateOutputObservation: "candidate-output-observation.slice06.v0",
  oracleDiagnostic: "oracle-diagnostic.slice06.v0",
  diagnosticEnvelope: "diagnostic-envelope.slice06.v0",
});

export const SLICE06_EXPECTED_FACT_KEYS = Object.freeze([
  "decodedPixelSha256",
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

const FACT_KEYS = Object.freeze([
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
  "chunkTypes",
  "filterTypes",
]);

export const SLICE06_FINDING_PRECEDENCE = Object.freeze([
  "S06_ORACLE_BYTES_EMPTY",
  "S06_ORACLE_BYTES_LIMIT_EXCEEDED",
  "S06_ORACLE_PNG_SIGNATURE_MISMATCH",
  "S06_ORACLE_PNG_CHUNK_TRUNCATED",
  "S06_ORACLE_PNG_CHUNK_TYPE_INVALID",
  "S06_ORACLE_PNG_CRC_MISMATCH",
  "S06_ORACLE_PNG_IHDR_INVALID",
  "S06_ORACLE_PNG_METHOD_MISMATCH",
  "S06_ORACLE_PNG_PIXEL_LAYOUT_MISMATCH",
  "S06_ORACLE_PNG_INTERLACE_FORBIDDEN",
  "S06_ORACLE_PNG_APNG_FORBIDDEN",
  "S06_ORACLE_PNG_UNKNOWN_CRITICAL",
  "S06_ORACLE_PNG_IDAT_INVALID",
  "S06_ORACLE_PNG_IEND_INVALID",
  "S06_ORACLE_PNG_TRAILING_BYTES",
  "S06_ORACLE_PNG_DECODE_FAILED",
  "S06_ORACLE_PNG_DECODE_LENGTH_MISMATCH",
  "S06_ORACLE_PNG_FILTER_INVALID",
  "S06_ORACLE_PNG_SRGB_REQUIRED",
  "S06_ORACLE_PNG_SRGB_INVALID",
  "S06_ORACLE_PNG_ICCP_FORBIDDEN",
  "S06_ORACLE_PNG_EXIF_FORBIDDEN",
  "S06_ORACLE_PNG_METADATA_FORBIDDEN",
  "S06_ORACLE_PNG_FILTER_POLICY_MISMATCH",
  "S06_ORACLE_EXPECTED_IDENTITY_MISMATCH",
]);

const PRECEDENCE = new Map(SLICE06_FINDING_PRECEDENCE.map((code, index) => [code, index]));
const FINDING_STAGES = new Set(["byte-envelope", "png-structure", "png-profile", "decoded-identity"]);
const OPERATION_SET = new Set(["normalize", "export"]);
const HASH_REF_KEYS = Object.freeze(["id", "contentHash"]);
const IMPLEMENTATION_REF_KEYS = Object.freeze(["id", "version", "implementationSha256"]);
const ATTEMPT_KEYS = Object.freeze([
  "runId",
  "sourceId",
  "partition",
  "repetition",
  "attemptNumber",
  "idempotencyKey",
]);
const EXPECTED_KEYS = SLICE06_EXPECTED_FACT_KEYS;
const ACTUAL_BYTES_KEYS = Object.freeze(["mediaType", "byteLength", "fileSha256", "decodedPixelSha256"]);
const FINDING_KEYS = Object.freeze(["code", "stage", "status", "expected", "actual", "message"]);
const VERIFICATION_KEYS = Object.freeze([
  "schemaVersion",
  "verificationId",
  "operation",
  "overallStatus",
  "primaryCode",
  "expected",
  "actualBytes",
  "facts",
  "findings",
  "contentHash",
]);
const RIGHTS_KEYS = Object.freeze([
  "rightsRef",
  "assetClass",
  "containsRealPerson",
  "realUserPhotosUsed",
  "thirdPartyAssetsUsed",
  "modelWeightsUsed",
  "candidateDerivativeRepositoryRetention",
  "diagnosticPublicDisplay",
]);
const RETENTION_KEYS = Object.freeze([
  "state",
  "reasonCode",
  "policyRef",
  "maxPerOutputBytes",
  "maxSessionBytes",
]);
const OBSERVATION_BYTES_KEYS = Object.freeze(["relativePath", "mediaType", "byteLength", "fileSha256"]);
const OBSERVATION_KEYS = Object.freeze([
  "schemaVersion",
  "candidateOutputObservationId",
  "recordClass",
  "artifactEligible",
  "strictDecision",
  "mode",
  "operation",
  "requestRef",
  "attempt",
  "candidateRef",
  "adapterRef",
  "workerRef",
  "runtimeRef",
  "hardwareRef",
  "producerRef",
  "rights",
  "retention",
  "bytes",
  "producedAt",
  "evidenceBoundary",
  "contentHash",
]);
const ORACLE_DIAGNOSTIC_KEYS = Object.freeze([
  "schemaVersion",
  "oracleDiagnosticId",
  "recordClass",
  "artifactEligible",
  "mode",
  "operation",
  "requestRef",
  "attempt",
  "oracleRef",
  "candidateOutputObservationRef",
  "verification",
  "observedAt",
  "evidenceBoundary",
  "contentHash",
]);
const RESOURCE_USAGE_KEYS = Object.freeze(["maxRssKiB", "userCpuMicros", "systemCpuMicros"]);
const WORKER_MESSAGE_KEYS = Object.freeze([
  "received",
  "receivedAt",
  "protocolVersion",
  "status",
  "payloadSha256",
]);
const WORKER_RUNTIME_KEYS = Object.freeze(["payloadSha256", "matchesFrozen"]);
const WORKER_TELEMETRY_KEYS = Object.freeze(["source", "workerDurationMs", "resourceUsage"]);
const PARENT_WALL_KEYS = Object.freeze(["startedAt", "messageAt", "exitedAt", "finishedAt", "durationMs"]);
const EXIT_KEYS = Object.freeze(["confirmed", "exitCode", "signal", "terminationRequested"]);
const WORKER_OBSERVATION_KEYS = Object.freeze(["message", "runtime", "telemetry", "parentWall", "exit"]);
const PUBLICATION_KEYS = Object.freeze(["state", "transactionId", "publishedAt", "fileRoles"]);
const CLEANUP_KEYS = Object.freeze(["state", "stagingRemoved", "confirmedAt"]);
const ENVELOPE_KEYS = Object.freeze([
  "schemaVersion",
  "diagnosticEnvelopeId",
  "recordClass",
  "artifactEligible",
  "strictDecision",
  "mode",
  "operation",
  "requestRef",
  "attempt",
  "outcomeClass",
  "primaryCode",
  "secondaryCodes",
  "candidateOutputObservationRef",
  "oracleDiagnosticRef",
  "worker",
  "rights",
  "retention",
  "publication",
  "cleanup",
  "createdAt",
  "evidenceBoundary",
  "contentHash",
]);

export const SLICE06_ZERO_EVIDENCE_BOUNDARY = deepFreeze({
  c1: 0,
  u1: 0,
  e1: 0,
  r1Pipeline: 0,
  r1ProductValidation: 0,
  r1ProductRelease: 0,
  o1: 0,
  g1: 0,
  v1: 0,
  releaseAllowlist: "none",
  releaseRegistered: 0,
  releaseApproved: 0,
  productSupport: false,
  formalEvidence: false,
});

export class Slice06DiagnosticError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "Slice06DiagnosticError";
    this.code = code;
  }
}

function reject(code, message, options = undefined) {
  throw new Slice06DiagnosticError(code, message, options);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(value, keys, label) {
  if (!isPlainObject(value)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be a plain object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must contain exactly: ${keys.join(", ")}`);
  }
}

function assertString(value, label, { nullable = false, maxLength = 240 } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be a bounded non-empty string`);
  }
}

function assertBoolean(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "boolean") reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be boolean`);
}

function assertInteger(value, minimum, maximum, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be an integer from ${minimum} through ${maximum}`);
  }
}

function assertSha256(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be a lowercase SHA-256`);
  }
}

function assertId(value, label) {
  if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value) || value.includes("..")) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} is outside the closed identifier profile`);
  }
}

function assertPathAtom(value, label) {
  if (typeof value !== "string" || !SAFE_PATH_ATOM_PATTERN.test(value)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be a safe path atom`);
  }
}

function assertRelativePath(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !SAFE_RELATIVE_PATTERN.test(value)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be a normalized safe relative path`);
  }
}

function assertUtc(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be millisecond UTC`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} is not a real UTC instant`);
  }
}

function assertOperation(value, label = "operation") {
  if (!OPERATION_SET.has(value)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} must be normalize or export`);
}

function validateHashRef(value, label) {
  assertExactObject(value, HASH_REF_KEYS, label);
  assertId(value.id, `${label}.id`);
  assertSha256(value.contentHash, `${label}.contentHash`);
}

function validateImplementationRef(value, label) {
  assertExactObject(value, IMPLEMENTATION_REF_KEYS, label);
  assertId(value.id, `${label}.id`);
  assertString(value.version, `${label}.version`, { maxLength: 40 });
  assertSha256(value.implementationSha256, `${label}.implementationSha256`);
}

function validateAttempt(value, label = "attempt") {
  assertExactObject(value, ATTEMPT_KEYS, label);
  assertId(value.runId, `${label}.runId`);
  assertPathAtom(value.sourceId, `${label}.sourceId`);
  if (value.partition !== "diagnostic") {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.partition must be diagnostic`);
  }
  assertInteger(value.repetition, 1, 3, `${label}.repetition`);
  if (value.attemptNumber !== 1) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.attemptNumber must be 1 because replacements are not authorized`);
  assertId(value.idempotencyKey, `${label}.idempotencyKey`);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringifySlice06Diagnostic(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function sha256Slice06Diagnostic(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHashSlice06Diagnostic(record) {
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice06Diagnostic(Buffer.from(stableStringifySlice06Diagnostic(copy), "utf8"));
}

function withContentHash(record) {
  return deepFreeze({ ...record, contentHash: contentHashSlice06Diagnostic(record) });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertSelfHash(record, label) {
  assertSha256(record.contentHash, `${label}.contentHash`);
  if (record.contentHash !== contentHashSlice06Diagnostic(record)) {
    reject("S06_DIAGNOSTIC_CONTENT_HASH_MISMATCH", `${label}.contentHash does not match canonical content`);
  }
}

function validateEvidenceBoundary(value, label) {
  assertExactObject(value, Object.keys(SLICE06_ZERO_EVIDENCE_BOUNDARY), label);
  if (stableStringifySlice06Diagnostic(value) !== stableStringifySlice06Diagnostic(SLICE06_ZERO_EVIDENCE_BOUNDARY)) {
    reject("S06_DIAGNOSTIC_EVIDENCE_BOUNDARY_INVALID", `${label} must remain all-zero, nonformal and unsupported`);
  }
}

function normalizeDisplay(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, SLICE06_DIAGNOSTIC_LIMITS.maxFindingTextLength);
  return JSON.stringify(value).slice(0, SLICE06_DIAGNOSTIC_LIMITS.maxFindingTextLength);
}

function finding(code, stage, expected, actual, message) {
  return {
    code,
    stage,
    status: "non-pass",
    expected: normalizeDisplay(expected),
    actual: normalizeDisplay(actual),
    message: String(message).slice(0, SLICE06_DIAGNOSTIC_LIMITS.maxFindingTextLength),
  };
}

function findingRank(entry) {
  return PRECEDENCE.get(entry.code) ?? Number.MAX_SAFE_INTEGER;
}

function sortFindings(findings) {
  return findings
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => findingRank(left.entry) - findingRank(right.entry) || left.index - right.index)
    .map(({ entry }) => entry)
    .slice(0, SLICE06_DIAGNOSTIC_LIMITS.maxFindings);
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

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function reconstructScanlines(inflated, width, height) {
  const stride = width * 4;
  const rgba = Buffer.alloc(width * height * 4);
  const filterTypes = [];
  for (let y = 0; y < height; y += 1) {
    const inputOffset = y * (stride + 1);
    const outputOffset = y * stride;
    const filterType = inflated[inputOffset];
    if (filterType > 4) return { error: `scanline ${y} uses filter ${filterType}`, rgba: null, filterTypes };
    filterTypes.push(filterType);
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset + 1 + x];
      const left = x >= 4 ? rgba[outputOffset + x - 4] : 0;
      const up = y > 0 ? rgba[outputOffset - stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? rgba[outputOffset - stride + x - 4] : 0;
      let predictor = 0;
      if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = up;
      else if (filterType === 3) predictor = Math.floor((left + up) / 2);
      else if (filterType === 4) predictor = paeth(left, up, upperLeft);
      rgba[outputOffset + x] = (raw + predictor) & 0xff;
    }
  }
  return { error: null, rgba, filterTypes };
}

function emptyFacts() {
  return {
    width: null,
    height: null,
    pixelLayout: null,
    colorSpace: null,
    orientation: null,
    alphaMode: null,
    alphaPresent: null,
    metadataPolicy: null,
    pngFilterPolicy: null,
    interlace: null,
    animation: null,
    chunkTypes: [],
    filterTypes: [],
  };
}

function validateExpectedFacts(value, label = "expected") {
  assertExactObject(value, EXPECTED_KEYS, label);
  assertSha256(value.decodedPixelSha256, `${label}.decodedPixelSha256`);
  assertInteger(value.width, 1, SLICE06_DIAGNOSTIC_LIMITS.maxDimension, `${label}.width`);
  assertInteger(value.height, 1, SLICE06_DIAGNOSTIC_LIMITS.maxDimension, `${label}.height`);
  if (value.width * value.height > SLICE06_DIAGNOSTIC_LIMITS.maxPixels) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} exceeds the pixel limit`);
  }
  const exact = {
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  };
  for (const [key, expected] of Object.entries(exact)) {
    if (value[key] !== expected) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.${key} must be ${expected}`);
  }
  assertBoolean(value.alphaPresent, `${label}.alphaPresent`);
}

function finalizeVerification({ operation, expected, bytes, fileSha256, decodedPixelSha256, facts, findings, mediaType = "application/octet-stream" }) {
  const ordered = sortFindings(findings);
  const primaryCode = ordered[0]?.code ?? null;
  const identity = fileSha256 ?? sha256Slice06Diagnostic(Buffer.from(`${operation}:${bytes.byteLength}`, "utf8"));
  return withContentHash({
    schemaVersion: SLICE06_SCHEMA_VERSIONS.verification,
    verificationId: `png-diagnostic.${operation}.${identity.slice(0, 24)}`,
    operation,
    overallStatus: ordered.length === 0 ? "pass" : "non-pass",
    primaryCode,
    expected: structuredClone(expected),
    actualBytes: {
      mediaType,
      byteLength: bytes.byteLength,
      fileSha256,
      decodedPixelSha256,
    },
    facts,
    findings: ordered,
  });
}

export function verifyOutputBytesSlice06({ operation, bytes, expected }) {
  assertOperation(operation);
  validateExpectedFacts(expected);
  if (!(bytes instanceof Uint8Array)) {
    reject("S06_ORACLE_API_INVALID", "bytes must be Uint8Array candidate output bytes");
  }
  const byteLength = bytes.byteLength;
  if (byteLength > SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes) {
    return finalizeVerification({
      operation,
      expected,
      bytes,
      fileSha256: null,
      decodedPixelSha256: null,
      facts: emptyFacts(),
      findings: [finding(
        "S06_ORACLE_BYTES_LIMIT_EXCEEDED",
        "byte-envelope",
        `<=${SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes}`,
        byteLength,
        "candidate output exceeds the frozen diagnostic byte boundary",
      )],
    });
  }
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fileSha256 = sha256Slice06Diagnostic(buffer);
  if (byteLength === 0) {
    return finalizeVerification({
      operation,
      expected,
      bytes,
      fileSha256,
      decodedPixelSha256: null,
      facts: emptyFacts(),
      findings: [finding("S06_ORACLE_BYTES_EMPTY", "byte-envelope", "non-empty", "0", "candidate output is empty")],
    });
  }

  const facts = emptyFacts();
  const findings = [];
  let detectedMediaType = "application/octet-stream";
  const add = (code, stage, expectedValue, actualValue, message) => {
    findings.push(finding(code, stage, expectedValue, actualValue, message));
  };
  const finish = (decodedPixelSha256 = null) => finalizeVerification({
    operation,
    expected,
    bytes,
    fileSha256,
    decodedPixelSha256,
    facts,
    findings,
    mediaType: detectedMediaType,
  });

  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    add("S06_ORACLE_PNG_SIGNATURE_MISMATCH", "png-structure", "PNG signature", "mismatch", "candidate bytes lack the PNG signature");
    return finish();
  }
  detectedMediaType = "image/png";

  let offset = PNG_SIGNATURE.length;
  let width = null;
  let height = null;
  let sawHeader = false;
  let validRgbaHeader = false;
  let validMethods = false;
  let nonInterlaced = false;
  let sawSrgb = false;
  let validSrgb = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let sawEnd = false;
  let sawApng = false;
  let sawExif = false;
  let sawForbiddenMetadata = false;
  const compressedParts = [];

  while (offset < buffer.length) {
    if (buffer.length - offset < 12) {
      add("S06_ORACLE_PNG_CHUNK_TRUNCATED", "png-structure", "complete chunk header", `${buffer.length - offset} bytes`, "PNG ends inside a chunk header");
      return finish();
    }
    const length = buffer.readUInt32BE(offset);
    const typeBytes = buffer.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    if (!/^[A-Za-z]{4}$/u.test(type) || (typeBytes[2] & 0x20) !== 0) {
      add("S06_ORACLE_PNG_CHUNK_TYPE_INVALID", "png-structure", "valid PNG chunk type", type, "PNG chunk type violates the naming profile");
      return finish();
    }
    const dataStart = offset + 8;
    if (length > buffer.length - dataStart - 4) {
      add("S06_ORACLE_PNG_CHUNK_TRUNCATED", "png-structure", `chunk ${type} length ${length}`, `${buffer.length - dataStart - 4} available`, "PNG chunk exceeds candidate bytes");
      return finish();
    }
    const dataEnd = dataStart + length;
    const storedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(buffer.subarray(offset + 4, dataEnd));
    facts.chunkTypes.push(type);
    if (storedCrc !== actualCrc) {
      add("S06_ORACLE_PNG_CRC_MISMATCH", "png-structure", storedCrc, actualCrc, `PNG ${type} CRC does not match`);
      return finish();
    }

    if (type === "IHDR") {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        add("S06_ORACLE_PNG_IHDR_INVALID", "png-structure", "one leading 13-byte IHDR", `${length}-byte IHDR`, "PNG IHDR placement or size is invalid");
      } else {
        sawHeader = true;
        width = buffer.readUInt32BE(dataStart);
        height = buffer.readUInt32BE(dataStart + 4);
        facts.width = width >= 1 && width <= SLICE06_DIAGNOSTIC_LIMITS.maxDimension ? width : null;
        facts.height = height >= 1 && height <= SLICE06_DIAGNOSTIC_LIMITS.maxDimension ? height : null;
        if (width < 1 || height < 1 || width > SLICE06_DIAGNOSTIC_LIMITS.maxDimension
          || height > SLICE06_DIAGNOSTIC_LIMITS.maxDimension || width * height > SLICE06_DIAGNOSTIC_LIMITS.maxPixels) {
          add("S06_ORACLE_PNG_IHDR_INVALID", "png-structure", "1..256 dimensions and <=65536 pixels", `${width}x${height}`, "PNG dimensions exceed the diagnostic profile");
        }
        const bitDepth = buffer[dataStart + 8];
        const colorType = buffer[dataStart + 9];
        validRgbaHeader = bitDepth === 8 && colorType === 6;
        if (!validRgbaHeader) {
          add("S06_ORACLE_PNG_PIXEL_LAYOUT_MISMATCH", "png-structure", "8-bit RGBA color type 6", `${bitDepth}/${colorType}`, "PNG pixel layout differs from RGBA8");
        } else {
          facts.pixelLayout = "RGBA8";
        }
        validMethods = buffer[dataStart + 10] === 0 && buffer[dataStart + 11] === 0;
        if (!validMethods) {
          add("S06_ORACLE_PNG_METHOD_MISMATCH", "png-structure", "compression/filter methods 0/0", `${buffer[dataStart + 10]}/${buffer[dataStart + 11]}`, "PNG compression or filter method is unsupported");
        }
        nonInterlaced = buffer[dataStart + 12] === 0;
        if (!nonInterlaced) {
          add("S06_ORACLE_PNG_INTERLACE_FORBIDDEN", "png-structure", "interlace 0", buffer[dataStart + 12], "interlaced candidate output is forbidden");
        } else {
          facts.interlace = "forbidden";
        }
      }
    } else if (type === "sRGB") {
      const currentValid = sawHeader && !sawSrgb && !sawImageData && length === 1 && buffer[dataStart] <= 3;
      if (!currentValid) {
        add("S06_ORACLE_PNG_SRGB_INVALID", "png-profile", "one valid sRGB before IDAT", `${length}-byte sRGB at ${offset}`, "sRGB is malformed, duplicate, or out of order");
      } else {
        validSrgb = true;
        facts.colorSpace = "embedded-sRGB";
      }
      sawSrgb = true;
    } else if (type === "IDAT") {
      if (!sawHeader || imageDataEnded || length === 0) {
        add("S06_ORACLE_PNG_IDAT_INVALID", "png-structure", "non-empty contiguous IDAT after IHDR", `${length}-byte IDAT`, "PNG IDAT structure is invalid");
      } else {
        sawImageData = true;
        compressedParts.push(buffer.subarray(dataStart, dataEnd));
      }
    } else if (type === "IEND") {
      if (!sawImageData || sawEnd || length !== 0) {
        add("S06_ORACLE_PNG_IEND_INVALID", "png-structure", "one empty IEND after IDAT", `${length}-byte IEND`, "PNG IEND structure is invalid");
      }
      sawEnd = true;
    } else if (type === "acTL" || type === "fcTL" || type === "fdAT") {
      sawApng = true;
      add("S06_ORACLE_PNG_APNG_FORBIDDEN", "png-profile", "single-frame PNG", type, `APNG chunk ${type} is forbidden`);
    } else if (type === "iCCP") {
      sawForbiddenMetadata = true;
      add("S06_ORACLE_PNG_ICCP_FORBIDDEN", "png-profile", "no iCCP", type, "iCCP is outside the embedded-sRGB contract");
    } else if (type === "eXIf") {
      sawExif = true;
      sawForbiddenMetadata = true;
      add("S06_ORACLE_PNG_EXIF_FORBIDDEN", "png-profile", "no eXIf", type, "eXIf is forbidden and orientation must remain 1");
    } else if ((typeBytes[0] & 0x20) === 0) {
      add("S06_ORACLE_PNG_UNKNOWN_CRITICAL", "png-profile", "no unknown critical chunks", type, `unknown critical PNG chunk ${type} is forbidden`);
    } else {
      sawForbiddenMetadata = true;
      add("S06_ORACLE_PNG_METADATA_FORBIDDEN", "png-profile", "no ancillary metadata", type, `ancillary PNG chunk ${type} violates the metadata policy`);
    }

    offset = dataEnd + 4;
    if (sawImageData && type !== "IDAT" && type !== "IEND") imageDataEnded = true;
    if (type === "IEND") break;
  }

  if (!sawHeader) add("S06_ORACLE_PNG_IHDR_INVALID", "png-structure", "one IHDR", "missing", "PNG lacks IHDR");
  if (!sawImageData) add("S06_ORACLE_PNG_IDAT_INVALID", "png-structure", "one or more IDAT chunks", "missing", "PNG lacks image data");
  if (!sawEnd) add("S06_ORACLE_PNG_IEND_INVALID", "png-structure", "one IEND", "missing", "PNG lacks IEND");
  if (sawEnd && offset !== buffer.length) {
    add("S06_ORACLE_PNG_TRAILING_BYTES", "png-structure", "end at IEND", `${buffer.length - offset} trailing bytes`, "candidate output has bytes after IEND");
  }
  if (!sawSrgb) {
    add("S06_ORACLE_PNG_SRGB_REQUIRED", "png-profile", "one valid sRGB before IDAT", "missing", "candidate output omits the required sRGB chunk");
  } else if (!validSrgb && !findings.some(({ code }) => code === "S06_ORACLE_PNG_SRGB_INVALID")) {
    add("S06_ORACLE_PNG_SRGB_INVALID", "png-profile", "one valid sRGB before IDAT", "invalid", "candidate output has no usable sRGB declaration");
  }
  facts.orientation = sawExif ? null : 1;
  facts.animation = sawApng ? null : "forbidden";
  facts.metadataPolicy = sawForbiddenMetadata ? null : "strip-all-except-color-contract";

  let decodedPixelSha256 = null;
  if (sawHeader && validRgbaHeader && validMethods && nonInterlaced && sawImageData
    && width >= 1 && height >= 1 && width <= SLICE06_DIAGNOSTIC_LIMITS.maxDimension
    && height <= SLICE06_DIAGNOSTIC_LIMITS.maxDimension && width * height <= SLICE06_DIAGNOSTIC_LIMITS.maxPixels) {
    const expectedInflatedLength = (width * 4 + 1) * height;
    const compressed = Buffer.concat(compressedParts);
    try {
      const result = inflateSync(compressed, { info: true, maxOutputLength: expectedInflatedLength });
      if (result.buffer.length !== expectedInflatedLength || result.engine.bytesWritten !== compressed.length) {
        add("S06_ORACLE_PNG_DECODE_LENGTH_MISMATCH", "png-structure", expectedInflatedLength, result.buffer.length, "decoded or consumed PNG byte length is invalid");
      } else {
        const reconstructed = reconstructScanlines(result.buffer, width, height);
        facts.filterTypes = reconstructed.filterTypes;
        if (reconstructed.error) {
          add("S06_ORACLE_PNG_FILTER_INVALID", "png-structure", "filter 0 through 4", reconstructed.error, "PNG scanline filter is invalid");
        } else {
          decodedPixelSha256 = sha256Slice06Diagnostic(reconstructed.rgba);
          facts.alphaPresent = reconstructed.rgba.some((value, index) => index % 4 === 3 && value < 255);
          facts.alphaMode = "straight-unpremultiplied";
          facts.pngFilterPolicy = reconstructed.filterTypes.every((value) => value === 0)
            ? "filter-0-only"
            : "noncanonical-filter-present";
          if (facts.pngFilterPolicy !== "filter-0-only") {
            add("S06_ORACLE_PNG_FILTER_POLICY_MISMATCH", "png-profile", "filter-0-only", facts.pngFilterPolicy, "candidate output uses non-zero PNG scanline filters");
          }
        }
      }
    } catch (error) {
      add("S06_ORACLE_PNG_DECODE_FAILED", "png-structure", "bounded valid zlib stream", error?.message ?? "decode failure", "PNG zlib stream could not be decoded");
    }
  }

  const actualForExpected = { ...facts, decodedPixelSha256 };
  for (const key of EXPECTED_KEYS) {
    if (actualForExpected[key] !== expected[key]) {
      add(
        "S06_ORACLE_EXPECTED_IDENTITY_MISMATCH",
        "decoded-identity",
        `${key}:${normalizeDisplay(expected[key])}`,
        `${key}:${normalizeDisplay(actualForExpected[key])}`,
        `independent ${key} fact differs from the frozen expected identity`,
      );
    }
  }
  return finish(decodedPixelSha256);
}

export const diagnosePngBytesSlice06 = verifyOutputBytesSlice06;

export function validatePngDiagnosticVerificationSlice06(record) {
  assertExactObject(record, VERIFICATION_KEYS, "verification");
  if (record.schemaVersion !== SLICE06_SCHEMA_VERSIONS.verification) reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification schemaVersion mismatch");
  assertId(record.verificationId, "verification.verificationId");
  assertOperation(record.operation, "verification.operation");
  if (!new Set(["pass", "non-pass"]).has(record.overallStatus)) reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification overallStatus invalid");
  assertString(record.primaryCode, "verification.primaryCode", { nullable: true });
  validateExpectedFacts(record.expected, "verification.expected");
  assertExactObject(record.actualBytes, ACTUAL_BYTES_KEYS, "verification.actualBytes");
  if (!new Set(["image/png", "application/octet-stream"]).has(record.actualBytes.mediaType)) reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification mediaType invalid");
  assertInteger(record.actualBytes.byteLength, 0, Number.MAX_SAFE_INTEGER, "verification.actualBytes.byteLength");
  assertSha256(record.actualBytes.fileSha256, "verification.actualBytes.fileSha256", { nullable: true });
  assertSha256(record.actualBytes.decodedPixelSha256, "verification.actualBytes.decodedPixelSha256", { nullable: true });
  const overLimit = record.actualBytes.byteLength > SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes;
  if (overLimit !== (record.actualBytes.fileSha256 === null)
    || (overLimit && (record.actualBytes.mediaType !== "application/octet-stream" || record.actualBytes.decodedPixelSha256 !== null))) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification byte hashes do not match the frozen pre-hash size boundary");
  }
  assertExactObject(record.facts, FACT_KEYS, "verification.facts");
  assertInteger(record.facts.width, 1, SLICE06_DIAGNOSTIC_LIMITS.maxDimension, "verification.facts.width", { nullable: true });
  assertInteger(record.facts.height, 1, SLICE06_DIAGNOSTIC_LIMITS.maxDimension, "verification.facts.height", { nullable: true });
  const factDomains = {
    pixelLayout: ["RGBA8", null],
    colorSpace: ["embedded-sRGB", null],
    alphaMode: ["straight-unpremultiplied", null],
    metadataPolicy: ["strip-all-except-color-contract", null],
    pngFilterPolicy: ["filter-0-only", "noncanonical-filter-present", null],
    interlace: ["forbidden", null],
    animation: ["forbidden", null],
  };
  for (const [key, allowed] of Object.entries(factDomains)) {
    if (!allowed.includes(record.facts[key])) reject("S06_DIAGNOSTIC_RECORD_INVALID", `verification.facts.${key} is outside the closed fact domain`);
  }
  assertInteger(record.facts.orientation, 1, 1, "verification.facts.orientation", { nullable: true });
  assertBoolean(record.facts.alphaPresent, "verification.facts.alphaPresent", { nullable: true });
  for (const key of ["chunkTypes", "filterTypes"]) {
    if (!Array.isArray(record.facts[key])) reject("S06_DIAGNOSTIC_RECORD_INVALID", `verification.facts.${key} must be an array`);
  }
  if (record.facts.chunkTypes.length > 87_382 || record.facts.filterTypes.length > SLICE06_DIAGNOSTIC_LIMITS.maxDimension) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification fact arrays exceed the closed diagnostic bounds");
  }
  for (const type of record.facts.chunkTypes) {
    if (typeof type !== "string" || !/^[A-Za-z]{4}$/u.test(type)) reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification chunkTypes invalid");
  }
  for (const filterType of record.facts.filterTypes) assertInteger(filterType, 0, 4, "verification filterType");
  if (!Array.isArray(record.findings) || record.findings.length > SLICE06_DIAGNOSTIC_LIMITS.maxFindings) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification findings exceed the closed bound");
  }
  let previousRank = -1;
  for (const [index, entry] of record.findings.entries()) {
    assertExactObject(entry, FINDING_KEYS, `verification.findings[${index}]`);
    if (!PRECEDENCE.has(entry.code) || !FINDING_STAGES.has(entry.stage) || entry.status !== "non-pass") {
      reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification finding taxonomy invalid");
    }
    assertString(entry.expected, `verification.findings[${index}].expected`, { nullable: true });
    assertString(entry.actual, `verification.findings[${index}].actual`, { nullable: true });
    assertString(entry.message, `verification.findings[${index}].message`, { maxLength: SLICE06_DIAGNOSTIC_LIMITS.maxFindingTextLength });
    const rank = findingRank(entry);
    if (rank < previousRank) reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification findings violate frozen primary precedence");
    previousRank = rank;
  }
  const pass = record.findings.length === 0;
  if ((record.overallStatus === "pass") !== pass || record.primaryCode !== (record.findings[0]?.code ?? null)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "verification status and primaryCode must be derived from ordered findings");
  }
  if (pass) {
    if (record.actualBytes.fileSha256 === null || record.actualBytes.decodedPixelSha256 === null) {
      reject("S06_DIAGNOSTIC_RECORD_INVALID", "passing verification must have complete byte and pixel identities");
    }
    for (const key of EXPECTED_KEYS) {
      const actual = key === "decodedPixelSha256" ? record.actualBytes.decodedPixelSha256 : record.facts[key];
      if (actual !== record.expected[key]) reject("S06_DIAGNOSTIC_RECORD_INVALID", `passing verification ${key} mismatch`);
    }
  }
  const identity = record.actualBytes.fileSha256
    ?? sha256Slice06Diagnostic(Buffer.from(`${record.operation}:${record.actualBytes.byteLength}`, "utf8"));
  if (record.verificationId !== `png-diagnostic.${record.operation}.${identity.slice(0, 24)}`) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "verificationId is not derived from the byte identity");
  }
  assertSelfHash(record, "verification");
  return record;
}

function validateRights(value, label = "rights") {
  assertExactObject(value, RIGHTS_KEYS, label);
  validateHashRef(value.rightsRef, `${label}.rightsRef`);
  if (value.assetClass !== "project-original-deterministic-synthetic-open-research-fixtures") {
    reject("S06_DIAGNOSTIC_RIGHTS_INVALID", `${label}.assetClass is not the frozen open synthetic class`);
  }
  for (const key of [
    "containsRealPerson",
    "realUserPhotosUsed",
    "thirdPartyAssetsUsed",
    "modelWeightsUsed",
    "candidateDerivativeRepositoryRetention",
    "diagnosticPublicDisplay",
  ]) assertBoolean(value[key], `${label}.${key}`);
  if (value.containsRealPerson || value.realUserPhotosUsed || value.thirdPartyAssetsUsed || value.modelWeightsUsed) {
    reject("S06_DIAGNOSTIC_RIGHTS_INVALID", `${label} includes forbidden real-person, user, third-party, or model material`);
  }
}

function validateRetention(value, rights, label = "retention") {
  assertExactObject(value, RETENTION_KEYS, label);
  if (!new Set(["retained", "hash-only"]).has(value.state)) reject("S06_DIAGNOSTIC_RETENTION_INVALID", `${label}.state invalid`);
  validateHashRef(value.policyRef, `${label}.policyRef`);
  if (value.maxPerOutputBytes !== SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes
    || value.maxSessionBytes !== SLICE06_DIAGNOSTIC_LIMITS.maxSessionBytes) {
    reject("S06_DIAGNOSTIC_RETENTION_INVALID", `${label} byte limits differ from the frozen policy`);
  }
  const expectedReason = value.state === "retained"
    ? "S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC"
    : "S06_DIAGNOSTIC_RETENTION_HASH_ONLY";
  if (value.reasonCode !== expectedReason) reject("S06_DIAGNOSTIC_RETENTION_INVALID", `${label}.reasonCode mismatch`);
  if (value.state === "retained" && (!rights.candidateDerivativeRepositoryRetention || !rights.diagnosticPublicDisplay)) {
    reject("S06_DIAGNOSTIC_RETENTION_RIGHTS_DENIED", "retained diagnostic output lacks explicit repository/display authorization");
  }
}

function expectedDiagnosticOutputPath(operation, attempt, strictDecision) {
  const disposition = strictDecision === "pass" ? "specimens" : "quarantine";
  return `${disposition}/${operation}/${attempt.sourceId}/r${attempt.repetition}/candidate-output.bin`;
}

export function buildCandidateOutputObservationSlice06({
  operation,
  strictDecision,
  requestRef,
  attempt,
  candidateRef,
  adapterRef,
  workerRef,
  runtimeRef,
  hardwareRef,
  rights,
  retention,
  bytes,
  producedAt,
}) {
  assertOperation(operation);
  if (!(bytes instanceof Uint8Array)) {
    reject("S06_DIAGNOSTIC_OUTPUT_BYTES_INVALID", "candidate output observation requires Uint8Array bytes");
  }
  validateAttempt(attempt);
  if (!new Set(["pass", "non-pass"]).has(strictDecision)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output strictDecision must be pass or non-pass");
  }
  validateRights(rights);
  validateRetention(retention, rights);
  const overLimit = bytes.byteLength > SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes;
  if (overLimit && (strictDecision !== "non-pass" || retention.state !== "hash-only")) {
    reject("S06_DIAGNOSTIC_OUTPUT_BYTES_INVALID", "over-limit candidate output must be non-pass and hash-only");
  }
  const buffer = overLimit ? null : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const idempotencyHash = sha256Slice06Diagnostic(Buffer.from(attempt.idempotencyKey, "utf8"));
  const record = withContentHash({
    schemaVersion: SLICE06_SCHEMA_VERSIONS.candidateOutputObservation,
    candidateOutputObservationId: `candidate-output-observation.${idempotencyHash}`,
    recordClass: "diagnostic-candidate-output-not-artifact",
    artifactEligible: false,
    strictDecision,
    mode: SLICE06_DIAGNOSTIC_MODE,
    operation,
    requestRef: structuredClone(requestRef),
    attempt: structuredClone(attempt),
    candidateRef: structuredClone(candidateRef),
    adapterRef: structuredClone(adapterRef),
    workerRef: structuredClone(workerRef),
    runtimeRef: structuredClone(runtimeRef),
    hardwareRef: structuredClone(hardwareRef),
    producerRef: structuredClone(workerRef),
    rights: structuredClone(rights),
    retention: structuredClone(retention),
    bytes: {
      relativePath: retention.state === "retained" ? expectedDiagnosticOutputPath(operation, attempt, strictDecision) : null,
      mediaType: "application/octet-stream",
      byteLength: bytes.byteLength,
      fileSha256: buffer === null ? null : sha256Slice06Diagnostic(buffer),
    },
    producedAt,
    evidenceBoundary: structuredClone(SLICE06_ZERO_EVIDENCE_BOUNDARY),
  });
  validateCandidateOutputObservationSlice06(record);
  return record;
}

export function validateCandidateOutputObservationSlice06(record) {
  assertExactObject(record, OBSERVATION_KEYS, "candidateOutputObservation");
  if (record.schemaVersion !== SLICE06_SCHEMA_VERSIONS.candidateOutputObservation
    || record.recordClass !== "diagnostic-candidate-output-not-artifact" || record.artifactEligible !== false
    || record.mode !== SLICE06_DIAGNOSTIC_MODE) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output observation identity/boundary invalid");
  }
  assertId(record.candidateOutputObservationId, "candidateOutputObservation.id");
  if (!new Set(["pass", "non-pass"]).has(record.strictDecision)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output strictDecision must be pass or non-pass");
  }
  assertOperation(record.operation);
  validateHashRef(record.requestRef, "candidateOutputObservation.requestRef");
  validateAttempt(record.attempt);
  validateHashRef(record.candidateRef, "candidateOutputObservation.candidateRef");
  validateImplementationRef(record.adapterRef, "candidateOutputObservation.adapterRef");
  validateImplementationRef(record.workerRef, "candidateOutputObservation.workerRef");
  validateHashRef(record.runtimeRef, "candidateOutputObservation.runtimeRef");
  validateHashRef(record.hardwareRef, "candidateOutputObservation.hardwareRef");
  validateImplementationRef(record.producerRef, "candidateOutputObservation.producerRef");
  if (stableStringifySlice06Diagnostic(record.producerRef) !== stableStringifySlice06Diagnostic(record.workerRef)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output producerRef must equal workerRef");
  }
  validateRights(record.rights);
  validateRetention(record.retention, record.rights);
  assertExactObject(record.bytes, OBSERVATION_BYTES_KEYS, "candidateOutputObservation.bytes");
  assertRelativePath(record.bytes.relativePath, "candidateOutputObservation.bytes.relativePath", { nullable: true });
  if (record.bytes.mediaType !== "application/octet-stream") reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnostic bytes must not be mislabeled as a passing PNG artifact");
  assertInteger(record.bytes.byteLength, 0, Number.MAX_SAFE_INTEGER, "candidateOutputObservation.bytes.byteLength");
  assertSha256(record.bytes.fileSha256, "candidateOutputObservation.bytes.fileSha256", { nullable: true });
  const overLimit = record.bytes.byteLength > SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes;
  if (overLimit !== (record.bytes.fileSha256 === null)
    || (overLimit && (record.strictDecision !== "non-pass" || record.retention.state !== "hash-only"))) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output byte identity/retention does not match the frozen size boundary");
  }
  const expectedPath = record.retention.state === "retained"
    ? expectedDiagnosticOutputPath(record.operation, record.attempt, record.strictDecision)
    : null;
  if (record.bytes.relativePath !== expectedPath) reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output path does not match retention state and attempt identity");
  const expectedId = `candidate-output-observation.${sha256Slice06Diagnostic(Buffer.from(record.attempt.idempotencyKey, "utf8"))}`;
  if (record.candidateOutputObservationId !== expectedId) reject("S06_DIAGNOSTIC_RECORD_INVALID", "candidate output observation id is not deterministic");
  assertUtc(record.producedAt, "candidateOutputObservation.producedAt");
  validateEvidenceBoundary(record.evidenceBoundary, "candidateOutputObservation.evidenceBoundary");
  assertSelfHash(record, "candidateOutputObservation");
  return record;
}

export function buildOracleDiagnosticSlice06({
  requestRef,
  attempt,
  oracleRef,
  candidateOutputObservation,
  verification,
  observedAt,
}) {
  validateCandidateOutputObservationSlice06(candidateOutputObservation);
  validatePngDiagnosticVerificationSlice06(verification);
  if (stableStringifySlice06Diagnostic(requestRef) !== stableStringifySlice06Diagnostic(candidateOutputObservation.requestRef)
    || stableStringifySlice06Diagnostic(attempt) !== stableStringifySlice06Diagnostic(candidateOutputObservation.attempt)
    || candidateOutputObservation.operation !== verification.operation
    || candidateOutputObservation.strictDecision !== verification.overallStatus
    || candidateOutputObservation.bytes.byteLength !== verification.actualBytes.byteLength
    || candidateOutputObservation.bytes.fileSha256 !== verification.actualBytes.fileSha256) {
    reject("S06_ORACLE_DIAGNOSTIC_BINDING_MISMATCH", "verification does not bind the candidate output observation bytes");
  }
  const idempotencyHash = sha256Slice06Diagnostic(Buffer.from(attempt.idempotencyKey, "utf8"));
  const record = withContentHash({
    schemaVersion: SLICE06_SCHEMA_VERSIONS.oracleDiagnostic,
    oracleDiagnosticId: `oracle-diagnostic.${idempotencyHash}`,
    recordClass: "independent-oracle-diagnostic-not-artifact",
    artifactEligible: false,
    mode: SLICE06_DIAGNOSTIC_MODE,
    operation: verification.operation,
    requestRef: structuredClone(requestRef),
    attempt: structuredClone(attempt),
    oracleRef: structuredClone(oracleRef),
    candidateOutputObservationRef: {
      id: candidateOutputObservation.candidateOutputObservationId,
      contentHash: candidateOutputObservation.contentHash,
    },
    verification: structuredClone(verification),
    observedAt,
    evidenceBoundary: structuredClone(SLICE06_ZERO_EVIDENCE_BOUNDARY),
  });
  validateOracleDiagnosticSlice06(record);
  if (Date.parse(candidateOutputObservation.producedAt) > Date.parse(record.observedAt)) {
    reject("S06_ORACLE_DIAGNOSTIC_BINDING_MISMATCH", "oracle observation predates candidate output production");
  }
  return record;
}

export function validateOracleDiagnosticSlice06(record) {
  assertExactObject(record, ORACLE_DIAGNOSTIC_KEYS, "oracleDiagnostic");
  if (record.schemaVersion !== SLICE06_SCHEMA_VERSIONS.oracleDiagnostic
    || record.recordClass !== "independent-oracle-diagnostic-not-artifact" || record.artifactEligible !== false
    || record.mode !== SLICE06_DIAGNOSTIC_MODE) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle diagnostic identity/boundary invalid");
  }
  assertId(record.oracleDiagnosticId, "oracleDiagnostic.id");
  assertOperation(record.operation);
  validateHashRef(record.requestRef, "oracleDiagnostic.requestRef");
  validateAttempt(record.attempt);
  validateImplementationRef(record.oracleRef, "oracleDiagnostic.oracleRef");
  if (record.oracleRef.id !== SLICE06_DIAGNOSTIC_ORACLE_ID) reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle diagnostic implementation id mismatch");
  validateHashRef(record.candidateOutputObservationRef, "oracleDiagnostic.candidateOutputObservationRef");
  validatePngDiagnosticVerificationSlice06(record.verification);
  if (record.verification.operation !== record.operation) reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle diagnostic operation mismatch");
  const expectedId = `oracle-diagnostic.${sha256Slice06Diagnostic(Buffer.from(record.attempt.idempotencyKey, "utf8"))}`;
  if (record.oracleDiagnosticId !== expectedId) reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle diagnostic id is not deterministic");
  assertUtc(record.observedAt, "oracleDiagnostic.observedAt");
  validateEvidenceBoundary(record.evidenceBoundary, "oracleDiagnostic.evidenceBoundary");
  assertSelfHash(record, "oracleDiagnostic");
  return record;
}

function validateResourceUsage(value, label) {
  assertExactObject(value, RESOURCE_USAGE_KEYS, label);
  for (const key of RESOURCE_USAGE_KEYS) assertInteger(value[key], 0, Number.MAX_SAFE_INTEGER, `${label}.${key}`);
}

function validateWorkerObservation(value, label = "worker") {
  assertExactObject(value, WORKER_OBSERVATION_KEYS, label);
  assertExactObject(value.message, WORKER_MESSAGE_KEYS, `${label}.message`);
  assertBoolean(value.message.received, `${label}.message.received`);
  assertUtc(value.message.receivedAt, `${label}.message.receivedAt`, { nullable: true });
  assertString(value.message.protocolVersion, `${label}.message.protocolVersion`, { nullable: true, maxLength: 80 });
  if (value.message.status !== null && !new Set(["succeeded", "failed"]).has(value.message.status)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.message.status invalid`);
  assertSha256(value.message.payloadSha256, `${label}.message.payloadSha256`, { nullable: true });
  const messageTuple = [value.message.receivedAt, value.message.protocolVersion, value.message.status, value.message.payloadSha256];
  if (value.message.received !== messageTuple.every((item) => item !== null)
    || (!value.message.received && !messageTuple.every((item) => item === null))) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.message must be a received-complete or absent-null tuple`);
  }
  assertExactObject(value.runtime, WORKER_RUNTIME_KEYS, `${label}.runtime`);
  assertSha256(value.runtime.payloadSha256, `${label}.runtime.payloadSha256`, { nullable: true });
  assertBoolean(value.runtime.matchesFrozen, `${label}.runtime.matchesFrozen`, { nullable: true });
  if ((value.runtime.payloadSha256 === null) !== (value.runtime.matchesFrozen === null)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.runtime must be an all-or-none tuple`);
  }
  assertExactObject(value.telemetry, WORKER_TELEMETRY_KEYS, `${label}.telemetry`);
  if (value.telemetry.source !== null && value.telemetry.source !== "worker-self-reported-not-hard-isolation") {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.telemetry.source invalid`);
  }
  assertInteger(value.telemetry.workerDurationMs, 0, 10_000, `${label}.telemetry.workerDurationMs`, { nullable: true });
  if (value.telemetry.resourceUsage !== null) validateResourceUsage(value.telemetry.resourceUsage, `${label}.telemetry.resourceUsage`);
  const telemetryTuple = [value.telemetry.source, value.telemetry.workerDurationMs, value.telemetry.resourceUsage];
  if (!telemetryTuple.every((item) => item === null) && !telemetryTuple.every((item) => item !== null)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.telemetry must be an all-or-none tuple`);
  }
  assertExactObject(value.parentWall, PARENT_WALL_KEYS, `${label}.parentWall`);
  assertUtc(value.parentWall.startedAt, `${label}.parentWall.startedAt`);
  assertUtc(value.parentWall.messageAt, `${label}.parentWall.messageAt`, { nullable: true });
  assertUtc(value.parentWall.exitedAt, `${label}.parentWall.exitedAt`, { nullable: true });
  assertUtc(value.parentWall.finishedAt, `${label}.parentWall.finishedAt`);
  assertInteger(value.parentWall.durationMs, 0, 11_000, `${label}.parentWall.durationMs`);
  const start = Date.parse(value.parentWall.startedAt);
  const finish = Date.parse(value.parentWall.finishedAt);
  if (finish < start || value.parentWall.durationMs !== finish - start) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.parentWall duration/order mismatch`);
  for (const [key, timestamp] of [["messageAt", value.parentWall.messageAt], ["exitedAt", value.parentWall.exitedAt]]) {
    if (timestamp !== null && (Date.parse(timestamp) < start || Date.parse(timestamp) > finish)) {
      reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.parentWall.${key} is outside the attempt wall interval`);
    }
  }
  assertExactObject(value.exit, EXIT_KEYS, `${label}.exit`);
  assertBoolean(value.exit.confirmed, `${label}.exit.confirmed`);
  assertInteger(value.exit.exitCode, 0, 255, `${label}.exit.exitCode`, { nullable: true });
  assertString(value.exit.signal, `${label}.exit.signal`, { nullable: true, maxLength: 40 });
  assertBoolean(value.exit.terminationRequested, `${label}.exit.terminationRequested`);
  if (value.message.received !== (value.parentWall.messageAt !== null)
    || value.exit.confirmed !== (value.parentWall.exitedAt !== null)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} parent wall timestamps do not match message/exit observation state`);
  }
  const exitIdentityCount = Number(value.exit.exitCode !== null) + Number(value.exit.signal !== null);
  if ((value.exit.confirmed && exitIdentityCount !== 1) || (!value.exit.confirmed && exitIdentityCount !== 0)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.exit must be confirmed with exactly one exit identity or wholly unknown`);
  }
}

function validatePublication(value, label = "publication") {
  assertExactObject(value, PUBLICATION_KEYS, label);
  if (!new Set(["not-published", "committed", "reconciliation-unknown"]).has(value.state)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.state invalid`);
  assertString(value.transactionId, `${label}.transactionId`, { nullable: true });
  assertUtc(value.publishedAt, `${label}.publishedAt`, { nullable: true });
  if (!Array.isArray(value.fileRoles) || new Set(value.fileRoles).size !== value.fileRoles.length) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.fileRoles invalid`);
  const allowed = new Set(["candidate-output-bytes", "candidate-output-observation", "oracle-diagnostic", "diagnostic-envelope", "result"]);
  if (value.fileRoles.some((role) => !allowed.has(role))) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.fileRoles contain an unknown role`);
  if (value.state === "not-published") {
    if (value.transactionId !== null || value.publishedAt !== null || value.fileRoles.length !== 0) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} not-published state carries publication fields`);
  } else if (value.transactionId === null || value.fileRoles.length < 4) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} durable state lacks transaction identity/roles`);
  }
  if (value.state === "committed" && value.publishedAt === null) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} committed state lacks publishedAt`);
}

function validateCleanup(value, label = "cleanup") {
  assertExactObject(value, CLEANUP_KEYS, label);
  if (!new Set(["not-required", "confirmed", "unknown"]).has(value.state)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label}.state invalid`);
  assertBoolean(value.stagingRemoved, `${label}.stagingRemoved`, { nullable: true });
  assertUtc(value.confirmedAt, `${label}.confirmedAt`, { nullable: true });
  if (value.state === "confirmed" && (value.stagingRemoved !== true || value.confirmedAt === null)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} confirmed state incomplete`);
  if (value.state === "not-required" && (value.stagingRemoved !== null || value.confirmedAt !== null)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} not-required state carries cleanup evidence`);
  if (value.state === "unknown" && (value.stagingRemoved !== null || value.confirmedAt !== null)) reject("S06_DIAGNOSTIC_RECORD_INVALID", `${label} unknown state cannot claim cleanup evidence`);
}

export function buildDiagnosticEnvelopeSlice06({
  operation,
  requestRef,
  attempt,
  outcomeClass,
  primaryCode,
  secondaryCodes = [],
  candidateOutputObservation = null,
  oracleDiagnostic = null,
  worker,
  rights,
  retention,
  publication,
  cleanup,
  createdAt,
}) {
  validateAttempt(attempt);
  const strictDecision = outcomeClass === "oracle-pass" ? "pass" : "non-pass";
  const idempotencyHash = sha256Slice06Diagnostic(Buffer.from(attempt.idempotencyKey, "utf8"));
  const record = withContentHash({
    schemaVersion: SLICE06_SCHEMA_VERSIONS.diagnosticEnvelope,
    diagnosticEnvelopeId: `diagnostic-envelope.${idempotencyHash}`,
    recordClass: "durable-diagnostic-not-artifact",
    artifactEligible: false,
    strictDecision,
    mode: SLICE06_DIAGNOSTIC_MODE,
    operation,
    requestRef: structuredClone(requestRef),
    attempt: structuredClone(attempt),
    outcomeClass,
    primaryCode,
    secondaryCodes: [...secondaryCodes],
    candidateOutputObservationRef: candidateOutputObservation === null ? null : {
      id: candidateOutputObservation.candidateOutputObservationId,
      contentHash: candidateOutputObservation.contentHash,
    },
    oracleDiagnosticRef: oracleDiagnostic === null ? null : {
      id: oracleDiagnostic.oracleDiagnosticId,
      contentHash: oracleDiagnostic.contentHash,
    },
    worker: structuredClone(worker),
    rights: structuredClone(rights),
    retention: structuredClone(retention),
    publication: structuredClone(publication),
    cleanup: structuredClone(cleanup),
    createdAt,
    evidenceBoundary: structuredClone(SLICE06_ZERO_EVIDENCE_BOUNDARY),
  });
  validateDiagnosticEnvelopeSlice06(record);
  if (candidateOutputObservation !== null) validateCandidateOutputObservationSlice06(candidateOutputObservation);
  if (oracleDiagnostic !== null) validateOracleDiagnosticSlice06(oracleDiagnostic);
  if (outcomeClass === "oracle-pass" || outcomeClass === "oracle-nonpass") {
    const expectedStatus = outcomeClass === "oracle-pass" ? "pass" : "non-pass";
    if (candidateOutputObservation === null || oracleDiagnostic === null
      || oracleDiagnostic.verification.overallStatus !== expectedStatus
      || candidateOutputObservation.strictDecision !== expectedStatus
      || primaryCode !== oracleDiagnostic.verification.primaryCode
      || operation !== oracleDiagnostic.operation
      || stableStringifySlice06Diagnostic(requestRef) !== stableStringifySlice06Diagnostic(candidateOutputObservation.requestRef)
      || stableStringifySlice06Diagnostic(requestRef) !== stableStringifySlice06Diagnostic(oracleDiagnostic.requestRef)
      || stableStringifySlice06Diagnostic(attempt) !== stableStringifySlice06Diagnostic(candidateOutputObservation.attempt)
      || stableStringifySlice06Diagnostic(attempt) !== stableStringifySlice06Diagnostic(oracleDiagnostic.attempt)
      || stableStringifySlice06Diagnostic(rights) !== stableStringifySlice06Diagnostic(candidateOutputObservation.rights)
      || stableStringifySlice06Diagnostic(retention) !== stableStringifySlice06Diagnostic(candidateOutputObservation.retention)) {
      reject("S06_DIAGNOSTIC_ENVELOPE_BINDING_MISMATCH", "oracle outcome envelope does not bind its output/oracle diagnostic");
    }
    if (Date.parse(candidateOutputObservation.producedAt) > Date.parse(oracleDiagnostic.observedAt)
      || Date.parse(oracleDiagnostic.observedAt) > Date.parse(createdAt)) {
      reject("S06_DIAGNOSTIC_ENVELOPE_BINDING_MISMATCH", "diagnostic output/oracle/envelope timestamps are out of order");
    }
  }
  return record;
}

export function validateDiagnosticEnvelopeSlice06(record) {
  assertExactObject(record, ENVELOPE_KEYS, "diagnosticEnvelope");
  if (record.schemaVersion !== SLICE06_SCHEMA_VERSIONS.diagnosticEnvelope
    || record.recordClass !== "durable-diagnostic-not-artifact" || record.artifactEligible !== false
    || !new Set(["pass", "non-pass"]).has(record.strictDecision) || record.mode !== SLICE06_DIAGNOSTIC_MODE) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnostic envelope identity/boundary invalid");
  }
  assertId(record.diagnosticEnvelopeId, "diagnosticEnvelope.id");
  assertOperation(record.operation);
  validateHashRef(record.requestRef, "diagnosticEnvelope.requestRef");
  validateAttempt(record.attempt);
  if (!new Set(["oracle-pass", "oracle-nonpass", "output-nonpass", "worker-failure", "lifecycle-unknown"]).has(record.outcomeClass)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnosticEnvelope.outcomeClass invalid");
  }
  assertString(record.primaryCode, "diagnosticEnvelope.primaryCode", { nullable: true });
  if (!Array.isArray(record.secondaryCodes) || record.secondaryCodes.length > SLICE06_DIAGNOSTIC_LIMITS.maxFindings
    || new Set(record.secondaryCodes).size !== record.secondaryCodes.length) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnosticEnvelope.secondaryCodes invalid");
  }
  for (const code of record.secondaryCodes) assertString(code, "diagnosticEnvelope.secondaryCode");
  if (record.primaryCode !== null && record.secondaryCodes.includes(record.primaryCode)) reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnosticEnvelope secondaryCodes repeat primaryCode");
  if (record.candidateOutputObservationRef !== null) validateHashRef(record.candidateOutputObservationRef, "diagnosticEnvelope.candidateOutputObservationRef");
  if (record.oracleDiagnosticRef !== null) validateHashRef(record.oracleDiagnosticRef, "diagnosticEnvelope.oracleDiagnosticRef");
  validateWorkerObservation(record.worker);
  validateRights(record.rights);
  validateRetention(record.retention, record.rights);
  validatePublication(record.publication);
  validateCleanup(record.cleanup);
  if (record.strictDecision !== (record.outcomeClass === "oracle-pass" ? "pass" : "non-pass")) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnostic envelope strictDecision is not derived from outcomeClass");
  }
  if (record.outcomeClass === "oracle-pass" && (record.primaryCode !== null || record.secondaryCodes.length !== 0)) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle-pass envelope cannot carry failure codes");
  }
  if (record.outcomeClass !== "oracle-pass" && record.primaryCode === null) {
    reject("S06_DIAGNOSTIC_RECORD_INVALID", "non-pass envelope requires a primary code");
  }
  if (record.outcomeClass === "oracle-pass" || record.outcomeClass === "oracle-nonpass") {
    if (record.candidateOutputObservationRef === null || record.oracleDiagnosticRef === null
      || !record.worker.message.received || record.worker.message.status !== "succeeded"
      || record.worker.runtime.payloadSha256 === null || record.worker.runtime.matchesFrozen !== true
      || record.worker.telemetry.resourceUsage === null
      || !record.worker.exit.confirmed || record.worker.exit.exitCode !== 0 || record.worker.exit.signal !== null
      || record.worker.parentWall.messageAt === null || record.worker.parentWall.exitedAt === null) {
      reject("S06_DIAGNOSTIC_RECORD_INVALID", "oracle outcome envelope lacks complete successful worker message/runtime/telemetry/exit evidence");
    }
  }
  if (record.publication.state === "committed") {
    const expectedRoles = new Set([
      ...(record.retention.state === "retained" ? ["candidate-output-bytes"] : []),
      "candidate-output-observation",
      "oracle-diagnostic",
      "diagnostic-envelope",
      "result",
    ]);
    if (record.publication.fileRoles.length !== expectedRoles.size
      || record.publication.fileRoles.some((role) => !expectedRoles.has(role))) {
      reject("S06_DIAGNOSTIC_RECORD_INVALID", "committed diagnostic publication roles do not match retention state");
    }
  }
  const expectedId = `diagnostic-envelope.${sha256Slice06Diagnostic(Buffer.from(record.attempt.idempotencyKey, "utf8"))}`;
  if (record.diagnosticEnvelopeId !== expectedId) reject("S06_DIAGNOSTIC_RECORD_INVALID", "diagnostic envelope id is not deterministic");
  assertUtc(record.createdAt, "diagnosticEnvelope.createdAt");
  validateEvidenceBoundary(record.evidenceBoundary, "diagnosticEnvelope.evidenceBoundary");
  assertSelfHash(record, "diagnosticEnvelope");
  return record;
}
