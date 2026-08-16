import assert from "node:assert/strict";
import test from "node:test";

import {
  coverCrop,
  outputDimensions,
  processFaithful,
} from "../web/local-processing.js";

function createFakeCanvas({ blobBytes = [1, 2, 3, 4], blobType } = {}) {
  const calls = [];
  const context = {
    filter: "none",
    fillStyle: "",
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    fillRect(...args) {
      calls.push({
        name: "fillRect",
        args,
        fillStyle: this.fillStyle,
        operation: this.globalCompositeOperation,
      });
    },
    drawImage(...args) {
      calls.push({ name: "drawImage", args, filter: this.filter });
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    contextOptions: null,
    encode: null,
    getContext(kind, options) {
      assert.equal(kind, "2d");
      this.contextOptions = options;
      return context;
    },
    toBlob(callback, type, quality) {
      this.encode = { type, quality };
      callback(new Blob([Uint8Array.from(blobBytes)], { type: blobType ?? type }));
    },
  };
  return { canvas, calls, context };
}

test("outputDimensions limits the long edge without enlarging the source", () => {
  assert.deepEqual(outputDimensions(4000, 2000), { width: 2048, height: 1024 });
  assert.deepEqual(outputDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(outputDimensions(1, 3, 2), { width: 1, height: 2 });

  for (const args of [[0, 100], [100, -1], [100, 100, 0], [Number.NaN, 100]]) {
    assert.throws(() => outputDimensions(...args), /必须是正数/);
  }
});

test("coverCrop returns the exact centered source rectangle for wide and tall inputs", () => {
  assert.deepEqual(
    coverCrop(4000, 2000, 1600, 1600),
    { sx: 1000, sy: 0, sw: 2000, sh: 2000 },
  );
  assert.deepEqual(
    coverCrop(2000, 4000, 1600, 800),
    { sx: 0, sy: 1500, sw: 2000, sh: 1000 },
  );
  assert.throws(() => coverCrop(2000, 4000, 0, 800), /必须是正数/);
});

test("processFaithful binds decoded geometry, canvas operations and PNG output facts", async () => {
  const { canvas, calls, context } = createFakeCanvas();
  const decoded = { naturalWidth: 4000, naturalHeight: 2000 };
  const result = await processFaithful({
    sourceUrl: "blob:source",
    settings: { brightness: 90, contrast: 110, saturation: 80, tone: "natural" },
    canvas,
    decode: async (source) => {
      assert.equal(source, "blob:source");
      return decoded;
    },
    createObjectUrl: (blob) => `blob:output-${blob.size}`,
  });

  assert.deepEqual(canvas.contextOptions, { alpha: false });
  assert.equal(canvas.width, 2048);
  assert.equal(canvas.height, 1024);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(context.imageSmoothingQuality, "high");
  assert.deepEqual(calls.find((call) => call.name === "drawImage"), {
    name: "drawImage",
    args: [decoded, 0, 0, 4000, 2000, 0, 0, 2048, 1024],
    filter: "brightness(90%) contrast(110%) saturate(80%)",
  });
  assert.deepEqual(canvas.encode, { type: "image/png", quality: undefined });
  assert.equal(result.blob.size, 4);
  assert.equal(result.mime, "image/png");
  assert.equal(result.extension, "png");
  assert.equal(result.url, "blob:output-4");
  assert.match(result.validationSummary, /未执行内容质量检查/);
});

test("processFaithful freezes square crop, warm tone and JPEG encoding settings", async () => {
  const { canvas, calls } = createFakeCanvas({ blobBytes: [9, 8], blobType: "image/jpeg" });
  const decoded = { naturalWidth: 4000, naturalHeight: 2000 };
  const result = await processFaithful({
    sourceUrl: "blob:wide",
    settings: { ratio: "square", format: "jpeg", tone: "warm" },
    canvas,
    decode: async () => decoded,
    createObjectUrl: () => "blob:jpeg",
  });

  assert.deepEqual(calls.find((call) => call.name === "drawImage").args, [
    decoded, 1000, 0, 2000, 2000, 0, 0, 1600, 1600,
  ]);
  assert.equal(calls.some((call) => (
    call.name === "fillRect"
      && call.operation === "soft-light"
      && call.fillStyle === "rgba(241,178,98,.24)"
  )), true);
  assert.deepEqual(canvas.encode, { type: "image/jpeg", quality: 0.92 });
  assert.equal(result.mime, "image/jpeg");
  assert.equal(result.extension, "jpg");
});

test("processFaithful fails closed for invalid canvas, decode and encoded output", async () => {
  await assert.rejects(
    processFaithful({ sourceUrl: "blob:x", canvas: null }),
    /需要可导出的 Canvas/,
  );

  const badDecode = createFakeCanvas();
  await assert.rejects(
    processFaithful({
      sourceUrl: "blob:x",
      canvas: badDecode.canvas,
      decode: async () => ({ naturalWidth: 0, naturalHeight: 10 }),
    }),
    /解码宽度\s+必须是正数/,
  );

  const wrongMime = createFakeCanvas({ blobType: "application/octet-stream" });
  await assert.rejects(
    processFaithful({
      sourceUrl: "blob:x",
      canvas: wrongMime.canvas,
      decode: async () => ({ naturalWidth: 10, naturalHeight: 10 }),
      createObjectUrl: () => "blob:never",
    }),
    /无效的编码结果/,
  );
});
