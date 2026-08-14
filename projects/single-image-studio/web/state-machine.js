export const STUDIO_STATES = Object.freeze({
  EMPTY: "EMPTY",
  SOURCE_CONSENT_PENDING: "SOURCE_CONSENT_PENDING",
  SOURCE_VALIDATING: "SOURCE_VALIDATING",
  SOURCE_ERROR: "SOURCE_ERROR",
  ANALYZING: "ANALYZING",
  NO_ELIGIBLE_TASKS: "NO_ELIGIBLE_TASKS",
  TASKS_READY: "TASKS_READY",
  TASK_SELECTED: "TASK_SELECTED",
  CONFIGURING: "CONFIGURING",
  READY_TO_RUN: "READY_TO_RUN",
  RUNNING: "RUNNING",
  RUN_UNKNOWN: "RUN_UNKNOWN",
  RUN_ERROR: "RUN_ERROR",
  RESULT_VALIDATING: "RESULT_VALIDATING",
  RESULT_READY: "RESULT_READY",
});

export const RUN_STATUS = Object.freeze({
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  UNKNOWN: "UNKNOWN",
  SUPERSEDED: "SUPERSEDED",
  DETACHED: "DETACHED",
});

export const STUDIO_EVENTS = Object.freeze({
  SELECT_SOURCE: "SELECT_SOURCE",
  CANCEL_SOURCE: "CANCEL_SOURCE",
  ACCEPT_SOURCE_CONSENT: "ACCEPT_SOURCE_CONSENT",
  SOURCE_VALIDATION_SUCCEEDED: "SOURCE_VALIDATION_SUCCEEDED",
  SOURCE_VALIDATION_FAILED: "SOURCE_VALIDATION_FAILED",
  ANALYSIS_SUCCEEDED: "ANALYSIS_SUCCEEDED",
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  SELECT_TASK: "SELECT_TASK",
  PREPARE_TASK: "PREPARE_TASK",
  UPDATE_CONFIG: "UPDATE_CONFIG",
  ACCEPT_ADULT_ATTESTATION: "ACCEPT_ADULT_ATTESTATION",
  START_RUN: "START_RUN",
  MARK_RUN_UNKNOWN: "MARK_RUN_UNKNOWN",
  RUN_FAILED: "RUN_FAILED",
  RECEIVE_RUN_RESULT: "RECEIVE_RUN_RESULT",
  RESULT_VALIDATION_SUCCEEDED: "RESULT_VALIDATION_SUCCEEDED",
  RESULT_VALIDATION_FAILED: "RESULT_VALIDATION_FAILED",
  CANCEL_WAIT: "CANCEL_WAIT",
  RETRY_RUN: "RETRY_RUN",
});

export class StudioStateError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "StudioStateError";
    this.details = Object.freeze({ ...details });
  }
}

export function createInitialState() {
  return {
    status: STUDIO_STATES.EMPTY,
    sourceRevision: 0,
    source: null,
    consent: null,
    validation: null,
    analysis: null,
    tasks: [],
    selectedTask: null,
    config: null,
    configValid: false,
    settingsHash: null,
    adultAttestation: null,
    run: null,
    activeRunId: null,
    result: null,
    rejectedResult: null,
    error: null,
    supersededRunIds: [],
    detachedRunIds: [],
  };
}

function requireState(state, allowed, eventType) {
  if (!allowed.includes(state.status)) {
    throw new StudioStateError(
      `${eventType} is not allowed while state is ${state.status}`,
      { eventType, status: state.status },
    );
  }
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new StudioStateError(`${field} is required`, { field });
  }
  return value;
}

function uniqueAppend(values, value) {
  return value && !values.includes(value) ? [...values, value] : values;
}

function matchesSource(state, event) {
  return Boolean(
    state.source
    && event.sourceRevision === state.sourceRevision
    && event.sourceHash === state.source.hash,
  );
}

function matchesValidation(state, event) {
  return matchesSource(state, event)
    && Boolean(state.validation)
    && event.validationId === state.validation.id;
}

function matchesAnalysis(state, event) {
  return matchesSource(state, event)
    && Boolean(state.analysis)
    && event.analysisId === state.analysis.id;
}

function matchesRun(state, event) {
  return matchesSource(state, event)
    && Boolean(state.run)
    && state.activeRunId === state.run.id
    && event.runId === state.run.id;
}

function runnable(task) {
  return task?.runnable === true && (task.availability ?? "available") === "available";
}

function retiredRunState(state, bucket) {
  if (!state.run) return state;
  const field = bucket === RUN_STATUS.DETACHED ? "detachedRunIds" : "supersededRunIds";
  return {
    ...state,
    [field]: uniqueAppend(state[field], state.run.id),
    run: null,
    activeRunId: null,
    result: null,
    rejectedResult: null,
  };
}

function readyStatus(state) {
  if (!state.selectedTask) return STUDIO_STATES.TASKS_READY;
  const adultReady = !state.selectedTask.requiresAdultAttestation || Boolean(state.adultAttestation);
  const configReady = !state.selectedTask.requiresConfig || state.configValid;
  return adultReady && configReady
    ? STUDIO_STATES.READY_TO_RUN
    : STUDIO_STATES.CONFIGURING;
}

function selectSource(state, event) {
  const source = event.source;
  if (!source || typeof source !== "object") {
    throw new StudioStateError("SELECT_SOURCE requires a prepared source");
  }
  requireText(source.hash, "source.hash");
  requireText(source.name, "source.name");

  const nextRevision = state.sourceRevision + 1;
  const supersededRunIds = state.run
    ? uniqueAppend(state.supersededRunIds, state.run.id)
    : state.supersededRunIds;

  return {
    ...createInitialState(),
    status: STUDIO_STATES.SOURCE_CONSENT_PENDING,
    sourceRevision: nextRevision,
    source: { ...source, revision: nextRevision },
    supersededRunIds,
    detachedRunIds: state.detachedRunIds,
  };
}

function acceptConsent(state, event) {
  requireState(state, [STUDIO_STATES.SOURCE_CONSENT_PENDING], event.type);
  if (!matchesSource(state, event)) return state;
  if (event.rightsConfirmed !== true || event.dataNoticeAccepted !== true) {
    throw new StudioStateError("source rights and data notice must both be accepted");
  }

  const consentId = requireText(event.consentId, "consentId");
  const validationId = requireText(event.validationId, "validationId");
  const noticeVersion = requireText(event.noticeVersion, "noticeVersion");
  const acceptedAt = requireText(event.acceptedAt, "acceptedAt");

  return {
    ...state,
    status: STUDIO_STATES.SOURCE_VALIDATING,
    consent: {
      id: consentId,
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      rightsConfirmed: true,
      dataNoticeAccepted: true,
      noticeVersion,
      acceptedAt,
    },
    validation: {
      id: validationId,
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      status: "pending",
    },
    error: null,
  };
}

function validationSucceeded(state, event) {
  if (!matchesValidation(state, event)) return state;
  requireState(state, [STUDIO_STATES.SOURCE_VALIDATING], event.type);
  const analysisId = requireText(event.analysisId, "analysisId");
  return {
    ...state,
    status: STUDIO_STATES.ANALYZING,
    source: { ...state.source, decoded: event.decoded ?? null },
    validation: { ...state.validation, status: "succeeded" },
    analysis: {
      id: analysisId,
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      analyzerVersion: event.analyzerVersion ?? null,
      status: "pending",
    },
    error: null,
  };
}

function validationFailed(state, event) {
  if (!matchesValidation(state, event)) return state;
  requireState(state, [STUDIO_STATES.SOURCE_VALIDATING], event.type);
  return {
    ...state,
    status: STUDIO_STATES.SOURCE_ERROR,
    validation: { ...state.validation, status: "failed" },
    error: {
      stage: "source-validation",
      code: event.code ?? "SOURCE_VALIDATION_FAILED",
      message: event.message ?? "图片无法通过校验。",
    },
  };
}

function finishAnalysis(state, event, failed) {
  if (!matchesAnalysis(state, event)) return state;
  requireState(state, [STUDIO_STATES.ANALYZING], event.type);
  const tasks = Array.isArray(event.tasks) ? event.tasks.map((task) => ({ ...task })) : [];
  const hasRunnableTask = tasks.some(runnable);
  return {
    ...state,
    status: hasRunnableTask ? STUDIO_STATES.TASKS_READY : STUDIO_STATES.NO_ELIGIBLE_TASKS,
    analysis: {
      ...state.analysis,
      status: failed ? "failed" : "succeeded",
      catalogVersion: event.catalogVersion ?? null,
      summary: event.summary ?? null,
    },
    tasks,
    error: failed
      ? {
        stage: "analysis",
        code: event.code ?? "ANALYSIS_FAILED",
        message: event.message ?? "资格分析失败；仅保留已通过硬边界的通用任务。",
      }
      : null,
  };
}

function selectTask(state, event) {
  requireState(state, [
    STUDIO_STATES.TASKS_READY,
    STUDIO_STATES.TASK_SELECTED,
    STUDIO_STATES.CONFIGURING,
    STUDIO_STATES.READY_TO_RUN,
    STUDIO_STATES.RUN_ERROR,
    STUDIO_STATES.RESULT_READY,
  ], event.type);
  const task = state.tasks.find((candidate) => candidate.id === event.taskId);
  if (!runnable(task)) {
    throw new StudioStateError("selected task is not runnable", { taskId: event.taskId });
  }

  const retired = retiredRunState(state, RUN_STATUS.SUPERSEDED);
  return {
    ...retired,
    status: STUDIO_STATES.TASK_SELECTED,
    selectedTask: { ...task },
    config: event.initialConfig ?? null,
    configValid: task.requiresConfig ? event.configValid === true : true,
    settingsHash: event.settingsHash ?? null,
    adultAttestation: null,
    result: null,
    rejectedResult: null,
    error: null,
  };
}

function updateConfig(state, event) {
  requireState(state, [
    STUDIO_STATES.TASK_SELECTED,
    STUDIO_STATES.CONFIGURING,
    STUDIO_STATES.READY_TO_RUN,
    STUDIO_STATES.RUN_ERROR,
    STUDIO_STATES.RESULT_READY,
  ], event.type);
  if (!state.selectedTask) throw new StudioStateError("no selected task");
  const retired = retiredRunState(state, RUN_STATUS.SUPERSEDED);
  const next = {
    ...retired,
    config: event.config ?? null,
    configValid: state.selectedTask.requiresConfig ? event.valid === true : true,
    settingsHash: event.settingsHash ?? null,
    result: null,
    rejectedResult: null,
    error: null,
  };
  return { ...next, status: readyStatus(next) };
}

function acceptAdultAttestation(state, event) {
  requireState(state, [STUDIO_STATES.TASK_SELECTED, STUDIO_STATES.CONFIGURING], event.type);
  if (!state.selectedTask?.requiresAdultAttestation) {
    throw new StudioStateError("the selected task does not require adult attestation");
  }
  if (!matchesSource(state, event)) return state;
  if (event.adultConfirmed !== true) {
    throw new StudioStateError("adult attestation must be explicit");
  }
  const next = {
    ...state,
    adultAttestation: {
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      version: requireText(event.version, "version"),
      acceptedAt: requireText(event.acceptedAt, "acceptedAt"),
    },
  };
  return { ...next, status: readyStatus(next) };
}

function startRun(state, event) {
  requireState(state, [STUDIO_STATES.READY_TO_RUN], event.type);
  const runId = requireText(event.runId, "runId");
  if (state.supersededRunIds.includes(runId) || state.detachedRunIds.includes(runId)) {
    throw new StudioStateError("a retired run id cannot be reused", { runId });
  }
  const settingsHash = state.settingsHash ?? event.settingsHash ?? "none";
  return {
    ...state,
    status: STUDIO_STATES.RUNNING,
    run: {
      id: runId,
      status: RUN_STATUS.RUNNING,
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      consentId: state.consent.id,
      analysisId: state.analysis.id,
      taskId: state.selectedTask.id,
      taskFamily: state.selectedTask.family,
      taskContractVersion: state.selectedTask.contractVersion,
      settingsHash,
      startedAt: event.startedAt ?? null,
    },
    activeRunId: runId,
    result: null,
    rejectedResult: null,
    error: null,
  };
}

function runUnknown(state, event) {
  if (!matchesRun(state, event)) return state;
  requireState(state, [STUDIO_STATES.RUNNING], event.type);
  return {
    ...state,
    status: STUDIO_STATES.RUN_UNKNOWN,
    run: { ...state.run, status: RUN_STATUS.UNKNOWN },
    error: {
      stage: "run",
      code: event.code ?? "RUN_STATUS_UNKNOWN",
      message: event.message ?? "暂时无法确认运行状态；不会自动重复提交。",
    },
  };
}

function runFailed(state, event) {
  if (!matchesRun(state, event)) return state;
  requireState(state, [STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN], event.type);
  return {
    ...state,
    status: STUDIO_STATES.RUN_ERROR,
    run: { ...state.run, status: RUN_STATUS.FAILED },
    result: null,
    error: {
      stage: "run",
      code: event.code ?? "RUN_FAILED",
      message: event.message ?? "没有得到可用结果。",
    },
  };
}

function receiveResult(state, event) {
  if (!matchesRun(state, event)) return state;
  requireState(state, [STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN], event.type);
  return {
    ...state,
    status: STUDIO_STATES.RESULT_VALIDATING,
    run: { ...state.run, status: RUN_STATUS.SUCCEEDED },
    result: {
      ...(event.result ?? {}),
      id: requireText(event.result?.id, "result.id"),
      runId: state.run.id,
      sourceRevision: state.sourceRevision,
      sourceHash: state.source.hash,
      status: "validating",
      qaStatus: "pending",
    },
    error: null,
  };
}

function resultValidationSucceeded(state, event) {
  if (!matchesRun(state, event) || event.resultId !== state.result?.id) return state;
  requireState(state, [STUDIO_STATES.RESULT_VALIDATING], event.type);
  return {
    ...state,
    status: STUDIO_STATES.RESULT_READY,
    result: {
      ...state.result,
      ...event.resultPatch,
      status: "ready",
      qaStatus: "passed",
      qaVersion: event.qaVersion ?? null,
    },
    error: null,
  };
}

function resultValidationFailed(state, event) {
  if (!matchesRun(state, event) || event.resultId !== state.result?.id) return state;
  requireState(state, [STUDIO_STATES.RESULT_VALIDATING], event.type);
  return {
    ...state,
    status: STUDIO_STATES.RUN_ERROR,
    run: { ...state.run, status: RUN_STATUS.BLOCKED },
    rejectedResult: {
      id: state.result.id,
      runId: state.run.id,
      code: event.code ?? "RESULT_QA_FAILED",
    },
    result: null,
    error: {
      stage: "result-validation",
      code: event.code ?? "RESULT_QA_FAILED",
      message: event.message ?? "结果未通过任务专属 QA，下载保持禁用。",
    },
  };
}

function cancelOrRetry(state, event, retry) {
  const allowed = retry
    ? [STUDIO_STATES.RUN_UNKNOWN, STUDIO_STATES.RUN_ERROR]
    : [STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN];
  requireState(state, allowed, event.type);
  const retired = retiredRunState(state, RUN_STATUS.DETACHED);
  const next = { ...retired, error: null };
  return { ...next, status: readyStatus(next) };
}

/**
 * Pure reducer. Asynchronous completion events with a stale source/run snapshot
 * return the exact current state object, making late responses inert.
 */
export function reduceStudioState(state, event) {
  if (!state || !event?.type) throw new StudioStateError("state and event.type are required");
  switch (event.type) {
    case STUDIO_EVENTS.SELECT_SOURCE:
      return selectSource(state, event);
    case STUDIO_EVENTS.CANCEL_SOURCE:
      requireState(state, [STUDIO_STATES.SOURCE_CONSENT_PENDING, STUDIO_STATES.SOURCE_ERROR], event.type);
      return {
        ...createInitialState(),
        sourceRevision: state.sourceRevision,
        supersededRunIds: state.supersededRunIds,
        detachedRunIds: state.detachedRunIds,
      };
    case STUDIO_EVENTS.ACCEPT_SOURCE_CONSENT:
      return acceptConsent(state, event);
    case STUDIO_EVENTS.SOURCE_VALIDATION_SUCCEEDED:
      return validationSucceeded(state, event);
    case STUDIO_EVENTS.SOURCE_VALIDATION_FAILED:
      return validationFailed(state, event);
    case STUDIO_EVENTS.ANALYSIS_SUCCEEDED:
      return finishAnalysis(state, event, false);
    case STUDIO_EVENTS.ANALYSIS_FAILED:
      return finishAnalysis(state, event, true);
    case STUDIO_EVENTS.SELECT_TASK:
      return selectTask(state, event);
    case STUDIO_EVENTS.PREPARE_TASK: {
      requireState(state, [STUDIO_STATES.TASK_SELECTED, STUDIO_STATES.CONFIGURING], event.type);
      return { ...state, status: readyStatus(state) };
    }
    case STUDIO_EVENTS.UPDATE_CONFIG:
      return updateConfig(state, event);
    case STUDIO_EVENTS.ACCEPT_ADULT_ATTESTATION:
      return acceptAdultAttestation(state, event);
    case STUDIO_EVENTS.START_RUN:
      return startRun(state, event);
    case STUDIO_EVENTS.MARK_RUN_UNKNOWN:
      return runUnknown(state, event);
    case STUDIO_EVENTS.RUN_FAILED:
      return runFailed(state, event);
    case STUDIO_EVENTS.RECEIVE_RUN_RESULT:
      return receiveResult(state, event);
    case STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED:
      return resultValidationSucceeded(state, event);
    case STUDIO_EVENTS.RESULT_VALIDATION_FAILED:
      return resultValidationFailed(state, event);
    case STUDIO_EVENTS.CANCEL_WAIT:
      return cancelOrRetry(state, event, false);
    case STUDIO_EVENTS.RETRY_RUN:
      return cancelOrRetry(state, event, true);
    default:
      throw new StudioStateError(`unknown event type: ${event.type}`);
  }
}

export function currentSourceToken(state) {
  return state.source
    ? Object.freeze({ sourceRevision: state.sourceRevision, sourceHash: state.source.hash })
    : null;
}

export function currentRunToken(state) {
  return state.run && state.activeRunId === state.run.id
    ? Object.freeze({ ...currentSourceToken(state), runId: state.run.id })
    : null;
}

