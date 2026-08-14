import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashRecordWithout } from "./research-generate-fixtures.mjs";
import { DEFAULT_SLICE02_ROOT } from "./research-generate-slice02.mjs";
import { averageHashRgba, decodeReferencePng, isValidUtcDateTime } from "./research-reference-adapters.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ADAPTER_PATH = path.resolve(path.dirname(SCRIPT_PATH), "research-reference-adapters.mjs");
const PARTITIONS = ["dev/calibration", "holdout", "defect/calibration", "defect/holdout", "escape"];
const SUITES = ["NORMALIZE-DELIVER", "MATTE-GT"];
const CONTRACT_IDS = new Map([
  ["CC-CAP02-NORMALIZE", { domain: "CAP-02", output: "NormalizedImage" }],
  ["CC-CAP02-EXPORT", { domain: "CAP-02", output: "DeliveryArtifact" }],
  ["CC-CAP03-SOURCE-CARD-V0", { domain: "CAP-03", output: "SourceCard.v0" }],
  ["CC-CAP04-MATTE-SIMPLE", { domain: "CAP-04", output: "AlphaMatte" }],
]);
const SCHEMAS = new Map([
  ["image-asset.v0.schema.json", "image-asset.v0.schema.json"],
  ["capability-contract.v0.schema.json", "capability-contract.v0.schema.json"],
  ["normalized-image.v0.schema.json", "normalized-image.v0.schema.json"],
  ["rgba8-pixel-buffer.v0.schema.json", "rgba8-pixel-buffer.v0.schema.json"],
  ["delivery-artifact.v0.schema.json", "delivery-artifact.v0.schema.json"],
  ["source-card.v0.schema.json", "source-card.v0.schema.json"],
  ["subject-map.v0.schema.json", "subject-map.v0.schema.json"],
  ["alpha-matte.v0.schema.json", "alpha-matte.v0.schema.json"],
  ["fixture-manifest.v1.schema.json", "fixture-manifest.v1.schema.json"],
  ["rights-record.v1.schema.json", "rights-record.v1.schema.json"],
  ["suite-partition-plan.v0.schema.json", "suite-partition-plan.v0.schema.json"],
]);

export class Slice02ValidationError extends Error {
  constructor(issues) {
    super(`Slice 02 validation failed with ${issues.length} issue(s)`);
    this.name = "Slice02ValidationError";
    this.issues = issues;
  }
}

function add(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(issues, value, keys, location) {
  if (!isRecord(value)) {
    add(issues, "TYPE_OBJECT", location, "must be an object");
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  const missing = expected.filter((key) => !actual.includes(key));
  const unknown = actual.filter((key) => !expected.includes(key));
  if (missing.length) add(issues, "MISSING_FIELD", location, `missing: ${missing.join(", ")}`);
  if (unknown.length) add(issues, "UNKNOWN_FIELD", location, `unknown: ${unknown.join(", ")}`);
  return missing.length === 0 && unknown.length === 0;
}

function equal(issues, actual, expected, location, code = "VALUE_MISMATCH") {
  if (actual !== expected) add(issues, code, location, `must equal ${JSON.stringify(expected)}`);
}

function string(issues, value, location) {
  if (typeof value !== "string" || value.trim() === "") add(issues, "STRING_INVALID", location, "must be non-empty");
}

function stringArray(issues, value, location, { min = 1 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    add(issues, "STRING_ARRAY_INVALID", location, `must contain at least ${min} non-empty string(s)`);
  } else if (new Set(value).size !== value.length) {
    add(issues, "ARRAY_DUPLICATE", location, "must contain unique values");
  }
}

function sha(issues, value, location) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) add(issues, "SHA256_INVALID", location, "must be lowercase SHA-256");
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJson(target, issues, location) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    add(issues, "JSON_READ_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function listFiles(directory, issues, base = "") {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return files;
    throw error;
  }
  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) add(issues, "SYMLINK_FORBIDDEN", relative, "records and assets may not be symlinks");
    else if (entry.isDirectory()) files.push(...await listFiles(absolute, issues, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function validateMachineSchemaNode(issues, node, location, rootDefinitions) {
  if (!isRecord(node)) return;
  if (node.type === "object") {
    if (node.additionalProperties !== false) add(issues, "SCHEMA_OBJECT_NOT_STRICT", location, "must set additionalProperties=false");
    if (!isRecord(node.properties) || !Array.isArray(node.required)) add(issues, "SCHEMA_OBJECT_SHAPE_INVALID", location, "must declare properties and required");
    else if (JSON.stringify(Object.keys(node.properties).sort()) !== JSON.stringify([...new Set(node.required)].sort())) {
      add(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "all object properties must be required");
    }
  }
  if (node.type === "array" && !Object.hasOwn(node, "items")) add(issues, "SCHEMA_ARRAY_OPEN", location, "array must constrain items");
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/")) {
    const key = node.$ref.slice("#/$defs/".length);
    if (!isRecord(rootDefinitions) || !Object.hasOwn(rootDefinitions, key)) add(issues, "SCHEMA_REF_UNRESOLVED", location, node.$ref);
  }
  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) validateMachineSchemaNode(issues, value, `${location}.${key}`, rootDefinitions);
    else if (Array.isArray(value)) value.forEach((entry, index) => {
      if (isRecord(entry)) validateMachineSchemaNode(issues, entry, `${location}.${key}[${index}]`, rootDefinitions);
    });
  }
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function schemaTypeMatches(value, type) {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return false;
}

export function validateJsonSchemaInstance(value, schema, location = "$") {
  const errors = [];
  const visit = (instance, node, where, root) => {
    if (!isRecord(node)) return;
    if (typeof node.$ref === "string") {
      if (!node.$ref.startsWith("#/$defs/")) {
        errors.push({ location: where, message: `unsupported reference ${node.$ref}` });
        return;
      }
      const target = root.$defs?.[node.$ref.slice("#/$defs/".length)];
      if (!target) errors.push({ location: where, message: `unresolved reference ${node.$ref}` });
      else visit(instance, target, where, root);
      return;
    }
    if (Object.hasOwn(node, "const") && !deepEqual(instance, node.const)) {
      errors.push({ location: where, message: `must equal ${JSON.stringify(node.const)}` });
    }
    if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(instance, candidate))) {
      errors.push({ location: where, message: "must match one enum value" });
    }
    const types = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
    if (types.length && !types.some((type) => schemaTypeMatches(instance, type))) {
      errors.push({ location: where, message: `must have type ${types.join("|")}` });
      return;
    }
    if (typeof instance === "string") {
      if (Number.isInteger(node.minLength) && instance.length < node.minLength) errors.push({ location: where, message: `must have length >= ${node.minLength}` });
      if (typeof node.pattern === "string" && !new RegExp(node.pattern, "u").test(instance)) errors.push({ location: where, message: `must match ${node.pattern}` });
      if (node.format === "date-time" && !isValidUtcDateTime(instance)) errors.push({ location: where, message: "must be a valid UTC date-time" });
    }
    if (typeof instance === "number" && Number.isFinite(instance)) {
      if (typeof node.minimum === "number" && instance < node.minimum) errors.push({ location: where, message: `must be >= ${node.minimum}` });
      if (typeof node.maximum === "number" && instance > node.maximum) errors.push({ location: where, message: `must be <= ${node.maximum}` });
    }
    if (Array.isArray(instance)) {
      if (Number.isInteger(node.minItems) && instance.length < node.minItems) errors.push({ location: where, message: `must contain >= ${node.minItems} items` });
      if (Number.isInteger(node.maxItems) && instance.length > node.maxItems) errors.push({ location: where, message: `must contain <= ${node.maxItems} items` });
      if (node.uniqueItems === true && new Set(instance.map((entry) => JSON.stringify(entry))).size !== instance.length) errors.push({ location: where, message: "must contain unique items" });
      if (node.items) instance.forEach((entry, index) => visit(entry, node.items, `${where}[${index}]`, root));
    }
    if (isRecord(instance)) {
      for (const required of node.required ?? []) if (!Object.hasOwn(instance, required)) errors.push({ location: `${where}.${required}`, message: "is required" });
      const properties = isRecord(node.properties) ? node.properties : {};
      if (node.additionalProperties === false) {
        for (const key of Object.keys(instance)) if (!Object.hasOwn(properties, key)) errors.push({ location: `${where}.${key}`, message: "is not allowed" });
      }
      for (const [key, childSchema] of Object.entries(properties)) {
        if (Object.hasOwn(instance, key)) visit(instance[key], childSchema, `${where}.${key}`, root);
      }
    }
  };
  visit(value, schema, location, schema);
  return errors;
}

function validateAgainstSchema(issues, value, schema, location) {
  for (const error of validateJsonSchemaInstance(value, schema, location)) {
    add(issues, "JSON_SCHEMA_INSTANCE_INVALID", error.location, error.message);
  }
}

async function validateSchemas(root, issues) {
  const loaded = new Map();
  const schemaFiles = (await listFiles(path.join(root, "schemas"), issues)).filter((name) => name.endsWith(".json"));
  for (const name of schemaFiles) if (!SCHEMAS.has(name)) add(issues, "SCHEMA_UNREGISTERED", `schemas/${name}`, "schema is not part of the frozen Slice 02 set");
  for (const name of SCHEMAS.keys()) if (!schemaFiles.includes(name)) add(issues, "SCHEMA_MISSING", "schemas", name);
  for (const [filename, id] of SCHEMAS) {
    const location = `schemas/${filename}`;
    const schema = await readJson(path.join(root, location), issues, location);
    if (!schema) continue;
    equal(issues, schema.$schema, "https://json-schema.org/draft/2020-12/schema", `${location}.$schema`, "SCHEMA_DIALECT_INVALID");
    equal(issues, schema.$id, id, `${location}.$id`, "SCHEMA_ID_INVALID");
    equal(issues, schema.additionalProperties, false, `${location}.additionalProperties`, "SCHEMA_NOT_STRICT");
    validateMachineSchemaNode(issues, schema, location, schema.$defs);
    loaded.set(filename, schema);
  }
  return loaded;
}

function validateContract(issues, value, location, adapterHash, schemas) {
  const keys = ["schemaVersion", "capabilityContractId", "capabilityDomain", "contractVersion", "frozenAt", "status", "inputArtifactTypes", "outputArtifactTypes", "inputSchemaRefs", "outputSchemaRefs", "scope", "eligibility", "rejectionConditions", "parameterFields", "executor", "semantics", "changeContract", "qa", "operations", "governance", "evidence", "releaseStatus", "contractHash"];
  if (!exactKeys(issues, value, keys, location)) return;
  equal(issues, value.schemaVersion, "capability-contract.v0", `${location}.schemaVersion`, "SCHEMA_VERSION_INVALID");
  const expected = CONTRACT_IDS.get(value.capabilityContractId);
  if (!expected) add(issues, "CONTRACT_ID_UNKNOWN", `${location}.capabilityContractId`, String(value.capabilityContractId));
  else {
    equal(issues, value.capabilityDomain, expected.domain, `${location}.capabilityDomain`, "CONTRACT_DOMAIN_MISMATCH");
    if (!value.outputArtifactTypes?.includes(expected.output)) add(issues, "CONTRACT_OUTPUT_MISSING", `${location}.outputArtifactTypes`, expected.output);
  }
  equal(issues, value.contractVersion, "0.2.0", `${location}.contractVersion`);
  equal(issues, value.status, "frozen-research", `${location}.status`);
  for (const field of ["inputArtifactTypes", "outputArtifactTypes", "inputSchemaRefs", "outputSchemaRefs", "eligibility", "rejectionConditions"]) stringArray(issues, value[field], `${location}.${field}`);
  for (const reference of [...(value.inputSchemaRefs ?? []), ...(value.outputSchemaRefs ?? [])]) {
    if (typeof reference !== "string" || !reference.startsWith("schemas/") || !schemas.has(reference.slice("schemas/".length))) {
      add(issues, "SCHEMA_REF_UNRESOLVED", `${location}.inputOutputSchemaRefs`, String(reference));
    }
  }
  string(issues, value.scope, `${location}.scope`);
  if (!Array.isArray(value.parameterFields)) add(issues, "PARAMETERS_INVALID", `${location}.parameterFields`, "must be array");
  else value.parameterFields.forEach((entry, index) => {
    const where = `${location}.parameterFields[${index}]`;
    if (exactKeys(issues, entry, ["name", "type", "required", "constraint"], where)) {
      string(issues, entry.name, `${where}.name`); string(issues, entry.type, `${where}.type`); string(issues, entry.constraint, `${where}.constraint`);
      if (typeof entry.required !== "boolean") add(issues, "TYPE_BOOLEAN", `${where}.required`, "must be boolean");
    }
  });
  if (exactKeys(issues, value.executor, ["registryId", "adapterId", "adapterVersion", "implementationRef", "algorithm", "model", "checkpoint", "executionLocation", "processingRegion", "dataPolicyVersion"], `${location}.executor`)) {
    equal(issues, value.executor.adapterVersion, "0.2.0", `${location}.executor.adapterVersion`);
    equal(issues, value.executor.implementationRef, `sha256:${adapterHash}`, `${location}.executor.implementationRef`, "IMPLEMENTATION_HASH_MISMATCH");
    for (const key of ["registryId", "adapterId", "algorithm", "model", "checkpoint", "executionLocation", "processingRegion", "dataPolicyVersion"]) string(issues, value.executor[key], `${location}.executor.${key}`);
  }
  if (exactKeys(issues, value.semantics, ["idempotencyScope", "query", "cancel", "timeoutMs", "retry", "reconciliation"], `${location}.semantics`)) {
    if (!Number.isInteger(value.semantics.timeoutMs) || value.semantics.timeoutMs < 1) add(issues, "TIMEOUT_INVALID", `${location}.semantics.timeoutMs`, "must be positive integer");
  }
  if (exactKeys(issues, value.changeContract, ["mustPreserve", "mayChange", "mustNotChange"], `${location}.changeContract`)) {
    for (const field of ["mustPreserve", "mayChange", "mustNotChange"]) stringArray(issues, value.changeContract[field], `${location}.changeContract.${field}`);
  }
  if (exactKeys(issues, value.qa, ["profileId", "checks", "fallback"], `${location}.qa`)) {
    equal(issues, value.qa.profileId, `qa-profile.${value.capabilityContractId.toLowerCase()}.v0.2.0`, `${location}.qa.profileId`, "QA_PROFILE_ID_INVALID");
    stringArray(issues, value.qa.checks, `${location}.qa.checks`);
  }
  if (exactKeys(issues, value.operations, ["costClass", "latencyClass", "hardwareRequirements", "observabilityProfile", "sliSloProfile", "runbookIds"], `${location}.operations`)) {
    stringArray(issues, value.operations.hardwareRequirements, `${location}.operations.hardwareRequirements`);
    stringArray(issues, value.operations.runbookIds, `${location}.operations.runbookIds`);
  }
  exactKeys(issues, value.governance, ["codeLicense", "weightLicense", "dataTerms"], `${location}.governance`);
  if (exactKeys(issues, value.evidence, ["status", "evidenceManifestId", "claimBoundary"], `${location}.evidence`)) {
    equal(issues, value.evidence.status, "C1=0", `${location}.evidence.status`, "EVIDENCE_OVERCLAIM");
    equal(issues, value.evidence.evidenceManifestId, "not-established", `${location}.evidence.evidenceManifestId`);
  }
  equal(issues, value.releaseStatus, "research-only-not-product-fallback", `${location}.releaseStatus`, "RELEASE_OVERCLAIM");
  sha(issues, value.contractHash, `${location}.contractHash`);
  if (hashRecordWithout(value, "contractHash") !== value.contractHash) add(issues, "CONTRACT_HASH_MISMATCH", `${location}.contractHash`, "canonical content changed");
  const serialized = JSON.stringify(value).toLowerCase();
  for (const forbidden of ["pending-definition", "pending-freeze", "pending-selection", "pending-resolution"]) {
    if (serialized.includes(forbidden)) add(issues, "CONTRACT_NOT_FROZEN", location, `contains ${forbidden}`);
  }
}

function validateRights(issues, value, location) {
  if (!exactKeys(issues, value, ["schemaVersion", "rightsRecordId", "recordVersion", "createdAt", "assetClass", "origin", "permissions", "privacy", "evidenceStatus"], location)) return;
  equal(issues, value.schemaVersion, "rights-record.v1", `${location}.schemaVersion`);
  equal(issues, value.assetClass, "project-original-synthetic", `${location}.assetClass`);
  if (exactKeys(issues, value.origin, ["type", "generator", "externalInputs"], `${location}.origin`)) {
    equal(issues, value.origin.type, "project-original-procedural", `${location}.origin.type`);
    if (!Array.isArray(value.origin.externalInputs) || value.origin.externalInputs.length) add(issues, "EXTERNAL_INPUT_FORBIDDEN", `${location}.origin.externalInputs`, "must be empty");
  }
  if (exactKeys(issues, value.permissions, ["processingAllowed", "researchUseAllowed", "publicDisplayAllowed", "redistributionAllowed", "commercialMarketingAllowed", "restrictions"], `${location}.permissions`)) {
    for (const key of ["processingAllowed", "researchUseAllowed"]) equal(issues, value.permissions[key], true, `${location}.permissions.${key}`);
    for (const key of ["publicDisplayAllowed", "redistributionAllowed", "commercialMarketingAllowed"]) equal(issues, value.permissions[key], false, `${location}.permissions.${key}`, "PUBLIC_EXPOSURE_FORBIDDEN");
  }
  if (exactKeys(issues, value.privacy, ["containsRealPerson", "containsPersonalData", "containsThirdPartyMarks"], `${location}.privacy`)) {
    for (const key of Object.keys(value.privacy)) equal(issues, value.privacy[key], false, `${location}.privacy.${key}`, "PRIVACY_BOUNDARY_INVALID");
  }
  if (exactKeys(issues, value.evidenceStatus, ["level", "purpose", "claimBoundary"], `${location}.evidenceStatus`)) equal(issues, value.evidenceStatus.level, "C1=0", `${location}.evidenceStatus.level`, "EVIDENCE_OVERCLAIM");
}

function validatePlan(issues, value, location) {
  const keys = ["schemaVersion", "preregistrationId", "planVersion", "frozenAt", "purpose", "contractRefs", "suites", "partitions", "manifestRefs", "sourceFamilyRule", "captureSessionRule", "deduplicationRule", "catalogRule", "sealedRule", "escapeRule", "evidenceStatus", "planHash"];
  if (!exactKeys(issues, value, keys, location)) return;
  equal(issues, value.schemaVersion, "suite-partition-plan.v0", `${location}.schemaVersion`);
  equal(issues, value.preregistrationId, "partition-plan.slice-02.structural.v0", `${location}.preregistrationId`);
  if (JSON.stringify([...(value.suites ?? [])].sort()) !== JSON.stringify([...SUITES].sort())) add(issues, "PLAN_SUITE_COVERAGE", `${location}.suites`, "must cover both suites");
  if (JSON.stringify(value.partitions) !== JSON.stringify(PARTITIONS)) add(issues, "PLAN_PARTITION_COVERAGE", `${location}.partitions`, "must preserve all five partitions");
  if (!Array.isArray(value.manifestRefs) || value.manifestRefs.length !== 10) add(issues, "PLAN_MANIFEST_COUNT", `${location}.manifestRefs`, "must list ten suite-partition manifests");
  equal(issues, value.evidenceStatus?.level, "C1=0", `${location}.evidenceStatus.level`, "EVIDENCE_OVERCLAIM");
  if (hashRecordWithout(value, "planHash") !== value.planHash) add(issues, "PLAN_HASH_MISMATCH", `${location}.planHash`, "canonical content changed");
}

export async function validateSlice02(
  sliceRoot = DEFAULT_SLICE02_ROOT,
  {
    throwOnError = true,
    referenceAdapterPath = DEFAULT_ADAPTER_PATH,
    reviewCatalogPath,
  } = {},
) {
  const issues = [];
  const schemas = await validateSchemas(sliceRoot, issues);
  const resolvedReviewCatalogPath = reviewCatalogPath ?? path.resolve(sliceRoot, "../manifests/review-catalog.v0.json");
  const adapterHash = hash(await readFile(referenceAdapterPath));

  const contractFiles = (await listFiles(path.join(sliceRoot, "contracts"), issues)).filter((name) => name.endsWith(".json"));
  const contracts = new Map();
  for (const relative of contractFiles) {
    const location = `contracts/${relative}`;
    const value = await readJson(path.join(sliceRoot, location), issues, location);
    if (!value) continue;
    validateAgainstSchema(issues, value, schemas.get("capability-contract.v0.schema.json"), location);
    validateContract(issues, value, location, adapterHash, schemas);
    if (contracts.has(value.capabilityContractId)) add(issues, "CONTRACT_ID_DUPLICATE", location, value.capabilityContractId);
    contracts.set(value.capabilityContractId, value);
  }
  for (const id of CONTRACT_IDS.keys()) if (!contracts.has(id)) add(issues, "CONTRACT_MISSING", "contracts", id);

  const rightsFiles = (await listFiles(path.join(sliceRoot, "rights"), issues)).filter((name) => name.endsWith(".json"));
  const rights = new Map();
  for (const relative of rightsFiles) {
    const location = `rights/${relative}`;
    const value = await readJson(path.join(sliceRoot, location), issues, location);
    if (!value) continue;
    validateAgainstSchema(issues, value, schemas.get("rights-record.v1.schema.json"), location);
    validateRights(issues, value, location);
    rights.set(value.rightsRecordId, value);
  }

  const planLocation = "preregistrations/partition-plan.slice-02.structural.v0.json";
  const plan = await readJson(path.join(sliceRoot, planLocation), issues, planLocation);
  if (plan) {
    validateAgainstSchema(issues, plan, schemas.get("suite-partition-plan.v0.schema.json"), planLocation);
    validatePlan(issues, plan, planLocation);
  }

  const manifestFiles = (await listFiles(path.join(sliceRoot, "manifests"), issues)).filter((name) => name.endsWith(".json"));
  const registeredPaths = new Set();
  const fixtures = [];
  const coverage = new Set();
  const families = new Map();
  const sessions = new Map();
  const exactSourceHashes = new Map();
  const perceptualHashes = [];
  for (const relative of manifestFiles) {
    const location = `manifests/${relative}`;
    const value = await readJson(path.join(sliceRoot, location), issues, location);
    if (!value) continue;
    validateAgainstSchema(issues, value, schemas.get("fixture-manifest.v1.schema.json"), location);
    const keys = ["schemaVersion", "fixtureManifestId", "manifestVersion", "createdAt", "suiteId", "suiteVersion", "partition", "sealedState", "generator", "preregistrationId", "sourcePopulation", "isolationPolicy", "evidenceStatus", "fixtures", "manifestHash"];
    if (!exactKeys(issues, value, keys, location)) continue;
    equal(issues, value.schemaVersion, "fixture-manifest.v1", `${location}.schemaVersion`);
    if (!SUITES.includes(value.suiteId)) add(issues, "SUITE_INVALID", `${location}.suiteId`, String(value.suiteId));
    if (!PARTITIONS.includes(value.partition)) add(issues, "PARTITION_INVALID", `${location}.partition`, String(value.partition));
    coverage.add(`${value.suiteId}|${value.partition}`);
    const expectedSeal = value.partition === "holdout" || value.partition === "defect/holdout" ? "sealed-structural-only" : value.partition === "escape" ? "open-regression" : "open-calibration";
    equal(issues, value.sealedState, expectedSeal, `${location}.sealedState`, "SEALED_STATE_INVALID");
    if (exactKeys(issues, value.generator, ["name", "version", "sourceRevision", "scriptPath", "seed", "externalInputs"], `${location}.generator`)) {
      if (!Array.isArray(value.generator.externalInputs) || value.generator.externalInputs.length) add(issues, "EXTERNAL_INPUT_FORBIDDEN", `${location}.generator.externalInputs`, "must be empty");
    }
    equal(issues, value.evidenceStatus?.level, "C1=0", `${location}.evidenceStatus.level`, "EVIDENCE_OVERCLAIM");
    if (hashRecordWithout(value, "manifestHash") !== value.manifestHash) add(issues, "MANIFEST_HASH_MISMATCH", `${location}.manifestHash`, "canonical content changed");
    if (!Array.isArray(value.fixtures) || value.fixtures.length !== 1) add(issues, "FIXTURE_COUNT_INVALID", `${location}.fixtures`, "structural manifest must contain exactly one fixture");
    for (const [index, fixture] of (value.fixtures ?? []).entries()) {
      const where = `${location}.fixtures[${index}]`;
      const fixtureKeys = ["id", "label", "caseKind", "defectLabel", "expectedDisposition", "sourceFamilyId", "captureSessionId", "derivationLineage", "perceptualHash", "rightsRecordId", "visibility", "difficultCategories", "width", "height", "assets"];
      if (!exactKeys(issues, fixture, fixtureKeys, where)) continue;
      equal(issues, fixture.visibility, "research-private-synthetic", `${where}.visibility`, "PUBLIC_EXPOSURE_FORBIDDEN");
      if (!rights.has(fixture.rightsRecordId)) add(issues, "RIGHTS_MISSING", `${where}.rightsRecordId`, String(fixture.rightsRecordId));
      if (value.partition === "escape" && !fixture.derivationLineage?.some((entry) => entry.startsWith("human-reconstructed-synthetic-regression:"))) add(issues, "ESCAPE_LINEAGE_INVALID", `${where}.derivationLineage`, "must be a human-reconstructed synthetic regression");
      for (const [field, map, leakCode, duplicateCode] of [
        ["sourceFamilyId", families, "SOURCE_FAMILY_PARTITION_LEAK", "SOURCE_FAMILY_DUPLICATE"],
        ["captureSessionId", sessions, "CAPTURE_SESSION_PARTITION_LEAK", "CAPTURE_SESSION_DUPLICATE"],
      ]) {
        const prior = map.get(fixture[field]);
        if (prior) {
          const code = prior.partition === value.partition ? duplicateCode : leakCode;
          add(issues, code, `${where}.${field}`, `${fixture[field]} already belongs to ${prior.fixtureId} in ${prior.partition}`);
        }
        map.set(fixture[field], { partition: value.partition, fixtureId: fixture.id });
      }
      if (!/^[a-f0-9]{16}$/.test(fixture.perceptualHash ?? "")) add(issues, "PERCEPTUAL_HASH_INVALID", `${where}.perceptualHash`, "must be 64-bit hex");
      perceptualHashes.push({ hash: fixture.perceptualHash, id: fixture.id, partition: value.partition });
      const roleSet = new Set();
      for (const [assetIndex, asset] of (fixture.assets ?? []).entries()) {
        const assetWhere = `${where}.assets[${assetIndex}]`;
        if (!exactKeys(issues, asset, ["assetId", "role", "path", "mimeType", "width", "height", "sha256", "exposure"], assetWhere)) continue;
        if (roleSet.has(asset.role)) add(issues, "ASSET_ROLE_DUPLICATE", `${assetWhere}.role`, String(asset.role));
        roleSet.add(asset.role);
        if (asset.width !== fixture.width || asset.height !== fixture.height) add(issues, "FIXTURE_ASSET_DIMENSIONS_MISMATCH", assetWhere, `asset ${asset.width}x${asset.height} must match fixture ${fixture.width}x${fixture.height}`);
        equal(issues, asset.exposure, "catalog-denied", `${assetWhere}.exposure`, "PUBLIC_EXPOSURE_FORBIDDEN");
        const prefix = `fixtures/${value.partition}/${value.suiteId}/${fixture.id}/`;
        if (typeof asset.path !== "string" || !asset.path.startsWith(prefix) || asset.path.includes("..") || asset.path.includes("\\")) add(issues, "ASSET_PATH_INVALID", `${assetWhere}.path`, prefix);
        if (registeredPaths.has(asset.path)) add(issues, "ASSET_PATH_DUPLICATE", `${assetWhere}.path`, String(asset.path));
        registeredPaths.add(asset.path);
        const absolute = path.resolve(sliceRoot, asset.path);
        if (!absolute.startsWith(path.resolve(sliceRoot) + path.sep)) { add(issues, "ASSET_PATH_ESCAPE", `${assetWhere}.path`, String(asset.path)); continue; }
        try {
          const stat = await lstat(absolute);
          if (!stat.isFile() || stat.isSymbolicLink()) { add(issues, "ASSET_NOT_REGULAR", asset.path, "must be regular file"); continue; }
          const bytes = await readFile(absolute);
          if (hash(bytes) !== asset.sha256) add(issues, "ASSET_HASH_MISMATCH", asset.path, "content changed");
          const decoded = decodeReferencePng(bytes);
          if (decoded.width !== asset.width || decoded.height !== asset.height) add(issues, "ASSET_DIMENSIONS_MISMATCH", asset.path, "PNG dimensions differ");
          if (!decoded.srgbDeclared) add(issues, "ASSET_COLOR_PROFILE_MISSING", asset.path, "must embed the frozen sRGB declaration");
          if (asset.role === "source") {
            const prior = exactSourceHashes.get(asset.sha256);
            if (prior) add(issues, "EXACT_SOURCE_DUPLICATE", asset.path, `duplicates ${prior}`);
            exactSourceHashes.set(asset.sha256, asset.path);
            const actualPerceptualHash = averageHashRgba(decoded.width, decoded.height, decoded.rgba);
            if (actualPerceptualHash !== fixture.perceptualHash) add(issues, "PERCEPTUAL_HASH_MISMATCH", `${where}.perceptualHash`, `actual ${actualPerceptualHash}`);
          }
        } catch (error) {
          add(issues, "ASSET_READ_FAILED", asset.path, error instanceof Error ? error.message : String(error));
        }
      }
      const expectedRoles = value.suiteId === "NORMALIZE-DELIVER" ? ["source", "expectedNormalized", "candidateDelivery"] : ["source", "groundTruthAlpha", "candidateAlpha"];
      if (JSON.stringify([...roleSet].sort()) !== JSON.stringify(expectedRoles.sort())) add(issues, "ASSET_ROLE_SET_INVALID", `${where}.assets`, expectedRoles.join(", "));
      fixtures.push({ fixture, manifest: value });
    }
  }
  for (const suite of SUITES) for (const partition of PARTITIONS) if (!coverage.has(`${suite}|${partition}`)) add(issues, "PARTITION_COVERAGE_MISSING", "manifests", `${suite} ${partition}`);
  if (manifestFiles.length !== 10) add(issues, "MANIFEST_COUNT_INVALID", "manifests", `expected 10, got ${manifestFiles.length}`);
  for (let i = 0; i < perceptualHashes.length; i += 1) for (let j = i + 1; j < perceptualHashes.length; j += 1) {
    const a = perceptualHashes[i]; const b = perceptualHashes[j];
    if (a.hash === b.hash) add(issues, "PERCEPTUAL_HASH_DUPLICATE", "manifests", `${a.id} and ${b.id}`);
  }

  const assetFiles = (await listFiles(path.join(sliceRoot, "fixtures"), issues)).map((name) => `fixtures/${name}`);
  for (const relative of assetFiles) if (!registeredPaths.has(relative)) add(issues, "UNREGISTERED_ASSET", relative, "not listed in manifest");
  if (assetFiles.length !== registeredPaths.size) add(issues, "ASSET_COUNT_MISMATCH", "fixtures", `${assetFiles.length} files / ${registeredPaths.size} records`);

  const catalog = await readJson(resolvedReviewCatalogPath, issues, "../manifests/review-catalog.v0.json");
  const catalogText = JSON.stringify(catalog ?? {});
  if (catalogText.includes("slice-02") || catalogText.includes("research/slice-02") || catalogText.includes("research-private-synthetic")) add(issues, "CATALOG_LEAK", "../manifests/review-catalog.v0.json", "Slice 02 private fixture leaked into review catalog");
  for (const { fixture } of fixtures) {
    if (catalogText.includes(fixture.id)) add(issues, "CATALOG_LEAK", "../manifests/review-catalog.v0.json", `contains private fixture ${fixture.id}`);
  }

  if (plan && JSON.stringify([...(plan.manifestRefs ?? [])].sort()) !== JSON.stringify(manifestFiles.map((name) => `manifests/${name}`).sort())) add(issues, "PLAN_MANIFEST_MISMATCH", `${planLocation}.manifestRefs`, "must equal checked-in manifests");

  const result = { ok: issues.length === 0, issues, summary: { contracts: contracts.size, fixtureManifests: manifestFiles.length, fixtures: fixtures.length, assets: registeredPaths.size, partitions: PARTITIONS.length, suites: SUITES.length } };
  if (!result.ok && throwOnError) throw new Slice02ValidationError(issues);
  return result;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
}

if (isMainModule()) {
  const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SLICE02_ROOT;
  const result = await validateSlice02(requestedRoot, { throwOnError: false });
  if (!result.ok) {
    result.issues.forEach((entry) => console.error(`[${entry.code}] ${entry.location}: ${entry.message}`));
    console.error(`Slice 02 validation failed with ${result.issues.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Slice 02 valid: ${result.summary.contracts} frozen research contracts, ${result.summary.fixtures} fixtures, ${result.summary.assets} assets.`);
    console.log("Evidence boundary: C1=0; U1=0; E1=0; R1-pipeline=0; R1-product-validation=0; R1-product-release=0; O1=0; G1=0; V1=0.");
    console.log("Release Gate: allowlist=none; registered=0; approved=0; research-only.");
  }
}
