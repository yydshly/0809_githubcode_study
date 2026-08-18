const SHADOWS = new Set(["none", "soft"]);

export const PRODUCT_OUTPUT_PRESETS = Object.freeze([
  Object.freeze({ id: "square-1200", label: "通用方形", detail: "1200 × 1200 px", width: 1200, height: 1200 }),
  Object.freeze({ id: "portrait-1200x1500", label: "通用竖版", detail: "1200 × 1500 px", width: 1200, height: 1500 }),
  Object.freeze({ id: "landscape-1200x900", label: "通用横版", detail: "1200 × 900 px", width: 1200, height: 900 }),
  Object.freeze({ id: "current", label: "保留当前像素", detail: "沿用抠图工作尺寸", width: null, height: null }),
]);

const PRESETS_BY_ID = new Map(PRODUCT_OUTPUT_PRESETS.map((preset) => [preset.id, preset]));

export const PRODUCT_COMPOSITION_DEFAULTS = Object.freeze({
  presetId: "square-1200",
  scale: 0.86,
  positionX: 0.5,
  positionY: 0.5,
  shadow: "none",
});

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label}必须是正整数`);
  return value;
}

function unitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${label}必须在 0–1 之间`);
  return value;
}

function rgbaPixels(value, width, height) {
  if (!(value instanceof Uint8Array || value instanceof Uint8ClampedArray)) {
    throw new TypeError("商品主体边界需要 RGBA 像素数组");
  }
  if (value.length !== width * height * 4) throw new RangeError("RGBA 像素数量与商品图尺寸不一致");
  return value;
}

function normalizeSourceBounds(sourceBounds, width, height) {
  const bounds = sourceBounds ?? { x: 0, y: 0, width, height };
  for (const key of ["x", "y", "width", "height"]) {
    if (!Number.isInteger(bounds[key])) throw new TypeError(`商品主体边界 ${key} 必须是整数`);
  }
  if (bounds.x < 0 || bounds.y < 0 || bounds.width < 1 || bounds.height < 1
    || bounds.x + bounds.width > width || bounds.y + bounds.height > height) {
    throw new RangeError("商品主体边界必须位于源图范围内");
  }
  return Object.freeze({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
}

export function alphaBoundsFromRgba({ pixels, width, height, threshold = 1 } = {}) {
  positiveInteger(width, "商品图宽度");
  positiveInteger(height, "商品图高度");
  rgbaPixels(pixels, width, height);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new RangeError("Alpha 主体阈值必须是 1–255 的整数");
  }
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  return Object.freeze({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 });
}

export function normalizeProductCompositionSettings(settings = {}) {
  const presetId = settings.presetId ?? PRODUCT_COMPOSITION_DEFAULTS.presetId;
  if (!PRESETS_BY_ID.has(presetId)) throw new TypeError("未知的商品图像素模板");
  const scale = Number(settings.scale ?? PRODUCT_COMPOSITION_DEFAULTS.scale);
  if (!Number.isFinite(scale) || scale < 0.65 || scale > 1) {
    throw new RangeError("商品大小必须在 65%–100% 之间");
  }
  const shadow = settings.shadow ?? PRODUCT_COMPOSITION_DEFAULTS.shadow;
  if (!SHADOWS.has(shadow)) throw new TypeError("商品阴影必须是关闭或柔和阴影");
  return Object.freeze({
    presetId,
    scale,
    positionX: unitInterval(Number(settings.positionX ?? PRODUCT_COMPOSITION_DEFAULTS.positionX), "商品水平位置"),
    positionY: unitInterval(Number(settings.positionY ?? PRODUCT_COMPOSITION_DEFAULTS.positionY), "商品垂直位置"),
    shadow,
  });
}

export function productCompositionDimensions(settings, sourceWidth, sourceHeight) {
  positiveInteger(sourceWidth, "商品来源宽度");
  positiveInteger(sourceHeight, "商品来源高度");
  const normalized = normalizeProductCompositionSettings(settings);
  const preset = PRESETS_BY_ID.get(normalized.presetId);
  return Object.freeze({
    width: preset.width ?? sourceWidth,
    height: preset.height ?? sourceHeight,
    preset,
    settings: normalized,
  });
}

export function productOutputSetEntries(settings, sourceWidth, sourceHeight) {
  const shared = normalizeProductCompositionSettings(settings);
  return Object.freeze(PRODUCT_OUTPUT_PRESETS.map((preset) => {
    const itemSettings = normalizeProductCompositionSettings({ ...shared, presetId: preset.id });
    const dimensions = productCompositionDimensions(itemSettings, sourceWidth, sourceHeight);
    return Object.freeze({
      id: preset.id,
      label: preset.label,
      detail: `${dimensions.width} × ${dimensions.height} px`,
      width: dimensions.width,
      height: dimensions.height,
      settings: itemSettings,
      filenameSuffix: preset.id,
    });
  }));
}

export function productCompositionPlacement(width, height, settings = PRODUCT_COMPOSITION_DEFAULTS, sourceBounds, sourceSize) {
  positiveInteger(width, "商品图宽度");
  positiveInteger(height, "商品图高度");
  const normalized = normalizeProductCompositionSettings(settings);
  const sourceWidth = sourceSize?.width ?? width;
  const sourceHeight = sourceSize?.height ?? height;
  positiveInteger(sourceWidth, "商品来源宽度");
  positiveInteger(sourceHeight, "商品来源高度");
  const source = normalizeSourceBounds(sourceBounds, sourceWidth, sourceHeight);
  const fitScale = Math.min(width / source.width, height / source.height) * normalized.scale;
  const drawWidth = Math.max(1, Math.round(source.width * fitScale));
  const drawHeight = Math.max(1, Math.round(source.height * fitScale));
  return Object.freeze({
    x: Math.round((width - drawWidth) * normalized.positionX),
    y: Math.round((height - drawHeight) * normalized.positionY),
    width: drawWidth,
    height: drawHeight,
    source,
    settings: normalized,
  });
}

export function drawProductComposition({ context, foreground, width, height, sourceWidth = width, sourceHeight = height, settings, sourceBounds } = {}) {
  if (!context || typeof context.drawImage !== "function" || typeof context.fillRect !== "function") {
    throw new TypeError("商品图需要可用的 Canvas 2D context");
  }
  if (!foreground) throw new TypeError("商品图缺少透明前景");
  const placement = productCompositionPlacement(width, height, settings, sourceBounds, { width: sourceWidth, height: sourceHeight });
  const drawArguments = [
    foreground,
    placement.source.x,
    placement.source.y,
    placement.source.width,
    placement.source.height,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  ];
  context.save();
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, width, height);
  if (placement.settings.shadow === "soft") {
    context.save();
    context.shadowColor = "rgba(22, 28, 25, 0.24)";
    context.shadowBlur = Math.max(5, Math.round(Math.min(width, height) * 0.018));
    context.shadowOffsetX = 0;
    context.shadowOffsetY = Math.max(3, Math.round(height * 0.014));
    context.globalAlpha = 0.72;
    context.drawImage(...drawArguments);
    context.restore();
  }
  context.drawImage(...drawArguments);
  context.restore();
  return placement;
}
