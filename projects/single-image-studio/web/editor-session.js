import { createEditState } from "./edit-state.js";
import { renderEditedImage } from "./editor-renderer.js";
import { decodeEditorSource } from "./image-orientation.js";

function orientedDimensions(width, height, orientation) {
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

function centeredCrop(width, height, targetRatio) {
  const sourceRatio = width / height;
  if (sourceRatio > targetRatio) {
    const cropWidth = targetRatio / sourceRatio;
    return { x: (1 - cropWidth) / 2, y: 0, width: cropWidth, height: 1 };
  }
  const cropHeight = sourceRatio / targetRatio;
  return { x: 0, y: (1 - cropHeight) / 2, width: 1, height: cropHeight };
}

function ratioContract(value, width, height) {
  if (value === "square") return { crop: centeredCrop(width, height, 1), resize: { width: 1600, height: 1600 } };
  if (value === "portrait") return { crop: centeredCrop(width, height, 4 / 5), resize: { width: 1536, height: 1920 } };
  if (value === "landscape") return { crop: centeredCrop(width, height, 3 / 2), resize: { width: 1920, height: 1280 } };
  if (value === "original" || value === undefined) {
    return { crop: { x: 0, y: 0, width: 1, height: 1 }, resize: { width: null, height: null } };
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

export function editStateFromSettings({ sourceWidth, sourceHeight, sourceOrientation = 1, settings = {} }) {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new TypeError("来源尺寸无效");
  }
  if (!Number.isInteger(sourceOrientation) || sourceOrientation < 1 || sourceOrientation > 8) {
    throw new RangeError("来源 orientation 必须为 1–8");
  }
  const oriented = orientedDimensions(sourceWidth, sourceHeight, sourceOrientation);
  const ratio = ratioContract(settings.ratio, oriented.width, oriented.height);
  return createEditState({
    rotation: integerSetting(settings.rotation, 0, "旋转角度"),
    flipHorizontal: settings.flipHorizontal === true || settings.flipHorizontal === "on",
    flipVertical: settings.flipVertical === true || settings.flipVertical === "on",
    crop: ratio.crop,
    resize: { ...ratio.resize, allowUpscale: false, maxEdge: 2048, maxPixels: 16_000_000 },
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
