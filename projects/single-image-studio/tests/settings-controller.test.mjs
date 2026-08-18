import assert from "node:assert/strict";
import test from "node:test";

import {
  assertTaskConsent,
  assertWorkflowParameterContract,
  normalizeEditorTaskSettings,
} from "../web/settings-controller.js";

const BASE = Object.freeze({ ratio: "original", sizeMode: "custom", format: "jpeg", outputLongEdge: 1600, jpegQuality: 0.86, jpegBackground: "#ffffff" });

test("workflow parameter contracts fail closed on drift", () => {
  assert.doesNotThrow(() => assertWorkflowParameterContract({ contractVersion: "v1" }, { parameterContract: "v1" }));
  assert.doesNotThrow(() => assertWorkflowParameterContract({ contractVersion: "v1" }, null));
  assert.throws(() => assertWorkflowParameterContract({ contractVersion: "v1" }, { parameterContract: "v2" }), /任务合同不一致/);
});

test("remote consent keeps cutout, composed product, portrait and restoration wording distinct", () => {
  assert.throws(() => assertTaskConsent({ taskId: "UT-CUTOUT" }), /远程抠图处理/);
  assert.throws(() => assertTaskConsent({ taskId: "UT-PRODUCT", composedBackground: true }), /远程商品抠图处理/);
  assert.throws(() => assertTaskConsent({ taskId: "UT-PORTRAIT", composedBackground: true }), /远程头像抠图处理/);
  assert.throws(() => assertTaskConsent({ taskId: "CR-RESTORE" }), /生成式老照片修复的风险/);
  assert.doesNotThrow(() => assertTaskConsent({ taskId: "UT-CUTOUT", remoteConsent: true }));
});

test("social overlay and composed-background consent become explicit settings", () => {
  const social = normalizeEditorTaskSettings({ taskId: "UT-TEMPLATE", editorSettings: BASE, formSettings: { socialTitle: "周末散步", socialTitlePosition: "bottom", socialTitleAlignment: "left", socialTitleTone: "light" } });
  assert.equal(social.socialTitle, "周末散步");
  const product = normalizeEditorTaskSettings({ taskId: "UT-PRODUCT", editorSettings: BASE, formSettings: {}, composedBackground: true, remoteConsent: true });
  assert.equal(product.remoteConsent, true);
});

test("upload, privacy, fit, conversion, compression and archive settings retain their frozen contracts", () => {
  const upload = normalizeEditorTaskSettings({ taskId: "UT-UPLOAD", editorSettings: BASE, formSettings: { uploadSourceRatio: "1.5", uploadContentMode: "whole", uploadRatio: "original", uploadLongEdge: "1200", uploadTargetKilobytes: "1024", uploadBackground: "#f0f0f0" } });
  assert.equal(upload.canvasLongEdge, 1200);
  assert.equal(upload.canvasCustomBackground, "#F0F0F0");

  const privacy = normalizeEditorTaskSettings({ taskId: "UT-PRIVACY-SHARE", editorSettings: BASE, formSettings: { privacyLongEdge: "1200", privacyTargetKilobytes: "500", privacyBackground: "#ffffff" } });
  assert.equal(privacy.outputLongEdge, 1200);
  assert.equal(privacy.compressionTargetKilobytes, 500);

  const conversion = normalizeEditorTaskSettings({ taskId: "UT-CONVERT", editorSettings: { ...BASE, format: "png" }, formSettings: { outputLongEdge: "900" } });
  assert.equal(conversion.formatConversion, "on");
  assert.equal(conversion.outputLongEdge, 900);

  const compression = normalizeEditorTaskSettings({ taskId: "UT-COMPRESS", editorSettings: BASE, formSettings: { outputLongEdge: "1400", compressionTargetKilobytes: "800" } });
  assert.equal(compression.compressionTargetKilobytes, 800);
  assert.equal(compression.jpegQuality, 0.9);

  const archive = normalizeEditorTaskSettings({ taskId: "UT-DOC-ARCHIVE", editorSettings: BASE, formSettings: { outputLongEdge: "1600", archiveTargetKilobytes: "900" } });
  assert.equal(archive.format, "jpeg");
  assert.equal(archive.jpegBackground, "#ffffff");
});

test("conversion and compression reject contract and range drift", () => {
  assert.throws(() => normalizeEditorTaskSettings({ taskId: "UT-CONVERT", editorSettings: { ...BASE, ratio: "square" }, formSettings: { outputLongEdge: "900" } }), /完整比例/);
  assert.throws(() => normalizeEditorTaskSettings({ taskId: "UT-CONVERT", editorSettings: { ...BASE, format: "png" }, formSettings: { outputLongEdge: "9000" } }), /1–8192/);
  assert.throws(() => normalizeEditorTaskSettings({ taskId: "UT-COMPRESS", editorSettings: { ...BASE, format: "png" }, formSettings: { outputLongEdge: "900", compressionTargetKilobytes: "500" } }), /输出 JPEG/);
  assert.throws(() => normalizeEditorTaskSettings({ taskId: "UT-COMPRESS", editorSettings: BASE, formSettings: { outputLongEdge: "100", compressionTargetKilobytes: "500" } }), /320–8192/);
});
