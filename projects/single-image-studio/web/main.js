import { ApiClientError, createApiClient } from "./api-client.js";
import { runLocalEditor } from "./editor-session.js";
import { ERROR_CONTEXTS, applyErrorPagePresentation, errorPagePresentation, friendlyErrorMessage, settingsErrorFieldNames } from "./error-presentation.js";
import {
  ENHANCEMENT_PRESETS,
  applyEnhancementPreset,
  matchEnhancementPreset,
} from "./enhancement-presets.js";
import {
  SCENE_TEMPLATE_PRESETS,
  SOCIAL_OUTPUT_PRESETS,
  applySceneTemplate,
  matchSceneTemplate,
  socialOutputSetEntries,
} from "./scene-template-presets.js";
import {
  drawSocialOverlay,
  normalizeSocialOverlaySettings,
} from "./social-card-overlay.js";
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
import { localExecutionPlan } from "./local-execution-controller.js";
import { isPublicLocalOnly } from "./deployment-mode.js";
import { renderPerspectivePreview } from "./perspective-preview.js";
import { renderRectificationPreview } from "./rectification-preview.js";
import {
  DEFAULT_RECTIFICATION_QUAD,
  QUAD_POINT_NAMES,
  constrainRectificationPoint,
  quadAsFormSettings,
  quadFromFormSettings,
} from "./quad-rectification.js";
import { DOCUMENT_SCAN_MODES, documentScanMode } from "./document-scan.js";
import {
  IMAGE_COMPRESSION_PRESETS,
  applyCompressionPreset,
  compressImageToTarget,
  compressionImpactReport,
  compressionReport,
  compressionPreset,
  compressionTargetBytes,
  compressionTargetPressure,
  formatImageBytes,
  matchCompressionPreset,
  normalizeCompressionTargetKilobytes,
} from "./image-compression.js";
import {
  FORMAT_CONVERSION_OPTIONS,
  formatConversionReport,
  formatConversionSettings,
} from "./format-conversion.js";
import {
  CANVAS_FIT_RATIOS,
  applyCanvasFitToEditorSettings,
  canvasFitDimensions,
  drawCanvasFit,
  normalizeCanvasFitSettings,
} from "./canvas-fit.js";
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
import { maskOutputPresentation, resolveMaskBackground } from "./mask-output-presentation.js";
import { PRIVACY_SHARE_PRESETS, applyPrivacySharePreset, matchPrivacySharePreset, normalizePrivacyShareSettings, privacyShareEditorSettings, privacySharePlan, privacyShareReport } from "./privacy-share.js";
import { renderPortraitSheet } from "./portrait-sheet.js";
import {
  PORTRAIT_BACKGROUND_PRESETS,
  PORTRAIT_COMPOSITION_DEFAULTS,
  drawPortraitComposition,
  normalizePortraitCompositionSettings,
  portraitCompositionDimensions,
  portraitOutputSetEntries,
} from "./portrait-composition.js";
import {
  PRODUCT_COMPOSITION_DEFAULTS,
  PRODUCT_OUTPUT_PRESETS,
  alphaBoundsFromRgba,
  drawProductComposition,
  normalizeProductCompositionSettings,
  productCompositionDimensions,
  productOutputSetEntries,
} from "./product-composition.js";
import {
  OLD_PHOTO_RESTORATION_PRIORITIES,
  OLD_PHOTO_RESTORATION_STRENGTHS,
  buildOldPhotoRestorationPrompt,
} from "./old-photo-restoration.js";
import {
  OLD_PHOTO_LOCAL_PRESETS,
  applyOldPhotoLocalPreset,
  matchOldPhotoLocalPreset,
  oldPhotoOutputSetEntries,
} from "./old-photo-local.js";
import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";
import { buildResultDownloadContract } from "./result-download.js";
import { applyRecoveryPresentation, recoveryPresentation } from "./recovery-presentation.js";
import { comparisonSizePresentation, resultFactsPresentation, resultPresentation } from "./result-presentation.js";
import { comparisonLayerState, fitComparisonStage, orientedMediaDimensions } from "./result-stage.js";
import { createRuntimeId } from "./runtime-identity.js";
import { scenarioInitialSettings } from "./scenario-skills.js";
import { assertTaskConsent, assertWorkflowParameterContract, normalizeEditorTaskSettings } from "./settings-controller.js";
import { SOCIAL_GRID_TILE_COUNT, socialGridLayout } from "./social-grid-split.js";
import { prepareSourceFile, sha256Bytes } from "./source-file.js";
import { buildProductTaskCatalog, resetSourceSessionState, selectRunnableTask, taskRuntimeFlags } from "./source-task-controller.js";
import { inspectTechnicalImageElement, technicalImageAdvice } from "./technical-image-check.js";
import { partitionTasksForDisplay, taskAvailabilitySummary } from "./task-groups.js";
import { taskGoalEntries } from "./task-goals.js";
import { UPLOAD_SPECIFICATION_PRESETS, applyUploadSpecificationPreset, matchUploadSpecificationPreset, normalizeUploadSpecification, uploadComplianceReport, uploadSpecificationEditorSettings, uploadSpecificationPlan } from "./upload-specification.js";
import {
  STUDIO_EVENTS,
  STUDIO_STATES,
  createInitialState,
  currentRunToken,
  currentSourceToken,
  reduceStudioState,
} from "./state-machine.js";
import { createStoredZip } from "./zip-bundle.js";
import { workflowDefinitionForTask } from "./workflow-definition.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
function isBackgroundRemovalTask(taskId = selectedTask?.id) {
  return taskRuntimeFlags(taskId).backgroundRemoval;
}

function isComposedBackgroundTask(taskId = selectedTask?.id) {
  return taskRuntimeFlags(taskId).composedBackground;
}

function isRectificationTask(taskId = selectedTask?.id) {
  return taskRuntimeFlags(taskId).rectification;
}

function isEditorTask(taskId = selectedTask?.id) {
  return taskRuntimeFlags(taskId).editor;
}

function isLocalEditorTask(taskId = selectedTask?.id) {
  return taskRuntimeFlags(taskId).localEditor;
}

const elements = {
  main: $("#main"), serviceStatus: $("#service-status"), serviceStatusCopy: $("#service-status-copy"),
  mobilePreviewNotice: $("#mobile-preview-notice"),
  sourcePane: $("#source-pane"), fileInput: $("#file-input"), chooseFile: $("#choose-file-button"), useDemo: $("#use-demo-button"), useOldPhotoDemo: $("#use-old-photo-demo-button"),
  sourceEmpty: $("#source-empty"), sourcePreview: $("#source-preview"), sourceImage: $("#source-image"),
  sourceName: $("#source-name"), sourceMeta: $("#source-meta"), replaceFile: $("#replace-file-button"), tasksReplace: $("#tasks-replace-button"), resultReplace: $("#result-replace-button"), resultUseAsSource: $("#result-use-as-source-button"), resultChangeTask: $("#result-change-task-button"),
  consentCard: $("#consent-card"), rights: $("#rights-checkbox"), confirmSource: $("#confirm-source-button"), cancelSource: $("#cancel-source-button"),
  statusPanel: $("#status-panel"), statusTitle: $("#status-title"), statusCopy: $("#status-copy"), cancelWait: $("#cancel-wait-button"),
  tasksSection: $("#tasks-section"), taskGrid: $("#task-grid"), taskGoalList: $("#task-goal-list"), capabilitySummary: $("#capability-summary"), recommendationCopy: $("#recommendation-copy"),
  technicalCheck: $("#technical-check"), technicalCheckStatus: $("#technical-check-status"), technicalCheckSignals: $("#technical-check-signals"),
  technicalCheckAdvice: $("#technical-check-advice"), technicalCheckAdviceLabel: $("#technical-check-advice-label"), technicalCheckAdviceCopy: $("#technical-check-advice-copy"), technicalCheckAction: $("#technical-check-action"),
  unavailableTasks: $("#unavailable-tasks"), unavailableTasksSummary: $("#unavailable-tasks-summary"), unavailableTaskList: $("#unavailable-task-list"),
  configSection: $("#config-section"), backToTasks: $("#back-to-tasks-button"), configTitle: $("#config-title"),
  configDescription: $("#config-description"), configPreserve: $("#config-preserve"), configChange: $("#config-change"),
  settingsForm: $("#settings-form"), settingsFields: $("#settings-fields"), runButton: $("#run-button"), runNote: $("#run-note"),
  editorWorkspace: $("#editor-workspace"), editorPreviewFrame: $("#editor-preview-frame"), editorPreviewImage: $("#editor-preview-image"), editorPerspectivePreview: $("#editor-perspective-preview"), editorRectificationPreview: $("#editor-rectification-preview"),
  editorRectificationOverlay: $("#editor-rectification-overlay"), editorRectificationShade: $("#editor-rectification-shade"), rectificationHandles: $$("[data-rectification-point]"),
  editorCropBox: $("#editor-crop-box"), editorCropResize: $("#editor-crop-resize"), socialTitlePreview: $("#social-title-preview"),
  editorPreviewSummary: $("#editor-preview-summary"), editorOutputSize: $("#editor-output-size"),
  editorHistorySummary: $("#editor-history-summary"), editorChangeState: $("#editor-change-state"),
  editorCropHint: $("#editor-crop-hint"), editorDragBadge: $("#editor-drag-badge"),
  editorUndo: $("#editor-undo"), editorRedo: $("#editor-redo"), editorReset: $("#editor-reset"),
  resultSection: $("#result-section"), resultStage: $("#result-stage"), resultTitle: $("#result-title"), resultSummary: $("#result-summary"),
  resultSourcePanel: $("#compare-source-panel"), resultSourceImage: $("#result-source-image"),
  resultOutputPanel: $("#compare-result-panel"), resultOutputImage: $("#result-output-image"),
  resultOutputTab: $("#compare-result-tab"),
  compressionImpactCard: $("#compression-impact-card"), compressionImpactLevel: $("#compression-impact-level"),
  compressionImpactFile: $("#compression-impact-file"), compressionImpactPixels: $("#compression-impact-pixels"),
  compressionImpactQuality: $("#compression-impact-quality"), compressionImpactCopy: $("#compression-impact-copy"),
  formatConversionCard: $("#format-conversion-card"), formatConversionFormats: $("#format-conversion-formats"),
  formatConversionDimensions: $("#format-conversion-dimensions"), formatConversionSize: $("#format-conversion-size"),
  formatConversionTransparency: $("#format-conversion-transparency"), formatConversionQuality: $("#format-conversion-quality"),
  canvasFitCard: $("#canvas-fit-card"), canvasFitDimensions: $("#canvas-fit-dimensions"),
  canvasFitPlacement: $("#canvas-fit-placement"), canvasFitOutput: $("#canvas-fit-output"), canvasFitCopy: $("#canvas-fit-copy"),
  uploadComplianceCard: $("#upload-compliance-card"), uploadComplianceState: $("#upload-compliance-state"), uploadComplianceList: $("#upload-compliance-list"),
  privacyShareCard: $("#privacy-share-card"), privacyShareState: $("#privacy-share-state"), privacyShareList: $("#privacy-share-list"), privacyShareBoundary: $("#privacy-share-boundary"),
  maskCorrectionWorkspace: $("#mask-correction-workspace"), maskCorrectionCanvas: $("#mask-correction-canvas"),
  maskCorrectionStatus: $("#mask-correction-status"), maskBrushCursor: $("#mask-brush-cursor"),
  maskErase: $("#mask-erase-button"), maskKeep: $("#mask-keep-button"), maskBrushSize: $("#mask-brush-size"),
  maskBrushSizeOutput: $("#mask-brush-size-output"), maskUndo: $("#mask-undo-button"),
  maskRedo: $("#mask-redo-button"), maskReset: $("#mask-reset-button"),
  maskViews: $$('[data-mask-view]'),
  maskBackgrounds: $$('[data-mask-background]'),
  maskCustomBackground: $("#mask-custom-background"), maskCustomBackgroundControl: $("#mask-custom-background-control"),
  maskZooms: $$('[data-mask-zoom]'),
  maskOutputSummary: $("#mask-output-summary"), maskOutputVersion: $("#mask-output-version"),
  maskOutputBackground: $("#mask-output-background"), maskOutputFile: $("#mask-output-file"),
  maskOutputNote: $("#mask-output-note"),
  productComposition: $("#product-composition-controls"), productCompositionPreview: $("#product-composition-preview"),
  productCompositionReset: $("#product-composition-reset"), productOutputPreset: $("#product-output-preset"), productScale: $("#product-scale"),
  productScaleOutput: $("#product-scale-output"), productPositionX: $("#product-position-x"),
  productPositionXOutput: $("#product-position-x-output"), productPositionY: $("#product-position-y"),
  productPositionYOutput: $("#product-position-y-output"), productShadows: $$('[data-product-shadow]'),
  productOutputSet: $("#product-output-set"), productOutputCards: $$('[data-product-output-card]'),
  productOutputSelects: $$('[data-product-output-select]'), productOutputDownloads: $$('[data-product-output-download]'),
  productOutputDownloadAll: $("#product-output-download-all"), productOutputSetStatus: $("#product-output-set-status"),
  socialOutputSet: $("#social-output-set"), socialOutputCards: $$('[data-social-output-card]'),
  socialOutputSelects: $$('[data-social-output-select]'), socialOutputDownloads: $$('[data-social-output-download]'),
  socialOutputDownloadAll: $("#social-output-download-all"), socialOutputSetStatus: $("#social-output-set-status"),
  oldPhotoOutputSet: $("#old-photo-output-set"), oldPhotoOutputCards: $$('[data-old-photo-output-card]'),
  oldPhotoOutputSelects: $$('[data-old-photo-output-select]'), oldPhotoOutputDownloads: $$('[data-old-photo-output-download]'),
  oldPhotoOutputDownloadAll: $("#old-photo-output-download-all"), oldPhotoOutputSetStatus: $("#old-photo-output-set-status"),
  socialGridOutputSet: $("#social-grid-output-set"), socialGridTiles: $$('[data-social-grid-tile]'),
  socialGridShowOverview: $("#social-grid-show-overview"), socialGridDownloadSelected: $("#social-grid-download-selected"),
  socialGridDownloadAll: $("#social-grid-download-all"), socialGridOutputStatus: $("#social-grid-output-status"),
  portraitComposition: $("#portrait-composition-controls"), portraitCompositionPreview: $("#portrait-composition-preview"),
  portraitCompositionReset: $("#portrait-composition-reset"), portraitOutputPreset: $("#portrait-output-preset"),
  portraitScale: $("#portrait-scale"), portraitScaleOutput: $("#portrait-scale-output"),
  portraitPositionY: $("#portrait-position-y"), portraitPositionYOutput: $("#portrait-position-y-output"),
  portraitOutputSet: $("#portrait-output-set"), portraitOutputCards: $$('[data-portrait-output-card]'),
  portraitOutputSelects: $$('[data-portrait-output-select]'), portraitOutputDownloads: $$('[data-portrait-output-download]'),
  portraitOutputDownloadAll: $("#portrait-output-download-all"), portraitOutputSetStatus: $("#portrait-output-set-status"),
  referenceExplainer: $("#reference-explainer"), referenceMark: $("#reference-mark"),
  referenceTitle: $("#reference-title"), referenceCopy: $("#reference-copy"), qaCopy: $("#qa-copy"), resultSize: $("#result-size"),
  processingRecordCard: $("#processing-record-card"), processingRecordCopy: $("#processing-record-copy"),
  processingRecordProvider: $("#processing-record-provider"), processingRecordStatus: $("#processing-record-status"),
  deleteProcessingRecord: $("#delete-processing-record"),
  redo: $("#redo-button"), download: $("#download-button"), portraitSheet: $("#portrait-sheet-button"),
  errorPanel: $("#error-panel"), errorTitle: $("#error-title"), errorCopy: $("#error-copy"),
  errorDataBoundary: $("#error-data-boundary"), errorRetrySafety: $("#error-retry-safety"), errorActionHint: $("#error-action-hint"),
  errorRunRow: $("#error-run-row"), errorRunId: $("#error-run-id"), errorTechnical: $("#error-technical"),
  errorTechnicalCode: $("#error-technical-code"), errorTechnicalTask: $("#error-technical-task"),
  recover: $("#recover-button"), fallbackEditor: $("#fallback-editor-button"), retry: $("#retry-button"), errorBack: $("#error-back-button"),
  canvas: $("#processing-canvas"), toast: $("#toast"), journey: $$(".journey li"), tabs: $$(".compare-tabs button"),
};

const TASK_COPY = Object.freeze({
  "UT-PRIVACY-SHARE": Object.freeze({
    title: "隐私友好分享副本",
    badge: "处理方案 · 本地",
    kind: "utility",
    description: "清理文件 metadata，并控制 JPEG 尺寸和体积；不会识别画面里的敏感内容。",
    longDescription: "这是一条完全本地的分享准备流程。系统保持完整画面，移除 EXIF / GPS / XMP / IPTC / 注释类文件 metadata，再限制尺寸和体积。它不会自动识别人脸、地址、车牌、水印或画面文字。",
    preserve: "完整可见画面与原始比例；原图不会覆盖或上传",
    change: "输出文件 metadata、JPEG 编码、最长边、体积与透明区域底色",
    output: "隐私友好 JPEG 分享副本",
    referenceTitle: "文件信息清理边界",
    referenceCopy: "输出不包含当前禁止的私密 metadata，但画面中可见的人脸、地址、车牌、文字或屏幕仍会保留，需要你自行检查。",
  }),
  "UT-UPLOAD": Object.freeze({
    title: "上传规格适配",
    badge: "处理方案 · 本地",
    kind: "utility",
    description: "一次设置保留方式、比例、尺寸和文件上限，直接生成可核对的上传 JPEG。",
    longDescription: "这是一条纯本地组合流程。你决定完整保留还是允许裁剪、目标比例、最长边和文件上限；系统依次执行构图、尺寸、JPEG 编码、压缩和最终规格检查。",
    preserve: "由你选择完整保留或允许居中裁剪；原图不会覆盖或上传",
    change: "画布或裁剪、输出尺寸、JPEG 编码和文件体积",
    output: "上传 JPEG",
    referenceTitle: "上传目标检查",
    referenceCopy: "最终结果必须同时满足 JPEG、最长边和文件上限；目标过严时会明确提示未达标。",
  }),
  "UT-DOC-ARCHIVE": Object.freeze({
    title: "文档归档 / 附件",
    badge: "处理方案 · 本地",
    kind: "utility",
    description: "四角裁正纸张，选择文档效果，再生成满足附件上限的 JPEG。",
    longDescription: "手动把四个角贴合纸张或平面，选择原色、清晰彩色、灰度或高对比黑白；系统随后转成 JPEG、压缩到目标体积并核对。不会执行 OCR、自动找边或去反光。",
    preserve: "四角区域内可见内容；原图不会覆盖或上传",
    change: "透视裁正、可选文档增强、JPEG 编码和文件体积",
    output: "文档 JPEG",
    referenceTitle: "归档附件检查",
    referenceCopy: "请确认四边贴合、文字可读且文件大小达标；弯曲纸张、反光和模糊不会自动修复。",
  }),
  "UT-TUNE": Object.freeze({
    title: "基础编辑",
    badge: "本地可用",
    kind: "utility",
    description: "裁剪、旋转、拉直、透视与整体光色调整，不重建主体，也不上传图片。",
    longDescription: "在本机调整构图位置、比例、旋转、水平校正、垂直透视、输出尺寸与整体光色，再生成可下载文件。预览与下载共用同一组编辑参数。",
    preserve: "不主动生成新主体或物件；裁切范围始终由你明确调整",
    change: "构图位置、画面比例、方向、整体光色、输出尺寸与格式",
    output: "PNG / JPEG",
    referenceTitle: "基础编辑参考",
    referenceCopy: "参考的是清晰、克制的编辑原则：不补画、不换主体，只整理画布与整体光色。",
  }),
  "UT-COMPRESS": Object.freeze({
    title: "图片压缩",
    badge: "本地可用",
    kind: "utility",
    description: "解决图片太大、无法上传或发送的问题；保持完整比例，不上传，也不覆盖原图。",
    longDescription: "告诉系统目标文件上限，例如不超过 2 MB、1 MB 或 500 KB。系统会先尽量保留清晰度，仍过大时再按公开顺序逐步降低 JPEG 质量与像素尺寸，并明确显示是否真正达标。",
    preserve: "完整原图比例与可见内容；原文件不会被覆盖或上传",
    change: "为达到文件上限，可能逐级降低输出像素尺寸与 JPEG 质量；透明区域使用白底",
    output: "JPEG",
    referenceTitle: "是否解决了文件过大",
    referenceCopy: "先确认结果标记为“已达目标”，再放大检查文字、人物边缘和细小纹理。未达目标时不会伪装成成功。",
  }),
  "UT-CONVERT": Object.freeze({
    title: "图片格式转换",
    badge: "本地可用",
    kind: "utility",
    description: "把 JPEG、PNG 或 WebP 转成 PNG / JPEG，并明确透明区域和画质变化。",
    longDescription: "选择需要的输出格式。PNG 可保留已有透明像素；JPEG 通常更通用且较小，但会有损编码，并把透明区域填成你选择的颜色。转换不会抠图，也不会恢复原图已经丢失的细节。",
    preserve: "完整原图比例和可见内容；默认尽量保持当前像素尺寸",
    change: "文件容器、编码方式；JPEG 还会改变透明区域和有损质量",
    output: "PNG / JPEG",
    referenceTitle: "格式转换边界",
    referenceCopy: "PNG 适合透明图、图标和截图；JPEG 适合普通照片。转成 PNG 不会把已经压缩模糊的 JPEG 恢复清晰。",
  }),
  "UT-FIT": Object.freeze({
    title: "完整图片适配",
    badge: "本地可用",
    kind: "utility",
    description: "完整保留图片内容，用留白适配方形、竖版或横版画布。",
    longDescription: "当目标平台要求固定比例、但你不想裁掉人物、商品或文字时，把整张图缩放后居中放入目标画布。可以设置留白和底色；这不是 AI 扩图，不会生成画面外内容。",
    preserve: "完整原图内容和比例；小图不会被放大",
    change: "新增目标比例画布、四周留白和底色，不改变图片内部内容",
    output: "PNG / JPEG",
    referenceTitle: "完整适配与裁剪的区别",
    referenceCopy: "裁剪会填满画布但移除边缘；完整适配会保留所有内容，并用留白补足目标比例。透明画布输出 PNG，纯色画布输出 JPEG。",
  }),
  "UT-RECTIFY": Object.freeze({
    title: "文档 / 平面裁正",
    badge: "本地可用",
    kind: "utility",
    description: "手动选四角，把斜拍的纸张、海报、画框或包装正面拉正；文档增强是可选步骤。",
    longDescription: "先在完整原图上把四个角拖到目标平面边缘，再查看真实裁正结果。默认只裁正并保持原色；仅处理纸质文字文档时，再选择清晰彩色、灰度或高对比黑白。全程在本机处理；不会自动识别边缘、执行 OCR、去反光或补画缺失内容。",
    preserve: "四角区域内的原始可见像素；原图不会被覆盖或上传",
    change: "四角外区域会被移除，选中平面会重采样为正视矩形",
    output: "PNG / JPEG",
    referenceTitle: "四角裁正边界",
    referenceCopy: "适合轻度到中度斜拍的近似平面；弯曲纸张、强镜头畸变、折痕和反光不会自动修复。",
  }),
  "UT-ENHANCE": Object.freeze({
    title: "自然增强",
    badge: "本地可用",
    kind: "utility",
    description: "先选择温和预设，再调整光色、轻度降噪和清晰度；不会上传图片或补画细节。",
    longDescription: "所有增强都在当前浏览器完成。预设只是透明、固定的五项参数组合，不会识别人像、天空、自动猜测照片内容或恢复不存在的纹理。",
    preserve: "原始人物、物件、构图与像素关系，不生成新内容",
    change: "整体亮度、对比度、饱和度、轻度降噪与局部清晰度；也可继续调整构图和导出规格",
    output: "PNG / JPEG",
    referenceTitle: "自然增强说明",
    referenceCopy: "“自然”是克制的固定参数，不是 AI 质量判断或失焦修复。请通过生成后的原图 / 结果对比确认是否适合这张照片。",
  }),
  "UT-TEMPLATE": Object.freeze({
    title: "社交头像与封面",
    badge: "场景技能 · 本地",
    kind: "utility",
    description: "从方形、竖版、横版或竖屏构图开始，可选添加一条安全区标题。",
    longDescription: "选择社交头像或封面用途后，会一次写入透明的构图比例和最长边上限；你还可以添加最多两行的本地标题，并直接在裁剪框内预览。它不是平台官方发布规范，也不会放大小图或识别画面内容。",
    preserve: "原始主体、像素关系与未裁切区域；不生成或补画内容",
    change: "裁剪比例、保留位置、导出尺寸上限和可选标题层；可继续旋转、调色或改格式",
    output: "PNG / JPEG",
    referenceTitle: "社交构图说明",
    referenceCopy: "模板与 7% 安全区只是通用构图起点，不是永久有效的平台规范。下载前请核对实际像素尺寸、画面保留区域和标题是否遮挡主体。",
  }),
  "UT-OLD-PHOTO": Object.freeze({
    title: "老照片基础整理",
    badge: "场景技能 · 本地",
    kind: "utility",
    description: "先在本机改善褪色、轻微颗粒与层次，也可裁正和转为黑白；不会上传照片。",
    longDescription: "使用透明、固定的光色、轻度降噪与清晰度参数改善观看效果，并保留裁剪、旋转、尺寸与格式控制。它不会识别划痕、恢复失焦或补画缺失人脸、文字和历史细节。",
    preserve: "原始人物、文字、物件和像素关系；原图永远不会被覆盖",
    change: "整体亮度、对比度、饱和度、轻度降噪、局部清晰度、黑白效果、构图和导出规格",
    output: "PNG / JPEG 基础整理副本",
    referenceTitle: "本地基础整理说明",
    referenceCopy: "这是确定性光色、轻度降噪与构图处理，不是 AI 重建。严重噪点、失焦、划痕、破损和缺失内容不会被自动修补。",
  }),
  "UT-GRID": Object.freeze({
    title: "社交九宫格切图",
    badge: "场景技能 · 本地",
    kind: "utility",
    description: "先确定一张方形总图，再按发布顺序生成九张独立图片。",
    longDescription: "在本机裁出方形总画面，并按左到右、从上到下切成 1–9 号九张 PNG。可以先看整图，再查看单格并下载单图或整组 ZIP。",
    preserve: "总图中的原始像素和九格顺序；不识别主体、不补画，也不自动发布",
    change: "方形保留区域、方向、整体光色和导出上限；结果会拆成九张等大图片",
    output: "9 张 PNG + ZIP",
    referenceTitle: "九宫格顺序说明",
    referenceCopy: "编号按左到右、从上到下排列。发布到社交平台时，具体上传顺序可能因平台展示规则而不同，请先按平台预览核对。",
  }),
  "CR-RESTORE": Object.freeze({
    title: "AI 老照片修复（实验）",
    badge: "场景技能 · 远程生成",
    kind: "creative",
    description: "生成一份便于观看的温和修复副本；原图不会被覆盖。",
    longDescription: "远程图片编辑服务会重新生成像素，尝试改善褪色、低对比、轻微划痕与噪点。它不是无损修复或档案级复原，人物面部、文字和历史细节都可能变化。",
    preserve: "尽量保留人物身份特征、年龄、表情、姿态、服装、物件关系、构图与年代感",
    change: "褪色、对比度、轻微灰尘划痕与噪点；模型可能重绘局部细节",
    output: "PNG 修复副本",
    referenceTitle: "生成式修复说明",
    referenceCopy: "请逐项比较人物五官、手部、文字、徽章、服装和背景物件。若细节与原图不一致，应保留原图并放弃该副本。",
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
    title: "报名照 / 底色头像",
    badge: "场景技能 · 远程抠图",
    kind: "utility",
    description: "先确定人物构图，再移除背景并在本机修边、选择底色。",
    longDescription: "本机先完成裁剪、方向和光色调整；你确认后才把这张经过构图的图片发送给远程抠图服务。返回结果可继续修边并导出纯色 JPEG。",
    preserve: "人物外观、服饰与由你确认的构图区域",
    change: "画面比例、整体光色、背景透明度与最终纯色底",
    output: "方形 / 4:5 JPEG",
    referenceTitle: "报名照与头像说明",
    referenceCopy: "只用于普通社交头像和非官方报名场景；不承诺护照、签证或具体机构受理。",
  }),
  "UT-PRODUCT": Object.freeze({
    title: "商品白底图",
    badge: "场景技能 · 远程抠图",
    kind: "utility",
    description: "先整理商品构图，再移除背景并在本机修边、合成白底。",
    longDescription: "本机先完成 1:1 或 4:5 商品构图；你确认后才发送这份构图进行抠图。返回结果默认使用白底，可继续修边并导出不透明 JPEG。",
    preserve: "商品外观、颜色与由你确认的构图区域",
    change: "画面比例、保留位置、透明蒙版和最终白色背景",
    output: "白底 JPEG",
    referenceTitle: "商品白底图说明",
    referenceCopy: "用于普通商品展示图；可在本地添加基础柔和阴影，但不会理解真实接触面或光源，也不保证任何平台审核或尺寸规范。请检查孔洞、透明材质和边缘。",
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
let technicalCheckState = Object.freeze({ status: "idle", sourceHash: null, inspection: null, advice: null });
let currentResult = null;
let productOutputBusy = false;
let portraitOutputBusy = false;
let socialOutputBusy = false;
let socialOutputSetSession = null;
let socialOutputSetToken = 0;
let oldPhotoOutputBusy = false;
let oldPhotoOutputSetSession = null;
let oldPhotoOutputSetToken = 0;
let socialGridOutputBusy = false;
let socialGridOutputSetSession = null;
let socialGridOutputSetToken = 0;
let selectedComparisonLayer = "result";
let editorWorkspace = null;
let editorCropDrag = null;
let editorRectificationDrag = null;
let rectificationView = "adjust";
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
  elements.resultSection.classList.remove("has-mask-tools");
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
  for (const output of socialOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
  for (const output of oldPhotoOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
  for (const output of socialGridOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
  socialOutputSetToken += 1;
  socialOutputSetSession = null;
  oldPhotoOutputSetToken += 1;
  oldPhotoOutputSetSession = null;
  socialGridOutputSetToken += 1;
  socialGridOutputSetSession = null;
  elements.socialOutputSet.hidden = true;
  elements.oldPhotoOutputSet.hidden = true;
  elements.socialGridOutputSet.hidden = true;
  elements.portraitOutputSet.hidden = true;
  currentResult = null;
  setProductOutputBusy(false);
  setPortraitOutputBusy(false);
  setSocialOutputBusy(false);
  setOldPhotoOutputBusy(false);
  setSocialGridOutputBusy(false);
  elements.processingRecordCard.hidden = true;
  elements.deleteProcessingRecord.disabled = false;
  elements.deleteProcessingRecord.textContent = "清除本地处理记录";
  elements.processingRecordStatus.textContent = "本地记录可用于任务恢复";
}

function clearEditorWorkspace() {
  editorWorkspace = null;
  editorCropDrag = null;
  editorRectificationDrag = null;
  rectificationView = "adjust";
  elements.editorWorkspace.hidden = true;
  elements.editorPreviewImage.removeAttribute("src");
  elements.editorPreviewImage.removeAttribute("style");
  elements.editorPerspectivePreview.hidden = true;
  elements.editorPerspectivePreview.width = 0;
  elements.editorPerspectivePreview.height = 0;
  elements.editorRectificationPreview.hidden = true;
  elements.editorRectificationPreview.width = 0;
  elements.editorRectificationPreview.height = 0;
  elements.editorRectificationOverlay.hidden = true;
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

function pixelsCanvas(pixels, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法建立图片画布");
  const imageData = context.createImageData(width, height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function productPositionLabel(value, before, after) {
  if (value === 50) return "居中";
  return value < 50 ? `${before} ${50 - value}%` : `${after} ${value - 50}%`;
}

function syncProductCompositionControls() {
  const product = selectedTask?.id === "UT-PRODUCT";
  elements.productComposition.hidden = !product;
  elements.productOutputSet.hidden = !product;
  elements.maskBackgrounds.forEach((button) => {
    const portrait = selectedTask?.id === "UT-PORTRAIT";
    const fixedOut = product
      ? button.dataset.maskBackground !== "white"
      : portrait && button.dataset.maskBackground === "checker";
    button.hidden = fixedOut;
    button.disabled = fixedOut;
  });
  elements.maskCustomBackgroundControl.hidden = product;
  if (!product || !maskCorrectionSession?.productComposition) return;
  const composition = maskCorrectionSession.productComposition;
  const scale = Math.round(composition.scale * 100);
  const positionX = Math.round(composition.positionX * 100);
  const positionY = Math.round(composition.positionY * 100);
  elements.productOutputPreset.value = composition.presetId;
  elements.productScale.value = String(scale);
  elements.productScaleOutput.value = `${scale}%`;
  elements.productScaleOutput.textContent = `${scale}%`;
  elements.productPositionX.value = String(positionX);
  elements.productPositionXOutput.value = productPositionLabel(positionX, "偏左", "偏右");
  elements.productPositionXOutput.textContent = elements.productPositionXOutput.value;
  elements.productPositionY.value = String(positionY);
  elements.productPositionYOutput.value = productPositionLabel(positionY, "偏上", "偏下");
  elements.productPositionYOutput.textContent = elements.productPositionYOutput.value;
  elements.productShadows.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.productShadow === composition.shadow)));
  elements.productOutputCards.forEach((card) => {
    card.dataset.selected = String(card.dataset.productOutputCard === composition.presetId);
  });
}

function containedPreviewDimensions(width, height, maxWidth = 320, maxHeight = 220) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return Object.freeze({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  });
}

function renderProductOutputSet(foregroundPixels) {
  const session = maskCorrectionSession;
  if (selectedTask?.id !== "UT-PRODUCT" || !session?.productComposition || !currentResult) return;
  const sourceBounds = alphaBoundsFromRgba({ pixels: foregroundPixels, width: session.width, height: session.height });
  if (!sourceBounds) return;
  const foreground = pixelsCanvas(foregroundPixels, session.width, session.height);
  const entries = productOutputSetEntries(session.productComposition, currentResult.width, currentResult.height);
  for (const entry of entries) {
    const card = elements.productOutputCards.find((item) => item.dataset.productOutputCard === entry.id);
    const canvas = card?.querySelector(`[data-product-output-preview="${entry.id}"]`);
    const detail = card?.querySelector("[data-product-output-detail]");
    if (!card || !canvas || !detail) continue;
    const preview = containedPreviewDimensions(entry.width, entry.height);
    canvas.width = preview.width;
    canvas.height = preview.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法显示商品套装预览");
    drawProductComposition({
      context,
      foreground,
      width: preview.width,
      height: preview.height,
      sourceWidth: session.width,
      sourceHeight: session.height,
      settings: entry.settings,
      sourceBounds,
    });
    detail.textContent = entry.detail;
    card.dataset.selected = String(entry.id === session.productComposition.presetId);
  }
}

function renderProductCompositionPreview(foregroundPixels) {
  const session = maskCorrectionSession;
  if (selectedTask?.id !== "UT-PRODUCT" || !session?.productComposition) return;
  const dimensions = productCompositionDimensions(session.productComposition, session.width, session.height);
  const preview = elements.productCompositionPreview;
  preview.width = dimensions.width;
  preview.height = dimensions.height;
  const context = preview.getContext("2d");
  if (!context) throw new Error("当前浏览器无法显示商品交付预览");
  const sourceBounds = alphaBoundsFromRgba({
    pixels: foregroundPixels,
    width: session.width,
    height: session.height,
  });
  if (!sourceBounds) {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    syncProductCompositionControls();
    return;
  }
  drawProductComposition({
    context,
    foreground: pixelsCanvas(foregroundPixels, session.width, session.height),
    width: dimensions.width,
    height: dimensions.height,
    sourceWidth: session.width,
    sourceHeight: session.height,
    settings: session.productComposition,
    sourceBounds,
  });
  renderProductOutputSet(foregroundPixels);
  syncProductCompositionControls();
}

function syncPortraitCompositionControls() {
  const portrait = selectedTask?.id === "UT-PORTRAIT";
  elements.portraitComposition.hidden = !portrait;
  elements.portraitOutputSet.hidden = !portrait;
  if (!portrait || !maskCorrectionSession?.portraitComposition) return;
  const composition = maskCorrectionSession.portraitComposition;
  const scale = Math.round(composition.scale * 100);
  const positionY = Math.round(composition.positionY * 100);
  elements.portraitOutputPreset.value = composition.presetId;
  elements.portraitScale.value = String(scale);
  elements.portraitScaleOutput.value = `${scale}%`;
  elements.portraitScaleOutput.textContent = `${scale}%`;
  elements.portraitPositionY.value = String(positionY);
  elements.portraitPositionYOutput.value = productPositionLabel(positionY, "偏上", "偏下");
  elements.portraitPositionYOutput.textContent = elements.portraitPositionYOutput.value;
  const backgroundSpec = resolveMaskBackground({
    background: maskCorrectionSession.background,
    customColor: maskCorrectionSession.customBackground,
  });
  const backgroundHex = backgroundSpec.hex ?? rgbHex(backgroundSpec.rgb);
  const background = PORTRAIT_BACKGROUND_PRESETS.find((item) => item.hex === backgroundHex);
  const selectedId = background ? `${composition.presetId}-${background.id}` : null;
  elements.portraitOutputCards.forEach((card) => {
    card.dataset.selected = String(card.dataset.portraitOutputCard === selectedId);
  });
}

function renderPortraitOutputSet(foregroundPixels) {
  const session = maskCorrectionSession;
  if (selectedTask?.id !== "UT-PORTRAIT" || !session?.portraitComposition || !currentResult) return;
  const sourceBounds = alphaBoundsFromRgba({ pixels: foregroundPixels, width: session.width, height: session.height });
  if (!sourceBounds) return;
  const foreground = pixelsCanvas(foregroundPixels, session.width, session.height);
  for (const entry of portraitOutputSetEntries(session.portraitComposition)) {
    const card = elements.portraitOutputCards.find((item) => item.dataset.portraitOutputCard === entry.id);
    const canvas = card?.querySelector(`[data-portrait-output-preview="${entry.id}"]`);
    const detail = card?.querySelector("[data-portrait-output-detail]");
    if (!card || !canvas || !detail) continue;
    canvas.width = entry.width;
    canvas.height = entry.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法显示报名照套装预览");
    drawPortraitComposition({
      context,
      foreground,
      sourceWidth: session.width,
      sourceHeight: session.height,
      sourceBounds,
      settings: entry.settings,
      backgroundRgb: entry.background.rgb,
    });
    detail.textContent = entry.detail;
  }
}

function renderPortraitCompositionPreview(foregroundPixels) {
  const session = maskCorrectionSession;
  if (selectedTask?.id !== "UT-PORTRAIT" || !session?.portraitComposition) return;
  const dimensions = portraitCompositionDimensions(session.portraitComposition, session.width, session.height);
  const preview = elements.portraitCompositionPreview;
  preview.width = dimensions.width;
  preview.height = dimensions.height;
  const context = preview.getContext("2d");
  if (!context) throw new Error("当前浏览器无法显示报名照交付预览");
  const sourceBounds = alphaBoundsFromRgba({ pixels: foregroundPixels, width: session.width, height: session.height });
  if (!sourceBounds) {
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    syncPortraitCompositionControls();
    return;
  }
  const backgroundSpec = resolveMaskBackground({
    background: session.background,
    customColor: session.customBackground,
  });
  drawPortraitComposition({
    context,
    foreground: pixelsCanvas(foregroundPixels, session.width, session.height),
    sourceWidth: session.width,
    sourceHeight: session.height,
    sourceBounds,
    settings: session.portraitComposition,
    backgroundRgb: backgroundSpec.rgb,
  });
  renderPortraitOutputSet(foregroundPixels);
  syncPortraitCompositionControls();
}

function alphaPlane(rgba) {
  const alpha = new Uint8ClampedArray(rgba.length / 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = rgba[pixel * 4 + 3];
  return alpha;
}

function rgbHex(rgb) {
  if (!rgb) return null;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
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
  renderProductCompositionPreview(output);
  renderPortraitCompositionPreview(output);
  const summary = summarizeCorrectionMask(session.mask);
  const modified = session.history.index > 0;
  const resultInteractive = !viewAutomatic && selectedComparisonLayer === "result";
  const backgroundSpec = resolveMaskBackground({
    background: session.background,
    customColor: session.customBackground,
  });
  const portraitDimensions = selectedTask?.id === "UT-PORTRAIT" && session.portraitComposition
    ? portraitCompositionDimensions(session.portraitComposition, currentResult.width, currentResult.height)
    : { width: currentResult.width, height: currentResult.height };
  const productDimensions = selectedTask?.id === "UT-PRODUCT" && session.productComposition
    ? productCompositionDimensions(session.productComposition, currentResult.width, currentResult.height)
    : portraitDimensions;
  const outputPresentation = maskOutputPresentation({
    background: session.background,
    customColor: session.customBackground,
    correctionCount: session.history.index,
    height: productDimensions.height,
    view: session.view,
    width: productDimensions.width,
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
  elements.maskCustomBackgroundControl.classList.toggle("is-selected", session.background === "custom");
  elements.maskCorrectionCanvas.classList.toggle("is-mask-readonly", !resultInteractive);
  elements.maskCorrectionCanvas.tabIndex = resultInteractive ? 0 : -1;
  elements.maskCorrectionCanvas.setAttribute("aria-label", resultInteractive
    ? "透明抠图蒙版修正画布"
    : viewAutomatic ? "自动抠图结果，只读对比" : "处理结果，并排只读对比");
  if (!resultInteractive) elements.maskBrushCursor.hidden = true;
  elements.maskZooms.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.maskZoom) === session.zoom)));
  elements.download.textContent = outputPresentation.downloadLabel;
  elements.maskOutputSummary.hidden = false;
  elements.maskOutputVersion.textContent = outputPresentation.version;
  elements.maskOutputBackground.textContent = outputPresentation.background;
  elements.maskOutputFile.textContent = outputPresentation.file;
  elements.maskOutputNote.textContent = outputPresentation.note;
  if (selectedTask?.id === "UT-PRODUCT" && session.productComposition) {
    const scale = Math.round(session.productComposition.scale * 100);
    elements.maskOutputNote.textContent = `最终白底图为 ${productDimensions.width} × ${productDimensions.height} px，使用 ${scale}% 商品大小${session.productComposition.shadow === "soft" ? "和柔和阴影" : "、无阴影"}；模板不代表平台规格。`;
    if (selectedComparisonLayer === "result") elements.resultSize.textContent = `商品结果 ${productDimensions.width} × ${productDimensions.height}`;
  }
  if (selectedTask?.id === "UT-PORTRAIT" && session.portraitComposition) {
    const scale = Math.round(session.portraitComposition.scale * 100);
    elements.maskOutputNote.textContent = `最终报名照为 ${portraitDimensions.width} × ${portraitDimensions.height} px，人物大小 ${scale}%；模板不代表官方证件规格。`;
    if (selectedComparisonLayer === "result") elements.resultSize.textContent = `报名照结果 ${portraitDimensions.width} × ${portraitDimensions.height}`;
  }
  elements.maskCorrectionStatus.textContent = viewAutomatic
    ? `正在查看未修正的自动结果；已保留 ${session.history.index} 笔修正，下载仍使用修正后版本。`
    : session.draft
    ? `${session.tool === "erase" ? "正在擦除背景残留" : "正在补回主体"}…`
    : modified
      ? `已记录 ${session.history.index} 笔修正 · 透明 ${summary.transparent.toLocaleString()} 像素 · 下载时按原尺寸重新生成${session.background === "checker" ? "透明 PNG" : `${backgroundSpec.shortLabel}底 JPEG`}`
      : `当前仍是自动蒙版；${session.background === "checker" ? "下载将保留透明背景" : `下载将写入${backgroundSpec.shortLabel}背景`}。`;
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
  if (!["checker", "white", "black", "coral", "custom"].includes(background)) return;
  if (selectedTask?.id === "UT-PRODUCT") background = "white";
  if (selectedTask?.id === "UT-PORTRAIT" && background === "checker") background = "white";
  const customColor = maskCorrectionSession?.customBackground ?? elements.maskCustomBackground.value;
  const backgroundSpec = resolveMaskBackground({ background, customColor });
  if (maskCorrectionSession) maskCorrectionSession.background = background;
  if (background === "checker") elements.resultStage.removeAttribute("data-preview-background");
  else {
    elements.resultStage.dataset.previewBackground = background;
    if (background === "custom") elements.resultStage.style.setProperty("--mask-custom-background", backgroundSpec.hex);
  }
  elements.maskBackgrounds.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.maskBackground === background));
  });
  renderMaskCorrection();
}

function updateProductComposition(patch) {
  if (selectedTask?.id !== "UT-PRODUCT" || !maskCorrectionSession?.productComposition) return;
  maskCorrectionSession.productComposition = normalizeProductCompositionSettings({
    ...maskCorrectionSession.productComposition,
    ...patch,
  });
  renderMaskCorrection();
}

function productCompositionDefaultsForResult(result = currentResult) {
  return normalizeProductCompositionSettings({
    ...PRODUCT_COMPOSITION_DEFAULTS,
    presetId: result?.portraitRatio === "portrait" ? "portrait-1200x1500" : "square-1200",
  });
}

function updatePortraitComposition(patch) {
  if (selectedTask?.id !== "UT-PORTRAIT" || !maskCorrectionSession?.portraitComposition) return;
  maskCorrectionSession.portraitComposition = normalizePortraitCompositionSettings({
    ...maskCorrectionSession.portraitComposition,
    ...patch,
  });
  renderMaskCorrection();
}

function portraitCompositionDefaultsForResult(result = currentResult) {
  return normalizePortraitCompositionSettings({
    ...PORTRAIT_COMPOSITION_DEFAULTS,
    presetId: result?.portraitRatio === "portrait" ? "portrait-480x600" : "square-600",
  });
}

function setMaskCustomBackground(value) {
  if (!maskCorrectionSession) return;
  const backgroundSpec = resolveMaskBackground({ background: "custom", customColor: value });
  maskCorrectionSession.customBackground = backgroundSpec.hex;
  elements.maskCustomBackground.value = backgroundSpec.hex.toLowerCase();
  setMaskBackground("custom");
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
  if (!session || session.view !== "corrected" || selectedComparisonLayer !== "result") return;
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
  if (!isBackgroundRemovalTask() || !currentResult || !sourceUrl) return;
  const token = ++maskCorrectionInitToken;
  elements.maskCorrectionWorkspace.hidden = false;
  elements.maskOutputSummary.hidden = true;
  elements.maskCorrectionStatus.textContent = "正在准备修正画布…";
  elements.maskCorrectionCanvas.hidden = true;
  elements.resultOutputImage.hidden = false;
  try {
    const [sourceImage, resultImage] = await Promise.all([
      decodeImage(currentResult.correctionSourceUrl ?? sourceUrl),
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
      background: currentResult.defaultBackground ?? "checker",
      customBackground: "#EE6F57",
      zoom: 1,
      view: "corrected",
      keyboardCursor: { x: 0.5, y: 0.5 },
      draft: null,
      pointerId: null,
      productComposition: selectedTask?.id === "UT-PRODUCT" ? productCompositionDefaultsForResult(currentResult) : null,
      portraitComposition: selectedTask?.id === "UT-PORTRAIT" ? portraitCompositionDefaultsForResult(currentResult) : null,
    };
    elements.resultOutputImage.hidden = true;
    elements.maskCorrectionCanvas.hidden = false;
    setMaskBackground(maskCorrectionSession.background);
    syncProductCompositionControls();
    syncPortraitCompositionControls();
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

async function composeSocialOverlayResult(processed, settings) {
  const overlay = normalizeSocialOverlaySettings(settings);
  if (!overlay.text) return processed;
  let composedUrl = null;
  try {
    const image = await decodeImage(processed.url);
    const canvas = document.createElement("canvas");
    canvas.width = processed.width;
    canvas.height = processed.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("当前浏览器无法生成社交标题图片");
    context.clearRect(0, 0, processed.width, processed.height);
    context.drawImage(image, 0, 0, processed.width, processed.height);
    const layout = drawSocialOverlay({
      context,
      width: processed.width,
      height: processed.height,
      settings: overlay,
    });
    const expectedPixels = context.getImageData(0, 0, processed.width, processed.height).data;
    const blob = await canvasEncodedBlob(canvas, processed.mime, processed.mime === "image/jpeg" ? 0.92 : undefined);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    inspectOutputMetadata(bytes, processed.mime);
    const reopenedUrl = URL.createObjectURL(blob);
    try {
      const reopened = await decodeImage(reopenedUrl);
      const actualPixels = canvasPixels(reopened, processed.width, processed.height);
      verifyPixelRoundTrip({
        expected: expectedPixels,
        actual: actualPixels,
        width: processed.width,
        height: processed.height,
        mime: processed.mime,
      });
    } finally {
      URL.revokeObjectURL(reopenedUrl);
    }
    composedUrl = URL.createObjectURL(blob);
    return Object.freeze({
      ...processed,
      blob,
      url: composedUrl,
      byteLength: bytes.length,
      outputHash: await sha256Bytes(bytes),
      processor: `${processed.processor}+social-card-overlay-v1`,
      socialOverlay: Object.freeze({ ...overlay, lines: layout.lines.length }),
      validationSummary: `${processed.validationSummary}；标题已按通用安全区写入并完成像素重开检查`,
    });
  } catch (error) {
    if (composedUrl) URL.revokeObjectURL(composedUrl);
    throw error;
  } finally {
    revokeIfBlob(processed.url);
  }
}

async function composeCanvasFitResult(processed, settings) {
  const normalized = normalizeCanvasFitSettings(settings);
  let outputUrl = null;
  try {
    const image = await decodeImage(processed.url);
    const dimensions = canvasFitDimensions(normalized);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: normalized.format === "png", willReadFrequently: true });
    if (!context) throw new Error("当前浏览器无法生成完整适配画布");
    const layout = drawCanvasFit({ context, image, sourceWidth: processed.width, sourceHeight: processed.height, settings: normalized });
    const expectedPixels = context.getImageData(0, 0, dimensions.width, dimensions.height).data;
    const mime = normalized.format === "png" ? "image/png" : "image/jpeg";
    const blob = await canvasEncodedBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    inspectOutputMetadata(bytes, mime);
    const reopenedUrl = URL.createObjectURL(blob);
    let pixelValidation;
    try {
      const reopened = await decodeImage(reopenedUrl);
      const actualPixels = canvasPixels(reopened, dimensions.width, dimensions.height);
      pixelValidation = verifyPixelRoundTrip({ expected: expectedPixels, actual: actualPixels, width: dimensions.width, height: dimensions.height, mime });
    } finally {
      URL.revokeObjectURL(reopenedUrl);
    }
    outputUrl = URL.createObjectURL(blob);
    return Object.freeze({
      ...processed,
      blob,
      url: outputUrl,
      mime,
      extension: mime === "image/jpeg" ? "jpg" : "png",
      width: dimensions.width,
      height: dimensions.height,
      byteLength: bytes.length,
      outputHash: await sha256Bytes(bytes),
      hasAlpha: mime === "image/png" && (pixelValidation.transparentPixels > 0 || pixelValidation.partialAlphaPixels > 0),
      processor: `${processed.processor}+canvas-fit-v1`,
      canvasFit: Object.freeze({ ...layout }),
    });
  } catch (error) {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    throw error;
  } finally {
    revokeIfBlob(processed.url);
  }
}

async function runUploadSpecification({ file, settings, signal, onAttempt }) {
  const specification = normalizeUploadSpecification(settings);
  let compressionFile = file;
  let fitLayout = null;
  if (specification.contentMode === "whole") {
    const prepared = await runLocalEditor({
      file,
      settings: { ...settings, ratio: "original", sizeMode: "custom", outputLongEdge: specification.outputLongEdge, format: "png" },
    });
    const fitted = await composeCanvasFitResult(prepared, settings);
    fitLayout = fitted.canvasFit;
    const targetBytes = compressionTargetBytes(specification.targetKilobytes);
    if (fitted.byteLength <= targetBytes) {
      return Object.freeze({
        ...fitted,
        uploadSpecification: specification,
        compressionDecision: Object.freeze({
          targetBytes,
          targetMet: true,
          attemptCount: 1,
          selectedLongEdge: Math.max(fitted.width, fitted.height),
          selectedQuality: 0.92,
          attempts: Object.freeze([Object.freeze({ outputLongEdge: Math.max(fitted.width, fitted.height), jpegQuality: 0.92, resultBytes: fitted.byteLength })]),
        }),
      });
    }
    compressionFile = new File([fitted.blob], "upload-layout.jpg", { type: "image/jpeg", lastModified: 0 });
    revokeIfBlob(fitted.url);
  }
  const processed = await compressImageToTarget({
    targetKilobytes: specification.targetKilobytes,
    maxLongEdge: specification.outputLongEdge,
    signal,
    revokeObjectUrl: revokeIfBlob,
    onAttempt,
    renderAttempt: (step) => runLocalEditor({
      file: compressionFile,
      settings: {
        ...settings,
        ratio: specification.contentMode === "crop" ? specification.ratioId : "original",
        sizeMode: "custom",
        format: "jpeg",
        jpegBackground: specification.backgroundColor,
        ...step,
      },
    }),
  });
  return Object.freeze({ ...processed, canvasFit: fitLayout, uploadSpecification: specification });
}

async function runDocumentArchive({ file, settings, signal, onAttempt }) {
  const prepared = await runLocalEditor({ file, settings: { ...settings, format: "jpeg", jpegQuality: 0.9, jpegBackground: "#ffffff" } });
  const targetBytes = compressionTargetBytes(settings.compressionTargetKilobytes);
  if (prepared.byteLength <= targetBytes) {
    return Object.freeze({
      ...prepared,
      compressionDecision: Object.freeze({
        targetBytes,
        targetMet: true,
        attemptCount: 1,
        selectedLongEdge: Math.max(prepared.width, prepared.height),
        selectedQuality: 0.9,
        attempts: Object.freeze([Object.freeze({ outputLongEdge: Math.max(prepared.width, prepared.height), jpegQuality: 0.9, resultBytes: prepared.byteLength })]),
      }),
    });
  }
  const preparedFile = new File([prepared.blob], "rectified-document.jpg", { type: "image/jpeg", lastModified: 0 });
  revokeIfBlob(prepared.url);
  return compressImageToTarget({
    targetKilobytes: settings.compressionTargetKilobytes,
    maxLongEdge: settings.outputLongEdge,
    signal,
    revokeObjectUrl: revokeIfBlob,
    onAttempt,
    renderAttempt: (step) => runLocalEditor({
      file: preparedFile,
      settings: { ratio: "original", rectificationEnabled: false, documentScanMode: "original", sizeMode: "custom", format: "jpeg", jpegBackground: "#ffffff", ...step },
    }),
  });
}

async function runPrivacyShare({ file, settings, signal, onAttempt }) {
  const normalized = normalizePrivacyShareSettings(settings);
  const editorSettings = privacyShareEditorSettings(settings);
  return compressImageToTarget({
    targetKilobytes: normalized.targetKilobytes,
    maxLongEdge: normalized.outputLongEdge,
    signal,
    revokeObjectUrl: revokeIfBlob,
    onAttempt,
    renderAttempt: (step) => runLocalEditor({ file, settings: { ...editorSettings, ...step } }),
  });
}

async function exportMaskCorrection({ productPresetId = null, portraitPresetId = null, portraitBackgroundId = null } = {}) {
  const session = maskCorrectionSession;
  if (!session || (session.history.index === 0 && session.background === "checker" && !isComposedBackgroundTask())) return null;
  const sourceWidth = currentResult.width;
  const sourceHeight = currentResult.height;
  validateCorrectionExportDimensions(sourceWidth, sourceHeight);
  const sourcePixels = canvasPixels(session.sourceImage, sourceWidth, sourceHeight);
  const resultPixels = canvasPixels(session.resultImage, sourceWidth, sourceHeight);
  const fullHistory = createMaskCorrectionHistory({ width: sourceWidth, height: sourceHeight, initialAlpha: alphaPlane(resultPixels) });
  let mask = new Uint8ClampedArray(fullHistory.initialAlpha);
  for (const stroke of session.history.strokes.slice(0, session.history.index)) {
    applyMaskStroke(mask, sourceWidth, sourceHeight, stroke);
  }
  const maskSummary = summarizeCorrectionMask(mask);
  if (maskSummary.transparent + maskSummary.partial === 0) throw new Error("当前修正已没有透明背景，请先擦除背景再下载");
  if (maskSummary.opaque + maskSummary.partial === 0) throw new Error("当前修正已把主体全部擦除，请撤销后再下载");
  const correctedPixels = composeCorrectedPixels({ sourcePixels, resultPixels, mask, width: sourceWidth, height: sourceHeight });
  const product = selectedTask?.id === "UT-PRODUCT";
  const portrait = selectedTask?.id === "UT-PORTRAIT";
  const productSettings = product
    ? normalizeProductCompositionSettings({
      ...session.productComposition,
      ...(productPresetId ? { presetId: productPresetId } : {}),
    })
    : null;
  const portraitSettings = portrait
    ? normalizePortraitCompositionSettings({
      ...session.portraitComposition,
      ...(portraitPresetId ? { presetId: portraitPresetId } : {}),
    })
    : null;
  const portraitBackground = portraitBackgroundId
    ? PORTRAIT_BACKGROUND_PRESETS.find((entry) => entry.id === portraitBackgroundId)
    : null;
  if (portraitBackgroundId && !portraitBackground) throw new Error("未知的报名照背景版本");
  const backgroundSpec = portraitBackground ?? resolveMaskBackground({
    background: product ? "white" : session.background,
    customColor: session.customBackground,
  });
  const mime = product || session.background !== "checker" ? "image/jpeg" : "image/png";
  const outputDimensions = product
    ? productCompositionDimensions(productSettings, sourceWidth, sourceHeight)
    : portrait
      ? portraitCompositionDimensions(portraitSettings, sourceWidth, sourceHeight)
      : { width: sourceWidth, height: sourceHeight };
  const width = outputDimensions.width;
  const height = outputDimensions.height;
  validateCorrectionExportDimensions(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法生成修正 PNG");
  let expectedPixels;
  if (product) {
    const sourceBounds = alphaBoundsFromRgba({ pixels: correctedPixels, width: sourceWidth, height: sourceHeight });
    if (!sourceBounds) throw new Error("当前修正已把商品主体全部擦除，请撤销后再下载");
    drawProductComposition({
      context,
      foreground: pixelsCanvas(correctedPixels, sourceWidth, sourceHeight),
      width,
      height,
      sourceWidth,
      sourceHeight,
      settings: productSettings,
      sourceBounds,
    });
    expectedPixels = context.getImageData(0, 0, width, height).data;
  } else if (portrait) {
    const sourceBounds = alphaBoundsFromRgba({ pixels: correctedPixels, width: sourceWidth, height: sourceHeight });
    if (!sourceBounds) throw new Error("当前修正已把人物主体全部擦除，请撤销后再下载");
    drawPortraitComposition({
      context,
      foreground: pixelsCanvas(correctedPixels, sourceWidth, sourceHeight),
      sourceWidth,
      sourceHeight,
      sourceBounds,
      settings: portraitSettings,
      backgroundRgb: backgroundSpec.rgb,
    });
    expectedPixels = context.getImageData(0, 0, width, height).data;
  } else {
    expectedPixels = mime === "image/png"
      ? correctedPixels
      : composeSolidBackgroundPixels({ foregroundPixels: correctedPixels, background: backgroundSpec.rgb, width, height });
    const imageData = context.createImageData(width, height);
    imageData.data.set(expectedPixels);
    context.putImageData(imageData, 0, 0);
  }
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
  return {
    blob,
    mime,
    background: product ? "white" : portraitBackground?.id ?? session.background,
    backgroundColor: backgroundSpec.hex ?? rgbHex(backgroundSpec.rgb),
    outputHash: await sha256Bytes(bytes),
    byteLength: bytes.length,
    maskSummary,
    productPresetId: productSettings?.presetId ?? null,
    portraitPresetId: portraitSettings?.presetId ?? null,
    portraitBackgroundId: portraitBackground?.id ?? null,
    width,
    height,
  };
}

function composedResultDownloadContract(corrected, taskId = selectedTask?.id) {
  return buildResultDownloadContract({
    taskId,
    currentRunId: machine.activeRunId,
    result: {
      ...machine.result,
      mimeType: corrected.mime,
      hasAlpha: corrected.mime === "image/png",
      outputHash: corrected.outputHash,
      byteLength: corrected.byteLength,
      backgroundColor: corrected.backgroundColor,
    },
  });
}

function filenameWithSuffix(filename, suffix) {
  return filename.replace(/(\.[a-z0-9]+)$/iu, `-${suffix}$1`);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function generateProductOutput(presetId) {
  if (selectedTask?.id !== "UT-PRODUCT" || !PRODUCT_OUTPUT_PRESETS.some((preset) => preset.id === presetId)) {
    throw new Error("未知的商品图交付版本");
  }
  const expectedRunId = machine.activeRunId;
  const expectedResult = currentResult;
  const corrected = await exportMaskCorrection({ productPresetId: presetId });
  if (selectedTask?.id !== "UT-PRODUCT" || machine.activeRunId !== expectedRunId || currentResult !== expectedResult) {
    throw new Error("商品结果已经变化，已停止旧套装下载");
  }
  if (!corrected || corrected.mime !== "image/jpeg") throw new Error("商品图没有生成不透明 JPEG");
  const contract = composedResultDownloadContract(corrected, "UT-PRODUCT");
  if (!contract.allowed) throw new Error(contract.message || "商品图下载契约未通过");
  return Object.freeze({
    ...corrected,
    filename: filenameWithSuffix(contract.download.filename, presetId),
  });
}

async function downloadProductOutput(presetId) {
  const output = await generateProductOutput(presetId);
  triggerBlobDownload(output.blob, output.filename);
  elements.productOutputSetStatus.textContent = `${output.width} × ${output.height} JPEG 已检查并开始下载。`;
  return output;
}

async function downloadProductOutputSet() {
  const outputs = [];
  for (let index = 0; index < PRODUCT_OUTPUT_PRESETS.length; index += 1) {
    const preset = PRODUCT_OUTPUT_PRESETS[index];
    elements.productOutputSetStatus.textContent = `正在生成第 ${index + 1} / ${PRODUCT_OUTPUT_PRESETS.length} 个版本：${preset.label}…`;
    outputs.push(await generateProductOutput(preset.id));
  }
  const archive = await createStoredZip(outputs.map((output) => ({ name: output.filename, data: output.blob })));
  const token = new Date().toISOString().replace(/[:.]/gu, "-");
  triggerBlobDownload(archive.blob, `product-white-background-set-${token}.zip`);
  elements.productOutputSetStatus.textContent = `整组 ZIP 已检查并开始下载 · ${archive.entries} 个 JPEG · ${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB`;
  return archive;
}

function portraitOutputEntry(outputId) {
  if (!maskCorrectionSession?.portraitComposition) return null;
  return portraitOutputSetEntries(maskCorrectionSession?.portraitComposition).find((entry) => entry.id === outputId) ?? null;
}

function selectPortraitOutput(outputId) {
  if (selectedTask?.id !== "UT-PORTRAIT" || !maskCorrectionSession?.portraitComposition) {
    throw new Error("当前没有可切换的报名照结果");
  }
  const entry = portraitOutputEntry(outputId);
  if (!entry) throw new Error("未知的报名照交付版本");
  maskCorrectionSession.portraitComposition = entry.settings;
  if (entry.background.id === "white") {
    setMaskBackground("white");
  } else {
    maskCorrectionSession.customBackground = entry.background.hex;
    elements.maskCustomBackground.value = entry.background.hex.toLowerCase();
    setMaskBackground("custom");
  }
  elements.portraitOutputSetStatus.textContent = `已切换主预览：${entry.label}；六个版本仍共用同一份抠图与人物构图。`;
  return entry;
}

async function generatePortraitOutput(outputId) {
  if (selectedTask?.id !== "UT-PORTRAIT") throw new Error("当前不是报名照任务");
  const entry = portraitOutputEntry(outputId);
  if (!entry) throw new Error("未知的报名照交付版本");
  const expectedRunId = machine.activeRunId;
  const expectedResult = currentResult;
  const corrected = await exportMaskCorrection({
    portraitPresetId: entry.settings.presetId,
    portraitBackgroundId: entry.background.id,
  });
  if (selectedTask?.id !== "UT-PORTRAIT" || machine.activeRunId !== expectedRunId || currentResult !== expectedResult) {
    throw new Error("报名照结果已经变化，已停止旧套装下载");
  }
  if (!corrected || corrected.mime !== "image/jpeg") throw new Error("报名照没有生成不透明 JPEG");
  const contract = composedResultDownloadContract(corrected, "UT-PORTRAIT");
  if (!contract.allowed) throw new Error(contract.message || "报名照下载契约未通过");
  return Object.freeze({
    ...corrected,
    id: entry.id,
    label: entry.label,
    filename: filenameWithSuffix(contract.download.filename, entry.filenameSuffix),
  });
}

async function downloadPortraitOutput(outputId) {
  const output = await generatePortraitOutput(outputId);
  triggerBlobDownload(output.blob, output.filename);
  elements.portraitOutputSetStatus.textContent = `${output.label} ${output.width} × ${output.height} JPEG 已检查并开始下载。`;
  return output;
}

async function downloadPortraitOutputSet() {
  const entries = portraitOutputSetEntries(maskCorrectionSession?.portraitComposition);
  const outputs = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    elements.portraitOutputSetStatus.textContent = `正在生成第 ${index + 1} / ${entries.length} 个版本：${entry.label}…`;
    outputs.push(await generatePortraitOutput(entry.id));
  }
  const archive = await createStoredZip(outputs.map((output) => ({ name: output.filename, data: output.blob })));
  const token = new Date().toISOString().replace(/[:.]/gu, "-");
  triggerBlobDownload(archive.blob, `portrait-general-set-${token}.zip`);
  elements.portraitOutputSetStatus.textContent = `整组 ZIP 已检查并开始下载 · ${archive.entries} 个 JPEG · ${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB`;
  return archive;
}

function setProductOutputBusy(busy) {
  productOutputBusy = Boolean(busy);
  elements.productOutputDownloads.forEach((button) => { button.disabled = productOutputBusy; });
  elements.productOutputSelects.forEach((button) => { button.disabled = productOutputBusy; });
  elements.productOutputDownloadAll.disabled = productOutputBusy;
  if (selectedTask?.id === "UT-PRODUCT") elements.download.disabled = productOutputBusy;
}

function setPortraitOutputBusy(busy) {
  portraitOutputBusy = Boolean(busy);
  elements.portraitOutputDownloads.forEach((button) => { button.disabled = portraitOutputBusy; });
  elements.portraitOutputSelects.forEach((button) => { button.disabled = portraitOutputBusy; });
  elements.portraitOutputDownloadAll.disabled = portraitOutputBusy;
  if (selectedTask?.id === "UT-PORTRAIT") elements.download.disabled = portraitOutputBusy;
}

function setSocialOutputBusy(busy) {
  socialOutputBusy = Boolean(busy);
  const ready = socialOutputSetSession?.status === "ready";
  elements.socialOutputDownloads.forEach((button) => { button.disabled = socialOutputBusy || !ready; });
  elements.socialOutputSelects.forEach((button) => { button.disabled = socialOutputBusy || !ready; });
  elements.socialOutputDownloadAll.disabled = socialOutputBusy || !ready;
}

function socialOutputById(presetId) {
  return socialOutputSetSession?.outputs?.get(presetId) ?? null;
}

function syncSocialOutputCards() {
  const ready = socialOutputSetSession?.status === "ready";
  elements.socialOutputCards.forEach((card) => {
    const presetId = card.dataset.socialOutputCard;
    const output = ready ? socialOutputById(presetId) : null;
    card.dataset.selected = String(ready && socialOutputSetSession.selectedId === presetId);
    const preview = card.querySelector("[data-social-output-preview]");
    const detail = card.querySelector("[data-social-output-detail]");
    if (output) {
      preview.src = output.url;
      detail.textContent = `${output.width} × ${output.height} px · ${output.extension.toUpperCase()}`;
    } else {
      preview.removeAttribute("src");
      detail.textContent = SOCIAL_OUTPUT_PRESETS.find((preset) => preset.id === presetId)?.description ?? "正在准备";
    }
  });
  setSocialOutputBusy(socialOutputBusy);
}

function selectSocialOutput(presetId) {
  const output = socialOutputById(presetId);
  if (!output || socialOutputSetSession?.status !== "ready") throw new Error("这个社交版本尚未准备好");
  socialOutputSetSession.selectedId = presetId;
  elements.resultOutputImage.src = output.url;
  elements.resultOutputImage.alt = `完整显示的${output.label}结果`;
  elements.resultSize.textContent = `${output.width} × ${output.height}`;
  elements.download.textContent = "下载当前预览";
  syncSocialOutputCards();
  selectComparisonLayer("result");
}

async function generateSocialOutput(entry, expected) {
  let processed = await runLocalEditor({ file: source.file, settings: entry.settings });
  processed = await composeSocialOverlayResult(processed, entry.settings);
  if (selectedTask?.id !== "UT-TEMPLATE"
    || machine.activeRunId !== expected.runId
    || currentResult !== expected.result
    || source?.hash !== expected.sourceHash
    || socialOutputSetToken !== expected.token) {
    revokeIfBlob(processed.url);
    throw new Error("当前图片或任务已经变化，已停止旧社交套装");
  }
  const contract = buildResultDownloadContract({
    taskId: "UT-TEMPLATE",
    currentRunId: machine.activeRunId,
    result: {
      ...machine.result,
      mimeType: processed.mime,
      hasAlpha: processed.hasAlpha,
      outputHash: processed.outputHash,
      byteLength: processed.byteLength,
    },
  });
  if (!contract.allowed) {
    revokeIfBlob(processed.url);
    throw new Error(contract.message || "社交图片下载契约未通过");
  }
  return Object.freeze({
    ...processed,
    id: entry.id,
    label: entry.label,
    filename: filenameWithSuffix(contract.download.filename, entry.filenameSuffix),
  });
}

async function prepareSocialOutputSet() {
  if (selectedTask?.id !== "UT-TEMPLATE" || !currentResult?.sourceSettings || !source?.file) {
    elements.socialOutputSet.hidden = true;
    return;
  }
  const token = ++socialOutputSetToken;
  const restoreDownloadFocus = document.activeElement === elements.download;
  const expected = Object.freeze({ runId: machine.activeRunId, result: currentResult, sourceHash: source.hash, token });
  const preferredId = matchSceneTemplate(currentResult.sourceSettings);
  const entries = socialOutputSetEntries(currentResult.sourceSettings);
  const outputs = new Map();
  socialOutputSetSession = { status: "loading", selectedId: preferredId, outputs };
  elements.socialOutputSet.hidden = false;
  elements.socialOutputSetStatus.textContent = "正在本机生成 4 个社交尺寸，不会上传图片…";
  syncSocialOutputCards();
  setSocialOutputBusy(true);
  try {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      elements.socialOutputSetStatus.textContent = `正在生成第 ${index + 1} / ${entries.length} 个版本：${entry.label}…`;
      outputs.set(entry.id, await generateSocialOutput(entry, expected));
    }
    if (currentResult !== expected.result || machine.activeRunId !== expected.runId || socialOutputSetToken !== token) throw new Error("结果已经变化，已停止旧社交套装");
    socialOutputSetSession.status = "ready";
    socialOutputSetSession.selectedId = outputs.has(preferredId) ? preferredId : entries[0].id;
    syncSocialOutputCards();
    selectSocialOutput(socialOutputSetSession.selectedId);
    elements.socialOutputSetStatus.textContent = "4 个版本已在本机绘制并完成格式、尺寸与像素重开检查。";
  } catch (error) {
    for (const output of outputs.values()) revokeIfBlob(output.url);
    if (socialOutputSetToken !== token) return;
    socialOutputSetSession = { status: "error", selectedId: null, outputs: new Map() };
    syncSocialOutputCards();
    elements.socialOutputSetStatus.textContent = `整组预览没有完成：${error.message}`;
  } finally {
    if (socialOutputSetToken === token) {
      setSocialOutputBusy(false);
      if (restoreDownloadFocus && selectedTask?.id === "UT-TEMPLATE" && !elements.resultSection.hidden) elements.download.focus();
    }
  }
}

async function validatedSocialOutput(presetId) {
  const output = socialOutputById(presetId);
  if (!output || socialOutputSetSession?.status !== "ready") throw new Error("这个社交版本尚未准备好");
  const actualHash = await sha256Bytes(new Uint8Array(await output.blob.arrayBuffer()));
  if (actualHash !== output.outputHash || output.blob.size !== output.byteLength) throw new Error("社交图片下载前校验未通过");
  return output;
}

async function downloadSocialOutput(presetId) {
  const output = await validatedSocialOutput(presetId);
  triggerBlobDownload(output.blob, output.filename);
  elements.socialOutputSetStatus.textContent = `${output.label} ${output.width} × ${output.height} 已检查并开始下载。`;
  return output;
}

async function downloadSocialOutputSet() {
  if (socialOutputSetSession?.status !== "ready" || socialOutputSetSession.outputs.size !== SOCIAL_OUTPUT_PRESETS.length) {
    throw new Error("四个社交版本尚未全部准备好");
  }
  const outputs = [];
  for (const preset of SOCIAL_OUTPUT_PRESETS) outputs.push(await validatedSocialOutput(preset.id));
  const archive = await createStoredZip(outputs.map((output) => ({ name: output.filename, data: output.blob })));
  const token = new Date().toISOString().replace(/[:.]/gu, "-");
  triggerBlobDownload(archive.blob, `social-image-set-${token}.zip`);
  elements.socialOutputSetStatus.textContent = `整组 ZIP 已检查并开始下载 · ${archive.entries} 张图片 · ${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB`;
  return archive;
}

function setOldPhotoOutputBusy(busy) {
  oldPhotoOutputBusy = Boolean(busy);
  const ready = oldPhotoOutputSetSession?.status === "ready";
  elements.oldPhotoOutputDownloads.forEach((button) => { button.disabled = oldPhotoOutputBusy || !ready; });
  elements.oldPhotoOutputSelects.forEach((button) => { button.disabled = oldPhotoOutputBusy || !ready; });
  elements.oldPhotoOutputDownloadAll.disabled = oldPhotoOutputBusy || !ready;
}

function oldPhotoOutputById(presetId) {
  return oldPhotoOutputSetSession?.outputs?.get(presetId) ?? null;
}

function syncOldPhotoOutputCards() {
  const ready = oldPhotoOutputSetSession?.status === "ready";
  elements.oldPhotoOutputCards.forEach((card) => {
    const presetId = card.dataset.oldPhotoOutputCard;
    const output = ready ? oldPhotoOutputById(presetId) : null;
    card.dataset.selected = String(ready && oldPhotoOutputSetSession.selectedId === presetId);
    const preview = card.querySelector("[data-old-photo-output-preview]");
    const detail = card.querySelector("[data-old-photo-output-detail]");
    if (output) {
      preview.src = output.url;
      detail.textContent = `${output.width} × ${output.height} px · ${output.extension.toUpperCase()}`;
    } else {
      preview.removeAttribute("src");
      detail.textContent = OLD_PHOTO_LOCAL_PRESETS.find((preset) => preset.id === presetId)?.description ?? "正在准备";
    }
  });
  setOldPhotoOutputBusy(oldPhotoOutputBusy);
}

function selectOldPhotoOutput(presetId) {
  const output = oldPhotoOutputById(presetId);
  if (!output || oldPhotoOutputSetSession?.status !== "ready") throw new Error("这个本地整理版本尚未准备好");
  oldPhotoOutputSetSession.selectedId = presetId;
  elements.resultOutputImage.src = output.url;
  elements.resultOutputImage.alt = `完整显示的${output.label}老照片本地整理结果`;
  elements.resultSize.textContent = `${output.width} × ${output.height}`;
  elements.download.textContent = "下载当前整理";
  syncOldPhotoOutputCards();
  selectComparisonLayer("result");
  return output;
}

async function generateOldPhotoOutput(entry, expected) {
  const processed = await runLocalEditor({ file: source.file, settings: entry.settings });
  if (selectedTask?.id !== "UT-OLD-PHOTO"
    || machine.activeRunId !== expected.runId
    || currentResult !== expected.result
    || source?.hash !== expected.sourceHash
    || oldPhotoOutputSetToken !== expected.token) {
    revokeIfBlob(processed.url);
    throw new Error("当前图片或任务已经变化，已停止旧的老照片套装");
  }
  const contract = buildResultDownloadContract({
    taskId: "UT-OLD-PHOTO",
    currentRunId: machine.activeRunId,
    result: {
      ...machine.result,
      mimeType: processed.mime,
      hasAlpha: processed.hasAlpha,
      outputHash: processed.outputHash,
      byteLength: processed.byteLength,
    },
  });
  if (!contract.allowed) {
    revokeIfBlob(processed.url);
    throw new Error(contract.message || "老照片本地整理下载契约未通过");
  }
  return Object.freeze({
    ...processed,
    id: entry.id,
    label: entry.label,
    description: entry.description,
    filename: filenameWithSuffix(contract.download.filename, entry.filenameSuffix),
  });
}

async function prepareOldPhotoOutputSet() {
  if (selectedTask?.id !== "UT-OLD-PHOTO" || !currentResult?.sourceSettings || !source?.file) {
    elements.oldPhotoOutputSet.hidden = true;
    return;
  }
  const token = ++oldPhotoOutputSetToken;
  const restoreDownloadFocus = document.activeElement === elements.download;
  const expected = Object.freeze({ runId: machine.activeRunId, result: currentResult, sourceHash: source.hash, token });
  const preferredId = matchOldPhotoLocalPreset(currentResult.sourceSettings);
  const entries = oldPhotoOutputSetEntries(currentResult.sourceSettings);
  const outputs = new Map();
  oldPhotoOutputSetSession = { status: "loading", selectedId: preferredId, outputs };
  elements.oldPhotoOutputSet.hidden = false;
  elements.oldPhotoOutputSetStatus.textContent = "正在本机生成 4 个光色整理版本，不会上传图片…";
  syncOldPhotoOutputCards();
  setOldPhotoOutputBusy(true);
  try {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      elements.oldPhotoOutputSetStatus.textContent = `正在生成第 ${index + 1} / ${entries.length} 个版本：${entry.label}…`;
      outputs.set(entry.id, await generateOldPhotoOutput(entry, expected));
    }
    if (currentResult !== expected.result || machine.activeRunId !== expected.runId || oldPhotoOutputSetToken !== token) {
      throw new Error("结果已经变化，已停止旧的老照片套装");
    }
    oldPhotoOutputSetSession.status = "ready";
    oldPhotoOutputSetSession.selectedId = preferredId && outputs.has(preferredId) ? preferredId : null;
    syncOldPhotoOutputCards();
    if (oldPhotoOutputSetSession.selectedId) {
      selectOldPhotoOutput(oldPhotoOutputSetSession.selectedId);
      elements.oldPhotoOutputSetStatus.textContent = "4 个本地整理版本已完成格式、尺寸与像素重开检查；当前预设已同步到主预览。";
    } else {
      elements.download.textContent = "下载当前手动整理";
      elements.oldPhotoOutputSetStatus.textContent = "4 个预设版本已准备好；主预览保留你的手动调整，点“查看大图”才会切换。";
    }
  } catch (error) {
    for (const output of outputs.values()) revokeIfBlob(output.url);
    if (oldPhotoOutputSetToken !== token) return;
    oldPhotoOutputSetSession = { status: "error", selectedId: null, outputs: new Map() };
    syncOldPhotoOutputCards();
    elements.oldPhotoOutputSetStatus.textContent = `整组预览没有完成：${error.message}`;
  } finally {
    if (oldPhotoOutputSetToken === token) {
      setOldPhotoOutputBusy(false);
      if (restoreDownloadFocus && selectedTask?.id === "UT-OLD-PHOTO" && !elements.resultSection.hidden) elements.download.focus();
    }
  }
}

async function validatedOldPhotoOutput(presetId) {
  const output = oldPhotoOutputById(presetId);
  if (!output || oldPhotoOutputSetSession?.status !== "ready") throw new Error("这个本地整理版本尚未准备好");
  const actualHash = await sha256Bytes(new Uint8Array(await output.blob.arrayBuffer()));
  if (actualHash !== output.outputHash || output.blob.size !== output.byteLength) throw new Error("老照片本地整理下载前校验未通过");
  return output;
}

async function downloadOldPhotoOutput(presetId) {
  const output = await validatedOldPhotoOutput(presetId);
  triggerBlobDownload(output.blob, output.filename);
  elements.oldPhotoOutputSetStatus.textContent = `${output.label} ${output.width} × ${output.height} 已检查并开始下载。`;
  return output;
}

async function downloadOldPhotoOutputSet() {
  if (oldPhotoOutputSetSession?.status !== "ready" || oldPhotoOutputSetSession.outputs.size !== OLD_PHOTO_LOCAL_PRESETS.length) {
    throw new Error("四个老照片本地整理版本尚未全部准备好");
  }
  const outputs = [];
  for (const preset of OLD_PHOTO_LOCAL_PRESETS) outputs.push(await validatedOldPhotoOutput(preset.id));
  const archive = await createStoredZip(outputs.map((output) => ({ name: output.filename, data: output.blob })));
  const token = new Date().toISOString().replace(/[:.]/gu, "-");
  triggerBlobDownload(archive.blob, `old-photo-local-set-${token}.zip`);
  elements.oldPhotoOutputSetStatus.textContent = `整组 ZIP 已检查并开始下载 · ${archive.entries} 张图片 · ${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB`;
  return archive;
}

function setSocialGridOutputBusy(busy) {
  socialGridOutputBusy = Boolean(busy);
  const ready = socialGridOutputSetSession?.status === "ready";
  elements.socialGridTiles.forEach((button) => { button.disabled = socialGridOutputBusy || !ready; });
  elements.socialGridShowOverview.disabled = socialGridOutputBusy || !ready;
  elements.socialGridDownloadSelected.disabled = socialGridOutputBusy || !ready || !socialGridOutputSetSession?.selectedId;
  elements.socialGridDownloadAll.disabled = socialGridOutputBusy || !ready;
  if (selectedTask?.id === "UT-GRID") elements.download.disabled = socialGridOutputBusy;
}

function socialGridOutputById(tileId) {
  return socialGridOutputSetSession?.outputs?.get(tileId) ?? null;
}

function syncSocialGridTiles() {
  const ready = socialGridOutputSetSession?.status === "ready";
  elements.socialGridTiles.forEach((button) => {
    const tileId = button.dataset.socialGridTile;
    const output = ready ? socialGridOutputById(tileId) : null;
    button.dataset.selected = String(ready && socialGridOutputSetSession.selectedId === tileId);
    const preview = button.querySelector("[data-social-grid-preview]");
    if (output) preview.src = output.url;
    else preview.removeAttribute("src");
  });
  setSocialGridOutputBusy(socialGridOutputBusy);
}

function showSocialGridOverview() {
  if (!currentResult || socialGridOutputSetSession?.status !== "ready") return;
  socialGridOutputSetSession.selectedId = null;
  elements.resultOutputImage.src = currentResult.url;
  elements.resultOutputImage.alt = "完整显示的九宫格方形总图";
  elements.resultSize.textContent = `九宫格总图 ${currentResult.width} × ${currentResult.height}`;
  elements.download.textContent = "下载方形总图";
  elements.socialGridOutputStatus.textContent = "正在查看方形总图；点击任一编号可查看并下载对应单图。";
  syncSocialGridTiles();
  selectComparisonLayer("result");
}

function selectSocialGridTile(tileId) {
  const output = socialGridOutputById(tileId);
  if (!output || socialGridOutputSetSession?.status !== "ready") throw new Error("这张九宫格切图尚未准备好");
  socialGridOutputSetSession.selectedId = tileId;
  elements.resultOutputImage.src = output.url;
  elements.resultOutputImage.alt = `完整显示的第 ${output.number} 张九宫格切图`;
  elements.resultSize.textContent = `第 ${output.number} 张 · ${output.width} × ${output.height}`;
  elements.download.textContent = `下载第 ${output.number} 张`;
  elements.socialGridOutputStatus.textContent = `已选择第 ${output.number} 张；发布顺序按 1 → 9。`;
  syncSocialGridTiles();
  selectComparisonLayer("result");
  return output;
}

async function generateSocialGridTile(entry, sourceImage, expected) {
  let url = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = entry.size;
    canvas.height = entry.size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("当前浏览器无法建立九宫格切图画布");
    context.clearRect(0, 0, entry.size, entry.size);
    context.drawImage(sourceImage, entry.x, entry.y, entry.size, entry.size, 0, 0, entry.size, entry.size);
    const expectedPixels = context.getImageData(0, 0, entry.size, entry.size).data;
    const blob = await canvasEncodedBlob(canvas, "image/png");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const metadata = inspectOutputMetadata(bytes, "image/png");
    url = URL.createObjectURL(blob);
    const reopened = await decodeImage(url);
    const actualPixels = canvasPixels(reopened, entry.size, entry.size);
    const pixelValidation = verifyPixelRoundTrip({
      expected: expectedPixels,
      actual: actualPixels,
      width: entry.size,
      height: entry.size,
      mime: "image/png",
    });
    const outputHash = await sha256Bytes(bytes);
    if (selectedTask?.id !== "UT-GRID"
      || machine.activeRunId !== expected.runId
      || currentResult !== expected.result
      || source?.hash !== expected.sourceHash
      || socialGridOutputSetToken !== expected.token) {
      throw new Error("当前图片或任务已经变化，已停止旧九宫格切图");
    }
    const contract = buildResultDownloadContract({
      taskId: "UT-GRID",
      currentRunId: machine.activeRunId,
      result: {
        ...machine.result,
        mimeType: "image/png",
        hasAlpha: pixelValidation.transparentPixels > 0 || pixelValidation.partialAlphaPixels > 0,
        outputHash,
        byteLength: bytes.length,
      },
    });
    if (!contract.allowed) throw new Error(contract.message || "九宫格切图下载契约未通过");
    const output = Object.freeze({
      ...entry,
      width: entry.size,
      height: entry.size,
      blob,
      url,
      mimeType: "image/png",
      extension: "png",
      outputHash,
      byteLength: bytes.length,
      metadata,
      pixelValidation,
      filename: filenameWithSuffix(contract.download.filename, entry.filenameSuffix),
    });
    url = null;
    return output;
  } finally {
    revokeIfBlob(url);
  }
}

async function prepareSocialGridOutputSet() {
  if (selectedTask?.id !== "UT-GRID" || !currentResult?.url || !source?.file) {
    elements.socialGridOutputSet.hidden = true;
    return;
  }
  const layout = socialGridLayout(currentResult.width, currentResult.height);
  const token = ++socialGridOutputSetToken;
  const expected = Object.freeze({ runId: machine.activeRunId, result: currentResult, sourceHash: source.hash, token });
  const outputs = new Map();
  socialGridOutputSetSession = { status: "loading", selectedId: null, outputs, layout };
  elements.socialGridOutputSet.hidden = false;
  elements.socialGridOutputStatus.textContent = "正在本机生成第 1 / 9 张切图，不会上传图片…";
  syncSocialGridTiles();
  setSocialGridOutputBusy(true);
  try {
    const image = await decodeImage(currentResult.url);
    for (let index = 0; index < layout.entries.length; index += 1) {
      const entry = layout.entries[index];
      elements.socialGridOutputStatus.textContent = `正在本机生成第 ${index + 1} / ${SOCIAL_GRID_TILE_COUNT} 张切图…`;
      outputs.set(entry.id, await generateSocialGridTile(entry, image, expected));
    }
    if (currentResult !== expected.result || machine.activeRunId !== expected.runId || socialGridOutputSetToken !== token) {
      throw new Error("结果已经变化，已停止旧九宫格切图");
    }
    socialGridOutputSetSession.status = "ready";
    syncSocialGridTiles();
    showSocialGridOverview();
    const trimCopy = layout.trimmedPixels > 0 ? `；为整除 3 已居中舍弃 ${layout.trimmedPixels} 个边缘像素` : "";
    elements.socialGridOutputStatus.textContent = `9 张 ${layout.tileSize} × ${layout.tileSize} PNG 已完成格式、尺寸与像素重开检查${trimCopy}。`;
  } catch (error) {
    for (const output of outputs.values()) revokeIfBlob(output.url);
    if (socialGridOutputSetToken !== token) return;
    socialGridOutputSetSession = { status: "error", selectedId: null, outputs: new Map(), layout: null };
    syncSocialGridTiles();
    elements.socialGridOutputStatus.textContent = `九宫格切图没有完成：${error.message}`;
  } finally {
    if (socialGridOutputSetToken === token) setSocialGridOutputBusy(false);
  }
}

async function validatedSocialGridOutput(tileId) {
  const output = socialGridOutputById(tileId);
  if (!output || socialGridOutputSetSession?.status !== "ready") throw new Error("这张九宫格切图尚未准备好");
  const actualHash = await sha256Bytes(new Uint8Array(await output.blob.arrayBuffer()));
  if (actualHash !== output.outputHash || output.blob.size !== output.byteLength) throw new Error("九宫格切图下载前校验未通过");
  return output;
}

async function downloadSocialGridOutput(tileId) {
  const output = await validatedSocialGridOutput(tileId);
  triggerBlobDownload(output.blob, output.filename);
  elements.socialGridOutputStatus.textContent = `第 ${output.number} 张 ${output.width} × ${output.height} 已检查并开始下载。`;
  return output;
}

async function downloadSocialGridOutputSet() {
  if (socialGridOutputSetSession?.status !== "ready" || socialGridOutputSetSession.outputs.size !== SOCIAL_GRID_TILE_COUNT) {
    throw new Error("九张切图尚未全部准备好");
  }
  const outputs = [];
  for (const entry of socialGridOutputSetSession.layout.entries) outputs.push(await validatedSocialGridOutput(entry.id));
  const archive = await createStoredZip(outputs.map((output) => ({ name: output.filename, data: output.blob })));
  const token = new Date().toISOString().replace(/[:.]/gu, "-");
  triggerBlobDownload(archive.blob, `social-grid-9-images-${token}.zip`);
  elements.socialGridOutputStatus.textContent = `九张 ZIP 已检查并开始下载 · ${archive.entries} 张 PNG · ${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB`;
  return archive;
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
  technicalCheckState = Object.freeze({ status: "idle", sourceHash: null, inspection: null, advice: null });
  if ([STUDIO_STATES.SOURCE_CONSENT_PENDING, STUDIO_STATES.SOURCE_ERROR].includes(machine.status)) {
    dispatch(STUDIO_EVENTS.CANCEL_SOURCE);
  } else {
    machine = resetSourceSessionState({ ...machine, sourceRevision: previousRevision, supersededRunIds: previousSuperseded, detachedRunIds: previousDetached });
    elements.main.dataset.pageState = machine.status;
  }
  elements.fileInput.value = "";
  elements.rights.checked = false;
  elements.confirmSource.disabled = true;
  showOnly("empty");
  setJourney("source");
}

function selectedCatalog() {
  return buildProductTaskCatalog({ aiStatus: apiStatus, backgroundRemovalStatus, taskCopyById: TASK_COPY });
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
    technicalCheckState = Object.freeze({ status: "idle", sourceHash: prepared.hash, inspection: null, advice: null });
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
    showError("这张图片还不能读取", error.message || "请选择一张有效的 JPEG、PNG 或 WebP 图片。", false, { context: ERROR_CONTEXTS.INPUT, error });
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
    elements.statusTitle.textContent = "正在做本机技术检查";
    elements.statusCopy.textContent = "只读取缩小后的像素分布，不识别人物、商品或场景。";
    try {
      const inspection = inspectTechnicalImageElement(decoded);
      technicalCheckState = Object.freeze({
        status: "available",
        sourceHash: sourceToken.sourceHash,
        inspection,
        advice: technicalImageAdvice(inspection),
      });
    } catch (technicalError) {
      technicalCheckState = Object.freeze({
        status: "unavailable",
        sourceHash: sourceToken.sourceHash,
        inspection: null,
        advice: null,
        message: technicalError?.message || "当前浏览器无法读取技术观察所需的像素。",
      });
    }
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
    showError("图片检查没有完成", error.message || "请换一张图片后重试。", false, { context: ERROR_CONTEXTS.INPUT, error });
  }
}

function renderCapabilitySummary() {
  if (!elements.capabilitySummary) return;
  const minimaxCandidate = apiStatus.candidates?.find((entry) => entry.id === "minimax.image-01");
  const generativeCopy = apiStatus.available
    ? "AI 老照片深度修复和创意改造。会重建像素，不属于基础功能完成度。"
    : minimaxCandidate?.configured
      ? "MiniMax 已登记为候选，但当前官方接口需要在线参考图，不能直接处理本地上传；生成式任务仍保持关闭。"
      : "AI 老照片深度修复和创意改造。需要单独连接可直接接收本地图片的服务。";
  const layers = [
    {
      executor: "local",
      title: "本地基础能力",
      copy: "裁剪、旋转、尺寸、光色、社交构图和老照片基础整理。不会创造新内容。",
    },
    {
      executor: "background-removal",
      title: "远程抠图能力",
      copy: "透明抠图、商品白底和报名照换底。图片会发送到已连接的抠图服务。",
    },
    {
      executor: "ai",
      title: "生成式能力",
      copy: generativeCopy,
    },
  ];
  const availableLayers = layers.map((layer) => {
    const matching = tasks.filter((task) => task.executor === layer.executor);
    const available = matching.filter((task) => task.runnable).length;
    return { ...layer, matching, available };
  }).filter((layer) => layer.available > 0);
  elements.capabilitySummary.innerHTML = availableLayers.map((layer) => {
    const { matching, available } = layer;
    const state = available === matching.length ? "available" : available > 0 ? "partial" : "unavailable";
    const label = available === matching.length ? `${available} 个可用` : `${available} / ${matching.length} 可用`;
    return `<article class="capability-summary-card" role="listitem" data-state="${state}"><span>${label}</span><strong>${layer.title}</strong><p>${layer.copy}</p></article>`;
  }).join("");
}

function renderTechnicalCheck() {
  if (!elements.technicalCheck) return;
  const current = technicalCheckState.sourceHash === machine.source?.hash ? technicalCheckState : { status: "idle" };
  elements.technicalCheck.hidden = false;
  elements.technicalCheck.dataset.state = current.status;
  elements.technicalCheckSignals.replaceChildren();
  elements.technicalCheckAdvice.hidden = true;
  if (current.status !== "available") {
    elements.technicalCheckStatus.textContent = current.status === "unavailable"
      ? `技术检查未完成：${current.message} 这不会影响下面的操作。`
      : "技术观察尚未建立；你仍可以选择下面任意操作。";
    return;
  }
  elements.technicalCheckStatus.textContent = `已在本机检查 ${current.inspection.sample.width} × ${current.inspection.sample.height} 的缩小取样；原图没有上传。`;
  const signalEntries = [
    ["明暗", current.inspection.observations.exposure],
    ["色彩", current.inspection.observations.color],
    ["局部变化", current.inspection.observations.detail],
  ];
  signalEntries.forEach(([name, observation]) => {
    const card = document.createElement("article");
    card.className = "technical-signal";
    card.setAttribute("role", "listitem");
    card.innerHTML = `<span>${name}</span><strong>${observation.label}</strong><p>${observation.copy}</p>`;
    elements.technicalCheckSignals.append(card);
  });
  elements.technicalCheckAdviceLabel.textContent = current.advice.label;
  elements.technicalCheckAdviceCopy.textContent = `${current.advice.reason} 这只是起点，生成后仍需比较原图。`;
  elements.technicalCheckAdvice.hidden = false;
}

function openTechnicalAdvice() {
  const current = technicalCheckState;
  if (current.status !== "available" || current.sourceHash !== machine.source?.hash) return;
  const task = tasks.find((candidate) => candidate.id === current.advice.taskId);
  if (!task?.runnable) {
    toast("建议工具当前不可用，你仍可选择其他处理方向");
    return;
  }
  selectTask(task.id);
  selectEnhancementPreset(current.advice.presetId);
  toast(`已打开自然增强，并写入${current.advice.label.replace(/^从/u, "").replace(/开始$/u, "")}参数；尚未生成图片`);
}

function renderUnavailableTasks(unavailableTasks) {
  if (!elements.unavailableTasks) return;
  elements.unavailableTaskList.replaceChildren();
  elements.unavailableTasks.open = false;
  elements.unavailableTasks.hidden = unavailableTasks.length === 0;
  if (unavailableTasks.length === 0) return;
  elements.unavailableTasksSummary.textContent = `${unavailableTasks.length} 项，需要另行配置`;
  unavailableTasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "unavailable-task-item";
    item.setAttribute("role", "listitem");
    item.innerHTML = `<div><span>${task.statusLabel}</span><strong>${task.title}</strong></div><p>${task.description}</p>`;
    elements.unavailableTaskList.append(item);
  });
}

function renderTaskGoals() {
  elements.taskGoalList.replaceChildren();
  taskGoalEntries(tasks).forEach((goal) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-goal-button";
    button.dataset.taskGoal = goal.id;
    button.disabled = !goal.available;
    button.innerHTML = `<span>${goal.label}</span><small>${goal.detail}</small><strong>${goal.status}</strong>`;
    if (goal.available) button.addEventListener("click", () => selectTask(goal.taskId));
    elements.taskGoalList.append(button);
  });
}

function renderTasks() {
  elements.taskGrid.replaceChildren();
  renderTaskGoals();
  renderCapabilitySummary();
  renderTechnicalCheck();
  elements.recommendationCopy.textContent = `${taskAvailabilitySummary(tasks)} 这里只按已注册的实际用途和处理边界分组，不会猜测图片内容或替你选择效果。`;
  const ordinalById = new Map(tasks.map((task, index) => [task.id, index + 1]));
  const { activeGroups, unavailableTasks } = partitionTasksForDisplay(tasks);
  activeGroups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "task-group";
    section.dataset.taskGroup = group.id;
    const titleId = `task-group-${group.id}-title`;
    section.setAttribute("aria-labelledby", titleId);
    section.innerHTML = `<header class="task-group-heading"><div><p class="task-group-kicker">${group.availableCount} / ${group.tasks.length} 可用</p><h3 id="${titleId}">${group.title}</h3><p>${group.description}</p></div></header><div class="task-grid"></div>`;
    const grid = section.querySelector(".task-grid");
    group.tasks.forEach((task) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "task-card";
      button.dataset.taskId = task.id;
      button.dataset.tone = task.runnable ? task.kind : "pending";
      if (task.scenarioSkillId) button.dataset.scenarioSkill = task.scenarioSkillId;
      button.disabled = !task.runnable;
      const ordinal = ordinalById.get(task.id);
      button.innerHTML = `<span class="task-index">${String(ordinal).padStart(2, "0")} · ${task.runnable ? task.badge : task.statusLabel}</span><span class="task-art" aria-hidden="true"></span><h3>${task.title}</h3><p>${task.description}</p><footer><span>${task.output}</span><strong>${task.runnable ? "选择 →" : "暂不可选"}</strong></footer>`;
      if (task.runnable) button.addEventListener("click", () => selectTask(task.id));
      grid.append(button);
    });
    elements.taskGrid.append(section);
  });
  renderUnavailableTasks(unavailableTasks);
}

async function loadOldPhotoDemoImage() {
  const response = await fetch("./demo-assets/old-photo-demo-v1.png", { cache: "no-store" });
  if (!response.ok) throw new Error(`老照片演示图加载失败：HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.type !== "image/png" || blob.size <= 0) throw new Error("老照片演示图不是有效的 PNG 文件");
  return new File([blob], "old-photo-demo-v1.png", {
    type: "image/png",
    lastModified: 0,
  });
}

function returnToTaskSelection(message = "") {
  stopActiveRequest();
  clearResult();
  clearEditorWorkspace();
  selectedTask = null;
  dispatch(STUDIO_EVENTS.RETURN_TO_TASKS);
  renderTasks();
  showOnly("tasks");
  setJourney("task");
  elements.taskGrid.querySelector("button:not([disabled])")?.focus();
  if (message) toast(message);
}

function selectTask(taskId) {
  const nextTask = selectRunnableTask(tasks, taskId);
  if (!nextTask) return;
  selectedTask = nextTask;
  stopActiveRequest();
  clearResult();
  dispatch(STUDIO_EVENTS.SELECT_TASK, { taskId });
  dispatch(STUDIO_EVENTS.PREPARE_TASK);
  elements.configTitle.textContent = selectedTask.title;
  elements.configDescription.textContent = selectedTask.longDescription;
  elements.configPreserve.textContent = selectedTask.preserve;
  elements.configChange.textContent = selectedTask.change;
  renderSettings(selectedTask);
  if (isEditorTask(selectedTask.id)) initializeEditorWorkspace();
  else clearEditorWorkspace();
  showOnly("config");
  setJourney("task");
  (elements.settingsForm.querySelector('input:not([type="hidden"]), select, button') ?? elements.runButton).focus();
}

function renderSettings(task) {
  const workflowDefinition = workflowDefinitionForTask(task.id);
  assertWorkflowParameterContract(task, workflowDefinition);
  if (task.id === "UT-PRIVACY-SHARE") {
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="ratio" value="original" /><input type="hidden" name="sizeMode" value="custom" /><input type="hidden" name="outputLongEdge" value="1600" /><input type="hidden" name="format" value="jpeg" /><input type="hidden" name="jpegQuality" value="0.9" /><input type="hidden" name="jpegBackground" value="#ffffff" /><input type="hidden" name="compressionTargetKilobytes" value="1024" />
      <fieldset class="setting-group"><legend><span>0</span> 分享起点</legend><div class="enhancement-presets privacy-share-presets" role="group" aria-label="隐私分享副本预设">${PRIVACY_SHARE_PRESETS.map((preset) => `<button class="enhancement-preset" type="button" data-privacy-share-preset="${preset.id}" aria-pressed="${preset.id === "balanced"}"><strong>${preset.label}</strong><small>${preset.detail}</small></button>`).join("")}</div><p class="field-hint">预设只填写下面的最长边和体积参数，可以继续修改。</p></fieldset>
      <fieldset class="setting-group"><legend><span>1</span> 输出限制</legend>
        <div class="field"><label for="privacy-long-edge">最长边上限</label><div class="number-with-unit"><input id="privacy-long-edge" name="privacyLongEdge" type="number" min="640" max="2048" step="1" value="1600" /><span>px</span></div></div>
        <div class="field"><label for="privacy-target-kb">文件大小上限</label><div class="number-with-unit"><input id="privacy-target-kb" name="privacyTargetKilobytes" type="number" min="100" max="5120" step="1" value="1024" /><span>KB</span></div></div>
        <div class="field"><label for="privacy-background">透明区域底色</label><input id="privacy-background" name="privacyBackground" type="color" value="#ffffff" /></div>
      </fieldset>
      <section class="upload-plan" aria-labelledby="privacy-plan-title"><strong id="privacy-plan-title">本次本地处理</strong><ol data-privacy-share-plan></ol></section>
      <div class="format-conversion-boundary"><strong>只清理文件信息，不检查可见内容</strong><span>会移除当前禁止的 EXIF / GPS / XMP / IPTC / 注释 metadata；不会识别人脸、住址、车牌、二维码、水印或图片里的文字。</span></div>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成分享副本";
    elements.runButton.disabled = false;
    elements.runNote.textContent = "全程本地处理。只有 JPEG、尺寸、体积、像素与禁止 metadata 全部核对后，结果才可下载。";
    syncPrivacyShareControls();
    return;
  }
  if (task.id === "UT-UPLOAD") {
    const uploadSourceDimensions = orientedMediaDimensions(source.rawWidth ?? source.width, source.rawHeight ?? source.height, source.sourceOrientation ?? 1);
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="ratio" value="original" /><input type="hidden" name="sizeMode" value="custom" /><input type="hidden" name="outputLongEdge" value="1600" /><input type="hidden" name="format" value="jpeg" /><input type="hidden" name="jpegQuality" value="0.9" /><input type="hidden" name="jpegBackground" value="#ffffff" /><input type="hidden" name="uploadSourceRatio" value="${uploadSourceDimensions.width / uploadSourceDimensions.height}" />
      <fieldset class="setting-group"><legend><span>0</span> 常用起点</legend><div class="enhancement-presets upload-presets" role="group" aria-label="常用上传要求">${UPLOAD_SPECIFICATION_PRESETS.map((preset) => `<button class="enhancement-preset" type="button" data-upload-preset="${preset.id}" aria-pressed="${preset.id === "general"}"><strong>${preset.label}</strong><small>${preset.detail}</small></button>`).join("")}</div><p class="field-hint">预设只填写下面的公开参数，选择后仍可继续修改。</p></fieldset>
      <fieldset class="setting-group"><legend><span>1</span> 图片内容怎么保留</legend>
        <div class="field"><label for="upload-content-mode">处理方式</label><select id="upload-content-mode" name="uploadContentMode"><option value="whole">完整保留 · 用留白适配</option><option value="crop">允许居中裁剪 · 填满画面</option></select></div>
        <div class="field"><label for="upload-ratio">目标比例</label><select id="upload-ratio" name="uploadRatio"><option value="original">保持原图比例</option><option value="square">方形 1:1</option><option value="portrait">竖版 4:5</option><option value="wide">横版 16:9</option></select></div>
        <div class="field" data-upload-background><label for="upload-background">留白颜色</label><input id="upload-background" name="uploadBackground" type="color" value="#ffffff" /></div>
      </fieldset>
      <fieldset class="setting-group"><legend><span>2</span> 上传限制</legend>
        <div class="field"><label for="upload-long-edge">最长边上限</label><div class="number-with-unit"><input id="upload-long-edge" name="uploadLongEdge" type="number" min="320" max="2048" step="1" value="1600" /><span>px</span></div></div>
        <div class="field"><label for="upload-target-kb">文件大小上限</label><div class="number-with-unit"><input id="upload-target-kb" name="uploadTargetKilobytes" type="number" min="100" max="10240" step="1" value="1024" /><span>KB</span></div></div>
        <p class="field-hint">第一版固定输出 JPEG，适合网站、表单和附件上传；透明 PNG 上传将在后续独立扩展。</p>
      </fieldset>
      <section class="upload-plan" aria-labelledby="upload-plan-title"><strong id="upload-plan-title">本次处理计划</strong><ol data-upload-plan></ol></section>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成符合要求的图片";
    elements.runButton.disabled = false;
    elements.runNote.textContent = "全程本地执行。只有最终 JPEG 的格式、尺寸和真实文件大小全部核对后，才会显示是否达标。";
    syncUploadSpecificationControls();
    return;
  }
  if (task.id === "UT-FIT") {
    const sourceDimensions = orientedMediaDimensions(source.rawWidth ?? source.width, source.rawHeight ?? source.height, source.sourceOrientation ?? 1);
    const sourceRatio = sourceDimensions.width / sourceDimensions.height;
    const sourceLongEdge = Math.min(2048, Math.max(320, sourceDimensions.width, sourceDimensions.height));
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="ratio" value="original" />
      <input type="hidden" name="sizeMode" value="custom" />
      <input type="hidden" name="outputLongEdge" value="${sourceLongEdge}" />
      <input type="hidden" name="canvasSourceRatio" value="${sourceRatio}" />
      <input type="hidden" name="format" value="png" />
      <input type="hidden" name="jpegQuality" value="0.92" />
      <input type="hidden" name="jpegBackground" value="#ffffff" />
      <fieldset class="setting-group"><legend><span>1</span> 目标画布</legend>
        <p class="field-hint">原图是 ${sourceDimensions.width} × ${sourceDimensions.height}。画布是图片外面的容器；选择“保持原图比例”时只加可控边距，不会强行改成长宽模板。</p>
        <div class="field"><label for="canvas-ratio-setting">画布比例</label><select id="canvas-ratio-setting" name="canvasRatio">${CANVAS_FIT_RATIOS.map((item) => `<option value="${item.id}">${item.label}</option>`).join("")}</select></div>
        <div class="canvas-custom-ratio-fields" data-canvas-custom-ratio hidden><div class="field"><label for="canvas-custom-width-setting">比例宽</label><input id="canvas-custom-width-setting" name="canvasCustomWidth" type="number" min="0.1" max="100" step="0.1" value="1" /></div><span>:</span><div class="field"><label for="canvas-custom-height-setting">比例高</label><input id="canvas-custom-height-setting" name="canvasCustomHeight" type="number" min="0.1" max="100" step="0.1" value="1" /></div></div>
        <div class="field"><label for="canvas-long-edge-setting">最长边</label><div class="number-with-unit"><input id="canvas-long-edge-setting" name="canvasLongEdge" type="number" min="320" max="2048" step="1" value="${sourceLongEdge}" /><span>px</span></div></div>
        <div class="field range-field"><label for="canvas-margin-setting">四周留白 <output data-setting-value="canvasMargin">8%</output></label><input id="canvas-margin-setting" name="canvasMargin" type="range" min="0" max="25" step="1" value="8" /></div>
      </fieldset>
      <fieldset class="setting-group"><legend><span>2</span> 画布底色</legend>
        <div class="field"><label for="canvas-background-setting">底色</label><select id="canvas-background-setting" name="canvasBackground"><option value="white">白色 · JPEG</option><option value="black">黑色 · JPEG</option><option value="custom">自定义颜色 · JPEG</option><option value="transparent">透明 · PNG</option></select></div>
        <div class="field" data-canvas-custom-background hidden><label for="canvas-custom-background-setting">自定义底色</label><input id="canvas-custom-background-setting" name="canvasCustomBackground" type="color" value="#f2efe7" /></div>
      </fieldset>
      <div class="format-conversion-boundary"><strong>整张图都会保留</strong><span>图片在画布中居中并按比例缩小；不裁切、不拉伸、不放大小图，也不生成画面外内容。</span></div>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成完整适配图";
    elements.runButton.disabled = false;
    elements.runNote.textContent = "全程本地处理。纯色画布输出 JPEG，透明画布输出 PNG；原图不会被覆盖。";
    return;
  }
  if (task.id === "UT-CONVERT") {
    const sourceLongEdge = Math.min(8192, Math.max(1, source?.rawWidth ?? source?.width ?? 2048, source?.rawHeight ?? source?.height ?? 2048));
    const defaultFormat = source?.file?.type === "image/jpeg" ? "png" : "jpeg";
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="formatConversion" value="on" />
      <input type="hidden" name="ratio" value="original" />
      <input type="hidden" name="sizeMode" value="custom" />
      <input type="hidden" name="outputLongEdge" value="${sourceLongEdge}" />
      <fieldset class="setting-group"><legend><span>1</span> 转成什么格式</legend>
        <div class="format-conversion-options" role="radiogroup" aria-label="输出图片格式">
          ${FORMAT_CONVERSION_OPTIONS.map((option) => `<label class="format-conversion-option"><input type="radio" name="format" value="${option.id}"${option.id === defaultFormat ? " checked" : ""} /><span><strong>${option.label}</strong><small>${option.description}</small></span></label>`).join("")}
        </div>
      </fieldset>
      <fieldset class="setting-group" data-jpeg-background${defaultFormat === "jpeg" ? "" : " hidden"}><legend><span>2</span> JPEG 设置</legend>
        <div class="field range-field"><label for="conversion-quality-setting">JPEG 质量 <output data-setting-value="jpegQuality">90%</output></label><input id="conversion-quality-setting" name="jpegQuality" type="range" min="0.4" max="0.95" step="0.01" value="0.9" aria-describedby="conversion-quality-help" /></div>
        <p class="field-hint" id="conversion-quality-help">90% 适合一般照片。降低质量通常会减小文件，但文字、纹理和渐变更容易出现损失。</p>
        <div class="field"><label for="jpeg-background-setting">透明区域填充色</label><input id="jpeg-background-setting" name="jpegBackground" type="color" value="#ffffff" aria-describedby="conversion-background-help" /></div>
        <p class="field-hint" id="conversion-background-help">JPEG 不支持透明。只有原图中的透明或半透明像素会使用此颜色；这不是抠图或换背景。</p>
      </fieldset>
      <div class="format-conversion-boundary"><strong>保持完整图片</strong><span>不裁剪、不拉伸，默认尽量保持 ${sourceLongEdge} px 最长边；仍受 8192 px 单边和 1600 万输出像素安全上限约束。</span></div>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "生成转换文件";
    elements.runButton.disabled = false;
    elements.runNote.textContent = "全程本地处理。结果会重新打开并核对格式、尺寸、像素、metadata 和哈希；原图不会被覆盖。";
    return;
  }
  if (task.id === "UT-COMPRESS") {
    const initial = compressionPreset("upload-2mb");
    const sourceSize = source?.file?.size ? formatImageBytes(source.file.size) : "载入后显示";
    const sourceLongEdge = Math.min(8192, Math.max(320, source?.rawWidth ?? source?.width ?? 2048, source?.rawHeight ?? source?.height ?? 2048));
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="ratio" value="original" />
      <input type="hidden" name="sizeMode" value="custom" />
      <input type="hidden" name="format" value="jpeg" />
      <input type="hidden" name="jpegQuality" value="0.9" />
      <input type="hidden" name="jpegBackground" value="#ffffff" />
      <fieldset class="setting-group"><legend><span>1</span> 需要满足多大的文件限制</legend>
        <p class="field-hint">选择接收方要求的上限，不需要猜图片尺寸或 JPEG 质量。</p>
        <div class="enhancement-presets compression-presets" role="group" aria-label="目标文件大小场景">
          ${IMAGE_COMPRESSION_PRESETS.map((preset) => `<button class="enhancement-preset" type="button" data-compression-preset="${preset.id}" aria-pressed="${preset.id === "upload-2mb"}"><strong>${preset.label}</strong><small>${preset.description}</small></button>`).join("")}
        </div>
        <div class="field"><label for="compression-target-setting">自定义上限</label><div class="number-with-unit"><input id="compression-target-setting" name="compressionTargetKilobytes" type="number" inputmode="numeric" min="100" max="10240" step="1" value="${initial.targetKilobytes}" aria-describedby="compression-target-help compression-target-state" /><span aria-hidden="true">KB</span></div></div>
        <p class="field-hint" id="compression-target-help">可填写 100–10240 KB。这里填写的是接收方允许的最大文件大小。</p>
      </fieldset>
      <fieldset class="setting-group"><legend><span>2</span> 系统会怎样处理</legend>
        <div class="field"><label for="output-long-edge-setting">最长边上限（可选控制）</label><div class="number-with-unit"><input id="output-long-edge-setting" name="outputLongEdge" type="number" inputmode="numeric" min="320" max="8192" step="1" value="${sourceLongEdge}" aria-describedby="compression-edge-help size-limit-preview" /><span aria-hidden="true">px</span></div></div>
        <output class="size-limit-preview" data-size-limit-preview id="size-limit-preview" aria-live="polite"></output>
        <p class="field-hint" id="compression-edge-help">默认取当前原图最长边（最高 8192）；原图比上限小时不会放大。系统先保持这个尺寸并只调 JPEG 质量，仍过大时才逐级缩小。</p>
        <ol class="compression-strategy">
          <li>先按较高清晰度生成 JPEG。</li>
          <li>仍超过限制时，逐级降低质量和最长边，最多尝试 10 档。</li>
          <li>找到首个达标结果立即停止；最低到 640 px / 40%，仍不达标就明确提示。</li>
        </ol>
        <p class="field-hint">始终保持完整比例，不裁切、不拉伸、不强制改成 9:16，也不会覆盖原图。</p>
      </fieldset>
      <div class="compression-baseline" id="compression-target-state" aria-live="polite" aria-label="原图与目标大小">
        <span>原图</span><strong>${sourceSize}</strong>
        <span>目标</span><strong>不超过 ${formatImageBytes(initial.targetKilobytes * 1024)}</strong>
      </div>
      <p class="rectification-coordinate-note">输出固定为 JPEG。透明 PNG / WebP 的透明区域会填充为白色；这是格式限制，不是抠图或换背景。</p>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = "压缩到目标大小";
    elements.runButton.disabled = false;
    elements.runNote.textContent = "全程本地处理。只有实际编码并重开核对后的文件大小才算结果；未达目标会明确说明。";
    return;
  }
  if (isRectificationTask(task.id)) {
    const archive = task.id === "UT-DOC-ARCHIVE";
    const defaults = quadAsFormSettings(DEFAULT_RECTIFICATION_QUAD);
    const hiddenPoints = Object.entries(defaults)
      .map(([name, value]) => `<input type="hidden" name="${name}" value="${value}" />`)
      .join("");
    elements.settingsFields.innerHTML = `
      <input type="hidden" name="ratio" value="original" />
      <input type="hidden" name="rectificationEnabled" value="on" />
      <input type="hidden" name="documentScanMode" value="${archive ? "clean-color" : "original"}" />
      ${hiddenPoints}
      <fieldset class="setting-group"><legend><span>1</span> 四角裁正 <small>核心步骤</small></legend>
        <p class="field-hint">先让完整目标平面进入画面，再拖动左侧四个黄色角点贴合纸张、海报、画框或包装正面的边缘。</p>
        <div class="rectification-view-switch" role="group" aria-label="四角裁正查看方式">
          <button type="button" data-rectification-view="adjust" aria-pressed="true">调整四角</button>
          <button type="button" data-rectification-view="result" aria-pressed="false">查看裁正结果</button>
        </div>
        <div class="field"><label for="rotation-setting">先旋转方向</label><select id="rotation-setting" name="rotation"><option value="0">不旋转</option><option value="90">顺时针 90°</option><option value="180">旋转 180°</option><option value="270">逆时针 90°</option></select></div>
        <div class="field range-field"><label for="straighten-setting">轻微拉直 <output data-setting-value="straighten">0°</output></label><input id="straighten-setting" name="straighten" type="range" min="-10" max="10" step="0.1" value="0" aria-describedby="rectification-straighten-help" /></div>
        <p class="field-hint" id="rectification-straighten-help">先旋转或拉直，再调整四角。四角会始终绑定当前方向。</p>
        <button class="button button-quiet" type="button" data-rectification-reset>恢复四角到完整图片</button>
        <p class="rectification-coordinate-note">这是手动裁正，不会自动找纸张边缘。弯曲页面、强反光、折痕和镜头畸变不会被自动修复。</p>
      </fieldset>
      <fieldset class="setting-group"><legend><span>2</span> 文档可读性增强 <small>可选</small></legend>
        <p class="field-hint">处理海报、画框、包装或彩色图片时，保持“只裁正”即可。只有纸质文字文档需要下面三种增强；照片和复杂彩色图形不要使用高对比黑白。</p>
        <div class="document-scan-modes" role="group" aria-label="裁正后处理方式">
          ${DOCUMENT_SCAN_MODES.map((mode) => `<button class="document-scan-mode" type="button" data-document-scan-mode="${mode.id}" aria-pressed="${mode.id === "original"}"><strong>${mode.label}</strong><small>${mode.detail}</small></button>`).join("")}
        </div>
      </fieldset>
      <details class="settings-disclosure"><summary><span><b>3</b> 光色微调</span><small>可选</small></summary><div class="disclosure-body">
        <div class="field range-field"><label for="brightness-setting">亮度 <output data-setting-value="brightness">0</output></label><input id="brightness-setting" name="brightness" type="range" min="-100" max="100" step="1" value="0" /></div>
        <div class="field range-field"><label for="contrast-setting">对比度 <output data-setting-value="contrast">0</output></label><input id="contrast-setting" name="contrast" type="range" min="-100" max="100" step="1" value="0" /></div>
        <div class="field range-field"><label for="saturation-setting">饱和度 <output data-setting-value="saturation">0</output></label><input id="saturation-setting" name="saturation" type="range" min="-100" max="100" step="1" value="0" /></div>
      </div></details>
      <fieldset class="setting-group"><legend><span>4</span> 导出</legend>
        <div class="field"><label for="size-mode-setting">导出分辨率</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动（最长边不超过 2048 px，不放大）</option><option value="custom"${archive ? " selected" : ""}>自定义最长边上限</option></select></div>
        <div class="custom-size-fields" data-custom-size${archive ? "" : " hidden"}>
          <div class="field"><label for="output-long-edge-setting">最长边上限</label><div class="number-with-unit"><input id="output-long-edge-setting" name="outputLongEdge" type="number" inputmode="numeric" min="1" max="2048" step="1"${archive ? ' value="1600"' : ""} aria-describedby="rectification-size-help size-limit-preview" /><span aria-hidden="true">px</span></div></div>
          <output class="size-limit-preview" data-size-limit-preview id="size-limit-preview" aria-live="polite"></output>
          <p class="field-hint" id="rectification-size-help">只限制输出分辨率，不改变四角；来源有效区域较小时不会放大。</p>
        </div>
        ${archive ? '<input type="hidden" name="format" value="jpeg" /><input type="hidden" name="jpegBackground" value="#ffffff" /><div class="field"><label for="archive-target-kb">文件大小上限</label><div class="number-with-unit"><input id="archive-target-kb" name="archiveTargetKilobytes" type="number" min="100" max="10240" step="1" value="1024" /><span>KB</span></div></div>' : '<div class="field"><label for="format-setting">下载格式</label><select id="format-setting" name="format"><option value="png">PNG</option><option value="jpeg">JPEG</option></select></div><div class="field" data-jpeg-background hidden><label for="jpeg-background-setting">透明区域填充色</label><input id="jpeg-background-setting" name="jpegBackground" type="color" value="#ffffff" /></div>'}
      </fieldset>
      <p class="form-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = archive ? "生成归档附件" : "生成裁正结果";
    elements.runNote.textContent = archive ? "全程本地处理。系统会裁正、应用文档效果、转为 JPEG、压缩到附件上限并逐项核对。" : "全程本地处理。生成时会从原始解码图片重新执行四角裁正；如选择文档增强，再应用对应效果，并独立重开核对导出文件。";
    return;
  }
  if (isEditorTask(task.id)) {
    const portrait = task.id === "UT-PORTRAIT";
    const product = task.id === "UT-PRODUCT";
    const composedBackground = portrait || product;
    const enhancement = task.id === "UT-ENHANCE";
    const templateTask = task.id === "UT-TEMPLATE";
    const gridTask = task.id === "UT-GRID";
    const oldPhoto = task.id === "UT-OLD-PHOTO";
    const ratioOptions = composedBackground
      ? `<option value="square">${product ? "商品方图" : "方形头像"} · 1:1</option><option value="portrait">${product ? "竖版商品图" : "竖版头像"} · 4:5</option>`
      : gridTask
        ? '<option value="square">九宫格总画面 · 方形 1:1</option>'
      : '<option value="original">不裁剪 · 显示全图</option><option value="square">固定比例 · 方形 1:1</option><option value="portrait">固定比例 · 竖版 4:5</option><option value="landscape">固定比例 · 横版 3:2</option><option value="wide">固定比例 · 宽屏 16:9</option><option value="story">固定比例 · 竖屏 9:16</option><option value="free">自由裁剪</option>';
    const exportFields = composedBackground
      ? `<input type="hidden" name="format" value="png" />
        <div class="field"><label for="size-mode-setting">抠图工作分辨率</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动（不放大原图）</option><option value="custom">自定义最长边上限</option></select></div>`
      : gridTask
        ? `<input type="hidden" name="format" value="png" />
          <div class="field"><label for="size-mode-setting">九宫格总图分辨率</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动（不放大原图）</option><option value="custom">自定义最长边上限</option></select></div>`
      : `<div class="field"><label for="size-mode-setting">导出分辨率</label><select id="size-mode-setting" name="sizeMode"><option value="preset">自动（最长边不超过 2048 px，不放大）</option><option value="custom">自定义最长边上限</option></select></div>`;
    const enhancementPresetControls = enhancement
      ? `<div class="enhancement-presets" role="group" aria-label="自然增强预设">
          ${ENHANCEMENT_PRESETS.map((preset) => `<button class="enhancement-preset" type="button" data-enhancement-preset="${preset.id}" aria-pressed="false"><strong>${preset.label}</strong><small>${preset.description}</small></button>`).join("")}
        </div>
        <p class="field-hint">预设只写入下方五个公开参数。选择后仍可手动调整；手调不会被自动覆盖。</p>`
      : "";
    const detailEnhancementControls = enhancement || oldPhoto
      ? `<div class="detail-enhancement-controls" aria-labelledby="detail-enhancement-label">
          <div class="field-section-label" id="detail-enhancement-label"><strong>${oldPhoto ? "基础细节整理" : "像素细节"}</strong><span>本地确定性处理，不补画内容</span></div>
          <div class="field range-field"><label for="denoise-setting">轻度降噪 <output data-setting-value="denoise">0</output></label><input id="denoise-setting" name="denoise" type="range" min="0" max="100" step="1" value="0" /></div>
          <div class="field range-field"><label for="clarity-setting">清晰度 <output data-setting-value="clarity">0</output></label><input id="clarity-setting" name="clarity" type="range" min="0" max="100" step="1" value="0" /></div>
          <p class="field-hint">降噪会轻微平滑颗粒；清晰度增强已有局部反差。它不能去除划痕或恢复失焦。实时区先反馈构图与光色，像素细节以生成后的原图 / 结果对比为准。</p>
        </div>`
      : "";
    const oldPhotoPresetControls = oldPhoto
      ? `<div class="enhancement-presets" role="group" aria-label="老照片本地整理预设">
          ${OLD_PHOTO_LOCAL_PRESETS.map((preset) => `<button class="enhancement-preset" type="button" data-old-photo-preset="${preset.id}" aria-pressed="false"><strong>${preset.label}</strong><small>${preset.description}</small></button>`).join("")}
        </div>
        <p class="field-hint">预设只写入下方五个公开参数；光色会实时预览，像素细节在生成后比较。它不会识别划痕、补人脸或重写文字。</p>`
      : "";
    const sceneTemplateControls = templateTask
      ? `<div class="scene-template-presets" role="group" aria-label="场景尺寸模板">
          ${SCENE_TEMPLATE_PRESETS.map((preset) => `<button class="scene-template-preset" type="button" data-scene-template="${preset.id}" aria-pressed="false"><strong>${preset.label}</strong><small>${preset.description}</small></button>`).join("")}
        </div>
        <p class="field-hint">模板同时设置下方比例和最长边上限。它不是平台官方规范；手动修改后模板高亮会自动取消。</p>`
      : "";
    const socialOverlayControls = templateTask
      ? `<fieldset class="setting-group social-overlay-settings"><legend><span>2</span> 标题与安全区</legend>
          <div class="field"><label for="social-title-setting">标题文字（可选）</label><input id="social-title-setting" name="socialTitle" type="text" maxlength="40" autocomplete="off" placeholder="留空则只导出图片" aria-describedby="social-title-explanation" /></div>
          <div class="social-overlay-fields">
            <div class="field"><label for="social-title-position-setting">位置</label><select id="social-title-position-setting" name="socialTitlePosition"><option value="bottom">底部安全区</option><option value="top">顶部安全区</option></select></div>
            <div class="field"><label for="social-title-alignment-setting">对齐</label><select id="social-title-alignment-setting" name="socialTitleAlignment"><option value="left">左对齐</option><option value="center">居中</option></select></div>
            <div class="field"><label for="social-title-tone-setting">文字颜色</label><select id="social-title-tone-setting" name="socialTitleTone"><option value="light">浅色字</option><option value="dark">深色字</option></select></div>
          </div>
          <p class="field-hint" id="social-title-explanation">最多 40 个字符、最多两行，自动保留 7% 通用安全区并加可读底板。安全区不是任何平台的官方发布规范。</p>
        </fieldset>`
      : "";
    elements.settingsFields.innerHTML = `
      <fieldset class="setting-group"><legend><span>1</span> ${templateTask ? "场景与构图" : "构图与方向"}</legend>
        ${sceneTemplateControls}
        <div class="field"><label for="ratio-setting">${product ? "商品图比例" : portrait ? "头像比例" : gridTask ? "九宫格总画面" : "裁剪方式"}</label><select id="ratio-setting" name="ratio">${ratioOptions}</select></div>
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
        <div class="field range-field straighten-field">
          <label for="straighten-setting">水平校正 <output data-setting-value="straighten">0°</output></label>
          <input id="straighten-setting" name="straighten" type="range" min="-10" max="10" step="0.1" value="0" aria-describedby="straighten-explanation" />
          <div class="field-inline-action"><button class="button button-quiet" type="button" data-straighten-reset>归零</button></div>
          <p class="field-hint" id="straighten-explanation">手动拉直轻微歪斜的照片。为避免空角，画面会自动等比放大并裁去少量边缘；不做自动地平线或透视校正。<a href="./straighten-reference.html" target="_blank" rel="noopener">查看项目原创测试图的真实渲染演示</a></p>
        </div>
        <div class="field range-field perspective-field">
          <label for="vertical-perspective-setting">垂直透视 <output data-setting-value="verticalPerspective">0</output></label>
          <input id="vertical-perspective-setting" name="verticalPerspective" type="range" min="-20" max="20" step="1" value="0" aria-describedby="vertical-perspective-explanation" />
          <div class="field-inline-action"><button class="button button-quiet" type="button" data-perspective-reset>归零</button></div>
          <p class="field-hint" id="vertical-perspective-explanation">修正建筑、文档或包装轻微的垂直线汇聚。正值扩展上方，负值扩展下方；为避免空边会自动放大并裁去左右少量内容，不做自动识别或四角扫描。<a href="./straighten-reference.html?refresh=perspective-v1" target="_blank" rel="noopener">查看项目原创图片的真实几何渲染</a></p>
        </div>
        <div class="field"><label>翻转</label><div class="choice-row"><label><input type="checkbox" name="flipHorizontal" />水平</label><label><input type="checkbox" name="flipVertical" />垂直</label></div></div>
      </fieldset>
      ${socialOverlayControls}
      <details class="settings-disclosure"${enhancement || oldPhoto ? " open" : ""}><summary><span><b>${templateTask ? "3" : "2"}</b> ${oldPhoto ? "基础修复" : enhancement ? "自然增强" : "光色微调"}</span><small>${enhancement || oldPhoto ? "先选预设，再微调" : "可选"}</small></summary>
        <div class="disclosure-body">
          ${enhancementPresetControls}
          ${oldPhotoPresetControls}
          <div class="field range-field"><label for="brightness-setting">亮度 <output data-setting-value="brightness">0</output></label><input id="brightness-setting" name="brightness" type="range" min="-100" max="100" step="1" value="0" /></div>
          <div class="field range-field"><label for="contrast-setting">对比度 <output data-setting-value="contrast">0</output></label><input id="contrast-setting" name="contrast" type="range" min="-100" max="100" step="1" value="0" /></div>
          <div class="field range-field"><label for="saturation-setting">饱和度 <output data-setting-value="saturation">0</output></label><input id="saturation-setting" name="saturation" type="range" min="-100" max="100" step="1" value="0" /></div>
          ${detailEnhancementControls}
        </div>
      </details>
      <fieldset class="setting-group"><legend><span>${templateTask ? "4" : "3"}</span> 导出</legend>
        ${exportFields}
        <div class="custom-size-fields" data-custom-size hidden>
          <div class="field"><label for="output-long-edge-setting">最长边上限</label><div class="number-with-unit"><input id="output-long-edge-setting" name="outputLongEdge" type="number" inputmode="numeric" min="${gridTask ? 3 : 1}" max="2048" step="1" aria-describedby="custom-size-explanation size-limit-preview" /><span aria-hidden="true">px</span></div></div>
          <output class="size-limit-preview" data-size-limit-preview id="size-limit-preview" aria-live="polite"></output>
          <p class="field-hint" id="custom-size-explanation">这是导出分辨率上限，不是强制尺寸，也不改变裁剪构图。宽高按当前裁剪比例自动计算；裁剪区域本来较小时不会放大，所以结果可能不变。</p>
        </div>
        ${composedBackground || gridTask ? "" : '<div class="field"><label for="format-setting">下载格式</label><select id="format-setting" name="format"><option value="png">PNG（保留透明像素）</option><option value="jpeg">JPEG（透明像素需要填色）</option></select></div><div class="field" data-jpeg-background hidden><label for="jpeg-background-setting">透明区域填充色</label><input id="jpeg-background-setting" name="jpegBackground" type="color" value="#ffffff" aria-describedby="jpeg-background-explanation" /><p class="field-hint" id="jpeg-background-explanation">JPEG 不支持透明，这个颜色只填充原图中的透明或半透明像素。普通不透明照片不会变化；这不是抠图或换背景。</p></div>'}
      </fieldset>
      ${composedBackground ? `<fieldset class="setting-group remote-processing-consent"><legend><span>4</span> 远程抠图确认</legend>
        <div class="remote-processing-summary"><strong>先本地构图，再发送抠图</strong><p>只发送左侧亮框中的${product ? "商品" : "人物"}构图；远程服务返回透明结果后，修边和${product ? "白底合成" : "纯色换底"}继续在本机完成。</p></div>
        <label class="consent-check"><input type="checkbox" name="remoteConsent" required /> <span>我同意将当前${product ? "商品" : "头像"}构图发送给远程抠图服务处理</span></label>
        <p class="field-hint">${product ? "抠图后可在本地调整留白和基础柔和阴影；不保证平台审核或尺寸规范。" : "当前是通用报名照与头像工具，不承诺任何证件或机构规格。"}失败不会覆盖原图，也不会自动重复提交。</p>
      </fieldset>` : ""}
      <p class="settings-error" id="editor-settings-error" role="alert" hidden></p>`;
    elements.runButton.textContent = product ? "生成商品白底图" : portrait ? "生成报名照 / 头像" : enhancement ? "生成增强结果" : templateTask ? "生成社交图片" : gridTask ? "生成九宫格切图" : oldPhoto ? "生成基础整理副本" : "生成下载文件";
    elements.runNote.textContent = composedBackground
      ? `先在本机生成确认后的 PNG 构图，再进行一次远程抠图；结果可继续修边和${product ? "检查白底" : "选择底色"}。`
      : enhancement
        ? "全部在本机完成；支持光色、轻度降噪和清晰度，不分析主体或重建内容。生成后会自动检查文件能否正确打开。"
        : templateTask
          ? "全部在本机完成；可选标题会写入通用安全区，预览与下载使用同一文字布局，不上传图片，也不保证平台发布规格。"
          : gridTask
            ? "全部在本机完成；先生成方形总图，再逐张检查九张 PNG。不会自动发布，也不会识别或补画主体。"
          : oldPhoto
            ? "全部在本机完成；只做可见的光色、轻度降噪、清晰度、构图与导出处理，不上传图片，也不补画缺失细节。"
        : "全部在本机完成；不会调用 AI、补画内容或上传图片。生成后会自动检查文件能否正确打开。";
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
  } else if (task.id === "CR-RESTORE") {
    elements.settingsFields.innerHTML = `
      <fieldset class="setting-group"><legend><span>1</span> 修复方式</legend>
        <div class="field"><label for="restoration-strength">修复强度</label><select id="restoration-strength" name="strength">${OLD_PHOTO_RESTORATION_STRENGTHS.map((option) => `<option value="${option.id}">${option.label}</option>`).join("")}</select><p class="field-hint">从克制修复开始；当前没有“强力修复”，避免把猜测当成原始细节。</p></div>
        <div class="field"><label for="restoration-preserve">优先保留</label><select id="restoration-preserve" name="preserve">${OLD_PHOTO_RESTORATION_PRIORITIES.map((option) => `<option value="${option.id}">${option.label}</option>`).join("")}</select></div>
        <div class="field"><label for="restoration-quality">生成质量</label><select id="restoration-quality" name="quality"><option value="medium" selected>标准结果</option><option value="high">精细结果</option></select></div>
      </fieldset>
      <fieldset class="setting-group remote-processing-consent"><legend><span>2</span> 生成式处理确认</legend>
        <div class="remote-processing-summary"><strong>这不是无损或档案级复原</strong><p>图片会发送到已连接的生成式图片编辑服务并重新生成像素。系统会约束提示词，但不能保证人物身份、文字或历史细节完全准确。</p></div>
        <p class="field-hint"><a href="./old-photo-reference.html" target="_blank" rel="noopener">先查看项目原创老照片的 Codex 生成式修复参考</a>（参考图不是本次运行结果）。</p>
        <label class="consent-check"><input type="checkbox" name="generativeRestoreConsent" required /> <span>我理解结果会重新生成像素，人物面部、文字和历史细节可能变化</span></label>
        <p class="field-hint">原图不会被覆盖；失败不会自动重复提交。生成后请使用原图 / 结果对比再决定是否下载。</p>
      </fieldset>`;
    elements.runButton.textContent = "生成修复副本";
    elements.runNote.textContent = "这是可能产生费用的远程生成；只有你明确确认后才会提交一次。";
  } else {
    elements.settingsFields.innerHTML = `
      <div class="field"><label for="creative-quality">生成质量</label><select id="creative-quality" name="quality"><option value="low">快速草稿</option><option value="medium" selected>标准结果</option><option value="high">精细结果</option></select></div>
      <div class="field"><label for="creative-preserve">必须保留</label><select id="creative-preserve" name="preserve"><option value="subject">主体、动作与关键物件</option><option value="composition">主体与原始构图</option><option value="color">主体与来源色彩</option></select></div>`;
    elements.runButton.textContent = "开始真实生成";
    elements.runNote.textContent = "图片只会从本地服务端发送到已连接的生成式图片服务；生成结果不会伪造。";
  }
  elements.runButton.disabled = isBackgroundRemovalTask(task.id) || task.id === "CR-RESTORE";
}

function syncRemoteConsent() {
  if (!isBackgroundRemovalTask()) return;
  const settingsError = elements.settingsForm.querySelector("#editor-settings-error");
  elements.runButton.disabled = elements.settingsForm.elements.remoteConsent?.checked !== true
    || Boolean(settingsError && !settingsError.hidden);
}

function syncGenerativeRestoreConsent() {
  if (selectedTask?.id !== "CR-RESTORE") return;
  elements.runButton.disabled = elements.settingsForm.elements.generativeRestoreConsent?.checked !== true;
}

function editorFormSettings() {
  const data = Object.fromEntries(new FormData(elements.settingsForm).entries());
  return {
    ...data,
    flipHorizontal: elements.settingsForm.elements.flipHorizontal?.checked ?? false,
    flipVertical: elements.settingsForm.elements.flipVertical?.checked ?? false,
  };
}

function syncUploadSpecificationControls() {
  if (selectedTask?.id !== "UT-UPLOAD") return;
  const form = elements.settingsForm.elements;
  if (form.uploadContentMode?.value === "crop" && form.uploadRatio?.value === "original") form.uploadRatio.value = "square";
  if (form.ratio) form.ratio.value = form.uploadContentMode?.value === "crop" ? form.uploadRatio.value : "original";
  if (form.outputLongEdge) form.outputLongEdge.value = form.uploadLongEdge?.value ?? "1600";
  const background = elements.settingsForm.querySelector("[data-upload-background]");
  if (background) background.hidden = form.uploadContentMode?.value !== "whole";
  const activePreset = matchUploadSpecificationPreset(editorFormSettings());
  elements.settingsForm.querySelectorAll("[data-upload-preset]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.uploadPreset === activePreset)));
  const list = elements.settingsForm.querySelector("[data-upload-plan]");
  if (!list) return;
  try {
    const plan = uploadSpecificationPlan(editorFormSettings());
    list.innerHTML = plan.steps.map((step) => `<li>${step}</li>`).join("");
  } catch (error) {
    list.innerHTML = `<li>${error.message}</li>`;
  }
}

function syncPrivacyShareControls() {
  if (selectedTask?.id !== "UT-PRIVACY-SHARE") return;
  const list = elements.settingsForm.querySelector("[data-privacy-share-plan]");
  try {
    const plan = privacySharePlan(editorFormSettings());
    if (list) list.innerHTML = plan.steps.map((step) => `<li>${step}</li>`).join("");
    elements.settingsForm.querySelectorAll("[data-privacy-share-preset]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.privacySharePreset === matchPrivacySharePreset(editorFormSettings())));
    });
  } catch (error) {
    if (list) list.innerHTML = `<li>${error.message}</li>`;
  }
}

function selectPrivacySharePreset(presetId) {
  if (selectedTask?.id !== "UT-PRIVACY-SHARE" || !editorWorkspace) return;
  const settings = applyPrivacySharePreset(editorFormSettings(), presetId);
  for (const name of ["privacyLongEdge", "privacyTargetKilobytes"]) setControlValue(name, settings[name]);
  const editor = privacyShareEditorSettings(settings);
  for (const name of ["outputLongEdge", "compressionTargetKilobytes", "jpegBackground"]) setControlValue(name, editor[name]);
  if (!commitEditorForm()) return;
  syncPrivacyShareControls();
  const preset = PRIVACY_SHARE_PRESETS.find((candidate) => candidate.id === presetId);
  elements.editorChangeState.textContent = `${preset?.label ?? "分享"}预设已记入编辑历史`;
}

function selectUploadSpecificationPreset(presetId) {
  if (selectedTask?.id !== "UT-UPLOAD" || !editorWorkspace) return;
  const settings = applyUploadSpecificationPreset(editorFormSettings(), presetId);
  ["uploadContentMode", "uploadRatio", "uploadLongEdge", "uploadTargetKilobytes"].forEach((name) => setControlValue(name, settings[name]));
  syncUploadSpecificationControls();
  if (commitEditorForm()) elements.editorChangeState.textContent = "上传预设已应用；仍可修改下面参数";
}

function setControlValue(name, value) {
  const control = elements.settingsForm.elements[name];
  if (!control) return;
  if (control.type === "checkbox") control.checked = Boolean(value);
  else control.value = value === null || value === undefined ? "" : String(value);
}

function syncCompressionPresetState(settings) {
  if (selectedTask?.id !== "UT-COMPRESS") return;
  const compressionTargetKilobytes = elements.settingsForm.elements.compressionTargetKilobytes?.value
    ?? settings.compressionTargetKilobytes;
  const activePreset = matchCompressionPreset({ compressionTargetKilobytes });
  elements.settingsForm.querySelectorAll("[data-compression-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.compressionPreset === activePreset));
  });
}

function syncCompressionTargetState() {
  if (selectedTask?.id !== "UT-COMPRESS") return;
  const output = elements.settingsForm.querySelector("#compression-target-state");
  if (!output) return;
  const raw = elements.settingsForm.elements.compressionTargetKilobytes?.value;
  let targetKilobytes;
  try {
    targetKilobytes = normalizeCompressionTargetKilobytes(raw);
  } catch {
    output.innerHTML = `<span>原图</span><strong>${formatImageBytes(source.file.size)}</strong><span>目标</span><strong>请输入 100–10240 KB</strong>`;
    return;
  }
  const targetBytes = compressionTargetBytes(targetKilobytes);
  const pressure = compressionTargetPressure({ sourceBytes: source.file.size, targetBytes });
  output.innerHTML = `<span>原图</span><strong>${formatImageBytes(source.file.size)}</strong><span>目标</span><strong>不超过 ${formatImageBytes(targetBytes)}</strong><span>体积要求</span><strong>${pressure.alreadyFits ? "原图已经达标，无需压缩" : `${pressure.label} · 至少减少 ${pressure.minimumReductionPercent.toFixed(1)}%`}</strong><span>画质说明</span><strong>${pressure.alreadyFits ? "不会重新编码" : "体积减少不等于同等比例的画质损失，结果页会显示实际像素与质量"}</strong>`;
}

function syncEnhancementPresetState(settings) {
  if (selectedTask?.id !== "UT-ENHANCE") return;
  const activePreset = matchEnhancementPreset(settings);
  elements.settingsForm.querySelectorAll("[data-enhancement-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.enhancementPreset === activePreset));
  });
}

function syncOldPhotoPresetState(settings) {
  if (selectedTask?.id !== "UT-OLD-PHOTO") return;
  const activePreset = matchOldPhotoLocalPreset(settings);
  elements.settingsForm.querySelectorAll("[data-old-photo-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.oldPhotoPreset === activePreset));
  });
}

function syncSceneTemplateState(settings) {
  if (selectedTask?.id !== "UT-TEMPLATE") return;
  const activeTemplate = matchSceneTemplate(settings);
  elements.settingsForm.querySelectorAll("[data-scene-template]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sceneTemplate === activeTemplate));
  });
}

function syncSocialTitlePreview(settings) {
  const active = selectedTask?.id === "UT-TEMPLATE";
  const overlay = active ? normalizeSocialOverlaySettings(settings) : normalizeSocialOverlaySettings();
  elements.socialTitlePreview.hidden = !active || !overlay.text;
  elements.socialTitlePreview.textContent = overlay.text;
  elements.socialTitlePreview.dataset.position = overlay.position;
  elements.socialTitlePreview.dataset.alignment = overlay.alignment;
  elements.socialTitlePreview.dataset.tone = overlay.tone;
}

function selectEnhancementPreset(presetId) {
  if (selectedTask?.id !== "UT-ENHANCE" || !editorWorkspace) return;
  const settings = applyEnhancementPreset(editorFormSettings(), presetId);
  for (const name of ["brightness", "contrast", "saturation", "denoise", "clarity"]) setControlValue(name, settings[name]);
  if (!commitEditorForm()) return;
  const preset = ENHANCEMENT_PRESETS.find((candidate) => candidate.id === presetId);
  elements.editorChangeState.textContent = `${preset?.label ?? "增强"}预设已记入编辑历史`;
}

function selectCompressionPreset(presetId) {
  if (selectedTask?.id !== "UT-COMPRESS" || !editorWorkspace) return;
  const settings = applyCompressionPreset(editorFormSettings(), presetId);
  for (const name of ["sizeMode", "outputLongEdge", "format", "jpegQuality", "compressionTargetKilobytes"]) setControlValue(name, settings[name]);
  if (!commitEditorForm()) return;
  syncCompressionTargetState();
  syncCompressionPresetState(settings);
  const preset = IMAGE_COMPRESSION_PRESETS.find((candidate) => candidate.id === presetId);
  elements.editorChangeState.textContent = `目标已设为${preset?.description ?? "指定文件大小"}`;
}

function selectOldPhotoPreset(presetId) {
  if (selectedTask?.id !== "UT-OLD-PHOTO" || !editorWorkspace) return;
  const settings = applyOldPhotoLocalPreset(editorFormSettings(), presetId);
  for (const name of ["brightness", "contrast", "saturation", "denoise", "clarity"]) setControlValue(name, settings[name]);
  if (!commitEditorForm()) return;
  const preset = OLD_PHOTO_LOCAL_PRESETS.find((candidate) => candidate.id === presetId);
  elements.editorChangeState.textContent = `${preset?.label ?? "老照片"}预设已记入编辑历史`;
}

function selectSceneTemplate(templateId) {
  if (selectedTask?.id !== "UT-TEMPLATE" || !editorWorkspace) return;
  const settings = applySceneTemplate(editorFormSettings(), templateId);
  for (const name of ["ratio", "sizeMode", "outputLongEdge"]) setControlValue(name, settings[name]);
  if (!commitEditorForm()) return;
  const template = SCENE_TEMPLATE_PRESETS.find((candidate) => candidate.id === templateId);
  elements.editorChangeState.textContent = `${template?.label ?? "场景"}模板已记入编辑历史`;
}

function setEditorValidity(error = null, { focus = false } = {}) {
  const errorNode = elements.settingsForm.querySelector("#editor-settings-error");
  elements.settingsForm.querySelectorAll('[aria-invalid="true"]').forEach((control) => {
    control.removeAttribute("aria-invalid");
    if (control.getAttribute("aria-errormessage") === "editor-settings-error") control.removeAttribute("aria-errormessage");
  });
  if (errorNode) {
    errorNode.hidden = !error;
    if (error) {
      const presentation = errorPagePresentation({ context: ERROR_CONTEXTS.SETTINGS, error, taskId: selectedTask?.id });
      errorNode.dataset.errorContext = presentation.context;
      errorNode.dataset.errorCode = presentation.technicalCode;
      errorNode.textContent = `${error.message || presentation.message} ${presentation.dataBoundary} ${presentation.actionHint}`;
      const fieldNames = settingsErrorFieldNames(error);
      const target = fieldNames.map((name) => elements.settingsForm.elements[name]).find(Boolean)
        ?? elements.settingsForm.querySelector(":invalid")
        ?? elements.settingsForm.querySelector('input:not([type="hidden"]), select, button');
      if (target) {
        target.setAttribute("aria-invalid", "true");
        target.setAttribute("aria-errormessage", "editor-settings-error");
        if (focus) target.focus();
      }
    } else {
      delete errorNode.dataset.errorContext;
      delete errorNode.dataset.errorCode;
      errorNode.textContent = "";
    }
  }
  elements.runButton.disabled = Boolean(error)
    || (isBackgroundRemovalTask() && elements.settingsForm.elements.remoteConsent?.checked !== true);
}

function syncRectificationOverlay(quad) {
  const points = QUAD_POINT_NAMES.map((name) => `${quad[name].x * 100} ${quad[name].y * 100}`);
  elements.editorRectificationShade.setAttribute(
    "d",
    `M0 0H100V100H0Z M${points[0]} L${points[1]} L${points[2]} L${points[3]} Z`,
  );
  elements.rectificationHandles.forEach((handle) => {
    const point = quad[handle.dataset.rectificationPoint];
    handle.style.left = `${point.x * 100}%`;
    handle.style.top = `${point.y * 100}%`;
  });
}

function syncRectificationViewButtons() {
  elements.settingsForm.querySelectorAll("[data-rectification-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.rectificationView === rectificationView));
  });
}

function syncDocumentScanModeButtons(mode) {
  elements.settingsForm.querySelectorAll("[data-document-scan-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.documentScanMode === mode));
  });
}

function renderEditorPreview(settings = editorSettings(editorWorkspace), { transient = false } = {}) {
  if (!editorWorkspace) return;
  if (selectedTask?.id === "UT-TEMPLATE") normalizeSocialOverlaySettings(settings);
  const uploadSpecification = selectedTask?.id === "UT-UPLOAD" ? normalizeUploadSpecification(settings) : null;
  const canvasFit = selectedTask?.id === "UT-FIT"
    ? normalizeCanvasFitSettings(settings)
    : uploadSpecification?.contentMode === "whole"
      ? normalizeCanvasFitSettings({
          canvasRatio: uploadSpecification.ratioId,
          canvasSourceRatio: settings.uploadSourceRatio,
          canvasLongEdge: uploadSpecification.outputLongEdge,
          canvasMargin: 0,
          canvasBackground: "custom",
          canvasCustomBackground: uploadSpecification.backgroundColor,
        })
      : null;
  const presentation = editorPreviewPresentation(editorWorkspace, settings);
  const rectificationTask = isRectificationTask() && presentation.rectification.enabled;
  const showRectifiedResult = rectificationTask && rectificationView === "result";
  elements.editorPreviewFrame.style.aspectRatio = showRectifiedResult
    ? `${presentation.output.width} / ${presentation.output.height}`
    : presentation.aspectRatio;
  elements.editorPreviewFrame.style.setProperty("--preview-ratio", String(presentation.aspectValue));
  elements.editorPreviewFrame.style.setProperty("--frame-ratio", String(showRectifiedResult ? presentation.aspectValue : presentation.frameAspectValue));
  elements.editorPreviewFrame.dataset.format = presentation.format;
  elements.editorPreviewFrame.style.setProperty("--jpeg-preview-background", presentation.background ?? "#ffffff");
  elements.editorPreviewImage.style.width = presentation.previewWidth;
  elements.editorPreviewImage.style.height = presentation.previewHeight;
  elements.editorPreviewImage.style.transform = presentation.transform;
  elements.editorPreviewImage.style.objectPosition = presentation.objectPosition;
  elements.editorPreviewImage.style.filter = presentation.filter;
  elements.editorPreviewFrame.classList.toggle("is-canvas-fit", Boolean(canvasFit));
  if (canvasFit) {
    const dimensions = canvasFitDimensions(canvasFit);
    elements.editorPreviewFrame.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    elements.editorPreviewFrame.style.setProperty("--frame-ratio", String(dimensions.width / dimensions.height));
    elements.editorPreviewFrame.style.setProperty("--canvas-fit-margin", `${canvasFit.marginPercent}%`);
    elements.editorPreviewFrame.style.setProperty("--canvas-fit-background", canvasFit.backgroundColor ?? "transparent");
    elements.editorPreviewFrame.dataset.canvasBackground = canvasFit.backgroundMode;
    elements.editorPreviewImage.style.width = `calc(100% - ${canvasFit.marginPercent * 2}%)`;
    elements.editorPreviewImage.style.height = `calc(100% - ${canvasFit.marginPercent * 2}%)`;
    elements.editorPreviewImage.style.objectFit = "contain";
  } else {
    delete elements.editorPreviewFrame.dataset.canvasBackground;
    elements.editorPreviewImage.style.objectFit = "";
  }
  const perspectiveVisible = !rectificationTask && presentation.state.verticalPerspective !== 0 && renderPerspectivePreview({
    canvas: elements.editorPerspectivePreview,
    image: elements.editorPreviewImage,
    geometry: presentation.geometry,
    filter: presentation.filter,
  });
  const rectificationVisible = showRectifiedResult && renderRectificationPreview({
    canvas: elements.editorRectificationPreview,
    image: elements.editorPreviewImage,
    geometry: presentation.geometry,
    filter: presentation.filter,
    documentScanMode: presentation.documentScan.mode,
  });
  elements.editorPerspectivePreview.hidden = !perspectiveVisible;
  elements.editorRectificationPreview.hidden = !rectificationVisible;
  elements.editorPreviewImage.hidden = perspectiveVisible || rectificationVisible;
  elements.editorRectificationOverlay.hidden = !rectificationTask || showRectifiedResult;
  if (rectificationTask) syncRectificationOverlay(presentation.rectification.quad);
  elements.editorCropBox.hidden = rectificationTask || !presentation.cropEnabled;
  elements.editorCropBox.style.left = `${presentation.cropRect.left}%`;
  elements.editorCropBox.style.top = `${presentation.cropRect.top}%`;
  elements.editorCropBox.style.width = `${presentation.cropRect.width}%`;
  elements.editorCropBox.style.height = `${presentation.cropRect.height}%`;
  elements.editorCropResize.hidden = !presentation.cropResizable;
  elements.editorPreviewFrame.dataset.cropEnabled = String(!rectificationTask && presentation.cropEnabled);
  elements.editorPreviewFrame.dataset.cropAxis = presentation.cropAxis;
  elements.editorPreviewFrame.dataset.cropResizable = String(presentation.cropResizable);
  elements.editorPreviewFrame.tabIndex = !rectificationTask && presentation.cropEnabled ? 0 : -1;
  elements.editorPreviewSummary.textContent = presentation.summary;
  const canvasFitOutput = canvasFit ? canvasFitDimensions(canvasFit) : null;
  elements.editorOutputSize.textContent = canvasFitOutput
    ? `预计实际导出 ${canvasFitOutput.width} × ${canvasFitOutput.height} px`
    : `预计实际导出 ${presentation.output.width} × ${presentation.output.height} px`;
  const sizeLimitPreview = elements.settingsForm.querySelector("[data-size-limit-preview]");
  if (sizeLimitPreview && settings.sizeMode === "custom") {
    sizeLimitPreview.textContent = `按当前裁剪比例，最多 ${presentation.state.resize.width} × ${presentation.state.resize.height} px；预计实际尺寸见左侧`;
  }
  elements.editorCropHint.textContent = canvasFit
    ? `整张图片会居中放入${CANVAS_FIT_RATIOS.find((item) => item.id === canvasFit.ratioId)?.label ?? "目标"}画布，并保留 ${canvasFit.marginPercent}% 四周留白；不会裁切或补画。`
    : rectificationTask
    ? showRectifiedResult
      ? `这里显示按当前四角重采样后的真实结果，并应用“${presentation.documentScan.presentation.label}”。若边缘不齐或效果不合适，可继续调整。`
      : "拖动四个黄色角点贴合目标平面的四个角；选中角点后可用方向键微调，Shift + 方向键可加快。"
    : presentation.cropAxis === "both"
    ? "自由裁剪：拖动亮框移动区域；拖右下角圆点改变大小。右侧滑杆可精确调整。"
    : presentation.cropAxis === "horizontal"
    ? "完整图片保持可见；左右拖动亮框、使用 ← →，或用右侧滑杆调整。"
    : presentation.cropAxis === "vertical"
      ? "完整图片保持可见；上下拖动亮框、使用 ↑ ↓，或用右侧滑杆调整。"
      : presentation.settings.ratio === "original"
        ? "当前显示并保留完整图片；选择固定比例或自由裁剪后，亮框会标出导出区域。"
        : "来源画面已经符合所选比例，不需要调整保留位置。";
  elements.editorDragBadge.hidden = rectificationTask || !presentation.cropEnabled;
  elements.editorDragBadge.textContent = presentation.cropAxis === "both"
    ? "拖动裁剪框 · 右下角缩放"
    : presentation.cropAxis === "horizontal" ? "左右拖动裁剪框" : "上下拖动裁剪框";
  elements.editorPreviewFrame.setAttribute("aria-label", rectificationTask
    ? showRectifiedResult ? "当前四角裁正结果预览" : "完整原图与四个可调整角点"
    : presentation.cropAxis === "both"
    ? "完整图片与自由裁剪框。可用方向键移动裁剪框。"
    : presentation.cropAxis === "horizontal"
    ? "完整图片与裁剪框。当前可左右拖动，或用左右方向键调整保留区域。"
    : presentation.cropAxis === "vertical"
      ? "完整图片与裁剪框。当前可上下拖动，或用上下方向键调整保留区域。"
      : "完整图片预览。当前不裁剪。");
  elements.editorChangeState.textContent = transient
    ? "正在预览 · 完成操作后记入历史"
    : editorWorkspace.history.past.length === 0 ? "设置已同步" : "设置已记入编辑历史";
  ["straighten", "verticalPerspective", "brightness", "contrast", "saturation", "denoise", "clarity", "jpegQuality", "canvasMargin", "cropX", "cropY", "cropLeft", "cropTop", "cropWidth", "cropHeight"].forEach((name) => {
    const output = elements.settingsForm.querySelector(`[data-setting-value="${name}"]`);
    if (output) {
      const value = settings[name] ?? (name === "canvasMargin" ? 8 : name.startsWith("crop") ? 50 : 0);
      const displayValue = name === "jpegQuality" ? Math.round(Number(value) * 100) : value;
      const suffix = name.startsWith("crop") || ["jpegQuality", "canvasMargin"].includes(name) ? "%" : name === "straighten" ? "°" : "";
      const prefix = ["straighten", "verticalPerspective"].includes(name) && Number(value) > 0 ? "+" : "";
      output.value = `${prefix}${displayValue}${suffix}`;
    }
  });
  syncCompressionPresetState(settings);
  syncEnhancementPresetState(settings);
  syncOldPhotoPresetState(settings);
  syncSceneTemplateState(settings);
  syncSocialTitlePreview(settings);
  syncRectificationViewButtons();
  syncDocumentScanModeButtons(presentation.documentScan.mode);
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
  const canvasCustomBackground = elements.settingsForm.querySelector("[data-canvas-custom-background]");
  if (canvasCustomBackground) canvasCustomBackground.hidden = canvasFit?.backgroundMode !== "custom";
  const canvasCustomRatio = elements.settingsForm.querySelector("[data-canvas-custom-ratio]");
  if (canvasCustomRatio) canvasCustomRatio.hidden = canvasFit?.ratioId !== "custom";
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
  renderEditorPreview(["UT-TEMPLATE", "UT-FIT", "UT-UPLOAD"].includes(selectedTask?.id) ? { ...settings, ...editorFormSettings() } : settings);
}

function initializeEditorWorkspace() {
  if (!source) return;
  const specializedInitial = isRectificationTask()
    ? {
        ratio: "original",
        rotation: 0,
        straighten: 0,
        rectificationEnabled: "on",
        documentScanMode: selectedTask?.id === "UT-DOC-ARCHIVE" ? "clean-color" : "original",
        ...quadAsFormSettings(DEFAULT_RECTIFICATION_QUAD),
        sizeMode: selectedTask?.id === "UT-DOC-ARCHIVE" ? "custom" : "preset",
        ...(selectedTask?.id === "UT-DOC-ARCHIVE" ? { outputLongEdge: 1600, compressionTargetKilobytes: 1024 } : {}),
        brightness: 0,
        contrast: 0,
        saturation: 0,
        format: selectedTask?.id === "UT-DOC-ARCHIVE" ? "jpeg" : "png",
      }
    : selectedTask?.id === "UT-PRIVACY-SHARE"
      ? privacyShareEditorSettings({ privacyLongEdge: 1600, privacyTargetKilobytes: 1024, privacyBackground: "#ffffff" })
    : selectedTask?.id === "UT-UPLOAD"
      ? { ratio: "original", sizeMode: "custom", outputLongEdge: 1600, format: "jpeg", jpegQuality: 0.9, jpegBackground: "#ffffff", compressionTargetKilobytes: 1024 }
    : selectedTask?.id === "UT-FIT"
      ? { ratio: "original", sizeMode: "custom", outputLongEdge: Math.min(2048, Math.max(320, source.rawWidth ?? source.width, source.rawHeight ?? source.height)), format: "png", jpegQuality: 0.92, jpegBackground: "#ffffff" }
    : selectedTask?.id === "UT-CONVERT"
      ? formatConversionSettings({
          sourceLongEdge: Math.min(8192, Math.max(1, source.rawWidth ?? source.width, source.rawHeight ?? source.height)),
          format: source.file.type === "image/jpeg" ? "png" : "jpeg",
        })
    : selectedTask?.id === "UT-COMPRESS"
      ? applyCompressionPreset({
          outputLongEdge: Math.min(8192, Math.max(320, source.rawWidth ?? source.width, source.rawHeight ?? source.height)),
        }, "upload-2mb")
      : null;
  editorWorkspace = createEditorWorkspace({
    sourceWidth: source.rawWidth ?? source.width,
    sourceHeight: source.rawHeight ?? source.height,
    sourceOrientation: source.sourceOrientation ?? 1,
  }, {
    initialSettings: specializedInitial ?? scenarioInitialSettings(selectedTask?.id)
      ?? (selectedTask?.id === "UT-ENHANCE"
        ? applyEnhancementPreset({ ratio: "original", sizeMode: "preset", format: "png" }, "natural")
        : null),
  });
  elements.editorWorkspace.hidden = false;
  elements.editorPreviewImage.src = sourceUrl;
  syncEditorForm();
}

function commitEditorForm() {
  if (!editorWorkspace || !isEditorTask()) return false;
  try {
    const settings = editorFormSettings();
    if (selectedTask?.id === "UT-TEMPLATE") normalizeSocialOverlaySettings(settings);
    editorWorkspace = updateEditorWorkspace(editorWorkspace, settings);
    syncEditorForm();
    if (selectedTask?.id === "UT-TEMPLATE") syncSocialTitlePreview(settings);
    return true;
  } catch (error) {
    setEditorValidity(error, { focus: true });
    elements.editorChangeState.textContent = "当前设置需要修正";
    return false;
  }
}

function reconcileCustomSize(changedName) {
  if (!editorWorkspace || !isEditorTask()) return;
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
  if (!editorWorkspace || !isEditorTask() || elements.editorPreviewFrame.dataset.cropEnabled !== "true") return;
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

function writeRectificationQuadToForm(quad) {
  Object.entries(quadAsFormSettings(quad)).forEach(([name, value]) => setControlValue(name, value));
}

function beginRectificationDrag(event) {
  if (!isRectificationTask() || rectificationView !== "adjust" || !editorWorkspace || event.button !== 0) return;
  const handle = event.target.closest?.("[data-rectification-point]");
  if (!handle) return;
  editorRectificationDrag = {
    pointerId: event.pointerId,
    pointName: handle.dataset.rectificationPoint,
    target: handle,
  };
  handle.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveRectificationDrag(event) {
  if (!editorRectificationDrag || editorRectificationDrag.pointerId !== event.pointerId) return;
  const rect = elements.editorPreviewFrame.getBoundingClientRect();
  const current = quadFromFormSettings(editorFormSettings());
  const next = constrainRectificationPoint(current, editorRectificationDrag.pointName, {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  });
  writeRectificationQuadToForm(next);
  syncRectificationOverlay(next);
  elements.editorChangeState.textContent = "正在调整四角 · 松开后记入历史";
}

function finishRectificationDrag(event, { commit = true } = {}) {
  if (!editorRectificationDrag || editorRectificationDrag.pointerId !== event.pointerId) return;
  editorRectificationDrag.target.releasePointerCapture?.(event.pointerId);
  editorRectificationDrag = null;
  if (commit) commitEditorForm();
  else syncEditorForm();
}

function nudgeRectificationHandle(event) {
  if (!isRectificationTask() || rectificationView !== "adjust") return;
  const handle = event.currentTarget;
  if (!QUAD_POINT_NAMES.includes(handle.dataset.rectificationPoint)) return;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  const quad = quadFromFormSettings(editorFormSettings());
  const current = quad[handle.dataset.rectificationPoint];
  const step = (event.shiftKey ? 5 : 1) / 100;
  const next = constrainRectificationPoint(quad, handle.dataset.rectificationPoint, {
    x: current.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
    y: current.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
  });
  writeRectificationQuadToForm(next);
  commitEditorForm();
  handle.focus();
  event.preventDefault();
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
  if (isEditorTask() && editorWorkspace) {
    if (!commitEditorForm()) throw new Error("请先修正编辑设置");
    return normalizeEditorTaskSettings({
      taskId: selectedTask.id,
      editorSettings: editorSettings(editorWorkspace),
      formSettings: editorFormSettings(),
      composedBackground: isComposedBackgroundTask(selectedTask.id),
      remoteConsent: elements.settingsForm.elements.remoteConsent?.checked === true,
    });
  }
  assertTaskConsent({
    taskId: selectedTask?.id,
    remoteConsent: elements.settingsForm.elements.remoteConsent?.checked === true,
    generativeRestoreConsent: elements.settingsForm.elements.generativeRestoreConsent?.checked === true,
  });
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

function creativePrompt(taskId, settings) {
  if (taskId === "CR-RESTORE") return buildOldPhotoRestorationPrompt(settings);
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
  if (selectedTask.id === "UT-COMPRESS" && source.file.size <= compressionTargetBytes(settings.compressionTargetKilobytes)) {
    const message = `原图 ${formatImageBytes(source.file.size)} 已经满足不超过 ${formatImageBytes(compressionTargetBytes(settings.compressionTargetKilobytes))} 的限制，无需降低画质`;
    elements.editorChangeState.textContent = message;
    toast(message);
    return;
  }
  const rectificationPostProcess = isRectificationTask(selectedTask.id)
    ? documentScanMode(settings.documentScanMode)
    : null;
  const usesDocumentEnhancement = rectificationPostProcess?.id !== "original";
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
  const localPlan = isLocalEditorTask(selectedTask.id)
    ? localExecutionPlan({ taskId: selectedTask.id, settings, usesDocumentEnhancement, rectificationPostProcessLabel: rectificationPostProcess?.label ?? "" })
    : null;
  elements.statusTitle.textContent = localPlan
    ? localPlan.title
    : selectedTask.id === "UT-PRODUCT" ? "正在生成商品白底图" : selectedTask.id === "UT-PORTRAIT" ? "正在生成头像" : selectedTask.id === "UT-CUTOUT" ? "正在移除背景" : "正在生成新的图片";
  elements.statusCopy.textContent = localPlan
    ? localPlan.copy
    : selectedTask.id === "UT-PRODUCT" ? "先生成本地商品构图，再发送这份构图进行抠图。" : selectedTask.id === "UT-PORTRAIT" ? "先生成本地头像构图，再发送这份构图进行抠图。" : selectedTask.id === "UT-CUTOUT" ? "正在安全发送当前图片并等待透明结果。" : "正在保留来源事实并应用选定的视觉方法。";

  try {
    let result;
    if (isLocalEditorTask(selectedTask.id)) {
      let processed = localPlan.kind === "privacy-share"
        ? await runPrivacyShare({
            file: source.file,
            settings,
            signal: runController.signal,
            onAttempt: ({ phase, attemptNumber, attemptTotal, resultBytes, targetBytes }) => {
              elements.statusCopy.textContent = phase === "encoding"
                ? `正在生成分享副本第 ${attemptNumber}/${attemptTotal} 档。`
                : `当前结果 ${formatImageBytes(resultBytes)}，目标不超过 ${formatImageBytes(targetBytes)}。`;
            },
          })
        : localPlan.kind === "document-archive"
        ? await runDocumentArchive({
            file: source.file,
            settings,
            signal: runController.signal,
            onAttempt: ({ phase, attemptNumber, resultBytes, targetBytes }) => {
              elements.statusCopy.textContent = phase === "encoding" ? `正在压缩归档附件，第 ${attemptNumber} 档。` : `当前 ${formatImageBytes(resultBytes)}，目标不超过 ${formatImageBytes(targetBytes)}。`;
            },
          })
        : localPlan.kind === "upload-specification"
        ? await runUploadSpecification({
            file: source.file,
            settings,
            signal: runController.signal,
            onAttempt: ({ phase, attemptNumber, attemptTotal, resultBytes, targetBytes }) => {
              elements.statusCopy.textContent = phase === "encoding"
                ? `正在执行上传方案第 ${attemptNumber}/${attemptTotal} 档。`
                : `当前结果 ${formatImageBytes(resultBytes)}，目标不超过 ${formatImageBytes(targetBytes)}。${resultBytes <= targetBytes ? "已经达标，正在完成核对。" : "仍然过大，继续下一档。"}`;
            },
          })
        : localPlan.kind === "compression"
        ? await compressImageToTarget({
            targetKilobytes: settings.compressionTargetKilobytes,
            maxLongEdge: settings.outputLongEdge,
            signal: runController.signal,
            revokeObjectUrl: revokeIfBlob,
            onAttempt: ({ phase, attemptNumber, attemptTotal, resultBytes, targetBytes }) => {
              elements.statusCopy.textContent = phase === "encoding"
                ? `正在尝试第 ${attemptNumber}/${attemptTotal} 档，保持原图比例并生成真实 JPEG。`
                : `第 ${attemptNumber} 档结果为 ${formatImageBytes(resultBytes)}，目标是不超过 ${formatImageBytes(targetBytes)}。${resultBytes <= targetBytes ? "已经达标，正在完成核对。" : "仍然过大，继续下一档。"}`;
            },
            renderAttempt: (step) => runLocalEditor({
              file: source.file,
              settings: { ...settings, ...step },
            }),
          })
        : await runLocalEditor({ file: source.file, settings });
      if (localPlan.composeCanvasFit) processed = await composeCanvasFitResult(processed, settings);
      if (localPlan.composeSocialOverlay) processed = await composeSocialOverlayResult(processed, settings);
      if (runController.signal.aborted || machine.activeRunId !== runId) {
        revokeIfBlob(processed.url);
        return;
      }
      const compression = localPlan.compressionReport
        ? compressionReport({
            sourceBytes: source.file.size,
            resultBytes: processed.byteLength,
            targetBytes: processed.compressionDecision.targetBytes,
          })
        : null;
      const sourceDimensions = localPlan.compressionImpactReport
        ? orientedMediaDimensions(
            source.rawWidth ?? source.width,
            source.rawHeight ?? source.height,
            source.sourceOrientation ?? 1,
          )
        : null;
      const compressionImpact = localPlan.compressionImpactReport
        ? compressionImpactReport({
            sourceWidth: sourceDimensions.width,
            sourceHeight: sourceDimensions.height,
            resultWidth: processed.width,
            resultHeight: processed.height,
            jpegQuality: processed.compressionDecision.selectedQuality,
            sourceBytes: source.file.size,
            resultBytes: processed.byteLength,
          })
        : null;
      const conversionSourceDimensions = localPlan.conversionReport
        ? orientedMediaDimensions(
            source.rawWidth ?? source.width,
            source.rawHeight ?? source.height,
            source.sourceOrientation ?? 1,
          )
        : null;
      const conversion = localPlan.conversionReport
        ? formatConversionReport({
            sourceMime: source.file.type,
            resultMime: processed.mime,
            sourceBytes: source.file.size,
            resultBytes: processed.byteLength,
            sourceWidth: conversionSourceDimensions.width,
            sourceHeight: conversionSourceDimensions.height,
            resultWidth: processed.width,
            resultHeight: processed.height,
            jpegQuality: settings.jpegQuality,
            jpegBackground: settings.jpegBackground,
          })
        : null;
      const uploadCompliance = localPlan.uploadComplianceReport
        ? uploadComplianceReport({
            mime: processed.mime,
            width: processed.width,
            height: processed.height,
            byteLength: processed.byteLength,
            specification: settings,
          })
        : null;
      const privacyShare = localPlan.privacyShareReport
        ? privacyShareReport({
            mime: processed.mime,
            width: processed.width,
            height: processed.height,
            byteLength: processed.byteLength,
            metadataInspection: processed.metadataInspection,
            settings,
          })
        : null;
      if (privacyShare && !privacyShare.passed) {
        revokeIfBlob(processed.url);
        throw new Error("分享副本没有通过 metadata、尺寸或体积检查");
      }
      result = {
        id: createRuntimeId(), url: processed.url, blob: processed.blob, mimeType: processed.mime, extension: processed.extension,
        width: processed.width, height: processed.height, outputHash: processed.outputHash, byteLength: processed.byteLength,
        hasAlpha: processed.hasAlpha,
        compression,
        compressionImpact,
        conversion,
        canvasFit: processed.canvasFit ?? null,
        uploadCompliance,
        privacyShare,
        validationSummary: selectedTask.id === "UT-DOC-ARCHIVE"
          ? `${compression.targetMet ? "已满足" : "未满足"}归档附件要求：四角裁正与“${rectificationPostProcess.label}”已应用，JPEG ${processed.width} × ${processed.height}，${compression.resultLabel} / 上限 ${compression.targetLabel}`
          : selectedTask.id === "UT-PRIVACY-SHARE"
          ? `已核对 JPEG、最长边 ${Math.max(processed.width, processed.height)} / ${settings.privacyLongEdge} px、文件 ${compression.resultLabel} / 上限 ${compression.targetLabel}，并确认当前禁止的私密 metadata 为 0；没有检查画面中可见的人脸、地址、车牌或文字`
          : selectedTask.id === "UT-UPLOAD"
          ? `${compression.targetMet ? "已满足" : "未满足"}上传规格：JPEG、最长边 ${Math.max(processed.width, processed.height)} / ${settings.uploadLongEdge} px、文件 ${compression.resultLabel} / 上限 ${compression.targetLabel}；${settings.uploadContentMode === "whole" ? "完整内容已保留" : "已按允许裁剪的目标比例居中裁切"}`
          : selectedTask.id === "UT-COMPRESS"
          ? compression.targetMet
            ? `已核对 JPEG 文件、尺寸、像素和哈希；${compression.sourceLabel} → ${compression.resultLabel}，${compression.targetSummary}。系统尝试 ${processed.compressionDecision.attemptCount} 档，采用最长边 ${processed.compressionDecision.selectedLongEdge} px、质量 ${Math.round(processed.compressionDecision.selectedQuality * 100)}%。请放大检查文字、人物边缘和细小纹理`
            : `已核对 JPEG 文件、尺寸、像素和哈希；结果为 ${compression.resultLabel}，${compression.targetSummary}。系统已完成 ${processed.compressionDecision.attemptCount} 档尝试且没有伪装成成功；请放宽目标或降低最长边上限`
          : selectedTask.id === "UT-FIT"
            ? `已核对完整适配结果的格式、尺寸、像素、metadata 和哈希；整张图片已居中放入 ${processed.width} × ${processed.height} 画布，未裁切也未放大小图`
          : selectedTask.id === "UT-CONVERT"
            ? `已核对 ${conversion.sourceFormat} → ${conversion.resultFormat} 的文件格式、尺寸、像素、metadata 和哈希；${conversion.transparencySummary} ${conversion.qualitySummary}`
          : selectedTask.id === "UT-RECTIFY"
          ? usesDocumentEnhancement
            ? `已核对四角裁正和“${rectificationPostProcess.label}”文件的格式、尺寸与像素；请确认边缘贴合、文字可读且没有过度拉伸`
            : "已核对四角裁正文件的格式、尺寸与像素；请确认目标平面显示完整、边缘贴合且没有过度拉伸"
          : selectedTask.id === "UT-OLD-PHOTO"
          ? "已核对本地副本的格式、尺寸与像素；请比较褪色和层次变化，严重破损仍会保留"
          : selectedTask.id === "UT-GRID"
            ? "已核对方形总图的格式、尺寸与像素；九张切图会继续逐张重开验证"
          : selectedTask.id === "UT-TEMPLATE" && processed.socialOverlay
            ? "已核对社交图片格式、尺寸、标题安全区与像素；请确认文字没有遮挡主体"
          : "已核对文件格式、尺寸与像素；请比较确认画面内容",
        validationDetails: processed.validationSummary,
        processor: "在本机完成", processorVersion: processed.processor,
        sourceSettings: Object.freeze(selectedTask.id === "UT-COMPRESS"
          ? {
              ...settings,
              outputLongEdge: processed.compressionDecision.selectedLongEdge,
              jpegQuality: processed.compressionDecision.selectedQuality,
            }
          : { ...settings }),
        title: selectedTask.id === "UT-PRIVACY-SHARE" ? "隐私友好分享副本已生成" : selectedTask.id === "UT-DOC-ARCHIVE" ? compression.targetMet ? "文档归档附件已达标" : "文档已生成，但附件上限未达标" : selectedTask.id === "UT-UPLOAD" ? compression.targetMet ? "上传规格全部达标" : "已生成图片，但文件上限未达标" : selectedTask.id === "UT-COMPRESS" ? compression.targetMet ? "图片已压缩并达到目标" : "图片已压缩，但未达到目标" : selectedTask.id === "UT-FIT" ? "完整图片适配完成" : selectedTask.id === "UT-CONVERT" ? `已转换为 ${conversion.resultFormat}` : selectedTask.id === "UT-RECTIFY" ? usesDocumentEnhancement ? "文档增强完成" : "平面裁正完成" : selectedTask.id === "UT-ENHANCE" ? "自然增强完成" : selectedTask.id === "UT-TEMPLATE" ? "社交图片完成" : selectedTask.id === "UT-GRID" ? "九宫格总图已完成" : selectedTask.id === "UT-OLD-PHOTO" ? "老照片基础整理完成" : "本地整理完成",
      };
    } else if (selectedTask.id === "UT-CUTOUT") {
      result = await runBackgroundRemoval({ runId, runController, sourceHashAtStart });
      if (!result) return;
    } else if (isComposedBackgroundTask(selectedTask.id)) {
      const composedInput = await prepareComposedProviderInput(settings);
      if (runController.signal.aborted || machine.activeRunId !== runId) return;
      result = await runBackgroundRemoval({
        runId,
        runController,
        sourceHashAtStart,
        providerInput: composedInput,
      });
      if (!result) return;
      result = decorateComposedBackgroundResult(result, settings, selectedTask.id);
    } else {
      const payload = {
        clientRunId: runId, taskId: selectedTask.id, sourceImage: await dataUrlForFile(source.file), referenceImages: [],
        prompt: creativePrompt(selectedTask.id, settings), quality: settings.quality || "medium", outputFormat: "png", size: "auto",
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
        validationSummary: selectedTask.id === "CR-RESTORE"
          ? "已核对修复副本文件与本次任务；人物面部、文字和历史细节必须与原图逐项比较"
          : "已核对结果文件与本次任务；图片内容仍需要你比较确认",
        processor: "远程创意处理",
        title: selectedTask.id === "CR-RESTORE" ? "老照片修复副本已生成" : "创意生成完成",
      };
    }

    if (machine.activeRunId !== runId) return;
    dispatch(STUDIO_EVENTS.RECEIVE_RUN_RESULT, { ...runToken, result });
    dispatch(STUDIO_EVENTS.RESULT_VALIDATION_SUCCEEDED, {
      ...runToken,
      resultId: result.id,
      qaVersion: isLocalEditorTask(selectedTask.id)
        ? "editor-output-validation-v1"
        : isBackgroundRemovalTask(selectedTask.id) ? "remote-alpha-png-validation-v1" : "creative-response-validation-v1",
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
      unknown ? "网络中断后仍无法确认任务终态。系统不会自动重复提交；你可以显式重试，或稍后按同一任务编号查询。" : friendlyErrorMessage(error),
      true,
      {
        context: unknown
          ? ERROR_CONTEXTS.REMOTE_UNKNOWN
          : taskRuntimeFlags(selectedTask.id).remoteExecution
            ? ERROR_CONTEXTS.REMOTE_FAILED
            : ERROR_CONTEXTS.LOCAL_PROCESSING,
        error,
        runId,
      },
    );
  }
}

function renderResult() {
  if (!currentResult) return;
  const backgroundRemoval = isBackgroundRemovalTask(selectedTask.id);
  const localEditor = isLocalEditorTask(selectedTask.id);
  const presentation = resultPresentation({ taskId: selectedTask.id, result: currentResult, backgroundRemoval, localEditor });
  elements.download.textContent = presentation.downloadLabel;
  elements.portraitSheet.hidden = !presentation.showPortraitSheet;
  elements.resultUseAsSource.hidden = !presentation.allowUseAsSource;
  elements.redo.textContent = presentation.redoLabel;
  elements.maskCorrectionWorkspace.hidden = !presentation.showMaskCorrection;
  elements.resultTitle.textContent = currentResult.title;
  const facts = resultFactsPresentation({ taskId: selectedTask.id, result: currentResult });
  elements.resultSummary.textContent = facts.summary;
  const compressionImpact = currentResult.compressionImpact;
  elements.compressionImpactCard.hidden = !compressionImpact;
  if (compressionImpact) {
    elements.compressionImpactCard.dataset.impactLevel = compressionImpact.level;
    elements.compressionImpactLevel.textContent = compressionImpact.label;
    elements.compressionImpactFile.textContent = `${currentResult.compression.sourceLabel} → ${currentResult.compression.resultLabel}（${currentResult.compression.summary}）`;
    elements.compressionImpactPixels.textContent = `${compressionImpact.sourceDimensions} → ${compressionImpact.resultDimensions}（保留约 ${compressionImpact.pixelRetentionPercent.toFixed(1)}% 像素）`;
    elements.compressionImpactQuality.textContent = `${compressionImpact.qualityPercent}%`;
    elements.compressionImpactCopy.textContent = compressionImpact.explanation;
  }
  const conversion = currentResult.conversion;
  elements.formatConversionCard.hidden = !conversion;
  if (conversion) {
    elements.formatConversionFormats.textContent = `${conversion.sourceFormat} → ${conversion.resultFormat}`;
    elements.formatConversionDimensions.textContent = conversion.dimensionsSummary;
    elements.formatConversionSize.textContent = `${conversion.sourceSize} → ${conversion.resultSize}（${conversion.sizeSummary}）`;
    elements.formatConversionTransparency.textContent = conversion.transparencySummary;
    elements.formatConversionQuality.textContent = conversion.qualitySummary;
  }
  const canvasFit = currentResult.canvasFit;
  elements.canvasFitCard.hidden = !canvasFit;
  if (canvasFit) {
    elements.canvasFitDimensions.textContent = `${canvasFit.width} × ${canvasFit.height}`;
    elements.canvasFitPlacement.textContent = `${canvasFit.drawWidth} × ${canvasFit.drawHeight} · 居中 · 四周 ${canvasFit.marginPercent}%`;
    elements.canvasFitOutput.textContent = `${canvasFit.format === "png" ? "PNG · 透明画布" : `JPEG · ${canvasFit.backgroundColor} 底色`}`;
    elements.canvasFitCopy.textContent = "图片内容完整保留在画布内，没有裁切、拉伸或放大小图；新增区域只是留白或透明，不是 AI 生成的扩展内容。";
  }
  const uploadCompliance = currentResult.uploadCompliance;
  elements.uploadComplianceCard.hidden = !uploadCompliance;
  if (uploadCompliance) {
    elements.uploadComplianceCard.dataset.passed = String(uploadCompliance.passed);
    elements.uploadComplianceState.textContent = uploadCompliance.passed ? "全部达标" : "存在未达标项";
    elements.uploadComplianceList.innerHTML = uploadCompliance.checks.map((check) => `<article role="listitem" data-passed="${check.passed}"><span>${check.passed ? "✓" : "!"}</span><div><strong>${check.label}</strong><small>实际：${check.actual}</small></div></article>`).join("");
  }
  const privacyShare = currentResult.privacyShare;
  elements.privacyShareCard.hidden = !privacyShare;
  if (privacyShare) {
    elements.privacyShareCard.dataset.passed = String(privacyShare.passed);
    elements.privacyShareState.textContent = privacyShare.passed ? "全部通过" : "存在未通过项";
    elements.privacyShareList.innerHTML = privacyShare.checks.map((check) => `<article role="listitem" data-passed="${check.passed}"><span>${check.passed ? "✓" : "!"}</span><div><strong>${check.label}</strong><small>实际：${check.actual}</small></div></article>`).join("");
    elements.privacyShareBoundary.textContent = `${privacyShare.removedMetadata.join(" / ")} 已从输出政策中排除。${privacyShare.boundary}；画面中可见的敏感内容需要你自行检查。`;
  }
  elements.resultSourceImage.src = sourceUrl;
  elements.resultOutputImage.src = currentResult.url;
  elements.resultOutputImage.alt = presentation.outputAlt;
  elements.resultOutputTab.textContent = presentation.outputTab;
  elements.qaCopy.textContent = facts.qaCopy;
  elements.resultSize.textContent = facts.resultSize;
  elements.referenceTitle.textContent = selectedTask.referenceTitle;
  elements.referenceCopy.textContent = selectedTask.referenceCopy;
  elements.referenceMark.style.background = isLocalEditorTask(selectedTask.id) ? "radial-gradient(circle at 35% 35%, #dce978 0 18%, transparent 19%), repeating-radial-gradient(circle, transparent 0 6px, rgba(255,255,255,.25) 7px 8px)" : "radial-gradient(circle at 30% 30%, #d96d3a, transparent 30%), repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,.22) 9px 10px)";
  elements.processingRecordCard.hidden = !isBackgroundRemovalTask(selectedTask.id);
  if (presentation.showMaskCorrection) {
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
  elements.socialOutputSet.hidden = selectedTask.id !== "UT-TEMPLATE";
  elements.oldPhotoOutputSet.hidden = selectedTask.id !== "UT-OLD-PHOTO";
  elements.socialGridOutputSet.hidden = selectedTask.id !== "UT-GRID";
  showOnly("result");
  selectComparisonLayer("result");
  setJourney("result");
  if (isBackgroundRemovalTask(selectedTask.id)) {
    initializeMaskCorrection();
    elements.maskErase.focus();
  } else {
    elements.download.focus();
    if (selectedTask.id === "UT-TEMPLATE") void prepareSocialOutputSet();
    if (selectedTask.id === "UT-GRID") void prepareSocialGridOutputSet();
    if (selectedTask.id === "UT-OLD-PHOTO") void prepareOldPhotoOutputSet();
  }
}

async function useLocalResultAsNewSource() {
  if (!currentResult || !selectedTask || !isLocalEditorTask(selectedTask.id)) return;
  const contract = buildResultDownloadContract({ taskId: selectedTask.id, result: machine.result, currentRunId: machine.activeRunId });
  if (!contract.allowed) {
    toast(contract.message || "当前结果不能作为新的处理来源");
    return;
  }
  const previousLabel = elements.resultUseAsSource.textContent;
  elements.resultUseAsSource.disabled = true;
  elements.resultUseAsSource.textContent = "正在核对结果…";
  try {
    const response = currentResult.blob ? null : await fetch(currentResult.dataUrl);
    if (response && !response.ok) throw new Error("当前结果文件无法读取");
    const blob = currentResult.blob ?? await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const actualHash = await sha256Bytes(bytes);
    if (actualHash !== contract.download.outputHash || bytes.length !== contract.download.byteLength) {
      throw new Error("结果完整性核对未通过，不能进入下一步处理");
    }
    const extension = blob.type === "image/jpeg" ? "jpg" : "png";
    const file = new File([blob], `continued-result.${extension}`, { type: blob.type, lastModified: Date.now() });
    await acceptSource(file);
    toast("已把刚才的结果作为新图片；确认后可选择下一项处理");
  } catch (error) {
    toast(error.message || "当前结果暂时不能继续处理");
    elements.resultUseAsSource.disabled = false;
    elements.resultUseAsSource.textContent = previousLabel;
  }
}

async function dataUrlForBlob(blob) {
  if (!blob || typeof blob.arrayBuffer !== "function") throw new TypeError("图片数据无效");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

async function prepareComposedProviderInput(settings) {
  let prepared = null;
  try {
    prepared = await runLocalEditor({ file: source.file, settings: { ...settings, format: "png" } });
    const bytes = new Uint8Array(await prepared.blob.arrayBuffer());
    return Object.freeze({
      dataUrl: await dataUrlForBlob(prepared.blob),
      sha256: await sha256Bytes(bytes),
      width: prepared.width,
      height: prepared.height,
      geometryRevision: 2,
      defaultBackground: "white",
    });
  } finally {
    if (prepared?.url) revokeIfBlob(prepared.url);
  }
}

function decorateComposedBackgroundResult(result, settings, taskId = selectedTask?.id) {
  const product = taskId === "UT-PRODUCT";
  return {
    ...result,
    portraitRatio: settings.ratio,
    defaultBackground: "white",
    title: result.provider?.environment === "sandbox"
      ? `沙盒${product ? "商品" : "头像"}抠图完成（带水印）`
      : product ? "商品背景已移除" : "头像背景已移除",
    validationSummary: `${result.validationSummary}；当前构图为 ${settings.ratio === "portrait" ? "4:5" : "1:1"}，${product ? "已使用白底起点，请检查商品孔洞、透明材质与边缘" : "请选择底色并检查人物边缘"}`,
  };
}

function showError(title, copy, retryable = true, { context = ERROR_CONTEXTS.LOCAL_PROCESSING, error = null, runId = null } = {}) {
  const unknown = machine.status === STUDIO_STATES.RUN_UNKNOWN;
  const presentation = errorPagePresentation({ context, error, title, message: copy, taskId: selectedTask?.id, runId });
  elements.errorPanel.dataset.errorContext = presentation.context;
  applyErrorPagePresentation({
    title: elements.errorTitle,
    message: elements.errorCopy,
    dataBoundary: elements.errorDataBoundary,
    retrySafety: elements.errorRetrySafety,
    actionHint: elements.errorActionHint,
    runRow: elements.errorRunRow,
    runId: elements.errorRunId,
    technical: elements.errorTechnical,
    technicalCode: elements.errorTechnicalCode,
    technicalTask: elements.errorTechnicalTask,
  }, presentation);
  showOnly("error");
  applyRecoveryPresentation(
    { retry: elements.retry, recover: elements.recover, fallback: elements.fallbackEditor, back: elements.errorBack },
    recoveryPresentation({ unknown, retryable, taskId: selectedTask?.id, context: presentation.context }),
  );
}

function showOutputValidationError(error, fallbackMessage = "下载准备失败，请返回后重新生成。") {
  const normalized = error instanceof Error ? error : new Error(String(error || fallbackMessage));
  if (!normalized.code) normalized.code = "output_validation_failed";
  showError("下载没有完成", normalized.message || fallbackMessage, true, {
    context: ERROR_CONTEXTS.OUTPUT_VALIDATION,
    error: normalized,
    runId: currentResult?.runId ?? machine.activeRunId,
  });
}

function switchToLocalEditor() {
  if (!source || machine.status === STUDIO_STATES.RUN_UNKNOWN) return;
  const localEditor = tasks.find((task) => task.id === "UT-TUNE" && task.runnable);
  if (!localEditor) {
    returnToTaskSelection("本地编辑当前不可用；图片仍保留在任务列表中");
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
  syncRemoteConsent();
  remoteConsent?.focus();
  if (message) toast(message);
}

function returnToOldPhotoRestorationSettings(message) {
  clearResult();
  showOnly("config");
  setJourney("task");
  const consent = elements.settingsForm.elements.generativeRestoreConsent;
  if (consent) consent.checked = false;
  syncGenerativeRestoreConsent();
  consent?.focus();
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
  const isBackgroundRemoval = isBackgroundRemovalTask();
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
      showError("处理状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true, { context: ERROR_CONTEXTS.REMOTE_UNKNOWN, error: finished.error, runId });
      return;
    }
    if (finished.status !== "SUCCEEDED") {
      dispatch(STUDIO_EVENTS.RUN_FAILED, { ...runToken, code: finished.error?.code, message: finished.error?.message });
      showError("原任务没有得到可用结果", friendlyErrorMessage(finished.error), true, { context: ERROR_CONTEXTS.REMOTE_FAILED, error: finished.error, runId });
      return;
    }
    let result;
    if (isBackgroundRemoval) {
      result = createBackgroundRemovalResult(finished, { recovered: true });
      if (isComposedBackgroundTask(selectedTask.id)) {
        const composedInput = await prepareComposedProviderInput(machine.config ?? editorSettings(editorWorkspace));
        result = decorateComposedBackgroundResult({
          ...result,
          correctionSourceUrl: composedInput.dataUrl,
          defaultBackground: "white",
          providerInput: Object.freeze({
            width: composedInput.width,
            height: composedInput.height,
            sha256: composedInput.sha256,
            geometryRevision: composedInput.geometryRevision,
          }),
        }, machine.config ?? editorSettings(editorWorkspace), selectedTask.id);
      }
    } else {
      if (!finished.result?.image) throw new Error("图片服务没有返回图片结果");
      const decoded = await decodeImage(finished.result.image);
      result = {
        id: createRuntimeId(), url: finished.result.image, dataUrl: finished.result.image,
        mimeType: `image/${finished.result.outputFormat === "jpeg" ? "jpeg" : finished.result.outputFormat || "png"}`,
        extension: finished.result.outputFormat === "jpeg" ? "jpg" : finished.result.outputFormat || "png",
        width: decoded.naturalWidth, height: decoded.naturalHeight, outputHash: finished.result.imageSha256,
        byteLength: finished.result.imageBytes, hasAlpha: false,
        validationSummary: selectedTask.id === "CR-RESTORE"
          ? "恢复查询后已核对修复副本与原任务；人物面部、文字和历史细节仍需与原图逐项比较"
          : "恢复查询后已核对结果文件与原任务；图片内容仍需要你比较确认",
        processor: "远程创意处理",
        title: selectedTask.id === "CR-RESTORE" ? "老照片修复副本已生成" : "创意生成完成",
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
    showError("处理状态仍未知", "原任务仍无法确认。系统没有重复提交；你可以稍后继续查询、明确新建任务，或返回任务列表。", true, { context: ERROR_CONTEXTS.REMOTE_UNKNOWN, error, runId });
  }
}

async function checkStatus() {
  if (isPublicLocalOnly()) {
    apiStatus = { available: false, status: "unavailable", candidates: [], previewMode: "public-local-only" };
    backgroundRemovalStatus = { available: false, status: "unavailable", previewMode: "public-local-only" };
    elements.mobilePreviewNotice.hidden = true;
    elements.serviceStatus.dataset.tone = "online";
    elements.serviceStatus.dataset.errorContext = "";
    elements.serviceStatus.title = "图片只在当前浏览器执行本地处理；远程扩展未连接。";
    elements.serviceStatusCopy.textContent = "公开体验 · 本地处理可用";
    return;
  }
  const [creative, cutout] = await Promise.allSettled([
    api.getStatus({ timeoutMs: 5000 }),
    api.getBackgroundRemovalStatus({ timeoutMs: 5000 }),
  ]);
  const status = creative.status === "fulfilled" ? creative.value : null;
  const cutoutStatus = cutout.status === "fulfilled" ? cutout.value : null;
  const mobilePreview = status?.previewMode === "lan" || cutoutStatus?.previewMode === "lan";
  apiStatus = status
    ? { ...status, available: Boolean(status.available), status: status.available ? "available" : "unavailable" }
    : { available: false, status: "error" };
  backgroundRemovalStatus = cutoutStatus
    ? { ...cutoutStatus, status: cutoutStatus.available ? "available" : "unavailable" }
    : { available: false, status: "error" };
  const networkUnavailable = creative.status === "rejected" && cutout.status === "rejected";
  elements.mobilePreviewNotice.hidden = !mobilePreview;
  elements.serviceStatus.dataset.tone = apiStatus.available || backgroundRemovalStatus.available ? "online" : "offline";
  elements.serviceStatus.dataset.errorContext = networkUnavailable ? ERROR_CONTEXTS.NETWORK_UNAVAILABLE : "";
  elements.serviceStatus.title = networkUnavailable
    ? "远程状态暂不可确认；本地工具仍可使用，不会自动提交图片。"
    : "";
  elements.serviceStatusCopy.textContent = mobilePreview
    ? "手机预览 · 仅本地处理"
    : apiStatus.available && backgroundRemovalStatus.available
      ? "实际用途、本地工具、远程抠图与创意生成已连接"
      : backgroundRemovalStatus.available
        ? backgroundRemovalStatus.provider?.environment === "sandbox"
          ? "商品白底图、报名照、社交构图与自由工具可用 · PhotoRoom 沙盒"
          : "商品白底图、报名照、社交构图与自由工具可用"
        : apiStatus.available ? `社交构图、本地工具与创意生成可用 · ${apiStatus.provider?.label ?? status.model}`
          : networkUnavailable ? "远程状态暂不可确认 · 本地工具仍可用"
            : "社交构图与本地工具可用 · 远程场景未连接";
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
elements.resultUseAsSource?.addEventListener("click", useLocalResultAsNewSource);
elements.resultChangeTask?.addEventListener("click", () => returnToTaskSelection("已保留当前图片；请选择新的处理方向"));
elements.fileInput.addEventListener("change", () => { const [file] = elements.fileInput.files; if (file) acceptSource(file); });
elements.useDemo.addEventListener("click", async () => acceptSource(await createDemoImage(elements.canvas)));
elements.useOldPhotoDemo?.addEventListener("click", async () => {
  try {
    await acceptSource(await loadOldPhotoDemoImage());
  } catch (error) {
    showError("老照片演示图没有加载", error?.message || "请稍后重试。", false, { context: ERROR_CONTEXTS.LOCAL_PROCESSING, error });
  }
});
elements.rights.addEventListener("change", () => { elements.confirmSource.disabled = !elements.rights.checked; });
elements.confirmSource.addEventListener("click", confirmAndPrepare);
elements.cancelSource.addEventListener("click", cancelCurrentSource);
elements.technicalCheckAction?.addEventListener("click", openTechnicalAdvice);
elements.backToTasks.addEventListener("click", () => returnToTaskSelection());
elements.settingsForm.addEventListener("click", (event) => {
  const privacySharePreset = event.target.closest?.("[data-privacy-share-preset]");
  if (privacySharePreset) selectPrivacySharePreset(privacySharePreset.dataset.privacySharePreset);
  const uploadPresetButton = event.target.closest?.("[data-upload-preset]");
  if (uploadPresetButton) selectUploadSpecificationPreset(uploadPresetButton.dataset.uploadPreset);
  const compressionPresetButton = event.target.closest?.("[data-compression-preset]");
  if (compressionPresetButton) selectCompressionPreset(compressionPresetButton.dataset.compressionPreset);
  const preset = event.target.closest?.("[data-enhancement-preset]");
  if (preset) selectEnhancementPreset(preset.dataset.enhancementPreset);
  const sceneTemplate = event.target.closest?.("[data-scene-template]");
  if (sceneTemplate) selectSceneTemplate(sceneTemplate.dataset.sceneTemplate);
  const oldPhotoPreset = event.target.closest?.("[data-old-photo-preset]");
  if (oldPhotoPreset) selectOldPhotoPreset(oldPhotoPreset.dataset.oldPhotoPreset);
  const straightenReset = event.target.closest?.("[data-straighten-reset]");
  if (straightenReset && editorWorkspace) {
    setControlValue("straighten", 0);
    if (commitEditorForm()) elements.editorChangeState.textContent = "水平校正已归零并记入编辑历史";
  }
  const perspectiveReset = event.target.closest?.("[data-perspective-reset]");
  if (perspectiveReset && editorWorkspace) {
    setControlValue("verticalPerspective", 0);
    if (commitEditorForm()) elements.editorChangeState.textContent = "垂直透视已归零并记入编辑历史";
  }
  const rectificationViewButton = event.target.closest?.("[data-rectification-view]");
  if (rectificationViewButton && isRectificationTask()) {
    if (!commitEditorForm()) return;
    rectificationView = rectificationViewButton.dataset.rectificationView;
    renderEditorPreview();
    elements.editorChangeState.textContent = rectificationView === "result"
      ? "正在查看真实裁正结果"
      : "正在完整原图上调整四角";
  }
  const documentScanButton = event.target.closest?.("[data-document-scan-mode]");
  if (documentScanButton && isRectificationTask()) {
    setControlValue("documentScanMode", documentScanButton.dataset.documentScanMode);
    rectificationView = "result";
    if (commitEditorForm()) {
      elements.editorChangeState.textContent = `已应用${documentScanMode(documentScanButton.dataset.documentScanMode).label}并记入历史`;
    }
  }
  const rectificationReset = event.target.closest?.("[data-rectification-reset]");
  if (rectificationReset && isRectificationTask()) {
    writeRectificationQuadToForm(DEFAULT_RECTIFICATION_QUAD);
    rectificationView = "adjust";
    if (commitEditorForm()) elements.editorChangeState.textContent = "四角已恢复到完整图片";
  }
});
elements.settingsForm.addEventListener("input", (event) => {
  if (isBackgroundRemovalTask()) syncRemoteConsent();
  if (selectedTask?.id === "CR-RESTORE") syncGenerativeRestoreConsent();
  if (selectedTask?.id === "UT-CUTOUT") return;
  if (!isEditorTask() || !editorWorkspace) return;
  const changedName = event.target?.name;
  if (selectedTask?.id === "UT-PRIVACY-SHARE" && ["privacyLongEdge", "privacyTargetKilobytes", "privacyBackground"].includes(changedName)) {
    const editor = privacyShareEditorSettings(editorFormSettings());
    for (const name of ["outputLongEdge", "compressionTargetKilobytes", "jpegBackground"]) setControlValue(name, editor[name]);
    syncPrivacyShareControls();
  }
  if (selectedTask?.id === "UT-UPLOAD" && ["uploadContentMode", "uploadRatio", "uploadLongEdge", "uploadTargetKilobytes", "uploadBackground"].includes(changedName)) syncUploadSpecificationControls();
  if (selectedTask?.id === "UT-COMPRESS" && changedName === "compressionTargetKilobytes") {
    syncCompressionTargetState();
    syncCompressionPresetState(editorFormSettings());
  }
  if (changedName === "ratio") seedFreeCropFromWorkspace();
  if (["cropLeft", "cropTop", "cropWidth", "cropHeight"].includes(changedName)) reconcileFreeCrop();
  if (["sizeMode", "ratio", "rotation", "outputLongEdge", "cropWidth", "cropHeight"].includes(changedName)) {
    reconcileCustomSize(changedName);
  }
  previewEditorForm();
});
elements.settingsForm.addEventListener("change", (event) => {
  if (isBackgroundRemovalTask()) syncRemoteConsent();
  if (selectedTask?.id === "CR-RESTORE") syncGenerativeRestoreConsent();
  if (selectedTask?.id === "UT-CUTOUT") return;
  if (!isEditorTask()) return;
  const changedName = event.target?.name;
  if (selectedTask?.id === "UT-UPLOAD" && ["uploadContentMode", "uploadRatio", "uploadLongEdge", "uploadTargetKilobytes", "uploadBackground"].includes(changedName)) syncUploadSpecificationControls();
  if (changedName === "ratio") seedFreeCropFromWorkspace();
  if (["cropLeft", "cropTop", "cropWidth", "cropHeight"].includes(changedName)) reconcileFreeCrop();
  if (["sizeMode", "ratio", "rotation", "outputLongEdge", "cropWidth", "cropHeight"].includes(changedName)) {
    reconcileCustomSize(changedName);
  }
  commitEditorForm();
});
elements.settingsForm.addEventListener("submit", (event) => { event.preventDefault(); runSelectedTask(); });
elements.editorPreviewImage.addEventListener("load", () => {
  if (editorWorkspace) renderEditorPreview();
});
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
  if (selectedTask?.id === "UT-TEMPLATE") {
    setControlValue("socialTitle", "");
    setControlValue("socialTitlePosition", "bottom");
    setControlValue("socialTitleAlignment", "left");
    setControlValue("socialTitleTone", "light");
  }
  syncEditorForm();
  toast("编辑设置已重置");
});
elements.editorPreviewFrame.addEventListener("pointerdown", beginCropDrag);
elements.editorPreviewFrame.addEventListener("pointerdown", beginRectificationDrag);
elements.editorPreviewFrame.addEventListener("pointermove", moveCropDrag);
elements.editorPreviewFrame.addEventListener("pointermove", moveRectificationDrag);
elements.editorPreviewFrame.addEventListener("pointerup", (event) => finishCropDrag(event));
elements.editorPreviewFrame.addEventListener("pointerup", (event) => finishRectificationDrag(event));
elements.editorPreviewFrame.addEventListener("pointercancel", (event) => finishCropDrag(event, { commit: false }));
elements.editorPreviewFrame.addEventListener("pointercancel", (event) => finishRectificationDrag(event, { commit: false }));
elements.editorPreviewFrame.addEventListener("keydown", nudgeCropWithKeyboard);
elements.rectificationHandles.forEach((handle) => handle.addEventListener("keydown", nudgeRectificationHandle));
elements.redo.addEventListener("click", () => {
  if (isBackgroundRemovalTask()) {
    returnToCutoutSettings(selectedTask?.id === "UT-PRODUCT" ? "再次制作商品图前，请重新确认本次远程发送" : selectedTask?.id === "UT-PORTRAIT" ? "再次制作头像前，请重新确认本次远程发送" : "再次抠图前，请重新确认本次远程发送");
    return;
  }
  if (selectedTask?.id === "CR-RESTORE") {
    returnToOldPhotoRestorationSettings("再次生成修复副本前，请重新确认本次远程生成");
    return;
  }
  clearResult();
  showOnly("config");
  setJourney("task");
  elements.runButton.focus();
});
elements.retry.addEventListener("click", () => {
  if (elements.errorPanel.dataset.errorContext === ERROR_CONTEXTS.OUTPUT_VALIDATION) {
    if (isBackgroundRemovalTask()) {
      showOnly("result");
      selectComparisonLayer("result");
      setJourney("result");
      elements.download.focus();
    } else {
      clearResult();
      showOnly("config");
      setJourney("task");
      elements.runButton.focus();
    }
    return;
  }
  if (isBackgroundRemovalTask()) {
    returnToCutoutSettings(selectedTask?.id === "UT-PRODUCT" ? "再次制作商品图前，请重新确认本次远程发送" : selectedTask?.id === "UT-PORTRAIT" ? "再次制作头像前，请重新确认本次远程发送" : "再次抠图前，请重新确认本次远程发送");
    return;
  }
  if (selectedTask?.id === "CR-RESTORE") {
    returnToOldPhotoRestorationSettings("重新提交前，请再次确认生成式处理风险");
    return;
  }
  runSelectedTask();
});
elements.recover.addEventListener("click", recoverUnknownRun);
elements.fallbackEditor.addEventListener("click", switchToLocalEditor);
elements.errorBack.addEventListener("click", async () => {
  if (machine.status === STUDIO_STATES.RUN_UNKNOWN) {
    const backgroundRemovalRunId = isBackgroundRemovalTask() ? machine.activeRunId : null;
    stopActiveRequest();
    if (backgroundRemovalRunId) {
      await api.cancelBackgroundRemovalRun(backgroundRemovalRunId, { timeoutMs: 8_000 }).catch(() => null);
    }
    dispatch(STUDIO_EVENTS.CANCEL_WAIT);
  }
  if (source && machine.analysis && tasks.some((task) => task.runnable)) returnToTaskSelection();
  else cancelCurrentSource();
});
elements.cancelWait.addEventListener("click", async () => {
  if ([STUDIO_STATES.SOURCE_VALIDATING, STUDIO_STATES.ANALYZING].includes(machine.status)) {
    stopActiveRequest();
    cancelCurrentSource();
    toast("已取消图片检查");
    return;
  }
  if (![STUDIO_STATES.RUNNING, STUDIO_STATES.RUN_UNKNOWN].includes(machine.status)) return;
  const backgroundRemovalRunId = isBackgroundRemovalTask() ? machine.activeRunId : null;
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
elements.maskCustomBackground.addEventListener("input", () => setMaskCustomBackground(elements.maskCustomBackground.value));
elements.maskZooms.forEach((button) => button.addEventListener("click", () => setMaskZoom(Number(button.dataset.maskZoom))));
elements.productScale.addEventListener("input", () => updateProductComposition({ scale: Number(elements.productScale.value) / 100 }));
elements.productPositionX.addEventListener("input", () => updateProductComposition({ positionX: Number(elements.productPositionX.value) / 100 }));
elements.productPositionY.addEventListener("input", () => updateProductComposition({ positionY: Number(elements.productPositionY.value) / 100 }));
elements.productOutputPreset.addEventListener("change", () => updateProductComposition({ presetId: elements.productOutputPreset.value }));
elements.productShadows.forEach((button) => button.addEventListener("click", () => updateProductComposition({ shadow: button.dataset.productShadow })));
elements.productOutputSelects.forEach((button) => button.addEventListener("click", () => {
  updateProductComposition({ presetId: button.dataset.productOutputSelect });
  elements.productOutputSetStatus.textContent = "已切换主预览；四个交付版本仍共用同一套构图。";
}));
elements.productOutputDownloads.forEach((button) => button.addEventListener("click", async () => {
  if (productOutputBusy) return;
  const original = button.textContent;
  setProductOutputBusy(true);
  button.textContent = "生成中…";
  elements.productOutputSetStatus.textContent = "正在按原始结果重新绘制并检查这个版本…";
  try {
    const output = await downloadProductOutput(button.dataset.productOutputDownload);
    toast(`${output.width} × ${output.height} 商品图下载已开始`);
  } catch (error) {
    elements.productOutputSetStatus.textContent = error.message || "这个商品图版本生成失败。";
    showOutputValidationError(error, elements.productOutputSetStatus.textContent);
  } finally {
    setProductOutputBusy(false);
    button.textContent = original;
  }
}));
elements.productOutputDownloadAll.addEventListener("click", async () => {
  if (productOutputBusy) return;
  const original = elements.productOutputDownloadAll.textContent;
  setProductOutputBusy(true);
  elements.productOutputDownloadAll.textContent = "正在生成 0 / 4…";
  try {
    const observer = new MutationObserver(() => {
      const match = elements.productOutputSetStatus.textContent.match(/第 (\d) \/ 4/u);
      if (match) elements.productOutputDownloadAll.textContent = `正在生成 ${match[1]} / 4…`;
    });
    observer.observe(elements.productOutputSetStatus, { childList: true, characterData: true, subtree: true });
    try {
      await downloadProductOutputSet();
    } finally {
      observer.disconnect();
    }
    toast("四个商品图已打包，ZIP 下载已开始");
  } catch (error) {
    elements.productOutputSetStatus.textContent = error.message || "商品图片套装生成失败。";
    showOutputValidationError(error, elements.productOutputSetStatus.textContent);
  } finally {
    setProductOutputBusy(false);
    elements.productOutputDownloadAll.textContent = original;
  }
});
elements.socialOutputSelects.forEach((button) => button.addEventListener("click", () => {
  if (socialOutputBusy) return;
  try {
    selectSocialOutput(button.dataset.socialOutputSelect);
    elements.socialOutputSetStatus.textContent = "已切换主预览；标题和构图来自同一套本地设置。";
  } catch (error) {
    toast(error.message || "这个社交版本尚未准备好");
  }
}));
elements.socialOutputDownloads.forEach((button) => button.addEventListener("click", async () => {
  if (socialOutputBusy) return;
  const original = button.textContent;
  setSocialOutputBusy(true);
  button.textContent = "检查中…";
  try {
    const output = await downloadSocialOutput(button.dataset.socialOutputDownload);
    toast(`${output.label}下载已开始`);
  } catch (error) {
    elements.socialOutputSetStatus.textContent = error.message || "这个社交版本下载失败。";
    showOutputValidationError(error, elements.socialOutputSetStatus.textContent);
  } finally {
    setSocialOutputBusy(false);
    button.textContent = original;
  }
}));
elements.socialOutputDownloadAll.addEventListener("click", async () => {
  if (socialOutputBusy) return;
  const original = elements.socialOutputDownloadAll.textContent;
  setSocialOutputBusy(true);
  elements.socialOutputDownloadAll.textContent = "正在检查 4 个版本…";
  try {
    await downloadSocialOutputSet();
    toast("四个社交图片已打包，ZIP 下载已开始");
  } catch (error) {
    elements.socialOutputSetStatus.textContent = error.message || "社交图片套装生成失败。";
    showOutputValidationError(error, elements.socialOutputSetStatus.textContent);
  } finally {
    setSocialOutputBusy(false);
    elements.socialOutputDownloadAll.textContent = original;
  }
});
elements.socialGridTiles.forEach((button) => button.addEventListener("click", () => {
  if (socialGridOutputBusy) return;
  try {
    selectSocialGridTile(button.dataset.socialGridTile);
  } catch (error) {
    toast(error.message || "这张九宫格切图尚未准备好");
  }
}));
elements.socialGridShowOverview.addEventListener("click", () => {
  if (socialGridOutputBusy) return;
  showSocialGridOverview();
});
elements.socialGridDownloadSelected.addEventListener("click", async () => {
  if (socialGridOutputBusy || !socialGridOutputSetSession?.selectedId) return;
  const original = elements.socialGridDownloadSelected.textContent;
  setSocialGridOutputBusy(true);
  elements.socialGridDownloadSelected.textContent = "检查中…";
  try {
    const output = await downloadSocialGridOutput(socialGridOutputSetSession.selectedId);
    toast(`第 ${output.number} 张下载已开始`);
  } catch (error) {
    elements.socialGridOutputStatus.textContent = error.message || "这张九宫格切图下载失败。";
    showOutputValidationError(error, elements.socialGridOutputStatus.textContent);
  } finally {
    setSocialGridOutputBusy(false);
    elements.socialGridDownloadSelected.textContent = original;
  }
});
elements.socialGridDownloadAll.addEventListener("click", async () => {
  if (socialGridOutputBusy) return;
  const original = elements.socialGridDownloadAll.textContent;
  setSocialGridOutputBusy(true);
  elements.socialGridDownloadAll.textContent = "正在检查 9 张…";
  try {
    await downloadSocialGridOutputSet();
    toast("九张切图已打包，ZIP 下载已开始");
  } catch (error) {
    elements.socialGridOutputStatus.textContent = error.message || "九宫格切图套装生成失败。";
    showOutputValidationError(error, elements.socialGridOutputStatus.textContent);
  } finally {
    setSocialGridOutputBusy(false);
    elements.socialGridDownloadAll.textContent = original;
  }
});
elements.oldPhotoOutputSelects.forEach((button) => button.addEventListener("click", () => {
  if (oldPhotoOutputBusy) return;
  try {
    const output = selectOldPhotoOutput(button.dataset.oldPhotoOutputSelect);
    elements.oldPhotoOutputSetStatus.textContent = `已切换主预览：${output.label}；裁剪、旋转、尺寸与格式没有变化。`;
  } catch (error) {
    toast(error.message || "这个本地整理版本尚未准备好");
  }
}));
elements.oldPhotoOutputDownloads.forEach((button) => button.addEventListener("click", async () => {
  if (oldPhotoOutputBusy) return;
  const original = button.textContent;
  setOldPhotoOutputBusy(true);
  button.textContent = "检查中…";
  try {
    const output = await downloadOldPhotoOutput(button.dataset.oldPhotoOutputDownload);
    toast(`${output.label}下载已开始`);
  } catch (error) {
    elements.oldPhotoOutputSetStatus.textContent = error.message || "这个本地整理版本下载失败。";
    showOutputValidationError(error, elements.oldPhotoOutputSetStatus.textContent);
  } finally {
    setOldPhotoOutputBusy(false);
    button.textContent = original;
  }
}));
elements.oldPhotoOutputDownloadAll.addEventListener("click", async () => {
  if (oldPhotoOutputBusy) return;
  const original = elements.oldPhotoOutputDownloadAll.textContent;
  setOldPhotoOutputBusy(true);
  elements.oldPhotoOutputDownloadAll.textContent = "正在检查 4 个版本…";
  try {
    await downloadOldPhotoOutputSet();
    toast("四个老照片本地整理版本已打包，ZIP 下载已开始");
  } catch (error) {
    elements.oldPhotoOutputSetStatus.textContent = error.message || "老照片本地整理套装生成失败。";
    showOutputValidationError(error, elements.oldPhotoOutputSetStatus.textContent);
  } finally {
    setOldPhotoOutputBusy(false);
    elements.oldPhotoOutputDownloadAll.textContent = original;
  }
});
elements.portraitOutputSelects.forEach((button) => button.addEventListener("click", () => {
  if (portraitOutputBusy) return;
  try {
    const entry = selectPortraitOutput(button.dataset.portraitOutputSelect);
    toast(`${entry.label}已设为主预览`);
  } catch (error) {
    toast(error.message || "这个报名照版本无法切换");
  }
}));
elements.portraitOutputDownloads.forEach((button) => button.addEventListener("click", async () => {
  if (portraitOutputBusy) return;
  const original = button.textContent;
  setPortraitOutputBusy(true);
  button.textContent = "生成中…";
  elements.portraitOutputSetStatus.textContent = "正在按原始抠图重新绘制并检查这个版本…";
  try {
    const output = await downloadPortraitOutput(button.dataset.portraitOutputDownload);
    toast(`${output.label}下载已开始`);
  } catch (error) {
    elements.portraitOutputSetStatus.textContent = error.message || "这个报名照版本生成失败。";
    showOutputValidationError(error, elements.portraitOutputSetStatus.textContent);
  } finally {
    setPortraitOutputBusy(false);
    button.textContent = original;
  }
}));
elements.portraitOutputDownloadAll.addEventListener("click", async () => {
  if (portraitOutputBusy) return;
  const original = elements.portraitOutputDownloadAll.textContent;
  setPortraitOutputBusy(true);
  elements.portraitOutputDownloadAll.textContent = "正在生成 0 / 6…";
  try {
    const observer = new MutationObserver(() => {
      const match = elements.portraitOutputSetStatus.textContent.match(/第 (\d) \/ 6/u);
      if (match) elements.portraitOutputDownloadAll.textContent = `正在生成 ${match[1]} / 6…`;
    });
    observer.observe(elements.portraitOutputSetStatus, { childList: true, characterData: true, subtree: true });
    try {
      await downloadPortraitOutputSet();
    } finally {
      observer.disconnect();
    }
    toast("六个报名照版本已打包，ZIP 下载已开始");
  } catch (error) {
    elements.portraitOutputSetStatus.textContent = error.message || "报名照套装生成失败。";
    showOutputValidationError(error, elements.portraitOutputSetStatus.textContent);
  } finally {
    setPortraitOutputBusy(false);
    elements.portraitOutputDownloadAll.textContent = original;
  }
});
elements.productCompositionReset.addEventListener("click", () => {
  if (!maskCorrectionSession || selectedTask?.id !== "UT-PRODUCT") return;
  maskCorrectionSession.productComposition = productCompositionDefaultsForResult(currentResult);
  renderMaskCorrection();
  toast("已恢复商品交付默认布局");
});
elements.portraitOutputPreset.addEventListener("change", () => updatePortraitComposition({ presetId: elements.portraitOutputPreset.value }));
elements.portraitScale.addEventListener("input", () => updatePortraitComposition({ scale: Number(elements.portraitScale.value) / 100 }));
elements.portraitPositionY.addEventListener("input", () => updatePortraitComposition({ positionY: Number(elements.portraitPositionY.value) / 100 }));
elements.portraitCompositionReset.addEventListener("click", () => {
  if (!maskCorrectionSession || selectedTask?.id !== "UT-PORTRAIT") return;
  maskCorrectionSession.portraitComposition = portraitCompositionDefaultsForResult(currentResult);
  renderMaskCorrection();
  toast("已恢复报名照交付默认构图");
});
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
  if (!currentResult || !isBackgroundRemovalTask() || currentResult.localRecordDeleted) return;
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
  if (selectedTask?.id === "UT-PRODUCT" && productOutputBusy) return;
  if (selectedTask?.id === "UT-PORTRAIT" && portraitOutputBusy) return;
  if (selectedTask?.id === "UT-GRID" && socialGridOutputSetSession?.status === "ready" && socialGridOutputSetSession.selectedId) {
    if (socialGridOutputBusy) return;
    const previousLabel = elements.download.textContent;
    setSocialGridOutputBusy(true);
    elements.download.textContent = "正在检查选中单图…";
    try {
      const output = await downloadSocialGridOutput(socialGridOutputSetSession.selectedId);
      toast(`第 ${output.number} 张下载已开始`);
    } catch (error) {
      showOutputValidationError(error, "当前九宫格切图下载失败");
    } finally {
      setSocialGridOutputBusy(false);
      elements.download.textContent = previousLabel;
    }
    return;
  }
  if (selectedTask?.id === "UT-TEMPLATE" && socialOutputSetSession?.status === "ready") {
    if (socialOutputBusy) return;
    const previousLabel = elements.download.textContent;
    setSocialOutputBusy(true);
    elements.download.textContent = "正在检查当前预览…";
    try {
      const output = await downloadSocialOutput(socialOutputSetSession.selectedId);
      toast(`${output.label}下载已开始`);
    } catch (error) {
      showOutputValidationError(error, "当前社交图片下载失败");
    } finally {
      setSocialOutputBusy(false);
      elements.download.textContent = previousLabel;
    }
    return;
  }
  if (selectedTask?.id === "UT-OLD-PHOTO" && oldPhotoOutputSetSession?.status === "ready" && oldPhotoOutputSetSession.selectedId) {
    if (oldPhotoOutputBusy) return;
    const previousLabel = elements.download.textContent;
    setOldPhotoOutputBusy(true);
    elements.download.textContent = "正在检查当前整理…";
    try {
      const output = await downloadOldPhotoOutput(oldPhotoOutputSetSession.selectedId);
      toast(`${output.label}下载已开始`);
    } catch (error) {
      showOutputValidationError(error, "当前老照片本地整理下载失败");
    } finally {
      setOldPhotoOutputBusy(false);
      elements.download.textContent = previousLabel;
    }
    return;
  }
  const contractTaskId = isComposedBackgroundTask(selectedTask.id) ? "UT-CUTOUT" : selectedTask.id;
  const contract = buildResultDownloadContract({ taskId: contractTaskId, result: machine.result, currentRunId: machine.activeRunId });
  if (!contract.allowed) {
    const error = new Error(contract.message || "当前结果不可下载");
    error.code = contract.code || "download_contract_denied";
    showOutputValidationError(error);
    return;
  }
  if (isBackgroundRemovalTask(selectedTask.id)
    && maskCorrectionSession
    && (isComposedBackgroundTask(selectedTask.id) || maskCorrectionSession.history.index > 0 || maskCorrectionSession.background !== "checker")) {
    const previousLabel = elements.download.textContent;
    if (selectedTask.id === "UT-PRODUCT") setProductOutputBusy(true);
    else if (selectedTask.id === "UT-PORTRAIT") setPortraitOutputBusy(true);
    else elements.download.disabled = true;
    elements.download.textContent = "正在生成下载图片…";
    try {
      const corrected = await exportMaskCorrection();
      if (!corrected) throw new Error("当前没有需要重新生成的下载图片");
      const url = URL.createObjectURL(corrected.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      if (isComposedBackgroundTask(selectedTask.id)) {
        const finalContract = buildResultDownloadContract({
          taskId: selectedTask.id,
          currentRunId: machine.activeRunId,
          result: {
            ...machine.result,
            mimeType: corrected.mime,
            hasAlpha: corrected.mime === "image/png",
            outputHash: corrected.outputHash,
            byteLength: corrected.byteLength,
            backgroundColor: corrected.backgroundColor,
          },
        });
        if (!finalContract.allowed) throw new Error(finalContract.message || `${selectedTask.id === "UT-PRODUCT" ? "商品图" : "头像"}下载契约未通过`);
        anchor.download = finalContract.download.filename;
      } else {
        const suffix = corrected.mime === "image/png"
          ? "-corrected.png"
          : `-${corrected.background}-background.jpg`;
        anchor.download = contract.download.filename.replace(/\.png$/i, suffix);
      }
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      const outputLabel = selectedTask.id === "UT-PRODUCT"
        ? "商品白底 JPEG"
        : selectedTask.id === "UT-PORTRAIT" ? "底色头像 JPEG"
        : corrected.mime === "image/png" ? "修正透明 PNG" : "纯色背景 JPEG";
      elements.maskCorrectionStatus.textContent = `${outputLabel} 已准备并检查 · ${corrected.width} × ${corrected.height}`;
      toast(`${outputLabel} 下载已开始`);
    } catch (error) {
      showOutputValidationError(error, "下载图片生成失败");
    } finally {
      if (selectedTask.id === "UT-PRODUCT") setProductOutputBusy(false);
      else if (selectedTask.id === "UT-PORTRAIT") setPortraitOutputBusy(false);
      else elements.download.disabled = false;
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
    showOutputValidationError(error, "下载准备失败，请稍后重试");
  } finally {
    elements.download.disabled = false;
    elements.download.textContent = previousLabel;
  }
});

elements.portraitSheet.addEventListener("click", async () => {
  if (!currentResult || selectedTask?.id !== "UT-PORTRAIT" || !maskCorrectionSession) return;
  const previousLabel = elements.portraitSheet.textContent;
  elements.portraitSheet.disabled = true;
  elements.portraitSheet.textContent = "正在生成六张排版图…";
  try {
    const portrait = await exportMaskCorrection();
    if (!portrait || portrait.mime !== "image/jpeg") throw new Error("请先选择白色、黑色或自定义底色");
    const portraitUrl = URL.createObjectURL(portrait.blob);
    try {
      const image = await decodeImage(portraitUrl);
      const sheet = await renderPortraitSheet({ image });
      const sheetUrl = URL.createObjectURL(sheet.blob);
      const anchor = document.createElement("a");
      anchor.href = sheetUrl;
      anchor.download = `portrait-six-up-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(sheetUrl), 0);
      elements.maskCorrectionStatus.textContent = `六张头像排版图已准备并检查 · ${sheet.width} × ${sheet.height}`;
      toast("六张头像排版图下载已开始");
    } finally {
      URL.revokeObjectURL(portraitUrl);
    }
  } catch (error) {
    toast(error.message || "头像排版图生成失败");
  } finally {
    elements.portraitSheet.disabled = false;
    elements.portraitSheet.textContent = previousLabel;
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
  if (layer === "result" && selectedTask?.id === "UT-TEMPLATE" && socialOutputSetSession?.status === "ready") {
    const selected = socialOutputById(socialOutputSetSession.selectedId);
    if (selected) return { width: selected.width, height: selected.height };
  }
  if (layer === "result" && selectedTask?.id === "UT-GRID" && socialGridOutputSetSession?.status === "ready") {
    const selected = socialGridOutputById(socialGridOutputSetSession.selectedId);
    if (selected) return { width: selected.width, height: selected.height };
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

async function runBackgroundRemoval({
  runId,
  runController,
  sourceHashAtStart,
  providerInput = null,
}) {
  const payload = {
    clientRunId: runId,
    sourceRevision: machine.sourceRevision,
    geometryRevision: providerInput?.geometryRevision ?? 1,
    sourceImage: providerInput?.dataUrl ?? await dataUrlForFile(source.file),
    sourceSha256: providerInput?.sha256 ?? source.hash,
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
  return {
    ...createBackgroundRemovalResult(finished),
    correctionSourceUrl: providerInput?.dataUrl ?? null,
    defaultBackground: providerInput?.defaultBackground ?? "checker",
    providerInput: providerInput ? Object.freeze({
      width: providerInput.width,
      height: providerInput.height,
      sha256: providerInput.sha256,
      geometryRevision: providerInput.geometryRevision,
    }) : null,
  };
}

function syncComparisonStage(layer = selectedComparisonLayer) {
  if (!currentResult || elements.resultSection.hidden) return;
  const sectionWidth = elements.resultSection.clientWidth || elements.main.clientWidth || window.innerWidth - 32;
  const sideBySideTools = window.matchMedia("(min-width: 981px)").matches
    && elements.resultSection.classList.contains("has-mask-tools")
    && !elements.maskCorrectionWorkspace.hidden;
  const toolWidth = sideBySideTools
    ? elements.maskCorrectionWorkspace.getBoundingClientRect().width + 24
    : 0;
  const availableWidth = Math.max(1, sectionWidth - toolWidth);
  const mobile = window.matchMedia("(max-width: 620px)").matches;
  const dimensions = layer === "split"
    ? (mobile ? { width: 9, height: 10 } : { width: 16, height: 9 })
    : comparisonLayerDimensions(layer);
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
  if (!currentResult) return;
  let layerState;
  try {
    layerState = comparisonLayerState(layer);
  } catch {
    return;
  }
  selectedComparisonLayer = layer;
  let selectedTab = null;
  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.layer === layer;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) selectedTab = tab;
  });
  elements.resultStage.classList.toggle("is-split", layerState.split);
  elements.resultSourcePanel.hidden = !layerState.showSource;
  elements.resultOutputPanel.hidden = !layerState.showResult;
  elements.referenceExplainer.hidden = !layerState.showReference;
  const showMaskTools = isBackgroundRemovalTask() && layerState.resultInteractive;
  elements.resultSection.classList.toggle("has-mask-tools", showMaskTools);
  elements.maskCorrectionWorkspace.hidden = !showMaskTools;
  if (!layerState.resultInteractive) {
    elements.maskBrushCursor.hidden = true;
    elements.resultOutputPanel.classList.remove("is-mask-zoomed");
    if (maskCorrectionSession) {
      elements.maskCorrectionCanvas.tabIndex = -1;
      elements.maskCorrectionCanvas.classList.add("is-mask-readonly");
    }
  }
  const dimensions = layer === "split" ? comparisonLayerDimensions("result") : comparisonLayerDimensions(layer);
  const selectedGridOutput = selectedTask?.id === "UT-GRID" && socialGridOutputSetSession?.selectedId
    ? socialGridOutputById(socialGridOutputSetSession.selectedId)
    : null;
  elements.resultSize.textContent = comparisonSizePresentation({
    layer,
    taskId: selectedTask?.id,
    result: currentResult,
    sourceDimensions: comparisonLayerDimensions("source"),
    resultDimensions: dimensions,
    socialGridNumber: selectedGridOutput?.number ?? null,
  });
  syncComparisonStage(layer);
  if (layer === "result") {
    if (maskCorrectionSession) renderMaskCorrection();
    applyMaskZoom();
  }
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
window.addEventListener("beforeunload", () => {
  stopActiveRequest();
  clearEditorWorkspace();
  revokeIfBlob(sourceUrl);
  revokeIfBlob(currentResult?.url);
  for (const output of socialOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
  for (const output of oldPhotoOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
  for (const output of socialGridOutputSetSession?.outputs?.values?.() ?? []) revokeIfBlob(output.url);
});

showOnly("empty");
setJourney("source");
checkStatus();
