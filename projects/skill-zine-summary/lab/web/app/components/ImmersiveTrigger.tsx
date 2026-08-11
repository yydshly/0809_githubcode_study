"use client";

import type { DemoImage } from "@/app/data/skills";
import type { ReactNode } from "react";

export const IMMERSIVE_VIEWER_OPEN_EVENT = "zine:immersive-viewer-open";

export type ImmersiveViewerOpenDetail = {
  trigger: HTMLButtonElement;
};

export function ImmersiveTrigger({
  image,
  label,
  children,
}: {
  image: DemoImage;
  label: string;
  children: ReactNode;
}) {
  function openViewer(event: React.MouseEvent<HTMLButtonElement>) {
    window.dispatchEvent(
      new CustomEvent<ImmersiveViewerOpenDetail>(IMMERSIVE_VIEWER_OPEN_EVENT, {
        detail: { trigger: event.currentTarget },
      }),
    );
  }

  return (
    <button
      type="button"
      className="immersive-trigger"
      aria-label={`沉浸式查看：${label}，${image.alt}`}
      aria-haspopup="dialog"
      aria-controls="immersive-image-viewer"
      data-viewer-trigger
      onClick={openViewer}
    >
      {children}
      <span className="immersive-trigger__hint" aria-hidden="true">沉浸查看 ↗</span>
    </button>
  );
}
