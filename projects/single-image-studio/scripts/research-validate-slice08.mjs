import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSlice08CaseContext, validateSlice08CaseContext } from "./research-gateb-case-context-slice08.mjs";
import { buildSlice08Definition, SLICE08_DEFINITION_PATHS, SLICE08_SCHEMA_DOCUMENTS } from "./research-generate-slice08.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { validateSlice08OperationTree } from "./research-gateb-runner-slice08.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-08");
const ZERO = Object.freeze({ C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0, productSupport: false, formal: false, releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0 });
const SUPPORTED = new Set(["$schema", "$id", "$ref", "$defs", "type", "const", "enum", "pattern", "format", "minimum", "maximum", "minItems", "maxItems", "items", "oneOf", "additionalProperties", "required", "properties"]);

export const SLICE08_FROZEN_PINS = Object.freeze({
  frozenAt: "2026-08-15T13:37:23.038Z",
  definitionContentHash: "048d1d0212ea8e59fdf3e24b0acb6d75e57535ac1fa8757d42442cb7b8623695",
  definitionFileSha256: "7ff4e599eeff45865dccb5d9bd9f6e8c0faba516785f808c4063f4b11e4aa8c7",
  descendantTreeSha256: "ee577c4560d2b08e9a18fb8ac8b2872916b3652bd1b664ef9b366b1e704996a4",
  schemaTreeSha256: "1a6f45c3415eece37bc007042a87538ff81c9262373b732aaf8fcacafa0ee9d0",
  fullTreeSha256: "c6845e689a33607f8c031e87eec8a42cbfdc78b3ca6ca2698e2b5cf98c35cc24",
  readmeSha256: "4dd57e7e6035209e9bfaea1a8a6ec8fc082b9f129e57fc31b8f14c886dced7f3",
  generatorSha256: "d46ba04d6bbcc21604baba9906c14c67cb79cb7f331f1919e78d47a64951c23b",
});
export const SLICE08_POSTRUN_TREE_SHA256 = "2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withoutHash(value) { return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "contentHash")); }
function selfHash(value) { return sha256(bytesOf(withoutHash(value))); }
function add(issues, code, location, message) { issues.push({ code, location, message }); }
function same(a, b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }
function recordId(value) {
  for (const key of ["id", "goldRecordId", "artifactId", "definitionId", "definitionIndexId", "contextId", "requestId", "resultId", "closureId", "summaryId", "decisionId"])
    if (typeof value?.[key] === "string") return value[key];
  return null;
}

async function enumerate(root, prefix = "", output = new Map(), directories = null) {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(root, ...relative.split("/"));
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`link forbidden: ${relative}`);
    if (stat.isDirectory()) { directories?.add(relative); await enumerate(root, relative, output, directories); }
    else if (stat.isFile()) output.set(relative, await readFile(absolute));
    else throw new Error(`non-regular file forbidden: ${relative}`);
  }
  return output;
}

function digest(files, predicate = () => true) {
  const hash = createHash("sha256");
  for (const [relative, bytes] of [...files].filter(([name]) => predicate(name)).sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)))) {
    hash.update(relative); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0])); hash.update(sha256(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

function inspectSchema(node, location, issues, inProperties = false) {
  if (!node || typeof node !== "object" || Array.isArray(node)) { add(issues, "SCHEMA_NODE_INVALID", location, "schema node must be an object"); return; }
  for (const [key, child] of Object.entries(node)) {
    if (!inProperties && !SUPPORTED.has(key)) add(issues, "SCHEMA_KEYWORD_UNSUPPORTED", `${location}/${key}`, "unsupported schema keyword");
    if (key === "properties" || key === "$defs") {
      if (!child || typeof child !== "object" || Array.isArray(child)) add(issues, "SCHEMA_MAP_INVALID", `${location}/${key}`, "schema map must be an object");
      else for (const [name, nested] of Object.entries(child)) inspectSchema(nested, `${location}/${key}/${name}`, issues);
    } else if (key === "items") inspectSchema(child, `${location}/items`, issues);
    else if (key === "oneOf") {
      if (!Array.isArray(child) || child.length === 0) add(issues, "SCHEMA_ONE_OF_INVALID", `${location}/oneOf`, "oneOf must be non-empty");
      else child.forEach((entry, index) => inspectSchema(entry, `${location}/oneOf/${index}`, issues));
    }
  }
  if (node.type === "object") {
    if (node.additionalProperties !== false || !node.properties || !Array.isArray(node.required)
      || !same([...node.required].sort(), Object.keys(node.properties).sort())) {
      add(issues, "SCHEMA_OBJECT_OPEN", location, "objects must be closed and require every declared property");
    }
  }
  if (node.type === "array" && !node.items) add(issues, "SCHEMA_ARRAY_OPEN", location, "arrays require an items schema");
}

function resolveSchemaRef(ref, current, registry) {
  if (ref.startsWith("#/$defs/")) return current.$defs?.[ref.slice("#/$defs/".length)] ?? null;
  return registry.get(ref) ?? registry.get(path.posix.basename(ref)) ?? null;
}

function validateInstance(value, schema, location, issues, registry, rootSchema = schema) {
  if (schema.$ref) {
    const resolved = resolveSchemaRef(schema.$ref, rootSchema, registry);
    if (!resolved) add(issues, "SCHEMA_REF_UNRESOLVED", location, schema.$ref);
    else validateInstance(value, resolved, location, issues, registry, schema.$ref.startsWith("#/") ? rootSchema : resolved);
    return;
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => { const local = []; validateInstance(value, branch, location, local, registry, rootSchema); return local.length === 0; });
    if (matches.length !== 1) add(issues, "SCHEMA_ONE_OF_MISMATCH", location, "value must match exactly one branch");
    return;
  }
  if (Object.hasOwn(schema, "const") && !same(value, schema.const)) add(issues, "SCHEMA_CONST_MISMATCH", location, "const mismatch");
  if (schema.enum && !schema.enum.some((item) => same(value, item))) add(issues, "SCHEMA_ENUM_MISMATCH", location, "enum mismatch");
  if (schema.type === "null" && value !== null) add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected null");
  if (schema.type === "string") {
    if (typeof value !== "string") add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected string");
    else {
      if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) add(issues, "SCHEMA_PATTERN_MISMATCH", location, "pattern mismatch");
      if (schema.format === "date-time" && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)) add(issues, "SCHEMA_DATETIME_INVALID", location, "invalid canonical UTC");
    }
  }
  if (schema.type === "boolean" && typeof value !== "boolean") add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected boolean");
  if (schema.type === "integer") {
    if (!Number.isInteger(value)) add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected integer");
    else if ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum)) add(issues, "SCHEMA_RANGE_INVALID", location, "integer outside range");
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected array");
    else {
      if ((schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) add(issues, "SCHEMA_ARRAY_LENGTH_INVALID", location, "array length outside range");
      value.forEach((item, index) => validateInstance(item, schema.items, `${location}/${index}`, issues, registry, rootSchema));
    }
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) add(issues, "SCHEMA_TYPE_MISMATCH", location, "expected object");
    else {
      for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties, key)) add(issues, "SCHEMA_EXTRA_PROPERTY", `${location}/${key}`, "extra property");
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) add(issues, "SCHEMA_REQUIRED_MISSING", `${location}/${key}`, "required property missing");
        else validateInstance(value[key], schema.properties[key], `${location}/${key}`, issues, registry, rootSchema);
      }
    }
  }
}

function discoverRefs(value, output = []) {
  if (Array.isArray(value)) value.forEach((item) => discoverRefs(item, output));
  else if (value && typeof value === "object") {
    if (same(Object.keys(value).sort(), ["byteLength", "contentHash", "fileSha256", "id", "path"])) output.push(value);
    else Object.values(value).forEach((item) => discoverRefs(item, output));
  }
  return output;
}

function referencePath(definitionRoot, refPath) {
  if (refPath.startsWith("research/")) return path.join(PROJECT_ROOT, ...refPath.split("/"));
  return path.join(definitionRoot, ...refPath.split("/"));
}

async function validateReference(ref, owner, definitionRoot, issues) {
  try {
    const bytes = await readFile(referencePath(definitionRoot, ref.path));
    const target = JSON.parse(bytes);
    if (ref.byteLength !== bytes.length || ref.fileSha256 !== sha256(bytes) || ref.contentHash !== target.contentHash || ref.id !== recordId(target)) {
      add(issues, "REFERENCE_BINDING_MISMATCH", `${owner}:${ref.path}`, "reference does not match target bytes and identity");
    }
  } catch (error) { add(issues, "REFERENCE_TARGET_MISSING", `${owner}:${ref.path}`, error.message); }
}

function descriptor(relative, value, bytes) { return { path: relative, id: recordId(value), contentHash: value.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) }; }

function expectedCases(manifest, index, operation) {
  const refs = {
    manifestRef: index.manifestRefs.find((item) => item.id === manifest.id), candidateRef: index.candidateRef,
    contractRef: index.contractRefs.find((item) => item.id === manifest.contractRef.id), runtimeRef: index.runtimeRef, workerRef: index.workerRef,
  };
  const result = new Map();
  for (const entry of manifest.entries) for (let repetition = 1; repetition <= 3; repetition += 1) {
    const context = createSlice08CaseContext({ operation, caseRecord: { sourceId: entry.sourceId, sourceRef: entry.wrapperRef,
      disposition: entry.disposition, expectedStableErrorCode: entry.expectedStableErrorCode, expectedFactsRef: entry.expectedFactsRef,
      goldRef: entry.goldRef, workerRequestRef: entry.wrapperRef }, repetition, ...refs });
    result.set(context.attempt.attemptId, context);
  }
  return result;
}

async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }

async function validatePartialProtocolFailure({ root, manifest, index, issues, registry, schemaByVersion }) {
  const issueCount = issues.length;
  const opRoot = path.join(root, "results", "open-smoke", "normalize");
  const directories = new Set();
  const files = await enumerate(opRoot, "", new Map(), directories);
  const attemptId = "s08.normalize.s08.normalize.applicable.001.r1";
  const requestPath = `requests/${attemptId}.json`;
  const expectedFiles = new Set(["ledger.ndjson", requestPath]);
  const expectedDirectories = new Set([".staging", "closures", "records", "requests"]);
  if (!same([...files.keys()].sort(), [...expectedFiles].sort()) || !same([...directories].sort(), [...expectedDirectories].sort())) {
    add(issues, "PARTIAL_RESULT_TREE_SHAPE_INVALID", "results/open-smoke/normalize", "protocol-failed tree must retain exactly one request, one ledger event and four empty runner directories");
  }
  let request = null;
  try {
    request = JSON.parse(files.get(requestPath));
    const requestSchema = schemaByVersion.get(request.schemaVersion);
    validateInstance(request, requestSchema, requestPath, issues, registry, requestSchema);
    validateSlice08CaseContext(request.caseContext);
    const expected = expectedCases(manifest, index, "normalize").get(attemptId);
    if (request.contentHash !== selfHash(request) || !same(request.caseContext, expected)) add(issues, "PARTIAL_REQUEST_BINDING_INVALID", requestPath, "partial request differs from the first frozen attempt");
  } catch (error) { add(issues, "PARTIAL_REQUEST_INVALID", requestPath, error.message); }
  let ledgerTail = null;
  try {
    const lines = files.get("ledger.ndjson").toString("utf8").trim().split("\n");
    if (lines.length !== 1) throw new Error("partial ledger must contain exactly one event");
    const event = JSON.parse(lines[0]);
    const eventSchema = schemaByVersion.get(event.schemaVersion);
    validateInstance(event, eventSchema, "ledger.ndjson:1", issues, registry, eventSchema);
    if (event.sequence !== 1 || event.previousEventHash !== null || event.eventType !== "attempt-started" || event.attemptId !== attemptId
      || event.payloadSha256 !== sha256(files.get(requestPath)) || event.contentHash !== selfHash(event)) throw new Error("started event does not bind the retained request");
    ledgerTail = event.contentHash;
  } catch (error) { add(issues, "PARTIAL_LEDGER_INVALID", "ledger.ndjson", error.message); }
  return { valid: issues.length === issueCount, status: "protocol-failed-incomplete", operation: "normalize", attemptId,
    requestCount: request ? 1 : 0, terminalCount: 0, closureCount: 0, decisionCount: 0, exportStarted: false,
    gateBPassed: false, calibrationAuthorized: false, ledgerTail };
}

async function validateOperationResults({ root, operation, manifest, index, issues, registry, schemaByVersion }) {
  const opRoot = path.join(root, "results", "open-smoke", operation);
  try { await validateSlice08OperationTree(opRoot); } catch (error) { add(issues, "RESULT_OPERATION_SHALLOW_INVALID", operation, error.message); }
  const directories = new Set();
  const files = await enumerate(opRoot, "", new Map(), directories);
  const expected = expectedCases(manifest, index, operation);
  const allowed = /^(?:ledger\.ndjson|summary\.json|decision\.json|requests\/s08\.(?:normalize|export)\.[A-Za-z0-9._:@-]+\.r[123]\.json|records\/s08\.(?:normalize|export)\.[A-Za-z0-9._:@-]+\.r[123]\.json|closures\/s08\.(?:normalize|export)\.[A-Za-z0-9._:@-]+\.r[123]\/(?:context\.json|closure\.json|oracle\.json|result\.json|output\.(?:png|bin)))$/u;
  for (const relative of files.keys()) if (!allowed.test(relative)) add(issues, "RESULT_FILE_UNREGISTERED", `${operation}/${relative}`, "unregistered result path");
  const allowedDirectories = new Set(["requests", "records", "closures"]);
  for (const context of expected.values()) if (context.disposition === "applicable") allowedDirectories.add(`closures/${context.attempt.attemptId}`);
  for (const relative of directories) if (!allowedDirectories.has(relative)) add(issues, "RESULT_DIRECTORY_UNREGISTERED", `${operation}/${relative}`, "unregistered or residual result directory");
  for (const relative of allowedDirectories) if (!directories.has(relative)) add(issues, "RESULT_DIRECTORY_MISSING", `${operation}/${relative}`, "registered result directory missing");
  for (const [relative, bytes] of files) {
    if (!relative.endsWith(".json") || relative.endsWith("/oracle.json")) continue;
    try {
      const value = JSON.parse(bytes);
      const recordSchema = schemaByVersion.get(value.schemaVersion);
      if (!recordSchema) add(issues, "RESULT_SCHEMA_UNREGISTERED", `${operation}/${relative}`, value.schemaVersion ?? "missing schemaVersion");
      else validateInstance(value, recordSchema, `${operation}/${relative}`, issues, registry, recordSchema);
      if (value.contentHash !== selfHash(value)) add(issues, "RESULT_CONTENT_HASH_MISMATCH", `${operation}/${relative}`, "result record self-hash invalid");
    } catch (error) { add(issues, "RESULT_JSON_INVALID", `${operation}/${relative}`, error.message); }
  }
  const requestFiles = [...files.keys()].filter((name) => name.startsWith("requests/"));
  const recordFiles = [...files.keys()].filter((name) => name.startsWith("records/"));
  const contextFiles = [...files.keys()].filter((name) => name.endsWith("/context.json"));
  if (requestFiles.length !== 18 || recordFiles.length !== 9 || contextFiles.length !== 9) add(issues, "RESULT_DENOMINATOR_INVALID", operation, "requires 18 requests, 9 rejection records and 9 closures");
  const requestByAttempt = new Map();
  for (const relative of requestFiles) {
    const request = JSON.parse(files.get(relative));
    const attemptId = request.caseContext?.attempt?.attemptId;
    try { validateSlice08CaseContext(request.caseContext); } catch (error) { add(issues, "RESULT_CONTEXT_INVALID", `${operation}/${relative}`, error.message); }
    if (request.contentHash !== selfHash(request) || !same(request.caseContext, expected.get(attemptId))) add(issues, "RESULT_REQUEST_BINDING_INVALID", `${operation}/${relative}`, "request hash or frozen context differs");
    requestByAttempt.set(attemptId, request);
  }
  if (requestByAttempt.size !== 18 || [...expected.keys()].some((key) => !requestByAttempt.has(key))) add(issues, "RESULT_REQUEST_SET_INVALID", operation, "request set differs from preregistration");
  const ledgerLines = files.get("ledger.ndjson")?.toString("utf8").trim().split("\n") ?? [];
  const ledger = [];
  let previous = null;
  for (let indexLine = 0; indexLine < ledgerLines.length; indexLine += 1) {
    try {
      const event = JSON.parse(ledgerLines[indexLine]);
      const eventSchema = schemaByVersion.get(event.schemaVersion);
      if (!eventSchema) add(issues, "RESULT_SCHEMA_UNREGISTERED", `${operation}/ledger:${indexLine + 1}`, event.schemaVersion ?? "missing schemaVersion");
      else validateInstance(event, eventSchema, `${operation}/ledger:${indexLine + 1}`, issues, registry, eventSchema);
      if (event.sequence !== indexLine + 1 || event.previousEventHash !== previous || event.contentHash !== selfHash(event)) add(issues, "RESULT_LEDGER_CHAIN_INVALID", `${operation}/ledger:${indexLine + 1}`, "ledger chain mismatch");
      previous = event.contentHash; ledger.push(event);
    } catch (error) { add(issues, "RESULT_LEDGER_JSON_INVALID", `${operation}/ledger:${indexLine + 1}`, error.message); }
  }
  const eventGroups = new Map();
  for (const event of ledger) { const list = eventGroups.get(event.attemptId) ?? []; list.push(event); eventGroups.set(event.attemptId, list); }
  const terminalResults = [];
  for (const [attemptId, request] of requestByAttempt) {
    const events = eventGroups.get(attemptId) ?? [];
    const started = events[0]; const terminal = events.at(-1);
    if (started?.eventType !== "attempt-started" || started.payloadSha256 !== sha256(bytesOf(request)) || terminal?.eventType !== "attempt-terminal") {
      add(issues, "RESULT_LEDGER_ATTEMPT_INVALID", `${operation}/${attemptId}`, "attempt ledger does not bind request and terminal");
    }
    const context = request.caseContext;
    let result;
    if (context.disposition === "rejection") {
      const relative = `records/${attemptId}.json`;
      if (!files.has(relative)) { add(issues, "RESULT_TERMINAL_MISSING", `${operation}/${attemptId}`, "rejection terminal missing"); continue; }
      result = JSON.parse(files.get(relative));
      const derived = result.actualCode === context.expectedStableErrorCode && result.workerExitConfirmed === false ? "pass" : "non-pass";
      if (result.status !== derived || result.closureRef !== null || result.fileSha256 !== null || result.decodedPixelSha256 !== null) add(issues, "RESULT_REJECTION_DERIVATION_INVALID", `${operation}/${attemptId}`, "rejection terminal is not exactly derived");
      if (events.length !== 2) add(issues, "RESULT_REJECTION_EVENT_SET_INVALID", `${operation}/${attemptId}`, "rejection must have started and terminal only");
    } else {
      const directory = `closures/${attemptId}`;
      for (const name of ["context.json", "closure.json", "result.json"]) if (!files.has(`${directory}/${name}`)) add(issues, "RESULT_CLOSURE_FILE_MISSING", `${operation}/${attemptId}/${name}`, "closure file missing");
      if (!files.has(`${directory}/result.json`)) continue;
      result = JSON.parse(files.get(`${directory}/result.json`));
      const closure = JSON.parse(files.get(`${directory}/closure.json`));
      const savedContext = JSON.parse(files.get(`${directory}/context.json`));
      const extension = closure.classification === "artifact-pass" ? "png" : "bin";
      const output = files.get(`${directory}/output.${extension}`);
      if (!output || !same(savedContext, context) || closure.contentHash !== selfHash(closure) || result.contentHash !== selfHash(result)
        || closure.requestId !== request.requestId || result.requestId !== request.requestId || closure.attemptId !== attemptId || result.attemptId !== attemptId
        || closure.caseContextHash !== context.contentHash || result.caseContextHash !== context.contentHash || closure.outputByteLength !== output?.length
        || closure.outputFileSha256 !== sha256(output ?? Buffer.alloc(0)) || result.fileSha256 !== closure.outputFileSha256
        || result.decodedPixelSha256 !== closure.decodedPixelSha256 || result.workerExitConfirmed !== true) {
        add(issues, "RESULT_CLOSURE_BINDING_INVALID", `${operation}/${attemptId}`, "closure bytes, context and terminal are not cross-bound");
      }
      if (result.status === "pass") {
        const oraclePath = `${directory}/oracle.json`;
        if (!files.has(oraclePath) || closure.classification !== "artifact-pass" || result.actualCode !== null) add(issues, "RESULT_PASS_ORACLE_MISSING", `${operation}/${attemptId}`, "pass requires oracle and artifact classification");
        else try {
          const decoded = decodeIndependentPngSlice05(output);
          const oracle = JSON.parse(files.get(oraclePath));
          const expectedOracle = { fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256, width: decoded.width, height: decoded.height, chunkTypes: decoded.chunkTypes };
          const gold = await readJson(referencePath(root, context.goldRef.path));
          if (!same(oracle, expectedOracle) || closure.oracleFactsSha256 !== sha256(bytesOf(oracle)) || !decoded.filter0Only
            || !same(decoded.chunkTypes, ["IHDR", "sRGB", "IDAT", "IEND"]) || decoded.decodedPixelSha256 !== gold.expected.decodedPixelSha256
            || decoded.width !== gold.expected.width || decoded.height !== gold.expected.height) add(issues, "RESULT_PASS_REOPEN_INVALID", `${operation}/${attemptId}`, "pass output does not independently reproduce gold");
        } catch (error) { add(issues, "RESULT_PASS_REOPEN_FAILED", `${operation}/${attemptId}`, error.message); }
      } else if (files.has(`${directory}/oracle.json`) || closure.classification !== "candidate-non-pass" || typeof result.actualCode !== "string") {
        add(issues, "RESULT_NONPASS_CLOSURE_INVALID", `${operation}/${attemptId}`, "candidate non-pass closure has incompatible files or code");
      }
      if (!same(events.map((event) => event.eventType), ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"])) add(issues, "RESULT_PUBLICATION_SEQUENCE_INVALID", `${operation}/${attemptId}`, "applicable publication event sequence differs");
    }
    if (result && terminal?.payloadSha256 !== sha256(bytesOf(result))) add(issues, "RESULT_TERMINAL_LEDGER_BINDING_INVALID", `${operation}/${attemptId}`, "terminal ledger does not bind result bytes");
    if (result) terminalResults.push(result);
  }
  const summary = JSON.parse(files.get("summary.json") ?? "null");
  const decision = JSON.parse(files.get("decision.json") ?? "null");
  const grouped = new Map();
  for (const result of terminalResults) { const list = grouped.get(result.sourceId) ?? []; list.push(result); grouped.set(result.sourceId, list); }
  const derivedSummary = { schemaVersion: "operation-summary.slice08.v0", summaryId: `summary.s08.${operation}`, operation,
    plannedSources: 6, plannedAttempts: 18, terminalAttempts: terminalResults.length,
    passAttempts: terminalResults.filter((item) => item.status === "pass").length, nonPassAttempts: terminalResults.filter((item) => item.status === "non-pass").length,
    applicableArtifactPasses: terminalResults.filter((item) => item.disposition === "applicable" && item.status === "pass").length,
    rejectionExactPasses: terminalResults.filter((item) => item.disposition === "rejection" && item.status === "pass").length,
    sourceThreeOfThreePasses: [...grouped.values()].filter((items) => items.length === 3 && items.every((item) => item.status === "pass")).length,
    deterministicSources: [...grouped.values()].filter((items) => items.length === 3 && new Set(items.map((item) => `${item.status}:${item.actualCode}:${item.fileSha256}`)).size === 1).length,
    replacementCount: 0, protocolFailureCount: 0, evidenceBoundary: ZERO };
  derivedSummary.contentHash = sha256(bytesOf(derivedSummary));
  if (!same(summary, derivedSummary)) add(issues, "RESULT_SUMMARY_DERIVATION_INVALID", operation, "summary does not reproduce terminals");
  const allPass = derivedSummary.passAttempts === 18 && derivedSummary.applicableArtifactPasses === 9 && derivedSummary.rejectionExactPasses === 9
    && derivedSummary.sourceThreeOfThreePasses === 6 && derivedSummary.deterministicSources === 6;
  const derivedDecision = { schemaVersion: "gateb-decision.slice08.v0", decisionId: `decision.s08.${operation}`, operation,
    state: allPass ? "pass" : "denied-closed-non-pass", summaryRef: derivedSummary.summaryId, gateBPassed: allPass, calibrationAuthorized: false, evidenceBoundary: ZERO };
  derivedDecision.contentHash = sha256(bytesOf(derivedDecision));
  if (!same(decision, derivedDecision)) add(issues, "RESULT_DECISION_DERIVATION_INVALID", operation, "decision does not reproduce summary");
  return { operation, requestCount: requestByAttempt.size, terminalCount: terminalResults.length, summary, decision, ledgerTail: previous };
}

export async function validateSlice08Definition({ definitionRoot = DEFAULT_ROOT, requirePins = true, recheckRuntime = true, regenerate = true } = {}) {
  const issues = [];
  let allFiles;
  try { allFiles = await enumerate(definitionRoot); } catch (error) { return { valid: false, issues: [{ code: "TREE_READ_FAILED", location: definitionRoot, message: error.message }], definitionRef: null, postRun: null }; }
  const resultPaths = [...allFiles.keys()].filter((name) => name.startsWith("results/"));
  for (const relative of resultPaths) if (!/^results\/open-smoke\/(?:normalize|export)\//u.test(relative)) add(issues, "RESULT_PATH_UNREGISTERED", relative, "only operation-specific open-smoke results are registered");
  const files = new Map([...allFiles].filter(([name]) => !name.startsWith("results/")));
  const indexBytes = files.get(SLICE08_DEFINITION_PATHS.definition);
  if (!indexBytes) return { valid: false, issues: [{ code: "DEFINITION_INDEX_MISSING", location: SLICE08_DEFINITION_PATHS.definition, message: "missing" }], definitionRef: null, postRun: null };
  let index;
  try { index = JSON.parse(indexBytes); } catch (error) { return { valid: false, issues: [{ code: "DEFINITION_INDEX_INVALID", location: SLICE08_DEFINITION_PATHS.definition, message: error.message }], definitionRef: null, postRun: null }; }
  const readmeBytes = files.get("README.md");
  if (!readmeBytes) add(issues, "README_MISSING", "README.md", "README must be present and pinned");
  let rebuilt = null;
  if (regenerate || recheckRuntime) {
    try { rebuilt = await buildSlice08Definition({ frozenAt: index.frozenAt, readmeBytes }); }
    catch (error) { add(issues, "REGENERATION_FAILED", "generator", error.message); }
  }
  if (rebuilt) {
    const expected = new Map(rebuilt.fileMap); expected.set("README.md", readmeBytes);
    if (files.size !== expected.size) add(issues, "FILE_SET_MISMATCH", definitionRoot, `expected ${expected.size}, got ${files.size}`);
    for (const [relative, bytes] of expected) if (!files.get(relative)?.equals(bytes)) add(issues, "GENERATED_BYTES_MISMATCH", relative, "bytes differ from fresh generation");
  }
  const registry = new Map();
  const schemaByVersion = new Map();
  for (const [relative, expectedSchema] of Object.entries(SLICE08_SCHEMA_DOCUMENTS)) {
    inspectSchema(expectedSchema, relative, issues);
    registry.set(expectedSchema.$id, expectedSchema); registry.set(path.posix.basename(relative), expectedSchema);
    const version = expectedSchema.properties?.schemaVersion?.const;
    if (version) schemaByVersion.set(version, expectedSchema);
    const actual = files.get(relative);
    if (!actual?.equals(bytesOf(expectedSchema))) add(issues, "SCHEMA_BYTES_MISMATCH", relative, "schema differs from implementation export");
    if (actual) try { inspectSchema(JSON.parse(actual), `${relative}:actual`, issues); }
    catch (error) { add(issues, "SCHEMA_JSON_INVALID", relative, error.message); }
  }
  if (registry.size < 32 || Object.keys(SLICE08_SCHEMA_DOCUMENTS).length !== 16) add(issues, "SCHEMA_SET_INVALID", "schemas", "requires 16 exact registered schemas");
  const records = new Map();
  for (const [relative, bytes] of files) {
    if (!relative.endsWith(".json") || relative.startsWith("schemas/")) continue;
    let value;
    try { value = JSON.parse(bytes); } catch (error) { add(issues, "JSON_INVALID", relative, error.message); continue; }
    records.set(relative, { value, bytes });
    const schema = schemaByVersion.get(value.schemaVersion);
    if (!schema) add(issues, "RECORD_SCHEMA_UNREGISTERED", relative, value.schemaVersion ?? "missing schemaVersion");
    else validateInstance(value, schema, relative, issues, registry, schema);
    if (value.contentHash !== selfHash(value)) add(issues, "CONTENT_HASH_MISMATCH", relative, "record self-hash invalid");
    if (value.frozenAt !== undefined && (value.frozenAt !== index.frozenAt || new Date(value.frozenAt).toISOString() !== value.frozenAt)) add(issues, "FREEZE_TIME_INVALID", relative, "record freeze must equal canonical index freeze");
    if (value.evidenceBoundary !== undefined && !same(value.evidenceBoundary, ZERO)) add(issues, "EVIDENCE_BOUNDARY_INVALID", relative, "evidence/release boundary must remain zero");
  }
  for (const [owner, { value }] of records) for (const ref of discoverRefs(value)) await validateReference(ref, owner, definitionRoot, issues);
  const candidate = records.get(SLICE08_DEFINITION_PATHS.candidate)?.value;
  if (!candidate || candidate.implementationRefs.length !== 9 || candidate.implementationRefs.some((ref) => ref.path.includes("validate-slice08"))) add(issues, "IMPLEMENTATION_SET_INVALID", "candidate", "candidate must pin nine non-validator implementations");
  else for (const ref of candidate.implementationRefs) {
    try { if (sha256(await readFile(path.join(PROJECT_ROOT, ...ref.path.split("/")))) !== ref.sha256) add(issues, "IMPLEMENTATION_HASH_MISMATCH", ref.path, "implementation drift"); }
    catch (error) { add(issues, "IMPLEMENTATION_MISSING", ref.path, error.message); }
  }
  const wrappers = [...records.entries()].filter(([name]) => name.startsWith("source-lineage/"));
  const manifests = {};
  for (const operation of ["normalize", "export"]) manifests[operation] = records.get(SLICE08_DEFINITION_PATHS[`${operation}Manifest`])?.value;
  const ids = new Set();
  for (const [relative, { value }] of wrappers) {
    if (ids.has(value.id)) add(issues, "SOURCE_ID_DUPLICATE", relative, value.id); ids.add(value.id);
    if (value.copiedImageBytes !== false || value.independenceClaim !== false || value.priorSlice07Ref.path !== `research/slice-07/source-lineage/${value.operation}/${value.priorSlice07Ref.id.replace(/^lineage\./u, "")}.json`) {
      add(issues, "SOURCE_LINEAGE_BOUNDARY_INVALID", relative, "wrapper must be a non-independent exact Slice 07 lineage reference");
    }
    try {
      const raw = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.rawAssetPath.split("/")));
      if (raw.length !== value.rawAssetByteLength || sha256(raw) !== value.rawAssetFileSha256) add(issues, "SOURCE_BYTES_DRIFT", relative, "Slice 05 source bytes differ");
      const manifestEntry = manifests[value.operation]?.entries.find((entry) => entry.sourceId === value.id);
      if (manifestEntry?.disposition === "applicable") {
        const decoded = decodeIndependentPngSlice05(raw);
        if (decoded.decodedPixelSha256 !== value.rawAssetDecodedPixelSha256 || !value.goldRecordPath) add(issues, "SOURCE_PIXEL_GOLD_INVALID", relative, "applicable source pixels or gold are not bound");
      }
      if (value.goldRecordPath) await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.goldRecordPath.split("/")));
      if (value.normalizedArtifactPath) await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.normalizedArtifactPath.split("/")));
    } catch (error) { add(issues, "SOURCE_LINEAGE_READ_FAILED", relative, error.message); }
  }
  if (wrappers.length !== 12 || ids.size !== 12) add(issues, "SOURCE_DENOMINATOR_INVALID", "source-lineage", "requires 12 distinct wrappers");
  for (const operation of ["normalize", "export"]) {
    const manifest = manifests[operation];
    if (!manifest || manifest.entries.length !== 6 || manifest.entries.filter((entry) => entry.disposition === "applicable").length !== 3
      || manifest.entries.filter((entry) => entry.disposition === "rejection").length !== 3 || new Set(manifest.entries.map((entry) => entry.sourceId)).size !== 6) {
      add(issues, "MANIFEST_DENOMINATOR_INVALID", operation, "requires three applicable and three rejection sources");
    } else for (const entry of manifest.entries) {
      if (entry.disposition === "applicable") {
        if (entry.expectedStableErrorCode !== null || !entry.goldRef || !entry.expectedFactsRef || !same(entry.goldRef, entry.expectedFactsRef)) add(issues, "MANIFEST_APPLICABLE_INVALID", `${operation}/${entry.sourceId}`, "applicable refs invalid");
      } else if (!entry.expectedStableErrorCode?.startsWith("S08_") || entry.goldRef !== null || entry.expectedFactsRef !== null) add(issues, "MANIFEST_REJECTION_INVALID", `${operation}/${entry.sourceId}`, "rejection code/refs invalid");
    }
  }
  const expectedSchemaPaths = Object.keys(SLICE08_SCHEMA_DOCUMENTS).sort();
  if (!same(index.schemaPaths, expectedSchemaPaths) || index.resultProtocol.driverInvocations !== 1 || index.resultProtocol.registeredOperationRuns !== 2
    || index.resultProtocol.plannedSources !== 12 || index.resultProtocol.plannedAttempts !== 36 || index.resultProtocol.replacements !== 0
    || index.resultsState !== "not-created" || index.copiedImageBytes !== 0) add(issues, "DEFINITION_SEMANTICS_INVALID", "definition-index", "protocol or results-zero boundary differs");
  const descendants = new Map([...files].filter(([name]) => name !== "README.md" && name !== SLICE08_DEFINITION_PATHS.definition));
  const schemaDigest = digest(files, (name) => name.startsWith("schemas/"));
  const fullDigest = digest(files);
  if (index.descendantFileCount !== descendants.size || index.descendantTreeSha256 !== digest(descendants)) add(issues, "DESCENDANT_TREE_MISMATCH", "definition-index", "descendant count/digest mismatch");
  if (index.readmeSha256 !== sha256(readmeBytes ?? Buffer.alloc(0))) add(issues, "README_HASH_MISMATCH", "README.md", "README differs from index pin");
  let postRun = null;
  if (resultPaths.length > 0) {
    const postRunDigest = digest(allFiles, (name) => name.startsWith("results/"));
    if (SLICE08_POSTRUN_TREE_SHA256 === null) add(issues, "POSTRUN_PIN_MISSING", "results/open-smoke", "registered result tree has not been frozen");
    else if (postRunDigest !== SLICE08_POSTRUN_TREE_SHA256) add(issues, "POSTRUN_TREE_MISMATCH", "results/open-smoke", "result tree differs from immutable pin");
    try {
      const partialPaths = [
        "results/open-smoke/normalize/ledger.ndjson",
        "results/open-smoke/normalize/requests/s08.normalize.s08.normalize.applicable.001.r1.json",
      ];
      if (same([...resultPaths].sort(), partialPaths)) {
        postRun = { treeSha256: postRunDigest, ...await validatePartialProtocolFailure({ root: definitionRoot, manifest: manifests.normalize, index, issues, registry, schemaByVersion }) };
      } else {
        postRun = { treeSha256: postRunDigest, status: "complete", operations: {} };
        for (const operation of ["normalize", "export"]) postRun.operations[operation] = await validateOperationResults({ root: definitionRoot, operation, manifest: manifests[operation], index, issues, registry, schemaByVersion });
      }
    } catch (error) { add(issues, "POSTRUN_VALIDATION_FAILED", "results/open-smoke", error.message); postRun = { treeSha256: postRunDigest, valid: false }; }
  }
  const actualPins = { frozenAt: index.frozenAt, definitionContentHash: index.contentHash, definitionFileSha256: sha256(indexBytes),
    descendantTreeSha256: index.descendantTreeSha256, schemaTreeSha256: schemaDigest, fullTreeSha256: fullDigest,
    readmeSha256: sha256(readmeBytes ?? Buffer.alloc(0)), generatorSha256: index.generatorSha256 };
  if (requirePins) for (const [key, expected] of Object.entries(SLICE08_FROZEN_PINS)) {
    if (expected === null) add(issues, "FROZEN_PIN_MISSING", key, "definition pin not filled");
    else if (actualPins[key] !== expected) add(issues, "FROZEN_PIN_MISMATCH", key, `${actualPins[key]} != ${expected}`);
  }
  const definitionRef = descriptor(SLICE08_DEFINITION_PATHS.definition, index, indexBytes);
  return { valid: issues.length === 0, issues, definitionRef, frozenAt: index.frozenAt,
    counts: { schemas: Object.keys(SLICE08_SCHEMA_DOCUMENTS).length, records: records.size, sourceLineage: wrappers.length, results: resultPaths.length },
    digests: { schemaTreeSha256: schemaDigest, descendantTreeSha256: index.descendantTreeSha256, fullTreeSha256: fullDigest },
    pinsVerified: requirePins && !issues.some((entry) => entry.code.startsWith("FROZEN_PIN")), runtimeRechecked: Boolean(rebuilt && recheckRuntime),
    regenerationVerified: Boolean(rebuilt && regenerate && !issues.some((entry) => entry.code === "GENERATED_BYTES_MISMATCH")), postRun };
}

async function main() {
  const report = await validateSlice08Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
