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

test("without remote services, all three local editor tasks remain runnable", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  assert.deepEqual(
    catalog.filter((task) => task.runnable).map((task) => task.id),
    ["UT-TUNE", "UT-ENHANCE", "UT-TEMPLATE"],
  );
  assert.equal(catalog.find((task) => task.id === "CR1").availability, "unavailable");

  const cutout = catalog.find((task) => task.id === "UT-CUTOUT");
  assert.equal(cutout.runnable, false);
  assert.equal(cutout.availability, TASK_AVAILABILITY.UNAVAILABLE);
  assert.equal(cutout.statusLabel, "抠图服务未配置");

  const solidBackground = catalog.find((candidate) => candidate.id === "UT-SOLID-BG");
  assert.equal(solidBackground.runnable, false);
  assert.equal(solidBackground.availability, TASK_AVAILABILITY.VALIDATING);
  assert.equal(solidBackground.statusLabel, "能力验证中");
  const portrait = catalog.find((candidate) => candidate.id === "UT-PORTRAIT");
  assert.equal(portrait.runnable, false);
  assert.equal(portrait.availability, TASK_AVAILABILITY.UNAVAILABLE);
  assert.equal(portrait.statusLabel, "抠图服务未配置");
});

test("AI availability adds the real AI task without enabling unverified utilities", () => {
  assert.deepEqual(
    getRunnableTasks({
      aiStatus: { status: "available" },
      backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    }).map((task) => task.id),
    ["UT-TUNE", "UT-ENHANCE", "UT-TEMPLATE", "CR1"],
  );

  const recommendations = getRecommendedTasks({
    aiStatus: "available",
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    limit: 4,
  });
  assert.deepEqual(recommendations.map((task) => task.id), ["UT-TUNE", "UT-ENHANCE", "UT-TEMPLATE", "CR1"]);
  assert.equal(recommendations.length, 4);
  assert.equal(recommendations.every((task) => task.runnable), true);
});

test("background removal availability enables cutout and the composed portrait workflow", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  });
  assert.deepEqual(
    catalog.filter((task) => task.runnable).map((task) => task.id),
    ["UT-TUNE", "UT-ENHANCE", "UT-TEMPLATE", "UT-CUTOUT", "UT-PORTRAIT"],
  );
  const cutout = catalog.find((task) => task.id === "UT-CUTOUT");
  assert.equal(cutout.statusLabel, "可运行 · 远程处理");
  assert.equal(cutout.contractVersion, "remote-cutout-v1");
  const portrait = catalog.find((task) => task.id === "UT-PORTRAIT");
  assert.equal(portrait.statusLabel, "可运行 · 远程处理");
  assert.equal(portrait.contractVersion, "portrait-background-v1");
  assert.equal(catalog.find((task) => task.id === "UT-SOLID-BG").runnable, false);
  const enhancement = catalog.find((task) => task.id === "UT-ENHANCE");
  assert.equal(enhancement.statusLabel, "可运行 · 本地处理");
  assert.equal(enhancement.contractVersion, "local-natural-enhancement-v1");
  const template = catalog.find((task) => task.id === "UT-TEMPLATE");
  assert.equal(template.statusLabel, "可运行 · 本地处理");
  assert.equal(template.contractVersion, "local-scene-template-v1");
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

  const enhanced = buildResultDownloadContract({
    taskId: "UT-ENHANCE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(enhanced.allowed, true);
  assert.match(enhanced.download.filename, /^enhanced-result-/);

  const template = buildResultDownloadContract({
    taskId: "UT-TEMPLATE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(template.allowed, true);
  assert.match(template.download.filename, /^scene-template-result-/);
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
