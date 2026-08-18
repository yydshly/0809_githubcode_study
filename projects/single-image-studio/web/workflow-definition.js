export const WORKFLOW_EXECUTION = Object.freeze({
  LOCAL: "local",
  AI: "ai",
  BACKGROUND_REMOVAL: "background-removal",
  GENERATIVE: "generative",
  UNVERIFIED: "unverified",
});

const REQUIRED_KEYS = Object.freeze([
  "id",
  "version",
  "usesEditor",
  "execution",
  "prerequisites",
  "parameterContract",
  "steps",
  "outputs",
  "checks",
  "errorBoundary",
  "recovery",
]);

function nonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field}必须是非空字符串`);
  return value;
}

function uniqueStrings(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field}必须是非空字符串数组`);
  const items = value.map((item) => nonEmptyString(item, field));
  if (new Set(items).size !== items.length) throw new TypeError(`${field}不能包含重复项`);
  return Object.freeze(items);
}

export function defineWorkflowDefinition(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("工作流定义必须是对象");
  const keys = Object.keys(input).sort();
  const expected = [...REQUIRED_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError("工作流定义字段不完整或包含未知字段");
  }
  if (typeof input.usesEditor !== "boolean") throw new TypeError("usesEditor 必须是布尔值");
  if (!Object.values(WORKFLOW_EXECUTION).includes(input.execution)) throw new TypeError("工作流执行方式无效");
  return Object.freeze({
    id: nonEmptyString(input.id, "id"),
    version: nonEmptyString(input.version, "version"),
    usesEditor: input.usesEditor,
    execution: input.execution,
    prerequisites: uniqueStrings(input.prerequisites, "prerequisites"),
    parameterContract: nonEmptyString(input.parameterContract, "parameterContract"),
    steps: uniqueStrings(input.steps, "steps"),
    outputs: uniqueStrings(input.outputs, "outputs"),
    checks: uniqueStrings(input.checks, "checks"),
    errorBoundary: nonEmptyString(input.errorBoundary, "errorBoundary"),
    recovery: nonEmptyString(input.recovery, "recovery"),
  });
}

export const UPLOAD_SPECIFICATION_WORKFLOW = defineWorkflowDefinition({
  id: "UT-UPLOAD",
  version: "workflow-definition.v1",
  usesEditor: true,
  execution: WORKFLOW_EXECUTION.LOCAL,
  prerequisites: ["source-confirmed", "local-image-decodable"],
  parameterContract: "local-upload-specification-v1",
  steps: ["geometry", "resize", "jpeg-encode", "compress-to-limit", "reopen-and-verify"],
  outputs: ["bounded-upload-jpeg"],
  checks: ["mime", "dimensions", "byte-limit", "content-policy"],
  errorBoundary: "fail-before-download",
  recovery: "adjust-settings",
});

export const DOCUMENT_ARCHIVE_WORKFLOW = defineWorkflowDefinition({
  id: "UT-DOC-ARCHIVE",
  version: "workflow-definition.v1",
  usesEditor: true,
  execution: WORKFLOW_EXECUTION.LOCAL,
  prerequisites: ["source-confirmed", "local-image-decodable"],
  parameterContract: "local-document-archive-v1",
  steps: ["manual-rectification", "document-effect", "jpeg-encode", "compress-to-limit", "reopen-and-verify"],
  outputs: ["bounded-document-jpeg"],
  checks: ["rectification", "mime", "dimensions", "byte-limit", "pixel-reopen"],
  errorBoundary: "fail-before-download",
  recovery: "adjust-settings",
});

export const PRIVACY_SHARE_WORKFLOW = defineWorkflowDefinition({
  id: "UT-PRIVACY-SHARE",
  version: "workflow-definition.v1",
  usesEditor: true,
  execution: WORKFLOW_EXECUTION.LOCAL,
  prerequisites: ["source-confirmed", "local-image-decodable"],
  parameterContract: "local-privacy-share-v1",
  steps: ["preserve-whole-image", "resize", "jpeg-encode", "compress-to-limit", "metadata-and-pixel-verify"],
  outputs: ["metadata-clean-bounded-jpeg"],
  checks: ["mime", "dimensions", "byte-limit", "private-metadata", "pixel-reopen"],
  errorBoundary: "fail-before-download",
  recovery: "adjust-settings",
});

const DEFINITIONS = new Map([
  [UPLOAD_SPECIFICATION_WORKFLOW.id, UPLOAD_SPECIFICATION_WORKFLOW],
  [DOCUMENT_ARCHIVE_WORKFLOW.id, DOCUMENT_ARCHIVE_WORKFLOW],
  [PRIVACY_SHARE_WORKFLOW.id, PRIVACY_SHARE_WORKFLOW],
]);

export function workflowDefinitionForTask(taskId) {
  return DEFINITIONS.get(taskId) ?? null;
}

function runtimeProfile(id, execution, { usesEditor = false, composedBackground = false, rectification = false } = {}) {
  return Object.freeze({ id, execution, usesEditor, composedBackground, rectification });
}

export const TASK_RUNTIME_PROFILES = Object.freeze([
  ...["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-GRID"]
    .map((id) => runtimeProfile(id, WORKFLOW_EXECUTION.LOCAL, {
      usesEditor: true,
      rectification: ["UT-DOC-ARCHIVE", "UT-RECTIFY"].includes(id),
    })),
  runtimeProfile("CR-RESTORE", WORKFLOW_EXECUTION.AI),
  runtimeProfile("CR1", WORKFLOW_EXECUTION.AI),
  runtimeProfile("UT-CUTOUT", WORKFLOW_EXECUTION.BACKGROUND_REMOVAL),
  runtimeProfile("UT-PRODUCT", WORKFLOW_EXECUTION.BACKGROUND_REMOVAL, { usesEditor: true, composedBackground: true }),
  runtimeProfile("UT-PORTRAIT", WORKFLOW_EXECUTION.BACKGROUND_REMOVAL, { usesEditor: true, composedBackground: true }),
]);

const RUNTIME_PROFILE_BY_ID = new Map(TASK_RUNTIME_PROFILES.map((profile) => [profile.id, profile]));

export function taskRuntimeProfile(taskId) {
  return RUNTIME_PROFILE_BY_ID.get(taskId) ?? null;
}
