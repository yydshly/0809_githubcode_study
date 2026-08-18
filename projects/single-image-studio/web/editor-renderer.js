import { createEditState } from "./edit-state.js";
import { enhanceDetailPixels } from "./detail-enhancement.js";
import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";
import { sha256Bytes } from "./source-file.js";
import { straightenCoverScale } from "./straighten-geometry.js";
import { drawVerticalPerspective, verticalPerspectiveProfile } from "./vertical-perspective.js";
import { drawQuadRectification, rectifiedDimensions } from "./quad-rectification.js";
import { applyDocumentScanPixels } from "./document-scan.js";

function positiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} 必须是正数`);
  return value;
}

function transformedDimensions(width, height, rotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

function orientedDimensions(width, height, orientation) {
  return orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}

function orientationTransform(orientation, width, height) {
  return {
    2: [-1, 0, 0, 1, width, 0],
    3: [-1, 0, 0, -1, width, height],
    4: [1, 0, 0, -1, 0, height],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, height, 0],
    7: [0, -1, -1, 0, height, width],
    8: [0, -1, 1, 0, 0, width],
  }[orientation];
}

function outputDimensions(cropWidth, cropHeight, resize) {
  const requestedWidth = resize.width ?? Number.POSITIVE_INFINITY;
  const requestedHeight = resize.height ?? Number.POSITIVE_INFINITY;
  const scale = Math.min(
    requestedWidth / cropWidth,
    requestedHeight / cropHeight,
    resize.maxEdge / Math.max(cropWidth, cropHeight),
    Math.sqrt(resize.maxPixels / (cropWidth * cropHeight)),
    resize.allowUpscale ? Number.POSITIVE_INFINITY : 1,
  );
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("无法计算有效输出尺寸");
  return {
    width: Math.max(1, Math.round(cropWidth * scale)),
    height: Math.max(1, Math.round(cropHeight * scale)),
  };
}

export function buildRenderPlan({ sourceWidth, sourceHeight, editState = createEditState(), sourceOrientation = 1 }) {
  positiveDimension(sourceWidth, "来源宽度");
  positiveDimension(sourceHeight, "来源高度");
  if (!Number.isInteger(sourceOrientation) || sourceOrientation < 1 || sourceOrientation > 8) {
    throw new RangeError("来源 EXIF orientation 必须为 1–8");
  }
  const oriented = orientedDimensions(sourceWidth, sourceHeight, sourceOrientation);
  const transformed = transformedDimensions(oriented.width, oriented.height, editState.rotation);
  const coverScale = straightenCoverScale(transformed.width, transformed.height, editState.straighten);
  const perspective = verticalPerspectiveProfile(editState.verticalPerspective);
  const rectified = editState.rectification.enabled
    ? rectifiedDimensions(editState.rectification.quad, transformed.width, transformed.height)
    : transformed;
  const crop = {
    x: rectified.width * editState.crop.x,
    y: rectified.height * editState.crop.y,
    width: rectified.width * editState.crop.width,
    height: rectified.height * editState.crop.height,
  };
  const output = outputDimensions(crop.width, crop.height, editState.resize);
  return Object.freeze({
    source: Object.freeze({ width: sourceWidth, height: sourceHeight, orientation: sourceOrientation }),
    oriented: Object.freeze(oriented),
    transformed: Object.freeze(transformed),
    rectified: Object.freeze(rectified),
    crop: Object.freeze(crop),
    output: Object.freeze(output),
    rotation: editState.rotation,
    straighten: editState.straighten,
    straightenScale: coverScale,
    verticalPerspective: perspective.amount,
    verticalPerspectiveScale: perspective.coverScale,
    rectification: editState.rectification,
    documentScan: editState.documentScan,
    flipHorizontal: editState.flipHorizontal,
    flipVertical: editState.flipVertical,
    filter: `brightness(${100 + editState.adjustments.brightness}%) contrast(${100 + editState.adjustments.contrast}%) saturate(${100 + editState.adjustments.saturation}%)`,
    detailEnhancement: editState.detailEnhancement,
    mime: editState.output.format === "jpeg" ? "image/jpeg" : "image/png",
    jpegQuality: editState.output.jpegQuality,
    jpegBackground: editState.output.jpegBackground,
    alphaMode: editState.output.format === "png" ? "preserve" : "flatten-on-explicit-background",
  });
}

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("浏览器无法导出图片")), type, quality);
});

async function reopenBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
    if (!context) throw new Error("浏览器无法创建独立重开画布");
    context.drawImage(image, 0, 0);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasContext(canvas, alpha) {
  if (!canvas || typeof canvas.getContext !== "function" || typeof canvas.toBlob !== "function") {
    throw new TypeError("renderer 需要可导出的 Canvas");
  }
  const context = canvas.getContext("2d", { alpha });
  if (!context) throw new Error("浏览器无法创建 2D 画布");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

export async function renderEditedImage({
  image,
  editState = createEditState(),
  sourceOrientation = 1,
  createCanvas = () => document.createElement("canvas"),
  encode = canvasToBlob,
  reopen = reopenBlob,
}) {
  const sourceWidth = positiveDimension(image?.naturalWidth ?? image?.width, "解码宽度");
  const sourceHeight = positiveDimension(image?.naturalHeight ?? image?.height, "解码高度");
  const plan = buildRenderPlan({ sourceWidth, sourceHeight, editState, sourceOrientation });

  let orientedSource = image;
  if (sourceOrientation !== 1) {
    const orientedCanvas = createCanvas("orientation");
    orientedCanvas.width = plan.oriented.width;
    orientedCanvas.height = plan.oriented.height;
    const orientedContext = canvasContext(orientedCanvas, true);
    orientedContext.setTransform(...orientationTransform(sourceOrientation, sourceWidth, sourceHeight));
    orientedContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    orientedSource = orientedCanvas;
  }

  const transformedCanvas = createCanvas("transform");
  transformedCanvas.width = plan.transformed.width;
  transformedCanvas.height = plan.transformed.height;
  const transformedContext = canvasContext(transformedCanvas, true);
  transformedContext.save();
  transformedContext.translate(plan.transformed.width / 2, plan.transformed.height / 2);
  transformedContext.scale(
    (plan.flipHorizontal ? -1 : 1) * plan.straightenScale,
    (plan.flipVertical ? -1 : 1) * plan.straightenScale,
  );
  transformedContext.rotate((plan.rotation + plan.straighten) * Math.PI / 180);
  transformedContext.drawImage(
    orientedSource,
    -plan.oriented.width / 2,
    -plan.oriented.height / 2,
    plan.oriented.width,
    plan.oriented.height,
  );
  transformedContext.restore();

  let geometrySource = transformedCanvas;
  if (plan.verticalPerspective !== 0) {
    const perspectiveCanvas = createCanvas("perspective");
    perspectiveCanvas.width = plan.transformed.width;
    perspectiveCanvas.height = plan.transformed.height;
    const perspectiveContext = canvasContext(perspectiveCanvas, true);
    drawVerticalPerspective({
      context: perspectiveContext,
      source: transformedCanvas,
      width: perspectiveCanvas.width,
      height: perspectiveCanvas.height,
      value: plan.verticalPerspective,
    });
    geometrySource = perspectiveCanvas;
  }

  if (plan.rectification.enabled) {
    const rectifiedCanvas = createCanvas("rectification");
    rectifiedCanvas.width = plan.rectified.width;
    rectifiedCanvas.height = plan.rectified.height;
    const rectifiedContext = canvasContext(rectifiedCanvas, true);
    drawQuadRectification({
      context: rectifiedContext,
      source: geometrySource,
      quad: plan.rectification.quad,
      width: rectifiedCanvas.width,
      height: rectifiedCanvas.height,
    });
    geometrySource = rectifiedCanvas;
  }

  const outputCanvas = createCanvas("output");
  outputCanvas.width = plan.output.width;
  outputCanvas.height = plan.output.height;
  const outputContext = canvasContext(outputCanvas, plan.mime === "image/png");
  if (plan.mime === "image/jpeg") {
    outputContext.fillStyle = plan.jpegBackground;
    outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
  outputContext.filter = plan.filter;
  outputContext.drawImage(
    geometrySource,
    plan.crop.x,
    plan.crop.y,
    plan.crop.width,
    plan.crop.height,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height,
  );
  outputContext.filter = "none";

  if (plan.detailEnhancement.denoise > 0 || plan.detailEnhancement.clarity > 0) {
    const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    imageData.data.set(enhanceDetailPixels({
      pixels: imageData.data,
      width: outputCanvas.width,
      height: outputCanvas.height,
      ...plan.detailEnhancement,
    }));
    outputContext.putImageData(imageData, 0, 0);
  }

  if (plan.documentScan.mode !== "original") {
    const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    imageData.data.set(applyDocumentScanPixels({
      pixels: imageData.data,
      width: outputCanvas.width,
      height: outputCanvas.height,
      mode: plan.documentScan.mode,
    }));
    outputContext.putImageData(imageData, 0, 0);
  }

  const blob = await encode(
    outputCanvas,
    plan.mime,
    plan.mime === "image/jpeg" ? plan.jpegQuality : undefined,
  );
  if (!(blob instanceof Blob) || blob.size <= 0 || blob.type !== plan.mime) {
    throw new Error("renderer 返回了无效编码结果");
  }
  const encodedBytes = new Uint8Array(await blob.arrayBuffer());
  const outputHash = await sha256Bytes(encodedBytes);
  const metadataInspection = inspectOutputMetadata(encodedBytes, plan.mime);
  const expectedPixels = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data;
  const reopened = await reopen(blob);
  if (reopened?.width !== plan.output.width || reopened?.height !== plan.output.height) {
    throw new Error("导出重开尺寸与 renderer 计划不一致");
  }
  const pixelValidation = verifyPixelRoundTrip({
    expected: expectedPixels,
    actual: reopened.pixels,
    width: plan.output.width,
    height: plan.output.height,
    mime: plan.mime,
  });

  return Object.freeze({
    blob,
    mime: plan.mime,
    width: plan.output.width,
    height: plan.output.height,
    byteLength: blob.size,
    outputHash,
    alphaMode: plan.alphaMode,
    metadataInspection,
    pixelValidation,
    renderPlan: plan,
    validationSummary: "已从编码 bytes 独立重开并核对格式、尺寸、Alpha/可见颜色、私密 metadata 与文件大小；ICC 色彩转换仍待真实浏览器 fixture 完成",
    renderer: "editor-canvas-renderer-v1",
  });
}
