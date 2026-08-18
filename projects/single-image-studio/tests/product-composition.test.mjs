import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCT_COMPOSITION_DEFAULTS,
  PRODUCT_OUTPUT_PRESETS,
  alphaBoundsFromRgba,
  drawProductComposition,
  normalizeProductCompositionSettings,
  productCompositionDimensions,
  productCompositionPlacement,
  productOutputSetEntries,
} from "../web/product-composition.js";

const [html, main, styles] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

test("product composition keeps a bounded white-space layout", () => {
  assert.deepEqual(productCompositionPlacement(1000, 1000, PRODUCT_COMPOSITION_DEFAULTS), {
    x: 70,
    y: 70,
    width: 860,
    height: 860,
    source: { x: 0, y: 0, width: 1000, height: 1000 },
    settings: PRODUCT_COMPOSITION_DEFAULTS,
  });
  assert.deepEqual(productCompositionPlacement(1200, 800, {
    scale: 0.75,
    positionX: 1,
    positionY: 0,
    shadow: "soft",
  }), {
    x: 300,
    y: 0,
    width: 900,
    height: 600,
    source: { x: 0, y: 0, width: 1200, height: 800 },
    settings: { presetId: "square-1200", scale: 0.75, positionX: 1, positionY: 0, shadow: "soft" },
  });
});

test("product composition finds every non-transparent subject pixel without removing watermark-like content", () => {
  const pixels = new Uint8ClampedArray(6 * 5 * 4);
  pixels[(1 * 6 + 2) * 4 + 3] = 255;
  pixels[(3 * 6 + 4) * 4 + 3] = 1;
  assert.deepEqual(alphaBoundsFromRgba({ pixels, width: 6, height: 5 }), {
    x: 2, y: 1, width: 3, height: 3,
  });
  assert.deepEqual(alphaBoundsFromRgba({ pixels, width: 6, height: 5, threshold: 2 }), {
    x: 2, y: 1, width: 1, height: 1,
  });
  assert.equal(alphaBoundsFromRgba({ pixels: new Uint8ClampedArray(16), width: 2, height: 2 }), null);
  assert.throws(() => alphaBoundsFromRgba({ pixels, width: 6, height: 5, threshold: 0 }), /1–255/);
  assert.throws(() => alphaBoundsFromRgba({ pixels: pixels.subarray(0, 4), width: 6, height: 5 }), /数量/);
});

test("product placement fits and moves the visible subject rather than transparent padding", () => {
  assert.deepEqual(productCompositionPlacement(1000, 1000, {
    scale: 0.8, positionX: 1, positionY: 0, shadow: "none",
  }, { x: 100, y: 200, width: 200, height: 400 }), {
    x: 600,
    y: 0,
    width: 400,
    height: 800,
    source: { x: 100, y: 200, width: 200, height: 400 },
    settings: { presetId: "square-1200", scale: 0.8, positionX: 1, positionY: 0, shadow: "none" },
  });
  assert.throws(
    () => productCompositionPlacement(100, 100, PRODUCT_COMPOSITION_DEFAULTS, { x: 90, y: 0, width: 20, height: 10 }),
    /源图范围/,
  );
});

test("product composition settings fail closed outside the declared controls", () => {
  assert.equal(normalizeProductCompositionSettings({ scale: 0.65 }).scale, 0.65);
  assert.equal(normalizeProductCompositionSettings({ scale: 1 }).scale, 1);
  assert.throws(() => normalizeProductCompositionSettings({ scale: 0.64 }), /65%–100%/);
  assert.throws(() => normalizeProductCompositionSettings({ positionX: -0.01 }), /0–1/);
  assert.throws(() => normalizeProductCompositionSettings({ positionY: 1.01 }), /0–1/);
  assert.throws(() => normalizeProductCompositionSettings({ shadow: "dramatic" }), /阴影/);
  assert.throws(() => normalizeProductCompositionSettings({ presetId: "marketplace-magic" }), /像素模板/);
});

test("product output templates resolve to exact generic pixels or the current working size", () => {
  assert.deepEqual(PRODUCT_OUTPUT_PRESETS.map(({ id, width, height }) => ({ id, width, height })), [
    { id: "square-1200", width: 1200, height: 1200 },
    { id: "portrait-1200x1500", width: 1200, height: 1500 },
    { id: "landscape-1200x900", width: 1200, height: 900 },
    { id: "current", width: null, height: null },
  ]);
  assert.deepEqual(productCompositionDimensions({}, 713, 927), {
    width: 1200,
    height: 1200,
    preset: PRODUCT_OUTPUT_PRESETS[0],
    settings: PRODUCT_COMPOSITION_DEFAULTS,
  });
  assert.equal(productCompositionDimensions({ presetId: "portrait-1200x1500" }, 713, 927).height, 1500);
  assert.equal(productCompositionDimensions({ presetId: "landscape-1200x900" }, 713, 927).width, 1200);
  assert.deepEqual(
    productCompositionDimensions({ presetId: "current" }, 713, 927),
    {
      width: 713,
      height: 927,
      preset: PRODUCT_OUTPUT_PRESETS[3],
      settings: { ...PRODUCT_COMPOSITION_DEFAULTS, presetId: "current" },
    },
  );
});

test("one shared product composition expands to four exact delivery entries", () => {
  const entries = productOutputSetEntries({ scale: 0.8, positionX: 0.4, positionY: 0.6, shadow: "soft" }, 713, 927);
  assert.deepEqual(entries.map(({ id, width, height, filenameSuffix }) => ({ id, width, height, filenameSuffix })), [
    { id: "square-1200", width: 1200, height: 1200, filenameSuffix: "square-1200" },
    { id: "portrait-1200x1500", width: 1200, height: 1500, filenameSuffix: "portrait-1200x1500" },
    { id: "landscape-1200x900", width: 1200, height: 900, filenameSuffix: "landscape-1200x900" },
    { id: "current", width: 713, height: 927, filenameSuffix: "current" },
  ]);
  assert.ok(entries.every((entry) => entry.settings.scale === 0.8 && entry.settings.shadow === "soft"));
});

test("product renderer paints white, optionally shadows, then draws the foreground", () => {
  const calls = [];
  const context = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    clearRect: (...args) => calls.push(["clear", ...args]),
    fillRect: (...args) => calls.push(["fill", ...args]),
    drawImage: (...args) => calls.push(["draw", ...args.slice(1)]),
  };
  const foreground = {};
  drawProductComposition({
    context,
    foreground,
    width: 100,
    height: 80,
    settings: { scale: 0.8, positionX: 0.5, positionY: 1, shadow: "soft" },
    sourceBounds: { x: 10, y: 20, width: 50, height: 40 },
  });
  assert.equal(context.fillStyle, "#FFFFFF");
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "draw").length, 2);
  assert.deepEqual(calls.filter((call) => Array.isArray(call) && call[0] === "draw")[0], ["draw", 10, 20, 50, 40, 10, 16, 80, 64]);
  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === "fill"), ["fill", 0, 0, 100, 80]);
});

test("product delivery controls are product-only and keep editing separate from final preview", () => {
  for (const id of [
    "product-composition-controls",
    "product-composition-preview",
    "product-output-preset",
    "product-scale",
    "product-position-x",
    "product-position-y",
    "product-composition-reset",
    "product-output-set",
    "product-output-download-all",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /全部非透明内容计算/);
  assert.match(html, /不会重新上传图片、识别或删除水印/);
  assert.match(html, /不代表任何电商平台规则/);
  assert.match(main, /selectedTask\?\.id === "UT-PRODUCT"/);
  assert.match(main, /if \(selectedTask\?\.id === "UT-PRODUCT"\) background = "white"/);
  assert.match(main, /drawProductComposition/);
  assert.match(main, /alphaBoundsFromRgba/);
  assert.match(main, /productComposition: selectedTask\?\.id === "UT-PRODUCT"/);
  assert.match(main, /productOutputSetEntries/);
  assert.match(main, /downloadProductOutputSet/);
  assert.match(main, /createStoredZip/);
  assert.match(styles, /\.product-composition-fields \{[^}]*grid-template-columns: minmax\(10rem, 1\.2fr\) repeat\(3/);
  assert.match(styles, /\.product-output-grid \{[^}]*grid-template-columns: repeat\(4/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.product-composition-fields, \.portrait-composition-fields \{ grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.product-output-grid \{ grid-template-columns: 1fr/);
});
