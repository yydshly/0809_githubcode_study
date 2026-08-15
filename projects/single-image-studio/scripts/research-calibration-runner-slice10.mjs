import { createHash } from "node:crypto";
import { appendFile, mkdir, open, readFile, readdir, rename, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  SLICE10_EVIDENCE_BOUNDARY,
  buildSlice10CalibrationSummary,
  contentHashSlice10,
  createSlice10CalibrationRequest,
  createSlice10CalibrationTerminal,
  stableStringifySlice10,
  validateSlice10CalibrationRequest,
} from "./research-calibration-protocol-slice10.mjs";

export const SLICE10_CALIBRATION_RUNNER_ID = "RUNNER-OPEN-CALIBRATION@0.10.0";
const OPERATIONS = Object.freeze(["normalize", "export"]);
const PARTITION_COUNTS = Object.freeze({ "dev/calibration": 30, "defect/calibration": 18 });
const GLOBAL_STOP_STATUSES = new Set(["protocol-failed", "inconclusive"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: contentHashSlice10(value) }); }
function utc(value) {
  const result = typeof value === "function" ? value() : value;
  if (typeof result !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(result)
    || new Date(result).toISOString() !== result) throw Object.assign(new Error("clock must return canonical UTC"), { code: "S10_RUNNER_CLOCK_INVALID" });
  return result;
}
function fail(code, message) { throw Object.assign(new Error(message), { code }); }
function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function exact(value, keys, code, label) {
  if (!plain(value) || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) fail(code, `${label} keys invalid`);
}
function recordRef(record, relativePath, bytes = bytesOf(record)) {
  const recordId = record.id ?? record.requestId ?? record.terminalId ?? record.summaryId;
  return Object.freeze({
    path: relativePath, id: recordId, contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256(bytes),
  });
}
function validateRef(ref, label) {
  exact(ref, ["byteLength", "contentHash", "fileSha256", "id", "path"], "S10_RUNNER_REF_INVALID", label);
  if (!Number.isSafeInteger(ref.byteLength) || ref.byteLength < 2 || !/^[0-9a-f]{64}$/u.test(ref.contentHash)
    || !/^[0-9a-f]{64}$/u.test(ref.fileSha256) || typeof ref.id !== "string" || typeof ref.path !== "string"
    || ref.path.includes("\\") || ref.path.startsWith("/") || ref.path.split("/").some((part) => ["", ".", ".."].includes(part))) {
    fail("S10_RUNNER_REF_INVALID", `${label} invalid`);
  }
}
function closedEvidence(value) {
  if (stableStringifySlice10(value) !== stableStringifySlice10(SLICE10_EVIDENCE_BOUNDARY)) {
    fail("S10_RUNNER_EVIDENCE_PROMOTION", "evidence boundary changed");
  }
}

function closedSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}
function recordSchema(name, properties) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-10/schemas/${name}.schema.json`,
    ...closedSchema(properties),
  };
}
const text = { type: "string", minLength: 1, maxLength: 200000 };
const hex = { type: "string", pattern: "^[0-9a-f]{64}$" };
const refSchema = closedSchema({
  byteLength: { type: "integer", minimum: 2 }, contentHash: hex, fileSha256: hex, id: text, path: text,
});
const evidenceSchema = closedSchema(Object.fromEntries(Object.entries(SLICE10_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])));

export const SLICE10_RUNNER_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/calibration-claim.slice10.v0.schema.json": recordSchema("calibration-claim.slice10.v0", {
    schemaVersion: { const: "calibration-claim.slice10.v0" }, id: text, requestRef: refSchema,
    idempotencyKeyHash: hex, claimedAt: text, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-ledger-event.slice10.v0.schema.json": recordSchema("calibration-ledger-event.slice10.v0", {
    schemaVersion: { const: "calibration-ledger-event.slice10.v0" }, id: text,
    sequence: { type: "integer", minimum: 1 }, eventType: { enum: ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"] },
    requestRef: refSchema, previousEventHash: { oneOf: [{ type: "null" }, hex] }, payloadSha256: hex,
    occurredAt: text, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-artifact.slice10.v0.schema.json": recordSchema("calibration-artifact.slice10.v0", {
    schemaVersion: { const: "calibration-artifact.slice10.v0" }, id: text, operation: { enum: OPERATIONS },
    requestRef: refSchema, candidateRef: refSchema, contractRef: refSchema, runtimeRef: refSchema,
    bytes: closedSchema({ relativePath: text, byteLength: { type: "integer", minimum: 1, maximum: 1048576 }, fileSha256: hex }),
    decodedPixelSha256: hex, createdAt: text, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-oracle-facts.slice10.v0.schema.json": recordSchema("calibration-oracle-facts.slice10.v0", {
    schemaVersion: { const: "calibration-oracle-facts.slice10.v0" }, id: text, operation: { enum: OPERATIONS },
    decodedPixelSha256: hex, factsCanonicalJson: text, factsSha256: hex, strictDecision: { const: "pass" },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-publication.slice10.v0.schema.json": recordSchema("calibration-publication.slice10.v0", {
    schemaVersion: { const: "calibration-publication.slice10.v0" }, id: text, requestRef: refSchema,
    artifactRef: refSchema, artifactRecordRef: refSchema, oracleRef: refSchema,
    publicationState: { const: "prepared-not-committed" }, preparedAt: text,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});

async function durableJson(filePath, record) {
  const bytes = bytesOf(record);
  await durableBytes(filePath, bytes);
  return bytes;
}
async function durableBytes(filePath, bytes) {
  await writeFile(filePath, bytes, { flag: "wx" });
  const handle = await open(filePath, "r+");
  try { await handle.sync(); } finally { await handle.close(); }
}
async function syncDirectory(directory) {
  let handle;
  try { handle = await open(directory, "r"); await handle.sync(); } catch (error) {
    if (!["EINVAL", "EPERM", "EISDIR"].includes(error?.code)) throw error;
  } finally { await handle?.close(); }
}
async function assertUnusedRoot(root) {
  if (!path.isAbsolute(root ?? "")) fail("S10_RESULTS_ROOT_INVALID", "absolute operation result root required");
  try {
    const entries = await readdir(root);
    if (entries.length >= 0) fail("S10_RESULTS_ROOT_ALREADY_EXISTS", "operation result root is immutable once created");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function validateCases(operation, cases) {
  if (!OPERATIONS.includes(operation) || !Array.isArray(cases) || cases.length !== 48) {
    fail("S10_RUNNER_DENOMINATOR_INVALID", "one operation requires 48 cases");
  }
  const ids = new Set();
  const partitionCounts = { "dev/calibration": 0, "defect/calibration": 0 };
  const dispositionCounts = { applicable: 0, rejection: 0 };
  for (const item of cases) {
    exact(item, ["disposition", "expectedStableErrorCode", "goldIdentityRef", "manifestRef", "partition", "sourceRef"], "S10_RUNNER_CASE_INVALID", "case");
    validateRef(item.sourceRef, "sourceRef");
    validateRef(item.manifestRef, "manifestRef");
    if (ids.has(item.sourceRef.id) || !(item.partition in partitionCounts) || !["applicable", "rejection"].includes(item.disposition)) {
      fail("S10_RUNNER_CASE_INVALID", "case identity, partition or disposition invalid");
    }
    ids.add(item.sourceRef.id);
    partitionCounts[item.partition] += 1;
    dispositionCounts[item.disposition] += 1;
    if (item.disposition === "applicable") {
      validateRef(item.goldIdentityRef, "goldIdentityRef");
      if (item.expectedStableErrorCode !== null) fail("S10_RUNNER_CASE_INVALID", "applicable case cannot expect rejection code");
    } else if (item.goldIdentityRef !== null || typeof item.expectedStableErrorCode !== "string"
      || !/^S10_[A-Z0-9_]+$/u.test(item.expectedStableErrorCode)) {
      fail("S10_RUNNER_CASE_INVALID", "rejection case must be gold-free with exact code");
    }
  }
  if (partitionCounts["dev/calibration"] !== 30 || partitionCounts["defect/calibration"] !== 18
    || dispositionCounts.applicable !== 24 || dispositionCounts.rejection !== 24) {
    fail("S10_RUNNER_DENOMINATOR_INVALID", "operation requires 30+18 and 24+24 strata");
  }
}

function requestFor({ operation, item, repetition, refs, createdAt }) {
  const idempotencyKey = sha256(Buffer.from([
    operation, item.manifestRef.contentHash, item.sourceRef.id, repetition, 1,
  ].join("\0")));
  return createSlice10CalibrationRequest({
    requestId: `request.s10.${operation}.${item.sourceRef.id}.r${repetition}.a1`, operation,
    admissionRef: refs.admissionRef, candidateRef: refs.candidateRef, contractRef: refs.contractRef,
    manifestRef: item.manifestRef, sourceRef: item.sourceRef, goldIdentityRef: item.goldIdentityRef,
    runtimeRef: refs.runtimeRef, workerRef: refs.workerRef,
    attempt: { sourceId: item.sourceRef.id, partition: item.partition, repetition, attemptNumber: 1 },
    disposition: item.disposition, expectedStableErrorCode: item.expectedStableErrorCode,
    idempotencyKey, createdAt,
  });
}

function validateExecution(value, disposition, expectedCode) {
  if (!plain(value) || typeof value.kind !== "string") fail("S10_EXECUTION_PROTOCOL_INVALID", "executor response must be closed");
  if (disposition === "rejection") {
    exact(value, ["actualStableErrorCode", "kind", "workerInvoked"], "S10_EXECUTION_PROTOCOL_INVALID", "rejection execution");
    if (value.kind !== "rejection-pass" || value.workerInvoked !== false || value.actualStableErrorCode !== expectedCode) {
      return { status: "non-pass", actualStableErrorCode: value.actualStableErrorCode ?? null, reasonCode: "S10_REJECTION_CLASSIFICATION_MISMATCH", workerInvoked: value.workerInvoked === true, workerExitConfirmed: null };
    }
    return { status: "pass", actualStableErrorCode: expectedCode, reasonCode: null, workerInvoked: false, workerExitConfirmed: null };
  }
  if (value.kind === "applicable-pass") {
    exact(value, ["decodedPixelSha256", "kind", "oracleFacts", "outputBytes", "workerExitConfirmed", "workerInvoked"], "S10_EXECUTION_PROTOCOL_INVALID", "applicable execution");
    if (!(value.outputBytes instanceof Uint8Array) || value.outputBytes.length < 1 || value.outputBytes.length > 1048576
      || !/^[0-9a-f]{64}$/u.test(value.decodedPixelSha256) || !plain(value.oracleFacts)
      || value.workerInvoked !== true || value.workerExitConfirmed !== true) {
      fail("S10_EXECUTION_PROTOCOL_INVALID", "applicable pass lacks bounded bytes, oracle facts or confirmed worker exit");
    }
    return value;
  }
  exact(value, ["actualStableErrorCode", "kind", "reasonCode", "status", "workerExitConfirmed", "workerInvoked"], "S10_EXECUTION_PROTOCOL_INVALID", "nonpass execution");
  if (value.kind !== "non-pass" || !["non-pass", "protocol-failed", "inconclusive"].includes(value.status)
    || !/^S10_[A-Z0-9_]+$/u.test(value.reasonCode) || ![true, false].includes(value.workerInvoked)
    || ![true, false, null].includes(value.workerExitConfirmed)) fail("S10_EXECUTION_PROTOCOL_INVALID", "nonpass response invalid");
  return value;
}

export async function runSlice10CalibrationOperation({
  resultsRoot, operation, cases, refs, executeAttempt, verifyRuntimeEnd,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof executeAttempt !== "function" || typeof verifyRuntimeEnd !== "function" || !plain(refs)) {
    fail("S10_RUNNER_INPUT_INVALID", "executor, runtime-end verifier and refs required");
  }
  validateCases(operation, cases);
  for (const key of ["admissionRef", "candidateRef", "contractRef", "preregistrationRef", "runtimeRef"]) validateRef(refs[key], key);
  exact(refs.workerRef, ["id", "implementationSha256", "path", "version"], "S10_RUNNER_INPUT_INVALID", "workerRef");
  await assertUnusedRoot(resultsRoot);
  await mkdir(path.dirname(resultsRoot), { recursive: true });
  await mkdir(resultsRoot);
  for (const name of ["requests", "claims", "terminals", "closures", ".staging"]) await mkdir(path.join(resultsRoot, name));
  const ledgerPath = path.join(resultsRoot, "ledger.ndjson");
  let sequence = 0;
  let previousEventHash = null;
  const terminalInputs = [];
  const appendEvent = async (eventType, requestRef, payload) => {
    const event = withHash({
      schemaVersion: "calibration-ledger-event.slice10.v0", id: `event.s10.${operation}.${String(++sequence).padStart(4, "0")}`,
      sequence, eventType, requestRef, previousEventHash, payloadSha256: sha256(bytesOf(payload)),
      occurredAt: utc(now), evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
    });
    await appendFile(ledgerPath, bytesOf(event), { flag: "a" });
    const handle = await open(ledgerPath, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    previousEventHash = event.contentHash;
    return event;
  };

  const operationStartedAt = utc(now);
  let globalStop = null;
  outer: for (const item of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const request = requestFor({ operation, item, repetition, refs, createdAt: utc(now) });
      validateSlice10CalibrationRequest(request);
      const requestBytes = await durableJson(path.join(resultsRoot, "requests", `${request.requestId}.json`), request);
      const requestRef = recordRef(request, `requests/${request.requestId}.json`, requestBytes);
      const claim = withHash({
        schemaVersion: "calibration-claim.slice10.v0", id: `claim.${request.requestId}`, requestRef,
        idempotencyKeyHash: sha256(Buffer.from(request.idempotencyKey)), claimedAt: utc(now),
        evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
      });
      await durableJson(path.join(resultsRoot, "claims", `${request.requestId}.json`), claim);
      await appendEvent("attempt-started", requestRef, claim);
      const startedAt = utc(now);
      let raw;
      try { raw = await executeAttempt(Object.freeze({ request })); } catch (error) {
        raw = {
          kind: "non-pass", status: error?.code === "S10_PUBLICATION_RECONCILIATION_UNKNOWN" ? "inconclusive" : "protocol-failed",
          reasonCode: typeof error?.code === "string" && /^S10_[A-Z0-9_]+$/u.test(error.code) ? error.code : "S10_EXECUTION_UNCLASSIFIED_FAILURE",
          actualStableErrorCode: null, workerInvoked: error?.workerInvoked === true,
          workerExitConfirmed: [true, false].includes(error?.workerExitConfirmed) ? error.workerExitConfirmed : null,
        };
      }
      const execution = validateExecution(raw, item.disposition, item.expectedStableErrorCode);
      let artifactRef = null;
      let oracleRef = null;
      let terminal;
      if (execution.kind === "applicable-pass") {
        const outputBytes = Buffer.from(execution.outputBytes);
        const closureRelative = `closures/${request.requestId}`;
        const stage = path.join(resultsRoot, ".staging", request.requestId);
        const destination = path.join(resultsRoot, "closures", request.requestId);
        await mkdir(stage);
        const bytesRelativePath = `${closureRelative}/output.png`;
        await durableBytes(path.join(stage, "output.png"), outputBytes);
        const artifact = withHash({
          schemaVersion: "calibration-artifact.slice10.v0", id: `artifact.${request.requestId}`, operation,
          requestRef, candidateRef: refs.candidateRef, contractRef: refs.contractRef, runtimeRef: refs.runtimeRef,
          bytes: { relativePath: bytesRelativePath, byteLength: outputBytes.length, fileSha256: sha256(outputBytes) },
          decodedPixelSha256: execution.decodedPixelSha256, createdAt: utc(now), evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
        });
        const artifactBytes = bytesOf(artifact);
        const artifactRecordRef = recordRef(artifact, `${closureRelative}/artifact.json`, artifactBytes);
        artifactRef = Object.freeze({
          path: bytesRelativePath, id: `output.${request.requestId}`, contentHash: sha256(outputBytes),
          byteLength: outputBytes.length, fileSha256: sha256(outputBytes),
        });
        const factsCanonicalJson = stableStringifySlice10(execution.oracleFacts);
        const factsSha256 = sha256(Buffer.from(factsCanonicalJson));
        const oracle = withHash({
          schemaVersion: "calibration-oracle-facts.slice10.v0",
          id: `oracle-facts.${operation}.${execution.decodedPixelSha256}.${factsSha256}`,
          operation, decodedPixelSha256: execution.decodedPixelSha256, factsCanonicalJson, factsSha256,
          strictDecision: "pass", evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
        });
        const oracleBytes = bytesOf(oracle);
        oracleRef = recordRef(oracle, `${closureRelative}/oracle.json`, oracleBytes);
        terminal = createSlice10CalibrationTerminal({
          terminalId: `terminal.${request.requestId}`, operation, disposition: item.disposition, requestRef,
          status: "pass", actualStableErrorCode: null, reasonCode: null, workerInvoked: true,
          workerExitConfirmed: true, artifactRef, oracleRef, startedAt, finishedAt: utc(now),
        });
        const publication = withHash({
          schemaVersion: "calibration-publication.slice10.v0", id: `publication.${request.requestId}`,
          requestRef, artifactRef, artifactRecordRef, oracleRef,
          publicationState: "prepared-not-committed", preparedAt: terminal.finishedAt,
          evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
        });
        await durableBytes(path.join(stage, "artifact.json"), artifactBytes);
        await durableBytes(path.join(stage, "oracle.json"), oracleBytes);
        await durableJson(path.join(stage, "publication.json"), publication);
        await durableJson(path.join(stage, "terminal.json"), terminal);
        await appendEvent("publication-intent", requestRef, publication);
        await syncDirectory(stage);
        await rename(stage, destination);
        await syncDirectory(path.join(resultsRoot, "closures"));
        await appendEvent("publication-complete", requestRef, publication);
      } else {
        terminal = createSlice10CalibrationTerminal({
          terminalId: `terminal.${request.requestId}`, operation, disposition: item.disposition, requestRef,
          status: execution.status, actualStableErrorCode: execution.actualStableErrorCode ?? null,
          reasonCode: execution.reasonCode, workerInvoked: execution.workerInvoked,
          workerExitConfirmed: execution.workerExitConfirmed, artifactRef: null, oracleRef: null,
          startedAt, finishedAt: utc(now),
        });
        await durableJson(path.join(resultsRoot, "terminals", `${request.requestId}.json`), terminal);
      }
      await appendEvent("attempt-terminal", requestRef, terminal);
      terminalInputs.push({ request, terminal });
      if (GLOBAL_STOP_STATUSES.has(terminal.status)) {
        globalStop = Object.freeze({ status: terminal.status, reasonCode: terminal.reasonCode, requestRef });
        break outer;
      }
    }
  }
  if (globalStop) return Object.freeze({ status: globalStop.status, globalStop, terminalInputs: Object.freeze(terminalInputs), summary: null, ledgerTail: previousEventHash });
  const runtimeEndRef = await verifyRuntimeEnd(Object.freeze({
    operation, runtimeStartRef: refs.runtimeRef, operationResultsRoot: resultsRoot,
  }));
  try { validateRef(runtimeEndRef, "runtimeEndRef"); } catch (cause) {
    fail("S10_RUNTIME_END_DRIFT", "runtime end observation did not match the frozen start observation");
  }
  if (runtimeEndRef.id === refs.runtimeRef.id && runtimeEndRef.contentHash === refs.runtimeRef.contentHash) {
    fail("S10_RUNTIME_END_DRIFT", "runtime end observation must be a distinct post-run record");
  }
  const summary = buildSlice10CalibrationSummary({
    operation, admissionRef: refs.admissionRef, preregistrationRef: refs.preregistrationRef,
    runtimeEndRef,
    registeredCases: cases.map((item) => ({
      sourceId: item.sourceRef.id, partition: item.partition, disposition: item.disposition,
      expectedStableErrorCode: item.expectedStableErrorCode, manifestContentHash: item.manifestRef.contentHash,
    })),
    terminals: terminalInputs, runtimeStableBeforeAndAfter: true,
    startedAt: operationStartedAt, finishedAt: utc(now),
  });
  await durableJson(path.join(resultsRoot, "summary.json"), summary);
  if ((await readdir(path.join(resultsRoot, ".staging"))).length === 0) await rmdir(path.join(resultsRoot, ".staging"));
  await syncDirectory(resultsRoot);
  return Object.freeze({ status: summary.overallStatus, globalStop: null, terminalInputs: Object.freeze(terminalInputs), summary, ledgerTail: previousEventHash });
}

export async function readSlice10Ledger(ledgerPath) {
  const textValue = await readFile(ledgerPath, "utf8");
  const records = textValue.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  let previous = null;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.sequence !== index + 1 || record.previousEventHash !== previous
      || record.contentHash !== contentHashSlice10(record)) fail("S10_LEDGER_INVALID", "ledger sequence/hash chain invalid");
    closedEvidence(record.evidenceBoundary);
    previous = record.contentHash;
  }
  return Object.freeze(records);
}
