import assert from "node:assert/strict";
import test from "node:test";

import { fitComparisonStage, orientedMediaDimensions } from "../web/result-stage.js";

test("square crop produces a visibly square result stage", () => {
  const fitted = fitComparisonStage({ mediaWidth: 1024, mediaHeight: 1024, availableWidth: 1100, maxHeight: 624 });
  assert.equal(fitted.width, 624);
  assert.equal(fitted.height, 624);
  assert.equal(fitted.aspectRatio, "1024 / 1024");
});

test("stage fitting preserves wide and tall image aspects inside both limits", () => {
  const wide = fitComparisonStage({ mediaWidth: 1600, mediaHeight: 900, availableWidth: 900, maxHeight: 624 });
  assert.equal(wide.width, 900);
  assert.equal(wide.height, 506.25);

  const tall = fitComparisonStage({ mediaWidth: 900, mediaHeight: 1600, availableWidth: 900, maxHeight: 400 });
  assert.equal(tall.width, 225);
  assert.equal(tall.height, 400);
});

test("source stage dimensions honor EXIF quarter-turn orientations", () => {
  assert.deepEqual(orientedMediaDimensions(1600, 900, 1), { width: 1600, height: 900 });
  assert.deepEqual(orientedMediaDimensions(1600, 900, 6), { width: 900, height: 1600 });
  assert.throws(() => orientedMediaDimensions(1600, 900, 9), /orientation/);
});
