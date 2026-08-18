import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../web/browser-diagnostics.html", import.meta.url);
const scriptUrl = new URL("../web/browser-diagnostics.js", import.meta.url);

test("browser diagnostics is a local, user-photo-free QA surface", async () => {
  const [page, script] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(scriptUrl, "utf8"),
  ]);
  assert.match(page, /data-diagnostic-state="pending"/);
  assert.match(page, /不读取用户图片、不访问网络/);
  assert.match(page, /browser-diagnostics\.js/);
  assert.doesNotMatch(page, /https?:\/\//u);
  assert.match(script, /inspectOutputMetadata/);
  assert.match(script, /verifyPixelRoundTrip/);
  assert.match(script, /diagnoseMaskCorrection/);
  assert.match(script, /diagnoseSceneTemplates/);
  assert.match(script, /diagnoseProductOutputSet/);
  assert.match(script, /diagnosePortraitOutputSet/);
  assert.match(script, /diagnoseSocialOutputSet/);
  assert.match(script, /diagnoseOldPhotoOutputSet/);
  assert.match(script, /diagnoseSocialGridOutputSet/);
  assert.match(script, /productOutputSetEntries/);
  assert.match(script, /portraitOutputSetEntries/);
  assert.match(script, /SOCIAL_OUTPUT_PRESETS/);
  assert.match(script, /drawSocialOverlay/);
  assert.match(script, /oldPhotoOutputSetEntries/);
  assert.match(script, /socialGridLayout/);
  assert.match(script, /createStoredZip/);
  assert.match(script, /renderEditedImage/);
  assert.match(script, /ratio: "wide"/);
  assert.match(script, /ratio: "story"/);
  assert.match(script, /diagnoseRecoveryControls/);
  assert.match(script, /applyRecoveryPresentation/);
  assert.match(script, /applyErrorPagePresentation/);
  assert.match(script, /ERROR_CONTEXTS\.REMOTE_UNKNOWN/);
  assert.match(script, /7 类错误均说明图片状态/);
  assert.match(script, /composeSolidBackgroundPixels/);
  assert.match(page, /蒙版修正后的透明 PNG \/ 纯色 JPEG/);
  assert.match(page, /16:9 \/ 9:16 场景模板/);
  assert.match(page, /四规格商品图与 ZIP/);
  assert.match(page, /六规格报名照与 ZIP/);
  assert.match(page, /四规格社交图片与标题像素/);
  assert.match(page, /四种老照片本地光色整理与 ZIP/);
  assert.match(page, /九宫格逐张切图与 ZIP/);
  assert.match(page, /失败恢复按钮的主次、文案与焦点/);
  assert.match(script, /imageOrientation: "none"/);
  assert.match(script, /diagnosticState = report\.passed \? "passed" : "failed"/);
  assert.doesNotMatch(script, /\bfetch\s*\(/u);
});
