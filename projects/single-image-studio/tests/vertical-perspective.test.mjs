import assert from "node:assert/strict";
import test from "node:test";

import {
  drawVerticalPerspective,
  formatVerticalPerspective,
  normalizeVerticalPerspective,
  verticalPerspectiveDirection,
  verticalPerspectiveProfile,
} from "../web/vertical-perspective.js";

test("vertical perspective is bounded, rounded and explained in human terms", () => {
  assert.equal(normalizeVerticalPerspective("12.34"), 12.3);
  assert.equal(normalizeVerticalPerspective(-0), 0);
  assert.equal(formatVerticalPerspective(12), "+12");
  assert.equal(formatVerticalPerspective(-8), "-8");
  assert.equal(verticalPerspectiveDirection(12), "上宽");
  assert.equal(verticalPerspectiveDirection(-8), "下宽");
  assert.equal(verticalPerspectiveDirection(0), "无校正");
  assert.throws(() => normalizeVerticalPerspective(21), /-20–\+20/u);
});

test("profile keeps the narrow edge covering the canvas", () => {
  assert.deepEqual(verticalPerspectiveProfile(0), { amount: 0, top: 1, bottom: 1, coverScale: 1 });
  const positive = verticalPerspectiveProfile(20);
  assert.equal(positive.top, 1.2);
  assert.equal(positive.bottom, 0.8);
  assert.equal(positive.coverScale, 1.25);
  assert.deepEqual(verticalPerspectiveProfile(-20), {
    amount: -20,
    top: 0.8,
    bottom: 1.2,
    coverScale: 1.25,
  });
});

test("strip renderer is centered, directional and has a zero-value fast path", () => {
  const calls = [];
  const context = { drawImage: (...args) => calls.push(args) };
  const source = { id: "source" };
  drawVerticalPerspective({ context, source, width: 100, height: 3, value: 20 });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].slice(1), [0, 0, 100, 1, -25, 0, 150, 1]);
  assert.deepEqual(calls[2].slice(1), [0, 2, 100, 1, 0, 2, 100, 1]);

  calls.length = 0;
  drawVerticalPerspective({ context, source, width: 100, height: 3, value: 0 });
  assert.deepEqual(calls, [[source, 0, 0, 100, 3]]);
});
