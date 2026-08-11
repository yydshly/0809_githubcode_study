"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RasterMeasurement = {
  inkPercent: number;
  inkPixels: number;
  totalPixels: number;
};

type RasterState =
  | { status: "measuring" }
  | { status: "ready"; measurement: RasterMeasurement }
  | { status: "error"; message: string };

export function PhotoDistillParameterLab() {
  const [strokeScale, setStrokeScale] = useState(11);
  const [anchorScale, setAnchorScale] = useState(5);
  const [thumbnail, setThumbnail] = useState(160);
  const [rasterState, setRasterState] = useState<RasterState>({ status: "measuring" });
  const svgRef = useRef<SVGSVGElement>(null);

  const metrics = useMemo(() => {
    const stroke = 2 + strokeScale * 0.22;
    const radius = 12 + anchorScale * 3.1;
    const anchorArea = (Math.PI * radius ** 2 * (1 + 0.48 ** 2 + 0.34 ** 2) / (600 * 800)) * 100;
    const thumbnailDiameter = (radius * 2 / 600) * thumbnail;
    const strokePass = stroke >= 3.7 && stroke <= 5.4;
    const areaPass = anchorArea >= 0.35 && anchorArea <= 1.1;
    const thumbnailPass = thumbnailDiameter >= 10;
    return {
      stroke,
      radius,
      anchorArea,
      thumbnailDiameter,
      strokePass,
      areaPass,
      thumbnailPass,
      pass: strokePass && areaPass && thumbnailPass,
    };
  }, [anchorScale, strokeScale, thumbnail]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let cancelled = false;
    setRasterState({ status: "measuring" });
    const serializedSvg = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      const sampleWidth = 300;
      const sampleHeight = 400;
      const canvas = document.createElement("canvas");
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        setRasterState({ status: "error", message: "当前浏览器无法建立 2D Canvas。" });
        return;
      }

      try {
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
        let inkPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          const paperDistance = Math.abs(pixels[index] - 238)
            + Math.abs(pixels[index + 1] - 230)
            + Math.abs(pixels[index + 2] - 215);
          if (alpha > 8 && paperDistance > 42) inkPixels += 1;
        }

        const totalPixels = sampleWidth * sampleHeight;
        setRasterState({
          status: "ready",
          measurement: {
            inkPercent: (inkPixels / totalPixels) * 100,
            inkPixels,
            totalPixels,
          },
        });
      } catch {
        setRasterState({ status: "error", message: "当前浏览器拒绝读取离屏 Canvas 像素。" });
      }
    };
    image.onerror = () => {
      if (!cancelled) setRasterState({ status: "error", message: "SVG 栅格化失败；调整参数可重新测量。" });
    };
    image.src = objectUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [anchorScale, strokeScale, thumbnail]);

  const rasterMeasurement = rasterState.status === "ready" ? rasterState.measurement : null;
  const rasterPass = rasterMeasurement !== null
    && rasterMeasurement.inkPercent >= 2.5
    && rasterMeasurement.inkPercent <= 5;
  const overallPass = metrics.pass && rasterPass;
  const overallStatus = rasterState.status === "measuring" ? "measuring" : rasterState.status === "error" ? "error" : overallPass ? "pass" : "fail";
  const overallLabel = rasterState.status === "measuring" ? "MEASURING" : rasterState.status === "error" ? "UNAVAILABLE" : overallPass ? "PASS" : "ADJUST";

  return (
    <section className="distill-lab" aria-labelledby="distill-lab-title">
      <header className="distill-lab__head">
        <div><p className="eyebrow">CODE-NATIVE EFFECT · LIVE</p><h5 id="distill-lab-title">关系量参数实验</h5></div>
        <strong data-status={overallStatus}>{overallLabel}</strong>
      </header>
      <div className="distill-lab__canvas">
        <svg ref={svgRef} viewBox="0 0 600 800" role="img" aria-label="由当前参数实时绘制的湖岸关系海报" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="800" fill="#eee6d7" />
          <path d="M78 308 C178 280 282 326 378 300 S514 272 548 290" fill="none" stroke="#1f4c67" strokeWidth={metrics.stroke * 1.2} opacity={Math.min(.92, .42 + strokeScale / 28)} />
          <path d="M68 446 C154 414 242 468 330 432 S472 400 548 438" fill="none" stroke="#1b2425" strokeWidth={metrics.stroke} opacity={Math.min(.86, .28 + strokeScale / 25)} />
          <path d="M430 136 C448 206 446 292 468 364" fill="none" stroke="#263c31" strokeWidth={metrics.stroke * 1.5} />
          <path d="M448 178 L420 238 M453 214 L486 270 M460 258 L430 324" stroke="#263c31" strokeWidth={metrics.stroke * .72} strokeLinecap="round" />
          <ellipse cx="196" cy="420" rx="66" ry="18" fill="#1d2d3f" />
          <path d="M142 416 Q196 380 250 416" fill="none" stroke="#eee6d7" strokeWidth={metrics.stroke * .75} />
          <circle cx="174" cy="538" r={metrics.radius} fill="#d7352f" />
          <circle cx="270" cy="564" r={metrics.radius * .48} fill="#d7352f" opacity=".62" />
          <circle cx="350" cy="548" r={metrics.radius * .34} fill="#d7352f" opacity=".4" />
          <text x="70" y="696" fill="#1b2425" fontFamily="Arial, sans-serif" fontSize="16" letterSpacing="4">RELATION MAP / CLEAN ROOM</text>
          <text x="70" y="730" fill="#5e625f" fontFamily="Arial, sans-serif" fontSize="13">STROKE {metrics.stroke.toFixed(2)}px · AREA {metrics.anchorArea.toFixed(2)}% · THUMB Ø {metrics.thumbnailDiameter.toFixed(1)}px</text>
        </svg>
      </div>
      <div className="distill-lab__controls">
        <div className="distill-lab__presets" aria-label="实验预设">
          <button type="button" onClick={() => { setStrokeScale(11); setAnchorScale(5); setThumbnail(160); }}>安全范围</button>
          <button type="button" onClick={() => { setStrokeScale(19); setAnchorScale(9); setThumbnail(100); }}>超限示例</button>
          <button type="button" onClick={() => { setStrokeScale(8); setAnchorScale(3); setThumbnail(220); }}>最小可见锚</button>
        </div>
        <label>主线宽尺度 <output>{strokeScale} → {metrics.stroke.toFixed(2)}px</output><input type="range" min="4" max="20" value={strokeScale} aria-valuetext={`主线宽 ${metrics.stroke.toFixed(2)} 像素`} onChange={(event) => setStrokeScale(Number(event.target.value))} /></label>
        <label>主锚半径尺度 <output>{anchorScale} → {metrics.radius.toFixed(1)}px</output><input type="range" min="1" max="12" value={anchorScale} aria-valuetext={`主锚半径 ${metrics.radius.toFixed(1)} 像素`} onChange={(event) => setAnchorScale(Number(event.target.value))} /></label>
        <label>缩略检查尺寸 <output>{thumbnail}px</output><input type="range" min="80" max="220" step="10" value={thumbnail} aria-valuetext={`${thumbnail} 像素缩略图`} onChange={(event) => setThumbnail(Number(event.target.value))} /></label>
      </div>
      <p className="distill-lab__note">前三项指标按 600 × 800 SVG 的几何尺寸计算；RASTER INK 会把当前完整 SVG 真正绘制到 300 × 400 离屏 Canvas，再逐像素比较暖纸底色，统计线、色锚与文字共同形成的实际着墨覆盖率。“超限示例”会越过本研究 5% 的着墨上限，明确展示像素 FAIL。像素结果会受浏览器栅格器和字体影响，因此阈值是本研究的本地 QA，不是上游标准。</p>
      <div className="distill-lab__metrics" aria-live="polite">
        <p data-status={metrics.strokePass ? "pass" : "fail"}><b>STROKE</b><span>{metrics.stroke.toFixed(2)}px · 目标 3.7–5.4px</span><strong>{metrics.strokePass ? "PASS" : "FAIL"}</strong></p>
        <p data-status={metrics.areaPass ? "pass" : "fail"}><b>ANCHOR AREA</b><span>{metrics.anchorArea.toFixed(2)}% · 目标 0.35–1.1%</span><strong>{metrics.areaPass ? "PASS" : "FAIL"}</strong></p>
        <p data-status={metrics.thumbnailPass ? "pass" : "fail"}><b>THUMB Ø</b><span>{metrics.thumbnailDiameter.toFixed(1)}px · 目标 ≥10px</span><strong>{metrics.thumbnailPass ? "PASS" : "FAIL"}</strong></p>
        <p data-status={rasterState.status === "measuring" ? "measuring" : rasterState.status === "error" ? "error" : rasterPass ? "pass" : "fail"}><b>RASTER INK</b><span>{rasterState.status === "measuring" ? "正在采样 120,000 px" : rasterState.status === "error" ? rasterState.message : `${rasterState.measurement.inkPercent.toFixed(2)}% · ${rasterState.measurement.inkPixels.toLocaleString()} / ${rasterState.measurement.totalPixels.toLocaleString()} px · 目标 2.5–5%`}</span><strong>{rasterState.status === "measuring" ? "…" : rasterState.status === "error" ? "N/A" : rasterPass ? "PASS" : "FAIL"}</strong></p>
      </div>
    </section>
  );
}
