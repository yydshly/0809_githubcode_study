import assert from "node:assert/strict";
import test from "node:test";

import { AI_SERVICE_STATUS } from "../web/task-catalog.js";
import {
  PRODUCT_TASK_ORDER,
  buildProductTaskCatalog,
  resetSourceSessionState,
  selectRunnableTask,
  taskRuntimeFlags,
} from "../web/source-task-controller.js";

test("runtime flags keep local, cutout, composed and remote responsibilities explicit", () => {
  assert.deepEqual(taskRuntimeFlags("UT-TUNE"), { execution: "local", backgroundRemoval: false, composedBackground: false, rectification: false, editor: true, localEditor: true, remoteExecution: false });
  assert.deepEqual(taskRuntimeFlags("UT-CUTOUT"), { execution: "background-removal", backgroundRemoval: true, composedBackground: false, rectification: false, editor: false, localEditor: false, remoteExecution: true });
  assert.deepEqual(taskRuntimeFlags("UT-PRODUCT"), { execution: "background-removal", backgroundRemoval: true, composedBackground: true, rectification: false, editor: true, localEditor: false, remoteExecution: true });
  assert.deepEqual(taskRuntimeFlags("UT-RECTIFY"), { execution: "local", backgroundRemoval: false, composedBackground: false, rectification: true, editor: true, localEditor: true, remoteExecution: false });
  assert.equal(taskRuntimeFlags("missing").execution, null);
});

test("product catalog owns one stable order and excludes the historical solid-background task", () => {
  const catalog = buildProductTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
    taskCopyById: { "UT-TUNE": { title: "可读基础编辑" } },
  });
  assert.deepEqual(catalog.map((task) => task.id), PRODUCT_TASK_ORDER);
  assert.equal(catalog.find((task) => task.id === "UT-TUNE").title, "可读基础编辑");
  assert.equal(catalog.some((task) => task.id === "UT-SOLID-BG"), false);
});

test("selection accepts only current runnable catalog entries", () => {
  const catalog = buildProductTaskCatalog({ aiStatus: AI_SERVICE_STATUS.UNAVAILABLE, backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE });
  assert.equal(selectRunnableTask(catalog, "UT-TUNE").id, "UT-TUNE");
  assert.equal(selectRunnableTask(catalog, "UT-CUTOUT"), null);
  assert.equal(selectRunnableTask(catalog, "missing"), null);
  assert.equal(selectRunnableTask(null, "UT-TUNE"), null);
});

test("source reset preserves monotonic revision and retired run identities only", () => {
  const reset = resetSourceSessionState({ sourceRevision: 7, supersededRunIds: ["run-old"], detachedRunIds: ["run-unknown"], source: { hash: "must-clear" }, selectedTask: { id: "UT-TUNE" } });
  assert.equal(reset.status, "EMPTY");
  assert.equal(reset.sourceRevision, 7);
  assert.deepEqual(reset.supersededRunIds, ["run-old"]);
  assert.deepEqual(reset.detachedRunIds, ["run-unknown"]);
  assert.equal(reset.source, null);
  assert.equal(reset.selectedTask, null);
  assert.throws(() => resetSourceSessionState(null), /machine is required/);
});
