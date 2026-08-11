import type { Metadata } from "next";
import Link from "next/link";
import { DemoFigure } from "@/app/components/DemoFigure";
import { DigitalApplicationPreview } from "@/app/components/DigitalApplicationPreview";
import { ProductApplicationCaseStudy } from "@/app/components/ProductApplicationStudio";
import { SiteHeader } from "@/app/components/SiteHeader";
import {
  multiSourceExperimentsBySlug,
  multiSourceSkillSummaries,
  multiSourceStats,
} from "@/app/data/multi-source-experiments";
import { skillBySlug } from "@/app/data/skills";

export const metadata: Metadata = {
  title: "多原图实验室 · Zine Skill 能力研究站",
  description: "按 Skill 聚合 127 组完整图片 SOURCE→EFFECT，并为 13 个 Skill 各增加一组完整产品系统数字实验。",
};

type MultiSourcePageProps = {
  searchParams: Promise<{ skill?: string | string[] }>;
};

export default async function MultiSourceLabPage({ searchParams }: MultiSourcePageProps) {
  const rawSkill = (await searchParams).skill;
  const requestedSlug = Array.isArray(rawSkill) ? rawSkill[0] : rawSkill;
  const selectedSummary = multiSourceSkillSummaries.find((entry) => entry.slug === requestedSlug) ?? multiSourceSkillSummaries[0];
  const selectedSkill = skillBySlug.get(selectedSummary.slug);
  const selectedCases = multiSourceExperimentsBySlug.get(selectedSummary.slug) ?? [];

  return (
    <main>
      <SiteHeader />
      <section className="multi-source-hero">
        <div>
          <p className="eyebrow">MULTI-SOURCE LAB · 13 SKILLS</p>
          <h1>同一个 Skill，<br />换更多原图再看能力。</h1>
        </div>
        <div className="multi-source-hero__intro">
          <p>这里不是再做一次“同一张图横评”。它把此前分散在 13 个页面中的证据统一起来，并连续三轮为每个 Skill 增加不复用的独立输入。</p>
          <p>Revision 12 不停在一张漂亮 EFFECT：每个 Skill 都新增一个题材，并把同一效果继续处理成不少于三种产品表面、一个使用环境和四步真实生产路径。</p>
          <Link className="button" href="/research">先看研究总索引</Link>
        </div>
      </section>

      <section className="multi-source-stats" aria-label="多原图实验数量口径">
        <div><strong>{multiSourceStats.imagePairCount}</strong><span>组图片 SOURCE → 图片 EFFECT</span></div>
        <div><strong>{multiSourceStats.uniqueSourcePathCount}</strong><span>个不同图片来源路径，不等于独立摄影原图</span></div>
        <div><strong>{multiSourceStats.staticEffectCount}</strong><span>个静态效果，含 {multiSourceStats.textDrivenStaticCount} 个文字驱动效果</span></div>
        <div><strong>{multiSourceStats.allEffectEvidenceCount}</strong><span>个总效果证据，另含 {multiSourceStats.interactiveCount} 个实时交互</span></div>
      </section>

      <section className="multi-source-accounting" aria-labelledby="accounting-title">
        <div>
          <p className="eyebrow">COUNTING WITHOUT INFLATION</p>
          <h2 id="accounting-title">数量要大，也要说明重复来源。</h2>
        </div>
        <dl>
          <div><dt>{multiSourceStats.productSystemPairCount} 组完整产品系统实验</dt><dd>Revision 12 为每个 Skill 各增加一个新 SOURCE/EFFECT，并用同一 EFFECT 组织多个产品表面、使用环境和生产步骤；产品预演不重复计作效果。</dd></div>
          <div><dt>{multiSourceStats.stressPairCount} 组反向题材压力测试</dt><dd>Revision 11 为 13 个 Skill 各增加一个与上一轮在人物／非人物、稀疏／密集、室内／室外或日／夜上相反的输入，并补产品语境。</dd></div>
          <div><dt>{multiSourceStats.independentPairCount} 组独立原图扩样</dt><dd>Revision 10 为 13 个 Skill 各新增一个不复用的来源路径，直接扩大题材与来源数量。</dd></div>
          <div><dt>{multiSourceStats.baselineCount} 组统一原图基线</dt><dd>同一张湖岸输入被多种效果重复使用，用来控制输入变量。</dd></div>
          <div><dt>{multiSourceStats.deliveredImagePairCount} 组计划交付</dt><dd>从详情页的明确研究计划转为图片输入、效果、验收与用途。</dd></div>
          <div><dt>{multiSourceStats.controlledPairCount} 组受控配对</dt><dd>Photo Relic 的城市系列和人物迁移，输入与效果逐项成对。</dd></div>
          <div><dt>{multiSourceStats.capabilityPairCount} 组跨题材探索</dt><dd>用人物、群体、静物、建筑、交通和季节输入追问迁移能力。</dd></div>
        </dl>
        <p className="multi-source-accounting__note">没有成对原图的 68 张上游参考图不计入 {multiSourceStats.imagePairCount} 组；{multiSourceStats.productSystemPreviewCount} 个产品系统数字预演复用既有 EFFECT，也不重复计为新效果。2 个文字输入与 2 个实时交互没有被包装成图片前后对照。</p>
      </section>

      <section className="multi-source-selector" aria-labelledby="skill-selector-title">
        <header>
          <div><p className="eyebrow">CHOOSE ONE SKILL · LOAD ONE EVIDENCE SET</p><h2 id="skill-selector-title">按 Skill 选择批量证据</h2></div>
          <p>为了避免一次加载约 400 MB 的研究资产，页面一次只展开一个 Skill。数量是效果对数量；“来源”按图片路径去重。</p>
        </header>
        <div className="multi-source-selector__grid">
          {multiSourceSkillSummaries.map((summary) => {
            const active = summary.slug === selectedSummary.slug;
            return (
              <Link
                className={active ? "is-active" : undefined}
                data-lab-skill-selector={summary.slug}
                data-pair-count={summary.pairCount}
                data-unique-source-count={summary.uniqueSourceCount}
                aria-current={active ? "true" : undefined}
                href={`/labs/multi-source?skill=${summary.slug}#selected-skill`}
                key={summary.slug}
              >
                <span>{summary.index}</span>
                <strong>{summary.name}</strong>
                <small>{summary.route}</small>
                <b>{summary.pairCount} 组 / {summary.uniqueSourceCount} 来源</b>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="multi-source-selected" id="selected-skill" data-selected-skill={selectedSummary.slug} data-pair-count={selectedSummary.pairCount} data-unique-source-count={selectedSummary.uniqueSourceCount}>
        <header className="multi-source-selected__head">
          <div className="multi-source-selected__number">{selectedSummary.index}</div>
          <div>
            <p className="mono">{selectedSkill?.repo} · {selectedSummary.fidelity}</p>
            <h2>{selectedSummary.name}</h2>
            <p>{selectedSkill?.capability}</p>
          </div>
          <dl>
            <div><dt>完整图片对照</dt><dd>{selectedSummary.pairCount} 组</dd></div>
            <div><dt>不同来源路径</dt><dd>{selectedSummary.uniqueSourceCount} 个</dd></div>
            <div><dt>完整产品系统实验</dt><dd>{selectedSummary.cohortCounts["product-system"]}</dd></div>
            <div><dt>反向题材压力测试</dt><dd>{selectedSummary.cohortCounts.stress}</dd></div>
            <div><dt>独立原图扩样</dt><dd>{selectedSummary.cohortCounts.independent}</dd></div>
          </dl>
        </header>

        <div className="multi-source-case-list">
          {selectedCases.map((entry, index) => (
            <article className="multi-source-case" data-lab-case={entry.id} data-cohort={entry.cohort} id={entry.id} key={entry.id}>
              <header className="multi-source-case__head">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><p className="eyebrow">{entry.cohortLabel}</p><h3>{entry.title}</h3></div>
                <p><strong>{entry.status}</strong><span>{entry.question}</span></p>
              </header>

              {entry.contrast && (
                <section className="multi-source-case__contrast" aria-label="本组反向测试变量">
                  <p className="eyebrow">WHY THIS OPPOSITE INPUT</p>
                  <strong>为什么换这个题材</strong>
                  <span>{entry.contrast}</span>
                </section>
              )}

              <div className="multi-source-case__pair" data-source-src={entry.source.src} data-effect-src={entry.effect.src}>
                <DemoFigure image={entry.source} label={`COMPLETE SOURCE · ${String(index + 1).padStart(2, "0")}`} />
                <DemoFigure image={entry.effect} label={`COMPLETE EFFECT · ${String(index + 1).padStart(2, "0")}`} />
              </div>

              <section className="multi-source-case__lineage" aria-label="来源口径">
                <p className="eyebrow">SOURCE LINEAGE</p>
                <strong>{entry.sourceLineage.label}</strong>
                <span>{entry.sourceLineage.note}</span>
              </section>

              <dl className="multi-source-case__evidence">
                <div><dt>这组如何处理</dt><dd>{entry.method}</dd></div>
                <div><dt>实际看到了什么</dt><dd>{entry.finding}</dd></div>
                <div><dt>适合的使用场景</dt><dd>{entry.scenario}</dd></div>
                <div><dt>为什么这个 Skill 适合</dt><dd>{entry.whyItFits}</dd></div>
                <div><dt>边界／不能证明什么</dt><dd>{entry.boundary}</dd></div>
                <div><dt>证据披露</dt><dd>{entry.disclosure}</dd></div>
              </dl>

              {entry.productionNext && (
                <section className="multi-source-case__production">
                  <p className="eyebrow">BEFORE REAL PRODUCTION</p>
                  <strong>进入真实生产还要做什么</strong>
                  <span>{entry.productionNext}</span>
                </section>
              )}

              {entry.application && <DigitalApplicationPreview image={entry.effect} application={entry.application} headingLevel={4} />}
              {entry.product && <ProductApplicationCaseStudy application={{ ...entry.product, effect: entry.effect }} variant="embedded" />}

              <footer className="multi-source-case__foot">
                <Link className="text-link" href={entry.detailHref}>回到单 Skill 深度说明 <b>→</b></Link>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="multi-source-next" aria-labelledby="multi-source-next-title">
        <div><p className="eyebrow">REVISION 12 · EFFECT → PRODUCT SYSTEM</p><h2 id="multi-source-next-title">不只看效果，<br />继续看到如何使用。</h2></div>
        <div>
          <p>Revision 10 解决独立原图，Revision 11 用反向题材追问迁移；Revision 12 再给全部 13 个 Skill 各补一个新输入，并把同一 EFFECT 推进为有载体、有环境、有规格和有生产步骤的完整数字产品系统。</p>
          <ul>
            <li>每个新案例完整展示 SOURCE、EFFECT、能力结论、适合与不适合的用途。</li>
            <li>每个产品系统至少包含三种产品表面、一个使用环境、四步处理和明确输出规格。</li>
            <li>产品表面全部复用同一 EFFECT，不把重复嵌图包装成新的能力证据。</li>
            <li>继续记录“部分成立”和生产缺口；数字预演不冒充印刷、安装、投放、客户项目或业务结果。</li>
          </ul>
        </div>
      </section>

      <footer className="site-foot">
        <p>MULTI-SOURCE LAB · {multiSourceStats.imagePairCount} IMAGE PAIRS / {multiSourceStats.uniqueSourcePathCount} SOURCE PATHS</p>
        <p>本地研究效果不代表上游官方输出；公开发布前仍需逐项权利复核。</p>
      </footer>
    </main>
  );
}
