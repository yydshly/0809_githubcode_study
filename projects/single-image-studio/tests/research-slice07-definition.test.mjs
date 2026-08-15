import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SLICE07_SCHEMA_DOCUMENTS,
  materializeSlice07Definition,
  treeDigestSlice07,
} from "../scripts/research-generate-slice07.mjs";
import {
  buildSlice07CasesFromDefinition,
  loadSlice07DefinitionContext,
  runRegisteredSlice07GateB,
} from "../scripts/research-run-slice07.mjs";

const FIXED_UTC = "2026-08-15T09:30:00.000Z";

async function roots(t) {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s07-definition-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  return [path.join(parent, "a"), path.join(parent, "b")];
}

test("Slice 07 definition is byte deterministic, results-zero, and contains no copied image bytes", async (t) => {
  const [a, b] = await roots(t);
  const left = await materializeSlice07Definition({ outputRoot: a, frozenAt: FIXED_UTC });
  const right = await materializeSlice07Definition({ outputRoot: b, frozenAt: FIXED_UTC });
  assert.deepEqual(await treeDigestSlice07(a), await treeDigestSlice07(b));
  const digest = await treeDigestSlice07(a);
  assert.equal(digest.fileCount, 41);
  assert.equal(left.contentHash, right.contentHash);
  assert.equal(left.descendantFileCount, 39);
  assert.equal(left.schemaPaths.length, 16);
  assert.equal(left.resultsState, "not-created");
  assert.equal(left.copiedImageBytes, 0);
  await assert.rejects(readdir(path.join(a, "results")));
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute); else files.push(absolute);
    }
  }
  await visit(a);
  assert.equal(files.some((file) => /\.(png|jpg|jpeg|webp|bin)$/iu.test(file)), false);
});

test("all 16 schemas are exact-id and recursively closed with supported keywords", () => {
  assert.equal(Object.keys(SLICE07_SCHEMA_DOCUMENTS).length, 16);
  const allowed = new Set([
    "$schema", "$id", "type", "const", "enum", "pattern", "format", "minimum", "maximum",
    "minItems", "maxItems", "items", "oneOf", "additionalProperties", "required", "properties",
  ]);
  function walk(value, inProperties = false) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (!inProperties) assert.ok(allowed.has(key), `unsupported keyword ${key}`);
      if (key === "properties") {
        for (const nested of Object.values(child)) walk(nested);
      } else if (key === "items") walk(child);
      else if (key === "oneOf") for (const nested of child) walk(nested);
    }
    if (value.type === "object") {
      assert.equal(value.additionalProperties, false);
      assert.deepEqual([...value.required].sort(), Object.keys(value.properties).sort());
    }
  }
  for (const [relativePath, document] of Object.entries(SLICE07_SCHEMA_DOCUMENTS)) {
    assert.equal(document.$id, `https://single-image-studio.invalid/research/slice-07/${relativePath}`);
    walk(document);
  }
});

test("manifests freeze two independent 6x3 denominators over immutable Slice 05 lineage", async (t) => {
  const [root] = await roots(t);
  await materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC });
  const context = await loadSlice07DefinitionContext({ definitionRoot: root });
  for (const operation of ["normalize", "export"]) {
    const entries = context.manifests[operation].entries;
    assert.equal(entries.length, 6);
    assert.equal(entries.filter((entry) => entry.disposition === "applicable").length, 3);
    assert.equal(entries.filter((entry) => entry.disposition === "rejection").length, 3);
    const cases = buildSlice07CasesFromDefinition(context, operation);
    assert.equal(new Set(cases.map((entry) => entry.sourceId)).size, 6);
    for (const entry of entries) {
      const wrapper = JSON.parse(await readFile(path.join(root, entry.wrapperRef.path), "utf8"));
      assert.equal(wrapper.copiedImageBytes, false);
      assert.equal(wrapper.independenceClaim, false);
      assert.match(wrapper.rawAssetPath, /^assets\/open\//u);
    }
  }
  assert.notDeepEqual(
    context.manifests.normalize.entries.map((entry) => entry.sourceId),
    context.manifests.export.entries.map((entry) => entry.sourceId),
  );
});

test("registered driver admits exactly once and orders normalize before export with fake operation runners", async (t) => {
  const [root] = await roots(t);
  await materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC });
  const order = [];
  let executorCreated = 0;
  const report = await runRegisteredSlice07GateB({
    definitionRoot: root,
    resultsRoot: path.join(path.dirname(root), "fake-results"),
    validateDefinition: async () => ({ valid: true, definitionRef: { id: "DEFINITION-INDEX-SLICE07@0.7.0" } }),
    gitAdmission: async () => ({ clean: true }),
    executorFactory: () => { executorCreated += 1; return { execute: async () => { throw new Error("must not execute in this fake operation runner"); } }; },
    operationRunner: async ({ operation, cases }) => {
      order.push(operation);
      assert.equal(cases.length, 6);
      return { decision: { gateBPassed: true, calibrationAuthorized: false } };
    },
  });
  assert.deepEqual(order, ["normalize", "export"]);
  assert.equal(executorCreated, 1);
  assert.equal(report.calibrationAuthorized, false);
});

test("all frozen rejection sentinels classify exactly before a worker can start", async (t) => {
  const [root] = await roots(t);
  await materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC });
  let workerStarts = 0;
  await runRegisteredSlice07GateB({
    definitionRoot: root,
    resultsRoot: path.join(path.dirname(root), "preflight-only-results"),
    validateDefinition: async () => ({ valid: true, definitionRef: { id: "DEFINITION-INDEX-SLICE07@0.7.0" } }),
    gitAdmission: async () => ({ clean: true }),
    executorFactory: () => ({ execute: async () => { workerStarts += 1; throw new Error("worker must not start"); } }),
    operationRunner: async ({ cases, executeCase }) => {
      const rejectionCases = cases.filter((entry) => entry.disposition === "rejection");
      assert.equal(rejectionCases.length, 3);
      for (const entry of rejectionCases) {
        await assert.rejects(executeCase({ attemptId: `preflight.${entry.sourceId}`, ...entry }), (error) => error.code === entry.expectedStableErrorCode);
      }
      return { decision: { gateBPassed: false, calibrationAuthorized: false } };
    },
  });
  assert.equal(workerStarts, 0);
});

test("driver admission denial invokes no executor and generator refuses a non-empty root", async (t) => {
  const [root] = await roots(t);
  await materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC });
  let executorCreated = 0;
  await assert.rejects(runRegisteredSlice07GateB({
    definitionRoot: root,
    validateDefinition: async () => ({ valid: false, definitionRef: null }),
    gitAdmission: async () => ({ clean: true }),
    executorFactory: () => { executorCreated += 1; return {}; },
  }), (error) => error.code === "S07_DEFINITION_ADMISSION_DENIED");
  assert.equal(executorCreated, 0);
  await assert.rejects(materializeSlice07Definition({ outputRoot: root, frozenAt: FIXED_UTC }));
});

test("definition and driver source contain no candidate image execution at generation time", async () => {
  const generator = await readFile(new URL("../scripts/research-generate-slice07.mjs", import.meta.url), "utf8");
  const driver = await readFile(new URL("../scripts/research-run-slice07.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(generator, /\.execute\(|fork\(|\.png\(/u);
  assert.match(driver, /--execute-registered-open-smoke/u);
  assert.doesNotMatch(driver, /calibrationAuthorized:\s*true|formal:\s*true|productSupport:\s*true/u);
});
