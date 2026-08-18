const POSITIONS = new Set(["top", "bottom"]);
const ALIGNMENTS = new Set(["left", "center"]);
const TONES = new Set(["light", "dark"]);

export const SOCIAL_OVERLAY_DEFAULTS = Object.freeze({
  text: "",
  position: "bottom",
  alignment: "left",
  tone: "light",
});

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label}必须是正整数`);
  return value;
}

function normalizedText(value) {
  const text = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (Array.from(text).length > 40) throw new RangeError("社交标题最多 40 个字符");
  return text;
}

export function normalizeSocialOverlaySettings(settings = {}) {
  const normalized = Object.freeze({
    text: normalizedText(settings.socialTitle ?? settings.text ?? SOCIAL_OVERLAY_DEFAULTS.text),
    position: settings.socialTitlePosition ?? settings.position ?? SOCIAL_OVERLAY_DEFAULTS.position,
    alignment: settings.socialTitleAlignment ?? settings.alignment ?? SOCIAL_OVERLAY_DEFAULTS.alignment,
    tone: settings.socialTitleTone ?? settings.tone ?? SOCIAL_OVERLAY_DEFAULTS.tone,
  });
  if (!POSITIONS.has(normalized.position)) throw new TypeError("社交标题位置必须是顶部或底部");
  if (!ALIGNMENTS.has(normalized.alignment)) throw new TypeError("社交标题对齐必须是左对齐或居中");
  if (!TONES.has(normalized.tone)) throw new TypeError("社交标题颜色必须是浅色或深色");
  return normalized;
}

function wrapCharacters(context, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const character of Array.from(text)) {
    const candidate = `${line}${character}`;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line.trimEnd());
      line = character.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

export function socialOverlayLayout({ context, width, height, settings } = {}) {
  if (!context || typeof context.measureText !== "function") throw new TypeError("社交标题需要可测量文字的 Canvas context");
  positiveInteger(width, "社交图片宽度");
  positiveInteger(height, "社交图片高度");
  const normalized = normalizeSocialOverlaySettings(settings);
  if (!normalized.text) return Object.freeze({ settings: normalized, lines: Object.freeze([]), hidden: true });
  const shortEdge = Math.min(width, height);
  const safeInset = Math.max(12, Math.round(shortEdge * 0.07));
  const maxWidth = width - safeInset * 2;
  let fontSize = Math.max(18, Math.round(shortEdge * 0.075));
  let lines = [];
  while (fontSize >= 18) {
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    lines = wrapCharacters(context, normalized.text, maxWidth - fontSize * 0.8);
    if (lines.length <= 2) break;
    fontSize -= 2;
  }
  if (lines.length > 2) throw new RangeError("当前标题无法在两行安全区内完整显示");
  const lineHeight = Math.round(fontSize * 1.18);
  const paddingX = Math.round(fontSize * 0.42);
  const paddingY = Math.round(fontSize * 0.28);
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width));
  const boxWidth = Math.min(maxWidth, Math.ceil(textWidth + paddingX * 2));
  const boxHeight = lines.length * lineHeight + paddingY * 2;
  const x = normalized.alignment === "center" ? Math.round((width - boxWidth) / 2) : safeInset;
  const y = normalized.position === "top" ? safeInset : height - safeInset - boxHeight;
  return Object.freeze({
    settings: normalized,
    hidden: false,
    safeInset,
    fontSize,
    lineHeight,
    paddingX,
    paddingY,
    box: Object.freeze({ x, y, width: boxWidth, height: boxHeight }),
    lines: Object.freeze(lines),
  });
}

export function drawSocialOverlay({ context, width, height, settings } = {}) {
  if (!context || typeof context.fillText !== "function" || typeof context.fillRect !== "function") {
    throw new TypeError("社交标题需要可绘制文字的 Canvas context");
  }
  const layout = socialOverlayLayout({ context, width, height, settings });
  if (layout.hidden) return layout;
  const light = layout.settings.tone === "light";
  context.save();
  context.fillStyle = light ? "rgba(18, 23, 21, 0.66)" : "rgba(255, 255, 255, 0.82)";
  context.fillRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
  context.font = `700 ${layout.fontSize}px system-ui, sans-serif`;
  context.textBaseline = "top";
  context.textAlign = layout.settings.alignment === "center" ? "center" : "left";
  context.fillStyle = light ? "#FFFFFF" : "#17201C";
  const textX = layout.settings.alignment === "center"
    ? layout.box.x + layout.box.width / 2
    : layout.box.x + layout.paddingX;
  layout.lines.forEach((line, index) => {
    context.fillText(line, textX, layout.box.y + layout.paddingY + index * layout.lineHeight);
  });
  context.restore();
  return layout;
}
