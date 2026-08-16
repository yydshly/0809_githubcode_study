const TOOLS = new Set(["keep", "erase"]);

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label}必须是正整数`);
  return value;
}

function normalizedNumber(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${label}必须在 0–1 之间`);
  return value;
}

function pixels(value, requiredLength, label) {
  if (!(value instanceof Uint8Array || value instanceof Uint8ClampedArray) || value.length !== requiredLength) {
    throw new TypeError(`${label}像素长度无效`);
  }
  return value;
}

function strokeValue(stroke) {
  if (!stroke || !TOOLS.has(stroke.tool)) throw new TypeError("蒙版画笔必须是保留或擦除");
  if (!Number.isFinite(stroke.radius) || stroke.radius < 0.002 || stroke.radius > 0.25) {
    throw new RangeError("蒙版画笔尺寸超出范围");
  }
  if (!Array.isArray(stroke.points) || stroke.points.length < 1 || stroke.points.length > 4096) {
    throw new TypeError("蒙版笔画必须包含有限数量的坐标");
  }
  return {
    tool: stroke.tool,
    radius: stroke.radius,
    points: stroke.points.map((point) => ({
      x: normalizedNumber(point?.x, "画笔横坐标"),
      y: normalizedNumber(point?.y, "画笔纵坐标"),
    })),
  };
}

export function previewCorrectionDimensions(width, height, maxEdge = 1024) {
  positiveInteger(width, "图片宽度");
  positiveInteger(height, "图片高度");
  positiveInteger(maxEdge, "预览上限");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return Object.freeze({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  });
}

export function validateCorrectionExportDimensions(width, height, { maxPixels = 16_000_000, maxEdge = 8192 } = {}) {
  positiveInteger(width, "图片宽度");
  positiveInteger(height, "图片高度");
  positiveInteger(maxPixels, "修正输出像素上限");
  positiveInteger(maxEdge, "修正输出单边上限");
  if (width > maxEdge || height > maxEdge || width * height > maxPixels) {
    throw new RangeError(`当前图片超出人工修正导出的 ${maxPixels.toLocaleString()} 像素 / ${maxEdge}px 单边上限，请先在基础编辑器缩小尺寸`);
  }
  return Object.freeze({ width, height, pixels: width * height });
}

export function createMaskCorrectionHistory({ width, height, initialAlpha, maxStrokes = 200 }) {
  positiveInteger(width, "蒙版宽度");
  positiveInteger(height, "蒙版高度");
  positiveInteger(maxStrokes, "历史上限");
  pixels(initialAlpha, width * height, "初始 Alpha");
  return Object.freeze({
    width,
    height,
    initialAlpha: new Uint8ClampedArray(initialAlpha),
    strokes: Object.freeze([]),
    index: 0,
    maxStrokes,
  });
}

export function commitMaskStroke(history, stroke) {
  const nextStroke = Object.freeze(strokeValue(stroke));
  const active = history.strokes.slice(0, history.index);
  active.push(nextStroke);
  if (active.length > history.maxStrokes) {
    throw new RangeError(`修正历史最多保留 ${history.maxStrokes} 笔，请先撤销或重置后继续`);
  }
  return Object.freeze({
    ...history,
    strokes: Object.freeze(active),
    index: active.length,
  });
}

export function undoMaskStroke(history) {
  return history.index === 0 ? history : Object.freeze({ ...history, index: history.index - 1 });
}

export function redoMaskStroke(history) {
  return history.index >= history.strokes.length
    ? history
    : Object.freeze({ ...history, index: history.index + 1 });
}

export function resetMaskCorrection(history) {
  return history.index === 0 && history.strokes.length === 0
    ? history
    : Object.freeze({ ...history, strokes: Object.freeze([]), index: 0 });
}

function paintCircle(mask, width, height, stroke, point) {
  const radius = Math.max(1, stroke.radius * Math.min(width, height));
  const hardRadius = radius * 0.78;
  const centerX = point.x * (width - 1);
  const centerY = point.y * (height - 1);
  const left = Math.max(0, Math.floor(centerX - radius));
  const right = Math.min(width - 1, Math.ceil(centerX + radius));
  const top = Math.max(0, Math.floor(centerY - radius));
  const bottom = Math.min(height - 1, Math.ceil(centerY + radius));
  const target = stroke.tool === "keep" ? 255 : 0;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance > radius) continue;
      const weight = distance <= hardRadius ? 1 : (radius - distance) / (radius - hardRadius);
      const offset = y * width + x;
      mask[offset] = Math.round(mask[offset] + (target - mask[offset]) * weight);
    }
  }
}

export function applyMaskStroke(mask, width, height, stroke) {
  positiveInteger(width, "蒙版宽度");
  positiveInteger(height, "蒙版高度");
  pixels(mask, width * height, "蒙版");
  const value = strokeValue(stroke);
  let previous = value.points[0];
  paintCircle(mask, width, height, value, previous);
  for (const point of value.points.slice(1)) {
    const distance = Math.hypot(
      (point.x - previous.x) * width,
      (point.y - previous.y) * height,
    );
    const radiusPixels = value.radius * Math.min(width, height);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radiusPixels * 0.4)));
    for (let step = 1; step <= steps; step += 1) {
      const fraction = step / steps;
      paintCircle(mask, width, height, value, {
        x: previous.x + (point.x - previous.x) * fraction,
        y: previous.y + (point.y - previous.y) * fraction,
      });
    }
    previous = point;
  }
  return mask;
}

export function rebuildCorrectionMask(history) {
  const mask = new Uint8ClampedArray(history.initialAlpha);
  for (const stroke of history.strokes.slice(0, history.index)) {
    applyMaskStroke(mask, history.width, history.height, stroke);
  }
  return mask;
}

export function composeCorrectedPixels({ sourcePixels, resultPixels, mask, width, height }) {
  positiveInteger(width, "合成宽度");
  positiveInteger(height, "合成高度");
  const length = width * height * 4;
  const source = pixels(sourcePixels, length, "原图");
  const result = pixels(resultPixels, length, "抠图结果");
  pixels(mask, width * height, "蒙版");
  const output = new Uint8ClampedArray(length);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const useProviderColor = result[offset + 3] > 0;
    output[offset] = useProviderColor ? result[offset] : source[offset];
    output[offset + 1] = useProviderColor ? result[offset + 1] : source[offset + 1];
    output[offset + 2] = useProviderColor ? result[offset + 2] : source[offset + 2];
    output[offset + 3] = mask[pixel];
  }
  return output;
}

export function summarizeCorrectionMask(mask) {
  if (!(mask instanceof Uint8Array || mask instanceof Uint8ClampedArray)) {
    throw new TypeError("蒙版必须是 byte array");
  }
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  for (const alpha of mask) {
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;
  }
  return Object.freeze({ transparent, partial, opaque, total: mask.length });
}
