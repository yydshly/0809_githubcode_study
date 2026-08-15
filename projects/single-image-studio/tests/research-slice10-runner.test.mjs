import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { contentHashSlice10 } from "../scripts/research-calibration-protocol-slice10.mjs";
import { SLICE10_RUNNER_SCHEMA_DOCUMENTS, readSlice10Ledger, runSlice10CalibrationOperation } from "../scripts/research-calibration-runner-slice10.mjs";
import { validateSlice05SchemaInstance } from "../scripts/research-validate-slice05.mjs";

const H = "a".repeat(64);
const REF = (id, pathValue = `${id}.json`) => ({ byteLength: 10, contentHash: H, fileSha256: H, id, path: pathValue });
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 7, 16, 2, 0, 0, tick++)).toISOString();
const runtimeStable = async ({ operation }) => REF(`RUNTIME-END-${operation.toUpperCase()}@0.10.0`, `runtime-end/${operation}.json`);

function assertRecursivelyClosed(node, location = "$") {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((entry, index) => assertRecursivelyClosed(entry, `${location}[${index}]`));
  if (node.type === "object") {
    assert.equal(node.additionalProperties, false, `${location} is open`);
    assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${location} required mismatch`);
  }
  if (node.type === "array") assert.ok(node.items, `${location} array is open`);
  if (node.properties) for (const [key, child] of Object.entries(node.properties)) assertRecursivelyClosed(child, `${location}.${key}`);
  if (node.items) assertRecursivelyClosed(node.items, `${location}.items`);
  if (node.oneOf) assertRecursivelyClosed(node.oneOf, `${location}.oneOf`);
}

function refs(operation) {
  return {
    admissionRef: REF(`admission.${operation}`), candidateRef: REF("REG-NORM-SHARP-CANONICAL-PNG@0.10.0"),
    contractRef: REF(`CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`),
    preregistrationRef: REF(`PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`),
    runtimeRef: REF("RUNTIME-SHARP-CANONICAL-PNG@0.10.0"),
    workerRef: { id: "WORKER-SHARP-RAW@0.10.0", version: "0.10.0", path: "scripts/worker.mjs", implementationSha256: H },
  };
}

function cases(operation) {
  return Array.from({ length: 48 }, (_, index) => {
    const dev = index < 30;
    const applicable = dev ? index < 18 : index < 36;
    const sourceId = `s10.${operation}.${dev ? "dev" : "defect"}.${String(index + 1).padStart(3, "0")}`;
    return {
      sourceRef: REF(sourceId, `source-lineage/${sourceId}.json`),
      manifestRef: REF(`manifest.${operation}.${dev ? "dev" : "defect"}`, `manifests/${operation}-${dev ? "dev" : "defect"}.json`),
      goldIdentityRef: applicable ? REF(`gold.${sourceId}`, `gold/${sourceId}.json`) : null,
      partition: dev ? "dev/calibration" : "defect/calibration", disposition: applicable ? "applicable" : "rejection",
      expectedStableErrorCode: applicable ? null : operation === "normalize" ? "S10_INPUT_CRC_MISMATCH" : "S10_EXPORT_NORMALIZED_ARTIFACT_INVALID",
    };
  });
}

function executor({ request }) {
  if (request.disposition === "rejection") return {
    kind: "rejection-pass", actualStableErrorCode: request.expectedStableErrorCode, workerInvoked: false,
  };
  const sourceByte = Number.parseInt(request.attempt.sourceId.slice(-3), 10);
  const outputBytes = Buffer.from([137, 80, 78, 71, sourceByte & 255]);
  return {
    kind: "applicable-pass", outputBytes, decodedPixelSha256: request.sourceRef.contentHash,
    oracleFacts: { decodedPixelSha256: request.sourceRef.contentHash, profile: "canonical-png" },
    workerInvoked: true, workerExitConfirmed: true,
  };
}

test("Slice 10 runner schemas are exact-id and recursively strict", () => {
  assert.equal(Object.keys(SLICE10_RUNNER_SCHEMA_DOCUMENTS).length, 5);
  for (const [relativePath, schema] of Object.entries(SLICE10_RUNNER_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-10/${relativePath}`);
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
    assertRecursivelyClosed(schema, relativePath);
  }
});

test("one operation closes all 48x3 attempts with zero retry and deterministic applicable publications", async () => {
  tick = 0;
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-runner-pass-"));
  const root = path.join(parent, "normalize");
  const result = await runSlice10CalibrationOperation({ resultsRoot: root, operation: "normalize", cases: cases("normalize"), refs: refs("normalize"), executeAttempt: executor, verifyRuntimeEnd: runtimeStable, now: clock });
  assert.deepEqual({
    status: result.status,
    passAttemptCount: result.summary.passAttemptCount,
    nonPassAttemptCount: result.summary.nonPassAttemptCount,
    allRegisteredAttemptsPass: result.summary.allRegisteredAttemptsPass,
    allApplicableSourcesDeterministic: result.summary.allApplicableSourcesDeterministic,
    failedCases: result.summary.caseResults.filter((entry) => !entry.allThreePass || !entry.deterministic),
  }, {
    status: "calibration-complete-pass", passAttemptCount: 144, nonPassAttemptCount: 0,
    allRegisteredAttemptsPass: true, allApplicableSourcesDeterministic: true, failedCases: [],
  });
  assert.equal(result.terminalInputs.length, 144);
  assert.equal(result.summary.passAttemptCount, 144);
  assert.equal(result.summary.replacementAttemptCount, 0);
  assert.equal(result.summary.runtimeEndRef.id, "RUNTIME-END-NORMALIZE@0.10.0");
  assert.equal(result.summary.caseResults.length, 48);
  assert.equal(result.summary.caseResults.every((entry) => entry.allThreePass), true);
  assert.equal((await readdir(path.join(root, "requests"))).length, 144);
  assert.equal((await readdir(path.join(root, "claims"))).length, 144);
  assert.equal((await readdir(path.join(root, "closures"))).length, 72);
  assert.equal((await readdir(path.join(root, "terminals"))).length, 72);
  const ledger = await readSlice10Ledger(path.join(root, "ledger.ndjson"));
  assert.equal(ledger.length, 432);
  assert.equal(ledger.at(-1).contentHash, result.ledgerTail);
  const firstPublication = JSON.parse(await readFile(path.join(root, "closures", "request.s10.normalize.s10.normalize.dev.001.r1.a1", "publication.json")));
  assert.equal(firstPublication.publicationState, "prepared-not-committed");
  assert.equal("committedAt" in firstPublication, false);
});

test("one ordinary complete non-pass remains visible but does not shrink the operation denominator", async () => {
  tick = 0;
  let changed = false;
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-runner-nonpass-"));
  const result = await runSlice10CalibrationOperation({
    resultsRoot: path.join(parent, "export"), operation: "export", cases: cases("export"), refs: refs("export"), now: clock,
    verifyRuntimeEnd: runtimeStable, executeAttempt: async (context) => {
      if (!changed && context.request.disposition === "applicable") {
        changed = true;
        return { kind: "non-pass", status: "non-pass", reasonCode: "S10_OUTPUT_ORACLE_REJECTED", actualStableErrorCode: "S10_OUTPUT_ORACLE_REJECTED", workerInvoked: true, workerExitConfirmed: true };
      }
      return executor(context);
    },
  });
  assert.equal(result.status, "calibration-complete-non-pass");
  assert.equal(result.terminalInputs.length, 144);
  assert.equal(result.summary.passAttemptCount, 143);
  assert.equal(result.summary.nonPassAttemptCount, 1);
  assert.equal(result.summary.allRegisteredAttemptsPass, false);
});

test("protocol failure persists one exact terminal then globally stops without replacement", async () => {
  tick = 0;
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-runner-stop-"));
  let calls = 0;
  const result = await runSlice10CalibrationOperation({
    resultsRoot: path.join(parent, "normalize"), operation: "normalize", cases: cases("normalize"), refs: refs("normalize"), now: clock,
    verifyRuntimeEnd: runtimeStable,
    executeAttempt: async () => { calls += 1; throw Object.assign(new Error("runtime drift"), { code: "S10_RUNTIME_DRIFT", workerInvoked: false }); },
  });
  assert.equal(result.status, "protocol-failed");
  assert.equal(result.summary, null);
  assert.equal(result.terminalInputs.length, 1);
  assert.equal(calls, 1);
  assert.equal(result.terminalInputs[0].terminal.reasonCode, "S10_RUNTIME_DRIFT");
  assert.equal((await readdir(path.join(parent, "normalize", "requests"))).length, 1);
});

test("runtime end drift closes no summary and cannot be self-reported as stable", async () => {
  tick = 0;
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-runner-runtime-drift-"));
  const root = path.join(parent, "normalize");
  await assert.rejects(runSlice10CalibrationOperation({
    resultsRoot: root, operation: "normalize", cases: cases("normalize"), refs: refs("normalize"),
    executeAttempt: executor, verifyRuntimeEnd: async () => false, now: clock,
  }), { code: "S10_RUNTIME_END_DRIFT" });
  assert.equal((await readdir(root)).includes("summary.json"), false);
  assert.equal((await readdir(path.join(root, "requests"))).length, 144);
});

test("attempt denominator, partition strata, gold boundary and an existing root fail closed before execution", async () => {
  tick = 0;
  const base = cases("normalize");
  await assert.rejects(runSlice10CalibrationOperation({ resultsRoot: path.join(os.tmpdir(), `s10-bad-${Date.now()}`), operation: "normalize", cases: base.slice(1), refs: refs("normalize"), executeAttempt: executor, verifyRuntimeEnd: runtimeStable, now: clock }), { code: "S10_RUNNER_DENOMINATOR_INVALID" });
  const goldLeak = structuredClone(base);
  goldLeak.find((entry) => entry.disposition === "rejection").goldIdentityRef = REF("gold.illegal");
  await assert.rejects(runSlice10CalibrationOperation({ resultsRoot: path.join(os.tmpdir(), `s10-bad-${Date.now()}-2`), operation: "normalize", cases: goldLeak, refs: refs("normalize"), executeAttempt: executor, verifyRuntimeEnd: runtimeStable, now: clock }), { code: "S10_RUNNER_CASE_INVALID" });
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-existing-"));
  const existing = path.join(parent, "normalize");
  await (await import("node:fs/promises")).mkdir(existing);
  let invoked = false;
  await assert.rejects(runSlice10CalibrationOperation({ resultsRoot: existing, operation: "normalize", cases: base, refs: refs("normalize"), executeAttempt: async () => { invoked = true; }, verifyRuntimeEnd: runtimeStable, now: clock }), { code: "S10_RESULTS_ROOT_ALREADY_EXISTS" });
  assert.equal(invoked, false);
});

test("ledger self-hash and schema-valid terminal bytes cannot be silently rewritten", async () => {
  tick = 0;
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-ledger-"));
  const root = path.join(parent, "normalize");
  await runSlice10CalibrationOperation({ resultsRoot: root, operation: "normalize", cases: cases("normalize"), refs: refs("normalize"), executeAttempt: executor, verifyRuntimeEnd: runtimeStable, now: clock });
  const ledger = await readSlice10Ledger(path.join(root, "ledger.ndjson"));
  const first = structuredClone(ledger[0]);
  first.eventType = "attempt-terminal";
  first.contentHash = contentHashSlice10(first);
  assert.notEqual(first.contentHash, ledger[0].contentHash);
  const terminalPath = path.join(root, "closures", "request.s10.normalize.s10.normalize.dev.001.r1.a1", "terminal.json");
  const terminal = JSON.parse(await readFile(terminalPath));
  const schema = (await import("../scripts/research-calibration-protocol-slice10.mjs")).SLICE10_PROTOCOL_SCHEMA_DOCUMENTS["schemas/calibration-terminal.slice10.v0.schema.json"];
  assert.deepEqual(validateSlice05SchemaInstance(terminal, schema, "terminal"), []);
});
