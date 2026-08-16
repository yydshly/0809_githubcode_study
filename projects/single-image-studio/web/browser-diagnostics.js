import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";
import {
  commitMaskStroke,
  composeCorrectedPixels,
  composeSolidBackgroundPixels,
  createMaskCorrectionHistory,
  rebuildCorrectionMask,
} from "./mask-correction.js";
import { applyRecoveryPresentation, recoveryPresentation } from "./recovery-presentation.js";

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

function diagnoseRecoveryControls(documentRef) {
  const host = documentRef.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
  const retry = documentRef.createElement("button");
  const recover = documentRef.createElement("button");
  const fallback = documentRef.createElement("button");
  const back = documentRef.createElement("button");
  host.append(retry, recover, fallback, back);
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
    return Object.freeze({
      name: "失败恢复操作",
      detail: "远程失败优先转本地编辑；未知状态查询原任务；本地失败聚焦再试一次",
      scenarios: 3,
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
