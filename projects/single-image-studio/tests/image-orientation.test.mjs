import assert from "node:assert/strict";
import test from "node:test";

import { decodeEditorSource, readImageOrientation } from "../web/image-orientation.js";

function tiff(orientation, littleEndian = true) {
  const bytes = new Uint8Array(26);
  const view = new DataView(bytes.buffer);
  bytes.set(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]);
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, 8, littleEndian);
  view.setUint16(8, 1, littleEndian);
  view.setUint16(10, 0x0112, littleEndian);
  view.setUint16(12, 3, littleEndian);
  view.setUint32(14, 1, littleEndian);
  view.setUint16(18, orientation, littleEndian);
  view.setUint32(22, 0, littleEndian);
  return bytes;
}

function jpegWithOrientation(orientation) {
  const payload = Uint8Array.from([...Buffer.from("Exif\0\0", "binary"), ...tiff(orientation)]);
  const length = payload.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload, 0xff, 0xd9]);
}

function pngWithOrientation(orientation) {
  const payload = tiff(orientation, false);
  const length = payload.length;
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    length >>> 24, length >>> 16, length >>> 8, length,
    ...Buffer.from("eXIf"), ...payload, 0, 0, 0, 0,
    0, 0, 0, 0, ...Buffer.from("IEND"), 0, 0, 0, 0,
  ]);
}

function webpWithOrientation(orientation) {
  const payload = tiff(orientation);
  const chunkLength = payload.length;
  const riffLength = 4 + 8 + chunkLength + (chunkLength % 2);
  const header = new Uint8Array(20);
  const view = new DataView(header.buffer);
  header.set(Buffer.from("RIFF"), 0);
  view.setUint32(4, riffLength, true);
  header.set(Buffer.from("WEBP"), 8);
  header.set(Buffer.from("EXIF"), 12);
  view.setUint32(16, chunkLength, true);
  return Uint8Array.from([...header, ...payload, ...(chunkLength % 2 ? [0] : [])]);
}

test("reads orientation from JPEG, PNG and WebP EXIF containers", () => {
  assert.equal(readImageOrientation(jpegWithOrientation(6), "image/jpeg"), 6);
  assert.equal(readImageOrientation(pngWithOrientation(8), "image/png"), 8);
  assert.equal(readImageOrientation(webpWithOrientation(3), "image/webp"), 3);
});

test("returns orientation 1 when a valid container has no EXIF", () => {
  assert.equal(readImageOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg"), 1);
  assert.equal(readImageOrientation(Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 0, ...Buffer.from("IEND"), 0, 0, 0, 0,
  ]), "image/png"), 1);
});

test("rejects invalid orientation and truncated EXIF", () => {
  assert.throws(() => readImageOrientation(jpegWithOrientation(9), "image/jpeg"), /1–8/);
  assert.throws(
    () => readImageOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, 9, ...Buffer.from("Exif\0\0"), 0]), "image/jpeg"),
    /TIFF 头不完整/,
  );
});

test("controlled decode disables browser orientation and returns explicit metadata", async () => {
  const calls = [];
  let closed = false;
  const file = new Blob([jpegWithOrientation(6)], { type: "image/jpeg" });
  const decoded = await decodeEditorSource(file, {
    createBitmap: async (input, options) => {
      calls.push({ input, options });
      return { width: 400, height: 300, close: () => { closed = true; } };
    },
  });
  assert.equal(decoded.sourceOrientation, 6);
  assert.deepEqual([decoded.width, decoded.height], [400, 300]);
  assert.equal(calls[0].input, file);
  assert.deepEqual(calls[0].options, {
    imageOrientation: "none",
    colorSpaceConversion: "default",
    premultiplyAlpha: "none",
  });
  decoded.close();
  assert.equal(closed, true);
});

test("controlled decode fails closed when ImageBitmap geometry is invalid", async () => {
  const file = new Blob([jpegWithOrientation(1)], { type: "image/jpeg" });
  await assert.rejects(
    decodeEditorSource(file, { createBitmap: async () => ({ width: 0, height: 10 }) }),
    /无效解码尺寸/,
  );
});
