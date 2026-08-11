import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import {
  researchCatalogStats,
  researchDocuments,
  researchSurfaces,
  skillResearchLinks,
} from "@/app/data/research-catalog";

export const metadata: Metadata = {
  title: "研究总索引 · Zine Skill 能力研究站",
  description: "把 Skill 选择器、13 个深度页、对照实验、研究报告与核心 Markdown 文档组织成一张可追溯的研究地图。",
};

const documentGroups = ["入口与范围", "来源与方法", "实验运行", "结果与维护"] as const;

export default function ResearchIndexPage() {
  return (
    <main>
      <SiteHeader />
      <section className="research-atlas-hero">
        <div>
          <p className="eyebrow">RESEARCH ATLAS · WEB + DOCUMENTS</p>
          <h1>先找到证据，<br />再选择研究深度。</h1>
        </div>
        <div className="research-atlas-hero__intro">
          <p>这是整个子项目的统一入口。它把视觉目录、Skill 选择工作台、13 个独立页面、统一原图横评、多原图批量实验、Revision 7 报告，以及 Revision 10–13 的扩样、产品系统与选择文档连接起来。</p>
          <p><strong>数字口径：</strong>汇总表最终对应 12 个唯一上游仓库；其中一个历史仓库包含两种不同的 Skill 契约，所以网页按 13 个研究目标展开。</p>
        </div>
      </section>

      <section className="research-atlas-stats" aria-label="研究总索引数量">
        <div><strong>{researchCatalogStats.upstreamRepositories}</strong><span>个唯一上游仓库</span></div>
        <div><strong>{researchCatalogStats.skillTargets}</strong><span>个独立 Skill 研究目标</span></div>
        <div><strong>{researchCatalogStats.webSurfaces}</strong><span>类核心网页入口</span></div>
        <div><strong>{researchCatalogStats.documents}</strong><span>份核心研究文档</span></div>
      </section>

      <section className="research-atlas-section" aria-labelledby="route-by-question-title">
        <header className="research-atlas-section__head">
          <div><p className="eyebrow">START BY QUESTION</p><h2 id="route-by-question-title">我现在想解决什么问题？</h2></div>
          <p>这些入口不是重复页面：它们分别回答“有哪些”“该选哪个”“同源差异”“换题材后是否成立”“结论边界是什么”。</p>
        </header>
        <div className="research-surface-grid">
          {researchSurfaces.map((surface, index) => (
            <article className="research-surface-card" data-research-surface={surface.id} key={surface.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p className="mono">{surface.role}</p>
              <h3><Link href={surface.href}>{surface.title}</Link></h3>
              <p>{surface.summary}</p>
              <dl><dt>它回答</dt><dd>{surface.answers}</dd></dl>
              <div className="research-surface-card__links">
                <Link className="text-link" href={surface.href}>打开这一入口 <b>→</b></Link>
                {surface.continuesTo.map((next) => <Link key={next.href} href={next.href}>{next.label}</Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="research-atlas-flow" aria-labelledby="research-flow-title">
        <div><p className="eyebrow">EVIDENCE FLOW</p><h2 id="research-flow-title">网页与文档如何接力</h2></div>
        <ol>
          <li><span>01</span><strong>定位对象</strong><p>README 与 INVENTORY 说明研究谁、为什么是 12 个仓库和 13 个目标。</p></li>
          <li><span>02</span><strong>核对来源</strong><p>UPSTREAM 与 ORIGINAL-SAMPLES 负责提交、许可和上游样例证据。</p></li>
          <li><span>03</span><strong>理解方法</strong><p>TECHNICAL-MAP 与单 Skill 页面解释执行后端、真实性契约和视觉规则。</p></li>
          <li><span>04</span><strong>比较结果</strong><p>统一原图横评与多原图实验室分别控制输入和扩大题材。</p></li>
          <li><span>05</span><strong>沉淀结论</strong><p>Revision 7–13 报告、资产账本和 REFINEMENT 记录结论、产品处理、选择边界与实现证据。</p></li>
        </ol>
      </section>

      <section className="research-atlas-section" aria-labelledby="skill-relations-title">
        <header className="research-atlas-section__head">
          <div><p className="eyebrow">13 SKILLS · CONNECTED EVIDENCE</p><h2 id="skill-relations-title">每个 Skill 的关联入口</h2></div>
          <p>详情页负责深度；横评负责同源比较；批量实验室负责多来源覆盖；报告负责结论。两个历史 Skill 虽共享仓库，仍分别保留入口。</p>
        </header>
        <div className="research-skill-matrix">
          {skillResearchLinks.map((skill) => (
            <article data-index-skill={skill.slug} key={skill.slug}>
              <header><span>{skill.index}</span><div><p className="mono">{skill.repo}</p><h3>{skill.name}</h3></div></header>
              <p>{skill.summary}</p>
              <dl>
                <div><dt>技术路线</dt><dd>{skill.route}</dd></div>
                <div><dt>真实性契约</dt><dd>{skill.fidelity}</dd></div>
              </dl>
              <nav aria-label={`${skill.name}关联入口`}>
                <Link href={skill.detailHref}>独立研究页</Link>
                <Link href={skill.comparisonHref}>统一原图</Link>
                <Link href={skill.labHref}>多原图实验</Link>
                <Link href={skill.reportHref}>结论入口</Link>
                <a href={skill.upstreamUrl} target="_blank" rel="noreferrer">上游仓库 ↗</a>
              </nav>
            </article>
          ))}
        </div>
      </section>

      <section className="research-atlas-section research-atlas-documents" aria-labelledby="document-map-title" id="documents">
        <header className="research-atlas-section__head">
          <div><p className="eyebrow">DOCUMENT MAP · REPOSITORY EVIDENCE</p><h2 id="document-map-title">Markdown 文档地图</h2></div>
          <p>网页用于浏览，Markdown 用于长期审查和维护。路径以仓库根目录为基准显示；网页不制造本地文件的不可达链接。</p>
        </header>
        {documentGroups.map((group) => (
          <section className="research-document-group" key={group}>
            <h3>{group}</h3>
            <div>
              {researchDocuments.filter((document) => document.group === group).map((document) => (
                <article data-research-document={document.id} id={`document-${document.id}`} key={document.id}>
                  <p className="mono">{document.repositoryPath}</p>
                  <h4>{document.title}</h4>
                  <p>{document.role}</p>
                  <dl><dt>何时阅读</dt><dd>{document.readWhen}</dd></dl>
                  <nav aria-label={`${document.title}关联网页`}>
                    {document.relatedRoutes.map((route) => <Link href={route.href} key={route.href}>{route.label} →</Link>)}
                  </nav>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <footer className="site-foot">
        <p>RESEARCH ATLAS · 12 REPOSITORIES / 13 TARGETS</p>
        <p>公开发布前仍需完成逐项权利清单与资产 allowlist；当前入口服务于本地研究。</p>
      </footer>
    </main>
  );
}
