import { INTERNAL_WALKTHROUGH_TASKS, WALKTHROUGH_ISSUES, summarizeInternalWalkthroughRecords } from "./internal-walkthrough-record.js";

const MAX_FILES = 8;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024;
const issueLabels = Object.freeze({ none: "未观察到问题", "entry-not-found": "找不到入口", "task-not-understood": "没有理解任务", "setting-not-understood": "没有理解设置", "preview-not-understood": "没有理解预览/结果", "boundary-not-understood": "没有理解能力边界", "processing-failed": "处理失败", "download-not-found": "找不到下载", "system-error": "系统错误" });

const input = document.querySelector("#summary-file-input");
const status = document.querySelector("#summary-status");
const clearButton = document.querySelector("#summary-clear");
const results = document.querySelector("#summary-results");
const downloadButton = document.querySelector("#summary-download");
let currentSummary = null;

function setStatus(message, tone = "neutral") { status.textContent = message; status.dataset.tone = tone; }

function taskCard(summary) {
  const task = INTERNAL_WALKTHROUGH_TASKS.find((entry) => entry.id === summary.taskId);
  const issues = WALKTHROUGH_ISSUES.filter((issue) => issue !== "none" && summary.issueCounts[issue] > 0).map((issue) => `<li>${issueLabels[issue]}：${summary.issueCounts[issue]}</li>`).join("");
  return `<article class="summary-task-card"><h3>${task.label}</h3><div class="summary-task-facts"><div><span>独立完成</span><strong>${summary.completedUnassisted} / ${summary.sessions}</strong></div><div><span>求助后完成</span><strong>${summary.completedAssisted}</strong></div><div><span>观察到下载</span><strong>${summary.downloadsObserved}</strong></div><div><span>理解边界</span><strong>${summary.boundaryUnderstood}</strong></div><div><span>主动求助</span><strong>${summary.totalHelpCount} 次</strong></div><div><span>用时范围</span><strong>${summary.durationSeconds.min ?? "—"}–${summary.durationSeconds.max ?? "—"} 秒</strong></div></div><ul class="summary-issues">${issues || "<li>没有登记非零问题类别</li>"}</ul></article>`;
}

function renderSummary(summary) {
  currentSummary = summary;
  document.querySelector("#summary-session-count").textContent = String(summary.sessions);
  document.querySelector("#summary-build-count").textContent = String(summary.buildGroups.length);
  document.querySelector("#summary-build-warning").hidden = !summary.mixedBuilds;
  document.querySelector("#summary-build-list").innerHTML = summary.buildGroups.map((group) => `<span class="summary-build-chip"><code>${group.buildCommit}</code> · ${group.sessions} 场</span>`).join("");
  document.querySelector("#summary-task-grid").innerHTML = summary.taskSummaries.map(taskCard).join("");
  document.querySelector("#summary-json-preview").textContent = JSON.stringify(summary, null, 2);
  results.hidden = false;
  clearButton.disabled = false;
  document.documentElement.dataset.walkthroughSummaryState = "ready";
}

async function readRecords(files) {
  if (!files.length || files.length > MAX_FILES) throw new TypeError("请选择 1–8 份匿名 JSON");
  let totalBytes = 0;
  const records = [];
  for (const file of files) {
    if ((!file.name.toLowerCase().endsWith(".json")) || (file.type && file.type !== "application/json")) throw new TypeError("只能选择 JSON 记录文件");
    if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new TypeError("单份 JSON 必须为 1–64 KiB");
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new TypeError("JSON 总大小不能超过 512 KiB");
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch { throw new TypeError("存在无法解析的 JSON 文件"); }
    records.push(parsed);
  }
  return records;
}

async function handleFiles() {
  results.hidden = true; currentSummary = null; clearButton.disabled = false;
  try { const records = await readRecords([...input.files]); const summary = summarizeInternalWalkthroughRecords(records); renderSummary(summary); setStatus(`已在本机汇总 ${summary.sessions} 场；原始自由文本不会进入汇总文件。`, "pass"); }
  catch (error) { document.documentElement.dataset.walkthroughSummaryState = "error"; setStatus(error?.message || "无法汇总记录", "error"); }
}

function clearSummary() { input.value = ""; currentSummary = null; results.hidden = true; clearButton.disabled = true; document.documentElement.dataset.walkthroughSummaryState = "empty"; setStatus("尚未选择记录。"); }

function downloadSummary() {
  if (!currentSummary) return;
  const blob = new Blob([`${JSON.stringify(currentSummary, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "internal-walkthrough-summary.json"; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

input.addEventListener("change", handleFiles);
clearButton.addEventListener("click", clearSummary);
downloadButton.addEventListener("click", downloadSummary);
document.documentElement.dataset.walkthroughSummaryReady = "true";
document.documentElement.dataset.walkthroughSummaryState = "empty";
