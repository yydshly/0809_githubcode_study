import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

export const SLICE05_INDEPENDENT_PNG_ORACLE_ID = "ORACLE-INDEPENDENT-PNG@0.5.0";
export const NORMALIZED_IMAGE_SCHEMA_VERSION = "normalized-image.slice04.v0";
export const DELIVERY_ARTIFACT_SCHEMA_VERSION = "delivery-artifact.slice04.v0";
export const GOLD_RECORD_SCHEMA_VERSION = "gold-record.slice05.v0";
export const ORACLE_RESULT_SCHEMA_VERSION = "oracle-result.slice05.v0";

const MAX_PNG_BYTES = 1024 * 1024;
const MAX_DIMENSION = 256;
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PARTITIONS = new Set(["smoke", "dev/calibration", "defect/calibration"]);

const COMMON_ARTIFACT_KEYS = [
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
];
const NORMALIZED_PARENT_KEYS = [
  "sourceAssetId",
  "sourceFileSha256",
  "sourceDecodedPixelSha256",
  "sourceManifestSha256",
];
const DELIVERY_PARENT_KEYS = [
  "normalizedImageId",
  "normalizedArtifactSha256",
  "normalizedFileSha256",
  "normalizedDecodedPixelSha256",
];
const REF_KEYS = ["id", "contentHash"];
const ADAPTER_REF_KEYS = ["id", "version", "implementationSha256"];
const PRODUCER_REF_KEYS = ["kind", "id", "version", "implementationSha256"];
const ATTEMPT_KEYS = ["runId", "sourceId", "partition", "repetition", "attemptNumber", "idempotencyKey"];
const BYTE_KEYS = ["relativePath", "mime", "byteLength", "fileSha256", "decodedPixelSha256"];
const IMAGE_KEYS = [
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
];
const OUTPUT_FACT_KEYS = ["mime", "byteLength", "fileSha256", "decodedPixelSha256", ...IMAGE_KEYS];
const EXPORT_EXPECTED_KEYS = ["decodedPixelSha256", ...IMAGE_KEYS];
const GOLD_KEYS = [
  "schemaVersion",
  "goldRecordId",
  "operation",
  "sourceId",
  "partition",
  "provenance",
  "expected",
  "frozenAt",
  "contentHash",
];
const GOLD_PROVENANCE_KEYS = [
  "kind",
  "producerId",
  "producerVersion",
  "implementationSha256",
  "authorIds",
  "candidateAuthorIds",
  "candidateProduced",
  "candidateOutputUsed",
  "candidateDependencyUsed",
];
const GOLD_EXPECTED_KEYS = [
  "parentIdentity",
  "mime",
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
  "fileSha256",
  "decodedPixelSha256",
];
const GOLD_PARENT_KEYS = ["id", "artifactSha256", "fileSha256", "decodedPixelSha256", "manifestSha256"];
const ORACLE_RESULT_KEYS = [
  "schemaVersion",
  "oracleResultId",
  "oracleRef",
  "operation",
  "artifactRef",
  "goldRecordRef",
  "actualBytes",
  "facts",
  "checks",
  "overallStatus",
  "evidenceBoundary",
  "observedAt",
  "contentHash",
];
const ORACLE_REF_KEYS = ["id", "implementationSha256"];
const ORACLE_ACTUAL_BYTES_KEYS = ["relativePath", "byteLength", "fileSha256", "decodedPixelSha256"];
const ORACLE_CHECK_KEYS = ["checkId", "expected", "actual", "status", "reason"];
const ORACLE_EVIDENCE_BOUNDARY_KEYS = ["productSupport", "gateBState", "c1", "u1", "e1", "r1", "o1", "g1", "v1"];
const ORACLE_CHECK_IDS = [
  "independent-oracle",
  "operation-binding",
  "source-binding",
  "partition-binding",
  "parent-identity",
  "independent-decode",
  "mime-signature",
  "dimensions",
  "orientation",
  "embedded-srgb",
  "rgba8",
  "straight-alpha",
  "alpha-presence",
  "metadata-policy",
  "png-filter-policy",
  "interlace",
  "animation",
  "byte-length",
  "file-sha256",
  "decoded-pixel-sha256",
  "gold-provenance",
];

export class Slice05OracleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Slice05OracleError";
    this.code = code;
  }
}

function reject(code, message) {
  throw new Slice05OracleError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(value, keys, label) {
  if (!isPlainObject(value)) reject("ORACLE_OBJECT_SHAPE_MISMATCH", `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    reject("ORACLE_OBJECT_SHAPE_MISMATCH", `${label} must contain exactly: ${expected.join(", ")}`);
  }
}

function assertId(value, label) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    reject("ORACLE_VALUE_INVALID", `${label} must be a non-empty stable identifier`);
  }
}

function assertSha256(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    reject("ORACLE_HASH_INVALID", `${label} must be a lowercase SHA-256 hex digest`);
  }
}

function assertUtc(value, label) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (typeof value !== "string" || !UTC_PATTERN.test(value) || Number.isNaN(timestamp)
    || new Date(timestamp).toISOString() !== value) {
    reject("ORACLE_TIME_INVALID", `${label} must be an ISO UTC timestamp with millisecond precision`);
  }
}

function assertInteger(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    reject("ORACLE_VALUE_INVALID", `${label} must be an integer from ${minimum} through ${maximum}`);
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") reject("ORACLE_VALUE_INVALID", `${label} must be boolean`);
}

function assertSafeRelativePath(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || value.includes("\\") || value.includes(":")) {
    reject("ORACLE_PATH_INVALID", `${label} must be a portable project-relative path`);
  }
  const segments = value.split("/");
  if (value.startsWith("/") || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    reject("ORACLE_PATH_INVALID", `${label} must not be absolute or traverse directories`);
  }
  if (segments.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment))) {
    reject("ORACLE_PATH_INVALID", `${label} contains a non-portable path segment`);
  }
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

export function stableStringifySlice05(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sha256Slice05(value) {
  const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return createHash("sha256").update(bytes).digest("hex");
}

export function contentHashSlice05(record) {
  if (!isPlainObject(record)) reject("ORACLE_OBJECT_SHAPE_MISMATCH", "record must be a plain object");
  const withoutHash = { ...record };
  delete withoutHash.contentHash;
  return sha256Slice05(stableStringifySlice05(withoutHash));
}

function assertSelfHash(record, label) {
  assertSha256(record.contentHash, `${label}.contentHash`);
  if (record.contentHash !== contentHashSlice05(record)) {
    reject("ORACLE_CONTENT_HASH_MISMATCH", `${label}.contentHash does not match its canonical record`);
  }
}

function assertRef(value, label, expectedId) {
  assertExactObject(value, REF_KEYS, label);
  if (value.id !== expectedId) reject("ORACLE_BINDING_MISMATCH", `${label}.id must be ${expectedId}`);
  assertSha256(value.contentHash, `${label}.contentHash`);
}

function validateArtifact(record, operation) {
  const label = operation === "normalize" ? "normalizedImage" : "deliveryArtifact";
  assertExactObject(record, COMMON_ARTIFACT_KEYS, label);
  const expectedSchema = operation === "normalize" ? NORMALIZED_IMAGE_SCHEMA_VERSION : DELIVERY_ARTIFACT_SCHEMA_VERSION;
  const expectedContract = operation === "normalize"
    ? "CC-CAP02-NORMALIZE-PNG@0.5.0"
    : "CC-CAP02-EXPORT-PNG@0.5.0";
  if (record.schemaVersion !== expectedSchema || record.operation !== operation) {
    reject("ORACLE_ARTIFACT_PROFILE_MISMATCH", `${label} schemaVersion/operation are outside the Slice 05 contract`);
  }
  assertId(record.artifactId, `${label}.artifactId`);
  assertRef(record.capabilityContractRef, `${label}.capabilityContractRef`, expectedContract);
  assertRef(record.candidateRef, `${label}.candidateRef`, "REG-NORM-SHARP@0.5.0");

  assertExactObject(record.adapterRef, ADAPTER_REF_KEYS, `${label}.adapterRef`);
  assertId(record.adapterRef.id, `${label}.adapterRef.id`);
  assertId(record.adapterRef.version, `${label}.adapterRef.version`);
  assertSha256(record.adapterRef.implementationSha256, `${label}.adapterRef.implementationSha256`);
  assertExactObject(record.producerRef, PRODUCER_REF_KEYS, `${label}.producerRef`);
  const producerKinds = operation === "normalize"
    ? new Set(["candidate-adapter", "independent-fixture-generator"])
    : new Set(["candidate-adapter"]);
  if (!producerKinds.has(record.producerRef.kind)) {
    reject("ORACLE_PRODUCER_INVALID", `${label}.producerRef.kind is not permitted for this artifact`);
  }
  assertId(record.producerRef.id, `${label}.producerRef.id`);
  assertId(record.producerRef.version, `${label}.producerRef.version`);
  assertSha256(record.producerRef.implementationSha256, `${label}.producerRef.implementationSha256`);
  if (record.producerRef.kind === "candidate-adapter"
    && (record.producerRef.id !== record.adapterRef.id
      || record.producerRef.version !== record.adapterRef.version
      || record.producerRef.implementationSha256 !== record.adapterRef.implementationSha256)) {
    reject("ORACLE_PRODUCER_BINDING_MISMATCH", `${label} candidate producer must exactly match adapterRef`);
  }
  if (record.producerRef.kind === "independent-fixture-generator"
    && (record.producerRef.id === record.adapterRef.id
      || record.producerRef.implementationSha256 === record.adapterRef.implementationSha256)) {
    reject("ORACLE_PRODUCER_BINDING_MISMATCH", `${label} independent producer must not reuse the candidate adapter identity or implementation`);
  }
  assertRef(record.runtimeRef, `${label}.runtimeRef`, record.runtimeRef?.id);
  assertRef(record.hardwareRef, `${label}.hardwareRef`, record.hardwareRef?.id);
  assertId(record.runtimeRef.id, `${label}.runtimeRef.id`);
  assertId(record.hardwareRef.id, `${label}.hardwareRef.id`);

  assertExactObject(record.attempt, ATTEMPT_KEYS, `${label}.attempt`);
  assertId(record.attempt.runId, `${label}.attempt.runId`);
  assertId(record.attempt.sourceId, `${label}.attempt.sourceId`);
  assertId(record.attempt.idempotencyKey, `${label}.attempt.idempotencyKey`);
  if (!PARTITIONS.has(record.attempt.partition)) {
    reject("ORACLE_PARTITION_FORBIDDEN", `${label}.attempt.partition is not an open Slice 05 partition`);
  }
  assertInteger(record.attempt.repetition, 1, 3, `${label}.attempt.repetition`);
  assertInteger(record.attempt.attemptNumber, 1, 2, `${label}.attempt.attemptNumber`);

  assertExactObject(record.bytes, BYTE_KEYS, `${label}.bytes`);
  assertSafeRelativePath(record.bytes.relativePath, `${label}.bytes.relativePath`);
  if (record.bytes.mime !== "image/png") reject("ORACLE_MIME_MISMATCH", `${label}.bytes.mime must be image/png`);
  assertInteger(record.bytes.byteLength, 1, MAX_PNG_BYTES, `${label}.bytes.byteLength`);
  assertSha256(record.bytes.fileSha256, `${label}.bytes.fileSha256`);
  assertSha256(record.bytes.decodedPixelSha256, `${label}.bytes.decodedPixelSha256`);

  assertExactObject(record.image, IMAGE_KEYS, `${label}.image`);
  assertInteger(record.image.width, 1, MAX_DIMENSION, `${label}.image.width`);
  assertInteger(record.image.height, 1, MAX_DIMENSION, `${label}.image.height`);
  const fixedProfile = {
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  };
  for (const [key, expected] of Object.entries(fixedProfile)) {
    if (record.image[key] !== expected) {
      reject("ORACLE_ARTIFACT_PROFILE_MISMATCH", `${label}.image.${key} must be ${expected}`);
    }
  }
  assertBoolean(record.image.alphaPresent, `${label}.image.alphaPresent`);
  assertUtc(record.createdAt, `${label}.createdAt`);

  if (operation === "normalize") {
    assertExactObject(record.parent, NORMALIZED_PARENT_KEYS, `${label}.parent`);
    assertId(record.parent.sourceAssetId, `${label}.parent.sourceAssetId`);
    assertSha256(record.parent.sourceFileSha256, `${label}.parent.sourceFileSha256`);
    assertSha256(record.parent.sourceDecodedPixelSha256, `${label}.parent.sourceDecodedPixelSha256`);
    assertSha256(record.parent.sourceManifestSha256, `${label}.parent.sourceManifestSha256`);
  } else {
    assertExactObject(record.parent, DELIVERY_PARENT_KEYS, `${label}.parent`);
    assertId(record.parent.normalizedImageId, `${label}.parent.normalizedImageId`);
    assertSha256(record.parent.normalizedArtifactSha256, `${label}.parent.normalizedArtifactSha256`);
    assertSha256(record.parent.normalizedFileSha256, `${label}.parent.normalizedFileSha256`);
    assertSha256(record.parent.normalizedDecodedPixelSha256, `${label}.parent.normalizedDecodedPixelSha256`);
  }
  assertSelfHash(record, label);
}

export function validateNormalizedImageSlice05(record) {
  validateArtifact(record, "normalize");
  return record;
}

export function validateDeliveryArtifactSlice05(record) {
  validateArtifact(record, "export");
  return record;
}

function validateStringArray(values, label) {
  if (!Array.isArray(values) || values.length < 1 || new Set(values).size !== values.length) {
    reject("ORACLE_GOLD_PROVENANCE_INVALID", `${label} must be a non-empty unique array`);
  }
  values.forEach((value, index) => assertId(value, `${label}[${index}]`));
}

export function validateGoldRecordSlice05(record) {
  assertExactObject(record, GOLD_KEYS, "goldRecord");
  if (record.schemaVersion !== GOLD_RECORD_SCHEMA_VERSION) {
    reject("ORACLE_GOLD_PROFILE_MISMATCH", `goldRecord.schemaVersion must be ${GOLD_RECORD_SCHEMA_VERSION}`);
  }
  assertId(record.goldRecordId, "goldRecord.goldRecordId");
  if (record.operation !== "normalize" && record.operation !== "export") {
    reject("ORACLE_GOLD_PROFILE_MISMATCH", "goldRecord.operation must be normalize or export");
  }
  assertId(record.sourceId, "goldRecord.sourceId");
  if (!PARTITIONS.has(record.partition)) {
    reject("ORACLE_PARTITION_FORBIDDEN", "goldRecord.partition must be an open Slice 05 partition");
  }
  assertExactObject(record.provenance, GOLD_PROVENANCE_KEYS, "goldRecord.provenance");
  if (!new Set(["project-original-procedural", "independent-reference-implementation"]).has(record.provenance.kind)) {
    reject("ORACLE_GOLD_PROVENANCE_INVALID", "goldRecord provenance kind is not an allowed independent source");
  }
  assertId(record.provenance.producerId, "goldRecord.provenance.producerId");
  assertId(record.provenance.producerVersion, "goldRecord.provenance.producerVersion");
  assertSha256(record.provenance.implementationSha256, "goldRecord.provenance.implementationSha256");
  validateStringArray(record.provenance.authorIds, "goldRecord.provenance.authorIds");
  validateStringArray(record.provenance.candidateAuthorIds, "goldRecord.provenance.candidateAuthorIds");
  if (record.provenance.candidateProduced !== false
    || record.provenance.candidateOutputUsed !== false
    || record.provenance.candidateDependencyUsed !== false) {
    reject("ORACLE_GOLD_CANDIDATE_TAINTED", "candidate code, output, and authorship cannot define gold");
  }
  if (record.provenance.authorIds.some((id) => record.provenance.candidateAuthorIds.includes(id))) {
    reject("ORACLE_GOLD_ROLE_CONFLICT", "gold authors must be disjoint from candidate authors");
  }

  assertExactObject(record.expected, GOLD_EXPECTED_KEYS, "goldRecord.expected");
  assertExactObject(record.expected.parentIdentity, GOLD_PARENT_KEYS, "goldRecord.expected.parentIdentity");
  assertId(record.expected.parentIdentity.id, "goldRecord.expected.parentIdentity.id");
  for (const key of ["artifactSha256", "fileSha256", "decodedPixelSha256", "manifestSha256"]) {
    assertSha256(record.expected.parentIdentity[key], `goldRecord.expected.parentIdentity.${key}`, true);
  }
  if (record.expected.mime !== "image/png"
    || record.expected.pixelLayout !== "RGBA8"
    || record.expected.colorSpace !== "embedded-sRGB"
    || record.expected.orientation !== 1
    || record.expected.alphaMode !== "straight-unpremultiplied"
    || record.expected.metadataPolicy !== "strip-all-except-color-contract"
    || record.expected.pngFilterPolicy !== "filter-0-only"
    || record.expected.interlace !== "forbidden"
    || record.expected.animation !== "forbidden") {
    reject("ORACLE_GOLD_PROFILE_MISMATCH", "goldRecord.expected is outside the closed PNG output profile");
  }
  assertInteger(record.expected.width, 1, MAX_DIMENSION, "goldRecord.expected.width");
  assertInteger(record.expected.height, 1, MAX_DIMENSION, "goldRecord.expected.height");
  assertBoolean(record.expected.alphaPresent, "goldRecord.expected.alphaPresent");
  assertSha256(record.expected.fileSha256, "goldRecord.expected.fileSha256", true);
  assertSha256(record.expected.decodedPixelSha256, "goldRecord.expected.decodedPixelSha256");
  assertUtc(record.frozenAt, "goldRecord.frozenAt");
  assertSelfHash(record, "goldRecord");
  return record;
}

/**
 * Strict durable-record validator for the independent oracle result. This is
 * intentionally context-free: callers must separately bind artifact/gold
 * refs to their persisted records and reopen actualBytes. It nevertheless
 * closes the complete record shape, self-hash, per-check denominator, fact
 * projection, evidence boundary, and UTC semantics so a self-rehashed claim
 * cannot silently change the oracle conclusion.
 */
export function validateOracleResultSlice05(record) {
  assertExactObject(record, ORACLE_RESULT_KEYS, "oracleResult");
  if (record.schemaVersion !== ORACLE_RESULT_SCHEMA_VERSION) {
    reject("ORACLE_RESULT_PROFILE_MISMATCH", `oracleResult.schemaVersion must be ${ORACLE_RESULT_SCHEMA_VERSION}`);
  }
  assertId(record.oracleResultId, "oracleResult.oracleResultId");
  if (record.operation !== "normalize" && record.operation !== "export") {
    reject("ORACLE_RESULT_PROFILE_MISMATCH", "oracleResult.operation must be normalize or export");
  }
  assertExactObject(record.oracleRef, ORACLE_REF_KEYS, "oracleResult.oracleRef");
  if (record.oracleRef.id !== SLICE05_INDEPENDENT_PNG_ORACLE_ID) {
    reject("ORACLE_RESULT_BINDING_MISMATCH", "oracleResult.oracleRef must identify the independent Slice 05 oracle");
  }
  assertSha256(record.oracleRef.implementationSha256, "oracleResult.oracleRef.implementationSha256");
  assertRef(record.artifactRef, "oracleResult.artifactRef", record.artifactRef?.id);
  assertRef(record.goldRecordRef, "oracleResult.goldRecordRef", record.goldRecordRef?.id);
  assertId(record.artifactRef.id, "oracleResult.artifactRef.id");
  assertId(record.goldRecordRef.id, "oracleResult.goldRecordRef.id");
  if (record.oracleResultId !== `oracle-result.${record.artifactRef.id}`) {
    reject("ORACLE_RESULT_BINDING_MISMATCH", "oracleResultId must be the deterministic artifact binding");
  }

  assertExactObject(record.actualBytes, ORACLE_ACTUAL_BYTES_KEYS, "oracleResult.actualBytes");
  assertSafeRelativePath(record.actualBytes.relativePath, "oracleResult.actualBytes.relativePath");
  assertInteger(record.actualBytes.byteLength, 0, 1024 * 1024 * 1024, "oracleResult.actualBytes.byteLength");
  assertSha256(record.actualBytes.fileSha256, "oracleResult.actualBytes.fileSha256");
  assertSha256(record.actualBytes.decodedPixelSha256, "oracleResult.actualBytes.decodedPixelSha256", true);

  if (record.facts !== null) {
    assertExactObject(record.facts, OUTPUT_FACT_KEYS, "oracleResult.facts");
    if (record.facts.mime !== "image/png") reject("ORACLE_RESULT_FACTS_INVALID", "oracleResult.facts.mime must be image/png");
    assertInteger(record.facts.byteLength, 1, MAX_PNG_BYTES, "oracleResult.facts.byteLength");
    assertSha256(record.facts.fileSha256, "oracleResult.facts.fileSha256");
    assertSha256(record.facts.decodedPixelSha256, "oracleResult.facts.decodedPixelSha256");
    assertInteger(record.facts.width, 1, MAX_DIMENSION, "oracleResult.facts.width");
    assertInteger(record.facts.height, 1, MAX_DIMENSION, "oracleResult.facts.height");
    assertBoolean(record.facts.alphaPresent, "oracleResult.facts.alphaPresent");
    const fixedFacts = {
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      metadataPolicy: "strip-all-except-color-contract",
      interlace: "forbidden",
      animation: "forbidden",
    };
    for (const [key, expected] of Object.entries(fixedFacts)) {
      if (record.facts[key] !== expected) reject("ORACLE_RESULT_FACTS_INVALID", `oracleResult.facts.${key} must be ${expected}`);
    }
    if (!new Set(["filter-0-only", "noncanonical-filter-present"]).has(record.facts.pngFilterPolicy)) {
      reject("ORACLE_RESULT_FACTS_INVALID", "oracleResult.facts.pngFilterPolicy is invalid");
    }
    if (record.facts.byteLength !== record.actualBytes.byteLength
      || record.facts.fileSha256 !== record.actualBytes.fileSha256
      || record.facts.decodedPixelSha256 !== record.actualBytes.decodedPixelSha256) {
      reject("ORACLE_RESULT_FACTS_INVALID", "oracleResult facts do not bind actualBytes identity");
    }
  } else if (record.actualBytes.decodedPixelSha256 !== null) {
    reject("ORACLE_RESULT_FACTS_INVALID", "failed independent decode cannot retain a decoded pixel hash");
  }

  if (!Array.isArray(record.checks) || record.checks.length !== ORACLE_CHECK_IDS.length) {
    reject("ORACLE_RESULT_CHECKS_INVALID", "oracleResult.checks must contain exactly the 21 frozen checks");
  }
  const checkMap = new Map();
  record.checks.forEach((entry, index) => {
    assertExactObject(entry, ORACLE_CHECK_KEYS, `oracleResult.checks[${index}]`);
    if (entry.checkId !== ORACLE_CHECK_IDS[index] || checkMap.has(entry.checkId)) {
      reject("ORACLE_RESULT_CHECKS_INVALID", "oracleResult checks must be unique and remain in frozen order");
    }
    if (typeof entry.expected !== "string" || entry.expected.length < 1
      || typeof entry.actual !== "string" || entry.actual.length < 1
      || !new Set(["pass", "non-pass", "unknown"]).has(entry.status)) {
      reject("ORACLE_RESULT_CHECKS_INVALID", `oracleResult.checks[${index}] values are invalid`);
    }
    if ((entry.status === "pass" && entry.reason !== null)
      || (entry.status !== "pass" && (typeof entry.reason !== "string" || entry.reason.length < 1))) {
      reject("ORACLE_RESULT_CHECKS_INVALID", `oracleResult.checks[${index}] reason does not match status`);
    }
    checkMap.set(entry.checkId, entry);
  });
  const decodePassed = checkMap.get("independent-decode")?.status === "pass";
  if (decodePassed !== (record.facts !== null)) {
    reject("ORACLE_RESULT_CHECKS_INVALID", "independent-decode status and facts availability differ");
  }
  const independent = checkMap.get("independent-oracle");
  if (independent.status !== "pass" || independent.actual !== record.oracleRef.implementationSha256
    || independent.expected !== `not:${independent.expected.slice(4)}`
    || !SHA256_PATTERN.test(independent.expected.slice(4))
    || independent.expected.slice(4) === independent.actual) {
    reject("ORACLE_RESULT_CHECKS_INVALID", "independent-oracle check is not a disjoint implementation binding");
  }
  if (checkMap.get("operation-binding")?.expected !== record.operation) {
    reject("ORACLE_RESULT_CHECKS_INVALID", "operation-binding expected value differs from oracleResult.operation");
  }
  if (record.facts !== null) {
    const actualProjection = {
      "mime-signature": record.facts.mime,
      dimensions: `${record.facts.width}x${record.facts.height}`,
      orientation: display(record.facts.orientation),
      "embedded-srgb": record.facts.colorSpace,
      rgba8: record.facts.pixelLayout,
      "straight-alpha": record.facts.alphaMode,
      "alpha-presence": display(record.facts.alphaPresent),
      "metadata-policy": record.facts.metadataPolicy,
      "png-filter-policy": record.facts.pngFilterPolicy === "filter-0-only" ? "filter-0-only" : checkMap.get("png-filter-policy")?.actual,
      interlace: record.facts.interlace,
      animation: record.facts.animation,
      "byte-length": display(record.facts.byteLength),
      "file-sha256": record.facts.fileSha256,
      "decoded-pixel-sha256": record.facts.decodedPixelSha256,
    };
    for (const [checkId, actual] of Object.entries(actualProjection)) {
      if (checkMap.get(checkId)?.actual !== actual) {
        reject("ORACLE_RESULT_CHECKS_INVALID", `${checkId} actual value differs from the independently decoded facts`);
      }
    }
  }
  if (checkMap.get("gold-provenance")?.expected !== "candidate-independent"
    || checkMap.get("gold-provenance")?.actual !== "candidate-independent"
    || checkMap.get("gold-provenance")?.status !== "pass") {
    reject("ORACLE_RESULT_CHECKS_INVALID", "gold-provenance check must remain candidate-independent");
  }
  const computedOverall = record.checks.every(({ status }) => status === "pass") ? "pass" : "non-pass";
  if (record.overallStatus !== computedOverall) {
    reject("ORACLE_RESULT_STATUS_MISMATCH", "overallStatus must be the conjunction of all 21 checks");
  }

  assertExactObject(record.evidenceBoundary, ORACLE_EVIDENCE_BOUNDARY_KEYS, "oracleResult.evidenceBoundary");
  const expectedBoundary = {
    productSupport: false,
    gateBState: "oracle-only-not-entered",
    c1: 0,
    u1: 0,
    e1: 0,
    r1: 0,
    o1: 0,
    g1: 0,
    v1: 0,
  };
  for (const [key, expected] of Object.entries(expectedBoundary)) {
    if (record.evidenceBoundary[key] !== expected) {
      reject("ORACLE_RESULT_EVIDENCE_BOUNDARY_INVALID", `oracleResult.evidenceBoundary.${key} is invalid`);
    }
  }
  assertUtc(record.observedAt, "oracleResult.observedAt");
  assertSelfHash(record, "oracleResult");
  return record;
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

function paeth(left, up, upLeft) {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

function reconstructScanlines(inflated, width, height) {
  const stride = width * 4;
  const rgba = Buffer.allocUnsafe(stride * height);
  const filterTypes = [];
  for (let y = 0; y < height; y += 1) {
    const inputOffset = y * (stride + 1);
    const outputOffset = y * stride;
    const filterType = inflated[inputOffset];
    if (filterType > 4) reject("ORACLE_PNG_FILTER_INVALID", `scanline ${y} uses unknown PNG filter ${filterType}`);
    filterTypes.push(filterType);
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset + 1 + x];
      const left = x >= 4 ? rgba[outputOffset + x - 4] : 0;
      const up = y > 0 ? rgba[outputOffset - stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[outputOffset - stride + x - 4] : 0;
      let predictor = 0;
      if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = up;
      else if (filterType === 3) predictor = Math.floor((left + up) / 2);
      else if (filterType === 4) predictor = paeth(left, up, upLeft);
      rgba[outputOffset + x] = (raw + predictor) & 0xff;
    }
  }
  return { rgba, filterTypes };
}

export function decodeIndependentPngSlice05(input) {
  if (!(input instanceof Uint8Array)) reject("ORACLE_BYTES_INVALID", "PNG input must be a Uint8Array");
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.length > MAX_PNG_BYTES) reject("ORACLE_BYTES_LIMIT_EXCEEDED", "PNG exceeds the 1 MiB output limit");
  if (bytes.length < PNG_SIGNATURE.length + 12 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    reject("ORACLE_PNG_SIGNATURE_MISMATCH", "actual bytes do not carry the PNG signature");
  }

  let offset = PNG_SIGNATURE.length;
  let width = null;
  let height = null;
  let sawHeader = false;
  let sawSrgb = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let sawEnd = false;
  const compressedParts = [];
  const chunkTypes = [];

  while (offset < bytes.length) {
    if (bytes.length - offset < 12) reject("ORACLE_PNG_CHUNK_TRUNCATED", "PNG ends inside a chunk header");
    const length = bytes.readUInt32BE(offset);
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(type) || (typeBytes[2] & 0x20) !== 0) {
      reject("ORACLE_PNG_CHUNK_TYPE_INVALID", "PNG chunk type violates the PNG naming rules");
    }
    const dataStart = offset + 8;
    if (length > bytes.length - dataStart - 4) {
      reject("ORACLE_PNG_CHUNK_TRUNCATED", `PNG ${type} chunk exceeds the input length`);
    }
    const dataEnd = dataStart + length;
    const storedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (storedCrc !== actualCrc) reject("ORACLE_PNG_CRC_MISMATCH", `PNG ${type} chunk CRC does not match`);
    chunkTypes.push(type);

    if (type === "IHDR") {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        reject("ORACLE_PNG_STRUCTURE_INVALID", "PNG requires exactly one leading 13-byte IHDR");
      }
      sawHeader = true;
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      assertInteger(width, 1, MAX_DIMENSION, "PNG width");
      assertInteger(height, 1, MAX_DIMENSION, "PNG height");
      if (bytes[dataStart + 8] !== 8 || bytes[dataStart + 9] !== 6) {
        reject("ORACLE_PNG_PIXEL_LAYOUT_MISMATCH", "PNG must use 8-bit RGBA color type 6");
      }
      if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0) {
        reject("ORACLE_PNG_METHOD_MISMATCH", "PNG must use standard compression and filter methods");
      }
      if (bytes[dataStart + 12] !== 0) reject("ORACLE_PNG_INTERLACE_FORBIDDEN", "interlaced PNG is forbidden");
    } else if (type === "sRGB") {
      if (!sawHeader || sawSrgb || sawImageData || length !== 1 || bytes[dataStart] > 3) {
        reject("ORACLE_PNG_SRGB_INVALID", "PNG requires one valid sRGB chunk before IDAT");
      }
      sawSrgb = true;
    } else if (type === "IDAT") {
      if (!sawHeader || !sawSrgb || imageDataEnded || length === 0) {
        reject("ORACLE_PNG_STRUCTURE_INVALID", "PNG IDAT must be non-empty, contiguous, and follow sRGB");
      }
      sawImageData = true;
      compressedParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      if (!sawImageData || sawEnd || length !== 0) {
        reject("ORACLE_PNG_STRUCTURE_INVALID", "PNG requires one empty IEND after IDAT");
      }
      sawEnd = true;
    } else if (type === "acTL" || type === "fcTL" || type === "fdAT") {
      reject("ORACLE_PNG_APNG_FORBIDDEN", `APNG chunk ${type} is forbidden`);
    } else if (type === "iCCP") {
      reject("ORACLE_PNG_ICCP_FORBIDDEN", "iCCP is outside the embedded-sRGB color contract");
    } else if (type === "eXIf") {
      reject("ORACLE_PNG_EXIF_FORBIDDEN", "eXIf is forbidden; output orientation is fixed at 1");
    } else if ((typeBytes[0] & 0x20) === 0) {
      reject("ORACLE_PNG_UNKNOWN_CRITICAL", `unknown critical PNG chunk ${type} is forbidden`);
    } else {
      reject("ORACLE_PNG_METADATA_FORBIDDEN", `ancillary PNG chunk ${type} violates the closed metadata policy`);
    }

    offset = dataEnd + 4;
    if (sawImageData && type !== "IDAT") imageDataEnded = true;
    if (type === "IEND") break;
  }

  if (!sawHeader || !sawSrgb || !sawImageData || !sawEnd) {
    reject("ORACLE_PNG_STRUCTURE_INVALID", "PNG requires IHDR, sRGB, IDAT, and IEND");
  }
  if (offset !== bytes.length) reject("ORACLE_PNG_TRAILING_BYTES", "bytes after IEND are forbidden");

  const stride = width * 4;
  const expectedInflatedLength = (stride + 1) * height;
  const compressed = Buffer.concat(compressedParts);
  let inflated;
  let consumed;
  try {
    const result = inflateSync(compressed, { info: true, maxOutputLength: expectedInflatedLength });
    inflated = result.buffer;
    consumed = result.engine.bytesWritten;
  } catch (error) {
    reject("ORACLE_PNG_DECODE_FAILED", `PNG zlib stream could not be decoded: ${error.message}`);
  }
  if (inflated.length !== expectedInflatedLength || consumed !== compressed.length) {
    reject("ORACLE_PNG_DECODE_LENGTH_MISMATCH", "PNG zlib data has trailing bytes or an unexpected decoded length");
  }

  const { rgba, filterTypes } = reconstructScanlines(inflated, width, height);
  const alphaPresent = rgba.some((value, index) => index % 4 === 3 && value < 255);
  return {
    width,
    height,
    rgba,
    filterTypes,
    filter0Only: filterTypes.every((value) => value === 0),
    alphaPresent,
    fileSha256: sha256Slice05(bytes),
    decodedPixelSha256: sha256Slice05(rgba),
    byteLength: bytes.length,
    chunkTypes,
    mime: "image/png",
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    metadataPolicy: "strip-all-except-color-contract",
    interlace: "forbidden",
    animation: "forbidden",
  };
}

function outputFactsFromDecoded(decoded) {
  return {
    mime: decoded.mime,
    byteLength: decoded.byteLength,
    fileSha256: decoded.fileSha256,
    decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width,
    height: decoded.height,
    pixelLayout: decoded.pixelLayout,
    colorSpace: decoded.colorSpace,
    orientation: decoded.orientation,
    alphaMode: decoded.alphaMode,
    alphaPresent: decoded.alphaPresent,
    metadataPolicy: decoded.metadataPolicy,
    pngFilterPolicy: decoded.filter0Only ? "filter-0-only" : "noncanonical-filter-present",
    interlace: decoded.interlace,
    animation: decoded.animation,
  };
}

/**
 * Adapter-facing pre-commit oracle. It reopens the worker's actual bytes and
 * returns exactly the fact shape consumed by the Slice 05 adapter. This API
 * intentionally has no access to candidate code, candidate decode results, or
 * an artifact declaration that could self-certify the output.
 */
export function verifyOutputBytesSlice05({ operation, bytes, expected }) {
  if (operation !== "normalize" && operation !== "export") {
    reject("ORACLE_OPERATION_INVALID", "operation must be normalize or export");
  }
  assertExactObject(expected, operation === "normalize" ? OUTPUT_FACT_KEYS : EXPORT_EXPECTED_KEYS, "expected");
  const decoded = decodeIndependentPngSlice05(bytes);
  const facts = outputFactsFromDecoded(decoded);
  if (!decoded.filter0Only) reject("ORACLE_PNG_FILTER_POLICY_MISMATCH", "worker output must use filter 0 on every scanline");
  const identityKeys = [
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
  ];
  for (const key of identityKeys) {
    if (facts[key] !== expected[key]) {
      reject("ORACLE_EXPECTED_IDENTITY_MISMATCH", `independent ${key} fact differs from the frozen expected identity`);
    }
  }
  return Object.freeze(facts);
}

function display(value) {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function check(checkId, expected, actual, passes, reason = null, unknown = false) {
  return {
    checkId,
    expected: display(expected),
    actual: display(actual),
    status: unknown ? "unknown" : passes ? "pass" : "non-pass",
    reason: passes ? null : reason,
  };
}

function expectedParentForArtifact(artifact) {
  if (artifact.operation === "normalize") {
    return {
      id: artifact.parent.sourceAssetId,
      artifactSha256: null,
      fileSha256: artifact.parent.sourceFileSha256,
      decodedPixelSha256: artifact.parent.sourceDecodedPixelSha256,
      manifestSha256: artifact.parent.sourceManifestSha256,
    };
  }
  return {
    id: artifact.parent.normalizedImageId,
    artifactSha256: artifact.parent.normalizedArtifactSha256,
    fileSha256: artifact.parent.normalizedFileSha256,
    decodedPixelSha256: artifact.parent.normalizedDecodedPixelSha256,
    manifestSha256: null,
  };
}

function evaluateArtifact(
  { artifact, actualBytes, goldRecord, oracleImplementationSha256, observedAt },
  operation,
  artifactParentIdentity = expectedParentForArtifact(artifact),
) {
  validateArtifact(artifact, operation);
  validateGoldRecordSlice05(goldRecord);
  assertSha256(oracleImplementationSha256, "oracleImplementationSha256");
  assertUtc(observedAt, "observedAt");
  if (Date.parse(goldRecord.frozenAt) > Date.parse(artifact.createdAt)
    || Date.parse(artifact.createdAt) > Date.parse(observedAt)) {
    reject("ORACLE_TIME_ORDER_INVALID", "gold freeze, artifact creation, and observation timestamps are out of order");
  }
  if (oracleImplementationSha256 === artifact.adapterRef.implementationSha256) {
    reject("ORACLE_NOT_INDEPENDENT", "candidate adapter implementation cannot serve as the independent oracle");
  }
  if (goldRecord.provenance.producerId === artifact.adapterRef.id
    || goldRecord.provenance.implementationSha256 === artifact.adapterRef.implementationSha256) {
    reject("ORACLE_GOLD_CANDIDATE_TAINTED", "candidate adapter identity or implementation cannot produce gold");
  }
  if (operation === "normalize" && artifact.producerRef.kind !== "candidate-adapter") {
    reject("ORACLE_PRODUCER_INVALID", "normalize candidate output must be produced by the candidate adapter");
  }
  if (!(actualBytes instanceof Uint8Array)) reject("ORACLE_BYTES_INVALID", "actualBytes must be a Uint8Array");

  let decoded = null;
  let decodeError = null;
  try {
    decoded = decodeIndependentPngSlice05(actualBytes);
  } catch (error) {
    if (!(error instanceof Slice05OracleError)) throw error;
    decodeError = error;
  }
  const actualFileHash = sha256Slice05(actualBytes);
  const actualLength = actualBytes.byteLength;
  const unavailable = `unavailable:${decodeError?.code ?? "none"}`;
  const goldParent = stableStringifySlice05(goldRecord.expected.parentIdentity).trim();
  const artifactParent = stableStringifySlice05(artifactParentIdentity).trim();

  const checks = [
    check("independent-oracle", `not:${artifact.adapterRef.implementationSha256}`, oracleImplementationSha256, true),
    check("operation-binding", operation, goldRecord.operation, goldRecord.operation === operation, "gold operation differs from artifact operation"),
    check("source-binding", artifact.attempt.sourceId, goldRecord.sourceId, artifact.attempt.sourceId === goldRecord.sourceId, "gold source differs from the attempted source"),
    check("partition-binding", artifact.attempt.partition, goldRecord.partition, artifact.attempt.partition === goldRecord.partition, "gold partition differs from the attempted partition"),
    check("parent-identity", goldParent, artifactParent, goldParent === artifactParent, "artifact parent identity differs from frozen gold"),
    check("independent-decode", "closed-png-profile-decodes", decodeError ? `error:${decodeError.code}` : "closed-png-profile-decodes", decodeError === null, decodeError?.message ?? null),
    check("mime-signature", "image/png", decoded?.mime ?? unavailable, decoded?.mime === "image/png", "actual bytes are not a valid PNG", decoded === null),
    check("dimensions", `${goldRecord.expected.width}x${goldRecord.expected.height}`, decoded ? `${decoded.width}x${decoded.height}` : unavailable, decoded ? decoded.width === goldRecord.expected.width && decoded.height === goldRecord.expected.height && decoded.width === artifact.image.width && decoded.height === artifact.image.height : false, "decoded dimensions differ from artifact or gold", decoded === null),
    check("orientation", goldRecord.expected.orientation, decoded?.orientation ?? unavailable, decoded ? decoded.orientation === goldRecord.expected.orientation && decoded.orientation === artifact.image.orientation : false, "orientation is not fixed to 1", decoded === null),
    check("embedded-srgb", goldRecord.expected.colorSpace, decoded?.colorSpace ?? unavailable, decoded ? decoded.colorSpace === goldRecord.expected.colorSpace && decoded.colorSpace === artifact.image.colorSpace : false, "embedded sRGB contract is not met", decoded === null),
    check("rgba8", goldRecord.expected.pixelLayout, decoded?.pixelLayout ?? unavailable, decoded ? decoded.pixelLayout === goldRecord.expected.pixelLayout && decoded.pixelLayout === artifact.image.pixelLayout : false, "decoded pixels are not RGBA8", decoded === null),
    check("straight-alpha", goldRecord.expected.alphaMode, decoded?.alphaMode ?? unavailable, decoded ? decoded.alphaMode === goldRecord.expected.alphaMode && decoded.alphaMode === artifact.image.alphaMode : false, "alpha representation is outside the contract", decoded === null),
    check("alpha-presence", goldRecord.expected.alphaPresent, decoded?.alphaPresent ?? unavailable, decoded ? decoded.alphaPresent === goldRecord.expected.alphaPresent && decoded.alphaPresent === artifact.image.alphaPresent : false, "alpha presence differs from artifact or gold", decoded === null),
    check("metadata-policy", goldRecord.expected.metadataPolicy, decoded?.metadataPolicy ?? unavailable, decoded ? decoded.metadataPolicy === goldRecord.expected.metadataPolicy && decoded.metadataPolicy === artifact.image.metadataPolicy : false, "metadata policy is outside the closed profile", decoded === null),
    check("png-filter-policy", goldRecord.expected.pngFilterPolicy, decoded ? (decoded.filter0Only ? "filter-0-only" : `filters:${decoded.filterTypes.join(",")}`) : unavailable, decoded ? decoded.filter0Only && artifact.image.pngFilterPolicy === goldRecord.expected.pngFilterPolicy : false, "decoded PNG uses a non-zero scanline filter", decoded === null),
    check("interlace", goldRecord.expected.interlace, decoded?.interlace ?? unavailable, decoded ? decoded.interlace === goldRecord.expected.interlace && decoded.interlace === artifact.image.interlace : false, "interlace policy is not met", decoded === null),
    check("animation", goldRecord.expected.animation, decoded?.animation ?? unavailable, decoded ? decoded.animation === goldRecord.expected.animation && decoded.animation === artifact.image.animation : false, "animation policy is not met", decoded === null),
    check("byte-length", artifact.bytes.byteLength, actualLength, artifact.bytes.byteLength === actualLength, "artifact byte length differs from reopened bytes"),
    check("file-sha256", goldRecord.expected.fileSha256 === null ? artifact.bytes.fileSha256 : `${artifact.bytes.fileSha256}|${goldRecord.expected.fileSha256}`, actualFileHash, actualFileHash === artifact.bytes.fileSha256 && (goldRecord.expected.fileSha256 === null || actualFileHash === goldRecord.expected.fileSha256), "reopened file hash differs from artifact or gold"),
    check("decoded-pixel-sha256", `${artifact.bytes.decodedPixelSha256}|${goldRecord.expected.decodedPixelSha256}`, decoded?.decodedPixelSha256 ?? unavailable, decoded ? decoded.decodedPixelSha256 === artifact.bytes.decodedPixelSha256 && decoded.decodedPixelSha256 === goldRecord.expected.decodedPixelSha256 : false, "independently decoded pixel hash differs from artifact or gold", decoded === null),
    check("gold-provenance", "candidate-independent", "candidate-independent", true),
  ];
  const overallStatus = checks.every(({ status }) => status === "pass") ? "pass" : "non-pass";
  const facts = decoded === null ? null : outputFactsFromDecoded(decoded);
  const result = {
    schemaVersion: ORACLE_RESULT_SCHEMA_VERSION,
    oracleResultId: `oracle-result.${artifact.artifactId}`,
    oracleRef: {
      id: SLICE05_INDEPENDENT_PNG_ORACLE_ID,
      implementationSha256: oracleImplementationSha256,
    },
    operation,
    artifactRef: { id: artifact.artifactId, contentHash: artifact.contentHash },
    goldRecordRef: { id: goldRecord.goldRecordId, contentHash: goldRecord.contentHash },
    actualBytes: {
      relativePath: artifact.bytes.relativePath,
      byteLength: actualLength,
      fileSha256: actualFileHash,
      decodedPixelSha256: decoded?.decodedPixelSha256 ?? null,
    },
    facts,
    checks,
    overallStatus,
    evidenceBoundary: {
      productSupport: false,
      gateBState: "oracle-only-not-entered",
      c1: 0,
      u1: 0,
      e1: 0,
      r1: 0,
      o1: 0,
      g1: 0,
      v1: 0,
    },
    observedAt,
    contentHash: "",
  };
  result.contentHash = contentHashSlice05(result);
  return validateOracleResultSlice05(result);
}

export function evaluateNormalizedImageSlice05(args) {
  return evaluateArtifact(args, "normalize");
}

export function evaluateDeliveryArtifactSlice05(args) {
  const { parentNormalizedImage } = args ?? {};
  validateNormalizedImageSlice05(parentNormalizedImage);
  validateGoldRecordSlice05(args?.goldRecord);
  if (parentNormalizedImage.producerRef.kind !== "independent-fixture-generator") {
    reject("ORACLE_EXPORT_PARENT_CANDIDATE_TAINTED", "export input must come from an independent fixture generator");
  }
  const artifact = args.artifact;
  const matchesParent = artifact?.parent?.normalizedImageId === parentNormalizedImage.artifactId
    && artifact?.parent?.normalizedArtifactSha256 === parentNormalizedImage.contentHash
    && artifact?.parent?.normalizedFileSha256 === parentNormalizedImage.bytes.fileSha256
    && artifact?.parent?.normalizedDecodedPixelSha256 === parentNormalizedImage.bytes.decodedPixelSha256;
  if (!matchesParent) {
    reject("ORACLE_EXPORT_PARENT_IDENTITY_MISMATCH", "delivery parent does not match the independently produced NormalizedImage");
  }
  if (args.goldRecord.expected.parentIdentity.manifestSha256
    !== parentNormalizedImage.parent.sourceManifestSha256) {
    reject("ORACLE_EXPORT_PARENT_MANIFEST_MISMATCH", "export gold does not bind the independent parent's source provenance manifest");
  }
  if (artifact.attempt.sourceId !== parentNormalizedImage.artifactId
    || artifact.attempt.partition !== parentNormalizedImage.attempt.partition
    || Date.parse(parentNormalizedImage.createdAt) > Date.parse(args.goldRecord.frozenAt)
    || Date.parse(parentNormalizedImage.createdAt) > Date.parse(artifact.createdAt)) {
    reject("ORACLE_EXPORT_PARENT_LINEAGE_MISMATCH", "independent input, gold freeze, and delivery attempt are not ordered within one lineage");
  }
  return evaluateArtifact(args, "export", {
    ...expectedParentForArtifact(artifact),
    manifestSha256: parentNormalizedImage.parent.sourceManifestSha256,
  });
}
