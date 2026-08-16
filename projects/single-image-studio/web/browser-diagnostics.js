import { inspectOutputMetadata, verifyPixelRoundTrip } from "./output-validation.js";

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
      ? `${result.value.byteLength} bytes；markers ${result.value.markers.join(", ")}；RGB MAE ${result.value.meanAbsoluteRgbError.toFixed(3)}`
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
