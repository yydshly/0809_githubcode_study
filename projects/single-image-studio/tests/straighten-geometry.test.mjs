import assert from "node:assert/strict";
import test from "node:test";

import {
  formatStraightenAngle,
  normalizeStraightenAngle,
  straightenCoverScale,
} from "../web/straighten-geometry.js";

test("straighten angle is bounded, rounded and formatted for people", () => {
  assert.equal(normalizeStraightenAngle("2.34"), 2.3);
  assert.equal(normalizeStraightenAngle(-0), 0);
  assert.equal(formatStraightenAngle(2.3), "+2.3°");
  assert.equal(formatStraightenAngle(-4), "-4°");
  assert.equal(formatStraightenAngle(0), "0°");
  assert.throws(() => normalizeStraightenAngle(10.1), /-10°–\+10°/u);
  assert.throws(() => normalizeStraightenAngle("not-a-number"), /有限数值/u);
});

test("cover scale is identity at zero and symmetric around zero", () => {
  assert.equal(straightenCoverScale(1600, 900, 0), 1);
  assert.equal(straightenCoverScale(1600, 900, 5), straightenCoverScale(1600, 900, -5));
  assert.ok(Math.abs(straightenCoverScale(1000, 1000, 10) - 1.1584559306791384) < 1e-12);
  assert.throws(() => straightenCoverScale(0, 900, 5), /有效画布尺寸/u);
});

test("cover scale keeps every viewport corner inside the rotated source", () => {
  const width = 1600;
  const height = 900;
  const angle = 7.5;
  const radians = angle * Math.PI / 180;
  const scale = straightenCoverScale(width, height, angle);
  for (const x of [-width / 2, width / 2]) {
    for (const y of [-height / 2, height / 2]) {
      const sourceX = (x * Math.cos(radians) + y * Math.sin(radians)) / scale;
      const sourceY = (-x * Math.sin(radians) + y * Math.cos(radians)) / scale;
      assert.ok(Math.abs(sourceX) <= width / 2 + 1e-9);
      assert.ok(Math.abs(sourceY) <= height / 2 + 1e-9);
    }
  }
});
