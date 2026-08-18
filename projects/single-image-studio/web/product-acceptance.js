const CASES = Object.freeze([
  Object.freeze({
    id: "privacy-share",
    label: "隐私友好分享副本",
    width: 1366,
    height: 768,
    taskId: "UT-PRIVACY-SHARE",
    nextTaskId: "UT-TUNE",
    path: "合成图 → metadata 清理 → JPEG ≤ 1 MB",
    expected: Object.freeze({ width: 1440, height: 1080, mime: "image/jpeg" }),
  }),
  Object.freeze({
    id: "desktop-min",
    label: "1280 × 720",
    width: 1280,
    height: 720,
    taskId: "UT-TUNE",
    nextTaskId: "UT-ENHANCE",
    path: "合成图 → 保真整理 → 1:1 + 旋转 90° → PNG",
    expected: Object.freeze({ width: 1080, height: 1080 }),
  }),
  Object.freeze({
    id: "desktop-common",
    label: "1440 × 900",
    width: 1440,
    height: 900,
    taskId: "UT-TEMPLATE",
    nextTaskId: "UT-TUNE",
    path: "合成图 → 横版封面 16:9 → PNG",
    expected: Object.freeze({ width: 1440, height: 810 }),
  }),
  Object.freeze({
    id: "old-photo-local",
    label: "老照片本地整理",
    width: 1366,
    height: 768,
    taskId: "UT-OLD-PHOTO",
    nextTaskId: "UT-TUNE",
    path: "合成图 → 老照片基础整理 → 黑白层次 → PNG",
    expected: Object.freeze({ width: 1448, height: 1086 }),
  }),
  Object.freeze({
    id: "upload-specification",
    label: "上传规格适配",
    width: 1366,
    height: 768,
    taskId: "UT-UPLOAD",
    nextTaskId: "UT-TUNE",
    path: "合成图 → 严格表单 → JPEG ≤ 1 MB",
    expected: Object.freeze({ width: 1200, height: 900, mime: "image/jpeg" }),
  }),
  Object.freeze({
    id: "document-archive",
    label: "文档归档附件",
    width: 1366,
    height: 768,
    taskId: "UT-DOC-ARCHIVE",
    nextTaskId: "UT-TUNE",
    path: "非正方形文档 → 清晰彩色 → JPEG ≤ 1 MB",
    expected: Object.freeze({ width: 1448, height: 1086, mime: "image/jpeg" }),
  }),
]);

const frame = document.querySelector("#product-frame");
const runButton = document.querySelector("#run-acceptance");
const status = document.querySelector("#acceptance-status");
const resultsBody = document.querySelector("#acceptance-results");
const reportRunId = new URLSearchParams(location.search).get("reportRunId") ?? crypto.randomUUID();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(read, message, timeoutMs = 12_000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

function waitForFrameLoad() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("产品页加载超时")), 12_000);
    frame.addEventListener("load", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function setControl(windowRef, control, value) {
  control.value = String(value);
  control.dispatchEvent(new windowRef.Event("input", { bubbles: true }));
  control.dispatchEvent(new windowRef.Event("change", { bubbles: true }));
}

async function reopenPng(blob, expected) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert(blob.type === "image/png", `下载 MIME 不是 image/png：${blob.type || "empty"}`);
  assert(bytes.length > 8, "下载文件为空");
  assert(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47, "下载文件没有 PNG 签名");
  const bitmap = await createImageBitmap(blob, { imageOrientation: "none", colorSpaceConversion: "none", premultiplyAlpha: "none" });
  try {
    assert(bitmap.width === expected.width && bitmap.height === expected.height, `下载重开尺寸为 ${bitmap.width} × ${bitmap.height}`);
  } finally {
    bitmap.close();
  }
  return bytes.length;
}

async function reopenOutput(blob, expected) {
  if ((expected.mime ?? "image/png") === "image/png") return reopenPng(blob, expected);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert(blob.type === "image/jpeg", `下载 MIME 不是 image/jpeg：${blob.type || "empty"}`);
  assert(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9, "下载文件没有完整 JPEG 签名");
  const bitmap = await createImageBitmap(blob, { imageOrientation: "none", colorSpaceConversion: "none", premultiplyAlpha: "none" });
  try { assert(bitmap.width === expected.width && bitmap.height === expected.height, `下载重开尺寸为 ${bitmap.width} × ${bitmap.height}`); } finally { bitmap.close(); }
  return bytes.length;
}

async function runCase(testCase) {
  frame.style.width = `${testCase.width}px`;
  frame.style.height = `${testCase.height}px`;
  const loadPromise = waitForFrameLoad();
  frame.src = `./?acceptance=${encodeURIComponent(testCase.id)}&refresh=${Date.now()}`;
  await loadPromise;

  const windowRef = frame.contentWindow;
  const documentRef = frame.contentDocument;
  assert(windowRef && documentRef, "无法读取同源产品页");
  const consoleErrors = [];
  const originalConsoleError = windowRef.console.error;
  windowRef.console.error = (...args) => {
    consoleErrors.push(args.map(String).join(" "));
    originalConsoleError.apply(windowRef.console, args);
  };

  let downloadCapture = null;
  const originalAnchorClick = windowRef.HTMLAnchorElement.prototype.click;
  windowRef.HTMLAnchorElement.prototype.click = function captureDownload() {
    if (this.download && this.href.startsWith("blob:")) {
      downloadCapture = Object.freeze({
        filename: this.download,
        blobPromise: windowRef.fetch(this.href).then((response) => response.blob()),
      });
      return;
    }
    return originalAnchorClick.call(this);
  };

  try {
    const sourceButtonId = ["UT-OLD-PHOTO", "UT-DOC-ARCHIVE"].includes(testCase.taskId) ? "#use-old-photo-demo-button" : "#use-demo-button";
    documentRef.querySelector(sourceButtonId)?.click();
    const consent = await waitFor(
      () => !documentRef.querySelector("#consent-card")?.hidden && documentRef.querySelector("#rights-checkbox"),
      "合成图没有进入处理前确认",
    );
    consent.checked = true;
    consent.dispatchEvent(new windowRef.Event("change", { bubbles: true }));
    const confirm = documentRef.querySelector("#confirm-source-button");
    assert(confirm && !confirm.disabled, "来源确认按钮没有解锁");
    confirm.click();

    await waitFor(() => !documentRef.querySelector("#tasks-section")?.hidden, "任务列表没有出现");
    const groups = [...documentRef.querySelectorAll("[data-task-group]")].map((node) => node.dataset.taskGroup);
    assert(groups[0] === "scenarios" && groups[1] === "tools", `任务分组顺序异常：${groups.join(",")}`);
    assert(groups.every((group, index) => ["scenarios", "tools", "creative"][index] === group), `出现未知或乱序任务分组：${groups.join(",")}`);
    const capabilityCards = [...documentRef.querySelectorAll("#capability-summary .capability-summary-card")];
    const capabilityNames = capabilityCards.map((node) => node.querySelector("strong")?.textContent);
    assert(capabilityNames[0] === "本地基础能力", `首个能力层不是本地基础能力：${capabilityNames.join(",")}`);
    assert(capabilityCards[0].dataset.state === "available", "本地基础能力没有显示为可用");
    assert(capabilityNames.every((name) => ["本地基础能力", "远程抠图能力", "生成式能力"].includes(name)), `出现未知能力层：${capabilityNames.join(",")}`);
    const scenarioTasks = [...documentRef.querySelectorAll('[data-task-group="scenarios"] [data-task-id]')]
      .map((node) => node.dataset.taskId);
    const requiredLocalScenarios = ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TEMPLATE", "UT-GRID", "UT-OLD-PHOTO"];
    assert(requiredLocalScenarios.every((taskId) => scenarioTasks.includes(taskId)), `本地场景流程缺失：${scenarioTasks.join(",")}`);
    const productTask = documentRef.querySelector('[data-task-id="UT-PRODUCT"]');
    const portraitTask = documentRef.querySelector('[data-task-id="UT-PORTRAIT"]');
    if (productTask) assert(productTask.dataset.scenarioSkill === "product-white-background", "商品白底图没有注册场景身份");
    if (portraitTask) assert(portraitTask.dataset.scenarioSkill === "application-photo", "报名照没有注册场景身份");
    assert(documentRef.querySelector('[data-task-id="UT-TEMPLATE"]')?.dataset.scenarioSkill === "social-layout", "社交构图没有注册场景身份");
    assert(documentRef.querySelector('[data-task-id="UT-GRID"]')?.dataset.scenarioSkill === "social-grid-split", "社交九宫格没有注册场景身份");
    assert(documentRef.querySelector('[data-task-id="UT-OLD-PHOTO"]')?.dataset.scenarioSkill === "old-photo-restoration", "老照片基础整理没有注册场景身份");
    const taskButton = documentRef.querySelector(`[data-task-id="${testCase.taskId}"]`);
    assert(taskButton && !taskButton.disabled, `${testCase.taskId} 当前不可用`);
    taskButton.click();

    await waitFor(() => !documentRef.querySelector("#config-section")?.hidden, "任务设置没有出现");
    const ratio = documentRef.querySelector("#ratio-setting");
    if (testCase.taskId === "UT-PRIVACY-SHARE") {
      const preset = documentRef.querySelector('[data-privacy-share-preset="balanced"]');
      assert(preset, "日常分享预设缺失");
      preset.click();
      assert(documentRef.querySelector(".format-conversion-boundary")?.textContent.includes("不检查可见内容"), "隐私分享边界没有显示");
    } else if (testCase.taskId === "UT-UPLOAD") {
      const preset = documentRef.querySelector('[data-upload-preset="strict"]');
      assert(preset, "严格表单预设缺失");
      preset.click();
    } else if (testCase.taskId === "UT-DOC-ARCHIVE") {
      assert(documentRef.querySelector('[data-rectification-view="adjust"]'), "文档归档四角入口缺失");
      assert(documentRef.querySelector('[data-document-scan-mode="clean-color"]')?.getAttribute("aria-pressed") === "true", "清晰彩色默认模式没有选中");
    } else if (testCase.taskId === "UT-TUNE") {
      assert(ratio, "裁剪方式控件缺失");
      setControl(windowRef, ratio, "square");
      setControl(windowRef, documentRef.querySelector("#rotation-setting"), 90);
    } else if (testCase.taskId === "UT-OLD-PHOTO") {
      const preset = documentRef.querySelector('[data-old-photo-preset="monochrome"]');
      assert(preset, "黑白层次预设缺失");
      preset.click();
      assert(preset.getAttribute("aria-pressed") === "true", "黑白层次预设没有进入选中状态");
    } else {
      const preset = documentRef.querySelector('[data-scene-template="wide-cover"]');
      assert(preset, "横版封面模板缺失");
      preset.click();
      assert(preset.getAttribute("aria-pressed") === "true", "横版封面模板没有进入选中状态");
      setControl(windowRef, documentRef.querySelector('#social-title-setting'), "今天的城市散步");
      setControl(windowRef, documentRef.querySelector('#social-title-position-setting'), "bottom");
      setControl(windowRef, documentRef.querySelector('#social-title-alignment-setting'), "left");
      setControl(windowRef, documentRef.querySelector('#social-title-tone-setting'), "light");
      const titlePreview = documentRef.querySelector("#social-title-preview");
      assert(titlePreview && !titlePreview.hidden && titlePreview.textContent === "今天的城市散步", "社交标题没有进入裁剪安全区预览");
    }
    if (documentRef.querySelector("#format-setting")) setControl(windowRef, documentRef.querySelector("#format-setting"), "png");
    const runTaskButton = documentRef.querySelector("#run-button");
    assert(runTaskButton && !runTaskButton.disabled, `生成按钮不可用：${documentRef.querySelector("#editor-settings-error")?.textContent || "没有表单错误说明"}`);
    runTaskButton.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const submitStarted = documentRef.querySelector("#config-section")?.hidden
      || !documentRef.querySelector("#status-panel")?.hidden
      || !documentRef.querySelector("#result-section")?.hidden
      || !documentRef.querySelector("#error-panel")?.hidden;
    assert(submitStarted, `点击生成后仍停在设置页：${documentRef.querySelector("#editor-settings-error")?.textContent || "没有表单错误说明"}`);

    const terminalTimeout = ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE"].includes(testCase.taskId) ? 45_000 : 12_000;
    let terminalSurface;
    try {
      terminalSurface = await waitFor(() => !documentRef.querySelector("#result-section")?.hidden
        ? "result"
        : !documentRef.querySelector("#error-panel")?.hidden ? "error" : null, "结果页或错误页都没有出现", terminalTimeout);
    } catch {
      throw new Error(`结果页或错误页都没有出现；当前状态：${documentRef.querySelector("#status-title")?.textContent ?? "未知"} · ${documentRef.querySelector("#status-copy")?.textContent ?? "无进度"}`);
    }
    if (terminalSurface === "error") {
      throw new Error(`${documentRef.querySelector("#error-title")?.textContent ?? "处理失败"}：${documentRef.querySelector("#error-copy")?.textContent ?? "没有错误详情"}`);
    }
    const resultImage = await waitFor(() => {
      const image = documentRef.querySelector("#result-output-image");
      return image?.complete && image.naturalWidth > 0 ? image : null;
    }, "结果图片没有完成解码");
    assert(resultImage.naturalWidth === testCase.expected.width && resultImage.naturalHeight === testCase.expected.height, `结果显示尺寸为 ${resultImage.naturalWidth} × ${resultImage.naturalHeight}`);
    if (testCase.taskId === "UT-TEMPLATE") {
      assert(documentRef.querySelector("#qa-copy")?.textContent.includes("标题安全区"), "社交结果没有记录标题像素检查");
    }
    if (testCase.taskId === "UT-PRIVACY-SHARE") {
      assert(documentRef.querySelector("#privacy-share-card")?.hidden === false, "分享副本检查卡没有显示");
      assert(documentRef.querySelector("#privacy-share-state")?.textContent === "全部通过", "分享副本检查没有全部通过");
      assert(documentRef.querySelector("#privacy-share-boundary")?.textContent.includes("画面中可见的敏感内容需要你自行检查"), "分享副本没有显示可见内容边界");
    }
    assert(windowRef.getComputedStyle(resultImage).objectFit === "contain", "结果图片没有使用完整显示模式");
    assert(documentRef.documentElement.scrollWidth <= windowRef.innerWidth + 1, `页面出现横向溢出：${documentRef.documentElement.scrollWidth} > ${windowRef.innerWidth}`);
    assert(documentRef.activeElement?.id === "download-button", "结果完成后焦点没有落在下载按钮");
    documentRef.querySelector("#download-button")?.click();
    const capture = await waitFor(() => downloadCapture, "下载按钮没有生成可下载 Blob");
    const blob = await capture.blobPromise;
    const byteLength = await reopenOutput(blob, testCase.expected);
    const expectedExtension = (testCase.expected.mime ?? "image/png") === "image/jpeg" ? ".jpg" : ".png";
    assert(capture.filename.toLowerCase().endsWith(expectedExtension), `下载文件扩展名错误：${capture.filename}`);

    downloadCapture = null;
    const changeTask = documentRef.querySelector("#result-change-task-button");
    assert(changeTask, "结果页缺少换处理方向入口");
    changeTask.click();
    await waitFor(() => !documentRef.querySelector("#tasks-section")?.hidden, "没有从结果页返回任务列表");
    assert(documentRef.querySelector("main")?.dataset.pageState === "TASKS_READY", "返回任务列表后状态没有清理");
    assert(documentRef.querySelector("#result-section")?.hidden === true, "旧结果页仍然可见");
    assert(!documentRef.querySelector("#result-output-image")?.hasAttribute("src"), "旧结果图片仍留在页面中");
    assert(documentRef.activeElement?.matches?.('[data-task-id]:not([disabled])'), "返回任务列表后焦点没有落在可用任务上");
    documentRef.querySelector("#download-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert(downloadCapture === null, "返回任务列表后旧下载仍可触发");

    const nextTask = documentRef.querySelector(`[data-task-id="${testCase.nextTaskId}"]`);
    assert(nextTask && !nextTask.disabled, `${testCase.nextTaskId} 当前不可用`);
    nextTask.click();
    await waitFor(() => !documentRef.querySelector("#config-section")?.hidden, "更换处理方向后设置页没有出现");
    assert(documentRef.activeElement?.id === "ratio-setting", "更换处理方向后焦点没有落在首个设置控件");
    documentRef.querySelector("#back-to-tasks-button")?.click();
    await waitFor(() => !documentRef.querySelector("#tasks-section")?.hidden, "没有从设置页返回任务列表");
    assert(documentRef.querySelector("main")?.dataset.pageState === "TASKS_READY", "从设置页返回后状态没有清理");
    assert(documentRef.activeElement?.matches?.('[data-task-id]:not([disabled])'), "从设置页返回后焦点没有回到可用任务");
    assert(consoleErrors.length === 0, `流程出现 console.error：${consoleErrors.join(" | ")}`);
    return Object.freeze({
      ...testCase,
      filename: capture.filename,
      byteLength,
      evidence: `${testCase.expected.width} × ${testCase.expected.height} · ${byteLength.toLocaleString("zh-CN")} bytes · 完整显示、${(testCase.expected.mime ?? "image/png") === "image/jpeg" ? "JPEG" : "PNG"} 重开、换任务与焦点清理通过`,
    });
  } finally {
    windowRef.console.error = originalConsoleError;
    windowRef.HTMLAnchorElement.prototype.click = originalAnchorClick;
  }
}

function appendResult(testCase, result, passed) {
  const row = document.createElement("tr");
  row.dataset.state = passed ? "pass" : "fail";
  row.innerHTML = `<td>${testCase.label}</td><td>${testCase.path}</td><td>${passed ? "通过" : "失败"}</td><td>${passed ? result.evidence : result.message}</td>`;
  resultsBody.append(row);
}

async function publishAcceptanceReport({ startedAt, cases }) {
  const response = await fetch("/api/internal/product-acceptance/latest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      version: "product-acceptance-report-v2",
      runId: reportRunId,
      startedAt,
      completedAt: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
      cases,
    }),
  });
  if (!response.ok) throw new Error(`本地验收回报失败：HTTP ${response.status}`);
  const body = await response.json();
  assert(body.accepted === true && body.report?.runId === reportRunId.toLowerCase(), "本地验收回报没有闭合");
}

async function runAcceptance() {
  const startedAt = new Date().toISOString();
  runButton.disabled = true;
  resultsBody.replaceChildren();
  status.dataset.state = "running";
  status.textContent = `正在运行 0 / ${CASES.length}`;
  let passed = 0;
  const reportCases = [];
  for (let index = 0; index < CASES.length; index += 1) {
    const testCase = CASES[index];
    status.textContent = `正在运行 ${index + 1} / ${CASES.length} · ${testCase.label}`;
    try {
      const result = await runCase(testCase);
      appendResult(testCase, result, true);
      reportCases.push({ id: testCase.id, passed: true, evidence: result.evidence });
      passed += 1;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      appendResult(testCase, failure, false);
      reportCases.push({ id: testCase.id, passed: false, evidence: failure.message });
    }
  }
  try {
    await publishAcceptanceReport({ startedAt, cases: reportCases });
    status.dataset.state = passed === CASES.length ? "pass" : "fail";
    status.textContent = passed === CASES.length ? `全部通过 · ${passed} / ${CASES.length}` : `存在失败 · ${passed} / ${CASES.length}`;
  } catch (error) {
    status.dataset.state = "fail";
    status.textContent = error instanceof Error ? error.message : String(error);
  }
  runButton.disabled = false;
}

runButton.addEventListener("click", runAcceptance);
runAcceptance();
