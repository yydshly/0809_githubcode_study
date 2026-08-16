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
import {
  applyMaskStroke,
  commitMaskStroke,
  composeCorrectedPixels,
  composeSolidBackgroundPixels,
  correctionViewMask,
  correctionZoomDimensions,
  createMaskCorrectionHistory,
  previewCorrectionDimensions,
  rebuildCorrectionMask,
  redoMaskStroke,
  resetMaskCorrection,
  summarizeCorrectionMask,
  undoMaskStroke,
  validateCorrectionExportDimensions,
} from "./mask-correction.js";
import { maskOutputPresentation } from "./mask-output-presentation.js";
import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";
import { buildResultDownloadContract } from "./result-download.js";
import { applyRecoveryPresentation, recoveryPresentation } from "./recovery-presentation.js";
import { fitComparisonStage, orientedMediaDimensions } from "./result-stage.js";
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
  resultSection: $("#result-section"), resultStage: $("#result-stage"), resultTitle: $("#result-title"), resultSummary: $("#result-summary"),
  resultSourcePanel: $("#compare-source-panel"), resultSourceImage: $("#result-source-image"),
  resultOutputPanel: $("#compare-result-panel"), resultOutputImage: $("#result-output-image"),
  resultOutputTab: $("#compare-result-tab"),
  maskCorrectionWorkspace: $("#mask-correction-workspace"), maskCorrectionCanvas: $("#mask-correction-canvas"),
  maskCorrectionStatus: $("#mask-correction-status"), maskBrushCursor: $("#mask-brush-cursor"),
  maskErase: $("#mask-erase-button"), maskKeep: $("#mask-keep-button"), maskBrushSize: $("#mask-brush-size"),
  maskBrushSizeOutput: $("#mask-brush-size-output"), maskUndo: $("#mask-undo-button"),
  maskRedo: $("#mask-redo-button"), maskReset: $("#mask-reset-button"),
  maskViews: $$('[data-mask-view]'),
  maskBackgrounds: $$('[data-mask-background]'),
  maskZooms: $$('[data-mask-zoom]'),
  maskOutputSummary: $("#mask-output-summary"), maskOutputVersion: $("#mask-output-version"),
  maskOutputBackground: $("#mask-output-background"), maskOutputFile: $("#mask-output-file"),
  maskOutputNote: $("#mask-output-note"),
  referenceExplainer: $("#reference-explainer"), referenceMark: $("#reference-mark"),
  referenceTitle: $("#reference-title"), referenceCopy: $("#reference-copy"), qaCopy: $("#qa-copy"), resultSize: $("#result-size"),
  processingRecordCard: $("#processing-record-card"), processingRecordCopy: $("#processing-record-copy"),
  processingRecordProvider: $("#processing-record-provider"), processingRecordStatus: $("#processing-record-status"),
  deleteProcessingRecord: $("#delete-processing-record"),
  redo: $("#redo-button"), download: $("#download-button"),
  errorPanel: $("#error-panel"), errorTitle: $("#error-title"), errorCopy: $("#error-copy"), recover: $("#recover-button"), fallbackEditor: $("#fallback-editor-button"), retry: $("#retry-button"), errorBack: $("#error-back-button"),
  canvas: $("#processing-canvas"), toast: $("#toast"), journey: $$(".journey li"), tabs: $$(".compare-tabs button"),
};

const TASK_COPY = Object.freeze({
  "UT-TUNE": Object.freeze({
    title: "保真整理",
    badge: "本地可用",
    kind: "utility",
    description: "校正比例、方向与整体光色，不重建主体，也不上传图片。",
    longDescription: "在本机调整构图位置、比例、方向、输出尺寸与整体光色，再生成可下载文件。预览与下载共用同一组编辑参数。",
    preserve: "不主动生成新主体或物件；裁切范围始终由你明确调整",
    change: "构图位置、画面比例、方向、整体光色、输出尺寸与格式",
    output: "PNG / JPEG",
    referenceTitle: "保真整理参考",
    referenceCopy: "参考的是清晰、克制的编辑原则：不补画、不换主体，只整理画布与整体光色。",
  }),
  CR1: Object.freeze({
    title: "手绘记忆重构",
    badge: "远程生成",
    kind: "creative",
    description: "保留主体关系，把照片重构为有纸张、铅笔与颜料痕迹的完整画面。",
    longDescription: "使用真实图片编辑服务重构视觉媒介。它会显著改变笔触和材质，但不承诺人物面孔或身份一致。",
    preserve: "主体类别、姿态、关键物件与场景关系",
    change: "绘画媒介、纸张肌理、光色与细节表达",
    output: "PNG",
    referenceTitle: "手绘记忆方法",
    referenceCopy: "处理原则是保留主体关系，把视觉媒介转为层叠纸墨与手绘痕迹；结果仍需要你比较确认。",
  }),
  "UT-CUTOUT": Object.freeze({
    title: "主体与背景",
    badge: "远程抠图",
    kind: "utility",
    description: "自动识别主体并移除背景，输出透明 PNG；结果可与完整原图切换比较。",
    longDescription: "图片会在你明确同意后发送给已连接的远程抠图服务。服务只负责产生透明主体；不会生成新背景，也不会把生成式图片冒充精确抠图。",
    preserve: "原图主体像素，以及服务识别出的发丝、孔洞和半透明边缘",
    change: "背景会变为透明；发丝、孔洞和半透明边缘可能仍需手动修正",
    output: "透明 PNG",
    referenceTitle: "主体蒙版",
    referenceCopy: "请重点检查发丝、孔洞和半透明边缘；轮廓大致正确不代表细节已经可用。",
  }),
  "UT-PORTRAIT": Object.freeze({
    title: "标准底色头像",
    badge: "正在开发",
    kind: "pending",
    description: "面向通用头像与报名照；尺寸、底色与裁切参数会在质量检查完成后开放。",
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
let backgroundRemovalStatus = { available: false, status: "checking" };
let source = null;
let sourceUrl = null;
let tasks = [];
let selectedTask = null;
let currentResult = null;
let selectedComparisonLayer = "result";
let editorWorkspace = null;
let editorCropDrag = null;
let maskCorrectionSession = null;
let maskCorrectionInitToken = 0;
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

function backgroundRemovalProviderName(provider) {
  return provider?.id === "photoroom.background-removal" ? "PhotoRoom" : "远程抠图服务";
}

function revokeIfBlob(url) {
  if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function clearResult() {
  maskCorrectionInitToken += 1;
  maskCorrectionSession = null;
  elements.maskCorrectionWorkspace.hidden = true;
  elements.maskCorrectionCanvas.hidden = true;
  elements.maskCorrectionCanvas.width = 1;
  elements.maskCorrectionCanvas.height = 1;
  elements.maskCorrectionCanvas.removeAttribute("style");
  elements.maskOutputSummary.hidden = true;
  elements.resultOutputPanel.classList.remove("is-mask-zoomed");
  elements.maskBrushCursor.hidden = true;
  elements.resultOutputImage.hidden = false;
  elements.resultOutputImage.removeAttribute("src");
  elements.resultStage.removeAttribute("style");
  elements.resultStage.removeAttribute("data-preview-background");
  delete elements.resultStage.dataset.aspect;
  revokeIfBlob(currentResult?.url);
  currentResult = null;
  elements.processingRecordCard.hidden = true;
  elements.deleteProcessingRecord.disabled = false;
  elements.deleteProcessingRecord.textContent = "清除本地处理记录";
  elements.processingRecordStatus.textContent = "本地记录可用于任务恢复";
}

function clearEditorWorkspace() {
  editorWorkspace = null;
  editorCropDrag = null;
  elements.editorWorkspace.hidden = true;
  elements.editorPreviewImage.removeAttribute("src");
  elements.editorPreviewImage.removeAttribute("style");
}

function canvasPixels(image, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法建立蒙版修正画布");
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

function alphaPlane(rgba) {
  const alpha = new Uint8ClampedArray(rgba.length / 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = rgba[pixel * 4 + 3];
  return alpha;
}

function renderMaskCorrection() {
  const session = maskCorrectionSession;
  if (!session) return;
  const viewAutomatic = session.view === "automatic";
  const output = composeCorrectedPixels({
    sourcePixels: session.previewSourcePixels,
    resultPixels: session.previewResultPixels,
    mask: correctionViewMask(session.history, session.mask, session.view),
    width: session.width,
    height: session.height,
  });
  const context = elements.maskCorrectionCanvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法渲染蒙版修正预览");
  const imageData = context.createImageData(session.width, session.height);
  imageData.data.set(output);
  context.putImageData(imageData, 0, 0);
  const summary = summarizeCorrectionMask(session.mask);
  const modified = session.history.index > 0;
  const backgroundLabel = { white: "白", black: "黑", coral: "彩" }[session.background];
  const outputPresentation = maskOutputPresentation({
    background: session.background,
    correctionCount: session.history.index,
    height: currentResult.height,
    view: session.view,
    width: currentResult.width,
  });
  elements.maskErase.setAttribute("aria-pressed", String(session.tool === "erase"));
  elements.maskKeep.setAttribute("aria-pressed", String(session.tool === "keep"));
  elements.maskErase.disabled = viewAutomatic;
  elements.maskKeep.disabled = viewAutomatic;
  elements.maskBrushSize.disabled = viewAutomatic;
  elements.maskBrushSize.value = String(Math.round(session.radius * 100));
  elements.maskBrushSizeOutput.value = `${Math.round(session.radius * 100)}%`;
  elements.maskBrushSizeOutput.textContent = `${Math.round(session.radius * 100)}%`;
  elements.maskUndo.disabled = viewAutomatic || session.history.index === 0;
  elements.maskRedo.disabled = viewAutomatic || session.history.index >= session.history.strokes.length;
  elements.maskReset.disabled = viewAutomatic || (!modified && session.history.strokes.length === 0);
  elements.maskViews.forEach((button) => {
    const selected = button.dataset.maskView === session.view;
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = button.dataset.maskView === "automatic" && !modified;
  });
  elements.maskCorrectionCanvas.classList.toggle("is-mask-readonly", viewAutomatic);
  elements.maskCorrectionCanvas.tabIndex = viewAutomatic ? -1 : 0;
  elements.maskCorrectionCanvas.setAttribute("aria-label", viewAutomatic
    ? "自动抠图结果，只读对比"
    : "透明抠图蒙版修正画布");
  if (viewAutomatic) elements.maskBrushCursor.hidden = true;
  elements.maskZooms.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.maskZoom) === session.zoom)));
  elements.download.textContent = outputPresentation.downloadLabel;
  elements.maskOutputSummary.hidden = false;
  elements.maskOutputVersion.textContent = outputPresentation.version;
  elements.maskOutputBackground.textContent = outputPresentation.background;
  elements.maskOutputFile.textContent = outputPresentation.file;
  elements.maskOutputNote.textContent = outputPresentation.note;
  elements.maskCorrectionStatus.textContent = viewAutomatic
    ? `正在查看未修正的自动结果；已保留 ${session.history.index} 笔修正，下载仍使用修正后版本。`
    : session.draft
    ? `${session.tool === "erase" ? "正在擦除背景残留" : "正在补回主体"}…`
    : modified
      ? `已记录 ${session.history.index} 笔修正 · 透明 ${summary.transparent.toLocaleString()} 像素 · 下载时按原尺寸重新生成${session.background === "checker" ? "透明 PNG" : `${backgroundLabel}底 JPEG`}`
      : `当前仍是自动蒙版；${session.background === "checker" ? "下载将保留透明背景" : `下载将写入${backgroundLabel}色背景`}。`;
}

function setMaskView(view) {
  const session = maskCorrectionSession;
  if (!session || !["automatic", "corrected"].includes(view)) return;
  if (view === "automatic" && session.history.index === 0) return;
  session.view = view;
  renderMaskCorrection();
}

function setMaskTool(tool) {
  if (!maskCorrectionSession || maskCorrectionSession.view !== "corrected" || !["erase", "keep"].includes(tool)) return;
  maskCorrectionSession.tool = tool;
  renderMaskCorrection();
}

function setMaskBackground(background) {
  if (!["checker", "white", "black", "coral"].includes(background)) return;
  if (maskCorrectionSession) maskCorrectionSession.background = background;
  if (background === "checker") elements.resultStage.removeAttribute("data-preview-background");
  else elements.resultStage.dataset.previewBackground = background;
  elements.maskBackgrounds.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.maskBackground === background));
  });
  renderMaskCorrection();
}

function applyMaskZoom({ preserveCenter = false } = {}) {
  const session = maskCorrectionSession;
  if (!session || elements.maskCorrectionCanvas.hidden || selectedComparisonLayer !== "result") return;
  const panel = elements.resultOutputPanel;
  const previousCenterX = panel.scrollWidth > 0 ? (panel.scrollLeft + panel.clientWidth / 2) / panel.scrollWidth : 0.5;
  const previousCenterY = panel.scrollHeight > 0 ? (panel.scrollTop + panel.clientHeight / 2) / panel.scrollHeight : 0.5;
  const dimensions = correctionZoomDimensions(
    session.width,
    session.height,
    Math.max(1, panel.clientWidth),
    Math.max(1, panel.clientHeight),
    session.zoom,
  );
  elements.maskCorrectionCanvas.style.width = `${dimensions.width}px`;
  elements.maskCorrectionCanvas.style.height = `${dimensions.height}px`;
  panel.classList.toggle("is-mask-zoomed", session.zoom > 1);
  if (session.zoom > 1) {
    panel.scrollLeft = Math.max(0, previousCenterX * panel.scrollWidth - panel.clientWidth / 2);
    panel.scrollTop = Math.max(0, previousCenterY * panel.scrollHeight - panel.clientHeight / 2);
  } else {
    panel.scrollLeft = 0;
    panel.scrollTop = 0;
  }
  if (preserveCenter) showMaskCursor(session.keyboardCursor, { ensureVisible: true });
}

function setMaskZoom(zoom) {
  if (!maskCorrectionSession || ![1, 2, 4].includes(zoom)) return;
  maskCorrectionSession.zoom = zoom;
  applyMaskZoom({ preserveCenter: true });
  renderMaskCorrection();
}

function showMaskCursor(point, { ensureVisible = false } = {}) {
  const session = maskCorrectionSession;
  if (!session || elements.maskCorrectionCanvas.hidden) return;
  const canvasRect = elements.maskCorrectionCanvas.getBoundingClientRect();
  const panelRect = elements.resultOutputPanel.getBoundingClientRect();
  const size = session.radius * 2 * Math.min(canvasRect.width, canvasRect.height);
  elements.maskBrushCursor.style.setProperty("--mask-cursor-x", `${elements.maskCorrectionCanvas.offsetLeft + point.x * canvasRect.width}px`);
  elements.maskBrushCursor.style.setProperty("--mask-cursor-y", `${elements.maskCorrectionCanvas.offsetTop + point.y * canvasRect.height}px`);
  elements.maskBrushCursor.style.setProperty("--mask-cursor-size", `${Math.max(8, size)}px`);
  elements.maskBrushCursor.hidden = false;
  if (ensureVisible && session.zoom > 1) {
    const margin = Math.max(20, size / 2 + 8);
    let deltaX = 0;
    let deltaY = 0;
    const cursorX = canvasRect.left + point.x * canvasRect.width;
    const cursorY = canvasRect.top + point.y * canvasRect.height;
    if (cursorX < panelRect.left + margin) deltaX = cursorX - panelRect.left - margin;
    if (cursorX > panelRect.right - margin) deltaX = cursorX - panelRect.right + margin;
    if (cursorY < panelRect.top + margin) deltaY = cursorY - panelRect.top - margin;
    if (cursorY > panelRect.bottom - margin) deltaY = cursorY - panelRect.bottom + margin;
    if (deltaX || deltaY) {
      elements.resultOutputPanel.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
      requestAnimationFrame(() => showMaskCursor(point));
    }
  }
}

function maskPointForPointer(event) {
  const bounds = elements.maskCorrectionCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
  };
}

function beginMaskStroke(event) {
  const session = maskCorrectionSession;
  if (!session || session.view !== "corrected" || selectedComparisonLayer !== "result" || event.button !== 0) return;
  event.preventDefault();
  const point = maskPointForPointer(event);
  session.pointerId = event.pointerId;
  session.draft = { tool: session.tool, radius: session.radius, points: [point] };
  elements.maskCorrectionCanvas.setPointerCapture(event.pointerId);
  applyMaskStroke(session.mask, session.width, session.height, session.draft);
  showMaskCursor(point);
  renderMaskCorrection();
}

function continueMaskStroke(event) {
  const session = maskCorrectionSession;
  if (!session || session.view !== "corrected") return;
  const point = maskPointForPointer(event);
  showMaskCursor(point);
  if (!session?.draft || session.pointerId !== event.pointerId) return;
  event.preventDefault();
  const previous = session.draft.points.at(-1);
  session.draft.points.push(point);
  applyMaskStroke(session.mask, session.width, session.height, {
    tool: session.draft.tool,
    radius: session.draft.radius,
    points: [previous, point],
  });
  renderMaskCorrection();
}

function finishMaskStroke(event, { commit = true } = {}) {
  const session = maskCorrectionSession;
  if (!session?.draft || session.pointerId !== event.pointerId) return;
  if (elements.maskCorrectionCanvas.hasPointerCapture(event.pointerId)) {
    elements.maskCorrectionCanvas.releasePointerCapture(event.pointerId);
  }
  if (commit) {
    try {
      session.history = commitMaskStroke(session.history, session.draft);
    } catch (error) {
      toast(error instanceof Error ? error.message : "无法记录这次修正");
    }
  }
  session.pointerId = null;
  session.draft = null;
  session.mask = rebuildCorrectionMask(session.history);
  renderMaskCorrection();
}

function undoMaskCorrection() {
  if (!maskCorrectionSession || maskCorrectionSession.view !== "corrected") return;
  maskCorrectionSession.history = undoMaskStroke(maskCorrectionSession.history);
  maskCorrectionSession.mask = rebuildCorrectionMask(maskCorrectionSession.history);
  renderMaskCorrection();
}

function redoMaskCorrection() {
  if (!maskCorrectionSession || maskCorrectionSession.view !== "corrected") return;
  maskCorrectionSession.history = redoMaskStroke(maskCorrectionSession.history);
  maskCorrectionSession.mask = rebuildCorrectionMask(maskCorrectionSession.history);
  renderMaskCorrection();
}

function resetMaskCorrectionSession() {
  if (!maskCorrectionSession || maskCorrectionSession.view !== "corrected") return;
  maskCorrectionSession.history = resetMaskCorrection(maskCorrectionSession.history);
  maskCorrectionSession.mask = rebuildCorrectionMask(maskCorrectionSession.history);
  renderMaskCorrection();
  toast("已恢复自动抠图结果");
}

function maskKeyboard(event) {
  const session = maskCorrectionSession;
  if (!session || session.view !== "corrected") return;
  if (event.key.toLowerCase() === "e") { event.preventDefault(); setMaskTool("erase"); return; }
  if (event.key.toLowerCase() === "k") { event.preventDefault(); setMaskTool("keep"); return; }
  if (event.key === "[") {
    event.preventDefault();
    session.radius = Math.max(0.01, session.radius - 0.01);
    renderMaskCorrection();
    showMaskCursor(session.keyboardCursor, { ensureVisible: true });
    return;
  }
  if (event.key === "]") {
    event.preventDefault();
    session.radius = Math.min(0.25, session.radius + 0.01);
    renderMaskCorrection();
    showMaskCursor(session.keyboardCursor);
    return;
  }
  const movements = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (movements[event.key]) {
    event.preventDefault();
    const [dx, dy] = movements[event.key];
    const step = Math.max(0.005, session.radius * (event.shiftKey ? 1 : 0.35));
    session.keyboardCursor = {
      x: Math.max(0, Math.min(1, session.keyboardCursor.x + dx * step)),
      y: Math.max(0, Math.min(1, session.keyboardCursor.y + dy * step)),
    };
    showMaskCursor(session.keyboardCursor);
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    try {
      session.history = commitMaskStroke(session.history, {
        tool: session.tool,
        radius: session.radius,
        points: [session.keyboardCursor],
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "无法记录这次修正");
      return;
    }
    session.mask = rebuildCorrectionMask(session.history);
    renderMaskCorrection();
    showMaskCursor(session.keyboardCursor);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redoMaskCorrection(); else undoMaskCorrection();
  }
}

async function initializeMaskCorrection() {
  if (selectedTask?.id !== "UT-CUTOUT" || !currentResult || !sourceUrl) return;
  const token = ++maskCorrectionInitToken;
  elements.maskCorrectionWorkspace.hidden = false;
  elements.maskOutputSummary.hidden = true;
  elements.maskCorrectionStatus.textContent = "正在准备修正画布…";
  elements.maskCorrectionCanvas.hidden = true;
  elements.resultOutputImage.hidden = false;
  try {
    const [sourceImage, resultImage] = await Promise.all([
      decodeImage(sourceUrl),
      decodeImage(currentResult.url),
    ]);
    if (token !== maskCorrectionInitToken || !currentResult) return;
    const dimensions = previewCorrectionDimensions(currentResult.width, currentResult.height, 1024);
    const previewSourcePixels = canvasPixels(sourceImage, dimensions.width, dimensions.height);
    const previewResultPixels = canvasPixels(resultImage, dimensions.width, dimensions.height);
    const history = createMaskCorrectionHistory({
      width: dimensions.width,
      height: dimensions.height,
      initialAlpha: alphaPlane(previewResultPixels),
    });
    elements.maskCorrectionCanvas.width = dimensions.width;
    elements.maskCorrectionCanvas.height = dimensions.height;
    maskCorrectionSession = {
      sourceImage,
      resultImage,
      width: dimensions.width,
      height: dimensions.height,
      previewSourcePixels,
      previewResultPixels,
      history,
      mask: rebuildCorrectionMask(history),
      tool: "erase",
      radius: 0.06,
      background: "checker",
      zoom: 1,
      view: "corrected",
      keyboardCursor: { x: 0.5, y: 0.5 },
      draft: null,
      pointerId: null,
    };
    elements.resultOutputImage.hidden = true;
    elements.maskCorrectionCanvas.hidden = false;
    setMaskBackground("checker");
    setMaskZoom(1);
    renderMaskCorrection();
  } catch (error) {
    if (token !== maskCorrectionInitToken) return;
    maskCorrectionSession = null;
    elements.maskCorrectionWorkspace.hidden = false;
    elements.maskCorrectionStatus.textContent = `修正画布暂不可用：${error.message}`;
    elements.resultOutputImage.hidden = false;
  }
}

function canvasEncodedBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("浏览器没有生成修正图片")), mime, quality);
  });
}

async function exportMaskCorrection() {
  const session = maskCorrectionSession;
  if (!session || (session.history.index === 0 && session.background === "checker")) return null;
  const width = currentResult.width;
  const height = currentResult.height;
  validateCorrectionExportDimensions(width, height);
  const sourcePixels = canvasPixels(session.sourceImage, width, height);
  const resultPixels = canvasPixels(session.resultImage, width, height);
  const fullHistory = createMaskCorrectionHistory({ width, height, initialAlpha: alphaPlane(resultPixels) });
  let mask = new Uint8ClampedArray(fullHistory.initialAlpha);
  for (const stroke of session.history.strokes.slice(0, session.history.index)) {
    applyMaskStroke(mask, width, height, stroke);
  }
  const maskSummary = summarizeCorrectionMask(mask);
  if (maskSummary.transparent + maskSummary.partial === 0) throw new Error("当前修正已没有透明背景，请先擦除背景再下载");
  if (maskSummary.opaque + maskSummary.partial === 0) throw new Error("当前修正已把主体全部擦除，请撤销后再下载");
  const correctedPixels = composeCorrectedPixels({ sourcePixels, resultPixels, mask, width, height });
  const backgroundColors = { white: [255, 255, 255], black: [0, 0, 0], coral: [238, 111, 87] };
  const mime = session.background === "checker" ? "image/png" : "image/jpeg";
  const expectedPixels = mime === "image/png"
    ? correctedPixels
    : composeSolidBackgroundPixels({ foregroundPixels: correctedPixels, background: backgroundColors[session.background], width, height });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法生成修正 PNG");
  const imageData = context.createImageData(width, height);
  imageData.data.set(expectedPixels);
  context.putImageData(imageData, 0, 0);
  const blob = await canvasEncodedBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  inspectOutputMetadata(bytes, mime);
  const reopenedUrl = URL.createObjectURL(blob);
  try {
    const reopened = await decodeImage(reopenedUrl);
    const actualPixels = canvasPixels(reopened, width, height);
    verifyPixelRoundTrip({ expected: expectedPixels, actual: actualPixels, width, height, mime });
  } finally {
    URL.revokeObjectURL(reopenedUrl);
  }
  return { blob, mime, background: session.background, outputHash: await sha256Bytes(bytes), byteLength: bytes.length, maskSummary };
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
  elements.resultSourceImage.removeAttribute("src");
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
  const catalog = getTaskCatalog({ aiStatus: apiStatus, backgroundRemovalStatus }).map(preparedTask);
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
    elements.resultSourceImage.removeAttribute("src");
    revokeIfBlob(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    elements.resultSourceImage.src = sourceUrl;
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
    elements.statusCopy.textContent = "正在加载当前可用操作；不会判断图片内容或自动推荐效果。";
    await Promise.all([
      new Promise((resolve) => setTimeout(resolve, 240)),
      checkStatus(),
    ]);
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
  elements.recommendationCopy.textContent = `当前有 ${availableCount} 个可用操作；这里只按服务状态显示，不会猜测图片内容或替你选择效果。`;
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
  (elements.settingsForm.querySelector("input, select") ?? elements.runButton).focus();
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
        <div class="field"><label for="size-mode-setting">导出分辨率</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动（最长边不超过 2048 px，不放大）</option><option value="custom">自定义最长边上限</option></select></div>
        <div class="custom-size-fields" data-custom-size hidden>
          <div class="field"><label for="output-long-edge-setting">最长边上限</label><div class="number-with-unit"><input id="output-long-edge-setting" name="outputLongEdge" type="number" inputmode="numeric" min="1" max="2048" step="1" aria-describedby="custom-size-explanation size-limit-preview" /><span aria-hidden="true">px</span></div></div>
          <output class="size-limit-preview" data-size-limit-preview id="size-limit-preview" aria-live="polite"></output>
          <p class="field-hint" id="custom-size-explanation">这是导出分辨率上限，不是强制尺寸，也不改变裁剪构图。宽高按当前裁剪比例自动计算；裁剪区域本来较小时不会放大，所以结果可能不变。</p>
        </div>
        <div class="field"><label for="format-setting">下载格式</label><select id="format-setting" name="format"><option value="png">PNG（保留透明像素）</option><option value="jpeg">JPEG（透明像素需要填色）</option></select></div>
        <div class="field" data-jpeg-background hidden><label for="jpeg-background-setting">透明区域填充色</label><input id="jpeg-background-setting" name="jpegBackground" type="color" value="#ffffff" aria-describedby="jpeg-background-explanation" /><p class="field-hint" id="jpeg-background-explanation">JPEG 不支持透明，这个颜色只填充原图中的透明或半透明像素。普通不透明照片不会变化；这不是抠图或换背景。</p></div>
      </fieldset>
      <p class="settings-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成下载文件";
    elements.runNote.textContent = "全部在本机完成；不会调用 AI、补画内容或上传图片。生成后会自动检查文件能否正确打开。";
  } else if (task.id === "UT-CUTOUT") {
    const providerSandbox = backgroundRemovalStatus.provider?.environment === "sandbox";
    const providerLabel = backgroundRemovalStatus.provider?.id === "photoroom.background-removal"
      ? `PhotoRoom Remove Background API${providerSandbox ? "（沙盒）" : ""}`
      : "已配置的远程背景移除服务";
    const providerUseCopy = providerSandbox
      ? "当前是免费沙盒测试：结果会带水印，只用于验证流程、透明结构和交互，不作为正式成品。"
      : "这是正式远程调用，可能按次计费，费用由项目服务账户承担。";
    elements.settingsFields.innerHTML = `
      <fieldset class="setting-group remote-processing-consent"><legend><span>1</span> 远程处理确认</legend>
        <div class="remote-processing-summary"><strong>服务方：${providerLabel}</strong><p>只发送当前这张图片的 bytes，用于识别主体并返回透明 PNG；不会同时生成背景、阴影或美化版本。${providerUseCopy}</p></div>
        <label class="consent-check"><input type="checkbox" name="remoteConsent" required /> <span>我同意将当前图片发送给远程抠图服务处理</span></label>
        <p class="field-hint">本地服务不把原图写入任务记录，处理结果只保存在当前服务进程；供应商侧处理与删除遵循项目批准的当前账户条款。失败不会覆盖原图，也不会自动重复提交。</p>
      </fieldset>`;
    elements.runButton.textContent = "移除背景";
    elements.runNote.textContent = providerSandbox
      ? "沙盒结果必须是可打开的透明 PNG；水印结果仅供测试。"
      : "只有可打开、带透明背景的 PNG 才会进入比较和下载。";
  } else {
    elements.settingsFields.innerHTML = `
      <div class="field"><label for="creative-quality">生成质量</label><select id="creative-quality" name="quality"><option value="low">快速草稿</option><option value="medium" selected>标准结果</option><option value="high">精细结果</option></select></div>
      <div class="field"><label for="creative-preserve">必须保留</label><select id="creative-preserve" name="preserve"><option value="subject">主体、动作与关键物件</option><option value="composition">主体与原始构图</option><option value="color">主体与来源色彩</option></select></div>`;
    elements.runButton.textContent = "开始真实生成";
    elements.runNote.textContent = "图片只会从本地服务端发送到已连接的 OpenAI 图片服务；生成结果不会伪造。";
  }
  elements.runButton.disabled = task.id === "UT-CUTOUT";
}

function syncCutoutConsent() {
  if (selectedTask?.id !== "UT-CUTOUT") return;
  elements.runButton.disabled = elements.settingsForm.elements.remoteConsent?.checked !== true;
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
    sizeLimitPreview.textContent = `按当前裁剪比例，最多 ${presentation.state.resize.width} × ${presentation.state.resize.height} px；预计实际尺寸见左侧`;
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
  if (selectedTask?.id === "UT-CUTOUT" && elements.settingsForm.elements.remoteConsent?.checked !== true) {
    throw new Error("请先确认远程抠图处理");
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
  elements.statusTitle.textContent = selectedTask.id === "UT-TUNE"
    ? "正在本地处理"
    : selectedTask.id === "UT-CUTOUT" ? "正在移除背景" : "正在生成新的图片";
  elements.statusCopy.textContent = selectedTask.id === "UT-TUNE"
    ? "只做确定性的构图、编码与整体色调处理。"
    : selectedTask.id === "UT-CUTOUT" ? "正在安全发送当前图片并等待透明结果。" : "正在保留来源事实并应用选定的视觉方法。";

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
        hasAlpha: processed.hasAlpha,
        validationSummary: "已核对文件格式、尺寸与像素；请比较确认画面内容",
        validationDetails: processed.validationSummary,
        processor: "在本机完成", processorVersion: processed.processor, title: "本地整理完成",
      };
    } else if (selectedTask.id === "UT-CUTOUT") {
      result = await runBackgroundRemoval({ runId, runController, sourceHashAtStart });
      if (!result) return;
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
        validationSummary: "已核对结果文件与本次任务；图片内容仍需要你比较确认",
        processor: "远程创意处理",
        title: "创意生成完成",
      };
    }

    if (machine.activeRunId !== runId) return;
    dispatch(STUDIO_EVENTS.RECEIVE_RUN_RESULT, { ...runToken, result });
    dispatch(STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED, {
      ...runToken,
      resultId: result.id,
      qaVersion: selectedTask.id === "UT-TUNE"
        ? "editor-output-validation-v1"
        : selectedTask.id === "UT-CUTOUT" ? "remote-alpha-png-validation-v1" : "creative-response-validation-v1",
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
      unknown ? "处理状态暂时未知" : "这次没有得到可用结果",
      unknown ? "网络中断后仍无法确认任务终态。系统不会自动重复提交；你可以显式重试，或稍后按同一任务编号查询。" : friendlyError(error),
      true,
    );
  }
}

function friendlyError(error) {
  if (error?.code === "background_removal_unavailable" || /抠图服务.*未配置/i.test(error?.message)) return "远程抠图服务尚未连接。原图和本地编辑功能不受影响。";
  if (error?.code === "provider_auth_failed") return "抠图服务凭据无效，请由项目维护者检查服务端配置。";
  if (error?.code === "provider_billing_required") return "抠图服务额度或计费状态不可用，当前图片没有被替换。";
  if (error?.code === "provider_rate_limited") return "抠图服务当前请求较多，请稍后由你手动重试。";
  if (error?.code === "api_key_missing" || /OPENAI_API_KEY|未配置|not configured/i.test(error?.message)) return "创意生成服务尚未连接。你仍可选择“保真整理”，完成本地真实处理与下载。";
  if (error?.code === "moderation_blocked") return "当前图片或请求未通过图片服务的安全检查。请换一张图片或选择其他任务。";
  return error?.message || "请保留原图并重试，失败结果不会进入下载。";
}

function renderResult() {
  if (!currentResult) return;
  elements.download.textContent = selectedTask.id === "UT-CUTOUT" ? "下载透明 PNG" : "下载结果";
  elements.redo.textContent = selectedTask.id === "UT-CUTOUT"
    ? "重新抠图"
    : selectedTask.id === "UT-TUNE"
      ? "继续调整"
      : "重新处理";
  elements.maskCorrectionWorkspace.hidden = selectedTask.id !== "UT-CUTOUT";
  elements.resultTitle.textContent = currentResult.title;
  elements.resultSummary.textContent = `${currentResult.taskTitle} · ${currentResult.processor}`;
  elements.resultSourceImage.src = sourceUrl;
  elements.resultOutputImage.src = currentResult.url;
  elements.resultOutputImage.alt = selectedTask.id === "UT-CUTOUT"
    ? "完整显示的抠图结果"
    : selectedTask.id === "UT-TUNE"
      ? "完整显示的编辑结果"
      : "完整显示的处理结果";
  elements.resultOutputTab.textContent = selectedTask.id === "UT-CUTOUT"
    ? "抠图结果"
    : selectedTask.id === "UT-TUNE"
      ? "编辑结果"
      : "处理结果";
  elements.qaCopy.textContent = currentResult.validationSummary;
  elements.resultSize.textContent = currentResult.width && currentResult.height ? `${currentResult.width} × ${currentResult.height}` : currentResult.mimeType;
  elements.referenceTitle.textContent = selectedTask.referenceTitle;
  elements.referenceCopy.textContent = selectedTask.referenceCopy;
  elements.referenceMark.style.background = selectedTask.id === "UT-TUNE" ? "radial-gradient(circle at 35% 35%, #dce978 0 18%, transparent 19%), repeating-radial-gradient(circle, transparent 0 6px, rgba(255,255,255,.25) 7px 8px)" : "radial-gradient(circle at 30% 30%, #d96d3a, transparent 30%), repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,.22) 9px 10px)";
  elements.processingRecordCard.hidden = selectedTask.id !== "UT-CUTOUT";
  if (selectedTask.id === "UT-CUTOUT") {
    const sandbox = currentResult.provider?.environment === "sandbox";
    const providerName = backgroundRemovalProviderName(currentResult.provider);
    elements.processingRecordProvider.textContent = `${providerName}${sandbox ? " · 沙盒" : ""}`;
    elements.processingRecordCopy.textContent = "当前电脑暂存这次任务编号、图片标识和结果，用于恢复状态。清除后不影响当前页面里的结果和下载。";
    elements.deleteProcessingRecord.disabled = currentResult.localRecordDeleted === true;
    elements.deleteProcessingRecord.textContent = currentResult.localRecordDeleted ? "本地记录已清除" : "清除本地处理记录";
    elements.processingRecordStatus.textContent = currentResult.localRecordDeleted
      ? "本地记录已清除；刷新后无法恢复这次任务"
      : "本地记录可用于任务恢复";
  }
  showOnly("result");
  selectComparisonLayer("result");
  setJourney("result");
  if (selectedTask.id === "UT-CUTOUT") {
    initializeMaskCorrection();
    elements.maskErase.focus();
  } else {
    elements.download.focus();
  }
}

function showError(title, copy, retryable = true) {
  const unknown = machine.status === STUDIO_STATES.RUN_UNKNOWN;
  elements.errorTitle.textContent = title;
  elements.errorCopy.textContent = copy;
  showOnly("error");
  applyRecoveryPresentation(
    { retry: elements.retry, recover: elements.recover, fallback: elements.fallbackEditor, back: elements.errorBack },
    recoveryPresentation({ unknown, retryable, taskId: selectedTask?.id }),
  );
}

function switchToLocalEditor() {
  if (!source || machine.status === STUDIO_STATES.RUN_UNKNOWN) return;
  const localEditor = tasks.find((task) => task.id === "UT-TUNE" && task.runnable);
  if (!localEditor) {
    selectedTask = null;
    showOnly("tasks");
    setJourney("task");
    toast("本地编辑当前不可用；图片仍保留在任务列表中");
    return;
  }
  selectTask(localEditor.id);
  toast("已保留当前图片；本地编辑不会上传");
}

function returnToCutoutSettings(message) {
  clearResult();
  showOnly("config");
  setJourney("task");
  const remoteConsent = elements.settingsForm.elements.remoteConsent;
  if (remoteConsent) remoteConsent.checked = false;
  syncCutoutConsent();
  remoteConsent?.focus();
  if (message) toast(message);
}

async function recoverUnknownRun() {
  if (machine.status !== STUDIO_STATES.RUN_UNKNOWN || !machine.activeRunId) return;
  const runId = machine.activeRunId;
  const runToken = currentRunToken(machine);
  activeController = new AbortController();
  showOnly("status");
  elements.cancelWait.hidden = false;
  elements.statusTitle.textContent = "正在查询原任务";
  const isBackgroundRemoval = selectedTask?.id === "UT-CUTOUT";
  elements.statusCopy.textContent = "不会新建处理请求，只确认之前任务的真实状态。";
  try {
    const poll = isBackgroundRemoval ? api.pollBackgroundRemovalRun : api.pollRun;
    const finished = await poll(runId, {
      signal: activeController.signal,
      timeoutMs: 60_000,
      intervalMs: 1000,
      onUpdate: (run) => { elements.statusCopy.textContent = run.status === "RUNNING" ? "原任务仍在处理。" : "正在确认原任务状态。"; },
    });
    if (machine.activeRunId !== runId) return;
    if (finished.status === "UNKNOWN") {
      showError("处理状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true);
      return;
    }
    if (finished.status !== "SUCCEEDED") {
      dispatch(STUDIO_EVENTS.RUN_FAILED, { ...runToken, code: finished.error?.code, message: finished.error?.message });
      showError("原任务没有得到可用结果", friendlyError(finished.error), true);
      return;
    }
    let result;
    if (isBackgroundRemoval) {
      result = createBackgroundRemovalResult(finished, { recovered: true });
    } else {
      if (!finished.result?.image) throw new Error("图片服务没有返回图片结果");
      const decoded = await decodeImage(finished.result.image);
      result = {
        id: createRuntimeId(), url: finished.result.image, dataUrl: finished.result.image,
        mimeType: `image/${finished.result.outputFormat === "jpeg" ? "jpeg" : finished.result.outputFormat || "png"}`,
        extension: finished.result.outputFormat === "jpeg" ? "jpg" : finished.result.outputFormat || "png",
        width: decoded.naturalWidth, height: decoded.naturalHeight, outputHash: finished.result.imageSha256,
        byteLength: finished.result.imageBytes, hasAlpha: false,
        validationSummary: "恢复查询后已核对结果文件与原任务；图片内容仍需要你比较确认",
        processor: "远程创意处理",
        title: "创意生成完成",
      };
    }
    dispatch(STUDIO_EVENTS.RECEIVE_RUN_RESULT, { ...runToken, result });
    dispatch(STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED, {
      ...runToken, resultId: result.id, qaVersion: isBackgroundRemoval ? "remote-alpha-png-validation-v1" : "creative-response-validation-v1",
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
    showError("处理状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true);
  }
}

async function checkStatus() {
  const [creative, cutout] = await Promise.allSettled([
    api.getStatus({ timeoutMs: 5000 }),
    api.getBackgroundRemovalStatus({ timeoutMs: 5000 }),
  ]);
  const status = creative.status === "fulfilled" ? creative.value : null;
  const cutoutStatus = cutout.status === "fulfilled" ? cutout.value : null;
  const mobilePreview = status?.previewMode === "lan" || cutoutStatus?.previewMode === "lan";
  apiStatus = status
    ? { available: Boolean(status.available), status: status.available ? "available" : "unavailable", model: status.model }
    : { available: false, status: "error" };
  backgroundRemovalStatus = cutoutStatus
    ? { ...cutoutStatus, status: cutoutStatus.available ? "available" : "unavailable" }
    : { available: false, status: "error" };
  elements.mobilePreviewNotice.hidden = !mobilePreview;
  elements.serviceStatus.dataset.tone = apiStatus.available || backgroundRemovalStatus.available ? "online" : "offline";
  elements.serviceStatusCopy.textContent = mobilePreview
    ? "手机预览 · 仅本地处理"
    : apiStatus.available && backgroundRemovalStatus.available
      ? "本地编辑、远程抠图与创意生成已连接"
      : backgroundRemovalStatus.available
        ? backgroundRemovalStatus.provider?.environment === "sandbox"
          ? "本地编辑与 PhotoRoom 沙盒抠图可用"
          : "本地编辑与远程抠图可用"
        : apiStatus.available ? `本地编辑与创意生成可用 · ${status.model}` : "本地处理可用 · 远程服务未连接";
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
  if (selectedTask?.id === "UT-CUTOUT") {
    syncCutoutConsent();
    return;
  }
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
  if (selectedTask?.id === "UT-CUTOUT") {
    syncCutoutConsent();
    return;
  }
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
elements.redo.addEventListener("click", () => {
  if (selectedTask?.id === "UT-CUTOUT") {
    returnToCutoutSettings("再次抠图前，请重新确认本次远程发送");
    return;
  }
  clearResult();
  showOnly("config");
  setJourney("task");
  elements.runButton.focus();
});
elements.retry.addEventListener("click", () => {
  if (selectedTask?.id === "UT-CUTOUT") {
    returnToCutoutSettings("再次抠图前，请重新确认本次远程发送");
    return;
  }
  runSelectedTask();
});
elements.recover.addEventListener("click", recoverUnknownRun);
elements.fallbackEditor.addEventListener("click", switchToLocalEditor);
elements.errorBack.addEventListener("click", async () => {
  if (machine.status === STUDIO_STATES.RUN_UNKNOWN) {
    const backgroundRemovalRunId = selectedTask?.id === "UT-CUTOUT" ? machine.activeRunId : null;
    stopActiveRequest();
    if (backgroundRemovalRunId) {
      await api.cancelBackgroundRemovalRun(backgroundRemovalRunId, { timeoutMs: 8_000 }).catch(() => null);
    }
    dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  }
  selectedTask = null;
  clearEditorWorkspace();
  showOnly(source ? "tasks" : "empty");
  setJourney(source ? "task" : "source");
});
elements.cancelWait.addEventListener("click", async () => {
  if ([STUDIO_STATES.SOURCE_VALIDATING, STUDIO_STATES.ANALYZING].includes(machine.status)) {
    stopActiveRequest();
    cancelCurrentSource();
    toast("已取消图片检查");
    return;
  }
  if (![STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN].includes(machine.status)) return;
  const backgroundRemovalRunId = selectedTask?.id === "UT-CUTOUT" ? machine.activeRunId : null;
  stopActiveRequest();
  if (backgroundRemovalRunId) {
    await api.cancelBackgroundRemovalRun(backgroundRemovalRunId, { timeoutMs: 8_000 }).catch(() => null);
  }
  dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  toast("已停止等待；不会自动重新提交");
  showOnly("config");
  setJourney("task");
});
elements.maskErase.addEventListener("click", () => setMaskTool("erase"));
elements.maskKeep.addEventListener("click", () => setMaskTool("keep"));
elements.maskBrushSize.addEventListener("input", () => {
  if (!maskCorrectionSession) return;
  maskCorrectionSession.radius = Number(elements.maskBrushSize.value) / 100;
  renderMaskCorrection();
  showMaskCursor(maskCorrectionSession.keyboardCursor);
});
elements.maskUndo.addEventListener("click", undoMaskCorrection);
elements.maskRedo.addEventListener("click", redoMaskCorrection);
elements.maskReset.addEventListener("click", resetMaskCorrectionSession);
elements.maskViews.forEach((button) => button.addEventListener("click", () => setMaskView(button.dataset.maskView)));
elements.maskBackgrounds.forEach((button) => button.addEventListener("click", () => setMaskBackground(button.dataset.maskBackground)));
elements.maskZooms.forEach((button) => button.addEventListener("click", () => setMaskZoom(Number(button.dataset.maskZoom))));
elements.maskCorrectionCanvas.addEventListener("pointerdown", beginMaskStroke);
elements.maskCorrectionCanvas.addEventListener("pointermove", continueMaskStroke);
elements.maskCorrectionCanvas.addEventListener("pointerup", (event) => finishMaskStroke(event));
elements.maskCorrectionCanvas.addEventListener("pointercancel", (event) => finishMaskStroke(event, { commit: false }));
elements.maskCorrectionCanvas.addEventListener("pointerleave", () => {
  if (!maskCorrectionSession?.draft) elements.maskBrushCursor.hidden = true;
});
elements.maskCorrectionCanvas.addEventListener("focus", () => {
  if (maskCorrectionSession) showMaskCursor(maskCorrectionSession.keyboardCursor);
});
elements.maskCorrectionCanvas.addEventListener("blur", () => { elements.maskBrushCursor.hidden = true; });
elements.maskCorrectionCanvas.addEventListener("keydown", maskKeyboard);
elements.deleteProcessingRecord.addEventListener("click", async () => {
  if (!currentResult || selectedTask?.id !== "UT-CUTOUT" || currentResult.localRecordDeleted) return;
  elements.deleteProcessingRecord.disabled = true;
  elements.deleteProcessingRecord.textContent = "正在清除…";
  elements.processingRecordStatus.textContent = "正在清除当前电脑服务进程中的任务记录";
  try {
    const response = await api.deleteBackgroundRemovalRecord(currentResult.runId, { timeoutMs: 8_000 });
    if (response?.receipt?.localRecordDeleted !== true || response.receipt.scope !== "local-memory-run-record") {
      throw new Error("服务端没有返回可核对的本地删除回执");
    }
    currentResult.localRecordDeleted = true;
    elements.deleteProcessingRecord.textContent = "本地记录已清除";
    elements.processingRecordStatus.textContent = "本地记录已清除；当前结果仍可查看和下载，刷新后无法恢复这次任务";
    toast("本地处理记录已清除；未向远程供应商发送删除请求");
  } catch (error) {
    elements.deleteProcessingRecord.disabled = false;
    elements.deleteProcessingRecord.textContent = "重新清除本地记录";
    elements.processingRecordStatus.textContent = error instanceof ApiClientError && error.isUnknown
      ? "无法确认本地记录是否已清除；当前结果不受影响"
      : `本地记录未清除：${error.message}`;
  }
});

elements.download.addEventListener("click", async () => {
  if (!currentResult) return;
  const contract = buildResultDownloadContract({ taskId: selectedTask.id, result: machine.result, currentRunId: machine.activeRunId });
  if (!contract.allowed) { toast(contract.message || "当前结果不可下载"); return; }
  if (selectedTask.id === "UT-CUTOUT"
    && maskCorrectionSession
    && (maskCorrectionSession.history.index > 0 || maskCorrectionSession.background !== "checker")) {
    const previousLabel = elements.download.textContent;
    elements.download.disabled = true;
    elements.download.textContent = "正在生成下载图片…";
    try {
      const corrected = await exportMaskCorrection();
      if (!corrected) throw new Error("当前没有需要重新生成的下载图片");
      const url = URL.createObjectURL(corrected.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const suffix = corrected.mime === "image/png"
        ? "-corrected.png"
        : `-${corrected.background}-background.jpg`;
      anchor.download = contract.download.filename.replace(/\.png$/i, suffix);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      const outputLabel = corrected.mime === "image/png" ? "修正透明 PNG" : "纯色背景 JPEG";
      elements.maskCorrectionStatus.textContent = `${outputLabel} 已准备并检查 · ${currentResult.width} × ${currentResult.height}`;
      toast(`${outputLabel} 下载已开始`);
    } catch (error) {
      toast(error.message || "下载图片生成失败");
    } finally {
      elements.download.disabled = false;
      elements.download.textContent = previousLabel;
    }
    return;
  }
  const previousLabel = elements.download.textContent;
  elements.download.disabled = true;
  elements.download.textContent = "正在校验下载…";
  try {
    const response = currentResult.blob ? null : await fetch(currentResult.dataUrl);
    if (response && !response.ok) throw new Error("结果文件暂时无法读取");
    const blob = currentResult.blob ?? await response.blob();
    const actualHash = await sha256Bytes(new Uint8Array(await blob.arrayBuffer()));
    if (actualHash !== contract.download.outputHash || blob.size !== contract.download.byteLength) {
      throw new Error("下载前校验未通过，已阻止错误文件下载");
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = contract.download.filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast("下载已开始");
  } catch (error) {
    toast(error.message || "下载准备失败，请稍后重试");
  } finally {
    elements.download.disabled = false;
    elements.download.textContent = previousLabel;
  }
});
function comparisonLayerDimensions(layer) {
  if (layer === "source") {
    return orientedMediaDimensions(
      source.rawWidth ?? source.width,
      source.rawHeight ?? source.height,
      source.sourceOrientation ?? 1,
    );
  }
  if (layer === "result" && currentResult.width && currentResult.height) {
    return { width: currentResult.width, height: currentResult.height };
  }
  return { width: 16, height: 9 };
}

async function recoverCreatedBackgroundRemovalRun(runId, originalError) {
  try {
    return await api.getBackgroundRemovalRun(runId, { timeoutMs: 8_000 });
  } catch {
    throw originalError;
  }
}

function createBackgroundRemovalResult(finished, { recovered = false } = {}) {
  if (!finished.result?.image || finished.result.hasAlpha !== true || finished.result.mime !== "image/png") {
    throw new Error("抠图服务没有返回经过验证的透明 PNG");
  }
  const providerSandbox = finished.result.provider?.environment === "sandbox";
  return {
    id: createRuntimeId(),
    url: finished.result.image,
    dataUrl: finished.result.image,
    mimeType: "image/png",
    extension: "png",
    width: finished.result.width,
    height: finished.result.height,
    outputHash: finished.result.imageSha256,
    byteLength: finished.result.imageBytes,
    hasAlpha: true,
    validationSummary: `${recovered ? "恢复查询后" : ""}已核对透明 PNG、文件大小与本次任务；${providerSandbox ? "当前为带水印沙盒结果，" : ""}边缘细节仍需要你比较确认`,
    processor: `${backgroundRemovalProviderName(finished.result.provider)}${providerSandbox ? " · 沙盒" : ""}`,
    provider: finished.result.provider ?? null,
    localRecordDeleted: false,
    title: providerSandbox ? "沙盒抠图完成（带水印）" : "背景已移除",
  };
}

async function runBackgroundRemoval({ runId, runController, sourceHashAtStart }) {
  const payload = {
    clientRunId: runId,
    sourceRevision: machine.sourceRevision,
    geometryRevision: 1,
    sourceImage: await dataUrlForFile(source.file),
    sourceSha256: source.hash,
    consent: {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      policyVersion: "background-removal-consent.v0",
    },
  };
  let created;
  try {
    created = await api.createBackgroundRemovalRun(payload, {
      signal: runController.signal,
      timeoutMs: 22_000,
    });
  } catch (error) {
    if (!(error instanceof ApiClientError) || !error.isUnknown) throw error;
    created = await recoverCreatedBackgroundRemovalRun(runId, error);
  }
  if (created.id !== runId) throw new Error("抠图任务编号不一致，已阻止结果进入页面");
  const finished = await api.pollBackgroundRemovalRun(runId, {
    signal: runController.signal,
    timeoutMs: 90_000,
    intervalMs: 700,
    onUpdate: (run) => {
      elements.statusCopy.textContent = run.status === "RUNNING"
        ? "正在识别主体和边缘；原图仍保留在当前页面。"
        : "正在等待远程抠图服务开始。";
    },
  });
  if (machine.activeRunId !== runId || sourceHashAtStart !== machine.source?.hash) return null;
  if (finished.status === "UNKNOWN") {
    throw new ApiClientError(finished.error?.message || "抠图状态暂时未知", {
      code: finished.error?.code,
      outcome: "UNKNOWN",
      details: finished,
    });
  }
  if (finished.status !== "SUCCEEDED") {
    const error = new Error(finished.error?.message || "背景移除没有完成");
    error.code = finished.error?.code;
    throw error;
  }
  return createBackgroundRemovalResult(finished);
}

function syncComparisonStage(layer = selectedComparisonLayer) {
  if (!currentResult || elements.resultSection.hidden) return;
  const dimensions = comparisonLayerDimensions(layer);
  const availableWidth = Math.max(1, elements.resultSection.clientWidth || elements.main.clientWidth || window.innerWidth - 32);
  const mobile = window.matchMedia("(max-width: 620px)").matches;
  const maxHeight = Math.max(1, Math.min(window.innerHeight * .72, mobile ? 400 : 624));
  const fitted = fitComparisonStage({
    mediaWidth: dimensions.width,
    mediaHeight: dimensions.height,
    availableWidth,
    maxHeight,
  });
  elements.resultStage.style.width = `${fitted.width}px`;
  elements.resultStage.style.height = `${fitted.height}px`;
  elements.resultStage.style.setProperty("--result-stage-aspect", fitted.aspectRatio);
  elements.resultStage.dataset.aspect = `${dimensions.width}:${dimensions.height}`;
}

function selectComparisonLayer(layer, { focus = false } = {}) {
  if (!currentResult || !["source", "reference", "result"].includes(layer)) return;
  selectedComparisonLayer = layer;
  let selectedTab = null;
  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.layer === layer;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) selectedTab = tab;
  });
  elements.resultSourcePanel.hidden = layer !== "source";
  elements.resultOutputPanel.hidden = layer !== "result";
  elements.referenceExplainer.hidden = layer !== "reference";
  elements.maskCorrectionWorkspace.hidden = selectedTask?.id !== "UT-CUTOUT" || layer !== "result";
  if (layer !== "result") elements.maskBrushCursor.hidden = true;
  const dimensions = comparisonLayerDimensions(layer);
  if (layer === "source") elements.resultSize.textContent = `完整原图 ${dimensions.width} × ${dimensions.height}`;
  if (layer === "result") elements.resultSize.textContent = currentResult.width && currentResult.height
    ? `${selectedTask?.id === "UT-CUTOUT" ? "抠图结果" : selectedTask?.id === "UT-TUNE" ? "编辑结果" : "处理结果"} ${currentResult.width} × ${currentResult.height}`
    : currentResult.mimeType;
  if (layer === "reference") elements.resultSize.textContent = "处理说明";
  syncComparisonStage(layer);
  if (layer === "result") applyMaskZoom();
  if (focus) selectedTab?.focus();
}

elements.tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectComparisonLayer(tab.dataset.layer));
  tab.addEventListener("keydown", (event) => {
    let targetIndex = null;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) targetIndex = (index + 1) % elements.tabs.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) targetIndex = (index - 1 + elements.tabs.length) % elements.tabs.length;
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = elements.tabs.length - 1;
    if (targetIndex === null) return;
    event.preventDefault();
    selectComparisonLayer(elements.tabs[targetIndex].dataset.layer, { focus: true });
  });
});
window.addEventListener("resize", () => { syncComparisonStage(); applyMaskZoom(); });
window.addEventListener("beforeunload", () => { stopActiveRequest(); clearEditorWorkspace(); revokeIfBlob(sourceUrl); revokeIfBlob(currentResult?.url); });

showOnly("empty");
setJourney("source");
checkStatus();
