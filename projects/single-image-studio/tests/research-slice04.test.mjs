import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  contentHashSlice04,
  DEFAULT_SLICE04_ROOT,
  generateSlice04,
  stableStringifySlice04,
} from "../scripts/research-generate-slice04.mjs";
import {
  CANONICAL_SLICE04_CANDIDATE_LOCK_HASH,
  CANONICAL_SLICE04_FROZEN_AT,
  CANONICAL_SLICE04_FULL_TREE_SHA256,
  CANONICAL_SLICE04_GENERATED_TREE_SHA256,
  CANONICAL_SLICE04_README_SHA256,
  CANONICAL_SLICE04_SCHEMA_TREE_SHA256,
  validateSlice04,
} from "../scripts/research-validate-slice04.mjs";

const PROJECT_ROOT = path.resolve(DEFAULT_SLICE04_ROOT, "../..");
const LITERAL_FROZEN_AT = "2026-08-15T00:20:45.916Z";
const LITERAL_CANDIDATE_HASH = "773c2a403a9cbeb418e6c1deb4ff7f6599165f444061e205a7a510376aeb1046";
const LITERAL_GENERATED_TREE = "5c851fa3233cac1ec7b140850091f6b575f8ce79046a5889239d3744a930973a";
const LITERAL_SCHEMA_TREE = "0be868b4206110e805c00f40ced132053b22d572a941fb094fe29590229b3b49";
const LITERAL_README_HASH = "9428d478f7c9d1ae1310eb96d5888fae5b6a2c626987937f2661e83645127551";
const LITERAL_FULL_TREE = "b916c0f18df6eb175d119673853cc929a9dcc6eb9621ead4e170874afc79ba29";
const SEAL_SCHEMA_PATHS = [
  "research/slice-03/schemas/seal-ceremony-bundle-manifest.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-custody-event.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-plan.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-result-summary.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-run-receipt.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-run-request.v0.schema.json",
];
const EXTERNAL_PATHS = [
  "research/slice-03/contracts/technical-observer.slice03.v0.3.0.json",
  "scripts/research-reference-adapters-slice03.mjs",
  "scripts/research-seal-ceremony-slice03.mjs",
  ...SEAL_SCHEMA_PATHS,
];

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

async function writeJson(root, relative, value) {
  await writeFile(path.join(root, relative), stableStringifySlice04(value), "utf8");
}

async function mutateRecord(root, relative, change) {
  const record = await readJson(root, relative);
  change(record);
  record.contentHash = contentHashSlice04(record);
  await writeJson(root, relative, record);
  return record;
}

async function tempCopy(t, prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const root = path.join(wrapper, "slice-04");
  await cp(DEFAULT_SLICE04_ROOT, root, { recursive: true });
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  return root;
}

async function tempProjectCopy(t, prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const projectRoot = path.join(wrapper, "single-image-studio");
  const sliceRoot = path.join(projectRoot, "research/slice-04");
  await mkdir(path.dirname(sliceRoot), { recursive: true });
  await cp(DEFAULT_SLICE04_ROOT, sliceRoot, { recursive: true });
  for (const relative of EXTERNAL_PATHS) {
    const target = path.join(projectRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(PROJECT_ROOT, relative), target);
  }
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  return { projectRoot, sliceRoot };
}

function codes(result) {
  return new Set(result.issues.map((issue) => issue.code));
}

function expectCodes(result, expected) {
  const actual = codes(result);
  for (const code of expected) assert.ok(actual.has(code), `${code}: ${JSON.stringify(result.issues)}`);
}

async function listFiles(root, base = "") {
  const entries = await readdir(path.join(root, base), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function digest(root, files) {
  const hash = createHash("sha256");
  for (const relative of [...files].sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

test("Slice 04 validates the exact 10-record metadata-only boundary and literal canonical pins", async () => {
  assert.equal(CANONICAL_SLICE04_FROZEN_AT, LITERAL_FROZEN_AT);
  assert.equal(CANONICAL_SLICE04_CANDIDATE_LOCK_HASH, LITERAL_CANDIDATE_HASH);
  assert.equal(CANONICAL_SLICE04_GENERATED_TREE_SHA256, LITERAL_GENERATED_TREE);
  assert.equal(CANONICAL_SLICE04_SCHEMA_TREE_SHA256, LITERAL_SCHEMA_TREE);
  assert.equal(CANONICAL_SLICE04_README_SHA256, LITERAL_README_HASH);
  assert.equal(CANONICAL_SLICE04_FULL_TREE_SHA256, LITERAL_FULL_TREE);
  const result = await validateSlice04();
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.summary, {
    records: 10,
    schemas: 7,
    candidateLocks: 1,
    compositeCandidates: 1,
    artifacts: 6,
    nativeVersions: 28,
    formatRows: 15,
    contracts: 2,
    partitionPlans: 2,
    partitionRows: 10,
    preregistrations: 2,
    sealIntents: 1,
    formalHoldoutStatus: "not-created",
    gateBState: "not-entered",
    candidateLockHash: LITERAL_CANDIDATE_HASH,
    generatedSubsetTreeHash: LITERAL_GENERATED_TREE,
    schemaTreeHash: LITERAL_SCHEMA_TREE,
    readmeHash: LITERAL_README_HASH,
    fullTreeHash: LITERAL_FULL_TREE,
  });
});

test("Slice 04 generator is byte-deterministic in two roots and pinned independently", async (t) => {
  const wrappers = await Promise.all([
    mkdtemp(path.join(tmpdir(), "single-image-slice04-test-a-")),
    mkdtemp(path.join(tmpdir(), "single-image-slice04-test-b-")),
  ]);
  t.after(() => Promise.all(wrappers.map((wrapper) => rm(wrapper, { recursive: true, force: true }))));
  const roots = wrappers.map((wrapper) => path.join(wrapper, "slice-04"));
  await Promise.all(roots.map((root) => generateSlice04({ sliceRoot: root })));
  const fileLists = await Promise.all(roots.map((root) => listFiles(root)));
  assert.deepEqual(fileLists[0], fileLists[1]);
  assert.equal(fileLists[0].length, 17);
  assert.deepEqual(await Promise.all(roots.map((root, index) => digest(root, fileLists[index]))), [LITERAL_GENERATED_TREE, LITERAL_GENERATED_TREE]);
  const schemaFiles = fileLists[0].filter((relative) => relative.startsWith("schemas/"));
  assert.equal(schemaFiles.length, 7);
  assert.equal(await digest(roots[0], schemaFiles), LITERAL_SCHEMA_TREE);
  for (const relative of fileLists[0]) {
    assert.deepEqual(await readFile(path.join(roots[0], relative)), await readFile(path.join(roots[1], relative)), relative);
  }
});

test("candidate synchronized self-hash drift cannot change exact artifact, integrity, version, graph, arm, native set, or execution state", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-candidate-");
  await mutateRecord(root, "candidate-locks/composite-sharp-win32-x64.v0.4.0.json", (candidate) => {
    candidate.artifacts[0].version = "latest";
    candidate.artifacts[0].npmIntegrity = "sha512-fake";
    candidate.artifacts[1].sha256 = "0".repeat(64);
    candidate.artifacts.splice(4, 1);
    delete candidate.bundledNativeVersionsSource.versions.webp;
    candidate.dependencyEdges.splice(0, 1);
    candidate.compositeCandidateCount = 2;
    candidate.comparisonArmIds.push("REG-NORM-LIBVIPS@0.4.0");
    candidate.installationState = "installed";
    candidate.executionState = "executed";
    candidate.gateBState = "entered";
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, [
    "CANDIDATE_CANONICAL_HASH_MISMATCH", "CANDIDATE_COUNT_INVALID", "CANDIDATE_ARTIFACT_SET_INVALID",
    "CANDIDATE_ARTIFACT_PIN_MISMATCH", "CANDIDATE_FLOATING_VERSION", "NATIVE_VERSION_SET_MISMATCH",
    "CANDIDATE_DEPENDENCY_GRAPH_INVALID", "CANDIDATE_STATE_OVERCLAIM", "SCHEMA_INSTANCE_INVALID",
  ]);
});

test("candidate provenance pins actual runtime, provenance-only packaging, raw metadata bytes, and 28 native licences", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-provenance-");
  await mutateRecord(root, "candidate-locks/composite-sharp-win32-x64.v0.4.0.json", (candidate) => {
    candidate.bundledNativeVersionsSource.metadataSources.versionsProperties.sha256 = "f".repeat(64);
    candidate.bundledNativeVersionsSource.metadataSources.thirdPartyNotices.byteLength += 1;
    candidate.bundledNativeVersionsSource.noticeSummary.componentLicenses[0].usedUnder = "unknown";
    candidate.artifacts[2].role = "bundled-runtime";
    candidate.dependencyEdges.at(-1).kind = "runtime";
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["CANDIDATE_ARTIFACT_PIN_MISMATCH", "NATIVE_PROVENANCE_OR_NOTICE_MISMATCH", "CANDIDATE_DEPENDENCY_GRAPH_INVALID", "BUNDLED_LIBVIPS_DOUBLE_COUNT_RISK"]);
});

test("format target rejects JPEG enabling, product support, PNG filter/interlace widening, and row drift", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-format-");
  await mutateRecord(root, "profiles/format-target.normalize-deliver.v0.4.0.json", (target) => {
    const jpeg = target.rows.find((row) => row.rowId === "input:jpeg");
    jpeg.disposition = "target-not-implemented";
    jpeg.reopenRequired = true;
    jpeg.productSupport = true;
    const png = target.rows.find((row) => row.rowId === "output:png");
    png.profile.pngFilterPolicy = "any-filter";
    png.profile.interlace = "allowed";
    [target.rows[0], target.rows[1]] = [target.rows[1], target.rows[0]];
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["FORMAT_ROW_SET_INVALID", "FORMAT_POLICY_MISMATCH", "CANONICAL_PNG_PROFILE_MISMATCH"]);
});

test("operation contracts keep new Slice 04 artifact types, exact metadata token, no adapter, passthrough, fallback, or support", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-contract-");
  await mutateRecord(root, "contracts/cc-cap02-export-png.v0.4.0.json", (contract) => {
    contract.input.type = "NormalizedImage.v0";
    contract.output.type = "DeliveryArtifact.v0";
    contract.output.metadataPolicy = "strip-except-required-srgb";
    contract.implementation.implementationState = "installed";
    contract.implementation.adapterRef = "scripts/fake-adapter.mjs";
    contract.implementation.adapterSha256 = "0".repeat(64);
    contract.implementation.passthroughAllowed = true;
    contract.implementation.fallbackAllowed = true;
    contract.implementation.actualOutputBytesReopenRequired = false;
    contract.productSupport = true;
    contract.gateBState = "entered";
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["CONTRACT_ID_OR_OPERATION_MISMATCH", "CONTRACT_IMPLEMENTATION_OVERCLAIM"]);
});

test("two operation plans pin suite, raw-source versus artifact populations, lifecycle counts, and formal C1 roles", async () => {
  const normalize = await readJson(DEFAULT_SLICE04_ROOT, "preregistrations/partition-plan.normalize-png.v0.4.0.json");
  const exportPlan = await readJson(DEFAULT_SLICE04_ROOT, "preregistrations/partition-plan.export-png.v0.4.0.json");
  for (const [plan, operation] of [[normalize, "normalize"], [exportPlan, "export"]]) {
    assert.equal(plan.operation, operation);
    assert.equal(plan.suiteId, "NORMALIZE-DELIVER");
    assert.equal(plan.suiteVersion, "0.4.0");
    assert.deepEqual(plan.lifecyclePlannedDenominators, { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18, escapeInitial: 0 });
    assert.deepEqual(plan.initialC1DecisionDenominators, { holdout: 30, defectHoldout: 18, total: 48, calibrationExcluded: true, escapeExcluded: true });
    assert.deepEqual(plan.partitions.map((row) => [row.partition, row.evidenceRole, row.formal, row.excludedFromInitialC1]), [
      ["dev/calibration", "open-calibration", false, true],
      ["holdout", "sealed-independent-c1", true, false],
      ["defect/calibration", "open-defect-calibration", false, true],
      ["defect/holdout", "sealed-independent-c1-qa", true, false],
      ["escape", "diagnostic-invalidation-ledger", false, true],
    ]);
  }
  assert.match(normalize.partitions[0].sourcePopulation, /raw source PNG bytes/u);
  assert.match(exportPlan.partitions[0].sourcePopulation, /NormalizedImage\.slice04\.v0 artifact/u);
});

test("partition plans reject calibration promotion, operation-strata substitution, denominator weakening, and role approval overclaim", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-plan-");
  await mutateRecord(root, "preregistrations/partition-plan.export-png.v0.4.0.json", (plan) => {
    plan.partitions[0].formal = true;
    plan.partitions[0].excludedFromInitialC1 = false;
    plan.partitions[1].sourcePopulation = "future raw source PNG bytes";
    plan.partitions[1].rejectionCategories[0].categoryId = "container-signature-or-crc-invalid";
    plan.denominatorPolicy.failureIncluded = false;
    plan.denominatorPolicy.timeoutIncluded = false;
    plan.isolation.captureSessionUniqueAcrossPartitions = false;
    plan.roleAssignmentState = "assigned";
    plan.approvalState = "approved";
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, [
    "PARTITION_ROLE_OR_COUNT_MISMATCH", "PARTITION_OPERATION_POPULATION_INVALID", "PARTITION_OPERATION_CATEGORY_MISMATCH",
    "PARTITION_OUTCOME_POLICY_INVALID", "PARTITION_ISOLATION_WEAKENED", "REVIEW_OR_ROLE_PLAN_INVALID",
  ]);
});

test("three-repeat evidence rejects majority voting, 2-of-3, valid non-pass replacement, and more than one invalid replacement per source", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-repeats-");
  await mutateRecord(root, "preregistrations/partition-plan.normalize-png.v0.4.0.json", (plan) => {
    plan.sourceLevelAggregation = "majority-of-three";
    plan.partitions[1].repeatPassRule.requiredValidPasses = 2;
    plan.partitions[1].repeatPassRule.majorityVoteAllowed = true;
    plan.partitions[1].repeatPassRule.validNonPassRerunAllowed = true;
    plan.partitions[1].repeatPassRule.maximumInvalidReplacementsPerSourceAcrossAllRepetitions = 3;
    plan.partitions[1].secondaryEstimands[0] = "at-most-one-invalid-replacement-per-planned-repetition";
    plan.partitions[1].invalidRunRule = "at most one replacement per affected planned repetition";
  });
  await mutateRecord(root, "preregistrations/preregistration.normalize-png.v0.4.0.json", (prereg) => {
    prereg.estimands.allThreePlannedRepetitionsMustPass = false;
    prereg.estimands.majorityVoteAllowed = true;
    prereg.rerunPolicy.maximumInvalidRerunsPerSource = 3;
    prereg.rerunPolicy.validNonPassMayBeReplacedOrOverwritten = true;
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["PARTITION_DENOMINATOR_MISMATCH", "PARTITION_REPEAT_AGGREGATION_INVALID", "PREREGISTRATION_RERUN_OR_ESTIMAND_INVALID"]);
});

test("escape remains an append-only diagnostic invalidation ledger with no success estimand or formal denominator", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-escape-");
  await mutateRecord(root, "preregistrations/partition-plan.export-png.v0.4.0.json", (plan) => {
    const escape = plan.partitions.at(-1);
    escape.formal = true;
    escape.excludedFromInitialC1 = false;
    escape.primaryEstimand = "success-rate";
    escape.confidenceMethod = "binomial-confidence";
    escape.categoryFloor = "at-least-one-pass";
    escape.overallThreshold = "0.95";
    escape.escapePolicy.appendOnly = false;
    escape.escapePolicy.reproductionAttemptsCountTowardC1 = true;
    escape.escapePolicy.escapeCanSupportSuccessOrEarlyStopping = true;
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["PARTITION_ROLE_OR_COUNT_MISMATCH", "ESCAPE_STATISTICAL_SCOPE_INVALID"]);
});

test("QA rejects Slice 03 as a direct oracle, candidate self-oracle, missing operation artifact schemas, and cancelled-rate slack", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-qa-");
  await mutateRecord(root, "preregistrations/qa-profile.normalize-deliver.v0.4.0.json", (qa) => {
    qa.oracle.source = "pinned-slice03-observer-is-direct-oracle";
    qa.oracle.designLineageRef.compatibilityState = "compatible";
    qa.oracle.candidateMaySelfCertify = true;
    qa.oracle.operationPrerequisites[1].artifactSchemaState = "created";
    qa.oracle.operationPrerequisites[1].independentGoldState = "candidate-output";
    qa.thresholds.cancelledRate.value = 0.1;
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["QA_ORACLE_INDEPENDENCE_INVALID", "QA_OPERATION_ORACLE_PREREQUISITE_INVALID", "QA_THRESHOLD_MISMATCH"]);
});

test("separate preregistrations reject wrong plan/oracle, role collision, valid reruns, threshold tuning, and removed outcomes", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-prereg-");
  await mutateRecord(root, "preregistrations/preregistration.export-png.v0.4.0.json", (prereg) => {
    prereg.partitionPlanRef.id = "PP-NORMALIZE-PNG@0.4.0";
    prereg.oraclePrerequisiteBinding.prerequisiteId = "ORACLE-PREREQ-NORMALIZE-PNG@0.4.0";
    prereg.roles.oracleAuthor = prereg.roles.candidateAuthor;
    prereg.roleGovernance.assignmentState = "assigned";
    prereg.rerunPolicy.validResultRerunAllowed = true;
    prereg.rerunPolicy.allowedInvalidReasons.push("observer-unavailable-before-result");
    prereg.rerunPolicy.failureCountsInDenominator = false;
    prereg.rerunPolicy.timeoutCountsInDenominator = false;
    prereg.stoppingRule.thresholdAdjustmentAfterObservationAllowed = true;
    prereg.thresholds.falseAllowRate.value = 0.2;
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, [
    "PREREGISTRATION_PLAN_BINDING_INVALID", "PREREGISTRATION_ORACLE_BINDING_INVALID", "ROLE_CONFLICT",
    "PREREGISTRATION_RERUN_OR_ESTIMAND_INVALID", "PREREGISTRATION_OUTCOME_DENOMINATOR_INVALID",
    "PREREGISTRATION_THRESHOLD_OR_STOPPING_DRIFT",
  ]);
});

test("seal intent rejects incompatible invalid enums, rehearsal mode, promoted runner/ledger/roles, and fabricated formal material", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-seal-");
  await mutateRecord(root, "preregistrations/seal-intent.normalize-deliver.v0.4.0.json", (seal) => {
    seal.sealPolicyRef.requiredMode = "rehearsal";
    seal.allowedInvalidReasons[0] = "observer-unavailable-before-result";
    seal.formalRunPrerequisites.actualRunnerState = "created";
    seal.formalRunPrerequisites.durableCrossProcessConsumedRequestLedgerState = "memory-only";
    seal.formalRunPrerequisites.roleAssignmentState = "assigned";
    seal.formalRunPrerequisites.formalRunBlocked = false;
    seal.requestStatus = "issued";
    seal.bundleId = "fake-bundle";
    seal.bundleSha256 = "0".repeat(64);
    seal.requestId = "fake-request";
    seal.seed = "fake-seed";
    seal.pixelSha256 = "1".repeat(64);
    seal.evidenceManifestId = "fake-evidence-pass";
    seal.evidenceManifestState = "pass";
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["SEAL_POLICY_PIN_INVALID", "SEAL_FORMAL_PREREQUISITE_OVERCLAIM", "SEAL_INTENT_STATE_INVALID", "SEAL_CONCRETE_MATERIAL_FORBIDDEN", "SCHEMA_INSTANCE_INVALID"]);
});

test("validator rejects extra files/directories, binary holdout material, reference drift, and unknown schema keywords", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-structure-");
  await mutateRecord(root, "contracts/cc-cap02-export-png.v0.4.0.json", (contract) => {
    contract.qaProfileRef.contentHash = "0".repeat(64);
  });
  await mkdir(path.join(root, "holdout"), { recursive: true });
  await writeFile(path.join(root, "holdout", "secret-seed.key"), "forbidden", "utf8");
  await writeFile(path.join(root, "contracts", "extra.json"), "{}\n", "utf8");
  const schemaPath = "schemas/format-target.slice04.v0.schema.json";
  const schema = await readJson(root, schemaPath);
  schema.maxLength = 1;
  await writeJson(root, schemaPath, schema);
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, [
    "FILE_SET_MISMATCH", "DIRECTORY_SET_MISMATCH", "FORBIDDEN_MATERIAL", "SCHEMA_KEYWORD_UNSUPPORTED",
    "SCHEMA_TREE_DIGEST_MISMATCH", "REFERENCE_HASH_MISMATCH", "FULL_TREE_DIGEST_MISMATCH",
  ]);
});

test("README is content-pinned and cannot carry a base64 image or private secret outside the generated subset", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-readme-");
  await writeFile(path.join(root, "README.md"), `${await readFile(path.join(root, "README.md"), "utf8")}\ndata:image/png;base64,iVBORw0KGgoFAKE\n-----BEGIN PRIVATE KEY-----\nfake\n`, "utf8");
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["README_HASH_MISMATCH", "README_FORBIDDEN_MATERIAL", "FULL_TREE_DIGEST_MISMATCH"]);
  assert.equal(result.summary.generatedSubsetTreeHash, LITERAL_GENERATED_TREE);
});

test("actual Slice 03 observer contract, implementation, and chronology are externally pinned", async (t) => {
  const { projectRoot, sliceRoot } = await tempProjectCopy(t, "single-image-slice04-observer-");
  await writeFile(path.join(projectRoot, "scripts/research-reference-adapters-slice03.mjs"), "// substituted observer\n", "utf8");
  const contractPath = "research/slice-03/contracts/technical-observer.slice03.v0.3.0.json";
  const contract = await readJson(projectRoot, contractPath);
  contract.frozenAt = "2026-08-15T00:14:00.000Z";
  await writeFile(path.join(projectRoot, contractPath), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
  const result = await validateSlice04(sliceRoot, { throwOnError: false, projectRoot });
  expectCodes(result, ["EXTERNAL_OBSERVER_CONTRACT_PIN_MISMATCH", "EXTERNAL_OBSERVER_IMPLEMENTATION_PIN_MISMATCH"]);
  const future = await validateSlice04(DEFAULT_SLICE04_ROOT, { throwOnError: false, nowMs: Date.parse(LITERAL_FROZEN_AT) - 1 });
  expectCodes(future, ["SLICE04_FREEZE_IN_FUTURE"]);
});

test("actual Slice 03 seal runner and six-schema tree cannot drift from the execution-envelope pin", async (t) => {
  const { projectRoot, sliceRoot } = await tempProjectCopy(t, "single-image-slice04-seal-external-");
  await writeFile(path.join(projectRoot, "scripts/research-seal-ceremony-slice03.mjs"), "// substituted seal runner\n", "utf8");
  await writeFile(path.join(projectRoot, SEAL_SCHEMA_PATHS[0]), `${await readFile(path.join(projectRoot, SEAL_SCHEMA_PATHS[0]), "utf8")}\n`, "utf8");
  const result = await validateSlice04(sliceRoot, { throwOnError: false, projectRoot });
  expectCodes(result, ["EXTERNAL_SEAL_IMPLEMENTATION_PIN_MISMATCH", "EXTERNAL_SEAL_SCHEMA_FILE_PIN_MISMATCH", "EXTERNAL_SEAL_SCHEMA_TREE_PIN_MISMATCH"]);
});

test("fixed generator pin catches synchronized schema-valid record drift", async (t) => {
  const root = await tempCopy(t, "single-image-slice04-generated-drift-");
  await mutateRecord(root, "preregistrations/preregistration.export-png.v0.4.0.json", (prereg) => {
    prereg.decisionToInform = prereg.decisionToInform.replace("after adapter calibration and Gate B", "after an unregistered shortcut");
  });
  const result = await validateSlice04(root, { throwOnError: false });
  expectCodes(result, ["SCHEMA_INSTANCE_INVALID", "CHECKED_IN_GENERATED_TREE_MISMATCH", "GENERATED_FILE_CONTENT_MISMATCH", "FULL_TREE_DIGEST_MISMATCH"]);
});
