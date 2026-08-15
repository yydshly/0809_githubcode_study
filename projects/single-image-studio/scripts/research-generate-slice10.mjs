import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonSlice05, inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import {
  SLICE10_EVIDENCE_BOUNDARY,
  SLICE10_PROTOCOL_SCHEMA_DOCUMENTS,
  SLICE10_SLICE09_RESULT_COMMIT,
  SLICE10_SLICE09_RESULT_TREE_SHA256,
} from "./research-calibration-protocol-slice10.mjs";
import { SLICE10_RUNNER_SCHEMA_DOCUMENTS } from "./research-calibration-runner-slice10.mjs";
import { SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS } from "./research-runtime-observer-slice10.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SLICE05_ROOT = path.join(PROJECT_ROOT, "research", "slice-05");
const SLICE09_ROOT = path.join(PROJECT_ROOT, "research", "slice-09");
const SLICE10_ROOT = path.join(PROJECT_ROOT, "research", "slice-10");
const OPERATIONS = Object.freeze(["normalize", "export"]);
const MANIFEST_SPECS = Object.freeze([
  Object.freeze({ operation: "normalize", partition: "dev/calibration", priorName: "normalize-dev.v0.5.0.json", label: "dev" }),
  Object.freeze({ operation: "normalize", partition: "defect/calibration", priorName: "normalize-defect.v0.5.0.json", label: "defect" }),
  Object.freeze({ operation: "export", partition: "dev/calibration", priorName: "export-dev.v0.5.0.json", label: "dev" }),
  Object.freeze({ operation: "export", partition: "defect/calibration", priorName: "export-defect.v0.5.0.json", label: "defect" }),
]);

export const SLICE10_GENERATOR_VERSION = "slice10-definition-preview-generator.v0.10.0";
export const SLICE10_PREVIEW_PATHS = Object.freeze({
  definition: "definition-index.preview.v0.10.0.json",
  candidate: "candidate-locks/composite-canonical-png.preview.v0.10.0.json",
  runtime: "runtime/runtime-attestation.preview.v0.10.0.json",
  hardware: "hardware/named-hardware.preview.v0.10.0.json",
  rights: "rights/open-synthetic-lineage.preview.v0.10.0.json",
  admissionLineage: "lineage/slice09-gateb-admission.v0.10.0.json",
  normalizeContract: "contracts/cc-cap02-normalize-png.preview.v0.10.0.json",
  exportContract: "contracts/cc-cap02-export-png.preview.v0.10.0.json",
  normalizePlan: "plans/normalize-open-calibration.preview.v0.10.0.json",
  exportPlan: "plans/export-open-calibration.preview.v0.10.0.json",
  normalizePrereg: "preregistrations/normalize-open-calibration.preview.v0.10.0.json",
  exportPrereg: "preregistrations/export-open-calibration.preview.v0.10.0.json",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function canonicalBytesSlice10(value) {
  return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8");
}

export function sha256Slice10Definition(value) {
  return createHash("sha256").update(value).digest("hex");
}

function withHash(value) {
  return Object.freeze({ ...value, contentHash: sha256Slice10Definition(canonicalBytesSlice10(value)) });
}

function utc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || new Date(value).toISOString() !== value) throw new Error("frozenAt must be canonical UTC milliseconds");
  return value;
}

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

function schema(name, properties) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-10/schemas/${name}`,
    ...objectSchema(properties),
  };
}

const id = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,199}$" };
const text = { type: "string", minLength: 1, maxLength: 200000 };
const hex = { type: "string", pattern: "^[0-9a-f]{64}$" };
const utcSchema = { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" };
const evidenceSchema = objectSchema(Object.fromEntries(
  Object.entries(SLICE10_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }]),
));
const refSchema = objectSchema({
  byteLength: { type: "integer", minimum: 2 }, contentHash: hex, fileSha256: hex, id,
  path: { type: "string", minLength: 3, maxLength: 500, pattern: "^[^\\\\/][^\\\\]*$" },
});
const implementationRefSchema = objectSchema({ id, path: text, sha256: hex });
const nullableRefSchema = { oneOf: [{ type: "null" }, refSchema] };
const locatorSchema = objectSchema({ id, path: text });
const nullableLocatorSchema = { oneOf: [{ type: "null" }, locatorSchema] };
const nullableHexSchema = { oneOf: [{ type: "null" }, hex] };
const nullableTextSchema = { oneOf: [{ type: "null" }, text] };
const rawAssetSchema = objectSchema({
  byteLength: { type: "integer", minimum: 1 }, decodedPixelSha256: nullableHexSchema, fileSha256: hex,
  mime: text, path: text, sourceDeclarationDecodedPixelSha256: nullableHexSchema,
});
const manifestEntrySchema = objectSchema({
  categoryId: text, disposition: { enum: ["applicable", "rejection"] },
  expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S10_[A-Z0-9_]+$" }] },
  goldIdentityLocator: nullableLocatorSchema, sourceRef: refSchema,
});
const partitionCountsSchema = objectSchema({
  applicableSources: { type: "integer", minimum: 6, maximum: 18 },
  attempts: { type: "integer", minimum: 54, maximum: 90 },
  partition: { enum: ["dev/calibration", "defect/calibration"] },
  rejectionSources: { const: 12 }, sources: { type: "integer", minimum: 18, maximum: 30 },
});

export const SLICE10_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/candidate-lock.slice10.v0.schema.json": schema("candidate-lock.slice10.v0.schema.json", {
    schemaVersion: { const: "candidate-lock.slice10.v0" }, id, frozenAt: utcSchema,
    architecture: { const: "sharp-raw-rgba-plus-project-canonical-png-encoder" },
    versionReason: { const: "open-calibration-protocol-and-source-identity-only" },
    slice09AdmissionLineageRef: refSchema, slice09CandidateRef: refSchema,
    implementationRefs: { type: "array", minItems: 11, maxItems: 11, items: implementationRefSchema },
    executionState: { const: "runner-complete-central-validator-not-created-preview-not-executable" },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/capability-contract.slice10.v0.schema.json": schema("capability-contract.slice10.v0.schema.json", {
    schemaVersion: { const: "capability-contract.slice10.v0" }, id,
    operation: { enum: OPERATIONS }, candidateRef: refSchema, slice09ContractRef: refSchema,
    semanticDeltaFromSlice09: { const: "none" }, outputProfile: { const: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0" },
    maxDimension: { const: 256 }, maxOutputBytes: { const: 1048576 }, passthrough: { const: false },
    fallback: { const: false }, oracleRepair: { const: false }, productSupport: { const: false },
    frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/rights.slice10.v0.schema.json": schema("rights.slice10.v0.schema.json", {
    schemaVersion: { const: "rights.slice10.v0" }, id, slice05RightsRef: refSchema,
    projectOriginalSyntheticOnly: { const: true }, realUserPhotos: { const: false },
    thirdPartyImageAssets: { const: false }, modelWeights: { const: false }, copiedImageBytes: { const: 0 },
    productUseAuthorized: { const: false }, frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/runtime-attestation.slice10.v0.schema.json": schema("runtime-attestation.slice10.v0.schema.json", {
    schemaVersion: { const: "runtime-attestation.slice10.v0" }, id, frozenAt: utcSchema,
    observationState: { const: "definition-preview-read-versions-only-no-image-pipeline" },
    inventoryCanonicalJson: text, inventoryPayloadSha256: hex, workerRuntimeCanonicalJson: text,
    workerRuntimeSha256: hex, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/hardware.slice10.v0.schema.json": schema("hardware.slice10.v0.schema.json", {
    schemaVersion: { const: "hardware.slice10.v0" }, id, frozenAt: utcSchema,
    platform: { const: "win32" }, architecture: { const: "x64" }, osRelease: text, osVersion: text,
    cpuModel: text, logicalProcessors: { type: "integer", minimum: 1 }, totalMemoryBytes: { type: "integer", minimum: 1 },
    nodeVersion: text, nodeAbi: text, nodeNapi: text, npmVersion: text,
    hostnameRecorded: { const: false }, serialRecorded: { const: false }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/slice09-admission-lineage.slice10.v0.schema.json": schema("slice09-admission-lineage.slice10.v0.schema.json", {
    schemaVersion: { const: "slice09-admission-lineage.slice10.v0" }, id, frozenAt: utcSchema,
    slice09DefinitionRef: refSchema, slice09ResultCommit: { const: SLICE10_SLICE09_RESULT_COMMIT },
    slice09ResultTreeSha256: { const: SLICE10_SLICE09_RESULT_TREE_SHA256 },
    decisionRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    summaryRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    bothOperationsGateBPassed: { const: true }, historicCalibrationAuthorized: { const: false },
    replayAuthority: { const: false }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/open-calibration-plan.slice10.v0.schema.json": schema("open-calibration-plan.slice10.v0.schema.json", {
    schemaVersion: { const: "open-calibration-plan.slice10.v0" }, id, operation: { enum: OPERATIONS }, frozenAt: utcSchema,
    sourceCount: { const: 48 }, applicableSourceCount: { const: 24 }, rejectionSourceCount: { const: 24 },
    repetitionsPerSource: { const: 3 }, plannedAttempts: { const: 144 }, replacements: { const: 0 },
    sourcePassRule: { const: "all-three-registered-repetitions-must-pass" }, validFailureRerunAllowed: { const: false },
    ordinaryCompleteNonPassStopsOtherOperation: { const: false },
    globalStopClasses: { type: "array", minItems: 5, maxItems: 5, items: { enum: ["protocol", "missing", "timeout", "cancel", "reconciliation"] } },
    partitionCounts: { type: "array", minItems: 2, maxItems: 2, items: partitionCountsSchema },
    formal: { const: false }, c1Eligible: { const: false }, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/preregistration.slice10.v0.schema.json": schema("preregistration.slice10.v0.schema.json", {
    schemaVersion: { const: "preregistration.slice10.v0" }, id, operation: { enum: OPERATIONS }, frozenAt: utcSchema,
    candidateRef: refSchema, contractRef: refSchema, admissionLineageRef: refSchema, planRef: refSchema,
    manifestRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    goldIdentityRefs: { type: "array", minItems: 24, maxItems: 24, items: refSchema },
    sourceCount: { const: 48 }, attemptCount: { const: 144 }, repetitions: { const: 3 }, replacements: { const: 0 },
    allAttemptsMustPass: { const: true }, allApplicableSourcesMustBeDeterministic: { const: true },
    formal: { const: false }, c1Eligible: { const: false }, productSupport: { const: false },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/source-lineage.slice10.v0.schema.json": schema("source-lineage.slice10.v0.schema.json", {
    schemaVersion: { const: "source-lineage.slice10.v0" }, id, operation: { enum: OPERATIONS },
    partition: { enum: ["dev/calibration", "defect/calibration"] }, disposition: { enum: ["applicable", "rejection"] },
    categoryId: text, expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S10_[A-Z0-9_]+$" }] },
    captureSessionId: id, sourceFamilyId: id, priorManifestRef: refSchema, priorSourceRef: refSchema,
    priorGoldRef: nullableRefSchema, priorNormalizedArtifactRef: nullableRefSchema, rawAsset: rawAssetSchema,
    injectedDefectCanonicalJson: nullableTextSchema, independenceClaim: { const: false }, copiedImageBytes: { const: false },
    frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/gold-identity.slice10.v0.schema.json": schema("gold-identity.slice10.v0.schema.json", {
    schemaVersion: { const: "gold-identity.slice10.v0" }, id, operation: { enum: OPERATIONS },
    partition: { enum: ["dev/calibration", "defect/calibration"] }, sourceRef: refSchema,
    manifestLocator: locatorSchema, priorGoldRef: refSchema, priorNormalizedArtifactRef: nullableRefSchema,
    expectedCanonicalJson: text, candidateOutputUsed: { const: false }, candidateDependencyUsed: { const: false },
    independenceClaim: { const: false }, frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/manifest.slice10.v0.schema.json": schema("manifest.slice10.v0.schema.json", {
    schemaVersion: { const: "manifest.slice10.v0" }, id, operation: { enum: OPERATIONS },
    partition: { enum: ["dev/calibration", "defect/calibration"] }, priorManifestRef: refSchema,
    contractRef: refSchema, rightsRef: refSchema,
    entries: { type: "array", minItems: 18, maxItems: 30, items: manifestEntrySchema },
    sourceCount: { type: "integer", minimum: 18, maximum: 30 }, applicableSourceCount: { type: "integer", minimum: 6, maximum: 18 },
    rejectionSourceCount: { const: 12 }, repetitions: { const: 3 }, copiedImageBytes: { const: 0 },
    frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/definition-index.slice10.v0.schema.json": schema("definition-index.slice10.v0.schema.json", {
    schemaVersion: { const: "definition-index.slice10.v0" }, id, frozenAt: utcSchema,
    definitionState: { const: "preview-not-frozen-central-validator-not-created" }, candidateRef: refSchema,
    contractRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema }, runtimeRef: refSchema,
    hardwareRef: refSchema, rightsRef: refSchema, admissionLineageRef: refSchema,
    planRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    preregistrationRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    manifestRefs: { type: "array", minItems: 4, maxItems: 4, items: refSchema },
    sourceRefs: { type: "array", minItems: 96, maxItems: 96, items: refSchema },
    goldIdentityRefs: { type: "array", minItems: 48, maxItems: 48, items: refSchema },
    schemaPaths: { type: "array", minItems: 22, maxItems: 22, items: text }, runnerRef: implementationRefSchema,
    resultProtocol: objectSchema({
      driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, plannedSources: { const: 96 },
      plannedAttempts: { const: 288 }, replacements: { const: 0 }, resultsRoot: { const: "results/open-calibration" },
      ordinaryCompleteNonPassStopsOtherOperation: { const: false }, globalProtocolUncertaintyStopsAll: { const: true },
    }),
    counts: objectSchema({
      applicableSources: { const: 48 }, copiedImageBytes: { const: 0 }, goldIdentities: { const: 48 },
      manifests: { const: 4 }, plannedAttempts: { const: 288 }, rejectionSources: { const: 48 },
      sourceWrappers: { const: 96 }, sources: { const: 96 },
    }),
    resultsState: { const: "not-created" }, formalHoldoutState: { const: "not-created" },
    generatorSha256: hex, readmeSha256: hex, descendantFileCount: { type: "integer", minimum: 181, maximum: 181 },
    descendantTreeSha256: hex, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});

export const SLICE10_PREVIEW_SCHEMA_DOCUMENTS = Object.freeze({
  ...SLICE10_PROTOCOL_SCHEMA_DOCUMENTS,
  ...SLICE10_RUNNER_SCHEMA_DOCUMENTS,
  ...SLICE10_RUNTIME_END_SCHEMA_DOCUMENTS,
  ...SLICE10_MACHINE_SCHEMA_DOCUMENTS,
});

function descriptor(relativePath, record, fileMap) {
  const bytes = canonicalBytesSlice10(record);
  fileMap.set(relativePath, bytes);
  return Object.freeze({
    path: relativePath, id: record.id, contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256Slice10Definition(bytes),
  });
}

async function implementationRef(projectRelativePath, idValue) {
  const bytes = await readFile(path.join(PROJECT_ROOT, projectRelativePath));
  return Object.freeze({ path: projectRelativePath, id: idValue, sha256: sha256Slice10Definition(bytes) });
}

async function externalRef(root, rootLabel, ref) {
  const bytes = await readFile(path.join(root, ...ref.path.split("/")));
  const record = JSON.parse(bytes);
  if (record.contentHash !== ref.contentHash || bytes.length !== ref.byteLength
    || sha256Slice10Definition(bytes) !== ref.fileSha256) throw new Error(`external record drift: ${rootLabel}/${ref.path}`);
  return Object.freeze({
    path: `${rootLabel}/${ref.path}`, id: ref.id, contentHash: ref.contentHash,
    byteLength: bytes.length, fileSha256: sha256Slice10Definition(bytes),
  });
}

async function directExternalRecordRef(root, rootLabel, relativePath, idKey) {
  const bytes = await readFile(path.join(root, ...relativePath.split("/")));
  const record = JSON.parse(bytes);
  return Object.freeze({
    path: `${rootLabel}/${relativePath}`, id: record[idKey], contentHash: record.contentHash,
    byteLength: bytes.length, fileSha256: sha256Slice10Definition(bytes),
  });
}

export function digestSlice10Files(fileMap) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...fileMap.entries()].sort(([left], [right]) => Buffer.from(left).compare(Buffer.from(right)))) {
    hash.update(relativePath);
    hash.update(Buffer.from([0]));
    hash.update(String(bytes.length));
    hash.update(Buffer.from([0]));
    hash.update(sha256Slice10Definition(bytes));
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

function mapErrorCode(code) {
  if (code === null) return null;
  const mapping = Object.freeze({
    S05_INPUT_CRC_MISMATCH: "S10_INPUT_CRC_MISMATCH",
    S05_INPUT_SRGB_REQUIRED: "S10_INPUT_SRGB_REQUIRED",
    S05_NORMALIZE_SOURCE_DECLARATION_INVALID: "S10_NORMALIZE_SOURCE_DECLARATION_INVALID",
    S05_EXPORT_NORMALIZED_ARTIFACT_INVALID: "S10_EXPORT_NORMALIZED_ARTIFACT_INVALID",
  });
  if (!mapping[code]) throw new Error(`unregistered Slice 05 error mapping: ${code}`);
  return mapping[code];
}

function partitionToken(partition) {
  return partition.replace("/", "-");
}

export async function buildSlice10DefinitionPreview({ frozenAt, readmeBytes = null } = {}) {
  const freeze = utc(frozenAt);
  const fileMap = new Map(Object.entries(SLICE10_PREVIEW_SCHEMA_DOCUMENTS)
    .map(([relativePath, value]) => [relativePath, canonicalBytesSlice10(value)]));
  const readme = readmeBytes ?? await readFile(path.join(SLICE10_ROOT, "README.md"));

  const slice09DefinitionRef = await directExternalRecordRef(
    SLICE09_ROOT, "research/slice-09", "definition-index.v0.9.0.json", "id",
  );
  const decisionRefs = [];
  const summaryRefs = [];
  for (const operation of OPERATIONS) {
    const decisionPath = `results/open-smoke/${operation}/decision.json`;
    const summaryPath = `results/open-smoke/${operation}/summary.json`;
    const decisionBytes = await readFile(path.join(SLICE09_ROOT, ...decisionPath.split("/")));
    const summaryBytes = await readFile(path.join(SLICE09_ROOT, ...summaryPath.split("/")));
    const decision = JSON.parse(decisionBytes);
    const summary = JSON.parse(summaryBytes);
    if (decision.operation !== operation || decision.state !== "pass" || decision.gateBPassed !== true
      || decision.calibrationAuthorized !== false || summary.operation !== operation
      || summary.passAttempts !== 18 || summary.nonPassAttempts !== 0 || summary.terminalAttempts !== 18) {
      throw new Error(`Slice 09 ${operation} admission is not an exact closed pass`);
    }
    decisionRefs.push(Object.freeze({
      path: `research/slice-09/${decisionPath}`, id: decision.decisionId, contentHash: decision.contentHash,
      byteLength: decisionBytes.length, fileSha256: sha256Slice10Definition(decisionBytes),
    }));
    summaryRefs.push(Object.freeze({
      path: `research/slice-09/${summaryPath}`, id: summary.summaryId, contentHash: summary.contentHash,
      byteLength: summaryBytes.length, fileSha256: sha256Slice10Definition(summaryBytes),
    }));
  }
  const admissionLineage = withHash({
    schemaVersion: "slice09-admission-lineage.slice10.v0", id: "LINEAGE-SLICE09-GATEB-TO-SLICE10@0.10.0", frozenAt: freeze,
    slice09DefinitionRef, slice09ResultCommit: SLICE10_SLICE09_RESULT_COMMIT,
    slice09ResultTreeSha256: SLICE10_SLICE09_RESULT_TREE_SHA256, decisionRefs, summaryRefs,
    bothOperationsGateBPassed: true, historicCalibrationAuthorized: false, replayAuthority: false,
    evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  const admissionLineageRef = descriptor(SLICE10_PREVIEW_PATHS.admissionLineage, admissionLineage, fileMap);

  const inventory = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  const workerRuntime = {
    sharpVersion: inventory.versions.sharpRuntime.values.sharp,
    nativeVersions: inventory.versions.sharpRuntime.values,
    nodeVersion: inventory.environment.node.version,
    platform: inventory.environment.os.platform,
    architecture: inventory.environment.os.architecture,
    settings: {
      concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0,
      simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
    },
  };
  const runtime = withHash({
    schemaVersion: "runtime-attestation.slice10.v0", id: "RUNTIME-SHARP-CANONICAL-PNG@0.10.0", frozenAt: freeze,
    observationState: "definition-preview-read-versions-only-no-image-pipeline",
    inventoryCanonicalJson: canonicalJsonSlice05(inventory), inventoryPayloadSha256: inventory.attestation.payloadSha256,
    workerRuntimeCanonicalJson: canonicalJsonSlice05(workerRuntime),
    workerRuntimeSha256: sha256Slice10Definition(Buffer.from(canonicalJsonSlice05(workerRuntime))),
    evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  const runtimeRef = descriptor(SLICE10_PREVIEW_PATHS.runtime, runtime, fileMap);
  const environment = inventory.environment;
  const hardware = withHash({
    schemaVersion: "hardware.slice10.v0", id: "HARDWARE-WIN32-X64@0.10.0", frozenAt: freeze,
    platform: environment.os.platform, architecture: environment.os.architecture, osRelease: environment.os.release,
    osVersion: environment.os.version, cpuModel: environment.cpu.models.join(" | "),
    logicalProcessors: environment.cpu.logicalProcessors, totalMemoryBytes: environment.memory.totalBytes,
    nodeVersion: environment.node.version, nodeAbi: environment.node.abi, nodeNapi: environment.node.napi,
    npmVersion: environment.npm.version, hostnameRecorded: false, serialRecorded: false,
    evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  const hardwareRef = descriptor(SLICE10_PREVIEW_PATHS.hardware, hardware, fileMap);

  const slice09Index = JSON.parse(await readFile(path.join(SLICE09_ROOT, "definition-index.v0.9.0.json"), "utf8"));
  const slice09CandidateRef = await externalRef(
    SLICE09_ROOT, "research/slice-09", slice09Index.candidateRef,
  );
  const implementations = await Promise.all([
    implementationRef("scripts/research-calibration-protocol-slice10.mjs", "CALIBRATION-PROTOCOL@0.10.0"),
    implementationRef("scripts/research-canonical-png-encoder-slice07.mjs", "ENCODER-CANONICAL-PNG@0.10.0"),
    implementationRef("scripts/research-sharp-raw-worker-slice07.mjs", "WORKER-SHARP-RAW@0.10.0"),
    implementationRef("scripts/research-gateb-adapter-slice07.mjs", "ADAPTER-SHARP-CANONICAL-PNG@0.10.0"),
    implementationRef("scripts/research-independent-png-oracle-slice05.mjs", "ORACLE-INDEPENDENT-PNG@0.5.0"),
    implementationRef("scripts/research-inventory-sharp-slice05.mjs", "INVENTORY-SHARP-RUNTIME@0.5.0"),
    implementationRef("scripts/research-calibration-runner-slice10.mjs", "RUNNER-OPEN-CALIBRATION@0.10.0"),
    implementationRef("scripts/research-calibration-case-slice10.mjs", "CASE-DRIVER-OPEN-CALIBRATION@0.10.0"),
    implementationRef("scripts/research-run-slice10.mjs", "DRIVER-REGISTERED-OPEN-CALIBRATION@0.10.0"),
    implementationRef("scripts/research-runtime-observer-slice10.mjs", "OBSERVER-RUNTIME-END@0.10.0"),
    implementationRef("scripts/research-generate-slice10.mjs", "GENERATOR-SLICE10-DEFINITION-PREVIEW@0.10.0"),
  ]);
  const candidate = withHash({
    schemaVersion: "candidate-lock.slice10.v0", id: "REG-NORM-SHARP-CANONICAL-PNG@0.10.0", frozenAt: freeze,
    architecture: "sharp-raw-rgba-plus-project-canonical-png-encoder",
    versionReason: "open-calibration-protocol-and-source-identity-only",
    slice09AdmissionLineageRef: admissionLineageRef, slice09CandidateRef,
    implementationRefs: implementations, executionState: "runner-complete-central-validator-not-created-preview-not-executable",
    evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  const candidateRef = descriptor(SLICE10_PREVIEW_PATHS.candidate, candidate, fileMap);

  const slice05Rights = JSON.parse(await readFile(path.join(SLICE05_ROOT, "rights/open-synthetic.v0.5.0.json"), "utf8"));
  const slice05RightsBytes = await readFile(path.join(SLICE05_ROOT, "rights/open-synthetic.v0.5.0.json"));
  const slice05RightsRef = Object.freeze({
    path: "research/slice-05/rights/open-synthetic.v0.5.0.json", id: slice05Rights.rightsRecordId,
    contentHash: slice05Rights.contentHash, byteLength: slice05RightsBytes.length,
    fileSha256: sha256Slice10Definition(slice05RightsBytes),
  });
  const rights = withHash({
    schemaVersion: "rights.slice10.v0", id: "RIGHTS-OPEN-SYNTHETIC-LINEAGE@0.10.0", slice05RightsRef,
    projectOriginalSyntheticOnly: true, realUserPhotos: false, thirdPartyImageAssets: false, modelWeights: false,
    copiedImageBytes: 0, productUseAuthorized: false, frozenAt: freeze, evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  const rightsRef = descriptor(SLICE10_PREVIEW_PATHS.rights, rights, fileMap);

  const contractRefs = {};
  for (const operation of OPERATIONS) {
    const slice09ContractRef = await externalRef(
      SLICE09_ROOT,
      "research/slice-09",
      slice09Index.contractRefs.find((entry) => entry.id.includes(operation.toUpperCase())),
    );
    const contract = withHash({
      schemaVersion: "capability-contract.slice10.v0", id: `CC-CAP02-${operation.toUpperCase()}-PNG@0.10.0`,
      operation, candidateRef, slice09ContractRef, semanticDeltaFromSlice09: "none",
      outputProfile: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0", maxDimension: 256, maxOutputBytes: 1048576,
      passthrough: false, fallback: false, oracleRepair: false, productSupport: false,
      frozenAt: freeze, evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
    });
    contractRefs[operation] = descriptor(SLICE10_PREVIEW_PATHS[`${operation}Contract`], contract, fileMap);
  }

  const planRefs = {};
  for (const operation of OPERATIONS) {
    const plan = withHash({
      schemaVersion: "open-calibration-plan.slice10.v0", id: `PLAN-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`,
      operation, frozenAt: freeze, sourceCount: 48, applicableSourceCount: 24, rejectionSourceCount: 24,
      repetitionsPerSource: 3, plannedAttempts: 144, replacements: 0,
      sourcePassRule: "all-three-registered-repetitions-must-pass", validFailureRerunAllowed: false,
      ordinaryCompleteNonPassStopsOtherOperation: false,
      globalStopClasses: ["protocol", "missing", "timeout", "cancel", "reconciliation"],
      partitionCounts: [
        { partition: "dev/calibration", sources: 30, applicableSources: 18, rejectionSources: 12, attempts: 90 },
        { partition: "defect/calibration", sources: 18, applicableSources: 6, rejectionSources: 12, attempts: 54 },
      ],
      formal: false, c1Eligible: false, evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
    });
    planRefs[operation] = descriptor(SLICE10_PREVIEW_PATHS[`${operation}Plan`], plan, fileMap);
  }

  const manifestRefs = [];
  const sourceRefs = [];
  const goldIdentityRefs = [];
  const manifestRefsByOperation = { normalize: [], export: [] };
  const goldRefsByOperation = { normalize: [], export: [] };
  for (const spec of MANIFEST_SPECS) {
    const priorManifestPath = `manifests/${spec.priorName}`;
    const priorManifestBytes = await readFile(path.join(SLICE05_ROOT, ...priorManifestPath.split("/")));
    const priorManifest = JSON.parse(priorManifestBytes);
    if (!Array.isArray(priorManifest.operationScope) || priorManifest.operationScope.length !== 1
      || priorManifest.operationScope[0] !== spec.operation || priorManifest.partition !== spec.partition
      || priorManifest.entries.length !== (spec.label === "dev" ? 30 : 18)) {
      throw new Error(`Slice 05 manifest population drift: ${spec.priorName}`);
    }
    const priorManifestRef = Object.freeze({
      path: `research/slice-05/${priorManifestPath}`, id: priorManifest.manifestId,
      contentHash: priorManifest.contentHash, byteLength: priorManifestBytes.length,
      fileSha256: sha256Slice10Definition(priorManifestBytes),
    });
    const manifestId = `FM-OPEN-CALIBRATION-${spec.operation.toUpperCase()}-${spec.label.toUpperCase()}@0.10.0`;
    const manifestPath = `manifests/${spec.operation}-${spec.label}.preview.v0.10.0.json`;
    const entries = [];
    const pendingGold = [];
    for (let index = 0; index < priorManifest.entries.length; index += 1) {
      const priorEntry = priorManifest.entries[index];
      const number = String(index + 1).padStart(3, "0");
      const sourceId = `s10.${spec.operation}.${spec.label}.${number}`;
      const priorSourceRef = await externalRef(SLICE05_ROOT, "research/slice-05", priorEntry.sourceProvenanceRef);
      const priorGoldRef = priorEntry.goldRecordRef
        ? await externalRef(SLICE05_ROOT, "research/slice-05", priorEntry.goldRecordRef) : null;
      const priorNormalizedArtifactRef = priorEntry.normalizedArtifactRef
        ? await externalRef(SLICE05_ROOT, "research/slice-05", priorEntry.normalizedArtifactRef) : null;
      const disposition = priorEntry.expectedDisposition === "artifact-required" ? "applicable" : "rejection";
      const wrapper = withHash({
        schemaVersion: "source-lineage.slice10.v0", id: sourceId, operation: spec.operation,
        partition: spec.partition, disposition, categoryId: priorEntry.categoryId,
        expectedStableErrorCode: mapErrorCode(priorEntry.expectedStableErrorCode),
        captureSessionId: `session.s10.${spec.operation}.${spec.label}.${number}`,
        sourceFamilyId: `family.s10.${spec.operation}.${spec.label}.${number}`,
        priorManifestRef, priorSourceRef, priorGoldRef, priorNormalizedArtifactRef,
        rawAsset: priorEntry.rawAsset,
        injectedDefectCanonicalJson: priorEntry.injectedDefect === null
          ? null : canonicalJsonSlice05(priorEntry.injectedDefect),
        independenceClaim: false, copiedImageBytes: false, frozenAt: freeze,
        evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
      });
      const sourcePath = `source-lineage/${spec.operation}/${partitionToken(spec.partition)}/${sourceId}.json`;
      const sourceRef = descriptor(sourcePath, wrapper, fileMap);
      sourceRefs.push(sourceRef);
      const identityPath = `gold-identities/${spec.operation}/${partitionToken(spec.partition)}/gold-identity.${sourceId}.json`;
      entries.push({
        sourceRef, categoryId: priorEntry.categoryId, disposition,
        expectedStableErrorCode: mapErrorCode(priorEntry.expectedStableErrorCode),
        goldIdentityLocator: disposition === "applicable" ? { path: identityPath, id: `gold-identity.${sourceId}` } : null,
      });
      if (disposition === "applicable") pendingGold.push({ sourceRef, priorGoldRef, priorNormalizedArtifactRef, identityPath });
    }
    const applicableSourceCount = entries.filter((entry) => entry.disposition === "applicable").length;
    const rejectionSourceCount = entries.length - applicableSourceCount;
    const manifest = withHash({
      schemaVersion: "manifest.slice10.v0", id: manifestId, operation: spec.operation, partition: spec.partition,
      priorManifestRef, contractRef: contractRefs[spec.operation], rightsRef, entries,
      sourceCount: entries.length, applicableSourceCount, rejectionSourceCount, repetitions: 3,
      copiedImageBytes: 0, frozenAt: freeze, evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
    });
    const manifestRef = descriptor(manifestPath, manifest, fileMap);
    manifestRefs.push(manifestRef);
    manifestRefsByOperation[spec.operation].push(manifestRef);
    for (const pending of pendingGold) {
      const priorGoldBytes = await readFile(path.join(PROJECT_ROOT, ...pending.priorGoldRef.path.split("/")));
      const priorGold = JSON.parse(priorGoldBytes);
      const identity = withHash({
        schemaVersion: "gold-identity.slice10.v0", id: `gold-identity.${pending.sourceRef.id}`,
        operation: spec.operation, partition: spec.partition, sourceRef: pending.sourceRef,
        manifestLocator: { path: manifestPath, id: manifestId }, priorGoldRef: pending.priorGoldRef,
        priorNormalizedArtifactRef: pending.priorNormalizedArtifactRef,
        expectedCanonicalJson: canonicalJsonSlice05(priorGold.expected), candidateOutputUsed: false,
        candidateDependencyUsed: false, independenceClaim: false, frozenAt: freeze,
        evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
      });
      const identityRef = descriptor(pending.identityPath, identity, fileMap);
      goldIdentityRefs.push(identityRef);
      goldRefsByOperation[spec.operation].push(identityRef);
    }
  }

  const preregistrationRefs = {};
  for (const operation of OPERATIONS) {
    const prereg = withHash({
      schemaVersion: "preregistration.slice10.v0", id: `PREREG-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.10.0`,
      operation, frozenAt: freeze, candidateRef, contractRef: contractRefs[operation], admissionLineageRef,
      planRef: planRefs[operation], manifestRefs: manifestRefsByOperation[operation],
      goldIdentityRefs: goldRefsByOperation[operation], sourceCount: 48, attemptCount: 144,
      repetitions: 3, replacements: 0, allAttemptsMustPass: true,
      allApplicableSourcesMustBeDeterministic: true, formal: false, c1Eligible: false,
      productSupport: false, evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
    });
    preregistrationRefs[operation] = descriptor(SLICE10_PREVIEW_PATHS[`${operation}Prereg`], prereg, fileMap);
  }

  if (sourceRefs.length !== 96 || goldIdentityRefs.length !== 48 || manifestRefs.length !== 4 || fileMap.size !== 181) {
    throw new Error(`Slice 10 preview population mismatch: files=${fileMap.size}, sources=${sourceRefs.length}, gold=${goldIdentityRefs.length}`);
  }
  const generatorSha256 = implementations.find((entry) => entry.id === "GENERATOR-SLICE10-DEFINITION-PREVIEW@0.10.0").sha256;
  const index = withHash({
    schemaVersion: "definition-index.slice10.v0", id: "DEFINITION-INDEX-SLICE10-PREVIEW@0.10.0", frozenAt: freeze,
    definitionState: "preview-not-frozen-central-validator-not-created", candidateRef,
    contractRefs: [contractRefs.normalize, contractRefs.export], runtimeRef, hardwareRef, rightsRef,
    admissionLineageRef, planRefs: [planRefs.normalize, planRefs.export],
    preregistrationRefs: [preregistrationRefs.normalize, preregistrationRefs.export],
    manifestRefs, sourceRefs, goldIdentityRefs,
    schemaPaths: Object.keys(SLICE10_PREVIEW_SCHEMA_DOCUMENTS).sort(),
    runnerRef: implementations.find((entry) => entry.id === "RUNNER-OPEN-CALIBRATION@0.10.0"),
    resultProtocol: {
      driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 96, plannedAttempts: 288,
      replacements: 0, resultsRoot: "results/open-calibration",
      ordinaryCompleteNonPassStopsOtherOperation: false, globalProtocolUncertaintyStopsAll: true,
    },
    counts: {
      applicableSources: 48, copiedImageBytes: 0, goldIdentities: 48, manifests: 4,
      plannedAttempts: 288, rejectionSources: 48, sourceWrappers: 96, sources: 96,
    },
    resultsState: "not-created", formalHoldoutState: "not-created", generatorSha256,
    readmeSha256: sha256Slice10Definition(readme), descendantFileCount: fileMap.size,
    descendantTreeSha256: digestSlice10Files(fileMap), evidenceBoundary: SLICE10_EVIDENCE_BOUNDARY,
  });
  fileMap.set(SLICE10_PREVIEW_PATHS.definition, canonicalBytesSlice10(index));
  return Object.freeze({ index, fileMap, readmeBytes: Buffer.from(readme) });
}

async function main() {
  throw new Error("Slice 10 preview generator has no materialization CLI; complete and freeze the runner first");
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
