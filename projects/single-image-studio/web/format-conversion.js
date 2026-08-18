import { formatImageBytes } from "./image-compression.js";

export const FORMAT_CONVERSION_OPTIONS = Object.freeze([
  Object.freeze({ id: "png", label: "PNG", description: "支持透明；适合图标、截图和需要透明背景的图片" }),
  Object.freeze({ id: "jpeg", label: "JPEG", description: "文件通常更小；不支持透明，适合普通照片" }),
]);

const MIME_BY_FORMAT = Object.freeze({ png: "image/png", jpeg: "image/jpeg" });

export function normalizeConversionFormat(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const format = raw === "image/png" ? "png" : ["image/jpeg", "jpg"].includes(raw) ? "jpeg" : raw;
  if (!(format in MIME_BY_FORMAT)) throw new RangeError("转换格式必须是 PNG 或 JPEG");
  return format;
}

export function conversionFormatLabel(value) {
  const mime = String(value ?? "").trim().toLowerCase();
  if (mime === "image/png" || mime === "png") return "PNG";
  if (mime === "image/jpeg" || mime === "jpeg" || mime === "jpg") return "JPEG";
  if (mime === "image/webp" || mime === "webp") return "WebP";
  return "图片";
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new RangeError(`${label}必须是正整数`);
  return number;
}

function normalizedQuality(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0.4 || number > 0.95) throw new RangeError("JPEG 质量必须是 40%–95%");
  return Math.round(number * 100);
}

function normalizedColor(value) {
  const color = String(value ?? "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) throw new RangeError("JPEG 透明区域填色无效");
  return color;
}

export function formatConversionSettings({ sourceLongEdge = 2048, format = "png" } = {}) {
  const normalizedLongEdge = positiveInteger(sourceLongEdge, "原图最长边");
  if (normalizedLongEdge > 8192) throw new RangeError("格式转换最长边不得超过 8192 像素");
  return Object.freeze({
    formatConversion: "on",
    ratio: "original",
    sizeMode: "custom",
    outputLongEdge: Math.max(1, normalizedLongEdge),
    format: normalizeConversionFormat(format),
    jpegQuality: 0.9,
    jpegBackground: "#ffffff",
  });
}

export function formatConversionReport({
  sourceMime,
  resultMime,
  sourceBytes,
  resultBytes,
  sourceWidth,
  sourceHeight,
  resultWidth,
  resultHeight,
  jpegQuality = 0.9,
  jpegBackground = "#ffffff",
}) {
  const outputFormat = normalizeConversionFormat(resultMime);
  const normalizedSourceBytes = positiveInteger(sourceBytes, "原图大小");
  const normalizedResultBytes = positiveInteger(resultBytes, "结果大小");
  const normalizedSourceWidth = positiveInteger(sourceWidth, "原图宽度");
  const normalizedSourceHeight = positiveInteger(sourceHeight, "原图高度");
  const normalizedResultWidth = positiveInteger(resultWidth, "结果宽度");
  const normalizedResultHeight = positiveInteger(resultHeight, "结果高度");
  const qualityPercent = normalizedQuality(jpegQuality);
  const background = normalizedColor(jpegBackground);
  const sizeDeltaPercent = Math.round(Math.abs(normalizedResultBytes - normalizedSourceBytes) / normalizedSourceBytes * 1000) / 10;
  const sizeSummary = normalizedResultBytes < normalizedSourceBytes
    ? `文件减少 ${sizeDeltaPercent.toFixed(1)}%`
    : normalizedResultBytes > normalizedSourceBytes
      ? `文件增大 ${sizeDeltaPercent.toFixed(1)}%`
      : "文件大小不变";
  const dimensionsChanged = normalizedSourceWidth !== normalizedResultWidth || normalizedSourceHeight !== normalizedResultHeight;
  const transparencySummary = outputFormat === "jpeg"
    ? `JPEG 不支持透明；若原图含透明或半透明区域，将使用 ${background} 填充。`
    : "PNG 支持透明；已有透明像素会保留，但转换不会自动抠图。";
  const qualitySummary = outputFormat === "jpeg"
    ? `${qualityPercent}% 有损编码；数值越低，通常文件越小、细节损失越明显。`
    : "PNG 不使用 JPEG 质量参数；转成 PNG 不能恢复原图中已经损失的细节。";
  return Object.freeze({
    sourceFormat: conversionFormatLabel(sourceMime),
    resultFormat: conversionFormatLabel(resultMime),
    sourceSize: formatImageBytes(normalizedSourceBytes),
    resultSize: formatImageBytes(normalizedResultBytes),
    sizeSummary,
    dimensionsChanged,
    dimensionsSummary: `${normalizedSourceWidth} × ${normalizedSourceHeight} → ${normalizedResultWidth} × ${normalizedResultHeight}`,
    transparencySummary,
    qualitySummary,
    qualityPercent: outputFormat === "jpeg" ? qualityPercent : null,
    background: outputFormat === "jpeg" ? background : null,
  });
}
