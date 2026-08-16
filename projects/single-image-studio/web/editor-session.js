import { createEditState } from "./edit-state.js";
import { renderEditedImage } from "./editor-renderer.js";
import { decodeEditorSource } from "./image-orientation.js";

function orientedDimensions(width, height, orientation) {
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

const EDITOR_OUTPUT_MAX_EDGE = 2048;

function unit(value) {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function percentSetting(value, fallback, label) {
  const number = integerSetting(value, fallback, label);
  if (number < 0 || number > 100) throw new RangeError(`${label} 必须是 0–100 的整数`);
  return number;
}

function positionedCrop(width, height, targetRatio, positionX = 50, positionY = 50) {
  const sourceRatio = width / height;
  if (sourceRatio > targetRatio) {
    const cropWidth = unit(targetRatio / sourceRatio);
    return { x: unit((1 - cropWidth) * positionX / 100), y: 0, width: cropWidth, height: 1 };
  }
  const cropHeight = unit(sourceRatio / targetRatio);
  return { x: 0, y: unit((1 - cropHeight) * positionY / 100), width: 1, height: cropHeight };
}

function freeCropContract(settings, width, height) {
  const left = percentSetting(settings.cropLeft, 0, "自由裁剪左边界");
  const top = percentSetting(settings.cropTop, 0, "自由裁剪上边界");
  const cropWidth = percentSetting(settings.cropWidth, 100, "自由裁剪宽度");
  const cropHeight = percentSetting(settings.cropHeight, 100, "自由裁剪高度");
  if (cropWidth < 10 || cropHeight < 10) throw new RangeError("自由裁剪宽高至少保留原图的 10%");
  if (left + cropWidth > 100 || top + cropHeight > 100) {
    throw new RangeError("自由裁剪区域必须完整位于原图内");
  }
  return {
    crop: { x: unit(left / 100), y: unit(top / 100), width: unit(cropWidth / 100), height: unit(cropHeight / 100) },
    resize: { width: null, height: null },
    aspect: width * cropWidth / (height * cropHeight),
  };
}

function ratioContract(value, width, height, positionX, positionY, settings) {
  if (value === "square") return { crop: positionedCrop(width, height, 1, positionX, positionY), resize: { width: 1600, height: 1600 }, aspect: 1 };
  if (value === "portrait") return { crop: positionedCrop(width, height, 4 / 5, positionX, positionY), resize: { width: 1536, height: 1920 }, aspect: 4 / 5 };
  if (value === "landscape") return { crop: positionedCrop(width, height, 3 / 2, positionX, positionY), resize: { width: 1920, height: 1280 }, aspect: 3 / 2 };
  if (value === "free") return freeCropContract(settings, width, height);
  if (value === "original" || value === undefined) {
    return { crop: { x: 0, y: 0, width: 1, height: 1 }, resize: { width: null, height: null }, aspect: width / height };
  }
  throw new RangeError("不支持的画面比例");
}

function integerSetting(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${label} 必须是整数`);
  return number;
}

function outputFormat(value) {
  if (value === undefined || value === "png") return "png";
  if (value === "jpeg") return "jpeg";
  throw new RangeError("不支持的输出格式");
}

export function outputBoundsFromLongEdge(aspect, value) {
  const longEdge = integerSetting(value, null, "最长边上限");
  if (!Number.isFinite(aspect) || aspect <= 0) throw new TypeError("当前画面比例无效");
  if (longEdge === null) throw new TypeError("自定义尺寸需要最长边上限");
  if (longEdge < 1 || longEdge > EDITOR_OUTPUT_MAX_EDGE) {
    throw new RangeError(`最长边上限必须是 1–${EDITOR_OUTPUT_MAX_EDGE} 像素`);
  }
  return aspect >= 1
    ? { width: longEdge, height: Math.max(1, Math.round(longEdge / aspect)) }
    : { width: Math.max(1, Math.round(longEdge * aspect)), height: longEdge };
}

function customResize(settings, ratio) {
  const mode = settings.sizeMode ?? "preset";
  if (mode === "preset") return { ...ratio.resize, mode: "preset" };
  if (mode !== "custom") throw new RangeError("不支持的输出尺寸模式");
  if (settings.outputLongEdge !== undefined && settings.outputLongEdge !== null && settings.outputLongEdge !== "") {
    return { ...outputBoundsFromLongEdge(ratio.aspect, settings.outputLongEdge), mode: "custom" };
  }
  const width = integerSetting(settings.outputWidth, null, "输出宽度");
  const height = integerSetting(settings.outputHeight, null, "输出高度");
  if (width === null || height === null) throw new TypeError("自定义尺寸需要最长边上限");
  if (width < 1 || width > EDITOR_OUTPUT_MAX_EDGE || height < 1 || height > EDITOR_OUTPUT_MAX_EDGE) {
    throw new RangeError(`输出宽高必须是 1–${EDITOR_OUTPUT_MAX_EDGE} 像素`);
  }
  const tolerance = 1 / Math.max(1, Math.min(width, height));
  if (Math.abs(width / height - ratio.aspect) > tolerance) {
    throw new RangeError("输出宽高必须与当前画面比例一致");
  }
  return { width, height, mode: "custom" };
}

export function editStateFromSettings({ sourceWidth, sourceHeight, sourceOrientation = 1, settings = {} }) {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new TypeError("来源尺寸无效");
  }
  if (!Number.isInteger(sourceOrientation) || sourceOrientation < 1 || sourceOrientation > 8) {
    throw new RangeError("来源 orientation 必须为 1–8");
  }
  const rotation = integerSetting(settings.rotation, 0, "旋转角度");
  const oriented = orientedDimensions(sourceWidth, sourceHeight, sourceOrientation);
  const transformed = rotation === 90 || rotation === 270
    ? { width: oriented.height, height: oriented.width }
    : oriented;
  const cropX = percentSetting(settings.cropX, 50, "水平构图位置");
  const cropY = percentSetting(settings.cropY, 50, "垂直构图位置");
  const ratio = ratioContract(settings.ratio, transformed.width, transformed.height, cropX, cropY, settings);
  const resize = customResize(settings, ratio);
  return createEditState({
    rotation,
    flipHorizontal: settings.flipHorizontal === true || settings.flipHorizontal === "on",
    flipVertical: settings.flipVertical === true || settings.flipVertical === "on",
    cropMode: settings.ratio ?? "original",
    crop: ratio.crop,
    resize: { ...resize, allowUpscale: false, maxEdge: EDITOR_OUTPUT_MAX_EDGE, maxPixels: 16_000_000 },
    adjustments: {
      brightness: integerSetting(settings.brightness, 0, "亮度"),
      contrast: integerSetting(settings.contrast, 0, "对比度"),
      saturation: integerSetting(settings.saturation, 0, "饱和度"),
    },
    output: {
      format: outputFormat(settings.format),
      jpegQuality: 0.92,
      jpegBackground: settings.jpegBackground || "#ffffff",
    },
  });
}

export async function runLocalEditor({
  file,
  settings = {},
  decode = decodeEditorSource,
  render = renderEditedImage,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
}) {
  if (!file || typeof file.arrayBuffer !== "function") throw new TypeError("本地编辑需要来源 File/Blob");
  const decoded = await decode(file);
  try {
    const editState = editStateFromSettings({
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      sourceOrientation: decoded.sourceOrientation,
      settings,
    });
    const rendered = await render({
      image: decoded.image,
      sourceOrientation: decoded.sourceOrientation,
      editState,
    });
    const extension = rendered.mime === "image/jpeg" ? "jpg" : "png";
    return Object.freeze({
      ...rendered,
      url: createObjectUrl(rendered.blob),
      extension,
      hasAlpha: rendered.mime === "image/png"
        && (rendered.pixelValidation.transparentPixels > 0 || rendered.pixelValidation.partialAlphaPixels > 0),
      processor: "editor-canvas-renderer-v1",
      editState,
      sourceOrientation: decoded.sourceOrientation,
    });
  } finally {
    decoded.close?.();
  }
}
