import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [main, html, catalog, sourceTaskController, workflow, download, contract] = await Promise.all([
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/task-catalog.js", import.meta.url), "utf8"),
  readFile(new URL("../web/source-task-controller.js", import.meta.url), "utf8"),
  readFile(new URL("../web/workflow-definition.js", import.meta.url), "utf8"),
  readFile(new URL("../web/result-download.js", import.meta.url), "utf8"),
  readFile(new URL("../PRIVACY_SHARE.md", import.meta.url), "utf8"),
]);

test("privacy share is a real local scene with visible limits and no content-anonymity claim", () => {
  assert.match(catalog, /id: "UT-PRIVACY-SHARE"[\s\S]*executor: TASK_EXECUTOR\.LOCAL[\s\S]*local-privacy-share-v1/);
  assert.match(main, /title: "隐私友好分享副本"/);
  assert.match(main, /data-privacy-share-preset/);
  assert.match(main, /name="privacyLongEdge"/);
  assert.match(main, /name="privacyTargetKilobytes"/);
  assert.match(main, /name="privacyBackground"/);
  assert.match(main, /不会识别人脸、住址、车牌、二维码、水印或图片里的文字/);
  assert.match(main, /runPrivacyShare/);
  assert.match(main, /privacyShareReport/);
  assert.match(sourceTaskController, /PRODUCT_TASK_ORDER[\s\S]*"UT-PRIVACY-SHARE", "UT-UPLOAD"/);
  assert.match(html, /id="privacy-share-card"/);
  assert.match(html, /文件信息、尺寸与体积/);
  assert.match(workflow, /PRIVACY_SHARE_WORKFLOW[\s\S]*private-metadata/);
  assert.match(download, /"UT-PRIVACY-SHARE"[\s\S]*prefix: "privacy-friendly-share"/);
  assert.match(contract, /不识别人脸、儿童、住址、车牌/);
  assert.doesNotMatch(main, /图片已经完全匿名|自动识别并隐藏敏感内容/);
});
