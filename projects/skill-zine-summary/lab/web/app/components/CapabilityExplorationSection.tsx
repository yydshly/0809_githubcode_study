import Link from "next/link";
import { DemoFigure } from "@/app/components/DemoFigure";
import { DigitalApplicationPreview } from "@/app/components/DigitalApplicationPreview";
import type { CapabilityExploration } from "@/app/data/capability-explorations";

export function CapabilityExplorationSection({ entries }: { entries: readonly CapabilityExploration[] }) {
  if (entries.length === 0) return null;
  const isRevision7Batch = entries.some((entry) => Boolean(entry.application));

  return (
    <section className="capability-explorations" id="capability-explorations">
      <header className="capability-explorations__heading">
        <div>
          <p className="eyebrow">CROSS-SUBJECT EXPLORATION · {entries.length} STUDIES</p>
          <h3>跨题材能力探索</h3>
        </div>
        <p>{isRevision7Batch ? "本页的两组案例属于 Revision 7：从 7 张本地合成来源中选择与这个 Skill 原有基线不同的题材，形成 2 个新的能力问题和 2 张新效果。" : "本页三组是跨题材研究的先行样板，用代码原生效果验证人物、复杂城市和四季系列能否共用同一套关系语法。"}</p>
      </header>

      <section className="capability-explorations__brief" aria-labelledby="capability-brief-title">
        <div className="capability-explorations__brief-lead">
          <p className="eyebrow">这部分到底是什么意思</p>
          <h4 id="capability-brief-title">不是再放几张好看的图，<br />而是换输入后重新回答能力问题。</h4>
          <p>{isRevision7Batch ? "Revision 7 复用了 7 张可控来源，为其余 12 个 Skill 各提出 2 个新问题，共制作 24 张新的本地概念效果。它们不是 12 个上游 Skill 的实际运行输出。" : "Photo Distill 的 3 组案例先证明了这种研究方法可行；它们不计入 Revision 7 后来为其余 12 个 Skill 新增的 24 张效果。"}</p>
          <Link className="button button--dark" href="/reports/revision-7">阅读完整 Revision 7 研究报告</Link>
        </div>
        <ol className="capability-explorations__method" aria-label="跨题材研究四步方法">
          <li><span>01</span><strong>换一个输入问题</strong><p>选择人物、群体、静物或建筑等与已有基线不同的题材。</p></li>
          <li><span>02</span><strong>按 Skill 规则重构</strong><p>提取该 Skill 的视觉语法，生成一张新的本地研究效果。</p></li>
          <li><span>03</span><strong>和完整 SOURCE 对照</strong><p>检查保留、未保留和意外损失，并给出成立或部分成立结论。</p></li>
          <li><span>04</span><strong>解释如何进入产品</strong><p>把同一效果放进网页产品画布与环境中预演，不冒充真实生产。</p></li>
        </ol>
        <div className="capability-explorations__evidence">
          <p><strong>SOURCE</strong><span>本地合成或可控输入，负责提供完整事实。</span></p>
          <p><strong>EFFECT</strong><span>本轮新生成的概念效果，不是上游官方输出。</span></p>
          <p><strong>PRODUCT PREVIEW</strong><span>复用 EFFECT 的 HTML/CSS 数字语境，不是另一张新效果或真实成品。</span></p>
        </div>
      </section>

      <div className="capability-explorations__list">
        {entries.map((entry, index) => {
          const number = String(index + 1).padStart(2, "0");
          return (
            <article className="capability-exploration" key={entry.id} data-capability-exploration={entry.id}>
              <header className="capability-exploration__head">
                <span>{number}</span>
                <div><p className="mono">NEW SUBJECT · LOCAL RESEARCH EFFECT</p><h4>{entry.title}</h4></div>
                <p>{entry.question}</p>
              </header>

              {entry.conclusion && (
                <section className="capability-exploration__action" data-conclusion-status={entry.conclusion.status}>
                  <div><p className="eyebrow">本组具体做了什么</p><h5>{entry.conclusion.action}</h5></div>
                  <p><strong>{entry.conclusion.status}</strong><span>{entry.conclusion.finding}</span></p>
                </section>
              )}

              <div className="capability-exploration__pair">
                <DemoFigure image={entry.source} label={`COMPLETE SOURCE · ${number}`} />
                <DemoFigure image={entry.effect} label={`COMPLETE EFFECT · ${number}`} />
              </div>

              <div className="capability-exploration__selection">
                <section>
                  <p className="eyebrow">WHAT REMAINS</p>
                  <h5>实际保留了什么</h5>
                  <ul>{entry.retained.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <p className="eyebrow">WHAT IS NOT RETAINED</p>
                  <h5>结果中没有保留什么</h5>
                  <ul>{entry.discarded.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              </div>

              {entry.conclusion && (
                <section className="capability-exploration__verdict" aria-label={`${entry.title}的研究结论`}>
                  <div><p className="eyebrow">证明了什么</p><h6>{entry.conclusion.proves}</h6></div>
                  <div><p className="eyebrow">没有证明什么</p><h6>{entry.conclusion.doesNotProve}</h6></div>
                  <div><p className="eyebrow">进入真实生产还要做什么</p><h6>{entry.conclusion.productionNext}</h6></div>
                </section>
              )}

              <div className="capability-exploration__application">
                <section>
                  <p className="eyebrow">BEST PRODUCT DIRECTIONS</p>
                  <h5>最适合继续形成的产品</h5>
                  <ul>{entry.productDirections.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <ol aria-label={`${entry.title}的三步处理说明`}>
                  {entry.process.map((step, stepIndex) => (
                    <li key={step}><span>{String(stepIndex + 1).padStart(2, "0")}</span><p>{step}</p></li>
                  ))}
                </ol>
              </div>
              {entry.application && <DigitalApplicationPreview image={entry.effect} application={entry.application} />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
