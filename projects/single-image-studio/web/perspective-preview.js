import { drawVerticalPerspective } from "./vertical-perspective.js";

function context2d(canvas) {
  const context = canvas?.getContext?.("2d", { alpha: true });
  if (!context) throw new Error("当前浏览器无法创建垂直透视预览画布");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

export function perspectivePreviewSize(transformed, maximumEdge = 720) {
  if (!Number.isFinite(transformed?.width) || transformed.width <= 0
    || !Number.isFinite(transformed?.height) || transformed.height <= 0) {
    throw new TypeError("透视预览需要有效的变换尺寸");
  }
  const scale = Math.min(1, maximumEdge / Math.max(transformed.width, transformed.height));
  return Object.freeze({
    width: Math.max(1, Math.round(transformed.width * scale)),
    height: Math.max(1, Math.round(transformed.height * scale)),
    scale,
  });
}

export function renderPerspectivePreview({
  canvas,
  image,
  geometry,
  filter = "none",
  createCanvas = () => document.createElement("canvas"),
  maximumEdge = 720,
}) {
  if (!image || Number(image.naturalWidth ?? image.width) <= 0 || Number(image.naturalHeight ?? image.height) <= 0) {
    return false;
  }
  if (!geometry || geometry.verticalPerspective === 0) return false;
  const size = perspectivePreviewSize(geometry.transformed, maximumEdge);
  const base = createCanvas("perspective-preview-base");
  base.width = size.width;
  base.height = size.height;
  const baseContext = context2d(base);
  baseContext.clearRect(0, 0, base.width, base.height);
  baseContext.save();
  baseContext.translate(base.width / 2, base.height / 2);
  baseContext.scale(
    size.scale * (geometry.flipHorizontal ? -1 : 1) * geometry.straightenScale,
    size.scale * (geometry.flipVertical ? -1 : 1) * geometry.straightenScale,
  );
  baseContext.rotate((geometry.rotation + geometry.straighten) * Math.PI / 180);
  baseContext.filter = filter;
  baseContext.drawImage(
    image,
    -geometry.oriented.width / 2,
    -geometry.oriented.height / 2,
    geometry.oriented.width,
    geometry.oriented.height,
  );
  baseContext.restore();

  canvas.width = size.width;
  canvas.height = size.height;
  const outputContext = context2d(canvas);
  outputContext.clearRect(0, 0, canvas.width, canvas.height);
  drawVerticalPerspective({
    context: outputContext,
    source: base,
    width: canvas.width,
    height: canvas.height,
    value: geometry.verticalPerspective,
  });
  return true;
}
