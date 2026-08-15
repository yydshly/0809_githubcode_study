import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inventorySharpRuntimeSlice05, canonicalJsonSlice05 } from "./research-inventory-sharp-slice05.mjs";
import { SLICE08_CASE_CONTEXT_SCHEMA } from "./research-gateb-case-context-slice08.mjs";
import { SLICE08_RUNNER_SCHEMA_DOCUMENTS } from "./research-gateb-runner-slice08.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-08");
const EVIDENCE = Object.freeze({ C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0, productSupport: false, formal: false, releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0 });

export const SLICE08_GENERATOR_VERSION = "slice08-definition-generator.v0.8.0";
export const SLICE08_DEFINITION_PATHS = Object.freeze({
  definition: "definition-index.v0.8.0.json", candidate: "candidate-locks/composite-canonical-png.v0.8.0.json",
  runtime: "runtime/runtime-attestation.v0.8.0.json", rights: "rights/open-synthetic-lineage.v0.8.0.json",
  plan: "plans/gateb-open-smoke.v0.8.0.json", normalizeContract: "contracts/cc-cap02-normalize-png.v0.8.0.json",
  exportContract: "contracts/cc-cap02-export-png.v0.8.0.json", normalizeManifest: "manifests/normalize-smoke.v0.8.0.json",
  exportManifest: "manifests/export-smoke.v0.8.0.json", normalizePrereg: "preregistrations/normalize-gateb.v0.8.0.json",
  exportPrereg: "preregistrations/export-gateb.v0.8.0.json",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: sha256(bytesOf(value)) }); }
function utc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || new Date(value).toISOString() !== value) throw new Error("frozenAt must be canonical UTC milliseconds");
  return value;
}
function objectSchema(properties, required = Object.keys(properties)) { return { type: "object", additionalProperties: false, required, properties }; }
function schema(name, properties) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://single-image-studio.invalid/research/slice-08/schemas/${name}`, ...objectSchema(properties) };
}
const id = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$" };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const axesSchema = objectSchema({ C1: { const: 0 }, U1: { const: 0 }, E1: { const: 0 }, R1: { const: 0 }, O1: { const: 0 }, G1: { const: 0 }, V1: { const: 0 }, productSupport: { const: false }, formal: { const: false }, releaseAllowlist: { const: "none" }, releaseRegistered: { const: 0 }, releaseApproved: { const: 0 } });
const refSchema = objectSchema({ path: { type: "string" }, id, contentHash: hex, byteLength: { type: "integer", minimum: 2 }, fileSha256: hex });
const nullableRefSchema = { oneOf: [{ type: "null" }, refSchema] };
const manifestEntrySchema = objectSchema({
  sourceId: id,
  disposition: { enum: ["applicable", "rejection"] },
  expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S08_[A-Z0-9_]+$" }] },
  wrapperRef: refSchema,
  expectedFactsRef: nullableRefSchema,
  goldRef: nullableRefSchema,
});

export const SLICE08_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/candidate-lock.slice08.v0.schema.json": schema("candidate-lock.slice08.v0.schema.json", { schemaVersion: { const: "candidate-lock.slice08.v0" }, id, frozenAt: { type: "string" }, architecture: { const: "sharp-raw-rgba-plus-project-canonical-png-encoder" }, slice07DefinitionCommit: { const: "d056390bdec8b4f0ae129336f18301ec9ea24eb9" }, slice07ResultCommit: { const: "fa16068eb967a1e9f4696b67c264fc2cce06e574" }, slice07ResultTreeSha256: { const: "80b242de729df5e5974c90c0342d2e10e9609559aae5f3c2e1162afb4f1ccf9c" }, implementationRefs: { type: "array", minItems: 9, maxItems: 9, items: objectSchema({ path: { type: "string" }, id, sha256: hex }) }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/capability-contract.slice08.v0.schema.json": schema("capability-contract.slice08.v0.schema.json", { schemaVersion: { const: "capability-contract.slice08.v0" }, id, operation: { enum: ["normalize", "export"] }, candidateRef: refSchema, outputProfile: { const: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0" }, maxDimension: { const: 256 }, maxOutputBytes: { const: 1048576 }, passthrough: { const: false }, fallback: { const: false }, oracleRepair: { const: false }, productSupport: { const: false }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/rights.slice08.v0.schema.json": schema("rights.slice08.v0.schema.json", { schemaVersion: { const: "rights.slice08.v0" }, id, projectOriginalSyntheticOnly: { const: true }, realUserPhotos: { const: false }, thirdPartyImageAssets: { const: false }, modelWeights: { const: false }, productUseAuthorized: { const: false }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/runtime-attestation.slice08.v0.schema.json": schema("runtime-attestation.slice08.v0.schema.json", { schemaVersion: { const: "runtime-attestation.slice08.v0" }, id, frozenAt: { type: "string" }, inventoryCanonicalJson: { type: "string" }, inventoryPayloadSha256: hex, workerRuntimeCanonicalJson: { type: "string" }, workerRuntimeSha256: hex, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/gateb-plan.slice08.v0.schema.json": schema("gateb-plan.slice08.v0.schema.json", { schemaVersion: { const: "gateb-plan.slice08.v0" }, id, frozenAt: { type: "string" }, driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, sourcesPerOperation: { const: 6 }, repetitionsPerSource: { const: 3 }, plannedAttempts: { const: 36 }, replacements: { const: 0 }, calibrationAuthorized: { const: false }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/source-lineage.slice08.v0.schema.json": schema("source-lineage.slice08.v0.schema.json", { schemaVersion: { const: "source-lineage.slice08.v0" }, id, operation: { enum: ["normalize", "export"] }, priorSlice07Ref: refSchema, rawAssetPath: { type: "string" }, rawAssetByteLength: { type: "integer", minimum: 1 }, rawAssetFileSha256: hex, rawAssetDecodedPixelSha256: { oneOf: [{ type: "null" }, hex] }, rawAssetMime: { type: "string" }, sourceDeclarationMime: { type: "string" }, sourceDeclarationDecodedPixelSha256: hex, normalizedArtifactPath: { oneOf: [{ type: "null" }, { type: "string" }] }, goldRecordPath: { oneOf: [{ type: "null" }, { type: "string" }] }, independenceClaim: { const: false }, copiedImageBytes: { const: false }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/manifest.slice08.v0.schema.json": schema("manifest.slice08.v0.schema.json", { schemaVersion: { const: "manifest.slice08.v0" }, id, operation: { enum: ["normalize", "export"] }, contractRef: refSchema, rightsRef: refSchema, entries: { type: "array", minItems: 6, maxItems: 6, items: manifestEntrySchema }, sources: { const: 6 }, applicableSources: { const: 3 }, rejectionSources: { const: 3 }, repetitions: { const: 3 }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/preregistration.slice08.v0.schema.json": schema("preregistration.slice08.v0.schema.json", { schemaVersion: { const: "preregistration.slice08.v0" }, id, operation: { enum: ["normalize", "export"] }, contractRef: refSchema, planRef: refSchema, manifestRef: refSchema, sources: { const: 6 }, attempts: { const: 18 }, applicableSources: { const: 3 }, rejectionSources: { const: 3 }, repetitions: { const: 3 }, replacements: { const: 0 }, allAttemptsMustPass: { const: true }, calibrationAuthorized: { const: false }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex }),
  "schemas/definition-index.slice08.v0.schema.json": schema("definition-index.slice08.v0.schema.json", { schemaVersion: { const: "definition-index.slice08.v0" }, id, frozenAt: { type: "string" }, candidateRef: refSchema, contractRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema }, runtimeRef: refSchema, rightsRef: refSchema, planRef: refSchema, preregistrationRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema }, manifestRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema }, workerRef: objectSchema({ id, implementationSha256: hex }), schemaPaths: { type: "array", minItems: 16, maxItems: 16, items: { type: "string" } }, resultProtocol: objectSchema({ driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, plannedSources: { const: 12 }, plannedAttempts: { const: 36 }, replacements: { const: 0 }, resultsRoot: { const: "results/open-smoke" } }), resultsState: { const: "not-created" }, copiedImageBytes: { const: 0 }, generatorSha256: hex, readmeSha256: hex, descendantFileCount: { type: "integer" }, descendantTreeSha256: hex, evidenceBoundary: axesSchema, contentHash: hex }),
});

export const SLICE08_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/gateb-case-context.slice08.v0.schema.json": SLICE08_CASE_CONTEXT_SCHEMA,
  ...SLICE08_RUNNER_SCHEMA_DOCUMENTS,
  ...SLICE08_MACHINE_SCHEMA_DOCUMENTS,
});

async function descriptor(relativePath, record, fileMap) {
  const bytes = bytesOf(record); fileMap.set(relativePath, bytes);
  return Object.freeze({ path: relativePath, id: record.id, contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) });
}
async function fileRef(projectRelativePath, idValue) {
  const bytes = await readFile(path.join(PROJECT_ROOT, projectRelativePath));
  return Object.freeze({ path: projectRelativePath, id: idValue, sha256: sha256(bytes) });
}
function digestFiles(fileMap) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...fileMap.entries()].sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)))) {
    hash.update(relativePath); hash.update(Buffer.from([0])); hash.update(String(bytes.length)); hash.update(Buffer.from([0])); hash.update(sha256(bytes)); hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

export async function buildSlice08Definition({ frozenAt, readmeBytes = null } = {}) {
  const freeze = utc(frozenAt);
  const fileMap = new Map(Object.entries(SLICE08_SCHEMA_DOCUMENTS).map(([relativePath, value]) => [relativePath, bytesOf(value)]));
  const inventory = await inventorySharpRuntimeSlice05({ projectRoot: PROJECT_ROOT });
  const workerRuntime = { sharpVersion: inventory.versions.sharpRuntime.values.sharp, nativeVersions: inventory.versions.sharpRuntime.values,
    nodeVersion: inventory.environment.node.version, platform: inventory.environment.os.platform, architecture: inventory.environment.os.architecture,
    settings: { concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0, simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1" } };
  const runtime = withHash({ schemaVersion: "runtime-attestation.slice08.v0", id: "RUNTIME-SHARP-CANONICAL-PNG@0.8.0", frozenAt: freeze,
    inventoryCanonicalJson: canonicalJsonSlice05(inventory), inventoryPayloadSha256: inventory.attestation.payloadSha256,
    workerRuntimeCanonicalJson: canonicalJsonSlice05(workerRuntime), workerRuntimeSha256: sha256(Buffer.from(canonicalJsonSlice05(workerRuntime))), evidenceBoundary: EVIDENCE });
  const runtimeRef = await descriptor(SLICE08_DEFINITION_PATHS.runtime, runtime, fileMap);
  const implementations = await Promise.all([
    fileRef("scripts/research-canonical-png-encoder-slice07.mjs", "ENCODER-CANONICAL-PNG@0.8.0"),
    fileRef("scripts/research-sharp-raw-worker-slice07.mjs", "WORKER-SHARP-RAW@0.8.0"),
    fileRef("scripts/research-gateb-adapter-slice07.mjs", "ADAPTER-SHARP-CANONICAL-PNG@0.8.0"),
    fileRef("scripts/research-independent-png-oracle-slice05.mjs", "ORACLE-INDEPENDENT-PNG@0.5.0"),
    fileRef("scripts/research-gateb-case-context-slice08.mjs", "GATEB-TYPED-CASE-CONTEXT@0.8.0"),
    fileRef("scripts/research-gateb-driver-slice08.mjs", "DRIVER-TYPED-ACTUAL-CASE@0.8.0"),
    fileRef("scripts/research-gateb-runner-slice08.mjs", "RUNNER-GATEB-OPEN-SMOKE@0.8.0"),
    fileRef("scripts/research-run-slice08.mjs", "DRIVER-REGISTERED-GATEB-SMOKE@0.8.0"),
    fileRef("scripts/research-generate-slice08.mjs", "GENERATOR-SLICE08-DEFINITION@0.8.0"),
  ]);
  const candidate = withHash({ schemaVersion: "candidate-lock.slice08.v0", id: "REG-NORM-SHARP-CANONICAL-PNG@0.8.0", frozenAt: freeze,
    architecture: "sharp-raw-rgba-plus-project-canonical-png-encoder", slice07DefinitionCommit: "d056390bdec8b4f0ae129336f18301ec9ea24eb9",
    slice07ResultCommit: "fa16068eb967a1e9f4696b67c264fc2cce06e574", slice07ResultTreeSha256: "80b242de729df5e5974c90c0342d2e10e9609559aae5f3c2e1162afb4f1ccf9c",
    implementationRefs: implementations, evidenceBoundary: EVIDENCE });
  const candidateRef = await descriptor(SLICE08_DEFINITION_PATHS.candidate, candidate, fileMap);
  const rights = withHash({ schemaVersion: "rights.slice08.v0", id: "RIGHTS-OPEN-SYNTHETIC-LINEAGE@0.8.0", projectOriginalSyntheticOnly: true,
    realUserPhotos: false, thirdPartyImageAssets: false, modelWeights: false, productUseAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
  const rightsRef = await descriptor(SLICE08_DEFINITION_PATHS.rights, rights, fileMap);
  const contracts = {};
  const contractRefs = {};
  for (const operation of ["normalize", "export"]) {
    contracts[operation] = withHash({ schemaVersion: "capability-contract.slice08.v0", id: `CC-CAP02-${operation.toUpperCase()}-PNG@0.8.0`, operation,
      candidateRef, outputProfile: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0", maxDimension: 256, maxOutputBytes: 1048576,
      passthrough: false, fallback: false, oracleRepair: false, productSupport: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
    contractRefs[operation] = await descriptor(SLICE08_DEFINITION_PATHS[`${operation}Contract`], contracts[operation], fileMap);
  }
  const plan = withHash({ schemaVersion: "gateb-plan.slice08.v0", id: "PLAN-GATEB-OPEN-SMOKE@0.8.0", frozenAt: freeze,
    driverInvocations: 1, registeredOperationRuns: 2, sourcesPerOperation: 6, repetitionsPerSource: 3, plannedAttempts: 36,
    replacements: 0, calibrationAuthorized: false, evidenceBoundary: EVIDENCE });
  const planRef = await descriptor(SLICE08_DEFINITION_PATHS.plan, plan, fileMap);
  const manifestRefs = {};
  const preregistrationRefs = {};
  for (const operation of ["normalize", "export"]) {
    const oldManifest = JSON.parse(await readFile(path.join(PROJECT_ROOT, "research", "slice-07", `manifests/${operation}-smoke.v0.7.0.json`), "utf8"));
    const entries = [];
    for (let index = 0; index < oldManifest.entries.length; index += 1) {
      const oldEntry = oldManifest.entries[index];
      const priorBytes = await readFile(path.join(PROJECT_ROOT, "research", "slice-07", oldEntry.wrapperRef.path));
      const prior = JSON.parse(priorBytes);
      const sourceId = `s08.${operation}.${oldEntry.disposition}.${String(index + 1).padStart(3, "0")}`;
      const code = oldEntry.expectedStableErrorCode?.replace(/^S07_/u, "S08_") ?? null;
      const wrapper = withHash({ schemaVersion: "source-lineage.slice08.v0", id: sourceId, operation,
        priorSlice07Ref: { ...oldEntry.wrapperRef, path: `research/slice-07/${oldEntry.wrapperRef.path}` }, rawAssetPath: prior.rawAssetPath, rawAssetByteLength: prior.rawAssetByteLength,
        rawAssetFileSha256: prior.rawAssetFileSha256, rawAssetDecodedPixelSha256: prior.rawAssetDecodedPixelSha256,
        rawAssetMime: prior.rawAssetMime, sourceDeclarationMime: prior.sourceDeclarationMime,
        sourceDeclarationDecodedPixelSha256: prior.sourceDeclarationDecodedPixelSha256,
        normalizedArtifactPath: prior.normalizedArtifactPath, goldRecordPath: prior.goldRecordPath,
        independenceClaim: false, copiedImageBytes: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
      const wrapperRef = await descriptor(`source-lineage/${operation}/${sourceId}.json`, wrapper, fileMap);
      let goldRef = null;
      if (oldEntry.disposition === "applicable") {
        const goldBytes = await readFile(path.join(PROJECT_ROOT, "research", "slice-05", prior.goldRecordPath));
        const gold = JSON.parse(goldBytes);
        goldRef = { path: `research/slice-05/${prior.goldRecordPath}`, id: gold.goldRecordId, contentHash: gold.contentHash, byteLength: goldBytes.length, fileSha256: sha256(goldBytes) };
      }
      entries.push({ sourceId, disposition: oldEntry.disposition, expectedStableErrorCode: code, wrapperRef,
        expectedFactsRef: goldRef, goldRef });
    }
    const manifest = withHash({ schemaVersion: "manifest.slice08.v0", id: `FM-GATEB-${operation.toUpperCase()}-PNG@0.8.0`, operation,
      contractRef: contractRefs[operation], rightsRef, entries, sources: 6, applicableSources: 3, rejectionSources: 3,
      repetitions: 3, frozenAt: freeze, evidenceBoundary: EVIDENCE });
    manifestRefs[operation] = await descriptor(SLICE08_DEFINITION_PATHS[`${operation}Manifest`], manifest, fileMap);
    const prereg = withHash({ schemaVersion: "preregistration.slice08.v0", id: `PREREG-GATEB-${operation.toUpperCase()}-PNG@0.8.0`, operation,
      contractRef: contractRefs[operation], planRef, manifestRef: manifestRefs[operation], sources: 6, attempts: 18,
      applicableSources: 3, rejectionSources: 3, repetitions: 3, replacements: 0, allAttemptsMustPass: true,
      calibrationAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE });
    preregistrationRefs[operation] = await descriptor(SLICE08_DEFINITION_PATHS[`${operation}Prereg`], prereg, fileMap);
  }
  const readme = readmeBytes ?? await readFile(path.join(DEFAULT_ROOT, "README.md"));
  const generatorSha256 = implementations.find((entry) => entry.id === "GENERATOR-SLICE08-DEFINITION@0.8.0").sha256;
  const index = withHash({ schemaVersion: "definition-index.slice08.v0", id: "DEFINITION-INDEX-SLICE08@0.8.0", frozenAt: freeze,
    candidateRef, contractRefs: [contractRefs.normalize, contractRefs.export], runtimeRef, rightsRef, planRef,
    preregistrationRefs: [preregistrationRefs.normalize, preregistrationRefs.export], manifestRefs: [manifestRefs.normalize, manifestRefs.export],
    workerRef: { id: "WORKER-SHARP-RAW@0.8.0", implementationSha256: implementations.find((entry) => entry.id === "WORKER-SHARP-RAW@0.8.0").sha256 },
    schemaPaths: Object.keys(SLICE08_SCHEMA_DOCUMENTS).sort(), resultProtocol: { driverInvocations: 1, registeredOperationRuns: 2,
      plannedSources: 12, plannedAttempts: 36, replacements: 0, resultsRoot: "results/open-smoke" }, resultsState: "not-created",
    copiedImageBytes: 0, generatorSha256, readmeSha256: sha256(readme), descendantFileCount: fileMap.size,
    descendantTreeSha256: digestFiles(fileMap), evidenceBoundary: EVIDENCE });
  fileMap.set(SLICE08_DEFINITION_PATHS.definition, bytesOf(index));
  return { index, fileMap, readmeBytes: Buffer.from(readme) };
}

export async function materializeSlice08Definition({ outputRoot = DEFAULT_ROOT, frozenAt } = {}) {
  let existing = [];
  try { existing = await readdir(outputRoot); } catch {}
  if (existing.some((name) => name !== "README.md")) throw new Error("Slice 08 output root is not results-zero/empty");
  const readmeBytes = await readFile(path.join(DEFAULT_ROOT, "README.md"));
  const built = await buildSlice08Definition({ frozenAt, readmeBytes });
  await mkdir(outputRoot, { recursive: true });
  if (!existing.includes("README.md")) await writeFile(path.join(outputRoot, "README.md"), readmeBytes, { flag: "wx" });
  for (const [relativePath, bytes] of built.fileMap) {
    const absolute = path.join(outputRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes, { flag: "wx" });
  }
  return built.index;
}

async function main() {
  const index = process.argv.indexOf("--frozen-at");
  if (index < 0 || !process.argv[index + 1]) throw new Error("Usage: node scripts/research-generate-slice08.mjs --frozen-at <UTC>");
  process.stdout.write(`${JSON.stringify(await materializeSlice08Definition({ frozenAt: process.argv[index + 1] }), null, 2)}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
