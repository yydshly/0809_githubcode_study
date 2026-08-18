export const INTERNAL_WALKTHROUGH_VERSION = "internal-walkthrough-record-v1";

export const INTERNAL_WALKTHROUGH_TASKS = Object.freeze([
  Object.freeze({
    id: "basic-edit",
    productTaskId: "UT-TUNE",
    label: "基础编辑与下载",
    prompt: "请使用页面提供的合成演示图，把图片整理成方形，顺时针旋转 90°，导出 PNG，并告诉主持人下载是否开始。",
  }),
  Object.freeze({
    id: "privacy-share",
    productTaskId: "UT-PRIVACY-SHARE",
    label: "隐私友好分享副本",
    prompt: "请使用页面提供的合成演示图，生成一份适合日常分享的 JPEG，并告诉主持人这个功能能做什么、不能做什么。",
  }),
]);

export const WALKTHROUGH_OUTCOMES = Object.freeze([
  "completed-unassisted",
  "completed-assisted",
  "incomplete",
]);

export const WALKTHROUGH_ISSUES = Object.freeze([
  "none",
  "entry-not-found",
  "task-not-understood",
  "setting-not-understood",
  "preview-not-understood",
  "boundary-not-understood",
  "processing-failed",
  "download-not-found",
  "system-error",
]);

const RECORD_KEYS = new Set([
  "version", "sessionId", "buildCommit", "browserProfile", "startedAt", "completedAt",
  "consentConfirmed", "projectImagesOnly", "tasks", "overallNote",
]);
const TASK_KEYS = new Set([
  "taskId", "outcome", "durationSeconds", "helpCount", "entryFound", "downloadObserved",
  "boundaryUnderstood", "confidence", "issueCode", "boundedNote",
]);

function assertExactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} 必须是对象`);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`${label} 包含不支持的字段：${unknown.join(", ")}`);
  const missing = [...allowed].filter((key) => !(key in value));
  if (missing.length) throw new TypeError(`${label} 缺少字段：${missing.join(", ")}`);
}

function requireCanonicalUtc(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new TypeError(`${label} 必须是规范 UTC 时间`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== value) throw new TypeError(`${label} 必须是规范 UTC 时间`);
  return value;
}

function requireBoundedText(value, label, maxLength, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || value.length > maxLength || (!allowEmpty && !value.trim())) throw new TypeError(`${label} 格式无效`);
  return value.trim();
}

function rejectLikelyPersonalData(value, label) {
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /(?:^|\D)1[3-9]\d{9}(?:\D|$)/.test(value)) {
    throw new TypeError(`${label} 不能包含邮箱或手机号码`);
  }
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new TypeError(`${label} 必须是布尔值`);
  return value;
}

function requireInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`${label} 必须是 ${min}–${max} 的整数`);
  return value;
}

function normalizeTask(entry, expectedTask) {
  assertExactKeys(entry, TASK_KEYS, `tasks.${expectedTask.id}`);
  if (entry.taskId !== expectedTask.id) throw new TypeError(`任务顺序或身份无效：${expectedTask.id}`);
  if (!WALKTHROUGH_OUTCOMES.includes(entry.outcome)) throw new TypeError(`${expectedTask.id}.outcome 无效`);
  if (!WALKTHROUGH_ISSUES.includes(entry.issueCode)) throw new TypeError(`${expectedTask.id}.issueCode 无效`);
  const note = requireBoundedText(entry.boundedNote, `${expectedTask.id}.boundedNote`, 240, { allowEmpty: true });
  rejectLikelyPersonalData(note, `${expectedTask.id}.boundedNote`);
  const helpCount = requireInteger(entry.helpCount, `${expectedTask.id}.helpCount`, 0, 20);
  const entryFound = requireBoolean(entry.entryFound, `${expectedTask.id}.entryFound`);
  const downloadObserved = requireBoolean(entry.downloadObserved, `${expectedTask.id}.downloadObserved`);
  const boundaryUnderstood = requireBoolean(entry.boundaryUnderstood, `${expectedTask.id}.boundaryUnderstood`);
  if (entry.outcome === "completed-unassisted" && helpCount !== 0) throw new TypeError(`${expectedTask.id} 独立完成时求助次数必须为 0`);
  if (entry.outcome === "completed-assisted" && helpCount === 0) throw new TypeError(`${expectedTask.id} 求助后完成时求助次数必须大于 0`);
  if (entry.outcome === "incomplete" && entry.issueCode === "none") throw new TypeError(`${expectedTask.id} 未完成时必须记录主要问题`);
  if (entry.issueCode === "none" && !(entryFound && downloadObserved && boundaryUnderstood)) throw new TypeError(`${expectedTask.id} 仍有未完成观察时不能记录为没有问题`);
  return Object.freeze({
    taskId: entry.taskId,
    outcome: entry.outcome,
    durationSeconds: requireInteger(entry.durationSeconds, `${expectedTask.id}.durationSeconds`, 0, 1800),
    helpCount,
    entryFound,
    downloadObserved,
    boundaryUnderstood,
    confidence: requireInteger(entry.confidence, `${expectedTask.id}.confidence`, 1, 5),
    issueCode: entry.issueCode,
    boundedNote: note,
  });
}

export function validateInternalWalkthroughRecord(record) {
  assertExactKeys(record, RECORD_KEYS, "record");
  if (record.version !== INTERNAL_WALKTHROUGH_VERSION) throw new TypeError("record.version 无效");
  if (typeof record.sessionId !== "string" || !/^IW-[A-Z0-9]{3,10}$/.test(record.sessionId)) throw new TypeError("sessionId 必须使用 IW- 匿名编号");
  if (typeof record.buildCommit !== "string" || !/^(?:unknown|[0-9a-f]{7,40})$/i.test(record.buildCommit)) throw new TypeError("buildCommit 格式无效");
  const browserProfile = requireBoundedText(record.browserProfile, "browserProfile", 120);
  const startedAt = requireCanonicalUtc(record.startedAt, "startedAt");
  const completedAt = requireCanonicalUtc(record.completedAt, "completedAt");
  if (completedAt < startedAt) throw new TypeError("completedAt 不能早于 startedAt");
  if (record.consentConfirmed !== true || record.projectImagesOnly !== true) throw new TypeError("必须确认同意并只使用项目演示图");
  if (!Array.isArray(record.tasks) || record.tasks.length !== INTERNAL_WALKTHROUGH_TASKS.length) throw new TypeError("必须包含两个固定任务");
  const tasks = INTERNAL_WALKTHROUGH_TASKS.map((task, index) => normalizeTask(record.tasks[index], task));
  const overallNote = requireBoundedText(record.overallNote, "overallNote", 300, { allowEmpty: true });
  rejectLikelyPersonalData(overallNote, "overallNote");
  return Object.freeze({
    version: record.version,
    sessionId: record.sessionId,
    buildCommit: record.buildCommit.toLowerCase(),
    browserProfile,
    startedAt,
    completedAt,
    consentConfirmed: true,
    projectImagesOnly: true,
    tasks: Object.freeze(tasks),
    overallNote,
  });
}

export function summarizeInternalWalkthroughRecords(records) {
  if (!Array.isArray(records)) throw new TypeError("records 必须是数组");
  const normalized = records.map(validateInternalWalkthroughRecord);
  const sessionIds = new Set();
  for (const record of normalized) {
    if (sessionIds.has(record.sessionId)) throw new TypeError(`重复的匿名场次：${record.sessionId}`);
    sessionIds.add(record.sessionId);
  }
  const buildCounts = new Map();
  for (const record of normalized) buildCounts.set(record.buildCommit, (buildCounts.get(record.buildCommit) ?? 0) + 1);
  const taskSummaries = INTERNAL_WALKTHROUGH_TASKS.map((task) => {
    const results = normalized.map((record) => record.tasks.find((entry) => entry.taskId === task.id));
    const issueCounts = Object.fromEntries(WALKTHROUGH_ISSUES.map((issue) => [issue, results.filter((entry) => entry.issueCode === issue).length]));
    const durations = results.map((entry) => entry.durationSeconds).sort((left, right) => left - right);
    return Object.freeze({
      taskId: task.id,
      sessions: results.length,
      completedUnassisted: results.filter((entry) => entry.outcome === "completed-unassisted").length,
      completedAssisted: results.filter((entry) => entry.outcome === "completed-assisted").length,
      incomplete: results.filter((entry) => entry.outcome === "incomplete").length,
      downloadsObserved: results.filter((entry) => entry.downloadObserved).length,
      entryFound: results.filter((entry) => entry.entryFound).length,
      boundaryUnderstood: results.filter((entry) => entry.boundaryUnderstood).length,
      totalHelpCount: results.reduce((sum, entry) => sum + entry.helpCount, 0),
      durationSeconds: Object.freeze({ min: durations[0] ?? null, max: durations.at(-1) ?? null }),
      issueCounts: Object.freeze(issueCounts),
    });
  });
  return Object.freeze({
    version: "internal-walkthrough-summary-v1",
    sessions: normalized.length,
    mixedBuilds: buildCounts.size > 1,
    buildGroups: Object.freeze([...buildCounts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([buildCommit, sessions]) => Object.freeze({ buildCommit, sessions }))),
    taskSummaries: Object.freeze(taskSummaries),
    interpretation: "formative-only-no-pass-claim",
  });
}
