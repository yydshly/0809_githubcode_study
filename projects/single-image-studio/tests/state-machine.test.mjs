import assert from "node:assert/strict";
import test from "node:test";

import {
  RUN_STATUS,
  STUDIO_EVENTS,
  STUDIO_STATES,
  createInitialState,
  currentRunToken,
  currentSourceToken,
  reduceStudioState,
} from "../web/state-machine.js";

const LOCAL_TASK = Object.freeze({
  id: "UT-TUNE",
  label: "保真整理",
  family: "utility",
  availability: "available",
  runnable: true,
  requiresConfig: false,
  requiresAdultAttestation: false,
  contractVersion: "local-fidelity-v1",
});

const PORTRAIT_TASK = Object.freeze({
  id: "PORTRAIT-TEST",
  label: "头像测试契约",
  family: "utility",
  availability: "available",
  runnable: true,
  requiresConfig: true,
  requiresAdultAttestation: true,
  contractVersion: "portrait-test-v1",
});

function source(letter) {
  return {
    name: `${letter}.png`,
    mimeType: "image/png",
    size: 100,
    hash: letter.repeat(64),
  };
}

function acceptConsent(state, suffix) {
  return reduceStudioState(state, {
    type: STUDIO_EVENTS.ACCEPT_SOURCE_CONSENT,
    ...currentSourceToken(state),
    consentId: `consent-${suffix}`,
    validationId: `validation-${suffix}`,
    rightsConfirmed: true,
    dataNoticeAccepted: true,
    noticeVersion: "notice-v1",
    acceptedAt: "2026-08-12T20:00:00.000Z",
  });
}

function validationSuccess(state, suffix) {
  return reduceStudioState(state, {
    type: STUDIO_EVENTS.SOURCE_VALIDATION_SUCCEEDED,
    ...currentSourceToken(state),
    validationId: `validation-${suffix}`,
    analysisId: `analysis-${suffix}`,
    analyzerVersion: "analyzer-v1",
    decoded: { width: 800, height: 600 },
  });
}

function analysisSuccess(state, suffix, tasks = [LOCAL_TASK]) {
  return reduceStudioState(state, {
    type: STUDIO_EVENTS.ANALYSIS_SUCCEEDED,
    ...currentSourceToken(state),
    analysisId: `analysis-${suffix}`,
    catalogVersion: "catalog-v1",
    tasks,
  });
}

function readyWithTasks(letter = "a", tasks = [LOCAL_TASK]) {
  let state = createInitialState();
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source(letter) });
  state = acceptConsent(state, letter);
  state = validationSuccess(state, letter);
  state = analysisSuccess(state, letter, tasks);
  return state;
}

function runningLocal(letter = "a", runId = `run-${letter}`) {
  let state = readyWithTasks(letter);
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_TASK, taskId: "UT-TUNE" });
  state = reduceStudioState(state, { type: STUDIO_EVENTS.PREPARE_TASK });
  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.START_RUN,
    runId,
    startedAt: "2026-08-12T20:01:00.000Z",
  });
  return state;
}

test("the complete consent-to-result path exposes every durable checkpoint", () => {
  let state = createInitialState();
  assert.equal(state.status, STUDIO_STATES.EMPTY);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("a") });
  assert.equal(state.status, STUDIO_STATES.SOURCE_CONSENT_PENDING);
  assert.equal(state.sourceRevision, 1);

  state = acceptConsent(state, "a");
  assert.equal(state.status, STUDIO_STATES.SOURCE_VALIDATING);
  assert.equal(state.consent.sourceHash, "a".repeat(64));

  state = validationSuccess(state, "a");
  assert.equal(state.status, STUDIO_STATES.ANALYZING);

  state = analysisSuccess(state, "a");
  assert.equal(state.status, STUDIO_STATES.TASKS_READY);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_TASK, taskId: "UT-TUNE" });
  assert.equal(state.status, STUDIO_STATES.TASK_SELECTED);
  state = reduceStudioState(state, { type: STUDIO_EVENTS.PREPARE_TASK });
  assert.equal(state.status, STUDIO_STATES.READY_TO_RUN);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.START_RUN,
    runId: "run-a",
    startedAt: "2026-08-12T20:01:00.000Z",
  });
  assert.equal(state.status, STUDIO_STATES.RUNNING);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.RECEIVE_RUN_RESULT,
    ...currentRunToken(state),
    result: { id: "result-a", outputHash: "f".repeat(64) },
  });
  assert.equal(state.status, STUDIO_STATES.RESULT_VALIDATING);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED,
    ...currentRunToken(state),
    resultId: "result-a",
    qaVersion: "fidelity-qa-v1",
    resultPatch: {
      mimeType: "image/png",
      byteLength: 256,
      completedAt: "2026-08-12T20:02:00.000Z",
    },
  });
  assert.equal(state.status, STUDIO_STATES.RESULT_READY);
  assert.equal(state.result.qaStatus, "passed");
  assert.equal(state.run.status, RUN_STATUS.SUCCEEDED);
});

test("task configuration and adult attestation are independent run gates", () => {
  let state = readyWithTasks("p", [PORTRAIT_TASK]);
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_TASK, taskId: "PORTRAIT-TEST" });
  state = reduceStudioState(state, { type: STUDIO_EVENTS.PREPARE_TASK });
  assert.equal(state.status, STUDIO_STATES.CONFIGURING);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.UPDATE_CONFIG,
    config: { width: 600, height: 800, background: "#ffffff" },
    valid: true,
    settingsHash: "settings-v1",
  });
  assert.equal(state.status, STUDIO_STATES.CONFIGURING);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.ACCEPT_ADULT_ATTESTATION,
    ...currentSourceToken(state),
    adultConfirmed: true,
    version: "adult-v1",
    acceptedAt: "2026-08-12T20:03:00.000Z",
  });
  assert.equal(state.status, STUDIO_STATES.READY_TO_RUN);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.START_RUN, runId: "portrait-run" });
  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.RECEIVE_RUN_RESULT,
    ...currentRunToken(state),
    result: { id: "portrait-result" },
  });
  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED,
    ...currentRunToken(state),
    resultId: "portrait-result",
  });
  assert.equal(state.status, STUDIO_STATES.RESULT_READY);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.UPDATE_CONFIG,
    config: { width: 319, height: 800 },
    valid: false,
  });
  assert.equal(state.status, STUDIO_STATES.CONFIGURING);
  assert.equal(state.result, null);
  assert.equal(state.run, null);
  assert.deepEqual(state.supersededRunIds, ["portrait-run"]);
});

test("replacing the source makes validation, analysis, and run responses inert", () => {
  let state = createInitialState();
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("a") });
  state = acceptConsent(state, "a");
  const validationA = {
    type: STUDIO_EVENTS.SOURCE_VALIDATION_SUCCEEDED,
    ...currentSourceToken(state),
    validationId: "validation-a",
    analysisId: "analysis-a",
  };

  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("b") });
  assert.equal(reduceStudioState(state, validationA), state);

  state = acceptConsent(state, "b");
  state = validationSuccess(state, "b");
  const analysisB = {
    type: STUDIO_EVENTS.ANALYSIS_SUCCEEDED,
    ...currentSourceToken(state),
    analysisId: "analysis-b",
    tasks: [LOCAL_TASK],
  };
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("c") });
  assert.equal(reduceStudioState(state, analysisB), state);

  state = acceptConsent(state, "c");
  state = validationSuccess(state, "c");
  state = analysisSuccess(state, "c");
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_TASK, taskId: "UT-TUNE" });
  state = reduceStudioState(state, { type: STUDIO_EVENTS.PREPARE_TASK });
  state = reduceStudioState(state, { type: STUDIO_EVENTS.START_RUN, runId: "run-c" });
  const oldRunToken = currentRunToken(state);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("d") });
  const lateResult = {
    type: STUDIO_EVENTS.RECEIVE_RUN_RESULT,
    ...oldRunToken,
    result: { id: "late-c" },
  };
  assert.equal(reduceStudioState(state, lateResult), state);
  assert.equal(state.status, STUDIO_STATES.SOURCE_CONSENT_PENDING);
  assert.equal(state.sourceRevision, 4);
  assert.equal(state.consent, null);
  assert.equal(state.result, null);
  assert.deepEqual(state.supersededRunIds, ["run-c"]);
});

test("unknown runs never auto-retry, and late detached results cannot win", () => {
  let state = runningLocal("u", "run-unknown");
  const oldToken = currentRunToken(state);
  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.MARK_RUN_UNKNOWN,
    ...oldToken,
  });
  assert.equal(state.status, STUDIO_STATES.RUN_UNKNOWN);
  assert.equal(state.run.status, RUN_STATUS.UNKNOWN);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.RETRY_RUN });
  assert.equal(state.status, STUDIO_STATES.READY_TO_RUN);
  assert.equal(state.activeRunId, null);
  assert.deepEqual(state.detachedRunIds, ["run-unknown"]);

  state = reduceStudioState(state, { type: STUDIO_EVENTS.START_RUN, runId: "run-explicit-retry" });
  const lateOldResult = {
    type: STUDIO_EVENTS.RECEIVE_RUN_RESULT,
    ...oldToken,
    result: { id: "late-old-result" },
  };
  assert.equal(reduceStudioState(state, lateOldResult), state);

  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.RUN_FAILED,
    ...currentRunToken(state),
    code: "PROVIDER_ERROR",
  });
  assert.equal(state.status, STUDIO_STATES.RUN_ERROR);
  assert.equal(state.result, null);
});

test("source validation errors do not leak into later revisions", () => {
  let state = createInitialState();
  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("e") });
  state = acceptConsent(state, "e");
  state = reduceStudioState(state, {
    type: STUDIO_EVENTS.SOURCE_VALIDATION_FAILED,
    ...currentSourceToken(state),
    validationId: "validation-e",
    code: "DECODE_FAILED",
  });
  assert.equal(state.status, STUDIO_STATES.SOURCE_ERROR);
  assert.equal(state.error.code, "DECODE_FAILED");

  state = reduceStudioState(state, { type: STUDIO_EVENTS.SELECT_SOURCE, source: source("f") });
  assert.equal(state.status, STUDIO_STATES.SOURCE_CONSENT_PENDING);
  assert.equal(state.error, null);
  assert.equal(state.sourceRevision, 2);
});

