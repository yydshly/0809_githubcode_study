import {
  contentHashProjectionSlice11,
  sha256Slice11,
  stableStringifySlice11,
} from "./research-expected-projection-slice11.mjs";

export const SLICE11_EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0, e1: 0, formalEvidence: false, g1: 0, o1: 0, productSupport: false,
  r1Pipeline: 0, r1ProductRelease: 0, r1ProductValidation: 0,
  releaseAllowlist: "none", releaseApproved: 0, releaseRegistered: 0, u1: 0, v1: 0,
});

const RECORD_KEYS = Object.freeze([
  "attemptId", "cancelled", "contentHash", "evidenceBoundary", "exitCode", "ipcMessageReceived",
  "lifecycleId", "observationSha256", "operation", "projectionRef", "recordedAt", "schemaVersion",
  "signal", "stage", "timedOut", "workerExitConfirmed", "workerInvoked",
]);
const STAGES = new Set(["preflight-not-started", "spawn-attempted", "ipc-message-received", "exit-confirmed"]);

export class Slice11LifecycleError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "Slice11LifecycleError";
    this.code = code;
  }
}

function fail(message) { throw new Slice11LifecycleError("S11_WORKER_LIFECYCLE_INVALID", message); }
function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exact(value, keys, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(`${label} shape is not closed`);
  }
}
function safeId(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u.test(value) || value.includes("..")) fail(`${label} invalid`);
}
function sha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) fail(`${label} invalid`);
}
function utc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail("recordedAt must be exact UTC");
}

export function contentHashLifecycleSlice11(record) {
  if (!plain(record)) fail("lifecycle record must be an object");
  const payload = { ...record };
  delete payload.contentHash;
  return sha256Slice11(Buffer.from(`${stableStringifySlice11(payload)}\n`, "utf8"));
}

function validateProjectionRef(value, stage) {
  if (value === null) {
    if (stage !== "preflight-not-started") fail("only preflight failure may omit projectionRef");
    return;
  }
  exact(value, ["contentHash", "id"], "projectionRef");
  safeId(value.id, "projectionRef.id");
  sha(value.contentHash, "projectionRef.contentHash");
}

export function validateSlice11WorkerLifecycle(record) {
  exact(record, RECORD_KEYS, "worker lifecycle");
  if (record.schemaVersion !== "worker-lifecycle.slice11.v0" || !STAGES.has(record.stage)
    || !["normalize", "export"].includes(record.operation)) fail("identity, operation or stage invalid");
  safeId(record.lifecycleId, "lifecycleId");
  safeId(record.attemptId, "attemptId");
  utc(record.recordedAt);
  validateProjectionRef(record.projectionRef, record.stage);
  if (stableStringifySlice11(record.evidenceBoundary) !== stableStringifySlice11(SLICE11_EVIDENCE_BOUNDARY)) fail("evidence boundary promoted");
  if (record.observationSha256 !== null) sha(record.observationSha256, "observationSha256");
  if (typeof record.workerInvoked !== "boolean" || ![true, false, null].includes(record.workerExitConfirmed)
    || typeof record.ipcMessageReceived !== "boolean" || typeof record.timedOut !== "boolean" || typeof record.cancelled !== "boolean") {
    fail("lifecycle scalar types invalid");
  }
  const preflight = record.stage === "preflight-not-started";
  if (preflight && (record.workerInvoked !== false || record.workerExitConfirmed !== null
    || record.ipcMessageReceived || record.exitCode !== null || record.signal !== null
    || record.timedOut || record.cancelled || record.observationSha256 !== null)) fail("preflight lifecycle is contradictory");
  if (!preflight && (record.workerInvoked !== true || typeof record.workerExitConfirmed !== "boolean")) fail("spawned lifecycle must be explicit");
  if (record.stage === "spawn-attempted" && (record.ipcMessageReceived || record.workerExitConfirmed)) fail("spawn stage cannot claim message or exit");
  if (record.stage === "ipc-message-received" && (!record.ipcMessageReceived || record.workerExitConfirmed)) fail("IPC stage is contradictory");
  if (record.stage === "exit-confirmed" && (!record.workerExitConfirmed
    || (!Number.isInteger(record.exitCode) && record.exitCode !== null)
    || (typeof record.signal !== "string" && record.signal !== null))) fail("exit stage is contradictory");
  if (!preflight && record.observationSha256 === null) fail("spawned lifecycle requires the underlying observation hash");
  if (record.contentHash !== contentHashLifecycleSlice11(record)) fail("lifecycle self hash invalid");
  return true;
}

export function createSlice11WorkerLifecycle({ lifecycleId, attemptId, operation, projection = null, lifecycle, recordedAt } = {}) {
  if (!plain(lifecycle)) fail("adapter lifecycle is required");
  const projectionRef = projection === null ? null : {
    id: projection.projectionId,
    contentHash: projection.contentHash ?? contentHashProjectionSlice11(projection),
  };
  const record = {
    schemaVersion: "worker-lifecycle.slice11.v0",
    lifecycleId,
    attemptId,
    operation,
    projectionRef,
    stage: lifecycle.stage,
    workerInvoked: lifecycle.workerInvoked,
    workerExitConfirmed: lifecycle.workerExitConfirmed,
    ipcMessageReceived: lifecycle.ipcMessageReceived,
    exitCode: lifecycle.exitCode,
    signal: lifecycle.signal,
    timedOut: lifecycle.timedOut,
    cancelled: lifecycle.cancelled,
    observationSha256: lifecycle.observationSha256,
    recordedAt,
    evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
    contentHash: "",
  };
  record.contentHash = contentHashLifecycleSlice11(record);
  validateSlice11WorkerLifecycle(record);
  return Object.freeze({ ...record, projectionRef: projectionRef && Object.freeze(projectionRef), evidenceBoundary: Object.freeze(record.evidenceBoundary) });
}

const nullable = (schema) => ({ oneOf: [{ type: "null" }, schema] });
const shaSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const evidenceSchema = {
  type: "object", additionalProperties: false, required: Object.keys(SLICE11_EVIDENCE_BOUNDARY),
  properties: Object.fromEntries(Object.entries(SLICE11_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])),
};
export const SLICE11_WORKER_LIFECYCLE_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://single-image-studio.invalid/research/slice-11/schemas/worker-lifecycle.slice11.v0.schema.json",
  type: "object", additionalProperties: false, required: [...RECORD_KEYS],
  properties: {
    schemaVersion: { const: "worker-lifecycle.slice11.v0" }, lifecycleId: { type: "string", minLength: 1, maxLength: 200 },
    attemptId: { type: "string", minLength: 1, maxLength: 200 }, operation: { enum: ["normalize", "export"] },
    projectionRef: nullable({ type: "object", additionalProperties: false, required: ["contentHash", "id"], properties: { contentHash: shaSchema, id: { type: "string" } } }),
    stage: { enum: [...STAGES] }, workerInvoked: { type: "boolean" }, workerExitConfirmed: nullable({ type: "boolean" }),
    ipcMessageReceived: { type: "boolean" }, exitCode: nullable({ type: "integer" }), signal: nullable({ type: "string" }),
    timedOut: { type: "boolean" }, cancelled: { type: "boolean" }, observationSha256: nullable(shaSchema),
    recordedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: shaSchema,
  },
});
