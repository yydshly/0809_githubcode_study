import { TASK_EXECUTOR } from "./task-catalog.js";

const DISPLAY_GROUPS = Object.freeze([
  Object.freeze({
    id: "scenarios",
    title: "按实际用途开始",
    description: "场景技能会组合现有构图、抠图、换底和导出能力；每一步仍可检查和微调。",
    matches: (task) => Boolean(task.scenarioSkillId),
    sort: (left, right) => left.scenarioOrder - right.scenarioOrder,
  }),
  Object.freeze({
    id: "tools",
    title: "自由调整工具",
    description: "不使用场景起点，直接选择本地整理、自然增强或透明抠图。",
    matches: (task) => !task.scenarioSkillId && [TASK_EXECUTOR.LOCAL, TASK_EXECUTOR.BACKGROUND_REMOVAL].includes(task.executor),
  }),
  Object.freeze({
    id: "creative",
    title: "创意生成",
    description: "会重建画面内容；真实创意服务未配置时保持不可选。",
    matches: (task) => task.executor === TASK_EXECUTOR.AI,
  }),
]);

export function groupTasksForDisplay(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  const claimed = new Set();
  const groups = DISPLAY_GROUPS.map((group) => {
    const groupedTasks = tasks.filter(group.matches).sort(group.sort);
    groupedTasks.forEach((task) => claimed.add(task.id));
    const { matches: _matches, sort: _sort, ...presentation } = group;
    return Object.freeze({
      ...presentation,
      tasks: Object.freeze(groupedTasks),
      availableCount: groupedTasks.filter((task) => task.runnable).length,
    });
  }).filter((group) => group.tasks.length > 0);

  const ungrouped = tasks.filter((task) => !claimed.has(task.id));
  if (ungrouped.length > 0) {
    groups.push(Object.freeze({
      id: "other",
      title: "其他操作",
      description: "尚未归入固定处理类型的操作。",
      tasks: Object.freeze(ungrouped),
      availableCount: ungrouped.filter((task) => task.runnable).length,
    }));
  }
  return Object.freeze(groups);
}

export function taskAvailabilitySummary(tasks) {
  const groups = groupTasksForDisplay(tasks);
  const totalAvailable = tasks.filter((task) => task.runnable).length;
  const scenarios = groups.find((group) => group.id === "scenarios")?.availableCount ?? 0;
  const tools = groups.find((group) => group.id === "tools")?.availableCount ?? 0;
  const creative = groups.find((group) => group.id === "creative");
  const creativeCopy = creative?.availableCount
    ? `创意生成 ${creative.availableCount} 个可用。`
    : `创意生成：${creative?.tasks[0]?.statusLabel ?? "当前没有可用操作"}。`;
  return `当前有 ${totalAvailable} 个可用操作：实际用途 ${scenarios} 个，自由工具 ${tools} 个。${creativeCopy}`;
}
