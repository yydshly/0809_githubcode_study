const CASES = Object.freeze([
  Object.freeze({ id: "errors-desktop", label: "桌面 1180 px", width: 1180 }),
  Object.freeze({ id: "errors-narrow", label: "窄屏 390 px", width: 390 }),
]);
const runId = new URLSearchParams(location.search).get("reportRunId") ?? crypto.randomUUID();
const status = document.querySelector("#error-acceptance-status");
const results = document.querySelector("#error-acceptance-results");
function assert(condition, message) { if (!condition) throw new Error(message); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function runCase(testCase) {
  const frame = document.createElement("iframe");
  frame.className = "qa-frame"; frame.width = String(testCase.width); frame.height = "1200"; frame.src = `./error-reference.html?acceptance=${testCase.id}`;
  document.body.append(frame);
  try {
    await new Promise((resolve, reject) => { frame.addEventListener("load", resolve, { once: true }); frame.addEventListener("error", reject, { once: true }); });
    for (let index = 0; index < 100 && frame.contentDocument?.documentElement.dataset.errorReferenceReady !== "true"; index += 1) await wait(25);
    const document = frame.contentDocument;
    const cards = [...document.querySelectorAll("[data-error-scenario]")];
    assert(cards.length === 7, `错误卡片应为 7，实际 ${cards.length}`);
    assert(cards.every((card) => card.querySelectorAll(".error-facts strong").length === 4), "错误事实不完整");
    assert(cards.every((card) => card.querySelector(".error-technical").open === false), "技术信息未默认折叠");
    const failed = document.querySelector('[data-error-scenario="remote-failed"]');
    assert(!failed.querySelector(".inline-actions button:nth-child(2)").hidden, "远程明确失败未提供本地兜底");
    const unknown = document.querySelector('[data-error-scenario="remote-unknown"]');
    assert(!unknown.querySelector(".inline-actions button:first-child").hidden, "远程未知未提供原任务查询");
    const output = document.querySelector('[data-error-scenario="output"]');
    assert(output.querySelector(".inline-actions button:nth-child(3)").textContent === "返回设置", "本地输出失败没有返回设置");
    const network = document.querySelector('[data-error-scenario="network"]');
    assert(network.textContent.includes("本地编辑能力不受影响"), "网络错误没有保留本地能力说明");
    assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, "错误参考页横向溢出");
    return `${testCase.width} px · 7 contexts · facts, disclosure, recovery and overflow pass`;
  } finally { frame.remove(); }
}
function row(testCase, passed, evidence) { const tr=document.createElement("tr"); tr.dataset.state=passed?"pass":"fail"; for(const value of [testCase.label,passed?"通过":"失败",evidence]){const td=document.createElement("td");td.textContent=value;tr.append(td);} results.append(tr); }
async function initialize() {
  const startedAt = new Date().toISOString(); const cases=[]; let passed=0;
  for (const testCase of CASES) { try { const evidence=await runCase(testCase); row(testCase,true,evidence); cases.push({id:testCase.id,passed:true,evidence}); passed+=1; } catch(error) { const evidence=error?.message||"未知错误"; row(testCase,false,evidence); cases.push({id:testCase.id,passed:false,evidence}); } }
  const response=await fetch("/api/internal/error-acceptance/latest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({version:"error-acceptance-report-v1",runId,startedAt,completedAt:new Date().toISOString(),browser:{userAgent:navigator.userAgent,language:navigator.language},cases})});
  if(!response.ok) throw new Error(`错误验收报告提交失败：HTTP ${response.status}`); status.textContent=passed===CASES.length?`全部通过 · ${passed}/${CASES.length}`:`存在失败 · ${passed}/${CASES.length}`;
}
initialize().catch((error)=>{status.textContent=error?.message||"错误验收没有完成";});
