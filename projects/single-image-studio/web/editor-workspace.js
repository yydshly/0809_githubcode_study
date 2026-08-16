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

function ratioFromState(state) {
  if (state.resize.width === null && state.resize.height === null) return "original";
  if (state.resize.width === 1600 && state.resize.height === 1600) return "square";
  if (state.resize.width === 1536 && state.resize.height === 1920) return "portrait";
  if (state.resize.width === 1920 && state.resize.height === 1280) return "landscape";
  throw new Error("编辑状态不属于当前产品预设比例");
}

export function createEditorWorkspace(source) {
  const frozenSource = sourceContract(source);
  const initial = editStateFromSettings({
    ...frozenSource,
    settings: { ratio: "original", format: "png" },
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
  const state = workspace.history.present;
  return Object.freeze({
    ratio: ratioFromState(state),
    rotation: state.rotation,
    flipHorizontal: state.flipHorizontal,
    flipVertical: state.flipVertical,
    brightness: state.adjustments.brightness,
    contrast: state.adjustments.contrast,
    saturation: state.adjustments.saturation,
    format: state.output.format,
    jpegBackground: state.output.jpegBackground,
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
  const rotationScale = state.rotation === 90 || state.rotation === 270
    ? Math.max(aspect, 1 / aspect)
    : 1;
  const flipX = state.flipHorizontal ? -rotationScale : rotationScale;
  const flipY = state.flipVertical ? -rotationScale : rotationScale;
  const ratio = ratioFromState(state);
  const ratioLabel = { original: "原比例", square: "1:1", portrait: "4:5", landscape: "3:2" }[ratio];
  return Object.freeze({
    state,
    aspectRatio: `${plan.output.width} / ${plan.output.height}`,
    aspectValue: aspect,
    transform: `rotate(${state.rotation}deg) scale(${flipX}, ${flipY})`,
    filter: plan.filter,
    background: state.output.format === "jpeg" ? state.output.jpegBackground : null,
    format: state.output.format,
    summary: `${ratioLabel} · ${state.rotation}° · 亮度 ${signed(state.adjustments.brightness)} · 对比度 ${signed(state.adjustments.contrast)} · 饱和度 ${signed(state.adjustments.saturation)} · ${state.output.format.toUpperCase()}`,
    output: plan.output,
  });
}
