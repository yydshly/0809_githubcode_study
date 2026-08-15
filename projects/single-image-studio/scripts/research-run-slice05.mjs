import { fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SLICE05_SHARP_POLICY,
  createSlice05SharpAdapter,
  sha256Slice05,
  validateDeliveryArtifactSlice05 as validateCandidateDeliveryArtifactSlice05,
  validateNormalizedArtifactSlice05 as validateCandidateNormalizedArtifactSlice05,
  validateWorkerRuntimeSlice05,
} from "./research-sharp-adapter-slice05.mjs";
import {
  decodeIndependentPngSlice05,
  evaluateDeliveryArtifactSlice05,
  evaluateNormalizedImageSlice05,
  validateOracleResultSlice05,
  verifyOutputBytesSlice05,
} from "./research-independent-png-oracle-slice05.mjs";
import {
  canonicalJsonSlice05,
  inventorySharpRuntimeSlice05,
} from "./research-inventory-sharp-slice05.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_DEFINITION_INDEX = path.join(PROJECT_ROOT, "research", "slice-05", "definition-index.v0.5.0.json");
const DEFAULT_RESULTS_ROOT = path.join(PROJECT_ROOT, "research", "slice-05", "results", "open-smoke");
const DEFAULT_CALIBRATION_RESULTS_ROOT = path.join(PROJECT_ROOT, "research", "slice-05", "results", "open-calibration");
const FAULT_WORKER_PATH = path.join(SCRIPT_DIR, "research-slice05-fault-worker.mjs");
const ZERO_HASH = "0".repeat(64);
const ALLOWED_NO_RESULT_REASONS = Object.freeze([
  "runner-crash-before-result",
  "custody-interruption",
  "integrity-check-failure",
]);
const TERMINAL_STATUSES = Object.freeze([
  "pass",
  "nonpass",
  "invalid-no-result",
  "timeout",
  "cancelled",
  "unknown-reconciliation",
]);
const EVIDENCE_BOUNDARY = Object.freeze({
  productSupport: false,
  formalEvidence: false,
  c1: 0,
  u1: 0,
  e1: 0,
  r1Pipeline: 0,
  r1ProductValidation: 0,
  r1ProductRelease: 0,
  o1: 0,
  g1: 0,
  v1: 0,
  releaseAllowlist: "none",
  releaseRegistered: 0,
  releaseApproved: 0,
});

export const SLICE05_RUNNER_VERSIONS = Object.freeze({
  request: "local-run-request.slice05.v0",
  claim: "idempotency-claim.slice05.v0",
  event: "run-event.slice05.v0",
  result: "run-result.slice05.v0",
  smokeSummary: "smoke-summary.slice05.v0",
  gateBDecision: "gate-b-decision.slice05.v0",
  faultResult: "fault-semantics-result.slice05.v0",
  sessionAudit: "smoke-session-audit.slice05.v0",
  calibrationAdmission: "calibration-admission.slice05.v0",
  calibrationSummary: "calibration-summary.slice05.v0",
});

export const SLICE05_RUNNER_SCHEMA_PATHS = Object.freeze({
  runRequest: "schemas/local-run-request.slice05.v0.schema.json",
  runClaim: "schemas/idempotency-claim.slice05.v0.schema.json",
  runEvent: "schemas/run-event.slice05.v0.schema.json",
  runResult: "schemas/run-result.slice05.v0.schema.json",
  faultResult: "schemas/fault-semantics-result.slice05.v0.schema.json",
  sessionAudit: "schemas/smoke-session-audit.slice05.v0.schema.json",
  smokeSummary: "schemas/smoke-summary.slice05.v0.schema.json",
  gateBDecision: "schemas/gate-b-decision.slice05.v0.schema.json",
  calibrationAdmission: "schemas/calibration-admission.slice05.v0.schema.json",
  calibrationSummary: "schemas/calibration-summary.slice05.v0.schema.json",
});

export const SLICE05_RUN_REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "requestId",
  "mode",
  "operation",
  "definitionRef",
  "contractRef",
  "manifestRef",
  "manifestEntryRef",
  "goldRecordRef",
  "runtimeAttestationRef",
  "adapterRef",
  "oracleRef",
  "attempt",
  "expectedDisposition",
  "expectedStableErrorCode",
  "sourceIdentity",
  "createdAt",
  "contentHash",
]);
export const SLICE05_RUN_CLAIM_KEYS = Object.freeze([
  "schemaVersion",
  "claimId",
  "requestRef",
  "idempotencyKeyHash",
  "mode",
  "operation",
  "attempt",
  "claimedAt",
  "contentHash",
]);
export const SLICE05_RUN_EVENT_KEYS = Object.freeze([
  "schemaVersion",
  "eventId",
  "sequence",
  "previousEventHash",
  "eventType",
  "requestRef",
  "idempotencyKeyHash",
  "mode",
  "operation",
  "attempt",
  "status",
  "reasonCode",
  "publication",
  "occurredAt",
  "contentHash",
]);
export const SLICE05_RUN_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "resultId",
  "requestRef",
  "idempotencyKeyHash",
  "mode",
  "operation",
  "attempt",
  "expectedDisposition",
  "expectedStableErrorCode",
  "status",
  "reasonCode",
  "artifactRef",
  "oracleResultRef",
  "runtimeAttestationRef",
  "workerRuntime",
  "workerObservation",
  "durationMs",
  "resourceUsage",
  "workerExitConfirmed",
  "startedAt",
  "finishedAt",
  "evidenceBoundary",
  "contentHash",
]);
export const SLICE05_SMOKE_SUMMARY_KEYS = Object.freeze([
  "schemaVersion",
  "summaryId",
  "operation",
  "definitionRef",
  "manifestRef",
  "runtimeAttestationRef",
  "sessionAuditRef",
  "faultSemanticsRef",
  "registeredCaseCount",
  "registeredAttemptCount",
  "recordedAttemptCount",
  "replacementAttemptCount",
  "terminalAttemptCount",
  "missingAttemptCount",
  "passAttemptCount",
  "nonPassAttemptCount",
  "falseAllowCount",
  "falseRejectCount",
  "failureCount",
  "oracleNonpassCount",
  "unregisteredTerminalCount",
  "invalidNoResultCount",
  "timeoutCount",
  "cancelledCount",
  "unknownReconciliationCount",
  "allRegisteredAttemptsTerminal",
  "allRegisteredAttemptsPass",
  "allApplicableSourcesDeterministic",
  "faultSemanticsAllPass",
  "caseResults",
  "overallStatus",
  "startedAt",
  "finishedAt",
  "evidenceBoundary",
  "contentHash",
]);
export const SLICE05_GATE_B_DECISION_KEYS = Object.freeze([
  "schemaVersion",
  "decisionId",
  "operation",
  "definitionRef",
  "gateBPlanRef",
  "smokeSummaryRef",
  "conjunctResults",
  "decision",
  "calibrationAuthorized",
  "productSupport",
  "evidenceBoundary",
  "decidedAt",
  "contentHash",
]);

export const SLICE05_FAULT_RESULT_KEYS = Object.freeze([
  "schemaVersion", "faultResultId", "definitionRef", "runtimeAttestationRef", "scenarios",
  "allPass", "observedAt", "evidenceBoundary", "contentHash",
]);
export const SLICE05_SESSION_AUDIT_KEYS = Object.freeze([
  "schemaVersion", "auditId", "operation", "definitionRef", "gateBPlanRef", "manifestRef",
  "runtimeAttestationRef", "definitionIntegrity", "runtimeIntegrityAtStart", "runtimeIntegrityAtEnd",
  "runtimeStableStartToEnd", "implementationIntegrity", "sourceIsolation", "oracleIndependence",
  "atomicCommitIntegrity", "issues", "auditedAt", "evidenceBoundary", "contentHash",
]);
export const SLICE05_CALIBRATION_ADMISSION_KEYS = Object.freeze([
  "schemaVersion", "admissionId", "operation", "definitionRef", "gateBPlanRef", "gateBDecisionRef",
  "calibrationPreregistrationRef", "manifestRefs", "runtimeStartObservation", "decision", "admittedAt", "evidenceBoundary", "contentHash",
]);
export const SLICE05_CALIBRATION_SUMMARY_KEYS = Object.freeze([
  "schemaVersion", "summaryId", "operation", "definitionRef", "gateBDecisionRef", "admissionRef",
  "manifestRefs", "runtimeAttestationRef", "runtimeStartObservation", "runtimeEndObservation", "registeredSourceCount", "registeredAttemptCount",
  "recordedAttemptCount", "replacementAttemptCount", "terminalAttemptCount", "missingAttemptCount", "passAttemptCount", "nonPassAttemptCount",
  "falseAllowCount", "falseRejectCount", "failureCount", "oracleNonpassCount",
  "invalidNoResultCount", "timeoutCount", "cancelledCount", "unknownReconciliationCount",
  "unregisteredTerminalCount", "allRegisteredAttemptsTerminal", "allRegisteredAttemptsPass",
  "allApplicableSourcesDeterministic", "runtimeStableBeforeAndAfter", "outputClosurePass", "caseResults", "manifestResults", "overallStatus", "startedAt", "finishedAt",
  "evidenceBoundary", "contentHash",
]);

const REF_KEYS = Object.freeze(["id", "contentHash"]);
const RECORD_REF_KEYS = Object.freeze(["path", "id", "contentHash", "byteLength", "fileSha256"]);
const RUNTIME_ATTESTATION_REF_KEYS = Object.freeze([...RECORD_REF_KEYS, "inventoryPayloadSha256"]);
const IMPLEMENTATION_REF_KEYS = Object.freeze(["id", "version", "implementationSha256"]);
const ATTEMPT_KEYS = Object.freeze([
  "runId",
  "sourceId",
  "partition",
  "repetition",
  "attemptNumber",
  "idempotencyKey",
]);
const MANIFEST_ENTRY_REF_KEYS = Object.freeze(["entryIndex", "sourceId", "contentHash"]);
const SOURCE_IDENTITY_KEYS = Object.freeze(["sourceId", "sourceProvenanceRef", "rawAssetRef", "normalizedArtifactRef"]);
const RAW_ASSET_REF_KEYS = Object.freeze([
  "path", "mime", "byteLength", "fileSha256", "decodedPixelSha256", "sourceDeclarationDecodedPixelSha256",
]);
const NORMALIZED_INPUT_REF_KEYS = Object.freeze([
  "path", "id", "contentHash", "byteLength", "fileSha256", "producerKind",
]);
const REQUEST_REF_KEYS = Object.freeze(["id", "contentHash"]);
const ARTIFACT_REF_KEYS = Object.freeze([
  "schemaVersion",
  "id",
  "contentHash",
  "recordRelativePath",
  "recordByteLength",
  "recordFileSha256",
  "relativePath",
  "byteLength",
  "fileSha256",
  "decodedPixelSha256",
]);
const ORACLE_RESULT_REF_KEYS = Object.freeze(["id", "contentHash", "relativePath"]);
const RESOURCE_USAGE_KEYS = Object.freeze(["maxRssKiB", "userCpuMicros", "systemCpuMicros"]);
const WORKER_RUNTIME_EVIDENCE_KEYS = Object.freeze(["payload", "payloadSha256"]);
const RUNTIME_INVENTORY_OBSERVATION_KEYS = Object.freeze([
  "observedAt",
  "status",
  "inventoryCanonicalJson",
  "inventoryCanonicalSha256",
  "inventoryPayloadSha256",
  "attestedProjectionCanonicalJson",
  "attestedProjectionSha256",
  "matchesFrozen",
  "issue",
]);
const WORKER_NATIVE_VERSION_KEYS = Object.freeze([
  "aom", "archive", "cairo", "cgif", "exif", "expat", "ffi", "fontconfig", "freetype", "fribidi",
  "glib", "harfbuzz", "heif", "highway", "imagequant", "lcms", "mozjpeg", "pango", "pixman", "png",
  "proxy-libintl", "rsvg", "sharp", "tiff", "uhdr", "vips", "webp", "xml2", "zlib-ng",
]);
const PUBLICATION_KEYS = Object.freeze(["transactionId", "stagingDirectory", "files"]);
const PUBLICATION_FILE_KEYS = Object.freeze(["role", "stagedPath", "canonicalPath", "byteLength", "fileSha256"]);

const SHA_SCHEMA = Object.freeze({ type: "string", pattern: "^[0-9a-f]{64}$" });
const ID_SCHEMA = Object.freeze({ type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$" });
const PATH_SCHEMA = Object.freeze({
  type: "string",
  pattern: "^(?!/)(?!.*//)(?!.*(?:^|/)(?:\\.|\\.\\.)(?:/|$))(?!.*\\\\)(?!.*:)[A-Za-z0-9._@/-]+$",
});
const UTC_SCHEMA = Object.freeze({
  type: "string",
  format: "date-time",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
});

function closedSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

function nullableSchema(schema) {
  return { oneOf: [schema, { type: "null" }] };
}

function arraySchema(items, options = {}) {
  return { type: "array", items, ...options };
}

const HASH_REF_SCHEMA = closedSchema({ id: ID_SCHEMA, contentHash: SHA_SCHEMA });
const RECORD_REF_SCHEMA = closedSchema({
  path: PATH_SCHEMA,
  id: ID_SCHEMA,
  contentHash: SHA_SCHEMA,
  byteLength: { type: "integer", minimum: 1 },
  fileSha256: SHA_SCHEMA,
});
const RUNTIME_REF_SCHEMA = closedSchema({
  ...RECORD_REF_SCHEMA.properties,
  inventoryPayloadSha256: SHA_SCHEMA,
});
const IMPLEMENTATION_REF_SCHEMA = closedSchema({
  id: ID_SCHEMA,
  version: ID_SCHEMA,
  implementationSha256: SHA_SCHEMA,
});
const ATTEMPT_SCHEMA = closedSchema({
  runId: ID_SCHEMA,
  sourceId: ID_SCHEMA,
  partition: { enum: ["smoke", "dev/calibration", "defect/calibration"] },
  repetition: { type: "integer", minimum: 1, maximum: 3 },
  attemptNumber: { type: "integer", minimum: 1, maximum: 2 },
  idempotencyKey: ID_SCHEMA,
});
const EVIDENCE_SCHEMA = closedSchema(Object.fromEntries(Object.entries(EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])));
const RESOURCE_SCHEMA = closedSchema({
  maxRssKiB: { type: "integer", minimum: 0, maximum: SLICE05_SHARP_POLICY.observedMaxRssKiB },
  userCpuMicros: { type: "integer", minimum: 0 },
  systemCpuMicros: { type: "integer", minimum: 0 },
});
const WORKER_RUNTIME_SETTINGS_SCHEMA = closedSchema({
  concurrency: { const: 1 }, cacheMemoryMaxMiB: { const: 0 }, cacheFilesMax: { const: 0 }, cacheItemsMax: { const: 0 },
  simd: { const: false }, uvThreadpoolSize: { const: "1" }, vipsConcurrency: { const: "1" }, ignoreGlobalLibvips: { const: "1" },
});
const WORKER_RUNTIME_PAYLOAD_SCHEMA = closedSchema({
  sharpVersion: { const: "0.35.3" },
  nativeVersions: closedSchema(Object.fromEntries(WORKER_NATIVE_VERSION_KEYS.map((key) => [key, { type: "string", minLength: 1 }]))),
  nodeVersion: { type: "string", pattern: "^v22\\.\\d+\\.\\d+$" }, platform: { const: "win32" }, architecture: { const: "x64" },
  settings: WORKER_RUNTIME_SETTINGS_SCHEMA,
});
const WORKER_RUNTIME_EVIDENCE_SCHEMA = closedSchema({ payload: WORKER_RUNTIME_PAYLOAD_SCHEMA, payloadSha256: SHA_SCHEMA });
const ARTIFACT_REF_SCHEMA = closedSchema({
  schemaVersion: { enum: [SLICE05_SHARP_POLICY.normalizedArtifactVersion, SLICE05_SHARP_POLICY.deliveryArtifactVersion] },
  id: ID_SCHEMA,
  contentHash: SHA_SCHEMA,
  recordRelativePath: PATH_SCHEMA,
  recordByteLength: { type: "integer", minimum: 1 },
  recordFileSha256: SHA_SCHEMA,
  relativePath: PATH_SCHEMA,
  byteLength: { type: "integer", minimum: 1, maximum: 1024 * 1024 },
  fileSha256: SHA_SCHEMA,
  decodedPixelSha256: SHA_SCHEMA,
});
const ORACLE_REF_SCHEMA = closedSchema({ id: ID_SCHEMA, contentHash: SHA_SCHEMA, relativePath: PATH_SCHEMA });
const MANIFEST_ENTRY_REF_SCHEMA = closedSchema({
  entryIndex: { type: "integer", minimum: 0 }, sourceId: ID_SCHEMA, contentHash: SHA_SCHEMA,
});
const RAW_ASSET_REF_SCHEMA = closedSchema({
  path: PATH_SCHEMA,
  mime: { enum: ["image/png", "image/jpeg", "image/webp", "application/octet-stream"] },
  byteLength: { type: "integer", minimum: 1, maximum: 1024 * 1024 + 1 },
  fileSha256: SHA_SCHEMA,
  decodedPixelSha256: nullableSchema(SHA_SCHEMA),
  sourceDeclarationDecodedPixelSha256: SHA_SCHEMA,
});
const NORMALIZED_INPUT_REF_SCHEMA = closedSchema({
  path: PATH_SCHEMA, id: ID_SCHEMA, contentHash: SHA_SCHEMA,
  byteLength: { type: "integer", minimum: 1 }, fileSha256: SHA_SCHEMA,
  producerKind: { const: "independent-fixture-generator" },
});
const SOURCE_IDENTITY_SCHEMA = closedSchema({
  sourceId: ID_SCHEMA,
  sourceProvenanceRef: RECORD_REF_SCHEMA,
  rawAssetRef: RAW_ASSET_REF_SCHEMA,
  normalizedArtifactRef: nullableSchema(NORMALIZED_INPUT_REF_SCHEMA),
});
const REQUEST_REF_SCHEMA = HASH_REF_SCHEMA;
const RESULT_EVIDENCE_REF_SCHEMA = RECORD_REF_SCHEMA;
const FAULT_SCENARIO_SCHEMA = closedSchema({
  scenarioId: ID_SCHEMA,
  mode: { enum: ["timeout-hang", "cancel-hang", "exit-before-result", "malformed-result", "reported-reconciliation-unknown", "atomic-commit-conflict"] },
  expectedStatus: ID_SCHEMA,
  actualStatus: ID_SCHEMA,
  exitConfirmed: { type: ["boolean", "null"] },
  pass: { type: "boolean" },
});
const CASE_RESULT_SCHEMA = closedSchema({
  sourceId: ID_SCHEMA,
  partition: { const: "smoke" },
  expectedDisposition: { enum: ["applicable", "preflight-reject"] },
  repetitions: { const: 3 },
  terminalCount: { type: "integer", minimum: 0, maximum: 3 },
  passCount: { type: "integer", minimum: 0, maximum: 3 },
  allTerminal: { type: "boolean" },
  allPass: { type: "boolean" },
  deterministic: { type: "boolean" },
  fileSha256: nullableSchema(SHA_SCHEMA),
  decodedPixelSha256: nullableSchema(SHA_SCHEMA),
  effectiveResultRefs: arraySchema(nullableSchema(RESULT_EVIDENCE_REF_SCHEMA), { minItems: 3, maxItems: 3 }),
  invalidatedResultRefs: arraySchema(RESULT_EVIDENCE_REF_SCHEMA, { maxItems: 1 }),
});
const CALIBRATION_CASE_RESULT_SCHEMA = closedSchema({
  sourceId: ID_SCHEMA,
  partition: { enum: ["dev/calibration", "defect/calibration"] },
  expectedDisposition: { enum: ["applicable", "preflight-reject"] },
  repetitions: { const: 3 }, manifestContentHash: SHA_SCHEMA,
  terminalCount: { type: "integer", minimum: 0, maximum: 3 }, passCount: { type: "integer", minimum: 0, maximum: 3 },
  allTerminal: { type: "boolean" }, allPass: { type: "boolean" }, deterministic: { type: "boolean" },
  fileSha256: nullableSchema(SHA_SCHEMA), decodedPixelSha256: nullableSchema(SHA_SCHEMA),
  effectiveResultRefs: arraySchema(nullableSchema(RESULT_EVIDENCE_REF_SCHEMA), { minItems: 3, maxItems: 3 }),
  invalidatedResultRefs: arraySchema(RESULT_EVIDENCE_REF_SCHEMA, { maxItems: 1 }),
});
const CONJUNCT_RESULT_SCHEMA = closedSchema({
  gateId: ID_SCHEMA,
  status: { enum: ["pass", "non-pass", "unknown"] },
  evidenceRefs: arraySchema(RECORD_REF_SCHEMA, { minItems: 1, uniqueItems: true }),
});
const PUBLICATION_FILE_SCHEMA = closedSchema({
  role: { enum: ["artifact-bytes", "artifact-record", "oracle", "result"] }, stagedPath: PATH_SCHEMA, canonicalPath: PATH_SCHEMA,
  byteLength: { type: "integer", minimum: 1 }, fileSha256: SHA_SCHEMA,
});
const PUBLICATION_SCHEMA = closedSchema({
  transactionId: ID_SCHEMA, stagingDirectory: PATH_SCHEMA,
  files: arraySchema(PUBLICATION_FILE_SCHEMA, { minItems: 4, maxItems: 4, uniqueItems: true }),
});
const SESSION_ISSUE_SCHEMA = closedSchema({ code: ID_SCHEMA, location: { type: "string", minLength: 1 }, message: { type: "string", minLength: 1 } });
const RUNTIME_INVENTORY_OBSERVATION_SCHEMA = closedSchema({
  observedAt: UTC_SCHEMA,
  status: { enum: ["observed", "unavailable"] },
  inventoryCanonicalJson: nullableSchema({ type: "string", minLength: 2, maxLength: 4 * 1024 * 1024 }),
  inventoryCanonicalSha256: nullableSchema(SHA_SCHEMA),
  inventoryPayloadSha256: nullableSchema(SHA_SCHEMA),
  attestedProjectionCanonicalJson: nullableSchema({ type: "string", minLength: 2, maxLength: 1024 * 1024 }),
  attestedProjectionSha256: nullableSchema(SHA_SCHEMA),
  matchesFrozen: { type: "boolean" },
  issue: nullableSchema(SESSION_ISSUE_SCHEMA),
});
const MANIFEST_CALIBRATION_RESULT_SCHEMA = closedSchema({
  manifestRef: RECORD_REF_SCHEMA,
  partition: { enum: ["dev/calibration", "defect/calibration"] },
  registeredSourceCount: { type: "integer", minimum: 1 },
  registeredAttemptCount: { type: "integer", minimum: 1 },
  terminalAttemptCount: { type: "integer", minimum: 0 },
  passAttemptCount: { type: "integer", minimum: 0 },
  allTerminal: { type: "boolean" },
  allPass: { type: "boolean" },
  allApplicableSourcesDeterministic: { type: "boolean" },
});

function strictRecordSchema(schemaId, required, properties) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-05/schemas/${schemaId}`,
    ...closedSchema(properties, required),
  };
}

/** Recursively closed result schemas exported for generator/validator freezing. */
export const SLICE05_RUNNER_RECORD_SCHEMAS = Object.freeze({
  runRequest: strictRecordSchema("local-run-request.slice05.v0.schema.json", SLICE05_RUN_REQUEST_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.request }, requestId: ID_SCHEMA,
    mode: { enum: ["smoke", "calibration"] }, operation: { enum: ["normalize", "export"] },
    definitionRef: RECORD_REF_SCHEMA, contractRef: RECORD_REF_SCHEMA, manifestRef: RECORD_REF_SCHEMA,
    manifestEntryRef: MANIFEST_ENTRY_REF_SCHEMA, goldRecordRef: nullableSchema(RECORD_REF_SCHEMA),
    runtimeAttestationRef: RUNTIME_REF_SCHEMA, adapterRef: IMPLEMENTATION_REF_SCHEMA,
    oracleRef: IMPLEMENTATION_REF_SCHEMA, attempt: ATTEMPT_SCHEMA,
    expectedDisposition: { enum: ["applicable", "preflight-reject"] },
    expectedStableErrorCode: { type: ["string", "null"], pattern: "^S05_[A-Z0-9_]+$" },
    sourceIdentity: SOURCE_IDENTITY_SCHEMA, createdAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runClaim: strictRecordSchema("idempotency-claim.slice05.v0.schema.json", SLICE05_RUN_CLAIM_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.claim }, claimId: ID_SCHEMA,
    requestRef: REQUEST_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { enum: ["smoke", "calibration"] },
    operation: { enum: ["normalize", "export"] }, attempt: ATTEMPT_SCHEMA, claimedAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runEvent: strictRecordSchema("run-event.slice05.v0.schema.json", SLICE05_RUN_EVENT_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.event }, eventId: ID_SCHEMA,
    sequence: { type: "integer", minimum: 1 }, previousEventHash: SHA_SCHEMA,
    eventType: { enum: ["attempt-started", "attempt-terminal", "existing-terminal-returned", "conflict-rejected", "claim-reconciled", "publication-intent", "publication-complete", "publication-reconciliation-unknown"] },
    requestRef: REQUEST_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { enum: ["smoke", "calibration"] },
    operation: { enum: ["normalize", "export"] }, attempt: ATTEMPT_SCHEMA,
    status: nullableSchema({ enum: [...TERMINAL_STATUSES, "started", "existing"] }),
    reasonCode: { type: ["string", "null"] }, publication: nullableSchema(PUBLICATION_SCHEMA),
    occurredAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  runResult: strictRecordSchema("run-result.slice05.v0.schema.json", SLICE05_RUN_RESULT_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.result }, resultId: ID_SCHEMA,
    requestRef: REQUEST_REF_SCHEMA, idempotencyKeyHash: SHA_SCHEMA, mode: { enum: ["smoke", "calibration"] },
    operation: { enum: ["normalize", "export"] }, attempt: ATTEMPT_SCHEMA,
    expectedDisposition: { enum: ["applicable", "preflight-reject"] },
    expectedStableErrorCode: { type: ["string", "null"], pattern: "^S05_[A-Z0-9_]+$" },
    status: { enum: TERMINAL_STATUSES }, reasonCode: { type: ["string", "null"] },
    artifactRef: nullableSchema(ARTIFACT_REF_SCHEMA), oracleResultRef: nullableSchema(ORACLE_REF_SCHEMA),
    runtimeAttestationRef: RUNTIME_REF_SCHEMA, workerRuntime: nullableSchema(WORKER_RUNTIME_EVIDENCE_SCHEMA),
    workerObservation: { type: ["string", "null"], enum: ["worker-self-reported-observation-not-hard-isolation", null] },
    durationMs: { type: ["integer", "null"], minimum: 0, maximum: SLICE05_SHARP_POLICY.workerTimeoutMs }, resourceUsage: nullableSchema(RESOURCE_SCHEMA),
    workerExitConfirmed: { type: ["boolean", "null"] }, startedAt: UTC_SCHEMA, finishedAt: UTC_SCHEMA,
    evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  faultResult: strictRecordSchema("fault-semantics-result.slice05.v0.schema.json", SLICE05_FAULT_RESULT_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.faultResult }, faultResultId: ID_SCHEMA,
    definitionRef: RECORD_REF_SCHEMA, runtimeAttestationRef: RUNTIME_REF_SCHEMA,
    scenarios: arraySchema(FAULT_SCENARIO_SCHEMA, { minItems: 6, maxItems: 6, uniqueItems: true }),
    allPass: { type: "boolean" }, observedAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  sessionAudit: strictRecordSchema("smoke-session-audit.slice05.v0.schema.json", SLICE05_SESSION_AUDIT_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.sessionAudit }, auditId: ID_SCHEMA,
    operation: { enum: ["normalize", "export"] }, definitionRef: RECORD_REF_SCHEMA,
    gateBPlanRef: RECORD_REF_SCHEMA, manifestRef: RECORD_REF_SCHEMA, runtimeAttestationRef: RUNTIME_REF_SCHEMA,
    definitionIntegrity: { type: "boolean" }, runtimeIntegrityAtStart: { type: "boolean" }, runtimeIntegrityAtEnd: { type: "boolean" },
    runtimeStableStartToEnd: { type: "boolean" }, implementationIntegrity: { type: "boolean" }, sourceIsolation: { type: "boolean" },
    oracleIndependence: { type: "boolean" }, atomicCommitIntegrity: { type: "boolean" },
    issues: arraySchema(SESSION_ISSUE_SCHEMA, { uniqueItems: true }), auditedAt: UTC_SCHEMA,
    evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  smokeSummary: strictRecordSchema("smoke-summary.slice05.v0.schema.json", SLICE05_SMOKE_SUMMARY_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.smokeSummary }, summaryId: ID_SCHEMA,
    operation: { enum: ["normalize", "export"] }, definitionRef: RECORD_REF_SCHEMA,
    manifestRef: RECORD_REF_SCHEMA, runtimeAttestationRef: RUNTIME_REF_SCHEMA,
    sessionAuditRef: RECORD_REF_SCHEMA, faultSemanticsRef: RECORD_REF_SCHEMA,
    registeredCaseCount: { type: "integer", minimum: 1 }, registeredAttemptCount: { type: "integer", minimum: 1 },
    recordedAttemptCount: { type: "integer", minimum: 0 }, replacementAttemptCount: { type: "integer", minimum: 0 },
    terminalAttemptCount: { type: "integer", minimum: 0 }, missingAttemptCount: { type: "integer", minimum: 0 },
    passAttemptCount: { type: "integer", minimum: 0 }, nonPassAttemptCount: { type: "integer", minimum: 0 },
    falseAllowCount: { type: "integer", minimum: 0 }, falseRejectCount: { type: "integer", minimum: 0 },
    failureCount: { type: "integer", minimum: 0 }, oracleNonpassCount: { type: "integer", minimum: 0 },
    unregisteredTerminalCount: { type: "integer", minimum: 0 }, invalidNoResultCount: { type: "integer", minimum: 0 },
    timeoutCount: { type: "integer", minimum: 0 }, cancelledCount: { type: "integer", minimum: 0 },
    unknownReconciliationCount: { type: "integer", minimum: 0 }, allRegisteredAttemptsTerminal: { type: "boolean" },
    allRegisteredAttemptsPass: { type: "boolean" }, allApplicableSourcesDeterministic: { type: "boolean" },
    faultSemanticsAllPass: { type: "boolean" }, caseResults: arraySchema(CASE_RESULT_SCHEMA, { minItems: 1, uniqueItems: true }),
    overallStatus: { enum: ["all-pass", "non-pass", "inconclusive"] }, startedAt: UTC_SCHEMA,
    finishedAt: UTC_SCHEMA, evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  gateBDecision: strictRecordSchema("gate-b-decision.slice05.v0.schema.json", SLICE05_GATE_B_DECISION_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.gateBDecision }, decisionId: ID_SCHEMA,
    operation: { enum: ["normalize", "export"] }, definitionRef: RECORD_REF_SCHEMA,
    gateBPlanRef: RECORD_REF_SCHEMA, smokeSummaryRef: RECORD_REF_SCHEMA,
    conjunctResults: arraySchema(CONJUNCT_RESULT_SCHEMA, { minItems: 1, uniqueItems: true }),
    decision: { enum: ["calibration-ready", "denied-not-entered"] }, calibrationAuthorized: { type: "boolean" },
    productSupport: { const: false }, evidenceBoundary: EVIDENCE_SCHEMA, decidedAt: UTC_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  calibrationAdmission: strictRecordSchema("calibration-admission.slice05.v0.schema.json", SLICE05_CALIBRATION_ADMISSION_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.calibrationAdmission }, admissionId: ID_SCHEMA,
    operation: { enum: ["normalize", "export"] }, definitionRef: RECORD_REF_SCHEMA, gateBPlanRef: RECORD_REF_SCHEMA,
    gateBDecisionRef: RECORD_REF_SCHEMA, calibrationPreregistrationRef: RECORD_REF_SCHEMA,
    manifestRefs: arraySchema(RECORD_REF_SCHEMA, { minItems: 2, maxItems: 2, uniqueItems: true }),
    runtimeStartObservation: RUNTIME_INVENTORY_OBSERVATION_SCHEMA,
    decision: { const: "admitted-open-calibration" }, admittedAt: UTC_SCHEMA,
    evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
  calibrationSummary: strictRecordSchema("calibration-summary.slice05.v0.schema.json", SLICE05_CALIBRATION_SUMMARY_KEYS, {
    schemaVersion: { const: SLICE05_RUNNER_VERSIONS.calibrationSummary }, summaryId: ID_SCHEMA,
    operation: { enum: ["normalize", "export"] }, definitionRef: RECORD_REF_SCHEMA,
    gateBDecisionRef: RECORD_REF_SCHEMA, admissionRef: RECORD_REF_SCHEMA,
    manifestRefs: arraySchema(RECORD_REF_SCHEMA, { minItems: 2, maxItems: 2, uniqueItems: true }),
    runtimeAttestationRef: RUNTIME_REF_SCHEMA,
    runtimeStartObservation: RUNTIME_INVENTORY_OBSERVATION_SCHEMA,
    runtimeEndObservation: RUNTIME_INVENTORY_OBSERVATION_SCHEMA,
    registeredSourceCount: { type: "integer", const: 48 },
    registeredAttemptCount: { type: "integer", const: 144 }, recordedAttemptCount: { type: "integer", minimum: 0 },
    replacementAttemptCount: { type: "integer", minimum: 0 }, terminalAttemptCount: { type: "integer", minimum: 0 },
    missingAttemptCount: { type: "integer", minimum: 0 }, passAttemptCount: { type: "integer", minimum: 0 },
    nonPassAttemptCount: { type: "integer", minimum: 0 }, falseAllowCount: { type: "integer", minimum: 0 },
    falseRejectCount: { type: "integer", minimum: 0 }, failureCount: { type: "integer", minimum: 0 },
    oracleNonpassCount: { type: "integer", minimum: 0 }, invalidNoResultCount: { type: "integer", minimum: 0 },
    timeoutCount: { type: "integer", minimum: 0 }, cancelledCount: { type: "integer", minimum: 0 },
    unknownReconciliationCount: { type: "integer", minimum: 0 }, unregisteredTerminalCount: { type: "integer", minimum: 0 },
    allRegisteredAttemptsTerminal: { type: "boolean" }, allRegisteredAttemptsPass: { type: "boolean" },
    allApplicableSourcesDeterministic: { type: "boolean" }, runtimeStableBeforeAndAfter: { type: "boolean" }, outputClosurePass: { type: "boolean" },
    caseResults: arraySchema(CALIBRATION_CASE_RESULT_SCHEMA, { minItems: 48, maxItems: 48, uniqueItems: true }),
    manifestResults: arraySchema(MANIFEST_CALIBRATION_RESULT_SCHEMA, { minItems: 2, maxItems: 2 }),
    overallStatus: { enum: ["all-pass", "non-pass", "inconclusive"] }, startedAt: UTC_SCHEMA, finishedAt: UTC_SCHEMA,
    evidenceBoundary: EVIDENCE_SCHEMA, contentHash: SHA_SCHEMA,
  }),
});

export class Slice05RunnerError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "Slice05RunnerError";
    this.code = code;
  }
}

export class Slice05NoResultError extends Slice05RunnerError {
  constructor(reason, message = "attempt ended before a result") {
    if (!ALLOWED_NO_RESULT_REASONS.includes(reason)) {
      throw new Slice05RunnerError("S05_NO_RESULT_REASON_FORBIDDEN", "no-result reason is outside the frozen three-value allowlist");
    }
    super("S05_ALLOWED_NO_RESULT", message);
    this.reason = reason;
  }
}

function reject(code, message, options = undefined) {
  throw new Slice05RunnerError(code, message, options);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(value, keys, code, label) {
  if (!isPlainObject(value)) reject(code, `${label} must be a plain object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    reject(code, `${label} must contain exactly: ${keys.join(", ")}`);
  }
}

function assertId(value, code, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value)
    || value.includes("..")) {
    reject(code, `${label} is outside the closed identifier profile`);
  }
}

function assertSha(value, code, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) reject(code, `${label} must be a lowercase SHA-256`);
}

function assertUtc(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value) {
    reject(code, `${label} must be a valid millisecond-precision UTC date-time`);
  }
}

function assertRef(value, code, label) {
  assertExactObject(value, REF_KEYS, code, label);
  assertId(value.id, code, `${label}.id`);
  assertSha(value.contentHash, code, `${label}.contentHash`);
}

function assertRelativePath(value, code, label) {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("\\") || value.includes(":")
    || value.split("/").some((part) => part === ".." || part === "." || part === "") || !/^[A-Za-z0-9._@/-]+$/.test(value)) {
    reject(code, `${label} must be a normalized repository-relative path`);
  }
}

function assertRecordRef(value, code, label) {
  assertExactObject(value, RECORD_REF_KEYS, code, label);
  assertRelativePath(value.path, code, `${label}.path`);
  assertId(value.id, code, `${label}.id`);
  assertSha(value.contentHash, code, `${label}.contentHash`);
  if (!Number.isInteger(value.byteLength) || value.byteLength < 1) reject(code, `${label}.byteLength must be positive`);
  assertSha(value.fileSha256, code, `${label}.fileSha256`);
}

function assertRuntimeAttestationRef(value, code, label) {
  assertExactObject(value, RUNTIME_ATTESTATION_REF_KEYS, code, label);
  assertRelativePath(value.path, code, `${label}.path`);
  assertId(value.id, code, `${label}.id`);
  assertSha(value.contentHash, code, `${label}.contentHash`);
  if (!Number.isInteger(value.byteLength) || value.byteLength < 1) reject(code, `${label}.byteLength must be positive`);
  assertSha(value.fileSha256, code, `${label}.fileSha256`);
  assertSha(value.inventoryPayloadSha256, code, `${label}.inventoryPayloadSha256`);
}

function assertImplementationRef(value, code, label) {
  assertExactObject(value, IMPLEMENTATION_REF_KEYS, code, label);
  assertId(value.id, code, `${label}.id`);
  assertId(value.version, code, `${label}.version`);
  assertSha(value.implementationSha256, code, `${label}.implementationSha256`);
}

function assertAttempt(value, code, label = "attempt", mode = null) {
  assertExactObject(value, ATTEMPT_KEYS, code, label);
  assertId(value.runId, code, `${label}.runId`);
  assertId(value.sourceId, code, `${label}.sourceId`);
  assertId(value.idempotencyKey, code, `${label}.idempotencyKey`);
  if (!SLICE05_SHARP_POLICY.allowedPartitions.includes(value.partition)) reject(code, `${label}.partition is outside the frozen open profile`);
  if (mode === "smoke" && value.partition !== "smoke") reject(code, `${label}.partition must be smoke in smoke mode`);
  if (mode === "calibration" && !new Set(["dev/calibration", "defect/calibration"]).has(value.partition)) {
    reject(code, `${label}.partition must be an open calibration partition in calibration mode`);
  }
  if (!Number.isInteger(value.repetition) || value.repetition < 1 || value.repetition > 3) {
    reject(code, `${label}.repetition must be 1..3`);
  }
  if (!Number.isInteger(value.attemptNumber) || value.attemptNumber < 1 || value.attemptNumber > 2) {
    reject(code, `${label}.attemptNumber must be 1 or the sole allowed replacement 2`);
  }
}

export function requestIdSlice05Runner({ operation, manifestContentHash, sourceId, repetition, attemptNumber }) {
  if (!new Set(["normalize", "export"]).has(operation)) reject("S05_REQUEST_ID_INPUT_INVALID", "operation invalid");
  assertSha(manifestContentHash, "S05_REQUEST_ID_INPUT_INVALID", "manifestContentHash");
  assertId(sourceId, "S05_REQUEST_ID_INPUT_INVALID", "sourceId");
  if (!Number.isInteger(repetition) || repetition < 1 || repetition > 3
    || !Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 2) {
    reject("S05_REQUEST_ID_INPUT_INVALID", "repetition/attempt invalid");
  }
  const sourceHash = sha256Slice05(Buffer.from(sourceId, "utf8")).slice(0, 16);
  return `request.${operation}.${manifestContentHash.slice(0, 16)}.${sourceHash}.r${repetition}.a${attemptNumber}`;
}

export function artifactRelativePathSlice05({ mode, operation, attempt }) {
  if (!new Set(["smoke", "calibration"]).has(mode) || !new Set(["normalize", "export"]).has(operation)) {
    reject("S05_OUTPUT_PATH_INPUT_INVALID", "mode/operation invalid");
  }
  assertAttempt(attempt, "S05_OUTPUT_PATH_INPUT_INVALID", "attempt", mode);
  if (attempt.sourceId.includes("/")) reject("S05_OUTPUT_PATH_INPUT_INVALID", "sourceId cannot contain a path separator");
  return `artifacts/${mode}/${operation}/${attempt.sourceId}/r${attempt.repetition}/a${attempt.attemptNumber}/output.png`;
}

export function artifactRecordRelativePathSlice05({ mode, operation, attempt }) {
  artifactRelativePathSlice05({ mode, operation, attempt });
  return `artifact-records/${mode}/${operation}/${attempt.sourceId}/r${attempt.repetition}/a${attempt.attemptNumber}/artifact-record.json`;
}

export function oracleRelativePathSlice05({ mode, operation, attempt }) {
  artifactRelativePathSlice05({ mode, operation, attempt });
  return `oracle/${mode}/${operation}/${attempt.sourceId}/r${attempt.repetition}/a${attempt.attemptNumber}/oracle-result.json`;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringifySlice05Runner(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function stableCompactSlice05Runner(value) {
  return JSON.stringify(stableValue(value));
}

export function contentHashSlice05Runner(record) {
  const copy = structuredClone(record);
  delete copy.contentHash;
  return createHash("sha256").update(stableStringifySlice05Runner(copy), "utf8").digest("hex");
}

function withContentHash(record) {
  return { ...record, contentHash: contentHashSlice05Runner(record) };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function frozenClone(value) {
  return deepFreeze(structuredClone(value));
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function validateSlice05RunRequest(request) {
  const code = "S05_RUN_REQUEST_INVALID";
  assertExactObject(request, SLICE05_RUN_REQUEST_KEYS, code, "request");
  if (request.schemaVersion !== SLICE05_RUNNER_VERSIONS.request
    || !new Set(["smoke", "calibration"]).has(request.mode)
    || !new Set(["normalize", "export"]).has(request.operation)) {
    reject(code, "request schemaVersion, mode or operation is invalid");
  }
  assertId(request.requestId, code, "request.requestId");
  assertRecordRef(request.definitionRef, code, "request.definitionRef");
  assertRecordRef(request.contractRef, code, "request.contractRef");
  assertRecordRef(request.manifestRef, code, "request.manifestRef");
  assertExactObject(request.manifestEntryRef, MANIFEST_ENTRY_REF_KEYS, code, "request.manifestEntryRef");
  if (!Number.isInteger(request.manifestEntryRef.entryIndex) || request.manifestEntryRef.entryIndex < 0) {
    reject(code, "request.manifestEntryRef.entryIndex must be nonnegative");
  }
  assertId(request.manifestEntryRef.sourceId, code, "request.manifestEntryRef.sourceId");
  assertSha(request.manifestEntryRef.contentHash, code, "request.manifestEntryRef.contentHash");
  if (request.goldRecordRef !== null) assertRecordRef(request.goldRecordRef, code, "request.goldRecordRef");
  assertRuntimeAttestationRef(request.runtimeAttestationRef, code, "request.runtimeAttestationRef");
  assertImplementationRef(request.adapterRef, code, "request.adapterRef");
  assertImplementationRef(request.oracleRef, code, "request.oracleRef");
  if (request.adapterRef.implementationSha256 === request.oracleRef.implementationSha256) {
    reject(code, "request independent oracle cannot share the adapter implementation hash");
  }
  assertAttempt(request.attempt, code, "request.attempt", request.mode);
  if (!new Set(["applicable", "preflight-reject"]).has(request.expectedDisposition)) {
    reject(code, "request.expectedDisposition is invalid");
  }
  if (request.expectedDisposition === "applicable") {
    if (request.expectedStableErrorCode !== null) reject(code, "applicable request cannot expect an error code");
    if (request.goldRecordRef === null) reject(code, "applicable request requires a frozen gold record ref");
  } else if (typeof request.expectedStableErrorCode !== "string"
    || !/^S05_[A-Z0-9_]+$/.test(request.expectedStableErrorCode)) {
    reject(code, "preflight-reject request requires one stable S05 error code");
  } else if (request.goldRecordRef !== null) {
    reject(code, "goldRecordRef is nullable only for registered rejection cases and must be null there");
  }
  assertExactObject(request.sourceIdentity, SOURCE_IDENTITY_KEYS, code, "request.sourceIdentity");
  assertId(request.sourceIdentity.sourceId, code, "request.sourceIdentity.sourceId");
  assertRecordRef(request.sourceIdentity.sourceProvenanceRef, code, "request.sourceIdentity.sourceProvenanceRef");
  assertExactObject(request.sourceIdentity.rawAssetRef, RAW_ASSET_REF_KEYS, code, "request.sourceIdentity.rawAssetRef");
  assertRelativePath(request.sourceIdentity.rawAssetRef.path, code, "request.sourceIdentity.rawAssetRef.path");
  if (!new Set(["image/png", "image/jpeg", "image/webp", "application/octet-stream"]).has(request.sourceIdentity.rawAssetRef.mime)
    || !Number.isInteger(request.sourceIdentity.rawAssetRef.byteLength) || request.sourceIdentity.rawAssetRef.byteLength < 1
    || request.sourceIdentity.rawAssetRef.byteLength > SLICE05_SHARP_POLICY.maxInputBytes + 1) {
    reject(code, "request raw asset profile is invalid");
  }
  assertSha(request.sourceIdentity.rawAssetRef.fileSha256, code, "request.sourceIdentity.rawAssetRef.fileSha256");
  assertSha(request.sourceIdentity.rawAssetRef.decodedPixelSha256, code, "request.sourceIdentity.rawAssetRef.decodedPixelSha256", true);
  assertSha(request.sourceIdentity.rawAssetRef.sourceDeclarationDecodedPixelSha256, code, "request.sourceIdentity.rawAssetRef.sourceDeclarationDecodedPixelSha256");
  if (request.sourceIdentity.normalizedArtifactRef !== null) {
    assertExactObject(request.sourceIdentity.normalizedArtifactRef, NORMALIZED_INPUT_REF_KEYS, code, "request.sourceIdentity.normalizedArtifactRef");
    assertRelativePath(request.sourceIdentity.normalizedArtifactRef.path, code, "request.sourceIdentity.normalizedArtifactRef.path");
    assertId(request.sourceIdentity.normalizedArtifactRef.id, code, "request.sourceIdentity.normalizedArtifactRef.id");
    assertSha(request.sourceIdentity.normalizedArtifactRef.contentHash, code, "request.sourceIdentity.normalizedArtifactRef.contentHash");
    if (!Number.isInteger(request.sourceIdentity.normalizedArtifactRef.byteLength)
      || request.sourceIdentity.normalizedArtifactRef.byteLength < 1) reject(code, "normalized input ref length invalid");
    assertSha(request.sourceIdentity.normalizedArtifactRef.fileSha256, code, "request.sourceIdentity.normalizedArtifactRef.fileSha256");
    if (request.sourceIdentity.normalizedArtifactRef.producerKind !== "independent-fixture-generator") {
      reject(code, "normalized input ref producer must be independent");
    }
  }
  if (request.operation === "normalize" && request.sourceIdentity.normalizedArtifactRef !== null) {
    reject(code, "normalize request cannot bind a normalized input artifact");
  }
  if (request.operation === "export" && request.sourceIdentity.normalizedArtifactRef === null) {
    reject(code, "export request requires an independently produced normalized input artifact ref");
  }
  if (request.sourceIdentity.sourceId !== request.attempt.sourceId
    || request.manifestEntryRef.sourceId !== request.attempt.sourceId) reject(code, "request source identities differ");
  if (request.attempt.sourceId.includes("/")) reject(code, "sourceId cannot contain a path separator in the canonical output profile");
  const expectedRequestId = requestIdSlice05Runner({
    operation: request.operation,
    manifestContentHash: request.manifestRef.contentHash,
    sourceId: request.attempt.sourceId,
    repetition: request.attempt.repetition,
    attemptNumber: request.attempt.attemptNumber,
  });
  if (request.requestId !== expectedRequestId) reject(code, "requestId is not the deterministic manifest/source/repetition/attempt binding");
  assertUtc(request.createdAt, code, "request.createdAt");
  assertSha(request.contentHash, code, "request.contentHash");
  if (request.contentHash !== contentHashSlice05Runner(request)) reject(code, "request.contentHash does not match canonical content");
  return request;
}

function validateClaim(claim) {
  const code = "S05_RUN_CLAIM_CORRUPT";
  assertExactObject(claim, SLICE05_RUN_CLAIM_KEYS, code, "claim");
  if (claim.schemaVersion !== SLICE05_RUNNER_VERSIONS.claim) reject(code, "claim schemaVersion is invalid");
  assertId(claim.claimId, code, "claim.claimId");
  assertExactObject(claim.requestRef, REQUEST_REF_KEYS, code, "claim.requestRef");
  assertId(claim.requestRef.id, code, "claim.requestRef.id");
  assertSha(claim.requestRef.contentHash, code, "claim.requestRef.contentHash");
  assertSha(claim.idempotencyKeyHash, code, "claim.idempotencyKeyHash");
  if (!new Set(["smoke", "calibration"]).has(claim.mode)
    || !new Set(["normalize", "export"]).has(claim.operation)) reject(code, "claim mode/operation is invalid");
  assertAttempt(claim.attempt, code, "claim.attempt", claim.mode);
  assertUtc(claim.claimedAt, code, "claim.claimedAt");
  assertSha(claim.contentHash, code, "claim.contentHash");
  if (claim.contentHash !== contentHashSlice05Runner(claim)) reject(code, "claim content hash mismatch");
  return claim;
}

function validateArtifactRef(value, code, label) {
  if (value === null) return;
  assertExactObject(value, ARTIFACT_REF_KEYS, code, label);
  if (!new Set([SLICE05_SHARP_POLICY.normalizedArtifactVersion, SLICE05_SHARP_POLICY.deliveryArtifactVersion]).has(value.schemaVersion)) {
    reject(code, `${label}.schemaVersion is invalid`);
  }
  assertId(value.id, code, `${label}.id`);
  assertSha(value.contentHash, code, `${label}.contentHash`);
  assertRelativePath(value.recordRelativePath, code, `${label}.recordRelativePath`);
  if (!Number.isInteger(value.recordByteLength) || value.recordByteLength < 1) reject(code, `${label}.recordByteLength is invalid`);
  assertSha(value.recordFileSha256, code, `${label}.recordFileSha256`);
  if (typeof value.relativePath !== "string" || value.relativePath.includes("\\") || value.relativePath.includes("..")
    || !/^[A-Za-z0-9._/-]+$/.test(value.relativePath)) reject(code, `${label}.relativePath is invalid`);
  if (!Number.isInteger(value.byteLength) || value.byteLength < 1 || value.byteLength > 1024 * 1024) {
    reject(code, `${label}.byteLength is invalid`);
  }
  assertSha(value.fileSha256, code, `${label}.fileSha256`);
  assertSha(value.decodedPixelSha256, code, `${label}.decodedPixelSha256`);
}

function validateOracleResultRef(value, code, label) {
  if (value === null) return;
  assertExactObject(value, ORACLE_RESULT_REF_KEYS, code, label);
  assertId(value.id, code, `${label}.id`);
  assertSha(value.contentHash, code, `${label}.contentHash`);
  if (typeof value.relativePath !== "string" || !/^[A-Za-z0-9._/-]+$/.test(value.relativePath)
    || value.relativePath.includes("..")) reject(code, `${label}.relativePath is invalid`);
}

function validateResourceUsage(value, code, label) {
  if (value === null) return;
  assertExactObject(value, RESOURCE_USAGE_KEYS, code, label);
  if (RESOURCE_USAGE_KEYS.some((key) => !Number.isInteger(value[key]) || value[key] < 0)) {
    reject(code, `${label} must contain nonnegative integer counters`);
  }
  if (value.maxRssKiB > SLICE05_SHARP_POLICY.observedMaxRssKiB) {
    reject(code, `${label}.maxRssKiB exceeds the frozen observed (not hard-isolation) gate`);
  }
}

function validateWorkerRuntimeEvidence(value, code, label) {
  if (value === null) return;
  assertExactObject(value, WORKER_RUNTIME_EVIDENCE_KEYS, code, label);
  assertSha(value.payloadSha256, code, `${label}.payloadSha256`);
  if (isPlainObject(value.payload)) {
    assertExactObject(value.payload.nativeVersions, WORKER_NATIVE_VERSION_KEYS, code, `${label}.payload.nativeVersions`);
  }
  try {
    validateWorkerRuntimeSlice05(value.payload, value.payload);
  } catch (cause) {
    reject(code, `${label}.payload is outside the frozen closed worker runtime profile`, { cause });
  }
  const payloadHash = sha256Slice05(Buffer.from(stableStringifySlice05Runner(value.payload), "utf8"));
  if (value.payloadSha256 !== payloadHash) reject(code, `${label}.payloadSha256 does not match its embedded payload`);
}

export function validateSlice05RunResult(result) {
  const code = "S05_RUN_RESULT_CORRUPT";
  assertExactObject(result, SLICE05_RUN_RESULT_KEYS, code, "result");
  if (result.schemaVersion !== SLICE05_RUNNER_VERSIONS.result || !TERMINAL_STATUSES.includes(result.status)
    || !new Set(["smoke", "calibration"]).has(result.mode)
    || !new Set(["normalize", "export"]).has(result.operation)) reject(code, "result profile is invalid");
  assertId(result.resultId, code, "result.resultId");
  assertExactObject(result.requestRef, REQUEST_REF_KEYS, code, "result.requestRef");
  assertId(result.requestRef.id, code, "result.requestRef.id");
  assertSha(result.requestRef.contentHash, code, "result.requestRef.contentHash");
  assertSha(result.idempotencyKeyHash, code, "result.idempotencyKeyHash");
  assertAttempt(result.attempt, code, "result.attempt", result.mode);
  if (!new Set(["applicable", "preflight-reject"]).has(result.expectedDisposition)) reject(code, "result disposition invalid");
  if (result.expectedStableErrorCode !== null && typeof result.expectedStableErrorCode !== "string") reject(code, "result error expectation invalid");
  if (result.reasonCode !== null && typeof result.reasonCode !== "string") reject(code, "result reasonCode invalid");
  validateArtifactRef(result.artifactRef, code, "result.artifactRef");
  validateOracleResultRef(result.oracleResultRef, code, "result.oracleResultRef");
  assertRuntimeAttestationRef(result.runtimeAttestationRef, code, "result.runtimeAttestationRef");
  validateWorkerRuntimeEvidence(result.workerRuntime, code, "result.workerRuntime");
  if (result.workerObservation !== null && result.workerObservation !== "worker-self-reported-observation-not-hard-isolation") {
    reject(code, "result.workerObservation is invalid");
  }
  if (result.durationMs !== null && (!Number.isInteger(result.durationMs) || result.durationMs < 0
    || result.durationMs > SLICE05_SHARP_POLICY.workerTimeoutMs)) reject(code, "result duration invalid");
  validateResourceUsage(result.resourceUsage, code, "result.resourceUsage");
  if (result.workerExitConfirmed !== null && typeof result.workerExitConfirmed !== "boolean") reject(code, "result exit confirmation invalid");
  assertUtc(result.startedAt, code, "result.startedAt");
  assertUtc(result.finishedAt, code, "result.finishedAt");
  if (stableStringifySlice05Runner(result.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) {
    reject(code, "result evidence boundary must remain all-zero/non-release");
  }
  assertSha(result.contentHash, code, "result.contentHash");
  if (result.contentHash !== contentHashSlice05Runner(result)) reject(code, "result content hash mismatch");
  if (result.status === "invalid-no-result" && !ALLOWED_NO_RESULT_REASONS.includes(result.reasonCode)) {
    reject(code, "invalid-no-result reason is outside the frozen allowlist");
  }
  if (Date.parse(result.startedAt) > Date.parse(result.finishedAt)) reject(code, "result time order is invalid");
  const applicablePass = result.expectedDisposition === "applicable" && result.status === "pass";
  const rejectionPass = result.expectedDisposition === "preflight-reject" && result.status === "pass";
  if (applicablePass) {
    if (result.reasonCode !== null || result.artifactRef === null || result.oracleResultRef === null
      || result.workerRuntime === null || result.workerObservation !== "worker-self-reported-observation-not-hard-isolation"
      || result.durationMs === null || result.resourceUsage === null
      || result.workerExitConfirmed !== true) reject(code, "applicable pass must bind artifact, oracle, runtime, resources and confirmed exit");
    if (result.artifactRef.relativePath !== artifactRelativePathSlice05(result)
      || result.artifactRef.recordRelativePath !== artifactRecordRelativePathSlice05(result)
      || result.artifactRef.schemaVersion !== (result.operation === "normalize"
        ? SLICE05_SHARP_POLICY.normalizedArtifactVersion : SLICE05_SHARP_POLICY.deliveryArtifactVersion)
      || result.oracleResultRef.relativePath !== oracleRelativePathSlice05(result)) {
      reject(code, "applicable pass output refs do not match the unique mode/operation/source/repetition/attempt paths");
    }
  } else if (rejectionPass) {
    if (result.reasonCode !== result.expectedStableErrorCode || result.artifactRef !== null
      || result.oracleResultRef !== null || result.workerRuntime !== null || result.workerObservation !== null
      || result.durationMs !== null || result.resourceUsage !== null) reject(code, "registered preflight rejection pass must carry only its exact stable reason");
  } else {
    if (result.artifactRef !== null || result.oracleResultRef !== null) reject(code, "nonpass/no-result cannot retain artifact or oracle evidence");
    const observationFields = [result.workerRuntime, result.workerObservation, result.durationMs, result.resourceUsage];
    const allObserved = observationFields.every((value) => value !== null);
    const noneObserved = observationFields.every((value) => value === null);
    if ((!allObserved && !noneObserved) || (allObserved && result.status !== "nonpass")) {
      reject(code, "worker observation evidence must be an all-or-none tuple and is retained only for completed nonpass executions");
    }
  }
  if (result.status === "timeout" || result.status === "cancelled") {
    if (result.workerExitConfirmed !== true) reject(code, "timeout/cancel terminal status requires confirmed worker exit");
  }
  if (result.status === "unknown-reconciliation" && result.workerExitConfirmed !== false) {
    reject(code, "unknown reconciliation must retain unconfirmed worker exit");
  }
  if (result.status === "invalid-no-result" && result.workerExitConfirmed !== true) {
    reject(code, "replaceable no-result must have confirmed custody/exit state");
  }
  return result;
}

async function pathExists(filename) {
  try {
    await stat(filename);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(filename, code) {
  let text;
  try {
    text = await readFile(filename, "utf8");
  } catch (cause) {
    reject(code, `cannot read ${filename}`, { cause });
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    reject(code, `invalid JSON at ${filename}`, { cause });
  }
}

async function atomicWrite(filename, bytes) {
  await mkdir(path.dirname(filename), { recursive: true });
  if (await pathExists(filename)) reject("S05_ATOMIC_TARGET_EXISTS", `immutable target already exists: ${filename}`);
  const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx");
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    if (await pathExists(filename)) reject("S05_ATOMIC_TARGET_EXISTS", `immutable target appeared before rename: ${filename}`);
    await rename(temporary, filename);
  } catch (cause) {
    try {
      await handle?.close();
    } catch {}
    try {
      await unlink(temporary);
    } catch {}
    if (cause instanceof Slice05RunnerError) throw cause;
    reject("S05_ATOMIC_WRITE_FAILED", `atomic temp-to-rename write failed for ${filename}`, { cause });
  }
}

async function atomicWriteJson(filename, record) {
  await atomicWrite(filename, Buffer.from(stableStringifySlice05Runner(record), "utf8"));
}

async function acquireDirectoryLock(lockPath, { attempts = 200, delayMs = 5 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await mkdir(lockPath);
      return async () => {
        try {
          await rmdir(lockPath);
        } catch (cause) {
          reject("S05_LOCK_RELEASE_FAILED", `could not release ${lockPath}`, { cause });
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  reject("S05_LOCK_RECONCILIATION_REQUIRED", `lock remained active: ${lockPath}`);
}

function idempotencyHash(key) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

function requestRef(request) {
  return { id: request.requestId, contentHash: request.contentHash };
}

function requestWithoutIssuance(request) {
  const copy = structuredClone(request);
  delete copy.createdAt;
  delete copy.contentHash;
  return copy;
}

async function resolveStoredRequest(root, candidate, keyHash) {
  const filename = requestPath(root, keyHash);
  if (!(await pathExists(filename))) return candidate;
  const stored = validateSlice05RunRequest(await readJson(filename, "S05_RUN_REQUEST_CORRUPT"));
  if (idempotencyHash(stored.attempt.idempotencyKey) !== keyHash
    || stableStringifySlice05Runner(requestWithoutIssuance(stored)) !== stableStringifySlice05Runner(requestWithoutIssuance(candidate))) {
    reject("S05_IDEMPOTENCY_CONFLICT", "stored idempotency request differs beyond its original issuance timestamp");
  }
  return stored;
}

function normalizeResultsRoot(resultsRoot, { testOnly = false, mode = null } = {}) {
  const resolved = path.resolve(resultsRoot ?? DEFAULT_RESULTS_ROOT);
  if (resolved === PROJECT_ROOT || resolved === path.parse(resolved).root) {
    reject("S05_RESULTS_ROOT_FORBIDDEN", "runner resultsRoot is too broad");
  }
  if (!testOnly) {
    const allowedBases = mode === "smoke" ? [DEFAULT_RESULTS_ROOT]
      : mode === "calibration" ? [DEFAULT_CALIBRATION_RESULTS_ROOT]
        : [DEFAULT_RESULTS_ROOT, DEFAULT_CALIBRATION_RESULTS_ROOT];
    const allowed = allowedBases.some((base) => resolved === base || resolved.startsWith(`${base}${path.sep}`));
    if (!allowed) reject("S05_RESULTS_ROOT_FORBIDDEN", "production runner output must stay below the exact open-smoke/open-calibration roots");
  }
  return resolved;
}

async function assertNoSymlinkOrJunctionInPath(target, { testOnly = false } = {}) {
  if (testOnly) return;
  const projectReal = await realpath(PROJECT_ROOT);
  const relative = path.relative(PROJECT_ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) reject("S05_RESULTS_ROOT_FORBIDDEN", "resultsRoot escapes projectRoot");
  let cursor = PROJECT_ROOT;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    let stats;
    try {
      stats = await lstat(cursor);
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
    if (stats.isSymbolicLink()) reject("S05_RESULTS_ROOT_LINK_FORBIDDEN", `symlink/junction forbidden in results path: ${cursor}`);
    const resolvedExisting = await realpath(cursor);
    if (resolvedExisting !== projectReal && !resolvedExisting.startsWith(`${projectReal}${path.sep}`)) {
      reject("S05_RESULTS_ROOT_LINK_FORBIDDEN", "results path resolves outside projectRoot");
    }
  }
}

function resultPath(resultsRoot, keyHash) {
  return path.join(resultsRoot, "records", `${keyHash}.result.json`);
}

function claimPath(resultsRoot, keyHash) {
  return path.join(resultsRoot, "claims", `${keyHash}.claim.json`);
}

function requestPath(resultsRoot, keyHash) {
  return path.join(resultsRoot, "requests", `${keyHash}.request.json`);
}

async function readResults(resultsRoot) {
  const directory = path.join(resultsRoot, "records");
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const results = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".result.json")) continue;
    const record = await readJson(path.join(directory, name), "S05_RUN_RESULT_CORRUPT");
    validateSlice05RunResult(record);
    results.push(record);
  }
  return results;
}

async function readClaims(resultsRoot) {
  const directory = path.join(resultsRoot, "claims");
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const claims = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".claim.json")) continue;
    claims.push(validateClaim(await readJson(path.join(directory, name), "S05_RUN_CLAIM_CORRUPT")));
  }
  return claims;
}

async function readRequests(resultsRoot) {
  const directory = path.join(resultsRoot, "requests");
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const requests = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".request.json")) continue;
    requests.push(validateSlice05RunRequest(await readJson(path.join(directory, name), "S05_RUN_REQUEST_CORRUPT")));
  }
  return requests;
}

function validateReplacementAndSlot(request, claims, results, priorRequests) {
  const reusedSource = priorRequests.find((prior) => prior.attempt.sourceId === request.attempt.sourceId
    && (prior.operation !== request.operation || prior.mode !== request.mode
      || prior.attempt.partition !== request.attempt.partition
      || prior.manifestRef.contentHash !== request.manifestRef.contentHash));
  if (reusedSource) reject("S05_SOURCE_IDENTITY_REUSE", "sourceId must be globally unique to one operation/partition/manifest");
  const sameSourceClaims = claims.filter((claim) => claim.attempt.sourceId === request.attempt.sourceId);
  const sameSourceResults = results.filter((result) => result.attempt.sourceId === request.attempt.sourceId);
  const sameSlot = sameSourceClaims.filter((record) => record.attempt.repetition === request.attempt.repetition
    && record.attempt.attemptNumber === request.attempt.attemptNumber);
  if (sameSlot.length > 0) reject("S05_ATTEMPT_SLOT_ALREADY_CLAIMED", "source/repetition/attempt slot is immutable and already claimed");

  if (request.attempt.attemptNumber === 1) return;
  const allAttemptTwo = sameSourceClaims.filter((record) => record.attempt.attemptNumber === 2);
  if (allAttemptTwo.length > 0) reject("S05_REPLACEMENT_LIMIT_EXCEEDED", "source already consumed its one replacement across all repetitions");
  const replaced = sameSourceResults.find((result) => result.attempt.repetition === request.attempt.repetition
    && result.attempt.attemptNumber === 1);
  if (!replaced || replaced.status !== "invalid-no-result" || !ALLOWED_NO_RESULT_REASONS.includes(replaced.reasonCode)) {
    reject("S05_REPLACEMENT_NOT_AUTHORIZED", "attempt 2 requires the corresponding allowed pre-result no-result attempt 1");
  }
}

function eventStatus(value) {
  return value === null || TERMINAL_STATUSES.includes(value) || value === "started" || value === "existing" ? value : null;
}

function validatePublication(value, code, label) {
  if (value === null) return;
  assertExactObject(value, PUBLICATION_KEYS, code, label);
  assertId(value.transactionId, code, `${label}.transactionId`);
  assertRelativePath(value.stagingDirectory, code, `${label}.stagingDirectory`);
  if (!Array.isArray(value.files) || value.files.length !== 4) reject(code, `${label}.files must contain artifact bytes/artifact record/oracle/result`);
  const roles = new Set();
  for (const [index, file] of value.files.entries()) {
    assertExactObject(file, PUBLICATION_FILE_KEYS, code, `${label}.files[${index}]`);
    if (!new Set(["artifact-bytes", "artifact-record", "oracle", "result"]).has(file.role) || roles.has(file.role)) reject(code, `${label} file roles invalid`);
    roles.add(file.role);
    assertRelativePath(file.stagedPath, code, `${label}.files[${index}].stagedPath`);
    assertRelativePath(file.canonicalPath, code, `${label}.files[${index}].canonicalPath`);
    if (!file.stagedPath.startsWith(`${value.stagingDirectory}/`)
      || !Number.isInteger(file.byteLength) || file.byteLength < 1) reject(code, `${label} staged file profile invalid`);
    assertSha(file.fileSha256, code, `${label}.files[${index}].fileSha256`);
  }
  if (roles.size !== 4) reject(code, `${label} must contain each frozen publication role exactly once`);
}

function validateLedgerEvent(event, index, previousHash, previousTime) {
  const code = "S05_LEDGER_CORRUPT";
  assertExactObject(event, SLICE05_RUN_EVENT_KEYS, code, `event[${index}]`);
  if (event.schemaVersion !== SLICE05_RUNNER_VERSIONS.event || event.sequence !== index + 1
    || event.previousEventHash !== previousHash || event.contentHash !== contentHashSlice05Runner(event)) {
    reject(code, `event[${index}] hash chain or sequence is invalid`);
  }
  assertId(event.eventId, code, `event[${index}].eventId`);
  if (!new Set(["attempt-started", "attempt-terminal", "existing-terminal-returned", "conflict-rejected", "claim-reconciled",
    "publication-intent", "publication-complete", "publication-reconciliation-unknown"]).has(event.eventType)) {
    reject(code, `event[${index}].eventType is invalid`);
  }
  assertExactObject(event.requestRef, REQUEST_REF_KEYS, code, `event[${index}].requestRef`);
  assertId(event.requestRef.id, code, `event[${index}].requestRef.id`);
  assertSha(event.requestRef.contentHash, code, `event[${index}].requestRef.contentHash`);
  assertSha(event.idempotencyKeyHash, code, `event[${index}].idempotencyKeyHash`);
  if (!new Set(["smoke", "calibration"]).has(event.mode) || !new Set(["normalize", "export"]).has(event.operation)) {
    reject(code, `event[${index}] mode/operation invalid`);
  }
  assertAttempt(event.attempt, code, `event[${index}].attempt`, event.mode);
  if (event.status !== null && eventStatus(event.status) !== event.status) reject(code, `event[${index}].status invalid`);
  if (event.reasonCode !== null && typeof event.reasonCode !== "string") reject(code, `event[${index}].reasonCode invalid`);
  validatePublication(event.publication, code, `event[${index}].publication`);
  const publicationEvent = event.eventType.startsWith("publication-");
  if (publicationEvent !== (event.publication !== null)) reject(code, "publication details must exist only on publication events");
  assertUtc(event.occurredAt, code, `event[${index}].occurredAt`);
  if (previousTime !== null && Date.parse(event.occurredAt) < Date.parse(previousTime)) reject(code, "ledger event time regressed");
  return event;
}

async function readAndVerifyLedger(ledgerPath) {
  let text;
  try {
    text = await readFile(ledgerPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  if (text === "") return [];
  if (!text.endsWith("\n")) reject("S05_LEDGER_CORRUPT", "append-only ledger ends with a partial record");
  const events = text.trimEnd().split("\n").map((line) => {
    try {
      return JSON.parse(line);
    } catch (cause) {
      reject("S05_LEDGER_CORRUPT", "append-only ledger contains invalid JSON", { cause });
    }
  });
  let previous = ZERO_HASH;
  let previousTime = null;
  events.forEach((event, index) => {
    validateLedgerEvent(event, index, previous, previousTime);
    previous = event.contentHash;
    previousTime = event.occurredAt;
  });
  return events;
}

async function appendLedgerEvent(resultsRoot, clock, details) {
  const ledgerDirectory = path.join(resultsRoot, "ledger");
  await mkdir(ledgerDirectory, { recursive: true });
  const release = await acquireDirectoryLock(path.join(ledgerDirectory, ".append.lock"));
  try {
    const ledgerPath = path.join(ledgerDirectory, "events.ndjson");
    const events = await readAndVerifyLedger(ledgerPath);
    const sequence = events.length + 1;
    const record = withContentHash({
      schemaVersion: SLICE05_RUNNER_VERSIONS.event,
      eventId: `event.${sequence}.${details.idempotencyKeyHash.slice(0, 16)}`,
      sequence,
      previousEventHash: events.at(-1)?.contentHash ?? ZERO_HASH,
      eventType: details.eventType,
      requestRef: structuredClone(details.requestRef),
      idempotencyKeyHash: details.idempotencyKeyHash,
      mode: details.mode,
      operation: details.operation,
      attempt: structuredClone(details.attempt),
      status: eventStatus(details.status),
      reasonCode: details.reasonCode ?? null,
      publication: details.publication ? structuredClone(details.publication) : null,
      occurredAt: clock(),
    });
    assertUtc(record.occurredAt, "S05_LEDGER_DATE_INVALID", "event.occurredAt");
    if (details.notBefore && Date.parse(record.occurredAt) < Date.parse(details.notBefore)) {
      reject("S05_LEDGER_DATE_INVALID", "event time precedes its request/claim/start/finish boundary");
    }
    validateLedgerEvent(record, sequence - 1, events.at(-1)?.contentHash ?? ZERO_HASH, events.at(-1)?.occurredAt ?? null);
    const handle = await open(ledgerPath, "a");
    try {
      await handle.writeFile(`${stableCompactSlice05Runner(record)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    return frozenClone(record);
  } finally {
    await release();
  }
}

function resultArtifactRef(execution, request) {
  if (!execution?.artifact) return null;
  const recordBytes = Buffer.from(stableStringifySlice05Runner(execution.artifact), "utf8");
  return {
    schemaVersion: execution.artifact.schemaVersion,
    id: execution.artifact.artifactId,
    contentHash: execution.artifact.contentHash,
    recordRelativePath: artifactRecordRelativePathSlice05(request),
    recordByteLength: recordBytes.byteLength,
    recordFileSha256: sha256Slice05(recordBytes),
    relativePath: execution.artifact.bytes.relativePath,
    byteLength: execution.artifact.bytes.byteLength,
    fileSha256: execution.artifact.bytes.fileSha256,
    decodedPixelSha256: execution.artifact.bytes.decodedPixelSha256,
  };
}

function resultOracleRef(execution) {
  if (!execution?.oracleResult) return null;
  return {
    id: execution.oracleResult.oracleResultId,
    contentHash: execution.oracleResult.contentHash,
    relativePath: execution.oracleResultRelativePath,
  };
}

function validatedWorkerObservation(execution) {
  if (!isPlainObject(execution) || !isPlainObject(execution.runtime)
    || !Number.isInteger(execution.durationMs) || execution.durationMs < 0
    || execution.durationMs > SLICE05_SHARP_POLICY.workerTimeoutMs || !isPlainObject(execution.resourceUsage)) return false;
  try {
    validateWorkerRuntimeSlice05(execution.runtime, execution.runtime);
    validateResourceUsage(execution.resourceUsage, "S05_EXECUTION_RESULT_INVALID", "execution.resourceUsage");
    return execution.resourceUsage.maxRssKiB <= SLICE05_SHARP_POLICY.observedMaxRssKiB;
  } catch {
    return false;
  }
}

function successfulExecutionEvidence(request, execution) {
  if (!isPlainObject(execution) || execution.status !== "succeeded" || !isPlainObject(execution.artifact)
    || !isPlainObject(execution.oracleResult) || execution.oracleResult.overallStatus !== "pass"
    || typeof execution.oracleResultRelativePath !== "string" || !validatedWorkerObservation(execution)) return false;
  try {
    const artifactRef = resultArtifactRef(execution, request);
    const oracleRef = resultOracleRef(execution);
    validateArtifactRef(artifactRef, "S05_EXECUTION_RESULT_INVALID", "execution.artifactRef");
    validateOracleResultRef(oracleRef, "S05_EXECUTION_RESULT_INVALID", "execution.oracleResultRef");
    return true;
  } catch (error) {
    if (error instanceof Slice05RunnerError) return false;
    throw error;
  }
}

function classifyExecution(request, execution, error) {
  if (!error) {
    if (request.expectedDisposition === "preflight-reject") {
      return { status: "nonpass", reasonCode: "S05_FALSE_ALLOW", artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
    }
    if (!successfulExecutionEvidence(request, execution)) {
      if (execution?.status === "succeeded" && isPlainObject(execution.artifact) && isPlainObject(execution.oracleResult)
        && execution.oracleResult.overallStatus === "non-pass" && typeof execution.oracleResultRelativePath === "string"
        && validatedWorkerObservation(execution)) {
        return { status: "nonpass", reasonCode: "S05_ORACLE_NONPASS", artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
      }
      return { status: "nonpass", reasonCode: "S05_EXECUTION_RESULT_INVALID", artifactRef: null, oracleResultRef: null, workerExitConfirmed: null };
    }
    return {
      status: "pass",
      reasonCode: null,
      artifactRef: resultArtifactRef(execution, request),
      oracleResultRef: resultOracleRef(execution),
      workerExitConfirmed: true,
    };
  }

  const code = error?.code ?? "S05_EXECUTION_FAILURE";
  if (request.expectedDisposition === "preflight-reject" && code === request.expectedStableErrorCode) {
    return { status: "pass", reasonCode: code, artifactRef: null, oracleResultRef: null, workerExitConfirmed: null };
  }
  if (error instanceof Slice05NoResultError) {
    return { status: "invalid-no-result", reasonCode: error.reason, artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
  }
  if (code === "S05_WORKER_EXITED_WITHOUT_RESULT") {
    return { status: "invalid-no-result", reasonCode: "runner-crash-before-result", artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
  }
  if (code === "S05_WORKER_TIMEOUT") {
    return { status: "timeout", reasonCode: code, artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
  }
  if (code === "S05_WORKER_CANCELLED") {
    return { status: "cancelled", reasonCode: code, artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
  }
  if (code === "S05_WORKER_RECONCILIATION_UNKNOWN" || code === "S05_FAULT_RECONCILIATION_UNKNOWN") {
    return { status: "unknown-reconciliation", reasonCode: code, artifactRef: null, oracleResultRef: null, workerExitConfirmed: false };
  }
  return { status: "nonpass", reasonCode: code, artifactRef: null, oracleResultRef: null, workerExitConfirmed: null };
}

function terminalResult(request, keyHash, startedAt, finishedAt, classification, execution) {
  const retainWorkerEvidence = validatedWorkerObservation(execution);
  const workerRuntime = retainWorkerEvidence && execution?.runtime
    ? {
        payload: structuredClone(execution.runtime),
        payloadSha256: sha256Slice05(Buffer.from(stableStringifySlice05Runner(execution.runtime), "utf8")),
      }
    : null;
  return withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.result,
    resultId: `result.${keyHash}`,
    requestRef: requestRef(request),
    idempotencyKeyHash: keyHash,
    mode: request.mode,
    operation: request.operation,
    attempt: structuredClone(request.attempt),
    expectedDisposition: request.expectedDisposition,
    expectedStableErrorCode: request.expectedStableErrorCode,
    status: classification.status,
    reasonCode: classification.reasonCode,
    artifactRef: classification.artifactRef,
    oracleResultRef: classification.oracleResultRef,
    runtimeAttestationRef: structuredClone(request.runtimeAttestationRef),
    workerRuntime,
    workerObservation: retainWorkerEvidence ? "worker-self-reported-observation-not-hard-isolation" : null,
    durationMs: retainWorkerEvidence && Number.isInteger(execution?.durationMs) ? execution.durationMs : null,
    resourceUsage: retainWorkerEvidence && execution?.resourceUsage ? structuredClone(execution.resourceUsage) : null,
    workerExitConfirmed: classification.workerExitConfirmed,
    startedAt,
    finishedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
}

async function fileIdentity(filename, code) {
  const bytes = await readFile(filename);
  if (bytes.byteLength < 1) reject(code, `empty publication file: ${filename}`);
  return { bytes, byteLength: bytes.byteLength, fileSha256: sha256Slice05(bytes) };
}

function relativeFromRoot(root, absolute, code) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  assertRelativePath(relative, code, "publication relative path");
  if (relative.startsWith("../")) reject(code, "publication path escapes results root");
  return relative;
}

async function preparePublication(root, keyHash, result, execution) {
  const code = "S05_PUBLICATION_INVALID";
  const publication = execution?.publication;
  assertExactObject(publication, ["stagingDirectory", "artifactStagedPath", "artifactRecordStagedPath", "oracleStagedPath"], code, "execution.publication");
  const expectedDirectory = `.staging/${keyHash}`;
  if (publication.stagingDirectory !== expectedDirectory
    || !publication.artifactStagedPath.startsWith(`${expectedDirectory}/`)
    || !publication.artifactRecordStagedPath.startsWith(`${expectedDirectory}/`)
    || !publication.oracleStagedPath.startsWith(`${expectedDirectory}/`)) reject(code, "publication staging directory is not attempt-scoped");
  [publication.stagingDirectory, publication.artifactStagedPath, publication.artifactRecordStagedPath, publication.oracleStagedPath]
    .forEach((value) => assertRelativePath(value, code, value));
  const stagedArtifact = path.resolve(root, publication.artifactStagedPath);
  const stagedArtifactRecord = path.resolve(root, publication.artifactRecordStagedPath);
  const stagedOracle = path.resolve(root, publication.oracleStagedPath);
  const stageRoot = path.resolve(root, publication.stagingDirectory);
  if (!stagedArtifact.startsWith(`${stageRoot}${path.sep}`) || !stagedArtifactRecord.startsWith(`${stageRoot}${path.sep}`)
    || !stagedOracle.startsWith(`${stageRoot}${path.sep}`)) reject(code, "staged publication escapes attempt directory");
  const artifactIdentity = await fileIdentity(stagedArtifact, code);
  const artifactRecordIdentity = await fileIdentity(stagedArtifactRecord, code);
  const oracleIdentity = await fileIdentity(stagedOracle, code);
  if (artifactIdentity.byteLength !== result.artifactRef.byteLength
    || artifactIdentity.fileSha256 !== result.artifactRef.fileSha256) reject(code, "staged artifact differs from terminal result identity");
  let artifactRecord;
  let oracleRecord;
  try {
    artifactRecord = JSON.parse(artifactRecordIdentity.bytes.toString("utf8"));
    oracleRecord = JSON.parse(oracleIdentity.bytes.toString("utf8"));
  } catch (cause) {
    reject(code, "staged artifact/oracle record is invalid JSON", { cause });
  }
  const validateArtifactRecord = result.operation === "normalize"
    ? validateCandidateNormalizedArtifactSlice05 : validateCandidateDeliveryArtifactSlice05;
  try {
    validateArtifactRecord(artifactRecord);
  } catch (cause) {
    reject(code, "staged artifact record is outside the candidate artifact contract", { cause });
  }
  if (artifactRecord.schemaVersion !== result.artifactRef.schemaVersion
    || artifactRecord.artifactId !== result.artifactRef.id || artifactRecord.contentHash !== result.artifactRef.contentHash
    || artifactRecord.bytes.relativePath !== result.artifactRef.relativePath
    || artifactRecord.bytes.byteLength !== result.artifactRef.byteLength
    || artifactRecord.bytes.fileSha256 !== result.artifactRef.fileSha256
    || artifactRecord.bytes.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256
    || artifactRecordIdentity.byteLength !== result.artifactRef.recordByteLength
    || artifactRecordIdentity.fileSha256 !== result.artifactRef.recordFileSha256) {
    reject(code, "staged artifact record differs from the terminal artifact reference");
  }
  if (oracleRecord.oracleResultId !== result.oracleResultRef.id || oracleRecord.contentHash !== result.oracleResultRef.contentHash
    || oracleRecord.contentHash !== contentHashSlice05Runner(oracleRecord)) reject(code, "staged oracle differs from terminal result identity");
  const stagedResultRelative = `${expectedDirectory}/result.json`;
  const stagedResult = path.resolve(root, stagedResultRelative);
  const resultBytes = Buffer.from(stableStringifySlice05Runner(result), "utf8");
  await atomicWrite(stagedResult, resultBytes);
  const files = [
    {
      role: "artifact-bytes",
      stagedPath: publication.artifactStagedPath,
      canonicalPath: result.artifactRef.relativePath,
      byteLength: artifactIdentity.byteLength,
      fileSha256: artifactIdentity.fileSha256,
    },
    {
      role: "artifact-record",
      stagedPath: publication.artifactRecordStagedPath,
      canonicalPath: result.artifactRef.recordRelativePath,
      byteLength: artifactRecordIdentity.byteLength,
      fileSha256: artifactRecordIdentity.fileSha256,
    },
    {
      role: "oracle",
      stagedPath: publication.oracleStagedPath,
      canonicalPath: result.oracleResultRef.relativePath,
      byteLength: oracleIdentity.byteLength,
      fileSha256: oracleIdentity.fileSha256,
    },
    {
      role: "result",
      stagedPath: stagedResultRelative,
      canonicalPath: relativeFromRoot(root, resultPath(root, keyHash), code),
      byteLength: resultBytes.byteLength,
      fileSha256: sha256Slice05(resultBytes),
    },
  ];
  const canonicalPaths = new Set(files.map(({ canonicalPath }) => canonicalPath));
  if (canonicalPaths.size !== 4 || files.some(({ canonicalPath }) => canonicalPath.startsWith(".staging/"))) {
    reject(code, "publication canonical paths overlap or remain staged");
  }
  const intent = {
    transactionId: `publication.${keyHash}`,
    stagingDirectory: expectedDirectory,
    files,
  };
  validatePublication(intent, code, "publication");
  return intent;
}

async function publishIntent(root, publication, publishHook = undefined) {
  validatePublication(publication, "S05_PUBLICATION_INVALID", "publication");
  for (const file of publication.files) {
    const staged = path.resolve(root, file.stagedPath);
    const canonical = path.resolve(root, file.canonicalPath);
    if (!staged.startsWith(`${root}${path.sep}`) || !canonical.startsWith(`${root}${path.sep}`)) {
      reject("S05_PUBLICATION_PATH_INVALID", "publication path escapes resultsRoot");
    }
    if (await pathExists(canonical)) {
      const identity = await fileIdentity(canonical, "S05_PUBLICATION_RECONCILIATION_UNKNOWN");
      if (identity.byteLength !== file.byteLength || identity.fileSha256 !== file.fileSha256) {
        reject("S05_PUBLICATION_RECONCILIATION_UNKNOWN", `canonical publication target has conflicting bytes: ${file.canonicalPath}`);
      }
    } else {
      const identity = await fileIdentity(staged, "S05_PUBLICATION_RECONCILIATION_UNKNOWN");
      if (identity.byteLength !== file.byteLength || identity.fileSha256 !== file.fileSha256) {
        reject("S05_PUBLICATION_RECONCILIATION_UNKNOWN", `staged publication bytes drifted: ${file.stagedPath}`);
      }
      await mkdir(path.dirname(canonical), { recursive: true });
      await rename(staged, canonical);
    }
    await publishHook?.({ role: file.role, publication: frozenClone(publication) });
  }
  const staging = path.resolve(root, publication.stagingDirectory);
  const stagedDirectories = [...new Set(publication.files.map(({ stagedPath }) => path.dirname(path.resolve(root, stagedPath))))]
    .filter((directory) => directory !== staging)
    .sort((left, right) => right.length - left.length);
  for (const directory of stagedDirectories) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
    }
  }
  try {
    await rmdir(staging);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
  }
}

async function reconcilePendingPublications(root, clock, publishHook = undefined) {
  const events = await readAndVerifyLedger(path.join(root, "ledger", "events.ndjson"));
  const completed = new Set(events.filter(({ eventType }) => eventType === "publication-complete").map(({ publication }) => publication.transactionId));
  const unknown = new Set(events.filter(({ eventType }) => eventType === "publication-reconciliation-unknown").map(({ publication }) => publication.transactionId));
  const pending = events.filter((event) => event.eventType === "publication-intent"
    && !completed.has(event.publication.transactionId) && !unknown.has(event.publication.transactionId));
  let reconciled = 0;
  for (const intentEvent of pending) {
    try {
      await publishIntent(root, intentEvent.publication, publishHook);
      await appendLedgerEvent(root, clock, {
        eventType: "publication-complete", requestRef: intentEvent.requestRef,
        idempotencyKeyHash: intentEvent.idempotencyKeyHash, mode: intentEvent.mode,
        operation: intentEvent.operation, attempt: intentEvent.attempt, status: "pass", reasonCode: null,
        publication: intentEvent.publication, notBefore: intentEvent.occurredAt,
      });
      const resultFile = intentEvent.publication.files.find(({ role }) => role === "result");
      const recoveredResult = validateSlice05RunResult(await readJson(path.resolve(root, resultFile.canonicalPath), "S05_RUN_RESULT_CORRUPT"));
      await appendLedgerEvent(root, clock, {
        eventType: "attempt-terminal", requestRef: recoveredResult.requestRef,
        idempotencyKeyHash: recoveredResult.idempotencyKeyHash, mode: recoveredResult.mode,
        operation: recoveredResult.operation, attempt: recoveredResult.attempt, status: recoveredResult.status,
        reasonCode: recoveredResult.reasonCode, publication: null, notBefore: recoveredResult.finishedAt,
      });
      reconciled += 1;
    } catch (cause) {
      await appendLedgerEvent(root, clock, {
        eventType: "publication-reconciliation-unknown", requestRef: intentEvent.requestRef,
        idempotencyKeyHash: intentEvent.idempotencyKeyHash, mode: intentEvent.mode,
        operation: intentEvent.operation, attempt: intentEvent.attempt, status: "unknown-reconciliation",
        reasonCode: "S05_PUBLICATION_RECONCILIATION_UNKNOWN", publication: intentEvent.publication,
        notBefore: intentEvent.occurredAt,
      });
      reject("S05_PUBLICATION_RECONCILIATION_UNKNOWN", "pending publication could not be safely reconciled", { cause });
    }
  }
  const refreshed = await readAndVerifyLedger(path.join(root, "ledger", "events.ndjson"));
  const terminalKeys = new Set(refreshed.filter(({ eventType }) => eventType === "attempt-terminal").map(({ idempotencyKeyHash }) => idempotencyKeyHash));
  const completedEvents = refreshed.filter(({ eventType }) => eventType === "publication-complete");
  for (const complete of completedEvents) {
    if (terminalKeys.has(complete.idempotencyKeyHash)) continue;
    const resultFile = complete.publication.files.find(({ role }) => role === "result");
    const recoveredResult = validateSlice05RunResult(await readJson(path.resolve(root, resultFile.canonicalPath), "S05_RUN_RESULT_CORRUPT"));
    await appendLedgerEvent(root, clock, {
      eventType: "attempt-terminal", requestRef: recoveredResult.requestRef,
      idempotencyKeyHash: recoveredResult.idempotencyKeyHash, mode: recoveredResult.mode,
      operation: recoveredResult.operation, attempt: recoveredResult.attempt, status: recoveredResult.status,
      reasonCode: recoveredResult.reasonCode, publication: null, notBefore: recoveredResult.finishedAt,
    });
    terminalKeys.add(complete.idempotencyKeyHash);
  }
  return reconciled;
}

function createRunnerSlice05({ resultsRoot, clock, mode, testOnly, publishHook }) {
  const root = normalizeResultsRoot(resultsRoot, { testOnly, mode });
  if (typeof clock !== "function") reject("S05_RUNNER_CONFIGURATION_INVALID", "clock must be injectable");
  if (!new Set(["smoke", "calibration"]).has(mode)) reject("S05_RUNNER_CONFIGURATION_INVALID", "runner mode invalid");

  return Object.freeze({
    resultsRoot: root,
    mode,

    async query(idempotencyKey) {
      await assertNoSymlinkOrJunctionInPath(root, { testOnly });
      assertId(idempotencyKey, "S05_QUERY_INVALID", "idempotencyKey");
      const keyHash = idempotencyHash(idempotencyKey);
      const filename = resultPath(root, keyHash);
      if (!(await pathExists(filename))) return null;
      return frozenClone(validateSlice05RunResult(await readJson(filename, "S05_RUN_RESULT_CORRUPT")));
    },

    async runAttempt(request, { execute, signal } = {}) {
      validateSlice05RunRequest(request);
      if (request.mode !== mode) reject("S05_RUN_MODE_MISMATCH", "request mode does not match this runner instance");
      if (typeof execute !== "function") reject("S05_EXECUTOR_INVALID", "runAttempt requires an injected executor");
      await assertNoSymlinkOrJunctionInPath(root, { testOnly });
      await mkdir(path.join(root, "claims"), { recursive: true });
      await mkdir(path.join(root, "requests"), { recursive: true });
      await mkdir(path.join(root, "records"), { recursive: true });
      const keyHash = idempotencyHash(request.attempt.idempotencyKey);
      request = await resolveStoredRequest(root, request, keyHash);
      const existingResult = resultPath(root, keyHash);
      if (await pathExists(existingResult)) {
        const result = validateSlice05RunResult(await readJson(existingResult, "S05_RUN_RESULT_CORRUPT"));
        if (result.requestRef.contentHash !== request.contentHash) {
          reject("S05_IDEMPOTENCY_CONFLICT", "terminal idempotency key is bound to a different request");
        }
        await appendLedgerEvent(root, clock, {
          eventType: "existing-terminal-returned",
          requestRef: requestRef(request),
          idempotencyKeyHash: keyHash,
          mode: request.mode,
          operation: request.operation,
          attempt: request.attempt,
          status: "existing",
          reasonCode: null,
          notBefore: request.createdAt,
        });
        return frozenClone(result);
      }

      const sourceLockRoot = path.join(root, "source-locks");
      await mkdir(sourceLockRoot, { recursive: true });
      const releaseSource = await acquireDirectoryLock(path.join(sourceLockRoot, `${idempotencyHash(request.attempt.sourceId)}.lock`));
      try {
        request = await resolveStoredRequest(root, request, keyHash);
        const claims = await readClaims(root);
        const results = await readResults(root);
        const priorRequests = await readRequests(root);
        const existingClaim = claims.find((claim) => claim.idempotencyKeyHash === keyHash);
        if (existingClaim) {
          if (existingClaim.requestRef.contentHash !== request.contentHash) {
            await appendLedgerEvent(root, clock, {
              eventType: "conflict-rejected",
              requestRef: requestRef(request),
              idempotencyKeyHash: keyHash,
              mode: request.mode,
              operation: request.operation,
              attempt: request.attempt,
              status: null,
              reasonCode: "S05_IDEMPOTENCY_CONFLICT",
              notBefore: request.createdAt,
            });
            reject("S05_IDEMPOTENCY_CONFLICT", "idempotency claim is bound to a different request");
          }
          reject("S05_IDEMPOTENCY_CLAIM_ACTIVE", "matching claim has no terminal result and requires reconciliation");
        }
        validateReplacementAndSlot(request, claims, results, priorRequests);
        if (!(await pathExists(requestPath(root, keyHash)))) {
          await atomicWriteJson(requestPath(root, keyHash), request);
        }
        const claimedAt = clock();
        assertUtc(claimedAt, "S05_RUNNER_CLOCK_INVALID", "claimedAt");
        if (Date.parse(claimedAt) < Date.parse(request.createdAt)) reject("S05_RUNNER_CLOCK_INVALID", "claim precedes request creation");
        const claim = withContentHash({
          schemaVersion: SLICE05_RUNNER_VERSIONS.claim,
          claimId: `claim.${keyHash}`,
          requestRef: requestRef(request),
          idempotencyKeyHash: keyHash,
          mode: request.mode,
          operation: request.operation,
          attempt: structuredClone(request.attempt),
          claimedAt,
        });
        const handle = await open(claimPath(root, keyHash), "wx");
        try {
          await handle.writeFile(stableStringifySlice05Runner(claim), "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
      } catch (cause) {
        if (cause?.code === "EEXIST") reject("S05_IDEMPOTENCY_CLAIM_ACTIVE", "claim appeared concurrently and requires query/reconciliation");
        throw cause;
      } finally {
        await releaseSource();
      }

      const startedAt = clock();
      assertUtc(startedAt, "S05_RUNNER_CLOCK_INVALID", "startedAt");
      if (Date.parse(startedAt) < Date.parse(request.createdAt)) reject("S05_RUNNER_CLOCK_INVALID", "attempt start precedes request creation");
      await appendLedgerEvent(root, clock, {
        eventType: "attempt-started",
        requestRef: requestRef(request),
        idempotencyKeyHash: keyHash,
        mode: request.mode,
        operation: request.operation,
        attempt: request.attempt,
        status: "started",
        reasonCode: null,
        notBefore: startedAt,
      });
      let execution;
      let executionError;
      try {
        execution = await execute({ request: frozenClone(request), signal });
      } catch (error) {
        executionError = error;
      }
      let classification = classifyExecution(request, execution, executionError);
      if (!testOnly && classification.status === "pass" && request.expectedDisposition === "applicable"
        && !isPlainObject(execution?.publication)) {
        classification = {
          status: "nonpass", reasonCode: "S05_PUBLICATION_REQUIRED", artifactRef: null,
          oracleResultRef: null, workerExitConfirmed: null,
        };
      }
      if (!(classification.status === "pass" && request.expectedDisposition === "applicable")
        && isPlainObject(execution?.publication)) {
        try {
          await cleanupAttemptStagingOrUnknown(root, keyHash);
        } catch {
          classification = {
            status: "unknown-reconciliation", reasonCode: "S05_WORKER_RECONCILIATION_UNKNOWN",
            artifactRef: null, oracleResultRef: null, workerExitConfirmed: false,
          };
          execution = undefined;
        }
      }
      const finishedAt = clock();
      assertUtc(finishedAt, "S05_RUNNER_CLOCK_INVALID", "finishedAt");
      if (Date.parse(finishedAt) < Date.parse(startedAt)) reject("S05_RUNNER_CLOCK_INVALID", "attempt finish precedes start");
      const result = terminalResult(request, keyHash, startedAt, finishedAt, classification, execution);
      validateSlice05RunResult(result);
      if (result.status === "pass" && request.expectedDisposition === "applicable" && isPlainObject(execution?.publication)) {
        const publication = await preparePublication(root, keyHash, result, execution);
        await appendLedgerEvent(root, clock, {
          eventType: "publication-intent", requestRef: requestRef(request), idempotencyKeyHash: keyHash,
          mode: request.mode, operation: request.operation, attempt: request.attempt, status: "started",
          reasonCode: null, publication, notBefore: finishedAt,
        });
        await publishIntent(root, publication, publishHook);
        await appendLedgerEvent(root, clock, {
          eventType: "publication-complete", requestRef: requestRef(request), idempotencyKeyHash: keyHash,
          mode: request.mode, operation: request.operation, attempt: request.attempt, status: "pass",
          reasonCode: null, publication, notBefore: finishedAt,
        });
      } else {
        await atomicWriteJson(resultPath(root, keyHash), result);
      }
      await appendLedgerEvent(root, clock, {
        eventType: "attempt-terminal",
        requestRef: requestRef(request),
        idempotencyKeyHash: keyHash,
        mode: request.mode,
        operation: request.operation,
        attempt: request.attempt,
        status: result.status,
        reasonCode: result.reasonCode,
        notBefore: finishedAt,
      });
      return frozenClone(result);
    },

    async reconcileAttempt(request, { reasonCode = "S05_WORKER_RECONCILIATION_UNKNOWN", workerExitConfirmed = false } = {}) {
      validateSlice05RunRequest(request);
      if (request.mode !== mode) reject("S05_RUN_MODE_MISMATCH", "request mode does not match this runner instance");
      await assertNoSymlinkOrJunctionInPath(root, { testOnly });
      const keyHash = idempotencyHash(request.attempt.idempotencyKey);
      const existing = resultPath(root, keyHash);
      if (await pathExists(existing)) {
        const result = validateSlice05RunResult(await readJson(existing, "S05_RUN_RESULT_CORRUPT"));
        if (result.requestRef.contentHash !== request.contentHash) reject("S05_IDEMPOTENCY_CONFLICT", "terminal key is bound to another request");
        return frozenClone(result);
      }
      const claim = await readJson(claimPath(root, keyHash), "S05_RUN_CLAIM_RECONCILIATION_REQUIRED");
      validateClaim(claim);
      if (claim.requestRef.contentHash !== request.contentHash) reject("S05_IDEMPOTENCY_CONFLICT", "claim is bound to another request");
      let classification;
      if (workerExitConfirmed === true && ALLOWED_NO_RESULT_REASONS.includes(reasonCode)) {
        classification = { status: "invalid-no-result", reasonCode, artifactRef: null, oracleResultRef: null, workerExitConfirmed: true };
      } else {
        classification = {
          status: "unknown-reconciliation",
          reasonCode: "S05_WORKER_RECONCILIATION_UNKNOWN",
          artifactRef: null,
          oracleResultRef: null,
          workerExitConfirmed: false,
        };
      }
      const finishedAt = clock();
      assertUtc(finishedAt, "S05_RUNNER_CLOCK_INVALID", "reconciledAt");
      if (Date.parse(finishedAt) < Date.parse(claim.claimedAt)) reject("S05_RUNNER_CLOCK_INVALID", "reconciliation precedes claim");
      const result = terminalResult(request, keyHash, claim.claimedAt, finishedAt, classification, undefined);
      validateSlice05RunResult(result);
      await atomicWriteJson(resultPath(root, keyHash), result);
      if (!(await pathExists(requestPath(root, keyHash)))) await atomicWriteJson(requestPath(root, keyHash), request);
      await appendLedgerEvent(root, clock, {
        eventType: "claim-reconciled", requestRef: requestRef(request), idempotencyKeyHash: keyHash,
        mode: request.mode, operation: request.operation, attempt: request.attempt, status: result.status,
        reasonCode: result.reasonCode, notBefore: finishedAt,
      });
      return frozenClone(result);
    },

    async readLedger() {
      await assertNoSymlinkOrJunctionInPath(root, { testOnly });
      return frozenClone(await readAndVerifyLedger(path.join(root, "ledger", "events.ndjson")));
    },

    async reconcilePublications() {
      await assertNoSymlinkOrJunctionInPath(root, { testOnly });
      return reconcilePendingPublications(root, clock, publishHook);
    },
  });
}

export function createSlice05OpenRunner({ resultsRoot = DEFAULT_RESULTS_ROOT, clock = () => new Date().toISOString(), mode = "smoke" } = {}) {
  return createRunnerSlice05({ resultsRoot, clock, mode, testOnly: false, publishHook: undefined });
}

/** Explicitly isolated filesystem API for pure fake-executor tests; never used by the actual CLI. */
export function createSlice05TestRunner({ resultsRoot, clock = () => new Date().toISOString(), mode = "smoke", publishHook } = {}) {
  if (typeof resultsRoot !== "string") reject("S05_TEST_RESULTS_ROOT_REQUIRED", "test runner requires an explicit temporary root");
  return createRunnerSlice05({ resultsRoot, clock, mode, testOnly: true, publishHook });
}

function resultRecordRef(result) {
  const bytes = Buffer.from(stableStringifySlice05Runner(result), "utf8");
  return {
    path: `records/${result.idempotencyKeyHash}.result.json`,
    id: result.resultId,
    contentHash: result.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: sha256Slice05(bytes),
  };
}

function recordRefMatches(ref, record, idField, code, label) {
  assertRecordRef(ref, code, label);
  const bytes = Buffer.from(stableStringifySlice05Runner(record), "utf8");
  if (ref.id !== record[idField] || ref.contentHash !== record.contentHash
    || ref.byteLength !== bytes.byteLength || ref.fileSha256 !== sha256Slice05(bytes)) {
    reject(code, `${label} does not match its canonical record bytes`);
  }
}

export function validateSlice05FaultResult(record) {
  const code = "S05_FAULT_RESULT_INVALID";
  assertExactObject(record, SLICE05_FAULT_RESULT_KEYS, code, "faultResult");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.faultResult) reject(code, "fault schemaVersion invalid");
  assertId(record.faultResultId, code, "faultResultId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRuntimeAttestationRef(record.runtimeAttestationRef, code, "runtimeAttestationRef");
  if (!Array.isArray(record.scenarios) || record.scenarios.length !== 6) reject(code, "fault result requires the six frozen scenarios");
  const modes = new Set();
  for (const [index, scenario] of record.scenarios.entries()) {
    assertExactObject(scenario, ["scenarioId", "mode", "expectedStatus", "actualStatus", "exitConfirmed", "pass"], code, `scenarios[${index}]`);
    assertId(scenario.scenarioId, code, `scenarios[${index}].scenarioId`);
    if (!new Set(["timeout-hang", "cancel-hang", "exit-before-result", "malformed-result", "reported-reconciliation-unknown", "atomic-commit-conflict"]).has(scenario.mode)
      || modes.has(scenario.mode)) reject(code, "fault modes must be the six unique registered cases");
    modes.add(scenario.mode);
    assertId(scenario.expectedStatus, code, `scenarios[${index}].expectedStatus`);
    assertId(scenario.actualStatus, code, `scenarios[${index}].actualStatus`);
    if (scenario.exitConfirmed !== null && typeof scenario.exitConfirmed !== "boolean") reject(code, "fault exit confirmation invalid");
    const recomputedPass = scenario.expectedStatus === scenario.actualStatus
      && (new Set(["timeout-hang", "cancel-hang", "exit-before-result"]).has(scenario.mode) ? scenario.exitConfirmed === true : true);
    if (scenario.pass !== recomputedPass) reject(code, "fault scenario pass is not derived from its evidence");
  }
  if (record.allPass !== record.scenarios.every(({ pass }) => pass)) reject(code, "fault allPass is not conjunctive");
  assertUtc(record.observedAt, code, "observedAt");
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "fault evidence boundary invalid");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "fault content hash invalid");
  return record;
}

export function validateSlice05SessionAudit(record) {
  const code = "S05_SESSION_AUDIT_INVALID";
  assertExactObject(record, SLICE05_SESSION_AUDIT_KEYS, code, "sessionAudit");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.sessionAudit || !new Set(["normalize", "export"]).has(record.operation)) {
    reject(code, "session audit profile invalid");
  }
  assertId(record.auditId, code, "auditId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRecordRef(record.gateBPlanRef, code, "gateBPlanRef");
  assertRecordRef(record.manifestRef, code, "manifestRef");
  assertRuntimeAttestationRef(record.runtimeAttestationRef, code, "runtimeAttestationRef");
  for (const key of ["definitionIntegrity", "runtimeIntegrityAtStart", "runtimeIntegrityAtEnd", "runtimeStableStartToEnd",
    "implementationIntegrity", "sourceIsolation", "oracleIndependence", "atomicCommitIntegrity"]) {
    if (typeof record[key] !== "boolean") reject(code, `${key} must be boolean`);
  }
  if (!Array.isArray(record.issues)) reject(code, "issues must be an array");
  record.issues.forEach((issue, index) => {
    assertExactObject(issue, ["code", "location", "message"], code, `issues[${index}]`);
    assertId(issue.code, code, `issues[${index}].code`);
    if (typeof issue.location !== "string" || issue.location.length < 1 || typeof issue.message !== "string" || issue.message.length < 1) {
      reject(code, "audit issue text invalid");
    }
  });
  const booleanPass = ["definitionIntegrity", "runtimeIntegrityAtStart", "runtimeIntegrityAtEnd", "runtimeStableStartToEnd",
    "implementationIntegrity", "sourceIsolation", "oracleIndependence", "atomicCommitIntegrity"].every((key) => record[key]);
  if ((record.issues.length === 0) !== booleanPass) reject(code, "session issues must exactly reflect failed audit conjuncts");
  assertUtc(record.auditedAt, code, "auditedAt");
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "audit evidence boundary invalid");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "session audit content hash invalid");
  return record;
}

export function buildSlice05FaultResult({ definitionRef, runtimeAttestationRef, scenarioResults, observedAt }) {
  assertRecordRef(definitionRef, "S05_FAULT_RESULT_INVALID", "definitionRef");
  assertRuntimeAttestationRef(runtimeAttestationRef, "S05_FAULT_RESULT_INVALID", "runtimeAttestationRef");
  if (!Array.isArray(scenarioResults)) reject("S05_FAULT_RESULT_INVALID", "scenarioResults must be an array");
  const expectedByMode = new Map([
    ["timeout-hang", "timeout"],
    ["cancel-hang", "cancelled"],
    ["exit-before-result", "runner-crash-before-result"],
    ["malformed-result", "malformed-result-rejected"],
    ["reported-reconciliation-unknown", "unknown-reconciliation"],
    ["atomic-commit-conflict", "atomic-conflict-rejected"],
  ]);
  const scenarios = [...expectedByMode.entries()].map(([mode, expectedStatus]) => {
    const actual = scenarioResults.find((entry) => entry?.mode === mode);
    if (!actual || typeof actual.status !== "string") reject("S05_FAULT_RESULT_INVALID", `missing fault scenario: ${mode}`);
    const exitConfirmed = actual.exitConfirmed ?? null;
    const pass = actual.status === expectedStatus
      && (new Set(["timeout-hang", "cancel-hang", "exit-before-result"]).has(mode) ? exitConfirmed === true : true);
    return {
      scenarioId: `fault.${mode}`,
      mode,
      expectedStatus,
      actualStatus: actual.status,
      exitConfirmed,
      pass,
    };
  });
  const result = withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.faultResult,
    faultResultId: `fault-result.${definitionRef.contentHash.slice(0, 16)}`,
    definitionRef: structuredClone(definitionRef),
    runtimeAttestationRef: structuredClone(runtimeAttestationRef),
    scenarios,
    allPass: scenarios.every(({ pass }) => pass),
    observedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
  return frozenClone(validateSlice05FaultResult(result));
}

export function buildSlice05SessionAudit({
  operation,
  definitionRef,
  gateBPlanRef,
  manifestRef,
  runtimeAttestationRef,
  checks,
  issues,
  auditedAt,
}) {
  if (!isPlainObject(checks)) reject("S05_SESSION_AUDIT_INVALID", "checks must be a closed object");
  const checkKeys = ["definitionIntegrity", "runtimeIntegrityAtStart", "runtimeIntegrityAtEnd", "runtimeStableStartToEnd",
    "implementationIntegrity", "sourceIsolation", "oracleIndependence", "atomicCommitIntegrity"];
  assertExactObject(checks, checkKeys, "S05_SESSION_AUDIT_INVALID", "checks");
  const record = withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.sessionAudit,
    auditId: `smoke-audit.${operation}.${manifestRef.contentHash.slice(0, 16)}`,
    operation,
    definitionRef: structuredClone(definitionRef),
    gateBPlanRef: structuredClone(gateBPlanRef),
    manifestRef: structuredClone(manifestRef),
    runtimeAttestationRef: structuredClone(runtimeAttestationRef),
    ...structuredClone(checks),
    issues: structuredClone(issues),
    auditedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
  return frozenClone(validateSlice05SessionAudit(record));
}

function effectiveResultFor(results, sourceId, repetition) {
  const matching = results.filter((result) => result.attempt.sourceId === sourceId
    && result.attempt.repetition === repetition);
  const initial = matching.filter((result) => result.attempt.attemptNumber === 1);
  const replacements = matching.filter((result) => result.attempt.attemptNumber === 2);
  if (initial.length > 1 || replacements.length > 1) return { result: null, invalidated: null, valid: false };
  if (replacements.length === 0) return { result: initial[0] ?? null, invalidated: null, valid: true };
  const replaced = initial[0];
  if (!replaced || replaced.status !== "invalid-no-result" || !ALLOWED_NO_RESULT_REASONS.includes(replaced.reasonCode)) {
    return { result: null, invalidated: null, valid: false };
  }
  return { result: replacements[0], invalidated: replaced, valid: true };
}

function isRegisteredPreflightRejectionReason(reasonCode) {
  return typeof reasonCode === "string" && /^(?:S05_INPUT_|S05_EXPORT_(?:ALPHA_|NORMALIZED_|PARENT_|REQUEST_|RGBA_)|S05_NORMALIZE_(?:REQUEST_|SOURCE_))/.test(reasonCode);
}

function classifiedOutcomeCounts(effectiveResults) {
  const falseAllowCount = effectiveResults.filter(({ status, reasonCode }) => status === "nonpass" && reasonCode === "S05_FALSE_ALLOW").length;
  const falseRejectCount = effectiveResults.filter(({ status, expectedDisposition, reasonCode }) => status === "nonpass"
    && expectedDisposition === "applicable" && isRegisteredPreflightRejectionReason(reasonCode)).length;
  const failureCount = effectiveResults.filter(({ status }) => status === "nonpass").length - falseAllowCount - falseRejectCount;
  const oracleNonpassCount = effectiveResults.filter(({ status, reasonCode }) => status === "nonpass" && reasonCode === "S05_ORACLE_NONPASS").length;
  return { falseAllowCount, falseRejectCount, failureCount, oracleNonpassCount };
}

function resultMatchesRegisteredProfile(result, registered, mode, operation, runtimeAttestationRef) {
  return result.mode === mode
    && result.operation === operation
    && result.attempt.sourceId === registered.sourceId
    && result.attempt.partition === registered.partition
    && result.expectedDisposition === registered.expectedDisposition
    && stableStringifySlice05Runner(result.runtimeAttestationRef) === stableStringifySlice05Runner(runtimeAttestationRef);
}

export function buildOperationSmokeSummarySlice05({
  operation,
  definitionRef,
  manifestRef,
  runtimeAttestationRef,
  sessionAudit,
  sessionAuditRef,
  faultSemantics,
  faultSemanticsRef,
  registeredCases,
  terminalResults,
  startedAt,
  finishedAt,
}) {
  if (!new Set(["normalize", "export"]).has(operation)) reject("S05_SMOKE_SUMMARY_INVALID", "summary operation invalid");
  assertRecordRef(definitionRef, "S05_SMOKE_SUMMARY_INVALID", "definitionRef");
  assertRecordRef(manifestRef, "S05_SMOKE_SUMMARY_INVALID", "manifestRef");
  assertRuntimeAttestationRef(runtimeAttestationRef, "S05_SMOKE_SUMMARY_INVALID", "runtimeAttestationRef");
  validateSlice05SessionAudit(sessionAudit);
  validateSlice05FaultResult(faultSemantics);
  recordRefMatches(sessionAuditRef, sessionAudit, "auditId", "S05_SMOKE_SUMMARY_INVALID", "sessionAuditRef");
  recordRefMatches(faultSemanticsRef, faultSemantics, "faultResultId", "S05_SMOKE_SUMMARY_INVALID", "faultSemanticsRef");
  if (sessionAudit.operation !== operation || sessionAudit.definitionRef.contentHash !== definitionRef.contentHash
    || sessionAudit.manifestRef.contentHash !== manifestRef.contentHash
    || faultSemantics.definitionRef.contentHash !== definitionRef.contentHash
    || sessionAudit.runtimeAttestationRef.inventoryPayloadSha256 !== runtimeAttestationRef.inventoryPayloadSha256
    || faultSemantics.runtimeAttestationRef.inventoryPayloadSha256 !== runtimeAttestationRef.inventoryPayloadSha256) {
    reject("S05_SMOKE_SUMMARY_INVALID", "audit/fault evidence is not bound to this exact operation definition and runtime");
  }
  if (!Array.isArray(registeredCases) || registeredCases.length < 1 || !Array.isArray(terminalResults)) {
    reject("S05_SMOKE_SUMMARY_INVALID", "registered cases/results must be arrays");
  }
  terminalResults.forEach(validateSlice05RunResult);
  const registeredIds = new Set(registeredCases.map(({ sourceId }) => sourceId));
  if (registeredIds.size !== registeredCases.length) reject("S05_SMOKE_SUMMARY_INVALID", "registered sourceIds must be globally unique");
  const operationResults = terminalResults.filter((result) => result.operation === operation && result.mode === "smoke");
  const sourceReplacementValid = new Map();
  for (const sourceId of registeredIds) {
    const replacements = operationResults.filter((result) => result.attempt.sourceId === sourceId
      && result.attempt.attemptNumber === 2);
    sourceReplacementValid.set(sourceId, replacements.length <= 1);
  }
  const caseResults = registeredCases.map((registered) => {
    assertExactObject(
      registered,
      ["sourceId", "partition", "expectedDisposition", "repetitions"],
      "S05_SMOKE_SUMMARY_INVALID",
      "registeredCase",
    );
    assertId(registered.sourceId, "S05_SMOKE_SUMMARY_INVALID", "registeredCase.sourceId");
    if (!new Set(["applicable", "preflight-reject"]).has(registered.expectedDisposition)
      || registered.partition !== "smoke" || registered.repetitions !== 3) reject("S05_SMOKE_SUMMARY_INVALID", "registered case profile invalid");
    const selections = [1, 2, 3].map((repetition) => effectiveResultFor(operationResults, registered.sourceId, repetition));
    const replacementsValid = sourceReplacementValid.get(registered.sourceId) && selections.every(({ valid }) => valid);
    const effective = selections.map(({ result }) => result);
    const allTerminal = effective.every(Boolean);
    const profileValid = effective.every((result) => !result
      || resultMatchesRegisteredProfile(result, registered, "smoke", operation, runtimeAttestationRef));
    const allPass = replacementsValid && profileValid && allTerminal && effective.every((result) => result.status === "pass");
    let deterministic = true;
    let fileSha256 = null;
    let decodedPixelSha256 = null;
    if (registered.expectedDisposition === "applicable") {
      const artifacts = effective.map((result) => result?.artifactRef ?? null);
      deterministic = allPass && artifacts.every(Boolean)
        && new Set(artifacts.map((artifact) => artifact.fileSha256)).size === 1
        && new Set(artifacts.map((artifact) => artifact.decodedPixelSha256)).size === 1;
      fileSha256 = deterministic ? artifacts[0].fileSha256 : null;
      decodedPixelSha256 = deterministic ? artifacts[0].decodedPixelSha256 : null;
    } else if (effective.some((result) => result?.artifactRef !== null)) {
      deterministic = false;
    }
    return {
      sourceId: registered.sourceId,
      partition: "smoke",
      expectedDisposition: registered.expectedDisposition,
      repetitions: 3,
      terminalCount: effective.filter(Boolean).length,
      passCount: effective.filter((result) => result?.status === "pass").length,
      allTerminal,
      allPass,
      deterministic,
      fileSha256,
      decodedPixelSha256,
      effectiveResultRefs: selections.map(({ result }) => result ? resultRecordRef(result) : null),
      invalidatedResultRefs: selections.flatMap(({ invalidated }) => invalidated ? [resultRecordRef(invalidated)] : []),
    };
  });
  const registeredAttemptCount = registeredCases.length * 3;
  const terminalAttemptCount = caseResults.reduce((sum, item) => sum + item.terminalCount, 0);
  const passAttemptCount = caseResults.reduce((sum, item) => sum + item.passCount, 0);
  const effectiveResults = registeredCases.flatMap(({ sourceId }) => [1, 2, 3]
    .map((repetition) => effectiveResultFor(operationResults, sourceId, repetition).result).filter(Boolean));
  const registeredRawResults = operationResults.filter((result) => registeredIds.has(result.attempt.sourceId));
  const registeredById = new Map(registeredCases.map((registered) => [registered.sourceId, registered]));
  const unregisteredTerminalCount = operationResults.filter((result) => {
    const registered = registeredById.get(result.attempt.sourceId);
    return !registered || !resultMatchesRegisteredProfile(result, registered, "smoke", operation, runtimeAttestationRef);
  }).length;
  const recordedAttemptCount = registeredRawResults.length;
  const replacementAttemptCount = registeredRawResults.filter(({ attempt }) => attempt.attemptNumber === 2).length;
  const invalidNoResultCount = registeredRawResults.filter(({ status }) => status === "invalid-no-result").length;
  const timeoutCount = registeredRawResults.filter(({ status }) => status === "timeout").length;
  const cancelledCount = registeredRawResults.filter(({ status }) => status === "cancelled").length;
  const unknownReconciliationCount = registeredRawResults.filter(({ status }) => status === "unknown-reconciliation").length;
  const { falseAllowCount, falseRejectCount, failureCount, oracleNonpassCount } = classifiedOutcomeCounts(effectiveResults);
  const allRegisteredAttemptsTerminal = terminalAttemptCount === registeredAttemptCount
    && [...sourceReplacementValid.values()].every(Boolean) && unregisteredTerminalCount === 0;
  const allRegisteredAttemptsPass = allRegisteredAttemptsTerminal && passAttemptCount === registeredAttemptCount;
  const allApplicableSourcesDeterministic = caseResults
    .filter((item) => item.expectedDisposition === "applicable")
    .every((item) => item.deterministic);
  const sessionAuditAllPass = ["definitionIntegrity", "runtimeIntegrityAtStart", "runtimeIntegrityAtEnd", "runtimeStableStartToEnd",
    "implementationIntegrity", "sourceIsolation", "oracleIndependence", "atomicCommitIntegrity"].every((key) => sessionAudit[key] === true);
  const noClassifiedFailures = falseAllowCount === 0 && falseRejectCount === 0 && failureCount === 0
    && invalidNoResultCount === 0 && timeoutCount === 0 && cancelledCount === 0 && unknownReconciliationCount === 0
    && replacementAttemptCount === 0;
  const allPass = allRegisteredAttemptsPass && allApplicableSourcesDeterministic
    && noClassifiedFailures && faultSemantics.allPass === true && sessionAuditAllPass;
  assertUtc(startedAt, "S05_SMOKE_SUMMARY_INVALID", "startedAt");
  assertUtc(finishedAt, "S05_SMOKE_SUMMARY_INVALID", "finishedAt");
  return withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.smokeSummary,
    summaryId: `smoke-summary.${operation}.${manifestRef.contentHash.slice(0, 16)}`,
    operation,
    definitionRef: structuredClone(definitionRef),
    manifestRef: structuredClone(manifestRef),
    runtimeAttestationRef: structuredClone(runtimeAttestationRef),
    sessionAuditRef: structuredClone(sessionAuditRef),
    faultSemanticsRef: structuredClone(faultSemanticsRef),
    registeredCaseCount: registeredCases.length,
    registeredAttemptCount,
    recordedAttemptCount,
    replacementAttemptCount,
    terminalAttemptCount,
    missingAttemptCount: registeredAttemptCount - terminalAttemptCount,
    passAttemptCount,
    nonPassAttemptCount: terminalAttemptCount - passAttemptCount,
    falseAllowCount,
    falseRejectCount,
    failureCount,
    oracleNonpassCount,
    unregisteredTerminalCount,
    invalidNoResultCount,
    timeoutCount,
    cancelledCount,
    unknownReconciliationCount,
    allRegisteredAttemptsTerminal,
    allRegisteredAttemptsPass,
    allApplicableSourcesDeterministic,
    faultSemanticsAllPass: faultSemantics.allPass === true,
    caseResults,
    overallStatus: allPass ? "all-pass" : (allRegisteredAttemptsTerminal ? "non-pass" : "inconclusive"),
    startedAt,
    finishedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
}

export function validateSmokeSummarySlice05(record) {
  const code = "S05_SMOKE_SUMMARY_INVALID";
  assertExactObject(record, SLICE05_SMOKE_SUMMARY_KEYS, code, "smokeSummary");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.smokeSummary || !new Set(["normalize", "export"]).has(record.operation)) reject(code, "summary profile invalid");
  assertId(record.summaryId, code, "summaryId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRecordRef(record.manifestRef, code, "manifestRef");
  assertRuntimeAttestationRef(record.runtimeAttestationRef, code, "runtimeAttestationRef");
  assertRecordRef(record.sessionAuditRef, code, "sessionAuditRef");
  assertRecordRef(record.faultSemanticsRef, code, "faultSemanticsRef");
  for (const key of ["registeredCaseCount", "registeredAttemptCount", "recordedAttemptCount", "replacementAttemptCount",
    "terminalAttemptCount", "missingAttemptCount", "passAttemptCount", "nonPassAttemptCount", "falseAllowCount", "falseRejectCount",
    "failureCount", "oracleNonpassCount", "unregisteredTerminalCount", "invalidNoResultCount", "timeoutCount", "cancelledCount", "unknownReconciliationCount"]) {
    if (!Number.isInteger(record[key]) || record[key] < 0) reject(code, `${key} invalid`);
  }
  if (record.registeredAttemptCount !== record.registeredCaseCount * 3
    || record.terminalAttemptCount + record.missingAttemptCount !== record.registeredAttemptCount
    || record.passAttemptCount + record.nonPassAttemptCount !== record.terminalAttemptCount
    || !Array.isArray(record.caseResults) || record.caseResults.length !== record.registeredCaseCount) reject(code, "summary denominator invalid");
  const sourceIds = new Set();
  const effectiveRefs = new Set();
  const invalidatedRefs = new Set();
  for (const [index, item] of record.caseResults.entries()) {
    assertExactObject(item, ["sourceId", "partition", "expectedDisposition", "repetitions", "terminalCount", "passCount", "allTerminal", "allPass",
      "deterministic", "fileSha256", "decodedPixelSha256", "effectiveResultRefs", "invalidatedResultRefs"], code, `caseResults[${index}]`);
    assertId(item.sourceId, code, `caseResults[${index}].sourceId`);
    if (sourceIds.has(item.sourceId) || item.partition !== "smoke" || item.repetitions !== 3
      || !new Set(["applicable", "preflight-reject"]).has(item.expectedDisposition)
      || !Number.isInteger(item.terminalCount) || item.terminalCount < 0 || item.terminalCount > 3
      || !Number.isInteger(item.passCount) || item.passCount < 0 || item.passCount > item.terminalCount
      || [item.allTerminal, item.allPass, item.deterministic].some((value) => typeof value !== "boolean")
      || !Array.isArray(item.effectiveResultRefs) || item.effectiveResultRefs.length !== 3
      || !Array.isArray(item.invalidatedResultRefs) || item.invalidatedResultRefs.length > 1) reject(code, "summary case invalid");
    sourceIds.add(item.sourceId);
    let nonNullEffectiveRefCount = 0;
    item.effectiveResultRefs.forEach((ref, refIndex) => {
      if (ref !== null) {
        assertRecordRef(ref, code, `caseResults[${index}].effectiveResultRefs[${refIndex}]`);
        const identity = stableStringifySlice05Runner(ref);
        if (effectiveRefs.has(identity) || invalidatedRefs.has(identity)) reject(code, "summary result ref is duplicated or both effective and invalidated");
        effectiveRefs.add(identity);
        nonNullEffectiveRefCount += 1;
      }
    });
    item.invalidatedResultRefs.forEach((ref, refIndex) => {
      assertRecordRef(ref, code, `caseResults[${index}].invalidatedResultRefs[${refIndex}]`);
      const identity = stableStringifySlice05Runner(ref);
      if (effectiveRefs.has(identity) || invalidatedRefs.has(identity)) reject(code, "summary invalidated result ref is duplicated");
      invalidatedRefs.add(identity);
    });
    if (item.terminalCount !== nonNullEffectiveRefCount || item.allTerminal !== (item.terminalCount === 3)
      || (item.allPass && (!item.allTerminal || item.passCount !== 3))
      || (item.expectedDisposition === "applicable"
        && (item.deterministic !== (item.fileSha256 !== null && item.decodedPixelSha256 !== null)))
      || (item.expectedDisposition === "preflight-reject"
        && (item.fileSha256 !== null || item.decodedPixelSha256 !== null))) reject(code, "summary case evidence/count relation invalid");
    if (item.fileSha256 !== null) assertSha(item.fileSha256, code, `caseResults[${index}].fileSha256`);
    if (item.decodedPixelSha256 !== null) assertSha(item.decodedPixelSha256, code, `caseResults[${index}].decodedPixelSha256`);
  }
  const referencedReplacementCount = record.caseResults.reduce((sum, item) => sum + item.invalidatedResultRefs.length, 0);
  if (record.recordedAttemptCount !== record.terminalAttemptCount + record.replacementAttemptCount
    || record.replacementAttemptCount !== referencedReplacementCount
    || record.replacementAttemptCount > record.registeredCaseCount
    || record.recordedAttemptCount > record.registeredAttemptCount + record.registeredCaseCount
    || record.invalidNoResultCount < record.replacementAttemptCount
    || record.invalidNoResultCount + record.timeoutCount + record.cancelledCount + record.unknownReconciliationCount > record.recordedAttemptCount
    || record.oracleNonpassCount > record.failureCount
    || record.falseAllowCount + record.falseRejectCount + record.failureCount > record.nonPassAttemptCount) {
    reject(code, "recorded/replacement/classified attempt counts differ from the referenced effective history");
  }
  const recomputedAllTerminal = record.terminalAttemptCount === record.registeredAttemptCount
    && record.unregisteredTerminalCount === 0;
  const recomputedAllPass = recomputedAllTerminal && record.passAttemptCount === record.registeredAttemptCount;
  const recomputedDeterministic = record.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable")
    .every(({ deterministic }) => deterministic);
  if (record.allRegisteredAttemptsTerminal !== recomputedAllTerminal
    || record.allRegisteredAttemptsPass !== recomputedAllPass
    || record.allApplicableSourcesDeterministic !== recomputedDeterministic
    || (record.overallStatus === "inconclusive") !== !record.allRegisteredAttemptsTerminal) {
    reject(code, "summary aggregate booleans/status differ from case and attempt evidence");
  }
  if (record.overallStatus === "all-pass" && (!record.allRegisteredAttemptsTerminal || !record.allRegisteredAttemptsPass
    || !record.allApplicableSourcesDeterministic || !record.faultSemanticsAllPass || record.unregisteredTerminalCount !== 0
    || record.replacementAttemptCount !== 0 || record.falseAllowCount !== 0 || record.falseRejectCount !== 0
    || record.failureCount !== 0 || record.invalidNoResultCount !== 0 || record.timeoutCount !== 0
    || record.cancelledCount !== 0 || record.unknownReconciliationCount !== 0)) {
    reject(code, "all-pass summary lacks its conjunction");
  }
  assertUtc(record.startedAt, code, "startedAt");
  assertUtc(record.finishedAt, code, "finishedAt");
  if (Date.parse(record.startedAt) > Date.parse(record.finishedAt)) reject(code, "summary time order invalid");
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "summary evidence boundary invalid");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "summary content hash invalid");
  return record;
}

export function buildGateBDecisionSlice05({
  summary,
  summaryRef,
  gateBPlan,
  gateBPlanRef,
  sessionAudit,
  faultSemantics,
  decidedAt,
}) {
  assertExactObject(summary, SLICE05_SMOKE_SUMMARY_KEYS, "S05_GATE_B_DECISION_INVALID", "summary");
  if (summary.schemaVersion !== SLICE05_RUNNER_VERSIONS.smokeSummary
    || summary.contentHash !== contentHashSlice05Runner(summary)) reject("S05_GATE_B_DECISION_INVALID", "summary is not canonical");
  recordRefMatches(summaryRef, summary, "summaryId", "S05_GATE_B_DECISION_INVALID", "summaryRef");
  validateSlice05SessionAudit(sessionAudit);
  validateSlice05FaultResult(faultSemantics);
  recordRefMatches(summary.sessionAuditRef, sessionAudit, "auditId", "S05_GATE_B_DECISION_INVALID", "summary.sessionAuditRef");
  recordRefMatches(summary.faultSemanticsRef, faultSemantics, "faultResultId", "S05_GATE_B_DECISION_INVALID", "summary.faultSemanticsRef");
  if (!isPlainObject(gateBPlan) || gateBPlan.schemaVersion !== "gate-b-smoke-plan.slice05.v0"
    || gateBPlan.contentHash !== contentHashSlice05Runner(gateBPlan) || !Array.isArray(gateBPlan.operationPlans)) {
    reject("S05_GATE_B_DECISION_INVALID", "Gate B plan is not a canonical frozen plan");
  }
  recordRefMatches(gateBPlanRef, gateBPlan, "gateBPlanId", "S05_GATE_B_DECISION_INVALID", "gateBPlanRef");
  const operationPlan = gateBPlan.operationPlans.find(({ operation }) => operation === summary.operation);
  if (!operationPlan || !Array.isArray(operationPlan.conjunctiveGates) || operationPlan.conjunctiveGates.length < 1
    || operationPlan.smokeManifestRef.contentHash !== summary.manifestRef.contentHash
    || gateBPlan.crossOperationAggregationAllowed !== false) {
    reject("S05_GATE_B_DECISION_INVALID", "operation plan does not bind this exact operation/manifest");
  }
  assertUtc(decidedAt, "S05_GATE_B_DECISION_INVALID", "decidedAt");
  const applicableCases = summary.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable");
  const rejectionCases = summary.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "preflight-reject");
  const statuses = new Map([
    ["definition-integrity", sessionAudit.definitionIntegrity],
    ["runtime-integrity", sessionAudit.runtimeIntegrityAtStart && sessionAudit.runtimeIntegrityAtEnd && sessionAudit.runtimeStableStartToEnd],
    ["implementation-integrity", sessionAudit.implementationIntegrity],
    ["source-isolation", sessionAudit.sourceIsolation],
    ["applicable-success", applicableCases.length > 0 && applicableCases.every(({ allPass }) => allPass)],
    ["rejection-correctness", rejectionCases.length > 0 && rejectionCases.every(({ allPass }) => allPass)],
    ["repeat-determinism", summary.allApplicableSourcesDeterministic && summary.caseResults.every(({ deterministic }) => deterministic)],
    ["fault-semantics", faultSemantics.allPass && summary.faultSemanticsAllPass],
    ["oracle-independence", sessionAudit.oracleIndependence && applicableCases.every(({ effectiveResultRefs }) => effectiveResultRefs.every(Boolean))],
    ["zero-ambiguous-outcomes", summary.missingAttemptCount === 0 && summary.nonPassAttemptCount === 0
      && summary.invalidNoResultCount === 0 && summary.timeoutCount === 0 && summary.cancelledCount === 0
      && summary.unknownReconciliationCount === 0 && summary.unregisteredTerminalCount === 0
      && summary.falseAllowCount === 0 && summary.falseRejectCount === 0 && summary.failureCount === 0
      && summary.replacementAttemptCount === 0 && summary.recordedAttemptCount === summary.registeredAttemptCount],
    ["no-cross-operation-aggregation", summary.operation === operationPlan.operation && gateBPlan.crossOperationAggregationAllowed === false],
    ["no-capability-promotion", summary.evidenceBoundary.productSupport === false
      && summary.evidenceBoundary.formalEvidence === false && summary.evidenceBoundary.c1 === 0],
  ]);
  const evidenceFor = (suffix) => {
    if (suffix === "fault-semantics") return [summary.faultSemanticsRef];
    if (new Set(["definition-integrity", "runtime-integrity", "implementation-integrity", "source-isolation", "oracle-independence"]).has(suffix)) {
      return [summary.sessionAuditRef];
    }
    return [summaryRef];
  };
  const conjunctResults = operationPlan.conjunctiveGates.map(({ gateId, passRequired }) => {
    assertId(gateId, "S05_GATE_B_DECISION_INVALID", "gateId");
    if (passRequired !== true) reject("S05_GATE_B_DECISION_INVALID", "every Gate B plan conjunct must require pass");
    const suffix = gateId.replace(`gate-b.${summary.operation}.`, "");
    const computed = statuses.get(suffix);
    return {
      gateId,
      status: computed === undefined ? "unknown" : computed ? "pass" : "non-pass",
      evidenceRefs: evidenceFor(suffix).map((ref) => structuredClone(ref)),
    };
  });
  if (new Set(conjunctResults.map(({ gateId }) => gateId)).size !== operationPlan.conjunctiveGates.length) {
    reject("S05_GATE_B_DECISION_INVALID", "Gate B plan has duplicate conjunct IDs");
  }
  const ready = conjunctResults.every(({ status }) => status === "pass") && summary.overallStatus === "all-pass";
  const decisionRecord = withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.gateBDecision,
    decisionId: `gate-b.${summary.operation}.${summary.contentHash.slice(0, 16)}`,
    operation: summary.operation,
    definitionRef: structuredClone(summary.definitionRef),
    gateBPlanRef: structuredClone(gateBPlanRef),
    smokeSummaryRef: structuredClone(summaryRef),
    conjunctResults,
    decision: ready ? "calibration-ready" : "denied-not-entered",
    calibrationAuthorized: ready,
    productSupport: false,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
    decidedAt,
  });
  return frozenClone(validateGateBDecisionSlice05(decisionRecord));
}

export function validateGateBDecisionSlice05(record) {
  const code = "S05_GATE_B_DECISION_INVALID";
  assertExactObject(record, SLICE05_GATE_B_DECISION_KEYS, code, "gateBDecision");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.gateBDecision
    || !new Set(["normalize", "export"]).has(record.operation)) reject(code, "Gate B decision profile invalid");
  assertId(record.decisionId, code, "decisionId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRecordRef(record.gateBPlanRef, code, "gateBPlanRef");
  assertRecordRef(record.smokeSummaryRef, code, "smokeSummaryRef");
  if (!Array.isArray(record.conjunctResults) || record.conjunctResults.length < 1) reject(code, "conjunctResults missing");
  const gateIds = new Set();
  for (const [index, conjunct] of record.conjunctResults.entries()) {
    assertExactObject(conjunct, ["gateId", "status", "evidenceRefs"], code, `conjunctResults[${index}]`);
    assertId(conjunct.gateId, code, `conjunctResults[${index}].gateId`);
    if (gateIds.has(conjunct.gateId) || !new Set(["pass", "non-pass", "unknown"]).has(conjunct.status)
      || !Array.isArray(conjunct.evidenceRefs) || conjunct.evidenceRefs.length < 1) reject(code, "conjunct result invalid");
    gateIds.add(conjunct.gateId);
    conjunct.evidenceRefs.forEach((ref, refIndex) => assertRecordRef(ref, code, `conjunctResults[${index}].evidenceRefs[${refIndex}]`));
  }
  const computedReady = record.conjunctResults.every(({ status }) => status === "pass");
  if (record.decision !== (computedReady ? "calibration-ready" : "denied-not-entered")
    || record.calibrationAuthorized !== computedReady || record.productSupport !== false) {
    reject(code, "Gate B decision is not the conjunction of its registered gate results");
  }
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "Gate B evidence boundary invalid");
  assertUtc(record.decidedAt, code, "decidedAt");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "Gate B content hash invalid");
  return record;
}

export function buildCalibrationAdmissionSlice05({
  operation,
  definitionRef,
  gateBPlanRef,
  gateBDecision,
  gateBDecisionRef,
  calibrationPreregistration,
  calibrationPreregistrationRef,
  manifests,
  manifestRefs,
  runtimeStartObservation,
  admittedAt,
}) {
  validateGateBDecisionSlice05(gateBDecision);
  recordRefMatches(gateBDecisionRef, gateBDecision, "decisionId", "S05_CALIBRATION_ADMISSION_DENIED", "gateBDecisionRef");
  if (gateBDecision.operation !== operation || gateBDecision.decision !== "calibration-ready"
    || gateBDecision.calibrationAuthorized !== true || gateBDecision.definitionRef.contentHash !== definitionRef.contentHash
    || gateBDecision.gateBPlanRef.contentHash !== gateBPlanRef.contentHash) {
    reject("S05_CALIBRATION_ADMISSION_DENIED", "matching operation Gate B has not authorized calibration");
  }
  if (!isPlainObject(calibrationPreregistration)
    || calibrationPreregistration.schemaVersion !== "calibration-preregistration.slice05.v0"
    || calibrationPreregistration.operation !== operation
    || calibrationPreregistration.contentHash !== contentHashSlice05Runner(calibrationPreregistration)) {
    reject("S05_CALIBRATION_ADMISSION_DENIED", "calibration preregistration is invalid");
  }
  recordRefMatches(calibrationPreregistrationRef, calibrationPreregistration, "preregistrationId", "S05_CALIBRATION_ADMISSION_DENIED", "calibrationPreregistrationRef");
  if (!Array.isArray(manifests) || manifests.length !== 2 || !Array.isArray(manifestRefs) || manifestRefs.length !== 2) {
    reject("S05_CALIBRATION_ADMISSION_DENIED", "exactly two operation-specific calibration manifests are required");
  }
  validateRuntimeInventoryObservationSlice05(runtimeStartObservation);
  if (runtimeStartObservation.status !== "observed" || runtimeStartObservation.matchesFrozen !== true) {
    reject("S05_CALIBRATION_ADMISSION_DENIED", "calibration admission requires a durable exact frozen start inventory observation");
  }
  const partitions = new Set();
  manifests.forEach((manifest, index) => {
    if (!isPlainObject(manifest) || manifest.schemaVersion !== "fixture-manifest.slice05.v0"
      || manifest.manifestKind !== "open-calibration" || manifest.operationScope?.length !== 1
      || manifest.operationScope[0] !== operation || !new Set(["dev/calibration", "defect/calibration"]).has(manifest.partition)
      || manifest.contentHash !== contentHashSlice05Runner(manifest) || partitions.has(manifest.partition)) {
      reject("S05_CALIBRATION_ADMISSION_DENIED", "calibration manifest operation/partition/content is invalid");
    }
    partitions.add(manifest.partition);
    recordRefMatches(manifestRefs[index], manifest, "manifestId", "S05_CALIBRATION_ADMISSION_DENIED", `manifestRefs[${index}]`);
  });
  const preregHashes = new Set(calibrationPreregistration.calibrationManifestRefs?.map(({ contentHash }) => contentHash) ?? []);
  if (preregHashes.size !== 2 || manifestRefs.some(({ contentHash }) => !preregHashes.has(contentHash))) {
    reject("S05_CALIBRATION_ADMISSION_DENIED", "manifests differ from the frozen calibration preregistration");
  }
  assertUtc(admittedAt, "S05_CALIBRATION_ADMISSION_DENIED", "admittedAt");
  const record = withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.calibrationAdmission,
    admissionId: `calibration-admission.${operation}.${gateBDecision.contentHash.slice(0, 16)}`,
    operation,
    definitionRef: structuredClone(definitionRef),
    gateBPlanRef: structuredClone(gateBPlanRef),
    gateBDecisionRef: structuredClone(gateBDecisionRef),
    calibrationPreregistrationRef: structuredClone(calibrationPreregistrationRef),
    manifestRefs: structuredClone(manifestRefs),
    runtimeStartObservation: structuredClone(runtimeStartObservation),
    decision: "admitted-open-calibration",
    admittedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
  return frozenClone(validateCalibrationAdmissionSlice05(record));
}

export function validateCalibrationAdmissionSlice05(record) {
  const code = "S05_CALIBRATION_ADMISSION_INVALID";
  assertExactObject(record, SLICE05_CALIBRATION_ADMISSION_KEYS, code, "calibrationAdmission");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.calibrationAdmission
    || !new Set(["normalize", "export"]).has(record.operation) || record.decision !== "admitted-open-calibration") reject(code, "admission profile invalid");
  assertId(record.admissionId, code, "admissionId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRecordRef(record.gateBPlanRef, code, "gateBPlanRef");
  assertRecordRef(record.gateBDecisionRef, code, "gateBDecisionRef");
  assertRecordRef(record.calibrationPreregistrationRef, code, "calibrationPreregistrationRef");
  if (!Array.isArray(record.manifestRefs) || record.manifestRefs.length !== 2) reject(code, "admission manifestRefs invalid");
  record.manifestRefs.forEach((ref, index) => assertRecordRef(ref, code, `manifestRefs[${index}]`));
  validateRuntimeInventoryObservationSlice05(record.runtimeStartObservation);
  if (record.runtimeStartObservation.status !== "observed" || record.runtimeStartObservation.matchesFrozen !== true) {
    reject(code, "admission runtime start observation is not exact frozen inventory evidence");
  }
  assertUtc(record.admittedAt, code, "admittedAt");
  if (Date.parse(record.runtimeStartObservation.observedAt) > Date.parse(record.admittedAt)) {
    reject(code, "calibration admission predates its runtime start observation");
  }
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "admission evidence boundary invalid");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "admission content hash invalid");
  return record;
}

export function buildCalibrationSummarySlice05({
  operation,
  definitionRef,
  gateBDecision,
  gateBDecisionRef,
  admission,
  admissionRef,
  manifestRefs,
  registeredCases,
  terminalResults,
  runtimeAttestationRef,
  runtimeStartObservation,
  runtimeEndObservation,
  outputClosurePass,
  startedAt,
  finishedAt,
}) {
  const code = "S05_CALIBRATION_SUMMARY_INVALID";
  validateGateBDecisionSlice05(gateBDecision);
  validateCalibrationAdmissionSlice05(admission);
  recordRefMatches(gateBDecisionRef, gateBDecision, "decisionId", code, "gateBDecisionRef");
  recordRefMatches(admissionRef, admission, "admissionId", code, "admissionRef");
  assertRecordRef(definitionRef, code, "definitionRef");
  assertRuntimeAttestationRef(runtimeAttestationRef, code, "runtimeAttestationRef");
  validateRuntimeInventoryObservationSlice05(runtimeStartObservation);
  validateRuntimeInventoryObservationSlice05(runtimeEndObservation);
  if (gateBDecision.operation !== operation || admission.operation !== operation
    || gateBDecision.decision !== "calibration-ready" || admission.gateBDecisionRef.contentHash !== gateBDecision.contentHash
    || !Array.isArray(manifestRefs) || manifestRefs.length !== 2
    || stableStringifySlice05Runner(admission.manifestRefs) !== stableStringifySlice05Runner(manifestRefs)
    || stableStringifySlice05Runner(admission.runtimeStartObservation) !== stableStringifySlice05Runner(runtimeStartObservation)) {
    reject(code, "calibration admission/Gate B/manifest bindings differ");
  }
  if (!Array.isArray(registeredCases) || registeredCases.length !== 48 || !Array.isArray(terminalResults)) {
    reject(code, "calibration requires exactly 48 registered sources and raw terminal outcomes");
  }
  terminalResults.forEach(validateSlice05RunResult);
  const sourceIds = new Set(registeredCases.map(({ sourceId }) => sourceId));
  if (sourceIds.size !== 48) reject(code, "calibration source IDs must be unique");
  const operationResults = terminalResults.filter((result) => result.mode === "calibration" && result.operation === operation);
  const perSource = registeredCases.map((registered) => {
    assertExactObject(registered, ["sourceId", "partition", "expectedDisposition", "repetitions", "manifestContentHash"], code, "registeredCase");
    assertId(registered.sourceId, code, "registeredCase.sourceId");
    assertSha(registered.manifestContentHash, code, "registeredCase.manifestContentHash");
    if (!new Set(["dev/calibration", "defect/calibration"]).has(registered.partition)
      || !new Set(["applicable", "preflight-reject"]).has(registered.expectedDisposition)
      || registered.repetitions !== 3) reject(code, "registered calibration case invalid");
    const sourceResults = operationResults.filter((result) => result.attempt.sourceId === registered.sourceId);
    const replacementCount = sourceResults.filter((result) => result.attempt.attemptNumber === 2).length;
    const selections = [1, 2, 3].map((repetition) => effectiveResultFor(sourceResults, registered.sourceId, repetition));
    const replacementValid = replacementCount <= 1 && selections.every(({ valid }) => valid);
    const effective = selections.map(({ result }) => result);
    const allTerminal = replacementValid && effective.every(Boolean);
    const profileValid = effective.every((result) => !result
      || resultMatchesRegisteredProfile(result, registered, "calibration", operation, runtimeAttestationRef));
    const allPass = profileValid && allTerminal && effective.every(({ status }) => status === "pass");
    let deterministic = true;
    let fileSha256 = null;
    let decodedPixelSha256 = null;
    if (registered.expectedDisposition === "applicable") {
      const artifacts = effective.map((result) => result?.artifactRef ?? null);
      deterministic = allPass && artifacts.every(Boolean)
        && new Set(artifacts.map(({ fileSha256 }) => fileSha256)).size === 1
        && new Set(artifacts.map(({ decodedPixelSha256 }) => decodedPixelSha256)).size === 1;
      fileSha256 = deterministic ? artifacts[0].fileSha256 : null;
      decodedPixelSha256 = deterministic ? artifacts[0].decodedPixelSha256 : null;
    } else if (effective.some((result) => result?.artifactRef !== null)) {
      deterministic = false;
    }
    const caseResult = {
      ...registered,
      terminalCount: effective.filter(Boolean).length,
      passCount: effective.filter((result) => result?.status === "pass").length,
      allTerminal,
      allPass,
      deterministic,
      fileSha256,
      decodedPixelSha256,
      effectiveResultRefs: selections.map(({ result }) => result ? resultRecordRef(result) : null),
      invalidatedResultRefs: selections.flatMap(({ invalidated }) => invalidated ? [resultRecordRef(invalidated)] : []),
    };
    return { ...registered, effective, allTerminal, allPass, deterministic, caseResult };
  });
  const effectiveResults = perSource.flatMap(({ effective }) => effective.filter(Boolean));
  const registeredAttemptCount = 144;
  const terminalAttemptCount = effectiveResults.length;
  const passAttemptCount = effectiveResults.filter(({ status }) => status === "pass").length;
  const manifestResults = manifestRefs.map((manifestRef) => {
    const cases = perSource.filter(({ manifestContentHash }) => manifestContentHash === manifestRef.contentHash);
    const effective = cases.flatMap((entry) => entry.effective.filter(Boolean));
    return {
      manifestRef: structuredClone(manifestRef),
      partition: cases[0]?.partition ?? "dev/calibration",
      registeredSourceCount: cases.length,
      registeredAttemptCount: cases.length * 3,
      terminalAttemptCount: effective.length,
      passAttemptCount: effective.filter(({ status }) => status === "pass").length,
      allTerminal: cases.length > 0 && cases.every(({ allTerminal }) => allTerminal),
      allPass: cases.length > 0 && cases.every(({ allPass }) => allPass),
      allApplicableSourcesDeterministic: cases.filter(({ expectedDisposition }) => expectedDisposition === "applicable")
        .every(({ deterministic }) => deterministic),
    };
  });
  if (new Set(manifestResults.map(({ partition }) => partition)).size !== 2
    || manifestResults.some(({ registeredSourceCount }) => registeredSourceCount < 1)) reject(code, "calibration manifests do not partition all cases exactly once");
  const registeredRawResults = operationResults.filter((result) => sourceIds.has(result.attempt.sourceId));
  const registeredById = new Map(registeredCases.map((registered) => [registered.sourceId, registered]));
  const unregisteredTerminalCount = operationResults.filter((result) => {
    const registered = registeredById.get(result.attempt.sourceId);
    return !registered || !resultMatchesRegisteredProfile(result, registered, "calibration", operation, runtimeAttestationRef);
  }).length;
  const recordedAttemptCount = registeredRawResults.length;
  const replacementAttemptCount = registeredRawResults.filter(({ attempt }) => attempt.attemptNumber === 2).length;
  const invalidNoResultCount = registeredRawResults.filter(({ status }) => status === "invalid-no-result").length;
  const timeoutCount = registeredRawResults.filter(({ status }) => status === "timeout").length;
  const cancelledCount = registeredRawResults.filter(({ status }) => status === "cancelled").length;
  const unknownReconciliationCount = registeredRawResults.filter(({ status }) => status === "unknown-reconciliation").length;
  const { falseAllowCount, falseRejectCount, failureCount, oracleNonpassCount } = classifiedOutcomeCounts(effectiveResults);
  const allRegisteredAttemptsTerminal = terminalAttemptCount === registeredAttemptCount
    && perSource.every(({ allTerminal }) => allTerminal) && unregisteredTerminalCount === 0;
  const allRegisteredAttemptsPass = allRegisteredAttemptsTerminal && passAttemptCount === registeredAttemptCount;
  const allApplicableSourcesDeterministic = perSource.filter(({ expectedDisposition }) => expectedDisposition === "applicable")
    .every(({ deterministic }) => deterministic);
  const noClassifiedFailures = falseAllowCount === 0 && falseRejectCount === 0 && failureCount === 0
    && invalidNoResultCount === 0 && timeoutCount === 0 && cancelledCount === 0 && unknownReconciliationCount === 0
    && replacementAttemptCount === 0;
  const runtimeStableBeforeAndAfter = runtimeStartObservation.status === "observed"
    && runtimeEndObservation.status === "observed"
    && runtimeStartObservation.matchesFrozen === true
    && runtimeEndObservation.matchesFrozen === true
    && runtimeStartObservation.inventoryCanonicalSha256 === runtimeEndObservation.inventoryCanonicalSha256
    && runtimeStartObservation.inventoryPayloadSha256 === runtimeAttestationRef.inventoryPayloadSha256
    && runtimeEndObservation.inventoryPayloadSha256 === runtimeAttestationRef.inventoryPayloadSha256;
  const allPass = allRegisteredAttemptsPass && allApplicableSourcesDeterministic && noClassifiedFailures
    && runtimeStableBeforeAndAfter && outputClosurePass === true;
  assertUtc(startedAt, code, "startedAt");
  assertUtc(finishedAt, code, "finishedAt");
  if (Date.parse(startedAt) > Date.parse(finishedAt)
    || Date.parse(runtimeStartObservation.observedAt) > Date.parse(startedAt)
    || Date.parse(runtimeEndObservation.observedAt) < Date.parse(finishedAt)
    || Date.parse(runtimeStartObservation.observedAt) > Date.parse(admission.admittedAt)) {
    reject(code, "calibration summary/runtime observation time order invalid");
  }
  const record = withContentHash({
    schemaVersion: SLICE05_RUNNER_VERSIONS.calibrationSummary,
    summaryId: `calibration-summary.${operation}.${admission.contentHash.slice(0, 16)}`,
    operation,
    definitionRef: structuredClone(definitionRef),
    gateBDecisionRef: structuredClone(gateBDecisionRef),
    admissionRef: structuredClone(admissionRef),
    manifestRefs: structuredClone(manifestRefs),
    runtimeAttestationRef: structuredClone(runtimeAttestationRef),
    runtimeStartObservation: structuredClone(runtimeStartObservation),
    runtimeEndObservation: structuredClone(runtimeEndObservation),
    registeredSourceCount: 48,
    registeredAttemptCount,
    recordedAttemptCount,
    replacementAttemptCount,
    terminalAttemptCount,
    missingAttemptCount: registeredAttemptCount - terminalAttemptCount,
    passAttemptCount,
    nonPassAttemptCount: terminalAttemptCount - passAttemptCount,
    falseAllowCount,
    falseRejectCount,
    failureCount,
    oracleNonpassCount,
    invalidNoResultCount,
    timeoutCount,
    cancelledCount,
    unknownReconciliationCount,
    unregisteredTerminalCount,
    allRegisteredAttemptsTerminal,
    allRegisteredAttemptsPass,
    allApplicableSourcesDeterministic,
    runtimeStableBeforeAndAfter: runtimeStableBeforeAndAfter === true,
    outputClosurePass: outputClosurePass === true,
    caseResults: perSource.map(({ caseResult }) => caseResult),
    manifestResults,
    overallStatus: allPass ? "all-pass" : (allRegisteredAttemptsTerminal ? "non-pass" : "inconclusive"),
    startedAt,
    finishedAt,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
  return frozenClone(validateCalibrationSummarySlice05(record));
}

export function validateCalibrationSummarySlice05(record) {
  const code = "S05_CALIBRATION_SUMMARY_INVALID";
  assertExactObject(record, SLICE05_CALIBRATION_SUMMARY_KEYS, code, "calibrationSummary");
  if (record.schemaVersion !== SLICE05_RUNNER_VERSIONS.calibrationSummary || !new Set(["normalize", "export"]).has(record.operation)) reject(code, "summary profile invalid");
  assertId(record.summaryId, code, "summaryId");
  assertRecordRef(record.definitionRef, code, "definitionRef");
  assertRecordRef(record.gateBDecisionRef, code, "gateBDecisionRef");
  assertRecordRef(record.admissionRef, code, "admissionRef");
  if (!Array.isArray(record.manifestRefs) || record.manifestRefs.length !== 2
    || !Array.isArray(record.manifestResults) || record.manifestResults.length !== 2
    || !Array.isArray(record.caseResults) || record.caseResults.length !== 48) reject(code, "summary manifest/case evidence invalid");
  record.manifestRefs.forEach((ref, index) => assertRecordRef(ref, code, `manifestRefs[${index}]`));
  assertRuntimeAttestationRef(record.runtimeAttestationRef, code, "runtimeAttestationRef");
  validateRuntimeInventoryObservationSlice05(record.runtimeStartObservation);
  validateRuntimeInventoryObservationSlice05(record.runtimeEndObservation);
  if (record.registeredSourceCount !== 48 || record.registeredAttemptCount !== 144
    || record.terminalAttemptCount + record.missingAttemptCount !== 144
    || record.passAttemptCount + record.nonPassAttemptCount !== record.terminalAttemptCount) reject(code, "summary denominators invalid");
  for (const key of ["recordedAttemptCount", "replacementAttemptCount", "terminalAttemptCount", "missingAttemptCount", "passAttemptCount",
    "nonPassAttemptCount", "falseAllowCount", "falseRejectCount", "failureCount", "oracleNonpassCount", "invalidNoResultCount",
    "timeoutCount", "cancelledCount", "unknownReconciliationCount", "unregisteredTerminalCount"]) {
    if (!Number.isInteger(record[key]) || record[key] < 0) reject(code, `${key} invalid`);
  }
  const manifestRefByHash = new Map(record.manifestRefs.map((ref) => [ref.contentHash, ref]));
  const manifestPartitions = new Set();
  record.manifestResults.forEach((entry, index) => {
    assertExactObject(entry, ["manifestRef", "partition", "registeredSourceCount", "registeredAttemptCount", "terminalAttemptCount",
      "passAttemptCount", "allTerminal", "allPass", "allApplicableSourcesDeterministic"], code, `manifestResults[${index}]`);
    assertRecordRef(entry.manifestRef, code, `manifestResults[${index}].manifestRef`);
    if (!new Set(["dev/calibration", "defect/calibration"]).has(entry.partition) || manifestPartitions.has(entry.partition)
      || stableStringifySlice05Runner(manifestRefByHash.get(entry.manifestRef.contentHash)) !== stableStringifySlice05Runner(entry.manifestRef)
      || !Number.isInteger(entry.registeredSourceCount) || entry.registeredSourceCount < 1
      || !Number.isInteger(entry.registeredAttemptCount) || entry.registeredAttemptCount !== entry.registeredSourceCount * 3
      || !Number.isInteger(entry.terminalAttemptCount) || entry.terminalAttemptCount < 0 || entry.terminalAttemptCount > entry.registeredAttemptCount
      || !Number.isInteger(entry.passAttemptCount) || entry.passAttemptCount < 0 || entry.passAttemptCount > entry.terminalAttemptCount
      || [entry.allTerminal, entry.allPass, entry.allApplicableSourcesDeterministic].some((value) => typeof value !== "boolean")
      || entry.allTerminal !== (entry.terminalAttemptCount === entry.registeredAttemptCount)
      || (entry.allPass && (!entry.allTerminal || entry.passAttemptCount !== entry.registeredAttemptCount))) {
      reject(code, "manifest result partition/count/ref profile invalid");
    }
    manifestPartitions.add(entry.partition);
  });
  const sourceIds = new Set();
  const effectiveRefs = new Set();
  const invalidatedRefs = new Set();
  let referencedReplacementCount = 0;
  record.caseResults.forEach((entry, index) => {
    assertExactObject(entry, ["sourceId", "partition", "expectedDisposition", "repetitions", "manifestContentHash", "terminalCount", "passCount",
      "allTerminal", "allPass", "deterministic", "fileSha256", "decodedPixelSha256", "effectiveResultRefs", "invalidatedResultRefs"], code, `caseResults[${index}]`);
    assertId(entry.sourceId, code, `caseResults[${index}].sourceId`);
    assertSha(entry.manifestContentHash, code, `caseResults[${index}].manifestContentHash`);
    if (sourceIds.has(entry.sourceId) || !new Set(["dev/calibration", "defect/calibration"]).has(entry.partition)
      || !new Set(["applicable", "preflight-reject"]).has(entry.expectedDisposition) || entry.repetitions !== 3
      || !manifestRefByHash.has(entry.manifestContentHash)
      || !Number.isInteger(entry.terminalCount) || entry.terminalCount < 0 || entry.terminalCount > 3
      || !Number.isInteger(entry.passCount) || entry.passCount < 0 || entry.passCount > entry.terminalCount
      || [entry.allTerminal, entry.allPass, entry.deterministic].some((value) => typeof value !== "boolean")
      || !Array.isArray(entry.effectiveResultRefs) || entry.effectiveResultRefs.length !== 3
      || !Array.isArray(entry.invalidatedResultRefs) || entry.invalidatedResultRefs.length > 1) reject(code, "calibration case result invalid");
    sourceIds.add(entry.sourceId);
    let nonNullEffectiveRefCount = 0;
    entry.effectiveResultRefs.forEach((ref, refIndex) => {
      if (ref !== null) {
        assertRecordRef(ref, code, `caseResults[${index}].effectiveResultRefs[${refIndex}]`);
        const identity = stableStringifySlice05Runner(ref);
        if (effectiveRefs.has(identity) || invalidatedRefs.has(identity)) reject(code, "calibration result ref is duplicated or both effective and invalidated");
        effectiveRefs.add(identity);
        nonNullEffectiveRefCount += 1;
      }
    });
    entry.invalidatedResultRefs.forEach((ref, refIndex) => {
      assertRecordRef(ref, code, `caseResults[${index}].invalidatedResultRefs[${refIndex}]`);
      const identity = stableStringifySlice05Runner(ref);
      if (effectiveRefs.has(identity) || invalidatedRefs.has(identity)) reject(code, "calibration invalidated result ref is duplicated");
      invalidatedRefs.add(identity);
    });
    if (entry.terminalCount !== nonNullEffectiveRefCount || entry.allTerminal !== (entry.terminalCount === 3)
      || (entry.allPass && (!entry.allTerminal || entry.passCount !== 3))
      || (entry.expectedDisposition === "applicable"
        && (entry.deterministic !== (entry.fileSha256 !== null && entry.decodedPixelSha256 !== null)))
      || (entry.expectedDisposition === "preflight-reject"
        && (entry.fileSha256 !== null || entry.decodedPixelSha256 !== null))) reject(code, "calibration case evidence/count relation invalid");
    if (entry.fileSha256 !== null) assertSha(entry.fileSha256, code, `caseResults[${index}].fileSha256`);
    if (entry.decodedPixelSha256 !== null) assertSha(entry.decodedPixelSha256, code, `caseResults[${index}].decodedPixelSha256`);
    referencedReplacementCount += entry.invalidatedResultRefs.length;
  });
  for (const manifestResult of record.manifestResults) {
    const matchingCases = record.caseResults.filter(({ manifestContentHash }) => manifestContentHash === manifestResult.manifestRef.contentHash);
    if (matchingCases.length !== manifestResult.registeredSourceCount
      || matchingCases.reduce((sum, entry) => sum + entry.terminalCount, 0) !== manifestResult.terminalAttemptCount
      || matchingCases.reduce((sum, entry) => sum + entry.passCount, 0) !== manifestResult.passAttemptCount
      || matchingCases.some(({ partition }) => partition !== manifestResult.partition)
      || manifestResult.allApplicableSourcesDeterministic !== matchingCases
        .filter(({ expectedDisposition }) => expectedDisposition === "applicable").every(({ deterministic }) => deterministic)) {
      reject(code, "manifest result differs from its exact calibration case evidence");
    }
  }
  if (record.recordedAttemptCount !== record.terminalAttemptCount + record.replacementAttemptCount
    || record.replacementAttemptCount !== referencedReplacementCount || record.oracleNonpassCount > record.failureCount
    || record.replacementAttemptCount > record.registeredSourceCount
    || record.recordedAttemptCount > record.registeredAttemptCount + record.registeredSourceCount
    || record.invalidNoResultCount < record.replacementAttemptCount
    || record.invalidNoResultCount + record.timeoutCount + record.cancelledCount + record.unknownReconciliationCount > record.recordedAttemptCount
    || record.falseAllowCount + record.falseRejectCount + record.failureCount > record.nonPassAttemptCount) {
    reject(code, "calibration recorded/replacement/classified counts differ from referenced terminal history");
  }
  const recomputedAllTerminal = record.terminalAttemptCount === record.registeredAttemptCount
    && record.unregisteredTerminalCount === 0;
  const recomputedAllPass = recomputedAllTerminal && record.passAttemptCount === record.registeredAttemptCount;
  const recomputedDeterministic = record.caseResults.filter(({ expectedDisposition }) => expectedDisposition === "applicable")
    .every(({ deterministic }) => deterministic);
  if (record.allRegisteredAttemptsTerminal !== recomputedAllTerminal
    || record.allRegisteredAttemptsPass !== recomputedAllPass
    || record.allApplicableSourcesDeterministic !== recomputedDeterministic
    || record.manifestResults.reduce((sum, entry) => sum + entry.registeredSourceCount, 0) !== record.registeredSourceCount
    || record.manifestResults.reduce((sum, entry) => sum + entry.terminalAttemptCount, 0) !== record.terminalAttemptCount
    || record.manifestResults.reduce((sum, entry) => sum + entry.passAttemptCount, 0) !== record.passAttemptCount
    || (record.overallStatus === "inconclusive") !== !record.allRegisteredAttemptsTerminal) {
    reject(code, "calibration aggregate booleans/status differ from manifest/case evidence");
  }
  const recomputedRuntimeStable = record.runtimeStartObservation.status === "observed"
    && record.runtimeEndObservation.status === "observed"
    && record.runtimeStartObservation.matchesFrozen === true
    && record.runtimeEndObservation.matchesFrozen === true
    && record.runtimeStartObservation.inventoryCanonicalSha256 === record.runtimeEndObservation.inventoryCanonicalSha256
    && record.runtimeStartObservation.inventoryPayloadSha256 === record.runtimeAttestationRef.inventoryPayloadSha256
    && record.runtimeEndObservation.inventoryPayloadSha256 === record.runtimeAttestationRef.inventoryPayloadSha256;
  if (record.runtimeStableBeforeAndAfter !== recomputedRuntimeStable) {
    reject(code, "runtime stability flag differs from its durable start/end inventory observations");
  }
  if (record.overallStatus === "all-pass" && (!record.allRegisteredAttemptsPass || !record.allApplicableSourcesDeterministic
    || !record.runtimeStableBeforeAndAfter || !record.outputClosurePass || record.unregisteredTerminalCount !== 0
    || record.replacementAttemptCount !== 0 || record.falseAllowCount !== 0 || record.falseRejectCount !== 0
    || record.failureCount !== 0 || record.invalidNoResultCount !== 0 || record.timeoutCount !== 0
    || record.cancelledCount !== 0 || record.unknownReconciliationCount !== 0)) reject(code, "all-pass summary lacks its conjunction");
  assertUtc(record.startedAt, code, "startedAt");
  assertUtc(record.finishedAt, code, "finishedAt");
  if (Date.parse(record.startedAt) > Date.parse(record.finishedAt)
    || Date.parse(record.runtimeStartObservation.observedAt) > Date.parse(record.startedAt)
    || Date.parse(record.runtimeEndObservation.observedAt) < Date.parse(record.finishedAt)) {
    reject(code, "summary/runtime observation time order invalid");
  }
  if (stableStringifySlice05Runner(record.evidenceBoundary) !== stableStringifySlice05Runner(EVIDENCE_BOUNDARY)) reject(code, "summary evidence boundary invalid");
  assertSha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashSlice05Runner(record)) reject(code, "summary content hash invalid");
  return record;
}

async function atomicCommitOutputInternal({ resultsRoot, expectedRelativePath, expectedFileSha256, bytes, testOnly }) {
  const root = normalizeResultsRoot(resultsRoot, { testOnly });
  await assertNoSymlinkOrJunctionInPath(root, { testOnly });
  if (typeof expectedRelativePath !== "string" || !/^[A-Za-z0-9._/-]+$/.test(expectedRelativePath)
    || expectedRelativePath.includes("..") || expectedRelativePath.startsWith("/")) {
    reject("S05_ATOMIC_OUTPUT_PATH_INVALID", "output path is outside resultsRoot");
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > SLICE05_SHARP_POLICY.maxOutputBytes) {
    reject("S05_ATOMIC_OUTPUT_BYTES_INVALID", "output bytes exceed the frozen profile");
  }
  assertSha(expectedFileSha256, "S05_ATOMIC_OUTPUT_HASH_INVALID", "expectedFileSha256");
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (sha256Slice05(buffer) !== expectedFileSha256) reject("S05_ATOMIC_OUTPUT_HASH_INVALID", "output bytes do not match expected hash");
  const target = path.resolve(root, expectedRelativePath);
  const prefix = `${root}${path.sep}`;
  if (!target.startsWith(prefix)) reject("S05_ATOMIC_OUTPUT_PATH_INVALID", "output path escapes resultsRoot");
  await atomicWrite(target, buffer);
  const reopened = await readFile(target);
  if (sha256Slice05(reopened) !== expectedFileSha256) reject("S05_ATOMIC_OUTPUT_HASH_INVALID", "committed output failed reopen hash verification");
  return Object.freeze({ status: "committed", relativePath: expectedRelativePath, fileSha256: expectedFileSha256 });
}

export async function atomicCommitSlice05Output(args) {
  return atomicCommitOutputInternal({ ...args, testOnly: false });
}

export async function atomicCommitSlice05TestOutput(args) {
  return atomicCommitOutputInternal({ ...args, testOnly: true });
}

async function assertDefinitionPathNoLinks(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) reject("S05_DEFINITION_PATH_INVALID", "definition path escapes slice root");
  let cursor = root;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    const stats = await lstat(cursor);
    if (stats.isSymbolicLink()) reject("S05_DEFINITION_LINK_FORBIDDEN", `definition symlink/junction forbidden: ${cursor}`);
  }
}

async function readPinnedRecord(definitionRoot, ref, idField, code = "S05_DEFINITION_REF_INVALID") {
  assertRecordRef(ref, code, "recordRef");
  const filename = path.resolve(definitionRoot, ref.path);
  await assertDefinitionPathNoLinks(definitionRoot, filename);
  const bytes = await readFile(filename);
  if (bytes.byteLength !== ref.byteLength || sha256Slice05(bytes) !== ref.fileSha256) reject(code, `file identity mismatch: ${ref.path}`);
  let record;
  try {
    record = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    reject(code, `invalid JSON: ${ref.path}`, { cause });
  }
  if (!isPlainObject(record) || record[idField] !== ref.id || record.contentHash !== ref.contentHash
    || record.contentHash !== contentHashSlice05Runner(record)) reject(code, `record identity mismatch: ${ref.path}`);
  return { record, bytes, filename };
}

async function verifyMachineTree(index, definitionRoot) {
  if (!isPlainObject(index.machineTree) || !Array.isArray(index.machineTree.files)
    || index.machineTree.fileCount !== index.machineTree.files.length) reject("S05_DEFINITION_TREE_INVALID", "machine tree profile invalid");
  const seen = new Set();
  const digest = createHash("sha256");
  for (const entry of [...index.machineTree.files].sort((left, right) => compareText(left.path, right.path))) {
    assertRelativePath(entry.path, "S05_DEFINITION_TREE_INVALID", "machineTree.path");
    if (seen.has(entry.path) || !Number.isInteger(entry.byteLength) || entry.byteLength < 1) reject("S05_DEFINITION_TREE_INVALID", "machine tree duplicate/length invalid");
    seen.add(entry.path);
    assertSha(entry.fileSha256, "S05_DEFINITION_TREE_INVALID", "machineTree.fileSha256");
    const filename = path.resolve(definitionRoot, entry.path);
    await assertDefinitionPathNoLinks(definitionRoot, filename);
    const bytes = await readFile(filename);
    if (bytes.byteLength !== entry.byteLength || sha256Slice05(bytes) !== entry.fileSha256) {
      reject("S05_DEFINITION_TREE_INVALID", `machine tree file drift: ${entry.path}`);
    }
    digest.update(Buffer.from(entry.path, "utf8"));
    digest.update(Buffer.from([0]));
    digest.update(Buffer.from(String(entry.byteLength), "ascii"));
    digest.update(Buffer.from([0]));
    digest.update(Buffer.from(entry.fileSha256, "ascii"));
    digest.update(Buffer.from([0]));
  }
  if (digest.digest("hex") !== index.machineTree.sha256) reject("S05_DEFINITION_TREE_INVALID", "machine tree aggregate hash mismatch");
}

/** Read-only fake-definition hook; never used by the actual CLI. */
export async function verifySlice05DefinitionTreeForTest({ definitionRoot, machineTree }) {
  if (typeof definitionRoot !== "string") reject("S05_DEFINITION_TREE_INVALID", "test definitionRoot is required");
  await verifyMachineTree({ machineTree }, path.resolve(definitionRoot));
  return true;
}

async function verifyImplementationPins(index) {
  const requiredRoles = new Set([
    "candidate-adapter", "candidate-worker", "independent-oracle", "runtime-inventory",
    "independent-fixture-generator", "local-open-runner", "fault-semantics-worker",
  ]);
  if (!Array.isArray(index.implementationRefs) || index.implementationRefs.length !== requiredRoles.size) {
    reject("S05_IMPLEMENTATION_PIN_INVALID", "definition must pin all seven implementations");
  }
  const byRole = new Map();
  for (const entry of index.implementationRefs) {
    if (!isPlainObject(entry) || !requiredRoles.has(entry.role) || byRole.has(entry.role) || !isPlainObject(entry.ref)) {
      reject("S05_IMPLEMENTATION_PIN_INVALID", "implementation role set invalid");
    }
    const ref = entry.ref;
    assertExactObject(ref, ["id", "version", "path", "implementationSha256"], "S05_IMPLEMENTATION_PIN_INVALID", `implementation.${entry.role}`);
    assertImplementationRef({ id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 }, "S05_IMPLEMENTATION_PIN_INVALID", entry.role);
    assertRelativePath(ref.path, "S05_IMPLEMENTATION_PIN_INVALID", `${entry.role}.path`);
    const filename = path.resolve(PROJECT_ROOT, ref.path);
    const relative = path.relative(PROJECT_ROOT, filename);
    if (relative.startsWith("..") || path.isAbsolute(relative)) reject("S05_IMPLEMENTATION_PIN_INVALID", "implementation path escapes project");
    const stats = await lstat(filename);
    if (!stats.isFile() || stats.isSymbolicLink()) reject("S05_IMPLEMENTATION_PIN_INVALID", "implementation source is not a regular file");
    if (sha256Slice05(await readFile(filename)) !== ref.implementationSha256) reject("S05_IMPLEMENTATION_PIN_INVALID", `implementation drift: ${entry.role}`);
    byRole.set(entry.role, ref);
  }
  return byRole;
}

async function loadDefinitionIndex(indexPath) {
  const resolved = path.resolve(indexPath);
  if (resolved !== DEFAULT_DEFINITION_INDEX) reject("S05_DEFINITION_INDEX_PATH_INVALID", "actual runner accepts only the canonical Slice 05 definition index");
  await assertDefinitionPathNoLinks(path.dirname(resolved), resolved);
  const bytes = await readFile(resolved);
  let index;
  try {
    index = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    reject("S05_DEFINITION_INDEX_INVALID", "definition index is invalid JSON", { cause });
  }
  if (!isPlainObject(index) || index.schemaVersion !== "definition-index.slice05.v0"
    || index.definitionIndexId !== "DEFINITION-INDEX-SLICE05@0.5.0" || index.definitionState !== "frozen-definition-no-results"
    || !Array.isArray(index.smokeManifestRefs) || !isPlainObject(index.runtimeAttestationRef)
    || !Array.isArray(index.implementationRefs) || index.contentHash !== contentHashSlice05Runner(index)) {
    reject("S05_DEFINITION_INDEX_INVALID", "definition index lacks the frozen closed runner bindings");
  }
  const definitionRef = {
    path: path.basename(resolved),
    id: index.definitionIndexId,
    contentHash: index.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: sha256Slice05(bytes),
  };
  return { index, definitionRef, definitionRoot: path.dirname(resolved), bytes };
}

function frozenRuntimeProjection(frozen) {
  return {
    packageManifest: frozen.packageManifest,
    packageLock: frozen.packageLock,
    installedClosure: frozen.installedClosure,
    versions: frozen.versions,
    environment: frozen.environment,
  };
}

function actualRuntimeProjection(actual) {
  return {
    packageManifest: {
      path: actual.packageManifest.path,
      sha256: actual.packageManifest.sha256,
      exactDevDependencies: actual.packageManifest.devDependencies,
    },
    packageLock: {
      path: actual.packageLock.path,
      sha256: actual.packageLock.sha256,
      expectedSha256: actual.packageLock.expectedSha256,
      lockfileVersion: actual.packageLock.lockfileVersion,
      pins: actual.packageLock.pins,
    },
    installedClosure: {
      allowlist: actual.installed.allowlist,
      packages: actual.installed.packages,
      ignoredEmptyScopeDirectories: actual.installed.ignoredEmptyScopeDirectories,
      fileCount: actual.installed.tree.fileCount,
      treeSha256: actual.installed.tree.sha256,
      nativeArtifacts: actual.installed.nativeArtifacts,
    },
    versions: {
      installedVersionsJsonSha256: actual.versions.installedVersionsJson.sha256,
      installed: actual.versions.installedVersionsJson.values,
      sharpRuntime: actual.versions.sharpRuntime.values,
      slice04PackagingMetadataErratum: actual.versions.slice04PackagingMetadataComparison.differences.map((entry) => ({
        componentId: entry.componentId,
        slice04PackagingMetadataVersion: entry.slice04PackagingMetadataVersion,
        installedRuntimeVersion: entry.installedVersionsJsonVersion,
        disposition: entry.disposition,
      })),
    },
    environment: actual.environment,
  };
}

function parseCanonicalInventoryObservationJson(value, code, label) {
  if (typeof value !== "string" || value.length < 2 || value.length > 4 * 1024 * 1024) {
    reject(code, `${label} is not a bounded canonical JSON payload`);
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (cause) {
    reject(code, `${label} is not valid JSON`, { cause });
  }
  if (stableStringifySlice05Runner(parsed) !== value) reject(code, `${label} is not runner-canonical JSON`);
  return parsed;
}

export function validateRuntimeInventoryObservationSlice05(observation) {
  const code = "S05_RUNTIME_OBSERVATION_INVALID";
  assertExactObject(observation, RUNTIME_INVENTORY_OBSERVATION_KEYS, code, "runtimeInventoryObservation");
  assertUtc(observation.observedAt, code, "runtimeInventoryObservation.observedAt");
  if (!new Set(["observed", "unavailable"]).has(observation.status)
    || typeof observation.matchesFrozen !== "boolean") reject(code, "runtime observation status is invalid");
  if (observation.issue !== null) {
    assertExactObject(observation.issue, ["code", "location", "message"], code, "runtimeInventoryObservation.issue");
    assertId(observation.issue.code, code, "runtimeInventoryObservation.issue.code");
    if (typeof observation.issue.location !== "string" || observation.issue.location.length < 1
      || typeof observation.issue.message !== "string" || observation.issue.message.length < 1) reject(code, "runtime observation issue is invalid");
  }
  const payloadFields = [
    observation.inventoryCanonicalJson,
    observation.inventoryCanonicalSha256,
    observation.inventoryPayloadSha256,
    observation.attestedProjectionCanonicalJson,
    observation.attestedProjectionSha256,
  ];
  if (observation.status === "unavailable") {
    if (payloadFields.some((value) => value !== null) || observation.matchesFrozen !== false || observation.issue === null) {
      reject(code, "unavailable runtime observation must carry only a closed failure issue");
    }
    return observation;
  }
  if (payloadFields.some((value) => value === null) || observation.issue !== null) {
    reject(code, "observed runtime inventory must embed its full payload and no failure issue");
  }
  assertSha(observation.inventoryCanonicalSha256, code, "runtimeInventoryObservation.inventoryCanonicalSha256");
  assertSha(observation.inventoryPayloadSha256, code, "runtimeInventoryObservation.inventoryPayloadSha256");
  assertSha(observation.attestedProjectionSha256, code, "runtimeInventoryObservation.attestedProjectionSha256");
  const inventory = parseCanonicalInventoryObservationJson(
    observation.inventoryCanonicalJson,
    code,
    "runtimeInventoryObservation.inventoryCanonicalJson",
  );
  if (sha256Slice05(Buffer.from(observation.inventoryCanonicalJson, "utf8")) !== observation.inventoryCanonicalSha256) {
    reject(code, "runtime inventory canonical payload hash differs");
  }
  assertExactObject(inventory, [
    "schemaVersion", "inventoryKind", "sourceCandidateMetadataRef", "runtimeCandidateId", "gateBState",
    "productSupport", "evidenceBoundary", "packageManifest", "packageLock", "installed", "versions",
    "environment", "privacyBoundary", "executionBoundary", "attestation",
  ], code, "runtimeInventoryObservation.inventory");
  assertExactObject(inventory.attestation, ["canonicalization", "payloadSha256"], code, "runtimeInventoryObservation.inventory.attestation");
  assertSha(inventory.attestation.payloadSha256, code, "runtimeInventoryObservation.inventory.attestation.payloadSha256");
  if (inventory.schemaVersion !== "runtime-inventory.slice05.v0"
    || inventory.inventoryKind !== "read-only-runtime-inventory-no-image-processing"
    || inventory.runtimeCandidateId !== "REG-NORM-SHARP@0.5.0"
    || inventory.productSupport !== false
    || inventory.attestation.canonicalization !== "recursive-lexicographic-object-keys-preserve-array-order-utf8-json") {
    reject(code, "embedded inventory is outside the frozen runtime-attestation profile");
  }
  const payload = structuredClone(inventory);
  delete payload.attestation;
  const recomputedPayloadSha256 = sha256Slice05(Buffer.from(canonicalJsonSlice05(payload), "utf8"));
  if (inventory.attestation.payloadSha256 !== recomputedPayloadSha256
    || observation.inventoryPayloadSha256 !== recomputedPayloadSha256) {
    reject(code, "embedded inventory attestation payload is not independently reproducible");
  }
  const projection = actualRuntimeProjection(inventory);
  const projectionCanonicalJson = stableStringifySlice05Runner(projection);
  if (observation.attestedProjectionCanonicalJson !== projectionCanonicalJson
    || sha256Slice05(Buffer.from(projectionCanonicalJson, "utf8")) !== observation.attestedProjectionSha256) {
    reject(code, "embedded runtime projection differs from the full inventory payload");
  }
  return observation;
}

export function buildRuntimeInventoryObservationSlice05({
  inventory,
  frozenRuntimeAttestation,
  expectedInventoryPayloadSha256,
  observedAt,
  stableWithStart = true,
  issue = null,
}) {
  assertUtc(observedAt, "S05_RUNTIME_OBSERVATION_INVALID", "observedAt");
  assertSha(expectedInventoryPayloadSha256, "S05_RUNTIME_OBSERVATION_INVALID", "expectedInventoryPayloadSha256");
  if (inventory === null) {
    const record = {
      observedAt,
      status: "unavailable",
      inventoryCanonicalJson: null,
      inventoryCanonicalSha256: null,
      inventoryPayloadSha256: null,
      attestedProjectionCanonicalJson: null,
      attestedProjectionSha256: null,
      matchesFrozen: false,
      issue: structuredClone(issue ?? { code: "RUNTIME_INVENTORY_UNAVAILABLE", location: "runtime", message: "runtime inventory was unavailable" }),
    };
    return frozenClone(validateRuntimeInventoryObservationSlice05(record));
  }
  const inventoryCanonicalJson = stableStringifySlice05Runner(inventory);
  const attestedProjectionCanonicalJson = stableStringifySlice05Runner(actualRuntimeProjection(inventory));
  const frozenProjectionCanonicalJson = stableStringifySlice05Runner(frozenRuntimeProjection(frozenRuntimeAttestation));
  const record = {
    observedAt,
    status: "observed",
    inventoryCanonicalJson,
    inventoryCanonicalSha256: sha256Slice05(Buffer.from(inventoryCanonicalJson, "utf8")),
    inventoryPayloadSha256: inventory.attestation?.payloadSha256 ?? null,
    attestedProjectionCanonicalJson,
    attestedProjectionSha256: sha256Slice05(Buffer.from(attestedProjectionCanonicalJson, "utf8")),
    matchesFrozen: stableWithStart === true
      && inventory.attestation?.payloadSha256 === expectedInventoryPayloadSha256
      && attestedProjectionCanonicalJson === frozenProjectionCanonicalJson,
    issue: null,
  };
  return frozenClone(validateRuntimeInventoryObservationSlice05(record));
}

async function verifyFrozenInventoryBeforeSpawn(index, definitionRoot) {
  const ref = index.runtimeAttestationRef;
  assertRuntimeAttestationRef(ref, "S05_RUNTIME_ATTESTATION_INVALID", "runtimeAttestationRef");
  const { record: frozen } = await readPinnedRecord(definitionRoot, {
    path: ref.path, id: ref.id, contentHash: ref.contentHash, byteLength: ref.byteLength, fileSha256: ref.fileSha256,
  }, "runtimeAttestationId", "S05_RUNTIME_ATTESTATION_INVALID");
  const actual = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  if (frozen.inventoryRef?.inventoryPayloadSha256 !== ref.inventoryPayloadSha256
    || actual.attestation?.payloadSha256 !== ref.inventoryPayloadSha256
    || stableStringifySlice05Runner(frozenRuntimeProjection(frozen)) !== stableStringifySlice05Runner(actualRuntimeProjection(actual))) {
    reject("S05_RUNTIME_ATTESTATION_MISMATCH", "installed runtime differs from the exact frozen attestation before worker spawn");
  }
  return { frozen, actual, actualCanonical: stableStringifySlice05Runner(actual) };
}

function implementationRefForAdapter(ref) {
  return { id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 };
}

function hashRefFromRecordRef(ref) {
  return { id: ref.id, contentHash: ref.contentHash };
}

function expectedWorkerRuntimeFromFrozen(frozen) {
  return {
    sharpVersion: frozen.versions.sharpRuntime.sharp,
    nativeVersions: structuredClone(frozen.versions.sharpRuntime),
    nodeVersion: frozen.environment.node.version,
    platform: frozen.environment.os.platform,
    architecture: frozen.environment.os.architecture,
    settings: {
      concurrency: 1,
      cacheMemoryMaxMiB: 0,
      cacheFilesMax: 0,
      cacheItemsMax: 0,
      simd: false,
      uvThreadpoolSize: "1",
      vipsConcurrency: "1",
      ignoreGlobalLibvips: "1",
    },
  };
}

async function readRawAsset(definitionRoot, rawAsset) {
  assertExactObject(rawAsset, RAW_ASSET_REF_KEYS, "S05_SOURCE_ASSET_INVALID", "rawAsset");
  assertRelativePath(rawAsset.path, "S05_SOURCE_ASSET_INVALID", "rawAsset.path");
  const filename = path.resolve(definitionRoot, rawAsset.path);
  await assertDefinitionPathNoLinks(definitionRoot, filename);
  const bytes = await readFile(filename);
  if (bytes.byteLength !== rawAsset.byteLength || sha256Slice05(bytes) !== rawAsset.fileSha256) {
    reject("S05_SOURCE_ASSET_INVALID", `raw asset identity drift: ${rawAsset.path}`);
  }
  return bytes;
}

export function validateManifestEntryMaterialBindingSlice05({ entry, provenance, normalizedArtifact }) {
  const code = "S05_SOURCE_PROVENANCE_INVALID";
  if (!isPlainObject(entry) || !isPlainObject(provenance) || !new Set(["normalize", "export"]).has(entry.operation)) {
    reject(code, "manifest/provenance material profile invalid");
  }
  const rawKeys = ["path", "mime", "byteLength", "fileSha256", "decodedPixelSha256", "sourceDeclarationDecodedPixelSha256"];
  if (provenance.operation !== entry.operation || provenance.partition !== entry.partition
    || provenance.categoryId !== entry.categoryId || provenance.expectedDisposition !== entry.expectedDisposition
    || provenance.expectedStableErrorCode !== entry.expectedStableErrorCode
    || provenance.sourceFamilyId !== entry.sourceFamilyId || provenance.captureSessionId !== entry.captureSessionId
    || !isPlainObject(provenance.rawAsset)
    || rawKeys.some((key) => provenance.rawAsset[key] !== entry.rawAsset?.[key])) {
    reject(code, "manifest entry and source provenance differ");
  }
  if (entry.operation === "normalize") {
    if (provenance.sourceId !== entry.sourceId || entry.normalizedArtifactRef !== null || normalizedArtifact !== null) {
      reject(code, "normalize source/provenance/normalized-input binding differs");
    }
    return true;
  }
  if (!isPlainObject(normalizedArtifact) || !isPlainObject(entry.normalizedArtifactRef)
    || normalizedArtifact.artifactId !== entry.sourceId
    || normalizedArtifact.artifactId !== entry.normalizedArtifactRef.id
    || normalizedArtifact.contentHash !== entry.normalizedArtifactRef.contentHash
    || !isPlainObject(normalizedArtifact.parent)
    || normalizedArtifact.parent.sourceAssetId !== provenance.sourceId
    || normalizedArtifact.parent.sourceManifestSha256 !== entry.sourceProvenanceRef.contentHash
    || normalizedArtifact.parent.sourceFileSha256 !== entry.rawAsset.fileSha256
    || normalizedArtifact.parent.sourceFileSha256 !== provenance.rawAsset.fileSha256
    || normalizedArtifact.parent.sourceDecodedPixelSha256 !== entry.rawAsset.decodedPixelSha256
    || normalizedArtifact.parent.sourceDecodedPixelSha256 !== provenance.rawAsset.decodedPixelSha256
    || normalizedArtifact.parent.sourceDecodedPixelSha256 !== entry.rawAsset.sourceDeclarationDecodedPixelSha256
    || normalizedArtifact.parent.sourceDecodedPixelSha256 !== provenance.rawAsset.sourceDeclarationDecodedPixelSha256) {
    reject(code, "export normalized-input/source provenance identity chain differs");
  }
  return true;
}

async function loadManifestEntryMaterial(definitionRoot, entry) {
  const provenance = (await readPinnedRecord(definitionRoot, entry.sourceProvenanceRef, "sourceProvenanceId", "S05_SOURCE_PROVENANCE_INVALID")).record;
  const rawBytes = await readRawAsset(definitionRoot, entry.rawAsset);
  const goldRecord = entry.goldRecordRef === null ? null
    : (await readPinnedRecord(definitionRoot, entry.goldRecordRef, "goldRecordId", "S05_GOLD_RECORD_INVALID")).record;
  const normalizedArtifact = entry.normalizedArtifactRef === null ? null
    : (await readPinnedRecord(definitionRoot, {
        path: entry.normalizedArtifactRef.path,
        id: entry.normalizedArtifactRef.id,
        contentHash: entry.normalizedArtifactRef.contentHash,
        byteLength: entry.normalizedArtifactRef.byteLength,
        fileSha256: entry.normalizedArtifactRef.fileSha256,
      }, "artifactId", "S05_NORMALIZED_INPUT_INVALID")).record;
  validateManifestEntryMaterialBindingSlice05({ entry, provenance, normalizedArtifact });
  return { provenance, rawBytes, goldRecord, normalizedArtifact };
}

function runIdForContext(mode, operation, definitionRef) {
  return `run.${mode}.${operation}.${definitionRef.contentHash.slice(0, 16)}`;
}

function idempotencyKeyForEntry({ mode, operation, manifestRef, entryHash, repetition, attemptNumber }) {
  return `s05.${mode}.${operation}.${manifestRef.contentHash.slice(0, 12)}.${entryHash.slice(0, 12)}.r${repetition}.a${attemptNumber}`;
}

function buildRunRequestForEntry({
  mode,
  operation,
  definitionRef,
  manifest,
  manifestRef,
  entry,
  entryIndex,
  runtimeAttestationRef,
  adapterRef,
  oracleRef,
  repetition,
  attemptNumber,
  createdAt,
}) {
  const entryHash = contentHashSlice05Runner(entry);
  const attempt = {
    runId: runIdForContext(mode, operation, definitionRef),
    sourceId: entry.sourceId,
    partition: entry.partition,
    repetition,
    attemptNumber,
    idempotencyKey: idempotencyKeyForEntry({ mode, operation, manifestRef, entryHash, repetition, attemptNumber }),
  };
  const expectedDisposition = entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject";
  const request = {
    schemaVersion: SLICE05_RUNNER_VERSIONS.request,
    requestId: requestIdSlice05Runner({
      operation, manifestContentHash: manifestRef.contentHash, sourceId: entry.sourceId, repetition, attemptNumber,
    }),
    mode,
    operation,
    definitionRef: structuredClone(definitionRef),
    contractRef: structuredClone(manifest.contractRefs[0]),
    manifestRef: structuredClone(manifestRef),
    manifestEntryRef: { entryIndex, sourceId: entry.sourceId, contentHash: entryHash },
    goldRecordRef: entry.goldRecordRef === null ? null : structuredClone(entry.goldRecordRef),
    runtimeAttestationRef: structuredClone(runtimeAttestationRef),
    adapterRef: structuredClone(adapterRef),
    oracleRef: structuredClone(oracleRef),
    attempt,
    expectedDisposition,
    expectedStableErrorCode: entry.expectedStableErrorCode,
    sourceIdentity: {
      sourceId: entry.sourceId,
      sourceProvenanceRef: structuredClone(entry.sourceProvenanceRef),
      rawAssetRef: structuredClone(entry.rawAsset),
      normalizedArtifactRef: entry.normalizedArtifactRef === null ? null : structuredClone(entry.normalizedArtifactRef),
    },
    createdAt,
    contentHash: "",
  };
  request.contentHash = contentHashSlice05Runner(request);
  validateSlice05RunRequest(request);
  return request;
}

export async function executeRegisteredCasesSlice05({ runner, entries, buildRequest, executeRequest }) {
  if (!runner || typeof runner.runAttempt !== "function" || !Array.isArray(entries)
    || typeof buildRequest !== "function" || typeof executeRequest !== "function") {
    reject("S05_REGISTERED_EXECUTION_INVALID", "registered execution dependencies invalid");
  }
  const sourceIds = new Set();
  const rawResults = [];
  for (const [entryIndex, entry] of entries.entries()) {
    if (!isPlainObject(entry) || typeof entry.sourceId !== "string" || entry.repetitions !== 3 || sourceIds.has(entry.sourceId)) {
      reject("S05_REGISTERED_EXECUTION_INVALID", "registered entries require unique source IDs and exactly three repetitions");
    }
    sourceIds.add(entry.sourceId);
    let replacementConsumed = false;
    for (const repetition of [1, 2, 3]) {
      const initial = await buildRequest({ entry, entryIndex, repetition, attemptNumber: 1 });
      const first = await runner.runAttempt(initial, { execute: ({ request, signal }) => executeRequest({ request, signal, entry, entryIndex }) });
      rawResults.push(first);
      if (first.status === "invalid-no-result" && ALLOWED_NO_RESULT_REASONS.includes(first.reasonCode) && !replacementConsumed) {
        const replacement = await buildRequest({ entry, entryIndex, repetition, attemptNumber: 2 });
        const second = await runner.runAttempt(replacement, { execute: ({ request, signal }) => executeRequest({ request, signal, entry, entryIndex }) });
        rawResults.push(second);
        replacementConsumed = true;
      }
    }
  }
  return frozenClone(rawResults);
}

async function cleanupAttemptStaging(resultsRoot, keyHash) {
  const stage = path.join(resultsRoot, ".staging", keyHash);
  const candidates = [
    path.join(stage, "artifact", "output.png"),
    path.join(stage, "artifact-record", "artifact-record.json"),
    path.join(stage, "oracle", "oracle-result.json"),
    path.join(stage, "result.json"),
  ];
  for (const filename of candidates) {
    try {
      await unlink(filename);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  for (const directory of [path.join(stage, "artifact"), path.join(stage, "artifact-record"), path.join(stage, "oracle"), stage]) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
    }
  }
}

async function cleanupAttemptStagingOrUnknown(resultsRoot, keyHash) {
  try {
    await cleanupAttemptStaging(resultsRoot, keyHash);
    if (await pathExists(path.join(resultsRoot, ".staging", keyHash))) {
      reject("S05_WORKER_RECONCILIATION_UNKNOWN", "attempt staging remained after cleanup");
    }
  } catch (cause) {
    if (cause?.code === "S05_WORKER_RECONCILIATION_UNKNOWN") throw cause;
    reject("S05_WORKER_RECONCILIATION_UNKNOWN", "attempt staging cleanup could not be confirmed", { cause });
  }
}

async function executeActualEntry({
  request,
  signal,
  entry,
  material,
  resultsRoot,
  adapterRef,
  candidateRef,
  runtimeRef,
  hardwareRef,
  expectedRuntime,
  oracleImplementationSha256,
  clock,
}) {
  const keyHash = idempotencyHash(request.attempt.idempotencyKey);
  const stagingDirectory = `.staging/${keyHash}`;
  const artifactStagedPath = `${stagingDirectory}/artifact/output.png`;
  const artifactRecordStagedPath = `${stagingDirectory}/artifact-record/artifact-record.json`;
  const oracleStagedPath = `${stagingDirectory}/oracle/oracle-result.json`;
  const commitOutput = async ({ relativePath, expectedFileSha256, bytes }) => {
    if (relativePath !== artifactRelativePathSlice05(request) || sha256Slice05(bytes) !== expectedFileSha256) {
      reject("S05_STAGING_COMMIT_IDENTITY_INVALID", "adapter commit differs from the attempt-scoped output identity");
    }
    await atomicWrite(path.resolve(resultsRoot, artifactStagedPath), bytes);
    return { status: "committed", relativePath, fileSha256: expectedFileSha256 };
  };
  const adapter = createSlice05SharpAdapter({
    verifyOutput: verifyOutputBytesSlice05,
    commitOutput,
    adapterRef,
    runtimeRef,
    hardwareRef,
    expectedRuntime,
    clock,
  });
  const outputArtifactId = `artifact.${request.mode}.${request.operation}.${sha256Slice05(Buffer.from(request.attempt.sourceId, "utf8")).slice(0, 16)}.r${request.attempt.repetition}.a${request.attempt.attemptNumber}`;
  let adapterResult;
  try {
    if (request.operation === "normalize") {
      adapterResult = await adapter.normalize({
        schemaVersion: SLICE05_SHARP_POLICY.normalizeRequestVersion,
        operation: "normalize",
        outputArtifactId,
        outputRelativePath: artifactRelativePathSlice05(request),
        attempt: request.attempt,
        capabilityContractRef: hashRefFromRecordRef(request.contractRef),
        candidateRef: hashRefFromRecordRef(candidateRef),
        source: {
          sourceAssetId: entry.sourceId,
          sourceFileName: path.basename(entry.rawAsset.path),
          sourceManifestSha256: entry.sourceProvenanceRef.contentHash,
          mime: entry.rawAsset.mime,
          byteLength: entry.rawAsset.byteLength,
          fileSha256: entry.rawAsset.fileSha256,
          decodedPixelSha256: entry.rawAsset.sourceDeclarationDecodedPixelSha256,
          orientation: 1,
          pixelLayout: "RGBA8",
          colorSpace: "embedded-sRGB",
          alphaMode: "straight-unpremultiplied",
          alphaPresent: material.provenance.rawAsset.alphaPresent,
        },
        sourceBytes: material.rawBytes,
      }, { signal });
    } else {
      const decoded = decodeIndependentPngSlice05(material.rawBytes);
      adapterResult = await adapter.exportPng({
        schemaVersion: SLICE05_SHARP_POLICY.exportRequestVersion,
        operation: "export",
        outputArtifactId,
        outputRelativePath: artifactRelativePathSlice05(request),
        attempt: request.attempt,
        capabilityContractRef: hashRefFromRecordRef(request.contractRef),
        candidateRef: hashRefFromRecordRef(candidateRef),
        normalizedArtifact: material.normalizedArtifact,
        normalizedBytes: material.rawBytes,
        rgba: { bytes: decoded.rgba, byteLength: decoded.rgba.byteLength, decodedPixelSha256: decoded.decodedPixelSha256 },
      }, { signal });
    }
    if (request.expectedDisposition === "preflight-reject") {
      await cleanupAttemptStagingOrUnknown(resultsRoot, keyHash);
      return { ...adapterResult, status: "unexpected-success" };
    }
    const validateArtifactRecord = request.operation === "normalize"
      ? validateCandidateNormalizedArtifactSlice05 : validateCandidateDeliveryArtifactSlice05;
    validateArtifactRecord(adapterResult.artifact);
    await atomicWriteJson(path.resolve(resultsRoot, artifactRecordStagedPath), adapterResult.artifact);
    const stagedArtifactBytes = await readFile(path.resolve(resultsRoot, artifactStagedPath));
    const observedAt = clock();
    const oracleResult = request.operation === "normalize"
      ? evaluateNormalizedImageSlice05({
          artifact: adapterResult.artifact,
          actualBytes: stagedArtifactBytes,
          goldRecord: material.goldRecord,
          oracleImplementationSha256,
          observedAt,
        })
      : evaluateDeliveryArtifactSlice05({
          artifact: adapterResult.artifact,
          actualBytes: stagedArtifactBytes,
          goldRecord: material.goldRecord,
          parentNormalizedImage: material.normalizedArtifact,
          oracleImplementationSha256,
          observedAt,
        });
    await atomicWriteJson(path.resolve(resultsRoot, oracleStagedPath), oracleResult);
    if (oracleResult.overallStatus !== "pass") {
      await cleanupAttemptStagingOrUnknown(resultsRoot, keyHash);
      return { ...adapterResult, oracleResult, oracleResultRelativePath: oracleRelativePathSlice05(request) };
    }
    return {
      ...adapterResult,
      oracleResult,
      oracleResultRelativePath: oracleRelativePathSlice05(request),
      publication: { stagingDirectory, artifactStagedPath, artifactRecordStagedPath, oracleStagedPath },
    };
  } catch (error) {
    await cleanupAttemptStagingOrUnknown(resultsRoot, keyHash);
    throw error;
  }
}

async function loadActualDefinitionContext(definitionIndex) {
  const context = await loadDefinitionIndex(definitionIndex);
  await verifyMachineTree(context.index, context.definitionRoot);
  const implementations = await verifyImplementationPins(context.index);
  const runtimeInventory = await verifyFrozenInventoryBeforeSpawn(context.index, context.definitionRoot);
  const candidate = await readPinnedRecord(context.definitionRoot, context.index.candidateRef, "candidateLockId", "S05_CANDIDATE_REF_INVALID");
  const hardware = await readPinnedRecord(context.definitionRoot, context.index.hardwareRef, "hardwareProfileId", "S05_HARDWARE_REF_INVALID");
  const gateBPlan = await readPinnedRecord(context.definitionRoot, context.index.gateBSmokePlanRef, "gateBPlanId", "S05_GATE_B_PLAN_INVALID");
  const contracts = new Map();
  for (const ref of context.index.contractRefs) {
    const loaded = await readPinnedRecord(context.definitionRoot, ref, "contractId", "S05_CONTRACT_REF_INVALID");
    contracts.set(loaded.record.operation, { ...loaded, ref });
  }
  const smokeManifests = new Map();
  for (const scoped of context.index.smokeManifestRefs) {
    if (!isPlainObject(scoped) || !new Set(["normalize", "export"]).has(scoped.operation)) reject("S05_SMOKE_MANIFEST_REF_INVALID", "operation-scoped smoke ref invalid");
    const loaded = await readPinnedRecord(context.definitionRoot, scoped.ref, "manifestId", "S05_SMOKE_MANIFEST_REF_INVALID");
    if (loaded.record.operationScope?.length !== 1 || loaded.record.operationScope[0] !== scoped.operation
      || loaded.record.partition !== "smoke" || loaded.record.manifestKind !== "gate-b-smoke") reject("S05_SMOKE_MANIFEST_REF_INVALID", "smoke manifest scope invalid");
    smokeManifests.set(scoped.operation, { ...loaded, ref: scoped.ref });
  }
  const calibrationManifests = new Map([["normalize", []], ["export", []]]);
  for (const ref of context.index.calibrationManifestRefs) {
    const loaded = await readPinnedRecord(context.definitionRoot, ref, "manifestId", "S05_CALIBRATION_MANIFEST_INVALID");
    const operation = loaded.record.operationScope?.[0];
    if (!calibrationManifests.has(operation) || loaded.record.manifestKind !== "open-calibration") reject("S05_CALIBRATION_MANIFEST_INVALID", "calibration manifest scope invalid");
    calibrationManifests.get(operation).push({ ...loaded, ref });
  }
  const calibrationPreregistrations = new Map();
  for (const ref of context.index.calibrationPreregistrationRefs) {
    const loaded = await readPinnedRecord(context.definitionRoot, ref, "preregistrationId", "S05_CALIBRATION_PREREG_INVALID");
    calibrationPreregistrations.set(loaded.record.operation, { ...loaded, ref });
  }
  const allManifests = [...smokeManifests.values(), ...calibrationManifests.values()].flat();
  const identities = {
    source: new Set(), family: new Set(), session: new Set(), rawHash: new Set(),
  };
  for (const { record: manifest } of allManifests) {
    if (!Array.isArray(manifest.entries) || manifest.entries.length !== manifest.counts.totalSources) reject("S05_SOURCE_ISOLATION_INVALID", "manifest denominator invalid");
    for (const entry of manifest.entries) {
      if (entry.operation !== manifest.operationScope[0] || entry.partition !== manifest.partition
        || entry.sourceId.includes("/") || identities.source.has(entry.sourceId)
        || identities.family.has(entry.sourceFamilyId) || identities.session.has(entry.captureSessionId)
        || identities.rawHash.has(entry.rawAsset.fileSha256)) reject("S05_SOURCE_ISOLATION_INVALID", "global operation/partition/source/family/session/raw identity isolation failed");
      identities.source.add(entry.sourceId);
      identities.family.add(entry.sourceFamilyId);
      identities.session.add(entry.captureSessionId);
      identities.rawHash.add(entry.rawAsset.fileSha256);
    }
  }
  if (identities.source.size !== 108 || smokeManifests.size !== 2
    || [...calibrationManifests.values()].some((items) => items.length !== 2)
    || contracts.size !== 2 || calibrationPreregistrations.size !== 2) {
    reject("S05_DEFINITION_DENOMINATOR_INVALID", "definition does not contain the exact 108-source operation partitions");
  }
  const adapter = implementations.get("candidate-adapter");
  const oracle = implementations.get("independent-oracle");
  if (adapter.implementationSha256 === oracle.implementationSha256) reject("S05_ORACLE_INDEPENDENCE_INVALID", "adapter and oracle implementations are not independent");
  return {
    ...context,
    implementations,
    runtimeInventory,
    candidate: { ...candidate, ref: context.index.candidateRef },
    hardware: { ...hardware, ref: context.index.hardwareRef },
    gateBPlan: { ...gateBPlan, ref: context.index.gateBSmokePlanRef },
    contracts,
    smokeManifests,
    calibrationManifests,
    calibrationPreregistrations,
  };
}

function canonicalResultRecordRef(record, relativePath, idField) {
  const bytes = Buffer.from(stableStringifySlice05Runner(record), "utf8");
  return {
    path: relativePath,
    id: record[idField],
    contentHash: record.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: sha256Slice05(bytes),
  };
}

async function persistResultRecord(resultsRoot, relativePath, record, idField, validate) {
  const filename = path.resolve(resultsRoot, relativePath);
  const prefix = `${resultsRoot}${path.sep}`;
  if (!filename.startsWith(prefix)) reject("S05_RESULT_RECORD_PATH_INVALID", "result record escapes resultsRoot");
  if (await pathExists(filename)) {
    const existing = await readJson(filename, "S05_RESULT_RECORD_CORRUPT");
    validate(existing);
    return { record: frozenClone(existing), ref: canonicalResultRecordRef(existing, relativePath, idField), existing: true };
  }
  validate(record);
  await atomicWriteJson(filename, record);
  return { record: frozenClone(record), ref: canonicalResultRecordRef(record, relativePath, idField), existing: false };
}

async function readResultRecordByRef(resultsRoot, ref, idField, validate) {
  assertRecordRef(ref, "S05_RESULT_RECORD_CORRUPT", "resultRef");
  const filename = path.resolve(resultsRoot, ref.path);
  if (!filename.startsWith(`${resultsRoot}${path.sep}`)) reject("S05_RESULT_RECORD_CORRUPT", "result ref escapes root");
  const bytes = await readFile(filename);
  if (bytes.byteLength !== ref.byteLength || sha256Slice05(bytes) !== ref.fileSha256) reject("S05_RESULT_RECORD_CORRUPT", "result ref file identity mismatch");
  const record = JSON.parse(bytes.toString("utf8"));
  validate(record);
  if (record[idField] !== ref.id || record.contentHash !== ref.contentHash) reject("S05_RESULT_RECORD_CORRUPT", "result ref record identity mismatch");
  return record;
}

async function listRegularFiles(root, base = "") {
  const directory = path.join(root, base);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const output = [];
  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    const filename = path.join(directory, entry.name);
    const stats = await lstat(filename);
    if (stats.isSymbolicLink()) reject("S05_RESULT_LINK_FORBIDDEN", `result link forbidden: ${relative}`);
    if (stats.isDirectory()) output.push(...await listRegularFiles(root, relative));
    else if (stats.isFile()) output.push(relative);
    else reject("S05_RESULT_ENTRY_FORBIDDEN", `non-file result entry: ${relative}`);
  }
  return output.sort();
}

async function cleanupQuiescentRunnerRoots(resultsRoot) {
  for (const name of [".staging", "source-locks"]) {
    try {
      await rmdir(path.join(resultsRoot, name));
    } catch (cause) {
      if (cause?.code === "ENOENT") continue;
      reject("S05_QUIESCENT_CLEANUP_FAILED", `nonempty or unremovable transient runner root: ${name}`, { cause });
    }
  }
}

async function verifyTerminalOutputClosure(resultsRoot, results) {
  const expectedArtifacts = new Set();
  const expectedArtifactRecords = new Set();
  const expectedOracles = new Set();
  const issues = [];
  const ledgerEvents = await readAndVerifyLedger(path.join(resultsRoot, "ledger", "events.ndjson"));
  for (const event of ledgerEvents.filter(({ eventType }) => eventType === "publication-reconciliation-unknown")) {
    issues.push({
      code: "UNRESOLVED_PUBLICATION_RECONCILIATION",
      location: event.publication.transactionId,
      message: "publication reconciliation remains unknown and cannot enter a summary or Gate B decision",
    });
  }
  for (const result of results) {
    validateSlice05RunResult(result);
    if (result.status !== "pass" || result.expectedDisposition !== "applicable") continue;
    if (expectedArtifacts.has(result.artifactRef.relativePath) || expectedArtifactRecords.has(result.artifactRef.recordRelativePath)
      || expectedOracles.has(result.oracleResultRef.relativePath)) {
      issues.push({ code: "DUPLICATE_OUTPUT_PATH", location: result.resultId, message: "two terminal results share one output path" });
      continue;
    }
    expectedArtifacts.add(result.artifactRef.relativePath);
    expectedArtifactRecords.add(result.artifactRef.recordRelativePath);
    expectedOracles.add(result.oracleResultRef.relativePath);
    try {
      const artifact = await fileIdentity(path.resolve(resultsRoot, result.artifactRef.relativePath), "S05_OUTPUT_CLOSURE_INVALID");
      if (artifact.byteLength !== result.artifactRef.byteLength || artifact.fileSha256 !== result.artifactRef.fileSha256) throw new Error("artifact identity mismatch");
      const artifactRecordIdentity = await fileIdentity(path.resolve(resultsRoot, result.artifactRef.recordRelativePath), "S05_OUTPUT_CLOSURE_INVALID");
      if (artifactRecordIdentity.byteLength !== result.artifactRef.recordByteLength
        || artifactRecordIdentity.fileSha256 !== result.artifactRef.recordFileSha256) throw new Error("artifact record file identity mismatch");
      const artifactRecord = JSON.parse(artifactRecordIdentity.bytes.toString("utf8"));
      const validateArtifactRecord = result.operation === "normalize"
        ? validateCandidateNormalizedArtifactSlice05 : validateCandidateDeliveryArtifactSlice05;
      validateArtifactRecord(artifactRecord);
      if (artifactRecord.schemaVersion !== result.artifactRef.schemaVersion || artifactRecord.artifactId !== result.artifactRef.id
        || artifactRecord.contentHash !== result.artifactRef.contentHash || artifactRecord.bytes.relativePath !== result.artifactRef.relativePath
        || artifactRecord.bytes.byteLength !== result.artifactRef.byteLength || artifactRecord.bytes.fileSha256 !== result.artifactRef.fileSha256
        || artifactRecord.bytes.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256) throw new Error("artifact record chain mismatch");
      const decoded = decodeIndependentPngSlice05(artifact.bytes);
      const decodedFacts = {
        mime: decoded.mime,
        byteLength: decoded.byteLength,
        fileSha256: decoded.fileSha256,
        decodedPixelSha256: decoded.decodedPixelSha256,
        width: decoded.width,
        height: decoded.height,
        pixelLayout: decoded.pixelLayout,
        colorSpace: decoded.colorSpace,
        orientation: decoded.orientation,
        alphaMode: decoded.alphaMode,
        alphaPresent: decoded.alphaPresent,
        metadataPolicy: decoded.metadataPolicy,
        pngFilterPolicy: decoded.filter0Only ? "filter-0-only" : "noncanonical-filter-present",
        interlace: decoded.interlace,
        animation: decoded.animation,
      };
      const artifactFacts = { ...artifactRecord.bytes, ...artifactRecord.image };
      delete artifactFacts.relativePath;
      if (!decoded.filter0Only || stableStringifySlice05Runner(decodedFacts) !== stableStringifySlice05Runner(artifactFacts)) {
        throw new Error("independent reopened PNG facts differ from the artifact record");
      }
      const oracle = await readJson(path.resolve(resultsRoot, result.oracleResultRef.relativePath), "S05_OUTPUT_CLOSURE_INVALID");
      validateOracleResultSlice05(oracle);
      if (oracle.oracleResultId !== result.oracleResultRef.id || oracle.contentHash !== result.oracleResultRef.contentHash
        || oracle.contentHash !== contentHashSlice05Runner(oracle) || oracle.artifactRef?.id !== artifactRecord.artifactId
        || oracle.artifactRef?.contentHash !== artifactRecord.contentHash
        || oracle.actualBytes?.relativePath !== result.artifactRef.relativePath
        || stableStringifySlice05Runner(oracle.facts) !== stableStringifySlice05Runner(decodedFacts)
        || oracle.overallStatus !== "pass") throw new Error("oracle identity/facts mismatch");
    } catch (error) {
      issues.push({ code: "OUTPUT_IDENTITY_MISMATCH", location: result.resultId, message: error.message });
    }
  }
  const actualArtifacts = await listRegularFiles(resultsRoot, "artifacts");
  const actualArtifactRecords = await listRegularFiles(resultsRoot, "artifact-records");
  const actualOracles = await listRegularFiles(resultsRoot, "oracle");
  for (const extra of actualArtifacts.filter((relative) => !expectedArtifacts.has(relative))) {
    issues.push({ code: "UNREFERENCED_ARTIFACT", location: extra, message: "canonical artifact is not referenced by one applicable pass" });
  }
  for (const extra of actualArtifactRecords.filter((relative) => !expectedArtifactRecords.has(relative))) {
    issues.push({ code: "UNREFERENCED_ARTIFACT_RECORD", location: extra, message: "canonical artifact record is not referenced by one applicable pass" });
  }
  for (const extra of actualOracles.filter((relative) => !expectedOracles.has(relative))) {
    issues.push({ code: "UNREFERENCED_ORACLE", location: extra, message: "canonical oracle is not referenced by one applicable pass" });
  }
  return { pass: issues.length === 0, issues };
}

/** Explicit read-only closure hook for fake filesystem tests; actual CLI calls the internal verifier directly. */
export async function verifyTerminalOutputClosureSlice05ForTest({ resultsRoot }) {
  if (typeof resultsRoot !== "string") reject("S05_TEST_RESULTS_ROOT_REQUIRED", "test closure requires an explicit temporary root");
  const root = path.resolve(resultsRoot);
  await cleanupQuiescentRunnerRoots(root);
  return frozenClone(await verifyTerminalOutputClosure(root, await readResults(root)));
}

async function runActualFaultSuite({ resultsRoot, definitionRef, runtimeAttestationRef, clock }) {
  const relativePath = "fault/fault-semantics-result.slice05.v0.json";
  const filename = path.resolve(resultsRoot, relativePath);
  if (await pathExists(filename)) {
    const record = validateSlice05FaultResult(await readJson(filename, "S05_FAULT_RESULT_INVALID"));
    if (record.faultResultId !== `fault-result.${definitionRef.contentHash.slice(0, 16)}`
      || stableStringifySlice05Runner(record.definitionRef) !== stableStringifySlice05Runner(definitionRef)
      || stableStringifySlice05Runner(record.runtimeAttestationRef) !== stableStringifySlice05Runner(runtimeAttestationRef)) {
      reject("S05_FAULT_RESULT_INVALID", "existing fault result binding differs from the current frozen definition/runtime");
    }
    return { record, ref: canonicalResultRecordRef(record, relativePath, "faultResultId") };
  }
  const scenarioResults = [];
  scenarioResults.push(await runFaultWorkerScenarioSlice05({ mode: "timeout-hang", attemptId: "fault.timeout", timeoutMs: 50 }));
  scenarioResults.push(await runFaultWorkerScenarioSlice05({ mode: "cancel-hang", attemptId: "fault.cancel", timeoutMs: 250, cancelAfterMs: 25 }));
  scenarioResults.push(await runFaultWorkerScenarioSlice05({ mode: "exit-before-result", attemptId: "fault.exit", timeoutMs: 250 }));
  scenarioResults.push(await runFaultWorkerScenarioSlice05({ mode: "malformed-result", attemptId: "fault.malformed", timeoutMs: 250 }));
  scenarioResults.push(await runFaultWorkerScenarioSlice05({ mode: "reported-reconciliation-unknown", attemptId: "fault.unknown", timeoutMs: 250 }));
  const probe = path.join(resultsRoot, ".fault-probe", "atomic.bin");
  try {
    await atomicWrite(probe, Buffer.from("fault-probe", "utf8"));
    try {
      await atomicWrite(probe, Buffer.from("conflict", "utf8"));
      scenarioResults.push({ mode: "atomic-commit-conflict", status: "false-allow", exitConfirmed: null });
    } catch (error) {
      scenarioResults.push({
        mode: "atomic-commit-conflict",
        status: error?.code === "S05_ATOMIC_TARGET_EXISTS" ? "atomic-conflict-rejected" : "unexpected-error",
        exitConfirmed: null,
      });
    }
  } finally {
    try { await unlink(probe); } catch {}
    try { await rmdir(path.dirname(probe)); } catch {}
  }
  const record = buildSlice05FaultResult({ definitionRef, runtimeAttestationRef, scenarioResults, observedAt: clock() });
  return persistResultRecord(resultsRoot, relativePath, record, "faultResultId", validateSlice05FaultResult);
}

export async function runFaultWorkerScenarioSlice05({
  mode,
  attemptId,
  timeoutMs = 100,
  cancelAfterMs = null,
  forkImpl = fork,
  workerPath = FAULT_WORKER_PATH,
}) {
  if (!new Set(["timeout-hang", "cancel-hang", "exit-before-result", "malformed-result", "reported-reconciliation-unknown"]).has(mode)) {
    reject("S05_FAULT_SCENARIO_INVALID", "fault mode is invalid");
  }
  return new Promise((resolve) => {
    const child = forkImpl(workerPath, [], { serialization: "advanced", stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true });
    let settled = false;
    let terminationKind = null;
    const finish = (record) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (cancelTimer) clearTimeout(cancelTimer);
      resolve(record);
    };
    const terminate = (kind) => {
      if (settled || terminationKind) return;
      terminationKind = kind;
      let requested = false;
      try {
        requested = child.kill("SIGKILL");
      } catch {}
      if (!requested) finish({ mode, status: "unknown-reconciliation", exitConfirmed: false });
    };
    const timeout = setTimeout(() => terminate("timeout"), timeoutMs);
    const cancelTimer = cancelAfterMs === null ? null : setTimeout(() => terminate("cancelled"), cancelAfterMs);
    child.once("exit", () => {
      if (terminationKind) finish({ mode, status: terminationKind, exitConfirmed: true });
      else finish({ mode, status: "runner-crash-before-result", exitConfirmed: true });
    });
    child.once("error", () => finish({ mode, status: "unknown-reconciliation", exitConfirmed: false }));
    child.once("message", (message) => {
      if (message?.code === "S05_FAULT_RECONCILIATION_UNKNOWN") {
        finish({ mode, status: "unknown-reconciliation", exitConfirmed: false });
      } else {
        finish({ mode, status: "malformed-result-rejected", exitConfirmed: null });
      }
      if (!child.killed) child.kill("SIGKILL");
    });
    child.send({ protocolVersion: "fault-worker.slice05.v0", attemptId, mode });
  });
}

function parseCli(argv) {
  const parsed = { mode: null, operation: null, definitionIndex: DEFAULT_DEFINITION_INDEX, resultsRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--smoke") {
      if (parsed.mode !== null) reject("S05_CLI_ARGUMENT_INVALID", "exactly one execution mode may be selected");
      parsed.mode = "smoke";
    } else if (value === "--calibration") {
      if (parsed.mode !== null) reject("S05_CLI_ARGUMENT_INVALID", "exactly one execution mode may be selected");
      const operation = argv[++index];
      if (!new Set(["normalize", "export"]).has(operation)) reject("S05_CLI_ARGUMENT_INVALID", "--calibration requires normalize or export");
      parsed.mode = "calibration";
      parsed.operation = operation;
    } else if (value === "--definition-index") {
      const filename = argv[++index];
      if (!filename) reject("S05_CLI_ARGUMENT_INVALID", "--definition-index requires a path");
      parsed.definitionIndex = path.resolve(filename);
    } else if (value === "--results-root") {
      const directory = argv[++index];
      if (!directory) reject("S05_CLI_ARGUMENT_INVALID", "--results-root requires a path");
      parsed.resultsRoot = path.resolve(directory);
    }
    else reject("S05_CLI_ARGUMENT_INVALID", `unknown argument: ${value}`);
  }
  if (parsed.mode === null) reject("S05_CLI_MODE_REQUIRED", "explicit --smoke or --calibration normalize|export is required");
  if (parsed.resultsRoot === null) parsed.resultsRoot = parsed.mode === "smoke"
    ? DEFAULT_RESULTS_ROOT : path.join(DEFAULT_CALIBRATION_RESULTS_ROOT, parsed.operation);
  return parsed;
}

function registeredSmokeCases(manifest) {
  return manifest.entries.map(({ sourceId, partition, expectedDisposition, repetitions }) => ({
    sourceId,
    partition,
    expectedDisposition: expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
    repetitions,
  }));
}

async function executeActualManifest({ mode, operation, manifestBundle, context, runner, resultsRoot, clock }) {
  const materials = [];
  for (const entry of manifestBundle.record.entries) materials.push(await loadManifestEntryMaterial(context.definitionRoot, entry));
  const adapterRef = implementationRefForAdapter(context.implementations.get("candidate-adapter"));
  const oracleRef = implementationRefForAdapter(context.implementations.get("independent-oracle"));
  const runtimeRef = hashRefFromRecordRef(context.index.runtimeAttestationRef);
  const hardwareRef = hashRefFromRecordRef(context.hardware.ref);
  const expectedRuntime = expectedWorkerRuntimeFromFrozen(context.runtimeInventory.frozen);
  return executeRegisteredCasesSlice05({
    runner,
    entries: manifestBundle.record.entries,
    buildRequest: async ({ entry, entryIndex, repetition, attemptNumber }) => buildRunRequestForEntry({
      mode,
      operation,
      definitionRef: context.definitionRef,
      manifest: manifestBundle.record,
      manifestRef: manifestBundle.ref,
      entry,
      entryIndex,
      runtimeAttestationRef: context.index.runtimeAttestationRef,
      adapterRef,
      oracleRef,
      repetition,
      attemptNumber,
      createdAt: clock(),
    }),
    executeRequest: ({ request, signal, entry, entryIndex }) => executeActualEntry({
      request,
      signal,
      entry,
      material: materials[entryIndex],
      resultsRoot,
      adapterRef,
      candidateRef: manifestBundle.record.candidateRef,
      runtimeRef,
      hardwareRef,
      expectedRuntime,
      oracleImplementationSha256: oracleRef.implementationSha256,
      clock,
    }),
  });
}

async function inventoryEndState(context) {
  try {
    const end = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
    const exact = stableStringifySlice05Runner(end) === context.runtimeInventory.actualCanonical
      && end.attestation.payloadSha256 === context.index.runtimeAttestationRef.inventoryPayloadSha256;
    return { exact, end, issue: exact ? null : { code: "RUNTIME_END_DRIFT", location: "runtime", message: "end inventory differs byte-for-byte from start/frozen attestation" } };
  } catch (error) {
    return { exact: false, end: null, issue: { code: "RUNTIME_END_INVENTORY_FAILED", location: "runtime", message: error.message } };
  }
}

async function loadOrBuildSmokeAudit({ context, operation, manifestBundle, resultsRoot, runtimeEnd, closure, clock }) {
  const relativePath = `audit/${operation}.smoke-session-audit.slice05.v0.json`;
  const filename = path.resolve(resultsRoot, relativePath);
  const existing = await pathExists(filename)
    ? validateSlice05SessionAudit(await readJson(filename, "S05_SESSION_AUDIT_INVALID")) : null;
  const issues = [...closure.issues];
  if (runtimeEnd.issue) issues.push(runtimeEnd.issue);
  const record = buildSlice05SessionAudit({
    operation,
    definitionRef: context.definitionRef,
    gateBPlanRef: context.gateBPlan.ref,
    manifestRef: manifestBundle.ref,
    runtimeAttestationRef: context.index.runtimeAttestationRef,
    checks: {
      definitionIntegrity: true,
      runtimeIntegrityAtStart: true,
      runtimeIntegrityAtEnd: runtimeEnd.exact,
      runtimeStableStartToEnd: runtimeEnd.exact,
      implementationIntegrity: true,
      sourceIsolation: true,
      oracleIndependence: true,
      atomicCommitIntegrity: closure.pass,
    },
    issues,
    auditedAt: existing?.auditedAt ?? clock(),
  });
  if (existing !== null) {
    if (stableStringifySlice05Runner(existing) !== stableStringifySlice05Runner(record)) {
      reject("S05_STALE_RESULT_EVIDENCE", `existing ${operation} smoke audit differs from recomputed session evidence`);
    }
    return { record: frozenClone(existing), ref: canonicalResultRecordRef(existing, relativePath, "auditId") };
  }
  return persistResultRecord(resultsRoot, relativePath, record, "auditId", validateSlice05SessionAudit);
}

export async function runSlice05SmokeCli({
  definitionIndex = DEFAULT_DEFINITION_INDEX,
  resultsRoot = DEFAULT_RESULTS_ROOT,
  clock = () => new Date().toISOString(),
} = {}) {
  const root = normalizeResultsRoot(resultsRoot, { mode: "smoke" });
  if (root !== DEFAULT_RESULTS_ROOT) reject("S05_RESULTS_ROOT_FORBIDDEN", "smoke CLI requires the exact canonical open-smoke root");
  const context = await loadActualDefinitionContext(path.resolve(definitionIndex));
  const runner = createSlice05OpenRunner({ resultsRoot: root, clock, mode: "smoke" });
  await runner.reconcilePublications();
  for (const operation of ["normalize", "export"]) {
    await executeActualManifest({ mode: "smoke", operation, manifestBundle: context.smokeManifests.get(operation), context, runner, resultsRoot: root, clock });
  }
  const fault = await runActualFaultSuite({
    resultsRoot: root,
    definitionRef: context.definitionRef,
    runtimeAttestationRef: context.index.runtimeAttestationRef,
    clock,
  });
  const runtimeEnd = await inventoryEndState(context);
  const terminalResults = await readResults(root);
  await cleanupQuiescentRunnerRoots(root);
  const closure = await verifyTerminalOutputClosure(root, terminalResults);
  const decisions = [];
  for (const operation of ["normalize", "export"]) {
    const manifestBundle = context.smokeManifests.get(operation);
    const audit = await loadOrBuildSmokeAudit({ context, operation, manifestBundle, resultsRoot: root, runtimeEnd, closure, clock });
    const operationResults = terminalResults.filter((result) => result.mode === "smoke" && result.operation === operation);
    const startedAt = operationResults.map(({ startedAt }) => startedAt).sort()[0] ?? clock();
    const finishedAt = operationResults.map(({ finishedAt }) => finishedAt).sort().at(-1) ?? startedAt;
    const summaryRelative = `summaries/${operation}.smoke-summary.slice05.v0.json`;
    let summaryBundle;
    if (await pathExists(path.resolve(root, summaryRelative))) {
      const existing = validateSmokeSummarySlice05(await readJson(path.resolve(root, summaryRelative), "S05_SMOKE_SUMMARY_INVALID"));
      const recomputed = validateSmokeSummarySlice05(buildOperationSmokeSummarySlice05({
        operation,
        definitionRef: context.definitionRef,
        manifestRef: manifestBundle.ref,
        runtimeAttestationRef: context.index.runtimeAttestationRef,
        sessionAudit: audit.record,
        sessionAuditRef: audit.ref,
        faultSemantics: fault.record,
        faultSemanticsRef: fault.ref,
        registeredCases: registeredSmokeCases(manifestBundle.record),
        terminalResults,
        startedAt: existing.startedAt,
        finishedAt: existing.finishedAt,
      }));
      if (stableStringifySlice05Runner(existing) !== stableStringifySlice05Runner(recomputed)) {
        reject("S05_STALE_RESULT_EVIDENCE", `existing ${operation} smoke summary differs from the current terminal set`);
      }
      summaryBundle = { record: frozenClone(existing), ref: canonicalResultRecordRef(existing, summaryRelative, "summaryId") };
    } else {
      const record = validateSmokeSummarySlice05(buildOperationSmokeSummarySlice05({
        operation,
        definitionRef: context.definitionRef,
        manifestRef: manifestBundle.ref,
        runtimeAttestationRef: context.index.runtimeAttestationRef,
        sessionAudit: audit.record,
        sessionAuditRef: audit.ref,
        faultSemantics: fault.record,
        faultSemanticsRef: fault.ref,
        registeredCases: registeredSmokeCases(manifestBundle.record),
        terminalResults,
        startedAt,
        finishedAt,
      }));
      summaryBundle = await persistResultRecord(root, summaryRelative, record, "summaryId", validateSmokeSummarySlice05);
    }
    const decisionRelative = `decisions/${operation}.gate-b-decision.slice05.v0.json`;
    let decisionBundle;
    if (await pathExists(path.resolve(root, decisionRelative))) {
      const existing = validateGateBDecisionSlice05(await readJson(path.resolve(root, decisionRelative), "S05_GATE_B_DECISION_INVALID"));
      const recomputed = buildGateBDecisionSlice05({
        summary: summaryBundle.record,
        summaryRef: summaryBundle.ref,
        gateBPlan: context.gateBPlan.record,
        gateBPlanRef: context.gateBPlan.ref,
        sessionAudit: audit.record,
        faultSemantics: fault.record,
        decidedAt: existing.decidedAt,
      });
      if (stableStringifySlice05Runner(existing) !== stableStringifySlice05Runner(recomputed)) {
        reject("S05_STALE_RESULT_EVIDENCE", `existing ${operation} Gate B decision differs from the frozen plan/current evidence`);
      }
      decisionBundle = { record: frozenClone(existing), ref: canonicalResultRecordRef(existing, decisionRelative, "decisionId") };
    } else {
      const record = buildGateBDecisionSlice05({
        summary: summaryBundle.record,
        summaryRef: summaryBundle.ref,
        gateBPlan: context.gateBPlan.record,
        gateBPlanRef: context.gateBPlan.ref,
        sessionAudit: audit.record,
        faultSemantics: fault.record,
        decidedAt: clock(),
      });
      decisionBundle = await persistResultRecord(root, decisionRelative, record, "decisionId", validateGateBDecisionSlice05);
    }
    decisions.push(decisionBundle.record);
  }
  const allPass = decisions.every(({ decision }) => decision === "calibration-ready");
  return frozenClone({
    mode: "smoke",
    status: allPass ? "all-pass" : "non-pass",
    resultsRoot: root,
    operations: decisions.map(({ operation, decision, contentHash }) => ({ operation, decision, contentHash })),
    productSupport: false,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
}

export function assertCalibrationGateDecisionSlice05({ operation, definitionRef, gateBPlanRef, decision }) {
  const code = "S05_CALIBRATION_GATE_B_DENIED";
  if (!new Set(["normalize", "export"]).has(operation)) reject(code, "calibration operation is invalid");
  try {
    validateGateBDecisionSlice05(decision);
  } catch (cause) {
    reject(code, "matching Gate B decision is invalid", { cause });
  }
  if (decision.operation !== operation || decision.decision !== "calibration-ready" || decision.calibrationAuthorized !== true
    || stableStringifySlice05Runner(decision.definitionRef) !== stableStringifySlice05Runner(definitionRef)
    || stableStringifySlice05Runner(decision.gateBPlanRef) !== stableStringifySlice05Runner(gateBPlanRef)) {
    reject(code, "matching operation Gate B is denied, missing, or bound to different frozen evidence");
  }
  return decision;
}

async function loadVerifiedSmokeGateBForCalibration(context, operation) {
  const code = "S05_CALIBRATION_GATE_B_DENIED";
  try {
    const decisionRelative = `decisions/${operation}.gate-b-decision.slice05.v0.json`;
    const decision = validateGateBDecisionSlice05(await readJson(path.resolve(DEFAULT_RESULTS_ROOT, decisionRelative), code));
    assertCalibrationGateDecisionSlice05({
      operation, definitionRef: context.definitionRef, gateBPlanRef: context.gateBPlan.ref, decision,
    });
    const decisionRef = canonicalResultRecordRef(decision, decisionRelative, "decisionId");
    const summary = await readResultRecordByRef(DEFAULT_RESULTS_ROOT, decision.smokeSummaryRef, "summaryId", validateSmokeSummarySlice05);
    const audit = await readResultRecordByRef(DEFAULT_RESULTS_ROOT, summary.sessionAuditRef, "auditId", validateSlice05SessionAudit);
    const fault = await readResultRecordByRef(DEFAULT_RESULTS_ROOT, summary.faultSemanticsRef, "faultResultId", validateSlice05FaultResult);
    const terminalResults = await readResults(DEFAULT_RESULTS_ROOT);
    const closure = await verifyTerminalOutputClosure(DEFAULT_RESULTS_ROOT, terminalResults);
    if (!closure.pass) reject(code, "smoke output closure no longer matches its Gate B evidence");
    const manifestBundle = context.smokeManifests.get(operation);
    const recomputedSummary = buildOperationSmokeSummarySlice05({
      operation,
      definitionRef: context.definitionRef,
      manifestRef: manifestBundle.ref,
      runtimeAttestationRef: context.index.runtimeAttestationRef,
      sessionAudit: audit,
      sessionAuditRef: summary.sessionAuditRef,
      faultSemantics: fault,
      faultSemanticsRef: summary.faultSemanticsRef,
      registeredCases: registeredSmokeCases(manifestBundle.record),
      terminalResults,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    });
    if (stableStringifySlice05Runner(summary) !== stableStringifySlice05Runner(recomputedSummary)) {
      reject(code, "smoke summary is stale relative to the immutable terminal set");
    }
    const recomputedDecision = buildGateBDecisionSlice05({
      summary,
      summaryRef: decision.smokeSummaryRef,
      gateBPlan: context.gateBPlan.record,
      gateBPlanRef: context.gateBPlan.ref,
      sessionAudit: audit,
      faultSemantics: fault,
      decidedAt: decision.decidedAt,
    });
    if (stableStringifySlice05Runner(decision) !== stableStringifySlice05Runner(recomputedDecision)) {
      reject(code, "Gate B decision is stale relative to the frozen plan and current smoke evidence");
    }
    return { decision: frozenClone(decision), decisionRef, summary, audit, fault };
  } catch (cause) {
    if (cause?.code === code) throw cause;
    reject(code, "matching operation Gate B evidence could not be independently reopened", { cause });
  }
}

function orderedCalibrationManifestBundles(context, operation) {
  return [...context.calibrationManifests.get(operation)]
    .sort((left, right) => compareText(left.record.partition, right.record.partition));
}

function registeredCalibrationCases(manifestBundles) {
  return manifestBundles.flatMap((bundle) => bundle.record.entries.map(({ sourceId, partition, expectedDisposition, repetitions }) => ({
    sourceId,
    partition,
    expectedDisposition: expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
    repetitions,
    manifestContentHash: bundle.ref.contentHash,
  })));
}

export async function runSlice05CalibrationCli({
  operation,
  definitionIndex = DEFAULT_DEFINITION_INDEX,
  resultsRoot = operation ? path.join(DEFAULT_CALIBRATION_RESULTS_ROOT, operation) : DEFAULT_CALIBRATION_RESULTS_ROOT,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!new Set(["normalize", "export"]).has(operation)) {
    reject("S05_CLI_ARGUMENT_INVALID", "--calibration requires exactly one operation: normalize or export");
  }
  const expectedRoot = path.join(DEFAULT_CALIBRATION_RESULTS_ROOT, operation);
  const root = normalizeResultsRoot(resultsRoot, { mode: "calibration" });
  if (root !== expectedRoot) reject("S05_RESULTS_ROOT_FORBIDDEN", "calibration CLI requires the exact operation-specific canonical results root");

  // Gate admission and its full evidence are reopened before the runner/root can be created or any worker can spawn.
  const context = await loadActualDefinitionContext(path.resolve(definitionIndex));
  const gate = await loadVerifiedSmokeGateBForCalibration(context, operation);
  const manifestBundles = orderedCalibrationManifestBundles(context, operation);
  const preregistrationBundle = context.calibrationPreregistrations.get(operation);
  const admissionRelative = "admission/calibration-admission.slice05.v0.json";
  const admissionFilename = path.resolve(root, admissionRelative);
  const existingAdmission = await pathExists(admissionFilename)
    ? validateCalibrationAdmissionSlice05(await readJson(admissionFilename, "S05_CALIBRATION_ADMISSION_INVALID")) : null;
  const runtimeStartObservation = buildRuntimeInventoryObservationSlice05({
    inventory: context.runtimeInventory.actual,
    frozenRuntimeAttestation: context.runtimeInventory.frozen,
    expectedInventoryPayloadSha256: context.index.runtimeAttestationRef.inventoryPayloadSha256,
    observedAt: existingAdmission?.runtimeStartObservation.observedAt ?? clock(),
    stableWithStart: true,
  });
  const proposedAdmission = buildCalibrationAdmissionSlice05({
    operation,
    definitionRef: context.definitionRef,
    gateBPlanRef: context.gateBPlan.ref,
    gateBDecision: gate.decision,
    gateBDecisionRef: gate.decisionRef,
    calibrationPreregistration: preregistrationBundle.record,
    calibrationPreregistrationRef: preregistrationBundle.ref,
    manifests: manifestBundles.map(({ record }) => record),
    manifestRefs: manifestBundles.map(({ ref }) => ref),
    runtimeStartObservation,
    admittedAt: existingAdmission?.admittedAt ?? clock(),
  });
  if (existingAdmission !== null && stableStringifySlice05Runner(existingAdmission) !== stableStringifySlice05Runner(proposedAdmission)) {
    reject("S05_STALE_RESULT_EVIDENCE", "existing calibration admission differs from the matching frozen Gate B/preregistration");
  }
  const admission = existingAdmission === null
    ? await persistResultRecord(root, admissionRelative, proposedAdmission, "admissionId", validateCalibrationAdmissionSlice05)
    : { record: frozenClone(existingAdmission), ref: canonicalResultRecordRef(existingAdmission, admissionRelative, "admissionId") };

  const runner = createSlice05OpenRunner({ resultsRoot: root, clock, mode: "calibration" });
  await runner.reconcilePublications();
  for (const manifestBundle of manifestBundles) {
    await executeActualManifest({ mode: "calibration", operation, manifestBundle, context, runner, resultsRoot: root, clock });
  }
  const runtimeEnd = await inventoryEndState(context);
  const terminalResults = await readResults(root);
  await cleanupQuiescentRunnerRoots(root);
  const closure = await verifyTerminalOutputClosure(root, terminalResults);
  const operationResults = terminalResults.filter((result) => result.mode === "calibration" && result.operation === operation);
  const summaryRelative = "summaries/calibration-summary.slice05.v0.json";
  const summaryFilename = path.resolve(root, summaryRelative);
  const existingSummary = await pathExists(summaryFilename)
    ? validateCalibrationSummarySlice05(await readJson(summaryFilename, "S05_CALIBRATION_SUMMARY_INVALID")) : null;
  const runtimeEndObservation = buildRuntimeInventoryObservationSlice05({
    inventory: runtimeEnd.end,
    frozenRuntimeAttestation: context.runtimeInventory.frozen,
    expectedInventoryPayloadSha256: context.index.runtimeAttestationRef.inventoryPayloadSha256,
    observedAt: existingSummary?.runtimeEndObservation.observedAt ?? clock(),
    stableWithStart: runtimeEnd.exact,
    issue: runtimeEnd.issue,
  });
  const startedAt = existingSummary?.startedAt ?? operationResults.map(({ startedAt: value }) => value).sort(compareText)[0] ?? clock();
  const finishedAt = existingSummary?.finishedAt ?? operationResults.map(({ finishedAt: value }) => value).sort(compareText).at(-1) ?? startedAt;
  const proposedSummary = buildCalibrationSummarySlice05({
    operation,
    definitionRef: context.definitionRef,
    gateBDecision: gate.decision,
    gateBDecisionRef: gate.decisionRef,
    admission: admission.record,
    admissionRef: admission.ref,
    manifestRefs: manifestBundles.map(({ ref }) => ref),
    registeredCases: registeredCalibrationCases(manifestBundles),
    terminalResults,
    runtimeAttestationRef: context.index.runtimeAttestationRef,
    runtimeStartObservation: admission.record.runtimeStartObservation,
    runtimeEndObservation,
    outputClosurePass: closure.pass,
    startedAt,
    finishedAt,
  });
  if (existingSummary !== null && stableStringifySlice05Runner(existingSummary) !== stableStringifySlice05Runner(proposedSummary)) {
    reject("S05_STALE_RESULT_EVIDENCE", "existing calibration summary differs from the current immutable terminal set/runtime closure");
  }
  const summary = existingSummary === null
    ? await persistResultRecord(root, summaryRelative, proposedSummary, "summaryId", validateCalibrationSummarySlice05)
    : { record: frozenClone(existingSummary), ref: canonicalResultRecordRef(existingSummary, summaryRelative, "summaryId") };
  return frozenClone({
    mode: "calibration",
    operation,
    status: summary.record.overallStatus,
    resultsRoot: root,
    admissionContentHash: admission.record.contentHash,
    summaryContentHash: summary.record.contentHash,
    productSupport: false,
    evidenceBoundary: structuredClone(EVIDENCE_BOUNDARY),
  });
}

async function main() {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = options.mode === "smoke"
      ? await runSlice05SmokeCli(options)
      : await runSlice05CalibrationCli(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === "all-pass" ? 0 : 2;
  } catch (error) {
    const code = error?.code ?? "S05_RUNNER_UNEXPECTED";
    process.stderr.write(`${JSON.stringify({ code, message: error?.message ?? String(error) })}\n`);
    process.exitCode = code === "S05_CALIBRATION_GATE_B_DENIED" ? 3 : 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
