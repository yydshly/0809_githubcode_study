import assert from "node:assert/strict";
import test from "node:test";

import { createEditorWorkspace, editorPreviewPresentation } from "../web/editor-workspace.js";
import { DEFAULT_RECTIFICATION_QUAD, quadAsFormSettings } from "../web/quad-rectification.js";

test("document archive opens a non-square rectification workspace with the registered clean-color mode", () => {
  const workspace = createEditorWorkspace({ sourceWidth: 900, sourceHeight: 2400, sourceOrientation: 1 }, {
    initialSettings: {
      ratio: "original",
      rotation: 0,
      straighten: 0,
      rectificationEnabled: "on",
      documentScanMode: "clean-color",
      ...quadAsFormSettings(DEFAULT_RECTIFICATION_QUAD),
      sizeMode: "custom",
      outputLongEdge: 1600,
      compressionTargetKilobytes: 1024,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      format: "jpeg",
    },
  });
  const preview = editorPreviewPresentation(workspace);
  assert.equal(preview.rectification.enabled, true);
  assert.equal(preview.documentScan.mode, "clean-color");
  assert.equal(preview.state.output.format, "jpeg");
  assert.equal(preview.output.height, 1600);
  assert.equal(preview.output.width, 600);
});
