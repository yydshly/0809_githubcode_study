import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  Slice06ExecutionError,
  buildSlice06RegisteredRequests,
  collectSlice06GitState,
  createSlice06AttemptExecutor,
  parseSlice06ExecutionCli,
  runSlice06RegisteredDiagnostic,
} from "../scripts/research-execute-slice06.mjs";
import {
  validateDiagnosticEnvelopeSlice06,
  verifyOutputBytesSlice06,
} from "../scripts/research-diagnostic-png-oracle-slice06.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function recordRef(id, suffix) {
  return { id, contentHash: HASH_A, path: `machine/${suffix}.json`, byteLength: 11, fileSha256: HASH_B };
}
function impl(id, version = "0.6.0") { return { id, version, path: "scripts/fake.mjs", implementationSha256: HASH_C }; }

function operationBundle(operation) {
  const entries = [1, 2, 3, 4].map((number) => ({
    sourceId: `source.s06.${operation}.diagnostic.00${number}`,
    expectedDisposition: number === 4 ? "preflight-reject" : "applicable",
    expectedStableErrorCode: number === 4
      ? operation === "normalize" ? "S06_INPUT_SRGB_REQUIRED" : "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID"
      : null,
    repetitions: 3,
  }));
  return {
    contract: { ref: recordRef(`CC-CAP02-${operation.toUpperCase()}-PNG@0.6.0`, `${operation}-contract`), record: { operation } },
    plan: { ref: recordRef(`PLAN-${operation}@0.6.0`, `${operation}-plan`), record: { operation } },
    preregistration: {
      ref: recordRef(`PREREG-DIAGNOSTIC-${operation.toUpperCase()}-PNG@0.6.0`, `${operation}-prereg`),
      record: { operation, runIdentity: { runId: `run.slice06.open-diagnostic.${operation}.frozen`, sessionId: `session.slice06.open-diagnostic.${operation}.frozen`, invocationLimit: 1 } },
    },
    manifest: {
      ref: recordRef(`MANIFEST-DIAGNOSTIC-${operation.toUpperCase()}@0.6.0`, `${operation}-manifest`),
      record: { operation, runIdentity: { runId: `run.slice06.open-diagnostic.${operation}.frozen`, sessionId: `session.slice06.open-diagnostic.${operation}.frozen` }, entries },
    },
    sources: entries.map((entry, index) => ({
      entry,
      ref: recordRef(entry.sourceId, `sources/${operation}-${index + 1}`),
      record: { sourceId: entry.sourceId, operation },
    })),
  };
}

function fakeContext() {
  const rightsRef = recordRef("RIGHTS-SLICE05-OPEN-SYNTHETIC-REUSE@0.6.0", "rights");
  const retentionRef = recordRef("RETENTION-OPEN-DIAGNOSTIC@0.6.0", "retention");
  const operations = new Map([["normalize", operationBundle("normalize")], ["export", operationBundle("export")]]);
  for (const bundle of operations.values()) {
    for (const source of bundle.sources) {
      source.record.rightsRef = rightsRef;
      source.record.retentionPolicyRef = retentionRef;
    }
  }
  return {
    definitionRef: recordRef("DEFINITION-INDEX-SLICE06@0.6.0", "definition"),
    candidate: { ref: recordRef("REG-NORM-SHARP@0.6.0", "candidate"), record: {} },
    runtime: { ref: recordRef("RUNTIME-SHARP-WIN32-X64@0.6.0", "runtime"), record: {} },
    hardware: { ref: recordRef("HARDWARE-WIN32-X64@0.6.0", "hardware"), record: {} },
    rights: {
      ref: rightsRef,
      record: {
        oracleRightsValues: {
          assetClass: "project-original-deterministic-synthetic-open-research-fixtures",
          containsRealPerson: false, realUserPhotosUsed: false, thirdPartyAssetsUsed: false, modelWeightsUsed: false,
          candidateDerivativeRepositoryRetention: true, diagnosticPublicDisplay: true,
        },
      },
    },
    retention: {
      ref: retentionRef,
      record: {
        retainedValues: {
          state: "retained", reasonCode: "S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC",
          maxPerOutputBytes: 1048576, maxSessionBytes: 18874368,
        },
      },
    },
    implementationByRole: new Map([
      ["candidate-adapter", impl("ADAPTER-DIAGNOSTIC-SHARP@0.6.0")],
      ["candidate-worker", impl("WORKER-DIAGNOSTIC-SHARP@0.6.0")],
      ["independent-diagnostic-oracle", impl("ORACLE-INDEPENDENT-PNG-DIAGNOSTIC@0.6.0")],
    ]),
    operations,
  };
}

function clock() {
  let now = Date.parse("2026-08-15T08:00:00.000Z");
  return () => new Date(now++).toISOString();
}

async function harness({ rootExists = false, admission = { valid: true }, runOperation } = {}) {
  const temp = await mkdtemp(path.join(tmpdir(), "sis-s06-execute-"));
  const resultsRoot = path.join(temp, "results", "open-diagnostic");
  if (rootExists) await mkdir(resultsRoot, { recursive: true });
  const context = fakeContext();
  const calls = [];
  const executed = [];
  let definitionOptions;
  const defaultRunOperation = async ({ operation, requests, execute }) => {
    calls.push(operation);
    for (const request of requests) executed.push(await execute({ request, startedAt: "2026-08-15T08:00:00.000Z" }));
    return {
      terminalResults: [], terminalPaths: [], summaryRelativePath: `summaries/${operation}.json`,
      summary: { overallStatus: "characterization-complete", contentHash: operation === "normalize" ? HASH_A : HASH_B },
    };
  };
  const dependencies = {
    assertCanonicalPaths: () => true,
    assertDefinition: async (options) => {
      calls.push("definition"); definitionOptions = options;
      return { valid: true, definitionRef: context.definitionRef, options };
    },
    collectGitState: async () => {
      calls.push("git");
      return {
        headCommit: "1".repeat(40), originMainCommit: "1".repeat(40), worktreeClean: true,
        definitionIndexTracked: true, definitionIndexCommit: "2".repeat(40), definitionIndexReachableFromHead: true,
      };
    },
    validateAdmission: async ({ definitionReport, gitState }) => {
      calls.push("admission"); assert.equal(definitionReport.valid, true);
      assert.deepEqual(Object.keys(gitState).sort(), [
        "definitionIndexCommit", "definitionIndexReachableFromHead", "definitionIndexTracked",
        "headCommit", "originMainCommit", "worktreeClean",
      ]);
      return admission;
    },
    loadContext: async () => { calls.push("context"); return context; },
    claimResultsRoot: async (root) => { calls.push("claim"); await mkdir(path.dirname(root), { recursive: true }); await mkdir(root); },
    createAdapter: async () => ({ fake: true }),
    createAttemptExecutor: async () => async ({ request }) => { calls.push(`execute:${request.operation}`); return request.requestId; },
    createRunner: async () => ({ runOperation: runOperation ?? defaultRunOperation }),
    cleanupStaging: async () => { calls.push("cleanup"); },
    finalizeOperation: async ({ operation }) => { calls.push(`close:${operation}`); return { operationFiles: [], closeRelativePath: `closes/${operation}.json` }; },
    verifySessionClosure: async () => { calls.push("closure"); },
  };
  const invoke = () => runSlice06RegisteredDiagnostic({
    projectRoot: temp, sliceRoot: path.join(temp, "slice"), resultsRoot, repositoryRoot: temp,
    clock: clock(), dependencies,
  });
  return { invoke, calls, executed, context, resultsRoot, getDefinitionOptions: () => definitionOptions };
}

test("Slice 06 registered driver exposes only the explicit diagnostic CLI", () => {
  assert.deepEqual(parseSlice06ExecutionCli(["--diagnostic"]), { mode: "open-diagnostic" });
  for (const args of [[], ["--smoke"], ["--calibration"], ["--diagnostic", "normalize"], ["--diagnostic", "--results-root", "tmp"]]) {
    assert.throws(() => parseSlice06ExecutionCli(args), { code: "S06_CLI_ARGUMENT_INVALID" });
  }
});

test("Slice 06 request builder emits two independent new 4x3 denominators with exact zero-evidence refs", () => {
  const context = fakeContext();
  const normalize = buildSlice06RegisteredRequests({ context, operation: "normalize", clock: clock() });
  const exportRequests = buildSlice06RegisteredRequests({ context, operation: "export", clock: clock() });
  assert.equal(normalize.length, 12); assert.equal(exportRequests.length, 12);
  assert.equal(new Set([...normalize, ...exportRequests].map(({ requestId }) => requestId)).size, 24);
  assert.equal(new Set([...normalize, ...exportRequests].map(({ attempt }) => attempt.idempotencyKey)).size, 24);
  for (const [operation, requests] of [["normalize", normalize], ["export", exportRequests]]) {
    assert.equal(new Set(requests.map(({ attempt }) => attempt.runId)).size, 1);
    assert.equal(requests.filter(({ expectedDisposition }) => expectedDisposition === "applicable").length, 9);
    assert.equal(requests.filter(({ expectedDisposition }) => expectedDisposition === "preflight-reject").length, 3);
    for (const request of requests) {
      assert.equal(request.operation, operation); assert.equal(request.attempt.attemptNumber, 1);
      assert.equal(request.attempt.partition, "diagnostic"); assert.equal(request.attempt.sourceId.includes("s05"), false);
      assert.equal(request.workerRef.id, "WORKER-DIAGNOSTIC-SHARP@0.6.0");
      assert.equal(request.evidenceBoundary.gateBDecisionAuthority, false);
      assert.equal(request.evidenceBoundary.calibrationAuthorized, false);
      assert.equal(request.evidenceBoundary.releaseAllowlist, "none");
      assert.equal(request.evidenceBoundary.releaseRegistered, 0); assert.equal(request.evidenceBoundary.releaseApproved, 0);
    }
  }
});

test("Slice 06 attempt executor emits only precommit lifecycle facts before the runner publishes", async () => {
  const context = fakeContext();
  const [request] = buildSlice06RegisteredRequests({ context, operation: "normalize", clock: clock() });
  const outputBytes = await readFile(new URL("../research/slice-05/assets/open/export-smoke/raw.s05.export.smoke.001.png", import.meta.url));
  const artifact = JSON.parse(await readFile(new URL("../research/slice-05/artifacts/normalized-inputs/export-smoke/normalized.s05.export.smoke.001.json", import.meta.url), "utf8"));
  const expected = {
    decodedPixelSha256: artifact.bytes.decodedPixelSha256,
    width: artifact.image.width, height: artifact.image.height,
    pixelLayout: artifact.image.pixelLayout, colorSpace: artifact.image.colorSpace,
    orientation: artifact.image.orientation, alphaMode: artifact.image.alphaMode,
    alphaPresent: artifact.image.alphaPresent, metadataPolicy: artifact.image.metadataPolicy,
    pngFilterPolicy: artifact.image.pngFilterPolicy, interlace: artifact.image.interlace,
    animation: artifact.image.animation,
  };
  const verification = verifyOutputBytesSlice06({ operation: "normalize", bytes: outputBytes, expected });
  const workerObservation = {
    message: { received: true, receivedAt: "2026-08-15T08:00:00.050Z", protocolVersion: "sharp-worker.slice06.v0", status: "succeeded", payloadSha256: HASH_A },
    runtime: { payloadSha256: HASH_B, matchesFrozen: true },
    telemetry: { source: "worker-self-reported-not-hard-isolation", workerDurationMs: 90, resourceUsage: { maxRssKiB: 2048, userCpuMicros: 500, systemCpuMicros: 100 } },
    parentWall: {
      startedAt: "2026-08-15T08:00:00.000Z", messageAt: "2026-08-15T08:00:00.050Z",
      exitedAt: "2026-08-15T08:00:00.090Z", finishedAt: "2026-08-15T08:00:00.100Z", durationMs: 100,
    },
    exit: { confirmed: true, exitCode: 0, signal: null, terminationRequested: false },
  };
  const lifecycleTimes = ["2026-08-15T08:00:00.200Z", "2026-08-15T08:00:00.300Z", "2026-08-15T08:00:00.400Z"];
  const execute = createSlice06AttemptExecutor({
    context,
    adapter: {
      normalize: async () => ({
        status: "oracle-pass-diagnostic", operation: "normalize", outputBytes, verification, workerObservation,
      }),
    },
    clock: () => lifecycleTimes.shift(),
    loadMaterial: async () => ({
      bytes: outputBytes,
      facts: {
        mime: "image/png", byteLength: outputBytes.byteLength, fileSha256: artifact.bytes.fileSha256,
        decodedPixelSha256: artifact.bytes.decodedPixelSha256, alphaPresent: artifact.image.alphaPresent,
      },
    }),
  });
  const result = await execute({ request });
  assert.deepEqual(result.diagnosticEnvelope.publication, {
    state: "not-published", transactionId: null, publishedAt: null, fileRoles: [],
  });
  assert.deepEqual(result.diagnosticEnvelope.cleanup, { state: "unknown", stagingRemoved: null, confirmedAt: null });
  assert.equal(validateDiagnosticEnvelopeSlice06(result.diagnosticEnvelope), result.diagnosticEnvelope);
  const tampered = structuredClone(result.diagnosticEnvelope);
  tampered.cleanup = { state: "confirmed", stagingRemoved: true, confirmedAt: "2026-08-15T08:00:00.400Z" };
  assert.throws(() => validateDiagnosticEnvelopeSlice06(tampered), /CONTENT_HASH_MISMATCH/u);
});

test("Slice 06 driver admits first, claims once, and completes both operations in one invocation", async () => {
  const { invoke, calls, executed, getDefinitionOptions } = await harness();
  const result = await invoke();
  assert.equal(result.status, "characterization-complete");
  assert.equal(result.invocationCount, 1); assert.equal(result.maximumDriverInvocations, 1);
  assert.equal(result.plannedRegisteredOperationRuns, 2); assert.equal(result.actualRegisteredOperationRuns, 2);
  assert.equal(result.plannedSourceUnits, 8); assert.equal(result.actualRegisteredSourceUnits, 8);
  assert.equal(result.plannedAttempts, 24); assert.equal(result.actualRegisteredAttempts, 24); assert.equal(result.replacementAttempts, 0);
  assert.deepEqual(calls.slice(0, 5), ["definition", "git", "admission", "context", "claim"]);
  assert.deepEqual(getDefinitionOptions(), {
    projectRoot: path.dirname(path.dirname(result.resultsRoot)),
    sliceRoot: path.join(path.dirname(path.dirname(result.resultsRoot)), "slice"),
    requirePins: true, recheckRuntime: true, regenerate: true,
  });
  assert.deepEqual(calls.filter((value) => value === "normalize" || value === "export"), ["normalize", "export"]);
  assert.equal(executed.length, 24);
  assert.deepEqual(calls.filter((value) => value.startsWith("close:")), ["close:normalize", "close:export"]);
  assert.equal(result.gateBDecisionAuthority, false); assert.equal(result.calibrationAuthorized, false); assert.equal(result.productSupport, false);
});

test("central admission denial creates no result root and invokes no runner", async () => {
  const { invoke, calls, resultsRoot } = await harness({ admission: { valid: false } });
  await assert.rejects(invoke(), { code: "S06_EXECUTION_ADMISSION_DENIED" });
  assert.equal(calls.includes("claim"), false);
  assert.equal(calls.some((value) => value === "normalize" || value === "export"), false);
  await assert.rejects(mkdir(resultsRoot), (error) => error.code !== "EEXIST");
});

test("any partial operation/root is a permanent replay stop before request execution", async () => {
  const { invoke, calls } = await harness({ rootExists: true });
  await assert.rejects(invoke(), { code: "S06_RESULTS_ALREADY_EXIST" });
  assert.equal(calls.includes("claim"), false);
  assert.equal(calls.some((value) => value.startsWith("execute:")), false);
});

test("internal publication reconciliation unknown preserves the partial root with no fake close or second operation", async () => {
  let invocations = 0;
  const operations = [];
  const { invoke, calls } = await harness({
    runOperation: async ({ operation }) => {
      invocations += 1; operations.push(operation);
      throw new Slice06ExecutionError("S06_PUBLICATION_RECONCILIATION_UNKNOWN", "fake irreversible failure");
    },
  });
  await assert.rejects(invoke(), { code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN" });
  assert.equal(invocations, 1); assert.deepEqual(operations, ["normalize"]);
  assert.equal(calls.includes("cleanup"), false); assert.equal(calls.some((value) => value.startsWith("close:")), false);
  await assert.rejects(invoke(), { code: "S06_RESULTS_ALREADY_EXIST" });
  assert.equal(invocations, 1);
});

test("a non-complete normalize close globally stops export registration without replacement", async (t) => {
  for (const stoppedStatus of ["protocol-failed", "inconclusive"]) {
    await t.test(stoppedStatus, async () => {
      const seen = [];
      const { invoke, calls } = await harness({
        runOperation: async ({ operation, requests }) => {
          seen.push({ operation, attempts: requests.map(({ attempt }) => attempt.attemptNumber) });
          return {
            terminalResults: [], terminalPaths: [], summaryRelativePath: `summaries/${operation}.json`,
            summary: { overallStatus: stoppedStatus, contentHash: HASH_A },
          };
        },
      });
      const result = await invoke();
      assert.equal(result.status, stoppedStatus);
      assert.deepEqual(seen.map(({ operation }) => operation), ["normalize"]);
      assert.deepEqual(seen[0].attempts, Array(12).fill(1));
      assert.equal(result.plannedRegisteredOperationRuns, 2); assert.equal(result.actualRegisteredOperationRuns, 1);
      assert.equal(result.plannedSourceUnits, 8); assert.equal(result.actualRegisteredSourceUnits, 4);
      assert.equal(result.plannedAttempts, 24); assert.equal(result.actualRegisteredAttempts, 12);
      assert.deepEqual(calls.filter((value) => value.startsWith("close:")), ["close:normalize"]);
    });
  }
});

test("Slice 05 request/source identities cannot be replayed into the Slice 06 driver", () => {
  const context = fakeContext();
  const bundle = context.operations.get("normalize");
  bundle.sources[0].entry.sourceId = "raw.s05.normalize.smoke.001";
  bundle.sources[0].record.sourceId = "raw.s05.normalize.smoke.001";
  assert.throws(() => buildSlice06RegisteredRequests({ context, operation: "normalize", clock: clock() }), { code: "S06_REQUEST_BUILD_INVALID" });
});

test("Git admission observation is exact, clean, tracked and definition-commit reachable", async () => {
  const calls = [];
  const repositoryRoot = path.parse(process.cwd()).root;
  const definitionIndex = path.join(repositoryRoot, "repo", "projects", "single-image-studio", "research", "slice-06", "definition-index.v0.6.0.json");
  const responses = new Map([
    ["status --porcelain=v1 --untracked-files=all", ""],
    ["rev-parse HEAD", "1".repeat(40)],
    ["rev-parse refs/remotes/origin/main", "1".repeat(40)],
    ["log -1 --format=%H -- repo/projects/single-image-studio/research/slice-06/definition-index.v0.6.0.json", "2".repeat(40)],
  ]);
  const gitCommand = async (_root, args) => {
    const key = args.join(" "); calls.push(key);
    if (key.startsWith("ls-files --error-unmatch")) return "tracked";
    if (key.startsWith("merge-base --is-ancestor")) return "";
    if (!responses.has(key)) throw new Error(`unexpected ${key}`);
    return responses.get(key);
  };
  const state = await collectSlice06GitState({ repositoryRoot, definitionIndex, gitCommand });
  assert.deepEqual(state, {
    headCommit: "1".repeat(40), originMainCommit: "1".repeat(40), worktreeClean: true,
    definitionIndexTracked: true, definitionIndexCommit: "2".repeat(40), definitionIndexReachableFromHead: true,
  });
  assert.equal(calls.some((value) => value.startsWith("merge-base --is-ancestor")), true);
});
