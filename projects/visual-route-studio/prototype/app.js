const routeCatalog = {
  lock: { name: "原照锁定 + 抽象设计", tag: "证据优先", short: "锁定照片" },
  memory: { name: "记忆重绘", tag: "故事优先", short: "记忆重绘" },
  relation: { name: "关系蒸馏", tag: "结构优先", short: "关系蒸馏" },
  minimal: { name: "极简隐喻", tag: "传播优先", short: "极简隐喻" },
  pixel: { name: "点阵材料化", tag: "材料优先", short: "点阵材料" },
};

const formats = {
  poster: { label: "竖版海报", code: "POSTER / 2:3", next: "补充真实标题层、署名、安全区和多尺寸排版。" },
  feature: { label: "专题头图", code: "FEATURE / 16:9", next: "处理横向信息层级、移动端重排和网页替代文本。" },
  card: { label: "故事卡片", code: "CARD / 4:3", next: "建立正反面或系列编号，并验证缩略阅读顺序。" },
};

const scenarios = {
  family: {
    kicker: "个人叙事 · 高关系保真",
    title: "把一张家庭聚会照片发展成记忆册开篇",
    description: "照片里是母亲和三位成年女儿。人物数量、围桌关系和酒红围巾必须保留，但允许改变笔触、纸张和背景细节。",
    use: "家庭记忆册、纪念页与分享卡片",
    audience: "家庭成员与熟悉故事的人",
    mustKeep: "4 位成年女性、围桌关系、酒红围巾、共同中心",
    canChange: "摄影光影、背景杂物、精确轮廓与纸张材质",
    sourceCaption: "低保真虚构输入：四位成年女性围桌，窗、吊灯和酒红围巾完整入框。",
    productKicker: "Family archive · opening story",
    productTitle: "灯亮以后，我们仍围在一起",
    productDescription: "以关系而不是身份相似度组织的家庭叙事原型。",
    scene: "family",
    routes: [
      {
        id: "memory",
        why: "最终用途是记忆册，故事温度比像素复现更重要；这条路线能保留人物关系和少量记忆锚点。",
        keep: ["四人围桌关系", "酒红围巾与暖灯", "共同中心"],
        loss: ["精确面孔与服装细节", "背景物件", "摄影级光影"],
        risk: "生成式重绘可能遗漏人物或补造细节，不能用作身份档案。",
        effectCaption: "概念示意：四个关系节点、桌面共同中心和围巾色锚被保留，写实细节被压缩。",
        next: "逐人核对数量与关系；并列保留 SOURCE，标出不确定细节。",
      },
      {
        id: "lock",
        why: "如果家庭成员更在意真实面孔，应锁定完整照片，只在照片外完成记忆册设计。",
        keep: ["照片像素", "四位人物", "原始场景与时间证据"],
        loss: ["自由重绘空间", "统一插画质感"],
        risk: "生成模型不能参与照片区；否则“原照锁定”承诺不成立。",
        effectCaption: "概念示意：完整照片证据窗被保留，抽象色场和标题区域位于照片之外。",
        next: "用确定性合成器嵌入原图，并对照片区域执行像素差检查。",
      },
      {
        id: "relation",
        why: "适合作为章节页或关系图，让“围坐、共同中心和四个成员”成为抽象结构。",
        keep: ["四个成员节点", "围桌环形关系", "中心与距离"],
        loss: ["身份和表情", "家庭空间", "具体时代信息"],
        risk: "陌生读者可能无法从抽象图形还原家庭故事。",
        effectCaption: "概念示意：四个节点围绕同一中心，颜色只承担关系与记忆锚点。",
        next: "加入人物姓名或章节文字，但不要把抽象关系图当作纪实照片。",
      },
    ],
  },
  travel: {
    kicker: "编辑内容 · 地点证据优先",
    title: "把雨夜换乘站发展成城市旅行专题",
    description: "旧车站、蓝色列车、两条交叉流线和湿地反光构成地点证据。需要适配网页头图与展览海报。",
    use: "城市旅行专题、展览海报与社交预告",
    audience: "计划旅行、关注城市观察的读者",
    mustKeep: "完整车站证据、蓝色列车、换乘流向、雨夜反光",
    canChange: "抽象面板、色彩浓度、标题与信息布局",
    sourceCaption: "低保真虚构输入：蓝色列车、站台透视、雨夜反光和两条换乘方向完整可见。",
    productKicker: "City notes · interchange 07",
    productTitle: "雨把两条路叠在一起",
    productDescription: "一份关于移动、停顿和城市夜色的旅行专题。",
    scene: "travel",
    routes: [
      {
        id: "lock",
        why: "旅行内容需要让读者确认地点，因此完整照片证据应成为版式的一部分，而不是被重画。",
        keep: ["车站和列车证据", "雨夜空间", "原始取景"],
        loss: ["整画面统一抽象", "自由改变地点结构"],
        risk: "若照片窗经过生成式重绘，就不再是地点证据。",
        effectCaption: "概念示意：上方保留完整地点窗，下方把两条换乘方向转成编辑图形。",
        next: "确定性嵌入原图，真实标题在 HTML/矢量层排版，并测试移动端重排。",
      },
      {
        id: "relation",
        why: "专题需要解释城市流动，关系蒸馏能把站台透视、交叉路径和停顿点转成结构图。",
        keep: ["两条流向", "站台消失轴", "停顿节点与负空间"],
        loss: ["具体地点识别", "列车细节", "摄影氛围"],
        risk: "如果不与 SOURCE 并列，读者可能只看到装饰图形。",
        effectCaption: "概念示意：两条路径、一个停顿结和站台轴线构成纯关系画面。",
        next: "保留映射图例，并在专题中让 SOURCE 与关系图互相引用。",
      },
      {
        id: "pixel",
        why: "点阵能强化雨、金属、玻璃和夜色的材料差异，适合文化海报与专题封面。",
        keep: ["列车主体层级", "雨夜明暗", "蓝、酒红、铜金色板"],
        loss: ["连续色调", "细小标识", "真实反射"],
        risk: "小尺寸可能出现摩尔纹，屏幕效果也不能代表真实网印。",
        effectCaption: "概念示意：细密点阵区分列车、雨幕和轨道反光，不使用 8-bit 大像素。",
        next: "检查 100%、50%、25% 缩略，并为印刷另做网点与纸张测试。",
      },
    ],
  },
  event: {
    kicker: "公共传播 · 文字与锚点优先",
    title: "为社区夜航音乐会建立一套主视觉",
    description: "活动在旧码头举行，核心概念是“沿一束橙光找到声音”。标题、日期和地点必须真实可读。",
    use: "活动海报、社交预告与节目卡",
    audience: "社区居民、年轻观众和合作机构",
    mustKeep: "橙色航灯隐喻、夜航方向、真实标题层与活动信息",
    canChange: "写实码头、人物、天空和设备轮廓",
    sourceCaption: "低保真虚构输入：旧码头、橙色航灯、深蓝水面和舞台方向完整入框。",
    productKicker: "Night signal · community concert",
    productTitle: "沿一束橙光，找到声音",
    productDescription: "夜航音乐会视觉系统；标题与活动信息由真实排版层承担。",
    scene: "event",
    routes: [
      {
        id: "minimal",
        why: "活动传播需要一个远距离可读的锚点，单一橙色航灯能承载主题，留白则为真实文字提供空间。",
        keep: ["橙色航灯", "夜航方向", "大面积文字空间"],
        loss: ["码头写实场景", "观众与设备", "完整叙事"],
        risk: "隐喻如果没有标题支持，可能被误读为交通或安全提示。",
        effectCaption: "概念示意：单一橙色锚点和细路径承担视觉记忆，约九成空间留给信息层。",
        next: "用真实 HTML/矢量文字排版标题、日期、地点和无障碍信息。",
      },
      {
        id: "pixel",
        why: "有限套色和精细网点能形成音乐文化语气，同时区分水面、灯光和码头结构。",
        keep: ["橙色航灯", "水面节奏", "深蓝、橙、纸白色板"],
        loss: ["摄影氛围", "细小人物", "连续光晕"],
        risk: "复杂标题不能由生成图承担，低质量网点也会显得像大像素滤镜。",
        effectCaption: "概念示意：点阵频率区分灯、水和结构，真实文字仍留在图像之外。",
        next: "在多尺寸下检查网点、标题对比度和社交平台压缩。",
      },
      {
        id: "relation",
        why: "如果活动希望更实验，可以把码头、灯和观众流向转成一套可延展的关系图形。",
        keep: ["一条引导轴", "灯光节点", "水面节奏"],
        loss: ["活动类型直觉", "码头识别", "现场氛围"],
        risk: "缺少真实标题时，关系图本身不足以说明这是一场音乐会。",
        effectCaption: "概念示意：航灯节点、入场路径和水面节奏被编码为三个关系层。",
        next: "让关系图只承担辅助系统，主信息仍由真实排版和节目结构完成。",
      },
    ],
  },
};

const state = { scenario: "family", route: "memory", format: "poster" };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function svgData(body, accent = "#d75b36") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#1f201c"/></pattern>
      <pattern id="fineDots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="${accent}"/></pattern>
    </defs>
    <rect width="1200" height="800" fill="#f7f1e5"/>
    <rect x="26" y="26" width="1148" height="748" rx="18" fill="none" stroke="#c9c0b1" stroke-width="3"/>
    ${body}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function sourceBody(scene) {
  if (scene === "family") return `
    <rect x="70" y="70" width="1060" height="660" rx="22" fill="#d8cfbd"/>
    <rect x="100" y="100" width="390" height="290" fill="#9db8b4"/><path d="M295 100v290M100 245h390" stroke="#f7f1e5" stroke-width="18"/>
    <circle cx="820" cy="150" r="54" fill="#e6bc50"/><path d="M820 204v60" stroke="#1f201c" stroke-width="8"/>
    <ellipse cx="650" cy="540" rx="320" ry="120" fill="#7b5a44"/><ellipse cx="650" cy="515" rx="285" ry="86" fill="#d8a76b"/>
    <g fill="#2e5e62" stroke="#1f201c" stroke-width="6"><circle cx="390" cy="390" r="62"/><path d="M320 500q70-130 140 0z"/></g>
    <g fill="#a94c3d" stroke="#1f201c" stroke-width="6"><circle cx="570" cy="330" r="62"/><path d="M500 455q70-130 140 0z"/></g>
    <g fill="#d6aa45" stroke="#1f201c" stroke-width="6"><circle cx="760" cy="340" r="62"/><path d="M690 465q70-130 140 0z"/></g>
    <g fill="#55634d" stroke="#1f201c" stroke-width="6"><circle cx="930" cy="410" r="62"/><path d="M860 520q70-130 140 0z"/></g>
    <path d="M525 355q70 70 130 20" fill="none" stroke="#8e2f2c" stroke-width="22" stroke-linecap="round"/>
    <g fill="#f7f1e5"><circle cx="570" cy="515" r="20"/><circle cx="660" cy="495" r="16"/><circle cx="735" cy="528" r="18"/></g>`;
  if (scene === "travel") return `
    <rect x="70" y="70" width="1060" height="660" rx="22" fill="#172e3b"/>
    <path d="M95 650L550 250h300l280 400" fill="#425d64"/>
    <path d="M90 690L560 310M1110 690L830 310" stroke="#d79943" stroke-width="18" opacity=".8"/>
    <path d="M130 570h720l170-210H300z" fill="#2e6c88" stroke="#b5d0cf" stroke-width="8"/>
    <rect x="320" y="395" width="560" height="78" rx="20" fill="#174e72"/>
    <g fill="#e4c16b"><rect x="365" y="413" width="72" height="32"/><rect x="470" y="413" width="72" height="32"/><rect x="575" y="413" width="72" height="32"/><rect x="680" y="413" width="72" height="32"/></g>
    <path d="M170 210h860M260 135h680" stroke="#86a0a2" stroke-width="12"/>
    <path d="M175 205L95 650M1025 205l105 445" stroke="#86a0a2" stroke-width="12"/>
    <g stroke="#aec6c3" stroke-width="8" opacity=".55"><path d="M180 110l-30 90M300 90l-35 110M900 90l35 110M1030 110l30 90"/></g>
    <ellipse cx="515" cy="680" rx="260" ry="22" fill="#c47744" opacity=".62"/><ellipse cx="850" cy="690" rx="180" ry="16" fill="#58a1a0" opacity=".58"/>`;
  return `
    <rect x="70" y="70" width="1060" height="660" rx="22" fill="#102a43"/>
    <path d="M80 580q280-190 520 0t520 0v150H80z" fill="#183f59"/>
    <rect x="210" y="380" width="760" height="170" fill="#273c47"/><path d="M170 380h840l-140-110H320z" fill="#43535b"/>
    <circle cx="605" cy="250" r="82" fill="#e56a37"/><circle cx="605" cy="250" r="42" fill="#ffb34f"/>
    <path d="M605 330v210" stroke="#e56a37" stroke-width="20"/>
    <path d="M320 550q130-95 260 0M630 550q130-95 260 0" fill="none" stroke="#8db2b0" stroke-width="16"/>
    <g fill="#d8b25c"><circle cx="260" cy="650" r="18"/><circle cx="355" cy="620" r="16"/><circle cx="460" cy="650" r="18"/><circle cx="760" cy="650" r="18"/><circle cx="860" cy="620" r="16"/><circle cx="950" cy="650" r="18"/></g>`;
}

function effectBody(scene, route) {
  const accent = scene === "family" ? "#a94c3d" : scene === "travel" ? "#2e6c88" : "#e56a37";
  if (route === "lock") return `
    <g transform="translate(185 55) scale(.68)">${sourceBody(scene)}</g>
    <rect x="110" y="590" width="980" height="130" rx="16" fill="#fffdf8" stroke="#1f201c" stroke-width="4"/>
    <circle cx="190" cy="655" r="28" fill="${accent}"/><path d="M250 635h450M250 670h310" stroke="#1f201c" stroke-width="14"/>
    <path d="M850 625l90 60 90-60" fill="none" stroke="#285e62" stroke-width="18"/>`;
  if (route === "memory") return `
    <g fill="none" stroke="#5c554c" stroke-width="11" stroke-linecap="round">
      <ellipse cx="600" cy="460" rx="230" ry="80"/><circle cx="405" cy="350" r="45"/><circle cx="545" cy="285" r="45"/><circle cx="690" cy="290" r="45"/><circle cx="830" cy="360" r="45"/>
      <path d="M380 400q35 55 70 0M520 335q30 65 65 0M665 340q30 65 65 0M805 410q30 55 65 0"/>
      <path d="M260 610q230-100 460 0t230-20" opacity=".42"/><path d="M260 170q170 80 340 0t340 20" opacity=".28"/>
    </g>
    <path d="M500 320q70 80 145 20" fill="none" stroke="${accent}" stroke-width="26" stroke-linecap="round"/>
    <circle cx="600" cy="460" r="24" fill="#e6bc50"/>`;
  if (route === "relation") return `
    <g fill="none" stroke="#1f201c" stroke-width="8" opacity=".75"><path d="M170 620L980 190"/><path d="M180 210L1020 620"/><path d="M600 120v570"/></g>
    <g fill="#285e62"><circle cx="330" cy="290" r="42"/><circle cx="500" cy="390" r="34"/><circle cx="690" cy="390" r="34"/><circle cx="860" cy="285" r="42"/></g>
    <circle cx="600" cy="450" r="88" fill="none" stroke="${accent}" stroke-width="28"/>
    <path d="M330 290Q590 80 860 285M330 290Q600 700 860 285" fill="none" stroke="#e6bc50" stroke-width="12" stroke-dasharray="18 18"/>`;
  if (route === "minimal") return `
    <circle cx="760" cy="315" r="72" fill="${accent}"/><circle cx="760" cy="315" r="28" fill="#ffbf55"/>
    <path d="M240 650Q470 520 730 350" fill="none" stroke="#1f201c" stroke-width="12"/>
    <path d="M170 690h520" stroke="#285e62" stroke-width="7" stroke-dasharray="12 18"/>
    <rect x="145" y="120" width="210" height="12" fill="#1f201c"/><rect x="145" y="150" width="130" height="7" fill="#76776f"/>`;
  return `
    <path d="M155 610Q340 210 600 390T1035 210v410H155z" fill="url(#dots)"/>
    <path d="M170 640Q390 420 620 570T1030 330" fill="none" stroke="${accent}" stroke-width="42" stroke-dasharray="8 12"/>
    <rect x="280" y="180" width="520" height="250" rx="34" fill="url(#fineDots)" stroke="#1f201c" stroke-width="9"/>
    <circle cx="860" cy="230" r="78" fill="#e6bc50" opacity=".9"/>
    <path d="M220 690h760" stroke="#285e62" stroke-width="18"/>`;
}

function makeVisual(scene, route = "source") {
  const accent = scene === "family" ? "#a94c3d" : scene === "travel" ? "#2e6c88" : "#e56a37";
  return svgData(route === "source" ? sourceBody(scene) : effectBody(scene, route), accent);
}

function listInto(element, items) {
  element.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));
}

function buildBrief(scenario, route, catalog, format) {
  return [
    "Visual Route Studio · 创意简报",
    "",
    `任务：${scenario.title}`,
    `最终用途：${scenario.use}`,
    `主要受众：${scenario.audience}`,
    `不可改变事实：${scenario.mustKeep}`,
    `允许改变：${scenario.canChange}`,
    "",
    `选定路线：${catalog.name}`,
    `选择原因：${route.why}`,
    `保留：${route.keep.join("；")}`,
    `损失：${route.loss.join("；")}`,
    `主要风险：${route.risk}`,
    "",
    `目标载体：${format.label}`,
    `进入生产：${route.next} ${format.next}`,
    "",
    "边界：本文件来自低保真决策原型，不包含真实生成文件，不证明实体生产或第三方 Skill 运行。",
  ].join("\n");
}

function renderRoutes(scenario) {
  const grid = $("#route-grid");
  grid.replaceChildren(...scenario.routes.map((route, index) => {
    const catalog = routeCatalog[route.id];
    const article = document.createElement("article");
    article.className = "route-card";
    article.setAttribute("aria-current", String(route.id === state.route));
    article.innerHTML = `
      <div class="route-card__index"><span>Route ${String(index + 1).padStart(2, "0")}</span><span class="route-card__tag">${catalog.tag}</span></div>
      <h3>${catalog.name}</h3>
      <p>${route.why}</p>
      <ul><li>保留：${route.keep[0]}</li><li>风险：${route.risk}</li></ul>
      <button type="button" data-route="${route.id}">${route.id === state.route ? "当前选择" : "选择这条路线"}</button>`;
    return article;
  }));

  $$('[data-route]').forEach((button) => button.addEventListener("click", () => {
    state.route = button.dataset.route;
    render();
    document.querySelector(`[data-route="${state.route}"]`)?.focus();
    $("#selection-status").textContent = `已选择：${routeCatalog[state.route].name}`;
  }));
}

function render() {
  const scenario = scenarios[state.scenario];
  const route = scenario.routes.find((item) => item.id === state.route) || scenario.routes[0];
  if (route.id !== state.route) state.route = route.id;
  const catalog = routeCatalog[route.id];
  const format = formats[state.format];

  $("#brief-kicker").textContent = scenario.kicker;
  $("#brief-title").textContent = scenario.title;
  $("#brief-description").textContent = scenario.description;
  $("#brief-use").textContent = scenario.use;
  $("#brief-audience").textContent = scenario.audience;
  $("#brief-must-keep").textContent = scenario.mustKeep;
  $("#brief-can-change").textContent = scenario.canChange;

  $$(".task-tab").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.scenario === state.scenario)));
  renderRoutes(scenario);

  const sourceSrc = makeVisual(scenario.scene, "source");
  const effectSrc = makeVisual(scenario.scene, route.id);
  $("#source-image").src = sourceSrc;
  $("#source-image").alt = `${scenario.title}的完整低保真 SOURCE 示意`;
  $("#source-caption").textContent = scenario.sourceCaption;
  $("#effect-image").src = effectSrc;
  $("#effect-image").alt = `${catalog.name}的完整低保真 EFFECT 示意`;
  $("#effect-name").textContent = catalog.name;
  $("#effect-caption").textContent = route.effectCaption;
  $("#route-why").textContent = route.why;
  listInto($("#route-keep"), route.keep);
  listInto($("#route-loss"), route.loss);
  $("#route-risk").textContent = route.risk;
  $("#selection-status").textContent = `当前路线：${catalog.name}`;

  $$("[data-format]").filter((element) => element.tagName === "BUTTON").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.format === state.format)));
  $("#product-stage").dataset.format = state.format;
  $("#product-image").src = effectSrc;
  $("#product-image").alt = `${catalog.name}效果在${format.label}中的完整数字预演`;
  $("#product-code").textContent = format.code;
  $("#product-kicker").textContent = scenario.productKicker;
  $("#product-title").textContent = scenario.productTitle;
  $("#product-description").textContent = scenario.productDescription;
  $("#handoff-title").textContent = scenario.title;
  $("#handoff-route").textContent = catalog.name;
  $("#handoff-format").textContent = format.label;
  $("#handoff-next").textContent = `${route.next} ${format.next}`;
  $("#download-brief").href = `data:text/plain;charset=utf-8,${encodeURIComponent(`\ufeff${buildBrief(scenario, route, catalog, format)}`)}`;
  $("#download-brief").download = `visual-route-brief-${state.scenario}-${state.route}.txt`;
}

$$(".task-tab").forEach((button) => button.addEventListener("click", () => {
  state.scenario = button.dataset.scenario;
  state.route = scenarios[state.scenario].routes[0].id;
  state.format = "poster";
  render();
  $("#selection-status").textContent = `任务已切换：${scenarios[state.scenario].title}`;
}));

$$('[data-format]').filter((element) => element.tagName === "BUTTON").forEach((button) => button.addEventListener("click", () => {
  state.format = button.dataset.format;
  render();
  $("#selection-status").textContent = `产品载体已切换：${formats[state.format].label}`;
}));

$("#download-brief").addEventListener("click", () => {
  $("#selection-status").textContent = "创意简报已导出";
});

render();
