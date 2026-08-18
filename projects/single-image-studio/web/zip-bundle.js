const encoder = new TextEncoder();

function uint32(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${label}超出 ZIP32 范围`);
  }
  return value;
}
function safeFilename(value) {
  const name = String(value ?? "").trim();
  if (!name || name.length > 120 || name.includes("/") || name.includes("\\") || name.includes("..") || /[\0-\x1f<>:"|?*]/u.test(name)) {
    throw new TypeError("ZIP 文件名必须是安全的单层文件名");
  }
  return name;
}

async function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof Blob !== "undefined" && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  throw new TypeError("ZIP 条目必须提供 Uint8Array、ArrayBuffer 或 Blob");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function localHeader(nameBytes, bytes, crc) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, bytes.length, true);
  view.setUint32(22, bytes.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function centralHeader(nameBytes, bytes, crc, offset) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, bytes.length, true);
  view.setUint32(24, bytes.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function endRecord(entries, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entries, true);
  view.setUint16(10, entries, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

export async function createStoredZip(entries, { maxBytes = 50 * 1024 * 1024 } = {}) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 64) {
    throw new RangeError("ZIP 必须包含 1–64 个文件");
  }
  const normalized = [];
  const names = new Set();
  let contentBytes = 0;
  for (const entry of entries) {
    const name = safeFilename(entry?.name);
    if (names.has(name)) throw new TypeError("ZIP 不能包含重名文件");
    names.add(name);
    const bytes = await bytesOf(entry?.data);
    if (bytes.length < 1) throw new RangeError("ZIP 不能包含空文件");
    contentBytes += bytes.length;
    if (contentBytes > maxBytes) throw new RangeError("整组商品图超过 50 MiB 上限，请改为单独下载");
    normalized.push({ nameBytes: encoder.encode(name), bytes, crc: crc32(bytes) });
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of normalized) {
    uint32(entry.bytes.length, "ZIP 条目大小");
    const local = localHeader(entry.nameBytes, entry.bytes, entry.crc);
    localParts.push(local, entry.bytes);
    centralParts.push(centralHeader(entry.nameBytes, entry.bytes, entry.crc, offset));
    offset = uint32(offset + local.length + entry.bytes.length, "ZIP 本地目录偏移");
  }
  const centralSize = uint32(centralParts.reduce((sum, part) => sum + part.length, 0), "ZIP 中央目录大小");
  const blob = new Blob([...localParts, ...centralParts, endRecord(normalized.length, centralSize, offset)], { type: "application/zip" });
  if (blob.size > maxBytes + 32 * 1024) throw new RangeError("整组商品图 ZIP 超过交付上限");
  return Object.freeze({ blob, entries: normalized.length, byteLength: blob.size });
}
