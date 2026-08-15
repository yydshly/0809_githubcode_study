import assert from "node:assert/strict";
import test from "node:test";

import { encodeCanonicalPngSlice07 } from "../scripts/research-canonical-png-encoder-slice07.mjs";
import { createSlice08CaseContext } from "../scripts/research-gateb-case-context-slice08.mjs";
import { executeSlice08CaseMaterial } from "../scripts/research-gateb-driver-slice08.mjs";

const H = (character) => character.repeat(64);
const hash = async (bytes) => (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex");
const ref = (id, contentHash = H("a")) => ({ path: `records/${id}.json`, id, contentHash, byteLength: 100, fileSha256: H("b") });
const refs = {
  manifestRef: ref("MANIFEST-S08"), candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.8.0"),
  contractRef: ref("CC-CAP02-NORMALIZE-PNG@0.8.0"), runtimeRef: ref("RUNTIME-S08"),
  workerRef: { id: "WORKER-SHARP-RAW@0.8.0", implementationSha256: H("c") },
};

async function applicableFixture() {
  const rgba = Buffer.from([10, 20, 30, 255]);
  const bytes = encodeCanonicalPngSlice07({ width: 1, height: 1, rgba });
  const sourceId = "s08.normalize.applicable.opaque";
  const contentHash = H("d");
  const sourceRecord = {
    id: sourceId, contentHash, rawAssetByteLength: bytes.length, rawAssetFileSha256: await hash(bytes),
    rawAssetMime: "image/png", rawAssetDecodedPixelSha256: await hash(rgba),
    sourceDeclarationMime: "image/png", sourceDeclarationDecodedPixelSha256: await hash(rgba),
  };
  const gold = {
    id: "gold.normalize.opaque", contentHash: H("e"),
    expected: {
      decodedPixelSha256: await hash(rgba), width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "sRGB",
      orientation: 1, alphaMode: "straight", alphaPresent: false,
      metadataPolicy: "strip-all-except-color-contract", pngFilterPolicy: "filter-0-only", interlace: false, animation: false,
    },
  };
  const caseContext = createSlice08CaseContext({
    operation: "normalize", repetition: 1, ...refs,
    caseRecord: {
      sourceId, sourceRef: ref(sourceId, contentHash), disposition: "applicable", expectedStableErrorCode: null,
      expectedFactsRef: ref("facts.normalize.opaque"), goldRef: ref(gold.id, gold.contentHash), workerRequestRef: ref("worker-request.normalize.opaque"),
    },
  });
  return { bytes, rgba, gold, sourceRecord, caseContext };
}

test("applicable typed material reaches only the injected raw executor", async () => {
  const fixture = await applicableFixture();
  let calls = 0;
  const rawExecutor = { execute: async (request) => {
    calls += 1;
    assert.equal(request.attemptId, fixture.caseContext.attempt.attemptId);
    assert.deepEqual(Buffer.from(request.workerRequest.inputBytes), fixture.bytes);
    return { status: "pass", workerObservation: { exitConfirmed: true } };
  } };
  const result = await executeSlice08CaseMaterial({
    caseContext: fixture.caseContext,
    material: { sourceRecord: fixture.sourceRecord, sourceBytes: fixture.bytes, normalizedArtifact: null, gold: fixture.gold },
    rawExecutor,
  });
  assert.equal(result.status, "pass");
  assert.equal(calls, 1);
});

test("rejection material cannot load gold or invoke the raw executor", async () => {
  const fixture = await applicableFixture();
  const sourceId = "s08.normalize.rejection.declaration";
  const sourceRecord = {
    ...fixture.sourceRecord, id: sourceId, contentHash: H("f"), sourceDeclarationMime: "image/jpeg",
  };
  const caseContext = createSlice08CaseContext({
    operation: "normalize", repetition: 1, ...refs,
    caseRecord: {
      sourceId, sourceRef: ref(sourceId, sourceRecord.contentHash), disposition: "rejection",
      expectedStableErrorCode: "S08_NORMALIZE_SOURCE_DECLARATION_INVALID", expectedFactsRef: null, goldRef: null,
      workerRequestRef: ref("worker-request.normalize.rejection.declaration"),
    },
  });
  let calls = 0;
  const rawExecutor = { execute: async () => { calls += 1; } };
  await assert.rejects(executeSlice08CaseMaterial({
    caseContext,
    material: { sourceRecord, sourceBytes: fixture.bytes, normalizedArtifact: null, gold: null },
    rawExecutor,
  }), (error) => error.code === "S08_NORMALIZE_SOURCE_DECLARATION_INVALID" && error.workerObservation === null);
  assert.equal(calls, 0);
  await assert.rejects(executeSlice08CaseMaterial({
    caseContext,
    material: { sourceRecord, sourceBytes: fixture.bytes, normalizedArtifact: null, gold: fixture.gold },
    rawExecutor,
  }), (error) => error.code === "S08_CASE_MATERIAL_INVALID");
  assert.equal(calls, 0);
});

test("source identity, bytes and context hash drift fail before worker", async () => {
  const fixture = await applicableFixture();
  let calls = 0;
  const rawExecutor = { execute: async () => { calls += 1; } };
  const changed = Buffer.from(fixture.bytes);
  changed[changed.length - 1] ^= 1;
  await assert.rejects(executeSlice08CaseMaterial({
    caseContext: fixture.caseContext,
    material: { sourceRecord: fixture.sourceRecord, sourceBytes: changed, normalizedArtifact: null, gold: fixture.gold },
    rawExecutor,
  }), (error) => error.code === "S08_SOURCE_LINEAGE_DRIFT");
  assert.equal(calls, 0);
});
