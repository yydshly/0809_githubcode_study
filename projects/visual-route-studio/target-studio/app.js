const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 760;
const SOURCE_COLUMNS = 3;
const SOURCE_ROWS = 2;

const palette = {
  studio: "#070c0f",
  studioSoft: "#10191e",
  line: "#29383f",
  paper: "#e8dec8",
  paperDeep: "#d2c5ab",
  ink: "#111a1e",
  inkSoft: "#2a3437",
  rain: "#0c2432",
  amber: "#cf8b2a",
  teal: "#318f94",
  mustard: "#a97721",
  cream: "#f3ead7",
  muted: "#7f8f8d",
  success: "#79ba8f",
};

const sourceSets = {
  ceramic: {
    label: "陶艺工作室",
    title: "泥土与蓝",
    meta: "陶艺工作室 · 6 张模型生成照片",
    url: "./assets/ceramic-studio-source.png",
    indexes: [0, 1, 2, 3, 4, 5],
    recommendations: ["T05", "T08", "T01", "T06", "T04", "T11"],
    note: "人物、器物和材质都很强，优先推荐包装、卡片、封面与编辑出版。",
    sampleResult: { goalId: "T05", url: "./assets/ceramic-postcards-result.png", label: "ImageGen 明信片系列样例" },
    colors: { rain: "#2c2520", amber: "#b5673e", teal: "#2450a4", mustard: "#b78958", paper: "#eee4d1" },
  },
  robotics: {
    label: "风能机器人",
    title: "向风而行",
    meta: "清洁能源基地 · 6 张模型生成照片",
    url: "./assets/wind-robotics-source.png",
    indexes: [0, 1, 2, 3, 4, 5],
    recommendations: ["T01", "T02", "T12", "T09", "T07", "T10"],
    note: "工程场景、产品主体和流程证据清楚，优先推荐发布、演示、海报与解释型成品。",
    sampleResult: { goalId: "T01", url: "./assets/robotics-cover-result.png", label: "ImageGen 文章封面样例" },
    colors: { rain: "#17232d", amber: "#f07822", teal: "#5b9fb8", mustard: "#d06520", paper: "#edf0ed" },
  },
  performance: {
    label: "实验音乐舞台",
    title: "红色回声",
    meta: "黑盒剧场排练 · 6 张模型生成照片",
    url: "./assets/cellist-stage-source.png",
    indexes: [0, 1, 2, 3, 4, 5],
    recommendations: ["T03", "T01", "T02", "T07", "T12", "T05"],
    note: "人物轮廓、舞台光和器乐细节突出，优先推荐海报、大屏、社交与整套发布系统。",
    sampleResult: { goalId: "T03", url: "./assets/performance-carousel-result.png", label: "ImageGen 轮播首图样例" },
    colors: { rain: "#081321", amber: "#d9483b", teal: "#356ca3", mustard: "#bd5542", paper: "#ebe3d8" },
  },
  alpine: {
    label: "高山种子档案",
    title: "山谷种子",
    meta: "高山研究档案 · 6 张模型生成照片",
    url: "./assets/alpine-seed-library-source.png",
    indexes: [0, 1, 2, 3, 4, 5],
    recommendations: ["T11", "T06", "T10", "T08", "T05", "T04"],
    note: "空间、自然物件和档案关系丰富，优先推荐教育、档案、网页、图案和出版。",
    sampleResult: { goalId: "T11", url: "./assets/alpine-relic-result.png", label: "ImageGen 档案卡样例" },
    colors: { rain: "#1f2c25", amber: "#987a45", teal: "#71569a", mustard: "#927b46", paper: "#ece4d2" },
  },
};

const goals = [
  {
    id: "T01",
    category: "封面与单一主视觉",
    title: "文章 / 专栏封面",
    short: "单一主图 + 分享适配",
    summary: "从一张核心原图建立文章头图和分享缩略图。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "横版主图 · 16:9",
    contextLabel: "文章主题",
    contextPlaceholder: "可选：文章讨论什么",
    factsTitle: "可以直接预览",
    factsCopy: "来源中的核心场景和细节已经提供视觉锚点；导出前确认真实标题即可。",
    outputs: ["1600×900 文章头图", "1200×630 分享图", "无字视觉底图 + 真实排字版"],
    capabilities: [
      ["主视觉蒸馏", "从原图提炼一个清楚视觉锚点"],
      ["原图编辑", "保留照片证据并建立标题安全区"],
      ["多尺寸适配", "保持同一构图意图输出横版规格"],
    ],
    renderer: "cover",
  },
  {
    id: "T02",
    category: "海报与活动主视觉",
    title: "展览海报",
    short: "印刷海报 + 入口屏",
    summary: "把原图发展成远距离可识别的展览主视觉。",
    level: "conditional",
    levelLabel: "条件推荐",
    spec: "A2 + 9:16",
    contextLabel: "展览真实信息",
    contextPlaceholder: "展览名、日期、地点",
    factsTitle: "需要真实用途",
    factsCopy: "图片适合做海报，但系统不能仅根据原图虚构展览、日期或地点。",
    outputs: ["A2 印刷海报", "1080×1920 入口屏", "真实文字安全区版本"],
    capabilities: [
      ["主视觉蒸馏", "从场景、人物或物件中选择一个核心锚点"],
      ["限色材料", "把来源色转成远距离可读结构"],
      ["海报生产", "生成印刷与屏幕两个版式"],
    ],
    renderer: "poster",
  },
  {
    id: "T03",
    category: "社交与连续图片",
    title: "图片轮播组",
    short: "6–8 张连续图片卡",
    summary: "把六张照片组织成可以连续阅读的图片卡。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "6–8 张 · 4:5",
    contextLabel: "叙事说明",
    contextPlaceholder: "可选：希望如何讲述这组照片",
    factsTitle: "可以直接预览",
    factsCopy: "原图已经提供开门、进入、浏览、发现和离开的顺序。",
    outputs: ["6–8 张 1080×1350 图片卡", "一张封面卡", "共享颜色与真实文字层"],
    capabilities: [
      ["照片理解", "识别六张照片的主体和事件顺序"],
      ["连续叙事", "组织开场、展开、转折和收束"],
      ["编辑拼贴", "让每张卡既独立又保持连续节奏"],
    ],
    renderer: "carousel",
  },
  {
    id: "T04",
    category: "编辑出版与多页作品",
    title: "六页视觉小志",
    short: "封面 + 六页 + PDF",
    summary: "把同一段经历组织成有页面职责的连续作品。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "六页 · 4:5",
    contextLabel: "故事短句",
    contextPlaceholder: "可选：这段经历最重要的是什么",
    factsTitle: "可以直接预览",
    factsCopy: "六张原图的数量和顺序恰好支持一条六页叙事。",
    outputs: ["独立封面", "六张 4:5 页面", "PDF 与分享缩略图"],
    capabilities: [
      ["事实卡提取", "锁定人物、物件、地点与事件顺序"],
      ["页面规划", "分配封面、开场、转折和收束职责"],
      ["跨页视觉", "共享颜色、留白、mark 与照片顺序"],
    ],
    renderer: "zine",
  },
  {
    id: "T05",
    category: "卡片、票券与小型印刷品",
    title: "明信片系列",
    short: "3–6 张正反面卡",
    summary: "让每张照片独立成卡，同时保持一个系列。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "系列卡 · 2:3",
    contextLabel: "背面留言",
    contextPlaceholder: "可选：署名或一句留言",
    factsTitle: "可以直接预览",
    factsCopy: "来源中的远景、人物、动作、物件和收束画面都能独立成为一张卡。",
    outputs: ["3–6 张正面图片", "对应背面留言版", "系列封面卡与印刷安全区"],
    capabilities: [
      ["照片选片", "按独立成卡能力选择画面"],
      ["系列适配", "统一边框、来源色和编号"],
      ["卡片封装", "生成正反面与安全区"],
    ],
    renderer: "postcard",
  },
  {
    id: "T06",
    category: "网页与互动数字页面",
    title: "滚动摄影故事页",
    short: "电脑网页滚动叙事",
    summary: "将远景、近景与物件组织成一条桌面网页故事。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "Desktop · 6 章节",
    contextLabel: "页面主题",
    contextPlaceholder: "可选：页面开场说明",
    factsTitle: "可以直接预览",
    factsCopy: "远景、人物动作和物件特写足以建立桌面滚动阅读顺序。",
    outputs: ["桌面网页 Hero", "六个滚动章节图", "1200×630 分享图"],
    capabilities: [
      ["场景排序", "按远景、动作、空间和物件组织章节"],
      ["网页叙事", "把照片节奏映射到滚动结构"],
      ["原图锁定", "动画不制造原图中不存在的动作"],
    ],
    renderer: "web",
  },
  {
    id: "T07",
    category: "屏幕、舞台与空间展示",
    title: "展厅 / 展会屏幕",
    short: "横屏或竖屏画面组",
    summary: "把来源照片适配成远距离观看的大屏画面。",
    level: "conditional",
    levelLabel: "条件推荐",
    spec: "16:9 大屏",
    contextLabel: "屏幕与场地规格",
    contextPlaceholder: "比例、分辨率、观看距离、是否循环",
    factsTitle: "需要场地规格",
    factsCopy: "图片适合大屏，但比例、距离和循环方式会直接改变结果。",
    outputs: ["指定比例主屏", "静态兜底画面", "真实标题安全区版"],
    capabilities: [
      ["空间取景", "为远距离观看选择清楚主体"],
      ["关系抽象", "从雨线、门槛和路径生成过场"],
      ["屏幕适配", "按指定比例和安全区生产"],
    ],
    renderer: "screen",
  },
  {
    id: "T08",
    category: "包装、表面与衍生品图面",
    title: "包装纸",
    short: "重复纹样 + 配色版",
    summary: "从原图中的物件、纹理、颜色和关系提炼可重复图案。",
    level: "conditional",
    levelLabel: "条件推荐",
    spec: "无缝纹样",
    contextLabel: "包装对象与尺寸",
    contextPlaceholder: "例如：A2 包装纸，用于小型书盒",
    factsTitle: "需要生产对象",
    factsCopy: "原图能提供图案元素，但重复尺度必须由包装对象决定。",
    outputs: ["无缝重复单元", "整张包装纸预览", "三种来源色配色"],
    capabilities: [
      ["元素提取", "提取最具辨识度的物件轮廓、纹理与颜色"],
      ["图案生成", "建立可重复的节奏和密度"],
      ["材料适配", "按印刷尺寸与颜色限制输出"],
    ],
    renderer: "pattern",
  },
  {
    id: "T09",
    category: "商业介绍与发布材料",
    title: "演示文稿视觉套页",
    short: "封面 + 章节 + 收尾",
    summary: "为用户已经明确的演示内容建立一套视觉页面。",
    level: "specified",
    levelLabel: "用户指定",
    spec: "16:9 套页",
    contextLabel: "演示目的与章节",
    contextPlaceholder: "面对谁、讲什么、希望达成什么",
    factsTitle: "不能仅凭原图推荐",
    factsCopy: "一组照片无法说明用户要演示什么，必须由用户先提出任务。",
    outputs: ["16:9 封面", "章节过场页", "收尾页图片底稿"],
    capabilities: [
      ["内容结构映射", "把用户章节映射到页面角色"],
      ["证据窗设计", "用原图支持而非替代真实内容"],
      ["套页生产", "统一封面、章节和收尾视觉"],
    ],
    renderer: "slides",
  },
  {
    id: "T10",
    category: "教育、研究与解释型成品",
    title: "构图讲解海报",
    short: "原图 + 标注 + 结论",
    summary: "用可追溯标注解释原图的构图或视觉关系。",
    level: "conditional",
    levelLabel: "条件推荐",
    spec: "A2 教学页",
    contextLabel: "教学主题",
    contextPlaceholder: "例如：视觉动线、冷暖对比或镜头顺序",
    factsTitle: "需要教学主题",
    factsCopy: "原图可被分析，但系统不能替用户决定想教什么。",
    outputs: ["A2 构图讲解海报", "16:9 讲解页", "无标注原图对照版"],
    capabilities: [
      ["构图分析", "读取轴线、焦点、方向和留白"],
      ["关系标注", "把观察转成可追溯的图形说明"],
      ["教学编排", "组织原图、标注和结论层级"],
    ],
    renderer: "teaching",
  },
  {
    id: "T11",
    category: "记忆、档案与文化叙事",
    title: "照片遗迹卡",
    short: "原图 + 材料转译 + 来源",
    summary: "同时展示原始照片证据与材料化转译。",
    level: "direct",
    levelLabel: "直接推荐",
    spec: "双面卡 · 2:3",
    contextLabel: "来源说明",
    contextPlaceholder: "可选：日期、地点或收藏信息",
    factsTitle: "可以直接预览",
    factsCopy: "来源中的人物、物件、材质和环境可以同时保留为照片证据与档案转译。",
    outputs: ["2:3 正反面遗迹卡", "原图与材料版对照", "来源说明区"],
    capabilities: [
      ["证据锁定", "保留至少一个可追溯原照窗口"],
      ["材料转译", "添加纸张、压印和磨损语言"],
      ["档案封装", "明确区分原图和转译层"],
    ],
    renderer: "relic",
  },
  {
    id: "T12",
    category: "多成品发布系统",
    title: "活动发布包",
    short: "海报 + 社交 + 屏幕 + 票券",
    summary: "让多个输出共享同一主视觉与来源规则。",
    level: "specified",
    levelLabel: "用户指定",
    spec: "4 类成品套件",
    contextLabel: "活动完整信息",
    contextPlaceholder: "活动名、日期、地点、渠道与票务信息",
    factsTitle: "不能仅凭原图推荐",
    factsCopy: "图片只能提供视觉素材，不能证明存在活动或自动生成活动事实。",
    outputs: ["A2 主海报", "4:5 社交卡", "16:9 屏幕与 2:1 票券"],
    capabilities: [
      ["主视觉系统", "选择跨载体保持不变的视觉锚点"],
      ["多尺寸派生", "分别处理海报、社交、屏幕和票券"],
      ["发布包封装", "共享真实信息、来源和验收规则"],
    ],
    renderer: "kit",
  },
];

const state = {
  sourceSet: "ceramic",
    selectedGoalId: "T05",
  tab: "recommended",
  direction: "photo",
  sourceImage: null,
  sampleResultImage: null,
  sampleResultReady: false,
  sourceReady: false,
  generated: false,
  generating: false,
  generationToken: 0,
  pipelineStates: [],
  customGoals: [],
};

const elements = {
  workspace: document.querySelector("#workspace"),
  sourceStatus: document.querySelector("#source-status"),
  sourceStatusCopy: document.querySelector("#source-status-copy"),
  sourceBoardImage: document.querySelector("#source-board-image"),
  sourceBoardTitle: document.querySelector("#source-board-title"),
  sourceBoardMeta: document.querySelector("#source-board-meta"),
  sourceSetList: document.querySelector("#source-set-list"),
  targetTabs: document.querySelector(".target-tabs"),
  recommendationNote: document.querySelector("#recommendation-note"),
  goalList: document.querySelector("#goal-list"),
  customGoalPanel: document.querySelector("#custom-goal-panel"),
  customFeedback: document.querySelector("#custom-feedback"),
  canvas: document.querySelector("#product-canvas"),
  canvasShell: document.querySelector("#canvas-shell"),
  canvasCover: document.querySelector("#canvas-cover"),
  previewModeLabel: document.querySelector("#preview-mode-label"),
  previewModeCopy: document.querySelector("#preview-mode-copy"),
  journeySource: document.querySelector("#journey-source"),
  journeyGoal: document.querySelector("#journey-goal"),
  journeyResult: document.querySelector("#journey-result"),
  journeyResultStep: document.querySelector("#journey-result-step"),
  resultCategory: document.querySelector("#result-category"),
  resultHeading: document.querySelector("#result-heading"),
  resultSummary: document.querySelector("#result-summary"),
  recommendationBadge: document.querySelector("#recommendation-badge"),
  specBadge: document.querySelector("#spec-badge"),
  directionButtons: document.querySelector("#direction-buttons"),
  titleInput: document.querySelector("#title-input"),
  contextField: document.querySelector("#context-field"),
  contextLabel: document.querySelector("#context-label"),
  contextRequirement: document.querySelector("#context-requirement"),
  contextInput: document.querySelector("#context-input"),
  contextError: document.querySelector("#context-error"),
  factsCard: document.querySelector("#facts-card"),
  factsTitle: document.querySelector("#facts-title"),
  factsCopy: document.querySelector("#facts-copy"),
  capabilityList: document.querySelector("#capability-list"),
  outputList: document.querySelector("#output-list"),
  generationStateTitle: document.querySelector("#generation-state-title"),
  generationStateCopy: document.querySelector("#generation-state-copy"),
  generateButton: document.querySelector("#generate-button"),
  downloadButton: document.querySelector("#download-button"),
  exportStatus: document.querySelector("#export-status"),
  toast: document.querySelector("#toast"),
};

function getGoal(id = state.selectedGoalId) {
  return [...goals, ...state.customGoals].find((goal) => goal.id === id) || goals[2];
}

function currentSource() {
  return sourceSets[state.sourceSet];
}

function applySourcePalette() {
  const colors = currentSource().colors;
  palette.rain = colors.rain;
  palette.amber = colors.amber;
  palette.teal = colors.teal;
  palette.mustard = colors.mustard;
  palette.paper = colors.paper;
  palette.cream = colors.paper;
}

function selectedPhotoIndex(sequenceIndex) {
  const indexes = currentSource().indexes;
  return indexes[sequenceIndex % indexes.length];
}

function cropCell(index) {
  const cellWidth = state.sourceImage.naturalWidth / SOURCE_COLUMNS;
  const cellHeight = state.sourceImage.naturalHeight / SOURCE_ROWS;
  const column = index % SOURCE_COLUMNS;
  const row = Math.floor(index / SOURCE_COLUMNS);
  const gutter = Math.max(2, Math.round(Math.min(cellWidth, cellHeight) * 0.006));
  return {
    x: column * cellWidth + gutter,
    y: row * cellHeight + gutter,
    width: cellWidth - gutter * 2,
    height: cellHeight - gutter * 2,
  };
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

function fillRounded(ctx, x, y, width, height, radius, fill) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function strokeRounded(ctx, x, y, width, height, radius, stroke, lineWidth = 2) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawPhoto(ctx, sequenceIndex, x, y, width, height, options = {}) {
  if (!state.sourceImage) return;
  const index = selectedPhotoIndex(sequenceIndex);
  const source = cropCell(index);
  const sourceRatio = source.width / source.height;
  const destinationRatio = width / height;
  let cropWidth = source.width;
  let cropHeight = source.height;
  if (sourceRatio > destinationRatio) cropWidth = source.height * destinationRatio;
  else cropHeight = source.width / destinationRatio;
  const zoom = options.zoom || 1;
  cropWidth /= zoom;
  cropHeight /= zoom;
  const sx = source.x + (source.width - cropWidth) / 2 + (options.offsetX || 0) * (source.width - cropWidth) * 0.45;
  const sy = source.y + (source.height - cropHeight) / 2 + (options.offsetY || 0) * (source.height - cropHeight) * 0.45;

  ctx.save();
  if (options.radius) {
    roundedRect(ctx, x, y, width, height, options.radius);
    ctx.clip();
  }
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(state.sourceImage, sx, sy, cropWidth, cropHeight, x, y, width, height);

  if (state.direction === "material") {
    ctx.fillStyle = options.materialColor || "rgba(12, 36, 50, 0.44)";
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = palette.paper;
    ctx.lineWidth = 1;
    for (let lineY = y + 12; lineY < y + height; lineY += 18) {
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY - 6);
      ctx.stroke();
    }
  }

  if (options.overlay) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = options.overlay;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();

  if (options.border) strokeRounded(ctx, x, y, width, height, options.radius || 0, options.border, options.borderWidth || 2);
}

function drawTitle(ctx, text, x, y, maxWidth, options = {}) {
  const size = options.size || 48;
  ctx.save();
  ctx.fillStyle = options.color || palette.ink;
  ctx.font = `${options.weight || 600} ${size}px "Songti SC", "Noto Serif SC", Georgia, serif`;
  ctx.textAlign = options.align || "left";
  const chars = Array.from(text || "未命名成品");
  const lines = [];
  let line = "";
  for (const char of chars) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length >= (options.maxLines || 2) - 1) break;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const lineHeight = options.lineHeight || size * 1.2;
  lines.slice(0, options.maxLines || 2).forEach((entry, index) => ctx.fillText(entry, x, y + index * lineHeight));
  ctx.restore();
}

function drawSmallText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color || palette.muted;
  ctx.font = `${options.weight || 600} ${options.size || 14}px Inter, "Microsoft YaHei", sans-serif`;
  ctx.textAlign = options.align || "left";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawLeaf(ctx, x, y, scale = 1, color = palette.mustard) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  if (state.sourceSet === "ceramic") {
    ctx.beginPath();
    ctx.moveTo(-11, -34);
    ctx.lineTo(11, -34);
    ctx.lineTo(14, -16);
    ctx.bezierCurveTo(34, -8, 36, 27, 18, 38);
    ctx.bezierCurveTo(8, 45, -8, 45, -18, 38);
    ctx.bezierCurveTo(-36, 27, -34, -8, -14, -16);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -34, 11, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (state.sourceSet === "robotics") {
    ctx.strokeRect(-30, -18, 60, 38);
    ctx.beginPath();
    ctx.arc(-14, 1, 7, 0, Math.PI * 2);
    ctx.arc(14, 1, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, 22);
    ctx.lineTo(-24, 34);
    ctx.moveTo(18, 22);
    ctx.lineTo(24, 34);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (state.sourceSet === "performance") {
    ctx.beginPath();
    ctx.arc(0, -4, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 15, 16, 28, 0, 0, Math.PI * 2);
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 44);
    ctx.moveTo(-28, -12);
    ctx.lineTo(28, 34);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(0, 42);
  ctx.lineTo(0, -30);
  ctx.stroke();
  for (let i = -22; i <= 22; i += 11) {
    ctx.beginPath();
    ctx.ellipse(i < 0 ? -11 : 11, i, 15, 7, i < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSecondaryMotif(ctx, x, y, color = palette.teal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  if (state.sourceSet === "ceramic") {
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (state.sourceSet === "robotics") {
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI * 2 / 3) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
    }
    ctx.stroke();
  } else if (state.sourceSet === "performance") {
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-30, 18);
    ctx.lineTo(-10, -15);
    ctx.lineTo(2, 2);
    ctx.lineTo(18, -24);
    ctx.lineTo(32, 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRainMarks(ctx, x, y, width, height, color = palette.teal) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.48;
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    const rx = x + ((i * 73) % Math.max(1, width));
    const ry = y + ((i * 47) % Math.max(1, height));
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 12, ry + 34);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanvasBackground(ctx, goal) {
  ctx.fillStyle = palette.studio;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  for (let x = 40; x < CANVAS_WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 40; y < CANVAS_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(7, 12, 15, 0.82)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 68);
  drawSmallText(ctx, "TARGET OUTPUT PREVIEW", 34, 42, { size: 13, color: palette.teal });
  drawSmallText(ctx, `${goal.id} · ${sourceSets[state.sourceSet].label} · ${directionLabel()}`, CANVAS_WIDTH - 34, 42, {
    size: 13,
    color: palette.muted,
    align: "right",
  });
}

function drawContainedImage(ctx, image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const areaRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (imageRatio > areaRatio) drawHeight = width / imageRatio;
  else drawWidth = height * imageRatio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
  ctx.shadowBlur = 28;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
  ctx.strokeStyle = "rgba(238, 240, 233, 0.26)";
  ctx.lineWidth = 2;
  ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
  return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
}

function drawGeneratedSample(ctx, goal) {
  const sample = currentSource().sampleResult;
  if (!state.generated || !state.sampleResultReady || !state.sampleResultImage || sample.goalId !== goal.id) return false;

  ctx.fillStyle = palette.studio;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "rgba(7, 12, 15, 0.9)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 68);
  drawSmallText(ctx, "GENERATED SAMPLE RESULT", 34, 42, { size: 13, color: palette.success });
  drawSmallText(ctx, `${sample.label} · 完整边缘`, CANVAS_WIDTH - 34, 42, { size: 13, color: palette.muted, align: "right" });
  drawContainedImage(ctx, state.sampleResultImage, 42, 88, CANVAS_WIDTH - 84, CANVAS_HEIGHT - 124);
  return true;
}

function directionLabel() {
  return { photo: "原图增强", collage: "编辑拼贴", material: "抽象材料" }[state.direction];
}

function decorateDirection(ctx, x, y, width, height) {
  if (state.direction === "photo") {
    ctx.fillStyle = palette.teal;
    ctx.fillRect(x, y + height - 8, width * 0.18, 8);
  }
  if (state.direction === "collage") {
    ctx.fillStyle = palette.amber;
    ctx.fillRect(x + width * 0.76, y - 12, width * 0.18, 26);
    drawPhoto(ctx, 4, x + width * 0.68, y + height * 0.65, width * 0.26, height * 0.24, {
      border: palette.paper,
      borderWidth: 5,
    });
  }
  if (state.direction === "material") {
    drawRainMarks(ctx, x + 16, y + 12, width - 32, height - 24, palette.amber);
    drawLeaf(ctx, x + width * 0.84, y + height * 0.74, Math.max(0.5, width / 700), palette.teal);
  }
}

function renderCover(ctx, goal) {
  const x = 120;
  const y = 116;
  const width = 960;
  const height = 540;
  fillRounded(ctx, x - 16, y - 16, width + 32, height + 32, 10, "#151f24");
  drawPhoto(ctx, 0, x, y, width, height, { overlay: "rgba(5, 12, 16, 0.38)" });
  if (state.direction === "collage") drawPhoto(ctx, 4, x + 650, y + 58, 230, 300, { border: palette.paper, borderWidth: 9 });
  drawSmallText(ctx, "PHOTO ESSAY / 01", x + 54, y + 58, { size: 14, color: palette.paper });
  drawTitle(ctx, elements.titleInput.value, x + 54, y + 390, 560, { size: 68, color: palette.cream, maxLines: 2 });
  drawSmallText(ctx, goal.category, x + 58, y + 486, { size: 14, color: palette.paper });
  decorateDirection(ctx, x, y, width, height);
}

function renderPoster(ctx) {
  const x = 410;
  const y = 86;
  const width = 380;
  const height = 620;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  drawPhoto(ctx, 0, x + 20, y + 20, width - 40, 390, { overlay: state.direction === "photo" ? "rgba(7, 12, 15, 0.12)" : undefined });
  ctx.fillStyle = palette.rain;
  ctx.fillRect(x + 20, y + 420, width - 40, 180);
  drawTitle(ctx, elements.titleInput.value, x + 42, y + 486, width - 84, { size: 42, color: palette.paper, maxLines: 2 });
  drawSmallText(ctx, "DATE / PLACE / INFORMATION", x + 44, y + 568, { size: 10, color: palette.teal });
  if (state.direction === "collage") drawPhoto(ctx, 4, x + 248, y + 320, 104, 132, { border: palette.paper, borderWidth: 5 });
  decorateDirection(ctx, x, y, width, height);
}

function renderCarousel(ctx) {
  const cardWidth = 220;
  const cardHeight = 360;
  const gap = 22;
  const total = cardWidth * 4 + gap * 3;
  const startX = (CANVAS_WIDTH - total) / 2;
  const y = 200;
  for (let i = 0; i < 4; i += 1) {
    const x = startX + i * (cardWidth + gap);
    ctx.save();
    ctx.translate(x + cardWidth / 2, y + cardHeight / 2);
    ctx.rotate((i - 1.5) * 0.012);
    ctx.translate(-cardWidth / 2, -cardHeight / 2);
    ctx.fillStyle = i % 2 ? palette.paper : palette.rain;
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    drawPhoto(ctx, i, 14, 14, cardWidth - 28, 228, { overlay: state.direction === "material" ? "rgba(207, 139, 42, 0.18)" : undefined });
    drawSmallText(ctx, `0${i + 1}`, 18, 275, { size: 11, color: i % 2 ? palette.inkSoft : palette.teal });
    drawTitle(ctx, i === 0 ? elements.titleInput.value : ["开门", "停留", "离开"][i - 1], 18, 316, cardWidth - 36, {
      size: i === 0 ? 27 : 24,
      color: i % 2 ? palette.ink : palette.paper,
      maxLines: 1,
    });
    ctx.restore();
  }
  if (state.direction === "collage") drawRainMarks(ctx, 120, 130, 960, 470, palette.amber);
}

function renderZine(ctx) {
  const pageWidth = 158;
  const pageHeight = 220;
  const gapX = 40;
  const gapY = 28;
  const totalWidth = pageWidth * 3 + gapX * 2;
  const startX = (CANVAS_WIDTH - totalWidth) / 2;
  const startY = 128;
  for (let i = 0; i < 6; i += 1) {
    const x = startX + (i % 3) * (pageWidth + gapX);
    const y = startY + Math.floor(i / 3) * (pageHeight + gapY);
    ctx.fillStyle = i === 0 || i === 5 ? palette.rain : palette.paper;
    ctx.fillRect(x, y, pageWidth, pageHeight);
    if (i === 0) {
      drawPhoto(ctx, 0, x, y, pageWidth, pageHeight, { overlay: "rgba(7, 12, 15, 0.48)" });
      drawTitle(ctx, elements.titleInput.value, x + 16, y + 150, pageWidth - 32, { size: 25, color: palette.paper, maxLines: 2 });
    } else {
      drawPhoto(ctx, i, x + 12, y + 12, pageWidth - 24, i === 4 ? 108 : 140);
      drawSmallText(ctx, `0${i + 1}`, x + 14, y + 178, { size: 9, color: i === 5 ? palette.teal : palette.mustard });
      ctx.fillStyle = i === 5 ? palette.paper : palette.ink;
      ctx.fillRect(x + 14, y + 190, pageWidth * 0.56, 3);
      ctx.fillRect(x + 14, y + 200, pageWidth * 0.38, 3);
    }
    strokeRounded(ctx, x, y, pageWidth, pageHeight, 0, "rgba(255,255,255,0.18)", 1);
  }
  if (state.direction === "material") drawLeaf(ctx, 875, 500, 1.15, palette.amber);
}

function renderPostcard(ctx) {
  const cards = [
    { x: 170, y: 154, r: -0.04, photo: 0 },
    { x: 435, y: 238, r: 0.02, photo: 3 },
    { x: 690, y: 138, r: -0.015, photo: 4 },
  ];
  cards.forEach((card, index) => {
    ctx.save();
    ctx.translate(card.x + 175, card.y + 125);
    ctx.rotate(card.r);
    ctx.translate(-175, -125);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, 350, 250);
    drawPhoto(ctx, card.photo, 12, 12, 326, 180);
    drawSmallText(ctx, index === 0 ? elements.titleInput.value : `POSTCARD 0${index + 1}`, 18, 224, { size: 13, color: palette.ink });
    ctx.restore();
  });
  if (state.direction === "collage") drawPhoto(ctx, 1, 510, 480, 180, 130, { border: palette.paper, borderWidth: 8 });
  if (state.direction === "material") drawRainMarks(ctx, 130, 115, 920, 440, palette.teal);
}

function renderWeb(ctx) {
  const x = 100;
  const y = 108;
  const width = 1000;
  const height = 560;
  fillRounded(ctx, x, y, width, height, 12, palette.paper);
  ctx.fillStyle = palette.ink;
  ctx.fillRect(x, y, width, 40);
  [0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.arc(x + 22 + i * 18, y + 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? palette.amber : palette.line;
    ctx.fill();
  });
  drawPhoto(ctx, 0, x + 20, y + 60, width - 40, 300, { overlay: "rgba(7,12,15,0.28)" });
  drawTitle(ctx, elements.titleInput.value, x + 58, y + 255, 520, { size: 56, color: palette.paper, maxLines: 2 });
  const cardY = y + 382;
  for (let i = 0; i < 3; i += 1) {
    drawPhoto(ctx, i + 1, x + 20 + i * 320, cardY, 290, 128);
  }
  if (state.direction === "material") drawLeaf(ctx, x + 890, y + 250, 1.1, palette.amber);
}

function renderScreen(ctx) {
  const x = 118;
  const y = 132;
  const width = 964;
  const height = 500;
  fillRounded(ctx, x - 14, y - 14, width + 28, height + 28, 12, "#1b262b");
  drawPhoto(ctx, 0, x, y, width, height, { overlay: "rgba(7,12,15,0.3)" });
  if (state.direction === "collage") {
    drawPhoto(ctx, 1, x + 680, y + 52, 220, 160, { border: palette.paper, borderWidth: 6 });
    drawPhoto(ctx, 4, x + 680, y + 236, 220, 160, { border: palette.paper, borderWidth: 6 });
  }
  drawTitle(ctx, elements.titleInput.value, x + 58, y + 340, 540, { size: 64, color: palette.paper, maxLines: 2 });
  ctx.fillStyle = "#1b262b";
  ctx.fillRect(540, 646, 120, 18);
  ctx.fillRect(480, 664, 240, 10);
  decorateDirection(ctx, x, y, width, height);
}

function renderPattern(ctx) {
  const x = 178;
  const y = 98;
  const width = 740;
  const height = 590;
  ctx.fillStyle = state.direction === "photo" ? palette.paper : palette.rain;
  ctx.fillRect(x, y, width, height);
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const px = x + 54 + col * 88 + (row % 2) * 28;
      const py = y + 46 + row * 92;
      const kind = (row + col) % 3;
      if (kind === 0) drawLeaf(ctx, px, py, 0.32, state.direction === "photo" ? palette.mustard : palette.amber);
      if (kind === 1) drawSecondaryMotif(ctx, px, py, palette.teal);
      if (kind === 2) {
        ctx.fillStyle = state.direction === "material" ? palette.paper : palette.rain;
        ctx.fillRect(px - 18, py - 28, 36, 56);
        ctx.fillStyle = palette.amber;
        ctx.fillRect(px - 13, py - 24, 4, 48);
      }
    }
  }
  ctx.save();
  ctx.translate(925, 118);
  ctx.rotate(0.08);
  ctx.fillStyle = palette.paperDeep;
  ctx.fillRect(0, 0, 92, 540);
  drawSmallText(ctx, "REPEAT", 46, 270, { size: 13, color: palette.ink, align: "center" });
  ctx.restore();
}

function renderSlides(ctx) {
  const x = 112;
  const y = 126;
  const mainW = 690;
  const mainH = 388;
  ctx.fillStyle = palette.rain;
  ctx.fillRect(x, y, mainW, mainH);
  drawPhoto(ctx, 0, x + 300, y, 390, mainH, { overlay: "rgba(7,12,15,0.18)" });
  drawSmallText(ctx, "PRESENTATION", x + 38, y + 54, { size: 12, color: palette.teal });
  drawTitle(ctx, elements.titleInput.value, x + 38, y + 230, 260, { size: 46, color: palette.paper, maxLines: 3 });
  for (let i = 0; i < 2; i += 1) {
    const sy = y + i * 208;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(832, sy, 260, 174);
    drawPhoto(ctx, i + 3, 846, sy + 14, 106, 146);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(972, sy + 38, 92, 5);
    ctx.fillRect(972, sy + 56, 74, 4);
    ctx.fillRect(972, sy + 92, 86, 3);
  }
  if (state.direction === "material") drawRainMarks(ctx, 80, 90, 1040, 520, palette.amber);
}

function renderTeaching(ctx) {
  const x = 208;
  const y = 90;
  const width = 784;
  const height = 610;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  drawSmallText(ctx, "COMPOSITION STUDY / SOURCE 01", x + 36, y + 46, { size: 12, color: palette.mustard });
  drawTitle(ctx, elements.titleInput.value, x + 36, y + 104, width - 72, { size: 42, color: palette.ink, maxLines: 1 });
  drawPhoto(ctx, 0, x + 36, y + 136, 458, 380);
  ctx.save();
  ctx.strokeStyle = palette.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 265, y + 136);
  ctx.lineTo(x + 265, y + 516);
  ctx.moveTo(x + 36, y + 326);
  ctx.lineTo(x + 494, y + 326);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 270, y + 350, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawSmallText(ctx, "FOCAL POINT", x + 530, y + 190, { size: 11, color: palette.teal });
  drawSmallText(ctx, "LIGHT / THRESHOLD", x + 530, y + 248, { size: 11, color: palette.ink });
  drawSmallText(ctx, "COLD / WARM", x + 530, y + 306, { size: 11, color: palette.ink });
  ctx.fillStyle = palette.rain;
  ctx.fillRect(x + 530, y + 338, 180, 72);
  drawRainMarks(ctx, x + 540, y + 346, 160, 50, palette.teal);
  drawLeaf(ctx, x + 626, y + 472, 0.65, palette.mustard);
  if (state.direction === "collage") drawPhoto(ctx, 4, x + 545, y + 438, 140, 100, { border: palette.paper, borderWidth: 5 });
}

function renderRelic(ctx) {
  const x = 224;
  const y = 105;
  const width = 752;
  const height = 570;
  ctx.fillStyle = palette.paperDeep;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = palette.mustard;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 20, y + 20, width - 40, height - 40);
  drawSmallText(ctx, "ARCHIVE / PHOTO RELIC", x + 44, y + 58, { size: 12, color: palette.mustard });
  drawPhoto(ctx, 4, x + 44, y + 86, 440, 366, { border: palette.paper, borderWidth: 9 });
  drawTitle(ctx, elements.titleInput.value, x + 520, y + 154, 180, { size: 38, color: palette.ink, maxLines: 3 });
  drawLeaf(ctx, x + 612, y + 342, 0.95, palette.mustard);
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i === 0 ? palette.teal : "rgba(17,26,30,0.28)";
    ctx.fillRect(x + 520, y + 438 + i * 18, 160 - i * 18, 3);
  }
  drawSmallText(ctx, "SOURCE 05 / GENERATED STUDY", x + 44, y + 514, { size: 10, color: palette.inkSoft });
  if (state.direction === "material") drawRainMarks(ctx, x + 34, y + 50, width - 68, height - 100, palette.amber);
}

function renderKit(ctx) {
  const posterX = 150;
  const posterY = 116;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(posterX, posterY, 250, 500);
  drawPhoto(ctx, 0, posterX + 12, posterY + 12, 226, 310, { overlay: "rgba(7,12,15,0.2)" });
  drawTitle(ctx, elements.titleInput.value, posterX + 26, posterY + 386, 200, { size: 32, color: palette.ink, maxLines: 2 });
  drawSmallText(ctx, "POSTER", posterX + 26, posterY + 466, { size: 10, color: palette.mustard });

  ctx.fillStyle = palette.rain;
  ctx.fillRect(458, 116, 260, 260);
  drawPhoto(ctx, 4, 472, 130, 232, 150);
  drawTitle(ctx, elements.titleInput.value, 478, 326, 220, { size: 25, color: palette.paper, maxLines: 1 });

  ctx.fillStyle = palette.paperDeep;
  ctx.fillRect(458, 412, 390, 110);
  drawSmallText(ctx, "TICKET / 01", 480, 450, { size: 11, color: palette.mustard });
  ctx.fillStyle = palette.ink;
  ctx.fillRect(480, 476, 210, 4);
  drawLeaf(ctx, 788, 466, 0.48, palette.teal);

  fillRounded(ctx, 760, 116, 300, 224, 6, "#1b262b");
  drawPhoto(ctx, 5, 774, 130, 272, 196, { overlay: "rgba(7,12,15,0.28)" });
  drawSmallText(ctx, "SCREEN", 1030, 322, { size: 9, color: palette.paper, align: "right" });

  ctx.fillStyle = palette.rain;
  ctx.fillRect(884, 396, 176, 220);
  drawPhoto(ctx, 1, 898, 410, 148, 114);
  drawSmallText(ctx, "SOCIAL", 902, 566, { size: 10, color: palette.teal });
  if (state.direction === "material") drawRainMarks(ctx, 120, 90, 960, 560, palette.amber);
}

function renderCustom(ctx, goal) {
  if (goal.format === "kit") return renderKit(ctx, goal);
  if (goal.format === "series") return renderCarousel(ctx, goal);
  const sizes = {
    portrait: [430, 600],
    landscape: [900, 480],
    square: [560, 560],
  };
  const [width, height] = sizes[goal.format] || sizes.landscape;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = 92 + (600 - height) / 2;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  drawPhoto(ctx, 0, x + 18, y + 18, width - 36, height * 0.62, { overlay: "rgba(7,12,15,0.2)" });
  drawTitle(ctx, elements.titleInput.value, x + 34, y + height * 0.76, width - 68, {
    size: Math.min(52, width / 9),
    color: palette.ink,
    maxLines: 2,
  });
  drawSmallText(ctx, `${goal.title} · ${goal.use}`, x + 36, y + height - 34, { size: 11, color: palette.mustard });
  decorateDirection(ctx, x, y, width, height);
}

const renderers = {
  cover: renderCover,
  poster: renderPoster,
  carousel: renderCarousel,
  zine: renderZine,
  postcard: renderPostcard,
  web: renderWeb,
  screen: renderScreen,
  pattern: renderPattern,
  slides: renderSlides,
  teaching: renderTeaching,
  relic: renderRelic,
  kit: renderKit,
  custom: renderCustom,
};

function drawPreview() {
  if (!state.sourceReady || !state.sourceImage) return;
  const ctx = elements.canvas.getContext("2d");
  if (!ctx) return;
  const goal = getGoal();
  if (drawGeneratedSample(ctx, goal)) return;
  drawCanvasBackground(ctx, goal);
  ctx.save();
  ctx.globalAlpha = state.generated ? 1 : 0.84;
  (renderers[goal.renderer] || renderCustom)(ctx, goal);
  ctx.restore();
  if (!state.generated) {
    fillRounded(ctx, 1018, 690, 144, 36, 18, "rgba(7,12,15,0.86)");
    drawSmallText(ctx, "结构预览", 1090, 714, { size: 12, color: palette.paper, align: "center" });
  }
}

function renderGoalList() {
  const source = currentSource();
  const visibleGoals = state.tab === "recommended"
    ? source.recommendations.map((id) => getGoal(id))
    : [...goals, ...state.customGoals];

  elements.goalList.innerHTML = visibleGoals.map((goal) => `
    <button type="button" class="goal-card${goal.id === state.selectedGoalId ? " is-selected" : ""}" data-goal-id="${goal.id}" aria-pressed="${goal.id === state.selectedGoalId}">
      <span class="goal-index">${goal.id}</span>
      <span class="goal-copy"><strong>${goal.title}</strong><small>${goal.short}</small></span>
      <span class="goal-level">${goal.levelLabel}</span>
    </button>
  `).join("");
}

function goalPipeline(goal) {
  return [
    ["原图理解", `读取${currentSource().indexes.length}张照片的主体、顺序与可保留区域`],
    ...goal.capabilities,
    ["确定性合成与 QA", "放回真实文字，检查来源、尺寸与输出清单"],
  ];
}

function renderCapabilities() {
  const pipeline = goalPipeline(getGoal());
  if (state.pipelineStates.length !== pipeline.length) state.pipelineStates = pipeline.map(() => "pending");
  elements.capabilityList.innerHTML = pipeline.map((capability, index) => {
    const itemState = state.pipelineStates[index] || "pending";
    const stateLabel = { pending: "待执行", active: "进行中", done: "完成" }[itemState];
    return `
      <div class="capability-item" data-state="${itemState}">
        <span class="capability-number">${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${capability[0]}</strong><small>${capability[1]}</small></span>
        <span class="capability-state">${stateLabel}</span>
      </div>
    `;
  }).join("");
}

function resetGeneration(copy = "能力组合只是执行方案；点击按钮才会生成结果。") {
  state.generationToken += 1;
  state.generating = false;
  state.generated = false;
  state.pipelineStates = goalPipeline(getGoal()).map(() => "pending");
  elements.generationStateTitle.textContent = "尚未生成";
  elements.generationStateCopy.textContent = copy;
  elements.previewModeLabel.textContent = "生成前样例";
  elements.previewModeCopy.textContent = "用于说明构图方向，不是最终结果";
  elements.journeyResultStep.dataset.state = "pending";
  elements.journeyResult.textContent = "等待开始生成";
  elements.downloadButton.disabled = true;
  elements.exportStatus.textContent = "尚未生成可下载文件。";
  renderCapabilities();
  drawPreview();
}

function updateGoalUI({ resetContext = true } = {}) {
  const goal = getGoal();
  elements.resultCategory.textContent = goal.category;
  elements.resultHeading.textContent = goal.title;
  elements.resultSummary.textContent = goal.summary;
  elements.journeySource.textContent = `${currentSource().label} · 6 张`;
  elements.journeyGoal.textContent = goal.title;
  elements.recommendationBadge.textContent = goal.levelLabel;
  elements.specBadge.textContent = goal.spec;
  elements.contextLabel.textContent = goal.contextLabel;
  elements.contextInput.placeholder = goal.contextPlaceholder;
  elements.contextRequirement.textContent = goal.level === "direct" ? "可选" : "必填";
  elements.factsCard.dataset.level = goal.level;
  elements.factsTitle.textContent = goal.factsTitle;
  elements.factsCopy.textContent = goal.factsCopy;
  elements.outputList.innerHTML = goal.outputs.map((output) => `<li>${output}</li>`).join("");
  if (resetContext) elements.contextInput.value = goal.defaultContext || "";
  clearContextError();
  renderGoalList();
  resetGeneration();
}

function clearContextError() {
  elements.contextField.dataset.error = "false";
  elements.contextError.textContent = "";
}

function selectGoal(id) {
  state.selectedGoalId = id;
  updateGoalUI();
}

function switchTab(tab) {
  state.tab = tab;
  elements.targetTabs.querySelectorAll("[role=tab]").forEach((button) => {
    const selected = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const custom = tab === "custom";
  elements.goalList.hidden = custom;
  elements.customGoalPanel.hidden = !custom;
  elements.recommendationNote.hidden = custom;
  if (!custom) {
    elements.goalList.setAttribute("aria-labelledby", tab === "all" ? "tab-all" : "tab-recommended");
    renderGoalList();
  }
}

function setSourceSet(id) {
  if (!sourceSets[id]) return;
  state.sourceSet = id;
  elements.sourceSetList.querySelectorAll("[data-source-set]").forEach((button) => {
    const selected = button.dataset.sourceSet === id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  elements.recommendationNote.textContent = sourceSets[id].note;
  elements.sourceBoardTitle.textContent = sourceSets[id].title;
  elements.sourceBoardMeta.textContent = sourceSets[id].meta;
  elements.titleInput.value = sourceSets[id].title;
  elements.contextInput.value = "";
  applySourcePalette();
  if (state.tab === "recommended") {
    state.selectedGoalId = sourceSets[id].recommendations[0];
    updateGoalUI();
  } else {
    resetGeneration("原图范围已改变，请重新组合能力。 ");
  }
  loadSource();
}

function customCapabilities(format, preserve) {
  const capabilities = [];
  if (preserve === "high") capabilities.push(["原图锁定", "以真实照片为主，只改变版式与文字层"]);
  if (preserve === "medium") capabilities.push(["编辑拼贴", "允许多图裁切、组合和节奏重构"]);
  if (preserve === "low") capabilities.push(["抽象转译", "允许从颜色、形状和关系生成视觉层"]);
  if (["series", "kit"].includes(format)) capabilities.push(["多输出规划", "先定义成员角色，再保持跨成品一致"]);
  else capabilities.push(["单一主视觉", "从来源中选择一个清楚的视觉锚点"]);
  capabilities.push(["目标适配", "按用户指定的位置、比例和数量生产"]);
  return capabilities;
}

function createCustomGoal(event) {
  event.preventDefault();
  const form = new FormData(elements.customGoalPanel);
  const name = String(form.get("name") || "").trim();
  const use = String(form.get("use") || "").trim();
  const format = String(form.get("format") || "portrait");
  const count = Math.max(1, Math.min(12, Number(form.get("count")) || 1));
  const preserve = String(form.get("preserve") || "high");
  if (!name || !use) {
    elements.customFeedback.textContent = "请填写想得到的成品和使用位置。";
    return;
  }
  const id = `C${String(state.customGoals.length + 1).padStart(2, "0")}`;
  const formatLabels = { portrait: "竖版单图", landscape: "横版单图", square: "方形单图", series: "连续组图", kit: "多成品套件" };
  const customGoal = {
    id,
    category: "用户定制目标",
    title: name,
    short: `${formatLabels[format]} · ${count} 份`,
    summary: `按“${use}”的真实使用位置定制结果。`,
    level: "specified",
    levelLabel: "用户指定",
    spec: `${formatLabels[format]} · ${count} 份`,
    contextLabel: "使用说明",
    contextPlaceholder: "补充真实文字、渠道或生产限制",
    defaultContext: use,
    factsTitle: "目标由用户明确",
    factsCopy: `系统不猜用途；将按“${use}”组合适合的能力和输出形态。`,
    outputs: [`${formatLabels[format]}预览`, `${count} 份目标输出`, "PNG 预览与能力组合清单"],
    capabilities: customCapabilities(format, preserve),
    renderer: "custom",
    format,
    count,
    preserve,
    use,
  };
  state.customGoals.push(customGoal);
  state.selectedGoalId = id;
  elements.customFeedback.textContent = `已创建 ${id}，并选择“${name}”。`;
  updateGoalUI();
  showToast(`已创建并选择定制目标：${name}`);
}

function validateRequiredFields() {
  const goal = getGoal();
  const title = elements.titleInput.value.trim();
  const context = elements.contextInput.value.trim();
  clearContextError();
  if (!title) {
    elements.titleInput.focus();
    elements.titleInput.closest(".field-stack").dataset.error = "true";
    showToast("请先填写成品标题。 ");
    return false;
  }
  elements.titleInput.closest(".field-stack").dataset.error = "false";
  if (goal.level !== "direct" && !context) {
    elements.contextField.dataset.error = "true";
    elements.contextError.textContent = `${goal.contextLabel}是该目标的必要输入，系统不能从原图中虚构。`;
    elements.contextInput.focus();
    return false;
  }
  return true;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function generateProduct() {
  if (!state.sourceReady || state.generating || !validateRequiredFields()) return;
  const token = ++state.generationToken;
  const pipeline = goalPipeline(getGoal());
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = reduceMotion ? 25 : 320;
  state.generating = true;
  state.generated = false;
  elements.generateButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.canvasCover.hidden = false;
  elements.canvasShell.dataset.state = "generating";
  elements.generationStateTitle.textContent = "正在生成结果";
  elements.previewModeLabel.textContent = "生成中";
  elements.previewModeCopy.textContent = "正在按执行方案组合输入、改造与目标适配";
  elements.journeyResultStep.dataset.state = "active";
  elements.journeyResult.textContent = "能力正在执行";
  elements.exportStatus.textContent = "正在生成目标预览…";

  for (let index = 0; index < pipeline.length; index += 1) {
    if (token !== state.generationToken) return;
    state.pipelineStates = pipeline.map((_, itemIndex) => itemIndex < index ? "done" : itemIndex === index ? "active" : "pending");
    renderCapabilities();
    elements.canvasCover.querySelector("strong").textContent = pipeline[index][0];
    elements.canvasCover.querySelector("p").textContent = pipeline[index][1];
    elements.generationStateCopy.textContent = `${index + 1} / ${pipeline.length} · ${pipeline[index][0]}`;
    await wait(delay);
  }

  if (token !== state.generationToken) return;
  state.pipelineStates = pipeline.map(() => "done");
  state.generating = false;
  state.generated = true;
  renderCapabilities();
  drawPreview();
  elements.canvasCover.hidden = true;
  elements.canvasShell.dataset.state = "complete";
  elements.generateButton.disabled = false;
  elements.downloadButton.disabled = false;
  elements.previewModeLabel.textContent = "结果已生成";
  elements.previewModeCopy.textContent = currentSource().sampleResult.goalId === getGoal().id && state.sampleResultReady
    ? "ImageGen 样例结果 · 已完整适配到可视区域"
    : "当前目标结果 · 已完整适配到可视区域";
  elements.journeyResultStep.dataset.state = "done";
  elements.journeyResult.textContent = "完整结果可下载";
  elements.generationStateTitle.textContent = "完整结果已生成";
  elements.generationStateCopy.textContent = `${getGoal().title} · ${directionLabel()} · ${currentSource().label}`;
  elements.exportStatus.textContent = "PNG 结果已准备，可以下载。";
  showToast("目标产物已经生成。 ");
}

function downloadPreview() {
  if (!state.generated) return;
  elements.canvas.toBlob((blob) => {
    if (!blob) {
      showToast("当前浏览器无法生成 PNG。 ");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = getGoal().title.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-|-$/g, "") || "target-preview";
    link.href = url;
    link.download = `${getGoal().id}-${safeTitle}.png`;
    link.click();
    URL.revokeObjectURL(url);
    elements.exportStatus.textContent = `已导出 ${link.download}`;
    showToast(`已下载 ${link.download}`);
  }, "image/png");
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function setDirection(direction) {
  if (!["photo", "collage", "material"].includes(direction)) return;
  state.direction = direction;
  elements.directionButtons.querySelectorAll("[data-direction]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.direction === direction));
  });
  resetGeneration("改造方向已改变，请重新组合能力。 ");
}

function loadSampleResult() {
  const sourceId = state.sourceSet;
  const sample = currentSource().sampleResult;
  state.sampleResultImage = null;
  state.sampleResultReady = false;
  const image = new Image();
  image.onload = () => {
    if (state.sourceSet !== sourceId) return;
    state.sampleResultImage = image;
    state.sampleResultReady = true;
    if (state.generated) drawPreview();
  };
  image.onerror = () => {
    if (state.sourceSet !== sourceId) return;
    state.sampleResultImage = null;
    state.sampleResultReady = false;
  };
  image.src = sample.url;
}

function fitCanvasToShell() {
  const shellStyle = window.getComputedStyle(elements.canvasShell);
  const availableWidth = Math.max(1, elements.canvasShell.clientWidth
    - parseFloat(shellStyle.paddingLeft)
    - parseFloat(shellStyle.paddingRight));
  const availableHeight = Math.max(1, elements.canvasShell.clientHeight
    - parseFloat(shellStyle.paddingTop)
    - parseFloat(shellStyle.paddingBottom));
  const scale = Math.min(availableWidth / CANVAS_WIDTH, availableHeight / CANVAS_HEIGHT);
  elements.canvas.style.width = `${Math.floor(CANVAS_WIDTH * scale)}px`;
  elements.canvas.style.height = `${Math.floor(CANVAS_HEIGHT * scale)}px`;
}

function handleSourceLoaded(image) {
  state.sourceImage = image;
  state.sourceReady = true;
  elements.workspace.dataset.state = "ready";
  elements.sourceStatus.dataset.state = "ready";
  elements.sourceStatusCopy.textContent = "系统原图已就绪 · 6 张";
  elements.canvasShell.dataset.state = "ready";
  elements.canvasCover.hidden = true;
  elements.generateButton.disabled = false;
  fitCanvasToShell();
  drawPreview();
}

function handleSourceError() {
  state.sourceReady = false;
  elements.workspace.dataset.state = "error";
  elements.sourceStatus.dataset.state = "error";
  elements.sourceStatusCopy.textContent = "系统原图不可用";
  elements.canvasShell.dataset.state = "error";
  elements.canvasCover.hidden = false;
  elements.canvasCover.querySelector(".loader").style.display = "none";
  elements.canvasCover.querySelector("strong").textContent = "无法读取系统原图";
  elements.canvasCover.querySelector("p").textContent = "已停止生成与下载；请恢复来源文件后重试。";
  elements.generateButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.exportStatus.textContent = "来源错误：没有生成任何文件。";
}

function loadSource() {
  const query = new URLSearchParams(window.location.search);
  const url = query.get("source") === "missing"
    ? "./missing-system-source.png"
    : currentSource().url;
  loadSampleResult();
  state.sourceReady = false;
  state.sourceImage = null;
  elements.workspace.dataset.state = "loading";
  elements.sourceStatus.dataset.state = "loading";
  elements.sourceStatusCopy.textContent = `正在载入${currentSource().label}`;
  elements.canvasCover.hidden = false;
  elements.canvasCover.querySelector(".loader").style.display = "block";
  elements.canvasCover.querySelector("strong").textContent = "正在准备系统原图";
  elements.canvasCover.querySelector("p").textContent = "来源核对完成后可以生成成品。";
  elements.generateButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.sourceBoardImage.src = url;
  const image = new Image();
  image.decoding = "async";
  image.onload = () => handleSourceLoaded(image);
  image.onerror = handleSourceError;
  image.src = url;
}

elements.sourceSetList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-source-set]");
  if (button) setSourceSet(button.dataset.sourceSet);
});

elements.targetTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (button) switchTab(button.dataset.tab);
});

elements.targetTabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const tabs = Array.from(elements.targetTabs.querySelectorAll("[role=tab]"));
  const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(current + delta + tabs.length) % tabs.length];
  switchTab(next.dataset.tab);
  next.focus();
});

elements.goalList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-goal-id]");
  if (button) selectGoal(button.dataset.goalId);
});

elements.customGoalPanel.addEventListener("submit", createCustomGoal);

elements.directionButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-direction]");
  if (button) setDirection(button.dataset.direction);
});

elements.titleInput.addEventListener("input", () => {
  elements.titleInput.closest(".field-stack").dataset.error = "false";
  resetGeneration("标题已改变，请重新组合能力。 ");
});

elements.contextInput.addEventListener("input", () => {
  clearContextError();
  if (state.generated) resetGeneration("真实内容已改变，请重新组合能力。 ");
});

elements.generateButton.addEventListener("click", generateProduct);
elements.downloadButton.addEventListener("click", downloadPreview);

if ("ResizeObserver" in window) {
  const canvasResizeObserver = new ResizeObserver(fitCanvasToShell);
  canvasResizeObserver.observe(elements.canvasShell);
} else {
  window.addEventListener("resize", fitCanvasToShell);
}

renderGoalList();
applySourcePalette();
elements.recommendationNote.textContent = currentSource().note;
updateGoalUI({ resetContext: false });
switchTab("recommended");
loadSource();
