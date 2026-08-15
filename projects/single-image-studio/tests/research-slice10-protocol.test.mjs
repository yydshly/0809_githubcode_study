import assert from "node:assert/strict";
import test from "node:test";

import {
  SLICE10_EVIDENCE_BOUNDARY,
  SLICE10_PROTOCOL_SCHEMA_DOCUMENTS,
  buildSlice10CalibrationSummary,
  contentHashSlice10,
  createSlice10CalibrationAdmission,
  createSlice10CalibrationRequest,
  createSlice10CalibrationTerminal,
  validateSlice10CalibrationAdmission,
  validateSlice10CalibrationRequest,
  validateSlice10CalibrationSummary,
  validateSlice10CalibrationTerminal,
} from "../scripts/research-calibration-protocol-slice10.mjs";

const UTC0 = "2026-08-16T00:00:00.000Z";
const UTC1 = "2026-08-16T00:00:01.000Z";
const UTC2 = "2026-08-16T00:01:00.000Z";

function hash(seed) {
  return Buffer.from(String(seed)).toString("hex").padEnd(64, "0").slice(0, 64);
}

function ref(id, seed = id, path = `records/${id}.json`) {
  return { byteLength: 100, contentHash: hash(`c-${seed}`), fileSha256: hash(`f-${seed}`), id, path };
}

function admission(operation = "normalize") {
  return createSlice10CalibrationAdmission({
    admissionId: `calibration-admission.${operation}.test`,
    admittedAt: UTC0,
    operation,
    definitionRef: ref("DEFINITION-INDEX-SLICE10@0.10.0", "definition", "definition-index.v0.10.0.json"),
    candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.10.0", "candidate"),
    contractRef: ref(`CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`, `contract-${operation}`),
    preregistrationRef: ref(`PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`, `prereg-${operation}`),
    manifestRefs: [
      ref(`FM-S10-${operation.toUpperCase()}-DEV@0.10.0`, `manifest-${operation}-dev`),
      ref(`FM-S10-${operation.toUpperCase()}-DEFECT@0.10.0`, `manifest-${operation}-defect`),
    ],
    runtimeStartRef: ref("RUNTIME-OBSERVATION-SLICE10-START@0.10.0", "runtime-start"),
    slice09DecisionRef: ref(`decision.${operation}.slice09`, `decision-${operation}`),
    slice09SummaryRef: ref(`summary.${operation}.slice09`, `summary-${operation}`),
  });
}

function registeredCases(operation = "normalize") {
  return Array.from({ length: 48 }, (_, index) => {
    const dev = index < 30;
    const applicableLimit = dev ? 18 : 6;
    const withinPartition = dev ? index : index - 30;
    const disposition = withinPartition < applicableLimit ? "applicable" : "rejection";
    return {
      sourceId: `s10.${operation}.${dev ? "dev" : "defect"}.${String(withinPartition + 1).padStart(3, "0")}`,
      partition: dev ? "dev/calibration" : "defect/calibration",
      disposition,
      expectedStableErrorCode: disposition === "applicable" ? null : `S10_${operation.toUpperCase()}_EXPECTED_REJECTION`,
      manifestContentHash: hash(`manifest-${operation}-${dev ? "dev" : "defect"}`),
    };
  });
}

function terminalInputs(operation = "normalize", mutate = () => {}) {
  const admissionRecord = admission(operation);
  const cases = registeredCases(operation);
  const terminals = [];
  for (const [sourceIndex, item] of cases.entries()) {
    for (const repetition of [1, 2, 3]) {
      const manifestRef = ref(`FM-S10-${operation.toUpperCase()}-${item.partition === "dev/calibration" ? "DEV" : "DEFECT"}@0.10.0`, `${operation}-${item.partition}`);
      manifestRef.contentHash = item.manifestContentHash;
      const request = createSlice10CalibrationRequest({
        requestId: `request.s10.${operation}.${String(sourceIndex + 1).padStart(3, "0")}.r${repetition}`,
        operation,
        admissionRef: ref(admissionRecord.admissionId, `admission-${operation}`),
        candidateRef: ref("REG-NORM-SHARP-CANONICAL-PNG@0.10.0", "candidate"),
        contractRef: ref(`CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`, `contract-${operation}`),
        manifestRef,
        sourceRef: ref(item.sourceId, `source-${sourceIndex}`),
        goldIdentityRef: item.disposition === "applicable" ? ref(`gold.${item.sourceId}`, `gold-${sourceIndex}`) : null,
        runtimeRef: ref("RUNTIME-SHARP-CANONICAL-PNG@0.10.0", "runtime"),
        workerRef: {
          id: "WORKER-SHARP-RAW@0.10.0", implementationSha256: hash("worker"),
          path: "scripts/research-sharp-raw-worker-slice07.mjs", version: "0.10.0",
        },
        attempt: { sourceId: item.sourceId, partition: item.partition, repetition, attemptNumber: 1 },
        disposition: item.disposition,
        expectedStableErrorCode: item.expectedStableErrorCode,
        idempotencyKey: hash(`idempotency-${operation}-${sourceIndex}-${repetition}`),
        createdAt: UTC0,
      });
      const requestRef = {
        byteLength: 100, contentHash: request.contentHash, fileSha256: hash(`request-file-${sourceIndex}-${repetition}`),
        id: request.requestId, path: `requests/${request.requestId}.json`,
      };
      const fields = item.disposition === "applicable" ? {
        status: "pass", actualStableErrorCode: null, reasonCode: null, workerInvoked: true,
        workerExitConfirmed: true,
        artifactRef: ref(`artifact.${item.sourceId}.r${repetition}`, `artifact-file-${sourceIndex}`),
        oracleRef: ref(`oracle.${item.sourceId}.r${repetition}`, `oracle-${sourceIndex}`),
      } : {
        status: "pass", actualStableErrorCode: item.expectedStableErrorCode, reasonCode: null,
        workerInvoked: false, workerExitConfirmed: null, artifactRef: null, oracleRef: null,
      };
      mutate({ fields, item, repetition, sourceIndex, request });
      const terminal = createSlice10CalibrationTerminal({
        terminalId: `terminal.s10.${operation}.${String(sourceIndex + 1).padStart(3, "0")}.r${repetition}`,
        operation, disposition: item.disposition, requestRef, ...fields, startedAt: UTC1, finishedAt: UTC2,
      });
      terminals.push({ request, terminal });
    }
  }
  return { admissionRecord, cases, terminals };
}

function buildSummary(operation = "normalize", mutate = () => {}) {
  const { admissionRecord, cases, terminals } = terminalInputs(operation, mutate);
  return buildSlice10CalibrationSummary({
    operation,
    admissionRef: ref(admissionRecord.admissionId, `admission-${operation}`),
    preregistrationRef: ref(`PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`, `prereg-${operation}`),
    runtimeEndRef: ref("RUNTIME-OBSERVATION-SLICE10-END@0.10.0", "runtime-end"),
    registeredCases: cases,
    terminals,
    runtimeStableBeforeAndAfter: true,
    startedAt: UTC1,
    finishedAt: UTC2,
  });
}

test("Slice 10 admission is a new authority over exact immutable Slice 09 Gate-B lineage", () => {
  const value = admission("normalize");
  assert.equal(validateSlice10CalibrationAdmission(value), value);
  assert.equal(value.slice09GateBPassed, true);
  assert.equal(value.decision, "admitted-open-calibration");
  const drift = structuredClone(value);
  drift.slice09ResultTreeSha256 = hash("different-tree");
  drift.contentHash = contentHashSlice10(drift);
  assert.throws(() => validateSlice10CalibrationAdmission(drift), { code: "S10_CALIBRATION_ADMISSION_INVALID" });
});

test("Slice 10 requests freeze zero replacement, typed partitions and gold only for applicable cases", () => {
  const { terminals } = terminalInputs("normalize");
  const request = terminals[0].request;
  assert.equal(validateSlice10CalibrationRequest(request), request);
  const replacement = structuredClone(request);
  replacement.attempt.attemptNumber = 2;
  replacement.contentHash = contentHashSlice10(replacement);
  assert.throws(() => validateSlice10CalibrationRequest(replacement), { code: "S10_CALIBRATION_REQUEST_INVALID" });

  const rejectionTerminal = terminals.find(({ terminal }) => terminal.disposition === "rejection");
  const rejection = structuredClone(rejectionTerminal.request);
  rejection.goldIdentityRef = ref("gold.illegal", "illegal");
  rejection.contentHash = contentHashSlice10(rejection);
  assert.throws(() => validateSlice10CalibrationRequest(rejection), { code: "S10_CALIBRATION_REQUEST_INVALID" });
});

test("terminal pass semantics distinguish applicable artifact closure from worker-free exact rejection", () => {
  const { terminals } = terminalInputs("export");
  assert.ok(terminals.every(({ terminal }) => validateSlice10CalibrationTerminal(terminal) === terminal));
  const rejection = terminals.find(({ terminal }) => terminal.disposition === "rejection").terminal;
  const generic = structuredClone(rejection);
  generic.actualStableErrorCode = "ERR_INVALID_ARG_TYPE";
  generic.contentHash = contentHashSlice10(generic);
  assert.throws(() => validateSlice10CalibrationTerminal(generic), { code: "S10_CALIBRATION_TERMINAL_INVALID" });
});

test("complete 48x3 all-pass closure produces one formative calibration pass without evidence promotion", () => {
  const summary = buildSummary("normalize");
  assert.equal(validateSlice10CalibrationSummary(summary), summary);
  assert.equal(summary.registeredSourceCount, 48);
  assert.equal(summary.registeredAttemptCount, 144);
  assert.equal(summary.passAttemptCount, 144);
  assert.equal(summary.replacementAttemptCount, 0);
  assert.equal(summary.overallStatus, "calibration-complete-pass");
  assert.deepEqual(summary.evidenceBoundary, SLICE10_EVIDENCE_BOUNDARY);
});

test("one complete non-pass remains visible and cannot be averaged or majority-voted into pass", () => {
  const summary = buildSummary("normalize", ({ fields, sourceIndex, repetition }) => {
    if (sourceIndex === 0 && repetition === 2) {
      Object.assign(fields, {
        status: "non-pass", reasonCode: "S10_OUTPUT_ORACLE_REJECTED", actualStableErrorCode: null,
        artifactRef: null, oracleRef: null,
      });
    }
  });
  assert.equal(summary.passAttemptCount, 143);
  assert.equal(summary.nonPassAttemptCount, 1);
  assert.equal(summary.caseResults[0].allThreePass, false);
  assert.equal(summary.overallStatus, "calibration-complete-non-pass");
  const laundered = structuredClone(summary);
  laundered.caseResults[0].sourceId = laundered.caseResults[1].sourceId;
  laundered.contentHash = contentHashSlice10(laundered);
  assert.throws(() => validateSlice10CalibrationSummary(laundered), { code: "S10_CALIBRATION_SUMMARY_INVALID" });
});

test("missing, duplicate, cross-operation and partition shrinkage fail before a summary exists", () => {
  const { admissionRecord, cases, terminals } = terminalInputs("normalize");
  const args = {
    operation: "normalize",
    admissionRef: ref(admissionRecord.admissionId, "admission-normalize"),
    preregistrationRef: ref("PREREG-OPEN-CALIBRATION-NORMALIZE-PNG@0.10.0", "prereg-normalize"),
    runtimeEndRef: ref("RUNTIME-OBSERVATION-SLICE10-END@0.10.0", "runtime-end"),
    registeredCases: cases,
    terminals,
    runtimeStableBeforeAndAfter: true,
    startedAt: UTC1,
    finishedAt: UTC2,
  };
  assert.throws(() => buildSlice10CalibrationSummary({ ...args, terminals: terminals.slice(1) }), { code: "S10_CALIBRATION_SUMMARY_INVALID" });
  assert.throws(() => buildSlice10CalibrationSummary({ ...args, terminals: [...terminals.slice(0, -1), terminals[0]] }), { code: "S10_CALIBRATION_SUMMARY_INVALID" });
  const wrongCases = structuredClone(cases);
  wrongCases[29].partition = "defect/calibration";
  assert.throws(() => buildSlice10CalibrationSummary({ ...args, registeredCases: wrongCases }), { code: "S10_CALIBRATION_SUMMARY_INVALID" });
  assert.throws(() => buildSlice10CalibrationSummary({ ...args, operation: "export" }), { code: "S10_CALIBRATION_SUMMARY_INVALID" });
});

function inspectClosedSchema(schema, path = "$", issues = []) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return issues;
  if (schema.type === "object") {
    if (schema.additionalProperties !== false) issues.push(`${path}: object is open`);
    const names = Object.keys(schema.properties ?? {}).sort();
    const required = [...(schema.required ?? [])].sort();
    if (names.join("\0") !== required.join("\0")) issues.push(`${path}: required/properties differ`);
  }
  if (schema.type === "array" && !schema.items) issues.push(`${path}: array has no items`);
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties") for (const [name, child] of Object.entries(value)) inspectClosedSchema(child, `${path}.properties.${name}`, issues);
    else if (key === "items") inspectClosedSchema(value, `${path}.items`, issues);
    else if (key === "oneOf") value.forEach((child, index) => inspectClosedSchema(child, `${path}.oneOf[${index}]`, issues));
  }
  return issues;
}

test("all four Slice 10 protocol schemas use the exact namespace and recursively close objects and arrays", () => {
  assert.equal(Object.keys(SLICE10_PROTOCOL_SCHEMA_DOCUMENTS).length, 4);
  for (const [path, schema] of Object.entries(SLICE10_PROTOCOL_SCHEMA_DOCUMENTS)) {
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-10/${path}`);
    assert.deepEqual(inspectClosedSchema(schema), []);
  }
});
