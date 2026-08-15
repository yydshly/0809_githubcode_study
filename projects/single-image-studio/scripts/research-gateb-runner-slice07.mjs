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

import { Slice07GateBError } from "./research-gateb-adapter-slice07.mjs";

export const SLICE07_GATEB_RUNNER_ID = "RUNNER-GATEB-OPEN-SMOKE@0.7.0";

const HEX = "^[a-f0-9]{64}$";
const ID = "^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$";
const AXES = Object.freeze({
  C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0,
  productSupport: false,
  formal: false,
  releaseAllowlist: "none",
  releaseRegistered: 0,
  releaseApproved: 0,
});
const CONFORMANCE_CODES = new Set([
  "S07_OUTPUT_ORACLE_REJECTED",
  "S07_ORACLE_RESULT_INVALID",
  "S07_WORKER_PIXEL_IDENTITY_MISMATCH",
  "S07_ENCODER_OUTPUT_INVALID",
]);

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

function schemaDocument(name, body) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-07/schemas/${name}`,
    ...body,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const stringId = { type: "string", pattern: ID };
const hex = { type: "string", pattern: HEX };
const evidenceBoundarySchema = objectSchema({
  C1: { const: 0 }, U1: { const: 0 }, E1: { const: 0 }, R1: { const: 0 },
  O1: { const: 0 }, G1: { const: 0 }, V1: { const: 0 },
  productSupport: { const: false }, formal: { const: false },
  releaseAllowlist: { const: "none" }, releaseRegistered: { const: 0 }, releaseApproved: { const: 0 },
});

export const SLICE07_RUNNER_SCHEMA_DOCUMENTS = deepFreeze({
  "schemas/local-run-request.slice07.v0.schema.json": schemaDocument("local-run-request.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "local-run-request.slice07.v0" }, requestId: stringId,
    attemptId: stringId, operation: { enum: ["normalize", "export"] }, sourceId: stringId,
    repetition: { type: "integer", minimum: 1, maximum: 3 },
    disposition: { enum: ["applicable", "rejection"] },
    expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S07_[A-Z0-9_]+$" }] },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/run-result.slice07.v0.schema.json": schemaDocument("run-result.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-result.slice07.v0" }, resultId: stringId, requestId: stringId,
    attemptId: stringId, operation: { enum: ["normalize", "export"] }, sourceId: stringId,
    repetition: { type: "integer", minimum: 1, maximum: 3 },
    disposition: { enum: ["applicable", "rejection"] }, status: { enum: ["pass", "non-pass"] },
    actualCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S07_[A-Z0-9_]+$" }] },
    closureRef: { oneOf: [{ type: "null" }, stringId] },
    fileSha256: { oneOf: [{ type: "null" }, hex] },
    decodedPixelSha256: { oneOf: [{ type: "null" }, hex] },
    workerExitConfirmed: { type: "boolean" }, evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/run-event.slice07.v0.schema.json": schemaDocument("run-event.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "run-event.slice07.v0" }, sequence: { type: "integer", minimum: 1 },
    eventType: { enum: ["attempt-started", "publication-intent", "publication-complete", "attempt-terminal"] },
    attemptId: stringId, previousEventHash: { oneOf: [{ type: "null" }, hex] }, occurredAt: { type: "string" },
    payloadSha256: hex, contentHash: hex,
  })),
  "schemas/artifact-closure.slice07.v0.schema.json": schemaDocument("artifact-closure.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "artifact-closure.slice07.v0" }, closureId: stringId, requestId: stringId,
    attemptId: stringId, operation: { enum: ["normalize", "export"] }, sourceId: stringId,
    repetition: { type: "integer", minimum: 1, maximum: 3 }, classification: { enum: ["artifact-pass", "candidate-non-pass"] },
    outputRelativePath: { type: "string", pattern: "^closures/[A-Za-z0-9._:@-]+/output\\.(png|bin)$" },
    outputByteLength: { type: "integer", minimum: 1, maximum: 1048576 }, outputFileSha256: hex,
    decodedPixelSha256: hex, oracleFactsSha256: { oneOf: [{ type: "null" }, hex] },
    workerMessageSha256: hex, workerRuntimeSha256: hex, workerRecordSha256: hex, workerExitConfirmed: { const: true },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
  "schemas/operation-summary.slice07.v0.schema.json": schemaDocument("operation-summary.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "operation-summary.slice07.v0" }, summaryId: stringId,
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
  "schemas/gateb-decision.slice07.v0.schema.json": schemaDocument("gateb-decision.slice07.v0.schema.json", objectSchema({
    schemaVersion: { const: "gateb-decision.slice07.v0" }, decisionId: stringId,
    operation: { enum: ["normalize", "export"] }, state: { enum: ["pass", "denied-closed-non-pass"] },
    summaryRef: stringId, gateBPassed: { type: "boolean" }, calibrationAuthorized: { const: false },
    evidenceBoundary: evidenceBoundarySchema, contentHash: hex,
  })),
});

export const SLICE07_RUNNER_SCHEMA_PATHS = Object.freeze(Object.keys(SLICE07_RUNNER_SCHEMA_DOCUMENTS).sort());

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function withHash(value) {
  return Object.freeze({ ...value, contentHash: sha256(canonicalBytes(value)) });
}

function safeId(value, label) {
  if (typeof value !== "string" || !new RegExp(ID, "u").test(value) || value.includes("..")) {
    throw new Slice07GateBError("S07_RUNNER_INPUT_INVALID", `${label} is outside the closed identifier profile`);
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new Slice07GateBError("S07_RUNNER_INPUT_INVALID", `${label} has an open or incomplete shape`);
  }
}

function validateCases(cases, operation) {
  if (!Array.isArray(cases) || cases.length !== 6) {
    throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "each operation requires exactly six source cases");
  }
  const seen = new Set();
  let applicable = 0;
  let rejection = 0;
  for (const entry of cases) {
    exactKeys(entry, ["sourceId", "disposition", "expectedStableErrorCode", "expected", "workerRequest"], "case");
    safeId(entry.sourceId, "sourceId");
    if (seen.has(entry.sourceId)) throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "source IDs must be unique");
    seen.add(entry.sourceId);
    if (entry.disposition === "applicable") {
      applicable += 1;
      if (entry.expectedStableErrorCode !== null || !entry.expected || typeof entry.expected !== "object") {
        throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "applicable cases require expected facts and no error code");
      }
    } else if (entry.disposition === "rejection") {
      rejection += 1;
      if (!/^S07_[A-Z0-9_]+$/u.test(entry.expectedStableErrorCode ?? "") || entry.expected !== null) {
        throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "rejection cases require an exact S07 code and no expected facts");
      }
    } else {
      throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "case disposition is invalid");
    }
    if (!entry.workerRequest || entry.workerRequest.operation !== operation) {
      throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "worker request operation differs from the operation run");
    }
  }
  if (applicable !== 3 || rejection !== 3) {
    throw new Slice07GateBError("S07_DENOMINATOR_INVALID", "each operation requires three applicable and three rejection sources");
  }
}

async function durableJson(filePath, value) {
  const bytes = canonicalBytes(value);
  await writeFile(filePath, bytes, { flag: "wx" });
  const handle = await open(filePath, "r+");
  try { await handle.sync(); } finally { await handle.close(); }
  return { byteLength: bytes.length, fileSha256: sha256(bytes) };
}

async function syncDirectory(directory) {
  try {
    const handle = await open(directory, "r");
    try { await handle.sync(); } finally { await handle.close(); }
  } catch (error) {
    if (process.platform !== "win32") throw error;
  }
}

async function listFiles(root, prefix = "") {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Slice07GateBError("S07_RESULT_TREE_INVALID", "links are forbidden");
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Slice07GateBError("S07_RESULT_TREE_INVALID", "non-regular result entries are forbidden");
  }
  return files;
}

function nowUtc(now) {
  const value = now();
  if (typeof value !== "string" || new Date(value).toISOString() !== value) {
    throw new Slice07GateBError("S07_CLOCK_INVALID", "clock must return canonical UTC milliseconds");
  }
  return value;
}

export async function runSlice07GateBOperation({ resultsRoot, operation, cases, executeCase, now = () => new Date().toISOString() } = {}) {
  if (operation !== "normalize" && operation !== "export") throw new Slice07GateBError("S07_OPERATION_INVALID", "operation is invalid");
  if (typeof executeCase !== "function" || typeof resultsRoot !== "string" || !path.isAbsolute(resultsRoot)) {
    throw new Slice07GateBError("S07_RUNNER_INPUT_INVALID", "absolute resultsRoot and executeCase are required");
  }
  validateCases(cases, operation);
  await mkdir(path.dirname(resultsRoot), { recursive: true });
  await mkdir(resultsRoot);
  for (const directory of ["requests", "records", "closures", ".staging"]) await mkdir(path.join(resultsRoot, directory));
  const ledgerPath = path.join(resultsRoot, "ledger.ndjson");
  let sequence = 0;
  let previousEventHash = null;
  const results = [];

  const appendEvent = async (eventType, attemptId, payload) => {
    const event = withHash({
      schemaVersion: "run-event.slice07.v0", sequence: ++sequence, eventType, attemptId,
      previousEventHash, occurredAt: nowUtc(now), payloadSha256: sha256(canonicalBytes(payload)),
    });
    await appendFile(ledgerPath, canonicalBytes(event), { flag: "a" });
    const handle = await open(ledgerPath, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    previousEventHash = event.contentHash;
    return event;
  };

  try {
    for (const entry of cases) {
      for (let repetition = 1; repetition <= 3; repetition += 1) {
        const attemptId = `s07.${operation}.${entry.sourceId}.r${repetition}`;
        const requestId = `request.${attemptId}`;
        const request = withHash({
          schemaVersion: "local-run-request.slice07.v0", requestId, attemptId, operation,
          sourceId: entry.sourceId, repetition, disposition: entry.disposition,
          expectedStableErrorCode: entry.expectedStableErrorCode, evidenceBoundary: AXES,
        });
        await durableJson(path.join(resultsRoot, "requests", `${attemptId}.json`), request);
        await appendEvent("attempt-started", attemptId, request);
        let execution = null;
        let error = null;
        try {
          execution = await executeCase({
            attemptId, operation, sourceId: entry.sourceId, repetition,
            workerRequest: structuredClone(entry.workerRequest), expected: structuredClone(entry.expected),
          });
        } catch (cause) {
          error = cause;
        }

        if (entry.disposition === "rejection") {
          const actualCode = typeof error?.code === "string" ? error.code : null;
          const status = actualCode === entry.expectedStableErrorCode && error?.workerObservation == null ? "pass" : "non-pass";
          const result = withHash({
            schemaVersion: "run-result.slice07.v0", resultId: `result.${attemptId}`, requestId, attemptId,
            operation, sourceId: entry.sourceId, repetition, disposition: entry.disposition, status, actualCode,
            closureRef: null, fileSha256: null, decodedPixelSha256: null, workerExitConfirmed: false,
            evidenceBoundary: AXES,
          });
          await durableJson(path.join(resultsRoot, "records", `${attemptId}.json`), result);
          await appendEvent("attempt-terminal", attemptId, result);
          results.push(result);
          continue;
        }

        const isConformanceNonPass = error instanceof Slice07GateBError && CONFORMANCE_CODES.has(error.code)
          && error.candidateOutput?.outputBytes instanceof Uint8Array && error.workerObservation?.exitConfirmed === true;
        if (error && !isConformanceNonPass) throw error;
        if (!error && (!execution || !(execution.outputBytes instanceof Uint8Array)
          || execution.workerObservation?.exitConfirmed !== true)) {
          throw new Slice07GateBError("S07_RUNNER_EXECUTION_INVALID", "applicable execution returned an incomplete closed result");
        }
        const candidate = error ? error.candidateOutput : execution;
        const outputBytes = Buffer.from(candidate.outputBytes);
        const closureId = `closure.${attemptId}`;
        const classification = error ? "candidate-non-pass" : "artifact-pass";
        const fileExtension = error ? "bin" : "png";
        const outputRelativePath = `closures/${attemptId}/output.${fileExtension}`;
        const oracleFactsSha256 = error ? null : sha256(canonicalBytes(execution.oracleFacts));
        const workerRecord = withHash({
          schemaVersion: "worker-record.slice07.v0", attemptId,
          messageSha256: candidate.workerMessageSha256,
          runtimeSha256: candidate.workerRuntimeSha256,
          runtime: structuredClone(candidate.workerRuntime),
          telemetry: structuredClone(candidate.workerTelemetry),
          lifecycle: structuredClone(error?.workerObservation ?? execution.workerObservation),
          evidenceBoundary: AXES,
        });
        const closure = withHash({
          schemaVersion: "artifact-closure.slice07.v0", closureId, requestId, attemptId, operation,
          sourceId: entry.sourceId, repetition, classification, outputRelativePath,
          outputByteLength: outputBytes.length, outputFileSha256: sha256(outputBytes),
          decodedPixelSha256: entry.expected.decodedPixelSha256, oracleFactsSha256,
          workerMessageSha256: candidate.workerMessageSha256,
          workerRuntimeSha256: candidate.workerRuntimeSha256,
          workerRecordSha256: sha256(canonicalBytes(workerRecord)),
          workerExitConfirmed: true, evidenceBoundary: AXES,
        });
        const result = withHash({
          schemaVersion: "run-result.slice07.v0", resultId: `result.${attemptId}`, requestId, attemptId,
          operation, sourceId: entry.sourceId, repetition, disposition: entry.disposition,
          status: error ? "non-pass" : "pass", actualCode: error?.code ?? null, closureRef: closureId,
          fileSha256: closure.outputFileSha256, decodedPixelSha256: closure.decodedPixelSha256,
          workerExitConfirmed: true, evidenceBoundary: AXES,
        });
        const stage = path.join(resultsRoot, ".staging", attemptId);
        const destination = path.join(resultsRoot, "closures", attemptId);
        await mkdir(stage);
        await writeFile(path.join(stage, `output.${fileExtension}`), outputBytes, { flag: "wx" });
        await durableJson(path.join(stage, "closure.json"), closure);
        await durableJson(path.join(stage, "worker.json"), workerRecord);
        if (!error) await durableJson(path.join(stage, "oracle.json"), execution.oracleFacts);
        await durableJson(path.join(stage, "result.json"), result);
        await appendEvent("publication-intent", attemptId, { closure, result });
        await syncDirectory(stage);
        await rename(stage, destination);
        await syncDirectory(path.join(resultsRoot, "closures"));
        await appendEvent("publication-complete", attemptId, { closureId, destination: `closures/${attemptId}` });
        await appendEvent("attempt-terminal", attemptId, result);
        results.push(result);
      }
    }

    await rmdir(path.join(resultsRoot, ".staging"));
    const sourceGroups = new Map();
    for (const result of results) {
      const group = sourceGroups.get(result.sourceId) ?? [];
      group.push(result);
      sourceGroups.set(result.sourceId, group);
    }
    let sourceThreeOfThreePasses = 0;
    let deterministicSources = 0;
    for (const group of sourceGroups.values()) {
      if (group.length === 3 && group.every((item) => item.status === "pass")) sourceThreeOfThreePasses += 1;
      const classifications = new Set(group.map((item) => `${item.status}:${item.actualCode ?? "none"}`));
      const files = new Set(group.map((item) => item.fileSha256 ?? "none"));
      const pixels = new Set(group.map((item) => item.decodedPixelSha256 ?? "none"));
      if (group.length === 3 && classifications.size === 1 && files.size === 1 && pixels.size === 1) deterministicSources += 1;
    }
    const passAttempts = results.filter((item) => item.status === "pass").length;
    const summary = withHash({
      schemaVersion: "operation-summary.slice07.v0", summaryId: `summary.s07.${operation}`,
      operation, plannedSources: 6, plannedAttempts: 18, terminalAttempts: results.length,
      passAttempts, nonPassAttempts: results.length - passAttempts,
      applicableArtifactPasses: results.filter((item) => item.disposition === "applicable" && item.status === "pass").length,
      rejectionExactPasses: results.filter((item) => item.disposition === "rejection" && item.status === "pass").length,
      sourceThreeOfThreePasses, deterministicSources, replacementCount: 0, protocolFailureCount: 0,
      evidenceBoundary: AXES,
    });
    const gateBPassed = passAttempts === 18 && summary.applicableArtifactPasses === 9
      && summary.rejectionExactPasses === 9 && sourceThreeOfThreePasses === 6 && deterministicSources === 6;
    const decision = withHash({
      schemaVersion: "gateb-decision.slice07.v0", decisionId: `decision.s07.${operation}`,
      operation, state: gateBPassed ? "pass" : "denied-closed-non-pass",
      summaryRef: summary.summaryId, gateBPassed, calibrationAuthorized: false, evidenceBoundary: AXES,
    });
    await durableJson(path.join(resultsRoot, "summary.json"), summary);
    await durableJson(path.join(resultsRoot, "decision.json"), decision);
    await syncDirectory(resultsRoot);
    return Object.freeze({ summary, decision, ledgerTail: previousEventHash });
  } catch (error) {
    throw error instanceof Slice07GateBError
      ? error
      : new Slice07GateBError("S07_RUNNER_PROTOCOL_FAILED", `operation runner stopped with a partial non-rerunnable root (${error?.message ?? "unknown"})`, { cause: error });
  }
}

function verifyHash(record) {
  if (!record || typeof record !== "object" || !/^[a-f0-9]{64}$/u.test(record.contentHash ?? "")) return false;
  const { contentHash, ...payload } = record;
  return contentHash === sha256(canonicalBytes(payload));
}

export async function validateSlice07GateBOperationTree({ resultsRoot, operation } = {}) {
  const issues = [];
  try {
    const files = await listFiles(resultsRoot);
    if (files.some((file) => file.startsWith(".staging/") || file.includes("..") || file.includes("\\"))) issues.push("FORBIDDEN_PATH");
    const requestFiles = files.filter((file) => file.startsWith("requests/") && file.endsWith(".json"));
    const recordFiles = files.filter((file) => file.startsWith("records/") && file.endsWith(".json"));
    const closureRecords = files.filter((file) => /^closures\/[^/]+\/result\.json$/u.test(file));
    if (requestFiles.length !== 18 || recordFiles.length + closureRecords.length !== 18) issues.push("DENOMINATOR_MISMATCH");
    const requests = [];
    const results = [];
    for (const file of [...requestFiles, ...recordFiles, ...closureRecords]) {
      const bytes = await readFile(path.join(resultsRoot, ...file.split("/")));
      const record = JSON.parse(bytes);
      if (!verifyHash(record) || record.operation !== operation) issues.push("RECORD_HASH_OR_OPERATION_MISMATCH");
      if (record.schemaVersion === "local-run-request.slice07.v0") requests.push(record);
      if (record.schemaVersion === "run-result.slice07.v0") results.push(record);
    }
    const requestByAttempt = new Map(requests.map((request) => [request.attemptId, request]));
    if (requestByAttempt.size !== 18 || new Set(results.map((result) => result.attemptId)).size !== 18) issues.push("ATTEMPT_IDENTITY_DUPLICATE");
    for (const result of results) {
      const request = requestByAttempt.get(result.attemptId);
      if (!request || request.requestId !== result.requestId || request.sourceId !== result.sourceId
        || request.repetition !== result.repetition || request.disposition !== result.disposition) {
        issues.push("REQUEST_RESULT_BINDING_MISMATCH");
      }
      if (result.closureRef !== null) {
        const directory = path.join(resultsRoot, "closures", result.attemptId);
        const closure = JSON.parse(await readFile(path.join(directory, "closure.json"), "utf8"));
        const output = await readFile(path.join(directory, closure.classification === "artifact-pass" ? "output.png" : "output.bin"));
        const workerBytes = await readFile(path.join(directory, "worker.json"));
        const worker = JSON.parse(workerBytes);
        if (!verifyHash(closure) || closure.closureId !== result.closureRef
          || !verifyHash(worker) || closure.workerRecordSha256 !== sha256(workerBytes)
          || closure.workerMessageSha256 !== worker.messageSha256 || closure.workerRuntimeSha256 !== worker.runtimeSha256
          || worker.lifecycle?.exitConfirmed !== true
          || closure.outputFileSha256 !== sha256(output) || closure.outputFileSha256 !== result.fileSha256) {
          issues.push("CLOSURE_BINDING_MISMATCH");
        }
      }
    }
    const ledgerLines = (await readFile(path.join(resultsRoot, "ledger.ndjson"), "utf8")).trim().split("\n");
    let previous = null;
    const eventCounts = { "attempt-started": 0, "publication-intent": 0, "publication-complete": 0, "attempt-terminal": 0 };
    for (let index = 0; index < ledgerLines.length; index += 1) {
      const event = JSON.parse(ledgerLines[index]);
      if (!verifyHash(event) || event.sequence !== index + 1 || event.previousEventHash !== previous) issues.push("LEDGER_CHAIN_INVALID");
      if (!Object.hasOwn(eventCounts, event.eventType) || !requestByAttempt.has(event.attemptId)) issues.push("LEDGER_EVENT_INVALID");
      else eventCounts[event.eventType] += 1;
      previous = event.contentHash;
    }
    const publishedCount = results.filter((result) => result.closureRef !== null).length;
    if (eventCounts["attempt-started"] !== 18 || eventCounts["attempt-terminal"] !== 18
      || eventCounts["publication-intent"] !== publishedCount || eventCounts["publication-complete"] !== publishedCount) {
      issues.push("LEDGER_EVENT_COUNT_INVALID");
    }
    const summary = JSON.parse(await readFile(path.join(resultsRoot, "summary.json"), "utf8"));
    const decision = JSON.parse(await readFile(path.join(resultsRoot, "decision.json"), "utf8"));
    const sourceGroups = new Map();
    for (const result of results) {
      const group = sourceGroups.get(result.sourceId) ?? [];
      group.push(result);
      sourceGroups.set(result.sourceId, group);
    }
    const derivedThreeOfThree = [...sourceGroups.values()].filter((group) => group.length === 3 && group.every((item) => item.status === "pass")).length;
    const derivedDeterministic = [...sourceGroups.values()].filter((group) => group.length === 3
      && new Set(group.map((item) => `${item.status}:${item.actualCode ?? "none"}`)).size === 1
      && new Set(group.map((item) => item.fileSha256 ?? "none")).size === 1
      && new Set(group.map((item) => item.decodedPixelSha256 ?? "none")).size === 1).length;
    if (!verifyHash(summary) || !verifyHash(decision) || summary.terminalAttempts !== 18
      || summary.passAttempts !== results.filter((item) => item.status === "pass").length
      || summary.nonPassAttempts !== results.filter((item) => item.status === "non-pass").length
      || summary.applicableArtifactPasses !== results.filter((item) => item.disposition === "applicable" && item.status === "pass").length
      || summary.rejectionExactPasses !== results.filter((item) => item.disposition === "rejection" && item.status === "pass").length
      || summary.sourceThreeOfThreePasses !== derivedThreeOfThree || summary.deterministicSources !== derivedDeterministic
      || decision.summaryRef !== summary.summaryId || decision.calibrationAuthorized !== false
      || decision.gateBPassed !== (summary.passAttempts === 18 && summary.applicableArtifactPasses === 9
        && summary.rejectionExactPasses === 9 && summary.sourceThreeOfThreePasses === 6 && summary.deterministicSources === 6)) {
      issues.push("SUMMARY_OR_DECISION_INVALID");
    }
    const expectedFiles = new Set(["decision.json", "ledger.ndjson", "summary.json"]);
    for (const request of requests) expectedFiles.add(`requests/${request.attemptId}.json`);
    for (const result of results) {
      if (result.closureRef === null) expectedFiles.add(`records/${result.attemptId}.json`);
      else {
        const base = `closures/${result.attemptId}`;
        expectedFiles.add(`${base}/closure.json`);
        expectedFiles.add(`${base}/worker.json`);
        expectedFiles.add(`${base}/result.json`);
        expectedFiles.add(`${base}/${result.status === "pass" ? "output.png" : "output.bin"}`);
        if (result.status === "pass") expectedFiles.add(`${base}/oracle.json`);
      }
    }
    if (files.length !== expectedFiles.size || files.some((file) => !expectedFiles.has(file))) issues.push("RESULT_FILE_ALLOWLIST_MISMATCH");
  } catch (error) {
    issues.push(`TREE_READ_FAILED:${error.code ?? error.name}`);
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze([...new Set(issues)]) });
}
