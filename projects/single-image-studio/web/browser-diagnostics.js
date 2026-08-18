import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";
import { renderEditedImage } from "./editor-renderer.js";
import { editStateFromSettings } from "./editor-session.js";
import {
  commitMaskStroke,
  composeCorrectedPixels,
  composeSolidBackgroundPixels,
  createMaskCorrectionHistory,
  rebuildCorrectionMask,
} from "./mask-correction.js";
import { applyRecoveryPresentation, recoveryPresentation } from "./recovery-presentation.js";
import { ERROR_CONTEXTS, applyErrorPagePresentation, errorPagePresentation } from "./error-presentation.js";
import {
  alphaBoundsFromRgba,
  drawProductComposition,
  productOutputSetEntries,
} from "./product-composition.js";
import { drawPortraitComposition, portraitOutputSetEntries } from "./portrait-composition.js";
import { createStoredZip } from "./zip-bundle.js";
import { SOCIAL_OUTPUT_PRESETS, applySceneTemplate } from "./scene-template-presets.js";
import { drawSocialOverlay } from "./social-card-overlay.js";
import { oldPhotoOutputSetEntries } from "./old-photo-local.js";
import { SOCIAL_GRID_TILE_COUNT, socialGridLayout } from "./social-grid-split.js";

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`${mime} Canvas 编码没有返回 Blob`));
    }, mime, quality);
  });
}

function makeFixture(documentRef, mime) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { alpha: mime === "image/png", colorSpace: "srgb" });
  if (!context) throw new Error("浏览器没有提供 2D Canvas context");
  if (mime === "image/jpeg") {
    context.fillStyle = "#f7f3e8";
    context.fillRect(0, 0, 32, 32);
  }
  const gradient = context.createLinearGradient(0, 0, 32, 32);
  gradient.addColorStop(0, mime === "image/png" ? "rgba(25, 120, 210, 0)" : "rgb(25, 120, 210)");
  gradient.addColorStop(0.5, mime === "image/png" ? "rgba(225, 90, 60, .5)" : "rgb(225, 90, 60)");
  gradient.addColorStop(1, "rgb(40, 165, 95)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return { canvas, expected: context.getImageData(0, 0, 32, 32).data };
}

async function reopenPixels(documentRef, createBitmap, blob) {
  const bitmap = await createBitmap(blob, {
    imageOrientation: "none",
    premultiplyAlpha: "none",
    colorSpaceConversion: "default",
  });
  try {
    const canvas = documentRef.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
    if (!context) throw new Error("浏览器没有提供重开用 2D Canvas context");
    context.drawImage(bitmap, 0, 0);
    return { width: bitmap.width, height: bitmap.height, pixels: context.getImageData(0, 0, bitmap.width, bitmap.height).data };
  } finally {
    bitmap.close?.();
  }
}

async function diagnoseFormat({ documentRef, createBitmap, mime }) {
  const fixture = makeFixture(documentRef, mime);
  const blob = await canvasToBlob(fixture.canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const metadata = inspectOutputMetadata(bytes, mime);
  const reopened = await reopenPixels(documentRef, createBitmap, blob);
  if (reopened.width !== 32 || reopened.height !== 32) throw new Error("重开尺寸与编码尺寸不同");
  const pixels = verifyPixelRoundTrip({
    expected: fixture.expected,
    actual: reopened.pixels,
    width: 32,
    height: 32,
    mime,
  });
  return Object.freeze({
    name: mime === "image/png" ? "PNG + Alpha" : "JPEG + 不透明底",
    mime,
    byteLength: bytes.byteLength,
    markers: metadata.markers,
    colorMetadata: metadata.colorMetadata,
    pixelCount: pixels.pixelCount,
    maxAlphaError: pixels.maxAlphaError,
    meanAbsoluteRgbError: pixels.meanAbsoluteRgbError,
    maxRgbError: pixels.maxRgbError,
  });
}

function alphaPlane(rgba) {
  const alpha = new Uint8ClampedArray(rgba.length / 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = rgba[pixel * 4 + 3];
  return alpha;
}

async function encodeAndVerifyPixels({ documentRef, createBitmap, pixels, width, height, mime }) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!context) throw new Error("浏览器没有提供蒙版诊断用 2D Canvas context");
  const imageData = context.createImageData(width, height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
  const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const metadata = inspectOutputMetadata(bytes, mime);
  const reopened = await reopenPixels(documentRef, createBitmap, blob);
  if (reopened.width !== width || reopened.height !== height) throw new Error("蒙版诊断重开尺寸与编码尺寸不同");
  const verification = verifyPixelRoundTrip({ expected: pixels, actual: reopened.pixels, width, height, mime });
  return { byteLength: bytes.length, markers: metadata.markers, verification };
}

async function diagnoseMaskCorrection({ documentRef, createBitmap }) {
  const width = 32;
  const height = 24;
  const source = new Uint8ClampedArray(width * height * 4);
  const result = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      source.set([210, 90 + (x % 40), 45 + (y % 30), 255], offset);
      const inside = x >= 7 && x <= 25 && y >= 4 && y <= 20;
      result.set([205, 82, 48, inside ? 255 : 0], offset);
    }
  }
  let history = createMaskCorrectionHistory({ width, height, initialAlpha: alphaPlane(result) });
  history = commitMaskStroke(history, { tool: "erase", radius: 0.06, points: [{ x: 0.5, y: 0.5 }] });
  history = commitMaskStroke(history, { tool: "keep", radius: 0.05, points: [{ x: 0.12, y: 0.12 }] });
  const mask = rebuildCorrectionMask(history);
  const corrected = composeCorrectedPixels({ sourcePixels: source, resultPixels: result, mask, width, height });
  const solid = composeSolidBackgroundPixels({ foregroundPixels: corrected, background: [245, 241, 232], width, height });
  const transparentOutput = await encodeAndVerifyPixels({ documentRef, createBitmap, pixels: corrected, width, height, mime: "image/png" });
  const solidOutput = await encodeAndVerifyPixels({ documentRef, createBitmap, pixels: solid, width, height, mime: "image/jpeg" });
  return Object.freeze({
    name: "蒙版修正 + 双格式导出",
    transparentBytes: transparentOutput.byteLength,
    solidBytes: solidOutput.byteLength,
    pngMarkers: transparentOutput.markers,
    jpegMarkers: solidOutput.markers,
    correctedStrokes: history.index,
    transparentPixels: transparentOutput.verification.transparentPixels,
    solidOpaquePixels: solidOutput.verification.opaquePixels,
  });
}

async function diagnoseSceneTemplates({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 160;
  source.height = 90;
  const context = source.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!context) throw new Error("浏览器没有提供场景模板诊断用 2D Canvas context");
  const gradient = context.createLinearGradient(0, 0, 160, 90);
  gradient.addColorStop(0, "#245c43");
  gradient.addColorStop(0.5, "#dce978");
  gradient.addColorStop(1, "#d96d3a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 160, 90);
  context.fillStyle = "rgba(255,255,255,.72)";
  context.fillRect(22, 16, 48, 58);

  const cases = [
    { name: "横版封面", ratio: "wide", outputLongEdge: 1920, expected: { width: 160, height: 90 } },
    { name: "竖屏故事", ratio: "story", outputLongEdge: 1920, expected: { width: 51, height: 90 } },
  ];
  const outputs = [];
  for (const item of cases) {
    const editState = editStateFromSettings({
      sourceWidth: source.width,
      sourceHeight: source.height,
      settings: {
        ratio: item.ratio,
        cropX: 50,
        cropY: 50,
        sizeMode: "custom",
        outputLongEdge: item.outputLongEdge,
        format: "png",
      },
    });
    const rendered = await renderEditedImage({
      image: source,
      editState,
      createCanvas: () => documentRef.createElement("canvas"),
      reopen: (blob) => reopenPixels(documentRef, createBitmap, blob),
    });
    if (rendered.width !== item.expected.width || rendered.height !== item.expected.height) {
      throw new Error(`${item.name} 实际输出 ${rendered.width} × ${rendered.height}，与预期不一致`);
    }
    outputs.push(Object.freeze({
      name: item.name,
      ratio: item.ratio,
      width: rendered.width,
      height: rendered.height,
      byteLength: rendered.byteLength,
      outputHash: rendered.outputHash,
    }));
  }
  return Object.freeze({
    name: "场景模板真实输出",
    detail: outputs.map((item) => `${item.name} ${item.width} × ${item.height}`).join("；") + "；小图未放大",
    outputs: Object.freeze(outputs),
  });
}

async function diagnoseProductOutputSet({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 96;
  source.height = 72;
  const sourceContext = source.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!sourceContext) throw new Error("浏览器没有提供商品套装诊断用 2D Canvas context");
  sourceContext.clearRect(0, 0, 96, 72);
  sourceContext.fillStyle = "#d96043";
  sourceContext.fillRect(23, 11, 50, 50);
  sourceContext.fillStyle = "#f2d56b";
  sourceContext.fillRect(31, 19, 34, 34);
  sourceContext.clearRect(42, 30, 12, 12);
  const sourcePixels = sourceContext.getImageData(0, 0, 96, 72).data;
  const sourceBounds = alphaBoundsFromRgba({ pixels: sourcePixels, width: 96, height: 72 });
  const entries = productOutputSetEntries({ scale: 0.82, positionX: 0.5, positionY: 0.46, shadow: "soft" }, 96, 72);
  const files = [];
  const observations = [];
  for (const entry of entries) {
    const canvas = documentRef.createElement("canvas");
    canvas.width = entry.width;
    canvas.height = entry.height;
    const context = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
    if (!context) throw new Error("浏览器没有提供商品套装输出 Canvas context");
    drawProductComposition({
      context,
      foreground: source,
      width: entry.width,
      height: entry.height,
      sourceWidth: 96,
      sourceHeight: 72,
      settings: entry.settings,
      sourceBounds,
    });
    const expected = context.getImageData(0, 0, entry.width, entry.height).data;
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    inspectOutputMetadata(bytes, "image/jpeg");
    const reopened = await reopenPixels(documentRef, createBitmap, blob);
    if (reopened.width !== entry.width || reopened.height !== entry.height) throw new Error(`${entry.label}重开尺寸不一致`);
    verifyPixelRoundTrip({ expected, actual: reopened.pixels, width: entry.width, height: entry.height, mime: "image/jpeg" });
    files.push({ name: `product-${entry.filenameSuffix}.jpg`, data: bytes });
    observations.push(`${entry.label} ${entry.width} × ${entry.height}`);
  }
  const archive = await createStoredZip(files);
  if (archive.entries !== 4) throw new Error("商品套装 ZIP 条目数量不正确");
  return Object.freeze({
    name: "商品图一图多用",
    detail: `${observations.join("；")}；ZIP ${archive.entries} files / ${archive.byteLength} bytes`,
    outputs: 4,
    archiveBytes: archive.byteLength,
  });
}

async function diagnosePortraitOutputSet({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 96;
  source.height = 120;
  const sourceContext = source.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!sourceContext) throw new Error("浏览器没有提供报名照套装诊断用 2D Canvas context");
  sourceContext.clearRect(0, 0, 96, 120);
  sourceContext.fillStyle = "#e4ae8d";
  sourceContext.beginPath();
  sourceContext.arc(48, 30, 18, 0, Math.PI * 2);
  sourceContext.fill();
  sourceContext.fillStyle = "#274f73";
  sourceContext.beginPath();
  sourceContext.moveTo(20, 112);
  sourceContext.quadraticCurveTo(24, 57, 48, 54);
  sourceContext.quadraticCurveTo(72, 57, 76, 112);
  sourceContext.closePath();
  sourceContext.fill();
  const sourcePixels = sourceContext.getImageData(0, 0, 96, 120).data;
  const sourceBounds = alphaBoundsFromRgba({ pixels: sourcePixels, width: 96, height: 120 });
  const files = [];
  const observations = [];
  for (const entry of portraitOutputSetEntries({ scale: 0.78, positionY: 0.34 })) {
    const canvas = documentRef.createElement("canvas");
    canvas.width = entry.width;
    canvas.height = entry.height;
    const context = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
    if (!context) throw new Error("浏览器没有提供报名照套装输出 Canvas context");
    drawPortraitComposition({
      context,
      foreground: source,
      sourceWidth: 96,
      sourceHeight: 120,
      sourceBounds,
      settings: entry.settings,
      backgroundRgb: entry.background.rgb,
    });
    const expected = context.getImageData(0, 0, entry.width, entry.height).data;
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    inspectOutputMetadata(bytes, "image/jpeg");
    const reopened = await reopenPixels(documentRef, createBitmap, blob);
    if (reopened.width !== entry.width || reopened.height !== entry.height) throw new Error(`${entry.label}重开尺寸不一致`);
    verifyPixelRoundTrip({ expected, actual: reopened.pixels, width: entry.width, height: entry.height, mime: "image/jpeg" });
    files.push({ name: `portrait-${entry.filenameSuffix}.jpg`, data: bytes });
    observations.push(`${entry.label} ${entry.width} × ${entry.height}`);
  }
  const archive = await createStoredZip(files);
  if (archive.entries !== 6) throw new Error("报名照套装 ZIP 条目数量不正确");
  return Object.freeze({
    name: "报名照一照多用",
    detail: `${observations.join("；")}；ZIP ${archive.entries} files / ${archive.byteLength} bytes`,
    outputs: 6,
    archiveBytes: archive.byteLength,
  });
}

async function diagnoseSocialOutputSet({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 240;
  source.height = 160;
  const context = source.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!context) throw new Error("浏览器没有提供社交套装诊断用 2D Canvas context");
  const gradient = context.createLinearGradient(0, 0, 240, 160);
  gradient.addColorStop(0, "#215d48");
  gradient.addColorStop(0.55, "#dce978");
  gradient.addColorStop(1, "#dc7049");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 240, 160);
  context.fillStyle = "rgba(255,255,255,.78)";
  context.fillRect(82, 28, 78, 98);

  const files = [];
  const observations = [];
  for (const preset of SOCIAL_OUTPUT_PRESETS) {
    const settings = applySceneTemplate({
      cropX: 50,
      cropY: 50,
      format: "png",
      socialTitle: "今天的城市散步",
      socialTitlePosition: "bottom",
      socialTitleAlignment: "left",
      socialTitleTone: "light",
    }, preset.id);
    const editState = editStateFromSettings({ sourceWidth: 240, sourceHeight: 160, settings });
    const rendered = await renderEditedImage({
      image: source,
      editState,
      createCanvas: () => documentRef.createElement("canvas"),
      reopen: (blob) => reopenPixels(documentRef, createBitmap, blob),
    });
    const bitmap = await createBitmap(rendered.blob, { imageOrientation: "none", premultiplyAlpha: "none" });
    try {
      const canvas = documentRef.createElement("canvas");
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const outputContext = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
      if (!outputContext) throw new Error("浏览器没有提供社交标题输出 Canvas context");
      outputContext.drawImage(bitmap, 0, 0, rendered.width, rendered.height);
      const layout = drawSocialOverlay({ context: outputContext, width: rendered.width, height: rendered.height, settings });
      if (layout.hidden || layout.lines.length < 1 || layout.lines.length > 2) throw new Error(`${preset.label}标题布局不完整`);
      const expected = outputContext.getImageData(0, 0, rendered.width, rendered.height).data;
      const blob = await canvasToBlob(canvas, "image/png");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      inspectOutputMetadata(bytes, "image/png");
      const reopened = await reopenPixels(documentRef, createBitmap, blob);
      verifyPixelRoundTrip({ expected, actual: reopened.pixels, width: rendered.width, height: rendered.height, mime: "image/png" });
      files.push({ name: `social-${preset.id}.png`, data: bytes });
      observations.push(`${preset.label} ${rendered.width} × ${rendered.height}`);
    } finally {
      bitmap.close?.();
    }
  }
  const archive = await createStoredZip(files);
  if (archive.entries !== 4) throw new Error("社交套装 ZIP 条目数量不正确");
  return Object.freeze({
    name: "社交图片一图多用",
    detail: `${observations.join("；")}；标题写入像素；ZIP ${archive.entries} files / ${archive.byteLength} bytes`,
    outputs: 4,
    archiveBytes: archive.byteLength,
  });
}

async function diagnoseOldPhotoOutputSet({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 180;
  source.height = 120;
  const context = source.getContext("2d", { alpha: false, colorSpace: "srgb" });
  if (!context) throw new Error("浏览器没有提供老照片套装诊断用 2D Canvas context");
  const paper = context.createLinearGradient(0, 0, 180, 120);
  paper.addColorStop(0, "#7c6d58");
  paper.addColorStop(0.5, "#b5a487");
  paper.addColorStop(1, "#6e6254");
  context.fillStyle = paper;
  context.fillRect(0, 0, 180, 120);
  context.fillStyle = "rgba(48, 42, 36, .72)";
  context.fillRect(18, 22, 54, 78);
  context.fillStyle = "rgba(222, 204, 169, .55)";
  context.beginPath();
  context.arc(118, 50, 26, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(236, 224, 197, .36)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(88, 8);
  context.lineTo(96, 112);
  context.stroke();

  const files = [];
  const observations = [];
  const entries = oldPhotoOutputSetEntries({ ratio: "original", sizeMode: "preset", format: "png" });
  for (const entry of entries) {
    const editState = editStateFromSettings({ sourceWidth: 180, sourceHeight: 120, settings: entry.settings });
    const rendered = await renderEditedImage({
      image: source,
      editState,
      createCanvas: () => documentRef.createElement("canvas"),
      reopen: (blob) => reopenPixels(documentRef, createBitmap, blob),
    });
    const bytes = new Uint8Array(await rendered.blob.arrayBuffer());
    inspectOutputMetadata(bytes, rendered.mime);
    const reopened = await reopenPixels(documentRef, createBitmap, rendered.blob);
    if (reopened.width !== 180 || reopened.height !== 120) throw new Error(`${entry.label}重开尺寸不一致`);
    files.push({ name: `old-photo-${entry.filenameSuffix}.png`, data: bytes });
    observations.push(`${entry.label} ${rendered.width} × ${rendered.height}`);
  }
  const archive = await createStoredZip(files);
  if (archive.entries !== 4) throw new Error("老照片本地整理 ZIP 条目数量不正确");
  return Object.freeze({
    name: "老照片一图多修",
    detail: `${observations.join("；")}；仅光色整理；ZIP ${archive.entries} files / ${archive.byteLength} bytes`,
    outputs: 4,
    archiveBytes: archive.byteLength,
  });
}

async function diagnoseSocialGridOutputSet({ documentRef, createBitmap }) {
  const source = documentRef.createElement("canvas");
  source.width = 180;
  source.height = 180;
  const sourceContext = source.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!sourceContext) throw new Error("浏览器没有提供九宫格诊断用 2D Canvas context");
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const number = row * 3 + column + 1;
      sourceContext.fillStyle = `hsl(${number * 37} 58% ${38 + number * 3}%)`;
      sourceContext.fillRect(column * 60, row * 60, 60, 60);
      sourceContext.fillStyle = "rgba(255,255,255,.88)";
      sourceContext.font = "bold 24px sans-serif";
      sourceContext.fillText(String(number), column * 60 + 22, row * 60 + 38);
    }
  }
  const layout = socialGridLayout(source.width, source.height);
  const files = [];
  for (const entry of layout.entries) {
    const canvas = documentRef.createElement("canvas");
    canvas.width = entry.size;
    canvas.height = entry.size;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
    if (!context) throw new Error("浏览器没有提供九宫格切图 Canvas context");
    context.drawImage(source, entry.x, entry.y, entry.size, entry.size, 0, 0, entry.size, entry.size);
    const expected = context.getImageData(0, 0, entry.size, entry.size).data;
    const blob = await canvasToBlob(canvas, "image/png");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    inspectOutputMetadata(bytes, "image/png");
    const reopened = await reopenPixels(documentRef, createBitmap, blob);
    verifyPixelRoundTrip({ expected, actual: reopened.pixels, width: entry.size, height: entry.size, mime: "image/png" });
    files.push({ name: `social-grid-${entry.filenameSuffix}.png`, data: bytes });
  }
  const archive = await createStoredZip(files);
  if (archive.entries !== SOCIAL_GRID_TILE_COUNT) throw new Error("九宫格 ZIP 条目数量不正确");
  return Object.freeze({
    name: "社交九宫格切图",
    detail: `方形总图 ${source.width} × ${source.height}；9 张 ${layout.tileSize} × ${layout.tileSize} PNG 逐张重开；ZIP ${archive.entries} files / ${archive.byteLength} bytes`,
    outputs: SOCIAL_GRID_TILE_COUNT,
    archiveBytes: archive.byteLength,
  });
}

function diagnoseRecoveryControls(documentRef) {
  const host = documentRef.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
  const retry = documentRef.createElement("button");
  const recover = documentRef.createElement("button");
  const fallback = documentRef.createElement("button");
  const back = documentRef.createElement("button");
  const errorElements = {
    title: documentRef.createElement("h2"),
    message: documentRef.createElement("p"),
    dataBoundary: documentRef.createElement("strong"),
    retrySafety: documentRef.createElement("strong"),
    actionHint: documentRef.createElement("strong"),
    runRow: documentRef.createElement("div"),
    runId: documentRef.createElement("code"),
    technical: documentRef.createElement("details"),
    technicalCode: documentRef.createElement("code"),
    technicalTask: documentRef.createElement("code"),
  };
  host.append(retry, recover, fallback, back, ...Object.values(errorElements));
  documentRef.body.append(host);
  try {
    const knownCutout = recoveryPresentation({ taskId: "UT-CUTOUT", retryable: true });
    applyRecoveryPresentation({ retry, recover, fallback, back }, knownCutout);
    if (retry.textContent !== "返回并重新确认" || fallback.textContent !== "改用本地编辑" || documentRef.activeElement !== fallback || recover.hidden !== true || retry.classList.contains("button-primary")) {
      throw new Error("明确失败没有优先提供本地编辑兜底");
    }
    const unknownCutout = recoveryPresentation({ taskId: "UT-CUTOUT", unknown: true, retryable: true });
    applyRecoveryPresentation({ retry, recover, fallback, back }, unknownCutout);
    if (documentRef.activeElement !== recover || recover.hidden !== false || fallback.hidden !== true || retry.classList.contains("button-primary")) {
      throw new Error("未知状态没有优先聚焦原任务查询");
    }
    const localFailure = recoveryPresentation({ taskId: "UT-TUNE", retryable: true });
    applyRecoveryPresentation({ retry, recover, fallback, back }, localFailure);
    if (retry.textContent !== "再试一次" || documentRef.activeElement !== retry || fallback.hidden !== true || !retry.classList.contains("button-primary")) {
      throw new Error("本地失败没有提供明确的主恢复操作");
    }

    const input = errorPagePresentation({ context: ERROR_CONTEXTS.INPUT, error: { code: "image_mime_mismatch" } });
    applyErrorPagePresentation(errorElements, input);
    if (!errorElements.dataBoundary.textContent.includes("没有发送") || !errorElements.retrySafety.textContent.includes("安全")) {
      throw new Error("输入错误没有说明图片未发送和可安全重选");
    }
    const settings = errorPagePresentation({ context: ERROR_CONTEXTS.SETTINGS, error: { code: "invalid_settings" } });
    const local = errorPagePresentation({ context: ERROR_CONTEXTS.LOCAL_PROCESSING, error: { code: "local_render_failed" } });
    const output = errorPagePresentation({ context: ERROR_CONTEXTS.OUTPUT_VALIDATION, error: { code: "output_hash_mismatch" } });
    const remoteFailed = errorPagePresentation({ context: ERROR_CONTEXTS.REMOTE_FAILED, error: { code: "provider_auth_failed", message: "raw secret must stay hidden" }, taskId: "UT-CUTOUT", runId: "diagnostic-run" });
    const remoteUnknown = errorPagePresentation({ context: ERROR_CONTEXTS.REMOTE_UNKNOWN, error: { code: "transport_unknown" }, taskId: "UT-CUTOUT", runId: "diagnostic-run" });
    const network = errorPagePresentation({ context: ERROR_CONTEXTS.NETWORK_UNAVAILABLE, error: { code: "network_unavailable" } });
    applyErrorPagePresentation(errorElements, remoteFailed);
    if (!errorElements.dataBoundary.textContent.includes("可能已") || errorElements.message.textContent.includes("raw secret") || errorElements.runId.textContent !== "diagnostic-run") {
      throw new Error("明确远程失败的数据边界、友好文案或任务编号不正确");
    }
    applyErrorPagePresentation(errorElements, remoteUnknown);
    if (!errorElements.retrySafety.textContent.includes("查询原任务") || !errorElements.retrySafety.textContent.includes("重复计费")) {
      throw new Error("未知状态没有说明先查询和避免重复计费");
    }
    if (![settings, local, output, network].every((presentation) => presentation.technicalCode)) {
      throw new Error("错误事实缺少稳定技术分类");
    }
    return Object.freeze({
      name: "失败恢复操作",
      detail: "7 类错误均说明图片状态、安全重试、下一步与技术分类；远程失败和未知状态保持不同恢复动作",
      scenarios: 7,
    });
  } finally {
    host.remove();
  }
}

export async function runBrowserDiagnostics({
  documentRef = document,
  createBitmap = createImageBitmap,
  userAgent = navigator.userAgent,
} = {}) {
  const formats = ["image/png", "image/jpeg"];
  const results = [];
  for (const mime of formats) {
    try {
      results.push({ status: "pass", value: await diagnoseFormat({ documentRef, createBitmap, mime }) });
    } catch (error) {
      results.push({ status: "fail", value: { name: mime, error: error instanceof Error ? error.message : String(error) } });
    }
  }
  try {
    results.push({ status: "pass", value: await diagnoseMaskCorrection({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "蒙版修正 + 双格式导出", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnoseSceneTemplates({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "场景模板真实输出", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnoseProductOutputSet({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "商品图一图多用", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnosePortraitOutputSet({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "报名照一照多用", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnoseSocialOutputSet({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "社交图片一图多用", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnoseOldPhotoOutputSet({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "老照片一图多修", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: await diagnoseSocialGridOutputSet({ documentRef, createBitmap }) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "社交九宫格切图", error: error instanceof Error ? error.message : String(error) } });
  }
  try {
    results.push({ status: "pass", value: diagnoseRecoveryControls(documentRef) });
  } catch (error) {
    results.push({ status: "fail", value: { name: "失败恢复操作", error: error instanceof Error ? error.message : String(error) } });
  }
  return Object.freeze({
    passed: results.every((result) => result.status === "pass"),
    observedAt: new Date().toISOString(),
    userAgent,
    results: Object.freeze(results),
  });
}

function renderReport(documentRef, report) {
  const status = documentRef.querySelector("#diagnostic-status");
  const results = documentRef.querySelector("#diagnostic-results");
  const environment = documentRef.querySelector("#diagnostic-environment");
  documentRef.documentElement.dataset.diagnosticState = report.passed ? "passed" : "failed";
  status.textContent = report.passed ? "当前浏览器会话：全部通过" : "当前浏览器会话：存在失败";
  status.dataset.result = report.passed ? "pass" : "fail";
  results.replaceChildren(...report.results.map((result) => {
    const row = documentRef.createElement("tr");
    const name = documentRef.createElement("td");
    const outcome = documentRef.createElement("td");
    const detail = documentRef.createElement("td");
    name.textContent = result.value.name;
    outcome.textContent = result.status === "pass" ? "通过" : "失败";
    outcome.dataset.result = result.status;
    detail.textContent = result.status === "pass"
      ? (result.value.detail ?? (result.value.mime
        ? `${result.value.byteLength} bytes；markers ${result.value.markers.join(", ")}；RGB MAE ${result.value.meanAbsoluteRgbError.toFixed(3)}`
        : `${result.value.correctedStrokes} 笔；透明 PNG ${result.value.transparentBytes} bytes；纯色 JPEG ${result.value.solidBytes} bytes；透明像素 ${result.value.transparentPixels}；JPEG 不透明像素 ${result.value.solidOpaquePixels}`))
      : result.value.error;
    row.append(name, outcome, detail);
    return row;
  }));
  environment.textContent = JSON.stringify({ observedAt: report.observedAt, userAgent: report.userAgent }, null, 2);
}

if (typeof document !== "undefined") {
  const run = async () => {
    const status = document.querySelector("#diagnostic-status");
    status.textContent = "正在运行…";
    document.documentElement.dataset.diagnosticState = "running";
    renderReport(document, await runBrowserDiagnostics());
  };
  document.querySelector("#run-diagnostics")?.addEventListener("click", run);
  run();
}
