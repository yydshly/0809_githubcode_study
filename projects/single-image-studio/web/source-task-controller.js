import { createInitialState } from "./state-machine.js";
import { getTaskCatalog } from "./task-catalog.js";
import { WORKFLOW_EXECUTION, taskRuntimeProfile } from "./workflow-definition.js";

export const PRODUCT_TASK_ORDER = Object.freeze([
  "UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-PRODUCT", "UT-PORTRAIT",
  "UT-TEMPLATE", "UT-GRID", "UT-OLD-PHOTO", "UT-COMPRESS", "UT-CONVERT", "UT-FIT",
  "UT-RECTIFY", "UT-TUNE", "UT-ENHANCE", "UT-CUTOUT", "CR-RESTORE", "CR1",
]);

export function taskRuntimeFlags(taskId) {
  const profile = typeof taskId === "string" ? taskRuntimeProfile(taskId) : null;
  const execution = profile?.execution ?? null;
  return Object.freeze({
    execution,
    backgroundRemoval: execution === WORKFLOW_EXECUTION.BACKGROUND_REMOVAL,
    composedBackground: profile?.composedBackground === true,
    rectification: profile?.rectification === true,
    editor: profile?.usesEditor === true,
    localEditor: profile?.usesEditor === true && execution === WORKFLOW_EXECUTION.LOCAL,
    remoteExecution: [WORKFLOW_EXECUTION.BACKGROUND_REMOVAL, WORKFLOW_EXECUTION.AI].includes(execution),
  });
}

function presentTask(task, taskCopyById) {
  const copy = taskCopyById?.[task.id] ?? {
    title: task.label,
    badge: task.statusLabel,
    kind: task.family,
    description: task.description,
    longDescription: task.description,
    preserve: "来源图的任务事实",
    change: "任务合同允许的区域",
    output: "图片结果",
    referenceTitle: "任务方法",
    referenceCopy: task.description,
  };
  return { ...task, ...copy };
}

export function buildProductTaskCatalog({ aiStatus, backgroundRemovalStatus, taskCopyById = {} } = {}) {
  const catalog = getTaskCatalog({ aiStatus, backgroundRemovalStatus }).map((task) => presentTask(task, taskCopyById));
  return PRODUCT_TASK_ORDER.map((id) => catalog.find((task) => task.id === id)).filter(Boolean);
}

export function selectRunnableTask(tasks, taskId) {
  if (!Array.isArray(tasks) || typeof taskId !== "string") return null;
  const selected = tasks.find((task) => task.id === taskId) ?? null;
  return selected?.runnable === true ? selected : null;
}

export function resetSourceSessionState(machine) {
  if (!machine || typeof machine !== "object") throw new TypeError("machine is required");
  const initial = createInitialState();
  return {
    ...initial,
    sourceRevision: Number.isInteger(machine.sourceRevision) ? machine.sourceRevision : 0,
    supersededRunIds: Array.isArray(machine.supersededRunIds) ? machine.supersededRunIds : [],
    detachedRunIds: Array.isArray(machine.detachedRunIds) ? machine.detachedRunIds : [],
  };
}
