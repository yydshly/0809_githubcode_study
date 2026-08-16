const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_PRIVATE_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
const PNG_COLOR_CHUNKS = new Set(["sRGB", "iCCP", "gAMA", "cHRM"]);
const PNG_ALLOWED_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "sRGB", "iCCP", "gAMA", "cHRM", "pHYs"]);

function asBytes(value, label) {
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError(`${label} 必须是 byte array`);
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function inspectPng(bytes) {
  if (bytes.length < 20 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new Error("输出 PNG signature 无效");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = [];
  let offset = 8;
  let sawIend = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error("输出 PNG chunk 不完整");
    const length = view.getUint32(offset, false);
    const type = ascii(bytes, offset + 4, 4);
    const chunkEnd = offset + 12 + length;
    if (!/^[A-Za-z]{4}$/u.test(type) || chunkEnd > bytes.length) throw new Error("输出 PNG chunk 越界");
    chunks.push(type);
    offset = chunkEnd;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  if (!sawIend || offset !== bytes.length || chunks[0] !== "IHDR" || !chunks.includes("IDAT")) {
    throw new Error("输出 PNG 结构、IEND 或尾随 bytes 无效");
  }
  const unapprovedChunks = chunks.filter((type) => !PNG_ALLOWED_CHUNKS.has(type));
  return {
    container: "png",
    markers: chunks,
    privateMetadata: chunks.filter((type) => PNG_PRIVATE_CHUNKS.has(type) || unapprovedChunks.includes(type)),
    colorMetadata: chunks.filter((type) => PNG_COLOR_CHUNKS.has(type)),
  };
}

function inspectJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new Error("输出 JPEG signature 或 EOI 无效");
  }
  const markers = [];
  const privateMetadata = [];
  const colorMetadata = [];
  let offset = 2;
  let sawEoi = false;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) throw new Error("输出 JPEG marker 不完整");
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9) {
      sawEoi = true;
      break;
    }
    if (marker === 0xda) {
      markers.push("SOS");
      return { container: "jpeg", markers, privateMetadata, colorMetadata };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new Error("输出 JPEG segment 长度缺失");
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error("输出 JPEG segment 越界");
    const name = marker >= 0xe0 && marker <= 0xef
      ? `APP${marker - 0xe0}`
      : marker === 0xfe ? "COM" : `0x${marker.toString(16).padStart(2, "0")}`;
    markers.push(name);
    if (marker === 0xe1 || (marker >= 0xe3 && marker <= 0xed) || marker === 0xef || marker === 0xfe) {
      privateMetadata.push(name);
    }
    if (marker === 0xe2) colorMetadata.push("APP2-ICC");
    offset += length;
  }
  if (!sawEoi) throw new Error("输出 JPEG 缺少 SOS 或 EOI");
  return { container: "jpeg", markers, privateMetadata, colorMetadata };
}

export function inspectOutputMetadata(value, mime) {
  const bytes = asBytes(value, "输出");
  const inspection = mime === "image/png"
    ? inspectPng(bytes)
    : mime === "image/jpeg" ? inspectJpeg(bytes) : null;
  if (!inspection) throw new TypeError(`不支持检查 metadata 的输出格式：${mime || "unknown"}`);
  if (inspection.privateMetadata.length > 0) {
    throw new Error(`输出仍包含私密 metadata：${inspection.privateMetadata.join(", ")}`);
  }
  return Object.freeze({
    ...inspection,
    markers: Object.freeze([...inspection.markers]),
    privateMetadata: Object.freeze([]),
    colorMetadata: Object.freeze([...inspection.colorMetadata]),
    policy: "strip-private-preserve-color-description",
  });
}

export function verifyPixelRoundTrip({
  expected,
  actual,
  width,
  height,
  mime,
  pngPremultipliedTolerance = 1,
  jpegMeanAbsoluteTolerance = 16,
  jpegMaxChannelTolerance = 96,
}) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new TypeError("像素核验尺寸无效");
  }
  const before = asBytes(expected, "编码前像素");
  const after = asBytes(actual, "重开像素");
  const requiredLength = width * height * 4;
  if (before.length !== requiredLength || after.length !== requiredLength) {
    throw new Error("像素 byte length 与输出尺寸不一致");
  }
  let transparentPixels = 0;
  let partialAlphaPixels = 0;
  let opaquePixels = 0;
  let maxAlphaError = 0;
  let maxPremultipliedColorError = 0;
  let rgbErrorTotal = 0;
  let maxRgbError = 0;

  for (let offset = 0; offset < requiredLength; offset += 4) {
    const expectedAlpha = before[offset + 3];
    const actualAlpha = after[offset + 3];
    maxAlphaError = Math.max(maxAlphaError, Math.abs(expectedAlpha - actualAlpha));
    if (expectedAlpha === 0) transparentPixels += 1;
    else if (expectedAlpha === 255) opaquePixels += 1;
    else partialAlphaPixels += 1;
    for (let channel = 0; channel < 3; channel += 1) {
      const rgbError = Math.abs(before[offset + channel] - after[offset + channel]);
      rgbErrorTotal += rgbError;
      maxRgbError = Math.max(maxRgbError, rgbError);
      if (expectedAlpha > 0) {
        const expectedPremultiplied = Math.round(before[offset + channel] * expectedAlpha / 255);
        const actualPremultiplied = Math.round(after[offset + channel] * actualAlpha / 255);
        maxPremultipliedColorError = Math.max(
          maxPremultipliedColorError,
          Math.abs(expectedPremultiplied - actualPremultiplied),
        );
      }
    }
  }

  const meanAbsoluteRgbError = rgbErrorTotal / (width * height * 3);
  if (mime === "image/png") {
    if (maxAlphaError !== 0 || maxPremultipliedColorError > pngPremultipliedTolerance) {
      throw new Error("PNG 重开像素破坏了 Alpha 或可见颜色");
    }
  } else if (mime === "image/jpeg") {
    if (before.some((_, index) => index % 4 === 3 && before[index] !== 255)
      || after.some((_, index) => index % 4 === 3 && after[index] !== 255)) {
      throw new Error("JPEG 像素必须在编码前后都完全不透明");
    }
    if (meanAbsoluteRgbError > jpegMeanAbsoluteTolerance || maxRgbError > jpegMaxChannelTolerance) {
      throw new Error("JPEG 重开颜色误差超过当前合同");
    }
  } else {
    throw new TypeError(`不支持像素核验的格式：${mime || "unknown"}`);
  }

  return Object.freeze({
    pixelCount: width * height,
    transparentPixels,
    partialAlphaPixels,
    opaquePixels,
    maxAlphaError,
    maxPremultipliedColorError,
    meanAbsoluteRgbError,
    maxRgbError,
    hiddenRgbPolicy: "ignored-when-alpha-zero",
  });
}
