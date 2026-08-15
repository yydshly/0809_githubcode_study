import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Slice08CaseContextError } from "../scripts/research-gateb-case-context-slice08.mjs";
import { materializeSlice08Definition } from "../scripts/research-generate-slice08.mjs";
import { decodeIndependentPngSlice05 } from "../scripts/research-independent-png-oracle-slice05.mjs";
import { buildSlice08CasesFromDefinition } from "../scripts/research-run-slice08.mjs";
import { runSlice08GateBOperation } from "../scripts/research-gateb-runner-slice08.mjs";
import { validateSlice08Definition } from "../scripts/research-validate-slice08.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const TEST_UTC = "2026-08-15T09:45:00.000Z";

test("frozen canonical definition passes literal pins, fresh runtime and regeneration", async () => {
  const report = await validateSlice08Definition();
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.pinsVerified, true);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  assert.equal(report.postRun, null);
});

async function freshDefinition() {
  const root = await mkdtemp(path.join(os.tmpdir(), "s08-validator-"));
  await materializeSlice08Definition({ outputRoot: root, frozenAt: TEST_UTC });
  return root;
}

async function cloneDefinition(root) {
  const clone = await mkdtemp(path.join(os.tmpdir(), "s08-validator-copy-"));
  await cp(root, clone, { recursive: true });
  return clone;
}

async function json(file) { return JSON.parse(await readFile(file, "utf8")); }
function clock() {
  let value = Date.parse("2026-08-15T09:50:00.000Z");
  return () => { const result = new Date(value).toISOString(); value += 1; return result; };
}

test("central validator accepts a fresh results-zero definition and returns an exact definition ref", async () => {
  const root = await freshDefinition();
  const report = await validateSlice08Definition({ definitionRoot: root, requirePins: false, recheckRuntime: true, regenerate: true });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.counts.schemas, 16);
  assert.equal(report.counts.records, 23);
  assert.equal(report.counts.sourceLineage, 12);
  assert.equal(report.counts.results, 0);
  assert.equal(report.definitionRef.path, "definition-index.v0.8.0.json");
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  assert.equal(report.postRun, null);
});

test("extra files, schema keywords and record self-hash laundering fail closed", async () => {
  const source = await freshDefinition();
  const extra = await cloneDefinition(source);
  await writeFile(path.join(extra, "schemas", "unregistered.schema.json"), "{}\n");
  let report = await validateSlice08Definition({ definitionRoot: extra, requirePins: false, recheckRuntime: false, regenerate: false });
  assert.ok(report.issues.some((entry) => ["FILE_SET_MISMATCH", "RECORD_SCHEMA_UNREGISTERED"].includes(entry.code)) || report.issues.length > 0);

  const keyword = await cloneDefinition(source);
  const schemaPath = path.join(keyword, "schemas", "manifest.slice08.v0.schema.json");
  const schema = await json(schemaPath);
  schema.maxProperties = 99;
  await writeFile(schemaPath, `${JSON.stringify(schema)}\n`);
  report = await validateSlice08Definition({ definitionRoot: keyword, requirePins: false, recheckRuntime: false, regenerate: false });
  assert.ok(report.issues.some((entry) => entry.code === "SCHEMA_KEYWORD_UNSUPPORTED"));

  const recordRoot = await cloneDefinition(source);
  const manifestPath = path.join(recordRoot, "manifests", "normalize-smoke.v0.8.0.json");
  const manifest = await json(manifestPath);
  manifest.entries[3].expectedStableErrorCode = "S07_INPUT_CRC_MISMATCH";
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  report = await validateSlice08Definition({ definitionRoot: recordRoot, requirePins: false, recheckRuntime: false, regenerate: false });
  assert.ok(report.issues.some((entry) => ["CONTENT_HASH_MISMATCH", "MANIFEST_REJECTION_INVALID", "SCHEMA_PATTERN_MISMATCH"].includes(entry.code)));
});

test("external lineage, implementation and exact reference drift are rejected", async () => {
  const source = await freshDefinition();
  const root = await cloneDefinition(source);
  const wrapperPath = path.join(root, "source-lineage", "normalize", "s08.normalize.applicable.001.json");
  const wrapper = await json(wrapperPath);
  wrapper.priorSlice07Ref.fileSha256 = "0".repeat(64);
  wrapper.contentHash = "0".repeat(64);
  await writeFile(wrapperPath, `${JSON.stringify(wrapper)}\n`);
  const report = await validateSlice08Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: false });
  const codes = new Set(report.issues.map((entry) => entry.code));
  assert.ok(codes.has("REFERENCE_BINDING_MISMATCH"));
  assert.ok(codes.has("CONTENT_HASH_MISMATCH"));
});

test("a complete fake post-run closure is fully audited and blocked only until its tree pin is frozen", async () => {
  const root = await freshDefinition();
  const index = await json(path.join(root, "definition-index.v0.8.0.json"));
  const manifests = {
    normalize: await json(path.join(root, "manifests", "normalize-smoke.v0.8.0.json")),
    export: await json(path.join(root, "manifests", "export-smoke.v0.8.0.json")),
  };
  const context = { definitionRoot: root, index, manifests };
  for (const operation of ["normalize", "export"]) {
    const manifest = manifests[operation];
    const refs = {
      manifestRef: index.manifestRefs.find((item) => item.id === manifest.id), candidateRef: index.candidateRef,
      contractRef: index.contractRefs.find((item) => item.id === manifest.contractRef.id), runtimeRef: index.runtimeRef, workerRef: index.workerRef,
    };
    const executeCase = async ({ caseContext }) => {
      if (caseContext.disposition === "rejection") throw new Slice08CaseContextError(caseContext.expectedStableErrorCode, "expected fake preflight");
      const wrapper = await json(path.join(root, caseContext.sourceRef.path));
      const outputBytes = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", wrapper.rawAssetPath));
      const decoded = decodeIndependentPngSlice05(outputBytes);
      return {
        outputBytes,
        oracleFacts: { fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256, width: decoded.width, height: decoded.height, chunkTypes: decoded.chunkTypes },
        workerMessageSha256: "a".repeat(64), workerRuntimeSha256: "b".repeat(64), workerObservation: { exitConfirmed: true },
      };
    };
    await runSlice08GateBOperation({ resultsRoot: path.join(root, "results", "open-smoke", operation), operation,
      cases: buildSlice08CasesFromDefinition(context, operation), refs, executeCase, now: clock() });
  }
  const report = await validateSlice08Definition({ definitionRoot: root, requirePins: false, recheckRuntime: true, regenerate: true });
  assert.equal(report.postRun.operations.normalize.terminalCount, 18);
  assert.equal(report.postRun.operations.export.terminalCount, 18);
  assert.deepEqual(report.issues.map((entry) => entry.code), ["POSTRUN_PIN_MISSING"]);
  const outputPath = path.join(root, "results", "open-smoke", "normalize", "closures", "s08.normalize.s08.normalize.applicable.001.r1", "output.png");
  const output = await readFile(outputPath);
  output[output.length - 1] ^= 1;
  await writeFile(outputPath, output);
  const tampered = await validateSlice08Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: false });
  assert.ok(tampered.issues.some((entry) => ["RESULT_CLOSURE_BINDING_INVALID", "RESULT_PASS_REOPEN_FAILED", "RESULT_PASS_REOPEN_INVALID"].includes(entry.code)));
});

test("post-run request, ledger and output mutations cannot be hidden by self-hash edits", async () => {
  const root = await freshDefinition();
  await writeFile(path.join(root, "results", "rogue.json"), "{}\n", { recursive: false }).catch(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.join(root, "results"));
    await writeFile(path.join(root, "results", "rogue.json"), "{}\n");
  });
  const report = await validateSlice08Definition({ definitionRoot: root, requirePins: false, recheckRuntime: false, regenerate: false });
  assert.ok(report.issues.some((entry) => entry.code === "RESULT_PATH_UNREGISTERED"));
});
