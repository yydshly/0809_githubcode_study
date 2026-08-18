import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PORTRAIT_BACKGROUND_PRESETS,
  PORTRAIT_COMPOSITION_DEFAULTS,
  PORTRAIT_OUTPUT_PRESETS,
  drawPortraitComposition,
  normalizePortraitCompositionSettings,
  portraitCompositionDimensions,
  portraitOutputSetEntries,
} from "../web/portrait-composition.js";

const [html, main, styles] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

test("portrait templates are finite pixel starting points rather than official document claims", () => {
  assert.deepEqual(PORTRAIT_OUTPUT_PRESETS.map(({ id, width, height }) => ({ id, width, height })), [
    { id: "square-600", width: 600, height: 600 },
    { id: "portrait-480x600", width: 480, height: 600 },
    { id: "current", width: null, height: null },
  ]);
  assert.deepEqual(portraitCompositionDimensions(PORTRAIT_COMPOSITION_DEFAULTS, 900, 1200), {
    width: 600,
    height: 600,
    preset: PORTRAIT_OUTPUT_PRESETS[0],
    settings: PORTRAIT_COMPOSITION_DEFAULTS,
  });
  assert.equal(portraitCompositionDimensions({ presetId: "current" }, 900, 1200).height, 1200);
});

test("portrait settings fail closed outside the bounded manual controls", () => {
  assert.equal(normalizePortraitCompositionSettings({ scale: 0.65 }).scale, 0.65);
  assert.throws(() => normalizePortraitCompositionSettings({ presetId: "passport-cn" }), /未知/);
  assert.throws(() => normalizePortraitCompositionSettings({ scale: 0.64 }), /65%–100%/);
  assert.throws(() => normalizePortraitCompositionSettings({ positionY: 1.1 }), /0–1/);
});

test("portrait one-photo set combines two generic sizes with three explicit solid backgrounds", () => {
  assert.deepEqual(PORTRAIT_BACKGROUND_PRESETS.map(({ id, hex, rgb }) => ({ id, hex, rgb })), [
    { id: "white", hex: "#FFFFFF", rgb: [255, 255, 255] },
    { id: "blue", hex: "#5B9BD5", rgb: [91, 155, 213] },
    { id: "warm-red", hex: "#D85C5C", rgb: [216, 92, 92] },
  ]);
  const entries = portraitOutputSetEntries({ presetId: "current", scale: 0.8, positionY: 0.3 });
  assert.equal(entries.length, 6);
  assert.deepEqual(entries.map((entry) => entry.id), [
    "square-600-white",
    "square-600-blue",
    "square-600-warm-red",
    "portrait-480x600-white",
    "portrait-480x600-blue",
    "portrait-480x600-warm-red",
  ]);
  assert.equal(entries.every((entry) => entry.settings.scale === 0.8 && entry.settings.positionY === 0.3), true);
  assert.equal(entries.some((entry) => entry.settings.presetId === "current"), false);
  assert.equal(new Set(entries.map((entry) => entry.filenameSuffix)).size, 6);
});

test("portrait renderer uses the alpha source bounds, chosen canvas and background", () => {
  const calls = [];
  const context = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    clearRect: (...args) => calls.push(["clear", ...args]),
    fillRect: (...args) => calls.push(["fill", ...args]),
    drawImage: (...args) => calls.push(["draw", ...args.slice(1)]),
  };
  const result = drawPortraitComposition({
    context,
    foreground: {},
    sourceWidth: 1000,
    sourceHeight: 1000,
    sourceBounds: { x: 300, y: 100, width: 400, height: 800 },
    settings: { presetId: "portrait-480x600", scale: 0.8, positionY: 0 },
    backgroundRgb: [238, 111, 87],
  });
  assert.equal(context.fillStyle, "rgb(238, 111, 87)");
  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === "fill"), ["fill", 0, 0, 480, 600]);
  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === "draw"), ["draw", 300, 100, 400, 800, 120, 0, 240, 480]);
  assert.equal(result.width, 480);
  assert.equal(result.height, 600);
});

test("portrait result workspace exposes manual composition without face-analysis claims", () => {
  for (const id of [
    "portrait-composition-controls",
    "portrait-composition-preview",
    "portrait-output-preset",
    "portrait-scale",
    "portrait-position-y",
    "portrait-composition-reset",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /不会自动识别人脸、眼睛或头顶位置/);
  assert.match(main, /drawPortraitComposition/);
  assert.match(main, /portraitCompositionDimensions/);
  assert.match(styles, /\.portrait-composition-controls/);
});

test("portrait result workspace exposes six local previews, individual downloads and one zip", () => {
  for (const id of ["portrait-output-set", "portrait-output-download-all", "portrait-output-set-status"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.equal((html.match(/data-portrait-output-card=/gu) ?? []).length, 6);
  assert.equal((html.match(/data-portrait-output-select=/gu) ?? []).length, 6);
  assert.equal((html.match(/data-portrait-output-download=/gu) ?? []).length, 6);
  assert.match(html, /不包含毫米、DPI、脸部占比或任何机构的官方证件照规则/);
  assert.match(main, /portraitOutputSetEntries/);
  assert.match(main, /downloadPortraitOutputSet/);
  assert.match(main, /portrait-general-set-/);
  assert.match(main, /报名照结果已经变化，已停止旧套装下载/);
  assert.match(styles, /\.portrait-output-grid/);
});
