import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { materializeSlice07Definition } from "../scripts/research-generate-slice07.mjs";
import { validateSlice07Definition } from "../scripts/research-validate-slice07.mjs";

const FIXED_UTC = "2026-08-15T00:00:00.000Z";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function hashRecord(value) {
  const { contentHash: ignored, ...payload } = value;
  return createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex");
}

async function canonicalRoot(t) {
  const root = await mkdtemp(path.join(tmpdir(), "s07-validator-"));
  t.after(async () => {});
  await materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC });
  return root;
}

async function rewriteRecord(root, relativePath, mutate) {
  const target = path.join(root, ...relativePath.split("/"));
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  value.contentHash = hashRecord(value);
  await writeFile(target, `${JSON.stringify(stable(value), null, 2)}\n`);
}

function codes(report) { return new Set(report.issues.map((entry) => entry.code)); }

test("Slice 07 preview definition validates with fresh runtime and byte regeneration", async (t) => {
  const root = await canonicalRoot(t);
  const report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: true, regenerate: true });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.ok(report.definitionRef);
  assert.equal(report.counts.schemas, 16);
  assert.equal(report.counts.sourceLineage, 12);
  assert.equal(report.counts.results, 0);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
});

test("formal validation verifies every literal freeze pin", async () => {
  const report = await validateSlice07Definition({ requirePins: true, recheckRuntime: true, regenerate: true });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.pinsVerified, true);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
});

test("extra files and result material are rejected", async (t) => {
  const root = await canonicalRoot(t);
  await writeFile(path.join(root, "rogue.txt"), "rogue\n");
  let report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("FILE_SET_MISMATCH"));
  await mkdir(path.join(root, "results"), { recursive: true });
  await writeFile(path.join(root, "results", "fake.json"), "{}\n");
  report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("RESULTS_PRESENT"));
});

test("unsupported schema keywords fail closed", async (t) => {
  const root = await canonicalRoot(t);
  const target = path.join(root, "schemas", "candidate-lock.slice07.v0.schema.json");
  const schema = JSON.parse(await readFile(target, "utf8"));
  schema.maxProperties = 1;
  await writeFile(target, `${JSON.stringify(stable(schema), null, 2)}\n`);
  const report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("SCHEMA_KEYWORD_UNSUPPORTED"));
});

test("self-rehashed source-byte and implementation drift cannot be laundered", async (t) => {
  const root = await canonicalRoot(t);
  await rewriteRecord(root, "source-lineage/normalize/source.s07.normalize.smoke.001.json", (value) => {
    value.rawAssetFileSha256 = "0".repeat(64);
  });
  let report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("SOURCE_BYTES_DRIFT"));

  const root2 = await canonicalRoot(t);
  await rewriteRecord(root2, "candidate-locks/composite-canonical-png.v0.7.0.json", (value) => {
    value.implementationRefs[0].sha256 = "0".repeat(64);
  });
  report = await validateSlice07Definition({ definitionRoot: root2, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("IMPLEMENTATION_HASH_MISMATCH"));
});

test("self-rehashed denominator changes remain invalid", async (t) => {
  const root = await canonicalRoot(t);
  await rewriteRecord(root, "definition-index.v0.7.0.json", (value) => { value.resultProtocol.plannedAttempts = 35; });
  const report = await validateSlice07Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: true });
  assert.ok(codes(report).has("DEFINITION_SEMANTICS_INVALID"));
});
