import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

import { inventorySharpRuntimeSlice05 } from "./research-inventory-sharp-slice05.mjs";
import {
  SLICE05_RUNNER_RECORD_SCHEMAS,
  SLICE05_RUNNER_SCHEMA_PATHS,
} from "./research-run-slice05.mjs";
import {
  decodeIndependentPngSlice05,
  validateGoldRecordSlice05,
  validateNormalizedImageSlice05,
} from "./research-independent-png-oracle-slice05.mjs";
import { validateNormalizedArtifactSlice05 } from "./research-sharp-adapter-slice05.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

export const DEFAULT_SLICE05_ROOT = path.resolve(PROJECT_ROOT, "research/slice-05");
export const SLICE05_GENERATOR_VERSION = "slice05-definition-generator.v0.5.0";
export const SLICE05_FROZEN_AT = "2026-08-15T04:23:38.389Z";

const VERSION = "0.5.0";
const CANDIDATE_ID = "REG-NORM-SHARP@0.5.0";
const RUNTIME_ID = "RUNTIME-SHARP-WIN32-X64@0.5.0";
const HARDWARE_ID = "HARDWARE-WIN32-X64@0.5.0";
const RIGHTS_ID = "RIGHTS-OPEN-SYNTHETIC@0.5.0";
const NORMALIZE_CONTRACT_ID = "CC-CAP02-NORMALIZE-PNG@0.5.0";
const EXPORT_CONTRACT_ID = "CC-CAP02-EXPORT-PNG@0.5.0";
const GATE_B_PLAN_ID = "GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0";
const GENERATOR_ID = "GEN-INDEPENDENT-OPEN-PNG@0.5.0";
const ADAPTER_ID = "ADAPTER-SHARP-NORMALIZE-EXPORT@0.5.0";
const WORKER_ID = "WORKER-SHARP-ISOLATED@0.5.0";
const INVENTORY_ID = "INVENTORY-SHARP-RUNTIME@0.5.0";
const ORACLE_ID = "ORACLE-INDEPENDENT-PNG@0.5.0";
const RUNNER_ID = "RUNNER-LOCAL-OPEN@0.5.0";
const FAULT_WORKER_ID = "WORKER-FAULT-SEMANTICS@0.5.0";
const MAX_BYTES = 1024 * 1024;
const NUL = Buffer.from([0]);
const OWNED_DEFINITION_PREFIXES = Object.freeze([
  "artifacts/",
  "assets/open/",
  "candidate-locks/",
  "contracts/",
  "gold/",
  "hardware/",
  "manifests/",
  "plans/",
  "preregistrations/",
  "rights/",
  "runtime/",
  "schemas/",
  "sources/",
]);

const STABLE_SCHEMA_PATHS = Object.freeze([
  "schemas/delivery-artifact.slice04.v0.schema.json",
  "schemas/gold-record.slice05.v0.schema.json",
  "schemas/normalized-image.slice04.v0.schema.json",
  "schemas/oracle-result.slice05.v0.schema.json",
]);

const SOURCE_CODE_PATHS = Object.freeze({
  adapter: "scripts/research-sharp-adapter-slice05.mjs",
  worker: "scripts/research-sharp-worker-slice05.mjs",
  oracle: "scripts/research-independent-png-oracle-slice05.mjs",
  inventory: "scripts/research-inventory-sharp-slice05.mjs",
  generator: "scripts/research-generate-slice05.mjs",
  runner: "scripts/research-run-slice05.mjs",
  faultWorker: "scripts/research-slice05-fault-worker.mjs",
});

const SLICE04_PATHS = Object.freeze({
  candidate: "research/slice-04/candidate-locks/composite-sharp-win32-x64.v0.4.0.json",
  normalizeContract: "research/slice-04/contracts/cc-cap02-normalize-png.v0.4.0.json",
  exportContract: "research/slice-04/contracts/cc-cap02-export-png.v0.4.0.json",
  normalizePlan: "research/slice-04/preregistrations/partition-plan.normalize-png.v0.4.0.json",
  exportPlan: "research/slice-04/preregistrations/partition-plan.export-png.v0.4.0.json",
});

const OPTIONAL_RESULT_PATH_PROTOCOL = Object.freeze({
  runRequest: {
    pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/requests/[0-9a-f]{64}\\.request\\.json$",
    storageFormat: "canonical-json",
  },
  runClaim: {
    pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/claims/[0-9a-f]{64}\\.claim\\.json$",
    storageFormat: "canonical-json",
  },
  runEvent: {
    pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/ledger/events\\.ndjson$",
    storageFormat: "canonical-ndjson-record-per-line",
  },
  runResult: {
    pathPattern: "^results/(?:open-smoke|open-calibration/(?:normalize|export))/records/[0-9a-f]{64}\\.result\\.json$",
    storageFormat: "canonical-json",
  },
  faultResult: {
    pathPattern: "^results/open-smoke/fault/fault-semantics-result\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
  sessionAudit: {
    pathPattern: "^results/open-smoke/audit/(?:normalize|export)\\.smoke-session-audit\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
  smokeSummary: {
    pathPattern: "^results/open-smoke/summaries/(?:normalize|export)\\.smoke-summary\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
  gateBDecision: {
    pathPattern: "^results/open-smoke/decisions/(?:normalize|export)\\.gate-b-decision\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
  calibrationAdmission: {
    pathPattern: "^results/open-calibration/(?:normalize|export)/admission/calibration-admission\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
  calibrationSummary: {
    pathPattern: "^results/open-calibration/(?:normalize|export)/summaries/calibration-summary\\.slice05\\.v0\\.json$",
    storageFormat: "canonical-json",
  },
});

const EVIDENCE_BOUNDARY = Object.freeze({
  productSupport: false,
  formalEvidence: false,
  c1: 0,
  u1: 0,
  e1: 0,
  r1Pipeline: 0,
  r1ProductValidation: 0,
  r1ProductRelease: 0,
  o1: 0,
  g1: 0,
  v1: 0,
  releaseAllowlist: "none",
  releaseRegistered: 0,
  releaseApproved: 0,
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

export function stableStringifySlice05Definition(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sha256Slice05Definition(value) {
  const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return createHash("sha256").update(bytes).digest("hex");
}

export function contentHashSlice05Definition(record) {
  if (!isPlainObject(record)) throw new TypeError("content-hashed records must be plain objects");
  const withoutHash = { ...record };
  delete withoutHash.contentHash;
  return sha256Slice05Definition(stableStringifySlice05Definition(withoutHash));
}

function finalizeRecord(record) {
  const finalized = structuredClone(record);
  finalized.contentHash = contentHashSlice05Definition(finalized);
  return finalized;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.allocUnsafe(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return output;
}

export function encodeCanonicalRgbaPngSlice05(width, height, rgba, options = {}) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("PNG dimensions must be positive integers");
  }
  if (!(rgba instanceof Uint8Array) || rgba.byteLength !== width * height * 4) {
    throw new TypeError("RGBA byte length does not match PNG dimensions");
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (stride + 1);
    scanlines[offset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(scanlines, offset + 1);
  }
  const chunks = [pngChunk("IHDR", header)];
  if (options.includeSrgb !== false) chunks.push(pngChunk("sRGB", Buffer.from([0])));
  chunks.push(pngChunk("IDAT", deflateSync(scanlines, { level: 9 })), pngChunk("IEND", Buffer.alloc(0)));
  const png = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), ...chunks]);
  if (options.corruptIdatCrc === true) {
    const corrupted = Buffer.from(png);
    const idat = corrupted.indexOf(Buffer.from("IDAT", "ascii"));
    const length = corrupted.readUInt32BE(idat - 4);
    corrupted[idat + 4 + length] ^= 0x01;
    return corrupted;
  }
  return png;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function encodeExactOversizeCanonicalRgbaPngSlice05(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (stride + 1);
    scanlines[offset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(scanlines, offset + 1);
  }

  // Use valid empty DEFLATE stored blocks to make one otherwise canonical PNG
  // exactly one byte over the contract limit. Multiple contiguous IDAT chunks
  // provide the modulo adjustment without adding a second format defect.
  let idatCount = null;
  let emptyStoredBlockCount = null;
  let targetZlibLength = null;
  for (let count = 1; count <= 5; count += 1) {
    const candidateLength = (MAX_BYTES + 1) - 58 - (12 * count);
    const paddingLength = candidateLength - scanlines.byteLength - 11;
    if (paddingLength >= 0 && paddingLength % 5 === 0) {
      idatCount = count;
      emptyStoredBlockCount = paddingLength / 5;
      targetZlibLength = candidateLength;
      break;
    }
  }
  if (idatCount === null) throw new Error("cannot construct exact Slice 05 oversize PNG length");

  const emptyBlocks = Buffer.alloc(emptyStoredBlockCount * 5);
  for (let offset = 0; offset < emptyBlocks.length; offset += 5) {
    emptyBlocks[offset] = 0x00;
    emptyBlocks.writeUInt16LE(0, offset + 1);
    emptyBlocks.writeUInt16LE(0xffff, offset + 3);
  }
  const finalBlock = Buffer.alloc(5 + scanlines.byteLength);
  finalBlock[0] = 0x01;
  finalBlock.writeUInt16LE(scanlines.byteLength, 1);
  finalBlock.writeUInt16LE((~scanlines.byteLength) & 0xffff, 3);
  scanlines.copy(finalBlock, 5);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(adler32(scanlines));
  const zlibBytes = Buffer.concat([Buffer.from([0x78, 0x01]), emptyBlocks, finalBlock, checksum]);
  if (zlibBytes.byteLength !== targetZlibLength || !inflateSync(zlibBytes).equals(scanlines)) {
    throw new Error("constructed Slice 05 oversize PNG zlib stream is not exact and lossless");
  }
  const idatChunks = [];
  let zlibOffset = 0;
  for (let index = 0; index < idatCount; index += 1) {
    const remainingParts = idatCount - index;
    const partLength = Math.floor((zlibBytes.byteLength - zlibOffset) / remainingParts);
    idatChunks.push(pngChunk("IDAT", zlibBytes.subarray(zlibOffset, zlibOffset + partLength)));
    zlibOffset += partLength;
  }
  const png = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("sRGB", Buffer.from([0])),
    ...idatChunks,
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  if (png.byteLength !== MAX_BYTES + 1) throw new Error("oversize PNG is not exactly limit plus one byte");
  return png;
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

function commonDefs() {
  return {
    sha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    nullableSha256: { type: ["string", "null"], pattern: "^[0-9a-f]{64}$" },
    id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$" },
    packageName: { type: "string", pattern: "^(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$" },
    scopeDirectoryName: { type: "string", pattern: "^@[a-z0-9][a-z0-9._-]*$" },
    relativePath: {
      type: "string",
      pattern: "^(?!.*(?:^|/)\\.\\.?(?:/|$))(?!.*\\\\)(?!.*:)[A-Za-z0-9@._-]+(?:/[A-Za-z0-9@._-]+)*$",
    },
    utc: {
      type: "string",
      format: "date-time",
      pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
    },
    hashRef: closedObject({ id: { $ref: "#/$defs/id" }, contentHash: { $ref: "#/$defs/sha256" } }),
    recordRef: closedObject({
      path: { $ref: "#/$defs/relativePath" },
      id: { $ref: "#/$defs/id" },
      contentHash: { $ref: "#/$defs/sha256" },
      byteLength: { type: "integer", minimum: 1 },
      fileSha256: { $ref: "#/$defs/sha256" },
    }),
    fileRef: closedObject({
      path: { $ref: "#/$defs/relativePath" },
      byteLength: { type: "integer", minimum: 1 },
      fileSha256: { $ref: "#/$defs/sha256" },
    }),
    implementationRef: closedObject({
      id: { $ref: "#/$defs/id" },
      version: { $ref: "#/$defs/id" },
      path: { $ref: "#/$defs/relativePath" },
      implementationSha256: { $ref: "#/$defs/sha256" },
    }),
    evidenceBoundary: closedObject({
      productSupport: { type: "boolean", const: false },
      formalEvidence: { type: "boolean", const: false },
      c1: { type: "integer", const: 0 },
      u1: { type: "integer", const: 0 },
      e1: { type: "integer", const: 0 },
      r1Pipeline: { type: "integer", const: 0 },
      r1ProductValidation: { type: "integer", const: 0 },
      r1ProductRelease: { type: "integer", const: 0 },
      o1: { type: "integer", const: 0 },
      g1: { type: "integer", const: 0 },
      v1: { type: "integer", const: 0 },
      releaseAllowlist: constString("none"),
      releaseRegistered: { type: "integer", const: 0 },
      releaseApproved: { type: "integer", const: 0 },
    }),
  };
}

function schemaDocument(name, properties, defs = {}) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-05/schemas/${name}`,
    ...closedObject(properties),
    $defs: { ...commonDefs(), ...defs },
  };
}

const VERSION_COMPONENTS = Object.freeze([
  "aom", "archive", "cairo", "cgif", "exif", "expat", "ffi", "fontconfig", "freetype", "fribidi",
  "glib", "harfbuzz", "heif", "highway", "imagequant", "lcms", "mozjpeg", "pango", "pixman", "png",
  "proxy-libintl", "rsvg", "tiff", "uhdr", "vips", "webp", "xml2", "zlib-ng",
]);

const versionMapProperties = Object.fromEntries(VERSION_COMPONENTS.map((id) => [id, { type: "string", minLength: 1 }]));
const sharpVersionMapProperties = { ...versionMapProperties, sharp: constString("0.35.3") };

const runtimeSchema = schemaDocument("runtime-attestation-record.slice05.v0.schema.json", {
  schemaVersion: constString("runtime-attestation-record.slice05.v0"),
  runtimeAttestationId: constString(RUNTIME_ID),
  recordVersion: constString(VERSION),
  runtimeCandidateId: constString(CANDIDATE_ID),
  sourceCandidateMetadataRef: closedObject({
    id: constString("REG-NORM-SHARP@0.4.0"), path: { $ref: "#/$defs/relativePath" },
    contentHash: { $ref: "#/$defs/sha256" }, fileSha256: { $ref: "#/$defs/sha256" },
  }),
  inventoryRef: closedObject({
    ...commonDefs().implementationRef.properties,
    inventoryPayloadSha256: { $ref: "#/$defs/sha256" },
  }),
  packageManifest: closedObject({
    path: constString("package.json"), sha256: { $ref: "#/$defs/sha256" },
    exactDevDependencies: closedObject({
      "@img/sharp-win32-x64": constString("0.35.3"), sharp: constString("0.35.3"),
    }),
  }),
  packageLock: closedObject({
    path: constString("package-lock.json"), sha256: { $ref: "#/$defs/sha256" },
    expectedSha256: { $ref: "#/$defs/sha256" }, lockfileVersion: { type: "integer", const: 3 },
    pins: arrayOf(closedObject({
      name: { $ref: "#/$defs/packageName" }, version: { type: "string", minLength: 1 },
      resolved: { type: "string", pattern: "^https://registry\\.npmjs\\.org/" },
      integrity: { type: "string", pattern: "^sha512-" },
    }), { minItems: 5, maxItems: 5 }),
  }),
  installedClosure: closedObject({
    allowlist: arrayOf({ $ref: "#/$defs/packageName" }, { minItems: 5, maxItems: 5, uniqueItems: true }),
    packages: arrayOf(closedObject({
      name: { $ref: "#/$defs/packageName" }, version: { type: "string", minLength: 1 },
      path: { $ref: "#/$defs/relativePath" }, packageJsonSha256: { $ref: "#/$defs/sha256" },
    }), { minItems: 5, maxItems: 5 }),
    ignoredEmptyScopeDirectories: arrayOf({ $ref: "#/$defs/scopeDirectoryName" }, { uniqueItems: true }),
    fileCount: { type: "integer", minimum: 1 }, treeSha256: { $ref: "#/$defs/sha256" },
    nativeArtifacts: arrayOf(closedObject({
      path: { $ref: "#/$defs/relativePath" }, byteLength: { type: "integer", minimum: 1 },
      sha256: { $ref: "#/$defs/sha256" }, expectedSha256: { $ref: "#/$defs/sha256" },
    }), { minItems: 3, maxItems: 3 }),
  }),
  versions: closedObject({
    installedVersionsJsonSha256: { $ref: "#/$defs/sha256" },
    installed: closedObject(versionMapProperties),
    sharpRuntime: closedObject(sharpVersionMapProperties),
    slice04PackagingMetadataErratum: arrayOf(closedObject({
      componentId: enumString(["archive", "expat", "ffi", "glib", "heif", "pango", "rsvg", "tiff", "uhdr"]),
      slice04PackagingMetadataVersion: { type: "string", minLength: 1 },
      installedRuntimeVersion: { type: "string", minLength: 1 },
      disposition: constString("reported-nonfatal-packaging-metadata-difference"),
    }), { minItems: 9, maxItems: 9 }),
  }),
  environment: closedObject({
    os: closedObject({ platform: constString("win32"), release: { type: "string", minLength: 1 }, version: { type: "string", minLength: 1 }, architecture: constString("x64") }),
    cpu: closedObject({ models: arrayOf({ type: "string", minLength: 1 }, { minItems: 1, uniqueItems: true }), logicalProcessors: { type: "integer", minimum: 1 } }),
    memory: closedObject({ totalBytes: { type: "integer", minimum: 1 } }),
    node: closedObject({ version: { type: "string", pattern: "^v[0-9]+" }, abi: { type: "string", pattern: "^[0-9]+$" }, napi: { type: "string", pattern: "^[0-9]+$" } }),
    npm: closedObject({ version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+" } }),
  }),
  executionBoundary: closedObject({
    sharpImportedForVersionsOnly: { type: "boolean", const: true }, imageBytesRead: { type: "boolean", const: false },
    imageDecoded: { type: "boolean", const: false }, imageEncoded: { type: "boolean", const: false },
    candidatePipelineInvoked: { type: "boolean", const: false }, hostnameRecorded: { type: "boolean", const: false },
    serialRecorded: { type: "boolean", const: false },
  }),
  gateBStateAtDefinitionFreeze: constString("not-evaluated"),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" },
  recordedAt: { $ref: "#/$defs/utc" },
  contentHash: { $ref: "#/$defs/sha256" },
});

const candidateSchema = schemaDocument("candidate-lock.slice05.v0.schema.json", {
  schemaVersion: constString("candidate-lock.slice05.v0"),
  candidateLockId: constString(CANDIDATE_ID),
  recordVersion: constString(VERSION),
  candidateKind: constString("installed-sharp-win32-x64-runtime-closure"),
  sourceCandidateMetadataRef: { $ref: "#/$defs/recordRef" },
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" },
  implementationRefs: arrayOf(closedObject({
    role: enumString(["candidate-adapter", "candidate-worker", "independent-oracle", "runtime-inventory", "independent-fixture-generator"]),
    ref: { $ref: "#/$defs/implementationRef" },
    candidateDependency: { type: "boolean" },
  }), { minItems: 5, maxItems: 5 }),
  runtimeClosure: closedObject({
    packageLockSha256: { $ref: "#/$defs/sha256" }, installedTreeSha256: { $ref: "#/$defs/sha256" },
    nativeArtifactCount: { type: "integer", const: 3 }, installedVersionCount: { type: "integer", const: 28 },
    slice04PackagingMetadataErratumCount: { type: "integer", const: 9 },
  }),
  targetPlatform: closedObject({ os: constString("win32"), cpu: constString("x64"), libc: constString("not-applicable") }),
  stateAtDefinitionFreeze: closedObject({
    installation: constString("installed-and-inventoried"), execution: constString("candidate-pipeline-not-run"),
    gateA: constString("runtime-closure-resolved"), gateB: constString("not-evaluated"),
    calibration: constString("blocked-until-operation-specific-gate-b-pass"),
  }),
  prohibitedClaims: arrayOf(enumString(["product-capability", "formal-c1", "holdout-evidence", "release-support"]), { minItems: 4, maxItems: 4, uniqueItems: true }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" },
  frozenAt: { $ref: "#/$defs/utc" },
  contentHash: { $ref: "#/$defs/sha256" },
});

const profileSchema = closedObject({
  type: { type: "string", minLength: 1 }, mime: constString("image/png"), maxBytes: { type: "integer", const: MAX_BYTES },
  maxWidth: { type: "integer", const: 256 }, maxHeight: { type: "integer", const: 256 }, pixelLayout: constString("RGBA8"),
  colorSpace: constString("embedded-sRGB"), orientation: { type: "integer", const: 1 },
  alphaMode: constString("straight-unpremultiplied"), metadataPolicy: constString("strip-all-except-color-contract"),
  pngFilterPolicy: constString("filter-0-only"), interlace: constString("forbidden"), animation: constString("forbidden"),
});

const contractSchema = schemaDocument("capability-contract.slice05.v0.schema.json", {
  schemaVersion: constString("capability-contract.slice05.v0"), contractId: enumString([NORMALIZE_CONTRACT_ID, EXPORT_CONTRACT_ID]),
  recordVersion: constString(VERSION), capabilityId: constString("CAP-02"), suiteId: constString("NORMALIZE-DELIVER"),
  operation: enumString(["normalize", "export"]), sourceSlice04ContractRef: { $ref: "#/$defs/recordRef" },
  candidateRef: { $ref: "#/$defs/recordRef" }, runtimeAttestationRef: { $ref: "#/$defs/recordRef" },
  artifactSchemaRefs: arrayOf(closedObject({
    role: enumString(["input-normalized-image", "output-normalized-image", "output-delivery-artifact"]),
    schemaVersion: enumString(["normalized-image.slice04.v0", "delivery-artifact.slice04.v0"]),
    file: { $ref: "#/$defs/fileRef" },
  }), { minItems: 1, maxItems: 2, uniqueItems: true }),
  runnerRecordSchemaRefs: arrayOf(closedObject({
    role: enumString(["local-run-request", "terminal-run-result", "independent-oracle-result"]),
    schemaVersion: enumString(["local-run-request.slice05.v0", "run-result.slice05.v0", "oracle-result.slice05.v0"]),
    file: { $ref: "#/$defs/fileRef" },
  }), { minItems: 3, maxItems: 3, uniqueItems: true }),
  inputProfile: profileSchema, outputProfile: profileSchema,
  implementation: closedObject({
    state: constString("installed-definition-only-not-admitted"), adapterRef: { $ref: "#/$defs/implementationRef" },
    workerRef: { $ref: "#/$defs/implementationRef" }, independentOracleRef: { $ref: "#/$defs/implementationRef" },
    isolatedWorkerRequired: { type: "boolean", const: true }, independentReopenRequired: { type: "boolean", const: true },
    passthroughAllowed: { type: "boolean", const: false }, fallbackAllowed: { type: "boolean", const: false },
    atomicCommitRequired: { type: "boolean", const: true }, imagePipelineExecutedByDefinitionGenerator: { type: "boolean", const: false },
  }),
  failureSemantics: closedObject({
    failClosed: { type: "boolean", const: true }, stableErrorCodeRequired: { type: "boolean", const: true },
    artifactOnFailure: { type: "boolean", const: false }, validResultRerunAllowed: { type: "boolean", const: false },
    unsupportedFormatsRejectBeforeCandidateWorker: { type: "boolean", const: true }, unknownIsNonPass: { type: "boolean", const: true },
  }),
  gateBStateAtDefinitionFreeze: constString("not-evaluated"), calibrationStateAtDefinitionFreeze: constString("blocked-until-this-operation-gate-b-passes"),
  formalHoldoutStatusAtDefinitionFreeze: constString("not-created"), formalDefectHoldoutStatusAtDefinitionFreeze: constString("not-created"),
  formalEscapeStatusAtDefinitionFreeze: constString("not-created"), evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" },
  frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const gateConjunctSchema = closedObject({
  gateId: { $ref: "#/$defs/id" }, requirement: { type: "string", minLength: 1 },
  initialState: constString("not-evaluated"), passRequired: { type: "boolean", const: true },
});

const gateBSchema = schemaDocument("gate-b-smoke-plan.slice05.v0.schema.json", {
  schemaVersion: constString("gate-b-smoke-plan.slice05.v0"), gateBPlanId: constString(GATE_B_PLAN_ID), recordVersion: constString(VERSION),
  candidateRef: { $ref: "#/$defs/recordRef" }, runtimeAttestationRef: { $ref: "#/$defs/recordRef" }, hardwareRef: { $ref: "#/$defs/recordRef" },
  implementationRefs: arrayOf(closedObject({
    role: enumString([
      "candidate-adapter", "candidate-worker", "independent-oracle", "runtime-inventory",
      "independent-fixture-generator", "local-open-runner", "fault-semantics-worker",
    ]),
    ref: { $ref: "#/$defs/implementationRef" },
  }), { minItems: 7, maxItems: 7, uniqueItems: true }),
  resultSchemaRefs: arrayOf({ $ref: "#/$defs/fileRef" }, { minItems: 10, maxItems: 10, uniqueItems: true }),
  goldRecordSchemaRef: { $ref: "#/$defs/fileRef" },
  operationPlans: arrayOf(closedObject({
    operation: enumString(["normalize", "export"]), contractRef: { $ref: "#/$defs/recordRef" },
    smokeManifestRef: { $ref: "#/$defs/recordRef" }, sourceCount: { type: "integer", const: 6 },
    applicableSources: { type: "integer", const: 3 }, rejectionSources: { type: "integer", const: 3 },
    repetitionsPerSource: { type: "integer", const: 3 }, initialGateBState: constString("not-evaluated"),
    conjunctiveGates: arrayOf(gateConjunctSchema, { minItems: 12, maxItems: 12, uniqueItems: true }),
    cases: arrayOf(closedObject({
      sourceId: { $ref: "#/$defs/id" }, categoryId: { $ref: "#/$defs/id" },
      expectedDisposition: enumString(["artifact-required", "rejection-required"]),
      expectedStableErrorCode: { type: ["string", "null"], pattern: "^S05_[A-Z0-9_]+$" },
    }), { minItems: 6, maxItems: 6, uniqueItems: true }),
    passRule: constString("every-conjunct-must-pass-with-no-aggregation-no-majority-and-no-valid-outcome-rerun"),
    calibrationAdmissionOnPass: constString("only-this-operation-open-calibration-may-run"),
  }), { minItems: 2, maxItems: 2 }),
  crossOperationAggregationAllowed: { type: "boolean", const: false }, smokeCountsAsCapabilityEvidence: { type: "boolean", const: false },
  formalPartitionsCreatedAtDefinitionFreeze: { type: "boolean", const: false }, resultsStateAtDefinitionFreeze: constString("not-created"),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const categoryFloorSchema = arrayOf(closedObject({
  categoryId: { $ref: "#/$defs/id" }, minimumIndependentSources: { type: "integer", minimum: 1 },
}), { minItems: 3, maxItems: 3 });

const repeatPassRuleSchema = closedObject({
  invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt: { type: "boolean", const: true },
  majorityVoteAllowed: { type: "boolean", const: false },
  maximumInvalidReplacementsPerSourceAcrossAllRepetitions: { type: "integer", const: 1 },
  plannedRepetitions: { type: "integer", const: 3 }, requiredValidPasses: { type: "integer", const: 3 },
  validNonPassRerunAllowed: { type: "boolean", const: false },
});

const openPartitionRowSchema = closedObject({
  allowedInvalidReasons: arrayOf(enumString(["runner-crash-before-result", "custody-interruption", "integrity-check-failure"]), { minItems: 3, maxItems: 3, uniqueItems: true }),
  applicableCategories: categoryFloorSchema,
  approvers: arrayOf({ $ref: "#/$defs/id" }, { minItems: 2, uniqueItems: true }),
  assetState: constString("created-open-registered-not-run"),
  captureSessionRule: { type: "string", minLength: 1 },
  catastrophicFailureDefinitions: arrayOf({ type: "string", minLength: 1 }, { minItems: 4, uniqueItems: true }),
  categoryFloor: { type: "string", minLength: 1 }, confidenceMethod: { type: "string", minLength: 1 },
  countKind: constString("finite-stratum"), deterministicOrStochastic: constString("deterministic-local-codec"),
  diagnosticRetryRule: { type: "string", minLength: 1 }, difficultCategories: categoryFloorSchema,
  eligibilityRule: { type: "string", minLength: 1 }, escapePolicy: { type: "null" },
  evidenceRole: enumString(["open-calibration", "open-defect-calibration"]), excludedFromInitialC1: { type: "boolean", const: true },
  exclusionRule: { type: "string", minLength: 1 }, failureTimeoutCancelTreatment: { type: "string", minLength: 1 },
  fixtureManifest: closedObject({ manifestId: { $ref: "#/$defs/id" }, requiredVersion: constString(VERSION), state: constString("created-open-registered-not-run") }),
  formal: { type: "boolean", const: false }, frozenAt: { $ref: "#/$defs/utc" },
  internalRetryRule: { type: "string", minLength: 1 }, invalidRunRule: { type: "string", minLength: 1 },
  maximumCollectionWindow: constString("P14D"), minimumApplicableSources: { type: "integer", enum: [6, 18] },
  minimumIndependentSourcesTotal: { type: "integer", enum: [18, 30] }, minimumRejectionSources: { type: "integer", const: 12 },
  missingResultTreatment: { type: "string", minLength: 1 }, operation: enumString(["normalize", "export"]),
  overallThreshold: { type: "string", minLength: 1 }, owners: arrayOf({ $ref: "#/$defs/id" }, { minItems: 1, uniqueItems: true }),
  partition: enumString(["dev/calibration", "defect/calibration"]), plannedIndependentSources: { type: "integer", enum: [18, 30] },
  primaryEstimand: { type: "string", minLength: 1 }, rejectionCategories: categoryFloorSchema,
  repeatPassRule: repeatPassRuleSchema, runRepetitionsPerSource: { type: "integer", const: 3 },
  secondaryEstimands: arrayOf({ type: "string", minLength: 1 }, { minItems: 3, uniqueItems: true }),
  sourceFamilyRule: { type: "string", minLength: 1 }, sourceLevelAggregation: { type: "string", minLength: 1 },
  sourcePopulation: { type: "string", minLength: 1 }, stoppingRule: { type: "string", minLength: 1 },
  suiteId: constString("NORMALIZE-DELIVER"), suiteVersion: constString(VERSION), unitOfAnalysis: constString("independent_source"),
  userExecutionRule: { type: "string", minLength: 1 },
});

const comparisonPlanSchema = closedObject({
  candidateCount: { type: "integer", const: 1 }, candidateIds: arrayOf(constString(CANDIDATE_ID), { minItems: 1, maxItems: 1 }),
  deterministicContractAlternativeEvidence: arrayOf({ type: "string", minLength: 1 }, { minItems: 4, uniqueItems: true }),
  marketBenchmarkReason: { type: "string", minLength: 1 }, marketBenchmarkState: constString("not-applicable"),
});

const denominatorPolicySchema = closedObject({
  cancelledIncluded: { type: "boolean", const: true }, correctRejectSeparateFromFalseReject: { type: "boolean", const: true },
  failureIncluded: { type: "boolean", const: true }, falseAllowSeparateFromExecutionFailure: { type: "boolean", const: true },
  finiteStratumPopulationInferenceAllowed: { type: "boolean", const: false }, missingIncluded: { type: "boolean", const: true },
  registeredSourcesNeverSilentlyRemoved: { type: "boolean", const: true }, timeoutIncluded: { type: "boolean", const: true },
  unknownIncluded: { type: "boolean", const: true },
});

const isolationSchema = closedObject({
  captureSessionUniqueAcrossPartitions: { type: "boolean", const: true }, derivativeCrossPartitionForbidden: { type: "boolean", const: true },
  exactHashCrossPartitionForbidden: { type: "boolean", const: true }, nearDuplicateCrossPartitionForbidden: { type: "boolean", const: true },
  priorSliceStructuralFixtureReuseForbidden: { type: "boolean", const: true }, sourceFamilyUniqueAcrossPartitions: { type: "boolean", const: true },
});

const reviewerPlanSchema = closedObject({
  adjudicationRule: { type: "string", minLength: 1 }, adjudicatorId: { $ref: "#/$defs/id" },
  agreementMetric: { type: "string", minLength: 1 }, candidateIdentityBlinded: { type: "boolean", const: true },
  originalRatingsRetained: { type: "boolean", const: true }, primaryReviewerCount: { type: "integer", const: 2 },
  primaryReviewerIds: arrayOf({ $ref: "#/$defs/id" }, { minItems: 2, maxItems: 2, uniqueItems: true }),
  sourceOrderBlindedAndFrozen: { type: "boolean", const: true },
});

const openPartitionPlanSchema = schemaDocument("open-partition-plan.slice05.v0.schema.json", {
  schemaVersion: constString("open-partition-plan.slice05.v0"), partitionPlanId: enumString(["PP-NORMALIZE-PNG@0.5.0", "PP-EXPORT-PNG@0.5.0"]),
  recordVersion: constString(VERSION), suiteId: constString("NORMALIZE-DELIVER"), suiteVersion: constString(VERSION),
  operation: enumString(["normalize", "export"]), sourceSlice04PlanRef: { $ref: "#/$defs/recordRef" },
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRef: { $ref: "#/$defs/recordRef" },
  manifestRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 2, maxItems: 2 }),
  comparisonPlan: comparisonPlanSchema, denominatorPolicy: denominatorPolicySchema, isolation: isolationSchema, reviewerPlan: reviewerPlanSchema,
  partitions: arrayOf(openPartitionRowSchema, { minItems: 2, maxItems: 2 }),
  openCounts: closedObject({
    devCalibrationSources: { type: "integer", const: 30 }, defectCalibrationSources: { type: "integer", const: 18 },
    totalSources: { type: "integer", const: 48 }, repetitionsPerSource: { type: "integer", const: 3 },
    totalPlannedAttempts: { type: "integer", const: 144 },
  }),
  gateBPrecondition: constString("this-operation-gate-b-smoke-must-pass-all-conjuncts-before-calibration"),
  formalBoundary: closedObject({
    holdoutAtDefinitionFreeze: constString("not-created"), defectHoldoutAtDefinitionFreeze: constString("not-created"), escapeAtDefinitionFreeze: constString("not-created"),
    formalSources: { type: "integer", const: 0 }, c1Denominator: { type: "integer", const: 0 },
    holdoutSeedsPresent: { type: "boolean", const: false },
  }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
}, { openPartitionRow: openPartitionRowSchema });

const calibrationSchema = schemaDocument("calibration-preregistration.slice05.v0.schema.json", {
  schemaVersion: constString("calibration-preregistration.slice05.v0"),
  preregistrationId: enumString(["PREREG-CALIBRATION-NORMALIZE-PNG@0.5.0", "PREREG-CALIBRATION-EXPORT-PNG@0.5.0"]),
  recordVersion: constString(VERSION), operation: enumString(["normalize", "export"]), stateAtDefinitionFreeze: constString("preregistered-open-gate-b-blocked"),
  candidateRef: { $ref: "#/$defs/recordRef" }, runtimeAttestationRef: { $ref: "#/$defs/recordRef" },
  contractRef: { $ref: "#/$defs/recordRef" }, gateBSmokePlanRef: { $ref: "#/$defs/recordRef" },
  openPartitionPlanRef: { $ref: "#/$defs/recordRef" }, calibrationManifestRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 2, maxItems: 2 }),
  independentOracleRef: { $ref: "#/$defs/implementationRef" }, goldRecordSchemaRef: { $ref: "#/$defs/fileRef" },
  admissionRule: constString("only-the-matching-operation-gate-b-plan-may-admit-these-open-calibration-runs"),
  crossOperationGateAggregationAllowed: { type: "boolean", const: false },
  denominators: closedObject({
    devCalibration: closedObject({ sources: { type: "integer", const: 30 }, applicable: { type: "integer", const: 18 }, rejection: { type: "integer", const: 12 } }),
    defectCalibration: closedObject({ sources: { type: "integer", const: 18 }, applicableControls: { type: "integer", const: 6 }, rejectionDefects: { type: "integer", const: 12 } }),
    repetitionsPerSource: { type: "integer", const: 3 }, totalSources: { type: "integer", const: 48 }, totalPlannedAttempts: { type: "integer", const: 144 },
  }),
  outcomeRule: constString("all-three-repetitions-of-every-registered-source-must-pass-with-zero-false-allow-false-reject-failure-timeout-cancellation-missing-or-unknown"),
  rerunRule: constString("no-valid-outcome-rerun-and-at-most-one-predeclared-no-result-replacement-per-source-across-three-repetitions"),
  formalBoundary: closedObject({
    holdoutAtDefinitionFreeze: constString("not-created"), defectHoldoutAtDefinitionFreeze: constString("not-created"), escapeAtDefinitionFreeze: constString("not-created"),
    formalRunsAllowed: { type: "boolean", const: false }, c1Denominator: { type: "integer", const: 0 },
  }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const rightsSchema = schemaDocument("rights-record.slice05.v0.schema.json", {
  schemaVersion: constString("rights-record.slice05.v0"), rightsRecordId: constString(RIGHTS_ID), recordVersion: constString(VERSION),
  assetClass: constString("project-original-deterministic-synthetic-open-research-fixtures"),
  provenance: closedObject({
    generatedLocally: { type: "boolean", const: true }, thirdPartyAssetsUsed: { type: "boolean", const: false },
    realUserPhotosUsed: { type: "boolean", const: false }, containsRealPerson: { type: "boolean", const: false },
    modelWeightsUsed: { type: "boolean", const: false }, candidateOutputUsedToDefineGold: { type: "boolean", const: false },
    generatorId: constString(GENERATOR_ID), generatorImplementationSha256: { $ref: "#/$defs/sha256" },
  }),
  permissions: closedObject({
    repositoryStorage: { type: "boolean", const: true }, publicDisplay: { type: "boolean", const: true },
    researchModification: { type: "boolean", const: true }, fixtureRedistribution: { type: "boolean", const: true },
    permissionBasis: constString("project-original-authorship"),
  }),
  authorIds: arrayOf(constString("role.fixture-gold-author"), { minItems: 1, maxItems: 1 }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const sourceProvenanceSchema = schemaDocument("source-provenance.slice05.v0.schema.json", {
  schemaVersion: constString("source-provenance.slice05.v0"), sourceProvenanceId: { $ref: "#/$defs/id" }, sourceId: { $ref: "#/$defs/id" },
  recordVersion: constString(VERSION), operation: enumString(["normalize", "export"]), partition: enumString(["smoke", "dev/calibration", "defect/calibration"]),
  categoryId: { $ref: "#/$defs/id" }, expectedDisposition: enumString(["artifact-required", "rejection-required"]),
  expectedStableErrorCode: { type: ["string", "null"], pattern: "^S05_[A-Z0-9_]+$" },
  sourceFamilyId: { $ref: "#/$defs/id" }, captureSessionId: { $ref: "#/$defs/id" },
  rightsRef: { $ref: "#/$defs/recordRef" }, generatorRef: { $ref: "#/$defs/implementationRef" },
  candidateIndependence: closedObject({
    candidateProduced: { type: "boolean", const: false }, candidateOutputUsed: { type: "boolean", const: false },
    candidateDependencyUsed: { type: "boolean", const: false }, candidateAuthorIds: arrayOf(constString("role.candidate-implementation-author"), { minItems: 1, maxItems: 1 }),
    fixtureAuthorIds: arrayOf(constString("role.fixture-gold-author"), { minItems: 1, maxItems: 1 }),
  }),
  rawAsset: closedObject({
    path: { $ref: "#/$defs/relativePath" }, mime: enumString(["image/png", "image/jpeg", "image/webp", "application/octet-stream"]),
    byteLength: { type: "integer", minimum: 1, maximum: MAX_BYTES + 1 }, fileSha256: { $ref: "#/$defs/sha256" },
    decodedPixelSha256: { $ref: "#/$defs/nullableSha256" }, sourceDeclarationDecodedPixelSha256: { $ref: "#/$defs/sha256" },
    width: { type: "integer", minimum: 1, maximum: 512 }, height: { type: "integer", minimum: 1, maximum: 512 },
    alphaPresent: { type: "boolean" }, intentionallyInvalid: { type: "boolean" }, defectId: { type: ["string", "null"], minLength: 1 },
  }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const hardwareProfileSchema = schemaDocument("hardware-profile.slice05.v0.schema.json", {
  schemaVersion: constString("hardware-profile.slice05.v0"), hardwareProfileId: constString(HARDWARE_ID), recordVersion: constString(VERSION),
  runtimeAttestationRef: { $ref: "#/$defs/recordRef" },
  environment: closedObject({
    os: closedObject({ platform: constString("win32"), release: { type: "string", minLength: 1 }, version: { type: "string", minLength: 1 }, architecture: constString("x64") }),
    cpu: closedObject({ models: arrayOf({ type: "string", minLength: 1 }, { minItems: 1, uniqueItems: true }), logicalProcessors: { type: "integer", minimum: 1 } }),
    memory: closedObject({ totalBytes: { type: "integer", minimum: 1 } }),
    node: closedObject({ version: { type: "string", pattern: "^v[0-9]+" }, abi: { type: "string", pattern: "^[0-9]+$" }, napi: { type: "string", pattern: "^[0-9]+$" } }),
    npm: closedObject({ version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+" } }),
  }),
  privacyBoundary: closedObject({ hostnameRecorded: { type: "boolean", const: false }, serialRecorded: { type: "boolean", const: false } }),
  stateAtDefinitionFreeze: constString("observed-and-pinned-not-a-portability-claim"),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
});

const nullableRecordRefSchema = { oneOf: [{ $ref: "#/$defs/recordRef" }, { type: "null" }] };
const normalizedArtifactManifestRefSchema = {
  oneOf: [closedObject({
    path: { $ref: "#/$defs/relativePath" }, id: { $ref: "#/$defs/id" }, contentHash: { $ref: "#/$defs/sha256" },
    byteLength: { type: "integer", minimum: 1 }, fileSha256: { $ref: "#/$defs/sha256" },
    producerKind: constString("independent-fixture-generator"),
  }), { type: "null" }],
};
const defectSchema = {
  oneOf: [closedObject({ defectId: { $ref: "#/$defs/id" }, exactlyOneInjectedDefect: { type: "boolean", const: true } }), { type: "null" }],
};

const manifestEntrySchema = closedObject({
  sourceId: { $ref: "#/$defs/id" }, operation: enumString(["normalize", "export"]),
  partition: enumString(["smoke", "dev/calibration", "defect/calibration"]), categoryId: { $ref: "#/$defs/id" },
  expectedDisposition: enumString(["artifact-required", "rejection-required"]),
  expectedStableErrorCode: { type: ["string", "null"], pattern: "^S05_[A-Z0-9_]+$" },
  sourceFamilyId: { $ref: "#/$defs/id" }, captureSessionId: { $ref: "#/$defs/id" }, repetitions: { type: "integer", const: 3 },
  sourceProvenanceRef: { $ref: "#/$defs/recordRef" },
  rawAsset: closedObject({
    path: { $ref: "#/$defs/relativePath" }, mime: enumString(["image/png", "image/jpeg", "image/webp", "application/octet-stream"]),
    byteLength: { type: "integer", minimum: 1, maximum: MAX_BYTES + 1 }, fileSha256: { $ref: "#/$defs/sha256" },
    decodedPixelSha256: { $ref: "#/$defs/nullableSha256" }, sourceDeclarationDecodedPixelSha256: { $ref: "#/$defs/sha256" },
  }),
  normalizedArtifactRef: normalizedArtifactManifestRefSchema,
  goldRecordRef: nullableRecordRefSchema,
  injectedDefect: defectSchema,
});

const fixtureManifestSchema = schemaDocument("fixture-manifest.slice05.v0.schema.json", {
  schemaVersion: constString("fixture-manifest.slice05.v0"), manifestId: { $ref: "#/$defs/id" }, manifestVersion: constString(VERSION),
  manifestKind: enumString(["gate-b-smoke", "open-calibration"]), operationScope: arrayOf(enumString(["normalize", "export"]), { minItems: 1, maxItems: 1, uniqueItems: true }),
  partition: enumString(["smoke", "dev/calibration", "defect/calibration"]), stateAtDefinitionFreeze: constString("created-open-registered-not-run"),
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 1, maxItems: 1 }),
  rightsRef: { $ref: "#/$defs/recordRef" }, gateBPrerequisite: enumString(["this-manifest-evaluates-gate-b", "operation-specific-gate-b-pass-required-not-yet-met"]),
  counts: closedObject({
    totalSources: { type: "integer", minimum: 1 }, applicableSources: { type: "integer", minimum: 1 }, rejectionSources: { type: "integer", minimum: 1 },
    repetitionsPerSource: { type: "integer", const: 3 }, totalPlannedAttempts: { type: "integer", minimum: 1 },
    byOperation: arrayOf(closedObject({
      operation: enumString(["normalize", "export"]), totalSources: { type: "integer", minimum: 1 },
      applicableSources: { type: "integer", minimum: 1 }, rejectionSources: { type: "integer", minimum: 1 },
    }), { minItems: 1, maxItems: 1 }),
  }),
  entries: arrayOf(manifestEntrySchema, { minItems: 1 }),
  isolation: closedObject({
    operationSpecificFamiliesAndSessions: { type: "boolean", const: true }, sourceFamilyIdsUniqueAcrossDefinitionTree: { type: "boolean", const: true },
    captureSessionIdsUniqueAcrossDefinitionTree: { type: "boolean", const: true }, exactRawAssetHashReuseForbidden: { type: "boolean", const: true },
    priorSliceFixtureReuseForbidden: { type: "boolean", const: true },
  }),
  formalBoundary: closedObject({ formal: { type: "boolean", const: false }, c1Eligible: { type: "boolean", const: false }, holdoutMaterial: { type: "boolean", const: false } }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, frozenAt: { $ref: "#/$defs/utc" }, contentHash: { $ref: "#/$defs/sha256" },
}, { manifestEntry: manifestEntrySchema });

const indexSchema = schemaDocument("definition-index.slice05.v0.schema.json", {
  schemaVersion: constString("definition-index.slice05.v0"), definitionIndexId: constString("DEFINITION-INDEX-SLICE05@0.5.0"),
  recordVersion: constString(VERSION), definitionState: constString("frozen-definition-no-results"), frozenAt: { $ref: "#/$defs/utc" },
  runtimeAttestationRef: closedObject({
    ...commonDefs().recordRef.properties,
    inventoryPayloadSha256: { $ref: "#/$defs/sha256" },
  }),
  candidateRef: { $ref: "#/$defs/recordRef" }, contractRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 2, maxItems: 2 }),
  implementationRefs: arrayOf(closedObject({
    role: enumString([
      "candidate-adapter", "candidate-worker", "independent-oracle", "runtime-inventory",
      "independent-fixture-generator", "local-open-runner", "fault-semantics-worker",
    ]),
    ref: { $ref: "#/$defs/implementationRef" },
  }), { minItems: 7, maxItems: 7, uniqueItems: true }),
  hardwareRef: { $ref: "#/$defs/recordRef" }, gateBSmokePlanRef: { $ref: "#/$defs/recordRef" },
  smokeManifestRefs: arrayOf(closedObject({ operation: enumString(["normalize", "export"]), ref: { $ref: "#/$defs/recordRef" } }), { minItems: 2, maxItems: 2 }),
  openPartitionPlanRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 2, maxItems: 2 }),
  calibrationPreregistrationRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 2, maxItems: 2 }),
  calibrationManifestRefs: arrayOf({ $ref: "#/$defs/recordRef" }, { minItems: 4, maxItems: 4 }),
  rightsRef: { $ref: "#/$defs/recordRef" },
  proseReadmeRef: closedObject({
    path: constString("README.md"), byteLength: { type: "integer", minimum: 1 }, fileSha256: { $ref: "#/$defs/sha256" },
  }),
  expectedOptionalResults: arrayOf(closedObject({
    resultKind: { $ref: "#/$defs/id" }, pathPattern: { type: "string", minLength: 1 }, schemaFile: { $ref: "#/$defs/fileRef" },
    storageFormat: enumString(["canonical-json", "canonical-ndjson-record-per-line"]),
    initialState: constString("not-created"), requiredForDefinitionValidity: { type: "boolean", const: false },
  }), { minItems: 10, maxItems: 10, uniqueItems: true }),
  initialResultStateAtDefinitionFreeze: closedObject({
    resultsDirectoryPresent: { type: "boolean", const: false }, resultFilesPresent: { type: "integer", const: 0 },
    admissionRecordsPresent: { type: "integer", const: 0 }, ledgersPresent: { type: "integer", const: 0 },
  }),
  machineTree: closedObject({
    algorithm: constString("sha256(sorted(slice-root-relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))"),
    rootSelfExcludedToAvoidCircularHash: { type: "boolean", const: true }, proseReadmeExcludedAndSeparatelyPinned: { type: "boolean", const: true },
    fileCount: { type: "integer", minimum: 1 }, sha256: { $ref: "#/$defs/sha256" },
    files: arrayOf(closedObject({
      path: { $ref: "#/$defs/relativePath" }, classification: { $ref: "#/$defs/id" },
      byteLength: { type: "integer", minimum: 1 }, fileSha256: { $ref: "#/$defs/sha256" },
    }), { minItems: 1 }),
  }),
  counts: closedObject({
    schemas: { type: "integer", minimum: 1 }, manifests: { type: "integer", const: 6 }, sourceProvenanceRecords: { type: "integer", const: 108 },
    openRawAssets: { type: "integer", const: 108 }, normalizedInputArtifactRecords: { type: "integer", const: 54 },
    applicableIndependentNormalizedInputs: { type: "integer", const: 27 },
    goldRecords: { type: "integer", const: 54 }, formalFixtures: { type: "integer", const: 0 }, generatedResults: { type: "integer", const: 0 },
  }),
  evidenceBoundary: { $ref: "#/$defs/evidenceBoundary" }, contentHash: { $ref: "#/$defs/sha256" },
});

const BASE_SCHEMAS = Object.freeze({
  "schemas/runtime-attestation-record.slice05.v0.schema.json": runtimeSchema,
  "schemas/candidate-lock.slice05.v0.schema.json": candidateSchema,
  "schemas/capability-contract.slice05.v0.schema.json": contractSchema,
  "schemas/gate-b-smoke-plan.slice05.v0.schema.json": gateBSchema,
  "schemas/open-partition-plan.slice05.v0.schema.json": openPartitionPlanSchema,
  "schemas/calibration-preregistration.slice05.v0.schema.json": calibrationSchema,
  "schemas/rights-record.slice05.v0.schema.json": rightsSchema,
  "schemas/source-provenance.slice05.v0.schema.json": sourceProvenanceSchema,
  "schemas/hardware-profile.slice05.v0.schema.json": hardwareProfileSchema,
  "schemas/fixture-manifest.slice05.v0.schema.json": fixtureManifestSchema,
  "schemas/definition-index.slice05.v0.schema.json": indexSchema,
  ...Object.fromEntries(Object.entries(SLICE05_RUNNER_SCHEMA_PATHS).map(([key, schemaPath]) => {
    const schema = SLICE05_RUNNER_RECORD_SCHEMAS[key];
    if (!schema || schema.$id !== `https://single-image-studio.invalid/research/slice-05/schemas/${path.posix.basename(schemaPath)}`) {
      throw new Error(`runner schema export mismatch for ${key}: ${schemaPath}`);
    }
    return [schemaPath, schema];
  })),
});

export const SLICE05_GENERATED_SCHEMA_PATHS = Object.freeze(Object.keys(BASE_SCHEMAS).sort());

class DefinitionBuilder {
  constructor() {
    this.files = new Map();
    this.records = new Map();
  }

  addBytes(relativePath, bytes, classification) {
    if (this.files.has(relativePath)) throw new Error(`duplicate Slice 05 output path: ${relativePath}`);
    const buffer = Buffer.from(bytes);
    this.files.set(relativePath, { bytes: buffer, classification });
    return {
      path: relativePath,
      byteLength: buffer.byteLength,
      fileSha256: sha256Slice05Definition(buffer),
    };
  }

  addJson(relativePath, value, classification) {
    return this.addBytes(relativePath, Buffer.from(stableStringifySlice05Definition(value), "utf8"), classification);
  }

  addRecord(relativePath, idField, value, classification) {
    const record = finalizeRecord(value);
    const file = this.addJson(relativePath, record, classification);
    const ref = { path: relativePath, id: record[idField], contentHash: record.contentHash, ...file };
    delete ref.path;
    const recordRef = {
      path: relativePath,
      id: record[idField],
      contentHash: record.contentHash,
      byteLength: file.byteLength,
      fileSha256: file.fileSha256,
    };
    this.records.set(relativePath, { record, ref: recordRef });
    return { record, ref: recordRef };
  }
}

function exactUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError("Slice 05 frozenAt must be one exact millisecond UTC instant");
  }
  return value;
}

async function readFileDescriptor(projectRoot, relativePath) {
  const bytes = await fs.readFile(path.join(projectRoot, relativePath));
  return { path: relativePath.replaceAll("\\", "/"), byteLength: bytes.byteLength, fileSha256: sha256Slice05Definition(bytes), bytes };
}

async function readExternalRecord(projectRoot, relativePath, idField, expectedId) {
  const descriptor = await readFileDescriptor(projectRoot, relativePath);
  const record = JSON.parse(descriptor.bytes.toString("utf8"));
  if (record[idField] !== expectedId || !/^[0-9a-f]{64}$/u.test(record.contentHash ?? "")) {
    throw new Error(`external record identity mismatch: ${relativePath}`);
  }
  return {
    record,
    ref: {
      path: descriptor.path,
      id: expectedId,
      contentHash: record.contentHash,
      byteLength: descriptor.byteLength,
      fileSha256: descriptor.fileSha256,
    },
  };
}

function implementationRef(id, descriptor) {
  return {
    id,
    version: VERSION,
    path: descriptor.path,
    implementationSha256: descriptor.fileSha256,
  };
}

function fixturePixels(sourceId, width, height, alphaStyle) {
  const seed = createHash("sha256").update(sourceId).digest();
  const rgba = Buffer.alloc(width * height * 4);
  let alphaPresent = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      rgba[index] = (seed[0] + x * 31 + y * 17) & 0xff;
      rgba[index + 1] = (seed[7] + x * 13 + y * 29) & 0xff;
      rgba[index + 2] = (seed[15] + x * 23 + y * 11) & 0xff;
      let alpha = 255;
      if (alphaStyle === "partial") alpha = 24 + ((seed[21] + x * 19 + y * 37) % 231);
      if (alphaStyle === "holes") alpha = ((x * 5 + y * 7 + seed[27]) % 11) < 3 ? 0 : 255;
      rgba[index + 3] = alpha;
      if (alpha < 255) alphaPresent = true;
    }
  }
  return { rgba, alphaPresent };
}

function alphaStyleForCategory(categoryId, ordinal) {
  if (categoryId.includes("partial-alpha")) return "partial";
  if (categoryId.includes("alpha-holes")) return "holes";
  if (categoryId.includes("opaque")) return "opaque";
  return ["opaque", "partial", "holes"][ordinal % 3];
}

function smallJpegBytes(sourceId) {
  const payload = createHash("sha256").update(sourceId).digest().subarray(0, 16);
  return Buffer.concat([Buffer.from("ffd8ffe000104a46494600010100000100010000", "hex"), payload, Buffer.from("ffd9", "hex")]);
}

function smallWebpBytes(sourceId) {
  const payload = createHash("sha256").update(sourceId).digest().subarray(0, 16);
  const body = Buffer.concat([Buffer.from("WEBPVP8 ", "ascii"), Buffer.alloc(4), payload]);
  body.writeUInt32LE(payload.length, 8);
  const output = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), body]);
  output.writeUInt32LE(output.length - 8, 4);
  return output;
}

function makeRawFixture(spec) {
  const dimensionSeed = createHash("sha256").update(spec.rawSourceId).digest();
  const width = 8 + (dimensionSeed[0] % 17);
  const height = 8 + (dimensionSeed[1] % 15);
  const alphaStyle = alphaStyleForCategory(spec.categoryId, spec.categoryOrdinal);
  const pixels = fixturePixels(spec.rawSourceId, width, height, alphaStyle);
  let bytes = encodeCanonicalRgbaPngSlice05(width, height, pixels.rgba);
  let mime = "image/png";
  let extension = "png";
  let defectId = null;

  if (spec.operation === "normalize" && spec.expectedDisposition === "rejection-required") {
    if (spec.categoryId.includes("container-signature-or-crc")) {
      defectId = "single-defect.idat-crc-mismatch";
      bytes = encodeCanonicalRgbaPngSlice05(width, height, pixels.rgba, { corruptIdatCrc: true });
    } else if (spec.categoryId.includes("pixel-layout-color-or-metadata")) {
      defectId = "single-defect.missing-srgb-chunk";
      bytes = encodeCanonicalRgbaPngSlice05(width, height, pixels.rgba, { includeSrgb: false });
    } else {
      const variant = spec.partition === "smoke" ? 0 : spec.categoryOrdinal % 4;
      if (variant === 0) {
        defectId = "single-defect.unsupported-jpeg";
        bytes = smallJpegBytes(spec.rawSourceId);
        mime = "image/jpeg";
        extension = "jpg";
      } else if (variant === 1) {
        defectId = "single-defect.unsupported-webp";
        bytes = smallWebpBytes(spec.rawSourceId);
        mime = "image/webp";
        extension = "webp";
      } else if (variant === 2) {
        defectId = "single-defect.unsupported-octet-stream";
        bytes = Buffer.concat([Buffer.from("S05-NON-IMAGE\0", "utf8"), createHash("sha256").update(spec.rawSourceId).digest()]);
        mime = "application/octet-stream";
        extension = "bin";
      } else {
        defectId = "single-defect.byte-limit-plus-one";
        bytes = encodeExactOversizeCanonicalRgbaPngSlice05(width, height, pixels.rgba);
        mime = "image/png";
        extension = "png";
      }
    }
  }

  let decodedPixelSha256 = null;
  try {
    decodedPixelSha256 = decodeIndependentPngSlice05(bytes).decodedPixelSha256;
  } catch {
    decodedPixelSha256 = null;
  }
  const sourceDeclarationDecodedPixelSha256 = decodedPixelSha256 ?? sha256Slice05Definition(`unavailable-decode-declaration:${spec.rawSourceId}`);
  return {
    bytes,
    mime,
    extension,
    width,
    height,
    rgba: pixels.rgba,
    alphaPresent: pixels.alphaPresent,
    decodedPixelSha256,
    sourceDeclarationDecodedPixelSha256,
    defectId,
  };
}

function expectedErrorCode(spec) {
  if (spec.expectedDisposition === "artifact-required") return null;
  if (spec.operation === "export") {
    return "S05_EXPORT_NORMALIZED_ARTIFACT_INVALID";
  }
  if (spec.categoryId.includes("container-signature-or-crc")) return "S05_INPUT_CRC_MISMATCH";
  if (spec.categoryId.includes("pixel-layout-color-or-metadata")) return "S05_INPUT_SRGB_REQUIRED";
  return "S05_NORMALIZE_SOURCE_DECLARATION_INVALID";
}

function expandCategorySpecs(operation, partition, categories, expectedDisposition) {
  const specs = [];
  for (const category of categories) {
    for (let ordinal = 0; ordinal < category.minimumIndependentSources; ordinal += 1) {
      specs.push({ operation, partition, categoryId: category.categoryId, categoryOrdinal: ordinal, expectedDisposition });
    }
  }
  return specs;
}

function manifestSlug(operation, partition) {
  if (partition === "smoke") return `${operation}-smoke`;
  return `${operation}-${partition === "dev/calibration" ? "dev" : "defect"}`;
}

function sourceSlug(operation, partition, sequence) {
  const partitionName = partition === "smoke" ? "smoke" : partition.startsWith("dev") ? "dev" : "defect";
  return `${operation}.${partitionName}.${String(sequence + 1).padStart(3, "0")}`;
}

function makeSpecs(operation, partition, row) {
  if (partition === "smoke") {
    return [
      ...row.applicableCategories.map((category) => ({ operation, partition, categoryId: category.categoryId, categoryOrdinal: 0, expectedDisposition: "artifact-required" })),
      ...row.rejectionCategories.map((category) => ({ operation, partition, categoryId: category.categoryId, categoryOrdinal: 0, expectedDisposition: "rejection-required" })),
    ];
  }
  return [
    ...expandCategorySpecs(operation, partition, row.applicableCategories, "artifact-required"),
    ...expandCategorySpecs(operation, partition, row.rejectionCategories, "rejection-required"),
  ];
}

function makeGoldRecord({ spec, sourceId, parentIdentity, expected, generatorSha256, frozenAt }) {
  const gold = finalizeRecord({
    schemaVersion: "gold-record.slice05.v0",
    goldRecordId: `gold.${sourceId}`,
    operation: spec.operation,
    sourceId,
    partition: spec.partition,
    provenance: {
      kind: "project-original-procedural",
      producerId: GENERATOR_ID,
      producerVersion: VERSION,
      implementationSha256: generatorSha256,
      authorIds: ["role.fixture-gold-author"],
      candidateAuthorIds: ["role.candidate-implementation-author"],
      candidateProduced: false,
      candidateOutputUsed: false,
      candidateDependencyUsed: false,
    },
    expected: {
      parentIdentity,
      mime: "image/png",
      width: expected.width,
      height: expected.height,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      alphaPresent: expected.alphaPresent,
      metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
      fileSha256: null,
      decodedPixelSha256: expected.decodedPixelSha256,
    },
    frozenAt,
    contentHash: "",
  });
  validateGoldRecordSlice05(gold);
  return gold;
}

function hashRef(ref) {
  return { id: ref.id, contentHash: ref.contentHash };
}

function artifactImplementationRef(ref) {
  return { id: ref.id, version: ref.version, implementationSha256: ref.implementationSha256 };
}

function makeNormalizedInputArtifact({
  spec,
  artifactId,
  rawSourceId,
  rawAsset,
  provenanceRef,
  normalizeContractRef,
  candidateRef,
  runtimeRef,
  hardwareRef,
  adapterRef,
  generatorRef,
  frozenAt,
}) {
  if (rawAsset.decodedPixelSha256 === null) throw new Error(`export fixture ${rawSourceId} must independently decode`);
  const base = {
    schemaVersion: "normalized-image.slice04.v0",
    artifactId,
    operation: "normalize",
    parent: {
      sourceAssetId: rawSourceId,
      sourceFileSha256: rawAsset.fileSha256,
      sourceDecodedPixelSha256: rawAsset.decodedPixelSha256,
      sourceManifestSha256: provenanceRef.contentHash,
    },
    capabilityContractRef: hashRef(normalizeContractRef),
    candidateRef: hashRef(candidateRef),
    adapterRef: artifactImplementationRef(adapterRef),
    producerRef: {
      kind: "independent-fixture-generator",
      ...artifactImplementationRef(generatorRef),
    },
    runtimeRef: hashRef(runtimeRef),
    hardwareRef: hashRef(hardwareRef),
    attempt: {
      runId: `fixture-generation.${artifactId}`,
      sourceId: rawSourceId,
      partition: spec.partition,
      repetition: 1,
      attemptNumber: 1,
      idempotencyKey: `fixture-generation.${artifactId}.r1.a1`,
    },
    bytes: {
      relativePath: rawAsset.path,
      mime: "image/png",
      byteLength: rawAsset.byteLength,
      fileSha256: rawAsset.fileSha256,
      decodedPixelSha256: rawAsset.decodedPixelSha256,
    },
    image: {
      width: rawAsset.width,
      height: rawAsset.height,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      alphaPresent: rawAsset.alphaPresent,
      metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
    },
    createdAt: frozenAt,
    contentHash: "",
  };

  let defectId = null;
  if (spec.expectedDisposition === "rejection-required") {
    if (spec.categoryId.includes("shape-or-contract")) {
      base.schemaVersion = "normalized-image.slice04.invalid";
      defectId = "single-defect.normalized-schema-version-invalid";
    } else if (spec.categoryId.includes("parent-identity-file-or-pixel-hash")) {
      base.bytes.decodedPixelSha256 = "0".repeat(64);
      defectId = "single-defect.parent-pixel-hash-chain-invalid";
    } else {
      base.image.metadataPolicy = "retain-all-metadata";
      defectId = "single-defect.normalized-metadata-policy-invalid";
    }
  }
  const artifact = finalizeRecord(base);
  let independentOracleAccepted = true;
  try {
    validateNormalizedImageSlice05(artifact);
  } catch {
    independentOracleAccepted = false;
  }
  if (spec.expectedDisposition === "artifact-required") {
    if (!independentOracleAccepted) {
      throw new Error(`registered structurally valid export artifact failed independent validation: ${artifactId}`);
    }
    validateNormalizedArtifactSlice05(artifact);
  } else {
    let adapterErrorCode = null;
    try {
      validateNormalizedArtifactSlice05(artifact);
    } catch (error) {
      adapterErrorCode = error?.code ?? null;
    }
    const registeredErrorCode = expectedErrorCode(spec);
    if (adapterErrorCode !== registeredErrorCode) {
      throw new Error(`registered export rejection ${artifactId} produced ${adapterErrorCode}; expected ${registeredErrorCode}`);
    }
  }
  return { artifact, defectId, producerKind: "independent-fixture-generator" };
}

function manifestId(operation, partition) {
  const suffix = partition === "smoke" ? "SMOKE" : partition === "dev/calibration" ? "DEV-CALIBRATION" : "DEFECT-CALIBRATION";
  return `FM-NORMALIZE-DELIVER-${operation.toUpperCase()}-${suffix}@0.5.0`;
}

function cloneOpenRow(row, manifestRecordId, frozenAt) {
  const cloned = structuredClone(row);
  cloned.assetState = "created-open-registered-not-run";
  cloned.fixtureManifest = { manifestId: manifestRecordId, requiredVersion: VERSION, state: "created-open-registered-not-run" };
  cloned.frozenAt = frozenAt;
  cloned.suiteVersion = VERSION;
  cloned.sourcePopulation = cloned.sourcePopulation
    .replace(/^future /u, "registered ")
    .replace(/ authored after Slice 04 freeze/gu, " generated independently for Slice 05 open research");
  return cloned;
}

function buildOpenPlan({ operation, sourcePlan, sourcePlanRef, candidateRef, contractRef, manifestRefs, frozenAt }) {
  const partitions = ["dev/calibration", "defect/calibration"].map((partition, index) => {
    const row = sourcePlan.partitions.find((candidate) => candidate.partition === partition);
    if (!row) throw new Error(`Slice 04 ${operation} plan is missing ${partition}`);
    return cloneOpenRow(row, manifestRefs[index].id, frozenAt);
  });
  const comparisonPlan = structuredClone(sourcePlan.comparisonPlan);
  comparisonPlan.candidateIds = [CANDIDATE_ID];
  comparisonPlan.deterministicContractAlternativeEvidence = comparisonPlan.deterministicContractAlternativeEvidence
    .map((value) => value.replace("future-independent", "installed-independent"));
  comparisonPlan.marketBenchmarkReason = comparisonPlan.marketBenchmarkReason
    .replace("future operation-specific independent oracle", "frozen operation-specific independent oracle");
  return {
    schemaVersion: "open-partition-plan.slice05.v0",
    partitionPlanId: operation === "normalize" ? "PP-NORMALIZE-PNG@0.5.0" : "PP-EXPORT-PNG@0.5.0",
    recordVersion: VERSION,
    suiteId: "NORMALIZE-DELIVER",
    suiteVersion: VERSION,
    operation,
    sourceSlice04PlanRef: sourcePlanRef,
    candidateRef,
    contractRef,
    manifestRefs,
    comparisonPlan,
    denominatorPolicy: structuredClone(sourcePlan.denominatorPolicy),
    isolation: structuredClone(sourcePlan.isolation),
    reviewerPlan: structuredClone(sourcePlan.reviewerPlan),
    partitions,
    openCounts: {
      devCalibrationSources: 30,
      defectCalibrationSources: 18,
      totalSources: 48,
      repetitionsPerSource: 3,
      totalPlannedAttempts: 144,
    },
    gateBPrecondition: "this-operation-gate-b-smoke-must-pass-all-conjuncts-before-calibration",
    formalBoundary: {
      holdoutAtDefinitionFreeze: "not-created",
      defectHoldoutAtDefinitionFreeze: "not-created",
      escapeAtDefinitionFreeze: "not-created",
      formalSources: 0,
      c1Denominator: 0,
      holdoutSeedsPresent: false,
    },
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
    frozenAt,
    contentHash: "",
  };
}

function gateConjuncts(operation) {
  const prefix = `gate-b.${operation}`;
  return [
    ["definition-integrity", "definition index, schemas, manifests, records, and assets match every frozen byte pin"],
    ["runtime-integrity", "runtime attestation, package closure, installed tree, native hashes, and actual versions match"],
    ["implementation-integrity", "adapter, worker, independent oracle, runner, fault worker, and hardware profile match their pins"],
    ["source-isolation", "all smoke sources retain operation-specific unique family, session, source, and raw-byte identities"],
    ["applicable-success", "all three applicable sources produce independently reopened conforming artifacts in all three repetitions"],
    ["rejection-correctness", "all three rejection sources return their exact registered stable error with no artifact in all three repetitions"],
    ["repeat-determinism", "all three planned repetitions agree without voting or valid-outcome reruns"],
    ["fault-semantics", "timeout, worker crash, cancellation, unknown reconciliation, and atomic-commit faults fail closed"],
    ["oracle-independence", "candidate implementation hashes remain distinct from the independent oracle and gold producer"],
    ["zero-ambiguous-outcomes", "failure, timeout, cancellation, missing, and unknown counts are all zero for the clean smoke run"],
    ["no-cross-operation-aggregation", "this operation passes on its own and receives no credit from the other operation"],
    ["no-capability-promotion", "smoke admission remains open research only and leaves every evidence axis at zero"],
  ].map(([suffix, requirement]) => ({
    gateId: `${prefix}.${suffix}`,
    requirement,
    initialState: "not-evaluated",
    passRequired: true,
  }));
}

async function buildFixtureManifest({
  builder,
  operation,
  partition,
  row,
  rightsRef,
  candidateRef,
  normalizeContractRef,
  exportContractRef,
  runtimeRef,
  hardwareRef,
  adapterRef,
  generatorRef,
  frozenAt,
}) {
  const specs = makeSpecs(operation, partition, row);
  const entries = [];
  for (let sequence = 0; sequence < specs.length; sequence += 1) {
    const spec = specs[sequence];
    const slug = sourceSlug(operation, partition, sequence);
    const rawSourceId = `raw.s05.${slug}`;
    const normalizedArtifactId = `normalized.s05.${slug}`;
    spec.rawSourceId = rawSourceId;
    const raw = makeRawFixture(spec);
    const group = manifestSlug(operation, partition);
    const rawPath = `assets/open/${group}/${rawSourceId}.${raw.extension}`;
    const rawFile = builder.addBytes(rawPath, raw.bytes, "open-asset");
    const rawAsset = {
      path: rawPath,
      mime: raw.mime,
      byteLength: rawFile.byteLength,
      fileSha256: rawFile.fileSha256,
      decodedPixelSha256: raw.decodedPixelSha256,
      sourceDeclarationDecodedPixelSha256: raw.sourceDeclarationDecodedPixelSha256,
      width: raw.width,
      height: raw.height,
      alphaPresent: raw.alphaPresent,
      intentionallyInvalid: operation === "normalize" && spec.expectedDisposition === "rejection-required",
      defectId: raw.defectId,
    };
    const sourceFamilyId = `family.s05.${slug}`;
    const captureSessionId = `session.s05.${slug}`;
    const sourceProvenance = builder.addRecord(
      `sources/${group}/${rawSourceId}.json`,
      "sourceProvenanceId",
      {
        schemaVersion: "source-provenance.slice05.v0",
        sourceProvenanceId: `provenance.${rawSourceId}`,
        sourceId: rawSourceId,
        recordVersion: VERSION,
        operation,
        partition,
        categoryId: spec.categoryId,
        expectedDisposition: spec.expectedDisposition,
        expectedStableErrorCode: expectedErrorCode(spec),
        sourceFamilyId,
        captureSessionId,
        rightsRef,
        generatorRef,
        candidateIndependence: {
          candidateProduced: false,
          candidateOutputUsed: false,
          candidateDependencyUsed: false,
          candidateAuthorIds: ["role.candidate-implementation-author"],
          fixtureAuthorIds: ["role.fixture-gold-author"],
        },
        rawAsset,
        evidenceBoundary: { ...EVIDENCE_BOUNDARY },
        frozenAt,
        contentHash: "",
      },
      "source-provenance",
    );

    let normalizedArtifactRef = null;
    let artifactForGold = null;
    let artifactDefectId = null;
    if (operation === "export") {
      const made = makeNormalizedInputArtifact({
        spec,
        artifactId: normalizedArtifactId,
        rawSourceId,
        rawAsset,
        provenanceRef: sourceProvenance.ref,
        normalizeContractRef,
        candidateRef,
        runtimeRef,
        hardwareRef,
        adapterRef,
        generatorRef,
        frozenAt,
      });
      artifactForGold = made.artifact;
      artifactDefectId = made.defectId;
      const artifactOutput = builder.addRecord(
        `artifacts/normalized-inputs/${group}/${normalizedArtifactId}.json`,
        "artifactId",
        made.artifact,
        "normalized-input-artifact",
      );
      normalizedArtifactRef = { ...artifactOutput.ref, producerKind: made.producerKind };
    }

    let goldRecordRef = null;
    if (spec.expectedDisposition === "artifact-required") {
      if (raw.decodedPixelSha256 === null) throw new Error(`applicable source failed independent decode: ${rawSourceId}`);
      const manifestSourceId = operation === "normalize" ? rawSourceId : normalizedArtifactId;
      const parentIdentity = operation === "normalize"
        ? {
            id: rawSourceId,
            artifactSha256: null,
            fileSha256: rawFile.fileSha256,
            decodedPixelSha256: raw.decodedPixelSha256,
            manifestSha256: sourceProvenance.ref.contentHash,
          }
        : {
            id: normalizedArtifactId,
            artifactSha256: artifactForGold.contentHash,
            fileSha256: rawFile.fileSha256,
            decodedPixelSha256: raw.decodedPixelSha256,
            manifestSha256: sourceProvenance.ref.contentHash,
          };
      const gold = makeGoldRecord({
        spec,
        sourceId: manifestSourceId,
        parentIdentity,
        expected: { width: raw.width, height: raw.height, alphaPresent: raw.alphaPresent, decodedPixelSha256: raw.decodedPixelSha256 },
        generatorSha256: generatorRef.implementationSha256,
        frozenAt,
      });
      goldRecordRef = builder.addRecord(
        `gold/${group}/${gold.goldRecordId}.json`,
        "goldRecordId",
        gold,
        "gold-record",
      ).ref;
    }

    const sourceId = operation === "normalize" ? rawSourceId : normalizedArtifactId;
    const defectId = raw.defectId ?? artifactDefectId;
    entries.push({
      sourceId,
      operation,
      partition,
      categoryId: spec.categoryId,
      expectedDisposition: spec.expectedDisposition,
      expectedStableErrorCode: expectedErrorCode(spec),
      sourceFamilyId,
      captureSessionId,
      repetitions: 3,
      sourceProvenanceRef: sourceProvenance.ref,
      rawAsset: {
        path: rawPath,
        mime: raw.mime,
        byteLength: rawFile.byteLength,
        fileSha256: rawFile.fileSha256,
        decodedPixelSha256: raw.decodedPixelSha256,
        sourceDeclarationDecodedPixelSha256: raw.sourceDeclarationDecodedPixelSha256,
      },
      normalizedArtifactRef,
      goldRecordRef,
      injectedDefect: defectId === null ? null : { defectId, exactlyOneInjectedDefect: true },
    });
  }

  const applicableSources = entries.filter(({ expectedDisposition }) => expectedDisposition === "artifact-required").length;
  const rejectionSources = entries.length - applicableSources;
  const id = manifestId(operation, partition);
  const manifest = builder.addRecord(
    `manifests/${manifestSlug(operation, partition)}.v0.5.0.json`,
    "manifestId",
    {
      schemaVersion: "fixture-manifest.slice05.v0",
      manifestId: id,
      manifestVersion: VERSION,
      manifestKind: partition === "smoke" ? "gate-b-smoke" : "open-calibration",
      operationScope: [operation],
      partition,
      stateAtDefinitionFreeze: "created-open-registered-not-run",
      candidateRef,
      contractRefs: [operation === "normalize" ? normalizeContractRef : exportContractRef],
      rightsRef,
      gateBPrerequisite: partition === "smoke" ? "this-manifest-evaluates-gate-b" : "operation-specific-gate-b-pass-required-not-yet-met",
      counts: {
        totalSources: entries.length,
        applicableSources,
        rejectionSources,
        repetitionsPerSource: 3,
        totalPlannedAttempts: entries.length * 3,
        byOperation: [{ operation, totalSources: entries.length, applicableSources, rejectionSources }],
      },
      entries,
      isolation: {
        operationSpecificFamiliesAndSessions: true,
        sourceFamilyIdsUniqueAcrossDefinitionTree: true,
        captureSessionIdsUniqueAcrossDefinitionTree: true,
        exactRawAssetHashReuseForbidden: true,
        priorSliceFixtureReuseForbidden: true,
      },
      formalBoundary: { formal: false, c1Eligible: false, holdoutMaterial: false },
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      frozenAt,
      contentHash: "",
    },
    "fixture-manifest",
  );
  return { ...manifest, entries };
}

function makeProfile(type) {
  return {
    type,
    mime: "image/png",
    maxBytes: MAX_BYTES,
    maxWidth: 256,
    maxHeight: 256,
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  };
}

function makeContract({
  operation,
  sourceContractRef,
  candidateRef,
  runtimeRef,
  adapterRef,
  workerRef,
  oracleRef,
  normalizedSchemaRef,
  deliverySchemaRef,
  runRequestSchemaRef,
  runResultSchemaRef,
  oracleResultSchemaRef,
  frozenAt,
}) {
  const normalize = operation === "normalize";
  return {
    schemaVersion: "capability-contract.slice05.v0",
    contractId: normalize ? NORMALIZE_CONTRACT_ID : EXPORT_CONTRACT_ID,
    recordVersion: VERSION,
    capabilityId: "CAP-02",
    suiteId: "NORMALIZE-DELIVER",
    operation,
    sourceSlice04ContractRef: sourceContractRef,
    candidateRef,
    runtimeAttestationRef: runtimeRef,
    artifactSchemaRefs: normalize
      ? [{ role: "output-normalized-image", schemaVersion: "normalized-image.slice04.v0", file: normalizedSchemaRef }]
      : [
          { role: "input-normalized-image", schemaVersion: "normalized-image.slice04.v0", file: normalizedSchemaRef },
          { role: "output-delivery-artifact", schemaVersion: "delivery-artifact.slice04.v0", file: deliverySchemaRef },
        ],
    runnerRecordSchemaRefs: [
      { role: "local-run-request", schemaVersion: "local-run-request.slice05.v0", file: runRequestSchemaRef },
      { role: "terminal-run-result", schemaVersion: "run-result.slice05.v0", file: runResultSchemaRef },
      { role: "independent-oracle-result", schemaVersion: "oracle-result.slice05.v0", file: oracleResultSchemaRef },
    ],
    inputProfile: makeProfile(normalize ? "canonical-png-source-bytes" : "NormalizedImage.slice04.v0"),
    outputProfile: makeProfile(normalize ? "NormalizedImage.slice04.v0" : "DeliveryArtifact.slice04.v0"),
    implementation: {
      state: "installed-definition-only-not-admitted",
      adapterRef,
      workerRef,
      independentOracleRef: oracleRef,
      isolatedWorkerRequired: true,
      independentReopenRequired: true,
      passthroughAllowed: false,
      fallbackAllowed: false,
      atomicCommitRequired: true,
      imagePipelineExecutedByDefinitionGenerator: false,
    },
    failureSemantics: {
      failClosed: true,
      stableErrorCodeRequired: true,
      artifactOnFailure: false,
      validResultRerunAllowed: false,
      unsupportedFormatsRejectBeforeCandidateWorker: true,
      unknownIsNonPass: true,
    },
    gateBStateAtDefinitionFreeze: "not-evaluated",
    calibrationStateAtDefinitionFreeze: "blocked-until-this-operation-gate-b-passes",
    formalHoldoutStatusAtDefinitionFreeze: "not-created",
    formalDefectHoldoutStatusAtDefinitionFreeze: "not-created",
    formalEscapeStatusAtDefinitionFreeze: "not-created",
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
    frozenAt,
    contentHash: "",
  };
}

function makeCalibrationPreregistration({ operation, candidateRef, runtimeRef, contractRef, gateBRef, planRef, manifestRefs, oracleRef, goldRecordSchemaRef, frozenAt }) {
  return {
    schemaVersion: "calibration-preregistration.slice05.v0",
    preregistrationId: operation === "normalize" ? "PREREG-CALIBRATION-NORMALIZE-PNG@0.5.0" : "PREREG-CALIBRATION-EXPORT-PNG@0.5.0",
    recordVersion: VERSION,
    operation,
    stateAtDefinitionFreeze: "preregistered-open-gate-b-blocked",
    candidateRef,
    runtimeAttestationRef: runtimeRef,
    contractRef,
    gateBSmokePlanRef: gateBRef,
    openPartitionPlanRef: planRef,
    calibrationManifestRefs: manifestRefs,
    independentOracleRef: oracleRef,
    goldRecordSchemaRef,
    admissionRule: "only-the-matching-operation-gate-b-plan-may-admit-these-open-calibration-runs",
    crossOperationGateAggregationAllowed: false,
    denominators: {
      devCalibration: { sources: 30, applicable: 18, rejection: 12 },
      defectCalibration: { sources: 18, applicableControls: 6, rejectionDefects: 12 },
      repetitionsPerSource: 3,
      totalSources: 48,
      totalPlannedAttempts: 144,
    },
    outcomeRule: "all-three-repetitions-of-every-registered-source-must-pass-with-zero-false-allow-false-reject-failure-timeout-cancellation-missing-or-unknown",
    rerunRule: "no-valid-outcome-rerun-and-at-most-one-predeclared-no-result-replacement-per-source-across-three-repetitions",
    formalBoundary: {
      holdoutAtDefinitionFreeze: "not-created",
      defectHoldoutAtDefinitionFreeze: "not-created",
      escapeAtDefinitionFreeze: "not-created",
      formalRunsAllowed: false,
      c1Denominator: 0,
    },
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
    frozenAt,
    contentHash: "",
  };
}

function digestMachineFiles(files) {
  const digest = createHash("sha256");
  for (const file of [...files].sort((a, b) => compareText(a.path, b.path))) {
    digest.update(Buffer.from(file.path, "utf8"));
    digest.update(NUL);
    digest.update(Buffer.from(String(file.byteLength), "ascii"));
    digest.update(NUL);
    digest.update(Buffer.from(file.fileSha256, "ascii"));
    digest.update(NUL);
  }
  return digest.digest("hex");
}

async function listFiles(root, base = "") {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, base), { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Slice 05 definition tree forbids symlinks and non-files: ${relative}`);
  }
  return files;
}

function isOwnedDefinitionPath(relative) {
  return relative === "definition-index.v0.5.0.json"
    || OWNED_DEFINITION_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

async function assertNoSlice05Results(sliceRoot) {
  try {
    const resultStat = await fs.stat(path.join(sliceRoot, "results"));
    if (resultStat) throw new Error("Slice 05 results already exist; definition regeneration is forbidden after evidence begins");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function prepareSafeRegeneration(sliceRoot, expectedPaths) {
  await assertNoSlice05Results(sliceRoot);
  const existing = await listFiles(sliceRoot);
  const stale = existing.filter((relative) => relative !== "README.md" && !expectedPaths.has(relative));
  const outsideOwnedBoundary = stale.filter((relative) => !isOwnedDefinitionPath(relative));
  if (outsideOwnedBoundary.length > 0) {
    throw new Error(`unregistered files outside generator-owned Slice 05 paths: ${outsideOwnedBoundary.join(", ")}`);
  }
  for (const relative of stale) {
    const target = path.resolve(sliceRoot, relative);
    const relativeCheck = path.relative(sliceRoot, target);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`unsafe stale Slice 05 path: ${relative}`);
    await fs.unlink(target);
  }
  const possibleEmptyDirectories = new Set();
  for (const relative of stale) {
    let directory = path.posix.dirname(relative);
    while (directory !== ".") {
      possibleEmptyDirectories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  for (const relative of [...possibleEmptyDirectories].sort((a, b) => b.split("/").length - a.split("/").length)) {
    try {
      await fs.rmdir(path.resolve(sliceRoot, relative));
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY" && error?.code !== "EEXIST") throw error;
    }
  }
}

async function writeBuilderFiles(sliceRoot, builder) {
  const ordered = [...builder.files.entries()].sort(([a], [b]) => {
    if (a === "definition-index.v0.5.0.json") return 1;
    if (b === "definition-index.v0.5.0.json") return -1;
    return compareText(a, b);
  });
  for (const [relative, { bytes }] of ordered) {
    const destination = path.resolve(sliceRoot, relative);
    const relativeCheck = path.relative(sliceRoot, destination);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`unsafe Slice 05 output path: ${relative}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  }
}

export async function generateSlice05Schemas({ sliceRoot = DEFAULT_SLICE05_ROOT } = {}) {
  const resolvedRoot = path.resolve(sliceRoot);
  await assertNoSlice05Results(resolvedRoot);
  for (const [relative, schema] of Object.entries(BASE_SCHEMAS).sort(([a], [b]) => compareText(a, b))) {
    const destination = path.resolve(resolvedRoot, relative);
    const relativeCheck = path.relative(resolvedRoot, destination);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`unsafe Slice 05 schema path: ${relative}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, stableStringifySlice05Definition(schema), "utf8");
  }
  return { schemas: SLICE05_GENERATED_SCHEMA_PATHS.length };
}

export async function generateSlice05({
  sliceRoot = DEFAULT_SLICE05_ROOT,
  projectRoot = PROJECT_ROOT,
  frozenAt = SLICE05_FROZEN_AT,
  runtimeInventory = undefined,
} = {}) {
  const freeze = exactUtc(frozenAt);
  const resolvedSliceRoot = path.resolve(sliceRoot);
  const resolvedProjectRoot = path.resolve(projectRoot);
  await assertNoSlice05Results(resolvedSliceRoot);
  const builder = new DefinitionBuilder();
  const proseReadmeDescriptor = await readFileDescriptor(resolvedSliceRoot, "README.md");

  const generatedSchemaFileRefs = new Map();
  for (const [relative, schema] of Object.entries(BASE_SCHEMAS)) {
    generatedSchemaFileRefs.set(relative, builder.addJson(relative, schema, "schema"));
  }
  const resultSchemaRefsByKey = new Map(Object.entries(SLICE05_RUNNER_SCHEMA_PATHS).map(([key, schemaPath]) => {
    const ref = generatedSchemaFileRefs.get(schemaPath);
    if (!ref) throw new Error(`runner result schema was not registered: ${key} -> ${schemaPath}`);
    return [key, ref];
  }));
  const resultSchemaRefs = [...resultSchemaRefsByKey.values()];
  const expectedOptionalResults = Object.entries(OPTIONAL_RESULT_PATH_PROTOCOL).map(([key, protocol]) => {
    const schema = SLICE05_RUNNER_RECORD_SCHEMAS[key];
    const schemaFile = resultSchemaRefsByKey.get(key);
    const resultKind = schema?.properties?.schemaVersion?.const;
    if (!resultKind || !schemaFile) throw new Error(`optional result protocol is not backed by one runner schema: ${key}`);
    return {
      resultKind,
      pathPattern: protocol.pathPattern,
      schemaFile,
      storageFormat: protocol.storageFormat,
      initialState: "not-created",
      requiredForDefinitionValidity: false,
    };
  });

  const stableSchemaFiles = new Map();
  for (const relative of STABLE_SCHEMA_PATHS) {
    const bytes = await fs.readFile(path.join(resolvedSliceRoot, relative));
    stableSchemaFiles.set(relative, { bytes, classification: "schema" });
  }
  const normalizedSchemaFile = stableSchemaFiles.get("schemas/normalized-image.slice04.v0.schema.json");
  const deliverySchemaFile = stableSchemaFiles.get("schemas/delivery-artifact.slice04.v0.schema.json");
  const goldSchemaFile = stableSchemaFiles.get("schemas/gold-record.slice05.v0.schema.json");
  const oracleResultSchemaFile = stableSchemaFiles.get("schemas/oracle-result.slice05.v0.schema.json");
  const normalizedSchemaRef = {
    path: "schemas/normalized-image.slice04.v0.schema.json",
    byteLength: normalizedSchemaFile.bytes.byteLength,
    fileSha256: sha256Slice05Definition(normalizedSchemaFile.bytes),
  };
  const deliverySchemaRef = {
    path: "schemas/delivery-artifact.slice04.v0.schema.json",
    byteLength: deliverySchemaFile.bytes.byteLength,
    fileSha256: sha256Slice05Definition(deliverySchemaFile.bytes),
  };
  const goldSchemaRef = {
    path: "schemas/gold-record.slice05.v0.schema.json",
    byteLength: goldSchemaFile.bytes.byteLength,
    fileSha256: sha256Slice05Definition(goldSchemaFile.bytes),
  };
  const oracleResultSchemaRef = {
    path: "schemas/oracle-result.slice05.v0.schema.json",
    byteLength: oracleResultSchemaFile.bytes.byteLength,
    fileSha256: sha256Slice05Definition(oracleResultSchemaFile.bytes),
  };

  const sourceDescriptors = {};
  for (const [role, relative] of Object.entries(SOURCE_CODE_PATHS)) sourceDescriptors[role] = await readFileDescriptor(resolvedProjectRoot, relative);
  const adapterRef = implementationRef(ADAPTER_ID, sourceDescriptors.adapter);
  const workerRef = implementationRef(WORKER_ID, sourceDescriptors.worker);
  const oracleRef = implementationRef(ORACLE_ID, sourceDescriptors.oracle);
  const inventoryRef = implementationRef(INVENTORY_ID, sourceDescriptors.inventory);
  const generatorRef = implementationRef(GENERATOR_ID, sourceDescriptors.generator);
  const runnerRef = implementationRef(RUNNER_ID, sourceDescriptors.runner);
  const faultWorkerRef = implementationRef(FAULT_WORKER_ID, sourceDescriptors.faultWorker);

  const [slice04Candidate, slice04NormalizeContract, slice04ExportContract, slice04NormalizePlan, slice04ExportPlan] = await Promise.all([
    readExternalRecord(resolvedProjectRoot, SLICE04_PATHS.candidate, "candidateLockId", "REG-NORM-SHARP@0.4.0"),
    readExternalRecord(resolvedProjectRoot, SLICE04_PATHS.normalizeContract, "contractId", "CC-CAP02-NORMALIZE-PNG@0.4.0"),
    readExternalRecord(resolvedProjectRoot, SLICE04_PATHS.exportContract, "contractId", "CC-CAP02-EXPORT-PNG@0.4.0"),
    readExternalRecord(resolvedProjectRoot, SLICE04_PATHS.normalizePlan, "partitionPlanId", "PP-NORMALIZE-PNG@0.4.0"),
    readExternalRecord(resolvedProjectRoot, SLICE04_PATHS.exportPlan, "partitionPlanId", "PP-EXPORT-PNG@0.4.0"),
  ]);

  const inventory = runtimeInventory ?? await inventorySharpRuntimeSlice05({ projectRoot: resolvedProjectRoot });
  if (inventory.runtimeCandidateId !== CANDIDATE_ID || inventory.sourceCandidateMetadataRef !== "REG-NORM-SHARP@0.4.0"
      || inventory.executionBoundary.candidatePipelineInvoked !== false) {
    throw new Error("runtime inventory does not carry the frozen Slice 05 no-image candidate boundary");
  }
  const runtime = builder.addRecord(
    "runtime/attestation.win32-x64.v0.5.0.json",
    "runtimeAttestationId",
    {
      schemaVersion: "runtime-attestation-record.slice05.v0",
      runtimeAttestationId: RUNTIME_ID,
      recordVersion: VERSION,
      runtimeCandidateId: CANDIDATE_ID,
      sourceCandidateMetadataRef: {
        id: slice04Candidate.ref.id,
        path: slice04Candidate.ref.path,
        contentHash: slice04Candidate.ref.contentHash,
        fileSha256: slice04Candidate.ref.fileSha256,
      },
      inventoryRef: { ...inventoryRef, inventoryPayloadSha256: inventory.attestation.payloadSha256 },
      packageManifest: {
        path: inventory.packageManifest.path,
        sha256: inventory.packageManifest.sha256,
        exactDevDependencies: inventory.packageManifest.devDependencies,
      },
      packageLock: {
        path: inventory.packageLock.path,
        sha256: inventory.packageLock.sha256,
        expectedSha256: inventory.packageLock.expectedSha256,
        lockfileVersion: inventory.packageLock.lockfileVersion,
        pins: inventory.packageLock.pins,
      },
      installedClosure: {
        allowlist: inventory.installed.allowlist,
        packages: inventory.installed.packages,
        ignoredEmptyScopeDirectories: inventory.installed.ignoredEmptyScopeDirectories,
        fileCount: inventory.installed.tree.fileCount,
        treeSha256: inventory.installed.tree.sha256,
        nativeArtifacts: inventory.installed.nativeArtifacts,
      },
      versions: {
        installedVersionsJsonSha256: inventory.versions.installedVersionsJson.sha256,
        installed: inventory.versions.installedVersionsJson.values,
        sharpRuntime: inventory.versions.sharpRuntime.values,
        slice04PackagingMetadataErratum: inventory.versions.slice04PackagingMetadataComparison.differences.map((entry) => ({
          componentId: entry.componentId,
          slice04PackagingMetadataVersion: entry.slice04PackagingMetadataVersion,
          installedRuntimeVersion: entry.installedVersionsJsonVersion,
          disposition: entry.disposition,
        })),
      },
      environment: inventory.environment,
      executionBoundary: {
        sharpImportedForVersionsOnly: inventory.versions.sharpRuntime.importPerformed,
        imageBytesRead: false,
        imageDecoded: false,
        imageEncoded: false,
        candidatePipelineInvoked: false,
        hostnameRecorded: inventory.privacyBoundary.hostnameRecorded,
        serialRecorded: inventory.privacyBoundary.serialRecorded,
      },
      gateBStateAtDefinitionFreeze: "not-evaluated",
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      recordedAt: freeze,
      contentHash: "",
    },
    "runtime-attestation",
  );

  const hardware = builder.addRecord(
    "hardware/hardware.win32-x64.v0.5.0.json",
    "hardwareProfileId",
    {
      schemaVersion: "hardware-profile.slice05.v0",
      hardwareProfileId: HARDWARE_ID,
      recordVersion: VERSION,
      runtimeAttestationRef: runtime.ref,
      environment: inventory.environment,
      privacyBoundary: { hostnameRecorded: false, serialRecorded: false },
      stateAtDefinitionFreeze: "observed-and-pinned-not-a-portability-claim",
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      frozenAt: freeze,
      contentHash: "",
    },
    "hardware-profile",
  );

  const rights = builder.addRecord(
    "rights/open-synthetic.v0.5.0.json",
    "rightsRecordId",
    {
      schemaVersion: "rights-record.slice05.v0",
      rightsRecordId: RIGHTS_ID,
      recordVersion: VERSION,
      assetClass: "project-original-deterministic-synthetic-open-research-fixtures",
      provenance: {
        generatedLocally: true,
        thirdPartyAssetsUsed: false,
        realUserPhotosUsed: false,
        containsRealPerson: false,
        modelWeightsUsed: false,
        candidateOutputUsedToDefineGold: false,
        generatorId: GENERATOR_ID,
        generatorImplementationSha256: generatorRef.implementationSha256,
      },
      permissions: {
        repositoryStorage: true,
        publicDisplay: true,
        researchModification: true,
        fixtureRedistribution: true,
        permissionBasis: "project-original-authorship",
      },
      authorIds: ["role.fixture-gold-author"],
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      frozenAt: freeze,
      contentHash: "",
    },
    "rights-record",
  );

  const candidate = builder.addRecord(
    "candidate-locks/composite-sharp-win32-x64.v0.5.0.json",
    "candidateLockId",
    {
      schemaVersion: "candidate-lock.slice05.v0",
      candidateLockId: CANDIDATE_ID,
      recordVersion: VERSION,
      candidateKind: "installed-sharp-win32-x64-runtime-closure",
      sourceCandidateMetadataRef: slice04Candidate.ref,
      runtimeAttestationRef: runtime.ref,
      implementationRefs: [
        { role: "candidate-adapter", ref: adapterRef, candidateDependency: true },
        { role: "candidate-worker", ref: workerRef, candidateDependency: true },
        { role: "independent-oracle", ref: oracleRef, candidateDependency: false },
        { role: "runtime-inventory", ref: inventoryRef, candidateDependency: false },
        { role: "independent-fixture-generator", ref: generatorRef, candidateDependency: false },
      ],
      runtimeClosure: {
        packageLockSha256: inventory.packageLock.sha256,
        installedTreeSha256: inventory.installed.tree.sha256,
        nativeArtifactCount: inventory.installed.nativeArtifacts.length,
        installedVersionCount: inventory.versions.installedVersionsJson.componentCount,
        slice04PackagingMetadataErratumCount: inventory.versions.slice04PackagingMetadataComparison.differenceCount,
      },
      targetPlatform: { os: "win32", cpu: "x64", libc: "not-applicable" },
      stateAtDefinitionFreeze: {
        installation: "installed-and-inventoried",
        execution: "candidate-pipeline-not-run",
        gateA: "runtime-closure-resolved",
        gateB: "not-evaluated",
        calibration: "blocked-until-operation-specific-gate-b-pass",
      },
      prohibitedClaims: ["product-capability", "formal-c1", "holdout-evidence", "release-support"],
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      frozenAt: freeze,
      contentHash: "",
    },
    "candidate-lock",
  );

  const normalizeContract = builder.addRecord(
    "contracts/cc-cap02-normalize-png.v0.5.0.json",
    "contractId",
    makeContract({
      operation: "normalize",
      sourceContractRef: slice04NormalizeContract.ref,
      candidateRef: candidate.ref,
      runtimeRef: runtime.ref,
      adapterRef,
      workerRef,
      oracleRef,
      normalizedSchemaRef,
      deliverySchemaRef,
      runRequestSchemaRef: resultSchemaRefsByKey.get("runRequest"),
      runResultSchemaRef: resultSchemaRefsByKey.get("runResult"),
      oracleResultSchemaRef,
      frozenAt: freeze,
    }),
    "capability-contract",
  );
  const exportContract = builder.addRecord(
    "contracts/cc-cap02-export-png.v0.5.0.json",
    "contractId",
    makeContract({
      operation: "export",
      sourceContractRef: slice04ExportContract.ref,
      candidateRef: candidate.ref,
      runtimeRef: runtime.ref,
      adapterRef,
      workerRef,
      oracleRef,
      normalizedSchemaRef,
      deliverySchemaRef,
      runRequestSchemaRef: resultSchemaRefsByKey.get("runRequest"),
      runResultSchemaRef: resultSchemaRefsByKey.get("runResult"),
      oracleResultSchemaRef,
      frozenAt: freeze,
    }),
    "capability-contract",
  );

  const normalizeDevRow = slice04NormalizePlan.record.partitions.find(({ partition }) => partition === "dev/calibration");
  const normalizeDefectRow = slice04NormalizePlan.record.partitions.find(({ partition }) => partition === "defect/calibration");
  const exportDevRow = slice04ExportPlan.record.partitions.find(({ partition }) => partition === "dev/calibration");
  const exportDefectRow = slice04ExportPlan.record.partitions.find(({ partition }) => partition === "defect/calibration");
  if (![normalizeDevRow, normalizeDefectRow, exportDevRow, exportDefectRow].every(Boolean)) {
    throw new Error("Slice 04 open calibration row lineage is incomplete");
  }

  const commonFixtureArgs = {
    builder,
    rightsRef: rights.ref,
    candidateRef: candidate.ref,
    normalizeContractRef: normalizeContract.ref,
    exportContractRef: exportContract.ref,
    runtimeRef: runtime.ref,
    hardwareRef: hardware.ref,
    adapterRef,
    generatorRef,
    frozenAt: freeze,
  };
  const normalizeSmoke = await buildFixtureManifest({ ...commonFixtureArgs, operation: "normalize", partition: "smoke", row: normalizeDevRow });
  const exportSmoke = await buildFixtureManifest({ ...commonFixtureArgs, operation: "export", partition: "smoke", row: exportDevRow });
  const normalizeDev = await buildFixtureManifest({ ...commonFixtureArgs, operation: "normalize", partition: "dev/calibration", row: normalizeDevRow });
  const normalizeDefect = await buildFixtureManifest({ ...commonFixtureArgs, operation: "normalize", partition: "defect/calibration", row: normalizeDefectRow });
  const exportDev = await buildFixtureManifest({ ...commonFixtureArgs, operation: "export", partition: "dev/calibration", row: exportDevRow });
  const exportDefect = await buildFixtureManifest({ ...commonFixtureArgs, operation: "export", partition: "defect/calibration", row: exportDefectRow });

  const coreImplementationRefs = [
    { role: "candidate-adapter", ref: adapterRef },
    { role: "candidate-worker", ref: workerRef },
    { role: "independent-oracle", ref: oracleRef },
    { role: "runtime-inventory", ref: inventoryRef },
    { role: "independent-fixture-generator", ref: generatorRef },
    { role: "local-open-runner", ref: runnerRef },
    { role: "fault-semantics-worker", ref: faultWorkerRef },
  ];
  const gateB = builder.addRecord(
    "plans/gate-b-smoke.v0.5.0.json",
    "gateBPlanId",
    {
      schemaVersion: "gate-b-smoke-plan.slice05.v0",
      gateBPlanId: GATE_B_PLAN_ID,
      recordVersion: VERSION,
      candidateRef: candidate.ref,
      runtimeAttestationRef: runtime.ref,
      hardwareRef: hardware.ref,
      implementationRefs: coreImplementationRefs,
      resultSchemaRefs,
      goldRecordSchemaRef: goldSchemaRef,
      operationPlans: [
        {
          operation: "normalize",
          contractRef: normalizeContract.ref,
          smokeManifestRef: normalizeSmoke.ref,
          sourceCount: 6,
          applicableSources: 3,
          rejectionSources: 3,
          repetitionsPerSource: 3,
          initialGateBState: "not-evaluated",
          conjunctiveGates: gateConjuncts("normalize"),
          cases: normalizeSmoke.entries.map(({ sourceId, categoryId, expectedDisposition, expectedStableErrorCode }) => ({ sourceId, categoryId, expectedDisposition, expectedStableErrorCode })),
          passRule: "every-conjunct-must-pass-with-no-aggregation-no-majority-and-no-valid-outcome-rerun",
          calibrationAdmissionOnPass: "only-this-operation-open-calibration-may-run",
        },
        {
          operation: "export",
          contractRef: exportContract.ref,
          smokeManifestRef: exportSmoke.ref,
          sourceCount: 6,
          applicableSources: 3,
          rejectionSources: 3,
          repetitionsPerSource: 3,
          initialGateBState: "not-evaluated",
          conjunctiveGates: gateConjuncts("export"),
          cases: exportSmoke.entries.map(({ sourceId, categoryId, expectedDisposition, expectedStableErrorCode }) => ({ sourceId, categoryId, expectedDisposition, expectedStableErrorCode })),
          passRule: "every-conjunct-must-pass-with-no-aggregation-no-majority-and-no-valid-outcome-rerun",
          calibrationAdmissionOnPass: "only-this-operation-open-calibration-may-run",
        },
      ],
      crossOperationAggregationAllowed: false,
      smokeCountsAsCapabilityEvidence: false,
      formalPartitionsCreatedAtDefinitionFreeze: false,
      resultsStateAtDefinitionFreeze: "not-created",
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      frozenAt: freeze,
      contentHash: "",
    },
    "gate-b-smoke-plan",
  );

  const normalizeOpenPlan = builder.addRecord(
    "plans/open-partition-normalize.v0.5.0.json",
    "partitionPlanId",
    buildOpenPlan({
      operation: "normalize",
      sourcePlan: slice04NormalizePlan.record,
      sourcePlanRef: slice04NormalizePlan.ref,
      candidateRef: candidate.ref,
      contractRef: normalizeContract.ref,
      manifestRefs: [normalizeDev.ref, normalizeDefect.ref],
      frozenAt: freeze,
    }),
    "open-partition-plan",
  );
  const exportOpenPlan = builder.addRecord(
    "plans/open-partition-export.v0.5.0.json",
    "partitionPlanId",
    buildOpenPlan({
      operation: "export",
      sourcePlan: slice04ExportPlan.record,
      sourcePlanRef: slice04ExportPlan.ref,
      candidateRef: candidate.ref,
      contractRef: exportContract.ref,
      manifestRefs: [exportDev.ref, exportDefect.ref],
      frozenAt: freeze,
    }),
    "open-partition-plan",
  );

  const normalizePrereg = builder.addRecord(
    "preregistrations/calibration-normalize-png.v0.5.0.json",
    "preregistrationId",
    makeCalibrationPreregistration({
      operation: "normalize",
      candidateRef: candidate.ref,
      runtimeRef: runtime.ref,
      contractRef: normalizeContract.ref,
      gateBRef: gateB.ref,
      planRef: normalizeOpenPlan.ref,
      manifestRefs: [normalizeDev.ref, normalizeDefect.ref],
      oracleRef,
      goldRecordSchemaRef: goldSchemaRef,
      frozenAt: freeze,
    }),
    "calibration-preregistration",
  );
  const exportPrereg = builder.addRecord(
    "preregistrations/calibration-export-png.v0.5.0.json",
    "preregistrationId",
    makeCalibrationPreregistration({
      operation: "export",
      candidateRef: candidate.ref,
      runtimeRef: runtime.ref,
      contractRef: exportContract.ref,
      gateBRef: gateB.ref,
      planRef: exportOpenPlan.ref,
      manifestRefs: [exportDev.ref, exportDefect.ref],
      oracleRef,
      goldRecordSchemaRef: goldSchemaRef,
      frozenAt: freeze,
    }),
    "calibration-preregistration",
  );

  const descendantFiles = [
    ...[...builder.files.entries()].map(([relative, value]) => ({
      path: relative,
      classification: value.classification,
      byteLength: value.bytes.byteLength,
      fileSha256: sha256Slice05Definition(value.bytes),
    })),
    ...[...stableSchemaFiles.entries()].map(([relative, value]) => ({
      path: relative,
      classification: value.classification,
      byteLength: value.bytes.byteLength,
      fileSha256: sha256Slice05Definition(value.bytes),
    })),
  ].sort((a, b) => compareText(a.path, b.path));
  const descendantTreeSha256 = digestMachineFiles(descendantFiles);
  const schemaCount = descendantFiles.filter(({ classification }) => classification === "schema").length;
  const index = builder.addRecord(
    "definition-index.v0.5.0.json",
    "definitionIndexId",
    {
      schemaVersion: "definition-index.slice05.v0",
      definitionIndexId: "DEFINITION-INDEX-SLICE05@0.5.0",
      recordVersion: VERSION,
      definitionState: "frozen-definition-no-results",
      frozenAt: freeze,
      runtimeAttestationRef: { ...runtime.ref, inventoryPayloadSha256: inventory.attestation.payloadSha256 },
      candidateRef: candidate.ref,
      contractRefs: [normalizeContract.ref, exportContract.ref],
      implementationRefs: coreImplementationRefs,
      hardwareRef: hardware.ref,
      gateBSmokePlanRef: gateB.ref,
      smokeManifestRefs: [
        { operation: "normalize", ref: normalizeSmoke.ref },
        { operation: "export", ref: exportSmoke.ref },
      ],
      openPartitionPlanRefs: [normalizeOpenPlan.ref, exportOpenPlan.ref],
      calibrationPreregistrationRefs: [normalizePrereg.ref, exportPrereg.ref],
      calibrationManifestRefs: [normalizeDev.ref, normalizeDefect.ref, exportDev.ref, exportDefect.ref],
      rightsRef: rights.ref,
      proseReadmeRef: {
        path: "README.md",
        byteLength: proseReadmeDescriptor.byteLength,
        fileSha256: proseReadmeDescriptor.fileSha256,
      },
      expectedOptionalResults,
      initialResultStateAtDefinitionFreeze: {
        resultsDirectoryPresent: false,
        resultFilesPresent: 0,
        admissionRecordsPresent: 0,
        ledgersPresent: 0,
      },
      machineTree: {
        algorithm: "sha256(sorted(slice-root-relative-path+NUL+decimal-byte-length+NUL+file-sha256+NUL))",
        rootSelfExcludedToAvoidCircularHash: true,
        proseReadmeExcludedAndSeparatelyPinned: true,
        fileCount: descendantFiles.length,
        sha256: descendantTreeSha256,
        files: descendantFiles,
      },
      counts: {
        schemas: schemaCount,
        manifests: 6,
        sourceProvenanceRecords: 108,
        openRawAssets: 108,
        normalizedInputArtifactRecords: 54,
        applicableIndependentNormalizedInputs: 27,
        goldRecords: 54,
        formalFixtures: 0,
        generatedResults: 0,
      },
      evidenceBoundary: { ...EVIDENCE_BOUNDARY },
      contentHash: "",
    },
    "definition-index",
  );

  const expectedPaths = new Set([...builder.files.keys(), ...STABLE_SCHEMA_PATHS]);
  await prepareSafeRegeneration(resolvedSliceRoot, expectedPaths);
  await writeBuilderFiles(resolvedSliceRoot, builder);

  return {
    sliceRoot: resolvedSliceRoot,
    frozenAt: freeze,
    definitionIndexContentHash: index.record.contentHash,
    definitionIndexFileSha256: index.ref.fileSha256,
    proseReadmeSha256: proseReadmeDescriptor.fileSha256,
    descendantTreeSha256,
    descendantFileCount: descendantFiles.length,
    schemaCount,
    manifestCount: 6,
    sourceCount: 108,
    rawAssetCount: 108,
    normalizedInputArtifactCount: 54,
    goldRecordCount: 54,
    resultCount: 0,
  };
}

async function main() {
  if (process.argv.includes("--schemas-only")) {
    const result = await generateSlice05Schemas();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const freezeArg = process.argv.find((arg) => arg.startsWith("--frozen-at="));
  const result = await generateSlice05({ frozenAt: freezeArg ? freezeArg.slice("--frozen-at=".length) : SLICE05_FROZEN_AT });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await main();
