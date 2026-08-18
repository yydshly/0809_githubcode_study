import assert from "node:assert/strict";
import test from "node:test";

import { SOCIAL_GRID_TILE_COUNT, socialGridLayout } from "../web/social-grid-split.js";

test("social grid divides a square into nine ordered non-overlapping tiles", () => {
  const layout = socialGridLayout(1080, 1080);
  assert.equal(SOCIAL_GRID_TILE_COUNT, 9);
  assert.equal(layout.tileSize, 360);
  assert.equal(layout.trimmedPixels, 0);
  assert.equal(layout.entries.length, 9);
  assert.deepEqual(layout.entries.map(({ id, x, y }) => ({ id, x, y })), [
    { id: "tile-1", x: 0, y: 0 }, { id: "tile-2", x: 360, y: 0 }, { id: "tile-3", x: 720, y: 0 },
    { id: "tile-4", x: 0, y: 360 }, { id: "tile-5", x: 360, y: 360 }, { id: "tile-6", x: 720, y: 360 },
    { id: "tile-7", x: 0, y: 720 }, { id: "tile-8", x: 360, y: 720 }, { id: "tile-9", x: 720, y: 720 },
  ]);
  assert.equal(new Set(layout.entries.map(({ filenameSuffix }) => filenameSuffix)).size, 9);
});

test("social grid trims at most two centered edge pixels without stretching", () => {
  const layout = socialGridLayout(1001, 1001);
  assert.equal(layout.tileSize, 333);
  assert.equal(layout.usedSize, 999);
  assert.equal(layout.trimmedPixels, 2);
  assert.equal(layout.entries[0].x, 1);
  assert.equal(layout.entries.at(-1).x + layout.entries.at(-1).size, 1000);
  assert.throws(() => socialGridLayout(1000, 900), /必须是正方形/);
  assert.throws(() => socialGridLayout(2, 2), /至少 3 px/);
});
