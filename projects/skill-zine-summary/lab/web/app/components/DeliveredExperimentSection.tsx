import { DemoFigure } from "@/app/components/DemoFigure";
import { EffectApplicationBrief } from "@/app/components/EffectApplicationShowcase";
import { PhotoDistillParameterLab } from "@/app/components/PhotoDistillParameterLab";
import { PhotoDistillRendererFingerprint } from "@/app/components/PhotoDistillRendererFingerprint";
import type { DeliveredExperiment } from "@/app/data/delivered-experiments";

const sourceLabels: Record<DeliveredExperiment["provenance"]["sourceKind"], string> = {
  synthetic: "LOCAL SYNTHETIC SOURCE",
  "local-study": "LOCAL STUDY SOURCE",
  code: "CODE SOURCE",
  text: "TEXT-ONLY SOURCE",
};

const effectLabels: Record<DeliveredExperiment["provenance"]["effectKind"], string> = {
  generated: "OUR IMAGE-GENERATED STUDY EFFECT",
  "deterministic-composite": "OUR DETERMINISTIC COMPOSITE",
  "clean-room-code": "OUR CLEAN-ROOM CODE EFFECT",
};

export function DeliveredExperimentSection({ experiments }: { experiments: readonly DeliveredExperiment[] }) {
  if (experiments.length === 0) return null;

  return (
    <section className="plan-delivery delivered-plan" id="delivered-experiments">
      <header className="plan-delivery__heading">
        <div><p className="eyebrow">PLAN EXPERIMENTS · {experiments.length} INDEPENDENT {experiments.length === 1 ? "STUDY" : "STUDIES"}</p><h3>下一轮计划已经变成可检查的实验</h3></div>
        <p>这里不再复用统一湖岸原图。每组保留原计划原文，展示独立输入与完整效果，并把方法、验收、真实用途和来源边界放在同一条证据链上；只完成部分验收的计划会继续留在开放队列。</p>
      </header>
      <div className="plan-delivery__list">
        {experiments.map((experiment, index) => {
          const number = String(index + 1).padStart(2, "0");
          const planStatus = experiment.planStatus ?? "complete";
          return (
            <article className="plan-experiment delivered-experiment" data-experiment-id={experiment.id} data-plan-status={planStatus} key={experiment.id}>
              <header className="plan-experiment__head">
                <span>{number}</span>
                <div>
                  <p className="mono">{experiment.kicker}</p>
                  <h4>{experiment.title}</h4>
                  <p className="plan-experiment__status" data-status={planStatus}>{planStatus === "complete" ? "ORIGINAL PLAN ANSWERED" : "PARTIAL EVIDENCE · QUESTION REMAINS OPEN"}</p>
                </div>
                <div className="plan-experiment__question">
                  <p className="mono">ORIGINAL PLAN · {experiment.originPlan.title}</p>
                  <p>{experiment.originPlan.description}</p>
                  <p><strong>实验问题：</strong>{experiment.question}</p>
                </div>
              </header>
              <div className="plan-experiment__pair">
                {experiment.source.kind === "image" ? (
                  <DemoFigure image={experiment.source.image} label={`${sourceLabels[experiment.provenance.sourceKind]} · ${number}`} />
                ) : (
                  <section className="experiment-text-source" aria-label="纯文本实验输入">
                    <p className="eyebrow">TEXT-ONLY SOURCE · {number}</p>
                    <blockquote>{experiment.source.text}</blockquote>
                    <p>{experiment.source.note}</p>
                  </section>
                )}
                {experiment.effect.kind === "image" ? (
                  <DemoFigure image={experiment.effect.image} label={`${effectLabels[experiment.provenance.effectKind]} · ${number}`} />
                ) : experiment.effect.component === "photo-distill-parameter-lab" ? <PhotoDistillParameterLab /> : <PhotoDistillRendererFingerprint />}
              </div>
              <div className="plan-experiment__evidence">
                <div><p className="eyebrow">SOURCE FACTS</p>{experiment.inputFacts.map((fact) => <p key={fact}>↳ {fact}</p>)}</div>
                <div><p className="eyebrow">{experiment.method.label}</p><p>{experiment.method.summary}</p><ul className="method-recipe">{experiment.method.recipe.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><p className="eyebrow">ACCEPTANCE RESULTS</p><ul>{experiment.acceptance.map((item) => <li className="acceptance-result" data-status={item.status} key={item.criterion}><b>{item.status === "pass" ? "PASS" : "QUALIFIED"}</b> · {item.criterion}<span>{item.outcome}</span></li>)}</ul></div>
              </div>
              <section className="plan-experiment__application">
                <header><div><p className="eyebrow">EFFECT → REAL USE</p><h5>{experiment.application.title}</h5></div><p>{experiment.application.scenario}</p></header>
                <EffectApplicationBrief application={experiment.application} headingLevel="h6" />
              </section>
              <aside className="plan-experiment__provenance">
                <p className="eyebrow">PROVENANCE & BOUNDARY</p>
                <div>
                  <p className="plan-experiment__provenance-types"><span>SOURCE · {experiment.provenance.sourceKind}</span><span>EFFECT · {experiment.provenance.effectKind}</span></p>
                  <p>{experiment.provenance.disclosure}</p>
                </div>
              </aside>
            </article>
          );
        })}
      </div>
    </section>
  );
}
