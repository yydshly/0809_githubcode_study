import {
  SLICE11_EXPECTED_PROJECTION_ID,
  sha256Slice11,
  stableStringifySlice11,
  validateExpectedProjectionSlice11,
} from "./research-expected-projection-slice11.mjs";
import {
  createSlice11WorkerLifecycle,
} from "./research-calibration-lifecycle-slice11.mjs";
import {
  buildSlice11CalibrationSummary,
  contentRefSlice11,
  createSlice11CalibrationRequest,
  createSlice11CalibrationTerminal,
  createSlice11LedgerEvent,
  validateSlice11Ledger,
  validateSlice11RecordRef,
} from "./research-calibration-protocol-slice11.mjs";

export const SLICE11_CALIBRATION_RUNNER_ID = "RUNNER-OPEN-CALIBRATION@0.11.0";

export class Slice11CalibrationRunnerError extends Error {
  constructor(code, message, options = {}) {
    super(`${code}: ${message}`, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "Slice11CalibrationRunnerError";
    this.code = code;
    this.partial = options.partial ?? null;
  }
}

function fail(code, message, options) { throw new Slice11CalibrationRunnerError(code, message, options); }
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
function instant(now) {
  const value = now();
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail("S11_RUNNER_TIME_INVALID", "clock must return exact millisecond UTC");
  }
  return value;
}
function payloadHash(value) {
  return sha256Slice11(Buffer.from(`${stableStringifySlice11(value)}\n`, "utf8"));
}

function validateHooks(hooks) {
  if (!plain(hooks) || Object.keys(hooks).some((key) => !["afterAttempt", "beforeAttempt"].includes(key))
    || [hooks.beforeAttempt, hooks.afterAttempt].some((value) => value !== undefined && typeof value !== "function")) {
    fail("S11_RUNNER_HOOKS_INVALID", "runner hooks must be a closed pair of optional functions");
  }
}

function validateCases(operation, cases) {
  const code = "S11_RUNNER_DENOMINATOR_INVALID";
  if (!["normalize", "export"].includes(operation) || !Array.isArray(cases) || cases.length !== 48) {
    fail(code, "one operation requires exactly 48 cases");
  }
  const ids = new Set();
  const partitions = { "dev/calibration": 0, "defect/calibration": 0 };
  const dispositions = { applicable: 0, rejection: 0 };
  for (const item of cases) {
    exact(item, ["disposition", "expectedStableErrorCode", "goldIdentityRef", "manifestRef", "partition", "sourceRef"], code, "case");
    validateSlice11RecordRef(item.sourceRef, code, "sourceRef");
    validateSlice11RecordRef(item.manifestRef, code, "manifestRef");
    if (ids.has(item.sourceRef.id) || !Object.hasOwn(partitions, item.partition) || !Object.hasOwn(dispositions, item.disposition)) {
      fail(code, "case identity/profile invalid");
    }
    ids.add(item.sourceRef.id);
    partitions[item.partition] += 1;
    dispositions[item.disposition] += 1;
    if (item.disposition === "applicable") {
      validateSlice11RecordRef(item.goldIdentityRef, code, "goldIdentityRef");
      if (item.expectedStableErrorCode !== null) fail(code, "applicable case cannot expect an error");
    } else if (item.goldIdentityRef !== null || typeof item.expectedStableErrorCode !== "string"
      || !/^S11_[A-Z0-9_]+$/u.test(item.expectedStableErrorCode)) {
      fail(code, "rejection case requires an exact S11 code and no gold");
    }
  }
  if (partitions["dev/calibration"] !== 30 || partitions["defect/calibration"] !== 18
    || dispositions.applicable !== 24 || dispositions.rejection !== 24) {
    fail(code, "strata must remain 30+18 and 24+24");
  }
}

function validateRefs(operation, refs) {
  const code = "S11_RUNNER_REFS_INVALID";
  exact(refs, ["candidateRef", "contractRef", "runtimeRef", "workerRef"], code, "refs");
  for (const key of ["candidateRef", "contractRef", "runtimeRef"]) validateSlice11RecordRef(refs[key], code, key);
  exact(refs.workerRef, ["id", "implementationSha256", "path", "version"], code, "workerRef");
  if (refs.candidateRef.id !== "REG-NORM-SHARP-CANONICAL-PNG@0.11.0"
    || refs.contractRef.id !== `CC-CAP02-${operation.toUpperCase()}-PNG@0.11.0`
    || refs.workerRef.version !== "0.11.0" || !/^[a-f0-9]{64}$/u.test(refs.workerRef.implementationSha256)
    || typeof refs.workerRef.path !== "string" || !refs.workerRef.path.startsWith("scripts/") || refs.workerRef.path.includes("..")) {
    fail(code, "runner refs do not bind the Slice 11 identity");
  }
}

function makeRequest({ operation, item, repetition, refs, createdAt }) {
  return createSlice11CalibrationRequest({
    requestId: `request.s11.${operation}.${item.sourceRef.id}.r${repetition}.a1`, operation,
    attempt: { sourceId: item.sourceRef.id, partition: item.partition, repetition, attemptNumber: 1 },
    disposition: item.disposition, expectedStableErrorCode: item.expectedStableErrorCode,
    sourceRef: item.sourceRef, manifestRef: item.manifestRef, goldIdentityRef: item.goldIdentityRef,
    candidateRef: refs.candidateRef, contractRef: refs.contractRef, runtimeRef: refs.runtimeRef,
    workerRef: refs.workerRef, createdAt,
    idempotencyKey: sha256Slice11(Buffer.from([operation, item.manifestRef.contentHash, item.sourceRef.id, repetition, 1].join("\0"), "utf8")),
  });
}

function failureStatus(code, explicitStatus) {
  if (["non-pass", "protocol-failed", "inconclusive"].includes(explicitStatus)) return explicitStatus;
  return /(?:RECONCILIATION_UNKNOWN|TIMEOUT|CANCELLED)$/u.test(code) ? "inconclusive" : "protocol-failed";
}

function partialResult(state, globalStop = null) {
  return Object.freeze({
    status: globalStop?.status ?? "running", globalStop,
    requests: Object.freeze([...state.requests]), lifecycles: Object.freeze([...state.lifecycles]),
    projections: Object.freeze([...state.projections]), terminals: Object.freeze([...state.terminals]),
    terminalInputs: Object.freeze([...state.terminalInputs]), ledger: Object.freeze([...state.ledger]),
    summary: null,
  });
}

export async function runSlice11CalibrationOperation({
  operation, cases, refs, executeAttempt, hooks = {}, now = () => new Date().toISOString(),
} = {}) {
  if (typeof executeAttempt !== "function" || typeof now !== "function") fail("S11_RUNNER_INPUT_INVALID", "executor and clock are required");
  validateHooks(hooks);
  validateCases(operation, cases);
  validateRefs(operation, refs);
  const state = { requests: [], lifecycles: [], projections: [], terminals: [], terminalInputs: [], ledger: [] };
  let previousEventHash = null;
  let sequence = 0;
  const append = (eventType, request, terminal, occurredAt) => {
    const requestRef = contentRefSlice11(request, "requestId");
    const terminalRef = terminal === null ? null : contentRefSlice11(terminal, "terminalId");
    const event = createSlice11LedgerEvent({
      eventId: `event.s11.${operation}.${String(++sequence).padStart(4, "0")}`, sequence, eventType,
      requestRef, terminalRef, previousEventHash, payloadSha256: payloadHash(terminal ?? request), occurredAt,
    });
    state.ledger.push(event);
    previousEventHash = event.contentHash;
  };
  const operationStartedAt = instant(now);
  for (const item of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const request = makeRequest({ operation, item, repetition, refs, createdAt: instant(now) });
      try { await hooks.beforeAttempt?.(Object.freeze({ request })); }
      catch (cause) {
        fail("S11_BEFORE_ATTEMPT_DURABILITY_FAILED", "attempt was not admitted to execution", {
          cause, partial: partialResult(state, Object.freeze({ status: "inconclusive",
            reasonCode: typeof cause?.code === "string" ? cause.code : "S11_DURABILITY_UNCLASSIFIED_FAILURE",
            requestRef: contentRefSlice11(request, "requestId") })),
        });
      }
      state.requests.push(request);
      append("attempt-started", request, null, instant(now));
      const startedAt = instant(now);
      let lifecycle = null;
      let projection = null;
      let execution = null;
      let terminal;
      try {
        const result = await executeAttempt(Object.freeze({ request }));
        execution = result;
        if (item.disposition === "rejection") {
          exact(result, ["actualStableErrorCode", "expectedProjection", "kind", "workerLifecycle"], "S11_EXECUTION_PROTOCOL_INVALID", "rejection result");
          if (result.kind !== "rejection-pass" || result.actualStableErrorCode !== item.expectedStableErrorCode
            || result.expectedProjection !== null) fail("S11_EXECUTION_PROTOCOL_INVALID", "rejection result differs from frozen classification");
          lifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${request.requestId}`, attemptId: request.requestId,
            operation, projection: null, lifecycle: result.workerLifecycle, recordedAt: instant(now) });
          terminal = createSlice11CalibrationTerminal({
            terminalId: `terminal.${request.requestId}`, operation, disposition: item.disposition,
            requestRef: contentRefSlice11(request, "requestId"), status: "pass", actualStableErrorCode: result.actualStableErrorCode,
            reasonCode: null, expectedProjectionRef: null, workerLifecycleRef: contentRefSlice11(lifecycle, "lifecycleId"),
            outputFileSha256: null, outputByteLength: null, oracleFactsSha256: null, startedAt, finishedAt: instant(now),
          }, { request, lifecycle, projection: null });
        } else {
          exact(result, ["expectedProjection", "kind", "oracleFacts", "outputBytes", "workerLifecycle"], "S11_EXECUTION_PROTOCOL_INVALID", "applicable result");
          if (result.kind !== "applicable-pass" || !(result.outputBytes instanceof Uint8Array) || result.outputBytes.length < 1
            || result.outputBytes.length > 1048576 || !plain(result.oracleFacts)) fail("S11_EXECUTION_PROTOCOL_INVALID", "applicable result closure invalid");
          validateExpectedProjectionSlice11(result.expectedProjection);
          projection = result.expectedProjection;
          lifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${request.requestId}`, attemptId: request.requestId,
            operation, projection, lifecycle: result.workerLifecycle, recordedAt: instant(now) });
          const output = Buffer.from(result.outputBytes);
          terminal = createSlice11CalibrationTerminal({
            terminalId: `terminal.${request.requestId}`, operation, disposition: item.disposition,
            requestRef: contentRefSlice11(request, "requestId"), status: "pass", actualStableErrorCode: null, reasonCode: null,
            expectedProjectionRef: contentRefSlice11(projection, "projectionId"), workerLifecycleRef: contentRefSlice11(lifecycle, "lifecycleId"),
            outputFileSha256: sha256Slice11(output), outputByteLength: output.length,
            oracleFactsSha256: payloadHash(result.oracleFacts), startedAt, finishedAt: instant(now),
          }, { request, lifecycle, projection });
        }
      } catch (error) {
        const reasonCode = typeof error?.code === "string" && /^S11_[A-Z0-9_]+$/u.test(error.code)
          ? error.code : "S11_EXECUTION_UNCLASSIFIED_FAILURE";
        projection = error?.expectedProjection ?? null;
        if (projection !== null) {
          try { validateExpectedProjectionSlice11(projection); } catch { projection = null; }
        }
        if (plain(error?.workerLifecycle)) {
          try {
            lifecycle = createSlice11WorkerLifecycle({ lifecycleId: `lifecycle.${request.requestId}`, attemptId: request.requestId,
              operation, projection, lifecycle: error.workerLifecycle, recordedAt: instant(now) });
          } catch { lifecycle = null; projection = null; }
        }
        const status = lifecycle === null ? "protocol-failed" : failureStatus(reasonCode, error?.status);
        terminal = createSlice11CalibrationTerminal({
          terminalId: `terminal.${request.requestId}`, operation, disposition: item.disposition,
          requestRef: contentRefSlice11(request, "requestId"), status, actualStableErrorCode: null,
          reasonCode: lifecycle === null ? "S11_WORKER_LIFECYCLE_MISSING" : reasonCode,
          expectedProjectionRef: projection === null ? null : contentRefSlice11(projection, "projectionId"),
          workerLifecycleRef: lifecycle === null ? null : contentRefSlice11(lifecycle, "lifecycleId"),
          outputFileSha256: null, outputByteLength: null, oracleFactsSha256: null, startedAt, finishedAt: instant(now),
        }, { request, lifecycle, projection });
      }
      if (projection !== null) state.projections.push(projection);
      if (lifecycle !== null) state.lifecycles.push(lifecycle);
      state.terminals.push(terminal);
      state.terminalInputs.push({ request, terminal, lifecycle, projection });
      append("attempt-terminal", request, terminal, instant(now));
      try {
        await hooks.afterAttempt?.(Object.freeze({ request, terminal, lifecycle, projection, execution }));
      } catch (cause) {
        const globalStop = Object.freeze({ status: "inconclusive",
          reasonCode: typeof cause?.code === "string" ? cause.code : "S11_DURABILITY_UNCLASSIFIED_FAILURE",
          requestRef: contentRefSlice11(request, "requestId") });
        fail("S11_AFTER_ATTEMPT_DURABILITY_FAILED", "attempt closure did not reach a durable terminal state", {
          cause, partial: partialResult(state, globalStop),
        });
      }
      if (["protocol-failed", "inconclusive"].includes(terminal.status)) {
        validateSlice11Ledger(state.ledger);
        const globalStop = Object.freeze({ status: terminal.status, reasonCode: terminal.reasonCode,
          requestRef: contentRefSlice11(request, "requestId") });
        return partialResult(state, globalStop);
      }
    }
  }
  validateSlice11Ledger(state.ledger);
  const summary = buildSlice11CalibrationSummary({
    operation,
    registeredCases: cases.map((item) => ({ sourceId: item.sourceRef.id, partition: item.partition,
      disposition: item.disposition, expectedStableErrorCode: item.expectedStableErrorCode,
      manifestContentHash: item.manifestRef.contentHash })),
    terminalInputs: state.terminalInputs, startedAt: operationStartedAt, finishedAt: instant(now),
  });
  return Object.freeze({ ...partialResult(state), status: summary.overallStatus, summary });
}
