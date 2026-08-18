export const QUAD_POINT_NAMES = Object.freeze(["topLeft", "topRight", "bottomRight", "bottomLeft"]);

export const DEFAULT_RECTIFICATION_QUAD = Object.freeze({
  topLeft: Object.freeze({ x: 0, y: 0 }),
  topRight: Object.freeze({ x: 1, y: 0 }),
  bottomRight: Object.freeze({ x: 1, y: 1 }),
  bottomLeft: Object.freeze({ x: 0, y: 1 }),
});

const MIN_GAP = 0.04;
const MIN_AREA = 0.02;

function finiteUnit(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new RangeError(`${label}必须是 0–1 之间的数值`);
  }
  return Math.round(number * 10_000) / 10_000;
}

function point(value, label) {
  return Object.freeze({
    x: finiteUnit(value?.x, `${label} x`),
    y: finiteUnit(value?.y, `${label} y`),
  });
}

function polygonArea(quad) {
  const points = QUAD_POINT_NAMES.map((name) => quad[name]);
  return Math.abs(points.reduce((sum, current, index) => {
    const next = points[(index + 1) % points.length];
    return sum + current.x * next.y - next.x * current.y;
  }, 0)) / 2;
}

export function normalizeRectificationQuad(value = DEFAULT_RECTIFICATION_QUAD) {
  const quad = Object.freeze({
    topLeft: point(value.topLeft, "左上角"),
    topRight: point(value.topRight, "右上角"),
    bottomRight: point(value.bottomRight, "右下角"),
    bottomLeft: point(value.bottomLeft, "左下角"),
  });
  const leftMax = Math.max(quad.topLeft.x, quad.bottomLeft.x);
  const rightMin = Math.min(quad.topRight.x, quad.bottomRight.x);
  const topMax = Math.max(quad.topLeft.y, quad.topRight.y);
  const bottomMin = Math.min(quad.bottomLeft.y, quad.bottomRight.y);
  if (rightMin - leftMax < MIN_GAP - 0.000001 || bottomMin - topMax < MIN_GAP - 0.000001 || polygonArea(quad) < MIN_AREA) {
    throw new RangeError("四个角必须按左上、右上、右下、左下围成足够大的有效区域");
  }
  return quad;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function constrainRectificationPoint(quadValue, pointName, nextValue) {
  if (!QUAD_POINT_NAMES.includes(pointName)) throw new RangeError("不支持的四角名称");
  const quad = normalizeRectificationQuad(quadValue);
  let minimumX = 0;
  let maximumX = 1;
  let minimumY = 0;
  let maximumY = 1;
  if (pointName === "topLeft" || pointName === "bottomLeft") {
    maximumX = Math.min(quad.topRight.x, quad.bottomRight.x) - MIN_GAP;
  } else {
    minimumX = Math.max(quad.topLeft.x, quad.bottomLeft.x) + MIN_GAP;
  }
  if (pointName === "topLeft" || pointName === "topRight") {
    maximumY = Math.min(quad.bottomLeft.y, quad.bottomRight.y) - MIN_GAP;
  } else {
    minimumY = Math.max(quad.topLeft.y, quad.topRight.y) + MIN_GAP;
  }
  return normalizeRectificationQuad({
    ...quad,
    [pointName]: {
      x: clamp(Number(nextValue?.x), minimumX, maximumX),
      y: clamp(Number(nextValue?.y), minimumY, maximumY),
    },
  });
}

function distance(left, right, width, height) {
  return Math.hypot((right.x - left.x) * width, (right.y - left.y) * height);
}

export function rectifiedDimensions(quadValue, sourceWidth, sourceHeight) {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new TypeError("四角裁正需要有效来源尺寸");
  }
  const quad = normalizeRectificationQuad(quadValue);
  const width = (distance(quad.topLeft, quad.topRight, sourceWidth, sourceHeight)
    + distance(quad.bottomLeft, quad.bottomRight, sourceWidth, sourceHeight)) / 2;
  const height = (distance(quad.topLeft, quad.bottomLeft, sourceWidth, sourceHeight)
    + distance(quad.topRight, quad.bottomRight, sourceWidth, sourceHeight)) / 2;
  return Object.freeze({
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  });
}

function sampleBilinear(source, width, height, x, y, channel) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = source[(y0 * width + x0) * 4 + channel];
  const b = source[(y0 * width + x1) * 4 + channel];
  const c = source[(y1 * width + x0) * 4 + channel];
  const d = source[(y1 * width + x1) * 4 + channel];
  return Math.round((a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy);
}

export function rectifyRgbaPixels({ pixels, sourceWidth, sourceHeight, quad, outputWidth, outputHeight }) {
  if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)
    || pixels.length !== sourceWidth * sourceHeight * 4) {
    throw new TypeError("四角裁正需要完整 RGBA 来源像素");
  }
  if (!Number.isInteger(outputWidth) || outputWidth <= 0 || !Number.isInteger(outputHeight) || outputHeight <= 0) {
    throw new TypeError("四角裁正需要正整数输出尺寸");
  }
  const normalized = normalizeRectificationQuad(quad);
  const output = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  const xDenominator = Math.max(1, outputWidth - 1);
  const yDenominator = Math.max(1, outputHeight - 1);
  for (let y = 0; y < outputHeight; y += 1) {
    const v = y / yDenominator;
    for (let x = 0; x < outputWidth; x += 1) {
      const u = x / xDenominator;
      const topX = normalized.topLeft.x + (normalized.topRight.x - normalized.topLeft.x) * u;
      const topY = normalized.topLeft.y + (normalized.topRight.y - normalized.topLeft.y) * u;
      const bottomX = normalized.bottomLeft.x + (normalized.bottomRight.x - normalized.bottomLeft.x) * u;
      const bottomY = normalized.bottomLeft.y + (normalized.bottomRight.y - normalized.bottomLeft.y) * u;
      const sourceX = (topX + (bottomX - topX) * v) * (sourceWidth - 1);
      const sourceY = (topY + (bottomY - topY) * v) * (sourceHeight - 1);
      const index = (y * outputWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        output[index + channel] = sampleBilinear(pixels, sourceWidth, sourceHeight, sourceX, sourceY, channel);
      }
    }
  }
  return output;
}

export function drawQuadRectification({ context, source, quad, width, height }) {
  if (!context || typeof context.putImageData !== "function") throw new TypeError("四角裁正需要可写入像素的 2D context");
  const sourceContext = source?.getContext?.("2d", { alpha: true, willReadFrequently: true });
  if (!sourceContext) throw new TypeError("四角裁正需要来源 Canvas");
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const output = rectifyRgbaPixels({
    pixels,
    sourceWidth: source.width,
    sourceHeight: source.height,
    quad,
    outputWidth: width,
    outputHeight: height,
  });
  const imageData = typeof context.createImageData === "function"
    ? context.createImageData(width, height)
    : context.getImageData(0, 0, width, height);
  imageData.data.set(output);
  context.putImageData(imageData, 0, 0);
}

export function quadAsFormSettings(quadValue) {
  const quad = normalizeRectificationQuad(quadValue);
  return Object.freeze(Object.fromEntries(QUAD_POINT_NAMES.flatMap((name) => [
    [`rectify${name[0].toUpperCase()}${name.slice(1)}X`, Math.round(quad[name].x * 1000) / 10],
    [`rectify${name[0].toUpperCase()}${name.slice(1)}Y`, Math.round(quad[name].y * 1000) / 10],
  ])));
}

export function quadFromFormSettings(settings = {}) {
  const value = {};
  for (const name of QUAD_POINT_NAMES) {
    const prefix = `rectify${name[0].toUpperCase()}${name.slice(1)}`;
    value[name] = {
      x: Number(settings[`${prefix}X`]) / 100,
      y: Number(settings[`${prefix}Y`]) / 100,
    };
  }
  return normalizeRectificationQuad(value);
}
