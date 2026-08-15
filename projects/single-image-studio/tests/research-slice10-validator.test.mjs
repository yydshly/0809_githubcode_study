import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSlice10DefinitionPreview } from "../scripts/research-generate-slice10.mjs";
import { validateSlice10Definition } from "../scripts/research-validate-slice10.mjs";

const TEST_UTC = "2026-08-16T05:00:00.000Z";

async function materializedPreview() {
  const root = await mkdtemp(path.join(os.tmpdir(), "s10-validator-"));
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  for (const [relativePath, bytes] of built.fileMap) {
    const target = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  await writeFile(path.join(root, "README.md"), built.readmeBytes, { flag: "wx" });
  return { root, built };
}

test("central Slice 10 preview validator rechecks runtime and deterministic full-tree bytes", async () => {
  const { root, built } = await materializedPreview();
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.counts.files, 183);
  assert.equal(report.counts.schemas, 22);
  assert.equal(report.counts.sources, 96);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  assert.equal(report.definitionRef.contentHash, built.index.contentHash);
  assert.equal(report.postRun, null);
});

test("central validator rejects one changed machine byte and synchronized index self-hash laundering", async () => {
  const { root } = await materializedPreview();
  const candidatePath = path.join(root, "candidate-locks", "composite-canonical-png.preview.v0.10.0.json");
  const candidate = JSON.parse(await readFile(candidatePath));
  candidate.executionState = "forged-executable";
  await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`);
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "TREE_BYTES_MISMATCH"));
});

test("central validator rejects extra files and every results subtree", async () => {
  const { root } = await materializedPreview();
  await writeFile(path.join(root, "extra.txt"), "extra");
  await mkdir(path.join(root, "results", "open-calibration"), { recursive: true });
  await writeFile(path.join(root, "results", "open-calibration", "fake.json"), "{}\n");
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "RESULTS_PRESENT_AT_DEFINITION"));
  assert.ok(report.issues.some((entry) => entry.code === "TREE_EXTRA_FILE"));
});

test("central validator pins the reviewed README outside the generated self-hash graph", async () => {
  const { root } = await materializedPreview();
  await writeFile(path.join(root, "README.md"), "# forged\n");
  const indexPath = path.join(root, "definition-index.preview.v0.10.0.json");
  const index = JSON.parse(await readFile(indexPath));
  index.readmeSha256 = "f".repeat(64);
  await writeFile(indexPath, `${JSON.stringify(index)}\n`);
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "README_HASH_MISMATCH"));
});

test("execution pin admission remains disabled for a preview even when validation passes", async () => {
  const { root } = await materializedPreview();
  const report = await validateSlice10Definition({ definitionRoot: root, requirePins: true });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "FINAL_PINS_NOT_FROZEN"));
  assert.equal(report.definitionRef, null);
});
