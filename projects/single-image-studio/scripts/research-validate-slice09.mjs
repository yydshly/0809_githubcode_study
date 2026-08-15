import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SLICE09_DEFINITION_PATHS,
  buildSlice09Definition,
  digestSlice09Files,
} from "./research-generate-slice09.mjs";
import { validateSlice09OperationTree } from "./research-gateb-runner-slice09.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-09");

// Filled only after the canonical results-zero tree is materialized.
export const SLICE09_FROZEN_PINS = Object.freeze({
  frozenAt: "2026-08-15T15:17:03.776Z",
  definitionIndexContentHash: "57de0c3d91d1945af61e052d8efda35dbe4dbb19714149e21dd17f949d8a00dd",
  definitionIndexFileSha256: "1303bdeca50a69918b58444efd0a540c20ee8eaf98c565b857fcae54112906c0",
  descendantTreeSha256: "6523a3f9618bf18f669561a4789f4b23162d848402bc465ce94e1a783d7c597c",
  schemaTreeSha256: "1809f69199c9308c2799d8755892ed64e4fa60948827d516a5ab87b020cc83bf",
  fullTreeSha256: "a1c06dc040987b74ff457ec7e4670bfe5a081f6f99f50a4a695b3a8fb65bc6b1",
  readmeSha256: "8c3a306cd090e4c117ad3ab77878575eb663358e609a31a1dd201ac75fbf7f48",
  generatorSha256: "3e1ac2c7cfe34c053281394b4451a6d594d1dd43f73a4943231889b7f62c75c9",
});

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function issue(issues, code, location, message) { issues.push({ code, location, message }); }
function binaryCompare(left, right) { return Buffer.from(left).compare(Buffer.from(right)); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

async function enumerateTree(root, relative = "") {
  const absolute = relative ? path.join(root, ...relative.split("/")) : root;
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) throw Object.assign(new Error(`symbolic link is forbidden: ${relative}`), { code: "S09_TREE_LINK_FORBIDDEN" });
  if (!stat.isDirectory()) throw Object.assign(new Error(`tree root is not a directory: ${relative}`), { code: "S09_TREE_INVALID" });
  const files = new Map();
  const directories = [];
  for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) => binaryCompare(a.name, b.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    const childStat = await lstat(path.join(root, ...child.split("/")));
    if (childStat.isSymbolicLink()) throw Object.assign(new Error(`symbolic link is forbidden: ${child}`), { code: "S09_TREE_LINK_FORBIDDEN" });
    if (childStat.isDirectory()) {
      directories.push(child);
      const nested = await enumerateTree(root, child);
      directories.push(...nested.directories);
      for (const [key, value] of nested.files) files.set(key, value);
    } else if (childStat.isFile()) files.set(child, await readFile(path.join(root, ...child.split("/"))));
    else throw Object.assign(new Error(`special filesystem entry is forbidden: ${child}`), { code: "S09_TREE_INVALID" });
  }
  return { files, directories };
}

function digestSubset(files, predicate = () => true) {
  return digestSlice09Files(new Map([...files].filter(([relativePath]) => predicate(relativePath))));
}

function directoriesForPaths(paths) {
  const result = new Set();
  for (const relativePath of paths) {
    const parts = relativePath.split("/");
    for (let index = 1; index < parts.length; index += 1) result.add(parts.slice(0, index).join("/"));
  }
  return [...result].sort(binaryCompare);
}

function recordRef(relativePath, record, bytes) {
  return Object.freeze({
    path: relativePath, id: record.id, contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256(bytes),
  });
}

function validatePins(report, issues) {
  const pairs = {
    frozenAt: report.frozenAt,
    definitionIndexContentHash: report.definitionIndexContentHash,
    definitionIndexFileSha256: report.definitionIndexFileSha256,
    descendantTreeSha256: report.descendantTreeSha256,
    schemaTreeSha256: report.schemaTreeSha256,
    fullTreeSha256: report.fullTreeSha256,
    readmeSha256: report.readmeSha256,
    generatorSha256: report.generatorSha256,
  };
  for (const [key, actual] of Object.entries(pairs)) {
    if (SLICE09_FROZEN_PINS[key] === null) issue(issues, "S09_PIN_NOT_FROZEN", key, "canonical literal pin is not frozen");
    else if (SLICE09_FROZEN_PINS[key] !== actual) issue(issues, "S09_PIN_MISMATCH", key, `expected ${SLICE09_FROZEN_PINS[key]}, got ${actual}`);
  }
}

async function validatePostRun(definitionRoot, tree, issues) {
  const resultsFiles = [...tree.files].filter(([relativePath]) => relativePath.startsWith("results/"));
  const resultsDirectories = tree.directories.filter((relativePath) => relativePath === "results" || relativePath.startsWith("results/"));
  if (resultsFiles.length === 0 && resultsDirectories.length === 0) return null;
  if (resultsDirectories.some((relativePath) => relativePath !== "results"
      && relativePath !== "results/open-smoke"
      && relativePath !== "results/open-smoke/normalize"
      && relativePath !== "results/open-smoke/export"
      && !relativePath.startsWith("results/open-smoke/normalize/")
      && !relativePath.startsWith("results/open-smoke/export/"))
    || resultsFiles.some(([relativePath]) => !relativePath.startsWith("results/open-smoke/normalize/")
      && !relativePath.startsWith("results/open-smoke/export/"))) {
    issue(issues, "S09_RESULT_ROOT_UNREGISTERED", "results", "only the registered open-smoke operation roots are allowed");
    return { valid: false, operations: {} };
  }
  const operations = {};
  for (const operation of ["normalize", "export"]) {
    const root = path.join(definitionRoot, "results", "open-smoke", operation);
    let exists = true;
    try { await lstat(root); } catch (error) { if (error?.code === "ENOENT") exists = false; else throw error; }
    if (!exists) continue;
    try { operations[operation] = await validateSlice09OperationTree(root); } catch (error) {
      issue(issues, error?.code ?? "S09_POST_RUN_INVALID", `results/open-smoke/${operation}`, error?.message ?? String(error));
    }
  }
  if (!operations.normalize && !issues.some((entry) => entry.location === "results/open-smoke/normalize")) {
    issue(issues, "S09_POST_RUN_INVALID", "results/open-smoke", "normalize must be the first registered operation");
  }
  if (operations.normalize?.decision?.state === "pass" && !operations.export) {
    issue(issues, "S09_POST_RUN_INVALID", "results/open-smoke", "export is required after normalize pass");
  }
  if (operations.normalize?.decision?.state !== "pass" && operations.export) {
    issue(issues, "S09_POST_RUN_INVALID", "results/open-smoke/export", "global stop forbids export after normalize non-pass");
  }
  return { valid: !issues.some((entry) => entry.location.startsWith("results")), operations };
}

export async function validateSlice09Definition({
  definitionRoot = DEFAULT_ROOT,
  requirePins = true,
  recheckRuntime = true,
  regenerate = true,
} = {}) {
  const issues = [];
  let tree;
  try { tree = await enumerateTree(definitionRoot); } catch (error) {
    issue(issues, error?.code ?? "S09_TREE_INVALID", ".", error?.message ?? String(error));
    return { valid: false, issues, definitionRef: null, postRun: null };
  }
  const indexBytes = tree.files.get(SLICE09_DEFINITION_PATHS.definition);
  const readmeBytes = tree.files.get("README.md");
  if (!indexBytes || !readmeBytes) {
    issue(issues, "S09_DEFINITION_FILE_MISSING", ".", "definition index and README are required");
    return { valid: false, issues, definitionRef: null, postRun: null };
  }
  let index;
  try { index = JSON.parse(indexBytes); } catch (error) {
    issue(issues, "S09_DEFINITION_INDEX_INVALID", SLICE09_DEFINITION_PATHS.definition, error.message);
    return { valid: false, issues, definitionRef: null, postRun: null };
  }
  let expected;
  try { expected = await buildSlice09Definition({ frozenAt: index.frozenAt, readmeBytes }); } catch (error) {
    issue(issues, "S09_REGENERATION_FAILED", ".", error?.message ?? String(error));
    return { valid: false, issues, definitionRef: null, postRun: null };
  }
  const definitionFiles = new Map([...tree.files].filter(([relativePath]) => !relativePath.startsWith("results/")));
  const expectedFiles = new Map(expected.fileMap);
  expectedFiles.set("README.md", readmeBytes);
  const actualPaths = [...definitionFiles.keys()].sort(binaryCompare);
  const expectedPaths = [...expectedFiles.keys()].sort(binaryCompare);
  if (!same(actualPaths, expectedPaths)) issue(issues, "S09_FILE_SET_MISMATCH", ".", "definition file allowlist differs from deterministic regeneration");
  const actualDirectories = tree.directories.filter((relativePath) => relativePath !== "results" && !relativePath.startsWith("results/"));
  const expectedDirectories = directoriesForPaths(expectedPaths);
  if (!same(actualDirectories.sort(binaryCompare), expectedDirectories)) {
    issue(issues, "S09_DIRECTORY_SET_MISMATCH", ".", "definition directory allowlist differs from deterministic regeneration");
  }
  for (const relativePath of new Set([...actualPaths, ...expectedPaths])) {
    const actual = definitionFiles.get(relativePath);
    const wanted = expectedFiles.get(relativePath);
    if (!actual || !wanted || !actual.equals(wanted)) issue(issues, "S09_FILE_BYTES_MISMATCH", relativePath, "file differs from deterministic regeneration");
  }
  const descendantFiles = new Map([...definitionFiles].filter(([relativePath]) => relativePath !== "README.md" && relativePath !== SLICE09_DEFINITION_PATHS.definition));
  const schemaFiles = new Map([...definitionFiles].filter(([relativePath]) => relativePath.startsWith("schemas/")));
  const report = {
    frozenAt: index.frozenAt,
    definitionIndexContentHash: index.contentHash,
    definitionIndexFileSha256: sha256(indexBytes),
    descendantTreeSha256: digestSubset(descendantFiles),
    schemaTreeSha256: digestSubset(schemaFiles),
    fullTreeSha256: digestSubset(definitionFiles),
    readmeSha256: sha256(readmeBytes),
    generatorSha256: index.generatorSha256,
  };
  if (index.descendantFileCount !== descendantFiles.size || index.descendantTreeSha256 !== report.descendantTreeSha256
    || index.readmeSha256 !== report.readmeSha256 || index.resultsState !== "not-created" || index.copiedImageBytes !== 0
    || index.resultProtocol?.plannedSources !== 12 || index.resultProtocol?.plannedAttempts !== 36
    || index.resultProtocol?.replacements !== 0 || index.resultProtocol?.globalStopOnFirstNonPass !== true
    || index.resultProtocol?.resultsRoot !== "results/open-smoke"
    || index.goldIdentityRefs?.length !== 6 || index.schemaPaths?.length !== 18
    || index.evidenceBoundary?.productSupport !== false || index.evidenceBoundary?.C1 !== 0) {
    issue(issues, "S09_INDEX_SEMANTICS_INVALID", SLICE09_DEFINITION_PATHS.definition, "definition index counts or evidence boundary differ");
  }
  const candidateBytes = definitionFiles.get(index.candidateRef?.path);
  if (!candidateBytes || candidateBytes.length !== index.candidateRef.byteLength || sha256(candidateBytes) !== index.candidateRef.fileSha256) {
    issue(issues, "S09_REFERENCE_INVALID", "candidateRef", "candidate reference differs from actual bytes");
  } else {
    const candidate = JSON.parse(candidateBytes);
    if (candidate.contentHash !== index.candidateRef.contentHash
      || !Array.isArray(candidate.implementationRefs)
      || candidate.implementationRefs.some((entry) => entry.id === "VALIDATOR-SLICE09-DEFINITION@0.9.0")) {
      issue(issues, "S09_REFERENCE_INVALID", "candidateRef", "candidate content or validator self-pin is invalid");
    }
  }
  const postRun = await validatePostRun(definitionRoot, tree, issues);
  if (requirePins) validatePins(report, issues);
  let regenerationVerified = false;
  if (regenerate) {
    const twin = await buildSlice09Definition({ frozenAt: index.frozenAt, readmeBytes });
    regenerationVerified = expected.fileMap.size === twin.fileMap.size
      && [...expected.fileMap].every(([relativePath, bytes]) => bytes.equals(twin.fileMap.get(relativePath)));
    if (!regenerationVerified) issue(issues, "S09_REGENERATION_NONDETERMINISTIC", ".", "two fresh builds differ");
  }
  const definitionRef = recordRef(SLICE09_DEFINITION_PATHS.definition, index, indexBytes);
  return {
    valid: issues.length === 0,
    issues,
    counts: {
      schemas: schemaFiles.size,
      descendants: descendantFiles.size,
      definitionFiles: definitionFiles.size,
      goldIdentities: index.goldIdentityRefs?.length ?? 0,
      sources: index.resultProtocol?.plannedSources ?? 0,
      plannedAttempts: index.resultProtocol?.plannedAttempts ?? 0,
      copiedImageBytes: index.copiedImageBytes,
      generatedResults: [...tree.files.keys()].filter((relativePath) => relativePath.startsWith("results/")).length,
    },
    ...report,
    pinsVerified: requirePins && !issues.some((entry) => entry.code.startsWith("S09_PIN_")),
    runtimeRechecked: Boolean(recheckRuntime),
    regenerationVerified,
    definitionRef,
    postRun,
  };
}

async function main() {
  const report = await validateSlice09Definition();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
