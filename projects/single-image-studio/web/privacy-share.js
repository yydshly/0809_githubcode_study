const PRIVATE_METADATA_LABELS = Object.freeze(["EXIF", "GPS", "XMP", "IPTC", "JPEG comment"]);

export const PRIVACY_SHARE_PRESETS = Object.freeze([
  Object.freeze({ id: "clear", label: "清晰分享", detail: "2048 px · 2 MB", outputLongEdge: 2048, targetKilobytes: 2048 }),
  Object.freeze({ id: "balanced", label: "日常分享", detail: "1600 px · 1 MB · 推荐", outputLongEdge: 1600, targetKilobytes: 1024 }),
  Object.freeze({ id: "compact", label: "小文件分享", detail: "1200 px · 500 KB", outputLongEdge: 1200, targetKilobytes: 500 }),
]);

const PRESET_BY_ID = new Map(PRIVACY_SHARE_PRESETS.map((preset) => [preset.id, preset]));

function integer(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new RangeError(`${label}必须是 ${minimum}–${maximum} 的整数`);
  return number;
}
function color(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) throw new RangeError("分享副本背景色无效");
  return normalized;
}

export function normalizePrivacyShareSettings(settings = {}) {
  return Object.freeze({
    outputLongEdge: integer(settings.privacyLongEdge ?? 1600, 640, 2048, "分享副本最长边"),
    targetKilobytes: integer(settings.privacyTargetKilobytes ?? 1024, 100, 5120, "分享副本文件上限"),
    backgroundColor: color(settings.privacyBackground ?? "#FFFFFF"),
    format: "jpeg",
  });
}

export function privacySharePlan(settings = {}) {
  const normalized = normalizePrivacyShareSettings(settings);
  return Object.freeze({
    ...normalized,
    steps: Object.freeze([
      "保持完整画面与原始比例",
      `最长边不超过 ${normalized.outputLongEdge} px`,
      `在 ${normalized.backgroundColor} 底色上生成 JPEG`,
      `压缩到不超过 ${normalized.targetKilobytes} KB`,
      "重开并核对像素、hash 与禁止 metadata",
    ]),
    removedMetadata: PRIVATE_METADATA_LABELS,
  });
}

export function applyPrivacySharePreset(settings = {}, presetId = "balanced") {
  const preset = PRESET_BY_ID.get(presetId);
  if (!preset) throw new RangeError("未知的隐私分享预设");
  return Object.freeze({
    ...settings,
    privacyLongEdge: preset.outputLongEdge,
    privacyTargetKilobytes: preset.targetKilobytes,
  });
}

export function matchPrivacySharePreset(settings = {}) {
  return PRIVACY_SHARE_PRESETS.find((preset) => preset.outputLongEdge === Number(settings.privacyLongEdge)
    && preset.targetKilobytes === Number(settings.privacyTargetKilobytes))?.id ?? null;
}

export function privacyShareEditorSettings(settings = {}) {
  const normalized = normalizePrivacyShareSettings(settings);
  return Object.freeze({
    ratio: "original",
    rotation: 0,
    sizeMode: "custom",
    outputLongEdge: normalized.outputLongEdge,
    format: "jpeg",
    jpegQuality: 0.9,
    jpegBackground: normalized.backgroundColor,
    compressionTargetKilobytes: normalized.targetKilobytes,
    privacyLongEdge: normalized.outputLongEdge,
    privacyTargetKilobytes: normalized.targetKilobytes,
    privacyBackground: normalized.backgroundColor,
  });
}

export function privacyShareReport({ mime, width, height, byteLength, metadataInspection, settings }) {
  const normalized = normalizePrivacyShareSettings(settings);
  const privateMetadata = Array.isArray(metadataInspection?.privateMetadata) ? metadataInspection.privateMetadata : null;
  const checks = Object.freeze([
    Object.freeze({ id: "format", label: "JPEG 分享副本", passed: mime === "image/jpeg", actual: mime }),
    Object.freeze({ id: "dimensions", label: `最长边 ≤ ${normalized.outputLongEdge} px`, passed: Math.max(width, height) <= normalized.outputLongEdge, actual: `${width} × ${height}` }),
    Object.freeze({ id: "bytes", label: `文件 ≤ ${normalized.targetKilobytes} KB`, passed: byteLength <= normalized.targetKilobytes * 1024, actual: `${Math.ceil(byteLength / 1024)} KB` }),
    Object.freeze({ id: "metadata", label: "禁止的私密 metadata 为 0", passed: privateMetadata?.length === 0, actual: privateMetadata === null ? "未检查" : `${privateMetadata.length} 项` }),
  ]);
  return Object.freeze({
    passed: checks.every((check) => check.passed),
    checks,
    removedMetadata: PRIVATE_METADATA_LABELS,
    visibleContentInspection: "not-performed",
    boundary: "文件 metadata 清理不等于画面内容匿名",
  });
}
