import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { SLICE07_GATEB_POLICY, Slice07GateBError } from "./research-gateb-adapter-slice07.mjs";
import {
  contentHashSlice05,
  decodeIndependentPngSlice05,
  validateGoldRecordSlice05,
} from "./research-independent-png-oracle-slice05.mjs";
import { validateNormalizedArtifactSlice05 } from "./research-sharp-adapter-slice05.mjs";
import { canonicalJsonSlice05 } from "./research-inventory-sharp-slice05.mjs";
import { canonicalBytesSlice10, sha256Slice10Definition } from "./research-generate-slice10.mjs";

export const SLICE10_CALIBRATION_CASE_DRIVER_ID = "DRIVER-OPEN-CALIBRATION-CASE@0.10.0";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[n] = value >>> 0;
  }
  return table;
})();

export class Slice10CalibrationCaseError extends Error {
  constructor(code, message, { cause, workerInvoked = false, workerExitConfirmed = null } = {}) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "Slice10CalibrationCaseError";
    this.code = code;
    this.workerInvoked = workerInvoked;
    this.workerExitConfirmed = workerExitConfirmed;
  }
}

function fail(code, message, options = {}) { throw new Slice10CalibrationCaseError(code, message, options); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (plain(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function same(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }

function validateRef(ref, label) {
  if (!plain(ref) || !/^[0-9a-f]{64}$/u.test(ref.contentHash ?? "") || !/^[0-9a-f]{64}$/u.test(ref.fileSha256 ?? "")
    || !Number.isInteger(ref.byteLength) || ref.byteLength < 1 || typeof ref.id !== "string" || typeof ref.path !== "string") {
    fail("S10_CASE_REFERENCE_INVALID", `${label} is not a closed record reference`);
  }
  return ref;
}

function verifySlice10Record(record, bytes, ref, label) {
  validateRef(ref, `${label}Ref`);
  if (!plain(record) || !Buffer.isBuffer(bytes) || bytes.length !== ref.byteLength || sha256(bytes) !== ref.fileSha256
    || record.id !== ref.id || record.contentHash !== ref.contentHash) {
    fail("S10_CASE_RECORD_DRIFT", `${label} bytes or identity differ from the frozen reference`);
  }
  let reopened;
  try { reopened = JSON.parse(bytes.toString("utf8")); } catch (cause) {
    fail("S10_CASE_RECORD_DRIFT", `${label} is not JSON`, { cause });
  }
  if (!same(reopened, record)) fail("S10_CASE_RECORD_DRIFT", `${label} object differs from its bytes`);
  const withoutHash = { ...record };
  delete withoutHash.contentHash;
  if (sha256Slice10Definition(canonicalBytesSlice10(withoutHash)) !== record.contentHash) {
    fail("S10_CASE_RECORD_DRIFT", `${label} self hash is invalid`);
  }
}

async function readProjectFile(projectRoot, relativePath, label) {
  if (!path.isAbsolute(projectRoot ?? "") || typeof relativePath !== "string" || relativePath.includes("\\")
    || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("S10_CASE_PATH_INVALID", `${label} path is not a safe project-relative path`);
  }
  const root = await realpath(projectRoot);
  const target = await realpath(path.join(root, ...relativePath.split("/")));
  const prefix = `${root}${path.sep}`.toLowerCase();
  if (!target.toLowerCase().startsWith(prefix)) fail("S10_CASE_PATH_INVALID", `${label} resolves outside the project`);
  return readFile(target);
}

async function reopenExternalRecord(projectRoot, ref, label) {
  validateRef(ref, `${label}Ref`);
  if (!ref.path.startsWith("research/slice-05/")) fail("S10_CASE_LINEAGE_INVALID", `${label} must be immutable Slice 05 lineage`);
  const bytes = await readProjectFile(projectRoot, ref.path, label);
  if (bytes.length !== ref.byteLength || sha256(bytes) !== ref.fileSha256) fail("S10_CASE_LINEAGE_DRIFT", `${label} file bytes drifted`);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); } catch (cause) {
    fail("S10_CASE_LINEAGE_DRIFT", `${label} is not JSON`, { cause });
  }
  if (record.contentHash !== ref.contentHash || contentHashSlice05(record) !== ref.contentHash) {
    fail("S10_CASE_LINEAGE_DRIFT", `${label} content hash drifted`);
  }
  return Object.freeze({ record, bytes });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPngDeclaration(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { crcMismatch: false, sawSrgbBeforeIdat: false, structurallyComplete: false };
  }
  let offset = 8;
  let crcMismatch = false;
  let sawSrgbBeforeIdat = false;
  let sawIdat = false;
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return { crcMismatch, sawSrgbBeforeIdat, structurallyComplete: false };
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) crcMismatch = true;
    if (type === "sRGB" && !sawIdat) sawSrgbBeforeIdat = true;
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") { sawIend = true; offset = end; break; }
    offset = end;
  }
  return { crcMismatch, sawSrgbBeforeIdat, structurallyComplete: sawIend && offset === bytes.length };
}

function rejectionResult(code) {
  return Object.freeze({ kind: "rejection-pass", actualStableErrorCode: code, workerInvoked: false });
}

function classifyNormalizeRejection(material) {
  const { wrapper, sourceRecord, sourceBytes } = material;
  const code = wrapper.expectedStableErrorCode;
  if (code === "S10_NORMALIZE_SOURCE_DECLARATION_INVALID") {
    const raw = sourceRecord.rawAsset;
    const declarationInvalid = raw.mime !== "image/png" || raw.sourceDeclarationDecodedPixelSha256 !== raw.decodedPixelSha256;
    if (!declarationInvalid) fail("S10_PREFLIGHT_CLASSIFICATION_INVALID", "normalize declaration sentinel has no declaration defect");
    return rejectionResult(code);
  }
  const inspection = inspectPngDeclaration(sourceBytes);
  if (code === "S10_INPUT_CRC_MISMATCH" && inspection.crcMismatch) return rejectionResult(code);
  if (code === "S10_INPUT_SRGB_REQUIRED" && inspection.structurallyComplete
    && !inspection.crcMismatch && !inspection.sawSrgbBeforeIdat) return rejectionResult(code);
  fail("S10_PREFLIGHT_CLASSIFICATION_INVALID", "normalize sentinel differs from its frozen exact code");
}

function classifyExportRejection(material) {
  if (material.wrapper.expectedStableErrorCode !== "S10_EXPORT_NORMALIZED_ARTIFACT_INVALID") {
    fail("S10_PREFLIGHT_CLASSIFICATION_INVALID", "export sentinel has an unregistered code");
  }
  try { validateNormalizedArtifactSlice05(material.normalizedArtifact); } catch {
    return rejectionResult("S10_EXPORT_NORMALIZED_ARTIFACT_INVALID");
  }
  fail("S10_PREFLIGHT_CLASSIFICATION_INVALID", "export rejection sentinel is unexpectedly valid");
}

export function verifySlice10FinalOutput({ operation, bytes, expected } = {}) {
  if (!['normalize', 'export'].includes(operation) || !plain(expected)) {
    fail("S10_OUTPUT_ORACLE_REJECTED", "operation or expected gold identity is invalid", { workerInvoked: true, workerExitConfirmed: true });
  }
  let decoded;
  try { decoded = decodeIndependentPngSlice05(bytes); } catch (cause) {
    fail("S10_OUTPUT_ORACLE_REJECTED", "independent PNG decoder rejected candidate output", { cause, workerInvoked: true, workerExitConfirmed: true });
  }
  for (const key of [
    "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "alphaPresent",
    "metadataPolicy", "orientation", "alphaMode", "interlace", "animation",
  ]) {
    if (decoded[key] !== expected[key]) {
      fail("S10_OUTPUT_ORACLE_REJECTED", `independent oracle mismatch: ${key}`, { workerInvoked: true, workerExitConfirmed: true });
    }
  }
  if (!decoded.filter0Only || expected.pngFilterPolicy !== "filter-0-only") {
    fail("S10_OUTPUT_ORACLE_REJECTED", "independent oracle rejected PNG filter policy", { workerInvoked: true, workerExitConfirmed: true });
  }
  return Object.freeze({
    fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width, height: decoded.height, chunkTypes: Object.freeze([...decoded.chunkTypes]),
  });
}

export async function loadSlice10CalibrationCase({
  projectRoot, sourceWrapper, sourceWrapperBytes, sourceRef,
  goldIdentity = null, goldIdentityBytes = null, goldIdentityRef = null,
} = {}) {
  verifySlice10Record(sourceWrapper, Buffer.from(sourceWrapperBytes ?? []), sourceRef, "source wrapper");
  if (!['normalize', 'export'].includes(sourceWrapper.operation)
    || !['applicable', 'rejection'].includes(sourceWrapper.disposition)
    || sourceWrapper.independenceClaim !== false || sourceWrapper.copiedImageBytes !== false) {
    fail("S10_CASE_LINEAGE_INVALID", "source wrapper has an invalid operation, disposition or independence boundary");
  }
  const priorSource = await reopenExternalRecord(projectRoot, sourceWrapper.priorSourceRef, "prior source");
  if (priorSource.record.sourceProvenanceId !== sourceWrapper.priorSourceRef.id
    || priorSource.record.operation !== sourceWrapper.operation || priorSource.record.partition !== sourceWrapper.partition
    || !same(Object.fromEntries(Object.keys(sourceWrapper.rawAsset).map((key) => [key, priorSource.record.rawAsset[key]])), sourceWrapper.rawAsset)) {
    fail("S10_CASE_LINEAGE_DRIFT", "prior source no longer binds the Slice 10 wrapper");
  }
  const sourceBytes = await readProjectFile(projectRoot, `research/slice-05/${sourceWrapper.rawAsset.path}`, "source asset");
  if (sourceBytes.length !== sourceWrapper.rawAsset.byteLength || sha256(sourceBytes) !== sourceWrapper.rawAsset.fileSha256) {
    fail("S10_SOURCE_BYTES_MISMATCH", "source asset bytes differ from the frozen wrapper");
  }
  let normalizedArtifact = null;
  if (sourceWrapper.priorNormalizedArtifactRef !== null) {
    const reopened = await reopenExternalRecord(projectRoot, sourceWrapper.priorNormalizedArtifactRef, "prior normalized artifact");
    if (reopened.record.artifactId !== sourceWrapper.priorNormalizedArtifactRef.id) fail("S10_CASE_LINEAGE_DRIFT", "normalized artifact identity drifted");
    normalizedArtifact = reopened.record;
  }

  if (sourceWrapper.disposition === "rejection") {
    if (goldIdentity !== null || goldIdentityBytes !== null || goldIdentityRef !== null || sourceWrapper.priorGoldRef !== null) {
      fail("S10_CASE_GOLD_TAINT", "rejection cases must remain gold-free");
    }
    return Object.freeze({ wrapper: sourceWrapper, sourceRecord: priorSource.record, sourceBytes, normalizedArtifact, goldIdentity: null, goldRecord: null, expected: null });
  }

  verifySlice10Record(goldIdentity, Buffer.from(goldIdentityBytes ?? []), goldIdentityRef, "gold identity");
  if (!same(goldIdentity.sourceRef, sourceRef) || goldIdentity.operation !== sourceWrapper.operation
    || goldIdentity.partition !== sourceWrapper.partition || !same(goldIdentity.priorGoldRef, sourceWrapper.priorGoldRef)
    || !same(goldIdentity.priorNormalizedArtifactRef, sourceWrapper.priorNormalizedArtifactRef)
    || goldIdentity.candidateOutputUsed !== false || goldIdentity.candidateDependencyUsed !== false
    || goldIdentity.independenceClaim !== false) {
    fail("S10_CASE_GOLD_TAINT", "gold identity does not independently bind the source wrapper");
  }
  const priorGold = await reopenExternalRecord(projectRoot, sourceWrapper.priorGoldRef, "prior gold");
  validateGoldRecordSlice05(priorGold.record);
  if (priorGold.record.goldRecordId !== sourceWrapper.priorGoldRef.id
    || priorGold.record.operation !== sourceWrapper.operation || priorGold.record.partition !== sourceWrapper.partition
    || priorGold.record.provenance.candidateOutputUsed !== false || priorGold.record.provenance.candidateDependencyUsed !== false
    || canonicalJsonSlice05(priorGold.record.expected) !== goldIdentity.expectedCanonicalJson) {
    fail("S10_CASE_GOLD_TAINT", "prior gold provenance or expected identity drifted");
  }
  const expected = JSON.parse(goldIdentity.expectedCanonicalJson);
  if (sourceWrapper.operation === "export") {
    validateNormalizedArtifactSlice05(normalizedArtifact);
    if (normalizedArtifact.producerRef.kind !== "independent-fixture-generator"
      || normalizedArtifact.bytes.relativePath !== sourceWrapper.rawAsset.path
      || normalizedArtifact.bytes.fileSha256 !== sourceWrapper.rawAsset.fileSha256
      || normalizedArtifact.bytes.decodedPixelSha256 !== sourceWrapper.rawAsset.decodedPixelSha256
      || normalizedArtifact.contentHash !== expected.parentIdentity.artifactSha256) {
      fail("S10_EXPORT_PARENT_LINEAGE_INVALID", "export input is not the frozen independent normalized artifact");
    }
  }
  return Object.freeze({ wrapper: sourceWrapper, sourceRecord: priorSource.record, sourceBytes, normalizedArtifact, goldIdentity, goldRecord: priorGold.record, expected });
}

export async function loadSlice10OperationDefinitionCases({ projectRoot, index, fileMap, operation } = {}) {
  if (!plain(index) || !(fileMap instanceof Map) || !['normalize', 'export'].includes(operation)
    || !Array.isArray(index.manifestRefs) || !Array.isArray(index.sourceRefs) || !Array.isArray(index.goldIdentityRefs)) {
    fail("S10_OPERATION_DEFINITION_INVALID", "definition index, file map and operation are required");
  }
  const selectedManifestRefs = index.manifestRefs.filter((ref) => {
    const bytes = fileMap.get(ref.path);
    return bytes && JSON.parse(bytes).operation === operation;
  });
  if (selectedManifestRefs.length !== 2) fail("S10_OPERATION_DEFINITION_INVALID", "operation requires exactly two manifests");
  const sourceRefById = new Map(index.sourceRefs.map((ref) => [ref.id, ref]));
  const goldRefById = new Map(index.goldIdentityRefs.map((ref) => [ref.id, ref]));
  const cases = [];
  const casesBySourceId = new Map();
  for (const manifestRef of selectedManifestRefs) {
    const manifestBytes = fileMap.get(manifestRef.path);
    const manifest = JSON.parse(manifestBytes);
    verifySlice10Record(manifest, manifestBytes, manifestRef, "manifest");
    if (manifest.operation !== operation || !Array.isArray(manifest.entries)) {
      fail("S10_OPERATION_DEFINITION_INVALID", "manifest operation or entries drifted");
    }
    for (const entry of manifest.entries) {
      const sourceRef = sourceRefById.get(entry.sourceRef?.id);
      if (!sourceRef || !same(sourceRef, entry.sourceRef) || casesBySourceId.has(sourceRef.id)) {
        fail("S10_OPERATION_DEFINITION_INVALID", "manifest source reference is missing, drifted or duplicated");
      }
      const sourceWrapperBytes = fileMap.get(sourceRef.path);
      const sourceWrapper = JSON.parse(sourceWrapperBytes);
      const goldIdentityRef = entry.goldIdentityLocator === null ? null : goldRefById.get(entry.goldIdentityLocator.id);
      if ((entry.disposition === "applicable" && (!goldIdentityRef || goldIdentityRef.path !== entry.goldIdentityLocator.path))
        || (entry.disposition === "rejection" && goldIdentityRef !== null)) {
        fail("S10_OPERATION_DEFINITION_INVALID", "manifest gold identity locator differs from disposition");
      }
      const goldIdentityBytes = goldIdentityRef === null ? null : fileMap.get(goldIdentityRef.path);
      const material = await loadSlice10CalibrationCase({
        projectRoot, sourceWrapper, sourceWrapperBytes, sourceRef,
        goldIdentity: goldIdentityBytes === null ? null : JSON.parse(goldIdentityBytes),
        goldIdentityBytes, goldIdentityRef,
      });
      if (sourceWrapper.operation !== operation || sourceWrapper.partition !== manifest.partition
        || sourceWrapper.disposition !== entry.disposition || sourceWrapper.categoryId !== entry.categoryId
        || sourceWrapper.expectedStableErrorCode !== entry.expectedStableErrorCode) {
        fail("S10_OPERATION_DEFINITION_INVALID", "manifest entry differs from reopened source wrapper");
      }
      casesBySourceId.set(sourceRef.id, material);
      cases.push(Object.freeze({
        disposition: entry.disposition, expectedStableErrorCode: entry.expectedStableErrorCode,
        goldIdentityRef, manifestRef, partition: manifest.partition, sourceRef,
      }));
    }
  }
  const applicable = cases.filter((item) => item.disposition === "applicable").length;
  if (cases.length !== 48 || applicable !== 24 || casesBySourceId.size !== 48) {
    fail("S10_OPERATION_DEFINITION_INVALID", "operation definition must close 48 unique sources with 24 applicable and 24 rejection");
  }
  return Object.freeze({ cases: Object.freeze(cases), casesBySourceId });
}

function remapWorkerError(error) {
  if (error instanceof Slice10CalibrationCaseError) return error;
  if (error instanceof Slice07GateBError && typeof error.code === "string") {
    const observation = error.workerObservation;
    return new Slice10CalibrationCaseError(error.code.replace(/^S07_/u, "S10_"), error.message, {
      cause: error, workerInvoked: true,
      workerExitConfirmed: observation?.exit?.confirmed === true ? true : observation?.exit?.confirmed === false ? false : null,
    });
  }
  return new Slice10CalibrationCaseError("S10_EXECUTION_UNCLASSIFIED_FAILURE", "raw worker execution failed", { cause: error, workerInvoked: true });
}

export function createSlice10CalibrationAttemptExecutor({ casesBySourceId, rawExecutor } = {}) {
  if (!(casesBySourceId instanceof Map) || !rawExecutor || typeof rawExecutor.execute !== "function") {
    fail("S10_CASE_EXECUTOR_INPUT_INVALID", "case map and raw executor are required");
  }
  return async ({ request } = {}) => {
    if (!plain(request) || !plain(request.attempt) || typeof request.attempt.sourceId !== "string") {
      fail("S10_CASE_EXECUTOR_INPUT_INVALID", "closed calibration request is required");
    }
    const material = casesBySourceId.get(request.attempt.sourceId);
    if (!material || material.wrapper.operation !== request.operation || material.wrapper.partition !== request.attempt.partition
      || material.wrapper.disposition !== request.disposition || material.wrapper.expectedStableErrorCode !== request.expectedStableErrorCode
      || request.attempt.attemptNumber !== 1 || ![1, 2, 3].includes(request.attempt.repetition)) {
      fail("S10_CASE_REQUEST_BINDING_INVALID", "request does not bind the frozen case material");
    }
    if (request.disposition === "rejection") {
      return request.operation === "normalize" ? classifyNormalizeRejection(material) : classifyExportRejection(material);
    }
    let workerRequest;
    if (request.operation === "normalize") {
      workerRequest = {
        protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: request.requestId,
        operation: "normalize", inputBytes: material.sourceBytes,
      };
    } else {
      const decoded = decodeIndependentPngSlice05(material.sourceBytes);
      workerRequest = {
        protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: request.requestId,
        operation: "export", rgba: decoded.rgba, width: decoded.width, height: decoded.height,
      };
    }
    let candidate;
    try {
      candidate = await rawExecutor.execute({
        attemptId: request.requestId, operation: request.operation, workerRequest,
        expected: material.expected,
      });
    } catch (error) { throw remapWorkerError(error); }
    if (!plain(candidate) || !(candidate.outputBytes instanceof Uint8Array)) {
      fail("S10_EXECUTION_PROTOCOL_INVALID", "raw executor returned no candidate bytes", { workerInvoked: true, workerExitConfirmed: true });
    }
    const oracleFacts = verifySlice10FinalOutput({ operation: request.operation, bytes: candidate.outputBytes, expected: material.expected });
    return Object.freeze({
      kind: "applicable-pass", outputBytes: Buffer.from(candidate.outputBytes),
      decodedPixelSha256: oracleFacts.decodedPixelSha256, oracleFacts,
      workerInvoked: true, workerExitConfirmed: true,
    });
  };
}
