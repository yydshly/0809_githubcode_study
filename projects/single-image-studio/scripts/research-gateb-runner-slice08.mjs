import { createHash } from "node:crypto";
import { appendFile, lstat, mkdir, open, readFile, readdir, rename, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  Slice08CaseContextError,
  createSlice08CaseContext,
  validateSlice08CaseContext,
} from "./research-gateb-case-context-slice08.mjs";

export const SLICE08_GATEB_RUNNER_ID = "RUNNER-GATEB-OPEN-SMOKE@0.8.0";

const AXES = Object.freeze({
  C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0,
  productSupport: false, formal: false,
  releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});
const HEX = "^[a-f0-9]{64}$";
const ID = "^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: sha256(bytesOf(value)) }); }
function objectSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}
function schemaDocument(name, body) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://single-image-studio.invalid/research/slice-08/schemas/${name}`, ...body };
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const hex = { type: "string", pattern: HEX };
const stringId = { type: "string", pattern: ID };
const axesSchema = objectSchema({
  C1: { const: 0 }, U1: { const: 0 }, E1: { const: 0 }, R1: { const: 0 }, O1: { const: 0 }, G1: { const: 0 }, V1: { const: 0 },
  productSupport: { const: false }, formal: { const: false }, releaseAllowlist: { const: "none" }, releaseRegistered: { const: 0 }, releaseApproved: { const: 0 },
});

export const SLICE08_RUNNER_SCHEMA_DOCUMENTS = deepFreeze({
  "schemas/local-run-request.slice08.v0.schema.json": schemaDocument("local-run-request.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "local-run-request.slice08.v0" }, requestId: stringId, caseContext: { $ref: "gateb-case-context.slice08.v0.schema.json" },
    evidenceBoundary: axesSchema, contentHash: hex,
  })),
  "schemas/run-result.slice08.v0.schema.json": schemaDocument("run-result.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-result.slice08.v0" }, resultId: stringId, requestId: stringId, attemptId: stringId,
    operation: { enum: ["normalize", "export"] }, sourceId: stringId, repetition: { type: "integer", minimum: 1, maximum: 3 },
    disposition: { enum: ["applicable", "rejection"] }, status: { enum: ["pass", "non-pass"] },
    actualCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^(S08_[A-Z0-9_]+|ERR_[A-Z0-9_]+)$" }] },
    caseContextHash: hex, closureRef: { oneOf: [{ type: "null" }, stringId] }, fileSha256: { oneOf: [{ type: "null" }, hex] },
    decodedPixelSha256: { oneOf: [{ type: "null" }, hex] }, workerExitConfirmed: { type: "boolean" },
    evidenceBoundary: axesSchema, contentHash: hex,
  })),
  "schemas/run-event.slice08.v0.schema.json": schemaDocument("run-event.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-event.slice08.v0" }, sequence: { type: "integer", minimum: 1 },
    eventType: { enum: ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"] },
    attemptId: stringId, previousEventHash: { oneOf: [{ type: "null" }, hex] }, occurredAt: { type: "string" }, payloadSha256: hex, contentHash: hex,
  })),
  "schemas/artifact-closure.slice08.v0.schema.json": schemaDocument("artifact-closure.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "artifact-closure.slice08.v0" }, closureId: stringId, requestId: stringId, attemptId: stringId,
    operation: { enum: ["normalize", "export"] }, sourceId: stringId, repetition: { type: "integer", minimum: 1, maximum: 3 },
    classification: { enum: ["artifact-pass", "candidate-non-pass"] }, caseContextHash: hex,
    outputRelativePath: { type: "string", pattern: "^closures/[A-Za-z0-9._:@-]+/output\\.(png|bin)$" },
    outputByteLength: { type: "integer", minimum: 1, maximum: 1048576 }, outputFileSha256: hex, decodedPixelSha256: hex,
    oracleFactsSha256: { oneOf: [{ type: "null" }, hex] }, workerMessageSha256: hex, workerRuntimeSha256: hex,
    workerExitConfirmed: { const: true }, evidenceBoundary: axesSchema, contentHash: hex,
  })),
  "schemas/operation-summary.slice08.v0.schema.json": schemaDocument("operation-summary.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "operation-summary.slice08.v0" }, summaryId: stringId, operation: { enum: ["normalize", "export"] },
    plannedSources: { const: 6 }, plannedAttempts: { const: 18 }, terminalAttempts: { const: 18 },
    passAttempts: { type: "integer", minimum: 0, maximum: 18 }, nonPassAttempts: { type: "integer", minimum: 0, maximum: 18 },
    applicableArtifactPasses: { type: "integer", minimum: 0, maximum: 9 }, rejectionExactPasses: { type: "integer", minimum: 0, maximum: 9 },
    sourceThreeOfThreePasses: { type: "integer", minimum: 0, maximum: 6 }, deterministicSources: { type: "integer", minimum: 0, maximum: 6 },
    replacementCount: { const: 0 }, protocolFailureCount: { const: 0 }, evidenceBoundary: axesSchema, contentHash: hex,
  })),
  "schemas/gateb-decision.slice08.v0.schema.json": schemaDocument("gateb-decision.slice08.v0.schema.json", objectSchema({
    schemaVersion: { const: "gateb-decision.slice08.v0" }, decisionId: stringId, operation: { enum: ["normalize", "export"] },
    state: { enum: ["pass", "denied-closed-non-pass"] }, summaryRef: stringId, gateBPassed: { type: "boolean" },
    calibrationAuthorized: { const: false }, evidenceBoundary: axesSchema, contentHash: hex,
  })),
});
export const SLICE08_RUNNER_SCHEMA_PATHS = Object.freeze(Object.keys(SLICE08_RUNNER_SCHEMA_DOCUMENTS).sort());

function utc(now) {
  const value = now();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || new Date(value).toISOString() !== value) throw new Slice08CaseContextError("S08_CLOCK_INVALID", "clock must return canonical UTC milliseconds");
  return value;
}
async function durableJson(filePath, value) {
  const bytes = bytesOf(value);
  await writeFile(filePath, bytes, { flag: "wx" });
  const handle = await open(filePath, "r+");
  try { await handle.sync(); } finally { await handle.close(); }
  return { byteLength: bytes.length, fileSha256: sha256(bytes) };
}
async function syncDirectory(directory) {
  let handle;
  try { handle = await open(directory, "r"); await handle.sync(); } catch (error) {
    if (!["EINVAL", "EPERM", "EISDIR", "EBADF"].includes(error?.code)) throw error;
  } finally { await handle?.close(); }
}
async function emptyDirectory(directory) {
  try { return (await readdir(directory)).length === 0; } catch { return false; }
}

function validateDenominator(cases, operation, refs) {
  if (!Array.isArray(cases) || cases.length !== 6) throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "operation requires six cases");
  const seen = new Set();
  let applicable = 0;
  let rejection = 0;
  for (const entry of cases) {
    if (seen.has(entry.sourceId)) throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "source IDs must be unique");
    seen.add(entry.sourceId);
    const probe = createSlice08CaseContext({ operation, caseRecord: entry, repetition: 1, ...refs });
    applicable += probe.disposition === "applicable" ? 1 : 0;
    rejection += probe.disposition === "rejection" ? 1 : 0;
  }
  if (applicable !== 3 || rejection !== 3) throw new Slice08CaseContextError("S08_DENOMINATOR_INVALID", "operation requires three applicable and three rejection cases");
}

export async function runSlice08GateBOperation({ resultsRoot, operation, cases, refs, executeCase, now = () => new Date().toISOString() } = {}) {
  if (!path.isAbsolute(resultsRoot ?? "") || !["normalize", "export"].includes(operation) || typeof executeCase !== "function") {
    throw new Slice08CaseContextError("S08_RUNNER_INPUT_INVALID", "absolute results root, operation and executor are required");
  }
  validateDenominator(cases, operation, refs);
  try { await lstat(resultsRoot); throw new Slice08CaseContextError("S08_RESULT_ROOT_EXISTS", "result root already exists and cannot be replayed"); } catch (error) {
    if (error instanceof Slice08CaseContextError) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(resultsRoot), { recursive: true });
  await mkdir(resultsRoot);
  for (const name of ["requests", "records", "closures", ".staging"]) await mkdir(path.join(resultsRoot, name));
  const ledgerPath = path.join(resultsRoot, "ledger.ndjson");
  let sequence = 0;
  let previousEventHash = null;
  const results = [];
  const appendEvent = async (eventType, attemptId, payload) => {
    const event = withHash({ schemaVersion: "run-event.slice08.v0", sequence: ++sequence, eventType, attemptId,
      previousEventHash, occurredAt: utc(now), payloadSha256: sha256(bytesOf(payload)) });
    await appendFile(ledgerPath, bytesOf(event), { flag: "a" });
    const handle = await open(ledgerPath, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    previousEventHash = event.contentHash;
  };
  for (const entry of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const caseContext = createSlice08CaseContext({ operation, caseRecord: entry, repetition, ...refs });
      const attemptId = caseContext.attempt.attemptId;
      const requestId = `request.${attemptId}`;
      const request = withHash({ schemaVersion: "local-run-request.slice08.v0", requestId, caseContext, evidenceBoundary: AXES });
      await durableJson(path.join(resultsRoot, "requests", `${attemptId}.json`), request);
      await appendEvent("attempt-started", attemptId, request);
      let execution = null;
      let error = null;
      try { execution = await executeCase(Object.freeze({ caseContext })); } catch (cause) { error = cause; }
      if (caseContext.disposition === "rejection") {
        const actualCode = typeof error?.code === "string" ? error.code : null;
        const status = actualCode === caseContext.expectedStableErrorCode && error?.workerObservation == null ? "pass" : "non-pass";
        const result = withHash({ schemaVersion: "run-result.slice08.v0", resultId: `result.${attemptId}`, requestId, attemptId,
          operation, sourceId: caseContext.sourceId, repetition, disposition: "rejection", status, actualCode,
          caseContextHash: caseContext.contentHash, closureRef: null, fileSha256: null, decodedPixelSha256: null,
          workerExitConfirmed: false, evidenceBoundary: AXES });
        await durableJson(path.join(resultsRoot, "records", `${attemptId}.json`), result);
        await appendEvent("attempt-terminal", attemptId, result);
        results.push(result);
        continue;
      }
      const candidateError = error?.candidateOutput?.outputBytes instanceof Uint8Array && error?.workerObservation?.exitConfirmed === true;
      if (error && !candidateError) throw error;
      const candidate = candidateError ? error.candidateOutput : execution;
      if (!(candidate?.outputBytes instanceof Uint8Array) || (error?.workerObservation ?? execution?.workerObservation)?.exitConfirmed !== true) {
        throw new Slice08CaseContextError("S08_RUNNER_EXECUTION_INVALID", "applicable execution is incomplete");
      }
      const outputBytes = Buffer.from(candidate.outputBytes);
      const classification = candidateError ? "candidate-non-pass" : "artifact-pass";
      const extension = candidateError ? "bin" : "png";
      const closureId = `closure.${attemptId}`;
      const oracleFacts = candidateError ? null : execution.oracleFacts;
      const closure = withHash({ schemaVersion: "artifact-closure.slice08.v0", closureId, requestId, attemptId, operation,
        sourceId: caseContext.sourceId, repetition, classification, caseContextHash: caseContext.contentHash,
        outputRelativePath: `closures/${attemptId}/output.${extension}`, outputByteLength: outputBytes.length,
        outputFileSha256: sha256(outputBytes), decodedPixelSha256: candidateError
          ? candidate.decodedPixelSha256 : oracleFacts.decodedPixelSha256,
        oracleFactsSha256: oracleFacts ? sha256(bytesOf(oracleFacts)) : null,
        workerMessageSha256: candidate.workerMessageSha256, workerRuntimeSha256: candidate.workerRuntimeSha256,
        workerExitConfirmed: true, evidenceBoundary: AXES });
      const result = withHash({ schemaVersion: "run-result.slice08.v0", resultId: `result.${attemptId}`, requestId, attemptId,
        operation, sourceId: caseContext.sourceId, repetition, disposition: "applicable",
        status: candidateError ? "non-pass" : "pass", actualCode: error?.code ?? null, caseContextHash: caseContext.contentHash,
        closureRef: closureId, fileSha256: closure.outputFileSha256, decodedPixelSha256: closure.decodedPixelSha256,
        workerExitConfirmed: true, evidenceBoundary: AXES });
      const stage = path.join(resultsRoot, ".staging", attemptId);
      const destination = path.join(resultsRoot, "closures", attemptId);
      await mkdir(stage);
      await writeFile(path.join(stage, `output.${extension}`), outputBytes, { flag: "wx" });
      await durableJson(path.join(stage, "context.json"), caseContext);
      await durableJson(path.join(stage, "closure.json"), closure);
      if (oracleFacts) await durableJson(path.join(stage, "oracle.json"), oracleFacts);
      await durableJson(path.join(stage, "result.json"), result);
      await appendEvent("publication-intent", attemptId, { closure, result });
      await syncDirectory(stage);
      await rename(stage, destination);
      await syncDirectory(path.join(resultsRoot, "closures"));
      await appendEvent("publication-complete", attemptId, { closureId, outputFileSha256: closure.outputFileSha256 });
      await appendEvent("attempt-terminal", attemptId, result);
      results.push(result);
    }
  }
  const grouped = new Map();
  for (const result of results) {
    const list = grouped.get(result.sourceId) ?? [];
    list.push(result);
    grouped.set(result.sourceId, list);
  }
  const sourceThreeOfThreePasses = [...grouped.values()].filter((items) => items.length === 3 && items.every((item) => item.status === "pass")).length;
  const deterministicSources = [...grouped.values()].filter((items) => items.length === 3
    && new Set(items.map((item) => `${item.status}:${item.actualCode}:${item.fileSha256}`)).size === 1).length;
  const summary = withHash({ schemaVersion: "operation-summary.slice08.v0", summaryId: `summary.s08.${operation}`, operation,
    plannedSources: 6, plannedAttempts: 18, terminalAttempts: results.length,
    passAttempts: results.filter((item) => item.status === "pass").length,
    nonPassAttempts: results.filter((item) => item.status === "non-pass").length,
    applicableArtifactPasses: results.filter((item) => item.disposition === "applicable" && item.status === "pass").length,
    rejectionExactPasses: results.filter((item) => item.disposition === "rejection" && item.status === "pass").length,
    sourceThreeOfThreePasses, deterministicSources, replacementCount: 0, protocolFailureCount: 0, evidenceBoundary: AXES });
  const allPass = summary.passAttempts === 18 && summary.applicableArtifactPasses === 9 && summary.rejectionExactPasses === 9
    && summary.sourceThreeOfThreePasses === 6 && summary.deterministicSources === 6;
  const decision = withHash({ schemaVersion: "gateb-decision.slice08.v0", decisionId: `decision.s08.${operation}`, operation,
    state: allPass ? "pass" : "denied-closed-non-pass", summaryRef: summary.summaryId, gateBPassed: allPass,
    calibrationAuthorized: false, evidenceBoundary: AXES });
  await durableJson(path.join(resultsRoot, "summary.json"), summary);
  await durableJson(path.join(resultsRoot, "decision.json"), decision);
  if (await emptyDirectory(path.join(resultsRoot, ".staging"))) await rmdir(path.join(resultsRoot, ".staging"));
  await syncDirectory(resultsRoot);
  return Object.freeze({ results: Object.freeze(results), summary, decision, ledgerTail: previousEventHash });
}

export async function validateSlice08OperationTree(resultsRoot) {
  const summary = JSON.parse(await readFile(path.join(resultsRoot, "summary.json"), "utf8"));
  const decision = JSON.parse(await readFile(path.join(resultsRoot, "decision.json"), "utf8"));
  if (summary.contentHash !== sha256(bytesOf(Object.fromEntries(Object.entries(summary).filter(([key]) => key !== "contentHash"))))
    || decision.contentHash !== sha256(bytesOf(Object.fromEntries(Object.entries(decision).filter(([key]) => key !== "contentHash"))))) {
    throw new Slice08CaseContextError("S08_RESULT_HASH_MISMATCH", "summary or decision self-hash differs");
  }
  const requestFiles = (await readdir(path.join(resultsRoot, "requests"))).sort();
  const recordFiles = (await readdir(path.join(resultsRoot, "records"))).sort();
  const closureDirs = (await readdir(path.join(resultsRoot, "closures"), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  if (requestFiles.length !== 18 || recordFiles.length !== 9 || closureDirs.length !== 9 || summary.terminalAttempts !== 18) {
    throw new Slice08CaseContextError("S08_RESULT_DENOMINATOR_INVALID", "operation tree denominator is incomplete");
  }
  for (const file of requestFiles) {
    const request = JSON.parse(await readFile(path.join(resultsRoot, "requests", file), "utf8"));
    validateSlice08CaseContext(request.caseContext);
    if (request.contentHash !== sha256(bytesOf(Object.fromEntries(Object.entries(request).filter(([key]) => key !== "contentHash"))))) {
      throw new Slice08CaseContextError("S08_RESULT_HASH_MISMATCH", "request self-hash differs");
    }
  }
  return Object.freeze({ valid: true, summary, decision, requestCount: 18, rejectionRecordCount: 9, closureCount: 9 });
}
