import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SLICE03_ROOT, generateSlice03 } from "./research-generate-slice03.mjs";
import {
  observeNormalizedImageSlice03,
  Slice03ObserverError,
  SLICE03_TECHNICAL_OBSERVER_CONTRACT,
} from "./research-reference-adapters-slice03.mjs";
import {
  averageHashRgba,
  decodeReferencePng,
  isValidUtcDateTime,
  sha256 as slice02Sha256,
} from "./research-reference-adapters.mjs";
import { validateSealCeremonySchemas } from "./research-seal-ceremony-slice03.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_OBSERVER_ADAPTER_PATH = path.resolve(path.dirname(SCRIPT_PATH), "research-reference-adapters-slice03.mjs");
export const CANONICAL_SLICE03_GENERATED_TREE_SHA256 = "c44e9cd7f8ab54650761fd3f8526be0ab84e9081d5ed0c39bbdc8a0a7b6a4d1c";
export const CANONICAL_SLICE03_OBSERVER_CONTRACT_HASH = "c9af17a228099f4da4e1e840b9ecaf876815bf906de18ae53cda69047259191a";
export const CANONICAL_SLICE03_SCHEMA_TREE_SHA256 = "393fc66dbe6379f84f001617d4bbedd50139422f1443e446850672ff661c3226";
const EXPECTED_SCHEMA_FILES = Object.freeze([
  "seal-ceremony-bundle-manifest.v0.schema.json",
  "seal-ceremony-custody-event.v0.schema.json",
  "seal-ceremony-plan.v0.schema.json",
  "seal-ceremony-result-summary.v0.schema.json",
  "seal-ceremony-run-receipt.v0.schema.json",
  "seal-ceremony-run-request.v0.schema.json",
  "slice03-fixture-manifest.v0.schema.json",
  "slice03-format-fixture.v0.schema.json",
  "slice03-format-matrix.v0.schema.json",
  "slice03-format-profile.v0.schema.json",
  "slice03-rights-record.v0.schema.json",
  "technical-observer-contract.slice03.schema.json",
  "technical-observer.slice03.schema.json",
]);
const EXPECTED_ROW_KEYS = Object.freeze([
  "input:png", "input:jpeg", "input:webp", "input:heic", "input:heif", "input:avif",
  "input:gif", "input:apng", "input:tiff", "input:svg", "input:pdf", "input:raw",
  "output:png", "output:jpeg", "output:webp",
]);
const EXPECTED_MANIFESTS = Object.freeze(new Map([
  ["fixture-manifest.normalize-deliver.dev-calibration.slice-03.v0.json", { partition: "dev/calibration", fixtures: 3 }],
  ["fixture-manifest.normalize-deliver.defect-calibration.slice-03.v0.json", { partition: "defect/calibration", fixtures: 22 }],
]));
const EXPECTED_FIXTURE_CODES = Object.freeze(new Set([
  "S03_REFERENCE_PNG_ACCEPTED",
  "S03_INPUT_JPEG_PROBE_ONLY",
  "S03_INPUT_WEBP_PROBE_ONLY",
  "S03_PNG_MIME_EXTENSION_MISMATCH",
  "S03_PNG_BAD_SIGNATURE",
  "S03_PNG_CRC_MISMATCH",
  "S03_PNG_TRUNCATED_CHUNK",
  "S03_PNG_TRAILING_BYTES",
  "S03_PNG_SRGB_MISSING",
  "S03_PNG_SRGB_CONFLICT",
  "S03_PNG_BYTE_LIMIT_EXCEEDED",
  "S03_PNG_DIMENSION_LIMIT_EXCEEDED",
  "S03_PNG_RGBA8_REQUIRED",
  "S03_PNG_FILTER0_REQUIRED",
  "S03_PNG_INTERLACE_FORBIDDEN",
  "S03_PNG_UNKNOWN_CRITICAL_CHUNK",
  "S03_INPUT_HEIC_DEFERRED",
  "S03_INPUT_HEIF_DEFERRED",
  "S03_INPUT_AVIF_DEFERRED",
  "S03_INPUT_GIF_DEFERRED",
  "S03_INPUT_APNG_DEFERRED",
  "S03_INPUT_TIFF_DEFERRED",
  "S03_INPUT_SVG_DEFERRED",
  "S03_INPUT_PDF_DEFERRED",
  "S03_INPUT_RAW_DEFERRED",
]));
const EXPECTED_FIXTURE_POLICIES = Object.freeze(new Map([
  ["S03_REFERENCE_PNG_ACCEPTED", ["format-png-canonical-dev-calibration-s03-001", "png", "canonical-reference", "accept-reference-only", null]],
  ["S03_INPUT_JPEG_PROBE_ONLY", ["format-jpeg-probe-dev-calibration-s03-001", "jpeg", "header-probe-only", "probe-only-no-decode", null]],
  ["S03_INPUT_WEBP_PROBE_ONLY", ["format-webp-probe-dev-calibration-s03-001", "webp", "header-probe-only", "probe-only-no-decode", null]],
  ["S03_PNG_MIME_EXTENSION_MISMATCH", ["format-png-mime-extension-conflict-defect-calibration-s03-001", "png", "injected-format-defect", "reject", null]],
  ["S03_PNG_BAD_SIGNATURE", ["format-png-bad-signature-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_SIGNATURE_MISMATCH"]],
  ["S03_PNG_CRC_MISMATCH", ["format-png-crc-error-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_CRC_MISMATCH"]],
  ["S03_PNG_TRUNCATED_CHUNK", ["format-png-truncated-chunk-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_PNG_TRAILING_BYTES", ["format-png-trailing-bytes-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_PNG_SRGB_MISSING", ["format-png-missing-srgb-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_PNG_SRGB_CONFLICT", ["format-png-conflicting-srgb-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_COLOR_PROFILE_MISMATCH"]],
  ["S03_PNG_BYTE_LIMIT_EXCEEDED", ["format-png-byte-limit-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_BYTES_LIMIT_EXCEEDED"]],
  ["S03_PNG_DIMENSION_LIMIT_EXCEEDED", ["format-png-dimension-limit-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_DIMENSION_LIMIT_EXCEEDED"]],
  ["S03_PNG_RGBA8_REQUIRED", ["format-png-non-rgba8-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_PNG_FILTER0_REQUIRED", ["format-png-non-filter0-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_FILTER_MISMATCH"]],
  ["S03_PNG_INTERLACE_FORBIDDEN", ["format-png-interlace-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_PNG_UNKNOWN_CRITICAL_CHUNK", ["format-png-unknown-critical-defect-calibration-s03-001", "png", "injected-format-defect", "reject", "OBS_PNG_PROFILE_MISMATCH"]],
  ["S03_INPUT_HEIC_DEFERRED", ["format-heic-deferred-defect-calibration-s03-001", "heic", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_HEIF_DEFERRED", ["format-heif-deferred-defect-calibration-s03-001", "heif", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_AVIF_DEFERRED", ["format-avif-deferred-defect-calibration-s03-001", "avif", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_GIF_DEFERRED", ["format-gif-deferred-defect-calibration-s03-001", "gif", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_APNG_DEFERRED", ["format-apng-deferred-defect-calibration-s03-001", "apng", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_TIFF_DEFERRED", ["format-tiff-deferred-defect-calibration-s03-001", "tiff", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_SVG_DEFERRED", ["format-svg-deferred-defect-calibration-s03-001", "svg", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_PDF_DEFERRED", ["format-pdf-deferred-defect-calibration-s03-001", "pdf", "deferred-format-rejection", "reject", null]],
  ["S03_INPUT_RAW_DEFERRED", ["format-raw-deferred-defect-calibration-s03-001", "raw", "deferred-format-rejection", "reject", null]],
]));
const ALLOWED_SLICE_ROOT_ENTRIES = Object.freeze(new Set([
  "README.md", "contracts", "fixtures", "format-matrix.json", "manifests", "profiles", "rights", "schemas",
]));
const SUPPORTED_SCHEMA_KEYWORDS = Object.freeze(new Set([
  "$schema", "$id", "$ref", "$defs", "title", "type", "const", "enum", "format", "pattern",
  "minLength", "minimum", "maximum", "minItems", "maxItems", "uniqueItems", "items", "oneOf",
  "properties", "required", "additionalProperties",
]));

export class Slice03ValidationError extends Error {
  constructor(issues) {
    super(`Slice 03 validation failed with ${issues.length} issue(s)`);
    this.name = "Slice03ValidationError";
    this.issues = issues;
  }
}

function add(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashRecordWithout(record, field) {
  const clone = structuredClone(record);
  delete clone[field];
  return hash(Buffer.from(stableStringify(clone), "utf8"));
}

function deepEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
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

function unsupportedSchemaKeywords(schema, location = "$", errors = []) {
  if (typeof schema === "boolean") {
    errors.push({ location, message: "boolean schemas are outside the closed Slice 03 evaluator subset" });
    return errors;
  }
  if (!isRecord(schema)) {
    errors.push({ location, message: "schema node must be an object" });
    return errors;
  }
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(keyword)) errors.push({ location: `${location}.${keyword}`, message: `unsupported schema keyword: ${keyword}` });
  }
  if (isRecord(schema.properties)) for (const [name, child] of Object.entries(schema.properties)) {
    unsupportedSchemaKeywords(child, `${location}.properties.${name}`, errors);
  }
  if (isRecord(schema.$defs)) for (const [name, child] of Object.entries(schema.$defs)) {
    unsupportedSchemaKeywords(child, `${location}.$defs.${name}`, errors);
  }
  if (Object.hasOwn(schema, "items")) unsupportedSchemaKeywords(schema.items, `${location}.items`, errors);
  if (Array.isArray(schema.oneOf)) schema.oneOf.forEach((child, index) => {
    unsupportedSchemaKeywords(child, `${location}.oneOf[${index}]`, errors);
  });
  return errors;
}

export function validateSlice03SchemaInstance(instance, schema, location = "$") {
  const errors = unsupportedSchemaKeywords(schema, location);
  if (errors.length > 0) return errors;
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
    if (Array.isArray(node.oneOf)) {
      const branches = node.oneOf.filter((branch) => validateSlice03SchemaInstance(
        value,
        { ...branch, $defs: root.$defs },
        where,
      ).length === 0);
      if (branches.length !== 1) errors.push({ location: where, message: `must match exactly one oneOf branch; matched ${branches.length}` });
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
      if (node.format === "date-time" && !isValidUtcDateTime(value)) errors.push({ location: where, message: "must be a valid UTC date-time" });
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
      if (node.additionalProperties === false) for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) errors.push({ location: `${where}.${key}`, message: "is not allowed" });
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
    else if (!deepEqual(Object.keys(node.properties).sort(), [...new Set(node.required)].sort())) {
      add(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "every object property must be required exactly once");
    }
  }
  if (node.type === "array" && !node.items) add(issues, "SCHEMA_ARRAY_OPEN", location, "arrays must declare items");
  if (typeof node.$ref === "string" && (!node.$ref.startsWith("#/$defs/") || !Object.hasOwn(root.$defs ?? {}, node.$ref.slice(8)))) {
    add(issues, "SCHEMA_REF_INVALID", location, String(node.$ref));
  }
  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) inspectClosedSchema(value, root, issues, `${location}.${key}`);
    else if (Array.isArray(value)) value.forEach((entry, index) => {
      if (isRecord(entry)) inspectClosedSchema(entry, root, issues, `${location}.${key}[${index}]`);
    });
  }
}

async function readJson(target, issues, location) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    add(issues, "JSON_READ_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function listTree(root, issues, base = "") {
  const output = [];
  let entries;
  try {
    entries = await readdir(path.join(root, base), { withFileTypes: true });
  } catch (error) {
    add(issues, "DIRECTORY_READ_FAILED", base || ".", error instanceof Error ? error.message : String(error));
    return output;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) add(issues, "SYMLINK_FORBIDDEN", relative, "Slice 03 records and fixtures may not be symlinks or junctions");
    else if (entry.isDirectory()) output.push(...await listTree(root, issues, relative));
    else if (entry.isFile()) output.push(relative);
    else add(issues, "FILESYSTEM_ENTRY_FORBIDDEN", relative, "only regular files and directories are allowed");
  }
  return output;
}

function generatedSubsetPaths(files) {
  return files.filter((relative) => relative !== "README.md" && !relative.startsWith("schemas/")).sort();
}

async function generatedTreeDigest(root, files) {
  const digest = createHash("sha256");
  for (const relative of files) {
    digest.update(relative);
    digest.update("\0");
    digest.update(await readFile(path.join(root, relative)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

async function compareCanonicalGeneratedSubset(sliceRoot, allFiles, issues) {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-canonical-"));
  const canonicalRoot = path.join(wrapper, "slice-03");
  let currentTreeHash = "unavailable";
  let canonicalTreeHash = "unavailable";
  try {
    await generateSlice03({ sliceRoot: canonicalRoot });
    const canonicalListIssues = [];
    const canonicalFiles = generatedSubsetPaths(await listTree(canonicalRoot, canonicalListIssues));
    for (const issue of canonicalListIssues) add(issues, "GENERATOR_CANONICAL_TREE_READ_FAILED", issue.location, issue.message);
    const currentFiles = generatedSubsetPaths(allFiles);
    if (!deepEqual(currentFiles, canonicalFiles)) {
      add(issues, "GENERATED_FILE_SET_MISMATCH", "generated-subset", `checked-in ${currentFiles.length} files; canonical generator ${canonicalFiles.length} files`);
    }
    currentTreeHash = await generatedTreeDigest(sliceRoot, currentFiles);
    canonicalTreeHash = await generatedTreeDigest(canonicalRoot, canonicalFiles);
    if (canonicalTreeHash !== CANONICAL_SLICE03_GENERATED_TREE_SHA256) {
      add(issues, "GENERATOR_CANONICAL_DIGEST_MISMATCH", "scripts/research-generate-slice03.mjs", `expected ${CANONICAL_SLICE03_GENERATED_TREE_SHA256}, got ${canonicalTreeHash}`);
    }
    if (currentTreeHash !== CANONICAL_SLICE03_GENERATED_TREE_SHA256) {
      add(issues, "CHECKED_IN_GENERATED_TREE_MISMATCH", "generated-subset", `expected ${CANONICAL_SLICE03_GENERATED_TREE_SHA256}, got ${currentTreeHash}`);
    }
    for (const relative of canonicalFiles) {
      if (!currentFiles.includes(relative)) continue;
      const [currentBytes, canonicalBytes] = await Promise.all([
        readFile(path.join(sliceRoot, relative)),
        readFile(path.join(canonicalRoot, relative)),
      ]);
      if (!currentBytes.equals(canonicalBytes)) add(issues, "GENERATED_FILE_CONTENT_MISMATCH", relative, "must equal the pinned canonical generator output byte-for-byte");
    }
  } catch (error) {
    add(issues, "GENERATOR_CANONICAL_COMPARISON_FAILED", "generated-subset", error instanceof Error ? error.message : String(error));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
  return { currentTreeHash, canonicalTreeHash };
}

function schemaErrors(issues, value, schema, location) {
  for (const error of validateSlice03SchemaInstance(value, schema, location)) add(issues, "SCHEMA_INSTANCE_INVALID", error.location, error.message);
}

function expectedRowState(key) {
  if (key === "input:png" || key === "output:png") return ["reference-calibration-eligible", "reference-executable", "structural-only"];
  if (key === "input:jpeg" || key === "input:webp") return ["research-candidate", "probe-only", "none"];
  if (key === "output:jpeg" || key === "output:webp") return ["deferred-reject", "not-implemented", "none"];
  return ["deferred-reject", "reject-only", "none"];
}

function startsWith(bytes, signature) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function sniffFormat(bytes) {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      if (type === "acTL") return "apng";
      if (offset + length + 12 > bytes.length) break;
      offset += length + 12;
      if (type === "IEND") break;
    }
    return "png";
  }
  if (startsWith(bytes, [0xff, 0xd8])) return "jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") {
    const brand = bytes.toString("ascii", 8, 12);
    if (brand === "heic") return "heic";
    if (brand === "mif1") return "heif";
    if (brand === "avif") return "avif";
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "gif";
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  const prefix = bytes.subarray(0, Math.min(bytes.length, 256)).toString("utf8").trimStart();
  if (prefix.startsWith("<svg") || prefix.startsWith("<?xml") && prefix.includes("<svg")) return "svg";
  if (prefix.startsWith("%PDF-")) return "pdf";
  if (prefix.startsWith("S03RAW\0")) return "raw";
  return "unknown";
}

function validateFixtureBytes(issues, fixture, bytes, adapterHash, location) {
  const expectedPolicy = EXPECTED_FIXTURE_POLICIES.get(fixture.expectedCode);
  if (!expectedPolicy) {
    add(issues, "FIXTURE_POLICY_UNREGISTERED", `${location}.expectedCode`, String(fixture.expectedCode));
    return;
  }
  const [expectedFixtureId, expectedFormatId, expectedCaseKind, expectedDisposition, expectedObserverErrorCode] = expectedPolicy;
  if (!deepEqual(
    [fixture.fixtureId, fixture.formatId, fixture.caseKind, fixture.expectedDisposition],
    [expectedFixtureId, expectedFormatId, expectedCaseKind, expectedDisposition],
  )) {
    add(
      issues,
      "FIXTURE_POLICY_BINDING_MISMATCH",
      location,
      `${fixture.expectedCode} must bind ${expectedFixtureId}/${expectedFormatId}/${expectedCaseKind}/${expectedDisposition}`,
    );
  }
  const detected = sniffFormat(bytes);
  if (fixture.caseKind === "canonical-reference") {
    if (detected !== "png" || fixture.expectedDisposition !== "accept-reference-only" || fixture.expectedCode !== "S03_REFERENCE_PNG_ACCEPTED") {
      add(issues, "CANONICAL_FIXTURE_POLICY_INVALID", location, "canonical PNG must be reference-only accepted");
      return;
    }
    try {
      const decoded = decodeReferencePng(bytes);
      if (!fixture.observedDimensions || decoded.width !== fixture.observedDimensions.width || decoded.height !== fixture.observedDimensions.height) {
        add(issues, "CANONICAL_DIMENSIONS_MISMATCH", `${location}.observedDimensions`, "must equal full decoded dimensions");
      }
      const perceptualHash = averageHashRgba(decoded.width, decoded.height, decoded.rgba);
      if (fixture.perceptualHash !== perceptualHash) add(issues, "CANONICAL_PERCEPTUAL_HASH_MISMATCH", `${location}.perceptualHash`, `expected ${perceptualHash}`);
      const pixelHash = slice02Sha256(Buffer.from(decoded.rgba));
      const artifact = {
        schemaVersion: "normalized-image.v0",
        normalizedImageId: `normalized.${fixture.fixtureId}`,
        parentImageAssetId: `image-asset.${fixture.fixtureId}`,
        capabilityContractRef: "CC-CAP02-NORMALIZE@0.2.0",
        mime: "image/png",
        width: decoded.width,
        height: decoded.height,
        orientation: 1,
        colorProfile: "srgb",
        alphaPresent: decoded.rgba.some((value, index) => index % 4 === 3 && value < 255),
        premultiply: "straight",
        metadataPolicy: "strip-all-except-color-contract",
        pixelSha256: pixelHash,
        createdAt: "2026-08-14T19:47:13.000Z",
      };
      const observation = observeNormalizedImageSlice03({
        normalizedArtifact: artifact,
        normalizedBytes: bytes,
        parentArtifactIdentity: {
          normalizedImageId: artifact.normalizedImageId,
          parentImageAssetId: artifact.parentImageAssetId,
          normalizedFileSha256: hash(bytes),
          decodedPixelSha256: pixelHash,
        },
        implementationRef: `sha256:${adapterHash}`,
        observedAt: "2026-08-14T19:47:13.000Z",
      });
      if (observation.implementationRef !== `sha256:${adapterHash}`) add(issues, "OBSERVER_IMPLEMENTATION_REF_MISMATCH", location, "observer did not preserve the frozen implementation ref");
      return observation;
    } catch (error) {
      add(issues, "CANONICAL_OBSERVER_REJECTED", location, error instanceof Error ? error.message : String(error));
    }
    return;
  }
  if (fixture.caseKind === "header-probe-only") {
    if (detected !== fixture.formatId || fixture.expectedDisposition !== "probe-only-no-decode") add(issues, "PROBE_FIXTURE_INVALID", location, `detected ${detected}`);
    return;
  }
  if (fixture.caseKind === "deferred-format-rejection") {
    if (detected !== fixture.formatId || fixture.expectedDisposition !== "reject") add(issues, "DEFERRED_REJECTION_FIXTURE_INVALID", location, `detected ${detected}`);
    return;
  }
  if (fixture.caseKind !== "injected-format-defect" || fixture.expectedDisposition !== "reject") {
    add(issues, "DEFECT_FIXTURE_POLICY_INVALID", location, String(fixture.caseKind));
    return;
  }
  if (fixture.expectedCode === "S03_PNG_MIME_EXTENSION_MISMATCH") {
    if (detected !== "png" || fixture.assets[0]?.declaredMime !== "image/jpeg" || !/\.jpe?g$/i.test(fixture.assets[0]?.path ?? "")) {
      add(issues, "MIME_EXTENSION_DEFECT_INVALID", location, "must contain PNG bytes declared and named as JPEG");
    }
    return;
  }
  if (fixture.formatId !== "png" || fixture.expectedCode === "S03_REFERENCE_PNG_ACCEPTED") {
    add(issues, "PNG_DEFECT_CLASS_INVALID", location, String(fixture.formatId));
    return;
  }
  const dummyArtifact = {
    schemaVersion: "normalized-image.v0",
    normalizedImageId: `normalized.${fixture.fixtureId}`,
    parentImageAssetId: `image-asset.${fixture.fixtureId}`,
    capabilityContractRef: "CC-CAP02-NORMALIZE@0.2.0",
    mime: "image/png",
    width: 64,
    height: 48,
    orientation: 1,
    colorProfile: "srgb",
    alphaPresent: true,
    premultiply: "straight",
    metadataPolicy: "strip-all-except-color-contract",
    pixelSha256: "0".repeat(64),
    createdAt: "2026-08-14T19:47:13.000Z",
  };
  try {
    observeNormalizedImageSlice03({
      normalizedArtifact: dummyArtifact,
      normalizedBytes: bytes,
      parentArtifactIdentity: {
        normalizedImageId: dummyArtifact.normalizedImageId,
        parentImageAssetId: dummyArtifact.parentImageAssetId,
        normalizedFileSha256: hash(bytes),
        decodedPixelSha256: dummyArtifact.pixelSha256,
      },
      implementationRef: `sha256:${adapterHash}`,
      observedAt: "2026-08-14T19:47:13.000Z",
    });
    add(issues, "PNG_DEFECT_NOT_REJECTED", location, fixture.expectedCode);
  } catch (error) {
    if (!(error instanceof Slice03ObserverError)) {
      add(issues, "PNG_DEFECT_REJECTION_UNTYPED", location, error instanceof Error ? error.message : String(error));
    } else if (error.code !== expectedObserverErrorCode) {
      add(issues, "PNG_DEFECT_REJECTION_CODE_MISMATCH", location, `${fixture.expectedCode} requires ${expectedObserverErrorCode}, got ${error.code}`);
    }
  }
}

export async function validateSlice03(
  sliceRoot = DEFAULT_SLICE03_ROOT,
  {
    throwOnError = true,
    observerAdapterPath = DEFAULT_OBSERVER_ADAPTER_PATH,
    reviewCatalogPath = path.resolve(sliceRoot, "../manifests/review-catalog.v0.json"),
    capabilityRegistryPath = path.resolve(sliceRoot, "../../CAPABILITY_REGISTRY.md"),
  } = {},
) {
  const issues = [];
  const allFiles = await listTree(sliceRoot, issues);
  const topEntries = await readdir(sliceRoot, { withFileTypes: true });
  for (const entry of topEntries) if (!ALLOWED_SLICE_ROOT_ENTRIES.has(entry.name)) add(issues, "SLICE_ROOT_ENTRY_UNREGISTERED", entry.name, "not part of the frozen Slice 03 layout");
  for (const relative of allFiles) {
    const segments = relative.split("/");
    if (segments.includes("holdout") || segments.includes("escape") || relative.toLowerCase().includes("secret")) {
      add(issues, "SEALED_OR_SECRET_ARTIFACT_FORBIDDEN", relative, "Slice 03 may not check in holdout, escape, or secret artifacts");
    }
  }
  const generatedTree = await compareCanonicalGeneratedSubset(sliceRoot, allFiles, issues);

  const schemaPaths = allFiles.filter((name) => name.startsWith("schemas/")).sort();
  const schemaFiles = schemaPaths.map((name) => name.slice(8));
  if (!deepEqual(schemaFiles, [...EXPECTED_SCHEMA_FILES].sort())) add(issues, "SCHEMA_SET_MISMATCH", "schemas", `expected ${EXPECTED_SCHEMA_FILES.length}, got ${schemaFiles.length}`);
  let schemaTreeHash = "unavailable";
  try {
    schemaTreeHash = await generatedTreeDigest(sliceRoot, schemaPaths);
    if (schemaTreeHash !== CANONICAL_SLICE03_SCHEMA_TREE_SHA256) {
      add(issues, "SCHEMA_TREE_DIGEST_MISMATCH", "schemas", `expected ${CANONICAL_SLICE03_SCHEMA_TREE_SHA256}, got ${schemaTreeHash}`);
    }
  } catch (error) {
    add(issues, "SCHEMA_TREE_DIGEST_FAILED", "schemas", error instanceof Error ? error.message : String(error));
  }
  const schemas = new Map();
  for (const filename of schemaFiles) {
    const schema = await readJson(path.join(sliceRoot, "schemas", filename), issues, `schemas/${filename}`);
    if (!schema) continue;
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") add(issues, "SCHEMA_DIALECT_INVALID", `schemas/${filename}`, String(schema.$schema));
    if (schema.$id !== filename) add(issues, "SCHEMA_ID_INVALID", `schemas/${filename}`, String(schema.$id));
    for (const error of unsupportedSchemaKeywords(schema, `schemas/${filename}`)) {
      add(issues, "SCHEMA_KEYWORD_UNSUPPORTED", error.location, error.message);
    }
    inspectClosedSchema(schema, schema, issues, `schemas/${filename}`);
    schemas.set(filename, schema);
  }
  const sealSchemas = await validateSealCeremonySchemas(path.join(sliceRoot, "schemas"), { throwOnError: false });
  issues.push(...sealSchemas.issues.map((issue) => ({ ...issue, location: `seal:${issue.location}` })));

  const adapterBytes = await readFile(observerAdapterPath);
  const adapterHash = hash(adapterBytes);
  const contractPath = "contracts/technical-observer.slice03.v0.3.0.json";
  const contractFiles = allFiles.filter((name) => name.startsWith("contracts/"));
  if (!deepEqual(contractFiles, [contractPath])) add(issues, "CONTRACT_SET_MISMATCH", "contracts", contractFiles.join(", "));
  const contract = await readJson(path.join(sliceRoot, contractPath), issues, contractPath);
  if (contract) {
    schemaErrors(issues, contract, schemas.get("technical-observer-contract.slice03.schema.json"), contractPath);
    if (contract.contractHash !== hashRecordWithout(contract, "contractHash")) add(issues, "CONTRACT_HASH_MISMATCH", `${contractPath}.contractHash`, "canonical contract content changed");
    if (contract.contractHash !== CANONICAL_SLICE03_OBSERVER_CONTRACT_HASH) add(issues, "CONTRACT_CANONICAL_HASH_MISMATCH", `${contractPath}.contractHash`, `expected ${CANONICAL_SLICE03_OBSERVER_CONTRACT_HASH}`);
    if (contract.implementation?.implementationSha256 !== adapterHash) add(issues, "IMPLEMENTATION_HASH_MISMATCH", `${contractPath}.implementation.implementationSha256`, `expected ${adapterHash}`);
    if (`${contract.observerContractId}@${contract.contractVersion}` !== SLICE03_TECHNICAL_OBSERVER_CONTRACT) add(issues, "OBSERVER_CONTRACT_REF_MISMATCH", contractPath, SLICE03_TECHNICAL_OBSERVER_CONTRACT);
    if (!deepEqual(
      [...(contract.unknownPolicy?.forbiddenInferences ?? [])].sort(),
      ["aesthetic-score", "age", "identity", "person-category", "recommendation", "text-content"],
    )) add(issues, "CONTRACT_FORBIDDEN_INFERENCES_MISMATCH", `${contractPath}.unknownPolicy.forbiddenInferences`, "must freeze all six forbidden inference classes");
    for (const ref of [contract.inputContract?.artifactSchemaRef, contract.outputContract?.schemaRef]) {
      if (typeof ref !== "string") continue;
      const resolved = path.resolve(sliceRoot, ref);
      try { if (!(await lstat(resolved)).isFile()) add(issues, "CONTRACT_SCHEMA_REF_INVALID", ref, "must resolve to a regular file"); }
      catch { add(issues, "CONTRACT_SCHEMA_REF_MISSING", ref, "referenced schema does not exist"); }
    }
  }

  const matrix = await readJson(path.join(sliceRoot, "format-matrix.json"), issues, "format-matrix.json");
  const rowsByKey = new Map();
  if (matrix) {
    schemaErrors(issues, matrix, schemas.get("slice03-format-matrix.v0.schema.json"), "format-matrix.json");
    if (matrix.matrixHash !== hashRecordWithout(matrix, "matrixHash")) add(issues, "MATRIX_HASH_MISMATCH", "format-matrix.json.matrixHash", "canonical matrix content changed");
    const keys = (matrix.rows ?? []).map((row) => `${row.direction}:${row.formatId}`);
    if (!deepEqual(keys, EXPECTED_ROW_KEYS)) add(issues, "MATRIX_ROW_ORDER_OR_COVERAGE_INVALID", "format-matrix.json.rows", keys.join(", "));
    const rejectionCodes = new Set();
    for (const [index, row] of (matrix.rows ?? []).entries()) {
      const key = `${row.direction}:${row.formatId}`;
      rowsByKey.set(key, row);
      const expected = expectedRowState(key);
      if (!deepEqual([row.policyState, row.implementationState, row.evidenceState], expected)) add(issues, "MATRIX_STATE_INVALID", `format-matrix.json.rows[${index}]`, `${key} must equal ${expected.join("/")}`);
      if (row.productSupport !== false) add(issues, "PRODUCT_SUPPORT_OVERCLAIM", `format-matrix.json.rows[${index}].productSupport`, "must remain false");
      if (rejectionCodes.has(row.rejectionCode)) add(issues, "MATRIX_REJECTION_CODE_DUPLICATE", `format-matrix.json.rows[${index}].rejectionCode`, row.rejectionCode);
      rejectionCodes.add(row.rejectionCode);
    }
  }

  const profileFiles = allFiles.filter((name) => name.startsWith("profiles/")).sort();
  if (profileFiles.length !== 15) add(issues, "PROFILE_COUNT_INVALID", "profiles", `expected 15, got ${profileFiles.length}`);
  const profiles = new Map();
  for (const relative of profileFiles) {
    const profile = await readJson(path.join(sliceRoot, relative), issues, relative);
    if (!profile) continue;
    schemaErrors(issues, profile, schemas.get("slice03-format-profile.v0.schema.json"), relative);
    if (profile.profileHash !== hashRecordWithout(profile, "profileHash")) add(issues, "PROFILE_HASH_MISMATCH", `${relative}.profileHash`, "canonical profile content changed");
    const row = rowsByKey.get(`${profile.direction}:${profile.formatId}`);
    if (!row || row.profileRef !== relative) add(issues, "PROFILE_MATRIX_REF_MISMATCH", relative, `${profile.direction}:${profile.formatId}`);
    else for (const field of ["policyState", "implementationState", "evidenceState", "productSupport", "rejectionCode", "claimBoundary"]) {
      if (!deepEqual(profile[field], row[field])) add(issues, "PROFILE_MATRIX_VALUE_MISMATCH", `${relative}.${field}`, `must equal matrix row ${field}`);
    }
    if (profile.productSupport !== false) add(issues, "PRODUCT_SUPPORT_OVERCLAIM", `${relative}.productSupport`, "must remain false");
    if (profile.implementationState !== "reference-executable" && (profile.bytePolicy?.decoderAllowed || profile.bytePolicy?.encoderAllowed)) {
      add(issues, "PROFILE_EXECUTOR_OVERCLAIM", `${relative}.bytePolicy`, "non-reference rows cannot allow a decoder or encoder");
    }
    profiles.set(relative, profile);
  }
  for (const row of rowsByKey.values()) if (!profiles.has(row.profileRef)) add(issues, "PROFILE_MISSING", row.profileRef, "matrix row profile does not exist");

  const rightsPath = "rights/rights.project-original-synthetic.slice-03-formats.v1.json";
  const rightsFiles = allFiles.filter((name) => name.startsWith("rights/"));
  if (!deepEqual(rightsFiles, [rightsPath])) add(issues, "RIGHTS_SET_MISMATCH", "rights", rightsFiles.join(", "));
  const rights = await readJson(path.join(sliceRoot, rightsPath), issues, rightsPath);
  if (rights) {
    schemaErrors(issues, rights, schemas.get("slice03-rights-record.v0.schema.json"), rightsPath);
    if (rights.rightsHash !== hashRecordWithout(rights, "rightsHash")) add(issues, "RIGHTS_HASH_MISMATCH", `${rightsPath}.rightsHash`, "canonical rights content changed");
  }

  const fixtureSchema = schemas.get("slice03-format-fixture.v0.schema.json");
  const manifestSchema = schemas.get("slice03-fixture-manifest.v0.schema.json");
  if (fixtureSchema && manifestSchema && (!deepEqual(fixtureSchema.properties, manifestSchema.$defs?.fixture?.properties)
    || !deepEqual(fixtureSchema.required, manifestSchema.$defs?.fixture?.required)
    || !deepEqual(fixtureSchema.$defs?.asset, manifestSchema.$defs?.asset)
    || !deepEqual(fixtureSchema.$defs?.formatId, manifestSchema.$defs?.formatId))) {
    add(issues, "FIXTURE_SCHEMA_EMBEDDED_DRIFT", "schemas", "standalone and manifest-embedded fixture definitions must agree");
  }

  const manifestFiles = allFiles.filter((name) => name.startsWith("manifests/")).map((name) => name.slice(10)).sort();
  if (!deepEqual(manifestFiles, [...EXPECTED_MANIFESTS.keys()].sort())) add(issues, "MANIFEST_SET_MISMATCH", "manifests", manifestFiles.join(", "));
  const registeredAssets = new Set();
  const fixtureIds = new Set();
  const sourceFamilies = new Set();
  const captureSessions = new Set();
  const assetHashes = new Set();
  const fixtureCodes = new Set();
  const fixtures = [];
  let observerSample;
  for (const filename of manifestFiles) {
    const relative = `manifests/${filename}`;
    const manifest = await readJson(path.join(sliceRoot, relative), issues, relative);
    if (!manifest) continue;
    schemaErrors(issues, manifest, manifestSchema, relative);
    const expectedManifest = EXPECTED_MANIFESTS.get(filename);
    if (!expectedManifest || manifest.partition !== expectedManifest.partition || manifest.fixtureCount !== expectedManifest.fixtures || manifest.fixtures?.length !== expectedManifest.fixtures) {
      add(issues, "MANIFEST_PARTITION_OR_COUNT_INVALID", relative, JSON.stringify(expectedManifest));
    }
    if (manifest.manifestHash !== hashRecordWithout(manifest, "manifestHash")) add(issues, "MANIFEST_HASH_MISMATCH", `${relative}.manifestHash`, "canonical manifest content changed");
    const actualProfileRefs = [...new Set((manifest.fixtures ?? []).map((fixture) => fixture.profileRef))].sort();
    if (!deepEqual(manifest.profileRefs, actualProfileRefs)) add(issues, "MANIFEST_PROFILE_REFS_MISMATCH", `${relative}.profileRefs`, "must equal fixture profile refs");
    for (const [index, fixture] of (manifest.fixtures ?? []).entries()) {
      const location = `${relative}.fixtures[${index}]`;
      fixtures.push(fixture);
      schemaErrors(issues, fixture, fixtureSchema, location);
      for (const [value, set, code, field] of [
        [fixture.fixtureId, fixtureIds, "FIXTURE_ID_DUPLICATE", "fixtureId"],
        [fixture.sourceFamilyId, sourceFamilies, "SOURCE_FAMILY_DUPLICATE", "sourceFamilyId"],
        [fixture.captureSessionId, captureSessions, "CAPTURE_SESSION_DUPLICATE", "captureSessionId"],
      ]) {
        if (set.has(value)) add(issues, code, `${location}.${field}`, String(value));
        set.add(value);
      }
      if (fixture.productSupport !== false || fixture.containsRealPerson !== false || fixture.sourceClass !== "project-original-synthetic") add(issues, "FIXTURE_BOUNDARY_OVERCLAIM", location, "must be private project-original synthetic and productSupport=false");
      if (fixture.rightsRecordId !== rights?.rightsRecordId) add(issues, "FIXTURE_RIGHTS_MISSING", `${location}.rightsRecordId`, String(fixture.rightsRecordId));
      if (!profiles.has(fixture.profileRef)) add(issues, "FIXTURE_PROFILE_MISSING", `${location}.profileRef`, String(fixture.profileRef));
      const row = rowsByKey.get(`input:${fixture.formatId}`);
      if (!row || row.profileRef !== fixture.profileRef) add(issues, "FIXTURE_MATRIX_MISMATCH", location, `${fixture.formatId}/${fixture.profileRef}`);
      if (!EXPECTED_FIXTURE_CODES.has(fixture.expectedCode)) add(issues, "FIXTURE_CODE_UNREGISTERED", `${location}.expectedCode`, String(fixture.expectedCode));
      if (fixtureCodes.has(fixture.expectedCode)) add(issues, "FIXTURE_CODE_DUPLICATE", `${location}.expectedCode`, fixture.expectedCode);
      fixtureCodes.add(fixture.expectedCode);
      const asset = fixture.assets?.[0];
      if (!asset) continue;
      if (registeredAssets.has(asset.path)) add(issues, "ASSET_PATH_DUPLICATE", `${location}.assets[0].path`, asset.path);
      registeredAssets.add(asset.path);
      if (asset.exposure !== "catalog-denied") add(issues, "CATALOG_EXPOSURE_FORBIDDEN", `${location}.assets[0].exposure`, String(asset.exposure));
      const prefix = `fixtures/${manifest.partition}/NORMALIZE-DELIVER/${fixture.fixtureId}/`;
      if (!asset.path.startsWith(prefix) || asset.path.includes("..") || asset.path.includes("\\")) add(issues, "ASSET_PATH_INVALID", `${location}.assets[0].path`, prefix);
      const absolute = path.resolve(sliceRoot, asset.path);
      if (!absolute.startsWith(path.resolve(sliceRoot) + path.sep)) { add(issues, "ASSET_PATH_ESCAPE", asset.path, "must remain inside Slice 03"); continue; }
      try {
        const metadata = await lstat(absolute);
        if (!metadata.isFile() || metadata.isSymbolicLink()) { add(issues, "ASSET_NOT_REGULAR", asset.path, "must be a regular file"); continue; }
        const bytes = await readFile(absolute);
        if (bytes.length !== asset.byteLength) add(issues, "ASSET_LENGTH_MISMATCH", asset.path, `expected ${asset.byteLength}`);
        const actualHash = hash(bytes);
        if (actualHash !== asset.sha256) add(issues, "ASSET_HASH_MISMATCH", asset.path, `expected ${asset.sha256}`);
        if (assetHashes.has(actualHash)) add(issues, "ASSET_HASH_DUPLICATE", asset.path, actualHash);
        assetHashes.add(actualHash);
        const observation = validateFixtureBytes(issues, fixture, bytes, adapterHash, location);
        if (observation) observerSample = observation;
      } catch (error) {
        add(issues, "ASSET_READ_FAILED", asset.path, error instanceof Error ? error.message : String(error));
      }
    }
  }
  if (!deepEqual([...fixtureCodes].sort(), [...EXPECTED_FIXTURE_CODES].sort())) add(issues, "FIXTURE_CODE_COVERAGE_INVALID", "manifests", `expected ${EXPECTED_FIXTURE_CODES.size}, got ${fixtureCodes.size}`);
  const assetFiles = allFiles.filter((name) => name.startsWith("fixtures/"));
  if (!deepEqual(assetFiles.sort(), [...registeredAssets].sort())) add(issues, "UNREGISTERED_ASSET", "fixtures", `${assetFiles.length} files / ${registeredAssets.size} records`);
  if (observerSample) schemaErrors(issues, observerSample, schemas.get("technical-observer.slice03.schema.json"), "observerSample");
  else add(issues, "OBSERVER_SAMPLE_MISSING", "fixtures", "canonical observer sample was not produced");

  const catalog = await readJson(reviewCatalogPath, issues, "../manifests/review-catalog.v0.json");
  const catalogText = JSON.stringify(catalog ?? {});
  if (catalogText.toLowerCase().includes("slice-03") || fixtures.some((fixture) => catalogText.includes(fixture.fixtureId))
    || [...registeredAssets].some((relative) => catalogText.includes(relative))) {
    add(issues, "CATALOG_LEAK", "../manifests/review-catalog.v0.json", "Slice 03 private fixture appears in the review catalog");
  }

  try {
    const registry = await readFile(capabilityRegistryPath, "utf8");
    const occurrences = registry.match(new RegExp(adapterHash, "g"))?.length ?? 0;
    if (occurrences !== 1) add(issues, "REGISTRY_IMPLEMENTATION_HASH_MISMATCH", "../../CAPABILITY_REGISTRY.md", `expected exact adapter hash once, got ${occurrences}`);
    if (!registry.includes(SLICE03_TECHNICAL_OBSERVER_CONTRACT)) add(issues, "REGISTRY_CONTRACT_REF_MISSING", "../../CAPABILITY_REGISTRY.md", SLICE03_TECHNICAL_OBSERVER_CONTRACT);
  } catch (error) {
    add(issues, "REGISTRY_READ_FAILED", "../../CAPABILITY_REGISTRY.md", error instanceof Error ? error.message : String(error));
  }

  const result = {
    ok: issues.length === 0,
    issues,
    summary: {
      contracts: contract ? 1 : 0,
      schemas: schemaFiles.length,
      matrixRows: matrix?.rows?.length ?? 0,
      profiles: profileFiles.length,
      fixtureManifests: manifestFiles.length,
      fixtures: fixtures.length,
      assets: registeredAssets.size,
      sealSchemas: Object.keys(sealSchemas.schemas ?? {}).length,
      formalHoldoutStatus: "not-created",
      observerAdapterHash: adapterHash,
      observerContractHash: contract?.contractHash ?? "unknown",
      matrixHash: matrix?.matrixHash ?? "unknown",
      generatedSubsetTreeHash: generatedTree.currentTreeHash,
      schemaTreeHash,
    },
  };
  if (!result.ok && throwOnError) throw new Slice03ValidationError(issues);
  return result;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
}

if (isMainModule()) {
  const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SLICE03_ROOT;
  const result = await validateSlice03(requestedRoot, { throwOnError: false });
  if (!result.ok) {
    result.issues.forEach((entry) => console.error(`[${entry.code}] ${entry.location}: ${entry.message}`));
    console.error(`Slice 03 validation failed with ${result.issues.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Slice 03 valid: ${result.summary.contracts} observer contract, ${result.summary.matrixRows} format rows, ${result.summary.profiles} profiles, ${result.summary.fixtures} open fixtures, ${result.summary.assets} assets, ${result.summary.sealSchemas} seal schemas.`);
    console.log("Formal holdout: not-created; rehearsal uses temp-only mock metadata; no holdout, defect-holdout, or escape assets are checked in.");
    console.log("Evidence boundary: C1=0; U1=0; E1=0; R1-pipeline=0; R1-product-validation=0; R1-product-release=0; O1=0; G1=0; V1=0.");
    console.log("Release Gate: allowlist=none; registered=0; approved=0; research-only.");
  }
}
