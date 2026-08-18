import assert from "node:assert/strict";
import test from "node:test";
import { createStoredZip } from "../web/zip-bundle.js";

test("stored ZIP contains safe UTF-8 filenames, payloads and a closed central directory", async () => {
  const archive = await createStoredZip([
    { name: "product-square-1200.jpg", data: new Uint8Array([1, 2, 3, 4]) },
    { name: "product-portrait-1200x1500.jpg", data: new Blob([new Uint8Array([5, 6, 7])]) },
  ]);
  const bytes = new Uint8Array(await archive.blob.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  assert.equal(archive.entries, 2);
  assert.equal(archive.byteLength, bytes.length);
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  assert.equal(new DataView(bytes.buffer).getUint32(bytes.length - 22, true), 0x06054b50);
  assert.match(text, /product-square-1200\.jpg/);
  assert.match(text, /product-portrait-1200x1500\.jpg/);
});
test("stored ZIP rejects unsafe names, duplicates, empty data and aggregate overflow", async () => {
  await assert.rejects(() => createStoredZip([{ name: "../secret.jpg", data: new Uint8Array([1]) }]), /安全/);
  await assert.rejects(() => createStoredZip([
    { name: "same.jpg", data: new Uint8Array([1]) },
    { name: "same.jpg", data: new Uint8Array([2]) },
  ]), /重名/);
  await assert.rejects(() => createStoredZip([{ name: "empty.jpg", data: new Uint8Array() }]), /空文件/);
  await assert.rejects(() => createStoredZip([{ name: "large.jpg", data: new Uint8Array(10) }], { maxBytes: 5 }), /上限/);
});
