import { EXAMPLES, EXAMPLE_ORIGINS, EXAMPLE_RESULT_KINDS, examplesForFilter } from "./examples-manifest.js";
import { runLocalEditor } from "./editor-session.js";
import { compressImageToTarget } from "./image-compression.js";
import { applyOldPhotoLocalPreset } from "./old-photo-local.js";
import { privacyShareEditorSettings, privacyShareReport } from "./privacy-share.js";
import { uploadComplianceReport, uploadSpecificationEditorSettings } from "./upload-specification.js";

const gallery = document.querySelector("#examples-gallery");
const status = document.querySelector("#examples-status");
const filterButtons = [...document.querySelectorAll("[data-example-filter]")];
const activeUrls = new Set();
const acceptanceMode = new URLSearchParams(location.search).has("acceptance");

const ORIGIN_LABELS = Object.freeze({
  [EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI]: "项目原创合成素材",
  [EXAMPLE_ORIGINS.PRODUCT_RUNTIME]: "产品本机即时结果",
  [EXAMPLE_ORIGINS.DETERMINISTIC_PROJECT_OUTPUT]: "项目确定性生成结果",
  [EXAMPLE_ORIGINS.CODEX_REFERENCE]: "Codex 视觉参考",
});

function element(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function formatBytes(byteLength) {
  if (!Number.isFinite(byteLength)) return "页面生成后显示";
  if (byteLength >= 1024 * 1024) return `${(byteLength / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.ceil(byteLength / 1024)} KB`;
}

function fact(label, value) {
  const node = element("div", "example-fact");
  node.append(element("span", null, label), element("strong", null, value));
  return node;
}

function imagePanel({ role, label, path, alt, stateText = null, eager = false }) {
  const figure = element("figure", "example-image");
  const image = document.createElement("img");
  image.alt = alt;
  image.loading = acceptanceMode || eager ? "eager" : "lazy";
  image.decoding = "async";
  image.dataset.exampleImage = role;
  image.hidden = !path;
  const state = element("p", "example-image-state", stateText ?? (path ? "正在加载已登记图片…" : null));
  state.dataset.exampleState = role;
  state.hidden = !(stateText || path);
  if (path) {
    const reveal = () => { image.hidden = false; state.hidden = true; };
    image.addEventListener("load", reveal, { once: true });
    image.addEventListener("error", () => { state.textContent = "图片加载失败，请刷新后重试"; state.hidden = false; }, { once: true });
    image.src = path;
    if (image.complete && image.naturalWidth > 0) reveal();
  }
  const caption = document.createElement("figcaption");
  caption.append(element("span", null, role === "source" ? "原图" : "结果"), element("strong", null, label));
  figure.append(image, state, caption);
  return figure;
}

function listBlock(title, items) {
  const block = element("div");
  block.append(element("h3", null, title));
  const list = document.createElement("ul");
  items.forEach((item) => list.append(element("li", null, item)));
  block.append(list);
  return block;
}

function renderCard(entry) {
  const card = element("article", "example-card");
  card.dataset.exampleId = entry.id;
  card.dataset.filter = entry.filter;
  card.setAttribute("aria-labelledby", `${entry.id}-title`);

  const heading = element("div", "example-card-heading");
  const top = element("div", "example-card-heading-top");
  const title = element("h2", null, entry.title);
  title.id = `${entry.id}-title`;
  top.append(title, element("span", "example-origin", ORIGIN_LABELS[entry.result.origin]));
  heading.append(top, element("p", null, entry.summary));

  const pair = element("div", "example-pair");
  const eager = entry.id.startsWith("old-photo");
  pair.append(
    imagePanel({ role: "source", label: entry.source.label, path: entry.source.path, alt: `${entry.title}的完整原图`, eager }),
    imagePanel({
      role: "result",
      label: entry.result.label,
      path: entry.result.path,
      alt: `${entry.title}的完整结果`,
      stateText: entry.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL ? "正在本机生成真实结果…" : null,
      eager: eager || entry.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL,
    }),
  );

  const details = element("div", "example-details");
  const processing = element("div", "example-processing");
  processing.append(element("strong", null, entry.processing.truthfulLabel), element("span", null, entry.processing.location === "local" ? "图片不离开当前浏览器" : "静态参考，不是本次运行结果"));
  const facts = element("div", "example-facts");
  facts.dataset.exampleFacts = "true";
  facts.append(
    fact("原图尺寸", `${entry.source.width} × ${entry.source.height}`),
    fact("原图文件", formatBytes(entry.source.byteLength)),
    fact("结果尺寸", entry.result.width ? `${entry.result.width} × ${entry.result.height}` : "页面生成后显示"),
    fact("结果文件", formatBytes(entry.result.byteLength)),
  );
  const lists = element("div", "example-lists");
  lists.append(listBlock("本次参数", entry.parameters), listBlock("能力限制", entry.limits));
  const actions = element("div", "example-card-actions");
  const sourceLink = element("a", null, "单独查看原图");
  sourceLink.href = entry.source.path;
  const resultLink = element("a", null, "单独查看结果");
  resultLink.dataset.exampleResultLink = "true";
  resultLink.hidden = !entry.result.path;
  if (entry.result.path) resultLink.href = entry.result.path;
  const studioLink = element("a", "button button-quiet", "在工作室使用这个方向");
  studioLink.href = entry.entryHref;
  actions.append(sourceLink, resultLink, studioLink);
  details.append(processing, facts, lists, actions);
  card.append(heading, pair, details);
  gallery.append(card);
  return card;
}

async function sourceFile(entry) {
  const response = await fetch(entry.source.path, { cache: "no-store" });
  if (!response.ok) throw new Error(`原图加载失败：HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.type !== "image/png" || blob.size !== entry.source.byteLength) throw new Error("原图文件身份不匹配");
  return new File([blob], `${entry.id}-source.png`, { type: "image/png" });
}

function runtimeSettings(entry) {
  if (entry.processing.runtimeGenerator === "straighten-minus-5") {
    return Object.freeze({ ratio: "original", rotation: 0, straighten: -5, sizeMode: "preset", format: "png" });
  }
  if (entry.processing.runtimeGenerator === "old-photo-monochrome") {
    return applyOldPhotoLocalPreset({ ratio: "original", rotation: 0, sizeMode: "preset", format: "png" }, "monochrome");
  }
  if (entry.processing.runtimeGenerator === "document-clean-color") {
    return Object.freeze({
      ratio: "original",
      rotation: 0,
      rectificationEnabled: "on",
      rectifyTopLeftX: 23.6,
      rectifyTopLeftY: 11.2,
      rectifyTopRightX: 65.6,
      rectifyTopRightY: 6.4,
      rectifyBottomRightX: 78.3,
      rectifyBottomRightY: 85,
      rectifyBottomLeftX: 28.2,
      rectifyBottomLeftY: 90.8,
      documentScanMode: "clean-color",
      sizeMode: "custom",
      outputLongEdge: 1600,
      format: "jpeg",
      jpegQuality: 0.9,
      jpegBackground: "#ffffff",
      compressionTargetKilobytes: 1024,
    });
  }
  if (entry.processing.runtimeGenerator === "privacy-share-balanced") {
    return privacyShareEditorSettings({ privacyLongEdge: 1600, privacyTargetKilobytes: 1024, privacyBackground: "#ffffff" });
  }
  if (entry.processing.runtimeGenerator === "upload-strict-1mb") {
    return uploadSpecificationEditorSettings({}, {
      uploadContentMode: "whole",
      uploadRatio: "original",
      uploadLongEdge: 1200,
      uploadTargetKilobytes: 1024,
      uploadBackground: "#ffffff",
    });
  }
  if (entry.processing.runtimeGenerator === "compression-500kb") {
    return Object.freeze({
      ratio: "original",
      sizeMode: "custom",
      outputLongEdge: 1536,
      format: "jpeg",
      jpegQuality: 0.9,
      jpegBackground: "#ffffff",
      compressionTargetKilobytes: 500,
    });
  }
  throw new RangeError("未登记的本地样例生成器");
}

async function generateRuntimeResult(entry, file) {
  const settings = runtimeSettings(entry);
  if (["document-clean-color", "privacy-share-balanced", "upload-strict-1mb", "compression-500kb"].includes(entry.processing.runtimeGenerator)) {
    const targetKilobytes = entry.processing.runtimeGenerator === "compression-500kb" ? 500 : 1024;
    const maxLongEdge = entry.processing.runtimeGenerator === "upload-strict-1mb" ? 1200
      : entry.processing.runtimeGenerator === "compression-500kb" ? 1536 : 1600;
    const output = await compressImageToTarget({
      targetKilobytes,
      maxLongEdge,
      revokeObjectUrl: (url) => URL.revokeObjectURL(url),
      renderAttempt: (step) => runLocalEditor({ file, settings: { ...settings, ...step } }),
    });
    if (output.compressionDecision?.targetMet !== true) throw new Error(`结果没有达到 ${targetKilobytes} KB 上限`);
    if (entry.processing.runtimeGenerator === "upload-strict-1mb") {
      const compliance = uploadComplianceReport({
        mime: output.mime,
        width: output.width,
        height: output.height,
        byteLength: output.byteLength,
        specification: settings,
      });
      if (!compliance.passed) throw new Error("上传规格结果未通过最终技术检查");
    }
    if (entry.processing.runtimeGenerator === "privacy-share-balanced") {
      const report = privacyShareReport({
        mime: output.mime, width: output.width, height: output.height, byteLength: output.byteLength,
        metadataInspection: output.metadataInspection, settings,
      });
      if (!report.passed) throw new Error("隐私分享副本未通过 metadata、尺寸或体积检查");
    }
    return output;
  }
  return runLocalEditor({ file, settings });
}

async function hydrateRuntimeResult(entry, card) {
  const state = card.querySelector('[data-example-state="result"]');
  try {
    const output = await generateRuntimeResult(entry, await sourceFile(entry));
    if (output.pixelValidation?.pixelCount !== output.width * output.height) throw new Error("编码后像素重开统计与输出尺寸不一致");
    activeUrls.add(output.url);
    const image = card.querySelector('[data-example-image="result"]');
    image.src = output.url;
    image.hidden = false;
    await image.decode();
    state.hidden = true;
    const resultLink = card.querySelector('[data-example-result-link="true"]');
    resultLink.href = output.url;
    resultLink.hidden = false;
    const facts = card.querySelector('[data-example-facts="true"]');
    facts.replaceChildren(
      fact("原图尺寸", `${entry.source.width} × ${entry.source.height}`),
      fact("原图文件", formatBytes(entry.source.byteLength)),
      fact("结果尺寸", `${output.width} × ${output.height}`),
      fact("结果文件", formatBytes(output.byteLength)),
    );
    card.dataset.runtimeState = "ready";
    return true;
  } catch (error) {
    state.textContent = `本地样例没有生成：${error?.message || "未知错误"}`;
    state.hidden = false;
    card.dataset.runtimeState = "failed";
    return false;
  }
}

function applyFilter(filter) {
  const visible = new Set(examplesForFilter(filter).map((entry) => entry.id));
  document.querySelectorAll("[data-example-id]").forEach((card) => { card.hidden = !visible.has(card.dataset.exampleId); });
  filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.exampleFilter === filter)));
  status.textContent = `正在显示 ${visible.size} / ${EXAMPLES.length} 个样例`;
}

async function initialize() {
  const cards = new Map(EXAMPLES.map((entry) => [entry.id, renderCard(entry)]));
  filterButtons.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.exampleFilter)));
  const runtimeEntries = EXAMPLES.filter((entry) => entry.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL);
  const results = await Promise.all(runtimeEntries.map((entry) => hydrateRuntimeResult(entry, cards.get(entry.id))));
  await Promise.all([...document.querySelectorAll('[data-example-id^="old-photo"] img')].map((image) => image.decode()));
  const ready = results.filter(Boolean).length;
  status.textContent = `${EXAMPLES.length} 个样例已登记 · ${ready}/${runtimeEntries.length} 个本地即时结果已生成`;
  status.dataset.state = ready === runtimeEntries.length ? "ready" : "partial";
  document.documentElement.dataset.examplesReady = ready === runtimeEntries.length ? "true" : "partial";
}

window.addEventListener("beforeunload", () => activeUrls.forEach((url) => URL.revokeObjectURL(url)));
initialize();
