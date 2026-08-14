const palette = {
  ink: "#07121a",
  inkSoft: "#10222d",
  paper: "#ece2cb",
  paperDeep: "#d9cdb4",
  amber: "#cf8b2a",
  teal: "#2d9297",
  mustard: "#a97721",
  muted: "#7f8d8d",
  rust: "#9f5945",
};

const visualRoutes = {
  scene: {
    name: "实景编辑重构",
    resultType: "保真重构",
    short: "保留真实场景与主体，把光色、空间层级和叙事焦点重新组织成编辑画面。",
    skills: ["Daily Photo Playground", "Scenes Gathered", "Travel Photo Abstraction"],
    traits: ["真实场景", "光色重组", "编辑焦点"],
    accent: "#67a7a1",
    surface: "#17232a",
    preserve: "人物、物件、地点与事件事实",
    change: "光色关系、空间层级与观看焦点",
  },
  deconstruct: {
    name: "结构拆解重组",
    resultType: "结构再造",
    short: "把主体、方向、群组、密度和动线拆成视觉零件，再重组成解释性画面。",
    skills: ["DYY Photo Deconstruct", "Photo Abstract Editorial", "Travel Photo Abstraction"],
    traits: ["主体拆解", "关系标记", "动线重组"],
    accent: "#dc7759",
    surface: "#0b171e",
    preserve: "关键主体、动作方向与数量关系",
    change: "轮廓、群组、路径和画面结构",
  },
  reconstruct: {
    name: "场景想象重构",
    resultType: "生成重构",
    short: "保留事实锚点，重新生成环境、景深和视觉隐喻，让原图变成新的完整场景。",
    skills: ["Scene Distillation", "GC Minimal Poster", "Photo Revival"],
    traits: ["场景重建", "视觉隐喻", "景深生成"],
    accent: "#e9c85f",
    surface: "#101820",
    preserve: "核心主体、动作与可核对事实",
    change: "环境、景深、气氛与隐喻场景",
  },
  revival: {
    name: "记忆重绘重生",
    resultType: "生成重绘",
    short: "保留人物姿态与关键物件，把照片重绘成手绘记忆、时间回声与材料化场景。",
    skills: ["Photo Revival", "Photo Relic Editorial", "Scenes Gathered"],
    traits: ["手绘重生", "时间回声", "照片遗迹"],
    accent: "#315e8e",
    surface: "#eadfc8",
    preserve: "人物姿态、关键物件与情境线索",
    change: "绘画媒介、环境细节与时间层次",
  },
  merge: {
    name: "多图场景融合",
    resultType: "多图生成",
    short: "从多张图片抽取人物、物件和环境证据，融合为一个连续但可追溯的新场景。",
    skills: ["Scenes Gathered", "Daily Photo Playground", "Poetic Line Poster"],
    traits: ["多图取证", "连续场景", "统一光线"],
    accent: "#65d5da",
    surface: "#07121a",
    preserve: "每张图片的主体证据与来源关系",
    change: "场景边界、时间拼接与统一光线",
  },
  sequence: {
    name: "叙事续帧展开",
    resultType: "叙事生成",
    short: "依据已有动作和顺序生成开场、过渡与收束画面，不把一张照片重复套版。",
    skills: ["Scenes Gathered", "Scene Distillation", "Poetic Line Poster"],
    traits: ["动作续帧", "章节过渡", "节奏生成"],
    accent: "#71b5ab",
    surface: "#08151b",
    preserve: "已确认的动作、人物和图片顺序",
    change: "过渡画面、章节节奏与收束方式",
  },
  memory: {
    name: "记忆遗物编辑",
    short: "保留真实照片，同时加入手绘回声、旧纸质感与可收藏的物件锚点。",
    skills: ["Photo Revival", "Photo Relic Editorial", "Photo to Zine Postcard"],
    traits: ["真实照片保留", "手绘回声", "旧纸收藏感"],
    accent: "#315e8e",
    surface: "#eadfc8",
    preserve: "主体事实与关键照片",
    change: "旧纸、手绘回声与收藏锚点",
    resultType: "混合编辑",
  },
  material: {
    name: "材料化发布",
    short: "从原图提取色块与核心物件，用网点、套色和单一隐喻形成有冲击力的发布视觉。",
    skills: ["Pixel Style", "GC Minimal", "Daily Photo"],
    traits: ["高对比套色", "网点材料感", "强主视觉"],
    accent: "#e28a2f",
    surface: "#101820",
    preserve: "主体轮廓与来源色",
    change: "色块、网点与套色材料",
    resultType: "媒介转译",
  },
  poetic: {
    name: "诗性关系图",
    short: "把动作、方向和空间关系转成线条、路径与克制留白，让图片获得解释性。",
    skills: ["Poetic Line", "Travel Abstraction", "Photo Abstract"],
    traits: ["关系线条", "路径节奏", "克制留白"],
    accent: "#65d5da",
    surface: "#07121a",
    preserve: "动作方向与空间关系",
    change: "线条、路径与克制留白",
    resultType: "关系抽象",
  },
  postcard: {
    name: "编辑收藏卡",
    short: "用稳定的卡片分区、系列节奏和可书写区域，把图片变成真正可成套使用的产品。",
    skills: ["Photo to Zine Postcard", "Daily Photo", "Photo Relic Editorial"],
    traits: ["系列一致性", "卡片分区", "可收藏使用"],
    accent: "#b57a25",
    surface: "#ece2cb",
    preserve: "每张照片的独立职责",
    change: "系列边框、分区与编号",
    resultType: "系列编辑",
  },
  fingerprint: {
    name: "视觉指纹系统",
    short: "从主体、方向、密度和来源色提炼可复用的标记系统，而不是套用固定滤镜。",
    skills: ["Photo Distill", "DYY Deconstruct", "Scene Distillation"],
    traits: ["视觉特征提炼", "结构标记", "系统化表达"],
    accent: "#d6b04d",
    surface: "#0b171e",
    preserve: "主体特征、密度与来源色",
    change: "标记、索引与系统规范",
    resultType: "特征抽象",
  },
  natural: {
    name: "原图编辑增强",
    short: "不重绘内容，统一光色、对比、裁切安全区与文字层级，让原图直接进入产品场景。",
    skills: ["Daily Photo", "Travel Zine", "Photo Abstract"],
    traits: ["原图优先", "光色统一", "安全裁切"],
    accent: "#67a7a1",
    surface: "#17232a",
    preserve: "完整原图与真实内容",
    change: "光色、裁切、对比与层级",
    resultType: "基础优化",
  },
  distill: {
    name: "主体提炼图",
    short: "围绕核心主体做背景减法、焦点聚光与轮廓符号，适合需要强识别的一张图。",
    skills: ["GC Minimal", "Scene Distillation", "Photo Distill"],
    traits: ["主体聚焦", "背景减法", "轮廓符号"],
    accent: "#e9c85f",
    surface: "#0b1217",
    preserve: "核心主体与代表色",
    change: "背景减法、聚光与轮廓符号",
    resultType: "主体提炼",
  },
  evidence: {
    name: "局部证据放大",
    short: "保留全图作为来源，同时增加局部放大窗、编号和证据标注，适合研究、档案与多图说明。",
    skills: ["Photo Abstract", "Travel Zine", "Photo Relic Editorial"],
    traits: ["来源保留", "局部放大", "证据编号"],
    accent: "#dc7759",
    surface: "#111a20",
    preserve: "全图、局部细节与来源关系",
    change: "放大窗、编号与证据标注",
    resultType: "证据编辑",
  },
};

const products = {
  story: {
    name: "图片故事册",
    short: "把多张图片组织成有开场、展开和收束的连续作品。",
    deliverable: "封面 + 5 张故事页",
    capabilities: ["图片关系理解", "叙事排序", "编辑拼贴", "真实文字合成", "页面 QA"],
    files: [
      ["封面", "故事命题与主图", 1200, 1500],
      ["证据开场", "完整原图与真实信息", 1200, 1500],
      ["场景展开", "多图连续关系", 1200, 1500],
      ["故事转折", "细节与重点停留", 1200, 1500],
      ["关系过场", "动作、方向与间隔", 1200, 1500],
      ["收束", "结束语与最后画面", 1200, 1500],
    ],
  },
  campaign: {
    name: "活动发布套件",
    short: "围绕一个核心画面形成跨渠道发布所需的完整规格。",
    deliverable: "主海报 + 社交卡 + 网页头图 + 屏幕画面",
    capabilities: ["主视觉提炼", "视觉延展", "多尺寸适配", "文字安全区", "导出 QA"],
    files: [
      ["主海报", "竖版活动主视觉", 1200, 1500],
      ["社交卡", "方形分享画面", 1200, 1200],
      ["网页头图", "宽屏标题区域", 1600, 900],
      ["屏幕画面", "现场横版大屏", 1920, 1080],
    ],
  },
  postcards: {
    name: "明信片系列",
    short: "把图片变成具有共同识别、可单张使用的收藏卡片。",
    deliverable: "3 张明信片 + 系列封套",
    capabilities: ["系列识别", "编辑裁切", "纸张结构", "可书写分区", "印刷安全区"],
    files: [
      ["明信片 01", "主场景与标题", 1200, 800],
      ["明信片 02", "动作或人物细节", 1200, 800],
      ["明信片 03", "物件与空间线索", 1200, 800],
      ["系列封套", "整套产品识别", 1200, 800],
    ],
  },
  editorial: {
    name: "编辑封面系统",
    short: "从核心图片提炼文章、专题和网页发布所需的编辑画面。",
    deliverable: "文章封面 + 章节页 + 分享图 + 网页横幅",
    capabilities: ["单一焦点", "编辑层级", "标题排版", "多比例重构", "阅读 QA"],
    files: [
      ["文章封面", "主标题与视觉锚点", 1200, 1500],
      ["章节页", "正文入口与细节", 1200, 1500],
      ["分享图", "社交传播摘要", 1200, 1200],
      ["网页横幅", "电脑网页头图", 1600, 900],
    ],
  },
  archive: {
    name: "收藏档案卡",
    short: "保留原图证据，并提取颜色、材料和可索引的信息结构。",
    deliverable: "主档案卡 + 细节卡 + 材料卡 + 索引封面",
    capabilities: ["原图事实锁定", "遗物提取", "材料转译", "档案排版", "来源 QA"],
    files: [
      ["主档案卡", "完整来源与编号", 1200, 1500],
      ["细节卡", "局部证据与说明", 1200, 1500],
      ["材料卡", "颜色与纹理关系", 1200, 1500],
      ["索引封面", "收藏系列入口", 1200, 1500],
    ],
  },
  carousel: {
    name: "社交轮播组",
    short: "把一张或多张图片组织成可连续阅读、可单页传播的社交内容系列。",
    deliverable: "封面卡 + 3 张内容卡 + 行动收束",
    capabilities: ["系列节奏", "滑动叙事", "标题安全区", "单页传播", "导出 QA"],
    files: [
      ["轮播封面", "第一眼主题与主图", 1080, 1350],
      ["内容卡 01", "背景与核心事实", 1080, 1350],
      ["内容卡 02", "图片关系与重点", 1080, 1350],
      ["内容卡 03", "细节证据与解释", 1080, 1350],
      ["行动收束", "结论、署名与下一步", 1080, 1350],
    ],
  },
  webstory: {
    name: "网页故事素材包",
    short: "为电脑网页准备横向头图、章节画面与收束视觉，直接支持长页叙事。",
    deliverable: "网页头图 + 3 个章节画面 + 收束画面",
    capabilities: ["宽屏重构", "章节叙事", "文字安全区", "跨段连续性", "网页 QA"],
    files: [
      ["网页头图", "标题、主图与首屏关系", 1600, 900],
      ["章节画面 01", "背景与场景建立", 1600, 900],
      ["章节画面 02", "人物、动作或物件关系", 1600, 900],
      ["章节画面 03", "细节证据与重点停留", 1600, 900],
      ["收束画面", "结论与下一步入口", 1600, 900],
    ],
  },
  exhibition: {
    name: "展览信息板",
    short: "把图片、证据和说明整理为可展示、可导览的大幅信息系统。",
    deliverable: "主展板 + 证据板 + 材料板 + 导览封面",
    capabilities: ["信息分区", "远距层级", "证据编排", "材料索引", "大幅 QA"],
    files: [
      ["主展板", "主题、主图与导览入口", 1600, 1200],
      ["证据板", "多图证据与编号", 1600, 1200],
      ["材料板", "颜色、纹理与细节", 1600, 1200],
      ["导览封面", "展览系列入口", 1600, 1200],
    ],
  },
  hero: {
    name: "主体主视觉",
    short: "围绕一张图片的核心主体形成可直接发布的强焦点主视觉。",
    deliverable: "主体主视觉 · 单一画面",
    capabilities: ["主体聚焦", "背景减法", "标题安全区", "轮廓强化", "导出 QA"],
    files: [["主体主视觉", "核心主体、识别符号与标题安全区", 1200, 1500]],
  },
  series: {
    name: "系列标准图",
    short: "让多张图片分别获得一致的裁切、光色、编号与识别规范。",
    deliverable: "每张图片 1 个标准化结果",
    capabilities: ["逐张独立", "统一裁切", "光色校正", "系列编号", "批次 QA"],
    files: [["系列标准图", "单图独立处理与统一规格", 1200, 1200]],
  },
  lookbook: {
    name: "视觉图鉴",
    short: "把多张图片整理为封面、总览索引、重点细节和视觉谱系。",
    deliverable: "图鉴封面 + 总览索引 + 重点细节 + 视觉谱系",
    capabilities: ["多图索引", "关系编排", "细节放大", "颜色谱系", "来源 QA"],
    files: [
      ["图鉴封面", "主题、代表图与系列入口", 1600, 1200],
      ["总览索引", "全部图片与编号关系", 1600, 1200],
      ["重点细节", "局部证据与放大说明", 1600, 1200],
      ["视觉谱系", "颜色、形态与来源线索", 1600, 1200],
    ],
  },
};

const processingModes = {
  single: {
    name: "只处理当前主图",
    short: "选择一张核心图片，交付一个完整成品。",
    action: "1 张图 → 1 个成品",
  },
  batch: {
    name: "多图逐张处理",
    short: "每张图片独立处理，使用同一种产品规格。",
    action: "每张图 → 1 个独立成品",
  },
  collection: {
    name: "多图制作合集",
    short: "让多张图片共同承担封面、章节与细节。",
    action: "多张图 → 1 套合集",
  },
};

const effectStrengths = {
  faithful: {
    name: "轻量保真",
    note: "保留更多原图，只做必要整理",
    overlayAlpha: 0.55,
    lineScale: 0.82,
    effectBlend: 0.58,
    accentWash: 0,
  },
  balanced: {
    name: "平衡推荐",
    note: "兼顾可辨认与设计表达",
    overlayAlpha: 1,
    lineScale: 1,
    effectBlend: 1,
    accentWash: 0,
  },
  bold: {
    name: "强表达",
    note: "强化处理特征与视觉识别",
    overlayAlpha: 1,
    lineScale: 1.42,
    effectBlend: 1,
    accentWash: 0.08,
  },
};

const modeCatalog = {
  single: {
    directions: ["scene", "distill", "deconstruct", "reconstruct", "revival", "material", "poetic", "fingerprint"],
    products: ["hero", "editorial", "campaign", "postcards", "archive"],
    directionNote: "单图可从保真编辑继续走向主体提炼、结构再造、场景生成、记忆重绘、媒介转译与关系抽象。先显示 3 个首选，完整方向可继续预览。",
    productNote: "单图新增主体主视觉，并保留封面、海报、明信片和档案卡等单一交付。",
  },
  batch: {
    directions: ["scene", "distill", "deconstruct", "material", "fingerprint", "postcard"],
    products: ["series", "postcards", "editorial", "campaign", "archive"],
    directionNote: "逐张模式只保留能稳定重复到每张图片的实景编辑、主体提炼、结构拆解、材料转译、视觉指纹与系列卡。",
    productNote: "逐张模式新增系列标准图，并保留可对每张图片重复执行的统一规格。",
  },
  collection: {
    directions: ["merge", "sequence", "revival", "deconstruct", "evidence", "material", "poetic", "fingerprint", "scene"],
    products: ["archive", "lookbook", "story", "carousel", "webstory", "exhibition"],
    directionNote: "合集优先使用多图场景融合与叙事续帧，也可选择记忆重绘、结构拆解、证据编辑和多种抽象转译。先显示 3 个首选。",
    productNote: "合集新增视觉图鉴，并保留需要多张图片共同完成的档案、故事、轮播、网页与展览产品。",
  },
};

const modeProductNames = {
  single: {
    hero: "主体主视觉",
    editorial: "文章封面",
    campaign: "活动海报",
    postcards: "收藏明信片",
    archive: "单图档案卡",
  },
  batch: {
    series: "系列标准图",
    postcards: "明信片批次",
    editorial: "封面批次",
    campaign: "发布图批次",
    archive: "档案卡批次",
  },
};

const sampleCatalog = {
  rainy: {
    label: "雨夜书店",
    meta: "6 张连续照片",
    url: "../samples/rainy-bookstore/source-contact-sheet.png",
    mode: "sheet",
    title: "雨停以前",
    body: "一组照片，在雨夜里留下进入、停留与离开的顺序。",
    credit: "雨夜 · 虚构城市旧书店",
    recommendations: ["story", "postcards", "editorial"],
    routeMap: { story: "revival", carousel: "sequence", webstory: "merge", postcards: "postcard", editorial: "poetic" },
    effectMap: { story: "../samples/rainy-bookstore/route-memory-cover-v3.png" },
    note: "连续场景和动作关系明显，优先推荐故事、系列卡片与编辑表达。",
  },
  ceramic: {
    label: "陶艺工作室",
    meta: "6 张制作过程",
    url: "../target-studio/assets/ceramic-studio-source.png",
    mode: "sheet",
    title: "手与泥土",
    body: "从塑形、釉色到成品陈列，把制作过程变成可以收藏和传播的系列。",
    credit: "陶艺工作室 · 制作档案",
    recommendations: ["postcards", "campaign", "archive"],
    routeMap: { lookbook: "deconstruct", archive: "evidence", carousel: "sequence", postcards: "postcard", campaign: "material" },
    effectMap: { postcards: "../target-studio/assets/ceramic-postcards-result.png" },
    note: "材料、手部动作与成品细节适合明信片、工作室发布和材料档案。",
  },
  robotics: {
    label: "风能机器人",
    meta: "6 张技术现场",
    url: "../target-studio/assets/wind-robotics-source.png",
    mode: "sheet",
    title: "向风而行",
    body: "把设备、海岸环境和工程细节组织成清晰可信的技术项目表达。",
    credit: "清洁能源基地 · 项目记录",
    recommendations: ["editorial", "campaign", "archive"],
    routeMap: { exhibition: "deconstruct", webstory: "poetic", lookbook: "fingerprint", editorial: "poetic", campaign: "material", archive: "evidence" },
    effectMap: { editorial: "../target-studio/assets/robotics-cover-result.png" },
    note: "核心设备、工程细节与环境尺度适合编辑封面、技术发布和项目档案。",
  },
  stage: {
    label: "实验音乐舞台",
    meta: "6 张舞台影像",
    url: "../target-studio/assets/cellist-stage-source.png",
    mode: "sheet",
    title: "声场发生",
    body: "让人物轮廓、器乐细节和舞台光成为一套跨屏幕传播的演出视觉。",
    credit: "实验演出 · 舞台记录",
    recommendations: ["campaign", "editorial", "postcards"],
    routeMap: { carousel: "material", webstory: "sequence", story: "merge", campaign: "material", editorial: "poetic", postcards: "postcard" },
    effectMap: {
      campaign: "../target-studio/assets/performance-carousel-result.png",
      carousel: "../target-studio/assets/performance-carousel-result.png",
    },
    note: "舞台焦点、光线和表演动作适合活动发布、编辑封面与收藏卡片。",
  },
  alpine: {
    label: "高山种子档案",
    meta: "6 张研究素材",
    url: "../target-studio/assets/alpine-seed-library-source.png",
    mode: "sheet",
    title: "山谷种子",
    body: "保存种子、地貌和研究过程之间的证据关系，形成可索引的视觉记录。",
    credit: "高山研究站 · 收藏编号 01",
    recommendations: ["archive", "editorial", "postcards"],
    routeMap: { archive: "revival", lookbook: "fingerprint", exhibition: "evidence", editorial: "fingerprint", postcards: "postcard" },
    effectMap: { archive: "../target-studio/assets/alpine-relic-result.png" },
    note: "标本、环境和研究信息适合档案卡、研究特刊与收藏系列。",
  },
  repair: {
    label: "雨夜修车铺",
    meta: "1 张核心照片",
    url: "../target-studio/assets/skill-composer-source.png",
    mode: "single",
    title: "一张图的延展",
    body: "从核心画面出发，生成可以继续使用的完整视觉产品。",
    credit: "雨夜修车铺 · 单图演示",
    recommendations: ["editorial", "campaign", "archive"],
    routeMap: { hero: "revival", editorial: "deconstruct", campaign: "material", archive: "revival", postcards: "scene" },
    effectMap: {
      hero: "../target-studio/assets/repair-memory-reconstruction-result.png",
      editorial: "../target-studio/assets/repair-material-deconstruct-result.png",
      campaign: "../target-studio/assets/composer-material-campaign.png",
      archive: "../target-studio/assets/repair-memory-reconstruction-result.png",
      revival: "../target-studio/assets/repair-memory-reconstruction-result.png",
      reconstruct: "../target-studio/assets/repair-memory-reconstruction-result.png",
      material: "../target-studio/assets/repair-material-deconstruct-result.png",
      deconstruct: "../target-studio/assets/repair-material-deconstruct-result.png",
    },
    note: "单一主体和明确空间关系适合编辑封面、发布套件与收藏档案。",
  },
};

const referenceCatalog = {
  memory: {
    name: "手绘记忆重生",
    routeId: "revival",
    image: "../target-studio/assets/repair-memory-reconstruction-result.png",
    summary: "保留主体与关键物件，把环境重绘成有时间层次的手绘记忆。",
    method: "照片事实 + 手绘媒介 + 时间回声",
  },
  deconstruct: {
    name: "结构拆解重组",
    routeId: "deconstruct",
    image: "../target-studio/assets/repair-material-deconstruct-result.png",
    summary: "提取主体、方向和群组，重组为钴蓝、橙色与黑色的结构画面。",
    method: "主体轮廓 + 丝网印刷 + 几何重组",
  },
  editorial: {
    name: "工程编辑主视觉",
    routeId: "scene",
    image: "../target-studio/assets/robotics-cover-result.png",
    summary: "保持真实设备和环境尺度，强化编辑焦点、留白和传播张力。",
    method: "实景证据 + 编辑构图 + 克制标题区",
  },
  performance: {
    name: "舞台材料发布",
    routeId: "material",
    image: "../target-studio/assets/performance-carousel-result.png",
    summary: "将人物动作和光线转成高对比色场与适合传播的舞台画面。",
    method: "人物轮廓 + 舞台色光 + 材料转译",
  },
  relic: {
    name: "研究遗物档案",
    routeId: "evidence",
    image: "../target-studio/assets/alpine-relic-result.png",
    summary: "保留研究对象的来源感，用遗物、索引和纸张层次构成档案视觉。",
    method: "对象证据 + 档案纸张 + 局部索引",
  },
  postcard: {
    name: "材料明信片系列",
    routeId: "postcard",
    image: "../target-studio/assets/ceramic-postcards-result.png",
    summary: "把物件和制作痕迹转成边缘完整、色彩统一的收藏卡片。",
    method: "对象系列 + 材料色 + 卡片边界",
  },
  story: {
    name: "雨夜叙事封面",
    routeId: "sequence",
    image: "../samples/rainy-bookstore/route-memory-cover-v3.png",
    summary: "从现场线索提炼进入、停留与离开的叙事气氛。",
    method: "场景顺序 + 夜色氛围 + 叙事入口",
  },
  abstract: {
    name: "诗性关系抽象",
    routeId: "poetic",
    image: "../target-studio/assets/composer-poetic-report.png",
    summary: "将动作、方向和距离转换为线条、留白和关系路径。",
    method: "动作方向 + 关系线 + 克制留白",
  },
};

const sampleReferenceMap = {
  rainy: "story",
  ceramic: "postcard",
  robotics: "editorial",
  stage: "performance",
  alpine: "relic",
  repair: "memory",
};

const sampleRecommendationProfiles = {
  rainy: {
    signals: ["连续场景", "明确时间顺序", "雨夜氛围"],
    orders: {
      single: ["editorial", "hero", "postcards", "campaign", "archive"],
      batch: ["editorial", "series", "postcards", "campaign", "archive"],
      collection: ["story", "carousel", "webstory", "archive", "lookbook", "exhibition"],
    },
  },
  ceramic: {
    signals: ["制作过程", "材料细节", "成品系列"],
    orders: {
      single: ["hero", "editorial", "archive", "campaign", "postcards"],
      batch: ["series", "postcards", "archive", "campaign", "editorial"],
      collection: ["lookbook", "archive", "carousel", "story", "exhibition", "webstory"],
    },
  },
  robotics: {
    signals: ["设备主体", "环境尺度", "工程证据"],
    orders: {
      single: ["editorial", "hero", "campaign", "archive", "postcards"],
      batch: ["series", "editorial", "campaign", "archive", "postcards"],
      collection: ["exhibition", "webstory", "lookbook", "archive", "carousel", "story"],
    },
  },
  stage: {
    signals: ["人物焦点", "舞台光线", "连续动作"],
    orders: {
      single: ["campaign", "hero", "editorial", "postcards", "archive"],
      batch: ["campaign", "series", "editorial", "postcards", "archive"],
      collection: ["carousel", "webstory", "story", "exhibition", "lookbook", "archive"],
    },
  },
  alpine: {
    signals: ["标本资料", "研究来源", "索引关系"],
    orders: {
      single: ["archive", "editorial", "hero", "postcards", "campaign"],
      batch: ["archive", "series", "editorial", "postcards", "campaign"],
      collection: ["archive", "lookbook", "exhibition", "webstory", "story", "carousel"],
    },
  },
  repair: {
    signals: ["单一主体", "雨夜光线", "空间纵深"],
    orders: {
      single: ["hero", "editorial", "campaign", "archive", "postcards"],
      batch: ["series", "editorial", "campaign", "archive", "postcards"],
      collection: ["story", "carousel", "webstory", "archive", "lookbook", "exhibition"],
    },
  },
};

const sampleDirectionProfiles = {
  rainy: {
    single: ["revival", "reconstruct", "scene", "deconstruct", "poetic", "material", "distill", "fingerprint"],
    batch: ["scene", "deconstruct", "fingerprint", "material", "distill", "postcard"],
    collection: ["revival", "sequence", "merge", "deconstruct", "evidence", "poetic", "material", "fingerprint", "scene"],
  },
  ceramic: {
    single: ["deconstruct", "scene", "material", "distill", "reconstruct", "revival", "fingerprint", "poetic"],
    batch: ["deconstruct", "scene", "material", "fingerprint", "postcard", "distill"],
    collection: ["deconstruct", "evidence", "sequence", "material", "fingerprint", "merge", "revival", "scene", "poetic"],
  },
  robotics: {
    single: ["deconstruct", "distill", "poetic", "scene", "material", "fingerprint", "reconstruct", "revival"],
    batch: ["deconstruct", "fingerprint", "scene", "material", "distill", "postcard"],
    collection: ["deconstruct", "fingerprint", "evidence", "poetic", "merge", "sequence", "material", "scene", "revival"],
  },
  stage: {
    single: ["material", "reconstruct", "distill", "deconstruct", "scene", "poetic", "revival", "fingerprint"],
    batch: ["material", "deconstruct", "scene", "fingerprint", "distill", "postcard"],
    collection: ["material", "sequence", "merge", "deconstruct", "poetic", "fingerprint", "revival", "evidence", "scene"],
  },
  alpine: {
    single: ["revival", "evidence", "fingerprint", "scene", "deconstruct", "reconstruct", "poetic", "material"],
    batch: ["fingerprint", "scene", "deconstruct", "postcard", "material", "distill"],
    collection: ["revival", "evidence", "fingerprint", "deconstruct", "merge", "sequence", "scene", "poetic", "material"],
  },
  repair: {
    single: ["revival", "deconstruct", "reconstruct", "distill", "scene", "material", "poetic", "fingerprint"],
    batch: ["deconstruct", "scene", "material", "fingerprint", "distill", "postcard"],
    collection: ["merge", "sequence", "revival", "deconstruct", "evidence", "material", "poetic", "fingerprint", "scene"],
  },
};

const state = {
  sources: [],
  primarySource: 0,
  recommendations: [],
  productId: null,
  fileIndex: 0,
  generated: false,
  objectUrls: [],
  sourceKind: "demo",
  sampleId: null,
  routeId: "memory",
  routeManual: false,
  effectImages: {},
  processingMode: "single",
  previewLayer: "reference",
  effectStrength: "balanced",
  productSelectionSource: "recommended",
  routeSelectionSource: "recommended",
  referenceId: "memory",
  apiAvailable: false,
  apiMessage: "正在检查 AI 服务",
  generatedResults: [],
  selectedResultId: null,
};

const query = new URLSearchParams(window.location.search);

const $ = (selector) => document.querySelector(selector);
const elements = {
  workspace: $("#workspace"),
  sourcePickerButton: $("#source-picker-button"),
  sourceInput: $("#source-input"),
  sourceList: $("#source-list"),
  sourceChip: $("#source-chip"),
  sourceStatus: $("#source-status"),
  sampleOptions: $("#sample-options"),
  clearSourceButton: $("#clear-source-button"),
  modeOptions: $("#mode-options"),
  modeNote: $("#mode-note"),
  recommendationList: $("#recommendation-list"),
  recommendationNote: $("#recommendation-note"),
  recommendationSignals: $("#recommendation-signals"),
  recommendationBasis: $("#recommendation-basis"),
  integrityDetail: $("#integrity-detail"),
  designOptions: $("#design-options"),
  designNote: $("#design-note"),
  strengthOptions: $("#strength-options"),
  strengthNote: $("#strength-note"),
  directionCount: $("#direction-count"),
  productCount: $("#product-count"),
  canvas: $("#product-canvas"),
  canvasHeading: $("#canvas-heading"),
  productEyebrow: $("#product-eyebrow"),
  formatType: $("#format-type"),
  formatSize: $("#format-size"),
  canvasDescription: $("#canvas-description"),
  resultPreviewButton: $("#result-preview-button"),
  sourcePreviewButton: $("#source-preview-button"),
  referencePreviewButton: $("#reference-preview-button"),
  productPreviewButton: $("#product-preview-button"),
  stageImage: $("#stage-image"),
  canvasStage: $(".canvas-stage"),
  canvasStateTitle: $("#canvas-state-title"),
  canvasStateCopy: $("#canvas-state-copy"),
  generateButton: $("#generate-button"),
  downloadButton: $("#download-button"),
  downloadBundleButton: $("#download-bundle-button"),
  exportStatus: $("#export-status"),
  productName: $("#product-name"),
  productDescription: $("#product-description"),
  coverageSummary: $("#coverage-summary"),
  coverageSourceCount: $("#coverage-source-count"),
  coverageOutputCount: $("#coverage-output-count"),
  coverageStatus: $("#coverage-status"),
  routeName: $("#route-name"),
  routeDescription: $("#route-description"),
  routeSkillTags: $("#route-skill-tags"),
  fileCount: $("#file-count"),
  fileList: $("#file-list"),
  generationDetailCopy: $("#generation-detail-copy"),
  capabilityTags: $("#capability-tags"),
  titleInput: $("#title-input"),
  bodyInput: $("#body-input"),
  metaInput: $("#meta-input"),
  titleCount: $("#title-count"),
  bodyCount: $("#body-count"),
  toast: $("#toast"),
  moreProductsButton: $("#more-products-button"),
  moreProductsCount: $("#more-products-count"),
  productCatalogDialog: $("#product-catalog-dialog"),
  catalogProductList: $("#catalog-product-list"),
  catalogModeCopy: $("#catalog-mode-copy"),
  catalogCloseButton: $("#catalog-close-button"),
  moreDirectionsButton: $("#more-directions-button"),
  moreDirectionsCount: $("#more-directions-count"),
  directionCatalogDialog: $("#direction-catalog-dialog"),
  catalogDirectionList: $("#catalog-direction-list"),
  directionCatalogModeCopy: $("#direction-catalog-mode-copy"),
  directionCatalogCloseButton: $("#direction-catalog-close-button"),
  sampleOptionsTitle: $("#sample-options-title"),
  sampleOptionsHelp: $("#sample-options-help"),
  referenceSection: $("#reference-section"),
  referenceOptions: $("#reference-options"),
  referenceCount: $("#reference-count"),
  referenceNote: $("#reference-note"),
  moreReferencesButton: $("#more-references-button"),
  moreReferencesCount: $("#more-references-count"),
  referenceCatalogDialog: $("#reference-catalog-dialog"),
  referenceCatalogList: $("#reference-catalog-list"),
  referenceCatalogCloseButton: $("#reference-catalog-close-button"),
  compareStatus: $("#compare-status"),
  compareSourceButton: $("#compare-source-button"),
  compareReferenceButton: $("#compare-reference-button"),
  compareResultButton: $("#compare-result-button"),
  compareSourceImage: $("#compare-source-image"),
  compareReferenceImage: $("#compare-reference-image"),
  compareResultImage: $("#compare-result-image"),
  resultList: $("#result-list"),
  resultEmpty: $("#result-empty"),
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function imageToDataUrl(image, crop = null, maxEdge = 1536) {
  const rect = crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const scale = Math.min(1, maxEdge / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  canvas.getContext("2d").drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function sourceDataUrl(source = state.sources[state.primarySource]) {
  return source ? imageToDataUrl(source.image, source.crop) : "";
}

function selectedReference() {
  return referenceCatalog[state.referenceId] ?? referenceCatalog.memory;
}

function selectedGeneratedResult() {
  return state.generatedResults.find((result) => result.id === state.selectedResultId) ?? null;
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error("AI 服务不可用");
    const status = await response.json();
    state.apiAvailable = Boolean(status.available);
    state.apiMessage = status.message ?? "AI 服务状态未知";
  } catch {
    state.apiAvailable = false;
    state.apiMessage = "当前由静态服务器运行；请改用 compositor/server.mjs 启动";
  }
  renderGenerationAvailability();
}

function renderGenerationAvailability() {
  if (!state.sources.length || !state.productId) return;
  elements.generateButton.disabled = !state.apiAvailable;
  elements.generateButton.textContent = state.apiAvailable
    ? state.generatedResults.length ? "再次生成一个结果" : "使用参考生成"
    : "AI 服务尚未连接";
  if (!state.apiAvailable) elements.exportStatus.textContent = `${state.apiMessage}。生成前仍可查看原图和参考效果。`;
}

function createReferenceCard(referenceId, { catalog = false } = {}) {
  const reference = referenceCatalog[referenceId];
  const button = document.createElement("button");
  button.className = "reference-card";
  button.type = "button";
  button.setAttribute("aria-pressed", String(referenceId === state.referenceId));
  button.setAttribute("aria-label", `使用参考样例：${reference.name}`);
  button.innerHTML = `
    <img src="${reference.image}" alt="${reference.name}参考效果" />
    <span class="reference-card-copy">
      <small>${referenceId === state.referenceId ? "当前参考" : catalog ? "可选择" : "推荐参考"}</small>
      <strong>${reference.name}</strong>
      <span>${reference.summary}</span>
      <em>${reference.method}</em>
    </span>
  `;
  button.addEventListener("click", () => selectReference(referenceId, { closeDialog: catalog }));
  return button;
}

function referenceIdsForCurrentState() {
  return Object.keys(referenceCatalog);
}

function renderReferences() {
  const referenceIds = referenceIdsForCurrentState();
  if (!referenceIds.includes(state.referenceId)) state.referenceId = referenceIds[0];
  const orderedIds = [state.referenceId, ...referenceIds.filter((referenceId) => referenceId !== state.referenceId)];
  elements.referenceOptions.innerHTML = "";
  orderedIds.slice(0, 3).forEach((referenceId) => elements.referenceOptions.append(createReferenceCard(referenceId)));
  elements.referenceCount.textContent = state.sources.length ? `3 / ${referenceIds.length} 个适用` : "等待图片";
  elements.moreReferencesCount.textContent = `${referenceIds.length} 种结果方法`;
  elements.moreReferencesButton.disabled = !state.sources.length;
}

function renderReferenceCatalog() {
  elements.referenceCatalogList.innerHTML = "";
  referenceIdsForCurrentState().forEach((referenceId) => elements.referenceCatalogList.append(createReferenceCard(referenceId, { catalog: true })));
}

function selectReference(referenceId, { closeDialog = false } = {}) {
  const reference = referenceCatalog[referenceId];
  if (!reference) return;
  state.referenceId = referenceId;
  if (directionIdsForMode().includes(reference.routeId)) {
    state.routeId = reference.routeId;
    state.routeManual = true;
    state.routeSelectionSource = "manual";
  }
  state.generated = false;
  state.previewLayer = "reference";
  state.selectedResultId = null;
  renderSampleOptions();
  renderReferences();
  applyProduct();
  if (closeDialog && elements.referenceCatalogDialog.open) elements.referenceCatalogDialog.close();
}

function resultImageUrl() {
  return selectedGeneratedResult()?.image ?? "";
}

function setStageImage(url, view) {
  elements.canvasStage.dataset.view = view;
  elements.stageImage.src = url;
}

function renderComparison() {
  const sourceUrl = sourceDataUrl();
  const reference = selectedReference();
  const result = selectedGeneratedResult();
  elements.compareSourceImage.src = sourceUrl;
  elements.compareReferenceImage.src = reference.image;
  elements.compareResultImage.src = result?.image ?? "";
  elements.compareResultButton.disabled = !result;
  elements.compareResultButton.classList.toggle("is-pending", !result);
  elements.compareResultButton.querySelector("span").textContent = result ? `03 · 结果 ${state.generatedResults.indexOf(result) + 1}` : "03 · 等待 AI 结果";
  elements.compareStatus.textContent = result ? `已生成 ${state.generatedResults.length} 个结果` : "生成前：当前显示参考";
  elements.compareSourceButton.setAttribute("aria-pressed", String(state.previewLayer === "source"));
  elements.compareReferenceButton.setAttribute("aria-pressed", String(state.previewLayer === "reference"));
  elements.compareResultButton.setAttribute("aria-pressed", String(state.previewLayer === "result"));
}

function renderResultLibrary() {
  elements.resultList.innerHTML = "";
  if (!state.generatedResults.length) {
    const empty = document.createElement("div");
    empty.className = "result-empty";
    empty.textContent = "生成完成后，结果会保留在这里供比较、选择和下载。";
    elements.resultList.append(empty);
    return;
  }
  state.generatedResults.forEach((result, index) => {
    const button = document.createElement("button");
    button.className = "result-item";
    button.type = "button";
    button.setAttribute("aria-pressed", String(result.id === state.selectedResultId));
    button.setAttribute("aria-label", `查看生成结果 ${index + 1}`);
    button.innerHTML = `<img src="${result.image}" alt="生成结果 ${index + 1}" /><span>结果 ${index + 1} · ${referenceCatalog[result.referenceId]?.name ?? "参考生成"}</span>`;
    button.addEventListener("click", () => {
      state.selectedResultId = result.id;
      state.previewLayer = "result";
      applyProduct();
    });
    elements.resultList.append(button);
  });
}

function getSourceRect(source) {
  if (source.crop) return source.crop;
  return { x: 0, y: 0, width: source.image.naturalWidth, height: source.image.naturalHeight };
}

function drawSource(ctx, sourceIndex, x, y, width, height, options = {}) {
  const resolvedIndex = options.absolute ? sourceIndex : (sourceIndex + state.primarySource) % state.sources.length;
  const source = state.sources[resolvedIndex];
  if (!source) return;
  const rect = getSourceRect(source);
  const sourceRatio = rect.width / rect.height;
  const destinationRatio = width / height;
  let cropWidth = rect.width;
  let cropHeight = rect.height;

  if (sourceRatio > destinationRatio) cropWidth = rect.height * destinationRatio;
  else cropHeight = rect.width / destinationRatio;

  const zoom = options.zoom ?? 1;
  cropWidth /= zoom;
  cropHeight /= zoom;
  const sx = rect.x + (rect.width - cropWidth) / 2 + (options.offsetX ?? 0) * (rect.width - cropWidth) * 0.45;
  const sy = rect.y + (rect.height - cropHeight) / 2 + (options.offsetY ?? 0) * (rect.height - cropHeight) * 0.45;

  ctx.save();
  if (options.radius) {
    roundedRect(ctx, x, y, width, height, options.radius);
    ctx.clip();
  }
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(source.image, sx, sy, cropWidth, cropHeight, x, y, width, height);
  if (options.overlay) {
    ctx.fillStyle = options.overlay;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

function drawSourceContain(ctx, source, x, y, width, height) {
  if (!source) return;
  const rect = getSourceRect(source);
  const scale = Math.min(width / rect.width, height / rect.height);
  const drawWidth = rect.width * scale;
  const drawHeight = rect.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(source.image, rect.x, rect.y, rect.width, rect.height, drawX, drawY, drawWidth, drawHeight);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const characters = Array.from(text || "");
  const lines = [];
  let line = "";
  for (const character of characters) {
    const candidate = line + character;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawText(ctx, text, x, y, maxWidth, options = {}) {
  const size = options.size ?? 46;
  const lineHeight = options.lineHeight ?? size * 1.22;
  ctx.save();
  ctx.fillStyle = options.color ?? palette.paper;
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.font = `${options.weight ?? 600} ${size}px ${options.serif === false ? 'Inter, "Microsoft YaHei", sans-serif' : '"Songti SC", "Noto Serif SC", Georgia, serif'}`;
  ctx.textAlign = options.align ?? "left";
  const lines = wrapLines(ctx, text, maxWidth, options.maxLines ?? 3);
  lines.forEach((line, index) => ctx.fillText(line, x, y + lineHeight * index));
  ctx.restore();
  return lines.length;
}

function drawPaper(ctx, width, height) {
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = palette.mustard;
  ctx.lineWidth = 1;
  for (let y = 18; y < height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y + ((y * 13) % 9));
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFooter(ctx, width, height, productName, index) {
  ctx.save();
  ctx.fillStyle = palette.paper;
  ctx.globalAlpha = 0.76;
  ctx.font = `600 ${Math.max(14, width * 0.014)}px Inter, "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(productName, width * 0.06, height * 0.955);
  ctx.textAlign = "right";
  ctx.fillText(String(index + 1).padStart(2, "0"), width * 0.94, height * 0.955);
  ctx.restore();
}

function renderStory(ctx, fileIndex, width, height) {
  if (fileIndex === 0) {
    drawSource(ctx, 0, 0, 0, width, height, { zoom: 1.03, overlay: "rgba(4,12,18,.46)" });
    ctx.fillStyle = palette.mustard;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.82);
    ctx.lineTo(width * 0.48, height * 0.92);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    drawText(ctx, elements.titleInput.value || "未命名故事", width * 0.07, height * 0.13, width * 0.72, { size: width * 0.075, maxLines: 2 });
    drawText(ctx, elements.bodyInput.value, width * 0.072, height * 0.28, width * 0.68, { size: width * 0.024, maxLines: 3, serif: false, weight: 400, alpha: 0.86 });
  } else {
    const sourcePosition = fileIndex - 1;
    const isLast = sourcePosition === state.sources.length - 1;
    if (isLast) {
      drawSource(ctx, sourcePosition, 0, 0, width, height, { zoom: 1.02, overlay: "rgba(4,12,18,.4)" });
      ctx.fillStyle = "rgba(7,18,26,.86)";
      ctx.fillRect(0, height * 0.66, width, height * 0.34);
      drawText(ctx, "把这些画面留在一起", width * 0.07, height * 0.77, width * 0.8, { size: width * 0.054, maxLines: 1 });
      drawText(ctx, elements.metaInput.value, width * 0.072, height * 0.86, width * 0.7, { size: width * 0.02, serif: false, weight: 500, alpha: 0.8 });
    } else if (sourcePosition % 2 === 0) {
      drawPaper(ctx, width, height);
      drawSource(ctx, sourcePosition, width * 0.09, height * 0.13, width * 0.82, height * 0.61, { zoom: 1.04 });
      drawText(ctx, `故事页 ${String(sourcePosition + 1).padStart(2, "0")}`, width * 0.09, height * 0.81, width * 0.72, { size: width * 0.045, color: palette.ink, maxLines: 1 });
      drawText(ctx, state.sources[(state.primarySource + sourcePosition) % state.sources.length]?.name ?? elements.metaInput.value, width * 0.09, height * 0.87, width * 0.76, { size: width * 0.018, color: palette.ink, serif: false, weight: 500 });
    } else {
      ctx.fillStyle = palette.ink;
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, `STORY / ${String(sourcePosition + 1).padStart(2, "0")}`, width * 0.06, height * 0.085, width * 0.7, { size: width * 0.035, color: palette.teal, serif: false, weight: 800 });
      drawSource(ctx, sourcePosition, width * 0.06, height * 0.14, width * 0.88, height * 0.62, { zoom: 1.08 });
      ctx.strokeStyle = palette.amber;
      ctx.lineWidth = Math.max(3, width * 0.006);
      ctx.beginPath();
      ctx.moveTo(width * 0.08, height * 0.82);
      ctx.lineTo(width * 0.34, height * 0.82);
      ctx.stroke();
      drawText(ctx, elements.bodyInput.value, width * 0.08, height * 0.9, width * 0.78, { size: width * 0.025, maxLines: 2, serif: false, weight: 450, alpha: 0.82 });
    }
  }
  drawFooter(ctx, width, height, products.story.name, fileIndex);
}

function renderCampaign(ctx, fileIndex, width, height) {
  drawSource(ctx, fileIndex, 0, 0, width, height, { zoom: fileIndex === 0 ? 1.05 : 1.12, overlay: "rgba(3,10,15,.38)" });
  const vertical = height > width;
  ctx.fillStyle = "rgba(7,18,26,.9)";
  if (vertical) ctx.fillRect(0, height * 0.66, width, height * 0.34);
  else ctx.fillRect(width * 0.54, 0, width * 0.46, height);
  ctx.fillStyle = palette.amber;
  ctx.fillRect(vertical ? width * 0.07 : width * 0.59, vertical ? height * 0.63 : height * 0.12, vertical ? width * 0.18 : width * 0.12, Math.max(8, height * 0.012));
  const textX = vertical ? width * 0.07 : width * 0.59;
  const textY = vertical ? height * 0.76 : height * 0.31;
  const textWidth = vertical ? width * 0.82 : width * 0.33;
  drawText(ctx, elements.titleInput.value, textX, textY, textWidth, { size: Math.min(width, height) * 0.08, maxLines: 2 });
  drawText(ctx, elements.bodyInput.value, textX, textY + Math.min(width, height) * 0.15, textWidth, { size: Math.min(width, height) * 0.026, maxLines: 3, serif: false, weight: 400, alpha: 0.84 });
  drawText(ctx, products.campaign.files[fileIndex][0], textX, vertical ? height * 0.94 : height * 0.86, textWidth, { size: Math.min(width, height) * 0.018, serif: false, weight: 700, color: palette.amber });
}

function renderPostcard(ctx, fileIndex, width, height) {
  drawPaper(ctx, width, height);
  const inset = Math.round(Math.min(width, height) * 0.055);
  if (fileIndex < 3) {
    drawSource(ctx, fileIndex, inset, inset, width * 0.62, height - inset * 2, { zoom: 1.06 });
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(width * 0.71, height * 0.12);
    ctx.lineTo(width * 0.71, height * 0.88);
    ctx.stroke();
    drawText(ctx, elements.titleInput.value, width * 0.75, height * 0.2, width * 0.2, { size: height * 0.06, color: palette.ink, maxLines: 2 });
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(width * 0.75, height * (0.52 + i * 0.09));
      ctx.lineTo(width * 0.94, height * (0.52 + i * 0.09));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = palette.ink;
    ctx.fillRect(inset, inset, width - inset * 2, height - inset * 2);
    [0, 1, 2].forEach((index) => drawSource(ctx, index, width * (0.08 + index * 0.3), height * 0.16, width * 0.25, height * 0.52, { zoom: 1.08 }));
    drawText(ctx, elements.titleInput.value, width * 0.08, height * 0.82, width * 0.68, { size: height * 0.07, maxLines: 1 });
    ctx.fillStyle = palette.amber;
    ctx.fillRect(width * 0.82, height * 0.76, width * 0.1, height * 0.1);
  }
}

function renderEditorial(ctx, fileIndex, width, height) {
  drawPaper(ctx, width, height);
  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, width, height * 0.12);
  drawText(ctx, "FIELD NOTES / 01", width * 0.06, height * 0.078, width * 0.5, { size: Math.min(width, height) * 0.025, serif: false, weight: 750 });
  if (height > width) {
    drawSource(ctx, fileIndex, width * 0.08, height * 0.19, width * 0.84, height * 0.52, { zoom: 1.06 });
    drawText(ctx, elements.titleInput.value, width * 0.08, height * 0.79, width * 0.82, { size: width * 0.06, color: palette.ink, maxLines: 2 });
    drawText(ctx, elements.bodyInput.value, width * 0.08, height * 0.9, width * 0.78, { size: width * 0.021, color: palette.ink, maxLines: 2, serif: false, weight: 400 });
  } else {
    drawSource(ctx, fileIndex, 0, height * 0.12, width * 0.55, height * 0.88, { zoom: 1.06 });
    drawText(ctx, elements.titleInput.value, width * 0.61, height * 0.36, width * 0.32, { size: height * 0.09, color: palette.ink, maxLines: 3 });
    drawText(ctx, elements.bodyInput.value, width * 0.61, height * 0.64, width * 0.31, { size: height * 0.029, color: palette.ink, maxLines: 3, serif: false, weight: 400 });
  }
}

function renderArchive(ctx, fileIndex, width, height) {
  drawPaper(ctx, width, height);
  const margin = width * 0.07;
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  ctx.globalAlpha = 1;
  drawText(ctx, `ARCHIVE / ${String(fileIndex + 1).padStart(2, "0")}`, margin * 1.4, height * 0.1, width * 0.7, { size: width * 0.022, color: palette.ink, serif: false, weight: 750 });
  if (fileIndex === 0) {
    drawSource(ctx, 0, margin * 1.4, height * 0.15, width * 0.72, height * 0.58, { zoom: 1.05 });
    drawText(ctx, productFiles("archive")[0][0], margin * 1.4, height * 0.81, width * 0.72, { size: width * 0.048, color: palette.ink, maxLines: 1 });
  } else if (fileIndex === 1) {
    drawSource(ctx, 1, margin * 1.4, height * 0.15, width * 0.46, height * 0.58, { zoom: 1.22 });
    drawSource(ctx, 2, width * 0.62, height * 0.15, width * 0.24, height * 0.28, { zoom: 1.5 });
    drawSource(ctx, 2, width * 0.62, height * 0.46, width * 0.24, height * 0.27, { zoom: 2.1, offsetX: 0.2 });
    drawText(ctx, "双图细节证据", margin * 1.4, height * 0.81, width * 0.72, { size: width * 0.048, color: palette.ink, maxLines: 1 });
  } else if (fileIndex === 2) {
    const colors = [palette.ink, palette.teal, palette.amber, palette.mustard, palette.rust];
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(margin * 1.4 + index * width * 0.16, height * 0.18, width * 0.12, height * 0.28);
    });
    orderedSourceIndexes().slice(3).forEach((sourceIndex, index) => {
      drawSource(ctx, index + 3, margin * 1.4 + index * width * 0.245, height * 0.53, width * 0.2, height * 0.2, { zoom: 1.18 });
    });
    drawText(ctx, "材料与颜色", margin * 1.4, height * 0.8, width * 0.72, { size: width * 0.05, color: palette.ink, maxLines: 1 });
  } else {
    const gap = width * 0.018;
    const cellW = (width * 0.72 - gap * 2) / 3;
    const cellH = height * 0.24;
    orderedSourceIndexes().forEach((sourceIndex, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = margin * 1.4 + column * (cellW + gap);
      const y = height * 0.15 + row * (cellH + height * 0.06);
      drawSource(ctx, index, x, y, cellW, cellH, { zoom: 1.08 });
      drawText(ctx, String(sourceIndex + 1).padStart(2, "0"), x, y + cellH + height * 0.03, cellW, { size: width * 0.014, color: palette.ink, serif: false, weight: 800 });
    });
    drawText(ctx, elements.titleInput.value, margin * 1.4, height * 0.86, width * 0.72, { size: width * 0.04, color: palette.ink, maxLines: 1 });
  }
  ctx.fillStyle = palette.amber;
  ctx.fillRect(width * 0.81, height * 0.82, width * 0.07, width * 0.07);
  drawText(ctx, elements.metaInput.value, margin * 1.4, height * 0.89, width * 0.62, { size: width * 0.018, color: palette.ink, serif: false, weight: 500 });
}

function renderCarousel(ctx, fileIndex, width, height) {
  const margin = width * 0.065;
  if (fileIndex === 0) {
    drawSource(ctx, 0, 0, 0, width, height, { zoom: 1.06, overlay: "rgba(3,10,15,.34)" });
    ctx.fillStyle = "rgba(7,18,26,.9)";
    ctx.fillRect(0, height * 0.64, width, height * 0.36);
    ctx.fillStyle = palette.amber;
    ctx.fillRect(margin, height * 0.61, width * 0.18, height * 0.012);
    drawText(ctx, elements.titleInput.value, margin, height * 0.75, width * 0.78, { size: width * 0.072, maxLines: 2 });
    drawText(ctx, "向右滑动，查看完整故事", margin, height * 0.91, width * 0.72, { size: width * 0.024, serif: false, weight: 650, color: palette.teal });
  } else if (fileIndex === 1) {
    drawPaper(ctx, width, height);
    drawSource(ctx, 1, margin, margin, width - margin * 2, height * 0.5, { zoom: 1.08 });
    drawText(ctx, "01", margin, height * 0.67, width * 0.25, { size: width * 0.12, color: palette.amber, serif: false, weight: 800 });
    drawText(ctx, elements.bodyInput.value, margin + width * 0.22, height * 0.67, width * 0.64, { size: width * 0.035, color: palette.ink, serif: false, weight: 500, maxLines: 4 });
  } else if (fileIndex === 2) {
    ctx.fillStyle = palette.ink;
    ctx.fillRect(0, 0, width, height);
    drawSource(ctx, 2, margin, height * 0.12, width * 0.54, height * 0.42, { zoom: 1.1 });
    drawSource(ctx, 3, width * 0.39, height * 0.42, width * 0.54, height * 0.36, { zoom: 1.12 });
    ctx.strokeStyle = palette.teal;
    ctx.lineWidth = width * 0.008;
    ctx.beginPath();
    ctx.moveTo(width * 0.15, height * 0.84);
    ctx.lineTo(width * 0.84, height * 0.84);
    ctx.stroke();
    drawText(ctx, "画面之间，存在一条连续线索", margin, height * 0.91, width * 0.8, { size: width * 0.038, maxLines: 1 });
  } else if (fileIndex === 3) {
    drawPaper(ctx, width, height);
    drawSource(ctx, 4, 0, 0, width * 0.58, height * 0.72, { zoom: 1.14 });
    drawSource(ctx, 5, width * 0.58, 0, width * 0.42, height * 0.72, { zoom: 1.18 });
    ctx.fillStyle = palette.paper;
    ctx.fillRect(margin, height * 0.64, width - margin * 2, height * 0.25);
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, height * 0.64, width - margin * 2, height * 0.25);
    drawText(ctx, "值得停留的细节", margin * 1.5, height * 0.73, width * 0.72, { size: width * 0.052, color: palette.ink, maxLines: 1 });
    drawText(ctx, elements.metaInput.value, margin * 1.5, height * 0.82, width * 0.7, { size: width * 0.023, color: palette.ink, serif: false, weight: 500 });
  } else {
    ctx.fillStyle = palette.ink;
    ctx.fillRect(0, 0, width, height);
    const thumbW = width * 0.255;
    const thumbH = height * 0.19;
    orderedSourceIndexes().forEach((sourceIndex, index) => {
      drawSource(ctx, index, margin + (index % 3) * width * 0.295, height * (0.1 + Math.floor(index / 3) * 0.22), thumbW, thumbH, { zoom: 1.1 });
    });
    drawText(ctx, "把这组画面继续带走", margin, height * 0.66, width * 0.78, { size: width * 0.065, maxLines: 2 });
    drawText(ctx, elements.metaInput.value, margin, height * 0.82, width * 0.72, { size: width * 0.025, serif: false, weight: 500, alpha: 0.78 });
    ctx.fillStyle = palette.amber;
    ctx.fillRect(margin, height * 0.88, width * 0.42, height * 0.045);
  }
  drawFooter(ctx, width, height, products.carousel.name, fileIndex);
}

function renderWebStory(ctx, fileIndex, width, height) {
  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, width, height);
  if (fileIndex === 0) {
    drawSource(ctx, 0, 0, 0, width * 0.62, height, { zoom: 1.05, overlay: "rgba(3,10,15,.16)" });
    ctx.fillStyle = palette.amber;
    ctx.fillRect(width * 0.68, height * 0.17, width * 0.12, height * 0.012);
    drawText(ctx, elements.titleInput.value, width * 0.68, height * 0.34, width * 0.27, { size: height * 0.095, maxLines: 3 });
    drawText(ctx, elements.bodyInput.value, width * 0.68, height * 0.68, width * 0.26, { size: height * 0.03, maxLines: 4, serif: false, weight: 400, alpha: 0.82 });
  } else if (fileIndex < 4) {
    const imageLeft = fileIndex % 2 === 1;
    const imageX = imageLeft ? 0 : width * 0.48;
    const copyX = imageLeft ? width * 0.59 : width * 0.07;
    if (fileIndex === 3 && state.sources.length > 4) {
      drawSource(ctx, 3, imageX, 0, width * 0.52, height * 0.5, { zoom: 1.08, overlay: "rgba(3,10,15,.08)" });
      drawSource(ctx, 4, imageX, height * 0.5, width * 0.52, height * 0.5, { zoom: 1.12, overlay: "rgba(3,10,15,.08)" });
    } else {
      drawSource(ctx, fileIndex, imageX, 0, width * 0.52, height, { zoom: 1.08, overlay: "rgba(3,10,15,.12)" });
    }
    drawText(ctx, `0${fileIndex}`, copyX, height * 0.2, width * 0.28, { size: height * 0.08, color: palette.teal, serif: false, weight: 800 });
    drawText(ctx, products.webstory.files[fileIndex][0], copyX, height * 0.38, width * 0.32, { size: height * 0.075, maxLines: 2 });
    drawText(ctx, products.webstory.files[fileIndex][1], copyX, height * 0.65, width * 0.3, { size: height * 0.032, maxLines: 3, serif: false, weight: 400, alpha: 0.8 });
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(copyX, height * 0.75);
    ctx.lineTo(copyX + width * 0.16, height * 0.75);
    ctx.stroke();
  } else {
    drawSource(ctx, state.sources.length - 1, 0, 0, width, height, { zoom: 1.05, overlay: "rgba(3,10,15,.56)" });
    drawText(ctx, "故事在这里收束，也从这里继续", width * 0.08, height * 0.48, width * 0.62, { size: height * 0.095, maxLines: 2 });
    drawText(ctx, elements.metaInput.value, width * 0.08, height * 0.72, width * 0.5, { size: height * 0.032, serif: false, weight: 550, color: palette.teal });
  }
}

function renderExhibition(ctx, fileIndex, width, height) {
  const margin = width * 0.055;
  if (fileIndex === 3) {
    ctx.fillStyle = palette.ink;
    ctx.fillRect(0, 0, width, height);
    orderedSourceIndexes().forEach((sourceIndex, index) => {
      drawSource(ctx, index, margin + (index % 3) * width * 0.29, height * (0.1 + Math.floor(index / 3) * 0.28), width * 0.25, height * 0.23, { zoom: 1.08 });
    });
    drawText(ctx, elements.titleInput.value, margin, height * 0.78, width * 0.68, { size: width * 0.065, maxLines: 1 });
    drawText(ctx, "EXHIBITION INDEX / 01", margin, height * 0.9, width * 0.5, { size: width * 0.018, serif: false, weight: 750, color: palette.teal });
    return;
  }
  drawPaper(ctx, width, height);
  drawText(ctx, `EXHIBITION / 0${fileIndex + 1}`, margin, height * 0.07, width * 0.4, { size: width * 0.018, color: palette.ink, serif: false, weight: 800 });
  ctx.fillStyle = palette.amber;
  ctx.fillRect(width * 0.84, height * 0.045, width * 0.09, height * 0.022);
  if (fileIndex === 0) {
    drawSource(ctx, 0, margin, height * 0.12, width * 0.58, height * 0.72, { zoom: 1.05 });
    drawText(ctx, elements.titleInput.value, width * 0.69, height * 0.3, width * 0.25, { size: width * 0.052, color: palette.ink, maxLines: 3 });
    drawText(ctx, elements.bodyInput.value, width * 0.69, height * 0.58, width * 0.23, { size: width * 0.018, color: palette.ink, serif: false, weight: 450, maxLines: 5 });
  } else if (fileIndex === 1) {
    [0, 1, 2].forEach((index) => {
      const x = margin + index * width * 0.3;
      drawSource(ctx, index + 1, x, height * 0.17, width * 0.26, height * 0.5, { zoom: 1.08 });
      drawText(ctx, `EVIDENCE 0${index + 1}`, x, height * 0.74, width * 0.22, { size: width * 0.015, color: palette.ink, serif: false, weight: 750 });
    });
    drawText(ctx, "三张图片，构成一组可以核对的现场证据", margin, height * 0.88, width * 0.72, { size: width * 0.032, color: palette.ink, maxLines: 1 });
  } else {
    drawSource(ctx, 4, margin, height * 0.17, width * 0.32, height * 0.58, { zoom: 1.22 });
    drawSource(ctx, 5, width * 0.39, height * 0.17, width * 0.18, height * 0.27, { zoom: 1.35 });
    drawSource(ctx, 5, width * 0.39, height * 0.48, width * 0.18, height * 0.27, { zoom: 1.9, offsetX: 0.2 });
    const colors = [palette.ink, palette.teal, palette.amber, palette.mustard, palette.rust];
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(width * (0.54 + index * 0.075), height * 0.2, width * 0.055, height * 0.36);
    });
    drawText(ctx, "材料、颜色与局部证据", width * 0.54, height * 0.7, width * 0.36, { size: width * 0.035, color: palette.ink, maxLines: 2 });
    drawText(ctx, elements.metaInput.value, width * 0.54, height * 0.86, width * 0.34, { size: width * 0.016, color: palette.ink, serif: false, weight: 500 });
  }
}

function renderHero(ctx, fileIndex, width, height) {
  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, width, height);
  drawSource(ctx, 0, 0, 0, width, height, { zoom: 1.13, overlay: "rgba(3, 9, 13, .18)" });
  const gradient = ctx.createLinearGradient(0, height * 0.46, 0, height);
  gradient.addColorStop(0, "rgba(3, 9, 13, 0)");
  gradient.addColorStop(0.72, "rgba(3, 9, 13, .78)");
  gradient.addColorStop(1, "rgba(3, 9, 13, .96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height * 0.4, width, height * 0.6);
  ctx.strokeStyle = palette.paper;
  ctx.globalAlpha = 0.64;
  ctx.lineWidth = Math.max(3, width * 0.004);
  ctx.strokeRect(width * 0.055, height * 0.045, width * 0.89, height * 0.91);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.amber;
  ctx.fillRect(width * 0.07, height * 0.68, width * 0.22, height * 0.012);
  drawText(ctx, elements.titleInput.value, width * 0.07, height * 0.78, width * 0.66, {
    size: width * 0.078,
    color: palette.paper,
    maxLines: 2,
  });
  drawText(ctx, elements.metaInput.value, width * 0.07, height * 0.92, width * 0.72, {
    size: width * 0.022,
    color: palette.paperDeep,
    serif: false,
    weight: 650,
    maxLines: 1,
  });
}

function renderLookbook(ctx, fileIndex, width, height) {
  drawPaper(ctx, width, height);
  const margin = width * 0.055;
  const gap = width * 0.018;
  drawText(ctx, `VISUAL ATLAS / 0${fileIndex + 1}`, margin, height * 0.07, width * 0.42, {
    size: width * 0.017,
    color: palette.ink,
    serif: false,
    weight: 800,
  });
  ctx.fillStyle = palette.teal;
  ctx.fillRect(width * 0.82, height * 0.045, width * 0.11, height * 0.018);

  if (fileIndex === 0) {
    drawSource(ctx, 0, margin, height * 0.12, width * 0.58, height * 0.74, { zoom: 1.08 });
    [1, 2, 3].forEach((sourceIndex, index) => {
      drawSource(ctx, sourceIndex, width * 0.68, height * (0.12 + index * 0.205), width * 0.25, height * 0.18, { zoom: 1.12 });
    });
    drawText(ctx, elements.titleInput.value, width * 0.68, height * 0.82, width * 0.25, {
      size: width * 0.04,
      color: palette.ink,
      maxLines: 2,
    });
  } else if (fileIndex === 1) {
    const cellW = (width - margin * 2 - gap * 2) / 3;
    const cellH = height * 0.32;
    state.sources.slice(0, 6).forEach((source, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + column * (cellW + gap);
      const y = height * 0.14 + row * (cellH + height * 0.08);
      drawSource(ctx, index, x, y, cellW, cellH, { zoom: 1.05 });
      drawText(ctx, `INDEX ${String(index + 1).padStart(2, "0")}`, x, y + cellH + height * 0.035, cellW, {
        size: width * 0.014,
        color: palette.ink,
        serif: false,
        weight: 750,
      });
    });
  } else {
    const sourcePosition = fileIndex - 2;
    const source = state.sources[(state.primarySource + sourcePosition) % state.sources.length];
    drawSource(ctx, sourcePosition, margin, height * 0.14, width * 0.55, height * 0.7, { zoom: 1.04 });
    drawSource(ctx, sourcePosition, width * 0.65, height * 0.14, width * 0.28, height * 0.28, { zoom: 2.3, offsetX: 0.25, offsetY: -0.12 });
    ctx.strokeStyle = palette.rust;
    ctx.lineWidth = Math.max(3, width * 0.004);
    ctx.strokeRect(width * 0.65, height * 0.14, width * 0.28, height * 0.28);
    drawText(ctx, `局部证据 / DETAIL ${String(sourcePosition + 1).padStart(2, "0")}`, width * 0.65, height * 0.5, width * 0.28, {
      size: width * 0.026,
      color: palette.ink,
      maxLines: 2,
    });
    drawText(ctx, source?.name ?? elements.bodyInput.value, width * 0.65, height * 0.61, width * 0.26, {
      size: width * 0.016,
      color: palette.ink,
      serif: false,
      weight: 450,
      maxLines: 3,
    });
    const colors = [palette.ink, palette.teal, palette.amber, palette.rust, palette.mustard, palette.paperDeep];
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(width * (0.65 + index * 0.047), height * 0.72, width * 0.035, height * 0.1);
    });
    drawText(ctx, `来源 ${String(sourcePosition + 1).padStart(2, "0")} / ${String(state.sources.length).padStart(2, "0")}`, width * 0.65, height * 0.9, width * 0.28, {
      size: width * 0.018,
      color: palette.ink,
      serif: false,
      weight: 750,
      maxLines: 1,
    });
  }
}

function defaultRouteForProduct(productId) {
  if (productId === "hero") return "reconstruct";
  if (productId === "series") return "scene";
  if (productId === "lookbook") return "evidence";
  if (productId === "story") return "sequence";
  if (productId === "campaign") return "material";
  if (productId === "postcards") return "postcard";
  if (productId === "archive") return "memory";
  if (productId === "carousel") return "material";
  if (productId === "webstory") return "poetic";
  if (productId === "exhibition") return "fingerprint";
  return "poetic";
}

function recommendedRouteForProduct(productId) {
  const sample = state.sampleId ? sampleCatalog[state.sampleId] : null;
  return sample?.routeMap?.[productId] ?? defaultRouteForProduct(productId);
}

function routeForProduct(productId) {
  const allowed = directionIdsForMode();
  if (productId === state.productId && allowed.includes(state.routeId)) return state.routeId;
  return recommendedRouteForMode(productId);
}

function generatedImageElement() {
  return selectedGeneratedResult()?.element ?? null;
}

function visualBaseImage(routeId, productId) {
  return generatedImageElement() ?? routeEffectImage(routeId, productId);
}

function drawEffectArtwork(ctx, image, width, height, route, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = route.surface;
  ctx.fillRect(0, 0, width, height);
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  const nearMatch = Math.abs(imageRatio - canvasRatio) < 0.3;
  let drawWidth;
  let drawHeight;
  if (nearMatch) {
    if (imageRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
    }
  } else if (imageRatio > canvasRatio) {
    drawWidth = width;
    drawHeight = width / imageRatio;
  } else {
    drawHeight = height;
    drawWidth = height * imageRatio;
  }
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function routeEffectImage(routeId, productId = state.productId) {
  return state.effectImages[`route:${routeId}`]
    ?? (routeId === recommendedRouteForProduct(productId) ? state.effectImages[productId] : null);
}

function applyVisualRouteOverlay(ctx, width, height, routeId, sourceIndex = 0) {
  const route = visualRoutes[routeId];
  if (!route) return;
  const strength = effectStrengths[state.effectStrength] ?? effectStrengths.balanced;
  ctx.save();
  ctx.globalAlpha = strength.overlayAlpha;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.004) * strength.lineScale;

  if (routeId === "scene" || routeId === "natural") {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(103, 167, 161, .18)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(4, 12, 18, .02)");
    gradient.addColorStop(1, "rgba(4, 12, 18, .34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = route.accent;
    const mark = Math.min(width, height) * 0.055;
    const inset = Math.min(width, height) * 0.045;
    [[inset, inset, 1, 1], [width - inset, inset, -1, 1], [inset, height - inset, 1, -1], [width - inset, height - inset, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + mark * sy);
      ctx.lineTo(x, y);
      ctx.lineTo(x + mark * sx, y);
      ctx.stroke();
    });
  } else if (routeId === "distill" || routeId === "reconstruct") {
    const focusX = width * 0.5;
    const focusY = height * 0.46;
    const focusW = width * 0.58;
    const focusH = height * 0.52;
    ctx.fillStyle = routeId === "reconstruct" ? "rgba(3, 9, 13, .52)" : "rgba(3, 9, 13, .34)";
    ctx.fillRect(0, 0, width, focusY - focusH * 0.5);
    ctx.fillRect(0, focusY + focusH * 0.5, width, height);
    ctx.fillRect(0, focusY - focusH * 0.5, focusX - focusW * 0.5, focusH);
    ctx.fillRect(focusX + focusW * 0.5, focusY - focusH * 0.5, width, focusH);
    ctx.strokeStyle = route.accent;
    ctx.lineWidth *= 1.35;
    ctx.beginPath();
    ctx.ellipse(focusX, focusY, focusW * 0.5, focusH * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * strength.overlayAlpha;
    [0.08, 0.13, 0.18].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(width * 0.84, height * 0.15, width * radius, Math.PI * 0.2, Math.PI * 1.55);
      ctx.stroke();
    });
    if (routeId === "reconstruct") {
      ctx.globalAlpha = 0.55 * strength.overlayAlpha;
      ctx.fillStyle = route.accent;
      ctx.beginPath();
      ctx.moveTo(width * 0.03, height * 0.96);
      ctx.lineTo(width * 0.34, height * 0.62);
      ctx.lineTo(width * 0.64, height * 0.88);
      ctx.lineTo(width * 0.97, height * 0.48);
      ctx.lineTo(width * 0.97, height);
      ctx.closePath();
      ctx.fill();
    }
  } else if (routeId === "evidence") {
    const boxW = width * 0.3;
    const boxH = height * 0.26;
    const boxX = width * 0.64;
    const boxY = height * 0.08;
    ctx.fillStyle = "rgba(7, 18, 26, .9)";
    ctx.fillRect(boxX - width * 0.012, boxY - height * 0.012, boxW + width * 0.024, boxH + height * 0.024);
    drawSource(ctx, sourceIndex % state.sources.length, boxX, boxY, boxW, boxH, {
      zoom: 2.25,
      offsetX: 0.24,
      offsetY: -0.12,
      absolute: state.processingMode === "batch",
    });
    ctx.strokeStyle = route.accent;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.beginPath();
    ctx.moveTo(width * 0.46, height * 0.55);
    ctx.lineTo(boxX, boxY + boxH * 0.72);
    ctx.stroke();
    ctx.fillStyle = route.accent;
    ctx.fillRect(width * 0.06, height * 0.87, width * 0.22, height * 0.035);
    drawText(ctx, `EVIDENCE ${String(sourceIndex + 1).padStart(2, "0")}`, width * 0.07, height * 0.895, width * 0.2, {
      size: Math.max(8, width * 0.014),
      color: palette.ink,
      serif: false,
      weight: 800,
      maxLines: 1,
    });
  } else if (routeId === "memory" || routeId === "revival") {
    ctx.fillStyle = "rgba(227, 207, 168, .12)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(75, 56, 35, .42)";
    const inset = Math.min(width, height) * 0.035;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.88);
    ctx.bezierCurveTo(width * 0.27, height * 0.8, width * 0.5, height * 0.94, width * 0.82, height * 0.84);
    ctx.stroke();
    if (routeId === "revival") {
      ctx.globalAlpha = 0.5 * strength.overlayAlpha;
      ctx.strokeStyle = route.accent;
      [0.14, 0.48, 0.78].forEach((x, index) => {
        ctx.beginPath();
        ctx.arc(width * x, height * (0.22 + index * 0.24), width * (0.09 + index * 0.025), 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  } else if (routeId === "material") {
    ctx.globalAlpha = 0.2 * strength.overlayAlpha;
    ctx.fillStyle = route.accent;
    const step = Math.max(18, Math.min(width, height) * 0.035);
    for (let y = step; y < height; y += step) {
      for (let x = step; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, step * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.9 * strength.overlayAlpha;
    ctx.fillRect(width * 0.72, 0, width * 0.08, height * 0.22);
  } else if (routeId === "poetic" || routeId === "merge" || routeId === "sequence") {
    ctx.strokeStyle = route.accent;
    ctx.globalAlpha = 0.84 * strength.overlayAlpha;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.78);
    ctx.bezierCurveTo(width * 0.28, height * 0.46, width * 0.58, height * 0.7, width * 0.91, height * 0.2);
    ctx.stroke();
    [0.18, 0.48, 0.78].forEach((x, index) => {
      ctx.strokeRect(width * x, height * (0.68 - index * 0.18), width * 0.045, width * 0.045);
    });
    if ((routeId === "merge" || routeId === "sequence") && state.sources.length > 1) {
      ctx.globalAlpha = 0.78 * strength.overlayAlpha;
      const tileW = width * 0.2;
      const tileH = height * 0.18;
      [1, 2].forEach((sourceIndex, index) => {
        const x = width * (0.08 + index * 0.64);
        const y = height * (0.14 + index * 0.46);
        ctx.fillStyle = "rgba(4, 12, 18, .72)";
        ctx.fillRect(x - width * 0.008, y - height * 0.008, tileW + width * 0.016, tileH + height * 0.016);
        drawSource(ctx, sourceIndex, x, y, tileW, tileH, { zoom: routeId === "sequence" ? 1.25 : 1.75 });
        ctx.strokeStyle = route.accent;
        ctx.strokeRect(x, y, tileW, tileH);
      });
    }
  } else if (routeId === "postcard") {
    ctx.strokeStyle = "rgba(45, 37, 28, .55)";
    ctx.setLineDash([Math.max(6, width * 0.01), Math.max(4, width * 0.007)]);
    const inset = Math.min(width, height) * 0.045;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.setLineDash([]);
    ctx.fillStyle = route.accent;
    ctx.fillRect(width * 0.84, height * 0.08, width * 0.08, width * 0.08);
  } else if (routeId === "fingerprint" || routeId === "deconstruct") {
    ctx.strokeStyle = route.accent;
    ctx.globalAlpha = 0.68 * strength.overlayAlpha;
    const cx = width * 0.82;
    const cy = height * 0.2;
    [0.04, 0.075, 0.11].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(cx, cy, width * radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(width * 0.06, height * 0.9);
    ctx.lineTo(width * 0.94, height * 0.9);
    ctx.stroke();
    if (routeId === "deconstruct") {
      ctx.globalAlpha = 0.72 * strength.overlayAlpha;
      [[0.08, 0.14, 0.28, 0.16], [0.56, 0.38, 0.36, 0.12], [0.16, 0.66, 0.44, 0.14]].forEach(([x, y, w, h], index) => {
        ctx.fillStyle = index === 1 ? "rgba(220, 119, 89, .35)" : "rgba(7, 18, 26, .66)";
        ctx.fillRect(width * x, height * y, width * w, height * h);
        ctx.strokeRect(width * x, height * y, width * w, height * h);
      });
    }
  }
  if (strength.accentWash) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = strength.accentWash;
    ctx.fillStyle = route.accent;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawFinalCopy(ctx, width, height, routeId) {
  const route = visualRoutes[routeId];
  const darkSurface = ["material", "poetic", "fingerprint", "natural", "scene", "distill", "reconstruct", "deconstruct", "merge", "sequence", "evidence"].includes(routeId);
  const x = width * 0.065;
  const y = height * 0.11;
  const copyWidth = width * 0.48;

  if (darkSurface) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 12, 18, .76)";
    ctx.fillRect(x - width * 0.025, y - height * 0.065, copyWidth + width * 0.06, height * 0.16);
    ctx.restore();
  }
  drawText(ctx, elements.titleInput.value, x, y, copyWidth, {
    size: width * 0.064,
    color: darkSurface ? palette.paper : palette.ink,
    maxLines: 2,
  });
  ctx.fillStyle = route.accent;
  ctx.fillRect(x, y + height * 0.055, width * 0.16, Math.max(6, height * 0.006));
}

function directionIdsForMode() {
  return modeCatalog[state.processingMode]?.directions ?? [];
}

function orderedDirectionIds() {
  const allowed = directionIdsForMode();
  const preferred = state.sampleId ? sampleDirectionProfiles[state.sampleId]?.[state.processingMode] ?? [] : [];
  const productRoute = state.productId ? recommendedRouteForMode(state.productId) : null;
  const manualRoute = state.routeManual && allowed.includes(state.routeId) ? state.routeId : null;
  return [
    ...(manualRoute ? [manualRoute] : []),
    ...(productRoute && allowed.includes(productRoute) && productRoute !== manualRoute ? [productRoute] : []),
    ...preferred.filter((routeId) => allowed.includes(routeId) && routeId !== manualRoute && routeId !== productRoute),
    ...allowed.filter((routeId) => routeId !== manualRoute && routeId !== productRoute && !preferred.includes(routeId)),
  ];
}

function productNameForMode(productId) {
  return modeProductNames[state.processingMode]?.[productId] ?? products[productId]?.name ?? "产品";
}

function recommendedRouteForMode(productId) {
  const allowed = directionIdsForMode();
  const recommended = recommendedRouteForProduct(productId);
  return allowed.includes(recommended) ? recommended : allowed[0] ?? recommended;
}

function productFiles(productId = state.productId) {
  const product = products[productId];
  if (!product) return [];
  if (state.processingMode === "single") {
    const [name, description, width, height] = product.files[0];
    return [[name, `${description} · 单一成品`, width, height]];
  }
  if (state.processingMode === "batch") {
    const [, , width, height] = product.files[0];
    return state.sources.map((source, index) => [
      `${productNameForMode(productId)} ${String(index + 1).padStart(2, "0")}`,
      `独立处理：${source.name}`,
      width,
      height,
    ]);
  }
  if (productId === "story") {
    const sourcePages = orderedSourceIndexes().map((sourceIndex, index) => [
      index === state.sources.length - 1
        ? `故事页 ${String(index + 1).padStart(2, "0")} · 收束`
        : `故事页 ${String(index + 1).padStart(2, "0")}`,
      `${index === 0 ? "证据开场" : index === state.sources.length - 1 ? "最后画面与结束语" : "连续叙事"} · 原图 ${String(sourceIndex + 1).padStart(2, "0")}`,
      1200,
      1500,
    ]);
    return [["故事封面", "主题、主图与阅读入口", 1200, 1500], ...sourcePages];
  }
  if (productId === "lookbook") {
    const detailPages = orderedSourceIndexes().map((sourceIndex, index) => [
      `图鉴条目 ${String(index + 1).padStart(2, "0")}`,
      `原图、局部证据与来源说明 · ${state.sources[sourceIndex].name}`,
      1600,
      1200,
    ]);
    return [
      ["图鉴封面", "主题、代表图与系列入口", 1600, 1200],
      ["总览索引", "全部图片与编号关系", 1600, 1200],
      ...detailPages,
    ];
  }
  return product.files;
}

function orderedSourceIndexes() {
  return state.sources.map((source, offset) => (state.primarySource + offset) % state.sources.length);
}

function sourceIndexesForFile(productId, fileIndex) {
  if (!state.sources.length) return [];
  const ordered = orderedSourceIndexes();
  if (state.processingMode === "single") return [ordered[0]];
  if (state.processingMode === "batch") return [Math.min(fileIndex, state.sources.length - 1)];
  const all = [...ordered];
  const positions = (...values) => values.map((position) => ordered[position]).filter((value) => value !== undefined);

  if (productId === "archive") {
    if (fileIndex === 0) return positions(0);
    if (fileIndex === 1) return positions(1, 2);
    if (fileIndex === 2) return ordered.slice(3);
    return all;
  }
  if (productId === "lookbook") {
    if (fileIndex === 0) return ordered.slice(0, Math.min(4, ordered.length));
    if (fileIndex === 1) return all;
    return positions(fileIndex - 2);
  }
  if (productId === "story") {
    if (fileIndex === 0) return positions(0);
    return positions(fileIndex - 1);
  }
  if (productId === "carousel") {
    if (fileIndex === 0) return positions(0);
    if (fileIndex === 1) return positions(1);
    if (fileIndex === 2) return positions(2, 3);
    if (fileIndex === 3) return ordered.slice(4);
    return all;
  }
  if (productId === "webstory") {
    if (fileIndex === 0) return positions(0);
    if (fileIndex === 1) return positions(1);
    if (fileIndex === 2) return positions(2);
    if (fileIndex === 3) return positions(3, 4);
    return positions(ordered.length - 1);
  }
  if (productId === "exhibition") {
    if (fileIndex === 0) return positions(0);
    if (fileIndex === 1) return positions(1, 2, 3);
    if (fileIndex === 2) return ordered.slice(4);
    return all;
  }
  return fileIndex === productFiles(productId).length - 1 ? all : positions(fileIndex);
}

function coveredSourceIndexes(productId = state.productId) {
  const covered = new Set();
  productFiles(productId).forEach((file, index) => {
    sourceIndexesForFile(productId, index).forEach((sourceIndex) => covered.add(sourceIndex));
  });
  return [...covered].sort((a, b) => a - b);
}

function fileCoverageLabel(productId, fileIndex) {
  const indexes = sourceIndexesForFile(productId, fileIndex);
  if (!indexes.length) return "结构页 · 不单独占用原图";
  if (indexes.length === state.sources.length) return `使用全部 ${state.sources.length} 张原图`;
  return `使用原图 ${indexes.map((index) => String(index + 1).padStart(2, "0")).join("、")}`;
}

function productDeliverable(productId) {
  const files = productFiles(productId);
  if (state.processingMode === "single") return `${files[0]?.[0] ?? "单图成品"} · 1 个文件`;
  if (state.processingMode === "batch") return `${state.sources.length} 张独立成品 · 同一产品规格`;
  if (productId === "story") return `1 张封面 + ${state.sources.length} 张故事页`;
  if (productId === "lookbook") return `封面 + 总览 + ${state.sources.length} 张图鉴条目`;
  return products[productId].deliverable;
}

function renderBatchAdaptation(ctx, productId, fileIndex, width, height) {
  const margin = width * 0.055;
  const sourceName = state.sources[fileIndex]?.name ?? `图片 ${fileIndex + 1}`;
  const product = products[productId];
  const route = visualRoutes[routeForProduct(productId)];
  const wide = width / height > 1.25;
  const cardLike = productId === "postcards" || productId === "archive" || productId === "exhibition";

  if (productId === "series") {
    drawPaper(ctx, width, height);
    const frame = width * 0.07;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(3, width * 0.004);
    ctx.strokeRect(frame, frame, width - frame * 2, height - frame * 2);
    drawSource(ctx, fileIndex, frame * 1.35, frame * 1.35, width - frame * 2.7, height * 0.66, {
      zoom: 1.04,
      absolute: true,
    });
    ctx.fillStyle = route.accent;
    ctx.fillRect(frame * 1.35, height * 0.765, width * 0.18, height * 0.012);
    drawText(ctx, elements.titleInput.value, frame * 1.35, height * 0.84, width * 0.56, {
      size: width * 0.05,
      color: palette.ink,
      maxLines: 1,
    });
    drawText(ctx, `SERIES ${String(fileIndex + 1).padStart(2, "0")} / ${String(state.sources.length).padStart(2, "0")} · ${sourceName}`, frame * 1.35, height * 0.915, width * 0.76, {
      size: width * 0.017,
      color: palette.ink,
      serif: false,
      weight: 700,
      maxLines: 1,
    });
    return;
  }

  if (cardLike) {
    drawPaper(ctx, width, height);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(margin, margin, width - margin * 2, height - margin * 2);
    drawSource(ctx, fileIndex, margin * 1.35, margin * 1.35, width - margin * 2.7, height * 0.58, { zoom: 1.07, absolute: true });
    ctx.fillStyle = route.accent;
    ctx.fillRect(margin * 1.35, height * 0.69, width * 0.17, Math.max(5, height * 0.008));
    drawText(ctx, elements.titleInput.value, margin * 1.35, height * 0.79, width * 0.58, {
      size: width * 0.055,
      color: palette.paper,
      maxLines: 2,
    });
    drawText(ctx, `${String(fileIndex + 1).padStart(2, "0")} / ${String(state.sources.length).padStart(2, "0")} · ${sourceName}`, margin * 1.35, height * 0.92, width * 0.72, {
      size: width * 0.018,
      color: palette.paperDeep,
      serif: false,
      weight: 650,
      maxLines: 1,
    });
    return;
  }

  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, width, height);
  if (wide) {
    drawSource(ctx, fileIndex, 0, 0, width * 0.68, height, { zoom: 1.08, overlay: "rgba(3, 10, 15, .14)", absolute: true });
    ctx.fillStyle = route.accent;
    ctx.fillRect(width * 0.68, 0, width * 0.012, height);
    drawText(ctx, elements.titleInput.value, width * 0.73, height * 0.33, width * 0.22, {
      size: width * 0.048,
      color: palette.paper,
      maxLines: 3,
    });
    drawText(ctx, `${productNameForMode(productId)} · 独立图 ${String(fileIndex + 1).padStart(2, "0")}`, width * 0.73, height * 0.76, width * 0.22, {
      size: width * 0.016,
      color: palette.paperMuted ?? palette.paperDeep,
      serif: false,
      weight: 650,
      maxLines: 2,
    });
  } else {
    drawSource(ctx, fileIndex, 0, 0, width, height, { zoom: 1.08, overlay: "rgba(3, 10, 15, .28)", absolute: true });
    ctx.fillStyle = "rgba(4, 12, 18, .82)";
    ctx.fillRect(0, height * 0.68, width, height * 0.32);
    ctx.fillStyle = route.accent;
    ctx.fillRect(margin, height * 0.68, width * 0.2, Math.max(6, height * 0.008));
    drawText(ctx, elements.titleInput.value, margin, height * 0.79, width * 0.64, {
      size: width * 0.07,
      color: palette.paper,
      maxLines: 2,
    });
    drawText(ctx, `${productNameForMode(productId)} · 独立图 ${String(fileIndex + 1).padStart(2, "0")}`, margin, height * 0.94, width * 0.78, {
      size: width * 0.021,
      color: palette.paperDeep,
      serif: false,
      weight: 650,
      maxLines: 1,
    });
  }
}

function sourceForPreview(fileIndex) {
  if (!state.sources.length) return null;
  const index = sourceIndexesForFile(state.productId, fileIndex)[0] ?? state.primarySource;
  return { source: state.sources[index], index };
}

function renderSourceReference(ctx, width, height, fileIndex) {
  const resolved = sourceForPreview(fileIndex);
  if (!resolved) return;
  const margin = Math.min(width, height) * 0.055;
  const labelHeight = Math.max(56, height * 0.075);
  ctx.fillStyle = "#071117";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0c1920";
  ctx.fillRect(margin, margin, width - margin * 2, height - margin * 2);
  drawSourceContain(ctx, resolved.source, margin, margin + labelHeight, width - margin * 2, height - margin * 2 - labelHeight);
  ctx.fillStyle = "rgba(3, 9, 13, .88)";
  ctx.fillRect(margin, margin, width - margin * 2, labelHeight);
  drawText(ctx, "ORIGINAL SOURCE", margin * 1.35, margin + labelHeight * 0.58, width * 0.46, {
    size: Math.max(12, Math.min(width, height) * 0.018),
    color: palette.teal,
    serif: false,
    weight: 800,
    maxLines: 1,
  });
  drawText(ctx, `${String(resolved.index + 1).padStart(2, "0")} · ${resolved.source.name}`, width - margin * 1.35, margin + labelHeight * 0.58, width * 0.43, {
    size: Math.max(11, Math.min(width, height) * 0.014),
    color: palette.paper,
    serif: false,
    weight: 650,
    align: "right",
    maxLines: 1,
  });
  ctx.strokeStyle = "rgba(103, 167, 161, .55)";
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.0025);
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
}

function renderProduct(canvas = elements.canvas, productId = state.productId, fileIndex = state.fileIndex, renderSize = null) {
  if (!productId || !state.sources.length) return;
  const product = products[productId];
  const files = productFiles(productId);
  const file = files[Math.min(fileIndex, files.length - 1)];
  canvas.width = renderSize?.width ?? file[2];
  canvas.height = renderSize?.height ?? file[3];
  canvas.style.aspectRatio = `${file[2]} / ${file[3]}`;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (canvas === elements.canvas && state.previewLayer === "source") {
    renderSourceReference(ctx, canvas.width, canvas.height, fileIndex);
    return;
  }

  if (state.processingMode === "batch") renderBatchAdaptation(ctx, productId, fileIndex, canvas.width, canvas.height);
  else if (productId === "hero") renderHero(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "lookbook") renderLookbook(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "story") renderStory(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "campaign") renderCampaign(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "postcards") renderPostcard(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "editorial") renderEditorial(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "archive") renderArchive(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "carousel") renderCarousel(ctx, fileIndex, canvas.width, canvas.height);
  else if (productId === "webstory") renderWebStory(ctx, fileIndex, canvas.width, canvas.height);
  else renderExhibition(ctx, fileIndex, canvas.width, canvas.height);

  const routeId = routeForProduct(productId);
  const route = visualRoutes[routeId];
  const strength = effectStrengths[state.effectStrength] ?? effectStrengths.balanced;
  const effectImage = state.processingMode !== "batch" ? visualBaseImage(routeId, productId) : generatedImageElement();
  if (fileIndex === 0 && effectImage) {
    drawEffectArtwork(ctx, effectImage, canvas.width, canvas.height, route, strength.effectBlend);
    drawFinalCopy(ctx, canvas.width, canvas.height, routeId);
  }
  applyVisualRouteOverlay(ctx, canvas.width, canvas.height, routeId, fileIndex);
}

function drawRecommendationPreview(canvas, productId) {
  const [, , sourceWidth, sourceHeight] = products[productId].files[0];
  const width = sourceWidth >= sourceHeight ? 168 : 112;
  const height = Math.round(width * (sourceHeight / sourceWidth));
  renderProduct(canvas, productId, 0, { width, height });
}

function activeRecommendationProfile() {
  return state.sampleId ? sampleRecommendationProfiles[state.sampleId] ?? null : null;
}

function recommendationIds(count) {
  const allowed = [...(modeCatalog[state.processingMode]?.products ?? [])];
  const preferred = activeRecommendationProfile()?.orders?.[state.processingMode] ?? [];
  return [
    ...preferred.filter((productId) => allowed.includes(productId)),
    ...allowed.filter((productId) => !preferred.includes(productId)),
  ];
}

function currentRecommendationSignals() {
  const profile = activeRecommendationProfile();
  if (profile) return profile.signals;
  if (!state.sources.length) return [];
  if (state.sourceKind === "upload") {
    return [
      `${state.sources.length} 张本地图片`,
      processingModes[state.processingMode].name,
      "未进行在线视觉理解",
    ];
  }
  return [`${state.sources.length} 张图片`, processingModes[state.processingMode].name];
}

function recommendationCardReason(productId) {
  const profile = activeRecommendationProfile();
  if (profile) {
    const [primarySignal, relationSignal, visualSignal] = profile.signals;
    const reasons = {
      hero: `${primarySignal}可以集中成一个明确主体，适合强化第一眼识别。`,
      series: `多张图片共享${visualSignal}，适合统一裁切、编号和批次规格。`,
      story: `${primarySignal}与${relationSignal}可以形成有开场和收束的阅读顺序。`,
      carousel: `${relationSignal}适合拆成连续滑读的内容卡，并保留单页传播能力。`,
      webstory: `${primarySignal}和${relationSignal}可以展开为电脑网页的章节画面。`,
      exhibition: `${primarySignal}需要与${relationSignal}并置，适合大幅信息分区。`,
      lookbook: `${primarySignal}包含可比较的${visualSignal}，适合总览加逐图条目。`,
      archive: `${primarySignal}与${visualSignal}需要编号、材料和来源关系，适合档案结构。`,
      editorial: `${primarySignal}和${visualSignal}能形成清楚的标题层级与编辑焦点。`,
      campaign: `${primarySignal}具有传播焦点，适合延展到海报、社交和网页比例。`,
      postcards: `${visualSignal}适合变成可单张使用、又保持共同识别的收藏系列。`,
    };
    return reasons[productId] ?? `${profile.signals.join("、")}与${productNameForMode(productId)}的结构匹配。`;
  }
  if (state.sourceKind === "upload") {
    if (state.processingMode === "single") return "当前只按单一主图和产品规格推荐，尚未读取画面内容。";
    if (state.processingMode === "batch") return `${state.sources.length} 张图片可逐张进入同一规格；尚未读取画面内容。`;
    return `${state.sources.length} 张图片可进入${productNameForMode(productId)}的多页结构；尚未读取画面内容。`;
  }
  return recommendationReason(productId, state.sources.length);
}

function renderRecommendationSignals() {
  const signals = currentRecommendationSignals();
  elements.recommendationSignals.innerHTML = signals.map((signal) => `
    <span class="${signal.includes("未进行在线") ? "recommendation-boundary" : ""}">${signal}</span>
  `).join("");
}

function recommendationReason(productId, count) {
  if (state.processingMode === "batch") return `${count} 张图片会分别进入同一种${productNameForMode(productId)}规格，彼此不混合。`;
  if (state.processingMode === "single") return `只使用当前主图完成一个${productNameForMode(productId)}，不会自动拆成套图。`;
  if (productId === "lookbook") return `${count} 张图片可同时形成总览索引、重点细节和视觉谱系。`;
  if (productId === "story") return `${count} 张图片能够形成开场、展开与收束。`;
  if (productId === "postcards") return `${Math.min(count, 3)} 张图片可分别承担一张卡片，并保持系列识别。`;
  if (productId === "campaign") return count === 1 ? "核心画面明确，适合扩展到多个发布比例。" : "多张图片可分配给海报、社交与网页场景。";
  if (productId === "editorial") return "主图焦点适合形成标题层级与编辑封面。";
  if (productId === "archive") return "原图证据、颜色和细节适合整理为收藏档案。";
  if (productId === "carousel") return `${Math.min(count, 5)} 张图片适合拆成可连续滑动的内容节奏。`;
  if (productId === "webstory") return "横向重构可以把主图、章节与收束组织成电脑网页故事。";
  return "图片、说明与证据关系适合整理为可展示的大幅信息板。";
}

function productFitLabel(productId) {
  if (productId === "hero") return "适合强化主体";
  if (productId === "series") return "适合统一批次";
  if (productId === "lookbook") return "适合系统浏览";
  if (productId === "story") return "适合连续叙事";
  if (productId === "postcards") return "适合系列收藏";
  if (productId === "campaign") return "适合多规格发布";
  if (productId === "editorial") return "适合标题表达";
  if (productId === "archive") return "适合资料保存";
  if (productId === "carousel") return "适合连续滑读";
  if (productId === "webstory") return "适合网页叙事";
  return "适合现场展示";
}

function updateRecommendations({ selectFirst = false } = {}) {
  state.recommendations = recommendationIds(state.sources.length);
  if (selectFirst || !state.recommendations.includes(state.productId)) {
    state.productId = state.recommendations[0] ?? null;
    state.routeId = state.productId ? recommendedRouteForMode(state.productId) : "memory";
    state.routeManual = false;
    state.routeSelectionSource = "recommended";
    state.fileIndex = 0;
    state.generated = false;
    state.previewLayer = "reference";
    state.productSelectionSource = "recommended";
  }
  renderRecommendations();
  applyProduct();
}

function selectProduct(productId, { promote = false, closeDialog = false } = {}) {
  if (productId === state.productId) {
    if (closeDialog && elements.productCatalogDialog.open) elements.productCatalogDialog.close();
    return;
  }
  if (promote) state.recommendations = [productId, ...state.recommendations.filter((id) => id !== productId)];
  state.productId = productId;
  if (!state.routeManual || !directionIdsForMode().includes(state.routeId)) {
    state.routeId = recommendedRouteForMode(productId);
    state.routeSelectionSource = "recommended";
  }
  state.fileIndex = 0;
  state.previewLayer = selectedGeneratedResult() ? "product" : "reference";
  state.productSelectionSource = "manual";
  renderRecommendations();
  applyProduct();
  if (closeDialog && elements.productCatalogDialog.open) elements.productCatalogDialog.close();
}

function createProductCard(productId, index, { catalog = false } = {}) {
  const product = products[productId];
  const route = visualRoutes[recommendedRouteForMode(productId)];
  const button = document.createElement("button");
  button.className = catalog ? "recommendation-card catalog-product-card" : "recommendation-card";
  button.type = "button";
  button.dataset.product = productId;
  button.setAttribute("aria-pressed", String(productId === state.productId));
  const selected = productId === state.productId;
  const rankLabel = selected && state.productSelectionSource === "manual"
    ? "已选 · 人工选择"
    : `${selected ? "已选 · " : ""}${catalog ? "可加入首选" : index === 0 ? "当前首选" : index === 1 ? "第二推荐" : "第三推荐"}`;
  const reason = recommendationCardReason(productId);
  button.setAttribute("aria-label", `${rankLabel}：${productNameForMode(productId)}。推荐依据：${reason}`);
  button.innerHTML = `
    <span class="recommendation-rank">${rankLabel}</span>
    <span class="recommendation-visual" aria-hidden="true"></span>
    <span class="recommendation-copy">
      <strong>${productNameForMode(productId)}</strong>
      <span>${productDeliverable(productId)}</span>
      <em style="--route-accent:${route.accent}">${productFitLabel(productId)}</em>
      <small class="recommendation-why"><b>推荐依据</b>${reason}</small>
    </span>
    <span class="recommendation-count">${productFiles(productId).length} 项</span>
  `;
  const preview = document.createElement("canvas");
  drawRecommendationPreview(preview, productId);
  button.querySelector(".recommendation-visual").append(preview);
  button.addEventListener("click", () => selectProduct(productId, { promote: catalog, closeDialog: catalog }));
  return button;
}

function renderRecommendations() {
  elements.recommendationList.innerHTML = "";
  if (!state.sources.length) {
    elements.recommendationNote.textContent = "导入图片后，这里会出现三个首选产品。";
    elements.productCount.textContent = "等待图片";
    elements.moreProductsCount.textContent = "按处理单位筛选";
    elements.moreProductsButton.disabled = true;
    elements.recommendationSignals.innerHTML = "";
    return;
  }
  const catalog = modeCatalog[state.processingMode];
  const sample = state.sampleId ? sampleCatalog[state.sampleId] : null;
  elements.recommendationNote.textContent = sample
    ? `根据“${sample.label}”的样例信号与“${processingModes[state.processingMode].name}”排序；仍可查看全部适用产品。`
    : state.sourceKind === "upload"
      ? `当前只根据图片数量与“${processingModes[state.processingMode].name}”推荐结构，尚未进行在线视觉理解。`
      : catalog.productNote;
  renderRecommendationSignals();
  elements.productCount.textContent = `3 / ${catalog.products.length} 个适用`;
  elements.moreProductsCount.textContent = `共 ${catalog.products.length} 个 · 预览选择`;

  state.recommendations.slice(0, 3).forEach((productId, index) => {
    elements.recommendationList.append(createProductCard(productId, index));
  });
  elements.moreProductsButton.disabled = false;
}

function renderProductCatalog() {
  elements.catalogProductList.innerHTML = "";
  const mode = processingModes[state.processingMode];
  elements.catalogModeCopy.textContent = `${mode.name}：按当前推荐顺序显示 ${state.recommendations.length} 个适用产品；选择后会标记为人工选择、加入左侧首选并立即切换预览。`;
  state.recommendations.forEach((productId, index) => {
    elements.catalogProductList.append(createProductCard(productId, index, { catalog: true }));
  });
}

function openProductCatalog() {
  if (!state.sources.length) return;
  renderProductCatalog();
  elements.productCatalogDialog.showModal();
  elements.catalogCloseButton.focus();
}

function drawDesignPreview(canvas, routeId) {
  const ctx = canvas.getContext("2d");
  const route = visualRoutes[routeId];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = route.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const effectImage = routeEffectImage(routeId);
  if (effectImage) {
    drawEffectArtwork(ctx, effectImage, canvas.width, canvas.height, route, effectStrengths[state.effectStrength].effectBlend);
  } else if (state.sources.length) {
    const overlay = routeId === "memory"
      ? "rgba(226, 211, 177, .16)"
      : routeId === "material"
        ? "rgba(3, 10, 15, .42)"
        : "rgba(3, 10, 15, .18)";
    drawSource(ctx, 0, 0, 0, canvas.width, canvas.height, { zoom: 1.05, overlay });
  }
  applyVisualRouteOverlay(ctx, canvas.width, canvas.height, routeId);
}

function selectDirection(routeId, { closeDialog = false } = {}) {
  if (routeId === state.routeId) {
    if (closeDialog && elements.directionCatalogDialog.open) elements.directionCatalogDialog.close();
    return;
  }
  state.routeId = routeId;
  state.routeManual = true;
  state.routeSelectionSource = "manual";
  state.generated = false;
  const matchingReferenceId = Object.keys(referenceCatalog).find((referenceId) => referenceCatalog[referenceId].routeId === routeId);
  if (matchingReferenceId) state.referenceId = matchingReferenceId;
  state.selectedResultId = null;
  state.previewLayer = "reference";
  applyProduct();
  if (closeDialog && elements.directionCatalogDialog.open) elements.directionCatalogDialog.close();
}

function createDirectionCard(routeId, index, { catalog = false } = {}) {
  const route = visualRoutes[routeId];
  const button = document.createElement("button");
  button.className = `design-option${catalog ? " catalog-direction-card" : ""}`;
  button.type = "button";
  button.dataset.route = routeId;
  button.setAttribute("aria-pressed", String(routeId === state.routeId));
  const selected = routeId === state.routeId;
  const rank = selected && state.routeSelectionSource === "manual"
    ? "已选 · 人工选择"
    : catalog ? "可加入首选" : index === 0 ? "当前首选" : index === 1 ? "第二方向" : "第三方向";
  button.setAttribute("aria-label", `${rank}：${route.name}。${route.resultType}；保留${route.preserve}；重建${route.change}`);
  const canvas = document.createElement("canvas");
  canvas.width = catalog ? 240 : 160;
  canvas.height = catalog ? 160 : 104;
  drawDesignPreview(canvas, routeId);
  const copy = document.createElement("span");
  copy.className = "design-option-copy";
  copy.innerHTML = `
    <small>${rank}</small>
    <strong>${route.name}</strong>
    <em>${route.resultType}</em>
    <span>${route.short}</span>
    <span class="route-logic"><b>保留 ${route.preserve}</b><b>重建 ${route.change}</b></span>
  `;
  button.append(canvas, copy);
  button.addEventListener("click", () => selectDirection(routeId, { closeDialog: catalog }));
  return button;
}

function renderDesignOptions() {
  elements.designOptions.innerHTML = "";
  if (!state.sources.length || !state.productId) {
    elements.designNote.textContent = "导入图片后，先决定核心图片怎样被重新表达。";
    elements.directionCount.textContent = "等待图片";
    elements.moreDirectionsCount.textContent = "按处理单位筛选";
    elements.moreDirectionsButton.disabled = true;
    return;
  }

  const routeIds = orderedDirectionIds();
  elements.directionCount.textContent = `3 / ${routeIds.length} 种适用`;
  elements.moreDirectionsCount.textContent = `共 ${routeIds.length} 种 · 预览选择`;
  elements.moreDirectionsButton.disabled = false;
  elements.designNote.textContent = modeCatalog[state.processingMode].directionNote;

  routeIds.slice(0, 3).forEach((routeId, index) => elements.designOptions.append(createDirectionCard(routeId, index)));
}

function renderDirectionCatalog() {
  elements.catalogDirectionList.innerHTML = "";
  const routeIds = orderedDirectionIds();
  elements.directionCatalogModeCopy.textContent = `${processingModes[state.processingMode].name}：按当前图片与产品顺序显示 ${routeIds.length} 种结果方向；选择后会进入左侧首选并同步中央成品。`;
  routeIds.forEach((routeId, index) => elements.catalogDirectionList.append(createDirectionCard(routeId, index, { catalog: true })));
}

function openDirectionCatalog() {
  if (!state.sources.length) return;
  renderDirectionCatalog();
  elements.directionCatalogDialog.showModal();
  elements.directionCatalogCloseButton.focus();
}

function renderStrengthOptions() {
  elements.strengthOptions.innerHTML = "";
  const disabled = !state.sources.length || !state.productId;
  Object.entries(effectStrengths).forEach(([strengthId, strength]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = disabled;
    button.setAttribute("aria-pressed", String(strengthId === state.effectStrength));
    button.textContent = strength.name;
    button.addEventListener("click", () => {
      if (state.effectStrength === strengthId) return;
      state.effectStrength = strengthId;
      state.previewLayer = selectedGeneratedResult() ? "product" : "reference";
      renderRecommendations();
      applyProduct();
      showToast(`已切换为${strength.name}`);
    });
    elements.strengthOptions.append(button);
  });
  elements.strengthNote.textContent = disabled
    ? "载入图片后可调整"
    : effectStrengths[state.effectStrength].note;
}

function renderPreviewToggle() {
  const disabled = !state.sources.length || !state.productId;
  const hasResult = Boolean(selectedGeneratedResult());
  elements.resultPreviewButton.disabled = disabled || !hasResult;
  elements.productPreviewButton.disabled = disabled || !hasResult;
  elements.referencePreviewButton.disabled = disabled;
  elements.sourcePreviewButton.disabled = disabled;
  elements.resultPreviewButton.setAttribute("aria-pressed", String(state.previewLayer === "result"));
  elements.referencePreviewButton.setAttribute("aria-pressed", String(state.previewLayer === "reference"));
  elements.sourcePreviewButton.setAttribute("aria-pressed", String(state.previewLayer === "source"));
  elements.productPreviewButton.setAttribute("aria-pressed", String(state.previewLayer === "product"));
}

function setPreviewLayer(layer) {
  if (!state.sources.length || !state.productId || !["result", "reference", "source", "product"].includes(layer)) return;
  if (["result", "product"].includes(layer) && !selectedGeneratedResult()) return;
  state.previewLayer = layer;
  renderPreviewToggle();
  updateCanvasMeta();
  renderProductWorkspace();
}

function renderProductWorkspace() {
  if (!state.sources.length) return;
  if (state.previewLayer === "source") setStageImage(sourceDataUrl(), "source");
  else if (state.previewLayer === "reference") setStageImage(selectedReference().image, "reference");
  else if (selectedGeneratedResult()) setStageImage(selectedGeneratedResult().image, "result");
  else {
    state.previewLayer = "reference";
    setStageImage(selectedReference().image, "reference");
  }
  if (state.previewLayer === "product") {
    elements.canvasStage.dataset.view = "product";
    renderProduct();
  }
  renderComparison();
  renderPreviewToggle();
}

function setProcessingMode(modeId) {
  if (!processingModes[modeId] || (modeId !== "single" && state.sources.length < 2)) return;
  state.processingMode = modeId;
  state.recommendations = recommendationIds(state.sources.length);
  state.productId = state.recommendations[0] ?? null;
  state.fileIndex = 0;
  state.generated = false;
  state.previewLayer = "reference";
  state.selectedResultId = null;
  state.productSelectionSource = "recommended";
  if (!state.routeManual || !directionIdsForMode().includes(state.routeId)) {
    state.routeId = state.productId ? recommendedRouteForMode(state.productId) : "memory";
    state.routeManual = false;
    state.routeSelectionSource = "recommended";
  }
  renderModeOptions();
  renderRecommendations();
  applyProduct();
  showToast(`已切换为${processingModes[modeId].name}`);
}

function renderModeOptions() {
  elements.modeOptions.innerHTML = "";
  const multi = state.sources.length > 1;
  elements.modeNote.textContent = !state.sources.length
    ? "导入图片后选择处理单位。"
    : multi
      ? `当前有 ${state.sources.length} 张图片：可以只取主图、逐张独立处理，或组合成一个合集。`
      : "当前只有一张图片，将直接生成一个独立成品。";
  Object.entries(processingModes).forEach(([modeId, mode]) => {
    const button = document.createElement("button");
    button.className = "mode-option";
    button.type = "button";
    button.disabled = !state.sources.length || (!multi && modeId !== "single");
    button.setAttribute("aria-pressed", String(modeId === state.processingMode));
    button.innerHTML = `<span><strong>${mode.name}</strong><small>${mode.short}</small></span><em>${mode.action}</em>`;
    button.addEventListener("click", () => setProcessingMode(modeId));
    elements.modeOptions.append(button);
  });
}

function renderSampleOptions() {
  elements.sampleOptions.innerHTML = "";
  const useAsReference = state.sourceKind === "upload" && state.sources.length;
  elements.sampleOptionsTitle.textContent = useAsReference ? "参考主题入口" : "快速体验";
  elements.sampleOptionsHelp.textContent = useAsReference ? "保留当前新图，只切换参考效果" : "未上传时可直接载入完整样例";
  Object.entries(sampleCatalog).forEach(([sampleId, sample]) => {
    const button = document.createElement("button");
    button.className = "sample-option";
    button.type = "button";
    const referenceId = sampleReferenceMap[sampleId];
    const reference = referenceCatalog[referenceId] ?? referenceCatalog.memory;
    button.setAttribute("aria-pressed", String(useAsReference ? referenceId === state.referenceId : sampleId === state.sampleId));
    button.setAttribute("aria-label", useAsReference ? `使用${sample.label}的参考效果` : `使用样例：${sample.label}`);
    button.innerHTML = `
      <img src="${useAsReference ? reference.image : sample.url}" alt="" />
      <span><strong>${sample.label}</strong><span>${useAsReference ? reference.name : sample.meta}</span></span>
    `;
    button.addEventListener("click", () => useAsReference ? selectReference(referenceId) : loadSample(sampleId));
    elements.sampleOptions.append(button);
  });
}

function drawMiniSource(canvas, source) {
  const ctx = canvas.getContext("2d");
  const rect = getSourceRect(source);
  const ratio = rect.width / rect.height;
  let cropWidth = rect.width;
  let cropHeight = rect.height;
  if (ratio > 1) cropWidth = rect.height;
  else cropHeight = rect.width;
  const sx = rect.x + (rect.width - cropWidth) / 2;
  const sy = rect.y + (rect.height - cropHeight) / 2;
  ctx.drawImage(source.image, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
}

function renderSourceList() {
  elements.sourceList.innerHTML = "";
  if (!state.sources.length) {
    const empty = document.createElement("div");
    empty.className = "source-empty";
    empty.textContent = "尚未导入图片";
    elements.sourceList.append(empty);
    return;
  }
  state.sources.forEach((source, index) => {
    const button = document.createElement("button");
    button.className = "source-thumb";
    button.type = "button";
    button.setAttribute("aria-label", `设为主图：${source.name}`);
    button.setAttribute("aria-pressed", String(index === state.primarySource));
    const canvas = document.createElement("canvas");
    canvas.width = 92;
    canvas.height = 92;
    drawMiniSource(canvas, source);
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    button.append(canvas, number);
    button.addEventListener("click", () => {
      state.primarySource = index;
      state.previewLayer = "reference";
      state.generated = false;
      state.selectedResultId = null;
      renderSourceList();
      applyProduct();
      elements.exportStatus.textContent = `已将第 ${index + 1} 张设为主图；需要重新生成整套产品。`;
    });
    elements.sourceList.append(button);
  });
}

function drawFileThumb(canvas, productId, fileIndex) {
  const ctx = canvas.getContext("2d");
  const route = visualRoutes[routeForProduct(productId)];
  const effectImage = visualBaseImage(routeForProduct(productId), productId);
  ctx.fillStyle = route.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (effectImage && fileIndex === 0) {
    const ratio = effectImage.naturalWidth / effectImage.naturalHeight;
    const boxRatio = canvas.width / canvas.height;
    let width = canvas.width;
    let height = canvas.height;
    if (ratio > boxRatio) height = width / ratio;
    else width = height * ratio;
    ctx.drawImage(effectImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    ctx.fillStyle = route.accent;
    ctx.fillRect(6, canvas.height - 9, canvas.width - 12, 3);
    return;
  }
  const source = state.processingMode === "batch"
    ? state.sources[fileIndex]
    : state.sources[sourceIndexesForFile(productId, fileIndex)[0] ?? state.primarySource];
  if (source) {
    const rect = getSourceRect(source);
    const targetHeight = productId === "archive" ? 58 : 80;
    ctx.drawImage(source.image, rect.x, rect.y, rect.width, rect.height, 8, 8, canvas.width - 16, targetHeight);
  }
  ctx.fillStyle = route.accent;
  ctx.fillRect(8, canvas.height - 20, 28 + fileIndex * 4, 4);
}

function renderFileList() {
  elements.fileList.innerHTML = "";
  if (!state.productId) return;
  const files = productFiles(state.productId);
  files.forEach((file, index) => {
    const button = document.createElement("button");
    button.className = "file-button";
    button.type = "button";
    button.setAttribute("aria-current", index === state.fileIndex ? "page" : "false");
    const coverageLabel = fileCoverageLabel(state.productId, index);
    button.setAttribute("aria-label", `第 ${index + 1} 项：${file[0]}；${coverageLabel}`);
    const canvas = document.createElement("canvas");
    canvas.width = 92;
    canvas.height = 112;
    drawFileThumb(canvas, state.productId, index);
    const copy = document.createElement("span");
    copy.className = "file-copy";
    copy.innerHTML = `<strong>${file[0]}</strong><span>${file[1]}</span><em>${coverageLabel}</em>`;
    const number = document.createElement("span");
    number.className = "file-number";
    number.textContent = String(index + 1).padStart(2, "0");
    button.append(canvas, copy, number);
    button.addEventListener("click", () => {
      state.fileIndex = index;
      if (selectedGeneratedResult()) state.previewLayer = "product";
      renderFileList();
      updateCanvasMeta();
      renderProductWorkspace();
    });
    elements.fileList.append(button);
  });
}

function updateCoverageSummary() {
  if (!state.productId || !state.sources.length) {
    elements.coverageSourceCount.textContent = "0 张";
    elements.coverageOutputCount.textContent = "0 个";
    elements.coverageStatus.textContent = "载入图片后显示覆盖关系";
    elements.coverageSummary.dataset.complete = "false";
    return;
  }
  const sourceCount = state.sources.length;
  const outputCount = productFiles(state.productId).length;
  const coveredCount = coveredSourceIndexes(state.productId).length;
  elements.coverageSourceCount.textContent = `${sourceCount} 张`;
  elements.coverageOutputCount.textContent = state.processingMode === "collection"
    ? `${outputCount} 个成品页`
    : state.processingMode === "batch"
      ? `${outputCount} 个独立成品`
      : "1 个成品";
  elements.coverageSummary.dataset.complete = String(
    state.processingMode === "single" ? coveredCount === 1 : coveredCount === sourceCount,
  );
  if (state.processingMode === "single") {
    elements.coverageStatus.textContent = sourceCount > 1
      ? `仅使用当前主图 1 张；其余 ${sourceCount - 1} 张不进入这个单图成品`
      : "当前原图完整进入这个单图成品";
  } else if (state.processingMode === "batch") {
    elements.coverageStatus.textContent = `已覆盖 ${coveredCount} / ${sourceCount} 张；每张原图各生成一个独立文件`;
  } else if (state.productId === "archive") {
    elements.coverageStatus.textContent = `已覆盖 ${coveredCount} / ${sourceCount} 张；${outputCount} 页是档案结构，不等于只使用 ${outputCount} 张图`;
  } else if (state.productId === "story") {
    elements.coverageStatus.textContent = `已覆盖 ${coveredCount} / ${sourceCount} 张；封面之外，每张原图拥有一张故事页`;
  } else if (state.productId === "lookbook") {
    elements.coverageStatus.textContent = `已覆盖 ${coveredCount} / ${sourceCount} 张；封面、总览之外，每张原图拥有一张图鉴条目`;
  } else {
    elements.coverageStatus.textContent = `已覆盖 ${coveredCount} / ${sourceCount} 张；多张原图按页面职责组合使用`;
  }
}

function updateCanvasMeta() {
  if (!state.productId) return;
  const product = products[state.productId];
  const file = productFiles(state.productId)[state.fileIndex];
  if (state.previewLayer === "source") {
    const source = sourceForPreview(state.fileIndex)?.source;
    elements.canvasHeading.textContent = "原图参考";
    elements.productEyebrow.textContent = "01 · 你的新图";
    elements.formatType.textContent = "原图";
    elements.formatSize.textContent = "生成输入";
    elements.canvasDescription.textContent = `当前查看${source?.name ?? "原始图片"}。AI 将保留主体与关键事实，不会直接把参考样例的对象复制进来。`;
    return;
  }
  if (state.previewLayer === "reference" || !selectedGeneratedResult()) {
    const reference = selectedReference();
    elements.canvasHeading.textContent = reference.name;
    elements.productEyebrow.textContent = "02 · 生成参考 · 尚未生成";
    elements.formatType.textContent = "参考";
    elements.formatSize.textContent = reference.method;
    elements.canvasDescription.textContent = `${reference.summary} 点击“使用参考生成”后，新图会借鉴这个视觉方法，而不是下载这张样例。`;
    return;
  }
  if (state.previewLayer === "product") {
    elements.canvasHeading.textContent = file[0];
    elements.productEyebrow.textContent = `04 · 产品适配 · ${productNameForMode(state.productId)}`;
    elements.formatType.textContent = "PNG";
    elements.formatSize.textContent = `${file[2]} × ${file[3]}`;
    elements.canvasDescription.textContent = `这是选中 AI 结果进入“${file[0]}”后的产品成品。右侧可切换全部页面，并导出整套产品 ZIP。`;
    return;
  }
  const result = selectedGeneratedResult();
  elements.canvasHeading.textContent = file[0];
  elements.productEyebrow.textContent = `03 · AI 生成结果 · ${productNameForMode(state.productId)}`;
  elements.formatType.textContent = "PNG";
  elements.formatSize.textContent = result.model;
  elements.canvasDescription.textContent = `这是由你的新图和“${selectedReference().name}”共同驱动的真实 AI 结果。右侧结果库可保留多个版本，选定后再进入产品适配。`;
}

function applyProduct() {
  if (!state.productId || !state.sources.length) {
    renderEmptyState();
    return;
  }
  const product = products[state.productId];
  const files = productFiles(state.productId);
  state.routeId = routeForProduct(state.productId);
  const route = visualRoutes[state.routeId];
  elements.workspace.dataset.state = "ready";
  elements.productName.textContent = productNameForMode(state.productId);
  elements.productDescription.textContent = `${processingModes[state.processingMode].name} · ${productDeliverable(state.productId)}`;
  elements.routeName.textContent = route.name;
  elements.routeDescription.textContent = `${route.resultType}：${route.short}`;
  elements.routeSkillTags.innerHTML = `
    <span class="route-logic-tag">保留：${route.preserve}</span>
    <span class="route-logic-tag">重建：${route.change}</span>
    <span class="route-strength-tag">强度：${effectStrengths[state.effectStrength].name}</span>
    ${route.traits.map((trait) => `<span>${trait}</span>`).join("")}
  `;
  elements.fileCount.textContent = state.processingMode === "collection"
    ? `${files.length} 个成品页`
    : state.processingMode === "batch"
      ? `${files.length} 个独立成品`
      : "1 个文件";
  elements.generationDetailCopy.textContent = `${recommendationCardReason(state.productId)} 当前“${route.name}”由 ${route.skills.join("、")} 的研究能力启发；系统再组合图片理解、视觉生成、确定性排版与质量检查。`;
  elements.capabilityTags.innerHTML = [route.resultType, ...route.skills, ...product.capabilities].map((capability) => `<span>${capability}</span>`).join("");
  const sample = state.sampleId ? sampleCatalog[state.sampleId] : null;
  elements.recommendationBasis.textContent = state.productSelectionSource === "manual"
    ? "人工选择"
    : sample
      ? `${sample.label} · 样例信号`
      : state.sourceKind === "upload"
        ? "图片数量 + 处理单位"
        : processingModes[state.processingMode].name;
  elements.integrityDetail.textContent = `${state.productSelectionSource === "manual" ? "你已主动选择此产品；" : ""}${recommendationCardReason(state.productId)}`;
  const hasResult = Boolean(selectedGeneratedResult());
  elements.generateButton.disabled = !state.apiAvailable;
  elements.generateButton.textContent = state.apiAvailable ? hasResult ? "再次生成一个结果" : "使用参考生成" : "AI 服务尚未连接";
  elements.downloadButton.disabled = !hasResult;
  elements.downloadBundleButton.hidden = files.length <= 1;
  elements.downloadBundleButton.disabled = !hasResult || files.length <= 1;
  elements.exportStatus.textContent = hasResult
    ? `已选中真实 AI 结果；可下载当前结果${files.length > 1 ? "，也可导出产品 ZIP" : ""}。`
    : state.apiAvailable ? "当前中央显示参考效果；生成完成后才会出现结果下载。" : `${state.apiMessage}。`;
  updateCanvasMeta();
  renderReferences();
  renderDesignOptions();
  renderStrengthOptions();
  renderPreviewToggle();
  updateCoverageSummary();
  renderFileList();
  renderProductWorkspace();
  renderResultLibrary();
}

function renderEmptyState(message = "选择图片或使用演示素材后，系统将自动推荐产品。") {
  elements.workspace.dataset.state = "empty";
  elements.canvasStateTitle.textContent = "从图片开始";
  elements.canvasStateCopy.textContent = message;
  elements.canvasHeading.textContent = "准备图片";
  elements.productEyebrow.textContent = "产品预览";
  elements.formatType.textContent = "PNG";
  elements.formatSize.textContent = "等待产品";
  elements.canvasDescription.textContent = "导入图片后，中央会显示当前产品的完整文件。";
  elements.productName.textContent = "等待推荐";
  elements.productDescription.textContent = "导入图片后，这里会显示产品包含的完整文件。";
  updateCoverageSummary();
  elements.routeName.textContent = "等待推荐";
  elements.routeDescription.textContent = "选择图片后，这里会说明成品采用的可见设计效果。";
  elements.routeSkillTags.innerHTML = "";
  state.previewLayer = "result";
  elements.fileCount.textContent = "0 项";
  elements.fileList.innerHTML = "";
  elements.capabilityTags.innerHTML = "";
  elements.designOptions.innerHTML = "";
  elements.designNote.textContent = "导入图片后，先决定核心图片怎样被重新表达。";
  elements.directionCount.textContent = "等待图片";
  elements.moreDirectionsCount.textContent = "按处理单位筛选";
  elements.moreDirectionsButton.disabled = true;
  elements.productCount.textContent = "等待图片";
  elements.moreProductsCount.textContent = "按处理单位筛选";
  elements.referenceOptions.innerHTML = "";
  elements.referenceCount.textContent = "等待图片";
  elements.moreReferencesButton.disabled = true;
  elements.resultList.innerHTML = '<div class="result-empty">生成完成后，结果会保留在这里供比较、选择和下载。</div>';
  elements.compareSourceImage.removeAttribute("src");
  elements.compareReferenceImage.removeAttribute("src");
  elements.compareResultImage.removeAttribute("src");
  elements.compareResultButton.disabled = true;
  elements.compareStatus.textContent = "等待生成";
  elements.generationDetailCopy.textContent = "根据产品结构组合图片理解、视觉生成、排版与质量检查能力。";
  elements.generateButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.downloadBundleButton.disabled = true;
  elements.downloadBundleButton.hidden = false;
  elements.exportStatus.textContent = "等待图片载入。";
  renderStrengthOptions();
  renderPreviewToggle();
}

function setSourceStatus(tone, text) {
  elements.sourceChip.dataset.tone = tone;
  elements.sourceStatus.textContent = text;
}

function cleanupObjectUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
}

async function loadSample(sampleId = "rainy") {
  const sample = sampleId === "missing"
    ? {
        label: "故障素材",
        url: "./missing-source.png",
        mode: "single",
        title: "",
        body: "",
        credit: "",
        recommendations: [],
        note: "",
      }
    : sampleCatalog[sampleId] ?? sampleCatalog.rainy;
  cleanupObjectUrls();
  elements.workspace.dataset.state = "loading";
  elements.canvasStateTitle.textContent = `正在载入${sample.label}`;
  elements.canvasStateCopy.textContent = sample.mode === "sheet"
    ? "六张图片会作为一个素材组进入产品推荐。"
    : "单张图片会根据主体与可延展性获得产品推荐。";
  setSourceStatus("loading", `正在载入${sample.label}…`);
  try {
    const image = await loadImage(sample.url);
    state.effectImages = {};
    await Promise.all(Object.entries(sample.effectMap ?? {}).map(async ([effectId, url]) => {
      try {
        const key = visualRoutes[effectId] ? `route:${effectId}` : effectId;
        state.effectImages[key] = await loadImage(url);
      } catch (error) {
        // The source remains usable when an optional authored preview is unavailable.
      }
    }));
    if (sample.mode === "sheet") {
      const cellWidth = image.naturalWidth / 3;
      const cellHeight = image.naturalHeight / 2;
      state.sources = Array.from({ length: 6 }, (_, index) => ({
        name: `${sample.label} ${index + 1}`,
        image,
        crop: {
          x: (index % 3) * cellWidth,
          y: Math.floor(index / 3) * cellHeight,
          width: cellWidth,
          height: cellHeight,
        },
      }));
    } else {
      state.sources = [{ name: sample.label, image, crop: null }];
    }
    state.primarySource = 0;
    state.sourceKind = "sample";
    state.sampleId = sampleCatalog[sampleId] ? sampleId : null;
    state.referenceId = sampleReferenceMap[sampleId] ?? "memory";
    state.generatedResults = [];
    state.selectedResultId = null;
    state.processingMode = state.sources.length > 1 ? "collection" : "single";
    state.routeManual = false;
    state.routeSelectionSource = "recommended";
    state.generated = false;
    state.previewLayer = "reference";
    elements.titleInput.value = sample.title;
    elements.bodyInput.value = sample.body;
    elements.metaInput.value = sample.credit;
    updateCounts();
    renderSampleOptions();
    renderSourceList();
    renderModeOptions();
    updateRecommendations({ selectFirst: true });
    setSourceStatus("success", `${state.sources.length} 张${sample.label}样例 · 浏览器内`);
  } catch (error) {
    state.sources = [];
    state.effectImages = {};
    state.sampleId = null;
    renderSampleOptions();
    renderSourceList();
    renderModeOptions();
    renderRecommendations();
    renderEmptyState(`${sample.label}未能载入，请选择其他样例或自己的图片。`);
    elements.workspace.dataset.state = "error";
    elements.canvasStateTitle.textContent = "样例素材不可用";
    elements.recommendationBasis.textContent = "素材不可用";
    elements.integrityDetail.textContent = "请选择其他样例或本地图片恢复。";
    setSourceStatus("error", "素材载入失败");
  }
}

async function loadUserFiles(files) {
  const selected = Array.from(files).slice(0, 12);
  if (!selected.length) return;
  cleanupObjectUrls();
  elements.workspace.dataset.state = "loading";
  elements.canvasStateTitle.textContent = "正在读取你的图片";
  elements.canvasStateCopy.textContent = `正在准备 ${selected.length} 张图片的产品推荐。`;
  setSourceStatus("loading", `读取 ${selected.length} 张图片…`);

  const loaded = await Promise.all(selected.map(async (file) => {
    const url = URL.createObjectURL(file);
    state.objectUrls.push(url);
    try {
      return { name: file.name, image: await loadImage(url), crop: null };
    } catch (error) {
      return null;
    }
  }));

  state.sources = loaded.filter(Boolean);
  state.primarySource = 0;
  state.sourceKind = "upload";
  state.sampleId = null;
  state.effectImages = {};
  state.generatedResults = [];
  state.selectedResultId = null;
  state.previewLayer = "reference";
  state.processingMode = state.sources.length > 1 ? "batch" : "single";
  state.routeManual = false;
  state.routeSelectionSource = "recommended";
  state.generated = false;
  if (!state.sources.length) {
    renderSourceList();
    renderEmptyState("所选文件无法读取，请选择 PNG、JPEG 或 WebP 图片。");
    elements.workspace.dataset.state = "error";
    elements.canvasStateTitle.textContent = "图片无法读取";
    setSourceStatus("error", "没有可用图片");
    return;
  }

  elements.titleInput.value = state.sources.length === 1 ? "一张图的延展" : `${state.sources.length} 张图片的故事`;
  elements.bodyInput.value = state.sources.length === 1
    ? "从核心画面出发，生成可以继续使用的完整视觉产品。"
    : "保留每张图片的职责，把它们组织成结构完整的系列产品。";
  elements.metaInput.value = "本地图片 · 浏览器内处理";
  updateCounts();
  renderSampleOptions();
  renderSourceList();
  renderModeOptions();
  updateRecommendations({ selectFirst: true });
  setSourceStatus("success", `${state.sources.length} 张图片 · 浏览器内`);
}

function clearSources() {
  cleanupObjectUrls();
  state.sources = [];
  state.recommendations = [];
  state.productId = null;
  state.fileIndex = 0;
  state.generated = false;
  state.sampleId = null;
  state.effectImages = {};
  state.processingMode = "single";
  state.routeManual = false;
  state.routeSelectionSource = "recommended";
  state.productSelectionSource = "recommended";
  state.generatedResults = [];
  state.selectedResultId = null;
  state.previewLayer = "reference";
  elements.sourceInput.value = "";
  renderSampleOptions();
  renderSourceList();
  renderModeOptions();
  renderRecommendations();
  renderEmptyState();
  elements.recommendationBasis.textContent = "等待图片";
  elements.integrityDetail.textContent = "选择一张或多张图片后显示推荐依据。";
  setSourceStatus("error", "尚未选择图片");
}

function updateCounts() {
  elements.titleCount.textContent = Array.from(elements.titleInput.value).length;
  elements.bodyCount.textContent = Array.from(elements.bodyInput.value).length;
}

async function generateProduct() {
  if (!state.sources.length || !state.productId || !state.apiAvailable) return;
  const reference = selectedReference();
  elements.workspace.dataset.state = "generating";
  elements.canvasStateTitle.textContent = "AI 正在生成新结果";
  elements.canvasStateCopy.textContent = `正在把你的图片作为内容输入，并借鉴“${reference.name}”的视觉方法。复杂请求可能需要约 2 分钟。`;
  elements.generateButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.downloadBundleButton.disabled = true;
  elements.exportStatus.textContent = "正在生成真实 AI 图片；完成前不会启用下载。";
  try {
    const referenceResponse = await fetch(reference.image);
    const referenceBlob = await referenceResponse.blob();
    const referenceObjectUrl = URL.createObjectURL(referenceBlob);
    const referenceImage = await loadImage(referenceObjectUrl);
    URL.revokeObjectURL(referenceObjectUrl);
    const referenceDataUrl = imageToDataUrl(referenceImage);
    const route = visualRoutes[state.routeId];
    const sourceImages = state.processingMode === "single"
      ? [sourceDataUrl()]
      : state.sources.map((source) => sourceDataUrl(source));
    const prompt = `
Image 1${sourceImages.length > 1 ? ` to ${sourceImages.length}` : ""}: the user's source image${sourceImages.length > 1 ? "s" : ""}. Preserve the recognizable subjects, important objects, count relationships, and factual scene cues.
Final image: create a new portrait visual for ${productNameForMode(state.productId)}. Apply the visual method of the last reference image (${reference.name}) to the source content, but do not copy people, objects, logos, text, or specific scene content from the reference.
Direction: ${route.short}. Preserve: ${route.preserve}. Rebuild: ${route.change}.
Use: a polished image-first product result. No readable text, no watermark, no mockup frame. Keep all important subjects fully inside the frame.
`.trim();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceImages, referenceImage: referenceDataUrl, prompt, quality: "medium" }),
    });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message ?? "生成失败"), { code: payload?.error?.code });
    const element = await loadImage(payload.image);
    const result = {
      id: `result-${Date.now()}`,
      image: payload.image,
      element,
      referenceId: state.referenceId,
      model: payload.model,
      requestId: payload.requestId,
    };
    state.generatedResults.unshift(result);
    state.selectedResultId = result.id;
    state.generated = true;
    state.previewLayer = "result";
    elements.workspace.dataset.state = "ready";
    applyProduct();
    elements.exportStatus.textContent = `真实 AI 结果已生成；可与原图和参考样例对照，并继续生成其他版本。`;
    showToast("AI 结果已进入结果库");
  } catch (error) {
    elements.workspace.dataset.state = "ready";
    elements.exportStatus.textContent = `${error.message}；你的原图和参考选择仍保留，可修复后重试。`;
    elements.generateButton.disabled = !state.apiAvailable;
    showToast("生成未完成");
  }
}

function downloadCurrentFile() {
  const result = selectedGeneratedResult();
  if (!result) return;
  const link = document.createElement("a");
  link.href = result.image;
  link.download = `image-studio-result-${state.generatedResults.indexOf(result) + 1}.png`;
  link.click();
  elements.exportStatus.textContent = `已导出 AI 生成结果 ${state.generatedResults.indexOf(result) + 1}`;
  showToast("已下载当前 AI 结果");
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

function crc32(bytes) {
  let value = 0xffffffff;
  bytes.forEach((byte) => {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  });
  return (value ^ 0xffffffff) >>> 0;
}

function write16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function write32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
  });
}

async function createProductZip(productId) {
  const product = products[productId];
  const files = productFiles(productId);
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const entries = [];

  for (let index = 0; index < files.length; index += 1) {
    const canvas = document.createElement("canvas");
    renderProduct(canvas, productId, index);
    const blob = await canvasBlob(canvas);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const name = `${String(index + 1).padStart(2, "0")}-${files[index][0]}.png`;
    entries.push({ bytes, nameBytes: encoder.encode(name), checksum: crc32(bytes), offset: 0 });
  }

  const localParts = [];
  let localOffset = 0;
  entries.forEach((entry) => {
    entry.offset = localOffset;
    const header = new Uint8Array(30 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    write32(view, 0, 0x04034b50);
    write16(view, 4, 20);
    write16(view, 6, 0x0800);
    write16(view, 8, 0);
    write16(view, 10, dosTime);
    write16(view, 12, dosDate);
    write32(view, 14, entry.checksum);
    write32(view, 18, entry.bytes.length);
    write32(view, 22, entry.bytes.length);
    write16(view, 26, entry.nameBytes.length);
    write16(view, 28, 0);
    header.set(entry.nameBytes, 30);
    localParts.push(header, entry.bytes);
    localOffset += header.length + entry.bytes.length;
  });

  const centralParts = [];
  let centralSize = 0;
  entries.forEach((entry) => {
    const header = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    write32(view, 0, 0x02014b50);
    write16(view, 4, 20);
    write16(view, 6, 20);
    write16(view, 8, 0x0800);
    write16(view, 10, 0);
    write16(view, 12, dosTime);
    write16(view, 14, dosDate);
    write32(view, 16, entry.checksum);
    write32(view, 20, entry.bytes.length);
    write32(view, 24, entry.bytes.length);
    write16(view, 28, entry.nameBytes.length);
    write16(view, 30, 0);
    write16(view, 32, 0);
    write16(view, 34, 0);
    write16(view, 36, 0);
    write32(view, 38, 0);
    write32(view, 42, entry.offset);
    header.set(entry.nameBytes, 46);
    centralParts.push(header);
    centralSize += header.length;
  });

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, localOffset);
  write16(endView, 20, 0);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

async function downloadProductBundle() {
  if (!selectedGeneratedResult() || !state.productId) return;
  const productId = state.productId;
  const product = products[productId];
  const files = productFiles(productId);
  elements.downloadBundleButton.disabled = true;
  elements.generateButton.disabled = true;
  elements.exportStatus.textContent = `正在打包 ${files.length} 个 PNG 文件…`;
  try {
    const blob = await createProductZip(productId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `image-product-${productId}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    elements.exportStatus.textContent = `已导出全部：${productNameForMode(productId)} · ${files.length} 个 PNG`;
    showToast(`已下载${productNameForMode(productId)}全部 ZIP`);
  } catch (error) {
    elements.exportStatus.textContent = "整套打包失败；仍可下载当前 PNG。";
    showToast("ZIP 打包失败");
  } finally {
    elements.downloadBundleButton.disabled = !selectedGeneratedResult() || files.length <= 1;
    elements.generateButton.disabled = !state.apiAvailable;
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.dataset.visible = "true";
  toastTimer = setTimeout(() => {
    elements.toast.dataset.visible = "false";
  }, 1800);
}

elements.sourceInput.addEventListener("change", (event) => {
  loadUserFiles(event.target.files);
});
elements.sourcePickerButton.addEventListener("click", () => elements.sourceInput.click());
elements.clearSourceButton.addEventListener("click", clearSources);
elements.generateButton.addEventListener("click", generateProduct);
elements.downloadButton.addEventListener("click", downloadCurrentFile);
elements.downloadBundleButton.addEventListener("click", downloadProductBundle);
elements.resultPreviewButton.addEventListener("click", () => setPreviewLayer("result"));
elements.sourcePreviewButton.addEventListener("click", () => setPreviewLayer("source"));
elements.referencePreviewButton.addEventListener("click", () => setPreviewLayer("reference"));
elements.productPreviewButton.addEventListener("click", () => setPreviewLayer("product"));
elements.compareSourceButton.addEventListener("click", () => setPreviewLayer("source"));
elements.compareReferenceButton.addEventListener("click", () => setPreviewLayer("reference"));
elements.compareResultButton.addEventListener("click", () => setPreviewLayer("result"));
elements.moreReferencesButton.addEventListener("click", () => {
  if (!state.sources.length) return;
  renderReferenceCatalog();
  elements.referenceCatalogDialog.showModal();
  elements.referenceCatalogCloseButton.focus();
});
elements.moreProductsButton.addEventListener("click", openProductCatalog);
elements.moreDirectionsButton.addEventListener("click", openDirectionCatalog);
elements.catalogCloseButton.addEventListener("click", () => elements.productCatalogDialog.close());
elements.directionCatalogCloseButton.addEventListener("click", () => elements.directionCatalogDialog.close());
elements.referenceCatalogCloseButton.addEventListener("click", () => elements.referenceCatalogDialog.close());
elements.productCatalogDialog.addEventListener("click", (event) => {
  if (event.target === elements.productCatalogDialog) elements.productCatalogDialog.close();
});
elements.productCatalogDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    elements.productCatalogDialog.close();
  }
});
elements.productCatalogDialog.addEventListener("close", () => {
  elements.moreProductsButton.focus();
});
elements.directionCatalogDialog.addEventListener("click", (event) => {
  if (event.target === elements.directionCatalogDialog) elements.directionCatalogDialog.close();
});
elements.directionCatalogDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    elements.directionCatalogDialog.close();
  }
});
elements.directionCatalogDialog.addEventListener("close", () => {
  elements.moreDirectionsButton.focus();
});
elements.referenceCatalogDialog.addEventListener("click", (event) => {
  if (event.target === elements.referenceCatalogDialog) elements.referenceCatalogDialog.close();
});
elements.referenceCatalogDialog.addEventListener("close", () => {
  elements.moreReferencesButton.focus();
});

[elements.titleInput, elements.bodyInput, elements.metaInput].forEach((input) => {
  input.addEventListener("input", () => {
    updateCounts();
    state.previewLayer = selectedGeneratedResult() ? "product" : "reference";
    elements.exportStatus.textContent = selectedGeneratedResult()
      ? "产品文字已更新；核心 AI 图片结果保持不变，可直接查看和导出新的成品适配。"
      : "产品文字已更新；生成前仍显示当前参考效果。";
    renderPreviewToggle();
    updateCanvasMeta();
    renderProductWorkspace();
  });
});

updateCounts();
renderSampleOptions();
renderSourceList();
renderModeOptions();
renderEmptyState();
loadSample(
  query.get("source") === "missing"
    ? "missing"
    : query.get("sample") === "single"
      ? "repair"
      : query.get("sample") || "rainy",
);
checkApiStatus();
