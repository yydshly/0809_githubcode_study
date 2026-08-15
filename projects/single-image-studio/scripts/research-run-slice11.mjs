import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createSlice11CalibrationAttemptExecutor } from "./research-calibration-case-slice11.mjs";
import { runSlice11DurableCalibrationOperation } from "./research-calibration-operation-slice11.mjs";
import { createSlice11RawWorkerExecutor } from "./research-gateb-adapter-slice11.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { canonicalJsonSlice05, inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import { loadSlice10OperationDefinitionCases, verifySlice10FinalOutput } from "./research-calibration-case-slice10.mjs";

const exec = promisify(execFile);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
export const SLICE11_DEFINITION_ROOT = path.join(PROJECT_ROOT, "research", "slice-11");
export const SLICE11_RESULTS_ROOT = path.join(SLICE11_DEFINITION_ROOT, "results", "open-calibration");
export const SLICE11_REGISTERED_DRIVER_ID = "DRIVER-REGISTERED-OPEN-CALIBRATION@0.11.0";

function fail(code, message, options = {}) { throw Object.assign(new Error(message, options), { code }); }
function sha(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
async function readJson(filePath) { const bytes = await readFile(filePath); return { bytes, record: JSON.parse(bytes) }; }
async function enumerateDefinition(root) {
  const map = new Map();
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (relative === "results" || relative.startsWith("results/")) continue;
      if (entry.isSymbolicLink()) fail("S11_DEFINITION_LINK_FORBIDDEN", "definition cannot contain links");
      if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
      else if (entry.isFile() && entry.name !== "README.md") map.set(relative, await readFile(path.join(directory, entry.name)));
    }
  }
  await walk(root);
  return map;
}
async function actualRef(projectRoot, ref) {
  const bytes = await readFile(path.join(projectRoot, ...ref.path.split("/")));
  const record = JSON.parse(bytes);
  if (bytes.length !== ref.byteLength || sha(bytes) !== ref.fileSha256 || record.contentHash !== ref.contentHash || record.id !== ref.id) fail("S11_DEFINITION_REFERENCE_DRIFT", `record drift: ${ref.path}`);
  return record;
}
function implementation(candidate, id) {
  const found = candidate.implementationRefs.find((entry) => entry.id === id);
  if (!found) fail("S11_DEFINITION_INVALID", `missing implementation ${id}`);
  return found;
}

export async function loadSlice11DefinitionContext({ definitionRoot = SLICE11_DEFINITION_ROOT, projectRoot = PROJECT_ROOT } = {}) {
  const fileMap = await enumerateDefinition(definitionRoot);
  const indexBytes = fileMap.get("definition-index.v0.11.0.json");
  if (!indexBytes) fail("S11_DEFINITION_INVALID", "definition index is absent");
  const index = JSON.parse(indexBytes);
  const candidate = JSON.parse(fileMap.get(index.candidateRef.path));
  const runtime = JSON.parse(fileMap.get(index.runtimeRef.path));
  return Object.freeze({ definitionRoot, projectRoot, fileMap, index, candidate, runtime });
}

async function loadPriorCases(projectRoot, operation) {
  const priorRoot = path.join(projectRoot, "research", "slice-10");
  const fileMap = await enumerateDefinition(priorRoot);
  const index = JSON.parse(fileMap.get("definition-index.v0.10.0.json"));
  return loadSlice10OperationDefinitionCases({ projectRoot, index, fileMap, operation });
}

export async function loadSlice11OperationCases({ context, operation } = {}) {
  if (!context || !["normalize", "export"].includes(operation)) fail("S11_OPERATION_DEFINITION_INVALID", "definition context and operation required");
  const prior = await loadPriorCases(context.projectRoot, operation);
  const priorById = prior.casesBySourceId;
  const sourceRefById = new Map(context.index.sourceRefs.map((entry) => [entry.id, entry]));
  const goldRefById = new Map(context.index.goldIdentityRefs.map((entry) => [entry.id, entry]));
  const manifests = context.index.manifestRefs.filter((entry) => JSON.parse(context.fileMap.get(entry.path)).operation === operation);
  const cases = [];
  const casesBySourceId = new Map();
  for (const manifestRef of manifests) {
    const manifest = JSON.parse(context.fileMap.get(manifestRef.path));
    for (const entry of manifest.entries) {
      const sourceRef = sourceRefById.get(entry.sourceRef.id);
      const wrapper = JSON.parse(context.fileMap.get(sourceRef.path));
      const priorMaterial = priorById.get(wrapper.priorSlice10SourceRef.id);
      if (!priorMaterial || priorMaterial.wrapper.operation !== operation || priorMaterial.wrapper.partition !== wrapper.partition
        || priorMaterial.wrapper.categoryId !== wrapper.categoryId || priorMaterial.wrapper.disposition !== wrapper.disposition) fail("S11_OPERATION_LINEAGE_INVALID", "Slice 10 case lineage mismatch");
      const goldIdentityRef = entry.goldIdentityLocator === null ? null : goldRefById.get(entry.goldIdentityLocator.id);
      let goldExpected = null;
      if (goldIdentityRef) {
        if (goldIdentityRef.path !== entry.goldIdentityLocator.path) fail("S11_OPERATION_GOLD_INVALID", "gold locator mismatch");
        const gold = JSON.parse(context.fileMap.get(goldIdentityRef.path));
        goldExpected = JSON.parse(gold.expectedCanonicalJson);
        if (!same(gold.sourceRef, sourceRef) || gold.priorSlice10GoldIdentityRef.id !== wrapper.priorSlice10GoldIdentityRef.id) fail("S11_OPERATION_GOLD_INVALID", "gold lineage mismatch");
      }
      const workerInput = wrapper.disposition === "rejection" ? null : operation === "normalize"
        ? { inputBytes: Buffer.from(priorMaterial.sourceBytes) }
        : (() => { const decoded = decodeIndependentPngSlice05(priorMaterial.sourceBytes); return { rgba: Buffer.from(decoded.rgba), width: decoded.width, height: decoded.height }; })();
      const material = Object.freeze({ sourceId: sourceRef.id, operation, partition: wrapper.partition, disposition: wrapper.disposition, expectedStableErrorCode: wrapper.expectedStableErrorCode, workerInput, goldExpected });
      casesBySourceId.set(sourceRef.id, material);
      cases.push(Object.freeze({ disposition: wrapper.disposition, expectedStableErrorCode: wrapper.expectedStableErrorCode, goldIdentityRef, manifestRef, partition: wrapper.partition, sourceRef }));
    }
  }
  if (cases.length !== 48 || casesBySourceId.size !== 48) fail("S11_OPERATION_DEFINITION_INVALID", "operation denominator must be 48 unique cases");
  return Object.freeze({ cases: Object.freeze(cases), casesBySourceId });
}

async function defaultGitAdmission(projectRoot) {
  const [{ stdout: head }, { stdout: remote }, { stdout: status }] = await Promise.all([
    exec("git", ["rev-parse", "HEAD"], { cwd: projectRoot, windowsHide: true }), exec("git", ["rev-parse", "origin/main"], { cwd: projectRoot, windowsHide: true }), exec("git", ["status", "--porcelain"], { cwd: projectRoot, windowsHide: true }),
  ]);
  if (head.trim() !== remote.trim() || status.trim() !== "") fail("S11_GIT_ADMISSION_DENIED", "HEAD must equal origin/main and worktree must be clean");
}
async function assertResultsAbsent(resultsRoot) {
  try { await access(resultsRoot); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
  fail("S11_RESULTS_ROOT_ALREADY_EXISTS", "registered results root already exists; replay is forbidden");
}

export async function runRegisteredSlice11Calibration({
  definitionRoot = SLICE11_DEFINITION_ROOT, projectRoot = PROJECT_ROOT, resultsRoot = SLICE11_RESULTS_ROOT,
  validateDefinition, gitAdmission = defaultGitAdmission, rawExecutorFactory, operationRunner = runSlice11DurableCalibrationOperation,
  observeRuntime = async () => inventorySharpRuntimeSlice05({ projectRoot }), now = () => new Date().toISOString(),
} = {}) {
  if (typeof validateDefinition !== "function") fail("S11_REGISTERED_DRIVER_CONFIGURATION_INVALID", "central validator required");
  const validation = await validateDefinition({ definitionRoot, requirePins: true, recheckRuntime: true, regenerate: true });
  if (!validation.valid || !validation.definitionRef || validation.postRun !== null) fail("S11_DEFINITION_ADMISSION_DENIED", "definition is not a pinned results-zero baseline");
  const context = await loadSlice11DefinitionContext({ definitionRoot, projectRoot });
  await gitAdmission(projectRoot, context.index);
  await assertResultsAbsent(resultsRoot);
  const expectedRuntime = JSON.parse(context.runtime.workerRuntimeCanonicalJson);
  const rawExecutor = rawExecutorFactory ? rawExecutorFactory({ context, expectedRuntime, verifyOutput: verifySlice10FinalOutput })
    : createSlice11RawWorkerExecutor({ expectedRuntime, verifyOutput: verifySlice10FinalOutput });
  const worker = implementation(context.candidate, "WORKER-SHARP-RAW@0.11.0");
  const workerRef = { id: worker.id, version: "0.11.0", path: worker.path, implementationSha256: worker.sha256 };
  const reports = {};
  for (const operation of ["normalize", "export"]) {
    if (reports.normalize?.result?.globalStop) break;
    const loaded = await loadSlice11OperationCases({ context, operation });
    const contractRef = context.index.contractRefs.find((entry) => entry.id === `CC-CAP02-${operation.toUpperCase()}-PNG@0.11.0`);
    const executeAttempt = createSlice11CalibrationAttemptExecutor({ casesBySourceId: loaded.casesBySourceId, rawExecutor, classifyRejection: ({ material }) => material.expectedStableErrorCode });
    reports[operation] = await operationRunner({ operationRoot: path.join(resultsRoot, operation), runId: "registered-open-calibration-slice11", operation, cases: loaded.cases,
      refs: { candidateRef: context.index.candidateRef, contractRef, runtimeRef: context.index.runtimeRef, workerRef }, executeAttempt,
      observeRuntime: async () => JSON.parse(canonicalJsonSlice05(await observeRuntime())), frozenRuntimePayloadSha256: context.runtime.inventoryPayloadSha256, now });
  }
  return Object.freeze({ definitionRef: validation.definitionRef, reports: Object.freeze(reports), plannedOperationRuns: 2, actualOperationRuns: Object.keys(reports).length, calibrationAuthorized: false, formalEvidence: false, c1: 0, productSupport: false });
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--execute-registered-open-calibration") { process.stderr.write("Usage: node scripts/research-run-slice11.mjs --execute-registered-open-calibration\n"); process.exitCode = 2; return; }
  const validator = (await import("./research-validate-slice11.mjs")).validateSlice11Definition;
  process.stdout.write(`${JSON.stringify(await runRegisteredSlice11Calibration({ validateDefinition: validator }), null, 2)}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
