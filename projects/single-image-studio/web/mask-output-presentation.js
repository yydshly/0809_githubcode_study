const BACKGROUNDS = Object.freeze({
  checker: Object.freeze({ label: "透明背景", format: "PNG" }),
  white: Object.freeze({ label: "白色背景", format: "JPEG" }),
  black: Object.freeze({ label: "黑色背景", format: "JPEG" }),
  coral: Object.freeze({ label: "彩色背景", format: "JPEG" }),
});

export function maskOutputPresentation({
  background,
  correctionCount,
  height,
  view,
  width,
}) {
  if (!(background in BACKGROUNDS)) throw new TypeError("unknown mask output background");
  if (!Number.isInteger(correctionCount) || correctionCount < 0) throw new TypeError("correctionCount must be a non-negative integer");
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("mask output dimensions must be positive integers");
  }
  if (!new Set(["automatic", "corrected"]).has(view)) throw new TypeError("unknown mask comparison view");

  const output = BACKGROUNDS[background];
  const corrected = correctionCount > 0;
  const comparingAutomatic = view === "automatic" && corrected;
  return Object.freeze({
    version: corrected ? `修正后 · ${correctionCount} 笔` : "自动结果",
    background: output.label,
    file: `${output.format} · ${width} × ${height}`,
    downloadLabel: background === "checker"
      ? (corrected ? "下载修正 PNG" : "下载透明 PNG")
      : `下载${output.label.replace("背景", "底")} JPEG`,
    note: comparingAutomatic
      ? "当前画布正在对比自动结果；最终下载仍使用修正后版本。"
      : corrected
        ? "最终下载会应用全部修正，不会覆盖自动结果。"
        : "尚未人工修改；最终下载使用自动抠图结果。",
  });
}
