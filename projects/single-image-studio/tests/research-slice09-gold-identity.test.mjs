import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  contentHashSlice09,
  createSlice09GoldIdentity,
  executeSlice09GoldBoundBranch,
  SLICE09_GOLD_IDENTITY_SCHEMA,
  validateSlice09GoldIdentity,
} from "../scripts/research-gateb-gold-identity-slice09.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOLD_PATH = "research/slice-05/gold/normalize-smoke/gold.raw.s05.normalize.smoke.001.json";
const H = (character) => character.repeat(64);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestRef = {
  path: "manifests/gateb-normalize.slice09.v0.json", id: "FM-GATEB-NORMALIZE-PNG@0.9.0",
  contentHash: H("a"), byteLength: 100, fileSha256: H("b"),
};

async function actualFixture() {
  const bytes = await readFile(path.join(PROJECT_ROOT, GOLD_PATH));
  const record = JSON.parse(bytes);
  const goldRef = {
    path: GOLD_PATH, id: record.goldRecordId, contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256(bytes),
  };
  const identity = createSlice09GoldIdentity({
    operation: "normalize", sourceId: "s09.normalize.applicable.001",
    manifestRef, goldRef, goldRecord: record, goldRecordBytes: bytes,
  });
  return { bytes, record, goldRef, identity };
}

test("actual immutable Slice 05 goldRecordId creates a closed Slice 09 identity", async () => {
  const fixture = await actualFixture();
  assert.equal(fixture.record.id, undefined);
  assert.equal(fixture.identity.goldRecordId, "gold.raw.s05.normalize.smoke.001");
  assert.equal(fixture.identity.goldRef.id, fixture.record.goldRecordId);
  assert.equal(fixture.identity.goldSourceId, fixture.record.sourceId);
  assert.equal(validateSlice09GoldIdentity(fixture.identity), true);
  assert.equal(SLICE09_GOLD_IDENTITY_SCHEMA.additionalProperties, false);
  assert.deepEqual([...SLICE09_GOLD_IDENTITY_SCHEMA.required].sort(), Object.keys(SLICE09_GOLD_IDENTITY_SCHEMA.properties).sort());
});

test("applicable execution exposes only the typed goldRecordId and frozen expected facts", async () => {
  const fixture = await actualFixture();
  let calls = 0;
  const result = await executeSlice09GoldBoundBranch({
    disposition: "applicable", goldIdentity: fixture.identity,
    goldRecord: fixture.record, goldRecordBytes: fixture.bytes,
    executeApplicable: async (input) => {
      calls += 1;
      assert.deepEqual(Object.keys(input).sort(), ["expected", "goldIdentityHash", "goldRecordId"]);
      assert.equal(input.goldRecordId, fixture.record.goldRecordId);
      assert.equal(input.expected.decodedPixelSha256, fixture.record.expected.decodedPixelSha256);
      return { status: "pass" };
    },
  });
  assert.deepEqual(result, { status: "pass" });
  assert.equal(calls, 1);
});

test("generic id fallback, missing goldRecordId and dual-key laundering fail closed", async () => {
  const fixture = await actualFixture();
  for (const record of [
    { ...fixture.record, goldRecordId: undefined, id: fixture.record.goldRecordId },
    Object.fromEntries(Object.entries(fixture.record).filter(([key]) => key !== "goldRecordId")),
    { ...fixture.record, id: fixture.record.goldRecordId },
  ]) {
    await assert.rejects(async () => createSlice09GoldIdentity({
      operation: "normalize", sourceId: "s09.normalize.applicable.001",
      manifestRef, goldRef: fixture.goldRef, goldRecord: record, goldRecordBytes: fixture.bytes,
    }), (error) => error.code === "S09_GOLD_RECORD_INVALID");
  }
});

test("record object, file bytes, record ref and operation drift fail before execution", async () => {
  const fixture = await actualFixture();
  const changedBytes = Buffer.from(fixture.bytes);
  changedBytes[changedBytes.length - 2] ^= 1;
  const cases = [
    { operation: "normalize", goldRef: { ...fixture.goldRef, id: "gold.wrong" }, record: fixture.record, bytes: fixture.bytes },
    { operation: "normalize", goldRef: fixture.goldRef, record: { ...fixture.record, operation: "export" }, bytes: fixture.bytes },
    { operation: "normalize", goldRef: fixture.goldRef, record: fixture.record, bytes: changedBytes },
    { operation: "export", goldRef: fixture.goldRef, record: fixture.record, bytes: fixture.bytes },
  ];
  for (const item of cases) {
    assert.throws(() => createSlice09GoldIdentity({
      operation: item.operation, sourceId: `s09.${item.operation}.applicable.001`, manifestRef,
      goldRef: item.goldRef, goldRecord: item.record, goldRecordBytes: item.bytes,
    }), (error) => error.code.startsWith("S09_"));
  }
});

test("self-rehashed cross-binding drift and unknown identity fields are rejected", async () => {
  const fixture = await actualFixture();
  const changed = structuredClone(fixture.identity);
  changed.goldRecordId = "gold.raw.s05.normalize.smoke.999";
  changed.contentHash = contentHashSlice09(changed);
  assert.throws(() => validateSlice09GoldIdentity(changed), (error) => error.code === "S09_GOLD_IDENTITY_INVALID");
  assert.throws(() => validateSlice09GoldIdentity({ ...fixture.identity, fallbackId: fixture.identity.goldRecordId }),
    (error) => error.code === "S09_GOLD_IDENTITY_INVALID");
});

test("rejection branch is gold-free and cannot touch applicable material", async () => {
  const fixture = await actualFixture();
  let rejectionCalls = 0;
  const result = await executeSlice09GoldBoundBranch({
    disposition: "rejection", goldIdentity: null, goldRecord: null, goldRecordBytes: null,
    executeRejection: async () => { rejectionCalls += 1; return { code: "S09_INPUT_CRC_MISMATCH" }; },
  });
  assert.equal(result.code, "S09_INPUT_CRC_MISMATCH");
  assert.equal(rejectionCalls, 1);
  await assert.rejects(executeSlice09GoldBoundBranch({
    disposition: "rejection", goldIdentity: fixture.identity,
    goldRecord: fixture.record, goldRecordBytes: fixture.bytes,
    executeRejection: async () => null,
  }), (error) => error.code === "S09_CASE_MATERIAL_INVALID" && error.workerObservation === null);
});
