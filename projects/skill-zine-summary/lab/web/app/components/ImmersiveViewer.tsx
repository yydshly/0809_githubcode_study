"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IMMERSIVE_VIEWER_OPEN_EVENT,
  type ImmersiveViewerOpenDetail,
} from "@/app/components/ImmersiveTrigger";

type ViewerItem = {
  src: string;
  alt: string;
  caption: string;
  label: string;
};

function collectViewerItems() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-viewer-item]"));
  const items: ViewerItem[] = [];
  const itemIndexBySrc = new Map<string, number>();
  const itemIndexByElement = new Map<HTMLElement, number>();

  for (const element of elements) {
    const src = element.dataset.viewerSrc;
    if (!src) continue;

    let itemIndex = itemIndexBySrc.get(src);
    if (itemIndex !== undefined) {
      itemIndexByElement.set(element, itemIndex);
      continue;
    }

    itemIndex = items.length;
    itemIndexBySrc.set(src, itemIndex);
    itemIndexByElement.set(element, itemIndex);

    items.push({
      src,
      alt: element.dataset.viewerAlt || "演示图片",
      caption: element.dataset.viewerCaption || "",
      label: element.dataset.viewerLabel || "DEMO",
    });
  }

  return { items, itemIndexByElement };
}

function lockDocumentScroll() {
  const root = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
  const previous = {
    rootOverflow: root.style.overflow,
    rootScrollBehavior: root.style.scrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
  };

  root.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  if (scrollbarWidth > 0) body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;

  return () => {
    root.style.overflow = previous.rootOverflow;
    body.style.overflow = previous.bodyOverflow;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.width = previous.bodyWidth;
    body.style.paddingRight = previous.bodyPaddingRight;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollY);
    root.style.scrollBehavior = previous.rootScrollBehavior;
  };
}

export function ImmersiveViewer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<ViewerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const titleId = useId();
  const captionId = useId();
  const current = items[index] ?? null;

  const move = useCallback((delta: number) => {
    setIndex((currentIndex) => {
      if (items.length < 2) return currentIndex;
      return (currentIndex + delta + items.length) % items.length;
    });
  }, [items.length]);

  const closeViewer = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, []);

  const finishClose = useCallback(() => {
    setIsOpen(false);
    setItems([]);
    setIndex(0);
    setFailedSrc(null);

    const trigger = returnFocusRef.current;
    returnFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    function handleOpen(event: Event) {
      const { trigger } = (event as CustomEvent<ImmersiveViewerOpenDetail>).detail;
      const sourceItem = trigger.closest<HTMLElement>("[data-viewer-item]");
      const { items: nextItems, itemIndexByElement } = collectViewerItems();
      if (!sourceItem || nextItems.length === 0) return;

      const nextIndex = itemIndexByElement.get(sourceItem);
      if (nextIndex === undefined) return;

      const selectedItem = nextItems[nextIndex];
      if (!selectedItem) return;
      nextItems[nextIndex] = {
        ...selectedItem,
        alt: sourceItem.dataset.viewerAlt ?? selectedItem.alt,
        caption: sourceItem.dataset.viewerCaption ?? selectedItem.caption,
        label: sourceItem.dataset.viewerLabel ?? selectedItem.label,
      };
      returnFocusRef.current = trigger;
      setItems(nextItems);
      setIndex(nextIndex);
      setIsOpen(true);
    }

    window.addEventListener(IMMERSIVE_VIEWER_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(IMMERSIVE_VIEWER_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      window.queueMicrotask(finishClose);
      return;
    }

    const unlockScroll = lockDocumentScroll();
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      unlockScroll();
    };
  }, [finishClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeViewer, isOpen, move]);

  return (
    <>
      <dialog
        ref={dialogRef}
        id="immersive-image-viewer"
        className="immersive-viewer"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={captionId}
        onClose={finishClose}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeViewer();
        }}
      >
        {current && (
          <>
            <header className="immersive-viewer__header">
              <div className="immersive-viewer__identity">
                <p>{current.label}</p>
                <h2 id={titleId}>{current.alt}</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="immersive-viewer__button immersive-viewer__close"
                aria-label="关闭沉浸式查看器"
                aria-keyshortcuts="Escape"
                onClick={closeViewer}
              >
                关闭 <span aria-hidden="true">×</span>
              </button>
            </header>

            <div
              className="immersive-viewer__stage"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) closeViewer();
              }}
            >
              {failedSrc === current.src ? (
                <div className="immersive-viewer__fallback" role="status">
                  <strong>这张图片暂时无法加载</strong>
                  <p>可以直接打开完整原图，或切换到相邻演示继续查看。</p>
                  <a href={current.src} target="_blank" rel="noreferrer">打开完整原图 ↗</a>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.src}
                  alt={current.alt}
                  decoding="async"
                  draggable="false"
                  onError={() => setFailedSrc(current.src)}
                  style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center" }}
                />
              )}
            </div>

            <footer className="immersive-viewer__footer">
              <div className="immersive-viewer__caption">
                <p id={captionId}>{current.caption}</p>
                <a href={current.src} target="_blank" rel="noreferrer">打开完整原图 ↗</a>
              </div>
              <div className="immersive-viewer__navigation" aria-label="演示图片导航">
                <button
                  type="button"
                  className="immersive-viewer__button"
                  aria-label="查看上一张演示图"
                  aria-keyshortcuts="ArrowLeft"
                  disabled={items.length < 2}
                  onClick={() => move(-1)}
                >
                  ← 上一张
                </button>
                <span aria-live="polite" aria-atomic="true">{index + 1} / {items.length}</span>
                <button
                  type="button"
                  className="immersive-viewer__button"
                  aria-label="查看下一张演示图"
                  aria-keyshortcuts="ArrowRight"
                  disabled={items.length < 2}
                  onClick={() => move(1)}
                >
                  下一张 →
                </button>
              </div>
            </footer>
          </>
        )}
      </dialog>

      <style>{`
        .immersive-trigger {
          position: relative;
          display: block;
          width: 100%;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: zoom-in;
        }
        .immersive-trigger__hint {
          position: absolute;
          right: 10px;
          bottom: 10px;
          padding: 7px 9px;
          border: 1px solid rgba(255,255,255,.72);
          background: rgba(15,16,15,.82);
          color: #f2eee4;
          font: 9px/1 "Courier New", monospace;
          letter-spacing: .08em;
          pointer-events: none;
        }
        .immersive-trigger:focus-visible {
          outline: 3px solid var(--acid, #e1ef55);
          outline-offset: 4px;
        }
        .immersive-viewer {
          position: fixed;
          inset: 0;
          width: 100vw;
          max-width: none;
          height: 100vh;
          height: 100dvh;
          max-height: none;
          margin: 0;
          padding: 0;
          border: 0;
          background: #101211;
          color: #f2eee4;
          overflow: hidden;
        }
        .immersive-viewer[open] {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
        }
        .immersive-viewer::backdrop { background: rgba(8,9,8,.96); }
        .immersive-viewer__header,
        .immersive-viewer__footer {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 20px;
          padding-right: max(18px, env(safe-area-inset-right));
          padding-left: max(18px, env(safe-area-inset-left));
          background: #171918;
        }
        .immersive-viewer__header {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          min-height: 76px;
          padding-top: max(13px, env(safe-area-inset-top));
          padding-bottom: 13px;
          border-bottom: 1px solid #454743;
        }
        .immersive-viewer__identity { min-width: 0; }
        .immersive-viewer__identity p {
          margin: 0 0 6px;
          color: #e1ef55;
          font: 9px/1.2 "Courier New", monospace;
          letter-spacing: .1em;
        }
        .immersive-viewer__identity h2 {
          margin: 0;
          overflow: hidden;
          color: #f2eee4;
          font: 400 clamp(15px, 2vw, 22px)/1.25 Georgia, "Songti SC", serif;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .immersive-viewer__stage {
          min-width: 0;
          min-height: 0;
          padding: clamp(12px, 2.6vw, 38px);
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #0b0c0c;
          cursor: zoom-out;
        }
        .immersive-viewer__stage img {
          display: block;
          min-width: 0;
          min-height: 0;
          max-width: 100%;
          max-height: 100%;
          filter: drop-shadow(0 18px 36px rgba(0,0,0,.42));
          cursor: default;
          user-select: none;
        }
        .immersive-viewer__fallback {
          max-width: 440px;
          padding: 28px;
          border: 1px solid #767872;
          text-align: center;
        }
        .immersive-viewer__fallback strong {
          font: 400 22px/1.2 Georgia, "Songti SC", serif;
        }
        .immersive-viewer__fallback p {
          margin: 12px 0 18px;
          color: #d2cec4;
          font-size: 12px;
          line-height: 1.6;
        }
        .immersive-viewer__fallback a {
          color: #e1ef55;
          font: 10px/1.3 "Courier New", monospace;
        }
        .immersive-viewer__footer {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          min-height: 86px;
          padding-top: 13px;
          padding-bottom: max(13px, env(safe-area-inset-bottom));
          border-top: 1px solid #454743;
        }
        .immersive-viewer__caption { min-width: 0; }
        .immersive-viewer__caption p {
          max-width: 820px;
          margin: 0;
          color: #d2cec4;
          font-size: 12px;
          line-height: 1.5;
        }
        .immersive-viewer__caption a {
          display: inline-block;
          margin-top: 6px;
          color: #e1ef55;
          font: 9px/1.3 "Courier New", monospace;
          letter-spacing: .06em;
        }
        .immersive-viewer__navigation {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .immersive-viewer__navigation > span {
          min-width: 62px;
          text-align: center;
          color: #d2cec4;
          font: 10px/1 "Courier New", monospace;
        }
        .immersive-viewer__button {
          min-width: 44px;
          min-height: 44px;
          padding: 0 13px;
          border: 1px solid #767872;
          background: transparent;
          color: #f2eee4;
          font: 10px/1 "Courier New", monospace;
          letter-spacing: .04em;
          cursor: pointer;
        }
        .immersive-viewer__button:hover { border-color: #e1ef55; color: #e1ef55; }
        .immersive-viewer__button:focus-visible {
          outline: 3px solid #e1ef55;
          outline-offset: 3px;
        }
        .immersive-viewer__button:disabled { opacity: .38; cursor: not-allowed; }
        .immersive-viewer__close span { font-size: 18px; vertical-align: -1px; }
        @media (max-width: 720px) {
          .immersive-trigger__hint { right: 7px; bottom: 7px; }
          .immersive-viewer__header,
          .immersive-viewer__footer {
            padding-right: max(12px, env(safe-area-inset-right));
            padding-left: max(12px, env(safe-area-inset-left));
          }
          .immersive-viewer__header { min-height: 68px; gap: 10px; }
          .immersive-viewer__identity h2 { font-size: 15px; }
          .immersive-viewer__stage { padding: 10px; }
          .immersive-viewer__footer {
            grid-template-columns: 1fr;
            gap: 10px;
            max-height: 34dvh;
            overflow-y: auto;
          }
          .immersive-viewer__caption p { font-size: 11px; }
          .immersive-viewer__navigation { justify-content: space-between; }
          .immersive-viewer__button { padding: 0 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .immersive-trigger, .immersive-viewer * { scroll-behavior: auto !important; }
        }
      `}</style>
    </>
  );
}
