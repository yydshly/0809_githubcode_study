import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  encodeReferenceSrgbPng,
  normalizeFixturePng,
  sha256,
} from "../scripts/research-reference-adapters.mjs";
import {
  observeNormalizedImageSlice03,
  Slice03ObserverError,
  SLICE03_TECHNICAL_OBSERVER_CONTRACT,
} from "../scripts/research-reference-adapters-slice03.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

const OBSERVED_AT = "2026-08-15T12:00:00.000Z";
const IMPLEMENTATION_REF = `sha256:${"a".repeat(64)}`;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fixture({ width = 12, height = 9, alpha = true, suffix = "observer" } = {}) {
  const rgba = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const pixel = offset / 4;
    rgba.set([
      (pixel * 17) % 256,
      (pixel * 31) % 256,
      (pixel * 47) % 256,
      alpha && pixel % 5 === 0 ? 96 : 255,
    ], offset);
  }
  const sourceBytes = encodeReferenceSrgbPng(width, height, rgba);
  const imageAsset = {
    schemaVersion: "image-asset.v0",
    imageAssetId: `image-asset.${suffix}`,
    mime: "image/png",
    byteLength: sourceBytes.length,
    fileSha256: sha256(sourceBytes),
    orientation: 1,
    colorProfile: "srgb",
    premultiply: "straight",
    sourceClass: "project-original-synthetic",
    createdAt: OBSERVED_AT,
  };
  const normalized = normalizeFixturePng({
    bytes: sourceBytes,
    imageAsset,
    normalizedImageId: `normalized.${suffix}`,
    createdAt: OBSERVED_AT,
  });
  const parentArtifactIdentity = {
    normalizedImageId: normalized.artifact.normalizedImageId,
    parentImageAssetId: normalized.artifact.parentImageAssetId,
    normalizedFileSha256: sha256(normalized.bytes),
    decodedPixelSha256: normalized.artifact.pixelSha256,
  };
  return {
    rgba,
    normalized,
    parentArtifactIdentity,
    args: {
      normalizedArtifact: normalized.artifact,
      normalizedBytes: normalized.bytes,
      parentArtifactIdentity,
      implementationRef: IMPLEMENTATION_REF,
      observedAt: OBSERVED_AT,
    },
  };
}

function assertObserverCode(action, expectedCode) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof Slice03ObserverError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function rewriteChunkCrc(bytes, chunkOffset) {
  const length = bytes.readUInt32BE(chunkOffset);
  const dataEnd = chunkOffset + 8 + length;
  bytes.writeUInt32BE(crc32(bytes.subarray(chunkOffset + 4, dataEnd)), dataEnd);
}

function findChunk(bytes, wanted) {
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === wanted) return { offset, length, dataStart: offset + 8 };
    offset += 12 + length;
  }
  throw new Error(`missing ${wanted} chunk`);
}

test("Slice 03 observer emits only byte-backed normalized facts and explicit unknown semantic facts", () => {
  const { args, normalized } = fixture();
  const result = observeNormalizedImageSlice03(args);

  assert.equal(result.schemaVersion, "technical-observer-result.slice03.v0");
  assert.equal(result.observerContractRef, SLICE03_TECHNICAL_OBSERVER_CONTRACT);
  assert.equal(result.implementationRef, IMPLEMENTATION_REF);
  assert.equal(result.parent.normalizedImageId, normalized.artifact.normalizedImageId);
  assert.equal(result.parent.normalizedFileSha256, sha256(normalized.bytes));
  assert.equal(result.normalizedArtifactFacts.mime, "image/png");
  assert.equal(result.normalizedArtifactFacts.fileSignatureHex, "89504e470d0a1a0a");
  assert.equal(result.normalizedArtifactFacts.decodedWidth, 12);
  assert.equal(result.normalizedArtifactFacts.decodedHeight, 9);
  assert.equal(result.normalizedArtifactFacts.orientation, 1);
  assert.equal(result.normalizedArtifactFacts.colorProfile, "srgb");
  assert.equal(result.normalizedArtifactFacts.alphaChannelPresent, true);
  assert.equal(result.normalizedArtifactFacts.alphaPresent, true);
  assert.equal(result.normalizedArtifactFacts.alphaRepresentation, "straight-unpremultiplied");
  assert.equal(result.normalizedArtifactFacts.evidenceMethod, "full-reference-decode-not-header-probe");
  assert.equal(result.sourceFormatFacts.status, "not-observed-from-normalized-bytes");

  for (const observation of [
    result.sourceFormatFacts.mime,
    result.sourceFormatFacts.format,
    ...Object.values(result.quality),
    ...Object.values(result.subject),
    ...Object.values(result.content),
  ]) {
    assert.equal(observation.value, "unknown");
    assert.match(observation.unknownReason, /^[a-z0-9-]+$/);
    assert.deepEqual(observation.confidence, { lower: 0, upper: 0 });
  }
  assert.equal(Object.hasOwn(result.subject, "age"), false);
  assert.equal(Object.hasOwn(result.content, "identity"), false);
});

test("Slice 03 observer fails closed on byte, parent identity, MIME, dimension, hash, and alpha mismatches", () => {
  const base = fixture();
  const different = fixture({ alpha: false, suffix: "different" });

  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...base.args, normalizedBytes: different.normalized.bytes }),
    "OBS_FILE_HASH_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      parentArtifactIdentity: { ...base.parentArtifactIdentity, normalizedImageId: "normalized.wrong" },
    }),
    "OBS_PARENT_IDENTITY_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      normalizedArtifact: { ...base.normalized.artifact, mime: "image/jpeg" },
    }),
    "OBS_MIME_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      normalizedArtifact: { ...base.normalized.artifact, width: base.normalized.artifact.width - 1 },
    }),
    "OBS_DIMENSION_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      parentArtifactIdentity: { ...base.parentArtifactIdentity, normalizedFileSha256: "0".repeat(64) },
    }),
    "OBS_FILE_HASH_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      normalizedArtifact: { ...base.normalized.artifact, pixelSha256: "0".repeat(64) },
    }),
    "OBS_PIXEL_HASH_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      normalizedArtifact: { ...base.normalized.artifact, alphaPresent: false },
    }),
    "OBS_ALPHA_MISMATCH",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...base.args,
      normalizedArtifact: { ...base.normalized.artifact, unexpected: true },
    }),
    "OBS_OBJECT_SHAPE_MISMATCH",
  );
});

test("Slice 03 observer rejects signatures and inputs outside the closed PNG profile before making observations", () => {
  const { args, normalized } = fixture();

  const badSignature = Buffer.from(normalized.bytes);
  badSignature[0] = 0;
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: badSignature }),
    "OBS_PNG_SIGNATURE_MISMATCH",
  );

  const withoutSrgb = Buffer.from(normalized.bytes);
  const srgb = findChunk(withoutSrgb, "sRGB");
  const noSrgb = Buffer.concat([
    withoutSrgb.subarray(0, srgb.offset),
    withoutSrgb.subarray(srgb.offset + srgb.length + 12),
  ]);
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: noSrgb }),
    "OBS_PNG_PROFILE_MISMATCH",
  );

  const rgbInsteadOfRgba = Buffer.from(normalized.bytes);
  const ihdr = findChunk(rgbInsteadOfRgba, "IHDR");
  rgbInsteadOfRgba[ihdr.dataStart + 9] = 2;
  rewriteChunkCrc(rgbInsteadOfRgba, ihdr.offset);
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: rgbInsteadOfRgba }),
    "OBS_PNG_PROFILE_MISMATCH",
  );

  const idatCorrupt = Buffer.from(normalized.bytes);
  const idat = findChunk(idatCorrupt, "IDAT");
  idatCorrupt[idat.dataStart + Math.floor(idat.length / 2)] ^= 0xff;
  rewriteChunkCrc(idatCorrupt, idat.offset);
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: idatCorrupt }),
    "OBS_PNG_DECODE_FAILED",
  );

  const tooWideRgba = new Uint8Array(257 * 4).fill(255);
  const tooWide = encodeReferenceSrgbPng(257, 1, tooWideRgba);
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: tooWide }),
    "OBS_PNG_DIMENSION_LIMIT_EXCEEDED",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({ ...args, normalizedBytes: Buffer.alloc(1024 * 1024 + 1) }),
    "OBS_BYTES_LIMIT_EXCEEDED",
  );
  assertObserverCode(
    () => observeNormalizedImageSlice03({
      ...args,
      normalizedArtifact: { ...normalized.artifact, premultiply: "premultiplied" },
    }),
    "OBS_ARTIFACT_PROFILE_MISMATCH",
  );
});

test("Slice 03 observer output validates against its strictly closed schema", async () => {
  const result = observeNormalizedImageSlice03(fixture().args);
  const schema = JSON.parse(await readFile(
    new URL("../research/slice-03/schemas/technical-observer.slice03.schema.json", import.meta.url),
    "utf8",
  ));
  assert.deepEqual(validateJsonSchemaInstance(result, schema), []);

  const guessed = structuredClone(result);
  guessed.quality.blur.value = "sharp";
  guessed.quality.blur.confidence = { lower: 0.8, upper: 1 };
  assert.ok(validateJsonSchemaInstance(guessed, schema).length >= 2);
  const widened = { ...result, productSupport: true };
  assert.ok(validateJsonSchemaInstance(widened, schema).length >= 1);
});
