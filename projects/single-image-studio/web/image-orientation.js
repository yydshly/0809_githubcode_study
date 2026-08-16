const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError("方向解析需要 ArrayBuffer 或 Uint8Array");
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function stripExifPrefix(bytes) {
  return bytes.length >= 6 && ascii(bytes, 0, 6) === "Exif\0\0" ? bytes.subarray(6) : bytes;
}

function parseTiffOrientation(value) {
  const bytes = stripExifPrefix(value);
  if (bytes.length < 8) throw new Error("EXIF TIFF 头不完整");
  const order = ascii(bytes, 0, 2);
  if (order !== "II" && order !== "MM") throw new Error("EXIF 字节序无效");
  const littleEndian = order === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read16 = (offset) => {
    if (offset < 0 || offset + 2 > bytes.length) throw new Error("EXIF 读取越界");
    return view.getUint16(offset, littleEndian);
  };
  const read32 = (offset) => {
    if (offset < 0 || offset + 4 > bytes.length) throw new Error("EXIF 读取越界");
    return view.getUint32(offset, littleEndian);
  };
  if (read16(2) !== 42) throw new Error("EXIF TIFF magic 无效");
  const ifdOffset = read32(4);
  const entryCount = read16(ifdOffset);
  const entriesEnd = ifdOffset + 2 + entryCount * 12;
  if (entriesEnd + 4 > bytes.length) throw new Error("EXIF IFD 不完整");

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (read16(entryOffset) !== 0x0112) continue;
    if (read16(entryOffset + 2) !== 3 || read32(entryOffset + 4) !== 1) {
      throw new Error("EXIF orientation 类型无效");
    }
    const orientation = read16(entryOffset + 8);
    if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) {
      throw new RangeError("EXIF orientation 必须为 1–8");
    }
    return orientation;
  }
  return 1;
}

function readJpegOrientation(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("JPEG signature 无效");
  }
  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) throw new Error("JPEG marker 不完整");
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new Error("JPEG segment 长度缺失");
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error("JPEG segment 越界");
    }
    const payload = bytes.subarray(offset + 2, offset + segmentLength);
    if (marker === 0xe1 && payload.length >= 6 && ascii(payload, 0, 6) === "Exif\0\0") {
      return parseTiffOrientation(payload);
    }
    offset += segmentLength;
  }
  return 1;
}

function readPngOrientation(bytes) {
  if (bytes.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new Error("PNG signature 无效");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error("PNG chunk 不完整");
    const length = view.getUint32(offset, false);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;
    if (chunkEnd > bytes.length) throw new Error("PNG chunk 越界");
    if (type === "eXIf") return parseTiffOrientation(bytes.subarray(dataStart, dataStart + length));
    if (type === "IEND") return 1;
    offset = chunkEnd;
  }
  throw new Error("PNG 缺少 IEND");
}

function readWebpOrientation(bytes) {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new Error("WebP signature 无效");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffEnd = view.getUint32(4, true) + 8;
  if (riffEnd > bytes.length) throw new Error("WebP RIFF 越界");
  let offset = 12;
  while (offset < riffEnd) {
    if (offset + 8 > riffEnd) throw new Error("WebP chunk 不完整");
    const type = ascii(bytes, offset, 4);
    const length = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > riffEnd) throw new Error("WebP chunk 越界");
    if (type === "EXIF") return parseTiffOrientation(bytes.subarray(dataStart, dataEnd));
    const nextOffset = dataEnd + (length % 2);
    if (nextOffset > riffEnd) throw new Error("WebP chunk padding 缺失");
    offset = nextOffset;
  }
  return 1;
}

export function readImageOrientation(value, mime) {
  const bytes = asBytes(value);
  if (mime === "image/jpeg") return readJpegOrientation(bytes);
  if (mime === "image/png") return readPngOrientation(bytes);
  if (mime === "image/webp") return readWebpOrientation(bytes);
  throw new TypeError(`不支持读取方向的格式：${mime || "unknown"}`);
}

export async function decodeEditorSource(file, { createBitmap = globalThis.createImageBitmap } = {}) {
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.type !== "string") {
    throw new TypeError("编辑器解码需要带 MIME 的 Blob/File");
  }
  if (typeof createBitmap !== "function") throw new Error("当前浏览器不支持受控 ImageBitmap 解码");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sourceOrientation = readImageOrientation(bytes, file.type);
  const image = await createBitmap(file, {
    imageOrientation: "none",
    colorSpaceConversion: "default",
    premultiplyAlpha: "none",
  });
  if (!Number.isFinite(image?.width) || image.width <= 0 || !Number.isFinite(image?.height) || image.height <= 0) {
    image?.close?.();
    throw new Error("浏览器返回了无效解码尺寸");
  }
  return Object.freeze({
    image,
    sourceOrientation,
    width: image.width,
    height: image.height,
    close: () => image.close?.(),
  });
}
