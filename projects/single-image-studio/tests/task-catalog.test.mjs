import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_SERVICE_STATUS,
  TASK_AVAILABILITY,
  getRecommendedTasks,
  getRunnableTasks,
  getTaskCatalog,
} from "../web/task-catalog.js";
import {
  DOWNLOAD_ERROR_CODES,
  buildResultDownloadContract,
} from "../web/result-download.js";

const HASH = "a".repeat(64);

function result(overrides = {}) {
  return {
    id: "result-1",
    runId: "run-1",
    status: "ready",
    qaStatus: "passed",
    mimeType: "image/png",
    hasAlpha: false,
    outputHash: HASH,
    byteLength: 128,
    completedAt: "2026-08-12T22:02:41.000Z",
    ...overrides,
  };
}

test("without remote services, all twelve local editor tasks remain runnable", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
  });
  assert.deepEqual(
    catalog.filter((task) => task.runnable).map((task) => task.id),
    ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-GRID"],
  );
  assert.equal(catalog.find((task) => task.id === "CR1").availability, "unavailable");
  assert.equal(catalog.find((task) => task.id === "CR-RESTORE").availability, "unavailable");

  const cutout = catalog.find((task) => task.id === "UT-CUTOUT");
  assert.equal(cutout.runnable, false);
  assert.equal(cutout.availability, TASK_AVAILABILITY.UNAVAILABLE);
  assert.equal(cutout.statusLabel, "抠图服务未配置");

  assert.equal(catalog.some((candidate) => candidate.id === "UT-SOLID-BG"), false);
  const portrait = catalog.find((candidate) => candidate.id === "UT-PORTRAIT");
  assert.equal(portrait.runnable, false);
  assert.equal(portrait.availability, TASK_AVAILABILITY.UNAVAILABLE);
  assert.equal(portrait.statusLabel, "抠图服务未配置");
  const product = catalog.find((candidate) => candidate.id === "UT-PRODUCT");
  assert.equal(product.runnable, false);
  assert.equal(product.availability, TASK_AVAILABILITY.UNAVAILABLE);
  assert.equal(product.statusLabel, "抠图服务未配置");
});

test("AI availability adds the real AI task without enabling unverified utilities", () => {
  assert.deepEqual(
    getRunnableTasks({
      aiStatus: { status: "available" },
      backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    }).map((task) => task.id),
    ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-GRID", "CR-RESTORE", "CR1"],
  );

  const recommendations = getRecommendedTasks({
    aiStatus: "available",
    backgroundRemovalStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    limit: 4,
  });
  assert.deepEqual(recommendations.map((task) => task.id), ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE"]);
  assert.equal(recommendations.length, 4);
  assert.equal(recommendations.every((task) => task.runnable), true);
  assert.equal(recommendations.at(0).contractVersion, "local-privacy-share-v1");
  assert.equal(recommendations.at(1).contractVersion, "local-upload-specification-v1");
});

test("background removal availability enables cutout and both composed scenarios", () => {
  const catalog = getTaskCatalog({
    aiStatus: AI_SERVICE_STATUS.UNAVAILABLE,
    backgroundRemovalStatus: AI_SERVICE_STATUS.AVAILABLE,
  });
  assert.deepEqual(
    catalog.filter((task) => task.runnable).map((task) => task.id),
    ["UT-PRIVACY-SHARE", "UT-UPLOAD", "UT-DOC-ARCHIVE", "UT-TUNE", "UT-COMPRESS", "UT-CONVERT", "UT-FIT", "UT-RECTIFY", "UT-ENHANCE", "UT-TEMPLATE", "UT-OLD-PHOTO", "UT-GRID", "UT-CUTOUT", "UT-PRODUCT", "UT-PORTRAIT"],
  );
  const cutout = catalog.find((task) => task.id === "UT-CUTOUT");
  assert.equal(cutout.statusLabel, "可运行 · 远程处理");
  assert.equal(cutout.contractVersion, "remote-cutout-v1");
  const portrait = catalog.find((task) => task.id === "UT-PORTRAIT");
  assert.equal(portrait.statusLabel, "可运行 · 远程处理");
  assert.equal(portrait.contractVersion, "portrait-background-v1");
  assert.equal(portrait.scenarioSkillId, "application-photo");
  const product = catalog.find((task) => task.id === "UT-PRODUCT");
  assert.equal(product.statusLabel, "可运行 · 远程处理");
  assert.equal(product.contractVersion, "product-white-background-v1");
  assert.equal(product.scenarioSkillId, "product-white-background");
  assert.equal(catalog.some((task) => task.id === "UT-SOLID-BG"), false);
  const enhancement = catalog.find((task) => task.id === "UT-ENHANCE");
  assert.equal(enhancement.statusLabel, "可运行 · 本地处理");
  assert.equal(enhancement.contractVersion, "local-natural-enhancement-v1");
  const template = catalog.find((task) => task.id === "UT-TEMPLATE");
  assert.equal(template.statusLabel, "可运行 · 本地处理");
  assert.equal(template.contractVersion, "local-scene-template-v1");
  const rectification = catalog.find((task) => task.id === "UT-RECTIFY");
  assert.equal(rectification.statusLabel, "可运行 · 本地处理");
  assert.equal(rectification.contractVersion, "local-plane-rectification-v3");
  const compression = catalog.find((task) => task.id === "UT-COMPRESS");
  assert.equal(compression.statusLabel, "可运行 · 本地处理");
  assert.equal(compression.contractVersion, "local-image-compression-v1");
  const conversion = catalog.find((task) => task.id === "UT-CONVERT");
  assert.equal(conversion.statusLabel, "可运行 · 本地处理");
  assert.equal(conversion.contractVersion, "local-format-conversion-v1");
});

test("download stays locked until a current, QA-passed result matches its task contract", () => {
  const good = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result(),
    currentRunId: "run-1",
  });
  assert.equal(good.allowed, true);
  assert.equal(good.download.filename, "fidelity-result-20260812-220241.png");
  assert.equal(good.download.outputHash, HASH);

  const uploadReady = buildResultDownloadContract({
    taskId: "UT-UPLOAD",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(uploadReady.allowed, true);
  assert.match(uploadReady.download.filename, /^upload-ready-image-/);

  const privacyShare = buildResultDownloadContract({
    taskId: "UT-PRIVACY-SHARE",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(privacyShare.allowed, true);
  assert.match(privacyShare.download.filename, /^privacy-friendly-share-/);

  const documentArchive = buildResultDownloadContract({
    taskId: "UT-DOC-ARCHIVE",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(documentArchive.allowed, true);
  assert.match(documentArchive.download.filename, /^document-archive-/);

  const stale = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result(),
    currentRunId: "run-new",
  });
  assert.equal(stale.code, DOWNLOAD_ERROR_CODES.STALE_RESULT);

  const pendingQa = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result({ qaStatus: "pending" }),
    currentRunId: "run-1",
  });
  assert.equal(pendingQa.code, DOWNLOAD_ERROR_CODES.QA_NOT_PASSED);

  const faithfulJpeg = buildResultDownloadContract({
    taskId: "UT-TUNE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(faithfulJpeg.allowed, true);
  assert.match(faithfulJpeg.download.filename, /\.jpg$/);

  const compressed = buildResultDownloadContract({
    taskId: "UT-COMPRESS",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(compressed.allowed, true);
  assert.match(compressed.download.filename, /^compressed-image-/);

  const converted = buildResultDownloadContract({
    taskId: "UT-CONVERT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(converted.allowed, true);
  assert.match(converted.download.filename, /^converted-image-/);

  const fitted = buildResultDownloadContract({
    taskId: "UT-FIT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(fitted.allowed, true);
  assert.match(fitted.download.filename, /^fitted-image-/);

  const enhanced = buildResultDownloadContract({
    taskId: "UT-ENHANCE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(enhanced.allowed, true);
  assert.match(enhanced.download.filename, /^enhanced-result-/);

  const template = buildResultDownloadContract({
    taskId: "UT-TEMPLATE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(template.allowed, true);
  assert.match(template.download.filename, /^scene-template-result-/);

  const socialGrid = buildResultDownloadContract({
    taskId: "UT-GRID",
    result: result(),
    currentRunId: "run-1",
  });
  assert.equal(socialGrid.allowed, true);
  assert.match(socialGrid.download.filename, /^social-grid-source-/);

  const rectified = buildResultDownloadContract({
    taskId: "UT-RECTIFY",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(rectified.allowed, true);
  assert.match(rectified.download.filename, /^rectified-plane-/);
});

test("transparent, portrait and product downloads enforce alpha, format and safe naming", () => {
  const missingAlpha = buildResultDownloadContract({
    taskId: "UT-CUTOUT",
    result: result({ hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(missingAlpha.code, DOWNLOAD_ERROR_CODES.ALPHA_REQUIRED);

  const portrait = buildResultDownloadContract({
    taskId: "UT-PORTRAIT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(portrait.allowed, true);
  assert.match(portrait.download.filename, /^portrait-result-/);
  assert.doesNotMatch(portrait.download.filename, /official|passport|证件/i);

  const productPng = buildResultDownloadContract({
    taskId: "UT-PRODUCT",
    result: result({ mimeType: "image/png", hasAlpha: false }),
    currentRunId: "run-1",
  });
  assert.equal(productPng.code, DOWNLOAD_ERROR_CODES.UNSUPPORTED_FORMAT);

  const productWithAlpha = buildResultDownloadContract({
    taskId: "UT-PRODUCT",
    result: result({ mimeType: "image/jpeg", hasAlpha: true }),
    currentRunId: "run-1",
  });
  assert.equal(productWithAlpha.code, DOWNLOAD_ERROR_CODES.OPAQUE_REQUIRED);

  const product = buildResultDownloadContract({
    taskId: "UT-PRODUCT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false, backgroundColor: "#FFFFFF" }),
    currentRunId: "run-1",
  });
  assert.equal(product.allowed, true);
  assert.match(product.download.filename, /^product-white-background-/);

  const nonWhiteProduct = buildResultDownloadContract({
    taskId: "UT-PRODUCT",
    result: result({ mimeType: "image/jpeg", hasAlpha: false, backgroundColor: "#000000" }),
    currentRunId: "run-1",
  });
  assert.equal(nonWhiteProduct.code, DOWNLOAD_ERROR_CODES.BACKGROUND_REQUIRED);
});

test("old photo restoration downloads are named as copies rather than archival restorations", () => {
  const local = buildResultDownloadContract({
    taskId: "UT-OLD-PHOTO",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(local.allowed, true);
  assert.match(local.download.filename, /^old-photo-local-copy-/);

  const restoration = buildResultDownloadContract({
    taskId: "CR-RESTORE",
    result: result(),
    currentRunId: "run-1",
  });
  assert.equal(restoration.allowed, true);
  assert.match(restoration.download.filename, /^old-photo-restoration-copy-/);

  const jpeg = buildResultDownloadContract({
    taskId: "CR-RESTORE",
    result: result({ mimeType: "image/jpeg" }),
    currentRunId: "run-1",
  });
  assert.equal(jpeg.code, DOWNLOAD_ERROR_CODES.UNSUPPORTED_FORMAT);
});
