import { constants as zlibConstants, deflateSync } from "node:zlib";

export const SLICE07_CANONICAL_ENCODER_ID = "ENCODER-CANONICAL-PNG@0.7.0";

export const SLICE07_CANONICAL_PNG_PROFILE = Object.freeze({
  maxWidth: 256,
  maxHeight: 256,
  maxDecodedBytes: 262_144,
  maxOutputBytes: 1_048_576,
  bitDepth: 8,
  colorType: 6,
  compressionMethod: 0,
  filterMethod: 0,
  interlaceMethod: 0,
  renderingIntent: 0,
  scanlineFilter: 0,
  chunkTypes: Object.freeze(["IHDR", "sRGB", "IDAT", "IEND"]),
  zlib: Object.freeze({ level: 9, strategy: "Z_FIXED", windowBits: 15, memLevel: 8 }),
});

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");

export class Slice07CanonicalEncoderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Slice07CanonicalEncoderError";
    this.code = code;
  }
}

function reject(code, message) {
  throw new Slice07CanonicalEncoderError(code, message);
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  if (!/^[A-Za-z]{4}$/.test(type)) reject("S07_ENCODER_CHUNK_TYPE_INVALID", "PNG chunk type must contain four ASCII letters");
  const typeBytes = Buffer.from(type, "ascii");
  const payload = Buffer.from(data);
  const chunk = Buffer.allocUnsafe(12 + payload.length);
  chunk.writeUInt32BE(payload.length, 0);
  typeBytes.copy(chunk, 4);
  payload.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + payload.length)), 8 + payload.length);
  return chunk;
}

function validateInput(width, height, rgba) {
  if (!Number.isInteger(width) || width < 1 || width > SLICE07_CANONICAL_PNG_PROFILE.maxWidth) {
    reject("S07_ENCODER_DIMENSIONS_INVALID", "width must be an integer from 1 through 256");
  }
  if (!Number.isInteger(height) || height < 1 || height > SLICE07_CANONICAL_PNG_PROFILE.maxHeight) {
    reject("S07_ENCODER_DIMENSIONS_INVALID", "height must be an integer from 1 through 256");
  }
  if (!(rgba instanceof Uint8Array)) {
    reject("S07_ENCODER_RGBA_INVALID", "rgba must be a Uint8Array");
  }
  const expectedLength = width * height * 4;
  if (expectedLength > SLICE07_CANONICAL_PNG_PROFILE.maxDecodedBytes || rgba.byteLength !== expectedLength) {
    reject("S07_ENCODER_RGBA_LENGTH_MISMATCH", "rgba length must equal width * height * 4 within the frozen decoded-byte limit");
  }
}

function makeFilterZeroScanlines(width, height, rgba) {
  const stride = width * 4;
  const scanlines = Buffer.allocUnsafe((stride + 1) * height);
  const source = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let row = 0; row < height; row += 1) {
    const targetOffset = row * (stride + 1);
    scanlines[targetOffset] = SLICE07_CANONICAL_PNG_PROFILE.scanlineFilter;
    source.copy(scanlines, targetOffset + 1, row * stride, (row + 1) * stride);
  }
  return scanlines;
}

export function encodeCanonicalPngSlice07({ width, height, rgba }) {
  validateInput(width, height, rgba);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = SLICE07_CANONICAL_PNG_PROFILE.bitDepth;
  header[9] = SLICE07_CANONICAL_PNG_PROFILE.colorType;
  header[10] = SLICE07_CANONICAL_PNG_PROFILE.compressionMethod;
  header[11] = SLICE07_CANONICAL_PNG_PROFILE.filterMethod;
  header[12] = SLICE07_CANONICAL_PNG_PROFILE.interlaceMethod;

  const compressed = deflateSync(makeFilterZeroScanlines(width, height, rgba), {
    level: SLICE07_CANONICAL_PNG_PROFILE.zlib.level,
    strategy: zlibConstants.Z_FIXED,
    windowBits: SLICE07_CANONICAL_PNG_PROFILE.zlib.windowBits,
    memLevel: SLICE07_CANONICAL_PNG_PROFILE.zlib.memLevel,
  });

  const output = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("sRGB", Buffer.from([SLICE07_CANONICAL_PNG_PROFILE.renderingIntent])),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  if (output.length > SLICE07_CANONICAL_PNG_PROFILE.maxOutputBytes) {
    reject("S07_ENCODER_OUTPUT_LIMIT_EXCEEDED", "canonical PNG exceeds the frozen 1 MiB output limit");
  }
  return output;
}
