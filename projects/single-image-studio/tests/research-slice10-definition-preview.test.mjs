import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SLICE10_PREVIEW_PATHS,
  SLICE10_PREVIEW_SCHEMA_DOCUMENTS,
  buildSlice10DefinitionPreview,
  canonicalBytesSlice10,
  digestSlice10Files,
  sha256Slice10Definition,
} from "../scripts/research-generate-slice10.mjs";
import { validateSlice05SchemaInstance } from "../scripts/research-validate-slice05.mjs";

const TEST_UTC = "2026-08-16T01:00:00.000Z";
const SHA_RE = /^[0-9a-f]{64}$/u;
const SCHEMA_KEYWORDS = new Set([
  "$id", "$schema", "additionalProperties", "const", "enum", "items", "maxItems", "maxLength",
  "maximum", "minItems", "minLength", "minimum", "oneOf", "pattern", "properties", "required", "type",
]);

function assertClosedSchema(node, location = "$") {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((entry, index) => assertClosedSchema(entry, `${location}[${index}]`));
    return;
  }
  for (const key of Object.keys(node)) assert.ok(SCHEMA_KEYWORDS.has(key), `${location}: unsupported keyword ${key}`);
  if (node.type === "object") {
    assert.equal(node.additionalProperties, false, `${location}: object is open`);
    assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${location}: required/properties mismatch`);
  }
  if (node.type === "array") assert.ok(node.items, `${location}: array lacks items`);
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties") {
      for (const [name, child] of Object.entries(value)) assertClosedSchema(child, `${location}.properties.${name}`);
    } else if (["items", "oneOf"].includes(key)) assertClosedSchema(value, `${location}.${key}`);
  }
}

function readRecord(built, relativePath) {
  return JSON.parse(built.fileMap.get(relativePath));
}

test("Slice 10 preview is byte deterministic, results-zero and deliberately non-executable", async () => {
  const first = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const second = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  assert.equal(first.fileMap.size, 176);
  assert.equal(first.fileMap.size, second.fileMap.size);
  assert.equal(digestSlice10Files(first.fileMap), digestSlice10Files(second.fileMap));
  for (const [relativePath, bytes] of first.fileMap) assert.deepEqual(bytes, second.fileMap.get(relativePath), relativePath);
  assert.equal(first.index.definitionState, "preview-not-frozen-runner-not-created");
  assert.equal(first.index.runnerRef, null);
  assert.equal(first.index.resultsState, "not-created");
  assert.equal(first.index.formalHoldoutState, "not-created");
  assert.ok([...first.fileMap.keys()].every((entry) => !entry.startsWith("results/") && !entry.endsWith(".png")));
});

test("exactly 16 Slice 10 schemas use the exact namespace and recursively closed supported vocabulary", () => {
  assert.equal(Object.keys(SLICE10_PREVIEW_SCHEMA_DOCUMENTS).length, 16);
  for (const [relativePath, schema] of Object.entries(SLICE10_PREVIEW_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-10/${relativePath}`);
    assertClosedSchema(schema, relativePath);
  }
});

test("every generated machine record validates against its exact strict schema", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  for (const [relativePath, bytes] of built.fileMap) {
    if (relativePath.startsWith("schemas/")) continue;
    const record = JSON.parse(bytes);
    const schemaPath = `schemas/${record.schemaVersion}.schema.json`;
    const schema = SLICE10_PREVIEW_SCHEMA_DOCUMENTS[schemaPath];
    assert.ok(schema, `${relativePath}: missing ${schemaPath}`);
    assert.deepEqual(validateSlice05SchemaInstance(record, schema, relativePath), []);
  }
});

test("definition freezes 96 new source identities, 48 gold identities and exact 30 plus 18 populations per operation", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  assert.deepEqual(built.index.counts, {
    applicableSources: 48, copiedImageBytes: 0, goldIdentities: 48, manifests: 4,
    plannedAttempts: 288, rejectionSources: 48, sourceWrappers: 96, sources: 96,
  });
  assert.equal(built.index.sourceRefs.length, 96);
  assert.equal(built.index.goldIdentityRefs.length, 48);
  assert.equal(built.index.manifestRefs.length, 4);
  assert.equal(built.index.resultProtocol.plannedAttempts, 288);
  assert.equal(built.index.resultProtocol.replacements, 0);
  for (const operation of ["normalize", "export"]) {
    const manifests = built.index.manifestRefs.map((ref) => readRecord(built, ref.path)).filter((record) => record.operation === operation);
    assert.deepEqual(manifests.map((record) => record.sourceCount).sort((a, b) => a - b), [18, 30]);
    assert.equal(manifests.reduce((sum, record) => sum + record.applicableSourceCount, 0), 24);
    assert.equal(manifests.reduce((sum, record) => sum + record.rejectionSourceCount, 0), 24);
    const prereg = readRecord(built, SLICE10_PREVIEW_PATHS[`${operation}Prereg`]);
    assert.equal(prereg.sourceCount, 48);
    assert.equal(prereg.attemptCount, 144);
    assert.equal(prereg.replacements, 0);
    assert.equal(prereg.goldIdentityRefs.length, 24);
  }
});

test("all source, family and capture-session identities are new and globally unique", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const wrappers = built.index.sourceRefs.map((ref) => readRecord(built, ref.path));
  for (const key of ["id", "sourceFamilyId", "captureSessionId"]) {
    assert.equal(new Set(wrappers.map((record) => record[key])).size, 96, key);
    assert.ok(wrappers.every((record) => record[key].includes("s10.")), key);
  }
  assert.ok(wrappers.every((record) => record.independenceClaim === false && record.copiedImageBytes === false));
  assert.ok(wrappers.every((record) => record.priorManifestRef.path.startsWith("research/slice-05/manifests/")));
  assert.ok(wrappers.every((record) => record.priorSourceRef.path.startsWith("research/slice-05/sources/")));
});

test("applicable entries alone receive exact gold identities while all rejection codes are explicitly mapped to S10", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const allowedCodes = new Set([
    "S10_INPUT_CRC_MISMATCH", "S10_INPUT_SRGB_REQUIRED",
    "S10_NORMALIZE_SOURCE_DECLARATION_INVALID", "S10_EXPORT_NORMALIZED_ARTIFACT_INVALID",
  ]);
  let applicable = 0;
  let rejection = 0;
  for (const manifestRef of built.index.manifestRefs) {
    const manifest = readRecord(built, manifestRef.path);
    for (const entry of manifest.entries) {
      if (entry.disposition === "applicable") {
        applicable += 1;
        assert.equal(entry.expectedStableErrorCode, null);
        assert.ok(entry.goldIdentityLocator);
        const identity = readRecord(built, entry.goldIdentityLocator.path);
        assert.equal(identity.id, entry.goldIdentityLocator.id);
        assert.equal(identity.sourceRef.contentHash, entry.sourceRef.contentHash);
        assert.equal(identity.manifestLocator.id, manifest.id);
        assert.equal(identity.candidateOutputUsed, false);
        assert.equal(identity.independenceClaim, false);
      } else {
        rejection += 1;
        assert.equal(entry.goldIdentityLocator, null);
        assert.ok(allowedCodes.has(entry.expectedStableErrorCode), entry.expectedStableErrorCode);
      }
    }
  }
  assert.equal(applicable, 48);
  assert.equal(rejection, 48);
});

test("Slice 09 admission lineage independently pins two immutable pass decisions and summaries without replay authority", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const lineage = readRecord(built, SLICE10_PREVIEW_PATHS.admissionLineage);
  assert.equal(lineage.slice09ResultCommit, "c91014c6bef8878277a8520d003b10684972087b");
  assert.equal(lineage.slice09ResultTreeSha256, "2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451");
  assert.equal(lineage.bothOperationsGateBPassed, true);
  assert.equal(lineage.historicCalibrationAuthorized, false);
  assert.equal(lineage.replayAuthority, false);
  assert.deepEqual(lineage.decisionRefs.map((ref) => ref.id).sort(), ["decision.s09.export", "decision.s09.normalize"]);
  assert.deepEqual(lineage.summaryRefs.map((ref) => ref.id).sort(), ["summary.s09.export", "summary.s09.normalize"]);
});

test("every generated record is canonically self-hashed and every internal record ref closes over exact bytes", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const internalRefs = [
    built.index.candidateRef, ...built.index.contractRefs, built.index.runtimeRef, built.index.hardwareRef,
    built.index.rightsRef, built.index.admissionLineageRef, ...built.index.planRefs,
    ...built.index.preregistrationRefs, ...built.index.manifestRefs, ...built.index.sourceRefs,
    ...built.index.goldIdentityRefs,
  ];
  for (const ref of internalRefs) {
    const bytes = built.fileMap.get(ref.path);
    assert.ok(bytes, ref.path);
    const record = JSON.parse(bytes);
    assert.equal(record.id, ref.id);
    assert.equal(record.contentHash, ref.contentHash);
    assert.equal(bytes.length, ref.byteLength);
    assert.equal(SHA_RE.test(ref.fileSha256), true);
  }
  for (const [relativePath, bytes] of built.fileMap) {
    if (relativePath.startsWith("schemas/") || relativePath === SLICE10_PREVIEW_PATHS.definition) continue;
    const record = JSON.parse(bytes);
    const clone = structuredClone(record);
    delete clone.contentHash;
    const expected = sha256Slice10Definition(canonicalBytesSlice10(clone));
    assert.equal(record.contentHash, expected, relativePath);
  }
});

test("preview implementation pins are actual and intentionally omit a runner and central validator", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const candidate = readRecord(built, SLICE10_PREVIEW_PATHS.candidate);
  assert.equal(candidate.implementationRefs.length, 7);
  assert.ok(candidate.implementationRefs.some((entry) => entry.path === "scripts/research-calibration-protocol-slice10.mjs"));
  assert.ok(candidate.implementationRefs.some((entry) => entry.path === "scripts/research-generate-slice10.mjs"));
  assert.ok(candidate.implementationRefs.every((entry) => !entry.path.includes("runner-slice10") && !entry.path.includes("validate-slice10")));
  for (const implementation of candidate.implementationRefs) {
    const bytes = await readFile(new URL(`../${implementation.path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), implementation.sha256, implementation.path);
  }
  assert.equal(candidate.executionState, "runner-not-created-preview-not-executable");
  assert.equal(path.basename(SLICE10_PREVIEW_PATHS.definition), "definition-index.preview.v0.10.0.json");
});
