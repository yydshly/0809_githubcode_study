export const AI_SERVICE_STATUS = Object.freeze({
  CHECKING: "checking",
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  ERROR: "error",
});

export const TASK_AVAILABILITY = Object.freeze({
  AVAILABLE: "available",
  CHECKING: "checking",
  UNAVAILABLE: "unavailable",
  VALIDATING: "validating",
});

export const TASK_EXECUTOR = Object.freeze({
  LOCAL: "local",
  AI: "ai",
  BACKGROUND_REMOVAL: "background-removal",
  UNVERIFIED: "unverified",
});

const BASE_TASKS = Object.freeze([
  Object.freeze({
    id: "UT-TUNE",
    label: "保真整理",
    description: "在浏览器中确定性整理画布与光色，不重建主体。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-fidelity-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-ENHANCE",
    label: "自然增强",
    description: "使用克制的本地光色预设改善观感，也可继续手动微调。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-natural-enhancement-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-TEMPLATE",
    label: "场景尺寸模板",
    description: "选择常用构图比例与导出上限，再按画面内容微调。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-scene-template-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "CR1",
    label: "AI 创意改造",
    description: "使用真实 AI 服务生成创意结果；服务不可用时不生成替代品。",
    family: "creative",
    executor: TASK_EXECUTOR.AI,
    contractVersion: "creative-ai-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-CUTOUT",
    label: "透明抠图",
    description: "由远程抠图服务识别主体，输出带真实 Alpha 的透明 PNG。",
    family: "utility",
    executor: TASK_EXECUTOR.BACKGROUND_REMOVAL,
    contractVersion: "remote-cutout-v1",
    requiresConfig: true,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-SOLID-BG",
    label: "纯色换底",
    description: "复用经过验证的 Alpha，并确定性合成指定纯色。",
    family: "utility",
    executor: TASK_EXECUTOR.UNVERIFIED,
    contractVersion: "solid-bg-v1-draft",
    requiresConfig: true,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-PORTRAIT",
    label: "通用底色头像",
    description: "先在本机确定方形或 4:5 构图，再远程移除背景并在本机换底。",
    family: "utility",
    executor: TASK_EXECUTOR.BACKGROUND_REMOVAL,
    contractVersion: "portrait-background-v1",
    requiresConfig: true,
    requiresAdultAttestation: false,
  }),
]);

export function normalizeAiServiceStatus(value) {
  if (typeof value === "object" && value !== null) {
    if (typeof value.status === "string") {
      return normalizeAiServiceStatus(value.status);
    }
    if (value.available === true) return AI_SERVICE_STATUS.AVAILABLE;
    if (value.available === false || value.configured === false) {
      return AI_SERVICE_STATUS.UNAVAILABLE;
    }
  }

  const status = String(value ?? AI_SERVICE_STATUS.CHECKING).trim().toLowerCase();
  return Object.values(AI_SERVICE_STATUS).includes(status)
    ? status
    : AI_SERVICE_STATUS.ERROR;
}

function aiAvailability(status) {
  switch (status) {
    case AI_SERVICE_STATUS.AVAILABLE:
      return {
        availability: TASK_AVAILABILITY.AVAILABLE,
        runnable: true,
        statusLabel: "可运行",
        disabledReason: null,
      };
    case AI_SERVICE_STATUS.CHECKING:
      return {
        availability: TASK_AVAILABILITY.CHECKING,
        runnable: false,
        statusLabel: "正在检查真实 AI 服务",
        disabledReason: "AI_SERVICE_CHECKING",
      };
    case AI_SERVICE_STATUS.UNAVAILABLE:
      return {
        availability: TASK_AVAILABILITY.UNAVAILABLE,
        runnable: false,
        statusLabel: "真实 AI 服务未配置",
        disabledReason: "AI_SERVICE_UNAVAILABLE",
      };
    default:
      return {
        availability: TASK_AVAILABILITY.UNAVAILABLE,
        runnable: false,
        statusLabel: "真实 AI 服务暂不可用",
        disabledReason: "AI_SERVICE_ERROR",
      };
  }
}

function backgroundRemovalAvailability(status) {
  switch (status) {
    case AI_SERVICE_STATUS.AVAILABLE:
      return {
        availability: TASK_AVAILABILITY.AVAILABLE,
        runnable: true,
        statusLabel: "可运行 · 远程处理",
        disabledReason: null,
      };
    case AI_SERVICE_STATUS.CHECKING:
      return {
        availability: TASK_AVAILABILITY.CHECKING,
        runnable: false,
        statusLabel: "正在检查抠图服务",
        disabledReason: "BACKGROUND_REMOVAL_CHECKING",
      };
    case AI_SERVICE_STATUS.UNAVAILABLE:
      return {
        availability: TASK_AVAILABILITY.UNAVAILABLE,
        runnable: false,
        statusLabel: "抠图服务未配置",
        disabledReason: "BACKGROUND_REMOVAL_UNAVAILABLE",
      };
    default:
      return {
        availability: TASK_AVAILABILITY.UNAVAILABLE,
        runnable: false,
        statusLabel: "抠图服务暂不可用",
        disabledReason: "BACKGROUND_REMOVAL_ERROR",
      };
  }
}

function resolveTask(task, aiStatus, backgroundRemovalStatus) {
  if (task.executor === TASK_EXECUTOR.LOCAL) {
    return {
      ...task,
      availability: TASK_AVAILABILITY.AVAILABLE,
      runnable: true,
      statusLabel: "可运行 · 本地处理",
      disabledReason: null,
    };
  }
  if (task.executor === TASK_EXECUTOR.AI) {
    return { ...task, ...aiAvailability(aiStatus) };
  }
  if (task.executor === TASK_EXECUTOR.BACKGROUND_REMOVAL) {
    return { ...task, ...backgroundRemovalAvailability(backgroundRemovalStatus) };
  }
  return {
    ...task,
    availability: TASK_AVAILABILITY.VALIDATING,
    runnable: false,
    statusLabel: "能力验证中",
    disabledReason: "CAPABILITY_VALIDATION_PENDING",
  };
}

/**
 * Runtime catalog policy:
 * - local fidelity, natural enhancement and scene templates are always runnable;
 * - the real AI task follows the observed service status;
 * - remote cutout follows its independently observed provider status;
 * - the portrait workflow reuses the independently observed background-removal service;
 * - the standalone background task remains unverified because the same capability is
 *   already exposed inside the cutout result workspace.
 */
export function getTaskCatalog({
  aiStatus = AI_SERVICE_STATUS.CHECKING,
  backgroundRemovalStatus = AI_SERVICE_STATUS.CHECKING,
} = {}) {
  const normalizedStatus = normalizeAiServiceStatus(aiStatus);
  const normalizedBackgroundRemovalStatus = normalizeAiServiceStatus(backgroundRemovalStatus);
  return BASE_TASKS.map((task) => Object.freeze(resolveTask(
    task,
    normalizedStatus,
    normalizedBackgroundRemovalStatus,
  )));
}

export function getRunnableTasks(options = {}) {
  return getTaskCatalog(options).filter((task) => task.runnable);
}

export function getTaskById(taskId, options = {}) {
  return getTaskCatalog(options).find((task) => task.id === taskId) ?? null;
}

export function getRecommendedTasks({ limit = 4, ...options } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError("recommendation limit must be a positive safe integer");
  }
  const tasks = getTaskCatalog(options);
  const rank = new Map([
    [TASK_AVAILABILITY.AVAILABLE, 0],
    [TASK_AVAILABILITY.CHECKING, 1],
    [TASK_AVAILABILITY.VALIDATING, 2],
    [TASK_AVAILABILITY.UNAVAILABLE, 3],
  ]);
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => (
      rank.get(left.task.availability) - rank.get(right.task.availability)
      || left.index - right.index
    ))
    .slice(0, limit)
    .map(({ task }) => task);
}

