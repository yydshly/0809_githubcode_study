import { createHash } from "node:crypto";

import {
  SLICE10_EVIDENCE_BOUNDARY,
  SLICE10_PROTOCOL_SCHEMA_DOCUMENTS,
  buildSlice10CalibrationSummary,
  contentHashSlice10,
  stableStringifySlice10,
  validateSlice10CalibrationRequest,
  validateSlice10CalibrationSummary,
  validateSlice10CalibrationTerminal,
} from "./research-calibration-protocol-slice10.mjs";
import {
  SLICE10_RUNNER_SCHEMA_DOCUMENTS,
} from "./research-calibration-runner-slice10.mjs";
import {
  SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS,
  validateSlice10RuntimeEndObservation,
} from "./research-runtime-observer-slice10.mjs";
import {
  createSlice10CalibrationAttemptExecutor,
  loadSlice10OperationDefinitionCases,
  verifySlice10FinalOutput,
} from "./research-calibration-case-slice10.mjs";
import { validateSlice05SchemaInstance } from "./research-validate-slice05.mjs";

const OPERATIONS = Object.freeze(["normalize", "export"]);
const GLOBAL_STOP = new Set(["protocol-failed", "inconclusive"]);
const SCHEMAS = Object.freeze({
  ...SLICE10_PROTOCOL_SCHEMA_DOCUMENTS,
  ...SLICE10_RUNNER_SCHEMA_DOCUMENTS,
  ...SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS,
});

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function digestFiles(files) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...files].sort(([left], [right]) => Buffer.from(left).compare(Buffer.from(right)))) {
    hash.update(relativePath); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0]));
    hash.update(sha256(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}
function issue(code, message, relativePath = null) { return Object.freeze({ code, message, path: relativePath }); }
function stableBytes(record, newline = true) {
  return Buffer.from(`${stableStringifySlice10(record)}${newline ? "\n" : ""}`, "utf8");
}
function same(left, right) { return stableStringifySlice10(left) === stableStringifySlice10(right); }
function refFor(record, relativePath, bytes) {
  return Object.freeze({
    path: relativePath,
    id: record.id ?? record.requestId ?? record.terminalId ?? record.summaryId,
    contentHash: record.contentHash,
    byteLength: bytes.length,
    fileSha256: sha256(bytes),
  });
}
function implementationFromCandidate(candidate) {
  const found = candidate?.implementationRefs?.find(({ id }) => id === "WORKER-SHARP-RAW@0.10.0");
  return found ? Object.freeze({
    id: found.id, version: "0.10.0", path: found.path, implementationSha256: found.sha256,
  }) : null;
}
function schemaPath(record) {
  return typeof record?.schemaVersion === "string" ? `schemas/${record.schemaVersion}.schema.json` : null;
}
function validateRecord(record, bytes, relativePath, issues, { newline = true, semantic = null } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    issues.push(issue("RESULT_RECORD_INVALID", "record is not an object", relativePath));
    return false;
  }
  const schema = SCHEMAS[schemaPath(record)];
  if (!schema) issues.push(issue("RESULT_SCHEMA_UNREGISTERED", "record schemaVersion is not registered", relativePath));
  else {
    try {
      const schemaIssues = validateSlice05SchemaInstance(record, schema, relativePath);
      if (schemaIssues.length) issues.push(issue("RESULT_SCHEMA_INVALID", schemaIssues[0]?.message ?? "schema validation failed", relativePath));
    } catch (error) {
      issues.push(issue("RESULT_SCHEMA_INVALID", error.message, relativePath));
    }
  }
  if (!/^[0-9a-f]{64}$/u.test(record.contentHash ?? "") || record.contentHash !== contentHashSlice10(record)) {
    issues.push(issue("RESULT_SELF_HASH_INVALID", "record self hash is invalid", relativePath));
  }
  if (!bytes.equals(stableBytes(record, newline))) {
    issues.push(issue("RESULT_CANONICAL_BYTES_INVALID", "record bytes are not canonical", relativePath));
  }
  try { semantic?.(record); } catch (error) {
    issues.push(issue(error?.code ?? "RESULT_SEMANTICS_INVALID", error.message, relativePath));
  }
  return true;
}

function parseJson(files, relativePath, issues, options = {}) {
  const bytes = files.get(relativePath);
  if (!bytes) {
    issues.push(issue("RESULT_FILE_MISSING", "required result file is absent", relativePath));
    return null;
  }
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); } catch {
    issues.push(issue("RESULT_JSON_INVALID", "result file is not JSON", relativePath));
    return null;
  }
  validateRecord(record, bytes, relativePath, issues, options);
  return Object.freeze({ record, bytes, ref: refFor(record, relativePath, bytes) });
}

function expectedRequestId(operation, sourceId, repetition) {
  return `request.s10.${operation}.${sourceId}.r${repetition}.a1`;
}
function expectedIdempotencyKey(operation, manifestHash, sourceId, repetition) {
  return sha256(Buffer.from([operation, manifestHash, sourceId, repetition, 1].join("\0")));
}
function sameRef(left, right) {
  return ["path", "id", "contentHash", "byteLength", "fileSha256"].every((key) => left?.[key] === right?.[key]);
}
function resultPath(operation, relativePath) { return `${operation}/${relativePath}`; }
function operationFiles(allFiles, operation) {
  const prefix = `${operation}/`;
  return new Map([...allFiles].filter(([entry]) => entry.startsWith(prefix)).map(([entry, bytes]) => [entry.slice(prefix.length), bytes]));
}
function operationDirectories(allDirectories, operation) {
  const prefix = `${operation}/`;
  return new Set([...allDirectories].filter((entry) => entry.startsWith(prefix)).map((entry) => entry.slice(prefix.length)));
}
function directoriesForAllowedFiles(allowed, { partial = false } = {}) {
  const result = new Set(["requests", "claims", "terminals", "closures"]);
  if (partial) result.add(".staging");
  for (const relativePath of allowed) {
    const parts = relativePath.split("/");
    for (let index = 1; index < parts.length; index += 1) result.add(parts.slice(0, index).join("/"));
  }
  return result;
}

function validateRequestBinding(request, { operation, item, repetition, index, workerRef }, issues, relativePath) {
  try { validateSlice10CalibrationRequest(request); } catch (error) {
    issues.push(issue(error.code ?? "RESULT_REQUEST_INVALID", error.message, relativePath));
    return;
  }
  const contractRef = index.contractRefs.find(({ id }) => id === `CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`);
  const expected = {
    requestId: expectedRequestId(operation, item.sourceRef.id, repetition),
    operation,
    admissionRef: index.admissionLineageRef,
    candidateRef: index.candidateRef,
    contractRef,
    manifestRef: item.manifestRef,
    sourceRef: item.sourceRef,
    goldIdentityRef: item.goldIdentityRef,
    runtimeRef: index.runtimeRef,
    workerRef,
    attempt: { sourceId: item.sourceRef.id, partition: item.partition, repetition, attemptNumber: 1 },
    disposition: item.disposition,
    expectedStableErrorCode: item.expectedStableErrorCode,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (!same(request[key], value)) issues.push(issue("RESULT_REQUEST_BINDING_INVALID", `request ${key} differs from frozen definition`, relativePath));
  }
  if (request.idempotencyKey !== expectedIdempotencyKey(operation, item.manifestRef.contentHash, item.sourceRef.id, repetition)) {
    issues.push(issue("RESULT_IDEMPOTENCY_INVALID", "request idempotency key is not derivable", relativePath));
  }
  if (request.createdAt < index.frozenAt) {
    issues.push(issue("RESULT_REQUEST_TIME_INVALID", "request predates the frozen definition", relativePath));
  }
}

function validateClaim(pair, requestPair, issues, relativePath) {
  if (!pair) return;
  const { record } = pair;
  if (record.id !== `claim.${requestPair.record.requestId}` || !sameRef(record.requestRef, requestPair.ref)
    || record.idempotencyKeyHash !== sha256(Buffer.from(requestPair.record.idempotencyKey))
    || record.claimedAt < requestPair.record.createdAt) {
    issues.push(issue("RESULT_CLAIM_BINDING_INVALID", "claim does not bind the exact request", relativePath));
  }
}

function validateTerminal(pair, requestPair, item, issues, relativePath) {
  if (!pair) return;
  const terminal = pair.record;
  try { validateSlice10CalibrationTerminal(terminal); } catch (error) {
    issues.push(issue(error.code ?? "RESULT_TERMINAL_INVALID", error.message, relativePath));
    return;
  }
  if (terminal.terminalId !== `terminal.${requestPair.record.requestId}`
    || terminal.operation !== requestPair.record.operation || terminal.disposition !== item.disposition
    || !sameRef(terminal.requestRef, requestPair.ref) || terminal.startedAt < requestPair.record.createdAt) {
    issues.push(issue("RESULT_TERMINAL_BINDING_INVALID", "terminal does not bind the exact request", relativePath));
  }
  if (item.disposition === "rejection" && terminal.status === "pass"
    && terminal.actualStableErrorCode !== item.expectedStableErrorCode) {
    issues.push(issue("RESULT_REJECTION_CODE_INVALID", "rejection pass does not use its frozen exact code", relativePath));
  }
}

function validateApplicableClosure({ files, requestPair, terminalPair, item, material, operation, index, allowed, issues }) {
  const requestId = requestPair.record.requestId;
  const base = `closures/${requestId}`;
  const paths = {
    output: `${base}/output.png`, artifact: `${base}/artifact.json`, oracle: `${base}/oracle.json`,
    publication: `${base}/publication.json`, terminal: `${base}/terminal.json`,
  };
  Object.values(paths).forEach((entry) => allowed.add(entry));
  const outputBytes = files.get(paths.output);
  if (!outputBytes) {
    issues.push(issue("RESULT_FILE_MISSING", "applicable pass output is absent", resultPath(operation, paths.output)));
    return null;
  }
  let oracleFacts;
  try { oracleFacts = verifySlice10FinalOutput({ operation, bytes: outputBytes, expected: material.expected }); } catch (error) {
    issues.push(issue(error.code ?? "RESULT_OUTPUT_ORACLE_REJECTED", error.message, resultPath(operation, paths.output)));
    return null;
  }
  const artifactPair = parseJson(files, paths.artifact, issues, { newline: true });
  const oraclePair = parseJson(files, paths.oracle, issues, { newline: true });
  const publicationPair = parseJson(files, paths.publication, issues, { newline: true });
  if (!artifactPair || !oraclePair || !publicationPair || !terminalPair) return publicationPair;
  const artifact = artifactPair.record;
  const oracle = oraclePair.record;
  const publication = publicationPair.record;
  const outputRef = Object.freeze({
    path: paths.output, id: `output.${requestId}`, contentHash: sha256(outputBytes),
    byteLength: outputBytes.length, fileSha256: sha256(outputBytes),
  });
  const contractRef = index.contractRefs.find(({ id }) => id === `CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`);
  if (artifact.id !== `artifact.${requestId}` || artifact.operation !== operation
    || !sameRef(artifact.requestRef, requestPair.ref) || !sameRef(artifact.candidateRef, index.candidateRef)
    || !sameRef(artifact.contractRef, contractRef) || !sameRef(artifact.runtimeRef, index.runtimeRef)
    || artifact.bytes.relativePath !== paths.output || artifact.bytes.byteLength !== outputBytes.length
    || artifact.bytes.fileSha256 !== sha256(outputBytes) || artifact.decodedPixelSha256 !== oracleFacts.decodedPixelSha256) {
    issues.push(issue("RESULT_ARTIFACT_BINDING_INVALID", "artifact record does not bind candidate bytes and frozen lineage", resultPath(operation, paths.artifact)));
  }
  const factsCanonicalJson = stableStringifySlice10(oracleFacts);
  const factsSha256 = sha256(Buffer.from(factsCanonicalJson));
  if (oracle.id !== `oracle-facts.${operation}.${oracleFacts.decodedPixelSha256}.${factsSha256}`
    || oracle.operation !== operation || oracle.decodedPixelSha256 !== oracleFacts.decodedPixelSha256
    || oracle.factsCanonicalJson !== factsCanonicalJson || oracle.factsSha256 !== factsSha256
    || oracle.strictDecision !== "pass") {
    issues.push(issue("RESULT_ORACLE_BINDING_INVALID", "oracle record cannot be reproduced from candidate bytes", resultPath(operation, paths.oracle)));
  }
  if (publication.id !== `publication.${requestId}` || !sameRef(publication.requestRef, requestPair.ref)
    || !sameRef(publication.artifactRef, outputRef) || !sameRef(publication.artifactRecordRef, artifactPair.ref)
    || !sameRef(publication.oracleRef, oraclePair.ref) || publication.publicationState !== "prepared-not-committed") {
    issues.push(issue("RESULT_PUBLICATION_BINDING_INVALID", "publication does not bind the exact five-file closure", resultPath(operation, paths.publication)));
  }
  if (!sameRef(terminalPair.record.artifactRef, outputRef) || !sameRef(terminalPair.record.oracleRef, oraclePair.ref)
    || terminalPair.record.status !== "pass" || terminalPair.record.workerInvoked !== true
    || terminalPair.record.workerExitConfirmed !== true) {
    issues.push(issue("RESULT_TERMINAL_CLOSURE_INVALID", "terminal does not bind the reopened artifact/oracle closure", resultPath(operation, paths.terminal)));
  }
  return publicationPair;
}

function validateLedger({ files, operation, attempts, allowed, issues }) {
  const relativePath = "ledger.ndjson";
  allowed.add(relativePath);
  const bytes = files.get(relativePath);
  if (!bytes) {
    issues.push(issue("RESULT_FILE_MISSING", "ledger is absent", resultPath(operation, relativePath)));
    return { count: 0, tail: null };
  }
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n") || text.includes("\r")) issues.push(issue("RESULT_LEDGER_BYTES_INVALID", "ledger must be LF-delimited canonical JSON", resultPath(operation, relativePath)));
  const lines = text.trimEnd().split("\n");
  const events = [];
  for (const [index, line] of lines.entries()) {
    let record;
    try { record = JSON.parse(line); } catch { issues.push(issue("RESULT_LEDGER_JSON_INVALID", "ledger line is not JSON", resultPath(operation, relativePath))); continue; }
    const lineBytes = Buffer.from(`${line}\n`);
    validateRecord(record, lineBytes, resultPath(operation, relativePath), issues, { newline: true });
    if (record.sequence !== index + 1 || record.id !== `event.s10.${operation}.${String(index + 1).padStart(4, "0")}`
      || record.previousEventHash !== (index === 0 ? null : events[index - 1]?.contentHash)) {
      issues.push(issue("RESULT_LEDGER_CHAIN_INVALID", "ledger sequence, identity or predecessor is invalid", resultPath(operation, relativePath)));
    }
    events.push(record);
  }
  const expected = [];
  for (const attempt of attempts) {
    expected.push(["attempt-started", attempt.request.ref, sha256(attempt.claim.bytes), attempt.claim.record.claimedAt]);
    if (attempt.publication) {
      expected.push(["publication-intent", attempt.request.ref, sha256(attempt.publication.bytes), attempt.publication.record.preparedAt]);
      expected.push(["publication-complete", attempt.request.ref, sha256(attempt.publication.bytes), attempt.publication.record.preparedAt]);
    }
    expected.push(["attempt-terminal", attempt.request.ref, sha256(attempt.terminal.bytes), attempt.terminal.record.finishedAt]);
  }
  if (events.length !== expected.length) issues.push(issue("RESULT_LEDGER_DENOMINATOR_INVALID", "ledger event count differs from the exact attempt history", resultPath(operation, relativePath)));
  for (let index = 0; index < Math.min(events.length, expected.length); index += 1) {
    const [eventType, requestRef, payloadSha256, notBefore] = expected[index];
    const event = events[index];
    if (event.eventType !== eventType || !sameRef(event.requestRef, requestRef) || event.payloadSha256 !== payloadSha256) {
      issues.push(issue("RESULT_LEDGER_EVENT_INVALID", "ledger event does not bind its exact durable payload", resultPath(operation, relativePath)));
    }
    if (index > 0 && event.occurredAt < events[index - 1].occurredAt) {
      issues.push(issue("RESULT_LEDGER_TIME_INVALID", "ledger time moved backwards", resultPath(operation, relativePath)));
    }
    if (event.occurredAt < notBefore) {
      issues.push(issue("RESULT_LEDGER_TIME_INVALID", "ledger event predates its durable payload", resultPath(operation, relativePath)));
    }
  }
  return { count: events.length, tail: events.at(-1)?.contentHash ?? null };
}

async function validateOperation({ operation, files, directories, index, definitionFiles, projectRoot, candidate, issues }) {
  const allowed = new Set();
  const loaded = await loadSlice10OperationDefinitionCases({ projectRoot, index, fileMap: definitionFiles, operation });
  const preflightOracle = createSlice10CalibrationAttemptExecutor({
    casesBySourceId: loaded.casesBySourceId,
    rawExecutor: { async execute() { throw Object.assign(new Error("candidate worker forbidden during result validation"), { code: "S10_VALIDATOR_WORKER_FORBIDDEN" }); } },
  });
  const workerRef = implementationFromCandidate(candidate);
  if (!workerRef) {
    issues.push(issue("RESULT_WORKER_REF_INVALID", "frozen worker implementation is absent"));
    return null;
  }
  const attempts = [];
  let missingReached = false;
  for (const item of loaded.cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const requestId = expectedRequestId(operation, item.sourceRef.id, repetition);
      const requestPath = `requests/${requestId}.json`;
      if (!files.has(requestPath)) { missingReached = true; continue; }
      if (missingReached) issues.push(issue("RESULT_ATTEMPT_PREFIX_INVALID", "attempt history is not a strict frozen-order prefix", resultPath(operation, requestPath)));
      allowed.add(requestPath);
      const requestPair = parseJson(files, requestPath, issues, { semantic: validateSlice10CalibrationRequest });
      if (!requestPair) continue;
      validateRequestBinding(requestPair.record, { operation, item, repetition, index, workerRef }, issues, resultPath(operation, requestPath));
      const claimPath = `claims/${requestId}.json`;
      allowed.add(claimPath);
      const claimPair = parseJson(files, claimPath, issues);
      validateClaim(claimPair, requestPair, issues, resultPath(operation, claimPath));
      const closureTerminalPath = `closures/${requestId}/terminal.json`;
      const standaloneTerminalPath = `terminals/${requestId}.json`;
      const inClosure = files.has(closureTerminalPath);
      const inStandalone = files.has(standaloneTerminalPath);
      if (inClosure === inStandalone) {
        issues.push(issue("RESULT_TERMINAL_CARDINALITY_INVALID", "request must have exactly one terminal location", resultPath(operation, requestId)));
        continue;
      }
      const terminalPath = inClosure ? closureTerminalPath : standaloneTerminalPath;
      allowed.add(terminalPath);
      const terminalPair = parseJson(files, terminalPath, issues, { semantic: validateSlice10CalibrationTerminal });
      validateTerminal(terminalPair, requestPair, item, issues, resultPath(operation, terminalPath));
      if (!claimPair || !terminalPair) continue;
      if (item.disposition === "rejection" && terminalPair.record.status === "pass") {
        try {
          const expectedRejection = await preflightOracle({ request: requestPair.record });
          if (expectedRejection.workerInvoked !== false
            || terminalPair.record.actualStableErrorCode !== expectedRejection.actualStableErrorCode) {
            issues.push(issue("RESULT_REJECTION_ORACLE_INVALID", "rejection terminal differs from independent preflight classification", resultPath(operation, terminalPath)));
          }
        } catch (error) {
          issues.push(issue(error.code ?? "RESULT_REJECTION_ORACLE_INVALID", error.message, resultPath(operation, terminalPath)));
        }
      }
      let publicationPair = null;
      if (inClosure) {
        if (item.disposition !== "applicable" || terminalPair.record.status !== "pass") {
          issues.push(issue("RESULT_CLOSURE_NOT_ALLOWED", "only an applicable pass may publish a closure", resultPath(operation, terminalPath)));
        } else {
          publicationPair = validateApplicableClosure({ files, requestPair, terminalPair, item, material: loaded.casesBySourceId.get(item.sourceRef.id), operation, index, allowed, issues });
        }
      }
      attempts.push(Object.freeze({ request: requestPair, claim: claimPair, terminal: terminalPair, publication: publicationPair }));
    }
  }
  if (attempts.length < 1) issues.push(issue("RESULT_ATTEMPT_DENOMINATOR_INVALID", "operation contains no registered attempt", operation));
  const lastTerminal = attempts.at(-1)?.terminal.record;
  const complete = attempts.length === 144;
  const globalStop = lastTerminal && GLOBAL_STOP.has(lastTerminal.status) ? Object.freeze({ status: lastTerminal.status, reasonCode: lastTerminal.reasonCode }) : null;
  if (!complete && !globalStop) issues.push(issue("RESULT_PARTIAL_WITHOUT_GLOBAL_STOP", "partial operation lacks a final protocol-failed/inconclusive terminal", operation));
  if (attempts.slice(0, -1).some(({ terminal }) => GLOBAL_STOP.has(terminal.record.status))) {
    issues.push(issue("RESULT_AFTER_GLOBAL_STOP", "attempts exist after a global stop terminal", operation));
  }
  const ledger = validateLedger({ files, operation, attempts, allowed, issues });
  let summaryPair = null;
  let runtimeEndPair = null;
  if (complete && !globalStop) {
    allowed.add("runtime-end.json");
    runtimeEndPair = parseJson(files, "runtime-end.json", issues, { newline: false, semantic: validateSlice10RuntimeEndObservation });
    allowed.add("summary.json");
    summaryPair = parseJson(files, "summary.json", issues, { semantic: validateSlice10CalibrationSummary });
    if (runtimeEndPair) {
      const runtimeStart = JSON.parse(definitionFiles.get(index.runtimeRef.path));
      const runtimeEnd = runtimeEndPair.record;
      if (!sameRef(runtimeEnd.runtimeStartRef, index.runtimeRef) || runtimeEnd.operation !== operation
        || runtimeEnd.inventoryCanonicalJson !== runtimeStart.inventoryCanonicalJson
        || runtimeEnd.inventoryPayloadSha256 !== runtimeStart.inventoryPayloadSha256
        || runtimeEnd.workerRuntimeCanonicalJson !== runtimeStart.workerRuntimeCanonicalJson
        || runtimeEnd.workerRuntimeSha256 !== runtimeStart.workerRuntimeSha256) {
        issues.push(issue("RESULT_RUNTIME_END_DRIFT", "runtime-end record differs from frozen start", resultPath(operation, "runtime-end.json")));
      }
    }
    if (summaryPair && runtimeEndPair) {
      const preregistrationRef = index.preregistrationRefs.find(({ id }) => id === `PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`);
      const registeredCases = loaded.cases.map((item) => ({
        sourceId: item.sourceRef.id, partition: item.partition, disposition: item.disposition,
        expectedStableErrorCode: item.expectedStableErrorCode, manifestContentHash: item.manifestRef.contentHash,
      }));
      let rebuilt;
      try {
        rebuilt = buildSlice10CalibrationSummary({
          operation, admissionRef: index.admissionLineageRef, preregistrationRef,
          runtimeEndRef: runtimeEndPair.ref, registeredCases,
          terminals: attempts.map(({ request, terminal }) => ({ request: request.record, terminal: terminal.record })),
          runtimeStableBeforeAndAfter: true, startedAt: summaryPair.record.startedAt, finishedAt: summaryPair.record.finishedAt,
        });
      } catch (error) {
        issues.push(issue(error.code ?? "RESULT_SUMMARY_REBUILD_FAILED", error.message, resultPath(operation, "summary.json")));
      }
      if (rebuilt && !same(rebuilt, summaryPair.record)) {
        issues.push(issue("RESULT_SUMMARY_REBUILD_MISMATCH", "summary cannot be reproduced from durable attempts", resultPath(operation, "summary.json")));
      }
      const lastFinishedAt = attempts.at(-1).terminal.record.finishedAt;
      const firstCreatedAt = attempts[0].request.record.createdAt;
      if (summaryPair.record.startedAt < index.frozenAt || summaryPair.record.startedAt > firstCreatedAt
        || runtimeEndPair.record.observedAt < lastFinishedAt || summaryPair.record.finishedAt < runtimeEndPair.record.observedAt) {
        issues.push(issue("RESULT_OPERATION_TIME_INVALID", "runtime-end/summary chronology is invalid", operation));
      }
    }
  } else {
    if (files.has("runtime-end.json") || files.has("summary.json")) {
      issues.push(issue("RESULT_PARTIAL_SUMMARY_FORBIDDEN", "partial/global-stop operation cannot publish runtime-end or summary", operation));
    }
  }
  for (const relativePath of files.keys()) {
    if (!allowed.has(relativePath)) issues.push(issue("RESULT_EXTRA_FILE", "unregistered result file", resultPath(operation, relativePath)));
  }
  const expectedDirectories = directoriesForAllowedFiles(allowed, { partial: !complete || Boolean(globalStop) });
  for (const relativePath of directories) {
    if (!expectedDirectories.has(relativePath)) issues.push(issue("RESULT_EXTRA_DIRECTORY", "unregistered result directory", resultPath(operation, relativePath)));
  }
  for (const relativePath of expectedDirectories) {
    if (!directories.has(relativePath)) issues.push(issue("RESULT_DIRECTORY_MISSING", "registered result directory is absent", resultPath(operation, relativePath)));
  }
  return Object.freeze({
    operation, complete, globalStop,
    status: summaryPair?.record.overallStatus ?? globalStop?.status ?? "invalid-partial",
    attempts: attempts.length,
    passAttempts: attempts.filter(({ terminal }) => terminal.record.status === "pass").length,
    nonPassAttempts: attempts.filter(({ terminal }) => terminal.record.status !== "pass").length,
    applicableClosures: attempts.filter(({ terminal }) => terminal.record.artifactRef !== null).length,
    ledgerEvents: ledger.count,
    ledgerTail: ledger.tail,
    treeSha256: digestFiles(files),
    summaryRef: summaryPair?.ref ?? null,
    runtimeEndRef: runtimeEndPair?.ref ?? null,
  });
}

export async function validateSlice10PostRun({
  resultFiles, resultDirectories = new Set(), definitionFiles, index, projectRoot, candidate,
} = {}) {
  const issues = [];
  if (!(resultFiles instanceof Map) || !(definitionFiles instanceof Map) || !index || !candidate) {
    return Object.freeze({ valid: false, issues: [issue("POSTRUN_INPUT_INVALID", "post-run validator input is incomplete")] });
  }
  const topLevel = new Set([...resultFiles.keys(), ...resultDirectories].map((entry) => entry.split("/")[0]));
  for (const entry of topLevel) if (!OPERATIONS.includes(entry)) issues.push(issue("RESULT_OPERATION_EXTRA", "only normalize/export result roots are registered", entry));
  const reports = {};
  if (!topLevel.has("normalize")) issues.push(issue("RESULT_NORMALIZE_MISSING", "registered run must start with normalize", "normalize"));
  else reports.normalize = await validateOperation({ operation: "normalize", files: operationFiles(resultFiles, "normalize"), directories: operationDirectories(resultDirectories, "normalize"), index, definitionFiles, projectRoot, candidate, issues });
  const normalizeStopped = reports.normalize?.globalStop !== null && reports.normalize?.globalStop !== undefined;
  if (normalizeStopped && topLevel.has("export")) issues.push(issue("RESULT_EXPORT_AFTER_GLOBAL_STOP", "export cannot run after normalize protocol uncertainty", "export"));
  if (!normalizeStopped && !topLevel.has("export")) issues.push(issue("RESULT_EXPORT_MISSING", "export result is required after ordinary normalize completion", "export"));
  if (!normalizeStopped && topLevel.has("export")) reports.export = await validateOperation({ operation: "export", files: operationFiles(resultFiles, "export"), directories: operationDirectories(resultDirectories, "export"), index, definitionFiles, projectRoot, candidate, issues });
  const attempted = Object.values(reports).reduce((sum, report) => sum + (report?.attempts ?? 0), 0);
  const closures = Object.values(reports).reduce((sum, report) => sum + (report?.applicableClosures ?? 0), 0);
  const evidenceBoundaryValid = stableStringifySlice10(index.evidenceBoundary) === stableStringifySlice10(SLICE10_EVIDENCE_BOUNDARY);
  if (!evidenceBoundaryValid) issues.push(issue("RESULT_EVIDENCE_BOUNDARY_INVALID", "definition evidence boundary was promoted"));
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    state: Object.values(reports).some((report) => report?.globalStop) ? "closed-protocol-uncertainty" : "closed-complete",
    reports: Object.freeze(reports),
    counts: Object.freeze({ operationRuns: Object.keys(reports).length, attempts: attempted, closures, files: resultFiles.size }),
    resultTreeSha256: digestFiles(resultFiles),
    calibrationAuthorized: false,
    formalEvidence: false,
    c1: 0,
    productSupport: false,
  });
}
