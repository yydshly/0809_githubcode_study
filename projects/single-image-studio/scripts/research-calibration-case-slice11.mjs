import { SLICE07_GATEB_POLICY } from "./research-gateb-adapter-slice07.mjs";
import { Slice11GateBError } from "./research-gateb-adapter-slice11.mjs";

export class Slice11CalibrationCaseError extends Error {
  constructor(code, message, { cause, workerLifecycle = null, expectedProjection = null } = {}) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "Slice11CalibrationCaseError";
    this.code = code;
    this.workerLifecycle = workerLifecycle;
    this.expectedProjection = expectedProjection;
  }
}

function fail(code, message, options) { throw new Slice11CalibrationCaseError(code, message, options); }
function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
const preflightLifecycle = Object.freeze({
  stage: "preflight-not-started", workerInvoked: false, workerExitConfirmed: null,
  ipcMessageReceived: false, exitCode: null, signal: null, timedOut: false, cancelled: false, observationSha256: null,
});

function validateRequestBinding(request, material) {
  if (!plain(request) || !plain(request.attempt) || request.attempt.attemptNumber !== 1
    || ![1, 2, 3].includes(request.attempt.repetition)
    || request.attempt.sourceId !== material.sourceId || request.operation !== material.operation
    || request.attempt.partition !== material.partition || request.disposition !== material.disposition
    || request.expectedStableErrorCode !== material.expectedStableErrorCode) {
    fail("S11_CASE_REQUEST_BINDING_INVALID", "request does not bind the frozen case material", { workerLifecycle: preflightLifecycle });
  }
}

function workerRequest(request, material) {
  if (!plain(material.workerInput)) fail("S11_CASE_MATERIAL_INVALID", "applicable case requires a closed worker input", { workerLifecycle: preflightLifecycle });
  if (request.operation === "normalize" && material.workerInput.inputBytes instanceof Uint8Array
    && Object.keys(material.workerInput).length === 1) {
    return { protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: request.requestId, operation: "normalize", inputBytes: Buffer.from(material.workerInput.inputBytes) };
  }
  if (request.operation === "export" && material.workerInput.rgba instanceof Uint8Array
    && Number.isInteger(material.workerInput.width) && Number.isInteger(material.workerInput.height)
    && Object.keys(material.workerInput).length === 3) {
    return { protocolVersion: SLICE07_GATEB_POLICY.protocolVersion, attemptId: request.requestId, operation: "export", rgba: Buffer.from(material.workerInput.rgba), width: material.workerInput.width, height: material.workerInput.height };
  }
  fail("S11_CASE_MATERIAL_INVALID", "worker input differs from the operation profile", { workerLifecycle: preflightLifecycle });
}

export function createSlice11CalibrationAttemptExecutor({ casesBySourceId, rawExecutor, classifyRejection } = {}) {
  if (!(casesBySourceId instanceof Map) || !rawExecutor || typeof rawExecutor.execute !== "function" || typeof classifyRejection !== "function") {
    fail("S11_CASE_EXECUTOR_INPUT_INVALID", "case map, raw executor and rejection classifier are required", { workerLifecycle: preflightLifecycle });
  }
  return async ({ request } = {}) => {
    const material = casesBySourceId.get(request?.attempt?.sourceId);
    if (!material) fail("S11_CASE_REQUEST_BINDING_INVALID", "source is outside the frozen case map", { workerLifecycle: preflightLifecycle });
    validateRequestBinding(request, material);
    if (request.disposition === "rejection") {
      const code = classifyRejection({ request, material });
      if (code !== request.expectedStableErrorCode || typeof code !== "string" || !/^S11_[A-Z0-9_]+$/u.test(code)) {
        fail("S11_PREFLIGHT_CLASSIFICATION_INVALID", "rejection classifier did not return the frozen exact code", { workerLifecycle: preflightLifecycle });
      }
      return Object.freeze({ kind: "rejection-pass", actualStableErrorCode: code, workerLifecycle: preflightLifecycle, expectedProjection: null });
    }
    if (!plain(material.goldExpected)) fail("S11_CASE_GOLD_INVALID", "applicable case requires complete gold expected", { workerLifecycle: preflightLifecycle });
    try {
      const candidate = await rawExecutor.execute({
        attemptId: request.requestId,
        operation: request.operation,
        workerRequest: workerRequest(request, material),
        goldExpected: material.goldExpected,
      });
      if (!plain(candidate) || !(candidate.outputBytes instanceof Uint8Array)
        || !plain(candidate.expectedProjection) || !plain(candidate.workerLifecycle)) {
        fail("S11_EXECUTION_PROTOCOL_INVALID", "raw executor returned an incomplete candidate closure", { workerLifecycle: candidate?.workerLifecycle ?? null, expectedProjection: candidate?.expectedProjection ?? null });
      }
      return Object.freeze({
        kind: "applicable-pass", outputBytes: Buffer.from(candidate.outputBytes), oracleFacts: candidate.oracleFacts,
        expectedProjection: candidate.expectedProjection, workerLifecycle: candidate.workerLifecycle,
      });
    } catch (error) {
      if (error instanceof Slice11CalibrationCaseError) throw error;
      if (error instanceof Slice11GateBError) {
        throw new Slice11CalibrationCaseError(error.code, "versioned candidate execution failed", {
          cause: error, workerLifecycle: error.workerLifecycle, expectedProjection: error.expectedProjection,
        });
      }
      throw new Slice11CalibrationCaseError("S11_EXECUTION_UNCLASSIFIED_FAILURE", "candidate execution failed without a versioned lifecycle", { cause: error, workerLifecycle: null });
    }
  };
}

export { preflightLifecycle as SLICE11_PREFLIGHT_LIFECYCLE };
