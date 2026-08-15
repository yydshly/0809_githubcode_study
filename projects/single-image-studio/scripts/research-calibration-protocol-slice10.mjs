import { createHash } from "node:crypto";

export const SLICE10_PROTOCOL_VERSION = "0.10.0";
export const SLICE10_SLICE09_RESULT_COMMIT = "c91014c6bef8878277a8520d003b10684972087b";
export const SLICE10_SLICE09_RESULT_TREE_SHA256 = "2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451";

const SHA_RE = /^[0-9a-f]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,159}$/u;
const OPERATIONS = new Set(["normalize", "export"]);
const PARTITIONS = new Set(["dev/calibration", "defect/calibration"]);
const DISPOSITIONS = new Set(["applicable", "rejection"]);
const TERMINAL_STATUSES = new Set(["pass", "non-pass", "protocol-failed", "inconclusive"]);

export const SLICE10_EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0,
  e1: 0,
  formalEvidence: false,
  g1: 0,
  o1: 0,
  productSupport: false,
  r1Pipeline: 0,
  r1ProductRelease: 0,
  r1ProductValidation: 0,
  releaseAllowlist: "none",
  releaseApproved: 0,
  releaseRegistered: 0,
  u1: 0,
  v1: 0,
});

export class Slice10ProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Slice10ProtocolError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Slice10ProtocolError(code, message);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, code, label) {
  if (!plain(value)) fail(code, `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${label} keys are not exact`);
  }
}

function sha(value, code, label) {
  if (typeof value !== "string" || !SHA_RE.test(value)) fail(code, `${label} must be lowercase SHA-256`);
}

function id(value, code, label) {
  if (typeof value !== "string" || !ID_RE.test(value)) fail(code, `${label} is invalid`);
}

function utc(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || new Date(value).toISOString() !== value) fail(code, `${label} must be exact millisecond UTC`);
}

export function stableStringifySlice10(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringifySlice10).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringifySlice10(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Slice10(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHashSlice10(record) {
  const clone = structuredClone(record);
  delete clone.contentHash;
  return sha256Slice10(Buffer.from(stableStringifySlice10(clone)));
}

function withHash(record) {
  return Object.freeze({ ...record, contentHash: contentHashSlice10(record) });
}

function evidence(value, code) {
  exactKeys(value, Object.keys(SLICE10_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice10(value) !== stableStringifySlice10(SLICE10_EVIDENCE_BOUNDARY)) {
    fail(code, "evidence boundary cannot be promoted");
  }
}

const REF_KEYS = ["byteLength", "contentHash", "fileSha256", "id", "path"];

function recordRef(value, code, label) {
  exactKeys(value, REF_KEYS, code, label);
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 2) fail(code, `${label}.byteLength invalid`);
  sha(value.contentHash, code, `${label}.contentHash`);
  sha(value.fileSha256, code, `${label}.fileSha256`);
  id(value.id, code, `${label}.id`);
  if (typeof value.path !== "string" || value.path.length < 3 || value.path.includes("\\")
    || value.path.startsWith("/") || value.path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail(code, `${label}.path invalid`);
  }
}

function implementationRef(value, code, label) {
  exactKeys(value, ["id", "implementationSha256", "path", "version"], code, label);
  id(value.id, code, `${label}.id`);
  sha(value.implementationSha256, code, `${label}.implementationSha256`);
  if (value.version !== SLICE10_PROTOCOL_VERSION || typeof value.path !== "string" || !value.path.startsWith("scripts/")) {
    fail(code, `${label} version/path invalid`);
  }
}

function validateSelfHash(record, code) {
  sha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice10(record)) fail(code, "contentHash mismatch");
}

const ADMISSION_KEYS = [
  "admissionId", "admittedAt", "candidateRef", "contentHash", "contractRef", "decision",
  "definitionRef", "evidenceBoundary", "manifestRefs", "operation", "preregistrationRef",
  "runtimeStartRef", "schemaVersion", "slice09DecisionRef", "slice09GateBPassed",
  "slice09ResultCommit", "slice09ResultTreeSha256", "slice09SummaryRef",
];

export function validateSlice10CalibrationAdmission(record) {
  const code = "S10_CALIBRATION_ADMISSION_INVALID";
  exactKeys(record, ADMISSION_KEYS, code, "admission");
  if (record.schemaVersion !== "calibration-admission.slice10.v0" || !OPERATIONS.has(record.operation)
    || record.decision !== "admitted-open-calibration" || record.slice09GateBPassed !== true
    || record.slice09ResultCommit !== SLICE10_SLICE09_RESULT_COMMIT
    || record.slice09ResultTreeSha256 !== SLICE10_SLICE09_RESULT_TREE_SHA256) {
    fail(code, "admission state or immutable Slice 09 lineage invalid");
  }
  id(record.admissionId, code, "admissionId");
  utc(record.admittedAt, code, "admittedAt");
  for (const key of ["candidateRef", "contractRef", "definitionRef", "preregistrationRef", "runtimeStartRef", "slice09DecisionRef", "slice09SummaryRef"]) {
    recordRef(record[key], code, key);
  }
  if (!Array.isArray(record.manifestRefs) || record.manifestRefs.length !== 2) fail(code, "exactly two manifests required");
  record.manifestRefs.forEach((ref, index) => recordRef(ref, code, `manifestRefs[${index}]`));
  if (new Set(record.manifestRefs.map(({ contentHash }) => contentHash)).size !== 2) fail(code, "manifest refs must be unique");
  if (record.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.10.0"
    || record.contractRef.id !== `CC-CAP02-${record.operation.toUpperCase()}-PNG@0.10.0`
    || record.preregistrationRef.id !== `PREREG-OPEN-CALIBRATION-${record.operation.toUpperCase()}-PNG@0.10.0`) {
    fail(code, "admission uses wrong Slice 10 identities");
  }
  evidence(record.evidenceBoundary, code);
  validateSelfHash(record, code);
  return record;
}

export function createSlice10CalibrationAdmission(fields) {
  return validateSlice10CalibrationAdmission(withHash({
    schemaVersion: "calibration-admission.slice10.v0",
    ...structuredClone(fields),
    slice09GateBPassed: true,
    slice09ResultCommit: SLICE10_SLICE09_RESULT_COMMIT,
    slice09ResultTreeSha256: SLICE10_SLICE09_RESULT_TREE_SHA256,
    decision: "admitted-open-calibration",
    evidenceBoundary: structuredClone(SLICE10_EVIDENCE_BOUNDARY),
  }));
}

const REQUEST_KEYS = [
  "admissionRef", "attempt", "candidateRef", "contentHash", "contractRef", "createdAt",
  "disposition", "evidenceBoundary", "expectedStableErrorCode", "goldIdentityRef", "idempotencyKey",
  "manifestRef", "operation", "requestId", "runtimeRef", "schemaVersion", "sourceRef", "workerRef",
];

function attempt(value, code) {
  exactKeys(value, ["attemptNumber", "partition", "repetition", "sourceId"], code, "attempt");
  id(value.sourceId, code, "attempt.sourceId");
  if (!PARTITIONS.has(value.partition) || ![1, 2, 3].includes(value.repetition) || value.attemptNumber !== 1) {
    fail(code, "attempt must be one frozen repetition with zero replacement");
  }
}

export function validateSlice10CalibrationRequest(record) {
  const code = "S10_CALIBRATION_REQUEST_INVALID";
  exactKeys(record, REQUEST_KEYS, code, "request");
  if (record.schemaVersion !== "calibration-request.slice10.v0" || !OPERATIONS.has(record.operation)
    || !DISPOSITIONS.has(record.disposition)) fail(code, "request operation/disposition invalid");
  id(record.requestId, code, "requestId");
  sha(record.idempotencyKey, code, "idempotencyKey");
  utc(record.createdAt, code, "createdAt");
  attempt(record.attempt, code);
  if (record.attempt.sourceId !== record.sourceRef.id) fail(code, "attempt/source identity mismatch");
  for (const key of ["admissionRef", "candidateRef", "contractRef", "manifestRef", "runtimeRef", "sourceRef"]) {
    recordRef(record[key], code, key);
  }
  implementationRef(record.workerRef, code, "workerRef");
  if (record.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.10.0"
    || record.contractRef.id !== `CC-CAP02-${record.operation.toUpperCase()}-PNG@0.10.0`) {
    fail(code, "request candidate/contract mismatch");
  }
  const applicable = record.disposition === "applicable";
  if (applicable !== (record.goldIdentityRef !== null)) fail(code, "gold identity presence differs from disposition");
  if (applicable) {
    recordRef(record.goldIdentityRef, code, "goldIdentityRef");
    if (record.expectedStableErrorCode !== null) fail(code, "applicable request cannot expect an error");
  } else if (typeof record.expectedStableErrorCode !== "string" || !/^S10_[A-Z0-9_]+$/u.test(record.expectedStableErrorCode)) {
    fail(code, "rejection request requires an exact S10 error code");
  }
  evidence(record.evidenceBoundary, code);
  validateSelfHash(record, code);
  return record;
}

export function createSlice10CalibrationRequest(fields) {
  return validateSlice10CalibrationRequest(withHash({
    schemaVersion: "calibration-request.slice10.v0",
    ...structuredClone(fields),
    evidenceBoundary: structuredClone(SLICE10_EVIDENCE_BOUNDARY),
  }));
}

const TERMINAL_KEYS = [
  "actualStableErrorCode", "artifactRef", "contentHash", "disposition", "evidenceBoundary", "finishedAt",
  "operation", "oracleRef", "reasonCode", "requestRef", "schemaVersion", "startedAt", "status", "terminalId",
  "workerExitConfirmed", "workerInvoked",
];

export function validateSlice10CalibrationTerminal(record) {
  const code = "S10_CALIBRATION_TERMINAL_INVALID";
  exactKeys(record, TERMINAL_KEYS, code, "terminal");
  if (record.schemaVersion !== "calibration-terminal.slice10.v0" || !OPERATIONS.has(record.operation)
    || !DISPOSITIONS.has(record.disposition) || !TERMINAL_STATUSES.has(record.status)) {
    fail(code, "terminal operation/disposition/status invalid");
  }
  id(record.terminalId, code, "terminalId");
  recordRef(record.requestRef, code, "requestRef");
  utc(record.startedAt, code, "startedAt");
  utc(record.finishedAt, code, "finishedAt");
  if (Date.parse(record.startedAt) > Date.parse(record.finishedAt)) fail(code, "terminal time order invalid");
  if (typeof record.workerInvoked !== "boolean" || ![true, false, null].includes(record.workerExitConfirmed)) {
    fail(code, "worker lifecycle fields invalid");
  }
  const applicablePass = record.disposition === "applicable" && record.status === "pass";
  const rejectionPass = record.disposition === "rejection" && record.status === "pass";
  if (applicablePass) {
    if (!record.workerInvoked || record.workerExitConfirmed !== true || record.actualStableErrorCode !== null
      || record.reasonCode !== null || record.artifactRef === null || record.oracleRef === null) {
      fail(code, "applicable pass requires a confirmed artifact/oracle closure");
    }
    recordRef(record.artifactRef, code, "artifactRef");
    recordRef(record.oracleRef, code, "oracleRef");
  } else if (rejectionPass) {
    if (record.workerInvoked || record.workerExitConfirmed !== null || typeof record.actualStableErrorCode !== "string"
      || !/^S10_[A-Z0-9_]+$/u.test(record.actualStableErrorCode) || record.reasonCode !== null
      || record.artifactRef !== null || record.oracleRef !== null) {
      fail(code, "rejection pass must be worker-free exact classification");
    }
  } else {
    if (typeof record.reasonCode !== "string" || !/^S10_[A-Z0-9_]+$/u.test(record.reasonCode)
      || record.artifactRef !== null || record.oracleRef !== null) {
      fail(code, "non-pass terminal requires an exact reason and no artifact publication");
    }
    if (record.actualStableErrorCode !== null && (typeof record.actualStableErrorCode !== "string"
      || !/^S10_[A-Z0-9_]+$/u.test(record.actualStableErrorCode))) fail(code, "actual error code invalid");
  }
  evidence(record.evidenceBoundary, code);
  validateSelfHash(record, code);
  return record;
}

export function createSlice10CalibrationTerminal(fields) {
  return validateSlice10CalibrationTerminal(withHash({
    schemaVersion: "calibration-terminal.slice10.v0",
    ...structuredClone(fields),
    evidenceBoundary: structuredClone(SLICE10_EVIDENCE_BOUNDARY),
  }));
}

const SUMMARY_KEYS = [
  "admissionRef", "allApplicableSourcesDeterministic", "allRegisteredAttemptsPass", "allRegisteredAttemptsTerminal",
  "caseResults", "contentHash", "evidenceBoundary", "finishedAt", "manifestResults", "missingAttemptCount",
  "nonPassAttemptCount", "operation", "overallStatus", "passAttemptCount", "preregistrationRef",
  "recordedAttemptCount", "registeredAttemptCount", "registeredSourceCount", "replacementAttemptCount",
  "runtimeEndRef", "runtimeStableBeforeAndAfter", "schemaVersion", "startedAt", "summaryId",
  "terminalRefs", "unregisteredTerminalCount",
];

export function buildSlice10CalibrationSummary({
  operation, admissionRef, preregistrationRef, runtimeEndRef, registeredCases, terminals,
  runtimeStableBeforeAndAfter, startedAt, finishedAt,
}) {
  const code = "S10_CALIBRATION_SUMMARY_INVALID";
  if (!OPERATIONS.has(operation) || !Array.isArray(registeredCases) || registeredCases.length !== 48
    || !Array.isArray(terminals)) fail(code, "summary requires one operation and 48 registered cases");
  for (const [label, ref] of Object.entries({ admissionRef, preregistrationRef, runtimeEndRef })) recordRef(ref, code, label);
  utc(startedAt, code, "startedAt");
  utc(finishedAt, code, "finishedAt");
  if (Date.parse(startedAt) > Date.parse(finishedAt) || runtimeStableBeforeAndAfter !== true) {
    fail(code, "summary requires stable runtime and valid time order");
  }
  const sourceIds = new Set();
  const registered = new Map();
  const partitionCounts = new Map([["dev/calibration", 0], ["defect/calibration", 0]]);
  for (const item of registeredCases) {
    exactKeys(item, ["disposition", "expectedStableErrorCode", "manifestContentHash", "partition", "sourceId"], code, "registeredCase");
    id(item.sourceId, code, "registeredCase.sourceId");
    sha(item.manifestContentHash, code, "registeredCase.manifestContentHash");
    if (sourceIds.has(item.sourceId) || !PARTITIONS.has(item.partition) || !DISPOSITIONS.has(item.disposition)) {
      fail(code, "registered cases must use unique sources and known partitions");
    }
    if ((item.disposition === "applicable") !== (item.expectedStableErrorCode === null)) {
      fail(code, "registered disposition/error mismatch");
    }
    if (item.expectedStableErrorCode !== null && !/^S10_[A-Z0-9_]+$/u.test(item.expectedStableErrorCode)) {
      fail(code, "registered rejection code invalid");
    }
    sourceIds.add(item.sourceId);
    registered.set(item.sourceId, item);
    partitionCounts.set(item.partition, partitionCounts.get(item.partition) + 1);
  }
  if (partitionCounts.get("dev/calibration") !== 30 || partitionCounts.get("defect/calibration") !== 18) {
    fail(code, "registered partition denominator must remain 30+18");
  }
  const seenSlots = new Set();
  const terminalBySource = new Map([...sourceIds].map((sourceId) => [sourceId, []]));
  const terminalRecords = [];
  for (const terminalInput of terminals) {
    exactKeys(terminalInput, ["request", "terminal"], code, "terminalInput");
    const { request, terminal } = terminalInput;
    validateSlice10CalibrationTerminal(terminal);
    terminalRecords.push(terminal);
    if (terminal.operation !== operation) fail(code, "cross-operation terminal is forbidden");
    validateSlice10CalibrationRequest(request);
    if (request.operation !== operation || terminal.requestRef.contentHash !== request.contentHash
      || terminal.requestRef.id !== request.requestId || terminal.disposition !== request.disposition) {
      fail(code, "terminal/request binding mismatch");
    }
    const expected = registered.get(request.attempt.sourceId);
    if (!expected || request.attempt.partition !== expected.partition || request.disposition !== expected.disposition
      || request.expectedStableErrorCode !== expected.expectedStableErrorCode
      || request.manifestRef.contentHash !== expected.manifestContentHash) {
      fail(code, "terminal differs from registered source profile");
    }
    const slot = `${request.attempt.sourceId}:${request.attempt.repetition}`;
    if (seenSlots.has(slot) || request.attempt.attemptNumber !== 1) fail(code, "duplicate/replacement attempt forbidden");
    seenSlots.add(slot);
    terminalBySource.get(request.attempt.sourceId).push({ terminal, request });
  }
  if (terminalRecords.length !== 144 || seenSlots.size !== 144) fail(code, "exactly 144 unique terminal slots required");
  const caseResults = [];
  let allApplicableSourcesDeterministic = true;
  for (const registeredCase of registeredCases) {
    const rows = terminalBySource.get(registeredCase.sourceId).sort((a, b) => a.request.attempt.repetition - b.request.attempt.repetition);
    if (rows.length !== 3 || rows.some((row, index) => row.request.attempt.repetition !== index + 1)) {
      fail(code, "every source requires repetitions 1,2,3");
    }
    const exactRejection = registeredCase.disposition === "rejection"
      && rows.every(({ terminal }) => terminal.status === "pass"
        && terminal.actualStableErrorCode === registeredCase.expectedStableErrorCode);
    const applicablePass = registeredCase.disposition === "applicable"
      && rows.every(({ terminal }) => terminal.status === "pass");
    let deterministic = true;
    if (registeredCase.disposition === "applicable") {
      const fileHashes = rows.map(({ terminal }) => terminal.artifactRef?.fileSha256 ?? null);
      const pixelHashes = rows.map(({ terminal }) => terminal.oracleRef?.contentHash ?? null);
      deterministic = new Set(fileHashes).size === 1 && fileHashes[0] !== null
        && new Set(pixelHashes).size === 1 && pixelHashes[0] !== null;
      allApplicableSourcesDeterministic &&= deterministic;
    }
    caseResults.push({
      sourceId: registeredCase.sourceId,
      partition: registeredCase.partition,
      disposition: registeredCase.disposition,
      terminalRefs: rows.map(({ terminal }) => ({ id: terminal.terminalId, contentHash: terminal.contentHash })),
      allThreeTerminal: true,
      allThreePass: applicablePass || exactRejection,
      deterministic,
    });
  }
  const passAttemptCount = terminalRecords.filter(({ status }) => status === "pass").length;
  const allRegisteredAttemptsPass = passAttemptCount === 144 && caseResults.every(({ allThreePass }) => allThreePass);
  const overallStatus = allRegisteredAttemptsPass && allApplicableSourcesDeterministic ? "calibration-complete-pass" : "calibration-complete-non-pass";
  const manifestResults = [...partitionCounts].map(([partition, sourceCount]) => ({
    partition, sourceCount, attemptCount: sourceCount * 3,
    pass: caseResults.filter((entry) => entry.partition === partition).every(({ allThreePass }) => allThreePass),
  }));
  const cleanTerminals = terminalRecords.map((terminal) => structuredClone(terminal));
  return validateSlice10CalibrationSummary(withHash({
    schemaVersion: "calibration-summary.slice10.v0",
    summaryId: `calibration-summary.${operation}.${admissionRef.contentHash.slice(0, 16)}`,
    operation,
    admissionRef: structuredClone(admissionRef),
    preregistrationRef: structuredClone(preregistrationRef),
    runtimeEndRef: structuredClone(runtimeEndRef),
    registeredSourceCount: 48,
    registeredAttemptCount: 144,
    recordedAttemptCount: 144,
    replacementAttemptCount: 0,
    passAttemptCount,
    nonPassAttemptCount: 144 - passAttemptCount,
    missingAttemptCount: 0,
    unregisteredTerminalCount: 0,
    allRegisteredAttemptsTerminal: true,
    allRegisteredAttemptsPass,
    allApplicableSourcesDeterministic,
    runtimeStableBeforeAndAfter: true,
    caseResults,
    manifestResults,
    terminalRefs: cleanTerminals.map((terminal) => ({ id: terminal.terminalId, contentHash: terminal.contentHash })),
    overallStatus,
    startedAt,
    finishedAt,
    evidenceBoundary: structuredClone(SLICE10_EVIDENCE_BOUNDARY),
  }));
}

export function validateSlice10CalibrationSummary(record) {
  const code = "S10_CALIBRATION_SUMMARY_INVALID";
  exactKeys(record, SUMMARY_KEYS, code, "summary");
  if (record.schemaVersion !== "calibration-summary.slice10.v0" || !OPERATIONS.has(record.operation)
    || !["calibration-complete-pass", "calibration-complete-non-pass"].includes(record.overallStatus)) {
    fail(code, "summary identity/status invalid");
  }
  id(record.summaryId, code, "summaryId");
  for (const key of ["admissionRef", "preregistrationRef", "runtimeEndRef"]) recordRef(record[key], code, key);
  for (const [key, expected] of Object.entries({
    registeredSourceCount: 48, registeredAttemptCount: 144, recordedAttemptCount: 144,
    replacementAttemptCount: 0, missingAttemptCount: 0, unregisteredTerminalCount: 0,
  })) if (record[key] !== expected) fail(code, `${key} denominator drift`);
  if (!Number.isSafeInteger(record.passAttemptCount) || !Number.isSafeInteger(record.nonPassAttemptCount)
    || record.passAttemptCount < 0 || record.nonPassAttemptCount < 0
    || record.passAttemptCount + record.nonPassAttemptCount !== 144) fail(code, "pass counters invalid");
  if (record.allRegisteredAttemptsTerminal !== true || record.runtimeStableBeforeAndAfter !== true
    || !Array.isArray(record.caseResults) || record.caseResults.length !== 48
    || !Array.isArray(record.terminalRefs) || record.terminalRefs.length !== 144
    || !Array.isArray(record.manifestResults) || record.manifestResults.length !== 2) {
    fail(code, "summary closure incomplete");
  }
  const terminalHashes = new Set();
  for (const ref of record.terminalRefs) {
    exactKeys(ref, ["contentHash", "id"], code, "terminalRef");
    id(ref.id, code, "terminalRef.id");
    sha(ref.contentHash, code, "terminalRef.contentHash");
    if (terminalHashes.has(ref.contentHash)) fail(code, "terminal refs must be unique");
    terminalHashes.add(ref.contentHash);
  }
  const caseSources = new Set();
  const caseTerminalHashes = new Set();
  let derivedAllPass = true;
  let derivedApplicableDeterministic = true;
  const derivedPartitionCounts = new Map([["dev/calibration", 0], ["defect/calibration", 0]]);
  for (const item of record.caseResults) {
    exactKeys(item, ["allThreePass", "allThreeTerminal", "deterministic", "disposition", "partition", "sourceId", "terminalRefs"], code, "caseResult");
    id(item.sourceId, code, "caseResult.sourceId");
    if (caseSources.has(item.sourceId) || !PARTITIONS.has(item.partition) || !DISPOSITIONS.has(item.disposition)
      || item.allThreeTerminal !== true || typeof item.allThreePass !== "boolean" || typeof item.deterministic !== "boolean"
      || !Array.isArray(item.terminalRefs) || item.terminalRefs.length !== 3) {
      fail(code, "case result identity or closure invalid");
    }
    caseSources.add(item.sourceId);
    derivedPartitionCounts.set(item.partition, derivedPartitionCounts.get(item.partition) + 1);
    derivedAllPass &&= item.allThreePass;
    if (item.disposition === "applicable") derivedApplicableDeterministic &&= item.deterministic;
    for (const ref of item.terminalRefs) {
      exactKeys(ref, ["contentHash", "id"], code, "caseResult.terminalRef");
      sha(ref.contentHash, code, "caseResult.terminalRef.contentHash");
      id(ref.id, code, "caseResult.terminalRef.id");
      if (!terminalHashes.has(ref.contentHash) || caseTerminalHashes.has(ref.contentHash)) {
        fail(code, "case result terminal refs must partition the exact terminal set");
      }
      caseTerminalHashes.add(ref.contentHash);
    }
  }
  if (caseTerminalHashes.size !== terminalHashes.size || derivedPartitionCounts.get("dev/calibration") !== 30
    || derivedPartitionCounts.get("defect/calibration") !== 18) fail(code, "case results do not preserve the frozen denominator");
  const manifestPartitions = new Set();
  for (const item of record.manifestResults) {
    exactKeys(item, ["attemptCount", "partition", "pass", "sourceCount"], code, "manifestResult");
    if (!PARTITIONS.has(item.partition) || manifestPartitions.has(item.partition)
      || item.sourceCount !== derivedPartitionCounts.get(item.partition) || item.attemptCount !== item.sourceCount * 3
      || item.pass !== record.caseResults.filter(({ partition }) => partition === item.partition).every(({ allThreePass }) => allThreePass)) {
      fail(code, "manifest result does not derive from case results");
    }
    manifestPartitions.add(item.partition);
  }
  const derivedAttemptPass = record.passAttemptCount === 144 && record.nonPassAttemptCount === 0 && derivedAllPass;
  if (record.allRegisteredAttemptsPass !== derivedAttemptPass
    || record.allApplicableSourcesDeterministic !== derivedApplicableDeterministic) {
    fail(code, "summary booleans do not derive from frozen case results and counters");
  }
  if (record.overallStatus === "calibration-complete-pass"
    && (record.allRegisteredAttemptsPass !== true || record.allApplicableSourcesDeterministic !== true
      || record.passAttemptCount !== 144 || record.nonPassAttemptCount !== 0)) {
    fail(code, "pass summary is not a complete all-pass conjunction");
  }
  if (record.overallStatus === "calibration-complete-non-pass"
    && record.allRegisteredAttemptsPass === true && record.allApplicableSourcesDeterministic === true) {
    fail(code, "non-pass summary contradicts an all-pass conjunction");
  }
  utc(record.startedAt, code, "startedAt");
  utc(record.finishedAt, code, "finishedAt");
  evidence(record.evidenceBoundary, code);
  validateSelfHash(record, code);
  return record;
}

const stringSchema = (pattern = undefined) => ({ type: "string", ...(pattern ? { pattern } : {}) });
const shaSchema = stringSchema("^[0-9a-f]{64}$");
const refSchema = {
  type: "object", additionalProperties: false, required: REF_KEYS,
  properties: {
    byteLength: { type: "integer", minimum: 2 }, contentHash: shaSchema, fileSha256: shaSchema,
    id: stringSchema("^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,159}$"), path: stringSchema("^[^\\\\/][^\\\\]*$"),
  },
};
const evidenceSchema = {
  type: "object", additionalProperties: false, required: Object.keys(SLICE10_EVIDENCE_BOUNDARY),
  properties: Object.fromEntries(Object.entries(SLICE10_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])),
};
const summaryTerminalRefSchema = {
  type: "object", additionalProperties: false, required: ["contentHash", "id"],
  properties: { contentHash: shaSchema, id: stringSchema() },
};
const caseResultSchema = {
  type: "object", additionalProperties: false,
  required: ["allThreePass", "allThreeTerminal", "deterministic", "disposition", "partition", "sourceId", "terminalRefs"],
  properties: {
    allThreePass: { type: "boolean" }, allThreeTerminal: { const: true }, deterministic: { type: "boolean" },
    disposition: { enum: [...DISPOSITIONS] }, partition: { enum: [...PARTITIONS] }, sourceId: stringSchema(),
    terminalRefs: { type: "array", minItems: 3, maxItems: 3, items: summaryTerminalRefSchema },
  },
};
const manifestResultSchema = {
  type: "object", additionalProperties: false, required: ["attemptCount", "partition", "pass", "sourceCount"],
  properties: {
    attemptCount: { type: "integer", minimum: 54, maximum: 90 }, partition: { enum: [...PARTITIONS] },
    pass: { type: "boolean" }, sourceCount: { type: "integer", minimum: 18, maximum: 30 },
  },
};

function recordSchema(name, required, properties) {
  return Object.freeze({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-10/schemas/${name}.schema.json`,
    type: "object", additionalProperties: false, required,
    properties,
  });
}

export const SLICE10_PROTOCOL_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/calibration-admission.slice10.v0.schema.json": recordSchema("calibration-admission.slice10.v0", ADMISSION_KEYS, {
    schemaVersion: { const: "calibration-admission.slice10.v0" }, admissionId: stringSchema(), operation: { enum: [...OPERATIONS] },
    definitionRef: refSchema, candidateRef: refSchema, contractRef: refSchema, preregistrationRef: refSchema,
    manifestRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema }, runtimeStartRef: refSchema,
    slice09DecisionRef: refSchema, slice09SummaryRef: refSchema, slice09GateBPassed: { const: true },
    slice09ResultCommit: { const: SLICE10_SLICE09_RESULT_COMMIT }, slice09ResultTreeSha256: { const: SLICE10_SLICE09_RESULT_TREE_SHA256 },
    decision: { const: "admitted-open-calibration" }, admittedAt: stringSchema(), evidenceBoundary: evidenceSchema, contentHash: shaSchema,
  }),
  "schemas/calibration-request.slice10.v0.schema.json": recordSchema("calibration-request.slice10.v0", REQUEST_KEYS, {
    schemaVersion: { const: "calibration-request.slice10.v0" }, requestId: stringSchema(), operation: { enum: [...OPERATIONS] },
    admissionRef: refSchema, candidateRef: refSchema, contractRef: refSchema, manifestRef: refSchema, sourceRef: refSchema,
    goldIdentityRef: { oneOf: [{ type: "null" }, refSchema] }, runtimeRef: refSchema,
    workerRef: { type: "object", additionalProperties: false, required: ["id", "implementationSha256", "path", "version"], properties: {
      id: stringSchema(), implementationSha256: shaSchema, path: stringSchema(), version: { const: SLICE10_PROTOCOL_VERSION },
    } },
    attempt: { type: "object", additionalProperties: false, required: ["attemptNumber", "partition", "repetition", "sourceId"], properties: {
      attemptNumber: { const: 1 }, partition: { enum: [...PARTITIONS] }, repetition: { enum: [1, 2, 3] }, sourceId: stringSchema(),
    } },
    disposition: { enum: [...DISPOSITIONS] }, expectedStableErrorCode: { oneOf: [{ type: "null" }, stringSchema("^S10_[A-Z0-9_]+$")] },
    idempotencyKey: shaSchema, createdAt: stringSchema(), evidenceBoundary: evidenceSchema, contentHash: shaSchema,
  }),
  "schemas/calibration-terminal.slice10.v0.schema.json": recordSchema("calibration-terminal.slice10.v0", TERMINAL_KEYS, {
    schemaVersion: { const: "calibration-terminal.slice10.v0" }, terminalId: stringSchema(), operation: { enum: [...OPERATIONS] },
    disposition: { enum: [...DISPOSITIONS] }, requestRef: refSchema, status: { enum: [...TERMINAL_STATUSES] },
    actualStableErrorCode: { oneOf: [{ type: "null" }, stringSchema("^S10_[A-Z0-9_]+$")] },
    reasonCode: { oneOf: [{ type: "null" }, stringSchema("^S10_[A-Z0-9_]+$")] }, workerInvoked: { type: "boolean" },
    workerExitConfirmed: { oneOf: [{ type: "null" }, { type: "boolean" }] }, artifactRef: { oneOf: [{ type: "null" }, refSchema] },
    oracleRef: { oneOf: [{ type: "null" }, refSchema] }, startedAt: stringSchema(), finishedAt: stringSchema(),
    evidenceBoundary: evidenceSchema, contentHash: shaSchema,
  }),
  "schemas/calibration-summary.slice10.v0.schema.json": recordSchema("calibration-summary.slice10.v0", SUMMARY_KEYS, {
    schemaVersion: { const: "calibration-summary.slice10.v0" }, summaryId: stringSchema(), operation: { enum: [...OPERATIONS] },
    admissionRef: refSchema, preregistrationRef: refSchema, runtimeEndRef: refSchema,
    registeredSourceCount: { const: 48 }, registeredAttemptCount: { const: 144 }, recordedAttemptCount: { const: 144 },
    replacementAttemptCount: { const: 0 }, passAttemptCount: { type: "integer", minimum: 0, maximum: 144 },
    nonPassAttemptCount: { type: "integer", minimum: 0, maximum: 144 }, missingAttemptCount: { const: 0 },
    unregisteredTerminalCount: { const: 0 }, allRegisteredAttemptsTerminal: { const: true },
    allRegisteredAttemptsPass: { type: "boolean" }, allApplicableSourcesDeterministic: { type: "boolean" },
    runtimeStableBeforeAndAfter: { const: true }, caseResults: { type: "array", minItems: 48, maxItems: 48, items: caseResultSchema },
    manifestResults: { type: "array", minItems: 2, maxItems: 2, items: manifestResultSchema },
    terminalRefs: { type: "array", minItems: 144, maxItems: 144, items: summaryTerminalRefSchema },
    overallStatus: { enum: ["calibration-complete-pass", "calibration-complete-non-pass"] },
    startedAt: stringSchema(), finishedAt: stringSchema(), evidenceBoundary: evidenceSchema, contentHash: shaSchema,
  }),
});
