import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { encodeCanonicalRgbaPngSlice05 } from "../scripts/research-generate-slice05.mjs";
import { evaluateNormalizedImageSlice05 } from "../scripts/research-independent-png-oracle-slice05.mjs";
import { canonicalJsonSlice05 } from "../scripts/research-inventory-sharp-slice05.mjs";

import {
  SLICE05_RUNNER_RECORD_SCHEMAS,
  SLICE05_RUNNER_SCHEMA_PATHS,
  Slice05NoResultError,
  assertCalibrationGateDecisionSlice05,
  artifactRecordRelativePathSlice05,
  artifactRelativePathSlice05,
  atomicCommitSlice05TestOutput,
  buildRuntimeInventoryObservationSlice05,
  buildCalibrationSummarySlice05,
  buildGateBDecisionSlice05,
  buildOperationSmokeSummarySlice05,
  buildSlice05FaultResult,
  buildSlice05SessionAudit,
  contentHashSlice05Runner,
  createSlice05TestRunner,
  executeRegisteredCasesSlice05,
  requestIdSlice05Runner,
  oracleRelativePathSlice05,
  stableStringifySlice05Runner,
  validateManifestEntryMaterialBindingSlice05,
  validateGateBDecisionSlice05,
  verifySlice05DefinitionTreeForTest,
  verifyTerminalOutputClosureSlice05ForTest,
} from "../scripts/research-run-slice05.mjs";

const ZERO = "0".repeat(64);
const ONE = "1".repeat(64);
const TWO = "2".repeat(64);

function recordRef(pathname, id, contentHash = ZERO) {
  return { path: pathname, id, contentHash, byteLength: 123, fileSha256: ONE };
}

function runtimeRef() {
  return { ...recordRef("runtime/attestation.json", "RUNTIME-SHARP-WIN32-X64@0.5.0"), inventoryPayloadSha256: TWO };
}

function implementationRef(id, hash) {
  return { id, version: "0.5.0", implementationSha256: hash };
}

function makeClock(start = Date.parse("2026-08-15T00:00:00.001Z")) {
  let value = start;
  return () => new Date(value++).toISOString();
}

function finalize(record) {
  return { ...record, contentHash: contentHashSlice05Runner(record) };
}

function makeRequest({
  sourceId = "source.runner.fake",
  repetition = 1,
  attemptNumber = 1,
  idempotencyKey = `idem.${sourceId}.r${repetition}.a${attemptNumber}`,
  expectedDisposition = "applicable",
  operation = "normalize",
  mode = "smoke",
  partition = mode === "smoke" ? "smoke" : "dev/calibration",
  mutate = undefined,
} = {}) {
  const manifestRef = recordRef(`manifests/${operation}-${partition.replace("/", "-")}.json`, `manifest.${operation}.${partition}`);
  const request = {
    schemaVersion: "local-run-request.slice05.v0",
    requestId: requestIdSlice05Runner({ operation, manifestContentHash: manifestRef.contentHash, sourceId, repetition, attemptNumber }),
    mode,
    operation,
    definitionRef: recordRef("definition-index.v0.5.0.json", "DEFINITION-INDEX-SLICE05@0.5.0"),
    contractRef: recordRef(`contracts/${operation}.json`, `contract.${operation}`),
    manifestRef,
    manifestEntryRef: { entryIndex: 0, sourceId, contentHash: TWO },
    goldRecordRef: expectedDisposition === "applicable" ? recordRef(`gold/${sourceId}.json`, `gold.${sourceId}`) : null,
    runtimeAttestationRef: runtimeRef(),
    adapterRef: implementationRef("ADAPTER-SHARP-NORMALIZE-EXPORT@0.5.0", ONE),
    oracleRef: implementationRef("ORACLE-INDEPENDENT-PNG@0.5.0", TWO),
    attempt: { runId: `run.${mode}.fake`, sourceId, partition, repetition, attemptNumber, idempotencyKey },
    expectedDisposition,
    expectedStableErrorCode: expectedDisposition === "applicable" ? null : "S05_INPUT_CRC_MISMATCH",
    sourceIdentity: {
      sourceId,
      sourceProvenanceRef: recordRef(`sources/${sourceId}.json`, `provenance.${sourceId}`),
      rawAssetRef: {
        path: `assets/open/${sourceId}.png`, mime: "image/png", byteLength: 64, fileSha256: ZERO,
        decodedPixelSha256: expectedDisposition === "applicable" ? ONE : null,
        sourceDeclarationDecodedPixelSha256: ONE,
      },
      normalizedArtifactRef: operation === "export"
        ? { ...recordRef(`artifacts/normalized-inputs/${sourceId}.json`, sourceId), producerKind: "independent-fixture-generator" }
        : null,
    },
    createdAt: "2026-08-15T00:00:00.000Z",
    contentHash: "",
  };
  mutate?.(request);
  request.contentHash = contentHashSlice05Runner(request);
  return request;
}

function fakeSuccess(request, { fileSha256 = ONE, decodedPixelSha256 = TWO } = {}) {
  const artifact = {
    schemaVersion: request.operation === "normalize" ? "normalized-image.slice04.v0" : "delivery-artifact.slice04.v0",
    artifactId: `artifact.${request.attempt.sourceId}.r${request.attempt.repetition}`,
    contentHash: ZERO,
    bytes: {
      relativePath: artifactRelativePathSlice05(request),
      byteLength: 80,
      fileSha256,
      decodedPixelSha256,
    },
  };
  const oracleResult = finalize({
    oracleResultId: `oracle.${artifact.artifactId}`,
    overallStatus: "pass",
  });
  return {
    status: "succeeded",
    artifact,
    oracleResult,
    oracleResultRelativePath: oracleRelativePathSlice05(request),
    runtime: fakeWorkerRuntime(),
    durationMs: 5,
    resourceUsage: { maxRssKiB: 1024, userCpuMicros: 20, systemCpuMicros: 10 },
  };
}

function fakeWorkerRuntime() {
  const keys = [
    "aom", "archive", "cairo", "cgif", "exif", "expat", "ffi", "fontconfig", "freetype", "fribidi",
    "glib", "harfbuzz", "heif", "highway", "imagequant", "lcms", "mozjpeg", "pango", "pixman", "png",
    "proxy-libintl", "rsvg", "sharp", "tiff", "uhdr", "vips", "webp", "xml2", "zlib-ng",
  ];
  const nativeVersions = Object.fromEntries(keys.map((key, index) => [key, key === "sharp" ? "0.35.3" : `v${index + 1}`]));
  return {
    sharpVersion: "0.35.3", nativeVersions, nodeVersion: "v22.15.0", platform: "win32", architecture: "x64",
    settings: {
      concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false,
      uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
    },
  };
}

function fakeRuntimeInventoryEvidence(observedAt = "2026-08-15T00:00:03.500Z") {
  const payload = {
    schemaVersion: "runtime-inventory.slice05.v0",
    inventoryKind: "read-only-runtime-inventory-no-image-processing",
    sourceCandidateMetadataRef: "REG-NORM-SHARP@0.4.0",
    runtimeCandidateId: "REG-NORM-SHARP@0.5.0",
    gateBState: "not-evaluated-by-inventory",
    productSupport: false,
    evidenceBoundary: {},
    packageManifest: { path: "package.json", sha256: ZERO, devDependencies: { sharp: "0.35.3" } },
    packageLock: { path: "package-lock.json", sha256: ONE, expectedSha256: ONE, lockfileVersion: 3, pins: [] },
    installed: {
      allowlist: ["sharp"], packages: [], ignoredEmptyScopeDirectories: [],
      tree: { fileCount: 1, sha256: TWO }, nativeArtifacts: [],
    },
    versions: {
      installedVersionsJson: { sha256: ZERO, values: { sharp: "0.35.3" } },
      sharpRuntime: { values: { sharp: "0.35.3" } },
      slice04PackagingMetadataComparison: { differences: [] },
    },
    environment: { node: { version: "v22.15.0" }, os: { platform: "win32", architecture: "x64" } },
    privacyBoundary: {},
    executionBoundary: {},
  };
  const inventoryPayloadSha256 = createHash("sha256").update(canonicalJsonSlice05(payload), "utf8").digest("hex");
  const inventory = {
    ...payload,
    attestation: {
      canonicalization: "recursive-lexicographic-object-keys-preserve-array-order-utf8-json",
      payloadSha256: inventoryPayloadSha256,
    },
  };
  const frozenRuntimeAttestation = {
    packageManifest: { path: "package.json", sha256: ZERO, exactDevDependencies: { sharp: "0.35.3" } },
    packageLock: payload.packageLock,
    installedClosure: {
      allowlist: ["sharp"], packages: [], ignoredEmptyScopeDirectories: [], fileCount: 1, treeSha256: TWO, nativeArtifacts: [],
    },
    versions: {
      installedVersionsJsonSha256: ZERO, installed: { sharp: "0.35.3" }, sharpRuntime: { sharp: "0.35.3" },
      slice04PackagingMetadataErratum: [],
    },
    environment: payload.environment,
  };
  const observation = buildRuntimeInventoryObservationSlice05({
    inventory,
    frozenRuntimeAttestation,
    expectedInventoryPayloadSha256: inventoryPayloadSha256,
    observedAt,
  });
  return {
    observation,
    inventory,
    frozenRuntimeAttestation,
    runtimeAttestationRef: { ...runtimeRef(), inventoryPayloadSha256 },
  };
}

async function fakeStagedSuccess(root, request) {
  const rgba = Buffer.from([17, 33, 65, 255]);
  const artifactBytes = encodeCanonicalRgbaPngSlice05(1, 1, rgba);
  const artifactHash = createHash("sha256").update(artifactBytes).digest("hex");
  const decodedPixelSha256 = createHash("sha256").update(rgba).digest("hex");
  const execution = fakeSuccess(request, { fileSha256: artifactHash });
  const adapterRef = { id: "ADAPTER-SHARP-NORMALIZE-EXPORT@0.5.0", version: "0.5.0", implementationSha256: ONE };
  execution.artifact = finalize({
    schemaVersion: "normalized-image.slice04.v0",
    artifactId: execution.artifact.artifactId,
    operation: "normalize",
    parent: {
      sourceAssetId: request.attempt.sourceId, sourceFileSha256: ZERO,
      sourceDecodedPixelSha256: decodedPixelSha256, sourceManifestSha256: request.sourceIdentity.sourceProvenanceRef.contentHash,
    },
    capabilityContractRef: { id: "CC-CAP02-NORMALIZE-PNG@0.5.0", contentHash: request.contractRef.contentHash },
    candidateRef: { id: "REG-NORM-SHARP@0.5.0", contentHash: ZERO },
    adapterRef,
    producerRef: { kind: "candidate-adapter", ...adapterRef },
    runtimeRef: { id: request.runtimeAttestationRef.id, contentHash: request.runtimeAttestationRef.contentHash },
    hardwareRef: { id: "hardware.fake", contentHash: ZERO },
    attempt: structuredClone(request.attempt),
    bytes: {
      relativePath: artifactRelativePathSlice05(request), mime: "image/png", byteLength: artifactBytes.byteLength,
      fileSha256: artifactHash, decodedPixelSha256,
    },
    image: {
      width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB", orientation: 1,
      alphaMode: "straight-unpremultiplied", alphaPresent: false, metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only", interlace: "forbidden", animation: "forbidden",
    },
    createdAt: "2026-08-15T00:00:00.001Z",
  });
  const goldRecord = finalize({
    schemaVersion: "gold-record.slice05.v0",
    goldRecordId: `gold.${request.attempt.sourceId}`,
    operation: "normalize",
    sourceId: request.attempt.sourceId,
    partition: request.attempt.partition,
    provenance: {
      kind: "project-original-procedural", producerId: "GEN-INDEPENDENT-OPEN-PNG@0.5.0", producerVersion: "0.5.0",
      implementationSha256: TWO, authorIds: ["role.fixture-gold-author"], candidateAuthorIds: ["role.candidate-implementation-author"],
      candidateProduced: false, candidateOutputUsed: false, candidateDependencyUsed: false,
    },
    expected: {
      parentIdentity: {
        id: request.attempt.sourceId, artifactSha256: null, fileSha256: ZERO,
        decodedPixelSha256, manifestSha256: request.sourceIdentity.sourceProvenanceRef.contentHash,
      },
      mime: "image/png", width: 1, height: 1, pixelLayout: "RGBA8", colorSpace: "embedded-sRGB", orientation: 1,
      alphaMode: "straight-unpremultiplied", alphaPresent: false, metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only", interlace: "forbidden", animation: "forbidden", fileSha256: null, decodedPixelSha256,
    },
    frozenAt: "2026-08-15T00:00:00.000Z",
  });
  execution.oracleResult = evaluateNormalizedImageSlice05({
    artifact: execution.artifact,
    actualBytes: artifactBytes,
    goldRecord,
    oracleImplementationSha256: TWO,
    observedAt: "2026-08-15T00:00:00.600Z",
  });
  const keyHash = createHash("sha256").update(request.attempt.idempotencyKey, "utf8").digest("hex");
  const stagingDirectory = `.staging/${keyHash}`;
  const artifactStagedPath = `${stagingDirectory}/artifact/output.png`;
  const artifactRecordStagedPath = `${stagingDirectory}/artifact-record/artifact-record.json`;
  const oracleStagedPath = `${stagingDirectory}/oracle/oracle-result.json`;
  await mkdir(path.join(root, path.dirname(artifactStagedPath)), { recursive: true });
  await mkdir(path.join(root, path.dirname(artifactRecordStagedPath)), { recursive: true });
  await mkdir(path.join(root, path.dirname(oracleStagedPath)), { recursive: true });
  await writeFile(path.join(root, artifactStagedPath), artifactBytes);
  await writeFile(path.join(root, artifactRecordStagedPath), stableStringifySlice05Runner(execution.artifact), "utf8");
  await writeFile(path.join(root, oracleStagedPath), stableStringifySlice05Runner(execution.oracleResult), "utf8");
  execution.publication = { stagingDirectory, artifactStagedPath, artifactRecordStagedPath, oracleStagedPath };
  return execution;
}

async function withTempRoot(callback) {
  const root = await mkdtemp(path.join(tmpdir(), "sis-s05-runner-"));
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function canonicalRef(record, pathname, idField) {
  const bytes = Buffer.from(stableStringifySlice05Runner(record), "utf8");
  return {
    path: pathname,
    id: record[idField],
    contentHash: record.contentHash,
    byteLength: bytes.byteLength,
    fileSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function inspectSchema(node, location, issues) {
  if (Array.isArray(node)) {
    node.forEach((entry, index) => inspectSchema(entry, `${location}[${index}]`, issues));
    return;
  }
  if (!node || typeof node !== "object") return;
  const includesObject = node.type === "object" || (Array.isArray(node.type) && node.type.includes("object"));
  if (includesObject) {
    if (node.additionalProperties !== false) issues.push(`${location}: object is open`);
    if (!node.properties || !Array.isArray(node.required)) issues.push(`${location}: object lacks properties/required`);
    else {
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${location}: required/properties drift`);
    }
  }
  const includesArray = node.type === "array" || (Array.isArray(node.type) && node.type.includes("array"));
  if (includesArray && !node.items) issues.push(`${location}: array lacks items`);
  for (const [key, value] of Object.entries(node)) inspectSchema(value, `${location}.${key}`, issues);
}

test("Slice 05 runner exports one recursively closed schema for every frozen result record", () => {
  assert.deepEqual(Object.keys(SLICE05_RUNNER_RECORD_SCHEMAS).sort(), Object.keys(SLICE05_RUNNER_SCHEMA_PATHS).sort());
  assert.equal(Object.keys(SLICE05_RUNNER_RECORD_SCHEMAS).length, 10);
  const issues = [];
  for (const [name, schema] of Object.entries(SLICE05_RUNNER_RECORD_SCHEMAS)) inspectSchema(schema, name, issues);
  assert.deepEqual(issues, []);
});

test("durable claim returns an immutable existing terminal result without rerunning", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const request = makeRequest();
    let executions = 0;
    const execute = async ({ request: frozenRequest }) => {
      executions += 1;
      assert.equal(Object.isFrozen(frozenRequest), true);
      return fakeSuccess(frozenRequest);
    };
    const first = await runner.runAttempt(request, { execute });
    const second = await runner.runAttempt(request, { execute });
    assert.equal(first.status, "pass");
    assert.deepEqual(second, first);
    assert.equal(executions, 1);
    const queried = await runner.query(request.attempt.idempotencyKey);
    assert.deepEqual(queried, first);
    assert.equal(Object.isFrozen(queried), true);
    const ledger = await runner.readLedger();
    assert.deepEqual(ledger.map(({ eventType }) => eventType), ["attempt-started", "attempt-terminal", "existing-terminal-returned"]);
  });
});

test("restart reuses the first real request timestamp instead of backfilling or conflicting", async () => {
  await withTempRoot(async (root) => {
    const firstRequest = makeRequest({ mutate(value) { value.createdAt = "2026-08-15T00:00:00.123Z"; } });
    const firstRunner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock(Date.parse("2026-08-15T00:00:01.000Z")) });
    const first = await firstRunner.runAttempt(firstRequest, { execute: async ({ request }) => fakeSuccess(request) });
    const restartRequest = makeRequest({ mutate(value) { value.createdAt = "2026-08-15T00:00:10.456Z"; } });
    let reruns = 0;
    const restartRunner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock(Date.parse("2026-08-15T00:00:11.000Z")) });
    const second = await restartRunner.runAttempt(restartRequest, { execute: async () => { reruns += 1; throw new Error("must not rerun"); } });
    assert.deepEqual(second, first);
    assert.equal(reruns, 0);
    const keyHash = createHash("sha256").update(firstRequest.attempt.idempotencyKey, "utf8").digest("hex");
    const stored = JSON.parse(await readFile(path.join(root, "requests", `${keyHash}.request.json`), "utf8"));
    assert.equal(stored.createdAt, "2026-08-15T00:00:00.123Z");
    assert.equal(stored.contentHash, firstRequest.contentHash);
  });
});

test("registered executor applies three repetitions and at most one allowlisted replacement with fake executors", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const entries = [
      { sourceId: "source.registered.applicable", repetitions: 3, expectedDisposition: "applicable" },
      { sourceId: "source.registered.rejection", repetitions: 3, expectedDisposition: "preflight-reject" },
    ];
    let calls = 0;
    const results = await executeRegisteredCasesSlice05({
      runner,
      entries,
      buildRequest: async ({ entry, repetition, attemptNumber }) => makeRequest({
        sourceId: entry.sourceId,
        repetition,
        attemptNumber,
        expectedDisposition: entry.expectedDisposition,
      }),
      executeRequest: async ({ request, entry }) => {
        calls += 1;
        if (entry.expectedDisposition === "preflight-reject") {
          throw Object.assign(new Error("registered fake reject"), { code: "S05_INPUT_CRC_MISMATCH" });
        }
        if (request.attempt.repetition === 1 && request.attempt.attemptNumber === 1) {
          throw new Slice05NoResultError("integrity-check-failure");
        }
        return fakeSuccess(request);
      },
    });
    assert.equal(results.length, 7);
    assert.equal(calls, 7);
    assert.equal(results.filter(({ attempt }) => attempt.attemptNumber === 2).length, 1);
    assert.equal(results.filter(({ status }) => status === "pass").length, 6);
  });
});

test("same idempotency key conflict and valid-outcome slot rerun both fail closed", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const request = makeRequest();
    await runner.runAttempt(request, { execute: async ({ request: value }) => fakeSuccess(value) });
    const conflict = makeRequest({
      mutate(value) { value.sourceIdentity.rawAssetRef.fileSha256 = TWO; },
    });
    await assert.rejects(
      runner.runAttempt(conflict, { execute: async () => { throw new Error("must not execute"); } }),
      ({ code }) => code === "S05_IDEMPOTENCY_CONFLICT",
    );
    const newKeySameSlot = makeRequest({ idempotencyKey: "idem.same.slot.new-key" });
    await assert.rejects(
      runner.runAttempt(newKeySameSlot, { execute: async () => { throw new Error("must not execute"); } }),
      ({ code }) => code === "S05_ATTEMPT_SLOT_ALREADY_CLAIMED",
    );
  });
});

test("one allowed no-result replacement is enforced across all three repetitions", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const first = makeRequest({ sourceId: "source.replacement.fake" });
    const invalid = await runner.runAttempt(first, {
      execute: async () => { throw new Slice05NoResultError("custody-interruption"); },
    });
    assert.equal(invalid.status, "invalid-no-result");
    const replacement = makeRequest({ sourceId: first.attempt.sourceId, attemptNumber: 2 });
    assert.equal((await runner.runAttempt(replacement, { execute: async ({ request }) => fakeSuccess(request) })).status, "pass");

    const secondRep = makeRequest({ sourceId: first.attempt.sourceId, repetition: 2 });
    await runner.runAttempt(secondRep, {
      execute: async () => { throw new Slice05NoResultError("integrity-check-failure"); },
    });
    const forbiddenSecondReplacement = makeRequest({ sourceId: first.attempt.sourceId, repetition: 2, attemptNumber: 2 });
    await assert.rejects(
      runner.runAttempt(forbiddenSecondReplacement, { execute: async ({ request }) => fakeSuccess(request) }),
      ({ code }) => code === "S05_REPLACEMENT_LIMIT_EXCEEDED",
    );
    assert.throws(() => new Slice05NoResultError("unregistered-reason"), ({ code }) => code === "S05_NO_RESULT_REASON_FORBIDDEN");
  });
});

test("timeout, cancellation and unknown reconciliation are terminal and never auto-rerun", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const cases = [
      ["source.timeout.fake", "S05_WORKER_TIMEOUT", "timeout", true],
      ["source.cancel.fake", "S05_WORKER_CANCELLED", "cancelled", true],
      ["source.unknown.fake", "S05_WORKER_RECONCILIATION_UNKNOWN", "unknown-reconciliation", false],
    ];
    for (const [sourceId, code, status, exitConfirmed] of cases) {
      const request = makeRequest({ sourceId });
      let calls = 0;
      const execute = async () => {
        calls += 1;
        throw Object.assign(new Error(code), { code });
      };
      const first = await runner.runAttempt(request, { execute });
      const second = await runner.runAttempt(request, { execute });
      assert.equal(first.status, status);
      assert.equal(first.workerExitConfirmed, exitConfirmed);
      assert.deepEqual(second, first);
      assert.equal(calls, 1);
    }
  });
});

test("append-only ledger detects a hash-chain mutation", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const request = makeRequest({ sourceId: "source.ledger.fake" });
    await runner.runAttempt(request, { execute: async ({ request: value }) => fakeSuccess(value) });
    const ledgerPath = path.join(root, "ledger", "events.ndjson");
    const text = await readFile(ledgerPath, "utf8");
    await writeFile(ledgerPath, text.replace("attempt-started", "attempt-tampered"), "utf8");
    await assert.rejects(runner.readLedger(), ({ code }) => code === "S05_LEDGER_CORRUPT");
  });
});

test("durable publication intent reconciles a crash between artifact and result without rerunning", async () => {
  await withTempRoot(async (root) => {
    const request = makeRequest({ sourceId: "source.publish-crash.fake" });
    let injected = false;
    let executions = 0;
    const crashingRunner = createSlice05TestRunner({
      resultsRoot: root,
      clock: makeClock(),
      publishHook: async ({ role }) => {
        if (role === "artifact-bytes" && !injected) {
          injected = true;
          throw new Error("injected crash after artifact publish");
        }
      },
    });
    await assert.rejects(crashingRunner.runAttempt(request, {
      execute: async ({ request: value }) => {
        executions += 1;
        return fakeStagedSuccess(root, value);
      },
    }), /injected crash/);
    assert.equal(executions, 1);
    await readFile(path.join(root, artifactRelativePathSlice05(request)));
    await assert.rejects(readFile(path.join(root, artifactRecordRelativePathSlice05(request))));
    const keyHash = createHash("sha256").update(request.attempt.idempotencyKey, "utf8").digest("hex");
    await assert.rejects(readFile(path.join(root, "records", `${keyHash}.result.json`)));

    const recoveryRunner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock(Date.parse("2026-08-15T00:00:10.000Z")) });
    assert.equal(await recoveryRunner.reconcilePublications(), 1);
    const result = await recoveryRunner.query(request.attempt.idempotencyKey);
    assert.equal(result.status, "pass");
    assert.equal(executions, 1);
    await readFile(path.join(root, artifactRecordRelativePathSlice05(request)));
    await readFile(path.join(root, oracleRelativePathSlice05(request)));
    const events = await recoveryRunner.readLedger();
    assert.deepEqual(events.slice(-2).map(({ eventType }) => eventType), ["publication-complete", "attempt-terminal"]);
  });
});

test("independent output closure rejects PNG tampering before any smoke summary can be built", async () => {
  await withTempRoot(async (root) => {
    const request = makeRequest({ sourceId: "source.closure-tamper.fake" });
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const result = await runner.runAttempt(request, { execute: ({ request: value }) => fakeStagedSuccess(root, value) });
    assert.equal(result.status, "pass");
    assert.deepEqual(await verifyTerminalOutputClosureSlice05ForTest({ resultsRoot: root }), { pass: true, issues: [] });
    await assert.rejects(stat(path.join(root, ".staging")), ({ code }) => code === "ENOENT");
    await assert.rejects(stat(path.join(root, "source-locks")), ({ code }) => code === "ENOENT");
    const tampered = encodeCanonicalRgbaPngSlice05(1, 1, Buffer.from([18, 33, 65, 255]));
    await writeFile(path.join(root, artifactRelativePathSlice05(request)), tampered);
    const closure = await verifyTerminalOutputClosureSlice05ForTest({ resultsRoot: root });
    assert.equal(closure.pass, false);
    assert.equal(closure.issues.some(({ code }) => code === "OUTPUT_IDENTITY_MISMATCH"), true);
  });
});

test("oracle nonpass is classified distinctly, retains worker observation, and leaves no staged bytes", async () => {
  await withTempRoot(async (root) => {
    const request = makeRequest({ sourceId: "source.oracle-nonpass.fake" });
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const result = await runner.runAttempt(request, {
      execute: async ({ request: value }) => {
        const execution = await fakeStagedSuccess(root, value);
        execution.oracleResult = { ...execution.oracleResult, overallStatus: "non-pass" };
        return execution;
      },
    });
    assert.equal(result.status, "nonpass");
    assert.equal(result.reasonCode, "S05_ORACLE_NONPASS");
    assert.notEqual(result.workerRuntime, null);
    assert.equal(result.workerObservation, "worker-self-reported-observation-not-hard-isolation");
    assert.equal(result.artifactRef, null);
    assert.equal(result.oracleResultRef, null);
    const keyHash = createHash("sha256").update(request.attempt.idempotencyKey, "utf8").digest("hex");
    await assert.rejects(readFile(path.join(root, ".staging", keyHash, "artifact", "output.png")));
    await assert.rejects(readFile(path.join(root, artifactRelativePathSlice05(request))));
  });
});

test("test-only atomic commit is hash-bound, no-overwrite and path-contained", async () => {
  await withTempRoot(async (root) => {
    const bytes = Buffer.from("policy-only-no-image", "utf8");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const args = { resultsRoot: root, expectedRelativePath: "artifacts/fake.bin", expectedFileSha256: hash, bytes };
    assert.equal((await atomicCommitSlice05TestOutput(args)).status, "committed");
    await assert.rejects(atomicCommitSlice05TestOutput(args), ({ code }) => code === "S05_ATOMIC_TARGET_EXISTS");
    await assert.rejects(
      atomicCommitSlice05TestOutput({ ...args, expectedRelativePath: "../escape.bin" }),
      ({ code }) => code === "S05_ATOMIC_OUTPUT_PATH_INVALID",
    );
  });
});

test("definition tree verification uses the frozen binary path comparator", async () => {
  await withTempRoot(async (root) => {
    const descriptors = [];
    for (const [pathname, text] of [["a.txt", "lower"], ["Z.txt", "upper"]]) {
      const bytes = Buffer.from(text, "utf8");
      await writeFile(path.join(root, pathname), bytes);
      descriptors.push({ path: pathname, byteLength: bytes.byteLength, fileSha256: createHash("sha256").update(bytes).digest("hex") });
    }
    const digest = createHash("sha256");
    for (const entry of [...descriptors].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)) {
      digest.update(Buffer.from(entry.path, "utf8")); digest.update(Buffer.from([0]));
      digest.update(Buffer.from(String(entry.byteLength), "ascii")); digest.update(Buffer.from([0]));
      digest.update(Buffer.from(entry.fileSha256, "ascii")); digest.update(Buffer.from([0]));
    }
    assert.equal(await verifySlice05DefinitionTreeForTest({
      definitionRoot: root,
      machineTree: { fileCount: descriptors.length, files: descriptors.reverse(), sha256: digest.digest("hex") },
    }), true);
  });
});

test("export material binding rejects a normalized artifact swapped across raw provenance", () => {
  const rawAsset = {
    path: "assets/open/export/raw.png", mime: "image/png", byteLength: 80, fileSha256: ZERO,
    decodedPixelSha256: ONE, sourceDeclarationDecodedPixelSha256: ONE,
  };
  const entry = {
    sourceId: "normalized.export.fixture", operation: "export", partition: "smoke", categoryId: "category.export",
    expectedDisposition: "artifact-required", expectedStableErrorCode: null, sourceFamilyId: "family.export",
    captureSessionId: "session.export", sourceProvenanceRef: recordRef("sources/raw.export.fixture.json", "provenance.raw.export.fixture", TWO),
    rawAsset, normalizedArtifactRef: { ...recordRef("artifacts/normalized.export.fixture.json", "normalized.export.fixture"), producerKind: "independent-fixture-generator" },
  };
  const provenance = {
    sourceId: "raw.export.fixture", operation: "export", partition: "smoke", categoryId: entry.categoryId,
    expectedDisposition: entry.expectedDisposition, expectedStableErrorCode: null, sourceFamilyId: entry.sourceFamilyId,
    captureSessionId: entry.captureSessionId, rawAsset: { ...rawAsset },
  };
  const normalizedArtifact = {
    artifactId: entry.sourceId, contentHash: entry.normalizedArtifactRef.contentHash,
    parent: {
      sourceAssetId: provenance.sourceId, sourceFileSha256: ZERO, sourceDecodedPixelSha256: ONE,
      sourceManifestSha256: entry.sourceProvenanceRef.contentHash,
    },
  };
  assert.equal(validateManifestEntryMaterialBindingSlice05({ entry, provenance, normalizedArtifact }), true);
  assert.throws(
    () => validateManifestEntryMaterialBindingSlice05({
      entry, provenance, normalizedArtifact: { ...normalizedArtifact, artifactId: "normalized.swapped.fixture" },
    }),
    ({ code }) => code === "S05_SOURCE_PROVENANCE_INVALID",
  );
});

test("calibration admission fails closed on a matching-looking denied Gate B without invoking work", () => {
  const definitionRef = recordRef("definition-index.v0.5.0.json", "DEFINITION-INDEX-SLICE05@0.5.0");
  const gateBPlanRef = recordRef("plans/gate-b-smoke.v0.5.0.json", "GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0");
  const evidenceBoundary = makeSummaryRecords().sessionAudit.evidenceBoundary;
  const decision = finalize({
    schemaVersion: "gate-b-decision.slice05.v0",
    decisionId: "gate-b.normalize.denied.fake",
    operation: "normalize",
    definitionRef,
    gateBPlanRef,
    smokeSummaryRef: recordRef("summaries/normalize.smoke-summary.slice05.v0.json", "summary.normalize.fake"),
    conjunctResults: [{ gateId: "gate-b.normalize.zero-ambiguous-outcomes", status: "non-pass", evidenceRefs: [recordRef("summaries/normalize.smoke-summary.slice05.v0.json", "summary.normalize.fake")] }],
    decision: "denied-not-entered",
    calibrationAuthorized: false,
    productSupport: false,
    evidenceBoundary,
    decidedAt: "2026-08-15T00:00:03.000Z",
  });
  assert.throws(
    () => assertCalibrationGateDecisionSlice05({ operation: "normalize", definitionRef, gateBPlanRef, decision }),
    ({ code }) => code === "S05_CALIBRATION_GATE_B_DENIED",
  );
});

test("calibration summary preserves all 48x3 effective result refs and raw replacement counters", () => {
  const operation = "normalize";
  const definitionRef = recordRef("definition-index.v0.5.0.json", "DEFINITION-INDEX-SLICE05@0.5.0");
  const gateBPlanRef = recordRef("plans/gate-b-smoke.v0.5.0.json", "GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0");
  const evidenceBoundary = makeSummaryRecords().sessionAudit.evidenceBoundary;
  const startInventory = fakeRuntimeInventoryEvidence("2026-08-15T00:00:03.500Z");
  const endInventory = buildRuntimeInventoryObservationSlice05({
    inventory: startInventory.inventory,
    frozenRuntimeAttestation: startInventory.frozenRuntimeAttestation,
    expectedInventoryPayloadSha256: startInventory.runtimeAttestationRef.inventoryPayloadSha256,
    observedAt: "2026-08-15T00:00:06.000Z",
  });
  const gateBDecision = finalize({
    schemaVersion: "gate-b-decision.slice05.v0", decisionId: "gate-b.normalize.ready.fake", operation,
    definitionRef, gateBPlanRef, smokeSummaryRef: recordRef("summaries/normalize.smoke-summary.slice05.v0.json", "summary.normalize.ready"),
    conjunctResults: [{ gateId: "gate-b.normalize.fake", status: "pass", evidenceRefs: [recordRef("summaries/normalize.smoke-summary.slice05.v0.json", "summary.normalize.ready")] }],
    decision: "calibration-ready", calibrationAuthorized: true, productSupport: false, evidenceBoundary,
    decidedAt: "2026-08-15T00:00:03.000Z",
  });
  const gateBDecisionRef = canonicalRef(gateBDecision, "decisions/normalize.gate-b-decision.slice05.v0.json", "decisionId");
  const manifestRefs = [
    recordRef("manifests/normalize-dev.v0.5.0.json", "manifest.normalize.dev", ONE),
    recordRef("manifests/normalize-defect.v0.5.0.json", "manifest.normalize.defect", TWO),
  ];
  const admission = finalize({
    schemaVersion: "calibration-admission.slice05.v0", admissionId: "calibration-admission.normalize.fake", operation,
    definitionRef, gateBPlanRef, gateBDecisionRef,
    calibrationPreregistrationRef: recordRef("preregistrations/calibration-normalize-png.v0.5.0.json", "prereg.normalize"),
    manifestRefs, runtimeStartObservation: startInventory.observation,
    decision: "admitted-open-calibration", admittedAt: "2026-08-15T00:00:04.000Z", evidenceBoundary,
  });
  const admissionRef = canonicalRef(admission, "admission/calibration-admission.slice05.v0.json", "admissionId");
  const registeredCases = [];
  const terminalResults = [];
  const runtime = fakeWorkerRuntime();
  const payloadSha256 = createHash("sha256").update(stableStringifySlice05Runner(runtime), "utf8").digest("hex");
  for (let index = 0; index < 48; index += 1) {
    const sourceId = `source.calibration.${String(index + 1).padStart(3, "0")}`;
    const partition = index < 24 ? "dev/calibration" : "defect/calibration";
    const manifestContentHash = index < 24 ? ONE : TWO;
    const expectedDisposition = index % 2 === 0 ? "applicable" : "preflight-reject";
    registeredCases.push({ sourceId, partition, expectedDisposition, repetitions: 3, manifestContentHash });
    for (const repetition of [1, 2, 3]) {
      const request = makeRequest({ sourceId, repetition, mode: "calibration", partition, expectedDisposition });
      const keyHash = createHash("sha256").update(request.attempt.idempotencyKey, "utf8").digest("hex");
      const applicable = expectedDisposition === "applicable";
      const result = finalize({
        schemaVersion: "run-result.slice05.v0", resultId: `result.${keyHash}`,
        requestRef: { id: request.requestId, contentHash: request.contentHash }, idempotencyKeyHash: keyHash,
        mode: "calibration", operation, attempt: structuredClone(request.attempt), expectedDisposition,
        expectedStableErrorCode: applicable ? null : "S05_INPUT_CRC_MISMATCH", status: "pass",
        reasonCode: applicable ? null : "S05_INPUT_CRC_MISMATCH",
        artifactRef: applicable ? {
          schemaVersion: "normalized-image.slice04.v0", id: `artifact.${sourceId}.r${repetition}`, contentHash: ZERO,
          recordRelativePath: artifactRecordRelativePathSlice05(request), recordByteLength: 300, recordFileSha256: ONE,
          relativePath: artifactRelativePathSlice05(request), byteLength: 80, fileSha256: ONE, decodedPixelSha256: TWO,
        } : null,
        oracleResultRef: applicable ? { id: `oracle.${sourceId}.r${repetition}`, contentHash: ZERO, relativePath: oracleRelativePathSlice05(request) } : null,
        runtimeAttestationRef: startInventory.runtimeAttestationRef, workerRuntime: applicable ? { payload: runtime, payloadSha256 } : null,
        workerObservation: applicable ? "worker-self-reported-observation-not-hard-isolation" : null,
        durationMs: applicable ? 5 : null,
        resourceUsage: applicable ? { maxRssKiB: 1024, userCpuMicros: 20, systemCpuMicros: 10 } : null,
        workerExitConfirmed: applicable ? true : null,
        startedAt: "2026-08-15T00:00:05.000Z", finishedAt: "2026-08-15T00:00:05.001Z",
        evidenceBoundary,
      });
      terminalResults.push(result);
    }
  }
  const summary = buildCalibrationSummarySlice05({
    operation, definitionRef, gateBDecision, gateBDecisionRef, admission, admissionRef, manifestRefs,
    registeredCases, terminalResults, runtimeAttestationRef: startInventory.runtimeAttestationRef,
    runtimeStartObservation: startInventory.observation, runtimeEndObservation: endInventory,
    outputClosurePass: true, startedAt: "2026-08-15T00:00:05.000Z", finishedAt: "2026-08-15T00:00:06.000Z",
  });
  assert.equal(summary.overallStatus, "all-pass");
  assert.equal(summary.registeredAttemptCount, 144);
  assert.equal(summary.recordedAttemptCount, 144);
  assert.equal(summary.replacementAttemptCount, 0);
  assert.equal(summary.caseResults.length, 48);
  assert.equal(summary.caseResults.flatMap(({ effectiveResultRefs }) => effectiveResultRefs).length, 144);
});

const GATE_SUFFIXES = [
  "definition-integrity", "runtime-integrity", "implementation-integrity", "source-isolation",
  "applicable-success", "rejection-correctness", "repeat-determinism", "fault-semantics",
  "oracle-independence", "zero-ambiguous-outcomes", "no-cross-operation-aggregation", "no-capability-promotion",
];

function makeSummaryRecords({ operation = "normalize" } = {}) {
  const definitionRef = recordRef("definition-index.v0.5.0.json", "DEFINITION-INDEX-SLICE05@0.5.0");
  const manifestRef = recordRef(`manifests/${operation}-smoke.v0.5.0.json`, `manifest.${operation}.smoke`);
  const runtimeAttestationRef = runtimeRef();
  const rawPlan = {
    schemaVersion: "gate-b-smoke-plan.slice05.v0",
    gateBPlanId: "GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0",
    operationPlans: [{
      operation,
      smokeManifestRef: manifestRef,
      conjunctiveGates: GATE_SUFFIXES.map((suffix) => ({
        gateId: `gate-b.${operation}.${suffix}`,
        requirement: `requirement.${suffix}`,
        initialState: "not-evaluated",
        passRequired: true,
      })),
    }],
    crossOperationAggregationAllowed: false,
    contentHash: "",
  };
  const gateBPlan = finalize(rawPlan);
  const gateBPlanRef = canonicalRef(gateBPlan, "plans/gate-b-smoke.v0.5.0.json", "gateBPlanId");
  const sessionAudit = buildSlice05SessionAudit({
    operation,
    definitionRef,
    gateBPlanRef,
    manifestRef,
    runtimeAttestationRef,
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
    auditedAt: "2026-08-15T00:00:01.000Z",
  });
  const sessionAuditRef = canonicalRef(sessionAudit, `audit/${operation}.smoke-session-audit.slice05.v0.json`, "auditId");
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
    runtimeAttestationRef,
    scenarioResults,
    observedAt: "2026-08-15T00:00:01.001Z",
  });
  const faultSemanticsRef = canonicalRef(faultSemantics, "fault/fault-semantics-result.slice05.v0.json", "faultResultId");
  return {
    operation, definitionRef, manifestRef, runtimeAttestationRef, gateBPlan, gateBPlanRef,
    sessionAudit, sessionAuditRef, faultSemantics, faultSemanticsRef,
  };
}

async function collectSmokeResults(root, { divergent = false } = {}) {
  const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
  const results = [];
  for (const repetition of [1, 2, 3]) {
    const applicable = makeRequest({ sourceId: "source.summary.applicable", repetition });
    results.push(await runner.runAttempt(applicable, {
      execute: async ({ request }) => fakeSuccess(request, { fileSha256: divergent && repetition === 3 ? ZERO : ONE }),
    }));
    const rejection = makeRequest({ sourceId: "source.summary.rejection", repetition, expectedDisposition: "preflight-reject" });
    results.push(await runner.runAttempt(rejection, {
      execute: async () => { throw Object.assign(new Error("registered reject"), { code: "S05_INPUT_CRC_MISMATCH" }); },
    }));
  }
  return results;
}

test("operation smoke summary and Gate B require all cases, canonical faults and three byte-identical cold outputs", async () => {
  await withTempRoot(async (root) => {
    const terminalResults = await collectSmokeResults(root);
    const evidence = makeSummaryRecords();
    const summary = buildOperationSmokeSummarySlice05({
      ...evidence,
      registeredCases: [
        { sourceId: "source.summary.applicable", partition: "smoke", expectedDisposition: "applicable", repetitions: 3 },
        { sourceId: "source.summary.rejection", partition: "smoke", expectedDisposition: "preflight-reject", repetitions: 3 },
      ],
      terminalResults,
      startedAt: "2026-08-15T00:00:00.000Z",
      finishedAt: "2026-08-15T00:00:02.000Z",
    });
    assert.equal(summary.overallStatus, "all-pass");
    assert.equal(summary.caseResults[0].deterministic, true);
    const summaryRef = canonicalRef(summary, "summaries/normalize.smoke-summary.slice05.v0.json", "summaryId");
    const decision = buildGateBDecisionSlice05({ ...evidence, summary, summaryRef, decidedAt: "2026-08-15T00:00:02.001Z" });
    validateGateBDecisionSlice05(decision);
    assert.equal(decision.decision, "calibration-ready");
    assert.equal(decision.conjunctResults.length, 12);
  });
});

test("smoke summary retains an invalidated raw no-result and replacement instead of hiding it in effective passes", async () => {
  await withTempRoot(async (root) => {
    const runner = createSlice05TestRunner({ resultsRoot: root, clock: makeClock() });
    const terminalResults = [];
    const first = makeRequest({ sourceId: "source.summary.replaced", repetition: 1 });
    terminalResults.push(await runner.runAttempt(first, {
      execute: async () => { throw new Slice05NoResultError("custody-interruption"); },
    }));
    const replacement = makeRequest({ sourceId: "source.summary.replaced", repetition: 1, attemptNumber: 2 });
    terminalResults.push(await runner.runAttempt(replacement, { execute: async ({ request }) => fakeSuccess(request) }));
    for (const repetition of [2, 3]) {
      const request = makeRequest({ sourceId: "source.summary.replaced", repetition });
      terminalResults.push(await runner.runAttempt(request, { execute: async ({ request: active }) => fakeSuccess(active) }));
    }
    const evidence = makeSummaryRecords();
    const summary = buildOperationSmokeSummarySlice05({
      ...evidence,
      registeredCases: [{ sourceId: "source.summary.replaced", partition: "smoke", expectedDisposition: "applicable", repetitions: 3 }],
      terminalResults,
      startedAt: "2026-08-15T00:00:00.000Z",
      finishedAt: "2026-08-15T00:00:02.000Z",
    });
    assert.equal(summary.recordedAttemptCount, 4);
    assert.equal(summary.replacementAttemptCount, 1);
    assert.equal(summary.terminalAttemptCount, 3);
    assert.equal(summary.passAttemptCount, 3);
    assert.equal(summary.invalidNoResultCount, 1);
    assert.equal(summary.caseResults[0].invalidatedResultRefs.length, 1);
    assert.equal(summary.overallStatus, "non-pass");
  });
});

test("byte hash drift across three cold outputs denies only that operation Gate B", async () => {
  await withTempRoot(async (root) => {
    const terminalResults = await collectSmokeResults(root, { divergent: true });
    const evidence = makeSummaryRecords();
    const summary = buildOperationSmokeSummarySlice05({
      ...evidence,
      registeredCases: [
        { sourceId: "source.summary.applicable", partition: "smoke", expectedDisposition: "applicable", repetitions: 3 },
        { sourceId: "source.summary.rejection", partition: "smoke", expectedDisposition: "preflight-reject", repetitions: 3 },
      ],
      terminalResults,
      startedAt: "2026-08-15T00:00:00.000Z",
      finishedAt: "2026-08-15T00:00:02.000Z",
    });
    assert.equal(summary.allApplicableSourcesDeterministic, false);
    const summaryRef = canonicalRef(summary, "summaries/normalize.smoke-summary.slice05.v0.json", "summaryId");
    const decision = buildGateBDecisionSlice05({ ...evidence, summary, summaryRef, decidedAt: "2026-08-15T00:00:02.001Z" });
    assert.equal(decision.decision, "denied-not-entered");
    assert.equal(decision.conjunctResults.find(({ gateId }) => gateId.endsWith("repeat-determinism")).status, "non-pass");
  });
});
