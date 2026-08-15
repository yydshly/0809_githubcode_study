import { createHash } from "node:crypto";

import { SLICE07_GATEB_POLICY, Slice07GateBError } from "./research-gateb-adapter-slice07.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { validateNormalizedArtifactSlice05 } from "./research-sharp-adapter-slice05.mjs";
import { Slice08CaseContextError, validateSlice08CaseContext } from "./research-gateb-case-context-slice08.mjs";

export const SLICE08_ACTUAL_CASE_DRIVER_ID = "DRIVER-TYPED-ACTUAL-CASE@0.8.0";

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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new Slice08CaseContextError("S08_CASE_MATERIAL_INVALID", `${label} has an open or incomplete shape`);
  }
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
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== expectedCrc) crcMismatch = true;
    if (type === "sRGB" && !sawIdat) sawSrgbBeforeIdat = true;
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") { sawIend = true; offset = end; break; }
    offset = end;
  }
  return { crcMismatch, sawSrgbBeforeIdat, structurallyComplete: sawIend && offset === bytes.length };
}

function expectedFromGold(gold) {
  if (!gold || typeof gold !== "object" || !gold.expected || typeof gold.expected !== "object") {
    throw new Slice08CaseContextError("S08_CASE_MATERIAL_INVALID", "applicable gold record is missing expected facts");
  }
  const value = gold.expected;
  const keys = [
    "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "orientation",
    "alphaMode", "alphaPresent", "metadataPolicy", "pngFilterPolicy", "interlace", "animation",
  ];
  if (keys.some((key) => !Object.hasOwn(value, key))) {
    throw new Slice08CaseContextError("S08_CASE_MATERIAL_INVALID", "gold expected facts are incomplete");
  }
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

function exactNormalizeRejection(bytes, context, sourceRecord) {
  const code = context.expectedStableErrorCode;
  if (code === "S08_NORMALIZE_SOURCE_DECLARATION_INVALID") {
    if (sourceRecord.sourceDeclarationMime === sourceRecord.rawAssetMime
      && sourceRecord.sourceDeclarationDecodedPixelSha256 === sourceRecord.rawAssetDecodedPixelSha256) {
      throw new Slice08CaseContextError("S08_PREFLIGHT_CLASSIFICATION_INVALID", "source declaration sentinel has no declaration defect");
    }
    throw new Slice08CaseContextError(code, "frozen source declaration rejected before worker");
  }
  const inspection = inspectPngDeclaration(bytes);
  if (code === "S08_INPUT_CRC_MISMATCH" && inspection.crcMismatch) {
    throw new Slice08CaseContextError(code, "frozen CRC sentinel rejected before worker");
  }
  if (code === "S08_INPUT_SRGB_REQUIRED" && inspection.structurallyComplete
    && !inspection.crcMismatch && !inspection.sawSrgbBeforeIdat) {
    throw new Slice08CaseContextError(code, "frozen missing-sRGB sentinel rejected before worker");
  }
  throw new Slice08CaseContextError("S08_PREFLIGHT_CLASSIFICATION_INVALID", "normalize sentinel differs from its frozen code");
}

function exactExportRejection(artifact, context) {
  try {
    validateNormalizedArtifactSlice05(artifact);
  } catch {
    throw new Slice08CaseContextError(context.expectedStableErrorCode, "frozen normalized-artifact sentinel rejected before worker");
  }
  throw new Slice08CaseContextError("S08_PREFLIGHT_CLASSIFICATION_INVALID", "export rejection sentinel is unexpectedly valid");
}

function remapSlice07Error(error) {
  if (!(error instanceof Slice07GateBError) || typeof error.code !== "string") return error;
  const mapped = new Slice08CaseContextError(error.code.replace(/^S07_/u, "S08_"), error.message, { cause: error });
  mapped.workerObservation = error.workerObservation ?? null;
  if (error.candidateOutput) mapped.candidateOutput = error.candidateOutput;
  return mapped;
}

export function verifySlice08FinalOutput({ bytes, expected }) {
  const decoded = decodeIndependentPngSlice05(bytes);
  for (const key of ["decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "alphaPresent", "metadataPolicy", "interlace", "animation"]) {
    if (decoded[key] !== expected[key]) throw new Slice08CaseContextError("S08_OUTPUT_ORACLE_REJECTED", `independent oracle mismatch: ${key}`);
  }
  if (!decoded.filter0Only || decoded.orientation !== expected.orientation || decoded.alphaMode !== expected.alphaMode) {
    throw new Slice08CaseContextError("S08_OUTPUT_ORACLE_REJECTED", "independent oracle rejected canonical profile");
  }
  return Object.freeze({
    fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width, height: decoded.height, chunkTypes: Object.freeze([...decoded.chunkTypes]),
  });
}

export async function executeSlice08CaseMaterial({ caseContext, material, rawExecutor } = {}) {
  validateSlice08CaseContext(caseContext);
  if (!rawExecutor || typeof rawExecutor.execute !== "function") {
    throw new Slice08CaseContextError("S08_DRIVER_INPUT_INVALID", "raw executor is unavailable");
  }
  exactKeys(material, ["sourceRecord", "sourceBytes", "normalizedArtifact", "gold"], "case material");
  const sourceBytes = Buffer.from(material.sourceBytes ?? []);
  const sourceRecord = material.sourceRecord;
  if (!sourceRecord || sourceRecord.id !== caseContext.sourceRef.id
    || sourceRecord.contentHash !== caseContext.sourceRef.contentHash
    || sourceBytes.length !== sourceRecord.rawAssetByteLength
    || sha256(sourceBytes) !== sourceRecord.rawAssetFileSha256) {
    throw new Slice08CaseContextError("S08_SOURCE_LINEAGE_DRIFT", "source record or bytes differ from the typed context");
  }
  if (caseContext.disposition === "rejection") {
    if (material.gold !== null) throw new Slice08CaseContextError("S08_CASE_MATERIAL_INVALID", "rejection material must not load gold");
    if (caseContext.operation === "normalize") exactNormalizeRejection(sourceBytes, caseContext, sourceRecord);
    exactExportRejection(material.normalizedArtifact, caseContext);
  }
  if (material.gold === null || material.gold.id !== caseContext.goldRef.id
    || material.gold.contentHash !== caseContext.goldRef.contentHash) {
    throw new Slice08CaseContextError("S08_CASE_MATERIAL_INVALID", "applicable gold does not bind the typed context");
  }
  const expected = expectedFromGold(material.gold);
  let workerRequest;
  if (caseContext.operation === "normalize") {
    workerRequest = { protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: caseContext.attempt.attemptId, operation: "normalize", inputBytes: sourceBytes };
  } else {
    const decoded = decodeIndependentPngSlice05(sourceBytes);
    workerRequest = {
      protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: caseContext.attempt.attemptId,
      operation: "export", rgba: decoded.rgba, width: decoded.width, height: decoded.height,
    };
  }
  try {
    return await rawExecutor.execute({ attemptId: caseContext.attempt.attemptId, operation: caseContext.operation, workerRequest, expected });
  } catch (error) {
    throw remapSlice07Error(error);
  }
}
