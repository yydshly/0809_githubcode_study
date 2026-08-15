import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SLICE11_DEFINITION_PATH, SLICE11_DEFINITION_SCHEMA_DOCUMENTS, buildSlice11DefinitionPreview,
  canonicalBytesSlice11Definition, digestSlice11Files, sha256Slice11Definition,
} from "./research-generate-slice11.mjs";
import {
  validateSlice11CalibrationClaim, validateSlice11ApplicableClosure, validateSlice11RuntimeObservation,
  validateSlice11TerminalClosure,
} from "./research-calibration-durable-slice11.mjs";
import { validateSlice11CalibrationRequest, validateSlice11CalibrationSummary, validateSlice11RecordRef } from "./research-calibration-protocol-slice11.mjs";
import { validateSlice11DurableLedger, validateSlice11OperationClaim, validateSlice11OperationClose } from "./research-calibration-operation-slice11.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-11");
const FINAL_PINS = Object.freeze({
  frozenAt: "2026-08-15T23:01:50.529Z",
  indexContentHash: "10676a4490d7019e56a65d683e2b29fd5ddc78bae155f54683d5e99ba2c33bba",
  indexFileSha256: "04d2f89975b2bcc2aca68c53379f4a6dbd9b6568244e72dfa114472664708266",
  descendantTreeSha256: "e5a9e69987eac7d178b58274e50606eacfe2a3e12ad1bf111ff9ccb1a4ae9b55",
  schemaTreeSha256: "631c4113c2bbd506477258e9bdce95363cd845ff2ed2166b96cc342de493d24f",
  fullTreeSha256: "d33d254a78eec2a96b2abdb98891fd94279359b4a7e7bf0bb6d0505779a2e90c",
  readmeSha256: "8c7e1197e19462c4db4ee2c7e7dafebf10e7a2127d3e511fc6128736749f6d25",
  generatorSha256: "7a622b4bc63e454463cac5dc24911b25b1152abb7252535515b6312085eb0b41",
});
const KEYWORDS = new Set(["$id", "$schema", "additionalProperties", "const", "enum", "format", "items", "maxItems", "maxLength", "maximum", "minItems", "minLength", "minimum", "oneOf", "pattern", "properties", "required", "type"]);
function issue(code, message, relativePath = null) { return Object.freeze({ code, message, path: relativePath }); }
function sha(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function inspectSchema(node, location, issues) {
  if (Array.isArray(node)) { node.forEach((entry, index) => inspectSchema(entry, `${location}[${index}]`, issues)); return; }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (!KEYWORDS.has(key)) issues.push(issue("SCHEMA_KEYWORD_UNSUPPORTED", `${location}: ${key}`, location));
    if (key === "properties") Object.entries(value).forEach(([name, child]) => inspectSchema(child, `${location}.properties.${name}`, issues));
    else if (["items", "oneOf"].includes(key)) inspectSchema(value, `${location}.${key}`, issues);
  }
  if (node.type === "object" && (node.additionalProperties !== false || !node.properties || !Array.isArray(node.required)
    || Object.keys(node.properties).sort().join("\0") !== [...node.required].sort().join("\0"))) issues.push(issue("SCHEMA_OBJECT_OPEN", `${location}: object must be closed and fully required`, location));
  if (node.type === "array" && !node.items) issues.push(issue("SCHEMA_ARRAY_OPEN", `${location}: array items missing`, location));
}
async function tree(root) {
  const files = new Map(); const dirs = new Set();
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw Object.assign(new Error(`link forbidden: ${relative}`), { code: "TREE_LINK_FORBIDDEN" });
      if (entry.isDirectory()) { dirs.add(relative); await walk(path.join(directory, entry.name), relative); }
      else if (entry.isFile()) files.set(relative, await readFile(path.join(directory, entry.name)));
      else throw Object.assign(new Error(`special entry forbidden: ${relative}`), { code: "TREE_ENTRY_FORBIDDEN" });
    }
  }
  await walk(root); return { files, dirs };
}
function expectedDirs(files) {
  const dirs = new Set();
  for (const name of files.keys()) { const parts = name.split("/"); for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join("/")); }
  return dirs;
}
function compareMap(actual, expected, issues) {
  for (const [name, bytes] of expected) {
    if (!actual.has(name)) issues.push(issue("DEFINITION_FILE_MISSING", "expected definition file missing", name));
    else if (!actual.get(name).equals(bytes)) issues.push(issue("DEFINITION_FILE_DRIFT", "definition bytes differ from deterministic regeneration", name));
  }
  for (const name of actual.keys()) if (!expected.has(name)) issues.push(issue("DEFINITION_FILE_EXTRA", "unregistered definition file", name));
}
function contentRef(record, idKey) { return { id: record[idKey], contentHash: record.contentHash }; }
async function readJson(filePath) { return JSON.parse(await readFile(filePath, "utf8")); }

async function validateStartupRuntimeFailure(operationRoot, operation) {
  const operationTree = await tree(operationRoot);
  const allowedFiles = new Set(["operation-claim.json", "runtime/start.json"]);
  const allowedDirs = new Set(["runtime"]);
  if (operationTree.files.size !== allowedFiles.size || [...operationTree.files.keys()].some((name) => !allowedFiles.has(name))
    || operationTree.dirs.size !== allowedDirs.size || [...operationTree.dirs].some((name) => !allowedDirs.has(name))) {
    return null;
  }
  const claim = await readJson(path.join(operationRoot, "operation-claim.json"));
  const runtimeStart = await readJson(path.join(operationRoot, "runtime", "start.json"));
  validateSlice11OperationClaim(claim);
  validateSlice11RuntimeObservation(runtimeStart);
  if (claim.operation !== operation || runtimeStart.phase !== "start" || runtimeStart.matchesFrozen !== false
    || runtimeStart.observationId !== `runtime-observation.s11.${operation}.start`
    || JSON.stringify(claim.runtimeBindingRef) !== JSON.stringify(runtimeStart.runtimeBindingRef)) {
    throw new Error("startup runtime failure identity/state binding invalid");
  }
  return Object.freeze({
    operation, status: "startup-runtime-drift", requestCount: 0, closureCount: 0, eventCount: 0,
    closeRef: null, runtimeStartRef: contentRef(runtimeStart, "observationId"),
  });
}

async function validateOperation(operationRoot, operation, issues) {
  try {
    const startupFailure = await validateStartupRuntimeFailure(operationRoot, operation);
    if (startupFailure !== null) return startupFailure;
    const operationTree = await tree(operationRoot);
    const allowedFiles = new Set(["operation-claim.json", "publication-ledger.ndjson", "runtime/start.json", "runtime/end-observation.json", "final/operation-close.json", "final/runtime-end.json"]);
    const claim = await readJson(path.join(operationRoot, "operation-claim.json"));
    const runtimeStart = await readJson(path.join(operationRoot, "runtime", "start.json"));
    const runtimeEnd = await readJson(path.join(operationRoot, "runtime", "end-observation.json"));
    const close = await readJson(path.join(operationRoot, "final", "operation-close.json"));
    const finalRuntime = await readJson(path.join(operationRoot, "final", "runtime-end.json"));
    if (JSON.stringify(runtimeEnd) !== JSON.stringify(finalRuntime)) throw new Error("final runtime copy differs from durable observation");
    validateSlice11OperationClaim(claim);
    const requestNames = (await readdir(path.join(operationRoot, "requests"))).sort();
    const claimNames = (await readdir(path.join(operationRoot, "claims"))).sort();
    const closureNames = (await readdir(path.join(operationRoot, "closures"))).sort();
    if (requestNames.join("\0") !== claimNames.join("\0") || requestNames.map((name) => name.slice(0, -5)).join("\0") !== closureNames.join("\0")) throw new Error("request/claim/closure denominator mismatch");
    const publications = [];
    const terminalRefs = [];
    for (const name of requestNames) {
      const request = await readJson(path.join(operationRoot, "requests", name));
      const durableClaim = await readJson(path.join(operationRoot, "claims", name));
      validateSlice11CalibrationRequest(request);
      validateSlice11CalibrationClaim(durableClaim, { request });
      if (request.operation !== operation || durableClaim.requestRef.id !== request.requestId) throw new Error("operation request binding drift");
      const closure = path.join(operationRoot, "closures", request.requestId);
      const terminal = await readJson(path.join(closure, "terminal.json"));
      const names = await readdir(closure);
      const closurePrefix = `closures/${request.requestId}/`;
      for (const closureName of names) allowedFiles.add(`${closurePrefix}${closureName}`);
      const projection = names.includes("expected-projection.json") ? await readJson(path.join(closure, "expected-projection.json")) : null;
      const lifecycle = names.includes("worker-lifecycle.json") ? await readJson(path.join(closure, "worker-lifecycle.json")) : null;
      const validated = names.includes("output.png")
        ? await validateSlice11ApplicableClosure({ operationRoot, request, projection, lifecycle, terminal })
        : await validateSlice11TerminalClosure({ operationRoot, request, projection, lifecycle, terminal });
      publications.push(validated.publication);
      terminalRefs.push(`${terminal.terminalId}:${terminal.contentHash}`);
    }
    const ledgerBytes = await readFile(path.join(operationRoot, "publication-ledger.ndjson"));
    const lines = ledgerBytes.toString("utf8").trim().split("\n");
    const events = lines.filter(Boolean).map(JSON.parse);
    validateSlice11DurableLedger(events);
    const actualPublications = new Set(publications.map((entry) => `${entry.publicationId}:${entry.contentHash}`));
    const eventPublications = new Set(events.map((entry) => `${entry.publicationRef.id}:${entry.publicationRef.contentHash}`));
    if (actualPublications.size !== eventPublications.size || [...actualPublications].some((entry) => !eventPublications.has(entry))) throw new Error("event ledger does not bind the actual closure set");
    let summary = null;
    try { summary = await readJson(path.join(operationRoot, "final", "summary.json")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    if (summary !== null) {
      allowedFiles.add("final/summary.json");
      validateSlice11CalibrationSummary(summary);
      const summaryRefs = new Set(summary.caseResults.flatMap((entry) => entry.terminalRefs.map((ref) => `${ref.id}:${ref.contentHash}`)));
      if (summaryRefs.size !== terminalRefs.length || terminalRefs.some((entry) => !summaryRefs.has(entry))) throw new Error("summary terminal set differs from durable closures");
    }
    validateSlice11OperationClose(close, { claim, runtimeStart, runtimeEnd, summary, ledgerBytes, events });
    if (close.operation !== operation || close.requestCount !== requestNames.length || close.closureCount !== closureNames.length) throw new Error("operation close counters drifted");
    for (const name of requestNames) { allowedFiles.add(`requests/${name}`); allowedFiles.add(`claims/${name}`); }
    if (operationTree.files.size !== allowedFiles.size || [...operationTree.files.keys()].some((name) => !allowedFiles.has(name))) throw new Error("operation tree contains an unregistered or missing file");
    const allowedDirs = expectedDirs(new Map([...allowedFiles].map((name) => [name, Buffer.alloc(0)])));
    if (operationTree.dirs.size !== allowedDirs.size || [...operationTree.dirs].some((name) => !allowedDirs.has(name))) throw new Error("operation tree contains an unregistered or missing directory");
    return Object.freeze({ operation, status: close.status, requestCount: requestNames.length, closureCount: closureNames.length, eventCount: events.length, closeRef: contentRef(close, "operation") });
  } catch (error) {
    issues.push(issue("POSTRUN_OPERATION_INVALID", error.message, `results/open-calibration/${operation}`));
    return null;
  }
}

export async function validateSlice11Definition({ definitionRoot = DEFAULT_ROOT, requirePins = true, recheckRuntime = true, regenerate = true } = {}) {
  const issues = [];
  let actual;
  try { actual = await tree(definitionRoot); } catch (error) { return Object.freeze({ valid: false, issues: [issue(error.code ?? "TREE_READ_FAILED", error.message)], definitionRef: null, postRun: null }); }
  const definitionFiles = new Map(); const resultFiles = new Map();
  for (const [name, bytes] of actual.files) (name.startsWith("results/") ? resultFiles : definitionFiles).set(name, bytes);
  const indexBytes = definitionFiles.get(SLICE11_DEFINITION_PATH); const readmeBytes = definitionFiles.get("README.md");
  if (!indexBytes || !readmeBytes) return Object.freeze({ valid: false, issues: [issue("DEFINITION_ROOT_INCOMPLETE", "index and README required")], definitionRef: null, postRun: null });
  let index;
  try { index = JSON.parse(indexBytes); } catch { return Object.freeze({ valid: false, issues: [issue("DEFINITION_INDEX_INVALID", "index is not JSON")], definitionRef: null, postRun: null }); }
  for (const [name, schema] of Object.entries(SLICE11_DEFINITION_SCHEMA_DOCUMENTS)) {
    inspectSchema(schema, name, issues);
    if (schema.$id !== `https://single-image-studio.invalid/research/slice-11/${name}`) issues.push(issue("SCHEMA_ID_INVALID", "schema namespace mismatch", name));
  }
  let expectedBuild = null;
  if (regenerate) {
    try {
      expectedBuild = await buildSlice11DefinitionPreview({ frozenAt: index.frozenAt, readmeBytes });
      const expected = new Map(expectedBuild.fileMap); expected.set("README.md", readmeBytes);
      compareMap(definitionFiles, expected, issues);
      const actualDefinitionDirs = new Set([...actual.dirs].filter((entry) => entry !== "results" && !entry.startsWith("results/")));
      const expectedDefinitionDirs = expectedDirs(expected);
      if ([...actualDefinitionDirs].some((entry) => !expectedDefinitionDirs.has(entry)) || [...expectedDefinitionDirs].some((entry) => !actualDefinitionDirs.has(entry))) issues.push(issue("DEFINITION_DIRECTORY_SET_INVALID", "definition directory set differs from regeneration"));
    } catch (error) { issues.push(issue("DEFINITION_REGENERATION_FAILED", error.message)); }
  }
  if (index.id !== "DEFINITION-INDEX-SLICE11@0.11.0" || index.definitionState !== "definition-frozen-results-zero" || index.resultsState !== "not-created"
    || index.counts?.sources !== 96 || index.counts?.plannedAttempts !== 288 || index.schemaPaths?.length !== 23 || index.evidenceBoundary?.c1 !== 0) issues.push(issue("DEFINITION_SEMANTICS_INVALID", "results-zero denominator or evidence boundary invalid"));
  const draft = { ...index }; delete draft.contentHash;
  if (sha256Slice11Definition(canonicalBytesSlice11Definition(draft)) !== index.contentHash) issues.push(issue("DEFINITION_INDEX_HASH_INVALID", "index self hash invalid"));
  for (const ref of [index.candidateRef, index.runtimeRef, index.lineageRef, ...index.contractRefs, ...index.planRefs, ...index.manifestRefs, ...index.sourceRefs, ...index.goldIdentityRefs]) {
    try { validateSlice11RecordRef(ref, "S11_DEFINITION_REF_INVALID", "definitionRef"); } catch (error) { issues.push(issue("DEFINITION_REF_INVALID", error.message)); break; }
    const bytes = definitionFiles.get(ref.path); if (!bytes || bytes.length !== ref.byteLength || sha(bytes) !== ref.fileSha256) { issues.push(issue("DEFINITION_REF_DRIFT", "referenced file identity mismatch", ref.path)); break; }
  }
  const descendant = new Map([...definitionFiles].filter(([name]) => name !== "README.md" && name !== SLICE11_DEFINITION_PATH));
  const schemas = new Map([...definitionFiles].filter(([name]) => name.startsWith("schemas/")));
  const observedPins = { frozenAt: index.frozenAt, indexContentHash: index.contentHash, indexFileSha256: sha(indexBytes), descendantTreeSha256: digestSlice11Files(descendant), schemaTreeSha256: digestSlice11Files(schemas), fullTreeSha256: digestSlice11Files(definitionFiles), readmeSha256: sha(readmeBytes), generatorSha256: index.generatorSha256 };
  const pinsVerified = Object.entries(FINAL_PINS).every(([key, value]) => value !== null && observedPins[key] === value);
  if (requirePins && !pinsVerified) issues.push(issue("FINAL_PINS_MISMATCH", "literal canonical definition pins differ"));
  let postRun = null;
  if (resultFiles.size > 0) {
    const operationReports = [];
    for (const operation of ["normalize", "export"]) {
      try { await readdir(path.join(definitionRoot, "results", "open-calibration", operation)); operationReports.push(await validateOperation(path.join(definitionRoot, "results", "open-calibration", operation), operation, issues)); }
      catch (error) { if (error?.code !== "ENOENT") issues.push(issue("POSTRUN_TREE_INVALID", error.message)); }
    }
    if (operationReports.length === 0) issues.push(issue("POSTRUN_TREE_INVALID", "registered results contain no operation root"));
    const closedReports = operationReports.filter(Boolean);
    if (closedReports[0]?.operation === "export" || (closedReports.length === 2 && closedReports[0]?.operation !== "normalize")) issues.push(issue("POSTRUN_OPERATION_ORDER_INVALID", "export cannot exist without a closed normalize operation"));
    if (closedReports.length === 2 && !["calibration-complete-pass", "calibration-complete-non-pass"].includes(closedReports[0].status)) issues.push(issue("POSTRUN_GLOBAL_STOP_INVALID", "export exists after a globally stopping normalize close"));
    postRun = Object.freeze({ operations: Object.freeze(operationReports.filter(Boolean)), resultFileCount: resultFiles.size });
  }
  const definitionRef = issues.length === 0 ? Object.freeze({ path: SLICE11_DEFINITION_PATH, id: index.id, contentHash: index.contentHash, byteLength: indexBytes.length, fileSha256: sha(indexBytes) }) : null;
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues), definitionRef, counts: Object.freeze({ files: definitionFiles.size, schemas: schemas.size, sources: index.counts?.sources ?? 0, results: resultFiles.size }), pinsVerified, runtimeRechecked: Boolean(recheckRuntime && expectedBuild && issues.length === 0), regenerationVerified: Boolean(regenerate && expectedBuild && issues.length === 0), observedPins: Object.freeze(observedPins), postRun });
}

async function main() { const report = await validateSlice11Definition(); process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (!report.valid) process.exitCode = 1; }
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
