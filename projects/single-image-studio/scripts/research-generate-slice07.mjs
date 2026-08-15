import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inventorySharpRuntimeSlice05, canonicalJsonSlice05 } from "./research-inventory-sharp-slice05.mjs";
import { decodeIndependentPngSlice05 } from "./research-independent-png-oracle-slice05.mjs";
import { SLICE07_RUNNER_SCHEMA_DOCUMENTS } from "./research-gateb-runner-slice07.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-07");
const EVIDENCE = Object.freeze({
  C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0, productSupport: false,
  formal: false, releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});
const ID_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,299}$";
const SHA_PATTERN = "^[a-f0-9]{64}$";
const UTC_PATTERN = "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$";

export const SLICE07_GENERATOR_VERSION = "slice07-definition-generator.v0.7.0";
export const SLICE07_DEFINITION_PATHS = Object.freeze({
  definition: "definition-index.v0.7.0.json",
  runtime: "runtime/runtime-attestation.v0.7.0.json",
  hardware: "hardware/named-hardware.v0.7.0.json",
  candidate: "candidate-locks/composite-canonical-png.v0.7.0.json",
  normalizeContract: "contracts/cc-cap02-normalize-png.v0.7.0.json",
  exportContract: "contracts/cc-cap02-export-png.v0.7.0.json",
  rights: "rights/open-synthetic-lineage.v0.7.0.json",
  plan: "plans/gateb-open-smoke.v0.7.0.json",
  normalizePrereg: "preregistrations/normalize-gateb.v0.7.0.json",
  exportPrereg: "preregistrations/export-gateb.v0.7.0.json",
  normalizeManifest: "manifests/normalize-smoke.v0.7.0.json",
  exportManifest: "manifests/export-smoke.v0.7.0.json",
});

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value), null, 2)}\n`, "utf8"); }
function withHash(value) { return { ...value, contentHash: sha256(Buffer.from(JSON.stringify(stable(value)), "utf8")) }; }
function utc(value) {
  if (typeof value !== "string" || !new RegExp(UTC_PATTERN, "u").test(value) || new Date(value).toISOString() !== value) {
    throw new Error("Slice 07 freeze requires a canonical real UTC millisecond instant");
  }
  return value;
}
function schema(name, properties) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-07/schemas/${name}`,
    type: "object", additionalProperties: false, required: Object.keys(properties), properties,
  };
}
const s = { type: "string" };
const id = { type: "string", pattern: ID_PATTERN };
const hex = { type: "string", pattern: SHA_PATTERN };
const utcSchema = { type: "string", pattern: UTC_PATTERN, format: "date-time" };
const evidenceSchema = {
  type: "object", additionalProperties: false, required: Object.keys(EVIDENCE),
  properties: Object.fromEntries(Object.entries(EVIDENCE).map(([key, value]) => [key, { const: value }])),
};
const refSchema = schema("record-ref.inline", { path: s, id, contentHash: hex, byteLength: { type: "integer", minimum: 1 }, fileSha256: hex });
delete refSchema.$schema; delete refSchema.$id;
const implSchema = schema("implementation-ref.inline", { id, path: s, sha256: hex });
delete implSchema.$schema; delete implSchema.$id;
const expectedSchema = schema("expected.inline", {
  decodedPixelSha256: hex, width: { type: "integer", minimum: 1, maximum: 256 }, height: { type: "integer", minimum: 1, maximum: 256 },
  pixelLayout: { const: "RGBA8" }, colorSpace: { const: "embedded-sRGB" }, orientation: { const: 1 },
  alphaMode: { const: "straight-unpremultiplied" }, alphaPresent: { type: "boolean" },
  metadataPolicy: { const: "strip-all-except-color-contract" }, pngFilterPolicy: { const: "filter-0-only" },
  interlace: { const: "forbidden" }, animation: { const: "forbidden" },
});
delete expectedSchema.$schema; delete expectedSchema.$id;

export const SLICE07_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/runtime-attestation.slice07.v0.schema.json": schema("runtime-attestation.slice07.v0.schema.json", {
    schemaVersion: { const: "runtime-attestation.slice07.v0" }, id, frozenAt: utcSchema,
    inventoryCanonicalJson: s, inventoryPayloadSha256: hex, workerRuntimeCanonicalJson: s, workerRuntimeSha256: hex,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/hardware-profile.slice07.v0.schema.json": schema("hardware-profile.slice07.v0.schema.json", {
    schemaVersion: { const: "hardware-profile.slice07.v0" }, id, frozenAt: utcSchema,
    platform: { const: "win32" }, architecture: { const: "x64" }, osRelease: s, osVersion: s,
    cpuModel: s, logicalProcessors: { type: "integer", minimum: 1 }, totalMemoryBytes: { type: "integer", minimum: 1 },
    nodeVersion: s, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/candidate-lock.slice07.v0.schema.json": schema("candidate-lock.slice07.v0.schema.json", {
    schemaVersion: { const: "candidate-lock.slice07.v0" }, id: { const: "REG-NORM-SHARP-CANONICAL-PNG@0.7.0" },
    frozenAt: utcSchema, sharpVersion: { const: "0.35.3" }, architecture: { const: "sharp-raw-rgba-plus-project-canonical-png-encoder" },
    implementationRefs: { type: "array", minItems: 7, maxItems: 7, items: implSchema },
    slice06DefinitionRef: refSchema, slice06EvidenceFileSha256: hex,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/capability-contract.slice07.v0.schema.json": schema("capability-contract.slice07.v0.schema.json", {
    schemaVersion: { const: "capability-contract.slice07.v0" }, id, operation: { enum: ["normalize", "export"] },
    candidateRef: refSchema, inputBoundary: s, outputProfile: { const: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0" },
    maxDimension: { const: 256 }, maxOutputBytes: { const: 1048576 }, passthrough: { const: false }, fallback: { const: false },
    oracleRepair: { const: false }, productSupport: { const: false }, frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/rights.slice07.v0.schema.json": schema("rights.slice07.v0.schema.json", {
    schemaVersion: { const: "rights.slice07.v0" }, id, projectOriginalSyntheticOnly: { const: true },
    realUserPhotos: { const: false }, thirdPartyImageAssets: { const: false }, modelWeights: { const: false },
    repositoryRetentionAllowed: { const: true }, productUseAuthorized: { const: false }, frozenAt: utcSchema,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/gateb-plan.slice07.v0.schema.json": schema("gateb-plan.slice07.v0.schema.json", {
    schemaVersion: { const: "gateb-plan.slice07.v0" }, id, frozenAt: utcSchema,
    driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, sourcesPerOperation: { const: 6 },
    repetitionsPerSource: { const: 3 }, plannedAttempts: { const: 36 }, replacements: { const: 0 },
    operationOrder: { type: "array", minItems: 2, maxItems: 2, items: { enum: ["normalize", "export"] } },
    ordinaryNonPassContinues: { const: true }, protocolFailureGlobalStop: { const: true }, calibrationAuthorized: { const: false },
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/preregistration.slice07.v0.schema.json": schema("preregistration.slice07.v0.schema.json", {
    schemaVersion: { const: "preregistration.slice07.v0" }, id, operation: { enum: ["normalize", "export"] },
    contractRef: refSchema, planRef: refSchema, manifestRef: refSchema, sources: { const: 6 }, attempts: { const: 18 },
    applicableSources: { const: 3 }, rejectionSources: { const: 3 }, repetitions: { const: 3 }, replacements: { const: 0 },
    allAttemptsMustPass: { const: true }, allThreePerSourceMustPass: { const: true }, calibrationAuthorized: { const: false },
    frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/source-lineage.slice07.v0.schema.json": schema("source-lineage.slice07.v0.schema.json", {
    schemaVersion: { const: "source-lineage.slice07.v0" }, id, operation: { enum: ["normalize", "export"] },
    sourceId: id, priorSourceId: id, sourceFamilyId: id, captureSessionId: id, categoryId: id,
    disposition: { enum: ["applicable", "rejection"] }, expectedStableErrorCode: { oneOf: [{ type: "null" }, s] },
    rawAssetPath: s, rawAssetByteLength: { type: "integer", minimum: 1 }, rawAssetFileSha256: hex,
    rawAssetDecodedPixelSha256: { oneOf: [{ type: "null" }, hex] }, rawAssetMime: s,
    sourceDeclarationMime: s, sourceDeclarationDecodedPixelSha256: { oneOf: [{ type: "null" }, hex] },
    normalizedArtifactPath: { oneOf: [{ type: "null" }, s] }, normalizedArtifactFileSha256: { oneOf: [{ type: "null" }, hex] },
    goldRecordPath: { oneOf: [{ type: "null" }, s] }, goldRecordFileSha256: { oneOf: [{ type: "null" }, hex] }, priorManifestContentHash: hex,
    independenceClaim: { const: false }, copiedImageBytes: { const: false }, frozenAt: utcSchema,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/manifest.slice07.v0.schema.json": schema("manifest.slice07.v0.schema.json", {
    schemaVersion: { const: "manifest.slice07.v0" }, id, operation: { enum: ["normalize", "export"] },
    contractRef: refSchema, rightsRef: refSchema, entries: { type: "array", minItems: 6, maxItems: 6, items: schema("entry.inline", {
      sourceId: id, disposition: { enum: ["applicable", "rejection"] },
      expectedStableErrorCode: { oneOf: [{ type: "null" }, s] }, expected: { oneOf: [{ type: "null" }, expectedSchema] },
      wrapperRef: refSchema,
    }) },
    sources: { const: 6 }, applicableSources: { const: 3 }, rejectionSources: { const: 3 }, repetitions: { const: 3 },
    frozenAt: utcSchema, evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
  "schemas/definition-index.slice07.v0.schema.json": schema("definition-index.slice07.v0.schema.json", {
    schemaVersion: { const: "definition-index.slice07.v0" }, id: { const: "DEFINITION-INDEX-SLICE07@0.7.0" },
    frozenAt: utcSchema, candidateRef: refSchema, contractRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    runtimeRef: refSchema, hardwareRef: refSchema, rightsRef: refSchema, planRef: refSchema,
    preregistrationRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    manifestRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    schemaPaths: { type: "array", minItems: 16, maxItems: 16, items: s },
    resultProtocol: schema("result-protocol.inline", {
      driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, plannedSources: { const: 12 },
      plannedAttempts: { const: 36 }, replacements: { const: 0 }, resultsRoot: { const: "results/open-smoke" },
    }),
    resultsState: { const: "not-created" }, copiedImageBytes: { const: 0 }, generatorSha256: hex, readmeSha256: hex,
    descendantFileCount: { type: "integer", minimum: 1 }, descendantTreeSha256: hex,
    evidenceBoundary: evidenceSchema, contentHash: hex,
  }),
});

export const SLICE07_SCHEMA_DOCUMENTS = Object.freeze({ ...SLICE07_RUNNER_SCHEMA_DOCUMENTS, ...SLICE07_MACHINE_SCHEMA_DOCUMENTS });

async function descriptor(relativePath, record, fileMap) {
  const bytes = bytesOf(record);
  fileMap.set(relativePath, bytes);
  return { path: relativePath, id: record.id, contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) };
}

async function implementationRef(relativePath, idValue) {
  const bytes = await readFile(path.join(PROJECT_ROOT, relativePath));
  return { id: idValue, path: relativePath, sha256: sha256(bytes) };
}

async function oldRef(relativePath, idValue = null) {
  const absolute = path.join(PROJECT_ROOT, "research", "slice-05", relativePath);
  const bytes = await readFile(absolute);
  const value = JSON.parse(bytes);
  return { path: relativePath, id: idValue ?? value.id ?? value.goldRecordId ?? value.artifactId ?? value.sourceId, contentHash: value.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) };
}

function expectedFromGold(gold) {
  const value = gold.expected;
  return {
    decodedPixelSha256: value.decodedPixelSha256, width: value.width, height: value.height,
    pixelLayout: value.pixelLayout, colorSpace: value.colorSpace, orientation: value.orientation,
    alphaMode: value.alphaMode, alphaPresent: value.alphaPresent, metadataPolicy: value.metadataPolicy,
    pngFilterPolicy: value.pngFilterPolicy, interlace: value.interlace, animation: value.animation,
  };
}

function digestFiles(fileMap) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...fileMap.entries()].sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)))) {
    hash.update(relativePath); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0]));
    hash.update(sha256(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

export async function buildSlice07Definition({ frozenAt, readmeBytes = null } = {}) {
  const freeze = utc(frozenAt);
  const fileMap = new Map();
  for (const [relativePath, document] of Object.entries(SLICE07_SCHEMA_DOCUMENTS)) fileMap.set(relativePath, bytesOf(document));
  const inventory = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  const inventoryCanonicalJson = canonicalJsonSlice05(inventory);
  const workerRuntime = {
    sharpVersion: inventory.versions.sharpRuntime.values.sharp,
    nativeVersions: inventory.versions.sharpRuntime.values,
    nodeVersion: inventory.environment.node.version,
    platform: inventory.environment.os.platform,
    architecture: inventory.environment.os.architecture,
    settings: { concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1" },
  };
  const workerRuntimeCanonicalJson = canonicalJsonSlice05(workerRuntime);
  const runtime = withHash({ schemaVersion: "runtime-attestation.slice07.v0", id: "RUNTIME-SHARP-CANONICAL-PNG@0.7.0", frozenAt: freeze,
    inventoryCanonicalJson, inventoryPayloadSha256: inventory.attestation.payloadSha256,
    workerRuntimeCanonicalJson, workerRuntimeSha256: sha256(Buffer.from(workerRuntimeCanonicalJson)), evidenceBoundary: EVIDENCE });
  const runtimeRef = await descriptor(SLICE07_DEFINITION_PATHS.runtime, runtime, fileMap);
  const env = inventory.environment;
  const hardware = withHash({ schemaVersion: "hardware-profile.slice07.v0", id: "HARDWARE-WIN32-X64-GATEB@0.7.0", frozenAt: freeze,
    platform: env.os.platform, architecture: env.os.architecture, osRelease: env.os.release, osVersion: env.os.version,
    cpuModel: env.cpu.models.join(" | "), logicalProcessors: env.cpu.logicalProcessors, totalMemoryBytes: env.memory.totalBytes,
    nodeVersion: env.node.version, evidenceBoundary: EVIDENCE });
  const hardwareRef = await descriptor(SLICE07_DEFINITION_PATHS.hardware, hardware, fileMap);
  const implementations = await Promise.all([
    implementationRef("scripts/research-canonical-png-encoder-slice07.mjs", "ENCODER-CANONICAL-PNG@0.7.0"),
    implementationRef("scripts/research-sharp-raw-worker-slice07.mjs", "WORKER-SHARP-RAW-RGBA@0.7.0"),
    implementationRef("scripts/research-gateb-adapter-slice07.mjs", "ADAPTER-SHARP-CANONICAL-PNG@0.7.0"),
    implementationRef("scripts/research-gateb-runner-slice07.mjs", "RUNNER-GATEB-OPEN-SMOKE@0.7.0"),
    implementationRef("scripts/research-independent-png-oracle-slice05.mjs", "ORACLE-INDEPENDENT-PNG@0.5.0"),
    implementationRef("scripts/research-run-slice07.mjs", "DRIVER-REGISTERED-GATEB-SMOKE@0.7.0"),
    implementationRef("scripts/research-generate-slice07.mjs", "GENERATOR-SLICE07-DEFINITION@0.7.0"),
  ]);
  const slice06Index = await oldRef("../slice-06/definition-index.v0.6.0.json", "DEFINITION-INDEX-SLICE06@0.6.0");
  const evidenceBytes = await readFile(path.join(PROJECT_ROOT, "research", "SLICE_06_EVIDENCE.md"));
  const candidate = withHash({ schemaVersion: "candidate-lock.slice07.v0", id: "REG-NORM-SHARP-CANONICAL-PNG@0.7.0", frozenAt: freeze,
    sharpVersion: "0.35.3", architecture: "sharp-raw-rgba-plus-project-canonical-png-encoder", implementationRefs: implementations,
    slice06DefinitionRef: slice06Index, slice06EvidenceFileSha256: sha256(evidenceBytes), evidenceBoundary: EVIDENCE });
  const candidateRef = await descriptor(SLICE07_DEFINITION_PATHS.candidate, candidate, fileMap);
  const rights = withHash({ schemaVersion: "rights.slice07.v0", id: "RIGHTS-OPEN-SYNTHETIC-LINEAGE@0.7.0", projectOriginalSyntheticOnly: true,
    realUserPhotos: false, thirdPartyImageAssets: false, modelWeights: false, repositoryRetentionAllowed: true,
    productUseAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
  const rightsRef = await descriptor(SLICE07_DEFINITION_PATHS.rights, rights, fileMap);
  const contracts = {};
  for (const operation of ["normalize", "export"]) {
    contracts[operation] = withHash({ schemaVersion: "capability-contract.slice07.v0", id: `CC-CAP02-${operation.toUpperCase()}-PNG@0.7.0`, operation,
      candidateRef, inputBoundary: operation === "normalize" ? "frozen-canonical-png-source" : "independent-normalized-image-lineage",
      outputProfile: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0", maxDimension: 256, maxOutputBytes: 1048576,
      passthrough: false, fallback: false, oracleRepair: false, productSupport: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
  }
  const normalizeContractRef = await descriptor(SLICE07_DEFINITION_PATHS.normalizeContract, contracts.normalize, fileMap);
  const exportContractRef = await descriptor(SLICE07_DEFINITION_PATHS.exportContract, contracts.export, fileMap);
  const contractRefs = { normalize: normalizeContractRef, export: exportContractRef };
  const plan = withHash({ schemaVersion: "gateb-plan.slice07.v0", id: "PLAN-GATEB-OPEN-SMOKE@0.7.0", frozenAt: freeze,
    driverInvocations: 1, registeredOperationRuns: 2, sourcesPerOperation: 6, repetitionsPerSource: 3, plannedAttempts: 36,
    replacements: 0, operationOrder: ["normalize", "export"], ordinaryNonPassContinues: true,
    protocolFailureGlobalStop: true, calibrationAuthorized: false, evidenceBoundary: EVIDENCE });
  const planRef = await descriptor(SLICE07_DEFINITION_PATHS.plan, plan, fileMap);
  const manifests = {};
  const manifestRefs = {};
  const wrapperRefs = { normalize: [], export: [] };
  for (const operation of ["normalize", "export"]) {
    const oldManifestPath = path.join(PROJECT_ROOT, "research", "slice-05", "manifests", `${operation}-smoke.v0.5.0.json`);
    const oldManifest = JSON.parse(await readFile(oldManifestPath, "utf8"));
    const entries = [];
    for (let index = 0; index < oldManifest.entries.length; index += 1) {
      const old = oldManifest.entries[index];
      const sourceId = `source.s07.${operation}.smoke.${String(index + 1).padStart(3, "0")}`;
      const disposition = old.expectedDisposition === "artifact-required" ? "applicable" : "rejection";
      const code = disposition === "applicable" ? null
        : operation === "normalize" ? ["S07_INPUT_CRC_MISMATCH", "S07_INPUT_SRGB_REQUIRED", "S07_NORMALIZE_SOURCE_DECLARATION_INVALID"][index - 3]
          : "S07_EXPORT_NORMALIZED_ARTIFACT_INVALID";
      const goldBytes = old.goldRecordRef
        ? await readFile(path.join(PROJECT_ROOT, "research", "slice-05", old.goldRecordRef.path)) : null;
      const gold = goldBytes ? JSON.parse(goldBytes) : null;
      const artifactBytes = old.normalizedArtifactRef
        ? await readFile(path.join(PROJECT_ROOT, "research", "slice-05", old.normalizedArtifactRef.path)) : null;
      const wrapper = withHash({ schemaVersion: "source-lineage.slice07.v0", id: `lineage.${sourceId}`, operation, sourceId,
        priorSourceId: old.sourceId, sourceFamilyId: `family.s07.${operation}.smoke.${String(index + 1).padStart(3, "0")}`,
        captureSessionId: `session.s07.${operation}.smoke.${String(index + 1).padStart(3, "0")}`, categoryId: old.categoryId,
        disposition, expectedStableErrorCode: code, rawAssetPath: old.rawAsset.path, rawAssetByteLength: old.rawAsset.byteLength,
        rawAssetFileSha256: old.rawAsset.fileSha256, rawAssetDecodedPixelSha256: old.rawAsset.decodedPixelSha256,
        rawAssetMime: old.rawAsset.mime, sourceDeclarationMime: old.sourceProvenanceRef ? old.rawAsset.mime : "unknown",
        sourceDeclarationDecodedPixelSha256: old.rawAsset.sourceDeclarationDecodedPixelSha256,
        normalizedArtifactPath: old.normalizedArtifactRef?.path ?? null,
        normalizedArtifactFileSha256: artifactBytes ? sha256(artifactBytes) : null,
        goldRecordPath: old.goldRecordRef?.path ?? null, goldRecordFileSha256: goldBytes ? sha256(goldBytes) : null,
        priorManifestContentHash: oldManifest.contentHash, independenceClaim: false, copiedImageBytes: false,
        frozenAt: freeze, evidenceBoundary: EVIDENCE });
      const wrapperPath = `source-lineage/${operation}/${sourceId}.json`;
      const wrapperRef = await descriptor(wrapperPath, wrapper, fileMap);
      wrapperRefs[operation].push(wrapperRef);
      entries.push({ sourceId, disposition, expectedStableErrorCode: code, expected: disposition === "applicable" ? expectedFromGold(gold) : null, wrapperRef });
    }
    manifests[operation] = withHash({ schemaVersion: "manifest.slice07.v0", id: `FM-GATEB-${operation.toUpperCase()}-PNG@0.7.0`, operation,
      contractRef: contractRefs[operation], rightsRef, entries, sources: 6, applicableSources: 3, rejectionSources: 3,
      repetitions: 3, frozenAt: freeze, evidenceBoundary: EVIDENCE });
    manifestRefs[operation] = await descriptor(SLICE07_DEFINITION_PATHS[`${operation}Manifest`], manifests[operation], fileMap);
  }
  const preregRefs = {};
  for (const operation of ["normalize", "export"]) {
    const prereg = withHash({ schemaVersion: "preregistration.slice07.v0", id: `PREREG-GATEB-${operation.toUpperCase()}-PNG@0.7.0`, operation,
      contractRef: contractRefs[operation], planRef, manifestRef: manifestRefs[operation], sources: 6, attempts: 18,
      applicableSources: 3, rejectionSources: 3, repetitions: 3, replacements: 0, allAttemptsMustPass: true,
      allThreePerSourceMustPass: true, calibrationAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
    preregRefs[operation] = await descriptor(SLICE07_DEFINITION_PATHS[`${operation}Prereg`], prereg, fileMap);
  }
  const generatorSha256 = implementations.find((entry) => entry.id === "GENERATOR-SLICE07-DEFINITION@0.7.0").sha256;
  const readme = readmeBytes ?? await readFile(path.join(DEFAULT_ROOT, "README.md"));
  const descendantFileCount = fileMap.size;
  const descendantTreeSha256 = digestFiles(fileMap);
  const index = withHash({ schemaVersion: "definition-index.slice07.v0", id: "DEFINITION-INDEX-SLICE07@0.7.0", frozenAt: freeze,
    candidateRef, contractRefs: [normalizeContractRef, exportContractRef], runtimeRef, hardwareRef, rightsRef, planRef,
    preregistrationRefs: [preregRefs.normalize, preregRefs.export], manifestRefs: [manifestRefs.normalize, manifestRefs.export],
    schemaPaths: Object.keys(SLICE07_SCHEMA_DOCUMENTS).sort(), resultProtocol: { driverInvocations: 1, registeredOperationRuns: 2,
      plannedSources: 12, plannedAttempts: 36, replacements: 0, resultsRoot: "results/open-smoke" },
    resultsState: "not-created", copiedImageBytes: 0, generatorSha256, readmeSha256: sha256(readme),
    descendantFileCount, descendantTreeSha256, evidenceBoundary: EVIDENCE });
  fileMap.set(SLICE07_DEFINITION_PATHS.definition, bytesOf(index));
  return { index, fileMap, readmeBytes: Buffer.from(readme) };
}

export async function materializeSlice07Definition({ outputRoot = DEFAULT_ROOT, frozenAt, allowExistingReadme = true } = {}) {
  const readmePath = path.join(outputRoot, "README.md");
  let readmeBytes;
  try { readmeBytes = await readFile(readmePath); } catch { readmeBytes = await readFile(path.join(DEFAULT_ROOT, "README.md")); }
  let existing = [];
  try { existing = await readdir(outputRoot); } catch {}
  const forbiddenExisting = existing.filter((name) => name !== "README.md");
  if (forbiddenExisting.length > 0 || (!allowExistingReadme && existing.length > 0)) throw new Error("Slice 07 output root is not results-zero/empty");
  const built = await buildSlice07Definition({ frozenAt, readmeBytes });
  await mkdir(outputRoot, { recursive: true });
  if (!existing.includes("README.md")) await writeFile(readmePath, readmeBytes, { flag: "wx" });
  for (const [relativePath, bytes] of built.fileMap) {
    const absolute = path.join(outputRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes, { flag: "wx" });
  }
  return built.index;
}

export async function treeDigestSlice07(root) {
  const files = new Map();
  async function visit(directory, prefix = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(directory, entry.name), relative);
      else if (entry.isFile()) files.set(relative, await readFile(path.join(directory, entry.name)));
      else throw new Error("links and non-regular files are forbidden");
    }
  }
  await visit(root);
  return { fileCount: files.size, totalBytes: [...files.values()].reduce((sum, value) => sum + value.length, 0), sha256: digestFiles(files) };
}

async function main() {
  const args = process.argv.slice(2);
  const freezeIndex = args.indexOf("--frozen-at");
  const outputIndex = args.indexOf("--output-root");
  if (freezeIndex < 0) throw new Error("--frozen-at is required");
  const frozenAt = args[freezeIndex + 1];
  const outputRoot = outputIndex >= 0 ? path.resolve(args[outputIndex + 1]) : DEFAULT_ROOT;
  const index = await materializeSlice07Definition({ outputRoot, frozenAt });
  process.stdout.write(`${JSON.stringify({ outputRoot, index }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch(async (error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
