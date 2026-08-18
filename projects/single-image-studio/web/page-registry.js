export const PAGE_CATEGORIES = Object.freeze({
  PRODUCT: "product",
  REVIEW: "review",
  WALKTHROUGH: "walkthrough",
  AUTOMATED_QA: "automated-qa",
  REFERENCE: "reference",
});

const PAGE_KEYS = new Set(["id", "label", "href", "category", "relation", "audience", "parentId", "taskIds", "description"]);
const CATEGORY_VALUES = new Set(Object.values(PAGE_CATEGORIES));
const AUDIENCES = new Set(["product-user", "reviewer", "facilitator", "developer"]);

const LOCAL_TASKS = Object.freeze(["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-GRID"]);

const DEFINITIONS = [
  { id: "studio", label: "Single Image Studio", href: "./index.html", category: "product", relation: "产品主入口", audience: "product-user", parentId: null, taskIds: [...LOCAL_TASKS, "UT-CUTOUT", "UT-PORTRAIT", "UT-PRODUCT", "CR-RESTORE", "CR1"], description: "上传、选择任务、设置、处理、比较与下载的真实产品页面。" },
  { id: "examples", label: "样例与效果", href: "./examples.html", category: "review", relation: "能力展示", audience: "product-user", parentId: "studio", taskIds: ["UT-TUNE", "UT-RECTIFY", "UT-UPLOAD", "UT-COMPRESS", "UT-OLD-PHOTO", "UT-GRID", "UT-PRIVACY-SHARE"], description: "用登记素材展示原图、真实本地结果、参数、来源和能力限制。" },
  { id: "quality-hub", label: "内部质量入口", href: "./quality-hub.html", category: "review", relation: "内部页面目录", audience: "reviewer", parentId: "studio", taskIds: [], description: "区分自动回归、人工复核、真人走查和视觉参考，并提供所有内部页面入口。" },
  { id: "error-reference", label: "错误与恢复参考", href: "./error-reference.html", category: "review", relation: "跨任务错误体验", audience: "reviewer", parentId: "quality-hub", taskIds: [], description: "展示七类 strict 错误事实、恢复动作和技术信息折叠。" },
  { id: "walkthrough", label: "内部体验走查", href: "./internal-walkthrough.html", category: "walkthrough", relation: "真人方法演练", audience: "facilitator", parentId: "quality-hub", taskIds: ["UT-TUNE", "UT-PRIVACY-SHARE"], description: "主持两项中性任务并导出单场匿名 JSON。" },
  { id: "walkthrough-summary", label: "走查记录汇总", href: "./internal-walkthrough-summary.html", category: "walkthrough", relation: "去标识化汇总", audience: "facilitator", parentId: "walkthrough", taskIds: ["UT-TUNE", "UT-PRIVACY-SHARE"], description: "在浏览器本地汇总匿名记录，按 build 分组且不传播场次编号与自由文本。" },
  { id: "product-acceptance", label: "主流程浏览器验收", href: "./product-acceptance.html", category: "automated-qa", relation: "产品旅程自动回归", audience: "developer", parentId: "quality-hub", taskIds: ["UT-TUNE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-PRIVACY-SHARE"], description: "在真实同源产品页面运行六条项目合成图旅程。" },
  { id: "examples-acceptance", label: "样例页自动验收", href: "./examples-acceptance.html", category: "automated-qa", relation: "样例页面自动回归", audience: "developer", parentId: "examples", taskIds: ["UT-TUNE", "UT-RECTIFY", "UT-UPLOAD", "UT-COMPRESS", "UT-OLD-PHOTO", "UT-GRID", "UT-PRIVACY-SHARE"], description: "检查样例数量、来源筛选、图片完整显示和响应式布局。" },
  { id: "error-acceptance", label: "错误页自动验收", href: "./error-acceptance.html", category: "automated-qa", relation: "错误页面自动回归", audience: "developer", parentId: "error-reference", taskIds: [], description: "检查七类错误状态、恢复动作和桌面 / 窄屏无溢出。" },
  { id: "walkthrough-acceptance", label: "走查工具自动验收", href: "./internal-walkthrough-acceptance.html", category: "automated-qa", relation: "走查工具自动回归", audience: "developer", parentId: "walkthrough", taskIds: ["UT-TUNE", "UT-PRIVACY-SHARE"], description: "检查质量入口、单场记录、匿名汇总和响应式布局；不是真人结果。" },
  { id: "browser-diagnostics", label: "浏览器输出诊断", href: "./browser-diagnostics.html", category: "automated-qa", relation: "本地渲染与输出诊断", audience: "developer", parentId: "quality-hub", taskIds: [...LOCAL_TASKS, "UT-PORTRAIT", "UT-PRODUCT"], description: "用内存合成像素检查 Canvas、编码重开、metadata、蒙版、套装与 ZIP。" },
  { id: "straighten-reference", label: "几何校正真实渲染演示", href: "./straighten-reference.html", category: "reference", relation: "几何能力参考", audience: "reviewer", parentId: "examples", taskIds: ["UT-TUNE", "UT-RECTIFY"], description: "用项目原创图展示拉直、旋转、固定比例和垂直透视的真实裁边。" },
  { id: "old-photo-reference", label: "老照片生成式修复参考", href: "./old-photo-reference.html", category: "reference", relation: "生成式边界参考", audience: "reviewer", parentId: "examples", taskIds: ["UT-OLD-PHOTO", "CR-RESTORE"], description: "比较本地整理能力与 Codex 静态生成式参考，明确不是产品 API 结果。" },
];

function validatePage(page) {
  const keys = Object.keys(page);
  if (keys.length !== PAGE_KEYS.size || keys.some((key) => !PAGE_KEYS.has(key))) throw new TypeError(`页面 ${page?.id ?? "unknown"} 字段不闭合`);
  if (typeof page.id !== "string" || !/^[a-z][a-z0-9-]{1,40}$/.test(page.id)) throw new TypeError("页面 id 无效");
  if (typeof page.label !== "string" || !page.label.trim() || page.label.length > 40) throw new TypeError(`${page.id}.label 无效`);
  if (typeof page.href !== "string" || !/^\.\/[a-z0-9-]+\.html$/.test(page.href)) throw new TypeError(`${page.id}.href 无效`);
  if (!CATEGORY_VALUES.has(page.category) || !AUDIENCES.has(page.audience)) throw new TypeError(`${page.id} 分类无效`);
  if (typeof page.relation !== "string" || !page.relation.trim() || typeof page.description !== "string" || !page.description.trim()) throw new TypeError(`${page.id} 关系说明无效`);
  if (page.parentId !== null && (typeof page.parentId !== "string" || page.parentId === page.id)) throw new TypeError(`${page.id}.parentId 无效`);
  if (!Array.isArray(page.taskIds) || new Set(page.taskIds).size !== page.taskIds.length || page.taskIds.some((id) => !/^(?:UT|CR)(?:-[A-Z0-9]+)*\d?$/.test(id))) throw new TypeError(`${page.id}.taskIds 无效`);
  return Object.freeze({ ...page, taskIds: Object.freeze([...page.taskIds]) });
}

export const PAGE_REGISTRY = Object.freeze(DEFINITIONS.map(validatePage));

const ids = new Set();
const hrefs = new Set();
for (const page of PAGE_REGISTRY) {
  if (ids.has(page.id) || hrefs.has(page.href)) throw new TypeError(`页面身份重复：${page.id}`);
  ids.add(page.id); hrefs.add(page.href);
}
for (const page of PAGE_REGISTRY) if (page.parentId !== null && !ids.has(page.parentId)) throw new TypeError(`${page.id} 指向不存在的父页面`);

export function getRegisteredPage(id) { return PAGE_REGISTRY.find((page) => page.id === id) ?? null; }
export function getPagesByCategory(category) { if (!CATEGORY_VALUES.has(category)) throw new TypeError("未知页面分类"); return PAGE_REGISTRY.filter((page) => page.category === category); }
export function getPagesForTask(taskId) { if (typeof taskId !== "string" || !taskId) throw new TypeError("taskId 无效"); return PAGE_REGISTRY.filter((page) => page.taskIds.includes(taskId)); }
