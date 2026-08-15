import { createHash } from "node:crypto";

import { validateGoldRecordSlice05 } from "./research-independent-png-oracle-slice05.mjs";

export const SLICE09_GOLD_IDENTITY_VERSION = "gold-identity.slice09.v0";
export const SLICE09_GOLD_IDENTITY_PROTOCOL_ID = "GATEB-GOLD-IDENTITY@0.9.0";

const HEX = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/u;
const SAFE_PATH = /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._@/:-]{1,500}$/u;
const OPERATIONS = new Set(["normalize", "export"]);
const EXPECTED_KEYS = Object.freeze([
  "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace",
  "orientation", "alphaMode", "alphaPresent", "metadataPolicy",
  "pngFilterPolicy", "interlace", "animation",
]);

export class Slice09GoldIdentityError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "Slice09GoldIdentityError";
    this.code = code;
    this.workerObservation = null;
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8");
}

export function sha256Slice09(value) {
  return createHash("sha256").update(value).digest("hex");
}

function selfHash(record) {
  const { contentHash: _ignored, ...payload } = record;
  return sha256Slice09(canonicalBytes(payload));
}

export function contentHashSlice09(record) {
  return selfHash(record);
}

function fail(message, code = "S09_GOLD_IDENTITY_INVALID", options = {}) {
  throw new Slice09GoldIdentityError(code, message, options);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a closed object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has missing or additional fields`);
  }
}

function validateId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value) || value.includes("..")) fail(`${label} is invalid`);
}

function validateRef(ref, label) {
  exactKeys(ref, ["path", "id", "contentHash", "byteLength", "fileSha256"], label);
  validateId(ref.id, `${label}.id`);
  if (typeof ref.path !== "string" || !SAFE_PATH.test(ref.path) || ref.path.startsWith("/") || /^[A-Za-z]:/u.test(ref.path)) {
    fail(`${label}.path is outside the closed relative-path profile`);
  }
  if (!HEX.test(ref.contentHash) || !HEX.test(ref.fileSha256)
    || !Number.isInteger(ref.byteLength) || ref.byteLength < 2) fail(`${label} is not an exact immutable reference`);
}

function validateExpected(expected) {
  exactKeys(expected, EXPECTED_KEYS, "goldIdentity.expected");
  if (!HEX.test(expected.decodedPixelSha256)
    || !Number.isInteger(expected.width) || expected.width < 1
    || !Number.isInteger(expected.height) || expected.height < 1
    || expected.pixelLayout !== "RGBA8"
    || expected.orientation !== 1
    || typeof expected.alphaPresent !== "boolean") fail("goldIdentity.expected is outside the frozen profile");
  for (const key of ["colorSpace", "alphaMode", "metadataPolicy", "pngFilterPolicy", "interlace", "animation"]) {
    if (typeof expected[key] !== "string" || expected[key].length < 1 || expected[key].length > 100) {
      fail(`goldIdentity.expected.${key} is invalid`);
    }
  }
}

function validateProducer(producer) {
  exactKeys(producer, ["producerId", "producerVersion", "implementationSha256"], "goldIdentity.producer");
  validateId(producer.producerId, "goldIdentity.producer.producerId");
  if (typeof producer.producerVersion !== "string" || producer.producerVersion.length < 1 || producer.producerVersion.length > 50
    || !HEX.test(producer.implementationSha256)) fail("goldIdentity.producer is invalid");
}

function assertRecordBytes(goldRecord, goldRecordBytes, goldRef) {
  if (!Buffer.isBuffer(goldRecordBytes)) fail("gold record bytes must be a Buffer");
  if (goldRecordBytes.length !== goldRef.byteLength || sha256Slice09(goldRecordBytes) !== goldRef.fileSha256) {
    fail("gold record bytes differ from the immutable reference", "S09_GOLD_RECORD_BYTES_MISMATCH");
  }
  let reopened;
  try { reopened = JSON.parse(goldRecordBytes.toString("utf8")); } catch (cause) {
    fail("gold record bytes are not valid JSON", "S09_GOLD_RECORD_BYTES_MISMATCH", { cause });
  }
  if (JSON.stringify(stable(reopened)) !== JSON.stringify(stable(goldRecord))) {
    fail("gold record object differs from reopened bytes", "S09_GOLD_RECORD_BYTES_MISMATCH");
  }
}

function validateSourceBinding(operation, sourceId, goldSourceId) {
  if (!sourceId.startsWith(`s09.${operation}.`) || typeof goldSourceId !== "string" || goldSourceId.length < 1) {
    fail("operation and source identities do not match Slice 09");
  }
}

export function validateSlice09GoldIdentity(identity) {
  exactKeys(identity, [
    "schemaVersion", "identityId", "operation", "sourceId", "manifestRef", "goldRef",
    "goldRecordId", "goldRecordContentHash", "goldRecordFileSha256", "goldRecordByteLength",
    "goldSourceId", "expected", "producer", "contentHash",
  ], "goldIdentity");
  if (identity.schemaVersion !== SLICE09_GOLD_IDENTITY_VERSION || !OPERATIONS.has(identity.operation)) {
    fail("gold identity version or operation is invalid");
  }
  validateId(identity.identityId, "goldIdentity.identityId");
  validateId(identity.sourceId, "goldIdentity.sourceId");
  validateId(identity.goldRecordId, "goldIdentity.goldRecordId");
  validateId(identity.goldSourceId, "goldIdentity.goldSourceId");
  validateRef(identity.manifestRef, "goldIdentity.manifestRef");
  validateRef(identity.goldRef, "goldIdentity.goldRef");
  validateExpected(identity.expected);
  validateProducer(identity.producer);
  validateSourceBinding(identity.operation, identity.sourceId, identity.goldSourceId);
  if (identity.identityId !== `gold-identity.${identity.sourceId}`
    || identity.goldRef.id !== identity.goldRecordId
    || identity.goldRef.contentHash !== identity.goldRecordContentHash
    || identity.goldRef.fileSha256 !== identity.goldRecordFileSha256
    || identity.goldRef.byteLength !== identity.goldRecordByteLength
    || !HEX.test(identity.goldRecordContentHash)
    || !HEX.test(identity.goldRecordFileSha256)
    || !Number.isInteger(identity.goldRecordByteLength) || identity.goldRecordByteLength < 2) {
    fail("gold identity does not cross-bind its record reference");
  }
  if (identity.contentHash !== selfHash(identity)) {
    fail("gold identity self hash is invalid", "S09_GOLD_IDENTITY_HASH_MISMATCH");
  }
  return true;
}

export function createSlice09GoldIdentity({ operation, sourceId, manifestRef, goldRef, goldRecord, goldRecordBytes } = {}) {
  if (!OPERATIONS.has(operation)) fail("operation is invalid");
  validateId(sourceId, "sourceId");
  validateRef(manifestRef, "manifestRef");
  validateRef(goldRef, "goldRef");
  try { validateGoldRecordSlice05(goldRecord); } catch (cause) {
    fail("gold record does not satisfy the frozen Slice 05 shape", "S09_GOLD_RECORD_INVALID", { cause });
  }
  assertRecordBytes(goldRecord, goldRecordBytes, goldRef);
  if (goldRecord.operation !== operation
    || goldRecord.goldRecordId !== goldRef.id
    || goldRecord.contentHash !== goldRef.contentHash
    || goldRecord.provenance.candidateProduced !== false
    || goldRecord.provenance.candidateOutputUsed !== false
    || goldRecord.provenance.candidateDependencyUsed !== false) {
    fail("gold record identity, operation or independence differs from the frozen reference");
  }
  validateSourceBinding(operation, sourceId, goldRecord.sourceId);
  const expected = Object.fromEntries(EXPECTED_KEYS.map((key) => [key, goldRecord.expected[key]]));
  const payload = {
    schemaVersion: SLICE09_GOLD_IDENTITY_VERSION,
    identityId: `gold-identity.${sourceId}`,
    operation,
    sourceId,
    manifestRef: structuredClone(manifestRef),
    goldRef: structuredClone(goldRef),
    goldRecordId: goldRecord.goldRecordId,
    goldRecordContentHash: goldRecord.contentHash,
    goldRecordFileSha256: goldRef.fileSha256,
    goldRecordByteLength: goldRef.byteLength,
    goldSourceId: goldRecord.sourceId,
    expected,
    producer: {
      producerId: goldRecord.provenance.producerId,
      producerVersion: goldRecord.provenance.producerVersion,
      implementationSha256: goldRecord.provenance.implementationSha256,
    },
  };
  const identity = Object.freeze({ ...payload, contentHash: sha256Slice09(canonicalBytes(payload)) });
  validateSlice09GoldIdentity(identity);
  return identity;
}

export async function executeSlice09GoldBoundBranch({ disposition, goldIdentity, goldRecord, goldRecordBytes, executeApplicable, executeRejection } = {}) {
  if (disposition === "rejection") {
    if (goldIdentity !== null || goldRecord !== null || goldRecordBytes !== null || typeof executeRejection !== "function") {
      fail("rejection branch must remain gold-free", "S09_CASE_MATERIAL_INVALID");
    }
    return executeRejection();
  }
  if (disposition !== "applicable" || typeof executeApplicable !== "function") {
    fail("applicable branch executor is unavailable", "S09_CASE_MATERIAL_INVALID");
  }
  validateSlice09GoldIdentity(goldIdentity);
  try { validateGoldRecordSlice05(goldRecord); } catch (cause) {
    fail("applicable gold record is invalid", "S09_GOLD_RECORD_INVALID", { cause });
  }
  assertRecordBytes(goldRecord, goldRecordBytes, goldIdentity.goldRef);
  if (goldRecord.goldRecordId !== goldIdentity.goldRecordId
    || goldRecord.contentHash !== goldIdentity.goldRecordContentHash
    || goldRecord.sourceId !== goldIdentity.goldSourceId
    || goldRecord.operation !== goldIdentity.operation) {
    fail("applicable material differs from typed gold identity", "S09_CASE_MATERIAL_INVALID");
  }
  return executeApplicable(Object.freeze({
    goldRecordId: goldIdentity.goldRecordId,
    goldIdentityHash: goldIdentity.contentHash,
    expected: structuredClone(goldIdentity.expected),
  }));
}

const recordRefSchema = Object.freeze({
  type: "object", additionalProperties: false,
  required: ["path", "id", "contentHash", "byteLength", "fileSha256"],
  properties: {
    path: { type: "string", pattern: SAFE_PATH.source }, id: { type: "string", pattern: SAFE_ID.source },
    contentHash: { type: "string", pattern: HEX.source }, byteLength: { type: "integer", minimum: 2 },
    fileSha256: { type: "string", pattern: HEX.source },
  },
});

export const SLICE09_GOLD_IDENTITY_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://single-image-studio.invalid/research/slice-09/schemas/gold-identity.slice09.v0.schema.json",
  type: "object", additionalProperties: false,
  required: [
    "schemaVersion", "identityId", "operation", "sourceId", "manifestRef", "goldRef",
    "goldRecordId", "goldRecordContentHash", "goldRecordFileSha256", "goldRecordByteLength",
    "goldSourceId", "expected", "producer", "contentHash",
  ],
  properties: {
    schemaVersion: { const: SLICE09_GOLD_IDENTITY_VERSION },
    identityId: { type: "string", pattern: "^gold-identity\\.s09\\.(normalize|export)\\.[A-Za-z0-9._:@-]+$" },
    operation: { enum: ["normalize", "export"] },
    sourceId: { type: "string", pattern: "^s09\\.(normalize|export)\\.[A-Za-z0-9._:@-]+$" },
    manifestRef: recordRefSchema, goldRef: recordRefSchema,
    goldRecordId: { type: "string", pattern: SAFE_ID.source },
    goldRecordContentHash: { type: "string", pattern: HEX.source },
    goldRecordFileSha256: { type: "string", pattern: HEX.source },
    goldRecordByteLength: { type: "integer", minimum: 2 },
    goldSourceId: { type: "string", pattern: SAFE_ID.source },
    expected: {
      type: "object", additionalProperties: false, required: EXPECTED_KEYS,
      properties: {
        decodedPixelSha256: { type: "string", pattern: HEX.source }, width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 }, pixelLayout: { const: "RGBA8" }, colorSpace: { type: "string" },
        orientation: { const: 1 }, alphaMode: { type: "string" }, alphaPresent: { type: "boolean" },
        metadataPolicy: { type: "string" }, pngFilterPolicy: { type: "string" }, interlace: { type: "string" },
        animation: { type: "string" },
      },
    },
    producer: {
      type: "object", additionalProperties: false,
      required: ["producerId", "producerVersion", "implementationSha256"],
      properties: {
        producerId: { type: "string", pattern: SAFE_ID.source }, producerVersion: { type: "string" },
        implementationSha256: { type: "string", pattern: HEX.source },
      },
    },
    contentHash: { type: "string", pattern: HEX.source },
  },
});
