import assert from "node:assert/strict";
import test from "node:test";

import {
  createEditorWorkspace,
  editorPreviewPresentation,
  editorSettings,
  moveEditorCrop,
  redoEditorWorkspace,
  resetEditorWorkspace,
  undoEditorWorkspace,
  updateEditorWorkspace,
} from "../web/editor-workspace.js";

test("editor workspace binds presets to immutable history and a render-plan preview", () => {
  let workspace = createEditorWorkspace({ sourceWidth: 400, sourceHeight: 300, sourceOrientation: 6 });
  workspace = updateEditorWorkspace(workspace, {
    ratio: "portrait",
    rotation: 90,
    flipHorizontal: true,
    brightness: 15,
    contrast: -8,
    saturation: 20,
    format: "jpeg",
    jpegBackground: "#123456",
  });
  assert.equal(workspace.history.past.length, 1);
  assert.deepEqual(editorSettings(workspace), {
    ratio: "portrait",
    cropX: 50,
    cropY: 50,
    rotation: 90,
    flipHorizontal: true,
    flipVertical: false,
    brightness: 15,
    contrast: -8,
    saturation: 20,
    sizeMode: "preset",
    outputWidth: null,
    outputHeight: null,
    format: "jpeg",
    jpegBackground: "#123456",
  });
  const presentation = editorPreviewPresentation(workspace);
  assert.equal(presentation.aspectRatio, "240 / 300");
  assert.equal(presentation.objectPosition, "50% 50%");
  assert.match(presentation.transform, /rotate\(90deg\) scale\(-/);
  assert.equal(presentation.background, "#123456");
  assert.match(presentation.summary, /4:5.*亮度 \+15.*JPEG/);
});

test("crop position, custom size and drag math share one immutable edit contract", () => {
  let workspace = createEditorWorkspace({ sourceWidth: 1000, sourceHeight: 500, sourceOrientation: 1 });
  workspace = updateEditorWorkspace(workspace, {
    ratio: "square",
    cropX: 100,
    cropY: 50,
    sizeMode: "custom",
    outputWidth: 800,
    outputHeight: 800,
    format: "png",
  });
  assert.deepEqual(workspace.history.present.crop, { x: 0.5, y: 0, width: 0.5, height: 1 });
  assert.deepEqual(workspace.history.present.resize, {
    width: 800,
    height: 800,
    allowUpscale: false,
    maxEdge: 2048,
    maxPixels: 16_000_000,
  });
  assert.equal(editorSettings(workspace).sizeMode, "custom");
  assert.equal(editorSettings(workspace).cropX, 100);
  const presentation = editorPreviewPresentation(workspace);
  assert.equal(presentation.objectPosition, "100% 50%");
  assert.equal(presentation.cropLabel, "构图 100% / 50%");
  assert.match(presentation.summary, /500 × 500/);

  const dragged = moveEditorCrop(editorSettings(workspace), {
    deltaX: 200,
    deltaY: -50,
    frameWidth: 400,
    frameHeight: 200,
  });
  assert.equal(dragged.cropX, 50);
  assert.equal(dragged.cropY, 75);
});

test("undo, redo and reset preserve the current source contract", () => {
  let workspace = createEditorWorkspace({ sourceWidth: 800, sourceHeight: 600, sourceOrientation: 1 });
  workspace = updateEditorWorkspace(workspace, { ratio: "square", rotation: 90, format: "png" });
  workspace = updateEditorWorkspace(workspace, { ratio: "landscape", rotation: 180, format: "png" });
  workspace = undoEditorWorkspace(workspace);
  assert.equal(editorSettings(workspace).ratio, "square");
  assert.equal(editorSettings(workspace).rotation, 90);
  workspace = redoEditorWorkspace(workspace);
  assert.equal(editorSettings(workspace).ratio, "landscape");
  workspace = resetEditorWorkspace(workspace);
  assert.equal(editorSettings(workspace).ratio, "original");
  assert.equal(editorSettings(workspace).rotation, 0);
  assert.equal(workspace.source.sourceWidth, 800);
  assert.equal(workspace.history.past.length, 3);
});

test("transient preview does not create a history entry", () => {
  const workspace = createEditorWorkspace({ sourceWidth: 1200, sourceHeight: 800, sourceOrientation: 1 });
  const presentation = editorPreviewPresentation(workspace, {
    ratio: "square",
    brightness: 30,
    format: "png",
  });
  assert.equal(presentation.aspectRatio, "800 / 800");
  assert.match(presentation.filter, /brightness\(130%\)/);
  assert.equal(workspace.history.past.length, 0);
  assert.equal(editorSettings(workspace).brightness, 0);
});

test("workspace rejects invalid source and unsupported transient settings", () => {
  assert.throws(() => createEditorWorkspace({ sourceWidth: 0, sourceHeight: 10 }), /有效来源尺寸/);
  const workspace = createEditorWorkspace({ sourceWidth: 10, sourceHeight: 10 });
  assert.throws(() => editorPreviewPresentation(workspace, { ratio: "free" }), /不支持的画面比例/);
  assert.throws(
    () => moveEditorCrop(editorSettings(workspace), { deltaX: 1, deltaY: 1, frameWidth: 0, frameHeight: 10 }),
    /有效预览尺寸/,
  );
});
