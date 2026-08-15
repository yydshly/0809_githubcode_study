import { createHash } from "node:crypto";

export const SLICE09_CASE_CONTEXT_VERSION = "gateb-case-context.slice09.v0";
export const SLICE09_TYPED_PROTOCOL_ID = "GATEB-TYPED-CASE-CONTEXT@0.9.0";

const HEX = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/u;
const SAFE_PATH = /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._@/:-]{1,500}$/u;
const OPERATIONS = new Set(["normalize", "export"]);
const EXPECTED_REJECTION_CODES = Object.freeze({
  normalize: new Set([
    "S09_INPUT_CRC_MISMATCH",
    "S09_INPUT_SRGB_REQUIRED",
    "S09_NORMALIZE_SOURCE_DECLARATION_INVALID",
  ]),
  export: new Set(["S09_EXPORT_NORMALIZED_ARTIFACT_INVALID"]),
});

export class Slice09CaseContextError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "Slice09CaseContextError";
    this.code = code;
    this.workerObservation = null;
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalBytes(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function selfHash(record) { const { contentHash: _ignored, ...payload } = record; return sha256(canonicalBytes(payload)); }

function fail(message, code = "S09_CASE_CONTEXT_INVALID") { throw new Slice09CaseContextError(code, message); }

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a closed object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has missing or additional fields`);
  }
}

function validateId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value) || value.includes("..")) fail(`${label} is invalid`);
}

function validateRef(ref, label) {
  exactKeys(ref, ["path", "id", "contentHash", "byteLength", "fileSha256"], label);
  validateId(ref.id, `${label}.id`);
  if (typeof ref.path !== "string" || !SAFE_PATH.test(ref.path) || ref.path.startsWith("/") || /^[A-Za-z]:/u.test(ref.path)
    || !HEX.test(ref.contentHash) || !HEX.test(ref.fileSha256)
    || !Number.isInteger(ref.byteLength) || ref.byteLength < 2) fail(`${label} is not an immutable relative reference`);
}

function validateImplementationRef(ref, label) {
  exactKeys(ref, ["id", "implementationSha256"], label);
  validateId(ref.id, `${label}.id`);
  if (!HEX.test(ref.implementationSha256)) fail(`${label}.implementationSha256 is invalid`);
}

function validateCase(caseRecord, operation) {
  exactKeys(caseRecord, [
    "sourceId", "sourceRef", "disposition", "expectedStableErrorCode",
    "goldIdentityRef", "workerRequestRef",
  ], "case");
  validateId(caseRecord.sourceId, "case.sourceId");
  validateRef(caseRecord.sourceRef, "case.sourceRef");
  validateRef(caseRecord.workerRequestRef, "case.workerRequestRef");
  if (caseRecord.sourceRef.id !== caseRecord.sourceId) fail("source reference does not bind sourceId");
  if (caseRecord.disposition === "applicable") {
    if (caseRecord.expectedStableErrorCode !== null || caseRecord.goldIdentityRef === null) {
      fail("applicable case requires one gold identity and no error code");
    }
    validateRef(caseRecord.goldIdentityRef, "case.goldIdentityRef");
  } else if (caseRecord.disposition === "rejection") {
    if (!EXPECTED_REJECTION_CODES[operation].has(caseRecord.expectedStableErrorCode)
      || caseRecord.goldIdentityRef !== null) fail("rejection case must bind one exact code and no gold identity");
  } else fail("case disposition is invalid");
}

export function validateSlice09CaseContext(context) {
  exactKeys(context, [
    "schemaVersion", "contextId", "operation", "sourceId", "sourceRef", "manifestRef",
    "disposition", "expectedStableErrorCode", "goldIdentityRef", "workerRequestRef",
    "attempt", "candidateRef", "contractRef", "runtimeRef", "workerRef", "contentHash",
  ], "caseContext");
  if (context.schemaVersion !== SLICE09_CASE_CONTEXT_VERSION || !OPERATIONS.has(context.operation)) {
    fail("case context version or operation is invalid");
  }
  validateId(context.contextId, "contextId");
  validateId(context.sourceId, "sourceId");
  for (const [key, value] of [["sourceRef", context.sourceRef], ["manifestRef", context.manifestRef],
    ["workerRequestRef", context.workerRequestRef], ["candidateRef", context.candidateRef],
    ["contractRef", context.contractRef], ["runtimeRef", context.runtimeRef]]) validateRef(value, key);
  validateImplementationRef(context.workerRef, "workerRef");
  exactKeys(context.attempt, ["attemptId", "repetition", "idempotencyKey"], "attempt");
  validateId(context.attempt.attemptId, "attempt.attemptId");
  if (!Number.isInteger(context.attempt.repetition) || context.attempt.repetition < 1 || context.attempt.repetition > 3
    || !HEX.test(context.attempt.idempotencyKey)) fail("attempt identity is invalid");
  validateCase({
    sourceId: context.sourceId, sourceRef: context.sourceRef, disposition: context.disposition,
    expectedStableErrorCode: context.expectedStableErrorCode, goldIdentityRef: context.goldIdentityRef,
    workerRequestRef: context.workerRequestRef,
  }, context.operation);
  const contractId = context.operation === "normalize"
    ? "CC-CAP02-NORMALIZE-PNG@0.9.0" : "CC-CAP02-EXPORT-PNG@0.9.0";
  if (context.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.9.0"
    || context.contractRef.id !== contractId || !context.sourceId.startsWith(`s09.${context.operation}.`)) {
    fail("candidate, contract, source and operation bindings differ");
  }
  if (context.goldIdentityRef !== null) validateRef(context.goldIdentityRef, "goldIdentityRef");
  const attemptId = `s09.${context.operation}.${context.sourceId}.r${context.attempt.repetition}`;
  if (context.contextId !== `context.${attemptId}` || context.attempt.attemptId !== attemptId) {
    fail("context and attempt IDs do not derive from operation/source/repetition");
  }
  const idempotencyKey = sha256(canonicalBytes({
    operation: context.operation, sourceId: context.sourceId, repetition: context.attempt.repetition,
    manifestContentHash: context.manifestRef.contentHash,
    goldIdentityContentHash: context.goldIdentityRef?.contentHash ?? null,
  }));
  if (context.attempt.idempotencyKey !== idempotencyKey || context.contentHash !== selfHash(context)) {
    fail("case context hash binding is invalid", "S09_CASE_CONTEXT_HASH_MISMATCH");
  }
  return true;
}

export function createSlice09CaseContext({ operation, caseRecord, manifestRef, repetition, candidateRef, contractRef, runtimeRef, workerRef } = {}) {
  if (!OPERATIONS.has(operation)) fail("operation is invalid");
  validateCase(caseRecord, operation);
  validateRef(manifestRef, "manifestRef");
  for (const [key, value] of [["candidateRef", candidateRef], ["contractRef", contractRef], ["runtimeRef", runtimeRef]]) {
    validateRef(value, key);
  }
  validateImplementationRef(workerRef, "workerRef");
  if (!Number.isInteger(repetition) || repetition < 1 || repetition > 3) fail("repetition is invalid");
  const attemptId = `s09.${operation}.${caseRecord.sourceId}.r${repetition}`;
  const payload = {
    schemaVersion: SLICE09_CASE_CONTEXT_VERSION, contextId: `context.${attemptId}`, operation,
    sourceId: caseRecord.sourceId, sourceRef: structuredClone(caseRecord.sourceRef),
    manifestRef: structuredClone(manifestRef), disposition: caseRecord.disposition,
    expectedStableErrorCode: caseRecord.expectedStableErrorCode,
    goldIdentityRef: structuredClone(caseRecord.goldIdentityRef), workerRequestRef: structuredClone(caseRecord.workerRequestRef),
    attempt: {
      attemptId, repetition,
      idempotencyKey: sha256(canonicalBytes({
        operation, sourceId: caseRecord.sourceId, repetition, manifestContentHash: manifestRef.contentHash,
        goldIdentityContentHash: caseRecord.goldIdentityRef?.contentHash ?? null,
      })),
    },
    candidateRef: structuredClone(candidateRef), contractRef: structuredClone(contractRef),
    runtimeRef: structuredClone(runtimeRef), workerRef: structuredClone(workerRef),
  };
  const context = Object.freeze({ ...payload, contentHash: sha256(canonicalBytes(payload)) });
  validateSlice09CaseContext(context);
  return context;
}

export function createSlice09TypedDriver({ executeApplicable, executeRejection } = {}) {
  if (typeof executeApplicable !== "function" || typeof executeRejection !== "function") {
    fail("both typed driver branches are required", "S09_DRIVER_INPUT_INVALID");
  }
  return async function executeTypedCase(input) {
    exactKeys(input, ["caseContext"], "runner callback input");
    validateSlice09CaseContext(input.caseContext);
    const context = structuredClone(input.caseContext);
    return context.disposition === "rejection" ? executeRejection(context) : executeApplicable(context);
  };
}

export async function runSlice09TypedOperation({ operation, cases, manifestRef, candidateRef, contractRef, runtimeRef, workerRef, executeCase } = {}) {
  if (!OPERATIONS.has(operation) || !Array.isArray(cases) || cases.length !== 6 || typeof executeCase !== "function") {
    fail("operation requires six cases and one typed executor", "S09_DENOMINATOR_INVALID");
  }
  const sourceIds = new Set();
  const counts = { applicable: 0, rejection: 0 };
  for (const caseRecord of cases) {
    validateCase(caseRecord, operation);
    if (sourceIds.has(caseRecord.sourceId)) fail("source IDs must be unique", "S09_DENOMINATOR_INVALID");
    sourceIds.add(caseRecord.sourceId);
    counts[caseRecord.disposition] += 1;
  }
  if (counts.applicable !== 3 || counts.rejection !== 3) {
    fail("operation requires three applicable and three rejection sources", "S09_DENOMINATOR_INVALID");
  }
  const results = [];
  for (const caseRecord of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const caseContext = createSlice09CaseContext({ operation, caseRecord, manifestRef, repetition, candidateRef, contractRef, runtimeRef, workerRef });
      let value = null;
      let error = null;
      try { value = await executeCase(Object.freeze({ caseContext })); } catch (cause) { error = cause; }
      if (caseContext.disposition === "rejection") {
        results.push(Object.freeze({
          attemptId: caseContext.attempt.attemptId, disposition: "rejection",
          status: error?.code === caseContext.expectedStableErrorCode && error?.workerObservation == null ? "pass" : "non-pass",
          actualCode: typeof error?.code === "string" ? error.code : null,
          workerInvoked: error?.workerObservation != null, caseContextHash: caseContext.contentHash,
        }));
      } else {
        results.push(Object.freeze({
          attemptId: caseContext.attempt.attemptId, disposition: "applicable",
          status: error == null && value?.status === "pass" && value?.workerObservation?.exitConfirmed === true ? "pass" : "non-pass",
          actualCode: typeof error?.code === "string" ? error.code : null,
          workerInvoked: value?.workerObservation != null || error?.workerObservation != null,
          caseContextHash: caseContext.contentHash,
        }));
      }
    }
  }
  return Object.freeze({ operation, plannedSources: 6, plannedAttempts: 18, replacementCount: 0, results: Object.freeze(results) });
}

const recordRefSchema = Object.freeze({
  type: "object", additionalProperties: false,
  required: ["path", "id", "contentHash", "byteLength", "fileSha256"],
  properties: {
    path: { type: "string", pattern: SAFE_PATH.source }, id: { type: "string", pattern: SAFE_ID.source },
    contentHash: { type: "string", pattern: HEX.source }, byteLength: { type: "integer", minimum: 2 },
    fileSha256: { type: "string", pattern: HEX.source },
  },
});

export const SLICE09_CASE_CONTEXT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://single-image-studio.invalid/research/slice-09/schemas/gateb-case-context.slice09.v0.schema.json",
  type: "object", additionalProperties: false,
  required: [
    "schemaVersion", "contextId", "operation", "sourceId", "sourceRef", "manifestRef",
    "disposition", "expectedStableErrorCode", "goldIdentityRef", "workerRequestRef",
    "attempt", "candidateRef", "contractRef", "runtimeRef", "workerRef", "contentHash",
  ],
  properties: {
    schemaVersion: { const: SLICE09_CASE_CONTEXT_VERSION },
    contextId: { type: "string", pattern: "^context\\.s09\\.(normalize|export)\\.[A-Za-z0-9._:@-]+\\.r[1-3]$" },
    operation: { enum: ["normalize", "export"] },
    sourceId: { type: "string", pattern: "^s09\\.(normalize|export)\\.[A-Za-z0-9._:@-]+$" },
    sourceRef: recordRefSchema, manifestRef: recordRefSchema,
    disposition: { enum: ["applicable", "rejection"] },
    expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S09_[A-Z0-9_]+$" }] },
    goldIdentityRef: { oneOf: [{ type: "null" }, recordRefSchema] },
    workerRequestRef: recordRefSchema,
    attempt: {
      type: "object", additionalProperties: false, required: ["attemptId", "repetition", "idempotencyKey"],
      properties: {
        attemptId: { type: "string", pattern: "^s09\\.(normalize|export)\\.[A-Za-z0-9._:@-]+\\.r[1-3]$" },
        repetition: { type: "integer", minimum: 1, maximum: 3 }, idempotencyKey: { type: "string", pattern: HEX.source },
      },
    },
    candidateRef: recordRefSchema, contractRef: recordRefSchema, runtimeRef: recordRefSchema,
    workerRef: {
      type: "object", additionalProperties: false, required: ["id", "implementationSha256"],
      properties: { id: { type: "string", pattern: SAFE_ID.source }, implementationSha256: { type: "string", pattern: HEX.source } },
    },
    contentHash: { type: "string", pattern: HEX.source },
  },
});
