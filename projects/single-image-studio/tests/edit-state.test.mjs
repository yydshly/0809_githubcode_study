import assert from "node:assert/strict";
import test from "node:test";

import {
  applyEdit,
  createEditHistory,
  createEditState,
  redoEdit,
  reduceEditState,
  undoEdit,
} from "../web/edit-state.js";

test("EditState starts as an immutable lossless PNG edit contract", () => {
  const state = createEditState();
  assert.equal(state.version, "edit-state.v1");
  assert.deepEqual(state.crop, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(state.output.format, "png");
  assert.equal(state.resize.allowUpscale, false);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.crop), true);
  assert.throws(() => { state.rotation = 90; }, TypeError);
});

test("EditState reducer composes rotation, flips, crop, adjustments, resize and output", () => {
  let state = createEditState();
  state = reduceEditState(state, { type: "rotate", degrees: 90 });
  state = reduceEditState(state, { type: "toggle-flip-horizontal" });
  state = reduceEditState(state, { type: "set-crop", crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 } });
  state = reduceEditState(state, { type: "set-adjustments", adjustments: { brightness: 12, saturation: -20 } });
  state = reduceEditState(state, { type: "set-resize", resize: { width: 1200, height: 900 } });
  state = reduceEditState(state, { type: "set-output", output: { format: "jpeg", jpegQuality: 0.8, jpegBackground: "#AABBCC" } });

  assert.equal(state.rotation, 90);
  assert.equal(state.flipHorizontal, true);
  assert.deepEqual(state.crop, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
  assert.deepEqual(state.adjustments, { brightness: 12, contrast: 0, saturation: -20 });
  assert.equal(state.resize.width, 1200);
  assert.equal(state.resize.height, 900);
  assert.deepEqual(state.output, { format: "jpeg", jpegQuality: 0.8, jpegBackground: "#aabbcc" });
  assert.equal(reduceEditState(createEditState(), { type: "rotate", degrees: -90 }).rotation, 270);
});

test("EditState rejects out-of-bounds geometry and unsafe output settings", () => {
  assert.throws(
    () => createEditState({ crop: { x: 0.7, y: 0, width: 0.4, height: 1 } }),
    /完整位于/,
  );
  assert.throws(() => createEditState({ rotation: 45 }), /旋转角度/);
  assert.throws(() => createEditState({ resize: { width: 9000 } }), /目标宽度/);
  assert.throws(() => createEditState({ adjustments: { contrast: 101 } }), /对比度/);
  assert.throws(() => createEditState({ output: { jpegQuality: 0.05 } }), /JPEG 质量/);
  assert.throws(() => createEditState({ output: { jpegBackground: "transparent" } }), /#RRGGBB/);
  assert.throws(() => reduceEditState(createEditState(), { type: "unknown" }), /不支持/);
});

test("bounded edit history supports undo, redo and branch invalidation", () => {
  let history = createEditHistory(createEditState(), { limit: 2 });
  history = applyEdit(history, { type: "rotate", degrees: 90 });
  history = applyEdit(history, { type: "rotate", degrees: 90 });
  history = applyEdit(history, { type: "toggle-flip-vertical" });
  assert.equal(history.past.length, 2);
  assert.equal(history.present.rotation, 180);
  assert.equal(history.present.flipVertical, true);

  history = undoEdit(history);
  assert.equal(history.present.flipVertical, false);
  history = undoEdit(history);
  assert.equal(history.present.rotation, 90);
  history = redoEdit(history);
  assert.equal(history.present.rotation, 180);

  history = applyEdit(history, { type: "set-adjustments", adjustments: { brightness: 5 } });
  assert.equal(history.future.length, 0);
  assert.equal(history.present.adjustments.brightness, 5);
  assert.equal(undoEdit(createEditHistory()).present.rotation, 0);
});

test("an edit action that changes no value does not create a history entry", () => {
  const history = createEditHistory(createEditState());
  const unchanged = applyEdit(history, { type: "set-adjustments", adjustments: { brightness: 0 } });
  assert.equal(unchanged, history);
});
