import { PAGE_CATEGORIES, PAGE_REGISTRY } from "./page-registry.js";
import { AI_SERVICE_STATUS, getTaskCatalog } from "./task-catalog.js";

const reportDefinitions = Object.freeze([
  Object.freeze({ id: "product", endpoint: "/api/internal/product-acceptance/latest", label: "产品自动回归" }),
  Object.freeze({ id: "examples", endpoint: "/api/internal/examples-acceptance/latest", label: "样例页自动 QA" }),
  Object.freeze({ id: "errors", endpoint: "/api/internal/error-acceptance/latest", label: "错误页自动 QA" }),
  Object.freeze({ id: "walkthrough", endpoint: "/api/internal/walkthrough-acceptance/latest", label: "走查工具自动 QA" }),
]);
const categoryLabels = Object.freeze({
  [PAGE_CATEGORIES.PRODUCT]: "产品页面",
  [PAGE_CATEGORIES.REVIEW]: "人工复核与目录",
  [PAGE_CATEGORIES.WALKTHROUGH]: "真人走查",
  [PAGE_CATEGORIES.AUTOMATED_QA]: "自动 QA",
  [PAGE_CATEGORIES.REFERENCE]: "视觉参考",
});
const taskLabels = new Map(getTaskCatalog({ aiStatus: AI_SERVICE_STATUS.UNAVAILABLE, backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE }).map((task) => [task.id, task.label]));

function renderPageDirectory() {
  const target = document.querySelector("#page-directory-groups");
  target.innerHTML = Object.values(PAGE_CATEGORIES).map((category) => {
    const pages = PAGE_REGISTRY.filter((page) => page.category === category);
    const entries = pages.map((page) => {
      const capabilities = page.taskIds.length ? page.taskIds.map((id) => `<span title="${id}">${taskLabels.get(id) ?? id}</span>`).join("") : "<span>跨任务</span>";
      return `<article class="page-directory-entry" data-page-directory-entry="${page.id}"><div><span>${page.relation}</span><a href="${page.href}">${page.label}</a></div><p>${page.description}</p><div class="page-capabilities" aria-label="关联能力">${capabilities}</div></article>`;
    }).join("");
    return `<section class="page-directory-group" data-page-category="${category}"><h3>${categoryLabels[category]} <span>${pages.length}</span></h3><div>${entries}</div></section>`;
  }).join("");
}
function renderStatus(definition, report) {
  const target = document.querySelector(`[data-quality-status="${definition.id}"]`);
  if (!report) { target.dataset.tone = "empty"; target.textContent = `${definition.label}：本服务会话尚未运行`; return; }
  const passed = report.cases.filter((entry) => entry.passed).length;
  target.dataset.tone = passed === report.cases.length ? "pass" : "empty";
  target.textContent = `${definition.label}：${passed}/${report.cases.length} · ${report.runId.slice(0, 8)}…`;
}
async function loadReport(definition) {
  try { const response = await fetch(definition.endpoint, { headers: { accept: "application/json" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); renderStatus(definition, payload.report ?? null); }
  catch { const target = document.querySelector(`[data-quality-status="${definition.id}"]`); target.dataset.tone = "empty"; target.textContent = `${definition.label}：当前无法读取；对应页面仍可单独打开`; }
}
await Promise.all(reportDefinitions.map(loadReport));
renderPageDirectory();
document.documentElement.dataset.qualityHubReady = "true";
