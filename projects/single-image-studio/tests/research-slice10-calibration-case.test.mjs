import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Slice07GateBError } from "../scripts/research-gateb-adapter-slice07.mjs";
import { encodeCanonicalPngSlice07 } from "../scripts/research-canonical-png-encoder-slice07.mjs";
import { decodeIndependentPngSlice05 } from "../scripts/research-independent-png-oracle-slice05.mjs";
import {
  createSlice10CalibrationAttemptExecutor,
  loadSlice10CalibrationCase,
  loadSlice10OperationDefinitionCases,
  Slice10CalibrationCaseError,
  verifySlice10FinalOutput,
} from "../scripts/research-calibration-case-slice10.mjs";
import { buildSlice10DefinitionPreview } from "../scripts/research-generate-slice10.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_UTC = "2026-08-16T01:00:00.000Z";

async function fixtureByCode(code, operation = null) {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const sourceRef = built.index.sourceRefs.find((ref) => {
    const record = JSON.parse(built.fileMap.get(ref.path));
    return record.expectedStableErrorCode === code && (operation === null || record.operation === operation);
  });
  assert.ok(sourceRef);
  const sourceWrapperBytes = built.fileMap.get(sourceRef.path);
  const sourceWrapper = JSON.parse(sourceWrapperBytes);
  const goldIdentityRef = built.index.goldIdentityRefs.find((ref) => ref.id === `gold-identity.${sourceRef.id}`) ?? null;
  const goldIdentityBytes = goldIdentityRef === null ? null : built.fileMap.get(goldIdentityRef.path);
  const goldIdentity = goldIdentityBytes === null ? null : JSON.parse(goldIdentityBytes);
  const material = await loadSlice10CalibrationCase({
    projectRoot: PROJECT_ROOT, sourceWrapper, sourceWrapperBytes, sourceRef,
    goldIdentity, goldIdentityBytes, goldIdentityRef,
  });
  return { built, sourceRef, goldIdentityRef, material };
}

function requestFor(material, repetition = 1) {
  return {
    requestId: `request.test.${material.wrapper.id}.r${repetition}.a1`,
    operation: material.wrapper.operation,
    attempt: { sourceId: material.wrapper.id, partition: material.wrapper.partition, repetition, attemptNumber: 1 },
    disposition: material.wrapper.disposition,
    expectedStableErrorCode: material.wrapper.expectedStableErrorCode,
  };
}

function canonicalCandidateBytes(material) {
  const decoded = decodeIndependentPngSlice05(material.sourceBytes);
  return encodeCanonicalPngSlice07({ width: decoded.width, height: decoded.height, rgba: decoded.rgba });
}

test("Slice 10 reopens normalize and export applicable material with independent gold", async () => {
  const normalize = await fixtureByCode(null, "normalize");
  const exported = await fixtureByCode(null, "export");
  assert.equal(normalize.material.goldRecord.provenance.candidateOutputUsed, false);
  assert.equal(exported.material.normalizedArtifact.producerRef.kind, "independent-fixture-generator");
  assert.equal(exported.material.expected.parentIdentity.artifactSha256, exported.material.normalizedArtifact.contentHash);
});

test("Slice 10 exact rejection cases are gold-free and worker-free", async () => {
  const codes = [
    ["S10_INPUT_CRC_MISMATCH", "normalize"],
    ["S10_INPUT_SRGB_REQUIRED", "normalize"],
    ["S10_NORMALIZE_SOURCE_DECLARATION_INVALID", "normalize"],
    ["S10_EXPORT_NORMALIZED_ARTIFACT_INVALID", "export"],
  ];
  for (const [code, operation] of codes) {
    const { material } = await fixtureByCode(code, operation);
    let calls = 0;
    const execute = createSlice10CalibrationAttemptExecutor({
      casesBySourceId: new Map([[material.wrapper.id, material]]),
      rawExecutor: { async execute() { calls += 1; throw new Error("worker must not run"); } },
    });
    assert.deepEqual(await execute({ request: requestFor(material) }), {
      kind: "rejection-pass", actualStableErrorCode: code, workerInvoked: false,
    });
    assert.equal(calls, 0);
  }
});

test("Slice 10 operation loader closes all 96 sources and every rejection remains worker-free", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  let total = 0;
  for (const operation of ["normalize", "export"]) {
    const loaded = await loadSlice10OperationDefinitionCases({ projectRoot: PROJECT_ROOT, index: built.index, fileMap: built.fileMap, operation });
    assert.equal(loaded.cases.length, 48);
    assert.equal(loaded.cases.filter((item) => item.disposition === "applicable").length, 24);
    let calls = 0;
    const execute = createSlice10CalibrationAttemptExecutor({
      casesBySourceId: loaded.casesBySourceId,
      rawExecutor: { async execute() { calls += 1; throw new Error("worker must not run in rejection audit"); } },
    });
    for (const item of loaded.cases.filter((entry) => entry.disposition === "rejection")) {
      const material = loaded.casesBySourceId.get(item.sourceRef.id);
      const result = await execute({ request: requestFor(material) });
      assert.equal(result.actualStableErrorCode, item.expectedStableErrorCode);
      total += 1;
    }
    assert.equal(calls, 0);
  }
  assert.equal(total, 48);
});

test("Slice 10 applicable normalize invokes raw worker and independently reopens output", async () => {
  const { material } = await fixtureByCode(null, "normalize");
  let seen = null;
  const execute = createSlice10CalibrationAttemptExecutor({
    casesBySourceId: new Map([[material.wrapper.id, material]]),
    rawExecutor: { async execute(input) { seen = input; return { outputBytes: canonicalCandidateBytes(material) }; } },
  });
  const result = await execute({ request: requestFor(material, 2) });
  assert.equal(result.kind, "applicable-pass");
  assert.equal(result.decodedPixelSha256, material.expected.decodedPixelSha256);
  assert.equal(seen.workerRequest.operation, "normalize");
  assert.deepEqual(Buffer.from(seen.workerRequest.inputBytes), material.sourceBytes);
});

test("Slice 10 applicable export decodes independent parent bytes before worker", async () => {
  const { material } = await fixtureByCode(null, "export");
  let seen = null;
  const execute = createSlice10CalibrationAttemptExecutor({
    casesBySourceId: new Map([[material.wrapper.id, material]]),
    rawExecutor: { async execute(input) { seen = input; return { outputBytes: canonicalCandidateBytes(material) }; } },
  });
  const result = await execute({ request: requestFor(material, 3) });
  assert.equal(result.kind, "applicable-pass");
  assert.equal(seen.workerRequest.operation, "export");
  assert.equal(seen.workerRequest.rgba.length, seen.workerRequest.width * seen.workerRequest.height * 4);
  assert.equal(result.oracleFacts.decodedPixelSha256, material.wrapper.rawAsset.decodedPixelSha256);
});

test("Slice 10 rejects request-to-case rebinding before worker", async () => {
  const { material } = await fixtureByCode(null, "normalize");
  const execute = createSlice10CalibrationAttemptExecutor({
    casesBySourceId: new Map([[material.wrapper.id, material]]),
    rawExecutor: { async execute() { throw new Error("unreachable"); } },
  });
  const request = requestFor(material);
  request.operation = "export";
  await assert.rejects(() => execute({ request }), (error) => error.code === "S10_CASE_REQUEST_BINDING_INVALID");
});

test("Slice 10 rejects rehashed source-wrapper and gold-identity drift", async () => {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const sourceRef = built.index.sourceRefs.find((ref) => ref.id === "s10.normalize.dev.001");
  const bytes = Buffer.from(built.fileMap.get(sourceRef.path));
  bytes[10] ^= 1;
  await assert.rejects(() => loadSlice10CalibrationCase({
    projectRoot: PROJECT_ROOT, sourceWrapper: JSON.parse(built.fileMap.get(sourceRef.path)), sourceWrapperBytes: bytes, sourceRef,
  }), (error) => error.code === "S10_CASE_RECORD_DRIFT");
});

test("Slice 10 independent verifier rejects changed pixels", async () => {
  const { material } = await fixtureByCode(null, "normalize");
  const changed = { ...material.expected, decodedPixelSha256: "0".repeat(64) };
  assert.throws(() => verifySlice10FinalOutput({ operation: "normalize", bytes: material.sourceBytes, expected: changed }),
    (error) => error.code === "S10_OUTPUT_ORACLE_REJECTED");
});

test("Slice 07 worker errors are remapped without losing lifecycle boundary", async () => {
  const { material } = await fixtureByCode(null, "normalize");
  const execute = createSlice10CalibrationAttemptExecutor({
    casesBySourceId: new Map([[material.wrapper.id, material]]),
    rawExecutor: { async execute() {
      throw new Slice07GateBError("S07_WORKER_EXIT_NONZERO", "test", { workerObservation: { exit: { confirmed: true } } });
    } },
  });
  await assert.rejects(() => execute({ request: requestFor(material) }), (error) => {
    assert.ok(error instanceof Slice10CalibrationCaseError);
    assert.equal(error.code, "S10_WORKER_EXIT_NONZERO");
    assert.equal(error.workerInvoked, true);
    assert.equal(error.workerExitConfirmed, true);
    return true;
  });
});
