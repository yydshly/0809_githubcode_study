import { createHash } from "node:crypto";

export const SLICE08_CASE_CONTEXT_VERSION = "gateb-case-context.slice08.v0";
export const SLICE08_TYPED_PROTOCOL_ID = "GATEB-TYPED-CASE-CONTEXT@0.8.0";

const HEX = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/u;
const SAFE_PATH = /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._@/:-]{1,500}$/u;
const OPERATIONS = new Set(["normalize", "export"]);
const EXPECTED_REJECTION_CODES = Object.freeze({
  normalize: new Set([
    "S08_INPUT_CRC_MISMATCH",
    "S08_INPUT_SRGB_REQUIRED",
    "S08_NORMALIZE_SOURCE_DECLARATION_INVALID",
  ]),
  export: new Set(["S08_EXPORT_NORMALIZED_ARTIFACT_INVALID"]),
});

export class Slice08CaseContextError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "Slice08CaseContextError";
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

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8");
}

export function sha256Slice08(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashRecord(record) {
  const { contentHash: _ignored, ...payload } = record;
  return sha256Slice08(canonicalBytes(payload));
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label} must be a closed object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label} has missing or additional fields`);
  }
}

function validateId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value) || value.includes("..")) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label} is outside the closed identifier profile`);
  }
}

function validateRef(ref, label) {
  exactKeys(ref, ["path", "id", "contentHash", "byteLength", "fileSha256"], label);
  validateId(ref.id, `${label}.id`);
  if (typeof ref.path !== "string" || !SAFE_PATH.test(ref.path) || ref.path.startsWith("/") || /^[A-Za-z]:/u.test(ref.path)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label}.path is not a safe relative path`);
  }
  if (!HEX.test(ref.contentHash) || !HEX.test(ref.fileSha256)
    || !Number.isInteger(ref.byteLength) || ref.byteLength < 2) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label} is not an exact immutable reference`);
  }
}

function validateImplementationRef(ref, label) {
  exactKeys(ref, ["id", "implementationSha256"], label);
  validateId(ref.id, `${label}.id`);
  if (!HEX.test(ref.implementationSha256)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", `${label}.implementationSha256 is invalid`);
  }
}

function validateCase(caseRecord, operation) {
  exactKeys(caseRecord, [
    "sourceId", "sourceRef", "disposition", "expectedStableErrorCode",
    "expectedFactsRef", "goldRef", "workerRequestRef",
  ], "case");
  validateId(caseRecord.sourceId, "case.sourceId");
  validateRef(caseRecord.sourceRef, "case.sourceRef");
  validateRef(caseRecord.workerRequestRef, "case.workerRequestRef");
  if (caseRecord.sourceRef.id !== caseRecord.sourceId) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "source ref does not bind the source ID");
  }
  if (caseRecord.disposition === "applicable") {
    if (caseRecord.expectedStableErrorCode !== null || caseRecord.expectedFactsRef === null || caseRecord.goldRef === null) {
      throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "applicable case requires expected facts and gold, and no error code");
    }
    validateRef(caseRecord.expectedFactsRef, "case.expectedFactsRef");
    validateRef(caseRecord.goldRef, "case.goldRef");
  } else if (caseRecord.disposition === "rejection") {
    if (!EXPECTED_REJECTION_CODES[operation].has(caseRecord.expectedStableErrorCode)
      || caseRecord.expectedFactsRef !== null || caseRecord.goldRef !== null) {
      throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "rejection case must bind one exact operation code and no applicable-only refs");
    }
  } else {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "case disposition is invalid");
  }
}

export function validateSlice08CaseContext(context) {
  exactKeys(context, [
    "schemaVersion", "contextId", "operation", "sourceId", "sourceRef", "manifestRef",
    "disposition", "expectedStableErrorCode", "expectedFactsRef", "goldRef", "workerRequestRef",
    "attempt", "candidateRef", "contractRef", "runtimeRef", "workerRef", "contentHash",
  ], "caseContext");
  if (context.schemaVersion !== SLICE08_CASE_CONTEXT_VERSION || !OPERATIONS.has(context.operation)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "case context version or operation is invalid");
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
    || !HEX.test(context.attempt.idempotencyKey)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "attempt identity is invalid");
  }
  const caseRecord = {
    sourceId: context.sourceId,
    sourceRef: context.sourceRef,
    disposition: context.disposition,
    expectedStableErrorCode: context.expectedStableErrorCode,
    expectedFactsRef: context.expectedFactsRef,
    goldRef: context.goldRef,
    workerRequestRef: context.workerRequestRef,
  };
  validateCase(caseRecord, context.operation);
  const expectedContractId = context.operation === "normalize"
    ? "CC-CAP02-NORMALIZE-PNG@0.8.0"
    : "CC-CAP02-EXPORT-PNG@0.8.0";
  if (context.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.8.0"
    || context.contractRef.id !== expectedContractId
    || !context.sourceId.startsWith(`s08.${context.operation}.`)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "candidate, contract, source and operation bindings differ");
  }
  if (context.expectedFactsRef !== null) validateRef(context.expectedFactsRef, "expectedFactsRef");
  if (context.goldRef !== null) validateRef(context.goldRef, "goldRef");
  const expectedAttemptId = `s08.${context.operation}.${context.sourceId}.r${context.attempt.repetition}`;
  if (context.contextId !== `context.${expectedAttemptId}` || context.attempt.attemptId !== expectedAttemptId) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "context and attempt IDs do not derive from operation/source/repetition");
  }
  const expectedIdempotency = sha256Slice08(canonicalBytes({
    operation: context.operation,
    sourceId: context.sourceId,
    repetition: context.attempt.repetition,
    manifestContentHash: context.manifestRef.contentHash,
  }));
  if (context.attempt.idempotencyKey !== expectedIdempotency || context.contentHash !== hashRecord(context)) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_HASH_MISMATCH", "case context hash binding is invalid");
  }
  return true;
}

export function createSlice08CaseContext({ operation, caseRecord, manifestRef, repetition, candidateRef, contractRef, runtimeRef, workerRef } = {}) {
  if (!OPERATIONS.has(operation)) throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "operation is invalid");
  validateCase(caseRecord, operation);
  validateRef(manifestRef, "manifestRef");
  for (const [key, value] of [["candidateRef", candidateRef], ["contractRef", contractRef], ["runtimeRef", runtimeRef]]) validateRef(value, key);
  validateImplementationRef(workerRef, "workerRef");
  if (!Number.isInteger(repetition) || repetition < 1 || repetition > 3) {
    throw new Slice08CaseContextError("S08_CASE_CONTEXT_INVALID", "repetition is invalid");
  }
  const attemptId = `s08.${operation}.${caseRecord.sourceId}.r${repetition}`;
  const payload = {
    schemaVersion: SLICE08_CASE_CONTEXT_VERSION,
    contextId: `context.${attemptId}`,
    operation,
    sourceId: caseRecord.sourceId,
    sourceRef: structuredClone(caseRecord.sourceRef),
    manifestRef: structuredClone(manifestRef),
    disposition: caseRecord.disposition,
    expectedStableErrorCode: caseRecord.expectedStableErrorCode,
    expectedFactsRef: structuredClone(caseRecord.expectedFactsRef),
    goldRef: structuredClone(caseRecord.goldRef),
    workerRequestRef: structuredClone(caseRecord.workerRequestRef),
    attempt: {
      attemptId,
      repetition,
      idempotencyKey: sha256Slice08(canonicalBytes({ operation, sourceId: caseRecord.sourceId, repetition, manifestContentHash: manifestRef.contentHash })),
    },
    candidateRef: structuredClone(candidateRef),
    contractRef: structuredClone(contractRef),
    runtimeRef: structuredClone(runtimeRef),
    workerRef: structuredClone(workerRef),
  };
  const context = Object.freeze({ ...payload, contentHash: sha256Slice08(canonicalBytes(payload)) });
  validateSlice08CaseContext(context);
  return context;
}

export function createSlice08TypedDriver({ executeApplicable, executeRejection } = {}) {
  if (typeof executeApplicable !== "function" || typeof executeRejection !== "function") {
    throw new Slice08CaseContextError("S08_DRIVER_INPUT_INVALID", "both typed driver branches are required");
  }
  return async function executeTypedCase(input) {
    exactKeys(input, ["caseContext"], "runner callback input");
    validateSlice08CaseContext(input.caseContext);
    const context = structuredClone(input.caseContext);
    if (context.disposition === "rejection") return executeRejection(context);
    return executeApplicable(context);
  };
}

export async function runSlice08TypedOperation({ operation, cases, manifestRef, candidateRef, contractRef, runtimeRef, workerRef, executeCase } = {}) {
  if (!OPERATIONS.has(operation) || !Array.isArray(cases) || cases.length !== 6 || typeof executeCase !== "function") {
    throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "operation requires six cases and one typed executor");
  }
  const sourceIds = new Set();
  let applicable = 0;
  let rejection = 0;
  for (const caseRecord of cases) {
    validateCase(caseRecord, operation);
    if (sourceIds.has(caseRecord.sourceId)) throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "source IDs must be unique");
    sourceIds.add(caseRecord.sourceId);
    applicable += caseRecord.disposition === "applicable" ? 1 : 0;
    rejection += caseRecord.disposition === "rejection" ? 1 : 0;
  }
  if (applicable !== 3 || rejection !== 3) throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "operation requires three applicable and three rejection sources");
  const results = [];
  for (const caseRecord of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const caseContext = createSlice08CaseContext({ operation, caseRecord, manifestRef, repetition, candidateRef, contractRef, runtimeRef, workerRef });
      let value = null;
      let error = null;
      try { value = await executeCase(Object.freeze({ caseContext })); } catch (cause) { error = cause; }
      if (caseContext.disposition === "rejection") {
        results.push(Object.freeze({
          attemptId: caseContext.attempt.attemptId,
          disposition: "rejection",
          status: error?.code === caseContext.expectedStableErrorCode && error?.workerObservation == null ? "pass" : "non-pass",
          actualCode: typeof error?.code === "string" ? error.code : null,
          workerInvoked: error?.workerObservation != null,
          caseContextHash: caseContext.contentHash,
        }));
      } else {
        results.push(Object.freeze({
          attemptId: caseContext.attempt.attemptId,
          disposition: "applicable",
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

export const SLICE08_CASE_CONTEXT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://single-image-studio.invalid/research/slice-08/schemas/gateb-case-context.slice08.v0.schema.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion", "contextId", "operation", "sourceId", "sourceRef", "manifestRef",
    "disposition", "expectedStableErrorCode", "expectedFactsRef", "goldRef", "workerRequestRef",
    "attempt", "candidateRef", "contractRef", "runtimeRef", "workerRef", "contentHash",
  ],
  properties: {
    schemaVersion: { const: SLICE08_CASE_CONTEXT_VERSION },
    contextId: { type: "string", pattern: "^context\\.s08\\.(normalize|export)\\.[A-Za-z0-9._:@-]+\\.r[1-3]$" },
    operation: { enum: ["normalize", "export"] },
    sourceId: { type: "string", pattern: "^s08\\.(normalize|export)\\.[A-Za-z0-9._:@-]+$" },
    sourceRef: {
      type: "object", additionalProperties: false,
      required: ["path", "id", "contentHash", "byteLength", "fileSha256"],
      properties: {
        path: { type: "string", pattern: "^[A-Za-z0-9._@/:-]{1,500}$" }, id: { type: "string", pattern: SAFE_ID.source },
        contentHash: { type: "string", pattern: HEX.source }, byteLength: { type: "integer", minimum: 2 },
        fileSha256: { type: "string", pattern: HEX.source },
      },
    },
    manifestRef: { $ref: "#/$defs/recordRef" },
    disposition: { enum: ["applicable", "rejection"] },
    expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S08_[A-Z0-9_]+$" }] },
    expectedFactsRef: { oneOf: [{ type: "null" }, { $ref: "#/$defs/recordRef" }] },
    goldRef: { oneOf: [{ type: "null" }, { $ref: "#/$defs/recordRef" }] },
    workerRequestRef: { $ref: "#/$defs/recordRef" },
    attempt: {
      type: "object", additionalProperties: false, required: ["attemptId", "repetition", "idempotencyKey"],
      properties: {
        attemptId: { type: "string", pattern: "^s08\\.(normalize|export)\\.[A-Za-z0-9._:@-]+\\.r[1-3]$" },
        repetition: { type: "integer", minimum: 1, maximum: 3 }, idempotencyKey: { type: "string", pattern: HEX.source },
      },
    },
    candidateRef: { $ref: "#/$defs/recordRef" }, contractRef: { $ref: "#/$defs/recordRef" },
    runtimeRef: { $ref: "#/$defs/recordRef" },
    workerRef: {
      type: "object", additionalProperties: false, required: ["id", "implementationSha256"],
      properties: { id: { type: "string", pattern: SAFE_ID.source }, implementationSha256: { type: "string", pattern: HEX.source } },
    },
    contentHash: { type: "string", pattern: HEX.source },
  },
  $defs: {
    recordRef: {
      type: "object", additionalProperties: false,
      required: ["path", "id", "contentHash", "byteLength", "fileSha256"],
      properties: {
        path: { type: "string", pattern: "^[A-Za-z0-9._@/:-]{1,500}$" }, id: { type: "string", pattern: SAFE_ID.source },
        contentHash: { type: "string", pattern: HEX.source }, byteLength: { type: "integer", minimum: 2 },
        fileSha256: { type: "string", pattern: HEX.source },
      },
    },
  },
});
