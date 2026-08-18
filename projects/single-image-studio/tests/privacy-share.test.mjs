import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVACY_SHARE_PRESETS,
  applyPrivacySharePreset,
  matchPrivacySharePreset,
  normalizePrivacyShareSettings,
  privacyShareEditorSettings,
  privacySharePlan,
  privacyShareReport,
} from "../web/privacy-share.js";

test("privacy share exposes three transparent and editable presets", () => {
  assert.deepEqual(PRIVACY_SHARE_PRESETS.map((preset) => preset.id), ["clear", "balanced", "compact"]);
  const balanced = applyPrivacySharePreset({ privacyBackground: "#f5f1e8" }, "balanced");
  assert.equal(balanced.privacyLongEdge, 1600);
  assert.equal(balanced.privacyTargetKilobytes, 1024);
  assert.equal(balanced.privacyBackground, "#f5f1e8");
  assert.equal(matchPrivacySharePreset(balanced), "balanced");
  assert.equal(matchPrivacySharePreset({ ...balanced, privacyLongEdge: 1500 }), null);
  assert.throws(() => applyPrivacySharePreset({}, "unknown"), /未知/);
});
test("privacy share normalizes only local JPEG size, bytes and explicit background controls", () => {
  assert.deepEqual(normalizePrivacyShareSettings({
    privacyLongEdge: "1200",
    privacyTargetKilobytes: "500",
    privacyBackground: "#f0e8d8",
  }), {
    outputLongEdge: 1200,
    targetKilobytes: 500,
    backgroundColor: "#F0E8D8",
    format: "jpeg",
  });
  assert.throws(() => normalizePrivacyShareSettings({ privacyLongEdge: 639 }), /640–2048/);
  assert.throws(() => normalizePrivacyShareSettings({ privacyTargetKilobytes: 99 }), /100–5120/);
  assert.throws(() => normalizePrivacyShareSettings({ privacyBackground: "white" }), /背景色无效/);
});

test("privacy share plan and renderer settings preserve the whole image and expose metadata scope", () => {
  const plan = privacySharePlan({ privacyLongEdge: 1600, privacyTargetKilobytes: 1024, privacyBackground: "#ffffff" });
  assert.deepEqual(plan.steps, [
    "保持完整画面与原始比例",
    "最长边不超过 1600 px",
    "在 #FFFFFF 底色上生成 JPEG",
    "压缩到不超过 1024 KB",
    "重开并核对像素、hash 与禁止 metadata",
  ]);
  assert.deepEqual(plan.removedMetadata, ["EXIF", "GPS", "XMP", "IPTC", "JPEG comment"]);
  const editor = privacyShareEditorSettings({ privacyLongEdge: 1600, privacyTargetKilobytes: 1024, privacyBackground: "#ffffff" });
  assert.equal(editor.ratio, "original");
  assert.equal(editor.format, "jpeg");
  assert.equal(editor.outputLongEdge, 1600);
  assert.equal(editor.compressionTargetKilobytes, 1024);
});

test("privacy share report requires format, dimensions, bytes and zero private metadata", () => {
  const input = {
    mime: "image/jpeg", width: 1200, height: 800, byteLength: 180 * 1024,
    metadataInspection: { privateMetadata: [], colorMetadata: [] },
    settings: { privacyLongEdge: 1600, privacyTargetKilobytes: 1024, privacyBackground: "#ffffff" },
  };
  const pass = privacyShareReport(input);
  assert.equal(pass.passed, true);
  assert.equal(pass.visibleContentInspection, "not-performed");
  assert.match(pass.boundary, /不等于画面内容匿名/);
  assert.equal(privacyShareReport({ ...input, metadataInspection: { privateMetadata: ["EXIF"] } }).passed, false);
  assert.equal(privacyShareReport({ ...input, byteLength: 2 * 1024 * 1024 }).passed, false);
});
