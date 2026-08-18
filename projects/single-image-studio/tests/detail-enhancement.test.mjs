import assert from "node:assert/strict";
import test from "node:test";

import { enhanceDetailPixels, normalizeDetailEnhancement } from "../web/detail-enhancement.js";

function rgba(values) {
  return Uint8ClampedArray.from(values.flat());
}

test("detail enhancement is deterministic and a zero setting is pixel-identical", () => {
  const pixels = rgba([
    [20, 30, 40, 255], [100, 110, 120, 255], [210, 220, 230, 255],
  ]);
  const first = enhanceDetailPixels({ pixels, width: 3, height: 1, denoise: 0, clarity: 0 });
  const second = enhanceDetailPixels({ pixels, width: 3, height: 1, denoise: 0, clarity: 0 });
  assert.deepEqual(first, pixels);
  assert.deepEqual(second, first);
  assert.notEqual(first, pixels);
});

test("denoise reduces an isolated visible impulse while preserving alpha", () => {
  const pixels = rgba([
    [100, 100, 100, 255], [100, 100, 100, 255], [100, 100, 100, 255],
    [100, 100, 100, 255], [122, 122, 122, 128], [100, 100, 100, 255],
    [100, 100, 100, 255], [100, 100, 100, 255], [100, 100, 100, 255],
  ]);
  const output = enhanceDetailPixels({ pixels, width: 3, height: 3, denoise: 100, clarity: 0 });
  assert.ok(output[16] < 122);
  assert.equal(output[19], 128);
  for (let offset = 3; offset < output.length; offset += 4) assert.equal(output[offset], pixels[offset]);
});

test("clarity increases local contrast without changing transparent hidden RGB", () => {
  const pixels = rgba([
    [90, 90, 90, 255], [120, 120, 120, 255], [90, 90, 90, 255], [17, 23, 31, 0],
  ]);
  const output = enhanceDetailPixels({ pixels, width: 4, height: 1, clarity: 100 });
  assert.ok(output[4] > 120);
  assert.deepEqual(Array.from(output.slice(12, 16)), [17, 23, 31, 0]);
});

test("detail settings reject invalid ranges and malformed pixel buffers", () => {
  assert.deepEqual(normalizeDetailEnhancement({ denoise: 12, clarity: 18 }), { denoise: 12, clarity: 18 });
  assert.throws(() => normalizeDetailEnhancement({ denoise: -1 }), /0–100/);
  assert.throws(() => normalizeDetailEnhancement({ clarity: 1.5 }), /0–100/);
  assert.throws(
    () => enhanceDetailPixels({ pixels: Uint8Array.of(0, 0, 0), width: 1, height: 1 }),
    /长度/,
  );
});
