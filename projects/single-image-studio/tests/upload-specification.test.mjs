import assert from "node:assert/strict";
import test from "node:test";

import { UPLOAD_SPECIFICATION_PRESETS, applyUploadSpecificationPreset, matchUploadSpecificationPreset, normalizeUploadSpecification, uploadComplianceReport, uploadSpecificationEditorSettings, uploadSpecificationPlan } from "../web/upload-specification.js";

test("upload specification freezes one honest local JPEG workflow", () => {
  const plan = uploadSpecificationPlan({ uploadContentMode: "whole", uploadRatio: "square", uploadLongEdge: 1200, uploadTargetKilobytes: 800, uploadBackground: "#ffffff" });
  assert.equal(plan.format, "jpeg");
  assert.deepEqual(plan.steps, ["完整保留并以留白适配 square", "最长边不超过 1200 px", "转为 JPEG，留白 #FFFFFF", "压缩到不超过 800 KB", "重开并核对格式、尺寸、体积和像素"]);
});

test("workflow settings keep crop mode separate from canvas-fit facts", () => {
  const settings = uploadSpecificationEditorSettings({}, { uploadContentMode: "crop", uploadRatio: "portrait", uploadLongEdge: 1600, uploadTargetKilobytes: 1024 });
  assert.equal(settings.ratio, "portrait");
  assert.equal(settings.format, "jpeg");
  assert.equal(settings.compressionTargetKilobytes, 1024);
});

test("invalid or misleading upload goals fail closed", () => {
  assert.throws(() => normalizeUploadSpecification({ uploadContentMode: "crop", uploadRatio: "original" }), /请选择目标比例/);
  assert.throws(() => normalizeUploadSpecification({ uploadTargetKilobytes: 50 }), /100–10240/);
});

test("common upload presets remain transparent and editable", () => {
  assert.deepEqual(UPLOAD_SPECIFICATION_PRESETS.map(({ id }) => id), ["general", "strict", "attachment", "square-fit", "square-crop"]);
  const settings = applyUploadSpecificationPreset({ uploadBackground: "#EEEEEE" }, "strict");
  assert.equal(settings.uploadLongEdge, 1200);
  assert.equal(settings.uploadTargetKilobytes, 1024);
  assert.equal(matchUploadSpecificationPreset(settings), "strict");
  assert.equal(matchUploadSpecificationPreset({ ...settings, uploadLongEdge: 1000 }), null);
});

test("compliance report recomputes every declared upload goal", () => {
  const report = uploadComplianceReport({ mime: "image/jpeg", width: 1200, height: 800, byteLength: 800_000, specification: { uploadContentMode: "whole", uploadRatio: "original", uploadLongEdge: 1200, uploadTargetKilobytes: 1024 } });
  assert.equal(report.passed, true);
  assert.deepEqual(report.checks.map(({ id, passed }) => ({ id, passed })), [{ id: "format", passed: true }, { id: "dimensions", passed: true }, { id: "bytes", passed: true }, { id: "content", passed: true }]);
  assert.equal(uploadComplianceReport({ mime: "image/png", width: 1400, height: 800, byteLength: 2_000_000, specification: { uploadContentMode: "whole", uploadRatio: "original", uploadLongEdge: 1200, uploadTargetKilobytes: 1024 } }).passed, false);
});
