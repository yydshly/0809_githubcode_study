import test from "node:test";
import assert from "node:assert/strict";
import { getTaskCatalog, AI_SERVICE_STATUS } from "../web/task-catalog.js";
import { groupTasksForDisplay, taskAvailabilitySummary } from "../web/task-groups.js";

test("task groups separate local, remote subject and creative operations", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  }).filter((task) => task.id !== "UT-SOLID-BG");
  const groups = groupTasksForDisplay(tasks);
  assert.deepEqual(groups.map((group) => group.id), ["local", "subject", "creative"]);
  assert.deepEqual(groups[0].tasks.map((task) => task.id), ["UT-TUNE", "UT-ENHANCE", "UT-TEMPLATE"]);
  assert.deepEqual(groups[1].tasks.map((task) => task.id), ["UT-CUTOUT", "UT-PORTRAIT"]);
  assert.deepEqual(groups[2].tasks.map((task) => task.id), ["CR1"]);
  assert.deepEqual(groups.map((group) => group.availableCount), [3, 2, 0]);
});

test("availability summary explains exactly what is available", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  }).filter((task) => task.id !== "UT-SOLID-BG");
  assert.equal(
    taskAvailabilitySummary(tasks),
    "当前有 5 个可用操作：本地 3 个，远程主体处理 2 个。创意生成：真实 AI 服务未配置。",
  );
});

test("an available creative service is reported without changing group order", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.AVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  }).filter((task) => task.id !== "UT-SOLID-BG");
  assert.match(taskAvailabilitySummary(tasks), /创意生成 1 个可用/);
  assert.deepEqual(groupTasksForDisplay(tasks).map((group) => group.id), ["local", "subject", "creative"]);
});

test("creative summary preserves checking and error states", () => {
  const checking = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.CHECKING,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  }).filter((task) => task.id !== "UT-SOLID-BG");
  const error = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.ERROR,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  }).filter((task) => task.id !== "UT-SOLID-BG");
  assert.match(taskAvailabilitySummary(checking), /正在检查真实 AI 服务/);
  assert.match(taskAvailabilitySummary(error), /真实 AI 服务暂不可用/);
});
