const RATIO_VALUES = Object.freeze({ original: null, square: 1, portrait: 4 / 5, wide: 16 / 9 });

export const UPLOAD_SPECIFICATION_PRESETS = Object.freeze([
  Object.freeze({ id: "general", label: "普通上传", detail: "完整保留 · 1600 px · 2 MB", contentMode: "whole", ratioId: "original", outputLongEdge: 1600, targetKilobytes: 2048 }),
  Object.freeze({ id: "strict", label: "严格表单", detail: "完整保留 · 1200 px · 1 MB", contentMode: "whole", ratioId: "original", outputLongEdge: 1200, targetKilobytes: 1024 }),
  Object.freeze({ id: "attachment", label: "小附件", detail: "完整保留 · 1200 px · 500 KB", contentMode: "whole", ratioId: "original", outputLongEdge: 1200, targetKilobytes: 500 }),
  Object.freeze({ id: "square-fit", label: "完整方图", detail: "不裁切 · 1:1 · 1200 px · 1 MB", contentMode: "whole", ratioId: "square", outputLongEdge: 1200, targetKilobytes: 1024 }),
  Object.freeze({ id: "square-crop", label: "裁剪方图", detail: "允许裁切 · 1:1 · 1200 px · 1 MB", contentMode: "crop", ratioId: "square", outputLongEdge: 1200, targetKilobytes: 1024 }),
]);

const PRESET_BY_ID = new Map(UPLOAD_SPECIFICATION_PRESETS.map((preset) => [preset.id, preset]));

function integer(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new RangeError(`${label}必须是 ${minimum}–${maximum} 的整数`);
  return number;
}

function color(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) throw new RangeError("留白颜色无效");
  return normalized;
}

export function normalizeUploadSpecification(settings = {}) {
  const contentMode = String(settings.uploadContentMode ?? "whole");
  if (!new Set(["whole", "crop"]).has(contentMode)) throw new RangeError("内容处理方式无效");
  const ratioId = String(settings.uploadRatio ?? "original");
  if (!(ratioId in RATIO_VALUES)) throw new RangeError("上传画面比例无效");
  if (contentMode === "crop" && ratioId === "original") throw new RangeError("允许裁剪时请选择目标比例");
  return Object.freeze({
    contentMode,
    ratioId,
    ratio: RATIO_VALUES[ratioId],
    outputLongEdge: integer(settings.uploadLongEdge ?? 1600, 320, 2048, "最长边"),
    targetKilobytes: integer(settings.uploadTargetKilobytes ?? 1024, 100, 10240, "文件上限"),
    backgroundColor: color(settings.uploadBackground ?? "#FFFFFF"),
    format: "jpeg",
  });
}

export function uploadSpecificationPlan(settings = {}) {
  const normalized = normalizeUploadSpecification(settings);
  const geometry = normalized.contentMode === "whole"
    ? normalized.ratioId === "original" ? "完整保留原比例" : `完整保留并以留白适配 ${normalized.ratioId}`
    : `居中裁剪为 ${normalized.ratioId}`;
  return Object.freeze({
    ...normalized,
    steps: Object.freeze([
      geometry,
      `最长边不超过 ${normalized.outputLongEdge} px`,
      `转为 JPEG${normalized.contentMode === "whole" ? `，留白 ${normalized.backgroundColor}` : ""}`,
      `压缩到不超过 ${normalized.targetKilobytes} KB`,
      "重开并核对格式、尺寸、体积和像素",
    ]),
  });
}

export function uploadSpecificationEditorSettings(editorSettings = {}, settings = {}) {
  const normalized = normalizeUploadSpecification(settings);
  return Object.freeze({
    ...editorSettings,
    ratio: normalized.contentMode === "crop" ? normalized.ratioId : "original",
    sizeMode: "custom",
    outputLongEdge: normalized.outputLongEdge,
    format: "jpeg",
    jpegQuality: 0.9,
    jpegBackground: normalized.backgroundColor,
    compressionTargetKilobytes: normalized.targetKilobytes,
    uploadContentMode: normalized.contentMode,
    uploadRatio: normalized.ratioId,
    uploadLongEdge: normalized.outputLongEdge,
    uploadTargetKilobytes: normalized.targetKilobytes,
    uploadBackground: normalized.backgroundColor,
  });
}

export function applyUploadSpecificationPreset(settings = {}, presetId = "general") {
  const preset = PRESET_BY_ID.get(presetId);
  if (!preset) throw new RangeError("未知的上传预设");
  return Object.freeze({
    ...settings,
    uploadContentMode: preset.contentMode,
    uploadRatio: preset.ratioId,
    uploadLongEdge: preset.outputLongEdge,
    uploadTargetKilobytes: preset.targetKilobytes,
  });
}

export function matchUploadSpecificationPreset(settings = {}) {
  return UPLOAD_SPECIFICATION_PRESETS.find((preset) => preset.contentMode === settings.uploadContentMode
    && preset.ratioId === settings.uploadRatio
    && preset.outputLongEdge === Number(settings.uploadLongEdge)
    && preset.targetKilobytes === Number(settings.uploadTargetKilobytes))?.id ?? null;
}

export function uploadComplianceReport({ mime, width, height, byteLength, specification }) {
  const normalized = normalizeUploadSpecification(specification);
  const checks = Object.freeze([
    Object.freeze({ id: "format", label: "JPEG 格式", passed: mime === "image/jpeg", actual: mime === "image/jpeg" ? "JPEG" : String(mime) }),
    Object.freeze({ id: "dimensions", label: `最长边 ≤ ${normalized.outputLongEdge} px`, passed: Math.max(width, height) <= normalized.outputLongEdge, actual: `${width} × ${height}` }),
    Object.freeze({ id: "bytes", label: `文件 ≤ ${normalized.targetKilobytes} KB`, passed: byteLength <= normalized.targetKilobytes * 1024, actual: `${Math.ceil(byteLength / 1024)} KB` }),
    Object.freeze({ id: "content", label: normalized.contentMode === "whole" ? "完整保留内容" : "允许居中裁剪", passed: true, actual: normalized.ratioId }),
  ]);
  return Object.freeze({ checks, passed: checks.every((check) => check.passed) });
}
