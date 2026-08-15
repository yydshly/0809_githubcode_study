import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSlice09CaseContext } from "../scripts/research-gateb-case-context-slice09.mjs";
import { executeSlice09CaseMaterial } from "../scripts/research-gateb-driver-slice09.mjs";
import { createSlice09GoldIdentity } from "../scripts/research-gateb-gold-identity-slice09.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = (character) => character.repeat(64);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ref = (id, contentHash = H("a"), relativePath = `records/${id}.json`, bytes = null) => ({
  path: relativePath, id, contentHash,
  byteLength: bytes?.length ?? 100, fileSha256: bytes ? sha256(bytes) : H("b"),
});

const paths = Object.freeze({
  normalize: {
    gold: "research/slice-05/gold/normalize-smoke/gold.raw.s05.normalize.smoke.001.json",
    source: "research/slice-05/assets/open/normalize-smoke/raw.s05.normalize.smoke.001.png",
  },
  export: {
    gold: "research/slice-05/gold/export-smoke/gold.normalized.s05.export.smoke.001.json",
    source: "research/slice-05/assets/open/export-smoke/raw.s05.export.smoke.001.png",
  },
});

async function fixture(operation = "normalize") {
  const goldRecordBytes = await readFile(path.join(PROJECT_ROOT, paths[operation].gold));
  const goldRecord = JSON.parse(goldRecordBytes);
  const sourceBytes = await readFile(path.join(PROJECT_ROOT, paths[operation].source));
  const sourceId = `s09.${operation}.applicable.001`;
  const manifestRef = ref(`FM-GATEB-${operation.toUpperCase()}-PNG@0.9.0`, H("1"));
  const goldRef = ref(goldRecord.goldRecordId, goldRecord.contentHash, paths[operation].gold, goldRecordBytes);
  const goldIdentity = createSlice09GoldIdentity({ operation, sourceId, manifestRef, goldRef, goldRecord, goldRecordBytes });
  const goldIdentityBytes = Buffer.from(`${JSON.stringify(goldIdentity, null, 2)}\n`, "utf8");
  const goldIdentityRef = ref(goldIdentity.identityId, goldIdentity.contentHash, `gold-identities/${operation}/${sourceId}.json`, goldIdentityBytes);
  const sourceRecord = {
    id: sourceId, contentHash: H("2"), rawAssetByteLength: sourceBytes.length,
    rawAssetFileSha256: sha256(sourceBytes), rawAssetMime: "image/png",
    rawAssetDecodedPixelSha256: goldRecord.expected.parentIdentity.decodedPixelSha256,
    sourceDeclarationMime: "image/png",
    sourceDeclarationDecodedPixelSha256: goldRecord.expected.parentIdentity.decodedPixelSha256,
  };
  const caseContext = createSlice09CaseContext({
    operation, repetition: 1, manifestRef,
    candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.9.0"),
    contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.9.0" : "CC-CAP02-EXPORT-PNG@0.9.0"),
    runtimeRef: ref("RUNTIME-SHARP-CANONICAL-PNG@0.9.0"),
    workerRef: { id: "WORKER-SHARP-RAW@0.9.0", implementationSha256: H("3") },
    caseRecord: {
      sourceId, sourceRef: ref(sourceId, sourceRecord.contentHash), disposition: "applicable",
      expectedStableErrorCode: null, goldIdentityRef, workerRequestRef: ref(`worker-request.${sourceId}`),
    },
  });
  return { caseContext, sourceRecord, sourceBytes, goldIdentity, goldIdentityBytes, goldRecord, goldRecordBytes };
}

function material(value) {
  return {
    sourceRecord: value.sourceRecord, sourceBytes: value.sourceBytes, normalizedArtifact: null,
    goldIdentity: value.goldIdentity, goldIdentityBytes: value.goldIdentityBytes,
    goldRecord: value.goldRecord, goldRecordBytes: value.goldRecordBytes,
  };
}

test("normalize actual-case driver uses real goldRecordId through the typed identity", async () => {
  const value = await fixture("normalize");
  assert.equal(value.goldRecord.id, undefined);
  let calls = 0;
  const result = await executeSlice09CaseMaterial({
    caseContext: value.caseContext, material: material(value),
    rawExecutor: { execute: async (input) => {
      calls += 1;
      assert.equal(input.operation, "normalize");
      assert.deepEqual(Buffer.from(input.workerRequest.inputBytes), value.sourceBytes);
      assert.equal(input.expected.decodedPixelSha256, value.goldRecord.expected.decodedPixelSha256);
      return { status: "pass", workerObservation: { exitConfirmed: true } };
    } },
  });
  assert.equal(result.status, "pass");
  assert.equal(calls, 1);
});

test("export applicable material uses independent input bytes and typed export gold", async () => {
  const value = await fixture("export");
  let calls = 0;
  const result = await executeSlice09CaseMaterial({
    caseContext: value.caseContext, material: material(value),
    rawExecutor: { execute: async (input) => {
      calls += 1;
      assert.equal(input.operation, "export");
      assert.equal(input.workerRequest.operation, "export");
      assert.equal(input.expected.decodedPixelSha256, value.goldRecord.expected.decodedPixelSha256);
      return { status: "pass", workerObservation: { exitConfirmed: true } };
    } },
  });
  assert.equal(result.status, "pass");
  assert.equal(calls, 1);
});

test("rejection material remains gold-free and worker-free", async () => {
  const value = await fixture("normalize");
  const sourceId = "s09.normalize.rejection.declaration";
  const sourceRecord = { ...value.sourceRecord, id: sourceId, contentHash: H("4"), sourceDeclarationMime: "image/jpeg" };
  const caseContext = createSlice09CaseContext({
    operation: "normalize", repetition: 1, manifestRef: value.caseContext.manifestRef,
    candidateRef: value.caseContext.candidateRef, contractRef: value.caseContext.contractRef,
    runtimeRef: value.caseContext.runtimeRef, workerRef: value.caseContext.workerRef,
    caseRecord: {
      sourceId, sourceRef: ref(sourceId, sourceRecord.contentHash), disposition: "rejection",
      expectedStableErrorCode: "S09_NORMALIZE_SOURCE_DECLARATION_INVALID", goldIdentityRef: null,
      workerRequestRef: ref(`worker-request.${sourceId}`),
    },
  });
  let calls = 0;
  const rawExecutor = { execute: async () => { calls += 1; } };
  await assert.rejects(executeSlice09CaseMaterial({
    caseContext,
    material: {
      sourceRecord, sourceBytes: value.sourceBytes, normalizedArtifact: null,
      goldIdentity: null, goldIdentityBytes: null, goldRecord: null, goldRecordBytes: null,
    }, rawExecutor,
  }), (error) => error.code === "S09_NORMALIZE_SOURCE_DECLARATION_INVALID" && error.workerObservation === null);
  assert.equal(calls, 0);
  await assert.rejects(executeSlice09CaseMaterial({ caseContext, material: { ...material(value), sourceRecord }, rawExecutor }),
    (error) => error.code === "S09_CASE_MATERIAL_INVALID");
  assert.equal(calls, 0);
});

test("identity bytes, manifest binding and source bytes drift fail before worker", async () => {
  const value = await fixture("normalize");
  let calls = 0;
  const rawExecutor = { execute: async () => { calls += 1; } };
  const changedIdentityBytes = Buffer.from(value.goldIdentityBytes);
  changedIdentityBytes[changedIdentityBytes.length - 2] ^= 1;
  const changedSourceBytes = Buffer.from(value.sourceBytes);
  changedSourceBytes[changedSourceBytes.length - 1] ^= 1;
  for (const changedMaterial of [
    { ...material(value), goldIdentityBytes: changedIdentityBytes },
    { ...material(value), sourceBytes: changedSourceBytes },
    { ...material(value), goldIdentity: { ...value.goldIdentity, manifestRef: ref("FM-WRONG", H("9")) } },
  ]) {
    await assert.rejects(executeSlice09CaseMaterial({ caseContext: value.caseContext, material: changedMaterial, rawExecutor }),
      (error) => error.code.startsWith("S09_"));
  }
  assert.equal(calls, 0);
});
