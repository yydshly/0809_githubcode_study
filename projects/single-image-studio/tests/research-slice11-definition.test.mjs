import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSlice11DefinitionPreview } from "../scripts/research-generate-slice11.mjs";
import { loadSlice11DefinitionContext, loadSlice11OperationCases, runRegisteredSlice11Calibration } from "../scripts/research-run-slice11.mjs";
import { validateSlice11Definition } from "../scripts/research-validate-slice11.mjs";

const TEST_UTC = "2026-08-16T01:00:00.000Z";
async function materialize() {
  const root = await mkdtemp(path.join(tmpdir(), "s11-definition-"));
  const built = await buildSlice11DefinitionPreview({ frozenAt: TEST_UTC });
  for (const [relative, bytes] of built.fileMap) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  await writeFile(path.join(root, "README.md"), built.readmeBytes);
  return { root, built };
}

test("Slice 11 definition is deterministic, results-zero and closes 96 sources over 23 schemas", async () => {
  const left = await buildSlice11DefinitionPreview({ frozenAt: TEST_UTC });
  const right = await buildSlice11DefinitionPreview({ frozenAt: TEST_UTC });
  assert.equal(left.fileMap.size, 179);
  assert.equal(left.index.schemaPaths.length, 23);
  assert.equal(left.index.sourceRefs.length, 96);
  assert.equal(left.index.goldIdentityRefs.length, 48);
  assert.equal(left.index.counts.plannedAttempts, 288);
  assert.equal(left.index.resultsState, "not-created");
  assert.deepEqual([...left.fileMap], [...right.fileMap]);
});

test("central validator accepts a generated preview and reports literal pins separately", async () => {
  const { root } = await materialize();
  const report = await validateSlice11Definition({ definitionRoot: root, requirePins: false });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.counts.files, 180);
  assert.equal(report.counts.schemas, 23);
  assert.equal(report.counts.sources, 96);
  assert.equal(report.counts.results, 0);
  assert.equal(report.regenerationVerified, true);
  assert.ok(report.definitionRef);
  const pinned = await validateSlice11Definition({ definitionRoot: root, requirePins: true });
  assert.equal(pinned.valid, false);
  assert.ok(pinned.issues.some((entry) => entry.code === "FINAL_PINS_MISMATCH"));
});

test("central validator rejects source byte drift and arbitrary result material", async () => {
  const sourceTamper = await materialize();
  const sourcePath = path.join(sourceTamper.root, ...sourceTamper.built.index.sourceRefs[0].path.split("/"));
  const record = JSON.parse(await readFile(sourcePath, "utf8"));
  record.sourceFamilyId = `${record.sourceFamilyId}.tampered`;
  await writeFile(sourcePath, `${JSON.stringify(record)}\n`);
  const sourceReport = await validateSlice11Definition({ definitionRoot: sourceTamper.root, requirePins: false });
  assert.equal(sourceReport.valid, false);
  assert.ok(sourceReport.issues.some((entry) => ["DEFINITION_FILE_DRIFT", "DEFINITION_REF_DRIFT"].includes(entry.code)));

  const resultTamper = await materialize();
  const extra = path.join(resultTamper.root, "results", "open-calibration", "normalize");
  await mkdir(extra, { recursive: true });
  await writeFile(path.join(extra, "invented.json"), "{}\n");
  const resultReport = await validateSlice11Definition({ definitionRoot: resultTamper.root, requirePins: false });
  assert.equal(resultReport.valid, false);
  assert.ok(resultReport.issues.some((entry) => entry.code === "POSTRUN_OPERATION_INVALID"));
});

test("definition loader maps new source identities to exact immutable Slice 10 case material", async () => {
  const { root } = await materialize();
  const context = await loadSlice11DefinitionContext({ definitionRoot: root, projectRoot: path.resolve(".") });
  for (const operation of ["normalize", "export"]) {
    const loaded = await loadSlice11OperationCases({ context, operation });
    assert.equal(loaded.cases.length, 48);
    assert.equal(loaded.casesBySourceId.size, 48);
    assert.equal(loaded.cases.filter((entry) => entry.disposition === "applicable").length, 24);
    assert.equal(loaded.cases.filter((entry) => entry.disposition === "rejection").length, 24);
    assert.ok(loaded.cases.every((entry) => entry.sourceRef.id.startsWith(`s11.${operation}.`)));
  }
});

test("registered driver admits one two-operation invocation but cannot run before literal freeze", async () => {
  const { root, built } = await materialize();
  let calls = 0;
  const result = await runRegisteredSlice11Calibration({
    definitionRoot: root, resultsRoot: path.join(root, "registered-results"),
    validateDefinition: async () => ({ valid: true, definitionRef: { id: built.index.id }, postRun: null }),
    gitAdmission: async () => {}, rawExecutorFactory: () => ({ execute: async () => { throw new Error("fake operation runner must not execute worker"); } }),
    operationRunner: async ({ operation, cases }) => { calls += 1; assert.equal(cases.length, 48); return { result: { globalStop: null }, operation }; },
  });
  assert.equal(calls, 2);
  assert.equal(result.actualOperationRuns, 2);
  assert.equal(result.calibrationAuthorized, false);
  await assert.rejects(() => runRegisteredSlice11Calibration({ definitionRoot: root, resultsRoot: path.join(root, "denied-results"), validateDefinition: async () => ({ valid: false, definitionRef: null, postRun: null }) }), { code: "S11_DEFINITION_ADMISSION_DENIED" });
});
