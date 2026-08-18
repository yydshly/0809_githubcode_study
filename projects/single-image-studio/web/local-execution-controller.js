import { compressionTargetBytes, formatImageBytes } from "./image-compression.js";

const SPECIAL_EXECUTION = Object.freeze({
  "UT-PRIVACY-SHARE": "privacy-share",
  "UT-DOC-ARCHIVE": "document-archive",
  "UT-UPLOAD": "upload-specification",
  "UT-COMPRESS": "compression",
});

export function localExecutionPlan({ taskId, settings = {}, usesDocumentEnhancement = false, rectificationPostProcessLabel = "" } = {}) {
  const kind = SPECIAL_EXECUTION[taskId] ?? "local-editor";
  let title = "正在本地处理";
  let copy = "只做确定性的构图、编码与整体色调处理。";

  if (taskId === "UT-PRIVACY-SHARE") {
    title = "正在生成隐私友好分享副本";
    copy = "正在保持完整画面、生成 JPEG、限制体积，并核对禁止 metadata；不会扫描画面内容。";
  } else if (taskId === "UT-DOC-ARCHIVE") {
    title = "正在生成文档归档附件";
    copy = "正在依次完成四角裁正、文档效果、JPEG、附件压缩和最终核对。";
  } else if (taskId === "UT-UPLOAD") {
    title = "正在执行上传规格适配";
    copy = "正在按确认的顺序完成构图、尺寸、JPEG、压缩和最终规格核对。";
  } else if (taskId === "UT-COMPRESS") {
    title = "正在生成压缩文件";
    copy = `正在按原图比例尝试生成不超过 ${formatImageBytes(compressionTargetBytes(settings.compressionTargetKilobytes))} 的 JPEG；优先保留清晰度，必要时逐级降低质量和最长边。`;
  } else if (taskId === "UT-FIT") {
    title = "正在生成完整适配画布";
    copy = "正在把整张图片按比例居中放入目标画布；不会裁切或生成画面外内容。";
  } else if (taskId === "UT-CONVERT") {
    title = "正在转换图片格式";
    copy = `正在本机生成 ${settings.format === "jpeg" ? "JPEG" : "PNG"}，并核对真实格式、尺寸、像素和 metadata。`;
  } else if (taskId === "UT-RECTIFY") {
    title = usesDocumentEnhancement ? "正在生成文档增强结果" : "正在生成四角裁正结果";
    copy = usesDocumentEnhancement
      ? `正在按四角重采样，并应用“${rectificationPostProcessLabel}”。`
      : "正在按四角重采样目标平面，并保持原始颜色。";
  } else if (taskId === "UT-ENHANCE") {
    title = "正在生成自然增强结果";
    copy = "正在本机应用可见光色参数，并执行轻度降噪与清晰度处理。";
  } else if (taskId === "UT-TEMPLATE") {
    title = "正在生成场景模板结果";
    copy = "正在本机应用所选构图比例和尺寸上限。";
  } else if (taskId === "UT-GRID") {
    title = "正在生成九宫格方形总图";
    copy = "先在本机生成你确认的方形总图，再拆分为九张独立图片。";
  } else if (taskId === "UT-OLD-PHOTO") {
    title = "正在生成老照片基础整理副本";
    copy = "正在本机应用所选光色、轻度降噪、清晰度与构图；不会补画缺失内容。";
  }

  return Object.freeze({
    kind,
    title,
    copy,
    composeCanvasFit: taskId === "UT-FIT",
    composeSocialOverlay: taskId === "UT-TEMPLATE",
    compressionReport: ["UT-PRIVACY-SHARE", "UT-COMPRESS", "UT-UPLOAD", "UT-DOC-ARCHIVE"].includes(taskId),
    compressionImpactReport: taskId === "UT-COMPRESS",
    conversionReport: taskId === "UT-CONVERT",
    uploadComplianceReport: taskId === "UT-UPLOAD",
    privacyShareReport: taskId === "UT-PRIVACY-SHARE",
  });
}
