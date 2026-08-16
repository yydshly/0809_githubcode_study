import assert from "node:assert/strict";
import test from "node:test";

import { inspectOutputMetadata, verifyPixelRoundTrip } from "../web/output-validation.js";

const rgba = (...values) => Uint8ClampedArray.from(values);

function pngWithChunks(...types) {
  const bytes = [137, 80, 78, 71, 13, 10, 26, 10];
  for (const type of types) bytes.push(0, 0, 0, 0, ...Buffer.from(type), 0, 0, 0, 0);
  return Uint8Array.from(bytes);
}

function jpegWithSegments(...markers) {
  const bytes = [0xff, 0xd8];
  for (const marker of markers) bytes.push(0xff, marker, 0, 2);
  bytes.push(0xff, 0xd9);
  return Uint8Array.from(bytes);
}

const PIXEL_FIXTURES = [
  ["png-opaque-red", "image/png", rgba(255, 0, 0, 255)],
  ["png-opaque-green", "image/png", rgba(0, 255, 0, 255)],
  ["png-opaque-blue", "image/png", rgba(0, 0, 255, 255)],
  ["png-opaque-black", "image/png", rgba(0, 0, 0, 255)],
  ["png-opaque-white", "image/png", rgba(255, 255, 255, 255)],
  ["png-transparent-hidden-red", "image/png", rgba(255, 0, 0, 0)],
  ["png-transparent-hidden-cyan", "image/png", rgba(0, 255, 255, 0)],
  ["png-alpha-64", "image/png", rgba(80, 120, 160, 64)],
  ["png-alpha-128", "image/png", rgba(80, 120, 160, 128)],
  ["png-alpha-192", "image/png", rgba(80, 120, 160, 192)],
  ["png-alpha-hole", "image/png", rgba(20, 40, 60, 255, 250, 240, 230, 0)],
  ["png-alpha-ramp", "image/png", rgba(10, 20, 30, 0, 10, 20, 30, 85, 10, 20, 30, 170, 10, 20, 30, 255)],
  ["jpeg-flat-gray", "image/jpeg", rgba(128, 128, 128, 255)],
  ["jpeg-warm", "image/jpeg", rgba(230, 160, 90, 255)],
  ["jpeg-cool", "image/jpeg", rgba(70, 130, 210, 255)],
  ["jpeg-dark", "image/jpeg", rgba(20, 30, 40, 255)],
  ["jpeg-light", "image/jpeg", rgba(230, 235, 240, 255)],
  ["jpeg-red-green", "image/jpeg", rgba(220, 40, 30, 255, 30, 210, 50, 255)],
  ["jpeg-blue-yellow", "image/jpeg", rgba(30, 60, 220, 255, 230, 210, 30, 255)],
  ["jpeg-neutral-strip", "image/jpeg", rgba(32, 32, 32, 255, 128, 128, 128, 255, 224, 224, 224, 255)],
];

test("20 project-original pixel fixtures preserve visible color and alpha policy", async (t) => {
  assert.equal(PIXEL_FIXTURES.length, 20);
  for (const [name, mime, expected] of PIXEL_FIXTURES) {
    await t.test(name, () => {
      const actual = new Uint8ClampedArray(expected);
      if (mime === "image/png" && expected[3] === 0) {
        actual[0] = 0;
        actual[1] = 0;
        actual[2] = 0;
      }
      if (mime === "image/jpeg") {
        for (let offset = 0; offset < actual.length; offset += 4) {
          actual[offset] = Math.min(255, actual[offset] + 3);
          actual[offset + 1] = Math.max(0, actual[offset + 1] - 2);
          actual[offset + 2] = Math.min(255, actual[offset + 2] + 1);
        }
      }
      const result = verifyPixelRoundTrip({
        expected,
        actual,
        width: expected.length / 4,
        height: 1,
        mime,
      });
      assert.equal(result.pixelCount, expected.length / 4);
      assert.equal(result.hiddenRgbPolicy, "ignored-when-alpha-zero");
    });
  }
});

test("PNG rejects alpha and visible premultiplied-color damage", () => {
  assert.throws(
    () => verifyPixelRoundTrip({
      expected: rgba(100, 120, 140, 128),
      actual: rgba(100, 120, 140, 127),
      width: 1,
      height: 1,
      mime: "image/png",
    }),
    /Alpha 或可见颜色/,
  );
  assert.throws(
    () => verifyPixelRoundTrip({
      expected: rgba(100, 120, 140, 255),
      actual: rgba(110, 120, 140, 255),
      width: 1,
      height: 1,
      mime: "image/png",
    }),
    /Alpha 或可见颜色/,
  );
});

test("JPEG rejects transparency and excessive decoded color drift", () => {
  assert.throws(
    () => verifyPixelRoundTrip({
      expected: rgba(10, 20, 30, 0),
      actual: rgba(10, 20, 30, 255),
      width: 1,
      height: 1,
      mime: "image/jpeg",
    }),
    /完全不透明/,
  );
  assert.throws(
    () => verifyPixelRoundTrip({
      expected: rgba(0, 0, 0, 255),
      actual: rgba(255, 255, 255, 255),
      width: 1,
      height: 1,
      mime: "image/jpeg",
    }),
    /颜色误差/,
  );
});

test("PNG metadata policy preserves color description but rejects private chunks", () => {
  const clean = inspectOutputMetadata(pngWithChunks("IHDR", "sRGB", "IDAT", "IEND"), "image/png");
  assert.deepEqual(clean.colorMetadata, ["sRGB"]);
  assert.deepEqual(clean.privateMetadata, []);
  assert.throws(
    () => inspectOutputMetadata(pngWithChunks("IHDR", "eXIf", "IDAT", "IEND"), "image/png"),
    /私密 metadata：eXIf/,
  );
  assert.throws(
    () => inspectOutputMetadata(pngWithChunks("IHDR", "iTXt", "IDAT", "IEND"), "image/png"),
    /私密 metadata：iTXt/,
  );
  assert.throws(
    () => inspectOutputMetadata(pngWithChunks("IHDR", "ruSt", "IDAT", "IEND"), "image/png"),
    /私密 metadata：ruSt/,
  );
});

test("JPEG metadata policy distinguishes ICC from EXIF, XMP, IPTC and comments", () => {
  const clean = inspectOutputMetadata(jpegWithSegments(0xe0, 0xe2), "image/jpeg");
  assert.deepEqual(clean.colorMetadata, ["APP2-ICC"]);
  for (const marker of [0xe1, 0xed, 0xfe]) {
    assert.throws(
      () => inspectOutputMetadata(jpegWithSegments(marker), "image/jpeg"),
      /私密 metadata/,
    );
  }
});

test("output inspection rejects malformed containers and unregistered MIME", () => {
  assert.throws(() => inspectOutputMetadata(Uint8Array.of(1, 2, 3), "image/png"), /signature/);
  assert.throws(() => inspectOutputMetadata(Uint8Array.of(1, 2, 3), "image/jpeg"), /signature/);
  assert.throws(() => inspectOutputMetadata(Uint8Array.of(1), "image/webp"), /不支持/);
});
