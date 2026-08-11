import type { Metadata } from "next";
import Link from "@/app/components/Link";
import { SiteHeader } from "@/app/components/SiteHeader";
import {
  onlineDocumentHref,
  researchCatalogStats,
  researchDocuments,
} from "@/app/data/research-catalog";

export const metadata: Metadata = {
  title: "在线文档中心 · Zine Skill 能力研究站",
  description: "按研究阶段整理 Skill Zine 项目的核心 Markdown 文档，并关联相应网页、实验与上游证据。",
};

const documentGroups = ["入口与范围", "来源与方法", "实验运行", "结果与维护"] as const;

const readingPaths = [
  {
    title: "第一次理解项目",
    description: "先确认研究对象、12 个仓库与 13 个 Skill 的关系，再进入技术路线。",
    documents: "根 README → 项目 README → INVENTORY → TECHNICAL-MAP",
    href: "#入口与范围",
  },
  {
    title: "核对来源与许可",
    description: "从固定提交、许可判断和上游样例出发，区分上游证据与本地研究效果。",
    documents: "UPSTREAM → ORIGINAL-SAMPLES → SOURCES.lock",
    href: "#来源与方法",
  },
  {
    title: "继续一次实验",
    description: "按实验室运行约定准备来源、记录输入、结果、边界和复核信息。",
    documents: "lab/README → RUNBOOK → records/README",
    href: "#实验运行",
  },
  {
    title: "复盘各轮结果",
    description: "从 R7 的能力结论一路阅读到 R10–R13 的扩样、产品系统与选型。",
    documents: "R7 → R10 → R11 → R12 → R13 → REFINEMENT",
    href: "#结果与维护",
  },
] as const;

export default function DocumentsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="research-atlas-hero">
        <div>
          <p className="eyebrow">ONLINE DOCUMENT CENTER · 20 CORE FILES</p>
          <h1>研究网页负责观察，<br />文档负责把结论留下来。</h1>
        </div>
        <div className="research-atlas-hero__intro">
          <p>这里不增加新的 Skill、图片或实验，只把现有文档按阅读目的重新组织。每张卡都能直接在 GitHub 阅读完整 Markdown，并回到对应网页核对图片、实验和结论。</p>
          <p><strong>建议：</strong>新人先走“入口与范围”；准备引用或继续实验时，先读“来源与方法”以及“实验运行”。</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/research">返回研究总索引</Link>
            <Link className="button" href="/skills">查看 13 个 Skill</Link>
          </div>
        </div>
      </section>

      <section className="research-atlas-stats" aria-label="在线文档中心数量">
        <div><strong>{researchCatalogStats.documents}</strong><span>份核心研究文档</span></div>
        <div><strong>{documentGroups.length}</strong><span>个阅读分组</span></div>
        <div><strong>{researchCatalogStats.upstreamRepositories}</strong><span>个唯一上游仓库</span></div>
        <div><strong>{researchCatalogStats.skillTargets}</strong><span>个 Skill 研究目标</span></div>
      </section>

      <section className="research-atlas-section" aria-labelledby="document-reading-paths">
        <header className="research-atlas-section__head">
          <div><p className="eyebrow">READING PATHS</p><h2 id="document-reading-paths">按当前问题选择阅读路径</h2></div>
          <p>不必从第一份读到最后一份。先选择目的，再进入对应分组。</p>
        </header>
        <div className="research-surface-grid">
          {readingPaths.map((path, index) => (
            <article className="research-surface-card" key={path.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3><a href={path.href}>{path.title}</a></h3>
              <p>{path.description}</p>
              <dl><dt>阅读顺序</dt><dd>{path.documents}</dd></dl>
              <div className="research-surface-card__links"><a className="text-link" href={path.href}>进入分组 <b>↓</b></a></div>
            </article>
          ))}
        </div>
      </section>

      <section className="research-atlas-section research-atlas-documents" aria-labelledby="online-document-list">
        <header className="research-atlas-section__head">
          <div><p className="eyebrow">DOCUMENT MAP · ONLINE READING</p><h2 id="online-document-list">20 份文档与关联网页</h2></div>
          <p>“在线阅读全文”打开 GitHub 中的完整 Markdown；其余链接返回站内对应研究页面。</p>
        </header>
        {documentGroups.map((group) => (
          <section className="research-document-group" id={group} key={group}>
            <h3>{group}</h3>
            <div>
              {researchDocuments.filter((document) => document.group === group).map((document) => (
                <article data-online-document={document.id} id={`document-${document.id}`} key={document.id}>
                  <p className="mono">{document.repositoryPath}</p>
                  <h4>{document.title}</h4>
                  <p>{document.role}</p>
                  <dl><dt>何时阅读</dt><dd>{document.readWhen}</dd></dl>
                  <nav aria-label={`${document.title}在线阅读与关联网页`}>
                    <a href={onlineDocumentHref(document.repositoryPath)} rel="noreferrer" target="_blank">在线阅读全文 ↗</a>
                    {document.relatedRoutes.map((route) => <Link href={route.href} key={route.href}>{route.label} →</Link>)}
                  </nav>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <footer className="site-foot">
        <p>ONLINE DOCUMENT CENTER · 20 FIRST-PARTY STUDY DOCUMENTS</p>
        <p>文档负责记录来源、方法和结论；网页负责展示图片、交互和实验关系。两者使用同一研究口径。</p>
      </footer>
    </main>
  );
}
