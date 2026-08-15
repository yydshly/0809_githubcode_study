import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonSlice05, inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import {
  SLICE09_GOLD_IDENTITY_SCHEMA,
  createSlice09GoldIdentity,
} from "./research-gateb-gold-identity-slice09.mjs";
import { SLICE09_RUNNER_SCHEMA_DOCUMENTS } from "./research-gateb-runner-slice09.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ROOT = path.join(PROJECT_ROOT, "research", "slice-09");
const EVIDENCE = Object.freeze({
  C1: 0, U1: 0, E1: 0, R1: 0, O1: 0, G1: 0, V1: 0,
  productSupport: false, formal: false,
  releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});

export const SLICE09_GENERATOR_VERSION = "slice09-definition-generator.v0.9.0";
export const SLICE09_DEFINITION_PATHS = Object.freeze({
  definition: "definition-index.v0.9.0.json",
  candidate: "candidate-locks/composite-canonical-png.v0.9.0.json",
  runtime: "runtime/runtime-attestation.v0.9.0.json",
  rights: "rights/open-synthetic-lineage.v0.9.0.json",
  plan: "plans/gateb-open-smoke.v0.9.0.json",
  normalizeContract: "contracts/cc-cap02-normalize-png.v0.9.0.json",
  exportContract: "contracts/cc-cap02-export-png.v0.9.0.json",
  normalizeManifest: "manifests/normalize-smoke.v0.9.0.json",
  exportManifest: "manifests/export-smoke.v0.9.0.json",
  normalizePrereg: "preregistrations/normalize-gateb.v0.9.0.json",
  exportPrereg: "preregistrations/export-gateb.v0.9.0.json",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function bytesOf(value) { return Buffer.from(`${JSON.stringify(stable(value))}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function withHash(value) { return Object.freeze({ ...value, contentHash: sha256(bytesOf(value)) }); }
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
    $id: `https://single-image-studio.invalid/research/slice-09/schemas/${name}`,
    ...objectSchema(properties),
  };
}

const id = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$" };
const hex = { type: "string", pattern: "^[a-f0-9]{64}$" };
const axesSchema = objectSchema({
  C1: { const: 0 }, U1: { const: 0 }, E1: { const: 0 }, R1: { const: 0 },
  O1: { const: 0 }, G1: { const: 0 }, V1: { const: 0 },
  productSupport: { const: false }, formal: { const: false }, releaseAllowlist: { const: "none" },
  releaseRegistered: { const: 0 }, releaseApproved: { const: 0 },
});
const refSchema = objectSchema({
  path: { type: "string", minLength: 1, maxLength: 500 }, id, contentHash: hex,
  byteLength: { type: "integer", minimum: 2 }, fileSha256: hex,
});
const nullableLocatorSchema = {
  oneOf: [
    { type: "null" },
    objectSchema({ path: { type: "string", minLength: 1, maxLength: 500 }, id }),
  ],
};
const manifestEntrySchema = objectSchema({
  sourceId: id, disposition: { enum: ["applicable", "rejection"] },
  expectedStableErrorCode: { oneOf: [{ type: "null" }, { type: "string", pattern: "^S09_[A-Z0-9_]+$" }] },
  wrapperRef: refSchema, goldIdentityLocator: nullableLocatorSchema,
});

export const SLICE09_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/candidate-lock.slice09.v0.schema.json": schema("candidate-lock.slice09.v0.schema.json", {
    schemaVersion: { const: "candidate-lock.slice09.v0" }, id, frozenAt: { type: "string" },
    architecture: { const: "sharp-raw-rgba-plus-project-canonical-png-encoder" },
    slice08DefinitionCommit: { const: "a8bcbe57278c7fd2620c16b39f1a939a1e3ccf89" },
    slice08ClosureCommit: { const: "184cdcbe464884b550b2c579672f2e26f2fdc4ca" },
    slice08PartialResultTreeSha256: { const: "2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6" },
    versionReason: { const: "gold-identity-and-durable-evidence-protocol-only" },
    implementationRefs: { type: "array", minItems: 10, maxItems: 10, items: objectSchema({ path: { type: "string" }, id, sha256: hex }) },
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/capability-contract.slice09.v0.schema.json": schema("capability-contract.slice09.v0.schema.json", {
    schemaVersion: { const: "capability-contract.slice09.v0" }, id,
    operation: { enum: ["normalize", "export"] }, candidateRef: refSchema,
    outputProfile: { const: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0" }, maxDimension: { const: 256 },
    maxOutputBytes: { const: 1048576 }, passthrough: { const: false }, fallback: { const: false },
    oracleRepair: { const: false }, productSupport: { const: false }, frozenAt: { type: "string" },
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/rights.slice09.v0.schema.json": schema("rights.slice09.v0.schema.json", {
    schemaVersion: { const: "rights.slice09.v0" }, id, projectOriginalSyntheticOnly: { const: true },
    realUserPhotos: { const: false }, thirdPartyImageAssets: { const: false }, modelWeights: { const: false },
    productUseAuthorized: { const: false }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/runtime-attestation.slice09.v0.schema.json": schema("runtime-attestation.slice09.v0.schema.json", {
    schemaVersion: { const: "runtime-attestation.slice09.v0" }, id, frozenAt: { type: "string" },
    inventoryCanonicalJson: { type: "string" }, inventoryPayloadSha256: hex,
    workerRuntimeCanonicalJson: { type: "string" }, workerRuntimeSha256: hex,
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/gateb-plan.slice09.v0.schema.json": schema("gateb-plan.slice09.v0.schema.json", {
    schemaVersion: { const: "gateb-plan.slice09.v0" }, id, frozenAt: { type: "string" },
    driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, sourcesPerOperation: { const: 6 },
    repetitionsPerSource: { const: 3 }, plannedAttempts: { const: 36 }, replacements: { const: 0 },
    globalStopOnFirstNonPass: { const: true }, calibrationAuthorized: { const: false },
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/source-lineage.slice09.v0.schema.json": schema("source-lineage.slice09.v0.schema.json", {
    schemaVersion: { const: "source-lineage.slice09.v0" }, id, operation: { enum: ["normalize", "export"] },
    priorSlice08Ref: refSchema, rawAssetPath: { type: "string" }, rawAssetByteLength: { type: "integer", minimum: 1 },
    rawAssetFileSha256: hex, rawAssetDecodedPixelSha256: { oneOf: [{ type: "null" }, hex] },
    rawAssetMime: { type: "string" }, sourceDeclarationMime: { type: "string" },
    sourceDeclarationDecodedPixelSha256: hex,
    normalizedArtifactPath: { oneOf: [{ type: "null" }, { type: "string" }] },
    goldRecordPath: { oneOf: [{ type: "null" }, { type: "string" }] },
    independenceClaim: { const: false }, copiedImageBytes: { const: false }, frozenAt: { type: "string" },
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/manifest.slice09.v0.schema.json": schema("manifest.slice09.v0.schema.json", {
    schemaVersion: { const: "manifest.slice09.v0" }, id, operation: { enum: ["normalize", "export"] },
    contractRef: refSchema, rightsRef: refSchema,
    entries: { type: "array", minItems: 6, maxItems: 6, items: manifestEntrySchema },
    sources: { const: 6 }, applicableSources: { const: 3 }, rejectionSources: { const: 3 },
    repetitions: { const: 3 }, frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/preregistration.slice09.v0.schema.json": schema("preregistration.slice09.v0.schema.json", {
    schemaVersion: { const: "preregistration.slice09.v0" }, id, operation: { enum: ["normalize", "export"] },
    contractRef: refSchema, planRef: refSchema, manifestRef: refSchema,
    goldIdentityRefs: { type: "array", minItems: 3, maxItems: 3, items: refSchema },
    sources: { const: 6 }, attempts: { const: 18 }, applicableSources: { const: 3 }, rejectionSources: { const: 3 },
    repetitions: { const: 3 }, replacements: { const: 0 }, allAttemptsMustPass: { const: true },
    globalStopOnNonPass: { const: true }, calibrationAuthorized: { const: false },
    frozenAt: { type: "string" }, evidenceBoundary: axesSchema, contentHash: hex,
  }),
  "schemas/definition-index.slice09.v0.schema.json": schema("definition-index.slice09.v0.schema.json", {
    schemaVersion: { const: "definition-index.slice09.v0" }, id, frozenAt: { type: "string" },
    candidateRef: refSchema, contractRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    runtimeRef: refSchema, rightsRef: refSchema, planRef: refSchema,
    preregistrationRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    manifestRefs: { type: "array", minItems: 2, maxItems: 2, items: refSchema },
    goldIdentityRefs: { type: "array", minItems: 6, maxItems: 6, items: refSchema },
    workerRef: objectSchema({ id, implementationSha256: hex }),
    schemaPaths: { type: "array", minItems: 18, maxItems: 18, items: { type: "string" } },
    resultProtocol: objectSchema({
      driverInvocations: { const: 1 }, registeredOperationRuns: { const: 2 }, plannedSources: { const: 12 },
      plannedAttempts: { const: 36 }, replacements: { const: 0 }, globalStopOnFirstNonPass: { const: true },
      resultsRoot: { const: "results/open-smoke" },
    }),
    resultsState: { const: "not-created" }, copiedImageBytes: { const: 0 }, generatorSha256: hex,
    readmeSha256: hex, descendantFileCount: { type: "integer" }, descendantTreeSha256: hex,
    evidenceBoundary: axesSchema, contentHash: hex,
  }),
});

export const SLICE09_SCHEMA_DOCUMENTS = Object.freeze({
  ...SLICE09_RUNNER_SCHEMA_DOCUMENTS,
  "schemas/gold-identity.slice09.v0.schema.json": SLICE09_GOLD_IDENTITY_SCHEMA,
  ...SLICE09_MACHINE_SCHEMA_DOCUMENTS,
});

function descriptor(relativePath, record, fileMap) {
  const bytes = bytesOf(record);
  fileMap.set(relativePath, bytes);
  return Object.freeze({ path: relativePath, id: record.id ?? record.identityId, contentHash: record.contentHash, byteLength: bytes.length, fileSha256: sha256(bytes) });
}

async function fileRef(projectRelativePath, idValue) {
  const bytes = await readFile(path.join(PROJECT_ROOT, projectRelativePath));
  return Object.freeze({ path: projectRelativePath, id: idValue, sha256: sha256(bytes) });
}

export function digestSlice09Files(fileMap) {
  const hash = createHash("sha256");
  for (const [relativePath, bytes] of [...fileMap.entries()].sort(([left], [right]) => Buffer.from(left).compare(Buffer.from(right)))) {
    hash.update(relativePath);
    hash.update(Buffer.from([0]));
    hash.update(String(bytes.length));
    hash.update(Buffer.from([0]));
    hash.update(sha256(bytes));
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

export async function buildSlice09Definition({ frozenAt, readmeBytes = null } = {}) {
  const freeze = utc(frozenAt);
  const fileMap = new Map(Object.entries(SLICE09_SCHEMA_DOCUMENTS).map(([relativePath, value]) => [relativePath, bytesOf(value)]));
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
    schemaVersion: "runtime-attestation.slice09.v0", id: "RUNTIME-SHARP-CANONICAL-PNG@0.9.0", frozenAt: freeze,
    inventoryCanonicalJson: canonicalJsonSlice05(inventory), inventoryPayloadSha256: inventory.attestation.payloadSha256,
    workerRuntimeCanonicalJson: canonicalJsonSlice05(workerRuntime),
    workerRuntimeSha256: sha256(Buffer.from(canonicalJsonSlice05(workerRuntime))), evidenceBoundary: EVIDENCE,
  });
  const runtimeRef = descriptor(SLICE09_DEFINITION_PATHS.runtime, runtime, fileMap);
  const implementations = await Promise.all([
    fileRef("scripts/research-canonical-png-encoder-slice07.mjs", "ENCODER-CANONICAL-PNG@0.9.0"),
    fileRef("scripts/research-sharp-raw-worker-slice07.mjs", "WORKER-SHARP-RAW@0.9.0"),
    fileRef("scripts/research-gateb-adapter-slice07.mjs", "ADAPTER-SHARP-CANONICAL-PNG@0.9.0"),
    fileRef("scripts/research-independent-png-oracle-slice05.mjs", "ORACLE-INDEPENDENT-PNG@0.5.0"),
    fileRef("scripts/research-gateb-gold-identity-slice09.mjs", "GATEB-GOLD-IDENTITY@0.9.0"),
    fileRef("scripts/research-gateb-case-context-slice09.mjs", "GATEB-TYPED-CASE-CONTEXT@0.9.0"),
    fileRef("scripts/research-gateb-driver-slice09.mjs", "DRIVER-TYPED-GOLD-ACTUAL-CASE@0.9.0"),
    fileRef("scripts/research-gateb-runner-slice09.mjs", "RUNNER-GATEB-OPEN-SMOKE@0.9.0"),
    fileRef("scripts/research-run-slice09.mjs", "DRIVER-REGISTERED-GATEB-SMOKE@0.9.0"),
    fileRef("scripts/research-generate-slice09.mjs", "GENERATOR-SLICE09-DEFINITION@0.9.0"),
  ]);
  const candidate = withHash({
    schemaVersion: "candidate-lock.slice09.v0", id: "REG-NORM-SHARP-CANONICAL-PNG@0.9.0", frozenAt: freeze,
    architecture: "sharp-raw-rgba-plus-project-canonical-png-encoder",
    slice08DefinitionCommit: "a8bcbe57278c7fd2620c16b39f1a939a1e3ccf89",
    slice08ClosureCommit: "184cdcbe464884b550b2c579672f2e26f2fdc4ca",
    slice08PartialResultTreeSha256: "2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6",
    versionReason: "gold-identity-and-durable-evidence-protocol-only",
    implementationRefs: implementations, evidenceBoundary: EVIDENCE,
  });
  const candidateRef = descriptor(SLICE09_DEFINITION_PATHS.candidate, candidate, fileMap);
  const rights = withHash({
    schemaVersion: "rights.slice09.v0", id: "RIGHTS-OPEN-SYNTHETIC-LINEAGE@0.9.0",
    projectOriginalSyntheticOnly: true, realUserPhotos: false, thirdPartyImageAssets: false,
    modelWeights: false, productUseAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE,
  });
  const rightsRef = descriptor(SLICE09_DEFINITION_PATHS.rights, rights, fileMap);
  const contractRefs = {};
  for (const operation of ["normalize", "export"]) {
    const contract = withHash({
      schemaVersion: "capability-contract.slice09.v0", id: `CC-CAP02-${operation.toUpperCase()}-PNG@0.9.0`,
      operation, candidateRef, outputProfile: "canonical-png-IHDR-sRGB-IDAT-IEND-filter0",
      maxDimension: 256, maxOutputBytes: 1048576, passthrough: false, fallback: false,
      oracleRepair: false, productSupport: false, frozenAt: freeze, evidenceBoundary: EVIDENCE,
    });
    contractRefs[operation] = descriptor(SLICE09_DEFINITION_PATHS[`${operation}Contract`], contract, fileMap);
  }
  const plan = withHash({
    schemaVersion: "gateb-plan.slice09.v0", id: "PLAN-GATEB-OPEN-SMOKE@0.9.0", frozenAt: freeze,
    driverInvocations: 1, registeredOperationRuns: 2, sourcesPerOperation: 6, repetitionsPerSource: 3,
    plannedAttempts: 36, replacements: 0, globalStopOnFirstNonPass: true,
    calibrationAuthorized: false, evidenceBoundary: EVIDENCE,
  });
  const planRef = descriptor(SLICE09_DEFINITION_PATHS.plan, plan, fileMap);
  const manifestRefs = {};
  const preregistrationRefs = {};
  const goldIdentityRefs = [];
  for (const operation of ["normalize", "export"]) {
    const slice08ManifestPath = path.join(PROJECT_ROOT, "research", "slice-08", `manifests/${operation}-smoke.v0.8.0.json`);
    const slice08Manifest = JSON.parse(await readFile(slice08ManifestPath, "utf8"));
    const entries = [];
    const wrappers = [];
    for (let index = 0; index < slice08Manifest.entries.length; index += 1) {
      const priorEntry = slice08Manifest.entries[index];
      const priorPath = path.join(PROJECT_ROOT, "research", "slice-08", priorEntry.wrapperRef.path);
      const priorBytes = await readFile(priorPath);
      const prior = JSON.parse(priorBytes);
      const sourceId = `s09.${operation}.${priorEntry.disposition}.${String(index + 1).padStart(3, "0")}`;
      const code = priorEntry.expectedStableErrorCode?.replace(/^S08_/u, "S09_") ?? null;
      const wrapper = withHash({
        schemaVersion: "source-lineage.slice09.v0", id: sourceId, operation,
        priorSlice08Ref: {
          path: `research/slice-08/${priorEntry.wrapperRef.path}`, id: priorEntry.wrapperRef.id,
          contentHash: priorEntry.wrapperRef.contentHash, byteLength: priorBytes.length, fileSha256: sha256(priorBytes),
        },
        rawAssetPath: prior.rawAssetPath, rawAssetByteLength: prior.rawAssetByteLength,
        rawAssetFileSha256: prior.rawAssetFileSha256, rawAssetDecodedPixelSha256: prior.rawAssetDecodedPixelSha256,
        rawAssetMime: prior.rawAssetMime, sourceDeclarationMime: prior.sourceDeclarationMime,
        sourceDeclarationDecodedPixelSha256: prior.sourceDeclarationDecodedPixelSha256,
        normalizedArtifactPath: prior.normalizedArtifactPath, goldRecordPath: prior.goldRecordPath,
        independenceClaim: false, copiedImageBytes: false, frozenAt: freeze, evidenceBoundary: EVIDENCE,
      });
      const wrapperRef = descriptor(`source-lineage/${operation}/${sourceId}.json`, wrapper, fileMap);
      const identityPath = `gold-identities/${operation}/gold-identity.${sourceId}.json`;
      entries.push({
        sourceId, disposition: priorEntry.disposition, expectedStableErrorCode: code, wrapperRef,
        goldIdentityLocator: priorEntry.disposition === "applicable"
          ? { path: identityPath, id: `gold-identity.${sourceId}` } : null,
      });
      wrappers.push({ wrapper, wrapperRef, identityPath });
    }
    const manifest = withHash({
      schemaVersion: "manifest.slice09.v0", id: `FM-GATEB-${operation.toUpperCase()}-PNG@0.9.0`, operation,
      contractRef: contractRefs[operation], rightsRef, entries, sources: 6, applicableSources: 3,
      rejectionSources: 3, repetitions: 3, frozenAt: freeze, evidenceBoundary: EVIDENCE,
    });
    manifestRefs[operation] = descriptor(SLICE09_DEFINITION_PATHS[`${operation}Manifest`], manifest, fileMap);
    const operationGoldRefs = [];
    for (let index = 0; index < wrappers.length; index += 1) {
      if (entries[index].disposition !== "applicable") continue;
      const { wrapper, identityPath } = wrappers[index];
      const goldRecordPath = path.join(PROJECT_ROOT, "research", "slice-05", wrapper.goldRecordPath);
      const goldRecordBytes = await readFile(goldRecordPath);
      const goldRecord = JSON.parse(goldRecordBytes);
      const goldRef = {
        path: `research/slice-05/${wrapper.goldRecordPath}`, id: goldRecord.goldRecordId,
        contentHash: goldRecord.contentHash, byteLength: goldRecordBytes.length, fileSha256: sha256(goldRecordBytes),
      };
      const identity = createSlice09GoldIdentity({
        operation, sourceId: wrapper.id, manifestRef: manifestRefs[operation], goldRef, goldRecord, goldRecordBytes,
      });
      const identityRef = descriptor(identityPath, identity, fileMap);
      operationGoldRefs.push(identityRef);
      goldIdentityRefs.push(identityRef);
    }
    const prereg = withHash({
      schemaVersion: "preregistration.slice09.v0", id: `PREREG-GATEB-${operation.toUpperCase()}-PNG@0.9.0`, operation,
      contractRef: contractRefs[operation], planRef, manifestRef: manifestRefs[operation],
      goldIdentityRefs: operationGoldRefs, sources: 6, attempts: 18, applicableSources: 3, rejectionSources: 3,
      repetitions: 3, replacements: 0, allAttemptsMustPass: true, globalStopOnNonPass: true,
      calibrationAuthorized: false, frozenAt: freeze, evidenceBoundary: EVIDENCE,
    });
    preregistrationRefs[operation] = descriptor(SLICE09_DEFINITION_PATHS[`${operation}Prereg`], prereg, fileMap);
  }
  const readme = readmeBytes ?? await readFile(path.join(DEFAULT_ROOT, "README.md"));
  const generatorSha256 = implementations.find((entry) => entry.id === "GENERATOR-SLICE09-DEFINITION@0.9.0").sha256;
  const index = withHash({
    schemaVersion: "definition-index.slice09.v0", id: "DEFINITION-INDEX-SLICE09@0.9.0", frozenAt: freeze,
    candidateRef, contractRefs: [contractRefs.normalize, contractRefs.export], runtimeRef, rightsRef, planRef,
    preregistrationRefs: [preregistrationRefs.normalize, preregistrationRefs.export],
    manifestRefs: [manifestRefs.normalize, manifestRefs.export], goldIdentityRefs,
    workerRef: {
      id: "WORKER-SHARP-RAW@0.9.0",
      implementationSha256: implementations.find((entry) => entry.id === "WORKER-SHARP-RAW@0.9.0").sha256,
    },
    schemaPaths: Object.keys(SLICE09_SCHEMA_DOCUMENTS).sort(),
    resultProtocol: {
      driverInvocations: 1, registeredOperationRuns: 2, plannedSources: 12, plannedAttempts: 36,
      replacements: 0, globalStopOnFirstNonPass: true, resultsRoot: "results/open-smoke",
    },
    resultsState: "not-created", copiedImageBytes: 0, generatorSha256, readmeSha256: sha256(readme),
    descendantFileCount: fileMap.size, descendantTreeSha256: digestSlice09Files(fileMap), evidenceBoundary: EVIDENCE,
  });
  fileMap.set(SLICE09_DEFINITION_PATHS.definition, bytesOf(index));
  return { index, fileMap, readmeBytes: Buffer.from(readme) };
}

export async function materializeSlice09Definition({ outputRoot = DEFAULT_ROOT, frozenAt } = {}) {
  let existing = [];
  try { existing = await readdir(outputRoot); } catch {}
  if (existing.some((name) => name !== "README.md")) throw new Error("Slice 09 output root is not results-zero/empty");
  const readmeBytes = await readFile(path.join(DEFAULT_ROOT, "README.md"));
  const built = await buildSlice09Definition({ frozenAt, readmeBytes });
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
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error("Usage: node scripts/research-generate-slice09.mjs --frozen-at <UTC>");
  }
  process.stdout.write(`${JSON.stringify(await materializeSlice09Definition({ frozenAt: process.argv[index + 1] }), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
