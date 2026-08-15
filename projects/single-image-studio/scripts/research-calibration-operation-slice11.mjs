import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";

import {
  SLICE11_DURABLE_SCHEMA_DOCUMENTS,
  createSlice11DurableAttemptHooks,
  createSlice11RuntimeObservation,
  validateSlice11Publication,
  validateSlice11RuntimeObservation,
} from "./research-calibration-durable-slice11.mjs";
import {
  SLICE11_EVIDENCE_BOUNDARY,
} from "./research-calibration-lifecycle-slice11.mjs";
import {
  sha256Slice11,
  stableStringifySlice11,
} from "./research-expected-projection-slice11.mjs";
import {
  contentHashProtocolSlice11,
  contentRefSlice11,
  validateSlice11CalibrationSummary,
  validateSlice11RecordRef,
} from "./research-calibration-protocol-slice11.mjs";
import { runSlice11CalibrationOperation } from "./research-calibration-runner-slice11.mjs";

const SHA_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u;
const CONTENT_REF_KEYS = Object.freeze(["contentHash", "id"]);
const CLAIM_KEYS = Object.freeze([
  "caseSetSha256", "claimedAt", "claimId", "contentHash", "evidenceBoundary", "operation", "runId",
  "runtimeBindingRef", "schemaVersion",
]);
const EVENT_KEYS = Object.freeze([
  "contentHash", "eventId", "eventType", "evidenceBoundary", "occurredAt", "operation", "previousEventHash",
  "publicationRef", "requestRef", "schemaVersion", "sequence",
]);
const CLOSE_KEYS = Object.freeze([
  "claimRef", "closedAt", "closureCount", "contentHash", "evidenceBoundary", "eventCount", "ledgerByteLength",
  "ledgerFileSha256", "ledgerTailHash", "operation", "reasonCode", "requestCount", "runtimeEndRef",
  "runtimeStartRef", "schemaVersion", "status", "summaryRef",
]);

export class Slice11OperationError extends Error {
  constructor(code, message, options = {}) {
    super(`${code}: ${message}`, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "Slice11OperationError";
    this.code = code;
    this.partial = options.partial ?? null;
  }
}

function fail(code, message, options) { throw new Slice11OperationError(code, message, options); }
function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exact(value, keys, code, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(code, `${label} shape is not closed`);
  }
}
function sha(value, code, label) {
  if (typeof value !== "string" || !SHA_RE.test(value)) fail(code, `${label} is not lowercase SHA-256`);
}
function id(value, code, label) {
  if (typeof value !== "string" || !ID_RE.test(value) || value.includes("..")) fail(code, `${label} invalid`);
}
function utc(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail(code, `${label} must be exact UTC`);
}
function evidence(value, code) {
  exact(value, Object.keys(SLICE11_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice11(value) !== stableStringifySlice11(SLICE11_EVIDENCE_BOUNDARY)) fail(code, "evidence boundary promoted");
}
function contentRef(value, code, label, nullable = false) {
  if (nullable && value === null) return;
  exact(value, CONTENT_REF_KEYS, code, label);
  id(value.id, code, `${label}.id`);
  sha(value.contentHash, code, `${label}.contentHash`);
}
function withHash(record) {
  const value = { ...record, contentHash: "" };
  value.contentHash = contentHashProtocolSlice11(value);
  return value;
}
function selfHash(record, code) {
  sha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashProtocolSlice11(record)) fail(code, "contentHash mismatch");
}
function canonicalBytes(record) { return Buffer.from(`${stableStringifySlice11(record)}\n`, "utf8"); }
function observedAt(now) {
  const value = now();
  utc(value, "S11_OPERATION_TIME_INVALID", "clock value");
  return value;
}
async function durableBytes(filePath, bytes, flag = "wx") {
  const handle = await open(filePath, flag);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
async function syncDirectory(directory) {
  let handle;
  try { handle = await open(directory, "r"); await handle.sync(); }
  catch (error) { if (!["EINVAL", "EPERM", "EISDIR"].includes(error?.code)) throw error; }
  finally { await handle?.close(); }
}
async function safeRoot(operationRoot) {
  if (!path.isAbsolute(operationRoot ?? "")) fail("S11_OPERATION_ROOT_INVALID", "absolute operation root required");
  await mkdir(operationRoot, { recursive: true });
  const info = await lstat(operationRoot);
  const actual = await realpath(operationRoot);
  if (!info.isDirectory() || info.isSymbolicLink() || path.resolve(actual) !== path.resolve(operationRoot)) {
    fail("S11_OPERATION_ROOT_INVALID", "operation root cannot be redirected");
  }
  return path.resolve(operationRoot);
}
function child(root, ...parts) {
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(`${root}${path.sep}`)) fail("S11_OPERATION_PATH_INVALID", "operation path escapes root");
  return target;
}
function caseSetHash(cases) {
  return sha256Slice11(Buffer.from(`${stableStringifySlice11(cases)}\n`, "utf8"));
}

export function createSlice11OperationClaim({ runId, operation, cases, runtimeBindingRef, claimedAt } = {}) {
  if (!Array.isArray(cases) || cases.length !== 48) fail("S11_OPERATION_CLAIM_INVALID", "claim requires 48 cases");
  const record = withHash({
    schemaVersion: "calibration-operation-claim.slice11.v0", claimId: `operation-claim.${runId}.${operation}`,
    runId, operation, caseSetSha256: caseSetHash(cases), runtimeBindingRef: structuredClone(runtimeBindingRef),
    claimedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11OperationClaim(record);
  return Object.freeze(record);
}

export function validateSlice11OperationClaim(record) {
  const code = "S11_OPERATION_CLAIM_INVALID";
  exact(record, CLAIM_KEYS, code, "operation claim");
  if (record.schemaVersion !== "calibration-operation-claim.slice11.v0" || !["normalize", "export"].includes(record.operation)) {
    fail(code, "operation claim identity invalid");
  }
  id(record.claimId, code, "claimId");
  id(record.runId, code, "runId");
  sha(record.caseSetSha256, code, "caseSetSha256");
  validateSlice11RecordRef(record.runtimeBindingRef, code, "runtimeBindingRef");
  utc(record.claimedAt, code, "claimedAt");
  if (record.claimId !== `operation-claim.${record.runId}.${record.operation}`) fail(code, "claim id derivation invalid");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

export function createSlice11DurableEvent({ sequence, eventType, request, publication, previousEventHash, occurredAt } = {}) {
  if (!plain(publication) || !["calibration-publication.slice11.v0", "calibration-terminal-publication.slice11.v0"]
    .includes(publication.schemaVersion) || publication.contentHash !== contentHashProtocolSlice11(publication)
    || publication.requestRef?.id !== request?.requestId || publication.requestRef?.contentHash !== request?.contentHash) {
    fail("S11_DURABLE_EVENT_INVALID", "publication identity/request/self-hash invalid");
  }
  if (publication.schemaVersion === "calibration-publication.slice11.v0") validateSlice11Publication(publication);
  const record = withHash({
    schemaVersion: "calibration-durable-event.slice11.v0", eventId: `durable-event.s11.${request.operation}.${String(sequence).padStart(4, "0")}`,
    sequence, eventType, operation: request.operation, requestRef: contentRefSlice11(request, "requestId"),
    publicationRef: { id: publication.publicationId, contentHash: publication.contentHash }, previousEventHash,
    occurredAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11DurableEvent(record);
  return Object.freeze(record);
}

export function validateSlice11DurableEvent(record) {
  const code = "S11_DURABLE_EVENT_INVALID";
  exact(record, EVENT_KEYS, code, "durable event");
  if (record.schemaVersion !== "calibration-durable-event.slice11.v0" || !Number.isSafeInteger(record.sequence)
    || record.sequence < 1 || !["normalize", "export"].includes(record.operation)
    || !["publication-intent", "publication-complete"].includes(record.eventType)) {
    fail(code, "durable event identity invalid");
  }
  id(record.eventId, code, "eventId");
  contentRef(record.requestRef, code, "requestRef");
  contentRef(record.publicationRef, code, "publicationRef");
  if (record.previousEventHash !== null) sha(record.previousEventHash, code, "previousEventHash");
  utc(record.occurredAt, code, "occurredAt");
  if (record.eventId !== `durable-event.s11.${record.operation}.${String(record.sequence).padStart(4, "0")}`
    || !record.requestRef.id.startsWith(`request.s11.${record.operation}.`)) fail(code, "durable event id/operation derivation invalid");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

export function validateSlice11DurableLedger(events) {
  const code = "S11_DURABLE_LEDGER_INVALID";
  if (!Array.isArray(events) || events.length < 2 || events.length % 2 !== 0) fail(code, "ledger requires complete intent/complete pairs");
  let previous = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    validateSlice11DurableEvent(event);
    if (event.sequence !== index + 1 || event.previousEventHash !== previous
      || event.eventType !== (index % 2 === 0 ? "publication-intent" : "publication-complete")) {
      fail(code, "ledger sequence/chain/type invalid");
    }
    if (index % 2 === 1) {
      const intent = events[index - 1];
      if (event.requestRef.id !== intent.requestRef.id || event.requestRef.contentHash !== intent.requestRef.contentHash
        || event.publicationRef.id !== intent.publicationRef.id || event.publicationRef.contentHash !== intent.publicationRef.contentHash) {
        fail(code, "ledger publication pair mismatch");
      }
    }
    previous = event.contentHash;
  }
  return true;
}

export function createSlice11OperationClose({
  operation, claim, runtimeStart, runtimeEnd, summary, ledgerBytes, events, requestCount, closureCount, status, reasonCode, closedAt,
} = {}) {
  const record = withHash({
    schemaVersion: "calibration-operation-close.slice11.v0", operation, status, reasonCode,
    claimRef: contentRefSlice11(claim, "claimId"), runtimeStartRef: contentRefSlice11(runtimeStart, "observationId"),
    runtimeEndRef: contentRefSlice11(runtimeEnd, "observationId"),
    summaryRef: summary === null ? null : contentRefSlice11(summary, "summaryId"), requestCount, closureCount,
    eventCount: events.length, ledgerTailHash: events.at(-1)?.contentHash ?? null,
    ledgerByteLength: ledgerBytes.length, ledgerFileSha256: sha256Slice11(ledgerBytes), closedAt,
    evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11OperationClose(record, { claim, runtimeStart, runtimeEnd, summary, ledgerBytes, events });
  return Object.freeze(record);
}

export function validateSlice11OperationClose(record, { claim, runtimeStart, runtimeEnd, summary, ledgerBytes, events } = {}) {
  const code = "S11_OPERATION_CLOSE_INVALID";
  exact(record, CLOSE_KEYS, code, "operation close");
  if (record.schemaVersion !== "calibration-operation-close.slice11.v0" || !["normalize", "export"].includes(record.operation)
    || !["calibration-complete-pass", "calibration-complete-non-pass", "protocol-failed", "inconclusive"].includes(record.status)
    || !Number.isSafeInteger(record.requestCount) || record.requestCount < 1 || record.requestCount > 144
    || record.closureCount !== record.requestCount || record.eventCount !== record.requestCount * 2
    || !Number.isSafeInteger(record.ledgerByteLength) || record.ledgerByteLength < 1) fail(code, "operation close counts/state invalid");
  contentRef(record.claimRef, code, "claimRef");
  contentRef(record.runtimeStartRef, code, "runtimeStartRef");
  contentRef(record.runtimeEndRef, code, "runtimeEndRef");
  contentRef(record.summaryRef, code, "summaryRef", true);
  sha(record.ledgerTailHash, code, "ledgerTailHash");
  sha(record.ledgerFileSha256, code, "ledgerFileSha256");
  utc(record.closedAt, code, "closedAt");
  if ((record.status.startsWith("calibration-complete")) !== (record.summaryRef !== null)
    || (record.status === "calibration-complete-pass" && record.reasonCode !== null)
    || (record.status !== "calibration-complete-pass" && typeof record.reasonCode !== "string")) {
    fail(code, "operation close summary/reason binding invalid");
  }
  validateSlice11OperationClaim(claim);
  validateSlice11RuntimeObservation(runtimeStart);
  validateSlice11RuntimeObservation(runtimeEnd);
  if (summary !== null) validateSlice11CalibrationSummary(summary);
  validateSlice11DurableLedger(events);
  let storedEvents;
  try {
    storedEvents = ledgerBytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch { fail(code, "durable ledger bytes are not canonical NDJSON"); }
  if (storedEvents.length !== events.length || storedEvents.some((event, index) =>
    `${stableStringifySlice11(event)}\n` !== canonicalBytes(events[index]).toString("utf8"))) {
    fail(code, "durable ledger bytes differ from supplied events");
  }
  validateSlice11DurableLedger(storedEvents);
  if (record.operation !== claim.operation || runtimeStart.phase !== "start" || runtimeEnd.phase !== "end"
    || record.claimRef.contentHash !== claim.contentHash || record.runtimeStartRef.contentHash !== runtimeStart.contentHash
    || record.runtimeEndRef.contentHash !== runtimeEnd.contentHash || record.eventCount !== events.length
    || record.ledgerTailHash !== events.at(-1).contentHash || record.ledgerByteLength !== ledgerBytes.length
    || record.ledgerFileSha256 !== sha256Slice11(ledgerBytes)) fail(code, "operation close durable binding invalid");
  if (summary !== null && (summary.operation !== record.operation || record.summaryRef.contentHash !== summary.contentHash
    || record.requestCount !== 144 || record.status !== summary.overallStatus)) fail(code, "operation close summary binding invalid");
  if (runtimeStart.runtimeBindingRef.contentHash !== runtimeEnd.runtimeBindingRef.contentHash
    || runtimeStart.frozenPayloadSha256 !== runtimeEnd.frozenPayloadSha256
    || runtimeStart.matchesFrozen !== true || runtimeEnd.matchesFrozen !== true) fail(code, "operation close runtime drift");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

async function claimOperation({ root, runId, operation, cases, runtimeBindingRef, claimedAt }) {
  if ((await readdir(root)).length !== 0) fail("S11_OPERATION_ROOT_NOT_EMPTY", "operation root must be empty before its only claim");
  const claim = createSlice11OperationClaim({ runId, operation, cases, runtimeBindingRef, claimedAt });
  const claimPath = child(root, "operation-claim.json");
  try { await durableBytes(claimPath, canonicalBytes(claim)); await syncDirectory(root); }
  catch (cause) {
    if (cause?.code === "EEXIST") fail("S11_OPERATION_ALREADY_CLAIMED", "existing operation never grants execution authority", { cause });
    throw cause;
  }
  return claim;
}

async function writeRuntimeStart(root, record) {
  const runtimeRoot = child(root, "runtime");
  await mkdir(runtimeRoot);
  await durableBytes(child(runtimeRoot, "start.json"), canonicalBytes(record));
  await syncDirectory(runtimeRoot);
}

async function writeRuntimeEndObservation(root, record) {
  const runtimeRoot = child(root, "runtime");
  await durableBytes(child(runtimeRoot, "end-observation.json"), canonicalBytes(record));
  await syncDirectory(runtimeRoot);
}

async function assertQuiescent(root) {
  try {
    await lstat(child(root, ".staging"));
    fail("S11_OPERATION_NOT_QUIESCENT", "staging directory remains before operation close");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function runSlice11DurableCalibrationOperation({
  operationRoot, runId, operation, cases, refs, executeAttempt, observeRuntime,
  frozenRuntimePayloadSha256, now = () => new Date().toISOString(), publicationHooksForRequest,
} = {}) {
  if (typeof executeAttempt !== "function" || typeof observeRuntime !== "function" || typeof now !== "function"
    || !SHA_RE.test(frozenRuntimePayloadSha256 ?? "")) fail("S11_OPERATION_INPUT_INVALID", "operation inputs invalid");
  const root = await safeRoot(operationRoot);
  const claimedAt = observedAt(now);
  const claim = await claimOperation({ root, runId, operation, cases, runtimeBindingRef: refs?.runtimeRef, claimedAt });
  const runtimeStart = createSlice11RuntimeObservation({ observationId: `runtime-observation.s11.${operation}.start`, phase: "start",
    runtimeBindingRef: refs.runtimeRef, frozenPayloadSha256: frozenRuntimePayloadSha256,
    observedPayload: await observeRuntime("start"), observedAt: observedAt(now) });
  await writeRuntimeStart(root, runtimeStart);
  if (!runtimeStart.matchesFrozen) fail("S11_RUNTIME_START_DRIFT", "runtime start differs from frozen payload");

  const ledgerPath = child(root, "publication-ledger.ndjson");
  const events = [];
  const append = async (eventType, publication) => {
    const event = createSlice11DurableEvent({ sequence: events.length + 1, eventType,
      request: { operation, requestId: publication.requestRef.id, contentHash: publication.requestRef.contentHash },
      publication, previousEventHash: events.at(-1)?.contentHash ?? null, occurredAt: observedAt(now) });
    await durableBytes(ledgerPath, canonicalBytes(event), "a");
    events.push(event);
  };
  const hooks = createSlice11DurableAttemptHooks({ operationRoot: root, now,
    appendPublicationIntent: (publication) => append("publication-intent", publication),
    appendPublicationComplete: (publication) => append("publication-complete", publication),
    publicationHooksForRequest });
  let result;
  try {
    result = await runSlice11CalibrationOperation({ operation, cases, refs, executeAttempt, hooks, now });
  } catch (cause) {
    fail("S11_OPERATION_EXECUTION_INCOMPLETE", "operation did not reach a closable state", { cause, partial: cause?.partial ?? null });
  }
  validateSlice11DurableLedger(events);
  await assertQuiescent(root);
  const runtimeEnd = createSlice11RuntimeObservation({ observationId: `runtime-observation.s11.${operation}.end`, phase: "end",
    runtimeBindingRef: refs.runtimeRef, frozenPayloadSha256: frozenRuntimePayloadSha256,
    observedPayload: await observeRuntime("end"), observedAt: observedAt(now) });
  await writeRuntimeEndObservation(root, runtimeEnd);
  if (!runtimeEnd.matchesFrozen) fail("S11_RUNTIME_END_DRIFT", "runtime end differs from frozen payload", { partial: result });

  const ledgerBytes = await readFile(ledgerPath);
  const reasonCode = result.summary === null ? result.globalStop?.reasonCode ?? "S11_OPERATION_PARTIAL" : result.status === "calibration-complete-pass"
    ? null : "S11_CALIBRATION_NON_PASS";
  const close = createSlice11OperationClose({ operation, claim, runtimeStart, runtimeEnd, summary: result.summary,
    ledgerBytes, events, requestCount: result.requests.length, closureCount: result.terminals.length,
    status: result.status, reasonCode, closedAt: observedAt(now) });
  const stage = child(root, ".operation-close");
  const destination = child(root, "final");
  await mkdir(stage);
  let committed = false;
  try {
    if (result.summary !== null) await durableBytes(child(stage, "summary.json"), canonicalBytes(result.summary));
    await durableBytes(child(stage, "runtime-end.json"), canonicalBytes(runtimeEnd));
    await durableBytes(child(stage, "operation-close.json"), canonicalBytes(close));
    await syncDirectory(stage);
    await rename(stage, destination);
    committed = true;
    await syncDirectory(root);
  } catch (cause) {
    if (committed) fail("S11_OPERATION_CLOSE_RECONCILIATION_UNKNOWN", "final close rename committed before root sync", { cause, partial: result });
    try { await rm(stage, { recursive: true, force: true }); } catch { /* preserve original */ }
    fail("S11_OPERATION_CLOSE_FAILED", "final close was not committed", { cause, partial: result });
  }
  return Object.freeze({ claim, runtimeStart, runtimeEnd, events: Object.freeze(events), result, close, destination });
}

const text = { type: "string", minLength: 1, maxLength: 200000 };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const contentRefSchema = { type: "object", additionalProperties: false, required: [...CONTENT_REF_KEYS],
  properties: { contentHash: hex, id: text } };
const recordRefSchema = { type: "object", additionalProperties: false,
  required: ["byteLength", "contentHash", "fileSha256", "id", "path"], properties: {
    byteLength: { type: "integer", minimum: 2 }, contentHash: hex, fileSha256: hex, id: text, path: text,
  } };
const evidenceSchema = { type: "object", additionalProperties: false, required: Object.keys(SLICE11_EVIDENCE_BOUNDARY),
  properties: Object.fromEntries(Object.entries(SLICE11_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])) };
const nullableContentRef = { oneOf: [{ type: "null" }, contentRefSchema] };
function schema(name, keys, properties) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-11/schemas/${name}.schema.json`,
    type: "object", additionalProperties: false, required: [...keys], properties };
}

export const SLICE11_OPERATION_SCHEMA_DOCUMENTS = Object.freeze({
  ...SLICE11_DURABLE_SCHEMA_DOCUMENTS,
  "schemas/calibration-operation-claim.slice11.v0.schema.json": schema("calibration-operation-claim.slice11.v0", CLAIM_KEYS, {
    schemaVersion: { const: "calibration-operation-claim.slice11.v0" }, claimId: text, runId: text,
    operation: { enum: ["normalize", "export"] }, caseSetSha256: hex, runtimeBindingRef: recordRefSchema,
    claimedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-durable-event.slice11.v0.schema.json": schema("calibration-durable-event.slice11.v0", EVENT_KEYS, {
    schemaVersion: { const: "calibration-durable-event.slice11.v0" }, eventId: text,
    sequence: { type: "integer", minimum: 1 }, eventType: { enum: ["publication-intent", "publication-complete"] },
    operation: { enum: ["normalize", "export"] },
    requestRef: contentRefSchema, publicationRef: contentRefSchema,
    previousEventHash: { oneOf: [{ type: "null" }, hex] },
    occurredAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-operation-close.slice11.v0.schema.json": schema("calibration-operation-close.slice11.v0", CLOSE_KEYS, {
    schemaVersion: { const: "calibration-operation-close.slice11.v0" }, operation: { enum: ["normalize", "export"] },
    status: { enum: ["calibration-complete-pass", "calibration-complete-non-pass", "protocol-failed", "inconclusive"] },
    reasonCode: { oneOf: [{ type: "null" }, text] }, claimRef: contentRefSchema, runtimeStartRef: contentRefSchema,
    runtimeEndRef: contentRefSchema, summaryRef: nullableContentRef, requestCount: { type: "integer", minimum: 1, maximum: 144 },
    closureCount: { type: "integer", minimum: 1, maximum: 144 }, eventCount: { type: "integer", minimum: 2, maximum: 288 },
    ledgerTailHash: hex, ledgerByteLength: { type: "integer", minimum: 1 }, ledgerFileSha256: hex,
    closedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});
