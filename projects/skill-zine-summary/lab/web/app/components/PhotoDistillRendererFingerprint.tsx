"use client";

import { useEffect, useRef, useState } from "react";

type FingerprintState =
  | { status: "measuring" }
  | { status: "ready"; engine: string; engineFamily: EngineFamily; svgHash: string; pixelHash: string; inkPercent: number; inkPixels: number }
  | { status: "error"; message: string };

type EngineFamily = "chromium" | "gecko" | "webkit" | "unknown";

const comparisonEngines: ReadonlyArray<{ family: Exclude<EngineFamily, "unknown">; label: string }> = [
  { family: "chromium", label: "CHROME / CHROMIUM" },
  { family: "gecko", label: "FIREFOX / GECKO" },
  { family: "webkit", label: "SAFARI / WEBKIT" },
];

function shortHash(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function detectEngine(userAgent: string) {
  if (/Edg\//.test(userAgent)) return { label: "Edge / Chromium", family: "chromium" as const };
  if (/Firefox\//.test(userAgent)) return { label: "Firefox / Gecko", family: "gecko" as const };
  if (/Chrome\//.test(userAgent)) return { label: "Chrome / Chromium", family: "chromium" as const };
  if (/Safari\//.test(userAgent) && /AppleWebKit\//.test(userAgent)) return { label: "Safari / WebKit", family: "webkit" as const };
  return { label: "Unknown browser engine", family: "unknown" as const };
}

export function PhotoDistillRendererFingerprint() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [fingerprint, setFingerprint] = useState<FingerprintState>({ status: "measuring" });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let cancelled = false;
    let objectUrl = "";

    async function measure() {
      try {
        await document.fonts?.ready;
        if (cancelled || !svg) return;

        const serialized = new XMLSerializer().serializeToString(svg);
        const svgDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
        const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
        objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("SVG decode failed"));
          image.src = objectUrl;
        });
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 400;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("2D Canvas unavailable");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let inkPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const distance = Math.abs(pixels[index] - 238)
            + Math.abs(pixels[index + 1] - 230)
            + Math.abs(pixels[index + 2] - 215);
          if (pixels[index + 3] > 8 && distance > 42) inkPixels += 1;
        }
        const pixelBytes = new Uint8Array(pixels.buffer.slice(0));
        const pixelDigest = await crypto.subtle.digest("SHA-256", pixelBytes);
        if (!cancelled) {
          const engine = detectEngine(navigator.userAgent);
          setFingerprint({
            status: "ready",
            engine: engine.label,
            engineFamily: engine.family,
            svgHash: shortHash(svgDigest),
            pixelHash: shortHash(pixelDigest),
            inkPercent: (inkPixels / (canvas.width * canvas.height)) * 100,
            inkPixels,
          });
        }
      } catch {
        if (!cancelled) setFingerprint({ status: "error", message: "当前浏览器无法完成固定 SVG 的像素指纹采样。" });
      }
    }

    measure();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const statusLabel = fingerprint.status === "measuring" ? "MEASURING" : fingerprint.status === "ready" ? "BASELINE READY" : "UNAVAILABLE";
  const unavailableEngines = fingerprint.status === "ready"
    ? comparisonEngines.filter((engine) => engine.family !== fingerprint.engineFamily)
    : [];

  return (
    <section className="renderer-fingerprint" aria-labelledby="renderer-fingerprint-title">
      <header className="renderer-fingerprint__head">
        <div><p className="eyebrow">CODE-NATIVE EFFECT · ENGINE BASELINE</p><h5 id="renderer-fingerprint-title">固定关系图的渲染指纹</h5></div>
        <strong data-status={fingerprint.status}>{statusLabel}</strong>
      </header>
      <div className="renderer-fingerprint__visual">
        <svg ref={svgRef} viewBox="0 0 600 800" role="img" aria-label="用于跨浏览器比较的固定湖岸关系图" xmlns="http://www.w3.org/2000/svg" data-fixture="lake-relations-v1">
          <rect width="600" height="800" fill="#eee6d7" />
          <path d="M72 292 C170 264 278 312 382 286 S514 260 548 280" fill="none" stroke="#1f4c67" strokeWidth="4.42" opacity=".82" />
          <path d="M66 438 C158 410 246 458 334 426 S468 392 548 430" fill="none" stroke="#1b2425" strokeWidth="4.42" opacity=".72" />
          <path d="M434 138 C450 210 448 294 470 368" fill="none" stroke="#263c31" strokeWidth="6.63" />
          <path d="M450 180 L422 240 M455 216 L488 272 M462 260 L432 326" stroke="#263c31" strokeWidth="3.18" strokeLinecap="round" />
          <ellipse cx="198" cy="418" rx="66" ry="18" fill="#1d2d3f" />
          <path d="M144 414 Q198 378 252 414" fill="none" stroke="#eee6d7" strokeWidth="3.32" />
          <circle cx="176" cy="540" r="27.5" fill="#d7352f" />
          <circle cx="272" cy="566" r="13.2" fill="#d7352f" opacity=".62" />
          <circle cx="352" cy="550" r="9.35" fill="#d7352f" opacity=".4" />
          <text x="70" y="696" fill="#1b2425" fontFamily="Arial, sans-serif" fontSize="16" letterSpacing="4">RELATION MAP / FIXTURE V1</text>
          <text x="70" y="730" fill="#5e625f" fontFamily="Arial, sans-serif" fontSize="13">600 × 800 · 300 × 400 SAMPLE · DPR INDEPENDENT CANVAS</text>
        </svg>
      </div>
      <div className="renderer-fingerprint__report" aria-live="polite">
        {fingerprint.status === "ready" ? (
          <>
            <p><b>ACTIVE ENGINE</b><strong>{fingerprint.engine}</strong></p>
            <p><b>SVG SHA-256</b><code>{fingerprint.svgHash}</code></p>
            <p><b>PIXEL SHA-256</b><code>{fingerprint.pixelHash}</code></p>
            <p><b>RASTER INK</b><strong>{fingerprint.inkPercent.toFixed(2)}% · {fingerprint.inkPixels.toLocaleString()} / 120,000 px</strong></p>
          </>
        ) : <p className="renderer-fingerprint__message">{fingerprint.status === "measuring" ? "等待字体并采样固定 SVG…" : fingerprint.message}</p>}
      </div>
      <div className="renderer-fingerprint__matrix">
        <p data-status={fingerprint.status === "ready" ? "ready" : fingerprint.status}><b>CURRENT SESSION</b><span>{fingerprint.status === "ready" ? fingerprint.engine : statusLabel}</span></p>
        {unavailableEngines.map((engine) => (
          <p data-status="unavailable" key={engine.family}><b>{engine.label}</b><span>UNAVAILABLE · 本会话未运行</span></p>
        ))}
      </div>
      <p className="renderer-fingerprint__note">这张卡只建立当前浏览器的可复现基线。只有在相同 SVG、字体、画布、像素阈值与版本记录下真实运行其他引擎后，才能比较容差并关闭“跨浏览器渲染”计划。</p>
    </section>
  );
}
