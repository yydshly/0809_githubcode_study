import assert from "node:assert/strict";
import test from "node:test";

import { buildSlice08CasesFromDefinition, runRegisteredSlice08GateB } from "../scripts/research-run-slice08.mjs";

const H = (character) => character.repeat(64);
const ref = (id) => ({ path: `records/${id}.json`, id, contentHash: H("a"), byteLength: 100, fileSha256: H("b") });

function manifest(operation) {
  const codes = operation === "normalize"
    ? [null, null, null, "S08_INPUT_CRC_MISMATCH", "S08_INPUT_SRGB_REQUIRED", "S08_NORMALIZE_SOURCE_DECLARATION_INVALID"]
    : [null, null, null, "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S08_EXPORT_NORMALIZED_ARTIFACT_INVALID"];
  return {
    id: `MANIFEST-S08-${operation}`, operation, contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.8.0" : "CC-CAP02-EXPORT-PNG@0.8.0"),
    entries: codes.map((code, index) => ({
      sourceId: `s08.${operation}.${code ? "rejection" : "applicable"}.${index + 1}`,
      disposition: code ? "rejection" : "applicable", expectedStableErrorCode: code,
      wrapperRef: ref(`s08.${operation}.${code ? "rejection" : "applicable"}.${index + 1}`),
      expectedFactsRef: code ? null : ref(`facts.${operation}.${index + 1}`),
      goldRef: code ? null : ref(`gold.${operation}.${index + 1}`),
    })),
  };
}

test("definition case builder preserves every typed classification field", () => {
  const context = { manifests: { normalize: manifest("normalize") } };
  const cases = buildSlice08CasesFromDefinition(context, "normalize");
  assert.equal(cases.length, 6);
  assert.equal(cases.filter((entry) => entry.disposition === "rejection").length, 3);
  assert.deepEqual(cases.slice(3).map((entry) => entry.expectedStableErrorCode), [
    "S08_INPUT_CRC_MISMATCH", "S08_INPUT_SRGB_REQUIRED", "S08_NORMALIZE_SOURCE_DECLARATION_INVALID",
  ]);
  assert.ok(cases.every((entry) => entry.workerRequestRef.id === entry.sourceRef.id));
});

test("registered driver admits once and passes complete typed cases to both operation runners", async () => {
  const normalize = manifest("normalize");
  const exportManifest = manifest("export");
  const index = {
    resultsState: "not-created",
    resultProtocol: { driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 12, plannedAttempts: 36, replacements: 0 },
    runtimeRef: ref("RUNTIME-S08"), candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.8.0"),
    contractRefs: [normalize.contractRef, exportManifest.contractRef], manifestRefs: [ref(normalize.id), ref(exportManifest.id)],
    workerRef: { id: "WORKER-SHARP-RAW@0.8.0", implementationSha256: H("c") },
  };
  const calls = [];
  const result = await runRegisteredSlice08GateB({
    validateDefinition: async () => ({ valid: true, definitionRef: ref("DEFINITION-S08"), postRun: null }),
    loadDefinitionContext: async () => ({
      index, manifests: { normalize, export: exportManifest },
      runtime: { workerRuntimeCanonicalJson: "{}" }, definitionRoot: "Z:/fake-definition", projectRoot: "Z:/fake-project",
    }),
    gitAdmission: async () => ({ clean: true }),
    rawExecutorFactory: () => ({ execute: async () => { throw new Error("operation runner must not execute material in this fake"); } }),
    operationRunner: async ({ operation, cases, refs }) => {
      calls.push({ operation, cases, refs });
      return { decision: { state: "pass" } };
    },
    definitionRoot: "Z:/fake-definition",
    projectRoot: "Z:/fake-project",
    resultsRoot: "Z:/fake-results",
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((entry) => entry.operation), ["normalize", "export"]);
  assert.ok(calls.every((entry) => entry.cases.length === 6));
  assert.equal(result.calibrationAuthorized, false);
  assert.equal(index.resultProtocol.plannedAttempts, 36);
});

test("registered CLI has one explicit execution token", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../scripts/research-run-slice08.mjs", import.meta.url), "utf8");
  assert.match(source, /--execute-registered-open-smoke/u);
  assert.doesNotMatch(source, /--retry|--calibration|--formal/u);
});
