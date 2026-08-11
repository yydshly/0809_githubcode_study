import {
  multiSourceExperimentsBySlug,
  multiSourceSkillSummaries,
  type MultiSourceExperiment,
} from "@/app/data/multi-source-experiments";
import { revision12ProductSystemExperiments } from "@/app/data/revision12-product-system-experiments";
import { skills } from "@/app/data/skills";

export type SelectionDimension = "purpose" | "fidelity" | "path" | "format";

type SelectionOption<Value extends string> = {
  value: "all" | Value;
  label: string;
  description: string;
};

export type SelectionPurpose = "story-editorial" | "relation-analysis" | "memory-archive" | "campaign-poster" | "product-system";
export type SelectionFidelity = "evidence-window" | "relation-only" | "full-redraw" | "pixel-preserving-hybrid";
export type SelectionPath = "generated-visual" | "hybrid-composite" | "code-native";
export type SelectionFormat = "single-visual" | "editorial-page" | "series-system" | "screen-exhibition" | "print-product";

export type SkillSelectionFilters = {
  purpose: "all" | SelectionPurpose;
  fidelity: "all" | SelectionFidelity;
  path: "all" | SelectionPath;
  format: "all" | SelectionFormat;
};

export type RawSkillSelectionFilters = Partial<Record<SelectionDimension, string | readonly string[] | null | undefined>>;

export const selectionOptions = {
  purpose: [
    { value: "all", label: "全部目的", description: "不限定最终要解决的传播或研究任务。" },
    { value: "story-editorial", label: "人物与故事编辑", description: "把人物、地点或事件组织成有叙事中心的编辑视觉。" },
    { value: "relation-analysis", label: "关系与结构解释", description: "把方向、密度、遮挡、节奏或空间关系变成可讨论的视觉语言。" },
    { value: "memory-archive", label: "记忆与档案叙事", description: "用重绘、遗迹或场景蒸馏处理时间、地点和物件记忆。" },
    { value: "campaign-poster", label: "海报与传播主视觉", description: "优先寻找具有单一焦点、材料语言或高识别度的传播路线。" },
    { value: "product-system", label: "多载体产品系统", description: "把同一效果继续适配到网页、屏幕、出版物、卡片或展陈表面。" },
  ] satisfies readonly SelectionOption<SelectionPurpose>[],
  fidelity: [
    { value: "all", label: "全部真实性契约", description: "不限定 SOURCE 在结果中承担的角色。" },
    { value: "evidence-window", label: "保留照片证据窗", description: "结果保留可见照片区域，但当前本地概念不自动等于像素锁定。" },
    { value: "relation-only", label: "只保留关系", description: "主动放弃照片像素与身份细节，用 mark、隐喻或代码关系重新表达。" },
    { value: "full-redraw", label: "完整重绘", description: "用插画、半调或材料语言重构画面，不承诺摄影级保真。" },
    { value: "pixel-preserving-hybrid", label: "目标要求像素保留", description: "目标契约要求照片区由确定性流程嵌入；本地 R12 是否做到需单独查看。" },
  ] satisfies readonly SelectionOption<SelectionFidelity>[],
  path: [
    { value: "all", label: "全部处理路径", description: "不限定视觉生成、混合合成或代码原生路线。" },
    { value: "generated-visual", label: "生成式视觉", description: "主要通过图像生成或生成式重绘建立视觉结果。" },
    { value: "hybrid-composite", label: "照片与面板混合", description: "照片证据、生成面板和后置排版分别承担不同责任。" },
    { value: "code-native", label: "代码原生", description: "使用 HTML、CSS 或 SVG 表达关系并支持确定性检查。" },
  ] satisfies readonly SelectionOption<SelectionPath>[],
  format: [
    { value: "all", label: "全部产品化形态", description: "不限定效果准备进入的载体；形态只表示适配方向，不表示已经生产。" },
    { value: "single-visual", label: "单张封面或主视觉", description: "用于封面、主海报或单张传播视觉。" },
    { value: "editorial-page", label: "摄影编辑页、章节页或折页", description: "用于跨页、章节、长文或折页中的图文分工。" },
    { value: "series-system", label: "多成员系列、季度／年度系统", description: "用于多个成员、多个周期或多载体之间保持共同视觉语法。" },
    { value: "screen-exhibition", label: "网站、屏幕、展览或教学界面", description: "用于响应式网页、演示屏、展陈或教学解释界面。" },
    { value: "print-product", label: "包装、卡片、明信片与印刷产品", description: "用于需要尺寸、出血、正反面或材料验证的印刷载体。" },
  ] satisfies readonly SelectionOption<SelectionFormat>[],
} as const;

export const options = selectionOptions;

type SkillSelectionBlueprint = {
  skillSlug: string;
  purposes: readonly SelectionPurpose[];
  fidelity: SelectionFidelity;
  path: SelectionPath;
  formats: readonly SelectionFormat[];
  reason: string;
  tradeoff: string;
  nextValidation: {
    title:
      | "A · 识别与语义回收"
      | "B · 来源保真与篡改拒绝"
      | "C · 单变量与系列一致性"
      | "D · 可量化渲染与材料边界"
      | "E · 产品功能与真实使用链";
    experiment: string;
    failsWhen: string;
  };
};

const selectionBlueprints: readonly SkillSelectionBlueprint[] = [
  {
    skillSlug: "daily-photo-playground",
    purposes: ["story-editorial", "campaign-poster", "product-system"],
    fidelity: "evidence-window",
    path: "generated-visual",
    formats: ["single-visual", "editorial-page", "series-system"],
    reason: "适合把人物、现场颜色和完整照片窗拆成有能量的编辑层，让同一故事跨封面、网页和社交表面保持识别。",
    tradeoff: "照片窗在本地概念中只承担视觉证据，不证明人物身份、商品颜色或源文件像素被锁定。",
    nextValidation: {
      title: "C · 单变量与系列一致性",
      experiment: "锁定同一人物 SOURCE，每轮只改变版式分割、来源色占比或照片窗尺度中的一个变量；再固定视觉语法更换多个来源，检查系列身份。",
      failsWhen: "每版同时改变多个变量，无法解释差异来源；或更换 SOURCE 后只能靠复制同一构图维持 Daily 的系列识别。",
    },
  },
  {
    skillSlug: "dyy-photo-deconstruct",
    purposes: ["relation-analysis", "campaign-poster", "product-system"],
    fidelity: "relation-only",
    path: "generated-visual",
    formats: ["editorial-page", "screen-exhibition"],
    reason: "适合把动作、路径和接触关系压缩成极少 mark，并为大量文字或空纸留出空间。",
    tradeoff: "它主动丢弃面孔、材质和精确尺度，不能承担身份、导航、安全或工程信息。",
    nextValidation: {
      title: "A · 识别与语义回收",
      experiment: "对同一交汇 SOURCE 制作 mark 数量与路径方向的受控变体，让未看原图的读者判断汇入、让行、载荷和停靠关系。",
      failsWhen: "读者只能描述极简装饰，无法回收到预先声明的关系；或新增 mark 没有改善理解。",
    },
  },
  {
    skillSlug: "travel-photo-abstraction",
    purposes: ["story-editorial", "relation-analysis", "product-system"],
    fidelity: "pixel-preserving-hybrid",
    path: "hybrid-composite",
    formats: ["editorial-page", "screen-exhibition", "print-product"],
    reason: "适合让照片负责事实、抽象面板负责解释采光、动线、重量和间隔等关系。",
    tradeoff: "R12 仍是生成式概念照片窗，未完成目标契约要求的确定性嵌入和像素校验。",
    nextValidation: {
      title: "B · 来源保真与篡改拒绝",
      experiment: "记录授权 SOURCE 的 hash，并让确定性合成器同时检查正常候选与故意改像素、裁切、替换店招或调换成员的候选。",
      failsWhen: "篡改候选仍被判定通过；或只能目测照片相似，无法说明来源字节、缩放与裁切规则。",
    },
  },
  {
    skillSlug: "scenes-gathered-zine",
    purposes: ["story-editorial", "memory-archive", "product-system"],
    fidelity: "evidence-window",
    path: "hybrid-composite",
    formats: ["editorial-page", "series-system", "screen-exhibition"],
    reason: "适合把多个时段或场景围绕一条结构关系聚合成服务旅程、口述史或地点故事。",
    tradeoff: "多人和敏感场景需要逐项授权、隐私审查与照片锁定；拼贴本身不证明事件顺序或项目成效。",
    nextValidation: {
      title: "B · 来源保真与篡改拒绝",
      experiment: "为每个成员 SOURCE 记录 hash、授权状态和既定顺序，构造正常拼贴及裁切、替换、漏项、调序候选并运行确定性门禁。",
      failsWhen: "缺失或调换成员的候选仍通过；或视觉连贯被误当成事件顺序、同意与来源完整性的证明。",
    },
  },
  {
    skillSlug: "scene-distillation-zine",
    purposes: ["relation-analysis", "memory-archive", "campaign-poster", "product-system"],
    fidelity: "relation-only",
    path: "generated-visual",
    formats: ["single-visual", "editorial-page"],
    reason: "适合完全移除照片，用中心张力、空位、节奏和色锚表达一个情绪或事件命题。",
    tradeoff: "它不保留人物、地点和业务事实，必须由独立文字或档案层承担可核验内容。",
    nextValidation: {
      title: "A · 识别与语义回收",
      experiment: "锁定同一 SOURCE 和预写情绪命题，仅改变中心张力、留白或色锚之一，让盲读者复述事件方向与情绪关系。",
      failsWhen: "读者只能描述氛围和装饰，无法回收预先声明的命题；或增加视觉元素并未提高语义一致性。",
    },
  },
  {
    skillSlug: "gc-minimal-zine-poster",
    purposes: ["campaign-poster", "relation-analysis", "product-system"],
    fidelity: "relation-only",
    path: "generated-visual",
    formats: ["single-visual", "series-system", "screen-exhibition"],
    reason: "适合把主题编译成单一隐喻、高彩锚点和大面积留白，为活动或品牌信息预留稳定空间。",
    tradeoff: "不适合承载大量事实或精确对象信息；标题、议程和 CTA 必须由可访问排版层后置加入。",
    nextValidation: {
      title: "C · 单变量与系列一致性",
      experiment: "同一 brief 每轮只改变隐喻数量、色锚面积或留白比例之一；随后固定语法更换多个主题 brief，检查系列身份与信息区稳定性。",
      failsWhen: "每版同时重写隐喻、颜色和构图而无法归因；或不同主题必须重复同一对象才能保持系列一致。",
    },
  },
  {
    skillSlug: "photo-revival",
    purposes: ["story-editorial", "memory-archive", "product-system"],
    fidelity: "full-redraw",
    path: "generated-visual",
    formats: ["editorial-page", "series-system", "print-product"],
    reason: "适合把人物、建筑或旧物完整重画成轻量记忆插画，并只保留少数可叙事细节。",
    tradeoff: "重绘不证明面孔、材质、商品状态或历史细节准确，真实档案必须同时保留授权原照。",
    nextValidation: {
      title: "C · 单变量与系列一致性",
      experiment: "锁定同一 SOURCE，仅改变记忆细节数量或材料比例；再以固定重绘语法处理多份授权来源，由当事人逐项核验约定记忆点。",
      failsWhen: "无法判断反应来自细节数量还是整体画风；或系列一致只能靠复制人物与场景，而约定记忆点持续丢失。",
    },
  },
  {
    skillSlug: "pixel-style-poster",
    purposes: ["campaign-poster", "product-system"],
    fidelity: "full-redraw",
    path: "generated-visual",
    formats: ["single-visual", "series-system", "print-product"],
    reason: "适合用细点阵、网频和有限套色把材料、光影与主体层级变成强识别海报语言。",
    tradeoff: "不保证身份或成员数量完整，也没有真实网版、纸张吸墨、套印偏差和摩尔纹打样证据。",
    nextValidation: {
      title: "D · 可量化渲染与材料边界",
      experiment: "预先冻结网频、最小点、套色、着墨与缩略可见性阈值，建立通过、失败和边界 fixture；材料结论另做真实打印与扫描。",
      failsWhen: "阈值在看完结果后才移动；屏幕半调被称为网印证明；或打印扫描暴露摩尔纹、糊点与套印问题却仍判定通过。",
    },
  },
  {
    skillSlug: "photo-relic-editorial",
    purposes: ["story-editorial", "memory-archive", "product-system"],
    fidelity: "evidence-window",
    path: "hybrid-composite",
    formats: ["editorial-page", "screen-exhibition", "print-product"],
    reason: "适合让照片事实区与单一 relic 面板分工，使一个物件或结构成为跨出版、展陈和网页的记忆锚。",
    tradeoff: "R12 照片区尚未像素锁定，也不证明藏品年代、来源、真伪或品牌历史。",
    nextValidation: {
      title: "B · 来源保真与篡改拒绝",
      experiment: "记录事件照片 hash，分别构造正常照片区和改像素、裁切、换物件或调换时间顺序的候选，再检查确定性嵌入与 relic 映射。",
      failsWhen: "被篡改的事件区仍通过；或单一 relic 的叙事说服力被误当成藏品真伪、年代与来源链证明。",
    },
  },
  {
    skillSlug: "photo-distill",
    purposes: ["relation-analysis", "campaign-poster", "product-system"],
    fidelity: "relation-only",
    path: "code-native",
    formats: ["series-system", "screen-exhibition"],
    reason: "适合把方向、密度、节拍和异常映射为可版本化的 HTML、CSS 或 SVG，并建立本地自动检查。",
    tradeoff: "关系量仍需要人工或真实数据定义；当前只验证本地代码图形，不是上游运行、实时仪表盘或业务结论。",
    nextValidation: {
      title: "D · 可量化渲染与材料边界",
      experiment: "冻结关系参数、色锚、字体与渲染配置，建立明显通过、明显失败和边界 fixture，并在实际运行的多个浏览器中比较结构与 hash。",
      failsWhen: "阈值在看完输出后才调整；未运行的浏览器被写成通过；或本地虚构参数被误称为实时运营数据。",
    },
  },
  {
    skillSlug: "poetic-line-zine-poster",
    purposes: ["story-editorial", "campaign-poster", "product-system"],
    fidelity: "pixel-preserving-hybrid",
    path: "hybrid-composite",
    formats: ["editorial-page", "screen-exhibition", "print-product"],
    reason: "适合让照片证据与 gesture、mass、rhythm、path 无字面板分工，兼顾现场与诗性解释。",
    tradeoff: "R12 没有完成照片区像素锁定；真实报告还需要确定性合成、独立排字和事实数据审核。",
    nextValidation: {
      title: "B · 来源保真与篡改拒绝",
      experiment: "记录 SOURCE hash 和照片责任区，构造正常候选及改像素、裁切、替换标题、调换成员的候选，分别检查脚本合成与结构门禁。",
      failsWhen: "篡改照片或结构缺项仍通过；或人工审美判断被拿来替代来源字节、缩放、裁切与成员顺序验证。",
    },
  },
  {
    skillSlug: "photo-abstract-editorial",
    purposes: ["story-editorial", "relation-analysis", "product-system"],
    fidelity: "pixel-preserving-hybrid",
    path: "hybrid-composite",
    formats: ["editorial-page", "screen-exhibition"],
    reason: "适合从照片中挑选少量可见事实，并以 mark 解释轴线、遮挡、视线、流向和重心。",
    tradeoff: "关系映射属于编辑解释，R12 照片窗也未像素锁定，不能替代测绘、工程或安全文件。",
    nextValidation: {
      title: "A · 识别与语义回收",
      experiment: "锁定同一 SOURCE，制作事实数量、mark 数量和关系映射的受控变体，让未看原图的读者判断轴线、遮挡、视线、流向与重心。",
      failsWhen: "读者只能描述抽象装饰，无法回收到预先声明的关系；或新增 mark 没有改善理解并引入错误事实。",
    },
  },
  {
    skillSlug: "photo-to-zine-postcard",
    purposes: ["story-editorial", "memory-archive", "product-system"],
    fidelity: "pixel-preserving-hybrid",
    path: "hybrid-composite",
    formats: ["series-system", "print-product"],
    reason: "适合把照片、单一 motif、三枚来源色和可书写背面组织成明确的双面产品系统。",
    tradeoff: "当前只有数字预演，照片锁定、变量数据、二维码、出血、纸张、书写和真实邮寄都未测试。",
    nextValidation: {
      title: "E · 产品功能与真实使用链",
      experiment: "先用结构化虚构记录测试变量字段、二维码、长短姓名、文字溢出、正反面与多尺寸；升级生产结论前再打印、裁切、书写和寄送。",
      failsWhen: "产品只换外框而没有变量功能；二维码不可扫、裁切破坏信息或无法书写；或未制作实物便声称可生产与可寄送。",
    },
  },
] as const;

export type CommonSelectionTask = {
  id: string;
  title: string;
  description: string;
  filters: SkillSelectionFilters;
};

export const commonTasks: readonly CommonSelectionTask[] = [
  {
    id: "person-story-with-evidence",
    title: "把人物现场做成故事编辑页",
    description: "希望保留一处照片证据，同时把人物、环境和来源色扩成完整数字传播页面。",
    filters: { purpose: "story-editorial", fidelity: "evidence-window", path: "all", format: "editorial-page" },
  },
  {
    id: "deterministic-relations",
    title: "把复杂现场压成可回归关系图",
    description: "重点是方向、密度、节拍和异常，而不是对象外观或照片像素。",
    filters: { purpose: "relation-analysis", fidelity: "relation-only", path: "code-native", format: "screen-exhibition" },
  },
  {
    id: "archive-memory-system",
    title: "为档案或周年内容建立记忆系统",
    description: "需要照片锚点与抽象余韵分工，并继续适配到出版、展陈或网页。",
    filters: { purpose: "memory-archive", fidelity: "evidence-window", path: "hybrid-composite", format: "series-system" },
  },
  {
    id: "high-impact-campaign",
    title: "快速探索高识别传播主视觉",
    description: "优先寻找生成式隐喻、色场或材料语言，并接受它不是事实与身份保真路线。",
    filters: { purpose: "campaign-poster", fidelity: "all", path: "generated-visual", format: "single-visual" },
  },
  {
    id: "photo-led-product-suite",
    title: "保留照片契约并扩成多载体系统",
    description: "目标是照片与生成面板分工，再推进到网页、屏幕、出版物或卡片的数字预演。",
    filters: { purpose: "product-system", fidelity: "pixel-preserving-hybrid", path: "hybrid-composite", format: "print-product" },
  },
];

export type RepresentativeEvidence = {
  cohortLabel: string;
  title: string;
  status: MultiSourceExperiment["status"];
  finding: string;
  href: string;
};

export type EnrichedSkillSelectionEntry = SkillSelectionBlueprint & {
  index: string;
  name: string;
  targetContract: string;
  localR12Status: "成立" | "部分成立";
  evidenceHref: string;
  detailHref: string;
  comparisonHref: string;
  pairCount: number;
  uniqueSourcePathCount: number;
  upstreamExecution: { state: "not-recorded"; label: string };
  productEvidence: { state: "digital-product-preview"; label: string };
  physicalEvidence: { state: "not-tested"; label: string };
  publicHosting: { state: "blocked"; label: string };
  representativeEvidence: readonly [RepresentativeEvidence, RepresentativeEvidence, RepresentativeEvidence];
  skill: (typeof skills)[number];
  revision12: (typeof revision12ProductSystemExperiments)[number];
  summary: (typeof multiSourceSkillSummaries)[number];
};

function requireOne<T>(items: readonly T[], description: string): T {
  if (items.length !== 1) throw new Error(`Skill selection guide expected exactly one ${description}; found ${items.length}.`);
  return items[0];
}

function toRepresentativeEvidence(entry: MultiSourceExperiment): RepresentativeEvidence {
  return {
    cohortLabel: entry.cohortLabel,
    title: entry.title,
    status: entry.status,
    finding: entry.finding,
    href: `/labs/multi-source?skill=${entry.skillSlug}#${entry.id}`,
  };
}

const skillSlugs = new Set(skills.map((skill) => skill.slug));
const blueprintSlugs = new Set(selectionBlueprints.map((entry) => entry.skillSlug));

if (skills.length !== 13 || selectionBlueprints.length !== 13 || skillSlugs.size !== 13 || blueprintSlugs.size !== 13) {
  throw new Error("Skill selection guide must contain exactly 13 unique Skill slugs.");
}

for (const slug of skillSlugs) {
  if (!blueprintSlugs.has(slug)) throw new Error(`Skill selection guide is missing ${slug}.`);
}
for (const slug of blueprintSlugs) {
  if (!skillSlugs.has(slug)) throw new Error(`Skill selection guide references unknown Skill ${slug}.`);
}

const formatSignatures = new Set(selectionBlueprints.map((entry) => [...entry.formats].sort().join("|")));
if (formatSignatures.size <= 1 || selectionBlueprints.some((entry) => entry.formats.length === 0)) {
  throw new Error("Skill selection guide formats must be non-empty and differentiated across Skill entries.");
}

type ValidationTitle = SkillSelectionBlueprint["nextValidation"]["title"];

const expectedValidationTitles = new Set<ValidationTitle>([
  "A · 识别与语义回收",
  "B · 来源保真与篡改拒绝",
  "C · 单变量与系列一致性",
  "D · 可量化渲染与材料边界",
  "E · 产品功能与真实使用链",
]);
const validationTitles = new Set<ValidationTitle>(selectionBlueprints.map((entry) => entry.nextValidation.title));
if (validationTitles.size !== expectedValidationTitles.size || [...expectedValidationTitles].some((title) => !validationTitles.has(title))) {
  throw new Error("Skill selection guide must cover all five Revision 13 falsifiable validation classes.");
}

const commonTaskIds = new Set(commonTasks.map((task) => task.id));
const commonTaskFormats = new Set(commonTasks.map((task) => task.filters.format));
if (commonTasks.length !== 5 || commonTaskIds.size !== 5 || commonTaskFormats.size !== 5 || commonTaskFormats.has("all")) {
  throw new Error("Skill selection guide must expose five unique common tasks covering all five product formats.");
}

export const enrichedSkillSelectionEntries: readonly EnrichedSkillSelectionEntry[] = selectionBlueprints.map((blueprint) => {
  const skill = requireOne(skills.filter((entry) => entry.slug === blueprint.skillSlug), `Skill record for ${blueprint.skillSlug}`);
  const revision12 = requireOne(
    revision12ProductSystemExperiments.filter((entry) => entry.skillSlug === blueprint.skillSlug),
    `Revision 12 record for ${blueprint.skillSlug}`,
  );
  const summary = requireOne(
    multiSourceSkillSummaries.filter((entry) => entry.slug === blueprint.skillSlug),
    `multi-source summary for ${blueprint.skillSlug}`,
  );
  const multiSourceEntries = multiSourceExperimentsBySlug.get(blueprint.skillSlug) ?? [];
  const independentEntry = requireOne(
    multiSourceEntries.filter((entry) => entry.cohort === "independent"),
    `multi-source independent entry for ${blueprint.skillSlug}`,
  );
  const stressEntry = requireOne(
    multiSourceEntries.filter((entry) => entry.cohort === "stress"),
    `multi-source stress entry for ${blueprint.skillSlug}`,
  );
  const productSystemEntry = requireOne(
    multiSourceEntries.filter((entry) => entry.cohort === "product-system"),
    `multi-source product-system entry for ${blueprint.skillSlug}`,
  );
  const expectedEntryId = `product-system-${blueprint.skillSlug}-${revision12.id}`;
  if (productSystemEntry.id !== expectedEntryId) {
    throw new Error(`Skill selection guide expected ${expectedEntryId}; found ${productSystemEntry.id}.`);
  }

  return {
    ...blueprint,
    index: skill.index,
    name: skill.name,
    targetContract: skill.fidelity,
    localR12Status: revision12.status,
    evidenceHref: `/labs/multi-source?skill=${blueprint.skillSlug}#${productSystemEntry.id}`,
    detailHref: productSystemEntry.detailHref,
    comparisonHref: `/comparison#${blueprint.skillSlug}`,
    pairCount: summary.pairCount,
    uniqueSourcePathCount: summary.uniqueSourceCount,
    upstreamExecution: { state: "not-recorded", label: "上游运行：本研究无记录" },
    productEvidence: { state: "digital-product-preview", label: "产品阶段：数字环境预演" },
    physicalEvidence: { state: "not-tested", label: "实体生产：未测试" },
    publicHosting: { state: "blocked", label: "公开托管：权利清单完成前阻塞" },
    representativeEvidence: [
      toRepresentativeEvidence(independentEntry),
      toRepresentativeEvidence(stressEntry),
      toRepresentativeEvidence(productSystemEntry),
    ],
    skill,
    revision12,
    summary,
  };
});

const revision12Sources = enrichedSkillSelectionEntries.map((entry) => entry.revision12.source.src);
const revision12Effects = enrichedSkillSelectionEntries.map((entry) => entry.revision12.effect.src);
if (new Set(revision12Sources).size !== 13 || new Set(revision12Effects).size !== 13) {
  throw new Error("Skill selection guide must not reuse Revision 12 SOURCE or EFFECT paths across Skill entries.");
}

const forbiddenSelectionFieldNames = new Set(["score", "rank", "rating", "successrate"]);
function assertNoForbiddenSelectionFields(value: unknown, path = "skillSelectionGuide"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenSelectionFields(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replaceAll("-", "").replaceAll("_", "").toLowerCase();
    if (forbiddenSelectionFieldNames.has(normalizedKey)) {
      throw new Error(`Skill selection guide forbids quality-style field ${path}.${key}.`);
    }
    assertNoForbiddenSelectionFields(child, `${path}.${key}`);
  }
}

assertNoForbiddenSelectionFields(selectionOptions);
assertNoForbiddenSelectionFields(commonTasks);
assertNoForbiddenSelectionFields(enrichedSkillSelectionEntries);

const validFilterValues: Record<SelectionDimension, ReadonlySet<string>> = {
  purpose: new Set(selectionOptions.purpose.map((option) => option.value)),
  fidelity: new Set(selectionOptions.fidelity.map((option) => option.value)),
  path: new Set(selectionOptions.path.map((option) => option.value)),
  format: new Set(selectionOptions.format.map((option) => option.value)),
};

function normalizeFilterValue(dimension: SelectionDimension, rawValue: string | readonly string[] | null | undefined): string {
  const candidate = (Array.isArray(rawValue) ? rawValue[0] : rawValue)?.trim();
  return candidate && validFilterValues[dimension].has(candidate) ? candidate : "all";
}

export function normalizeSelectionFilters(filters: RawSkillSelectionFilters = {}): SkillSelectionFilters {
  return {
    purpose: normalizeFilterValue("purpose", filters.purpose) as SkillSelectionFilters["purpose"],
    fidelity: normalizeFilterValue("fidelity", filters.fidelity) as SkillSelectionFilters["fidelity"],
    path: normalizeFilterValue("path", filters.path) as SkillSelectionFilters["path"],
    format: normalizeFilterValue("format", filters.format) as SkillSelectionFilters["format"],
  };
}

function mismatchDimensions(entry: EnrichedSkillSelectionEntry, filters: SkillSelectionFilters): SelectionDimension[] {
  const mismatches: SelectionDimension[] = [];
  if (filters.purpose !== "all" && !entry.purposes.includes(filters.purpose)) mismatches.push("purpose");
  if (filters.fidelity !== "all" && entry.fidelity !== filters.fidelity) mismatches.push("fidelity");
  if (filters.path !== "all" && entry.path !== filters.path) mismatches.push("path");
  if (filters.format !== "all" && !entry.formats.includes(filters.format)) mismatches.push("format");
  return mismatches;
}

export type SkillSelectionResultItem = EnrichedSkillSelectionEntry & {
  mismatchDimensions: readonly SelectionDimension[];
};

export type SkillSelectionResults = {
  mode: "all" | "exact" | "nearest";
  filters: SkillSelectionFilters;
  activeDimensions: readonly SelectionDimension[];
  results: readonly SkillSelectionResultItem[];
  explanation: string;
};

export function getSkillSelectionResults(rawFilters: RawSkillSelectionFilters = {}): SkillSelectionResults {
  const filters = normalizeSelectionFilters(rawFilters);
  const dimensions: readonly SelectionDimension[] = ["purpose", "fidelity", "path", "format"];
  const activeDimensions = dimensions.filter((dimension) => filters[dimension] !== "all");
  const candidates = enrichedSkillSelectionEntries.map((entry) => ({
    ...entry,
    mismatchDimensions: mismatchDimensions(entry, filters),
  }));

  if (activeDimensions.length === 0) {
    return {
      mode: "all",
      filters,
      activeDimensions,
      results: candidates,
      explanation: "当前未限定选择条件，按研究目录顺序展示全部 13 个 Skill；这不是质量排序。",
    };
  }

  const exact = candidates.filter((entry) => entry.mismatchDimensions.length === 0);
  if (exact.length > 0) {
    return {
      mode: "exact",
      filters,
      activeDimensions,
      results: exact,
      explanation: "这些 Skill 与当前已选条件完全匹配；匹配只说明研究路径适合，不代表效果质量高低。",
    };
  }

  const fewestMismatches = Math.min(...candidates.map((entry) => entry.mismatchDimensions.length));
  return {
    mode: "nearest",
    filters,
    activeDimensions,
    results: candidates.filter((entry) => entry.mismatchDimensions.length === fewestMismatches),
    explanation: "没有 Skill 同时满足全部条件；下列候选仅按不一致维度最少返回，并逐项公开 mismatchDimensions，不是质量排名。",
  };
}
