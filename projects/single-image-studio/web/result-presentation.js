function localRedoLabel(taskId) {
  return ({
    "UT-PRIVACY-SHARE": "调整分享设置",
    "UT-UPLOAD": "调整上传要求",
    "UT-COMPRESS": "调整压缩设置",
    "UT-FIT": "调整画布设置",
    "UT-CONVERT": "调整转换设置",
    "UT-ENHANCE": "调整增强效果",
    "UT-TEMPLATE": "调整场景模板",
    "UT-GRID": "调整九宫格总图",
    "UT-OLD-PHOTO": "调整基础修复",
  })[taskId] ?? "继续调整";
}

function localOutputAlt(taskId) {
  return ({
    "UT-PRIVACY-SHARE": "完整显示的隐私友好分享副本",
    "UT-UPLOAD": "完整显示的上传规格结果",
    "UT-COMPRESS": "完整显示的压缩结果",
    "UT-FIT": "完整显示的留白适配结果",
    "UT-CONVERT": "完整显示的格式转换结果",
    "UT-ENHANCE": "完整显示的自然增强结果",
    "UT-TEMPLATE": "完整显示的场景模板结果",
    "UT-GRID": "完整显示的九宫格方形总图",
    "UT-OLD-PHOTO": "完整显示的老照片基础整理副本",
  })[taskId] ?? "完整显示的编辑结果";
}

function localOutputTab(taskId) {
  return ({
    "UT-PRIVACY-SHARE": "分享副本",
    "UT-UPLOAD": "上传结果",
    "UT-COMPRESS": "压缩结果",
    "UT-FIT": "适配结果",
    "UT-CONVERT": "转换结果",
    "UT-ENHANCE": "增强结果",
    "UT-TEMPLATE": "模板结果",
    "UT-GRID": "九宫格总图",
    "UT-OLD-PHOTO": "基础修复",
  })[taskId] ?? "编辑结果";
}

export function resultPresentation({ taskId, result, backgroundRemoval = false, localEditor = false } = {}) {
  if (typeof taskId !== "string" || !taskId) throw new TypeError("结果呈现缺少任务编号");
  if (!result || typeof result !== "object") throw new TypeError("结果呈现缺少结果事实");

  const downloadLabel = taskId === "UT-PRIVACY-SHARE" ? "下载分享副本"
    : taskId === "UT-DOC-ARCHIVE" ? "下载文档附件"
    : taskId === "UT-UPLOAD" ? "下载上传图"
      : taskId === "UT-COMPRESS" ? "下载压缩图"
        : taskId === "UT-FIT" ? "下载适配图"
          : taskId === "UT-CONVERT" ? `下载 ${result.conversion.resultFormat}`
            : taskId === "UT-PRODUCT" ? "下载商品白底图"
              : taskId === "UT-PORTRAIT" ? "下载底色头像"
                : taskId === "UT-CUTOUT" ? "下载透明 PNG"
                  : taskId === "UT-TEMPLATE" ? "下载当前预览"
                    : taskId === "UT-GRID" ? "下载方形总图"
                      : taskId === "UT-OLD-PHOTO" ? "下载基础整理"
                        : taskId === "CR-RESTORE" ? "下载修复副本"
                          : "下载结果";

  const redoLabel = backgroundRemoval
    ? taskId === "UT-PRODUCT" ? "重新制作商品图" : taskId === "UT-PORTRAIT" ? "重新制作头像" : "重新抠图"
    : localEditor
      ? localRedoLabel(taskId)
      : taskId === "CR-RESTORE" ? "重新设置修复" : "重新处理";

  const outputAlt = backgroundRemoval
    ? taskId === "UT-PRODUCT" ? "完整显示的商品白底图结果" : taskId === "UT-PORTRAIT" ? "完整显示的头像抠图结果" : "完整显示的抠图结果"
    : localEditor
      ? localOutputAlt(taskId)
      : taskId === "CR-RESTORE" ? "完整显示的老照片修复副本" : "完整显示的处理结果";

  const outputTab = backgroundRemoval
    ? taskId === "UT-PRODUCT" ? "商品结果" : taskId === "UT-PORTRAIT" ? "头像结果" : "抠图结果"
    : localEditor
      ? localOutputTab(taskId)
      : taskId === "CR-RESTORE" ? "修复副本" : "处理结果";

  return Object.freeze({
    downloadLabel,
    redoLabel,
    outputAlt,
    outputTab,
    showPortraitSheet: taskId === "UT-PORTRAIT",
    showMaskCorrection: backgroundRemoval,
    allowUseAsSource: localEditor,
  });
}

export function resultFactsPresentation({ taskId, result } = {}) {
  if (typeof taskId !== "string" || !taskId) throw new TypeError("结果事实缺少任务编号");
  if (!result || typeof result !== "object") throw new TypeError("结果事实缺少结果对象");

  const summary = result.compression
    ? `${result.taskTitle} · 目标 ${result.compression.targetLabel} · ${result.compression.sourceLabel} → ${result.compression.resultLabel} · ${result.compression.targetSummary} · ${result.compression.summary}`
    : result.conversion
      ? `${result.taskTitle} · ${result.conversion.sourceFormat} → ${result.conversion.resultFormat} · ${result.conversion.sourceSize} → ${result.conversion.resultSize} · ${result.conversion.sizeSummary}`
      : `${result.taskTitle} · ${result.processor}`;

  const qaCopy = `${result.validationSummary ?? ""}${taskId === "UT-PORTRAIT"
    ? " 六张排版图是 1800 × 1200 通用布局，不代表任何机构的官方证件规格。"
    : ""}`;

  const resultSize = result.compression
    ? `${result.width} × ${result.height} · ${result.compression.resultLabel}`
    : result.width && result.height
      ? `${result.width} × ${result.height}`
      : result.mimeType;

  return Object.freeze({ summary, qaCopy, resultSize });
}

function resultLayerLabel(taskId, socialGridNumber) {
  if (taskId === "UT-GRID") return socialGridNumber ? `第 ${socialGridNumber} 张切图` : "九宫格总图";
  return ({
    "UT-PRIVACY-SHARE": "分享副本",
    "UT-PRODUCT": "商品结果",
    "UT-PORTRAIT": "头像结果",
    "UT-CUTOUT": "抠图结果",
    "UT-COMPRESS": "压缩结果",
    "UT-FIT": "适配结果",
    "UT-CONVERT": "转换结果",
    "UT-ENHANCE": "增强结果",
    "UT-TEMPLATE": "社交图片结果",
    "UT-OLD-PHOTO": "基础修复副本",
    "UT-TUNE": "编辑结果",
  })[taskId] ?? "处理结果";
}

function dimensionsText(dimensions) {
  return `${dimensions.width} × ${dimensions.height}`;
}

export function comparisonSizePresentation({
  layer,
  taskId,
  result,
  sourceDimensions,
  resultDimensions,
  socialGridNumber = null,
} = {}) {
  if (!new Set(["source", "result", "reference", "split"]).has(layer)) throw new RangeError("比较视图类型无效");
  if (!result || typeof result !== "object") throw new TypeError("比较视图缺少结果事实");

  if (layer === "source") {
    const source = `完整原图 ${dimensionsText(sourceDimensions)}`;
    return result.compression ? `${source} · ${result.compression.sourceLabel}` : source;
  }
  if (layer === "reference") return "处理说明";
  if (layer === "split") {
    if (result.compression) {
      return `并排对比 · 目标 ${result.compression.targetLabel} · ${result.compression.sourceLabel} → ${result.compression.resultLabel} · ${result.compression.targetMet ? "已达标" : "未达标"}`;
    }
    return `并排对比 · 原图 ${dimensionsText(sourceDimensions)} · 结果 ${dimensionsText(resultDimensions)}`;
  }
  if (!(result.width && result.height)) return result.mimeType;
  const suffix = result.compression
    ? ` · ${result.compression.resultLabel}`
    : result.conversion ? ` · ${result.conversion.resultSize}` : "";
  return `${resultLayerLabel(taskId, socialGridNumber)} ${dimensionsText(resultDimensions)}${suffix}`;
}
