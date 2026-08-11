import type { DemoImage } from "@/app/data/skills";
import { ImmersiveTrigger } from "@/app/components/ImmersiveTrigger";

export function DemoFigure({ image, label, priority = false }: { image: DemoImage; label: string; priority?: boolean }) {
  return (
    <figure
      className="demo-figure"
      data-viewer-item=""
      data-viewer-src={image.src}
      data-viewer-alt={image.alt}
      data-viewer-caption={image.caption}
      data-viewer-label={label}
    >
      <div className="demo-figure__label">{label}</div>
      <div className="demo-figure__frame">
        <ImmersiveTrigger image={image} label={label}>
          {/* Natural dimensions are intentional: research images must never be cropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            style={{ width: "100%", height: "auto", objectFit: "contain" }}
          />
        </ImmersiveTrigger>
      </div>
      <figcaption><span>{image.caption}</span><a href={image.src} target="_blank" rel="noreferrer">打开完整原图 ↗</a></figcaption>
    </figure>
  );
}
