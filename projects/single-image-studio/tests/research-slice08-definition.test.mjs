import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SLICE08_SCHEMA_DOCUMENTS, buildSlice08Definition, materializeSlice08Definition } from "../scripts/research-generate-slice08.mjs";

const TEST_UTC = "2026-08-15T14:00:00.000Z";

test("Slice 08 definition is deterministic, results-zero and has exact new denominator", async () => {
  const a = await buildSlice08Definition({ frozenAt: TEST_UTC, readmeBytes: Buffer.from("# preview\n") });
  const b = await buildSlice08Definition({ frozenAt: TEST_UTC, readmeBytes: Buffer.from("# preview\n") });
  assert.deepEqual([...a.fileMap.keys()], [...b.fileMap.keys()]);
  for (const [key, bytes] of a.fileMap) assert.deepEqual(bytes, b.fileMap.get(key), key);
  assert.equal(a.index.resultsState, "not-created");
  assert.equal(a.index.resultProtocol.plannedSources, 12);
  assert.equal(a.index.resultProtocol.plannedAttempts, 36);
  assert.equal(a.index.copiedImageBytes, 0);
  assert.equal(a.index.schemaPaths.length, 16);
});

test("all 16 schemas use the Slice 08 namespace and recursively close objects", () => {
  assert.equal(Object.keys(SLICE08_SCHEMA_DOCUMENTS).length, 16);
  const visit = (node, location) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, location);
      assert.deepEqual([...(node.required ?? [])].sort(), Object.keys(node.properties ?? {}).sort(), location);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "properties" || key === "$defs") Object.entries(value).forEach(([name, child]) => visit(child, `${location}/${name}`));
      if (key === "items") visit(value, `${location}/items`);
      if (key === "oneOf") value.forEach((child, index) => visit(child, `${location}/oneOf/${index}`));
    }
  };
  for (const [relativePath, schema] of Object.entries(SLICE08_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-08/${relativePath}`);
    visit(schema, relativePath);
  }
});

test("definition has 12 new wrappers over immutable Slice 07 lineage and no image copies", async () => {
  const built = await buildSlice08Definition({ frozenAt: TEST_UTC, readmeBytes: Buffer.from("# preview\n") });
  const wrappers = [...built.fileMap.entries()].filter(([key]) => key.startsWith("source-lineage/"));
  assert.equal(wrappers.length, 12);
  for (const [, bytes] of wrappers) {
    const value = JSON.parse(bytes);
    assert.match(value.id, /^s08\.(normalize|export)\.(applicable|rejection)\.00[1-6]$/u);
    assert.equal(value.independenceClaim, false);
    assert.equal(value.copiedImageBytes, false);
  }
  assert.equal([...built.fileMap.keys()].some((key) => /results|\.png$|\.bin$/u.test(key)), false);
});

test("materializer refuses a non-empty definition root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "s08-definition-existing-"));
  await (await import("node:fs/promises")).writeFile(path.join(root, "extra.txt"), "x");
  await assert.rejects(materializeSlice08Definition({ outputRoot: root, frozenAt: TEST_UTC }), /not results-zero/u);
  assert.deepEqual(await readdir(root), ["extra.txt"]);
});
