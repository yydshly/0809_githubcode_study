const PRESETS = Object.freeze([
  Object.freeze({ id: "natural", label: "自然提亮", description: "轻微提亮并增加层次", adjustments: Object.freeze({ brightness: 4, contrast: 6, saturation: 5 }) }),
  Object.freeze({ id: "bright", label: "清亮", description: "适合整体偏暗的照片", adjustments: Object.freeze({ brightness: 10, contrast: 4, saturation: 2 }) }),
  Object.freeze({ id: "vivid", label: "鲜明", description: "增加色彩与明暗层次", adjustments: Object.freeze({ brightness: 2, contrast: 9, saturation: 12 }) }),
  Object.freeze({ id: "soft", label: "柔和", description: "降低反差和过强色彩", adjustments: Object.freeze({ brightness: 5, contrast: -5, saturation: -4 }) }),
  Object.freeze({ id: "original", label: "原始光色", description: "不做光色增强", adjustments: Object.freeze({ brightness: 0, contrast: 0, saturation: 0 }) }),
]);

export const ENHANCEMENT_PRESETS = PRESETS;

export function enhancementPresetById(presetId) {
  const preset = PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) throw new RangeError("不支持的自然增强预设");
  return preset;
}

export function applyEnhancementPreset(settings = {}, presetId = "natural") {
  const preset = enhancementPresetById(presetId);
  return Object.freeze({ ...settings, ...preset.adjustments });
}

export function matchEnhancementPreset(settings = {}) {
  const match = PRESETS.find((preset) => Object.entries(preset.adjustments)
    .every(([name, value]) => Number(settings[name]) === value));
  return match?.id ?? null;
}
