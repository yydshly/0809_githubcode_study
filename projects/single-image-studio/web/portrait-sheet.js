import { decodeImage } from "./local-processing.js";
import { inspectOutputMetadata } from "./output-validation.js";

export const PORTRAIT_SHEET_PRESET = Object.freeze({
  id: "six-up-landscape",
  label: "六张头像排版图",
  width: 1800,
  height: 1200,
  columns: 3,
  rows: 2,
  margin: 60,
  gap: 36,
  backgroundColor: "#FFFFFF",
  mimeType: "image/jpeg",
  quality: 0.94,
});

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} 必须是正整数`);
  return value;
}

export function createPortraitSheetPlan({ sourceWidth, sourceHeight } = {}) {
  positiveInteger(sourceWidth, "来源宽度");
  positiveInteger(sourceHeight, "来源高度");
  const preset = PORTRAIT_SHEET_PRESET;
  const cellWidth = (preset.width - preset.margin * 2 - preset.gap * (preset.columns - 1)) / preset.columns;
  const cellHeight = (preset.height - preset.margin * 2 - preset.gap * (preset.rows - 1)) / preset.rows;
  const scale = Math.min(cellWidth / sourceWidth, cellHeight / sourceHeight);
  const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
  const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
  const placements = [];
  for (let row = 0; row < preset.rows; row += 1) {
    for (let column = 0; column < preset.columns; column += 1) {
      const cellX = preset.margin + column * (cellWidth + preset.gap);
      const cellY = preset.margin + row * (cellHeight + preset.gap);
      placements.push(Object.freeze({
        x: Math.round(cellX + (cellWidth - drawWidth) / 2),
        y: Math.round(cellY + (cellHeight - drawHeight) / 2),
        width: drawWidth,
        height: drawHeight,
      }));
    }
  }
  return Object.freeze({
    ...preset,
    sourceWidth,
    sourceHeight,
    placements: Object.freeze(placements),
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("浏览器无法导出头像排版图")), mimeType, quality);
  });
}

export async function renderPortraitSheet({ image, canvasFactory = () => document.createElement("canvas") } = {}) {
  const sourceWidth = image?.naturalWidth ?? image?.width;
  const sourceHeight = image?.naturalHeight ?? image?.height;
  const plan = createPortraitSheetPlan({ sourceWidth, sourceHeight });
  const canvas = canvasFactory();
  canvas.width = plan.width;
  canvas.height = plan.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("浏览器无法创建头像排版画布");
  context.fillStyle = plan.backgroundColor;
  context.fillRect(0, 0, plan.width, plan.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  for (const placement of plan.placements) {
    context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  }

  const blob = await canvasToBlob(canvas, plan.mimeType, plan.quality);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const metadata = inspectOutputMetadata(bytes, plan.mimeType);
  if (metadata.privateMetadata.length > 0) throw new Error("头像排版图包含未允许的私密 metadata");

  const reopenedUrl = URL.createObjectURL(blob);
  try {
    const reopened = await decodeImage(reopenedUrl);
    if (reopened.naturalWidth !== plan.width || reopened.naturalHeight !== plan.height) {
      throw new Error("头像排版图重开尺寸与计划不一致");
    }
  } finally {
    URL.revokeObjectURL(reopenedUrl);
  }

  return Object.freeze({
    blob,
    width: plan.width,
    height: plan.height,
    mimeType: plan.mimeType,
    byteLength: blob.size,
    copies: plan.placements.length,
  });
}
