import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SLICE06_RUNNER_RECORD_SCHEMAS,
  SLICE06_RUNNER_SCHEMA_PATHS,
} from "./research-run-slice06.mjs";
import {
  SLICE06_COMMIT_PINS,
  SLICE06_DEFINITION_IDS,
  SLICE06_DEFINITION_PATHS,
  SLICE06_EXPECTED_SCHEMA_PATHS,
  SLICE06_GENERATED_SCHEMA_DOCUMENTS,
  SLICE06_IMPLEMENTATION_IDENTITIES,
  SLICE06_MACHINE_SCHEMA_DOCUMENTS,
  SLICE06_SOURCE_SPECS,
  generateSlice06,
} from "./research-generate-slice06.mjs";
import { inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

export const DEFAULT_SLICE06_DEFINITION_ROOT = path.join(DEFAULT_PROJECT_ROOT, "research", "slice-06");
export const SLICE06_DEFINITION_INDEX_PATH = "definition-index.v0.6.0.json";
export const SLICE06_DEFINITION_README_PATH = "README.md";

// Filled only after the complete results-zero tree, generator, validator and README
// are stable. Null production pins deliberately fail closed when requirePins=true.
export const SLICE06_DEFINITION_PINS = Object.freeze({
  frozenAt: "2026-08-15T08:17:06.288Z",
  generatorSha256: "87b44cf2976198ab59ef049bb669783573fa4f7b576b9a5599cdef54c8a89f9a",
  schemaTreeSha256: "97a49dd06d86dff8ba48c37a3ac623d75192493da4417a65ae4c0a466b0ec317",
  descendantTreeSha256: "3a719b85ff3aca2eb180b88cf6a0498cb494b43256eb09af57bd466d8a348f3f",
  fullTreeSha256: "19a42a2e63b73fb0971e7038e4470c02551dce9b0ddba2dfc87dd3e5780d47b3",
  readmeSha256: "1653c5677a3d5c61b26244a75bd198441ce126e07a614f8c9f16d228fc925726",
  definitionIndexContentHash: "d537199c8bc6147761da297daeddb03e1ff837a83c8d2c57af29c9e5b9b67e08",
  definitionIndexFileSha256: "1cb934a1d870a62e9ccb706e3c21dcdbb54de55f027a325e31230ac4bf3cb20c",
});

export const SLICE06_LINEAGE_PINS = Object.freeze({
  slice05ClosureCommit: "4d7003e8e583c5964ab81ac0eb7182861aa44c0f",
  slice05DefinitionCommit: "1db59c753991f9b0105c67c162e85cb9062ee3b1",
  phaseBProtocolCommit: "ed5a60fb2f103494f78fda4260909c6e83a1baf6",
  phaseBPreviousProtocolBaselineCommit: "002e28963289e1f49e49a29ca78ebf820958f235",
  slice06ScopeCommit: "97584c02e5689c276825dec4e058b9a94d84913a",
  slice05DefinitionFullTreeSha256: "108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2",
  slice05ResultTreeSha256: "e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b",
  slice05LedgerFileSha256: "7bcb9f3f2eded4aaedc59a6fc2473b6ad711ba3dc9a2ad00eaf162dd57b28d6a",
  slice05LedgerTailContentHash: "f8f2fe5e0356a801cbd59670c16d79dba976d2338a297e6e917a3f5ebf581828",
  slice05DefinitionIndexContentHash: "d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271",
  slice05DefinitionIndexFileSha256: "8cbf1f0aaf018c54b95eaa5ef0f3a2f6cb11dc60529ea569408496514d582d96",
  normalizeSummaryContentHash: "4e03ecfcfc917bb5fc23ba50064f2876e75ce44c3a8a6e149b2d2e883d0652ec",
  normalizeSummaryFileSha256: "391fe2284dd05c2aff178b28bbf9eab3598ada0545fde3cc5cf9c0bc8df13a41",
  exportSummaryContentHash: "4d9f369f971e75ebf45e8c5b91d439503a9c212a365343dade7de49c19cfa6fd",
  exportSummaryFileSha256: "de76d6e038570b9a20977460176086484efcfda7ad473a8e15f35a2a1d625aa3",
  normalizeDecisionContentHash: "4f3c428ce3d9674054fe66e04dae8ec8a5157a666335d81694e570cd1f2a84e1",
  normalizeDecisionFileSha256: "42e69ef94d90c224e977052dee373f1d1d65a4fbedfc6b147a6a1336e150f71e",
  exportDecisionContentHash: "583307cd0d3d97876b54eb3b4c0dd3cc14c40536d53d2d8e25604c8bc7faa0ba",
  exportDecisionFileSha256: "201b017b12654b6c14c16599f04293aa868ba553804faa7928044674162e5227",
});

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_RELATIVE_PATTERN = /^(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)(?!.*:)[A-Za-z0-9@._-]+(?:\/[A-Za-z0-9@._-]+)*$/u;
const NUL = Buffer.from([0]);
const JSON_SCHEMA_TYPES = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);

export const SLICE06_SCHEMA_KEYWORD_ALLOWLIST = Object.freeze(new Set([
  "$schema", "$id", "$ref", "$defs", "title", "description", "type", "const", "enum", "format", "pattern",
  "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "uniqueItems", "items", "oneOf",
  "properties", "required", "additionalProperties",
]));

const ORACLE_SCHEMA_HASHES = Object.freeze({
  "schemas/candidate-output-observation.slice06.v0.schema.json": "559ff94af62928af06e3b1edc715bd8441d16bd1e02af95724d157fe1f9dc834",
  "schemas/diagnostic-envelope.slice06.v0.schema.json": "6ab9655ff35264a317f229c134c2abfafa9cfeb1dd04cedbbfffad4de17d367a",
  "schemas/oracle-diagnostic.slice06.v0.schema.json": "25e8caa36b17487cef802dc0b254c20e5037c8137590f25b948e89bc311aecd7",
});

const ZERO_EVIDENCE_FIELDS = new Set([
  "c1", "u1", "e1", "r1", "r1Pipeline", "r1ProductValidation", "r1ProductRelease", "o1", "g1", "v1",
  "c1Denominator", "formalSources", "releaseRegistered", "releaseApproved", "generatedResults", "resultFilesPresent",
  "registeredResultCount", "artifactCount", "formalFixtures",
]);
const FALSE_BOUNDARY_FIELDS = new Set([
  "productSupport", "formalEvidence", "formal", "c1Eligible", "holdoutMaterial", "holdoutSeedsPresent",
  "gateBDecisionAuthority", "calibrationAuthorized", "formalRunsAllowed", "candidatePipelineInvoked", "imageBytesRead",
  "imageDecoded", "imageEncoded", "containsRealPerson", "realUserPhotosUsed", "thirdPartyAssetsUsed", "modelWeightsUsed",
  "independenceClaim", "resultsDirectoryPresent",
]);
const NOT_CREATED_FIELDS = new Set([
  "resultsState", "resultsStateAtDefinitionFreeze", "formalHoldoutStatus", "formalDefectHoldoutStatus", "formalEscapeStatus",
  "holdoutAtDefinitionFreeze", "defectHoldoutAtDefinitionFreeze", "escapeAtDefinitionFreeze", "calibrationState",
]);

export class Slice06ValidationError extends Error {
  constructor(issues) {
    super(`Slice 06 validation failed with ${issues.length} issue(s)`);
    this.name = "Slice06ValidationError";
    this.issues = issues;
  }
}

function issue(issues, code, location, message) { issues.push({ code, location, message }); }
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function normalizeRelative(value) { return value.split(path.sep).join("/"); }
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, stableValue(value[key])]));
  return value;
}
function deepEqual(left, right) { return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right)); }

export function stableStringifySlice06Validation(value) { return `${JSON.stringify(stableValue(value), null, 2)}\n`; }
export function sha256Slice06Validation(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
export function contentHashSlice06Validation(record) {
  if (!isRecord(record)) throw new TypeError("content-hashed Slice 06 records must be objects");
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice06Validation(Buffer.from(stableStringifySlice06Validation(copy), "utf8"));
}

export function collectSlice06References(value, location = "$", output = { recordRefs: [], fileRefs: [], shortRefs: [], implementationRefs: [] }) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSlice06References(entry, `${location}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  const keys = Object.keys(value).sort(compareText);
  const hasFileIdentity = typeof value.path === "string" && typeof value.fileSha256 === "string"
    && (!Object.hasOwn(value, "byteLength") || Number.isInteger(value.byteLength));
  if (hasFileIdentity && typeof value.id === "string" && typeof value.contentHash === "string") output.recordRefs.push({ location, ref: value });
  else if (hasFileIdentity) output.fileRefs.push({ location, ref: value });
  if (deepEqual(keys, ["contentHash", "id"]) && typeof value.id === "string" && typeof value.contentHash === "string") {
    output.shortRefs.push({ location, ref: value });
  }
  if (deepEqual(keys, ["id", "implementationSha256", "path", "version"])
    && typeof value.id === "string" && typeof value.path === "string") output.implementationRefs.push({ location, ref: value });
  for (const [key, entry] of Object.entries(value)) collectSlice06References(entry, `${location}.${key}`, output);
  return output;
}

export function validateSlice06DefinitionBoundary(value, location = "$") {
  const issues = [];
  const walk = (entry, where) => {
    if (Array.isArray(entry)) { entry.forEach((item, index) => walk(item, `${where}[${index}]`)); return; }
    if (!isRecord(entry)) return;
    for (const [key, child] of Object.entries(entry)) {
      const childLocation = `${where}.${key}`;
      if (ZERO_EVIDENCE_FIELDS.has(key) && child !== 0) issue(issues, "EVIDENCE_AXIS_UPGRADED", childLocation, "definition evidence counters must remain zero");
      if (FALSE_BOUNDARY_FIELDS.has(key) && child !== false) issue(issues, "DEFINITION_BOUNDARY_UPGRADED", childLocation, "diagnostic definition boundary flag must remain false");
      if (NOT_CREATED_FIELDS.has(key) && child !== "not-created" && !(key === "calibrationState" && child === "not-created-by-scope")) {
        issue(issues, "DEFINITION_RESULT_STATE_INVALID", childLocation, "definition-stage material must remain not-created");
      }
      if ((key === "gateBState" || key === "gateBStateAtDefinitionFreeze") && child !== "not-entered-diagnostic-only") {
        issue(issues, "GATE_B_AUTHORITY_UPGRADED", childLocation, "Slice 06 has no Gate B decision authority");
      }
      if (key === "releaseAllowlist" && child !== "none") issue(issues, "RELEASE_ALLOWLIST_UPGRADED", childLocation, "release allowlist must remain none");
      if (key === "candidateExecutionState" && child !== "not-run") issue(issues, "CANDIDATE_EXECUTION_STATE_INVALID", childLocation, "candidate execution must remain not-run");
      walk(child, childLocation);
    }
  };
  walk(value, location);
  return issues;
}

function schemaTypes(node) {
  if (typeof node.type === "string") return [node.type];
  return Array.isArray(node.type) ? node.type : [];
}

function inspectSchemaNode(node, issues, location, root) {
  if (!isRecord(node)) { issue(issues, "SCHEMA_NODE_INVALID", location, "schema nodes must be objects"); return; }
  for (const keyword of Object.keys(node)) {
    if (!SLICE06_SCHEMA_KEYWORD_ALLOWLIST.has(keyword)) issue(issues, "SCHEMA_KEYWORD_UNSUPPORTED", `${location}.${keyword}`, `unsupported keyword ${keyword}`);
  }
  const types = schemaTypes(node);
  if (Object.hasOwn(node, "type") && (types.length < 1 || new Set(types).size !== types.length || types.some((type) => !JSON_SCHEMA_TYPES.has(type)))) {
    issue(issues, "SCHEMA_TYPE_INVALID", `${location}.type`, "type must use unique supported JSON types");
  }
  if (Object.hasOwn(node, "$ref")) {
    if (typeof node.$ref !== "string" || !node.$ref.startsWith("#/$defs/") || !Object.hasOwn(root.$defs ?? {}, node.$ref.slice(8))) {
      issue(issues, "SCHEMA_REF_UNRESOLVED", `${location}.$ref`, String(node.$ref));
    }
    if (Object.keys(node).some((key) => key !== "$ref")) issue(issues, "SCHEMA_REF_SIBLING_FORBIDDEN", location, "$ref nodes cannot carry siblings");
  }
  if (Object.hasOwn(node, "format") && node.format !== "date-time") issue(issues, "SCHEMA_FORMAT_UNSUPPORTED", `${location}.format`, "only date-time is supported");
  if (Object.hasOwn(node, "pattern") && typeof node.pattern !== "string") issue(issues, "SCHEMA_PATTERN_TYPE_INVALID", `${location}.pattern`, "pattern must be a string");
  for (const keyword of ["minLength", "maxLength", "minItems", "maxItems"]) {
    if (Object.hasOwn(node, keyword) && (!Number.isInteger(node[keyword]) || node[keyword] < 0)) issue(issues, "SCHEMA_BOUND_INVALID", `${location}.${keyword}`, "bound must be a non-negative integer");
  }
  for (const keyword of ["minimum", "maximum"]) {
    if (Object.hasOwn(node, keyword) && (typeof node[keyword] !== "number" || !Number.isFinite(node[keyword]))) issue(issues, "SCHEMA_BOUND_INVALID", `${location}.${keyword}`, "bound must be finite");
  }
  if (Number.isInteger(node.minLength) && Number.isInteger(node.maxLength) && node.minLength > node.maxLength) issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minLength exceeds maxLength");
  if (Number.isInteger(node.minItems) && Number.isInteger(node.maxItems) && node.minItems > node.maxItems) issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minItems exceeds maxItems");
  if (typeof node.minimum === "number" && typeof node.maximum === "number" && node.minimum > node.maximum) issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minimum exceeds maximum");
  if (Object.hasOwn(node, "uniqueItems") && typeof node.uniqueItems !== "boolean") issue(issues, "SCHEMA_UNIQUE_ITEMS_INVALID", `${location}.uniqueItems`, "uniqueItems must be boolean");
  if (Object.hasOwn(node, "enum") && (!Array.isArray(node.enum) || node.enum.length < 1
    || new Set(node.enum.map((entry) => JSON.stringify(stableValue(entry)))).size !== node.enum.length)) issue(issues, "SCHEMA_ENUM_INVALID", `${location}.enum`, "enum must contain unique JSON values");
  if (typeof node.pattern === "string") { try { new RegExp(node.pattern, "u"); } catch (error) { issue(issues, "SCHEMA_PATTERN_INVALID", `${location}.pattern`, error.message); } }
  if (Object.hasOwn(node, "oneOf") && (!Array.isArray(node.oneOf) || node.oneOf.length < 1)) issue(issues, "SCHEMA_ONE_OF_INVALID", `${location}.oneOf`, "oneOf must be non-empty");
  if (Object.hasOwn(node, "oneOf") && Object.keys(node).some((key) => key !== "oneOf")) {
    issue(issues, "SCHEMA_ONE_OF_SIBLING_FORBIDDEN", location, "the supported strict subset requires oneOf-only nodes");
  }
  if (Object.hasOwn(node, "$defs") && !isRecord(node.$defs)) issue(issues, "SCHEMA_DEFS_INVALID", `${location}.$defs`, "$defs must be an object");
  if (Object.hasOwn(node, "properties") && !isRecord(node.properties)) issue(issues, "SCHEMA_PROPERTIES_INVALID", `${location}.properties`, "properties must be an object");
  if (Object.hasOwn(node, "required") && (!Array.isArray(node.required) || node.required.some((key) => typeof key !== "string"))) {
    issue(issues, "SCHEMA_REQUIRED_INVALID", `${location}.required`, "required must be a string array");
  }
  const objectConstraints = Object.hasOwn(node, "properties") || Object.hasOwn(node, "required") || Object.hasOwn(node, "additionalProperties");
  if (objectConstraints && !types.includes("object")) issue(issues, "SCHEMA_OBJECT_TYPE_MISSING", location, "object constraints require type=object");
  if (types.includes("object")) {
    if (!isRecord(node.properties) || !Array.isArray(node.required)) issue(issues, "SCHEMA_OBJECT_UNDECLARED", location, "object schema must declare properties and required");
    else if (!deepEqual(Object.keys(node.properties).sort(compareText), [...new Set(node.required)].sort(compareText)) || new Set(node.required).size !== node.required.length) {
      issue(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "all properties must be required exactly once");
    }
    if (node.additionalProperties !== false) issue(issues, "SCHEMA_OBJECT_OPEN", location, "object schema must be closed");
  }
  const arrayConstraints = Object.hasOwn(node, "items") || Object.hasOwn(node, "minItems") || Object.hasOwn(node, "maxItems") || Object.hasOwn(node, "uniqueItems");
  if (arrayConstraints && !types.includes("array")) issue(issues, "SCHEMA_ARRAY_TYPE_MISSING", location, "array constraints require type=array");
  if (types.includes("array") && !isRecord(node.items)) issue(issues, "SCHEMA_ARRAY_OPEN", location, "array schema requires object items");
  if (isRecord(node.properties)) for (const [key, child] of Object.entries(node.properties)) inspectSchemaNode(child, issues, `${location}.properties.${key}`, root);
  if (isRecord(node.$defs)) for (const [key, child] of Object.entries(node.$defs)) inspectSchemaNode(child, issues, `${location}.$defs.${key}`, root);
  if (isRecord(node.items)) inspectSchemaNode(node.items, issues, `${location}.items`, root);
  if (Array.isArray(node.oneOf)) node.oneOf.forEach((child, index) => inspectSchemaNode(child, issues, `${location}.oneOf[${index}]`, root));
}

export function inspectSlice06Schema(schema, location = "$schema") {
  const issues = [];
  if (!isRecord(schema)) return [{ code: "SCHEMA_ROOT_INVALID", location, message: "schema root must be an object" }];
  inspectSchemaNode(schema, issues, location, schema);
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") issue(issues, "SCHEMA_DIALECT_INVALID", `${location}.$schema`, "Draft 2020-12 is required");
  if (typeof schema.$id !== "string" || !schema.$id.startsWith("https://single-image-studio.invalid/research/slice-06/schemas/")) {
    issue(issues, "SCHEMA_ID_INVALID", `${location}.$id`, "schema ID must use the Slice 06 namespace");
  }
  return issues;
}

function typeMatches(value, type) {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  return type === "null" && value === null;
}
function validUtc(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function validateSlice06SchemaInstance(value, schema, location = "$") {
  const errors = [];
  const visit = (instance, node, where, root, sink = errors) => {
    if (!isRecord(node)) { sink.push({ location: where, message: "schema node is not an object" }); return; }
    if (typeof node.$ref === "string") {
      const target = node.$ref.startsWith("#/$defs/") ? root.$defs?.[node.$ref.slice(8)] : null;
      if (!target) sink.push({ location: where, message: `unresolved ${node.$ref}` });
      else visit(instance, target, where, root, sink);
      return;
    }
    if (Array.isArray(node.oneOf)) {
      const matches = node.oneOf.filter((branch) => { const branchErrors = []; visit(instance, branch, where, root, branchErrors); return branchErrors.length === 0; }).length;
      if (matches !== 1) sink.push({ location: where, message: `must match exactly one oneOf branch; matched ${matches}` });
      return;
    }
    if (Object.hasOwn(node, "const") && !deepEqual(instance, node.const)) sink.push({ location: where, message: `must equal ${JSON.stringify(node.const)}` });
    if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(instance, candidate))) sink.push({ location: where, message: "must match enum" });
    const types = schemaTypes(node);
    if (types.length > 0 && !types.some((type) => typeMatches(instance, type))) { sink.push({ location: where, message: `must have type ${types.join("|")}` }); return; }
    if (typeof instance === "string") {
      if (Number.isInteger(node.minLength) && instance.length < node.minLength) sink.push({ location: where, message: "string too short" });
      if (Number.isInteger(node.maxLength) && instance.length > node.maxLength) sink.push({ location: where, message: "string too long" });
      if (typeof node.pattern === "string" && !new RegExp(node.pattern, "u").test(instance)) sink.push({ location: where, message: `must match ${node.pattern}` });
      if (node.format === "date-time" && !validUtc(instance)) sink.push({ location: where, message: "must be exact UTC" });
    }
    if (typeof instance === "number" && Number.isFinite(instance)) {
      if (typeof node.minimum === "number" && instance < node.minimum) sink.push({ location: where, message: `must be >= ${node.minimum}` });
      if (typeof node.maximum === "number" && instance > node.maximum) sink.push({ location: where, message: `must be <= ${node.maximum}` });
    }
    if (Array.isArray(instance)) {
      if (Number.isInteger(node.minItems) && instance.length < node.minItems) sink.push({ location: where, message: "array too short" });
      if (Number.isInteger(node.maxItems) && instance.length > node.maxItems) sink.push({ location: where, message: "array too long" });
      if (node.uniqueItems === true && new Set(instance.map((entry) => JSON.stringify(stableValue(entry)))).size !== instance.length) sink.push({ location: where, message: "array items must be unique" });
      if (isRecord(node.items)) instance.forEach((entry, index) => visit(entry, node.items, `${where}[${index}]`, root, sink));
    }
    if (isRecord(instance)) {
      const properties = isRecord(node.properties) ? node.properties : {};
      for (const required of node.required ?? []) if (!Object.hasOwn(instance, required)) sink.push({ location: `${where}.${required}`, message: "is required" });
      if (node.additionalProperties === false) for (const key of Object.keys(instance)) if (!Object.hasOwn(properties, key)) sink.push({ location: `${where}.${key}`, message: "is not allowed" });
      for (const [key, child] of Object.entries(properties)) if (Object.hasOwn(instance, key)) visit(instance[key], child, `${where}.${key}`, root, sink);
    }
  };
  visit(value, schema, location, schema);
  return errors;
}

export async function listSlice06Tree(root) {
  const resolvedRoot = path.resolve(root);
  const issues = [];
  const files = [];
  const directories = [];
  async function walk(directory, base) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { issue(issues, "DIRECTORY_READ_FAILED", base || ".", error.message); return; }
    for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
      const relative = base ? `${base}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      let stats;
      try { stats = await lstat(absolute); } catch (error) { issue(issues, "FILESYSTEM_STAT_FAILED", relative, error.message); continue; }
      if (stats.isSymbolicLink()) issue(issues, "SYMLINK_FORBIDDEN", relative, "symlinks and junctions are forbidden");
      else if (stats.isDirectory()) { directories.push(relative); await walk(absolute, relative); }
      else if (stats.isFile()) files.push(relative);
      else issue(issues, "FILESYSTEM_ENTRY_FORBIDDEN", relative, "only real regular files/directories are allowed");
    }
  }
  try {
    const stats = await lstat(resolvedRoot);
    if (stats.isSymbolicLink() || !stats.isDirectory()) issue(issues, "SLICE_ROOT_INVALID", ".", "Slice 06 root must be a real directory");
    else await walk(resolvedRoot, "");
  } catch (error) { issue(issues, "SLICE_ROOT_STAT_FAILED", ".", error.message); }
  files.sort(compareText); directories.sort(compareText);
  return { root: resolvedRoot, files, directories, issues };
}

export async function fileRecordSlice06(root, relativePath) {
  const bytes = await readFile(path.join(root, ...relativePath.split("/")));
  return { path: normalizeRelative(relativePath), byteLength: bytes.byteLength, sha256: sha256Slice06Validation(bytes) };
}
export function digestSlice06FileRecords(records) {
  const digest = createHash("sha256");
  for (const record of [...records].sort((a, b) => compareText(a.path, b.path))) {
    digest.update(Buffer.from(record.path, "utf8")); digest.update(NUL);
    digest.update(Buffer.from(String(record.byteLength), "ascii")); digest.update(NUL);
    digest.update(Buffer.from(record.sha256, "ascii")); digest.update(NUL);
  }
  return digest.digest("hex");
}
export async function digestSlice06Tree(root, files) {
  const records = [];
  for (const relativePath of [...files].sort(compareText)) records.push(await fileRecordSlice06(root, relativePath));
  return { records, sha256: digestSlice06FileRecords(records) };
}
export async function compareSlice06TreesByteForByte(leftRoot, rightRoot) {
  const [left, right] = await Promise.all([listSlice06Tree(leftRoot), listSlice06Tree(rightRoot)]);
  const issues = [...left.issues, ...right.issues];
  if (!deepEqual(left.files, right.files)) issue(issues, "REGEN_FILE_SET_MISMATCH", ".", "regenerated file sets differ");
  if (!deepEqual(left.directories, right.directories)) issue(issues, "REGEN_DIRECTORY_SET_MISMATCH", ".", "regenerated directory sets differ");
  for (const relativePath of left.files.filter((entry) => right.files.includes(entry))) {
    const [a, b] = await Promise.all([readFile(path.join(left.root, ...relativePath.split("/"))), readFile(path.join(right.root, ...relativePath.split("/")))]);
    if (!a.equals(b)) issue(issues, "REGEN_BYTES_MISMATCH", relativePath, "regenerated bytes differ");
  }
  return issues;
}

function safeRelativePath(value) { return typeof value === "string" && SAFE_RELATIVE_PATTERN.test(value) && !value.includes("//"); }
function isInside(base, candidate) {
  const relative = path.relative(path.resolve(base), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
async function assertRealRegularFile(base, relativePath) {
  if (!safeRelativePath(relativePath)) throw new Error(`unsafe relative path: ${String(relativePath)}`);
  const absolute = path.resolve(base, ...relativePath.split("/"));
  if (!isInside(base, absolute)) throw new Error(`path escapes root: ${relativePath}`);
  let cursor = path.resolve(base);
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    const stats = await lstat(cursor);
    if (stats.isSymbolicLink()) throw new Error(`symlink/junction forbidden: ${relativePath}`);
    if (index < segments.length - 1 && !stats.isDirectory()) throw new Error(`non-directory path segment: ${relativePath}`);
    if (index === segments.length - 1 && !stats.isFile()) throw new Error(`not a regular file: ${relativePath}`);
  }
  const [resolvedBase, resolvedFile] = await Promise.all([realpath(base), realpath(absolute)]);
  if (!isInside(resolvedBase, resolvedFile)) throw new Error(`resolved path escapes root: ${relativePath}`);
  return { absolute, resolvedFile };
}
async function readCanonicalJson(root, relativePath) {
  const { absolute } = await assertRealRegularFile(root, relativePath);
  const bytes = await readFile(absolute);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd")) throw new Error("not strict UTF-8 JSON");
  const value = JSON.parse(text);
  if (!isRecord(value)) throw new Error("JSON root must be an object");
  if (stableStringifySlice06Validation(value) !== text) throw new Error("JSON is not canonical stable JSON with one LF");
  return { value, bytes, fileSha256: sha256Slice06Validation(bytes) };
}

function addThrownIssue(issues, code, location, error) { issue(issues, code, location, error instanceof Error ? error.message : String(error)); }
function checkLiteral(issues, code, location, actual, expected, requirePins) {
  if (expected === null || expected === undefined) { if (requirePins) issue(issues, "DEFINITION_PIN_MISSING", location, "production pin is not frozen"); }
  else if (actual !== expected) issue(issues, code, location, `${actual} != ${expected}`);
}

async function inspectSlice05ClosedLineage(projectRoot, issues) {
  const slice05Root = path.join(projectRoot, "research", "slice-05");
  const resultRoot = path.join(slice05Root, "results", "open-smoke");
  const definitionTree = await listSlice06Tree(slice05Root);
  issues.push(...definitionTree.issues.map((entry) => ({ ...entry, location: `research/slice-05/${entry.location}` })));
  const definitionFiles = definitionTree.files.filter((relativePath) => relativePath !== "results" && !relativePath.startsWith("results/"));
  const definitionDirectories = definitionTree.directories.filter((relativePath) => relativePath !== "results" && !relativePath.startsWith("results/"));
  const definitionDigest = await digestSlice06Tree(slice05Root, definitionFiles);
  const definitionTotalBytes = definitionDigest.records.reduce((sum, record) => sum + record.byteLength, 0);
  const schemaFiles = definitionFiles.filter((relativePath) => relativePath.startsWith("schemas/"));
  const schemaDigest = await digestSlice06Tree(slice05Root, schemaFiles);
  if (definitionDigest.sha256 !== SLICE06_LINEAGE_PINS.slice05DefinitionFullTreeSha256
    || definitionFiles.length !== 368 || definitionDirectories.length !== 36) {
    issue(issues, "S05_DEFINITION_LINEAGE_DRIFT", "research/slice-05", `${definitionDigest.sha256}/${definitionFiles.length}/${definitionDirectories.length}`);
  }

  const resultTree = await listSlice06Tree(resultRoot);
  issues.push(...resultTree.issues.map((entry) => ({ ...entry, location: `research/slice-05/results/open-smoke/${entry.location}` })));
  const resultDigest = await digestSlice06Tree(resultRoot, resultTree.files);
  const resultTotalBytes = resultDigest.records.reduce((sum, record) => sum + record.byteLength, 0);
  if (resultDigest.sha256 !== SLICE06_LINEAGE_PINS.slice05ResultTreeSha256
    || resultTree.files.length !== 116 || resultTree.directories.length !== 8 || resultTotalBytes !== 357303) {
    issue(issues, "S05_RESULT_LINEAGE_DRIFT", "research/slice-05/results/open-smoke", `${resultDigest.sha256}/${resultTree.files.length}/${resultTree.directories.length}/${resultTotalBytes}`);
  }
  if (resultTree.files.some((relativePath) => /(?:^|\/)(?:artifacts|artifact|oracle)(?:\/|$)/iu.test(relativePath))) {
    issue(issues, "S05_RESULT_ARTIFACT_HISTORY_DRIFT", "research/slice-05/results/open-smoke", "closed Slice 05 must retain zero published artifact/oracle paths");
  }
  try {
    await lstat(path.join(slice05Root, "results", "open-calibration"));
    issue(issues, "S05_CALIBRATION_HISTORY_DRIFT", "research/slice-05/results/open-calibration", "Slice 05 calibration must remain absent");
  } catch (error) {
    if (error?.code !== "ENOENT") addThrownIssue(issues, "S05_CALIBRATION_HISTORY_INVALID", "research/slice-05/results/open-calibration", error);
  }

  const ledgerRelativePath = "ledger/events.ndjson";
  let ledgerTail = null;
  let ledgerByteLength = null;
  try {
    const ledgerBytes = await readFile(path.join(resultRoot, ...ledgerRelativePath.split("/")));
    ledgerByteLength = ledgerBytes.byteLength;
    if (sha256Slice06Validation(ledgerBytes) !== SLICE06_LINEAGE_PINS.slice05LedgerFileSha256) {
      issue(issues, "S05_LEDGER_FILE_DRIFT", `research/slice-05/results/open-smoke/${ledgerRelativePath}`, "ledger bytes differ from the closed run");
    }
    const text = ledgerBytes.toString("utf8");
    if (!text.endsWith("\n")) throw new Error("ledger lacks terminal LF");
    const lines = text.slice(0, -1).split("\n");
    if (lines.length !== 72) issue(issues, "S05_LEDGER_EVENT_COUNT_DRIFT", ledgerRelativePath, `${lines.length} != 72`);
    let previous = "0".repeat(64);
    for (const [index, line] of lines.entries()) {
      const event = JSON.parse(line);
      if (JSON.stringify(stableValue(event)) !== line || event.sequence !== index + 1 || event.previousEventHash !== previous
        || event.contentHash !== contentHashSlice06Validation(event)) {
        issue(issues, "S05_LEDGER_CHAIN_DRIFT", `${ledgerRelativePath}[${index}]`, "closed Slice 05 ledger chain is invalid");
      }
      previous = event.contentHash;
      ledgerTail = event.contentHash;
    }
    if (ledgerTail !== SLICE06_LINEAGE_PINS.slice05LedgerTailContentHash) issue(issues, "S05_LEDGER_TAIL_DRIFT", ledgerRelativePath, String(ledgerTail));
  } catch (error) { addThrownIssue(issues, "S05_LEDGER_INVALID", ledgerRelativePath, error); }

  const outcomeRecords = [
    {
      path: "summaries/normalize.smoke-summary.slice05.v0.json", idField: "summaryId", operation: "normalize",
      contentHash: SLICE06_LINEAGE_PINS.normalizeSummaryContentHash, fileSha256: SLICE06_LINEAGE_PINS.normalizeSummaryFileSha256,
      status: "non-pass", pass: 6, nonPass: 12,
    },
    {
      path: "summaries/export.smoke-summary.slice05.v0.json", idField: "summaryId", operation: "export",
      contentHash: SLICE06_LINEAGE_PINS.exportSummaryContentHash, fileSha256: SLICE06_LINEAGE_PINS.exportSummaryFileSha256,
      status: "non-pass", pass: 9, nonPass: 9,
    },
    {
      path: "decisions/normalize.gate-b-decision.slice05.v0.json", idField: "decisionId", operation: "normalize",
      contentHash: SLICE06_LINEAGE_PINS.normalizeDecisionContentHash, fileSha256: SLICE06_LINEAGE_PINS.normalizeDecisionFileSha256,
      decision: "denied-not-entered",
    },
    {
      path: "decisions/export.gate-b-decision.slice05.v0.json", idField: "decisionId", operation: "export",
      contentHash: SLICE06_LINEAGE_PINS.exportDecisionContentHash, fileSha256: SLICE06_LINEAGE_PINS.exportDecisionFileSha256,
      decision: "denied-not-entered",
    },
  ];
  const outcomeRefs = {};
  for (const expected of outcomeRecords) {
    try {
      const parsed = await readCanonicalJson(resultRoot, expected.path);
      const record = parsed.value;
      if (record.contentHash !== contentHashSlice06Validation(record) || record.contentHash !== expected.contentHash
        || parsed.fileSha256 !== expected.fileSha256 || record.operation !== expected.operation) {
        issue(issues, "S05_OUTCOME_RECORD_DRIFT", expected.path, "summary/decision bytes, self-hash, or operation differ");
      }
      if (expected.status && (record.overallStatus !== expected.status
        || record.passAttemptCount !== expected.pass || record.nonPassAttemptCount !== expected.nonPass
        || record.registeredAttemptCount !== 18 || record.recordedAttemptCount !== 18)) {
        issue(issues, "S05_SUMMARY_FACT_DRIFT", expected.path, "closed summary counts/status differ");
      }
      if (expected.decision && (record.decision !== expected.decision || record.calibrationAuthorized !== false)) {
        issue(issues, "S05_DECISION_FACT_DRIFT", expected.path, "Gate B decision/calibration boundary differs");
      }
      outcomeRefs[expected.path] = {
        path: `research/slice-05/results/open-smoke/${expected.path}`,
        id: record[expected.idField], contentHash: record.contentHash,
        byteLength: parsed.bytes.byteLength, fileSha256: parsed.fileSha256,
      };
    } catch (error) { addThrownIssue(issues, "S05_OUTCOME_RECORD_INVALID", expected.path, error); }
  }
  let definitionIndexRef = null;
  let descendantTree = null;
  try {
    const parsed = await readCanonicalJson(slice05Root, "definition-index.v0.5.0.json");
    const record = parsed.value;
    if (record.contentHash !== contentHashSlice06Validation(record)
      || record.contentHash !== SLICE06_LINEAGE_PINS.slice05DefinitionIndexContentHash
      || parsed.fileSha256 !== SLICE06_LINEAGE_PINS.slice05DefinitionIndexFileSha256) {
      issue(issues, "S05_DEFINITION_INDEX_LINEAGE_DRIFT", "research/slice-05/definition-index.v0.5.0.json", "definition index identity drifted");
    }
    definitionIndexRef = {
      path: "research/slice-05/definition-index.v0.5.0.json", id: record.definitionIndexId,
      contentHash: record.contentHash, byteLength: parsed.bytes.byteLength, fileSha256: parsed.fileSha256,
    };
    if (!Array.isArray(record.machineTree?.files)) {
      issue(issues, "S05_DESCENDANT_TREE_INVALID", "research/slice-05/definition-index.v0.5.0.json.machineTree.files", "machine files must be an array");
    } else {
      const paths = record.machineTree.files.map((entry) => entry?.path);
      if (paths.some((relativePath) => !safeRelativePath(relativePath)) || new Set(paths).size !== paths.length) {
        issue(issues, "S05_DESCENDANT_PATH_SET_INVALID", "research/slice-05/definition-index.v0.5.0.json.machineTree.files", "machine paths must be safe and unique");
      } else {
        const actual = await digestSlice06Tree(slice05Root, paths);
        const totalBytes = actual.records.reduce((sum, entry) => sum + entry.byteLength, 0);
        for (const [position, descriptor] of record.machineTree.files.entries()) {
          const file = actual.records.find(({ path: relativePath }) => relativePath === descriptor.path);
          if (!file || descriptor.byteLength !== file.byteLength || descriptor.fileSha256 !== file.sha256) {
            issue(issues, "S05_DESCENDANT_FILE_DRIFT", `research/slice-05/definition-index.v0.5.0.json.machineTree.files[${position}]`, String(descriptor.path));
          }
        }
        if (record.machineTree.fileCount !== paths.length || record.machineTree.sha256 !== actual.sha256) {
          issue(issues, "S05_DESCENDANT_TREE_DRIFT", "research/slice-05/definition-index.v0.5.0.json.machineTree", `${actual.sha256}/${paths.length}`);
        }
        descendantTree = { fileCount: paths.length, directoryCount: 0, totalBytes, sha256: actual.sha256 };
      }
    }
  } catch (error) { addThrownIssue(issues, "S05_DEFINITION_INDEX_LINEAGE_INVALID", "research/slice-05/definition-index.v0.5.0.json", error); }
  return {
    definitionIndexRef,
    outcomeRefs,
    definitionTree: { fileCount: definitionFiles.length, directoryCount: definitionDirectories.length, totalBytes: definitionTotalBytes, sha256: definitionDigest.sha256 },
    schemaTree: {
      fileCount: schemaFiles.length, directoryCount: 0,
      totalBytes: schemaDigest.records.reduce((sum, record) => sum + record.byteLength, 0), sha256: schemaDigest.sha256,
    },
    descendantTree,
    resultTree: { fileCount: resultTree.files.length, directoryCount: resultTree.directories.length, totalBytes: resultTotalBytes, sha256: resultDigest.sha256 },
    ledger: { path: "research/slice-05/results/open-smoke/ledger/events.ndjson", byteLength: ledgerByteLength, fileSha256: SLICE06_LINEAGE_PINS.slice05LedgerFileSha256, eventCount: 72, tailContentHash: ledgerTail },
  };
}

const MACHINE_ID_FIELDS = Object.freeze({
  "closure-lineage.slice06.v0": "closureLineageId",
  "runtime-attestation.slice06.v0": "runtimeAttestationId",
  "hardware-observation.slice06.v0": "hardwareProfileId",
  "candidate-lock.slice06.v0": "candidateLockId",
  "capability-contract.slice06.v0": "contractId",
  "diagnostic-plan.slice06.v0": "diagnosticPlanId",
  "diagnostic-preregistration.slice06.v0": "preregistrationId",
  "rights-record.slice06.v0": "rightsRecordId",
  "retention-policy.slice06.v0": "retentionPolicyId",
  "fixture-lineage.slice06.v0": "sourceLineageId",
  "diagnostic-manifest.slice06.v0": "manifestId",
  "error-registry.slice06.v0": "errorRegistryId",
  "definition-index.slice06.v0": "definitionIndexId",
});

const MACHINE_SCHEMA_PATH_BY_VERSION = Object.freeze(Object.fromEntries(
  Object.entries(SLICE06_MACHINE_SCHEMA_DOCUMENTS).map(([schemaPath, schema]) => [schema.properties.schemaVersion.const, schemaPath]),
));

const EXPECTED_IMPLEMENTATION_ROLES = Object.freeze([
  Object.freeze({ role: "candidate-adapter", key: "adapter", path: "scripts/research-diagnostic-adapter-slice06.mjs" }),
  Object.freeze({ role: "candidate-worker", key: "worker", path: "scripts/research-sharp-worker-slice06.mjs" }),
  Object.freeze({ role: "independent-diagnostic-oracle", key: "oracle", path: "scripts/research-diagnostic-png-oracle-slice06.mjs" }),
  Object.freeze({ role: "local-diagnostic-runner", key: "runner", path: "scripts/research-run-slice06.mjs" }),
  Object.freeze({ role: "registered-diagnostic-driver", key: "driver", path: "scripts/research-execute-slice06.mjs" }),
  Object.freeze({ role: "definition-generator", key: "generator", path: "scripts/research-generate-slice06.mjs" }),
  Object.freeze({ role: "runtime-inventory-lineage", key: "inventory", path: "scripts/research-inventory-sharp-slice05.mjs" }),
  Object.freeze({ role: "regression-material-decoder", key: "regressionDecoder", path: "scripts/research-independent-png-oracle-slice05.mjs" }),
]);

const EXPECTED_RESULT_ALLOWLIST = Object.freeze([
  "runs/(normalize|export).registered-run.json",
  "requests/<sha256>.request.json",
  "claims/<sha256>.claim.json",
  "ledger/(normalize|export).ndjson",
  "records/<sha256>.result.json",
  "specimens/<operation>/<source>/r<1-3>/<five-role-closure>",
  "quarantine/<operation>/<source>/r<1-3>/<five-role-closure>",
  "failures/<operation>/<source>/r<1-3>/<three-role-closure>",
  "summaries/(normalize|export).diagnostic-summary.slice06.v0.json",
  "closes/(normalize|export).characterization-close.slice06.v0.json",
]);

const EXPECTED_INITIAL_RESULT_STATE = Object.freeze({
  resultsDirectoryPresent: false,
  resultFilesPresent: 0,
  ledgersPresent: 0,
  summariesPresent: 0,
  closeRecordsPresent: 0,
  specimensPresent: 0,
  quarantinePresent: 0,
});

const EXPECTED_DIAGNOSTIC_STOP_RULES = Object.freeze([
  Object.freeze({ code: "S06_DEFINITION_DRIFT", condition: "any definition, implementation, runtime, source, gold, schema, plan, preregistration, manifest or commit pin differs", disposition: "seal-and-version-bump" }),
  Object.freeze({ code: "S06_REGISTERED_DENOMINATOR_INVALID", condition: "registered source or repetition denominator differs from four by three", disposition: "protocol-failed" }),
  Object.freeze({ code: "S06_PUBLICATION_RECONCILIATION_UNKNOWN", condition: "durable closure publication cannot be reconciled", disposition: "inconclusive" }),
  Object.freeze({ code: "S06_WORKER_RECONCILIATION_UNKNOWN", condition: "worker exit identity cannot be confirmed", disposition: "inconclusive" }),
  Object.freeze({ code: "S06_DIAGNOSTIC_CLOSURE_INVALID", condition: "bytes, worker observation, oracle child codes or envelope closure is incomplete", disposition: "protocol-failed" }),
  Object.freeze({ code: "S06_EXECUTION_PROTOCOL_FAILED", condition: "execution leaves the closed protocol", disposition: "protocol-failed" }),
  Object.freeze({ code: "S06_PREFLIGHT_FALSE_ALLOW", condition: "a preflight sentinel reaches candidate execution", disposition: "protocol-failed" }),
  Object.freeze({ code: "S06_STOP_RULE_TRIGGERED", condition: "one prior attempt activates the one-version stop rule", disposition: "inconclusive" }),
]);

const UNVERSIONED_PROTOCOL_SCHEMA_FALLBACKS = Object.freeze({
  workerObservation: Object.freeze({
    path: "schemas/worker-observation.slice06.v0.schema.json",
    schemaVersion: "worker-observation.slice06.v0",
  }),
  closurePublication: Object.freeze({
    path: "schemas/five-role-publication.slice06.v0.schema.json",
    schemaVersion: "five-role-publication.slice06.v0",
  }),
});

function sourceWrapperPath(spec) { return `sources/${spec.operation}-diagnostic/${spec.sourceId}.json`; }
function expectedMachineRecordPaths() {
  return [
    SLICE06_DEFINITION_PATHS.closureLineage,
    SLICE06_DEFINITION_PATHS.runtime,
    SLICE06_DEFINITION_PATHS.hardware,
    SLICE06_DEFINITION_PATHS.candidate,
    SLICE06_DEFINITION_PATHS.normalizeContract,
    SLICE06_DEFINITION_PATHS.exportContract,
    SLICE06_DEFINITION_PATHS.normalizePlan,
    SLICE06_DEFINITION_PATHS.exportPlan,
    SLICE06_DEFINITION_PATHS.normalizePreregistration,
    SLICE06_DEFINITION_PATHS.exportPreregistration,
    SLICE06_DEFINITION_PATHS.rights,
    SLICE06_DEFINITION_PATHS.retention,
    SLICE06_DEFINITION_PATHS.errorRegistry,
    SLICE06_DEFINITION_PATHS.normalizeManifest,
    SLICE06_DEFINITION_PATHS.exportManifest,
    ...SLICE06_SOURCE_SPECS.map(sourceWrapperPath),
  ].sort(compareText);
}

function classifyDefinitionPath(relativePath) {
  if (relativePath.startsWith("schemas/")) return "schema";
  if (relativePath === SLICE06_DEFINITION_PATHS.closureLineage) return "closure-lineage";
  if (relativePath === SLICE06_DEFINITION_PATHS.runtime) return "runtime-attestation";
  if (relativePath === SLICE06_DEFINITION_PATHS.hardware) return "hardware-observation";
  if (relativePath === SLICE06_DEFINITION_PATHS.candidate) return "candidate-lock";
  if (new Set([SLICE06_DEFINITION_PATHS.normalizeContract, SLICE06_DEFINITION_PATHS.exportContract]).has(relativePath)) return "capability-contract";
  if (new Set([SLICE06_DEFINITION_PATHS.normalizePlan, SLICE06_DEFINITION_PATHS.exportPlan]).has(relativePath)) return "diagnostic-plan";
  if (new Set([SLICE06_DEFINITION_PATHS.normalizePreregistration, SLICE06_DEFINITION_PATHS.exportPreregistration]).has(relativePath)) return "diagnostic-preregistration";
  if (relativePath === SLICE06_DEFINITION_PATHS.rights) return "rights-record";
  if (relativePath === SLICE06_DEFINITION_PATHS.retention) return "retention-policy";
  if (relativePath === SLICE06_DEFINITION_PATHS.errorRegistry) return "error-registry";
  if (new Set([SLICE06_DEFINITION_PATHS.normalizeManifest, SLICE06_DEFINITION_PATHS.exportManifest]).has(relativePath)) return "diagnostic-manifest";
  if (SLICE06_SOURCE_SPECS.some((spec) => sourceWrapperPath(spec) === relativePath)) return "fixture-lineage";
  return null;
}

function expectedRootForReference(projectRoot, sliceRoot, relativePath) {
  if (relativePath === "package.json" || relativePath === "package-lock.json" || relativePath.startsWith("research/")
    || relativePath.startsWith("scripts/") || relativePath.startsWith("node_modules/")) return projectRoot;
  return sliceRoot;
}

function embeddedMaterialForbidden(bytes) {
  const text = bytes.toString("utf8");
  const forbidden = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /\bAKIA[0-9A-Z]{16}\b/u,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /data:image\/(?:png|jpeg|webp);base64,/iu,
    /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{256,}={0,2}(?:$|[^A-Za-z0-9+/])/u,
  ];
  return bytes.includes(Buffer.from("89504e470d0a1a0a", "hex")) || forbidden.some((pattern) => pattern.test(text));
}

function validateReadmeBytes(bytes, issues) {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd") || text.includes("\0")) {
    issue(issues, "README_ENCODING_INVALID", SLICE06_DEFINITION_README_PATH, "README must be plain UTF-8 without NUL");
  }
  if (embeddedMaterialForbidden(bytes)) {
    issue(issues, "README_EMBEDDED_MATERIAL_FORBIDDEN", SLICE06_DEFINITION_README_PATH, "README cannot smuggle image bytes, base64 payloads, private keys or credentials");
  }
  const requiredStateLiterals = [
    "definition-frozen", "results-zero", "diagnostic-characterization-not-run",
    "Gate-B-no-authority", "calibration-forbidden", "non-C1", "non-product",
  ];
  if (requiredStateLiterals.some((literal) => !text.includes(literal)) || text.includes("definition-not-frozen")) {
    issue(issues, "README_DEFINITION_STATE_INVALID", SLICE06_DEFINITION_README_PATH, "README must truthfully state frozen/results-zero diagnostic-only status and must not claim the definition is unfrozen");
  }
}

function expectedDirectoriesForFiles(files) {
  const directories = new Set();
  for (const relativePath of files) {
    const parts = relativePath.split("/").slice(0, -1);
    for (let length = 1; length <= parts.length; length += 1) directories.add(parts.slice(0, length).join("/"));
  }
  return [...directories].sort(compareText);
}

async function readDefinitionSnapshot({ sliceRoot, projectRoot, pins, requirePins }) {
  const issues = [];
  const resolvedSliceRoot = path.resolve(sliceRoot);
  const resolvedProjectRoot = path.resolve(projectRoot);
  const tree = await listSlice06Tree(resolvedSliceRoot);
  issues.push(...tree.issues);
  for (const relativePath of [...tree.files, ...tree.directories]) {
    if (/(?:^|\/)(?:results|artifacts|calibration|holdout|formal-holdout|defect-holdout|escape|secret|formal)(?:\/|$)/iu.test(relativePath)) {
      issue(issues, "FORBIDDEN_DEFINITION_PATH", relativePath, "results, artifacts, calibration, formal, holdout, escape and secret material are absent at definition freeze");
    }
  }
  let indexFile;
  try { indexFile = await readCanonicalJson(resolvedSliceRoot, SLICE06_DEFINITION_INDEX_PATH); }
  catch (error) {
    addThrownIssue(issues, "DEFINITION_INDEX_INVALID", SLICE06_DEFINITION_INDEX_PATH, error);
    return { issues, sliceRoot: resolvedSliceRoot, projectRoot: resolvedProjectRoot, tree };
  }
  const index = indexFile.value;
  if (index.contentHash !== contentHashSlice06Validation(index)) issue(issues, "CONTENT_HASH_MISMATCH", `${SLICE06_DEFINITION_INDEX_PATH}.contentHash`, "index self-hash differs");
  checkLiteral(issues, "DEFINITION_FREEZE_MISMATCH", "pins.frozenAt", index.frozenAt, pins.frozenAt, requirePins);
  checkLiteral(issues, "DEFINITION_INDEX_CONTENT_PIN_MISMATCH", "pins.definitionIndexContentHash", index.contentHash, pins.definitionIndexContentHash, requirePins);
  checkLiteral(issues, "DEFINITION_INDEX_FILE_PIN_MISMATCH", "pins.definitionIndexFileSha256", indexFile.fileSha256, pins.definitionIndexFileSha256, requirePins);

  const descriptors = index.machineTree?.files;
  const descriptorByPath = new Map();
  const descriptorRecords = [];
  if (!Array.isArray(descriptors)) issue(issues, "INDEX_MACHINE_FILES_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.machineTree.files`, "machineTree.files must be an array");
  else {
    let previous = null;
    for (const [position, descriptor] of descriptors.entries()) {
      const location = `${SLICE06_DEFINITION_INDEX_PATH}.machineTree.files[${position}]`;
      if (!isRecord(descriptor) || !safeRelativePath(descriptor.path)) { issue(issues, "INDEX_MACHINE_FILE_INVALID", location, "descriptor path is invalid"); continue; }
      if (descriptorByPath.has(descriptor.path)) issue(issues, "INDEX_MACHINE_DUPLICATE_PATH", location, descriptor.path);
      if (previous !== null && compareText(previous, descriptor.path) >= 0) issue(issues, "INDEX_MACHINE_ORDER_INVALID", location, "descriptors must be strictly sorted");
      previous = descriptor.path;
      descriptorByPath.set(descriptor.path, descriptor);
    }
  }
  const exactDescendants = [...SLICE06_EXPECTED_SCHEMA_PATHS, ...expectedMachineRecordPaths()].sort(compareText);
  if (!deepEqual([...descriptorByPath.keys()].sort(compareText), exactDescendants)) {
    issue(issues, "DEFINITION_DESCENDANT_PATH_SET_INVALID", "machineTree.files", "descendants must be exact 26 schemas plus 23 machine records");
  }
  const expectedFiles = [...exactDescendants, SLICE06_DEFINITION_INDEX_PATH, SLICE06_DEFINITION_README_PATH].sort(compareText);
  if (!deepEqual(tree.files, expectedFiles)) issue(issues, "DEFINITION_FILE_ALLOWLIST_MISMATCH", ".", "definition contains missing or extra files of any extension");
  const expectedDirectories = expectedDirectoriesForFiles(expectedFiles);
  if (!deepEqual(tree.directories, expectedDirectories)) issue(issues, "DEFINITION_DIRECTORY_ALLOWLIST_MISMATCH", ".", "definition contains missing, extra or empty directories");

  const jsonByPath = new Map([[SLICE06_DEFINITION_INDEX_PATH, index]]);
  const bytesByPath = new Map([[SLICE06_DEFINITION_INDEX_PATH, indexFile.bytes]]);
  const schemasByPath = new Map();
  for (const relativePath of exactDescendants) {
    const descriptor = descriptorByPath.get(relativePath);
    let bytes;
    try { bytes = await readFile((await assertRealRegularFile(resolvedSliceRoot, relativePath)).absolute); }
    catch (error) { addThrownIssue(issues, "MACHINE_FILE_INVALID", relativePath, error); continue; }
    if (embeddedMaterialForbidden(bytes)) issue(issues, "MACHINE_EMBEDDED_MATERIAL_FORBIDDEN", relativePath, "machine definition cannot embed image payloads, private keys or credential-like secrets");
    bytesByPath.set(relativePath, bytes);
    const actualSha = sha256Slice06Validation(bytes);
    descriptorRecords.push({ path: relativePath, byteLength: bytes.byteLength, sha256: actualSha });
    if (!descriptor) continue;
    if (descriptor.byteLength !== bytes.byteLength) issue(issues, "MACHINE_FILE_LENGTH_MISMATCH", `${relativePath}.byteLength`, `${descriptor.byteLength} != ${bytes.byteLength}`);
    if (descriptor.fileSha256 !== actualSha) issue(issues, "MACHINE_FILE_HASH_MISMATCH", `${relativePath}.fileSha256`, `${descriptor.fileSha256} != ${actualSha}`);
    const expectedClassification = classifyDefinitionPath(relativePath);
    if (descriptor.classification !== expectedClassification) issue(issues, "MACHINE_FILE_CLASSIFICATION_MISMATCH", `${relativePath}.classification`, `${descriptor.classification} != ${expectedClassification}`);
    try {
      const text = bytes.toString("utf8");
      if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd")) throw new Error("not strict UTF-8");
      const record = JSON.parse(text);
      if (!isRecord(record)) throw new Error("JSON root is not an object");
      if (expectedClassification !== "schema" && stableStringifySlice06Validation(record) !== text) throw new Error("record is not canonical stable JSON");
      jsonByPath.set(relativePath, record);
      if (expectedClassification === "schema") schemasByPath.set(relativePath, record);
    } catch (error) { addThrownIssue(issues, "MACHINE_JSON_INVALID", relativePath, error); }
  }
  const descendantTreeSha256 = digestSlice06FileRecords(descriptorRecords);
  if (index.machineTree?.fileCount !== 49 || index.machineTree?.fileCount !== descriptorRecords.length) issue(issues, "MACHINE_TREE_COUNT_MISMATCH", `${SLICE06_DEFINITION_INDEX_PATH}.machineTree.fileCount`, String(index.machineTree?.fileCount));
  if (index.machineTree?.sha256 !== descendantTreeSha256) issue(issues, "MACHINE_TREE_HASH_MISMATCH", `${SLICE06_DEFINITION_INDEX_PATH}.machineTree.sha256`, `${index.machineTree?.sha256} != ${descendantTreeSha256}`);
  checkLiteral(issues, "DESCENDANT_TREE_PIN_MISMATCH", "pins.descendantTreeSha256", descendantTreeSha256, pins.descendantTreeSha256, requirePins);
  const schemaRecords = descriptorRecords.filter(({ path: relativePath }) => relativePath.startsWith("schemas/"));
  const schemaTreeSha256 = digestSlice06FileRecords(schemaRecords);
  checkLiteral(issues, "SCHEMA_TREE_PIN_MISMATCH", "pins.schemaTreeSha256", schemaTreeSha256, pins.schemaTreeSha256, requirePins);

  let readmeFile = null;
  try {
    const bytes = await readFile((await assertRealRegularFile(resolvedSliceRoot, SLICE06_DEFINITION_README_PATH)).absolute);
    readmeFile = { bytes, fileSha256: sha256Slice06Validation(bytes) };
    validateReadmeBytes(bytes, issues);
    checkLiteral(issues, "README_PIN_MISMATCH", "pins.readmeSha256", readmeFile.fileSha256, pins.readmeSha256, requirePins);
  } catch (error) { addThrownIssue(issues, "README_INVALID", SLICE06_DEFINITION_README_PATH, error); }
  const fullTree = await digestSlice06Tree(resolvedSliceRoot, expectedFiles.filter((relativePath) => tree.files.includes(relativePath)));
  checkLiteral(issues, "FULL_TREE_PIN_MISMATCH", "pins.fullTreeSha256", fullTree.sha256, pins.fullTreeSha256, requirePins);
  return {
    issues, sliceRoot: resolvedSliceRoot, projectRoot: resolvedProjectRoot, tree, index, indexFile, descriptorByPath,
    jsonByPath, bytesByPath, schemasByPath, readmeFile, descendantTreeSha256, schemaTreeSha256, fullTreeSha256: fullTree.sha256,
  };
}

function validateSchemasAndInstances(snapshot) {
  const { issues, schemasByPath, jsonByPath } = snapshot;
  if (!deepEqual([...schemasByPath.keys()].sort(compareText), [...SLICE06_EXPECTED_SCHEMA_PATHS].sort(compareText))) {
    issue(issues, "SCHEMA_PATH_SET_INVALID", "schemas", "schema tree must contain exact 26 paths");
  }
  for (const [relativePath, schema] of schemasByPath) {
    issues.push(...inspectSlice06Schema(schema, relativePath));
    if (schema.$id !== `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relativePath)}`) {
      issue(issues, "SCHEMA_FILE_ID_MISMATCH", `${relativePath}.$id`, String(schema.$id));
    }
    const generated = SLICE06_GENERATED_SCHEMA_DOCUMENTS[relativePath];
    if (generated && !deepEqual(schema, generated)) issue(issues, "GENERATED_SCHEMA_SOURCE_DRIFT", relativePath, "materialized schema differs from generator/runner exported source");
    const stableHash = ORACLE_SCHEMA_HASHES[relativePath];
    if (stableHash && sha256Slice06Validation(snapshot.bytesByPath.get(relativePath)) !== stableHash) issue(issues, "STABLE_PROTOCOL_SCHEMA_DRIFT", relativePath, "Phase B stable schema bytes changed");
  }
  for (const [relativePath, record] of jsonByPath) {
    if (schemasByPath.has(relativePath)) continue;
    if (record.contentHash !== contentHashSlice06Validation(record)) issue(issues, "CONTENT_HASH_MISMATCH", `${relativePath}.contentHash`, "record self-hash differs");
    issues.push(...validateSlice06DefinitionBoundary(record, relativePath));
    const schemaPath = MACHINE_SCHEMA_PATH_BY_VERSION[record.schemaVersion];
    if (!schemaPath || !schemasByPath.has(schemaPath)) { issue(issues, "SCHEMA_VERSION_UNKNOWN", `${relativePath}.schemaVersion`, String(record.schemaVersion)); continue; }
    for (const instanceIssue of validateSlice06SchemaInstance(record, schemasByPath.get(schemaPath), relativePath)) {
      issue(issues, "SCHEMA_INSTANCE_INVALID", instanceIssue.location, instanceIssue.message);
    }
  }
}

async function validateFileIdentity({ projectRoot, sliceRoot, ref, location, issues }) {
  if (!safeRelativePath(ref.path)) { issue(issues, "REFERENCE_PATH_UNSAFE", `${location}.path`, String(ref.path)); return null; }
  const root = expectedRootForReference(projectRoot, sliceRoot, ref.path);
  try {
    const bytes = await readFile((await assertRealRegularFile(root, ref.path)).absolute);
    if (Number.isInteger(ref.byteLength) && ref.byteLength !== bytes.byteLength) issue(issues, "REFERENCE_LENGTH_MISMATCH", `${location}.byteLength`, `${ref.byteLength} != ${bytes.byteLength}`);
    const sha = sha256Slice06Validation(bytes);
    if (ref.fileSha256 !== sha) issue(issues, "REFERENCE_FILE_HASH_MISMATCH", `${location}.fileSha256`, `${ref.fileSha256} != ${sha}`);
    return { root, bytes, fileSha256: sha };
  } catch (error) { addThrownIssue(issues, "REFERENCE_FILE_INVALID", location, error); return null; }
}

async function validateReferences(snapshot) {
  const { issues, projectRoot, sliceRoot, jsonByPath, schemasByPath } = snapshot;
  const recordsById = new Map();
  const pathById = new Map();
  for (const [relativePath, record] of jsonByPath) {
    if (schemasByPath.has(relativePath)) continue;
    const idField = MACHINE_ID_FIELDS[record.schemaVersion];
    const id = idField ? record[idField] : null;
    if (typeof id !== "string") { issue(issues, "RECORD_IDENTITY_MISSING", relativePath, String(record.schemaVersion)); continue; }
    if (recordsById.has(id)) issue(issues, "RECORD_IDENTITY_DUPLICATE", relativePath, id);
    recordsById.set(id, record); pathById.set(id, relativePath);
  }
  const graph = new Map([...jsonByPath.keys()].map((relativePath) => [relativePath, new Set()]));
  const externalByPath = new Map();
  const implementationById = new Map();
  for (const [ownerPath, record] of jsonByPath) {
    if (schemasByPath.has(ownerPath)) continue;
    const refs = collectSlice06References(record, ownerPath);
    for (const { location, ref } of [...refs.recordRefs, ...refs.fileRefs]) {
      const actual = await validateFileIdentity({ projectRoot, sliceRoot, ref, location, issues });
      if (!actual || !Object.hasOwn(ref, "id")) continue;
      let target;
      if (actual.root === sliceRoot) {
        target = jsonByPath.get(ref.path);
        if (!target) { issue(issues, "RECORD_REFERENCE_TARGET_INVALID", location, ref.path); continue; }
        graph.get(ownerPath)?.add(ref.path);
      } else {
        if (!externalByPath.has(ref.path)) {
          try { externalByPath.set(ref.path, JSON.parse(actual.bytes.toString("utf8"))); }
          catch (error) { addThrownIssue(issues, "EXTERNAL_RECORD_JSON_INVALID", ref.path, error); continue; }
        }
        target = externalByPath.get(ref.path);
      }
      const idField = MACHINE_ID_FIELDS[target?.schemaVersion]
        ?? ["definitionIndexId", "candidateLockId", "contractId", "rightsRecordId", "runtimeAttestationId", "sourceProvenanceId", "artifactId", "goldRecordId", "summaryId", "decisionId"]
          .find((field) => typeof target?.[field] === "string");
      if (!idField || target[idField] !== ref.id) issue(issues, "RECORD_REFERENCE_ID_MISMATCH", `${location}.id`, `${String(ref.id)} != ${String(target?.[idField])}`);
      if (target?.contentHash !== ref.contentHash || contentHashSlice06Validation(target) !== ref.contentHash) issue(issues, "RECORD_REFERENCE_CONTENT_HASH_MISMATCH", `${location}.contentHash`, String(ref.contentHash));
    }
    for (const { location, ref } of refs.shortRefs) {
      const target = recordsById.get(ref.id);
      if (!target || target.contentHash !== ref.contentHash) issue(issues, "HASH_REFERENCE_INVALID", location, `${ref.id}@${ref.contentHash}`);
    }
    for (const { location, ref } of refs.implementationRefs) {
      if (ref.path === "scripts/research-validate-slice06.mjs" || ref.id === "VALIDATOR-CENTRAL-SLICE06@0.6.0") {
        issue(issues, "CENTRAL_VALIDATOR_SELF_PIN_FORBIDDEN", location, "definition records cannot pin the external central validator");
      }
      const prior = implementationById.get(ref.id);
      if (prior && !deepEqual(prior.ref, ref)) issue(issues, "IMPLEMENTATION_REF_DRIFT", location, ref.id);
      implementationById.set(ref.id, { ref, location });
    }
  }
  const state = new Map();
  const visit = (relativePath, stack = []) => {
    const marker = state.get(relativePath) ?? 0;
    if (marker === 1) { issue(issues, "RECORD_REFERENCE_CYCLE", relativePath, [...stack, relativePath].join(" -> ")); return; }
    if (marker === 2) return;
    state.set(relativePath, 1);
    for (const target of graph.get(relativePath) ?? []) visit(target, [...stack, relativePath]);
    state.set(relativePath, 2);
  };
  for (const relativePath of graph.keys()) visit(relativePath);
  for (const { ref, location } of implementationById.values()) {
    if (!ref.path.startsWith("scripts/")) { issue(issues, "IMPLEMENTATION_PATH_INVALID", `${location}.path`, ref.path); continue; }
    try {
      const actual = sha256Slice06Validation(await readFile((await assertRealRegularFile(projectRoot, ref.path)).absolute));
      if (actual !== ref.implementationSha256) issue(issues, "IMPLEMENTATION_HASH_MISMATCH", `${location}.implementationSha256`, `${ref.implementationSha256} != ${actual}`);
    } catch (error) { addThrownIssue(issues, "IMPLEMENTATION_FILE_INVALID", location, error); }
  }
  return { recordsById, pathById, graph, externalByPath, implementationById };
}

function expectDeep(issues, code, location, actual, expected) {
  if (!deepEqual(actual, expected)) issue(issues, code, location, `${JSON.stringify(stableValue(actual))} != ${JSON.stringify(stableValue(expected))}`);
}

function recordRefFor(snapshot, relativePath) {
  const record = snapshot.jsonByPath.get(relativePath);
  const descriptor = relativePath === SLICE06_DEFINITION_INDEX_PATH
    ? { byteLength: snapshot.indexFile?.bytes.byteLength, fileSha256: snapshot.indexFile?.fileSha256 }
    : snapshot.descriptorByPath.get(relativePath);
  if (!record || !descriptor || !Number.isInteger(descriptor.byteLength) || !SHA256_PATTERN.test(descriptor.fileSha256)) return null;
  const idField = MACHINE_ID_FIELDS[record.schemaVersion];
  return {
    path: relativePath,
    id: record[idField],
    contentHash: record.contentHash,
    byteLength: descriptor.byteLength,
    fileSha256: descriptor.fileSha256,
  };
}

function treeFact(algorithm, value) {
  if (!value) return null;
  return { algorithm, ...value };
}

function validateIndexAndImplementationSemantics(snapshot, pins, requirePins) {
  const { issues, index, projectRoot } = snapshot;
  if (!isRecord(index)) return;
  if (index.definitionIndexId !== SLICE06_DEFINITION_IDS.definition
    || index.schemaVersion !== "definition-index.slice06.v0" || index.recordVersion !== "0.6.0") {
    issue(issues, "DEFINITION_INDEX_IDENTITY_INVALID", SLICE06_DEFINITION_INDEX_PATH, "definition index identity/version differs");
  }
  expectDeep(issues, "DEFINITION_INDEX_COUNTS_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.counts`, index.counts, {
    schemas: 26, machineRecordsExcludingIndex: 23, manifests: 2, sourceLineageRecords: 8,
    sourceUnits: 8, plannedAttempts: 24, copiedImageBytes: 0, generatedResults: 0,
    formalFixtures: 0, holdoutFixtures: 0, defectHoldoutFixtures: 0, escapeFixtures: 0,
  });
  expectDeep(issues, "DEFINITION_INITIAL_RESULTS_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.initialResultStateAtDefinitionFreeze`, index.initialResultStateAtDefinitionFreeze, EXPECTED_INITIAL_RESULT_STATE);
  expectDeep(issues, "DEFINITION_EXECUTION_ADMISSION_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.executionAdmission`, index.executionAdmission, {
    definitionFrozen: true, resultsZero: true, containingGitCommitMustBePushedBeforeRun: true,
    containingCommitRecordedInDefinition: false, driverMustVerifyHeadAndOrigin: true,
    registeredInvocationPerOperation: 1,
  });
  expectDeep(issues, "DEFINITION_RESULT_PROTOCOL_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.resultProtocol`, index.resultProtocol, {
    canonicalResultsRoot: "research/slice-06/results/open-diagnostic",
    maximumDriverInvocations: 1, plannedRegisteredOperationRuns: 2, plannedSourceUnits: 8, plannedAttempts: 24,
    replacementAttempts: 0,
    globalStop: {
      operationOrder: ["normalize", "export"],
      secondOperationRegistrationRequiresFirstStatus: "characterization-complete",
      firstOperationBlockingStatuses: ["protocol-failed", "inconclusive"],
      actualCountsRecordedOnlyByDriverAfterExecution: true,
    },
    resultAllowlist: [...EXPECTED_RESULT_ALLOWLIST],
  });
  if (["operationInvocations", "driverInvocations", "registeredOperationRuns", "totalSourceUnits", "totalAttempts", "actualSourceUnits", "actualAttempts", "actualRegisteredOperationRuns"]
    .some((key) => Object.hasOwn(index.resultProtocol ?? {}, key))) {
    issue(issues, "DEFINITION_RESULT_PROTOCOL_LEGACY_FIELD", `${SLICE06_DEFINITION_INDEX_PATH}.resultProtocol`, "ambiguous legacy invocation fields are forbidden");
  }
  if (index.definitionState !== "frozen-definition-results-zero-diagnostic-only" || !validUtc(index.frozenAt)) {
    issue(issues, "DEFINITION_STATE_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.definitionState`, "definition must be results-zero, diagnostic-only and exactly timestamped");
  }
  if (index.machineTree?.algorithm !== "sha256(sorted(slice-root-relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))"
    || index.machineTree?.rootSelfExcludedToAvoidCircularHash !== true
    || index.machineTree?.proseReadmeExcludedAndSeparatelyPinned !== true) {
    issue(issues, "DEFINITION_TREE_ALGORITHM_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.machineTree`, "binary-safe descendant digest contract differs");
  }
  if (index.proseReadmeRef?.path !== SLICE06_DEFINITION_README_PATH
    || index.proseReadmeRef?.byteLength !== snapshot.readmeFile?.bytes.byteLength
    || index.proseReadmeRef?.fileSha256 !== snapshot.readmeFile?.fileSha256) {
    issue(issues, "DEFINITION_README_REF_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.proseReadmeRef`, "README exact bytes are not separately pinned");
  }
  if (index.scopeContractRef?.path !== "research/SLICE_06_CONTRACT.md") {
    issue(issues, "DEFINITION_SCOPE_CONTRACT_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.scopeContractRef`, String(index.scopeContractRef?.path));
  }
  for (const [key, relativePath] of [
    ["closureLineageRef", SLICE06_DEFINITION_PATHS.closureLineage],
    ["runtimeAttestationRef", SLICE06_DEFINITION_PATHS.runtime],
    ["hardwareRef", SLICE06_DEFINITION_PATHS.hardware],
    ["candidateRef", SLICE06_DEFINITION_PATHS.candidate],
    ["rightsRef", SLICE06_DEFINITION_PATHS.rights],
    ["retentionPolicyRef", SLICE06_DEFINITION_PATHS.retention],
    ["errorRegistryRef", SLICE06_DEFINITION_PATHS.errorRegistry],
  ]) expectDeep(issues, "INDEX_CORE_REF_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.${key}`, index[key], recordRefFor(snapshot, relativePath));

  const actualRoles = index.implementationRefs;
  if (!Array.isArray(actualRoles) || actualRoles.length !== EXPECTED_IMPLEMENTATION_ROLES.length) {
    issue(issues, "IMPLEMENTATION_ROLE_SET_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.implementationRefs`, "exactly eight implementation roles are required");
    return;
  }
  if (actualRoles.some(({ role, ref }) => role === "central-validator" || ref?.path === "scripts/research-validate-slice06.mjs")) {
    issue(issues, "CENTRAL_VALIDATOR_SELF_PIN_FORBIDDEN", `${SLICE06_DEFINITION_INDEX_PATH}.implementationRefs`, "definition cannot pin its central validator and create a self-reference cycle");
  }
  const expected = EXPECTED_IMPLEMENTATION_ROLES.map(({ role, key, path: expectedPath }) => ({
    role,
    ref: {
      ...SLICE06_IMPLEMENTATION_IDENTITIES[key], path: expectedPath,
      implementationSha256: actualRoles.find((entry) => entry?.role === role)?.ref?.implementationSha256,
    },
  }));
  for (const [position, entry] of expected.entries()) {
    const actual = actualRoles[position];
    if (actual?.role !== entry.role || actual?.ref?.id !== entry.ref.id || actual?.ref?.version !== entry.ref.version || actual?.ref?.path !== entry.ref.path) {
      issue(issues, "IMPLEMENTATION_ROLE_IDENTITY_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.implementationRefs[${position}]`, entry.role);
    }
  }
  const generator = actualRoles.find(({ role }) => role === "definition-generator")?.ref;
  checkLiteral(issues, "GENERATOR_PIN_MISMATCH", "pins.generatorSha256", generator?.implementationSha256, pins.generatorSha256, requirePins);
  if (generator?.path) {
    const absolute = path.join(projectRoot, ...generator.path.split("/"));
    if (!isInside(projectRoot, absolute)) issue(issues, "GENERATOR_PATH_INVALID", generator.path, "generator path escapes project root");
  }
}

function validateClosureLineageSemantics(snapshot, lineage) {
  const { issues } = snapshot;
  const closure = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.closureLineage);
  if (!closure || !lineage) return;
  const expectedCommitPins = {
    slice05ClosureCommit: SLICE06_LINEAGE_PINS.slice05ClosureCommit,
    slice05DefinitionCommit: SLICE06_LINEAGE_PINS.slice05DefinitionCommit,
    slice06ProtocolCommit: SLICE06_LINEAGE_PINS.phaseBProtocolCommit,
    slice06PreviousProtocolBaselineCommit: SLICE06_LINEAGE_PINS.phaseBPreviousProtocolBaselineCommit,
    slice06ScopeCommit: SLICE06_LINEAGE_PINS.slice06ScopeCommit,
  };
  expectDeep(issues, "S05_COMMIT_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.commitPins`, closure.commitPins, expectedCommitPins);
  if (!deepEqual(SLICE06_COMMIT_PINS, expectedCommitPins)) {
    issue(issues, "GENERATOR_COMMIT_PIN_SOURCE_DRIFT", "SLICE06_COMMIT_PINS", "generator-exported commit pins differ from the validator's independent literals");
  }
  if (closure.commitPins?.slice05ClosureCommit !== SLICE06_LINEAGE_PINS.slice05ClosureCommit
    || closure.commitPins?.slice06ProtocolCommit !== SLICE06_LINEAGE_PINS.phaseBProtocolCommit) {
    issue(issues, "S05_COMMIT_PIN_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.commitPins`, "Slice 05 closure and Phase B protocol commits must be exact full SHAs");
  }
  expectDeep(issues, "S05_DEFINITION_REF_REPLAY_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05Definition.definitionRef`, closure.slice05Definition?.definitionRef, lineage.definitionIndexRef);
  const treeAlgorithm = "sha256(sorted(relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))";
  expectDeep(issues, "S05_DESCENDANT_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05Definition.descendantMachineTree`, closure.slice05Definition?.descendantMachineTree, treeFact(treeAlgorithm, lineage.descendantTree));
  expectDeep(issues, "S05_SCHEMA_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05Definition.schemaTree`, closure.slice05Definition?.schemaTree, treeFact(treeAlgorithm, lineage.schemaTree));
  expectDeep(issues, "S05_FULL_DEFINITION_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05Definition.fullDefinitionTree`, closure.slice05Definition?.fullDefinitionTree, treeFact(treeAlgorithm, lineage.definitionTree));
  expectDeep(issues, "S05_RESULT_TREE_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05ResultClosure.resultTree`, closure.slice05ResultClosure?.resultTree, treeFact(treeAlgorithm, lineage.resultTree));
  expectDeep(issues, "S05_LEDGER_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05ResultClosure.ledger`, closure.slice05ResultClosure?.ledger, {
    file: { path: lineage.ledger.path, byteLength: lineage.ledger.byteLength, fileSha256: lineage.ledger.fileSha256 },
    eventCount: lineage.ledger.eventCount, tailContentHash: lineage.ledger.tailContentHash,
  });
  const expectedOperations = ["normalize", "export"].map((operation) => ({
    operation,
    summaryRef: lineage.outcomeRefs[`summaries/${operation}.smoke-summary.slice05.v0.json`],
    decisionRef: lineage.outcomeRefs[`decisions/${operation}.gate-b-decision.slice05.v0.json`],
    decision: "denied-not-entered", calibrationAuthorized: false, historicalOracleChildSubtype: "unknown",
  }));
  expectDeep(issues, "S05_OUTCOME_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.slice05ResultClosure.operations`, closure.slice05ResultClosure?.operations, expectedOperations);
  expectDeep(issues, "S05_CLOSED_FACTS_INVALID", `${SLICE06_DEFINITION_PATHS.closureLineage}.immutableFacts`, closure.immutableFacts, {
    state: "smoke-closed-non-pass", gateB: "denied-not-entered", calibrationAuthorized: false,
    publishedArtifactCount: 0, historicalRequestsMayBeRerun: false, historicalRecordsMayBeRewritten: false,
  });
}

function expectedRuntimeFragments(inventory) {
  return {
    inventoryPayloadSha256: inventory.attestation.payloadSha256,
    packageManifest: {
      path: inventory.packageManifest.path, sha256: inventory.packageManifest.sha256,
      exactDevDependencies: Object.entries(inventory.packageManifest.devDependencies).sort(([left], [right]) => compareText(left, right)).map(([name, version]) => ({ name, version })),
    },
    packageLock: {
      path: inventory.packageLock.path, sha256: inventory.packageLock.sha256,
      expectedSha256: inventory.packageLock.expectedSha256, lockfileVersion: inventory.packageLock.lockfileVersion,
    },
    installedClosure: {
      allowlist: inventory.installed.allowlist, packages: inventory.installed.packages,
      ignoredEmptyScopeDirectories: inventory.installed.ignoredEmptyScopeDirectories,
      fileCount: inventory.installed.tree.fileCount, treeSha256: inventory.installed.tree.sha256,
      nativeArtifacts: inventory.installed.nativeArtifacts,
    },
    versions: {
      installedVersionsJsonSha256: inventory.versions.installedVersionsJson.sha256,
      installedComponentCount: inventory.versions.installedVersionsJson.componentCount,
      sharpRuntimeComponentCount: inventory.versions.sharpRuntime.componentCount,
      sharpVersion: inventory.versions.sharpRuntime.values.sharp,
      matchesInstalledVersionsJson: inventory.versions.sharpRuntime.matchesInstalledVersionsJson,
      packagingMetadataDifferenceCount: inventory.versions.slice04PackagingMetadataComparison.differenceCount,
    },
    expectedWorkerRuntime: {
      sharpVersion: inventory.versions.sharpRuntime.values.sharp,
      nativeVersions: inventory.versions.sharpRuntime.values,
      nodeVersion: inventory.environment.node.version,
      platform: inventory.environment.os.platform,
      architecture: inventory.environment.os.architecture,
      settings: {
        concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0,
        simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
      },
    },
    environment: inventory.environment,
  };
}

function validateRuntimeAndHardwareSemantics(snapshot, inventory) {
  const { issues, index } = snapshot;
  const runtime = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.runtime);
  const hardware = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.hardware);
  const candidate = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.candidate);
  if (!runtime || !hardware || !candidate) return;
  if (runtime.observedCandidateId !== SLICE06_DEFINITION_IDS.candidate
    || (inventory && (runtime.observedCandidateId === inventory.runtimeCandidateId
      || inventory.runtimeCandidateId !== "REG-NORM-SHARP@0.5.0"))) {
    issue(issues, "RUNTIME_CANDIDATE_LINEAGE_INVALID", `${SLICE06_DEFINITION_PATHS.runtime}.observedCandidateId`, "new 0.6 candidate binding must remain distinct from the 0.5 inventory lineage ID");
  }
  if (inventory) {
    const expected = expectedRuntimeFragments(inventory);
    for (const key of Object.keys(expected)) expectDeep(issues, "RUNTIME_FRESH_INVENTORY_DRIFT", `${SLICE06_DEFINITION_PATHS.runtime}.${key}`, runtime[key], expected[key]);
  }
  expectDeep(issues, "RUNTIME_OBSERVATION_BOUNDARY_INVALID", `${SLICE06_DEFINITION_PATHS.runtime}.observationBoundary`, runtime.observationBoundary, {
    freshInventoryRequired: true, sourceSlice05RuntimeRecordReusedAsObservation: false, inventoryHelperReusedReadOnly: true,
  });
  expectDeep(issues, "RUNTIME_EXECUTION_BOUNDARY_INVALID", `${SLICE06_DEFINITION_PATHS.runtime}.executionBoundary`, runtime.executionBoundary, {
    sharpImportedForVersionsOnly: true, imageBytesRead: false, imageDecoded: false, imageEncoded: false,
    candidatePipelineInvoked: false, hostnameRecorded: false, serialRecorded: false,
  });
  if (!deepEqual(hardware.environment, runtime.environment) || hardware.runtimeAttestationRef?.contentHash !== runtime.contentHash
    || hardware.stateAtDefinitionFreeze !== "freshly-observed-and-pinned-not-a-portability-claim"
    || hardware.observedAt !== index.frozenAt) {
    issue(issues, "HARDWARE_FRESH_OBSERVATION_INVALID", SLICE06_DEFINITION_PATHS.hardware, "hardware must be freshly bound to the runtime and freeze timestamp");
  }
  if (candidate.runtimeClosure?.packageLockSha256 !== runtime.packageLock?.sha256
    || candidate.runtimeClosure?.installedTreeSha256 !== runtime.installedClosure?.treeSha256
    || candidate.runtimeClosure?.nativeArtifactCount !== runtime.installedClosure?.nativeArtifacts?.length
    || candidate.runtimeClosure?.installedVersionCount !== runtime.versions?.installedComponentCount) {
    issue(issues, "CANDIDATE_RUNTIME_CLOSURE_INVALID", `${SLICE06_DEFINITION_PATHS.candidate}.runtimeClosure`, "candidate runtime closure does not match the fresh attestation");
  }
}

function validateRightsRetentionCandidateContracts(snapshot) {
  const { issues } = snapshot;
  const rights = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.rights);
  const retention = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.retention);
  const candidate = snapshot.jsonByPath.get(SLICE06_DEFINITION_PATHS.candidate);
  if (rights) {
    expectDeep(issues, "RIGHTS_PROVENANCE_INVALID", `${SLICE06_DEFINITION_PATHS.rights}.provenance`, rights.provenance, {
      containsRealPerson: false, realUserPhotosUsed: false, thirdPartyAssetsUsed: false, modelWeightsUsed: false,
      copiedImageBytes: false, regressionLineageOnly: true,
    });
    if (rights.independenceClaim !== false || rights.permissions?.artifactPublication !== false
      || rights.permissions?.productUseClaim !== false || rights.permissions?.repositoryReference !== true) {
      issue(issues, "RIGHTS_BOUNDARY_INVALID", SLICE06_DEFINITION_PATHS.rights, "rights must authorize only pinned synthetic diagnostic references, never product/artifact claims");
    }
  }
  if (retention) {
    expectDeep(issues, "RETENTION_DISPOSITION_INVALID", `${SLICE06_DEFINITION_PATHS.retention}.disposition`, retention.disposition, {
      oraclePass: "specimens-nonartifact", oracleNonPass: "quarantine-nonartifact", preflightReject: "no-candidate-output",
      overLimit: "hash-only-nonartifact", artifactsDirectoryAllowed: false, catalogPublicationAllowed: false, productDownloadAllowed: false,
    });
    if (retention.rightsRef?.contentHash !== rights?.contentHash || retention.mode !== "open-diagnostic"
      || retention.maxPerOutputBytes !== 1048576 || retention.maxSessionBytes !== 18874368) {
      issue(issues, "RETENTION_POLICY_INVALID", SLICE06_DEFINITION_PATHS.retention, "retention limits or rights binding differ");
    }
  }
  if (candidate) {
    if (candidate.selectionStatus !== "diagnostic-only-not-selected"
      || candidate.stateAtDefinitionFreeze?.execution !== "candidate-pixel-pipeline-not-run-by-definition"
      || candidate.stateAtDefinitionFreeze?.gateB !== "not-entered-diagnostic-only"
      || candidate.stateAtDefinitionFreeze?.calibration !== "not-created-by-scope") {
      issue(issues, "CANDIDATE_BOUNDARY_INVALID", SLICE06_DEFINITION_PATHS.candidate, "candidate remains installed, unselected and unexecuted by definition");
    }
    expectDeep(issues, "CANDIDATE_PROHIBITED_CLAIMS_INVALID", `${SLICE06_DEFINITION_PATHS.candidate}.prohibitedClaims`, candidate.prohibitedClaims,
      ["product-capability", "formal-c1", "gate-b-pass", "holdout-evidence", "release-support"]);
  }
  for (const operation of ["normalize", "export"]) {
    const relativePath = operation === "normalize" ? SLICE06_DEFINITION_PATHS.normalizeContract : SLICE06_DEFINITION_PATHS.exportContract;
    const contract = snapshot.jsonByPath.get(relativePath);
    if (!contract) continue;
    const expectedInputType = operation === "normalize" ? "canonical-png-source-bytes" : "NormalizedImage.slice04.v0";
    const expectedOutputType = operation === "normalize" ? "NormalizedImage.slice04.v0" : "DeliveryArtifact.slice04.v0";
    if (contract.capabilityId !== "CAP-02" || contract.suiteId !== "NORMALIZE-DELIVER" || contract.operation !== operation
      || contract.inputProfile?.type !== expectedInputType || contract.outputProfile?.type !== expectedOutputType
      || contract.implementation?.workerRef?.id !== SLICE06_IMPLEMENTATION_IDENTITIES.worker.id
      || contract.implementation?.passthroughAllowed !== false || contract.implementation?.fallbackAllowed !== false
      || contract.implementation?.imagePipelineExecutedByDefinitionGenerator !== false
      || contract.failureSemantics?.validOutcomeRerunAllowed !== false || contract.failureSemantics?.replacementAttempts !== 0
      || contract.diagnosticPersistence?.artifactPublicationAllowed !== false) {
      issue(issues, "CAPABILITY_CONTRACT_INVALID", relativePath, `${operation} diagnostic contract semantics differ`);
    }
  }
}

function validateErrorRegistrySemantics(snapshot) {
  const { issues } = snapshot;
  const relativePath = SLICE06_DEFINITION_PATHS.errorRegistry;
  const registry = snapshot.jsonByPath.get(relativePath);
  if (!registry) return;
  const codes = registry.registeredCodes;
  if (!Array.isArray(codes) || codes.length < 1 || new Set(codes.map(({ code }) => code)).size !== codes.length
    || !deepEqual(codes.map(({ code }) => code), codes.map(({ code }) => code).sort(compareText))) {
    issue(issues, "ERROR_REGISTRY_SET_INVALID", `${relativePath}.registeredCodes`, "registered codes must be non-empty, unique and strictly sorted");
  }
  for (const code of ["S06_PUBLICATION_RECONCILIATION_UNKNOWN", "S06_WORKER_RECONCILIATION_UNKNOWN"]) {
    const entry = codes?.find((candidate) => candidate.code === code);
    if (!deepEqual(entry, { code, class: "stop", terminalRole: "inconclusive" })) {
      issue(issues, "RECONCILIATION_UNKNOWN_CLASS_INVALID", `${relativePath}.registeredCodes.${code}`, "unknown reconciliation is inconclusive, never a proven protocol failure or pass");
    }
  }
  if (registry.unknownCodeTreatment !== "protocol-failed-or-inconclusive-never-pass"
    || registry.frozenPrecedence?.outputOracleTopLevel !== "S06_OUTPUT_ORACLE_REJECTED-with-exact-child-codes-required") {
    issue(issues, "ERROR_REGISTRY_BOUNDARY_INVALID", relativePath, "unknown/error precedence must remain fail-closed and never pass");
  }
}

function validateSourcesPlansPreregistrationsAndManifests(snapshot, lineage) {
  const { issues, index } = snapshot;
  const seen = new Set();
  const byOperation = { normalize: [], export: [] };
  for (const spec of SLICE06_SOURCE_SPECS) {
    const relativePath = sourceWrapperPath(spec);
    const wrapper = snapshot.jsonByPath.get(relativePath);
    if (!wrapper) continue;
    const ordinal = String(spec.ordinal).padStart(3, "0");
    const expected = {
      sourceId: spec.sourceId,
      sourceFamilyId: `family.s06.${spec.operation}.diagnostic.${ordinal}`,
      captureSessionId: `capture.s06.${spec.operation}.diagnostic.${ordinal}`,
    };
    if (wrapper.sourceLineageId !== `lineage.${spec.sourceId}`) {
      issue(issues, "SOURCE_LINEAGE_IDENTITY_INVALID", `${relativePath}.sourceLineageId`, String(wrapper.sourceLineageId));
    }
    for (const [key, value] of Object.entries(expected)) {
      if (wrapper[key] !== value || seen.has(wrapper[key]) || /\.s05\./u.test(wrapper[key])) {
        issue(issues, "SOURCE_IDENTITY_ISOLATION_INVALID", `${relativePath}.${key}`, String(wrapper[key]));
      }
      seen.add(wrapper[key]);
    }
    if (wrapper.operation !== spec.operation || wrapper.partition !== "diagnostic"
      || wrapper.diagnosticRole !== spec.diagnosticRole || wrapper.expectedDisposition !== spec.expectedDisposition
      || wrapper.expectedStableErrorCode !== spec.expectedStableErrorCode || wrapper.repetitions !== 3 || wrapper.attemptNumber !== 1
      || wrapper.independenceClaim !== false || wrapper.newIndependentSource !== false) {
      issue(issues, "SOURCE_WRAPPER_SEMANTICS_INVALID", relativePath, spec.sourceId);
    }
    if (wrapper.regressionLineageRef?.slice !== "05" || wrapper.regressionLineageRef?.sourceId !== spec.lineageId
      || !deepEqual(wrapper.regressionLineageRef?.definitionRef, lineage?.definitionIndexRef)
      || wrapper.reuseBoundary?.sourceBytesCopied !== false || wrapper.reuseBoundary?.countsAsNewSource !== false
      || wrapper.reuseBoundary?.calibrationEligible !== false || wrapper.reuseBoundary?.holdoutEligible !== false
      || wrapper.reuseBoundary?.c1Eligible !== false) {
      issue(issues, "SOURCE_REGRESSION_LINEAGE_INVALID", `${relativePath}.regressionLineageRef`, spec.lineageId);
    }
    if (wrapper.byteAssetRef?.path?.startsWith("research/slice-05/") !== true
      || (spec.operation === "normalize" ? wrapper.inputArtifactRef !== null : !isRecord(wrapper.inputArtifactRef))
      || (spec.expectedDisposition === "applicable" ? !isRecord(wrapper.goldRef) : wrapper.goldRef !== null)) {
      issue(issues, "SOURCE_BYTE_REFERENCE_INVALID", relativePath, "wrapper must reference, never copy, exact Slice 05 bytes and applicable gold");
    }
    byOperation[spec.operation].push({
      sourceId: spec.sourceId, sourceLineageRef: recordRefFor(snapshot, relativePath), diagnosticRole: spec.diagnosticRole,
      expectedDisposition: spec.expectedDisposition, expectedStableErrorCode: spec.expectedStableErrorCode,
      repetitions: 3, attemptNumber: 1,
    });
  }
  if (seen.size !== 24) issue(issues, "SOURCE_IDENTITY_COUNT_INVALID", "sources", `${seen.size} != 24`);

  const runIdentities = [];
  for (const operation of ["normalize", "export"]) {
    const planPath = operation === "normalize" ? SLICE06_DEFINITION_PATHS.normalizePlan : SLICE06_DEFINITION_PATHS.exportPlan;
    const preregPath = operation === "normalize" ? SLICE06_DEFINITION_PATHS.normalizePreregistration : SLICE06_DEFINITION_PATHS.exportPreregistration;
    const manifestPath = operation === "normalize" ? SLICE06_DEFINITION_PATHS.normalizeManifest : SLICE06_DEFINITION_PATHS.exportManifest;
    const plan = snapshot.jsonByPath.get(planPath);
    const prereg = snapshot.jsonByPath.get(preregPath);
    const manifest = snapshot.jsonByPath.get(manifestPath);
    const expectedCases = byOperation[operation];
    expectDeep(issues, "DIAGNOSTIC_PLAN_DENOMINATOR_INVALID", `${planPath}.denominator`, plan?.denominator, {
      sourceUnits: 4, applicableSources: 3, preflightSentinels: 1, repetitionsPerSource: 3, attempts: 12, replacementAttempts: 0,
    });
    expectDeep(issues, "DIAGNOSTIC_PLAN_CASES_INVALID", `${planPath}.cases`, plan?.cases, expectedCases);
    expectDeep(issues, "DIAGNOSTIC_STOP_RULES_INVALID", `${planPath}.stopRules`, plan?.stopRules, EXPECTED_DIAGNOSTIC_STOP_RULES);
    if (plan?.mode !== "open-diagnostic" || plan?.operation !== operation || plan?.resultsStateAtDefinitionFreeze !== "not-created"
      || plan?.repetitionRule?.majorityVoteAllowed !== false || plan?.repetitionRule?.allThreeTerminalRequired !== true
      || plan?.repetitionRule?.validOutcomeRerunAllowed !== false || plan?.outcomeBoundary?.candidateConformancePass !== false
      || plan?.outcomeBoundary?.gateBDecisionAuthority !== false || plan?.outcomeBoundary?.calibrationAuthorized !== false) {
      issue(issues, "DIAGNOSTIC_PLAN_BOUNDARY_INVALID", planPath, operation);
    }
    expectDeep(issues, "PREREGISTRATION_DENOMINATOR_INVALID", `${preregPath}.denominator`, prereg?.denominator, {
      sourceUnits: 4, attempts: 12, repetitionsPerSource: 3, replacementAttempts: 0,
    });
    expectDeep(issues, "PREREGISTRATION_SOURCE_SET_INVALID", `${preregPath}.sourceLineageRefs`, prereg?.sourceLineageRefs, expectedCases.map(({ sourceLineageRef }) => sourceLineageRef));
    if (prereg?.mode !== "open-diagnostic" || prereg?.operation !== operation
      || prereg?.stateAtDefinitionFreeze !== "preregistered-diagnostic-results-zero"
      || prereg?.runIdentity?.invocationLimit !== 1 || prereg?.formalBoundary?.holdout !== "not-created"
      || prereg?.formalBoundary?.defectHoldout !== "not-created" || prereg?.formalBoundary?.escape !== "not-created"
      || prereg?.formalBoundary?.formalRunsAllowed !== false || prereg?.formalBoundary?.c1Denominator !== 0
      || prereg?.requestIdentityRule !== "new-slice06-source-run-session-request-and-idempotency-identities-only"
      || prereg?.rerunRule !== "no-valid-outcome-rerun-no-replacement-no-majority-vote") {
      issue(issues, "PREREGISTRATION_BOUNDARY_INVALID", preregPath, operation);
    }
    expectDeep(issues, "MANIFEST_COUNTS_INVALID", `${manifestPath}.counts`, manifest?.counts, {
      totalSources: 4, applicableSources: 3, preflightSentinels: 1, repetitionsPerSource: 3,
      totalPlannedAttempts: 12, replacementAttempts: 0,
    });
    expectDeep(issues, "MANIFEST_ENTRIES_INVALID", `${manifestPath}.entries`, manifest?.entries, expectedCases);
    expectDeep(issues, "MANIFEST_ISOLATION_INVALID", `${manifestPath}.isolation`, manifest?.isolation, {
      newSlice06SourceFamilyAndCaptureSessionIds: true, operationSpecificRunAndSessionIds: true,
      reusedSlice05BytesAreLineageOnly: true, independenceClaim: false, crossOperationAggregationAllowed: false,
    });
    if (manifest?.mode !== "open-diagnostic" || manifest?.operation !== operation
      || manifest?.stateAtDefinitionFreeze !== "frozen-results-zero-not-run"
      || manifest?.outputBoundary?.artifactPublicationAllowed !== false
      || manifest?.outputBoundary?.retainedOnlyAsDiagnosticSpecimenOrQuarantine !== true
      || !deepEqual(manifest?.runIdentity, { runId: `run.diagnostic.s06.${operation}.v0.6.0`, sessionId: `session.diagnostic.s06.${operation}.v0.6.0` })) {
      issue(issues, "MANIFEST_BOUNDARY_INVALID", manifestPath, operation);
    }
    if (prereg?.runIdentity?.runId !== manifest?.runIdentity?.runId || prereg?.runIdentity?.sessionId !== manifest?.runIdentity?.sessionId) {
      issue(issues, "RUN_IDENTITY_BINDING_INVALID", preregPath, operation);
    }
    runIdentities.push(manifest?.runIdentity?.runId, manifest?.runIdentity?.sessionId);
  }
  if (new Set(runIdentities).size !== 4) issue(issues, "CROSS_OPERATION_IDENTITY_LEAKAGE", "manifests", "normalize/export run and session identities must be disjoint");

  const expectedSourceRefs = SLICE06_SOURCE_SPECS.map((spec) => ({ operation: spec.operation, ref: recordRefFor(snapshot, sourceWrapperPath(spec)) }));
  expectDeep(issues, "INDEX_SOURCE_SET_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.sourceLineageRefs`, index.sourceLineageRefs, expectedSourceRefs);
  const refPairs = [
    ["contractRefs", SLICE06_DEFINITION_PATHS.normalizeContract, SLICE06_DEFINITION_PATHS.exportContract],
    ["diagnosticPlanRefs", SLICE06_DEFINITION_PATHS.normalizePlan, SLICE06_DEFINITION_PATHS.exportPlan],
    ["preregistrationRefs", SLICE06_DEFINITION_PATHS.normalizePreregistration, SLICE06_DEFINITION_PATHS.exportPreregistration],
    ["manifestRefs", SLICE06_DEFINITION_PATHS.normalizeManifest, SLICE06_DEFINITION_PATHS.exportManifest],
  ];
  for (const [key, normalizePath, exportPath] of refPairs) expectDeep(issues, "INDEX_OPERATION_REF_SET_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.${key}`, index[key], [
    { operation: "normalize", ref: recordRefFor(snapshot, normalizePath) }, { operation: "export", ref: recordRefFor(snapshot, exportPath) },
  ]);
}

export function deriveSlice06ProtocolSchemaVersion(role, relativePath, schema) {
  const declared = schema?.properties?.schemaVersion?.const;
  const fallback = UNVERSIONED_PROTOCOL_SCHEMA_FALLBACKS[role];
  if (typeof declared === "string") {
    if (fallback) throw new Error(`${role} must remain the exact unversioned fallback schema`);
    return declared;
  }
  if (!fallback || fallback.path !== relativePath
    || fallback.schemaVersion !== path.posix.basename(relativePath, ".schema.json")) {
    throw new Error(`missing top-level schemaVersion is allowed only for the two exact runner fallback schemas: ${role}/${relativePath}`);
  }
  return fallback.schemaVersion;
}

function validateProtocolSchemaRefs(snapshot) {
  const { issues, index } = snapshot;
  const refs = index.resultProtocolSchemaRefs;
  const stableRoles = [
    ["candidate-output-observation", "schemas/candidate-output-observation.slice06.v0.schema.json"],
    ["diagnostic-envelope", "schemas/diagnostic-envelope.slice06.v0.schema.json"],
    ["oracle-diagnostic", "schemas/oracle-diagnostic.slice06.v0.schema.json"],
  ];
  const roles = [...stableRoles, ...Object.entries(SLICE06_RUNNER_SCHEMA_PATHS)];
  const expected = roles.map(([role, relativePath]) => {
    const schema = snapshot.schemasByPath.get(relativePath);
    const descriptor = snapshot.descriptorByPath.get(relativePath);
    let schemaVersion = null;
    try { schemaVersion = deriveSlice06ProtocolSchemaVersion(role, relativePath, schema); }
    catch (error) { addThrownIssue(issues, "RESULT_PROTOCOL_SCHEMA_VERSION_DERIVATION_INVALID", relativePath, error); }
    return {
      role,
      schemaVersion,
      file: { path: relativePath, byteLength: descriptor?.byteLength, fileSha256: descriptor?.fileSha256 },
    };
  });
  if (!Array.isArray(refs) || refs.length !== 13 || new Set(refs.map(({ role }) => role)).size !== 13 || !deepEqual(refs, expected)) {
    issue(issues, "RESULT_PROTOCOL_SCHEMA_SET_INVALID", `${SLICE06_DEFINITION_INDEX_PATH}.resultProtocolSchemaRefs`, "exact Phase B 13-schema protocol subset is required");
  }
}

async function verifyTwoTempRegeneration(snapshot, inventory) {
  const issues = [];
  let firstParent;
  let secondParent;
  try {
    firstParent = await mkdtemp(path.join(tmpdir(), "single-image-studio-s06-regen-a-"));
    secondParent = await mkdtemp(path.join(tmpdir(), "single-image-studio-s06-regen-b-"));
    const first = path.join(firstParent, "slice-06");
    const second = path.join(secondParent, "slice-06");
    await Promise.all([mkdir(first, { recursive: true }), mkdir(second, { recursive: true })]);
    await Promise.all([
      copyFile(path.join(snapshot.sliceRoot, SLICE06_DEFINITION_README_PATH), path.join(first, SLICE06_DEFINITION_README_PATH)),
      copyFile(path.join(snapshot.sliceRoot, SLICE06_DEFINITION_README_PATH), path.join(second, SLICE06_DEFINITION_README_PATH)),
    ]);
    await generateSlice06({ sliceRoot: first, projectRoot: snapshot.projectRoot, frozenAt: snapshot.index.frozenAt, runtimeInventory: inventory });
    await generateSlice06({ sliceRoot: second, projectRoot: snapshot.projectRoot, frozenAt: snapshot.index.frozenAt, runtimeInventory: inventory });
    for (const entry of await compareSlice06TreesByteForByte(first, second)) issues.push({ ...entry, code: `TWIN_${entry.code}` });
    for (const entry of await compareSlice06TreesByteForByte(first, snapshot.sliceRoot)) issues.push({ ...entry, code: `CANONICAL_${entry.code}` });
  } catch (error) {
    addThrownIssue(issues, "REGENERATION_FAILED", ".", error);
  } finally {
    if (firstParent) await rm(firstParent, { recursive: true, force: true });
    if (secondParent) await rm(secondParent, { recursive: true, force: true });
  }
  return issues;
}

export async function validateSlice06Definition({
  sliceRoot = DEFAULT_SLICE06_DEFINITION_ROOT,
  projectRoot = DEFAULT_PROJECT_ROOT,
  pins = SLICE06_DEFINITION_PINS,
  requirePins = true,
  recheckRuntime = true,
  regenerate = true,
  runtimeInventory = undefined,
} = {}) {
  let snapshot;
  try {
    snapshot = await readDefinitionSnapshot({ sliceRoot, projectRoot, pins, requirePins });
  } catch (error) {
    return { valid: false, issues: [{ code: "S06_DEFINITION_READ_FAILED", location: ".", message: error instanceof Error ? error.message : String(error) }] };
  }
  if (!snapshot.index) return { valid: false, issues: snapshot.issues };
  validateSchemasAndInstances(snapshot);
  const references = await validateReferences(snapshot);
  const lineage = await inspectSlice05ClosedLineage(snapshot.projectRoot, snapshot.issues);
  validateIndexAndImplementationSemantics(snapshot, pins, requirePins);
  validateClosureLineageSemantics(snapshot, lineage);
  validateRightsRetentionCandidateContracts(snapshot);
  validateErrorRegistrySemantics(snapshot);
  validateSourcesPlansPreregistrationsAndManifests(snapshot, lineage);
  validateProtocolSchemaRefs(snapshot);
  for (const [relativePath, record] of snapshot.jsonByPath) {
    if (snapshot.schemasByPath.has(relativePath)) continue;
    const scanHistoricalResults = (value, location) => {
      if (typeof value === "string" && value.startsWith("research/slice-05/results/open-smoke")
        && relativePath !== SLICE06_DEFINITION_PATHS.closureLineage) {
        issue(snapshot.issues, "S05_RESULT_REPLAY_OUTSIDE_CLOSURE", location, "closed Slice 05 results may be cited only by the dedicated immutable closure-lineage record");
      } else if (Array.isArray(value)) value.forEach((entry, index) => scanHistoricalResults(entry, `${location}[${index}]`));
      else if (isRecord(value)) for (const [key, entry] of Object.entries(value)) scanHistoricalResults(entry, `${location}.${key}`);
    };
    scanHistoricalResults(record, relativePath);
    if (record.frozenAt !== snapshot.index.frozenAt && record.recordedAt !== snapshot.index.frozenAt
      && record.observedAt !== snapshot.index.frozenAt) {
      issue(snapshot.issues, "DEFINITION_CHRONOLOGY_INVALID", relativePath, "all definition records must bind to the single freeze instant");
    }
  }

  let inventory = runtimeInventory;
  if (recheckRuntime || regenerate) {
    try { inventory ??= await inventorySharpRuntimeSlice05({ projectRoot: snapshot.projectRoot }); }
    catch (error) { addThrownIssue(snapshot.issues, "RUNTIME_RECHECK_FAILED", SLICE06_DEFINITION_PATHS.runtime, error); }
  }
  validateRuntimeAndHardwareSemantics(snapshot, inventory);
  if (regenerate && inventory) snapshot.issues.push(...await verifyTwoTempRegeneration(snapshot, inventory));

  const definitionRef = recordRefFor(snapshot, SLICE06_DEFINITION_INDEX_PATH);
  const pinCodes = new Set(["DEFINITION_PIN_MISSING", "DEFINITION_FREEZE_MISMATCH", "DEFINITION_INDEX_CONTENT_PIN_MISMATCH", "DEFINITION_INDEX_FILE_PIN_MISMATCH", "DESCENDANT_TREE_PIN_MISMATCH", "SCHEMA_TREE_PIN_MISMATCH", "README_PIN_MISMATCH", "FULL_TREE_PIN_MISMATCH", "GENERATOR_PIN_MISMATCH"]);
  const runtimeCodes = new Set(["RUNTIME_RECHECK_FAILED", "RUNTIME_FRESH_INVENTORY_DRIFT", "RUNTIME_CANDIDATE_LINEAGE_INVALID", "HARDWARE_FRESH_OBSERVATION_INVALID"]);
  const regenFailed = snapshot.issues.some(({ code }) => code === "REGENERATION_FAILED" || code.startsWith("TWIN_") || code.startsWith("CANONICAL_"));
  return {
    valid: snapshot.issues.length === 0,
    issues: snapshot.issues,
    index: snapshot.index,
    definitionRef,
    definitionRoot: snapshot.sliceRoot,
    counts: { ...snapshot.index.counts, generatedResults: snapshot.index.counts?.generatedResults ?? null },
    generatedResults: snapshot.index.counts?.generatedResults ?? null,
    pinsVerified: requirePins && !snapshot.issues.some(({ code }) => pinCodes.has(code)),
    runtimeRechecked: recheckRuntime && Boolean(inventory) && !snapshot.issues.some(({ code }) => runtimeCodes.has(code)),
    regenerationVerified: regenerate && !regenFailed,
    hashes: {
      schemaTreeSha256: snapshot.schemaTreeSha256,
      descendantTreeSha256: snapshot.descendantTreeSha256,
      fullTreeSha256: snapshot.fullTreeSha256,
      readmeSha256: snapshot.readmeFile?.fileSha256 ?? null,
      definitionIndexContentHash: snapshot.index.contentHash,
      definitionIndexFileSha256: snapshot.indexFile.fileSha256,
    },
    references: { internalRecords: references.recordsById.size, externalRecords: references.externalByPath.size },
  };
}
export async function assertSlice06Definition(options = {}) {
  const report = await validateSlice06Definition(options);
  if (!report.valid) throw new Slice06ValidationError(report.issues);
  return report;
}

export function validateSlice06ExecutionAdmission({ definitionReport, gitState } = {}) {
  const issues = [];
  if (!isRecord(definitionReport) || definitionReport.valid !== true || !isRecord(definitionReport.index)) {
    issue(issues, "S06_EXECUTION_DEFINITION_INVALID", "definitionReport", "execution requires a fully valid central-validator report");
  } else {
    const definitionRef = definitionReport.definitionRef;
    if (!isRecord(definitionRef)
      || !deepEqual(Object.keys(definitionRef).sort(compareText), ["byteLength", "contentHash", "fileSha256", "id", "path"])
      || definitionRef.path !== SLICE06_DEFINITION_INDEX_PATH
      || definitionRef.id !== definitionReport.index.definitionIndexId
      || definitionRef.contentHash !== definitionReport.index.contentHash
      || !Number.isInteger(definitionRef.byteLength) || definitionRef.byteLength < 1
      || !SHA256_PATTERN.test(definitionRef.fileSha256)) {
      issue(issues, "S06_EXECUTION_DEFINITION_REF_INVALID", "definitionReport.definitionRef", "execution requires the exact closed five-field definition index reference");
    }
    if (definitionReport.index.definitionState !== "frozen-definition-results-zero-diagnostic-only") {
      issue(issues, "S06_EXECUTION_DEFINITION_STATE_INVALID", "definitionReport.index.definitionState", "definition must be frozen with zero results");
    }
    const expectedInitialResults = {
      resultsDirectoryPresent: false, resultFilesPresent: 0, ledgersPresent: 0, summariesPresent: 0,
      closeRecordsPresent: 0, specimensPresent: 0, quarantinePresent: 0,
    };
    if (definitionReport.counts?.generatedResults !== 0
      || !deepEqual(definitionReport.index.initialResultStateAtDefinitionFreeze, expectedInitialResults)) {
      issue(issues, "S06_EXECUTION_RESULTS_ZERO_INVALID", "definitionReport", "canonical definition must attest and validate results=0");
    }
    for (const [key, code] of [
      ["pinsVerified", "S06_EXECUTION_PINS_NOT_VERIFIED"],
      ["runtimeRechecked", "S06_EXECUTION_RUNTIME_NOT_RECHECKED"],
      ["regenerationVerified", "S06_EXECUTION_REGEN_NOT_VERIFIED"],
    ]) {
      if (definitionReport[key] !== true) issue(issues, code, `definitionReport.${key}`, "execution admission requires the production validation path");
    }
  }
  const keys = [
    "headCommit", "originMainCommit", "worktreeClean", "definitionIndexTracked",
    "definitionIndexCommit", "definitionIndexReachableFromHead",
  ];
  if (!isRecord(gitState) || !deepEqual(Object.keys(gitState).sort(compareText), keys.sort(compareText))) {
    issue(issues, "S06_EXECUTION_GIT_STATE_INVALID", "gitState", "git state must contain the exact closed admission fields");
  } else {
    for (const key of ["headCommit", "originMainCommit", "definitionIndexCommit"]) {
      if (typeof gitState[key] !== "string" || !/^[0-9a-f]{40}$/u.test(gitState[key])) {
        issue(issues, "S06_EXECUTION_GIT_COMMIT_INVALID", `gitState.${key}`, "commit must be a full lowercase Git SHA-1");
      }
    }
    if (gitState.worktreeClean !== true) issue(issues, "S06_EXECUTION_WORKTREE_DIRTY", "gitState.worktreeClean", "definition execution requires a clean worktree");
    if (gitState.definitionIndexTracked !== true) issue(issues, "S06_EXECUTION_DEFINITION_UNTRACKED", "gitState.definitionIndexTracked", "definition index must be tracked");
    if (gitState.definitionIndexReachableFromHead !== true) issue(issues, "S06_EXECUTION_DEFINITION_UNREACHABLE", "gitState.definitionIndexReachableFromHead", "definition commit must be reachable from HEAD");
    if (gitState.originMainCommit !== gitState.headCommit) issue(issues, "S06_EXECUTION_NOT_PUSHED", "gitState.originMainCommit", "HEAD must equal the locally observed origin/main ref");
  }
  return { valid: issues.length === 0, issues };
}

async function main() {
  const report = await validateSlice06Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
