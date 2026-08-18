import assert from "node:assert/strict";
import test from "node:test";

import { localExecutionPlan } from "../web/local-execution-controller.js";

test("special local workflows own explicit execution kinds and reports", () => {
  const privacy = localExecutionPlan({ taskId: "UT-PRIVACY-SHARE" });
  assert.equal(privacy.kind, "privacy-share");
  assert.equal(privacy.privacyShareReport, true);
  assert.equal(privacy.compressionReport, true);

  const archive = localExecutionPlan({ taskId: "UT-DOC-ARCHIVE" });
  assert.equal(archive.kind, "document-archive");
  assert.equal(archive.compressionReport, true);

  const upload = localExecutionPlan({ taskId: "UT-UPLOAD" });
  assert.equal(upload.kind, "upload-specification");
  assert.equal(upload.uploadComplianceReport, true);
});

test("compression, conversion, fit and social plans preserve dynamic status facts", () => {
  const compression = localExecutionPlan({ taskId: "UT-COMPRESS", settings: { compressionTargetKilobytes: 500 } });
  assert.equal(compression.kind, "compression");
  assert.match(compression.copy, /500 KB/);
  assert.equal(compression.compressionImpactReport, true);

  const conversion = localExecutionPlan({ taskId: "UT-CONVERT", settings: { format: "jpeg" } });
  assert.match(conversion.copy, /JPEG/);
  assert.equal(conversion.conversionReport, true);

  assert.equal(localExecutionPlan({ taskId: "UT-FIT" }).composeCanvasFit, true);
  assert.equal(localExecutionPlan({ taskId: "UT-TEMPLATE" }).composeSocialOverlay, true);
});

test("rectification distinguishes plain geometry from document enhancement", () => {
  const plain = localExecutionPlan({ taskId: "UT-RECTIFY" });
  assert.equal(plain.title, "正在生成四角裁正结果");
  assert.match(plain.copy, /保持原始颜色/);
  const enhanced = localExecutionPlan({ taskId: "UT-RECTIFY", usesDocumentEnhancement: true, rectificationPostProcessLabel: "清晰彩色" });
  assert.equal(enhanced.title, "正在生成文档增强结果");
  assert.match(enhanced.copy, /清晰彩色/);
});

test("ordinary local editor tasks remain deterministic local-editor plans", () => {
  const tune = localExecutionPlan({ taskId: "UT-TUNE" });
  assert.equal(tune.kind, "local-editor");
  assert.equal(tune.compressionReport, false);
  assert.equal(tune.title, "正在本地处理");
  assert.equal(Object.isFrozen(tune), true);
});
