import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SLICE09_DEFINITION_PATHS,
  SLICE09_SCHEMA_DOCUMENTS,
  buildSlice09Definition,
  digestSlice09Files,
  materializeSlice09Definition,
} from "../scripts/research-generate-slice09.mjs";
import { validateSlice09GoldIdentity } from "../scripts/research-gateb-gold-identity-slice09.mjs";
import { inspectSlice05Schema } from "../scripts/research-validate-slice05.mjs";

const TEST_UTC = "2026-08-15T17:00:00.000Z";

test("Slice 09 definition is byte deterministic and contains exactly 18 strict schemas", async () => {
  const first = await buildSlice09Definition({ frozenAt: TEST_UTC });
  const second = await buildSlice09Definition({ frozenAt: TEST_UTC });
  assert.equal(first.fileMap.size, second.fileMap.size);
  assert.equal(digestSlice09Files(first.fileMap), digestSlice09Files(second.fileMap));
  for (const [relativePath, bytes] of first.fileMap) assert.deepEqual(bytes, second.fileMap.get(relativePath));
  assert.equal(Object.keys(SLICE09_SCHEMA_DOCUMENTS).length, 18);
  assert.equal(first.index.schemaPaths.length, 18);
  assert.deepEqual(first.index.schemaPaths, Object.keys(SLICE09_SCHEMA_DOCUMENTS).sort());
});

test("all Slice 09 schemas have exact IDs and supported recursively closed vocabulary", () => {
  for (const [relativePath, schema] of Object.entries(SLICE09_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-09/${relativePath}`);
    const probe = structuredClone(schema);
    probe.$id = `https://single-image-studio.invalid/research/slice-05/schemas/s09-definition-probe-${path.basename(relativePath)}`;
    const issues = inspectSlice05Schema(probe, relativePath);
    assert.deepEqual(issues.filter((issue) => issue.code !== "SCHEMA_REF_UNRESOLVED"), []);
    for (const issue of issues) assert.equal(issue.message, "gateb-case-context.slice09.v0.schema.json");
  }
});

test("locator-only manifests break the hash cycle while the index pins all six complete identities", async () => {
  const built = await buildSlice09Definition({ frozenAt: TEST_UTC });
  assert.equal(built.index.goldIdentityRefs.length, 6);
  const identities = new Map();
  for (const identityRef of built.index.goldIdentityRefs) {
    const bytes = built.fileMap.get(identityRef.path);
    const identity = JSON.parse(bytes);
    assert.equal(validateSlice09GoldIdentity(identity), true);
    assert.equal(identity.contentHash, identityRef.contentHash);
    identities.set(identityRef.id, identityRef);
  }
  for (const operation of ["normalize", "export"]) {
    const manifest = JSON.parse(built.fileMap.get(SLICE09_DEFINITION_PATHS[`${operation}Manifest`]));
    assert.equal(manifest.entries.length, 6);
    assert.equal(manifest.entries.filter((entry) => entry.goldIdentityLocator).length, 3);
    for (const entry of manifest.entries) {
      if (entry.disposition === "applicable") {
        const identityRef = identities.get(entry.goldIdentityLocator.id);
        assert.equal(identityRef.path, entry.goldIdentityLocator.path);
      } else assert.equal(entry.goldIdentityLocator, null);
    }
  }
});

test("definition freezes 12 new source identities, 36 planned attempts, zero copied bytes and zero results", async () => {
  const built = await buildSlice09Definition({ frozenAt: TEST_UTC });
  const sourcePaths = [...built.fileMap.keys()].filter((entry) => entry.startsWith("source-lineage/"));
  assert.equal(sourcePaths.length, 12);
  assert.equal(built.index.resultProtocol.plannedSources, 12);
  assert.equal(built.index.resultProtocol.plannedAttempts, 36);
  assert.equal(built.index.resultProtocol.replacements, 0);
  assert.equal(built.index.resultProtocol.globalStopOnFirstNonPass, true);
  assert.equal(built.index.resultsState, "not-created");
  assert.equal(built.index.copiedImageBytes, 0);
  assert.ok([...built.fileMap.keys()].every((entry) => !entry.startsWith("results/") && !entry.endsWith(".png")));
  for (const relativePath of sourcePaths) {
    const record = JSON.parse(built.fileMap.get(relativePath));
    assert.equal(record.copiedImageBytes, false);
    assert.equal(record.priorSlice08Ref.path.startsWith("research/slice-08/"), true);
  }
});

test("materializer writes one results-zero tree and refuses an existing definition", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s09-definition-"));
  const outputRoot = path.join(parent, "slice-09");
  const index = await materializeSlice09Definition({ outputRoot, frozenAt: TEST_UTC });
  assert.equal(index.id, "DEFINITION-INDEX-SLICE09@0.9.0");
  assert.equal(JSON.parse(await readFile(path.join(outputRoot, SLICE09_DEFINITION_PATHS.definition), "utf8")).contentHash, index.contentHash);
  assert.equal((await readdir(outputRoot)).includes("results"), false);
  await assert.rejects(materializeSlice09Definition({ outputRoot, frozenAt: TEST_UTC }), /not results-zero\/empty/u);
});
