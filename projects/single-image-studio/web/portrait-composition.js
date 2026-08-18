import { productCompositionPlacement } from "./product-composition.js";

export const PORTRAIT_OUTPUT_PRESETS = Object.freeze([
  Object.freeze({ id: "square-600", label: "通用方形", detail: "600 × 600 px", width: 600, height: 600 }),
  Object.freeze({ id: "portrait-480x600", label: "通用竖版", detail: "480 × 600 px", width: 480, height: 600 }),
  Object.freeze({ id: "current", label: "保留当前像素", detail: "沿用抠图工作尺寸", width: null, height: null }),
]);

export const PORTRAIT_BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({ id: "white", label: "白色", hex: "#FFFFFF", rgb: Object.freeze([255, 255, 255]) }),
  Object.freeze({ id: "blue", label: "蓝色", hex: "#5B9BD5", rgb: Object.freeze([91, 155, 213]) }),
  Object.freeze({ id: "warm-red", label: "暖红", hex: "#D85C5C", rgb: Object.freeze([216, 92, 92]) }),
]);

export const PORTRAIT_COMPOSITION_DEFAULTS = Object.freeze({
  presetId: "square-600",
  scale: 0.78,
  positionY: 0.34,
});

const PRESETS_BY_ID = new Map(PORTRAIT_OUTPUT_PRESETS.map((preset) => [preset.id, preset]));

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label}必须是正整数`);
  return value;
}

export function normalizePortraitCompositionSettings(settings = {}) {
  const presetId = settings.presetId ?? PORTRAIT_COMPOSITION_DEFAULTS.presetId;
  if (!PRESETS_BY_ID.has(presetId)) throw new TypeError("未知的报名照像素模板");
  const scale = Number(settings.scale ?? PORTRAIT_COMPOSITION_DEFAULTS.scale);
  if (!Number.isFinite(scale) || scale < 0.65 || scale > 1) throw new RangeError("人物大小必须在 65%–100% 之间");
  const positionY = Number(settings.positionY ?? PORTRAIT_COMPOSITION_DEFAULTS.positionY);
  if (!Number.isFinite(positionY) || positionY < 0 || positionY > 1) throw new RangeError("人物上下位置必须在 0–1 之间");
  return Object.freeze({ presetId, scale, positionY });
}

export function portraitCompositionDimensions(settings, sourceWidth, sourceHeight) {
  positiveInteger(sourceWidth, "报名照来源宽度");
  positiveInteger(sourceHeight, "报名照来源高度");
  const normalized = normalizePortraitCompositionSettings(settings);
  const preset = PRESETS_BY_ID.get(normalized.presetId);
  return Object.freeze({
    width: preset.width ?? sourceWidth,
    height: preset.height ?? sourceHeight,
    preset,
    settings: normalized,
  });
}

export function portraitOutputSetEntries(settings = PORTRAIT_COMPOSITION_DEFAULTS) {
  const shared = normalizePortraitCompositionSettings(settings);
  const sizes = PORTRAIT_OUTPUT_PRESETS.filter((preset) => preset.width !== null && preset.height !== null);
  return Object.freeze(sizes.flatMap((preset) => PORTRAIT_BACKGROUND_PRESETS.map((background) => {
    const itemSettings = normalizePortraitCompositionSettings({ ...shared, presetId: preset.id });
    return Object.freeze({
      id: `${preset.id}-${background.id}`,
      label: `${preset.label} · ${background.label}`,
      detail: `${preset.width} × ${preset.height} px · ${background.label}背景`,
      width: preset.width,
      height: preset.height,
      settings: itemSettings,
      background,
      filenameSuffix: `${preset.id}-${background.id}`,
    });
  })));
}

export function drawPortraitComposition({
  context,
  foreground,
  sourceWidth,
  sourceHeight,
  sourceBounds,
  settings,
  backgroundRgb = null,
} = {}) {
  if (!context || typeof context.drawImage !== "function" || typeof context.clearRect !== "function") {
    throw new TypeError("报名照需要可用的 Canvas 2D context");
  }
  if (!foreground) throw new TypeError("报名照缺少透明人物前景");
  if (backgroundRgb !== null && (!Array.isArray(backgroundRgb) || backgroundRgb.length !== 3
    || backgroundRgb.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255))) {
    throw new TypeError("报名照背景必须是 RGB 三通道或透明");
  }
  const dimensions = portraitCompositionDimensions(settings, sourceWidth, sourceHeight);
  const placement = productCompositionPlacement(
    dimensions.width,
    dimensions.height,
    {
      scale: dimensions.settings.scale,
      positionX: 0.5,
      positionY: dimensions.settings.positionY,
      shadow: "none",
    },
    sourceBounds,
    { width: sourceWidth, height: sourceHeight },
  );
  context.save();
  context.clearRect(0, 0, dimensions.width, dimensions.height);
  if (backgroundRgb) {
    context.fillStyle = `rgb(${backgroundRgb.join(", ")})`;
    context.fillRect(0, 0, dimensions.width, dimensions.height);
  }
  context.drawImage(
    foreground,
    placement.source.x,
    placement.source.y,
    placement.source.width,
    placement.source.height,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  );
  context.restore();
  return Object.freeze({ ...dimensions, placement });
}
