import assert from "node:assert/strict";
import test from "node:test";

import { maskOutputPresentation } from "../web/mask-output-presentation.js";

test("automatic transparent output states exactly what will be downloaded", () => {
  assert.deepEqual(maskOutputPresentation({
    background: "checker",
    correctionCount: 0,
    height: 900,
    view: "corrected",
    width: 1200,
  }), {
    version: "自动结果",
    background: "透明背景",
    file: "PNG · 1200 × 900",
    downloadLabel: "下载透明 PNG",
    note: "尚未人工修改；最终下载使用自动抠图结果。",
  });
});

test("corrected solid output remains corrected while the automatic comparison is visible", () => {
  assert.deepEqual(maskOutputPresentation({
    background: "black",
    correctionCount: 3,
    height: 800,
    view: "automatic",
    width: 600,
  }), {
    version: "修正后 · 3 笔",
    background: "黑色背景",
    file: "JPEG · 600 × 800",
    downloadLabel: "下载黑色底 JPEG",
    note: "当前画布正在对比自动结果；最终下载仍使用修正后版本。",
  });
});

test("unknown output states fail closed", () => {
  assert.throws(() => maskOutputPresentation({ background: "blue", correctionCount: 0, height: 1, view: "corrected", width: 1 }));
  assert.throws(() => maskOutputPresentation({ background: "checker", correctionCount: -1, height: 1, view: "corrected", width: 1 }));
  assert.throws(() => maskOutputPresentation({ background: "checker", correctionCount: 0, height: 0, view: "corrected", width: 1 }));
  assert.throws(() => maskOutputPresentation({ background: "checker", correctionCount: 0, height: 1, view: "other", width: 1 }));
});
