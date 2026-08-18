import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ASSETS = Object.freeze([
  Object.freeze({ name: "suitable-source.png", width: 1254, height: 1254, bytes: 2_153_282, sha256: "246ed1737a11343f218f9d32d32f41e3ba3c4d125cc7b1135fdec717457126c4" }),
  Object.freeze({ name: "suitable-grid-overlay.png", width: 1200, height: 1200, bytes: 3_052_773, sha256: "0fdcbb2ad4c72550ccf2612274af8897fe7fd6de8dcaa44bb2e6ef67095f5aeb" }),
  Object.freeze({ name: "suitable-tiles-contact.png", width: 1024, height: 1024, bytes: 2_056_576, sha256: "5315b49a9c550981628ce6079c966feb0489e85798dbbfbe2471949660bd1d74" }),
  Object.freeze({ name: "unsuitable-source.png", width: 1254, height: 1254, bytes: 2_742_044, sha256: "b5d959b8cfd16befa731d71b266b505f64502da11ed5ed156f61c8470127226c" }),
  Object.freeze({ name: "unsuitable-grid-overlay.png", width: 1200, height: 1200, bytes: 3_900_734, sha256: "42274e79971cb47b6b9caa2be05eadf43f7ad0b6bf2151b41a31a79f3ec8bf94" }),
  Object.freeze({ name: "unsuitable-tiles-contact.png", width: 1024, height: 1024, bytes: 2_597_462, sha256: "0ed47412465c8fd1039896f6e9b5993d984a46f545a88984cae36ad88eb940af" }),
]);

test("social grid guide uses six frozen project-original PNG demonstration assets", async () => {
  for (const asset of ASSETS) {
    const bytes = await readFile(new URL(`../web/demo-assets/social-grid-demo-v1/${asset.name}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], asset.name);
    assert.equal(bytes.readUInt32BE(16), asset.width, `${asset.name} width`);
    assert.equal(bytes.readUInt32BE(20), asset.height, `${asset.name} height`);
    assert.equal(bytes.length, asset.bytes, `${asset.name} byte length`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, `${asset.name} sha256`);
  }
});
