import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  inspectTechnicalImageElement,
  inspectTechnicalPixels,
  technicalImageAdvice,
} from "../web/technical-image-check.js";

function solidPixels(width, height, rgba) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(rgba, offset);
  return pixels;
}

test("technical inspection reports cautious dark and bright exposure observations", () => {
  const dark = inspectTechnicalPixels({ pixels: solidPixels(4, 4, [30, 30, 30, 255]), width: 4, height: 4 });
  const bright = inspectTechnicalPixels({ pixels: solidPixels(4, 4, [240, 240, 240, 255]), width: 4, height: 4 });
  assert.equal(dark.observations.exposure.id, "dark");
  assert.equal(bright.observations.exposure.id, "bright");
  assert.equal(technicalImageAdvice(dark).presetId, "bright");
  assert.equal(technicalImageAdvice(bright).presetId, "soft");
});

test("technical inspection distinguishes channel tendencies without claiming white balance", () => {
  const warm = inspectTechnicalPixels({ pixels: solidPixels(3, 3, [170, 110, 80, 255]), width: 3, height: 3 });
  const cool = inspectTechnicalPixels({ pixels: solidPixels(3, 3, [80, 110, 170, 255]), width: 3, height: 3 });
  const green = inspectTechnicalPixels({ pixels: solidPixels(3, 3, [90, 145, 95, 255]), width: 3, height: 3 });
  assert.equal(warm.observations.color.id, "warm");
  assert.equal(cool.observations.color.id, "cool");
  assert.equal(green.observations.color.id, "green");
  assert.match(warm.observations.color.copy, /不是白平衡鉴定/);
});

test("technical inspection measures local variation and ignores fully transparent pixels", () => {
  const pixels = new Uint8ClampedArray([
    0, 0, 0, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 0, 0, 0, 255,
  ]);
  const checker = inspectTechnicalPixels({ pixels, width: 2, height: 2 });
  assert.equal(checker.observations.detail.id, "high");
  assert.equal(technicalImageAdvice(checker).presetId, "soft");

  const withHiddenRgb = new Uint8ClampedArray([
    120, 120, 120, 255,
    255, 0, 0, 0,
  ]);
  const visibleOnly = inspectTechnicalPixels({ pixels: withHiddenRgb, width: 2, height: 1 });
  assert.equal(visibleOnly.sample.visiblePixels, 1);
  assert.equal(visibleOnly.observations.color.id, "neutral");
});

test("technical inspection rejects invalid or fully transparent buffers", () => {
  assert.throws(() => inspectTechnicalPixels({ pixels: new Uint8Array(3), width: 1, height: 1 }), /RGBA/);
  assert.throws(() => inspectTechnicalPixels({ pixels: solidPixels(2, 2, [0, 0, 0, 0]), width: 2, height: 2 }), /可见像素/);
});

test("browser sampler uses a bounded local canvas and returns deterministic observations", () => {
  const sourcePixels = solidPixels(4, 2, [100, 100, 100, 255]);
  let drawn = false;
  const inspection = inspectTechnicalImageElement({ naturalWidth: 400, naturalHeight: 200 }, {
    maxEdge: 4,
    createCanvas: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => { drawn = true; },
        getImageData: () => ({ data: sourcePixels }),
      }),
    }),
  });
  assert.equal(drawn, true);
  assert.deepEqual(inspection.sample, { width: 4, height: 2, visiblePixels: 8 });
  assert.equal(inspection.observations.exposure.id, "balanced");
});

test("task page exposes a non-blocking, explicit and non-semantic technical-check flow", async () => {
  const [html, main, styles, contract] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/main.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../TECHNICAL_IMAGE_CHECK.md", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="technical-check"/);
  assert.match(html, /不识别人、商品或场景/);
  assert.match(html, /id="technical-check-action"[^>]*>打开并使用建议/);
  assert.match(html, /你也可以忽略它并选择下面任意操作/);
  assert.match(main, /inspectTechnicalImageElement\(decoded\)/);
  assert.match(main, /status: "unavailable"/);
  assert.match(main, /这不会影响下面的操作/);
  assert.match(main, /technicalCheckState\.sourceHash === machine\.source\?\.hash/);
  assert.match(main, /selectEnhancementPreset\(current\.advice\.presetId\)/);
  assert.match(styles, /\.technical-check-signals \{[^}]*grid-template-columns: repeat\(3/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.technical-check-signals \{ grid-template-columns: 1fr;/);
  assert.match(contract, /不会自动改图|用户明确点击/);
});
