import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
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
            <Link className="button button--dark" href="/choose">按任务选择 Skill</Link>
            <Link className="button" href="/comparison">查看统一原图横评</Link>
            <Link className="button" href="/reports/revision-7">阅读跨题材研究报告</Link>
          </div>
        </div>
        <div className="catalog-hero__visual">
          <Image src={sourceImage.src} alt={sourceImage.alt} fill priority sizes="(max-width: 860px) 100vw, 42vw" style={{ objectFit: "contain" }} unoptimized />
          <div className="catalog-hero__stamp"><b>01</b><span>CONTROLLED<br />SOURCE</span></div>
        </div>
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
        <p>上游样例与受限资产仅用于本地研究展示；公开部署前逐项复核授权。</p>
      </footer>
    </main>
  );
}
