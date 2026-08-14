import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_SERVICE_STATUS,
  TASK_AVAILABILITY,
  getRecommendedTasks,
  getRunnableTasks,
  getTaskCatalog,
} from "../web/task-catalog.js";
import {
  DOWNLOAD_ERROR_CODES,
  buildResultDownloadContract,
} from "../web/result-download.js";

const HASH = "a".repeat(64);

function result(overrides = {}) {
  return {
    id: "result-1",
    runId: "run-1",
    status: "ready",
    qaStatus: "passed",
    mimeType: "image/png",
    hasAlpha: false,
    outputHash: HASH,
    byteLength: 128,
    completedAt: "2026-08-12T22:02:41.000Z",
    ...overrides,
  };
}

test("without an AI service, local fidelity is the only runnable task", () => {
  const catalog = getTaskCatalog({ aiStatus: AI_SERVICE_STATUS.UNAVAILABLE });
  assert.deepEqual(
    catalog.filter((task) => task.runnable).map((task) => task.id),
    ["UT-TUNE"],
  );
  assert.equal(catalog.find((task) => task.id === "CR1").availability, "unavailable");

  for (const id of ["UT-CUTOUT", "UT-SOLID-BG", "UT-PORTRAIT"]) {
    const task = catalog.find((candidate) => candidate.id === id);
    assert.equal(task.runnable, false);
    assert.equal(task.availability, TASK_AVAILABILITY.VALIDATING);
    assert.equal(task.statusLabel, "能力验证中");
  }
});

test("AI availability enables only the real AI task, never unverified utilities", () => {
  assert.deepEqual(
    getRunnableTasks({ aiStatus: { status: "available" } }).map((task) => task.id),
    ["UT-TUNE", "CR1"],
  );

  const recommendations = getRecommendedTasks({ aiStatus: "available", limit: 4 });
  assert.deepEqual(recommendations.slice(0, 2).map((task) => task.id), ["UT-TUNE", "CR1"]);
  assert.equal(recommendations.length, 4);
  assert.equal(recommendations.slice(2).every((task) => !task.runnable), true);
});

test("download stays locked until a current, QA-passed result matches its task contract", () => {
  const good = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result(),
    currentRunId: "run-1",
  });
  assert.equal(good.allowed, true);
  assert.equal(good.download.filename, "fidelity-result-20260812-220241.png");
  assert.equal(good.download.outputHash, HASH);

  const stale = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result(),
    currentRunId: "run-new",
  });
  assert.equal(stale.code, DOWNLOAD_ERROR_CODES.STALE_RESULT);

  const pendingQa = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result({ qaStatus: "pending" }),
    currentRunId: "run-1",
  });
  assert.equal(pendingQa.code, DOWNLOAD_ERROR_CODES.QA_NOT_PASSED);

  const faithfulJpeg = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(faithfulJpeg.allowed, true);
  assert.match(faithfulJpeg.download.filename, /\.jpg$/);
});

test("transparent and portrait downloads enforce alpha and safe naming", () => {
  const missingAlpha = buildResultDownloadContract({
    taskId: "UT-CUTOUT",
    result: result({ hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(missingAlpha.code, DOWNLOAD_ERROR_CODES.ALPHA_REQUIRED);

  const portrait = buildResultDownloadContract({
    taskId: "UT-PORTRAIT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(portrait.allowed, true);
  assert.match(portrait.download.filename, /^portrait-result-/);
  assert.doesNotMatch(portrait.download.filename, /official|passport|证件/i);
});
