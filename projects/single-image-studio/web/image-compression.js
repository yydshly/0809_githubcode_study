const KIB = 1024;
const MIN_TARGET_KIB = 100;
const MAX_TARGET_KIB = 10 * 1024;

export const IMAGE_COMPRESSION_PRESETS = Object.freeze([
  Object.freeze({ id: "upload-2mb", label: "普通上传", description: "不超过 2 MB · 推荐", targetKilobytes: 2048 }),
  Object.freeze({ id: "upload-1mb", label: "严格上传", description: "不超过 1 MB", targetKilobytes: 1024 }),
  Object.freeze({ id: "attachment-500kb", label: "小附件", description: "不超过 500 KB", targetKilobytes: 500 }),
]);

export const COMPRESSION_ATTEMPT_STEPS = Object.freeze([
  Object.freeze({ edgeScale: 1, jpegQuality: 0.9 }),
  Object.freeze({ edgeScale: 1, jpegQuality: 0.82 }),
  Object.freeze({ edgeScale: 0.85, jpegQuality: 0.8 }),
  Object.freeze({ edgeScale: 0.7, jpegQuality: 0.76 }),
  Object.freeze({ edgeScale: 0.55, jpegQuality: 0.72 }),
  Object.freeze({ edgeScale: 0.45, jpegQuality: 0.68 }),
  Object.freeze({ edgeScale: 0.35, jpegQuality: 0.62 }),
  Object.freeze({ edgeScale: 0.28, jpegQuality: 0.56 }),
  Object.freeze({ edgeScale: 0.22, jpegQuality: 0.48 }),
  Object.freeze({ edgeScale: 0, jpegQuality: 0.4, finalLongEdge: 640 }),
]);

const PRESET_BY_ID = new Map(IMAGE_COMPRESSION_PRESETS.map((preset) => [preset.id, preset]));

export function normalizeCompressionLongEdge(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 320 || number > 8192) {
    throw new RangeError("图片压缩最长边必须是 320–8192 像素");
  }
  return number;
}

export function normalizeCompressionQuality(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0.4 || number > 0.95) {
    throw new RangeError("JPEG 质量必须是 40%–95%");
  }
  return Math.round(number * 100) / 100;
}

export function normalizeCompressionTargetKilobytes(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < MIN_TARGET_KIB || number > MAX_TARGET_KIB) {
    throw new RangeError("目标文件大小必须是 100–10240 KB 的整数");
  }
  return number;
}

export function compressionTargetBytes(targetKilobytes) {
  return normalizeCompressionTargetKilobytes(targetKilobytes) * KIB;
}

export function compressionPreset(presetId) {
  const preset = PRESET_BY_ID.get(presetId);
  if (!preset) throw new RangeError("不支持的图片压缩场景");
  return preset;
}

export function applyCompressionPreset(settings = {}, presetId = "upload-2mb") {
  const preset = compressionPreset(presetId);
  return Object.freeze({
    ...settings,
    ratio: "original",
    sizeMode: "custom",
    outputLongEdge: settings.outputLongEdge ?? 8192,
    format: "jpeg",
    jpegQuality: COMPRESSION_ATTEMPT_STEPS[0].jpegQuality,
    compressionTargetKilobytes: preset.targetKilobytes,
  });
}

export function matchCompressionPreset(settings = {}) {
  const targetKilobytes = Number(settings.compressionTargetKilobytes);
  return IMAGE_COMPRESSION_PRESETS.find((preset) => targetKilobytes === preset.targetKilobytes)?.id ?? null;
}

export function formatImageBytes(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("文件大小必须是非负整数");
  if (bytes < KIB) return `${bytes} B`;
  if (bytes < KIB * KIB) return `${(bytes / KIB).toFixed(bytes < 10 * KIB ? 1 : 0)} KB`;
  return `${(bytes / KIB / KIB).toFixed(2)} MB`;
}

export function compressionReport({ sourceBytes, resultBytes, targetBytes = null }) {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes < 1) throw new RangeError("原图大小必须是正整数");
  if (!Number.isSafeInteger(resultBytes) || resultBytes < 1) throw new RangeError("压缩结果大小必须是正整数");
  if (targetBytes !== null && (!Number.isSafeInteger(targetBytes) || targetBytes < 1)) {
    throw new RangeError("目标大小必须是正整数");
  }
  const delta = resultBytes - sourceBytes;
  const deltaPercent = Math.round(Math.abs(delta) / sourceBytes * 1000) / 10;
  const direction = delta < 0 ? "saved" : delta > 0 ? "larger" : "same";
  const summary = direction === "saved"
    ? `节省 ${deltaPercent.toFixed(1)}%`
    : direction === "larger"
      ? `文件增大 ${deltaPercent.toFixed(1)}%`
      : "文件大小不变";
  const targetMet = targetBytes === null ? null : resultBytes <= targetBytes;
  return Object.freeze({
    sourceBytes,
    resultBytes,
    targetBytes,
    targetMet,
    direction,
    deltaPercent,
    sourceLabel: formatImageBytes(sourceBytes),
    resultLabel: formatImageBytes(resultBytes),
    targetLabel: targetBytes === null ? null : formatImageBytes(targetBytes),
    summary,
    targetSummary: targetBytes === null
      ? null
      : targetMet
        ? `已达到不超过 ${formatImageBytes(targetBytes)} 的目标`
        : `未达到不超过 ${formatImageBytes(targetBytes)} 的目标`,
  });
}

function positiveDimension(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new RangeError(`${label}必须是正整数`);
  return number;
}

function roundedPercent(value) {
  return Math.round(value * 1000) / 10;
}

export function compressionTargetPressure({ sourceBytes, targetBytes }) {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes < 1) throw new RangeError("原图大小必须是正整数");
  if (!Number.isSafeInteger(targetBytes) || targetBytes < 1) throw new RangeError("目标大小必须是正整数");
  const alreadyFits = sourceBytes <= targetBytes;
  const minimumReductionPercent = alreadyFits ? 0 : roundedPercent(1 - targetBytes / sourceBytes);
  const level = alreadyFits ? "none" : minimumReductionPercent < 50 ? "light" : minimumReductionPercent < 80 ? "medium" : "high";
  const label = {
    none: "无需压缩",
    light: "体积要求较宽松",
    medium: "体积要求较高",
    high: "体积要求很高",
  }[level];
  return Object.freeze({ alreadyFits, minimumReductionPercent, level, label });
}

export function compressionImpactReport({
  sourceWidth,
  sourceHeight,
  resultWidth,
  resultHeight,
  jpegQuality,
  sourceBytes,
  resultBytes,
}) {
  const normalizedSourceWidth = positiveDimension(sourceWidth, "原图宽度");
  const normalizedSourceHeight = positiveDimension(sourceHeight, "原图高度");
  const normalizedResultWidth = positiveDimension(resultWidth, "结果宽度");
  const normalizedResultHeight = positiveDimension(resultHeight, "结果高度");
  const normalizedQuality = normalizeCompressionQuality(jpegQuality);
  const file = compressionReport({ sourceBytes, resultBytes });
  const sourcePixels = normalizedSourceWidth * normalizedSourceHeight;
  const resultPixels = normalizedResultWidth * normalizedResultHeight;
  const pixelRetentionPercent = Math.min(100, roundedPercent(resultPixels / sourcePixels));
  const qualityPercent = Math.round(normalizedQuality * 100);
  const dimensionsChanged = normalizedSourceWidth !== normalizedResultWidth || normalizedSourceHeight !== normalizedResultHeight;
  const level = !dimensionsChanged && qualityPercent >= 82
    ? "light"
    : pixelRetentionPercent >= 70 && qualityPercent >= 68
      ? "medium"
      : "high";
  const label = level === "light" ? "预计影响轻微" : level === "medium" ? "预计有一定影响" : "预计影响明显";
  const explanation = dimensionsChanged
    ? `结果同时降低了 JPEG 质量和像素尺寸，保留约 ${pixelRetentionPercent.toFixed(1)}% 的像素；放大、打印和二次裁剪时更容易看出差异。`
    : `结果保持原像素尺寸，体积下降主要来自 JPEG 重新编码；仍建议放大检查文字、发丝、纹理和渐变。`;
  return Object.freeze({
    level,
    label,
    explanation,
    dimensionsChanged,
    pixelRetentionPercent,
    qualityPercent,
    sourceDimensions: `${normalizedSourceWidth} × ${normalizedSourceHeight}`,
    resultDimensions: `${normalizedResultWidth} × ${normalizedResultHeight}`,
    fileReductionPercent: file.direction === "saved" ? file.deltaPercent : 0,
  });
}

function validateAttemptResult(result) {
  if (!result || !Number.isSafeInteger(result.byteLength) || result.byteLength < 1) {
    throw new TypeError("压缩尝试必须返回有效文件大小");
  }
  return result;
}

function resultLongEdge(result, fallback) {
  return Number.isSafeInteger(result.width) && result.width > 0
    && Number.isSafeInteger(result.height) && result.height > 0
    ? Math.max(result.width, result.height)
    : fallback;
}

export async function compressImageToTarget({
  targetKilobytes,
  maxLongEdge = 8192,
  renderAttempt,
  revokeObjectUrl = () => {},
  onAttempt = () => {},
  signal = null,
}) {
  if (typeof renderAttempt !== "function") throw new TypeError("压缩需要可执行的本地编码器");
  if (typeof onAttempt !== "function") throw new TypeError("压缩进度回调无效");
  const targetBytes = compressionTargetBytes(targetKilobytes);
  const normalizedMaxLongEdge = normalizeCompressionLongEdge(maxLongEdge);
  const attempts = [];
  let smallest = null;

  for (const baseStep of COMPRESSION_ATTEMPT_STEPS) {
    if (signal?.aborted) throw new DOMException("图片压缩已取消", "AbortError");
    const step = Object.freeze({
      outputLongEdge: Math.min(
        normalizedMaxLongEdge,
        baseStep.finalLongEdge ?? Math.max(640, Math.round(normalizedMaxLongEdge * baseStep.edgeScale)),
      ),
      jpegQuality: baseStep.jpegQuality,
    });
    onAttempt(Object.freeze({
      phase: "encoding",
      attemptNumber: attempts.length + 1,
      attemptTotal: COMPRESSION_ATTEMPT_STEPS.length,
      ...step,
    }));
    const result = validateAttemptResult(await renderAttempt(step));
    attempts.push(Object.freeze({
      outputLongEdge: step.outputLongEdge,
      jpegQuality: step.jpegQuality,
      resultBytes: result.byteLength,
    }));
    onAttempt(Object.freeze({
      phase: "measured",
      attemptNumber: attempts.length,
      attemptTotal: COMPRESSION_ATTEMPT_STEPS.length,
      resultBytes: result.byteLength,
      targetBytes,
      ...step,
    }));

    if (result.byteLength <= targetBytes) {
      if (smallest?.result?.url && smallest.result.url !== result.url) revokeObjectUrl(smallest.result.url);
      return Object.freeze({
        ...result,
        compressionDecision: Object.freeze({
          targetBytes,
          targetMet: true,
          attemptCount: attempts.length,
          selectedLongEdge: resultLongEdge(result, step.outputLongEdge),
          selectedQuality: step.jpegQuality,
          attempts: Object.freeze(attempts),
        }),
      });
    }

    if (!smallest || result.byteLength < smallest.result.byteLength) {
      if (smallest?.result?.url && smallest.result.url !== result.url) revokeObjectUrl(smallest.result.url);
      smallest = { result, step };
    } else if (result.url) {
      revokeObjectUrl(result.url);
    }
  }

  return Object.freeze({
    ...smallest.result,
    compressionDecision: Object.freeze({
      targetBytes,
      targetMet: false,
      attemptCount: attempts.length,
      selectedLongEdge: resultLongEdge(smallest.result, smallest.step.outputLongEdge),
      selectedQuality: smallest.step.jpegQuality,
      attempts: Object.freeze(attempts),
    }),
  });
}
