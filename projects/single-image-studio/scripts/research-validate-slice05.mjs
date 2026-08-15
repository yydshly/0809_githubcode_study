import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  decodeIndependentPngSlice05,
  evaluateDeliveryArtifactSlice05,
  evaluateNormalizedImageSlice05,
  validateDeliveryArtifactSlice05,
  validateGoldRecordSlice05,
  validateNormalizedImageSlice05,
  validateOracleResultSlice05,
} from "./research-independent-png-oracle-slice05.mjs";
import { SLICE05_SHARP_POLICY } from "./research-sharp-adapter-slice05.mjs";
import {
  SLICE05_RUNNER_RECORD_SCHEMAS,
  SLICE05_RUNNER_SCHEMA_PATHS,
  artifactRecordRelativePathSlice05,
  artifactRelativePathSlice05,
  buildCalibrationAdmissionSlice05,
  buildCalibrationSummarySlice05,
  buildGateBDecisionSlice05,
  buildOperationSmokeSummarySlice05,
  buildSlice05FaultResult,
  oracleRelativePathSlice05,
  validateCalibrationAdmissionSlice05,
  validateCalibrationSummarySlice05,
  validateGateBDecisionSlice05,
  validateSlice05FaultResult,
  validateSlice05RunRequest,
  validateSlice05RunResult,
  validateSlice05SessionAudit,
  validateRuntimeInventoryObservationSlice05,
  validateSmokeSummarySlice05,
} from "./research-run-slice05.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

export const DEFAULT_SLICE05_DEFINITION_ROOT = path.join(DEFAULT_PROJECT_ROOT, "research", "slice-05");
export const SLICE05_DEFINITION_INDEX_PATH = "definition-index.v0.5.0.json";
export const SLICE05_DEFINITION_README_PATH = "README.md";

// These literals are deliberately null until the generator, runner schemas, README, and
// canonical tree have all been frozen together. validateSlice05Definition rejects null
// production pins unless an explicit test-only pin set is supplied.
export const SLICE05_DEFINITION_PINS = Object.freeze({
  frozenAt: "2026-08-15T04:23:38.389Z",
  generatorSha256: "bb636fc7cc9ab98c569a0d8d05ad0c27eaecbe6121762c2e19921258b25ff18d",
  schemaTreeSha256: "8b5170c4026c930d4ac98e903d9b58902589869971f1fa013637c70eae6ebca6",
  descendantTreeSha256: "8b340918e423043538997250c63b9b49b175b2d2b349c4835de48dd017ed82c0",
  fullTreeSha256: "108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2",
  readmeSha256: "1a22e17fb57cd23ab19da5e97fb2ed909dd4793e8800047371f8cf7bfd9330a7",
  definitionIndexContentHash: "d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271",
  definitionIndexFileSha256: "8cbf1f0aaf018c54b95eaa5ef0f3a2f6cb11dc60529ea569408496514d582d96",
});

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_RELATIVE_PATTERN = /^(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)(?!.*:)[A-Za-z0-9@._-]+(?:\/[A-Za-z0-9@._-]+)*$/u;
const DEFINITION_SCHEMA_VERSION_TO_FILE = Object.freeze({
  "runtime-attestation-record.slice05.v0": "schemas/runtime-attestation-record.slice05.v0.schema.json",
  "candidate-lock.slice05.v0": "schemas/candidate-lock.slice05.v0.schema.json",
  "capability-contract.slice05.v0": "schemas/capability-contract.slice05.v0.schema.json",
  "gate-b-smoke-plan.slice05.v0": "schemas/gate-b-smoke-plan.slice05.v0.schema.json",
  "open-partition-plan.slice05.v0": "schemas/open-partition-plan.slice05.v0.schema.json",
  "calibration-preregistration.slice05.v0": "schemas/calibration-preregistration.slice05.v0.schema.json",
  "rights-record.slice05.v0": "schemas/rights-record.slice05.v0.schema.json",
  "source-provenance.slice05.v0": "schemas/source-provenance.slice05.v0.schema.json",
  "hardware-profile.slice05.v0": "schemas/hardware-profile.slice05.v0.schema.json",
  "fixture-manifest.slice05.v0": "schemas/fixture-manifest.slice05.v0.schema.json",
  "definition-index.slice05.v0": "schemas/definition-index.slice05.v0.schema.json",
  "normalized-image.slice04.v0": "schemas/normalized-image.slice04.v0.schema.json",
  "delivery-artifact.slice04.v0": "schemas/delivery-artifact.slice04.v0.schema.json",
  "oracle-result.slice05.v0": "schemas/oracle-result.slice05.v0.schema.json",
  "gold-record.slice05.v0": "schemas/gold-record.slice05.v0.schema.json",
});

const RECORD_ID_FIELDS = Object.freeze({
  "runtime-attestation-record.slice05.v0": "runtimeAttestationId",
  "candidate-lock.slice05.v0": "candidateLockId",
  "capability-contract.slice05.v0": "contractId",
  "gate-b-smoke-plan.slice05.v0": "gateBPlanId",
  "open-partition-plan.slice05.v0": "partitionPlanId",
  "calibration-preregistration.slice05.v0": "preregistrationId",
  "rights-record.slice05.v0": "rightsRecordId",
  "source-provenance.slice05.v0": "sourceProvenanceId",
  "hardware-profile.slice05.v0": "hardwareProfileId",
  "fixture-manifest.slice05.v0": "manifestId",
  "definition-index.slice05.v0": "definitionIndexId",
  "normalized-image.slice04.v0": "artifactId",
  "delivery-artifact.slice04.v0": "artifactId",
  "oracle-result.slice05.v0": "oracleResultId",
  "gold-record.slice05.v0": "goldRecordId",
});

const NUL = Buffer.from([0]);

export const SLICE05_SCHEMA_KEYWORD_ALLOWLIST = Object.freeze(new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "title",
  "description",
  "type",
  "const",
  "enum",
  "format",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "minItems",
  "maxItems",
  "uniqueItems",
  "items",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
]));

const JSON_SCHEMA_TYPES = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);

export class Slice05ValidationError extends Error {
  constructor(issues) {
    super(`Slice 05 validation failed with ${issues.length} issue(s)`);
    this.name = "Slice05ValidationError";
    this.issues = issues;
  }
}

function issue(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeRelative(value) {
  return value.split(path.sep).join("/");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringifySlice05Validation(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function deepEqual(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

export function sha256Slice05Validation(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function contentHashSlice05Validation(record) {
  if (!isRecord(record)) throw new TypeError("content-hashed Slice 05 records must be objects");
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice05Validation(Buffer.from(stableStringifySlice05Validation(copy), "utf8"));
}

export function collectSlice05References(value, location = "$", output = { recordRefs: [], fileRefs: [] }) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSlice05References(entry, `${location}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  const hasFileIdentity = typeof value.path === "string" && typeof value.fileSha256 === "string"
    && (!Object.hasOwn(value, "byteLength") || Number.isInteger(value.byteLength));
  const hasRecordIdentity = hasFileIdentity && typeof value.id === "string" && typeof value.contentHash === "string";
  if (hasRecordIdentity) output.recordRefs.push({ location, ref: value });
  else if (hasFileIdentity) output.fileRefs.push({ location, ref: value });
  for (const [key, entry] of Object.entries(value)) {
    collectSlice05References(entry, `${location}.${key}`, output);
  }
  return output;
}

export function validateSlice05DefinitionBoundary(value, location = "$") {
  const issues = [];
  const zeroFields = new Set([
    "c1", "u1", "e1", "r1", "r1Pipeline", "r1ProductValidation", "r1ProductRelease",
    "o1", "g1", "v1", "c1Denominator", "formalSources", "releaseRegistered", "releaseApproved",
  ]);
  const falseFields = new Set([
    "productSupport", "formalEvidence", "formal", "c1Eligible", "holdoutMaterial", "holdoutSeedsPresent",
    "formalRunsAllowed", "candidatePipelineInvoked", "candidateOutputUsedToDefineGold",
    "formalPartitionsCreatedAtDefinitionFreeze", "serialRecorded",
  ]);
  const notCreatedFields = new Set([
    "formalHoldoutStatus", "formalDefectHoldoutStatus", "formalEscapeStatus", "resultsState",
    "formalHoldoutStatusAtDefinitionFreeze", "formalDefectHoldoutStatusAtDefinitionFreeze",
    "formalEscapeStatusAtDefinitionFreeze", "resultsStateAtDefinitionFreeze",
    "holdoutAtDefinitionFreeze", "defectHoldoutAtDefinitionFreeze", "escapeAtDefinitionFreeze",
  ]);

  const walk = (entry, where) => {
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => walk(item, `${where}[${index}]`));
      return;
    }
    if (!isRecord(entry)) return;
    for (const [key, child] of Object.entries(entry)) {
      const childLocation = `${where}.${key}`;
      if (zeroFields.has(key) && child !== 0) issue(issues, "EVIDENCE_AXIS_UPGRADED", childLocation, "definition-stage evidence counters must remain zero");
      if (falseFields.has(key) && child !== false) issue(issues, "DEFINITION_BOUNDARY_UPGRADED", childLocation, "definition-stage boundary flag must remain false");
      if (notCreatedFields.has(key) && child !== "not-created") issue(issues, "DEFINITION_RESULT_STATE_INVALID", childLocation, "definition-stage material must remain not-created");
      if (key === "gateBState" && child !== "not-evaluated") issue(issues, "GATE_B_UPGRADED", childLocation, "Gate B must remain not-evaluated in the definition tree");
      if (key === "gateBStateAtDefinitionFreeze" && child !== "not-evaluated") issue(issues, "GATE_B_UPGRADED", childLocation, "Gate B must remain not-evaluated in the definition tree");
      if (key === "releaseAllowlist" && child !== "none") issue(issues, "RELEASE_ALLOWLIST_UPGRADED", childLocation, "release allowlist must remain none");
      if (key === "candidateExecutionState" && child !== "not-run") issue(issues, "CANDIDATE_EXECUTION_STATE_INVALID", childLocation, "candidate execution must remain not-run");
      if (key === "execution" && where.endsWith(".stateAtDefinitionFreeze") && child !== "candidate-pipeline-not-run") {
        issue(issues, "CANDIDATE_EXECUTION_STATE_INVALID", childLocation, "candidate execution must remain candidate-pipeline-not-run");
      }
      if (key === "resultsDirectoryPresent" && child !== false) issue(issues, "RESULTS_PRESENT_AT_DEFINITION", childLocation, "results directory must be absent at definition time");
      if (["resultFilesPresent", "admissionRecordsPresent", "ledgersPresent", "generatedResults", "formalFixtures"].includes(key) && child !== 0) {
        issue(issues, "DEFINITION_RESULT_COUNT_INVALID", childLocation, "definition-stage result and formal-material counts must be zero");
      }
      walk(child, childLocation);
    }
    if (["candidateProduced", "candidateOutputUsed", "candidateDependencyUsed"].every((key) => Object.hasOwn(entry, key))) {
      if (entry.candidateProduced !== false || entry.candidateOutputUsed !== false || entry.candidateDependencyUsed !== false) {
        issue(issues, "FIXTURE_OR_GOLD_CANDIDATE_TAINTED", where, "fixture and gold definitions must be independent of candidate code and output");
      }
    }
  };
  walk(value, location);
  return issues;
}

function schemaTypes(node) {
  if (typeof node.type === "string") return [node.type];
  if (Array.isArray(node.type)) return node.type;
  return [];
}

function inspectSchemaNode(node, issues, location, root) {
  if (!isRecord(node)) {
    issue(issues, "SCHEMA_NODE_INVALID", location, "boolean and non-object schema nodes are forbidden");
    return;
  }
  for (const keyword of Object.keys(node)) {
    if (!SLICE05_SCHEMA_KEYWORD_ALLOWLIST.has(keyword)) {
      issue(issues, "SCHEMA_KEYWORD_UNSUPPORTED", `${location}.${keyword}`, `unsupported keyword ${keyword}`);
    }
  }

  const types = schemaTypes(node);
  if (Object.hasOwn(node, "type")) {
    if (types.length < 1 || new Set(types).size !== types.length || types.some((type) => !JSON_SCHEMA_TYPES.has(type))) {
      issue(issues, "SCHEMA_TYPE_INVALID", `${location}.type`, "type must use one or more unique supported JSON Schema types");
    }
  }
  if (Object.hasOwn(node, "$schema") && typeof node.$schema !== "string") {
    issue(issues, "SCHEMA_DIALECT_TYPE_INVALID", `${location}.$schema`, "$schema must be a string");
  }
  if (Object.hasOwn(node, "$id") && typeof node.$id !== "string") {
    issue(issues, "SCHEMA_ID_TYPE_INVALID", `${location}.$id`, "$id must be a string");
  }
  for (const keyword of ["title", "description"]) {
    if (Object.hasOwn(node, keyword) && typeof node[keyword] !== "string") {
      issue(issues, "SCHEMA_ANNOTATION_INVALID", `${location}.${keyword}`, `${keyword} must be a string`);
    }
  }
  if (Object.hasOwn(node, "format") && node.format !== "date-time") {
    issue(issues, "SCHEMA_FORMAT_UNSUPPORTED", `${location}.format`, "only the exact date-time format is supported");
  }
  if (Object.hasOwn(node, "pattern") && typeof node.pattern !== "string") {
    issue(issues, "SCHEMA_PATTERN_TYPE_INVALID", `${location}.pattern`, "pattern must be a string");
  }
  for (const keyword of ["minLength", "maxLength", "minItems", "maxItems"]) {
    if (Object.hasOwn(node, keyword) && (!Number.isInteger(node[keyword]) || node[keyword] < 0)) {
      issue(issues, "SCHEMA_BOUND_INVALID", `${location}.${keyword}`, `${keyword} must be a non-negative integer`);
    }
  }
  for (const keyword of ["minimum", "maximum"]) {
    if (Object.hasOwn(node, keyword) && (typeof node[keyword] !== "number" || !Number.isFinite(node[keyword]))) {
      issue(issues, "SCHEMA_BOUND_INVALID", `${location}.${keyword}`, `${keyword} must be a finite number`);
    }
  }
  if (Number.isInteger(node.minLength) && Number.isInteger(node.maxLength) && node.minLength > node.maxLength) {
    issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minLength must not exceed maxLength");
  }
  if (Number.isInteger(node.minItems) && Number.isInteger(node.maxItems) && node.minItems > node.maxItems) {
    issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minItems must not exceed maxItems");
  }
  if (typeof node.minimum === "number" && typeof node.maximum === "number" && node.minimum > node.maximum) {
    issue(issues, "SCHEMA_BOUND_ORDER_INVALID", location, "minimum must not exceed maximum");
  }
  if (Object.hasOwn(node, "uniqueItems") && typeof node.uniqueItems !== "boolean") {
    issue(issues, "SCHEMA_UNIQUE_ITEMS_INVALID", `${location}.uniqueItems`, "uniqueItems must be boolean");
  }
  if (Object.hasOwn(node, "enum")) {
    if (!Array.isArray(node.enum) || node.enum.length < 1
      || new Set(node.enum.map((entry) => JSON.stringify(stableValue(entry)))).size !== node.enum.length) {
      issue(issues, "SCHEMA_ENUM_INVALID", `${location}.enum`, "enum must contain one or more unique JSON values");
    }
  }
  if (Object.hasOwn(node, "$ref")) {
    if (typeof node.$ref !== "string" || !node.$ref.startsWith("#/$defs/")
      || !Object.hasOwn(root.$defs ?? {}, node.$ref.slice("#/$defs/".length))) {
      issue(issues, "SCHEMA_REF_UNRESOLVED", `${location}.$ref`, String(node.$ref));
    }
    if (Object.keys(node).some((key) => key !== "$ref")) {
      issue(issues, "SCHEMA_REF_SIBLING_FORBIDDEN", location, "$ref nodes must not carry sibling constraints");
    }
  }

  const declaresObjectConstraints = Object.hasOwn(node, "properties")
    || Object.hasOwn(node, "required") || Object.hasOwn(node, "additionalProperties");
  if (declaresObjectConstraints && !types.includes("object")) {
    issue(issues, "SCHEMA_OBJECT_TYPE_MISSING", location, "object constraints require type=object");
  }
  const declaresArrayConstraints = Object.hasOwn(node, "items") || Object.hasOwn(node, "minItems")
    || Object.hasOwn(node, "maxItems") || Object.hasOwn(node, "uniqueItems");
  if (declaresArrayConstraints && !types.includes("array")) {
    issue(issues, "SCHEMA_ARRAY_TYPE_MISSING", location, "array constraints require type=array");
  }

  if (types.includes("object")) {
    if (!isRecord(node.properties) || !Array.isArray(node.required)) {
      issue(issues, "SCHEMA_OBJECT_UNDECLARED", location, "object schemas must declare properties and required");
    } else {
      const propertyNames = Object.keys(node.properties).sort(compareText);
      const requiredNames = [...new Set(node.required)].sort(compareText);
      if (!deepEqual(propertyNames, requiredNames) || requiredNames.length !== node.required.length) {
        issue(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "every object property must be required exactly once");
      }
    }
    if (node.additionalProperties !== false) {
      issue(issues, "SCHEMA_OBJECT_OPEN", location, "object schemas must set additionalProperties=false");
    }
  }
  if (Array.isArray(node.required) && node.required.some((name) => typeof name !== "string" || name.length === 0)) {
    issue(issues, "SCHEMA_REQUIRED_INVALID", `${location}.required`, "required must contain non-empty property names");
  }
  if (types.includes("array") && !isRecord(node.items)) {
    issue(issues, "SCHEMA_ARRAY_OPEN", location, "array schemas must declare an object items schema");
  }
  if (typeof node.pattern === "string") {
    try {
      new RegExp(node.pattern, "u");
    } catch (error) {
      issue(issues, "SCHEMA_PATTERN_INVALID", `${location}.pattern`, error instanceof Error ? error.message : String(error));
    }
  }
  if (Object.hasOwn(node, "oneOf") && (!Array.isArray(node.oneOf) || node.oneOf.length < 1)) {
    issue(issues, "SCHEMA_ONE_OF_INVALID", `${location}.oneOf`, "oneOf must be a non-empty array of schemas");
  }
  if (Object.hasOwn(node, "$defs") && !isRecord(node.$defs)) {
    issue(issues, "SCHEMA_DEFS_INVALID", `${location}.$defs`, "$defs must be an object");
  }

  if (isRecord(node.properties)) {
    for (const [key, child] of Object.entries(node.properties)) {
      inspectSchemaNode(child, issues, `${location}.properties.${key}`, root);
    }
  }
  if (isRecord(node.$defs)) {
    for (const [key, child] of Object.entries(node.$defs)) {
      inspectSchemaNode(child, issues, `${location}.$defs.${key}`, root);
    }
  }
  if (isRecord(node.items)) inspectSchemaNode(node.items, issues, `${location}.items`, root);
  if (Array.isArray(node.oneOf)) {
    node.oneOf.forEach((child, index) => inspectSchemaNode(child, issues, `${location}.oneOf[${index}]`, root));
  }
}

export function inspectSlice05Schema(schema, location = "$schema") {
  const issues = [];
  if (!isRecord(schema)) {
    issue(issues, "SCHEMA_ROOT_INVALID", location, "schema root must be an object");
    return issues;
  }
  inspectSchemaNode(schema, issues, location, schema);
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    issue(issues, "SCHEMA_DIALECT_INVALID", `${location}.$schema`, "Draft 2020-12 is required");
  }
  if (typeof schema.$id !== "string" || !schema.$id.startsWith("https://single-image-studio.invalid/research/slice-05/schemas/")) {
    issue(issues, "SCHEMA_ID_INVALID", `${location}.$id`, "schema ID must use the frozen Slice 05 namespace");
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
  if (type === "null") return value === null;
  return false;
}

function validUtcDateTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

export function validateSlice05SchemaInstance(value, schema, location = "$") {
  const errors = [];
  const visit = (instance, node, where, root, sink = errors) => {
    if (!isRecord(node)) {
      sink.push({ location: where, message: "schema node is not an object" });
      return;
    }
    if (typeof node.$ref === "string") {
      const name = node.$ref.startsWith("#/$defs/") ? node.$ref.slice("#/$defs/".length) : "";
      const target = root.$defs?.[name];
      if (!target) sink.push({ location: where, message: `unresolved reference ${node.$ref}` });
      else visit(instance, target, where, root, sink);
      return;
    }
    if (Array.isArray(node.oneOf)) {
      const branchResults = node.oneOf.map((branch) => {
        const branchErrors = [];
        visit(instance, branch, where, root, branchErrors);
        return branchErrors;
      });
      const matches = branchResults.filter((branchErrors) => branchErrors.length === 0).length;
      if (matches !== 1) sink.push({ location: where, message: `must match exactly one oneOf branch; matched ${matches}` });
      return;
    }
    if (Object.hasOwn(node, "const") && !deepEqual(instance, node.const)) {
      sink.push({ location: where, message: `must equal ${JSON.stringify(node.const)}` });
    }
    if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(instance, candidate))) {
      sink.push({ location: where, message: "must match one enum value" });
    }
    const types = schemaTypes(node);
    if (types.length > 0 && !types.some((type) => typeMatches(instance, type))) {
      sink.push({ location: where, message: `must have type ${types.join("|")}` });
      return;
    }
    if (typeof instance === "string") {
      if (Number.isInteger(node.minLength) && instance.length < node.minLength) sink.push({ location: where, message: `must have length >= ${node.minLength}` });
      if (Number.isInteger(node.maxLength) && instance.length > node.maxLength) sink.push({ location: where, message: `must have length <= ${node.maxLength}` });
      if (typeof node.pattern === "string" && !new RegExp(node.pattern, "u").test(instance)) sink.push({ location: where, message: `must match ${node.pattern}` });
      if (node.format === "date-time" && !validUtcDateTime(instance)) sink.push({ location: where, message: "must be an exact UTC date-time" });
    }
    if (typeof instance === "number" && Number.isFinite(instance)) {
      if (typeof node.minimum === "number" && instance < node.minimum) sink.push({ location: where, message: `must be >= ${node.minimum}` });
      if (typeof node.maximum === "number" && instance > node.maximum) sink.push({ location: where, message: `must be <= ${node.maximum}` });
    }
    if (Array.isArray(instance)) {
      if (Number.isInteger(node.minItems) && instance.length < node.minItems) sink.push({ location: where, message: `must contain >= ${node.minItems} items` });
      if (Number.isInteger(node.maxItems) && instance.length > node.maxItems) sink.push({ location: where, message: `must contain <= ${node.maxItems} items` });
      if (node.uniqueItems === true && new Set(instance.map((entry) => JSON.stringify(stableValue(entry)))).size !== instance.length) {
        sink.push({ location: where, message: "must contain unique items" });
      }
      if (isRecord(node.items)) instance.forEach((entry, index) => visit(entry, node.items, `${where}[${index}]`, root, sink));
    }
    if (isRecord(instance)) {
      const properties = isRecord(node.properties) ? node.properties : {};
      for (const required of node.required ?? []) {
        if (!Object.hasOwn(instance, required)) sink.push({ location: `${where}.${required}`, message: "is required" });
      }
      if (node.additionalProperties === false) {
        for (const key of Object.keys(instance)) {
          if (!Object.hasOwn(properties, key)) sink.push({ location: `${where}.${key}`, message: "is not allowed" });
        }
      }
      for (const [key, child] of Object.entries(properties)) {
        if (Object.hasOwn(instance, key)) visit(instance[key], child, `${where}.${key}`, root, sink);
      }
    }
  };
  visit(value, schema, location, schema);
  return errors;
}

export async function listSlice05Tree(root) {
  const resolvedRoot = path.resolve(root);
  const issues = [];
  const files = [];
  const directories = [];

  async function walk(directory, base) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      issue(issues, "DIRECTORY_READ_FAILED", base || ".", error instanceof Error ? error.message : String(error));
      return;
    }
    for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
      const relative = base ? `${base}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      let stats;
      try {
        stats = await lstat(absolute);
      } catch (error) {
        issue(issues, "FILESYSTEM_STAT_FAILED", relative, error instanceof Error ? error.message : String(error));
        continue;
      }
      if (stats.isSymbolicLink()) {
        issue(issues, "SYMLINK_FORBIDDEN", relative, "symlinks and junctions are forbidden in the Slice 05 definition tree");
      } else if (stats.isDirectory()) {
        directories.push(relative);
        await walk(absolute, relative);
      } else if (stats.isFile()) {
        files.push(relative);
      } else {
        issue(issues, "FILESYSTEM_ENTRY_FORBIDDEN", relative, "only regular files and directories are allowed");
      }
    }
  }

  let rootStats;
  try {
    rootStats = await lstat(resolvedRoot);
  } catch (error) {
    issue(issues, "SLICE_ROOT_STAT_FAILED", ".", error instanceof Error ? error.message : String(error));
    return { root: resolvedRoot, files, directories, issues };
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    issue(issues, "SLICE_ROOT_INVALID", ".", "Slice 05 root must be a real directory, not a symlink or junction");
    return { root: resolvedRoot, files, directories, issues };
  }
  await walk(resolvedRoot, "");
  files.sort(compareText);
  directories.sort(compareText);
  return { root: resolvedRoot, files, directories, issues };
}

export async function fileRecordSlice05(root, relativePath) {
  const bytes = await readFile(path.join(root, relativePath));
  return {
    path: normalizeRelative(relativePath),
    byteLength: bytes.byteLength,
    sha256: sha256Slice05Validation(bytes),
  };
}

export function digestSlice05FileRecords(records) {
  const digest = createHash("sha256");
  for (const record of [...records].sort((left, right) => compareText(left.path, right.path))) {
    digest.update(Buffer.from(record.path, "utf8"));
    digest.update(NUL);
    digest.update(Buffer.from(String(record.byteLength), "ascii"));
    digest.update(NUL);
    digest.update(Buffer.from(record.sha256, "ascii"));
    digest.update(NUL);
  }
  return digest.digest("hex");
}

export async function digestSlice05Tree(root, files) {
  const records = [];
  for (const relativePath of [...files].sort(compareText)) {
    records.push(await fileRecordSlice05(root, relativePath));
  }
  return { records, sha256: digestSlice05FileRecords(records) };
}

export async function compareSlice05TreesByteForByte(leftRoot, rightRoot, { exclude = () => false } = {}) {
  const leftTree = await listSlice05Tree(leftRoot);
  const rightTree = await listSlice05Tree(rightRoot);
  const issues = [...leftTree.issues, ...rightTree.issues];
  const leftFiles = leftTree.files.filter((relativePath) => !exclude(relativePath, "file"));
  const rightFiles = rightTree.files.filter((relativePath) => !exclude(relativePath, "file"));
  const leftDirectories = leftTree.directories.filter((relativePath) => !exclude(relativePath, "directory"));
  const rightDirectories = rightTree.directories.filter((relativePath) => !exclude(relativePath, "directory"));
  if (!deepEqual(leftFiles, rightFiles)) {
    issue(issues, "REGEN_FILE_SET_MISMATCH", ".", "regenerated trees have different file sets");
    return issues;
  }
  if (!deepEqual(leftDirectories, rightDirectories)) {
    issue(issues, "REGEN_DIRECTORY_SET_MISMATCH", ".", "regenerated trees have different directory sets");
  }
  for (const relativePath of leftFiles) {
    const [left, right] = await Promise.all([
      readFile(path.join(leftTree.root, relativePath)),
      readFile(path.join(rightTree.root, relativePath)),
    ]);
    if (!left.equals(right)) issue(issues, "REGEN_BYTES_MISMATCH", relativePath, "regenerated bytes differ");
  }
  return issues;
}

function addThrownIssue(issues, code, location, error) {
  issue(issues, code, location, error instanceof Error ? error.message : String(error));
}

function safeRelativePath(value) {
  return typeof value === "string" && SAFE_RELATIVE_PATTERN.test(value) && !value.includes("//");
}

function isInside(base, candidate) {
  const relative = path.relative(path.resolve(base), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function assertRealRegularFile(base, relativePath) {
  if (!safeRelativePath(relativePath)) throw new Error(`unsafe relative path: ${String(relativePath)}`);
  const absolute = path.resolve(base, ...relativePath.split("/"));
  if (!isInside(base, absolute)) throw new Error(`path escapes its root: ${relativePath}`);
  const segments = relativePath.split("/");
  let cursor = path.resolve(base);
  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    const stats = await lstat(cursor);
    if (stats.isSymbolicLink()) throw new Error(`symlink or junction is forbidden: ${relativePath}`);
    if (index < segments.length - 1 && !stats.isDirectory()) throw new Error(`non-directory path segment: ${relativePath}`);
    if (index === segments.length - 1 && !stats.isFile()) throw new Error(`reference is not a regular file: ${relativePath}`);
  }
  const [resolvedBase, resolvedFile] = await Promise.all([realpath(base), realpath(absolute)]);
  if (!isInside(resolvedBase, resolvedFile)) throw new Error(`resolved path escapes its root: ${relativePath}`);
  return { absolute, resolvedFile };
}

async function readCanonicalJson(root, relativePath) {
  const { absolute } = await assertRealRegularFile(root, relativePath);
  const bytes = await readFile(absolute);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd")) throw new Error("JSON is not strict UTF-8");
  const value = JSON.parse(text);
  if (!isRecord(value)) throw new Error("JSON document root must be an object");
  if (stableStringifySlice05Validation(value) !== text) throw new Error("JSON is not canonical stable UTF-8 JSON with one trailing LF");
  return { value, bytes, fileSha256: sha256Slice05Validation(bytes) };
}

function recordIdentity(record) {
  const idField = RECORD_ID_FIELDS[record?.schemaVersion];
  if (idField && typeof record[idField] === "string") return { idField, id: record[idField] };
  const fallback = [...new Set(Object.values(RECORD_ID_FIELDS))]
    .filter((candidate) => typeof record?.[candidate] === "string");
  if (fallback.length !== 1) return null;
  return { idField: fallback[0], id: record[fallback[0]] };
}

function expectedRootForReference(projectRoot, sliceRoot, relativePath) {
  if (relativePath === "package.json" || relativePath === "package-lock.json"
    || relativePath.startsWith("research/") || relativePath.startsWith("scripts/")
    || relativePath.startsWith("node_modules/")) return projectRoot;
  return sliceRoot;
}

async function validateFileIdentity({ projectRoot, sliceRoot, ref, location, issues }) {
  if (!safeRelativePath(ref.path)) {
    issue(issues, "REFERENCE_PATH_UNSAFE", `${location}.path`, String(ref.path));
    return null;
  }
  const root = expectedRootForReference(projectRoot, sliceRoot, ref.path);
  try {
    const { absolute } = await assertRealRegularFile(root, ref.path);
    const bytes = await readFile(absolute);
    if (Number.isInteger(ref.byteLength) && ref.byteLength !== bytes.byteLength) {
      issue(issues, "REFERENCE_LENGTH_MISMATCH", `${location}.byteLength`, `${ref.byteLength} != ${bytes.byteLength}`);
    }
    const actualSha256 = sha256Slice05Validation(bytes);
    if (typeof ref.fileSha256 === "string" && ref.fileSha256 !== actualSha256) {
      issue(issues, "REFERENCE_FILE_HASH_MISMATCH", `${location}.fileSha256`, `${ref.fileSha256} != ${actualSha256}`);
    }
    return { root, absolute, bytes, actualSha256 };
  } catch (error) {
    addThrownIssue(issues, "REFERENCE_FILE_INVALID", location, error);
    return null;
  }
}

function checkLiteral(issues, code, location, actual, expected, requirePins) {
  if (expected === null || expected === undefined) {
    if (requirePins) issue(issues, "DEFINITION_PIN_MISSING", location, "a literal production pin has not been frozen");
    return;
  }
  if (actual !== expected) issue(issues, code, location, `${actual} != ${expected}`);
}

function pathsEqual(left, right) {
  return deepEqual([...left].sort(compareText), [...right].sort(compareText));
}

function forbiddenDefinitionPath(relativePath) {
  return /(?:^|\/)(?:results|holdout|formal-holdout|defect-holdout|escape|secret|formal)(?:\/|$)/iu.test(relativePath);
}

function allowedPostRunPath(relativePath, kind) {
  if (kind === "file") {
    return /^results\/(?:open-smoke\/.+|open-calibration\/(?:normalize|export)\/.+)$/u.test(relativePath);
  }
  return relativePath === "results"
    || relativePath === "results/open-smoke"
    || relativePath.startsWith("results/open-smoke/")
    || relativePath === "results/open-calibration"
    || relativePath === "results/open-calibration/normalize"
    || relativePath.startsWith("results/open-calibration/normalize/")
    || relativePath === "results/open-calibration/export"
    || relativePath.startsWith("results/open-calibration/export/");
}

function validateReadmeBytes(bytes, issues) {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd") || text.includes("\0")) {
    issue(issues, "README_ENCODING_INVALID", SLICE05_DEFINITION_README_PATH, "README must be plain UTF-8 text without NUL bytes");
  }
  const secretPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /\bAKIA[0-9A-Z]{16}\b/u,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /data:image\/png;base64,/iu,
  ];
  if (bytes.includes(Buffer.from("89504e470d0a1a0a", "hex")) || secretPatterns.some((pattern) => pattern.test(text))) {
    issue(issues, "README_EMBEDDED_MATERIAL_FORBIDDEN", SLICE05_DEFINITION_README_PATH, "README must not embed PNG bytes, data URLs, private keys, or credential-shaped tokens");
  }
}

function validateDescriptorSet(index, tree, issues) {
  const descriptors = index?.machineTree?.files;
  if (!Array.isArray(descriptors)) {
    issue(issues, "INDEX_MACHINE_FILES_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.machineTree.files`, "machineTree.files must be an array");
    return { descriptorByPath: new Map(), expectedFiles: [] };
  }
  const descriptorByPath = new Map();
  let previous = null;
  for (const [position, descriptor] of descriptors.entries()) {
    const location = `${SLICE05_DEFINITION_INDEX_PATH}.machineTree.files[${position}]`;
    if (!isRecord(descriptor) || !safeRelativePath(descriptor.path)) {
      issue(issues, "INDEX_MACHINE_FILE_INVALID", location, "machine descriptor must carry a safe path");
      continue;
    }
    if (descriptor.path === SLICE05_DEFINITION_INDEX_PATH || descriptor.path === SLICE05_DEFINITION_README_PATH) {
      issue(issues, "INDEX_MACHINE_SELF_REFERENCE", location, "index and README must remain outside the descendant machine tree");
    }
    if (forbiddenDefinitionPath(descriptor.path)) {
      issue(issues, "FORBIDDEN_DEFINITION_PATH", location, descriptor.path);
    }
    if (descriptorByPath.has(descriptor.path)) issue(issues, "INDEX_MACHINE_DUPLICATE_PATH", location, descriptor.path);
    if (previous !== null && compareText(previous, descriptor.path) >= 0) issue(issues, "INDEX_MACHINE_ORDER_INVALID", location, "machine descriptors must be strictly path-sorted");
    previous = descriptor.path;
    descriptorByPath.set(descriptor.path, descriptor);
  }
  const expectedFiles = [...descriptorByPath.keys(), SLICE05_DEFINITION_INDEX_PATH, SLICE05_DEFINITION_README_PATH].sort(compareText);
  if (!pathsEqual(tree.files, expectedFiles)) {
    issue(issues, "DEFINITION_FILE_ALLOWLIST_MISMATCH", ".", "definition tree contains missing or extra files of one or more extensions");
  }
  const expectedDirectories = new Set();
  for (const relativePath of expectedFiles) {
    const segments = relativePath.split("/").slice(0, -1);
    for (let length = 1; length <= segments.length; length += 1) expectedDirectories.add(segments.slice(0, length).join("/"));
  }
  if (!pathsEqual(tree.directories, expectedDirectories)) {
    issue(issues, "DEFINITION_DIRECTORY_ALLOWLIST_MISMATCH", ".", "definition tree contains missing or extra directories, including empty directories");
  }
  return { descriptorByPath, expectedFiles };
}

function walkObjects(value, callback, location = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkObjects(entry, callback, `${location}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  callback(value, location);
  for (const [key, entry] of Object.entries(value)) walkObjects(entry, callback, `${location}.${key}`);
}

function sameRef(left, right) {
  if (!isRecord(left) || !isRecord(right)) return false;
  return ["path", "id", "contentHash", "byteLength", "fileSha256"]
    .every((key) => left[key] === right[key]);
}

function classifyPath(relativePath) {
  if (relativePath.startsWith("schemas/")) return "schema";
  if (relativePath.startsWith("assets/open/")) return "open-asset";
  if (relativePath.startsWith("sources/")) return "source-provenance";
  if (relativePath.startsWith("artifacts/normalized-inputs/")) return "normalized-input-artifact";
  if (relativePath.startsWith("gold/")) return "gold-record";
  if (relativePath.startsWith("manifests/")) return "fixture-manifest";
  if (relativePath.startsWith("runtime/")) return "runtime-attestation";
  if (relativePath.startsWith("hardware/")) return "hardware-profile";
  if (relativePath.startsWith("rights/")) return "rights-record";
  if (relativePath.startsWith("candidate-locks/")) return "candidate-lock";
  if (relativePath.startsWith("contracts/")) return "capability-contract";
  if (relativePath === "plans/gate-b-smoke.v0.5.0.json") return "gate-b-smoke-plan";
  if (relativePath.startsWith("plans/open-partition-")) return "open-partition-plan";
  if (relativePath.startsWith("preregistrations/")) return "calibration-preregistration";
  return null;
}

async function readDefinitionSnapshot({ sliceRoot, projectRoot, pins, requirePins }) {
  const issues = [];
  const resolvedSliceRoot = path.resolve(sliceRoot);
  const resolvedProjectRoot = path.resolve(projectRoot);
  const allTree = await listSlice05Tree(resolvedSliceRoot);
  issues.push(...allTree.issues);
  const tree = {
    ...allTree,
    files: allTree.files.filter((relativePath) => !allowedPostRunPath(relativePath, "file")),
    directories: allTree.directories.filter((relativePath) => !allowedPostRunPath(relativePath, "directory")),
  };
  let indexFile;
  try {
    indexFile = await readCanonicalJson(resolvedSliceRoot, SLICE05_DEFINITION_INDEX_PATH);
  } catch (error) {
    addThrownIssue(issues, "DEFINITION_INDEX_INVALID", SLICE05_DEFINITION_INDEX_PATH, error);
    return { issues, sliceRoot: resolvedSliceRoot, projectRoot: resolvedProjectRoot, tree };
  }
  const index = indexFile.value;
  if (index.contentHash !== contentHashSlice05Validation(index)) {
    issue(issues, "CONTENT_HASH_MISMATCH", SLICE05_DEFINITION_INDEX_PATH, "definition index contentHash does not match canonical content");
  }
  checkLiteral(issues, "DEFINITION_FREEZE_MISMATCH", "pins.frozenAt", index.frozenAt, pins.frozenAt, requirePins);
  checkLiteral(issues, "DEFINITION_INDEX_CONTENT_PIN_MISMATCH", "pins.definitionIndexContentHash", index.contentHash, pins.definitionIndexContentHash, requirePins);
  checkLiteral(issues, "DEFINITION_INDEX_FILE_PIN_MISMATCH", "pins.definitionIndexFileSha256", indexFile.fileSha256, pins.definitionIndexFileSha256, requirePins);

  const { descriptorByPath, expectedFiles } = validateDescriptorSet(index, tree, issues);
  const jsonByPath = new Map([[SLICE05_DEFINITION_INDEX_PATH, index]]);
  const bytesByPath = new Map([[SLICE05_DEFINITION_INDEX_PATH, indexFile.bytes]]);
  const schemasByPath = new Map();
  const descriptorRecords = [];
  for (const [relativePath, descriptor] of descriptorByPath) {
    let bytes;
    try {
      const file = await assertRealRegularFile(resolvedSliceRoot, relativePath);
      bytes = await readFile(file.absolute);
    } catch (error) {
      addThrownIssue(issues, "MACHINE_FILE_INVALID", relativePath, error);
      continue;
    }
    bytesByPath.set(relativePath, bytes);
    const actualSha256 = sha256Slice05Validation(bytes);
    descriptorRecords.push({ path: relativePath, byteLength: bytes.byteLength, sha256: actualSha256 });
    if (descriptor.byteLength !== bytes.byteLength) issue(issues, "MACHINE_FILE_LENGTH_MISMATCH", `${relativePath}.byteLength`, `${descriptor.byteLength} != ${bytes.byteLength}`);
    if (descriptor.fileSha256 !== actualSha256) issue(issues, "MACHINE_FILE_HASH_MISMATCH", `${relativePath}.fileSha256`, `${descriptor.fileSha256} != ${actualSha256}`);
    const expectedClassification = classifyPath(relativePath);
    if (expectedClassification === null) {
      issue(issues, "MACHINE_FILE_PATH_UNREGISTERED", relativePath, "machine tree path is outside the closed Slice 05 definition layout");
    } else if (descriptor.classification !== expectedClassification) {
      issue(issues, "MACHINE_FILE_CLASSIFICATION_MISMATCH", `${relativePath}.classification`, `${descriptor.classification} != ${expectedClassification}`);
    }
    if (relativePath.endsWith(".json")) {
      try {
        const text = bytes.toString("utf8");
        if (!Buffer.from(text, "utf8").equals(bytes) || text.includes("\ufffd")) throw new Error("JSON is not strict UTF-8");
        const record = JSON.parse(text);
        if (!isRecord(record)) throw new Error("JSON root is not an object");
        if (descriptor.classification !== "schema" && stableStringifySlice05Validation(record) !== text) {
          throw new Error("record JSON is not canonical stable JSON");
        }
        jsonByPath.set(relativePath, record);
        if (descriptor.classification === "schema") schemasByPath.set(relativePath, record);
      } catch (error) {
        addThrownIssue(issues, "MACHINE_JSON_INVALID", relativePath, error);
      }
    }
  }

  const computedDescendantTree = digestSlice05FileRecords(descriptorRecords);
  if (index.machineTree?.fileCount !== descriptorRecords.length) issue(issues, "MACHINE_TREE_COUNT_MISMATCH", `${SLICE05_DEFINITION_INDEX_PATH}.machineTree.fileCount`, `${index.machineTree?.fileCount} != ${descriptorRecords.length}`);
  if (index.machineTree?.sha256 !== computedDescendantTree) issue(issues, "MACHINE_TREE_HASH_MISMATCH", `${SLICE05_DEFINITION_INDEX_PATH}.machineTree.sha256`, `${index.machineTree?.sha256} != ${computedDescendantTree}`);
  checkLiteral(issues, "DESCENDANT_TREE_PIN_MISMATCH", "pins.descendantTreeSha256", computedDescendantTree, pins.descendantTreeSha256, requirePins);

  const schemaRecords = descriptorRecords.filter(({ path: relativePath }) => relativePath.startsWith("schemas/"));
  const schemaTreeSha256 = digestSlice05FileRecords(schemaRecords);
  checkLiteral(issues, "SCHEMA_TREE_PIN_MISMATCH", "pins.schemaTreeSha256", schemaTreeSha256, pins.schemaTreeSha256, requirePins);

  let readmeFile = null;
  try {
    const { absolute } = await assertRealRegularFile(resolvedSliceRoot, SLICE05_DEFINITION_README_PATH);
    const bytes = await readFile(absolute);
    readmeFile = { bytes, fileSha256: sha256Slice05Validation(bytes) };
    validateReadmeBytes(bytes, issues);
    checkLiteral(issues, "README_PIN_MISMATCH", "pins.readmeSha256", readmeFile.fileSha256, pins.readmeSha256, requirePins);
  } catch (error) {
    addThrownIssue(issues, "README_INVALID", SLICE05_DEFINITION_README_PATH, error);
  }
  const fullTree = await digestSlice05Tree(resolvedSliceRoot, tree.files);
  checkLiteral(issues, "FULL_TREE_PIN_MISMATCH", "pins.fullTreeSha256", fullTree.sha256, pins.fullTreeSha256, requirePins);

  return {
    issues,
    sliceRoot: resolvedSliceRoot,
    projectRoot: resolvedProjectRoot,
    tree,
    allTree,
    index,
    indexFile,
    readmeFile,
    descriptorByPath,
    expectedFiles,
    jsonByPath,
    bytesByPath,
    schemasByPath,
    computedDescendantTree,
    schemaTreeSha256,
    fullTreeSha256: fullTree.sha256,
  };
}

function validateSchemasAndRecords(snapshot) {
  const { issues, schemasByPath, jsonByPath, descriptorByPath } = snapshot;
  const schemaPathByVersion = new Map(Object.entries(DEFINITION_SCHEMA_VERSION_TO_FILE));
  for (const [relativePath, schema] of schemasByPath) {
    issues.push(...inspectSlice05Schema(schema, relativePath));
    const expectedName = path.posix.basename(relativePath);
    if (schema.$id !== `https://single-image-studio.invalid/research/slice-05/schemas/${expectedName}`) {
      issue(issues, "SCHEMA_FILE_ID_MISMATCH", `${relativePath}.$id`, String(schema.$id));
    }
    const schemaVersion = schema.properties?.schemaVersion?.const;
    if (typeof schemaVersion === "string") {
      const prior = schemaPathByVersion.get(schemaVersion);
      if (prior && prior !== relativePath) issue(issues, "SCHEMA_VERSION_DUPLICATE", relativePath, `${schemaVersion}: ${prior}`);
      schemaPathByVersion.set(schemaVersion, relativePath);
    }
  }
  for (const [schemaVersion, schemaPath] of Object.entries(DEFINITION_SCHEMA_VERSION_TO_FILE)) {
    if (!schemasByPath.has(schemaPath)) issue(issues, "REQUIRED_SCHEMA_MISSING", schemaPath, `schema for ${schemaVersion} is missing`);
  }
  for (const [role, schemaPath] of Object.entries(SLICE05_RUNNER_SCHEMA_PATHS)) {
    const actual = schemasByPath.get(schemaPath);
    const expected = SLICE05_RUNNER_RECORD_SCHEMAS[role];
    if (!actual || !expected || !deepEqual(actual, expected)) {
      issue(issues, "RUNNER_SCHEMA_SOURCE_DRIFT", schemaPath, `generated ${role} schema must equal the runner's strict exported source exactly`);
    }
  }

  const rejectionArtifactPaths = new Set();
  for (const [relativePath, record] of jsonByPath) {
    if (descriptorByPath.get(relativePath)?.classification !== "fixture-manifest") continue;
    for (const entry of record.entries ?? []) {
      if (entry.expectedDisposition === "rejection-required" && typeof entry.normalizedArtifactRef?.path === "string") {
        rejectionArtifactPaths.add(entry.normalizedArtifactRef.path);
      }
    }
  }

  for (const [relativePath, record] of jsonByPath) {
    if (schemasByPath.has(relativePath)) continue;
    if (typeof record.contentHash !== "string" || record.contentHash !== contentHashSlice05Validation(record)) {
      issue(issues, "CONTENT_HASH_MISMATCH", `${relativePath}.contentHash`, "record contentHash does not match canonical content");
    }
    issues.push(...validateSlice05DefinitionBoundary(record, relativePath));
    const schemaPath = schemaPathByVersion.get(record.schemaVersion);
    const intentionallyMalformedArtifact = rejectionArtifactPaths.has(relativePath);
    if (!schemaPath) {
      if (!intentionallyMalformedArtifact) issue(issues, "SCHEMA_VERSION_UNKNOWN", `${relativePath}.schemaVersion`, String(record.schemaVersion));
      continue;
    }
    const schema = schemasByPath.get(schemaPath);
    if (!schema) continue;
    const instanceIssues = validateSlice05SchemaInstance(record, schema, relativePath);
    if (intentionallyMalformedArtifact) {
      // Some registered rejections are contextual parent-chain defects and therefore remain
      // intrinsically schema-valid. Manifest cross-validation below proves their exact defect.
    } else {
      for (const instanceIssue of instanceIssues) issue(issues, "SCHEMA_INSTANCE_INVALID", instanceIssue.location, instanceIssue.message);
    }
  }
  return rejectionArtifactPaths;
}

async function validateReferences(snapshot) {
  const { issues, projectRoot, sliceRoot, jsonByPath, descriptorByPath } = snapshot;
  const recordsById = new Map();
  const recordPathById = new Map();
  for (const [relativePath, record] of jsonByPath) {
    if (descriptorByPath.has(relativePath) && descriptorByPath.get(relativePath).classification === "schema") continue;
    const identity = recordIdentity(record);
    if (!identity) {
      issue(issues, "RECORD_IDENTITY_MISSING", relativePath, `unknown or missing identity for ${String(record.schemaVersion)}`);
      continue;
    }
    if (recordsById.has(identity.id)) issue(issues, "RECORD_IDENTITY_DUPLICATE", relativePath, identity.id);
    recordsById.set(identity.id, record);
    recordPathById.set(identity.id, relativePath);
  }

  const graph = new Map([...jsonByPath.keys()].map((relativePath) => [relativePath, new Set()]));
  const externalRecordCache = new Map();
  for (const [ownerPath, record] of jsonByPath) {
    if (descriptorByPath.get(ownerPath)?.classification === "schema") continue;
    const references = collectSlice05References(record, ownerPath);
    for (const { location, ref } of [...references.recordRefs, ...references.fileRefs]) {
      const actual = await validateFileIdentity({ projectRoot, sliceRoot, ref, location, issues });
      if (!actual || !Object.hasOwn(ref, "id")) continue;
      let targetRecord;
      if (expectedRootForReference(projectRoot, sliceRoot, ref.path) === sliceRoot) {
        targetRecord = jsonByPath.get(ref.path);
        if (!targetRecord) {
          issue(issues, "RECORD_REFERENCE_TARGET_INVALID", location, `${ref.path} is not a parsed definition record`);
          continue;
        }
        graph.get(ownerPath)?.add(ref.path);
      } else {
        if (!externalRecordCache.has(ref.path)) {
          try {
            const parsed = JSON.parse(actual.bytes.toString("utf8"));
            externalRecordCache.set(ref.path, parsed);
          } catch (error) {
            addThrownIssue(issues, "EXTERNAL_RECORD_JSON_INVALID", ref.path, error);
            continue;
          }
        }
        targetRecord = externalRecordCache.get(ref.path);
      }
      const identity = recordIdentity(targetRecord)
        ?? (() => {
          const externalIdField = ["candidateLockId", "contractId", "partitionPlanId", "manifestId", "sealIntentId"]
            .find((key) => typeof targetRecord?.[key] === "string");
          return externalIdField ? { idField: externalIdField, id: targetRecord[externalIdField] } : null;
        })();
      if (!identity || identity.id !== ref.id) issue(issues, "RECORD_REFERENCE_ID_MISMATCH", `${location}.id`, `${String(ref.id)} != ${String(identity?.id)}`);
      let computedTargetHash = null;
      try {
        computedTargetHash = contentHashSlice05Validation(targetRecord);
      } catch {
        computedTargetHash = null;
      }
      if (targetRecord?.contentHash !== ref.contentHash || computedTargetHash !== ref.contentHash) {
        issue(issues, "RECORD_REFERENCE_CONTENT_HASH_MISMATCH", `${location}.contentHash`, String(ref.contentHash));
      }
    }

    walkObjects(record, (entry, location) => {
      const keys = Object.keys(entry).sort(compareText);
      if (deepEqual(keys, ["contentHash", "id"]) && typeof entry.id === "string" && typeof entry.contentHash === "string") {
        const target = recordsById.get(entry.id);
        if (!target || target.contentHash !== entry.contentHash) {
          issue(issues, "HASH_REFERENCE_INVALID", location, `${entry.id}@${entry.contentHash}`);
        }
      }
    }, ownerPath);
  }

  const state = new Map();
  const visit = (relativePath, stack) => {
    const current = state.get(relativePath) ?? 0;
    if (current === 1) {
      issue(issues, "RECORD_REFERENCE_CYCLE", relativePath, [...stack, relativePath].join(" -> "));
      return;
    }
    if (current === 2) return;
    state.set(relativePath, 1);
    for (const target of graph.get(relativePath) ?? []) visit(target, [...stack, relativePath]);
    state.set(relativePath, 2);
  };
  for (const relativePath of graph.keys()) visit(relativePath, []);

  const implementationRefs = new Map();
  for (const [ownerPath, record] of jsonByPath) {
    if (descriptorByPath.get(ownerPath)?.classification === "schema") continue;
    walkObjects(record, (entry, location) => {
      if (!(typeof entry.id === "string" && typeof entry.version === "string" && typeof entry.path === "string"
        && typeof entry.implementationSha256 === "string")) return;
      const keys = Object.keys(entry).sort(compareText);
      if (!deepEqual(keys, ["id", "implementationSha256", "path", "version"])) return;
      const prior = implementationRefs.get(entry.id);
      if (prior && !deepEqual(prior.ref, entry)) issue(issues, "IMPLEMENTATION_REF_DRIFT", location, entry.id);
      implementationRefs.set(entry.id, { ref: entry, location });
    }, ownerPath);
  }
  for (const { ref, location } of implementationRefs.values()) {
    if (!safeRelativePath(ref.path) || !ref.path.startsWith("scripts/")) {
      issue(issues, "IMPLEMENTATION_PATH_INVALID", `${location}.path`, String(ref.path));
      continue;
    }
    try {
      const { absolute } = await assertRealRegularFile(projectRoot, ref.path);
      const actual = sha256Slice05Validation(await readFile(absolute));
      if (ref.implementationSha256 !== actual) issue(issues, "IMPLEMENTATION_HASH_MISMATCH", `${location}.implementationSha256`, `${ref.implementationSha256} != ${actual}`);
    } catch (error) {
      addThrownIssue(issues, "IMPLEMENTATION_FILE_INVALID", location, error);
    }
  }
  return { recordsById, recordPathById, implementationRefs, externalRecordCache, graph };
}

const EXPECTED_MANIFESTS = Object.freeze([
  Object.freeze({ path: "manifests/normalize-smoke.v0.5.0.json", operation: "normalize", partition: "smoke", total: 6, applicable: 3, rejection: 3 }),
  Object.freeze({ path: "manifests/export-smoke.v0.5.0.json", operation: "export", partition: "smoke", total: 6, applicable: 3, rejection: 3 }),
  Object.freeze({ path: "manifests/normalize-dev.v0.5.0.json", operation: "normalize", partition: "dev/calibration", total: 30, applicable: 18, rejection: 12 }),
  Object.freeze({ path: "manifests/normalize-defect.v0.5.0.json", operation: "normalize", partition: "defect/calibration", total: 18, applicable: 6, rejection: 12 }),
  Object.freeze({ path: "manifests/export-dev.v0.5.0.json", operation: "export", partition: "dev/calibration", total: 30, applicable: 18, rejection: 12 }),
  Object.freeze({ path: "manifests/export-defect.v0.5.0.json", operation: "export", partition: "defect/calibration", total: 18, applicable: 6, rejection: 12 }),
]);

const EXPECTED_CATEGORY_COUNTS = Object.freeze({
  "manifests/normalize-smoke.v0.5.0.json": Object.freeze({
    "canonical-alpha-holes-source-png": 1,
    "canonical-opaque-source-png": 1,
    "canonical-partial-alpha-source-png": 1,
    "container-signature-or-crc-invalid": 1,
    "pixel-layout-color-or-metadata-invalid": 1,
    "resource-limit-or-unsupported-format": 1,
  }),
  "manifests/export-smoke.v0.5.0.json": Object.freeze({
    "color-alpha-or-metadata-invalid": 1,
    "normalized-artifact-shape-or-contract-invalid": 1,
    "parent-identity-file-or-pixel-hash-invalid": 1,
    "valid-alpha-holes-normalized-artifact": 1,
    "valid-opaque-normalized-artifact": 1,
    "valid-partial-alpha-normalized-artifact": 1,
  }),
  "manifests/normalize-dev.v0.5.0.json": Object.freeze({
    "canonical-alpha-holes-source-png": 6,
    "canonical-opaque-source-png": 6,
    "canonical-partial-alpha-source-png": 6,
    "container-signature-or-crc-invalid": 4,
    "pixel-layout-color-or-metadata-invalid": 4,
    "resource-limit-or-unsupported-format": 4,
  }),
  "manifests/normalize-defect.v0.5.0.json": Object.freeze({
    "injected-container-signature-or-crc-defect": 4,
    "injected-defect-control-alpha-holes-source-png": 2,
    "injected-defect-control-opaque-source-png": 2,
    "injected-defect-control-partial-alpha-source-png": 2,
    "injected-pixel-layout-color-or-metadata-defect": 4,
    "injected-resource-limit-or-unsupported-format-defect": 4,
  }),
  "manifests/export-dev.v0.5.0.json": Object.freeze({
    "color-alpha-or-metadata-invalid": 4,
    "normalized-artifact-shape-or-contract-invalid": 4,
    "parent-identity-file-or-pixel-hash-invalid": 4,
    "valid-alpha-holes-normalized-artifact": 6,
    "valid-opaque-normalized-artifact": 6,
    "valid-partial-alpha-normalized-artifact": 6,
  }),
  "manifests/export-defect.v0.5.0.json": Object.freeze({
    "injected-color-alpha-or-metadata-defect": 4,
    "injected-defect-control-alpha-holes-normalized-artifact": 2,
    "injected-defect-control-opaque-normalized-artifact": 2,
    "injected-defect-control-partial-alpha-normalized-artifact": 2,
    "injected-normalized-artifact-shape-or-contract-defect": 4,
    "injected-parent-identity-file-or-pixel-hash-defect": 4,
  }),
});

const EXPECTED_DEFECT_COUNTS = Object.freeze({
  "manifests/normalize-smoke.v0.5.0.json": Object.freeze({
    "single-defect.idat-crc-mismatch": 1,
    "single-defect.missing-srgb-chunk": 1,
    "single-defect.unsupported-jpeg": 1,
  }),
  "manifests/export-smoke.v0.5.0.json": Object.freeze({
    "single-defect.normalized-metadata-policy-invalid": 1,
    "single-defect.normalized-schema-version-invalid": 1,
    "single-defect.parent-pixel-hash-chain-invalid": 1,
  }),
  "manifests/normalize-dev.v0.5.0.json": Object.freeze({
    "single-defect.byte-limit-plus-one": 1,
    "single-defect.idat-crc-mismatch": 4,
    "single-defect.missing-srgb-chunk": 4,
    "single-defect.unsupported-jpeg": 1,
    "single-defect.unsupported-octet-stream": 1,
    "single-defect.unsupported-webp": 1,
  }),
  "manifests/normalize-defect.v0.5.0.json": Object.freeze({
    "single-defect.byte-limit-plus-one": 1,
    "single-defect.idat-crc-mismatch": 4,
    "single-defect.missing-srgb-chunk": 4,
    "single-defect.unsupported-jpeg": 1,
    "single-defect.unsupported-octet-stream": 1,
    "single-defect.unsupported-webp": 1,
  }),
  "manifests/export-dev.v0.5.0.json": Object.freeze({
    "single-defect.normalized-metadata-policy-invalid": 4,
    "single-defect.normalized-schema-version-invalid": 4,
    "single-defect.parent-pixel-hash-chain-invalid": 4,
  }),
  "manifests/export-defect.v0.5.0.json": Object.freeze({
    "single-defect.normalized-metadata-policy-invalid": 4,
    "single-defect.normalized-schema-version-invalid": 4,
    "single-defect.parent-pixel-hash-chain-invalid": 4,
  }),
});

const CONTRACT_IDS = Object.freeze({
  normalize: "CC-CAP02-NORMALIZE-PNG@0.5.0",
  export: "CC-CAP02-EXPORT-PNG@0.5.0",
});

const CONTRACT_PATHS = Object.freeze({
  normalize: "contracts/cc-cap02-normalize-png.v0.5.0.json",
  export: "contracts/cc-cap02-export-png.v0.5.0.json",
});

const EXPECTED_PROFILE_COMMON = Object.freeze({
  mime: "image/png",
  maxBytes: 1024 * 1024,
  maxWidth: 256,
  maxHeight: 256,
  pixelLayout: "RGBA8",
  colorSpace: "embedded-sRGB",
  orientation: 1,
  alphaMode: "straight-unpremultiplied",
  metadataPolicy: "strip-all-except-color-contract",
  pngFilterPolicy: "filter-0-only",
  interlace: "forbidden",
  animation: "forbidden",
});

const EXPECTED_OPTIONAL_RESULTS = Object.freeze([
  Object.freeze({ resultKind: "local-run-request.slice05.v0", pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/requests/[0-9a-f]{64}\\.request\\.json$", schemaPath: "schemas/local-run-request.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "idempotency-claim.slice05.v0", pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/claims/[0-9a-f]{64}\\.claim\\.json$", schemaPath: "schemas/idempotency-claim.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "run-event.slice05.v0", pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/ledger/events\\.ndjson$", schemaPath: "schemas/run-event.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "run-result.slice05.v0", pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/records/[0-9a-f]{64}\\.result\\.json$", schemaPath: "schemas/run-result.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "fault-semantics-result.slice05.v0", pathPattern: "^results/open-smoke/fault/fault-semantics-result\\.slice05\\.v0\\.json$", schemaPath: "schemas/fault-semantics-result.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "smoke-session-audit.slice05.v0", pathPattern: "^results/open-smoke/audit/(?:normalize|export)\\.smoke-session-audit\\.slice05\\.v0\\.json$", schemaPath: "schemas/smoke-session-audit.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "smoke-summary.slice05.v0", pathPattern: "^results/open-smoke/summaries/(?:normalize|export)\\.smoke-summary\\.slice05\\.v0\\.json$", schemaPath: "schemas/smoke-summary.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "gate-b-decision.slice05.v0", pathPattern: "^results/open-smoke/decisions/(?:normalize|export)\\.gate-b-decision\\.slice05\\.v0\\.json$", schemaPath: "schemas/gate-b-decision.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "calibration-admission.slice05.v0", pathPattern: "^results/open-calibration/(?:normalize|export)/admission/calibration-admission\\.slice05\\.v0\\.json$", schemaPath: "schemas/calibration-admission.slice05.v0.schema.json" }),
  Object.freeze({ resultKind: "calibration-summary.slice05.v0", pathPattern: "^results/open-calibration/(?:normalize|export)/summaries/calibration-summary\\.slice05\\.v0\\.json$", schemaPath: "schemas/calibration-summary.slice05.v0.schema.json" }),
]);

function semanticEqual(issues, code, location, actual, expected) {
  if (!deepEqual(actual, expected)) issue(issues, code, location, `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

function validateCoreDefinitionSemantics(snapshot, references) {
  const { issues, index, jsonByPath, descriptorByPath, bytesByPath, schemasByPath } = snapshot;
  if (!index) return;
  if (index.schemaVersion !== "definition-index.slice05.v0" || index.definitionIndexId !== "DEFINITION-INDEX-SLICE05@0.5.0"
    || index.recordVersion !== "0.5.0" || index.definitionState !== "frozen-definition-no-results") {
    issue(issues, "DEFINITION_INDEX_IDENTITY_INVALID", SLICE05_DEFINITION_INDEX_PATH, "definition index identity/state is not the frozen 0.5.0 definition");
  }
  semanticEqual(issues, "DEFINITION_COUNTS_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.counts`, index.counts, {
    schemas: 25,
    manifests: 6,
    sourceProvenanceRecords: 108,
    openRawAssets: 108,
    normalizedInputArtifactRecords: 54,
    applicableIndependentNormalizedInputs: 27,
    goldRecords: 54,
    formalFixtures: 0,
    generatedResults: 0,
  });
  semanticEqual(issues, "INITIAL_RESULT_STATE_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.initialResultStateAtDefinitionFreeze`, index.initialResultStateAtDefinitionFreeze, {
    resultsDirectoryPresent: false,
    resultFilesPresent: 0,
    admissionRecordsPresent: 0,
    ledgersPresent: 0,
  });
  const exactStaticPaths = [
    "candidate-locks/composite-sharp-win32-x64.v0.5.0.json",
    "contracts/cc-cap02-export-png.v0.5.0.json",
    "contracts/cc-cap02-normalize-png.v0.5.0.json",
    "hardware/hardware.win32-x64.v0.5.0.json",
    "runtime/attestation.win32-x64.v0.5.0.json",
    "rights/open-synthetic.v0.5.0.json",
    "plans/gate-b-smoke.v0.5.0.json",
    "plans/open-partition-export.v0.5.0.json",
    "plans/open-partition-normalize.v0.5.0.json",
    "preregistrations/calibration-export-png.v0.5.0.json",
    "preregistrations/calibration-normalize-png.v0.5.0.json",
    ...EXPECTED_MANIFESTS.map(({ path: relativePath }) => relativePath),
  ];
  const staticPrefixes = new Set(exactStaticPaths.map((relativePath) => relativePath.split("/")[0]));
  const actualStaticPaths = [...bytesByPath.keys()].filter((relativePath) => staticPrefixes.has(relativePath.split("/")[0]));
  if (!pathsEqual(actualStaticPaths, exactStaticPaths)) {
    issue(issues, "STATIC_DEFINITION_PATH_SET_INVALID", "machineTree.files", "fixed record directories contain a missing or unregistered path");
  }
  const expectedSchemaPaths = new Set([
    ...Object.values(DEFINITION_SCHEMA_VERSION_TO_FILE),
    ...Object.values(SLICE05_RUNNER_SCHEMA_PATHS),
  ]);
  if (!pathsEqual(schemasByPath.keys(), expectedSchemaPaths)) {
    issue(issues, "SCHEMA_PATH_SET_INVALID", "schemas", "schema directory must contain exactly the 25 registered schemas");
  }
  if (index.proseReadmeRef?.path !== SLICE05_DEFINITION_README_PATH
    || index.proseReadmeRef?.byteLength !== snapshot.readmeFile?.bytes.byteLength
    || index.proseReadmeRef?.fileSha256 !== snapshot.readmeFile?.fileSha256) {
    issue(issues, "README_REF_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.proseReadmeRef`, "README byte length and SHA-256 must match the separately frozen prose file");
  }

  const candidatePath = "candidate-locks/composite-sharp-win32-x64.v0.5.0.json";
  const candidate = jsonByPath.get(candidatePath);
  if (!candidate || candidate.candidateLockId !== "REG-NORM-SHARP@0.5.0" || candidate.recordVersion !== "0.5.0") {
    issue(issues, "CANDIDATE_IDENTITY_INVALID", candidatePath, "Slice 05 runtime candidate must be REG-NORM-SHARP@0.5.0");
  } else {
    if (!sameRef(index.candidateRef, {
      path: candidatePath,
      id: candidate.candidateLockId,
      contentHash: candidate.contentHash,
      byteLength: descriptorByPath.get(candidatePath)?.byteLength,
      fileSha256: descriptorByPath.get(candidatePath)?.fileSha256,
    })) issue(issues, "INDEX_CANDIDATE_REF_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.candidateRef`, "index candidate ref is not exact");
    semanticEqual(issues, "CANDIDATE_STATE_INVALID", `${candidatePath}.stateAtDefinitionFreeze`, candidate.stateAtDefinitionFreeze, {
      installation: "installed-and-inventoried",
      execution: "candidate-pipeline-not-run",
      gateA: "runtime-closure-resolved",
      gateB: "not-evaluated",
      calibration: "blocked-until-operation-specific-gate-b-pass",
    });
    if (candidate.runtimeClosure?.slice04PackagingMetadataErratumCount !== 9
      || candidate.runtimeClosure?.installedVersionCount !== 28 || candidate.runtimeClosure?.nativeArtifactCount !== 3) {
      issue(issues, "CANDIDATE_RUNTIME_CLOSURE_INVALID", `${candidatePath}.runtimeClosure`, "runtime closure must pin 28 native versions, 9 errata, and 3 native binaries");
    }
    const roles = candidate.implementationRefs?.map(({ role }) => role) ?? [];
    for (const requiredRole of ["candidate-adapter", "candidate-worker", "independent-oracle", "runtime-inventory", "independent-fixture-generator"]) {
      if (roles.filter((role) => role === requiredRole).length !== 1) issue(issues, "CANDIDATE_IMPLEMENTATION_ROLE_INVALID", `${candidatePath}.implementationRefs`, requiredRole);
    }
    for (const entry of candidate.implementationRefs ?? []) {
      const expectedDependency = entry.role === "candidate-adapter" || entry.role === "candidate-worker";
      if (entry.candidateDependency !== expectedDependency) issue(issues, "CANDIDATE_DEPENDENCY_CLASSIFICATION_INVALID", `${candidatePath}.implementationRefs`, entry.role);
    }
  }

  for (const operation of ["normalize", "export"]) {
    const contractPath = CONTRACT_PATHS[operation];
    const contract = jsonByPath.get(contractPath);
    if (!contract || contract.contractId !== CONTRACT_IDS[operation] || contract.operation !== operation
      || contract.candidateRef?.id !== "REG-NORM-SHARP@0.5.0") {
      issue(issues, "CONTRACT_IDENTITY_INVALID", contractPath, `${operation} contract must use the Slice 05 candidate and contract ID`);
      continue;
    }
    const expectedInputType = operation === "normalize" ? "canonical-png-source-bytes" : "NormalizedImage.slice04.v0";
    const expectedOutputType = operation === "normalize" ? "NormalizedImage.slice04.v0" : "DeliveryArtifact.slice04.v0";
    semanticEqual(issues, "CONTRACT_INPUT_PROFILE_EXPANDED", `${contractPath}.inputProfile`, contract.inputProfile, { type: expectedInputType, ...EXPECTED_PROFILE_COMMON });
    semanticEqual(issues, "CONTRACT_OUTPUT_PROFILE_EXPANDED", `${contractPath}.outputProfile`, contract.outputProfile, { type: expectedOutputType, ...EXPECTED_PROFILE_COMMON });
    if (contract.gateBStateAtDefinitionFreeze !== "not-evaluated" || contract.calibrationStateAtDefinitionFreeze !== "blocked-until-this-operation-gate-b-passes"
      || contract.formalHoldoutStatusAtDefinitionFreeze !== "not-created" || contract.formalDefectHoldoutStatusAtDefinitionFreeze !== "not-created"
      || contract.formalEscapeStatusAtDefinitionFreeze !== "not-created") {
      issue(issues, "CONTRACT_BOUNDARY_INVALID", contractPath, "contract was promoted beyond definition-only Gate B state");
    }
    const expectedRoles = operation === "normalize"
      ? ["output-normalized-image"] : ["input-normalized-image", "output-delivery-artifact"];
    semanticEqual(issues, "CONTRACT_ARTIFACT_SCHEMA_REFS_INVALID", `${contractPath}.artifactSchemaRefs.roles`, contract.artifactSchemaRefs?.map(({ role }) => role), expectedRoles);
    semanticEqual(issues, "CONTRACT_RUNNER_SCHEMA_REFS_INVALID", `${contractPath}.runnerRecordSchemaRefs`, contract.runnerRecordSchemaRefs?.map(({ role, schemaVersion, file }) => ({ role, schemaVersion, path: file?.path })), [
      { role: "local-run-request", schemaVersion: "local-run-request.slice05.v0", path: "schemas/local-run-request.slice05.v0.schema.json" },
      { role: "terminal-run-result", schemaVersion: "run-result.slice05.v0", path: "schemas/run-result.slice05.v0.schema.json" },
      { role: "independent-oracle-result", schemaVersion: "oracle-result.slice05.v0", path: "schemas/oracle-result.slice05.v0.schema.json" },
    ]);
  }

  const runtimePath = "runtime/attestation.win32-x64.v0.5.0.json";
  const runtime = jsonByPath.get(runtimePath);
  if (!runtime || runtime.runtimeAttestationId !== "RUNTIME-SHARP-WIN32-X64@0.5.0" || runtime.runtimeCandidateId !== "REG-NORM-SHARP@0.5.0") {
    issue(issues, "RUNTIME_IDENTITY_INVALID", runtimePath, "runtime attestation identity is invalid");
  } else {
    const errata = runtime.versions?.slice04PackagingMetadataErratum ?? [];
    semanticEqual(issues, "RUNTIME_ERRATUM_COMPONENTS_INVALID", `${runtimePath}.versions.slice04PackagingMetadataErratum`, errata.map(({ componentId }) => componentId).sort(compareText), ["archive", "expat", "ffi", "glib", "heif", "pango", "rsvg", "tiff", "uhdr"]);
    if (runtime.executionBoundary?.imageBytesRead !== false || runtime.executionBoundary?.imageDecoded !== false
      || runtime.executionBoundary?.imageEncoded !== false || runtime.executionBoundary?.candidatePipelineInvoked !== false
      || runtime.executionBoundary?.hostnameRecorded !== false || runtime.executionBoundary?.serialRecorded !== false) {
      issue(issues, "RUNTIME_DEFINITION_EXECUTION_BOUNDARY_INVALID", `${runtimePath}.executionBoundary`, "definition attestation must not process image bytes or record host identifiers");
    }
  }

  const rights = jsonByPath.get("rights/open-synthetic.v0.5.0.json");
  if (!rights || rights.rightsRecordId !== "RIGHTS-OPEN-SYNTHETIC@0.5.0"
    || rights.provenance?.generatedLocally !== true || rights.provenance?.thirdPartyAssetsUsed !== false
    || rights.provenance?.realUserPhotosUsed !== false || rights.provenance?.modelWeightsUsed !== false
    || rights.provenance?.candidateOutputUsedToDefineGold !== false) {
    issue(issues, "RIGHTS_BOUNDARY_INVALID", "rights/open-synthetic.v0.5.0.json", "rights record must remain project-original synthetic and candidate-independent");
  }

  const implementationHashes = [...references.implementationRefs.values()].map(({ ref }) => ref.implementationSha256);
  const expectedImplementationRoles = {
    "candidate-adapter": ["ADAPTER-SHARP-NORMALIZE-EXPORT@0.5.0", "scripts/research-sharp-adapter-slice05.mjs"],
    "candidate-worker": ["WORKER-SHARP-ISOLATED@0.5.0", "scripts/research-sharp-worker-slice05.mjs"],
    "independent-oracle": ["ORACLE-INDEPENDENT-PNG@0.5.0", "scripts/research-independent-png-oracle-slice05.mjs"],
    "runtime-inventory": ["INVENTORY-SHARP-RUNTIME@0.5.0", "scripts/research-inventory-sharp-slice05.mjs"],
    "independent-fixture-generator": ["GEN-INDEPENDENT-OPEN-PNG@0.5.0", "scripts/research-generate-slice05.mjs"],
    "local-open-runner": ["RUNNER-LOCAL-OPEN@0.5.0", "scripts/research-run-slice05.mjs"],
    "fault-semantics-worker": ["WORKER-FAULT-SEMANTICS@0.5.0", "scripts/research-slice05-fault-worker.mjs"],
  };
  if (!Array.isArray(index.implementationRefs) || index.implementationRefs.length !== Object.keys(expectedImplementationRoles).length) {
    issue(issues, "INDEX_IMPLEMENTATION_ROLE_SET_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.implementationRefs`, "index must pin exactly seven implementations");
  } else {
    const seenRoles = new Set();
    for (const { role, ref } of index.implementationRefs) {
      const expected = expectedImplementationRoles[role];
      if (!expected || seenRoles.has(role) || ref?.id !== expected[0] || ref?.path !== expected[1]) {
        issue(issues, "INDEX_IMPLEMENTATION_ROLE_SET_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.implementationRefs`, String(role));
      }
      seenRoles.add(role);
    }
  }
  if (new Set(implementationHashes).size !== implementationHashes.length) {
    issue(issues, "IMPLEMENTATION_INDEPENDENCE_INVALID", "implementationRefs", "candidate, oracle, generator, inventory, runner, and fault-worker source hashes must be distinct");
  }
  for (const relativePath of descriptorByPath.keys()) {
    if (forbiddenDefinitionPath(relativePath)) issue(issues, "FORBIDDEN_DEFINITION_PATH", relativePath, "formal/holdout/escape/result/secret material is forbidden at definition freeze");
  }
  if ([...bytesByPath.keys()].some((relativePath) => relativePath.startsWith("results/"))) {
    issue(issues, "RESULTS_PRESENT_AT_DEFINITION", "results", "definition tree must not contain result material");
  }
}

const DEFECT_ERROR_CODES = Object.freeze({
  "single-defect.idat-crc-mismatch": "S05_INPUT_CRC_MISMATCH",
  "single-defect.missing-srgb-chunk": "S05_INPUT_SRGB_REQUIRED",
  "single-defect.unsupported-jpeg": "S05_NORMALIZE_SOURCE_DECLARATION_INVALID",
  "single-defect.unsupported-webp": "S05_NORMALIZE_SOURCE_DECLARATION_INVALID",
  "single-defect.unsupported-octet-stream": "S05_NORMALIZE_SOURCE_DECLARATION_INVALID",
  "single-defect.byte-limit-plus-one": "S05_NORMALIZE_SOURCE_DECLARATION_INVALID",
  "single-defect.normalized-schema-version-invalid": "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID",
  "single-defect.parent-pixel-hash-chain-invalid": "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID",
  "single-defect.normalized-metadata-policy-invalid": "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID",
});

function refFromRecord(snapshot, relativePath, id) {
  const record = snapshot.jsonByPath.get(relativePath);
  const descriptor = snapshot.descriptorByPath.get(relativePath);
  if (!record || !descriptor) return null;
  return { path: relativePath, id, contentHash: record.contentHash, byteLength: descriptor.byteLength, fileSha256: descriptor.fileSha256 };
}

function validateManifestAndFixtureSemantics(snapshot) {
  const { issues, jsonByPath, bytesByPath } = snapshot;
  const allSourceIds = new Set();
  const allFamilyIds = new Set();
  const allSessionIds = new Set();
  const allRawHashes = new Set();
  const seenRawPaths = new Set();
  const seenSourceProvenancePaths = new Set();
  const seenNormalizedPaths = new Set();
  const seenGoldPaths = new Set();

  for (const expected of EXPECTED_MANIFESTS) {
    const manifest = jsonByPath.get(expected.path);
    if (!manifest) {
      issue(issues, "MANIFEST_MISSING", expected.path, "required operation-specific manifest is missing");
      continue;
    }
    if (manifest.operationScope?.length !== 1 || manifest.operationScope[0] !== expected.operation
      || manifest.partition !== expected.partition || manifest.entries?.length !== expected.total) {
      issue(issues, "MANIFEST_OPERATION_PARTITION_INVALID", expected.path, "manifest operation, partition, or source count drifted");
    }
    const applicable = (manifest.entries ?? []).filter(({ expectedDisposition }) => expectedDisposition === "artifact-required").length;
    const rejection = (manifest.entries ?? []).filter(({ expectedDisposition }) => expectedDisposition === "rejection-required").length;
    const categoryCounts = {};
    const defectCounts = {};
    for (const entry of manifest.entries ?? []) {
      categoryCounts[entry.categoryId] = (categoryCounts[entry.categoryId] ?? 0) + 1;
      const defectId = entry.injectedDefect?.defectId;
      if (typeof defectId === "string") defectCounts[defectId] = (defectCounts[defectId] ?? 0) + 1;
    }
    semanticEqual(issues, "MANIFEST_CATEGORY_COUNTS_INVALID", `${expected.path}.entries.categoryId`, categoryCounts, EXPECTED_CATEGORY_COUNTS[expected.path]);
    semanticEqual(issues, "MANIFEST_DEFECT_COUNTS_INVALID", `${expected.path}.entries.injectedDefect`, defectCounts, EXPECTED_DEFECT_COUNTS[expected.path]);
    semanticEqual(issues, "MANIFEST_COUNTS_INVALID", `${expected.path}.counts`, manifest.counts, {
      totalSources: expected.total,
      applicableSources: expected.applicable,
      rejectionSources: expected.rejection,
      repetitionsPerSource: 3,
      totalPlannedAttempts: expected.total * 3,
      byOperation: [{ operation: expected.operation, totalSources: expected.total, applicableSources: expected.applicable, rejectionSources: expected.rejection }],
    });
    if (applicable !== expected.applicable || rejection !== expected.rejection) {
      issue(issues, "MANIFEST_DENOMINATOR_INVALID", expected.path, `${applicable}/${rejection} != ${expected.applicable}/${expected.rejection}`);
    }
    if (manifest.candidateRef?.id !== "REG-NORM-SHARP@0.5.0" || manifest.contractRefs?.length !== 1
      || manifest.contractRefs[0]?.id !== CONTRACT_IDS[expected.operation]) {
      issue(issues, "MANIFEST_CANDIDATE_CONTRACT_REF_INVALID", expected.path, "manifest candidate/contract ref drifted across operations");
    }
    if (manifest.formalBoundary?.formal !== false || manifest.formalBoundary?.c1Eligible !== false
      || manifest.formalBoundary?.holdoutMaterial !== false) {
      issue(issues, "MANIFEST_FORMAL_BOUNDARY_INVALID", `${expected.path}.formalBoundary`, "open manifests cannot become formal or C1-eligible");
    }

    for (const [entryIndex, entry] of (manifest.entries ?? []).entries()) {
      const location = `${expected.path}.entries[${entryIndex}]`;
      if (entry.operation !== expected.operation || entry.partition !== expected.partition || entry.repetitions !== 3) {
        issue(issues, "MANIFEST_ENTRY_SCOPE_INVALID", location, "entry operation/partition/repetitions drifted");
      }
      for (const [set, value, code] of [
        [allSourceIds, entry.sourceId, "SOURCE_ID_REUSED"],
        [allFamilyIds, entry.sourceFamilyId, "SOURCE_FAMILY_REUSED"],
        [allSessionIds, entry.captureSessionId, "CAPTURE_SESSION_REUSED"],
        [allRawHashes, entry.rawAsset?.fileSha256, "RAW_ASSET_HASH_REUSED"],
      ]) {
        if (typeof value !== "string" || set.has(value)) issue(issues, code, location, String(value));
        else set.add(value);
      }
      const applicableEntry = entry.expectedDisposition === "artifact-required";
      const defectId = entry.injectedDefect?.defectId ?? null;
      if (applicableEntry) {
        if (entry.expectedStableErrorCode !== null || entry.injectedDefect !== null) issue(issues, "APPLICABLE_ENTRY_DEFECT_INVALID", location, "applicable entries cannot carry a stable error or injected defect");
      } else {
        if (entry.injectedDefect?.exactlyOneInjectedDefect !== true || !Object.hasOwn(DEFECT_ERROR_CODES, defectId)
          || DEFECT_ERROR_CODES[defectId] !== entry.expectedStableErrorCode) {
          issue(issues, "REJECTION_ENTRY_DEFECT_INVALID", location, `${String(defectId)} / ${String(entry.expectedStableErrorCode)}`);
        }
      }

      const provenancePath = entry.sourceProvenanceRef?.path;
      const provenance = jsonByPath.get(provenancePath);
      if (!provenance || seenSourceProvenancePaths.has(provenancePath)) {
        issue(issues, "SOURCE_PROVENANCE_REF_INVALID", `${location}.sourceProvenanceRef`, String(provenancePath));
        continue;
      }
      seenSourceProvenancePaths.add(provenancePath);
      const rawAssetProjection = {
        path: provenance.rawAsset?.path,
        mime: provenance.rawAsset?.mime,
        byteLength: provenance.rawAsset?.byteLength,
        fileSha256: provenance.rawAsset?.fileSha256,
        decodedPixelSha256: provenance.rawAsset?.decodedPixelSha256,
        sourceDeclarationDecodedPixelSha256: provenance.rawAsset?.sourceDeclarationDecodedPixelSha256,
      };
      semanticEqual(issues, "RAW_ASSET_REF_DRIFT", `${location}.rawAsset`, entry.rawAsset, rawAssetProjection);
      if (provenance.operation !== expected.operation || provenance.partition !== expected.partition
        || provenance.categoryId !== entry.categoryId || provenance.expectedDisposition !== entry.expectedDisposition
        || provenance.expectedStableErrorCode !== entry.expectedStableErrorCode
        || provenance.sourceFamilyId !== entry.sourceFamilyId || provenance.captureSessionId !== entry.captureSessionId) {
        issue(issues, "SOURCE_PROVENANCE_SCOPE_DRIFT", provenancePath, "source provenance does not match its one manifest entry");
      }
      if (provenance.candidateIndependence?.candidateProduced !== false
        || provenance.candidateIndependence?.candidateOutputUsed !== false
        || provenance.candidateIndependence?.candidateDependencyUsed !== false
        || provenance.generatorRef?.id !== "GEN-INDEPENDENT-OPEN-PNG@0.5.0") {
        issue(issues, "SOURCE_PROVENANCE_CANDIDATE_TAINTED", provenancePath, "source provenance must be independent of the candidate");
      }
      const rawBytes = bytesByPath.get(entry.rawAsset?.path);
      if (typeof entry.rawAsset?.path === "string") seenRawPaths.add(entry.rawAsset.path);
      if (!rawBytes || rawBytes.byteLength !== entry.rawAsset.byteLength
        || sha256Slice05Validation(rawBytes) !== entry.rawAsset.fileSha256) {
        issue(issues, "RAW_ASSET_IDENTITY_INVALID", `${location}.rawAsset`, String(entry.rawAsset?.path));
      } else if (entry.rawAsset.decodedPixelSha256 !== null) {
        try {
          const decoded = decodeIndependentPngSlice05(rawBytes);
          if (decoded.decodedPixelSha256 !== entry.rawAsset.decodedPixelSha256
            || decoded.width !== provenance.rawAsset.width || decoded.height !== provenance.rawAsset.height
            || decoded.alphaPresent !== provenance.rawAsset.alphaPresent) {
            issue(issues, "RAW_ASSET_PIXEL_IDENTITY_INVALID", `${location}.rawAsset`, "independent reopen does not match frozen pixel identity");
          }
        } catch (error) {
          addThrownIssue(issues, "RAW_ASSET_INDEPENDENT_REOPEN_FAILED", `${location}.rawAsset`, error);
        }
      } else if (applicableEntry || expected.operation === "export") {
        issue(issues, "RAW_ASSET_PIXEL_IDENTITY_MISSING", `${location}.rawAsset.decodedPixelSha256`, "applicable and export raw inputs require an independent pixel identity");
      }

      if (expected.operation === "normalize") {
        if (entry.normalizedArtifactRef !== null) issue(issues, "NORMALIZE_ENTRY_HAS_NORMALIZED_INPUT", location, "normalize source cannot point to a pre-normalized input");
        if (provenance.sourceId !== entry.sourceId) issue(issues, "NORMALIZE_SOURCE_ID_DRIFT", provenancePath, `${provenance.sourceId} != ${entry.sourceId}`);
      } else {
        const artifactPath = entry.normalizedArtifactRef?.path;
        const artifact = jsonByPath.get(artifactPath);
        if (!artifact || seenNormalizedPaths.has(artifactPath)) {
          issue(issues, "EXPORT_NORMALIZED_INPUT_REF_INVALID", `${location}.normalizedArtifactRef`, String(artifactPath));
        } else {
          seenNormalizedPaths.add(artifactPath);
          if (entry.normalizedArtifactRef.producerKind !== "independent-fixture-generator"
            || artifact.producerRef?.kind !== "independent-fixture-generator"
            || artifact.producerRef?.id !== "GEN-INDEPENDENT-OPEN-PNG@0.5.0") {
            issue(issues, "EXPORT_FIXTURE_PRODUCER_INVALID", artifactPath, "every frozen export input must truthfully identify the independent fixture generator");
          }
          const baseChainValid = artifact.artifactId === entry.sourceId && artifact.parent?.sourceAssetId === provenance.sourceId
            && artifact.parent?.sourceFileSha256 === entry.rawAsset.fileSha256
            && artifact.parent?.sourceDecodedPixelSha256 === entry.rawAsset.decodedPixelSha256
            && artifact.parent?.sourceManifestSha256 === provenance.contentHash
            && artifact.bytes?.relativePath === entry.rawAsset.path && artifact.bytes?.byteLength === entry.rawAsset.byteLength
            && artifact.bytes?.fileSha256 === entry.rawAsset.fileSha256
            && artifact.candidateRef?.id === "REG-NORM-SHARP@0.5.0"
            && artifact.capabilityContractRef?.id === CONTRACT_IDS.normalize;
          const pixelChainValid = artifact.bytes?.decodedPixelSha256 === entry.rawAsset.decodedPixelSha256;
          const registeredPixelChainDefect = defectId === "single-defect.parent-pixel-hash-chain-invalid";
          if (!baseChainValid || (registeredPixelChainDefect ? pixelChainValid : !pixelChainValid)) {
            issue(issues, "EXPORT_NORMALIZED_INPUT_CHAIN_INVALID", artifactPath, registeredPixelChainDefect
              ? "registered parent-pixel defect is not the sole chain mismatch"
              : "normalized input does not bind the exact independent raw/provenance/contract/candidate chain");
          }
          let accepted = true;
          try {
            validateNormalizedImageSlice05(artifact);
          } catch {
            accepted = false;
          }
          const mustFailIntrinsicValidation = defectId === "single-defect.normalized-schema-version-invalid"
            || defectId === "single-defect.normalized-metadata-policy-invalid";
          if ((applicableEntry && !accepted) || (mustFailIntrinsicValidation && accepted)) {
            issue(issues, "EXPORT_NORMALIZED_INPUT_DISPOSITION_INVALID", artifactPath, `accepted=${accepted}, applicable=${applicableEntry}`);
          }
        }
      }

      const goldPath = entry.goldRecordRef?.path;
      if (applicableEntry) {
        const gold = jsonByPath.get(goldPath);
        if (!gold || seenGoldPaths.has(goldPath)) {
          issue(issues, "GOLD_RECORD_REF_INVALID", `${location}.goldRecordRef`, String(goldPath));
        } else {
          seenGoldPaths.add(goldPath);
          try {
            validateGoldRecordSlice05(gold);
          } catch (error) {
            addThrownIssue(issues, "GOLD_RECORD_INVALID", goldPath, error);
          }
          const parentIdentity = gold.expected?.parentIdentity;
          const artifact = expected.operation === "export" ? jsonByPath.get(entry.normalizedArtifactRef?.path) : null;
          if (gold.operation !== expected.operation || gold.sourceId !== entry.sourceId || gold.partition !== expected.partition
            || gold.provenance?.candidateProduced !== false || gold.provenance?.candidateOutputUsed !== false
            || gold.provenance?.candidateDependencyUsed !== false || gold.provenance?.producerId !== "GEN-INDEPENDENT-OPEN-PNG@0.5.0"
            || parentIdentity?.id !== entry.sourceId || parentIdentity?.manifestSha256 !== provenance.contentHash
            || parentIdentity?.fileSha256 !== entry.rawAsset.fileSha256
            || parentIdentity?.decodedPixelSha256 !== entry.rawAsset.decodedPixelSha256
            || parentIdentity?.artifactSha256 !== (artifact?.contentHash ?? null)
            || gold.expected?.decodedPixelSha256 !== entry.rawAsset.decodedPixelSha256
            || gold.expected?.fileSha256 !== null) {
            issue(issues, "GOLD_RECORD_CROSSLINK_INVALID", goldPath, "gold does not bind the exact independent manifest/parent/pixel chain");
          }
        }
      } else if (entry.goldRecordRef !== null) {
        issue(issues, "REJECTION_ENTRY_HAS_GOLD", location, "rejection fixtures cannot carry an artifact-success gold record");
      }
    }
  }

  if (allSourceIds.size !== 108 || allFamilyIds.size !== 108 || allSessionIds.size !== 108 || allRawHashes.size !== 108
    || seenSourceProvenancePaths.size !== 108 || seenNormalizedPaths.size !== 54 || seenGoldPaths.size !== 54) {
    issue(issues, "GLOBAL_FIXTURE_COUNTS_INVALID", "manifests", JSON.stringify({
      sourceIds: allSourceIds.size,
      families: allFamilyIds.size,
      sessions: allSessionIds.size,
      rawHashes: allRawHashes.size,
      provenance: seenSourceProvenancePaths.size,
      normalized: seenNormalizedPaths.size,
      gold: seenGoldPaths.size,
    }));
  }
  for (const [prefix, expectedPaths] of [
    ["sources/", seenSourceProvenancePaths],
    ["assets/open/", seenRawPaths],
    ["artifacts/normalized-inputs/", seenNormalizedPaths],
    ["gold/", seenGoldPaths],
  ]) {
    const actualPaths = [...bytesByPath.keys()].filter((relativePath) => relativePath.startsWith(prefix));
    if (!pathsEqual(actualPaths, expectedPaths)) {
      issue(issues, "FIXTURE_FILE_PATH_SET_INVALID", prefix, "fixture directory contains a missing or unreferenced file");
    }
  }
}

function validatePlansAndPreregistrations(snapshot) {
  const { issues, jsonByPath } = snapshot;
  const gatePath = "plans/gate-b-smoke.v0.5.0.json";
  const gate = jsonByPath.get(gatePath);
  if (!gate || gate.gateBPlanId !== "GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0"
    || gate.candidateRef?.id !== "REG-NORM-SHARP@0.5.0" || gate.operationPlans?.length !== 2) {
    issue(issues, "GATE_B_PLAN_IDENTITY_INVALID", gatePath, "Gate B plan must contain exactly two operation-specific plans");
  } else {
    if (gate.goldRecordSchemaRef?.path !== "schemas/gold-record.slice05.v0.schema.json") {
      issue(issues, "GATE_B_GOLD_SCHEMA_REF_INVALID", `${gatePath}.goldRecordSchemaRef`, "Gate B must pin the independent gold schema");
    }
    const operations = gate.operationPlans.map(({ operation }) => operation);
    semanticEqual(issues, "GATE_B_OPERATION_SET_INVALID", `${gatePath}.operationPlans`, operations, ["normalize", "export"]);
    for (const operationPlan of gate.operationPlans) {
      const expectedManifest = EXPECTED_MANIFESTS.find(({ operation, partition }) => operation === operationPlan.operation && partition === "smoke");
      const manifest = jsonByPath.get(expectedManifest?.path);
      const expectedCases = (manifest?.entries ?? []).map(({ sourceId, categoryId, expectedDisposition, expectedStableErrorCode }) => ({
        sourceId, categoryId, expectedDisposition, expectedStableErrorCode,
      }));
      if (!expectedManifest || operationPlan.contractRef?.id !== CONTRACT_IDS[operationPlan.operation]
        || operationPlan.smokeManifestRef?.path !== expectedManifest.path
        || operationPlan.sourceCount !== 6 || operationPlan.applicableSources !== 3
        || operationPlan.rejectionSources !== 3 || operationPlan.repetitionsPerSource !== 3
        || operationPlan.initialGateBState !== "not-evaluated") {
        issue(issues, "GATE_B_OPERATION_PLAN_INVALID", `${gatePath}.${String(operationPlan.operation)}`, "Gate B operation scope/count/ref drifted");
      }
      semanticEqual(issues, "GATE_B_CASE_MAPPING_INVALID", `${gatePath}.${String(operationPlan.operation)}.cases`, operationPlan.cases, expectedCases);
      const gateIds = operationPlan.conjunctiveGates?.map(({ gateId }) => gateId) ?? [];
      if (gateIds.length !== 12 || new Set(gateIds).size !== 12
        || !gateIds.every((gateId) => gateId.startsWith(`gate-b.${operationPlan.operation}.`))
        || !(operationPlan.conjunctiveGates ?? []).every(({ initialState, passRequired }) => initialState === "not-evaluated" && passRequired === true)) {
        issue(issues, "GATE_B_CONJUNCTION_INVALID", `${gatePath}.${String(operationPlan.operation)}.conjunctiveGates`, "all 12 operation-scoped conjuncts must start not-evaluated and be required");
      }
    }
    if (gate.crossOperationAggregationAllowed !== false || gate.smokeCountsAsCapabilityEvidence !== false
      || gate.formalPartitionsCreatedAtDefinitionFreeze !== false || gate.resultsStateAtDefinitionFreeze !== "not-created") {
      issue(issues, "GATE_B_DEFINITION_BOUNDARY_INVALID", gatePath, "Gate B definition cannot aggregate operations, create results/formal material, or count as capability evidence");
    }
  }

  const paths = {
    normalize: {
      plan: "plans/open-partition-normalize.v0.5.0.json",
      prereg: "preregistrations/calibration-normalize-png.v0.5.0.json",
      manifests: ["manifests/normalize-dev.v0.5.0.json", "manifests/normalize-defect.v0.5.0.json"],
    },
    export: {
      plan: "plans/open-partition-export.v0.5.0.json",
      prereg: "preregistrations/calibration-export-png.v0.5.0.json",
      manifests: ["manifests/export-dev.v0.5.0.json", "manifests/export-defect.v0.5.0.json"],
    },
  };
  for (const operation of ["normalize", "export"]) {
    const expected = paths[operation];
    const plan = jsonByPath.get(expected.plan);
    if (!plan || plan.operation !== operation || plan.candidateRef?.id !== "REG-NORM-SHARP@0.5.0"
      || plan.contractRef?.id !== CONTRACT_IDS[operation]
      || !deepEqual(plan.manifestRefs?.map(({ path: relativePath }) => relativePath), expected.manifests)) {
      issue(issues, "OPEN_PARTITION_PLAN_IDENTITY_INVALID", expected.plan, "open plan candidate/contract/manifest scope drifted");
    } else {
      semanticEqual(issues, "OPEN_PARTITION_COUNTS_INVALID", `${expected.plan}.openCounts`, plan.openCounts, {
        devCalibrationSources: 30,
        defectCalibrationSources: 18,
        totalSources: 48,
        repetitionsPerSource: 3,
        totalPlannedAttempts: 144,
      });
      const partitionMap = new Map((plan.partitions ?? []).map((partition) => [partition.partition, partition]));
      for (const [partitionName, count] of [["dev/calibration", 30], ["defect/calibration", 18]]) {
        const partition = partitionMap.get(partitionName);
        if (!partition || partition.operation !== operation || partition.plannedIndependentSources !== count
          || partition.runRepetitionsPerSource !== 3 || partition.formal !== false || partition.excludedFromInitialC1 !== true
          || partition.repeatPassRule?.plannedRepetitions !== 3 || partition.repeatPassRule?.requiredValidPasses !== 3
          || partition.repeatPassRule?.maximumInvalidReplacementsPerSourceAcrossAllRepetitions !== 1
          || partition.repeatPassRule?.invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt !== true
          || partition.repeatPassRule?.validNonPassRerunAllowed !== false || partition.repeatPassRule?.majorityVoteAllowed !== false) {
          issue(issues, "OPEN_PARTITION_REPEAT_DENOMINATOR_INVALID", `${expected.plan}.${partitionName}`, "partition must retain 3/3 all-pass and max-one no-result replacement per source across all repetitions");
        }
      }
      if (plan.formalBoundary?.holdoutAtDefinitionFreeze !== "not-created"
        || plan.formalBoundary?.defectHoldoutAtDefinitionFreeze !== "not-created"
        || plan.formalBoundary?.escapeAtDefinitionFreeze !== "not-created"
        || plan.formalBoundary?.formalSources !== 0 || plan.formalBoundary?.c1Denominator !== 0
        || plan.formalBoundary?.holdoutSeedsPresent !== false) {
        issue(issues, "OPEN_PARTITION_FORMAL_BOUNDARY_INVALID", `${expected.plan}.formalBoundary`, "open plan must not create formal partitions or denominator");
      }
    }

    const prereg = jsonByPath.get(expected.prereg);
    if (!prereg || prereg.operation !== operation || prereg.candidateRef?.id !== "REG-NORM-SHARP@0.5.0"
      || prereg.contractRef?.id !== CONTRACT_IDS[operation] || prereg.gateBSmokePlanRef?.path !== gatePath
      || prereg.openPartitionPlanRef?.path !== expected.plan
      || !deepEqual(prereg.calibrationManifestRefs?.map(({ path: relativePath }) => relativePath), expected.manifests)) {
      issue(issues, "CALIBRATION_PREREGISTRATION_IDENTITY_INVALID", expected.prereg, "calibration prereg candidate/contract/plan/manifest scope drifted");
    } else {
      if (prereg.goldRecordSchemaRef?.path !== "schemas/gold-record.slice05.v0.schema.json") {
        issue(issues, "CALIBRATION_GOLD_SCHEMA_REF_INVALID", `${expected.prereg}.goldRecordSchemaRef`, "calibration preregistration must pin the independent gold schema");
      }
      semanticEqual(issues, "CALIBRATION_DENOMINATORS_INVALID", `${expected.prereg}.denominators`, prereg.denominators, {
        devCalibration: { sources: 30, applicable: 18, rejection: 12 },
        defectCalibration: { sources: 18, applicableControls: 6, rejectionDefects: 12 },
        repetitionsPerSource: 3,
        totalSources: 48,
        totalPlannedAttempts: 144,
      });
      if (prereg.crossOperationGateAggregationAllowed !== false
        || prereg.rerunRule !== "no-valid-outcome-rerun-and-at-most-one-predeclared-no-result-replacement-per-source-across-three-repetitions"
        || prereg.formalBoundary?.holdoutAtDefinitionFreeze !== "not-created"
        || prereg.formalBoundary?.defectHoldoutAtDefinitionFreeze !== "not-created"
        || prereg.formalBoundary?.escapeAtDefinitionFreeze !== "not-created"
        || prereg.formalBoundary?.formalRunsAllowed !== false || prereg.formalBoundary?.c1Denominator !== 0) {
        issue(issues, "CALIBRATION_PREREGISTRATION_BOUNDARY_INVALID", expected.prereg, "prereg must retain operation isolation, no valid rerun, max-one no-result replacement, and no formal denominator");
      }
    }
  }
}

async function recheckRuntimeInventory(snapshot, providedInventory = undefined) {
  const { issues, projectRoot, jsonByPath, index } = snapshot;
  let inventory = providedInventory;
  try {
    if (inventory === undefined) {
      const { inventorySharpRuntimeSlice05 } = await import("./research-inventory-sharp-slice05.mjs");
      inventory = await inventorySharpRuntimeSlice05({ projectRoot });
    }
  } catch (error) {
    addThrownIssue(issues, "RUNTIME_INVENTORY_RECHECK_FAILED", "runtime", error);
    return null;
  }
  const runtimePath = "runtime/attestation.win32-x64.v0.5.0.json";
  const runtime = jsonByPath.get(runtimePath);
  const candidate = jsonByPath.get("candidate-locks/composite-sharp-win32-x64.v0.5.0.json");
  if (!runtime || !inventory) return inventory;
  semanticEqual(issues, "RUNTIME_PACKAGE_MANIFEST_DRIFT", `${runtimePath}.packageManifest`, runtime.packageManifest, {
    path: inventory.packageManifest.path,
    sha256: inventory.packageManifest.sha256,
    exactDevDependencies: inventory.packageManifest.devDependencies,
  });
  semanticEqual(issues, "RUNTIME_PACKAGE_LOCK_DRIFT", `${runtimePath}.packageLock`, runtime.packageLock, {
    path: inventory.packageLock.path,
    sha256: inventory.packageLock.sha256,
    expectedSha256: inventory.packageLock.expectedSha256,
    lockfileVersion: inventory.packageLock.lockfileVersion,
    pins: inventory.packageLock.pins,
  });
  semanticEqual(issues, "RUNTIME_INSTALLED_CLOSURE_DRIFT", `${runtimePath}.installedClosure`, runtime.installedClosure, {
    allowlist: inventory.installed.allowlist,
    packages: inventory.installed.packages,
    ignoredEmptyScopeDirectories: inventory.installed.ignoredEmptyScopeDirectories,
    fileCount: inventory.installed.tree.fileCount,
    treeSha256: inventory.installed.tree.sha256,
    nativeArtifacts: inventory.installed.nativeArtifacts,
  });
  semanticEqual(issues, "RUNTIME_INSTALLED_VERSIONS_DRIFT", `${runtimePath}.versions.installed`, runtime.versions?.installed, inventory.versions.installedVersionsJson.values);
  semanticEqual(issues, "RUNTIME_SHARP_VERSIONS_DRIFT", `${runtimePath}.versions.sharpRuntime`, runtime.versions?.sharpRuntime, inventory.versions.sharpRuntime.values);
  const expectedErrata = inventory.versions.slice04PackagingMetadataComparison.differences.map((entry) => ({
    componentId: entry.componentId,
    slice04PackagingMetadataVersion: entry.slice04PackagingMetadataVersion,
    installedRuntimeVersion: entry.installedVersionsJsonVersion,
    disposition: entry.disposition,
  }));
  semanticEqual(issues, "RUNTIME_ERRATUM_DRIFT", `${runtimePath}.versions.slice04PackagingMetadataErratum`, runtime.versions?.slice04PackagingMetadataErratum, expectedErrata);
  semanticEqual(issues, "RUNTIME_ENVIRONMENT_DRIFT", `${runtimePath}.environment`, runtime.environment, inventory.environment);
  if (runtime.versions?.installedVersionsJsonSha256 !== inventory.versions.installedVersionsJson.sha256
    || runtime.inventoryRef?.inventoryPayloadSha256 !== inventory.attestation.payloadSha256
    || index.runtimeAttestationRef?.inventoryPayloadSha256 !== inventory.attestation.payloadSha256) {
    issue(issues, "RUNTIME_ATTESTATION_PAYLOAD_DRIFT", runtimePath, "runtime/index inventory payload pins do not match the fresh attestation");
  }
  if (candidate?.runtimeClosure?.packageLockSha256 !== inventory.packageLock.sha256
    || candidate?.runtimeClosure?.installedTreeSha256 !== inventory.installed.tree.sha256
    || candidate?.runtimeClosure?.nativeArtifactCount !== inventory.installed.nativeArtifacts.length
    || candidate?.runtimeClosure?.installedVersionCount !== inventory.versions.installedVersionsJson.componentCount
    || candidate?.runtimeClosure?.slice04PackagingMetadataErratumCount !== inventory.versions.slice04PackagingMetadataComparison.differenceCount) {
    issue(issues, "CANDIDATE_RUNTIME_CLOSURE_DRIFT", "candidate-locks/composite-sharp-win32-x64.v0.5.0.json.runtimeClosure", "candidate closure differs from the fresh runtime inventory");
  }
  if (inventory.executionBoundary?.candidatePipelineInvoked !== false
    || inventory.versions?.sharpRuntime?.imageProcessingPerformed !== false) {
    issue(issues, "RUNTIME_RECHECK_PROCESSED_IMAGE", "runtimeInventory", "definition validation may import Sharp only for version inventory and must never process image bytes");
  }
  return inventory;
}

async function seedRegenerationRoot({ canonicalRoot, temporaryRoot }) {
  await mkdir(path.join(temporaryRoot, "schemas"), { recursive: true });
  await copyFile(path.join(canonicalRoot, SLICE05_DEFINITION_README_PATH), path.join(temporaryRoot, SLICE05_DEFINITION_README_PATH));
  for (const relativePath of [
    "schemas/delivery-artifact.slice04.v0.schema.json",
    "schemas/gold-record.slice05.v0.schema.json",
    "schemas/normalized-image.slice04.v0.schema.json",
    "schemas/oracle-result.slice05.v0.schema.json",
  ]) {
    await copyFile(path.join(canonicalRoot, relativePath), path.join(temporaryRoot, relativePath));
  }
}

async function regenerateDefinitionTwice(snapshot, runtimeInventory) {
  const { issues, sliceRoot, projectRoot, index } = snapshot;
  const wrappers = [];
  try {
    for (const suffix of ["a-", "b-"]) {
      const wrapper = await mkdtemp(path.join(tmpdir(), `single-image-studio-s05-validate-${suffix}`));
      const resolvedWrapper = await realpath(wrapper);
      if (isInside(projectRoot, resolvedWrapper) || isInside(sliceRoot, resolvedWrapper)) {
        throw new Error(`regeneration root is not outside the repository: ${resolvedWrapper}`);
      }
      const temporaryRoot = path.join(wrapper, "slice-05");
      await seedRegenerationRoot({ canonicalRoot: sliceRoot, temporaryRoot });
      wrappers.push({ wrapper, temporaryRoot });
    }
    const { generateSlice05 } = await import("./research-generate-slice05.mjs");
    for (const { temporaryRoot } of wrappers) {
      await generateSlice05({ sliceRoot: temporaryRoot, projectRoot, frozenAt: index.frozenAt, runtimeInventory });
    }
    issues.push(...await compareSlice05TreesByteForByte(wrappers[0].temporaryRoot, wrappers[1].temporaryRoot));
    issues.push(...await compareSlice05TreesByteForByte(wrappers[0].temporaryRoot, sliceRoot, {
      exclude: allowedPostRunPath,
    }));
  } catch (error) {
    addThrownIssue(issues, "DEFINITION_REGENERATION_FAILED", "regeneration", error);
  } finally {
    await Promise.all(wrappers.map(({ wrapper }) => rm(wrapper, { recursive: true, force: true })));
  }
}

function validateOptionalResultDeclarations(snapshot) {
  const { issues, index, jsonByPath } = snapshot;
  const declarations = index.expectedOptionalResults;
  if (!Array.isArray(declarations) || declarations.length < 1) {
    issue(issues, "OPTIONAL_RESULT_DECLARATIONS_MISSING", `${SLICE05_DEFINITION_INDEX_PATH}.expectedOptionalResults`, "closed-smoke result types and strict schemas must be frozen before any run");
    return;
  }
  const kinds = new Set();
  const patterns = new Set();
  const allowedSchemaPaths = new Set(Object.values(SLICE05_RUNNER_SCHEMA_PATHS));
  for (const [indexPosition, declaration] of declarations.entries()) {
    const location = `${SLICE05_DEFINITION_INDEX_PATH}.expectedOptionalResults[${indexPosition}]`;
    if (kinds.has(declaration.resultKind)) issue(issues, "OPTIONAL_RESULT_KIND_DUPLICATE", location, String(declaration.resultKind));
    kinds.add(declaration.resultKind);
    if (patterns.has(declaration.pathPattern)) issue(issues, "OPTIONAL_RESULT_PATTERN_DUPLICATE", location, String(declaration.pathPattern));
    patterns.add(declaration.pathPattern);
    if (declaration.initialState !== "not-created" || declaration.requiredForDefinitionValidity !== false) {
      issue(issues, "OPTIONAL_RESULT_INITIAL_STATE_INVALID", location, "optional results must remain absent and unnecessary for definition validity");
    }
    const exactExpected = EXPECTED_OPTIONAL_RESULTS[indexPosition];
    if (!exactExpected || declaration.resultKind !== exactExpected.resultKind
      || declaration.pathPattern !== exactExpected.pathPattern || declaration.schemaFile?.path !== exactExpected.schemaPath) {
      issue(issues, "OPTIONAL_RESULT_DECLARATION_DRIFT", location, "result kind, path pattern, and runner schema must equal the frozen declaration at this position");
    }
    if (typeof declaration.pathPattern !== "string" || !declaration.pathPattern.startsWith("^results/")
      || !declaration.pathPattern.endsWith("$") || /holdout|escape|formal|secret/iu.test(declaration.pathPattern)) {
      issue(issues, "OPTIONAL_RESULT_PATTERN_INVALID", `${location}.pathPattern`, String(declaration.pathPattern));
    } else {
      try {
        new RegExp(declaration.pathPattern, "u");
      } catch (error) {
        addThrownIssue(issues, "OPTIONAL_RESULT_PATTERN_INVALID", `${location}.pathPattern`, error);
      }
    }
    if (!allowedSchemaPaths.has(declaration.schemaFile?.path) || !jsonByPath.has(declaration.schemaFile?.path)) {
      issue(issues, "OPTIONAL_RESULT_SCHEMA_INVALID", `${location}.schemaFile`, String(declaration.schemaFile?.path));
    }
  }
  if (declarations.length !== EXPECTED_OPTIONAL_RESULTS.length) {
    issue(issues, "OPTIONAL_RESULT_DECLARATION_COUNT_INVALID", `${SLICE05_DEFINITION_INDEX_PATH}.expectedOptionalResults`, `${declarations.length} != ${EXPECTED_OPTIONAL_RESULTS.length}`);
  }
  const gate = jsonByPath.get("plans/gate-b-smoke.v0.5.0.json");
  const declaredSchemaPaths = new Set(declarations.map(({ schemaFile }) => schemaFile?.path));
  const gateSchemaPaths = new Set((gate?.resultSchemaRefs ?? []).map(({ path: relativePath }) => relativePath));
  if (!deepEqual([...declaredSchemaPaths].sort(compareText), [...gateSchemaPaths].sort(compareText))) {
    issue(issues, "GATE_B_RESULT_SCHEMA_SET_INVALID", "plans/gate-b-smoke.v0.5.0.json.resultSchemaRefs", "Gate B schemas must exactly cover the preregistered optional closed-smoke result kinds");
  }
}

export async function validateSlice05OptionalClosedSmokeResults({
  sliceRoot = DEFAULT_SLICE05_DEFINITION_ROOT,
  resultsRoot = path.join(sliceRoot, "results", "open-smoke"),
  index = undefined,
} = {}) {
  const issues = [];
  const requestedResultsRoot = path.resolve(resultsRoot);
  try {
    const rootStats = await lstat(requestedResultsRoot);
    const resolvedResultsRoot = await realpath(requestedResultsRoot);
    const normalizeBoundaryPath = (value) => normalizeRelative(path.resolve(value)).toLowerCase();
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()
      || normalizeBoundaryPath(resolvedResultsRoot) !== normalizeBoundaryPath(requestedResultsRoot)) {
      issue(issues, "OPTIONAL_RESULT_ROOT_LINK_FORBIDDEN", requestedResultsRoot, "closed-smoke results root must be one real directory, never a symlink or junction");
    }
    if (/(?:^|\/)(?:holdout|formal-holdout|defect-holdout|escape|formal|secret)(?:\/|$)/u.test(normalizeBoundaryPath(requestedResultsRoot))
      || /(?:^|\/)(?:holdout|formal-holdout|defect-holdout|escape|formal|secret)(?:\/|$)/u.test(normalizeBoundaryPath(resolvedResultsRoot))) {
      issue(issues, "OPTIONAL_RESULT_ROOT_BOUNDARY_FORBIDDEN", requestedResultsRoot, "closed-smoke validation cannot be retargeted to formal, holdout, escape, or secret material");
    }
  } catch (error) {
    addThrownIssue(issues, "OPTIONAL_RESULT_ROOT_INVALID", requestedResultsRoot, error);
  }
  let definitionIndex = index;
  let definitionIndexFile;
  if (definitionIndex === undefined) {
    try {
      definitionIndexFile = await readCanonicalJson(sliceRoot, SLICE05_DEFINITION_INDEX_PATH);
      definitionIndex = definitionIndexFile.value;
    } catch (error) {
      addThrownIssue(issues, "DEFINITION_INDEX_INVALID", SLICE05_DEFINITION_INDEX_PATH, error);
      return { valid: false, issues };
    }
  } else {
    try {
      definitionIndexFile = await readCanonicalJson(sliceRoot, SLICE05_DEFINITION_INDEX_PATH);
    } catch (error) {
      addThrownIssue(issues, "DEFINITION_INDEX_INVALID", SLICE05_DEFINITION_INDEX_PATH, error);
      return { valid: false, issues };
    }
  }
  const declarations = definitionIndex.expectedOptionalResults ?? [];
  const tree = await listSlice05Tree(resultsRoot);
  issues.push(...tree.issues);
  const schemaCache = new Map();
  const optionalRecords = [];
  const ledgerEvents = [];
  const unmatchedFiles = new Set();

  async function loadSchema(schemaPath) {
    if (schemaCache.has(schemaPath)) return schemaCache.get(schemaPath);
    try {
      const bytes = await readFile(path.join(sliceRoot, schemaPath));
      const schema = JSON.parse(bytes.toString("utf8"));
      schemaCache.set(schemaPath, schema);
      return schema;
    } catch (error) {
      addThrownIssue(issues, "OPTIONAL_RESULT_SCHEMA_INVALID", schemaPath, error);
      return null;
    }
  }

  function schemaCheck(record, schema, location) {
    if (!schema) return;
    for (const schemaIssue of validateSlice05SchemaInstance(record, schema, location)) {
      issue(issues, "OPTIONAL_RESULT_SCHEMA_INSTANCE_INVALID", schemaIssue.location, schemaIssue.message);
    }
  }

  for (const relativePath of tree.files) {
    const definitionRelative = `results/open-smoke/${relativePath}`;
    if (/(?:^|\/)(?:holdout|formal-holdout|defect-holdout|escape|formal|secret)(?:\/|$)/iu.test(definitionRelative)) {
      issue(issues, "OPTIONAL_RESULT_PATH_FORBIDDEN", definitionRelative, "closed-smoke result path contains forbidden material");
      continue;
    }
    const matches = declarations.filter(({ pathPattern }) => {
      try {
        return new RegExp(pathPattern, "u").test(definitionRelative);
      } catch {
        return false;
      }
    });
    if (matches.length !== 1) {
      unmatchedFiles.add(relativePath);
      continue;
    }
    const schemaPath = matches[0].schemaFile.path;
    const schema = await loadSchema(schemaPath);
    if (relativePath.endsWith(".ndjson")) {
      try {
        const text = await readFile(path.join(resultsRoot, relativePath), "utf8");
        if (text.length < 1 || !text.endsWith("\n")) throw new Error("append-only ledger must end at a complete LF-delimited record");
        const lines = text.slice(0, -1).split("\n");
        for (const [lineIndex, line] of lines.entries()) {
          const event = JSON.parse(line);
          const eventLocation = `${definitionRelative}[${lineIndex}]`;
          if (JSON.stringify(stableValue(event)) !== line) issue(issues, "LEDGER_EVENT_CANONICAL_INVALID", eventLocation, "ledger line is not stable compact JSON");
          schemaCheck(event, schema, eventLocation);
          if (event.contentHash !== contentHashSlice05Validation(event)) issue(issues, "LEDGER_EVENT_CONTENT_HASH_INVALID", eventLocation, "event content hash mismatch");
          ledgerEvents.push({ record: event, location: eventLocation });
        }
      } catch (error) {
        addThrownIssue(issues, "OPTIONAL_RESULT_LEDGER_INVALID", definitionRelative, error);
      }
      continue;
    }
    if (!relativePath.endsWith(".json")) {
      issue(issues, "OPTIONAL_RESULT_EXTENSION_INVALID", definitionRelative, "registered record must be JSON or the one NDJSON ledger");
      continue;
    }
    try {
      const parsed = await readCanonicalJson(resultsRoot, relativePath);
      const record = parsed.value;
      if (record.schemaVersion !== matches[0].resultKind) issue(issues, "OPTIONAL_RESULT_KIND_MISMATCH", `${definitionRelative}.schemaVersion`, `${String(record.schemaVersion)} != ${matches[0].resultKind}`);
      if (record.schemaVersion === "calibration-admission.slice05.v0" || record.schemaVersion === "calibration-summary.slice05.v0") {
        issue(issues, "CALIBRATION_RESULT_IN_SMOKE_FORBIDDEN", definitionRelative, record.schemaVersion);
      }
      if (record.contentHash !== contentHashSlice05Validation(record)) issue(issues, "OPTIONAL_RESULT_CONTENT_HASH_INVALID", `${definitionRelative}.contentHash`, "result record hash mismatch");
      issues.push(...validateSlice05DefinitionBoundary(record, definitionRelative));
      schemaCheck(record, schema, definitionRelative);
      try {
        if (record.schemaVersion === "fault-semantics-result.slice05.v0") validateSlice05FaultResult(record);
        if (record.schemaVersion === "smoke-session-audit.slice05.v0") validateSlice05SessionAudit(record);
        if (record.schemaVersion === "smoke-summary.slice05.v0") validateSmokeSummarySlice05(record);
        if (record.schemaVersion === "gate-b-decision.slice05.v0") validateGateBDecisionSlice05(record);
      } catch (error) {
        addThrownIssue(issues, "OPTIONAL_RESULT_RUNTIME_VALIDATION_FAILED", definitionRelative, error);
      }
      optionalRecords.push({
        record,
        relativePath,
        definitionRelative,
        byteLength: parsed.bytes.byteLength,
        fileSha256: parsed.fileSha256,
      });
    } catch (error) {
      addThrownIssue(issues, "OPTIONAL_RESULT_JSON_INVALID", definitionRelative, error);
    }
  }

  const byVersion = new Map();
  for (const item of optionalRecords) {
    const entries = byVersion.get(item.record.schemaVersion) ?? [];
    entries.push(item);
    byVersion.set(item.record.schemaVersion, entries);
  }
  const requests = byVersion.get("local-run-request.slice05.v0") ?? [];
  const claims = byVersion.get("idempotency-claim.slice05.v0") ?? [];
  const results = byVersion.get("run-result.slice05.v0") ?? [];
  const faultResults = byVersion.get("fault-semantics-result.slice05.v0") ?? [];
  const sessionAudits = byVersion.get("smoke-session-audit.slice05.v0") ?? [];
  const smokeSummaries = byVersion.get("smoke-summary.slice05.v0") ?? [];
  const gateBDecisions = byVersion.get("gate-b-decision.slice05.v0") ?? [];

  function evidenceRefFor(item, idField) {
    return {
      path: item.relativePath,
      id: item.record[idField],
      contentHash: item.record.contentHash,
      byteLength: item.byteLength,
      fileSha256: item.fileSha256,
    };
  }

  function exactEvidenceRef(actual, item, idField, code, location) {
    if (!sameRef(actual, evidenceRefFor(item, idField))) {
      issue(issues, code, location, "reference does not bind the exact canonical result record bytes");
      return false;
    }
    return true;
  }

  const definitionRef = {
    path: SLICE05_DEFINITION_INDEX_PATH,
    id: definitionIndex.definitionIndexId,
    contentHash: definitionIndex.contentHash,
    byteLength: definitionIndexFile.bytes.byteLength,
    fileSha256: definitionIndexFile.fileSha256,
  };
  const implementationByRole = new Map((definitionIndex.implementationRefs ?? []).map(({ role, ref }) => [role, ref]));
  const runtimeImplementationRef = (ref) => ref ? ({
    id: ref.id,
    version: ref.version,
    implementationSha256: ref.implementationSha256,
  }) : null;
  const expectedAdapterRef = runtimeImplementationRef(implementationByRole.get("candidate-adapter"));
  const expectedOracleRef = runtimeImplementationRef(implementationByRole.get("independent-oracle"));
  const smokeManifestsByPath = new Map();
  for (const manifestDeclaration of definitionIndex.smokeManifestRefs ?? []) {
    const manifestRef = manifestDeclaration?.ref;
    try {
      const parsed = await readCanonicalJson(sliceRoot, manifestRef.path);
      const manifest = parsed.value;
      const actualRef = {
        path: manifestRef.path,
        id: manifest.manifestId,
        contentHash: manifest.contentHash,
        byteLength: parsed.bytes.byteLength,
        fileSha256: parsed.fileSha256,
      };
      if (!sameRef(manifestRef, actualRef)) {
        issue(issues, "SMOKE_MANIFEST_DEFINITION_REF_INVALID", manifestRef.path, "definition index does not bind the exact smoke manifest bytes");
      }
      if (manifestDeclaration.operation !== manifest.operationScope?.[0]) {
        issue(issues, "SMOKE_MANIFEST_DEFINITION_REF_INVALID", manifestRef.path, "definition index operation wrapper differs from the referenced manifest");
      }
      smokeManifestsByPath.set(manifestRef.path, { manifest, ref: actualRef });
    } catch (error) {
      addThrownIssue(issues, "SMOKE_MANIFEST_DEFINITION_REF_INVALID", String(manifestRef?.path ?? manifestDeclaration?.path), error);
    }
  }

  const requestById = new Map();
  const claimByRequest = new Map();
  const resultByRequest = new Map();
  for (const item of requests) {
    try {
      validateSlice05RunRequest(item.record);
    } catch (error) {
      addThrownIssue(issues, "RUN_REQUEST_RUNTIME_VALIDATION_FAILED", item.definitionRelative, error);
    }
    if (requestById.has(item.record.requestId)) issue(issues, "RUN_REQUEST_DUPLICATE", item.definitionRelative, item.record.requestId);
    const keyHash = sha256Slice05Validation(Buffer.from(item.record.attempt.idempotencyKey, "utf8"));
    if (item.relativePath !== `requests/${keyHash}.request.json`) {
      issue(issues, "RUN_REQUEST_FILENAME_INVALID", item.definitionRelative, "request filename must equal SHA-256(idempotencyKey)");
    }
    requestById.set(item.record.requestId, item);
  }
  for (const item of claims) {
    const request = requestById.get(item.record.requestRef?.id)?.record;
    if (!request || request.contentHash !== item.record.requestRef.contentHash) {
      issue(issues, "RUN_CLAIM_REQUEST_REF_INVALID", item.definitionRelative, String(item.record.requestRef?.id));
      continue;
    }
    const expectedKeyHash = sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8"));
    if (item.record.idempotencyKeyHash !== expectedKeyHash || item.record.claimId !== `claim.${expectedKeyHash}` || item.record.mode !== request.mode
      || item.record.operation !== request.operation || !deepEqual(item.record.attempt, request.attempt)
      || Date.parse(item.record.claimedAt) < Date.parse(request.createdAt)) {
      issue(issues, "RUN_CLAIM_BINDING_INVALID", item.definitionRelative, "claim is not the exact time-ordered request/idempotency/attempt binding");
    }
    if (item.relativePath !== `claims/${expectedKeyHash}.claim.json`) {
      issue(issues, "RUN_CLAIM_FILENAME_INVALID", item.definitionRelative, "claim filename must equal SHA-256(idempotencyKey)");
    }
    const prior = claimByRequest.get(request.requestId);
    if (prior) issue(issues, "RUN_CLAIM_DUPLICATE", item.definitionRelative, request.requestId);
    claimByRequest.set(request.requestId, item);
  }
  for (const item of results) {
    try {
      validateSlice05RunResult(item.record);
    } catch (error) {
      addThrownIssue(issues, "RUN_RESULT_RUNTIME_VALIDATION_FAILED", item.definitionRelative, error);
    }
    const request = requestById.get(item.record.requestRef?.id)?.record;
    if (!request || request.contentHash !== item.record.requestRef.contentHash
      || item.record.idempotencyKeyHash !== sha256Slice05Validation(Buffer.from(request?.attempt?.idempotencyKey ?? "", "utf8"))
      || item.record.mode !== request?.mode || item.record.operation !== request?.operation
      || !deepEqual(item.record.attempt, request?.attempt)
      || item.record.expectedDisposition !== request?.expectedDisposition
      || item.record.expectedStableErrorCode !== request?.expectedStableErrorCode) {
      issue(issues, "RUN_RESULT_REQUEST_BINDING_INVALID", item.definitionRelative, "terminal result is not the exact registered request binding");
    }
    if (resultByRequest.has(item.record.requestRef?.id)) issue(issues, "RUN_RESULT_DUPLICATE", item.definitionRelative, String(item.record.requestRef?.id));
    const expectedKeyHash = request ? sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8")) : null;
    if (expectedKeyHash === null || item.relativePath !== `records/${expectedKeyHash}.result.json`) {
      issue(issues, "RUN_RESULT_FILENAME_INVALID", item.definitionRelative, "result filename must equal SHA-256(idempotencyKey)");
    }
    if (expectedKeyHash === null || item.record.resultId !== `result.${expectedKeyHash}`
      || !sameRef(item.record.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || item.record.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256) {
      issue(issues, "RUN_RESULT_IDENTITY_RUNTIME_INVALID", item.definitionRelative, "result ID/runtime attestation is not the exact request/definition binding");
    }
    const wallElapsedMs = Date.parse(item.record.finishedAt) - Date.parse(item.record.startedAt);
    if ((item.record.durationMs !== null && item.record.durationMs > SLICE05_SHARP_POLICY.workerTimeoutMs)
      || wallElapsedMs > SLICE05_SHARP_POLICY.workerTimeoutMs + SLICE05_SHARP_POLICY.workerKillConfirmationMs
      || (item.record.resourceUsage?.maxRssKiB ?? 0) > SLICE05_SHARP_POLICY.observedMaxRssKiB) {
      issue(issues, "RUN_RESULT_RESOURCE_BOUNDARY_EXCEEDED", item.definitionRelative, "reported duration/RSS exceeds the frozen worker boundary");
    }
    if (request && (Date.parse(item.record.startedAt) < Date.parse(request.createdAt)
      || Date.parse(item.record.finishedAt) < Date.parse(item.record.startedAt))) {
      issue(issues, "RUN_RESULT_TIME_ORDER_INVALID", item.definitionRelative, "request -> result start -> finish time order regressed");
    }
    resultByRequest.set(item.record.requestRef?.id, item);
  }
  for (const requestId of requestById.keys()) {
    if (!claimByRequest.has(requestId) || !resultByRequest.has(requestId)) issue(issues, "RUN_REQUEST_NOT_TERMINAL", requestById.get(requestId).definitionRelative, requestId);
  }
  for (const requestId of [...claimByRequest.keys(), ...resultByRequest.keys()]) {
    if (!requestById.has(requestId)) issue(issues, "UNREGISTERED_RUN_RECORD", requestId, "claim/result has no registered request");
  }

  const sourceAttempts = new Map();
  const requestManifestContext = new Map();
  for (const item of requests) {
    const request = item.record;
    if (!sameRef(request.definitionRef, definitionRef) || request.mode !== "smoke" || request.attempt.partition !== "smoke") {
      issue(issues, "RUN_REQUEST_DEFINITION_MODE_INVALID", item.definitionRelative, "closed smoke request must bind the exact definition and smoke partition");
    }
    if (Date.parse(request.createdAt) < Date.parse(definitionIndex.frozenAt)) {
      issue(issues, "RUN_REQUEST_TIME_ORDER_INVALID", item.definitionRelative, "request predates the frozen definition");
    }
    if (!sameRef(request.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || request.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
      || !deepEqual(request.adapterRef, expectedAdapterRef) || !deepEqual(request.oracleRef, expectedOracleRef)
      || expectedAdapterRef?.implementationSha256 === expectedOracleRef?.implementationSha256) {
      issue(issues, "RUN_REQUEST_IMPLEMENTATION_RUNTIME_INVALID", item.definitionRelative, "request does not bind the exact frozen runtime, adapter, and independent oracle");
    }
    try {
      const manifestContext = smokeManifestsByPath.get(request.manifestRef.path);
      const manifest = manifestContext?.manifest;
      if (!manifest || !sameRef(request.manifestRef, manifestContext.ref)
        || manifest.partition !== "smoke" || manifest.operationScope?.[0] !== request.operation) {
        issue(issues, "RUN_REQUEST_MANIFEST_REF_INVALID", item.definitionRelative, request.manifestRef.path);
      }
      const entry = manifest.entries?.[request.manifestEntryRef.entryIndex];
      const entryHash = entry ? contentHashSlice05Validation(entry) : null;
      const expectedDisposition = entry?.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject";
      if (!entry || entry.sourceId !== request.attempt.sourceId || request.manifestEntryRef.sourceId !== entry.sourceId
        || request.manifestEntryRef.contentHash !== entryHash
        || request.expectedDisposition !== expectedDisposition || request.expectedStableErrorCode !== entry.expectedStableErrorCode
        || request.sourceIdentity.sourceId !== entry.sourceId
        || !sameRef(request.sourceIdentity.sourceProvenanceRef, entry.sourceProvenanceRef)
        || !deepEqual(request.sourceIdentity.rawAssetRef, entry.rawAsset)
        || !deepEqual(request.sourceIdentity.normalizedArtifactRef, entry.normalizedArtifactRef)
        || !deepEqual(request.goldRecordRef, entry.goldRecordRef)
        || !sameRef(request.contractRef, manifest.contractRefs?.[0])) {
        issue(issues, "RUN_REQUEST_MANIFEST_ENTRY_INVALID", item.definitionRelative, "request does not exactly materialize its frozen manifest entry");
      }
      if (entry) {
        const expectedRunId = `run.smoke.${request.operation}.${definitionRef.contentHash.slice(0, 16)}`;
        const expectedIdempotencyKey = `s05.smoke.${request.operation}.${manifestContext.ref.contentHash.slice(0, 12)}.${entryHash.slice(0, 12)}.r${request.attempt.repetition}.a${request.attempt.attemptNumber}`;
        if (request.attempt.runId !== expectedRunId || request.attempt.idempotencyKey !== expectedIdempotencyKey) {
          issue(issues, "RUN_REQUEST_ATTEMPT_IDENTITY_INVALID", item.definitionRelative, "runId/idempotencyKey is not the deterministic definition/manifest/entry/repetition/attempt binding");
        }
        requestManifestContext.set(request.requestId, { manifest, manifestRef: manifestContext.ref, entry, entryHash });
      }
    } catch (error) {
      addThrownIssue(issues, "RUN_REQUEST_MANIFEST_REF_INVALID", item.definitionRelative, error);
    }
    const list = sourceAttempts.get(request.attempt.sourceId) ?? [];
    list.push(request);
    sourceAttempts.set(request.attempt.sourceId, list);
  }
  for (const [sourceId, sourceRequests] of sourceAttempts) {
    const replacements = sourceRequests.filter(({ attempt }) => attempt.attemptNumber === 2);
    if (replacements.length > 1) issue(issues, "RUN_REPLACEMENT_LIMIT_EXCEEDED", sourceId, "at most one no-result replacement is allowed per source across all repetitions");
    for (const replacement of replacements) {
      const original = sourceRequests.find(({ attempt }) => attempt.repetition === replacement.attempt.repetition && attempt.attemptNumber === 1);
      const originalResult = original ? resultByRequest.get(original.requestId)?.record : null;
      if (!originalResult || originalResult.status !== "invalid-no-result"
        || !new Set(["runner-crash-before-result", "custody-interruption", "integrity-check-failure"]).has(originalResult.reasonCode)) {
        issue(issues, "RUN_REPLACEMENT_NOT_AUTHORIZED", sourceId, "attempt 2 does not replace its one corresponding registered no-result attempt");
      }
    }
  }

  const expectedSmokeSources = new Map();
  for (const { manifest, ref: manifestRef } of smokeManifestsByPath.values()) {
    for (const [entryIndex, entry] of (manifest.entries ?? []).entries()) {
      if (expectedSmokeSources.has(entry.sourceId)) {
        issue(issues, "SMOKE_SOURCE_DUPLICATE", manifestRef.path, entry.sourceId);
      }
      expectedSmokeSources.set(entry.sourceId, { manifest, manifestRef, entry, entryIndex });
    }
  }
  for (const [sourceId, expected] of expectedSmokeSources) {
    const sourceRequests = sourceAttempts.get(sourceId) ?? [];
    for (const repetition of [1, 2, 3]) {
      const initial = sourceRequests.filter(({ attempt }) => attempt.repetition === repetition && attempt.attemptNumber === 1);
      const replacements = sourceRequests.filter(({ attempt }) => attempt.repetition === repetition && attempt.attemptNumber === 2);
      if (initial.length !== 1) {
        issue(issues, "SMOKE_DENOMINATOR_SLOT_INVALID", sourceId, `repetition ${repetition} requires exactly one immutable attempt 1 request`);
      }
      if (replacements.length > 1) {
        issue(issues, "SMOKE_DENOMINATOR_SLOT_INVALID", sourceId, `repetition ${repetition} has more than one replacement request`);
      }
      const effectiveRequest = replacements[0] ?? initial[0];
      const effectiveResult = effectiveRequest ? resultByRequest.get(effectiveRequest.requestId)?.record : null;
      if (!effectiveResult) {
        issue(issues, "SMOKE_EFFECTIVE_RESULT_MISSING", sourceId, `repetition ${repetition} has no terminal effective result`);
      }
    }
    if (sourceRequests.some((request) => request.operation !== expected.manifest.operationScope?.[0]
      || request.manifestRef.contentHash !== expected.manifestRef.contentHash)) {
      issue(issues, "SMOKE_SOURCE_OPERATION_LEAK", sourceId, "source requests crossed their frozen manifest or operation");
    }
  }
  for (const sourceId of sourceAttempts.keys()) {
    if (!expectedSmokeSources.has(sourceId)) {
      issue(issues, "UNREGISTERED_SMOKE_SOURCE", sourceId, "request source is absent from both frozen smoke manifests");
    }
  }

  let previousHash = "0".repeat(64);
  let previousTime = null;
  const eventsByRequest = new Map();
  for (const [eventIndex, item] of ledgerEvents.entries()) {
    const event = item.record;
    if (event.sequence !== eventIndex + 1 || event.previousEventHash !== previousHash
      || event.eventId !== `event.${eventIndex + 1}.${event.idempotencyKeyHash?.slice(0, 16)}`
      || (previousTime !== null && Date.parse(event.occurredAt) < Date.parse(previousTime))) {
      issue(issues, "LEDGER_CHAIN_INVALID", item.location, "sequence, predecessor hash, or time order regressed");
    }
    const request = requestById.get(event.requestRef?.id)?.record;
    if (!request || request.contentHash !== event.requestRef.contentHash || event.idempotencyKeyHash !== sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8"))
      || event.mode !== request.mode || event.operation !== request.operation || !deepEqual(event.attempt, request.attempt)) {
      issue(issues, "LEDGER_REQUEST_BINDING_INVALID", item.location, "event does not bind one exact registered request");
    }
    const eventProfiles = {
      "attempt-started": { status: "started", reasonCode: null, publication: false },
      "existing-terminal-returned": { status: "existing", reasonCode: null, publication: false },
      "conflict-rejected": { status: null, reasonCode: "S05_IDEMPOTENCY_CONFLICT", publication: false },
      "publication-intent": { status: "started", reasonCode: null, publication: true },
      "publication-complete": { status: "pass", reasonCode: null, publication: true },
      "publication-reconciliation-unknown": { status: "unknown-reconciliation", reasonCode: "S05_PUBLICATION_RECONCILIATION_UNKNOWN", publication: true },
    };
    const profile = eventProfiles[event.eventType];
    if (profile && (event.status !== profile.status || event.reasonCode !== profile.reasonCode
      || (event.publication !== null) !== profile.publication)) {
      issue(issues, "LEDGER_EVENT_PROFILE_INVALID", item.location, "event status/reason/publication does not match eventType");
    }
    if (new Set(["attempt-terminal", "claim-reconciled"]).has(event.eventType)
      && (event.status === null || new Set(["started", "existing"]).has(event.status) || event.publication !== null)) {
      issue(issues, "LEDGER_EVENT_PROFILE_INVALID", item.location, "terminal/reconciled event must carry a terminal status and no publication payload");
    }
    const requestEvents = eventsByRequest.get(event.requestRef?.id) ?? [];
    requestEvents.push(item);
    eventsByRequest.set(event.requestRef?.id, requestEvents);
    previousHash = event.contentHash;
    previousTime = event.occurredAt;
  }

  for (const [requestId, requestItem] of requestById) {
    const request = requestItem.record;
    const claim = claimByRequest.get(requestId)?.record;
    const result = resultByRequest.get(requestId)?.record;
    const events = eventsByRequest.get(requestId) ?? [];
    const started = events.filter(({ record }) => record.eventType === "attempt-started");
    const terminal = events.filter(({ record }) => record.eventType === "attempt-terminal");
    const reconciled = events.filter(({ record }) => record.eventType === "claim-reconciled");
    const publicationIntent = events.filter(({ record }) => record.eventType === "publication-intent");
    const publicationComplete = events.filter(({ record }) => record.eventType === "publication-complete");
    const publicationUnknown = events.filter(({ record }) => record.eventType === "publication-reconciliation-unknown");
    const applicablePass = result?.status === "pass" && result?.expectedDisposition === "applicable";
    const reconciledLifecycle = reconciled.length === 1 && started.length === 0 && terminal.length === 0;
    const publicationRecoveryLifecycle = applicablePass
      && reconciled.length === 1 && started.length === 1 && terminal.length === 0;
    const ordinaryLifecycle = started.length === 1 && terminal.length === 1 && reconciled.length === 0;
    if (!result || (!ordinaryLifecycle && !reconciledLifecycle && !publicationRecoveryLifecycle)) {
      issue(issues, "RUN_EVENT_LIFECYCLE_INVALID", requestItem.definitionRelative, "request must have exactly one ordinary, claim-reconciled, or publication-recovery terminal lifecycle");
    }
    if (claim && result && (Date.parse(claim.claimedAt) > Date.parse(result.startedAt)
      || ((ordinaryLifecycle || publicationRecoveryLifecycle)
        && (Date.parse(started[0].record.occurredAt) < Date.parse(result.startedAt)
          || Date.parse(started[0].record.occurredAt) > Date.parse(result.finishedAt))))) {
      issue(issues, "RUN_EVENT_TIME_ORDER_INVALID", requestItem.definitionRelative, "claim/start event precedes or follows the bound result incorrectly");
    }
    const finalEvent = ordinaryLifecycle ? terminal[0]?.record : reconciled[0]?.record;
    if (result && finalEvent && (finalEvent.status !== result.status || finalEvent.reasonCode !== result.reasonCode
      || Date.parse(finalEvent.occurredAt) < Date.parse(result.finishedAt))) {
      issue(issues, "RUN_EVENT_TERMINAL_BINDING_INVALID", requestItem.definitionRelative, "terminal ledger event does not bind the exact result status/reason/time");
    }
    if (finalEvent && (ordinaryLifecycle || publicationRecoveryLifecycle)
      && started[0].record.sequence >= finalEvent.sequence) {
      issue(issues, "RUN_EVENT_SEQUENCE_INVALID", requestItem.definitionRelative, "attempt-started must precede the terminal or reconciled event");
    }
    for (const existing of events.filter(({ record }) => record.eventType === "existing-terminal-returned")) {
      if (!finalEvent || existing.record.sequence <= finalEvent.sequence
        || Date.parse(existing.record.occurredAt) < Date.parse(finalEvent.occurredAt)) {
        issue(issues, "RUN_EVENT_SEQUENCE_INVALID", existing.location, "existing-terminal-returned must follow the immutable terminal lifecycle");
      }
    }
    if (publicationUnknown.length !== 0) {
      issue(issues, "RUN_PUBLICATION_RECONCILIATION_UNKNOWN", requestItem.definitionRelative, "closed smoke cannot retain an unresolved publication reconciliation event");
    }
    if (applicablePass) {
      if (publicationIntent.length !== 1 || publicationComplete.length !== 1
        || publicationIntent[0].record.publication?.transactionId !== publicationComplete[0].record.publication?.transactionId
        || !deepEqual(publicationIntent[0].record.publication, publicationComplete[0].record.publication)
        || started[0]?.record?.sequence >= publicationIntent[0]?.record?.sequence
        || publicationIntent[0]?.record?.sequence >= publicationComplete[0]?.record?.sequence
        || publicationComplete[0]?.record?.sequence >= finalEvent?.sequence
        || Date.parse(publicationIntent[0]?.record?.occurredAt) < Date.parse(result.finishedAt)
        || Date.parse(publicationIntent[0].record.occurredAt) > Date.parse(publicationComplete[0].record.occurredAt)
        || Date.parse(publicationComplete[0].record.occurredAt) > Date.parse(finalEvent?.occurredAt)) {
        issue(issues, "RUN_PUBLICATION_LIFECYCLE_INVALID", requestItem.definitionRelative, "applicable pass requires one identical, ordered publication intent -> complete before terminal");
      }
      const publication = publicationComplete[0]?.record?.publication;
      const resultItem = resultByRequest.get(requestId);
      const keyHash = sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8"));
      const expectedPublicationPaths = new Map([
        ["artifact-bytes", result?.artifactRef?.relativePath],
        ["artifact-record", result?.artifactRef?.recordRelativePath],
        ["oracle", result?.oracleResultRef?.relativePath],
        ["result", resultItem?.relativePath],
      ]);
      const publicationRoles = new Set((publication?.files ?? []).map(({ role }) => role));
      if (publication?.transactionId !== `publication.${keyHash}`
        || publication?.stagingDirectory !== `.staging/${keyHash}`
        || publication?.files?.length !== 4
        || !pathsEqual(publicationRoles, expectedPublicationPaths.keys())) {
        issue(issues, "RUN_PUBLICATION_FILE_SET_INVALID", requestItem.definitionRelative, "publication must contain the four exact attempt-scoped artifact-bytes/artifact-record/oracle/result roles");
      }
      for (const file of publication?.files ?? []) {
        const expectedCanonicalPath = expectedPublicationPaths.get(file.role);
        if (file.canonicalPath !== expectedCanonicalPath || !safeRelativePath(file.canonicalPath)
          || !safeRelativePath(file.stagedPath) || !file.stagedPath.startsWith(`${publication.stagingDirectory}/`)) {
          issue(issues, "RUN_PUBLICATION_PATH_INVALID", requestItem.definitionRelative, `${String(file.role)}:${String(file.canonicalPath)}`);
          continue;
        }
        try {
          const bytes = await readFile(path.join(resultsRoot, file.canonicalPath));
          if (bytes.byteLength !== file.byteLength || sha256Slice05Validation(bytes) !== file.fileSha256) {
            issue(issues, "RUN_PUBLICATION_FILE_IDENTITY_INVALID", requestItem.definitionRelative, file.canonicalPath);
          }
        } catch (error) {
          addThrownIssue(issues, "RUN_PUBLICATION_FILE_IDENTITY_INVALID", file.canonicalPath, error);
        }
        try {
          await lstat(path.join(resultsRoot, file.stagedPath));
          issue(issues, "RUN_PUBLICATION_STAGING_REMAINS", requestItem.definitionRelative, file.stagedPath);
        } catch (error) {
          if (error?.code !== "ENOENT") addThrownIssue(issues, "RUN_PUBLICATION_STAGING_INVALID", file.stagedPath, error);
        }
      }
      if (safeRelativePath(publication?.stagingDirectory)) {
        try {
          await lstat(path.join(resultsRoot, publication.stagingDirectory));
          issue(issues, "RUN_PUBLICATION_STAGING_REMAINS", requestItem.definitionRelative, publication.stagingDirectory);
        } catch (error) {
          if (error?.code !== "ENOENT") addThrownIssue(issues, "RUN_PUBLICATION_STAGING_INVALID", publication.stagingDirectory, error);
        }
      }
    } else if (publicationIntent.length !== 0 || publicationComplete.length !== 0) {
      issue(issues, "RUN_PUBLICATION_FOR_NONPASS_FORBIDDEN", requestItem.definitionRelative, "only applicable pass may publish artifact/oracle/result files");
    }
  }

  const referencedOutputPaths = new Map();
  let frozenRuntimeRecord = null;
  try {
    frozenRuntimeRecord = (await readCanonicalJson(sliceRoot, definitionIndex.runtimeAttestationRef.path)).value;
  } catch (error) {
    addThrownIssue(issues, "RUN_RUNTIME_ATTESTATION_INVALID", String(definitionIndex.runtimeAttestationRef?.path), error);
  }
  for (const item of results) {
    const result = item.record;
    const applicablePass = result.status === "pass" && result.expectedDisposition === "applicable";
    if (!applicablePass) continue;
    let expectedArtifactPath;
    let expectedArtifactRecordPath;
    let expectedOraclePath;
    try {
      expectedArtifactPath = artifactRelativePathSlice05(result);
      expectedArtifactRecordPath = artifactRecordRelativePathSlice05(result);
      expectedOraclePath = oracleRelativePathSlice05(result);
    } catch (error) {
      addThrownIssue(issues, "RUN_OUTPUT_PATH_BINDING_INVALID", item.definitionRelative, error);
      continue;
    }
    if (result.artifactRef?.relativePath !== expectedArtifactPath
      || result.artifactRef?.recordRelativePath !== expectedArtifactRecordPath
      || result.oracleResultRef?.relativePath !== expectedOraclePath) {
      issue(issues, "RUN_OUTPUT_PATH_BINDING_INVALID", item.definitionRelative, "artifact bytes/record/oracle path does not encode mode/operation/source/repetition/attempt");
    }
    for (const dynamicPath of [result.artifactRef?.relativePath, result.artifactRef?.recordRelativePath, result.oracleResultRef?.relativePath]) {
      if (referencedOutputPaths.has(dynamicPath)) issue(issues, "RUN_OUTPUT_DUPLICATE_REFERENCE", item.definitionRelative, String(dynamicPath));
      referencedOutputPaths.set(dynamicPath, item);
      unmatchedFiles.delete(dynamicPath);
    }
    let artifactRecord = null;
    try {
      const parsedArtifact = await readCanonicalJson(resultsRoot, result.artifactRef.recordRelativePath);
      artifactRecord = parsedArtifact.value;
      if (parsedArtifact.bytes.byteLength !== result.artifactRef.recordByteLength
        || parsedArtifact.fileSha256 !== result.artifactRef.recordFileSha256) {
        issue(issues, "RUN_ARTIFACT_RECORD_FILE_IDENTITY_INVALID", item.definitionRelative, result.artifactRef.recordRelativePath);
      }
      if (result.operation === "normalize") validateNormalizedImageSlice05(artifactRecord);
      else validateDeliveryArtifactSlice05(artifactRecord);
    } catch (error) {
      addThrownIssue(issues, "RUN_ARTIFACT_RECORD_INVALID", item.definitionRelative, error);
    }
    const artifactBytes = result.artifactRef ? await readFile(path.join(resultsRoot, result.artifactRef.relativePath)).catch(() => null) : null;
    if (!artifactBytes || artifactBytes.byteLength !== result.artifactRef.byteLength
      || sha256Slice05Validation(artifactBytes) !== result.artifactRef.fileSha256) {
      issue(issues, "RUN_ARTIFACT_FILE_IDENTITY_INVALID", item.definitionRelative, String(result.artifactRef?.relativePath));
      continue;
    }
    let decoded;
    try {
      decoded = decodeIndependentPngSlice05(artifactBytes);
      if (!decoded.filter0Only || decoded.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256) {
        issue(issues, "RUN_ARTIFACT_INDEPENDENT_REOPEN_INVALID", item.definitionRelative, "candidate PNG violates the frozen output profile or pixel hash");
      }
    } catch (error) {
      addThrownIssue(issues, "RUN_ARTIFACT_INDEPENDENT_REOPEN_INVALID", item.definitionRelative, error);
    }
    let oracle;
    let oracleSchema;
    try {
      oracle = (await readCanonicalJson(resultsRoot, result.oracleResultRef.relativePath)).value;
      oracleSchema = await loadSchema("schemas/oracle-result.slice05.v0.schema.json");
      schemaCheck(oracle, oracleSchema, `results/open-smoke/${result.oracleResultRef.relativePath}`);
      validateOracleResultSlice05(oracle);
    } catch (error) {
      addThrownIssue(issues, "RUN_ORACLE_RESULT_INVALID", item.definitionRelative, error);
      continue;
    }
    const facts = decoded ? {
      mime: decoded.mime,
      byteLength: decoded.byteLength,
      fileSha256: decoded.fileSha256,
      decodedPixelSha256: decoded.decodedPixelSha256,
      width: decoded.width,
      height: decoded.height,
      pixelLayout: decoded.pixelLayout,
      colorSpace: decoded.colorSpace,
      orientation: decoded.orientation,
      alphaMode: decoded.alphaMode,
      alphaPresent: decoded.alphaPresent,
      metadataPolicy: decoded.metadataPolicy,
      pngFilterPolicy: decoded.filter0Only ? "filter-0-only" : "noncanonical-filter-present",
      interlace: decoded.interlace,
      animation: decoded.animation,
    } : null;
    const request = requestById.get(result.requestRef.id)?.record;
    const artifactParentMatches = result.operation === "normalize"
      ? artifactRecord?.parent?.sourceAssetId === request?.attempt?.sourceId
        && artifactRecord?.parent?.sourceFileSha256 === request?.sourceIdentity?.rawAssetRef?.fileSha256
        && artifactRecord?.parent?.sourceDecodedPixelSha256 === request?.sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256
        && artifactRecord?.parent?.sourceManifestSha256 === request?.sourceIdentity?.sourceProvenanceRef?.contentHash
      : artifactRecord?.parent?.normalizedImageId === request?.sourceIdentity?.normalizedArtifactRef?.id
        && artifactRecord?.parent?.normalizedArtifactSha256 === request?.sourceIdentity?.normalizedArtifactRef?.contentHash
        && artifactRecord?.parent?.normalizedFileSha256 === request?.sourceIdentity?.rawAssetRef?.fileSha256
        && artifactRecord?.parent?.normalizedDecodedPixelSha256 === request?.sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256;
    const expectedRuntimeHashRef = definitionIndex.runtimeAttestationRef ? {
      id: definitionIndex.runtimeAttestationRef.id,
      contentHash: definitionIndex.runtimeAttestationRef.contentHash,
    } : null;
    const expectedHardwareHashRef = definitionIndex.hardwareRef ? {
      id: definitionIndex.hardwareRef.id,
      contentHash: definitionIndex.hardwareRef.contentHash,
    } : null;
    const expectedCandidateHashRef = definitionIndex.candidateRef ? {
      id: definitionIndex.candidateRef.id,
      contentHash: definitionIndex.candidateRef.contentHash,
    } : null;
    const artifactRecordMatches = artifactRecord !== null
      && artifactRecord.schemaVersion === result.artifactRef.schemaVersion
      && artifactRecord.artifactId === result.artifactRef.id
      && artifactRecord.contentHash === result.artifactRef.contentHash
      && artifactRecord.operation === result.operation
      && artifactParentMatches
      && deepEqual(artifactRecord.capabilityContractRef, { id: request?.contractRef?.id, contentHash: request?.contractRef?.contentHash })
      && deepEqual(artifactRecord.candidateRef, expectedCandidateHashRef)
      && deepEqual(artifactRecord.adapterRef, request?.adapterRef)
      && artifactRecord.producerRef?.kind === "candidate-adapter"
      && artifactRecord.producerRef?.id === request?.adapterRef?.id
      && artifactRecord.producerRef?.version === request?.adapterRef?.version
      && artifactRecord.producerRef?.implementationSha256 === request?.adapterRef?.implementationSha256
      && deepEqual(artifactRecord.runtimeRef, expectedRuntimeHashRef)
      && deepEqual(artifactRecord.hardwareRef, expectedHardwareHashRef)
      && deepEqual(artifactRecord.attempt, request?.attempt)
      && artifactRecord.bytes?.relativePath === result.artifactRef.relativePath
      && artifactRecord.bytes?.byteLength === result.artifactRef.byteLength
      && artifactRecord.bytes?.fileSha256 === result.artifactRef.fileSha256
      && artifactRecord.bytes?.decodedPixelSha256 === result.artifactRef.decodedPixelSha256
      && deepEqual(artifactRecord.image, facts && Object.fromEntries(Object.entries(facts).filter(([key]) => !new Set(["mime", "byteLength", "fileSha256", "decodedPixelSha256"]).has(key))))
      && Date.parse(artifactRecord.createdAt) >= Date.parse(result.startedAt)
      && Date.parse(artifactRecord.createdAt) <= Date.parse(result.finishedAt);
    if (!artifactRecordMatches) {
      issue(issues, "RUN_ARTIFACT_RECORD_CROSSLINK_INVALID", item.definitionRelative, "durable artifact record does not bind exact parent/contract/candidate/adapter/runtime/hardware/attempt/bytes/facts/time");
    }
    if (!result.workerRuntime || !frozenRuntimeRecord
      || !deepEqual(result.workerRuntime.payload?.nativeVersions, frozenRuntimeRecord.versions?.sharpRuntime)
      || result.workerRuntime.payload?.nodeVersion !== frozenRuntimeRecord.environment?.node?.version
      || result.workerRuntime.payload?.platform !== frozenRuntimeRecord.environment?.os?.platform
      || result.workerRuntime.payload?.architecture !== frozenRuntimeRecord.environment?.os?.architecture) {
      issue(issues, "RUN_WORKER_RUNTIME_CROSSLINK_INVALID", item.definitionRelative, "embedded worker runtime payload differs from the frozen runtime attestation");
    }
    let goldRecord = null;
    if (request?.goldRecordRef) {
      try {
        const parsedGold = await readCanonicalJson(sliceRoot, request.goldRecordRef.path);
        goldRecord = parsedGold.value;
        const actualGoldRef = {
          path: request.goldRecordRef.path,
          id: goldRecord.goldRecordId,
          contentHash: goldRecord.contentHash,
          byteLength: parsedGold.bytes.byteLength,
          fileSha256: parsedGold.fileSha256,
        };
        if (!sameRef(request.goldRecordRef, actualGoldRef)) {
          issue(issues, "RUN_GOLD_RECORD_REF_INVALID", item.definitionRelative, "request gold ref does not bind exact frozen bytes");
        }
      } catch (error) {
        addThrownIssue(issues, "RUN_GOLD_RECORD_REF_INVALID", item.definitionRelative, error);
      }
    }
    if (artifactRecord && artifactBytes && goldRecord) {
      try {
        const evaluationArgs = {
          artifact: artifactRecord,
          actualBytes: artifactBytes,
          goldRecord,
          oracleImplementationSha256: expectedOracleRef.implementationSha256,
          observedAt: oracle.observedAt,
        };
        const recomputedOracle = result.operation === "normalize"
          ? evaluateNormalizedImageSlice05(evaluationArgs)
          : evaluateDeliveryArtifactSlice05({
            ...evaluationArgs,
            parentNormalizedImage: (await readCanonicalJson(
              sliceRoot,
              request.sourceIdentity.normalizedArtifactRef.path,
            )).value,
          });
        if (!deepEqual(oracle, recomputedOracle)) {
          issue(issues, "RUN_ORACLE_RECOMPUTATION_MISMATCH", item.definitionRelative, "durable oracle result differs from the independent 21-check recomputation");
        }
      } catch (error) {
        addThrownIssue(issues, "RUN_ORACLE_RECOMPUTATION_FAILED", item.definitionRelative, error);
      }
    }
    const oracleCheckIds = new Set((oracle.checks ?? []).map(({ checkId }) => checkId));
    const expectedCheckIds = new Set(oracleSchema?.properties?.checks?.items?.properties?.checkId?.enum ?? []);
    const expectedFacts = goldRecord?.expected;
    const factKeysFromGold = ["mime", "decodedPixelSha256", "width", "height", "pixelLayout", "colorSpace", "orientation",
      "alphaMode", "alphaPresent", "metadataPolicy", "pngFilterPolicy", "interlace", "animation"];
    const goldFactsMatch = expectedFacts !== undefined && factKeysFromGold.every((key) => facts?.[key] === expectedFacts[key]);
    const parentIdentity = expectedFacts?.parentIdentity;
    const sourceIdentity = request?.sourceIdentity;
    const parentMatches = result.operation === "normalize"
      ? parentIdentity?.id === request?.attempt?.sourceId
        && parentIdentity?.artifactSha256 === null
        && parentIdentity?.fileSha256 === sourceIdentity?.rawAssetRef?.fileSha256
        && parentIdentity?.decodedPixelSha256 === sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256
        && parentIdentity?.manifestSha256 === sourceIdentity?.sourceProvenanceRef?.contentHash
      : parentIdentity?.id === sourceIdentity?.normalizedArtifactRef?.id
        && parentIdentity?.artifactSha256 === sourceIdentity?.normalizedArtifactRef?.contentHash
        && parentIdentity?.fileSha256 === sourceIdentity?.rawAssetRef?.fileSha256
        && parentIdentity?.decodedPixelSha256 === sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256
        && parentIdentity?.manifestSha256 === sourceIdentity?.sourceProvenanceRef?.contentHash;
    if (oracle.oracleResultId !== result.oracleResultRef.id || oracle.contentHash !== result.oracleResultRef.contentHash
      || oracle.oracleResultId !== `oracle-result.${result.artifactRef.id}`
      || oracle.oracleRef?.id !== expectedOracleRef?.id
      || oracle.oracleRef?.implementationSha256 !== expectedOracleRef?.implementationSha256
      || oracle.operation !== result.operation || oracle.artifactRef?.id !== result.artifactRef.id
      || oracle.artifactRef?.contentHash !== result.artifactRef.contentHash
      || oracle.goldRecordRef?.id !== request?.goldRecordRef?.id || oracle.goldRecordRef?.contentHash !== request?.goldRecordRef?.contentHash
      || oracle.actualBytes?.relativePath !== result.artifactRef.relativePath
      || oracle.actualBytes?.byteLength !== result.artifactRef.byteLength
      || oracle.actualBytes?.fileSha256 !== result.artifactRef.fileSha256
      || oracle.actualBytes?.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256
      || !deepEqual(oracle.facts, facts) || !goldFactsMatch || !parentMatches
      || oracleCheckIds.size !== expectedCheckIds.size || !pathsEqual(oracleCheckIds, expectedCheckIds)
      || oracle.overallStatus !== "pass" || Date.parse(oracle.observedAt) < Date.parse(result.startedAt)
      || Date.parse(oracle.observedAt) > Date.parse(result.finishedAt)
      || !Array.isArray(oracle.checks) || oracle.checks.some(({ status, reason }) => status !== "pass" || reason !== null)) {
      issue(issues, "RUN_ORACLE_ARTIFACT_CROSSLINK_INVALID", item.definitionRelative, "oracle result does not independently bind the exact candidate PNG/result/gold facts");
    }
  }

  let gateBPlan = null;
  let gateBPlanRef = definitionIndex.gateBSmokePlanRef;
  try {
    const gateFile = await readCanonicalJson(sliceRoot, gateBPlanRef.path);
    gateBPlan = gateFile.value;
    const actualGateRef = {
      path: gateBPlanRef.path,
      id: gateBPlan.gateBPlanId,
      contentHash: gateBPlan.contentHash,
      byteLength: gateFile.bytes.byteLength,
      fileSha256: gateFile.fileSha256,
    };
    if (!sameRef(gateBPlanRef, actualGateRef)) {
      issue(issues, "RUN_GATE_B_PLAN_REF_INVALID", gateBPlanRef.path, "Gate B plan ref does not bind exact definition bytes");
    }
    gateBPlanRef = actualGateRef;
  } catch (error) {
    addThrownIssue(issues, "RUN_GATE_B_PLAN_REF_INVALID", String(gateBPlanRef?.path), error);
  }

  if (faultResults.length !== 1 || faultResults[0]?.relativePath !== "fault/fault-semantics-result.slice05.v0.json") {
    issue(issues, "SMOKE_FAULT_RESULT_CARDINALITY_INVALID", "results/open-smoke/fault", "closed smoke requires exactly one registered fault-semantics record at the canonical path");
  }
  const faultItem = faultResults[0];
  if (faultItem && (!sameRef(faultItem.record.definitionRef, definitionRef)
    || !sameRef(faultItem.record.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
    || faultItem.record.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
    || Date.parse(faultItem.record.observedAt) < Date.parse(definitionIndex.frozenAt))) {
    issue(issues, "SMOKE_FAULT_RESULT_BINDING_INVALID", faultItem.definitionRelative, "fault semantics is not bound to this frozen definition/runtime/time boundary");
  }
  if (faultItem) {
    try {
      const recomputedFault = buildSlice05FaultResult({
        definitionRef,
        runtimeAttestationRef: definitionIndex.runtimeAttestationRef,
        scenarioResults: faultItem.record.scenarios.map(({ mode, actualStatus, exitConfirmed }) => ({
          mode,
          status: actualStatus,
          exitConfirmed,
        })),
        observedAt: faultItem.record.observedAt,
      });
      if (!deepEqual(faultItem.record, recomputedFault)) {
        issue(issues, "SMOKE_FAULT_RESULT_RECOMPUTATION_MISMATCH", faultItem.definitionRelative, "fault result does not preserve the six frozen mode/expected-status/exit semantics");
      }
    } catch (error) {
      addThrownIssue(issues, "SMOKE_FAULT_RESULT_RECOMPUTATION_FAILED", faultItem.definitionRelative, error);
    }
  }

  for (const operation of ["normalize", "export"]) {
    const operationManifest = [...smokeManifestsByPath.values()].find(({ manifest }) => manifest.operationScope?.[0] === operation);
    const audits = sessionAudits.filter(({ record }) => record.operation === operation);
    const summaries = smokeSummaries.filter(({ record }) => record.operation === operation);
    const decisions = gateBDecisions.filter(({ record }) => record.operation === operation);
    const expectedAuditPath = `audit/${operation}.smoke-session-audit.slice05.v0.json`;
    const expectedSummaryPath = `summaries/${operation}.smoke-summary.slice05.v0.json`;
    const expectedDecisionPath = `decisions/${operation}.gate-b-decision.slice05.v0.json`;
    if (audits.length !== 1 || audits[0]?.relativePath !== expectedAuditPath) {
      issue(issues, "SMOKE_SESSION_AUDIT_CARDINALITY_INVALID", `results/open-smoke/${expectedAuditPath}`, "closed smoke requires exactly one operation audit at the canonical path");
    }
    if (summaries.length !== 1 || summaries[0]?.relativePath !== expectedSummaryPath) {
      issue(issues, "SMOKE_SUMMARY_CARDINALITY_INVALID", `results/open-smoke/${expectedSummaryPath}`, "closed smoke requires exactly one operation summary at the canonical path");
    }
    if (decisions.length !== 1 || decisions[0]?.relativePath !== expectedDecisionPath) {
      issue(issues, "GATE_B_DECISION_CARDINALITY_INVALID", `results/open-smoke/${expectedDecisionPath}`, "closed smoke requires exactly one operation Gate B decision at the canonical path");
    }
    const auditItem = audits[0];
    const summaryItem = summaries[0];
    const decisionItem = decisions[0];
    if (!operationManifest || !auditItem || !summaryItem || !decisionItem || !faultItem || !gateBPlan) continue;
    const auditRef = evidenceRefFor(auditItem, "auditId");
    const summaryRef = evidenceRefFor(summaryItem, "summaryId");
    const faultRef = evidenceRefFor(faultItem, "faultResultId");
    if (!sameRef(auditItem.record.definitionRef, definitionRef)
      || !sameRef(auditItem.record.gateBPlanRef, gateBPlanRef)
      || !sameRef(auditItem.record.manifestRef, operationManifest.ref)
      || !sameRef(auditItem.record.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || auditItem.record.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256) {
      issue(issues, "SMOKE_SESSION_AUDIT_BINDING_INVALID", auditItem.definitionRelative, "audit does not bind exact operation definition/plan/manifest/runtime");
    }
    if (!sameRef(summaryItem.record.definitionRef, definitionRef)
      || !sameRef(summaryItem.record.manifestRef, operationManifest.ref)
      || !sameRef(summaryItem.record.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || summaryItem.record.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
      || !sameRef(summaryItem.record.sessionAuditRef, auditRef)
      || !sameRef(summaryItem.record.faultSemanticsRef, faultRef)) {
      issue(issues, "SMOKE_SUMMARY_BINDING_INVALID", summaryItem.definitionRelative, "summary does not bind exact definition/manifest/runtime/audit/fault bytes");
    }
    const registeredCases = operationManifest.manifest.entries.map((entry) => ({
      sourceId: entry.sourceId,
      partition: "smoke",
      expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
      repetitions: 3,
    }));
    try {
      const recomputedSummary = buildOperationSmokeSummarySlice05({
        operation,
        definitionRef,
        manifestRef: operationManifest.ref,
        runtimeAttestationRef: definitionIndex.runtimeAttestationRef,
        sessionAudit: auditItem.record,
        sessionAuditRef: auditRef,
        faultSemantics: faultItem.record,
        faultSemanticsRef: faultRef,
        registeredCases,
        terminalResults: results.map(({ record }) => record),
        startedAt: summaryItem.record.startedAt,
        finishedAt: summaryItem.record.finishedAt,
      });
      if (!deepEqual(summaryItem.record, recomputedSummary)) {
        issue(issues, "SMOKE_SUMMARY_RECOMPUTATION_MISMATCH", summaryItem.definitionRelative, "summary is not the exact frozen denominator/result aggregation");
      }
    } catch (error) {
      addThrownIssue(issues, "SMOKE_SUMMARY_RECOMPUTATION_FAILED", summaryItem.definitionRelative, error);
    }
    const operationResults = results.map(({ record }) => record).filter((result) => result.operation === operation);
    const latestOperationResultAt = Math.max(...operationResults.map((result) => Date.parse(result.finishedAt)));
    if (operationResults.some((result) => Date.parse(summaryItem.record.startedAt) > Date.parse(result.startedAt)
      || Date.parse(summaryItem.record.finishedAt) < Date.parse(result.finishedAt))
      || Date.parse(auditItem.record.auditedAt) < latestOperationResultAt
      || Date.parse(faultItem.record.observedAt) < latestOperationResultAt
      || Date.parse(auditItem.record.auditedAt) < Date.parse(faultItem.record.observedAt)) {
      issue(issues, "SMOKE_AGGREGATE_TIME_ORDER_INVALID", summaryItem.definitionRelative, "summary must enclose operation results and fault/audit evidence must follow those results");
    }
    if (!sameRef(decisionItem.record.definitionRef, definitionRef)
      || !sameRef(decisionItem.record.gateBPlanRef, gateBPlanRef)
      || !sameRef(decisionItem.record.smokeSummaryRef, summaryRef)
      || Date.parse(decisionItem.record.decidedAt) < Math.max(
        Date.parse(summaryItem.record.finishedAt),
        Date.parse(auditItem.record.auditedAt),
        Date.parse(faultItem.record.observedAt),
      )) {
      issue(issues, "GATE_B_DECISION_BINDING_INVALID", decisionItem.definitionRelative, "Gate B decision does not bind exact plan/summary/time");
    }
    try {
      const recomputedDecision = buildGateBDecisionSlice05({
        summary: summaryItem.record,
        summaryRef,
        gateBPlan,
        gateBPlanRef,
        sessionAudit: auditItem.record,
        faultSemantics: faultItem.record,
        decidedAt: decisionItem.record.decidedAt,
      });
      if (!deepEqual(decisionItem.record, recomputedDecision)) {
        issue(issues, "GATE_B_DECISION_RECOMPUTATION_MISMATCH", decisionItem.definitionRelative, "decision is not the exact conjunction of frozen Gate B evidence");
      }
    } catch (error) {
      addThrownIssue(issues, "GATE_B_DECISION_RECOMPUTATION_FAILED", decisionItem.definitionRelative, error);
    }
  }
  if (sessionAudits.length !== 2 || smokeSummaries.length !== 2 || gateBDecisions.length !== 2) {
    issue(issues, "SMOKE_OPERATION_AGGREGATE_COUNT_INVALID", "results/open-smoke", "closed smoke requires exactly two operation-isolated audits, summaries, and decisions");
  }

  const expectedResultDirectories = new Set();
  for (const relativePath of tree.files) {
    const segments = relativePath.split("/").slice(0, -1);
    for (let length = 1; length <= segments.length; length += 1) {
      expectedResultDirectories.add(segments.slice(0, length).join("/"));
    }
  }
  if (!pathsEqual(tree.directories, expectedResultDirectories)) {
    issue(issues, "OPTIONAL_RESULT_DIRECTORY_ALLOWLIST_MISMATCH", "results/open-smoke", "closed results cannot retain empty/staging/unregistered directories");
  }

  for (const relativePath of unmatchedFiles) {
    issue(issues, relativePath.toLowerCase().endsWith(".png") ? "UNREGISTERED_CANDIDATE_PNG" : "OPTIONAL_RESULT_ALLOWLIST_MISMATCH",
      `results/open-smoke/${relativePath}`, "file is neither a registered result record nor exactly referenced by one applicable-pass run result");
  }

  return {
    valid: issues.length === 0,
    issues,
    fileCount: tree.files.length,
    requestCount: requests.length,
    resultCount: results.length,
    artifactCount: [...referencedOutputPaths.keys()].filter((relativePath) => relativePath?.endsWith(".png")).length,
  };
}

async function loadExactRecordReference(root, ref, idField, issues, code) {
  try {
    const parsed = await readCanonicalJson(root, ref.path);
    const actualRef = {
      path: ref.path,
      id: parsed.value[idField],
      contentHash: parsed.value.contentHash,
      byteLength: parsed.bytes.byteLength,
      fileSha256: parsed.fileSha256,
    };
    if (!sameRef(ref, actualRef) || parsed.value.contentHash !== contentHashSlice05Validation(parsed.value)) {
      issue(issues, code, ref.path, "record reference does not bind exact canonical bytes/content");
    }
    return { record: parsed.value, ref: actualRef, ...parsed };
  } catch (error) {
    addThrownIssue(issues, code, String(ref?.path), error);
    return null;
  }
}

async function validateCalibrationOutputClosure({
  issues,
  sliceRoot,
  resultsRoot,
  definitionIndex,
  requestById,
  resultItems,
  unmatchedFiles,
}) {
  const implementationByRole = new Map((definitionIndex.implementationRefs ?? []).map(({ role, ref }) => [role, ref]));
  const adapterImplementation = implementationByRole.get("candidate-adapter");
  const oracleImplementation = implementationByRole.get("independent-oracle");
  const expectedAdapterRef = adapterImplementation ? {
    id: adapterImplementation.id,
    version: adapterImplementation.version,
    implementationSha256: adapterImplementation.implementationSha256,
  } : null;
  const expectedOracleRef = oracleImplementation ? {
    id: oracleImplementation.id,
    version: oracleImplementation.version,
    implementationSha256: oracleImplementation.implementationSha256,
  } : null;
  const runtimeBundle = await loadExactRecordReference(
    sliceRoot,
    definitionIndex.runtimeAttestationRef,
    "runtimeAttestationId",
    issues,
    "CALIBRATION_RUNTIME_ATTESTATION_INVALID",
  );
  const referenced = new Set();
  for (const item of resultItems) {
    const result = item.record;
    if (result.status !== "pass" || result.expectedDisposition !== "applicable") continue;
    const request = requestById.get(result.requestRef?.id)?.record;
    let expectedArtifactPath;
    let expectedArtifactRecordPath;
    let expectedOraclePath;
    try {
      expectedArtifactPath = artifactRelativePathSlice05(result);
      expectedArtifactRecordPath = artifactRecordRelativePathSlice05(result);
      expectedOraclePath = oracleRelativePathSlice05(result);
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_OUTPUT_PATH_INVALID", item.definitionRelative, error);
      continue;
    }
    if (result.artifactRef?.relativePath !== expectedArtifactPath
      || result.artifactRef?.recordRelativePath !== expectedArtifactRecordPath
      || result.oracleResultRef?.relativePath !== expectedOraclePath) {
      issue(issues, "CALIBRATION_OUTPUT_PATH_INVALID", item.definitionRelative, "output paths do not encode mode/operation/source/repetition/attempt");
    }
    for (const outputPath of [expectedArtifactPath, expectedArtifactRecordPath, expectedOraclePath]) {
      if (referenced.has(outputPath)) issue(issues, "CALIBRATION_OUTPUT_DUPLICATE_REFERENCE", item.definitionRelative, outputPath);
      referenced.add(outputPath);
      unmatchedFiles.delete(outputPath);
    }

    let artifactRecord = null;
    let artifactRecordParsed = null;
    try {
      artifactRecordParsed = await readCanonicalJson(resultsRoot, expectedArtifactRecordPath);
      artifactRecord = artifactRecordParsed.value;
      if (artifactRecordParsed.bytes.byteLength !== result.artifactRef.recordByteLength
        || artifactRecordParsed.fileSha256 !== result.artifactRef.recordFileSha256) {
        issue(issues, "CALIBRATION_ARTIFACT_RECORD_FILE_INVALID", item.definitionRelative, expectedArtifactRecordPath);
      }
      if (result.operation === "normalize") validateNormalizedImageSlice05(artifactRecord);
      else validateDeliveryArtifactSlice05(artifactRecord);
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_ARTIFACT_RECORD_INVALID", item.definitionRelative, error);
    }
    let artifactBytes = null;
    let decoded = null;
    try {
      artifactBytes = await readFile(path.join(resultsRoot, expectedArtifactPath));
      if (artifactBytes.byteLength !== result.artifactRef.byteLength
        || sha256Slice05Validation(artifactBytes) !== result.artifactRef.fileSha256) {
        throw new Error("candidate artifact bytes differ from run-result identity");
      }
      decoded = decodeIndependentPngSlice05(artifactBytes);
      if (!decoded.filter0Only || decoded.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256) {
        throw new Error("candidate artifact violates the independent PNG/pixel profile");
      }
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_ARTIFACT_REOPEN_INVALID", item.definitionRelative, error);
    }
    const facts = decoded ? {
      mime: decoded.mime,
      byteLength: decoded.byteLength,
      fileSha256: decoded.fileSha256,
      decodedPixelSha256: decoded.decodedPixelSha256,
      width: decoded.width,
      height: decoded.height,
      pixelLayout: decoded.pixelLayout,
      colorSpace: decoded.colorSpace,
      orientation: decoded.orientation,
      alphaMode: decoded.alphaMode,
      alphaPresent: decoded.alphaPresent,
      metadataPolicy: decoded.metadataPolicy,
      pngFilterPolicy: decoded.filter0Only ? "filter-0-only" : "noncanonical-filter-present",
      interlace: decoded.interlace,
      animation: decoded.animation,
    } : null;
    const expectedImage = facts && Object.fromEntries(Object.entries(facts)
      .filter(([key]) => !new Set(["mime", "byteLength", "fileSha256", "decodedPixelSha256"]).has(key)));
    const expectedRuntimeHashRef = { id: definitionIndex.runtimeAttestationRef?.id, contentHash: definitionIndex.runtimeAttestationRef?.contentHash };
    const expectedHardwareHashRef = { id: definitionIndex.hardwareRef?.id, contentHash: definitionIndex.hardwareRef?.contentHash };
    const expectedCandidateHashRef = { id: definitionIndex.candidateRef?.id, contentHash: definitionIndex.candidateRef?.contentHash };
    const parentMatches = result.operation === "normalize"
      ? artifactRecord?.parent?.sourceAssetId === request?.attempt?.sourceId
        && artifactRecord?.parent?.sourceFileSha256 === request?.sourceIdentity?.rawAssetRef?.fileSha256
        && artifactRecord?.parent?.sourceDecodedPixelSha256 === request?.sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256
        && artifactRecord?.parent?.sourceManifestSha256 === request?.sourceIdentity?.sourceProvenanceRef?.contentHash
      : artifactRecord?.parent?.normalizedImageId === request?.sourceIdentity?.normalizedArtifactRef?.id
        && artifactRecord?.parent?.normalizedArtifactSha256 === request?.sourceIdentity?.normalizedArtifactRef?.contentHash
        && artifactRecord?.parent?.normalizedFileSha256 === request?.sourceIdentity?.rawAssetRef?.fileSha256
        && artifactRecord?.parent?.normalizedDecodedPixelSha256 === request?.sourceIdentity?.rawAssetRef?.sourceDeclarationDecodedPixelSha256;
    if (!artifactRecord || artifactRecord.schemaVersion !== result.artifactRef.schemaVersion
      || artifactRecord.artifactId !== result.artifactRef.id || artifactRecord.contentHash !== result.artifactRef.contentHash
      || artifactRecord.operation !== result.operation || !parentMatches
      || !deepEqual(artifactRecord.capabilityContractRef, { id: request?.contractRef?.id, contentHash: request?.contractRef?.contentHash })
      || !deepEqual(artifactRecord.candidateRef, expectedCandidateHashRef)
      || !deepEqual(artifactRecord.adapterRef, expectedAdapterRef)
      || artifactRecord.producerRef?.kind !== "candidate-adapter"
      || artifactRecord.producerRef?.id !== expectedAdapterRef?.id
      || artifactRecord.producerRef?.version !== expectedAdapterRef?.version
      || artifactRecord.producerRef?.implementationSha256 !== expectedAdapterRef?.implementationSha256
      || !deepEqual(artifactRecord.runtimeRef, expectedRuntimeHashRef)
      || !deepEqual(artifactRecord.hardwareRef, expectedHardwareHashRef)
      || !deepEqual(artifactRecord.attempt, request?.attempt)
      || artifactRecord.bytes?.relativePath !== expectedArtifactPath
      || artifactRecord.bytes?.byteLength !== result.artifactRef.byteLength
      || artifactRecord.bytes?.fileSha256 !== result.artifactRef.fileSha256
      || artifactRecord.bytes?.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256
      || !deepEqual(artifactRecord.image, expectedImage)
      || Date.parse(artifactRecord.createdAt) < Date.parse(result.startedAt)
      || Date.parse(artifactRecord.createdAt) > Date.parse(result.finishedAt)) {
      issue(issues, "CALIBRATION_ARTIFACT_CROSSLINK_INVALID", item.definitionRelative, "artifact record does not bind the exact request/runtime/bytes/pixel lineage");
    }
    if (!result.workerRuntime || !runtimeBundle
      || !deepEqual(result.workerRuntime.payload?.nativeVersions, runtimeBundle.record.versions?.sharpRuntime)
      || result.workerRuntime.payload?.nodeVersion !== runtimeBundle.record.environment?.node?.version
      || result.workerRuntime.payload?.platform !== runtimeBundle.record.environment?.os?.platform
      || result.workerRuntime.payload?.architecture !== runtimeBundle.record.environment?.os?.architecture) {
      issue(issues, "CALIBRATION_WORKER_RUNTIME_INVALID", item.definitionRelative, "worker runtime evidence differs from the frozen runtime attestation");
    }

    let goldRecord = null;
    if (request?.goldRecordRef) {
      goldRecord = (await loadExactRecordReference(
        sliceRoot,
        request.goldRecordRef,
        "goldRecordId",
        issues,
        "CALIBRATION_GOLD_REF_INVALID",
      ))?.record ?? null;
    }
    let oracle = null;
    try {
      const parsedOracle = await readCanonicalJson(resultsRoot, expectedOraclePath);
      oracle = validateOracleResultSlice05(parsedOracle.value);
      if (oracle.oracleResultId !== result.oracleResultRef.id || oracle.contentHash !== result.oracleResultRef.contentHash
        || oracle.actualBytes?.relativePath !== expectedArtifactPath
        || oracle.actualBytes?.byteLength !== result.artifactRef.byteLength
        || oracle.actualBytes?.fileSha256 !== result.artifactRef.fileSha256
        || oracle.actualBytes?.decodedPixelSha256 !== result.artifactRef.decodedPixelSha256
        || !deepEqual(oracle.facts, facts) || oracle.overallStatus !== "pass") {
        throw new Error("oracle record identity/facts differ from the exact result and reopened PNG");
      }
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_ORACLE_RECORD_INVALID", item.definitionRelative, error);
    }
    if (artifactRecord && artifactBytes && goldRecord && oracle && expectedOracleRef) {
      try {
        const args = {
          artifact: artifactRecord,
          actualBytes: artifactBytes,
          goldRecord,
          oracleImplementationSha256: expectedOracleRef.implementationSha256,
          observedAt: oracle.observedAt,
        };
        const recomputed = result.operation === "normalize"
          ? evaluateNormalizedImageSlice05(args)
          : evaluateDeliveryArtifactSlice05({
            ...args,
            parentNormalizedImage: (await readCanonicalJson(sliceRoot, request.sourceIdentity.normalizedArtifactRef.path)).value,
          });
        if (!deepEqual(oracle, recomputed)) throw new Error("persisted oracle differs from full independent 21-check recomputation");
      } catch (error) {
        addThrownIssue(issues, "CALIBRATION_ORACLE_RECOMPUTATION_INVALID", item.definitionRelative, error);
      }
    }
  }
  return referenced;
}

export async function validateSlice05OptionalOpenCalibrationResults({
  operation,
  sliceRoot = DEFAULT_SLICE05_DEFINITION_ROOT,
  resultsRoot = operation ? path.join(sliceRoot, "results", "open-calibration", operation) : null,
  smokeResultsRoot = path.join(sliceRoot, "results", "open-smoke"),
  index = undefined,
  runtimeInventory = undefined,
  smokeValidation = undefined,
} = {}) {
  const issues = [];
  if (!new Set(["normalize", "export"]).has(operation) || typeof resultsRoot !== "string") {
    return { valid: false, issues: [{ code: "CALIBRATION_OPERATION_INVALID", location: String(operation), message: "operation-specific calibration validation requires normalize or export" }] };
  }
  const resolvedResultsRoot = path.resolve(resultsRoot);
  try {
    const stats = await lstat(resolvedResultsRoot);
    const resolvedReal = await realpath(resolvedResultsRoot);
    const normalizedRequested = normalizeRelative(resolvedResultsRoot).toLowerCase();
    const normalizedReal = normalizeRelative(resolvedReal).toLowerCase();
    if (!stats.isDirectory() || stats.isSymbolicLink() || normalizedRequested !== normalizedReal) {
      issue(issues, "CALIBRATION_RESULT_ROOT_LINK_FORBIDDEN", resolvedResultsRoot, "calibration result root must be one real directory");
    }
    if (/(?:^|\/)(?:holdout|formal-holdout|defect-holdout|escape|formal|secret)(?:\/|$)/u.test(normalizedRequested)
      || /(?:^|\/)(?:holdout|formal-holdout|defect-holdout|escape|formal|secret)(?:\/|$)/u.test(normalizedReal)) {
      issue(issues, "CALIBRATION_RESULT_ROOT_BOUNDARY_FORBIDDEN", resolvedResultsRoot, "open calibration cannot be retargeted to formal/holdout/escape/secret material");
    }
  } catch (error) {
    addThrownIssue(issues, "CALIBRATION_RESULT_ROOT_INVALID", resolvedResultsRoot, error);
  }

  let definitionIndex = index;
  let definitionIndexFile;
  try {
    definitionIndexFile = await readCanonicalJson(sliceRoot, SLICE05_DEFINITION_INDEX_PATH);
    if (definitionIndex === undefined) definitionIndex = definitionIndexFile.value;
  } catch (error) {
    addThrownIssue(issues, "CALIBRATION_DEFINITION_INDEX_INVALID", SLICE05_DEFINITION_INDEX_PATH, error);
    return { valid: false, issues };
  }
  const definitionRef = {
    path: SLICE05_DEFINITION_INDEX_PATH,
    id: definitionIndex.definitionIndexId,
    contentHash: definitionIndex.contentHash,
    byteLength: definitionIndexFile.bytes.byteLength,
    fileSha256: definitionIndexFile.fileSha256,
  };
  const upstreamSmoke = smokeValidation ?? await validateSlice05OptionalClosedSmokeResults({
    sliceRoot,
    resultsRoot: smokeResultsRoot,
    index: definitionIndex,
  });
  if (!upstreamSmoke.valid) {
    issue(issues, "CALIBRATION_SMOKE_EVIDENCE_INVALID", "results/open-smoke", "matching closed smoke/Gate B evidence is not independently valid");
  }
  const tree = await listSlice05Tree(resolvedResultsRoot);
  issues.push(...tree.issues);
  const declarations = (definitionIndex.expectedOptionalResults ?? []).filter(({ pathPattern }) => pathPattern.includes("open-calibration"));
  const schemaCache = new Map();
  const records = [];
  const ledgerEvents = [];
  const unmatchedFiles = new Set();
  const prefix = `results/open-calibration/${operation}`;
  async function loadSchema(schemaPath) {
    if (schemaCache.has(schemaPath)) return schemaCache.get(schemaPath);
    try {
      const schema = JSON.parse(await readFile(path.join(sliceRoot, schemaPath), "utf8"));
      schemaCache.set(schemaPath, schema);
      return schema;
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_RESULT_SCHEMA_INVALID", schemaPath, error);
      return null;
    }
  }
  function validateAgainstSchema(record, schema, location) {
    if (!schema) return;
    for (const schemaIssue of validateSlice05SchemaInstance(record, schema, location)) {
      issue(issues, "CALIBRATION_RESULT_SCHEMA_INSTANCE_INVALID", schemaIssue.location, schemaIssue.message);
    }
  }
  for (const relativePath of tree.files) {
    const definitionRelative = `${prefix}/${relativePath}`;
    const matches = declarations.filter(({ pathPattern }) => {
      try { return new RegExp(pathPattern, "u").test(definitionRelative); } catch { return false; }
    });
    if (matches.length !== 1) {
      unmatchedFiles.add(relativePath);
      continue;
    }
    const schema = await loadSchema(matches[0].schemaFile.path);
    if (relativePath.endsWith(".ndjson")) {
      try {
        const text = await readFile(path.join(resolvedResultsRoot, relativePath), "utf8");
        if (text.length < 1 || !text.endsWith("\n")) throw new Error("ledger must contain complete LF-delimited events");
        for (const [lineIndex, line] of text.slice(0, -1).split("\n").entries()) {
          const event = JSON.parse(line);
          const location = `${definitionRelative}[${lineIndex}]`;
          if (JSON.stringify(stableValue(event)) !== line) issue(issues, "CALIBRATION_LEDGER_CANONICAL_INVALID", location, "ledger event is not canonical compact JSON");
          validateAgainstSchema(event, schema, location);
          if (event.contentHash !== contentHashSlice05Validation(event)) issue(issues, "CALIBRATION_LEDGER_CONTENT_HASH_INVALID", location, "event self-hash mismatch");
          ledgerEvents.push({ record: event, location });
        }
      } catch (error) {
        addThrownIssue(issues, "CALIBRATION_LEDGER_INVALID", definitionRelative, error);
      }
      continue;
    }
    if (!relativePath.endsWith(".json")) {
      issue(issues, "CALIBRATION_RESULT_EXTENSION_INVALID", definitionRelative, "registered result records must be JSON or the one ledger NDJSON");
      continue;
    }
    try {
      const parsed = await readCanonicalJson(resolvedResultsRoot, relativePath);
      const record = parsed.value;
      validateAgainstSchema(record, schema, definitionRelative);
      if (record.schemaVersion !== matches[0].resultKind) issue(issues, "CALIBRATION_RESULT_KIND_INVALID", definitionRelative, String(record.schemaVersion));
      if (record.contentHash !== contentHashSlice05Validation(record)) issue(issues, "CALIBRATION_RESULT_CONTENT_HASH_INVALID", definitionRelative, "record self-hash mismatch");
      issues.push(...validateSlice05DefinitionBoundary(record, definitionRelative));
      try {
        if (record.schemaVersion === "local-run-request.slice05.v0") validateSlice05RunRequest(record);
        else if (record.schemaVersion === "run-result.slice05.v0") validateSlice05RunResult(record);
        else if (record.schemaVersion === "calibration-admission.slice05.v0") validateCalibrationAdmissionSlice05(record);
        else if (record.schemaVersion === "calibration-summary.slice05.v0") validateCalibrationSummarySlice05(record);
      } catch (error) {
        addThrownIssue(issues, "CALIBRATION_RESULT_RUNTIME_VALIDATION_FAILED", definitionRelative, error);
      }
      records.push({ record, relativePath, definitionRelative, byteLength: parsed.bytes.byteLength, fileSha256: parsed.fileSha256 });
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_RESULT_JSON_INVALID", definitionRelative, error);
    }
  }
  const byVersion = new Map();
  for (const item of records) {
    const list = byVersion.get(item.record.schemaVersion) ?? [];
    list.push(item);
    byVersion.set(item.record.schemaVersion, list);
  }
  const requests = byVersion.get("local-run-request.slice05.v0") ?? [];
  const claims = byVersion.get("idempotency-claim.slice05.v0") ?? [];
  const results = byVersion.get("run-result.slice05.v0") ?? [];
  const admissions = byVersion.get("calibration-admission.slice05.v0") ?? [];
  const summaries = byVersion.get("calibration-summary.slice05.v0") ?? [];
  for (const forbiddenKind of ["fault-semantics-result.slice05.v0", "smoke-session-audit.slice05.v0", "smoke-summary.slice05.v0", "gate-b-decision.slice05.v0"]) {
    if ((byVersion.get(forbiddenKind) ?? []).length > 0) issue(issues, "SMOKE_RESULT_IN_CALIBRATION_FORBIDDEN", prefix, forbiddenKind);
  }
  if (admissions.length !== 1 || admissions[0]?.relativePath !== "admission/calibration-admission.slice05.v0.json") {
    issue(issues, "CALIBRATION_ADMISSION_CARDINALITY_INVALID", prefix, "exactly one canonical operation admission is required");
  }
  if (summaries.length !== 1 || summaries[0]?.relativePath !== "summaries/calibration-summary.slice05.v0.json") {
    issue(issues, "CALIBRATION_SUMMARY_CARDINALITY_INVALID", prefix, "exactly one canonical operation summary is required");
  }

  const gatePlanBundle = await loadExactRecordReference(sliceRoot, definitionIndex.gateBSmokePlanRef, "gateBPlanId", issues, "CALIBRATION_GATE_PLAN_INVALID");
  let gateDecisionBundle = null;
  try {
    const relativePath = `decisions/${operation}.gate-b-decision.slice05.v0.json`;
    const parsed = await readCanonicalJson(smokeResultsRoot, relativePath);
    const decision = validateGateBDecisionSlice05(parsed.value);
    gateDecisionBundle = {
      record: decision,
      ref: { path: relativePath, id: decision.decisionId, contentHash: decision.contentHash, byteLength: parsed.bytes.byteLength, fileSha256: parsed.fileSha256 },
    };
    if (decision.operation !== operation || decision.decision !== "calibration-ready" || decision.calibrationAuthorized !== true
      || !sameRef(decision.definitionRef, definitionRef) || !sameRef(decision.gateBPlanRef, definitionIndex.gateBSmokePlanRef)) {
      issue(issues, "CALIBRATION_GATE_B_NOT_AUTHORIZED", relativePath, "matching operation Gate B is absent, denied, or bound to different definition evidence");
    }
  } catch (error) {
    addThrownIssue(issues, "CALIBRATION_GATE_B_NOT_AUTHORIZED", `results/open-smoke/decisions/${operation}`, error);
  }
  const preregRef = (definitionIndex.calibrationPreregistrationRefs ?? [])
    .find(({ path: relativePath }) => relativePath.includes(`calibration-${operation}-png`));
  const preregBundle = preregRef
    ? await loadExactRecordReference(sliceRoot, preregRef, "preregistrationId", issues, "CALIBRATION_PREREGISTRATION_INVALID") : null;
  const manifestRefs = (definitionIndex.calibrationManifestRefs ?? [])
    .filter(({ path: relativePath }) => relativePath.startsWith(`manifests/${operation}-`))
    .sort((left, right) => compareText(left.path, right.path));
  const manifestBundles = [];
  for (const manifestRef of manifestRefs) {
    const bundle = await loadExactRecordReference(sliceRoot, manifestRef, "manifestId", issues, "CALIBRATION_MANIFEST_INVALID");
    if (bundle) manifestBundles.push(bundle);
  }
  const admissionItem = admissions[0];
  if (admissionItem && gateDecisionBundle && gatePlanBundle && preregBundle && manifestBundles.length === 2) {
    try {
      const recomputed = buildCalibrationAdmissionSlice05({
        operation,
        definitionRef,
        gateBPlanRef: gatePlanBundle.ref,
        gateBDecision: gateDecisionBundle.record,
        gateBDecisionRef: gateDecisionBundle.ref,
        calibrationPreregistration: preregBundle.record,
        calibrationPreregistrationRef: preregBundle.ref,
        manifests: manifestBundles.map(({ record }) => record),
        manifestRefs: manifestBundles.map(({ ref }) => ref),
        runtimeStartObservation: admissionItem.record.runtimeStartObservation,
        admittedAt: admissionItem.record.admittedAt,
      });
      if (!deepEqual(admissionItem.record, recomputed)
        || Date.parse(admissionItem.record.admittedAt) < Date.parse(gateDecisionBundle.record.decidedAt)) {
        issue(issues, "CALIBRATION_ADMISSION_RECOMPUTATION_MISMATCH", admissionItem.definitionRelative, "admission is not the exact matching Gate B/preregistration/manifests binding");
      }
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_ADMISSION_RECOMPUTATION_FAILED", admissionItem.definitionRelative, error);
    }
  }

  const requestById = new Map();
  const claimByRequest = new Map();
  const resultByRequest = new Map();
  for (const item of requests) {
    const request = item.record;
    const keyHash = sha256Slice05Validation(Buffer.from(request.attempt?.idempotencyKey ?? "", "utf8"));
    if (item.relativePath !== `requests/${keyHash}.request.json`) issue(issues, "CALIBRATION_REQUEST_FILENAME_INVALID", item.definitionRelative, "request filename differs from idempotency hash");
    if (requestById.has(request.requestId)) issue(issues, "CALIBRATION_REQUEST_DUPLICATE", item.definitionRelative, request.requestId);
    requestById.set(request.requestId, item);
  }
  for (const item of claims) {
    const requestItem = requestById.get(item.record.requestRef?.id);
    const request = requestItem?.record;
    const keyHash = request ? sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8")) : null;
    if (!request || item.record.requestRef.contentHash !== request.contentHash
      || item.record.idempotencyKeyHash !== keyHash || item.record.mode !== "calibration" || item.record.operation !== operation
      || !deepEqual(item.record.attempt, request.attempt) || Date.parse(item.record.claimedAt) < Date.parse(request.createdAt)
      || item.record.claimId !== `claim.${keyHash}`
      || item.relativePath !== `claims/${keyHash}.claim.json`) {
      issue(issues, "CALIBRATION_CLAIM_BINDING_INVALID", item.definitionRelative, "claim does not bind exact request/idempotency/time/path");
    }
    if (claimByRequest.has(item.record.requestRef?.id)) issue(issues, "CALIBRATION_CLAIM_DUPLICATE", item.definitionRelative, String(item.record.requestRef?.id));
    claimByRequest.set(item.record.requestRef?.id, item);
  }
  for (const item of results) {
    const result = item.record;
    const requestItem = requestById.get(result.requestRef?.id);
    const request = requestItem?.record;
    const keyHash = request ? sha256Slice05Validation(Buffer.from(request.attempt.idempotencyKey, "utf8")) : null;
    if (!request || result.requestRef.contentHash !== request.contentHash || result.idempotencyKeyHash !== keyHash
      || result.mode !== "calibration" || result.operation !== operation || !deepEqual(result.attempt, request.attempt)
      || result.expectedDisposition !== request.expectedDisposition || result.expectedStableErrorCode !== request.expectedStableErrorCode
      || result.resultId !== `result.${keyHash}` || item.relativePath !== `records/${keyHash}.result.json`
      || !sameRef(result.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || result.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
      || Date.parse(result.startedAt) < Date.parse(request.createdAt) || Date.parse(result.finishedAt) < Date.parse(result.startedAt)) {
      issue(issues, "CALIBRATION_RESULT_REQUEST_BINDING_INVALID", item.definitionRelative, "terminal result does not bind exact request/runtime/time/path");
    }
    const wallElapsedMs = Date.parse(result.finishedAt) - Date.parse(result.startedAt);
    if ((result.durationMs !== null && result.durationMs > SLICE05_SHARP_POLICY.workerTimeoutMs)
      || wallElapsedMs > SLICE05_SHARP_POLICY.workerTimeoutMs + SLICE05_SHARP_POLICY.workerKillConfirmationMs
      || (result.resourceUsage?.maxRssKiB ?? 0) > SLICE05_SHARP_POLICY.observedMaxRssKiB) {
      issue(issues, "CALIBRATION_RESOURCE_BOUNDARY_EXCEEDED", item.definitionRelative, "reported worker duration/RSS exceeds the frozen limit");
    }
    if (resultByRequest.has(result.requestRef?.id)) issue(issues, "CALIBRATION_RESULT_DUPLICATE", item.definitionRelative, String(result.requestRef?.id));
    resultByRequest.set(result.requestRef?.id, item);
  }
  for (const [requestId, requestItem] of requestById) {
    if (!claimByRequest.has(requestId) || !resultByRequest.has(requestId)) issue(issues, "CALIBRATION_REQUEST_NOT_TERMINAL", requestItem.definitionRelative, requestId);
  }
  for (const requestId of [...claimByRequest.keys(), ...resultByRequest.keys()]) {
    if (!requestById.has(requestId)) issue(issues, "CALIBRATION_UNREGISTERED_RUN_RECORD", prefix, String(requestId));
  }

  const expectedSources = new Map();
  for (const bundle of manifestBundles) {
    for (const [entryIndex, entry] of (bundle.record.entries ?? []).entries()) {
      expectedSources.set(entry.sourceId, { entry, entryIndex, manifest: bundle.record, manifestRef: bundle.ref });
    }
  }
  const sourceRequests = new Map();
  const implementationByRole = new Map((definitionIndex.implementationRefs ?? []).map(({ role, ref }) => [role, ref]));
  const projectImplementation = (ref) => ref ? ({ id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 }) : null;
  const expectedAdapterRef = projectImplementation(implementationByRole.get("candidate-adapter"));
  const expectedOracleRef = projectImplementation(implementationByRole.get("independent-oracle"));
  for (const item of requests) {
    const request = item.record;
    const expected = expectedSources.get(request.attempt.sourceId);
    if (!expected) {
      issue(issues, "CALIBRATION_UNREGISTERED_SOURCE", item.definitionRelative, request.attempt.sourceId);
      continue;
    }
    const entryHash = contentHashSlice05Validation(expected.entry);
    const expectedDisposition = expected.entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject";
    const expectedRunId = `run.calibration.${operation}.${definitionRef.contentHash.slice(0, 16)}`;
    const expectedKey = `s05.calibration.${operation}.${expected.manifestRef.contentHash.slice(0, 12)}.${entryHash.slice(0, 12)}.r${request.attempt.repetition}.a${request.attempt.attemptNumber}`;
    if (!sameRef(request.definitionRef, definitionRef) || request.mode !== "calibration" || request.operation !== operation
      || !sameRef(request.manifestRef, expected.manifestRef) || !sameRef(request.contractRef, expected.manifest.contractRefs?.[0])
      || request.manifestEntryRef.entryIndex !== expected.entryIndex || request.manifestEntryRef.sourceId !== expected.entry.sourceId
      || request.manifestEntryRef.contentHash !== entryHash || request.attempt.partition !== expected.entry.partition
      || request.attempt.runId !== expectedRunId || request.attempt.idempotencyKey !== expectedKey
      || request.expectedDisposition !== expectedDisposition || request.expectedStableErrorCode !== expected.entry.expectedStableErrorCode
      || !sameRef(request.sourceIdentity.sourceProvenanceRef, expected.entry.sourceProvenanceRef)
      || !deepEqual(request.sourceIdentity.rawAssetRef, expected.entry.rawAsset)
      || !deepEqual(request.sourceIdentity.normalizedArtifactRef, expected.entry.normalizedArtifactRef)
      || !deepEqual(request.goldRecordRef, expected.entry.goldRecordRef)
      || !sameRef(request.runtimeAttestationRef, definitionIndex.runtimeAttestationRef)
      || request.runtimeAttestationRef.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
      || !deepEqual(request.adapterRef, expectedAdapterRef) || !deepEqual(request.oracleRef, expectedOracleRef)
      || Date.parse(request.createdAt) < Date.parse(admissionItem?.record?.admittedAt ?? definitionIndex.frozenAt)) {
      issue(issues, "CALIBRATION_REQUEST_MATERIALIZATION_INVALID", item.definitionRelative, "request differs from frozen admitted manifest entry/runtime/implementation/time");
    }
    const list = sourceRequests.get(request.attempt.sourceId) ?? [];
    list.push(request);
    sourceRequests.set(request.attempt.sourceId, list);
  }
  for (const [sourceId, expected] of expectedSources) {
    const requestsForSource = sourceRequests.get(sourceId) ?? [];
    const allReplacements = requestsForSource.filter(({ attempt }) => attempt.attemptNumber === 2);
    if (allReplacements.length > 1) issue(issues, "CALIBRATION_REPLACEMENT_LIMIT_EXCEEDED", sourceId, "at most one replacement is allowed per source across all repetitions");
    for (const repetition of [1, 2, 3]) {
      const initial = requestsForSource.filter(({ attempt }) => attempt.repetition === repetition && attempt.attemptNumber === 1);
      const replacements = requestsForSource.filter(({ attempt }) => attempt.repetition === repetition && attempt.attemptNumber === 2);
      if (initial.length !== 1 || replacements.length > 1) issue(issues, "CALIBRATION_DENOMINATOR_SLOT_INVALID", sourceId, `repetition ${repetition}`);
      if (replacements.length === 1) {
        const initialResult = initial[0] ? resultByRequest.get(initial[0].requestId)?.record : null;
        if (!initialResult || initialResult.status !== "invalid-no-result"
          || !new Set(["runner-crash-before-result", "custody-interruption", "integrity-check-failure"]).has(initialResult.reasonCode)) {
          issue(issues, "CALIBRATION_REPLACEMENT_NOT_AUTHORIZED", sourceId, `repetition ${repetition}`);
        }
      }
      const effective = replacements[0] ?? initial[0];
      if (!effective || !resultByRequest.has(effective.requestId)) issue(issues, "CALIBRATION_EFFECTIVE_RESULT_MISSING", sourceId, `repetition ${repetition}`);
    }
    if (requestsForSource.some(({ operation: requestOperation, attempt, manifestRef }) => requestOperation !== operation
      || attempt.partition !== expected.entry.partition || manifestRef.contentHash !== expected.manifestRef.contentHash)) {
      issue(issues, "CALIBRATION_SOURCE_SCOPE_LEAK", sourceId, "source crossed operation/partition/manifest");
    }
  }
  if (expectedSources.size !== 48 || sourceRequests.size !== 48) {
    issue(issues, "CALIBRATION_SOURCE_DENOMINATOR_INVALID", prefix, `${expectedSources.size}/${sourceRequests.size} != 48/48`);
  }

  let previousHash = "0".repeat(64);
  let previousTime = null;
  const eventsByRequest = new Map();
  for (const [eventIndex, item] of ledgerEvents.entries()) {
    const event = item.record;
    const request = requestById.get(event.requestRef?.id)?.record;
    if (event.sequence !== eventIndex + 1 || event.previousEventHash !== previousHash
      || event.eventId !== `event.${eventIndex + 1}.${event.idempotencyKeyHash?.slice(0, 16)}`
      || (previousTime !== null && Date.parse(event.occurredAt) < Date.parse(previousTime))) {
      issue(issues, "CALIBRATION_LEDGER_CHAIN_INVALID", item.location, "sequence/predecessor/time regressed");
    }
    if (!request || request.contentHash !== event.requestRef.contentHash
      || event.idempotencyKeyHash !== sha256Slice05Validation(Buffer.from(request?.attempt?.idempotencyKey ?? "", "utf8"))
      || event.mode !== "calibration" || event.operation !== operation || !deepEqual(event.attempt, request?.attempt)) {
      issue(issues, "CALIBRATION_LEDGER_REQUEST_BINDING_INVALID", item.location, "event differs from exact registered request");
    }
    const fixedEventProfiles = {
      "attempt-started": { status: "started", reasonCode: null, publication: false },
      "existing-terminal-returned": { status: "existing", reasonCode: null, publication: false },
      "conflict-rejected": { status: null, reasonCode: "S05_IDEMPOTENCY_CONFLICT", publication: false },
      "publication-intent": { status: "started", reasonCode: null, publication: true },
      "publication-complete": { status: "pass", reasonCode: null, publication: true },
      "publication-reconciliation-unknown": { status: "unknown-reconciliation", reasonCode: "S05_PUBLICATION_RECONCILIATION_UNKNOWN", publication: true },
    };
    const fixedProfile = fixedEventProfiles[event.eventType];
    if (fixedProfile && (event.status !== fixedProfile.status || event.reasonCode !== fixedProfile.reasonCode
      || (event.publication !== null) !== fixedProfile.publication)) {
      issue(issues, "CALIBRATION_LEDGER_EVENT_PROFILE_INVALID", item.location, "event status/reason/publication differs from event type");
    }
    if (new Set(["attempt-terminal", "claim-reconciled"]).has(event.eventType)
      && (event.status === null || new Set(["started", "existing"]).has(event.status) || event.publication !== null)) {
      issue(issues, "CALIBRATION_LEDGER_EVENT_PROFILE_INVALID", item.location, "terminal/reconciled event must carry one terminal status and no publication");
    }
    const list = eventsByRequest.get(event.requestRef?.id) ?? [];
    list.push(item);
    eventsByRequest.set(event.requestRef?.id, list);
    previousHash = event.contentHash;
    previousTime = event.occurredAt;
  }
  for (const [requestId, requestItem] of requestById) {
    const result = resultByRequest.get(requestId)?.record;
    const events = eventsByRequest.get(requestId) ?? [];
    const started = events.filter(({ record }) => record.eventType === "attempt-started");
    const terminal = events.filter(({ record }) => record.eventType === "attempt-terminal");
    const reconciled = events.filter(({ record }) => record.eventType === "claim-reconciled");
    const intent = events.filter(({ record }) => record.eventType === "publication-intent");
    const complete = events.filter(({ record }) => record.eventType === "publication-complete");
    const publicationUnknown = events.filter(({ record }) => record.eventType === "publication-reconciliation-unknown");
    const applicablePass = result?.status === "pass" && result?.expectedDisposition === "applicable";
    const ordinary = started.length === 1 && terminal.length === 1 && reconciled.length === 0;
    const recovered = reconciled.length === 1 && started.length === 0 && terminal.length === 0;
    const publicationRecovered = applicablePass && started.length === 1 && terminal.length === 0 && reconciled.length === 1;
    if (!result || (!ordinary && !recovered && !publicationRecovered)) {
      issue(issues, "CALIBRATION_EVENT_LIFECYCLE_INVALID", requestItem.definitionRelative, "request lacks one ordinary, claim-reconciled, or publication-recovery terminal lifecycle");
    }
    const claim = claimByRequest.get(requestId)?.record;
    if (claim && result && (Date.parse(claim.claimedAt) > Date.parse(result.startedAt)
      || ((ordinary || publicationRecovered)
        && (Date.parse(started[0].record.occurredAt) < Date.parse(result.startedAt)
          || Date.parse(started[0].record.occurredAt) > Date.parse(result.finishedAt))))) {
      issue(issues, "CALIBRATION_EVENT_TIME_INVALID", requestItem.definitionRelative, "claim/start/result time order regressed");
    }
    const final = ordinary ? terminal[0]?.record : reconciled[0]?.record;
    if (result && final && (final.status !== result.status || final.reasonCode !== result.reasonCode
      || Date.parse(final.occurredAt) < Date.parse(result.finishedAt))) {
      issue(issues, "CALIBRATION_EVENT_TERMINAL_INVALID", requestItem.definitionRelative, "terminal event differs from result");
    }
    if (final && (ordinary || publicationRecovered) && started[0].record.sequence >= final.sequence) {
      issue(issues, "CALIBRATION_EVENT_SEQUENCE_INVALID", requestItem.definitionRelative, "attempt-started must precede the terminal or reconciled event");
    }
    for (const existing of events.filter(({ record }) => record.eventType === "existing-terminal-returned")) {
      if (!final || existing.record.sequence <= final.sequence
        || Date.parse(existing.record.occurredAt) < Date.parse(final.occurredAt)) {
        issue(issues, "CALIBRATION_EVENT_SEQUENCE_INVALID", existing.location, "existing-terminal-returned must follow the immutable terminal lifecycle");
      }
    }
    if (publicationUnknown.length !== 0) {
      issue(issues, "CALIBRATION_PUBLICATION_RECONCILIATION_UNKNOWN", requestItem.definitionRelative, "closed calibration cannot retain an unresolved publication reconciliation event");
    }
    if (applicablePass) {
      if (intent.length !== 1 || complete.length !== 1 || !deepEqual(intent[0]?.record?.publication, complete[0]?.record?.publication)
        || started[0]?.record?.sequence >= intent[0]?.record?.sequence
        || intent[0]?.record?.sequence >= complete[0]?.record?.sequence
        || complete[0]?.record?.sequence >= final?.sequence
        || Date.parse(intent[0]?.record?.occurredAt) < Date.parse(result.finishedAt)
        || Date.parse(intent[0]?.record?.occurredAt) > Date.parse(complete[0]?.record?.occurredAt)
        || Date.parse(complete[0]?.record?.occurredAt) > Date.parse(final?.occurredAt)) {
        issue(issues, "CALIBRATION_PUBLICATION_LIFECYCLE_INVALID", requestItem.definitionRelative, "applicable pass lacks exact ordered intent/complete publication");
      }
      const publication = complete[0]?.record?.publication;
      const keyHash = sha256Slice05Validation(Buffer.from(requestItem.record.attempt.idempotencyKey, "utf8"));
      const expectedPaths = new Map([
        ["artifact-bytes", result.artifactRef?.relativePath],
        ["artifact-record", result.artifactRef?.recordRelativePath],
        ["oracle", result.oracleResultRef?.relativePath],
        ["result", resultByRequest.get(requestId)?.relativePath],
      ]);
      if (publication?.transactionId !== `publication.${keyHash}` || publication?.stagingDirectory !== `.staging/${keyHash}`
        || publication?.files?.length !== 4 || !pathsEqual((publication?.files ?? []).map(({ role }) => role), expectedPaths.keys())) {
        issue(issues, "CALIBRATION_PUBLICATION_FILE_SET_INVALID", requestItem.definitionRelative, "publication does not contain four exact roles");
      }
      for (const file of publication?.files ?? []) {
        if (file.canonicalPath !== expectedPaths.get(file.role) || !safeRelativePath(file.canonicalPath)
          || !safeRelativePath(file.stagedPath) || !file.stagedPath.startsWith(`${publication.stagingDirectory}/`)) {
          issue(issues, "CALIBRATION_PUBLICATION_PATH_INVALID", requestItem.definitionRelative, String(file.canonicalPath));
          continue;
        }
        try {
          const bytes = await readFile(path.join(resolvedResultsRoot, file.canonicalPath));
          if (bytes.byteLength !== file.byteLength || sha256Slice05Validation(bytes) !== file.fileSha256) throw new Error("published bytes differ");
        } catch (error) {
          addThrownIssue(issues, "CALIBRATION_PUBLICATION_FILE_INVALID", file.canonicalPath, error);
        }
      }
    } else if (intent.length !== 0 || complete.length !== 0) {
      issue(issues, "CALIBRATION_PUBLICATION_FOR_NONPASS_FORBIDDEN", requestItem.definitionRelative, "nonpass/rejection cannot publish output material");
    }
  }

  await validateCalibrationOutputClosure({
    issues,
    sliceRoot,
    resultsRoot: resolvedResultsRoot,
    definitionIndex,
    requestById,
    resultItems: results,
    unmatchedFiles,
  });

  const admissionRef = admissionItem ? {
    path: admissionItem.relativePath,
    id: admissionItem.record.admissionId,
    contentHash: admissionItem.record.contentHash,
    byteLength: admissionItem.byteLength,
    fileSha256: admissionItem.fileSha256,
  } : null;
  const summaryItem = summaries[0];
  if (summaryItem && admissionItem && gateDecisionBundle && manifestBundles.length === 2) {
    try {
      const startObservation = validateRuntimeInventoryObservationSlice05(admissionItem.record.runtimeStartObservation);
      const endObservation = validateRuntimeInventoryObservationSlice05(summaryItem.record.runtimeEndObservation);
      const freshInventoryCanonical = runtimeInventory === undefined
        ? null : stableStringifySlice05Validation(runtimeInventory);
      if (startObservation.status !== "observed" || endObservation.status !== "observed"
        || startObservation.matchesFrozen !== true || endObservation.matchesFrozen !== true
        || startObservation.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
        || endObservation.inventoryPayloadSha256 !== definitionIndex.runtimeAttestationRef?.inventoryPayloadSha256
        || startObservation.inventoryCanonicalJson !== endObservation.inventoryCanonicalJson
        || freshInventoryCanonical === null
        || startObservation.inventoryCanonicalJson !== freshInventoryCanonical
        || Date.parse(startObservation.observedAt) < Date.parse(gateDecisionBundle.record.decidedAt)
        || Date.parse(startObservation.observedAt) > Date.parse(admissionItem.record.admittedAt)
        || Date.parse(endObservation.observedAt) < Math.max(...results.map(({ record }) => Date.parse(record.finishedAt)))) {
        issue(issues, "CALIBRATION_RUNTIME_OBSERVATION_INVALID", summaryItem.definitionRelative, "durable start/end inventory observations are not exact, stable, current, frozen, and time ordered");
      }
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_RUNTIME_OBSERVATION_INVALID", summaryItem.definitionRelative, error);
    }
    const registeredCases = manifestBundles.flatMap((bundle) => bundle.record.entries.map((entry) => ({
      sourceId: entry.sourceId,
      partition: entry.partition,
      expectedDisposition: entry.expectedDisposition === "artifact-required" ? "applicable" : "preflight-reject",
      repetitions: entry.repetitions,
      manifestContentHash: bundle.ref.contentHash,
    })));
    try {
      const recomputed = buildCalibrationSummarySlice05({
        operation,
        definitionRef,
        gateBDecision: gateDecisionBundle.record,
        gateBDecisionRef: gateDecisionBundle.ref,
        admission: admissionItem.record,
        admissionRef,
        manifestRefs: manifestBundles.map(({ ref }) => ref),
        registeredCases,
        terminalResults: results.map(({ record }) => record),
        runtimeAttestationRef: definitionIndex.runtimeAttestationRef,
        runtimeStartObservation: admissionItem.record.runtimeStartObservation,
        runtimeEndObservation: summaryItem.record.runtimeEndObservation,
        outputClosurePass: unmatchedFiles.size === 0
          && issues.every(({ code }) => !/^(?:CALIBRATION_(?:ARTIFACT|ORACLE|OUTPUT|PUBLICATION|WORKER)|UNREGISTERED_CANDIDATE_PNG)/u.test(code)),
        startedAt: summaryItem.record.startedAt,
        finishedAt: summaryItem.record.finishedAt,
      });
      if (!deepEqual(summaryItem.record, recomputed)) {
        issue(issues, "CALIBRATION_SUMMARY_RECOMPUTATION_MISMATCH", summaryItem.definitionRelative, "summary differs from exact 48x3 raw terminal history/admission/runtime/output closure");
      }
      const operationResults = results.map(({ record }) => record);
      if (operationResults.some((result) => Date.parse(summaryItem.record.startedAt) > Date.parse(result.startedAt)
        || Date.parse(summaryItem.record.finishedAt) < Date.parse(result.finishedAt))) {
        issue(issues, "CALIBRATION_SUMMARY_TIME_INVALID", summaryItem.definitionRelative, "summary interval does not enclose all operation results");
      }
    } catch (error) {
      addThrownIssue(issues, "CALIBRATION_SUMMARY_RECOMPUTATION_FAILED", summaryItem.definitionRelative, error);
    }
  }
  const expectedDirectories = new Set();
  for (const relativePath of tree.files) {
    const segments = relativePath.split("/").slice(0, -1);
    for (let length = 1; length <= segments.length; length += 1) expectedDirectories.add(segments.slice(0, length).join("/"));
  }
  if (!pathsEqual(tree.directories, expectedDirectories)) {
    issue(issues, "CALIBRATION_RESULT_DIRECTORY_ALLOWLIST_MISMATCH", prefix, "calibration results cannot retain empty/staging/lock/extra directories");
  }
  for (const relativePath of unmatchedFiles) {
    issue(issues, relativePath.toLowerCase().endsWith(".png") ? "UNREGISTERED_CANDIDATE_PNG" : "CALIBRATION_RESULT_ALLOWLIST_MISMATCH",
      `${prefix}/${relativePath}`, "file is not a registered record or uniquely referenced applicable-pass output");
  }
  return {
    valid: issues.length === 0,
    issues,
    operation,
    fileCount: tree.files.length,
    requestCount: requests.length,
    resultCount: results.length,
  };
}

async function validatePostRunEvidence(snapshot, runtimeInventory) {
  const { issues, sliceRoot, allTree, index } = snapshot;
  const resultFiles = allTree.files.filter((relativePath) => relativePath.startsWith("results/"));
  const resultDirectories = new Set(allTree.directories.filter((relativePath) => relativePath === "results" || relativePath.startsWith("results/")));
  const smokePresent = resultDirectories.has("results/open-smoke")
    || resultFiles.some((relativePath) => relativePath.startsWith("results/open-smoke/"));
  const calibrationOperations = ["normalize", "export"].filter((operation) => resultDirectories.has(`results/open-calibration/${operation}`)
    || resultFiles.some((relativePath) => relativePath.startsWith(`results/open-calibration/${operation}/`)));
  if (resultDirectories.has("results") && !smokePresent && calibrationOperations.length === 0) {
    issue(issues, "EMPTY_RESULTS_ROOT_FORBIDDEN", "results", "results root cannot exist without one complete registered open result subtree");
  }
  if (resultDirectories.has("results/open-calibration") && calibrationOperations.length === 0) {
    issue(issues, "EMPTY_CALIBRATION_ROOT_FORBIDDEN", "results/open-calibration", "open-calibration root cannot remain empty");
  }
  const unregisteredFiles = resultFiles.filter((relativePath) => !allowedPostRunPath(relativePath, "file"));
  const unregisteredDirectories = [...resultDirectories].filter((relativePath) => !allowedPostRunPath(relativePath, "directory"));
  for (const relativePath of [...unregisteredFiles, ...unregisteredDirectories]) {
    issue(issues, "POST_RUN_RESULT_PATH_FORBIDDEN", relativePath, "only strict open-smoke and admitted operation-specific open-calibration result subtrees are allowed");
  }
  let smokeReport = null;
  if (smokePresent) {
    smokeReport = await validateSlice05OptionalClosedSmokeResults({
      sliceRoot,
      resultsRoot: path.join(sliceRoot, "results", "open-smoke"),
      index,
    });
    issues.push(...smokeReport.issues);
  }
  if (calibrationOperations.length > 0 && !smokePresent) {
    issue(issues, "CALIBRATION_WITHOUT_SMOKE_GATE_FORBIDDEN", "results/open-calibration", "calibration evidence cannot exist before its closed smoke/Gate B evidence");
  }
  const calibrationReports = [];
  for (const operation of calibrationOperations) {
    const report = await validateSlice05OptionalOpenCalibrationResults({
      operation,
      sliceRoot,
      resultsRoot: path.join(sliceRoot, "results", "open-calibration", operation),
      smokeResultsRoot: path.join(sliceRoot, "results", "open-smoke"),
      index,
      runtimeInventory,
      smokeValidation: smokeReport,
    });
    calibrationReports.push(report);
    issues.push(...report.issues);
  }
  return { smoke: smokeReport, calibrations: calibrationReports };
}

export async function validateSlice05Definition({
  sliceRoot = DEFAULT_SLICE05_DEFINITION_ROOT,
  projectRoot = DEFAULT_PROJECT_ROOT,
  pins = SLICE05_DEFINITION_PINS,
  requirePins = true,
  recheckRuntime = true,
  regenerate = true,
  runtimeInventory = undefined,
} = {}) {
  const snapshot = await readDefinitionSnapshot({ sliceRoot, projectRoot, pins, requirePins });
  if (!snapshot.index) return { valid: false, issues: snapshot.issues };
  validateSchemasAndRecords(snapshot);
  const references = await validateReferences(snapshot);
  validateCoreDefinitionSemantics(snapshot, references);
  validateManifestAndFixtureSemantics(snapshot);
  validatePlansAndPreregistrations(snapshot);
  validateOptionalResultDeclarations(snapshot);

  let inventory = runtimeInventory;
  if (recheckRuntime || regenerate) inventory = await recheckRuntimeInventory(snapshot, runtimeInventory);
  if (regenerate && inventory) await regenerateDefinitionTwice(snapshot, inventory);

  let generatorSha256 = null;
  try {
    generatorSha256 = sha256Slice05Validation(await readFile(path.join(projectRoot, "scripts", "research-generate-slice05.mjs")));
    checkLiteral(snapshot.issues, "GENERATOR_PIN_MISMATCH", "pins.generatorSha256", generatorSha256, pins.generatorSha256, requirePins);
    const generatorRef = references.implementationRefs.get("GEN-INDEPENDENT-OPEN-PNG@0.5.0")?.ref;
    if (!generatorRef || generatorRef.implementationSha256 !== generatorSha256) {
      issue(snapshot.issues, "GENERATOR_IMPLEMENTATION_REF_INVALID", "implementationRefs", "generator implementation ref must match the actual source bytes");
    }
  } catch (error) {
    addThrownIssue(snapshot.issues, "GENERATOR_SOURCE_INVALID", "scripts/research-generate-slice05.mjs", error);
  }

  const postRun = await validatePostRunEvidence(snapshot, inventory);

  return {
    valid: snapshot.issues.length === 0,
    issues: snapshot.issues,
    counts: snapshot.index.counts,
    frozenAt: snapshot.index.frozenAt,
    definitionIndexContentHash: snapshot.index.contentHash,
    definitionIndexFileSha256: snapshot.indexFile.fileSha256,
    descendantTreeSha256: snapshot.computedDescendantTree,
    schemaTreeSha256: snapshot.schemaTreeSha256,
    fullTreeSha256: snapshot.fullTreeSha256,
    readmeSha256: snapshot.readmeFile?.fileSha256 ?? null,
    generatorSha256,
    postRun,
  };
}

export async function assertSlice05Definition(options = {}) {
  const report = await validateSlice05Definition(options);
  if (!report.valid) throw new Slice05ValidationError(report.issues);
  return report;
}

async function main() {
  const report = await validateSlice05Definition();
  if (!report.valid) {
    process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
