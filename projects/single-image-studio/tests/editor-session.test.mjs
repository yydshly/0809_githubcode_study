import assert from "node:assert/strict";
import test from "node:test";

import { editStateFromSettings, runLocalEditor } from "../web/editor-session.js";

test("editor settings map oriented geometry, controls and JPEG background into EditState", () => {
  const state = editStateFromSettings({
    sourceWidth: 400,
    sourceHeight: 300,
    sourceOrientation: 6,
    settings: {
      ratio: "portrait",
      rotation: "90",
      flipHorizontal: "on",
      brightness: "10",
      contrast: "-5",
      saturation: "20",
      format: "jpeg",
      jpegBackground: "#123456",
    },
  });
  assert.equal(state.rotation, 90);
  assert.equal(state.flipHorizontal, true);
  assert.equal(state.cropMode, "portrait");
  assert.deepEqual(state.crop, { x: 0.2, y: 0, width: 0.6, height: 1 });
  assert.deepEqual(state.resize, {
    width: 1536,
    height: 1920,
    allowUpscale: false,
    maxEdge: 2048,
    maxPixels: 16_000_000,
  });
  assert.deepEqual(state.adjustments, { brightness: 10, contrast: -5, saturation: 20 });
  assert.deepEqual(state.output, { format: "jpeg", jpegQuality: 0.92, jpegBackground: "#123456" });
});

test("original ratio preserves the complete oriented source with bounded output", () => {
  const state = editStateFromSettings({ sourceWidth: 800, sourceHeight: 600, settings: {} });
  assert.deepEqual(state.crop, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(state.resize.width, null);
  assert.equal(state.resize.height, null);
  assert.equal(state.output.format, "png");
});

test("positioned crop and custom output dimensions are renderer-bound and ratio-safe", () => {
  const state = editStateFromSettings({
    sourceWidth: 1000,
    sourceHeight: 500,
    settings: {
      ratio: "square",
      cropX: "100",
      cropY: "50",
      sizeMode: "custom",
      outputWidth: "400",
      outputHeight: "400",
    },
  });
  assert.deepEqual(state.crop, { x: 0.5, y: 0, width: 0.5, height: 1 });
  assert.deepEqual(state.resize, {
    width: 400,
    height: 400,
    allowUpscale: false,
    maxEdge: 2048,
    maxPixels: 16_000_000,
  });
  assert.throws(
    () => editStateFromSettings({
      sourceWidth: 1000,
      sourceHeight: 500,
      settings: { ratio: "square", cropX: 101 },
    }),
    /0–100/,
  );
  assert.throws(
    () => editStateFromSettings({
      sourceWidth: 1000,
      sourceHeight: 500,
      settings: { ratio: "square", sizeMode: "custom", outputWidth: 400, outputHeight: 300 },
    }),
    /当前画面比例一致/,
  );
});

test("free crop binds an explicit normalized rectangle to the same renderer contract", () => {
  const state = editStateFromSettings({
    sourceWidth: 1000,
    sourceHeight: 500,
    settings: {
      ratio: "free",
      cropLeft: 20,
      cropTop: 10,
      cropWidth: 50,
      cropHeight: 60,
      sizeMode: "custom",
      outputWidth: 1000,
      outputHeight: 600,
    },
  });
  assert.equal(state.cropMode, "free");
  assert.deepEqual(state.crop, { x: 0.2, y: 0.1, width: 0.5, height: 0.6 });
  assert.deepEqual(state.resize, {
    width: 1000,
    height: 600,
    allowUpscale: false,
    maxEdge: 2048,
    maxPixels: 16_000_000,
  });
  assert.throws(
    () => editStateFromSettings({
      sourceWidth: 100,
      sourceHeight: 100,
      settings: { ratio: "free", cropWidth: 5 },
    }),
    /至少保留原图的 10%/,
  );
  assert.throws(
    () => editStateFromSettings({
      sourceWidth: 100,
      sourceHeight: 100,
      settings: { ratio: "free", cropLeft: 60, cropWidth: 50 },
    }),
    /完整位于原图内/,
  );
});

test("editor settings fail closed for unknown ratio and invalid numeric controls", () => {
  assert.throws(
    () => editStateFromSettings({ sourceWidth: 10, sourceHeight: 10, settings: { ratio: "panorama" } }),
    /不支持的画面比例/,
  );
  assert.throws(
    () => editStateFromSettings({ sourceWidth: 10, sourceHeight: 10, settings: { brightness: "1.5" } }),
    /亮度 必须是整数/,
  );
  assert.throws(
    () => editStateFromSettings({ sourceWidth: 10, sourceHeight: 10, settings: { rotation: "45" } }),
    /旋转角度必须是/,
  );
});

test("local editor closes the decoder and returns only the renderer-validated output", async () => {
  let closed = false;
  const blob = new Blob([Uint8Array.of(1, 2, 3)], { type: "image/png" });
  const rendered = {
    blob,
    mime: "image/png",
    width: 2,
    height: 1,
    byteLength: 3,
    outputHash: "a".repeat(64),
    validationSummary: "validated",
    pixelValidation: { transparentPixels: 1, partialAlphaPixels: 0 },
  };
  const result = await runLocalEditor({
    file: new Blob([Uint8Array.of(9)], { type: "image/png" }),
    settings: { flipVertical: "on" },
    decode: async () => ({
      image: { width: 2, height: 1 },
      width: 2,
      height: 1,
      sourceOrientation: 1,
      close: () => { closed = true; },
    }),
    render: async ({ image, sourceOrientation, editState }) => {
      assert.deepEqual(image, { width: 2, height: 1 });
      assert.equal(sourceOrientation, 1);
      assert.equal(editState.flipVertical, true);
      return rendered;
    },
    createObjectUrl: () => "blob:validated-output",
  });
  assert.equal(closed, true);
  assert.equal(result.url, "blob:validated-output");
  assert.equal(result.extension, "png");
  assert.equal(result.hasAlpha, true);
  assert.equal(result.processor, "editor-canvas-renderer-v1");
  assert.equal(result.outputHash, "a".repeat(64));
});

test("local editor closes the decoder when rendering fails", async () => {
  let closed = false;
  await assert.rejects(
    runLocalEditor({
      file: new Blob([Uint8Array.of(9)], { type: "image/png" }),
      decode: async () => ({
        image: { width: 1, height: 1 }, width: 1, height: 1, sourceOrientation: 1,
        close: () => { closed = true; },
      }),
      render: async () => { throw new Error("pixel validation failed"); },
    }),
    /pixel validation failed/,
  );
  assert.equal(closed, true);
});
