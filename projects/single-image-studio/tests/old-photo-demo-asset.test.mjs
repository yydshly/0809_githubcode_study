import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const bytes = await readFile(new URL("../web/demo-assets/old-photo-demo-v1.png", import.meta.url));
const codexReferenceBytes = await readFile(new URL("../web/demo-assets/old-photo-codex-reference-v1.png", import.meta.url));

test("old photo demo is one bounded project-original PNG with frozen identity", () => {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), 1448);
  assert.equal(bytes.readUInt32BE(20), 1086);
  assert.equal(bytes.length, 2_482_568);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "f14e3d5d4d503c8a6fa4a825b947ca22d4b68e9e8bc07d2b25ce6603f585621b");
});

test("Codex old-photo edit reference is frozen as a non-ground-truth comparison asset", () => {
  assert.deepEqual([...codexReferenceBytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(codexReferenceBytes.readUInt32BE(16), 1448);
  assert.equal(codexReferenceBytes.readUInt32BE(20), 1086);
  assert.equal(codexReferenceBytes.length, 2_328_052);
  assert.equal(
    createHash("sha256").update(codexReferenceBytes).digest("hex"),
    "9c7f11a319d19e49cdae4ad39d4a4910487f46fb0bac7d2cd03cc6cbb6960737",
  );
});
