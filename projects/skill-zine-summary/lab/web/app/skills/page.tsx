import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { skills } from "@/app/data/skills";

export const metadata: Metadata = {
  title: "13 个 Skill 独立研究页 · Zine Skill 能力研究站",
  description: "直接进入 13 个 Skill 的独立研究页面，查看上游样例、本地扩展、多原图实验、使用场景、产品应用与能力边界。",
};

export default function SkillDirectoryPage() {
  return (
    <main>
      <SiteHeader />
      <section className="research-atlas-hero skill-directory-hero">
        <div>
          <p className="eyebrow">13 COMPLETE SKILL STUDIES · DIRECT ACCESS</p>
          <h1>以前的 13 个研究页，<br />都从这里直接进入。</h1>
        </div>
        <div className="research-atlas-hero__intro">
          <p><strong>没有丢失，也没有被新实验替换。</strong>每个 Skill 仍保留一张独立长页，包含能力描述、上游 Demo、统一原图扩展、跨题材实验、使用场景、产品应用、技术路径与边界。</p>
          <p>首页原先也有这 13 张卡，但第一张卡位于很长的介绍之后。这个页面取消前置内容，让你打开后立即看到全部研究目标。</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/labs/multi-source#skill-selector">查看多原图批量实验</Link>
            <Link className="button" href="/research">查看网页与文档总索引</Link>
          </div>
        </div>
      </section>

      <section className="catalog skill-directory" aria-labelledby="skill-directory-title">
        <header className="section-heading">
          <div><p className="eyebrow">ALL INDIVIDUAL STUDIES</p><h2 id="skill-directory-title">13 个 Skill，13 张完整长页</h2></div>
          <p>先进入“完整研究页”纵向理解一个 Skill；需要批量比较时，再跳到该 Skill 的多原图实验。卡片内的章节链接会直达已有内容，不会创建另一份重复研究。</p>
        </header>
        <div className="catalog-grid">
          {skills.map((skill) => (
            <article className="skill-card skill-directory-card" data-skill-directory={skill.slug} key={skill.slug}>
              <Link className="skill-card__visual" href={`/skills/${skill.slug}`} aria-label={`打开 ${skill.name} 完整研究页`}>
                <Image src={skill.resultImages[0].src} alt={skill.resultImages[0].alt} fill sizes="(max-width: 760px) 100vw, 33vw" style={{ objectFit: "contain" }} unoptimized />
                <span>{skill.index}</span>
              </Link>
              <div className="skill-card__body">
                <p className="mono">{skill.repo}</p>
                <h3><Link href={`/skills/${skill.slug}`}>{skill.name}</Link></h3>
                <p>{skill.summary}</p>
                <div className="tag-row"><span>{skill.route}</span><span>{skill.fidelity}</span></div>
                <nav className="skill-directory-card__links" aria-label={`${skill.name}研究章节`}>
                  <Link className="text-link" href={`/skills/${skill.slug}`}>完整研究页 <b>→</b></Link>
                  <Link href={`/skills/${skill.slug}#upstream`}>上游 Demo</Link>
                  <Link href={`/skills/${skill.slug}#extension`}>扩展实验</Link>
                  <Link href={`/skills/${skill.slug}#effect-applications`}>使用场景</Link>
                  <Link href={`/skills/${skill.slug}#product-studio`}>产品应用</Link>
                  <Link href={`/labs/multi-source?skill=${skill.slug}#selected-skill`}>多原图实验</Link>
                </nav>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-foot">
        <p>13 SKILL STUDIES · DIRECT DIRECTORY</p>
        <p>上游样例用于研究性对照，本地效果用于能力探索；每张详情页继续分别披露来源、许可、真实性与生产边界。</p>
      </footer>
    </main>
  );
}
