import { revision7CapabilityExplorationsBySlug } from "@/app/data/revision7-capability-explorations";
import { skills } from "@/app/data/skills";

export type ResearchSurface = {
  id: string;
  title: string;
  href: string;
  role: string;
  summary: string;
  answers: string;
  continuesTo: readonly { label: string; href: string }[];
};

export type ResearchDocument = {
  id: string;
  group: "入口与范围" | "来源与方法" | "实验运行" | "结果与维护";
  title: string;
  repositoryPath: string;
  role: string;
  readWhen: string;
  relatedRoutes: readonly { label: string; href: string }[];
};

export const researchSurfaces: readonly ResearchSurface[] = [
  {
    id: "research-atlas",
    title: "研究总索引",
    href: "/research",
    role: "网页、文档与证据关系总入口",
    summary: "先解释 12 个仓库、13 个目标和各类证据的关系，再把读者路由到适合当前问题的页面或文档。",
    answers: "整个项目有哪些网页和文档，它们如何互相支撑，我应该从哪里开始。",
    continuesTo: [{ label: "进入 Skill 视觉目录", href: "/" }],
  },
  {
    id: "skill-chooser",
    title: "Skill 选择工作台",
    href: "/choose",
    role: "任务、真实性、技术路径与产品形态反向选择",
    summary: "不做质量排名，而是把 13 条路线的目标契约、本地 R12 结论、匹配原因、差异与证据入口放在同一决策流中。",
    answers: "我已经知道要解决什么问题，但不知道该先选哪个 Skill，以及为什么。",
    continuesTo: [{ label: "查看完整多来源证据", href: "/labs/multi-source" }],
  },
  {
    id: "skill-catalog",
    title: "13 个 Skill 直接目录",
    href: "/skills",
    role: "13 张独立长页的可视化入口",
    summary: "不经过首页长篇介绍，直接查看 13 个 Skill，并进入各自的上游 Demo、扩展实验、使用场景与产品应用。",
    answers: "我想先知道有哪些 Skill，以及每一条路线大致在做什么。",
    continuesTo: [{ label: "进入首页总览", href: "/" }],
  },
  {
    id: "skill-pages",
    title: "13 个单 Skill 深度页",
    href: "/skills/daily-photo-playground",
    role: "逐项能力、样例、场景与边界",
    summary: "每页同时解释上游样例、本地统一输入、跨题材实验、用途、限制和下一轮问题。",
    answers: "我想完整理解一个 Skill，而不是只看一张效果图。",
    continuesTo: [{ label: "选择一个 Skill", href: "/skills" }],
  },
  {
    id: "comparison",
    title: "统一原图横评",
    href: "/comparison",
    role: "同一来源 × 13 条路线",
    summary: "固定同一张湖岸输入，比较 13 个 Skill 如何改变真实性契约、抽象方式和产品形态。",
    answers: "输入不变时，不同 Skill 的能力差异到底在哪里。",
    continuesTo: [{ label: "看多来源证据", href: "/labs/multi-source" }],
  },
  {
    id: "multi-source",
    title: "多原图实验室",
    href: "/labs/multi-source",
    role: "127 组图片输入与效果配对",
    summary: "把分散证据与三轮各 13 组独立输入统一成按 Skill 阅读的批量研究；最新一轮把效果继续处理成完整产品系统与使用环境。",
    answers: "同一个 Skill 换成人物、静物、城市、建筑或业务约束后，哪些能力仍成立，效果又如何进入完整产品系统。",
    continuesTo: [{ label: "阅读方法与结论", href: "/reports/revision-7" }],
  },
  {
    id: "revision-7-report",
    title: "Revision 7 研究报告",
    href: "/reports/revision-7",
    role: "12 个 Skill × 24 个跨题材问题",
    summary: "集中阅读新输入下的结论、意外损失、不证明事项和进入真实生产前仍需完成的工作。",
    answers: "这些效果究竟证明了什么，又有哪些结论不能从图片中推出。",
    continuesTo: [{ label: "返回研究总索引", href: "/research" }],
  },
];

export const researchDocuments: readonly ResearchDocument[] = [
  {
    id: "root-catalog",
    group: "入口与范围",
    title: "根 README.md",
    repositoryPath: "README.md",
    role: "整个多项目仓库的人类可读目录，说明本研究子项目在根仓库中的位置。",
    readWhen: "从仓库根目录寻找研究项目时",
    relatedRoutes: [{ label: "研究总索引", href: "/research" }],
  },
  {
    id: "research-index",
    group: "入口与范围",
    title: "RESEARCH-INDEX.md",
    repositoryPath: "projects/skill-zine-summary/RESEARCH-INDEX.md",
    role: "网页与 Markdown 的离线总地图，也是本页的长期文档镜像。",
    readWhen: "不知道该从哪一份材料开始时",
    relatedRoutes: [{ label: "研究总索引", href: "/research" }],
  },
  {
    id: "project-readme",
    group: "入口与范围",
    title: "README.md",
    repositoryPath: "projects/skill-zine-summary/README.md",
    role: "说明研究对象、阶段结论、目录与整体许可边界。",
    readWhen: "第一次进入子项目时",
    relatedRoutes: [{ label: "Skill 视觉目录", href: "/" }],
  },
  {
    id: "research-log",
    group: "入口与范围",
    title: "RESEARCH.md",
    repositoryPath: "projects/skill-zine-summary/RESEARCH.md",
    role: "记录研究决定、证据、开放问题与历史判断。",
    readWhen: "需要理解为什么采用当前研究路线时",
    relatedRoutes: [{ label: "研究总索引", href: "/research" }],
  },
  {
    id: "upstream",
    group: "来源与方法",
    title: "UPSTREAM.md",
    repositoryPath: "projects/skill-zine-summary/UPSTREAM.md",
    role: "固定上游 URL、commit、许可证和可用边界。",
    readWhen: "准备运行、引用、复制或公开分享任何上游内容前",
    relatedRoutes: [{ label: "13 个详情页", href: "/#research-index" }],
  },
  {
    id: "inventory",
    group: "来源与方法",
    title: "INVENTORY.md",
    repositoryPath: "projects/skill-zine-summary/INVENTORY.md",
    role: "解释 14 条汇总记录、12 个去重仓库与 13 个 Skill 研究目标的映射。",
    readWhen: "核对研究对象与技术卡时",
    relatedRoutes: [{ label: "Skill 视觉目录", href: "/" }],
  },
  {
    id: "technical-map",
    group: "来源与方法",
    title: "TECHNICAL-MAP.md",
    repositoryPath: "projects/skill-zine-summary/TECHNICAL-MAP.md",
    role: "整理中间表示、三类执行后端、真实性契约和 QA 谱系。",
    readWhen: "想从架构而不是画风理解这些 Skill 时",
    relatedRoutes: [{ label: "统一原图横评", href: "/comparison" }],
  },
  {
    id: "learning-roadmap",
    group: "来源与方法",
    title: "LEARNING-ROADMAP.md",
    repositoryPath: "projects/skill-zine-summary/LEARNING-ROADMAP.md",
    role: "把阅读、最小实验、产出和验收组织成学习阶段。",
    readWhen: "要把当前资料转为可执行学习计划时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "lab-readme",
    group: "实验运行",
    title: "lab/README.md",
    repositoryPath: "projects/skill-zine-summary/lab/README.md",
    role: "说明固定检出、实验资产、Web 站与本地研究边界。",
    readWhen: "准备进入实验环境时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "original-samples",
    group: "实验运行",
    title: "lab/ORIGINAL-SAMPLES.md",
    repositoryPath: "projects/skill-zine-summary/lab/ORIGINAL-SAMPLES.md",
    role: "索引固定上游提交中真正存在的公开样例。",
    readWhen: "需要区分上游证据与本地效果时",
    relatedRoutes: [{ label: "单 Skill 上游样例", href: "/#research-index" }],
  },
  {
    id: "runbook",
    group: "实验运行",
    title: "lab/RUNBOOK.md",
    repositoryPath: "projects/skill-zine-summary/lab/RUNBOOK.md",
    role: "定义获取、审查、运行、记录和复核实验的操作步骤。",
    readWhen: "准备新增一次可追溯实验时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "records",
    group: "实验运行",
    title: "lab/records/README.md",
    repositoryPath: "projects/skill-zine-summary/lab/records/README.md",
    role: "规定单次实验记录的字段与台账方式。",
    readWhen: "需要让新增图片、输入、结论和边界可追溯时",
    relatedRoutes: [{ label: "批量证据入口", href: "/labs/multi-source" }],
  },
  {
    id: "web-readme",
    group: "结果与维护",
    title: "lab/web/README.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/README.md",
    role: "记录站点结构、运行命令、计数口径与发布限制。",
    readWhen: "运行或维护网页时",
    relatedRoutes: [{ label: "站点首页", href: "/" }],
  },
  {
    id: "revision7-research",
    group: "结果与维护",
    title: "lab/web/REVISION7-RESEARCH.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION7-RESEARCH.md",
    role: "Revision 7 的人类可读方法、逐 Skill 结论与限制。",
    readWhen: "需要脱离网页独立阅读 24 个跨题材结论时",
    relatedRoutes: [{ label: "Revision 7 网页报告", href: "/reports/revision-7" }],
  },
  {
    id: "revision7-assets",
    group: "结果与维护",
    title: "lab/web/REVISION7-ASSETS.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION7-ASSETS.md",
    role: "登记来源复用、效果路径、提示摘要、尺寸与生成边界。",
    readWhen: "核对某张 Revision 7 图片从哪里来时",
    relatedRoutes: [{ label: "Revision 7 网页报告", href: "/reports/revision-7" }],
  },
  {
    id: "revision10-independent-sources",
    group: "结果与维护",
    title: "lab/web/REVISION10-INDEPENDENT-SOURCES.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION10-INDEPENDENT-SOURCES.md",
    role: "登记 13 个 Skill 的独立 SOURCE、对应 EFFECT、能力问题、用途、结论与生产边界。",
    readWhen: "需要核对 Revision 10 为什么扩大来源、每张新图研究了什么时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "revision11-stress-and-applications",
    group: "结果与维护",
    title: "lab/web/REVISION11-STRESS-AND-APPLICATIONS.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION11-STRESS-AND-APPLICATIONS.md",
    role: "登记 13 个反向题材压力测试、SOURCE／EFFECT、产品数字预演、生产下一步与统一计数。",
    readWhen: "需要核对每个 Skill 如何从不同角度继续扩样，以及效果如何进入产品语境时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "revision12-product-systems",
    group: "结果与维护",
    title: "lab/web/REVISION12-PRODUCT-SYSTEMS.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION12-PRODUCT-SYSTEMS.md",
    role: "登记 13 个新题材、对应效果、完整产品表面、使用环境、生产步骤与诚实边界。",
    readWhen: "需要理解每个 Skill 的效果如何从单张视觉继续进入完整产品系统时",
    relatedRoutes: [{ label: "多原图实验室", href: "/labs/multi-source" }],
  },
  {
    id: "revision13-skill-chooser",
    group: "结果与维护",
    title: "lab/web/REVISION13-SKILL-CHOOSER.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REVISION13-SKILL-CHOOSER.md",
    role: "解释 13 个 Skill 的选择维度、证据状态、匹配边界与下一轮可证伪实验。",
    readWhen: "需要从真实任务反选 Skill，或核对选择器为何推荐、为何保留限制时",
    relatedRoutes: [{ label: "Skill 选择工作台", href: "/choose" }],
  },
  {
    id: "refinement",
    group: "结果与维护",
    title: "lab/web/REFINEMENT.md",
    repositoryPath: "projects/skill-zine-summary/lab/web/REFINEMENT.md",
    role: "记录页面迭代契约、实现证据、回归结果和未完成项。",
    readWhen: "维护页面或追踪某轮改动是否真的完成时",
    relatedRoutes: [{ label: "研究总索引", href: "/research" }],
  },
];

export const skillResearchLinks = skills.map((skill) => ({
  slug: skill.slug,
  index: skill.index,
  name: skill.name,
  repo: skill.repo,
  upstreamUrl: skill.upstreamUrl,
  route: skill.route,
  fidelity: skill.fidelity,
  summary: skill.summary,
  detailHref: `/skills/${skill.slug}`,
  comparisonHref: `/comparison#${skill.slug}`,
  reportHref: revision7CapabilityExplorationsBySlug[skill.slug]
    ? `/reports/revision-7#${skill.slug}`
    : `/skills/${skill.slug}#capability-explorations`,
  labHref: `/labs/multi-source?skill=${skill.slug}#selected-skill`,
}));

export const researchCatalogStats = {
  upstreamRepositories: new Set(skills.map((skill) => skill.repo)).size,
  skillTargets: skills.length,
  webSurfaces: researchSurfaces.length,
  documents: researchDocuments.length,
};
