import { runLocalEditor } from "./editor-session.js";

const SOURCE_URL = "./demo-assets/straighten-studio-source.png";
const activeUrls = new Set();

function factsMarkup(result) {
  const perspective = result.renderPlan.verticalPerspective === 0 ? "无" : `${result.renderPlan.verticalPerspective > 0 ? "+" : ""}${result.renderPlan.verticalPerspective} · ${result.renderPlan.verticalPerspectiveScale.toFixed(4)}×`;
  return `
    <div><dt>实际尺寸</dt><dd>${result.width} × ${result.height}</dd></div>
    <div><dt>覆盖缩放</dt><dd>${result.renderPlan.straightenScale.toFixed(4)}×</dd></div>
    <div><dt>垂直透视</dt><dd>${perspective}</dd></div>
    <div><dt>像素重开</dt><dd>${result.pixelValidation.pixelCount === result.width * result.height ? "通过" : "未通过"}</dd></div>
    <div><dt>文件 SHA-256</dt><dd title="${result.outputHash}">${result.outputHash.slice(0, 12)}…</dd></div>`;
}

async function sourceFile() {
  const response = await fetch(SOURCE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`测试图加载失败：HTTP ${response.status}`);
  const blob = await response.blob();
  return new File([blob], "straighten-studio-source.png", { type: "image/png" });
}

async function renderCard(cardName, file, settings, downloadName) {
  const card = document.querySelector(`[data-demo-card="${cardName}"]`);
  const result = await runLocalEditor({ file, settings });
  activeUrls.add(result.url);
  const image = card.querySelector("img");
  image.src = result.url;
  image.hidden = false;
  card.querySelector(".reference-loading").hidden = true;
  card.querySelector("[data-demo-facts]").innerHTML = factsMarkup(result);
  const download = card.querySelector("[data-demo-download]");
  download.href = result.url;
  download.download = downloadName;
  download.hidden = false;
  card.setAttribute("aria-busy", "false");
  return result;
}

async function runDemo() {
  const status = document.querySelector("#straighten-demo-status");
  try {
    const file = await sourceFile();
    const corrected = await renderCard("corrected", file, {
      ratio: "original",
      rotation: 0,
      straighten: -5,
      sizeMode: "preset",
      format: "png",
    }, "straighten-corrected-minus-5.png");
    const square = await renderCard("square", file, {
      ratio: "square",
      rotation: 90,
      straighten: -5,
      cropX: 50,
      cropY: 50,
      sizeMode: "preset",
      format: "png",
    }, "straighten-square-rotation-90.png");
    const perspective = await renderCard("perspective", file, {
      ratio: "original",
      rotation: 0,
      straighten: 0,
      verticalPerspective: 12,
      sizeMode: "preset",
      format: "png",
    }, "vertical-perspective-plus-12.png");
    if (corrected.pixelValidation.pixelCount !== corrected.width * corrected.height
      || square.pixelValidation.pixelCount !== square.width * square.height
      || perspective.pixelValidation.pixelCount !== perspective.width * perspective.height) {
      throw new Error("至少一份浏览器像素重开验证未通过");
    }
    status.textContent = "三份结果均由产品 renderer 生成，并通过编码后独立重开与像素检查。";
    status.dataset.state = "passed";
  } catch (error) {
    status.textContent = `演示生成失败：${error?.message || "未知错误"}`;
    status.dataset.state = "failed";
    document.querySelectorAll("[data-demo-card]").forEach((card) => card.setAttribute("aria-busy", "false"));
  }
}

window.addEventListener("beforeunload", () => activeUrls.forEach((url) => URL.revokeObjectURL(url)));
runDemo();
