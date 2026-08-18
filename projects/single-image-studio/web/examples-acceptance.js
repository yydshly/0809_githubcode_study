const CASES = Object.freeze([
  Object.freeze({ id: "examples-desktop", label: "桌面 1180 px", width: 1180, stacked: false }),
  Object.freeze({ id: "examples-narrow", label: "窄屏 390 px", width: 390, stacked: true }),
]);

const runId = new URLSearchParams(location.search).get("reportRunId") ?? crypto.randomUUID();
const status = document.querySelector("#examples-acceptance-status");
const results = document.querySelector("#examples-acceptance-results");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForReady(frame, timeoutMs = 30_000) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const documentElement = frame.contentDocument?.documentElement;
    if (documentElement?.dataset.examplesReady) return documentElement.dataset.examplesReady;
    await wait(50);
  }
  throw new Error("样例页本地结果等待超时");
}

async function waitForImages(document, timeoutMs = 30_000) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const images = [...document.querySelectorAll(".example-image img")];
    if (images.length === 18 && images.every((image) => !image.hidden && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)) {
      return images;
    }
    await wait(50);
  }
  throw new Error("样例图片加载等待超时");
}

function visibleCards(document) {
  return [...document.querySelectorAll("[data-example-id]")].filter((card) => !card.hidden);
}

function outputFacts(document, exampleId) {
  const values = [...document.querySelectorAll(`[data-example-id="${exampleId}"] [data-example-facts="true"] strong`)]
    .map((node) => node.textContent.trim());
  return `${exampleId} ${values[2]} ${values[3]}`;
}

function imageDifference(document, exampleId) {
  const card = document.querySelector(`[data-example-id="${exampleId}"]`);
  const source = card.querySelector('[data-example-image="source"]');
  const result = card.querySelector('[data-example-image="result"]');
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(result, 0, 0, canvas.width, canvas.height);
  const after = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let absolute = 0; let changed = 0;
  for (let index = 0; index < before.length; index += 4) {
    const delta = Math.abs(before[index] - after[index]) + Math.abs(before[index + 1] - after[index + 1]) + Math.abs(before[index + 2] - after[index + 2]);
    absolute += delta;
    if (delta >= 18) changed += 1;
  }
  return Object.freeze({
    meanAbsoluteChannelDelta: absolute / (canvas.width * canvas.height * 3),
    changedPixelPercent: changed / (canvas.width * canvas.height) * 100,
  });
}

async function runCase(testCase) {
  const frame = document.createElement("iframe");
  frame.className = "qa-frame";
  frame.width = String(testCase.width);
  frame.height = "1000";
  frame.title = `${testCase.label} 样例页验收`;
  frame.src = `./examples.html?acceptance=${testCase.id}&cache=${encodeURIComponent(runId)}`;
  document.body.append(frame);
  try {
    await new Promise((resolve, reject) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.addEventListener("error", () => reject(new Error("样例页 iframe 加载失败")), { once: true });
    });
    const ready = await waitForReady(frame);
    const document = frame.contentDocument;
    if (ready !== "true") {
      const failures = [...document.querySelectorAll('[data-runtime-state="failed"] [data-example-state="result"]')]
        .map((node) => node.textContent.trim())
        .filter(Boolean);
      throw new Error(failures.length ? failures.join("；") : "至少一个本地即时样例生成失败");
    }
    const cards = [...document.querySelectorAll("[data-example-id]")];
    assert(cards.length === 9, `样例卡片应为 9，实际 ${cards.length}`);
    assert(cards.filter((card) => card.dataset.runtimeState === "ready").length === 6, "六项本地即时结果未全部完成");
    const images = await waitForImages(document);
    assert(images.length === 18, `原图与结果应为 18 张，实际 ${images.length}`);
    assert(images.every((image) => !image.hidden && image.naturalWidth > 0 && image.naturalHeight > 0), "存在未加载或隐藏的样例图片");
    assert(images.every((image) => getComputedStyle(image).objectFit === "contain"), "样例图片未使用 contain 完整显示");
    assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, "样例页出现横向溢出");
    const oldPhotoDifference = imageDifference(document, "old-photo-local");
    assert(oldPhotoDifference.meanAbsoluteChannelDelta >= 8, `老照片本地样例差异过弱：${oldPhotoDifference.meanAbsoluteChannelDelta.toFixed(2)}`);
    assert(oldPhotoDifference.changedPixelPercent >= 80, `老照片本地样例变化覆盖不足：${oldPhotoDifference.changedPixelPercent.toFixed(1)}%`);
    for (const exampleId of ["old-photo-local", "old-photo-codex-reference"]) {
      const link = document.querySelector(`[data-example-id="${exampleId}"] [data-example-result-link="true"]`);
      assert(link && !link.hidden && link.href, `${exampleId} 缺少可放大的结果入口`);
    }

    const pair = document.querySelector(".example-pair");
    const [source, result] = pair.children;
    const sourceRect = source.getBoundingClientRect();
    const resultRect = result.getBoundingClientRect();
    if (testCase.stacked) assert(resultRect.top >= sourceRect.bottom - 1, "窄屏原图与结果没有上下排列");
    else assert(Math.abs(resultRect.top - sourceRect.top) <= 1 && resultRect.left > sourceRect.left, "桌面原图与结果没有左右排列");

    document.querySelector('[data-example-filter="reference"]').click();
    assert(visibleCards(document).length === 1, "视觉参考筛选没有只保留一项");
    document.querySelector('[data-example-filter="all"]').click();
    assert(visibleCards(document).length === 9, "恢复全部筛选后卡片不完整");
    const generated = ["privacy-share-local", "document-rectified", "upload-strict", "compression-500kb"]
      .map((exampleId) => outputFacts(document, exampleId))
      .join(" · ");
    return `${testCase.width} px · 9 cards · 18 complete images · old-photo delta ${oldPhotoDifference.meanAbsoluteChannelDelta.toFixed(2)} / ${oldPhotoDifference.changedPixelPercent.toFixed(1)}% · filter and overflow pass · ${generated}`;
  } finally {
    frame.remove();
  }
}

function appendRow(testCase, passed, evidence) {
  const row = document.createElement("tr");
  row.dataset.state = passed ? "pass" : "fail";
  for (const value of [testCase.label, passed ? "通过" : "失败", evidence]) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  results.append(row);
}

async function publish(startedAt, cases) {
  const response = await fetch("/api/internal/examples-acceptance/latest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      version: "examples-acceptance-report-v1",
      runId,
      startedAt,
      completedAt: new Date().toISOString(),
      browser: { userAgent: navigator.userAgent, language: navigator.language },
      cases,
    }),
  });
  if (!response.ok) throw new Error(`样例验收报告提交失败：HTTP ${response.status}`);
}

async function initialize() {
  const startedAt = new Date().toISOString();
  const reportCases = [];
  let passed = 0;
  for (const testCase of CASES) {
    try {
      const evidence = await runCase(testCase);
      appendRow(testCase, true, evidence);
      reportCases.push({ id: testCase.id, passed: true, evidence });
      passed += 1;
    } catch (error) {
      const evidence = error?.message || "未知错误";
      appendRow(testCase, false, evidence);
      reportCases.push({ id: testCase.id, passed: false, evidence });
    }
  }
  await publish(startedAt, reportCases);
  status.textContent = passed === CASES.length ? `全部通过 · ${passed}/${CASES.length}` : `存在失败 · ${passed}/${CASES.length}`;
  status.dataset.state = passed === CASES.length ? "pass" : "fail";
}

initialize().catch((error) => {
  status.textContent = error?.message || "样例验收没有完成";
  status.dataset.state = "fail";
});
