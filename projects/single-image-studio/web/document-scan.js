export const DOCUMENT_SCAN_MODES = Object.freeze([
  Object.freeze({ id: "original", label: "只裁正 · 保持原色", detail: "适合画框、海报、包装和彩色页面" }),
  Object.freeze({ id: "clean-color", label: "文档 · 清晰彩色", detail: "提亮纸面并保留印刷颜色" }),
  Object.freeze({ id: "grayscale", label: "文档 · 灰度", detail: "去除色偏，保留连续明暗层次" }),
  Object.freeze({ id: "black-white", label: "文档 · 高对比黑白", detail: "只适合文字和线稿，不适合照片" }),
]);

const MODE_BY_ID = new Map(DOCUMENT_SCAN_MODES.map((mode) => [mode.id, mode]));

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function luminance(red, green, blue) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function validatePixels(pixels, width, height) {
  if (!(pixels instanceof Uint8ClampedArray)) throw new TypeError("扫描效果需要 Uint8ClampedArray RGBA 像素");
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {
    throw new TypeError("扫描效果需要有效图片尺寸");
  }
  if (pixels.length !== width * height * 4) throw new RangeError("扫描效果像素长度与尺寸不一致");
}

function visibleLuminanceHistogram(pixels) {
  const counts = new Uint32Array(256);
  let total = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    counts[clampByte(luminance(pixels[index], pixels[index + 1], pixels[index + 2]))] += 1;
    total += 1;
  }
  return { counts, total };
}

function percentileRange({ counts, total }) {
  if (total === 0) return { low: 0, high: 255 };
  const lowTarget = Math.max(1, Math.ceil(total * 0.03));
  const highTarget = Math.max(1, Math.ceil(total * 0.97));
  let cumulative = 0;
  let low = 0;
  let high = 255;
  for (let value = 0; value < counts.length; value += 1) {
    cumulative += counts[value];
    if (cumulative >= lowTarget) {
      low = value;
      break;
    }
  }
  cumulative = 0;
  for (let value = 0; value < counts.length; value += 1) {
    cumulative += counts[value];
    if (cumulative >= highTarget) {
      high = value;
      break;
    }
  }
  return high - low < 32 ? { low: 0, high: 255 } : { low, high };
}

function stretched(value, range) {
  return clampByte((value - range.low) * 255 / Math.max(1, range.high - range.low));
}

function continuousDocumentPixels(pixels, mode) {
  const result = new Uint8ClampedArray(pixels);
  const range = percentileRange(visibleLuminanceHistogram(pixels));
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    const sourceLuminance = luminance(pixels[index], pixels[index + 1], pixels[index + 2]);
    const normalized = stretched(sourceLuminance, range);
    if (mode === "grayscale") {
      result[index] = normalized;
      result[index + 1] = normalized;
      result[index + 2] = normalized;
      continue;
    }
    const lift = (normalized - sourceLuminance) * 0.82;
    result[index] = clampByte(pixels[index] + lift);
    result[index + 1] = clampByte(pixels[index + 1] + lift);
    result[index + 2] = clampByte(pixels[index + 2] + lift);
  }
  return result;
}

function blackWhiteDocumentPixels(pixels, width, height) {
  const result = new Uint8ClampedArray(pixels);
  const luma = new Uint8Array(width * height);
  const integralWidth = width + 1;
  const integral = new Float64Array(integralWidth * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      const value = clampByte(luminance(pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]));
      luma[y * width + x] = value;
      rowSum += value;
      integral[(y + 1) * integralWidth + x + 1] = integral[y * integralWidth + x + 1] + rowSum;
    }
  }
  const radius = Math.max(4, Math.min(32, Math.round(Math.min(width, height) * 0.025)));
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      if (pixels[pixelIndex + 3] === 0) continue;
      const left = Math.max(0, x - radius);
      const right = Math.min(width - 1, x + radius);
      const count = (right - left + 1) * (bottom - top + 1);
      const sum = integral[(bottom + 1) * integralWidth + right + 1]
        - integral[top * integralWidth + right + 1]
        - integral[(bottom + 1) * integralWidth + left]
        + integral[top * integralWidth + left];
      const threshold = sum / count - 11;
      const value = luma[y * width + x] <= threshold ? 0 : 255;
      result[pixelIndex] = value;
      result[pixelIndex + 1] = value;
      result[pixelIndex + 2] = value;
    }
  }
  return result;
}

export function normalizeDocumentScanMode(value = "original") {
  if (!MODE_BY_ID.has(value)) throw new RangeError("不支持的扫描件效果模式");
  return value;
}

export function documentScanMode(value = "original") {
  return MODE_BY_ID.get(normalizeDocumentScanMode(value));
}

export function applyDocumentScanPixels({ pixels, width, height, mode = "original" } = {}) {
  validatePixels(pixels, width, height);
  const normalizedMode = normalizeDocumentScanMode(mode);
  if (normalizedMode === "original") return new Uint8ClampedArray(pixels);
  if (normalizedMode === "black-white") return blackWhiteDocumentPixels(pixels, width, height);
  return continuousDocumentPixels(pixels, normalizedMode);
}
