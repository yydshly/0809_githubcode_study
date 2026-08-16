const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9._-]{2,63}$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has unsupported fields`);
  }
}

function nonEmptyText(value, label, maxLength = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new TypeError(`${label} must be a non-empty string up to ${maxLength} characters`);
  }
  return value.trim();
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = PNG_CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function inspectAlphaPng(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new BackgroundRemovalProviderError("provider_output_png_invalid", "抠图服务返回的 PNG bytes 无效");
  }

  let offset = PNG_SIGNATURE.length;
  let chunkIndex = 0;
  let width = null;
  let height = null;
  let sawIdat = false;
  let sawIend = false;
  let idatBytes = 0;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG chunk 不完整");
    }
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.length) {
      throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG chunk 长度无效");
    }
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG chunk 类型无效");
    }
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(Buffer.concat([typeBytes, data])) !== expectedCrc) {
      throw new BackgroundRemovalProviderError("provider_output_png_crc_invalid", `PNG ${type} chunk CRC 无效`);
    }

    if (chunkIndex === 0 && type !== "IHDR") {
      throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG 必须以 IHDR 开始");
    }
    if (type === "IHDR") {
      if (chunkIndex !== 0 || length !== 13 || width !== null) {
        throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG IHDR 无效");
      }
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      const interlace = data[12];
      if (
        width <= 0 ||
        height <= 0 ||
        bitDepth !== 8 ||
        colorType !== 6 ||
        compression !== 0 ||
        filter !== 0 ||
        !new Set([0, 1]).has(interlace)
      ) {
        throw new BackgroundRemovalProviderError(
          "provider_output_alpha_missing",
          "抠图服务必须返回带原生 Alpha 通道的 8-bit RGBA PNG",
        );
      }
    } else if (type === "IDAT") {
      if (width === null || sawIend) {
        throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG IDAT 顺序无效");
      }
      sawIdat = true;
      idatBytes += length;
    } else if (type === "IEND") {
      if (length !== 0 || !sawIdat || idatBytes === 0 || chunkEnd !== bytes.length) {
        throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG IEND 或尾随数据无效");
      }
      sawIend = true;
    } else if (new Set(["acTL", "fcTL", "fdAT"]).has(type)) {
      throw new BackgroundRemovalProviderError("provider_output_animation_invalid", "抠图服务不得返回动画 PNG");
    }

    offset = chunkEnd;
    chunkIndex += 1;
    if (sawIend) break;
  }

  if (!sawIend || width === null || height === null) {
    throw new BackgroundRemovalProviderError("provider_output_png_invalid", "PNG 结构未闭合");
  }
  return { width, height };
}

export class BackgroundRemovalProviderError extends Error {
  constructor(code, message, { definitive = true, httpStatus = null } = {}) {
    super(message);
    this.name = "BackgroundRemovalProviderError";
    this.code = nonEmptyText(code, "provider error code", 100);
    this.definitive = definitive === true;
    this.httpStatus = Number.isInteger(httpStatus) ? httpStatus : null;
  }
}

export function assertBackgroundRemovalProvider(provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
    throw new TypeError("background removal provider must be an object");
  }
  if (!PROVIDER_ID_PATTERN.test(String(provider.id ?? ""))) {
    throw new TypeError("background removal provider id is invalid");
  }
  if (!VERSION_PATTERN.test(String(provider.version ?? ""))) {
    throw new TypeError("background removal provider version is invalid");
  }
  if (!new Set(["fake", "remote"]).has(provider.mode)) {
    throw new TypeError("background removal provider mode must be fake or remote");
  }
  if (provider.environment !== undefined && !new Set(["sandbox", "production"]).has(provider.environment)) {
    throw new TypeError("background removal provider environment must be sandbox or production");
  }
  if (typeof provider.removeBackground !== "function") {
    throw new TypeError("background removal provider must implement removeBackground");
  }
  return provider;
}

export function validateBackgroundRemovalProviderOutput(value, { maxBytes = 16 * 1024 * 1024 } = {}) {
  exactKeys(value, ["providerRequestId", "image"], "provider output");
  exactKeys(value.image, ["bytes", "hasAlpha", "mime"], "provider output image");
  const providerRequestId = nonEmptyText(value.providerRequestId, "providerRequestId");
  if (value.image.mime !== "image/png") {
    throw new BackgroundRemovalProviderError("provider_output_mime_invalid", "抠图服务必须返回 PNG");
  }
  if (value.image.hasAlpha !== true) {
    throw new BackgroundRemovalProviderError("provider_output_alpha_missing", "抠图服务没有声明 Alpha 输出");
  }
  if (!(value.image.bytes instanceof Uint8Array)) {
    throw new BackgroundRemovalProviderError("provider_output_bytes_invalid", "抠图服务没有返回有效 bytes");
  }
  const bytes = Buffer.from(value.image.bytes);
  if (bytes.length <= 0 || bytes.length > maxBytes) {
    throw new BackgroundRemovalProviderError("provider_output_png_invalid", "抠图服务返回的 PNG bytes 无效");
  }
  const { width, height } = inspectAlphaPng(bytes);
  return Object.freeze({
    providerRequestId,
    image: Object.freeze({
      bytes,
      mime: "image/png",
      hasAlpha: true,
      width,
      height,
    }),
  });
}
