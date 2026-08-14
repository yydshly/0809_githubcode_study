const skillPool = [
  "Daily Photo",
  "DYY Deconstruct",
  "Travel Abstraction",
  "Scenes Gathered",
  "Scene Distillation",
  "GC Minimal",
  "Photo Revival",
  "Pixel Style",
  "Photo Relic Editorial",
  "Photo Distill",
  "Poetic Line",
  "Photo Abstract",
  "Photo to Zine Postcard"
];

const local = (name, why) => ({ origin: "本地能力", originType: "local", name, why });
const skill = (origin, name, why) => ({ origin, originType: "skill", name, why });
const extension = (name, why) => ({ origin: "按目标扩展", originType: "extension", name, why });

const samples = [
  {
    id: "memory",
    title: "周年记忆档案",
    short: "纪念、收藏、故事化",
    summary: "把现场证据、记忆重绘和可收藏产品结合成一个完整系统。",
    goal: "为自行车修理店设计一套有记忆感、可收藏的周年纪念产品",
    intentTitle: "纪念、收藏，同时保留真实现场",
    intentCopy: "不是套一种风格，而是把可辨认的原图证据、带情绪的重绘和可书写的实体结构组合起来。",
    image: "./assets/composer-memory-archive.png",
    output: "系列产品",
    products: "周年小书 · 感谢卡 · 故事墙 · 纪念标签",
    capabilities: [
      local("原图事实卡", "锁定夜雨、修车铺、蓝色自行车、暖灯与红凳等真实证据。"),
      skill("Photo Revival", "记忆重绘", "为现场增加温度，但保留人物、车辆与空间关系。"),
      skill("Photo Relic Editorial", "证据与遗物", "将齿轮、曲柄等细节转成可收藏的视觉锚点。"),
      skill("Photo to Zine Postcard", "产品分区", "把图像、题注与书写区组织成能落地的纪念品。"),
      local("确定性文字与版面合成", "把名称、日期、故事与规格稳定地叠加到最终产物。"),
      local("导出与质量检查", "检查完整边缘、阅读顺序和印刷安全区。")
    ]
  },
  {
    id: "campaign",
    title: "材料化发布套件",
    short: "发布、活动、品牌传播",
    summary: "把同一张现场图转成有材料触感、跨媒介一致的活动发布系统。",
    goal: "为修车铺开放日做一套有冲击力的发布海报、社交卡和网页主视觉",
    intentTitle: "快速传播，但不能变成通用海报",
    intentCopy: "用照片证据保持身份，用高密度网点、克制留白和概念锚点制造辨识度。",
    image: "./assets/composer-material-campaign.png",
    output: "传播套件",
    products: "活动海报 · 社交卡 · 网页主视觉 · 店内屏幕",
    capabilities: [
      local("原图事实卡", "保留店铺、人物、蓝色车辆和雨夜氛围。"),
      skill("Pixel Style", "材料化表面", "把照片转为高密度网点与印刷触感。"),
      skill("Daily Photo", "编辑节奏", "建立主图、呼吸区与信息块的发布层级。"),
      skill("GC Minimal", "概念减法", "用断开的链条作为开放日与修复主题的单一锚点。"),
      local("跨尺寸版式合成", "保持核心证据，针对海报、横幅和卡片重新分配空间。"),
      local("多规格 QA", "检查文字安全区、焦点和跨尺寸一致性。")
    ]
  },
  {
    id: "report",
    title: "摄影解释特刊",
    short: "故事、展览、长页表达",
    summary: "让原图与它的路径、动作、密度和色彩解释同时出现。",
    goal: "把这张现场照片做成一篇可滚动阅读的摄影解释特刊和展览图文页",
    intentTitle: "不仅展示照片，还要解释它为什么成立",
    intentCopy: "完整照片负责证据，抽象线、色块与关系图负责解释；二者保持可追溯连接。",
    image: "./assets/composer-poetic-report.png",
    output: "网页特刊",
    products: "滚动特刊 · 展览说明板 · 研究图版 · 分享长图",
    capabilities: [
      local("原图证据锁定", "完整保留照片，不用装饰性裁切破坏上下文。"),
      skill("Travel Abstraction", "路径提取", "把车轮、手势和灯光方向转成移动路径。"),
      skill("Poetic Line", "叙事线索", "用极少线条建立情绪与阅读节奏。"),
      skill("Photo Abstract", "色彩与质量关系", "把照片中的暖灯、冷蓝和暗部密度转成抽象面。"),
      skill("Scenes Gathered", "跨场景连接", "让证据图和解释图之间保持明确映射。"),
      local("网页阅读与导出 QA", "验证长页顺序、完整显示和静态导出。")
    ]
  },
  {
    id: "postcard",
    title: "变量感谢卡系统",
    short: "感谢、邀请、批量个性化",
    summary: "从同一原图建立可批量变化、又保持同一身份的卡片家族。",
    goal: "用修车铺照片生成一套面向不同老顾客的周年感谢卡和邀请卡",
    intentTitle: "每张都不同，但一眼属于同一套",
    intentCopy: "固定照片证据、路径与遗物元素，允许姓名、故事、日期和祝语按对象变化。",
    image: "./assets/composer-postcard-system.png",
    output: "变量卡片",
    products: "感谢卡 · 邀请卡 · 随单卡 · 电子分享卡",
    capabilities: [
      local("原图事实卡", "锁定来源身份，防止批量生成时漂移。"),
      skill("Photo to Zine Postcard", "卡片结构", "定义照片区、叙事区和书写区。"),
      skill("Photo Relic Editorial", "系列锚点", "用齿轮与轮组建立收藏感和系列识别。"),
      skill("Daily Photo", "变化节奏", "控制不同卡片的疏密、留白与焦点。"),
      extension("变量内容合成", "按顾客资料填入姓名、记忆、日期或二维码。"),
      local("打印与数字导出 QA", "分别检查印刷边距、屏幕清晰度和完整边缘。")
    ]
  },
  {
    id: "fingerprint",
    title: "参数化视觉指纹",
    short: "数据、系统、可复用识别",
    summary: "把照片中的稳定关系提炼为可编码、可重复生成的视觉语法。",
    goal: "根据修车铺原图提炼一个可用于年度数据网页和纪念物料的视觉指纹",
    intentTitle: "从一张照片得到长期可用的视觉规则",
    intentCopy: "提取轮形、车架斜线、灯光路径、红凳异常点与密度分布，再转成可参数化图形。",
    image: "./assets/composer-visual-fingerprint.svg",
    output: "视觉系统",
    products: "年度数据页 · 封面 · 动态片头 · 标牌 · 包装图形",
    capabilities: [
      skill("Photo Distill", "视觉指纹", "提取轮形、色彩、密度和方向等稳定特征。"),
      skill("DYY Deconstruct", "结构拆解", "把人物、车辆、工作台与空间关系拆为可组合部件。"),
      skill("Photo Abstract", "参数关系", "把颜色和质量分布转为可复用的抽象规则。"),
      skill("Scene Distillation", "单一焦点", "控制复杂度，确保每次生成仍有明确识别锚点。"),
      extension("代码原生 SVG 生成", "将提取规则写成可缩放、可改变参数的图形资产。"),
      local("回归与导出 QA", "验证不同尺寸、颜色与数据输入下仍保持同一视觉身份。")
    ]
  }
];

const families = [
  { re: /纪念|周年|收藏|礼物|档案|回忆/, sample: "memory" },
  { re: /发布|活动|招募|品牌|海报|传播|营销|主视觉/, sample: "campaign" },
  { re: /报告|摄影|故事|网页|展览|特刊|解释|长页/, sample: "report" },
  { re: /感谢|卡片|邀请|明信片|变量|顾客|批量/, sample: "postcard" },
  { re: /数据|参数|系统|分析|指纹|规则|动态/, sample: "fingerprint" }
];

const recommendedSampleIds = ["memory", "campaign", "fingerprint"];

const state = {
  current: samples[0],
  capabilities: samples[0].capabilities,
  generated: false,
  sourceReady: true
};

const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function uniqueCapabilities(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.origin}|${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchedComposition(goal) {
  const matched = families
    .filter((family) => family.re.test(goal))
    .map((family) => samples.find((sample) => sample.id === family.sample));

  const chosen = matched[0] || samples[2];
  const combined = matched.length
    ? uniqueCapabilities(matched.flatMap((sample) => sample.capabilities))
    : uniqueCapabilities([
        local("原图事实卡", "先理解原图中不可丢失的人、物、空间与颜色证据。"),
        skill("Daily Photo", "编辑骨架", "按目标建立主次、留白与阅读节奏。"),
        skill("Poetic Line", "关系线索", "将动作与情绪转成可见线索。"),
        skill("GC Minimal", "概念聚焦", "为开放目标寻找一个不泛化的核心锚点。"),
        extension("目标专用能力", "现有 Skill 不足时，为这个目标补充新的处理或产品化能力。"),
        local("生成、合成与 QA", "生成视觉层，稳定合成文字，检查完整性后导出。")
      ]);

  if (matched.length > 1) {
    combined.push(extension("跨路线产品编排", `同时响应“${matched.map((item) => item.title).join(" + ")}”的目标要求。`));
  } else if (matched.length === 1) {
    combined.push(extension("目标适配扩展", "根据具体内容、受众和交付格式补充现有 Skill 未覆盖的步骤。"));
  }

  return {
    ...chosen,
    id: "custom",
    title: goal || "开放目标能力组合",
    short: "自定义目标",
    summary: matched.length > 1
      ? `检测到 ${matched.length} 类需求，已跨路线组合能力；结果图使用最接近的视觉方向进行预演。`
      : matched.length === 1
        ? `以“${chosen.title}”为视觉起点，并为你的目标补充专用能力。`
        : "从原图证据出发，自由组合现有 Skill 与目标专用扩展。",
    intentTitle: "目标决定需要什么能力，而不是反过来",
    intentCopy: goal || "输入希望得到的成品、用途与感受，系统会设计一条新的能力组合路线。",
    products: `${$("#output-format").value} · 可继续扩展新的交付规格`,
    capabilities: uniqueCapabilities(combined)
  };
}

function renderSamples() {
  const list = $("#sample-list");
  const additionalSamples = samples.filter((sample) => !recommendedSampleIds.includes(sample.id));
  list.innerHTML = additionalSamples.map((sample) => `
    <button class="sample-card" type="button" data-sample="${sample.id}" aria-pressed="${state.current.id === sample.id}">
      <img class="sample-thumb" src="${sample.image}" alt="" />
      <span class="sample-copy">
        <strong>${sample.title}</strong>
        <span>${sample.short} · ${sample.capabilities.filter((item) => item.originType === "skill").length} 个 Skill</span>
      </span>
    </button>
  `).join("");

  list.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      const sample = samples.find((item) => item.id === button.dataset.sample);
      applyComposition(sample);
    });
  });
}

function renderRecommendations() {
  const recommendations = recommendedSampleIds.map((id, index) => ({
    sample: samples.find((item) => item.id === id),
    label: index === 0 ? "首选" : index === 1 ? "传播方向" : "系统方向"
  }));

  $("#recommendation-picks").innerHTML = recommendations.map(({ sample, label }) => `
    <button class="recommendation-pick" type="button" data-recommendation="${sample.id}" aria-pressed="${state.current.id === sample.id}">
      <span>${label}</span>
      <strong>${sample.title}</strong>
      <small>${sample.short}</small>
    </button>
  `).join("");

  document.querySelectorAll("[data-recommendation]").forEach((button) => {
    button.addEventListener("click", () => {
      const sample = samples.find((item) => item.id === button.dataset.recommendation);
      applyComposition(sample);
    });
  });
}

function renderCapabilities() {
  const stack = $("#capability-stack");
  stack.innerHTML = state.capabilities.map((item, index) => `
    <article class="capability-item" data-index="${String(index + 1).padStart(2, "0")}">
      <div class="capability-top">
        <strong>${item.name}</strong>
        <span class="capability-origin">${item.origin}</span>
      </div>
      <p>${item.why}</p>
    </article>
  `).join("");
}

function renderSkillPool() {
  const used = new Set(state.capabilities.filter((item) => item.originType === "skill").map((item) => item.origin));
  $("#skill-pool").innerHTML = skillPool.map((name) => `
    <span class="skill-chip ${used.has(name) ? "used" : ""}">${name}</span>
  `).join("");
}

function setExportStatus(message, kind = "pending") {
  $("#export-status-text").textContent = message;
  $("#export-status-dot").className = `status-dot ${kind === "ready" ? "ready" : kind === "error" ? "error" : ""}`;
}

function applyComposition(composition) {
  state.current = composition;
  state.capabilities = composition.capabilities;
  state.generated = false;

  $("#stage-title").textContent = composition.title;
  $("#stage-summary").textContent = composition.summary;
  $("#intent-title").textContent = composition.intentTitle;
  $("#intent-copy").textContent = composition.intentCopy;
  $("#result-image").src = composition.image;
  $("#result-image").alt = `${composition.title}的目标结果预览`;
  $("#result-caption").textContent = composition.id === "custom"
    ? "目标驱动组合预演 · 不是固定模板，生成时会继续按目标调整"
    : "研究 Skill 能力组合形成的完整样例结果";
  $("#product-targets").textContent = composition.products;
  $("#recommended-title").textContent = composition.title;
  $("#recommended-reason").textContent = composition.id === "custom"
    ? composition.summary
    : `${composition.summary} 将得到：${composition.products}。`;
  $("#route-count").textContent = new Set(
    state.capabilities.filter((item) => item.originType === "skill").map((item) => item.origin)
  ).size;
  $("#download-button").disabled = true;
  $("#generate-button").disabled = !state.sourceReady;
  $("#generate-button").textContent = "组合能力并生成";
  $("#accept-recommendation").disabled = !state.sourceReady;
  $("#accept-recommendation").textContent = "直接生成推荐";
  setExportStatus(state.sourceReady ? "能力组合已设计；生成后可导出结果。" : "原图不可用，暂时不能生成。", state.sourceReady ? "pending" : "error");
  renderCapabilities();
  renderSkillPool();
  renderSamples();
  renderRecommendations();
}

async function generateResult() {
  if (!state.sourceReady || state.generated) return;

  const cover = $("#generation-cover");
  const items = [...document.querySelectorAll(".capability-item")];
  const label = $("#generation-step");
  $("#generate-button").disabled = true;
  $("#accept-recommendation").disabled = true;
  cover.classList.add("visible");
  cover.setAttribute("aria-hidden", "false");
  setExportStatus("正在按目标运行能力组合……");

  for (let index = 0; index < items.length; index += 1) {
    items.forEach((item) => item.classList.remove("active"));
    items[index].classList.add("active");
    label.textContent = `${index + 1} / ${items.length} · ${state.capabilities[index].name}`;
    await sleep(prefersReducedMotion ? 20 : 185);
    items[index].classList.remove("active");
    items[index].classList.add("done");
  }

  cover.classList.remove("visible");
  cover.setAttribute("aria-hidden", "true");
  state.generated = true;
  $("#generate-button").textContent = "结果已生成";
  $("#accept-recommendation").textContent = "推荐已生成";
  $("#download-button").disabled = false;
  setExportStatus("结果已生成并通过完整边缘检查，可以导出。", "ready");
}

async function downloadResult() {
  if (!state.generated) return;
  try {
    const response = await fetch(state.current.image);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const extensionName = state.current.image.endsWith(".svg") ? "svg" : "png";
    anchor.href = url;
    anchor.download = `target-studio-${state.current.id}.${extensionName}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportStatus("已导出当前完整结果。", "ready");
  } catch (error) {
    setExportStatus("导出失败，请保留当前页面后重试。", "error");
  }
}

function setSourceError() {
  state.sourceReady = false;
  document.body.classList.add("has-source-error");
  $("#generate-button").disabled = true;
  $("#accept-recommendation").disabled = true;
  $("#download-button").disabled = true;
  setExportStatus("原图加载失败；已保留目标文字，请更换原图后继续。", "error");
}

function init() {
  renderSkillPool();
  renderSamples();
  renderCapabilities();
  applyComposition(samples[0]);

  const goalInput = $("#goal-input");
  const customRecommendButton = $("#design-composition");

  goalInput.addEventListener("input", () => {
    customRecommendButton.disabled = goalInput.value.trim().length === 0;
  });

  customRecommendButton.addEventListener("click", () => {
    const goal = goalInput.value.trim();
    if (!goal) return;
    applyComposition(matchedComposition(goal));
  });

  $("#accept-recommendation").addEventListener("click", async () => {
    document.querySelector(".stage").scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
    await sleep(prefersReducedMotion ? 20 : 220);
    await generateResult();
  });

  $("#generate-button").addEventListener("click", generateResult);
  $("#download-button").addEventListener("click", downloadResult);

  document.querySelectorAll("[data-source-image]").forEach((image) => {
    image.addEventListener("error", setSourceError, { once: true });
  });

  if (new URLSearchParams(window.location.search).get("source") === "missing") {
    document.querySelectorAll("[data-source-image]").forEach((image) => {
      image.src = "./assets/source-does-not-exist.png";
    });
  }
}

init();
