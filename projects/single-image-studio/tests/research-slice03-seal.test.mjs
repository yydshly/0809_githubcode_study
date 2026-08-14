import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_PROJECT_ROOT,
  discoverRepositoryRoot,
  hashDirectoryTree,
  sealRecord,
  sha256,
  validateFormalRunnerPath,
  validateFormalSealCeremony,
  validateRehearsalRunnerPath,
  validateRehearsalSealCeremony,
  validateSealCeremonySchemas,
} from "../scripts/research-seal-ceremony-slice03.mjs";

const TIMES = [
  "2026-08-15T08:00:00.000Z",
  "2026-08-15T08:01:00.000Z",
  "2026-08-15T08:02:00.000Z",
  "2026-08-15T08:03:00.000Z",
  "2026-08-15T08:04:00.000Z",
];

function hashes() {
  return {
    preregistrationSha256: sha256("slice03-preregistration"),
    contractSha256: sha256("slice03-contract"),
    candidateSha256: sha256("slice03-candidate"),
    runnerSha256: null,
    formatProfileSha256: sha256("slice03-format-profile"),
    qaProfileSha256: sha256("slice03-qa-profile"),
  };
}

function custodyEvent(base, previousEventSha256) {
  return sealRecord({ ...base, previousEventSha256, eventSha256: "" }, "eventSha256");
}

async function makeRehearsal() {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-seal-"));
  const bundleRoot = path.join(wrapper, "mock-bundle");
  const runnerPath = path.join(wrapper, "mock-runner.mjs");
  const rawResultPath = path.join(wrapper, "mock-result.json");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(bundleRoot));
  await writeFile(path.join(bundleRoot, "rehearsal-metadata.json"), "{\"ceremonyRehearsal\":true}\n", "utf8");
  const runnerBytes = "export const rehearsalOnly = true;\n";
  const resultBytes = "{\"status\":\"valid\",\"rehearsal\":true}\n";
  await writeFile(runnerPath, runnerBytes, "utf8");
  await writeFile(rawResultPath, resultBytes, "utf8");

  const frozenRefs = hashes();
  frozenRefs.runnerSha256 = sha256(runnerBytes);
  const roles = {
    custodianId: "mock.custodian",
    candidateAuthorIds: ["mock.candidate-author"],
    thresholdAuthorIds: ["mock.threshold-author"],
    qaProfileAuthorIds: ["mock.qa-author"],
    stoppingRuleAuthorIds: ["mock.stopping-author"],
    conflictDeclaration: "independent-no-conflict",
  };
  const rerunPolicy = {
    validResultRerunAllowed: false,
    allowedInvalidReasons: ["runner-crash-before-result", "custody-interruption", "integrity-check-failure"],
    maxInvalidReruns: 1,
    aggregationRule: "all-invalid-attempts-plus-first-valid",
  };
  const sealPlan = sealRecord({
    schemaVersion: "seal-ceremony-plan.v0",
    ceremonyRehearsal: true,
    sealPlanId: "mock.seal-plan",
    frozenAt: TIMES[0],
    candidateId: "mock.candidate",
    frozenRefs,
    evaluation: {
      denominator: { unit: "fixture", frozenCount: 4, exclusionRule: "none-after-unseal" },
      metrics: ["metric.fixture-pass-rate"],
      thresholds: [{ metricId: "metric.fixture-pass-rate", operator: "gte", target: 0.75 }],
      stoppingRule: "stop after the first valid result; never tune or rerun it",
    },
    rerunPolicy,
    roles,
    formalHoldoutStatus: "not-created",
    planSha256: "",
  }, "planSha256");
  const bundleManifest = sealRecord({
    schemaVersion: "seal-ceremony-bundle-manifest.v0",
    ceremonyRehearsal: true,
    bundleId: "mock.bundle",
    createdAt: TIMES[0],
    bundleRootPath: bundleRoot,
    assetCount: 0,
    rights: { eligibility: "project-original-rehearsal-metadata", recordSha256: sha256("mock-rights") },
    protection: { encryptedAtRest: true, encryptionScheme: "rehearsal-envelope-placeholder", integritySha256: await hashDirectoryTree(bundleRoot) },
    isolation: {
      sourceFamilyDigest: sha256("mock-source-family-set"),
      captureSessionDigest: sha256("mock-capture-session-set"),
      sourceFamilyCount: 0,
      captureSessionCount: 0,
      partitionIsolationPassed: true,
      custodianId: roles.custodianId,
      signedAt: TIMES[0],
    },
    formalHoldoutStatus: "not-created",
    manifestSha256: "",
  }, "manifestSha256");
  const requestRefs = { ...frozenRefs, sealPlanSha256: sealPlan.planSha256, bundleSha256: bundleManifest.manifestSha256 };
  const runRequest = sealRecord({
    schemaVersion: "seal-ceremony-run-request.v0",
    ceremonyRehearsal: true,
    requestId: "mock.request.1",
    rootRequestId: "mock.request.1",
    attemptNumber: 1,
    retryOfReceiptId: null,
    idempotencyKey: "mock.idempotency.1",
    requestedAt: TIMES[0],
    sealPlanId: sealPlan.sealPlanId,
    bundleId: bundleManifest.bundleId,
    runnerPath,
    executorId: "mock.executor",
    authorizedScope: { operation: "sealed-evaluation", singleUse: true, readOnlyBundle: true, networkAccess: false },
    frozenRefs: requestRefs,
    rerunPolicy,
    requestSha256: "",
  }, "requestSha256");
  const actions = ["sealed", "access-granted", "unsealed", "run-started", "run-completed"];
  const custodyEvents = [];
  let predecessor = null;
  for (let index = 0; index < actions.length; index += 1) {
    const event = custodyEvent({
      schemaVersion: "seal-ceremony-custody-event.v0",
      ceremonyRehearsal: true,
      eventId: `mock.custody.${index}`,
      bundleId: bundleManifest.bundleId,
      requestId: runRequest.requestId,
      receiptId: "mock.receipt.1",
      attemptNumber: 1,
      sequence: index,
      actorId: roles.custodianId,
      timestamp: TIMES[index],
      action: actions[index],
      reason: `rehearse ${actions[index]}`,
    }, predecessor);
    custodyEvents.push(event);
    predecessor = event.eventSha256;
  }
  const roleAttestation = {
    custodianId: roles.custodianId,
    candidateAuthorIds: roles.candidateAuthorIds,
    thresholdAuthorIds: roles.thresholdAuthorIds,
    qaProfileAuthorIds: roles.qaProfileAuthorIds,
    stoppingRuleAuthorIds: roles.stoppingRuleAuthorIds,
    conflictDetected: false,
    signedAt: TIMES[4],
  };
  const runReceipt = sealRecord({
    schemaVersion: "seal-ceremony-run-receipt.v0",
    ceremonyRehearsal: true,
    receiptId: "mock.receipt.1",
    requestId: runRequest.requestId,
    rootRequestId: runRequest.rootRequestId,
    attemptNumber: 1,
    idempotencyKey: runRequest.idempotencyKey,
    bundleId: bundleManifest.bundleId,
    custodianId: roles.custodianId,
    roleAttestation,
    execution: {
      unsealedAt: TIMES[2],
      startedAt: TIMES[3],
      completedAt: TIMES[4],
      outcome: "valid",
      invalidReason: null,
      rawResultPath,
    },
    frozenRefs: requestRefs,
    requestSha256: runRequest.requestSha256,
    custodyHeadSha256: custodyEvents.at(-1).eventSha256,
    receiptSha256: "",
  }, "receiptSha256");
  const resultSummary = sealRecord({
    schemaVersion: "seal-ceremony-result-summary.v0",
    ceremonyRehearsal: true,
    summaryId: "mock.summary.1",
    receiptId: runReceipt.receiptId,
    requestId: runRequest.requestId,
    rootRequestId: runRequest.rootRequestId,
    bundleId: bundleManifest.bundleId,
    attemptNumber: 1,
    status: "valid",
    invalidReason: null,
    metrics: [{ metricId: "metric.fixture-pass-rate", numerator: 4, denominator: 4, value: 1, passed: true }],
    aggregationRule: rerunPolicy.aggregationRule,
    priorReceiptIds: [],
    rawResultSha256: sha256(resultBytes),
    rawResultPath,
    summarySha256: "",
  }, "summarySha256");
  return {
    wrapper,
    ceremony: {
      sealPlan,
      bundleManifest,
      requests: [runRequest],
      receipts: [runReceipt],
      resultSummaries: [resultSummary],
      custodyEvents,
    },
  };
}

function issueCodes(result) {
  return new Set(result.issues.map((issue) => issue.code));
}

function relabelAsFormal(value) {
  if (Array.isArray(value)) return value.map(relabelAsFormal);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === "ceremonyRehearsal" ? false : relabelAsFormal(entry)]));
  return typeof value === "string" ? value.replaceAll("mock.", "formal.") : value;
}

function retagRehearsalAsFormal(ceremony) {
  const formal = relabelAsFormal(structuredClone(ceremony));
  formal.sealPlan = sealRecord(formal.sealPlan, "planSha256");
  formal.bundleManifest.formalHoldoutStatus = "sealed-external";
  formal.bundleManifest.rights.eligibility = "formal-custodian-cleared";
  formal.bundleManifest = sealRecord(formal.bundleManifest, "manifestSha256");
  const frozenRefs = { ...formal.sealPlan.frozenRefs, sealPlanSha256: formal.sealPlan.planSha256, bundleSha256: formal.bundleManifest.manifestSha256 };
  formal.requests = formal.requests.map((request) => sealRecord({ ...request, frozenRefs, requestSha256: "" }, "requestSha256"));
  let predecessor = null;
  formal.custodyEvents = formal.custodyEvents.map((event) => {
    const next = sealRecord({ ...event, previousEventSha256: predecessor, eventSha256: "" }, "eventSha256");
    predecessor = next.eventSha256;
    return next;
  });
  formal.receipts = formal.receipts.map((receipt, index) => {
    const completed = formal.custodyEvents.find((event) => event.requestId === formal.requests[index].requestId && event.action === "run-completed");
    return sealRecord({ ...receipt, frozenRefs, requestSha256: formal.requests[index].requestSha256, custodyHeadSha256: completed.eventSha256, receiptSha256: "" }, "receiptSha256");
  });
  formal.resultSummaries = formal.resultSummaries.map((summary) => sealRecord({ ...summary, summarySha256: "" }, "summarySha256"));
  return formal;
}

test("Slice 03 sealing schemas are recursively closed and a complete temp-only rehearsal passes", async () => {
  const schemaResult = await validateSealCeremonySchemas(undefined, { throwOnError: false });
  assert.equal(schemaResult.ok, true, JSON.stringify(schemaResult.issues));
  assert.equal(Object.keys(schemaResult.schemas).length, 6);
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.deepEqual(result.summary, { formalHoldoutStatus: "not-created", attempts: 1, custodyEvents: 5 });
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("formal and rehearsal APIs are explicit and formal validation rejects every rehearsal marker and mock ID", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const formal = await validateFormalSealCeremony(ceremony, { throwOnError: false });
    assert.equal(formal.ok, false);
    assert.ok(issueCodes(formal).has("FORMAL_REHEARSAL_MARKER_FORBIDDEN"));
    assert.ok(issueCodes(formal).has("FORMAL_MOCK_ID_FORBIDDEN"));
    assert.ok(issueCodes(formal).has("FORMAL_BUNDLE_NOT_SEALED"));
    assert.ok(issueCodes(formal).has("FORMAL_TRUSTED_PINS_REQUIRED"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("rehearsal rejects role overlap, frozen-chain tampering, reused idempotency keys, and broken custody predecessors", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    ceremony.sealPlan.roles.candidateAuthorIds = [ceremony.sealPlan.roles.custodianId];
    ceremony.sealPlan = sealRecord(ceremony.sealPlan, "planSha256");
    ceremony.requests[0].frozenRefs.candidateSha256 = sha256("post-freeze-candidate");
    ceremony.requests[0] = sealRecord(ceremony.requests[0], "requestSha256");
    ceremony.custodyEvents[2].previousEventSha256 = sha256("invented-predecessor");
    ceremony.custodyEvents[2] = sealRecord(ceremony.custodyEvents[2], "eventSha256");
    ceremony.requests.push({ ...ceremony.requests[0] });
    ceremony.receipts.push({ ...ceremony.receipts[0] });
    ceremony.resultSummaries.push({ ...ceremony.resultSummaries[0] });
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    const codes = issueCodes(result);
    assert.ok(codes.has("CUSTODIAN_ROLE_CONFLICT"));
    assert.ok(codes.has("REQUEST_FROZEN_CHAIN_MISMATCH"));
    assert.ok(codes.has("IDEMPOTENCY_KEY_REUSED"));
    assert.ok(codes.has("CUSTODY_PREDECESSOR_MISMATCH"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("a valid result cannot be selectively rerun", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const firstRequest = ceremony.requests[0];
    const firstReceipt = ceremony.receipts[0];
    const retry = sealRecord({
      ...firstRequest,
      requestId: "mock.request.2",
      attemptNumber: 2,
      retryOfReceiptId: firstReceipt.receiptId,
      idempotencyKey: "mock.idempotency.2",
      requestSha256: "",
    }, "requestSha256");
    const retryReceipt = sealRecord({
      ...firstReceipt,
      receiptId: "mock.receipt.2",
      requestId: retry.requestId,
      attemptNumber: 2,
      idempotencyKey: retry.idempotencyKey,
      requestSha256: retry.requestSha256,
      receiptSha256: "",
    }, "receiptSha256");
    const retrySummary = sealRecord({
      ...ceremony.resultSummaries[0],
      summaryId: "mock.summary.2",
      receiptId: retryReceipt.receiptId,
      requestId: retry.requestId,
      attemptNumber: 2,
      priorReceiptIds: [firstReceipt.receiptId],
      summarySha256: "",
    }, "summarySha256");
    ceremony.requests.push(retry);
    ceremony.receipts.push(retryReceipt);
    ceremony.resultSummaries.push(retrySummary);
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    assert.ok(issueCodes(result).has("VALID_RESULT_SELECTIVE_RERUN"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("run requests and receipts pin the exact seal plan so post-freeze threshold edits fail closed", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const requestShaBefore = ceremony.requests[0].requestSha256;
    ceremony.sealPlan.evaluation.thresholds[0].target = 0.1;
    ceremony.sealPlan.evaluation.stoppingRule = "post-run edited stopping rule";
    ceremony.sealPlan = sealRecord(ceremony.sealPlan, "planSha256");
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    assert.equal(ceremony.requests[0].requestSha256, requestShaBefore);
    assert.ok(issueCodes(result).has("REQUEST_FROZEN_CHAIN_MISMATCH"));
    assert.ok(issueCodes(result).has("RECEIPT_FROZEN_CHAIN_MISMATCH"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("custody is a request-bound per-attempt state machine, not just a valid predecessor hash chain", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const first = ceremony.custodyEvents[0];
    const completed = sealRecord({ ...ceremony.custodyEvents.at(-1), sequence: 1, previousEventSha256: first.eventSha256, eventSha256: "" }, "eventSha256");
    ceremony.custodyEvents = [first, completed];
    ceremony.receipts[0].custodyHeadSha256 = completed.eventSha256;
    ceremony.receipts[0] = sealRecord(ceremony.receipts[0], "receiptSha256");
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    assert.ok(issueCodes(result).has("CUSTODY_ATTEMPT_SEQUENCE_INVALID"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("ceremony timestamps cannot claim that the request or run preceded the frozen plan and bundle", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    ceremony.requests[0].requestedAt = "2026-08-14T08:00:00.000Z";
    ceremony.requests[0] = sealRecord(ceremony.requests[0], "requestSha256");
    ceremony.receipts[0].requestSha256 = ceremony.requests[0].requestSha256;
    ceremony.receipts[0] = sealRecord(ceremony.receipts[0], "receiptSha256");
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    assert.ok(issueCodes(result).has("CEREMONY_TIME_ORDER_INVALID"));
    assert.ok(issueCodes(result).has("CUSTODY_ACCESS_BEFORE_REQUEST") === false, "access is later than even the backdated request");
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("invalid reruns are limited to preregistered reasons and result history cannot be selectively omitted", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    ceremony.receipts[0].execution.outcome = "invalid";
    ceremony.receipts[0].execution.invalidReason = "operator-requested-tuning";
    ceremony.receipts[0] = sealRecord(ceremony.receipts[0], "receiptSha256");
    ceremony.resultSummaries[0].status = "invalid";
    ceremony.resultSummaries[0].invalidReason = "operator-requested-tuning";
    ceremony.resultSummaries[0].metrics = [];
    ceremony.resultSummaries[0].priorReceiptIds = ["mock.receipt.omitted"];
    ceremony.resultSummaries[0] = sealRecord(ceremony.resultSummaries[0], "summarySha256");
    const result = await validateRehearsalSealCeremony(ceremony, { throwOnError: false });
    const codes = issueCodes(result);
    assert.ok(codes.has("INVALID_REASON_NOT_FROZEN"));
    assert.ok(codes.has("RESULT_AGGREGATION_HISTORY_MISMATCH"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("runner paths use resolved boundaries: rehearsal is temp-only and formal rejects repository back-references", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const rehearsalRunner = await validateRehearsalRunnerPath(ceremony.requests[0].runnerPath);
    assert.equal(rehearsalRunner.ok, true);
    assert.ok(issueCodes(await validateFormalRunnerPath(ceremony.requests[0].runnerPath)).has("FORMAL_PATH_IN_TEMP"));
    const repoRunner = path.join(DEFAULT_PROJECT_ROOT, "scripts", "research-seal-ceremony-slice03.mjs");
    assert.equal((await validateRehearsalRunnerPath(repoRunner)).ok, false);
    assert.ok(issueCodes(await validateFormalRunnerPath(repoRunner)).has("FORMAL_PATH_IN_REPOSITORY"));

    const repositoryRoot = await discoverRepositoryRoot();
    const repositoryRootFile = path.join(repositoryRoot, "README.md");
    assert.ok(issueCodes(await validateFormalRunnerPath(repositoryRootFile)).has("FORMAL_PATH_IN_REPOSITORY"));
    assert.ok(issueCodes(await validateFormalRunnerPath(repositoryRootFile, { repositoryRoot: DEFAULT_PROJECT_ROOT })).has("FORMAL_PATH_IN_REPOSITORY"), "a narrower caller override cannot weaken discovered git-root isolation");
    assert.ok(issueCodes(await validateFormalRunnerPath(ceremony.requests[0].runnerPath, { tempRoot: repositoryRoot })).has("FORMAL_PATH_IN_TEMP"), "a caller override cannot redefine the system temp boundary");

    const junction = path.join(wrapper, "repository-junction");
    await symlink(repositoryRoot, junction, "junction");
    const backReference = path.join(junction, "README.md");
    const result = await validateFormalRunnerPath(backReference);
    assert.equal(result.ok, false);
    assert.ok(issueCodes(result).has("FORMAL_PATH_IN_REPOSITORY"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});

test("retagging temp rehearsal records cannot produce a formal ceremony, even with self-derived pins", async () => {
  const { wrapper, ceremony } = await makeRehearsal();
  try {
    const formal = retagRehearsalAsFormal(ceremony);
    const trustedPins = {
      expectedPlanSha256: formal.sealPlan.planSha256,
      expectedBundleSha256: formal.bundleManifest.manifestSha256,
      expectedCustodianId: formal.sealPlan.roles.custodianId,
    };
    const withoutPins = await validateFormalSealCeremony(formal, { throwOnError: false });
    assert.ok(issueCodes(withoutPins).has("FORMAL_TRUSTED_PINS_REQUIRED"));
    const withSelfDerivedPins = await validateFormalSealCeremony(formal, { throwOnError: false, trustedPins });
    assert.equal(withSelfDerivedPins.ok, false);
    assert.ok(issueCodes(withSelfDerivedPins).has("FORMAL_PATH_IN_TEMP"));
    const mismatchedPins = await validateFormalSealCeremony(formal, { throwOnError: false, trustedPins: { ...trustedPins, expectedPlanSha256: "0".repeat(64) } });
    assert.ok(issueCodes(mismatchedPins).has("FORMAL_PLAN_PIN_MISMATCH"));
  } finally {
    await rm(wrapper, { recursive: true, force: true });
  }
});
