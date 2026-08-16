import {
  applyEdit,
  createEditHistory,
  redoEdit,
  undoEdit,
} from "./edit-state.js";
import { buildRenderPlan } from "./editor-renderer.js";
import { editStateFromSettings } from "./editor-session.js";

function sourceContract({ sourceWidth, sourceHeight, sourceOrientation = 1 }) {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new TypeError("编辑工作区需要有效来源尺寸");
  }
  if (!Number.isInteger(sourceOrientation) || sourceOrientation < 1 || sourceOrientation > 8) {
    throw new RangeError("编辑工作区 orientation 必须为 1–8");
  }
  return Object.freeze({ sourceWidth, sourceHeight, sourceOrientation });
}

function workspaceWithHistory(workspace, history) {
  return Object.freeze({ source: workspace.source, initial: workspace.initial, history });
}

const RATIO_PRESETS = Object.freeze({
  original: Object.freeze({ width: null, height: null, label: "原比例" }),
  square: Object.freeze({ width: 1600, height: 1600, label: "1:1" }),
  portrait: Object.freeze({ width: 1536, height: 1920, label: "4:5" }),
  landscape: Object.freeze({ width: 1920, height: 1280, label: "3:2" }),
  free: Object.freeze({ width: null, height: null, label: "自由裁剪" }),
});

function transformedDimensions(source, rotation) {
  const oriented = source.sourceOrientation >= 5
    ? { width: source.sourceHeight, height: source.sourceWidth }
    : { width: source.sourceWidth, height: source.sourceHeight };
  return rotation === 90 || rotation === 270
    ? { width: oriented.height, height: oriented.width }
    : oriented;
}

function near(left, right, tolerance = 0.000001) {
  return Math.abs(left - right) <= tolerance;
}

function ratioFromState(state, source) {
  if (Object.hasOwn(RATIO_PRESETS, state.cropMode)) return state.cropMode;
  for (const ratio of ["square", "portrait", "landscape"]) {
    const preset = RATIO_PRESETS[ratio];
    if (state.resize.width === preset.width && state.resize.height === preset.height) return ratio;
  }
  if (near(state.crop.width, 1) && near(state.crop.height, 1)) return "original";
  const transformed = transformedDimensions(source, state.rotation);
  const cropAspect = transformed.width * state.crop.width / (transformed.height * state.crop.height);
  if (near(cropAspect, 1)) return "square";
  if (near(cropAspect, 4 / 5)) return "portrait";
  if (near(cropAspect, 3 / 2)) return "landscape";
  throw new Error("编辑状态不属于当前产品预设比例");
}

function cropPosition(offset, size) {
  if (near(size, 1)) return 50;
  return Math.round(offset / (1 - size) * 100);
}

function settingsFromState(state, source) {
  const ratio = ratioFromState(state, source);
  const isPreset = state.resize.mode === "preset";
  return Object.freeze({
    ratio,
    cropX: cropPosition(state.crop.x, state.crop.width),
    cropY: cropPosition(state.crop.y, state.crop.height),
    cropLeft: Math.round(state.crop.x * 100),
    cropTop: Math.round(state.crop.y * 100),
    cropWidth: Math.round(state.crop.width * 100),
    cropHeight: Math.round(state.crop.height * 100),
    rotation: state.rotation,
    flipHorizontal: state.flipHorizontal,
    flipVertical: state.flipVertical,
    brightness: state.adjustments.brightness,
    contrast: state.adjustments.contrast,
    saturation: state.adjustments.saturation,
    sizeMode: isPreset ? "preset" : "custom",
    outputLongEdge: isPreset ? null : Math.max(state.resize.width, state.resize.height),
    outputWidth: isPreset ? null : state.resize.width,
    outputHeight: isPreset ? null : state.resize.height,
    format: state.output.format,
    jpegBackground: state.output.jpegBackground,
  });
}

export function createEditorWorkspace(source, { initialSettings = null } = {}) {
  const frozenSource = sourceContract(source);
  const initial = editStateFromSettings({
    ...frozenSource,
    settings: initialSettings ?? { ratio: "original", format: "png" },
  });
  return Object.freeze({
    source: frozenSource,
    initial,
    history: createEditHistory(initial),
  });
}

export function updateEditorWorkspace(workspace, settings) {
  const next = editStateFromSettings({ ...workspace.source, settings });
  return workspaceWithHistory(workspace, applyEdit(workspace.history, { type: "reset", overrides: next }));
}

export function undoEditorWorkspace(workspace) {
  return workspaceWithHistory(workspace, undoEdit(workspace.history));
}

export function redoEditorWorkspace(workspace) {
  return workspaceWithHistory(workspace, redoEdit(workspace.history));
}

export function resetEditorWorkspace(workspace) {
  return workspaceWithHistory(
    workspace,
    applyEdit(workspace.history, { type: "reset", overrides: workspace.initial }),
  );
}

export function editorSettings(workspace) {
  return settingsFromState(workspace.history.present, workspace.source);
}

function activeCropAxis(crop, cropMode) {
  if (cropMode === "free") return "both";
  if (!near(crop.width, 1)) return "horizontal";
  if (!near(crop.height, 1)) return "vertical";
  return "none";
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function moveEditorCrop(settings, { deltaX = 0, deltaY = 0, frameWidth, frameHeight, axis = "both" }) {
  if (!Number.isFinite(frameWidth) || frameWidth <= 0 || !Number.isFinite(frameHeight) || frameHeight <= 0) {
    throw new TypeError("裁切拖动需要有效预览尺寸");
  }
  if (![deltaX, deltaY].every(Number.isFinite)) throw new TypeError("裁切拖动距离必须是有限数值");
  if (!["both", "horizontal", "vertical", "none"].includes(axis)) throw new RangeError("不支持的裁切拖动方向");
  return Object.freeze({
    ...settings,
    cropX: ["both", "horizontal"].includes(axis)
      ? clampPercent(Number(settings.cropX ?? 50) - deltaX / frameWidth * 100)
      : Number(settings.cropX ?? 50),
    cropY: ["both", "vertical"].includes(axis)
      ? clampPercent(Number(settings.cropY ?? 50) - deltaY / frameHeight * 100)
      : Number(settings.cropY ?? 50),
  });
}

const FREE_CROP_MIN_PERCENT = 10;

function boundedPercent(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function moveEditorFreeCrop(settings, {
  deltaX = 0,
  deltaY = 0,
  frameWidth,
  frameHeight,
  operation = "move",
}) {
  if (!Number.isFinite(frameWidth) || frameWidth <= 0 || !Number.isFinite(frameHeight) || frameHeight <= 0) {
    throw new TypeError("自由裁剪拖动需要有效预览尺寸");
  }
  if (![deltaX, deltaY].every(Number.isFinite)) throw new TypeError("自由裁剪拖动距离必须是有限数值");
  if (!["move", "resize"].includes(operation)) throw new RangeError("不支持的自由裁剪操作");
  const start = {
    left: Number(settings.cropLeft ?? 0),
    top: Number(settings.cropTop ?? 0),
    width: Number(settings.cropWidth ?? 100),
    height: Number(settings.cropHeight ?? 100),
  };
  if (!Object.values(start).every(Number.isFinite)) throw new TypeError("自由裁剪设置必须是有限数值");
  if (operation === "resize") {
    return Object.freeze({
      ...settings,
      cropWidth: boundedPercent(start.width + deltaX / frameWidth * 100, FREE_CROP_MIN_PERCENT, 100 - start.left),
      cropHeight: boundedPercent(start.height + deltaY / frameHeight * 100, FREE_CROP_MIN_PERCENT, 100 - start.top),
    });
  }
  return Object.freeze({
    ...settings,
    cropLeft: boundedPercent(start.left + deltaX / frameWidth * 100, 0, 100 - start.width),
    cropTop: boundedPercent(start.top + deltaY / frameHeight * 100, 0, 100 - start.height),
  });
}

function signed(value) {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

export function editorPreviewPresentation(workspace, transientSettings = null) {
  const state = transientSettings
    ? editStateFromSettings({ ...workspace.source, settings: transientSettings })
    : workspace.history.present;
  const plan = buildRenderPlan({
    sourceWidth: workspace.source.sourceWidth,
    sourceHeight: workspace.source.sourceHeight,
    sourceOrientation: workspace.source.sourceOrientation,
    editState: state,
  });
  const aspect = plan.output.width / plan.output.height;
  const frameAspect = plan.transformed.width / plan.transformed.height;
  const normalizedSettings = settingsFromState(state, workspace.source);
  const ratio = normalizedSettings.ratio;
  const ratioLabel = RATIO_PRESETS[ratio].label;
  const cropAxis = activeCropAxis(state.crop, state.cropMode);
  const cropEnabled = cropAxis !== "none";
  const cropLabel = cropAxis === "both"
    ? `自由裁剪 ${normalizedSettings.cropWidth}% × ${normalizedSettings.cropHeight}%`
    : cropAxis === "horizontal"
    ? `左右保留位置 ${normalizedSettings.cropX}%`
    : cropAxis === "vertical"
      ? `上下保留位置 ${normalizedSettings.cropY}%`
      : ratio === "original" ? "完整画面" : "比例已匹配，无需移动";
  const quarterTurn = state.rotation === 90 || state.rotation === 270;
  return Object.freeze({
    state,
    aspectRatio: `${plan.transformed.width} / ${plan.transformed.height}`,
    aspectValue: aspect,
    frameAspectValue: frameAspect,
    previewWidth: quarterTurn ? `${100 / frameAspect}%` : "100%",
    previewHeight: quarterTurn ? `${100 * frameAspect}%` : "100%",
    transform: `translate(-50%, -50%) scale(${state.flipHorizontal ? -1 : 1}, ${state.flipVertical ? -1 : 1}) rotate(${state.rotation}deg)`,
    objectPosition: "50% 50%",
    cropRect: Object.freeze({
      left: state.crop.x * 100,
      top: state.crop.y * 100,
      width: state.crop.width * 100,
      height: state.crop.height * 100,
    }),
    filter: plan.filter,
    background: state.output.format === "jpeg" ? state.output.jpegBackground : null,
    format: state.output.format,
    cropEnabled,
    cropResizable: state.cropMode === "free",
    cropAxis,
    cropLabel,
    settings: normalizedSettings,
    summary: `${ratioLabel} · ${cropLabel} · ${plan.output.width} × ${plan.output.height} · ${state.rotation}° · 亮度 ${signed(state.adjustments.brightness)} · 对比度 ${signed(state.adjustments.contrast)} · 饱和度 ${signed(state.adjustments.saturation)} · ${state.output.format.toUpperCase()}`,
    output: plan.output,
  });
}
