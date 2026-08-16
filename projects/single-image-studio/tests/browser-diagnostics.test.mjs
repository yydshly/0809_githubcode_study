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
  assert.match(script, /composeSolidBackgroundPixels/);
  assert.match(page, /蒙版修正后的透明 PNG \/ 纯色 JPEG/);
  assert.match(script, /imageOrientation: "none"/);
  assert.match(script, /diagnosticState = report\.passed \? "passed" : "failed"/);
  assert.doesNotMatch(script, /\bfetch\s*\(/u);
});
