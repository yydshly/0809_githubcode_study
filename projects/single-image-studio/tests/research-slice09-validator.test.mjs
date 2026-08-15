import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { materializeSlice09Definition } from "../scripts/research-generate-slice09.mjs";
import { validateSlice09Definition } from "../scripts/research-validate-slice09.mjs";

const TEST_UTC = "2026-08-15T17:30:00.000Z";

async function preview() {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-validator-"));
  const root = path.join(parent, "slice-09");
  await materializeSlice09Definition({ outputRoot: root, frozenAt: TEST_UTC });
  return root;
}

async function clone(root, label) {
  const destination = `${root}-${label}`;
  await cp(root, destination, { recursive: true, errorOnExist: true });
  return destination;
}

test("results-zero preview validates through fresh runtime and deterministic regeneration", async () => {
  const root = await preview();
  const report = await validateSlice09Definition({ definitionRoot: root, requirePins: false, recheckRuntime: true, regenerate: true });
  assert.equal(report.valid, true);
  assert.deepEqual(report.issues, []);
  assert.equal(report.counts.schemas, 18);
  assert.equal(report.counts.sources, 12);
  assert.equal(report.counts.plannedAttempts, 36);
  assert.equal(report.counts.generatedResults, 0);
  assert.equal(report.definitionRef.id, "DEFINITION-INDEX-SLICE09@0.9.0");
  assert.equal(report.postRun, null);
  assert.equal(report.regenerationVerified, true);
});

test("extra files and forbidden result roots fail closed", async () => {
  const root = await preview();
  const extra = await clone(root, "extra");
  await writeFile(path.join(extra, "unregistered.txt"), "no\n");
  const extraReport = await validateSlice09Definition({ definitionRoot: extra, requirePins: false });
  assert.equal(extraReport.valid, false);
  assert.ok(extraReport.issues.some((entry) => entry.code === "S09_FILE_SET_MISMATCH"));

  const emptyDirectory = await clone(root, "empty-directory");
  await mkdir(path.join(emptyDirectory, "unregistered-empty"));
  const emptyReport = await validateSlice09Definition({ definitionRoot: emptyDirectory, requirePins: false });
  assert.ok(emptyReport.issues.some((entry) => entry.code === "S09_DIRECTORY_SET_MISMATCH"));

  const forbidden = await clone(root, "forbidden");
  await mkdir(path.join(forbidden, "results", "calibration"), { recursive: true });
  await writeFile(path.join(forbidden, "results", "calibration", "fake.json"), "{}\n");
  const forbiddenReport = await validateSlice09Definition({ definitionRoot: forbidden, requirePins: false });
  assert.ok(forbiddenReport.issues.some((entry) => entry.code === "S09_RESULT_ROOT_UNREGISTERED"));
});

test("self-rehashed index promotion and locator replay still differ from deterministic bytes", async () => {
  const root = await preview();
  const indexPath = path.join(root, "definition-index.v0.9.0.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  index.evidenceBoundary.C1 = 1;
  index.contentHash = "0".repeat(64);
  await writeFile(indexPath, `${JSON.stringify(index)}\n`);
  const promoted = await validateSlice09Definition({ definitionRoot: root, requirePins: false });
  assert.equal(promoted.valid, false);
  assert.ok(promoted.issues.some((entry) => entry.code === "S09_FILE_BYTES_MISMATCH"));

  const locatorRoot = await preview();
  const manifestPath = path.join(locatorRoot, "manifests", "normalize-smoke.v0.9.0.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.entries[0].goldIdentityLocator = manifest.entries[1].goldIdentityLocator;
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const replay = await validateSlice09Definition({ definitionRoot: locatorRoot, requirePins: false });
  assert.ok(replay.issues.some((entry) => entry.code === "S09_FILE_BYTES_MISMATCH"));
});

test("pins remain fail-closed until one canonical freeze is explicitly materialized", async () => {
  const root = await preview();
  const report = await validateSlice09Definition({ definitionRoot: root, requirePins: true, recheckRuntime: false, regenerate: false });
  assert.equal(report.valid, false);
  assert.equal(report.issues.filter((entry) => entry.code === "S09_PIN_NOT_FROZEN").length, 8);
});
