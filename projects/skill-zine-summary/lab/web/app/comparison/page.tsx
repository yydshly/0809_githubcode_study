import type { Metadata } from "next";
import Link from "next/link";
import { DemoFigure } from "@/app/components/DemoFigure";
import { SiteHeader } from "@/app/components/SiteHeader";
import { skills, sourceImage } from "@/app/data/skills";

export const metadata: Metadata = {
  title: "统一原图横评 · Zine Skill 能力研究站",
  description: "同一张可控原图驱动 13 个 Zine Skill 的能力迁移对照。",
};

export default function ComparisonPage() {
  const effectCount = skills.reduce((total, skill) => total + skill.resultImages.length, 0);

  return (
    <main>
      <SiteHeader />
      <header className="comparison-hero">
        <p className="eyebrow">CONTROLLED VISUAL STUDY · {skills.length} SKILLS / {effectCount} EFFECTS</p>
        <h1>同一张原图，<br />看清每条路线<br />改变了什么。</h1>
        <div className="comparison-hero__note">
          <p>这是能力迁移测试，不是效果排名。所有结果都从同一张无人物合成照片和同一组事实出发。</p>
          <Link className="text-link" href="/research">返回研究总索引 →</Link>
        </div>
      </header>

      <section className="comparison-list" aria-label="统一原图横评">
        {skills.map((skill) => (
          <article className="comparison-study" id={skill.slug} key={skill.slug}>
            <header className="comparison-study__head">
              <span>{skill.index}</span>
              <div><p className="mono">{skill.repo}</p><h2>{skill.name}</h2></div>
              <div className="tag-row"><span>{skill.route}</span><span>{skill.fidelity}</span></div>
            </header>
            <div className="comparison-pair">
              <DemoFigure image={sourceImage} label="OUR SOURCE · 统一实验原图" />
              <div className={`comparison-results ${skill.resultImages.length > 1 ? "comparison-results--pair" : ""}`}>
                {skill.resultImages.map((image, index) => <DemoFigure key={image.src} image={image} label={`OUR EFFECT · ${index + 1}`} />)}
              </div>
            </div>
            <footer className="comparison-study__foot">
              <div><span>能力</span><p>{skill.summary}</p></div>
              <div><span>本次看点</span><p>{skill.proof}</p></div>
              <div><Link className="text-link" href={`/skills/${skill.slug}`}>完整研究页 →</Link></div>
            </footer>
          </article>
        ))}
      </section>
      <footer className="site-foot"><p>CONTROLLED COMPARISON · NOT A QUALITY RANKING</p><p>相同输入，只用于看清不同能力契约。</p></footer>
    </main>
  );
}
