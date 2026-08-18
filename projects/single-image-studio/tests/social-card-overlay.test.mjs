import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SOCIAL_OVERLAY_DEFAULTS,
  drawSocialOverlay,
  normalizeSocialOverlaySettings,
  socialOverlayLayout,
} from "../web/social-card-overlay.js";

const [html, main, styles] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

function fakeContext() {
  const calls = [];
  return {
    calls,
    font: "",
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    fillRect: (...args) => calls.push(["fillRect", ...args]),
    fillText: (...args) => calls.push(["fillText", ...args]),
    measureText: (value) => ({ width: Array.from(value).length * 20 }),
  };
}

test("social overlay settings are bounded, optional and explicit", () => {
  assert.deepEqual(normalizeSocialOverlaySettings(), SOCIAL_OVERLAY_DEFAULTS);
  assert.deepEqual(normalizeSocialOverlaySettings({
    socialTitle: "  夏日   记录  ",
    socialTitlePosition: "top",
    socialTitleAlignment: "center",
    socialTitleTone: "dark",
  }), { text: "夏日 记录", position: "top", alignment: "center", tone: "dark" });
  assert.throws(() => normalizeSocialOverlaySettings({ socialTitle: "一".repeat(41) }), /40/);
  assert.throws(() => normalizeSocialOverlaySettings({ socialTitlePosition: "middle" }), /位置/);
  assert.throws(() => normalizeSocialOverlaySettings({ socialTitleAlignment: "right" }), /对齐/);
  assert.throws(() => normalizeSocialOverlaySettings({ socialTitleTone: "rainbow" }), /颜色/);
});

test("social overlay stays inside a seven-percent safe area and uses at most two lines", () => {
  const context = fakeContext();
  const layout = socialOverlayLayout({
    context,
    width: 1080,
    height: 1080,
    settings: { text: "让照片成为今天的封面", position: "bottom", alignment: "left", tone: "light" },
  });
  assert.equal(layout.hidden, false);
  assert.equal(layout.safeInset, 76);
  assert.ok(layout.lines.length >= 1 && layout.lines.length <= 2);
  assert.ok(layout.box.x >= layout.safeInset);
  assert.ok(layout.box.y + layout.box.height <= 1080 - layout.safeInset);
  assert.deepEqual(socialOverlayLayout({ context, width: 1080, height: 1080, settings: {} }).lines, []);
});

test("social renderer paints one readable backdrop and the complete title", () => {
  const context = fakeContext();
  const layout = drawSocialOverlay({
    context,
    width: 1200,
    height: 1500,
    settings: { text: "城市散步", position: "top", alignment: "center", tone: "dark" },
  });
  assert.equal(context.calls.filter((call) => Array.isArray(call) && call[0] === "fillRect").length, 1);
  assert.equal(context.calls.filter((call) => Array.isArray(call) && call[0] === "fillText").map((call) => call[1]).join(""), "城市散步");
  assert.equal(layout.settings.alignment, "center");
});

test("social scene exposes live title controls without claiming platform compliance", () => {
  assert.match(html, /id="social-title-preview"/);
  for (const name of ["socialTitle", "socialTitlePosition", "socialTitleAlignment", "socialTitleTone"]) {
    assert.match(main, new RegExp(`name="${name}"`));
  }
  assert.match(main, /drawSocialOverlay/);
  assert.match(main, /composeSocialOverlayResult/);
  assert.match(main, /通用安全区/);
  assert.match(styles, /\.social-title-preview/);
  assert.match(styles, /pointer-events: none/);
});

test("social scene prepares four local outputs with one main preview and one ZIP action", () => {
  for (const id of ["social-square", "social-portrait", "wide-cover", "story"]) {
    assert.match(html, new RegExp(`data-social-output-card="${id}"`));
    assert.match(html, new RegExp(`data-social-output-download="${id}"`));
  }
  assert.match(html, /id="social-output-download-all"/);
  assert.match(html, /同一内容，生成四种社交尺寸/);
  assert.match(main, /prepareSocialOutputSet/);
  assert.match(main, /generateSocialOutput/);
  assert.match(main, /downloadSocialOutputSet/);
  assert.match(main, /createStoredZip/);
  assert.match(main, /当前图片或任务已经变化，已停止旧社交套装/);
  assert.match(styles, /\.product-output-card img/);
  assert.match(styles, /@media \(max-width: 620px\)/);
});
