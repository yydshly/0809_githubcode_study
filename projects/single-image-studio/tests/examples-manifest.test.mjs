import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EXAMPLES,
  EXAMPLE_ORIGINS,
  EXAMPLE_RESULT_KINDS,
  defineExample,
  exampleById,
  examplesForFilter,
} from "../web/examples-manifest.js";

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function verifyAsset(asset) {
  const bytes = await readFile(new URL(`../web/${asset.path.replace(/^\.\//, "")}`, import.meta.url));
  assert.equal(bytes.length, asset.byteLength, `${asset.path} byteLength`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, `${asset.path} sha256`);
  assert.deepEqual(pngDimensions(bytes), { width: asset.width, height: asset.height }, `${asset.path} dimensions`);
}

test("the gallery manifest contains nine unique, frozen and truthfully classified examples", () => {
  assert.equal(EXAMPLES.length, 9);
  assert.equal(new Set(EXAMPLES.map((entry) => entry.id)).size, EXAMPLES.length);
  assert.equal(EXAMPLES.filter((entry) => entry.filter === "local").length, 8);
  assert.equal(EXAMPLES.filter((entry) => entry.filter === "reference").length, 1);
  assert.equal(EXAMPLES.filter((entry) => entry.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL).length, 6);
  assert.equal(EXAMPLES.filter((entry) => entry.result.origin === EXAMPLE_ORIGINS.CODEX_REFERENCE).length, 1);
  assert.equal(EXAMPLES.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.parameters) && Object.isFrozen(entry.limits)), true);
  assert.equal(exampleById("straighten-local")?.taskId, "UT-TUNE");
  assert.equal(exampleById("old-photo-local")?.processing.runtimeGenerator, "old-photo-monochrome");
  assert.equal(exampleById("old-photo-local")?.parameters.includes("饱和度 -100"), true);
  assert.match(exampleById("old-photo-codex-reference")?.summary, /顶部横向划痕/);
  assert.equal(exampleById("missing"), null);
  assert.equal(examplesForFilter("local").length, 8);
  assert.equal(examplesForFilter("reference").length, 1);
  assert.throws(() => examplesForFilter("remote"), /不支持的样例筛选/);
});

test("every static repository asset matches its frozen path, bytes, dimensions and SHA-256", async () => {
  const assets = new Map();
  for (const entry of EXAMPLES) {
    assets.set(entry.source.path, entry.source);
    if (entry.result.kind === EXAMPLE_RESULT_KINDS.STATIC_ASSET) assets.set(entry.result.path, entry.result);
  }
  await Promise.all([...assets.values()].map(verifyAsset));
});

test("runtime results keep output identity null until the browser renderer generates it", () => {
  for (const entry of EXAMPLES.filter((candidate) => candidate.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL)) {
    assert.equal(entry.processing.location, "local");
    assert.equal(entry.processing.provider, null);
    assert.equal(entry.result.path, null);
    assert.equal(entry.result.width, null);
    assert.equal(entry.result.height, null);
    assert.equal(entry.result.byteLength, null);
    assert.equal(entry.result.sha256, null);
  }
});

test("open, traversal, malformed hash and mislabeled runtime manifests fail closed", () => {
  const valid = EXAMPLES[0];
  assert.throws(() => defineExample({ ...valid, extra: true }), /未知字段/);
  assert.throws(() => defineExample({ ...valid, source: { ...valid.source, path: "./demo-assets/../secret.png" } }), /demo-assets PNG/);
  assert.throws(() => defineExample({ ...valid, source: { ...valid.source, sha256: "bad" } }), /SHA-256/);
  assert.throws(() => defineExample({
    ...valid,
    processing: { ...valid.processing, location: "reference" },
  }), /runtime-local 必须在本地处理/);
});
