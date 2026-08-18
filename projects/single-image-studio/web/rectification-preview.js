import { drawQuadRectification, rectifiedDimensions } from "./quad-rectification.js";
import { drawVerticalPerspective } from "./vertical-perspective.js";
import { applyDocumentScanPixels } from "./document-scan.js";

function context2d(canvas, options = { alpha: true }) {
  const context = canvas?.getContext?.("2d", options);
  if (!context) throw new Error("当前浏览器无法创建四角裁正预览画布");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

export function rectificationPreviewSize(transformed, quad, maximumEdge = 720) {
  const sourceScale = Math.min(1, maximumEdge / Math.max(transformed.width, transformed.height));
  const scaledSource = {
    width: Math.max(1, Math.round(transformed.width * sourceScale)),
    height: Math.max(1, Math.round(transformed.height * sourceScale)),
  };
  const raw = rectifiedDimensions(quad, scaledSource.width, scaledSource.height);
  const outputScale = Math.min(1, maximumEdge / Math.max(raw.width, raw.height));
  return Object.freeze({
    sourceWidth: scaledSource.width,
    sourceHeight: scaledSource.height,
    sourceScale,
    width: Math.max(1, Math.round(raw.width * outputScale)),
    height: Math.max(1, Math.round(raw.height * outputScale)),
  });
}

export function renderRectificationPreview({
  canvas,
  image,
  geometry,
  filter = "none",
  createCanvas = () => document.createElement("canvas"),
  maximumEdge = 720,
  documentScanMode = "original",
}) {
  if (!image || Number(image.naturalWidth ?? image.width) <= 0 || Number(image.naturalHeight ?? image.height) <= 0) {
    return false;
  }
  if (!geometry?.rectification?.enabled) return false;
  const size = rectificationPreviewSize(geometry.transformed, geometry.rectification.quad, maximumEdge);
  const base = createCanvas("rectification-preview-base");
  base.width = size.sourceWidth;
  base.height = size.sourceHeight;
  const baseContext = context2d(base);
  baseContext.save();
  baseContext.translate(base.width / 2, base.height / 2);
  baseContext.scale(
    size.sourceScale * (geometry.flipHorizontal ? -1 : 1) * geometry.straightenScale,
    size.sourceScale * (geometry.flipVertical ? -1 : 1) * geometry.straightenScale,
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

  let geometrySource = base;
  if (geometry.verticalPerspective !== 0) {
    const perspective = createCanvas("rectification-preview-perspective");
    perspective.width = base.width;
    perspective.height = base.height;
    drawVerticalPerspective({
      context: context2d(perspective),
      source: base,
      width: base.width,
      height: base.height,
      value: geometry.verticalPerspective,
    });
    geometrySource = perspective;
  }

  canvas.width = size.width;
  canvas.height = size.height;
  const outputContext = context2d(canvas, { alpha: true, willReadFrequently: true });
  outputContext.clearRect(0, 0, canvas.width, canvas.height);
  drawQuadRectification({
    context: outputContext,
    source: geometrySource,
    quad: geometry.rectification.quad,
    width: canvas.width,
    height: canvas.height,
  });
  if (documentScanMode !== "original") {
    const imageData = outputContext.getImageData(0, 0, canvas.width, canvas.height);
    imageData.data.set(applyDocumentScanPixels({
      pixels: imageData.data,
      width: canvas.width,
      height: canvas.height,
      mode: documentScanMode,
    }));
    outputContext.putImageData(imageData, 0, 0);
  }
  return true;
}
