import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createSlice07RawWorkerExecutor } from "./research-gateb-adapter-slice07.mjs";
import { createSlice09TypedDriver } from "./research-gateb-case-context-slice09.mjs";
import { executeSlice09CaseMaterial, verifySlice09FinalOutput } from "./research-gateb-driver-slice09.mjs";
import { runSlice09GateBOperation } from "./research-gateb-runner-slice09.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export const SLICE09_REGISTERED_DRIVER_ID = "DRIVER-REGISTERED-GATEB-SMOKE@0.9.0";
export const SLICE09_DEFINITION_ROOT = path.join(PROJECT_ROOT, "research", "slice-09");
export const SLICE09_RESULTS_ROOT = path.join(SLICE09_DEFINITION_ROOT, "results", "open-smoke");

function fail(code, message, options = {}) { throw Object.assign(new Error(message, options), { code }); }
async function readJson(filePath) { return JSON.parse(await readFile(filePath, "utf8")); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sameRef(left, right) {
  return left && right && left.path === right.path && left.id === right.id
    && left.contentHash === right.contentHash && left.byteLength === right.byteLength
    && left.fileSha256 === right.fileSha256;
}

async function defaultGitAdmission(projectRoot) {
  const gitRoot = path.resolve(projectRoot, "..", "..");
  const { stdout: status } = await execFile("git", ["status", "--porcelain=v1"], { cwd: gitRoot, windowsHide: true });
  if (status.trim() !== "") fail("S09_GIT_ADMISSION_DENIED", "worktree must be clean");
  const { stdout: head } = await execFile("git", ["rev-parse", "HEAD"], { cwd: gitRoot, windowsHide: true });
  const { stdout: remote } = await execFile("git", ["rev-parse", "origin/main"], { cwd: gitRoot, windowsHide: true });
  if (head.trim() !== remote.trim()) fail("S09_GIT_ADMISSION_DENIED", "HEAD must equal origin/main");
  return Object.freeze({ clean: true, head: head.trim(), remote: remote.trim() });
}

export async function loadSlice09DefinitionContext({ definitionRoot = SLICE09_DEFINITION_ROOT, projectRoot = PROJECT_ROOT } = {}) {
  const index = await readJson(path.join(definitionRoot, "definition-index.v0.9.0.json"));
  const manifests = {};
  for (const operation of ["normalize", "export"]) {
    manifests[operation] = await readJson(path.join(definitionRoot, `manifests/${operation}-smoke.v0.9.0.json`));
  }
  const runtime = await readJson(path.join(definitionRoot, index.runtimeRef.path));
  return Object.freeze({ definitionRoot, projectRoot, index, manifests: Object.freeze(manifests), runtime });
}

export function buildSlice09CasesFromDefinition(context, operation) {
  const manifest = context.manifests?.[operation];
  const identityRefs = context.index?.goldIdentityRefs;
  if (!manifest || manifest.operation !== operation || !Array.isArray(manifest.entries) || manifest.entries.length !== 6
    || !Array.isArray(identityRefs) || identityRefs.length !== 6) {
    fail("S09_DEFINITION_INVALID", "operation manifest or gold identity index is invalid");
  }
  return manifest.entries.map((entry) => {
    const goldIdentityRef = entry.goldIdentityLocator === null ? null
      : identityRefs.find((candidate) => candidate.id === entry.goldIdentityLocator.id
        && candidate.path === entry.goldIdentityLocator.path);
    if ((entry.disposition === "applicable") !== Boolean(goldIdentityRef)) {
      fail("S09_DEFINITION_INVALID", "manifest locator does not resolve one exact indexed gold identity");
    }
    return {
      sourceId: entry.sourceId,
      sourceRef: structuredClone(entry.wrapperRef),
      disposition: entry.disposition,
      expectedStableErrorCode: entry.expectedStableErrorCode,
      goldIdentityRef: structuredClone(goldIdentityRef),
      workerRequestRef: structuredClone(entry.wrapperRef),
    };
  });
}

async function loadCaseMaterial(context, caseContext) {
  const sourceRecord = await readJson(path.join(context.definitionRoot, caseContext.sourceRef.path));
  const slice05Root = path.join(context.projectRoot, "research", "slice-05");
  const sourceBytes = await readFile(path.join(slice05Root, sourceRecord.rawAssetPath));
  const normalizedArtifact = sourceRecord.normalizedArtifactPath
    ? await readJson(path.join(slice05Root, sourceRecord.normalizedArtifactPath)) : null;
  let goldIdentity = null;
  let goldIdentityBytes = null;
  let goldRecord = null;
  let goldRecordBytes = null;
  if (caseContext.disposition === "applicable") {
    goldIdentityBytes = await readFile(path.join(context.definitionRoot, caseContext.goldIdentityRef.path));
    goldIdentity = JSON.parse(goldIdentityBytes.toString("utf8"));
    goldRecordBytes = await readFile(path.join(slice05Root, sourceRecord.goldRecordPath));
    goldRecord = JSON.parse(goldRecordBytes.toString("utf8"));
  }
  return Object.freeze({
    sourceRecord, sourceBytes, normalizedArtifact, goldIdentity, goldIdentityBytes, goldRecord, goldRecordBytes,
  });
}

export async function runRegisteredSlice09GateB({
  definitionRoot = SLICE09_DEFINITION_ROOT,
  projectRoot = PROJECT_ROOT,
  resultsRoot = SLICE09_RESULTS_ROOT,
  validateDefinition,
  loadDefinitionContext = loadSlice09DefinitionContext,
  readDefinitionIndexBytes = async (root) => readFile(path.join(root, "definition-index.v0.9.0.json")),
  gitAdmission = defaultGitAdmission,
  materialLoader = loadCaseMaterial,
  rawExecutorFactory,
  operationRunner = runSlice09GateBOperation,
  now = () => new Date().toISOString(),
} = {}) {
  const validator = validateDefinition ?? (await import("./research-validate-slice09.mjs")).validateSlice09Definition;
  const validation = await validator({ definitionRoot, requirePins: true, recheckRuntime: true, regenerate: true });
  if (!validation?.valid || !validation.definitionRef || validation.postRun !== null) {
    fail("S09_DEFINITION_ADMISSION_DENIED", "Slice 09 definition admission failed");
  }
  const context = await loadDefinitionContext({ definitionRoot, projectRoot });
  const indexBytes = await readDefinitionIndexBytes(definitionRoot);
  if (context.index.id !== "DEFINITION-INDEX-SLICE09@0.9.0"
    || validation.definitionRef.path !== "definition-index.v0.9.0.json"
    || validation.definitionRef.id !== context.index.id
    || validation.definitionRef.contentHash !== context.index.contentHash
    || validation.definitionRef.byteLength !== indexBytes.length
    || validation.definitionRef.fileSha256 !== sha256(indexBytes)) {
    fail("S09_DEFINITION_ADMISSION_DENIED", "validator definition reference differs from reopened index bytes");
  }
  await gitAdmission(projectRoot, context.index);
  const protocol = context.index.resultProtocol;
  if (context.index.resultsState !== "not-created" || protocol.driverInvocations !== 1
    || protocol.registeredOperationRuns !== 2 || protocol.plannedSources !== 12
    || protocol.plannedAttempts !== 36 || protocol.replacements !== 0
    || protocol.resultsRoot !== "results/open-smoke") {
    fail("S09_DEFINITION_ADMISSION_DENIED", "definition does not authorize one complete registered smoke");
  }
  const expectedRuntime = JSON.parse(context.runtime.workerRuntimeCanonicalJson);
  const rawExecutor = rawExecutorFactory
    ? rawExecutorFactory({ context, expectedRuntime, verifyOutput: verifySlice09FinalOutput })
    : createSlice07RawWorkerExecutor({ expectedRuntime, verifyOutput: verifySlice09FinalOutput });
  const reports = {};
  for (const operation of ["normalize", "export"]) {
    if (operation === "export" && reports.normalize?.decision?.state !== "pass") break;
    const manifest = context.manifests[operation];
    const refs = {
      manifestRef: context.index.manifestRefs.find((item) => item.id === manifest.id),
      candidateRef: context.index.candidateRef,
      contractRef: context.index.contractRefs.find((item) => item.id === manifest.contractRef.id),
      runtimeRef: context.index.runtimeRef,
      workerRef: context.index.workerRef,
    };
    if (!refs.manifestRef || !refs.contractRef || !sameRef(refs.contractRef, manifest.contractRef)) {
      fail("S09_DEFINITION_INVALID", "manifest references are not closed by the definition index");
    }
    const typedDriver = createSlice09TypedDriver({
      executeApplicable: async (caseContext) => executeSlice09CaseMaterial({
        caseContext, material: await materialLoader(context, caseContext), rawExecutor,
      }),
      executeRejection: async (caseContext) => executeSlice09CaseMaterial({
        caseContext, material: await materialLoader(context, caseContext), rawExecutor,
      }),
    });
    reports[operation] = await operationRunner({
      resultsRoot: path.join(resultsRoot, operation), operation,
      cases: buildSlice09CasesFromDefinition(context, operation), refs, executeCase: typedDriver, now,
    });
  }
  return Object.freeze({
    definitionRef: validation.definitionRef,
    reports: Object.freeze(reports),
    actualOperationRuns: Object.keys(reports).length,
    calibrationAuthorized: false,
  });
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--execute-registered-open-smoke") {
    process.stderr.write("Usage: node scripts/research-run-slice09.mjs --execute-registered-open-smoke\n");
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify(await runRegisteredSlice09GateB(), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
