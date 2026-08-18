import assert from "node:assert/strict";
import test from "node:test";

import { TASK_GOALS, taskGoalEntries } from "../web/task-goals.js";

test("problem-first navigation maps each common need to one explicit task", () => {
  assert.deepEqual(TASK_GOALS.map(({ taskId }) => taskId), ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-TUNE", "UT-RECTIFY", "UT-DOC-ARCHIVE", "UT-ENHANCE", "UT-CUTOUT"]);
  assert.equal(new Set(TASK_GOALS.map(({ id }) => id)).size, TASK_GOALS.length);
});

test("goal entries preserve unavailable provider truth instead of hiding it", () => {
  const entries = taskGoalEntries([
    { id: "UT-COMPRESS", runnable: true, statusLabel: "可运行" },
    { id: "UT-CUTOUT", runnable: false, statusLabel: "抠图服务未配置" },
  ]);
  assert.equal(entries.find((entry) => entry.taskId === "UT-COMPRESS").status, "直接打开");
  assert.deepEqual(entries.find((entry) => entry.taskId === "UT-CUTOUT"), {
    id: "remove-background",
    label: "需要去背景",
    detail: "透明抠图",
    taskId: "UT-CUTOUT",
    available: false,
    status: "抠图服务未配置",
  });
});
