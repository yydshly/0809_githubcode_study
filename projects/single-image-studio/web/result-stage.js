function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label}必须是正数`);
  return number;
}

export function orientedMediaDimensions(width, height, orientation = 1) {
  const sourceWidth = positiveNumber(width, "图片宽度");
  const sourceHeight = positiveNumber(height, "图片高度");
  if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) {
    throw new RangeError("图片 orientation 必须为 1–8");
  }
  return orientation >= 5
    ? Object.freeze({ width: sourceHeight, height: sourceWidth })
    : Object.freeze({ width: sourceWidth, height: sourceHeight });
}

export function fitComparisonStage({ mediaWidth, mediaHeight, availableWidth, maxHeight }) {
  const width = positiveNumber(mediaWidth, "媒体宽度");
  const height = positiveNumber(mediaHeight, "媒体高度");
  const widthLimit = positiveNumber(availableWidth, "可用宽度");
  const heightLimit = positiveNumber(maxHeight, "可用高度");
  const ratio = width / height;
  const fittedWidth = Math.min(widthLimit, heightLimit * ratio);
  const fittedHeight = fittedWidth / ratio;
  return Object.freeze({
    width: fittedWidth,
    height: fittedHeight,
    ratio,
    aspectRatio: `${width} / ${height}`,
  });
}
