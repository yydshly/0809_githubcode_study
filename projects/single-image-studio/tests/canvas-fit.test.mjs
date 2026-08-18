import assert from "node:assert/strict";
import test from "node:test";

import { CANVAS_FIT_RATIOS, applyCanvasFitToEditorSettings, canvasFitDimensions, canvasFitLayout, drawCanvasFit, normalizeCanvasFitSettings } from "../web/canvas-fit.js";
import { editStateFromSettings } from "../web/editor-session.js";

test("canvas fit exposes three practical ratios and explicit background policy", () => {
  assert.deepEqual(CANVAS_FIT_RATIOS.map(({ id }) => id), ["original", "square", "portrait", "wide", "custom"]);
  assert.deepEqual(canvasFitDimensions({ canvasRatio: "portrait", canvasLongEdge: 1600 }), { width: 1280, height: 1600 });
  assert.equal(normalizeCanvasFitSettings({ canvasBackground: "transparent" }).format, "png");
  assert.equal(normalizeCanvasFitSettings({ canvasBackground: "custom", canvasCustomBackground: "#123456" }).backgroundColor, "#123456");
});

test("long images can retain their source ratio or use an explicit custom ratio", () => {
  assert.deepEqual(canvasFitDimensions({ canvasRatio: "original", canvasSourceRatio: 0.25, canvasLongEdge: 2000 }), { width: 500, height: 2000 });
  assert.deepEqual(canvasFitDimensions({ canvasRatio: "custom", canvasCustomWidth: 2, canvasCustomHeight: 3, canvasLongEdge: 1800 }), { width: 1200, height: 1800 });
});

test("canvas ratio facts never overwrite the editor crop-mode string", () => {
  const settings = applyCanvasFitToEditorSettings({ ratio: "original", brightness: 0 }, {
    canvasRatio: "custom",
    canvasCustomWidth: 9,
    canvasCustomHeight: 16,
    canvasLongEdge: 1920,
    canvasMargin: 8,
    canvasBackground: "white",
  });
  assert.equal(settings.ratio, "original");
  assert.equal(settings.canvasRatio, "custom");
  assert.equal(settings.canvasCustomWidth, 9);
  assert.equal(settings.canvasCustomHeight, 16);
  assert.equal(settings.outputLongEdge, 1920);
  assert.equal(settings.format, "png");
  assert.equal(editStateFromSettings({ sourceWidth: 1200, sourceHeight: 2000, settings }).cropMode, "original");
});

test("whole source is contained inside the selected canvas without upscaling", () => {
  const wide = canvasFitLayout({ sourceWidth: 1200, sourceHeight: 1800, settings: { canvasRatio: "wide", canvasLongEdge: 1920, canvasMargin: 10 } });
  assert.equal(wide.width, 1920);
  assert.equal(wide.height, 1080);
  assert.equal(wide.drawHeight, 864);
  assert.equal(wide.drawWidth, 576);
  assert.equal(wide.x, 672);
  assert.equal(wide.y, 108);
  assert.equal(wide.sourceUpscaled, false);

  const small = canvasFitLayout({ sourceWidth: 320, sourceHeight: 240, settings: { canvasRatio: "square", canvasLongEdge: 1600, canvasMargin: 0 } });
  assert.equal(small.drawWidth, 320);
  assert.equal(small.drawHeight, 240);
});

test("canvas fit draw order is background then complete centered image", () => {
  const calls = [];
  const context = {
    fillStyle: null,
    clearRect: (...args) => calls.push(["clear", ...args]),
    fillRect: (...args) => calls.push(["fill", ...args]),
    drawImage: (...args) => calls.push(["draw", ...args]),
  };
  const image = {};
  const layout = drawCanvasFit({ context, image, sourceWidth: 800, sourceHeight: 600, settings: { canvasRatio: "square", canvasLongEdge: 1000, canvasMargin: 10, canvasBackground: "white" } });
  assert.deepEqual(calls[0], ["clear", 0, 0, 1000, 1000]);
  assert.deepEqual(calls[1], ["fill", 0, 0, 1000, 1000]);
  assert.deepEqual(calls[2], ["draw", image, layout.x, layout.y, layout.drawWidth, layout.drawHeight]);
  assert.equal(context.fillStyle, "#FFFFFF");
});

test("invalid fit controls fail closed", () => {
  assert.throws(() => normalizeCanvasFitSettings({ canvasRatio: "unknown" }), /画布比例/);
  assert.throws(() => normalizeCanvasFitSettings({ canvasRatio: "custom", canvasCustomWidth: 0 }), /自定义比例宽度/);
  assert.throws(() => normalizeCanvasFitSettings({ canvasMargin: 26 }), /0–25/);
  assert.throws(() => normalizeCanvasFitSettings({ canvasLongEdge: 319 }), /320–2048/);
});
