export const VERTICAL_PERSPECTIVE_MIN = -20;
export const VERTICAL_PERSPECTIVE_MAX = 20;

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label}必须是有限数值`);
  return number;
}

export function normalizeVerticalPerspective(value) {
  const amount = Math.round(finite(value, "垂直透视") * 10) / 10;
  if (amount < VERTICAL_PERSPECTIVE_MIN || amount > VERTICAL_PERSPECTIVE_MAX) {
    throw new RangeError("垂直透视必须在 -20–+20 之间");
  }
  return Object.is(amount, -0) ? 0 : amount;
}

export function verticalPerspectiveProfile(value) {
  const amount = normalizeVerticalPerspective(value);
  const ratio = amount / 100;
  const top = 1 + ratio;
  const bottom = 1 - ratio;
  return Object.freeze({
    amount,
    top,
    bottom,
    coverScale: 1 / Math.min(top, bottom),
  });
}

export function formatVerticalPerspective(value) {
  const amount = normalizeVerticalPerspective(value);
  if (amount === 0) return "0";
  return `${amount > 0 ? "+" : ""}${amount}`;
}

export function verticalPerspectiveDirection(value) {
  const amount = normalizeVerticalPerspective(value);
  if (amount === 0) return "无校正";
  return amount > 0 ? "上宽" : "下宽";
}

export function drawVerticalPerspective({ context, source, width, height, value }) {
  if (!context || typeof context.drawImage !== "function") throw new TypeError("垂直透视需要可绘制的 2D context");
  if (!source) throw new TypeError("垂直透视需要来源画布");
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new TypeError("垂直透视需要正整数画布尺寸");
  }
  const profile = verticalPerspectiveProfile(value);
  if (profile.amount === 0) {
    context.drawImage(source, 0, 0, width, height);
    return profile;
  }
  const denominator = Math.max(1, height - 1);
  for (let y = 0; y < height; y += 1) {
    const progress = y / denominator;
    const factor = (profile.top + (profile.bottom - profile.top) * progress) * profile.coverScale;
    const destinationWidth = width * factor;
    context.drawImage(source, 0, y, width, 1, (width - destinationWidth) / 2, y, destinationWidth, 1);
  }
  return profile;
}
