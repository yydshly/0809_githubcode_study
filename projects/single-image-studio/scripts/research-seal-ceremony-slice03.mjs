import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const DEFAULT_PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
export const DEFAULT_SEAL_SCHEMA_ROOT = path.resolve(DEFAULT_PROJECT_ROOT, "research/slice-03/schemas");

const SCHEMA_FILES = new Map([
  ["plan", "seal-ceremony-plan.v0.schema.json"],
  ["bundleManifest", "seal-ceremony-bundle-manifest.v0.schema.json"],
  ["runRequest", "seal-ceremony-run-request.v0.schema.json"],
  ["custodyEvent", "seal-ceremony-custody-event.v0.schema.json"],
  ["runReceipt", "seal-ceremony-run-receipt.v0.schema.json"],
  ["resultSummary", "seal-ceremony-result-summary.v0.schema.json"],
]);

const INVALID_RUN_REASONS = new Set([
  "runner-crash-before-result",
  "custody-interruption",
  "integrity-check-failure",
]);

export class Slice03SealValidationError extends Error {
  constructor(issues) {
    super(`Slice 03 seal ceremony validation failed with ${issues.length} issue(s)`);
    this.name = "Slice03SealValidationError";
    this.issues = issues;
  }
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashRecordWithout(record, field) {
  const clone = { ...record };
  delete clone[field];
  return sha256(stableStringify(clone));
}

export function sealRecord(record, field) {
  return { ...record, [field]: hashRecordWithout(record, field) };
}

function add(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function isUtcDateTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const normalized = new Date(parsed).toISOString();
  return value === normalized || value === normalized.replace(".000Z", "Z");
}

function typeMatches(value, type) {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return false;
}

export function validateSchemaInstance(instance, schema, location = "$") {
  const errors = [];
  const visit = (value, node, where, root) => {
    if (!isRecord(node)) return;
    if (typeof node.$ref === "string") {
      if (!node.$ref.startsWith("#/$defs/")) {
        errors.push({ location: where, message: `external reference is forbidden: ${node.$ref}` });
        return;
      }
      const target = root.$defs?.[node.$ref.slice("#/$defs/".length)];
      if (!target) errors.push({ location: where, message: `unresolved reference: ${node.$ref}` });
      else visit(value, target, where, root);
      return;
    }
    if (Object.hasOwn(node, "const") && !deepEqual(value, node.const)) errors.push({ location: where, message: `must equal ${JSON.stringify(node.const)}` });
    if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(value, candidate))) errors.push({ location: where, message: "must match one enum value" });
    const types = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
    if (types.length && !types.some((type) => typeMatches(value, type))) {
      errors.push({ location: where, message: `must have type ${types.join("|")}` });
      return;
    }
    if (typeof value === "string") {
      if (Number.isInteger(node.minLength) && value.length < node.minLength) errors.push({ location: where, message: `must have length >= ${node.minLength}` });
      if (typeof node.pattern === "string" && !new RegExp(node.pattern, "u").test(value)) errors.push({ location: where, message: `must match ${node.pattern}` });
      if (node.format === "date-time" && !isUtcDateTime(value)) errors.push({ location: where, message: "must be a valid UTC date-time" });
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      if (typeof node.minimum === "number" && value < node.minimum) errors.push({ location: where, message: `must be >= ${node.minimum}` });
      if (typeof node.maximum === "number" && value > node.maximum) errors.push({ location: where, message: `must be <= ${node.maximum}` });
    }
    if (Array.isArray(value)) {
      if (Number.isInteger(node.minItems) && value.length < node.minItems) errors.push({ location: where, message: `must contain >= ${node.minItems} item(s)` });
      if (Number.isInteger(node.maxItems) && value.length > node.maxItems) errors.push({ location: where, message: `must contain <= ${node.maxItems} item(s)` });
      if (node.uniqueItems === true && new Set(value.map(stableStringify)).size !== value.length) errors.push({ location: where, message: "must contain unique items" });
      if (node.items) value.forEach((entry, index) => visit(entry, node.items, `${where}[${index}]`, root));
    }
    if (isRecord(value)) {
      const properties = isRecord(node.properties) ? node.properties : {};
      for (const required of node.required ?? []) if (!Object.hasOwn(value, required)) errors.push({ location: `${where}.${required}`, message: "is required" });
      if (node.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) errors.push({ location: `${where}.${key}`, message: "is not allowed" });
      }
      for (const [key, child] of Object.entries(properties)) if (Object.hasOwn(value, key)) visit(value[key], child, `${where}.${key}`, root);
    }
  };
  visit(instance, schema, location, schema);
  return errors;
}

function inspectClosedSchema(node, root, issues, location) {
  if (!isRecord(node)) return;
  if (node.type === "object") {
    if (node.additionalProperties !== false) add(issues, "SCHEMA_OBJECT_OPEN", location, "object schemas must set additionalProperties=false");
    if (!isRecord(node.properties) || !Array.isArray(node.required)) add(issues, "SCHEMA_OBJECT_UNDECLARED", location, "object schemas must declare properties and required");
    else {
      const properties = Object.keys(node.properties).sort();
      const required = [...new Set(node.required)].sort();
      if (!deepEqual(properties, required)) add(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "every property must be required exactly once");
    }
  }
  if (node.type === "array" && !node.items) add(issues, "SCHEMA_ARRAY_OPEN", location, "arrays must declare items");
  if (typeof node.$ref === "string") {
    if (!node.$ref.startsWith("#/$defs/") || !Object.hasOwn(root.$defs ?? {}, node.$ref.slice("#/$defs/".length))) {
      add(issues, "SCHEMA_REF_INVALID", location, node.$ref);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) inspectClosedSchema(value, root, issues, `${location}.${key}`);
    else if (Array.isArray(value)) value.forEach((entry, index) => {
      if (isRecord(entry)) inspectClosedSchema(entry, root, issues, `${location}.${key}[${index}]`);
    });
  }
}

export async function loadSealCeremonySchemas(schemaRoot = DEFAULT_SEAL_SCHEMA_ROOT) {
  const schemas = {};
  for (const [key, filename] of SCHEMA_FILES) schemas[key] = JSON.parse(await readFile(path.join(schemaRoot, filename), "utf8"));
  return schemas;
}

export async function validateSealCeremonySchemas(schemaRoot = DEFAULT_SEAL_SCHEMA_ROOT, { throwOnError = true } = {}) {
  const issues = [];
  let schemas = {};
  try {
    schemas = await loadSealCeremonySchemas(schemaRoot);
  } catch (error) {
    add(issues, "SCHEMA_READ_FAILED", schemaRoot, error instanceof Error ? error.message : String(error));
  }
  for (const [key, filename] of SCHEMA_FILES) {
    const schema = schemas[key];
    if (!schema) continue;
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") add(issues, "SCHEMA_DIALECT_INVALID", filename, String(schema.$schema));
    if (schema.$id !== filename) add(issues, "SCHEMA_ID_INVALID", filename, String(schema.$id));
    inspectClosedSchema(schema, schema, issues, filename);
  }
  const result = { ok: issues.length === 0, issues, schemas };
  if (!result.ok && throwOnError) throw new Slice03SealValidationError(issues);
  return result;
}

function isWithin(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export async function discoverRepositoryRoot(start = DEFAULT_PROJECT_ROOT) {
  const fallback = await realpath(start);
  let current = fallback;
  while (true) {
    try {
      const marker = await stat(path.join(current, ".git"));
      if (marker.isDirectory() || marker.isFile()) return current;
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) return fallback;
    current = parent;
  }
}

async function repositoryBoundary(explicitRoot) {
  try {
    return await discoverRepositoryRoot();
  } catch (error) {
    if (explicitRoot) return realpath(explicitRoot);
    return realpath(DEFAULT_PROJECT_ROOT);
  }
}

async function resolveExisting(target, issues, location, expectedType) {
  if (typeof target !== "string" || !path.isAbsolute(target)) {
    add(issues, "PATH_NOT_ABSOLUTE", location, "must be an absolute path");
    return null;
  }
  try {
    const [resolved, metadata] = await Promise.all([realpath(target), stat(target)]);
    if (expectedType === "file" && !metadata.isFile()) add(issues, "PATH_TYPE_INVALID", location, "must resolve to a file");
    if (expectedType === "directory" && !metadata.isDirectory()) add(issues, "PATH_TYPE_INVALID", location, "must resolve to a directory");
    return path.resolve(resolved);
  } catch (error) {
    add(issues, "PATH_RESOLUTION_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function validatePathBoundary(target, { mode, repositoryRoot, tempRoot, expectedType, location }, issues) {
  const resolved = await resolveExisting(target, issues, location, expectedType);
  if (!resolved) return null;
  let repositoryReal;
  let tempReal;
  try {
    [repositoryReal, tempReal] = await Promise.all([realpath(repositoryRoot), realpath(tempRoot)]);
  } catch (error) {
    add(issues, "PATH_BOUNDARY_ROOT_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
  const lexical = path.resolve(target);
  if (mode === "formal") {
    if (isWithin(lexical, repositoryReal) || isWithin(resolved, repositoryReal)) {
      add(issues, "FORMAL_PATH_IN_REPOSITORY", location, "formal paths and resolved symlink/junction/mount targets must remain outside the repository");
    }
    if (isWithin(lexical, tempReal) || isWithin(resolved, tempReal)) {
      add(issues, "FORMAL_PATH_IN_TEMP", location, "formal paths and resolved targets may not use the system temporary directory reserved for rehearsals");
    }
  } else if (!isWithin(lexical, tempReal) || !isWithin(resolved, tempReal)) {
    add(issues, "REHEARSAL_PATH_OUTSIDE_TEMP", location, "rehearsal paths and resolved targets must remain under the system temporary directory");
  }
  return resolved;
}

export async function validateFormalRunnerPath(runnerPath, options = {}) {
  const issues = [];
  let repositoryRoot;
  try {
    repositoryRoot = await repositoryBoundary(options.repositoryRoot);
  } catch (error) {
    add(issues, "PATH_BOUNDARY_ROOT_FAILED", "repositoryRoot", error instanceof Error ? error.message : String(error));
    return { ok: false, issues, resolvedPath: null };
  }
  const resolvedPath = await validatePathBoundary(runnerPath, {
    mode: "formal",
    repositoryRoot,
    tempRoot: tmpdir(),
    expectedType: "file",
    location: "runRequest.runnerPath",
  }, issues);
  return { ok: issues.length === 0, issues, resolvedPath };
}

export async function validateRehearsalRunnerPath(runnerPath, options = {}) {
  const issues = [];
  let repositoryRoot;
  try {
    repositoryRoot = await repositoryBoundary(options.repositoryRoot);
  } catch (error) {
    add(issues, "PATH_BOUNDARY_ROOT_FAILED", "repositoryRoot", error instanceof Error ? error.message : String(error));
    return { ok: false, issues, resolvedPath: null };
  }
  const resolvedPath = await validatePathBoundary(runnerPath, {
    mode: "rehearsal",
    repositoryRoot,
    tempRoot: tmpdir(),
    expectedType: "file",
    location: "runRequest.runnerPath",
  }, issues);
  return { ok: issues.length === 0, issues, resolvedPath };
}

async function walkDirectory(root, base = "") {
  const entries = await readdir(path.join(root, base), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const relative = base ? path.join(base, entry.name) : entry.name;
    const absolute = path.join(root, relative);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link or junction forbidden in sealed tree: ${relative}`);
    if (entry.isDirectory()) files.push(...await walkDirectory(root, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`unsupported filesystem entry in sealed tree: ${relative}`);
  }
  return files;
}

export async function hashDirectoryTree(root) {
  const files = await walkDirectory(root);
  const digest = createHash("sha256");
  for (const relative of files) {
    digest.update(relative.split(path.sep).join("/"));
    digest.update("\0");
    digest.update(await readFile(path.join(root, relative)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function checkRecordHash(record, field, issues, location) {
  if (!isRecord(record)) return;
  const actual = record[field];
  const expected = hashRecordWithout(record, field);
  if (actual !== expected) add(issues, "RECORD_HASH_MISMATCH", `${location}.${field}`, `expected ${expected}`);
}

function checkSchema(value, schema, issues, location) {
  for (const error of validateSchemaInstance(value, schema, location)) add(issues, "SCHEMA_INSTANCE_INVALID", error.location, error.message);
}

function collectIdValues(value, prefix = "$", output = []) {
  if (Array.isArray(value)) value.forEach((entry, index) => collectIdValues(entry, `${prefix}[${index}]`, output));
  else if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      const location = `${prefix}.${key}`;
      if (typeof entry === "string" && (key.endsWith("Id") || key.endsWith("Key"))) output.push({ location, value: entry });
      else if (Array.isArray(entry) && key.endsWith("Ids")) entry.forEach((id, index) => output.push({ location: `${location}[${index}]`, value: id }));
      collectIdValues(entry, location, output);
    }
  }
  return output;
}

function isMockId(value) {
  return typeof value === "string" && /(?:^|[.:-])mock(?:[.:-]|$)/i.test(value);
}

function checkMode(records, mode, issues) {
  for (const [location, record] of records) {
    if (!isRecord(record)) continue;
    if (mode === "formal") {
      if (record.ceremonyRehearsal !== false) add(issues, "FORMAL_REHEARSAL_MARKER_FORBIDDEN", `${location}.ceremonyRehearsal`, "formal validation requires false");
      for (const id of collectIdValues(record, location)) if (isMockId(id.value)) add(issues, "FORMAL_MOCK_ID_FORBIDDEN", id.location, id.value);
    } else if (record.ceremonyRehearsal !== true) {
      add(issues, "REHEARSAL_MARKER_REQUIRED", `${location}.ceremonyRehearsal`, "rehearsal validation requires true");
    }
  }
}

function checkRoleIndependence(plan, receipt, issues, location) {
  const roles = plan?.roles;
  if (!isRecord(roles)) return;
  const authorFields = ["candidateAuthorIds", "thresholdAuthorIds", "qaProfileAuthorIds", "stoppingRuleAuthorIds"];
  for (const field of authorFields) {
    if (Array.isArray(roles[field]) && roles[field].includes(roles.custodianId)) add(issues, "CUSTODIAN_ROLE_CONFLICT", `sealPlan.roles.${field}`, roles.custodianId);
  }
  if (!receipt) return;
  const attestation = receipt.roleAttestation;
  if (!isRecord(attestation)) return;
  if (receipt.custodianId !== roles.custodianId || attestation.custodianId !== roles.custodianId) add(issues, "CUSTODIAN_ID_MISMATCH", location, "receipt custodian must match the frozen plan");
  for (const field of authorFields) if (!deepEqual(attestation[field], roles[field])) add(issues, "ROLE_ATTESTATION_MISMATCH", `${location}.${field}`, "must reproduce the frozen role IDs");
  if (attestation.conflictDetected !== false) add(issues, "ROLE_CONFLICT_DECLARED", `${location}.conflictDetected`, "must be false");
}

function checkFrozenChain(plan, bundle, request, receipt, issues, index) {
  const expected = { ...plan.frozenRefs, sealPlanSha256: plan.planSha256, bundleSha256: bundle.manifestSha256 };
  if (!deepEqual(request.frozenRefs, expected)) add(issues, "REQUEST_FROZEN_CHAIN_MISMATCH", `requests[${index}].frozenRefs`, "must bind the preregistration, contract, candidate, runner, format profile, QA profile, exact seal plan, and bundle hashes");
  if (!deepEqual(receipt.frozenRefs, expected)) add(issues, "RECEIPT_FROZEN_CHAIN_MISMATCH", `receipts[${index}].frozenRefs`, "must preserve the exact request frozen chain including sealPlanSha256");
  if (request.requestSha256 !== hashRecordWithout(request, "requestSha256")) add(issues, "REQUEST_HASH_MISMATCH", `requests[${index}].requestSha256`, "request content changed after freeze");
  if (receipt.requestSha256 !== request.requestSha256) add(issues, "RECEIPT_REQUEST_HASH_MISMATCH", `receipts[${index}].requestSha256`, "must bind the exact request");
}

function checkFormalTrustedPins(plan, bundle, options, issues) {
  const pins = options.trustedPins;
  const fields = ["expectedPlanSha256", "expectedBundleSha256", "expectedCustodianId"];
  if (!isRecord(pins) || fields.some((field) => !Object.hasOwn(pins, field))) {
    add(issues, "FORMAL_TRUSTED_PINS_REQUIRED", "trustedPins", "formal validation requires externally supplied expectedPlanSha256, expectedBundleSha256, and expectedCustodianId");
    return;
  }
  if (typeof pins.expectedPlanSha256 !== "string" || !/^[a-f0-9]{64}$/.test(pins.expectedPlanSha256)) add(issues, "FORMAL_TRUSTED_PIN_INVALID", "trustedPins.expectedPlanSha256", "must be a lowercase SHA-256");
  if (typeof pins.expectedBundleSha256 !== "string" || !/^[a-f0-9]{64}$/.test(pins.expectedBundleSha256)) add(issues, "FORMAL_TRUSTED_PIN_INVALID", "trustedPins.expectedBundleSha256", "must be a lowercase SHA-256");
  if (typeof pins.expectedCustodianId !== "string" || !/^[a-z0-9][a-z0-9._:-]{2,127}$/.test(pins.expectedCustodianId)) add(issues, "FORMAL_TRUSTED_PIN_INVALID", "trustedPins.expectedCustodianId", "must be a valid actor ID");
  if (pins.expectedPlanSha256 !== plan?.planSha256) add(issues, "FORMAL_PLAN_PIN_MISMATCH", "trustedPins.expectedPlanSha256", "does not match the externally pinned seal plan");
  if (pins.expectedBundleSha256 !== bundle?.manifestSha256) add(issues, "FORMAL_BUNDLE_PIN_MISMATCH", "trustedPins.expectedBundleSha256", "does not match the externally pinned bundle manifest");
  if (pins.expectedCustodianId !== plan?.roles?.custodianId || pins.expectedCustodianId !== bundle?.isolation?.custodianId) add(issues, "FORMAL_CUSTODIAN_PIN_MISMATCH", "trustedPins.expectedCustodianId", "does not match the independently pinned custodian");
}

function checkCustody(events, bundle, mode, issues) {
  if (!Array.isArray(events) || events.length === 0) return;
  let previous = null;
  let previousTime = -Infinity;
  const ids = new Set();
  events.forEach((event, index) => {
    const location = `custodyEvents[${index}]`;
    if (ids.has(event.eventId)) add(issues, "CUSTODY_EVENT_ID_REUSED", `${location}.eventId`, event.eventId);
    ids.add(event.eventId);
    if (event.sequence !== index) add(issues, "CUSTODY_SEQUENCE_INVALID", `${location}.sequence`, `expected ${index}`);
    if (event.previousEventSha256 !== previous) add(issues, "CUSTODY_PREDECESSOR_MISMATCH", `${location}.previousEventSha256`, `expected ${previous}`);
    if (event.bundleId !== bundle.bundleId) add(issues, "CUSTODY_BUNDLE_MISMATCH", `${location}.bundleId`, bundle.bundleId);
    if (event.ceremonyRehearsal !== (mode === "rehearsal")) add(issues, "CUSTODY_MODE_MISMATCH", `${location}.ceremonyRehearsal`, mode);
    checkRecordHash(event, "eventSha256", issues, location);
    const when = Date.parse(event.timestamp);
    if (Number.isFinite(when) && when < previousTime) add(issues, "CUSTODY_TIME_REVERSED", `${location}.timestamp`, "events must be chronological");
    previousTime = when;
    previous = event.eventSha256;
  });
  if (events[0]?.action !== "sealed") add(issues, "CUSTODY_FIRST_ACTION_INVALID", "custodyEvents[0].action", "must begin with sealed");
}

function custodyAttemptKey(value) {
  return `${value?.requestId ?? ""}\0${value?.receiptId ?? ""}\0${value?.attemptNumber ?? ""}`;
}

function checkCeremonyChronology(plan, bundle, requests, receipts, events, issues) {
  const at = (value) => Date.parse(value);
  const ordered = (left, right, location, message) => {
    const leftTime = at(left);
    const rightTime = at(right);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime > rightTime) add(issues, "CEREMONY_TIME_ORDER_INVALID", location, message);
  };
  ordered(plan.frozenAt, bundle.createdAt, "bundleManifest.createdAt", "bundle creation must not precede the frozen seal plan");
  ordered(bundle.createdAt, bundle.isolation?.signedAt, "bundleManifest.isolation.signedAt", "partition isolation must be signed after bundle creation");
  for (const [index, request] of requests.entries()) {
    ordered(plan.frozenAt, request.requestedAt, `requests[${index}].requestedAt`, "request must follow the frozen seal plan");
    ordered(bundle.createdAt, request.requestedAt, `requests[${index}].requestedAt`, "request must follow bundle creation");
    ordered(bundle.isolation?.signedAt, request.requestedAt, `requests[${index}].requestedAt`, "request must follow the custodian isolation signature");
  }
  for (const [index, event] of events.entries()) {
    ordered(bundle.createdAt, event.timestamp, `custodyEvents[${index}].timestamp`, "custody events must not precede bundle creation");
  }
  for (let index = 0; index < Math.min(requests.length, receipts.length); index += 1) {
    const request = requests[index];
    const receipt = receipts[index];
    ordered(request.requestedAt, receipt.execution?.unsealedAt, `receipts[${index}].execution.unsealedAt`, "unsealing must follow the request");
    ordered(receipt.execution?.completedAt, receipt.roleAttestation?.signedAt, `receipts[${index}].roleAttestation.signedAt`, "role attestation must not predate run completion");
  }
}

function checkLedger(plan, requests, receipts, summaries, events, issues) {
  if (!Array.isArray(requests) || !Array.isArray(receipts) || !Array.isArray(summaries)) return;
  if (requests.length === 0) add(issues, "LEDGER_EMPTY", "requests", "a completed ceremony requires exactly one root request and at least one attempt");
  if (requests.length !== receipts.length || receipts.length !== summaries.length) add(issues, "LEDGER_CARDINALITY_MISMATCH", "ledger", "every request needs exactly one receipt and summary");
  const requestIds = new Set();
  const idempotencyKeys = new Set();
  const receiptIds = new Set();
  const custodyHeads = new Set();
  const custodyByHash = new Map((events ?? []).map((event) => [event.eventSha256, event]));
  const knownCustodyAttempts = new Set();
  const groups = new Map();
  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index];
    const receipt = receipts[index];
    const summary = summaries[index];
    if (!isRecord(request) || !isRecord(receipt) || !isRecord(summary)) continue;
    if (requestIds.has(request.requestId)) add(issues, "REQUEST_ID_REUSED", `requests[${index}].requestId`, request.requestId);
    if (idempotencyKeys.has(request.idempotencyKey)) add(issues, "IDEMPOTENCY_KEY_REUSED", `requests[${index}].idempotencyKey`, request.idempotencyKey);
    if (receiptIds.has(receipt.receiptId)) add(issues, "RECEIPT_ID_REUSED", `receipts[${index}].receiptId`, receipt.receiptId);
    requestIds.add(request.requestId); idempotencyKeys.add(request.idempotencyKey); receiptIds.add(receipt.receiptId);
    const attemptKey = custodyAttemptKey({ requestId: request.requestId, receiptId: receipt.receiptId, attemptNumber: request.attemptNumber });
    knownCustodyAttempts.add(attemptKey);
    if (custodyHeads.has(receipt.custodyHeadSha256)) add(issues, "CUSTODY_HEAD_REUSED", `receipts[${index}].custodyHeadSha256`, "each attempt requires its own run-completed custody event");
    custodyHeads.add(receipt.custodyHeadSha256);
    for (const [field, expected] of Object.entries({ requestId: request.requestId, rootRequestId: request.rootRequestId, attemptNumber: request.attemptNumber, idempotencyKey: request.idempotencyKey, bundleId: request.bundleId })) {
      if (receipt[field] !== expected) add(issues, "RECEIPT_REQUEST_LINK_MISMATCH", `receipts[${index}].${field}`, `expected ${expected}`);
    }
    for (const [field, expected] of Object.entries({ receiptId: receipt.receiptId, requestId: request.requestId, rootRequestId: request.rootRequestId, attemptNumber: request.attemptNumber, bundleId: request.bundleId, status: receipt.execution?.outcome, invalidReason: receipt.execution?.invalidReason, rawResultPath: receipt.execution?.rawResultPath })) {
      if (summary[field] !== expected) add(issues, "SUMMARY_RECEIPT_LINK_MISMATCH", `resultSummaries[${index}].${field}`, `expected ${expected}`);
    }
    if (!deepEqual(request.rerunPolicy, plan.rerunPolicy)) add(issues, "RERUN_POLICY_MISMATCH", `requests[${index}].rerunPolicy`, "must reproduce the plan frozen policy");
    if (summary.aggregationRule !== plan.rerunPolicy.aggregationRule) add(issues, "AGGREGATION_RULE_MISMATCH", `resultSummaries[${index}].aggregationRule`, "must reproduce the plan frozen rule");
    const attemptEvents = (events ?? []).filter((event) => custodyAttemptKey(event) === attemptKey);
    const requiredActions = ["access-granted", "unsealed", "run-started", "run-completed"];
    const operationalEvents = attemptEvents.filter((event) => requiredActions.includes(event.action));
    if (!deepEqual(operationalEvents.map((event) => event.action), requiredActions)) {
      add(issues, "CUSTODY_ATTEMPT_SEQUENCE_INVALID", `custodyEvents:${request.requestId}`, `each attempt requires exactly ${requiredActions.join(" -> ")}`);
    } else {
      const [accessEvent, unsealedEvent, startedEvent, completedEvent] = operationalEvents;
      if (receipt.custodyHeadSha256 !== completedEvent.eventSha256) add(issues, "RECEIPT_CUSTODY_HEAD_INVALID", `receipts[${index}].custodyHeadSha256`, "must name this attempt's run-completed custody event");
      if (Date.parse(accessEvent.timestamp) < Date.parse(request.requestedAt)) add(issues, "CUSTODY_ACCESS_BEFORE_REQUEST", `custodyEvents:${request.requestId}`, "access may only be granted after the request");
      const expectedTimes = [receipt.execution?.unsealedAt, receipt.execution?.startedAt, receipt.execution?.completedAt];
      for (const [eventIndex, event] of [unsealedEvent, startedEvent, completedEvent].entries()) {
        if (event.timestamp !== expectedTimes[eventIndex]) add(issues, "CUSTODY_EXECUTION_TIME_MISMATCH", `custodyEvents:${event.eventId}.timestamp`, `must equal ${expectedTimes[eventIndex]}`);
      }
      for (const event of operationalEvents) if (event.actorId !== plan.roles?.custodianId) add(issues, "CUSTODY_ACTOR_NOT_CUSTODIAN", `custodyEvents:${event.eventId}.actorId`, "custody actions require the independently pinned custodian");
    }
    if (!custodyByHash.has(receipt.custodyHeadSha256)) add(issues, "RECEIPT_CUSTODY_HEAD_INVALID", `receipts[${index}].custodyHeadSha256`, "must name a custody event in the submitted append-only chain");
    const executionTimes = [receipt.execution?.unsealedAt, receipt.execution?.startedAt, receipt.execution?.completedAt].map(Date.parse);
    if (executionTimes.some((value) => !Number.isFinite(value)) || executionTimes[0] > executionTimes[1] || executionTimes[1] > executionTimes[2]) add(issues, "EXECUTION_TIME_ORDER_INVALID", `receipts[${index}].execution`, "unsealedAt <= startedAt <= completedAt is required");
    if (receipt.execution?.outcome === "valid") {
      if (receipt.execution.invalidReason !== null || summary.invalidReason !== null) add(issues, "VALID_RESULT_HAS_INVALID_REASON", `receipts[${index}].execution.invalidReason`, "valid results require null");
      if (!Array.isArray(summary.metrics) || summary.metrics.length !== plan.evaluation?.metrics?.length) add(issues, "VALID_RESULT_METRICS_INCOMPLETE", `resultSummaries[${index}].metrics`, "must report every frozen metric");
    } else {
      if (!INVALID_RUN_REASONS.has(receipt.execution?.invalidReason) || !plan.rerunPolicy.allowedInvalidReasons.includes(receipt.execution?.invalidReason)) add(issues, "INVALID_REASON_NOT_FROZEN", `receipts[${index}].execution.invalidReason`, String(receipt.execution?.invalidReason));
      if (!Array.isArray(summary.metrics) || summary.metrics.length !== 0) add(issues, "INVALID_RESULT_HAS_METRICS", `resultSummaries[${index}].metrics`, "invalid attempts cannot contribute selective metrics");
    }
    checkRecordHash(receipt, "receiptSha256", issues, `receipts[${index}]`);
    checkRecordHash(summary, "summarySha256", issues, `resultSummaries[${index}]`);
    const group = groups.get(request.rootRequestId) ?? [];
    group.push({ request, receipt, summary, index });
    groups.set(request.rootRequestId, group);
  }
  for (const [index, event] of (events ?? []).entries()) if (!knownCustodyAttempts.has(custodyAttemptKey(event))) add(issues, "CUSTODY_ATTEMPT_UNKNOWN", `custodyEvents[${index}]`, "event does not bind a submitted request, receipt, and attempt");
  if (groups.size > 1) add(issues, "MULTIPLE_ROOT_REQUESTS", "requests", "a seal plan and bundle permit only one root request; invalid reruns must continue that root");
  for (const attempts of groups.values()) {
    attempts.sort((left, right) => left.request.attemptNumber - right.request.attemptNumber);
    attempts.forEach((current, attemptIndex) => {
      const expectedAttempt = attemptIndex + 1;
      const previous = attempts[attemptIndex - 1];
      if (current.request.attemptNumber !== expectedAttempt) add(issues, "ATTEMPT_SEQUENCE_INVALID", `requests[${current.index}].attemptNumber`, `expected ${expectedAttempt}`);
      if (attemptIndex === 0) {
        if (current.request.rootRequestId !== current.request.requestId || current.request.retryOfReceiptId !== null) add(issues, "ROOT_REQUEST_INVALID", `requests[${current.index}]`, "first attempt must be its own root and not retry a receipt");
      } else {
        if (current.request.retryOfReceiptId !== previous.receipt.receiptId) add(issues, "RETRY_PREDECESSOR_MISMATCH", `requests[${current.index}].retryOfReceiptId`, previous.receipt.receiptId);
        if (previous.receipt.execution?.outcome === "valid") add(issues, "VALID_RESULT_SELECTIVE_RERUN", `requests[${current.index}]`, "a valid formal result can never be rerun");
        if (Date.parse(current.request.requestedAt) < Date.parse(previous.receipt.execution?.completedAt)) add(issues, "RETRY_REQUESTED_BEFORE_INVALID_RESULT", `requests[${current.index}].requestedAt`, "an invalid rerun request must follow the preceding invalid receipt");
      }
      const expectedPrior = attempts.slice(0, attemptIndex).map((entry) => entry.receipt.receiptId);
      if (!deepEqual(current.summary.priorReceiptIds, expectedPrior)) add(issues, "RESULT_AGGREGATION_HISTORY_MISMATCH", `resultSummaries[${current.index}].priorReceiptIds`, "must include every prior invalid receipt in order");
    });
    if (attempts.length - 1 > plan.rerunPolicy.maxInvalidReruns) add(issues, "INVALID_RERUN_LIMIT_EXCEEDED", "ledger", `maximum is ${plan.rerunPolicy.maxInvalidReruns}`);
  }
}

function checkMetrics(plan, summaries, issues) {
  const thresholdEntries = plan.evaluation?.thresholds ?? [];
  const thresholds = new Map(thresholdEntries.map((entry) => [entry.metricId, entry]));
  if (thresholds.size !== thresholdEntries.length || thresholds.size !== (plan.evaluation?.metrics ?? []).length || (plan.evaluation?.metrics ?? []).some((metricId) => !thresholds.has(metricId))) {
    add(issues, "THRESHOLD_SET_INVALID", "sealPlan.evaluation.thresholds", "must freeze exactly one threshold for every metric");
  }
  for (const [index, summary] of summaries.entries()) {
    if (summary.status !== "valid" || !Array.isArray(summary.metrics)) continue;
    const seen = new Set();
    for (const [metricIndex, metric] of summary.metrics.entries()) {
      const location = `resultSummaries[${index}].metrics[${metricIndex}]`;
      if (!plan.evaluation.metrics.includes(metric.metricId) || seen.has(metric.metricId)) add(issues, "METRIC_NOT_FROZEN", `${location}.metricId`, metric.metricId);
      seen.add(metric.metricId);
      if (metric.denominator !== plan.evaluation.denominator.frozenCount) add(issues, "DENOMINATOR_CHANGED_AFTER_UNSEAL", `${location}.denominator`, `expected ${plan.evaluation.denominator.frozenCount}`);
      const expectedValue = metric.numerator / metric.denominator;
      if (Math.abs(metric.value - expectedValue) > Number.EPSILON * 8) add(issues, "METRIC_VALUE_MISMATCH", `${location}.value`, `expected ${expectedValue}`);
      const threshold = thresholds.get(metric.metricId);
      if (!threshold) add(issues, "METRIC_THRESHOLD_MISSING", location, metric.metricId);
      else {
        const expectedPassed = threshold.operator === "gte" ? metric.value >= threshold.target : metric.value <= threshold.target;
        if (metric.passed !== expectedPassed) add(issues, "METRIC_PASS_MISMATCH", `${location}.passed`, `expected ${expectedPassed}`);
      }
    }
  }
}

async function validateCeremony(ceremony, mode, options = {}) {
  const issues = [];
  const schemasResult = await validateSealCeremonySchemas(options.schemaRoot ?? DEFAULT_SEAL_SCHEMA_ROOT, { throwOnError: false });
  issues.push(...schemasResult.issues);
  const schemas = schemasResult.schemas;
  const plan = ceremony?.sealPlan;
  const bundle = ceremony?.bundleManifest;
  const requests = ceremony?.requests;
  const receipts = ceremony?.receipts;
  const summaries = ceremony?.resultSummaries;
  const events = ceremony?.custodyEvents;
  if (!isRecord(ceremony)) add(issues, "CEREMONY_TYPE_INVALID", "$", "must be an object");
  if (!isRecord(plan) || !isRecord(bundle) || !Array.isArray(requests) || !Array.isArray(receipts) || !Array.isArray(summaries) || !Array.isArray(events)) {
    add(issues, "CEREMONY_SHAPE_INVALID", "$", "sealPlan, bundleManifest, requests, receipts, resultSummaries, and custodyEvents are required");
  } else {
    checkSchema(plan, schemas.plan, issues, "sealPlan");
    checkSchema(bundle, schemas.bundleManifest, issues, "bundleManifest");
    requests.forEach((value, index) => checkSchema(value, schemas.runRequest, issues, `requests[${index}]`));
    receipts.forEach((value, index) => checkSchema(value, schemas.runReceipt, issues, `receipts[${index}]`));
    summaries.forEach((value, index) => checkSchema(value, schemas.resultSummary, issues, `resultSummaries[${index}]`));
    events.forEach((value, index) => checkSchema(value, schemas.custodyEvent, issues, `custodyEvents[${index}]`));
    const records = [["sealPlan", plan], ["bundleManifest", bundle], ...requests.map((value, index) => [`requests[${index}]`, value]), ...receipts.map((value, index) => [`receipts[${index}]`, value]), ...summaries.map((value, index) => [`resultSummaries[${index}]`, value]), ...events.map((value, index) => [`custodyEvents[${index}]`, value])];
    checkMode(records, mode, issues);
    if (mode === "rehearsal") {
      if (plan.formalHoldoutStatus !== "not-created" || bundle.formalHoldoutStatus !== "not-created") add(issues, "REHEARSAL_FORMAL_HOLDOUT_CREATED", "formalHoldoutStatus", "rehearsal must not create a formal holdout");
      if (bundle.rights?.eligibility !== "project-original-rehearsal-metadata") add(issues, "REHEARSAL_RIGHTS_INVALID", "bundleManifest.rights.eligibility", "rehearsal may use project-original metadata only");
      if (!isMockId(plan.sealPlanId) || !isMockId(bundle.bundleId) || requests.some((entry) => !isMockId(entry.requestId)) || receipts.some((entry) => !isMockId(entry.receiptId))) add(issues, "REHEARSAL_MOCK_ID_REQUIRED", "$", "rehearsal top-level IDs must be visibly mock-prefixed");
    } else {
      checkFormalTrustedPins(plan, bundle, options, issues);
      if (bundle.formalHoldoutStatus !== "sealed-external") add(issues, "FORMAL_BUNDLE_NOT_SEALED", "bundleManifest.formalHoldoutStatus", "formal validation requires sealed-external");
      if (bundle.rights?.eligibility !== "formal-custodian-cleared") add(issues, "FORMAL_RIGHTS_NOT_CLEARED", "bundleManifest.rights.eligibility", "formal bundles require custodian-cleared rights");
    }
    checkRecordHash(plan, "planSha256", issues, "sealPlan");
    checkRecordHash(bundle, "manifestSha256", issues, "bundleManifest");
    checkRoleIndependence(plan, null, issues, "sealPlan.roles");
    if (bundle.isolation?.custodianId !== plan.roles?.custodianId) add(issues, "BUNDLE_CUSTODIAN_MISMATCH", "bundleManifest.isolation.custodianId", plan.roles?.custodianId);
    checkCustody(events, bundle, mode, issues);
    checkCeremonyChronology(plan, bundle, requests, receipts, events, issues);
    checkLedger(plan, requests, receipts, summaries, events, issues);
    checkMetrics(plan, summaries, issues);
    for (let index = 0; index < Math.min(requests.length, receipts.length); index += 1) {
      checkFrozenChain(plan, bundle, requests[index], receipts[index], issues, index);
      checkRoleIndependence(plan, receipts[index], issues, `receipts[${index}].roleAttestation`);
      if (requests[index].sealPlanId !== plan.sealPlanId || requests[index].bundleId !== bundle.bundleId) add(issues, "REQUEST_TARGET_MISMATCH", `requests[${index}]`, "must name the frozen plan and bundle");
    }
    let resolvedRepositoryRoot;
    try {
      resolvedRepositoryRoot = await repositoryBoundary(options.repositoryRoot);
    } catch (error) {
      add(issues, "PATH_BOUNDARY_ROOT_FAILED", "repositoryRoot", error instanceof Error ? error.message : String(error));
      resolvedRepositoryRoot = DEFAULT_PROJECT_ROOT;
    }
    const boundaryOptions = { mode, repositoryRoot: resolvedRepositoryRoot, tempRoot: tmpdir() };
    const bundleReal = await validatePathBoundary(bundle.bundleRootPath, { ...boundaryOptions, expectedType: "directory", location: "bundleManifest.bundleRootPath" }, issues);
    if (bundleReal) {
      try {
        const actual = await hashDirectoryTree(bundleReal);
        if (actual !== bundle.protection.integritySha256) add(issues, "BUNDLE_INTEGRITY_MISMATCH", "bundleManifest.protection.integritySha256", `expected ${actual}`);
      } catch (error) {
        add(issues, "BUNDLE_TREE_INVALID", "bundleManifest.bundleRootPath", error instanceof Error ? error.message : String(error));
      }
    }
    for (const [index, request] of requests.entries()) {
      const runnerReal = await validatePathBoundary(request.runnerPath, { ...boundaryOptions, expectedType: "file", location: `requests[${index}].runnerPath` }, issues);
      if (runnerReal) {
        const actual = sha256(await readFile(runnerReal));
        if (actual !== plan.frozenRefs.runnerSha256) add(issues, "RUNNER_HASH_MISMATCH", `requests[${index}].runnerPath`, `expected ${plan.frozenRefs.runnerSha256}`);
      }
    }
    for (const [index, summary] of summaries.entries()) {
      const rawReal = await validatePathBoundary(summary.rawResultPath, { ...boundaryOptions, expectedType: "file", location: `resultSummaries[${index}].rawResultPath` }, issues);
      if (rawReal) {
        const actual = sha256(await readFile(rawReal));
        if (actual !== summary.rawResultSha256) add(issues, "RAW_RESULT_HASH_MISMATCH", `resultSummaries[${index}].rawResultSha256`, `expected ${actual}`);
      }
    }
  }
  const result = { ok: issues.length === 0, mode, issues, summary: { formalHoldoutStatus: bundle?.formalHoldoutStatus ?? "unknown", attempts: Array.isArray(requests) ? requests.length : 0, custodyEvents: Array.isArray(events) ? events.length : 0 } };
  if (!result.ok && options.throwOnError !== false) throw new Slice03SealValidationError(issues);
  return result;
}

export async function validateFormalSealCeremony(ceremony, options = {}) {
  return validateCeremony(ceremony, "formal", options);
}

export async function validateRehearsalSealCeremony(ceremony, options = {}) {
  return validateCeremony(ceremony, "rehearsal", options);
}
