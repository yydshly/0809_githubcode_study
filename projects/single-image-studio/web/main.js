import { ApiClientError, createApiClient } from "./api-client.js";
import { createDemoImage, decodeImage, processFaithful } from "./local-processing.js";
import { buildResultDownloadContract } from "./result-download.js";
import { createRuntimeId } from "./runtime-identity.js";
import { prepareSourceFile, sha256Bytes } from "./source-file.js";
import {
  STUDIO_EVENTS,
  STUDIO_STATES,
  createInitialState,
  currentRunToken,
  currentSourceToken,
  reduceStudioState,
} from "./state-machine.js";
import { getTaskCatalog } from "./task-catalog.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  main: $("#main"), serviceStatus: $("#service-status"), serviceStatusCopy: $("#service-status-copy"),
  mobilePreviewNotice: $("#mobile-preview-notice"),
  sourcePane: $("#source-pane"), fileInput: $("#file-input"), chooseFile: $("#choose-file-button"), useDemo: $("#use-demo-button"),
  sourceEmpty: $("#source-empty"), sourcePreview: $("#source-preview"), sourceImage: $("#source-image"),
  sourceName: $("#source-name"), sourceMeta: $("#source-meta"), replaceFile: $("#replace-file-button"), tasksReplace: $("#tasks-replace-button"), resultReplace: $("#result-replace-button"),
  consentCard: $("#consent-card"), rights: $("#rights-checkbox"), confirmSource: $("#confirm-source-button"), cancelSource: $("#cancel-source-button"),
  statusPanel: $("#status-panel"), statusTitle: $("#status-title"), statusCopy: $("#status-copy"), cancelWait: $("#cancel-wait-button"),
  tasksSection: $("#tasks-section"), taskGrid: $("#task-grid"), recommendationCopy: $("#recommendation-copy"),
  configSection: $("#config-section"), backToTasks: $("#back-to-tasks-button"), configTitle: $("#config-title"),
  configDescription: $("#config-description"), configPreserve: $("#config-preserve"), configChange: $("#config-change"),
  settingsForm: $("#settings-form"), settingsFields: $("#settings-fields"), runButton: $("#run-button"), runNote: $("#run-note"),
  resultSection: $("#result-section"), resultTitle: $("#result-title"), resultSummary: $("#result-summary"),
  resultImage: $("#result-image"), referenceExplainer: $("#reference-explainer"), referenceMark: $("#reference-mark"),
  referenceTitle: $("#reference-title"), referenceCopy: $("#reference-copy"), qaCopy: $("#qa-copy"), resultSize: $("#result-size"),
  redo: $("#redo-button"), download: $("#download-button"),
  errorPanel: $("#error-panel"), errorTitle: $("#error-title"), errorCopy: $("#error-copy"), recover: $("#recover-button"), retry: $("#retry-button"), errorBack: $("#error-back-button"),
  canvas: $("#processing-canvas"), toast: $("#toast"), journey: $$(".journey li"), tabs: $$(".compare-tabs button"),
};

const TASK_COPY = Object.freeze({
  "UT-TUNE": Object.freeze({
    title: "保真整理",
    badge: "本地可用",
    kind: "utility",
    description: "校正比例与整体色调，不重建主体，也不上传图片。",
    longDescription: "用浏览器画布完成居中裁切、缩放、色调和编码。这是当前 R0 可执行的本地路径，尚不是完整交互编辑器。",
    preserve: "不主动生成新主体或物件；居中裁切可能移除画面边缘",
    change: "画面比例、整体色调与输出格式",
    output: "PNG / JPEG",
    referenceTitle: "保真整理参考",
    referenceCopy: "参考的是清晰、克制的编辑原则：不补画、不换主体，只整理画布与整体光色。",
  }),
  CR1: Object.freeze({
    title: "手绘记忆重构",
    badge: "真实 AI",
    kind: "creative",
    description: "保留主体关系，把照片重构为有纸张、铅笔与颜料痕迹的完整画面。",
    longDescription: "使用真实图片编辑服务重构视觉媒介。它会显著改变笔触和材质，但不承诺人物面孔或身份一致。",
    preserve: "主体类别、姿态、关键物件与场景关系",
    change: "绘画媒介、纸张肌理、光色与细节表达",
    output: "PNG",
    referenceTitle: "手绘记忆方法",
    referenceCopy: "参考是一条方法合同，而不是伪造样例：主体关系保留，视觉媒介转为层叠纸墨与手绘痕迹。",
  }),
  "UT-CUTOUT": Object.freeze({
    title: "主体与背景",
    badge: "能力验证中",
    kind: "pending",
    description: "同一主体蒙版将服务透明抠图、背景消除与纯色换底。",
    longDescription: "需要独立的精细分割与边缘验证，当前不会用生成模型假装成精准抠图。",
    preserve: "主体边缘、发丝与半透明区域",
    change: "背景透明度或指定底色",
    output: "透明 PNG / 换底图",
    referenceTitle: "主体蒙版",
    referenceCopy: "验证重点是边缘、孔洞与半透明区域，不以轮廓大致相似作为通过。",
  }),
  "UT-PORTRAIT": Object.freeze({
    title: "标准底色头像",
    badge: "能力验证中",
    kind: "pending",
    description: "面向通用头像与报名照；尺寸、底色与裁切参数将在能力通过后开放。",
    longDescription: "这不是护照或签证合规承诺。人物分割、构图检查和下载规格必须一起验证。",
    preserve: "本人外观、头肩结构与真实服饰",
    change: "底色、裁切、尺寸与留白",
    output: "PNG / JPEG",
    referenceTitle: "通用头像规范",
    referenceCopy: "只面向通用非官方用途；机构规格需由用户选择并经过独立规则校验。",
  }),
});

const api = createApiClient({ requestTimeoutMs: 18_000 });
let machine = createInitialState();
let apiStatus = { available: false };
let source = null;
let sourceUrl = null;
let tasks = [];
let selectedTask = null;
let currentResult = null;
let activeController = null;
let toastTimer = null;

function dispatch(type, payload = {}) {
  machine = reduceStudioState(machine, { type, ...payload });
  elements.main.dataset.pageState = machine.status;
  return machine;
}

function showOnly(name) {
  const views = [elements.sourcePane, elements.statusPanel, elements.tasksSection, elements.configSection, elements.resultSection, elements.errorPanel];
  views.forEach((node) => { node.hidden = true; });
  elements.sourceEmpty.hidden = true;
  elements.sourcePreview.hidden = true;
  elements.consentCard.hidden = true;

  if (["empty", "consent", "preview"].includes(name)) {
    elements.sourcePane.hidden = false;
    ({ empty: elements.sourceEmpty, consent: elements.consentCard, preview: elements.sourcePreview })[name].hidden = false;
    return;
  }
  ({ status: elements.statusPanel, tasks: elements.tasksSection, config: elements.configSection, result: elements.resultSection, error: elements.errorPanel })[name].hidden = false;
}

function setJourney(step) {
  const order = ["source", "task", "result"];
  const at = order.indexOf(step);
  elements.journey.forEach((item, index) => {
    item.classList.toggle("is-current", index === at);
    item.classList.toggle("is-done", index < at);
  });
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function revokeIfBlob(url) {
  if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function clearResult() {
  revokeIfBlob(currentResult?.url);
  currentResult = null;
}

function stopActiveRequest() {
  activeController?.abort();
  activeController = null;
}

function cancelCurrentSource() {
  const previousRevision = machine.sourceRevision;
  const previousSuperseded = machine.supersededRunIds;
  const previousDetached = machine.detachedRunIds;
  stopActiveRequest();
  clearResult();
  revokeIfBlob(sourceUrl);
  sourceUrl = null;
  source = null;
  tasks = [];
  selectedTask = null;
  if ([STUDIO_STATES.SOURCE_CONSENT_PENDING, STUDIO_STATES.SOURCE_ERROR].includes(machine.status)) {
    dispatch(STUDIO_EVENTS.CANCEL_SOURCE);
  } else {
    machine = {
      ...createInitialState(),
      sourceRevision: previousRevision,
      supersededRunIds: previousSuperseded,
      detachedRunIds: previousDetached,
    };
    elements.main.dataset.pageState = machine.status;
  }
  elements.fileInput.value = "";
  elements.rights.checked = false;
  elements.confirmSource.disabled = true;
  showOnly("empty");
  setJourney("source");
}

function preparedTask(task) {
  const copy = TASK_COPY[task.id] ?? {
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

function selectedCatalog() {
  const catalog = getTaskCatalog({ aiStatus: apiStatus }).map(preparedTask);
  const wanted = ["UT-TUNE", "CR1", "UT-CUTOUT", "UT-PORTRAIT"];
  return wanted.map((id) => catalog.find((task) => task.id === id)).filter(Boolean);
}

async function acceptSource(file) {
  try {
    stopActiveRequest();
    const prepared = await prepareSourceFile(file);
    clearResult();
    revokeIfBlob(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    source = { file, ...prepared };
    selectedTask = null;
    tasks = [];
    dispatch(STUDIO_EVENTS.SELECT_SOURCE, { source: prepared });
    elements.sourceImage.src = sourceUrl;
    elements.sourceName.textContent = prepared.name;
    elements.sourceMeta.textContent = `${prepared.width} × ${prepared.height} · ${(prepared.size / 1024 / 1024).toFixed(2)} MB · 等待确认`;
    elements.rights.checked = false;
    elements.confirmSource.disabled = true;
    showOnly("consent");
    setJourney("source");
    elements.rights.focus();
  } catch (error) {
    showError("这张图片还不能读取", error.message || "请选择一张有效的 JPEG、PNG 或 WebP 图片。", false);
  }
}

async function confirmAndPrepare() {
  if (!source || !elements.rights.checked) return;
  const validationId = createRuntimeId();
  const analysisId = createRuntimeId();
  const sourceToken = currentSourceToken(machine);
  const sourceAtStart = source;
  let validationPassed = false;
  const analysisController = new AbortController();
  activeController = analysisController;
  showOnly("status");
  elements.cancelWait.hidden = false;
  elements.statusTitle.textContent = "正在读取图片";
  elements.statusCopy.textContent = "确认图片尺寸并建立本次来源记录。";
  try {
    dispatch(STUDIO_EVENTS.ACCEPT_SOURCE_CONSENT, {
      ...sourceToken,
      consentId: createRuntimeId(),
      validationId,
      rightsConfirmed: true,
      dataNoticeAccepted: true,
      noticeVersion: "upload-notice-v1",
      acceptedAt: new Date().toISOString(),
    });
    const decoded = await decodeImage(sourceUrl);
    if (analysisController.signal.aborted || source !== sourceAtStart || machine.source?.hash !== sourceToken.sourceHash) return;
    sourceAtStart.width = decoded.naturalWidth;
    sourceAtStart.height = decoded.naturalHeight;
    elements.sourceMeta.textContent = `${sourceAtStart.width} × ${sourceAtStart.height} · ${sourceAtStart.mimeType.replace("image/", "").toUpperCase()}`;
    dispatch(STUDIO_EVENTS.SOURCE_VALIDATION_SUCCEEDED, {
      ...sourceToken,
      validationId,
      analysisId,
      decoded: { width: sourceAtStart.width, height: sourceAtStart.height },
      analyzerVersion: "single-source-browser-v1",
    });
    validationPassed = true;
    elements.statusTitle.textContent = "正在加载可用操作";
    elements.statusCopy.textContent = "这里只读取工程可用状态，不分析图片内容或推荐适用效果。";
    await new Promise((resolve) => setTimeout(resolve, 240));
    if (analysisController.signal.aborted || source !== sourceAtStart || machine.source?.hash !== sourceToken.sourceHash) return;
    tasks = selectedCatalog();
    dispatch(STUDIO_EVENTS.ANALYSIS_SUCCEEDED, {
      ...sourceToken,
      analysisId,
      catalogVersion: "single-image-catalog-v1",
      tasks,
      summary: `${tasks.filter((task) => task.runnable).length} runnable tasks`,
    });
    if (analysisController.signal.aborted || source !== sourceAtStart || machine.status !== STUDIO_STATES.TASKS_READY) return;
    renderTasks();
    showOnly("tasks");
    setJourney("task");
    $(".task-card:not([disabled])")?.focus();
    activeController = null;
  } catch (error) {
    if (analysisController.signal.aborted || source !== sourceAtStart) return;
    if (error instanceof ApiClientError && error.outcome === "ABORTED") return;
    try {
      if (validationPassed && machine.status === STUDIO_STATES.ANALYZING) {
        dispatch(STUDIO_EVENTS.ANALYSIS_FAILED, {
          ...sourceToken,
          analysisId,
          code: "ANALYSIS_FAILED",
          message: error.message,
          tasks: [],
        });
      } else if (machine.status === STUDIO_STATES.SOURCE_VALIDATING) {
        dispatch(STUDIO_EVENTS.SOURCE_VALIDATION_FAILED, {
          ...sourceToken,
          validationId,
          code: "DECODE_FAILED",
          message: error.message,
        });
      }
    } catch {
      // The source may already have been replaced; stale failures stay inert.
    }
    activeController = null;
    showError("图片检查没有完成", error.message || "请换一张图片后重试。", false);
  }
}

function renderTasks() {
  elements.taskGrid.replaceChildren();
  const availableCount = tasks.filter((task) => task.runnable).length;
  elements.recommendationCopy.textContent = `当前有 ${availableCount} 个工程上可运行的操作；这里没有分析图片内容，也不会把验证中的能力伪装成可用。`;
  tasks.forEach((task, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-card";
    button.dataset.taskId = task.id;
    button.dataset.tone = task.runnable ? task.kind : "pending";
    button.disabled = !task.runnable;
    button.innerHTML = `<span class="task-index">${String(index + 1).padStart(2, "0")} · ${task.runnable ? task.badge : task.statusLabel}</span><span class="task-art" aria-hidden="true"></span><h3>${task.title}</h3><p>${task.description}</p><footer><span>${task.output}</span><strong>${task.runnable ? "选择 →" : "暂不可选"}</strong></footer>`;
    if (task.runnable) button.addEventListener("click", () => selectTask(task.id));
    elements.taskGrid.append(button);
  });
}

function selectTask(taskId) {
  selectedTask = tasks.find((task) => task.id === taskId);
  if (!selectedTask?.runnable) return;
  stopActiveRequest();
  clearResult();
  dispatch(STUDIO_EVENTS.SELECT_TASK, { taskId });
  dispatch(STUDIO_EVENTS.PREPARE_TASK);
  elements.configTitle.textContent = selectedTask.title;
  elements.configDescription.textContent = selectedTask.longDescription;
  elements.configPreserve.textContent = selectedTask.preserve;
  elements.configChange.textContent = selectedTask.change;
  renderSettings(selectedTask);
  showOnly("config");
  setJourney("task");
  elements.runButton.focus();
}

function renderSettings(task) {
  if (task.id === "UT-TUNE") {
    elements.settingsFields.innerHTML = `
      <div class="field"><label for="ratio-setting">画面比例</label><select id="ratio-setting" name="ratio"><option value="original">保留原比例</option><option value="square">方形 1:1</option><option value="portrait">竖版 4:5</option><option value="landscape">横版 3:2</option></select></div>
      <div class="field"><label>整体色调</label><div class="choice-row"><label><input type="radio" name="tone" value="natural" checked />自然</label><label><input type="radio" name="tone" value="warm" />暖调</label><label><input type="radio" name="tone" value="mono" />黑白</label></div></div>
      <div class="field"><label for="format-setting">下载格式</label><select id="format-setting" name="format"><option value="png">PNG</option><option value="jpeg">JPEG</option></select></div>`;
    elements.runButton.textContent = "开始本地处理";
    elements.runNote.textContent = "真实的浏览器画布处理：不调用 AI，不补画内容，不上传图片。";
  } else {
    elements.settingsFields.innerHTML = `
      <div class="field"><label for="creative-quality">生成质量</label><select id="creative-quality" name="quality"><option value="low">快速草稿</option><option value="medium" selected>标准结果</option><option value="high">精细结果</option></select></div>
      <div class="field"><label for="creative-preserve">必须保留</label><select id="creative-preserve" name="preserve"><option value="subject">主体、动作与关键物件</option><option value="composition">主体与原始构图</option><option value="color">主体与来源色彩</option></select></div>`;
    elements.runButton.textContent = "开始真实生成";
    elements.runNote.textContent = "图片只会从本地服务端发送到已连接的 OpenAI 图片服务；生成结果不会伪造。";
  }
}

function getSettings() {
  return Object.fromEntries(new FormData(elements.settingsForm).entries());
}

async function dataUrlForFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}

async function settingsHash(settings) {
  return sha256Bytes(new TextEncoder().encode(JSON.stringify(settings)));
}

function creativePrompt(settings) {
  const preserve = {
    subject: "Preserve the same subject category, pose, key objects, and spatial relationships.",
    composition: "Preserve the same subjects and overall composition.",
    color: "Preserve the same subjects and recognizable source color relationships.",
  }[settings.preserve] ?? "Preserve the same subject category, pose, key objects, and spatial relationships.";
  return `Edit this single uploaded image into a cohesive hand-drawn memory reconstruction. ${preserve} Rebuild the medium with layered paper fibers, restrained graphite contours, translucent gouache, and selective ink marks. Keep the scene readable at thumbnail size. Do not add typography, borders, contact sheets, labels, logos, extra people, or unrelated objects. Do not claim exact facial identity.`;
}

async function recoverCreatedRun(runId, originalError) {
  try {
    return await api.getRun(runId, { timeoutMs: 8_000 });
  } catch {
    throw originalError;
  }
}

async function runSelectedTask() {
  if (!source || !selectedTask) return;
  if ([STUDIO_STATES.RUN_UNKNOWN, STUDIO_STATES.RUN_ERROR].includes(machine.status)) dispatch(STUDIO_EVENTS.RETRY_RUN);
  const settings = getSettings();
  dispatch(STUDIO_EVENTS.UPDATE_CONFIG, { config: settings, valid: true, settingsHash: await settingsHash(settings) });
  const runId = createRuntimeId();
  dispatch(STUDIO_EVENTS.START_RUN, { runId, startedAt: new Date().toISOString() });
  const runToken = currentRunToken(machine);
  const sourceHashAtStart = machine.source.hash;
  clearResult();
  activeController = new AbortController();
  showOnly("status");
  setJourney("result");
  elements.cancelWait.hidden = false;
  elements.statusTitle.textContent = selectedTask.id === "UT-TUNE" ? "正在本地处理" : "正在生成新的图片";
  elements.statusCopy.textContent = selectedTask.id === "UT-TUNE" ? "只做确定性的构图、编码与整体色调处理。" : "正在保留来源事实并应用选定的视觉方法。";

  try {
    let result;
    if (selectedTask.id === "UT-TUNE") {
      const processed = await processFaithful({ sourceUrl, settings, canvas: elements.canvas });
      if (activeController.signal.aborted || machine.activeRunId !== runId) return;
      const bytes = new Uint8Array(await processed.blob.arrayBuffer());
      result = {
        id: createRuntimeId(), url: processed.url, blob: processed.blob, mimeType: processed.mime, extension: processed.extension,
        width: processed.width, height: processed.height, outputHash: await sha256Bytes(bytes), byteLength: processed.blob.size,
        hasAlpha: false, validationSummary: processed.validationSummary, processor: processed.processor, title: "本地整理完成",
      };
    } else {
      const payload = {
        clientRunId: runId, taskId: selectedTask.id, sourceImage: await dataUrlForFile(source.file), referenceImages: [],
        prompt: creativePrompt(settings), quality: settings.quality || "medium", outputFormat: "png", size: "auto",
      };
      let created;
      try {
        created = await api.createRun(payload, { signal: activeController.signal, timeoutMs: 22_000 });
      } catch (error) {
        if (!(error instanceof ApiClientError) || !error.isUnknown) throw error;
        created = await recoverCreatedRun(runId, error);
      }
      if (created.id !== runId) throw new Error("生成任务编号不一致，已阻止结果进入页面");
      const finished = await api.pollRun(runId, {
        signal: activeController.signal, timeoutMs: 190_000, intervalMs: 1000,
        onUpdate: (run) => { elements.statusCopy.textContent = run.status === "RUNNING" ? "图片服务正在生成，原图和设置已安全保留。" : "正在等待图片服务开始。"; },
      });
      if (machine.activeRunId !== runId || sourceHashAtStart !== machine.source?.hash) return;
      if (finished.status === "UNKNOWN") throw new ApiClientError(finished.error?.message || "生成状态暂时未知", { code: finished.error?.code, outcome: "UNKNOWN", details: finished });
      if (finished.status !== "SUCCEEDED") {
        const error = new Error(finished.error?.message || "图片生成没有完成");
        error.code = finished.error?.code;
        throw error;
      }
      if (!finished.result?.image) throw new Error("图片服务没有返回图片结果");
      const decoded = await decodeImage(finished.result.image);
      result = {
        id: createRuntimeId(), url: finished.result.image, dataUrl: finished.result.image,
        mimeType: `image/${finished.result.outputFormat === "jpeg" ? "jpeg" : finished.result.outputFormat || "png"}`,
        extension: finished.result.outputFormat === "jpeg" ? "jpg" : finished.result.outputFormat || "png",
        width: decoded.naturalWidth, height: decoded.naturalHeight, outputHash: finished.result.imageSha256,
        byteLength: finished.result.imageBytes, hasAlpha: false,
        validationSummary: "已核对服务响应格式、输出指纹与本次运行编号；未执行内容质量检查",
        processor: `${finished.result.model || "gpt-image-2"} · request ${finished.requestId || "未返回"}`,
        title: "创意生成完成",
      };
    }

    if (machine.activeRunId !== runId) return;
    dispatch(STUDIO_EVENTS.RECEIVE_RUN_RESULT, { ...runToken, result });
    dispatch(STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED, {
      ...runToken, resultId: result.id, qaVersion: selectedTask.id === "UT-TUNE" ? "local-output-validation-v1" : "creative-response-validation-v1",
      resultPatch: {
        mimeType: result.mimeType, byteLength: result.byteLength, outputHash: result.outputHash, hasAlpha: result.hasAlpha,
        completedAt: new Date().toISOString(), version: selectedTask.contractVersion,
      },
    });
    currentResult = { ...result, runId, taskId: selectedTask.id, taskTitle: selectedTask.title };
    activeController = null;
    renderResult();
  } catch (error) {
    if (error instanceof ApiClientError && error.outcome === "ABORTED") return;
    if (machine.activeRunId !== runId) return;
    const unknown = error instanceof ApiClientError && error.isUnknown;
    dispatch(unknown ? STUDIO_EVENTS.MARK_RUN_UNKNOWN : STUDIO_EVENTS.RUN_FAILED, { ...runToken, code: error.code, message: error.message });
    activeController = null;
    showError(
      unknown ? "生成状态暂时未知" : "这次没有得到可用结果",
      unknown ? "网络中断后仍无法确认任务终态。系统不会自动重复提交；你可以显式重试，或稍后按同一任务编号查询。" : friendlyError(error),
      true,
    );
  }
}

function friendlyError(error) {
  if (error?.code === "api_key_missing" || /OPENAI_API_KEY|未配置|not configured/i.test(error?.message)) return "创意生成服务尚未连接。你仍可选择“保真整理”，完成本地真实处理与下载。";
  if (error?.code === "moderation_blocked") return "当前图片或请求未通过图片服务的安全检查。请换一张图片或选择其他任务。";
  return error?.message || "请保留原图并重试，失败结果不会进入下载。";
}

function renderResult() {
  if (!currentResult) return;
  elements.resultTitle.textContent = currentResult.title;
  elements.resultSummary.textContent = `${currentResult.taskTitle} · ${currentResult.processor}`;
  elements.resultImage.src = currentResult.url;
  elements.resultImage.hidden = false;
  elements.qaCopy.textContent = currentResult.validationSummary;
  elements.resultSize.textContent = currentResult.width && currentResult.height ? `${currentResult.width} × ${currentResult.height}` : currentResult.mimeType;
  elements.referenceTitle.textContent = selectedTask.referenceTitle;
  elements.referenceCopy.textContent = selectedTask.referenceCopy;
  elements.referenceMark.style.background = selectedTask.id === "UT-TUNE" ? "radial-gradient(circle at 35% 35%, #dce978 0 18%, transparent 19%), repeating-radial-gradient(circle, transparent 0 6px, rgba(255,255,255,.25) 7px 8px)" : "radial-gradient(circle at 30% 30%, #d96d3a, transparent 30%), repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,.22) 9px 10px)";
  elements.tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.layer === "result")));
  elements.referenceExplainer.hidden = true;
  showOnly("result");
  setJourney("result");
  elements.download.focus();
}

function showError(title, copy, retryable = true) {
  elements.errorTitle.textContent = title;
  elements.errorCopy.textContent = copy;
  elements.retry.hidden = !retryable;
  elements.retry.textContent = machine.status === STUDIO_STATES.RUN_UNKNOWN ? "新建任务" : "再试一次";
  elements.recover.hidden = machine.status !== STUDIO_STATES.RUN_UNKNOWN;
  showOnly("error");
}

async function recoverUnknownRun() {
  if (machine.status !== STUDIO_STATES.RUN_UNKNOWN || !machine.activeRunId) return;
  const runId = machine.activeRunId;
  const runToken = currentRunToken(machine);
  activeController = new AbortController();
  showOnly("status");
  elements.cancelWait.hidden = false;
  elements.statusTitle.textContent = "正在查询原任务";
  elements.statusCopy.textContent = "不会新建生成请求，只确认之前任务的真实状态。";
  try {
    const finished = await api.pollRun(runId, {
      signal: activeController.signal,
      timeoutMs: 60_000,
      intervalMs: 1000,
      onUpdate: (run) => { elements.statusCopy.textContent = run.status === "RUNNING" ? "原任务仍在生成。" : "正在确认原任务状态。"; },
    });
    if (machine.activeRunId !== runId) return;
    if (finished.status === "UNKNOWN") {
      showError("生成状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true);
      return;
    }
    if (finished.status !== "SUCCEEDED") {
      dispatch(STUDIO_EVENTS.RUN_FAILED, { ...runToken, code: finished.error?.code, message: finished.error?.message });
      showError("原任务没有得到可用结果", friendlyError(finished.error), true);
      return;
    }
    if (!finished.result?.image) throw new Error("图片服务没有返回图片结果");
    const decoded = await decodeImage(finished.result.image);
    const result = {
      id: createRuntimeId(), url: finished.result.image, dataUrl: finished.result.image,
      mimeType: `image/${finished.result.outputFormat === "jpeg" ? "jpeg" : finished.result.outputFormat || "png"}`,
      extension: finished.result.outputFormat === "jpeg" ? "jpg" : finished.result.outputFormat || "png",
      width: decoded.naturalWidth, height: decoded.naturalHeight, outputHash: finished.result.imageSha256,
      byteLength: finished.result.imageBytes, hasAlpha: false,
      validationSummary: "恢复查询后已核对服务响应格式、输出指纹与原运行编号；未执行内容质量检查",
      processor: `${finished.result.model || "gpt-image-2"} · request ${finished.requestId || "未返回"}`,
      title: "创意生成完成",
    };
    dispatch(STUDIO_EVENTS.RECEIVE_RUN_RESULT, { ...runToken, result });
    dispatch(STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED, {
      ...runToken, resultId: result.id, qaVersion: "creative-response-validation-v1",
      resultPatch: {
        mimeType: result.mimeType, byteLength: result.byteLength, outputHash: result.outputHash,
        hasAlpha: result.hasAlpha, completedAt: finished.completedAt || new Date().toISOString(), version: selectedTask.contractVersion,
      },
    });
    currentResult = { ...result, runId, taskId: selectedTask.id, taskTitle: selectedTask.title };
    activeController = null;
    renderResult();
  } catch (error) {
    if (error instanceof ApiClientError && error.outcome === "ABORTED") return;
    activeController = null;
    showError("生成状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true);
  }
}

async function checkStatus() {
  try {
    const status = await api.getStatus({ timeoutMs: 5000 });
    const mobilePreview = status.previewMode === "lan";
    apiStatus = { available: Boolean(status.available), status: status.available ? "available" : "unavailable", model: status.model };
    elements.mobilePreviewNotice.hidden = !mobilePreview;
    elements.serviceStatus.dataset.tone = apiStatus.available ? "online" : "offline";
    elements.serviceStatusCopy.textContent = apiStatus.available
      ? `创意生成已连接 · ${status.model}`
      : mobilePreview ? "手机预览 · 仅本地处理" : "本地处理可用 · 创意生成未连接";
  } catch {
    apiStatus = { available: false, status: "error" };
    elements.serviceStatus.dataset.tone = "offline";
    elements.serviceStatusCopy.textContent = "本地处理可用 · 服务状态未知";
  }
}

function openFilePicker() {
  // Clearing first lets mobile browsers fire change when the same photo is
  // chosen again after a cancelled or completed pass.
  elements.fileInput.value = "";
  elements.fileInput.click();
}

elements.chooseFile.addEventListener("click", openFilePicker);
elements.replaceFile.addEventListener("click", openFilePicker);
elements.tasksReplace?.addEventListener("click", openFilePicker);
elements.resultReplace?.addEventListener("click", openFilePicker);
elements.fileInput.addEventListener("change", () => { const [file] = elements.fileInput.files; if (file) acceptSource(file); });
elements.useDemo.addEventListener("click", async () => acceptSource(await createDemoImage(elements.canvas)));
elements.rights.addEventListener("change", () => { elements.confirmSource.disabled = !elements.rights.checked; });
elements.confirmSource.addEventListener("click", confirmAndPrepare);
elements.cancelSource.addEventListener("click", cancelCurrentSource);
elements.backToTasks.addEventListener("click", () => { selectedTask = null; showOnly("tasks"); setJourney("task"); });
elements.settingsForm.addEventListener("submit", (event) => { event.preventDefault(); runSelectedTask(); });
elements.redo.addEventListener("click", () => { clearResult(); showOnly("config"); setJourney("task"); });
elements.retry.addEventListener("click", runSelectedTask);
elements.recover.addEventListener("click", recoverUnknownRun);
elements.errorBack.addEventListener("click", () => {
  if (machine.status === STUDIO_STATES.RUN_UNKNOWN) dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  selectedTask = null;
  showOnly(source ? "tasks" : "empty");
  setJourney(source ? "task" : "source");
});
elements.cancelWait.addEventListener("click", () => {
  if ([STUDIO_STATES.SOURCE_VALIDATING, STUDIO_STATES.ANALYZING].includes(machine.status)) {
    stopActiveRequest();
    cancelCurrentSource();
    toast("已取消图片检查");
    return;
  }
  if (![STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN].includes(machine.status)) return;
  stopActiveRequest();
  dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  toast("已停止等待；不会自动重新提交");
  showOnly("config");
  setJourney("task");
});
elements.download.addEventListener("click", async () => {
  if (!currentResult) return;
  const contract = buildResultDownloadContract({ taskId: selectedTask.id, result: machine.result, currentRunId: machine.activeRunId });
  if (!contract.allowed) { toast(contract.message || "当前结果不可下载"); return; }
  const blob = currentResult.blob ?? await (await fetch(currentResult.dataUrl)).blob();
  const actualHash = await sha256Bytes(new Uint8Array(await blob.arrayBuffer()));
  if (actualHash !== contract.download.outputHash || blob.size !== contract.download.byteLength) { toast("下载前校验未通过"); return; }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = contract.download.filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  toast("结果已下载");
});
elements.tabs.forEach((tab) => tab.addEventListener("click", () => {
  const layer = tab.dataset.layer;
  elements.tabs.forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
  elements.referenceExplainer.hidden = layer !== "reference";
  elements.resultImage.hidden = layer === "reference";
  if (layer === "source") elements.resultImage.src = sourceUrl;
  if (layer === "result") elements.resultImage.src = currentResult.url;
}));
window.addEventListener("beforeunload", () => { stopActiveRequest(); revokeIfBlob(sourceUrl); revokeIfBlob(currentResult?.url); });

showOnly("empty");
setJourney("source");
checkStatus();
