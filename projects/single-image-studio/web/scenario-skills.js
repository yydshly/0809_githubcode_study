const SKILLS = Object.freeze([
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
]);

export const SCENARIO_SKILLS = SKILLS;

export function scenarioSkillForTask(taskId) {
  return SKILLS.find((skill) => skill.taskId === taskId) ?? null;
}

export function scenarioInitialSettings(taskId) {
  const skill = scenarioSkillForTask(taskId);
  return skill ? { ...skill.initialSettings } : null;
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
