import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSlice09CasesFromDefinition,
  runRegisteredSlice09GateB,
} from "../scripts/research-run-slice09.mjs";

const H = (character) => character.repeat(64);
const INDEX_BYTES = Buffer.from("fake-index-bytes");
const INDEX_FILE_SHA = createHash("sha256").update(INDEX_BYTES).digest("hex");
const ref = (id, relativePath = `records/${id}.json`) => ({
  path: relativePath, id, contentHash: H("a"), byteLength: 100, fileSha256: H("b"),
});

function manifest(operation) {
  const codes = operation === "normalize"
    ? [null, null, null, "S09_INPUT_CRC_MISMATCH", "S09_INPUT_SRGB_REQUIRED", "S09_NORMALIZE_SOURCE_DECLARATION_INVALID"]
    : [null, null, null, "S09_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S09_EXPORT_NORMALIZED_ARTIFACT_INVALID", "S09_EXPORT_NORMALIZED_ARTIFACT_INVALID"];
  return {
    id: `FM-GATEB-${operation.toUpperCase()}-PNG@0.9.0`, operation,
    contractRef: ref(operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.9.0" : "CC-CAP02-EXPORT-PNG@0.9.0"),
    entries: codes.map((code, index) => {
      const sourceId = `s09.${operation}.${code ? "rejection" : "applicable"}.${index + 1}`;
      return {
        sourceId, disposition: code ? "rejection" : "applicable", expectedStableErrorCode: code,
        wrapperRef: ref(sourceId, `source-lineage/${operation}/${sourceId}.json`),
        goldIdentityLocator: code ? null : {
          path: `gold-identities/${operation}/gold-identity.${sourceId}.json`, id: `gold-identity.${sourceId}`,
        },
      };
    }),
  };
}

function context() {
  const normalize = manifest("normalize");
  const exportManifest = manifest("export");
  const goldIdentityRefs = [normalize, exportManifest].flatMap((item) => item.entries
    .filter((entry) => entry.goldIdentityLocator)
    .map((entry) => ref(entry.goldIdentityLocator.id, entry.goldIdentityLocator.path)));
  return {
    definitionRoot: "Z:/fake-definition", projectRoot: "Z:/fake-project",
    manifests: { normalize, export: exportManifest },
    runtime: { workerRuntimeCanonicalJson: "{}" },
    index: {
      id: "DEFINITION-INDEX-SLICE09@0.9.0", contentHash: H("d"),
      resultsState: "not-created",
      resultProtocol: {
        driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 12,
        plannedAttempts: 36, replacements: 0, resultsRoot: "results/open-smoke",
      },
      runtimeRef: ref("RUNTIME-SHARP-CANONICAL-PNG@0.9.0"),
      candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.9.0"),
      contractRefs: [normalize.contractRef, exportManifest.contractRef],
      manifestRefs: [ref(normalize.id), ref(exportManifest.id)], goldIdentityRefs,
      workerRef: { id: "WORKER-SHARP-RAW@0.9.0", implementationSha256: H("c") },
    },
  };
}

test("definition case builder joins locator-only manifests to six independently pinned gold identities", () => {
  const value = context();
  const cases = buildSlice09CasesFromDefinition(value, "normalize");
  assert.equal(cases.length, 6);
  assert.equal(cases.filter((entry) => entry.goldIdentityRef).length, 3);
  assert.equal(cases.filter((entry) => entry.goldIdentityRef === null).length, 3);
  assert.deepEqual(cases.slice(3).map((entry) => entry.expectedStableErrorCode), [
    "S09_INPUT_CRC_MISMATCH", "S09_INPUT_SRGB_REQUIRED", "S09_NORMALIZE_SOURCE_DECLARATION_INVALID",
  ]);
});

test("registered admission passes both complete typed operation sets without invoking real work", async () => {
  const value = context();
  const calls = [];
  const result = await runRegisteredSlice09GateB({
    validateDefinition: async () => ({ valid: true, definitionRef: {
      path: "definition-index.v0.9.0.json", id: value.index.id, contentHash: value.index.contentHash,
      byteLength: INDEX_BYTES.length, fileSha256: INDEX_FILE_SHA,
    }, postRun: null }),
    loadDefinitionContext: async () => value,
    materialLoader: async () => { throw new Error("fake operation runner must not load material"); },
    readDefinitionIndexBytes: async () => INDEX_BYTES,
    gitAdmission: async () => ({ clean: true }),
    rawExecutorFactory: () => ({ execute: async () => { throw new Error("fake operation runner must not invoke raw executor"); } }),
    operationRunner: async ({ operation, cases, refs }) => {
      calls.push({ operation, cases, refs });
      return { decision: { state: "pass" } };
    },
    definitionRoot: value.definitionRoot, projectRoot: value.projectRoot, resultsRoot: "Z:/fake-results",
  });
  assert.deepEqual(calls.map((entry) => entry.operation), ["normalize", "export"]);
  assert.ok(calls.every((entry) => entry.cases.length === 6));
  assert.equal(result.actualOperationRuns, 2);
  assert.equal(result.calibrationAuthorized, false);
});

test("normalize non-pass globally stops export registration and reports actual rather than planned runs", async () => {
  const value = context();
  const calls = [];
  const result = await runRegisteredSlice09GateB({
    validateDefinition: async () => ({ valid: true, definitionRef: {
      path: "definition-index.v0.9.0.json", id: value.index.id, contentHash: value.index.contentHash,
      byteLength: INDEX_BYTES.length, fileSha256: INDEX_FILE_SHA,
    }, postRun: null }),
    loadDefinitionContext: async () => value,
    readDefinitionIndexBytes: async () => INDEX_BYTES,
    gitAdmission: async () => ({ clean: true }),
    rawExecutorFactory: () => ({ execute: async () => {} }),
    operationRunner: async ({ operation }) => {
      calls.push(operation);
      return { decision: { state: "denied-closed-non-pass" } };
    },
    definitionRoot: value.definitionRoot, projectRoot: value.projectRoot, resultsRoot: "Z:/fake-results",
  });
  assert.deepEqual(calls, ["normalize"]);
  assert.equal(result.actualOperationRuns, 1);
  assert.equal(result.reports.export, undefined);
  assert.equal(result.calibrationAuthorized, false);
});

test("missing identity pin, denied definition and open admission fields fail before runner", async () => {
  const value = context();
  value.index.goldIdentityRefs = value.index.goldIdentityRefs.slice(1);
  assert.throws(() => buildSlice09CasesFromDefinition(value, "normalize"), (error) => error.code === "S09_DEFINITION_INVALID");
  let runnerCalls = 0;
  await assert.rejects(runRegisteredSlice09GateB({
    validateDefinition: async () => ({ valid: false, definitionRef: null, postRun: null }),
    loadDefinitionContext: async () => value,
    gitAdmission: async () => ({ clean: true }),
    operationRunner: async () => { runnerCalls += 1; },
    definitionRoot: value.definitionRoot, projectRoot: value.projectRoot, resultsRoot: "Z:/fake-results",
  }), (error) => error.code === "S09_DEFINITION_ADMISSION_DENIED");
  assert.equal(runnerCalls, 0);
});

test("registered CLI exposes one token and no retry, calibration or formal mode", async () => {
  const source = await readFile(new URL("../scripts/research-run-slice09.mjs", import.meta.url), "utf8");
  assert.match(source, /--execute-registered-open-smoke/u);
  assert.doesNotMatch(source, /--retry|--calibration|--formal/u);
});
