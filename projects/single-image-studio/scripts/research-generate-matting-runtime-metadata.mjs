import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateJsonSchemaInstance } from "./research-validate-slice02.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const RESEARCH_ROOT = path.join(PROJECT_ROOT, "research");
export const MATTING_RUNTIME_METADATA_ROOT = path.join(RESEARCH_ROOT, "matting-governance", "runtime-metadata-v0");
export const MATTING_RUNTIME_METADATA_FROZEN_AT = "2026-08-16T03:46:26.424Z";

const PRIOR_SOURCES = Object.freeze([
  ["../acquisition-v0/definition-index.json", path.join(RESEARCH_ROOT, "matting-governance", "acquisition-v0", "definition-index.json")],
  ["../../matting-candidates/continuous-alpha-candidates.v0.json", path.join(RESEARCH_ROOT, "matting-candidates", "continuous-alpha-candidates.v0.json")],
  ["../../matting-evaluation/continuous-alpha-v0/plan.json", path.join(RESEARCH_ROOT, "matting-evaluation", "continuous-alpha-v0", "plan.json")],
]);

const SHA = { type: "string", pattern: "^[a-f0-9]{64}$" };
const UTC = { type: "string", pattern: "^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" };
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
const FILE_REF = {
  type: "object", additionalProperties: false, required: ["path", "fileSha256"],
  properties: { path: STRING, fileSha256: SHA },
};
const RECORD_REF = {
  type: "object", additionalProperties: false, required: ["id", "path", "contentHash", "fileSha256"],
  properties: { id: STRING, path: STRING, contentHash: SHA, fileSha256: SHA },
};
const OFFICIAL_FILE = {
  type: "object", additionalProperties: false,
    required: ["purpose", "url", "commit", "byteLength", "sha256", "sourceObservationRecordedAt", "bodyClass"],
  properties: {
    purpose: STRING, url: STRING, commit: { type: "string", pattern: "^[a-f0-9]{40}$" },
    byteLength: { type: "integer", minimum: 1, maximum: 1000000 }, sha256: SHA, sourceObservationRecordedAt: UTC,
    bodyClass: { const: "source-metadata-text-not-model-bytes" },
  },
};

export const MATTING_RUNTIME_METADATA_SCHEMAS = Object.freeze({
  "schemas/candidate-runtime-metadata.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "candidate-runtime-metadata.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "metadataId", "frozenAt", "candidateId", "state", "upstream", "officialFiles", "artifact", "dependencies", "loading", "license", "unresolvedBlockers", "authorization", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "candidate-runtime-metadata.v0" }, metadataId: STRING, frozenAt: UTC,
      candidateId: { enum: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"] },
      state: { const: "official-source-metadata-resolved-runtime-not-selected-artifact-not-requested" },
      upstream: {
        type: "object", additionalProperties: false, required: ["repository", "refKind", "refName", "commit", "retrievalDate"],
        properties: { repository: STRING, refKind: { enum: ["branch", "tag"] }, refName: STRING, commit: { type: "string", pattern: "^[a-f0-9]{40}$" }, retrievalDate: { const: "2026-08-16" } },
      },
      officialFiles: { type: "array", minItems: 3, maxItems: 5, items: OFFICIAL_FILE },
      artifact: {
        type: "object", additionalProperties: false,
        required: ["fileName", "locatorState", "officialLocator", "locatorImmutable", "expectedByteLengthState", "expectedSha256State", "requestState", "repositoryStorageAllowed"],
        properties: {
          fileName: STRING, locatorState: { enum: ["official-drive-folder-resolved-object-and-hash-unresolved", "official-release-url-resolved-by-fixed-hubconf-bytes-unpinned"] },
          officialLocator: STRING, locatorImmutable: { const: false }, expectedByteLengthState: { const: "unknown-not-requested" },
          expectedSha256State: { const: "unknown-not-requested" }, requestState: { const: "no-head-no-get-no-bytes" }, repositoryStorageAllowed: { const: false },
        },
      },
      dependencies: {
        type: "object", additionalProperties: false,
        required: ["declarationState", "declaredDirect", "operationSpecificLock", "pythonExactVersionState", "platformWheelSetState", "transitiveLockState", "packageHashState", "sbomState", "installedCount"],
        properties: {
          declarationState: { enum: ["partial-unpinned-import-and-demo-declarations", "fixed-requirements-file-plus-broad-hubconf-declaration"] },
          declaredDirect: STRING_ARRAY, operationSpecificLock: { const: false }, pythonExactVersionState: { const: "not-selected" },
          platformWheelSetState: { const: "not-selected" }, transitiveLockState: { const: "not-created" }, packageHashState: { const: "not-created" },
          sbomState: { const: "not-created" }, installedCount: { const: 0 },
        },
      },
      loading: {
        type: "object", additionalProperties: false,
        required: ["officialPattern", "automaticDownloadPresent", "unsafePickleCompatibleCallPresent", "singleImageContractObservation", "approvedLoaderState", "networkAtRuntime", "remoteCodeAllowed"],
        properties: {
          officialPattern: STRING, automaticDownloadPresent: { type: "boolean" }, unsafePickleCompatibleCallPresent: { const: true },
          singleImageContractObservation: STRING, approvedLoaderState: { const: "not-implemented" }, networkAtRuntime: { const: "disabled" }, remoteCodeAllowed: { const: false },
        },
      },
      license: {
        type: "object", additionalProperties: false, required: ["spdx", "officialFileSha256", "scopeObservation", "productDistributionState"],
        properties: { spdx: { enum: ["Apache-2.0", "GPL-3.0-only"] }, officialFileSha256: SHA, scopeObservation: STRING, productDistributionState: { const: "blocked-pending-independent-review" } },
      },
      unresolvedBlockers: STRING_ARRAY,
      authorization: {
        type: "object", additionalProperties: false,
        required: ["metadataHeadAuthorized", "bodyGetAuthorized", "dependencyInstallAuthorized", "checkpointLoadAuthorized", "inferenceAuthorized", "naturalImageAuthorized", "productUseAuthorized"],
        properties: {
          metadataHeadAuthorized: { const: false }, bodyGetAuthorized: { const: false }, dependencyInstallAuthorized: { const: false }, checkpointLoadAuthorized: { const: false },
          inferenceAuthorized: { const: false }, naturalImageAuthorized: { const: false }, productUseAuthorized: { const: false },
        },
      },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
  "schemas/safe-checkpoint-loader-policy.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "safe-checkpoint-loader-policy.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "policyId", "frozenAt", "state", "appliesTo", "preLoad", "isolation", "deserialization", "postLoad", "implementation", "hardStops", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "safe-checkpoint-loader-policy.v0" }, policyId: { const: "POLICY-MATTE-SAFE-CHECKPOINT-LOAD@0.1.0" }, frozenAt: UTC,
      state: { const: "policy-frozen-implementation-not-created-loading-forbidden" },
      appliesTo: { type: "array", minItems: 2, maxItems: 2, items: { enum: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"] } },
      preLoad: STRING_ARRAY, isolation: STRING_ARRAY, deserialization: STRING_ARRAY, postLoad: STRING_ARRAY,
      implementation: {
        type: "object", additionalProperties: false,
        required: ["loaderImplemented", "loaderImplementationSha256State", "runtimeSelected", "negativeTestsCreated", "artifactInspectionAuthorized", "modelConstructionAuthorized"],
        properties: {
          loaderImplemented: { const: false }, loaderImplementationSha256State: { const: "not-created" }, runtimeSelected: { const: false }, negativeTestsCreated: { const: false },
          artifactInspectionAuthorized: { const: false }, modelConstructionAuthorized: { const: false },
        },
      },
      hardStops: STRING_ARRAY, evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
  "schemas/model-request-authorization-template.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "model-request-authorization-template.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "templateId", "frozenAt", "state", "candidateScope", "headStage", "getStage", "postGetQuarantine", "approvals", "prohibitions", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "model-request-authorization-template.v0" }, templateId: { const: "TEMPLATE-MATTE-MODEL-REQUEST@0.1.0" }, frozenAt: UTC,
      state: { const: "template-frozen-no-request-issued" }, candidateScope: { type: "array", minItems: 2, maxItems: 2, items: { enum: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"] } },
      headStage: {
        type: "object", additionalProperties: false,
        required: ["authorized", "requestIdState", "purpose", "allowedMethods", "redirectCaptureRequired", "bodyReadAllowed"],
        properties: { authorized: { const: false }, requestIdState: { const: "not-issued" }, purpose: { const: "capture-final-host-redirects-content-type-and-declared-length-without-model-body" }, allowedMethods: { type: "array", minItems: 1, maxItems: 1, items: { const: "HEAD" } }, redirectCaptureRequired: { const: true }, bodyReadAllowed: { const: false } },
      },
      getStage: {
        type: "object", additionalProperties: false,
        required: ["authorized", "requestIdState", "maximumExecutions", "prerequisites", "destination", "automaticLoadAfterGet"],
        properties: { authorized: { const: false }, requestIdState: { const: "not-issued" }, maximumExecutions: { const: 1 }, prerequisites: STRING_ARRAY, destination: { const: "quarantine-vault-outside-repository-product-and-system-temp" }, automaticLoadAfterGet: { const: false } },
      },
      postGetQuarantine: STRING_ARRAY,
      approvals: {
        type: "object", additionalProperties: false,
        required: ["sourceReviewerAssigned", "licenseReviewerAssigned", "runtimeReviewerAssigned", "securityReviewerAssigned", "acquisitionCustodianAssigned", "allApproved"],
        properties: { sourceReviewerAssigned: { const: false }, licenseReviewerAssigned: { const: false }, runtimeReviewerAssigned: { const: false }, securityReviewerAssigned: { const: false }, acquisitionCustodianAssigned: { const: false }, allApproved: { const: false } },
      },
      prohibitions: STRING_ARRAY, evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
  "schemas/runtime-metadata-definition-index.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "runtime-metadata-definition-index.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "definitionId", "frozenAt", "state", "priorDefinitionRefs", "candidateMetadataRefs", "loaderPolicyRef", "requestTemplateRef", "definitionTreeSha256", "counts", "forbiddenMaterial", "nextAuthorizedAction", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "runtime-metadata-definition-index.v0" }, definitionId: { const: "DEF-MATTE-RUNTIME-METADATA@0.1.0" }, frozenAt: UTC,
      state: { const: "definition-frozen-results-zero-model-and-runtime-acquisition-not-authorized" },
      priorDefinitionRefs: { type: "array", minItems: 3, maxItems: 3, items: FILE_REF },
      candidateMetadataRefs: { type: "array", minItems: 2, maxItems: 2, items: RECORD_REF }, loaderPolicyRef: RECORD_REF, requestTemplateRef: RECORD_REF,
      definitionTreeSha256: SHA,
      counts: {
        type: "object", additionalProperties: false,
        required: ["schemas", "recordsExcludingIndex", "registeredOfficialMetadataTexts", "modelHeadRequests", "modelBodyRequests", "modelBytes", "installedCandidateDependencies", "naturalImages", "generatedResults"],
        properties: {
          schemas: { const: 4 }, recordsExcludingIndex: { const: 4 }, registeredOfficialMetadataTexts: { const: 10 }, modelHeadRequests: { const: 0 }, modelBodyRequests: { const: 0 },
          modelBytes: { const: 0 }, installedCandidateDependencies: { const: 0 }, naturalImages: { const: 0 }, generatedResults: { const: 0 },
        },
      },
      forbiddenMaterial: STRING_ARRAY,
      nextAuthorizedAction: { const: "independent review may select an exact platform runtime and issue a metadata-only HEAD request; model body GET remains separately unauthorized" },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}
export function stableStringifyMattingRuntimeMetadata(value) { return JSON.stringify(stableValue(value)); }
function canonicalBytes(value) { return Buffer.from(`${stableStringifyMattingRuntimeMetadata(value)}\n`, "utf8"); }
export function sha256MattingRuntimeMetadata(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function withHash(record) {
  const value = { ...record, contentHash: "" }; const payload = { ...value }; delete payload.contentHash;
  value.contentHash = sha256MattingRuntimeMetadata(canonicalBytes(payload)); return value;
}
function fileRef(relativePath, bytes) { return { path: relativePath, fileSha256: sha256MattingRuntimeMetadata(bytes) }; }
function recordRef(id, relativePath, record, bytes) { return { id, path: relativePath, contentHash: record.contentHash, fileSha256: sha256MattingRuntimeMetadata(bytes) }; }
function treeDigest(fileMap) {
  const hash = createHash("sha256");
  for (const relativePath of [...fileMap.keys()].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const bytes = fileMap.get(relativePath); hash.update(relativePath); hash.update("\0"); hash.update(String(bytes.length)); hash.update("\0"); hash.update(sha256MattingRuntimeMetadata(bytes)); hash.update("\0");
  }
  return hash.digest("hex");
}
function officialFile(purpose, repository, commit, relativePath, byteLength, sha256) {
  return { purpose, url: `${repository}/raw/${commit}/${relativePath}`, commit, byteLength, sha256, sourceObservationRecordedAt: MATTING_RUNTIME_METADATA_FROZEN_AT, bodyClass: "source-metadata-text-not-model-bytes" };
}

function candidateMetadataRecord(candidateId) {
  const modnet = candidateId === "REG-MATTE-MODNET@0.1.0";
  const repository = modnet ? "https://github.com/ZHKKKe/MODNet" : "https://github.com/PeterL1n/RobustVideoMatting";
  const commit = modnet ? "28165a451e4610c9d77cfdf925a94610bb2810fb" : "17d1774b032fd503bfe53c57d295db719f9e3da1";
  const officialFiles = modnet ? [
    officialFile("repository capability and license statement", repository, commit, "README.md", 6475, "be9f8603539c2e1820e1eb0d58eb75b348e30bfd2de45799500b2cd6aa2ad9ed"),
    officialFile("official checkpoint folder locator", repository, commit, "pretrained/README.md", 227, "57fb44206bbc253803f6ba1c37e5be71f484c42a7818ac0d91a4395a8072e3bc"),
    officialFile("portrait image inference imports and loading pattern", repository, commit, "demo/image_matting/colab/inference.py", 3328, "a05172415a476cd721863091f892cd7259a33527fe82fe78871faa1ecddef1e9"),
    officialFile("demo dependency lower bounds and unpinned packages", repository, commit, "demo/video_matting/webcam/requirements.txt", 53, "0c924e6ef5db0429bb7c213c87e2923ba810eba0bd9d20bea8ce607fb7e7e0fb"),
    officialFile("repository Apache-2.0 license", repository, commit, "LICENSE", 11357, "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"),
  ] : [
    officialFile("repository inference and single-frame recurrent-state example", repository, commit, "README.md", 11178, "622b340807bd9106a5de7fa03d4df59457f87f2c3f893cd586a14cd6391d7b0b"),
    officialFile("TorchHub dependency and fixed release locator", repository, commit, "hubconf.py", 1283, "dd0ba81acb5fc4a2390a5d152df9d869a285b46ac47190fa0e7ffebc766469f2"),
    officialFile("published inference direct dependency pins", repository, commit, "requirements_inference.txt", 65, "b4ab4ff64ec6dd825a83ff438292b7e3dc62f662367a44f26d84fa44e5028a50"),
    officialFile("network forward signature and recurrent state contract", repository, commit, "model/model.py", 3091, "d8378170659fd21d114096120f9a0ad2fed0550c4d4664927d68f2def3ccd960"),
    officialFile("repository GPL-3.0 license", repository, commit, "LICENSE", 35148, "8b1ba204bb69a0ade2bfcf65ef294a920f6bb361b317dba43c7ef29d96332b9b"),
  ];
  return withHash({
    schemaVersion: "candidate-runtime-metadata.v0", metadataId: modnet ? "META-MATTE-MODNET-RUNTIME@0.1.0" : "META-MATTE-RVM-RUNTIME@0.1.0", frozenAt: MATTING_RUNTIME_METADATA_FROZEN_AT, candidateId,
    state: "official-source-metadata-resolved-runtime-not-selected-artifact-not-requested",
    upstream: { repository, refKind: modnet ? "branch" : "tag", refName: modnet ? "master" : "v1.0.0", commit, retrievalDate: "2026-08-16" }, officialFiles,
    artifact: modnet
      ? { fileName: "modnet_photographic_portrait_matting.ckpt", locatorState: "official-drive-folder-resolved-object-and-hash-unresolved", officialLocator: "https://drive.google.com/drive/folders/1umYmlCulvIFNaqPjwod1SayFmSRHziyR?usp=sharing", locatorImmutable: false, expectedByteLengthState: "unknown-not-requested", expectedSha256State: "unknown-not-requested", requestState: "no-head-no-get-no-bytes", repositoryStorageAllowed: false }
      : { fileName: "rvm_mobilenetv3.pth", locatorState: "official-release-url-resolved-by-fixed-hubconf-bytes-unpinned", officialLocator: "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth", locatorImmutable: false, expectedByteLengthState: "unknown-not-requested", expectedSha256State: "unknown-not-requested", requestState: "no-head-no-get-no-bytes", repositoryStorageAllowed: false },
    dependencies: modnet
      ? { declarationState: "partial-unpinned-import-and-demo-declarations", declaredDirect: ["numpy (unversioned)", "Pillow (unversioned)", "torch >= 1.0.0 (demo lower bound only)", "torchvision (unversioned)"], operationSpecificLock: false, pythonExactVersionState: "not-selected", platformWheelSetState: "not-selected", transitiveLockState: "not-created", packageHashState: "not-created", sbomState: "not-created", installedCount: 0 }
      : { declarationState: "fixed-requirements-file-plus-broad-hubconf-declaration", declaredDirect: ["av==8.0.3", "torch==1.9.0", "torchvision==0.10.0", "tqdm==4.61.1", "pims==0.5", "hubconf dependencies: torch and torchvision without versions"], operationSpecificLock: false, pythonExactVersionState: "not-selected", platformWheelSetState: "not-selected", transitiveLockState: "not-created", packageHashState: "not-created", sbomState: "not-created", installedCount: 0 },
    loading: modnet
      ? { officialPattern: "construct MODNet DataParallel then torch.load checkpoint and load_state_dict", automaticDownloadPresent: false, unsafePickleCompatibleCallPresent: true, singleImageContractObservation: "official portrait image demo accepts RGB image input, normalizes channels, runs one image, and returns one matte", approvedLoaderState: "not-implemented", networkAtRuntime: "disabled", remoteCodeAllowed: false }
      : { officialPattern: "hubconf may call torch.hub.load_state_dict_from_url; README local path uses torch.load then load_state_dict", automaticDownloadPresent: true, unsafePickleCompatibleCallPresent: true, singleImageContractObservation: "official example initializes four recurrent states to None and a single frame call returns foreground, alpha, and four next recurrent states", approvedLoaderState: "not-implemented", networkAtRuntime: "disabled", remoteCodeAllowed: false },
    license: modnet
      ? { spdx: "Apache-2.0", officialFileSha256: "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4", scopeObservation: "fixed README states repository code, models, and demos are Apache-2.0 except doc/gif", productDistributionState: "blocked-pending-independent-review" }
      : { spdx: "GPL-3.0-only", officialFileSha256: "8b1ba204bb69a0ade2bfcf65ef294a920f6bb361b317dba43c7ef29d96332b9b", scopeObservation: "fixed repository license is GPL version 3; product distribution remains outside this research-only definition", productDistributionState: "blocked-pending-independent-review" },
    unresolvedBlockers: modnet
      ? ["official folder does not provide an immutable direct object URL or expected hash in fixed source", "official Colab body is sign-in gated and is not treated as a reproducible artifact locator", "image-specific exact Python and dependency lock absent", "platform wheels, hashes, transitive lock, and SBOM absent", "safe checkpoint loader and negative tests absent", "hardware and resource profile absent"]
      : ["release artifact byte length and SHA-256 not captured", "Python version and platform wheel set not selected", "published requirements do not pin transitive packages or wheel hashes", "safe checkpoint loader and negative tests absent", "single-frame adapter and hardware/resource profile absent", "GPL distribution review unresolved"],
    authorization: { metadataHeadAuthorized: false, bodyGetAuthorized: false, dependencyInstallAuthorized: false, checkpointLoadAuthorized: false, inferenceAuthorized: false, naturalImageAuthorized: false, productUseAuthorized: false },
    evidenceBoundary: { c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0, o1: 0, g1: 0, v1: 0, productSupport: false },
  });
}

function loaderPolicyRecord() {
  return withHash({
    schemaVersion: "safe-checkpoint-loader-policy.v0", policyId: "POLICY-MATTE-SAFE-CHECKPOINT-LOAD@0.1.0", frozenAt: MATTING_RUNTIME_METADATA_FROZEN_AT,
    state: "policy-frozen-implementation-not-created-loading-forbidden", appliesTo: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"],
    preLoad: ["capture immutable acquisition receipt, final redirect chain, byte length, content type, and SHA-256 before any parser or framework touches bytes", "store original bytes read-only outside repository, product, and system temp roots", "independent reviewer must pin artifact identity, license, runtime lock, SBOM, hardware profile, and loader implementation hash", "reject size, host, path, extension, content-type, or digest mismatch before deserialization"],
    isolation: ["run in a fresh no-network subprocess with no user credentials, home-directory access, package cache, or writable import path", "mount checkpoint and approved source read-only; expose only attempt-scoped output and bounded logs", "deny subprocess creation, dynamic native library discovery, remote code, torch hub, and automatic downloads", "apply wall-time, CPU, memory, file-count, byte-count, and log-length limits before inspection"],
    deserialization: ["never call the upstream torch.load or torch.hub loader directly on unreviewed bytes", "selected runtime must support a reviewed weights-only or equivalently non-executable state-dict extraction path", "reject checkpoint-provided custom classes, reducers, code objects, modules, optimizers, schedulers, arbitrary metadata, and unexpected tensor keys", "permit only bounded primitive containers and tensors matching a separately frozen key, dtype, shape, and total-element allowlist"],
    postLoad: ["loading success is not inference authorization", "re-hash original bytes and record loader outcome without rewriting the acquisition identity", "model construction uses approved local source only and remains network-disabled", "any converted or derived format receives a new ID, hash, license review, schema, and evidence boundary"],
    implementation: { loaderImplemented: false, loaderImplementationSha256State: "not-created", runtimeSelected: false, negativeTestsCreated: false, artifactInspectionAuthorized: false, modelConstructionAuthorized: false },
    hardStops: ["unsafe pickle-compatible fallback", "remote-code import", "automatic download", "unknown custom object", "unexpected tensor inventory", "resource limit breach", "network access", "unapproved artifact or runtime drift", "inference or natural-image access"],
    evidenceBoundary: { c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0, o1: 0, g1: 0, v1: 0, productSupport: false },
  });
}

function requestTemplateRecord() {
  return withHash({
    schemaVersion: "model-request-authorization-template.v0", templateId: "TEMPLATE-MATTE-MODEL-REQUEST@0.1.0", frozenAt: MATTING_RUNTIME_METADATA_FROZEN_AT,
    state: "template-frozen-no-request-issued", candidateScope: ["REG-MATTE-MODNET@0.1.0", "REG-MATTE-RVM-MOBILENETV3@0.1.0"],
    headStage: { authorized: false, requestIdState: "not-issued", purpose: "capture-final-host-redirects-content-type-and-declared-length-without-model-body", allowedMethods: ["HEAD"], redirectCaptureRequired: true, bodyReadAllowed: false },
    getStage: { authorized: false, requestIdState: "not-issued", maximumExecutions: 1, prerequisites: ["candidate-specific immutable source decision", "approved final host and path allowlist", "license and distribution review", "selected exact Python and platform wheel lock with hashes", "complete transitive SBOM", "named hardware and resource envelope", "safe-loader implementation and adversarial tests", "quarantine path and storage quota", "independent acquisition custodian approval"], destination: "quarantine-vault-outside-repository-product-and-system-temp", automaticLoadAfterGet: false },
    postGetQuarantine: ["record final URL, redirects, UTC, status, content type, byte length, and SHA-256", "do not load or rename into an approved model namespace", "independent reviewer pins the observed identity and either approves a new loader request or closes the candidate", "request consumption is durable and cannot be reset by process restart"],
    approvals: { sourceReviewerAssigned: false, licenseReviewerAssigned: false, runtimeReviewerAssigned: false, securityReviewerAssigned: false, acquisitionCustodianAssigned: false, allApproved: false },
    prohibitions: ["no request body in the HEAD stage", "no browser or package-manager automatic download", "no authentication cookies or user account", "no unbounded redirect", "no retry after a body GET produced any bytes", "no repository, product, system-temp, or shared-cache destination", "no checkpoint load, import, inference, image access, calibration, holdout, or product wiring"],
    evidenceBoundary: { c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0, o1: 0, g1: 0, v1: 0, productSupport: false },
  });
}

export async function buildMattingRuntimeMetadataBundle() {
  const priorDefinitionRefs = [];
  for (const [relativePath, absolutePath] of PRIOR_SOURCES) priorDefinitionRefs.push(fileRef(relativePath, await readFile(absolutePath)));
  const fileMap = new Map();
  for (const [relativePath, schema] of Object.entries(MATTING_RUNTIME_METADATA_SCHEMAS)) fileMap.set(relativePath, canonicalBytes(schema));
  const candidateMetadata = [candidateMetadataRecord("REG-MATTE-MODNET@0.1.0"), candidateMetadataRecord("REG-MATTE-RVM-MOBILENETV3@0.1.0")];
  const loaderPolicy = loaderPolicyRecord(); const requestTemplate = requestTemplateRecord();
  const records = [
    ["modnet-runtime-metadata.json", candidateMetadata[0].metadataId, candidateMetadata[0]],
    ["rvm-runtime-metadata.json", candidateMetadata[1].metadataId, candidateMetadata[1]],
    ["safe-checkpoint-loader-policy.json", loaderPolicy.policyId, loaderPolicy],
    ["model-request-authorization-template.json", requestTemplate.templateId, requestTemplate],
  ];
  const refs = [];
  for (const [relativePath, id, record] of records) { const bytes = canonicalBytes(record); fileMap.set(relativePath, bytes); refs.push(recordRef(id, relativePath, record, bytes)); }
  const definitionTreeSha256 = treeDigest(fileMap);
  const index = withHash({
    schemaVersion: "runtime-metadata-definition-index.v0", definitionId: "DEF-MATTE-RUNTIME-METADATA@0.1.0", frozenAt: MATTING_RUNTIME_METADATA_FROZEN_AT,
    state: "definition-frozen-results-zero-model-and-runtime-acquisition-not-authorized", priorDefinitionRefs,
    candidateMetadataRefs: refs.slice(0, 2), loaderPolicyRef: refs[2], requestTemplateRef: refs[3], definitionTreeSha256,
    counts: { schemas: 4, recordsExcludingIndex: 4, registeredOfficialMetadataTexts: 10, modelHeadRequests: 0, modelBodyRequests: 0, modelBytes: 0, installedCandidateDependencies: 0, naturalImages: 0, generatedResults: 0 },
    forbiddenMaterial: ["model, checkpoint, tensor, or derived-model bytes", "Python environment, wheel, package cache, dependency tree, or SBOM", "natural-person image, user upload, alpha matte, fixture, calibration, holdout, or escape material", "loader execution, framework import, inference result, product adapter, server route, UI, or release claim"],
    nextAuthorizedAction: "independent review may select an exact platform runtime and issue a metadata-only HEAD request; model body GET remains separately unauthorized",
    evidenceBoundary: { c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0, o1: 0, g1: 0, v1: 0, productSupport: false },
  });
  fileMap.set("definition-index.json", canonicalBytes(index));
  fileMap.set("README.md", Buffer.from(`# Matting runtime metadata v0\n\nState: definition-frozen / official-source-metadata-resolved / model-head-requests-zero / model-body-requests-zero / model-bytes-zero / dependencies-zero / images-zero / results-zero / non-C1 / non-product.\n\nThis tree records fixed upstream source metadata, unresolved runtime bindings, a safe-loader policy, and an unissued HEAD/GET authorization template. It contains no model, package, image, fixture, result, executable loader, inference adapter, or product wiring.\n`, "utf8"));
  const instances = [
    ...candidateMetadata.map((record) => [record, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/candidate-runtime-metadata.v0.schema.json"]]),
    [loaderPolicy, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/safe-checkpoint-loader-policy.v0.schema.json"]],
    [requestTemplate, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/model-request-authorization-template.v0.schema.json"]],
    [index, MATTING_RUNTIME_METADATA_SCHEMAS["schemas/runtime-metadata-definition-index.v0.schema.json"]],
  ];
  for (const [record, schema] of instances) { const issues = validateJsonSchemaInstance(record, schema); if (issues.length) throw new TypeError(`schema mismatch: ${JSON.stringify(issues)}`); }
  return Object.freeze({ fileMap, candidateMetadata, loaderPolicy, requestTemplate, index, definitionTreeSha256, treeSha256: treeDigest(fileMap) });
}

export async function materializeMattingRuntimeMetadata({ outputRoot = MATTING_RUNTIME_METADATA_ROOT } = {}) {
  const bundle = await buildMattingRuntimeMetadataBundle();
  for (const [relativePath, bytes] of bundle.fileMap) { const target = path.join(outputRoot, ...relativePath.split("/")); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: "wx" }); }
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

function assertSemantics(bundle) {
  if (bundle.candidateMetadata.length !== 2 || bundle.candidateMetadata.some((record) => Object.values(record.authorization).some(Boolean))) throw new TypeError("candidate authorization drift");
  if (bundle.candidateMetadata[0].artifact.locatorState !== "official-drive-folder-resolved-object-and-hash-unresolved" || bundle.candidateMetadata[1].artifact.locatorState !== "official-release-url-resolved-by-fixed-hubconf-bytes-unpinned") throw new TypeError("artifact locator state drift");
  if (bundle.candidateMetadata.some((record) => record.dependencies.installedCount !== 0 || record.loading.approvedLoaderState !== "not-implemented")) throw new TypeError("runtime readiness overclaim");
  if (bundle.loaderPolicy.implementation.loaderImplemented || bundle.requestTemplate.headStage.authorized || bundle.requestTemplate.getStage.authorized) throw new TypeError("loader or request overclaim");
  const zeroKeys = ["modelHeadRequests", "modelBodyRequests", "modelBytes", "installedCandidateDependencies", "naturalImages", "generatedResults"];
  if (zeroKeys.some((key) => bundle.index.counts[key] !== 0)) throw new TypeError("definition must remain material and results zero");
}

export async function validateMattingRuntimeMetadata({ outputRoot = MATTING_RUNTIME_METADATA_ROOT } = {}) {
  const expected = await buildMattingRuntimeMetadataBundle(); assertSemantics(expected); const actual = await readTree(outputRoot);
  if (actual.size !== expected.fileMap.size) throw new TypeError("runtime metadata file count mismatch");
  for (const [relativePath, bytes] of expected.fileMap) if (!actual.has(relativePath) || !actual.get(relativePath).equals(bytes)) throw new TypeError(`runtime metadata drift: ${relativePath}`);
  for (const forbidden of ["results", "fixtures", "assets", "images", "models", "weights", "checkpoints", "dependencies", "wheels", "venv", "node_modules", "holdout", "formal", "escape", "artifacts"]) {
    try { await stat(path.join(outputRoot, forbidden)); throw new TypeError(`forbidden runtime metadata path exists: ${forbidden}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const relativePath of actual.keys()) if (/\.(?:pth|pt|ckpt|onnx|safetensors|whl|zip|tar|gz|png|jpe?g|webp)$/i.test(relativePath)) throw new TypeError(`forbidden runtime material file: ${relativePath}`);
  return Object.freeze({ valid: true, fileCount: actual.size, schemaCount: 4, recordCount: 5, registeredOfficialMetadataTexts: 10, modelHeadRequests: 0, modelBodyRequests: 0, modelBytes: 0, installedCandidateDependencies: 0, naturalImages: 0, generatedResults: 0, definitionTreeSha256: expected.definitionTreeSha256, treeSha256: treeDigest(actual) });
}

export async function verifyTwoTempMattingRuntimeMetadata() {
  const left = path.join(tmpdir(), `matting-runtime-metadata-left-${process.pid}-${Date.now()}`); const right = path.join(tmpdir(), `matting-runtime-metadata-right-${process.pid}-${Date.now()}`);
  const a = await materializeMattingRuntimeMetadata({ outputRoot: left }); const b = await materializeMattingRuntimeMetadata({ outputRoot: right });
  return Object.freeze({ identical: a.treeSha256 === b.treeSha256, treeSha256: a.treeSha256, definitionTreeSha256: a.definitionTreeSha256, fileCount: a.fileMap.size });
}

async function main() {
  if (process.argv[2] === "--write") { const bundle = await materializeMattingRuntimeMetadata(); process.stdout.write(`${JSON.stringify({ written: true, fileCount: bundle.fileMap.size, definitionTreeSha256: bundle.definitionTreeSha256, treeSha256: bundle.treeSha256 }, null, 2)}\n`); }
  else if (process.argv[2] === "--validate") process.stdout.write(`${JSON.stringify(await validateMattingRuntimeMetadata(), null, 2)}\n`);
  else if (process.argv[2] === "--verify-two-temp") process.stdout.write(`${JSON.stringify(await verifyTwoTempMattingRuntimeMetadata(), null, 2)}\n`);
  else { process.stderr.write("Usage: node scripts/research-generate-matting-runtime-metadata.mjs --write|--validate|--verify-two-temp\n"); process.exitCode = 2; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
