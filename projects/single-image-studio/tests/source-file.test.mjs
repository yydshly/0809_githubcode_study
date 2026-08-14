import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  DEFAULT_SOURCE_POLICY,
  SOURCE_ERROR_CODES,
  SourceFileError,
  hashSourceFile,
  preflightSingleSource,
  preflightSourceFile,
  prepareSourceFile,
  sha256Bytes,
} from "../web/source-file.js";

function fakeFile({ name, type, bytes, declaredSize }) {
  const view = Uint8Array.from(bytes);
  return {
    name,
    type,
    size: declaredSize ?? view.byteLength,
    lastModified: 123,
    async arrayBuffer() {
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    },
  };
}

function pngBytes(width = 1200, height = 800) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

function jpegBytes(width = 1200, height = 800) {
  const bytes = new Uint8Array(21);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(7, height, false);
  view.setUint16(9, width, false);
  return bytes;
}

function webpExtendedBytes(width = 1200, height = 800) {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBPVP8X"), 8);
  bytes[16] = 10;
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  bytes.set([
    encodedWidth & 0xff,
    (encodedWidth >>> 8) & 0xff,
    (encodedWidth >>> 16) & 0xff,
  ], 24);
  bytes.set([
    encodedHeight & 0xff,
    (encodedHeight >>> 8) & 0xff,
    (encodedHeight >>> 16) & 0xff,
  ], 27);
  return bytes;
}

function webpLossyBytes(width = 1200, height = 800) {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBPVP8 "), 8);
  bytes[16] = 10;
  bytes.set([0x9d, 0x01, 0x2a], 23);
  const view = new DataView(bytes.buffer);
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);
  return bytes;
}

function webpLosslessBytes(width = 1200, height = 800) {
  const bytes = new Uint8Array(25);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBPVP8L"), 8);
  bytes[16] = 5;
  bytes[20] = 0x2f;
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  bytes[21] = encodedWidth & 0xff;
  bytes[22] = ((encodedWidth >>> 8) & 0x3f) | ((encodedHeight & 0x03) << 6);
  bytes[23] = (encodedHeight >>> 2) & 0xff;
  bytes[24] = (encodedHeight >>> 10) & 0x0f;
  return bytes;
}

const PNG_BYTES = pngBytes();

async function withGlobalCrypto(value, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value,
  });
  try {
    return await operation();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      delete globalThis.crypto;
    }
  }
}

test("metadata preflight accepts one supported file without retaining its path", () => {
  const file = fakeFile({
    name: "C:\\private\\portrait.PNG",
    type: "image/png",
    bytes: PNG_BYTES,
  });

  const result = preflightSingleSource([file]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.source.name, "portrait.PNG");
  assert.equal(result.source.extension, "png");
  assert.equal(result.source.mimeType, "image/png");
  assert.equal("arrayBuffer" in result.source, false);
});

test("preflight fails closed for multiple, empty, oversized, and mismatched files", () => {
  assert.equal(DEFAULT_SOURCE_POLICY.maxBytes, 16 * 1024 * 1024);
  assert.equal(DEFAULT_SOURCE_POLICY.maxPixels, 40_000_000);
  const valid = fakeFile({ name: "one.png", type: "image/png", bytes: PNG_BYTES });
  assert.equal(
    preflightSingleSource([valid, valid]).errors[0].code,
    SOURCE_ERROR_CODES.MULTIPLE_FILES,
  );

  const empty = fakeFile({ name: "empty.png", type: "image/png", bytes: [] });
  assert.equal(preflightSourceFile(empty).errors[0].code, SOURCE_ERROR_CODES.EMPTY_FILE);

  const oversized = fakeFile({
    name: "large.png",
    type: "image/png",
    bytes: PNG_BYTES,
    declaredSize: DEFAULT_SOURCE_POLICY.maxBytes + 1,
  });
  assert.equal(
    preflightSourceFile(oversized).errors[0].code,
    SOURCE_ERROR_CODES.FILE_TOO_LARGE,
  );

  const mismatch = fakeFile({ name: "photo.jpg", type: "image/png", bytes: PNG_BYTES });
  assert.equal(
    preflightSourceFile(mismatch).errors[0].code,
    SOURCE_ERROR_CODES.MIME_EXTENSION_MISMATCH,
  );
});

test("SHA-256 is deterministic and prepareSourceFile binds metadata to file bytes", async () => {
  assert.equal(
    await sha256Bytes(new TextEncoder().encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  const file = fakeFile({ name: "fixture.png", type: "image/png", bytes: PNG_BYTES });
  const prepared = await prepareSourceFile(file);
  assert.equal(prepared.hash, await hashSourceFile(file));
  assert.match(prepared.hash, /^[a-f0-9]{64}$/);
  assert.equal(prepared.hashAlgorithm, "SHA-256");
  assert.equal(prepared.width, 1200);
  assert.equal(prepared.height, 800);
  assert.equal(prepared.pixelCount, 960_000);
  assert.equal("bytes" in prepared, false);
});

test("PNG, JPEG, and WebP dimensions are read from headers without image decoding", async () => {
  const fixtures = [
    { name: "fixture.png", type: "image/png", bytes: pngBytes(1600, 900) },
    { name: "fixture.jpg", type: "image/jpeg", bytes: jpegBytes(2048, 1365) },
    { name: "fixture.webp", type: "image/webp", bytes: webpExtendedBytes(1080, 1440) },
    { name: "lossy.webp", type: "image/webp", bytes: webpLossyBytes(1920, 1080) },
    { name: "lossless.webp", type: "image/webp", bytes: webpLosslessBytes(640, 480) },
  ];

  for (const fixture of fixtures) {
    const prepared = await prepareSourceFile(fakeFile(fixture));
    const expected = fixture.name === "fixture.png"
      ? [1600, 900]
      : fixture.name === "fixture.jpg"
        ? [2048, 1365]
        : fixture.name === "fixture.webp"
          ? [1080, 1440]
          : fixture.name === "lossy.webp"
            ? [1920, 1080]
            : [640, 480];
    assert.equal(prepared.width, expected[0]);
    assert.equal(prepared.height, expected[1]);
    assert.equal(prepared.pixelCount, expected[0] * expected[1]);
  }
});

test("40 MP is accepted and a larger image is rejected before hashing", async () => {
  const atLimit = fakeFile({
    name: "at-limit.png",
    type: "image/png",
    bytes: pngBytes(8000, 5000),
  });
  const prepared = await prepareSourceFile(atLimit);
  assert.equal(prepared.pixelCount, 40_000_000);

  const overLimit = fakeFile({
    name: "over-limit.png",
    type: "image/png",
    bytes: pngBytes(8001, 5000),
  });
  await withGlobalCrypto({
    subtle: {
      async digest() {
        throw new Error("hashing should not run");
      },
    },
  }, async () => {
    await assert.rejects(
      prepareSourceFile(overLimit),
      (error) => error instanceof SourceFileError
        && error.code === SOURCE_ERROR_CODES.IMAGE_PIXEL_LIMIT_EXCEEDED
        && error.details.width === 8001
        && error.details.height === 5000
        && error.details.pixelCount === 40_005_000
        && error.details.maxPixels === 40_000_000,
    );
  });
});

test("custom pixel policy and malformed dimension headers fail closed", async () => {
  await assert.rejects(
    prepareSourceFile(
      fakeFile({ name: "small.png", type: "image/png", bytes: pngBytes(100, 100) }),
      { maxPixels: 9_999 },
    ),
    (error) => error instanceof SourceFileError
      && error.code === SOURCE_ERROR_CODES.IMAGE_PIXEL_LIMIT_EXCEEDED,
  );

  await assert.rejects(
    prepareSourceFile(fakeFile({
      name: "truncated.webp",
      type: "image/webp",
      bytes: new TextEncoder().encode("RIFFxxxxWEBP"),
    })),
    (error) => error instanceof SourceFileError
      && error.code === SOURCE_ERROR_CODES.IMAGE_DIMENSIONS_UNAVAILABLE,
  );
});

test("SHA-256 fallback matches standard vectors when SubtleCrypto is unavailable", async () => {
  await withGlobalCrypto({}, async () => {
    assert.equal(
      await sha256Bytes(new Uint8Array()),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(
      await sha256Bytes(new TextEncoder().encode("abc")),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const multiBlock = Uint8Array.from(
      { length: 257 },
      (_, index) => (index * 31) & 0xff,
    );
    const expected = createHash("sha256").update(multiBlock).digest("hex");
    assert.equal(await sha256Bytes(multiBlock), expected);
  });
});

test("byte-length and signature mismatches are rejected before state entry", async () => {
  const changing = fakeFile({
    name: "changing.png",
    type: "image/png",
    bytes: PNG_BYTES,
    declaredSize: PNG_BYTES.byteLength + 1,
  });
  await assert.rejects(
    prepareSourceFile(changing),
    (error) => error instanceof SourceFileError
      && error.code === SOURCE_ERROR_CODES.BYTE_LENGTH_MISMATCH,
  );

  const spoofed = fakeFile({
    name: "spoofed.png",
    type: "image/png",
    bytes: new TextEncoder().encode("not a png"),
  });
  await assert.rejects(
    prepareSourceFile(spoofed),
    (error) => error instanceof SourceFileError
      && error.code === SOURCE_ERROR_CODES.SIGNATURE_MISMATCH,
  );
});
