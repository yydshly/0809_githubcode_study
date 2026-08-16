import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SLICE10_PREVIEW_PATHS, buildSlice10DefinitionPreview } from "../scripts/research-generate-slice10.mjs";
import { validateSlice10Definition } from "../scripts/research-validate-slice10.mjs";
import {
  createSlice10CalibrationAttemptExecutor,
  loadSlice10OperationDefinitionCases,
  verifySlice10FinalOutput,
} from "../scripts/research-calibration-case-slice10.mjs";
import { runSlice10CalibrationOperation } from "../scripts/research-calibration-runner-slice10.mjs";
import { createSlice10RuntimeEndObserver } from "../scripts/research-runtime-observer-slice10.mjs";
import { contentHashSlice10, stableStringifySlice10 } from "../scripts/research-calibration-protocol-slice10.mjs";

const TEST_UTC = "2026-08-16T05:00:00.000Z";

async function materializedPreview() {
  const root = await mkdtemp(path.join(os.tmpdir(), "s10-validator-"));
  const built = await buildSlice10DefinitionPreview({ frozenAt: TEST_UTC });
  for (const [relativePath, bytes] of built.fileMap) {
    const target = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  await writeFile(path.join(root, "README.md"), built.readmeBytes, { flag: "wx" });
  return { root, built };
}

test("central Slice 10 definition validator rechecks runtime and deterministic full-tree bytes", async () => {
  const { root, built } = await materializedPreview();
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.counts.files, 183);
  assert.equal(report.counts.schemas, 22);
  assert.equal(report.counts.sources, 96);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  assert.equal(report.definitionRef.contentHash, built.index.contentHash);
  assert.equal(report.postRun, null);
});

test("central validator rejects one changed machine byte and synchronized index self-hash laundering", async () => {
  const { root } = await materializedPreview();
  const candidatePath = path.join(root, ...SLICE10_PREVIEW_PATHS.candidate.split("/"));
  const candidate = JSON.parse(await readFile(candidatePath));
  candidate.executionState = "forged-executable";
  await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`);
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "TREE_BYTES_MISMATCH"));
});

test("central validator rejects extra files and an unregistered result shape", async () => {
  const { root } = await materializedPreview();
  await writeFile(path.join(root, "extra.txt"), "extra");
  await mkdir(path.join(root, "results", "open-calibration"), { recursive: true });
  await writeFile(path.join(root, "results", "open-calibration", "fake.json"), "{}\n");
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "RESULT_OPERATION_EXTRA"));
  assert.ok(report.issues.some((entry) => entry.code === "RESULT_NORMALIZE_MISSING"));
  assert.ok(report.issues.some((entry) => entry.code === "TREE_EXTRA_FILE"));
});

test("central validator rejects empty result and unregistered definition directories", async () => {
  const { root } = await materializedPreview();
  await mkdir(path.join(root, "results", "open-calibration"), { recursive: true });
  await mkdir(path.join(root, "rogue-empty-directory"));
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "RESULTS_EMPTY_ROOT_FORBIDDEN"));
  assert.ok(report.issues.some((entry) => entry.code === "TREE_EXTRA_DIRECTORY"));
});

test("central validator pins the reviewed README outside the generated self-hash graph", async () => {
  const { root } = await materializedPreview();
  await writeFile(path.join(root, "README.md"), "# forged\n");
  const indexPath = path.join(root, SLICE10_PREVIEW_PATHS.definition);
  const index = JSON.parse(await readFile(indexPath));
  index.readmeSha256 = "f".repeat(64);
  await writeFile(indexPath, `${JSON.stringify(index)}\n`);
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "README_HASH_MISMATCH"));
});

test("noncanonical test-UTC definition cannot satisfy the frozen literal pins", async () => {
  const { root } = await materializedPreview();
  const report = await validateSlice10Definition({ definitionRoot: root, requirePins: true });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((entry) => entry.code === "FINAL_PINS_MISMATCH"));
  assert.equal(report.definitionRef, null);
});

test("canonical Slice 10 definition pins remain stable while the immutable failed result is rejected", {
  skip: process.env.SINGLE_IMAGE_STUDIO_ARCHIVED_RESEARCH === "1",
}, async () => {
  const report = await validateSlice10Definition({ requirePins: true, recheckRuntime: true, regenerate: true });
  assert.equal(report.valid, false);
  assert.equal(report.pinsVerified, true);
  assert.equal(report.runtimeRechecked, true);
  assert.equal(report.regenerationVerified, true);
  assert.equal(report.counts.files, 187);
  assert.equal(report.counts.results, 4);
  assert.equal(report.definitionRef, null);
  assert.equal(report.postRun.state, "closed-protocol-uncertainty");
  assert.equal(report.postRun.counts.attempts, 1);
  assert.equal(report.postRun.counts.closures, 0);
  assert.ok(report.issues.some((entry) => entry.code === "RESULT_WORKER_LIFECYCLE_INVALID"));
});

test("post-run validator preserves one closed global-stop prefix without inventing export or a summary", async () => {
  const { root, built } = await materializedPreview();
  const { index } = built;
  const candidate = JSON.parse(built.fileMap.get(index.candidateRef.path));
  const worker = candidate.implementationRefs.find(({ id }) => id === "WORKER-SHARP-RAW@0.10.0");
  const workerRef = { id: worker.id, version: "0.10.0", path: worker.path, implementationSha256: worker.sha256 };
  const loaded = await loadSlice10OperationDefinitionCases({ projectRoot: path.resolve("."), index, fileMap: built.fileMap, operation: "normalize" });
  const contractRef = index.contractRefs.find(({ id }) => id === "CC-CAP02-NORMALIZE-PNG@0.10.0");
  const preregistrationRef = index.preregistrationRefs.find(({ id }) => id === "PREREG-OPEN-CALIBRATION-NORMALIZE-PNG@0.10.0");
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 7, 16, 5, 0, 0, tick++)).toISOString();
  await runSlice10CalibrationOperation({
    resultsRoot: path.join(root, "results", "open-calibration", "normalize"), operation: "normalize", cases: loaded.cases,
    refs: { admissionRef: index.admissionLineageRef, candidateRef: index.candidateRef, contractRef, preregistrationRef, runtimeRef: index.runtimeRef, workerRef },
    executeAttempt: async () => { throw Object.assign(new Error("frozen runtime drift"), { code: "S10_RUNTIME_DRIFT" }); },
    verifyRuntimeEnd: async () => { throw new Error("must not be called"); },
    now,
  });
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.postRun.state, "closed-protocol-uncertainty");
  assert.equal(report.postRun.counts.operationRuns, 1);
  assert.equal(report.postRun.counts.attempts, 1);
  assert.equal(report.postRun.reports.normalize.status, "protocol-failed");
  assert.equal(report.postRun.reports.export, undefined);
  const terminalPath = path.join(root, "results", "open-calibration", "normalize", "terminals",
    "request.s10.normalize.s10.normalize.dev.001.r1.a1.json");
  const terminal = JSON.parse(await readFile(terminalPath));
  terminal.reasonCode = "S10_EXPECTED_OUTPUT_INVALID";
  terminal.workerInvoked = true;
  terminal.contentHash = contentHashSlice10(terminal);
  const terminalBytes = Buffer.from(`${stableStringifySlice10(terminal)}\n`);
  await writeFile(terminalPath, terminalBytes);
  const ledgerPath = path.join(root, "results", "open-calibration", "normalize", "ledger.ndjson");
  const ledger = (await readFile(ledgerPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  ledger[1].payloadSha256 = createHash("sha256").update(terminalBytes).digest("hex");
  ledger[1].contentHash = contentHashSlice10(ledger[1]);
  await writeFile(ledgerPath, `${ledger.map(stableStringifySlice10).join("\n")}\n`);
  const lifecycleLie = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(lifecycleLie.valid, false);
  assert.ok(lifecycleLie.issues.some(({ code }) => code === "RESULT_WORKER_LIFECYCLE_INVALID"));
});

test("post-run validator reopens the complete 288-attempt closure and rejects output-byte tampering", async () => {
  const { root, built } = await materializedPreview();
  const index = built.index;
  const runtime = JSON.parse(built.fileMap.get(index.runtimeRef.path));
  const candidate = JSON.parse(built.fileMap.get(index.candidateRef.path));
  const worker = candidate.implementationRefs.find(({ id }) => id === "WORKER-SHARP-RAW@0.10.0");
  const workerRef = { id: worker.id, version: "0.10.0", path: worker.path, implementationSha256: worker.sha256 };
  const context = { index, runtime, candidate };
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 7, 16, 6, 0, 0, tick++)).toISOString();
  const inventory = JSON.parse(runtime.inventoryCanonicalJson);
  const observeRuntimeEnd = createSlice10RuntimeEndObserver({ inventoryProvider: async () => structuredClone(inventory), now });
  for (const operation of ["normalize", "export"]) {
    const loaded = await loadSlice10OperationDefinitionCases({ projectRoot: path.resolve("."), index, fileMap: built.fileMap, operation });
    const outputByAttempt = new Map();
    for (const item of loaded.cases) for (let repetition = 1; repetition <= 3; repetition += 1) {
      outputByAttempt.set(`request.s10.${operation}.${item.sourceRef.id}.r${repetition}.a1`, loaded.casesBySourceId.get(item.sourceRef.id).sourceBytes);
    }
    const rawExecutor = { async execute({ attemptId }) { return { outputBytes: outputByAttempt.get(attemptId) }; } };
    const executeAttempt = createSlice10CalibrationAttemptExecutor({ casesBySourceId: loaded.casesBySourceId, rawExecutor });
    const contractRef = index.contractRefs.find(({ id }) => id === `CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`);
    const preregistrationRef = index.preregistrationRefs.find(({ id }) => id === `PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`);
    await runSlice10CalibrationOperation({
      resultsRoot: path.join(root, "results", "open-calibration", operation), operation, cases: loaded.cases,
      refs: { admissionRef: index.admissionLineageRef, candidateRef: index.candidateRef, contractRef, preregistrationRef, runtimeRef: index.runtimeRef, workerRef },
      executeAttempt,
      verifyRuntimeEnd: (args) => observeRuntimeEnd({ context, ...args }),
      now,
    });
  }
  const report = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.postRun.valid, true);
  assert.equal(report.postRun.state, "closed-complete");
  assert.equal(report.postRun.counts.attempts, 288);
  assert.equal(report.postRun.counts.closures, 144);
  assert.equal(report.postRun.reports.normalize.status, "calibration-complete-pass");
  assert.equal(report.postRun.reports.export.status, "calibration-complete-pass");
  const outputPath = path.join(root, "results", "open-calibration", "normalize", "closures",
    "request.s10.normalize.s10.normalize.dev.001.r1.a1", "output.png");
  const bytes = await readFile(outputPath);
  bytes[bytes.length - 1] ^= 1;
  await writeFile(outputPath, bytes);
  const tampered = await validateSlice10Definition({ definitionRoot: root });
  assert.equal(tampered.valid, false);
  assert.ok(tampered.issues.some(({ code }) => ["S10_OUTPUT_ORACLE_REJECTED", "RESULT_ARTIFACT_BINDING_INVALID", "RESULT_PUBLICATION_BINDING_INVALID"].includes(code)));
});
