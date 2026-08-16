import { ApiClientError, createApiClient } from "./api-client.js";
import { runLocalEditor } from "./editor-session.js";
import {
  createEditorWorkspace,
  editorPreviewPresentation,
  editorSettings,
  moveEditorCrop,
  moveEditorFreeCrop,
  redoEditorWorkspace,
  resetEditorWorkspace,
  undoEditorWorkspace,
  updateEditorWorkspace,
} from "./editor-workspace.js";
import { readImageOrientation } from "./image-orientation.js";
import { createDemoImage, decodeImage } from "./local-processing.js";
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
  editorWorkspace: $("#editor-workspace"), editorPreviewFrame: $("#editor-preview-frame"), editorPreviewImage: $("#editor-preview-image"),
  editorCropBox: $("#editor-crop-box"), editorCropResize: $("#editor-crop-resize"),
  editorPreviewSummary: $("#editor-preview-summary"), editorOutputSize: $("#editor-output-size"),
  editorHistorySummary: $("#editor-history-summary"), editorChangeState: $("#editor-change-state"),
  editorCropHint: $("#editor-crop-hint"), editorDragBadge: $("#editor-drag-badge"),
  editorUndo: $("#editor-undo"), editorRedo: $("#editor-redo"), editorReset: $("#editor-reset"),
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
    description: "校正比例、方向与整体光色，不重建主体，也不上传图片。",
    longDescription: "在本机调整构图位置、比例、方向、输出尺寸与整体光色，再从原始解码结果严格导出。预览与下载共用同一组编辑参数。",
    preserve: "不主动生成新主体或物件；裁切范围始终由你明确调整",
    change: "构图位置、画面比例、方向、整体光色、输出尺寸与格式",
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
let editorWorkspace = null;
let editorCropDrag = null;
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

function clearEditorWorkspace() {
  editorWorkspace = null;
  editorCropDrag = null;
  elements.editorWorkspace.hidden = true;
  elements.editorPreviewImage.removeAttribute("src");
  elements.editorPreviewImage.removeAttribute("style");
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
  clearEditorWorkspace();
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
    const sourceOrientation = readImageOrientation(new Uint8Array(await file.arrayBuffer()), file.type);
    clearResult();
    clearEditorWorkspace();
    revokeIfBlob(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    source = {
      file,
      ...prepared,
      rawWidth: prepared.width,
      rawHeight: prepared.height,
      sourceOrientation,
    };
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
  if (selectedTask.id === "UT-TUNE") initializeEditorWorkspace();
  else clearEditorWorkspace();
  showOnly("config");
  setJourney("task");
  elements.runButton.focus();
}

function renderSettings(task) {
  if (task.id === "UT-TUNE") {
    elements.settingsFields.innerHTML = `
      <fieldset class="setting-group"><legend><span>1</span> 构图</legend>
        <div class="field"><label for="ratio-setting">裁剪方式</label><select id="ratio-setting" name="ratio"><option value="original">不裁剪 · 显示全图</option><option value="square">固定比例 · 方形 1:1</option><option value="portrait">固定比例 · 竖版 4:5</option><option value="landscape">固定比例 · 横版 3:2</option><option value="free">自由裁剪</option></select></div>
        <div class="crop-position-fields" data-crop-position hidden>
          <p class="field-hint">左侧始终显示完整图片；亮框内才是导出区域。拖动亮框可移动裁剪。</p>
          <div class="field range-field" data-crop-axis-control="horizontal"><label for="crop-x-setting">保留位置：左 ↔ 右 <output data-setting-value="cropX">50%</output></label><input id="crop-x-setting" name="cropX" type="range" min="0" max="100" step="1" value="50" /></div>
          <div class="field range-field" data-crop-axis-control="vertical"><label for="crop-y-setting">保留位置：上 ↕ 下 <output data-setting-value="cropY">50%</output></label><input id="crop-y-setting" name="cropY" type="range" min="0" max="100" step="1" value="50" /></div>
          <div class="free-crop-fields" data-free-crop hidden>
            <div class="field range-field"><label for="crop-left-setting">左边界 <output data-setting-value="cropLeft">0%</output></label><input id="crop-left-setting" name="cropLeft" type="range" min="0" max="90" step="1" value="0" /></div>
            <div class="field range-field"><label for="crop-top-setting">上边界 <output data-setting-value="cropTop">0%</output></label><input id="crop-top-setting" name="cropTop" type="range" min="0" max="90" step="1" value="0" /></div>
            <div class="field range-field"><label for="crop-width-setting">裁剪宽度 <output data-setting-value="cropWidth">100%</output></label><input id="crop-width-setting" name="cropWidth" type="range" min="10" max="100" step="1" value="100" /></div>
            <div class="field range-field"><label for="crop-height-setting">裁剪高度 <output data-setting-value="cropHeight">100%</output></label><input id="crop-height-setting" name="cropHeight" type="range" min="10" max="100" step="1" value="100" /></div>
          </div>
        </div>
        <div class="field"><label for="rotation-setting">旋转</label><select id="rotation-setting" name="rotation"><option value="0">不旋转</option><option value="90">顺时针 90°</option><option value="180">180°</option><option value="270">顺时针 270°</option></select></div>
        <div class="field"><label>翻转</label><div class="choice-row"><label><input type="checkbox" name="flipHorizontal" />水平</label><label><input type="checkbox" name="flipVertical" />垂直</label></div></div>
      </fieldset>
      <details class="settings-disclosure"><summary><span><b>2</b> 光色微调</span><small>可选</small></summary>
        <div class="disclosure-body">
          <div class="field range-field"><label for="brightness-setting">亮度 <output data-setting-value="brightness">0</output></label><input id="brightness-setting" name="brightness" type="range" min="-100" max="100" step="1" value="0" /></div>
          <div class="field range-field"><label for="contrast-setting">对比度 <output data-setting-value="contrast">0</output></label><input id="contrast-setting" name="contrast" type="range" min="-100" max="100" step="1" value="0" /></div>
          <div class="field range-field"><label for="saturation-setting">饱和度 <output data-setting-value="saturation">0</output></label><input id="saturation-setting" name="saturation" type="range" min="-100" max="100" step="1" value="0" /></div>
        </div>
      </details>
      <fieldset class="setting-group"><legend><span>3</span> 导出</legend>
        <div class="field"><label for="size-mode-setting">尺寸上限</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动上限（不放大）</option><option value="custom">自定义上限</option></select></div>
        <div class="custom-size-fields" data-custom-size hidden>
          <div class="field"><label for="output-long-edge-setting">最长边上限</label><div class="number-with-unit"><input id="output-long-edge-setting" name="outputLongEdge" type="number" inputmode="numeric" min="1" max="2048" step="1" aria-describedby="custom-size-explanation size-limit-preview" /><span aria-hidden="true">px</span></div></div>
          <output class="size-limit-preview" data-size-limit-preview id="size-limit-preview" aria-live="polite"></output>
          <p class="field-hint" id="custom-size-explanation">只限制导出像素，不改变左侧画布显示大小。宽高会按当前裁剪比例自动计算；小图不会放大。</p>
        </div>
        <div class="field"><label for="format-setting">下载格式</label><select id="format-setting" name="format"><option value="png">PNG（保留透明）</option><option value="jpeg">JPEG（铺底）</option></select></div>
        <div class="field" data-jpeg-background hidden><label for="jpeg-background-setting">JPEG 底色</label><input id="jpeg-background-setting" name="jpegBackground" type="color" value="#ffffff" /></div>
      </fieldset>
      <p class="settings-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成并校验下载文件";
    elements.runNote.textContent = "全部在本机完成；不会调用 AI、补画内容或上传图片。导出后还会重开核对。";
  } else {
    elements.settingsFields.innerHTML = `
      <div class="field"><label for="creative-quality">生成质量</label><select id="creative-quality" name="quality"><option value="low">快速草稿</option><option value="medium" selected>标准结果</option><option value="high">精细结果</option></select></div>
      <div class="field"><label for="creative-preserve">必须保留</label><select id="creative-preserve" name="preserve"><option value="subject">主体、动作与关键物件</option><option value="composition">主体与原始构图</option><option value="color">主体与来源色彩</option></select></div>`;
    elements.runButton.textContent = "开始真实生成";
    elements.runNote.textContent = "图片只会从本地服务端发送到已连接的 OpenAI 图片服务；生成结果不会伪造。";
  }
  elements.runButton.disabled = false;
}

function editorFormSettings() {
  const data = Object.fromEntries(new FormData(elements.settingsForm).entries());
  return {
    ...data,
    flipHorizontal: elements.settingsForm.elements.flipHorizontal?.checked ?? false,
    flipVertical: elements.settingsForm.elements.flipVertical?.checked ?? false,
  };
}

function setControlValue(name, value) {
  const control = elements.settingsForm.elements[name];
  if (!control) return;
  if (control.type === "checkbox") control.checked = Boolean(value);
  else control.value = value === null || value === undefined ? "" : String(value);
}

function setEditorValidity(error = null) {
  const errorNode = elements.settingsForm.querySelector("#editor-settings-error");
  if (errorNode) {
    errorNode.hidden = !error;
    errorNode.textContent = error?.message ?? "";
  }
  elements.runButton.disabled = Boolean(error);
}

function renderEditorPreview(settings = editorSettings(editorWorkspace), { transient = false } = {}) {
  if (!editorWorkspace) return;
  const presentation = editorPreviewPresentation(editorWorkspace, settings);
  elements.editorPreviewFrame.style.aspectRatio = presentation.aspectRatio;
  elements.editorPreviewFrame.style.setProperty("--preview-ratio", String(presentation.aspectValue));
  elements.editorPreviewFrame.style.setProperty("--frame-ratio", String(presentation.frameAspectValue));
  elements.editorPreviewFrame.dataset.format = presentation.format;
  elements.editorPreviewFrame.style.setProperty("--jpeg-preview-background", presentation.background ?? "#ffffff");
  elements.editorPreviewImage.style.width = presentation.previewWidth;
  elements.editorPreviewImage.style.height = presentation.previewHeight;
  elements.editorPreviewImage.style.transform = presentation.transform;
  elements.editorPreviewImage.style.objectPosition = presentation.objectPosition;
  elements.editorPreviewImage.style.filter = presentation.filter;
  elements.editorCropBox.hidden = !presentation.cropEnabled;
  elements.editorCropBox.style.left = `${presentation.cropRect.left}%`;
  elements.editorCropBox.style.top = `${presentation.cropRect.top}%`;
  elements.editorCropBox.style.width = `${presentation.cropRect.width}%`;
  elements.editorCropBox.style.height = `${presentation.cropRect.height}%`;
  elements.editorCropResize.hidden = !presentation.cropResizable;
  elements.editorPreviewFrame.dataset.cropEnabled = String(presentation.cropEnabled);
  elements.editorPreviewFrame.dataset.cropAxis = presentation.cropAxis;
  elements.editorPreviewFrame.dataset.cropResizable = String(presentation.cropResizable);
  elements.editorPreviewFrame.tabIndex = presentation.cropEnabled ? 0 : -1;
  elements.editorPreviewSummary.textContent = presentation.summary;
  elements.editorOutputSize.textContent = `预计实际导出 ${presentation.output.width} × ${presentation.output.height} px`;
  const sizeLimitPreview = elements.settingsForm.querySelector("[data-size-limit-preview]");
  if (sizeLimitPreview && settings.sizeMode === "custom") {
    sizeLimitPreview.textContent = `当前比例上限框 ${presentation.state.resize.width} × ${presentation.state.resize.height} px`;
  }
  elements.editorCropHint.textContent = presentation.cropAxis === "both"
    ? "自由裁剪：拖动亮框移动区域；拖右下角圆点改变大小。右侧滑杆可精确调整。"
    : presentation.cropAxis === "horizontal"
    ? "完整图片保持可见；左右拖动亮框、使用 ← →，或用右侧滑杆调整。"
    : presentation.cropAxis === "vertical"
      ? "完整图片保持可见；上下拖动亮框、使用 ↑ ↓，或用右侧滑杆调整。"
      : presentation.settings.ratio === "original"
        ? "当前显示并保留完整图片；选择固定比例或自由裁剪后，亮框会标出导出区域。"
        : "来源画面已经符合所选比例，不需要调整保留位置。";
  elements.editorDragBadge.hidden = !presentation.cropEnabled;
  elements.editorDragBadge.textContent = presentation.cropAxis === "both"
    ? "拖动裁剪框 · 右下角缩放"
    : presentation.cropAxis === "horizontal" ? "左右拖动裁剪框" : "上下拖动裁剪框";
  elements.editorPreviewFrame.setAttribute("aria-label", presentation.cropAxis === "both"
    ? "完整图片与自由裁剪框。可用方向键移动裁剪框。"
    : presentation.cropAxis === "horizontal"
    ? "完整图片与裁剪框。当前可左右拖动，或用左右方向键调整保留区域。"
    : presentation.cropAxis === "vertical"
      ? "完整图片与裁剪框。当前可上下拖动，或用上下方向键调整保留区域。"
      : "完整图片预览。当前不裁剪。");
  elements.editorChangeState.textContent = transient
    ? "正在预览 · 完成操作后记入历史"
    : editorWorkspace.history.past.length === 0 ? "设置已同步" : "设置已记入编辑历史";
  ["brightness", "contrast", "saturation", "cropX", "cropY", "cropLeft", "cropTop", "cropWidth", "cropHeight"].forEach((name) => {
    const output = elements.settingsForm.querySelector(`[data-setting-value="${name}"]`);
    if (output) output.value = `${settings[name] ?? (name.startsWith("crop") ? 50 : 0)}${name.startsWith("crop") ? "%" : ""}`;
  });
  const cropFields = elements.settingsForm.querySelector("[data-crop-position]");
  if (cropFields) cropFields.hidden = !presentation.cropEnabled;
  elements.settingsForm.querySelectorAll("[data-crop-axis-control]").forEach((control) => {
    control.hidden = control.dataset.cropAxisControl !== presentation.cropAxis;
  });
  const freeCropFields = elements.settingsForm.querySelector("[data-free-crop]");
  if (freeCropFields) {
    freeCropFields.hidden = !presentation.cropResizable;
    const left = elements.settingsForm.elements.cropLeft;
    const top = elements.settingsForm.elements.cropTop;
    const width = elements.settingsForm.elements.cropWidth;
    const height = elements.settingsForm.elements.cropHeight;
    if (left && width) {
      left.max = String(100 - Number(settings.cropWidth ?? 100));
      width.max = String(100 - Number(settings.cropLeft ?? 0));
    }
    if (top && height) {
      top.max = String(100 - Number(settings.cropHeight ?? 100));
      height.max = String(100 - Number(settings.cropTop ?? 0));
    }
  }
  const customSizeFields = elements.settingsForm.querySelector("[data-custom-size]");
  if (customSizeFields) customSizeFields.hidden = settings.sizeMode !== "custom";
  const backgroundField = elements.settingsForm.querySelector("[data-jpeg-background]");
  if (backgroundField) backgroundField.hidden = presentation.format !== "jpeg";
  elements.editorUndo.disabled = editorWorkspace.history.past.length === 0;
  elements.editorRedo.disabled = editorWorkspace.history.future.length === 0;
  elements.editorReset.disabled = editorWorkspace.history.past.length === 0
    && editorWorkspace.history.future.length === 0;
  elements.editorHistorySummary.textContent = editorWorkspace.history.past.length === 0
    ? "尚无已提交编辑"
    : `${editorWorkspace.history.past.length} 步编辑可撤销`;
  setEditorValidity();
  return presentation;
}

function syncEditorForm() {
  if (!editorWorkspace) return;
  const settings = editorSettings(editorWorkspace);
  Object.entries(settings).forEach(([name, value]) => setControlValue(name, value));
  renderEditorPreview(settings);
}

function initializeEditorWorkspace() {
  if (!source) return;
  editorWorkspace = createEditorWorkspace({
    sourceWidth: source.rawWidth ?? source.width,
    sourceHeight: source.rawHeight ?? source.height,
    sourceOrientation: source.sourceOrientation ?? 1,
  });
  elements.editorWorkspace.hidden = false;
  elements.editorPreviewImage.src = sourceUrl;
  syncEditorForm();
}

function commitEditorForm() {
  if (!editorWorkspace || selectedTask?.id !== "UT-TUNE") return false;
  try {
    editorWorkspace = updateEditorWorkspace(editorWorkspace, editorFormSettings());
    syncEditorForm();
    return true;
  } catch (error) {
    setEditorValidity(error);
    elements.editorChangeState.textContent = "当前设置需要修正";
    return false;
  }
}

function reconcileCustomSize(changedName) {
  if (!editorWorkspace || selectedTask?.id !== "UT-TUNE") return;
  const settings = editorFormSettings();
  if (settings.sizeMode !== "custom") return;
  if (settings.outputLongEdge !== "" || changedName !== "sizeMode") return;
  const presetPresentation = editorPreviewPresentation(editorWorkspace, { ...settings, sizeMode: "preset" });
  setControlValue("outputLongEdge", Math.max(presetPresentation.output.width, presetPresentation.output.height));
}

function previewEditorForm() {
  try {
    renderEditorPreview(editorFormSettings(), { transient: true });
  } catch (error) {
    setEditorValidity(error);
    elements.editorChangeState.textContent = "当前设置需要修正";
  }
}

function setCropControls(settings) {
  setControlValue("cropX", settings.cropX);
  setControlValue("cropY", settings.cropY);
}

function setFreeCropControls(settings) {
  for (const name of ["cropLeft", "cropTop", "cropWidth", "cropHeight"]) setControlValue(name, settings[name]);
}

function seedFreeCropFromWorkspace() {
  if (!editorWorkspace || editorFormSettings().ratio !== "free") return;
  const crop = editorWorkspace.history.present.crop;
  setFreeCropControls({
    cropLeft: Math.round(crop.x * 100),
    cropTop: Math.round(crop.y * 100),
    cropWidth: Math.round(crop.width * 100),
    cropHeight: Math.round(crop.height * 100),
  });
}

function reconcileFreeCrop() {
  const settings = editorFormSettings();
  if (settings.ratio !== "free") return;
  const width = Math.max(10, Math.min(100, Number(settings.cropWidth ?? 100)));
  const height = Math.max(10, Math.min(100, Number(settings.cropHeight ?? 100)));
  const left = Math.max(0, Math.min(100 - width, Number(settings.cropLeft ?? 0)));
  const top = Math.max(0, Math.min(100 - height, Number(settings.cropTop ?? 0)));
  setFreeCropControls({
    cropLeft: Math.round(left),
    cropTop: Math.round(top),
    cropWidth: Math.round(Math.min(width, 100 - left)),
    cropHeight: Math.round(Math.min(height, 100 - top)),
  });
}

function beginCropDrag(event) {
  if (!editorWorkspace || selectedTask?.id !== "UT-TUNE" || elements.editorPreviewFrame.dataset.cropEnabled !== "true") return;
  if (event.button !== 0) return;
  if (!elements.editorCropBox.contains(event.target)) return;
  const rect = elements.editorPreviewFrame.getBoundingClientRect();
  editorCropDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    frameWidth: rect.width,
    frameHeight: rect.height,
    axis: elements.editorPreviewFrame.dataset.cropAxis,
    operation: event.target === elements.editorCropResize ? "resize" : "move",
    settings: editorFormSettings(),
  };
  elements.editorPreviewFrame.setPointerCapture?.(event.pointerId);
  elements.editorPreviewFrame.classList.add("is-dragging");
  event.preventDefault();
}

function moveCropDrag(event) {
  if (!editorCropDrag || editorCropDrag.pointerId !== event.pointerId) return;
  const change = {
    deltaX: event.clientX - editorCropDrag.startX,
    deltaY: event.clientY - editorCropDrag.startY,
    frameWidth: editorCropDrag.frameWidth,
    frameHeight: editorCropDrag.frameHeight,
  };
  const settings = editorCropDrag.axis === "both" ? moveEditorFreeCrop(editorCropDrag.settings, {
    ...change,
    operation: editorCropDrag.operation,
  }) : moveEditorCrop(editorCropDrag.settings, {
    ...change,
    axis: editorCropDrag.axis,
  });
  if (editorCropDrag.axis === "both") setFreeCropControls(settings);
  else setCropControls(settings);
  previewEditorForm();
}

function finishCropDrag(event, { commit = true } = {}) {
  if (!editorCropDrag || editorCropDrag.pointerId !== event.pointerId) return;
  elements.editorPreviewFrame.releasePointerCapture?.(event.pointerId);
  elements.editorPreviewFrame.classList.remove("is-dragging");
  editorCropDrag = null;
  if (commit) commitEditorForm();
  else syncEditorForm();
}

function nudgeCropWithKeyboard(event) {
  if (!editorWorkspace || elements.editorPreviewFrame.dataset.cropEnabled !== "true") return;
  const axis = elements.editorPreviewFrame.dataset.cropAxis;
  const arrows = new Set(axis === "horizontal"
    ? ["ArrowLeft", "ArrowRight"]
    : axis === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
  if (!arrows.has(event.key)) return;
  const settings = editorFormSettings();
  const step = event.shiftKey ? 10 : 2;
  if (axis === "both") {
    const rect = elements.editorPreviewFrame.getBoundingClientRect();
    const resizing = event.target === elements.editorCropResize;
    const changed = moveEditorFreeCrop(settings, {
      deltaX: event.key === "ArrowLeft" ? -rect.width * step / 100 : event.key === "ArrowRight" ? rect.width * step / 100 : 0,
      deltaY: event.key === "ArrowUp" ? -rect.height * step / 100 : event.key === "ArrowDown" ? rect.height * step / 100 : 0,
      frameWidth: rect.width,
      frameHeight: rect.height,
      operation: resizing ? "resize" : "move",
    });
    setFreeCropControls(changed);
    renderEditorPreview(changed, { transient: true });
  } else {
    if (event.key === "ArrowLeft") settings.cropX = Math.max(0, Number(settings.cropX) - step);
    if (event.key === "ArrowRight") settings.cropX = Math.min(100, Number(settings.cropX) + step);
    if (event.key === "ArrowUp") settings.cropY = Math.max(0, Number(settings.cropY) - step);
    if (event.key === "ArrowDown") settings.cropY = Math.min(100, Number(settings.cropY) + step);
    setCropControls(settings);
    renderEditorPreview(settings, { transient: true });
  }
  commitEditorForm();
  event.preventDefault();
}

function getSettings() {
  if (selectedTask?.id === "UT-TUNE" && editorWorkspace) {
    if (!commitEditorForm()) throw new Error("请先修正编辑设置");
    return editorSettings(editorWorkspace);
  }
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
  let settings;
  try {
    settings = getSettings();
  } catch (error) {
    setEditorValidity(error);
    toast(error.message || "请先修正编辑设置");
    return;
  }
  dispatch(STUDIO_EVENTS.UPDATE_CONFIG, { config: settings, valid: true, settingsHash: await settingsHash(settings) });
  const runId = createRuntimeId();
  dispatch(STUDIO_EVENTS.START_RUN, { runId, startedAt: new Date().toISOString() });
  const runToken = currentRunToken(machine);
  const sourceHashAtStart = machine.source.hash;
  clearResult();
  const runController = new AbortController();
  activeController = runController;
  showOnly("status");
  setJourney("result");
  elements.cancelWait.hidden = false;
  elements.statusTitle.textContent = selectedTask.id === "UT-TUNE" ? "正在本地处理" : "正在生成新的图片";
  elements.statusCopy.textContent = selectedTask.id === "UT-TUNE" ? "只做确定性的构图、编码与整体色调处理。" : "正在保留来源事实并应用选定的视觉方法。";

  try {
    let result;
    if (selectedTask.id === "UT-TUNE") {
      const processed = await runLocalEditor({ file: source.file, settings });
      if (runController.signal.aborted || machine.activeRunId !== runId) {
        revokeIfBlob(processed.url);
        return;
      }
      result = {
        id: createRuntimeId(), url: processed.url, blob: processed.blob, mimeType: processed.mime, extension: processed.extension,
        width: processed.width, height: processed.height, outputHash: processed.outputHash, byteLength: processed.byteLength,
        hasAlpha: processed.hasAlpha, validationSummary: processed.validationSummary, processor: processed.processor, title: "本地整理完成",
      };
    } else {
      const payload = {
        clientRunId: runId, taskId: selectedTask.id, sourceImage: await dataUrlForFile(source.file), referenceImages: [],
        prompt: creativePrompt(settings), quality: settings.quality || "medium", outputFormat: "png", size: "auto",
      };
      let created;
      try {
        created = await api.createRun(payload, { signal: runController.signal, timeoutMs: 22_000 });
      } catch (error) {
        if (!(error instanceof ApiClientError) || !error.isUnknown) throw error;
        created = await recoverCreatedRun(runId, error);
      }
      if (created.id !== runId) throw new Error("生成任务编号不一致，已阻止结果进入页面");
      const finished = await api.pollRun(runId, {
        signal: runController.signal, timeoutMs: 190_000, intervalMs: 1000,
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
      ...runToken, resultId: result.id, qaVersion: selectedTask.id === "UT-TUNE" ? "editor-output-validation-v1" : "creative-response-validation-v1",
      resultPatch: {
        mimeType: result.mimeType, byteLength: result.byteLength, outputHash: result.outputHash, hasAlpha: result.hasAlpha,
        completedAt: new Date().toISOString(), version: selectedTask.contractVersion,
      },
    });
    currentResult = { ...result, runId, taskId: selectedTask.id, taskTitle: selectedTask.title };
    if (activeController === runController) activeController = null;
    renderResult();
  } catch (error) {
    if (runController.signal.aborted || (error instanceof ApiClientError && error.outcome === "ABORTED")) return;
    if (machine.activeRunId !== runId) return;
    const unknown = error instanceof ApiClientError && error.isUnknown;
    dispatch(unknown ? STUDIO_EVENTS.MARK_RUN_UNKNOWN : STUDIO_EVENTS.RUN_FAILED, { ...runToken, code: error.code, message: error.message });
    if (activeController === runController) activeController = null;
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
  elements.resultImage.alt = "完整显示的当前处理结果";
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
elements.backToTasks.addEventListener("click", () => { selectedTask = null; clearEditorWorkspace(); showOnly("tasks"); setJourney("task"); });
elements.settingsForm.addEventListener("input", (event) => {
  if (selectedTask?.id !== "UT-TUNE" || !editorWorkspace) return;
  const changedName = event.target?.name;
  if (changedName === "ratio") seedFreeCropFromWorkspace();
  if (["cropLeft", "cropTop", "cropWidth", "cropHeight"].includes(changedName)) reconcileFreeCrop();
  if (["sizeMode", "ratio", "rotation", "outputLongEdge", "cropWidth", "cropHeight"].includes(changedName)) {
    reconcileCustomSize(changedName);
  }
  previewEditorForm();
});
elements.settingsForm.addEventListener("change", (event) => {
  if (selectedTask?.id !== "UT-TUNE") return;
  const changedName = event.target?.name;
  if (changedName === "ratio") seedFreeCropFromWorkspace();
  if (["cropLeft", "cropTop", "cropWidth", "cropHeight"].includes(changedName)) reconcileFreeCrop();
  if (["sizeMode", "ratio", "rotation", "outputLongEdge", "cropWidth", "cropHeight"].includes(changedName)) {
    reconcileCustomSize(changedName);
  }
  commitEditorForm();
});
elements.settingsForm.addEventListener("submit", (event) => { event.preventDefault(); runSelectedTask(); });
elements.editorUndo.addEventListener("click", () => {
  if (!editorWorkspace) return;
  editorWorkspace = undoEditorWorkspace(editorWorkspace);
  syncEditorForm();
});
elements.editorRedo.addEventListener("click", () => {
  if (!editorWorkspace) return;
  editorWorkspace = redoEditorWorkspace(editorWorkspace);
  syncEditorForm();
});
elements.editorReset.addEventListener("click", () => {
  if (!editorWorkspace) return;
  editorWorkspace = resetEditorWorkspace(editorWorkspace);
  syncEditorForm();
  toast("编辑设置已重置");
});
elements.editorPreviewFrame.addEventListener("pointerdown", beginCropDrag);
elements.editorPreviewFrame.addEventListener("pointermove", moveCropDrag);
elements.editorPreviewFrame.addEventListener("pointerup", (event) => finishCropDrag(event));
elements.editorPreviewFrame.addEventListener("pointercancel", (event) => finishCropDrag(event, { commit: false }));
elements.editorPreviewFrame.addEventListener("keydown", nudgeCropWithKeyboard);
elements.redo.addEventListener("click", () => { clearResult(); showOnly("config"); setJourney("task"); });
elements.retry.addEventListener("click", runSelectedTask);
elements.recover.addEventListener("click", recoverUnknownRun);
elements.errorBack.addEventListener("click", () => {
  if (machine.status === STUDIO_STATES.RUN_UNKNOWN) dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  selectedTask = null;
  clearEditorWorkspace();
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
  if (layer === "source") {
    elements.resultImage.src = sourceUrl;
    elements.resultImage.alt = "完整显示的原图";
  }
  if (layer === "result") {
    elements.resultImage.src = currentResult.url;
    elements.resultImage.alt = "完整显示的当前处理结果";
  }
}));
window.addEventListener("beforeunload", () => { stopActiveRequest(); clearEditorWorkspace(); revokeIfBlob(sourceUrl); revokeIfBlob(currentResult?.url); });

showOnly("empty");
setJourney("source");
checkStatus();
