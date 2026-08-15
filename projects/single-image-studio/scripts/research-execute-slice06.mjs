import { execFile as execFileCallback } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { link, lstat, mkdir, open, readFile, readdir, realpath, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SLICE06_DIAGNOSTIC_POLICY,
  contentHashSlice06,
  createSlice06DiagnosticAdapter,
  sha256Slice06,
  stableStringifySlice06,
} from "./research-diagnostic-adapter-slice06.mjs";
import {
  buildCandidateOutputObservationSlice06,
  buildDiagnosticEnvelopeSlice06,
  buildOracleDiagnosticSlice06,
  validateCandidateOutputObservationSlice06,
  validateDiagnosticEnvelopeSlice06,
  validateOracleDiagnosticSlice06,
  verifyOutputBytesSlice06,
} from "./research-diagnostic-png-oracle-slice06.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import {
  SLICE06_EVIDENCE_BOUNDARY,
  SLICE06_RUNNER_VERSIONS,
  buildSlice06CharacterizationClose,
  createSlice06DiagnosticRunner,
  requestIdSlice06,
  validateSlice06RunRequest,
} from "./research-run-slice06.mjs";
import * as centralValidator from "./research-validate-slice06.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SLICE06_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
export const SLICE06_REPOSITORY_ROOT = path.resolve(SLICE06_PROJECT_ROOT, "..", "..");
export const SLICE06_DEFINITION_ROOT = path.join(SLICE06_PROJECT_ROOT, "research", "slice-06");
export const SLICE06_DEFINITION_INDEX = path.join(SLICE06_DEFINITION_ROOT, "definition-index.v0.6.0.json");
export const SLICE06_RESULTS_ROOT = path.join(SLICE06_DEFINITION_ROOT, "results", "open-diagnostic");

const OPERATIONS = Object.freeze(["normalize", "export"]);
const SHA_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SAFE_RELATIVE_PATTERN = /^[A-Za-z0-9._:@/-]+$/u;
const NUL = Buffer.from([0]);
const ID_FIELDS = Object.freeze([
  "definitionIndexId", "candidateId", "candidateLockId", "contractId", "diagnosticPlanId", "planId",
  "preregistrationId", "manifestId", "runtimeAttestationId", "hardwareObservationId",
  "hardwareId", "hardwareProfileId", "sourceId", "sourceLineageId", "regressionSourceId",
  "rightsId", "rightsRecordId", "retentionPolicyId", "lineageId", "closureLineageId",
  "artifactId", "sourceProvenanceId", "goldRecordId",
]);

export class Slice06ExecutionError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "Slice06ExecutionError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) { throw new Slice06ExecutionError(code, message, options); }
function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function compareText(left, right) { return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }
function same(left, right) { return stableStringifySlice06(left) === stableStringifySlice06(right); }
function shortRef(ref) { return { id: ref.id, contentHash: ref.contentHash }; }
function runnerRecordRef(ref) {
  return { id: ref.id, contentHash: ref.contentHash, path: ref.path, byteLength: ref.byteLength, fileSha256: ref.fileSha256 };
}
function implementationRef(ref) {
  return { id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 };
}
function assertSha(value, code, label) { if (typeof value !== "string" || !SHA_PATTERN.test(value)) fail(code, `${label} must be SHA-256`); }
function assertCommit(value, code, label) { if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) fail(code, `${label} must be a full Git commit`); }
function assertSafeRelative(value, code, label) {
  if (typeof value !== "string" || !SAFE_RELATIVE_PATTERN.test(value) || value.startsWith("/") || value.includes("\\")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")) fail(code, `${label} is unsafe`);
}
function assertRecordRef(ref, code, label) {
  if (!isRecord(ref)) fail(code, `${label} must be a record ref`);
  for (const key of ["id", "contentHash", "path", "byteLength", "fileSha256"]) if (!Object.hasOwn(ref, key)) fail(code, `${label}.${key} missing`);
  if (typeof ref.id !== "string" || ref.id.length < 1 || ref.id.includes("..")) fail(code, `${label}.id invalid`);
  assertSha(ref.contentHash, code, `${label}.contentHash`); assertSafeRelative(ref.path, code, `${label}.path`);
  assertSha(ref.fileSha256, code, `${label}.fileSha256`);
  if (!Number.isInteger(ref.byteLength) || ref.byteLength < 1) fail(code, `${label}.byteLength invalid`);
}
function operationEntry(entries, operation, code, label) {
  if (!Array.isArray(entries)) fail(code, `${label} must be an array`);
  const matches = entries.filter((entry) => entry?.operation === operation && isRecord(entry.ref));
  if (matches.length !== 1) fail(code, `${label} must contain exactly one ${operation} ref`);
  assertRecordRef(matches[0].ref, code, `${label}.${operation}.ref`);
  return matches[0].ref;
}

function isInside(base, candidate) {
  const relative = path.relative(path.resolve(base), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function assertRegularFileNoLinks(base, relativePath, code) {
  assertSafeRelative(relativePath, code, "path");
  const resolvedBase = path.resolve(base);
  const filename = path.resolve(resolvedBase, ...relativePath.split("/"));
  if (!isInside(resolvedBase, filename)) fail(code, `path escapes root: ${relativePath}`);
  let cursor = resolvedBase;
  for (const [index, segment] of relativePath.split("/").entries()) {
    cursor = path.join(cursor, segment);
    let info;
    try { info = await lstat(cursor); } catch (cause) { fail(code, `missing path: ${relativePath}`, { cause }); }
    if (info.isSymbolicLink()) fail(code, `symlink/junction forbidden: ${relativePath}`);
    const final = index === relativePath.split("/").length - 1;
    if (final ? !info.isFile() : !info.isDirectory()) fail(code, `non-regular path: ${relativePath}`);
  }
  const [baseReal, fileReal] = await Promise.all([realpath(resolvedBase), realpath(filename)]);
  if (!isInside(baseReal, fileReal)) fail(code, `resolved path escapes root: ${relativePath}`);
  return filename;
}

async function readPinnedBytes(base, ref, code = "S06_EXECUTION_REF_INVALID") {
  assertRecordRef(ref, code, "ref");
  const filename = await assertRegularFileNoLinks(base, ref.path, code);
  const bytes = await readFile(filename);
  if (bytes.byteLength !== ref.byteLength || sha256Slice06(bytes) !== ref.fileSha256) fail(code, `file identity drift: ${ref.path}`);
  return { filename, bytes };
}

async function readPinnedFileBytes(base, ref, code = "S06_EXECUTION_FILE_REF_INVALID") {
  if (!isRecord(ref) || typeof ref.path !== "string" || !Number.isInteger(ref.byteLength) || ref.byteLength < 1) {
    fail(code, "file ref shape invalid");
  }
  assertSafeRelative(ref.path, code, "fileRef.path"); assertSha(ref.fileSha256, code, "fileRef.fileSha256");
  const filename = await assertRegularFileNoLinks(base, ref.path, code);
  const bytes = await readFile(filename);
  if (bytes.byteLength !== ref.byteLength || sha256Slice06(bytes) !== ref.fileSha256) fail(code, `file identity drift: ${ref.path}`);
  return { filename, bytes };
}

async function readPinnedRecord(base, ref, code = "S06_EXECUTION_REF_INVALID") {
  const { filename, bytes } = await readPinnedBytes(base, ref, code);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); } catch (cause) { fail(code, `invalid JSON: ${ref.path}`, { cause }); }
  if (!isRecord(record) || record.contentHash !== ref.contentHash || contentHashSlice06(record) !== ref.contentHash) {
    fail(code, `record content identity drift: ${ref.path}`);
  }
  const declaredIds = ID_FIELDS.filter((field) => typeof record[field] === "string").map((field) => record[field]);
  if (!declaredIds.includes(ref.id)) fail(code, `record ID differs from ref: ${ref.path}`);
  return { filename, bytes, record, ref: runnerRecordRef(ref) };
}

async function readJsonFile(filename, code) {
  let bytes;
  try { bytes = await readFile(filename); } catch (cause) { fail(code, `cannot read ${filename}`, { cause }); }
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); } catch (cause) { fail(code, `invalid JSON: ${filename}`, { cause }); }
  if (!isRecord(record)) fail(code, `JSON root is not an object: ${filename}`);
  return { bytes, record };
}

async function pathExists(filename) {
  try { await lstat(filename); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

async function verifyImplementationRefs(index, projectRoot) {
  if (!Array.isArray(index.implementationRefs) || index.implementationRefs.length !== 8) {
    fail("S06_IMPLEMENTATION_PIN_INVALID", "definition must pin the exact eight-role implementation set");
  }
  const byRole = new Map();
  const lineageRoles = new Set(["runtime-inventory-lineage", "regression-material-decoder"]);
  for (const entry of index.implementationRefs) {
    const ref = entry?.ref;
    if (typeof entry?.role !== "string" || byRole.has(entry.role) || !isRecord(ref)) {
      fail("S06_IMPLEMENTATION_PIN_INVALID", "implementation roles must be unique and pinned");
    }
    for (const key of ["id", "version", "path", "implementationSha256"]) if (!Object.hasOwn(ref, key)) fail("S06_IMPLEMENTATION_PIN_INVALID", `${entry.role}.${key} missing`);
    const expectedVersion = lineageRoles.has(entry.role) ? "0.5.0" : "0.6.0";
    if (typeof ref.id !== "string" || ref.version !== expectedVersion) {
      fail("S06_IMPLEMENTATION_PIN_INVALID", `${entry.role} version/ID invalid`);
    }
    assertSafeRelative(ref.path, "S06_IMPLEMENTATION_PIN_INVALID", `${entry.role}.path`);
    assertSha(ref.implementationSha256, "S06_IMPLEMENTATION_PIN_INVALID", `${entry.role}.implementationSha256`);
    const filename = await assertRegularFileNoLinks(projectRoot, ref.path, "S06_IMPLEMENTATION_PIN_INVALID");
    if (sha256Slice06(await readFile(filename)) !== ref.implementationSha256) fail("S06_IMPLEMENTATION_PIN_INVALID", `implementation drift: ${entry.role}`);
    byRole.set(entry.role, ref);
  }
  for (const role of [
    "candidate-adapter", "candidate-worker", "independent-diagnostic-oracle", "local-diagnostic-runner",
    "registered-diagnostic-driver", "definition-generator", "runtime-inventory-lineage", "regression-material-decoder",
  ]) {
    if (!byRole.has(role)) fail("S06_IMPLEMENTATION_PIN_INVALID", `missing implementation role ${role}`);
  }
  const self = byRole.get("registered-diagnostic-driver");
  if (self.id !== "DRIVER-REGISTERED-DIAGNOSTIC@0.6.0" || self.path !== "scripts/research-execute-slice06.mjs") {
    fail("S06_DRIVER_PIN_INVALID", "definition does not pin this registered driver identity");
  }
  return byRole;
}

function exactInitialResultState(index) {
  const expected = {
    resultsDirectoryPresent: false,
    resultFilesPresent: 0,
    ledgersPresent: 0,
    summariesPresent: 0,
    closeRecordsPresent: 0,
    specimensPresent: 0,
    quarantinePresent: 0,
  };
  const actual = index.initialResultStateAtDefinitionFreeze ?? index.resultsStateAtDefinitionFreeze;
  if (!isRecord(actual) || !same(actual, expected)) {
    fail("S06_RESULTS_ZERO_MARKER_INVALID", "definition does not carry the exact results-zero marker");
  }
}

function validateExecutionAdmissionMarker(index) {
  const expected = {
    definitionFrozen: true,
    resultsZero: true,
    containingGitCommitMustBePushedBeforeRun: true,
    containingCommitRecordedInDefinition: false,
    driverMustVerifyHeadAndOrigin: true,
    registeredInvocationPerOperation: 1,
  };
  if (!isRecord(index.executionAdmission) || !Object.entries(expected).every(([key, value]) => index.executionAdmission[key] === value)) {
    fail("S06_EXECUTION_ADMISSION_MARKER_INVALID", "definition execution-admission marker is missing or changed");
  }
}

/**
 * Reopens every execution-critical record after central validation. This is an
 * independent read-only binding step, not a replacement for the validator.
 */
export async function loadSlice06ExecutionContext({
  projectRoot = SLICE06_PROJECT_ROOT,
  sliceRoot = SLICE06_DEFINITION_ROOT,
  definitionReport,
} = {}) {
  const indexPath = path.join(path.resolve(sliceRoot), "definition-index.v0.6.0.json");
  const { bytes: indexBytes, record: index } = await readJsonFile(indexPath, "S06_DEFINITION_INDEX_INVALID");
  if (index.schemaVersion !== "definition-index.slice06.v0" || index.definitionIndexId !== "DEFINITION-INDEX-SLICE06@0.6.0"
    || index.definitionState !== "frozen-definition-results-zero-diagnostic-only" || contentHashSlice06(index) !== index.contentHash) {
    fail("S06_DEFINITION_INDEX_INVALID", "canonical index is not the frozen Slice 06 results-zero definition");
  }
  const definitionRef = {
    id: index.definitionIndexId, contentHash: index.contentHash, path: "definition-index.v0.6.0.json",
    byteLength: indexBytes.byteLength, fileSha256: sha256Slice06(indexBytes),
  };
  if (!isRecord(definitionReport?.definitionRef) || !same(definitionReport.definitionRef, definitionRef)) {
    fail("S06_DEFINITION_REPORT_STALE", "central validator report is missing or differs from the reopened definition index");
  }
  exactInitialResultState(index); validateExecutionAdmissionMarker(index);
  const protocol = index.resultProtocol;
  if (!isRecord(protocol) || protocol.canonicalResultsRoot !== "research/slice-06/results/open-diagnostic"
    || protocol.maximumDriverInvocations !== 1 || protocol.plannedRegisteredOperationRuns !== 2
    || protocol.plannedSourceUnits !== 8 || protocol.plannedAttempts !== 24 || protocol.replacementAttempts !== 0
    || Object.hasOwn(protocol, "driverInvocations") || Object.hasOwn(protocol, "registeredOperationRuns")
    || Object.hasOwn(protocol, "totalSourceUnits") || Object.hasOwn(protocol, "totalAttempts")) {
    fail("S06_RESULT_PROTOCOL_INVALID", "definition result protocol is not one maximum driver invocation with two planned operation runs and 24 planned attempts");
  }
  if (!same(protocol.globalStop, {
    operationOrder: ["normalize", "export"],
    secondOperationRegistrationRequiresFirstStatus: "characterization-complete",
    firstOperationBlockingStatuses: ["protocol-failed", "inconclusive"],
    actualCountsRecordedOnlyByDriverAfterExecution: true,
  })) fail("S06_RESULT_PROTOCOL_INVALID", "definition global-stop protocol differs from the registered driver state machine");
  const candidate = await readPinnedRecord(sliceRoot, index.candidateRef);
  if (candidate.ref.id !== SLICE06_DIAGNOSTIC_POLICY.candidateId) fail("S06_CANDIDATE_BINDING_INVALID", "candidate ID drifted");
  const runtime = await readPinnedRecord(sliceRoot, index.runtimeAttestationRef);
  const hardware = await readPinnedRecord(sliceRoot, index.hardwareRef);
  const implementationByRole = await verifyImplementationRefs(index, projectRoot);
  const rights = index.rightsRef ? await readPinnedRecord(sliceRoot, index.rightsRef) : null;
  const retention = index.retentionPolicyRef ? await readPinnedRecord(sliceRoot, index.retentionPolicyRef) : null;
  const operations = new Map();
  for (const operation of OPERATIONS) {
    const contract = await readPinnedRecord(sliceRoot, operationEntry(index.contractRefs, operation, "S06_CONTRACT_BINDING_INVALID", "contractRefs"));
    const plan = await readPinnedRecord(sliceRoot, operationEntry(index.diagnosticPlanRefs, operation, "S06_PLAN_BINDING_INVALID", "diagnosticPlanRefs"));
    const preregistration = await readPinnedRecord(sliceRoot, operationEntry(index.preregistrationRefs, operation, "S06_PREREGISTRATION_BINDING_INVALID", "preregistrationRefs"));
    const manifest = await readPinnedRecord(sliceRoot, operationEntry(index.manifestRefs, operation, "S06_MANIFEST_BINDING_INVALID", "manifestRefs"));
    if (manifest.record.operation !== operation || preregistration.record.operation !== operation || plan.record.operation !== operation) {
      fail("S06_OPERATION_BINDING_INVALID", `${operation} machine records cross operations`);
    }
    const expectedShared = [
      ["candidateRef", candidate.ref], ["contractRef", contract.ref], ["runtimeAttestationRef", runtime.ref],
      ["hardwareRef", hardware.ref], ["rightsRef", rights?.ref], ["retentionPolicyRef", retention?.ref],
    ];
    for (const [key, expected] of expectedShared) {
      if (!expected || !same(manifest.record[key], expected) || !same(preregistration.record[key], expected)
        || !same(plan.record[key], expected)) fail("S06_OPERATION_BINDING_INVALID", `${operation}.${key} differs across current definition records`);
    }
    if (!same(manifest.record.diagnosticPlanRef, plan.ref) || !same(manifest.record.preregistrationRef, preregistration.ref)
      || !same(preregistration.record.diagnosticPlanRef, plan.ref)) fail("S06_OPERATION_BINDING_INVALID", `${operation} plan/preregistration/manifest graph differs`);
    if (!Array.isArray(manifest.record.entries) || manifest.record.entries.length !== 4) fail("S06_MANIFEST_BINDING_INVALID", `${operation} manifest denominator is not four`);
    const sources = [];
    for (const entry of manifest.record.entries) {
      const sourceRef = entry.sourceRef ?? entry.sourceLineageRef;
      const source = await readPinnedRecord(sliceRoot, sourceRef, "S06_SOURCE_BINDING_INVALID");
      if (source.record.operation !== operation || source.record.sourceId !== entry.sourceId
        || source.record.expectedDisposition !== entry.expectedDisposition
        || source.record.expectedStableErrorCode !== entry.expectedStableErrorCode
        || source.record.repetitions !== 3 || source.record.attemptNumber !== 1
        || !same(source.record.rightsRef, rights?.ref) || !same(source.record.retentionPolicyRef, retention?.ref)) {
        fail("S06_SOURCE_BINDING_INVALID", `${operation} source wrapper differs from manifest/current rights and retention`);
      }
      sources.push({ entry, ...source });
    }
    if (!Array.isArray(preregistration.record.sourceLineageRefs)
      || !same(preregistration.record.sourceLineageRefs, sources.map(({ ref }) => ref))) {
      fail("S06_PREREGISTRATION_BINDING_INVALID", `${operation} preregistration source denominator differs from manifest`);
    }
    operations.set(operation, { contract, plan, preregistration, manifest, sources });
  }
  return Object.freeze({
    projectRoot: path.resolve(projectRoot), sliceRoot: path.resolve(sliceRoot), index, definitionRef,
    candidate, runtime, hardware, rights, retention, implementationByRole, operations,
  });
}

function gitPath(repositoryRoot, filename) {
  const relative = path.relative(repositoryRoot, filename).split(path.sep).join("/");
  assertSafeRelative(relative, "S06_GIT_STATE_INVALID", "definition index git path");
  return relative;
}

async function defaultGitCommand(repositoryRoot, args) {
  try {
    const { stdout } = await execFile("git", args, { cwd: repositoryRoot, encoding: "utf8", windowsHide: true });
    return stdout.trim();
  } catch (cause) { fail("S06_GIT_STATE_UNAVAILABLE", `git ${args.join(" ")} failed`, { cause }); }
}

export async function collectSlice06GitState({
  repositoryRoot = SLICE06_REPOSITORY_ROOT,
  definitionIndex = SLICE06_DEFINITION_INDEX,
  gitCommand = defaultGitCommand,
} = {}) {
  const indexGitPath = gitPath(path.resolve(repositoryRoot), path.resolve(definitionIndex));
  const status = await gitCommand(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const headCommit = await gitCommand(repositoryRoot, ["rev-parse", "HEAD"]);
  const originMainCommit = await gitCommand(repositoryRoot, ["rev-parse", "refs/remotes/origin/main"]);
  let tracked = true;
  try { await gitCommand(repositoryRoot, ["ls-files", "--error-unmatch", "--", indexGitPath]); } catch { tracked = false; }
  const definitionIndexCommit = tracked ? await gitCommand(repositoryRoot, ["log", "-1", "--format=%H", "--", indexGitPath]) : "";
  let reachable = false;
  if (tracked && COMMIT_PATTERN.test(definitionIndexCommit)) {
    try { await gitCommand(repositoryRoot, ["merge-base", "--is-ancestor", definitionIndexCommit, headCommit]); reachable = true; } catch { reachable = false; }
  }
  assertCommit(headCommit, "S06_GIT_STATE_INVALID", "headCommit");
  assertCommit(originMainCommit, "S06_GIT_STATE_INVALID", "originMainCommit");
  if (tracked) assertCommit(definitionIndexCommit, "S06_GIT_STATE_INVALID", "definitionIndexCommit");
  return Object.freeze({
    headCommit, originMainCommit, worktreeClean: status === "", definitionIndexTracked: tracked,
    definitionIndexCommit: tracked ? definitionIndexCommit : null, definitionIndexReachableFromHead: reachable,
  });
}

export function parseSlice06ExecutionCli(args) {
  if (!Array.isArray(args) || args.length !== 1 || args[0] !== "--diagnostic") {
    fail("S06_CLI_ARGUMENT_INVALID", "exactly --diagnostic is required; no Gate-B or calibration mode exists");
  }
  return Object.freeze({ mode: "open-diagnostic" });
}

function expectedWorkerRuntime(runtimeRecord) {
  if (isRecord(runtimeRecord.expectedWorkerRuntime)) return structuredClone(runtimeRecord.expectedWorkerRuntime);
  const nativeVersions = runtimeRecord.versions?.sharpRuntime;
  const nodeVersion = runtimeRecord.environment?.node?.version;
  const platform = runtimeRecord.environment?.os?.platform;
  const architecture = runtimeRecord.environment?.os?.architecture;
  if (!isRecord(nativeVersions) || typeof nodeVersion !== "string" || typeof platform !== "string" || typeof architecture !== "string") {
    fail("S06_RUNTIME_BINDING_INVALID", "runtime attestation lacks the exact worker runtime payload");
  }
  return {
    sharpVersion: nativeVersions.sharp, nativeVersions: structuredClone(nativeVersions), nodeVersion, platform, architecture,
    settings: {
      concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false,
      uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
    },
  };
}

function projectRights(context, source) {
  const rightsValues = source.record.rights ?? context.rights?.record?.oracleRightsValues;
  const rights = rightsValues ? { rightsRef: shortRef(source.record.rightsRef), ...structuredClone(rightsValues) } : null;
  const keys = [
    "rightsRef", "assetClass", "containsRealPerson", "realUserPhotosUsed", "thirdPartyAssetsUsed",
    "modelWeightsUsed", "candidateDerivativeRepositoryRetention", "diagnosticPublicDisplay",
  ];
  if (!isRecord(rights) || Object.keys(rights).length !== keys.length || keys.some((key) => !Object.hasOwn(rights, key))
    || rights.assetClass !== "project-original-deterministic-synthetic-open-research-fixtures"
    || rights.containsRealPerson !== false || rights.realUserPhotosUsed !== false || rights.thirdPartyAssetsUsed !== false
    || rights.modelWeightsUsed !== false || rights.candidateDerivativeRepositoryRetention !== true
    || rights.diagnosticPublicDisplay !== true) fail("S06_RIGHTS_BINDING_INVALID", "source lacks exact open-synthetic diagnostic retention rights");
  return structuredClone(rights);
}

function projectRetention(context, source) {
  const value = source.record.retention ?? context.retention?.record?.retainedValues;
  const policyRef = source.record.retentionPolicyRef ?? context.index.retentionPolicyRef;
  const retention = value && policyRef ? { ...structuredClone(value), policyRef: shortRef(policyRef) } : null;
  if (!isRecord(retention) || retention.state !== "retained") fail("S06_RETENTION_BINDING_INVALID", "registered open-synthetic output must use retained diagnostic policy");
  return structuredClone(retention);
}

export function buildSlice06RegisteredRequests({ context, operation, clock = () => new Date().toISOString() }) {
  if (!context?.operations?.has(operation) || typeof clock !== "function") fail("S06_REQUEST_BUILD_INVALID", "operation context/clock missing");
  const bundle = context.operations.get(operation);
  const manifestIdentity = bundle.manifest.record.runIdentity;
  const preregIdentity = bundle.preregistration.record.runIdentity;
  if (!isRecord(manifestIdentity) || !isRecord(preregIdentity)
    || manifestIdentity.runId !== preregIdentity.runId || manifestIdentity.sessionId !== preregIdentity.sessionId
    || preregIdentity.invocationLimit !== 1) fail("S06_REQUEST_BUILD_INVALID", `${operation} run/session identity binding invalid`);
  const runId = manifestIdentity.runId;
  if (typeof runId !== "string" || !(runId.includes("slice06") || runId.includes(".s06."))
    || !runId.includes(operation) || runId.includes("slice05") || runId.includes(".s05.")) {
    fail("S06_REQUEST_BUILD_INVALID", `${operation} run identity is not new and operation-bound`);
  }
  const refs = {
    definitionRef: runnerRecordRef(context.definitionRef), candidateRef: runnerRecordRef(context.candidate.ref),
    contractRef: runnerRecordRef(bundle.contract.ref), manifestRef: runnerRecordRef(bundle.manifest.ref),
    preregistrationRef: runnerRecordRef(bundle.preregistration.ref), runtimeAttestationRef: runnerRecordRef(context.runtime.ref),
    hardwareRef: runnerRecordRef(context.hardware.ref),
    adapterRef: implementationRef(context.implementationByRole.get("candidate-adapter")),
    workerRef: implementationRef(context.implementationByRole.get("candidate-worker")),
    oracleRef: implementationRef(context.implementationByRole.get("independent-diagnostic-oracle")),
  };
  const requests = [];
  for (const source of bundle.sources) {
    const { entry } = source;
    const expectedDisposition = entry.expectedDisposition ?? entry.disposition;
    if (!new Set(["applicable", "preflight-reject"]).has(expectedDisposition) || entry.repetitions !== 3) {
      fail("S06_REQUEST_BUILD_INVALID", `${operation}/${entry.sourceId} denominator or disposition invalid`);
    }
    if (typeof entry.sourceId !== "string" || !entry.sourceId.includes("s06") || entry.sourceId.includes("s05")) {
      fail("S06_REQUEST_BUILD_INVALID", "request source IDs must be new Slice 06 identities");
    }
    for (const repetition of [1, 2, 3]) {
      const createdAt = clock();
      const requestId = requestIdSlice06({ operation, sourceId: entry.sourceId, repetition });
      const request = {
        schemaVersion: SLICE06_RUNNER_VERSIONS.request, requestId, mode: "open-diagnostic", operation,
        ...structuredClone(refs), sourceRef: runnerRecordRef(source.ref),
        attempt: {
          runId, sourceId: entry.sourceId, partition: "diagnostic", repetition, attemptNumber: 1,
          idempotencyKey: `idempotency.slice06.open-diagnostic.${operation}.${sha256Slice06(Buffer.from(entry.sourceId, "utf8")).slice(0, 16)}.r${repetition}.a1`,
        },
        expectedDisposition,
        expectedStableErrorCode: expectedDisposition === "preflight-reject" ? entry.expectedStableErrorCode : null,
        createdAt, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
      };
      request.contentHash = contentHashSlice06(request);
      validateSlice06RunRequest(request);
      requests.push(Object.freeze(request));
    }
  }
  if (requests.length !== 12 || new Set(requests.map(({ requestId }) => requestId)).size !== 12
    || new Set(requests.map(({ attempt }) => attempt.idempotencyKey)).size !== 12) fail("S06_REQUEST_BUILD_INVALID", `${operation} request set is not exact 4x3`);
  return Object.freeze(requests);
}

async function loadSourceMaterial(context, source) {
  const byteAssetRef = source.record.byteAssetRef;
  const { bytes } = await readPinnedFileBytes(context.projectRoot, byteAssetRef, "S06_SOURCE_BYTES_INVALID");
  const facts = source.record.inputFacts;
  if (!isRecord(facts) || facts.byteLength !== bytes.byteLength || facts.fileSha256 !== sha256Slice06(bytes)) {
    fail("S06_SOURCE_BYTES_INVALID", `source facts differ from bytes: ${source.record.sourceId}`);
  }
  if (source.record.operation === "normalize") return { bytes, facts };
  const artifactRef = source.record.inputArtifactRef;
  const artifact = await readPinnedRecord(context.projectRoot, artifactRef, "S06_EXPORT_PARENT_INVALID");
  const decoded = decodeIndependentPngSlice05(bytes);
  if (decoded.decodedPixelSha256 !== facts.decodedPixelSha256 || decoded.width !== facts.width || decoded.height !== facts.height) {
    fail("S06_EXPORT_PARENT_INVALID", "independent decoded material differs from source wrapper");
  }
  return { bytes, facts, artifact: artifact.record, rgba: Buffer.from(decoded.rgba) };
}

function adapterRequest(request, material) {
  const candidateRef = shortRef(request.candidateRef);
  const contractRef = shortRef(request.contractRef);
  if (request.operation === "normalize") {
    return {
      schemaVersion: SLICE06_DIAGNOSTIC_POLICY.normalizeRequestVersion, mode: "open-diagnostic", operation: "normalize",
      attempt: structuredClone(request.attempt), candidateRef, contractRef,
      source: {
        sourceId: request.attempt.sourceId, mime: material.facts.mime, byteLength: material.facts.byteLength,
        fileSha256: material.facts.fileSha256, decodedPixelSha256: material.facts.decodedPixelSha256,
        alphaPresent: material.facts.alphaPresent,
      },
      sourceBytes: material.bytes,
    };
  }
  const artifact = material.artifact;
  const image = artifact.image;
  return {
    schemaVersion: SLICE06_DIAGNOSTIC_POLICY.exportRequestVersion, mode: "open-diagnostic", operation: "export",
    attempt: structuredClone(request.attempt), candidateRef, contractRef,
    normalizedArtifact: {
      schemaVersion: artifact.schemaVersion, artifactId: artifact.artifactId, contentHash: artifact.contentHash,
      fileSha256: artifact.bytes.fileSha256, decodedPixelSha256: artifact.bytes.decodedPixelSha256,
      width: image.width, height: image.height, alphaPresent: image.alphaPresent,
      image: {
        pixelLayout: image.pixelLayout, colorSpace: image.colorSpace, orientation: image.orientation,
        alphaMode: image.alphaMode, metadataPolicy: image.metadataPolicy, pngFilterPolicy: image.pngFilterPolicy,
        interlace: image.interlace, animation: image.animation,
      },
    },
    normalizedBytes: material.bytes, rgba: material.rgba,
  };
}

function monotonicClock(clock, notBefore, code) {
  const value = clock();
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
    || Date.parse(value) < Date.parse(notBefore)) fail(code, "clock is not canonical monotonic UTC");
  return value;
}

export function createSlice06AttemptExecutor({ context, adapter, clock = () => new Date().toISOString(), loadMaterial = loadSourceMaterial } = {}) {
  if (!context?.operations || !adapter || typeof clock !== "function" || typeof loadMaterial !== "function") {
    fail("S06_EXECUTOR_CONFIGURATION_INVALID", "execution dependencies are incomplete");
  }
  const sourceById = new Map([...context.operations.values()].flatMap(({ sources }) => sources.map((source) => [source.record.sourceId, source])));
  return async ({ request }) => {
    const source = sourceById.get(request.attempt.sourceId);
    if (!source || source.record.operation !== request.operation) fail("S06_SOURCE_BINDING_INVALID", "request source is not registered in the current definition");
    const material = await loadMaterial(context, source);
    const response = request.operation === "normalize"
      ? await adapter.normalize(adapterRequest(request, material))
      : await adapter.exportPng(adapterRequest(request, material));
    const producedAt = monotonicClock(clock, response.workerObservation.parentWall.finishedAt, "S06_DIAGNOSTIC_TIME_INVALID");
    const requestRef = { id: request.requestId, contentHash: request.contentHash };
    const rights = projectRights(context, source);
    const retention = projectRetention(context, source);
    const strictDecision = response.verification.overallStatus;
    const outputObservation = buildCandidateOutputObservationSlice06({
      operation: request.operation, strictDecision, requestRef, attempt: request.attempt,
      candidateRef: shortRef(request.candidateRef), adapterRef: request.adapterRef, workerRef: request.workerRef,
      runtimeRef: shortRef(request.runtimeAttestationRef), hardwareRef: shortRef(request.hardwareRef), rights, retention,
      bytes: response.outputBytes, producedAt,
    });
    const observedAt = monotonicClock(clock, producedAt, "S06_DIAGNOSTIC_TIME_INVALID");
    const oracleDiagnostic = buildOracleDiagnosticSlice06({
      requestRef, attempt: request.attempt, oracleRef: request.oracleRef, candidateOutputObservation: outputObservation,
      verification: response.verification, observedAt,
    });
    const createdAt = monotonicClock(clock, observedAt, "S06_DIAGNOSTIC_TIME_INVALID");
    const diagnosticEnvelope = buildDiagnosticEnvelopeSlice06({
      operation: request.operation, requestRef, attempt: request.attempt,
      outcomeClass: strictDecision === "pass" ? "oracle-pass" : "oracle-nonpass",
      primaryCode: response.verification.primaryCode,
      secondaryCodes: response.verification.findings.map(({ code }) => code)
        .filter((code) => code !== response.verification.primaryCode).filter((code, index, values) => values.indexOf(code) === index).sort(compareText),
      candidateOutputObservation: outputObservation, oracleDiagnostic, worker: response.workerObservation,
      rights, retention,
      publication: { state: "not-published", transactionId: null, publishedAt: null, fileRoles: [] },
      cleanup: { state: "unknown", stagingRemoved: null, confirmedAt: null }, createdAt,
    });
    return Object.freeze({
      ...response, strictDecision, outputObservation, oracleDiagnostic, diagnosticEnvelope,
      workerObservation: response.workerObservation,
    });
  };
}

async function createResultsRootExclusive(resultsRoot) {
  const parent = path.dirname(resultsRoot);
  await mkdir(parent, { recursive: true });
  try { await mkdir(resultsRoot); } catch (cause) {
    if (cause?.code === "EEXIST") fail("S06_RESULTS_ALREADY_EXIST", "canonical diagnostic results root already exists; replay/retry is forbidden", { cause });
    throw cause;
  }
}

async function atomicWriteJsonNew(filename, value) {
  const bytes = Buffer.from(stableStringifySlice06(value), "utf8");
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  const handle = await open(temporary, "wx");
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  try {
    await link(temporary, filename);
    await syncDirectoryBestEffort(path.dirname(filename));
  } finally { await unlink(temporary).catch(() => {}); }
  return { bytes, fileSha256: sha256Slice06(bytes) };
}

async function syncDirectoryBestEffort(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (!new Set(["EINVAL", "EISDIR", "EPERM", "ENOTSUP", "EBADF"]).has(error?.code)) throw error;
  } finally { await handle?.close().catch(() => {}); }
}

function operationFilePaths(operation, requests, run) {
  const files = new Set([
    `runs/${operation}.registered-run.json`, `ledger/${operation}.ndjson`, run.summaryRelativePath,
  ]);
  for (const request of requests) {
    const keyHash = sha256Slice06(Buffer.from(request.attempt.idempotencyKey, "utf8"));
    files.add(`requests/${keyHash}.request.json`); files.add(`claims/${keyHash}.claim.json`);
  }
  run.terminalResults.forEach((result, index) => {
    files.add(run.terminalPaths[index]);
    for (const relativePath of Object.values(result.publication?.rolePaths ?? {})) files.add(relativePath);
    if (result.workerFailureEnvelopeRef) {
      const root = path.posix.dirname(result.workerFailureEnvelopeRef.relativePath);
      files.add(`${root}/worker-observation.json`); files.add(`${root}/worker-failure-envelope.json`); files.add(`${root}/terminal-result.json`);
    }
  });
  return [...files].sort(compareText);
}

async function resultTreeForFiles(resultsRoot, files) {
  const digest = createHash("sha256");
  let totalBytes = 0;
  for (const relativePath of [...files].sort(compareText)) {
    assertSafeRelative(relativePath, "S06_RESULT_TREE_INVALID", "result path");
    const filename = await assertRegularFileNoLinks(resultsRoot, relativePath, "S06_RESULT_TREE_INVALID");
    const bytes = await readFile(filename);
    const hash = sha256Slice06(bytes);
    totalBytes += bytes.byteLength;
    digest.update(Buffer.from(relativePath, "utf8")); digest.update(NUL);
    digest.update(Buffer.from(String(bytes.byteLength), "ascii")); digest.update(NUL);
    digest.update(Buffer.from(hash, "ascii")); digest.update(NUL);
  }
  return { fileCount: files.length, totalBytes, sha256: digest.digest("hex") };
}

async function finalizeOperation({ resultsRoot, context, operation, requests, run, clock }) {
  const files = operationFilePaths(operation, requests, run);
  const resultTree = await resultTreeForFiles(resultsRoot, files);
  const summaryPath = run.summaryRelativePath;
  const summaryBytes = await readFile(path.join(resultsRoot, ...summaryPath.split("/")));
  if (sha256Slice06(summaryBytes) !== sha256Slice06(Buffer.from(stableStringifySlice06(run.summary), "utf8"))) {
    fail("S06_SUMMARY_CLOSURE_INVALID", `${operation} summary bytes differ from runner result`);
  }
  const summaryRef = {
    id: run.summary.summaryId, contentHash: run.summary.contentHash, path: summaryPath,
    byteLength: summaryBytes.byteLength, fileSha256: sha256Slice06(summaryBytes),
  };
  const closedAt = monotonicClock(clock, run.summary.finishedAt, "S06_CHARACTERIZATION_CLOSE_INVALID");
  const close = buildSlice06CharacterizationClose({
    operation, definitionRef: runnerRecordRef(context.definitionRef), summary: run.summary, summaryRef, resultTree, closedAt,
  });
  const closeRelativePath = `closes/${operation}.characterization-close.slice06.v0.json`;
  await atomicWriteJsonNew(path.join(resultsRoot, ...closeRelativePath.split("/")), close);
  return Object.freeze({ close, closeRelativePath, operationFiles: files });
}

async function listRegularFiles(root) {
  const files = [];
  const directories = [];
  async function visit(directory, relativeBase) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
      const relative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
      const filename = path.join(directory, entry.name);
      const info = await lstat(filename);
      if (info.isSymbolicLink()) fail("S06_RESULT_TREE_INVALID", `symlink in results: ${relative}`);
      if (info.isDirectory()) { directories.push(relative); await visit(filename, relative); }
      else if (info.isFile()) files.push(relative);
      else fail("S06_RESULT_TREE_INVALID", `non-regular result entry: ${relative}`);
    }
  }
  await visit(root, "");
  return { files: files.sort(compareText), directories: directories.sort(compareText) };
}

async function cleanupEmptyStaging(resultsRoot) {
  const staging = path.join(resultsRoot, ".staging");
  if (!await pathExists(staging)) return;
  try { await rmdir(staging); } catch (cause) {
    fail("S06_STAGING_NOT_QUIESCENT", "staging is not empty after the single invocation; retry/cleanup is forbidden", { cause });
  }
}

async function verifySessionClosure(resultsRoot, finalized) {
  const expected = new Set(finalized.flatMap(({ operationFiles, closeRelativePath }) => [...operationFiles, closeRelativePath]));
  const tree = await listRegularFiles(resultsRoot);
  if (tree.files.length !== expected.size || tree.files.some((relativePath) => !expected.has(relativePath))) {
    fail("S06_RESULT_TREE_INVALID", "result tree contains missing, cross-run, replayed or unregistered files");
  }
  const expectedDirectories = new Set();
  for (const relativePath of expected) {
    const segments = relativePath.split("/").slice(0, -1);
    for (let length = 1; length <= segments.length; length += 1) expectedDirectories.add(segments.slice(0, length).join("/"));
  }
  if (tree.directories.length !== expectedDirectories.size
    || tree.directories.some((relativePath) => !expectedDirectories.has(relativePath))) {
    fail("S06_RESULT_TREE_INVALID", "result tree contains an empty, staging or unregistered directory");
  }
  const forbidden = [...tree.files, ...tree.directories].find((relativePath) => /(?:^|\/)(?:artifacts|calibration|formal|holdout|defect-holdout|escape)(?:\/|$)/u.test(relativePath));
  if (forbidden) fail("S06_RESULT_PATH_FORBIDDEN", `forbidden result path: ${forbidden}`);
  return tree;
}

function defaultDependencies() {
  return {
    assertCanonicalPaths: ({ projectRoot, sliceRoot, resultsRoot, repositoryRoot }) => {
      if (path.resolve(projectRoot) !== SLICE06_PROJECT_ROOT || path.resolve(sliceRoot) !== SLICE06_DEFINITION_ROOT
        || path.resolve(resultsRoot) !== SLICE06_RESULTS_ROOT || path.resolve(repositoryRoot) !== SLICE06_REPOSITORY_ROOT) {
        fail("S06_CANONICAL_PATH_REQUIRED", "registered execution accepts only canonical project, definition, repository and results roots");
      }
    },
    assertDefinition: centralValidator.assertSlice06Definition,
    validateAdmission: centralValidator.validateSlice06ExecutionAdmission,
    collectGitState: collectSlice06GitState,
    loadContext: loadSlice06ExecutionContext,
    claimResultsRoot: createResultsRootExclusive,
    createRunner: ({ resultsRoot, clock }) => createSlice06DiagnosticRunner({
      resultsRoot, clock,
      validators: {
        validateOutputObservation: validateCandidateOutputObservationSlice06,
        validateOracleDiagnostic: validateOracleDiagnosticSlice06,
        validateDiagnosticEnvelope: validateDiagnosticEnvelopeSlice06,
      },
    }),
    createAdapter: ({ context }) => createSlice06DiagnosticAdapter({
      verifyOutput: verifyOutputBytesSlice06, expectedRuntime: expectedWorkerRuntime(context.runtime.record),
    }),
    createAttemptExecutor: createSlice06AttemptExecutor,
    cleanupStaging: cleanupEmptyStaging,
    finalizeOperation,
    verifySessionClosure,
  };
}

/**
 * The only production entry point. One invocation plans both operations, but
 * a non-complete normalize close globally stops export registration. There is
 * deliberately no operation selector, replay, retry or replacement.
 */
export async function runSlice06RegisteredDiagnostic({
  projectRoot = SLICE06_PROJECT_ROOT,
  sliceRoot = SLICE06_DEFINITION_ROOT,
  resultsRoot = SLICE06_RESULTS_ROOT,
  repositoryRoot = SLICE06_REPOSITORY_ROOT,
  clock = () => new Date().toISOString(),
  dependencies = {},
} = {}) {
  const deps = { ...defaultDependencies(), ...dependencies };
  for (const name of ["assertCanonicalPaths", "assertDefinition", "validateAdmission", "collectGitState", "loadContext", "claimResultsRoot", "createRunner", "createAdapter", "createAttemptExecutor", "cleanupStaging", "finalizeOperation", "verifySessionClosure"]) {
    if (typeof deps[name] !== "function") fail("S06_DRIVER_CONFIGURATION_INVALID", `${name} dependency missing`);
  }
  const canonicalProject = path.resolve(projectRoot);
  const canonicalSlice = path.resolve(sliceRoot);
  const canonicalResults = path.resolve(resultsRoot);
  await deps.assertCanonicalPaths({ projectRoot: canonicalProject, sliceRoot: canonicalSlice, resultsRoot: canonicalResults, repositoryRoot: path.resolve(repositoryRoot) });
  const definitionReport = await deps.assertDefinition({
    projectRoot: canonicalProject, sliceRoot: canonicalSlice, requirePins: true, recheckRuntime: true,
    regenerate: true,
  });
  const gitState = await deps.collectGitState({ repositoryRoot, definitionIndex: SLICE06_DEFINITION_INDEX });
  const admission = await deps.validateAdmission({ definitionReport, gitState });
  if (admission !== true && admission?.valid !== true) fail("S06_EXECUTION_ADMISSION_DENIED", "central validator denied exact frozen/pushed results-zero admission");
  const context = await deps.loadContext({ projectRoot: canonicalProject, sliceRoot: canonicalSlice, definitionReport });
  if (await pathExists(canonicalResults)) fail("S06_RESULTS_ALREADY_EXIST", "partial/complete Slice 06 results already exist; replay is forbidden");
  await deps.claimResultsRoot(canonicalResults);
  const adapter = await deps.createAdapter({ context });
  const execute = await deps.createAttemptExecutor({ context, adapter, clock });
  const runner = await deps.createRunner({ resultsRoot: canonicalResults, clock });
  const operationRuns = [];
  for (const operation of OPERATIONS) {
    const requests = buildSlice06RegisteredRequests({ context, operation, clock });
    const run = await runner.runOperation({ operation, requests, execute });
    operationRuns.push({ operation, requests, run });
    if (!new Set(["characterization-complete", "protocol-failed", "inconclusive"]).has(run.summary?.overallStatus)) {
      fail("S06_OPERATION_SUMMARY_INVALID", `${operation} returned an unknown terminal summary status`);
    }
    if (run.summary.overallStatus !== "characterization-complete") break;
  }
  await deps.cleanupStaging(canonicalResults);
  const finalized = [];
  for (const item of operationRuns) finalized.push(await deps.finalizeOperation({
    resultsRoot: canonicalResults, context, clock, ...item,
  }));
  await deps.verifySessionClosure(canonicalResults, finalized);
  const statuses = operationRuns.map(({ operation, run }) => ({ operation, status: run.summary.overallStatus, summaryContentHash: run.summary.contentHash }));
  const status = statuses.some((entry) => entry.status === "protocol-failed") ? "protocol-failed"
    : statuses.some((entry) => entry.status === "inconclusive") ? "inconclusive" : "characterization-complete";
  const actualRegisteredSourceUnits = operationRuns.reduce((total, { requests }) => (
    total + new Set(requests.map(({ attempt }) => attempt.sourceId)).size
  ), 0);
  const actualRegisteredAttempts = operationRuns.reduce((total, { requests }) => total + requests.length, 0);
  return Object.freeze({
    mode: "open-diagnostic", status, invocationCount: 1, maximumDriverInvocations: 1,
    plannedRegisteredOperationRuns: 2, actualRegisteredOperationRuns: operationRuns.length,
    plannedSourceUnits: 8, actualRegisteredSourceUnits,
    plannedAttempts: 24, actualRegisteredAttempts,
    replacementAttempts: 0, operations: statuses, resultsRoot: canonicalResults,
    gateBDecisionAuthority: false, calibrationAuthorized: false, productSupport: false,
    evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  });
}

async function main() {
  try {
    parseSlice06ExecutionCli(process.argv.slice(2));
    const result = await runSlice06RegisteredDiagnostic();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === "characterization-complete" ? 0 : 2;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ code: error?.code ?? "S06_EXECUTION_UNEXPECTED", message: error?.message ?? String(error) })}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
