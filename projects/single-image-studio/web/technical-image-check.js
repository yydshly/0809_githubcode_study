const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function assertPixels(pixels, width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new TypeError("技术检查需要有效的图片尺寸");
  }
  if (!pixels || typeof pixels.length !== "number" || pixels.length !== width * height * 4) {
    throw new TypeError("技术检查需要与尺寸一致的 RGBA 像素");
  }
}

function exposureObservation(meanLuma, shadowFraction, highlightFraction) {
  if (meanLuma < 82 || shadowFraction > 0.55) {
    return Object.freeze({ id: "dark", label: "整体偏暗", copy: "暗部像素占比较高，可先小幅提亮后再比较。" });
  }
  if (meanLuma > 185 || highlightFraction > 0.4) {
    return Object.freeze({ id: "bright", label: "整体偏亮", copy: "亮部像素占比较高，建议避免继续大幅提亮。" });
  }
  return Object.freeze({ id: "balanced", label: "明暗分布较均衡", copy: "没有观察到明显的整体偏暗或偏亮趋势。" });
}

function colorObservation(meanRed, meanGreen, meanBlue) {
  const warmDelta = meanRed - meanBlue;
  const greenDelta = meanGreen - ((meanRed + meanBlue) / 2);
  if (greenDelta > 14) {
    return Object.freeze({ id: "green", label: "有偏绿趋势", copy: "绿色通道平均值略高；这不是白平衡鉴定。" });
  }
  if (warmDelta > 16) {
    return Object.freeze({ id: "warm", label: "有偏暖趋势", copy: "红色通道相对较高；可能来自光线或画面本身，不是白平衡鉴定。" });
  }
  if (warmDelta < -16) {
    return Object.freeze({ id: "cool", label: "有偏冷趋势", copy: "蓝色通道相对较高；可能来自光线或画面本身，不是白平衡鉴定。" });
  }
  return Object.freeze({ id: "neutral", label: "通道均值较接近", copy: "没有观察到明显的红蓝或绿色通道偏移。" });
}

function detailObservation(meanDifference, pairCount) {
  if (pairCount === 0) {
    return Object.freeze({ id: "unknown", label: "局部变化无法计算", copy: "可见像素太少，未对细节作判断。" });
  }
  if (meanDifference < 5) {
    return Object.freeze({ id: "low", label: "局部变化较少", copy: "相邻像素变化较少；不等同于失焦或画质较差。" });
  }
  if (meanDifference > 22) {
    return Object.freeze({ id: "high", label: "局部变化较多", copy: "相邻像素变化较多；可能来自纹理、边缘或颗粒。" });
  }
  return Object.freeze({ id: "medium", label: "局部变化适中", copy: "相邻像素变化处在当前启发式的中间范围。" });
}

export function inspectTechnicalPixels({ pixels, width, height }) {
  assertPixels(pixels, width, height);
  const luma = new Float32Array(width * height);
  const visible = new Uint8Array(width * height);
  let count = 0;
  let colorCount = 0;
  let lumaTotal = 0;
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let shadowCount = 0;
  let highlightCount = 0;

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (pixels[offset + 3] < 32) continue;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const value = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    visible[index] = 1;
    luma[index] = value;
    count += 1;
    lumaTotal += value;
    if (value < 48) shadowCount += 1;
    if (value > 224) highlightCount += 1;
    if (value >= 24 && value <= 232) {
      colorCount += 1;
      redTotal += red;
      greenTotal += green;
      blueTotal += blue;
    }
  }

  if (count === 0) throw new Error("图片没有可用于技术检查的可见像素");
  if (colorCount === 0) {
    colorCount = count;
    for (let index = 0; index < width * height; index += 1) {
      if (!visible[index]) continue;
      const offset = index * 4;
      redTotal += pixels[offset];
      greenTotal += pixels[offset + 1];
      blueTotal += pixels[offset + 2];
    }
  }

  let differenceTotal = 0;
  let pairCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x;
      if (!visible[index]) continue;
      if (x + 1 < width && visible[index + 1]) {
        differenceTotal += Math.abs(luma[index] - luma[index + 1]);
        pairCount += 1;
      }
      if (y + 1 < height && visible[index + width]) {
        differenceTotal += Math.abs(luma[index] - luma[index + width]);
        pairCount += 1;
      }
    }
  }

  const meanLuma = lumaTotal / count;
  const shadowFraction = shadowCount / count;
  const highlightFraction = highlightCount / count;
  const meanDifference = pairCount ? differenceTotal / pairCount : 0;
  const observations = Object.freeze({
    exposure: exposureObservation(meanLuma, shadowFraction, highlightFraction),
    color: colorObservation(redTotal / colorCount, greenTotal / colorCount, blueTotal / colorCount),
    detail: detailObservation(meanDifference, pairCount),
  });
  return Object.freeze({
    sample: Object.freeze({ width, height, visiblePixels: count }),
    metrics: Object.freeze({
      meanLuma: Number(meanLuma.toFixed(2)),
      shadowFraction: Number(shadowFraction.toFixed(4)),
      highlightFraction: Number(highlightFraction.toFixed(4)),
      meanNeighborDifference: Number(meanDifference.toFixed(2)),
    }),
    observations,
  });
}

export function technicalImageAdvice(inspection) {
  const exposure = inspection?.observations?.exposure?.id;
  const detail = inspection?.observations?.detail?.id;
  if (exposure === "dark") {
    return Object.freeze({ taskId: "UT-ENHANCE", presetId: "bright", label: "从“清亮”开始", reason: "像素分布整体偏暗，先温和提亮更容易比较。" });
  }
  if (exposure === "bright" || detail === "high") {
    return Object.freeze({ taskId: "UT-ENHANCE", presetId: "soft", label: "从“柔和降噪”开始", reason: exposure === "bright" ? "亮部占比较高，先使用更克制的反差与亮度。" : "局部变化较多，可先轻度降噪再比较纹理。" });
  }
  return Object.freeze({ taskId: "UT-ENHANCE", presetId: "natural", label: "从“自然增强”开始", reason: "当前像素分布没有明显极端趋势，适合从克制参数开始。" });
}

export function inspectTechnicalImageElement(image, { createCanvas = () => document.createElement("canvas"), maxEdge = 256 } = {}) {
  const sourceWidth = image?.naturalWidth ?? image?.width;
  const sourceHeight = image?.naturalHeight ?? image?.height;
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new TypeError("技术检查需要已解码的图片");
  }
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = clamp(Math.round(sourceWidth * scale), 1, maxEdge);
  const height = clamp(Math.round(sourceHeight * scale), 1, maxEdge);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext?.("2d", { alpha: true, willReadFrequently: true });
  if (!context) throw new Error("浏览器无法创建本地技术检查画布");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return inspectTechnicalPixels({ pixels: imageData.data, width, height });
}
