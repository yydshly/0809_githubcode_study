import assert from "node:assert/strict";
import test from "node:test";

import { AI_SERVICE_STATUS, getTaskCatalog } from "../web/task-catalog.js";
import {
  DOCUMENT_ARCHIVE_WORKFLOW,
  PRIVACY_SHARE_WORKFLOW,
  TASK_RUNTIME_PROFILES,
  UPLOAD_SPECIFICATION_WORKFLOW,
  WORKFLOW_EXECUTION,
  defineWorkflowDefinition,
  taskRuntimeProfile,
  workflowDefinitionForTask,
} from "../web/workflow-definition.js";

test("upload specification is the first strict local workflow definition", () => {
  assert.equal(workflowDefinitionForTask("UT-UPLOAD"), UPLOAD_SPECIFICATION_WORKFLOW);
  assert.equal(UPLOAD_SPECIFICATION_WORKFLOW.execution, WORKFLOW_EXECUTION.LOCAL);
  assert.equal(UPLOAD_SPECIFICATION_WORKFLOW.usesEditor, true);
  assert.equal(UPLOAD_SPECIFICATION_WORKFLOW.parameterContract, "local-upload-specification-v1");
  assert.deepEqual(UPLOAD_SPECIFICATION_WORKFLOW.steps, [
    "geometry",
    "resize",
    "jpeg-encode",
    "compress-to-limit",
    "reopen-and-verify",
  ]);
  assert.deepEqual(UPLOAD_SPECIFICATION_WORKFLOW.outputs, ["bounded-upload-jpeg"]);
  assert.deepEqual(UPLOAD_SPECIFICATION_WORKFLOW.checks, ["mime", "dimensions", "byte-limit", "content-policy"]);
  assert.equal(workflowDefinitionForTask("UT-TUNE"), null);
  assert.equal(Object.isFrozen(UPLOAD_SPECIFICATION_WORKFLOW), true);
  assert.equal(Object.isFrozen(UPLOAD_SPECIFICATION_WORKFLOW.steps), true);
});

test("document archive reuses the strict local contract without hiding rectification or attachment checks", () => {
  assert.equal(workflowDefinitionForTask("UT-DOC-ARCHIVE"), DOCUMENT_ARCHIVE_WORKFLOW);
  assert.equal(DOCUMENT_ARCHIVE_WORKFLOW.execution, WORKFLOW_EXECUTION.LOCAL);
  assert.equal(DOCUMENT_ARCHIVE_WORKFLOW.parameterContract, "local-document-archive-v1");
  assert.deepEqual(DOCUMENT_ARCHIVE_WORKFLOW.steps, [
    "manual-rectification",
    "document-effect",
    "jpeg-encode",
    "compress-to-limit",
    "reopen-and-verify",
  ]);
  assert.deepEqual(DOCUMENT_ARCHIVE_WORKFLOW.outputs, ["bounded-document-jpeg"]);
  assert.deepEqual(DOCUMENT_ARCHIVE_WORKFLOW.checks, ["rectification", "mime", "dimensions", "byte-limit", "pixel-reopen"]);
});

test("privacy share freezes metadata, size and pixel checks as one local workflow", () => {
  assert.equal(workflowDefinitionForTask("UT-PRIVACY-SHARE"), PRIVACY_SHARE_WORKFLOW);
  assert.equal(PRIVACY_SHARE_WORKFLOW.parameterContract, "local-privacy-share-v1");
  assert.deepEqual(PRIVACY_SHARE_WORKFLOW.steps, ["preserve-whole-image", "resize", "jpeg-encode", "compress-to-limit", "metadata-and-pixel-verify"]);
  assert.deepEqual(PRIVACY_SHARE_WORKFLOW.checks, ["mime", "dimensions", "byte-limit", "private-metadata", "pixel-reopen"]);
});

test("workflow definitions reject partial, open, duplicate and invalid execution shapes", () => {
  const valid = { ...UPLOAD_SPECIFICATION_WORKFLOW, id: "UT-EXAMPLE" };
  assert.equal(defineWorkflowDefinition(valid).id, "UT-EXAMPLE");
  assert.throws(() => defineWorkflowDefinition({ ...valid, unknown: true }), /字段不完整或包含未知字段/);
  const { recovery: _removed, ...partial } = valid;
  assert.throws(() => defineWorkflowDefinition(partial), /字段不完整或包含未知字段/);
  assert.throws(() => defineWorkflowDefinition({ ...valid, steps: ["decode", "decode"] }), /不能包含重复项/);
  assert.throws(() => defineWorkflowDefinition({ ...valid, execution: "magic" }), /执行方式无效/);
  assert.throws(() => defineWorkflowDefinition({ ...valid, usesEditor: "yes" }), /usesEditor/);
});

test("migrated workflow parameter contracts match the runnable task catalog identities", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  for (const definition of [PRIVACY_SHARE_WORKFLOW, UPLOAD_SPECIFICATION_WORKFLOW, DOCUMENT_ARCHIVE_WORKFLOW]) {
    const task = catalog.find((entry) => entry.id === definition.id);
    assert.ok(task, `${definition.id} must remain registered`);
    assert.equal(task.runnable, true);
    assert.equal(task.contractVersion, definition.parameterContract);
  }
});

test("one runtime profile owns task execution and editor classifications for the complete catalog", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  assert.equal(TASK_RUNTIME_PROFILES.length, catalog.length);
  assert.equal(new Set(TASK_RUNTIME_PROFILES.map((profile) => profile.id)).size, catalog.length);
  for (const task of catalog) {
    const profile = taskRuntimeProfile(task.id);
    assert.ok(profile, `${task.id} must have one runtime profile`);
    assert.equal(profile.execution, task.executor, `${task.id} executor drift`);
    assert.equal(Object.isFrozen(profile), true);
  }
  assert.equal(taskRuntimeProfile("UT-UPLOAD").usesEditor, true);
  assert.equal(taskRuntimeProfile("UT-DOC-ARCHIVE").rectification, true);
  assert.equal(taskRuntimeProfile("UT-PRODUCT").composedBackground, true);
  assert.equal(taskRuntimeProfile("UT-CUTOUT").usesEditor, false);
  assert.equal(taskRuntimeProfile("missing-task"), null);
});
