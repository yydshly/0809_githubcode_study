import { createHash, randomBytes } from "node:crypto";
import { link, mkdir, open, readFile, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { contentHashSlice06, sha256Slice06, stableStringifySlice06 } from "./research-diagnostic-adapter-slice06.mjs";

const ZERO_SHA256 = "0".repeat(64);
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_SESSION_OUTPUT_BYTES = 18 * MAX_OUTPUT_BYTES;
const OPERATIONS = Object.freeze(["normalize", "export"]);
const EXPECTED_DISPOSITIONS = Object.freeze(["applicable", "preflight-reject"]);
const TERMINAL_STATUSES = Object.freeze([
  "characterized-oracle-pass",
  "characterized-oracle-non-pass",
  "characterized-preflight-rejection",
  "protocol-failed",
  "inconclusive",
]);
const RECONCILIATION_UNKNOWN_CODES = new Set([
  "S06_PUBLICATION_RECONCILIATION_UNKNOWN",
  "S06_WORKER_RECONCILIATION_UNKNOWN",
]);
const OUTPUT_FILENAMES = Object.freeze({
  bytes: "candidate-output.bin",
  observation: "candidate-output-observation.json",
  oracle: "oracle-diagnostic.json",
  envelope: "diagnostic-envelope.json",
  terminal: "terminal-result.json",
  failureObservation: "worker-observation.json",
  failureEnvelope: "worker-failure-envelope.json",
});

export const SLICE06_RUNNER_VERSIONS = Object.freeze({
  request: "local-run-request.slice06.v0",
  claim: "idempotency-claim.slice06.v0",
  event: "run-event.slice06.v0",
  result: "run-result.slice06.v0",
  summary: "diagnostic-summary.slice06.v0",
  close: "characterization-close.slice06.v0",
  registeredRun: "registered-diagnostic-run.slice06.v0",
  workerFailureEnvelope: "worker-failure-envelope.slice06.v0",
});

export const SLICE06_RUNNER_SCHEMA_PATHS = Object.freeze({
  runRequest: "schemas/local-run-request.slice06.v0.schema.json",
  runClaim: "schemas/idempotency-claim.slice06.v0.schema.json",
  runEvent: "schemas/run-event.slice06.v0.schema.json",
  runResult: "schemas/run-result.slice06.v0.schema.json",
  diagnosticSummary: "schemas/diagnostic-summary.slice06.v0.schema.json",
  characterizationClose: "schemas/characterization-close.slice06.v0.schema.json",
  registeredRun: "schemas/registered-diagnostic-run.slice06.v0.schema.json",
  workerObservation: "schemas/worker-observation.slice06.v0.schema.json",
  closurePublication: "schemas/five-role-publication.slice06.v0.schema.json",
  workerFailureEnvelope: "schemas/worker-failure-envelope.slice06.v0.schema.json",
});

const SHA_SCHEMA = Object.freeze({ type: "string", pattern: "^[a-f0-9]{64}$" });
const ID_SCHEMA = Object.freeze({ type: "string", minLength: 1, maxLength: 200, pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]*$" });
const PATH_SCHEMA = Object.freeze({ type: "string", minLength: 1, maxLength: 500, pattern: "^[A-Za-z0-9._:@/-]+$" });
const UTC_SCHEMA = Object.freeze({ type: "string", format: "date-time", pattern: "Z$" });
const nullable = (schema) => ({ oneOf: [schema, { type: "null" }] });
const arrayOf = (items, options = {}) => ({ type: "array", items, ...options });
const closed = (properties, required = Object.keys(properties)) => ({
  type: "object", additionalProperties: false, required, properties,
});
const RECORD_REF_SCHEMA = closed({
  id: ID_SCHEMA, contentHash: SHA_SCHEMA, path: PATH_SCHEMA,
  byteLength: { type: "integer", minimum: 1 }, fileSha256: SHA_SCHEMA,
});
const SHORT_REF_SCHEMA = closed({ id: ID_SCHEMA, contentHash: SHA_SCHEMA });
const FILE_REF_SCHEMA = closed({ id: ID_SCHEMA, contentHash: SHA_SCHEMA, relativePath: PATH_SCHEMA });
const IMPLEMENTATION_REF_SCHEMA = closed({ id: ID_SCHEMA, version: { const: "0.6.0" }, implementationSha256: SHA_SCHEMA });
const ATTEMPT_SCHEMA = closed({
  runId: ID_SCHEMA, sourceId: ID_SCHEMA, partition: { const: "diagnostic" },
  repetition: { type: "integer", minimum: 1, maximum: 3 }, attemptNumber: { const: 1 }, idempotencyKey: ID_SCHEMA,
});
const EVIDENCE_SCHEMA = closed({
  formal: { const: false }, productSupport: { const: false }, excludedFromGateB: { const: true },
  gateBDecisionAuthority: { const: false }, calibrationAuthorized: { const: false },
  c1: { const: 0 }, u1: { const: 0 }, e1: { const: 0 }, r1Pipeline: { const: 0 },
  r1ProductValidation: { const: 0 }, r1ProductRelease: { const: 0 }, o1: { const: 0 },
  g1: { const: 0 }, v1: { const: 0 },
  releaseAllowlist: { const: "none" }, releaseRegistered: { const: 0 }, releaseApproved: { const: 0 },
});
const PUBLICATION_SCHEMA = closed({
  rootRelativePath: PATH_SCHEMA,
  atomicDirectoryCommit: { const: true },
  rolePaths: closed({
    candidateOutput: PATH_SCHEMA,
    candidateOutputObservation: PATH_SCHEMA,
    oracleDiagnostic: PATH_SCHEMA,
    diagnosticEnvelope: PATH_SCHEMA,
    terminalResult: PATH_SCHEMA,
  }),
});
const RESOURCE_USAGE_SCHEMA = closed({
  maxRssKiB: { type: "integer", minimum: 0 },
  userCpuMicros: { type: "integer", minimum: 0 },
  systemCpuMicros: { type: "integer", minimum: 0 },
});
const WORKER_OBSERVATION_SCHEMA = closed({
  message: closed({
    received: { type: "boolean" }, receivedAt: nullable(UTC_SCHEMA),
    protocolVersion: nullable({ type: "string", minLength: 1, maxLength: 80 }),
    status: nullable({ enum: ["succeeded", "failed"] }), payloadSha256: nullable(SHA_SCHEMA),
  }),
  runtime: closed({ payloadSha256: nullable(SHA_SCHEMA), matchesFrozen: nullable({ type: "boolean" }) }),
  telemetry: closed({
    source: nullable({ const: "worker-self-reported-not-hard-isolation" }),
    workerDurationMs: nullable({ type: "integer", minimum: 0, maximum: 10_000 }),
    resourceUsage: nullable(RESOURCE_USAGE_SCHEMA),
  }),
  parentWall: closed({
    startedAt: UTC_SCHEMA, messageAt: nullable(UTC_SCHEMA), exitedAt: nullable(UTC_SCHEMA),
    finishedAt: UTC_SCHEMA, durationMs: { type: "integer", minimum: 0, maximum: 11_000 },
  }),
  exit: closed({
    confirmed: { type: "boolean" }, exitCode: nullable({ type: "integer", minimum: 0, maximum: 255 }),
    signal: nullable({ type: "string", minLength: 1, maxLength: 40 }), terminationRequested: { type: "boolean" },
  }),
});
const DIAGNOSTIC_FACTS_SCHEMA = closed({
  strictDecision: { enum: ["pass", "non-pass"] },
  candidateOutputByteLength: { type: "integer", minimum: 1, maximum: MAX_OUTPUT_BYTES },
  candidateOutputFileSha256: SHA_SCHEMA,
  candidateOutputDecodedPixelSha256: nullable(SHA_SCHEMA),
  oraclePrimaryCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
  oracleFindingCodes: arrayOf({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }, { uniqueItems: true }),
  workerRuntimePayloadSha256: SHA_SCHEMA,
  workerExitConfirmed: { const: true },
  workerExitCode: { const: 0 },
  workerExitSignal: { type: "null" },
  telemetryComplete: { const: true },
});
const STATUS_COUNTS_SCHEMA = closed(Object.fromEntries(TERMINAL_STATUSES.map((status) => [status, { type: "integer", minimum: 0, maximum: 12 }])));
const CASE_RESULT_SCHEMA = closed({
  sourceId: ID_SCHEMA,
  expectedDisposition: { enum: EXPECTED_DISPOSITIONS },
  rawResultRefs: arrayOf(FILE_REF_SCHEMA, { minItems: 3, maxItems: 3 }),
  effectiveResultRefs: arrayOf(FILE_REF_SCHEMA, { minItems: 3, maxItems: 3 }),
  invalidatedResultRefs: arrayOf(FILE_REF_SCHEMA, { maxItems: 0 }),
  statuses: arrayOf({ enum: TERMINAL_STATUSES }, { minItems: 3, maxItems: 3 }),
  strictDecisions: arrayOf(nullable({ enum: ["pass", "non-pass"] }), { minItems: 3, maxItems: 3 }),
  outputByteLengths: arrayOf(nullable({ type: "integer", minimum: 1, maximum: MAX_OUTPUT_BYTES }), { minItems: 3, maxItems: 3 }),
  outputFileSha256s: arrayOf(nullable(SHA_SCHEMA), { minItems: 3, maxItems: 3 }),
  decodedPixelSha256s: arrayOf(nullable(SHA_SCHEMA), { minItems: 3, maxItems: 3 }),
  oraclePrimaryCodes: arrayOf(nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }), { minItems: 3, maxItems: 3 }),
  workerRuntimePayloadSha256s: arrayOf(nullable(SHA_SCHEMA), { minItems: 3, maxItems: 3 }),
  closureComplete: { type: "boolean" }, outputBytesDeterministic: { type: "boolean" },
  pixelDeterministic: nullable({ type: "boolean" }), classificationDeterministic: { type: "boolean" },
  oracleOutcomeDeterministic: { type: "boolean" }, workerRuntimeDeterministic: { type: "boolean" },
  exitConfirmedAll: { type: "boolean" }, telemetryCompleteAll: { type: "boolean" },
});
const RESULT_TREE_SCHEMA = closed({
  fileCount: { type: "integer", minimum: 0 }, totalBytes: { type: "integer", minimum: 0 }, sha256: SHA_SCHEMA,
});

function strictSchema(filename, properties) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-06/schemas/${filename}`,
    ...closed(properties),
  };
}

const SCHEMA_BY_KEY = {
  runRequest: strictSchema("local-run-request.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.request }, requestId: ID_SCHEMA,
    mode: { const: "open-diagnostic" }, operation: { enum: OPERATIONS }, definitionRef: RECORD_REF_SCHEMA,
    candidateRef: RECORD_REF_SCHEMA, contractRef: RECORD_REF_SCHEMA, manifestRef: RECORD_REF_SCHEMA,
    preregistrationRef: RECORD_REF_SCHEMA, runtimeAttestationRef: RECORD_REF_SCHEMA, hardwareRef: RECORD_REF_SCHEMA,
    adapterRef: IMPLEMENTATION_REF_SCHEMA, workerRef: IMPLEMENTATION_REF_SCHEMA, oracleRef: IMPLEMENTATION_REF_SCHEMA,
    sourceRef: RECORD_REF_SCHEMA, attempt: ATTEMPT_SCHEMA,
    expectedDisposition: { enum: EXPECTED_DISPOSITIONS },
    expectedStableErrorCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
    createdAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runClaim: strictSchema("idempotency-claim.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.claim }, claimId: ID_SCHEMA,
    requestRef: SHORT_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { const: "open-diagnostic" },
    operation: { enum: OPERATIONS }, attempt: ATTEMPT_SCHEMA, claimedAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runEvent: strictSchema("run-event.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.event }, eventId: ID_SCHEMA,
    sequence: { type: "integer", minimum: 1 }, previousEventHash: SHA_SCHEMA,
    eventType: { enum: ["attempt-registered", "closure-publication-intent", "closure-publication-complete", "attempt-terminal"] },
    requestRef: SHORT_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { const: "open-diagnostic" },
    operation: { enum: OPERATIONS }, attempt: ATTEMPT_SCHEMA,
    status: nullable({ enum: TERMINAL_STATUSES }), reasonCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
    publication: nullable(PUBLICATION_SCHEMA), occurredAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runResult: strictSchema("run-result.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.result }, resultId: ID_SCHEMA,
    requestRef: SHORT_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { const: "open-diagnostic" },
    operation: { enum: OPERATIONS }, attempt: ATTEMPT_SCHEMA,
    expectedDisposition: { enum: EXPECTED_DISPOSITIONS },
    expectedStableErrorCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
    status: { enum: TERMINAL_STATUSES }, reasonCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
    workerInvoked: { type: "boolean" }, diagnosticEnvelopeRef: nullable(FILE_REF_SCHEMA),
    workerFailureEnvelopeRef: nullable(FILE_REF_SCHEMA),
    diagnosticFacts: nullable(DIAGNOSTIC_FACTS_SCHEMA), publication: nullable(PUBLICATION_SCHEMA),
    startedAt: UTC_SCHEMA, finishedAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  diagnosticSummary: strictSchema("diagnostic-summary.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.summary }, summaryId: ID_SCHEMA,
    mode: { const: "open-diagnostic" }, operation: { enum: OPERATIONS }, definitionRef: RECORD_REF_SCHEMA,
    preregistrationRef: RECORD_REF_SCHEMA, runId: ID_SCHEMA, registeredSourceCount: { const: 4 },
    registeredAttemptCount: { const: 12 }, recordedAttemptCount: { const: 12 }, replacementAttemptCount: { const: 0 },
    statusCounts: STATUS_COUNTS_SCHEMA, caseResults: arrayOf(CASE_RESULT_SCHEMA, { minItems: 4, maxItems: 4 }),
    retainedOutputBytes: { type: "integer", minimum: 0, maximum: 9 * MAX_OUTPUT_BYTES },
    allOutputBytesDeterministic: { type: "boolean" }, allOracleOutcomesDeterministic: { type: "boolean" },
    allPixelsDeterministic: nullable({ type: "boolean" }), allClassificationsDeterministic: { type: "boolean" },
    allWorkerRuntimesDeterministic: { type: "boolean" }, exitConfirmedAll: { type: "boolean" }, telemetryCompleteAll: { type: "boolean" },
    overallStatus: { enum: ["characterization-complete", "protocol-failed", "inconclusive"] },
    gateBDecisionAuthority: { const: false }, calibrationAuthorized: { const: false },
    startedAt: UTC_SCHEMA, finishedAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  characterizationClose: strictSchema("characterization-close.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.close }, closeId: ID_SCHEMA,
    mode: { const: "open-diagnostic" }, operation: { enum: OPERATIONS }, definitionRef: RECORD_REF_SCHEMA,
    summaryRef: RECORD_REF_SCHEMA, outcome: { enum: ["characterization-complete", "protocol-failed", "inconclusive"] },
    gateBDecisionAuthority: { const: false }, gateBState: { const: "not-entered-diagnostic-only" },
    calibrationAuthorized: { const: false }, calibrationState: { const: "not-created-by-scope" },
    resultTree: RESULT_TREE_SCHEMA, closedAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  registeredRun: strictSchema("registered-diagnostic-run.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.registeredRun }, registeredRunId: ID_SCHEMA,
    mode: { const: "open-diagnostic" }, operation: { enum: OPERATIONS }, runId: ID_SCHEMA,
    definitionRef: RECORD_REF_SCHEMA, preregistrationRef: RECORD_REF_SCHEMA,
    sourceCount: { const: 4 }, attemptCount: { const: 12 }, replacementAttemptCount: { const: 0 },
    registeredAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  workerObservation: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-06/schemas/worker-observation.slice06.v0.schema.json",
    ...WORKER_OBSERVATION_SCHEMA,
  },
  closurePublication: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-06/schemas/five-role-publication.slice06.v0.schema.json",
    ...PUBLICATION_SCHEMA,
  },
  workerFailureEnvelope: strictSchema("worker-failure-envelope.slice06.v0.schema.json", {
    schemaVersion: { const: SLICE06_RUNNER_VERSIONS.workerFailureEnvelope }, workerFailureEnvelopeId: ID_SCHEMA,
    mode: { const: "open-diagnostic" }, operation: { enum: OPERATIONS }, requestRef: SHORT_REF_SCHEMA,
    attempt: ATTEMPT_SCHEMA, reasonCode: { type: "string", pattern: "^S06_[A-Z0-9_]+$" },
    workerObservation: WORKER_OBSERVATION_SCHEMA, createdAt: UTC_SCHEMA,
    evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
};

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const SLICE06_RUNNER_RECORD_SCHEMAS = deepFreeze(SCHEMA_BY_KEY);
export const SLICE06_RUNNER_SCHEMA_DOCUMENTS = deepFreeze(Object.fromEntries(
  Object.entries(SLICE06_RUNNER_SCHEMA_PATHS).map(([key, schemaPath]) => [schemaPath, SCHEMA_BY_KEY[key]]),
));

export const SLICE06_EVIDENCE_BOUNDARY = deepFreeze({
  formal: false, productSupport: false, excludedFromGateB: true, gateBDecisionAuthority: false,
  calibrationAuthorized: false, c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0,
  r1ProductRelease: 0, o1: 0, g1: 0, v1: 0,
  releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});

export class Slice06RunnerError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "Slice06RunnerError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) { throw new Slice06RunnerError(code, message, options); }
function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, keys, code, label) {
  if (!isPlainObject(value)) fail(code, `${label} must be an object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(code, `${label} must contain exactly ${keys.join(", ")}`);
  }
}
function assertSha(value, code, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) fail(code, `${label} must be SHA-256`);
}
function assertId(value, code, label, { pathSegment = false } = {}) {
  const pattern = pathSegment ? /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/u : /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u;
  if (typeof value !== "string" || !pattern.test(value) || value.includes("..")) fail(code, `${label} is unsafe`);
}
function assertUtc(value, code, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) fail(code, `${label} must be canonical millisecond UTC`);
}
function assertNotBefore(later, earlier, code, label) {
  assertUtc(later, code, `${label}.later`); assertUtc(earlier, code, `${label}.earlier`);
  if (Date.parse(later) < Date.parse(earlier)) fail(code, `${label} timestamp order is reversed`);
}
function assertRecordRef(value, code, label) {
  exactKeys(value, ["id", "contentHash", "path", "byteLength", "fileSha256"], code, label);
  assertId(value.id, code, `${label}.id`); assertSha(value.contentHash, code, `${label}.contentHash`);
  assertSafeRelativePath(value.path, code, `${label}.path`); assertSha(value.fileSha256, code, `${label}.fileSha256`);
  if (!Number.isInteger(value.byteLength) || value.byteLength < 1) fail(code, `${label}.byteLength invalid`);
}
function assertImplementationRef(value, code, label) {
  exactKeys(value, ["id", "version", "implementationSha256"], code, label);
  assertId(value.id, code, `${label}.id`); assertSha(value.implementationSha256, code, `${label}.implementationSha256`);
  if (value.version !== "0.6.0") fail(code, `${label}.version must be 0.6.0`);
}
function assertAttempt(value, code) {
  exactKeys(value, ["runId", "sourceId", "partition", "repetition", "attemptNumber", "idempotencyKey"], code, "attempt");
  assertId(value.runId, code, "attempt.runId"); assertId(value.sourceId, code, "attempt.sourceId", { pathSegment: true });
  assertId(value.idempotencyKey, code, "attempt.idempotencyKey");
  if (value.partition !== "diagnostic" || ![1, 2, 3].includes(value.repetition) || value.attemptNumber !== 1) {
    fail(code, "attempt violates the 3-repetition/zero-replacement contract");
  }
}
function assertEvidence(value, code) {
  exactKeys(value, Object.keys(SLICE06_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice06(value) !== stableStringifySlice06(SLICE06_EVIDENCE_BOUNDARY)) fail(code, "evidenceBoundary changed");
}
function assertSelfHash(record, code) {
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice06(record)) fail(code, "contentHash mismatch");
}
function withHash(record) { return deepFreeze({ ...record, contentHash: contentHashSlice06(record) }); }

function assertShortRef(value, code, label) {
  exactKeys(value, ["id", "contentHash"], code, label);
  assertId(value.id, code, `${label}.id`); assertSha(value.contentHash, code, `${label}.contentHash`);
}

export function validateSlice06WorkerObservation(record) {
  const code = "S06_WORKER_OBSERVATION_INVALID";
  exactKeys(record, ["message", "runtime", "telemetry", "parentWall", "exit"], code, "workerObservation");
  exactKeys(record.message, ["received", "receivedAt", "protocolVersion", "status", "payloadSha256"], code, "workerObservation.message");
  const messageTuple = [record.message.receivedAt, record.message.protocolVersion, record.message.status, record.message.payloadSha256];
  if (typeof record.message.received !== "boolean"
    || (!record.message.received && !messageTuple.every((value) => value === null))) fail(code, "message tuple invalid");
  if (record.message.received) {
    assertUtc(record.message.receivedAt, code, "message.receivedAt");
    assertSha(record.message.payloadSha256, code, "message.payloadSha256");
    if (record.message.protocolVersion !== null && (typeof record.message.protocolVersion !== "string"
      || record.message.protocolVersion.length < 1 || record.message.protocolVersion.length > 80)) fail(code, "message protocolVersion invalid");
    if (record.message.status !== null && !new Set(["succeeded", "failed"]).has(record.message.status)) fail(code, "message status invalid");
  }
  exactKeys(record.runtime, ["payloadSha256", "matchesFrozen"], code, "workerObservation.runtime");
  if ((record.runtime.payloadSha256 === null) !== (record.runtime.matchesFrozen === null)) fail(code, "runtime tuple invalid");
  if (record.runtime.payloadSha256 !== null) {
    assertSha(record.runtime.payloadSha256, code, "runtime.payloadSha256");
    if (typeof record.runtime.matchesFrozen !== "boolean") fail(code, "runtime.matchesFrozen invalid");
  }
  exactKeys(record.telemetry, ["source", "workerDurationMs", "resourceUsage"], code, "workerObservation.telemetry");
  const telemetryTuple = [record.telemetry.source, record.telemetry.workerDurationMs, record.telemetry.resourceUsage];
  if (!telemetryTuple.every((value) => value === null) && !telemetryTuple.every((value) => value !== null)) fail(code, "telemetry tuple invalid");
  if (record.telemetry.source !== null) {
    if (record.telemetry.source !== "worker-self-reported-not-hard-isolation"
      || !Number.isInteger(record.telemetry.workerDurationMs) || record.telemetry.workerDurationMs < 0 || record.telemetry.workerDurationMs > 10_000) fail(code, "telemetry identity invalid");
    exactKeys(record.telemetry.resourceUsage, ["maxRssKiB", "userCpuMicros", "systemCpuMicros"], code, "resourceUsage");
    for (const value of Object.values(record.telemetry.resourceUsage)) if (!Number.isInteger(value) || value < 0) fail(code, "resource usage invalid");
  }
  exactKeys(record.parentWall, ["startedAt", "messageAt", "exitedAt", "finishedAt", "durationMs"], code, "workerObservation.parentWall");
  assertUtc(record.parentWall.startedAt, code, "parentWall.startedAt"); assertUtc(record.parentWall.finishedAt, code, "parentWall.finishedAt");
  const start = Date.parse(record.parentWall.startedAt); const finish = Date.parse(record.parentWall.finishedAt);
  if (!Number.isInteger(record.parentWall.durationMs) || record.parentWall.durationMs < 0 || record.parentWall.durationMs > 11_000
    || record.parentWall.durationMs !== finish - start || finish < start) fail(code, "parent wall duration invalid");
  for (const key of ["messageAt", "exitedAt"]) {
    const value = record.parentWall[key];
    if (value !== null) { assertUtc(value, code, `parentWall.${key}`); if (Date.parse(value) < start || Date.parse(value) > finish) fail(code, `parentWall.${key} outside attempt`); }
  }
  exactKeys(record.exit, ["confirmed", "exitCode", "signal", "terminationRequested"], code, "workerObservation.exit");
  if (typeof record.exit.confirmed !== "boolean" || typeof record.exit.terminationRequested !== "boolean") fail(code, "exit booleans invalid");
  const exitIdentityCount = Number(record.exit.exitCode !== null) + Number(record.exit.signal !== null);
  if ((record.exit.confirmed && exitIdentityCount !== 1) || (!record.exit.confirmed && exitIdentityCount !== 0)
    || record.message.received !== (record.parentWall.messageAt !== null)
    || record.exit.confirmed !== (record.parentWall.exitedAt !== null)) fail(code, "exit/parent observation tuple invalid");
  if (record.exit.exitCode !== null && (!Number.isInteger(record.exit.exitCode) || record.exit.exitCode < 0 || record.exit.exitCode > 255)) fail(code, "exitCode invalid");
  if (record.exit.signal !== null && (typeof record.exit.signal !== "string" || record.exit.signal.length < 1 || record.exit.signal.length > 40)) fail(code, "exit signal invalid");
  return true;
}

export function assertSafeRelativePath(value, code = "S06_PATH_INVALID", label = "relativePath") {
  if (typeof value !== "string" || value.length < 1 || value.includes("\\") || value.startsWith("/")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
    || !/^[A-Za-z0-9._:@/-]+$/u.test(value)) fail(code, `${label} is unsafe`);
  return true;
}

const REQUEST_KEYS = Object.freeze([
  "schemaVersion", "requestId", "mode", "operation", "definitionRef", "candidateRef", "contractRef", "manifestRef",
  "preregistrationRef", "runtimeAttestationRef", "hardwareRef", "adapterRef", "workerRef", "oracleRef", "sourceRef", "attempt",
  "expectedDisposition", "expectedStableErrorCode", "createdAt", "evidenceBoundary", "contentHash",
]);
const RESULT_KEYS = Object.freeze([
  "schemaVersion", "resultId", "requestRef", "idempotencyKeyHash", "mode", "operation", "attempt",
  "expectedDisposition", "expectedStableErrorCode", "status", "reasonCode", "workerInvoked", "diagnosticEnvelopeRef",
  "workerFailureEnvelopeRef", "diagnosticFacts", "publication", "startedAt", "finishedAt", "evidenceBoundary", "contentHash",
]);

export function validateSlice06RunRequest(record) {
  const code = "S06_RUN_REQUEST_INVALID";
  exactKeys(record, REQUEST_KEYS, code, "request");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.request || record.mode !== "open-diagnostic"
    || !OPERATIONS.includes(record.operation) || !EXPECTED_DISPOSITIONS.includes(record.expectedDisposition)) fail(code, "request discriminator invalid");
  assertId(record.requestId, code, "requestId"); assertAttempt(record.attempt, code);
  if (record.operation !== record.attempt.runId.split(".").find((part) => OPERATIONS.includes(part))
    && !record.attempt.runId.includes(record.operation)) fail(code, "runId does not bind operation");
  for (const key of ["definitionRef", "candidateRef", "contractRef", "manifestRef", "preregistrationRef", "runtimeAttestationRef", "hardwareRef", "sourceRef"]) {
    assertRecordRef(record[key], code, key);
  }
  assertImplementationRef(record.adapterRef, code, "adapterRef"); assertImplementationRef(record.workerRef, code, "workerRef");
  assertImplementationRef(record.oracleRef, code, "oracleRef");
  if (record.expectedDisposition === "applicable" ? record.expectedStableErrorCode !== null
    : typeof record.expectedStableErrorCode !== "string" || !/^S06_[A-Z0-9_]+$/u.test(record.expectedStableErrorCode)) {
    fail(code, "expected error/disposition binding invalid");
  }
  assertUtc(record.createdAt, code, "createdAt"); assertEvidence(record.evidenceBoundary, code); assertSelfHash(record, code);
  return true;
}

export function validateSlice06RunClaim(record) {
  const code = "S06_RUN_CLAIM_INVALID";
  exactKeys(record, Object.keys(SCHEMA_BY_KEY.runClaim.properties), code, "claim");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.claim || record.mode !== "open-diagnostic" || !OPERATIONS.includes(record.operation)) fail(code, "claim discriminator invalid");
  assertId(record.claimId, code, "claimId"); assertShortRef(record.requestRef, code, "requestRef"); assertSha(record.idempotencyKeyHash, code, "idempotencyKeyHash");
  assertAttempt(record.attempt, code); assertUtc(record.claimedAt, code, "claimedAt"); assertSelfHash(record, code);
  const expectedHash = sha256Slice06(Buffer.from(record.attempt.idempotencyKey, "utf8"));
  if (record.idempotencyKeyHash !== expectedHash || record.claimId !== `claim.${expectedHash}` || !record.attempt.runId.includes(record.operation)) fail(code, "claim identity binding invalid");
  return true;
}

export function validateSlice06RunEvent(record) {
  const code = "S06_RUN_EVENT_INVALID";
  exactKeys(record, Object.keys(SCHEMA_BY_KEY.runEvent.properties), code, "event");
  const types = new Set(["attempt-registered", "closure-publication-intent", "closure-publication-complete", "attempt-terminal"]);
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.event || record.mode !== "open-diagnostic" || !OPERATIONS.includes(record.operation)
    || !types.has(record.eventType) || !Number.isInteger(record.sequence) || record.sequence < 1) fail(code, "event discriminator invalid");
  assertId(record.eventId, code, "eventId"); assertShortRef(record.requestRef, code, "requestRef");
  assertSha(record.idempotencyKeyHash, code, "idempotencyKeyHash"); assertSha(record.previousEventHash, code, "previousEventHash");
  assertAttempt(record.attempt, code); assertUtc(record.occurredAt, code, "occurredAt");
  if (record.status !== null && !TERMINAL_STATUSES.includes(record.status)) fail(code, "event status invalid");
  if (record.reasonCode !== null && (typeof record.reasonCode !== "string" || !/^S06_[A-Z0-9_]+$/u.test(record.reasonCode))) fail(code, "event reason invalid");
  if (record.publication !== null) validateSlice06ClosurePublication(record.publication, code);
  if (record.eventType === "attempt-registered" && (record.status !== null || record.reasonCode !== null || record.publication !== null)) fail(code, "registration event carries outcome");
  if (record.eventType === "closure-publication-intent" && (record.status !== null || record.reasonCode !== null || record.publication === null)) fail(code, "publication intent tuple invalid");
  if (record.eventType === "closure-publication-complete" && (record.status === null || record.publication === null)) fail(code, "publication complete tuple invalid");
  if (record.eventType === "attempt-terminal" && record.status === null) fail(code, "terminal event lacks status");
  assertSelfHash(record, code); return true;
}

export function validateSlice06RegisteredRun(record) {
  const code = "S06_REGISTERED_RUN_INVALID";
  exactKeys(record, Object.keys(SCHEMA_BY_KEY.registeredRun.properties), code, "registeredRun");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.registeredRun || record.mode !== "open-diagnostic" || !OPERATIONS.includes(record.operation)
    || record.sourceCount !== 4 || record.attemptCount !== 12 || record.replacementAttemptCount !== 0) fail(code, "registered run denominator invalid");
  assertId(record.registeredRunId, code, "registeredRunId"); assertId(record.runId, code, "runId");
  assertRecordRef(record.definitionRef, code, "definitionRef"); assertRecordRef(record.preregistrationRef, code, "preregistrationRef");
  assertUtc(record.registeredAt, code, "registeredAt"); assertSelfHash(record, code); return true;
}

export function validateSlice06RunResult(record) {
  const code = "S06_RUN_RESULT_INVALID";
  exactKeys(record, RESULT_KEYS, code, "result");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.result || record.mode !== "open-diagnostic"
    || !OPERATIONS.includes(record.operation) || !TERMINAL_STATUSES.includes(record.status)
    || !EXPECTED_DISPOSITIONS.includes(record.expectedDisposition)) fail(code, "result discriminator invalid");
  if (record.expectedDisposition === "applicable" ? record.expectedStableErrorCode !== null
    : typeof record.expectedStableErrorCode !== "string" || !/^S06_[A-Z0-9_]+$/u.test(record.expectedStableErrorCode)) fail(code, "result expected disposition/error binding invalid");
  assertId(record.resultId, code, "resultId"); assertAttempt(record.attempt, code); assertSha(record.idempotencyKeyHash, code, "idempotencyKeyHash");
  exactKeys(record.requestRef, ["id", "contentHash"], code, "requestRef"); assertId(record.requestRef.id, code, "requestRef.id"); assertSha(record.requestRef.contentHash, code, "requestRef.contentHash");
  if ((record.diagnosticEnvelopeRef === null) !== (record.diagnosticFacts === null)
    || (record.publication === null) !== (record.diagnosticFacts === null)) fail(code, "diagnostic closure tuple must be all-or-none");
  if (record.diagnosticFacts !== null) {
    exactKeys(record.diagnosticEnvelopeRef, ["id", "contentHash", "relativePath"], code, "diagnosticEnvelopeRef");
    assertId(record.diagnosticEnvelopeRef.id, code, "diagnosticEnvelopeRef.id"); assertSha(record.diagnosticEnvelopeRef.contentHash, code, "diagnosticEnvelopeRef.contentHash");
    assertSafeRelativePath(record.diagnosticEnvelopeRef.relativePath, code, "diagnosticEnvelopeRef.relativePath");
    validateDiagnosticFacts(record.diagnosticFacts, code); validatePublication(record.publication, record, code);
    if (!record.workerInvoked || !new Set(["characterized-oracle-pass", "characterized-oracle-non-pass"]).has(record.status)) fail(code, "output closure status invalid");
  }
  if (record.workerFailureEnvelopeRef !== null) {
    exactKeys(record.workerFailureEnvelopeRef, ["id", "contentHash", "relativePath"], code, "workerFailureEnvelopeRef");
    assertId(record.workerFailureEnvelopeRef.id, code, "workerFailureEnvelopeRef.id"); assertSha(record.workerFailureEnvelopeRef.contentHash, code, "workerFailureEnvelopeRef.contentHash");
    assertSafeRelativePath(record.workerFailureEnvelopeRef.relativePath, code, "workerFailureEnvelopeRef.relativePath");
    const expectedStatus = RECONCILIATION_UNKNOWN_CODES.has(record.reasonCode) ? "inconclusive" : "protocol-failed";
    if (!record.workerInvoked || record.status !== expectedStatus || record.diagnosticEnvelopeRef !== null) fail(code, "worker failure envelope status invalid");
  }
  if (record.status === "protocol-failed" && record.workerInvoked && record.workerFailureEnvelopeRef === null) fail(code, "spawned worker failure must retain its observation envelope");
  if (record.status === "inconclusive" && record.workerInvoked
    && (record.workerFailureEnvelopeRef === null || !RECONCILIATION_UNKNOWN_CODES.has(record.reasonCode))) {
    fail(code, "spawned inconclusive result must be an exact reconciliation-unknown worker failure");
  }
  if (record.workerFailureEnvelopeRef !== null && record.publication !== null) fail(code, "worker failure cannot masquerade as an output closure");
  if (record.status === "characterized-preflight-rejection" && (record.workerInvoked || record.reasonCode !== record.expectedStableErrorCode)) {
    fail(code, "preflight rejection must be exact and worker-free");
  }
  if (record.status === "characterized-preflight-rejection" && record.expectedDisposition !== "preflight-reject") fail(code, "applicable result cannot become a preflight sentinel");
  if (new Set(["characterized-oracle-pass", "characterized-oracle-non-pass"]).has(record.status)
    && record.expectedDisposition !== "applicable") fail(code, "preflight sentinel cannot become an oracle output case");
  if (record.status === "characterized-oracle-pass" && (record.reasonCode !== null || record.diagnosticFacts?.strictDecision !== "pass")) fail(code, "oracle pass result invalid");
  if (record.status === "characterized-oracle-non-pass" && (record.reasonCode !== "S06_OUTPUT_ORACLE_REJECTED" || record.diagnosticFacts?.strictDecision !== "non-pass")) fail(code, "oracle nonpass result invalid");
  assertUtc(record.startedAt, code, "startedAt"); assertUtc(record.finishedAt, code, "finishedAt");
  if (Date.parse(record.finishedAt) < Date.parse(record.startedAt)) fail(code, "result timestamps reversed");
  assertEvidence(record.evidenceBoundary, code); assertSelfHash(record, code);
  return true;
}

function validateDiagnosticFacts(value, code) {
  exactKeys(value, ["strictDecision", "candidateOutputByteLength", "candidateOutputFileSha256", "candidateOutputDecodedPixelSha256", "oraclePrimaryCode", "oracleFindingCodes", "workerRuntimePayloadSha256", "workerExitConfirmed", "workerExitCode", "workerExitSignal", "telemetryComplete"], code, "diagnosticFacts");
  if (!new Set(["pass", "non-pass"]).has(value.strictDecision) || !Number.isInteger(value.candidateOutputByteLength)
    || value.candidateOutputByteLength < 1 || value.candidateOutputByteLength > MAX_OUTPUT_BYTES
    || !Array.isArray(value.oracleFindingCodes) || value.workerExitConfirmed !== true || value.workerExitCode !== 0
    || value.workerExitSignal !== null || value.telemetryComplete !== true) fail(code, "diagnosticFacts invalid");
  assertSha(value.candidateOutputFileSha256, code, "candidateOutputFileSha256"); assertSha(value.workerRuntimePayloadSha256, code, "workerRuntimePayloadSha256");
  if (value.candidateOutputDecodedPixelSha256 !== null) assertSha(value.candidateOutputDecodedPixelSha256, code, "candidateOutputDecodedPixelSha256");
  for (const item of value.oracleFindingCodes) if (typeof item !== "string" || !/^S06_[A-Z0-9_]+$/u.test(item)) fail(code, "oracle finding code invalid");
  if (value.strictDecision === "pass" ? value.oraclePrimaryCode !== null
    : typeof value.oraclePrimaryCode !== "string" || !/^S06_[A-Z0-9_]+$/u.test(value.oraclePrimaryCode)) fail(code, "oracle primary code invalid");
}

export function validateSlice06ClosurePublication(value, code = "S06_PUBLICATION_INVALID") {
  exactKeys(value, ["rootRelativePath", "atomicDirectoryCommit", "rolePaths"], code, "publication");
  if (value.atomicDirectoryCommit !== true) fail(code, "publication must be atomic");
  assertSafeRelativePath(value.rootRelativePath, code, "publication.rootRelativePath");
  exactKeys(value.rolePaths, ["candidateOutput", "candidateOutputObservation", "oracleDiagnostic", "diagnosticEnvelope", "terminalResult"], code, "publication.rolePaths");
  for (const relativePath of Object.values(value.rolePaths)) {
    assertSafeRelativePath(relativePath, code, "publication role path");
    if (!relativePath.startsWith(`${value.rootRelativePath}/`) || relativePath.split("/").includes("artifacts")) fail(code, "publication escaped diagnostic root");
  }
  return true;
}

function validatePublication(value, result, code) {
  validateSlice06ClosurePublication(value, code);
  if (value.rolePaths.diagnosticEnvelope !== result.diagnosticEnvelopeRef.relativePath) fail(code, "envelope path differs from ref");
}

export function requestIdSlice06({ operation, sourceId, repetition }) {
  assertId(sourceId, "S06_RUN_REQUEST_INVALID", "sourceId", { pathSegment: true });
  if (!OPERATIONS.includes(operation) || ![1, 2, 3].includes(repetition)) fail("S06_RUN_REQUEST_INVALID", "request identity input invalid");
  return `request.open-diagnostic.${operation}.${sha256Slice06(Buffer.from(sourceId, "utf8")).slice(0, 16)}.r${repetition}.a1`;
}

function requestRef(request) { return { id: request.requestId, contentHash: request.contentHash }; }
function idempotencyHash(request) { return sha256Slice06(Buffer.from(request.attempt.idempotencyKey, "utf8")); }
function resultId(keyHash) { return `result.${keyHash}`; }
function resultRef(result, relativePath) { return { id: result.resultId, contentHash: result.contentHash, relativePath }; }

export function candidateOutputRelativePathSlice06(request, strictDecision) {
  validateSlice06RunRequest(request);
  if (!new Set(["pass", "non-pass"]).has(strictDecision)) fail("S06_PUBLICATION_INVALID", "strictDecision invalid");
  const root = strictDecision === "pass" ? "specimens" : "quarantine";
  return `${root}/${request.operation}/${request.attempt.sourceId}/r${request.attempt.repetition}/${OUTPUT_FILENAMES.bytes}`;
}

export function closureRolePathsSlice06(request, strictDecision) {
  const bytes = candidateOutputRelativePathSlice06(request, strictDecision);
  const rootRelativePath = bytes.slice(0, -(`/${OUTPUT_FILENAMES.bytes}`.length));
  return {
    rootRelativePath,
    atomicDirectoryCommit: true,
    rolePaths: {
      candidateOutput: bytes,
      candidateOutputObservation: `${rootRelativePath}/${OUTPUT_FILENAMES.observation}`,
      oracleDiagnostic: `${rootRelativePath}/${OUTPUT_FILENAMES.oracle}`,
      diagnosticEnvelope: `${rootRelativePath}/${OUTPUT_FILENAMES.envelope}`,
      terminalResult: `${rootRelativePath}/${OUTPUT_FILENAMES.terminal}`,
    },
  };
}

async function atomicWriteNew(filename, bytes) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temp = `${filename}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  const handle = await open(temp, "wx");
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  try {
    await link(temp, filename);
    await syncDirectoryBestEffort(path.dirname(filename));
  } finally {
    await unlink(temp).catch(() => {});
  }
}
async function atomicWriteJsonNew(filename, value) { return atomicWriteNew(filename, Buffer.from(stableStringifySlice06(value), "utf8")); }

async function writeSyncedNew(filename, bytes) {
  const handle = await open(filename, "wx");
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}

async function syncDirectoryBestEffort(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (process.platform !== "win32" || !new Set(["EISDIR", "EPERM", "EINVAL", "EBADF", "EACCES"]).has(error?.code)) throw error;
  } finally { await handle?.close().catch(() => {}); }
}

async function appendLedger(resultsRoot, operation, state, details, clock) {
  const occurredAt = clock();
  assertNotBefore(occurredAt, state.lastOccurredAt, "S06_LEDGER_TIME_INVALID", "ledger event");
  const event = withHash({
    schemaVersion: SLICE06_RUNNER_VERSIONS.event,
    eventId: `event.${operation}.${state.sequence + 1}`,
    sequence: state.sequence + 1,
    previousEventHash: state.previousEventHash,
    ...details,
    occurredAt,
  });
  validateSlice06RunEvent(event);
  await mkdir(path.join(resultsRoot, "ledger"), { recursive: true });
  const jsonLine = `${JSON.stringify(JSON.parse(stableStringifySlice06(event)))}\n`;
  const ledgerDirectory = path.join(resultsRoot, "ledger");
  const handle = await open(path.join(ledgerDirectory, `${operation}.ndjson`), "a");
  try { await handle.writeFile(jsonLine, "utf8"); await handle.sync(); } finally { await handle.close(); }
  await syncDirectoryBestEffort(ledgerDirectory);
  state.sequence = event.sequence;
  state.previousEventHash = event.contentHash;
  state.lastOccurredAt = event.occurredAt;
  return event;
}

function validateRegisteredRequests(operation, requests) {
  if (!OPERATIONS.includes(operation) || !Array.isArray(requests) || requests.length !== 12) {
    fail("S06_REGISTERED_DENOMINATOR_INVALID", "operation requires exactly 12 requests");
  }
  for (const request of requests) {
    validateSlice06RunRequest(request);
    if (request.operation !== operation) fail("S06_REGISTERED_DENOMINATOR_INVALID", "cross-operation request found");
  }
  const runIds = new Set(requests.map(({ attempt }) => attempt.runId));
  if (runIds.size !== 1) fail("S06_REGISTERED_DENOMINATOR_INVALID", "operation must use one runId");
  const groups = groupBySource(requests);
  if (groups.size !== 4) fail("S06_REGISTERED_DENOMINATOR_INVALID", "operation requires four source units");
  let applicable = 0;
  let sentinel = 0;
  for (const entries of groups.values()) {
    const repetitions = entries.map(({ attempt }) => attempt.repetition).toSorted();
    if (stableStringifySlice06(repetitions) !== stableStringifySlice06([1, 2, 3])
      || new Set(entries.map(({ expectedDisposition }) => expectedDisposition)).size !== 1) {
      fail("S06_REGISTERED_DENOMINATOR_INVALID", "each source requires exact repetitions 1,2,3 and one disposition");
    }
    if (entries[0].expectedDisposition === "applicable") applicable += 1; else sentinel += 1;
  }
  if (applicable !== 3 || sentinel !== 1) fail("S06_REGISTERED_DENOMINATOR_INVALID", "operation requires 3 applicable plus 1 sentinel");
  const identities = requests.flatMap((request) => [request.requestId, request.attempt.idempotencyKey]);
  if (new Set(identities).size !== identities.length) fail("S06_REGISTERED_DENOMINATOR_INVALID", "request/idempotency identities collide");
  return [...requests].sort((left, right) => left.attempt.sourceId.localeCompare(right.attempt.sourceId, "en")
    || left.attempt.repetition - right.attempt.repetition);
}

function envelopeIdentity(record) {
  const id = record?.diagnosticEnvelopeId;
  if (typeof id !== "string") fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "diagnostic envelope id is missing");
  assertId(id, "S06_DIAGNOSTIC_CLOSURE_INVALID", "diagnosticEnvelopeId");
  assertSha(record.contentHash, "S06_DIAGNOSTIC_CLOSURE_INVALID", "diagnosticEnvelope.contentHash");
  return { id, contentHash: record.contentHash };
}

function executionFacts(execution, outputBytes) {
  const verification = execution?.verification ?? execution?.oracleDiagnostic?.verification;
  const envelope = execution?.diagnosticEnvelope;
  const strictDecision = execution?.strictDecision ?? execution?.outputObservation?.strictDecision ?? verification?.overallStatus;
  if (!new Set(["pass", "non-pass"]).has(strictDecision) || envelope?.strictDecision !== strictDecision) {
    fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "strict decision is not cross-bound");
  }
  const runtimeHash = envelope?.worker?.runtime?.payloadSha256;
  const exit = envelope?.worker?.exit;
  assertSha(runtimeHash, "S06_DIAGNOSTIC_CLOSURE_INVALID", "envelope.worker.runtime.payloadSha256");
  if (envelope?.worker?.message?.received !== true || envelope.worker.message.status !== "succeeded"
    || envelope.worker.runtime.matchesFrozen !== true
    || envelope.worker.telemetry?.source !== "worker-self-reported-not-hard-isolation"
    || !Number.isInteger(envelope.worker.telemetry.workerDurationMs)
    || !isPlainObject(envelope.worker.telemetry.resourceUsage)) {
    fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "oracle output requires a complete successful worker observation");
  }
  if (exit?.confirmed !== true || exit.exitCode !== 0 || exit.signal !== null) fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "clean worker exit is required");
  const findings = verification?.findings;
  if (!Array.isArray(findings)) fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "oracle findings missing");
  const primaryCode = verification.primaryCode;
  if (strictDecision === "pass" ? primaryCode !== null : typeof primaryCode !== "string") fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "oracle primary code invalid");
  return {
    strictDecision,
    candidateOutputByteLength: outputBytes.byteLength,
    candidateOutputFileSha256: sha256Slice06(outputBytes),
    candidateOutputDecodedPixelSha256: verification.actualBytes?.decodedPixelSha256 ?? null,
    oraclePrimaryCode: primaryCode,
    oracleFindingCodes: [...new Set(findings.map(({ code }) => code))].sort(),
    workerRuntimePayloadSha256: runtimeHash,
    workerExitConfirmed: true,
    workerExitCode: 0,
    workerExitSignal: null,
    telemetryComplete: true,
  };
}

function shortRecordRef(recordRef) { return { id: recordRef.id, contentHash: recordRef.contentHash }; }
function assertSame(value, expected, code, label) {
  if (stableStringifySlice06(value) !== stableStringifySlice06(expected)) fail(code, `${label} binding mismatch`);
}

function validateExecutionBindings(request, execution, terminalDraft) {
  const code = "S06_DIAGNOSTIC_CLOSURE_BINDING_MISMATCH";
  const keyHash = idempotencyHash(request);
  const output = execution.outputObservation;
  const oracle = execution.oracleDiagnostic;
  const envelope = execution.diagnosticEnvelope;
  if (output?.candidateOutputObservationId !== `candidate-output-observation.${keyHash}`
    || oracle?.oracleDiagnosticId !== `oracle-diagnostic.${keyHash}`
    || envelope?.diagnosticEnvelopeId !== `diagnostic-envelope.${keyHash}`) fail(code, "diagnostic IDs do not derive from the current idempotency key");
  assertSame(output.requestRef, requestRef(request), code, "candidateOutputObservation.requestRef");
  assertSame(output.attempt, request.attempt, code, "candidateOutputObservation.attempt");
  if (output.operation !== request.operation) fail(code, "candidate output operation mismatch");
  assertSame(output.candidateRef, shortRecordRef(request.candidateRef), code, "candidateOutputObservation.candidateRef");
  assertSame(output.adapterRef, request.adapterRef, code, "candidateOutputObservation.adapterRef");
  assertSame(output.workerRef, request.workerRef, code, "candidateOutputObservation.workerRef");
  assertSame(output.runtimeRef, shortRecordRef(request.runtimeAttestationRef), code, "candidateOutputObservation.runtimeRef");
  assertSame(output.hardwareRef, shortRecordRef(request.hardwareRef), code, "candidateOutputObservation.hardwareRef");
  assertSame(oracle.requestRef, requestRef(request), code, "oracleDiagnostic.requestRef");
  assertSame(oracle.attempt, request.attempt, code, "oracleDiagnostic.attempt");
  assertSame(oracle.oracleRef, request.oracleRef, code, "oracleDiagnostic.oracleRef");
  if (oracle.operation !== request.operation || oracle.verification?.operation !== request.operation) fail(code, "oracle operation mismatch");
  assertSame(execution.verification, oracle.verification, code, "execution/oracle verification");
  assertSame(oracle.candidateOutputObservationRef, { id: output.candidateOutputObservationId, contentHash: output.contentHash }, code, "oracle output ref");
  assertSame(envelope.requestRef, requestRef(request), code, "diagnosticEnvelope.requestRef");
  assertSame(envelope.attempt, request.attempt, code, "diagnosticEnvelope.attempt");
  if (envelope.operation !== request.operation) fail(code, "envelope operation mismatch");
  assertSame(envelope.candidateOutputObservationRef, { id: output.candidateOutputObservationId, contentHash: output.contentHash }, code, "envelope output ref");
  assertSame(envelope.oracleDiagnosticRef, { id: oracle.oracleDiagnosticId, contentHash: oracle.contentHash }, code, "envelope oracle ref");
  const expectedOutcomeClass = oracle.verification.overallStatus === "pass" ? "oracle-pass" : "oracle-nonpass";
  if (output.strictDecision !== oracle.verification.overallStatus || envelope.strictDecision !== oracle.verification.overallStatus
    || envelope.outcomeClass !== expectedOutcomeClass || envelope.primaryCode !== oracle.verification.primaryCode) fail(code, "strict classification mismatch");
  assertSame(envelope.secondaryCodes, oracle.verification.findings.map(({ code: findingCode }) => findingCode)
    .filter((findingCode) => findingCode !== oracle.verification.primaryCode).filter((findingCode, index, values) => values.indexOf(findingCode) === index).sort(), code, "envelope secondaryCodes");
  assertSame(envelope.rights, output.rights, code, "envelope.rights");
  assertSame(envelope.retention, output.retention, code, "envelope.retention");
  assertSame(envelope.publication, { state: "not-published", transactionId: null, publishedAt: null, fileRoles: [] }, code, "envelope precommit publication");
  assertSame(envelope.cleanup, { state: "unknown", stagingRemoved: null, confirmedAt: null }, code, "envelope precommit cleanup");
  validateSlice06WorkerObservation(execution.workerObservation);
  assertSame(envelope.worker, execution.workerObservation, code, "envelope.worker");
  assertNotBefore(terminalDraft.startedAt, request.createdAt, code, "request/result start");
  assertNotBefore(execution.workerObservation.parentWall.startedAt, terminalDraft.startedAt, code, "result/worker start");
  assertNotBefore(output.producedAt, execution.workerObservation.parentWall.startedAt, code, "worker/output");
  assertNotBefore(oracle.observedAt, output.producedAt, code, "output/oracle");
  assertNotBefore(envelope.createdAt, oracle.observedAt, code, "oracle/envelope");
  assertNotBefore(terminalDraft.finishedAt, envelope.createdAt, code, "envelope/result finish");
}

async function publishFiveRoleClosure({ resultsRoot, request, execution, terminalDraft, validators, postRenameSyncHook }) {
  const outputBytes = execution?.outputBytes;
  if (!(outputBytes instanceof Uint8Array) || outputBytes.byteLength < 1 || outputBytes.byteLength > MAX_OUTPUT_BYTES) {
    fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "candidate output bytes missing or over limit");
  }
  const facts = executionFacts(execution, outputBytes);
  const publication = closureRolePathsSlice06(request, facts.strictDecision);
  validators.validateOutputObservation(execution.outputObservation);
  validators.validateOracleDiagnostic(execution.oracleDiagnostic);
  validators.validateDiagnosticEnvelope(execution.diagnosticEnvelope);
  validateExecutionBindings(request, execution, terminalDraft);
  const expectedOutputPath = publication.rolePaths.candidateOutput;
  const retainedPath = execution.outputObservation?.bytes?.relativePath;
  if (retainedPath !== expectedOutputPath) fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "output observation path differs from publication");
  if (execution.outputObservation.bytes.byteLength !== outputBytes.byteLength
    || execution.outputObservation.bytes.fileSha256 !== facts.candidateOutputFileSha256
    || execution.oracleDiagnostic.verification.actualBytes?.byteLength !== outputBytes.byteLength
    || execution.oracleDiagnostic.verification.actualBytes?.fileSha256 !== facts.candidateOutputFileSha256) {
    fail("S06_DIAGNOSTIC_CLOSURE_INVALID", "candidate output bytes differ from their durable observation");
  }
  const envelope = envelopeIdentity(execution.diagnosticEnvelope);
  const terminal = withHash({
    ...terminalDraft,
    status: facts.strictDecision === "pass" ? "characterized-oracle-pass" : "characterized-oracle-non-pass",
    reasonCode: facts.strictDecision === "pass" ? null : "S06_OUTPUT_ORACLE_REJECTED",
    workerInvoked: true,
    diagnosticEnvelopeRef: { ...envelope, relativePath: publication.rolePaths.diagnosticEnvelope },
    diagnosticFacts: facts,
    publication,
  });
  validateSlice06RunResult(terminal);
  const keyHash = idempotencyHash(request);
  const stage = path.join(resultsRoot, ".staging", keyHash);
  const finalRoot = path.join(resultsRoot, ...publication.rootRelativePath.split("/"));
  await mkdir(path.dirname(stage), { recursive: true });
  await mkdir(stage, { recursive: false });
  try {
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.bytes), outputBytes);
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.observation), stableStringifySlice06(execution.outputObservation));
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.oracle), stableStringifySlice06(execution.oracleDiagnostic));
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.envelope), stableStringifySlice06(execution.diagnosticEnvelope));
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.terminal), stableStringifySlice06(terminal));
    await syncDirectoryBestEffort(stage);
    await mkdir(path.dirname(finalRoot), { recursive: true });
    await rename(stage, finalRoot);
  } catch (cause) {
    try { await rm(stage, { recursive: true, force: true }); } catch (cleanupCause) {
      fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "five-role staging cleanup could not be confirmed after a failed commit", { cause: new AggregateError([cause, cleanupCause]) });
    }
    fail("S06_DIAGNOSTIC_CLOSURE_COMMIT_FAILED", "five-role closure did not commit atomically", { cause });
  }
  try {
    await postRenameSyncHook({ closureKind: "five-role-output", finalRoot });
    await syncDirectoryBestEffort(path.dirname(finalRoot));
  } catch (cause) {
    fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "five-role closure renamed but parent directory durability could not be confirmed", { cause });
  }
  return { terminal, terminalRelativePath: publication.rolePaths.terminalResult };
}

export function validateSlice06WorkerFailureEnvelope(record) {
  const code = "S06_WORKER_FAILURE_ENVELOPE_INVALID";
  exactKeys(record, ["schemaVersion", "workerFailureEnvelopeId", "mode", "operation", "requestRef", "attempt", "reasonCode", "workerObservation", "createdAt", "evidenceBoundary", "contentHash"], code, "workerFailureEnvelope");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.workerFailureEnvelope || record.mode !== "open-diagnostic"
    || !OPERATIONS.includes(record.operation) || typeof record.reasonCode !== "string" || !/^S06_[A-Z0-9_]+$/u.test(record.reasonCode)) fail(code, "failure envelope discriminator invalid");
  assertId(record.workerFailureEnvelopeId, code, "workerFailureEnvelopeId"); assertShortRef(record.requestRef, code, "requestRef");
  assertAttempt(record.attempt, code); validateSlice06WorkerObservation(record.workerObservation);
  assertUtc(record.createdAt, code, "createdAt"); assertEvidence(record.evidenceBoundary, code); assertSelfHash(record, code);
  const expectedId = `worker-failure-envelope.${sha256Slice06(Buffer.from(record.attempt.idempotencyKey, "utf8"))}`;
  if (record.workerFailureEnvelopeId !== expectedId) fail(code, "failure envelope id is not derived from attempt identity");
  assertNotBefore(record.createdAt, record.workerObservation.parentWall.finishedAt, code, "worker/failure envelope");
  return true;
}

function failureRolePaths(request) {
  const rootRelativePath = `failures/${request.operation}/${request.attempt.sourceId}/r${request.attempt.repetition}`;
  return {
    rootRelativePath,
    observation: `${rootRelativePath}/${OUTPUT_FILENAMES.failureObservation}`,
    envelope: `${rootRelativePath}/${OUTPUT_FILENAMES.failureEnvelope}`,
    terminal: `${rootRelativePath}/${OUTPUT_FILENAMES.terminal}`,
  };
}

async function publishWorkerFailureClosure({ resultsRoot, request, reasonCode, workerObservation, terminalDraft, postRenameSyncHook }) {
  validateSlice06WorkerObservation(workerObservation);
  const paths = failureRolePaths(request);
  const envelope = withHash({
    schemaVersion: SLICE06_RUNNER_VERSIONS.workerFailureEnvelope,
    workerFailureEnvelopeId: `worker-failure-envelope.${idempotencyHash(request)}`,
    mode: "open-diagnostic", operation: request.operation, requestRef: requestRef(request),
    attempt: structuredClone(request.attempt), reasonCode, workerObservation: structuredClone(workerObservation),
    createdAt: terminalDraft.finishedAt, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  });
  validateSlice06WorkerFailureEnvelope(envelope);
  assertNotBefore(workerObservation.parentWall.startedAt, request.createdAt, "S06_WORKER_FAILURE_ENVELOPE_INVALID", "request/worker start");
  const terminal = withHash({
    ...terminalDraft, status: RECONCILIATION_UNKNOWN_CODES.has(reasonCode) ? "inconclusive" : "protocol-failed",
    reasonCode, workerInvoked: true,
    diagnosticEnvelopeRef: null,
    workerFailureEnvelopeRef: { id: envelope.workerFailureEnvelopeId, contentHash: envelope.contentHash, relativePath: paths.envelope },
    diagnosticFacts: null, publication: null,
  });
  validateSlice06RunResult(terminal);
  const stage = path.join(resultsRoot, ".staging", `failure-${idempotencyHash(request)}`);
  const finalRoot = path.join(resultsRoot, ...paths.rootRelativePath.split("/"));
  await mkdir(path.dirname(stage), { recursive: true });
  await mkdir(stage, { recursive: false });
  try {
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.failureObservation), stableStringifySlice06(workerObservation));
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.failureEnvelope), stableStringifySlice06(envelope));
    await writeSyncedNew(path.join(stage, OUTPUT_FILENAMES.terminal), stableStringifySlice06(terminal));
    await syncDirectoryBestEffort(stage);
    await mkdir(path.dirname(finalRoot), { recursive: true });
    await rename(stage, finalRoot);
  } catch (cause) {
    try { await rm(stage, { recursive: true, force: true }); } catch (cleanupCause) {
      fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "worker-failure staging cleanup could not be confirmed after a failed commit", { cause: new AggregateError([cause, cleanupCause]) });
    }
    fail("S06_WORKER_FAILURE_CLOSURE_COMMIT_FAILED", "worker failure observation closure did not commit atomically", { cause });
  }
  try {
    await postRenameSyncHook({ closureKind: "three-role-worker-failure", finalRoot });
    await syncDirectoryBestEffort(path.dirname(finalRoot));
  } catch (cause) {
    fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "worker failure closure renamed but parent directory durability could not be confirmed", { cause });
  }
  return { terminal, terminalRelativePath: paths.terminal };
}

function standaloneTerminalRelativePath(request) { return `records/${idempotencyHash(request)}.result.json`; }
function terminalBase(request, startedAt, finishedAt) {
  return {
    schemaVersion: SLICE06_RUNNER_VERSIONS.result,
    resultId: resultId(idempotencyHash(request)),
    requestRef: requestRef(request), idempotencyKeyHash: idempotencyHash(request), mode: "open-diagnostic",
    operation: request.operation, attempt: structuredClone(request.attempt), expectedDisposition: request.expectedDisposition,
    expectedStableErrorCode: request.expectedStableErrorCode,
    workerFailureEnvelopeRef: null,
    startedAt, finishedAt, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  };
}

async function countExistingOutputBytes(root) {
  let total = 0;
  async function visit(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile() && entry.name === OUTPUT_FILENAMES.bytes) total += (await stat(filename)).size;
    }
  }
  await visit(path.join(root, "specimens")); await visit(path.join(root, "quarantine"));
  return total;
}

function validatorsOrFail(validators) {
  const keys = ["validateOutputObservation", "validateOracleDiagnostic", "validateDiagnosticEnvelope"];
  if (!isPlainObject(validators) || keys.some((key) => typeof validators[key] !== "function")) {
    fail("S06_RUNNER_CONFIGURATION_INVALID", "three oracle-owned diagnostic validators are required");
  }
  return validators;
}

export function createSlice06DiagnosticRunner({
  resultsRoot,
  validators,
  clock = () => new Date().toISOString(),
  publicationCompletionHook = () => {},
  postRenameSyncHook = () => {},
} = {}) {
  if (typeof resultsRoot !== "string" || !path.isAbsolute(resultsRoot) || typeof clock !== "function"
    || typeof publicationCompletionHook !== "function" || typeof postRenameSyncHook !== "function") {
    fail("S06_RUNNER_CONFIGURATION_INVALID", "absolute resultsRoot, clock and publication hooks are required");
  }
  const checkedValidators = validatorsOrFail(validators);
  return Object.freeze({
    async runOperation({ operation, requests, execute }) {
      if (typeof execute !== "function") fail("S06_RUNNER_CONFIGURATION_INVALID", "execute dependency required");
      const ordered = validateRegisteredRequests(operation, requests);
      const runId = ordered[0].attempt.runId;
      const definitionRef = ordered[0].definitionRef;
      const preregistrationRef = ordered[0].preregistrationRef;
      for (const request of ordered) {
        if (stableStringifySlice06(request.definitionRef) !== stableStringifySlice06(definitionRef)
          || stableStringifySlice06(request.preregistrationRef) !== stableStringifySlice06(preregistrationRef)) {
          fail("S06_REGISTERED_DENOMINATOR_INVALID", "definition/preregistration drift within operation");
        }
      }
      const registeredAt = clock();
      assertUtc(registeredAt, "S06_REGISTERED_RUN_TIME_INVALID", "registeredAt");
      for (const request of ordered) assertNotBefore(registeredAt, request.createdAt, "S06_REGISTERED_RUN_TIME_INVALID", "request/registration");
      const marker = withHash({
        schemaVersion: SLICE06_RUNNER_VERSIONS.registeredRun,
        registeredRunId: `registered-run.${operation}.${sha256Slice06(Buffer.from(runId, "utf8")).slice(0, 16)}`,
        mode: "open-diagnostic", operation, runId, definitionRef: structuredClone(definitionRef),
        preregistrationRef: structuredClone(preregistrationRef), sourceCount: 4, attemptCount: 12,
        replacementAttemptCount: 0, registeredAt,
      });
      validateSlice06RegisteredRun(marker);
      await atomicWriteJsonNew(path.join(resultsRoot, "runs", `${operation}.registered-run.json`), marker).catch((cause) => {
        fail("S06_OPERATION_ALREADY_REGISTERED", `${operation} already has a registered run`, { cause });
      });
      const ledger = { sequence: 0, previousEventHash: ZERO_SHA256, lastOccurredAt: registeredAt };
      const prepared = [];
      for (const request of ordered) {
        const keyHash = idempotencyHash(request);
        const claimedAt = clock();
        assertNotBefore(claimedAt, registeredAt, "S06_CLAIM_TIME_INVALID", "registration/claim");
        assertNotBefore(claimedAt, request.createdAt, "S06_CLAIM_TIME_INVALID", "request/claim");
        const claim = withHash({
          schemaVersion: SLICE06_RUNNER_VERSIONS.claim, claimId: `claim.${keyHash}`,
          requestRef: requestRef(request), idempotencyKeyHash: keyHash, mode: "open-diagnostic", operation,
          attempt: structuredClone(request.attempt), claimedAt,
        });
        validateSlice06RunClaim(claim);
        await atomicWriteJsonNew(path.join(resultsRoot, "requests", `${keyHash}.request.json`), request);
        await atomicWriteJsonNew(path.join(resultsRoot, "claims", `${keyHash}.claim.json`), claim);
        await appendLedger(resultsRoot, operation, ledger, {
          eventType: "attempt-registered", requestRef: requestRef(request), idempotencyKeyHash: keyHash,
          mode: "open-diagnostic", operation, attempt: structuredClone(request.attempt), status: null,
          reasonCode: null, publication: null,
        }, clock);
        prepared.push(request);
      }
      let sessionOutputBytes = await countExistingOutputBytes(resultsRoot);
      const terminalResults = [];
      const terminalPaths = [];
      let stopReason = null;
      const operationStartedAt = clock();
      assertNotBefore(operationStartedAt, ledger.lastOccurredAt, "S06_RUN_TIME_INVALID", "ledger/operation start");
      for (const request of prepared) {
        const startedAt = clock();
        assertNotBefore(startedAt, operationStartedAt, "S06_RUN_TIME_INVALID", "operation/attempt start");
        assertNotBefore(startedAt, request.createdAt, "S06_RUN_TIME_INVALID", "request/attempt start");
        if (stopReason !== null) {
          const stoppedAt = clock();
          assertNotBefore(stoppedAt, startedAt, "S06_RUN_TIME_INVALID", "attempt finish");
          const terminal = withHash({
            ...terminalBase(request, startedAt, stoppedAt), status: "inconclusive", reasonCode: "S06_STOP_RULE_TRIGGERED",
            workerInvoked: false, diagnosticEnvelopeRef: null, diagnosticFacts: null, publication: null,
          });
          validateSlice06RunResult(terminal);
          const relativePath = standaloneTerminalRelativePath(request);
          await atomicWriteJsonNew(path.join(resultsRoot, ...relativePath.split("/")), terminal);
          terminalResults.push(terminal); terminalPaths.push(relativePath);
          await appendLedger(resultsRoot, operation, ledger, {
            eventType: "attempt-terminal", requestRef: requestRef(request), idempotencyKeyHash: idempotencyHash(request),
            mode: "open-diagnostic", operation, attempt: structuredClone(request.attempt), status: terminal.status,
            reasonCode: terminal.reasonCode, publication: null,
          }, clock);
          continue;
        }
        let execution;
        let error;
        try { execution = await execute({ request: structuredClone(request), startedAt }); } catch (cause) { error = cause; }
        let terminal;
        let relativePath;
        let closureCommitted = false;
        if (request.expectedDisposition === "preflight-reject" && error?.code === request.expectedStableErrorCode
          && error?.workerObservation == null) {
          const preflightFinishedAt = clock();
          assertNotBefore(preflightFinishedAt, startedAt, "S06_RUN_TIME_INVALID", "attempt finish");
          terminal = withHash({
            ...terminalBase(request, startedAt, preflightFinishedAt), status: "characterized-preflight-rejection",
            reasonCode: error.code, workerInvoked: false, diagnosticEnvelopeRef: null, diagnosticFacts: null, publication: null,
          });
          relativePath = standaloneTerminalRelativePath(request);
          validateSlice06RunResult(terminal);
          await atomicWriteJsonNew(path.join(resultsRoot, ...relativePath.split("/")), terminal);
        } else if (!error && request.expectedDisposition === "applicable"
          && new Set(["oracle-pass-diagnostic", "oracle-non-pass-diagnostic"]).has(execution?.status)) {
          const outputLength = execution.outputBytes?.byteLength;
          if (!Number.isInteger(outputLength) || sessionOutputBytes + outputLength > MAX_SESSION_OUTPUT_BYTES) {
            error = Object.assign(new Error("session output limit"), { code: "S06_SESSION_OUTPUT_LIMIT_EXCEEDED" });
            if (execution?.workerObservation) error.workerObservation = execution.workerObservation;
          } else {
            const intentDecision = execution.status === "oracle-pass-diagnostic" ? "pass" : "non-pass";
            const publication = closureRolePathsSlice06(request, intentDecision);
            await appendLedger(resultsRoot, operation, ledger, {
              eventType: "closure-publication-intent", requestRef: requestRef(request), idempotencyKeyHash: idempotencyHash(request),
              mode: "open-diagnostic", operation, attempt: structuredClone(request.attempt), status: null,
              reasonCode: null, publication,
            }, clock);
            const executionFinishedAt = clock();
            assertNotBefore(executionFinishedAt, startedAt, "S06_RUN_TIME_INVALID", "attempt finish");
            let published;
            try {
              published = await publishFiveRoleClosure({
                resultsRoot, request, execution, terminalDraft: terminalBase(request, startedAt, executionFinishedAt),
                validators: checkedValidators, postRenameSyncHook,
              });
            } catch (cause) {
              if (cause?.code === "S06_PUBLICATION_RECONCILIATION_UNKNOWN") throw cause;
              if (execution?.workerObservation && cause && typeof cause === "object" && cause.workerObservation == null) {
                cause.workerObservation = execution.workerObservation;
              }
              error = cause;
            }
            if (published) {
              try {
                await publicationCompletionHook({ phase: "before-completion-event", request: structuredClone(request), terminal: structuredClone(published.terminal) });
                await appendLedger(resultsRoot, operation, ledger, {
                  eventType: "closure-publication-complete", requestRef: requestRef(request), idempotencyKeyHash: idempotencyHash(request),
                  mode: "open-diagnostic", operation, attempt: structuredClone(request.attempt), status: published.terminal.status,
                  reasonCode: published.terminal.reasonCode, publication: published.terminal.publication,
                }, clock);
              } catch (cause) {
                fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "five-role closure committed but its completion event could not be appended", { cause });
              }
              terminal = published.terminal; relativePath = published.terminalRelativePath; sessionOutputBytes += outputLength;
              closureCommitted = true;
            }
          }
        } else if (!error && request.expectedDisposition === "preflight-reject") {
          error = Object.assign(new Error("sentinel reached worker/output"), { code: "S06_PREFLIGHT_FALSE_ALLOW" });
        }
        if (!terminal && !error && execution !== undefined) {
          error = Object.assign(new Error("execution returned outside the closed diagnostic protocol"), {
            code: "S06_EXECUTION_PROTOCOL_FAILED",
          });
        }
        if (error && execution?.workerObservation && error.workerObservation == null) error.workerObservation = execution.workerObservation;
        if (!terminal) {
          const reasonCode = typeof error?.code === "string" && /^S06_[A-Z0-9_]+$/u.test(error.code)
            ? error.code : "S06_EXECUTION_PROTOCOL_FAILED";
          const protocolFinishedAt = clock();
          assertNotBefore(protocolFinishedAt, startedAt, "S06_RUN_TIME_INVALID", "attempt finish");
          if (error?.workerObservation !== null && error?.workerObservation !== undefined) {
            const publishedFailure = await publishWorkerFailureClosure({
              resultsRoot, request, reasonCode, workerObservation: error.workerObservation,
              terminalDraft: terminalBase(request, startedAt, protocolFinishedAt), postRenameSyncHook,
            });
            terminal = publishedFailure.terminal; relativePath = publishedFailure.terminalRelativePath;
            closureCommitted = true;
          } else {
            terminal = withHash({
              ...terminalBase(request, startedAt, protocolFinishedAt), status: "protocol-failed", reasonCode,
              workerInvoked: false, diagnosticEnvelopeRef: null, diagnosticFacts: null, publication: null,
            });
            relativePath = standaloneTerminalRelativePath(request);
            validateSlice06RunResult(terminal);
            await atomicWriteJsonNew(path.join(resultsRoot, ...relativePath.split("/")), terminal);
          }
          stopReason = reasonCode;
        }
        terminalResults.push(terminal); terminalPaths.push(relativePath);
        try {
          if (closureCommitted) {
            await publicationCompletionHook({ phase: "before-terminal-event", request: structuredClone(request), terminal: structuredClone(terminal) });
          }
          await appendLedger(resultsRoot, operation, ledger, {
            eventType: "attempt-terminal", requestRef: requestRef(request), idempotencyKeyHash: idempotencyHash(request),
            mode: "open-diagnostic", operation, attempt: structuredClone(request.attempt), status: terminal.status,
            reasonCode: terminal.reasonCode, publication: terminal.publication,
          }, clock);
        } catch (cause) {
          if (closureCommitted) {
            fail("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "diagnostic closure committed but its terminal event could not be appended", { cause });
          }
          throw cause;
        }
      }
      const finishedAt = clock();
      assertNotBefore(finishedAt, operationStartedAt, "S06_RUN_TIME_INVALID", "operation finish");
      assertNotBefore(finishedAt, ledger.lastOccurredAt, "S06_RUN_TIME_INVALID", "ledger/operation finish");
      const summary = buildSlice06DiagnosticSummary({
        operation, requests: ordered, terminalResults, terminalPaths, startedAt: operationStartedAt, finishedAt,
      });
      const summaryRelativePath = `summaries/${operation}.diagnostic-summary.slice06.v0.json`;
      await atomicWriteJsonNew(path.join(resultsRoot, ...summaryRelativePath.split("/")), summary);
      return Object.freeze({ marker, terminalResults, terminalPaths, summary, summaryRelativePath, ledgerTailHash: ledger.previousEventHash });
    },
  });
}

function allEqual(values) { return values.length > 0 && values.every((value) => value === values[0]); }
function groupBySource(requests) {
  const groups = new Map();
  for (const request of requests) {
    const sourceId = request.attempt.sourceId;
    const group = groups.get(sourceId) ?? [];
    group.push(request);
    groups.set(sourceId, group);
  }
  return groups;
}

export function buildSlice06DiagnosticSummary({ operation, requests, terminalResults, terminalPaths, startedAt, finishedAt }) {
  const ordered = validateRegisteredRequests(operation, requests);
  if (!Array.isArray(terminalResults) || terminalResults.length !== 12 || !Array.isArray(terminalPaths) || terminalPaths.length !== 12) {
    fail("S06_DIAGNOSTIC_SUMMARY_INVALID", "summary requires 12 terminal records and paths");
  }
  terminalResults.forEach(validateSlice06RunResult);
  const byId = new Map(terminalResults.map((result, index) => [result.requestRef.id, { result, path: terminalPaths[index] }]));
  if (byId.size !== 12 || ordered.some((request) => !byId.has(request.requestId))) fail("S06_DIAGNOSTIC_SUMMARY_INVALID", "terminal/request closure incomplete");
  if (new Set(terminalPaths).size !== 12) fail("S06_DIAGNOSTIC_SUMMARY_INVALID", "terminal paths collide");
  for (const request of ordered) {
    const { result, path: terminalPath } = byId.get(request.requestId);
    const code = "S06_DIAGNOSTIC_SUMMARY_INVALID";
    assertSame(result.requestRef, requestRef(request), code, "terminal.requestRef");
    assertSame(result.attempt, request.attempt, code, "terminal.attempt");
    if (result.operation !== request.operation || result.idempotencyKeyHash !== idempotencyHash(request)
      || result.resultId !== resultId(idempotencyHash(request)) || result.expectedDisposition !== request.expectedDisposition
      || result.expectedStableErrorCode !== request.expectedStableErrorCode) fail(code, "terminal identity/disposition does not derive from request");
    assertNotBefore(result.startedAt, request.createdAt, code, "request/terminal start");
    let expectedPath = standaloneTerminalRelativePath(request);
    if (result.publication !== null) expectedPath = result.publication.rolePaths.terminalResult;
    else if (result.workerFailureEnvelopeRef !== null) expectedPath = failureRolePaths(request).terminal;
    if (terminalPath !== expectedPath) fail(code, "terminal path does not match terminal class and request identity");
  }
  const groups = groupBySource(ordered);
  const caseResults = [];
  for (const [sourceId, sourceRequests] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const records = sourceRequests.sort((a, b) => a.attempt.repetition - b.attempt.repetition).map((request) => byId.get(request.requestId));
    const facts = records.map(({ result }) => result.diagnosticFacts);
    const outputHashes = facts.map((value) => value?.candidateOutputFileSha256 ?? null);
    const outputByteLengths = facts.map((value) => value?.candidateOutputByteLength ?? null);
    const pixelHashes = facts.map((value) => value?.candidateOutputDecodedPixelSha256 ?? null);
    const oracleCodes = facts.map((value, index) => value?.oraclePrimaryCode ?? records[index].result.reasonCode);
    const classifications = facts.map((value, index) => value === null
      ? `${records[index].result.status}:${records[index].result.reasonCode}`
      : `${value.strictDecision}:${value.oraclePrimaryCode ?? "pass"}`);
    const runtimeHashes = facts.map((value) => value?.workerRuntimePayloadSha256 ?? null);
    const strictDecisions = facts.map((value) => value?.strictDecision ?? null);
    const applicable = sourceRequests[0].expectedDisposition === "applicable";
    const refs = records.map(({ result, path: relativePath }) => resultRef(result, relativePath));
    caseResults.push({
      sourceId, expectedDisposition: sourceRequests[0].expectedDisposition,
      rawResultRefs: refs, effectiveResultRefs: structuredClone(refs), invalidatedResultRefs: [],
      statuses: records.map(({ result }) => result.status), strictDecisions,
      outputByteLengths, outputFileSha256s: outputHashes, decodedPixelSha256s: pixelHashes, oraclePrimaryCodes: oracleCodes,
      workerRuntimePayloadSha256s: runtimeHashes,
      closureComplete: records.every(({ result }) => applicable ? result.publication !== null : result.status === "characterized-preflight-rejection"),
      outputBytesDeterministic: applicable ? outputHashes.every((value) => value !== null) && allEqual(outputHashes) : true,
      pixelDeterministic: applicable && pixelHashes.every((value) => value !== null) ? allEqual(pixelHashes) : null,
      classificationDeterministic: allEqual(classifications),
      oracleOutcomeDeterministic: allEqual(oracleCodes),
      workerRuntimeDeterministic: applicable ? runtimeHashes.every((value) => value !== null) && allEqual(runtimeHashes) : true,
      exitConfirmedAll: applicable ? facts.every((value) => value?.workerExitConfirmed === true) : true,
      telemetryCompleteAll: applicable ? facts.every((value) => value?.telemetryComplete === true) : true,
    });
  }
  const statusCounts = Object.fromEntries(TERMINAL_STATUSES.map((status) => [status, terminalResults.filter((result) => result.status === status).length]));
  const hasProtocolFailure = statusCounts["protocol-failed"] > 0;
  const hasInconclusive = statusCounts.inconclusive > 0;
  const overallStatus = hasProtocolFailure ? "protocol-failed" : hasInconclusive ? "inconclusive" : "characterization-complete";
  const summary = withHash({
    schemaVersion: SLICE06_RUNNER_VERSIONS.summary,
    summaryId: `diagnostic-summary.${operation}.${sha256Slice06(Buffer.from(ordered[0].attempt.runId, "utf8")).slice(0, 16)}`,
    mode: "open-diagnostic", operation, definitionRef: structuredClone(ordered[0].definitionRef),
    preregistrationRef: structuredClone(ordered[0].preregistrationRef), runId: ordered[0].attempt.runId,
    registeredSourceCount: 4, registeredAttemptCount: 12, recordedAttemptCount: 12, replacementAttemptCount: 0,
    statusCounts, caseResults,
    retainedOutputBytes: terminalResults.reduce((sum, result) => sum + (result.diagnosticFacts?.candidateOutputByteLength ?? 0), 0),
    allOutputBytesDeterministic: caseResults.every(({ outputBytesDeterministic }) => outputBytesDeterministic),
    allPixelsDeterministic: caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable").some(({ pixelDeterministic }) => pixelDeterministic === null)
      ? null
      : caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable").every(({ pixelDeterministic }) => pixelDeterministic === true),
    allClassificationsDeterministic: caseResults.every(({ classificationDeterministic }) => classificationDeterministic),
    allOracleOutcomesDeterministic: caseResults.every(({ oracleOutcomeDeterministic }) => oracleOutcomeDeterministic),
    allWorkerRuntimesDeterministic: caseResults.every(({ workerRuntimeDeterministic }) => workerRuntimeDeterministic),
    exitConfirmedAll: caseResults.every(({ exitConfirmedAll }) => exitConfirmedAll),
    telemetryCompleteAll: caseResults.every(({ telemetryCompleteAll }) => telemetryCompleteAll),
    overallStatus, gateBDecisionAuthority: false, calibrationAuthorized: false,
    startedAt, finishedAt, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  });
  validateSlice06DiagnosticSummary(summary);
  return summary;
}

export function validateSlice06DiagnosticSummary(record) {
  const code = "S06_DIAGNOSTIC_SUMMARY_INVALID";
  const keys = Object.keys(SCHEMA_BY_KEY.diagnosticSummary.properties);
  exactKeys(record, keys, code, "summary");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.summary || record.mode !== "open-diagnostic"
    || !OPERATIONS.includes(record.operation) || record.registeredSourceCount !== 4 || record.registeredAttemptCount !== 12
    || record.recordedAttemptCount !== 12 || record.replacementAttemptCount !== 0 || record.caseResults.length !== 4
    || record.gateBDecisionAuthority !== false || record.calibrationAuthorized !== false) fail(code, "summary fixed boundary invalid");
  exactKeys(record.statusCounts, TERMINAL_STATUSES, code, "statusCounts");
  for (const count of Object.values(record.statusCounts)) if (!Number.isInteger(count) || count < 0 || count > 12) fail(code, "status count invalid");
  assertRecordRef(record.definitionRef, code, "definitionRef"); assertRecordRef(record.preregistrationRef, code, "preregistrationRef");
  assertId(record.summaryId, code, "summaryId"); assertId(record.runId, code, "runId");
  const expectedSummaryId = `diagnostic-summary.${record.operation}.${sha256Slice06(Buffer.from(record.runId, "utf8")).slice(0, 16)}`;
  if (record.summaryId !== expectedSummaryId) fail(code, "summaryId does not derive from operation/runId");
  if (!Number.isInteger(record.retainedOutputBytes) || record.retainedOutputBytes < 0 || record.retainedOutputBytes > 9 * MAX_OUTPUT_BYTES) fail(code, "retainedOutputBytes invalid");
  const caseKeys = Object.keys(CASE_RESULT_SCHEMA.properties);
  const sourceIds = new Set();
  const flattenedStatuses = [];
  const allRawRefIds = [];
  const allRawRefPaths = [];
  for (const caseResult of record.caseResults) {
    exactKeys(caseResult, caseKeys, code, "caseResult"); assertId(caseResult.sourceId, code, "caseResult.sourceId", { pathSegment: true });
    if (sourceIds.has(caseResult.sourceId) || !EXPECTED_DISPOSITIONS.includes(caseResult.expectedDisposition)) fail(code, "case source/disposition invalid");
    sourceIds.add(caseResult.sourceId);
    for (const key of ["rawResultRefs", "effectiveResultRefs", "statuses", "strictDecisions", "outputByteLengths", "outputFileSha256s", "decodedPixelSha256s", "oraclePrimaryCodes", "workerRuntimePayloadSha256s"]) {
      if (!Array.isArray(caseResult[key]) || caseResult[key].length !== 3) fail(code, `${key} must contain exactly three repetitions`);
    }
    if (!Array.isArray(caseResult.invalidatedResultRefs) || caseResult.invalidatedResultRefs.length !== 0
      || stableStringifySlice06(caseResult.rawResultRefs) !== stableStringifySlice06(caseResult.effectiveResultRefs)) fail(code, "zero-replacement raw/effective refs must be identical with no invalidations");
    for (const ref of [...caseResult.rawResultRefs, ...caseResult.effectiveResultRefs]) {
      exactKeys(ref, ["id", "contentHash", "relativePath"], code, "caseResult.resultRef");
      assertId(ref.id, code, "caseResult.resultRef.id"); assertSha(ref.contentHash, code, "caseResult.resultRef.contentHash");
      assertSafeRelativePath(ref.relativePath, code, "caseResult.resultRef.relativePath");
    }
    allRawRefIds.push(...caseResult.rawResultRefs.map(({ id }) => id));
    allRawRefPaths.push(...caseResult.rawResultRefs.map(({ relativePath }) => relativePath));
    if (caseResult.statuses.some((status) => !TERMINAL_STATUSES.includes(status))) fail(code, "case status invalid");
    const allowedStatuses = caseResult.expectedDisposition === "applicable"
      ? new Set(["characterized-oracle-pass", "characterized-oracle-non-pass", "protocol-failed", "inconclusive"])
      : new Set(["characterized-preflight-rejection", "protocol-failed", "inconclusive"]);
    if (caseResult.statuses.some((status) => !allowedStatuses.has(status))) fail(code, "case status contradicts expected disposition");
    for (let index = 0; index < 3; index += 1) {
      const repetition = index + 1;
      const status = caseResult.statuses[index];
      const decision = caseResult.strictDecisions[index];
      const ref = caseResult.effectiveResultRefs[index];
      if (!/^result\.[a-f0-9]{64}$/u.test(ref.id)) fail(code, "result ref id is not attempt-derived");
      const keyHash = ref.id.slice("result.".length);
      const standalonePath = `records/${keyHash}.result.json`;
      let expectedPaths;
      if (status === "characterized-oracle-pass") {
        if (decision !== "pass" || caseResult.oraclePrimaryCodes[index] !== null
          || !Number.isInteger(caseResult.outputByteLengths[index]) || caseResult.outputByteLengths[index] < 1 || caseResult.outputByteLengths[index] > MAX_OUTPUT_BYTES
          || caseResult.outputFileSha256s[index] === null || caseResult.workerRuntimePayloadSha256s[index] === null) fail(code, "oracle pass tuple mismatch");
        expectedPaths = [`specimens/${record.operation}/${caseResult.sourceId}/r${repetition}/terminal-result.json`];
      } else if (status === "characterized-oracle-non-pass") {
        if (decision !== "non-pass" || caseResult.oraclePrimaryCodes[index] === null
          || !Number.isInteger(caseResult.outputByteLengths[index]) || caseResult.outputByteLengths[index] < 1 || caseResult.outputByteLengths[index] > MAX_OUTPUT_BYTES
          || caseResult.outputFileSha256s[index] === null || caseResult.workerRuntimePayloadSha256s[index] === null) fail(code, "oracle non-pass tuple mismatch");
        expectedPaths = [`quarantine/${record.operation}/${caseResult.sourceId}/r${repetition}/terminal-result.json`];
      } else if (status === "protocol-failed") {
        if (decision !== null || caseResult.oraclePrimaryCodes[index] === null || caseResult.outputByteLengths[index] !== null || caseResult.outputFileSha256s[index] !== null
          || caseResult.decodedPixelSha256s[index] !== null || caseResult.workerRuntimePayloadSha256s[index] !== null) fail(code, "protocol failure tuple mismatch");
        expectedPaths = [standalonePath, `failures/${record.operation}/${caseResult.sourceId}/r${repetition}/terminal-result.json`];
      } else {
        if (decision !== null || caseResult.oraclePrimaryCodes[index] === null || caseResult.outputByteLengths[index] !== null || caseResult.outputFileSha256s[index] !== null
          || caseResult.decodedPixelSha256s[index] !== null || caseResult.workerRuntimePayloadSha256s[index] !== null) fail(code, "worker-free terminal tuple mismatch");
        expectedPaths = RECONCILIATION_UNKNOWN_CODES.has(caseResult.oraclePrimaryCodes[index])
          ? [standalonePath, `failures/${record.operation}/${caseResult.sourceId}/r${repetition}/terminal-result.json`]
          : [standalonePath];
      }
      if (!expectedPaths.includes(ref.relativePath)) fail(code, "result ref path does not bind operation/source/repetition/status");
    }
    flattenedStatuses.push(...caseResult.statuses);
    for (const values of [caseResult.outputFileSha256s, caseResult.decodedPixelSha256s, caseResult.workerRuntimePayloadSha256s]) {
      for (const value of values) if (value !== null) assertSha(value, code, "case hash");
    }
    for (const value of caseResult.oraclePrimaryCodes) if (value !== null && !/^S06_[A-Z0-9_]+$/u.test(value)) fail(code, "case oracle code invalid");
    for (const value of caseResult.strictDecisions) if (value !== null && !new Set(["pass", "non-pass"]).has(value)) fail(code, "case decision invalid");
    for (const key of ["closureComplete", "outputBytesDeterministic", "classificationDeterministic", "oracleOutcomeDeterministic", "workerRuntimeDeterministic", "exitConfirmedAll", "telemetryCompleteAll"]) {
      if (typeof caseResult[key] !== "boolean") fail(code, `${key} invalid`);
    }
    if (caseResult.expectedDisposition === "applicable"
      ? caseResult.pixelDeterministic !== null && typeof caseResult.pixelDeterministic !== "boolean"
      : caseResult.pixelDeterministic !== null) fail(code, "pixelDeterministic disposition binding invalid");
    const applicable = caseResult.expectedDisposition === "applicable";
    const expectedOutputDeterministic = applicable
      ? caseResult.outputFileSha256s.every((value) => value !== null) && allEqual(caseResult.outputFileSha256s)
      : true;
    const expectedPixelDeterministic = applicable && caseResult.decodedPixelSha256s.every((value) => value !== null)
      ? allEqual(caseResult.decodedPixelSha256s)
      : null;
    const expectedRuntimeDeterministic = applicable
      ? caseResult.workerRuntimePayloadSha256s.every((value) => value !== null) && allEqual(caseResult.workerRuntimePayloadSha256s)
      : true;
    const classifications = caseResult.statuses.map((status, index) => caseResult.strictDecisions[index] === null
      ? `${status}:${caseResult.oraclePrimaryCodes[index]}`
      : `${caseResult.strictDecisions[index]}:${caseResult.oraclePrimaryCodes[index] ?? "pass"}`);
    const expectedClosureComplete = applicable
      ? caseResult.statuses.every((status) => new Set(["characterized-oracle-pass", "characterized-oracle-non-pass"]).has(status))
        && caseResult.effectiveResultRefs.every(({ relativePath }) => /^(specimens|quarantine)\//u.test(relativePath))
      : caseResult.statuses.every((status) => status === "characterized-preflight-rejection")
        && caseResult.effectiveResultRefs.every(({ relativePath }) => relativePath.startsWith("records/"));
    const expectedSuccessfulWorkerAll = applicable
      ? caseResult.statuses.every((status) => new Set(["characterized-oracle-pass", "characterized-oracle-non-pass"]).has(status))
      : true;
    if (caseResult.outputBytesDeterministic !== expectedOutputDeterministic
      || caseResult.pixelDeterministic !== expectedPixelDeterministic
      || caseResult.workerRuntimeDeterministic !== expectedRuntimeDeterministic
      || caseResult.classificationDeterministic !== allEqual(classifications)
      || caseResult.oracleOutcomeDeterministic !== allEqual(caseResult.oraclePrimaryCodes)
      || caseResult.closureComplete !== expectedClosureComplete
      || caseResult.exitConfirmedAll !== expectedSuccessfulWorkerAll
      || caseResult.telemetryCompleteAll !== expectedSuccessfulWorkerAll) fail(code, "case determinism/completeness fields do not derive from repetitions");
  }
  if (new Set(allRawRefIds).size !== 12 || new Set(allRawRefPaths).size !== 12) fail(code, "12 raw/effective terminal refs must be globally unique");
  if (sourceIds.size !== 4 || record.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable").length !== 3) fail(code, "case denominator invalid");
  for (const status of TERMINAL_STATUSES) if (record.statusCounts[status] !== flattenedStatuses.filter((value) => value === status).length) fail(code, "status counts do not derive from case results");
  const countTotal = Object.values(record.statusCounts).reduce((sum, count) => sum + count, 0);
  if (countTotal !== 12) fail(code, "summary counts invalid");
  const derivedRetainedOutputBytes = record.caseResults.flatMap(({ outputByteLengths }) => outputByteLengths)
    .reduce((sum, value) => sum + (value ?? 0), 0);
  if (record.retainedOutputBytes !== derivedRetainedOutputBytes) fail(code, "retainedOutputBytes does not derive from attempt byte lengths");
  const applicableCases = record.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable");
  const derivedAllPixels = applicableCases.some(({ pixelDeterministic }) => pixelDeterministic === null)
    ? null : applicableCases.every(({ pixelDeterministic }) => pixelDeterministic === true);
  if (record.allOutputBytesDeterministic !== record.caseResults.every(({ outputBytesDeterministic }) => outputBytesDeterministic)
    || record.allPixelsDeterministic !== derivedAllPixels
    || record.allClassificationsDeterministic !== record.caseResults.every(({ classificationDeterministic }) => classificationDeterministic)
    || record.allOracleOutcomesDeterministic !== record.caseResults.every(({ oracleOutcomeDeterministic }) => oracleOutcomeDeterministic)
    || record.allWorkerRuntimesDeterministic !== record.caseResults.every(({ workerRuntimeDeterministic }) => workerRuntimeDeterministic)
    || record.exitConfirmedAll !== record.caseResults.every(({ exitConfirmedAll }) => exitConfirmedAll)
    || record.telemetryCompleteAll !== record.caseResults.every(({ telemetryCompleteAll }) => telemetryCompleteAll)) fail(code, "summary aggregate flags do not derive from case results");
  const derivedOverall = record.statusCounts["protocol-failed"] > 0 ? "protocol-failed"
    : record.statusCounts.inconclusive > 0 ? "inconclusive" : "characterization-complete";
  if (record.overallStatus !== derivedOverall) fail(code, "overallStatus does not derive from terminal statuses");
  if (record.overallStatus === "characterization-complete" && !record.caseResults.every(({ closureComplete }) => closureComplete)) fail(code, "characterization-complete requires all 12 attempt closures");
  assertEvidence(record.evidenceBoundary, code); assertUtc(record.startedAt, code, "startedAt"); assertUtc(record.finishedAt, code, "finishedAt");
  assertNotBefore(record.finishedAt, record.startedAt, code, "summary interval"); assertSelfHash(record, code);
  return true;
}

export function buildSlice06CharacterizationClose({ operation, definitionRef, summary, summaryRef, resultTree, closedAt }) {
  validateSlice06DiagnosticSummary(summary); assertRecordRef(definitionRef, "S06_CHARACTERIZATION_CLOSE_INVALID", "definitionRef");
  assertRecordRef(summaryRef, "S06_CHARACTERIZATION_CLOSE_INVALID", "summaryRef");
  if (summaryRef.contentHash !== summary.contentHash || summaryRef.id !== summary.summaryId || summary.operation !== operation
    || stableStringifySlice06(definitionRef) !== stableStringifySlice06(summary.definitionRef)) fail("S06_CHARACTERIZATION_CLOSE_INVALID", "summary/definition ref mismatch");
  exactKeys(resultTree, ["fileCount", "totalBytes", "sha256"], "S06_CHARACTERIZATION_CLOSE_INVALID", "resultTree");
  if (!Number.isInteger(resultTree.fileCount) || resultTree.fileCount < 0 || !Number.isInteger(resultTree.totalBytes) || resultTree.totalBytes < 0) fail("S06_CHARACTERIZATION_CLOSE_INVALID", "resultTree counts invalid");
  assertSha(resultTree.sha256, "S06_CHARACTERIZATION_CLOSE_INVALID", "resultTree.sha256"); assertUtc(closedAt, "S06_CHARACTERIZATION_CLOSE_INVALID", "closedAt");
  assertNotBefore(closedAt, summary.finishedAt, "S06_CHARACTERIZATION_CLOSE_INVALID", "summary/close");
  const close = withHash({
    schemaVersion: SLICE06_RUNNER_VERSIONS.close,
    closeId: `characterization-close.${operation}.${summary.contentHash.slice(0, 16)}`,
    mode: "open-diagnostic", operation, definitionRef: structuredClone(definitionRef), summaryRef: structuredClone(summaryRef),
    outcome: summary.overallStatus, gateBDecisionAuthority: false, gateBState: "not-entered-diagnostic-only",
    calibrationAuthorized: false, calibrationState: "not-created-by-scope", resultTree: structuredClone(resultTree),
    closedAt, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  });
  validateSlice06CharacterizationClose(close);
  return close;
}

export function validateSlice06CharacterizationClose(record) {
  const code = "S06_CHARACTERIZATION_CLOSE_INVALID";
  exactKeys(record, Object.keys(SCHEMA_BY_KEY.characterizationClose.properties), code, "characterizationClose");
  if (record.schemaVersion !== SLICE06_RUNNER_VERSIONS.close || record.mode !== "open-diagnostic" || !OPERATIONS.includes(record.operation)
    || !new Set(["characterization-complete", "protocol-failed", "inconclusive"]).has(record.outcome)
    || record.gateBDecisionAuthority !== false || record.gateBState !== "not-entered-diagnostic-only"
    || record.calibrationAuthorized !== false || record.calibrationState !== "not-created-by-scope") fail(code, "close fixed boundary invalid");
  assertId(record.closeId, code, "closeId"); assertRecordRef(record.definitionRef, code, "definitionRef"); assertRecordRef(record.summaryRef, code, "summaryRef");
  exactKeys(record.resultTree, ["fileCount", "totalBytes", "sha256"], code, "resultTree");
  if (!Number.isInteger(record.resultTree.fileCount) || record.resultTree.fileCount < 0
    || !Number.isInteger(record.resultTree.totalBytes) || record.resultTree.totalBytes < 0) fail(code, "resultTree counts invalid");
  assertSha(record.resultTree.sha256, code, "resultTree.sha256"); assertUtc(record.closedAt, code, "closedAt");
  assertEvidence(record.evidenceBoundary, code); assertSelfHash(record, code); return true;
}

export const SLICE06_RUNNER_LIMITS = Object.freeze({
  sourceUnitsPerOperation: 4,
  repetitionsPerSource: 3,
  attemptsPerOperation: 12,
  attemptsTotal: 24,
  replacementAttempts: 0,
  maxOutputBytes: MAX_OUTPUT_BYTES,
  maxSessionOutputBytes: MAX_SESSION_OUTPUT_BYTES,
});

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  if (process.argv.length !== 3 || process.argv[2] !== "--diagnostic") {
    process.stderr.write("Usage: node scripts/research-run-slice06.mjs --diagnostic\n");
    process.exitCode = 1;
  } else {
    process.stderr.write("S06_DEFINITION_NOT_FROZEN: Phase B runner cannot execute before the results-0 machine definition is frozen and pushed.\n");
    process.exitCode = 1;
  }
}
