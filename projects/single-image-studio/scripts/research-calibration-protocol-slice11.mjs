import {
  SLICE11_EXPECTED_PROJECTION_SCHEMA,
  sha256Slice11,
  stableStringifySlice11,
  validateExpectedProjectionSlice11,
} from "./research-expected-projection-slice11.mjs";
import {
  SLICE11_EVIDENCE_BOUNDARY,
  SLICE11_WORKER_LIFECYCLE_SCHEMA,
  validateSlice11WorkerLifecycle,
} from "./research-calibration-lifecycle-slice11.mjs";

export const SLICE11_PROTOCOL_VERSION = "0.11.0";

const OPERATIONS = new Set(["normalize", "export"]);
const PARTITIONS = new Set(["dev/calibration", "defect/calibration"]);
const DISPOSITIONS = new Set(["applicable", "rejection"]);
const STATUSES = new Set(["pass", "non-pass", "protocol-failed", "inconclusive"]);
const SHA_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u;
const REF_KEYS = Object.freeze(["byteLength", "contentHash", "fileSha256", "id", "path"]);
const CONTENT_REF_KEYS = Object.freeze(["contentHash", "id"]);

export class Slice11ProtocolError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "Slice11ProtocolError";
    this.code = code;
  }
}

function fail(code, message) { throw new Slice11ProtocolError(code, message); }
function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exact(value, keys, code, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(code, `${label} shape is not closed`);
  }
}
function sha(value, code, label) {
  if (typeof value !== "string" || !SHA_RE.test(value)) fail(code, `${label} is not lowercase SHA-256`);
}
function id(value, code, label) {
  if (typeof value !== "string" || !ID_RE.test(value) || value.includes("..")) fail(code, `${label} is invalid`);
}
function utc(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail(code, `${label} must be exact UTC`);
}
function evidence(value, code) {
  exact(value, Object.keys(SLICE11_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice11(value) !== stableStringifySlice11(SLICE11_EVIDENCE_BOUNDARY)) fail(code, "evidence boundary promoted");
}

export function contentHashProtocolSlice11(record) {
  if (!plain(record)) fail("S11_PROTOCOL_RECORD_INVALID", "record must be an object");
  const payload = { ...record };
  delete payload.contentHash;
  return sha256Slice11(Buffer.from(`${stableStringifySlice11(payload)}\n`, "utf8"));
}

function withHash(record) {
  const value = { ...record, contentHash: "" };
  value.contentHash = contentHashProtocolSlice11(value);
  return value;
}
function selfHash(record, code) {
  sha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashProtocolSlice11(record)) fail(code, "contentHash mismatch");
}
export function validateSlice11RecordRef(value, code = "S11_RECORD_REF_INVALID", label = "recordRef") {
  exact(value, REF_KEYS, code, label);
  id(value.id, code, `${label}.id`);
  sha(value.contentHash, code, `${label}.contentHash`);
  sha(value.fileSha256, code, `${label}.fileSha256`);
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 2 || typeof value.path !== "string"
    || value.path.includes("\\") || value.path.startsWith("/")
    || value.path.split("/").some((part) => part === "" || part === "." || part === "..")) fail(code, `${label} path/length invalid`);
  return true;
}
export function contentRefSlice11(record, idKey) {
  return Object.freeze({ id: record[idKey], contentHash: record.contentHash });
}
function contentRef(value, code, label, nullable = false) {
  if (nullable && value === null) return;
  exact(value, CONTENT_REF_KEYS, code, label);
  id(value.id, code, `${label}.id`);
  sha(value.contentHash, code, `${label}.contentHash`);
}
function implementationRef(value, code, label) {
  exact(value, ["id", "implementationSha256", "path", "version"], code, label);
  id(value.id, code, `${label}.id`);
  sha(value.implementationSha256, code, `${label}.implementationSha256`);
  if (value.version !== SLICE11_PROTOCOL_VERSION || typeof value.path !== "string" || !value.path.startsWith("scripts/")
    || value.path.includes("..") || value.path.includes("\\")) fail(code, `${label} version/path invalid`);
}

const REQUEST_KEYS = Object.freeze([
  "attempt", "candidateRef", "contentHash", "contractRef", "createdAt", "disposition", "evidenceBoundary",
  "expectedStableErrorCode", "goldIdentityRef", "idempotencyKey", "manifestRef", "operation", "requestId",
  "runtimeRef", "schemaVersion", "sourceRef", "workerRef",
]);

export function validateSlice11CalibrationRequest(record) {
  const code = "S11_CALIBRATION_REQUEST_INVALID";
  exact(record, REQUEST_KEYS, code, "request");
  if (record.schemaVersion !== "calibration-request.slice11.v0" || !OPERATIONS.has(record.operation)
    || !DISPOSITIONS.has(record.disposition)) fail(code, "request identity/operation/disposition invalid");
  id(record.requestId, code, "requestId");
  sha(record.idempotencyKey, code, "idempotencyKey");
  utc(record.createdAt, code, "createdAt");
  exact(record.attempt, ["attemptNumber", "partition", "repetition", "sourceId"], code, "attempt");
  id(record.attempt.sourceId, code, "attempt.sourceId");
  if (record.attempt.attemptNumber !== 1 || ![1, 2, 3].includes(record.attempt.repetition)
    || !PARTITIONS.has(record.attempt.partition)) fail(code, "attempt must be a frozen zero-retry slot");
  for (const key of ["candidateRef", "contractRef", "manifestRef", "runtimeRef", "sourceRef"]) validateSlice11RecordRef(record[key], code, key);
  implementationRef(record.workerRef, code, "workerRef");
  if (record.sourceRef.id !== record.attempt.sourceId
    || record.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.11.0"
    || record.contractRef.id !== `CC-CAP02-${record.operation.toUpperCase()}-PNG@0.11.0`) fail(code, "request identity binding invalid");
  const applicable = record.disposition === "applicable";
  if (applicable !== (record.goldIdentityRef !== null)) fail(code, "gold identity presence differs from disposition");
  if (applicable) {
    validateSlice11RecordRef(record.goldIdentityRef, code, "goldIdentityRef");
    if (record.expectedStableErrorCode !== null) fail(code, "applicable request cannot expect an error");
  } else if (typeof record.expectedStableErrorCode !== "string" || !/^S11_[A-Z0-9_]+$/u.test(record.expectedStableErrorCode)) {
    fail(code, "rejection request requires an exact S11 code");
  }
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

export function createSlice11CalibrationRequest(fields) {
  const record = withHash({
    schemaVersion: "calibration-request.slice11.v0", ...structuredClone(fields),
    evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11CalibrationRequest(record);
  return Object.freeze(record);
}

const TERMINAL_KEYS = Object.freeze([
  "actualStableErrorCode", "contentHash", "disposition", "evidenceBoundary", "expectedProjectionRef", "finishedAt",
  "operation", "oracleFactsSha256", "outputByteLength", "outputFileSha256", "reasonCode", "requestRef",
  "schemaVersion", "startedAt", "status", "terminalId", "workerLifecycleRef",
]);

export function validateSlice11CalibrationTerminal(record, context = {}) {
  const code = "S11_CALIBRATION_TERMINAL_INVALID";
  exact(record, TERMINAL_KEYS, code, "terminal");
  if (record.schemaVersion !== "calibration-terminal.slice11.v0" || !OPERATIONS.has(record.operation)
    || !DISPOSITIONS.has(record.disposition) || !STATUSES.has(record.status)) fail(code, "terminal identity/state invalid");
  id(record.terminalId, code, "terminalId");
  contentRef(record.requestRef, code, "requestRef");
  contentRef(record.expectedProjectionRef, code, "expectedProjectionRef", true);
  contentRef(record.workerLifecycleRef, code, "workerLifecycleRef", true);
  utc(record.startedAt, code, "startedAt");
  utc(record.finishedAt, code, "finishedAt");
  if (Date.parse(record.startedAt) > Date.parse(record.finishedAt)) fail(code, "terminal time order invalid");
  for (const [value, label] of [[record.outputFileSha256, "outputFileSha256"], [record.oracleFactsSha256, "oracleFactsSha256"]]) {
    if (value !== null) sha(value, code, label);
  }
  if (record.outputByteLength !== null && (!Number.isSafeInteger(record.outputByteLength)
    || record.outputByteLength < 1 || record.outputByteLength > 1048576)) fail(code, "outputByteLength invalid");
  const applicablePass = record.disposition === "applicable" && record.status === "pass";
  const rejectionPass = record.disposition === "rejection" && record.status === "pass";
  if (applicablePass) {
    if (record.actualStableErrorCode !== null || record.reasonCode !== null || record.expectedProjectionRef === null
      || record.workerLifecycleRef === null || record.outputFileSha256 === null || record.outputByteLength === null
      || record.oracleFactsSha256 === null) fail(code, "applicable pass closure is incomplete");
  } else if (rejectionPass) {
    if (typeof record.actualStableErrorCode !== "string" || !/^S11_[A-Z0-9_]+$/u.test(record.actualStableErrorCode)
      || record.reasonCode !== null || record.expectedProjectionRef !== null || record.workerLifecycleRef === null
      || record.outputFileSha256 !== null || record.outputByteLength !== null || record.oracleFactsSha256 !== null) {
      fail(code, "rejection pass must be an exact worker-free closure");
    }
  } else if (typeof record.reasonCode !== "string" || !/^S11_[A-Z0-9_]+$/u.test(record.reasonCode)
    || record.outputFileSha256 !== null || record.outputByteLength !== null || record.oracleFactsSha256 !== null) {
    fail(code, "non-pass terminal must retain an exact reason and no successful output identity");
  }
  if (record.workerLifecycleRef === null && (record.status !== "protocol-failed"
    || record.reasonCode !== "S11_WORKER_LIFECYCLE_MISSING" || record.expectedProjectionRef !== null)) {
    fail(code, "missing lifecycle must remain an explicit protocol failure");
  }
  if (record.actualStableErrorCode !== null && !/^S11_[A-Z0-9_]+$/u.test(record.actualStableErrorCode)) fail(code, "actualStableErrorCode invalid");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);

  const { request, lifecycle = null, projection = null } = context;
  if (request !== undefined) {
    validateSlice11CalibrationRequest(request);
    if (record.requestRef.id !== request.requestId || record.requestRef.contentHash !== request.contentHash
      || record.operation !== request.operation || record.disposition !== request.disposition) fail(code, "terminal/request binding mismatch");
  }
  if (lifecycle !== null) {
    validateSlice11WorkerLifecycle(lifecycle);
    if (record.workerLifecycleRef === null || record.workerLifecycleRef.id !== lifecycle.lifecycleId
      || record.workerLifecycleRef.contentHash !== lifecycle.contentHash || lifecycle.attemptId !== request?.requestId
      || lifecycle.operation !== record.operation) fail(code, "terminal/lifecycle binding mismatch");
  } else if (record.workerLifecycleRef !== null) fail(code, "terminal references a lifecycle that was not supplied");
  if (projection !== null) {
    validateExpectedProjectionSlice11(projection);
    if (record.expectedProjectionRef === null || record.expectedProjectionRef.id !== projection.projectionId
      || record.expectedProjectionRef.contentHash !== projection.contentHash
      || lifecycle?.projectionRef?.contentHash !== projection.contentHash) fail(code, "terminal/projection binding mismatch");
  } else if (record.expectedProjectionRef !== null) fail(code, "terminal references a projection that was not supplied");
  if (applicablePass && (lifecycle?.stage !== "exit-confirmed" || lifecycle.workerInvoked !== true
    || lifecycle.workerExitConfirmed !== true || lifecycle.ipcMessageReceived !== true || lifecycle.exitCode !== 0 || lifecycle.signal !== null)) {
    fail(code, "applicable pass requires IPC plus confirmed clean exit");
  }
  if (rejectionPass && (request?.expectedStableErrorCode !== record.actualStableErrorCode
    || lifecycle?.stage !== "preflight-not-started" || lifecycle.workerInvoked !== false
    || lifecycle.workerExitConfirmed !== null)) fail(code, "rejection pass lifecycle/classification mismatch");
  return true;
}

export function createSlice11CalibrationTerminal(fields, context = {}) {
  const record = withHash({
    schemaVersion: "calibration-terminal.slice11.v0", ...structuredClone(fields),
    evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11CalibrationTerminal(record, context);
  return Object.freeze(record);
}

const LEDGER_KEYS = Object.freeze([
  "contentHash", "eventId", "eventType", "evidenceBoundary", "occurredAt", "payloadSha256",
  "previousEventHash", "requestRef", "schemaVersion", "sequence", "terminalRef",
]);

export function createSlice11LedgerEvent(fields) {
  const record = withHash({ schemaVersion: "calibration-ledger-event.slice11.v0", ...structuredClone(fields), evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY) });
  validateSlice11LedgerEvent(record);
  return Object.freeze(record);
}

export function validateSlice11LedgerEvent(record) {
  const code = "S11_CALIBRATION_LEDGER_INVALID";
  exact(record, LEDGER_KEYS, code, "ledger event");
  if (record.schemaVersion !== "calibration-ledger-event.slice11.v0" || !Number.isSafeInteger(record.sequence)
    || record.sequence < 1 || !["attempt-started", "attempt-terminal"].includes(record.eventType)) fail(code, "ledger identity invalid");
  id(record.eventId, code, "eventId");
  contentRef(record.requestRef, code, "requestRef");
  contentRef(record.terminalRef, code, "terminalRef", true);
  if (record.previousEventHash !== null) sha(record.previousEventHash, code, "previousEventHash");
  sha(record.payloadSha256, code, "payloadSha256");
  utc(record.occurredAt, code, "occurredAt");
  if ((record.eventType === "attempt-started") !== (record.terminalRef === null)) fail(code, "ledger event payload role invalid");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

export function validateSlice11Ledger(events) {
  const code = "S11_CALIBRATION_LEDGER_INVALID";
  if (!Array.isArray(events) || events.length < 2 || events.length % 2 !== 0) fail(code, "ledger requires complete start/terminal pairs");
  let previous = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    validateSlice11LedgerEvent(event);
    if (event.sequence !== index + 1 || event.previousEventHash !== previous || event.contentHash !== contentHashProtocolSlice11(event)) fail(code, "ledger chain invalid");
    const expectedType = index % 2 === 0 ? "attempt-started" : "attempt-terminal";
    if (event.eventType !== expectedType || (index % 2 === 1 && (event.requestRef.id !== events[index - 1].requestRef.id
      || event.requestRef.contentHash !== events[index - 1].requestRef.contentHash))) fail(code, "ledger attempt order invalid");
    previous = event.contentHash;
  }
  return true;
}

const SUMMARY_KEYS = Object.freeze([
  "allApplicableSourcesByteDeterministic", "allRegisteredAttemptsPass", "allRegisteredAttemptsTerminal",
  "caseResults", "contentHash", "evidenceBoundary", "finishedAt", "nonPassAttemptCount", "operation",
  "overallStatus", "passAttemptCount", "recordedAttemptCount", "registeredAttemptCount", "registeredSourceCount",
  "replacementAttemptCount", "schemaVersion", "startedAt", "summaryId", "terminalRefs",
]);

export function buildSlice11CalibrationSummary({ operation, registeredCases, terminalInputs, startedAt, finishedAt } = {}) {
  const code = "S11_CALIBRATION_SUMMARY_INVALID";
  if (!OPERATIONS.has(operation) || !Array.isArray(registeredCases) || registeredCases.length !== 48
    || !Array.isArray(terminalInputs) || terminalInputs.length !== 144) fail(code, "summary requires the frozen 48x3 denominator");
  utc(startedAt, code, "startedAt");
  utc(finishedAt, code, "finishedAt");
  if (Date.parse(startedAt) > Date.parse(finishedAt)) fail(code, "summary time order invalid");
  const profiles = new Map();
  const partitionCounts = { "dev/calibration": 0, "defect/calibration": 0 };
  const dispositionCounts = { applicable: 0, rejection: 0 };
  for (const item of registeredCases) {
    exact(item, ["disposition", "expectedStableErrorCode", "manifestContentHash", "partition", "sourceId"], code, "registeredCase");
    id(item.sourceId, code, "registeredCase.sourceId");
    sha(item.manifestContentHash, code, "registeredCase.manifestContentHash");
    if (profiles.has(item.sourceId) || !PARTITIONS.has(item.partition) || !DISPOSITIONS.has(item.disposition)) fail(code, "registered case identity/profile invalid");
    if ((item.disposition === "applicable") !== (item.expectedStableErrorCode === null)
      || (item.expectedStableErrorCode !== null && !/^S11_[A-Z0-9_]+$/u.test(item.expectedStableErrorCode))) fail(code, "registered disposition/error invalid");
    profiles.set(item.sourceId, item);
    partitionCounts[item.partition] += 1;
    dispositionCounts[item.disposition] += 1;
  }
  if (partitionCounts["dev/calibration"] !== 30 || partitionCounts["defect/calibration"] !== 18
    || dispositionCounts.applicable !== 24 || dispositionCounts.rejection !== 24) fail(code, "registered strata must remain 30+18 and 24+24");
  const bySource = new Map([...profiles].map(([sourceId]) => [sourceId, []]));
  const slots = new Set();
  for (const input of terminalInputs) {
    exact(input, ["lifecycle", "projection", "request", "terminal"], code, "terminalInput");
    validateSlice11CalibrationTerminal(input.terminal, input);
    const profile = profiles.get(input.request.attempt.sourceId);
    if (!profile || input.request.operation !== operation || input.request.attempt.partition !== profile.partition
      || input.request.disposition !== profile.disposition || input.request.expectedStableErrorCode !== profile.expectedStableErrorCode
      || input.request.manifestRef.contentHash !== profile.manifestContentHash) fail(code, "terminal differs from registered profile");
    const slot = `${input.request.attempt.sourceId}:r${input.request.attempt.repetition}:a${input.request.attempt.attemptNumber}`;
    if (slots.has(slot)) fail(code, "duplicate attempt slot");
    slots.add(slot);
    bySource.get(input.request.attempt.sourceId).push(input);
  }
  const caseResults = [];
  let allApplicableSourcesByteDeterministic = true;
  for (const [sourceId, profile] of profiles) {
    const rows = bySource.get(sourceId).sort((a, b) => a.request.attempt.repetition - b.request.attempt.repetition);
    if (rows.length !== 3 || rows.some((row, index) => row.request.attempt.repetition !== index + 1)) fail(code, "every source requires repetitions 1,2,3");
    const allThreePass = rows.every(({ terminal }) => terminal.status === "pass")
      && (profile.disposition === "applicable" || rows.every(({ terminal }) => terminal.actualStableErrorCode === profile.expectedStableErrorCode));
    const outputHashes = rows.map(({ terminal }) => terminal.outputFileSha256);
    const byteDeterministic = profile.disposition === "rejection"
      ? true : outputHashes[0] !== null && new Set(outputHashes).size === 1;
    if (profile.disposition === "applicable") allApplicableSourcesByteDeterministic &&= byteDeterministic;
    caseResults.push({ sourceId, partition: profile.partition, disposition: profile.disposition, allThreeTerminal: true,
      allThreePass, byteDeterministic, terminalRefs: rows.map(({ terminal }) => contentRefSlice11(terminal, "terminalId")) });
  }
  const terminals = terminalInputs.map(({ terminal }) => terminal);
  const passAttemptCount = terminals.filter(({ status }) => status === "pass").length;
  const allRegisteredAttemptsPass = passAttemptCount === 144 && caseResults.every(({ allThreePass }) => allThreePass);
  const record = withHash({
    schemaVersion: "calibration-summary.slice11.v0", summaryId: `summary.s11.${operation}`, operation,
    registeredSourceCount: 48, registeredAttemptCount: 144, recordedAttemptCount: 144,
    replacementAttemptCount: 0, passAttemptCount, nonPassAttemptCount: 144 - passAttemptCount,
    allRegisteredAttemptsTerminal: true, allRegisteredAttemptsPass, allApplicableSourcesByteDeterministic,
    overallStatus: allRegisteredAttemptsPass && allApplicableSourcesByteDeterministic
      ? "calibration-complete-pass" : "calibration-complete-non-pass",
    caseResults, terminalRefs: terminals.map((terminal) => contentRefSlice11(terminal, "terminalId")),
    startedAt, finishedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11CalibrationSummary(record);
  return Object.freeze(record);
}

export function validateSlice11CalibrationSummary(record) {
  const code = "S11_CALIBRATION_SUMMARY_INVALID";
  exact(record, SUMMARY_KEYS, code, "summary");
  if (record.schemaVersion !== "calibration-summary.slice11.v0" || !OPERATIONS.has(record.operation)
    || !["calibration-complete-pass", "calibration-complete-non-pass"].includes(record.overallStatus)
    || record.registeredSourceCount !== 48 || record.registeredAttemptCount !== 144 || record.recordedAttemptCount !== 144
    || record.replacementAttemptCount !== 0 || record.passAttemptCount + record.nonPassAttemptCount !== 144
    || record.allRegisteredAttemptsTerminal !== true || typeof record.allRegisteredAttemptsPass !== "boolean"
    || typeof record.allApplicableSourcesByteDeterministic !== "boolean") fail(code, "summary counters/state invalid");
  id(record.summaryId, code, "summaryId");
  utc(record.startedAt, code, "startedAt");
  utc(record.finishedAt, code, "finishedAt");
  if (!Array.isArray(record.caseResults) || record.caseResults.length !== 48 || !Array.isArray(record.terminalRefs)
    || record.terminalRefs.length !== 144) fail(code, "summary denominator arrays invalid");
  const caseIds = new Set();
  const terminalIds = new Set();
  const caseTerminalIds = new Set();
  const partitionCounts = { "dev/calibration": 0, "defect/calibration": 0 };
  const dispositionCounts = { applicable: 0, rejection: 0 };
  for (const item of record.caseResults) {
    exact(item, ["allThreePass", "allThreeTerminal", "byteDeterministic", "disposition", "partition", "sourceId", "terminalRefs"], code, "caseResult");
    if (caseIds.has(item.sourceId) || !PARTITIONS.has(item.partition) || !DISPOSITIONS.has(item.disposition)
      || item.allThreeTerminal !== true || typeof item.allThreePass !== "boolean" || typeof item.byteDeterministic !== "boolean"
      || !Array.isArray(item.terminalRefs) || item.terminalRefs.length !== 3) fail(code, "case result invalid");
    if (item.disposition === "rejection" && item.byteDeterministic !== true) fail(code, "worker-free rejection determinism cannot be false");
    caseIds.add(item.sourceId);
    partitionCounts[item.partition] += 1;
    dispositionCounts[item.disposition] += 1;
    item.terminalRefs.forEach((ref) => {
      contentRef(ref, code, "caseResult.terminalRef");
      if (caseTerminalIds.has(ref.id)) fail(code, "case terminal refs must be globally unique");
      caseTerminalIds.add(ref.id);
    });
  }
  for (const ref of record.terminalRefs) {
    contentRef(ref, code, "terminalRef");
    if (terminalIds.has(ref.id)) fail(code, "terminal refs must be unique");
    terminalIds.add(ref.id);
  }
  const terminalContentById = new Map(record.terminalRefs.map((ref) => [ref.id, ref.contentHash]));
  if (partitionCounts["dev/calibration"] !== 30 || partitionCounts["defect/calibration"] !== 18
    || dispositionCounts.applicable !== 24 || dispositionCounts.rejection !== 24
    || caseTerminalIds.size !== terminalIds.size || record.caseResults.some((item) => item.terminalRefs
      .some((ref) => terminalContentById.get(ref.id) !== ref.contentHash))) {
    fail(code, "summary strata or terminal reference closure invalid");
  }
  const derivedAllPass = record.passAttemptCount === 144 && record.caseResults.every(({ allThreePass }) => allThreePass);
  const derivedDeterminism = record.caseResults.filter(({ disposition }) => disposition === "applicable")
    .every(({ byteDeterministic }) => byteDeterministic);
  if (record.allRegisteredAttemptsPass !== derivedAllPass
    || record.allApplicableSourcesByteDeterministic !== derivedDeterminism) {
    fail(code, "summary conjuncts are not derived from case results");
  }
  if ((record.overallStatus === "calibration-complete-pass") !== (record.allRegisteredAttemptsPass && record.allApplicableSourcesByteDeterministic)) {
    fail(code, "overall status is not derived from frozen conjuncts");
  }
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

const nullable = (schema) => ({ oneOf: [{ type: "null" }, schema] });
const text = { type: "string", minLength: 1, maxLength: 200 };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const refSchema = { type: "object", additionalProperties: false, required: [...REF_KEYS], properties: {
  byteLength: { type: "integer", minimum: 2 }, contentHash: hex, fileSha256: hex, id: text, path: text,
} };
const contentRefSchema = { type: "object", additionalProperties: false, required: [...CONTENT_REF_KEYS], properties: { contentHash: hex, id: text } };
const evidenceSchema = { type: "object", additionalProperties: false, required: Object.keys(SLICE11_EVIDENCE_BOUNDARY),
  properties: Object.fromEntries(Object.entries(SLICE11_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])) };
function recordSchema(name, keys, properties) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://single-image-studio.invalid/research/slice-11/schemas/${name}.schema.json`,
    type: "object", additionalProperties: false, required: [...keys], properties };
}
const caseResultSchema = { type: "object", additionalProperties: false,
  required: ["allThreePass", "allThreeTerminal", "byteDeterministic", "disposition", "partition", "sourceId", "terminalRefs"],
  properties: { allThreePass: { type: "boolean" }, allThreeTerminal: { const: true }, byteDeterministic: { type: "boolean" },
    disposition: { enum: [...DISPOSITIONS] }, partition: { enum: [...PARTITIONS] }, sourceId: text,
    terminalRefs: { type: "array", minItems: 3, maxItems: 3, items: contentRefSchema } } };

export const SLICE11_PROTOCOL_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/expected-projection.slice11.v0.schema.json": SLICE11_EXPECTED_PROJECTION_SCHEMA,
  "schemas/worker-lifecycle.slice11.v0.schema.json": SLICE11_WORKER_LIFECYCLE_SCHEMA,
  "schemas/calibration-request.slice11.v0.schema.json": recordSchema("calibration-request.slice11.v0", REQUEST_KEYS, {
    schemaVersion: { const: "calibration-request.slice11.v0" }, requestId: text, operation: { enum: [...OPERATIONS] },
    attempt: { type: "object", additionalProperties: false, required: ["attemptNumber", "partition", "repetition", "sourceId"], properties: {
      attemptNumber: { const: 1 }, partition: { enum: [...PARTITIONS] }, repetition: { enum: [1, 2, 3] }, sourceId: text } },
    disposition: { enum: [...DISPOSITIONS] }, expectedStableErrorCode: nullable({ type: "string", pattern: "^S11_[A-Z0-9_]+$" }),
    sourceRef: refSchema, manifestRef: refSchema, goldIdentityRef: nullable(refSchema), candidateRef: refSchema,
    contractRef: refSchema, runtimeRef: refSchema,
    workerRef: { type: "object", additionalProperties: false, required: ["id", "implementationSha256", "path", "version"], properties: {
      id: text, implementationSha256: hex, path: text, version: { const: SLICE11_PROTOCOL_VERSION } } },
    createdAt: { type: "string", format: "date-time" }, idempotencyKey: hex, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-terminal.slice11.v0.schema.json": recordSchema("calibration-terminal.slice11.v0", TERMINAL_KEYS, {
    schemaVersion: { const: "calibration-terminal.slice11.v0" }, terminalId: text, operation: { enum: [...OPERATIONS] },
    disposition: { enum: [...DISPOSITIONS] }, requestRef: contentRefSchema, status: { enum: [...STATUSES] },
    actualStableErrorCode: nullable({ type: "string", pattern: "^S11_[A-Z0-9_]+$" }), reasonCode: nullable({ type: "string", pattern: "^S11_[A-Z0-9_]+$" }),
    expectedProjectionRef: nullable(contentRefSchema), workerLifecycleRef: nullable(contentRefSchema),
    outputFileSha256: nullable(hex), outputByteLength: nullable({ type: "integer", minimum: 1, maximum: 1048576 }),
    oracleFactsSha256: nullable(hex), startedAt: { type: "string", format: "date-time" }, finishedAt: { type: "string", format: "date-time" },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-ledger-event.slice11.v0.schema.json": recordSchema("calibration-ledger-event.slice11.v0", LEDGER_KEYS, {
    schemaVersion: { const: "calibration-ledger-event.slice11.v0" }, eventId: text, sequence: { type: "integer", minimum: 1 },
    eventType: { enum: ["attempt-started", "attempt-terminal"] }, requestRef: contentRefSchema,
    terminalRef: nullable(contentRefSchema), previousEventHash: nullable(hex), payloadSha256: hex,
    occurredAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-summary.slice11.v0.schema.json": recordSchema("calibration-summary.slice11.v0", SUMMARY_KEYS, {
    schemaVersion: { const: "calibration-summary.slice11.v0" }, summaryId: text, operation: { enum: [...OPERATIONS] },
    registeredSourceCount: { const: 48 }, registeredAttemptCount: { const: 144 }, recordedAttemptCount: { const: 144 },
    replacementAttemptCount: { const: 0 }, passAttemptCount: { type: "integer", minimum: 0, maximum: 144 },
    nonPassAttemptCount: { type: "integer", minimum: 0, maximum: 144 }, allRegisteredAttemptsTerminal: { const: true },
    allRegisteredAttemptsPass: { type: "boolean" }, allApplicableSourcesByteDeterministic: { type: "boolean" },
    overallStatus: { enum: ["calibration-complete-pass", "calibration-complete-non-pass"] },
    caseResults: { type: "array", minItems: 48, maxItems: 48, items: caseResultSchema },
    terminalRefs: { type: "array", minItems: 144, maxItems: 144, items: contentRefSchema },
    startedAt: { type: "string", format: "date-time" }, finishedAt: { type: "string", format: "date-time" },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});
