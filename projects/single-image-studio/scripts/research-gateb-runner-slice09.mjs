import { createHash } from "node:crypto";
import {
  appendFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  SLICE09_CASE_CONTEXT_SCHEMA,
  Slice09CaseContextError,
  createSlice09CaseContext,
  validateSlice09CaseContext,
} from "./research-gateb-case-context-slice09.mjs";

export const SLICE09_GATEB_RUNNER_ID = "RUNNER-GATEB-OPEN-SMOKE@0.9.0";

const HEX = "^[a-f0-9]{64}$";
const ID = "^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$";
const AXES = Object.freeze({
  C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0,
  productSupport: false, formal: false,
  releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalBytes(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: sha256(canonicalBytes(value)) }); }
function withoutHash(value) { return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "contentHash")); }
function same(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function fail(code, message, options = {}) { throw new Slice09CaseContextError(code, message, options); }

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

function schemaDocument(name, body) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-09/schemas/${name}`,
    ...body,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const stringId = { type: "string", pattern: ID };
const hex = { type: "string", pattern: HEX };
const recordRefSchema = objectSchema({
  path: { type: "string", minLength: 1, maxLength: 500 },
  id: stringId,
  contentHash: hex,
  byteLength: { type: "integer", minimum: 2 },
  fileSha256: hex,
});
const evidenceBoundarySchema = objectSchema({
  C1: { const: 0 }, U1: { const: 0 }, E1: { const: 0 }, R1: { const: 0 },
  O1: { const: 0 }, G1: { const: 0 }, V1: { const: 0 },
  productSupport: { const: false }, formal: { const: false },
  releaseAllowlist: { const: "none" }, releaseRegistered: { const: 0 }, releaseApproved: { const: 0 },
});

export const SLICE09_RUNNER_SCHEMA_DOCUMENTS = deepFreeze({
  "schemas/gateb-case-context.slice09.v0.schema.json": SLICE09_CASE_CONTEXT_SCHEMA,
  "schemas/local-run-request.slice09.v0.schema.json": schemaDocument("local-run-request.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "local-run-request.slice09.v0" }, requestId: stringId,
    caseContext: { $ref: "gateb-case-context.slice09.v0.schema.json" },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/run-claim.slice09.v0.schema.json": schemaDocument("run-claim.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-claim.slice09.v0" }, claimId: stringId, requestId: stringId,
    attemptId: stringId, idempotencyKey: hex, claimedAt: { type: "string" },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/run-event.slice09.v0.schema.json": schemaDocument("run-event.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-event.slice09.v0" }, sequence: { type: "integer", minimum: 1 },
    eventType: { enum: ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"] },
    attemptId: stringId, previousEventHash: { oneOf: [{ type: "null" }, hex] },
    occurredAt: { type: "string" }, payloadSha256: hex, contentHash: hex,
  })),
  "schemas/run-result.slice09.v0.schema.json": schemaDocument("run-result.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-result.slice09.v0" }, resultId: stringId, requestId: stringId, attemptId: stringId,
    operation: { enum: ["normalize", "export"] }, sourceId: stringId,
    repetition: { type: "integer", minimum: 1, maximum: 3 }, disposition: { enum: ["applicable", "rejection"] },
    status: { enum: ["pass", "non-pass"] },
    actualCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^(S09_[A-Z0-9_]+|ERR_[A-Z0-9_]+)$" }] },
    caseContextHash: hex, goldIdentityRef: { oneOf: [{ type: "null" }, recordRefSchema] },
    closureRef: { oneOf: [{ type: "null" }, stringId] }, fileSha256: { oneOf: [{ type: "null" }, hex] },
    decodedPixelSha256: { oneOf: [{ type: "null" }, hex] }, workerExitConfirmed: { type: "boolean" },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/artifact-closure.slice09.v0.schema.json": schemaDocument("artifact-closure.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "artifact-closure.slice09.v0" }, closureId: stringId, requestId: stringId, attemptId: stringId,
    operation: { enum: ["normalize", "export"] }, sourceId: stringId,
    repetition: { type: "integer", minimum: 1, maximum: 3 },
    classification: { enum: ["artifact-pass", "candidate-non-pass"] }, caseContextHash: hex,
    goldIdentityRef: recordRefSchema,
    outputRelativePath: { type: "string", pattern: "^closures/[A-Za-z0-9._:@-]+/output\\.(png|bin)$" },
    outputByteLength: { type: "integer", minimum: 1, maximum: 1048576 }, outputFileSha256: hex,
    decodedPixelSha256: hex, oracleFactsSha256: { oneOf: [{ type: "null" }, hex] },
    workerMessageSha256: hex, workerRuntimeSha256: hex, workerExitConfirmed: { const: true },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/operation-summary.slice09.v0.schema.json": schemaDocument("operation-summary.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "operation-summary.slice09.v0" }, summaryId: stringId,
    operation: { enum: ["normalize", "export"] }, plannedSources: { const: 6 }, plannedAttempts: { const: 18 },
    terminalAttempts: { const: 18 }, passAttempts: { type: "integer", minimum: 0, maximum: 18 },
    nonPassAttempts: { type: "integer", minimum: 0, maximum: 18 },
    applicableArtifactPasses: { type: "integer", minimum: 0, maximum: 9 },
    rejectionExactPasses: { type: "integer", minimum: 0, maximum: 9 },
    sourceThreeOfThreePasses: { type: "integer", minimum: 0, maximum: 6 },
    deterministicSources: { type: "integer", minimum: 0, maximum: 6 },
    replacementCount: { const: 0 }, protocolFailureCount: { const: 0 },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/gateb-decision.slice09.v0.schema.json": schemaDocument("gateb-decision.slice09.v0.schema.json", objectSchema({
    schemaVersion: { const: "gateb-decision.slice09.v0" }, decisionId: stringId,
    operation: { enum: ["normalize", "export"] }, state: { enum: ["pass", "denied-closed-non-pass"] },
    summaryRef: stringId, gateBPassed: { type: "boolean" }, calibrationAuthorized: { const: false },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
});

export const SLICE09_RUNNER_SCHEMA_PATHS = Object.freeze(Object.keys(SLICE09_RUNNER_SCHEMA_DOCUMENTS).sort());

function utc(now) {
  const value = now();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || new Date(value).toISOString() !== value) fail("S09_CLOCK_INVALID", "clock must return canonical UTC milliseconds");
  return value;
}

async function durableJson(filePath, value) {
  const bytes = canonicalBytes(value);
  await writeFile(filePath, bytes, { flag: "wx" });
  const handle = await open(filePath, "r+");
  try { await handle.sync(); } finally { await handle.close(); }
  return { byteLength: bytes.length, fileSha256: sha256(bytes) };
}

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (!["EINVAL", "EPERM", "EISDIR", "EBADF"].includes(error?.code)) throw error;
  } finally { await handle?.close(); }
}

async function assertUnusedRoot(resultsRoot) {
  try {
    await lstat(resultsRoot);
    fail("S09_RESULT_ROOT_EXISTS", "result root already exists and cannot be replayed");
  } catch (error) {
    if (error instanceof Slice09CaseContextError) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
}

function validateDenominator(cases, operation, refs) {
  if (!Array.isArray(cases) || cases.length !== 6) fail("S09_DENOMINATOR_INVALID", "operation requires six cases");
  const sourceIds = new Set();
  const counts = { applicable: 0, rejection: 0 };
  for (const entry of cases) {
    if (sourceIds.has(entry.sourceId)) fail("S09_DENOMINATOR_INVALID", "source IDs must be unique");
    sourceIds.add(entry.sourceId);
    const context = createSlice09CaseContext({ operation, caseRecord: entry, repetition: 1, ...refs });
    counts[context.disposition] += 1;
  }
  if (counts.applicable !== 3 || counts.rejection !== 3) {
    fail("S09_DENOMINATOR_INVALID", "operation requires three applicable and three rejection cases");
  }
}

function terminalRecord({ caseContext, requestId, status, actualCode, closure = null, workerExitConfirmed }) {
  return withHash({
    schemaVersion: "run-result.slice09.v0", resultId: `result.${caseContext.attempt.attemptId}`,
    requestId, attemptId: caseContext.attempt.attemptId, operation: caseContext.operation,
    sourceId: caseContext.sourceId, repetition: caseContext.attempt.repetition,
    disposition: caseContext.disposition, status, actualCode, caseContextHash: caseContext.contentHash,
    goldIdentityRef: structuredClone(caseContext.goldIdentityRef), closureRef: closure?.closureId ?? null,
    fileSha256: closure?.outputFileSha256 ?? null, decodedPixelSha256: closure?.decodedPixelSha256 ?? null,
    workerExitConfirmed, evidenceBoundary: AXES,
  });
}

export async function runSlice09GateBOperation({
  resultsRoot,
  operation,
  cases,
  refs,
  executeCase,
  now = () => new Date().toISOString(),
} = {}) {
  if (!path.isAbsolute(resultsRoot ?? "") || !["normalize", "export"].includes(operation)
    || typeof executeCase !== "function") fail("S09_RUNNER_INPUT_INVALID", "absolute result root, operation and executor are required");
  validateDenominator(cases, operation, refs);
  await assertUnusedRoot(resultsRoot);
  await mkdir(path.dirname(resultsRoot), { recursive: true });
  await mkdir(resultsRoot);
  for (const name of ["requests", "claims", "records", "closures", ".staging"]) await mkdir(path.join(resultsRoot, name));
  const ledgerPath = path.join(resultsRoot, "ledger.ndjson");
  let sequence = 0;
  let previousEventHash = null;
  const results = [];
  const appendEvent = async (eventType, attemptId, payload) => {
    const event = withHash({
      schemaVersion: "run-event.slice09.v0", sequence: ++sequence, eventType, attemptId,
      previousEventHash, occurredAt: utc(now), payloadSha256: sha256(canonicalBytes(payload)),
    });
    await appendFile(ledgerPath, canonicalBytes(event), { flag: "a" });
    const handle = await open(ledgerPath, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    previousEventHash = event.contentHash;
  };

  for (const entry of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const caseContext = createSlice09CaseContext({ operation, caseRecord: entry, repetition, ...refs });
      const attemptId = caseContext.attempt.attemptId;
      const requestId = `request.${attemptId}`;
      const request = withHash({
        schemaVersion: "local-run-request.slice09.v0", requestId, caseContext, evidenceBoundary: AXES,
      });
      const claim = withHash({
        schemaVersion: "run-claim.slice09.v0", claimId: `claim.${attemptId}`, requestId, attemptId,
        idempotencyKey: caseContext.attempt.idempotencyKey, claimedAt: utc(now), evidenceBoundary: AXES,
      });
      await durableJson(path.join(resultsRoot, "requests", `${attemptId}.json`), request);
      await durableJson(path.join(resultsRoot, "claims", `${attemptId}.json`), claim);
      await appendEvent("attempt-started", attemptId, { request, claim });

      let execution = null;
      let error = null;
      try { execution = await executeCase(Object.freeze({ caseContext })); } catch (cause) { error = cause; }

      if (caseContext.disposition === "rejection") {
        const actualCode = typeof error?.code === "string" ? error.code : null;
        const status = actualCode === caseContext.expectedStableErrorCode && error?.workerObservation == null ? "pass" : "non-pass";
        const result = terminalRecord({ caseContext, requestId, status, actualCode, workerExitConfirmed: false });
        await durableJson(path.join(resultsRoot, "records", `${attemptId}.json`), result);
        await appendEvent("attempt-terminal", attemptId, result);
        results.push(result);
        continue;
      }

      const candidateError = error?.candidateOutput?.outputBytes instanceof Uint8Array
        && error?.workerObservation?.exitConfirmed === true;
      if (error && !candidateError) throw error;
      const candidate = candidateError ? error.candidateOutput : execution;
      const observation = error?.workerObservation ?? execution?.workerObservation;
      if (!(candidate?.outputBytes instanceof Uint8Array) || observation?.exitConfirmed !== true
        || typeof candidate.workerMessageSha256 !== "string" || typeof candidate.workerRuntimeSha256 !== "string") {
        fail("S09_RUNNER_EXECUTION_INVALID", "applicable execution is incomplete");
      }
      const outputBytes = Buffer.from(candidate.outputBytes);
      if (outputBytes.length < 1 || outputBytes.length > 1048576) fail("S09_OUTPUT_SIZE_INVALID", "candidate output is outside the frozen byte limit");
      const oracleFacts = candidateError ? null : candidate.oracleFacts;
      if (!candidateError && (!oracleFacts || typeof oracleFacts.decodedPixelSha256 !== "string")) {
        fail("S09_RUNNER_EXECUTION_INVALID", "applicable pass lacks independent oracle facts");
      }
      const classification = candidateError ? "candidate-non-pass" : "artifact-pass";
      const extension = candidateError ? "bin" : "png";
      const closureId = `closure.${attemptId}`;
      const closure = withHash({
        schemaVersion: "artifact-closure.slice09.v0", closureId, requestId, attemptId,
        operation, sourceId: caseContext.sourceId, repetition, classification,
        caseContextHash: caseContext.contentHash, goldIdentityRef: structuredClone(caseContext.goldIdentityRef),
        outputRelativePath: `closures/${attemptId}/output.${extension}`,
        outputByteLength: outputBytes.length, outputFileSha256: sha256(outputBytes),
        decodedPixelSha256: candidateError ? candidate.decodedPixelSha256 : oracleFacts.decodedPixelSha256,
        oracleFactsSha256: oracleFacts ? sha256(canonicalBytes(oracleFacts)) : null,
        workerMessageSha256: candidate.workerMessageSha256, workerRuntimeSha256: candidate.workerRuntimeSha256,
        workerExitConfirmed: true, evidenceBoundary: AXES,
      });
      const result = terminalRecord({
        caseContext, requestId, status: candidateError ? "non-pass" : "pass", actualCode: error?.code ?? null,
        closure, workerExitConfirmed: true,
      });
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
  for (const result of results) grouped.set(result.sourceId, [...(grouped.get(result.sourceId) ?? []), result]);
  const sourceThreeOfThreePasses = [...grouped.values()].filter((items) => items.length === 3
    && items.every((item) => item.status === "pass")).length;
  const deterministicSources = [...grouped.values()].filter((items) => items.length === 3
    && new Set(items.map((item) => `${item.status}:${item.actualCode}:${item.fileSha256}:${item.decodedPixelSha256}`)).size === 1).length;
  const summary = withHash({
    schemaVersion: "operation-summary.slice09.v0", summaryId: `summary.s09.${operation}`, operation,
    plannedSources: 6, plannedAttempts: 18, terminalAttempts: results.length,
    passAttempts: results.filter((item) => item.status === "pass").length,
    nonPassAttempts: results.filter((item) => item.status === "non-pass").length,
    applicableArtifactPasses: results.filter((item) => item.disposition === "applicable" && item.status === "pass").length,
    rejectionExactPasses: results.filter((item) => item.disposition === "rejection" && item.status === "pass").length,
    sourceThreeOfThreePasses, deterministicSources, replacementCount: 0, protocolFailureCount: 0,
    evidenceBoundary: AXES,
  });
  const allPass = summary.passAttempts === 18 && summary.applicableArtifactPasses === 9
    && summary.rejectionExactPasses === 9 && summary.sourceThreeOfThreePasses === 6
    && summary.deterministicSources === 6;
  const decision = withHash({
    schemaVersion: "gateb-decision.slice09.v0", decisionId: `decision.s09.${operation}`, operation,
    state: allPass ? "pass" : "denied-closed-non-pass", summaryRef: summary.summaryId,
    gateBPassed: allPass, calibrationAuthorized: false, evidenceBoundary: AXES,
  });
  await durableJson(path.join(resultsRoot, "summary.json"), summary);
  await durableJson(path.join(resultsRoot, "decision.json"), decision);
  if ((await readdir(path.join(resultsRoot, ".staging"))).length === 0) await rmdir(path.join(resultsRoot, ".staging"));
  await syncDirectory(resultsRoot);
  return Object.freeze({ results: Object.freeze(results), summary, decision, ledgerTail: previousEventHash });
}

async function parseCanonicalRecord(filePath) {
  const bytes = await readFile(filePath);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); } catch (cause) {
    fail("S09_RESULT_JSON_INVALID", `invalid JSON at ${filePath}`, { cause });
  }
  if (!bytes.equals(canonicalBytes(record))) fail("S09_RESULT_CANONICAL_INVALID", `record is not canonical: ${filePath}`);
  if (record.contentHash !== sha256(canonicalBytes(withoutHash(record)))) fail("S09_RESULT_HASH_MISMATCH", `self-hash differs: ${filePath}`);
  return record;
}

async function exactDirectory(directory, expectedFiles, expectedDirectories = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (entries.some((entry) => !entry.isFile() && !entry.isDirectory())
    || !same(files, [...expectedFiles].sort()) || !same(directories, [...expectedDirectories].sort())) {
    fail("S09_RESULT_TREE_INVALID", `unexpected result-tree entry in ${directory}`);
  }
}

export async function validateSlice09OperationTree(resultsRoot) {
  if (!path.isAbsolute(resultsRoot ?? "")) fail("S09_RESULT_TREE_INVALID", "absolute operation root is required");
  await exactDirectory(resultsRoot, ["decision.json", "ledger.ndjson", "summary.json"], ["claims", "closures", "records", "requests"]);
  const summary = await parseCanonicalRecord(path.join(resultsRoot, "summary.json"));
  const decision = await parseCanonicalRecord(path.join(resultsRoot, "decision.json"));
  const operation = summary.operation;
  if (!["normalize", "export"].includes(operation) || decision.operation !== operation
    || decision.summaryRef !== summary.summaryId || decision.calibrationAuthorized !== false) {
    fail("S09_RESULT_BINDING_INVALID", "summary and decision do not bind one operation");
  }
  const requestFiles = (await readdir(path.join(resultsRoot, "requests"))).sort();
  const claimFiles = (await readdir(path.join(resultsRoot, "claims"))).sort();
  const recordFiles = (await readdir(path.join(resultsRoot, "records"))).sort();
  const closureEntries = await readdir(path.join(resultsRoot, "closures"), { withFileTypes: true });
  if (requestFiles.length !== 18 || claimFiles.length !== 18 || recordFiles.length !== 9
    || closureEntries.length !== 9 || closureEntries.some((entry) => !entry.isDirectory())) {
    fail("S09_RESULT_DENOMINATOR_INVALID", "operation tree denominator is incomplete");
  }
  const terminalResults = [];
  const requestByAttempt = new Map();
  const claimByAttempt = new Map();
  const closureByAttempt = new Map();
  const resultByAttempt = new Map();
  for (const file of requestFiles) {
    const request = await parseCanonicalRecord(path.join(resultsRoot, "requests", file));
    validateSlice09CaseContext(request.caseContext);
    const attemptId = request.caseContext.attempt.attemptId;
    if (file !== `${attemptId}.json` || request.requestId !== `request.${attemptId}`
      || request.caseContext.operation !== operation || !same(request.evidenceBoundary, AXES)) {
      fail("S09_RESULT_BINDING_INVALID", "request path or operation binding differs");
    }
    requestByAttempt.set(attemptId, request);
    const claim = await parseCanonicalRecord(path.join(resultsRoot, "claims", file));
    if (claim.requestId !== request.requestId || claim.attemptId !== attemptId
      || claim.idempotencyKey !== request.caseContext.attempt.idempotencyKey || !same(claim.evidenceBoundary, AXES)) {
      fail("S09_RESULT_BINDING_INVALID", "claim differs from request identity");
    }
    claimByAttempt.set(attemptId, claim);
  }
  for (const file of recordFiles) {
    const result = await parseCanonicalRecord(path.join(resultsRoot, "records", file));
    const request = requestByAttempt.get(result.attemptId);
    if (!request || result.disposition !== "rejection" || result.closureRef !== null
      || result.goldIdentityRef !== null || result.workerExitConfirmed !== false
      || result.caseContextHash !== request.caseContext.contentHash
      || result.actualCode !== request.caseContext.expectedStableErrorCode
      || result.status !== "pass") fail("S09_RESULT_BINDING_INVALID", "rejection terminal differs from request");
    terminalResults.push(result);
    resultByAttempt.set(result.attemptId, result);
  }
  for (const entry of closureEntries) {
    const attemptId = entry.name;
    const directory = path.join(resultsRoot, "closures", attemptId);
    const closure = await parseCanonicalRecord(path.join(directory, "closure.json"));
    const result = await parseCanonicalRecord(path.join(directory, "result.json"));
    const context = await parseCanonicalRecord(path.join(directory, "context.json"));
    validateSlice09CaseContext(context);
    const request = requestByAttempt.get(attemptId);
    const extension = closure.classification === "artifact-pass" ? "png" : "bin";
    const expectedFiles = extension === "png"
      ? ["closure.json", "context.json", "oracle.json", `output.${extension}`, "result.json"]
      : ["closure.json", "context.json", `output.${extension}`, "result.json"];
    await exactDirectory(directory, expectedFiles);
    const outputBytes = await readFile(path.join(directory, `output.${extension}`));
    if (!request || !same(context, request.caseContext) || closure.attemptId !== attemptId
      || closure.requestId !== request.requestId || closure.caseContextHash !== context.contentHash
      || !same(closure.goldIdentityRef, context.goldIdentityRef)
      || closure.outputRelativePath !== `closures/${attemptId}/output.${extension}`
      || closure.outputByteLength !== outputBytes.length || closure.outputFileSha256 !== sha256(outputBytes)
      || result.requestId !== request.requestId || result.caseContextHash !== context.contentHash
      || result.closureRef !== closure.closureId || !same(result.goldIdentityRef, context.goldIdentityRef)
      || result.fileSha256 !== closure.outputFileSha256 || result.decodedPixelSha256 !== closure.decodedPixelSha256
      || result.workerExitConfirmed !== true) fail("S09_RESULT_BINDING_INVALID", "applicable closure cross-binding differs");
    if (extension === "png") {
      const oracleBytes = await readFile(path.join(directory, "oracle.json"));
      if (closure.oracleFactsSha256 !== sha256(oracleBytes)) fail("S09_RESULT_BINDING_INVALID", "oracle facts hash differs");
    } else if (closure.oracleFactsSha256 !== null) fail("S09_RESULT_BINDING_INVALID", "candidate non-pass cannot claim pass oracle facts");
    terminalResults.push(result);
    closureByAttempt.set(attemptId, closure);
    resultByAttempt.set(attemptId, result);
  }
  if (terminalResults.length !== 18 || new Set(terminalResults.map((item) => item.attemptId)).size !== 18) {
    fail("S09_RESULT_DENOMINATOR_INVALID", "terminal attempt set is not exact");
  }
  const lines = (await readFile(path.join(resultsRoot, "ledger.ndjson"), "utf8")).trimEnd().split("\n");
  let previousEventHash = null;
  let terminalEvents = 0;
  const eventTypesByAttempt = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const event = JSON.parse(lines[index]);
    if (event.sequence !== index + 1 || event.previousEventHash !== previousEventHash
      || event.contentHash !== sha256(canonicalBytes(withoutHash(event)))
      || lines[index] !== JSON.stringify(stable(event))
      || typeof event.occurredAt !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(event.occurredAt)
      || new Date(event.occurredAt).toISOString() !== event.occurredAt) {
      fail("S09_LEDGER_CHAIN_INVALID", "ledger sequence or hash chain differs");
    }
    const request = requestByAttempt.get(event.attemptId);
    const claim = claimByAttempt.get(event.attemptId);
    const closure = closureByAttempt.get(event.attemptId);
    const result = resultByAttempt.get(event.attemptId);
    if (!request || !claim || !result) fail("S09_LEDGER_CHAIN_INVALID", "ledger references an unknown attempt");
    let expectedPayload;
    if (event.eventType === "attempt-started") expectedPayload = { request, claim };
    else if (event.eventType === "publication-intent" && closure) expectedPayload = { closure, result };
    else if (event.eventType === "publication-complete" && closure) {
      expectedPayload = { closureId: closure.closureId, outputFileSha256: closure.outputFileSha256 };
    } else if (event.eventType === "attempt-terminal") expectedPayload = result;
    else fail("S09_LEDGER_CHAIN_INVALID", "event type is invalid for the attempt disposition");
    if (event.payloadSha256 !== sha256(canonicalBytes(expectedPayload))) {
      fail("S09_LEDGER_CHAIN_INVALID", "event payload hash differs from durable records");
    }
    eventTypesByAttempt.set(event.attemptId, [...(eventTypesByAttempt.get(event.attemptId) ?? []), event.eventType]);
    if (event.eventType === "attempt-terminal") terminalEvents += 1;
    previousEventHash = event.contentHash;
  }
  if (terminalEvents !== 18 || lines.length !== 54) fail("S09_LEDGER_CHAIN_INVALID", "ledger terminal denominator differs");
  for (const [attemptId, request] of requestByAttempt) {
    const expectedTypes = request.caseContext.disposition === "applicable"
      ? ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"]
      : ["attempt-started", "attempt-terminal"];
    if (!same(eventTypesByAttempt.get(attemptId), expectedTypes)) {
      fail("S09_LEDGER_CHAIN_INVALID", "attempt event order differs from the frozen protocol");
    }
  }
  const passAttempts = terminalResults.filter((item) => item.status === "pass").length;
  const applicableArtifactPasses = terminalResults.filter((item) => item.disposition === "applicable" && item.status === "pass").length;
  const rejectionExactPasses = terminalResults.filter((item) => item.disposition === "rejection" && item.status === "pass").length;
  const grouped = new Map();
  for (const result of terminalResults) grouped.set(result.sourceId, [...(grouped.get(result.sourceId) ?? []), result]);
  if (grouped.size !== 6) fail("S09_RESULT_DENOMINATOR_INVALID", "source denominator differs");
  let applicableSources = 0;
  let rejectionSources = 0;
  for (const items of grouped.values()) {
    if (items.length !== 3 || !same(items.map((item) => item.repetition).sort(), [1, 2, 3])
      || new Set(items.map((item) => item.disposition)).size !== 1) {
      fail("S09_RESULT_DENOMINATOR_INVALID", "source repetitions or disposition differ");
    }
    if (items[0].disposition === "applicable") applicableSources += 1;
    else rejectionSources += 1;
  }
  if (applicableSources !== 3 || rejectionSources !== 3) {
    fail("S09_RESULT_DENOMINATOR_INVALID", "applicable/rejection source denominator differs");
  }
  const sourceThreeOfThreePasses = [...grouped.values()].filter((items) => items.every((item) => item.status === "pass")).length;
  const deterministicSources = [...grouped.values()].filter((items) => new Set(items
    .map((item) => `${item.status}:${item.actualCode}:${item.fileSha256}:${item.decodedPixelSha256}`)).size === 1).length;
  if (summary.terminalAttempts !== 18 || summary.passAttempts !== passAttempts
    || summary.nonPassAttempts !== 18 - passAttempts || summary.applicableArtifactPasses !== applicableArtifactPasses
    || summary.rejectionExactPasses !== rejectionExactPasses || summary.replacementCount !== 0
    || summary.sourceThreeOfThreePasses !== sourceThreeOfThreePasses
    || summary.deterministicSources !== deterministicSources
    || summary.protocolFailureCount !== 0 || !same(summary.evidenceBoundary, AXES)) {
    fail("S09_SUMMARY_INVALID", "summary counters differ from durable terminals");
  }
  const allPass = summary.passAttempts === 18 && summary.applicableArtifactPasses === 9
    && summary.rejectionExactPasses === 9 && summary.sourceThreeOfThreePasses === 6
    && summary.deterministicSources === 6;
  if (decision.gateBPassed !== allPass || decision.state !== (allPass ? "pass" : "denied-closed-non-pass")
    || !same(decision.evidenceBoundary, AXES)) fail("S09_DECISION_INVALID", "decision is not derived from summary");
  return Object.freeze({
    valid: true, summary, decision, requestCount: 18, claimCount: 18,
    rejectionRecordCount: 9, closureCount: 9, ledgerTail: previousEventHash,
  });
}
