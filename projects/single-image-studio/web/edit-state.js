const EDIT_STATE_VERSION = "edit-state.v1";
const DEFAULT_HISTORY_LIMIT = 100;
const HARD_MAX_EDGE = 8192;
const HARD_MAX_PIXELS = 16_000_000;

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} 必须是有限数值`);
  return value;
}

function integerInRange(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} 必须是 ${minimum}–${maximum} 的整数`);
  }
  return value;
}

function normalizedCrop(crop) {
  const next = {
    x: finiteNumber(crop?.x, "裁切 x"),
    y: finiteNumber(crop?.y, "裁切 y"),
    width: finiteNumber(crop?.width, "裁切宽度"),
    height: finiteNumber(crop?.height, "裁切高度"),
  };
  if (next.x < 0 || next.y < 0 || next.width <= 0 || next.height <= 0
    || next.x + next.width > 1 || next.y + next.height > 1) {
    throw new RangeError("裁切区域必须完整位于归一化画布内");
  }
  return next;
}

function optionalDimension(value, label) {
  if (value === null || value === undefined || value === "") return null;
  return integerInRange(Number(value), 1, HARD_MAX_EDGE, label);
}

function outputFormat(value) {
  if (!new Set(["png", "jpeg"]).has(value)) throw new RangeError("输出格式必须是 png 或 jpeg");
  return value;
}

function hexColor(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/iu.test(value)) {
    throw new TypeError("JPEG 背景色必须是 #RRGGBB");
  }
  return value.toLowerCase();
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function createEditState(overrides = {}) {
  const crop = normalizedCrop(overrides.crop ?? { x: 0, y: 0, width: 1, height: 1 });
  const state = {
    version: EDIT_STATE_VERSION,
    rotation: overrides.rotation ?? 0,
    flipHorizontal: overrides.flipHorizontal ?? false,
    flipVertical: overrides.flipVertical ?? false,
    cropMode: overrides.cropMode ?? (crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1 ? "original" : "free"),
    crop,
    resize: {
      width: optionalDimension(overrides.resize?.width, "目标宽度"),
      height: optionalDimension(overrides.resize?.height, "目标高度"),
      mode: overrides.resize?.mode ?? "preset",
      allowUpscale: overrides.resize?.allowUpscale ?? false,
      maxEdge: integerInRange(overrides.resize?.maxEdge ?? 2048, 1, HARD_MAX_EDGE, "输出长边"),
      maxPixels: integerInRange(overrides.resize?.maxPixels ?? HARD_MAX_PIXELS, 1, HARD_MAX_PIXELS, "输出像素数"),
    },
    adjustments: {
      brightness: integerInRange(overrides.adjustments?.brightness ?? 0, -100, 100, "亮度"),
      contrast: integerInRange(overrides.adjustments?.contrast ?? 0, -100, 100, "对比度"),
      saturation: integerInRange(overrides.adjustments?.saturation ?? 0, -100, 100, "饱和度"),
    },
    output: {
      format: outputFormat(overrides.output?.format ?? "png"),
      jpegQuality: finiteNumber(overrides.output?.jpegQuality ?? 0.92, "JPEG 质量"),
      jpegBackground: hexColor(overrides.output?.jpegBackground ?? "#ffffff"),
    },
  };

  if (![0, 90, 180, 270].includes(state.rotation)) {
    throw new RangeError("旋转角度必须是 0、90、180 或 270");
  }
  if (!["original", "square", "portrait", "landscape", "free"].includes(state.cropMode)) {
    throw new RangeError("不支持的裁剪模式");
  }
  if (typeof state.flipHorizontal !== "boolean" || typeof state.flipVertical !== "boolean"
    || typeof state.resize.allowUpscale !== "boolean") {
    throw new TypeError("翻转和放大选项必须是布尔值");
  }
  if (!["preset", "custom"].includes(state.resize.mode)) {
    throw new RangeError("不支持的输出尺寸模式");
  }
  if (state.output.jpegQuality < 0.1 || state.output.jpegQuality > 1) {
    throw new RangeError("JPEG 质量必须在 0.1–1 之间");
  }
  return deepFreeze(state);
}

export function reduceEditState(state, action) {
  if (state?.version !== EDIT_STATE_VERSION || !action || typeof action.type !== "string") {
    throw new TypeError("需要有效的 EditState 和动作");
  }
  switch (action.type) {
    case "rotate": {
      const rotation = ((state.rotation + (action.degrees ?? 90)) % 360 + 360) % 360;
      return createEditState({ ...state, rotation });
    }
    case "toggle-flip-horizontal":
      return createEditState({ ...state, flipHorizontal: !state.flipHorizontal });
    case "toggle-flip-vertical":
      return createEditState({ ...state, flipVertical: !state.flipVertical });
    case "set-crop":
      return createEditState({ ...state, crop: action.crop });
    case "set-resize":
      return createEditState({ ...state, resize: { ...state.resize, ...action.resize } });
    case "set-adjustments":
      return createEditState({ ...state, adjustments: { ...state.adjustments, ...action.adjustments } });
    case "set-output":
      return createEditState({ ...state, output: { ...state.output, ...action.output } });
    case "reset":
      return createEditState(action.overrides);
    default:
      throw new RangeError(`不支持的编辑动作：${action.type}`);
  }
}

function historyLimit(value) {
  return integerInRange(value ?? DEFAULT_HISTORY_LIMIT, 1, 200, "历史上限");
}

export function createEditHistory(initialState = createEditState(), { limit = DEFAULT_HISTORY_LIMIT } = {}) {
  return deepFreeze({ past: [], present: createEditState(initialState), future: [], limit: historyLimit(limit) });
}

export function applyEdit(history, action) {
  const next = reduceEditState(history.present, action);
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return deepFreeze({
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: [],
    limit: history.limit,
  });
}

export function undoEdit(history) {
  if (history.past.length === 0) return history;
  return deepFreeze({
    past: history.past.slice(0, -1),
    present: history.past.at(-1),
    future: [history.present, ...history.future].slice(0, history.limit),
    limit: history.limit,
  });
}

export function redoEdit(history) {
  if (history.future.length === 0) return history;
  return deepFreeze({
    past: [...history.past, history.present].slice(-history.limit),
    present: history.future[0],
    future: history.future.slice(1),
    limit: history.limit,
  });
}

export const EDITOR_LIMITS = Object.freeze({
  maxEdge: HARD_MAX_EDGE,
  maxPixels: HARD_MAX_PIXELS,
  maxHistory: 200,
});
