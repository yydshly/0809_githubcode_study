import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  contentHashSlice06,
  sha256Slice06,
  stableStringifySlice06,
} from "./research-diagnostic-adapter-slice06.mjs";
import {
  SLICE06_DIAGNOSTIC_LIMITS,
  SLICE06_FINDING_PRECEDENCE,
} from "./research-diagnostic-png-oracle-slice06.mjs";
import { inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import {
  SLICE06_EVIDENCE_BOUNDARY,
  SLICE06_RUNNER_RECORD_SCHEMAS,
  SLICE06_RUNNER_SCHEMA_DOCUMENTS,
  SLICE06_RUNNER_SCHEMA_PATHS,
} from "./research-run-slice06.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const NUL = Buffer.from([0]);
const VERSION = "0.6.0";

export const DEFAULT_SLICE06_ROOT = path.resolve(PROJECT_ROOT, "research/slice-06");
export const SLICE06_GENERATOR_VERSION = "slice06-definition-generator.v0.6.0";
export const SLICE06_FROZEN_AT = "2026-08-15T08:17:06.288Z";

export const SLICE06_DEFINITION_IDS = Object.freeze({
  definition: "DEFINITION-INDEX-SLICE06@0.6.0",
  closureLineage: "LINEAGE-SLICE05-CLOSED-NON-PASS@0.6.0",
  runtime: "RUNTIME-SHARP-WIN32-X64-DIAGNOSTIC@0.6.0",
  hardware: "HARDWARE-WIN32-X64-DIAGNOSTIC@0.6.0",
  candidate: "REG-NORM-SHARP@0.6.0",
  normalizeContract: "CC-CAP02-NORMALIZE-PNG@0.6.0",
  exportContract: "CC-CAP02-EXPORT-PNG@0.6.0",
  normalizePlan: "PLAN-DIAGNOSTIC-NORMALIZE-PNG@0.6.0",
  exportPlan: "PLAN-DIAGNOSTIC-EXPORT-PNG@0.6.0",
  normalizePreregistration: "PREREG-DIAGNOSTIC-NORMALIZE-PNG@0.6.0",
  exportPreregistration: "PREREG-DIAGNOSTIC-EXPORT-PNG@0.6.0",
  rights: "RIGHTS-SLICE05-OPEN-SYNTHETIC-REUSE@0.6.0",
  retention: "RETENTION-OPEN-DIAGNOSTIC@0.6.0",
  errorRegistry: "ERROR-REGISTRY-SLICE06@0.6.0",
  normalizeManifest: "FM-DIAGNOSTIC-NORMALIZE-PNG@0.6.0",
  exportManifest: "FM-DIAGNOSTIC-EXPORT-PNG@0.6.0",
});

export const SLICE06_DEFINITION_PATHS = Object.freeze({
  definition: "definition-index.v0.6.0.json",
  closureLineage: "lineage/slice05-closed-non-pass.v0.6.0.json",
  runtime: "runtime/attestation.win32-x64.v0.6.0.json",
  hardware: "hardware/hardware.win32-x64.v0.6.0.json",
  candidate: "candidate-locks/composite-sharp-win32-x64.v0.6.0.json",
  normalizeContract: "contracts/cc-cap02-normalize-png.v0.6.0.json",
  exportContract: "contracts/cc-cap02-export-png.v0.6.0.json",
  normalizePlan: "plans/diagnostic-normalize-png.v0.6.0.json",
  exportPlan: "plans/diagnostic-export-png.v0.6.0.json",
  normalizePreregistration: "preregistrations/diagnostic-normalize-png.v0.6.0.json",
  exportPreregistration: "preregistrations/diagnostic-export-png.v0.6.0.json",
  rights: "rights/open-synthetic-reuse.v0.6.0.json",
  retention: "retention/open-diagnostic.v0.6.0.json",
  errorRegistry: "errors/error-registry.v0.6.0.json",
  normalizeManifest: "manifests/normalize-diagnostic.v0.6.0.json",
  exportManifest: "manifests/export-diagnostic.v0.6.0.json",
});

export const SLICE06_RESULT_ROOT = "research/slice-06/results/open-diagnostic";

export const SLICE06_COMMIT_PINS = Object.freeze({
  slice05DefinitionCommit: "1db59c753991f9b0105c67c162e85cb9062ee3b1",
  slice05ClosureCommit: "4d7003e8e583c5964ab81ac0eb7182861aa44c0f",
  slice06ScopeCommit: "97584c02e5689c276825dec4e058b9a94d84913a",
  slice06PreviousProtocolBaselineCommit: "002e28963289e1f49e49a29ca78ebf820958f235",
  slice06ProtocolCommit: "ed5a60fb2f103494f78fda4260909c6e83a1baf6",
});

const SLICE05_PINS = Object.freeze({
  definitionContentHash: "d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271",
  definitionFileSha256: "8cbf1f0aaf018c54b95eaa5ef0f3a2f6cb11dc60529ea569408496514d582d96",
  definitionByteLength: 108012,
  descendantTreeSha256: "8b340918e423043538997250c63b9b49b175b2d2b349c4835de48dd017ed82c0",
  descendantFileCount: 366,
  schemaTreeSha256: "8b5170c4026c930d4ac98e903d9b58902589869971f1fa013637c70eae6ebca6",
  schemaFileCount: 25,
  fullDefinitionTreeSha256: "108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2",
  fullDefinitionFileCount: 368,
  fullDefinitionDirectoryCount: 36,
  readmeSha256: "1a22e17fb57cd23ab19da5e97fb2ed909dd4793e8800047371f8cf7bfd9330a7",
  readmeByteLength: 4762,
  resultTreeSha256: "e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b",
  resultFileCount: 116,
  resultDirectoryCount: 8,
  resultTotalBytes: 357303,
  ledgerFileSha256: "7bcb9f3f2eded4aaedc59a6fc2473b6ad711ba3dc9a2ad00eaf162dd57b28d6a",
  ledgerTailHash: "f8f2fe5e0356a801cbd59670c16d79dba976d2338a297e6e917a3f5ebf581828",
  ledgerEvents: 72,
});

const STABLE_PROTOCOL_SCHEMA_PATHS = Object.freeze([
  "schemas/candidate-output-observation.slice06.v0.schema.json",
  "schemas/diagnostic-envelope.slice06.v0.schema.json",
  "schemas/oracle-diagnostic.slice06.v0.schema.json",
]);

const SOURCE_CODE_PATHS = Object.freeze({
  adapter: "scripts/research-diagnostic-adapter-slice06.mjs",
  worker: "scripts/research-sharp-worker-slice06.mjs",
  oracle: "scripts/research-diagnostic-png-oracle-slice06.mjs",
  runner: "scripts/research-run-slice06.mjs",
  driver: "scripts/research-execute-slice06.mjs",
  generator: "scripts/research-generate-slice06.mjs",
  inventory: "scripts/research-inventory-sharp-slice05.mjs",
  regressionDecoder: "scripts/research-independent-png-oracle-slice05.mjs",
});

const NATIVE_VERSION_COMPONENTS = Object.freeze([
  "aom", "archive", "cairo", "cgif", "exif", "expat", "ffi", "fontconfig", "freetype", "fribidi",
  "glib", "harfbuzz", "heif", "highway", "imagequant", "lcms", "mozjpeg", "pango", "pixman", "png",
  "proxy-libintl", "rsvg", "tiff", "uhdr", "vips", "webp", "xml2", "zlib-ng",
]);

export const SLICE06_IMPLEMENTATION_IDENTITIES = Object.freeze({
  adapter: Object.freeze({ id: "ADAPTER-SHARP-DIAGNOSTIC@0.6.0", version: VERSION }),
  worker: Object.freeze({ id: "WORKER-SHARP-DIAGNOSTIC@0.6.0", version: VERSION }),
  oracle: Object.freeze({ id: "ORACLE-INDEPENDENT-PNG-DIAGNOSTIC@0.6.0", version: VERSION }),
  runner: Object.freeze({ id: "RUNNER-LOCAL-DIAGNOSTIC@0.6.0", version: VERSION }),
  driver: Object.freeze({ id: "DRIVER-REGISTERED-DIAGNOSTIC@0.6.0", version: VERSION }),
  generator: Object.freeze({ id: "GEN-SLICE06-DEFINITION@0.6.0", version: VERSION }),
  inventory: Object.freeze({ id: "INVENTORY-SHARP-RUNTIME@0.5.0", version: "0.5.0" }),
  regressionDecoder: Object.freeze({ id: "ORACLE-INDEPENDENT-PNG@0.5.0", version: "0.5.0" }),
});

export const SLICE06_SOURCE_SPECS = Object.freeze([
  Object.freeze({
    operation: "normalize", ordinal: 1, sourceId: "source.s06.normalize.diagnostic.001",
    lineageId: "raw.s05.normalize.smoke.001", diagnosticRole: "canonical-opaque-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "normalize", ordinal: 2, sourceId: "source.s06.normalize.diagnostic.002",
    lineageId: "raw.s05.normalize.smoke.002", diagnosticRole: "canonical-partial-alpha-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "normalize", ordinal: 3, sourceId: "source.s06.normalize.diagnostic.003",
    lineageId: "raw.s05.normalize.smoke.003", diagnosticRole: "canonical-alpha-holes-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "normalize", ordinal: 4, sourceId: "source.s06.normalize.diagnostic.004",
    lineageId: "raw.s05.normalize.smoke.005", diagnosticRole: "missing-srgb-preflight-sentinel",
    expectedDisposition: "preflight-reject", expectedStableErrorCode: "S06_INPUT_SRGB_REQUIRED",
  }),
  Object.freeze({
    operation: "export", ordinal: 1, sourceId: "source.s06.export.diagnostic.001",
    lineageId: "normalized.s05.export.smoke.001", diagnosticRole: "independent-opaque-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "export", ordinal: 2, sourceId: "source.s06.export.diagnostic.002",
    lineageId: "normalized.s05.export.smoke.002", diagnosticRole: "independent-partial-alpha-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "export", ordinal: 3, sourceId: "source.s06.export.diagnostic.003",
    lineageId: "normalized.s05.export.smoke.003", diagnosticRole: "independent-alpha-holes-applicable",
    expectedDisposition: "applicable", expectedStableErrorCode: null,
  }),
  Object.freeze({
    operation: "export", ordinal: 4, sourceId: "source.s06.export.diagnostic.004",
    lineageId: "normalized.s05.export.smoke.004", diagnosticRole: "invalid-artifact-version-preflight-sentinel",
    expectedDisposition: "preflight-reject", expectedStableErrorCode: "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID",
  }),
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function stableStringifySlice06Definition(value) {
  return stableStringifySlice06(value);
}

export function sha256Slice06Definition(value) {
  const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return sha256Slice06(bytes);
}

export function contentHashSlice06Definition(record) {
  return contentHashSlice06(record);
}

function finalizeRecord(record) {
  if (!isPlainObject(record)) throw new TypeError("Slice 06 records must be plain objects");
  const finalized = structuredClone(record);
  finalized.contentHash = contentHashSlice06Definition(finalized);
  return finalized;
}

function exactUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError("Slice 06 frozenAt must be supplied as one exact millisecond UTC instant");
  }
  return value;
}

function assertLiteral(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} drifted: expected ${expected}, got ${actual}`);
}

function closedObject(properties, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, properties, required };
}

function arrayOf(items, options = {}) {
  return { type: "array", items, ...options };
}

function constString(value) {
  return { type: "string", const: value };
}

function enumString(values) {
  return { type: "string", enum: values };
}

function nullable(schema) {
  return { oneOf: [schema, { type: "null" }] };
}

function commonDefs() {
  const sha256 = { type: "string", pattern: "^[0-9a-f]{64}$" };
  const id = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$" };
  const relativePath = {
    type: "string",
    pattern: "^(?!.*(?:^|/)\\.\\.?(?:/|$))(?!.*\\\\)(?!.*:)[A-Za-z0-9@._-]+(?:/[A-Za-z0-9@._-]+)*$",
  };
  const utc = {
    type: "string",
    format: "date-time",
    pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
  };
  const fileRef = closedObject({
    path: { $ref: "#/$defs/relativePath" },
    byteLength: { type: "integer", minimum: 1 },
    fileSha256: { $ref: "#/$defs/sha256" },
  });
  const recordRef = closedObject({
    path: { $ref: "#/$defs/relativePath" },
    id: { $ref: "#/$defs/id" },
    contentHash: { $ref: "#/$defs/sha256" },
    byteLength: { type: "integer", minimum: 1 },
    fileSha256: { $ref: "#/$defs/sha256" },
  });
  const implementationRef = closedObject({
    id: { $ref: "#/$defs/id" }, version: enumString(["0.5.0", "0.6.0"]),
    path: { $ref: "#/$defs/relativePath" }, implementationSha256: { $ref: "#/$defs/sha256" },
  });
  const evidenceBoundary = closedObject({
    formal: { type: "boolean", const: false },
    productSupport: { type: "boolean", const: false },
    excludedFromGateB: { type: "boolean", const: true },
    gateBDecisionAuthority: { type: "boolean", const: false },
    calibrationAuthorized: { type: "boolean", const: false },
    c1: { type: "integer", const: 0 }, u1: { type: "integer", const: 0 },
    e1: { type: "integer", const: 0 }, r1Pipeline: { type: "integer", const: 0 },
    r1ProductValidation: { type: "integer", const: 0 }, r1ProductRelease: { type: "integer", const: 0 },
    o1: { type: "integer", const: 0 }, g1: { type: "integer", const: 0 }, v1: { type: "integer", const: 0 },
    releaseAllowlist: constString("none"), releaseRegistered: { type: "integer", const: 0 },
    releaseApproved: { type: "integer", const: 0 },
  });
  return { sha256, id, relativePath, utc, fileRef, recordRef, implementationRef, evidenceBoundary };
}

function schemaDocument(filename, properties, defs = {}) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-06/schemas/${filename}`,
    ...closedObject(properties),
    $defs: { ...commonDefs(), ...defs },
  };
}

const treeDescriptorSchema = closedObject({
  algorithm: constString("sha256(sorted(relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))"),
  fileCount: { type: "integer", minimum: 0 },
  directoryCount: { type: "integer", minimum: 0 },
  totalBytes: { type: "integer", minimum: 0 },
  sha256: { $ref: "#/$defs/sha256" },
});

const implementationRoleRefSchema = closedObject({
  role: { $ref: "#/$defs/id" }, ref: { $ref: "#/$defs/implementationRef" },
});

const operationRecordRefSchema = closedObject({
  operation: enumString(["normalize", "export"]), ref: { $ref: "#/$defs/recordRef" },
});

const protocolSchemaRefSchema = closedObject({
  role: { $ref: "#/$defs/id" }, schemaVersion: { $ref: "#/$defs/id" }, file: { $ref: "#/$defs/fileRef" },
});

const inputFactsSchema = closedObject({
  mime: constString("image/png"), byteLength: { type: "integer", minimum: 1, maximum: 1048576 },
  fileSha256: { $ref: "#/$defs/sha256" }, decodedPixelSha256: { $ref: "#/$defs/sha256" },
  width: { type: "integer", minimum: 1, maximum: 256 }, height: { type: "integer", minimum: 1, maximum: 256 },
  alphaPresent: { type: "boolean" },
});

const profileSchema = closedObject({
  type: enumString(["canonical-png-source-bytes", "NormalizedImage.slice04.v0", "DeliveryArtifact.slice04.v0"]),
  mime: constString("image/png"), maxBytes: { type: "integer", const: 1048576 },
  maxWidth: { type: "integer", const: 256 }, maxHeight: { type: "integer", const: 256 },
  pixelLayout: constString("RGBA8"), colorSpace: constString("embedded-sRGB"),
  orientation: { type: "integer", const: 1 }, alphaMode: constString("straight-unpremultiplied"),
  metadataPolicy: constString("strip-all-except-color-contract"), pngFilterPolicy: constString("filter-0-only"),
  interlace: constString("forbidden"), animation: constString("forbidden"),
});

const closureLineageSchema = schemaDocument("closure-lineage.slice06.v0.schema.json", {
  schemaVersion: constString("closure-lineage.slice06.v0"),
  closureLineageId: constString(SLICE06_DEFINITION_IDS.closureLineage), recordVersion: constString(VERSION),
  commitPins: closedObject({
    slice05DefinitionCommit: constString(SLICE06_COMMIT_PINS.slice05DefinitionCommit),
    slice05ClosureCommit: constString(SLICE06_COMMIT_PINS.slice05ClosureCommit),
    slice06ScopeCommit: constString(SLICE06_COMMIT_PINS.slice06ScopeCommit),
    slice06PreviousProtocolBaselineCommit: constString(SLICE06_COMMIT_PINS.slice06PreviousProtocolBaselineCommit),
    slice06ProtocolCommit: constString(SLICE06_COMMIT_PINS.slice06ProtocolCommit),
  }),
  sourceCandidateMetadataRef: { $ref: "#/$defs/recordRef" }, slice05CandidateRef: { $ref: "#/$defs/recordRef" },
  slice05RightsRef: { $ref: "#/$defs/recordRef" },
  slice05Definition: closedObject({
    definitionRef: { $ref: "#/$defs/recordRef" }, descendantMachineTree: treeDescriptorSchema,
    schemaTree: treeDescriptorSchema, fullDefinitionTree: treeDescriptorSchema, proseReadme: { $ref: "#/$defs/fileRef" },
  }),
  slice05ResultClosure: closedObject({
    resultRoot: constString("research/slice-05/results/open-smoke"), resultTree: treeDescriptorSchema,
    ledger: closedObject({ file: { $ref: "#/$defs/fileRef" }, eventCount: { type: "integer", const: 72 }, tailContentHash: { $ref: "#/$defs/sha256" } }),
    operations: arrayOf(closedObject({
      operation: enumString(["normalize", "export"]), summaryRef: { $ref: "#/$defs/recordRef" },
      decisionRef: { $ref: "#/$defs/recordRef" }, decision: constString("denied-not-entered"),
      calibrationAuthorized: { type: "boolean", const: false }, historicalOracleChildSubtype: constString("unknown"),
    }), { minItems: 2, maxItems: 2 }),
  }),
  immutableFacts: closedObject({
    state: constString("smoke-closed-non-pass"), gateB: constString("denied-not-entered"),
    calibrationAuthorized: { type: "boolean", const: false }, publishedArtifactCount: { type: "integer", const: 0 },
    historicalRequestsMayBeRerun: { type: "boolean", const: false }, historicalRecordsMayBeRewritten: { type: "boolean", const: false },
  }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" },
  contentHash: { $ref: "#/$defs/sha256" },
});

const environmentSchema = closedObject({
  os: closedObject({ platform: constString("win32"), release: { type: "string", minLength: 1 }, version: { type: "string", minLength: 1 }, architecture: constString("x64") }),
  cpu: closedObject({ models: arrayOf({ type: "string", minLength: 1 }, { minItems: 1, uniqueItems: true }), logicalProcessors: { type: "integer", minimum: 1 } }),
  memory: closedObject({ totalBytes: { type: "integer", minimum: 1 } }),
  node: closedObject({ version: { type: "string", pattern: "^v[0-9]+" }, abi: { type: "string", pattern: "^[0-9]+$" }, napi: { type: "string", pattern: "^[0-9]+$" } }),
  npm: closedObject({ version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+" } }),
});

const runtimeSchema = schemaDocument("runtime-attestation.slice06.v0.schema.json", {
  schemaVersion: constString("runtime-attestation.slice06.v0"), runtimeAttestationId: constString(SLICE06_DEFINITION_IDS.runtime),
  recordVersion: constString(VERSION), observedCandidateId: constString(SLICE06_DEFINITION_IDS.candidate),
  closureLineageRef: { $ref: "#/$defs/recordRef" }, sourceSlice05RuntimeRef: { $ref: "#/$defs/recordRef" },
  inventoryImplementationRef: { $ref: "#/$defs/implementationRef" }, inventoryPayloadSha256: { $ref: "#/$defs/sha256" },
  packageManifest: closedObject({
    path: constString("package.json"), sha256: { $ref: "#/$defs/sha256" },
    exactDevDependencies: arrayOf(closedObject({ name: enumString(["@img/sharp-win32-x64", "sharp"]), version: constString("0.35.3") }), { minItems: 2, maxItems: 2, uniqueItems: true }),
  }),
  packageLock: closedObject({ path: constString("package-lock.json"), sha256: { $ref: "#/$defs/sha256" }, expectedSha256: { $ref: "#/$defs/sha256" }, lockfileVersion: { type: "integer", const: 3 } }),
  installedClosure: closedObject({
    allowlist: arrayOf({ type: "string", minLength: 1 }, { minItems: 5, maxItems: 5, uniqueItems: true }),
    packages: arrayOf(closedObject({ name: { type: "string", minLength: 1 }, version: { type: "string", minLength: 1 }, path: { $ref: "#/$defs/relativePath" }, packageJsonSha256: { $ref: "#/$defs/sha256" } }), { minItems: 5, maxItems: 5 }),
    ignoredEmptyScopeDirectories: arrayOf({ type: "string", pattern: "^@[a-z0-9._-]+$" }, { uniqueItems: true }),
    fileCount: { type: "integer", minimum: 1 }, treeSha256: { $ref: "#/$defs/sha256" },
    nativeArtifacts: arrayOf(closedObject({ path: { $ref: "#/$defs/relativePath" }, byteLength: { type: "integer", minimum: 1 }, sha256: { $ref: "#/$defs/sha256" }, expectedSha256: { $ref: "#/$defs/sha256" } }), { minItems: 3, maxItems: 3 }),
  }),
  versions: closedObject({
    installedVersionsJsonSha256: { $ref: "#/$defs/sha256" }, installedComponentCount: { type: "integer", const: 28 },
    sharpRuntimeComponentCount: { type: "integer", const: 29 }, sharpVersion: constString("0.35.3"),
    matchesInstalledVersionsJson: { type: "boolean", const: true }, packagingMetadataDifferenceCount: { type: "integer", const: 9 },
  }),
  expectedWorkerRuntime: closedObject({
    sharpVersion: constString("0.35.3"),
    nativeVersions: closedObject({
      ...Object.fromEntries(NATIVE_VERSION_COMPONENTS.map((component) => [component, { type: "string", minLength: 1 }])),
      sharp: constString("0.35.3"),
    }),
    nodeVersion: { type: "string", pattern: "^v[0-9]+" }, platform: constString("win32"), architecture: constString("x64"),
    settings: closedObject({
      concurrency: { type: "integer", const: 1 }, cacheMemoryMaxMiB: { type: "integer", const: 0 },
      cacheFilesMax: { type: "integer", const: 0 }, cacheItemsMax: { type: "integer", const: 0 },
      simd: { type: "boolean", const: false }, uvThreadpoolSize: constString("1"),
      vipsConcurrency: constString("1"), ignoreGlobalLibvips: constString("1"),
    }),
  }),
  environment: environmentSchema,
  observationBoundary: closedObject({
    freshInventoryRequired: { type: "boolean", const: true }, sourceSlice05RuntimeRecordReusedAsObservation: { type: "boolean", const: false },
    inventoryHelperReusedReadOnly: { type: "boolean", const: true },
  }),
  executionBoundary: closedObject({
    sharpImportedForVersionsOnly: { type: "boolean", const: true }, imageBytesRead: { type: "boolean", const: false },
    imageDecoded: { type: "boolean", const: false }, imageEncoded: { type: "boolean", const: false },
    candidatePipelineInvoked: { type: "boolean", const: false }, hostnameRecorded: { type: "boolean", const: false }, serialRecorded: { type: "boolean", const: false },
  }),
  recordedAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const hardwareSchema = schemaDocument("hardware-observation.slice06.v0.schema.json", {
  schemaVersion: constString("hardware-observation.slice06.v0"), hardwareProfileId: constString(SLICE06_DEFINITION_IDS.hardware),
  recordVersion: constString(VERSION), runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, environment: environmentSchema,
  privacyBoundary: closedObject({ hostnameRecorded: { type: "boolean", const: false }, serialRecorded: { type: "boolean", const: false } }),
  stateAtDefinitionFreeze: constString("freshly-observed-and-pinned-not-a-portability-claim"),
  observedAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const candidateSchema = schemaDocument("candidate-lock.slice06.v0.schema.json", {
  schemaVersion: constString("candidate-lock.slice06.v0"), candidateLockId: constString(SLICE06_DEFINITION_IDS.candidate),
  recordVersion: constString(VERSION), candidateKind: constString("installed-sharp-win32-x64-runtime-closure-diagnostic-only"),
  selectionStatus: constString("diagnostic-only-not-selected"), closureLineageRef: { $ref: "#/$defs/recordRef" },
  sourceCandidateMetadataRef: { $ref: "#/$defs/recordRef" }, closedSlice05CandidateRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" },
  implementationRefs: arrayOf(implementationRoleRefSchema, { minItems: 6, uniqueItems: true }),
  runtimeClosure: closedObject({ packageLockSha256: { $ref: "#/$defs/sha256" }, installedTreeSha256: { $ref: "#/$defs/sha256" }, nativeArtifactCount: { type: "integer", const: 3 }, installedVersionCount: { type: "integer", const: 28 } }),
  stateAtDefinitionFreeze: closedObject({
    installation: constString("installed-and-freshly-inventoried"), execution: constString("candidate-pixel-pipeline-not-run-by-definition"),
    gateB: constString("not-entered-diagnostic-only"), calibration: constString("not-created-by-scope"),
  }),
  prohibitedClaims: arrayOf(enumString(["product-capability", "formal-c1", "gate-b-pass", "holdout-evidence", "release-support"]), { minItems: 5, maxItems: 5, uniqueItems: true }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const capabilityContractSchema = schemaDocument("capability-contract.slice06.v0.schema.json", {
  schemaVersion: constString("capability-contract.slice06.v0"),
  contractId: enumString([SLICE06_DEFINITION_IDS.normalizeContract, SLICE06_DEFINITION_IDS.exportContract]),
  recordVersion: constString(VERSION), capabilityId: constString("CAP-02"), suiteId: constString("NORMALIZE-DELIVER"),
  operation: enumString(["normalize", "export"]), sourceSlice05ContractRef: { $ref: "#/$defs/recordRef" },
  closureLineageRef: { $ref: "#/$defs/recordRef" }, candidateRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, artifactSchemaRefs: arrayOf(protocolSchemaRefSchema, { minItems: 1, maxItems: 2 }),
  diagnosticProtocolSchemaRefs: arrayOf(protocolSchemaRefSchema, { minItems: 13, maxItems: 13 }),
  inputProfile: profileSchema, outputProfile: profileSchema,
  implementation: closedObject({
    state: constString("definition-frozen-diagnostic-only-not-run"), adapterRef: { $ref: "#/$defs/implementationRef" },
    workerRef: { $ref: "#/$defs/implementationRef" }, independentOracleRef: { $ref: "#/$defs/implementationRef" },
    isolatedWorkerRequired: { type: "boolean", const: true }, independentReopenRequired: { type: "boolean", const: true },
    passthroughAllowed: { type: "boolean", const: false }, fallbackAllowed: { type: "boolean", const: false },
    atomicDiagnosticClosureRequired: { type: "boolean", const: true }, imagePipelineExecutedByDefinitionGenerator: { type: "boolean", const: false },
  }),
  diagnosticPersistence: closedObject({
    candidateOutputBytesRequiredWhenWithinLimit: { type: "boolean", const: true }, workerObservationRequired: { type: "boolean", const: true },
    exactOracleChildCodesRequired: { type: "boolean", const: true }, diagnosticEnvelopeRequired: { type: "boolean", const: true },
    artifactPublicationAllowed: { type: "boolean", const: false },
  }),
  failureSemantics: closedObject({
    failClosed: { type: "boolean", const: true }, stableErrorCodeRequired: { type: "boolean", const: true },
    validOutcomeRerunAllowed: { type: "boolean", const: false }, replacementAttempts: { type: "integer", const: 0 },
    unknownIsProtocolFailureOrInconclusive: { type: "boolean", const: true },
  }),
  gateBStateAtDefinitionFreeze: constString("not-entered-diagnostic-only"), calibrationStateAtDefinitionFreeze: constString("not-created-by-scope"),
  formalHoldoutStatusAtDefinitionFreeze: constString("not-created"), formalDefectHoldoutStatusAtDefinitionFreeze: constString("not-created"), formalEscapeStatusAtDefinitionFreeze: constString("not-created"),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const diagnosticCaseSchema = closedObject({
  sourceId: { $ref: "#/$defs/id" }, sourceLineageRef: { $ref: "#/$defs/recordRef" },
  diagnosticRole: { $ref: "#/$defs/id" }, expectedDisposition: enumString(["applicable", "preflight-reject"]),
  expectedStableErrorCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }), repetitions: { type: "integer", const: 3 }, attemptNumber: { type: "integer", const: 1 },
});

const diagnosticPlanSchema = schemaDocument("diagnostic-plan.slice06.v0.schema.json", {
  schemaVersion: constString("diagnostic-plan.slice06.v0"),
  diagnosticPlanId: enumString([SLICE06_DEFINITION_IDS.normalizePlan, SLICE06_DEFINITION_IDS.exportPlan]),
  recordVersion: constString(VERSION), mode: constString("open-diagnostic"), operation: enumString(["normalize", "export"]),
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRef: { $ref: "#/$defs/recordRef" }, closureLineageRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" }, rightsRef: { $ref: "#/$defs/recordRef" }, retentionPolicyRef: { $ref: "#/$defs/recordRef" }, errorRegistryRef: { $ref: "#/$defs/recordRef" },
  implementationRefs: arrayOf(implementationRoleRefSchema, { minItems: 6, uniqueItems: true }),
  resultProtocolSchemaRefs: arrayOf(protocolSchemaRefSchema, { minItems: 13, maxItems: 13 }),
  denominator: closedObject({ sourceUnits: { type: "integer", const: 4 }, applicableSources: { type: "integer", const: 3 }, preflightSentinels: { type: "integer", const: 1 }, repetitionsPerSource: { type: "integer", const: 3 }, attempts: { type: "integer", const: 12 }, replacementAttempts: { type: "integer", const: 0 } }),
  cases: arrayOf(diagnosticCaseSchema, { minItems: 4, maxItems: 4 }),
  repetitionRule: closedObject({ majorityVoteAllowed: { type: "boolean", const: false }, allThreeTerminalRequired: { type: "boolean", const: true }, validOutcomeRerunAllowed: { type: "boolean", const: false }, missingOrUnknownRequiresStop: { type: "boolean", const: true } }),
  stopRules: arrayOf(closedObject({ code: { type: "string", pattern: "^S06_[A-Z0-9_]+$" }, condition: { type: "string", minLength: 1 }, disposition: enumString(["protocol-failed", "inconclusive", "seal-and-version-bump"]) }), { minItems: 8, uniqueItems: true }),
  outcomeBoundary: closedObject({ characterizationMaySelectFutureCandidateDiscussion: { type: "boolean", const: true }, candidateConformancePass: { type: "boolean", const: false }, gateBDecisionAuthority: { type: "boolean", const: false }, calibrationAuthorized: { type: "boolean", const: false } }),
  resultsStateAtDefinitionFreeze: constString("not-created"), frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const diagnosticPreregistrationSchema = schemaDocument("diagnostic-preregistration.slice06.v0.schema.json", {
  schemaVersion: constString("diagnostic-preregistration.slice06.v0"),
  preregistrationId: enumString([SLICE06_DEFINITION_IDS.normalizePreregistration, SLICE06_DEFINITION_IDS.exportPreregistration]),
  recordVersion: constString(VERSION), mode: constString("open-diagnostic"), operation: enumString(["normalize", "export"]),
  stateAtDefinitionFreeze: constString("preregistered-diagnostic-results-zero"), runIdentity: closedObject({ runId: { $ref: "#/$defs/id" }, sessionId: { $ref: "#/$defs/id" }, invocationLimit: { type: "integer", const: 1 } }),
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRef: { $ref: "#/$defs/recordRef" }, diagnosticPlanRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" }, rightsRef: { $ref: "#/$defs/recordRef" }, retentionPolicyRef: { $ref: "#/$defs/recordRef" }, errorRegistryRef: { $ref: "#/$defs/recordRef" },
  sourceLineageRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 4, maxItems: 4 }),
  implementationRefs: arrayOf(implementationRoleRefSchema, { minItems: 6, uniqueItems: true }),
  denominator: closedObject({ sourceUnits: { type: "integer", const: 4 }, attempts: { type: "integer", const: 12 }, repetitionsPerSource: { type: "integer", const: 3 }, replacementAttempts: { type: "integer", const: 0 } }),
  requestIdentityRule: constString("new-slice06-source-run-session-request-and-idempotency-identities-only"),
  outcomeRule: constString("all-twelve-attempts-terminal-with-complete-byte-worker-oracle-ledger-and-tree-closure-or-close-protocol-failed-or-inconclusive"),
  rerunRule: constString("no-valid-outcome-rerun-no-replacement-no-majority-vote"),
  formalBoundary: closedObject({ holdout: constString("not-created"), defectHoldout: constString("not-created"), escape: constString("not-created"), formalRunsAllowed: { type: "boolean", const: false }, c1Denominator: { type: "integer", const: 0 } }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const rightsSchema = schemaDocument("rights-record.slice06.v0.schema.json", {
  schemaVersion: constString("rights-record.slice06.v0"), rightsRecordId: constString(SLICE06_DEFINITION_IDS.rights), recordVersion: constString(VERSION),
  sourceSlice05RightsRef: { $ref: "#/$defs/recordRef" }, assetClass: constString("project-original-deterministic-synthetic-open-research-fixtures"),
  reuseClass: constString("read-only-reference-to-committed-slice05-public-synthetic-lineage"), independenceClaim: { type: "boolean", const: false },
  provenance: closedObject({ containsRealPerson: { type: "boolean", const: false }, realUserPhotosUsed: { type: "boolean", const: false }, thirdPartyAssetsUsed: { type: "boolean", const: false }, modelWeightsUsed: { type: "boolean", const: false }, copiedImageBytes: { type: "boolean", const: false }, regressionLineageOnly: { type: "boolean", const: true } }),
  permissions: closedObject({ repositoryReference: { type: "boolean", const: true }, candidateDerivativeRepositoryRetention: { type: "boolean", const: true }, diagnosticPublicDisplay: { type: "boolean", const: true }, artifactPublication: { type: "boolean", const: false }, productUseClaim: { type: "boolean", const: false }, permissionBasis: constString("project-original-authorship-carried-by-pinned-slice05-rights") }),
  oracleRightsValues: closedObject({
    assetClass: constString("project-original-deterministic-synthetic-open-research-fixtures"), containsRealPerson: { type: "boolean", const: false }, realUserPhotosUsed: { type: "boolean", const: false }, thirdPartyAssetsUsed: { type: "boolean", const: false }, modelWeightsUsed: { type: "boolean", const: false }, candidateDerivativeRepositoryRetention: { type: "boolean", const: true }, diagnosticPublicDisplay: { type: "boolean", const: true },
  }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const retentionTemplateSchema = closedObject({
  state: enumString(["retained", "hash-only"]), reasonCode: enumString(["S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC", "S06_DIAGNOSTIC_RETENTION_HASH_ONLY"]),
  maxPerOutputBytes: { type: "integer", const: 1048576 }, maxSessionBytes: { type: "integer", const: 18874368 },
});

const retentionSchema = schemaDocument("retention-policy.slice06.v0.schema.json", {
  schemaVersion: constString("retention-policy.slice06.v0"), retentionPolicyId: constString(SLICE06_DEFINITION_IDS.retention), recordVersion: constString(VERSION),
  mode: constString("open-diagnostic"), rightsRef: { $ref: "#/$defs/recordRef" }, maxPerOutputBytes: { type: "integer", const: 1048576 }, maxSessionBytes: { type: "integer", const: 18874368 },
  retainedValues: retentionTemplateSchema, hashOnlyValues: retentionTemplateSchema,
  disposition: closedObject({ oraclePass: constString("specimens-nonartifact"), oracleNonPass: constString("quarantine-nonartifact"), preflightReject: constString("no-candidate-output"), overLimit: constString("hash-only-nonartifact"), artifactsDirectoryAllowed: { type: "boolean", const: false }, catalogPublicationAllowed: { type: "boolean", const: false }, productDownloadAllowed: { type: "boolean", const: false } }),
  cleanup: closedObject({ stagingMustBeRemovedOrReconciled: { type: "boolean", const: true }, unreferencedBytesAllowed: { type: "boolean", const: false }, fullResultTreeInventoryRequired: { type: "boolean", const: true } }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const fixtureLineageSchema = schemaDocument("fixture-lineage.slice06.v0.schema.json", {
  schemaVersion: constString("fixture-lineage.slice06.v0"), sourceLineageId: { $ref: "#/$defs/id" }, recordVersion: constString(VERSION),
  sourceId: { $ref: "#/$defs/id" }, sourceFamilyId: { $ref: "#/$defs/id" }, captureSessionId: { $ref: "#/$defs/id" },
  operation: enumString(["normalize", "export"]), partition: constString("diagnostic"), diagnosticRole: { $ref: "#/$defs/id" },
  expectedDisposition: enumString(["applicable", "preflight-reject"]), expectedStableErrorCode: nullable({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }),
  repetitions: { type: "integer", const: 3 }, attemptNumber: { type: "integer", const: 1 }, independenceClaim: { type: "boolean", const: false }, newIndependentSource: { type: "boolean", const: false },
  regressionLineageRef: closedObject({ slice: constString("05"), sourceId: { $ref: "#/$defs/id" }, definitionRef: { $ref: "#/$defs/recordRef" } }),
  sourceProvenanceRef: { $ref: "#/$defs/recordRef" }, inputArtifactRef: nullable({ $ref: "#/$defs/recordRef" }), byteAssetRef: { $ref: "#/$defs/fileRef" },
  inputFacts: inputFactsSchema, goldRef: nullable({ $ref: "#/$defs/recordRef" }), rightsRef: { $ref: "#/$defs/recordRef" }, retentionPolicyRef: { $ref: "#/$defs/recordRef" },
  reuseBoundary: closedObject({ sourceBytesCopied: { type: "boolean", const: false }, sourceRecordRewritten: { type: "boolean", const: false }, countsAsNewSource: { type: "boolean", const: false }, calibrationEligible: { type: "boolean", const: false }, holdoutEligible: { type: "boolean", const: false }, c1Eligible: { type: "boolean", const: false } }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const diagnosticManifestSchema = schemaDocument("diagnostic-manifest.slice06.v0.schema.json", {
  schemaVersion: constString("diagnostic-manifest.slice06.v0"), manifestId: enumString([SLICE06_DEFINITION_IDS.normalizeManifest, SLICE06_DEFINITION_IDS.exportManifest]),
  manifestVersion: constString(VERSION), manifestKind: constString("open-diagnostic-characterization"), mode: constString("open-diagnostic"), operation: enumString(["normalize", "export"]), stateAtDefinitionFreeze: constString("frozen-results-zero-not-run"),
  runIdentity: closedObject({ runId: { $ref: "#/$defs/id" }, sessionId: { $ref: "#/$defs/id" } }),
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRef: { $ref: "#/$defs/recordRef" }, diagnosticPlanRef: { $ref: "#/$defs/recordRef" }, preregistrationRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" }, rightsRef: { $ref: "#/$defs/recordRef" }, retentionPolicyRef: { $ref: "#/$defs/recordRef" }, errorRegistryRef: { $ref: "#/$defs/recordRef" },
  counts: closedObject({ totalSources: { type: "integer", const: 4 }, applicableSources: { type: "integer", const: 3 }, preflightSentinels: { type: "integer", const: 1 }, repetitionsPerSource: { type: "integer", const: 3 }, totalPlannedAttempts: { type: "integer", const: 12 }, replacementAttempts: { type: "integer", const: 0 } }),
  entries: arrayOf(diagnosticCaseSchema, { minItems: 4, maxItems: 4 }),
  isolation: closedObject({ newSlice06SourceFamilyAndCaptureSessionIds: { type: "boolean", const: true }, operationSpecificRunAndSessionIds: { type: "boolean", const: true }, reusedSlice05BytesAreLineageOnly: { type: "boolean", const: true }, independenceClaim: { type: "boolean", const: false }, crossOperationAggregationAllowed: { type: "boolean", const: false } }),
  outputBoundary: closedObject({ retainedOnlyAsDiagnosticSpecimenOrQuarantine: { type: "boolean", const: true }, artifactPublicationAllowed: { type: "boolean", const: false }, workerObservationAndExactOracleChildCodesRequired: { type: "boolean", const: true } }),
  frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const errorRegistrySchema = schemaDocument("error-registry.slice06.v0.schema.json", {
  schemaVersion: constString("error-registry.slice06.v0"), errorRegistryId: constString(SLICE06_DEFINITION_IDS.errorRegistry), recordVersion: constString(VERSION),
  sourceImplementationRefs: arrayOf({ $ref: "#/$defs/implementationRef" }, { minItems: 4, maxItems: 4 }),
  registeredCodes: arrayOf(closedObject({ code: { type: "string", pattern: "^S06_[A-Z0-9_]+$" }, class: enumString(["preflight", "oracle-finding", "worker", "protocol", "retention", "stop"]), terminalRole: enumString(["expected-sentinel", "oracle-child", "top-level", "protocol-failure", "inconclusive", "policy-marker"]) }), { minItems: 20, uniqueItems: true }),
  frozenPrecedence: closedObject({ normalizeMissingSrgb: constString("S06_INPUT_SRGB_REQUIRED-before-generic-idat-or-chunk-profile-rejection"), exportInvalidArtifactVersion: constString("S06_EXPORT_NORMALIZED_ARTIFACT_INVALID-before-worker-invocation"), outputOracleTopLevel: constString("S06_OUTPUT_ORACLE_REJECTED-with-exact-child-codes-required"), oracleFindingOrder: arrayOf({ type: "string", pattern: "^S06_[A-Z0-9_]+$" }, { minItems: 10, uniqueItems: true }) }),
  unknownCodeTreatment: constString("protocol-failed-or-inconclusive-never-pass"), frozenAt: { $ref: "#/$defs/utc" }, evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const definitionIndexSchema = schemaDocument("definition-index.slice06.v0.schema.json", {
  schemaVersion: constString("definition-index.slice06.v0"), definitionIndexId: constString(SLICE06_DEFINITION_IDS.definition), recordVersion: constString(VERSION),
  definitionState: constString("frozen-definition-results-zero-diagnostic-only"), frozenAt: { $ref: "#/$defs/utc" },
  scopeContractRef: { $ref: "#/$defs/fileRef" }, closureLineageRef: { $ref: "#/$defs/recordRef" }, runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" }, candidateRef: { $ref: "#/$defs/recordRef" },
  contractRefs: arrayOf(operationRecordRefSchema, { minItems: 2, maxItems: 2 }), diagnosticPlanRefs: arrayOf(operationRecordRefSchema, { minItems: 2, maxItems: 2 }),
  preregistrationRefs: arrayOf(operationRecordRefSchema, { minItems: 2, maxItems: 2 }), manifestRefs: arrayOf(operationRecordRefSchema, { minItems: 2, maxItems: 2 }),
  sourceLineageRefs: arrayOf(operationRecordRefSchema, { minItems: 8, maxItems: 8 }), rightsRef: { $ref: "#/$defs/recordRef" }, retentionPolicyRef: { $ref: "#/$defs/recordRef" }, errorRegistryRef: { $ref: "#/$defs/recordRef" },
  implementationRefs: arrayOf(implementationRoleRefSchema, { minItems: 8, maxItems: 8, uniqueItems: true }),
  resultProtocolSchemaRefs: arrayOf(protocolSchemaRefSchema, { minItems: 13, maxItems: 13 }),
  resultProtocol: closedObject({
    canonicalResultsRoot: constString(SLICE06_RESULT_ROOT),
    maximumDriverInvocations: { type: "integer", const: 1 },
    plannedRegisteredOperationRuns: { type: "integer", const: 2 },
    plannedSourceUnits: { type: "integer", const: 8 },
    plannedAttempts: { type: "integer", const: 24 },
    replacementAttempts: { type: "integer", const: 0 },
    globalStop: closedObject({
      operationOrder: arrayOf(enumString(["normalize", "export"]), { const: ["normalize", "export"], minItems: 2, maxItems: 2, uniqueItems: true }),
      secondOperationRegistrationRequiresFirstStatus: constString("characterization-complete"),
      firstOperationBlockingStatuses: arrayOf(enumString(["protocol-failed", "inconclusive"]), { const: ["protocol-failed", "inconclusive"], minItems: 2, maxItems: 2, uniqueItems: true }),
      actualCountsRecordedOnlyByDriverAfterExecution: { type: "boolean", const: true },
    }),
    resultAllowlist: arrayOf({ type: "string", minLength: 1 }, { minItems: 8, uniqueItems: true }),
  }),
  proseReadmeRef: closedObject({ path: constString("README.md"), byteLength: { type: "integer", minimum: 1 }, fileSha256: { $ref: "#/$defs/sha256" } }),
  initialResultStateAtDefinitionFreeze: closedObject({ resultsDirectoryPresent: { type: "boolean", const: false }, resultFilesPresent: { type: "integer", const: 0 }, ledgersPresent: { type: "integer", const: 0 }, summariesPresent: { type: "integer", const: 0 }, closeRecordsPresent: { type: "integer", const: 0 }, specimensPresent: { type: "integer", const: 0 }, quarantinePresent: { type: "integer", const: 0 } }),
  executionAdmission: closedObject({ definitionFrozen: { type: "boolean", const: true }, resultsZero: { type: "boolean", const: true }, containingGitCommitMustBePushedBeforeRun: { type: "boolean", const: true }, containingCommitRecordedInDefinition: { type: "boolean", const: false }, driverMustVerifyHeadAndOrigin: { type: "boolean", const: true }, registeredInvocationPerOperation: { type: "integer", const: 1 } }),
  machineTree: closedObject({
    algorithm: constString("sha256(sorted(slice-root-relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))"), rootSelfExcludedToAvoidCircularHash: { type: "boolean", const: true }, proseReadmeExcludedAndSeparatelyPinned: { type: "boolean", const: true },
    fileCount: { type: "integer", minimum: 1 }, sha256: { $ref: "#/$defs/sha256" },
    files: arrayOf(closedObject({ path: { $ref: "#/$defs/relativePath" }, classification: { $ref: "#/$defs/id" }, byteLength: { type: "integer", minimum: 1 }, fileSha256: { $ref: "#/$defs/sha256" } }), { minItems: 1 }),
  }),
  counts: closedObject({ schemas: { type: "integer", const: 26 }, machineRecordsExcludingIndex: { type: "integer", const: 23 }, manifests: { type: "integer", const: 2 }, sourceLineageRecords: { type: "integer", const: 8 }, sourceUnits: { type: "integer", const: 8 }, plannedAttempts: { type: "integer", const: 24 }, copiedImageBytes: { type: "integer", const: 0 }, generatedResults: { type: "integer", const: 0 }, formalFixtures: { type: "integer", const: 0 }, holdoutFixtures: { type: "integer", const: 0 }, defectHoldoutFixtures: { type: "integer", const: 0 }, escapeFixtures: { type: "integer", const: 0 } }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

export const SLICE06_MACHINE_SCHEMA_DOCUMENTS = Object.freeze({
  "schemas/closure-lineage.slice06.v0.schema.json": closureLineageSchema,
  "schemas/runtime-attestation.slice06.v0.schema.json": runtimeSchema,
  "schemas/hardware-observation.slice06.v0.schema.json": hardwareSchema,
  "schemas/candidate-lock.slice06.v0.schema.json": candidateSchema,
  "schemas/capability-contract.slice06.v0.schema.json": capabilityContractSchema,
  "schemas/diagnostic-plan.slice06.v0.schema.json": diagnosticPlanSchema,
  "schemas/diagnostic-preregistration.slice06.v0.schema.json": diagnosticPreregistrationSchema,
  "schemas/rights-record.slice06.v0.schema.json": rightsSchema,
  "schemas/retention-policy.slice06.v0.schema.json": retentionSchema,
  "schemas/fixture-lineage.slice06.v0.schema.json": fixtureLineageSchema,
  "schemas/diagnostic-manifest.slice06.v0.schema.json": diagnosticManifestSchema,
  "schemas/error-registry.slice06.v0.schema.json": errorRegistrySchema,
  "schemas/definition-index.slice06.v0.schema.json": definitionIndexSchema,
});

export const SLICE06_GENERATED_SCHEMA_DOCUMENTS = Object.freeze({
  ...SLICE06_RUNNER_SCHEMA_DOCUMENTS,
  ...SLICE06_MACHINE_SCHEMA_DOCUMENTS,
});

export const SLICE06_EXPECTED_SCHEMA_PATHS = Object.freeze([
  ...STABLE_PROTOCOL_SCHEMA_PATHS,
  ...Object.keys(SLICE06_GENERATED_SCHEMA_DOCUMENTS),
].sort(compareText));

if (SLICE06_EXPECTED_SCHEMA_PATHS.length !== 26 || Object.keys(SLICE06_RUNNER_SCHEMA_DOCUMENTS).length !== 10
    || Object.keys(SLICE06_MACHINE_SCHEMA_DOCUMENTS).length !== 13) {
  throw new Error("Slice 06 schema inventory must be 3 stable + 10 runner + 13 machine schemas");
}

class DefinitionBuilder {
  constructor() {
    this.files = new Map();
  }

  addBytes(relativePath, bytes, classification) {
    if (this.files.has(relativePath)) throw new Error(`duplicate Slice 06 output path: ${relativePath}`);
    const buffer = Buffer.from(bytes);
    this.files.set(relativePath, { bytes: buffer, classification });
    return { path: relativePath, byteLength: buffer.byteLength, fileSha256: sha256Slice06Definition(buffer) };
  }

  addJson(relativePath, value, classification) {
    return this.addBytes(relativePath, Buffer.from(stableStringifySlice06Definition(value), "utf8"), classification);
  }

  addRecord(relativePath, idField, value, classification) {
    const record = finalizeRecord(value);
    const file = this.addJson(relativePath, record, classification);
    return {
      record,
      ref: { path: relativePath, id: record[idField], contentHash: record.contentHash, byteLength: file.byteLength, fileSha256: file.fileSha256 },
    };
  }
}

async function readFileDescriptor(projectRoot, relativePath) {
  const bytes = await fs.readFile(path.join(projectRoot, ...relativePath.split("/")));
  return { path: relativePath, byteLength: bytes.byteLength, fileSha256: sha256Slice06Definition(bytes), bytes };
}

async function readExternalRecord(projectRoot, relativePath, idField, expectedId, expectedContentHash = undefined) {
  const descriptor = await readFileDescriptor(projectRoot, relativePath);
  const record = JSON.parse(descriptor.bytes.toString("utf8"));
  if (record[idField] !== expectedId || !/^[0-9a-f]{64}$/u.test(record.contentHash ?? "")
      || contentHashSlice06Definition(record) !== record.contentHash) {
    throw new Error(`external record identity/content hash mismatch: ${relativePath}`);
  }
  if (expectedContentHash !== undefined) assertLiteral(record.contentHash, expectedContentHash, `${relativePath}.contentHash`);
  return {
    record,
    ref: { path: relativePath, id: expectedId, contentHash: record.contentHash, byteLength: descriptor.byteLength, fileSha256: descriptor.fileSha256 },
  };
}

function implementationRef(identity, descriptor) {
  return { ...identity, path: descriptor.path, implementationSha256: descriptor.fileSha256 };
}

async function listTree(root, base = "") {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, ...base.split("/").filter(Boolean)), { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return { files: [], directories: [] };
    throw error;
  }
  const files = [];
  const directories = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      directories.push(relative);
      const child = await listTree(root, relative);
      files.push(...child.files);
      directories.push(...child.directories);
    } else if (entry.isFile()) {
      const descriptor = await readFileDescriptor(root, relative);
      files.push({ path: relative, byteLength: descriptor.byteLength, fileSha256: descriptor.fileSha256 });
    } else {
      throw new Error(`Slice 06 definition forbids symlink/non-file tree entry: ${relative}`);
    }
  }
  return { files, directories };
}

function digestMachineFiles(files) {
  const digest = createHash("sha256");
  for (const file of [...files].sort((left, right) => compareText(left.path, right.path))) {
    digest.update(Buffer.from(file.path, "utf8"));
    digest.update(NUL);
    digest.update(Buffer.from(String(file.byteLength), "ascii"));
    digest.update(NUL);
    digest.update(Buffer.from(file.fileSha256, "ascii"));
    digest.update(NUL);
  }
  return digest.digest("hex");
}

function treeDescriptor(files, directories = []) {
  return {
    algorithm: "sha256(sorted(relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))",
    fileCount: files.length,
    directoryCount: directories.length,
    totalBytes: files.reduce((sum, file) => sum + file.byteLength, 0),
    sha256: digestMachineFiles(files),
  };
}

async function describeSlice05Closure(projectRoot) {
  const slice05Root = path.join(projectRoot, "research/slice-05");
  const definition = await readExternalRecord(
    projectRoot,
    "research/slice-05/definition-index.v0.5.0.json",
    "definitionIndexId",
    "DEFINITION-INDEX-SLICE05@0.5.0",
    SLICE05_PINS.definitionContentHash,
  );
  assertLiteral(definition.ref.fileSha256, SLICE05_PINS.definitionFileSha256, "Slice 05 definition file SHA-256");
  assertLiteral(definition.ref.byteLength, SLICE05_PINS.definitionByteLength, "Slice 05 definition byte length");
  assertLiteral(definition.record.machineTree.sha256, SLICE05_PINS.descendantTreeSha256, "Slice 05 descendant tree");
  assertLiteral(definition.record.machineTree.fileCount, SLICE05_PINS.descendantFileCount, "Slice 05 descendant file count");

  const schemaFiles = definition.record.machineTree.files.filter(({ classification }) => classification === "schema")
    .map(({ path: relativePath, byteLength, fileSha256 }) => ({ path: relativePath, byteLength, fileSha256 }));
  assertLiteral(schemaFiles.length, SLICE05_PINS.schemaFileCount, "Slice 05 schema file count");
  assertLiteral(digestMachineFiles(schemaFiles), SLICE05_PINS.schemaTreeSha256, "Slice 05 schema tree");

  const definitionTree = await listTree(slice05Root);
  const definitionFiles = definitionTree.files.filter(({ path: relativePath }) => !relativePath.startsWith("results/"));
  const definitionDirectories = definitionTree.directories.filter((relativePath) => relativePath !== "results" && !relativePath.startsWith("results/"));
  assertLiteral(definitionFiles.length, SLICE05_PINS.fullDefinitionFileCount, "Slice 05 full definition file count");
  assertLiteral(definitionDirectories.length, SLICE05_PINS.fullDefinitionDirectoryCount, "Slice 05 full definition directory count");
  assertLiteral(digestMachineFiles(definitionFiles), SLICE05_PINS.fullDefinitionTreeSha256, "Slice 05 full definition tree");
  const slice05Readme = definitionFiles.find(({ path: relativePath }) => relativePath === "README.md");
  assertLiteral(slice05Readme.fileSha256, SLICE05_PINS.readmeSha256, "Slice 05 README SHA-256");
  assertLiteral(slice05Readme.byteLength, SLICE05_PINS.readmeByteLength, "Slice 05 README byte length");

  const resultRoot = path.join(slice05Root, "results/open-smoke");
  const results = await listTree(resultRoot);
  assertLiteral(results.files.length, SLICE05_PINS.resultFileCount, "Slice 05 result file count");
  assertLiteral(results.directories.length, SLICE05_PINS.resultDirectoryCount, "Slice 05 result directory count");
  assertLiteral(results.files.reduce((sum, file) => sum + file.byteLength, 0), SLICE05_PINS.resultTotalBytes, "Slice 05 result bytes");
  assertLiteral(digestMachineFiles(results.files), SLICE05_PINS.resultTreeSha256, "Slice 05 result tree");

  const ledgerDescriptor = await readFileDescriptor(projectRoot, "research/slice-05/results/open-smoke/ledger/events.ndjson");
  assertLiteral(ledgerDescriptor.fileSha256, SLICE05_PINS.ledgerFileSha256, "Slice 05 ledger SHA-256");
  const ledgerLines = ledgerDescriptor.bytes.toString("utf8").trimEnd().split("\n");
  assertLiteral(ledgerLines.length, SLICE05_PINS.ledgerEvents, "Slice 05 ledger event count");
  assertLiteral(JSON.parse(ledgerLines.at(-1)).contentHash, SLICE05_PINS.ledgerTailHash, "Slice 05 ledger tail");

  const [sourceMetadata, candidate, rights, runtime, normalizeContract, exportContract, normalizeSummary, exportSummary, normalizeDecision, exportDecision] = await Promise.all([
    readExternalRecord(projectRoot, "research/slice-04/candidate-locks/composite-sharp-win32-x64.v0.4.0.json", "candidateLockId", "REG-NORM-SHARP@0.4.0"),
    readExternalRecord(projectRoot, "research/slice-05/candidate-locks/composite-sharp-win32-x64.v0.5.0.json", "candidateLockId", "REG-NORM-SHARP@0.5.0"),
    readExternalRecord(projectRoot, "research/slice-05/rights/open-synthetic.v0.5.0.json", "rightsRecordId", "RIGHTS-OPEN-SYNTHETIC@0.5.0"),
    readExternalRecord(projectRoot, "research/slice-05/runtime/attestation.win32-x64.v0.5.0.json", "runtimeAttestationId", "RUNTIME-SHARP-WIN32-X64@0.5.0"),
    readExternalRecord(projectRoot, "research/slice-05/contracts/cc-cap02-normalize-png.v0.5.0.json", "contractId", "CC-CAP02-NORMALIZE-PNG@0.5.0"),
    readExternalRecord(projectRoot, "research/slice-05/contracts/cc-cap02-export-png.v0.5.0.json", "contractId", "CC-CAP02-EXPORT-PNG@0.5.0"),
    readExternalRecord(projectRoot, "research/slice-05/results/open-smoke/summaries/normalize.smoke-summary.slice05.v0.json", "summaryId", "smoke-summary.normalize.792c7f641d26a9d5", "4e03ecfcfc917bb5fc23ba50064f2876e75ce44c3a8a6e149b2d2e883d0652ec"),
    readExternalRecord(projectRoot, "research/slice-05/results/open-smoke/summaries/export.smoke-summary.slice05.v0.json", "summaryId", "smoke-summary.export.83450daf67bf38c9", "4d9f369f971e75ebf45e8c5b91d439503a9c212a365343dade7de49c19cfa6fd"),
    readExternalRecord(projectRoot, "research/slice-05/results/open-smoke/decisions/normalize.gate-b-decision.slice05.v0.json", "decisionId", "gate-b.normalize.4e03ecfcfc917bb5", "4f3c428ce3d9674054fe66e04dae8ec8a5157a666335d81694e570cd1f2a84e1"),
    readExternalRecord(projectRoot, "research/slice-05/results/open-smoke/decisions/export.gate-b-decision.slice05.v0.json", "decisionId", "gate-b.export.4d9f369f971e75eb", "583307cd0d3d97876b54eb3b4c0dd3cc14c40536d53d2d8e25604c8bc7faa0ba"),
  ]);
  for (const closure of [normalizeDecision.record, exportDecision.record]) {
    if (closure.decision !== "denied-not-entered" || closure.calibrationAuthorized !== false) throw new Error("Slice 05 Gate B closure changed");
  }
  return {
    definition, sourceMetadata, candidate, rights, runtime, normalizeContract, exportContract,
    normalizeSummary, exportSummary, normalizeDecision, exportDecision,
    definitionDescendantTree: treeDescriptor(definition.record.machineTree.files.map(({ path: relativePath, byteLength, fileSha256 }) => ({ path: relativePath, byteLength, fileSha256 }))),
    schemaTree: treeDescriptor(schemaFiles), fullDefinitionTree: treeDescriptor(definitionFiles, definitionDirectories),
    resultTree: treeDescriptor(results.files, results.directories),
    readme: { path: "research/slice-05/README.md", byteLength: slice05Readme.byteLength, fileSha256: slice05Readme.fileSha256 },
    ledger: { path: ledgerDescriptor.path, byteLength: ledgerDescriptor.byteLength, fileSha256: ledgerDescriptor.fileSha256 },
  };
}

function sourceWrapperPath(spec) {
  return `sources/${spec.operation}-diagnostic/${spec.sourceId}.json`;
}

async function loadSourceMaterial(projectRoot, spec, definitionRef) {
  const lineageOrdinal = spec.lineageId.split(".").at(-1);
  if (!/^\d{3}$/u.test(lineageOrdinal)) throw new Error(`invalid Slice 05 lineage ordinal: ${spec.lineageId}`);
  const sourcePath = `research/slice-05/sources/${spec.operation}-smoke/raw.s05.${spec.operation}.smoke.${lineageOrdinal}.json`;
  const sourceProvenance = await readExternalRecord(projectRoot, sourcePath, "sourceProvenanceId", `provenance.raw.s05.${spec.operation}.smoke.${lineageOrdinal}`);
  let inputArtifact = null;
  let facts;
  let assetPath;
  if (spec.operation === "normalize") {
    if (sourceProvenance.record.sourceId !== spec.lineageId) throw new Error(`normalize source lineage mismatch: ${spec.lineageId}`);
    const raw = sourceProvenance.record.rawAsset;
    assetPath = `research/slice-05/${raw.path}`;
    facts = {
      mime: raw.mime, byteLength: raw.byteLength, fileSha256: raw.fileSha256,
      decodedPixelSha256: raw.decodedPixelSha256 ?? raw.sourceDeclarationDecodedPixelSha256,
      width: raw.width, height: raw.height, alphaPresent: raw.alphaPresent,
    };
  } else {
    const artifactPath = `research/slice-05/artifacts/normalized-inputs/export-smoke/${spec.lineageId}.json`;
    inputArtifact = await readExternalRecord(projectRoot, artifactPath, "artifactId", spec.lineageId);
    const artifact = inputArtifact.record;
    assetPath = `research/slice-05/${artifact.bytes.relativePath}`;
    facts = {
      mime: artifact.bytes.mime, byteLength: artifact.bytes.byteLength, fileSha256: artifact.bytes.fileSha256,
      decodedPixelSha256: artifact.bytes.decodedPixelSha256, width: artifact.image.width, height: artifact.image.height, alphaPresent: artifact.image.alphaPresent,
    };
  }
  const asset = await readFileDescriptor(projectRoot, assetPath);
  assertLiteral(asset.byteLength, facts.byteLength, `${spec.lineageId} byte length`);
  assertLiteral(asset.fileSha256, facts.fileSha256, `${spec.lineageId} byte hash`);
  const goldId = spec.expectedDisposition === "applicable"
    ? `gold.${spec.operation === "normalize" ? spec.lineageId : spec.lineageId}`
    : null;
  const gold = goldId === null ? null : await readExternalRecord(
    projectRoot,
    `research/slice-05/gold/${spec.operation}-smoke/${goldId}.json`,
    "goldRecordId",
    goldId,
  );
  return { sourceProvenance, inputArtifact, facts, asset: { path: asset.path, byteLength: asset.byteLength, fileSha256: asset.fileSha256 }, gold, definitionRef };
}

function makeProfile(type) {
  return {
    type, mime: "image/png", maxBytes: 1048576, maxWidth: 256, maxHeight: 256,
    pixelLayout: "RGBA8", colorSpace: "embedded-sRGB", orientation: 1,
    alphaMode: "straight-unpremultiplied", metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only", interlace: "forbidden", animation: "forbidden",
  };
}

function shortHashRef(ref) {
  return { id: ref.id, contentHash: ref.contentHash };
}

function operationIdentity(operation) {
  return {
    runId: `run.diagnostic.s06.${operation}.v0.6.0`,
    sessionId: `session.diagnostic.s06.${operation}.v0.6.0`,
  };
}

function diagnosticStopRules() {
  return [
    ["S06_DEFINITION_DRIFT", "any definition, implementation, runtime, source, gold, schema, plan, preregistration, manifest or commit pin differs", "seal-and-version-bump"],
    ["S06_REGISTERED_DENOMINATOR_INVALID", "registered source or repetition denominator differs from four by three", "protocol-failed"],
    ["S06_PUBLICATION_RECONCILIATION_UNKNOWN", "durable closure publication cannot be reconciled", "inconclusive"],
    ["S06_WORKER_RECONCILIATION_UNKNOWN", "worker exit identity cannot be confirmed", "inconclusive"],
    ["S06_DIAGNOSTIC_CLOSURE_INVALID", "bytes, worker observation, oracle child codes or envelope closure is incomplete", "protocol-failed"],
    ["S06_EXECUTION_PROTOCOL_FAILED", "execution leaves the closed protocol", "protocol-failed"],
    ["S06_PREFLIGHT_FALSE_ALLOW", "a preflight sentinel reaches candidate execution", "protocol-failed"],
    ["S06_STOP_RULE_TRIGGERED", "one prior attempt activates the one-version stop rule", "inconclusive"],
  ].map(([code, condition, disposition]) => ({ code, condition, disposition }));
}

function classifyErrorCode(code) {
  if (code.includes("RETENTION")) return ["retention", "policy-marker"];
  if (code.startsWith("S06_ORACLE_PNG_")) return ["oracle-finding", "oracle-child"];
  if (code.startsWith("S06_INPUT_") || code.startsWith("S06_EXPORT_NORMALIZED_")) return ["preflight", code === "S06_INPUT_SRGB_REQUIRED" || code === "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID" ? "expected-sentinel" : "top-level"];
  if (code === "S06_STOP_RULE_TRIGGERED" || code.includes("RECONCILIATION_UNKNOWN")) return ["stop", "inconclusive"];
  if (code.startsWith("S06_WORKER_") || code.startsWith("S06_SHARP_")) return ["worker", "protocol-failure"];
  return ["protocol", code === "S06_OUTPUT_ORACLE_REJECTED" ? "top-level" : "protocol-failure"];
}

async function registeredErrorCodes(sourceDescriptors) {
  const codes = new Set();
  for (const key of ["adapter", "worker", "oracle", "runner"]) {
    const text = sourceDescriptors[key].bytes.toString("utf8");
    for (const match of text.matchAll(/S06_[A-Z0-9_]+/gu)) codes.add(match[0]);
  }
  return [...codes].sort(compareText).map((code) => {
    const [errorClass, terminalRole] = classifyErrorCode(code);
    return { code, class: errorClass, terminalRole };
  });
}

function protocolSchemaRefs(schemaFiles) {
  const byPath = new Map(schemaFiles.map((file) => [file.path, file]));
  const roles = [
    ["candidate-output-observation", "candidate-output-observation.slice06.v0", STABLE_PROTOCOL_SCHEMA_PATHS[0]],
    ["diagnostic-envelope", "diagnostic-envelope.slice06.v0", STABLE_PROTOCOL_SCHEMA_PATHS[1]],
    ["oracle-diagnostic", "oracle-diagnostic.slice06.v0", STABLE_PROTOCOL_SCHEMA_PATHS[2]],
  ];
  for (const [key, schemaPath] of Object.entries(SLICE06_RUNNER_SCHEMA_PATHS)) {
    roles.push([key, SLICE06_RUNNER_RECORD_SCHEMAS[key].properties?.schemaVersion?.const ?? path.posix.basename(schemaPath, ".schema.json"), schemaPath]);
  }
  return roles.map(([role, schemaVersion, schemaPath]) => {
    const file = byPath.get(schemaPath);
    if (!file) throw new Error(`missing Slice 06 protocol schema ref: ${schemaPath}`);
    return { role, schemaVersion, file };
  });
}

const RESULT_ALLOWLIST = Object.freeze([
  "runs/(normalize|export).registered-run.json",
  "requests/<sha256>.request.json",
  "claims/<sha256>.claim.json",
  "ledger/(normalize|export).ndjson",
  "records/<sha256>.result.json",
  "specimens/<operation>/<source>/r<1-3>/<five-role-closure>",
  "quarantine/<operation>/<source>/r<1-3>/<five-role-closure>",
  "failures/<operation>/<source>/r<1-3>/<three-role-closure>",
  "summaries/(normalize|export).diagnostic-summary.slice06.v0.json",
  "closes/(normalize|export).characterization-close.slice06.v0.json",
]);

const OWNED_PREFIXES = Object.freeze([
  "candidate-locks/", "contracts/", "errors/", "hardware/", "lineage/", "manifests/", "plans/",
  "preregistrations/", "retention/", "rights/", "runtime/", "schemas/", "sources/",
]);

async function assertNoResults(sliceRoot) {
  try {
    await fs.stat(path.join(sliceRoot, "results"));
    throw new Error("Slice 06 results already exist; definition regeneration is forbidden after characterization begins");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function prepareSafeRegeneration(sliceRoot, expectedPaths) {
  await assertNoResults(sliceRoot);
  const existing = await listTree(sliceRoot);
  const stale = existing.files.map(({ path: relativePath }) => relativePath)
    .filter((relativePath) => relativePath !== "README.md" && !expectedPaths.has(relativePath));
  const outside = stale.filter((relativePath) => relativePath !== SLICE06_DEFINITION_PATHS.definition
    && !OWNED_PREFIXES.some((prefix) => relativePath.startsWith(prefix)));
  if (outside.length > 0) throw new Error(`unregistered files outside generator-owned Slice 06 paths: ${outside.join(", ")}`);
  for (const relativePath of stale) {
    const target = path.resolve(sliceRoot, ...relativePath.split("/"));
    const relativeCheck = path.relative(sliceRoot, target);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`unsafe stale Slice 06 path: ${relativePath}`);
    await fs.unlink(target);
  }
  for (const relativePath of [...existing.directories].sort((left, right) => right.split("/").length - left.split("/").length)) {
    if (relativePath === "schemas") continue;
    try { await fs.rmdir(path.resolve(sliceRoot, ...relativePath.split("/"))); } catch (error) {
      if (!new Set(["ENOENT", "ENOTEMPTY", "EEXIST"]).has(error?.code)) throw error;
    }
  }
}

async function writeBuilderFiles(sliceRoot, builder) {
  const ordered = [...builder.files.entries()].sort(([left], [right]) => {
    if (left === SLICE06_DEFINITION_PATHS.definition) return 1;
    if (right === SLICE06_DEFINITION_PATHS.definition) return -1;
    return compareText(left, right);
  });
  for (const [relativePath, { bytes }] of ordered) {
    const destination = path.resolve(sliceRoot, ...relativePath.split("/"));
    const relativeCheck = path.relative(sliceRoot, destination);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`unsafe Slice 06 output path: ${relativePath}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  }
}

export async function generateSlice06({
  sliceRoot = DEFAULT_SLICE06_ROOT,
  projectRoot = PROJECT_ROOT,
  frozenAt,
  runtimeInventory = undefined,
} = {}) {
  const freeze = exactUtc(frozenAt);
  if (freeze !== SLICE06_FROZEN_AT) {
    throw new Error(`Slice 06 frozenAt is immutable and must equal ${SLICE06_FROZEN_AT}`);
  }
  const resolvedSliceRoot = path.resolve(sliceRoot);
  const resolvedProjectRoot = path.resolve(projectRoot);
  await assertNoResults(resolvedSliceRoot);
  const builder = new DefinitionBuilder();
  const proseReadme = await readFileDescriptor(resolvedSliceRoot, "README.md");

  for (const relativePath of STABLE_PROTOCOL_SCHEMA_PATHS) {
    const source = await readFileDescriptor(resolvedProjectRoot, `research/slice-06/${relativePath}`);
    const parsed = JSON.parse(source.bytes.toString("utf8"));
    assertLiteral(parsed.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relativePath)}`, `${relativePath} $id`);
    builder.addBytes(relativePath, source.bytes, "schema");
  }
  for (const [relativePath, schema] of Object.entries(SLICE06_GENERATED_SCHEMA_DOCUMENTS).sort(([left], [right]) => compareText(left, right))) {
    assertLiteral(schema.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${path.posix.basename(relativePath)}`, `${relativePath} $id`);
    builder.addJson(relativePath, schema, "schema");
  }
  const schemaFiles = [...builder.files.entries()].filter(([, { classification }]) => classification === "schema")
    .map(([relativePath, { bytes }]) => ({ path: relativePath, byteLength: bytes.byteLength, fileSha256: sha256Slice06Definition(bytes) }))
    .sort((left, right) => compareText(left.path, right.path));
  assertLiteral(schemaFiles.length, 26, "Slice 06 materialized schema count");
  const diagnosticProtocolSchemaRefs = protocolSchemaRefs(schemaFiles);

  const sourceDescriptors = {};
  for (const [key, relativePath] of Object.entries(SOURCE_CODE_PATHS)) sourceDescriptors[key] = await readFileDescriptor(resolvedProjectRoot, relativePath);
  const implementations = Object.fromEntries(Object.keys(SOURCE_CODE_PATHS).map((key) => [key, implementationRef(SLICE06_IMPLEMENTATION_IDENTITIES[key], sourceDescriptors[key])]));
  const implementationRefs = [
    { role: "candidate-adapter", ref: implementations.adapter },
    { role: "candidate-worker", ref: implementations.worker },
    { role: "independent-diagnostic-oracle", ref: implementations.oracle },
    { role: "local-diagnostic-runner", ref: implementations.runner },
    { role: "registered-diagnostic-driver", ref: implementations.driver },
    { role: "definition-generator", ref: implementations.generator },
    { role: "runtime-inventory-lineage", ref: implementations.inventory },
    { role: "regression-material-decoder", ref: implementations.regressionDecoder },
  ];

  const closure = await describeSlice05Closure(resolvedProjectRoot);
  const scopeContract = await readFileDescriptor(resolvedProjectRoot, "research/SLICE_06_CONTRACT.md");
  const closureRecord = builder.addRecord(
    SLICE06_DEFINITION_PATHS.closureLineage,
    "closureLineageId",
    {
      schemaVersion: "closure-lineage.slice06.v0", closureLineageId: SLICE06_DEFINITION_IDS.closureLineage,
      recordVersion: VERSION, commitPins: { ...SLICE06_COMMIT_PINS }, sourceCandidateMetadataRef: closure.sourceMetadata.ref,
      slice05CandidateRef: closure.candidate.ref, slice05RightsRef: closure.rights.ref,
      slice05Definition: {
        definitionRef: closure.definition.ref, descendantMachineTree: closure.definitionDescendantTree,
        schemaTree: closure.schemaTree, fullDefinitionTree: closure.fullDefinitionTree, proseReadme: closure.readme,
      },
      slice05ResultClosure: {
        resultRoot: "research/slice-05/results/open-smoke", resultTree: closure.resultTree,
        ledger: { file: closure.ledger, eventCount: SLICE05_PINS.ledgerEvents, tailContentHash: SLICE05_PINS.ledgerTailHash },
        operations: [
          { operation: "normalize", summaryRef: closure.normalizeSummary.ref, decisionRef: closure.normalizeDecision.ref, decision: "denied-not-entered", calibrationAuthorized: false, historicalOracleChildSubtype: "unknown" },
          { operation: "export", summaryRef: closure.exportSummary.ref, decisionRef: closure.exportDecision.ref, decision: "denied-not-entered", calibrationAuthorized: false, historicalOracleChildSubtype: "unknown" },
        ],
      },
      immutableFacts: { state: "smoke-closed-non-pass", gateB: "denied-not-entered", calibrationAuthorized: false, publishedArtifactCount: 0, historicalRequestsMayBeRerun: false, historicalRecordsMayBeRewritten: false },
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "closure-lineage",
  );

  const inventory = runtimeInventory ?? await inventorySharpRuntimeSlice05({ projectRoot: resolvedProjectRoot });
  if (inventory.runtimeCandidateId !== "REG-NORM-SHARP@0.5.0" || inventory.executionBoundary.candidatePipelineInvoked !== false
      || inventory.executionBoundary.imageBytesRead !== false || inventory.privacyBoundary.hostnameRecorded !== false
      || inventory.privacyBoundary.serialRecorded !== false) throw new Error("fresh runtime inventory violates the no-image/privacy boundary");
  const runtime = builder.addRecord(
    SLICE06_DEFINITION_PATHS.runtime,
    "runtimeAttestationId",
    {
      schemaVersion: "runtime-attestation.slice06.v0", runtimeAttestationId: SLICE06_DEFINITION_IDS.runtime,
      recordVersion: VERSION, observedCandidateId: SLICE06_DEFINITION_IDS.candidate, closureLineageRef: closureRecord.ref,
      sourceSlice05RuntimeRef: closure.runtime.ref, inventoryImplementationRef: implementations.inventory,
      inventoryPayloadSha256: inventory.attestation.payloadSha256,
      packageManifest: {
        path: inventory.packageManifest.path, sha256: inventory.packageManifest.sha256,
        exactDevDependencies: Object.entries(inventory.packageManifest.devDependencies).sort(([left], [right]) => compareText(left, right)).map(([name, version]) => ({ name, version })),
      },
      packageLock: { path: inventory.packageLock.path, sha256: inventory.packageLock.sha256, expectedSha256: inventory.packageLock.expectedSha256, lockfileVersion: inventory.packageLock.lockfileVersion },
      installedClosure: {
        allowlist: inventory.installed.allowlist, packages: inventory.installed.packages,
        ignoredEmptyScopeDirectories: inventory.installed.ignoredEmptyScopeDirectories,
        fileCount: inventory.installed.tree.fileCount, treeSha256: inventory.installed.tree.sha256,
        nativeArtifacts: inventory.installed.nativeArtifacts,
      },
      versions: {
        installedVersionsJsonSha256: inventory.versions.installedVersionsJson.sha256,
        installedComponentCount: inventory.versions.installedVersionsJson.componentCount,
        sharpRuntimeComponentCount: inventory.versions.sharpRuntime.componentCount,
        sharpVersion: inventory.versions.sharpRuntime.values.sharp,
        matchesInstalledVersionsJson: inventory.versions.sharpRuntime.matchesInstalledVersionsJson,
        packagingMetadataDifferenceCount: inventory.versions.slice04PackagingMetadataComparison.differenceCount,
      },
      expectedWorkerRuntime: {
        sharpVersion: inventory.versions.sharpRuntime.values.sharp,
        nativeVersions: inventory.versions.sharpRuntime.values,
        nodeVersion: inventory.environment.node.version,
        platform: inventory.environment.os.platform,
        architecture: inventory.environment.os.architecture,
        settings: {
          concurrency: 1, cacheMemoryMaxMiB: 0, cacheFilesMax: 0, cacheItemsMax: 0,
          simd: false, uvThreadpoolSize: "1", vipsConcurrency: "1", ignoreGlobalLibvips: "1",
        },
      },
      environment: inventory.environment,
      observationBoundary: { freshInventoryRequired: true, sourceSlice05RuntimeRecordReusedAsObservation: false, inventoryHelperReusedReadOnly: true },
      executionBoundary: { sharpImportedForVersionsOnly: inventory.versions.sharpRuntime.importPerformed, imageBytesRead: false, imageDecoded: false, imageEncoded: false, candidatePipelineInvoked: false, hostnameRecorded: false, serialRecorded: false },
      recordedAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "runtime-attestation",
  );
  const hardware = builder.addRecord(
    SLICE06_DEFINITION_PATHS.hardware,
    "hardwareProfileId",
    {
      schemaVersion: "hardware-observation.slice06.v0", hardwareProfileId: SLICE06_DEFINITION_IDS.hardware,
      recordVersion: VERSION, runtimeAttestationRef: runtime.ref, environment: inventory.environment,
      privacyBoundary: { hostnameRecorded: false, serialRecorded: false },
      stateAtDefinitionFreeze: "freshly-observed-and-pinned-not-a-portability-claim", observedAt: freeze,
      evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "hardware-observation",
  );

  const rightsResolved = builder.addRecord(
    SLICE06_DEFINITION_PATHS.rights,
    "rightsRecordId",
    {
      schemaVersion: "rights-record.slice06.v0", rightsRecordId: SLICE06_DEFINITION_IDS.rights, recordVersion: VERSION,
      sourceSlice05RightsRef: closure.rights.ref, assetClass: "project-original-deterministic-synthetic-open-research-fixtures",
      reuseClass: "read-only-reference-to-committed-slice05-public-synthetic-lineage", independenceClaim: false,
      provenance: { containsRealPerson: false, realUserPhotosUsed: false, thirdPartyAssetsUsed: false, modelWeightsUsed: false, copiedImageBytes: false, regressionLineageOnly: true },
      permissions: { repositoryReference: true, candidateDerivativeRepositoryRetention: true, diagnosticPublicDisplay: true, artifactPublication: false, productUseClaim: false, permissionBasis: "project-original-authorship-carried-by-pinned-slice05-rights" },
      oracleRightsValues: {
        assetClass: "project-original-deterministic-synthetic-open-research-fixtures",
        containsRealPerson: false, realUserPhotosUsed: false, thirdPartyAssetsUsed: false, modelWeightsUsed: false,
        candidateDerivativeRepositoryRetention: true, diagnosticPublicDisplay: true,
      },
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "rights-record",
  );

  const retentionResolved = builder.addRecord(
    SLICE06_DEFINITION_PATHS.retention,
    "retentionPolicyId",
    {
      schemaVersion: "retention-policy.slice06.v0", retentionPolicyId: SLICE06_DEFINITION_IDS.retention,
      recordVersion: VERSION, mode: "open-diagnostic", rightsRef: rightsResolved.ref,
      maxPerOutputBytes: SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes, maxSessionBytes: SLICE06_DIAGNOSTIC_LIMITS.maxSessionBytes,
      retainedValues: { state: "retained", reasonCode: "S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC", maxPerOutputBytes: SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes, maxSessionBytes: SLICE06_DIAGNOSTIC_LIMITS.maxSessionBytes },
      hashOnlyValues: { state: "hash-only", reasonCode: "S06_DIAGNOSTIC_RETENTION_HASH_ONLY", maxPerOutputBytes: SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes, maxSessionBytes: SLICE06_DIAGNOSTIC_LIMITS.maxSessionBytes },
      disposition: { oraclePass: "specimens-nonartifact", oracleNonPass: "quarantine-nonartifact", preflightReject: "no-candidate-output", overLimit: "hash-only-nonartifact", artifactsDirectoryAllowed: false, catalogPublicationAllowed: false, productDownloadAllowed: false },
      cleanup: { stagingMustBeRemovedOrReconciled: true, unreferencedBytesAllowed: false, fullResultTreeInventoryRequired: true },
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "retention-policy",
  );

  const candidate = builder.addRecord(
    SLICE06_DEFINITION_PATHS.candidate,
    "candidateLockId",
    {
      schemaVersion: "candidate-lock.slice06.v0", candidateLockId: SLICE06_DEFINITION_IDS.candidate,
      recordVersion: VERSION, candidateKind: "installed-sharp-win32-x64-runtime-closure-diagnostic-only",
      selectionStatus: "diagnostic-only-not-selected", closureLineageRef: closureRecord.ref,
      sourceCandidateMetadataRef: closure.sourceMetadata.ref, closedSlice05CandidateRef: closure.candidate.ref,
      runtimeAttestationRef: runtime.ref, hardwareRef: hardware.ref,
      implementationRefs: implementationRefs.filter(({ role }) => !new Set(["registered-diagnostic-driver", "definition-generator"]).has(role)),
      runtimeClosure: { packageLockSha256: inventory.packageLock.sha256, installedTreeSha256: inventory.installed.tree.sha256, nativeArtifactCount: inventory.installed.nativeArtifacts.length, installedVersionCount: inventory.versions.installedVersionsJson.componentCount },
      stateAtDefinitionFreeze: { installation: "installed-and-freshly-inventoried", execution: "candidate-pixel-pipeline-not-run-by-definition", gateB: "not-entered-diagnostic-only", calibration: "not-created-by-scope" },
      prohibitedClaims: ["product-capability", "formal-c1", "gate-b-pass", "holdout-evidence", "release-support"],
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "candidate-lock",
  );

  const artifactSchemaPaths = {
    normalized: "research/slice-05/schemas/normalized-image.slice04.v0.schema.json",
    delivery: "research/slice-05/schemas/delivery-artifact.slice04.v0.schema.json",
  };
  const artifactSchemaFiles = Object.fromEntries(await Promise.all(Object.entries(artifactSchemaPaths).map(async ([key, relativePath]) => [key, await readFileDescriptor(resolvedProjectRoot, relativePath)])));
  const artifactSchemaRefs = Object.fromEntries(Object.entries(artifactSchemaFiles).map(([key, descriptor]) => [key, {
    path: descriptor.path, byteLength: descriptor.byteLength, fileSha256: descriptor.fileSha256,
  }]));
  function makeContract(operation) {
    const normalize = operation === "normalize";
    return {
      schemaVersion: "capability-contract.slice06.v0",
      contractId: normalize ? SLICE06_DEFINITION_IDS.normalizeContract : SLICE06_DEFINITION_IDS.exportContract,
      recordVersion: VERSION, capabilityId: "CAP-02", suiteId: "NORMALIZE-DELIVER", operation,
      sourceSlice05ContractRef: normalize ? closure.normalizeContract.ref : closure.exportContract.ref,
      closureLineageRef: closureRecord.ref, candidateRef: candidate.ref, runtimeAttestationRef: runtime.ref,
      artifactSchemaRefs: normalize
        ? [{ role: "output-normalized-image", schemaVersion: "normalized-image.slice04.v0", file: artifactSchemaRefs.normalized }]
        : [
            { role: "input-normalized-image", schemaVersion: "normalized-image.slice04.v0", file: artifactSchemaRefs.normalized },
            { role: "output-delivery-artifact", schemaVersion: "delivery-artifact.slice04.v0", file: artifactSchemaRefs.delivery },
          ],
      diagnosticProtocolSchemaRefs,
      inputProfile: makeProfile(normalize ? "canonical-png-source-bytes" : "NormalizedImage.slice04.v0"),
      outputProfile: makeProfile(normalize ? "NormalizedImage.slice04.v0" : "DeliveryArtifact.slice04.v0"),
      implementation: { state: "definition-frozen-diagnostic-only-not-run", adapterRef: implementations.adapter, workerRef: implementations.worker, independentOracleRef: implementations.oracle, isolatedWorkerRequired: true, independentReopenRequired: true, passthroughAllowed: false, fallbackAllowed: false, atomicDiagnosticClosureRequired: true, imagePipelineExecutedByDefinitionGenerator: false },
      diagnosticPersistence: { candidateOutputBytesRequiredWhenWithinLimit: true, workerObservationRequired: true, exactOracleChildCodesRequired: true, diagnosticEnvelopeRequired: true, artifactPublicationAllowed: false },
      failureSemantics: { failClosed: true, stableErrorCodeRequired: true, validOutcomeRerunAllowed: false, replacementAttempts: 0, unknownIsProtocolFailureOrInconclusive: true },
      gateBStateAtDefinitionFreeze: "not-entered-diagnostic-only", calibrationStateAtDefinitionFreeze: "not-created-by-scope",
      formalHoldoutStatusAtDefinitionFreeze: "not-created", formalDefectHoldoutStatusAtDefinitionFreeze: "not-created", formalEscapeStatusAtDefinitionFreeze: "not-created",
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    };
  }
  const normalizeContract = builder.addRecord(SLICE06_DEFINITION_PATHS.normalizeContract, "contractId", makeContract("normalize"), "capability-contract");
  const exportContract = builder.addRecord(SLICE06_DEFINITION_PATHS.exportContract, "contractId", makeContract("export"), "capability-contract");

  const registeredCodes = await registeredErrorCodes(sourceDescriptors);
  const errorRegistry = builder.addRecord(
    SLICE06_DEFINITION_PATHS.errorRegistry,
    "errorRegistryId",
    {
      schemaVersion: "error-registry.slice06.v0", errorRegistryId: SLICE06_DEFINITION_IDS.errorRegistry,
      recordVersion: VERSION, sourceImplementationRefs: [implementations.adapter, implementations.worker, implementations.oracle, implementations.runner],
      registeredCodes,
      frozenPrecedence: {
        normalizeMissingSrgb: "S06_INPUT_SRGB_REQUIRED-before-generic-idat-or-chunk-profile-rejection",
        exportInvalidArtifactVersion: "S06_EXPORT_NORMALIZED_ARTIFACT_INVALID-before-worker-invocation",
        outputOracleTopLevel: "S06_OUTPUT_ORACLE_REJECTED-with-exact-child-codes-required",
        oracleFindingOrder: [...SLICE06_FINDING_PRECEDENCE],
      },
      unknownCodeTreatment: "protocol-failed-or-inconclusive-never-pass", frozenAt: freeze,
      evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "error-registry",
  );

  const sourceWrappers = [];
  for (const spec of SLICE06_SOURCE_SPECS) {
    const material = await loadSourceMaterial(resolvedProjectRoot, spec, closure.definition.ref);
    const sourceLineageId = `lineage.${spec.sourceId}`;
    const wrapper = builder.addRecord(
      sourceWrapperPath(spec),
      "sourceLineageId",
      {
        schemaVersion: "fixture-lineage.slice06.v0", sourceLineageId, recordVersion: VERSION,
        sourceId: spec.sourceId, sourceFamilyId: `family.s06.${spec.operation}.diagnostic.${String(spec.ordinal).padStart(3, "0")}`,
        captureSessionId: `capture.s06.${spec.operation}.diagnostic.${String(spec.ordinal).padStart(3, "0")}`,
        operation: spec.operation, partition: "diagnostic", diagnosticRole: spec.diagnosticRole,
        expectedDisposition: spec.expectedDisposition, expectedStableErrorCode: spec.expectedStableErrorCode,
        repetitions: 3, attemptNumber: 1, independenceClaim: false, newIndependentSource: false,
        regressionLineageRef: { slice: "05", sourceId: spec.lineageId, definitionRef: closure.definition.ref },
        sourceProvenanceRef: material.sourceProvenance.ref, inputArtifactRef: material.inputArtifact?.ref ?? null,
        byteAssetRef: material.asset, inputFacts: material.facts, goldRef: material.gold?.ref ?? null,
        rightsRef: rightsResolved.ref, retentionPolicyRef: retentionResolved.ref,
        reuseBoundary: { sourceBytesCopied: false, sourceRecordRewritten: false, countsAsNewSource: false, calibrationEligible: false, holdoutEligible: false, c1Eligible: false },
        frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
      },
      "fixture-lineage",
    );
    sourceWrappers.push({ spec, ...wrapper });
  }
  if (new Set(sourceWrappers.flatMap(({ record }) => [record.sourceId, record.sourceFamilyId, record.captureSessionId])).size !== 24) {
    throw new Error("Slice 06 source/family/capture-session identities must all be new and unique");
  }

  const planImplementationRefs = implementationRefs.filter(({ role }) => new Set([
    "candidate-adapter", "candidate-worker", "independent-diagnostic-oracle", "local-diagnostic-runner",
    "registered-diagnostic-driver", "regression-material-decoder",
  ]).has(role));
  const byOperation = Object.fromEntries(["normalize", "export"].map((operation) => [operation, sourceWrappers.filter(({ spec }) => spec.operation === operation)]));
  function casesFor(operation) {
    return byOperation[operation].map(({ spec, ref }) => ({
      sourceId: spec.sourceId, sourceLineageRef: ref, diagnosticRole: spec.diagnosticRole,
      expectedDisposition: spec.expectedDisposition, expectedStableErrorCode: spec.expectedStableErrorCode,
      repetitions: 3, attemptNumber: 1,
    }));
  }
  function makePlan(operation) {
    return {
      schemaVersion: "diagnostic-plan.slice06.v0", diagnosticPlanId: operation === "normalize" ? SLICE06_DEFINITION_IDS.normalizePlan : SLICE06_DEFINITION_IDS.exportPlan,
      recordVersion: VERSION, mode: "open-diagnostic", operation, candidateRef: candidate.ref,
      contractRef: operation === "normalize" ? normalizeContract.ref : exportContract.ref,
      closureLineageRef: closureRecord.ref, runtimeAttestationRef: runtime.ref, hardwareRef: hardware.ref,
      rightsRef: rightsResolved.ref, retentionPolicyRef: retentionResolved.ref, errorRegistryRef: errorRegistry.ref,
      implementationRefs: planImplementationRefs, resultProtocolSchemaRefs: diagnosticProtocolSchemaRefs,
      denominator: { sourceUnits: 4, applicableSources: 3, preflightSentinels: 1, repetitionsPerSource: 3, attempts: 12, replacementAttempts: 0 },
      cases: casesFor(operation), repetitionRule: { majorityVoteAllowed: false, allThreeTerminalRequired: true, validOutcomeRerunAllowed: false, missingOrUnknownRequiresStop: true },
      stopRules: diagnosticStopRules(), outcomeBoundary: { characterizationMaySelectFutureCandidateDiscussion: true, candidateConformancePass: false, gateBDecisionAuthority: false, calibrationAuthorized: false },
      resultsStateAtDefinitionFreeze: "not-created", frozenAt: freeze,
      evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    };
  }
  const normalizePlan = builder.addRecord(SLICE06_DEFINITION_PATHS.normalizePlan, "diagnosticPlanId", makePlan("normalize"), "diagnostic-plan");
  const exportPlan = builder.addRecord(SLICE06_DEFINITION_PATHS.exportPlan, "diagnosticPlanId", makePlan("export"), "diagnostic-plan");
  function makePreregistration(operation) {
    return {
      schemaVersion: "diagnostic-preregistration.slice06.v0",
      preregistrationId: operation === "normalize" ? SLICE06_DEFINITION_IDS.normalizePreregistration : SLICE06_DEFINITION_IDS.exportPreregistration,
      recordVersion: VERSION, mode: "open-diagnostic", operation, stateAtDefinitionFreeze: "preregistered-diagnostic-results-zero",
      runIdentity: { ...operationIdentity(operation), invocationLimit: 1 }, candidateRef: candidate.ref,
      contractRef: operation === "normalize" ? normalizeContract.ref : exportContract.ref,
      diagnosticPlanRef: operation === "normalize" ? normalizePlan.ref : exportPlan.ref,
      runtimeAttestationRef: runtime.ref, hardwareRef: hardware.ref, rightsRef: rightsResolved.ref,
      retentionPolicyRef: retentionResolved.ref, errorRegistryRef: errorRegistry.ref,
      sourceLineageRefs: byOperation[operation].map(({ ref }) => ref), implementationRefs: planImplementationRefs,
      denominator: { sourceUnits: 4, attempts: 12, repetitionsPerSource: 3, replacementAttempts: 0 },
      requestIdentityRule: "new-slice06-source-run-session-request-and-idempotency-identities-only",
      outcomeRule: "all-twelve-attempts-terminal-with-complete-byte-worker-oracle-ledger-and-tree-closure-or-close-protocol-failed-or-inconclusive",
      rerunRule: "no-valid-outcome-rerun-no-replacement-no-majority-vote",
      formalBoundary: { holdout: "not-created", defectHoldout: "not-created", escape: "not-created", formalRunsAllowed: false, c1Denominator: 0 },
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    };
  }
  const normalizePrereg = builder.addRecord(SLICE06_DEFINITION_PATHS.normalizePreregistration, "preregistrationId", makePreregistration("normalize"), "diagnostic-preregistration");
  const exportPrereg = builder.addRecord(SLICE06_DEFINITION_PATHS.exportPreregistration, "preregistrationId", makePreregistration("export"), "diagnostic-preregistration");
  function makeManifest(operation) {
    return {
      schemaVersion: "diagnostic-manifest.slice06.v0", manifestId: operation === "normalize" ? SLICE06_DEFINITION_IDS.normalizeManifest : SLICE06_DEFINITION_IDS.exportManifest,
      manifestVersion: VERSION, manifestKind: "open-diagnostic-characterization", mode: "open-diagnostic", operation,
      stateAtDefinitionFreeze: "frozen-results-zero-not-run", runIdentity: operationIdentity(operation),
      candidateRef: candidate.ref, contractRef: operation === "normalize" ? normalizeContract.ref : exportContract.ref,
      diagnosticPlanRef: operation === "normalize" ? normalizePlan.ref : exportPlan.ref,
      preregistrationRef: operation === "normalize" ? normalizePrereg.ref : exportPrereg.ref,
      runtimeAttestationRef: runtime.ref, hardwareRef: hardware.ref, rightsRef: rightsResolved.ref,
      retentionPolicyRef: retentionResolved.ref, errorRegistryRef: errorRegistry.ref,
      counts: { totalSources: 4, applicableSources: 3, preflightSentinels: 1, repetitionsPerSource: 3, totalPlannedAttempts: 12, replacementAttempts: 0 },
      entries: casesFor(operation), isolation: { newSlice06SourceFamilyAndCaptureSessionIds: true, operationSpecificRunAndSessionIds: true, reusedSlice05BytesAreLineageOnly: true, independenceClaim: false, crossOperationAggregationAllowed: false },
      outputBoundary: { retainedOnlyAsDiagnosticSpecimenOrQuarantine: true, artifactPublicationAllowed: false, workerObservationAndExactOracleChildCodesRequired: true },
      frozenAt: freeze, evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    };
  }
  const normalizeManifest = builder.addRecord(SLICE06_DEFINITION_PATHS.normalizeManifest, "manifestId", makeManifest("normalize"), "diagnostic-manifest");
  const exportManifest = builder.addRecord(SLICE06_DEFINITION_PATHS.exportManifest, "manifestId", makeManifest("export"), "diagnostic-manifest");

  const descendants = [...builder.files.entries()].map(([relativePath, { bytes, classification }]) => ({
    path: relativePath, classification, byteLength: bytes.byteLength, fileSha256: sha256Slice06Definition(bytes),
  })).sort((left, right) => compareText(left.path, right.path));
  const machineRecordCount = descendants.filter(({ classification }) => classification !== "schema").length;
  assertLiteral(descendants.length, 49, "Slice 06 descendant file count");
  assertLiteral(machineRecordCount, 23, "Slice 06 machine record count excluding index");
  const descendantTreeSha256 = digestMachineFiles(descendants);
  const index = builder.addRecord(
    SLICE06_DEFINITION_PATHS.definition,
    "definitionIndexId",
    {
      schemaVersion: "definition-index.slice06.v0", definitionIndexId: SLICE06_DEFINITION_IDS.definition,
      recordVersion: VERSION, definitionState: "frozen-definition-results-zero-diagnostic-only", frozenAt: freeze,
      scopeContractRef: { path: scopeContract.path, byteLength: scopeContract.byteLength, fileSha256: scopeContract.fileSha256 },
      closureLineageRef: closureRecord.ref, runtimeAttestationRef: runtime.ref, hardwareRef: hardware.ref, candidateRef: candidate.ref,
      contractRefs: [{ operation: "normalize", ref: normalizeContract.ref }, { operation: "export", ref: exportContract.ref }],
      diagnosticPlanRefs: [{ operation: "normalize", ref: normalizePlan.ref }, { operation: "export", ref: exportPlan.ref }],
      preregistrationRefs: [{ operation: "normalize", ref: normalizePrereg.ref }, { operation: "export", ref: exportPrereg.ref }],
      manifestRefs: [{ operation: "normalize", ref: normalizeManifest.ref }, { operation: "export", ref: exportManifest.ref }],
      sourceLineageRefs: sourceWrappers.map(({ spec, ref }) => ({ operation: spec.operation, ref })),
      rightsRef: rightsResolved.ref, retentionPolicyRef: retentionResolved.ref, errorRegistryRef: errorRegistry.ref,
      implementationRefs, resultProtocolSchemaRefs: diagnosticProtocolSchemaRefs,
      resultProtocol: {
        canonicalResultsRoot: SLICE06_RESULT_ROOT,
        maximumDriverInvocations: 1,
        plannedRegisteredOperationRuns: 2,
        plannedSourceUnits: 8,
        plannedAttempts: 24,
        replacementAttempts: 0,
        globalStop: {
          operationOrder: ["normalize", "export"],
          secondOperationRegistrationRequiresFirstStatus: "characterization-complete",
          firstOperationBlockingStatuses: ["protocol-failed", "inconclusive"],
          actualCountsRecordedOnlyByDriverAfterExecution: true,
        },
        resultAllowlist: [...RESULT_ALLOWLIST],
      },
      proseReadmeRef: { path: "README.md", byteLength: proseReadme.byteLength, fileSha256: proseReadme.fileSha256 },
      initialResultStateAtDefinitionFreeze: { resultsDirectoryPresent: false, resultFilesPresent: 0, ledgersPresent: 0, summariesPresent: 0, closeRecordsPresent: 0, specimensPresent: 0, quarantinePresent: 0 },
      executionAdmission: { definitionFrozen: true, resultsZero: true, containingGitCommitMustBePushedBeforeRun: true, containingCommitRecordedInDefinition: false, driverMustVerifyHeadAndOrigin: true, registeredInvocationPerOperation: 1 },
      machineTree: { algorithm: "sha256(sorted(slice-root-relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))", rootSelfExcludedToAvoidCircularHash: true, proseReadmeExcludedAndSeparatelyPinned: true, fileCount: descendants.length, sha256: descendantTreeSha256, files: descendants },
      counts: { schemas: 26, machineRecordsExcludingIndex: 23, manifests: 2, sourceLineageRecords: 8, sourceUnits: 8, plannedAttempts: 24, copiedImageBytes: 0, generatedResults: 0, formalFixtures: 0, holdoutFixtures: 0, defectHoldoutFixtures: 0, escapeFixtures: 0 },
      evidenceBoundary: structuredClone(SLICE06_EVIDENCE_BOUNDARY), contentHash: "",
    },
    "definition-index",
  );

  const expectedPaths = new Set(builder.files.keys());
  await prepareSafeRegeneration(resolvedSliceRoot, expectedPaths);
  await writeBuilderFiles(resolvedSliceRoot, builder);
  return {
    sliceRoot: resolvedSliceRoot, frozenAt: freeze,
    definitionIndexContentHash: index.record.contentHash, definitionIndexFileSha256: index.ref.fileSha256,
    proseReadmeSha256: proseReadme.fileSha256, descendantTreeSha256,
    descendantFileCount: descendants.length, fullMachineFileCount: descendants.length + 1,
    schemaCount: 26, machineRecordCountExcludingIndex: 23, manifestCount: 2,
    sourceLineageCount: 8, sourceUnitCount: 8, plannedAttemptCount: 24,
    copiedImageByteCount: 0, resultCount: 0,
  };
}

async function main() {
  const freezeArg = process.argv.find((argument) => argument.startsWith("--frozen-at="));
  if (!freezeArg) throw new Error("--frozen-at=<exact-millisecond-UTC> is required; the generator has no default formal freeze time");
  const result = await generateSlice06({ frozenAt: freezeArg.slice("--frozen-at=".length) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await main();
