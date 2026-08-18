const GRID_COLUMNS = 3;
const GRID_TILES = GRID_COLUMNS * GRID_COLUMNS;

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < GRID_COLUMNS) throw new TypeError(`${label}必须是至少 3 px 的整数`);
  return value;
}

export const SOCIAL_GRID_TILE_COUNT = GRID_TILES;

export function socialGridLayout(width, height) {
  positiveInteger(width, "图片宽度");
  positiveInteger(height, "图片高度");
  if (width !== height) throw new RangeError("九宫格来源必须是正方形");
  const tileSize = Math.floor(width / GRID_COLUMNS);
  const usedSize = tileSize * GRID_COLUMNS;
  const offset = Math.floor((width - usedSize) / 2);
  const entries = [];
  for (let row = 0; row < GRID_COLUMNS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const number = row * GRID_COLUMNS + column + 1;
      entries.push(Object.freeze({
        id: `tile-${number}`,
        number,
        row,
        column,
        x: offset + column * tileSize,
        y: offset + row * tileSize,
        size: tileSize,
        filenameSuffix: `tile-${String(number).padStart(2, "0")}`,
      }));
    }
  }
  return Object.freeze({
    columns: GRID_COLUMNS,
    tileSize,
    usedSize,
    trimmedPixels: width - usedSize,
    entries: Object.freeze(entries),
  });
}
