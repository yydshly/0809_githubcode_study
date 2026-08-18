function boundedInteger(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RangeError(`${label} 必须是 0–100 的整数`);
  }
  return value;
}

function imageContract(pixels, width, height) {
  if (!(pixels instanceof Uint8Array) && !(pixels instanceof Uint8ClampedArray)) {
    throw new TypeError("细节增强需要 RGBA 像素数组");
  }
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("细节增强需要有效图片尺寸");
  }
  if (pixels.length !== width * height * 4) throw new RangeError("RGBA 像素长度与图片尺寸不一致");
}

function localAverage(source, width, height) {
  const average = new Float32Array(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const targetOffset = (y * width + x) * 4;
      const alpha = source[targetOffset + 3];
      average[targetOffset + 3] = alpha;
      if (alpha === 0) {
        average[targetOffset] = source[targetOffset];
        average[targetOffset + 1] = source[targetOffset + 1];
        average[targetOffset + 2] = source[targetOffset + 2];
        continue;
      }
      let red = 0;
      let green = 0;
      let blue = 0;
      let weight = 0;
      for (let sampleY = Math.max(0, y - 1); sampleY <= Math.min(height - 1, y + 1); sampleY += 1) {
        for (let sampleX = Math.max(0, x - 1); sampleX <= Math.min(width - 1, x + 1); sampleX += 1) {
          const offset = (sampleY * width + sampleX) * 4;
          const sampleWeight = source[offset + 3] / 255;
          red += source[offset] * sampleWeight;
          green += source[offset + 1] * sampleWeight;
          blue += source[offset + 2] * sampleWeight;
          weight += sampleWeight;
        }
      }
      average[targetOffset] = weight > 0 ? red / weight : source[targetOffset];
      average[targetOffset + 1] = weight > 0 ? green / weight : source[targetOffset + 1];
      average[targetOffset + 2] = weight > 0 ? blue / weight : source[targetOffset + 2];
    }
  }
  return average;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function denoisePixels(source, average, amount) {
  if (amount === 0) return Uint8ClampedArray.from(source);
  const output = new Uint8ClampedArray(source.length);
  const blend = amount / 100 * 0.55;
  const edgeThreshold = 10 + amount * 0.55;
  for (let offset = 0; offset < source.length; offset += 4) {
    const alpha = source[offset + 3];
    output[offset + 3] = alpha;
    if (alpha === 0) {
      output[offset] = source[offset];
      output[offset + 1] = source[offset + 1];
      output[offset + 2] = source[offset + 2];
      continue;
    }
    const difference = (
      Math.abs(source[offset] - average[offset])
      + Math.abs(source[offset + 1] - average[offset + 1])
      + Math.abs(source[offset + 2] - average[offset + 2])
    ) / 3;
    const edgeProtection = difference <= edgeThreshold
      ? 1
      : Math.max(0.08, edgeThreshold / difference * 0.35);
    const strength = blend * edgeProtection;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] = clampByte(
        source[offset + channel] + (average[offset + channel] - source[offset + channel]) * strength,
      );
    }
  }
  return output;
}

function clarifyPixels(source, average, amount) {
  if (amount === 0) return Uint8ClampedArray.from(source);
  const output = new Uint8ClampedArray(source.length);
  const strength = amount / 100 * 1.15;
  for (let offset = 0; offset < source.length; offset += 4) {
    const alpha = source[offset + 3];
    output[offset + 3] = alpha;
    if (alpha === 0) {
      output[offset] = source[offset];
      output[offset + 1] = source[offset + 1];
      output[offset + 2] = source[offset + 2];
      continue;
    }
    for (let channel = 0; channel < 3; channel += 1) {
      const detail = source[offset + channel] - average[offset + channel];
      output[offset + channel] = clampByte(source[offset + channel] + detail * strength);
    }
  }
  return output;
}

export function normalizeDetailEnhancement(settings = {}) {
  return Object.freeze({
    denoise: boundedInteger(settings.denoise ?? 0, "轻度降噪"),
    clarity: boundedInteger(settings.clarity ?? 0, "清晰度"),
  });
}

export function enhanceDetailPixels({ pixels, width, height, denoise = 0, clarity = 0 }) {
  imageContract(pixels, width, height);
  const settings = normalizeDetailEnhancement({ denoise, clarity });
  if (settings.denoise === 0 && settings.clarity === 0) return Uint8ClampedArray.from(pixels);
  const firstAverage = localAverage(pixels, width, height);
  const cleaned = denoisePixels(pixels, firstAverage, settings.denoise);
  if (settings.clarity === 0) return cleaned;
  return clarifyPixels(cleaned, localAverage(cleaned, width, height), settings.clarity);
}
