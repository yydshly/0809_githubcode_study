export const RUNTIME_ID_ERROR_CODES = Object.freeze({
  SECURE_RANDOM_UNAVAILABLE: "SECURE_RANDOM_UNAVAILABLE",
});

export class RuntimeIdentityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeIdentityError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function uuidFromRandomBytes(bytes) {
  // RFC 4122 version 4: version nibble 0100, variant bits 10.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/**
 * Creates an unguessable per-run identifier without ever weakening to
 * Math.random. randomUUID is preferred; getRandomValues is the secure fallback
 * commonly available when a phone opens this app over plain HTTP on a LAN.
 */
export function createRuntimeId() {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Some partial Web Crypto implementations expose but cannot use this API.
      // Continue to the equally secure RFC 4122 construction below.
    }
  }

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new RuntimeIdentityError(
      RUNTIME_ID_ERROR_CODES.SECURE_RANDOM_UNAVAILABLE,
      "当前浏览器无法提供安全随机数，不能创建运行标识。",
    );
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return uuidFromRandomBytes(bytes);
}
