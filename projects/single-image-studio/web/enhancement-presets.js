const PRESETS = Object.freeze([
  Object.freeze({ id: "natural", label: "自然增强", description: "轻微提亮、降噪并增加细节层次", adjustments: Object.freeze({ brightness: 4, contrast: 6, saturation: 5, denoise: 12, clarity: 18 }) }),
  Object.freeze({ id: "bright", label: "清亮", description: "适合整体偏暗、细节偏软的照片", adjustments: Object.freeze({ brightness: 10, contrast: 4, saturation: 2, denoise: 8, clarity: 16 }) }),
  Object.freeze({ id: "vivid", label: "鲜明", description: "增加色彩、明暗与局部清晰度", adjustments: Object.freeze({ brightness: 2, contrast: 9, saturation: 12, denoise: 4, clarity: 24 }) }),
  Object.freeze({ id: "soft", label: "柔和降噪", description: "降低反差和轻微颗粒感", adjustments: Object.freeze({ brightness: 5, contrast: -5, saturation: -4, denoise: 24, clarity: 4 }) }),
  Object.freeze({ id: "original", label: "原始光色与细节", description: "不做光色或细节增强", adjustments: Object.freeze({ brightness: 0, contrast: 0, saturation: 0, denoise: 0, clarity: 0 }) }),
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
