import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createSlice07RawWorkerExecutor } from "./research-gateb-adapter-slice07.mjs";
import {
  createSlice10CalibrationAttemptExecutor,
  loadSlice10OperationDefinitionCases,
  verifySlice10FinalOutput,
} from "./research-calibration-case-slice10.mjs";
import { runSlice10CalibrationOperation } from "./research-calibration-runner-slice10.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const OPERATIONS = Object.freeze(["normalize", "export"]);

export const SLICE10_REGISTERED_DRIVER_ID = "DRIVER-REGISTERED-OPEN-CALIBRATION@0.10.0";
export const SLICE10_DEFINITION_ROOT = path.join(PROJECT_ROOT, "research", "slice-10");
export const SLICE10_RESULTS_ROOT = path.join(SLICE10_DEFINITION_ROOT, "results", "open-calibration");

function fail(code, message, options = {}) { throw Object.assign(new Error(message, options), { code }); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function sameRef(left, right) {
  return plain(left) && plain(right) && left.path === right.path && left.id === right.id
    && left.contentHash === right.contentHash && left.byteLength === right.byteLength
    && left.fileSha256 === right.fileSha256;
}
function implementationFromCandidate(candidate, id) {
  const found = candidate?.implementationRefs?.find((item) => item.id === id);
  if (!found || typeof found.path !== "string" || !/^[0-9a-f]{64}$/u.test(found.sha256 ?? "")) {
    fail("S10_DEFINITION_INVALID", `candidate implementation is missing: ${id}`);
  }
  return Object.freeze({ id, version: id.endsWith("@0.5.0") ? "0.5.0" : "0.10.0", path: found.path, implementationSha256: found.sha256 });
}

async function defaultGitAdmission(projectRoot) {
  const gitRoot = path.resolve(projectRoot, "..", "..");
  const { stdout: status } = await execFile("git", ["status", "--porcelain=v1"], { cwd: gitRoot, windowsHide: true });
  if (status.trim() !== "") fail("S10_GIT_ADMISSION_DENIED", "worktree must be clean");
  const { stdout: head } = await execFile("git", ["rev-parse", "HEAD"], { cwd: gitRoot, windowsHide: true });
  const { stdout: remote } = await execFile("git", ["rev-parse", "origin/main"], { cwd: gitRoot, windowsHide: true });
  if (head.trim() !== remote.trim()) fail("S10_GIT_ADMISSION_DENIED", "HEAD must equal origin/main");
  return Object.freeze({ clean: true, head: head.trim(), remote: remote.trim() });
}

async function readJsonBytes(filePath) {
  const bytes = await readFile(filePath);
  return Object.freeze({ bytes, record: JSON.parse(bytes.toString("utf8")) });
}

export async function loadSlice10DefinitionContext({ definitionRoot = SLICE10_DEFINITION_ROOT, projectRoot = PROJECT_ROOT } = {}) {
  let indexPair;
  try { indexPair = await readJsonBytes(path.join(definitionRoot, "definition-index.v0.10.0.json")); } catch (cause) {
    fail("S10_DEFINITION_NOT_FROZEN", "materialized Slice 10 definition index is unavailable", { cause });
  }
  const { record: index, bytes: indexBytes } = indexPair;
  const fileMap = new Map();
  const refs = [...(index.manifestRefs ?? []), ...(index.sourceRefs ?? []), ...(index.goldIdentityRefs ?? [])];
  for (const ref of refs) fileMap.set(ref.path, await readFile(path.join(definitionRoot, ...ref.path.split("/"))));
  const runtime = JSON.parse(await readFile(path.join(definitionRoot, ...index.runtimeRef.path.split("/")), "utf8"));
  const candidate = JSON.parse(await readFile(path.join(definitionRoot, ...index.candidateRef.path.split("/")), "utf8"));
  return Object.freeze({ definitionRoot, projectRoot, index, indexBytes, fileMap, runtime, candidate });
}

function exactDefinitionAdmission({ validation, context }) {
  if (!validation?.valid || !validation.definitionRef || validation.postRun !== null
    || context.index.id !== "DEFINITION-INDEX-SLICE10@0.10.0"
    || context.index.definitionState !== "definition-frozen-results-zero"
    || context.index.resultsState !== "not-created"
    || !sameRef(validation.definitionRef, {
      path: "definition-index.v0.10.0.json", id: context.index.id, contentHash: context.index.contentHash,
      byteLength: context.indexBytes.length, fileSha256: sha256(context.indexBytes),
    })) {
    fail("S10_DEFINITION_ADMISSION_DENIED", "central validation or reopened definition identity failed");
  }
  const protocol = context.index.resultProtocol;
  if (!plain(protocol) || protocol.driverInvocations !== 1 || protocol.registeredOperationRuns !== 2
    || protocol.plannedSources !== 96 || protocol.plannedAttempts !== 288 || protocol.replacements !== 0
    || protocol.resultsRoot !== "results/open-calibration" || protocol.ordinaryCompleteNonPassStopsOtherOperation !== false
    || protocol.globalProtocolUncertaintyStopsAll !== true || !plain(context.index.runnerRef)) {
    fail("S10_DEFINITION_ADMISSION_DENIED", "definition does not authorize one exact open-calibration invocation");
  }
}

async function assertResultsAbsent(resultsRoot) {
  try { await access(resultsRoot); } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  fail("S10_RESULTS_ROOT_ALREADY_EXISTS", "registered result root already exists and cannot be replayed");
}

export async function runRegisteredSlice10Calibration({
  definitionRoot = SLICE10_DEFINITION_ROOT,
  projectRoot = PROJECT_ROOT,
  resultsRoot = SLICE10_RESULTS_ROOT,
  validateDefinition,
  loadDefinitionContext = loadSlice10DefinitionContext,
  gitAdmission = defaultGitAdmission,
  rawExecutorFactory,
  runtimeEndObserver,
  operationRunner = runSlice10CalibrationOperation,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof validateDefinition !== "function" || typeof runtimeEndObserver !== "function") {
    fail("S10_REGISTERED_DRIVER_CONFIGURATION_INVALID", "central validator and durable end-runtime observer are required before execution");
  }
  const validation = await validateDefinition({ definitionRoot, requirePins: true, recheckRuntime: true, regenerate: true });
  const context = await loadDefinitionContext({ definitionRoot, projectRoot });
  exactDefinitionAdmission({ validation, context });
  await gitAdmission(projectRoot, context.index);
  await assertResultsAbsent(resultsRoot);

  const expectedRuntime = JSON.parse(context.runtime.workerRuntimeCanonicalJson);
  const rawExecutor = rawExecutorFactory
    ? rawExecutorFactory({ context, expectedRuntime, verifyOutput: verifySlice10FinalOutput })
    : createSlice07RawWorkerExecutor({ expectedRuntime, verifyOutput: verifySlice10FinalOutput });
  if (!rawExecutor || typeof rawExecutor.execute !== "function") fail("S10_REGISTERED_DRIVER_CONFIGURATION_INVALID", "raw executor factory failed");
  const workerRef = implementationFromCandidate(context.candidate, "WORKER-SHARP-RAW@0.10.0");
  const reports = {};
  for (const operation of OPERATIONS) {
    if (reports.normalize?.globalStop !== null && reports.normalize?.globalStop !== undefined) break;
    const loaded = await loadSlice10OperationDefinitionCases({ projectRoot, index: context.index, fileMap: context.fileMap, operation });
    const contractRef = context.index.contractRefs.find((item) => item.id === `CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`);
    const preregistrationRef = context.index.preregistrationRefs.find((item) => item.id === `PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`);
    if (!contractRef || !preregistrationRef) fail("S10_DEFINITION_INVALID", "operation contract or preregistration is absent");
    const executeAttempt = createSlice10CalibrationAttemptExecutor({ casesBySourceId: loaded.casesBySourceId, rawExecutor });
    reports[operation] = await operationRunner({
      resultsRoot: path.join(resultsRoot, operation), operation, cases: loaded.cases,
      refs: {
        admissionRef: context.index.admissionLineageRef, candidateRef: context.index.candidateRef,
        contractRef, preregistrationRef, runtimeRef: context.index.runtimeRef, workerRef,
      },
      executeAttempt,
      verifyRuntimeEnd: (args) => runtimeEndObserver(Object.freeze({ context, ...args })),
      now,
    });
  }
  return Object.freeze({
    definitionRef: validation.definitionRef, reports: Object.freeze(reports),
    plannedOperationRuns: 2, actualOperationRuns: Object.keys(reports).length,
    calibrationAuthorized: false, formalEvidence: false, c1: 0, productSupport: false,
  });
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--execute-registered-open-calibration") {
    process.stderr.write("Usage: node scripts/research-run-slice10.mjs --execute-registered-open-calibration\n");
    process.exitCode = 2;
    return;
  }
  const validator = (await import("./research-validate-slice10.mjs")).validateSlice10Definition;
  process.stdout.write(`${JSON.stringify(await runRegisteredSlice10Calibration({ validateDefinition: validator }), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
