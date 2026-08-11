import { DemoFigure } from "@/app/components/DemoFigure";
import type { DemoImage } from "@/app/data/skills";
import type { EffectApplication } from "@/app/data/effect-applications";

export function EffectApplicationShowcase({
  image,
  application,
  index,
}: {
  image: DemoImage;
  application: EffectApplication;
  index: number;
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article className="effect-application">
      <header className="effect-application__head">
        <span>{number}</span>
        <div>
          <p className="eyebrow">APPLICATION SCENARIO · COMPLETE EFFECT</p>
          <h4>{application.title}</h4>
        </div>
        <p>{application.scenario}</p>
      </header>

      <div className="effect-application__body">
        <DemoFigure image={image} label={`APPLICATION EFFECT · ${number}`} />
        <EffectApplicationBrief application={application} />
      </div>
    </article>
  );
}

export function EffectApplicationBrief({
  application,
  headingLevel = "h5",
}: {
  application: EffectApplication;
  headingLevel?: "h5" | "h6";
}) {
  const Heading = headingLevel;

  return (
    <div className="effect-application__brief">
      <section>
        <p className="eyebrow">WHO USES IT</p>
        <Heading>目标使用者</Heading>
        <p>{application.audience}</p>
      </section>
      <section>
        <p className="eyebrow">JOB TO BE DONE</p>
        <Heading>它在场景中的作用</Heading>
        <p>{application.jobToBeDone}</p>
      </section>
      <section className="effect-application__deliverables">
        <p className="eyebrow">DELIVERABLES</p>
        <Heading>可以形成的完整交付物</Heading>
        <ul>{application.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <p className="eyebrow">WHY THIS SKILL</p>
        <Heading>为什么适合</Heading>
        <p>{application.whyItFits}</p>
      </section>
      <section className="effect-application__extensions">
        <p className="eyebrow">EXTEND IT</p>
        <Heading>从这个场景继续扩展</Heading>
        <ul>{application.extensions.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <aside>
        <p className="eyebrow">BOUNDARY</p>
        <p>{application.boundary}</p>
      </aside>
    </div>
  );
}
