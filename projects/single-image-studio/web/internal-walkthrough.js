import {
  INTERNAL_WALKTHROUGH_TASKS,
  INTERNAL_WALKTHROUGH_VERSION,
  WALKTHROUGH_ISSUES,
  WALKTHROUGH_OUTCOMES,
  validateInternalWalkthroughRecord,
} from "./internal-walkthrough-record.js";

const form = document.querySelector("#walkthrough-form");
const startButton = document.querySelector("#walkthrough-start");
const consent = document.querySelector("#walkthrough-consent");
const projectImages = document.querySelector("#walkthrough-project-images");
const taskList = document.querySelector("#walkthrough-task-list");
const finish = document.querySelector("#walkthrough-finish");
const completeButton = document.querySelector("#walkthrough-complete");
const resetButton = document.querySelector("#walkthrough-reset");
const downloadButton = document.querySelector("#walkthrough-download");
const summary = document.querySelector("#walkthrough-summary");
const jsonPreview = document.querySelector("#walkthrough-json");
const errorCopy = document.querySelector("#walkthrough-error");

let startedAt = null;
let completedRecord = null;
const taskStartedAt = new Map();
const taskDurations = new Map();

const outcomeLabels = Object.freeze({
  "completed-unassisted": "独立完成",
  "completed-assisted": "求助后完成",
  incomplete: "未完成",
});
const issueLabels = Object.freeze({
  none: "未观察到问题",
  "entry-not-found": "找不到入口",
  "task-not-understood": "没有理解任务",
  "setting-not-understood": "没有理解设置",
  "preview-not-understood": "没有理解预览/结果",
  "boundary-not-understood": "没有理解能力边界",
  "processing-failed": "处理失败",
  "download-not-found": "找不到下载",
  "system-error": "系统错误",
});

function optionMarkup(values, labels) {
  return values.map((value) => `<option value="${value}">${labels[value]}</option>`).join("");
}

function taskMarkup(task, index) {
  const boundary = task.id === "privacy-share"
    ? "只观察是否理解：清除文件元数据，但不识别画面中的敏感内容。"
    : "只观察是否理解：裁剪、旋转、格式和最终下载之间的关系。";
  return `<section class="walkthrough-card walkthrough-task" data-walkthrough-task="${task.id}" hidden>
    <div class="walkthrough-card-heading"><div><span>0${index + 2}</span><h2>${task.label}</h2></div><p><b class="walkthrough-timer" data-task-timer="${task.id}">00:00</b> · 主持人不要提示控件名称</p></div>
    <blockquote class="walkthrough-task-prompt">${task.prompt}</blockquote>
    <div class="walkthrough-task-boundary"><span>${boundary}</span><a href="./?walkthrough=${task.id}" target="_blank" rel="noopener">在新标签打开工作室 ↗</a></div>
    <div class="walkthrough-task-fields">
      <label><span>任务结果</span><select data-task-field="outcome">${optionMarkup(WALKTHROUGH_OUTCOMES, outcomeLabels)}</select></label>
      <label><span>首次主要问题</span><select data-task-field="issueCode">${optionMarkup(WALKTHROUGH_ISSUES, issueLabels)}</select></label>
      <label><span>体验者信心（1–5）</span><select data-task-field="confidence">${[1,2,3,4,5].map((value) => `<option value="${value}"${value === 3 ? " selected" : ""}>${value}</option>`).join("")}</select></label>
      <label><span>主动求助次数</span><input data-task-field="helpCount" type="number" min="0" max="20" step="1" value="0" /></label>
      <label class="walkthrough-checkbox"><input data-task-field="entryFound" type="checkbox" /><span>独立找到入口</span></label>
      <label class="walkthrough-checkbox"><input data-task-field="downloadObserved" type="checkbox" /><span>观察到真实下载</span></label>
      <label class="walkthrough-checkbox"><input data-task-field="boundaryUnderstood" type="checkbox" /><span>能复述能力边界</span></label>
      <label class="walkthrough-task-note"><span>可复现观察（最多 240 字，不写身份和图片内容）</span><textarea data-task-field="boundedNote" maxlength="240" rows="2" placeholder="例如：在任务列表停留 25 秒后才找到入口。"></textarea></label>
    </div>
    <button class="button button-primary walkthrough-task-complete" data-task-complete="${task.id}" type="button">记录本任务并继续</button>
  </section>`;
}

taskList.innerHTML = INTERNAL_WALKTHROUGH_TASKS.map(taskMarkup).join("");

function updateStartState() {
  startButton.disabled = !(consent.checked && projectImages.checked);
}

function formatDuration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateTimers() {
  if (!startedAt || completedRecord) return;
  for (const task of INTERNAL_WALKTHROUGH_TASKS) {
    const started = taskStartedAt.get(task.id);
    if (!started) continue;
    const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
    document.querySelector(`[data-task-timer="${task.id}"]`).textContent = formatDuration(seconds);
  }
}

setInterval(updateTimers, 1000);

function startWalkthrough() {
  if (startButton.disabled) return;
  startedAt = new Date().toISOString();
  document.querySelectorAll(".walkthrough-task").forEach((card, index) => {
    card.hidden = index !== 0;
    card.dataset.state = index === 0 ? "active" : "";
  });
  taskStartedAt.set(INTERNAL_WALKTHROUGH_TASKS[0].id, Date.now());
  finish.hidden = true;
  startButton.textContent = "走查进行中";
  startButton.disabled = true;
  document.querySelector("#walkthrough-task-list").scrollIntoView({ behavior: "smooth", block: "start" });
}

function completeTask(taskId) {
  const index = INTERNAL_WALKTHROUGH_TASKS.findIndex((task) => task.id === taskId);
  if (index < 0 || taskDurations.has(taskId)) return;
  const started = taskStartedAt.get(taskId);
  taskDurations.set(taskId, Math.max(0, Math.round((Date.now() - started) / 1000)));
  const current = document.querySelector(`[data-walkthrough-task="${taskId}"]`);
  current.dataset.state = "complete";
  current.querySelector(`[data-task-complete="${taskId}"]`).disabled = true;
  current.querySelector(`[data-task-complete="${taskId}"]`).textContent = "本任务已记录";
  const next = INTERNAL_WALKTHROUGH_TASKS[index + 1];
  if (next) {
    const nextCard = document.querySelector(`[data-walkthrough-task="${next.id}"]`);
    nextCard.hidden = false;
    nextCard.dataset.state = "active";
    taskStartedAt.set(next.id, Date.now());
    nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    finish.hidden = false;
    finish.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function taskRecord(task) {
  const card = document.querySelector(`[data-walkthrough-task="${task.id}"]`);
  const get = (field) => card.querySelector(`[data-task-field="${field}"]`);
  const elapsed = taskDurations.get(task.id) ?? Math.max(0, Math.round((Date.now() - taskStartedAt.get(task.id)) / 1000));
  return {
    taskId: task.id,
    outcome: get("outcome").value,
    durationSeconds: Math.min(1800, elapsed),
    helpCount: Number.parseInt(get("helpCount").value, 10),
    entryFound: get("entryFound").checked,
    downloadObserved: get("downloadObserved").checked,
    boundaryUnderstood: get("boundaryUnderstood").checked,
    confidence: Number.parseInt(get("confidence").value, 10),
    issueCode: get("issueCode").value,
    boundedNote: get("boundedNote").value,
  };
}

function showError(error) {
  errorCopy.hidden = false;
  errorCopy.textContent = error?.message || "记录内容不完整";
  errorCopy.focus?.();
}

function completeWalkthrough() {
  errorCopy.hidden = true;
  try {
    const ended = Date.now();
    if (taskDurations.size !== INTERNAL_WALKTHROUGH_TASKS.length) throw new TypeError("请先依次记录两个固定任务");
    completedRecord = validateInternalWalkthroughRecord({
      version: INTERNAL_WALKTHROUGH_VERSION,
      sessionId: document.querySelector("#walkthrough-session-id").value.trim().toUpperCase(),
      buildCommit: document.querySelector("#walkthrough-build").value.trim(),
      browserProfile: document.querySelector("#walkthrough-browser").value.trim(),
      startedAt,
      completedAt: new Date(ended).toISOString(),
      consentConfirmed: consent.checked,
      projectImagesOnly: projectImages.checked,
      tasks: INTERNAL_WALKTHROUGH_TASKS.map(taskRecord),
      overallNote: document.querySelector("#walkthrough-overall-note").value,
    });
    jsonPreview.textContent = JSON.stringify(completedRecord, null, 2);
    summary.hidden = false;
    completeButton.disabled = true;
    downloadButton.focus();
  } catch (error) {
    completedRecord = null;
    summary.hidden = true;
    showError(error);
  }
}

function downloadRecord() {
  if (!completedRecord) return;
  const blob = new Blob([`${JSON.stringify(completedRecord, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${completedRecord.sessionId.toLowerCase()}-walkthrough.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetWalkthrough() {
  form.reset();
  document.querySelector("#walkthrough-session-id").value = "IW-S01";
  document.querySelector("#walkthrough-build").value = "unknown";
  document.querySelector("#walkthrough-browser").value = "Chrome / Edge desktop · 1440 × 900 · 100%";
  document.querySelectorAll(".walkthrough-task").forEach((card) => {
    card.hidden = true;
    card.dataset.state = "";
    const button = card.querySelector("[data-task-complete]");
    button.disabled = false;
    button.textContent = "记录本任务并继续";
    card.querySelector("[data-task-timer]").textContent = "00:00";
  });
  finish.hidden = true;
  summary.hidden = true;
  errorCopy.hidden = true;
  completeButton.disabled = false;
  startButton.textContent = "开始并计时";
  startedAt = null;
  completedRecord = null;
  taskStartedAt.clear();
  taskDurations.clear();
  updateStartState();
  document.querySelector("#walkthrough-setup").scrollIntoView({ behavior: "smooth", block: "start" });
}

consent.addEventListener("change", updateStartState);
projectImages.addEventListener("change", updateStartState);
startButton.addEventListener("click", startWalkthrough);
document.querySelectorAll("[data-task-complete]").forEach((button) => button.addEventListener("click", () => completeTask(button.dataset.taskComplete)));
completeButton.addEventListener("click", completeWalkthrough);
downloadButton.addEventListener("click", downloadRecord);
resetButton.addEventListener("click", resetWalkthrough);
document.documentElement.dataset.internalWalkthroughReady = "true";
