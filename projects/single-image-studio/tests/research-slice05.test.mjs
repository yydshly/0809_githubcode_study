import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { encodeCanonicalRgbaPngSlice05 } from "../scripts/research-generate-slice05.mjs";
import { inventorySharpRuntimeSlice05 } from "../scripts/research-inventory-sharp-slice05.mjs";
import {
  decodeIndependentPngSlice05,
  evaluateDeliveryArtifactSlice05,
  evaluateNormalizedImageSlice05,
} from "../scripts/research-independent-png-oracle-slice05.mjs";

import {
  compareSlice05TreesByteForByte,
  collectSlice05References,
  contentHashSlice05Validation,
  digestSlice05FileRecords,
  digestSlice05Tree,
  inspectSlice05Schema,
  listSlice05Tree,
  sha256Slice05Validation,
  stableStringifySlice05Validation,
  validateSlice05Definition,
  validateSlice05DefinitionBoundary,
  validateSlice05OptionalClosedSmokeResults,
  validateSlice05OptionalOpenCalibrationResults,
  validateSlice05SchemaInstance,
} from "../scripts/research-validate-slice05.mjs";
import {
  artifactRecordRelativePathSlice05,
  artifactRelativePathSlice05,
  buildCalibrationAdmissionSlice05,
  buildCalibrationSummarySlice05,
  buildGateBDecisionSlice05,
  buildOperationSmokeSummarySlice05,
  buildRuntimeInventoryObservationSlice05,
  buildSlice05FaultResult,
  buildSlice05SessionAudit,
  contentHashSlice05Runner,
  createSlice05TestRunner,
  oracleRelativePathSlice05,
  requestIdSlice05Runner,
  stableStringifySlice05Runner,
} from "../scripts/research-run-slice05.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const CANONICAL_SLICE_ROOT = process.env.SLICE05_TEST_DEFINITION_ROOT
  ? path.resolve(process.env.SLICE05_TEST_DEFINITION_ROOT)
  : path.join(PROJECT_ROOT, "research", "slice-05");
const HAS_FROZEN_DEFINITION = existsSync(path.join(CANONICAL_SLICE_ROOT, "definition-index.v0.5.0.json"));

const SCHEMA_NAMES = [
  "normalized-image.slice04.v0.schema.json",
  "delivery-artifact.slice04.v0.schema.json",
  "oracle-result.slice05.v0.schema.json",
  "gold-record.slice05.v0.schema.json",
];

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("Slice 05 schema inspector accepts the four strict oracle-layer schemas", async () => {
  for (const name of SCHEMA_NAMES) {
    const schema = JSON.parse(await readFile(new URL(`../research/slice-05/schemas/${name}`, import.meta.url), "utf8"));
    assert.deepEqual(inspectSlice05Schema(schema, `schemas/${name}`), []);
  }
});

test("schema inspector rejects unknown keywords and open or partially required objects", () => {
  const base = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-05/schemas/probe.schema.json",
    type: "object",
    additionalProperties: false,
    properties: { value: { type: "string" } },
    required: ["value"],
  };
  assert.deepEqual(inspectSlice05Schema(base), []);

  const unknown = structuredClone(base);
  unknown.properties.value.default = "silently-accepted";
  assert.ok(inspectSlice05Schema(unknown).some(({ code }) => code === "SCHEMA_KEYWORD_UNSUPPORTED"));

  const open = structuredClone(base);
  open.additionalProperties = true;
  assert.ok(inspectSlice05Schema(open).some(({ code }) => code === "SCHEMA_OBJECT_OPEN"));

  const optional = structuredClone(base);
  optional.required = [];
  assert.ok(inspectSlice05Schema(optional).some(({ code }) => code === "SCHEMA_REQUIRED_INCOMPLETE"));

  const missingType = structuredClone(base);
  delete missingType.type;
  assert.ok(inspectSlice05Schema(missingType).some(({ code }) => code === "SCHEMA_OBJECT_TYPE_MISSING"));

  const unsupportedFormat = structuredClone(base);
  unsupportedFormat.properties.value.format = "uri";
  assert.ok(inspectSlice05Schema(unsupportedFormat).some(({ code }) => code === "SCHEMA_FORMAT_UNSUPPORTED"));
});

test("schema instance validator handles local refs, strict objects, exact UTC, and oneOf fail-closed", () => {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-05/schemas/instance-probe.schema.json",
    type: "object",
    additionalProperties: false,
    properties: {
      at: { $ref: "#/$defs/utc" },
      value: { oneOf: [{ type: "string", const: "yes" }, { type: "integer", const: 1 }] },
    },
    required: ["at", "value"],
    $defs: {
      utc: { type: "string", format: "date-time", pattern: "Z$" },
    },
  };
  assert.deepEqual(validateSlice05SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "yes" }, schema), []);
  assert.ok(validateSlice05SchemaInstance({ at: "2026-02-31T01:02:03.004Z", value: "yes" }, schema).length >= 1);
  assert.ok(validateSlice05SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "no" }, schema).length >= 1);
  assert.ok(validateSlice05SchemaInstance({ at: "2026-08-15T01:02:03.004Z", value: "yes", extra: true }, schema).length >= 1);
});

test("tree enumeration and canonical digest cover relative path, byte length, and file hash", async (t) => {
  const root = await temporaryDirectory(t, "single-image-studio-s05-tree-");
  await mkdir(path.join(root, "nested"));
  await writeFile(path.join(root, "a.json"), "{}\n", "utf8");
  await writeFile(path.join(root, "nested", "fixture.bin"), Buffer.from([0, 1, 2, 3]));
  const tree = await listSlice05Tree(root);
  assert.deepEqual(tree.issues, []);
  assert.deepEqual(tree.files, ["a.json", "nested/fixture.bin"]);
  assert.deepEqual(tree.directories, ["nested"]);
  const digest = await digestSlice05Tree(root, tree.files);
  assert.equal(digest.records.length, 2);
  assert.equal(digest.sha256, digestSlice05FileRecords(digest.records));
  assert.equal(digest.records[0].sha256, sha256Slice05Validation(Buffer.from("{}\n")));
});

test("byte-for-byte tree comparison detects both file-set and content drift", async (t) => {
  const left = await temporaryDirectory(t, "single-image-studio-s05-left-");
  const right = await temporaryDirectory(t, "single-image-studio-s05-right-");
  await writeFile(path.join(left, "definition.json"), "{\"value\":1}\n", "utf8");
  await writeFile(path.join(right, "definition.json"), "{\"value\":1}\n", "utf8");
  assert.deepEqual(await compareSlice05TreesByteForByte(left, right), []);
  await writeFile(path.join(right, "definition.json"), "{\"value\":2}\n", "utf8");
  assert.ok((await compareSlice05TreesByteForByte(left, right)).some(({ code }) => code === "REGEN_BYTES_MISMATCH"));
  await writeFile(path.join(right, "extra.txt"), "not allowed\n", "utf8");
  assert.ok((await compareSlice05TreesByteForByte(left, right)).some(({ code }) => code === "REGEN_FILE_SET_MISMATCH"));
});

test("content hashes, record/file reference discovery, and definition evidence boundary are fail-closed", () => {
  const record = {
    schemaVersion: "probe.slice05.v0",
    recordId: "RECORD@0.5.0",
    recordRef: { path: "records/parent.json", id: "PARENT@0.5.0", contentHash: "a".repeat(64), byteLength: 10, fileSha256: "b".repeat(64) },
    fileRef: { path: "assets/open/pixel.bin", byteLength: 4, fileSha256: "c".repeat(64) },
    evidenceBoundary: { productSupport: false, formalEvidence: false, c1: 0, u1: 0, e1: 0, r1: 0, o1: 0, g1: 0, v1: 0 },
    gateBState: "not-evaluated",
    contentHash: "",
  };
  record.contentHash = contentHashSlice05Validation(record);
  assert.match(record.contentHash, /^[0-9a-f]{64}$/);
  assert.notEqual(record.contentHash, contentHashSlice05Validation({ ...record, recordId: "DRIFT@0.5.0" }));
  const references = collectSlice05References(record);
  assert.equal(references.recordRefs.length, 1);
  assert.equal(references.fileRefs.length, 1);
  assert.deepEqual(validateSlice05DefinitionBoundary(record), []);

  const upgraded = structuredClone(record);
  upgraded.evidenceBoundary.c1 = 1;
  upgraded.evidenceBoundary.productSupport = true;
  upgraded.gateBState = "passed";
  const codes = validateSlice05DefinitionBoundary(upgraded).map(({ code }) => code);
  assert.ok(codes.includes("EVIDENCE_AXIS_UPGRADED"));
  assert.ok(codes.includes("DEFINITION_BOUNDARY_UPGRADED"));
  assert.ok(codes.includes("GATE_B_UPGRADED"));

  const timestampedUpgrade = {
    gateBStateAtDefinitionFreeze: "passed",
    resultsStateAtDefinitionFreeze: "created",
    formalHoldoutStatusAtDefinitionFreeze: "created",
    formalPartitionsCreatedAtDefinitionFreeze: true,
  };
  const timestampedCodes = validateSlice05DefinitionBoundary(timestampedUpgrade).map(({ code }) => code);
  assert.ok(timestampedCodes.includes("GATE_B_UPGRADED"));
  assert.ok(timestampedCodes.includes("DEFINITION_RESULT_STATE_INVALID"));
  assert.ok(timestampedCodes.includes("DEFINITION_BOUNDARY_UPGRADED"));
});

test("closed-smoke validator cannot be retargeted to a formal holdout root", async (t) => {
  const wrapper = await temporaryDirectory(t, "single-image-studio-s05-result-boundary-");
  const formalRoot = path.join(wrapper, "formal-holdout");
  await mkdir(formalRoot);
  const report = await validateSlice05OptionalClosedSmokeResults({
    sliceRoot: wrapper,
    resultsRoot: formalRoot,
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === "OPTIONAL_RESULT_ROOT_BOUNDARY_FORBIDDEN"));
});

test("open-calibration validator fails closed without operation and cannot target holdout material", async (t) => {
  const wrapper = await temporaryDirectory(t, "single-image-studio-s05-calibration-boundary-");
  const formalRoot = path.join(wrapper, "defect-holdout");
  await mkdir(formalRoot);
  const missingOperation = await validateSlice05OptionalOpenCalibrationResults({
    sliceRoot: wrapper,
    resultsRoot: formalRoot,
  });
  assert.ok(missingOperation.issues.some(({ code }) => code === "CALIBRATION_OPERATION_INVALID"));
  const formal = await validateSlice05OptionalOpenCalibrationResults({
    operation: "normalize",
    sliceRoot: wrapper,
    resultsRoot: formalRoot,
  });
  assert.ok(formal.issues.some(({ code }) => code === "CALIBRATION_RESULT_ROOT_BOUNDARY_FORBIDDEN"));
});

async function copiedFrozenDefinition(t, prefix = "single-image-studio-s05-adversarial-") {
  const wrapper = await temporaryDirectory(t, prefix);
  const root = path.join(wrapper, "slice-05");
  await cp(CANONICAL_SLICE_ROOT, root, { recursive: true, force: false, errorOnExist: true });
  return root;
}

async function copiedDefinitionFrom(t, source, prefix = "single-image-studio-s05-result-adversarial-") {
  const wrapper = await temporaryDirectory(t, prefix);
  const root = path.join(wrapper, "slice-05");
  await cp(source, root, { recursive: true, force: false, errorOnExist: true });
  return root;
}

async function mutateContentHashedRecord(root, relativePath, mutate) {
  const filename = path.join(root, relativePath);
  const record = JSON.parse(await readFile(filename, "utf8"));
  mutate(record);
  record.contentHash = contentHashSlice05Validation(record);
  await writeFile(filename, stableStringifySlice05Validation(record), "utf8");
}

async function canonicalDefinitionRef(root, relativePath, idField) {
  const bytes = await readFile(path.join(root, ...relativePath.split("/")));
  const record = JSON.parse(bytes.toString("utf8"));
  return {
    path: relativePath,
    id: record[idField],
    contentHash: record.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: sha256Slice05Validation(bytes),
  };
}

async function frozenSmokeRequest(root, { operation = "normalize", entryIndex = 0, repetition = 1, attemptNumber = 1 } = {}) {
  const index = JSON.parse(await readFile(path.join(root, "definition-index.v0.5.0.json"), "utf8"));
  const manifestPath = `manifests/${operation}-smoke.v0.5.0.json`;
  const manifest = JSON.parse(await readFile(path.join(root, ...manifestPath.split("/")), "utf8"));
  const manifestRef = index.smokeManifestRefs.find((item) => item.operation === operation).ref;
  const entry = manifest.entries[entryIndex];
  const entryHash = contentHashSlice05Validation(entry);
  const idempotencyKey = `s05.smoke.${operation}.${manifestRef.contentHash.slice(0, 12)}.${entryHash.slice(0, 12)}.r${repetition}.a${attemptNumber}`;
  const implementationByRole = new Map(index.implementationRefs.map(({ role, ref }) => [role, ref]));
  const implementationRef = (role) => {
    const ref = implementationByRole.get(role);
    return { id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 };
  };
  const request = {
    schemaVersion: "local-run-request.slice05.v0",
    requestId: requestIdSlice05Runner({ operation, manifestContentHash: manifestRef.contentHash, sourceId: entry.sourceId, repetition, attemptNumber }),
    mode: "smoke",
    operation,
    definitionRef: await canonicalDefinitionRef(root, "definition-index.v0.5.0.json", "definitionIndexId"),
    contractRef: structuredClone(manifest.contractRefs[0]),
    manifestRef: structuredClone(manifestRef),
    manifestEntryRef: { entryIndex, sourceId: entry.sourceId, contentHash: entryHash },
    goldRecordRef: structuredClone(entry.goldRecordRef),
    runtimeAttestationRef: structuredClone(index.runtimeAttestationRef),
    adapterRef: implementationRef("candidate-adapter"),
    oracleRef: implementationRef("independent-oracle"),
    attempt: {
      runId: `run.smoke.${operation}.${index.contentHash.slice(0, 16)}`,
      sourceId: entry.sourceId,
      partition: "smoke",
      repetition,
      attemptNumber,
      idempotencyKey,
    },
    expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
    expectedStableErrorCode: entry.expectedStableErrorCode,
    sourceIdentity: {
      sourceId: entry.sourceId,
      sourceProvenanceRef: structuredClone(entry.sourceProvenanceRef),
      rawAssetRef: structuredClone(entry.rawAsset),
      normalizedArtifactRef: entry.normalizedArtifactRef === null
        ? null
        : { ...structuredClone(entry.normalizedArtifactRef), producerKind: "independent-fixture-generator" },
    },
    createdAt: index.frozenAt,
    contentHash: "",
  };
  request.contentHash = contentHashSlice05Validation(request);
  return request;
}

async function frozenCalibrationRequest(root, {
  operation,
  manifestRef,
  entryIndex,
  repetition,
  attemptNumber = 1,
  createdAt,
} = {}) {
  const index = JSON.parse(await readFile(path.join(root, "definition-index.v0.5.0.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(root, ...manifestRef.path.split("/")), "utf8"));
  const entry = manifest.entries[entryIndex];
  const entryHash = contentHashSlice05Validation(entry);
  const idempotencyKey = `s05.calibration.${operation}.${manifestRef.contentHash.slice(0, 12)}.${entryHash.slice(0, 12)}.r${repetition}.a${attemptNumber}`;
  const implementationByRole = new Map(index.implementationRefs.map(({ role, ref }) => [role, ref]));
  const implementationRef = (role) => {
    const ref = implementationByRole.get(role);
    return { id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 };
  };
  const request = {
    schemaVersion: "local-run-request.slice05.v0",
    requestId: requestIdSlice05Runner({ operation, manifestContentHash: manifestRef.contentHash, sourceId: entry.sourceId, repetition, attemptNumber }),
    mode: "calibration",
    operation,
    definitionRef: await canonicalDefinitionRef(root, "definition-index.v0.5.0.json", "definitionIndexId"),
    contractRef: structuredClone(manifest.contractRefs[0]),
    manifestRef: structuredClone(manifestRef),
    manifestEntryRef: { entryIndex, sourceId: entry.sourceId, contentHash: entryHash },
    goldRecordRef: structuredClone(entry.goldRecordRef),
    runtimeAttestationRef: structuredClone(index.runtimeAttestationRef),
    adapterRef: implementationRef("candidate-adapter"),
    oracleRef: implementationRef("independent-oracle"),
    attempt: {
      runId: `run.calibration.${operation}.${index.contentHash.slice(0, 16)}`,
      sourceId: entry.sourceId,
      partition: entry.partition,
      repetition,
      attemptNumber,
      idempotencyKey,
    },
    expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
    expectedStableErrorCode: entry.expectedStableErrorCode,
    sourceIdentity: {
      sourceId: entry.sourceId,
      sourceProvenanceRef: structuredClone(entry.sourceProvenanceRef),
      rawAssetRef: structuredClone(entry.rawAsset),
      normalizedArtifactRef: entry.normalizedArtifactRef === null
        ? null
        : structuredClone(entry.normalizedArtifactRef),
    },
    createdAt,
    contentHash: "",
  };
  request.contentHash = contentHashSlice05Validation(request);
  return { request, entry };
}

async function writeSmokeRequest(root, request) {
  const keyHash = sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8"));
  const directory = path.join(root, "results", "open-smoke", "requests");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${keyHash}.request.json`), stableStringifySlice05Validation(request), "utf8");
}

function monotonicUtcClock(start) {
  let value = Date.parse(start);
  return () => new Date(value++).toISOString();
}

async function persistSmokeEvidenceRecord(resultsRoot, relativePath, record, idField) {
  const bytes = Buffer.from(stableStringifySlice05Runner(record), "utf8");
  const filename = path.join(resultsRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, bytes);
  return {
    path: relativePath,
    id: record[idField],
    contentHash: record.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: sha256Slice05Validation(bytes),
  };
}

async function buildFakeApplicableExecution({ root, resultsRoot, request, index, clock }) {
  const rawBytes = await readFile(path.join(root, ...request.sourceIdentity.rawAssetRef.path.split("/")));
  const reopenedInput = decodeIndependentPngSlice05(rawBytes);
  const outputBytes = encodeCanonicalRgbaPngSlice05(reopenedInput.width, reopenedInput.height, reopenedInput.rgba);
  const reopenedOutput = decodeIndependentPngSlice05(outputBytes);
  const outputPath = artifactRelativePathSlice05(request);
  const artifactRecordPath = artifactRecordRelativePathSlice05(request);
  const oraclePath = oracleRelativePathSlice05(request);
  const artifactId = `artifact.${request.operation}.${request.attempt.sourceId}.r${request.attempt.repetition}.a${request.attempt.attemptNumber}`;
  const image = {
    width: reopenedOutput.width,
    height: reopenedOutput.height,
    pixelLayout: reopenedOutput.pixelLayout,
    colorSpace: reopenedOutput.colorSpace,
    orientation: reopenedOutput.orientation,
    alphaMode: reopenedOutput.alphaMode,
    alphaPresent: reopenedOutput.alphaPresent,
    metadataPolicy: reopenedOutput.metadataPolicy,
    pngFilterPolicy: reopenedOutput.filter0Only ? "filter-0-only" : "noncanonical-filter-present",
    interlace: reopenedOutput.interlace,
    animation: reopenedOutput.animation,
  };
  let parent;
  let parentNormalizedImage = null;
  if (request.operation === "normalize") {
    parent = {
      sourceAssetId: request.attempt.sourceId,
      sourceFileSha256: request.sourceIdentity.rawAssetRef.fileSha256,
      sourceDecodedPixelSha256: request.sourceIdentity.rawAssetRef.sourceDeclarationDecodedPixelSha256,
      sourceManifestSha256: request.sourceIdentity.sourceProvenanceRef.contentHash,
    };
  } else {
    parentNormalizedImage = JSON.parse(await readFile(
      path.join(root, ...request.sourceIdentity.normalizedArtifactRef.path.split("/")),
      "utf8",
    ));
    parent = {
      normalizedImageId: parentNormalizedImage.artifactId,
      normalizedArtifactSha256: parentNormalizedImage.contentHash,
      normalizedFileSha256: parentNormalizedImage.bytes.fileSha256,
      normalizedDecodedPixelSha256: parentNormalizedImage.bytes.decodedPixelSha256,
    };
  }
  const artifact = {
    schemaVersion: request.operation === "normalize" ? "normalized-image.slice04.v0" : "delivery-artifact.slice04.v0",
    artifactId,
    operation: request.operation,
    parent,
    capabilityContractRef: { id: request.contractRef.id, contentHash: request.contractRef.contentHash },
    candidateRef: { id: index.candidateRef.id, contentHash: index.candidateRef.contentHash },
    adapterRef: structuredClone(request.adapterRef),
    producerRef: { kind: "candidate-adapter", ...structuredClone(request.adapterRef) },
    runtimeRef: { id: index.runtimeAttestationRef.id, contentHash: index.runtimeAttestationRef.contentHash },
    hardwareRef: { id: index.hardwareRef.id, contentHash: index.hardwareRef.contentHash },
    attempt: structuredClone(request.attempt),
    bytes: {
      relativePath: outputPath,
      mime: "image/png",
      byteLength: outputBytes.byteLength,
      fileSha256: reopenedOutput.fileSha256,
      decodedPixelSha256: reopenedOutput.decodedPixelSha256,
    },
    image,
    createdAt: clock(),
    contentHash: "",
  };
  artifact.contentHash = contentHashSlice05Runner(artifact);
  const goldRecord = JSON.parse(await readFile(path.join(root, ...request.goldRecordRef.path.split("/")), "utf8"));
  const evaluationArguments = {
    artifact,
    actualBytes: outputBytes,
    goldRecord,
    oracleImplementationSha256: request.oracleRef.implementationSha256,
    observedAt: clock(),
  };
  const oracleResult = request.operation === "normalize"
    ? evaluateNormalizedImageSlice05(evaluationArguments)
    : evaluateDeliveryArtifactSlice05({ ...evaluationArguments, parentNormalizedImage });
  const keyHash = sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8"));
  const stagingDirectory = `.staging/${keyHash}`;
  const artifactStagedPath = `${stagingDirectory}/artifact/output.png`;
  const artifactRecordStagedPath = `${stagingDirectory}/artifact-record/artifact-record.json`;
  const oracleStagedPath = `${stagingDirectory}/oracle/oracle-result.json`;
  for (const relativePath of [artifactStagedPath, artifactRecordStagedPath, oracleStagedPath]) {
    await mkdir(path.dirname(path.join(resultsRoot, ...relativePath.split("/"))), { recursive: true });
  }
  await writeFile(path.join(resultsRoot, ...artifactStagedPath.split("/")), outputBytes);
  await writeFile(path.join(resultsRoot, ...artifactRecordStagedPath.split("/")), stableStringifySlice05Runner(artifact), "utf8");
  await writeFile(path.join(resultsRoot, ...oracleStagedPath.split("/")), stableStringifySlice05Runner(oracleResult), "utf8");
  const runtimeRecord = JSON.parse(await readFile(path.join(root, ...index.runtimeAttestationRef.path.split("/")), "utf8"));
  return {
    status: "succeeded",
    artifact,
    oracleResult,
    oracleResultRelativePath: oraclePath,
    runtime: {
      sharpVersion: "0.35.3",
      nativeVersions: structuredClone(runtimeRecord.versions.sharpRuntime),
      nodeVersion: runtimeRecord.environment.node.version,
      platform: runtimeRecord.environment.os.platform,
      architecture: runtimeRecord.environment.os.architecture,
      settings: {
        concurrency: 1,
        cacheMemoryMaxMiB: 0,
        cacheFilesMax: 0,
        cacheItemsMax: 0,
        simd: false,
        uvThreadpoolSize: "1",
        vipsConcurrency: "1",
        ignoreGlobalLibvips: "1",
      },
    },
    durationMs: 5,
    resourceUsage: { maxRssKiB: 1024, userCpuMicros: 20, systemCpuMicros: 10 },
    publication: { stagingDirectory, artifactStagedPath, artifactRecordStagedPath, oracleStagedPath },
  };
}

async function buildCompleteFakeSmokeEvidence(root) {
  const index = JSON.parse(await readFile(path.join(root, "definition-index.v0.5.0.json"), "utf8"));
  const resultsRoot = path.join(root, "results", "open-smoke");
  await mkdir(resultsRoot, { recursive: true });
  const clock = monotonicUtcClock(new Date(Date.parse(index.frozenAt) + 1000).toISOString());
  const runner = createSlice05TestRunner({ resultsRoot, clock, mode: "smoke" });
  const terminalResults = [];
  const manifests = new Map();
  for (const operation of ["normalize", "export"]) {
    const manifestPath = `manifests/${operation}-smoke.v0.5.0.json`;
    const manifest = JSON.parse(await readFile(path.join(root, ...manifestPath.split("/")), "utf8"));
    const manifestRef = index.smokeManifestRefs.find((item) => item.operation === operation).ref;
    manifests.set(operation, { manifest, manifestRef });
    for (const [entryIndex, entry] of manifest.entries.entries()) {
      for (const repetition of [1, 2, 3]) {
        const request = await frozenSmokeRequest(root, { operation, entryIndex, repetition });
        const result = await runner.runAttempt(request, {
          execute: entry.expectedDisposition === "artifact-required"
            ? ({ request: active }) => buildFakeApplicableExecution({ root, resultsRoot, request: active, index, clock })
            : async () => { throw Object.assign(new Error("registered synthetic rejection"), { code: entry.expectedStableErrorCode }); },
        });
        terminalResults.push(result);
      }
    }
  }
  await rm(path.join(resultsRoot, "source-locks"), { recursive: true, force: true });
  await rm(path.join(resultsRoot, ".staging"), { recursive: true, force: true });

  const definitionRef = await canonicalDefinitionRef(root, "definition-index.v0.5.0.json", "definitionIndexId");
  const gateBPlan = JSON.parse(await readFile(path.join(root, ...index.gateBSmokePlanRef.path.split("/")), "utf8"));
  const scenarioResults = [
    { mode: "timeout-hang", status: "timeout", exitConfirmed: true },
    { mode: "cancel-hang", status: "cancelled", exitConfirmed: true },
    { mode: "exit-before-result", status: "runner-crash-before-result", exitConfirmed: true },
    { mode: "malformed-result", status: "malformed-result-rejected", exitConfirmed: null },
    { mode: "reported-reconciliation-unknown", status: "unknown-reconciliation", exitConfirmed: false },
    { mode: "atomic-commit-conflict", status: "atomic-conflict-rejected", exitConfirmed: null },
  ];
  const faultSemantics = buildSlice05FaultResult({
    definitionRef,
    runtimeAttestationRef: index.runtimeAttestationRef,
    scenarioResults,
    observedAt: clock(),
  });
  const faultSemanticsRef = await persistSmokeEvidenceRecord(
    resultsRoot,
    "fault/fault-semantics-result.slice05.v0.json",
    faultSemantics,
    "faultResultId",
  );
  for (const operation of ["normalize", "export"]) {
    const { manifest, manifestRef } = manifests.get(operation);
    const audit = buildSlice05SessionAudit({
      operation,
      definitionRef,
      gateBPlanRef: index.gateBSmokePlanRef,
      manifestRef,
      runtimeAttestationRef: index.runtimeAttestationRef,
      checks: {
        definitionIntegrity: true,
        runtimeIntegrityAtStart: true,
        runtimeIntegrityAtEnd: true,
        runtimeStableStartToEnd: true,
        implementationIntegrity: true,
        sourceIsolation: true,
        oracleIndependence: true,
        atomicCommitIntegrity: true,
      },
      issues: [],
      auditedAt: clock(),
    });
    const auditRef = await persistSmokeEvidenceRecord(
      resultsRoot,
      `audit/${operation}.smoke-session-audit.slice05.v0.json`,
      audit,
      "auditId",
    );
    const operationResults = terminalResults.filter((result) => result.operation === operation);
    const registeredCases = manifest.entries.map((entry) => ({
      sourceId: entry.sourceId,
      partition: "smoke",
      expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
      repetitions: 3,
    }));
    const summary = buildOperationSmokeSummarySlice05({
      operation,
      definitionRef,
      manifestRef,
      runtimeAttestationRef: index.runtimeAttestationRef,
      sessionAudit: audit,
      sessionAuditRef: auditRef,
      faultSemantics,
      faultSemanticsRef,
      registeredCases,
      terminalResults,
      startedAt: operationResults.map(({ startedAt }) => startedAt).sort()[0],
      finishedAt: operationResults.map(({ finishedAt }) => finishedAt).sort().at(-1),
    });
    const summaryRef = await persistSmokeEvidenceRecord(
      resultsRoot,
      `summaries/${operation}.smoke-summary.slice05.v0.json`,
      summary,
      "summaryId",
    );
    const decision = buildGateBDecisionSlice05({
      summary,
      summaryRef,
      gateBPlan,
      gateBPlanRef: index.gateBSmokePlanRef,
      sessionAudit: audit,
      faultSemantics,
      decidedAt: clock(),
    });
    await persistSmokeEvidenceRecord(
      resultsRoot,
      `decisions/${operation}.gate-b-decision.slice05.v0.json`,
      decision,
      "decisionId",
    );
  }
  return { resultsRoot, terminalResults };
}

async function buildCompleteFakeCalibrationEvidence(root, operation = "normalize") {
  const index = JSON.parse(await readFile(path.join(root, "definition-index.v0.5.0.json"), "utf8"));
  const definitionRef = await canonicalDefinitionRef(root, "definition-index.v0.5.0.json", "definitionIndexId");
  const smokeResultsRoot = path.join(root, "results", "open-smoke");
  const decisionPath = `decisions/${operation}.gate-b-decision.slice05.v0.json`;
  const decisionBytes = await readFile(path.join(smokeResultsRoot, ...decisionPath.split("/")));
  const gateBDecision = JSON.parse(decisionBytes.toString("utf8"));
  const gateBDecisionRef = {
    path: decisionPath,
    id: gateBDecision.decisionId,
    contentHash: gateBDecision.contentHash,
    byteLength: decisionBytes.byteLength,
    fileSha256: sha256Slice05Validation(decisionBytes),
  };
  const preregistrationRef = index.calibrationPreregistrationRefs.find(({ path: relativePath }) => relativePath.includes(`calibration-${operation}-png`));
  const preregistration = JSON.parse(await readFile(path.join(root, ...preregistrationRef.path.split("/")), "utf8"));
  const manifestRefs = index.calibrationManifestRefs
    .filter(({ path: relativePath }) => relativePath.startsWith(`manifests/${operation}-`))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const manifests = await Promise.all(manifestRefs.map(async (ref) => JSON.parse(await readFile(path.join(root, ...ref.path.split("/")), "utf8"))));
  const frozenRuntimeAttestation = JSON.parse(await readFile(path.join(root, ...index.runtimeAttestationRef.path.split("/")), "utf8"));
  const runtimeInventory = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  const clock = monotonicUtcClock(new Date(Date.parse(gateBDecision.decidedAt) + 1000).toISOString());
  const runtimeStartObservation = buildRuntimeInventoryObservationSlice05({
    inventory: runtimeInventory,
    frozenRuntimeAttestation,
    expectedInventoryPayloadSha256: index.runtimeAttestationRef.inventoryPayloadSha256,
    observedAt: clock(),
  });
  const admittedAt = clock();
  const admission = buildCalibrationAdmissionSlice05({
    operation,
    definitionRef,
    gateBPlanRef: index.gateBSmokePlanRef,
    gateBDecision,
    gateBDecisionRef,
    calibrationPreregistration: preregistration,
    calibrationPreregistrationRef: preregistrationRef,
    manifests,
    manifestRefs,
    runtimeStartObservation,
    admittedAt,
  });
  const resultsRoot = path.join(root, "results", "open-calibration", operation);
  const admissionRef = await persistSmokeEvidenceRecord(
    resultsRoot,
    "admission/calibration-admission.slice05.v0.json",
    admission,
    "admissionId",
  );
  const runner = createSlice05TestRunner({ resultsRoot, clock, mode: "calibration" });
  const terminalResults = [];
  const registeredCases = [];
  for (const [manifestPosition, manifest] of manifests.entries()) {
    const manifestRef = manifestRefs[manifestPosition];
    for (const [entryIndex, entry] of manifest.entries.entries()) {
      registeredCases.push({
        sourceId: entry.sourceId,
        partition: entry.partition,
        expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
        repetitions: entry.repetitions,
        manifestContentHash: manifestRef.contentHash,
      });
      for (const repetition of [1, 2, 3]) {
        const { request } = await frozenCalibrationRequest(root, {
          operation,
          manifestRef,
          entryIndex,
          repetition,
          createdAt: clock(),
        });
        const result = await runner.runAttempt(request, {
          execute: entry.expectedDisposition === "artifact-required"
            ? ({ request: active }) => buildFakeApplicableExecution({ root, resultsRoot, request: active, index, clock })
            : async () => { throw Object.assign(new Error("registered synthetic calibration rejection"), { code: entry.expectedStableErrorCode }); },
        });
        terminalResults.push(result);
      }
    }
  }
  await rm(path.join(resultsRoot, "source-locks"), { recursive: true, force: true });
  await rm(path.join(resultsRoot, ".staging"), { recursive: true, force: true });
  const runtimeEndObservation = buildRuntimeInventoryObservationSlice05({
    inventory: runtimeInventory,
    frozenRuntimeAttestation,
    expectedInventoryPayloadSha256: index.runtimeAttestationRef.inventoryPayloadSha256,
    observedAt: clock(),
  });
  const summary = buildCalibrationSummarySlice05({
    operation,
    definitionRef,
    gateBDecision,
    gateBDecisionRef,
    admission,
    admissionRef,
    manifestRefs,
    registeredCases,
    terminalResults,
    runtimeAttestationRef: index.runtimeAttestationRef,
    runtimeStartObservation,
    runtimeEndObservation,
    outputClosurePass: true,
    startedAt: terminalResults.map(({ startedAt }) => startedAt).sort()[0],
    finishedAt: terminalResults.map(({ finishedAt }) => finishedAt).sort().at(-1),
  });
  await persistSmokeEvidenceRecord(
    resultsRoot,
    "summaries/calibration-summary.slice05.v0.json",
    summary,
    "summaryId",
  );
  return { resultsRoot, terminalResults, runtimeInventory, admission, summary };
}

async function definitionIssueCodes(root, projectRoot = PROJECT_ROOT) {
  const report = await validateSlice05Definition({
    sliceRoot: root,
    projectRoot,
    requirePins: false,
    recheckRuntime: false,
    regenerate: false,
  });
  assert.equal(report.valid, false, "adversarial definition unexpectedly passed");
  return new Set(report.issues.map(({ code }) => code));
}

test("full definition validator rejects the frozen adversarial matrix", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  await t.test("extra file of an arbitrary extension", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await writeFile(path.join(root, "extra.unregistered"), "not allowed\n", "utf8");
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("DEFINITION_FILE_ALLOWLIST_MISMATCH"));
  });

  await t.test("registered post-run root is excluded from definition pins but remains strictly validated", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const resultsRoot = path.join(root, "results", "open-smoke");
    await mkdir(resultsRoot, { recursive: true });
    await writeFile(path.join(resultsRoot, "rogue.png"), Buffer.from("89504e470d0a1a0a", "hex"));
    const report = await validateSlice05Definition({
      sliceRoot: root,
      projectRoot: PROJECT_ROOT,
      requirePins: false,
      recheckRuntime: false,
      regenerate: false,
    });
    const codes = new Set(report.issues.map(({ code }) => code));
    assert.equal(codes.has("DEFINITION_FILE_ALLOWLIST_MISMATCH"), false);
    assert.ok(codes.has("UNREGISTERED_CANDIDATE_PNG"));
  });

  await t.test("unregistered formal result subtree never receives the post-run exclusion", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const resultsRoot = path.join(root, "results", "formal-holdout");
    await mkdir(resultsRoot, { recursive: true });
    await writeFile(path.join(resultsRoot, "rogue.json"), "{}\n", "utf8");
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("DEFINITION_FILE_ALLOWLIST_MISMATCH"));
    assert.ok(codes.has("POST_RUN_RESULT_PATH_FORBIDDEN"));
  });

  await t.test("empty results parent is rejected instead of disappearing from the definition digest", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await mkdir(path.join(root, "results"));
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("EMPTY_RESULTS_ROOT_FORBIDDEN"));
  });

  await t.test("self-registered arbitrary fixture extension remains outside the semantic allowlist", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const relativePath = "assets/open/rogue.unregistered";
    const bytes = Buffer.from("not a registered fixture\n", "utf8");
    await writeFile(path.join(root, ...relativePath.split("/")), bytes);
    const indexPath = path.join(root, "definition-index.v0.5.0.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));
    index.machineTree.files.push({
      path: relativePath,
      classification: "open-asset",
      byteLength: bytes.byteLength,
      fileSha256: sha256Slice05Validation(bytes),
    });
    index.machineTree.files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    index.machineTree.fileCount = index.machineTree.files.length;
    index.machineTree.sha256 = digestSlice05FileRecords(index.machineTree.files.map(({ path: itemPath, byteLength, fileSha256 }) => ({
      path: itemPath,
      byteLength,
      sha256: fileSha256,
    })));
    index.contentHash = contentHashSlice05Validation(index);
    await writeFile(indexPath, stableStringifySlice05Validation(index), "utf8");
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("FIXTURE_FILE_PATH_SET_INVALID"));
  });

  await t.test("README-only secret and PNG payload tamper", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const filename = path.join(root, "README.md");
    const original = await readFile(filename);
    await writeFile(filename, Buffer.concat([
      original,
      Buffer.from("\n-----BEGIN PRIVATE KEY-----\n", "utf8"),
      Buffer.from("89504e470d0a1a0a", "hex"),
    ]));
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("README_EMBEDDED_MATERIAL_FORBIDDEN"));
    assert.ok(codes.has("README_REF_INVALID"));
  });

  await t.test("self-rehashed gold candidate taint", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const goldPath = (await (async () => {
      const manifest = JSON.parse(await readFile(path.join(root, "manifests", "normalize-smoke.v0.5.0.json"), "utf8"));
      return manifest.entries.find(({ goldRecordRef }) => goldRecordRef !== null).goldRecordRef.path;
    })());
    await mutateContentHashedRecord(root, goldPath, (gold) => { gold.provenance.candidateOutputUsed = true; });
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("FIXTURE_OR_GOLD_CANDIDATE_TAINTED"));
    assert.ok(codes.has("GOLD_RECORD_CROSSLINK_INVALID") || codes.has("RECORD_REFERENCE_CONTENT_HASH_MISMATCH"));
  });

  await t.test("candidate and contract reference drift", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await mutateContentHashedRecord(root, "contracts/cc-cap02-normalize-png.v0.5.0.json", (contract) => {
      contract.candidateRef.id = "REG-NORM-SHARP@0.5.0-drift";
    });
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("CONTRACT_IDENTITY_INVALID"));
    assert.ok(codes.has("HASH_REFERENCE_INVALID") || codes.has("RECORD_REFERENCE_ID_MISMATCH"));
  });

  await t.test("manifest denominator and cross-operation family leak", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await mutateContentHashedRecord(root, "manifests/export-smoke.v0.5.0.json", (manifest) => {
      manifest.counts.totalSources = 5;
      manifest.entries[0].sourceFamilyId = "family.s05.normalize.smoke.001";
    });
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("MANIFEST_COUNTS_INVALID"));
    assert.ok(codes.has("SOURCE_FAMILY_REUSED"));
  });

  await t.test("runtime request cannot cross-use another operation manifest", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const request = await frozenSmokeRequest(root, { operation: "normalize" });
    const index = JSON.parse(await readFile(path.join(root, "definition-index.v0.5.0.json"), "utf8"));
    const exportManifestRef = index.smokeManifestRefs.find(({ operation }) => operation === "export").ref;
    request.manifestRef = structuredClone(exportManifestRef);
    request.requestId = requestIdSlice05Runner({
      operation: request.operation,
      manifestContentHash: exportManifestRef.contentHash,
      sourceId: request.attempt.sourceId,
      repetition: request.attempt.repetition,
      attemptNumber: request.attempt.attemptNumber,
    });
    request.attempt.idempotencyKey = `s05.smoke.${request.operation}.${exportManifestRef.contentHash.slice(0, 12)}.${request.manifestEntryRef.contentHash.slice(0, 12)}.r1.a1`;
    request.contentHash = contentHashSlice05Validation(request);
    await writeSmokeRequest(root, request);
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("RUN_REQUEST_MANIFEST_ENTRY_INVALID"), JSON.stringify([...codes].sort()));
    assert.ok(codes.has("SMOKE_SOURCE_OPERATION_LEAK"), JSON.stringify([...codes].sort()));
  });

  await t.test("attempt two cannot erase its missing immutable no-result predecessor", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const replacement = await frozenSmokeRequest(root, { attemptNumber: 2 });
    await writeSmokeRequest(root, replacement);
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("RUN_REPLACEMENT_NOT_AUTHORIZED"), JSON.stringify([...codes].sort()));
    assert.ok(codes.has("SMOKE_DENOMINATOR_SLOT_INVALID"), JSON.stringify([...codes].sort()));
  });

  await t.test("format profile expansion", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await mutateContentHashedRecord(root, "contracts/cc-cap02-export-png.v0.5.0.json", (contract) => {
      contract.outputProfile.maxWidth = 257;
    });
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("CONTRACT_OUTPUT_PROFILE_EXPANDED"));
  });

  await t.test("formal and C1 support promotion", async (st) => {
    const root = await copiedFrozenDefinition(st);
    await mutateContentHashedRecord(root, "manifests/normalize-smoke.v0.5.0.json", (manifest) => {
      manifest.formalBoundary.formal = true;
      manifest.formalBoundary.c1Eligible = true;
      manifest.evidenceBoundary.c1 = 1;
      manifest.evidenceBoundary.productSupport = true;
    });
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("EVIDENCE_AXIS_UPGRADED"));
    assert.ok(codes.has("DEFINITION_BOUNDARY_UPGRADED"));
    assert.ok(codes.has("MANIFEST_FORMAL_BOUNDARY_INVALID"));
  });

  await t.test("unknown schema keyword", async (st) => {
    const root = await copiedFrozenDefinition(st);
    const schemaPath = path.join(root, "schemas", "candidate-lock.slice05.v0.schema.json");
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    schema.properties.candidateKind.default = "silently-accepted";
    await writeFile(schemaPath, stableStringifySlice05Validation(schema), "utf8");
    const codes = await definitionIssueCodes(root);
    assert.ok(codes.has("SCHEMA_KEYWORD_UNSUPPORTED"));
  });

  await t.test("actual candidate adapter and independent oracle source drift", async (st) => {
    const wrapper = await temporaryDirectory(st, "single-image-studio-s05-source-drift-");
    const projectRoot = path.join(wrapper, "project");
    await mkdir(path.join(projectRoot, "research"), { recursive: true });
    await cp(path.join(PROJECT_ROOT, "scripts"), path.join(projectRoot, "scripts"), { recursive: true });
    await cp(path.join(PROJECT_ROOT, "research", "slice-04"), path.join(projectRoot, "research", "slice-04"), { recursive: true });
    const root = path.join(projectRoot, "research", "slice-05");
    await cp(CANONICAL_SLICE_ROOT, root, { recursive: true });
    const oraclePath = path.join(projectRoot, "scripts", "research-independent-png-oracle-slice05.mjs");
    await writeFile(oraclePath, Buffer.concat([await readFile(oraclePath), Buffer.from("\n// adversarial source drift\n", "utf8")]));
    const adapterPath = path.join(projectRoot, "scripts", "research-sharp-adapter-slice05.mjs");
    await writeFile(adapterPath, Buffer.concat([await readFile(adapterPath), Buffer.from("\n// adversarial source drift\n", "utf8")]));
    const report = await validateSlice05Definition({
      sliceRoot: root,
      projectRoot,
      requirePins: false,
      recheckRuntime: false,
      regenerate: false,
    });
    assert.equal(report.valid, false);
    const driftLocations = report.issues
      .filter(({ code }) => code === "IMPLEMENTATION_HASH_MISMATCH")
      .map(({ location }) => location);
    assert.ok(driftLocations.length >= 2, JSON.stringify(driftLocations));
  });
});

test("closed-smoke validator accepts a complete independent fake evidence closure", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  const root = await copiedFrozenDefinition(t, "single-image-studio-s05-complete-smoke-");
  const built = await buildCompleteFakeSmokeEvidence(root);
  assert.equal(built.terminalResults.filter(({ status, expectedDisposition }) => status === "pass" && expectedDisposition === "applicable").length, 18,
    JSON.stringify(built.terminalResults.map(({ operation, expectedDisposition, status, reasonCode }) => ({ operation, expectedDisposition, status, reasonCode }))));
  const report = await validateSlice05Definition({
    sliceRoot: root,
    projectRoot: PROJECT_ROOT,
    requirePins: false,
    recheckRuntime: false,
    regenerate: false,
  });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.equal(report.postRun.smoke.valid, true);
  assert.equal(report.postRun.smoke.requestCount, 36);
  assert.equal(report.postRun.smoke.resultCount, 36);
  assert.equal(report.postRun.smoke.artifactCount, 18);
});

test("closed-smoke validator rejects durable result-evidence tampering", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  const base = await copiedFrozenDefinition(t, "single-image-studio-s05-complete-smoke-base-");
  await buildCompleteFakeSmokeEvidence(base);
  const baseline = await validateSlice05Definition({
    sliceRoot: base,
    projectRoot: PROJECT_ROOT,
    requirePins: false,
    recheckRuntime: false,
    regenerate: false,
  });
  assert.deepEqual(baseline.issues, []);

  async function resultIssueCodes(st, mutate) {
    const root = await copiedDefinitionFrom(st, base);
    await mutate(root);
    const report = await validateSlice05Definition({
      sliceRoot: root,
      projectRoot: PROJECT_ROOT,
      requirePins: false,
      recheckRuntime: false,
      regenerate: false,
    });
    assert.equal(report.valid, false, "tampered result evidence unexpectedly passed");
    return new Set(report.issues.map(({ code }) => code));
  }

  await t.test("candidate PNG is independently reopened instead of trusting its result record", async (st) => {
    const codes = await resultIssueCodes(st, async (root) => {
      const resultsRoot = path.join(root, "results", "open-smoke");
      const tree = await listSlice05Tree(resultsRoot);
      const relativePath = tree.files.find((entry) => entry.endsWith("/output.png"));
      const filename = path.join(resultsRoot, ...relativePath.split("/"));
      const bytes = Buffer.from(await readFile(filename));
      bytes[bytes.length - 1] ^= 1;
      await writeFile(filename, bytes);
    });
    assert.ok(codes.has("RUN_ARTIFACT_FILE_IDENTITY_INVALID"));
    assert.ok(codes.has("RUN_PUBLICATION_FILE_IDENTITY_INVALID"));
  });

  await t.test("fault record cannot self-certify a rewritten expected status", async (st) => {
    const codes = await resultIssueCodes(st, async (root) => {
      await mutateContentHashedRecord(root, "results/open-smoke/fault/fault-semantics-result.slice05.v0.json", (fault) => {
        fault.scenarios[0].expectedStatus = "forged-timeout-status";
        fault.scenarios[0].actualStatus = "forged-timeout-status";
        fault.scenarios[0].pass = true;
        fault.allPass = fault.scenarios.every(({ pass }) => pass);
      });
    });
    assert.ok(codes.has("SMOKE_FAULT_RESULT_RECOMPUTATION_MISMATCH"));
  });

  await t.test("wall-clock timeout cannot be hidden behind a short self-reported duration", async (st) => {
    const codes = await resultIssueCodes(st, async (root) => {
      const recordsRoot = path.join(root, "results", "open-smoke", "records");
      const relativePath = (await listSlice05Tree(recordsRoot)).files.find((entry) => entry.endsWith(".result.json"));
      const filename = path.join(recordsRoot, ...relativePath.split("/"));
      const result = JSON.parse(await readFile(filename, "utf8"));
      result.finishedAt = new Date(Date.parse(result.startedAt) + 120_000).toISOString();
      result.contentHash = contentHashSlice05Validation(result);
      await writeFile(filename, stableStringifySlice05Validation(result), "utf8");
    });
    assert.ok(codes.has("RUN_RESULT_RESOURCE_BOUNDARY_EXCEEDED"));
  });

  await t.test("embedded worker runtime cannot drift from the frozen 29-entry inventory", async (st) => {
    const codes = await resultIssueCodes(st, async (root) => {
      const recordsRoot = path.join(root, "results", "open-smoke", "records");
      const tree = await listSlice05Tree(recordsRoot);
      for (const relativePath of tree.files) {
        const filename = path.join(recordsRoot, ...relativePath.split("/"));
        const result = JSON.parse(await readFile(filename, "utf8"));
        if (result.workerRuntime === null) continue;
        result.workerRuntime.payload.nativeVersions.png = "forged-runtime-version";
        result.workerRuntime.payloadSha256 = sha256Slice05Validation(Buffer.from(stableStringifySlice05Runner(result.workerRuntime.payload), "utf8"));
        result.contentHash = contentHashSlice05Validation(result);
        await writeFile(filename, stableStringifySlice05Validation(result), "utf8");
        break;
      }
    });
    assert.ok(codes.has("RUN_WORKER_RUNTIME_CROSSLINK_INVALID"));
  });

  await t.test("artifact/oracle publication closure cannot retain a dangling oracle reference", async (st) => {
    const codes = await resultIssueCodes(st, async (root) => {
      const oracleRoot = path.join(root, "results", "open-smoke", "oracle");
      const relativePath = (await listSlice05Tree(oracleRoot)).files.find((entry) => entry.endsWith("oracle-result.json"));
      await rm(path.join(oracleRoot, ...relativePath.split("/")));
    });
    assert.ok(codes.has("RUN_PUBLICATION_FILE_IDENTITY_INVALID"));
    assert.ok(codes.has("RUN_ORACLE_RESULT_INVALID"));
  });
});

test("operation-specific open calibration accepts a complete 48x3 independent fake closure", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  const root = await copiedFrozenDefinition(t, "single-image-studio-s05-complete-calibration-");
  await buildCompleteFakeSmokeEvidence(root);
  const calibration = await buildCompleteFakeCalibrationEvidence(root, "normalize");
  assert.equal(calibration.terminalResults.length, 144);
  assert.equal(calibration.terminalResults.filter(({ status, expectedDisposition }) => status === "pass" && expectedDisposition === "applicable").length, 72);
  assert.equal(calibration.summary.overallStatus, "all-pass");
  const report = await validateSlice05Definition({
    sliceRoot: root,
    projectRoot: PROJECT_ROOT,
    requirePins: false,
    recheckRuntime: false,
    regenerate: false,
    runtimeInventory: calibration.runtimeInventory,
  });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.equal(report.postRun.calibrations.length, 1);
  assert.equal(report.postRun.calibrations[0].operation, "normalize");
  assert.equal(report.postRun.calibrations[0].requestCount, 144);
  assert.equal(report.postRun.calibrations[0].resultCount, 144);
});

test("open-calibration validator rejects denominator, inventory, operation, and quiescence drift", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  const base = await copiedFrozenDefinition(t, "single-image-studio-s05-calibration-adversarial-base-");
  await buildCompleteFakeSmokeEvidence(base);
  const calibration = await buildCompleteFakeCalibrationEvidence(base, "normalize");
  const baseline = await validateSlice05Definition({
    sliceRoot: base,
    projectRoot: PROJECT_ROOT,
    requirePins: false,
    recheckRuntime: false,
    regenerate: false,
    runtimeInventory: calibration.runtimeInventory,
  });
  assert.deepEqual(baseline.issues, []);

  async function calibrationIssueCodes(st, mutate) {
    const root = await copiedDefinitionFrom(st, base, "single-image-studio-s05-calibration-mutation-");
    await mutate(root);
    const report = await validateSlice05Definition({
      sliceRoot: root,
      projectRoot: PROJECT_ROOT,
      requirePins: false,
      recheckRuntime: false,
      regenerate: false,
      runtimeInventory: calibration.runtimeInventory,
    });
    assert.equal(report.valid, false, "tampered calibration evidence unexpectedly passed");
    return new Set(report.issues.map(({ code }) => code));
  }

  await t.test("one missing raw terminal record cannot silently shrink the 48x3 denominator", async (st) => {
    const codes = await calibrationIssueCodes(st, async (root) => {
      const recordsRoot = path.join(root, "results", "open-calibration", "normalize", "records");
      const relativePath = (await listSlice05Tree(recordsRoot)).files.find((entry) => entry.endsWith(".result.json"));
      await rm(path.join(recordsRoot, ...relativePath.split("/")));
    });
    assert.ok(codes.has("CALIBRATION_REQUEST_NOT_TERMINAL"));
    assert.ok(codes.has("CALIBRATION_SUMMARY_RECOMPUTATION_MISMATCH") || codes.has("CALIBRATION_SUMMARY_RECOMPUTATION_FAILED"));
  });

  await t.test("summary cannot rewrite an effective raw-result identity", async (st) => {
    const codes = await calibrationIssueCodes(st, async (root) => {
      await mutateContentHashedRecord(root, "results/open-calibration/normalize/summaries/calibration-summary.slice05.v0.json", (summary) => {
        summary.caseResults[0].effectiveResultRefs[0].contentHash = "0".repeat(64);
      });
    });
    assert.ok(codes.has("CALIBRATION_SUMMARY_RECOMPUTATION_MISMATCH"));
  });

  await t.test("durable end inventory cannot self-report a frozen match after drift", async (st) => {
    const codes = await calibrationIssueCodes(st, async (root) => {
      await mutateContentHashedRecord(root, "results/open-calibration/normalize/summaries/calibration-summary.slice05.v0.json", (summary) => {
        summary.runtimeEndObservation.matchesFrozen = false;
      });
    });
    assert.ok(codes.has("CALIBRATION_RUNTIME_OBSERVATION_INVALID"));
  });

  await t.test("normalize evidence cannot be replayed under the export calibration root", async (st) => {
    const codes = await calibrationIssueCodes(st, async (root) => {
      const source = path.join(root, "results", "open-calibration", "normalize");
      const target = path.join(root, "results", "open-calibration", "export");
      await cp(source, target, { recursive: true, force: false, errorOnExist: true });
    });
    assert.ok(codes.has("CALIBRATION_UNREGISTERED_SOURCE") || codes.has("CALIBRATION_CLAIM_BINDING_INVALID"), JSON.stringify([...codes].sort()));
    assert.ok(codes.has("CALIBRATION_ADMISSION_RECOMPUTATION_FAILED") || codes.has("CALIBRATION_ADMISSION_RECOMPUTATION_MISMATCH"), JSON.stringify([...codes].sort()));
  });

  await t.test("quiescent calibration evidence cannot retain an empty staging directory", async (st) => {
    const codes = await calibrationIssueCodes(st, async (root) => {
      await mkdir(path.join(root, "results", "open-calibration", "normalize", ".staging"));
    });
    assert.ok(codes.has("CALIBRATION_RESULT_DIRECTORY_ALLOWLIST_MISMATCH"));
  });
});

test("frozen Slice 05 definition passes literal pins, fresh inventory, and two-temp regeneration", { skip: !HAS_FROZEN_DEFINITION }, async () => {
  const report = await validateSlice05Definition({
    sliceRoot: CANONICAL_SLICE_ROOT,
    requirePins: !process.env.SLICE05_TEST_DEFINITION_ROOT,
  });
  assert.deepEqual(report.issues, []);
  assert.equal(report.valid, true);
  assert.equal(report.counts.manifests, 6);
  assert.equal(report.counts.sourceProvenanceRecords, 108);
  assert.equal(report.counts.formalFixtures, 0);
  assert.equal(report.counts.generatedResults, 0);
});

test("closed-smoke validator rejects an unregistered candidate PNG bypass", { skip: !HAS_FROZEN_DEFINITION }, async (t) => {
  const resultsRoot = await temporaryDirectory(t, "single-image-studio-s05-rogue-output-");
  await writeFile(path.join(resultsRoot, "unregistered.png"), Buffer.from("89504e470d0a1a0a", "hex"));
  const report = await validateSlice05OptionalClosedSmokeResults({
    sliceRoot: CANONICAL_SLICE_ROOT,
    resultsRoot,
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === "UNREGISTERED_CANDIDATE_PNG"));
});
