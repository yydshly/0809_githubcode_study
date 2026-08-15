import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { canonicalBytesSlice10, buildSlice10DefinitionPreview } from "../scripts/research-generate-slice10.mjs";
import { runRegisteredSlice10Calibration } from "../scripts/research-run-slice10.mjs";

const TEST_UTC = "2026-08-16T03:00:00.000Z";
const H = "a".repeat(64);
const REF = (id, pathValue = `${id}.json`) => ({ path: pathValue, id, contentHash: H, byteLength: 10, fileSha256: H });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function admittedContext() {
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  const index = structuredClone(built.index);
  index.id = "DEFINITION-INDEX-SLICE10@0.10.0";
  index.definitionState = "definition-frozen-results-zero";
  index.runnerRef = { id: "RUNNER-OPEN-CALIBRATION@0.10.0", version: "0.10.0", path: "scripts/research-calibration-runner-slice10.mjs", implementationSha256: H };
  index.resultProtocol = {
    driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 96, plannedAttempts: 288,
    replacements: 0, resultsRoot: "results/open-calibration",
    ordinaryCompleteNonPassStopsOtherOperation: false, globalProtocolUncertaintyStopsAll: true,
  };
  const candidate = JSON.parse(built.fileMap.get(index.candidateRef.path));
  const indexBytes = canonicalBytesSlice10(index);
  const definitionRef = {
    path: "definition-index.v0.10.0.json", id: index.id, contentHash: index.contentHash,
    byteLength: indexBytes.length, fileSha256: sha256(indexBytes),
  };
  return { built, context: { definitionRoot: "unused", projectRoot: path.resolve("."), index, indexBytes, fileMap: built.fileMap, runtime: JSON.parse(built.fileMap.get(index.runtimeRef.path)), candidate }, definitionRef };
}

function fakeRawExecutorFactory() { return { async execute() { throw new Error("operationRunner fake must not invoke raw executor"); } }; }

test("registered Slice 10 driver admits one invocation and sequences two independent operation runs", async () => {
  const { context, definitionRef } = await admittedContext();
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-registered-"));
  const calls = [];
  const report = await runRegisteredSlice10Calibration({
    definitionRoot: "unused", projectRoot: path.resolve("."), resultsRoot: path.join(parent, "results"),
    validateDefinition: async () => ({ valid: true, definitionRef, postRun: null }),
    loadDefinitionContext: async () => context, gitAdmission: async () => ({ clean: true }),
    rawExecutorFactory: fakeRawExecutorFactory, runtimeEndObserver: async () => REF("runtime-end"),
    operationRunner: async (args) => {
      calls.push(args);
      return { status: "calibration-complete-pass", globalStop: null, summary: { overallStatus: "calibration-complete-pass" } };
    },
  });
  assert.deepEqual(calls.map((item) => [item.operation, item.cases.length]), [["normalize", 48], ["export", 48]]);
  assert.equal(report.actualOperationRuns, 2);
  assert.equal(report.calibrationAuthorized, false);
  assert.equal(report.c1, 0);
});

test("ordinary complete non-pass does not erase the separately preregistered export run", async () => {
  const { context, definitionRef } = await admittedContext();
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-registered-nonpass-"));
  const operations = [];
  const report = await runRegisteredSlice10Calibration({
    definitionRoot: "unused", projectRoot: path.resolve("."), resultsRoot: path.join(parent, "results"),
    validateDefinition: async () => ({ valid: true, definitionRef, postRun: null }), loadDefinitionContext: async () => context,
    gitAdmission: async () => ({ clean: true }), rawExecutorFactory: fakeRawExecutorFactory,
    runtimeEndObserver: async () => REF("runtime-end"), operationRunner: async ({ operation }) => {
      operations.push(operation);
      return { status: operation === "normalize" ? "calibration-complete-non-pass" : "calibration-complete-pass", globalStop: null, summary: {} };
    },
  });
  assert.deepEqual(operations, ["normalize", "export"]);
  assert.equal(report.actualOperationRuns, 2);
});

test("protocol uncertainty stops before export registration and reports actual counts", async () => {
  const { context, definitionRef } = await admittedContext();
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-registered-stop-"));
  let calls = 0;
  const report = await runRegisteredSlice10Calibration({
    definitionRoot: "unused", projectRoot: path.resolve("."), resultsRoot: path.join(parent, "results"),
    validateDefinition: async () => ({ valid: true, definitionRef, postRun: null }), loadDefinitionContext: async () => context,
    gitAdmission: async () => ({ clean: true }), rawExecutorFactory: fakeRawExecutorFactory,
    runtimeEndObserver: async () => REF("runtime-end"), operationRunner: async () => {
      calls += 1;
      return { status: "protocol-failed", globalStop: { status: "protocol-failed", reasonCode: "S10_RUNTIME_DRIFT" }, summary: null };
    },
  });
  assert.equal(calls, 1);
  assert.equal(report.actualOperationRuns, 1);
  assert.equal(report.plannedOperationRuns, 2);
});

test("definition denial, dirty Git and an existing result root stop before operation work", async () => {
  const { context, definitionRef } = await admittedContext();
  let runnerCalls = 0;
  const base = {
    definitionRoot: "unused", projectRoot: path.resolve("."), loadDefinitionContext: async () => context,
    rawExecutorFactory: fakeRawExecutorFactory, runtimeEndObserver: async () => REF("runtime-end"),
    operationRunner: async () => { runnerCalls += 1; },
  };
  await assert.rejects(runRegisteredSlice10Calibration({ ...base, validateDefinition: async () => ({ valid: false }) }), { code: "S10_DEFINITION_ADMISSION_DENIED" });
  await assert.rejects(runRegisteredSlice10Calibration({
    ...base, validateDefinition: async () => ({ valid: true, definitionRef, postRun: null }),
    gitAdmission: async () => { throw Object.assign(new Error("dirty"), { code: "S10_GIT_ADMISSION_DENIED" }); },
  }), { code: "S10_GIT_ADMISSION_DENIED" });
  const existing = await mkdtemp(path.join(os.tmpdir(), "s10-registered-existing-"));
  await assert.rejects(runRegisteredSlice10Calibration({
    ...base, resultsRoot: existing, validateDefinition: async () => ({ valid: true, definitionRef, postRun: null }), gitAdmission: async () => ({ clean: true }),
  }), { code: "S10_RESULTS_ROOT_ALREADY_EXISTS" });
  assert.equal(runnerCalls, 0);
});

test("registered driver requires a central validator and durable runtime-end observer", async () => {
  await assert.rejects(runRegisteredSlice10Calibration(), { code: "S10_REGISTERED_DRIVER_CONFIGURATION_INVALID" });
});
