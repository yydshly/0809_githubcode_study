import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMaskStroke,
  commitMaskStroke,
  composeCorrectedPixels,
  composeSolidBackgroundPixels,
  correctionZoomDimensions,
  createMaskCorrectionHistory,
  previewCorrectionDimensions,
  rebuildCorrectionMask,
  redoMaskStroke,
  resetMaskCorrection,
  summarizeCorrectionMask,
  undoMaskStroke,
  validateCorrectionExportDimensions,
} from "../web/mask-correction.js";

test("mask correction history preserves provider alpha and supports bounded undo and redo", () => {
  const history = createMaskCorrectionHistory({
    width: 5,
    height: 5,
    initialAlpha: Uint8ClampedArray.from({ length: 25 }, (_, index) => index === 12 ? 255 : 0),
    maxStrokes: 4,
  });
  const kept = commitMaskStroke(history, {
    tool: "keep",
    radius: 0.2,
    points: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }],
  });
  const erased = commitMaskStroke(kept, {
    tool: "erase",
    radius: 0.12,
    points: [{ x: 0.5, y: 0.5 }],
  });

  assert.equal(rebuildCorrectionMask(history)[12], 255);
  assert.equal(rebuildCorrectionMask(kept)[0], 255);
  assert.equal(rebuildCorrectionMask(erased)[12], 0);
  assert.deepEqual(rebuildCorrectionMask(undoMaskStroke(erased)), rebuildCorrectionMask(kept));
  assert.deepEqual(rebuildCorrectionMask(redoMaskStroke(undoMaskStroke(erased))), rebuildCorrectionMask(erased));
  assert.deepEqual(rebuildCorrectionMask(resetMaskCorrection(erased)), history.initialAlpha);
});

test("a new stroke after undo discards the redo branch without changing the original alpha", () => {
  const initialAlpha = new Uint8ClampedArray(16);
  let history = createMaskCorrectionHistory({ width: 4, height: 4, initialAlpha });
  history = commitMaskStroke(history, { tool: "keep", radius: 0.1, points: [{ x: 0, y: 0 }] });
  history = commitMaskStroke(history, { tool: "keep", radius: 0.1, points: [{ x: 1, y: 1 }] });
  history = undoMaskStroke(history);
  history = commitMaskStroke(history, { tool: "keep", radius: 0.1, points: [{ x: 1, y: 0 }] });
  assert.equal(history.strokes.length, 2);
  assert.equal(history.index, 2);
  assert.equal(redoMaskStroke(history), history);
  assert.deepEqual(initialAlpha, new Uint8ClampedArray(16));
});

test("bounded history fails closed instead of making preview and full-size export diverge", () => {
  let history = createMaskCorrectionHistory({
    width: 10,
    height: 2,
    initialAlpha: new Uint8ClampedArray(20),
    maxStrokes: 2,
  });
  history = commitMaskStroke(history, { tool: "keep", radius: 0.05, points: [{ x: 0, y: 0 }] });
  history = commitMaskStroke(history, { tool: "keep", radius: 0.05, points: [{ x: 0.5, y: 0 }] });
  assert.equal(history.strokes.length, 2);
  assert.throws(
    () => commitMaskStroke(history, { tool: "keep", radius: 0.05, points: [{ x: 1, y: 0 }] }),
    /最多保留 2 笔/,
  );
  assert.deepEqual(history.initialAlpha, new Uint8ClampedArray(20));
  assert.equal(rebuildCorrectionMask(history)[9], 0);
  assert.equal(rebuildCorrectionMask(undoMaskStroke(undoMaskStroke(history)))[0], 0);
});

test("continuous brush interpolation does not leave gaps between pointer samples", () => {
  const mask = new Uint8ClampedArray(20 * 4);
  applyMaskStroke(mask, 20, 4, {
    tool: "keep",
    radius: 0.12,
    points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
  });
  for (let x = 0; x < 20; x += 1) {
    assert.ok(mask[2 * 20 + x] > 0, `gap at ${x}`);
  }
});

test("corrected pixels use provider color for retained pixels and source color for restored pixels", () => {
  const source = Uint8ClampedArray.from([10, 20, 30, 255, 40, 50, 60, 255]);
  const result = Uint8ClampedArray.from([1, 2, 3, 180, 7, 8, 9, 0]);
  const output = composeCorrectedPixels({
    sourcePixels: source,
    resultPixels: result,
    mask: Uint8ClampedArray.from([120, 255]),
    width: 2,
    height: 1,
  });
  assert.deepEqual([...output], [1, 2, 3, 120, 40, 50, 60, 255]);
  assert.deepEqual(summarizeCorrectionMask(Uint8ClampedArray.from([0, 1, 254, 255])), {
    transparent: 1,
    partial: 2,
    opaque: 1,
    total: 4,
  });
});

test("solid background composition writes an opaque image and respects partial alpha", () => {
  const foreground = Uint8ClampedArray.from([
    200, 100, 50, 255,
    20, 40, 60, 0,
    100, 50, 0, 128,
  ]);
  const output = composeSolidBackgroundPixels({
    foregroundPixels: foreground,
    background: [240, 120, 60],
    width: 3,
    height: 1,
  });
  assert.deepEqual([...output], [200, 100, 50, 255, 240, 120, 60, 255, 170, 85, 30, 255]);
  assert.throws(() => composeSolidBackgroundPixels({ foregroundPixels: foreground, background: [0, 0], width: 3, height: 1 }));
});

test("preview dimensions preserve aspect without enlarging and invalid strokes fail closed", () => {
  assert.deepEqual(previewCorrectionDimensions(2400, 1200, 1000), { width: 1000, height: 500, scale: 5 / 12 });
  assert.deepEqual(previewCorrectionDimensions(320, 200, 1000), { width: 320, height: 200, scale: 1 });
  const mask = new Uint8ClampedArray(4);
  assert.throws(() => applyMaskStroke(mask, 2, 2, { tool: "paint", radius: 0.1, points: [{ x: 0, y: 0 }] }));
  assert.throws(() => applyMaskStroke(mask, 2, 2, { tool: "keep", radius: 0.5, points: [{ x: 0, y: 0 }] }));
  assert.throws(() => applyMaskStroke(mask, 2, 2, { tool: "erase", radius: 0.1, points: [{ x: -1, y: 0 }] }));
  assert.deepEqual(validateCorrectionExportDimensions(4000, 4000), { width: 4000, height: 4000, pixels: 16_000_000 });
  assert.throws(() => validateCorrectionExportDimensions(4001, 4000), /人工修正导出/);
  assert.throws(() => validateCorrectionExportDimensions(8193, 1), /人工修正导出/);
  assert.deepEqual(correctionZoomDimensions(1000, 500, 800, 600, 1), { width: 800, height: 400, fitScale: 0.8, zoom: 1 });
  assert.deepEqual(correctionZoomDimensions(1000, 500, 800, 600, 4), { width: 3200, height: 1600, fitScale: 0.8, zoom: 4 });
  assert.throws(() => correctionZoomDimensions(1000, 500, 800, 600, 3), /查看倍率/);
});
