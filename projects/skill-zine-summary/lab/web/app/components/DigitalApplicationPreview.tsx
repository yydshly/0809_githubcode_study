import type { CapabilityApplication } from "@/app/data/capability-explorations";
import type { DemoImage } from "@/app/data/skills";

function EmbeddedEffect({ image }: { image: DemoImage }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
  );
}

export function DigitalApplicationPreview({
  image,
  application,
  headingLevel = 5,
}: {
  image: DemoImage;
  application: CapabilityApplication;
  headingLevel?: 4 | 5;
}) {
  const Heading = headingLevel === 4 ? "h4" : "h5";

  return (
    <section className="capability-exploration__product" data-application-kind={application.kind} data-digital-application-preview>
      <header>
        <div><p className="eyebrow">效果如何进入产品 · DIGITAL APPLICATION STUDY</p><Heading>{application.title}</Heading></div>
        <p>{application.specification}</p>
      </header>
      <div className="capability-product-preview">
        <figure className="capability-product-preview__surface">
          <div className="capability-product-preview__label"><span>01 · 产品画布数字预演</span><b>{application.kind.toUpperCase()}</b></div>
          <div className="capability-product-preview__art" role="img" aria-label={`${application.title}完整产品画布`}>
            <EmbeddedEffect image={image} />
            <div className="capability-product-preview__copy"><small>LOCAL STUDY / {application.kind.toUpperCase()}</small><strong>{application.title}</strong><i aria-hidden="true" /><span>{application.specification}</span></div>
          </div>
          <figcaption>这里复用同一张 EFFECT，把它放进目标规格的网页画布；不是额外生成的成品图片，也不是已生产的实物。</figcaption>
        </figure>
        <figure className="capability-product-preview__context">
          <div className="capability-product-preview__label"><span>02 · 使用环境数字预演</span><b>CONTEXT</b></div>
          <div className="capability-product-preview__room" role="img" aria-label={`${application.title}在${application.context}中的数字预演`}>
            <div className="capability-product-preview__architecture" aria-hidden="true"><i /><i /><i /></div>
            <div className="capability-product-preview__installed"><EmbeddedEffect image={image} /></div>
            <div className="capability-product-preview__furniture" aria-hidden="true"><i /><i /></div>
          </div>
          <figcaption><strong>{application.context}</strong><span>用网页布局说明“可能在哪里被使用”，不冒充真实印刷、客户项目、现场投放或部署照片。</span></figcaption>
        </figure>
      </div>
    </section>
  );
}
