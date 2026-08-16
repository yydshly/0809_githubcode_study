import { TASK_EXECUTOR } from "./task-catalog.js";

const DISPLAY_GROUPS = Object.freeze([
  Object.freeze({
    id: "local",
    title: "先在本机完成",
    description: "不上传图片，适合构图、光色和尺寸整理。",
    executors: Object.freeze([TASK_EXECUTOR.LOCAL]),
  }),
  Object.freeze({
    id: "subject",
    title: "主体与背景",
    description: "只有明确确认后，才会把当前图片发送给远程抠图服务。",
    executors: Object.freeze([TASK_EXECUTOR.BACKGROUND_REMOVAL]),
  }),
  Object.freeze({
    id: "creative",
    title: "创意生成",
    description: "会重建画面内容；真实创意服务未配置时保持不可选。",
    executors: Object.freeze([TASK_EXECUTOR.AI]),
  }),
]);

export function groupTasksForDisplay(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  const claimed = new Set();
  const groups = DISPLAY_GROUPS.map((group) => {
    const groupedTasks = tasks.filter((task) => group.executors.includes(task.executor));
    groupedTasks.forEach((task) => claimed.add(task.id));
    return Object.freeze({
      ...group,
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
      executors: Object.freeze([]),
      tasks: Object.freeze(ungrouped),
      availableCount: ungrouped.filter((task) => task.runnable).length,
    }));
  }
  return Object.freeze(groups);
}

export function taskAvailabilitySummary(tasks) {
  const groups = groupTasksForDisplay(tasks);
  const totalAvailable = tasks.filter((task) => task.runnable).length;
  const local = groups.find((group) => group.id === "local")?.availableCount ?? 0;
  const subject = groups.find((group) => group.id === "subject")?.availableCount ?? 0;
  const creative = groups.find((group) => group.id === "creative");
  const creativeCopy = creative?.availableCount
    ? `创意生成 ${creative.availableCount} 个可用。`
    : `创意生成：${creative?.tasks[0]?.statusLabel ?? "当前没有可用操作"}。`;
  return `当前有 ${totalAvailable} 个可用操作：本地 ${local} 个，远程主体处理 ${subject} 个。${creativeCopy}`;
}
