const BACKGROUNDS = Object.freeze({
  checker: Object.freeze({ label: "透明背景", shortLabel: "透明", format: "PNG", rgb: null }),
  white: Object.freeze({ label: "白色背景", shortLabel: "白色", format: "JPEG", rgb: Object.freeze([255, 255, 255]) }),
  black: Object.freeze({ label: "黑色背景", shortLabel: "黑色", format: "JPEG", rgb: Object.freeze([0, 0, 0]) }),
  coral: Object.freeze({ label: "彩色背景", shortLabel: "彩色", format: "JPEG", rgb: Object.freeze([238, 111, 87]) }),
});

function normalizeHexColor(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new TypeError("custom mask background must be a six-digit hex color");
  }
  return value.toUpperCase();
}

export function resolveMaskBackground({ background, customColor = "#EE6F57" }) {
  if (background === "custom") {
    const hex = normalizeHexColor(customColor);
    const rgb = Object.freeze([
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ]);
    return Object.freeze({
      label: `自定义背景 · ${hex}`,
      shortLabel: `自定义 ${hex}`,
      format: "JPEG",
      hex,
      rgb,
    });
  }
  if (!(background in BACKGROUNDS)) throw new TypeError("unknown mask output background");
  return BACKGROUNDS[background];
}

export function maskOutputPresentation({
  background,
  customColor,
  correctionCount,
  height,
  view,
  width,
}) {
  if (!Number.isInteger(correctionCount) || correctionCount < 0) throw new TypeError("correctionCount must be a non-negative integer");
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("mask output dimensions must be positive integers");
  }
  if (!new Set(["automatic", "corrected"]).has(view)) throw new TypeError("unknown mask comparison view");

  const output = resolveMaskBackground({ background, customColor });
  const corrected = correctionCount > 0;
  const comparingAutomatic = view === "automatic" && corrected;
  return Object.freeze({
    version: corrected ? `修正后 · ${correctionCount} 笔` : "自动结果",
    background: output.label,
    file: `${output.format} · ${width} × ${height}`,
    downloadLabel: background === "checker"
      ? (corrected ? "下载修正 PNG" : "下载透明 PNG")
      : background === "custom" ? "下载自定义底 JPEG" : `下载${output.label.replace("背景", "底")} JPEG`,
    note: comparingAutomatic
      ? "当前画布正在对比自动结果；最终下载仍使用修正后版本。"
      : corrected
        ? "最终下载会应用全部修正，不会覆盖自动结果。"
        : "尚未人工修改；最终下载使用自动抠图结果。",
  });
}
