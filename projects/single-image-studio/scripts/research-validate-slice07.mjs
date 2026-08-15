import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SLICE07_SCHEMA_DOCUMENTS,
  buildSlice07Definition,
} from "./research-generate-slice07.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { validateSlice07GateBOperationTree } from "./research-gateb-runner-slice07.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "research", "slice-07");
const SUPPORTED = new Set([
  "$schema", "$id", "type", "const", "enum", "pattern", "format", "minimum", "maximum",
  "minItems", "maxItems", "items", "oneOf", "additionalProperties", "required", "properties",
]);

export const SLICE07_FROZEN_PINS = Object.freeze({
  frozenAt: "2026-08-15T12:15:57.873Z",
  definitionContentHash: "298e2ee08c5471eb50f95aff26e46d3459e26bb586ef8c4d59cb01b96072b2d6",
  definitionFileSha256: "de2eabd3bb5794494723a8123753a425fb5ee97c0d2a014b58698ef6572bd645",
  descendantTreeSha256: "6c94fd4cb707355eeea78c188733c18380a65a3c887ea6e185da0b2eed6cea75",
  schemaTreeSha256: "944a7e6eae34188d6d84492871d29edcdf9de3f55f28027130ef88436cd811f8",
  fullTreeSha256: "bc608ed9c7aa61a3165a35018149acbf2800035b769fb7fd379d6e6847fa0481",
  readmeSha256: "94d1269e820ab45b773283782b8c198cd1d0285b0b934db113667e5a4563b5f6",
  generatorSha256: "c42837da0347980f468e4c26107c94242e76ac0751218ed15014d6e358659f1d",
});
export const SLICE07_POSTRUN_TREE_SHA256 = "80b242de729df5e5974c90c0342d2e10e9609559aae5f3c2e1162afb4f1ccf9c";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function contentHash(value) {
  const { contentHash: ignored, ...payload } = value;
  return sha256(Buffer.from(JSON.stringify(stable(payload)), "utf8"));
}
function issue(issues, code, location, message) { issues.push({ code, location, message }); }

function inspectSchema(schema, location, issues, inProperties = false) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    issue(issues, "SCHEMA_NODE_INVALID", location, "schema node must be an object");
    return;
  }
  for (const [key, child] of Object.entries(schema)) {
    if (!inProperties && !SUPPORTED.has(key)) issue(issues, "SCHEMA_KEYWORD_UNSUPPORTED", `${location}/${key}`, "unsupported keyword");
    if (key === "properties") {
      for (const [name, nested] of Object.entries(child ?? {})) inspectSchema(nested, `${location}/properties/${name}`, issues);
    } else if (key === "items") inspectSchema(child, `${location}/items`, issues);
    else if (key === "oneOf") for (let index = 0; index < child.length; index += 1) inspectSchema(child[index], `${location}/oneOf/${index}`, issues);
  }
  if (schema.type === "object") {
    if (schema.additionalProperties !== false || !schema.properties || !Array.isArray(schema.required)
      || JSON.stringify([...schema.required].sort()) !== JSON.stringify(Object.keys(schema.properties).sort())) {
      issue(issues, "SCHEMA_OBJECT_OPEN", location, "every object must be closed and require every property");
    }
  }
}

function validateInstance(value, schema, location, issues) {
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => {
      const local = [];
      validateInstance(value, candidate, location, local);
      return local.length === 0;
    });
    if (matches.length !== 1) issue(issues, "SCHEMA_ONE_OF_INVALID", location, "value must match exactly one branch");
    return;
  }
  if (Object.hasOwn(schema, "const") && JSON.stringify(value) !== JSON.stringify(schema.const)) issue(issues, "SCHEMA_CONST_MISMATCH", location, "const mismatch");
  if (schema.enum && !schema.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) issue(issues, "SCHEMA_ENUM_MISMATCH", location, "enum mismatch");
  if (schema.type === "null" && value !== null) issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected null");
  if (schema.type === "string") {
    if (typeof value !== "string") issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected string");
    else {
      if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) issue(issues, "SCHEMA_PATTERN_MISMATCH", location, "pattern mismatch");
      if (schema.format === "date-time" && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)) issue(issues, "SCHEMA_DATETIME_INVALID", location, "invalid canonical UTC");
    }
  }
  if (schema.type === "boolean" && typeof value !== "boolean") issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected boolean");
  if (schema.type === "integer") {
    if (!Number.isInteger(value)) issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected integer");
    else if ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum)) issue(issues, "SCHEMA_RANGE_INVALID", location, "integer outside range");
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected array");
    else {
      if ((schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) issue(issues, "SCHEMA_ARRAY_LENGTH_INVALID", location, "array length outside range");
      for (let index = 0; index < value.length; index += 1) validateInstance(value[index], schema.items, `${location}/${index}`, issues);
    }
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) issue(issues, "SCHEMA_TYPE_MISMATCH", location, "expected object");
    else {
      const allowed = Object.keys(schema.properties);
      for (const key of Object.keys(value)) if (!allowed.includes(key)) issue(issues, "SCHEMA_EXTRA_PROPERTY", `${location}/${key}`, "extra property");
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) issue(issues, "SCHEMA_REQUIRED_MISSING", `${location}/${key}`, "required property missing");
        else validateInstance(value[key], schema.properties[key], `${location}/${key}`, issues);
      }
    }
  }
}

async function enumerate(root, prefix = "", output = new Map()) {
  for (const entry of (await readdir(path.join(root, prefix), { withFileTypes: true })).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(root, ...relative.split("/"));
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`link forbidden: ${relative}`);
    if (stat.isDirectory()) await enumerate(root, relative, output);
    else if (stat.isFile()) output.set(relative, await readFile(absolute));
    else throw new Error(`non-regular file forbidden: ${relative}`);
  }
  return output;
}

function digestSubset(files, predicate) {
  const hash = createHash("sha256");
  for (const [relative, bytes] of [...files.entries()].filter(([name]) => predicate(name)).sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)))) {
    hash.update(relative); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0])); hash.update(sha256(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

function descriptorFor(relativePath, record, bytes) {
  return { path: relativePath, id: record.id, contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) };
}

function discoverRefs(value, refs = []) {
  if (Array.isArray(value)) for (const entry of value) discoverRefs(entry, refs);
  else if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    if (JSON.stringify(keys) === JSON.stringify(["byteLength", "contentHash", "fileSha256", "id", "path"])) refs.push(value);
    else for (const child of Object.values(value)) discoverRefs(child, refs);
  }
  return refs;
}

async function validateRegisteredResults({ definitionRoot, resultPaths, sourceById, issues }) {
  const allowed = /^(?:results\/open-smoke\/(?:normalize|export)\/).+/u;
  for (const relative of resultPaths) if (!allowed.test(relative)) issue(issues, "RESULT_PATH_UNREGISTERED", relative, "only the frozen open-smoke operation roots are allowed");
  const report = { valid: true, operations: {}, applicablePasses: 0, rejectionExactPasses: 0, rejectionNonPasses: 0 };
  for (const operation of ["normalize", "export"]) {
    const operationRoot = path.join(definitionRoot, "results", "open-smoke", operation);
    const operationValidation = await validateSlice07GateBOperationTree({ resultsRoot: operationRoot, operation });
    report.operations[operation] = operationValidation;
    if (!operationValidation.valid) issue(issues, "RESULT_OPERATION_INVALID", operation, operationValidation.issues.join(","));
    const requests = new Map();
    const ledgerEvents = (await readFile(path.join(operationRoot, "ledger.ndjson"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const startedByAttempt = new Map(ledgerEvents.filter((event) => event.eventType === "attempt-started").map((event) => [event.attemptId, event]));
    const terminalByAttempt = new Map(ledgerEvents.filter((event) => event.eventType === "attempt-terminal").map((event) => [event.attemptId, event]));
    const operationFiles = resultPaths.filter((name) => name.startsWith(`results/open-smoke/${operation}/`));
    for (const relative of operationFiles.filter((name) => /\/requests\/[^/]+\.json$/u.test(name))) {
      const value = JSON.parse(await readFile(path.join(definitionRoot, ...relative.split("/")), "utf8"));
      requests.set(value.attemptId, value);
      if (startedByAttempt.get(value.attemptId)?.payloadSha256 !== sha256(Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"))) {
        issue(issues, "REQUEST_LEDGER_BINDING_INVALID", relative, "attempt-started does not bind the durable request bytes");
      }
    }
    const resultRelatives = operationFiles.filter((name) => /\/records\/[^/]+\.json$/u.test(name) || /\/closures\/[^/]+\/result\.json$/u.test(name));
    for (const relative of resultRelatives) {
      const result = JSON.parse(await readFile(path.join(definitionRoot, ...relative.split("/")), "utf8"));
      const request = requests.get(result.attemptId);
      if (!request) { issue(issues, "RESULT_REQUEST_MISSING", relative, "terminal result lacks its request"); continue; }
      if (terminalByAttempt.get(result.attemptId)?.payloadSha256 !== sha256(Buffer.from(`${JSON.stringify(stable(result))}\n`, "utf8"))) {
        issue(issues, "RESULT_LEDGER_BINDING_INVALID", relative, "attempt-terminal does not bind the durable result bytes");
      }
      if (result.disposition === "rejection") {
        const expectedStatus = result.actualCode === request.expectedStableErrorCode && result.workerExitConfirmed === false ? "pass" : "non-pass";
        if (result.status !== expectedStatus || result.closureRef !== null) issue(issues, "REJECTION_RESULT_DERIVATION_INVALID", relative, "rejection status is not derived from the frozen expected code");
        if (result.status === "pass") report.rejectionExactPasses += 1;
        else report.rejectionNonPasses += 1;
        continue;
      }
      if (result.status !== "pass" || result.closureRef === null) continue;
      const closureDirectory = path.dirname(path.join(definitionRoot, ...relative.split("/")));
      const output = await readFile(path.join(closureDirectory, "output.png"));
      const oracle = JSON.parse(await readFile(path.join(closureDirectory, "oracle.json"), "utf8"));
      const closure = JSON.parse(await readFile(path.join(closureDirectory, "closure.json"), "utf8"));
      const decoded = decodeIndependentPngSlice05(output);
      const source = sourceById.get(result.sourceId);
      const gold = source?.goldRecordPath ? JSON.parse(await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...source.goldRecordPath.split("/")), "utf8")) : null;
      const expected = gold?.expected;
      const oracleExpected = { fileSha256: decoded.fileSha256, decodedPixelSha256: decoded.decodedPixelSha256, width: decoded.width, height: decoded.height, chunkTypes: decoded.chunkTypes };
      if (JSON.stringify(stable(oracle)) !== JSON.stringify(stable(oracleExpected))
        || closure.oracleFactsSha256 !== sha256(Buffer.from(`${JSON.stringify(stable(oracle))}\n`, "utf8"))
        || closure.outputByteLength !== output.length || closure.outputFileSha256 !== decoded.fileSha256
        || closure.decodedPixelSha256 !== decoded.decodedPixelSha256 || result.fileSha256 !== decoded.fileSha256
        || !decoded.filter0Only || JSON.stringify(decoded.chunkTypes) !== JSON.stringify(["IHDR", "sRGB", "IDAT", "IEND"])
        || !expected || decoded.decodedPixelSha256 !== expected.decodedPixelSha256
        || decoded.width !== expected.width || decoded.height !== expected.height) {
        issue(issues, "APPLICABLE_OUTPUT_REOPEN_INVALID", relative, "persisted candidate output does not reproduce its oracle/gold closure");
      } else report.applicablePasses += 1;
    }
  }
  report.valid = !issues.some((entry) => entry.code.startsWith("RESULT_") || entry.code.startsWith("REJECTION_") || entry.code.startsWith("APPLICABLE_"));
  return report;
}

export async function validateSlice07Definition({
  definitionRoot = DEFAULT_ROOT,
  requirePins = true,
  recheckRuntime = true,
  regenerate = true,
} = {}) {
  const issues = [];
  let allFiles;
  try { allFiles = await enumerate(definitionRoot); } catch (error) {
    return { valid: false, issues: [{ code: "TREE_READ_FAILED", location: definitionRoot, message: error.message }], definitionRef: null };
  }
  const resultPaths = [...allFiles.keys()].filter((name) => name.startsWith("results/"));
  const files = new Map([...allFiles].filter(([name]) => !name.startsWith("results/")));
  const indexBytes = files.get("definition-index.v0.7.0.json");
  if (!indexBytes) return { valid: false, issues: [{ code: "DEFINITION_INDEX_MISSING", location: "definition-index.v0.7.0.json", message: "missing" }], definitionRef: null };
  let index;
  try { index = JSON.parse(indexBytes); } catch (error) {
    return { valid: false, issues: [{ code: "DEFINITION_INDEX_INVALID", location: "definition-index.v0.7.0.json", message: error.message }], definitionRef: null };
  }
  const readmeBytes = files.get("README.md");
  if (!readmeBytes) issue(issues, "README_MISSING", "README.md", "README must be pinned");
  let rebuilt = null;
  if (regenerate || recheckRuntime) {
    try { rebuilt = await buildSlice07Definition({ frozenAt: index.frozenAt, readmeBytes }); }
    catch (error) { issue(issues, "REGENERATION_FAILED", "generator", error.message); }
  }
  if (rebuilt) {
    const expected = new Map(rebuilt.fileMap);
    expected.set("README.md", readmeBytes);
    if (files.size !== expected.size) issue(issues, "FILE_SET_MISMATCH", definitionRoot, `expected ${expected.size}, got ${files.size}`);
    for (const [relative, expectedBytes] of expected) {
      const actual = files.get(relative);
      if (!actual || !actual.equals(expectedBytes)) issue(issues, "GENERATED_BYTES_MISMATCH", relative, "actual bytes differ from a fresh generation");
    }
  }
  const schemaByVersion = new Map();
  for (const [relative, expectedSchema] of Object.entries(SLICE07_SCHEMA_DOCUMENTS)) {
    inspectSchema(expectedSchema, relative, issues);
    const actualBytes = files.get(relative);
    if (!actualBytes || !actualBytes.equals(Buffer.from(`${JSON.stringify(stable(expectedSchema), null, 2)}\n`, "utf8"))) issue(issues, "SCHEMA_BYTES_MISMATCH", relative, "schema differs from implementation export");
    if (actualBytes) {
      try { inspectSchema(JSON.parse(actualBytes), `${relative}:actual`, issues); }
      catch (error) { issue(issues, "SCHEMA_JSON_INVALID", relative, error.message); }
    }
    const version = expectedSchema.properties?.schemaVersion?.const;
    if (version) schemaByVersion.set(version, expectedSchema);
  }
  const records = new Map();
  for (const [relative, bytes] of files) {
    if (!relative.endsWith(".json") || relative.startsWith("schemas/")) continue;
    let value;
    try { value = JSON.parse(bytes); } catch (error) { issue(issues, "JSON_INVALID", relative, error.message); continue; }
    records.set(relative, { value, bytes });
    const recordSchema = schemaByVersion.get(value.schemaVersion);
    if (!recordSchema) issue(issues, "RECORD_SCHEMA_UNREGISTERED", relative, value.schemaVersion ?? "missing schemaVersion");
    else validateInstance(value, recordSchema, relative, issues);
    if (value.contentHash !== contentHash(value)) issue(issues, "CONTENT_HASH_MISMATCH", relative, "record contentHash is invalid");
  }
  for (const [ownerPath, { value }] of records) {
    for (const ref of discoverRefs(value)) {
      const targetPath = ref.path.startsWith("../") ? path.normalize(path.join(DEFAULT_ROOT, ref.path)) : path.join(definitionRoot, ...ref.path.split("/"));
      try {
        const targetBytes = await readFile(targetPath);
        const target = JSON.parse(targetBytes);
        if (ref.id !== (target.id ?? target.definitionId ?? target.definitionIndexId ?? target.goldRecordId ?? target.artifactId ?? target.sourceId)
          || ref.contentHash !== target.contentHash || ref.byteLength !== targetBytes.length || ref.fileSha256 !== sha256(targetBytes)) {
          issue(issues, "REFERENCE_BINDING_MISMATCH", `${ownerPath}:${ref.path}`, "reference differs from actual target bytes");
        }
      } catch (error) { issue(issues, "REFERENCE_TARGET_MISSING", `${ownerPath}:${ref.path}`, error.message); }
    }
  }
  const candidate = records.get("candidate-locks/composite-canonical-png.v0.7.0.json")?.value;
  if (!candidate || !Array.isArray(candidate.implementationRefs) || candidate.implementationRefs.length !== 7
    || candidate.implementationRefs.some((ref) => ref.path === "scripts/research-validate-slice07.mjs")) {
    issue(issues, "IMPLEMENTATION_SET_INVALID", "candidate-lock", "candidate must pin exactly seven non-validator implementations");
  } else {
    for (const ref of candidate.implementationRefs) {
      try {
        const bytes = await readFile(path.join(PROJECT_ROOT, ...ref.path.split("/")));
        if (sha256(bytes) !== ref.sha256) issue(issues, "IMPLEMENTATION_HASH_MISMATCH", ref.path, "implementation bytes drifted");
      } catch (error) { issue(issues, "IMPLEMENTATION_MISSING", ref.path, error.message); }
    }
  }
  const sourceRecords = [...records.entries()].filter(([name]) => name.startsWith("source-lineage/"));
  const sourceIds = new Set();
  const families = new Set();
  const sessions = new Set();
  const operationCounts = { normalize: { applicable: 0, rejection: 0 }, export: { applicable: 0, rejection: 0 } };
  for (const [relative, { value }] of sourceRecords) {
    if (sourceIds.has(value.sourceId) || families.has(value.sourceFamilyId) || sessions.has(value.captureSessionId)) issue(issues, "SOURCE_ISOLATION_INVALID", relative, "source/family/session identities must be globally unique");
    sourceIds.add(value.sourceId); families.add(value.sourceFamilyId); sessions.add(value.captureSessionId);
    if (operationCounts[value.operation] && Object.hasOwn(operationCounts[value.operation], value.disposition)) {
      operationCounts[value.operation][value.disposition] += 1;
    } else {
      issue(issues, "SOURCE_DISPOSITION_INVALID", relative, "source operation/disposition is not registered");
    }
    if (!value.rawAssetPath.startsWith(`assets/open/${value.operation}-smoke/`) || value.copiedImageBytes !== false || value.independenceClaim !== false) {
      issue(issues, "SOURCE_LINEAGE_BOUNDARY_INVALID", relative, "source must be a non-independent reference to public Slice 05 bytes");
    }
    try {
      const raw = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.rawAssetPath.split("/")));
      if (raw.length !== value.rawAssetByteLength || sha256(raw) !== value.rawAssetFileSha256) issue(issues, "SOURCE_BYTES_DRIFT", relative, "raw Slice 05 bytes differ");
      if (value.rawAssetDecodedPixelSha256 !== null && value.disposition === "applicable") {
        const decoded = decodeIndependentPngSlice05(raw);
        if (decoded.decodedPixelSha256 !== value.rawAssetDecodedPixelSha256) issue(issues, "SOURCE_PIXEL_DRIFT", relative, "decoded pixels differ");
      }
      if (value.goldRecordPath !== null) {
        const gold = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.goldRecordPath.split("/")));
        if (sha256(gold) !== value.goldRecordFileSha256) issue(issues, "GOLD_RECORD_DRIFT", relative, "gold bytes differ");
      }
      if (value.normalizedArtifactPath !== null) {
        const artifact = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", ...value.normalizedArtifactPath.split("/")));
        if (sha256(artifact) !== value.normalizedArtifactFileSha256) issue(issues, "NORMALIZED_INPUT_DRIFT", relative, "normalized input record differs");
      }
    } catch (error) { issue(issues, "SOURCE_LINEAGE_READ_FAILED", relative, error.message); }
  }
  for (const operation of ["normalize", "export"]) {
    if (operationCounts[operation].applicable !== 3 || operationCounts[operation].rejection !== 3) issue(issues, "SOURCE_DENOMINATOR_INVALID", operation, "requires three applicable and three rejection sources");
  }
  let postRun = null;
  if (resultPaths.length > 0) {
    const postRunTreeSha256 = digestSubset(allFiles, (name) => name.startsWith("results/"));
    if (postRunTreeSha256 !== SLICE07_POSTRUN_TREE_SHA256) issue(issues, "POSTRUN_TREE_MISMATCH", "results/open-smoke", "registered result tree differs from its immutable post-run pin");
    try {
      postRun = await validateRegisteredResults({ definitionRoot, resultPaths, sourceById: new Map(sourceRecords.map(([, entry]) => [entry.value.sourceId, entry.value])), issues });
      postRun.treeSha256 = postRunTreeSha256;
    } catch (error) {
      issue(issues, "POSTRUN_VALIDATION_FAILED", "results/open-smoke", error.message);
      postRun = { valid: false, treeSha256: postRunTreeSha256 };
    }
  }
  if (index.descendantFileCount !== files.size - 2) issue(issues, "DESCENDANT_COUNT_MISMATCH", "definition-index", "descendant count excludes index and README");
  const descendants = new Map([...files].filter(([name]) => name !== "README.md" && name !== "definition-index.v0.7.0.json"));
  if (index.descendantTreeSha256 !== digestSubset(descendants, () => true)) issue(issues, "DESCENDANT_TREE_MISMATCH", "definition-index", "descendant digest mismatch");
  if (index.readmeSha256 !== sha256(readmeBytes ?? Buffer.alloc(0))) issue(issues, "README_HASH_MISMATCH", "README.md", "README hash mismatch");
  if (index.schemaPaths.length !== 16 || new Set(index.schemaPaths).size !== 16
    || index.resultProtocol.plannedSources !== 12 || index.resultProtocol.plannedAttempts !== 36
    || index.resultProtocol.replacements !== 0 || index.resultsState !== "not-created" || index.copiedImageBytes !== 0) {
    issue(issues, "DEFINITION_SEMANTICS_INVALID", "definition-index", "denominator/results boundary differs from Slice 07 contract");
  }
  const fullDigest = digestSubset(files, () => true);
  const schemaDigest = digestSubset(files, (name) => name.startsWith("schemas/"));
  if (requirePins) {
    for (const [key, value] of Object.entries(SLICE07_FROZEN_PINS)) if (value === null) issue(issues, "FROZEN_PIN_MISSING", key, "formal validation pin not filled");
    const actualPins = {
      frozenAt: index.frozenAt, definitionContentHash: index.contentHash, definitionFileSha256: sha256(indexBytes),
      descendantTreeSha256: index.descendantTreeSha256, schemaTreeSha256: schemaDigest, fullTreeSha256: fullDigest,
      readmeSha256: sha256(readmeBytes ?? Buffer.alloc(0)), generatorSha256: index.generatorSha256,
    };
    for (const [key, expected] of Object.entries(SLICE07_FROZEN_PINS)) if (expected !== null && actualPins[key] !== expected) issue(issues, "FROZEN_PIN_MISMATCH", key, `${actualPins[key]} != ${expected}`);
  }
  const definitionRef = descriptorFor("definition-index.v0.7.0.json", index, indexBytes);
  return {
    valid: issues.length === 0,
    issues,
    definitionRef,
    frozenAt: index.frozenAt,
    counts: { schemas: 16, records: records.size, sourceLineage: [...records.keys()].filter((name) => name.startsWith("source-lineage/")).length, results: 0 },
    digests: { schemaTreeSha256: schemaDigest, descendantTreeSha256: index.descendantTreeSha256, fullTreeSha256: fullDigest },
    pinsVerified: requirePins && issues.every((entry) => !entry.code.startsWith("FROZEN_PIN")),
    runtimeRechecked: Boolean(rebuilt && recheckRuntime),
    regenerationVerified: Boolean(rebuilt && regenerate && !issues.some((entry) => entry.code === "GENERATED_BYTES_MISMATCH")),
    postRun,
  };
}

async function main() {
  const report = await validateSlice07Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
}
