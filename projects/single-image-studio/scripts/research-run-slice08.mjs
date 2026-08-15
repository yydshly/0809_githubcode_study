import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createSlice07RawWorkerExecutor } from "./research-gateb-adapter-slice07.mjs";
import { createSlice08TypedDriver } from "./research-gateb-case-context-slice08.mjs";
import { executeSlice08CaseMaterial, verifySlice08FinalOutput } from "./research-gateb-driver-slice08.mjs";
import { runSlice08GateBOperation } from "./research-gateb-runner-slice08.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export const SLICE08_REGISTERED_DRIVER_ID = "DRIVER-REGISTERED-GATEB-SMOKE@0.8.0";
export const SLICE08_DEFINITION_ROOT = path.join(PROJECT_ROOT, "research", "slice-08");
export const SLICE08_RESULTS_ROOT = path.join(SLICE08_DEFINITION_ROOT, "results", "open-smoke");

async function readJson(filePath) { return JSON.parse(await readFile(filePath, "utf8")); }

async function defaultGitAdmission(projectRoot) {
  const gitRoot = path.resolve(projectRoot, "..", "..");
  const { stdout: status } = await execFile("git", ["status", "--porcelain=v1"], { cwd: gitRoot, windowsHide: true });
  if (status.trim() !== "") throw Object.assign(new Error("worktree must be clean"), { code: "S08_GIT_ADMISSION_DENIED" });
  const { stdout: head } = await execFile("git", ["rev-parse", "HEAD"], { cwd: gitRoot, windowsHide: true });
  const { stdout: remote } = await execFile("git", ["rev-parse", "origin/main"], { cwd: gitRoot, windowsHide: true });
  if (head.trim() !== remote.trim()) throw Object.assign(new Error("HEAD must equal origin/main"), { code: "S08_GIT_ADMISSION_DENIED" });
  return Object.freeze({ clean: true, head: head.trim(), remote: remote.trim() });
}

export async function loadSlice08DefinitionContext({ definitionRoot = SLICE08_DEFINITION_ROOT, projectRoot = PROJECT_ROOT } = {}) {
  const index = await readJson(path.join(definitionRoot, "definition-index.v0.8.0.json"));
  const manifests = {};
  for (const operation of ["normalize", "export"]) {
    manifests[operation] = await readJson(path.join(definitionRoot, `manifests/${operation}-smoke.v0.8.0.json`));
  }
  const runtime = await readJson(path.join(definitionRoot, index.runtimeRef.path));
  return Object.freeze({ definitionRoot, projectRoot, index, manifests: Object.freeze(manifests), runtime });
}

export function buildSlice08CasesFromDefinition(context, operation) {
  const manifest = context.manifests[operation];
  if (!manifest || manifest.operation !== operation || !Array.isArray(manifest.entries) || manifest.entries.length !== 6) {
    throw Object.assign(new Error("operation manifest is invalid"), { code: "S08_DEFINITION_INVALID" });
  }
  return manifest.entries.map((entry) => ({
    sourceId: entry.sourceId,
    sourceRef: structuredClone(entry.wrapperRef),
    disposition: entry.disposition,
    expectedStableErrorCode: entry.expectedStableErrorCode,
    expectedFactsRef: structuredClone(entry.expectedFactsRef),
    goldRef: structuredClone(entry.goldRef),
    workerRequestRef: structuredClone(entry.wrapperRef),
  }));
}

async function loadCaseMaterial(context, caseContext) {
  const sourceRecord = await readJson(path.join(context.definitionRoot, caseContext.sourceRef.path));
  const slice05Root = path.join(context.projectRoot, "research", "slice-05");
  const sourceBytes = await readFile(path.join(slice05Root, sourceRecord.rawAssetPath));
  const normalizedArtifact = sourceRecord.normalizedArtifactPath
    ? await readJson(path.join(slice05Root, sourceRecord.normalizedArtifactPath)) : null;
  const gold = caseContext.disposition === "applicable"
    ? await readJson(path.join(slice05Root, sourceRecord.goldRecordPath)) : null;
  return Object.freeze({ sourceRecord, sourceBytes, normalizedArtifact, gold });
}

export async function runRegisteredSlice08GateB({
  definitionRoot = SLICE08_DEFINITION_ROOT,
  projectRoot = PROJECT_ROOT,
  resultsRoot = SLICE08_RESULTS_ROOT,
  validateDefinition,
  loadDefinitionContext = loadSlice08DefinitionContext,
  gitAdmission = defaultGitAdmission,
  rawExecutorFactory,
  operationRunner = runSlice08GateBOperation,
  now = () => new Date().toISOString(),
} = {}) {
  const validator = validateDefinition ?? (await import("./research-validate-slice08.mjs")).validateSlice08Definition;
  const validation = await validator({ definitionRoot, requirePins: true, recheckRuntime: true, regenerate: true });
  if (!validation?.valid || !validation?.definitionRef || validation?.postRun !== null) {
    throw Object.assign(new Error("Slice 08 definition admission failed"), { code: "S08_DEFINITION_ADMISSION_DENIED" });
  }
  const context = await loadDefinitionContext({ definitionRoot, projectRoot });
  await gitAdmission(projectRoot, context.index);
  const protocol = context.index.resultProtocol;
  if (context.index.resultsState !== "not-created" || protocol.driverInvocations !== 1 || protocol.registeredOperationRuns !== 2
    || protocol.plannedSources !== 12 || protocol.plannedAttempts !== 36 || protocol.replacements !== 0) {
    throw Object.assign(new Error("definition does not authorize one complete registered smoke"), { code: "S08_DEFINITION_ADMISSION_DENIED" });
  }
  const expectedRuntime = JSON.parse(context.runtime.workerRuntimeCanonicalJson);
  const rawExecutor = rawExecutorFactory
    ? rawExecutorFactory({ context, expectedRuntime, verifyOutput: verifySlice08FinalOutput })
    : createSlice07RawWorkerExecutor({ expectedRuntime, verifyOutput: verifySlice08FinalOutput });
  const reports = {};
  for (const operation of ["normalize", "export"]) {
    const manifest = context.manifests[operation];
    const refs = {
      manifestRef: context.index.manifestRefs.find((item) => item.id === manifest.id),
      candidateRef: context.index.candidateRef,
      contractRef: context.index.contractRefs.find((item) => item.id === manifest.contractRef.id),
      runtimeRef: context.index.runtimeRef,
      workerRef: context.index.workerRef,
    };
    const typedDriver = createSlice08TypedDriver({
      executeApplicable: async (caseContext) => executeSlice08CaseMaterial({ caseContext, material: await loadCaseMaterial(context, caseContext), rawExecutor }),
      executeRejection: async (caseContext) => executeSlice08CaseMaterial({ caseContext, material: await loadCaseMaterial(context, caseContext), rawExecutor }),
    });
    reports[operation] = await operationRunner({
      resultsRoot: path.join(resultsRoot, operation), operation,
      cases: buildSlice08CasesFromDefinition(context, operation), refs, executeCase: typedDriver, now,
    });
  }
  return Object.freeze({ definitionRef: validation.definitionRef, reports: Object.freeze(reports), calibrationAuthorized: false });
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--execute-registered-open-smoke") {
    process.stderr.write("Usage: node scripts/research-run-slice08.mjs --execute-registered-open-smoke\n");
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify(await runRegisteredSlice08GateB(), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
