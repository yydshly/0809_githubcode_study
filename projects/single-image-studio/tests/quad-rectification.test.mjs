import assert from "node:assert/strict";
import test from "node:test";

import { createEditState } from "../web/edit-state.js";
import { buildRenderPlan } from "../web/editor-renderer.js";
import {
  DEFAULT_RECTIFICATION_QUAD,
  constrainRectificationPoint,
  normalizeRectificationQuad,
  quadAsFormSettings,
  quadFromFormSettings,
  rectifiedDimensions,
  rectifyRgbaPixels,
} from "../web/quad-rectification.js";

test("default four-corner selection is a lossless full-frame geometry contract", () => {
  assert.deepEqual(rectifiedDimensions(DEFAULT_RECTIFICATION_QUAD, 400, 300), { width: 400, height: 300 });
  const settings = quadAsFormSettings(DEFAULT_RECTIFICATION_QUAD);
  assert.deepEqual(quadFromFormSettings(settings), DEFAULT_RECTIFICATION_QUAD);
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  assert.deepEqual(
    [...rectifyRgbaPixels({ pixels, sourceWidth: 2, sourceHeight: 2, quad: DEFAULT_RECTIFICATION_QUAD, outputWidth: 2, outputHeight: 2 })],
    [...pixels],
  );
});

test("trapezoid dimensions and renderer plan use the same rectified plane", () => {
  const quad = normalizeRectificationQuad({
    topLeft: { x: 0.2, y: 0.1 },
    topRight: { x: 0.8, y: 0.1 },
    bottomRight: { x: 1, y: 0.9 },
    bottomLeft: { x: 0, y: 0.9 },
  });
  const dimensions = rectifiedDimensions(quad, 1000, 800);
  assert.deepEqual(dimensions, { width: 800, height: 671 });
  const plan = buildRenderPlan({
    sourceWidth: 1000,
    sourceHeight: 800,
    editState: createEditState({ rectification: { enabled: true, quad } }),
  });
  assert.deepEqual(plan.rectified, dimensions);
  assert.deepEqual(plan.output, dimensions);
  assert.equal(plan.rectification.enabled, true);
});

test("four-corner interaction constrains crossing and rejects invalid regions", () => {
  const moved = constrainRectificationPoint(DEFAULT_RECTIFICATION_QUAD, "topLeft", { x: 0.98, y: 0.98 });
  assert.ok(moved.topLeft.x <= 0.96);
  assert.ok(moved.topLeft.y <= 0.96);
  assert.throws(() => normalizeRectificationQuad({
    topLeft: { x: 0.6, y: 0 },
    topRight: { x: 0.4, y: 0 },
    bottomRight: { x: 0.4, y: 1 },
    bottomLeft: { x: 0.6, y: 1 },
  }), /足够大的有效区域/);
  assert.throws(() => constrainRectificationPoint(DEFAULT_RECTIFICATION_QUAD, "middle", { x: 0.5, y: 0.5 }), /不支持/);
});
