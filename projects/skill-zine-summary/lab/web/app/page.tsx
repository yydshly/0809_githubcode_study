import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { multiSourceStats } from "@/app/data/multi-source-experiments";
import { researchCatalogStats } from "@/app/data/research-catalog";
import { skills, sourceImage } from "@/app/data/skills";

export const metadata: Metadata = {
  title: "Zine Skill 能力研究站",
  description: "13 个独立 Zine Skill 的能力、场景、上游样例与本地扩展实验。",
};

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="catalog-hero">
        <div className="catalog-hero__copy">
          <p className="eyebrow">13 INDEPENDENT RESEARCH TARGETS</p>
          <h1>每个 Skill，<br />都是一条独立的<br />视觉技术路线。</h1>
          <p className="catalog-hero__intro">先看上游内部 Demo 证明了什么，再把能力迁移到我们的统一场景。这里研究的不是“谁最好看”，而是每条路线的输入契约、核心机制、适用场景和可扩展空间。</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/skills">打开 13 个 Skill 研究页</Link>
            <Link className="button" href="/research">查看全部研究档案</Link>
            <Link className="button" href="/choose">按任务选择 Skill</Link>
          </div>
        </div>
        <div className="catalog-hero__visual">
          <Image src={sourceImage.src} alt={sourceImage.alt} fill priority sizes="(max-width: 860px) 100vw, 42vw" style={{ objectFit: "contain" }} unoptimized />
          <div className="catalog-hero__stamp"><b>01</b><span>CONTROLLED<br />SOURCE</span></div>
        </div>
      </section>

      <section className="archive-visibility" aria-labelledby="archive-visibility-title">
        <div className="archive-visibility__copy">
          <p className="eyebrow">COMPLETE RESEARCH ARCHIVE · NOTHING REMOVED</p>
          <h2 id="archive-visibility-title">以前的研究都还在，<br />这里只把入口重新汇总。</h2>
          <p>完整档案包含 13 个单 Skill 深度页、上游内部 Demo、统一原图横评、Revision 10–12 多题材扩样、产品系统、选择工作台与 Markdown 研究记录。多原图实验室一次只展开一个 Skill，是为了避免浏览器同时加载数百 MB 图片，并不是只保留了当前看到的那一项。</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/skills">打开 13 个独立研究页</Link>
            <Link className="button" href="/research">打开完整研究总索引</Link>
            <Link className="button" href="/labs/multi-source#skill-selector">选择 13 个 Skill 的批量实验</Link>
            <Link className="button" href="/reports/revision-7">阅读研究结论</Link>
          </div>
        </div>
        <dl className="archive-visibility__stats">
          <div><dt>{researchCatalogStats.skillTargets}</dt><dd>个独立 Skill 深度页</dd></div>
          <div><dt>{multiSourceStats.imagePairCount}</dt><dd>组完整图片 SOURCE → EFFECT</dd></div>
          <div><dt>{multiSourceStats.allEffectEvidenceCount}</dt><dd>项效果证据，含实时交互</dd></div>
          <div><dt>{researchCatalogStats.documents}</dt><dd>份核心研究文档</dd></div>
        </dl>
      </section>

      <section className="cover-showcase" aria-labelledby="cover-title">
        <div className="cover-showcase__copy">
          <p className="eyebrow">SITE COVER · VISIBLE EDITION</p>
          <h2 id="cover-title">研究站封面</h2>
          <p>这张封面同时用于链接分享预览。13 个编号单元代表 13 条独立研究路线，中间空框代表所有实验共同面对的“来源输入”。</p>
          <span className="mono">PUBLIC / OG.PNG · ORIGINAL SITE ASSET</span>
        </div>
        <figure className="cover-showcase__image">
          <Image src="/og.png" alt="Zine Skill 能力研究站封面" fill sizes="(max-width: 760px) 100vw, 62vw" style={{ objectFit: "contain" }} unoptimized />
        </figure>
      </section>

      <section className="method-strip" aria-label="研究方法">
        <div><span>01</span><strong>上游证据</strong><p>看原作者样例真正展示了什么。</p></div>
        <div><span>02</span><strong>能力拆解</strong><p>识别输入、规则、后端和质量门槛。</p></div>
        <div><span>03</span><strong>场景迁移</strong><p>用我们的可控原图复现实质能力。</p></div>
        <div><span>04</span><strong>扩展路线</strong><p>明确下一轮 Demo 和工程化方向。</p></div>
      </section>

      <section className="catalog" id="research-index">
        <header className="section-heading">
          <div><p className="eyebrow">SKILL VISUAL CATALOG</p><h2>13 个 Skill 视觉目录</h2></div>
          <p>12 个去重仓库，其中历史仓库包含两份能力契约不同的 Skill，因此拆成 13 个研究目标。</p>
        </header>
        <div className="catalog-grid">
          {skills.map((skill) => (
            <article className="skill-card" key={skill.slug}>
              <Link className="skill-card__visual" href={`/skills/${skill.slug}`} aria-label={`打开 ${skill.name} 研究页`}>
                <Image src={skill.resultImages[0].src} alt={skill.resultImages[0].alt} fill sizes="(max-width: 760px) 100vw, 33vw" style={{ objectFit: "contain" }} unoptimized />
                <span>{skill.index}</span>
              </Link>
              <div className="skill-card__body">
                <p className="mono">{skill.repo}</p>
                <h3><Link href={`/skills/${skill.slug}`}>{skill.name}</Link></h3>
                <p>{skill.summary}</p>
                <div className="tag-row"><span>{skill.route}</span><span>{skill.fidelity}</span></div>
                <Link className="text-link" href={`/skills/${skill.slug}`}>进入独立研究页 <b>→</b></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-foot">
        <p>RESEARCH ATLAS · 2026.08.10</p>
        <p>公开研究展示保留来源、固定提交与许可边界；上游样例版权归原作者，本地效果不冒充上游官方输出。</p>
      </footer>
    </main>
  );
}
