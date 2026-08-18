import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCUMENT_SCAN_MODES,
  applyDocumentScanPixels,
  documentScanMode,
  normalizeDocumentScanMode,
} from "../web/document-scan.js";

function rgba(values) {
  return new Uint8ClampedArray(values);
}

test("document scan exposes four explicit and stable modes", () => {
  assert.deepEqual(DOCUMENT_SCAN_MODES.map(({ id }) => id), ["original", "clean-color", "grayscale", "black-white"]);
  assert.equal(documentScanMode("original").label, "只裁正 · 保持原色");
  assert.equal(documentScanMode("grayscale").label, "文档 · 灰度");
  assert.equal(normalizeDocumentScanMode(), "original");
  assert.throws(() => normalizeDocumentScanMode("auto"), /不支持/);
});

test("original mode copies pixels exactly without sharing the source buffer", () => {
  const source = rgba([15, 40, 90, 255, 1, 2, 3, 0]);
  const result = applyDocumentScanPixels({ pixels: source, width: 2, height: 1, mode: "original" });
  assert.deepEqual([...result], [...source]);
  assert.notEqual(result, source);
});

test("clean color expands a document range while preserving visible color ordering and alpha", () => {
  const source = rgba([60, 50, 40, 255, 210, 190, 170, 128]);
  const result = applyDocumentScanPixels({ pixels: source, width: 2, height: 1, mode: "clean-color" });
  assert.equal(result[3], 255);
  assert.equal(result[7], 128);
  assert.ok(result[0] >= result[1] && result[1] >= result[2]);
  assert.ok(result[4] >= result[5] && result[5] >= result[6]);
  assert.ok(result[0] < source[0]);
  assert.ok(result[4] > source[4]);
});

test("grayscale removes channel tint but retains alpha and transparent hidden RGB", () => {
  const source = rgba([180, 90, 20, 200, 17, 29, 43, 0]);
  const result = applyDocumentScanPixels({ pixels: source, width: 2, height: 1, mode: "grayscale" });
  assert.equal(result[0], result[1]);
  assert.equal(result[1], result[2]);
  assert.equal(result[3], 200);
  assert.deepEqual([...result.slice(4)], [17, 29, 43, 0]);
});

test("high contrast black-white keeps local text dark and paper white", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (let index = 0; index < 25; index += 1) {
    const value = index === 12 ? 20 : 225;
    pixels[index * 4] = value;
    pixels[index * 4 + 1] = value;
    pixels[index * 4 + 2] = value;
    pixels[index * 4 + 3] = 255;
  }
  const result = applyDocumentScanPixels({ pixels, width: 5, height: 5, mode: "black-white" });
  assert.deepEqual([...result.slice(12 * 4, 12 * 4 + 4)], [0, 0, 0, 255]);
  assert.deepEqual([...result.slice(0, 4)], [255, 255, 255, 255]);
  for (let index = 0; index < result.length; index += 4) {
    assert.ok(result[index] === 0 || result[index] === 255);
  }
});

test("document scan rejects malformed pixel contracts", () => {
  assert.throws(() => applyDocumentScanPixels({ pixels: new Uint8Array(4), width: 1, height: 1 }), /Uint8ClampedArray/);
  assert.throws(() => applyDocumentScanPixels({ pixels: rgba([0, 0, 0, 255]), width: 2, height: 1 }), /长度/);
});
