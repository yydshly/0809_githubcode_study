import type { Metadata } from "next";
import Link from "@/app/components/Link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { multiSourceStats } from "@/app/data/multi-source-experiments";
import {
  commonTasks,
  enrichedSkillSelectionEntries,
  getSkillSelectionResults,
  selectionOptions,
  type EnrichedSkillSelectionEntry,
  type SelectionDimension,
  type SkillSelectionFilters,
  type SkillSelectionResultItem,
} from "@/app/data/skill-selection-guide";

export const metadata: Metadata = {
  title: "从任务反选 Skill · Zine Skill 能力研究站",
  description: "按用途、真实性契约、技术路径和产品化形态，从现有证据中选择适合继续研究的 Zine Skill。",
};

type ChoosePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dimensions: readonly SelectionDimension[] = ["purpose", "fidelity", "path", "format"];

const dimensionLabels: Record<SelectionDimension, string> = {
  purpose: "用途",
  fidelity: "真实性契约",
  path: "技术路径",
  format: "产品化形态",
};

const dimensionPrompts: Record<SelectionDimension, string> = {
  purpose: "这次要解决什么任务？",
  fidelity: "SOURCE 必须保留到什么程度？",
  path: "希望使用哪种实现路径？",
  format: "结果准备进入哪类载体？",
};

type OptionRecord = { value: string; label: string; description: string };

function optionsFor(dimension: SelectionDimension): readonly OptionRecord[] {
  return selectionOptions[dimension] as readonly OptionRecord[];
}

function optionLabel(dimension: SelectionDimension, value: string): string {
  return optionsFor(dimension).find((option) => option.value === value)?.label ?? value;
}

function optionDescription(dimension: SelectionDimension, value: string): string {
  return optionsFor(dimension).find((option) => option.value === value)?.description ?? "";
}

function filterHref(filters: SkillSelectionFilters): string {
  const params = new URLSearchParams();
  dimensions.forEach((dimension) => {
    if (filters[dimension] !== "all") params.set(dimension, filters[dimension]);
  });
  const query = params.toString();
  return `/choose${query ? `?${query}` : ""}#results`;
}

function entryDimensionValue(entry: EnrichedSkillSelectionEntry, dimension: SelectionDimension): string {
  if (dimension === "purpose") return entry.purposes.map((value) => optionLabel("purpose", value)).join("、");
  if (dimension === "fidelity") return optionLabel("fidelity", entry.fidelity);
  if (dimension === "path") return optionLabel("path", entry.path);
  return entry.formats.map((value) => optionLabel("format", value)).join("、");
}

function ResultCard({
  entry,
  filters,
  showMismatches,
}: {
  entry: SkillSelectionResultItem;
  filters: SkillSelectionFilters;
  showMismatches: boolean;
}) {
  return (
    <article className="choose-result-card" data-selection-skill={entry.skillSlug}>
      <header className="choose-result-card__head">
        <span>{entry.index}</span>
        <div>
          <p className="mono">{entry.skill.route}</p>
          <h3>{entry.name}</h3>
        </div>
        <b data-r12-status={entry.localR12Status}>R12 · {entry.localR12Status}</b>
      </header>

      {showMismatches && (
        <section className="choose-result-card__mismatches" aria-label={`${entry.name} 与所选条件不一致的维度`}>
          <strong>最近候选，不是完全匹配</strong>
          <ul>
            {entry.mismatchDimensions.map((dimension) => (
              <li key={dimension}>
                <b data-mismatch-dimension={dimension}>{dimensionLabels[dimension]}</b>
                <span>所选：{optionLabel(dimension, filters[dimension])}</span>
                <span>此路线：{entryDimensionValue(entry, dimension)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="choose-result-card__summary">{entry.skill.summary}</p>

      <dl className="choose-result-card__contracts">
        <div>
          <dt>目标真实性契约</dt>
          <dd>{entry.targetContract}</dd>
        </div>
        <div>
          <dt>R12 本地结论</dt>
          <dd><strong>{entry.localR12Status}</strong> · {entry.revision12.finding}</dd>
        </div>
      </dl>

      <section className="choose-result-card__governance" aria-label={`${entry.name} 的上游与许可边界`}>
        <div>
          <strong>上游仓库</strong>
          <a href={entry.skill.upstreamUrl} rel="noreferrer" target="_blank">{entry.skill.repo} ↗</a>
        </div>
        <div>
          <strong>当前许可判断</strong>
          <span>{entry.skill.license}</span>
          <small>{entry.skill.licenseNote}</small>
        </div>
      </section>

      <div className="choose-result-card__judgement">
        <p><strong>为什么值得选</strong><span>{entry.reason}</span></p>
        <p><strong>需要接受的取舍</strong><span>{entry.tradeoff}</span></p>
      </div>

      <section className="choose-result-card__evidence" aria-labelledby={`evidence-${entry.skillSlug}`}>
        <header>
          <h4 id={`evidence-${entry.skillSlug}`}>三轮不同角度的代表案例</h4>
          <p>R10 换独立原图，R11 做反向题材压力，R12 再进入产品系统。它们共同帮助判断迁移能力，不是三次重复计分。</p>
        </header>
        <ol>
          {entry.representativeEvidence.map((evidence) => (
            <li key={evidence.href}>
              <div><span>{evidence.cohortLabel}</span><b>{evidence.status}</b></div>
              <h5><Link href={evidence.href}>{evidence.title}</Link></h5>
              <p>{evidence.finding}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="choose-result-card__validation" aria-labelledby={`validation-${entry.skillSlug}`}>
        <p className="eyebrow">NEXT FALSIFIABLE TEST</p>
        <h4 id={`validation-${entry.skillSlug}`}>{entry.nextValidation.title}</h4>
        <dl>
          <div><dt>下一步怎么测</dt><dd>{entry.nextValidation.experiment}</dd></div>
          <div><dt>什么情况算失败</dt><dd>{entry.nextValidation.failsWhen}</dd></div>
        </dl>
      </section>

      <div className="choose-result-card__counts" aria-label={`${entry.name} 的证据数量`}>
        <p><strong>{entry.pairCount}</strong><span>组图片 SOURCE → EFFECT</span></p>
        <p><strong>{entry.uniqueSourcePathCount}</strong><span>个不同来源路径</span></p>
      </div>

      <ul className="choose-result-card__truth" aria-label={`${entry.name} 的证据状态`}>
        <li data-state={entry.upstreamExecution.state}>{entry.upstreamExecution.label}</li>
        <li data-state={entry.productEvidence.state}>{entry.productEvidence.label}</li>
        <li data-state={entry.physicalEvidence.state}>{entry.physicalEvidence.label}</li>
        <li data-state={entry.publicHosting.state}>{entry.publicHosting.label}</li>
      </ul>

      <nav className="choose-result-card__actions" aria-label={`${entry.name} 的后续入口`}>
        <Link className="button button--dark" href={entry.evidenceHref}>查看 {entry.name} 的完整 SOURCE → EFFECT</Link>
        <Link className="button" href={entry.detailHref}>阅读 {entry.name} 的完整研究</Link>
        <Link className="button" href={entry.comparisonHref}>在统一原图中比较 {entry.name}</Link>
      </nav>
    </article>
  );
}

export default async function ChoosePage({ searchParams }: ChoosePageProps) {
  const rawSearchParams = await searchParams;
  const selection = getSkillSelectionResults({
    purpose: rawSearchParams.purpose,
    fidelity: rawSearchParams.fidelity,
    path: rawSearchParams.path,
    format: rawSearchParams.format,
  });
  const hasActiveFilters = selection.activeDimensions.length > 0;
  const showDetailedResults = selection.mode !== "all";

  return (
    <main>
      <SiteHeader />

      <section className="choose-hero">
        <div className="choose-hero__copy">
          <p className="eyebrow">REVISION 13 · TASK → SKILL → EVIDENCE</p>
          <h1>先决定必须保留什么，<br />再选择 Skill。</h1>
          <p className="choose-hero__intro">这里不比较谁更好看，也不把图片数量换算成分数。先说清用途、真实性、实现路径和产品形态，再进入现有 SOURCE → EFFECT 核对判断。</p>
          <aside className="choose-hero__boundary">
            <strong>选择器只路由现有证据</strong>
            <p>Revision 13 不新增效果图片；{multiSourceStats.imagePairCount} 组图片配对、{multiSourceStats.uniqueSourcePathCount} 个来源路径、{multiSourceStats.staticEffectCount} 个静态效果、{multiSourceStats.allEffectEvidenceCount} 个总效果证据和 {multiSourceStats.productSystemPreviewCount} 个产品系统保持不变。</p>
          </aside>
        </div>

        <section className="choose-tasks" aria-labelledby="common-task-title">
          <header>
            <p className="eyebrow">FIVE QUICK STARTS</p>
            <h2 id="common-task-title">从一个常见任务开始</h2>
          </header>
          <div className="choose-task-grid">
            {commonTasks.map((task, index) => (
              <Link data-common-selection-task={task.id} href={filterHref(task.filters)} key={task.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{task.title}</strong>
                <p>{task.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="choose-filter" aria-labelledby="choose-filter-title">
        <header className="choose-filter__head">
          <div>
            <p className="eyebrow">FOUR CONTRACTS · NATIVE GET FORM</p>
            <h2 id="choose-filter-title">用四个条件收窄候选</h2>
          </div>
          <p>每个条件都可以保持“全部”。完全匹配时只显示符合所有条件的 Skill；没有完全匹配时，页面会返回不一致维度最少的候选，并逐项公开差异。</p>
        </header>

        <form action="/choose#results" className="choose-filter__form" data-skill-selection-form="true" method="get">
          {dimensions.map((dimension) => (
            <fieldset key={dimension}>
              <legend>{dimensionLabels[dimension]}</legend>
              <label htmlFor={`choose-${dimension}`}>{dimensionPrompts[dimension]}</label>
              <select defaultValue={selection.filters[dimension]} id={`choose-${dimension}`} name={dimension}>
                {optionsFor(dimension).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p>{optionDescription(dimension, selection.filters[dimension])}</p>
            </fieldset>
          ))}
          <div className="choose-filter__actions">
            <button className="button button--dark" type="submit">匹配现有 Skill</button>
            <Link className="button" href="/choose#results">清除全部条件</Link>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="choose-results-title"
        className="choose-results"
        data-selection-mode={selection.mode}
        data-selection-result-count={selection.results.length}
        id="results"
      >
        <header className="choose-results__head">
          <div>
            <p className="eyebrow">{selection.mode === "all" ? "ALL 13 ROUTES" : selection.mode === "exact" ? "EXACT CONTRACT MATCH" : "NEAREST DISCLOSED MATCH"}</p>
            <h2 id="choose-results-title">{selection.mode === "all" ? "先选择任务或组合条件" : selection.mode === "exact" ? `${selection.results.length} 个完全匹配` : `${selection.results.length} 个最近候选`}</h2>
          </div>
          <div aria-live="polite">
            <p>{selection.explanation}</p>
            {hasActiveFilters && (
              <ul aria-label="当前筛选条件">
                {selection.activeDimensions.map((dimension) => <li key={dimension}><strong>{dimensionLabels[dimension]}</strong><span>{optionLabel(dimension, selection.filters[dimension])}</span></li>)}
              </ul>
            )}
          </div>
        </header>

        {showDetailedResults ? (
          <div className="choose-results__grid">
            {selection.results.map((entry) => (
              <ResultCard entry={entry} filters={selection.filters} key={entry.skillSlug} showMismatches={selection.mode === "nearest"} />
            ))}
          </div>
        ) : (
          <aside className="choose-results__empty" data-selection-default-state>
            <strong>默认不重复铺开 13 张长卡。</strong>
            <p>从上方 5 个常见任务或 4 个条件开始，页面才展开详细候选；下方证据地图始终保留全部 13 条路线、仓库边界与入口。</p>
          </aside>
        )}
      </section>

      <section className="choose-map" aria-labelledby="choose-map-title">
        <header className="choose-map__head">
          <div><p className="eyebrow">12 UPSTREAM REPOSITORIES · 13 SKILLS</p><h2 id="choose-map-title">即使没有命中，也能检查全部路线</h2></div>
          <p>这张地图始终保留 13 个 Skill 的目标契约、R12 结论和证据入口。它按研究编号排列，不按效果质量、图片数量或产品成熟度排名。</p>
        </header>
        <ol className="choose-map__grid">
          {enrichedSkillSelectionEntries.map((entry) => (
            <li data-selection-map-skill={entry.skillSlug} data-upstream-repo={entry.skill.repo} key={entry.skillSlug}>
              <header><span>{entry.index}</span><div><p className="mono">{entry.skill.route}</p><h3>{entry.name}</h3></div></header>
              <p>{entry.revision12.title}</p>
              <dl>
                <div><dt>目标真实性</dt><dd>{entry.targetContract}</dd></div>
                <div><dt>R12 本地结论</dt><dd>{entry.localR12Status}</dd></div>
                <div><dt>上游仓库</dt><dd><a href={entry.skill.upstreamUrl} rel="noreferrer" target="_blank">{entry.skill.repo} ↗</a></dd></div>
                <div><dt>许可边界</dt><dd>{entry.skill.license}</dd></div>
                <div><dt>适合形态</dt><dd>{entry.formats.map((value) => optionLabel("format", value)).join("、")}</dd></div>
                <div><dt>证据量</dt><dd>{entry.pairCount} 组 / {entry.uniqueSourcePathCount} 个来源路径</dd></div>
              </dl>
              <nav aria-label={`${entry.name} 的全量证据地图入口`}>
                <Link href={entry.evidenceHref}>查看 {entry.name} 的 R12 SOURCE → EFFECT</Link>
                <Link href={entry.detailHref}>进入 {entry.name} 研究页</Link>
              </nav>
            </li>
          ))}
        </ol>
      </section>

      <section className="choose-boundaries" aria-labelledby="choose-boundaries-title">
        <header>
          <div><p className="eyebrow">COMMON BOUNDARIES</p><h2 id="choose-boundaries-title">所有候选共同服从的边界</h2></div>
          <p>选中某条路线只说明下一步证据更相关，不表示它已经稳定运行、完成生产或取得超出当前研究展示范围的授权。</p>
        </header>
        <div className="choose-boundaries__grid">
          <article><span>01</span><h3>没有上游运行记录</h3><p>本地效果是研究性重构、确定性补证或代码实验，不冒充 13 个上游 Skill 的原生输出。</p></article>
          <article><span>02</span><h3>产品仍是数字预演</h3><p>R12 产品表面复用同一 EFFECT；它们不重复计为新效果，也不是客户项目或业务结果。</p></article>
          <article><span>03</span><h3>实体生产尚未测试</h3><p>纸张、出血、裁切、网点、安装、扫码、书写和邮寄必须分别形成真实证据后才能升级结论。</p></article>
          <article><span>04</span><h3>公开展示不扩大许可</h3><p>页面公开展示上游样例与本地研究结果，并逐项保留仓库、提交和许可说明；公开访问不改变原作者权利，也不自动允许再利用。</p></article>
        </div>
        <nav className="choose-boundaries__links" aria-label="继续阅读研究材料">
          <Link className="button button--dark" href="/research">回到研究总索引</Link>
          <Link className="button" href="/research#document-revision13-skill-chooser">阅读 Revision 13 完整选型与验证说明</Link>
          <Link className="button" href="/reports/revision-7">阅读仍保留的 Revision 7 报告</Link>
        </nav>
      </section>

      <footer className="site-foot">
        <p>REVISION 13 · TASK SELECTION, NOT QUALITY RANKING</p>
        <p>{multiSourceStats.imagePairCount} PAIRS / {multiSourceStats.uniqueSourcePathCount} SOURCE PATHS / {multiSourceStats.staticEffectCount} STATIC / {multiSourceStats.allEffectEvidenceCount} TOTAL · NO NEW EFFECTS</p>
      </footer>
    </main>
  );
}
