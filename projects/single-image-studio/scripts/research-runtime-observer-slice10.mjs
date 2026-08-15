import { open, lstat, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonSlice05,
  inventorySharpRuntimeSlice05,
} from "./research-inventory-sharp-slice05.mjs";
import {
  SLICE10_EVIDENCE_BOUNDARY,
  contentHashSlice10,
  sha256Slice10,
  stableStringifySlice10,
} from "./research-calibration-protocol-slice10.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const OPERATIONS = new Set(["normalize", "export"]);
const SHA_RE = /^[0-9a-f]{64}$/u;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const REF_KEYS = Object.freeze(["byteLength", "contentHash", "fileSha256", "id", "path"]);
const RECORD_KEYS = Object.freeze([
  "contentHash", "evidenceBoundary", "id", "imageProcessingPerformed", "inventoryCanonicalJson",
  "inventoryPayloadSha256", "matchesFrozen", "observedAt", "observationState", "operation",
  "runtimeStartRef", "schemaVersion", "workerRuntimeCanonicalJson", "workerRuntimeSha256",
]);

export const SLICE10_RUNTIME_END_OBSERVER_ID = "OBSERVER-RUNTIME-END@0.10.0";

export class Slice10RuntimeObserverError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "Slice10RuntimeObserverError";
    this.code = code;
  }
}

function fail(code, message, options = {}) {
  throw new Slice10RuntimeObserverError(code, message, options);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exact(value, keys, code, label) {
  if (!plain(value)) fail(code, `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${label} keys are not exact`);
  }
}

function validateRef(value, label = "recordRef") {
  exact(value, REF_KEYS, "S10_RUNTIME_END_INPUT_INVALID", label);
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 2
    || !SHA_RE.test(value.contentHash ?? "") || !SHA_RE.test(value.fileSha256 ?? "")
    || typeof value.id !== "string" || value.id.length < 3
    || typeof value.path !== "string" || value.path.length < 3 || value.path.includes("\\")
    || value.path.startsWith("/") || value.path.split("/").some((part) => ["", ".", ".."].includes(part))) {
    fail("S10_RUNTIME_END_INPUT_INVALID", `${label} is invalid`);
  }
}

function sameRef(left, right) {
  return REF_KEYS.every((key) => left?.[key] === right?.[key]);
}

function definitionContentHash(record) {
  const clone = structuredClone(record);
  delete clone.contentHash;
  return sha256Slice10(Buffer.from(`${stableStringifySlice10(clone)}\n`));
}

function exactUtc(value, code = "S10_RUNTIME_END_INPUT_INVALID") {
  if (typeof value !== "string" || !UTC_RE.test(value) || new Date(value).toISOString() !== value) {
    fail(code, "runtime observation time must be exact millisecond UTC");
  }
  return value;
}

function expectedWorkerRuntime(inventory) {
  return {
    sharpVersion: inventory?.versions?.sharpRuntime?.values?.sharp,
    nativeVersions: inventory?.versions?.sharpRuntime?.values,
    nodeVersion: inventory?.environment?.node?.version,
    platform: inventory?.environment?.os?.platform,
    architecture: inventory?.environment?.os?.architecture,
    settings: {
      concurrency: 1,
      cacheMemoryMaxMiB: 0,
      cacheFilesMax: 0,
      cacheItemsMax: 0,
      simd: false,
      uvThreadpoolSize: "1",
      vipsConcurrency: "1",
      ignoreGlobalLibvips: "1",
    },
  };
}

function assertNoImagePipeline(inventory) {
  exact(inventory?.executionBoundary, ["candidatePipelineInvoked", "imageBytesRead", "imageDecoded", "imageEncoded"],
    "S10_RUNTIME_END_DRIFT", "inventory.executionBoundary");
  if (Object.values(inventory.executionBoundary).some((value) => value !== false)
    || inventory?.versions?.sharpRuntime?.imageProcessingPerformed !== false) {
    fail("S10_RUNTIME_END_DRIFT", "runtime inventory crossed the no-image observation boundary");
  }
}

function schemaObject(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

const hex = { type: "string", pattern: "^[0-9a-f]{64}$" };
const text = { type: "string", minLength: 1 };
const refSchema = schemaObject({
  path: text,
  id: text,
  contentHash: hex,
  byteLength: { type: "integer", minimum: 2 },
  fileSha256: hex,
});
const evidenceProperties = Object.fromEntries(Object.entries(SLICE10_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }]));

export const SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/runtime-end-observation.slice10.v0.schema.json": Object.freeze({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://single-image-studio.invalid/research/slice-10/schemas/runtime-end-observation.slice10.v0.schema.json",
    ...schemaObject({
      schemaVersion: { const: "runtime-end-observation.slice10.v0" },
      id: { enum: ["RUNTIME-END-NORMALIZE@0.10.0", "RUNTIME-END-EXPORT@0.10.0"] },
      operation: { enum: ["normalize", "export"] },
      runtimeStartRef: refSchema,
      observedAt: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" },
      observationState: { const: "post-terminal-read-versions-only-no-image-pipeline" },
      inventoryCanonicalJson: text,
      inventoryPayloadSha256: hex,
      workerRuntimeCanonicalJson: text,
      workerRuntimeSha256: hex,
      matchesFrozen: { const: true },
      imageProcessingPerformed: { const: false },
      evidenceBoundary: schemaObject(evidenceProperties),
      contentHash: hex,
    }),
  }),
});

export function validateSlice10RuntimeEndObservation(record) {
  const code = "S10_RUNTIME_END_RECORD_INVALID";
  exact(record, RECORD_KEYS, code, "runtime-end observation");
  if (record.schemaVersion !== "runtime-end-observation.slice10.v0" || !OPERATIONS.has(record.operation)
    || record.id !== `RUNTIME-END-${record.operation.toUpperCase()}@0.10.0`
    || record.observationState !== "post-terminal-read-versions-only-no-image-pipeline"
    || record.matchesFrozen !== true || record.imageProcessingPerformed !== false) {
    fail(code, "runtime-end observation state is invalid");
  }
  try { validateRef(record.runtimeStartRef, "runtimeStartRef"); } catch (cause) { fail(code, "runtimeStartRef is invalid", { cause }); }
  exactUtc(record.observedAt, code);
  if (typeof record.inventoryCanonicalJson !== "string" || record.inventoryCanonicalJson.length < 2
    || typeof record.workerRuntimeCanonicalJson !== "string" || record.workerRuntimeCanonicalJson.length < 2
    || !SHA_RE.test(record.inventoryPayloadSha256 ?? "") || !SHA_RE.test(record.workerRuntimeSha256 ?? "")) {
    fail(code, "runtime canonical payloads or hashes are invalid");
  }
  try {
    const inventory = JSON.parse(record.inventoryCanonicalJson);
    const workerRuntime = JSON.parse(record.workerRuntimeCanonicalJson);
    if (canonicalJsonSlice05(inventory) !== record.inventoryCanonicalJson
      || canonicalJsonSlice05(workerRuntime) !== record.workerRuntimeCanonicalJson) {
      fail(code, "runtime canonical JSON is not canonical");
    }
    const payload = structuredClone(inventory);
    delete payload.attestation;
    const recomputedPayloadSha256 = sha256Slice10(Buffer.from(canonicalJsonSlice05(payload)));
    const recomputedWorkerRuntime = canonicalJsonSlice05(expectedWorkerRuntime(inventory));
    assertNoImagePipeline(inventory);
    if (inventory?.attestation?.payloadSha256 !== recomputedPayloadSha256
      || record.inventoryPayloadSha256 !== recomputedPayloadSha256
      || record.workerRuntimeCanonicalJson !== recomputedWorkerRuntime
      || record.workerRuntimeSha256 !== sha256Slice10(Buffer.from(recomputedWorkerRuntime))) {
      fail(code, "runtime payload or worker-runtime projection hash is invalid");
    }
  } catch (cause) {
    if (cause instanceof Slice10RuntimeObserverError && cause.code === code) throw cause;
    fail(code, "runtime canonical JSON cannot be parsed", { cause });
  }
  exact(record.evidenceBoundary, Object.keys(SLICE10_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice10(record.evidenceBoundary) !== stableStringifySlice10(SLICE10_EVIDENCE_BOUNDARY)
    || !SHA_RE.test(record.contentHash ?? "") || record.contentHash !== contentHashSlice10(record)) {
    fail(code, "runtime-end evidence boundary or self hash is invalid");
  }
  return record;
}

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (!["EINVAL", "EPERM", "EISDIR"].includes(error?.code)) throw error;
  } finally {
    await handle?.close();
  }
}

async function assertSafeOperationRoot(operationResultsRoot) {
  if (typeof operationResultsRoot !== "string" || !path.isAbsolute(operationResultsRoot)) {
    fail("S10_RUNTIME_END_INPUT_INVALID", "operation result root must be absolute");
  }
  const resolved = path.resolve(operationResultsRoot);
  const stat = await lstat(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("S10_RUNTIME_END_INPUT_INVALID", "operation result root must be a real directory");
  const actual = path.resolve(await realpath(resolved));
  if (actual.toLowerCase() !== resolved.toLowerCase()) fail("S10_RUNTIME_END_INPUT_INVALID", "operation result root cannot traverse a link or junction");
  return resolved;
}

export function createSlice10RuntimeEndObserver({
  projectRoot = PROJECT_ROOT,
  inventoryProvider = inventorySharpRuntimeSlice05,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof inventoryProvider !== "function" || typeof now !== "function") {
    fail("S10_RUNTIME_END_INPUT_INVALID", "inventory provider and clock are required");
  }
  return async function observeSlice10RuntimeEnd({ context, operation, runtimeStartRef, operationResultsRoot } = {}) {
    if (!plain(context) || !plain(context.index) || !plain(context.runtime) || !OPERATIONS.has(operation)) {
      fail("S10_RUNTIME_END_INPUT_INVALID", "definition context and operation are invalid");
    }
    validateRef(runtimeStartRef, "runtimeStartRef");
    validateRef(context.index.runtimeRef, "definition runtimeRef");
    if (!sameRef(runtimeStartRef, context.index.runtimeRef) || context.runtime.id !== runtimeStartRef.id
      || context.runtime.contentHash !== runtimeStartRef.contentHash
      || definitionContentHash(context.runtime) !== context.runtime.contentHash) {
      fail("S10_RUNTIME_END_INPUT_INVALID", "runtime start reference does not reopen the frozen runtime record");
    }
    const root = await assertSafeOperationRoot(operationResultsRoot);
    const inventory = await inventoryProvider({ projectRoot });
    assertNoImagePipeline(inventory);
    const inventoryCanonicalJson = canonicalJsonSlice05(inventory);
    const workerRuntimeCanonicalJson = canonicalJsonSlice05(expectedWorkerRuntime(inventory));
    const workerRuntimeSha256 = sha256Slice10(Buffer.from(workerRuntimeCanonicalJson));
    if (inventoryCanonicalJson !== context.runtime.inventoryCanonicalJson
      || inventory?.attestation?.payloadSha256 !== context.runtime.inventoryPayloadSha256
      || workerRuntimeCanonicalJson !== context.runtime.workerRuntimeCanonicalJson
      || workerRuntimeSha256 !== context.runtime.workerRuntimeSha256) {
      fail("S10_RUNTIME_END_DRIFT", "post-terminal runtime differs from the frozen start attestation");
    }
    const observedAt = exactUtc(now());
    if (typeof context.runtime.frozenAt === "string" && observedAt < context.runtime.frozenAt) {
      fail("S10_RUNTIME_END_INPUT_INVALID", "runtime end observation precedes the frozen start attestation");
    }
    const draft = {
      schemaVersion: "runtime-end-observation.slice10.v0",
      id: `RUNTIME-END-${operation.toUpperCase()}@0.10.0`,
      operation,
      runtimeStartRef: structuredClone(runtimeStartRef),
      observedAt,
      observationState: "post-terminal-read-versions-only-no-image-pipeline",
      inventoryCanonicalJson,
      inventoryPayloadSha256: inventory.attestation.payloadSha256,
      workerRuntimeCanonicalJson,
      workerRuntimeSha256,
      matchesFrozen: true,
      imageProcessingPerformed: false,
      evidenceBoundary: structuredClone(SLICE10_EVIDENCE_BOUNDARY),
    };
    const record = validateSlice10RuntimeEndObservation(Object.freeze({ ...draft, contentHash: contentHashSlice10(draft) }));
    const bytes = Buffer.from(stableStringifySlice10(record));
    const outputPath = path.join(root, "runtime-end.json");
    try {
      await writeFile(outputPath, bytes, { flag: "wx" });
      const handle = await open(outputPath, "r+");
      try { await handle.sync(); } finally { await handle.close(); }
      await syncDirectory(root);
    } catch (cause) {
      fail(cause?.code === "EEXIST" ? "S10_RUNTIME_END_REPLAY_DENIED" : "S10_RUNTIME_END_PUBLICATION_FAILED",
        "runtime-end observation could not be published exactly once", { cause });
    }
    return Object.freeze({
      path: "runtime-end.json",
      id: record.id,
      contentHash: record.contentHash,
      byteLength: bytes.length,
      fileSha256: sha256Slice10(bytes),
    });
  };
}
