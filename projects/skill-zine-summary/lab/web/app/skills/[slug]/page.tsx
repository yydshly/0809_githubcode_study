import type { Metadata } from "next";
import Link from "@/app/components/Link";
import { notFound } from "next/navigation";
import { CapabilityExplorationSection } from "@/app/components/CapabilityExplorationSection";
import { DemoFigure } from "@/app/components/DemoFigure";
import { DeliveredExperimentSection } from "@/app/components/DeliveredExperimentSection";
import { EffectApplicationShowcase } from "@/app/components/EffectApplicationShowcase";
import { ProductApplicationStudio } from "@/app/components/ProductApplicationStudio";
import { SiteHeader } from "@/app/components/SiteHeader";
import { capabilityExplorationsBySlug } from "@/app/data/capability-explorations";
import { getDeliveredExperiments } from "@/app/data/delivered-experiments";
import { effectApplications } from "@/app/data/effect-applications";
import { productApplicationsBySlug } from "@/app/data/product-applications";
import { extraUpstreamDemos, researchSupplements } from "@/app/data/research";
import { skillBySlug, skills, sourceImage } from "@/app/data/skills";

export function generateStaticParams() {
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const skill = skillBySlug.get(slug);
  if (!skill) return {};
  return { title: `${skill.name} · 独立能力研究`, description: skill.summary };
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = skillBySlug.get(slug);
  if (!skill) notFound();

  const currentIndex = skills.findIndex((item) => item.slug === skill.slug);
  const previous = skills[(currentIndex - 1 + skills.length) % skills.length];
  const next = skills[(currentIndex + 1) % skills.length];
  const supplement = researchSupplements[skill.slug];
  const relatedSkills = supplement.relatedSlugs.map((relatedSlug) => skillBySlug.get(relatedSlug)!);
  const upstreamDemos = [...skill.upstreamDemos, ...(extraUpstreamDemos[skill.slug] ?? [])];
  const extensionExperiments = skill.extensionExperiments ?? [];
  const deliveredExperiments = getDeliveredExperiments(skill.slug);
  const completedPlanTitles = new Set(deliveredExperiments.filter((experiment) => experiment.planStatus !== "partial").map((experiment) => experiment.originPlan.title));
  const partialPlanTitles = new Set(deliveredExperiments
    .filter((experiment) => experiment.planStatus === "partial" && !completedPlanTitles.has(experiment.originPlan.title))
    .map((experiment) => experiment.originPlan.title));
  const futureDemos = skill.nextDemos.filter((demo) => !completedPlanTitles.has(demo.title));
  const applicationImages = [...skill.resultImages, ...extensionExperiments.map((experiment) => experiment.effect)];
  const applicationEntries = applicationImages.map((image) => {
    const application = effectApplications[image.src];
    if (!application) throw new Error(`Missing application scenario for ${image.src}`);
    return { image, application };
  });
  const productApplications = productApplicationsBySlug[skill.slug] ?? [];
  const capabilityExplorations = capabilityExplorationsBySlug[skill.slug] ?? [];
  const planExperimentCount = extensionExperiments.length + deliveredExperiments.length;
  const allAvailableShown = skill.slug === "daily-photo-playground" || skill.slug === "pixel-style-poster";

  return (
    <main>
      <SiteHeader />
      <section className="detail-hero">
        <div className="detail-hero__number">{skill.index}</div>
        <div className="detail-hero__copy">
          <p className="eyebrow">INDEPENDENT SKILL STUDY</p>
          <h1>{skill.name}</h1>
          <p className="detail-hero__summary">{skill.capability}</p>
          <div className="tag-row"><span>{skill.route}</span><span>{skill.fidelity}</span><span>{skill.license}</span></div>
        </div>
        <div className="detail-hero__meta">
          <p className="mono">UPSTREAM</p>
          <a href={skill.upstreamUrl} target="_blank" rel="noreferrer">{skill.repo} ↗</a>
          <p className="mono">RESEARCH COMMIT</p>
          <code>{skill.commit.slice(0, 12)}</code>
          <p className="mono">DEMO EVIDENCE</p>
          <code>{upstreamDemos.length} upstream · {skill.resultImages.length} baseline · {planExperimentCount} plan experiment · {capabilityExplorations.length} cross-subject</code>
        </div>
      </section>

      <nav className={`detail-subnav ${capabilityExplorations.length > 0 ? "detail-subnav--expanded" : ""}`} aria-label="本页研究章节">
        <a href="#capability">能力</a><a href="#use-cases">场景</a><a href="#upstream">上游 Demo</a>
        <a href="#extension">扩展实验</a>{capabilityExplorations.length > 0 && <a href="#capability-explorations">跨题材探索</a>}<a href="#effect-applications">成品场景</a><a href="#product-studio">产品应用</a><a href="#pipeline">技术路径</a><a href="#boundaries">边界与验收</a>
        <a href="#directions">扩展方向</a><a href="#related">相近路线</a>
      </nav>

      <section className="research-section capability-section" id="capability">
        <header className="section-heading"><div><p className="eyebrow">01 · CAPABILITY</p><h2>它真正解决什么</h2></div><p>{skill.summary}</p></header>
        <div className="principle-grid">
          {skill.principles.map((principle, index) => <div key={principle}><span>0{index + 1}</span><p>{principle}</p></div>)}
        </div>
      </section>

      <section className="research-section" id="use-cases">
        <header className="section-heading"><div><p className="eyebrow">02 · USE CASES</p><h2>适用场景</h2></div><p>从能力契约出发，而不是从画风名称出发选择工具。</p></header>
        <div className="text-card-grid">
          {skill.useCases.map((item) => <article className="text-card" key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="research-section research-section--dark" id="upstream">
        <header className="section-heading"><div><p className="eyebrow">03 · UPSTREAM EVIDENCE</p><h2>上游内部 Demo</h2></div><p>这些图来自固定提交，只用于理解上游原本声称和展示的能力，并不代表受控横评。</p></header>
        <div className="demo-inventory"><strong>{upstreamDemos.length}</strong><span>张上游证据</span><p>{allAvailableShown ? "上游现有可用样例已全部展示；不重复图片凑数量。" : "从固定提交中补充不同题材，帮助判断能力是否能跨场景成立。"}</p></div>
        <div className={`upstream-grid upstream-grid--${upstreamDemos.length}`}>
          {upstreamDemos.map((image, index) => <DemoFigure key={image.src} image={image} label={`UPSTREAM DEMO · ${String(index + 1).padStart(2, "0")}`} />)}
        </div>
        <aside className="license-note"><strong>研究边界</strong><p>{skill.licenseNote}</p></aside>
      </section>

      <section className="research-section extension-section" id="extension">
        <header className="section-heading"><div><p className="eyebrow">04 · OUR EXTENSION</p><h2>我们的场景扩展实验</h2></div><p>{skill.proof}</p></header>
        <div className="extension-grid">
          <DemoFigure image={sourceImage} label="OUR SOURCE · 可控原图" priority />
          <div className={`comparison-results ${skill.resultImages.length > 1 ? "comparison-results--pair" : ""}`}>
            {skill.resultImages.map((image, index) => <DemoFigure key={image.src} image={image} label={`OUR EFFECT · ${index + 1}`} priority />)}
          </div>
        </div>
        <div className="fact-map">
          <div><p className="eyebrow">SOURCE FACTS</p>{skill.sourceFacts.map((fact) => <p key={fact}>↳ {fact}</p>)}</div>
          <div><p className="eyebrow">WHAT THIS PROVES</p><p>{skill.proof}</p></div>
        </div>
        <CapabilityExplorationSection entries={capabilityExplorations} />
        <DeliveredExperimentSection experiments={deliveredExperiments} />
        {extensionExperiments.length > 0 && (
          <div className="plan-delivery" id="planned-demos">
            <header className="plan-delivery__heading">
              <div><p className="eyebrow">PLAN DELIVERED · {extensionExperiments.length} CONTROLLED PAIRS</p><h3>按下一轮计划完成的补充实验</h3></div>
              <p>每组都单独展示生成输入图与我们的研究效果；四组输入与效果均由内置图像生成或编辑完成，“北港”和人物均为虚构，不是纪实照片或上游官方输出。同城系列固定配方，只改变来源关系，人物组专门验证故事、色彩和环境是否能够同时迁移。</p>
            </header>
            <div className="plan-delivery__list">
              {extensionExperiments.map((experiment, index) => (
                <article className="plan-experiment" key={experiment.title}>
                  <header className="plan-experiment__head">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><p className="mono">{experiment.kicker}</p><h4>{experiment.title}</h4></div>
                    <p>{experiment.question}</p>
                  </header>
                  <div className="plan-experiment__pair">
                    <DemoFigure image={experiment.source} label={`GENERATED SOURCE · ${String(index + 1).padStart(2, "0")}`} />
                    <DemoFigure image={experiment.effect} label={`OUR STUDY EFFECT · ${String(index + 1).padStart(2, "0")}`} />
                  </div>
                  <div className="plan-experiment__evidence">
                    <div><p className="eyebrow">SOURCE FACTS</p>{experiment.facts.map((fact) => <p key={fact}>↳ {fact}</p>)}</div>
                    <div><p className="eyebrow">PRIMARY RELIC</p><p>{experiment.primaryRelic}</p><p className="mono">RECIPE · {experiment.recipe}</p></div>
                    <div><p className="eyebrow">ACCEPTANCE</p><ul>{experiment.checks.map((check) => <li key={check}>{check}</li>)}</ul></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        {applicationEntries.length > 0 && (
          <section className="effect-application-library" id="effect-applications">
            <header className="effect-application-library__heading">
              <div><p className="eyebrow">EFFECT → REAL USE</p><h3>完整效果对应什么使用场景</h3></div>
              <p>下面不只重复展示图片，而是把每一张我们的研究效果放回真实任务：谁会使用、解决什么问题、能形成哪些交付物、为什么这个 Skill 合适，以及从这里还能往哪里扩展。所有图片均为本地研究或生成结果，不是上游官方输出；完整图仍可进入沉浸查看。</p>
            </header>
            <div className="effect-application-library__list">
              {applicationEntries.map(({ image, application }, index) => (
                <EffectApplicationShowcase key={image.src} image={image} application={application} index={index} />
              ))}
            </div>
          </section>
        )}
        <ProductApplicationStudio skillName={skill.name} applications={productApplications} />
      </section>

      <section className="research-section" id="pipeline">
        <header className="section-heading"><div><p className="eyebrow">05 · PIPELINE</p><h2>技术路径</h2></div><p>把视觉结果还原成可以继续研究的步骤。</p></header>
        <ol className="pipeline-list">
          {skill.pipeline.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}
        </ol>
      </section>

      <section className="research-section evaluation-section" id="boundaries">
        <header className="section-heading"><div><p className="eyebrow">06 · BOUNDARIES & QA</p><h2>能力边界与验收</h2></div><p>知道它不适合什么，与知道它能做什么同样重要。每次新增 Demo 都应通过这里的检查。</p></header>
        <div className="boundary-grid">
          <article className="boundary-card boundary-card--strength"><p className="eyebrow">STRENGTHS</p><h3>最值得保留</h3><ul>{supplement.strengths.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="boundary-card boundary-card--limit"><p className="eyebrow">BOUNDARIES</p><h3>不要用错地方</h3><ul>{supplement.boundaries.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>
        <div className="qa-list">
          {supplement.checks.map((check, index) => <article key={check.label}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{check.label}</h3><p>{check.question}</p></div><b>CHECK</b></article>)}
        </div>
      </section>

      <section className="research-section" id="directions">
        <header className="section-heading"><div><p className="eyebrow">07 · DIRECTIONS</p><h2>可扩展方向</h2></div><p>下一步不是堆更多相似图片，而是提高可控性、可验证性与场景覆盖。</p></header>
        <div className="text-card-grid">
          {skill.directions.map((item) => <article className="text-card text-card--accent" key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="research-section related-section" id="related">
        <header className="section-heading"><div><p className="eyebrow">08 · RELATED ROUTES</p><h2>相近 Skill 对照</h2></div><p>相似视觉不一定使用相同技术路径。进入相邻研究页，比较真实性契约、执行后端和验收方式。</p></header>
        <div className="related-grid">
          {relatedSkills.map((related) => <Link href={`/skills/${related.slug}`} key={related.slug}><span>{related.index}</span><div><p className="mono">{related.route}</p><h3>{related.name}</h3><p>{related.summary}</p></div><b>↗</b></Link>)}
        </div>
      </section>

      <section className="research-section next-section" id="next-demos">
        <header className="section-heading"><div><p className="eyebrow">09 · NEXT DEMOS</p><h2>下一轮演示计划</h2></div><p>{deliveredExperiments.length > 0 ? `本页已有 ${deliveredExperiments.length} 项计划实验；${partialPlanTitles.size > 0 ? `${partialPlanTitles.size} 项只取得阶段证据，因此仍保留在开放队列。` : "已完全回答的旧问题已移出队列。"}` : "每个新 Demo 都应验证一个尚未回答的问题。"}</p></header>
        <div className="next-grid">
          {futureDemos.map((item, index) => <article key={item.title} data-plan-state={partialPlanTitles.has(item.title) ? "open-after-partial" : "planned"}><span>{partialPlanTitles.has(item.title) ? "OPEN AFTER PARTIAL" : "PLANNED"} · {String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <nav className="study-nav" aria-label="相邻 Skill 研究页">
        <Link href={`/skills/${previous.slug}`}><span>← 上一个</span><strong>{previous.name}</strong></Link>
        <Link href="/skills"><span>全部 13 个 Skill</span><strong>独立研究页目录</strong></Link>
        <Link href={`/skills/${next.slug}`}><span>下一个 →</span><strong>{next.name}</strong></Link>
      </nav>
      <footer className="site-foot"><p>{skill.repo}</p><p>固定提交 {skill.commit.slice(0, 12)} · {skill.license}</p></footer>
    </main>
  );
}
