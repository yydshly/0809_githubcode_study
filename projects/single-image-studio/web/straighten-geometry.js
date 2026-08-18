export const STRAIGHTEN_MIN_DEGREES = -10;
export const STRAIGHTEN_MAX_DEGREES = 10;

export function normalizeStraightenAngle(value = 0) {
  const angle = Number(value);
  if (!Number.isFinite(angle)) throw new TypeError("水平校正角度必须是有限数值");
  if (angle < STRAIGHTEN_MIN_DEGREES || angle > STRAIGHTEN_MAX_DEGREES) {
    throw new RangeError(`水平校正角度必须在 ${STRAIGHTEN_MIN_DEGREES}°–+${STRAIGHTEN_MAX_DEGREES}° 之间`);
  }
  return Object.is(angle, -0) ? 0 : Math.round(angle * 10) / 10;
}

export function straightenCoverScale(width, height, angle = 0) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError("水平校正需要有效画布尺寸");
  }
  const normalized = normalizeStraightenAngle(angle);
  if (normalized === 0) return 1;
  const radians = Math.abs(normalized) * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return Math.max(
    cosine + height / width * sine,
    cosine + width / height * sine,
  );
}

export function formatStraightenAngle(value = 0) {
  const angle = normalizeStraightenAngle(value);
  if (angle === 0) return "0°";
  return `${angle > 0 ? "+" : ""}${angle}°`;
}
