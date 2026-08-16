import { createEditState } from "./edit-state.js";
import { sha256Bytes } from "./source-file.js";

function positiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} 必须是正数`);
  return value;
}

function transformedDimensions(width, height, rotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
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
  if (sourceOrientation !== 1) {
    throw new RangeError("来源 EXIF orientation 必须先归一化为 1");
  }
  const transformed = transformedDimensions(sourceWidth, sourceHeight, editState.rotation);
  const crop = {
    x: transformed.width * editState.crop.x,
    y: transformed.height * editState.crop.y,
    width: transformed.width * editState.crop.width,
    height: transformed.height * editState.crop.height,
  };
  const output = outputDimensions(crop.width, crop.height, editState.resize);
  return Object.freeze({
    source: Object.freeze({ width: sourceWidth, height: sourceHeight, orientation: sourceOrientation }),
    transformed: Object.freeze(transformed),
    crop: Object.freeze(crop),
    output: Object.freeze(output),
    rotation: editState.rotation,
    flipHorizontal: editState.flipHorizontal,
    flipVertical: editState.flipVertical,
    filter: `brightness(${100 + editState.adjustments.brightness}%) contrast(${100 + editState.adjustments.contrast}%) saturate(${100 + editState.adjustments.saturation}%)`,
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
    return { width: image.naturalWidth, height: image.naturalHeight };
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
  const sourceWidth = positiveDimension(image?.naturalWidth, "解码宽度");
  const sourceHeight = positiveDimension(image?.naturalHeight, "解码高度");
  const plan = buildRenderPlan({ sourceWidth, sourceHeight, editState, sourceOrientation });

  const transformedCanvas = createCanvas("transform");
  transformedCanvas.width = plan.transformed.width;
  transformedCanvas.height = plan.transformed.height;
  const transformedContext = canvasContext(transformedCanvas, true);
  transformedContext.save();
  transformedContext.translate(plan.transformed.width / 2, plan.transformed.height / 2);
  transformedContext.scale(plan.flipHorizontal ? -1 : 1, plan.flipVertical ? -1 : 1);
  transformedContext.rotate(plan.rotation * Math.PI / 180);
  transformedContext.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  transformedContext.restore();

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
    transformedCanvas,
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

  const blob = await encode(
    outputCanvas,
    plan.mime,
    plan.mime === "image/jpeg" ? plan.jpegQuality : undefined,
  );
  if (!(blob instanceof Blob) || blob.size <= 0 || blob.type !== plan.mime) {
    throw new Error("renderer 返回了无效编码结果");
  }
  const outputHash = await sha256Bytes(new Uint8Array(await blob.arrayBuffer()));
  const reopened = await reopen(blob);
  if (reopened?.width !== plan.output.width || reopened?.height !== plan.output.height) {
    throw new Error("导出重开尺寸与 renderer 计划不一致");
  }

  return Object.freeze({
    blob,
    mime: plan.mime,
    width: plan.output.width,
    height: plan.output.height,
    byteLength: blob.size,
    outputHash,
    alphaMode: plan.alphaMode,
    renderPlan: plan,
    validationSummary: "已从编码 bytes 独立重开并核对格式、尺寸与文件大小；像素级 Alpha/色彩验证仍待 fixture 阶段完成",
    renderer: "editor-canvas-renderer-v1",
  });
}
