const MIB = 1024 * 1024;

export const SOURCE_ERROR_CODES = Object.freeze({
  MISSING_FILE: "MISSING_FILE",
  MULTIPLE_FILES: "MULTIPLE_FILES",
  INVALID_FILE: "INVALID_FILE",
  EMPTY_FILE: "EMPTY_FILE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
  UNSUPPORTED_EXTENSION: "UNSUPPORTED_EXTENSION",
  MIME_EXTENSION_MISMATCH: "MIME_EXTENSION_MISMATCH",
  UNREADABLE_FILE: "UNREADABLE_FILE",
  BYTE_LENGTH_MISMATCH: "BYTE_LENGTH_MISMATCH",
  SIGNATURE_MISMATCH: "SIGNATURE_MISMATCH",
  IMAGE_DIMENSIONS_UNAVAILABLE: "IMAGE_DIMENSIONS_UNAVAILABLE",
  IMAGE_PIXEL_LIMIT_EXCEEDED: "IMAGE_PIXEL_LIMIT_EXCEEDED",
  HASH_UNAVAILABLE: "HASH_UNAVAILABLE",
});

export const DEFAULT_SOURCE_POLICY = Object.freeze({
  maxBytes: 16 * MIB,
  maxPixels: 40_000_000,
  allowedMimeTypes: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
});

const EXTENSION_TO_MIME = Object.freeze({
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
});

const MIME_ALIASES = Object.freeze({
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
});

export class SourceFileError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SourceFileError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function issue(code, message, details = {}) {
  return Object.freeze({ code, message, details: Object.freeze({ ...details }) });
}

function normalizedPolicy(policy = {}) {
  const maxBytes = policy.maxBytes ?? DEFAULT_SOURCE_POLICY.maxBytes;
  const maxPixels = policy.maxPixels ?? DEFAULT_SOURCE_POLICY.maxPixels;
  const allowedMimeTypes = policy.allowedMimeTypes ?? DEFAULT_SOURCE_POLICY.allowedMimeTypes;

  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("source policy maxBytes must be a positive safe integer");
  }
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1) {
    throw new TypeError("source policy maxPixels must be a positive safe integer");
  }

  return {
    maxBytes,
    maxPixels,
    allowedMimeTypes: new Set(
      Array.from(allowedMimeTypes, (type) => normalizeMimeType(type)),
    ),
  };
}

function normalizeMimeType(type) {
  const normalized = String(type ?? "").trim().toLowerCase();
  return MIME_ALIASES[normalized] ?? normalized;
}

function safeBaseName(name) {
  const parts = String(name ?? "").split(/[\\/]/);
  return parts.at(-1)?.trim() ?? "";
}

function extensionOf(name) {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

function metadataFor(file) {
  const name = safeBaseName(file?.name);
  const extension = extensionOf(name);
  const mimeType = normalizeMimeType(file?.type);
  const size = Number(file?.size);

  return {
    name,
    extension,
    mimeType,
    size,
    lastModified: Number.isFinite(Number(file?.lastModified))
      ? Number(file.lastModified)
      : null,
  };
}

/**
 * Metadata-only preflight. This is safe to run before upload consent: it does not
 * decode, inspect image content, perform network I/O, or retain the File object.
 */
export function preflightSourceFile(file, policy = {}) {
  if (!file) {
    return {
      ok: false,
      source: null,
      errors: [issue(SOURCE_ERROR_CODES.MISSING_FILE, "请选择一张图片。")],
    };
  }

  const rules = normalizedPolicy(policy);
  const source = metadataFor(file);
  const errors = [];

  if (!source.name || typeof file.arrayBuffer !== "function") {
    errors.push(issue(
      SOURCE_ERROR_CODES.INVALID_FILE,
      "所选内容不是可读取的单个文件。",
    ));
  }

  if (!Number.isSafeInteger(source.size) || source.size < 0) {
    errors.push(issue(
      SOURCE_ERROR_CODES.INVALID_FILE,
      "文件大小信息无效。",
    ));
  } else if (source.size === 0) {
    errors.push(issue(SOURCE_ERROR_CODES.EMPTY_FILE, "图片文件为空。"));
  } else if (source.size > rules.maxBytes) {
    errors.push(issue(
      SOURCE_ERROR_CODES.FILE_TOO_LARGE,
      "图片超过允许的大小。",
      { maxBytes: rules.maxBytes, actualBytes: source.size },
    ));
  }

  const extensionMime = EXTENSION_TO_MIME[source.extension];
  if (!extensionMime) {
    errors.push(issue(
      SOURCE_ERROR_CODES.UNSUPPORTED_EXTENSION,
      "仅支持 JPG、PNG 或 WebP 图片。",
      { extension: source.extension },
    ));
  }

  if (!rules.allowedMimeTypes.has(source.mimeType)) {
    errors.push(issue(
      SOURCE_ERROR_CODES.UNSUPPORTED_TYPE,
      "图片类型不受支持。",
      { mimeType: source.mimeType },
    ));
  } else if (extensionMime && extensionMime !== source.mimeType) {
    errors.push(issue(
      SOURCE_ERROR_CODES.MIME_EXTENSION_MISMATCH,
      "图片扩展名与浏览器识别的类型不一致。",
      { extension: source.extension, mimeType: source.mimeType },
    ));
  }

  return {
    ok: errors.length === 0,
    source: errors.length === 0 ? Object.freeze(source) : null,
    errors: Object.freeze(errors),
  };
}

export function preflightSingleSource(files, policy = {}) {
  const selected = files ? Array.from(files) : [];
  if (selected.length === 0) {
    return {
      ok: false,
      source: null,
      errors: [issue(SOURCE_ERROR_CODES.MISSING_FILE, "请选择一张图片。")],
    };
  }
  if (selected.length !== 1) {
    return {
      ok: false,
      source: null,
      errors: [issue(
        SOURCE_ERROR_CODES.MULTIPLE_FILES,
        "第一版一次只处理一张图片。",
        { count: selected.length },
      )],
    };
  }
  return preflightSourceFile(selected[0], policy);
}

function asUint8Array(value) {
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  throw new TypeError("expected an ArrayBuffer or typed array");
}

async function readFileBytes(file) {
  try {
    return asUint8Array(await file.arrayBuffer());
  } catch (error) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.UNREADABLE_FILE,
      "无法读取图片文件。",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

function detectedMimeType(bytes) {
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function readUint24LittleEndian(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function pngDimensions(bytes) {
  if (
    bytes.length < 24
    || new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, false) !== 13
    || String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR"
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function jpegDimensions(bytes) {
  let offset = 2;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0x00) continue;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) return null;
      return {
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
      };
    }

    offset += segmentLength;
  }

  return null;
}

function webpDimensions(bytes) {
  if (bytes.length < 20) return null;

  const chunkType = String.fromCharCode(...bytes.subarray(12, 16));
  const chunkSize = (
    bytes[16]
    | (bytes[17] << 8)
    | (bytes[18] << 16)
    | (bytes[19] << 24)
  ) >>> 0;
  const payloadOffset = 20;

  if (chunkType === "VP8X") {
    if (chunkSize < 10 || bytes.length < payloadOffset + 10) return null;
    return {
      width: readUint24LittleEndian(bytes, payloadOffset + 4) + 1,
      height: readUint24LittleEndian(bytes, payloadOffset + 7) + 1,
    };
  }

  if (chunkType === "VP8 ") {
    if (
      chunkSize < 10
      || bytes.length < payloadOffset + 10
      || bytes[payloadOffset + 3] !== 0x9d
      || bytes[payloadOffset + 4] !== 0x01
      || bytes[payloadOffset + 5] !== 0x2a
    ) {
      return null;
    }
    return {
      width: (bytes[payloadOffset + 6] | (bytes[payloadOffset + 7] << 8)) & 0x3fff,
      height: (bytes[payloadOffset + 8] | (bytes[payloadOffset + 9] << 8)) & 0x3fff,
    };
  }

  if (chunkType === "VP8L") {
    if (
      chunkSize < 5
      || bytes.length < payloadOffset + 5
      || bytes[payloadOffset] !== 0x2f
    ) return null;
    const byte1 = bytes[payloadOffset + 1];
    const byte2 = bytes[payloadOffset + 2];
    const byte3 = bytes[payloadOffset + 3];
    const byte4 = bytes[payloadOffset + 4];
    return {
      width: 1 + byte1 + ((byte2 & 0x3f) << 8),
      height: 1 + ((byte2 & 0xc0) >> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
    };
  }

  return null;
}

function imageDimensions(bytes, mimeType) {
  const dimensions = mimeType === "image/png"
    ? pngDimensions(bytes)
    : mimeType === "image/jpeg"
      ? jpegDimensions(bytes)
      : mimeType === "image/webp"
        ? webpDimensions(bytes)
        : null;

  if (
    !dimensions
    || !Number.isSafeInteger(dimensions.width)
    || !Number.isSafeInteger(dimensions.height)
    || dimensions.width < 1
    || dimensions.height < 1
  ) {
    return null;
  }

  return dimensions;
}

function checkedPixelMetadata(bytes, mimeType, maxPixels) {
  const dimensions = imageDimensions(bytes, mimeType);
  if (!dimensions) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.IMAGE_DIMENSIONS_UNAVAILABLE,
      "无法从图片文件头读取有效宽高。",
      { mimeType },
    );
  }

  const pixelCountBigInt = BigInt(dimensions.width) * BigInt(dimensions.height);
  const pixelCount = pixelCountBigInt <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(pixelCountBigInt)
    : pixelCountBigInt.toString();

  if (pixelCountBigInt > BigInt(maxPixels)) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.IMAGE_PIXEL_LIMIT_EXCEEDED,
      "图片像素过高，请选择像素更低的图片。",
      {
        ...dimensions,
        pixelCount,
        maxPixels,
      },
    );
  }

  return {
    ...dimensions,
    pixelCount,
  };
}

const SHA256_INITIAL_STATE = Object.freeze([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const SHA256_ROUND_CONSTANTS = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value, distance) {
  return (value >>> distance) | (value << (32 - distance));
}

/**
 * Small, self-contained SHA-256 fallback for browsers where Web Crypto's
 * digest API is unavailable (notably a phone visiting a plain-HTTP LAN URL).
 * It follows FIPS 180-4 directly and intentionally has no network or package
 * dependency. The normal path still uses the browser's native implementation.
 */
function sha256Fallback(input) {
  const bitLength = input.byteLength * 8;
  const paddedLength = Math.ceil((input.byteLength + 1 + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.byteLength] = 0x80;

  const paddedView = new DataView(padded.buffer);
  paddedView.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  paddedView.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = Uint32Array.from(SHA256_INITIAL_STATE);
  const schedule = new Uint32Array(64);

  for (let blockOffset = 0; blockOffset < paddedLength; blockOffset += 64) {
    for (let index = 0; index < 16; index += 1) {
      schedule[index] = paddedView.getUint32(blockOffset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = schedule[index - 15];
      const previous2 = schedule[index - 2];
      const sigma0 = rotateRight(previous15, 7)
        ^ rotateRight(previous15, 18)
        ^ (previous15 >>> 3);
      const sigma1 = rotateRight(previous2, 17)
        ^ rotateRight(previous2, 19)
        ^ (previous2 >>> 10);
      schedule[index] = (
        schedule[index - 16]
        + sigma0
        + schedule[index - 7]
        + sigma1
      ) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (
        h
        + sum1
        + choose
        + SHA256_ROUND_CONSTANTS[index]
        + schedule[index]
      ) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return Array.from(state, (word) => word.toString(16).padStart(8, "0")).join("");
}

export async function sha256Bytes(bytes) {
  const input = asUint8Array(bytes);
  const digest = globalThis.crypto?.subtle?.digest;
  if (typeof digest === "function") {
    const result = new Uint8Array(
      await digest.call(globalThis.crypto.subtle, "SHA-256", input),
    );
    return Array.from(result, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(input);
}

export async function hashSourceFile(file, policy = {}) {
  const preflight = preflightSourceFile(file, policy);
  if (!preflight.ok) {
    const first = preflight.errors[0];
    throw new SourceFileError(first.code, first.message, first.details);
  }
  const bytes = await readFileBytes(file);
  if (bytes.byteLength !== preflight.source.size) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.BYTE_LENGTH_MISMATCH,
      "文件大小在读取过程中发生变化。",
      { declaredBytes: preflight.source.size, actualBytes: bytes.byteLength },
    );
  }
  return sha256Bytes(bytes);
}

/**
 * Produces the serializable source identity consumed by the state machine.
 * The File and its bytes are intentionally not included in the return value.
 */
export async function prepareSourceFile(file, policy = {}) {
  const preflight = preflightSourceFile(file, policy);
  if (!preflight.ok) {
    const first = preflight.errors[0];
    throw new SourceFileError(first.code, first.message, first.details);
  }

  const bytes = await readFileBytes(file);
  if (bytes.byteLength !== preflight.source.size) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.BYTE_LENGTH_MISMATCH,
      "文件大小在读取过程中发生变化。",
      { declaredBytes: preflight.source.size, actualBytes: bytes.byteLength },
    );
  }

  const signatureMimeType = detectedMimeType(bytes);
  if (signatureMimeType !== preflight.source.mimeType) {
    throw new SourceFileError(
      SOURCE_ERROR_CODES.SIGNATURE_MISMATCH,
      "文件内容与声明的图片格式不一致。",
      { declaredMimeType: preflight.source.mimeType, detectedMimeType: signatureMimeType },
    );
  }

  const pixelMetadata = checkedPixelMetadata(
    bytes,
    signatureMimeType,
    policy.maxPixels ?? DEFAULT_SOURCE_POLICY.maxPixels,
  );

  return Object.freeze({
    ...preflight.source,
    ...pixelMetadata,
    hash: await sha256Bytes(bytes),
    hashAlgorithm: "SHA-256",
  });
}
