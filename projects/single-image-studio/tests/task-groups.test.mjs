import test from "node:test";
import assert from "node:assert/strict";
import { getTaskCatalog, AI_SERVICE_STATUS } from "../web/task-catalog.js";
import { groupTasksForDisplay, partitionTasksForDisplay, taskAvailabilitySummary } from "../web/task-groups.js";

test("task groups put user scenarios before free tools and creative operations", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  });
  const groups = groupTasksForDisplay(tasks);
  assert.deepEqual(groups.map((group) => group.id), ["scenarios", "tools", "creative"]);
  assert.deepEqual(groups[0].tasks.map((task) => task.id), ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-PRODUCT", "UT-PORTRAIT", "UT-TEMPLATE", "UT-GRID", "UT-OLD-PHOTO"]);
  assert.deepEqual(groups[1].tasks.map((task) => task.id), ["UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-CUTOUT"]);
  assert.deepEqual(groups[2].tasks.map((task) => task.id), ["CR-RESTORE", "CR1"]);
  assert.deepEqual(groups.map((group) => group.availableCount), [8, 7, 0]);
  assert.equal("matches" in groups[0], false);
  assert.equal("sort" in groups[0], false);
});

test("availability summary explains exactly what is available", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  });
  assert.equal(
    taskAvailabilitySummary(tasks),
    "当前有 15 个可用操作：实际用途 8 个，自由工具 7 个。2 项未连接扩展已收在页尾，不影响当前操作。",
  );
});

test("main task sections contain only runnable work and retain unavailable extensions separately", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  });
  const partition = partitionTasksForDisplay(tasks);
  assert.deepEqual(partition.activeGroups.map((group) => group.id), ["scenarios", "tools"]);
  assert.equal(partition.activeGroups.flatMap((group) => group.tasks).every((task) => task.runnable), true);
  assert.deepEqual(partition.unavailableTasks.map((task) => task.id), ["CR-RESTORE", "CR1"]);
});

test("an available creative service is reported without changing group order", () => {
  const tasks = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.AVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  assert.match(taskAvailabilitySummary(tasks), /创意生成 2 个/);
  assert.deepEqual(groupTasksForDisplay(tasks)[0].tasks.map((task) => task.id), ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-PRODUCT", "UT-PORTRAIT", "UT-TEMPLATE", "UT-GRID", "UT-OLD-PHOTO"]);
  assert.deepEqual(groupTasksForDisplay(tasks).map((group) => group.id), ["scenarios", "tools", "creative"]);
  assert.deepEqual(partitionTasksForDisplay(tasks).activeGroups.map((group) => group.id), ["scenarios", "tools", "creative"]);
});

test("checking and error states remain compact unavailable extensions", () => {
  const checking = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.CHECKING,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  const error = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.ERROR,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  assert.match(taskAvailabilitySummary(checking), /5 项未连接扩展已收在页尾/);
  assert.match(taskAvailabilitySummary(error), /5 项未连接扩展已收在页尾/);
  assert.equal(partitionTasksForDisplay(checking).unavailableTasks.length, 5);
  assert.equal(partitionTasksForDisplay(error).unavailableTasks.length, 5);
});
