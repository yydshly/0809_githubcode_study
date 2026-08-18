const SKILLS = Object.freeze([
  Object.freeze({
    id: "privacy-friendly-share",
    taskId: "UT-PRIVACY-SHARE",
    order: -0.5,
    label: "隐私友好分享副本",
    summary: "清理文件 metadata、限制尺寸和体积；不会自动识别画面里的敏感内容。",
    initialSettings: Object.freeze({ ratio: "original", sizeMode: "custom", outputLongEdge: 1600, format: "jpeg" }),
    defaultBackground: "white",
    outputIntent: "metadata-clean-bounded-jpeg",
  }),
  Object.freeze({
    id: "upload-specification",
    taskId: "UT-UPLOAD",
    order: 0,
    label: "上传规格适配",
    summary: "把留白或裁剪、尺寸、JPEG 和体积上限组合成一次本地处理。",
    initialSettings: Object.freeze({ ratio: "original", sizeMode: "custom", outputLongEdge: 1600, format: "jpeg" }),
    defaultBackground: "white",
    outputIntent: "bounded-upload-jpeg",
  }),
  Object.freeze({
    id: "document-archive",
    taskId: "UT-DOC-ARCHIVE",
    order: 0.5,
    label: "文档归档 / 附件",
    summary: "四角裁正、文档增强、JPEG 和附件体积一次完成。",
    initialSettings: Object.freeze({ ratio: "original", sizeMode: "custom", outputLongEdge: 1600, format: "jpeg" }),
    defaultBackground: "white",
    outputIntent: "bounded-document-jpeg",
  }),
  Object.freeze({
    id: "product-white-background",
    taskId: "UT-PRODUCT",
    order: 1,
    label: "商品白底图",
    summary: "把商品整理为方形白底展示图，保留手动修边和尺寸检查。",
    initialSettings: Object.freeze({
      ratio: "square",
      cropX: 50,
      cropY: 50,
      sizeMode: "custom",
      outputLongEdge: 1600,
      format: "png",
    }),
    defaultBackground: "white",
    outputIntent: "opaque-jpeg",
  }),
  Object.freeze({
    id: "application-photo",
    taskId: "UT-PORTRAIT",
    order: 2,
    label: "报名照 / 底色头像",
    summary: "先确定人物构图，再抠图、修边并选择白色或其他纯色背景。",
    initialSettings: Object.freeze({
      ratio: "square",
      cropX: 50,
      cropY: 42,
      sizeMode: "preset",
      format: "png",
    }),
    defaultBackground: "white",
    outputIntent: "opaque-jpeg",
  }),
  Object.freeze({
    id: "social-layout",
    taskId: "UT-TEMPLATE",
    order: 3,
    label: "社交头像与封面",
    summary: "从方形、竖版、横版或竖屏构图开始，再按画面微调。",
    initialSettings: Object.freeze({
      ratio: "square",
      cropX: 50,
      cropY: 50,
      sizeMode: "custom",
      outputLongEdge: 1080,
      format: "png",
    }),
    defaultBackground: null,
    outputIntent: "png-or-jpeg",
  }),
  Object.freeze({
    id: "old-photo-restoration",
    taskId: "UT-OLD-PHOTO",
    order: 5,
    label: "老照片基础整理",
    summary: "先在本机改善褪色、轻微颗粒与层次；不补画缺失内容，也不上传照片。",
    initialSettings: Object.freeze({
      ratio: "original",
      cropX: 50,
      cropY: 50,
      brightness: 4,
      contrast: 12,
      saturation: 3,
      denoise: 18,
      clarity: 14,
      sizeMode: "preset",
      format: "png",
    }),
    defaultBackground: null,
    outputIntent: "local-restoration-copy",
  }),
  Object.freeze({
    id: "social-grid-split",
    taskId: "UT-GRID",
    order: 4,
    label: "社交九宫格切图",
    summary: "先确定方形保留区域，再按发布顺序生成九张独立图片。",
    initialSettings: Object.freeze({
      ratio: "square",
      cropX: 50,
      cropY: 50,
      sizeMode: "custom",
      outputLongEdge: 1080,
      format: "png",
    }),
    defaultBackground: null,
    outputIntent: "nine-square-png-zip",
  }),
]);

export const SCENARIO_SKILLS = SKILLS;

export function scenarioSkillForTask(taskId) {
  return SKILLS.find((skill) => skill.taskId === taskId) ?? null;
}

export function scenarioInitialSettings(taskId) {
  const skill = scenarioSkillForTask(taskId);
  return skill?.initialSettings ? { ...skill.initialSettings } : null;
}

export function decorateScenarioTask(task) {
  const skill = scenarioSkillForTask(task?.id);
  if (!skill) return task;
  return Object.freeze({
    ...task,
    scenarioSkillId: skill.id,
    scenarioOrder: skill.order,
    scenarioSummary: skill.summary,
    defaultBackground: skill.defaultBackground,
  });
}
