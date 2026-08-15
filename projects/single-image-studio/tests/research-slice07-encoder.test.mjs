import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SLICE07_CANONICAL_ENCODER_ID,
  SLICE07_CANONICAL_PNG_PROFILE,
  Slice07CanonicalEncoderError,
  encodeCanonicalPngSlice07,
} from "../scripts/research-canonical-png-encoder-slice07.mjs";
import { decodeIndependentPngSlice05 } from "../scripts/research-independent-png-oracle-slice05.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const CASES = Object.freeze([
  Object.freeze({
    width: 1,
    height: 1,
    rgba: Uint8Array.from([10, 20, 30, 255]),
    outputSha256: "3aacba054cb12df6027f19b7ce5a42520dd5b15e942047a38732b407a3c267c9",
  }),
  Object.freeze({
    width: 2,
    height: 2,
    rgba: Uint8Array.from([
      255, 0, 0, 255,
      0, 255, 0, 128,
      0, 0, 255, 0,
      90, 80, 70, 200,
    ]),
    outputSha256: "6808369b8aad1661fefa3899876f68962e542af2e4af72ebbbfa1b205bf6a9ce",
  }),
  Object.freeze({
    width: 3,
    height: 2,
    rgba: Uint8Array.from([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16,
      17, 18, 19, 20,
      21, 22, 23, 24,
    ]),
    outputSha256: "8c378c98f87391e50e1cbbe1669367acb10f30219a7056bf62ab640497af4ac4",
  }),
]);

function testOnlyCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

test("Slice 07 candidate encoder is a separately identified closed-profile implementation", async () => {
  assert.equal(SLICE07_CANONICAL_ENCODER_ID, "ENCODER-CANONICAL-PNG@0.7.0");
  assert.deepEqual(SLICE07_CANONICAL_PNG_PROFILE.chunkTypes, ["IHDR", "sRGB", "IDAT", "IEND"]);
  assert.equal(SLICE07_CANONICAL_PNG_PROFILE.scanlineFilter, 0);
  const source = await readFile(new URL("../scripts/research-canonical-png-encoder-slice07.mjs", import.meta.url), "utf8");
  assert.match(source, /from "node:zlib"/);
  for (const forbidden of [
    "research-reference-adapters",
    "research-independent-png-oracle",
    "research-diagnostic-png-oracle",
    "sharp(",
    ".png(",
  ]) {
    assert.equal(source.includes(forbidden), false, `candidate encoder must not depend on ${forbidden}`);
  }
});

test("independent oracle reopens exact canonical chunks, filter 0, pixels, and alpha", () => {
  for (const fixture of CASES) {
    const bytes = encodeCanonicalPngSlice07(fixture);
    const decoded = decodeIndependentPngSlice05(bytes);
    assert.deepEqual(decoded.chunkTypes, ["IHDR", "sRGB", "IDAT", "IEND"]);
    assert.equal(decoded.width, fixture.width);
    assert.equal(decoded.height, fixture.height);
    assert.equal(decoded.filter0Only, true);
    assert.deepEqual(decoded.filterTypes, Array(fixture.height).fill(0));
    assert.deepEqual(decoded.rgba, Buffer.from(fixture.rgba));
    assert.equal(decoded.decodedPixelSha256, sha256(fixture.rgba));
    assert.equal(decoded.colorSpace, "embedded-sRGB");
    assert.equal(decoded.metadataPolicy, "strip-all-except-color-contract");
  }
});

test("three independent encodes are byte deterministic for every frozen alpha shape", () => {
  for (const fixture of CASES) {
    const outputs = Array.from({ length: 3 }, () => encodeCanonicalPngSlice07(fixture));
    assert.ok(outputs[0].equals(outputs[1]));
    assert.ok(outputs[1].equals(outputs[2]));
    assert.equal(new Set(outputs.map(sha256)).size, 1);
    assert.equal(sha256(outputs[0]), fixture.outputSha256);
  }
});

test("candidate encoder rejects dimensions, type, and RGBA length before encoding", () => {
  const bad = [
    () => encodeCanonicalPngSlice07({ width: 0, height: 1, rgba: new Uint8Array(0) }),
    () => encodeCanonicalPngSlice07({ width: 257, height: 1, rgba: new Uint8Array(257 * 4) }),
    () => encodeCanonicalPngSlice07({ width: 1, height: 1, rgba: [0, 0, 0, 0] }),
    () => encodeCanonicalPngSlice07({ width: 2, height: 2, rgba: new Uint8Array(15) }),
  ];
  for (const action of bad) assert.throws(action, Slice07CanonicalEncoderError);
});

test("independent oracle rejects a metadata tamper even after its CRC is recomputed", () => {
  const bytes = encodeCanonicalPngSlice07(CASES[1]);
  const tampered = Buffer.from(bytes);
  const srgbTypeOffset = tampered.indexOf(Buffer.from("sRGB", "ascii"));
  assert.ok(srgbTypeOffset > 0);
  tampered.write("pHYs", srgbTypeOffset, "ascii");
  const length = tampered.readUInt32BE(srgbTypeOffset - 4);
  const crcOffset = srgbTypeOffset + 4 + length;
  tampered.writeUInt32BE(testOnlyCrc32(tampered.subarray(srgbTypeOffset, crcOffset)), crcOffset);
  assert.throws(() => decodeIndependentPngSlice05(tampered), /metadata/i);
});
