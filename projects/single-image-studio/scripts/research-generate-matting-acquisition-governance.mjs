import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateJsonSchemaInstance } from "./research-validate-slice02.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const RESEARCH_ROOT = path.join(PROJECT_ROOT, "research");
export const MATTING_ACQUISITION_ROOT = path.join(RESEARCH_ROOT, "matting-governance", "acquisition-v0");
export const MATTING_ACQUISITION_FROZEN_AT = "2026-08-16T02:29:17.919Z";
const CANDIDATE_REGISTRY_PATH = path.join(RESEARCH_ROOT, "matting-candidates", "continuous-alpha-candidates.v0.json");
const CONTINUOUS_ALPHA_PLAN_PATH = path.join(RESEARCH_ROOT, "matting-evaluation", "continuous-alpha-v0", "plan.json");

const EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0,
  o1: 0, g1: 0, v1: 0, productSupport: false,
});
const SHA = { type: "string", pattern: "^[a-f0-9]{64}$" };
const STRING = { type: "string", minLength: 1, pattern: ".*\\S.*" };
const STRING_ARRAY = { type: "array", minItems: 1, items: STRING };
const ZERO_BOUNDARY = {
  type: "object", additionalProperties: false,
  required: ["c1", "u1", "e1", "r1Pipeline", "r1ProductValidation", "r1ProductRelease", "o1", "g1", "v1", "productSupport"],
  properties: {
    c1: { const: 0 }, u1: { const: 0 }, e1: { const: 0 }, r1Pipeline: { const: 0 },
    r1ProductValidation: { const: 0 }, r1ProductRelease: { const: 0 }, o1: { const: 0 },
    g1: { const: 0 }, v1: { const: 0 }, productSupport: { const: false },
  },
};
const RECORD_REF = {
  type: "object", additionalProperties: false,
  required: ["id", "path", "contentHash", "fileSha256"],
  properties: { id: STRING, path: STRING, contentHash: SHA, fileSha256: SHA },
};
const FILE_REF = {
  type: "object", additionalProperties: false,
  required: ["path", "fileSha256"], properties: { path: STRING, fileSha256: SHA },
};

export const MATTING_ACQUISITION_SCHEMAS = Object.freeze({
  "schemas/natural-person-data-governance.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "natural-person-data-governance.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "governanceId", "frozenAt", "state", "dataState", "population", "partitionPlan", "independencePolicy", "rightsPolicy", "privacyPolicy", "roleSeparation", "hardStops", "authorization", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "natural-person-data-governance.v0" }, governanceId: { const: "GOV-MATTE-NATURAL-PERSON@0.1.0" }, frozenAt: STRING,
      state: { const: "governance-frozen-material-not-selected" }, dataState: { const: "not-selected-not-created-not-downloaded" },
      population: {
        type: "object", additionalProperties: false,
        required: ["scope", "adultOnly", "personsPerImage", "realUserUploadsAllowed", "scrapedSourcesAllowed", "thirdPartyUnclearRightsAllowed", "sensitiveInferenceAllowed"],
        properties: {
          scope: { const: "consenting-adult-single-person-portrait-matting-research" }, adultOnly: { const: true }, personsPerImage: { const: "exactly-one" },
          realUserUploadsAllowed: { const: false }, scrapedSourcesAllowed: { const: false }, thirdPartyUnclearRightsAllowed: { const: false }, sensitiveInferenceAllowed: { const: false },
        },
      },
      partitionPlan: { type: "array", minItems: 5, maxItems: 5, items: { $ref: "#/$defs/partition" } },
      independencePolicy: STRING_ARRAY, rightsPolicy: STRING_ARRAY, privacyPolicy: STRING_ARRAY, roleSeparation: STRING_ARRAY, hardStops: STRING_ARRAY,
      authorization: {
        type: "object", additionalProperties: false,
        required: ["sourceSelectionAssigned", "sourceAcquisitionAuthorized", "holdoutCustodianAssigned", "formalBundleAuthorized"],
        properties: { sourceSelectionAssigned: { const: false }, sourceAcquisitionAuthorized: { const: false }, holdoutCustodianAssigned: { const: false }, formalBundleAuthorized: { const: false } },
      },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
    $defs: {
      partition: {
        type: "object", additionalProperties: false,
        required: ["partition", "evidenceRole", "formal", "visibility", "plannedMinimumIndependentSources", "materialState"],
        properties: {
          partition: { enum: ["dev", "holdout", "defect", "defect-holdout", "escape"] }, evidenceRole: STRING,
          formal: { type: "boolean" }, visibility: { enum: ["open-research", "sealed-custodian", "event-driven-private"] },
          plannedMinimumIndependentSources: { type: "integer", minimum: 0, maximum: 1000 }, materialState: { const: "not-created" },
        },
      },
    },
  },
  "schemas/model-acquisition-plan.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "model-acquisition-plan.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "planId", "frozenAt", "candidateId", "sourceRef", "artifact", "license", "integrityCapture", "preAcquisitionBlockers", "admission", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "model-acquisition-plan.v0" }, planId: STRING, frozenAt: STRING,
      candidateId: { enum: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"] },
      sourceRef: {
        type: "object", additionalProperties: false,
        required: ["repository", "refKind", "refName", "commit", "officialEvidence"],
        properties: { repository: STRING, refKind: { enum: ["branch", "tag"] }, refName: STRING, commit: { type: "string", pattern: "^[a-f0-9]{40}$" }, officialEvidence: STRING },
      },
      artifact: {
        type: "object", additionalProperties: false,
        required: ["fileName", "locatorState", "officialLocator", "expectedHost", "acquisitionState", "byteLengthState", "sha256State", "repositoryStorageAllowed"],
        properties: {
          fileName: STRING, locatorState: { enum: ["unresolved-official-direct-artifact", "resolved-official-release-url"] }, officialLocator: STRING,
          expectedHost: STRING, acquisitionState: { const: "not-downloaded" }, byteLengthState: { const: "pending-authorized-retrieval" },
          sha256State: { const: "pending-authorized-retrieval" }, repositoryStorageAllowed: { const: false },
        },
      },
      license: {
        type: "object", additionalProperties: false,
        required: ["spdx", "officialEvidence", "coverage", "distributionDecision"],
        properties: { spdx: { enum: ["Apache-2.0", "GPL-3.0-only"] }, officialEvidence: STRING, coverage: STRING, distributionDecision: STRING },
      },
      integrityCapture: STRING_ARRAY, preAcquisitionBlockers: STRING_ARRAY,
      admission: {
        type: "object", additionalProperties: false,
        required: ["acquisitionAuthorized", "oneTimeRetrievalIssued", "runtimeImportAllowed", "inferenceAllowed", "productDistributionAllowed"],
        properties: {
          acquisitionAuthorized: { const: false }, oneTimeRetrievalIssued: { const: false }, runtimeImportAllowed: { const: false },
          inferenceAllowed: { const: false }, productDistributionAllowed: { const: false },
        },
      },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
  "schemas/runtime-isolation-policy.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "runtime-isolation-policy.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "policyId", "frozenAt", "state", "environment", "network", "filesystem", "artifactHandling", "execution", "unresolvedBindings", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "runtime-isolation-policy.v0" }, policyId: { const: "POLICY-MATTE-MODEL-RUNTIME@0.1.0" }, frozenAt: STRING,
      state: { const: "policy-frozen-runtime-not-created" },
      environment: {
        type: "object", additionalProperties: false,
        required: ["kind", "pythonExactVersionState", "dependencyLockState", "sbomState", "hardwareProfileState", "deserializationPolicy"],
        properties: {
          kind: { const: "isolated-self-hosted-python-worker" }, pythonExactVersionState: { const: "pending-resolution" },
          dependencyLockState: { const: "not-created" }, sbomState: { const: "not-created" }, hardwareProfileState: { const: "not-created" },
          deserializationPolicy: { const: "version-specific-default-deny-no-unsafe-pickle-loading" },
        },
      },
      network: {
        type: "object", additionalProperties: false, required: ["runtimeNetwork", "automaticDownload", "torchHub", "remoteCode"],
        properties: { runtimeNetwork: { const: "disabled" }, automaticDownload: { const: false }, torchHub: { const: false }, remoteCode: { const: false } },
      },
      filesystem: STRING_ARRAY, artifactHandling: STRING_ARRAY,
      execution: {
        type: "object", additionalProperties: false,
        required: ["workerImplemented", "candidateAdapterImplemented", "resourceEnvelopeState", "inferenceAuthorized", "naturalImageRunAuthorized"],
        properties: {
          workerImplemented: { const: false }, candidateAdapterImplemented: { const: false }, resourceEnvelopeState: { const: "pending-benchmark" },
          inferenceAuthorized: { const: false }, naturalImageRunAuthorized: { const: false },
        },
      },
      unresolvedBindings: STRING_ARRAY, evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
  "schemas/acquisition-definition-index.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "acquisition-definition-index.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "definitionId", "frozenAt", "state", "sourceRefs", "governanceRef", "runtimePolicyRef", "candidatePlanRefs", "counts", "forbiddenMaterial", "nextAuthorizedAction", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "acquisition-definition-index.v0" }, definitionId: { const: "DEF-MATTE-ACQUISITION-GOVERNANCE@0.1.0" }, frozenAt: STRING,
      state: { const: "definition-frozen-results-zero-acquisition-not-authorized" },
      sourceRefs: { type: "array", minItems: 2, maxItems: 2, items: FILE_REF }, governanceRef: RECORD_REF, runtimePolicyRef: RECORD_REF,
      candidatePlanRefs: { type: "array", minItems: 2, maxItems: 2, items: RECORD_REF },
      counts: {
        type: "object", additionalProperties: false,
        required: ["schemas", "recordsExcludingIndex", "selectedNaturalImages", "downloadedModelArtifacts", "installedCandidateDependencies", "generatedResults"],
        properties: { schemas: { const: 4 }, recordsExcludingIndex: { const: 4 }, selectedNaturalImages: { const: 0 }, downloadedModelArtifacts: { const: 0 }, installedCandidateDependencies: { const: 0 }, generatedResults: { const: 0 } },
      },
      forbiddenMaterial: STRING_ARRAY, nextAuthorizedAction: { const: "resolve official artifact locators and dependency/runtime metadata without downloading model bytes or natural images" },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}
export function stableStringifyMattingAcquisition(value) { return JSON.stringify(stableValue(value)); }
function canonicalBytes(value) { return Buffer.from(`${stableStringifyMattingAcquisition(value)}\n`, "utf8"); }
export function sha256MattingAcquisition(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function withHash(record) {
  const value = { ...record, contentHash: "" }; const payload = { ...value }; delete payload.contentHash;
  value.contentHash = sha256MattingAcquisition(canonicalBytes(payload)); return value;
}
function fileRef(relativePath, bytes) { return { path: relativePath, fileSha256: sha256MattingAcquisition(bytes) }; }
function recordRef(id, relativePath, record, bytes) { return { id, path: relativePath, contentHash: record.contentHash, fileSha256: sha256MattingAcquisition(bytes) }; }
function treeDigest(fileMap) {
  const hash = createHash("sha256");
  for (const relativePath of [...fileMap.keys()].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const bytes = fileMap.get(relativePath); hash.update(relativePath); hash.update("\0"); hash.update(String(bytes.length)); hash.update("\0"); hash.update(sha256MattingAcquisition(bytes)); hash.update("\0");
  }
  return hash.digest("hex");
}

function naturalGovernanceRecord() {
  return withHash({
    schemaVersion: "natural-person-data-governance.v0", governanceId: "GOV-MATTE-NATURAL-PERSON@0.1.0", frozenAt: MATTING_ACQUISITION_FROZEN_AT,
    state: "governance-frozen-material-not-selected", dataState: "not-selected-not-created-not-downloaded",
    population: { scope: "consenting-adult-single-person-portrait-matting-research", adultOnly: true, personsPerImage: "exactly-one", realUserUploadsAllowed: false, scrapedSourcesAllowed: false, thirdPartyUnclearRightsAllowed: false, sensitiveInferenceAllowed: false },
    partitionPlan: [
      { partition: "dev", evidenceRole: "open-calibration-only", formal: false, visibility: "open-research", plannedMinimumIndependentSources: 24, materialState: "not-created" },
      { partition: "holdout", evidenceRole: "sealed-independent-c1", formal: true, visibility: "sealed-custodian", plannedMinimumIndependentSources: 24, materialState: "not-created" },
      { partition: "defect", evidenceRole: "open-defect-calibration-only", formal: false, visibility: "open-research", plannedMinimumIndependentSources: 12, materialState: "not-created" },
      { partition: "defect-holdout", evidenceRole: "sealed-independent-c1-qa", formal: true, visibility: "sealed-custodian", plannedMinimumIndependentSources: 12, materialState: "not-created" },
      { partition: "escape", evidenceRole: "event-driven-diagnostic-invalidation", formal: false, visibility: "event-driven-private", plannedMinimumIndependentSources: 0, materialState: "not-created" },
    ],
    independencePolicy: ["source family, person identity, capture session, near duplicate, crop, derivative, and sequence must not cross partitions", "dev and defect material cannot be promoted into holdout denominators", "escape is append-only invalidation evidence and never a success denominator"],
    rightsPolicy: ["per-source written research-processing permission is mandatory", "public-display and commercial-use permission are separate and default false", "withdrawal and deletion procedure must be recorded before acquisition", "dataset or photographer terms must be pinned per source"],
    privacyPolicy: ["store pseudonymous source IDs only; no names, accounts, contact details, or inferred sensitive attributes", "encrypt source material at rest and in transit", "do not infer age, ethnicity, health, identity, emotion, or other sensitive traits", "first natural-person population is consenting adults only; no minors"],
    roleSeparation: ["source curator cannot author candidate thresholds or holdout decisions", "holdout custodian cannot implement candidate or oracle", "gold author, threshold author, candidate author, and final reviewer must be independently assigned"],
    hardStops: ["no real user upload", "no scraped social-media or search-engine image", "no unclear license or consent", "no source selection before privacy and rights review", "no holdout creation before final candidate and preregistration freeze"],
    authorization: { sourceSelectionAssigned: false, sourceAcquisitionAuthorized: false, holdoutCustodianAssigned: false, formalBundleAuthorized: false }, evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
}

function acquisitionPlan(candidateId) {
  const modnet = candidateId === "REG-MATTE-MODNET@0.1.0";
  return withHash({
    schemaVersion: "model-acquisition-plan.v0", planId: modnet ? "PLAN-ACQUIRE-MODNET@0.1.0" : "PLAN-ACQUIRE-RVM-MOBILENETV3@0.1.0", frozenAt: MATTING_ACQUISITION_FROZEN_AT, candidateId,
    sourceRef: modnet
      ? { repository: "https://github.com/ZHKKKe/MODNet", refKind: "branch", refName: "master", commit: "28165a451e4610c9d77cfdf925a94610bb2810fb", officialEvidence: "https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md" }
      : { repository: "https://github.com/PeterL1n/RobustVideoMatting", refKind: "tag", refName: "v1.0.0", commit: "17d1774b032fd503bfe53c57d295db719f9e3da1", officialEvidence: "https://github.com/PeterL1n/RobustVideoMatting/releases/tag/v1.0.0" },
    artifact: modnet
      ? { fileName: "modnet_photographic_portrait_matting.ckpt", locatorState: "unresolved-official-direct-artifact", officialLocator: "https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md#portrait-image-matting", expectedHost: "pending-resolution", acquisitionState: "not-downloaded", byteLengthState: "pending-authorized-retrieval", sha256State: "pending-authorized-retrieval", repositoryStorageAllowed: false }
      : { fileName: "rvm_mobilenetv3.pth", locatorState: "resolved-official-release-url", officialLocator: "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth", expectedHost: "github.com-or-release-assets.githubusercontent.com", acquisitionState: "not-downloaded", byteLengthState: "pending-authorized-retrieval", sha256State: "pending-authorized-retrieval", repositoryStorageAllowed: false },
    license: modnet
      ? { spdx: "Apache-2.0", officialEvidence: "https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md#license", coverage: "official README covers repository code, models, and demos except doc/gif", distributionDecision: "pending artifact hash, dependency SBOM, attribution, and distribution review" }
      : { spdx: "GPL-3.0-only", officialEvidence: "https://github.com/PeterL1n/RobustVideoMatting/tree/17d1774b032fd503bfe53c57d295db719f9e3da1", coverage: "official repository and release publish source and pretrained model assets under the project license boundary", distributionDecision: "research comparison only; product distribution blocked pending explicit GPL review" },
    integrityCapture: ["approved one-time request ID", "final resolved URL and redirect chain", "retrieval UTC and response content type", "byte length and SHA-256 before any model load", "license and notice files", "malware and unsafe-deserialization review", "exact dependency lock, SBOM, OS, hardware, and loader policy"],
    preAcquisitionBlockers: modnet
      ? ["official immutable direct checkpoint locator unresolved", "expected bytes and SHA-256 unknown", "exact Python and dependency lock not created", "SBOM and hardware profile not created", "safe checkpoint inspection policy not versioned", "acquisition authority not assigned"]
      : ["expected bytes and SHA-256 unknown", "exact Python and dependency lock not created", "SBOM and hardware profile not created", "safe checkpoint inspection policy not versioned", "single-frame empty-state adapter contract not implemented", "GPL product-distribution decision blocked", "acquisition authority not assigned"],
    admission: { acquisitionAuthorized: false, oneTimeRetrievalIssued: false, runtimeImportAllowed: false, inferenceAllowed: false, productDistributionAllowed: false }, evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
}

function runtimePolicyRecord() {
  return withHash({
    schemaVersion: "runtime-isolation-policy.v0", policyId: "POLICY-MATTE-MODEL-RUNTIME@0.1.0", frozenAt: MATTING_ACQUISITION_FROZEN_AT, state: "policy-frozen-runtime-not-created",
    environment: { kind: "isolated-self-hosted-python-worker", pythonExactVersionState: "pending-resolution", dependencyLockState: "not-created", sbomState: "not-created", hardwareProfileState: "not-created", deserializationPolicy: "version-specific-default-deny-no-unsafe-pickle-loading" },
    network: { runtimeNetwork: "disabled", automaticDownload: false, torchHub: false, remoteCode: false },
    filesystem: ["model vault must be outside repository and product roots", "one candidate per immutable read-only model path", "inputs and outputs use attempt-scoped temporary roots", "no symlink, junction, path traversal, or shared mutable cache", "candidate worker cannot read fixture labels or alpha ground truth"],
    artifactHandling: ["hash bytes before deserialization", "never execute remote code or import a checkpoint-provided module", "do not convert or rewrite original bytes before preserving acquisition identity", "derived formats require new IDs, hashes, licenses, and validation"],
    execution: { workerImplemented: false, candidateAdapterImplemented: false, resourceEnvelopeState: "pending-benchmark", inferenceAuthorized: false, naturalImageRunAuthorized: false },
    unresolvedBindings: ["exact Python version", "exact PyTorch and transitive packages", "platform wheels and hashes", "candidate loader implementation hash", "CPU/GPU hardware profile", "memory, time, output, and process-isolation limits"], evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
}

export async function buildMattingAcquisitionGovernanceBundle() {
  const candidateBytes = await readFile(CANDIDATE_REGISTRY_PATH); const planBytes = await readFile(CONTINUOUS_ALPHA_PLAN_PATH);
  const candidateRegistry = JSON.parse(candidateBytes); if (candidateRegistry.candidates.length !== 2) throw new TypeError("expected exact two-candidate registry");
  const fileMap = new Map(); for (const [relative, schema] of Object.entries(MATTING_ACQUISITION_SCHEMAS)) fileMap.set(relative, canonicalBytes(schema));
  const governance = naturalGovernanceRecord(); const runtimePolicy = runtimePolicyRecord();
  const candidatePlans = candidateRegistry.candidates.map((candidate) => acquisitionPlan(candidate.registryId));
  const records = [
    ["natural-person-governance.json", governance.governanceId, governance],
    ["runtime-isolation-policy.json", runtimePolicy.policyId, runtimePolicy],
    ["modnet-acquisition-plan.json", candidatePlans[0].planId, candidatePlans[0]],
    ["rvm-acquisition-plan.json", candidatePlans[1].planId, candidatePlans[1]],
  ];
  const refs = [];
  for (const [relative, id, record] of records) { const bytes = canonicalBytes(record); fileMap.set(relative, bytes); refs.push(recordRef(id, relative, record, bytes)); }
  const index = withHash({
    schemaVersion: "acquisition-definition-index.v0", definitionId: "DEF-MATTE-ACQUISITION-GOVERNANCE@0.1.0", frozenAt: MATTING_ACQUISITION_FROZEN_AT,
    state: "definition-frozen-results-zero-acquisition-not-authorized",
    sourceRefs: [fileRef("../../matting-candidates/continuous-alpha-candidates.v0.json", candidateBytes), fileRef("../../matting-evaluation/continuous-alpha-v0/plan.json", planBytes)],
    governanceRef: refs[0], runtimePolicyRef: refs[1], candidatePlanRefs: refs.slice(2),
    counts: { schemas: 4, recordsExcludingIndex: 4, selectedNaturalImages: 0, downloadedModelArtifacts: 0, installedCandidateDependencies: 0, generatedResults: 0 },
    forbiddenMaterial: ["natural-person image bytes", "user uploads", "model or checkpoint bytes", "candidate dependency environment", "inference result", "holdout bundle", "product adapter or UI wiring"],
    nextAuthorizedAction: "resolve official artifact locators and dependency/runtime metadata without downloading model bytes or natural images", evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
  const indexBytes = canonicalBytes(index); fileMap.set("definition-index.json", indexBytes);
  const readme = Buffer.from("# Matting acquisition and natural-person governance v0\n\nState: definition-frozen / data-not-selected / models-not-downloaded / runtime-not-created / results-zero / non-C1 / non-product.\n\nThis tree contains governance and acquisition plans only. It contains no image, model, dependency environment, inference result, holdout bundle, or product wiring.\n", "utf8");
  fileMap.set("README.md", readme);
  const instances = [[governance, MATTING_ACQUISITION_SCHEMAS["schemas/natural-person-data-governance.v0.schema.json"]], [runtimePolicy, MATTING_ACQUISITION_SCHEMAS["schemas/runtime-isolation-policy.v0.schema.json"]], ...candidatePlans.map((record) => [record, MATTING_ACQUISITION_SCHEMAS["schemas/model-acquisition-plan.v0.schema.json"]]), [index, MATTING_ACQUISITION_SCHEMAS["schemas/acquisition-definition-index.v0.schema.json"]]];
  for (const [record, schema] of instances) { const issues = validateJsonSchemaInstance(record, schema); if (issues.length) throw new TypeError(`schema mismatch: ${JSON.stringify(issues)}`); }
  return Object.freeze({ fileMap, governance, runtimePolicy, candidatePlans, index, treeSha256: treeDigest(fileMap) });
}

export async function materializeMattingAcquisitionGovernance({ outputRoot = MATTING_ACQUISITION_ROOT } = {}) {
  const bundle = await buildMattingAcquisitionGovernanceBundle();
  for (const [relative, bytes] of bundle.fileMap) { const target = path.join(outputRoot, ...relative.split("/")); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: "wx" }); }
  return bundle;
}

async function readTree(root) {
  const map = new Map();
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name; const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) throw new TypeError(`unsupported tree entry: ${relative}`);
      if (entry.isDirectory()) await walk(absolute, relative); else map.set(relative, await readFile(absolute));
    }
  }
  await walk(root); return map;
}

function assertGovernanceSemantics(bundle) {
  const partitions = Object.fromEntries(bundle.governance.partitionPlan.map((item) => [item.partition, item]));
  if (partitions.dev.plannedMinimumIndependentSources !== 24 || partitions.holdout.plannedMinimumIndependentSources !== 24 || partitions.defect.plannedMinimumIndependentSources !== 12 || partitions["defect-holdout"].plannedMinimumIndependentSources !== 12 || partitions.escape.plannedMinimumIndependentSources !== 0) throw new TypeError("partition denominator drift");
  if (partitions.dev.formal || partitions.defect.formal || partitions.escape.formal || !partitions.holdout.formal || !partitions["defect-holdout"].formal) throw new TypeError("partition formal role drift");
  if (bundle.candidatePlans.some((item) => Object.values(item.admission).some(Boolean) || item.artifact.acquisitionState !== "not-downloaded")) throw new TypeError("candidate acquisition overclaim");
  if (bundle.candidatePlans[0].artifact.locatorState !== "unresolved-official-direct-artifact" || bundle.candidatePlans[1].artifact.locatorState !== "resolved-official-release-url") throw new TypeError("candidate locator state drift");
  if (Object.values(bundle.index.counts).some((value, index) => index > 1 && value !== 0)) throw new TypeError("definition must remain material and results zero");
}

export async function validateMattingAcquisitionGovernance({ outputRoot = MATTING_ACQUISITION_ROOT } = {}) {
  const expected = await buildMattingAcquisitionGovernanceBundle(); assertGovernanceSemantics(expected); const actual = await readTree(outputRoot);
  if (actual.size !== expected.fileMap.size) throw new TypeError("acquisition governance file count mismatch");
  for (const [relative, bytes] of expected.fileMap) if (!actual.has(relative) || !actual.get(relative).equals(bytes)) throw new TypeError(`acquisition governance drift: ${relative}`);
  for (const forbidden of ["results", "fixtures", "assets", "images", "models", "weights", "checkpoints", "dependencies", "node_modules", "holdout", "formal", "escape", "artifacts"]) {
    try { await stat(path.join(outputRoot, forbidden)); throw new TypeError(`forbidden governance path exists: ${forbidden}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const relative of actual.keys()) if (/\.(?:pth|pt|ckpt|onnx|safetensors|png|jpe?g|webp)$/i.test(relative)) throw new TypeError(`forbidden material file: ${relative}`);
  return Object.freeze({ valid: true, fileCount: actual.size, schemaCount: 4, recordCount: 5, selectedNaturalImages: 0, downloadedModelArtifacts: 0, installedCandidateDependencies: 0, generatedResults: 0, treeSha256: treeDigest(actual) });
}

export async function verifyTwoTempMattingAcquisitionGovernance() {
  const left = path.join(tmpdir(), `matting-acquisition-left-${process.pid}-${Date.now()}`); const right = path.join(tmpdir(), `matting-acquisition-right-${process.pid}-${Date.now()}`);
  const a = await materializeMattingAcquisitionGovernance({ outputRoot: left }); const b = await materializeMattingAcquisitionGovernance({ outputRoot: right });
  return Object.freeze({ identical: a.treeSha256 === b.treeSha256, treeSha256: a.treeSha256, fileCount: a.fileMap.size });
}

async function main() {
  if (process.argv[2] === "--write") { const bundle = await materializeMattingAcquisitionGovernance(); process.stdout.write(`${JSON.stringify({ written: true, fileCount: bundle.fileMap.size, treeSha256: bundle.treeSha256 }, null, 2)}\n`); }
  else if (process.argv[2] === "--validate") process.stdout.write(`${JSON.stringify(await validateMattingAcquisitionGovernance(), null, 2)}\n`);
  else if (process.argv[2] === "--verify-two-temp") process.stdout.write(`${JSON.stringify(await verifyTwoTempMattingAcquisitionGovernance(), null, 2)}\n`);
  else { process.stderr.write("Usage: node scripts/research-generate-matting-acquisition-governance.mjs --write|--validate|--verify-two-temp\n"); process.exitCode = 2; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
