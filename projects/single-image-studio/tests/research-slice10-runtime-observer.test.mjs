import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSlice10DefinitionPreview, canonicalBytesSlice10 } from "../scripts/research-generate-slice10.mjs";
import { contentHashSlice10 } from "../scripts/research-calibration-protocol-slice10.mjs";
import {
  SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS,
  createSlice10RuntimeEndObserver,
  validateSlice10RuntimeEndObservation,
} from "../scripts/research-runtime-observer-slice10.mjs";

const START_UTC = "2026-08-16T03:00:00.000Z";
const END_UTC = "2026-08-16T03:10:00.000Z";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function fixture() {
  const built = await buildSlice10DefinitionPreview({ frozenAt: START_UTC });
  const runtime = JSON.parse(built.fileMap.get(built.index.runtimeRef.path));
  const inventory = JSON.parse(runtime.inventoryCanonicalJson);
  const index = structuredClone(built.index);
  const context = { index, runtime };
  const parent = await mkdtemp(path.join(os.tmpdir(), "s10-runtime-end-"));
  const operationResultsRoot = path.join(parent, "normalize");
  await mkdir(operationResultsRoot);
  return { built, context, inventory, operationResultsRoot };
}

test("runtime-end observer writes one durable, self-hashed, zero-evidence record", async () => {
  const { context, inventory, operationResultsRoot } = await fixture();
  const observe = createSlice10RuntimeEndObserver({ inventoryProvider: async () => structuredClone(inventory), now: () => END_UTC });
  const ref = await observe({ context, operation: "normalize", runtimeStartRef: context.index.runtimeRef, operationResultsRoot });
  const bytes = await readFile(path.join(operationResultsRoot, "runtime-end.json"));
  const record = validateSlice10RuntimeEndObservation(JSON.parse(bytes));
  assert.deepEqual(ref, {
    path: "runtime-end.json", id: record.id, contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256(bytes),
  });
  assert.equal(record.matchesFrozen, true);
  assert.equal(record.imageProcessingPerformed, false);
  assert.equal(record.evidenceBoundary.productSupport, false);
  assert.equal(record.evidenceBoundary.c1, 0);
  assert.equal(record.inventoryCanonicalJson, context.runtime.inventoryCanonicalJson);
});

test("runtime drift fails before publication", async () => {
  const { context, inventory, operationResultsRoot } = await fixture();
  inventory.environment.node.version = "v99.0.0";
  const observe = createSlice10RuntimeEndObserver({ inventoryProvider: async () => inventory, now: () => END_UTC });
  await assert.rejects(observe({ context, operation: "normalize", runtimeStartRef: context.index.runtimeRef, operationResultsRoot }),
    { code: "S10_RUNTIME_END_DRIFT" });
  await assert.rejects(readFile(path.join(operationResultsRoot, "runtime-end.json")), { code: "ENOENT" });
});

test("runtime observation cannot replay or overwrite its durable record", async () => {
  const { context, inventory, operationResultsRoot } = await fixture();
  const observe = createSlice10RuntimeEndObserver({ inventoryProvider: async () => structuredClone(inventory), now: () => END_UTC });
  const args = { context, operation: "normalize", runtimeStartRef: context.index.runtimeRef, operationResultsRoot };
  await observe(args);
  await assert.rejects(observe(args), { code: "S10_RUNTIME_END_REPLAY_DENIED" });
});

test("runtime observation rejects a substituted start ref and noncanonical clock", async () => {
  const { context, inventory, operationResultsRoot } = await fixture();
  const badRef = { ...context.index.runtimeRef, contentHash: "f".repeat(64) };
  const observe = createSlice10RuntimeEndObserver({ inventoryProvider: async () => inventory, now: () => END_UTC });
  await assert.rejects(observe({ context, operation: "normalize", runtimeStartRef: badRef, operationResultsRoot }),
    { code: "S10_RUNTIME_END_INPUT_INVALID" });
  const badClock = createSlice10RuntimeEndObserver({ inventoryProvider: async () => inventory, now: () => "2026-02-31T00:00:00.000Z" });
  await assert.rejects(badClock({ context, operation: "normalize", runtimeStartRef: context.index.runtimeRef, operationResultsRoot }),
    { code: "S10_RUNTIME_END_INPUT_INVALID" });
});

test("runtime-end validator rejects a rehashed embedded inventory or worker-runtime lie", async () => {
  const { context, inventory, operationResultsRoot } = await fixture();
  const observe = createSlice10RuntimeEndObserver({ inventoryProvider: async () => structuredClone(inventory), now: () => END_UTC });
  await observe({ context, operation: "normalize", runtimeStartRef: context.index.runtimeRef, operationResultsRoot });
  const record = JSON.parse(await readFile(path.join(operationResultsRoot, "runtime-end.json")));
  const tamperedInventory = structuredClone(record);
  tamperedInventory.inventoryPayloadSha256 = "f".repeat(64);
  tamperedInventory.contentHash = contentHashSlice10(tamperedInventory);
  assert.throws(() => validateSlice10RuntimeEndObservation(tamperedInventory), { code: "S10_RUNTIME_END_RECORD_INVALID" });
  const tamperedWorker = structuredClone(record);
  const worker = JSON.parse(tamperedWorker.workerRuntimeCanonicalJson);
  worker.nodeVersion = "v99.0.0";
  tamperedWorker.workerRuntimeCanonicalJson = JSON.stringify(worker);
  tamperedWorker.workerRuntimeSha256 = sha256(Buffer.from(tamperedWorker.workerRuntimeCanonicalJson));
  tamperedWorker.contentHash = contentHashSlice10(tamperedWorker);
  assert.throws(() => validateSlice10RuntimeEndObservation(tamperedWorker), { code: "S10_RUNTIME_END_RECORD_INVALID" });
});

test("runtime-end schema is exact, closed and namespaced to Slice 10", () => {
  const [schemaPath, schema] = Object.entries(SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS)[0];
  assert.equal(schemaPath, "schemas/runtime-end-observation.slice10.v0.schema.json");
  assert.equal(schema.$id.endsWith(`/research/slice-10/${schemaPath}`), true);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  const bytes = canonicalBytesSlice10(schema);
  assert.equal(bytes.length > 100, true);
});
