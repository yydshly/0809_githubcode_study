import { decorateScenarioTask } from "./scenario-skills.js";

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
    id: "UT-PRIVACY-SHARE",
    label: "隐私友好分享副本",
    description: "在本机清理文件 metadata，并控制 JPEG 尺寸与体积；不会识别画面中的敏感内容。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-privacy-share-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-UPLOAD",
    label: "上传规格适配",
    description: "一次设置完整保留或裁剪、目标比例、最长边和文件上限，生成并核对可上传 JPEG。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-upload-specification-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-DOC-ARCHIVE",
    label: "文档归档 / 附件",
    description: "手动选四角裁正纸张，选择清晰彩色、灰度或黑白，再压缩为可上传 JPEG。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-document-archive-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-TUNE",
    label: "基础编辑",
    description: "在浏览器中完成裁剪、旋转、拉直、透视与光色调整，不重建主体。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-fidelity-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-COMPRESS",
    label: "图片压缩",
    description: "图片太大无法上传或发送时，设置目标文件上限；系统保持原图比例并自动压缩到尽可能达标。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-image-compression-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-CONVERT",
    label: "图片格式转换",
    description: "在 PNG 与 JPEG 之间转换；明确透明区域、JPEG 质量和文件大小变化。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-format-conversion-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-FIT",
    label: "完整图片适配",
    description: "把整张图片放进方形、竖版或横版画布，通过留白适配比例，不裁掉内容。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-canvas-fit-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-RECTIFY",
    label: "文档 / 平面裁正",
    description: "手动选四角拉正纸张、海报、画框或包装正面；文档可按需增强可读性。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-plane-rectification-v3",
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
    label: "社交头像与封面",
    description: "选择常用社交构图比例与导出上限，再按画面内容微调。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-scene-template-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-OLD-PHOTO",
    label: "老照片基础整理",
    description: "在浏览器中改善褪色与层次，支持裁正、黑白和导出；不会补画缺失细节。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-old-photo-restoration-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-GRID",
    label: "社交九宫格切图",
    description: "先裁出方形画面，再在本机生成按发布顺序排列的九张图片和 ZIP。",
    family: "utility",
    executor: TASK_EXECUTOR.LOCAL,
    contractVersion: "local-social-grid-v1",
    requiresConfig: false,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "CR-RESTORE",
    label: "AI 老照片修复（实验）",
    description: "使用远程图片编辑生成修复副本；人物、文字与历史细节仍需逐项比较。",
    family: "creative",
    executor: TASK_EXECUTOR.AI,
    contractVersion: "generative-old-photo-restoration-v1",
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
    id: "UT-PRODUCT",
    label: "商品白底图",
    description: "先整理商品构图，再远程移除背景并在本机修边、合成白底。",
    family: "utility",
    executor: TASK_EXECUTOR.BACKGROUND_REMOVAL,
    contractVersion: "product-white-background-v1",
    requiresConfig: true,
    requiresAdultAttestation: false,
  }),
  Object.freeze({
    id: "UT-PORTRAIT",
    label: "报名照 / 底色头像",
    description: "先在本机确定人物构图，再远程移除背景并在本机修边、换底。",
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
 * - local fidelity, natural enhancement and social layout are always runnable;
 * - local old-photo cleanup and social-grid split remain runnable without any remote provider;
 * - the real AI task follows the observed service status;
 * - remote cutout follows its independently observed provider status;
 * - product and portrait scenarios reuse the independently observed background-removal service;
 * - the standalone background task remains unverified because the same capability is
 *   already exposed inside the cutout result workspace.
 */
export function getTaskCatalog({
  aiStatus = AI_SERVICE_STATUS.CHECKING,
  backgroundRemovalStatus = AI_SERVICE_STATUS.CHECKING,
} = {}) {
  const normalizedStatus = normalizeAiServiceStatus(aiStatus);
  const normalizedBackgroundRemovalStatus = normalizeAiServiceStatus(backgroundRemovalStatus);
  return BASE_TASKS.map((task) => decorateScenarioTask(resolveTask(
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

