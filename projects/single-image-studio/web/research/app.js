import {
  ASSET_KEYS,
  ASSET_LABELS,
  DEFECT_TAXONOMY,
  DEFECT_TAXONOMY_VERSION,
  FixtureCatalogError,
  emptyReviewDraft,
  lockReviewDraft,
  makeBlindFixturePresentation,
  parseFixtureCatalog,
  validateReviewDraft,
} from "./research-fixtures.js";

const byId = (id) => document.getElementById(id);

const elements = {
  fixtureSelect: byId("fixture-select"),
  catalogVersion: byId("catalog-version"),
  contextPartition: byId("context-partition"),
  contextRevision: byId("context-revision"),
  contextCandidate: byId("context-candidate"),
  contextEvidence: byId("context-evidence"),
  workspaceTitle: byId("workspace-title"),
  assetStatus: byId("asset-status"),
  stageLoading: byId("stage-loading"),
  stageEmpty: byId("stage-empty"),
  stageError: byId("stage-error"),
  stageErrorTitle: byId("stage-error-title"),
  stageErrorDetail: byId("stage-error-detail"),
  imagePanel: byId("image-panel"),
  imageFigure: byId("image-figure"),
  imageFrame: byId("image-frame"),
  imageStack: byId("image-stack"),
  baseImage: byId("base-image"),
  overlayImage: byId("overlay-image"),
  imageCaption: byId("image-caption"),
  overlayToggle: byId("overlay-toggle"),
  viewHelp: byId("view-help"),
  taxonomyGroups: byId("taxonomy-groups"),
  taxonomyFieldset: byId("taxonomy-fieldset"),
  reviewForm: byId("review-form"),
  reviewState: byId("review-state"),
  reviewNotes: byId("review-notes"),
  notesCount: byId("notes-count"),
  reviewError: byId("review-error"),
  reviewErrorList: byId("review-error-list"),
  submitReview: byId("submit-review"),
  submitGate: byId("submit-gate"),
  lockedReview: byId("locked-review"),
  lockedSummary: byId("locked-summary"),
  revealMethod: byId("reveal-method"),
  unblindedDetails: byId("unblinded-details"),
  methodDetails: byId("method-details"),
  errorRetry: byId("error-retry"),
  emptyRetry: byId("empty-retry"),
  viewTabs: [...document.querySelectorAll("[data-view]")],
  scaleButtons: [...document.querySelectorAll("[data-scale]")],
};

const state = {
  catalog: null,
  fixture: null,
  assets: new Map(),
  assetLoadToken: 0,
  assetController: null,
  catalogController: null,
  selectedView: "source",
  scaleMode: "fit",
  overlay: false,
  assetsReady: false,
  review: null,
  lockedReview: null,
  unblinded: false,
};

function setText(element, value) {
  element.textContent = value;
}

function setStage(mode, { title = "", detail = "" } = {}) {
  elements.stageLoading.hidden = mode !== "loading";
  elements.stageEmpty.hidden = mode !== "empty";
  elements.stageError.hidden = mode !== "error";
  elements.imageFigure.hidden = mode !== "ready";
  if (mode === "error") {
    setText(elements.stageErrorTitle, title);
    setText(elements.stageErrorDetail, detail);
  }
}

function setAssetStatus(label, mode = "loading") {
  setText(elements.assetStatus, label);
  elements.assetStatus.dataset.state = mode;
}

function resetContext() {
  for (const element of [
    elements.contextPartition,
    elements.contextRevision,
    elements.contextCandidate,
  ]) setText(element, "—");
  setText(elements.contextEvidence, "C1=0");
  setText(elements.workspaceTitle, "等待候选");
}

function renderContext() {
  const fixture = state.fixture;
  if (!fixture) return resetContext();
  const blind = makeBlindFixturePresentation(fixture);
  setText(elements.contextPartition, blind.suitePartition);
  setText(elements.contextRevision, "已隐藏；解盲后显示");
  setText(elements.contextCandidate, blind.candidateAlias);
  setText(elements.contextEvidence, blind.evidenceLevel);
  setText(elements.workspaceTitle, blind.candidateAlias);
}

function makeTaxonomy() {
  const fragment = document.createDocumentFragment();
  for (const [categoryIndex, category] of DEFECT_TAXONOMY.entries()) {
    const details = document.createElement("details");
    details.className = "taxonomy-group";
    details.open = categoryIndex < 3;

    const summary = document.createElement("summary");
    summary.textContent = category.label;
    details.append(summary);

    const options = document.createElement("div");
    options.className = "taxonomy-options";
    for (const defect of category.defects) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "defect";
      input.value = defect.id;
      const text = document.createElement("span");
      text.textContent = defect.label;
      label.append(input, text);
      options.append(label);
    }
    details.append(options);
    fragment.append(details);
  }
  elements.taxonomyGroups.replaceChildren(fragment);
  const version = elements.taxonomyFieldset.querySelector("legend span");
  if (version) version.textContent = DEFECT_TAXONOMY_VERSION.replace(/^.*\./, "");
}

function clearReviewError() {
  elements.reviewError.hidden = true;
  elements.reviewErrorList.replaceChildren();
}

function showReviewError(messages) {
  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const item = document.createElement("li");
    item.textContent = message;
    fragment.append(item);
  }
  elements.reviewErrorList.replaceChildren(fragment);
  elements.reviewError.hidden = false;
  elements.reviewError.focus();
}

function setReviewControlsDisabled(disabled) {
  for (const control of elements.reviewForm.querySelectorAll("input, textarea")) {
    control.disabled = disabled;
  }
}

function updateSubmitGate() {
  const canSubmit = Boolean(state.fixture && state.assetsReady && !state.lockedReview);
  elements.submitReview.disabled = !canSubmit;
  if (state.lockedReview) {
    setText(elements.submitGate, "初判已锁定；切换 fixture 会清空本页评审状态。");
  } else if (!state.fixture) {
    setText(elements.submitGate, "等待有效研究目录。");
  } else if (!state.assetsReady) {
    setText(elements.submitGate, "六张图片未全部通过加载校验，禁止提交。");
  } else {
    setText(elements.submitGate, "本操作只在当前标签页锁定，不持久保存或上传。");
  }
}

function resetReview() {
  state.review = state.fixture ? emptyReviewDraft(state.fixture.id) : null;
  state.lockedReview = null;
  state.unblinded = false;
  elements.reviewForm.reset();
  setReviewControlsDisabled(false);
  elements.lockedReview.hidden = true;
  elements.unblindedDetails.hidden = true;
  elements.revealMethod.disabled = false;
  elements.methodDetails.replaceChildren();
  setText(elements.notesCount, "0 / 1200");
  setText(elements.reviewState, state.fixture ? "待初判" : "未开始");
  elements.reviewState.dataset.state = state.fixture ? "ready" : "idle";
  clearReviewError();
  updateSubmitGate();
}

function revokeAssets(assets = state.assets) {
  for (const asset of assets.values()) {
    if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
  }
  assets.clear();
}

function setViewControlsDisabled(disabled) {
  for (const button of elements.viewTabs) button.disabled = disabled;
  for (const button of elements.scaleButtons) button.disabled = disabled;
  elements.overlayToggle.disabled = disabled;
}

function resolvedSameOriginUrl(path) {
  const url = new URL(path, document.baseURI);
  if (url.origin !== window.location.origin || url.username || url.password) {
    throw new Error("图片 URL 不是当前站点的同源资源");
  }
  return url.href;
}

function readImageDimensions(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("图片没有有效像素尺寸"));
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error("图片数据无法解码"));
    image.src = objectUrl;
  });
}

async function fetchImageAsset(key, path, signal) {
  const response = await fetch(resolvedSameOriginUrl(path), {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: { Accept: "image/*" },
  });
  if (!response.ok) throw new Error(`${ASSET_LABELS[key]}返回 HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!contentType?.startsWith("image/")) {
    throw new Error(`${ASSET_LABELS[key]}的 Content-Type 不是图片`);
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error(`${ASSET_LABELS[key]}是空文件`);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const dimensions = await readImageDimensions(objectUrl);
    return { key, path, objectUrl, contentType, ...dimensions };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function renderedImageFailed() {
  if (!state.assetsReady) return;
  state.assetsReady = false;
  state.overlay = false;
  setAssetStatus("图片渲染失败", "error");
  setStage("error", {
    title: "图片渲染失败",
    detail: "已加载的图片未能在工作区呈现。提交门禁已关闭，请重试当前 fixture。",
  });
  setViewControlsDisabled(true);
  updateSubmitGate();
}

function dimensionsAlign(asset, overlayAsset) {
  return asset.width === overlayAsset.width && asset.height === overlayAsset.height;
}

function renderSelectedImage() {
  if (!state.assetsReady) return;
  const fixture = state.fixture;
  const asset = state.assets.get(state.selectedView);
  const overlayKey = state.selectedView === "alpha" ? "source" : "alpha";
  const overlayAsset = state.assets.get(overlayKey);
  if (!asset || !overlayAsset) return renderedImageFailed();

  elements.baseImage.src = asset.objectUrl;
  elements.baseImage.alt = `${fixture.candidateAlias} · ${ASSET_LABELS[state.selectedView]}视图`;
  elements.overlayImage.src = overlayAsset.objectUrl;
  elements.overlayImage.alt = "";
  elements.overlayImage.dataset.overlayKind = overlayKey;

  const aligned = dimensionsAlign(asset, overlayAsset);
  elements.overlayToggle.disabled = !aligned;
  if (!aligned) state.overlay = false;
  elements.overlayImage.hidden = !(state.overlay && aligned);
  elements.overlayToggle.setAttribute("aria-pressed", String(state.overlay && aligned));

  elements.imageStack.style.width = `${asset.width}px`;
  elements.imageStack.style.height = `${asset.height}px`;
  elements.imageFrame.dataset.scale = state.scaleMode;
  const overlayLabel = state.overlay && aligned ? ` · 叠加${ASSET_LABELS[overlayKey]}` : "";
  setText(
    elements.imageCaption,
    `${fixture.candidateAlias} · ${ASSET_LABELS[state.selectedView]} · ${asset.width}×${asset.height}px${overlayLabel}`,
  );
  setText(
    elements.viewHelp,
    aligned
      ? `${ASSET_LABELS[state.selectedView]}视图 · ${state.scaleMode === "fit" ? "适配工作区" : "1:1 像素，可滚动"}`
      : `${ASSET_LABELS[state.selectedView]}与${ASSET_LABELS[overlayKey]}尺寸不一致，轮廓叠加已禁用`,
  );
}

function selectView(key, { focus = false } = {}) {
  if (!ASSET_KEYS.includes(key)) return;
  state.selectedView = key;
  for (const button of elements.viewTabs) {
    const selected = button.dataset.view === key;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) {
      elements.imagePanel.setAttribute("aria-labelledby", button.id);
      if (focus) button.focus();
    }
  }
  renderSelectedImage();
}

async function loadFixtureAssets(fixture) {
  state.assetController?.abort();
  state.assetController = new AbortController();
  const { signal } = state.assetController;
  const token = ++state.assetLoadToken;
  revokeAssets();
  state.assetsReady = false;
  state.overlay = false;
  setStage("loading");
  setAssetStatus("加载图片 0 / 6");
  setViewControlsDisabled(true);
  updateSubmitGate();

  let completed = 0;
  const loads = ASSET_KEYS.map(async (key) => {
    const asset = await fetchImageAsset(key, fixture.assets[key], signal);
    completed += 1;
    if (token === state.assetLoadToken) setAssetStatus(`加载图片 ${completed} / 6`);
    return asset;
  });
  const results = await Promise.allSettled(loads);
  if (token !== state.assetLoadToken) {
    for (const result of results) {
      if (result.status === "fulfilled") URL.revokeObjectURL(result.value.objectUrl);
    }
    return;
  }
  if (signal.aborted) return;

  const failures = results
    .map((result, index) => ({ result, key: ASSET_KEYS[index] }))
    .filter(({ result }) => result.status === "rejected");
  if (failures.length) {
    for (const result of results) {
      if (result.status === "fulfilled") URL.revokeObjectURL(result.value.objectUrl);
    }
    const details = failures.map(({ result, key }) => (
      `${ASSET_LABELS[key]}：${result.reason instanceof Error ? result.reason.message : "未知错误"}`
    ));
    setAssetStatus(`${failures.length} 张图片失败`, "error");
    setStage("error", {
      title: "fixture 图片未全部通过加载",
      detail: `${details.join("；")}。为避免错误视觉结论，提交门禁保持关闭。`,
    });
    updateSubmitGate();
    return;
  }

  for (const result of results) state.assets.set(result.value.key, result.value);
  state.assetsReady = true;
  setAssetStatus("6 / 6 已加载并解码", "ready");
  setStage("ready");
  setViewControlsDisabled(false);
  selectView(state.selectedView);
  updateSubmitGate();
}

async function selectFixture(fixtureId) {
  const fixture = state.catalog?.fixtures.find((item) => item.id === fixtureId) ?? null;
  state.fixture = fixture;
  // Close the prior fixture's visual and submission gates before changing any
  // labels, so an old decoded image can never appear under a new candidate ID.
  state.assetsReady = false;
  state.selectedView = "source";
  state.scaleMode = "fit";
  state.overlay = false;
  renderContext();
  resetReview();
  selectView("source");
  for (const button of elements.scaleButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.scale === "fit"));
  }
  if (fixture) await loadFixtureAssets(fixture);
}

function populateFixtureSelect(fixtures) {
  const fragment = document.createDocumentFragment();
  for (const fixture of fixtures) {
    const option = document.createElement("option");
    option.value = fixture.id;
    option.textContent = fixture.candidateAlias;
    fragment.append(option);
  }
  elements.fixtureSelect.replaceChildren(fragment);
  elements.fixtureSelect.disabled = fixtures.length === 0;
}

function catalogErrorMessage(error) {
  if (error instanceof FixtureCatalogError) {
    return `${error.code} · ${error.path} · ${error.message}`;
  }
  return error instanceof Error ? error.message : "未知目录错误";
}

async function loadCatalog() {
  state.catalogController?.abort();
  state.assetController?.abort();
  state.catalogController = new AbortController();
  const { signal } = state.catalogController;
  state.catalog = null;
  state.fixture = null;
  state.assetsReady = false;
  revokeAssets();
  resetContext();
  resetReview();
  elements.fixtureSelect.disabled = true;
  elements.fixtureSelect.replaceChildren(new Option("正在读取目录…", ""));
  setText(elements.catalogVersion, "正在校验 catalog schema");
  setAssetStatus("正在读取研究目录");
  setStage("loading");
  setViewControlsDisabled(true);

  try {
    const response = await fetch("/api/research/fixtures", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`研究目录返回 HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("研究目录 Content-Type 不是 application/json");
    }
    const catalog = parseFixtureCatalog(await response.json());
    if (signal.aborted) return;
    state.catalog = catalog;
    setText(
      elements.catalogVersion,
      `${catalog.catalogId} · ${catalog.catalogVersion} · ${catalog.evidenceStatus.level}`,
    );
    populateFixtureSelect(catalog.fixtures);
    if (catalog.fixtures.length === 0) {
      setAssetStatus("目录为空");
      setStage("empty");
      updateSubmitGate();
      return;
    }
    elements.fixtureSelect.value = catalog.fixtures[0].id;
    await selectFixture(catalog.fixtures[0].id);
  } catch (error) {
    if (signal.aborted) return;
    state.catalog = null;
    state.fixture = null;
    setText(elements.catalogVersion, "目录校验失败 · 未使用兜底数据");
    setAssetStatus("目录不可用", "error");
    setStage("error", {
      title: "研究目录没有通过严格校验",
      detail: `${catalogErrorMessage(error)}。页面不会伪造 fixture，提交门禁保持关闭。`,
    });
    resetContext();
    resetReview();
    updateSubmitGate();
  }
}

function draftFromForm() {
  const data = new FormData(elements.reviewForm);
  return {
    fixtureId: state.fixture?.id ?? "",
    defects: data.getAll("defect"),
    severity: String(data.get("severity") ?? ""),
    conclusion: String(data.get("conclusion") ?? ""),
    notes: elements.reviewNotes.value,
  };
}

const SEVERITY_LABELS = Object.freeze({
  none: "无",
  minor: "轻微",
  major: "严重",
  critical: "灾难级",
});

const CONCLUSION_LABELS = Object.freeze({
  usable: "可用",
  "usable-with-caveat": "有条件可用",
  reject: "拒绝",
});

function appendDefinitionList(list, entries) {
  const fragment = document.createDocumentFragment();
  for (const [term, description] of entries) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    fragment.append(dt, dd);
  }
  list.replaceChildren(fragment);
}

function lockReview(event) {
  event.preventDefault();
  clearReviewError();
  if (!state.fixture || !state.assetsReady) {
    showReviewError(["当前 fixture 的六张图片尚未全部通过加载校验"]);
    return;
  }
  const draft = draftFromForm();
  const validation = validateReviewDraft(draft, state.fixture.id);
  if (!validation.valid) {
    showReviewError(validation.errors);
    return;
  }
  state.lockedReview = lockReviewDraft(draft, state.fixture.id);
  state.review = null;
  setReviewControlsDisabled(true);
  elements.submitReview.disabled = true;
  setText(elements.reviewState, "初判已锁定");
  elements.reviewState.dataset.state = "locked";
  appendDefinitionList(elements.lockedSummary, [
    ["匿名候选", state.fixture.candidateAlias],
    ["缺陷标签", state.lockedReview.defects.length ? state.lockedReview.defects.join("、") : "未标记"],
    ["最高严重度", SEVERITY_LABELS[state.lockedReview.severity]],
    ["结论", CONCLUSION_LABELS[state.lockedReview.conclusion]],
    ["备注", state.lockedReview.notes || "未填写"],
  ]);
  elements.lockedReview.hidden = false;
  updateSubmitGate();
  elements.lockedReview.focus();
}

function revealMethod() {
  if (!state.lockedReview || !state.fixture || state.unblinded) return;
  state.unblinded = true;
  elements.revealMethod.disabled = true;
  setText(elements.reviewState, "已解盲");
  elements.reviewState.dataset.state = "revealed";
  appendDefinitionList(elements.methodDetails, [
    ["夹具名称", state.fixture.label],
    ["来源 revision", state.fixture.sourceRevision],
    ["集合 / 分区", `${state.fixture.suite} / ${state.fixture.partition}`],
    ["方法", state.fixture.methodLabel],
    ["方法说明", state.fixture.methodDetails],
    ["夹具类别", state.fixture.facts.category],
    ["边缘类型", state.fixture.facts.edgeType],
    ["预期用途", state.fixture.facts.expectedUse],
    ["权利记录", state.fixture.rightsRecordId],
    ["可见性", state.fixture.visibility],
    ["证据等级", `${state.fixture.evidenceStatus.level} · ${state.fixture.evidenceStatus.purpose}`],
  ]);
  elements.unblindedDetails.hidden = false;
  elements.unblindedDetails.focus();
}

function handleTabKeydown(event) {
  const currentIndex = elements.viewTabs.indexOf(event.currentTarget);
  if (currentIndex < 0) return;
  let nextIndex = null;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % elements.viewTabs.length;
  if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + elements.viewTabs.length) % elements.viewTabs.length;
  }
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = elements.viewTabs.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  selectView(elements.viewTabs[nextIndex].dataset.view, { focus: true });
}

function bindEvents() {
  elements.fixtureSelect.addEventListener("change", () => selectFixture(elements.fixtureSelect.value));
  elements.errorRetry.addEventListener("click", () => {
    if (state.catalog && state.fixture) loadFixtureAssets(state.fixture);
    else loadCatalog();
  });
  elements.emptyRetry.addEventListener("click", loadCatalog);
  elements.reviewForm.addEventListener("submit", lockReview);
  elements.revealMethod.addEventListener("click", revealMethod);
  elements.reviewNotes.addEventListener("input", () => {
    setText(elements.notesCount, `${elements.reviewNotes.value.length} / 1200`);
  });
  for (const button of elements.viewTabs) {
    button.addEventListener("click", () => selectView(button.dataset.view));
    button.addEventListener("keydown", handleTabKeydown);
  }
  for (const button of elements.scaleButtons) {
    button.addEventListener("click", () => {
      state.scaleMode = button.dataset.scale;
      for (const candidate of elements.scaleButtons) {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      }
      renderSelectedImage();
    });
  }
  elements.overlayToggle.addEventListener("click", () => {
    state.overlay = !state.overlay;
    renderSelectedImage();
  });
  elements.baseImage.addEventListener("error", renderedImageFailed);
  elements.overlayImage.addEventListener("error", renderedImageFailed);
  window.addEventListener("beforeunload", () => {
    state.catalogController?.abort();
    state.assetController?.abort();
    revokeAssets();
  });
}

makeTaxonomy();
bindEvents();
loadCatalog();
