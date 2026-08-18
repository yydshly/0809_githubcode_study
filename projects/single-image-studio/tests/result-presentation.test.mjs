import assert from "node:assert/strict";
import test from "node:test";

import { comparisonSizePresentation, resultFactsPresentation, resultPresentation } from "../web/result-presentation.js";

test("local upload and conversion results expose task-specific labels without DOM state", () => {
  assert.deepEqual(resultPresentation({ taskId: "UT-UPLOAD", result: {}, localEditor: true }), {
    downloadLabel: "下载上传图",
    redoLabel: "调整上传要求",
    outputAlt: "完整显示的上传规格结果",
    outputTab: "上传结果",
    showPortraitSheet: false,
    showMaskCorrection: false,
    allowUseAsSource: true,
  });
  assert.deepEqual(resultPresentation({
    taskId: "UT-CONVERT",
    result: { conversion: { resultFormat: "JPEG" } },
    localEditor: true,
  }), {
    downloadLabel: "下载 JPEG",
    redoLabel: "调整转换设置",
    outputAlt: "完整显示的格式转换结果",
    outputTab: "转换结果",
    showPortraitSheet: false,
    showMaskCorrection: false,
    allowUseAsSource: true,
  });
});

test("background removal presentations keep correction and portrait delivery states explicit", () => {
  assert.deepEqual(resultPresentation({ taskId: "UT-PORTRAIT", result: {}, backgroundRemoval: true }), {
    downloadLabel: "下载底色头像",
    redoLabel: "重新制作头像",
    outputAlt: "完整显示的头像抠图结果",
    outputTab: "头像结果",
    showPortraitSheet: true,
    showMaskCorrection: true,
    allowUseAsSource: false,
  });
  assert.equal(resultPresentation({ taskId: "UT-PRODUCT", result: {}, backgroundRemoval: true }).redoLabel, "重新制作商品图");
  assert.equal(resultPresentation({ taskId: "UT-CUTOUT", result: {}, backgroundRemoval: true }).downloadLabel, "下载透明 PNG");
});

test("generative and generic results remain separate and invalid input fails closed", () => {
  assert.deepEqual(resultPresentation({ taskId: "CR-RESTORE", result: {} }), {
    downloadLabel: "下载修复副本",
    redoLabel: "重新设置修复",
    outputAlt: "完整显示的老照片修复副本",
    outputTab: "修复副本",
    showPortraitSheet: false,
    showMaskCorrection: false,
    allowUseAsSource: false,
  });
  assert.equal(resultPresentation({ taskId: "CR1", result: {} }).downloadLabel, "下载结果");
  assert.throws(() => resultPresentation({ result: {} }), /缺少任务编号/);
  assert.throws(() => resultPresentation({ taskId: "UT-TUNE" }), /缺少结果事实/);
});

test("result facts produce stable summaries, QA copy and dimensions for local workflows", () => {
  assert.deepEqual(resultFactsPresentation({
    taskId: "UT-DOC-ARCHIVE",
    result: {
      taskTitle: "文档归档 / 附件",
      processor: "在本机完成",
      validationSummary: "已重开并核对文档 JPEG",
      width: 1448,
      height: 1086,
      mimeType: "image/jpeg",
      compression: {
        targetLabel: "1 MB",
        sourceLabel: "2.4 MB",
        resultLabel: "436 KB",
        targetSummary: "已达目标",
        summary: "体积减少 82%",
      },
    },
  }), {
    summary: "文档归档 / 附件 · 目标 1 MB · 2.4 MB → 436 KB · 已达目标 · 体积减少 82%",
    qaCopy: "已重开并核对文档 JPEG",
    resultSize: "1448 × 1086 · 436 KB",
  });

  assert.deepEqual(resultFactsPresentation({
    taskId: "UT-CONVERT",
    result: {
      taskTitle: "图片格式转换",
      processor: "在本机完成",
      validationSummary: "格式与像素已核对",
      width: 1200,
      height: 800,
      mimeType: "image/jpeg",
      conversion: {
        sourceFormat: "PNG",
        resultFormat: "JPEG",
        sourceSize: "800 KB",
        resultSize: "240 KB",
        sizeSummary: "减少 70%",
      },
    },
  }), {
    summary: "图片格式转换 · PNG → JPEG · 800 KB → 240 KB · 减少 70%",
    qaCopy: "格式与像素已核对",
    resultSize: "1200 × 800",
  });
});

test("portrait facts retain the non-official layout boundary and generic facts retain their MIME fallback", () => {
  const portrait = resultFactsPresentation({
    taskId: "UT-PORTRAIT",
    result: {
      taskTitle: "报名照 / 底色头像",
      processor: "远程抠图 + 本地合成",
      validationSummary: "透明边缘与 JPEG 已核对。",
      width: 600,
      height: 600,
      mimeType: "image/jpeg",
    },
  });
  assert.equal(portrait.summary, "报名照 / 底色头像 · 远程抠图 + 本地合成");
  assert.match(portrait.qaCopy, /不代表任何机构的官方证件规格/);
  assert.equal(portrait.resultSize, "600 × 600");
  assert.equal(Object.isFrozen(portrait), true);

  assert.equal(resultFactsPresentation({
    taskId: "CR1",
    result: { taskTitle: "创意", processor: "远程", validationSummary: "", mimeType: "image/png" },
  }).resultSize, "image/png");
  assert.throws(() => resultFactsPresentation({ result: {} }), /缺少任务编号/);
});

test("comparison size copy shares one source, result, reference and split view model", () => {
  const dimensions = { width: 1200, height: 900 };
  const result = {
    width: 1200,
    height: 900,
    mimeType: "image/jpeg",
    compression: {
      targetLabel: "1 MB",
      sourceLabel: "2.4 MB",
      resultLabel: "436 KB",
      targetMet: true,
    },
  };
  assert.equal(comparisonSizePresentation({
    layer: "source", taskId: "UT-DOC-ARCHIVE", result, sourceDimensions: { width: 1600, height: 1200 }, resultDimensions: dimensions,
  }), "完整原图 1600 × 1200 · 2.4 MB");
  assert.equal(comparisonSizePresentation({
    layer: "result", taskId: "UT-DOC-ARCHIVE", result, sourceDimensions: dimensions, resultDimensions: dimensions,
  }), "处理结果 1200 × 900 · 436 KB");
  assert.equal(comparisonSizePresentation({
    layer: "split", taskId: "UT-DOC-ARCHIVE", result, sourceDimensions: dimensions, resultDimensions: dimensions,
  }), "并排对比 · 目标 1 MB · 2.4 MB → 436 KB · 已达标");
  assert.equal(comparisonSizePresentation({
    layer: "reference", taskId: "UT-DOC-ARCHIVE", result, sourceDimensions: dimensions, resultDimensions: dimensions,
  }), "处理说明");
});

test("comparison result labels cover task-specific, selected-grid and MIME fallback states", () => {
  const dimensions = { width: 360, height: 360 };
  const base = { width: 360, height: 360, mimeType: "image/png" };
  assert.equal(comparisonSizePresentation({
    layer: "result", taskId: "UT-GRID", result: base, sourceDimensions: dimensions, resultDimensions: dimensions, socialGridNumber: 4,
  }), "第 4 张切图 360 × 360");
  assert.equal(comparisonSizePresentation({
    layer: "result", taskId: "UT-TEMPLATE", result: base, sourceDimensions: dimensions, resultDimensions: dimensions,
  }), "社交图片结果 360 × 360");
  assert.equal(comparisonSizePresentation({
    layer: "result", taskId: "CR1", result: { mimeType: "image/png" }, sourceDimensions: dimensions, resultDimensions: dimensions,
  }), "image/png");
  assert.throws(() => comparisonSizePresentation({ layer: "unknown", result: base }), /类型无效/);
});
