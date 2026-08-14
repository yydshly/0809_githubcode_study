import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_RESEARCH_ROOT,
  hashRecordWithout,
} from "./research-generate-fixtures.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PARTITIONS = new Set([
  "dev/calibration",
  "holdout",
  "defect/calibration",
  "defect/holdout",
  "escape",
]);
const ASSET_ROLES = [
  "source",
  "alpha",
  "foreground",
  "compositeBlack",
  "compositeWhite",
  "compositeSaturated",
];
const ASSET_FILENAMES = Object.freeze({
  source: "source.png",
  alpha: "alpha.png",
  foreground: "foreground.png",
  compositeBlack: "composite-black.png",
  compositeWhite: "composite-white.png",
  compositeSaturated: "composite-saturated.png",
});

export class ResearchValidationError extends Error {
  constructor(issues) {
    super(`Research fixture validation failed with ${issues.length} issue(s)`);
    this.name = "ResearchValidationError";
    this.issues = issues;
  }
}

function issue(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(issues, value, expected, location) {
  if (!isRecord(value)) {
    issue(issues, "TYPE_OBJECT", location, "must be an object");
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  const missing = wanted.filter((key) => !actual.includes(key));
  const unknown = actual.filter((key) => !wanted.includes(key));
  if (missing.length > 0) {
    issue(issues, "MISSING_FIELD", location, `missing fields: ${missing.join(", ")}`);
  }
  if (unknown.length > 0) {
    issue(issues, "UNKNOWN_FIELD", location, `unknown fields: ${unknown.join(", ")}`);
  }
  return missing.length === 0 && unknown.length === 0;
}

function nonEmptyString(issues, value, location) {
  if (typeof value !== "string" || value.trim() === "") {
    issue(issues, "TYPE_NON_EMPTY_STRING", location, "must be a non-empty string");
    return false;
  }
  return true;
}

function exactValue(issues, value, expected, location, code = "VALUE_MISMATCH") {
  if (value !== expected) {
    issue(issues, code, location, `must equal ${JSON.stringify(expected)}`);
    return false;
  }
  return true;
}

function validVersion(issues, value, location) {
  if (typeof value !== "string" || !/^0\.\d+\.\d+$/.test(value)) {
    issue(issues, "VERSION_INVALID", location, "must be a 0.x.y research version");
    return false;
  }
  return true;
}

function validTimestamp(issues, value, location) {
  if (typeof value !== "string" || !value.endsWith("Z") || Number.isNaN(Date.parse(value))) {
    issue(issues, "TIMESTAMP_INVALID", location, "must be an ISO-8601 UTC timestamp");
    return false;
  }
  return true;
}

function validateEvidenceStatus(issues, value, location, allowClaimBoundary = false) {
  const keys = allowClaimBoundary
    ? ["level", "purpose", "claimBoundary"]
    : ["level", "purpose"];
  if (!exactKeys(issues, value, keys, location)) return;
  exactValue(issues, value.level, "C1=0", `${location}.level`, "EVIDENCE_OVERCLAIM");
  exactValue(issues, value.purpose, "method-rehearsal", `${location}.purpose`, "EVIDENCE_OVERCLAIM");
  if (allowClaimBoundary) nonEmptyString(issues, value.claimBoundary, `${location}.claimBoundary`);
}

async function readJson(filePath, issues, location) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    issue(issues, "JSON_READ_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function safeResearchRelativePath(value) {
  return typeof value === "string"
    && value !== ""
    && !path.isAbsolute(value)
    && !value.includes("\\")
    && !value.split("/").includes("..")
    && value === path.posix.normalize(value)
    && value.startsWith("fixtures/")
    && value.endsWith(".png");
}

function safeAssetUrl(value) {
  return typeof value === "string"
    && /^\/research-assets\/[A-Za-z0-9._/-]+\.png$/.test(value)
    && !value.includes("\\")
    && !value.includes("..")
    && !value.includes("//");
}

function urlForPath(relativePath) {
  return `/research-assets/${relativePath.slice("fixtures/".length)}`;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readPngDimensions(bytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function listFiles(directory, issues, relativeBase = "") {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return files;
    throw error;
  }
  for (const entry of entries) {
    const relative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      issue(issues, "SYMLINK_FORBIDDEN", relative, "research assets and records may not be symbolic links");
    } else if (entry.isDirectory()) {
      files.push(...await listFiles(absolute, issues, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

function validateRightsRecord(issues, record, location) {
  if (!exactKeys(issues, record, [
    "schemaVersion", "rightsRecordId", "recordVersion", "createdAt", "assetClass",
    "origin", "rightsHolder", "license", "permissions", "privacy", "evidenceStatus",
  ], location)) return;
  exactValue(issues, record.schemaVersion, "rights-record.v0", `${location}.schemaVersion`, "SCHEMA_VERSION_INVALID");
  nonEmptyString(issues, record.rightsRecordId, `${location}.rightsRecordId`);
  validVersion(issues, record.recordVersion, `${location}.recordVersion`);
  validTimestamp(issues, record.createdAt, `${location}.createdAt`);
  exactValue(issues, record.assetClass, "public-synthetic", `${location}.assetClass`, "RIGHTS_CLASS_INVALID");

  if (exactKeys(issues, record.origin, ["type", "generator", "externalInputs"], `${location}.origin`)) {
    exactValue(issues, record.origin.type, "project-original-procedural", `${location}.origin.type`);
    nonEmptyString(issues, record.origin.generator, `${location}.origin.generator`);
    if (!Array.isArray(record.origin.externalInputs) || record.origin.externalInputs.length !== 0) {
      issue(issues, "EXTERNAL_INPUT_FORBIDDEN", `${location}.origin.externalInputs`, "must be an empty array");
    }
  }
  if (exactKeys(issues, record.rightsHolder, ["name", "basis"], `${location}.rightsHolder`)) {
    nonEmptyString(issues, record.rightsHolder.name, `${location}.rightsHolder.name`);
    nonEmptyString(issues, record.rightsHolder.basis, `${location}.rightsHolder.basis`);
  }
  if (exactKeys(issues, record.license, ["id", "terms"], `${location}.license`)) {
    nonEmptyString(issues, record.license.id, `${location}.license.id`);
    nonEmptyString(issues, record.license.terms, `${location}.license.terms`);
  }
  if (exactKeys(issues, record.permissions, [
    "processingAllowed", "researchUseAllowed", "publicDisplayAllowed",
    "redistributionAllowed", "commercialMarketingAllowed", "restrictions",
  ], `${location}.permissions`)) {
    for (const key of ["processingAllowed", "researchUseAllowed", "publicDisplayAllowed", "redistributionAllowed", "commercialMarketingAllowed"]) {
      if (typeof record.permissions[key] !== "boolean") {
        issue(issues, "TYPE_BOOLEAN", `${location}.permissions.${key}`, "must be boolean");
      }
    }
    for (const key of ["processingAllowed", "researchUseAllowed", "publicDisplayAllowed"]) {
      exactValue(issues, record.permissions[key], true, `${location}.permissions.${key}`, "RIGHTS_PERMISSION_MISSING");
    }
    nonEmptyString(issues, record.permissions.restrictions, `${location}.permissions.restrictions`);
  }
  if (exactKeys(issues, record.privacy, ["containsRealPerson", "containsPersonalData", "containsThirdPartyMarks"], `${location}.privacy`)) {
    for (const key of ["containsRealPerson", "containsPersonalData", "containsThirdPartyMarks"]) {
      exactValue(issues, record.privacy[key], false, `${location}.privacy.${key}`, "PUBLIC_SYNTHETIC_PRIVACY_INVALID");
    }
  }
  validateEvidenceStatus(issues, record.evidenceStatus, `${location}.evidenceStatus`, true);
}

function validateAssetRecord(issues, asset, role, fixture, manifest, location) {
  if (!exactKeys(issues, asset, ["assetId", "role", "path", "url", "mimeType", "width", "height", "sha256"], location)) return;
  nonEmptyString(issues, asset.assetId, `${location}.assetId`);
  exactValue(issues, asset.role, role, `${location}.role`);
  exactValue(issues, asset.mimeType, "image/png", `${location}.mimeType`);
  exactValue(issues, asset.width, fixture.width, `${location}.width`);
  exactValue(issues, asset.height, fixture.height, `${location}.height`);
  if (!safeResearchRelativePath(asset.path)) {
    issue(issues, "ASSET_PATH_UNSAFE", `${location}.path`, "must be a normalized fixtures/... PNG path without traversal");
  }
  if (!safeAssetUrl(asset.url)) {
    issue(issues, "ASSET_URL_UNSAFE", `${location}.url`, "must be a normalized /research-assets/... PNG URL");
  }
  const expectedPath = `fixtures/${manifest.partition}/${manifest.suiteId}/${fixture.id}/${ASSET_FILENAMES[role]}`;
  exactValue(issues, asset.path, expectedPath, `${location}.path`, "PARTITION_PATH_MISMATCH");
  exactValue(issues, asset.url, urlForPath(expectedPath), `${location}.url`, "ASSET_URL_MISMATCH");
  if (typeof asset.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    issue(issues, "SHA256_INVALID", `${location}.sha256`, "must be a lowercase SHA-256 hex digest");
  }
}

function validateFixtureManifestShape(issues, manifest, location) {
  if (!exactKeys(issues, manifest, [
    "schemaVersion", "fixtureManifestId", "manifestVersion", "createdAt", "suiteId",
    "partition", "generator", "sourcePopulation", "sourceFamilyRule", "captureSessionRule",
    "trainingContaminationRisk", "evidenceStatus", "fixtures", "manifestHash",
  ], location)) return;
  exactValue(issues, manifest.schemaVersion, "fixture-manifest.v0", `${location}.schemaVersion`, "SCHEMA_VERSION_INVALID");
  nonEmptyString(issues, manifest.fixtureManifestId, `${location}.fixtureManifestId`);
  validVersion(issues, manifest.manifestVersion, `${location}.manifestVersion`);
  validTimestamp(issues, manifest.createdAt, `${location}.createdAt`);
  exactValue(issues, manifest.suiteId, "MATTE-GT", `${location}.suiteId`);
  if (!PARTITIONS.has(manifest.partition)) {
    issue(issues, "PARTITION_INVALID", `${location}.partition`, "is not a registered partition");
  }
  if (exactKeys(issues, manifest.generator, ["name", "version", "sourceRevision", "scriptPath", "seed", "externalInputs"], `${location}.generator`)) {
    nonEmptyString(issues, manifest.generator.name, `${location}.generator.name`);
    validVersion(issues, manifest.generator.version, `${location}.generator.version`);
    nonEmptyString(issues, manifest.generator.sourceRevision, `${location}.generator.sourceRevision`);
    exactValue(issues, manifest.generator.scriptPath, "scripts/research-generate-fixtures.mjs", `${location}.generator.scriptPath`);
    nonEmptyString(issues, manifest.generator.seed, `${location}.generator.seed`);
    if (!Array.isArray(manifest.generator.externalInputs) || manifest.generator.externalInputs.length !== 0) {
      issue(issues, "EXTERNAL_INPUT_FORBIDDEN", `${location}.generator.externalInputs`, "must be an empty array");
    }
  }
  for (const field of ["sourcePopulation", "sourceFamilyRule", "captureSessionRule", "trainingContaminationRisk"]) {
    nonEmptyString(issues, manifest[field], `${location}.${field}`);
  }
  validateEvidenceStatus(issues, manifest.evidenceStatus, `${location}.evidenceStatus`);
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
    issue(issues, "FIXTURES_EMPTY", `${location}.fixtures`, "must contain at least one fixture");
  }
  if (typeof manifest.manifestHash !== "string" || !/^[a-f0-9]{64}$/.test(manifest.manifestHash)) {
    issue(issues, "MANIFEST_HASH_INVALID", `${location}.manifestHash`, "must be a lowercase SHA-256 hex digest");
  } else if (hashRecordWithout(manifest, "manifestHash") !== manifest.manifestHash) {
    issue(issues, "MANIFEST_HASH_MISMATCH", `${location}.manifestHash`, "does not match canonical manifest content");
  }
}

function validateFixtureShape(issues, fixture, manifest, location) {
  if (!exactKeys(issues, fixture, [
    "id", "label", "category", "edgeType", "expectedUse", "sourceFamilyId",
    "captureSessionId", "rightsRecordId", "visibility", "width", "height", "assets",
  ], location)) return;
  for (const field of ["id", "label", "category", "expectedUse", "sourceFamilyId", "captureSessionId", "rightsRecordId"]) {
    nonEmptyString(issues, fixture[field], `${location}.${field}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixture.id ?? "")) {
    issue(issues, "FIXTURE_ID_INVALID", `${location}.id`, "must be a kebab-case identifier");
  }
  if (!["hard", "hole", "soft"].includes(fixture.edgeType)) {
    issue(issues, "EDGE_TYPE_INVALID", `${location}.edgeType`, "must be hard, hole, or soft");
  }
  exactValue(issues, fixture.visibility, "public-synthetic", `${location}.visibility`, "VISIBILITY_INVALID");
  for (const field of ["width", "height"]) {
    if (!Number.isInteger(fixture[field]) || fixture[field] <= 0) {
      issue(issues, "DIMENSION_INVALID", `${location}.${field}`, "must be a positive integer");
    }
  }
  if (exactKeys(issues, fixture.assets, ASSET_ROLES, `${location}.assets`)) {
    for (const role of ASSET_ROLES) {
      validateAssetRecord(issues, fixture.assets[role], role, fixture, manifest, `${location}.assets.${role}`);
    }
  }
}

function validateCatalogShape(issues, catalog, location) {
  if (!isRecord(catalog)) {
    exactKeys(issues, catalog, [], location);
    return;
  }
  exactKeys(issues, catalog, [
    "schemaVersion", "catalogId", "catalogVersion", "generatedAt", "evidenceStatus",
    "visibilityPolicy", "assetAllowlist", "fixtures",
  ], location);
  exactValue(issues, catalog.schemaVersion, "review-catalog.v0", `${location}.schemaVersion`, "SCHEMA_VERSION_INVALID");
  nonEmptyString(issues, catalog.catalogId, `${location}.catalogId`);
  validVersion(issues, catalog.catalogVersion, `${location}.catalogVersion`);
  validTimestamp(issues, catalog.generatedAt, `${location}.generatedAt`);
  validateEvidenceStatus(issues, catalog.evidenceStatus, `${location}.evidenceStatus`);
  if (exactKeys(issues, catalog.visibilityPolicy, ["allowed"], `${location}.visibilityPolicy`)) {
    if (!Array.isArray(catalog.visibilityPolicy.allowed)
      || catalog.visibilityPolicy.allowed.length !== 1
      || catalog.visibilityPolicy.allowed[0] !== "public-synthetic") {
      issue(issues, "VISIBILITY_POLICY_INVALID", `${location}.visibilityPolicy.allowed`, "must allow only public-synthetic");
    }
  }
  if (!Array.isArray(catalog.assetAllowlist)) {
    issue(issues, "ALLOWLIST_INVALID", `${location}.assetAllowlist`, "must be an array");
  }
  if (!Array.isArray(catalog.fixtures)) {
    issue(issues, "CATALOG_FIXTURES_INVALID", `${location}.fixtures`, "must be an array");
  }
}

function validateCatalogFixtureShape(issues, fixture, location) {
  if (!exactKeys(issues, fixture, [
    "id", "label", "suite", "partition", "sourceRevision", "candidateAlias", "methodLabel",
    "methodDetails", "rightsRecordId", "visibility", "evidenceStatus", "assets", "facts",
  ], location)) return;
  for (const field of ["id", "label", "sourceRevision", "candidateAlias", "methodLabel", "methodDetails", "rightsRecordId"]) {
    nonEmptyString(issues, fixture[field], `${location}.${field}`);
  }
  exactValue(issues, fixture.suite, "MATTE-GT", `${location}.suite`);
  if (!PARTITIONS.has(fixture.partition)) issue(issues, "PARTITION_INVALID", `${location}.partition`, "is not a registered partition");
  exactValue(issues, fixture.visibility, "public-synthetic", `${location}.visibility`, "CATALOG_NON_PUBLIC_ASSET");
  validateEvidenceStatus(issues, fixture.evidenceStatus, `${location}.evidenceStatus`);
  if (exactKeys(issues, fixture.assets, ASSET_ROLES, `${location}.assets`)) {
    for (const role of ASSET_ROLES) {
      if (!safeAssetUrl(fixture.assets[role])) {
        issue(issues, "ASSET_URL_UNSAFE", `${location}.assets.${role}`, "must be a safe /research-assets PNG URL");
      }
    }
  }
  if (exactKeys(issues, fixture.facts, ["category", "edgeType", "expectedUse"], `${location}.facts`)) {
    nonEmptyString(issues, fixture.facts.category, `${location}.facts.category`);
    if (!["hard", "hole", "soft"].includes(fixture.facts.edgeType)) {
      issue(issues, "EDGE_TYPE_INVALID", `${location}.facts.edgeType`, "must be hard, hole, or soft");
    }
    nonEmptyString(issues, fixture.facts.expectedUse, `${location}.facts.expectedUse`);
  }
}

async function validateSchemaFiles(researchRoot, issues) {
  const expected = new Map([
    ["schemas/fixture-manifest.v0.schema.json", "fixture-manifest.v0.schema.json"],
    ["schemas/rights-record.v0.schema.json", "rights-record.v0.schema.json"],
    ["schemas/review-catalog.v0.schema.json", "review-catalog.v0.schema.json"],
  ]);
  for (const [relative, schemaId] of expected) {
    const schema = await readJson(path.join(researchRoot, relative), issues, relative);
    if (!schema) continue;
    exactValue(
      issues,
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
      `${relative}.$schema`,
      "SCHEMA_DIALECT_INVALID",
    );
    exactValue(issues, schema.$id, schemaId, `${relative}.$id`, "SCHEMA_ID_INVALID");
    exactValue(issues, schema.additionalProperties, false, `${relative}.additionalProperties`, "SCHEMA_NOT_STRICT");
    validateMachineSchemaNode(issues, schema, relative, schema.$defs);
  }
}

function validateMachineSchemaNode(issues, node, location, rootDefinitions) {
  if (!isRecord(node)) return;

  if (node.type === "object") {
    if (node.additionalProperties !== false) {
      issue(issues, "SCHEMA_OBJECT_NOT_STRICT", location, "object schemas must set additionalProperties to false");
    }
    if (!isRecord(node.properties)) {
      issue(issues, "SCHEMA_OBJECT_PROPERTIES_MISSING", location, "object schemas must declare properties");
    } else if (!Array.isArray(node.required)) {
      issue(issues, "SCHEMA_OBJECT_REQUIRED_MISSING", location, "object schemas must declare required fields");
    } else {
      const properties = Object.keys(node.properties).sort();
      const required = [...new Set(node.required)].sort();
      if (JSON.stringify(properties) !== JSON.stringify(required)) {
        issue(issues, "SCHEMA_OBJECT_REQUIRED_INCOMPLETE", location, "all declared object properties must be required");
      }
    }
  }

  if (node.type === "array" && !Object.hasOwn(node, "items")) {
    issue(issues, "SCHEMA_ARRAY_ITEMS_MISSING", location, "array schemas must declare items");
  }

  if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/")) {
    const definitionName = node.$ref.slice("#/$defs/".length);
    if (!isRecord(rootDefinitions) || !Object.hasOwn(rootDefinitions, definitionName)) {
      issue(issues, "SCHEMA_REF_UNRESOLVED", `${location}.$ref`, `cannot resolve ${node.$ref}`);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) {
      validateMachineSchemaNode(issues, value, `${location}.${key}`, rootDefinitions);
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (isRecord(entry)) {
          validateMachineSchemaNode(issues, entry, `${location}.${key}[${index}]`, rootDefinitions);
        }
      });
    }
  }
}

export async function validateResearchTree(
  researchRoot = DEFAULT_RESEARCH_ROOT,
  { throwOnError = true } = {},
) {
  const issues = [];
  await validateSchemaFiles(researchRoot, issues);

  const rightsFiles = (await listFiles(path.join(researchRoot, "rights"), issues))
    .filter((name) => name.endsWith(".json"));
  const rightsById = new Map();
  for (const relative of rightsFiles) {
    const location = `rights/${relative}`;
    const record = await readJson(path.join(researchRoot, location), issues, location);
    if (!record) continue;
    validateRightsRecord(issues, record, location);
    if (rightsById.has(record.rightsRecordId)) {
      issue(issues, "RIGHTS_ID_DUPLICATE", location, `duplicates ${record.rightsRecordId}`);
    } else {
      rightsById.set(record.rightsRecordId, record);
    }
  }

  const manifestFiles = (await listFiles(path.join(researchRoot, "manifests"), issues))
    .filter((name) => /^fixture-manifest\..+\.json$/.test(path.basename(name)));
  const manifests = [];
  const fixturesById = new Map();
  const registeredPaths = new Set();
  const registeredUrls = new Map();
  const familyPartitions = new Map();
  const sessionPartitions = new Map();

  for (const relative of manifestFiles) {
    const location = `manifests/${relative}`;
    const manifest = await readJson(path.join(researchRoot, location), issues, location);
    if (!manifest) continue;
    validateFixtureManifestShape(issues, manifest, location);
    manifests.push(manifest);
    if (!Array.isArray(manifest.fixtures)) continue;

    for (const [index, fixture] of manifest.fixtures.entries()) {
      const fixtureLocation = `${location}.fixtures[${index}]`;
      validateFixtureShape(issues, fixture, manifest, fixtureLocation);
      if (!isRecord(fixture)) continue;
      if (fixturesById.has(fixture.id)) {
        issue(issues, "FIXTURE_ID_DUPLICATE", `${fixtureLocation}.id`, `duplicates ${fixture.id}`);
      } else {
        fixturesById.set(fixture.id, { fixture, manifest });
      }
      for (const [value, map, code, field] of [
        [fixture.sourceFamilyId, familyPartitions, "SOURCE_FAMILY_PARTITION_LEAK", "sourceFamilyId"],
        [fixture.captureSessionId, sessionPartitions, "CAPTURE_SESSION_PARTITION_LEAK", "captureSessionId"],
      ]) {
        if (typeof value !== "string" || typeof manifest.partition !== "string") continue;
        const seen = map.get(value) ?? new Set();
        seen.add(manifest.partition);
        map.set(value, seen);
        if (seen.size > 1) {
          issue(issues, code, `${fixtureLocation}.${field}`, `${value} appears in partitions: ${[...seen].sort().join(", ")}`);
        }
      }
      const rights = rightsById.get(fixture.rightsRecordId);
      if (!rights) {
        issue(issues, "RIGHTS_RECORD_MISSING", `${fixtureLocation}.rightsRecordId`, `cannot resolve ${fixture.rightsRecordId}`);
      } else if (fixture.visibility === "public-synthetic"
        && (rights.assetClass !== "public-synthetic" || rights.permissions?.publicDisplayAllowed !== true)) {
        issue(issues, "RIGHTS_PUBLIC_DISPLAY_DENIED", `${fixtureLocation}.rightsRecordId`, "does not grant public synthetic display");
      }

      if (!isRecord(fixture.assets)) continue;
      for (const role of ASSET_ROLES) {
        const asset = fixture.assets[role];
        if (!isRecord(asset) || !safeResearchRelativePath(asset.path)) continue;
        if (registeredPaths.has(asset.path)) {
          issue(issues, "ASSET_PATH_DUPLICATE", `${fixtureLocation}.assets.${role}.path`, `duplicates ${asset.path}`);
        }
        registeredPaths.add(asset.path);
        if (registeredUrls.has(asset.url)) {
          issue(issues, "ASSET_URL_DUPLICATE", `${fixtureLocation}.assets.${role}.url`, `duplicates ${asset.url}`);
        }
        registeredUrls.set(asset.url, { asset, fixture, manifest });

        const absolute = path.resolve(researchRoot, asset.path);
        const relativeResolved = path.relative(path.resolve(researchRoot), absolute);
        if (relativeResolved.startsWith("..") || path.isAbsolute(relativeResolved)) {
          issue(issues, "ASSET_PATH_ESCAPE", `${fixtureLocation}.assets.${role}.path`, "resolves outside research root");
          continue;
        }
        try {
          const stat = await lstat(absolute);
          if (!stat.isFile() || stat.isSymbolicLink()) {
            issue(issues, "ASSET_NOT_REGULAR_FILE", asset.path, "must be a regular non-symlink file");
            continue;
          }
          const bytes = await readFile(absolute);
          if (sha256(bytes) !== asset.sha256) {
            issue(issues, "ASSET_HASH_MISMATCH", asset.path, "SHA-256 differs from FixtureManifest");
          }
          const dimensions = readPngDimensions(bytes);
          if (!dimensions) {
            issue(issues, "PNG_INVALID", asset.path, "missing PNG signature or IHDR");
          } else if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
            issue(issues, "PNG_DIMENSION_MISMATCH", asset.path, `actual ${dimensions.width}x${dimensions.height}`);
          }
        } catch (error) {
          issue(issues, "ASSET_READ_FAILED", asset.path, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  if (manifests.length === 0) {
    issue(issues, "MANIFEST_MISSING", "manifests", "no FixtureManifest was found");
  }
  if (rightsById.size === 0) {
    issue(issues, "RIGHTS_MISSING", "rights", "no rights record was found");
  }

  const assetFiles = (await listFiles(path.join(researchRoot, "fixtures"), issues))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .map((name) => `fixtures/${name}`);
  for (const relative of assetFiles) {
    if (!registeredPaths.has(relative)) {
      issue(issues, "UNREGISTERED_ASSET", relative, "PNG exists without a FixtureManifest entry");
    }
  }

  const catalogLocation = "manifests/review-catalog.v0.json";
  const catalog = await readJson(path.join(researchRoot, catalogLocation), issues, catalogLocation);
  if (catalog) {
    validateCatalogShape(issues, catalog, catalogLocation);
    const catalogUrls = [];
    const aliases = new Set();
    if (Array.isArray(catalog.fixtures)) {
      for (const [index, catalogFixture] of catalog.fixtures.entries()) {
        const location = `${catalogLocation}.fixtures[${index}]`;
        validateCatalogFixtureShape(issues, catalogFixture, location);
        if (!isRecord(catalogFixture)) continue;
        if (aliases.has(catalogFixture.candidateAlias)) {
          issue(issues, "CANDIDATE_ALIAS_DUPLICATE", `${location}.candidateAlias`, "must be unique within catalog");
        }
        aliases.add(catalogFixture.candidateAlias);
        const binding = fixturesById.get(catalogFixture.id);
        if (!binding) {
          issue(issues, "CATALOG_FIXTURE_UNREGISTERED", `${location}.id`, "does not resolve to a FixtureManifest fixture");
        } else {
          const { fixture, manifest } = binding;
          const comparisons = [
            ["label", catalogFixture.label, fixture.label],
            ["suite", catalogFixture.suite, manifest.suiteId],
            ["partition", catalogFixture.partition, manifest.partition],
            ["sourceRevision", catalogFixture.sourceRevision, manifest.generator?.sourceRevision],
            ["rightsRecordId", catalogFixture.rightsRecordId, fixture.rightsRecordId],
            ["visibility", catalogFixture.visibility, fixture.visibility],
            ["facts.category", catalogFixture.facts?.category, fixture.category],
            ["facts.edgeType", catalogFixture.facts?.edgeType, fixture.edgeType],
            ["facts.expectedUse", catalogFixture.facts?.expectedUse, fixture.expectedUse],
          ];
          for (const [field, actual, expected] of comparisons) {
            exactValue(issues, actual, expected, `${location}.${field}`, "CATALOG_BINDING_MISMATCH");
          }
        }
        if (isRecord(catalogFixture.assets)) {
          for (const role of ASSET_ROLES) {
            const url = catalogFixture.assets[role];
            catalogUrls.push(url);
            const registered = registeredUrls.get(url);
            if (!registered) {
              issue(issues, "CATALOG_ASSET_UNREGISTERED", `${location}.assets.${role}`, "URL is not registered by a FixtureManifest");
            } else if (registered.fixture.visibility !== "public-synthetic") {
              issue(issues, "CATALOG_NON_PUBLIC_ASSET", `${location}.assets.${role}`, "catalog may expose only public-synthetic assets");
            }
          }
        }
      }
    }

    if (Array.isArray(catalog.assetAllowlist)) {
      const allowlist = catalog.assetAllowlist;
      const uniqueSorted = [...new Set(allowlist)].sort();
      if (JSON.stringify(allowlist) !== JSON.stringify(uniqueSorted)) {
        issue(issues, "ALLOWLIST_NOT_UNIQUE_SORTED", `${catalogLocation}.assetAllowlist`, "must be unique and lexicographically sorted");
      }
      for (const [index, url] of allowlist.entries()) {
        if (!safeAssetUrl(url)) {
          issue(issues, "ASSET_URL_UNSAFE", `${catalogLocation}.assetAllowlist[${index}]`, "must be a safe /research-assets PNG URL");
        }
        const registered = registeredUrls.get(url);
        if (!registered || registered.fixture.visibility !== "public-synthetic") {
          issue(issues, "ALLOWLIST_NON_PUBLIC_OR_UNKNOWN", `${catalogLocation}.assetAllowlist[${index}]`, "must resolve to a public-synthetic manifest asset");
        }
      }
      const expected = [...new Set(catalogUrls)].sort();
      if (JSON.stringify(allowlist) !== JSON.stringify(expected)) {
        issue(issues, "ALLOWLIST_CATALOG_MISMATCH", `${catalogLocation}.assetAllowlist`, "must exactly equal URLs referenced by catalog fixtures");
      }
    }
  }

  const result = {
    ok: issues.length === 0,
    issues,
    summary: {
      rightsRecords: rightsById.size,
      fixtureManifests: manifests.length,
      fixtures: fixturesById.size,
      assets: registeredPaths.size,
      catalogFixtures: Array.isArray(catalog?.fixtures) ? catalog.fixtures.length : 0,
    },
  };
  if (!result.ok && throwOnError) throw new ResearchValidationError(issues);
  return result;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
}

if (isMainModule()) {
  const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_RESEARCH_ROOT;
  const result = await validateResearchTree(requestedRoot, { throwOnError: false });
  if (!result.ok) {
    for (const entry of result.issues) {
      console.error(`[${entry.code}] ${entry.location}: ${entry.message}`);
    }
    console.error(`Validation failed with ${result.issues.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Research fixtures valid: ${result.summary.fixtures} fixtures, ${result.summary.assets} assets, ${result.summary.rightsRecords} rights record(s).`);
    console.log("Evidence boundary: C1=0 / method-rehearsal.");
  }
}
