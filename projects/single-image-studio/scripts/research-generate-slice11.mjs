import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonSlice05, inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import { SLICE11_EVIDENCE_BOUNDARY } from "./research-calibration-lifecycle-slice11.mjs";
import { SLICE11_OPERATION_SCHEMA_DOCUMENTS } from "./research-calibration-operation-slice11.mjs";
import { SLICE11_PROTOCOL_SCHEMA_DOCUMENTS } from "./research-calibration-protocol-slice11.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const ROOT = path.join(PROJECT_ROOT, "research", "slice-11");
const PRIOR_ROOT = path.join(PROJECT_ROOT, "research", "slice-10");
const OPERATIONS = Object.freeze(["normalize", "export"]);
const PARTITIONS = Object.freeze(["dev/calibration", "defect/calibration"]);

export const SLICE11_GENERATOR_VERSION = "slice11-definition-generator.v0.11.0";
export const SLICE11_DEFINITION_PATH = "definition-index.v0.11.0.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
export function canonicalBytesSlice11Definition(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
export function sha256Slice11Definition(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: sha256Slice11Definition(canonicalBytesSlice11Definition(value)) }); }
function utc(value) {
  if (typeof value !== "string" || new Date(value).toISOString() !== value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) throw new Error("exact millisecond UTC required");
  return value;
}
function objectSchema(properties, required = Object.keys(properties)) { return { type: "object", additionalProperties: false, required, properties }; }
function schema(name, properties) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://single-image-studio.invalid/research/slice-11/schemas/${name}`, ...objectSchema(properties) };
}
const text = { type: "string", minLength: 1, maxLength: 200000 };
const id = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,199}$" };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const time = { type: "string", format: "date-time" };
const ref = objectSchema({ path: text, id, contentHash: hex, byteLength: { type: "integer", minimum: 1 }, fileSha256: hex });
const locator = objectSchema({ path: text, id });
const implementation = objectSchema({ path: text, id, sha256: hex });
const nullableRef = { oneOf: [{ type: "null" }, ref] };
const nullableLocator = { oneOf: [{ type: "null" }, locator] };
const nullableText = { oneOf: [{ type: "null" }, text] };
const evidence = objectSchema(Object.fromEntries(Object.entries(SLICE11_EVIDENCE_BOUNDARY).map(([key, value]) => [key, { const: value }])));
const rawAsset = objectSchema({
  path: text, mime: text, byteLength: { type: "integer", minimum: 1 }, fileSha256: hex,
  decodedPixelSha256: { oneOf: [{ type: "null" }, hex] }, sourceDeclarationDecodedPixelSha256: { oneOf: [{ type: "null" }, hex] },
});
const manifestEntry = objectSchema({ sourceRef: ref, categoryId: id, disposition: { enum: ["applicable", "rejection"] }, expectedStableErrorCode: nullableText, goldIdentityLocator: nullableLocator });
const partitionCount = objectSchema({ partition: { enum: PARTITIONS }, sources: { type: "integer", minimum: 18, maximum: 30 }, applicableSources: { type: "integer", minimum: 6, maximum: 18 }, rejectionSources: { type: "integer", minimum: 12, maximum: 12 }, attempts: { type: "integer", minimum: 54, maximum: 90 } });

export const SLICE11_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/candidate-lock.slice11.v0.schema.json": schema("candidate-lock.slice11.v0.schema.json", {
    schemaVersion: { const: "candidate-lock.slice11.v0" }, id, frozenAt: time, architecture: { const: "sharp-raw-rgba-plus-project-canonical-png-encoder" }, versionReason: text,
    slice10LineageRef: ref, implementationRefs: { type: "array", minItems: 12, maxItems: 12, items: implementation }, executionState: { const: "frozen-results-zero-awaiting-definition-commit" }, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/capability-contract.slice11.v0.schema.json": schema("capability-contract.slice11.v0.schema.json", {
    schemaVersion: { const: "capability-contract.slice11.v0" }, id, operation: { enum: OPERATIONS }, candidateRef: ref, priorContractRef: ref,
    semanticDeltaFromSlice10: { const: "none-image-semantics-protocol-only" }, outputProfile: { const: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0" }, maxDimension: { const: 256 }, maxOutputBytes: { const: 1048576 },
    passthrough: { const: false }, fallback: { const: false }, oracleRepair: { const: false }, productSupport: { const: false }, frozenAt: time, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/runtime-attestation.slice11.v0.schema.json": schema("runtime-attestation.slice11.v0.schema.json", {
    schemaVersion: { const: "runtime-attestation.slice11.v0" }, id, frozenAt: time, observationState: { const: "definition-freeze-read-versions-only-no-image-pipeline" },
    inventoryCanonicalJson: text, inventoryPayloadSha256: hex, workerRuntimeCanonicalJson: text, workerRuntimeSha256: hex,
    platform: text, architecture: text, osRelease: text, cpuModel: text, logicalProcessors: { type: "integer", minimum: 1 }, totalMemoryBytes: { type: "integer", minimum: 1 }, nodeVersion: text,
    hostnameRecorded: { const: false }, serialRecorded: { const: false }, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/slice10-failure-lineage.slice11.v0.schema.json": schema("slice10-failure-lineage.slice11.v0.schema.json", {
    schemaVersion: { const: "slice10-failure-lineage.slice11.v0" }, id, frozenAt: time, slice10DefinitionRef: ref,
    slice10DefinitionCommit: text, slice10ResultCommit: text, slice10ResultTreeSha256: hex, priorState: { const: "closed-protocol-failed-invalid-lifecycle" }, replayAuthority: { const: false }, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/open-calibration-plan.slice11.v0.schema.json": schema("open-calibration-plan.slice11.v0.schema.json", {
    schemaVersion: { const: "open-calibration-plan.slice11.v0" }, id, operation: { enum: OPERATIONS }, frozenAt: time,
    sourceCount: { const: 48 }, applicableSourceCount: { const: 24 }, rejectionSourceCount: { const: 24 }, repetitionsPerSource: { const: 3 }, plannedAttempts: { const: 144 }, replacements: { const: 0 },
    sourcePassRule: { const: "all-three-registered-repetitions-must-pass" }, validFailureRerunAllowed: { const: false }, ordinaryCompleteNonPassStopsOtherOperation: { const: false },
    globalStopClasses: { type: "array", minItems: 7, maxItems: 7, items: { enum: ["protocol", "lifecycle", "missing", "timeout", "cancel", "reconciliation", "runtime-drift"] } },
    partitionCounts: { type: "array", minItems: 2, maxItems: 2, items: partitionCount }, formal: { const: false }, c1Eligible: { const: false }, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/source-lineage.slice11.v0.schema.json": schema("source-lineage.slice11.v0.schema.json", {
    schemaVersion: { const: "source-lineage.slice11.v0" }, id, operation: { enum: OPERATIONS }, partition: { enum: PARTITIONS }, disposition: { enum: ["applicable", "rejection"] }, categoryId: id,
    expectedStableErrorCode: nullableText, captureSessionId: id, sourceFamilyId: id, priorSlice10SourceRef: ref, priorSlice10GoldIdentityRef: nullableRef,
    rawAsset, independenceClaim: { const: false }, copiedImageBytes: { const: false }, frozenAt: time, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/gold-identity.slice11.v0.schema.json": schema("gold-identity.slice11.v0.schema.json", {
    schemaVersion: { const: "gold-identity.slice11.v0" }, id, operation: { enum: OPERATIONS }, partition: { enum: PARTITIONS }, sourceRef: ref,
    manifestLocator: locator, priorSlice10GoldIdentityRef: ref, expectedCanonicalJson: text, candidateOutputUsed: { const: false }, candidateDependencyUsed: { const: false }, independenceClaim: { const: false }, frozenAt: time, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/manifest.slice11.v0.schema.json": schema("manifest.slice11.v0.schema.json", {
    schemaVersion: { const: "manifest.slice11.v0" }, id, operation: { enum: OPERATIONS }, partition: { enum: PARTITIONS }, priorSlice10ManifestRef: ref, contractRef: ref,
    entries: { type: "array", minItems: 18, maxItems: 30, items: manifestEntry }, sourceCount: { type: "integer", minimum: 18, maximum: 30 }, applicableSourceCount: { type: "integer", minimum: 6, maximum: 18 }, rejectionSourceCount: { type: "integer", minimum: 12, maximum: 12 },
    repetitions: { const: 3 }, copiedImageBytes: { const: 0 }, projectOriginalSyntheticOnly: { const: true }, frozenAt: time, evidenceBoundary: evidence, contentHash: hex,
  }),
  "schemas/definition-index.slice11.v0.schema.json": schema("definition-index.slice11.v0.schema.json", {
    schemaVersion: { const: "definition-index.slice11.v0" }, id, frozenAt: time, definitionState: { const: "definition-frozen-results-zero" }, candidateRef: ref,
    contractRefs: { type: "array", minItems: 2, maxItems: 2, items: ref }, runtimeRef: ref, lineageRef: ref,
    planRefs: { type: "array", minItems: 2, maxItems: 2, items: ref }, manifestRefs: { type: "array", minItems: 4, maxItems: 4, items: ref }, sourceRefs: { type: "array", minItems: 96, maxItems: 96, items: ref }, goldIdentityRefs: { type: "array", minItems: 48, maxItems: 48, items: ref },
    schemaPaths: { type: "array", minItems: 23, maxItems: 23, items: text }, runnerRef: implementation,
    resultProtocol: objectSchema({ driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, plannedSources: { const: 96 }, plannedAttempts: { const: 288 }, replacements: { const: 0 }, resultsRoot: { const: "results/open-calibration" }, ordinaryCompleteNonPassStopsOtherOperation: { const: false }, globalProtocolUncertaintyStopsAll: { const: true } }),
    rights: objectSchema({ projectOriginalSyntheticOnly: { const: true }, realUserPhotos: { const: false }, thirdPartyImageAssets: { const: false }, modelWeights: { const: false }, productUseAuthorized: { const: false } }),
    counts: objectSchema({ applicableSources: { const: 48 }, copiedImageBytes: { const: 0 }, goldIdentities: { const: 48 }, manifests: { const: 4 }, plannedAttempts: { const: 288 }, rejectionSources: { const: 48 }, sourceWrappers: { const: 96 }, sources: { const: 96 } }),
    resultsState: { const: "not-created" }, formalHoldoutState: { const: "not-created" }, generatorSha256: hex, readmeSha256: hex, descendantFileCount: { type: "integer", minimum: 1 }, descendantTreeSha256: hex, evidenceBoundary: evidence, contentHash: hex,
  }),
});
export const SLICE11_DEFINITION_SCHEMA_DOCUMENTS = Object.freeze({ ...SLICE11_PROTOCOL_SCHEMA_DOCUMENTS, ...SLICE11_OPERATION_SCHEMA_DOCUMENTS, ...SLICE11_MACHINE_SCHEMA_DOCUMENTS });

function descriptor(relativePath, record, fileMap) {
  const bytes = canonicalBytesSlice11Definition(record);
  fileMap.set(relativePath, bytes);
  return Object.freeze({ path: relativePath, id: record.id, contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256Slice11Definition(bytes) });
}
async function implementationRef(relativePath, idValue) {
  const bytes = await readFile(path.join(PROJECT_ROOT, ...relativePath.split("/")));
  return Object.freeze({ path: relativePath, id: idValue, sha256: sha256Slice11Definition(bytes) });
}
async function externalRef(relativePath, idKey = "id") {
  const bytes = await readFile(path.join(PROJECT_ROOT, ...relativePath.split("/")));
  const record = JSON.parse(bytes);
  return Object.freeze({ path: relativePath, id: record[idKey], contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256Slice11Definition(bytes) });
}
export function digestSlice11Files(fileMap) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...fileMap].sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)))) {
    hash.update(relativePath); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0])); hash.update(sha256Slice11Definition(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}
function mapCode(code) { return code === null ? null : code.replace(/^S10_/u, "S11_"); }
function token(partition) { return partition.replace("/", "-"); }

export async function buildSlice11DefinitionPreview({ frozenAt, readmeBytes = null } = {}) {
  const freeze = utc(frozenAt);
  const fileMap = new Map(Object.entries(SLICE11_DEFINITION_SCHEMA_DOCUMENTS).map(([name, value]) => [name, canonicalBytesSlice11Definition(value)]));
  const readme = readmeBytes ?? await readFile(path.join(ROOT, "README.md"));
  const priorIndexRef = await externalRef("research/slice-10/definition-index.v0.10.0.json");
  const lineage = withHash({ schemaVersion: "slice10-failure-lineage.slice11.v0", id: "LINEAGE-SLICE10-FAILURE-TO-SLICE11@0.11.0", frozenAt: freeze, slice10DefinitionRef: priorIndexRef, slice10DefinitionCommit: "86543a47bb5eea6a287861bf587fbffc3014ba1f", slice10ResultCommit: "13c40fce4404929104cbfd39048b47e1fd203e71", slice10ResultTreeSha256: "225847d125c58ee6affaa087746101d469d7ae04109504f0bd6781f593b9ee9e", priorState: "closed-protocol-failed-invalid-lifecycle", replayAuthority: false, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
  const lineageRef = descriptor("lineage/slice10-failure.v0.11.0.json", lineage, fileMap);

  const inventory = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  const workerRuntime = { sharpVersion: inventory.versions.sharpRuntime.values.sharp, nativeVersions: inventory.versions.sharpRuntime.values, nodeVersion: inventory.environment.node.version, platform: inventory.environment.os.platform, architecture: inventory.environment.os.architecture, settings: { concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1" } };
  const environment = inventory.environment;
  const runtimeCanonicalJson = canonicalJsonSlice05(inventory);
  const runtime = withHash({ schemaVersion: "runtime-attestation.slice11.v0", id: "RUNTIME-SHARP-CANONICAL-PNG@0.11.0", frozenAt: freeze, observationState: "definition-freeze-read-versions-only-no-image-pipeline", inventoryCanonicalJson: runtimeCanonicalJson, inventoryPayloadSha256: sha256Slice11Definition(Buffer.from(runtimeCanonicalJson)), workerRuntimeCanonicalJson: canonicalJsonSlice05(workerRuntime), workerRuntimeSha256: sha256Slice11Definition(Buffer.from(canonicalJsonSlice05(workerRuntime))), platform: environment.os.platform, architecture: environment.os.architecture, osRelease: environment.os.release, cpuModel: environment.cpu.models.join(" | "), logicalProcessors: environment.cpu.logicalProcessors, totalMemoryBytes: environment.memory.totalBytes, nodeVersion: environment.node.version, hostnameRecorded: false, serialRecorded: false, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
  const runtimeRef = descriptor("runtime/runtime-attestation.v0.11.0.json", runtime, fileMap);

  const implementations = await Promise.all([
    ["scripts/research-expected-projection-slice11.mjs", "EXPECTED-PROJECTION@0.11.0"], ["scripts/research-calibration-lifecycle-slice11.mjs", "WORKER-LIFECYCLE@0.11.0"],
    ["scripts/research-gateb-adapter-slice11.mjs", "ADAPTER-SHARP-CANONICAL-PNG@0.11.0"], ["scripts/research-calibration-case-slice11.mjs", "CASE-EXECUTOR@0.11.0"],
    ["scripts/research-calibration-protocol-slice11.mjs", "CALIBRATION-PROTOCOL@0.11.0"], ["scripts/research-calibration-runner-slice11.mjs", "RUNNER-OPEN-CALIBRATION@0.11.0"],
    ["scripts/research-calibration-durable-slice11.mjs", "DURABLE-ATTEMPT@0.11.0"], ["scripts/research-calibration-operation-slice11.mjs", "DURABLE-OPERATION@0.11.0"],
    ["scripts/research-sharp-raw-worker-slice07.mjs", "WORKER-SHARP-RAW@0.11.0"], ["scripts/research-independent-png-oracle-slice05.mjs", "ORACLE-INDEPENDENT-PNG@0.5.0"],
    ["scripts/research-run-slice11.mjs", "DRIVER-REGISTERED-OPEN-CALIBRATION@0.11.0"], ["scripts/research-generate-slice11.mjs", "GENERATOR-SLICE11-DEFINITION@0.11.0"],
  ].map(([p, i]) => implementationRef(p, i)));
  const candidate = withHash({ schemaVersion: "candidate-lock.slice11.v0", id: "REG-NORM-SHARP-CANONICAL-PNG@0.11.0", frozenAt: freeze, architecture: "sharp-raw-rgba-plus-project-canonical-png-encoder", versionReason: "gold-projection-truthful-lifecycle-and-durable-operation-only", slice10LineageRef: lineageRef, implementationRefs: implementations, executionState: "frozen-results-zero-awaiting-definition-commit", evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
  const candidateRef = descriptor("candidate-locks/canonical-png.v0.11.0.json", candidate, fileMap);

  const priorIndex = JSON.parse(await readFile(path.join(PRIOR_ROOT, "definition-index.v0.10.0.json"), "utf8"));
  const contractRefs = {};
  for (const operation of OPERATIONS) {
    const prior = priorIndex.contractRefs.find((entry) => entry.id.includes(operation.toUpperCase()));
    const priorContractRef = await externalRef(`research/slice-10/${prior.path}`);
    const contract = withHash({ schemaVersion: "capability-contract.slice11.v0", id: `CC-CAP02-${operation.toUpperCase()}-PNG@0.11.0`, operation, candidateRef, priorContractRef, semanticDeltaFromSlice10: "none-image-semantics-protocol-only", outputProfile: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0", maxDimension: 256, maxOutputBytes: 1048576, passthrough: false, fallback: false, oracleRepair: false, productSupport: false, frozenAt: freeze, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
    contractRefs[operation] = descriptor(`contracts/${operation}-png.v0.11.0.json`, contract, fileMap);
  }
  const planRefs = {};
  for (const operation of OPERATIONS) {
    const plan = withHash({ schemaVersion: "open-calibration-plan.slice11.v0", id: `PLAN-OPEN-CALIBRATION-${operation.toUpperCase()}-PNG@0.11.0`, operation, frozenAt: freeze, sourceCount: 48, applicableSourceCount: 24, rejectionSourceCount: 24, repetitionsPerSource: 3, plannedAttempts: 144, replacements: 0, sourcePassRule: "all-three-registered-repetitions-must-pass", validFailureRerunAllowed: false, ordinaryCompleteNonPassStopsOtherOperation: false, globalStopClasses: ["protocol", "lifecycle", "missing", "timeout", "cancel", "reconciliation", "runtime-drift"], partitionCounts: [{ partition: "dev/calibration", sources: 30, applicableSources: 18, rejectionSources: 12, attempts: 90 }, { partition: "defect/calibration", sources: 18, applicableSources: 6, rejectionSources: 12, attempts: 54 }], formal: false, c1Eligible: false, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
    planRefs[operation] = descriptor(`plans/${operation}-open-calibration.v0.11.0.json`, plan, fileMap);
  }

  const sourceRefs = [];
  const goldIdentityRefs = [];
  const manifestRefs = [];
  for (const priorManifestRef0 of priorIndex.manifestRefs) {
    const priorManifestPath = `research/slice-10/${priorManifestRef0.path}`;
    const priorManifestRef = await externalRef(priorManifestPath);
    const priorManifest = JSON.parse(await readFile(path.join(PROJECT_ROOT, ...priorManifestPath.split("/")), "utf8"));
    const operation = priorManifest.operation;
    const partition = priorManifest.partition;
    const label = partition.startsWith("dev") ? "dev" : "defect";
    const manifestPath = `manifests/${operation}-${label}.v0.11.0.json`;
    const manifestId = `FM-OPEN-CALIBRATION-${operation.toUpperCase()}-${label.toUpperCase()}@0.11.0`;
    const entries = [];
    const pending = [];
    for (let index = 0; index < priorManifest.entries.length; index += 1) {
      const oldEntry = priorManifest.entries[index];
      const oldSourcePath = `research/slice-10/${oldEntry.sourceRef.path}`;
      const oldSourceRef = await externalRef(oldSourcePath);
      const oldSource = JSON.parse(await readFile(path.join(PROJECT_ROOT, ...oldSourcePath.split("/")), "utf8"));
      const number = String(index + 1).padStart(3, "0");
      const sourceId = `s11.${operation}.${label}.${number}`;
      let oldGoldRef = null;
      let oldGold = null;
      if (oldEntry.goldIdentityLocator !== null) {
        const oldGoldPath = `research/slice-10/${oldEntry.goldIdentityLocator.path}`;
        oldGoldRef = await externalRef(oldGoldPath);
        oldGold = JSON.parse(await readFile(path.join(PROJECT_ROOT, ...oldGoldPath.split("/")), "utf8"));
      }
      const wrapper = withHash({ schemaVersion: "source-lineage.slice11.v0", id: sourceId, operation, partition, disposition: oldSource.disposition, categoryId: oldSource.categoryId, expectedStableErrorCode: mapCode(oldSource.expectedStableErrorCode), captureSessionId: `session.s11.${operation}.${label}.${number}`, sourceFamilyId: `family.s11.${operation}.${label}.${number}`, priorSlice10SourceRef: oldSourceRef, priorSlice10GoldIdentityRef: oldGoldRef, rawAsset: oldSource.rawAsset, independenceClaim: false, copiedImageBytes: false, frozenAt: freeze, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
      const sourcePath = `source-lineage/${operation}/${token(partition)}/${sourceId}.json`;
      const sourceRef = descriptor(sourcePath, wrapper, fileMap);
      sourceRefs.push(sourceRef);
      const goldPath = `gold-identities/${operation}/${token(partition)}/gold-identity.${sourceId}.json`;
      entries.push({ sourceRef, categoryId: wrapper.categoryId, disposition: wrapper.disposition, expectedStableErrorCode: wrapper.expectedStableErrorCode, goldIdentityLocator: oldGold === null ? null : { path: goldPath, id: `gold-identity.${sourceId}` } });
      if (oldGold !== null) pending.push({ sourceRef, oldGoldRef, oldGold, goldPath });
    }
    const applicableSourceCount = entries.filter((entry) => entry.disposition === "applicable").length;
    const manifest = withHash({ schemaVersion: "manifest.slice11.v0", id: manifestId, operation, partition, priorSlice10ManifestRef: priorManifestRef, contractRef: contractRefs[operation], entries, sourceCount: entries.length, applicableSourceCount, rejectionSourceCount: entries.length - applicableSourceCount, repetitions: 3, copiedImageBytes: 0, projectOriginalSyntheticOnly: true, frozenAt: freeze, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
    const manifestRef = descriptor(manifestPath, manifest, fileMap);
    manifestRefs.push(manifestRef);
    for (const item of pending) {
      const gold = withHash({ schemaVersion: "gold-identity.slice11.v0", id: `gold-identity.${item.sourceRef.id}`, operation, partition, sourceRef: item.sourceRef, manifestLocator: { path: manifestPath, id: manifestId }, priorSlice10GoldIdentityRef: item.oldGoldRef, expectedCanonicalJson: item.oldGold.expectedCanonicalJson, candidateOutputUsed: false, candidateDependencyUsed: false, independenceClaim: false, frozenAt: freeze, evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
      goldIdentityRefs.push(descriptor(item.goldPath, gold, fileMap));
    }
  }
  if (sourceRefs.length !== 96 || goldIdentityRefs.length !== 48 || manifestRefs.length !== 4) throw new Error("Slice 11 denominator mismatch");
  const generatorSha256 = implementations.find((entry) => entry.id === "GENERATOR-SLICE11-DEFINITION@0.11.0").sha256;
  const index = withHash({ schemaVersion: "definition-index.slice11.v0", id: "DEFINITION-INDEX-SLICE11@0.11.0", frozenAt: freeze, definitionState: "definition-frozen-results-zero", candidateRef, contractRefs: [contractRefs.normalize, contractRefs.export], runtimeRef, lineageRef, planRefs: [planRefs.normalize, planRefs.export], manifestRefs, sourceRefs, goldIdentityRefs, schemaPaths: Object.keys(SLICE11_DEFINITION_SCHEMA_DOCUMENTS).sort(), runnerRef: implementations.find((entry) => entry.id === "RUNNER-OPEN-CALIBRATION@0.11.0"), resultProtocol: { driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 96, plannedAttempts: 288, replacements: 0, resultsRoot: "results/open-calibration", ordinaryCompleteNonPassStopsOtherOperation: false, globalProtocolUncertaintyStopsAll: true }, rights: { projectOriginalSyntheticOnly: true, realUserPhotos: false, thirdPartyImageAssets: false, modelWeights: false, productUseAuthorized: false }, counts: { applicableSources: 48, copiedImageBytes: 0, goldIdentities: 48, manifests: 4, plannedAttempts: 288, rejectionSources: 48, sourceWrappers: 96, sources: 96 }, resultsState: "not-created", formalHoldoutState: "not-created", generatorSha256, readmeSha256: sha256Slice11Definition(readme), descendantFileCount: fileMap.size, descendantTreeSha256: digestSlice11Files(fileMap), evidenceBoundary: SLICE11_EVIDENCE_BOUNDARY });
  fileMap.set(SLICE11_DEFINITION_PATH, canonicalBytesSlice11Definition(index));
  return Object.freeze({ index, fileMap, readmeBytes: Buffer.from(readme) });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--materialize-definition") throw new Error("Usage: node scripts/research-generate-slice11.mjs --materialize-definition <exact-millisecond-UTC>");
  const entries = await readdir(ROOT);
  if (entries.length !== 1 || entries[0] !== "README.md") throw new Error("Slice 11 root must contain only README before one-time materialization");
  const built = await buildSlice11DefinitionPreview({ frozenAt: args[1] });
  for (const [relativePath, bytes] of built.fileMap) {
    const target = path.join(ROOT, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify({ frozenAt: built.index.frozenAt, files: built.fileMap.size, definition: SLICE11_DEFINITION_PATH })}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
