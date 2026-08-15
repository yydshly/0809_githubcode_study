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
import { validateSlice10PostRun } from "./research-validate-results-slice10.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-10");
const README_SHA256 = "f90a6c77f305bcb23cbf3f5eda1fd61c8acea089965c08e270d1308a6d4a5041";
const FINAL_PINS = Object.freeze({
  frozenAt: "2026-08-15T18:03:39.680Z",
  generatorSha256: "b6ad42bd7659e369c1906e5c17e71a081ee8768f134ab5bc831604d8c24360d1",
  indexContentHash: "1b0ecac1b1d8b2320fc95fd92f53bf4ebdae79e7879be910d0c232cfeb56bcbc",
  indexFileSha256: "c2b7ae163a1cd68656e16d97b00cacd295182b80ed1ae9021d9dc28b414b13c3",
  descendantTreeSha256: "dc1cea563e069a645039c7f22b54eb34de298db45d3047703fdef333e1c80e8a",
  schemaTreeSha256: "ee7415e36739dea08b128c590741d40c9340a3e24cef72856a2912238923e24c",
  fullTreeSha256: "0250a743487d681e4282909a21804e142901e536dfc8a8ebee31a17f66cdd532",
});
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
  const directories = new Set();
  const walk = async (directory, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink()) throw Object.assign(new Error(`link forbidden: ${relativePath}`), { code: "TREE_LINK_FORBIDDEN" });
      if (entry.isDirectory()) { directories.add(relativePath); await walk(absolutePath, relativePath); }
      else if (entry.isFile()) files.set(relativePath, await readFile(absolutePath));
      else throw Object.assign(new Error(`special file forbidden: ${relativePath}`), { code: "TREE_SPECIAL_FILE_FORBIDDEN" });
    }
  };
  const resolved = path.resolve(root);
  if (path.resolve(await realpath(resolved)).toLowerCase() !== resolved.toLowerCase()) {
    throw Object.assign(new Error("definition root cannot be a link or junction"), { code: "TREE_LINK_FORBIDDEN" });
  }
  await walk(resolved);
  Object.defineProperty(files, "directories", { value: directories, enumerable: false });
  return files;
}

function directoriesForFiles(files) {
  const result = new Set();
  for (const relativePath of files.keys()) {
    const parts = relativePath.split("/");
    for (let index = 1; index < parts.length; index += 1) result.add(parts.slice(0, index).join("/"));
  }
  return result;
}

function compareDirectories(actual, expected, issues) {
  for (const relativePath of actual) if (!expected.has(relativePath)) issues.push(issue("TREE_EXTRA_DIRECTORY", "unregistered directory", relativePath));
  for (const relativePath of expected) if (!actual.has(relativePath)) issues.push(issue("TREE_DIRECTORY_MISSING", "registered directory missing", relativePath));
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
  const resultPrefix = "results/open-calibration/";
  const resultFiles = new Map();
  const definitionFiles = new Map();
  const resultDirectories = new Set();
  const definitionDirectories = new Set();
  for (const [relativePath, bytes] of actual) {
    if (relativePath.startsWith(resultPrefix)) resultFiles.set(relativePath.slice(resultPrefix.length), bytes);
    else if (relativePath === "results" || relativePath.startsWith("results/")) {
      issues.push(issue("RESULTS_PATH_UNREGISTERED", "only results/open-calibration is registered", relativePath));
    } else definitionFiles.set(relativePath, bytes);
  }
  for (const relativePath of actual.directories ?? []) {
    if (relativePath === "results" || relativePath === "results/open-calibration") continue;
    if (relativePath.startsWith(resultPrefix)) resultDirectories.add(relativePath.slice(resultPrefix.length));
    else if (relativePath.startsWith("results/")) issues.push(issue("RESULTS_PATH_UNREGISTERED", "only results/open-calibration is registered", relativePath));
    else definitionDirectories.add(relativePath);
  }
  const hasResultsDirectory = (actual.directories ?? new Set()).has("results")
    || (actual.directories ?? new Set()).has("results/open-calibration");
  if (hasResultsDirectory && resultFiles.size === 0) {
    issues.push(issue("RESULTS_EMPTY_ROOT_FORBIDDEN", "a registered result root cannot be empty or partial-without-files", "results/open-calibration"));
  }
  const indexBytes = definitionFiles.get(SLICE10_PREVIEW_PATHS.definition);
  const readmeBytes = definitionFiles.get("README.md");
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
      compareFileMaps(definitionFiles, expected, issues);
      compareDirectories(definitionDirectories, directoriesForFiles(expected), issues);
    } catch (error) {
      issues.push(issue("REGENERATION_FAILED", error.message));
    }
  }
  if (index.definitionState !== "definition-frozen-results-zero" || index.id !== "DEFINITION-INDEX-SLICE10@0.10.0"
    || index.resultsState !== "not-created"
    || index.formalHoldoutState !== "not-created" || index.counts?.sources !== 96 || index.counts?.plannedAttempts !== 288
    || index.counts?.copiedImageBytes !== 0 || index.schemaPaths?.length !== 22 || !index.runnerRef) {
    issues.push(issue("DEFINITION_SEMANTICS_INVALID", "preview denominator or zero-result boundary is invalid"));
  }
  const indexDraft = structuredClone(index);
  delete indexDraft.contentHash;
  const directIndexContentHash = sha256Slice10Definition(canonicalBytesSlice10(indexDraft));
  if (!indexBytes.equals(canonicalBytesSlice10(index)) || index.contentHash !== directIndexContentHash
    || (expectedBuild !== null && index.contentHash !== expectedBuild.index.contentHash)) {
    issues.push(issue("DEFINITION_INDEX_HASH_INVALID", "definition index hash differs from regeneration"));
  }
  const schemaFiles = new Map([...definitionFiles].filter(([entry]) => entry.startsWith("schemas/")));
  const observedPins = {
    frozenAt: index.frozenAt,
    generatorSha256: index.generatorSha256,
    indexContentHash: index.contentHash,
    indexFileSha256: sha256(indexBytes),
    descendantTreeSha256: index.descendantTreeSha256,
    schemaTreeSha256: digestSlice10Files(schemaFiles),
    fullTreeSha256: digestSlice10Files(definitionFiles),
  };
  const pinsVerified = Object.entries(FINAL_PINS).every(([key, value]) => observedPins[key] === value);
  if (requirePins && !pinsVerified) issues.push(issue("FINAL_PINS_MISMATCH", "formal definition literal pins do not match"));
  const definitionIssueCount = issues.length;
  let postRun = null;
  if (resultFiles.size > 0 && expectedBuild) {
    let candidate = null;
    try { candidate = JSON.parse(definitionFiles.get(index.candidateRef.path)); } catch {
      issues.push(issue("POSTRUN_CANDIDATE_INVALID", "frozen candidate cannot be reopened"));
    }
    if (candidate) {
      try {
        postRun = await validateSlice10PostRun({ resultFiles, resultDirectories, definitionFiles, index, projectRoot: PROJECT_ROOT, candidate });
        issues.push(...postRun.issues);
      } catch (error) {
        issues.push(issue(error?.code ?? "POSTRUN_VALIDATION_FAILED", error.message));
      }
    }
  }
  const definitionRef = issues.length === 0 ? recordRef(indexBytes, index) : null;
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    definitionRef,
    postRun,
    counts: Object.freeze({ files: actual.size, schemas: index.schemaPaths?.length ?? 0, sources: index.counts?.sources ?? 0, results: resultFiles.size }),
    descendantTreeSha256: expectedBuild ? digestSlice10Files(new Map([...expectedBuild.fileMap].filter(([entry]) => entry !== SLICE10_PREVIEW_PATHS.definition))) : null,
    runtimeRechecked: Boolean(recheckRuntime && expectedBuild),
    regenerationVerified: Boolean(regenerate && expectedBuild && definitionIssueCount === 0),
    pinsVerified,
    frozenAt: index.frozenAt,
    indexContentHash: index.contentHash,
    indexFileSha256: sha256(indexBytes),
    schemaTreeSha256: observedPins.schemaTreeSha256,
    fullTreeSha256: observedPins.fullTreeSha256,
  });
}

async function main() {
  const report = await validateSlice10Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
