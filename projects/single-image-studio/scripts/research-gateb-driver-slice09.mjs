import { createHash } from "node:crypto";

import { SLICE07_GATEB_POLICY, Slice07GateBError } from "./research-gateb-adapter-slice07.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { validateNormalizedArtifactSlice05 } from "./research-sharp-adapter-slice05.mjs";
import { Slice09CaseContextError, validateSlice09CaseContext } from "./research-gateb-case-context-slice09.mjs";
import { executeSlice09GoldBoundBranch, validateSlice09GoldIdentity } from "./research-gateb-gold-identity-slice09.mjs";

export const SLICE09_ACTUAL_CASE_DRIVER_ID = "DRIVER-TYPED-GOLD-ACTUAL-CASE@0.9.0";

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

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function same(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function fail(code, message, options = {}) { throw new Slice09CaseContextError(code, message, options); }

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail("S09_CASE_MATERIAL_INVALID", `${label} has an open or incomplete shape`);
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
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) crcMismatch = true;
    if (type === "sRGB" && !sawIdat) sawSrgbBeforeIdat = true;
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") { sawIend = true; offset = end; break; }
    offset = end;
  }
  return { crcMismatch, sawSrgbBeforeIdat, structurallyComplete: sawIend && offset === bytes.length };
}

function exactNormalizeRejection(bytes, context, sourceRecord) {
  const code = context.expectedStableErrorCode;
  if (code === "S09_NORMALIZE_SOURCE_DECLARATION_INVALID") {
    if (sourceRecord.sourceDeclarationMime === sourceRecord.rawAssetMime
      && sourceRecord.sourceDeclarationDecodedPixelSha256 === sourceRecord.rawAssetDecodedPixelSha256) {
      fail("S09_PREFLIGHT_CLASSIFICATION_INVALID", "source declaration sentinel has no declaration defect");
    }
    fail(code, "frozen source declaration rejected before worker");
  }
  const inspection = inspectPngDeclaration(bytes);
  if (code === "S09_INPUT_CRC_MISMATCH" && inspection.crcMismatch) fail(code, "frozen CRC sentinel rejected before worker");
  if (code === "S09_INPUT_SRGB_REQUIRED" && inspection.structurallyComplete
    && !inspection.crcMismatch && !inspection.sawSrgbBeforeIdat) fail(code, "frozen missing-sRGB sentinel rejected before worker");
  fail("S09_PREFLIGHT_CLASSIFICATION_INVALID", "normalize sentinel differs from its frozen code");
}

function exactExportRejection(artifact, context) {
  try { validateNormalizedArtifactSlice05(artifact); } catch {
    fail(context.expectedStableErrorCode, "frozen normalized-artifact sentinel rejected before worker");
  }
  fail("S09_PREFLIGHT_CLASSIFICATION_INVALID", "export rejection sentinel is unexpectedly valid");
}

function remapSlice07Error(error) {
  if (!(error instanceof Slice07GateBError) || typeof error.code !== "string") return error;
  const mapped = new Slice09CaseContextError(error.code.replace(/^S07_/u, "S09_"), error.message, { cause: error });
  mapped.workerObservation = error.workerObservation ?? null;
  if (error.candidateOutput) mapped.candidateOutput = error.candidateOutput;
  return mapped;
}

function reopenIdentity(identity, identityBytes, identityRef) {
  validateSlice09GoldIdentity(identity);
  if (!Buffer.isBuffer(identityBytes) || identityBytes.length !== identityRef.byteLength || sha256(identityBytes) !== identityRef.fileSha256
    || identity.identityId !== identityRef.id || identity.contentHash !== identityRef.contentHash) {
    fail("S09_GOLD_IDENTITY_BYTES_MISMATCH", "gold identity bytes or reference differ");
  }
  let reopened;
  try { reopened = JSON.parse(identityBytes.toString("utf8")); } catch (cause) {
    fail("S09_GOLD_IDENTITY_BYTES_MISMATCH", "gold identity bytes are not JSON", { cause });
  }
  if (!same(reopened, identity)) fail("S09_GOLD_IDENTITY_BYTES_MISMATCH", "gold identity object differs from bytes");
}

export function verifySlice09FinalOutput({ bytes, expected }) {
  const decoded = decodeIndependentPngSlice05(bytes);
  for (const key of ["decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "alphaPresent", "metadataPolicy", "interlace", "animation"]) {
    if (decoded[key] !== expected[key]) fail("S09_OUTPUT_ORACLE_REJECTED", `independent oracle mismatch: ${key}`);
  }
  if (!decoded.filter0Only || decoded.orientation !== expected.orientation || decoded.alphaMode !== expected.alphaMode) {
    fail("S09_OUTPUT_ORACLE_REJECTED", "independent oracle rejected canonical profile");
  }
  return Object.freeze({
    fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width, height: decoded.height, chunkTypes: Object.freeze([...decoded.chunkTypes]),
  });
}

export async function executeSlice09CaseMaterial({ caseContext, material, rawExecutor } = {}) {
  validateSlice09CaseContext(caseContext);
  if (!rawExecutor || typeof rawExecutor.execute !== "function") fail("S09_DRIVER_INPUT_INVALID", "raw executor is unavailable");
  exactKeys(material, [
    "sourceRecord", "sourceBytes", "normalizedArtifact", "goldIdentity",
    "goldIdentityBytes", "goldRecord", "goldRecordBytes",
  ], "case material");
  const sourceBytes = Buffer.from(material.sourceBytes ?? []);
  const sourceRecord = material.sourceRecord;
  if (!sourceRecord || sourceRecord.id !== caseContext.sourceRef.id
    || sourceRecord.contentHash !== caseContext.sourceRef.contentHash
    || sourceBytes.length !== sourceRecord.rawAssetByteLength
    || sha256(sourceBytes) !== sourceRecord.rawAssetFileSha256) {
    fail("S09_SOURCE_LINEAGE_DRIFT", "source record or bytes differ from typed context");
  }
  if (caseContext.disposition === "rejection") {
    if (material.goldIdentity !== null || material.goldIdentityBytes !== null
      || material.goldRecord !== null || material.goldRecordBytes !== null) {
      fail("S09_CASE_MATERIAL_INVALID", "rejection material must not load gold identity or record");
    }
    if (caseContext.operation === "normalize") exactNormalizeRejection(sourceBytes, caseContext, sourceRecord);
    exactExportRejection(material.normalizedArtifact, caseContext);
  }
  reopenIdentity(material.goldIdentity, material.goldIdentityBytes, caseContext.goldIdentityRef);
  if (material.goldIdentity.operation !== caseContext.operation
    || material.goldIdentity.sourceId !== caseContext.sourceId
    || !same(material.goldIdentity.manifestRef, caseContext.manifestRef)) {
    fail("S09_CASE_MATERIAL_INVALID", "gold identity differs from case context");
  }
  return executeSlice09GoldBoundBranch({
    disposition: "applicable", goldIdentity: material.goldIdentity,
    goldRecord: material.goldRecord, goldRecordBytes: material.goldRecordBytes,
    executeApplicable: async ({ expected }) => {
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
      } catch (error) { throw remapSlice07Error(error); }
    },
  });
}
