export const CANVAS_FIT_RATIOS = Object.freeze([
  Object.freeze({ id: "original", label: "保持原图比例", ratio: null, defaultLongEdge: 1600 }),
  Object.freeze({ id: "square", label: "方形 1:1", ratio: 1, defaultLongEdge: 1600 }),
  Object.freeze({ id: "portrait", label: "竖版 4:5", ratio: 4 / 5, defaultLongEdge: 1600 }),
  Object.freeze({ id: "wide", label: "横版 16:9", ratio: 16 / 9, defaultLongEdge: 1920 }),
  Object.freeze({ id: "custom", label: "自定义比例", ratio: null, defaultLongEdge: 1600 }),
]);

const RATIO_BY_ID = new Map(CANVAS_FIT_RATIOS.map((item) => [item.id, item]));

function integer(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${label}必须是 ${minimum}–${maximum} 的整数`);
  }
  return number;
}

function color(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) throw new RangeError("画布底色无效");
  return normalized;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 100) throw new RangeError(`${label}必须大于 0 且不超过 100`);
  return number;
}

export function normalizeCanvasFitSettings(settings = {}) {
  const ratioId = String(settings.canvasRatio ?? settings.ratioId ?? "square");
  const ratio = RATIO_BY_ID.get(ratioId);
  if (!ratio) throw new RangeError("不支持的画布比例");
  const sourceRatio = positiveNumber(settings.canvasSourceRatio ?? settings.sourceRatio ?? 1, "原图比例");
  const customWidth = positiveNumber(settings.canvasCustomWidth ?? settings.customWidth ?? 1, "自定义比例宽度");
  const customHeight = positiveNumber(settings.canvasCustomHeight ?? settings.customHeight ?? 1, "自定义比例高度");
  const resolvedRatio = ratioId === "original" ? sourceRatio : ratioId === "custom" ? customWidth / customHeight : ratio.ratio;
  const backgroundMode = String(settings.canvasBackground ?? settings.backgroundMode ?? "white");
  if (!["white", "black", "custom", "transparent"].includes(backgroundMode)) throw new RangeError("不支持的画布底色");
  const backgroundColor = backgroundMode === "white" ? "#FFFFFF" : backgroundMode === "black" ? "#000000" : backgroundMode === "transparent" ? null : color(settings.canvasCustomBackground ?? settings.backgroundColor ?? "#F2EFE7");
  return Object.freeze({
    ratioId,
    ratio: resolvedRatio,
    sourceRatio,
    customWidth,
    customHeight,
    outputLongEdge: integer(settings.canvasLongEdge ?? settings.outputLongEdge ?? ratio.defaultLongEdge, 320, 2048, "输出最长边"),
    marginPercent: integer(settings.canvasMargin ?? settings.marginPercent ?? 8, 0, 25, "四周留白"),
    backgroundMode,
    backgroundColor,
    format: backgroundMode === "transparent" ? "png" : "jpeg",
  });
}

export function canvasFitDimensions(settings = {}) {
  const normalized = normalizeCanvasFitSettings(settings);
  return normalized.ratio >= 1
    ? Object.freeze({ width: normalized.outputLongEdge, height: Math.max(1, Math.round(normalized.outputLongEdge / normalized.ratio)) })
    : Object.freeze({ width: Math.max(1, Math.round(normalized.outputLongEdge * normalized.ratio)), height: normalized.outputLongEdge });
}

export function applyCanvasFitToEditorSettings(editorSettings = {}, formSettings = {}) {
  const normalized = normalizeCanvasFitSettings(formSettings);
  return Object.freeze({
    ...editorSettings,
    ratio: "original",
    sizeMode: "custom",
    outputLongEdge: normalized.outputLongEdge,
    format: "png",
    canvasRatio: normalized.ratioId,
    canvasLongEdge: normalized.outputLongEdge,
    canvasMargin: normalized.marginPercent,
    canvasBackground: normalized.backgroundMode,
    canvasCustomBackground: normalized.backgroundColor ?? "#000000",
    canvasSourceRatio: normalized.sourceRatio,
    canvasCustomWidth: normalized.customWidth,
    canvasCustomHeight: normalized.customHeight,
  });
}

export function canvasFitLayout({ sourceWidth, sourceHeight, settings = {} }) {
  const width = integer(sourceWidth, 1, 8192, "来源宽度");
  const height = integer(sourceHeight, 1, 8192, "来源高度");
  const normalized = normalizeCanvasFitSettings(settings);
  const output = canvasFitDimensions(normalized);
  const margin = Math.round(Math.min(output.width, output.height) * normalized.marginPercent / 100);
  const availableWidth = Math.max(1, output.width - margin * 2);
  const availableHeight = Math.max(1, output.height - margin * 2);
  const scale = Math.min(availableWidth / width, availableHeight / height, 1);
  const drawWidth = Math.max(1, Math.round(width * scale));
  const drawHeight = Math.max(1, Math.round(height * scale));
  return Object.freeze({
    ...normalized,
    ...output,
    margin,
    drawWidth,
    drawHeight,
    x: Math.round((output.width - drawWidth) / 2),
    y: Math.round((output.height - drawHeight) / 2),
    sourceUpscaled: false,
  });
}

export function drawCanvasFit({ context, image, sourceWidth, sourceHeight, settings = {} }) {
  if (!context || typeof context.drawImage !== "function") throw new TypeError("画布上下文无效");
  const layout = canvasFitLayout({ sourceWidth, sourceHeight, settings });
  context.clearRect(0, 0, layout.width, layout.height);
  if (layout.backgroundColor) {
    context.fillStyle = layout.backgroundColor;
    context.fillRect(0, 0, layout.width, layout.height);
  }
  context.drawImage(image, layout.x, layout.y, layout.drawWidth, layout.drawHeight);
  return layout;
}
