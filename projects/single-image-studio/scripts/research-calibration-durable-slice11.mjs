import { mkdir, lstat, open, readFile, readdir, realpath, rename, rm, rmdir } from "node:fs/promises";
import path from "node:path";

import {
  sha256Slice11,
  stableStringifySlice11,
  validateExpectedProjectionSlice11,
} from "./research-expected-projection-slice11.mjs";
import {
  SLICE11_EVIDENCE_BOUNDARY,
  validateSlice11WorkerLifecycle,
} from "./research-calibration-lifecycle-slice11.mjs";
import {
  contentHashProtocolSlice11,
  contentRefSlice11,
  validateSlice11CalibrationRequest,
  validateSlice11CalibrationTerminal,
  validateSlice11RecordRef,
} from "./research-calibration-protocol-slice11.mjs";

const SHA_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u;
const CONTENT_REF_KEYS = Object.freeze(["contentHash", "id"]);
const ENTRY_ROLES = Object.freeze(["output-bytes", "expected-projection", "worker-lifecycle", "oracle-facts", "terminal"]);
const TERMINAL_PUBLICATION_KEYS = Object.freeze([
  "closureKind", "contentHash", "entries", "evidenceBoundary", "preparedAt", "publicationId",
  "publicationState", "requestRef", "schemaVersion",
]);

export class Slice11DurableError extends Error {
  constructor(code, message, options = {}) {
    super(`${code}: ${message}`, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "Slice11DurableError";
    this.code = code;
    this.committed = options.committed === true;
  }
}

function fail(code, message, options) { throw new Slice11DurableError(code, message, options); }
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
  if (typeof value !== "string" || !ID_RE.test(value) || value.includes("..")) fail(code, `${label} is invalid`);
}
function utc(value, code, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail(code, `${label} must be exact UTC`);
}
function evidence(value, code) {
  exact(value, Object.keys(SLICE11_EVIDENCE_BOUNDARY), code, "evidenceBoundary");
  if (stableStringifySlice11(value) !== stableStringifySlice11(SLICE11_EVIDENCE_BOUNDARY)) fail(code, "evidence boundary promoted");
}
function contentRef(value, code, label) {
  exact(value, CONTENT_REF_KEYS, code, label);
  id(value.id, code, `${label}.id`);
  sha(value.contentHash, code, `${label}.contentHash`);
}
function selfHash(record, code) {
  sha(record.contentHash, code, "contentHash");
  if (record.contentHash !== contentHashProtocolSlice11(record)) fail(code, "contentHash mismatch");
}
function withHash(record) {
  const value = { ...record, contentHash: "" };
  value.contentHash = contentHashProtocolSlice11(value);
  return value;
}
function canonicalBytes(record) {
  return Buffer.from(`${stableStringifySlice11(record)}\n`, "utf8");
}
function fileIdentity(bytes) {
  return Object.freeze({ byteLength: bytes.length, fileSha256: sha256Slice11(bytes) });
}

const CLAIM_KEYS = Object.freeze([
  "claimId", "claimedAt", "contentHash", "evidenceBoundary", "idempotencyKeyHash", "requestRef", "schemaVersion",
]);

export function createSlice11CalibrationClaim({ request, claimedAt } = {}) {
  validateSlice11CalibrationRequest(request);
  const record = withHash({
    schemaVersion: "calibration-claim.slice11.v0", claimId: `claim.${request.requestId}`,
    requestRef: contentRefSlice11(request, "requestId"),
    idempotencyKeyHash: sha256Slice11(Buffer.from(request.idempotencyKey, "utf8")),
    claimedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11CalibrationClaim(record, { request });
  return Object.freeze(record);
}

export function validateSlice11CalibrationClaim(record, { request } = {}) {
  const code = "S11_CALIBRATION_CLAIM_INVALID";
  exact(record, CLAIM_KEYS, code, "claim");
  if (record.schemaVersion !== "calibration-claim.slice11.v0") fail(code, "claim schema invalid");
  id(record.claimId, code, "claimId");
  contentRef(record.requestRef, code, "requestRef");
  sha(record.idempotencyKeyHash, code, "idempotencyKeyHash");
  utc(record.claimedAt, code, "claimedAt");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  if (request !== undefined) {
    validateSlice11CalibrationRequest(request);
    if (record.claimId !== `claim.${request.requestId}` || record.requestRef.id !== request.requestId
      || record.requestRef.contentHash !== request.contentHash
      || record.idempotencyKeyHash !== sha256Slice11(Buffer.from(request.idempotencyKey, "utf8"))) {
      fail(code, "claim/request binding mismatch");
    }
  }
  return true;
}

const RUNTIME_KEYS = Object.freeze([
  "contentHash", "evidenceBoundary", "frozenPayloadSha256", "matchesFrozen", "observationId", "observedAt",
  "observedPayloadCanonicalJson", "observedPayloadSha256", "phase", "runtimeBindingRef", "schemaVersion",
]);

export function createSlice11RuntimeObservation({ observationId, phase, runtimeBindingRef, frozenPayloadSha256, observedPayload, observedAt } = {}) {
  const canonical = stableStringifySlice11(observedPayload);
  const observedPayloadSha256 = sha256Slice11(Buffer.from(`${canonical}\n`, "utf8"));
  const record = withHash({
    schemaVersion: "runtime-observation.slice11.v0", observationId, phase,
    runtimeBindingRef: structuredClone(runtimeBindingRef), frozenPayloadSha256,
    observedPayloadCanonicalJson: canonical, observedPayloadSha256,
    matchesFrozen: observedPayloadSha256 === frozenPayloadSha256,
    observedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11RuntimeObservation(record);
  return Object.freeze(record);
}

export function validateSlice11RuntimeObservation(record) {
  const code = "S11_RUNTIME_OBSERVATION_INVALID";
  exact(record, RUNTIME_KEYS, code, "runtime observation");
  if (record.schemaVersion !== "runtime-observation.slice11.v0" || !["start", "end"].includes(record.phase)
    || typeof record.matchesFrozen !== "boolean") fail(code, "runtime observation identity/state invalid");
  id(record.observationId, code, "observationId");
  validateSlice11RecordRef(record.runtimeBindingRef, code, "runtimeBindingRef");
  sha(record.frozenPayloadSha256, code, "frozenPayloadSha256");
  sha(record.observedPayloadSha256, code, "observedPayloadSha256");
  utc(record.observedAt, code, "observedAt");
  let parsed;
  try { parsed = JSON.parse(record.observedPayloadCanonicalJson); } catch { fail(code, "runtime payload is not JSON"); }
  const canonical = stableStringifySlice11(parsed);
  const actual = sha256Slice11(Buffer.from(`${canonical}\n`, "utf8"));
  if (canonical !== record.observedPayloadCanonicalJson || actual !== record.observedPayloadSha256
    || record.matchesFrozen !== (actual === record.frozenPayloadSha256)) fail(code, "runtime payload/hash/match derivation invalid");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

const ORACLE_KEYS = Object.freeze([
  "contentHash", "decodedPixelSha256", "evidenceBoundary", "factsCanonicalJson", "factsSha256", "operation",
  "oracleId", "projectionRef", "requestRef", "schemaVersion", "strictDecision",
]);

export function createSlice11OracleFacts({ request, projection, oracleFacts } = {}) {
  validateSlice11CalibrationRequest(request);
  validateExpectedProjectionSlice11(projection);
  if (!plain(oracleFacts) || oracleFacts.strictDecision !== "pass"
    || typeof oracleFacts.decodedPixelSha256 !== "string" || !SHA_RE.test(oracleFacts.decodedPixelSha256)) {
    fail("S11_ORACLE_FACTS_INVALID", "oracle facts must be a strict pass with decoded pixel identity");
  }
  const factsCanonicalJson = stableStringifySlice11(oracleFacts);
  const factsSha256 = sha256Slice11(Buffer.from(`${factsCanonicalJson}\n`, "utf8"));
  const record = withHash({
    schemaVersion: "calibration-oracle-facts.slice11.v0", oracleId: `oracle.${request.requestId}`,
    operation: request.operation, requestRef: contentRefSlice11(request, "requestId"),
    projectionRef: contentRefSlice11(projection, "projectionId"), decodedPixelSha256: oracleFacts.decodedPixelSha256,
    factsCanonicalJson, factsSha256, strictDecision: "pass",
    evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11OracleFacts(record, { request, projection });
  return Object.freeze(record);
}

export function validateSlice11OracleFacts(record, { request, projection } = {}) {
  const code = "S11_ORACLE_FACTS_INVALID";
  exact(record, ORACLE_KEYS, code, "oracle facts");
  if (record.schemaVersion !== "calibration-oracle-facts.slice11.v0" || !["normalize", "export"].includes(record.operation)
    || record.strictDecision !== "pass") fail(code, "oracle identity/state invalid");
  id(record.oracleId, code, "oracleId");
  contentRef(record.requestRef, code, "requestRef");
  contentRef(record.projectionRef, code, "projectionRef");
  sha(record.decodedPixelSha256, code, "decodedPixelSha256");
  sha(record.factsSha256, code, "factsSha256");
  let parsed;
  try { parsed = JSON.parse(record.factsCanonicalJson); } catch { fail(code, "oracle facts are not JSON"); }
  const canonical = stableStringifySlice11(parsed);
  if (canonical !== record.factsCanonicalJson || record.factsSha256 !== sha256Slice11(Buffer.from(`${canonical}\n`, "utf8"))
    || parsed.strictDecision !== "pass" || parsed.decodedPixelSha256 !== record.decodedPixelSha256) fail(code, "oracle facts derivation invalid");
  if (request !== undefined) {
    validateSlice11CalibrationRequest(request);
    if (record.oracleId !== `oracle.${request.requestId}` || record.operation !== request.operation
      || record.requestRef.id !== request.requestId || record.requestRef.contentHash !== request.contentHash) fail(code, "oracle/request binding mismatch");
  }
  if (projection !== undefined) {
    validateExpectedProjectionSlice11(projection);
    if (record.projectionRef.id !== projection.projectionId || record.projectionRef.contentHash !== projection.contentHash
      || projection.adapterExpected.decodedPixelSha256 !== record.decodedPixelSha256) fail(code, "oracle/projection binding mismatch");
  }
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

const ENTRY_KEYS = Object.freeze(["byteLength", "contentRef", "fileSha256", "relativePath", "role"]);
const PUBLICATION_KEYS = Object.freeze([
  "contentHash", "entries", "evidenceBoundary", "preparedAt", "publicationId", "publicationState",
  "requestRef", "schemaVersion",
]);

function validateEntry(entry, code, expectedRole, expectedPath) {
  exact(entry, ENTRY_KEYS, code, "publication entry");
  if (entry.role !== expectedRole || entry.relativePath !== expectedPath || !Number.isSafeInteger(entry.byteLength)
    || entry.byteLength < 1 || entry.byteLength > 1048576) fail(code, "publication entry role/path/length invalid");
  sha(entry.fileSha256, code, "entry.fileSha256");
  contentRef(entry.contentRef, code, "entry.contentRef");
}

export function validateSlice11Publication(record, { request, projection, lifecycle, terminal, oracle } = {}) {
  const code = "S11_CALIBRATION_PUBLICATION_INVALID";
  exact(record, PUBLICATION_KEYS, code, "publication");
  if (record.schemaVersion !== "calibration-publication.slice11.v0" || record.publicationState !== "prepared-not-committed"
    || !Array.isArray(record.entries) || record.entries.length !== ENTRY_ROLES.length) fail(code, "publication identity/state invalid");
  id(record.publicationId, code, "publicationId");
  contentRef(record.requestRef, code, "requestRef");
  utc(record.preparedAt, code, "preparedAt");
  const root = `closures/${record.requestRef.id}`;
  const names = ["output.png", "expected-projection.json", "worker-lifecycle.json", "oracle-facts.json", "terminal.json"];
  record.entries.forEach((entry, index) => validateEntry(entry, code, ENTRY_ROLES[index], `${root}/${names[index]}`));
  if (request !== undefined) {
    validateSlice11CalibrationRequest(request);
    if (record.publicationId !== `publication.${request.requestId}` || record.requestRef.id !== request.requestId
      || record.requestRef.contentHash !== request.contentHash) fail(code, "publication/request binding mismatch");
  }
  const contexts = [
    [projection, "projectionId", 1], [lifecycle, "lifecycleId", 2], [oracle, "oracleId", 3], [terminal, "terminalId", 4],
  ];
  for (const [value, idKey, index] of contexts) {
    if (value !== undefined && (record.entries[index].contentRef.id !== value[idKey]
      || record.entries[index].contentRef.contentHash !== value.contentHash)) fail(code, "publication record cross-binding mismatch");
  }
  if (terminal !== undefined && (record.entries[0].fileSha256 !== terminal.outputFileSha256
    || record.entries[0].byteLength !== terminal.outputByteLength || record.entries[3].contentRef.contentHash !== oracle?.contentHash
    || oracle?.factsSha256 !== terminal.oracleFactsSha256)) fail(code, "publication output/oracle/terminal binding mismatch");
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

function createPublication({ request, projection, lifecycle, terminal, oracle, outputBytes, recordBytes, preparedAt }) {
  const root = `closures/${request.requestId}`;
  const values = [
    { role: "output-bytes", relativePath: `${root}/output.png`, bytes: outputBytes,
      contentRef: { id: `output.${request.requestId}`, contentHash: sha256Slice11(outputBytes) } },
    { role: "expected-projection", relativePath: `${root}/expected-projection.json`, bytes: recordBytes.projection,
      contentRef: contentRefSlice11(projection, "projectionId") },
    { role: "worker-lifecycle", relativePath: `${root}/worker-lifecycle.json`, bytes: recordBytes.lifecycle,
      contentRef: contentRefSlice11(lifecycle, "lifecycleId") },
    { role: "oracle-facts", relativePath: `${root}/oracle-facts.json`, bytes: recordBytes.oracle,
      contentRef: contentRefSlice11(oracle, "oracleId") },
    { role: "terminal", relativePath: `${root}/terminal.json`, bytes: recordBytes.terminal,
      contentRef: contentRefSlice11(terminal, "terminalId") },
  ];
  const record = withHash({
    schemaVersion: "calibration-publication.slice11.v0", publicationId: `publication.${request.requestId}`,
    requestRef: contentRefSlice11(request, "requestId"), publicationState: "prepared-not-committed",
    entries: values.map(({ role, relativePath, bytes, contentRef: ref }) => ({ role, relativePath, ...fileIdentity(bytes), contentRef: ref })),
    preparedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11Publication(record, { request, projection, lifecycle, terminal, oracle });
  return Object.freeze(record);
}

function terminalClosureKind({ request, projection, lifecycle, terminal }) {
  if (request.disposition === "rejection" && terminal.status === "pass") {
    if (projection !== null || lifecycle === null) fail("S11_TERMINAL_PUBLICATION_INVALID", "rejection pass requires lifecycle only");
    return "rejection-pass";
  }
  if (!["non-pass", "protocol-failed", "inconclusive"].includes(terminal.status)) {
    fail("S11_TERMINAL_PUBLICATION_INVALID", "terminal-only publication cannot contain an applicable pass");
  }
  if (projection !== null && lifecycle !== null) return "failure-with-projection-lifecycle";
  if (projection === null && lifecycle !== null) return "failure-with-lifecycle";
  if (projection === null && lifecycle === null) return "failure-terminal-only";
  fail("S11_TERMINAL_PUBLICATION_INVALID", "projection cannot exist without lifecycle");
}

function terminalPublicationValues({ request, projection, lifecycle, terminal }) {
  const root = `closures/${request.requestId}`;
  const values = [];
  if (projection !== null) values.push({ role: "expected-projection", name: "expected-projection.json",
    bytes: canonicalBytes(projection), contentRef: contentRefSlice11(projection, "projectionId") });
  if (lifecycle !== null) values.push({ role: "worker-lifecycle", name: "worker-lifecycle.json",
    bytes: canonicalBytes(lifecycle), contentRef: contentRefSlice11(lifecycle, "lifecycleId") });
  values.push({ role: "terminal", name: "terminal.json", bytes: canonicalBytes(terminal),
    contentRef: contentRefSlice11(terminal, "terminalId") });
  return values.map((value) => ({ ...value, relativePath: `${root}/${value.name}` }));
}

export function validateSlice11TerminalPublication(record, { request, projection = null, lifecycle = null, terminal } = {}) {
  const code = "S11_TERMINAL_PUBLICATION_INVALID";
  exact(record, TERMINAL_PUBLICATION_KEYS, code, "terminal publication");
  if (record.schemaVersion !== "calibration-terminal-publication.slice11.v0"
    || record.publicationState !== "prepared-not-committed" || !Array.isArray(record.entries)) {
    fail(code, "terminal publication identity/state invalid");
  }
  id(record.publicationId, code, "publicationId");
  contentRef(record.requestRef, code, "requestRef");
  utc(record.preparedAt, code, "preparedAt");
  validateSlice11CalibrationRequest(request);
  if (projection !== null) validateExpectedProjectionSlice11(projection);
  if (lifecycle !== null) validateSlice11WorkerLifecycle(lifecycle);
  validateSlice11CalibrationTerminal(terminal, { request, projection, lifecycle });
  const expectedKind = terminalClosureKind({ request, projection, lifecycle, terminal });
  const expected = terminalPublicationValues({ request, projection, lifecycle, terminal });
  if (record.closureKind !== expectedKind || record.entries.length !== expected.length
    || record.publicationId !== `terminal-publication.${request.requestId}`
    || record.requestRef.id !== request.requestId || record.requestRef.contentHash !== request.contentHash) {
    fail(code, "terminal publication/request/kind binding invalid");
  }
  record.entries.forEach((entry, index) => {
    const item = expected[index];
    validateEntry(entry, code, item.role, item.relativePath);
    if (entry.contentRef.id !== item.contentRef.id || entry.contentRef.contentHash !== item.contentRef.contentHash
      || entry.byteLength !== item.bytes.length || entry.fileSha256 !== sha256Slice11(item.bytes)) {
      fail(code, "terminal publication record/file binding mismatch");
    }
  });
  evidence(record.evidenceBoundary, code);
  selfHash(record, code);
  return true;
}

function createTerminalPublication({ request, projection, lifecycle, terminal, preparedAt }) {
  const closureKind = terminalClosureKind({ request, projection, lifecycle, terminal });
  const values = terminalPublicationValues({ request, projection, lifecycle, terminal });
  const record = withHash({
    schemaVersion: "calibration-terminal-publication.slice11.v0",
    publicationId: `terminal-publication.${request.requestId}`, closureKind,
    requestRef: contentRefSlice11(request, "requestId"), publicationState: "prepared-not-committed",
    entries: values.map(({ role, relativePath, bytes, contentRef: ref }) => ({
      role, relativePath, ...fileIdentity(bytes), contentRef: ref,
    })), preparedAt, evidenceBoundary: structuredClone(SLICE11_EVIDENCE_BOUNDARY),
  });
  validateSlice11TerminalPublication(record, { request, projection, lifecycle, terminal });
  return Object.freeze(record);
}

async function durableBytes(filePath, bytes) {
  const handle = await open(filePath, "wx");
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
async function syncDirectory(directory) {
  let handle;
  try { handle = await open(directory, "r"); await handle.sync(); }
  catch (error) { if (!["EINVAL", "EPERM", "EISDIR"].includes(error?.code)) throw error; }
  finally { await handle?.close(); }
}
async function ensureSafeRoot(operationRoot) {
  if (!path.isAbsolute(operationRoot ?? "")) fail("S11_RESULTS_ROOT_INVALID", "absolute operation root required");
  await mkdir(operationRoot, { recursive: true });
  const info = await lstat(operationRoot);
  const actual = await realpath(operationRoot);
  if (!info.isDirectory() || info.isSymbolicLink() || path.resolve(actual) !== path.resolve(operationRoot)) {
    fail("S11_RESULTS_ROOT_INVALID", "operation root cannot be a link or redirected path");
  }
  return path.resolve(operationRoot);
}
function childPath(root, ...parts) {
  const value = path.resolve(root, ...parts);
  if (!value.startsWith(`${root}${path.sep}`)) fail("S11_RESULTS_PATH_INVALID", "result path escapes operation root");
  return value;
}

export async function claimSlice11CalibrationRequest({ operationRoot, request, claimedAt } = {}) {
  const root = await ensureSafeRoot(operationRoot);
  const claim = createSlice11CalibrationClaim({ request, claimedAt });
  const claimsRoot = childPath(root, "claims");
  await mkdir(claimsRoot, { recursive: true });
  const claimPath = childPath(claimsRoot, `${request.requestId}.json`);
  try {
    await durableBytes(claimPath, canonicalBytes(claim));
    await syncDirectory(claimsRoot);
    return Object.freeze({ status: "claimed", claim, claimPath });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let existing;
    try { existing = JSON.parse(await readFile(claimPath, "utf8")); validateSlice11CalibrationClaim(existing, { request }); }
    catch (cause) { fail("S11_CLAIM_RECONCILIATION_UNKNOWN", "existing claim is unreadable or conflicts", { cause }); }
    return Object.freeze({ status: "existing-claim-no-execution-authority", claim: Object.freeze(existing), claimPath });
  }
}

export async function persistSlice11CalibrationRequest({ operationRoot, request } = {}) {
  validateSlice11CalibrationRequest(request);
  const root = await ensureSafeRoot(operationRoot);
  const requestsRoot = childPath(root, "requests");
  await mkdir(requestsRoot, { recursive: true });
  const requestPath = childPath(requestsRoot, `${request.requestId}.json`);
  const bytes = canonicalBytes(request);
  try {
    await durableBytes(requestPath, bytes);
    await syncDirectory(requestsRoot);
    return Object.freeze({ status: "persisted", request, requestPath });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let existing;
    try {
      existing = JSON.parse(await readFile(requestPath, "utf8"));
      validateSlice11CalibrationRequest(existing);
      if (stableStringifySlice11(existing) !== stableStringifySlice11(request)) throw new Error("request bytes conflict");
    } catch (cause) {
      fail("S11_REQUEST_RECONCILIATION_UNKNOWN", "existing request is unreadable or conflicts", { cause });
    }
    return Object.freeze({ status: "existing-request-no-execution-authority", request: Object.freeze(existing), requestPath });
  }
}

export function createSlice11DurableAttemptHooks({
  operationRoot, now = () => new Date().toISOString(), appendPublicationIntent, appendPublicationComplete,
  publicationHooksForRequest = () => ({}),
} = {}) {
  if (!path.isAbsolute(operationRoot ?? "") || typeof now !== "function"
    || typeof appendPublicationIntent !== "function" || typeof appendPublicationComplete !== "function"
    || typeof publicationHooksForRequest !== "function") {
    fail("S11_DURABLE_HOOKS_INVALID", "durable attempt hook inputs invalid");
  }
  return Object.freeze({
    beforeAttempt: async ({ request }) => {
      const persisted = await persistSlice11CalibrationRequest({ operationRoot, request });
      if (persisted.status !== "persisted") {
        fail("S11_REQUEST_ALREADY_PERSISTED", "existing request never grants execution authority");
      }
      const claimed = await claimSlice11CalibrationRequest({ operationRoot, request, claimedAt: now() });
      if (claimed.status !== "claimed") fail("S11_REQUEST_ALREADY_CLAIMED", "existing claim never grants execution authority");
    },
    afterAttempt: async ({ request, terminal, lifecycle, projection, execution }) => {
      const common = {
        operationRoot, request, terminal, lifecycle, projection, preparedAt: now(),
        appendPublicationIntent, appendPublicationComplete,
        hooks: publicationHooksForRequest(request),
      };
      if (request.disposition === "applicable" && terminal.status === "pass") {
        if (!plain(execution) || !(execution.outputBytes instanceof Uint8Array) || !plain(execution.oracleFacts)) {
          fail("S11_DURABLE_EXECUTION_CLOSURE_INVALID", "applicable pass lost output/oracle material before publication");
        }
        return publishSlice11ApplicableClosure({ ...common, outputBytes: execution.outputBytes, oracleFacts: execution.oracleFacts });
      }
      return publishSlice11TerminalClosure(common);
    },
  });
}

export async function publishSlice11ApplicableClosure({
  operationRoot, request, projection, lifecycle, terminal, oracleFacts, outputBytes, preparedAt,
  appendPublicationIntent, appendPublicationComplete, hooks = {},
} = {}) {
  const code = "S11_CALIBRATION_PUBLICATION_INVALID";
  validateSlice11CalibrationRequest(request);
  validateExpectedProjectionSlice11(projection);
  validateSlice11WorkerLifecycle(lifecycle);
  validateSlice11CalibrationTerminal(terminal, { request, projection, lifecycle });
  if (request.disposition !== "applicable" || terminal.status !== "pass" || !(outputBytes instanceof Uint8Array)
    || outputBytes.length < 1 || outputBytes.length > 1048576 || typeof appendPublicationIntent !== "function"
    || typeof appendPublicationComplete !== "function" || !plain(hooks)) fail(code, "applicable closure inputs invalid");
  const output = Buffer.from(outputBytes);
  if (sha256Slice11(output) !== terminal.outputFileSha256 || output.length !== terminal.outputByteLength) fail(code, "output bytes differ from terminal identity");
  const oracle = createSlice11OracleFacts({ request, projection, oracleFacts });
  if (oracle.factsSha256 !== terminal.oracleFactsSha256) fail(code, "oracle facts differ from terminal identity");
  const root = await ensureSafeRoot(operationRoot);
  const closuresRoot = childPath(root, "closures");
  const stagingRoot = childPath(root, ".staging");
  await mkdir(closuresRoot, { recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  const stage = childPath(stagingRoot, request.requestId);
  const destination = childPath(closuresRoot, request.requestId);
  for (const target of [stage, destination]) {
    try { await lstat(target); fail("S11_PUBLICATION_ALREADY_EXISTS", "attempt closure path already exists"); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  await mkdir(stage);
  let renameCommitted = false;
  try {
    const recordBytes = {
      projection: canonicalBytes(projection), lifecycle: canonicalBytes(lifecycle),
      oracle: canonicalBytes(oracle), terminal: canonicalBytes(terminal),
    };
    const files = [
      ["output.png", output], ["expected-projection.json", recordBytes.projection],
      ["worker-lifecycle.json", recordBytes.lifecycle], ["oracle-facts.json", recordBytes.oracle],
      ["terminal.json", recordBytes.terminal],
    ];
    for (const [name, bytes] of files) await durableBytes(childPath(stage, name), bytes);
    const publication = createPublication({ request, projection, lifecycle, terminal, oracle, outputBytes: output, recordBytes, preparedAt });
    await durableBytes(childPath(stage, "publication.json"), canonicalBytes(publication));
    await syncDirectory(stage);
    await hooks.afterPrepared?.({ stage, publication });
    await appendPublicationIntent(publication);
    await hooks.beforeRename?.({ stage, destination, publication });
    await rename(stage, destination);
    renameCommitted = true;
    await hooks.afterRename?.({ destination, publication });
    await syncDirectory(closuresRoot);
    await appendPublicationComplete(publication);
    try { if ((await readdir(stagingRoot)).length === 0) await rmdir(stagingRoot); } catch { /* validated on close */ }
    return Object.freeze({ publication, oracle, destination });
  } catch (cause) {
    if (renameCommitted) fail("S11_PUBLICATION_RECONCILIATION_UNKNOWN", "closure rename committed before publication completion", { cause, committed: true });
    try { await rm(stage, { recursive: true, force: true }); } catch { /* original error remains authoritative */ }
    try { if ((await readdir(stagingRoot)).length === 0) await rmdir(stagingRoot); } catch { /* original error remains authoritative */ }
    fail(cause?.code?.startsWith?.("S11_") ? cause.code : "S11_PUBLICATION_COMMIT_FAILED", "closure was not committed", { cause });
  }
}

export async function validateSlice11ApplicableClosure({ operationRoot, request, projection, lifecycle, terminal } = {}) {
  const root = await ensureSafeRoot(operationRoot);
  const destination = childPath(root, "closures", request.requestId);
  const expected = ["expected-projection.json", "oracle-facts.json", "output.png", "publication.json", "terminal.json", "worker-lifecycle.json"];
  const entries = await readdir(destination, { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile()) || entries.map(({ name }) => name).sort().join("\0") !== expected.join("\0")) {
    fail("S11_PUBLICATION_CLOSURE_INVALID", "closure file set is not exact");
  }
  const readJson = async (name) => JSON.parse(await readFile(childPath(destination, name), "utf8"));
  const storedProjection = await readJson("expected-projection.json");
  const storedLifecycle = await readJson("worker-lifecycle.json");
  const storedOracle = await readJson("oracle-facts.json");
  const storedTerminal = await readJson("terminal.json");
  const publication = await readJson("publication.json");
  const output = await readFile(childPath(destination, "output.png"));
  if (stableStringifySlice11(storedProjection) !== stableStringifySlice11(projection)
    || stableStringifySlice11(storedLifecycle) !== stableStringifySlice11(lifecycle)
    || stableStringifySlice11(storedTerminal) !== stableStringifySlice11(terminal)) fail("S11_PUBLICATION_CLOSURE_INVALID", "stored record differs from supplied identity");
  validateSlice11OracleFacts(storedOracle, { request, projection });
  validateSlice11CalibrationTerminal(storedTerminal, { request, projection, lifecycle });
  validateSlice11Publication(publication, { request, projection, lifecycle, terminal, oracle: storedOracle });
  for (const entry of publication.entries) {
    const name = entry.relativePath.split("/").at(-1);
    const bytes = name === "output.png" ? output : await readFile(childPath(destination, name));
    if (bytes.length !== entry.byteLength || sha256Slice11(bytes) !== entry.fileSha256) fail("S11_PUBLICATION_CLOSURE_INVALID", "closure file identity mismatch");
  }
  return Object.freeze({ publication, oracle: Object.freeze(storedOracle), outputBytes: output });
}

export async function publishSlice11TerminalClosure({
  operationRoot, request, projection = null, lifecycle = null, terminal, preparedAt,
  appendPublicationIntent, appendPublicationComplete, hooks = {},
} = {}) {
  const code = "S11_TERMINAL_PUBLICATION_INVALID";
  validateSlice11CalibrationRequest(request);
  if (projection !== null) validateExpectedProjectionSlice11(projection);
  if (lifecycle !== null) validateSlice11WorkerLifecycle(lifecycle);
  validateSlice11CalibrationTerminal(terminal, { request, projection, lifecycle });
  if (typeof appendPublicationIntent !== "function" || typeof appendPublicationComplete !== "function" || !plain(hooks)) {
    fail(code, "terminal publication callbacks/hooks invalid");
  }
  const publication = createTerminalPublication({ request, projection, lifecycle, terminal, preparedAt });
  const values = terminalPublicationValues({ request, projection, lifecycle, terminal });
  const root = await ensureSafeRoot(operationRoot);
  const closuresRoot = childPath(root, "closures");
  const stagingRoot = childPath(root, ".staging");
  await mkdir(closuresRoot, { recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  const stage = childPath(stagingRoot, request.requestId);
  const destination = childPath(closuresRoot, request.requestId);
  for (const target of [stage, destination]) {
    try { await lstat(target); fail("S11_PUBLICATION_ALREADY_EXISTS", "attempt closure path already exists"); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  await mkdir(stage);
  let renameCommitted = false;
  try {
    for (const { name, bytes } of values) await durableBytes(childPath(stage, name), bytes);
    await durableBytes(childPath(stage, "publication.json"), canonicalBytes(publication));
    await syncDirectory(stage);
    await hooks.afterPrepared?.({ stage, publication });
    await appendPublicationIntent(publication);
    await hooks.beforeRename?.({ stage, destination, publication });
    await rename(stage, destination);
    renameCommitted = true;
    await hooks.afterRename?.({ destination, publication });
    await syncDirectory(closuresRoot);
    await appendPublicationComplete(publication);
    try { if ((await readdir(stagingRoot)).length === 0) await rmdir(stagingRoot); } catch { /* validated on close */ }
    return Object.freeze({ publication, destination });
  } catch (cause) {
    if (renameCommitted) fail("S11_PUBLICATION_RECONCILIATION_UNKNOWN", "terminal closure committed before publication completion",
      { cause, committed: true });
    try { await rm(stage, { recursive: true, force: true }); } catch { /* original error remains authoritative */ }
    try { if ((await readdir(stagingRoot)).length === 0) await rmdir(stagingRoot); } catch { /* original error remains authoritative */ }
    fail(cause?.code?.startsWith?.("S11_") ? cause.code : "S11_PUBLICATION_COMMIT_FAILED", "terminal closure was not committed", { cause });
  }
}

export async function validateSlice11TerminalClosure({
  operationRoot, request, projection = null, lifecycle = null, terminal,
} = {}) {
  const root = await ensureSafeRoot(operationRoot);
  const destination = childPath(root, "closures", request.requestId);
  const values = terminalPublicationValues({ request, projection, lifecycle, terminal });
  const expected = [...values.map(({ name }) => name), "publication.json"].sort();
  const entries = await readdir(destination, { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile()) || entries.map(({ name }) => name).sort().join("\0") !== expected.join("\0")) {
    fail("S11_TERMINAL_CLOSURE_INVALID", "terminal closure file set is not exact");
  }
  const stored = new Map();
  for (const { name } of values) stored.set(name, JSON.parse(await readFile(childPath(destination, name), "utf8")));
  const publication = JSON.parse(await readFile(childPath(destination, "publication.json"), "utf8"));
  if (projection !== null && stableStringifySlice11(stored.get("expected-projection.json")) !== stableStringifySlice11(projection)) {
    fail("S11_TERMINAL_CLOSURE_INVALID", "stored projection differs from supplied identity");
  }
  if (lifecycle !== null && stableStringifySlice11(stored.get("worker-lifecycle.json")) !== stableStringifySlice11(lifecycle)) {
    fail("S11_TERMINAL_CLOSURE_INVALID", "stored lifecycle differs from supplied identity");
  }
  const storedTerminal = stored.get("terminal.json");
  if (stableStringifySlice11(storedTerminal) !== stableStringifySlice11(terminal)) {
    fail("S11_TERMINAL_CLOSURE_INVALID", "stored terminal differs from supplied identity");
  }
  validateSlice11TerminalPublication(publication, { request, projection, lifecycle, terminal: storedTerminal });
  for (const entry of publication.entries) {
    const name = entry.relativePath.split("/").at(-1);
    const bytes = await readFile(childPath(destination, name));
    if (bytes.length !== entry.byteLength || sha256Slice11(bytes) !== entry.fileSha256) {
      fail("S11_TERMINAL_CLOSURE_INVALID", "terminal closure file identity mismatch");
    }
  }
  return Object.freeze({ publication });
}

const text = { type: "string", minLength: 1, maxLength: 200000 };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const contentRefSchema = { type: "object", additionalProperties: false, required: [...CONTENT_REF_KEYS], properties: { contentHash: hex, id: text } };
const recordRefSchema = { type: "object", additionalProperties: false,
  required: ["byteLength", "contentHash", "fileSha256", "id", "path"], properties: {
    byteLength: { type: "integer", minimum: 2 }, contentHash: hex, fileSha256: hex, id: text, path: text,
  } };
const evidenceSchema = { type: "object", additionalProperties: false, required: Object.keys(SLICE11_EVIDENCE_BOUNDARY),
  properties: Object.fromEntries(Object.entries(SLICE11_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])) };
function schema(name, keys, properties) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://single-image-studio.invalid/research/slice-11/schemas/${name}.schema.json`,
    type: "object", additionalProperties: false, required: [...keys], properties };
}

export const SLICE11_DURABLE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/calibration-claim.slice11.v0.schema.json": schema("calibration-claim.slice11.v0", CLAIM_KEYS, {
    schemaVersion: { const: "calibration-claim.slice11.v0" }, claimId: text, requestRef: contentRefSchema,
    idempotencyKeyHash: hex, claimedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/runtime-observation.slice11.v0.schema.json": schema("runtime-observation.slice11.v0", RUNTIME_KEYS, {
    schemaVersion: { const: "runtime-observation.slice11.v0" }, observationId: text, phase: { enum: ["start", "end"] },
    runtimeBindingRef: recordRefSchema, frozenPayloadSha256: hex, observedPayloadCanonicalJson: text,
    observedPayloadSha256: hex, matchesFrozen: { type: "boolean" }, observedAt: { type: "string", format: "date-time" },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-oracle-facts.slice11.v0.schema.json": schema("calibration-oracle-facts.slice11.v0", ORACLE_KEYS, {
    schemaVersion: { const: "calibration-oracle-facts.slice11.v0" }, oracleId: text, operation: { enum: ["normalize", "export"] },
    requestRef: contentRefSchema, projectionRef: contentRefSchema, decodedPixelSha256: hex,
    factsCanonicalJson: text, factsSha256: hex, strictDecision: { const: "pass" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-publication.slice11.v0.schema.json": schema("calibration-publication.slice11.v0", PUBLICATION_KEYS, {
    schemaVersion: { const: "calibration-publication.slice11.v0" }, publicationId: text, requestRef: contentRefSchema,
    publicationState: { const: "prepared-not-committed" }, entries: { type: "array", minItems: 5, maxItems: 5, items: {
      type: "object", additionalProperties: false, required: [...ENTRY_KEYS], properties: {
        role: { enum: [...ENTRY_ROLES] }, relativePath: text, byteLength: { type: "integer", minimum: 1, maximum: 1048576 },
        fileSha256: hex, contentRef: contentRefSchema,
    } } }, preparedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/calibration-terminal-publication.slice11.v0.schema.json": schema("calibration-terminal-publication.slice11.v0", TERMINAL_PUBLICATION_KEYS, {
    schemaVersion: { const: "calibration-terminal-publication.slice11.v0" }, publicationId: text,
    closureKind: { enum: ["rejection-pass", "failure-with-projection-lifecycle", "failure-with-lifecycle", "failure-terminal-only"] },
    requestRef: contentRefSchema, publicationState: { const: "prepared-not-committed" },
    entries: { type: "array", minItems: 1, maxItems: 3, items: {
      type: "object", additionalProperties: false, required: [...ENTRY_KEYS], properties: {
        role: { enum: ["expected-projection", "worker-lifecycle", "terminal"] }, relativePath: text,
        byteLength: { type: "integer", minimum: 1, maximum: 1048576 }, fileSha256: hex, contentRef: contentRefSchema,
      } } }, preparedAt: { type: "string", format: "date-time" }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});
