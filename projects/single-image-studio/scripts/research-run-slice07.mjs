import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  SLICE07_GATEB_POLICY,
  Slice07GateBError,
  createSlice07RawWorkerExecutor,
} from "./research-gateb-adapter-slice07.mjs";
import {
  decodeIndependentPngSlice05,
} from "./research-independent-png-oracle-slice05.mjs";
import { validateNormalizedArtifactSlice05 } from "./research-sharp-adapter-slice05.mjs";
import { runSlice07GateBOperation } from "./research-gateb-runner-slice07.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export const SLICE07_REGISTERED_DRIVER_ID = "DRIVER-REGISTERED-GATEB-SMOKE@0.7.0";
export const SLICE07_DEFINITION_ROOT = path.join(PROJECT_ROOT, "research", "slice-07");
export const SLICE07_RESULTS_ROOT = path.join(SLICE07_DEFINITION_ROOT, "results", "open-smoke");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPngDeclaration(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function expectedFromGold(gold) {
  const value = gold.expected;
  return {
    decodedPixelSha256: value.decodedPixelSha256,
    width: value.width,
    height: value.height,
    pixelLayout: value.pixelLayout,
    colorSpace: value.colorSpace,
    orientation: value.orientation,
    alphaMode: value.alphaMode,
    alphaPresent: value.alphaPresent,
    metadataPolicy: value.metadataPolicy,
    pngFilterPolicy: value.pngFilterPolicy,
    interlace: value.interlace,
    animation: value.animation,
  };
}

function verifyFinalOutput({ bytes, expected }) {
  const decoded = decodeIndependentPngSlice05(bytes);
  for (const key of ["decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "alphaPresent", "metadataPolicy", "interlace", "animation"]) {
    if (decoded[key] !== expected[key]) throw new Slice07GateBError("S07_OUTPUT_ORACLE_REJECTED", `independent oracle mismatch: ${key}`);
  }
  if (!decoded.filter0Only || decoded.orientation !== expected.orientation || decoded.alphaMode !== expected.alphaMode) {
    throw new Slice07GateBError("S07_OUTPUT_ORACLE_REJECTED", "independent oracle rejected canonical profile");
  }
  return {
    fileSha256: decoded.fileSha256,
    decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width,
    height: decoded.height,
    chunkTypes: decoded.chunkTypes,
  };
}

function exactNormalizeRejection(bytes, expectedCode, wrapper) {
  if (expectedCode === "S07_NORMALIZE_SOURCE_DECLARATION_INVALID") {
    if (wrapper.sourceDeclarationMime === wrapper.rawAssetMime
      && wrapper.sourceDeclarationDecodedPixelSha256 === wrapper.rawAssetDecodedPixelSha256) {
      throw new Slice07GateBError("S07_PREFLIGHT_CLASSIFICATION_INVALID", "source declaration sentinel has no declaration defect");
    }
    throw new Slice07GateBError(expectedCode, "frozen source declaration rejected before worker");
  }
  const inspection = inspectPngDeclaration(bytes);
  if (expectedCode === "S07_INPUT_CRC_MISMATCH" && inspection.crcMismatch) {
    throw new Slice07GateBError(expectedCode, "frozen CRC sentinel rejected before worker");
  }
  if (expectedCode === "S07_INPUT_SRGB_REQUIRED" && inspection.structurallyComplete
    && !inspection.crcMismatch && !inspection.sawSrgbBeforeIdat) {
    throw new Slice07GateBError(expectedCode, "frozen missing-sRGB sentinel rejected before worker");
  }
  throw new Slice07GateBError("S07_PREFLIGHT_CLASSIFICATION_INVALID", "normalize rejection sentinel differs from its frozen code");
}

function exactExportRejection(artifact, expectedCode) {
  try {
    validateNormalizedArtifactSlice05(artifact);
  } catch {
    throw new Slice07GateBError(expectedCode, "frozen normalized-artifact sentinel rejected before worker");
  }
  throw new Slice07GateBError("S07_PREFLIGHT_CLASSIFICATION_INVALID", "export rejection sentinel is unexpectedly valid");
}

export async function loadSlice07DefinitionContext({ definitionRoot = SLICE07_DEFINITION_ROOT, projectRoot = PROJECT_ROOT } = {}) {
  const index = await readJson(path.join(definitionRoot, "definition-index.v0.7.0.json"));
  const manifests = {};
  for (const operation of ["normalize", "export"]) {
    manifests[operation] = await readJson(path.join(definitionRoot, `manifests/${operation}-smoke.v0.7.0.json`));
  }
  const runtime = await readJson(path.join(definitionRoot, index.runtimeRef.path));
  return Object.freeze({ definitionRoot, projectRoot, index, manifests: Object.freeze(manifests), runtime });
}

export function buildSlice07CasesFromDefinition(context, operation) {
  const manifest = context.manifests[operation];
  if (!manifest || manifest.operation !== operation || !Array.isArray(manifest.entries) || manifest.entries.length !== 6) {
    throw new Slice07GateBError("S07_DEFINITION_INVALID", "operation manifest is missing or malformed");
  }
  return manifest.entries.map((entry) => ({
    sourceId: entry.sourceId,
    disposition: entry.disposition,
    expectedStableErrorCode: entry.expectedStableErrorCode,
    expected: entry.expected,
    workerRequest: { operation, wrapperPath: entry.wrapperRef.path },
  }));
}

async function defaultGitAdmission(projectRoot) {
  const gitRoot = path.resolve(projectRoot, "..", "..");
  const { stdout: status } = await execFile("git", ["status", "--porcelain=v1"], { cwd: gitRoot, windowsHide: true });
  if (status.trim() !== "") throw new Slice07GateBError("S07_GIT_ADMISSION_DENIED", "worktree must be clean");
  const { stdout: head } = await execFile("git", ["rev-parse", "HEAD"], { cwd: gitRoot, windowsHide: true });
  const { stdout: remote } = await execFile("git", ["rev-parse", "origin/main"], { cwd: gitRoot, windowsHide: true });
  if (head.trim() !== remote.trim()) throw new Slice07GateBError("S07_GIT_ADMISSION_DENIED", "HEAD must equal origin/main");
  return Object.freeze({ head: head.trim(), remote: remote.trim(), clean: true });
}

async function buildActualExecution(context, operation, entry, attemptId, executor) {
  const wrapper = await readJson(path.join(context.definitionRoot, entry.workerRequest.wrapperPath));
  const assetPath = path.join(context.projectRoot, "research", "slice-05", wrapper.rawAssetPath);
  const bytes = await readFile(assetPath);
  if (bytes.length !== wrapper.rawAssetByteLength || sha256(bytes) !== wrapper.rawAssetFileSha256) {
    throw new Slice07GateBError("S07_SOURCE_LINEAGE_DRIFT", "source bytes differ from the frozen Slice 05 lineage");
  }
  if (entry.disposition === "rejection") {
    if (operation === "normalize") {
      exactNormalizeRejection(bytes, entry.expectedStableErrorCode, wrapper);
    } else {
      const artifact = await readJson(path.join(context.projectRoot, "research", "slice-05", wrapper.normalizedArtifactPath));
      exactExportRejection(artifact, entry.expectedStableErrorCode);
    }
  }
  const gold = await readJson(path.join(context.projectRoot, "research", "slice-05", wrapper.goldRecordPath));
  const expected = expectedFromGold(gold);
  let workerRequest;
  if (operation === "normalize") {
    workerRequest = { protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId, operation, inputBytes: bytes };
  } else {
    const decoded = decodeIndependentPngSlice05(bytes);
    workerRequest = {
      protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId, operation,
      rgba: decoded.rgba, width: decoded.width, height: decoded.height,
    };
  }
  return executor.execute({ attemptId, operation, workerRequest, expected });
}

export async function runRegisteredSlice07GateB({
  definitionRoot = SLICE07_DEFINITION_ROOT,
  projectRoot = PROJECT_ROOT,
  resultsRoot = SLICE07_RESULTS_ROOT,
  validateDefinition,
  gitAdmission = defaultGitAdmission,
  executorFactory,
  operationRunner = runSlice07GateBOperation,
  now = () => new Date().toISOString(),
} = {}) {
  const validator = validateDefinition ?? (await import("./research-validate-slice07.mjs")).validateSlice07Definition;
  const validation = await validator({ definitionRoot, requirePins: true, recheckRuntime: true, regenerate: true });
  if (!validation?.valid || !validation?.definitionRef) throw new Slice07GateBError("S07_DEFINITION_ADMISSION_DENIED", "central definition validation failed");
  const context = await loadSlice07DefinitionContext({ definitionRoot, projectRoot });
  await gitAdmission(projectRoot, context.index);
  if (context.index.resultsState !== "not-created" || context.index.resultProtocol.driverInvocations !== 1
    || context.index.resultProtocol.registeredOperationRuns !== 2 || context.index.resultProtocol.plannedAttempts !== 36) {
    throw new Slice07GateBError("S07_DEFINITION_ADMISSION_DENIED", "definition does not authorize the one registered 36-attempt driver");
  }
  const expectedRuntime = JSON.parse(context.runtime.workerRuntimeCanonicalJson);
  const executor = executorFactory
    ? executorFactory({ context, expectedRuntime, verifyOutput: verifyFinalOutput })
    : createSlice07RawWorkerExecutor({ expectedRuntime, verifyOutput: verifyFinalOutput });
  const reports = {};
  for (const operation of ["normalize", "export"]) {
    const operationRoot = path.join(resultsRoot, operation);
    const operationCases = buildSlice07CasesFromDefinition(context, operation);
    reports[operation] = await operationRunner({
      resultsRoot: operationRoot,
      operation,
      cases: operationCases,
      now,
      executeCase: ({ attemptId, ...entry }) => buildActualExecution(context, operation, entry, attemptId, executor),
    });
  }
  return Object.freeze({ definitionRef: validation.definitionRef, reports: Object.freeze(reports), calibrationAuthorized: false });
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--execute-registered-open-smoke") {
    process.stderr.write("Usage: node scripts/research-run-slice07.mjs --execute-registered-open-smoke\n");
    process.exitCode = 2;
    return;
  }
  const result = await runRegisteredSlice07GateB();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
