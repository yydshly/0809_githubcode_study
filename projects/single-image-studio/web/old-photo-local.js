const PRESETS = Object.freeze([
  Object.freeze({
    id: "faded",
    label: "褪色提层次",
    description: "轻微提亮、平滑颗粒并增加已有层次",
    adjustments: Object.freeze({ brightness: 4, contrast: 12, saturation: 3, denoise: 18, clarity: 14 }),
  }),
  Object.freeze({
    id: "monochrome",
    label: "黑白层次",
    description: "转为黑白、轻降噪并提升明暗层次",
    adjustments: Object.freeze({ brightness: 3, contrast: 15, saturation: -100, denoise: 16, clarity: 18 }),
  }),
  Object.freeze({
    id: "soft",
    label: "柔和去灰",
    description: "温和提亮并优先平滑轻微颗粒",
    adjustments: Object.freeze({ brightness: 7, contrast: 7, saturation: -2, denoise: 28, clarity: 6 }),
  }),
  Object.freeze({
    id: "original",
    label: "保持原貌",
    description: "不改变光色或细节，只使用裁剪、旋转和导出",
    adjustments: Object.freeze({ brightness: 0, contrast: 0, saturation: 0, denoise: 0, clarity: 0 }),
  }),
]);

export const OLD_PHOTO_LOCAL_PRESETS = PRESETS;

export function oldPhotoLocalPresetById(presetId) {
  const preset = PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) throw new RangeError("不支持的老照片本地预设");
  return preset;
}

export function applyOldPhotoLocalPreset(settings = {}, presetId = "faded") {
  const preset = oldPhotoLocalPresetById(presetId);
  return Object.freeze({ ...settings, ...preset.adjustments });
}

export function matchOldPhotoLocalPreset(settings = {}) {
  const match = PRESETS.find((preset) => Object.entries(preset.adjustments)
    .every(([name, value]) => Number(settings[name]) === value));
  return match?.id ?? null;
}

export function oldPhotoOutputSetEntries(settings = {}) {
  return Object.freeze(PRESETS.map((preset) => Object.freeze({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    filenameSuffix: `local-${preset.id}`,
    settings: applyOldPhotoLocalPreset(settings, preset.id),
  })));
}
