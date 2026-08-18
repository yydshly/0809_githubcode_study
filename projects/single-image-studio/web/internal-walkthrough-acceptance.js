const CASES = Object.freeze([
  Object.freeze({ id: "walkthrough-desktop", label: "桌面 1180 px", width: 1180 }),
  Object.freeze({ id: "walkthrough-narrow", label: "窄屏 390 px", width: 390 }),
]);
const runId = new URLSearchParams(location.search).get("reportRunId") ?? crypto.randomUUID();
const status = document.querySelector("#walkthrough-acceptance-status");
const results = document.querySelector("#walkthrough-acceptance-results");
function assert(condition, message) { if (!condition) throw new Error(message); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function walkthroughFixture(sessionId, buildCommit = "abcdef1") {
  return { version: "internal-walkthrough-record-v1", sessionId, buildCommit, browserProfile: "Chromium QA · synthetic", startedAt: "2026-08-18T04:00:00.000Z", completedAt: "2026-08-18T04:03:00.000Z", consentConfirmed: true, projectImagesOnly: true, tasks: [
    { taskId: "basic-edit", outcome: "completed-unassisted", durationSeconds: 70, helpCount: 0, entryFound: true, downloadObserved: true, boundaryUnderstood: true, confidence: 4, issueCode: "none", boundedNote: "不应进入汇总" },
    { taskId: "privacy-share", outcome: "completed-assisted", durationSeconds: 95, helpCount: 1, entryFound: true, downloadObserved: true, boundaryUnderstood: false, confidence: 3, issueCode: "boundary-not-understood", boundedNote: "不应进入汇总" },
  ], overallNote: "不应进入汇总" };
}
async function runCase(testCase) {
  const frame = document.createElement("iframe");
  frame.className = "qa-frame"; frame.width = String(testCase.width); frame.height = "1400"; frame.src = `./internal-walkthrough.html?acceptance=${testCase.id}`;
  document.body.append(frame);
  try {
    await new Promise((resolve, reject) => { frame.addEventListener("load", resolve, { once: true }); frame.addEventListener("error", reject, { once: true }); });
    for (let index = 0; index < 100 && frame.contentDocument?.documentElement.dataset.internalWalkthroughReady !== "true"; index += 1) await wait(25);
    const document = frame.contentDocument;
    assert(document.documentElement.dataset.internalWalkthroughReady === "true", "走查台没有就绪");
    assert(document.querySelectorAll("[data-walkthrough-task]").length === 2, "固定任务不是两项");
    assert(document.querySelectorAll('input[type="file"]').length === 0, "走查台不应收集图片");
    assert(!document.body.textContent.includes("姓名" ) || document.body.textContent.includes("不填写任何真实姓名"), "身份边界文案缺失");
    const start = document.querySelector("#walkthrough-start");
    assert(start.disabled, "未同意时可以开始");
    for (const id of ["#walkthrough-consent", "#walkthrough-project-images"]) { const input = document.querySelector(id); input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
    assert(!start.disabled, "确认边界后仍不能开始");
    start.click();
    for (const taskId of ["basic-edit", "privacy-share"]) {
      const card = document.querySelector(`[data-walkthrough-task="${taskId}"]`);
      assert(!card.hidden, `${taskId} 未进入`);
      for (const field of ["entryFound", "downloadObserved", "boundaryUnderstood"]) card.querySelector(`[data-task-field="${field}"]`).checked = true;
      card.querySelector(`[data-task-complete="${taskId}"]`).click();
    }
    assert(!document.querySelector("#walkthrough-finish").hidden, "两项任务后没有结束区");
    document.querySelector("#walkthrough-complete").click();
    assert(!document.querySelector("#walkthrough-summary").hidden, "匿名记录未通过本地校验");
    const record = JSON.parse(document.querySelector("#walkthrough-json").textContent);
    assert(record.tasks.length === 2 && record.consentConfirmed && record.projectImagesOnly, "匿名记录闭包不完整");
    document.querySelector("#walkthrough-reset").click();
    assert(document.querySelector("#walkthrough-start").disabled, "清空后同意门没有恢复");
    assert(document.querySelector("#walkthrough-summary").hidden, "清空后仍显示上一场记录");
    assert([...document.querySelectorAll("[data-walkthrough-task]")].every((card) => card.hidden), "清空后仍显示上一场任务");
    assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, "走查台横向溢出");
    const hubLoaded = new Promise((resolve, reject) => { frame.addEventListener("load", resolve, { once: true }); frame.addEventListener("error", reject, { once: true }); });
    frame.src = `./quality-hub.html?acceptance=${testCase.id}`;
    await hubLoaded;
    for (let index = 0; index < 100 && frame.contentDocument?.documentElement.dataset.qualityHubReady !== "true"; index += 1) await wait(25);
    const hub = frame.contentDocument;
    assert(hub.documentElement.dataset.qualityHubReady === "true", "内部质量入口没有就绪");
    assert(hub.querySelectorAll("[data-quality-card]").length === 4, "内部质量入口不是四项工具");
    assert(hub.querySelectorAll("[data-page-directory-entry]").length === 13, "页面注册目录不完整");
    assert(hub.querySelectorAll("[data-page-category]").length === 5, "页面角色分类不完整");
    assert(hub.querySelector("[data-human-denominator]").textContent.includes("0 / 2–3"), "真人分母边界缺失");
    assert([...hub.querySelectorAll(".quality-card .button")].every((link) => link.getAttribute("href")?.startsWith("./")), "内部工具入口不完整");
    assert(hub.querySelector('a[href="./internal-walkthrough-summary.html"]'), "缺少匿名记录汇总入口");
    const registeredLinks = [...hub.querySelectorAll("[data-page-directory-entry] a")];
    const routeResponses = await Promise.all(registeredLinks.map((link) => fetch(link.href, { cache: "no-store" })));
    assert(routeResponses.every((response) => response.ok && response.headers.get("content-type")?.startsWith("text/html")), "登记页面存在不可访问路由");
    assert(hub.documentElement.scrollWidth <= hub.documentElement.clientWidth + 1, "内部质量入口横向溢出");
    const summaryLoaded = new Promise((resolve, reject) => { frame.addEventListener("load", resolve, { once: true }); frame.addEventListener("error", reject, { once: true }); });
    frame.src = `./internal-walkthrough-summary.html?acceptance=${testCase.id}`;
    await summaryLoaded;
    for (let index = 0; index < 100 && frame.contentDocument?.documentElement.dataset.walkthroughSummaryReady !== "true"; index += 1) await wait(25);
    const summaryPage = frame.contentDocument;
    const transfer = new frame.contentWindow.DataTransfer();
    transfer.items.add(new frame.contentWindow.File([JSON.stringify(walkthroughFixture("IW-S01"))], "iw-s01.json", { type: "application/json" }));
    transfer.items.add(new frame.contentWindow.File([JSON.stringify(walkthroughFixture("IW-S02"))], "iw-s02.json", { type: "application/json" }));
    const summaryInput = summaryPage.querySelector("#summary-file-input");
    summaryInput.files = transfer.files;
    summaryInput.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    for (let index = 0; index < 100 && summaryPage.documentElement.dataset.walkthroughSummaryState !== "ready"; index += 1) await wait(25);
    assert(summaryPage.documentElement.dataset.walkthroughSummaryState === "ready", "匿名记录未完成本地汇总");
    assert(summaryPage.querySelector("#summary-session-count").textContent === "2", "匿名场次汇总错误");
    const aggregateText = summaryPage.querySelector("#summary-json-preview").textContent;
    assert(!aggregateText.includes("IW-S01") && !aggregateText.includes("不应进入汇总"), "汇总泄漏场次编号或自由文本");
    assert(summaryPage.documentElement.scrollWidth <= summaryPage.documentElement.clientWidth + 1, "走查汇总页横向溢出");
    summaryPage.querySelector("#summary-clear").click();
    assert(summaryPage.querySelector("#summary-results").hidden, "清空后仍显示汇总结果");
    return `${testCase.width} px · 13 routes HTTP 200 + registry + walkthrough + aggregate pass`;
  } finally { frame.remove(); }
}
function row(testCase, passed, evidence) { const tr=document.createElement("tr"); tr.dataset.state=passed?"pass":"fail"; for(const value of [testCase.label,passed?"通过":"失败",evidence]){const td=document.createElement("td");td.textContent=value;tr.append(td);} results.append(tr); }
async function initialize() {
  const startedAt = new Date().toISOString(); const cases=[]; let passed=0;
  for (const testCase of CASES) { try { const evidence=await runCase(testCase); row(testCase,true,evidence); cases.push({id:testCase.id,passed:true,evidence}); passed+=1; } catch(error) { const evidence=error?.message||"未知错误"; row(testCase,false,evidence); cases.push({id:testCase.id,passed:false,evidence}); } }
  const response=await fetch("/api/internal/walkthrough-acceptance/latest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({version:"walkthrough-acceptance-report-v1",runId,startedAt,completedAt:new Date().toISOString(),browser:{userAgent:navigator.userAgent,language:navigator.language},cases})});
  if(!response.ok) throw new Error(`走查台验收报告提交失败：HTTP ${response.status}`); status.textContent=passed===CASES.length?`全部通过 · ${passed}/${CASES.length}`:`存在失败 · ${passed}/${CASES.length}`;
}
initialize().catch((error)=>{status.textContent=error?.message||"走查台验收没有完成";});
