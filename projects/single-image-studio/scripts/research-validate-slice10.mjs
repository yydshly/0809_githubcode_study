import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SLICE10_PREVIEW_PATHS,
  SLICE10_PREVIEW_SCHEMA_DOCUMENTS,
  buildSlice10DefinitionPreview,
  canonicalBytesSlice10,
  digestSlice10Files,
  sha256Slice10Definition,
} from "./research-generate-slice10.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-10");
const README_SHA256 = "4ad72f07602abccc6e3ea96ea376bda188b189953fc123cdd3f87221e1890d30";
const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$id", "$schema", "additionalProperties", "const", "enum", "items", "maxItems", "maxLength",
  "maximum", "minItems", "minLength", "minimum", "oneOf", "pattern", "properties", "required", "type",
]);

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function issue(code, message, relativePath = null) { return Object.freeze({ code, message, path: relativePath }); }

function inspectSchema(node, location, issues) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((entry, index) => inspectSchema(entry, `${location}[${index}]`, issues));
    return;
  }
  for (const key of Object.keys(node)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(key)) issues.push(issue("SCHEMA_KEYWORD_UNSUPPORTED", `${location}: ${key}`));
  }
  if (node.type === "object") {
    if (node.additionalProperties !== false || !node.properties || !Array.isArray(node.required)
      || [...node.required].sort().join("\0") !== Object.keys(node.properties).sort().join("\0")) {
      issues.push(issue("SCHEMA_OBJECT_OPEN", `${location}: object must be closed and fully required`));
    }
  }
  if (node.type === "array" && !node.items) issues.push(issue("SCHEMA_ARRAY_OPEN", `${location}: array items missing`));
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties") {
      for (const [name, child] of Object.entries(value)) inspectSchema(child, `${location}.properties.${name}`, issues);
    } else if (["items", "oneOf"].includes(key)) inspectSchema(value, `${location}.${key}`, issues);
  }
}

async function enumerateTree(root) {
  const files = new Map();
  const walk = async (directory, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink()) throw Object.assign(new Error(`link forbidden: ${relativePath}`), { code: "TREE_LINK_FORBIDDEN" });
      if (entry.isDirectory()) await walk(absolutePath, relativePath);
      else if (entry.isFile()) files.set(relativePath, await readFile(absolutePath));
      else throw Object.assign(new Error(`special file forbidden: ${relativePath}`), { code: "TREE_SPECIAL_FILE_FORBIDDEN" });
    }
  };
  const resolved = path.resolve(root);
  if (path.resolve(await realpath(resolved)).toLowerCase() !== resolved.toLowerCase()) {
    throw Object.assign(new Error("definition root cannot be a link or junction"), { code: "TREE_LINK_FORBIDDEN" });
  }
  await walk(resolved);
  return files;
}

function compareFileMaps(actual, expected, issues) {
  const actualPaths = [...actual.keys()].sort();
  const expectedPaths = [...expected.keys()].sort();
  for (const relativePath of actualPaths.filter((entry) => !expected.has(entry))) {
    issues.push(issue("TREE_EXTRA_FILE", "unregistered file", relativePath));
  }
  for (const relativePath of expectedPaths.filter((entry) => !actual.has(entry))) {
    issues.push(issue("TREE_FILE_MISSING", "registered file missing", relativePath));
  }
  for (const relativePath of expectedPaths.filter((entry) => actual.has(entry))) {
    if (!actual.get(relativePath).equals(expected.get(relativePath))) {
      issues.push(issue("TREE_BYTES_MISMATCH", "file differs from deterministic regeneration", relativePath));
    }
  }
}

function recordRef(indexBytes, index) {
  return Object.freeze({
    path: SLICE10_PREVIEW_PATHS.definition,
    id: index.id,
    contentHash: index.contentHash,
    byteLength: indexBytes.length,
    fileSha256: sha256(indexBytes),
  });
}

export async function validateSlice10Definition({
  definitionRoot = DEFAULT_ROOT,
  requirePins = false,
  recheckRuntime = true,
  regenerate = true,
} = {}) {
  const issues = [];
  let actual;
  try { actual = await enumerateTree(definitionRoot); } catch (error) {
    return Object.freeze({ valid: false, issues: [issue(error?.code ?? "TREE_READ_FAILED", error.message)], definitionRef: null, postRun: null });
  }
  if ([...actual.keys()].some((entry) => entry === "results" || entry.startsWith("results/"))) {
    issues.push(issue("RESULTS_PRESENT_AT_DEFINITION", "results are forbidden in a results-zero definition"));
  }
  const indexBytes = actual.get(SLICE10_PREVIEW_PATHS.definition);
  const readmeBytes = actual.get("README.md");
  if (!indexBytes || !readmeBytes) {
    issues.push(issue("DEFINITION_ROOT_INCOMPLETE", "definition index and README are required"));
    return Object.freeze({ valid: false, issues, definitionRef: null, postRun: null });
  }
  let index;
  try { index = JSON.parse(indexBytes); } catch {
    issues.push(issue("DEFINITION_INDEX_INVALID", "definition index is not JSON", SLICE10_PREVIEW_PATHS.definition));
    return Object.freeze({ valid: false, issues, definitionRef: null, postRun: null });
  }
  if (sha256(readmeBytes) !== README_SHA256) issues.push(issue("README_HASH_MISMATCH", "Slice 10 README is not the reviewed preview", "README.md"));
  for (const [schemaPath, schema] of Object.entries(SLICE10_PREVIEW_SCHEMA_DOCUMENTS)) {
    inspectSchema(schema, schemaPath, issues);
    if (schema.$id !== `https://single-image-studio.invalid/research/slice-10/${schemaPath}`) {
      issues.push(issue("SCHEMA_ID_INVALID", "schema namespace mismatch", schemaPath));
    }
  }
  let expectedBuild = null;
  if (regenerate || recheckRuntime) {
    try {
      expectedBuild = await buildSlice10DefinitionPreview({ frozenAt: index.frozenAt, readmeBytes });
      const expected = new Map(expectedBuild.fileMap);
      expected.set("README.md", Buffer.from(readmeBytes));
      compareFileMaps(actual, expected, issues);
    } catch (error) {
      issues.push(issue("REGENERATION_FAILED", error.message));
    }
  }
  if (index.definitionState !== "preview-not-frozen-central-validator-not-created" || index.resultsState !== "not-created"
    || index.formalHoldoutState !== "not-created" || index.counts?.sources !== 96 || index.counts?.plannedAttempts !== 288
    || index.counts?.copiedImageBytes !== 0 || index.schemaPaths?.length !== 22 || !index.runnerRef) {
    issues.push(issue("DEFINITION_SEMANTICS_INVALID", "preview denominator or zero-result boundary is invalid"));
  }
  if (canonicalBytesSlice10(index).length !== indexBytes.length || index.contentHash !== expectedBuild?.index?.contentHash) {
    issues.push(issue("DEFINITION_INDEX_HASH_INVALID", "definition index hash differs from regeneration"));
  }
  if (requirePins) issues.push(issue("FINAL_PINS_NOT_FROZEN", "preview validator cannot authorize execution before final pins"));
  const definitionRef = issues.length === 0 ? recordRef(indexBytes, index) : null;
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    definitionRef,
    postRun: null,
    counts: Object.freeze({ files: actual.size, schemas: index.schemaPaths?.length ?? 0, sources: index.counts?.sources ?? 0, results: 0 }),
    descendantTreeSha256: expectedBuild ? digestSlice10Files(new Map([...expectedBuild.fileMap].filter(([entry]) => entry !== SLICE10_PREVIEW_PATHS.definition))) : null,
    runtimeRechecked: Boolean(recheckRuntime && expectedBuild),
    regenerationVerified: Boolean(regenerate && expectedBuild && issues.length === 0),
    pinsVerified: false,
  });
}

async function main() {
  const report = await validateSlice10Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
