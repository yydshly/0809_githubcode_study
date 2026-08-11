import { capabilityExplorationsBySlug } from "@/app/data/capability-explorations";
import type { CapabilityApplication } from "@/app/data/capability-explorations";
import { getDeliveredExperiments } from "@/app/data/delivered-experiments";
import { effectApplications } from "@/app/data/effect-applications";
import type { ProductApplicationCase } from "@/app/data/product-applications";
import { revision10IndependentExperiments } from "@/app/data/revision10-independent-experiments";
import { revision11StressExperiments } from "@/app/data/revision11-stress-experiments";
import { revision12ProductSystemExperiments } from "@/app/data/revision12-product-system-experiments";
import { skills, sourceImage, type DemoImage, type SkillStudy } from "@/app/data/skills";

export type MultiSourceCohort = "product-system" | "stress" | "independent" | "baseline" | "delivered" | "controlled" | "capability";

export type SourceLineage = {
  kind: "original-synthetic" | "derived-source" | "composite-board" | "prior-effect";
  label: string;
  note: string;
};

export type MultiSourceExperiment = {
  id: string;
  skillSlug: string;
  skillName: string;
  skillIndex: string;
  cohort: MultiSourceCohort;
  cohortLabel: string;
  title: string;
  question: string;
  source: DemoImage;
  effect: DemoImage;
  sourceLineage: SourceLineage;
  status: "基线证据" | "已交付" | "受控配对" | "成立" | "部分成立";
  method: string;
  finding: string;
  scenario: string;
  whyItFits: string;
  boundary: string;
  disclosure: string;
  contrast?: string;
  productionNext?: string;
  application?: CapabilityApplication;
  product?: Omit<ProductApplicationCase, "effect">;
  detailHref: string;
};

export type MultiSourceSkillSummary = {
  slug: string;
  index: string;
  name: string;
  route: string;
  fidelity: string;
  pairCount: number;
  uniqueSourceCount: number;
  cohortCounts: Record<MultiSourceCohort, number>;
};

const cohortLabels: Record<MultiSourceCohort, string> = {
  "product-system": "完整产品系统数字实验 · R12",
  stress: "反向题材压力测试 · R11",
  independent: "独立原图扩样 · R10",
  baseline: "统一原图基线",
  delivered: "计划交付实验",
  controlled: "受控输入配对",
  capability: "跨题材能力探索",
};

function sourceLineage(src: string): SourceLineage {
  if (src === sourceImage.src) {
    return {
      kind: "original-synthetic",
      label: "统一湖岸合成源",
      note: "同一来源被 13 个 Skill 的多种效果重复使用，用于控制输入变量；不能按效果数量重复计算为不同原图。",
    };
  }
  if (src.includes("daily-low-saturation-rain-source")) {
    return {
      kind: "derived-source",
      label: "确定性派生输入",
      note: "由既有本地合成图做可追溯的确定性变化，仍属于同一来源谱系。",
    };
  }
  if (src.includes("source-board") || src.includes("season-seed-library-source")) {
    return {
      kind: "composite-board",
      label: "多成员组合输入",
      note: "一个文件中包含多张成员图或多面产品，应按一个组合输入路径统计，并在单项实验内解释成员关系。",
    };
  }
  if (src.includes("/generated/results/")) {
    return {
      kind: "prior-effect",
      label: "既有效果再处理",
      note: "输入来自本研究已经生成的效果，用于印前、产品化或二次验证，不冒充新的摄影原图。",
    };
  }
  return {
    kind: "original-synthetic",
    label: "本地可控合成输入",
    note: "人物、地点或物件由本项目为研究构造；不对应真实人物、客户项目或新闻现场。",
  };
}

function detailHref(slug: string, cohort: MultiSourceCohort) {
  if (cohort === "capability") return `/skills/${slug}#capability-explorations`;
  if (cohort === "independent" || cohort === "stress" || cohort === "product-system") return `/skills/${slug}#product-studio`;
  return `/skills/${slug}#extension`;
}

function adaptProductSystem(skill: SkillStudy): MultiSourceExperiment[] {
  return revision12ProductSystemExperiments
    .filter((entry) => entry.skillSlug === skill.slug)
    .map((entry) => ({
      id: `product-system-${skill.slug}-${entry.id}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "product-system" as const,
      cohortLabel: cohortLabels["product-system"],
      title: entry.title,
      question: entry.question,
      source: entry.source,
      effect: entry.effect,
      sourceLineage: sourceLineage(entry.source.src),
      status: entry.status,
      method: entry.method,
      finding: entry.finding,
      scenario: entry.scenario,
      whyItFits: entry.whyItFits,
      boundary: entry.boundary,
      disclosure: entry.disclosure,
      contrast: entry.contrast,
      productionNext: entry.productionNext,
      product: entry.product,
      detailHref: detailHref(skill.slug, "product-system"),
    }));
}

function adaptStress(skill: SkillStudy): MultiSourceExperiment[] {
  return revision11StressExperiments
    .filter((entry) => entry.skillSlug === skill.slug)
    .map((entry) => ({
      id: `stress-${skill.slug}-${entry.id}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "stress" as const,
      cohortLabel: cohortLabels.stress,
      title: entry.title,
      question: entry.question,
      source: entry.source,
      effect: entry.effect,
      sourceLineage: sourceLineage(entry.source.src),
      status: entry.status,
      method: entry.method,
      finding: entry.finding,
      scenario: entry.scenario,
      whyItFits: entry.whyItFits,
      boundary: entry.boundary,
      disclosure: entry.disclosure,
      contrast: entry.contrast,
      productionNext: entry.productionNext,
      application: entry.application,
      detailHref: detailHref(skill.slug, "stress"),
    }));
}

function adaptIndependent(skill: SkillStudy): MultiSourceExperiment[] {
  return revision10IndependentExperiments
    .filter((entry) => entry.skillSlug === skill.slug)
    .map((entry) => ({
      id: `independent-${skill.slug}-${entry.id}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "independent" as const,
      cohortLabel: cohortLabels.independent,
      title: entry.title,
      question: entry.question,
      source: entry.source,
      effect: entry.effect,
      sourceLineage: sourceLineage(entry.source.src),
      status: entry.status,
      method: entry.method,
      finding: entry.finding,
      scenario: entry.scenario,
      whyItFits: entry.whyItFits,
      boundary: entry.boundary,
      disclosure: entry.disclosure,
      detailHref: detailHref(skill.slug, "independent"),
    }));
}

function adaptBaseline(skill: SkillStudy): MultiSourceExperiment[] {
  return skill.resultImages.map((effect, index) => {
    const application = effectApplications[effect.src];
    if (!application) throw new Error(`Missing EffectApplication for baseline ${effect.src}`);
    return {
      id: `baseline-${skill.slug}-${String(index + 1).padStart(2, "0")}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "baseline",
      cohortLabel: cohortLabels.baseline,
      title: `${application.title} · 基线 ${index + 1}`,
      question: `同一张湖岸来源进入「${skill.route}」路线后，哪些关系会被保留、重排或产品化？`,
      source: sourceImage,
      effect,
      sourceLineage: sourceLineage(sourceImage.src),
      status: "基线证据",
      method: skill.pipeline.join(" → "),
      finding: skill.proof,
      scenario: `${application.title}：${application.scenario}`,
      whyItFits: application.whyItFits,
      boundary: application.boundary,
      disclosure: "统一来源基线只控制输入，不代表每个效果都来自一张不同原图，也不是上游官方运行输出。",
      detailHref: detailHref(skill.slug, "baseline"),
    };
  });
}

function adaptDelivered(skill: SkillStudy): MultiSourceExperiment[] {
  return getDeliveredExperiments(skill.slug).flatMap((entry) => {
    if (entry.source.kind !== "image" || entry.effect.kind !== "image") return [];
    const finding = entry.acceptance.map((item) => `${item.criterion}：${item.outcome}`).join("；");
    return [{
      id: `delivered-${skill.slug}-${entry.id}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "delivered" as const,
      cohortLabel: cohortLabels.delivered,
      title: entry.title,
      question: entry.question,
      source: entry.source.image,
      effect: entry.effect.image,
      sourceLineage: sourceLineage(entry.source.image.src),
      status: entry.planStatus === "partial" ? "部分成立" as const : "已交付" as const,
      method: `${entry.method.label}：${entry.method.summary}`,
      finding,
      scenario: `${entry.application.title}：${entry.application.scenario}`,
      whyItFits: entry.application.whyItFits,
      boundary: entry.application.boundary,
      disclosure: entry.provenance.disclosure,
      detailHref: detailHref(skill.slug, "delivered"),
    }];
  });
}

function adaptControlled(skill: SkillStudy): MultiSourceExperiment[] {
  return (skill.extensionExperiments ?? []).map((entry, index) => {
    const application = effectApplications[entry.effect.src];
    if (!application) throw new Error(`Missing EffectApplication for controlled pair ${entry.effect.src}`);
    return {
      id: `controlled-${skill.slug}-${String(index + 1).padStart(2, "0")}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "controlled",
      cohortLabel: cohortLabels.controlled,
      title: entry.title,
      question: entry.question,
      source: entry.source,
      effect: entry.effect,
      sourceLineage: sourceLineage(entry.source.src),
      status: "受控配对",
      method: `${entry.recipe}；检查：${entry.checks.join("；")}`,
      finding: entry.primaryRelic,
      scenario: `${application.title}：${application.scenario}`,
      whyItFits: application.whyItFits,
      boundary: application.boundary,
      disclosure: "本地受控输入与本地研究效果；只说明当前配方在该题材上的概念表现，不代表上游官方运行或真实商业项目。",
      detailHref: detailHref(skill.slug, "controlled"),
    };
  });
}

function adaptCapability(skill: SkillStudy): MultiSourceExperiment[] {
  return (capabilityExplorationsBySlug[skill.slug] ?? []).map((entry) => {
    const conclusion = entry.conclusion;
    const product = entry.application
      ? `${entry.application.title}：${entry.application.context}`
      : entry.productDirections.join("；");
    return {
      id: `capability-${skill.slug}-${entry.id}`,
      skillSlug: skill.slug,
      skillName: skill.name,
      skillIndex: skill.index,
      cohort: "capability",
      cohortLabel: cohortLabels.capability,
      title: entry.title,
      question: entry.question,
      source: entry.source,
      effect: entry.effect,
      sourceLineage: sourceLineage(entry.source.src),
      status: conclusion?.status ?? "成立",
      method: entry.process.join(" → "),
      finding: conclusion?.finding ?? `保留：${entry.retained.join("；")}`,
      scenario: product,
      whyItFits: conclusion?.proves ?? `当前效果保留了：${entry.retained.join("；")}`,
      boundary: conclusion?.doesNotProve ?? `当前没有保留：${entry.discarded.join("；")}`,
      disclosure: "跨题材效果是本地概念研究，不是上游仓库实际运行后的官方输出；产品画布仅为数字预演。",
      detailHref: detailHref(skill.slug, "capability"),
    };
  });
}

export const multiSourceExperiments: readonly MultiSourceExperiment[] = skills.flatMap((skill) => [
  ...adaptProductSystem(skill),
  ...adaptStress(skill),
  ...adaptIndependent(skill),
  ...adaptBaseline(skill),
  ...adaptDelivered(skill),
  ...adaptControlled(skill),
  ...adaptCapability(skill),
]);

const independentExperiments = multiSourceExperiments.filter((entry) => entry.cohort === "independent");
const stressExperiments = multiSourceExperiments.filter((entry) => entry.cohort === "stress");
const productSystemExperiments = multiSourceExperiments.filter((entry) => entry.cohort === "product-system");
const duplicateIds = multiSourceExperiments.filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) !== index);
const duplicateEffects = multiSourceExperiments.filter((entry, index, entries) => entries.findIndex((candidate) => candidate.effect.src === entry.effect.src) !== index);
if (duplicateIds.length > 0) throw new Error(`Duplicate multi-source experiment ids: ${duplicateIds.map((entry) => entry.id).join(", ")}`);
if (duplicateEffects.length > 0) throw new Error(`Duplicate multi-source effect paths: ${duplicateEffects.map((entry) => entry.effect.src).join(", ")}`);
if (independentExperiments.length !== skills.length) throw new Error(`Revision 10 should expose one independent experiment per Skill; found ${independentExperiments.length}/${skills.length}`);
if (stressExperiments.length !== skills.length) throw new Error(`Revision 11 should expose one stress experiment per Skill; found ${stressExperiments.length}/${skills.length}`);
if (productSystemExperiments.length !== skills.length) throw new Error(`Revision 12 should expose one product-system experiment per Skill; found ${productSystemExperiments.length}/${skills.length}`);
for (const skill of skills) {
  const count = independentExperiments.filter((entry) => entry.skillSlug === skill.slug).length;
  if (count !== 1) throw new Error(`Revision 10 should expose exactly one independent experiment for ${skill.slug}; found ${count}`);
  const stressCount = stressExperiments.filter((entry) => entry.skillSlug === skill.slug).length;
  if (stressCount !== 1) throw new Error(`Revision 11 should expose exactly one stress experiment for ${skill.slug}; found ${stressCount}`);
  const productSystemCount = productSystemExperiments.filter((entry) => entry.skillSlug === skill.slug).length;
  if (productSystemCount !== 1) throw new Error(`Revision 12 should expose exactly one product-system experiment for ${skill.slug}; found ${productSystemCount}`);
}

export const multiSourceExperimentsBySlug = new Map(
  skills.map((skill) => [skill.slug, multiSourceExperiments.filter((entry) => entry.skillSlug === skill.slug)]),
);

export const multiSourceSkillSummaries: readonly MultiSourceSkillSummary[] = skills.map((skill) => {
  const entries = multiSourceExperimentsBySlug.get(skill.slug) ?? [];
  const cohortCounts: Record<MultiSourceCohort, number> = { "product-system": 0, stress: 0, independent: 0, baseline: 0, delivered: 0, controlled: 0, capability: 0 };
  entries.forEach((entry) => { cohortCounts[entry.cohort] += 1; });
  return {
    slug: skill.slug,
    index: skill.index,
    name: skill.name,
    route: skill.route,
    fidelity: skill.fidelity,
    pairCount: entries.length,
    uniqueSourceCount: new Set(entries.map((entry) => entry.source.src)).size,
    cohortCounts,
  };
});

const allDelivered = skills.flatMap((skill) => getDeliveredExperiments(skill.slug));
const textDrivenStaticCount = allDelivered.filter((entry) => entry.source.kind === "text" && entry.effect.kind === "image").length;
const interactiveCount = allDelivered.filter((entry) => entry.effect.kind === "interactive").length;

export const multiSourceStats = {
  skillCount: skills.length,
  imagePairCount: multiSourceExperiments.length,
  uniqueSourcePathCount: new Set(multiSourceExperiments.map((entry) => entry.source.src)).size,
  baselineCount: multiSourceExperiments.filter((entry) => entry.cohort === "baseline").length,
  productSystemPairCount: multiSourceExperiments.filter((entry) => entry.cohort === "product-system").length,
  productSystemPreviewCount: productSystemExperiments.filter((entry) => entry.product).length,
  stressPairCount: multiSourceExperiments.filter((entry) => entry.cohort === "stress").length,
  independentPairCount: multiSourceExperiments.filter((entry) => entry.cohort === "independent").length,
  deliveredImagePairCount: multiSourceExperiments.filter((entry) => entry.cohort === "delivered").length,
  controlledPairCount: multiSourceExperiments.filter((entry) => entry.cohort === "controlled").length,
  capabilityPairCount: multiSourceExperiments.filter((entry) => entry.cohort === "capability").length,
  textDrivenStaticCount,
  interactiveCount,
  staticEffectCount: multiSourceExperiments.length + textDrivenStaticCount,
  allEffectEvidenceCount: multiSourceExperiments.length + textDrivenStaticCount + interactiveCount,
};
