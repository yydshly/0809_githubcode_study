import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { contentHashSlice06, sha256Slice06 } from "../scripts/research-diagnostic-adapter-slice06.mjs";
import {
  SLICE06_EVIDENCE_BOUNDARY,
  SLICE06_RUNNER_LIMITS,
  SLICE06_RUNNER_SCHEMA_DOCUMENTS,
  SLICE06_RUNNER_SCHEMA_PATHS,
  SLICE06_RUNNER_VERSIONS,
  candidateOutputRelativePathSlice06,
  createSlice06DiagnosticRunner,
  requestIdSlice06,
  validateSlice06DiagnosticSummary,
  validateSlice06RunRequest,
} from "../scripts/research-run-slice06.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const CREATED_AT = "2026-08-15T06:59:00.000Z";
const SOURCES = Object.freeze([
  ["applicable-alpha", "applicable"],
  ["applicable-beta", "applicable"],
  ["applicable-gamma", "applicable"],
  ["sentinel-missing-srgb", "preflight-reject"],
]);

function withHash(record) { return { ...record, contentHash: contentHashSlice06(record) }; }
function recordRef(id, suffix) {
  return { id, contentHash: HASH_A, path: `frozen/${suffix}.json`, byteLength: 7, fileSha256: HASH_B };
}
function implementationRef(id) { return { id, version: "0.6.0", implementationSha256: HASH_C }; }

function requestsFor(operation = "normalize") {
  const shared = {
    definitionRef: recordRef(`definition.${operation}`, `${operation}-definition`),
    candidateRef: recordRef("sharp-candidate.slice06.v0", "candidate"),
    contractRef: recordRef(`contract.${operation}`, `${operation}-contract`),
    manifestRef: recordRef(`manifest.${operation}`, `${operation}-manifest`),
    preregistrationRef: recordRef(`prereg.${operation}`, `${operation}-prereg`),
    runtimeAttestationRef: recordRef("runtime.slice06", "runtime"),
    hardwareRef: recordRef("hardware.slice06", "hardware"),
    adapterRef: implementationRef("diagnostic-adapter.slice06"),
    workerRef: implementationRef("sharp-worker.slice06"),
    oracleRef: implementationRef("independent-png-oracle.slice06"),
  };
  return SOURCES.flatMap(([sourceId, expectedDisposition]) => [1, 2, 3].map((repetition) => withHash({
    schemaVersion: SLICE06_RUNNER_VERSIONS.request,
    requestId: requestIdSlice06({ operation, sourceId, repetition }),
    mode: "open-diagnostic", operation,
    ...structuredClone(shared),
    sourceRef: recordRef(`source.${sourceId}`, `sources/${sourceId}`),
    attempt: {
      runId: `run.open-diagnostic.${operation}.frozen`, sourceId, partition: "diagnostic", repetition,
      attemptNumber: 1, idempotencyKey: `${operation}.${sourceId}.r${repetition}.a1`,
    },
    expectedDisposition,
    expectedStableErrorCode: expectedDisposition === "preflight-reject" ? "S06_INPUT_SRGB_REQUIRED" : null,
    createdAt: CREATED_AT,
    evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY),
  })));
}

function clock() {
  let now = Date.parse("2026-08-15T07:00:00.000Z");
  return () => new Date(now++).toISOString();
}

function workerObservation(at) {
  return {
    message: { received: true, receivedAt: at, protocolVersion: "sharp-worker.slice06.v0", status: "succeeded", payloadSha256: HASH_A },
    runtime: { payloadSha256: HASH_B, matchesFrozen: true },
    telemetry: { source: "worker-self-reported-not-hard-isolation", workerDurationMs: 1, resourceUsage: { maxRssKiB: 2048, userCpuMicros: 10, systemCpuMicros: 4 } },
    parentWall: { startedAt: at, messageAt: at, exitedAt: at, finishedAt: at, durationMs: 0 },
    exit: { confirmed: true, exitCode: 0, signal: null, terminationRequested: false },
  };
}

function fakeExecution(request, startedAt, { tamperAttempt = false, varyBytes = false, pixelMode = "same" } = {}) {
  const nonpass = request.attempt.sourceId === "applicable-beta";
  const strictDecision = nonpass ? "non-pass" : "pass";
  const outputBytes = Buffer.from(varyBytes ? `${request.attempt.sourceId}.${request.attempt.repetition}` : request.attempt.sourceId, "utf8");
  const fileSha256 = sha256Slice06(outputBytes);
  const decodedPixelSha256 = pixelMode === "unknown" && request.attempt.repetition === 2
    ? null
    : sha256Slice06(Buffer.from(`pixels.${request.attempt.sourceId}${pixelMode === "different" ? `.r${request.attempt.repetition}` : ""}`, "utf8"));
  const keyHash = sha256Slice06(Buffer.from(request.attempt.idempotencyKey, "utf8"));
  const boundAttempt = structuredClone(request.attempt);
  if (tamperAttempt) boundAttempt.idempotencyKey = `${boundAttempt.idempotencyKey}.replay`;
  const shortRequestRef = { id: request.requestId, contentHash: request.contentHash };
  const rights = { fixtureClass: "original-synthetic", candidateDerivativeRepositoryRetention: true, diagnosticPublicDisplay: true };
  const retention = { state: "retained", policyRef: { id: "retention.slice06", contentHash: HASH_A }, maxPerOutputBytes: 1_048_576, maxSessionBytes: 18_874_368, reasonCode: "S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC" };
  const primaryCode = nonpass ? "S06_ORACLE_PNG_SRGB_REQUIRED" : null;
  const findings = nonpass
    ? [{ code: primaryCode, stage: "png-structure", status: "non-pass", expected: "sRGB", actual: null, message: "synthetic non-pass" }]
    : [];
  const verification = {
    schemaVersion: "png-diagnostic-verification.slice06.v0", verificationId: `verification.${keyHash}`,
    operation: request.operation, overallStatus: strictDecision, primaryCode,
    expected: {}, actualBytes: { mediaType: "image/png", byteLength: outputBytes.byteLength, fileSha256, decodedPixelSha256 }, facts: {}, findings,
    contentHash: HASH_A,
  };
  const outputObservation = {
    candidateOutputObservationId: `candidate-output-observation.${keyHash}`, strictDecision, operation: request.operation,
    requestRef: shortRequestRef, attempt: boundAttempt,
    candidateRef: { id: request.candidateRef.id, contentHash: request.candidateRef.contentHash },
    adapterRef: structuredClone(request.adapterRef), workerRef: structuredClone(request.workerRef),
    runtimeRef: { id: request.runtimeAttestationRef.id, contentHash: request.runtimeAttestationRef.contentHash },
    hardwareRef: { id: request.hardwareRef.id, contentHash: request.hardwareRef.contentHash },
    rights, retention,
    bytes: { relativePath: candidateOutputRelativePathSlice06(request, strictDecision), mediaType: "application/octet-stream", byteLength: outputBytes.byteLength, fileSha256 },
    producedAt: startedAt, contentHash: HASH_B,
  };
  const oracleDiagnostic = {
    oracleDiagnosticId: `oracle-diagnostic.${keyHash}`, operation: request.operation, requestRef: shortRequestRef,
    attempt: boundAttempt, oracleRef: structuredClone(request.oracleRef),
    candidateOutputObservationRef: { id: outputObservation.candidateOutputObservationId, contentHash: outputObservation.contentHash },
    verification, observedAt: startedAt, contentHash: HASH_C,
  };
  const observation = workerObservation(startedAt);
  const diagnosticEnvelope = {
    diagnosticEnvelopeId: `diagnostic-envelope.${keyHash}`, strictDecision, operation: request.operation,
    requestRef: shortRequestRef, attempt: boundAttempt,
    outcomeClass: strictDecision === "pass" ? "oracle-pass" : "oracle-nonpass", primaryCode, secondaryCodes: [],
    candidateOutputObservationRef: { id: outputObservation.candidateOutputObservationId, contentHash: outputObservation.contentHash },
    oracleDiagnosticRef: { id: oracleDiagnostic.oracleDiagnosticId, contentHash: oracleDiagnostic.contentHash },
    worker: observation, rights, retention, createdAt: startedAt, contentHash: HASH_A,
  };
  return {
    status: strictDecision === "pass" ? "oracle-pass-diagnostic" : "oracle-non-pass-diagnostic",
    strictDecision, outputBytes, verification, outputObservation, oracleDiagnostic, diagnosticEnvelope,
    workerObservation: observation,
  };
}

const validators = Object.freeze({
  validateOutputObservation: (value) => assert.equal(typeof value.candidateOutputObservationId, "string"),
  validateOracleDiagnostic: (value) => assert.equal(typeof value.oracleDiagnosticId, "string"),
  validateDiagnosticEnvelope: (value) => assert.equal(typeof value.diagnosticEnvelopeId, "string"),
});

async function exists(filename) { try { await stat(filename); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }

test("Slice 06 runner schemas are recursively closed and stay inside the supported evaluator vocabulary", () => {
  const forbidden = new Set(["allOf", "anyOf", "if", "then", "else"]);
  const allowed = new Set(["$schema", "$id", "type", "const", "enum", "pattern", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "uniqueItems", "items", "oneOf", "properties", "required", "additionalProperties", "format"]);
  assert.deepEqual(Object.keys(SLICE06_RUNNER_SCHEMA_DOCUMENTS).sort(), Object.values(SLICE06_RUNNER_SCHEMA_PATHS).sort());
  function inspect(node, location) {
    if (Array.isArray(node)) { node.forEach((child, index) => inspect(child, `${location}[${index}]`)); return; }
    if (!node || typeof node !== "object") return;
    for (const key of Object.keys(node)) {
      assert.equal(forbidden.has(key), false, `${location} uses forbidden ${key}`);
      if (location.includes("schema") && !location.endsWith("properties")) assert.ok(allowed.has(key) || !key.startsWith("$"), `${location} unsupported ${key}`);
    }
    if (node.type === "object") assert.equal(node.additionalProperties, false, `${location} must be closed`);
    for (const [key, child] of Object.entries(node)) inspect(child, `${location}.${key}`);
  }
  for (const [schemaPath, schema] of Object.entries(SLICE06_RUNNER_SCHEMA_DOCUMENTS)) inspect(schema, `schema:${schemaPath}`);
  const requestSchema = SLICE06_RUNNER_SCHEMA_DOCUMENTS[SLICE06_RUNNER_SCHEMA_PATHS.runRequest];
  assert.equal(requestSchema.properties.attempt.properties.attemptNumber.const, 1);
  assert.equal(SLICE06_RUNNER_LIMITS.attemptsTotal, 24);
  assert.equal(SLICE06_RUNNER_LIMITS.replacementAttempts, 0);

  const rollover = structuredClone(requestsFor()[0]);
  rollover.createdAt = "2026-02-31T00:00:00.000Z";
  rollover.contentHash = contentHashSlice06(rollover);
  assert.throws(() => validateSlice06RunRequest(rollover), { code: "S06_RUN_REQUEST_INVALID" });
});

test("Slice 06 runner records 12 fixed attempts, deterministic summary and atomic pass/non-pass five-role closures", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-runner-"));
  const requests = requestsFor();
  let calls = 0;
  const runner = createSlice06DiagnosticRunner({ resultsRoot, validators, clock: clock() });
  const run = await runner.runOperation({
    operation: "normalize", requests,
    execute: async ({ request, startedAt }) => {
      calls += 1;
      if (request.expectedDisposition === "preflight-reject") throw Object.assign(new Error("missing sRGB"), { code: request.expectedStableErrorCode, workerObservation: null });
      return fakeExecution(request, startedAt);
    },
  });
  assert.equal(calls, 12);
  assert.equal(run.terminalResults.length, 12);
  assert.deepEqual(run.terminalResults.map(({ attempt }) => attempt.attemptNumber), Array(12).fill(1));
  assert.equal(run.summary.registeredAttemptCount, 12);
  assert.equal(run.summary.replacementAttemptCount, 0);
  assert.equal(run.summary.overallStatus, "characterization-complete");
  assert.equal(run.summary.allOutputBytesDeterministic, true);
  assert.equal(run.summary.allPixelsDeterministic, true);
  assert.equal(run.summary.allClassificationsDeterministic, true);
  assert.equal(run.summary.exitConfirmedAll, true);
  assert.equal(run.summary.telemetryCompleteAll, true);
  assert.equal(run.terminalResults.filter(({ publication }) => publication !== null).length, 9);
  assert.equal(run.terminalResults.filter(({ status }) => status === "characterized-preflight-rejection").length, 3);

  for (const result of run.terminalResults.filter(({ publication }) => publication !== null)) {
    assert.equal(Object.keys(result.publication.rolePaths).length, 5);
    for (const relativePath of Object.values(result.publication.rolePaths)) {
      assert.equal(relativePath.split("/").includes("artifacts"), false);
      assert.equal(await exists(path.join(resultsRoot, ...relativePath.split("/"))), true);
    }
  }
  assert.equal(await exists(path.join(resultsRoot, "artifacts")), false);
  const sentinel = run.terminalResults.find(({ attempt }) => attempt.sourceId === "sentinel-missing-srgb");
  assert.equal(sentinel.workerInvoked, false);
  assert.equal(sentinel.diagnosticEnvelopeRef, null);

  const laundered = structuredClone(run.summary);
  const applicableCase = laundered.caseResults.find(({ sourceId }) => sourceId === "applicable-alpha");
  const previousStatus = applicableCase.statuses[0];
  applicableCase.statuses[0] = "characterized-preflight-rejection";
  applicableCase.closureComplete = false;
  laundered.statusCounts[previousStatus] -= 1;
  laundered.statusCounts["characterized-preflight-rejection"] += 1;
  laundered.contentHash = contentHashSlice06(laundered);
  assert.throws(() => validateSlice06DiagnosticSummary(laundered), { code: "S06_DIAGNOSTIC_SUMMARY_INVALID" });

  const launderingMutations = [
    (value) => { value.summaryId = "diagnostic-summary.normalize.rehashed"; },
    (value) => { value.retainedOutputBytes = -1; },
    (value) => { value.retainedOutputBytes -= 1; },
    (value) => {
      const target = value.caseResults.find(({ sourceId }) => sourceId === "applicable-alpha");
      target.rawResultRefs[1] = structuredClone(target.rawResultRefs[0]);
      target.effectiveResultRefs[1] = structuredClone(target.effectiveResultRefs[0]);
    },
    (value) => {
      const target = value.caseResults.find(({ sourceId }) => sourceId === "applicable-alpha");
      target.rawResultRefs[0].relativePath = "quarantine/normalize/applicable-alpha/r1/terminal-result.json";
      target.effectiveResultRefs[0].relativePath = target.rawResultRefs[0].relativePath;
    },
    (value) => {
      const target = value.caseResults.find(({ sourceId }) => sourceId === "applicable-alpha");
      target.strictDecisions[0] = "non-pass";
    },
  ];
  for (const mutate of launderingMutations) {
    const value = structuredClone(run.summary);
    mutate(value);
    value.contentHash = contentHashSlice06(value);
    assert.throws(() => validateSlice06DiagnosticSummary(value), { code: "S06_DIAGNOSTIC_SUMMARY_INVALID" });
  }

  const ledgerText = await readFile(path.join(resultsRoot, "ledger", "normalize.ndjson"), "utf8");
  const lines = ledgerText.trimEnd().split("\n");
  assert.equal(lines.length, 42);
  const events = lines.map((line) => JSON.parse(line));
  assert.equal(events.filter(({ eventType }) => eventType === "closure-publication-intent").length, 9);
  assert.equal(events.filter(({ eventType }) => eventType === "closure-publication-complete").length, 9);
  for (let index = 0; index < events.length; index += 1) {
    assert.equal(events[index].sequence, index + 1);
    assert.equal(events[index].previousEventHash, index === 0 ? "0".repeat(64) : events[index - 1].contentHash);
  }
  await assert.rejects(runner.runOperation({ operation: "normalize", requests, execute: async () => { throw new Error("must not run"); } }), { code: "S06_OPERATION_ALREADY_REGISTERED" });
});

test("Slice 06 runner preserves spawned failure observation, stops without retry, and emits no output closure", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-failure-"));
  let calls = 0;
  const runner = createSlice06DiagnosticRunner({ resultsRoot, validators, clock: clock() });
  const run = await runner.runOperation({
    operation: "normalize", requests: requestsFor(),
    execute: async ({ startedAt }) => {
      calls += 1;
      throw Object.assign(new Error("runtime drift"), { code: "S06_WORKER_RUNTIME_VERSION_MISMATCH", workerObservation: workerObservation(startedAt) });
    },
  });
  assert.equal(calls, 1);
  assert.equal(run.summary.overallStatus, "protocol-failed");
  assert.equal(run.terminalResults[0].workerInvoked, true);
  assert.notEqual(run.terminalResults[0].workerFailureEnvelopeRef, null);
  assert.equal(run.terminalResults.slice(1).every(({ status, attempt }) => status === "inconclusive" && attempt.attemptNumber === 1), true);
  const failureRoot = path.join(resultsRoot, "failures", "normalize", "applicable-alpha", "r1");
  assert.deepEqual((await readdir(failureRoot)).sort(), ["terminal-result.json", "worker-failure-envelope.json", "worker-observation.json"]);
  assert.equal(await exists(path.join(resultsRoot, "specimens")), false);
  assert.equal(await exists(path.join(resultsRoot, "quarantine")), false);
});

test("Slice 06 runner rejects replay-mixed records and retains the invoked worker observation", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-replay-"));
  const runner = createSlice06DiagnosticRunner({ resultsRoot, validators, clock: clock() });
  const run = await runner.runOperation({
    operation: "normalize", requests: requestsFor(),
    execute: async ({ request, startedAt }) => fakeExecution(request, startedAt, { tamperAttempt: true }),
  });
  assert.equal(run.terminalResults[0].status, "protocol-failed");
  assert.equal(run.terminalResults[0].reasonCode, "S06_DIAGNOSTIC_CLOSURE_BINDING_MISMATCH");
  assert.notEqual(run.terminalResults[0].workerFailureEnvelopeRef, null);
  assert.equal(await exists(path.join(resultsRoot, "specimens")), false);
});

test("Slice 06 runner fails hard after a committed closure if completion recording is interrupted", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-reconcile-"));
  const runner = createSlice06DiagnosticRunner({
    resultsRoot, validators, clock: clock(),
    publicationCompletionHook: async () => { throw new Error("synthetic append fault"); },
  });
  await assert.rejects(runner.runOperation({
    operation: "normalize", requests: requestsFor(),
    execute: async ({ request, startedAt }) => {
      if (request.expectedDisposition === "preflight-reject") throw Object.assign(new Error("sentinel"), { code: request.expectedStableErrorCode, workerObservation: null });
      return fakeExecution(request, startedAt);
    },
  }), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
  const committed = path.join(resultsRoot, "specimens", "normalize", "applicable-alpha", "r1");
  assert.equal(await exists(path.join(committed, "terminal-result.json")), true);
  assert.equal(await exists(path.join(resultsRoot, "failures")), false);
  const events = (await readFile(path.join(resultsRoot, "ledger", "normalize.ndjson"), "utf8")).trimEnd().split("\n").map(JSON.parse);
  assert.equal(events.at(-1).eventType, "closure-publication-intent");
  assert.equal(events.some(({ eventType }) => eventType === "closure-publication-complete"), false);
});

test("Slice 06 runner also fails hard between completion and terminal ledger events", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-terminal-event-"));
  const runner = createSlice06DiagnosticRunner({
    resultsRoot, validators, clock: clock(),
    publicationCompletionHook: async ({ phase }) => { if (phase === "before-terminal-event") throw new Error("synthetic terminal-event fault"); },
  });
  await assert.rejects(runner.runOperation({
    operation: "normalize", requests: requestsFor(),
    execute: async ({ request, startedAt }) => fakeExecution(request, startedAt),
  }), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
  assert.equal(await exists(path.join(resultsRoot, "specimens", "normalize", "applicable-alpha", "r1", "terminal-result.json")), true);
  assert.equal(await exists(path.join(resultsRoot, "failures")), false);
  const events = (await readFile(path.join(resultsRoot, "ledger", "normalize.ndjson"), "utf8")).trimEnd().split("\n").map(JSON.parse);
  assert.equal(events.at(-1).eventType, "closure-publication-complete");
  assert.equal(events.some(({ eventType }) => eventType === "attempt-terminal"), false);
});

test("Slice 06 runner fails hard if a committed worker-failure closure loses its terminal ledger event", async () => {
  const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-failure-event-"));
  const runner = createSlice06DiagnosticRunner({
    resultsRoot, validators, clock: clock(),
    publicationCompletionHook: async ({ phase }) => { if (phase === "before-terminal-event") throw new Error("synthetic failure terminal-event fault"); },
  });
  await assert.rejects(runner.runOperation({
    operation: "normalize", requests: requestsFor(),
    execute: async ({ startedAt }) => {
      throw Object.assign(new Error("worker failed"), { code: "S06_WORKER_EXIT_NONZERO", workerObservation: workerObservation(startedAt) });
    },
  }), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
  assert.equal(await exists(path.join(resultsRoot, "failures", "normalize", "applicable-alpha", "r1", "terminal-result.json")), true);
  assert.equal(await exists(path.join(resultsRoot, "specimens")), false);
  assert.equal(await exists(path.join(resultsRoot, "quarantine")), false);
  const events = (await readFile(path.join(resultsRoot, "ledger", "normalize.ndjson"), "utf8")).trimEnd().split("\n").map(JSON.parse);
  assert.equal(events.some(({ eventType }) => eventType === "attempt-terminal"), false);
});

test("Slice 06 post-rename durability uncertainty never creates a second terminal", async (t) => {
  await t.test("five-role output closure", async () => {
    const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-output-sync-"));
    const runner = createSlice06DiagnosticRunner({
      resultsRoot, validators, clock: clock(),
      postRenameSyncHook: async ({ closureKind }) => { if (closureKind === "five-role-output") throw new Error("synthetic parent sync fault"); },
    });
    await assert.rejects(runner.runOperation({
      operation: "normalize", requests: requestsFor(),
      execute: async ({ request, startedAt }) => fakeExecution(request, startedAt),
    }), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
    assert.equal(await exists(path.join(resultsRoot, "specimens", "normalize", "applicable-alpha", "r1", "terminal-result.json")), true);
    assert.equal(await exists(path.join(resultsRoot, "failures")), false);
  });

  await t.test("three-role worker-failure closure", async () => {
    const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-failure-sync-"));
    const runner = createSlice06DiagnosticRunner({
      resultsRoot, validators, clock: clock(),
      postRenameSyncHook: async ({ closureKind }) => { if (closureKind === "three-role-worker-failure") throw new Error("synthetic parent sync fault"); },
    });
    await assert.rejects(runner.runOperation({
      operation: "normalize", requests: requestsFor(),
      execute: async ({ startedAt }) => {
        throw Object.assign(new Error("worker failed"), { code: "S06_WORKER_EXIT_NONZERO", workerObservation: workerObservation(startedAt) });
      },
    }), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
    assert.equal(await exists(path.join(resultsRoot, "failures", "normalize", "applicable-alpha", "r1", "terminal-result.json")), true);
    assert.equal(await exists(path.join(resultsRoot, "specimens")), false);
    assert.equal(await exists(path.join(resultsRoot, "quarantine")), false);
  });
});

test("Slice 06 pixel determinism distinguishes byte variance, pixel variance, and unknown decoding", async (t) => {
  async function characterize(options) {
    const resultsRoot = await mkdtemp(path.join(tmpdir(), "sis-s06-pixels-"));
    const runner = createSlice06DiagnosticRunner({ resultsRoot, validators, clock: clock() });
    return runner.runOperation({
      operation: "normalize", requests: requestsFor(),
      execute: async ({ request, startedAt }) => {
        if (request.expectedDisposition === "preflight-reject") throw Object.assign(new Error("sentinel"), { code: request.expectedStableErrorCode, workerObservation: null });
        return fakeExecution(request, startedAt, options);
      },
    });
  }
  await t.test("different encoded bytes with identical decoded pixels", async () => {
    const { summary } = await characterize({ varyBytes: true, pixelMode: "same" });
    assert.equal(summary.allOutputBytesDeterministic, false);
    assert.equal(summary.allPixelsDeterministic, true);
  });
  await t.test("observed decoded pixel mismatch", async () => {
    const { summary } = await characterize({ pixelMode: "different" });
    assert.equal(summary.allPixelsDeterministic, false);
  });
  await t.test("a missing decoded hash remains unknown", async () => {
    const { summary } = await characterize({ pixelMode: "unknown" });
    assert.equal(summary.allPixelsDeterministic, null);
    assert.equal(summary.caseResults.find(({ sourceId }) => sourceId === "applicable-alpha").pixelDeterministic, null);
  });
});
