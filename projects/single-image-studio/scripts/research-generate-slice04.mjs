import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);

export const DEFAULT_SLICE04_ROOT = path.resolve(SCRIPT_DIR, "../research/slice-04");
const SLICE04_FROZEN_AT = "2026-08-15T00:20:45.916Z";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringifySlice04(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function sha256Slice04(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHashSlice04(record) {
  const copy = structuredClone(record);
  delete copy.contentHash;
  return sha256Slice04(Buffer.from(stableStringifySlice04(copy), "utf8"));
}

function freezeRecord(record) {
  return { ...record, contentHash: contentHashSlice04(record) };
}

function ref(pathname, record, idField) {
  return {
    path: pathname,
    id: record[idField],
    contentHash: record.contentHash,
  };
}

const EVIDENCE_BOUNDARY = Object.freeze({
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

const ARTIFACTS = Object.freeze([
  {
    artifactId: "npm:sharp@0.35.3",
    packageName: "sharp",
    version: "0.35.3",
    tarballUrl: "https://registry.npmjs.org/sharp/-/sharp-0.35.3.tgz",
    npmIntegrity: "sha512-ej0zVHuZGHCiABXcNxeYhpRnPNPAcvbG8RMdBAhDAxLKkCRVSpK3Iyu7qbqw3JMzoj0REeM6f3tJLtVwl0023Q==",
    byteLength: 214036,
    sha256: "53637f5503f81d10b02097eca6f94c44e69d92ba7ef759f268a0c4ea1d06ae54",
    license: "Apache-2.0",
    role: "javascript-wrapper-source-package",
  },
  {
    artifactId: "npm:@img/sharp-win32-x64@0.35.3",
    packageName: "@img/sharp-win32-x64",
    version: "0.35.3",
    tarballUrl: "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.3.tgz",
    npmIntegrity: "sha512-D4y1vNeZrIIJCN+uHaWVtH86B+aCrdMYYjicy9pXHvbGZeGYLLSd3wdVuC37FxVXlU1ARsk84eKWfWMXGYEqvA==",
    byteLength: 8434051,
    sha256: "f0f81118ad4557cceb6c4f90adaf252926e7cd3f6cd3d7040053d4bba088e940",
    license: "Apache-2.0 AND LGPL-3.0-or-later",
    role: "win32-x64-native-addon-package",
  },
  {
    artifactId: "npm:@img/sharp-libvips-win32-x64@1.3.2",
    packageName: "@img/sharp-libvips-win32-x64",
    version: "1.3.2",
    tarballUrl: "https://registry.npmjs.org/@img/sharp-libvips-win32-x64/-/sharp-libvips-win32-x64-1.3.2.tgz",
    npmIntegrity: "sha512-T10FUimHrO/JzFNo26IS1N0wZBVGI9VCyxZHkkmhv8ayeUAHURaONXbqWK8S/uy0IDe5QCY7XuiCbMNovL1m6g==",
    byteLength: 8209445,
    sha256: "bcae355919358e0406c1674d0beaf841e9b11f321f8a54b927cddf4935c27668",
    license: "LGPL-3.0-or-later",
    role: "packaging-provenance-only-not-runtime",
  },
  {
    artifactId: "npm:@img/colour@1.1.0",
    packageName: "@img/colour",
    version: "1.1.0",
    tarballUrl: "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz",
    npmIntegrity: "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==",
    byteLength: 17410,
    sha256: "6c2df3ac33d4b8647191ad8942a579e6004be00c25846677eab85f04702d85b1",
    license: "MIT",
    role: "sharp-runtime-dependency",
  },
  {
    artifactId: "npm:detect-libc@2.1.2",
    packageName: "detect-libc",
    version: "2.1.2",
    tarballUrl: "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
    npmIntegrity: "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
    byteLength: 7776,
    sha256: "270dec0fc06cff86481da8af2dd8f18dee6b602790b14ef0e1c2c18d7da39427",
    license: "Apache-2.0",
    role: "sharp-runtime-dependency",
  },
  {
    artifactId: "npm:semver@7.8.5",
    packageName: "semver",
    version: "7.8.5",
    tarballUrl: "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
    npmIntegrity: "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
    byteLength: 29399,
    sha256: "d85045d4300d7d57c891336b95df532e73f34c22ffcd222452b6d08b9d127d5d",
    license: "ISC",
    role: "sharp-runtime-dependency",
  },
].map((artifact) => ({
  ...artifact,
  obtainedAt: "2026-08-15",
  acquisitionState: "hash-verified-temporary-not-retained",
})));

const NATIVE_VERSIONS = Object.freeze({
  aom: "3.14.1",
  archive: "3.8.8",
  cairo: "1.18.4",
  cgif: "0.5.3",
  exif: "0.6.26",
  expat: "2.8.2",
  ffi: "3.6.0",
  fontconfig: "2.18.1",
  freetype: "2.14.3",
  fribidi: "1.0.16",
  glib: "2.89.1",
  harfbuzz: "14.2.1",
  heif: "1.23.1",
  highway: "1.4.0",
  imagequant: "2.4.1",
  lcms: "2.19.1",
  mozjpeg: "0826579",
  pango: "1.58.0",
  pixman: "0.46.4",
  png: "1.6.58",
  "proxy-libintl": "0.5",
  rsvg: "2.62.90",
  tiff: "d01a94b",
  uhdr: "1acdbed",
  vips: "8.18.3",
  webp: "1.6.0",
  xml2: "2.15.3",
  "zlib-ng": "2.3.3",
});

const NATIVE_LICENSES = Object.freeze([
  { componentId: "aom", usedUnder: "BSD-2-Clause + Alliance for Open Media Patent License 1.0" },
  { componentId: "archive", usedUnder: "BSD-2-Clause" },
  { componentId: "cairo", usedUnder: "MPL-2.0" },
  { componentId: "cgif", usedUnder: "MIT" },
  { componentId: "exif", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "expat", usedUnder: "MIT" },
  { componentId: "ffi", usedUnder: "MIT" },
  { componentId: "fontconfig", usedUnder: "fontconfig-BSD-like" },
  { componentId: "freetype", usedUnder: "FreeType-BSD-like" },
  { componentId: "fribidi", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "glib", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "harfbuzz", usedUnder: "MIT" },
  { componentId: "heif", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "highway", usedUnder: "BSD-3-Clause" },
  { componentId: "imagequant", usedUnder: "BSD-2-Clause" },
  { componentId: "lcms", usedUnder: "MIT" },
  { componentId: "mozjpeg", usedUnder: "zlib + IJG + BSD-3-Clause" },
  { componentId: "pango", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "pixman", usedUnder: "MIT" },
  { componentId: "png", usedUnder: "libpng" },
  { componentId: "proxy-libintl", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "rsvg", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "tiff", usedUnder: "libtiff-BSD-like" },
  { componentId: "uhdr", usedUnder: "MIT" },
  { componentId: "vips", usedUnder: "LGPLv3-via-upstream-any-later" },
  { componentId: "webp", usedUnder: "New-BSD" },
  { componentId: "xml2", usedUnder: "MIT" },
  { componentId: "zlib-ng", usedUnder: "zlib" },
]);

const candidateLock = freezeRecord({
  schemaVersion: "candidate-lock.slice04.v0",
  candidateLockId: "REG-NORM-SHARP@0.4.0",
  recordVersion: "0.4.0",
  frozenAt: SLICE04_FROZEN_AT,
  observedAt: "2026-08-15",
  registryId: "REG-NORM-SHARP",
  candidateKind: "composite-sharp-with-bundled-libvips",
  compositeCandidateCount: 1,
  comparisonArmIds: ["REG-NORM-SHARP@0.4.0"],
  sourceState: "source-resolved",
  gateAState: "source-resolved",
  gateBState: "not-entered",
  installationState: "not-installed",
  executionState: "not-run",
  productSupport: false,
  targetPlatform: { os: "win32", cpu: "x64", libc: "not-applicable" },
  sourceRepositories: [
    {
      componentId: "sharp",
      sourceUrl: "https://github.com/lovell/sharp",
      tag: "v0.35.3",
      version: "0.35.3",
      commit: "1018449164723ba0203c1beffaba0e21f7829c18",
      license: "Apache-2.0",
      archiveDownloaded: false,
    },
    {
      componentId: "sharp-libvips-packaging",
      sourceUrl: "https://github.com/lovell/sharp-libvips",
      tag: "v1.3.2",
      version: "1.3.2",
      commit: "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6",
      license: "Apache-2.0",
      archiveDownloaded: false,
    },
    {
      componentId: "libvips-upstream",
      sourceUrl: "https://github.com/libvips/libvips",
      tag: "v8.18.3",
      version: "8.18.3",
      commit: "3664cfc5dc2c5661288f5bf5a85ccc51c64c1626",
      license: "LGPL-2.1-or-later",
      archiveDownloaded: false,
    },
  ],
  artifacts: ARTIFACTS,
  dependencyEdges: [
    { from: "npm:sharp@0.35.3", to: "npm:@img/colour@1.1.0", kind: "runtime" },
    { from: "npm:sharp@0.35.3", to: "npm:detect-libc@2.1.2", kind: "runtime" },
    { from: "npm:sharp@0.35.3", to: "npm:semver@7.8.5", kind: "runtime" },
    { from: "npm:sharp@0.35.3", to: "npm:@img/sharp-win32-x64@0.35.3", kind: "platform-optional" },
    { from: "npm:@img/sharp-win32-x64@0.35.3", to: "npm:@img/sharp-libvips-win32-x64@1.3.2", kind: "provenance-lock-not-runtime" },
  ],
  bundledNativeVersionsSource: {
    actualRuntimeArtifactId: "npm:@img/sharp-win32-x64@0.35.3",
    packagingSourceArtifactId: "npm:@img/sharp-libvips-win32-x64@1.3.2",
    metadataFile: "versions.properties",
    noticeFile: "THIRD-PARTY-NOTICES.md",
    metadataSources: {
      versionsProperties: {
        sourceCommit: "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6",
        sourcePath: "versions.properties",
        immutableRawUrl: "https://raw.githubusercontent.com/lovell/sharp-libvips/4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6/versions.properties",
        byteLength: 599,
        sha256: "cebb421de9568ae3ce8cfd66be62c3da53c2d549232c2e4327d9a9f97276c237",
      },
      thirdPartyNotices: {
        sourceCommit: "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6",
        sourcePath: "THIRD-PARTY-NOTICES.md",
        immutableRawUrl: "https://raw.githubusercontent.com/lovell/sharp-libvips/4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6/THIRD-PARTY-NOTICES.md",
        byteLength: 4230,
        sha256: "25ffcfa69e28b1913ced27ec778b90f24911a1bb3021253577e8b0af55db0d49",
      },
    },
    noticeSummary: {
      bundledPackageDeclares: "LGPL-3.0-or-later",
      upstreamLibvipsDeclares: "LGPL-2.1-or-later",
      anyLaterExplanationSource: "THIRD-PARTY-NOTICES.md lines 35-36",
      anyLaterExplanation: "bundled LGPLv3 notices rely on the upstream LGPL v2 or v2.1 any-later option; package and upstream declarations remain distinct",
      componentLicenses: NATIVE_LICENSES,
      futureDistributionReviewState: "not-complete-blocks-release",
    },
    copiedIntoRepository: false,
    nativeVersionCount: 28,
    versions: NATIVE_VERSIONS,
  },
  licenseBoundary: {
    packageDeclarationsRemainDistinct: true,
    thirdPartyNoticeRequiredForFutureDistribution: true,
    bundledLibvipsIsIndependentArm: false,
    standaloneLibvipsState: "pending-freeze",
    releaseLicenseReviewState: "not-complete",
  },
  acquisitionBoundary: {
    temporaryDirectory: ".tmp/slice04-artifacts",
    tarballsDownloadedForHashOnly: true,
    tarballsDeletedAfterHash: true,
    tarballsUnpacked: false,
    tarballsExecuted: false,
    packagesInstalled: false,
    artifactsRetained: false,
    githubSourceArchivesDownloaded: false,
  },
  modelWeightsTrainingData: "not-applicable",
  evidenceBoundary: EVIDENCE_BOUNDARY,
});

const FORMAT_ORDER = Object.freeze([
  ["input", "png"], ["input", "jpeg"], ["input", "webp"], ["input", "heic"],
  ["input", "heif"], ["input", "avif"], ["input", "gif"], ["input", "apng"],
  ["input", "tiff"], ["input", "svg"], ["input", "pdf"], ["input", "raw"],
  ["output", "png"], ["output", "jpeg"], ["output", "webp"],
]);

const MEDIA_TYPES = Object.freeze({
  png: ["image/png"], jpeg: ["image/jpeg"], webp: ["image/webp"],
  heic: ["image/heic"], heif: ["image/heif"], avif: ["image/avif"],
  gif: ["image/gif"], apng: ["image/apng"], tiff: ["image/tiff"],
  svg: ["image/svg+xml"], pdf: ["application/pdf"], raw: ["application/octet-stream"],
});

const EXTENSIONS = Object.freeze({
  png: [".png"], jpeg: [".jpg", ".jpeg"], webp: [".webp"], heic: [".heic"],
  heif: [".heif"], avif: [".avif"], gif: [".gif"], apng: [".apng"],
  tiff: [".tif", ".tiff"], svg: [".svg"], pdf: [".pdf"], raw: [".raw"],
});

const formatRows = FORMAT_ORDER.map(([direction, formatId]) => {
  const canonicalPngTarget = formatId === "png";
  return {
    rowId: `${direction}:${formatId}`,
    direction,
    formatId,
    mediaTypes: MEDIA_TYPES[formatId],
    extensions: EXTENSIONS[formatId],
    disposition: canonicalPngTarget ? "target-not-implemented" : "reject",
    implementationState: "not-installed",
    executionState: "not-run",
    probeAllowed: false,
    passthroughAllowed: false,
    fallbackAllowed: false,
    reopenRequired: canonicalPngTarget,
    profile: canonicalPngTarget ? {
      byteLimit: 1048576,
      widthLimit: 256,
      heightLimit: 256,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
    } : null,
    rejectionCode: canonicalPngTarget
      ? `S04_${direction.toUpperCase()}_PNG_TARGET_NOT_IMPLEMENTED`
      : `S04_${direction.toUpperCase()}_${formatId.toUpperCase()}_REJECTED`,
    productSupport: false,
    gateBState: "not-entered",
    evidenceLevel: "C0",
  };
});

const formatTarget = freezeRecord({
  schemaVersion: "format-target.slice04.v0",
  formatTargetId: "FT-NORMALIZE-DELIVER@0.4.0",
  recordVersion: "0.4.0",
  frozenAt: SLICE04_FROZEN_AT,
  suiteId: "NORMALIZE-DELIVER",
  candidateLockRef: ref("candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock, "candidateLockId"),
  rowCount: 15,
  rows: formatRows,
  productSupport: false,
  gateBState: "not-entered",
  evidenceBoundary: EVIDENCE_BOUNDARY,
});

const qaProfile = freezeRecord({
  schemaVersion: "qa-profile.slice04.v0",
  qaProfileId: "QA-NORMALIZE-DELIVER@0.4.0",
  recordVersion: "0.4.0",
  frozenAt: SLICE04_FROZEN_AT,
  suiteId: "NORMALIZE-DELIVER",
  profileKind: "offline-evidence-qa-metadata-only",
  candidateLockRef: ref("candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock, "candidateLockId"),
  formatTargetRef: ref("profiles/format-target.normalize-deliver.v0.4.0.json", formatTarget, "formatTargetId"),
  implementationState: "not-created",
  executionState: "not-run",
  oracle: {
    source: "future-operation-specific-independent-oracles-with-slice03-byte-observer-design-lineage",
    designLineageRef: {
      observerContractRef: "S03-TECHNICAL-OBSERVER@0.3.0",
      observerContractSha256: "c9af17a228099f4da4e1e840b9ecaf876815bf906de18ae53cda69047259191a",
      observerImplementationRef: "sha256:99596ad7030ae8db2e9861d0dae1689448221ca7876ef94fbf9e04f5fdbbf0e3",
      observerDeclaredFrozenAt: "2026-08-14T19:47:13.000Z",
      compatibilityState: "reference-only-not-compatible-with-slice04-contracts",
      incompatibilities: [
        "hardcodes-CC-CAP02-NORMALIZE-at-0.2.0",
        "accepts-NormalizedImage-only-not-DeliveryArtifact",
      ],
    },
    operationPrerequisites: [
      {
        prerequisiteId: "ORACLE-PREREQ-NORMALIZE-PNG@0.4.0",
        operation: "normalize",
        requiredContractId: "CC-CAP02-NORMALIZE-PNG@0.4.0",
        requiredArtifactType: "NormalizedImage.slice04.v0",
        requiredArtifactSchemaId: "normalized-image.slice04.v0.schema.json",
        artifactSchemaState: "not-created-blocks-gate-b",
        state: "not-created-blocks-gate-b",
        independentImplementationHashState: "not-created",
        independentGoldState: "not-created",
      },
      {
        prerequisiteId: "ORACLE-PREREQ-EXPORT-PNG@0.4.0",
        operation: "export",
        requiredContractId: "CC-CAP02-EXPORT-PNG@0.4.0",
        requiredArtifactType: "DeliveryArtifact.slice04.v0",
        requiredArtifactSchemaId: "delivery-artifact.slice04.v0.schema.json",
        artifactSchemaState: "not-created-blocks-gate-b",
        state: "not-created-blocks-gate-b",
        independentImplementationHashState: "not-created",
        independentGoldState: "not-created",
      },
    ],
    futureGoldSourceRule: "project-original-independent-source-or-frozen-reference-program-not-authored-by-candidate-team",
    candidateMaySelfCertify: false,
    candidateMayProduceGold: false,
    candidateOutputMayDefineGold: false,
    candidateDecoderMayBeSoleOracle: false,
    actualBytesReopenRequired: true,
    independentDecodedPixelIdentityRequired: true,
  },
  checks: [
    "mime-and-signature", "dimensions", "orientation", "embedded-srgb",
    "rgba8", "straight-alpha", "metadata-policy", "file-sha256", "decoded-pixel-sha256",
  ],
  checksByOperation: {
    normalize: [
      "source-bytes-policy", "normalized-artifact-shape", "normalized-parent-identity",
      "normalized-bytes-reopen", "normalized-file-and-decoded-pixel-hash", "normalized-metadata-policy",
    ],
    export: [
      "normalized-input-artifact-shape-and-identity", "delivery-artifact-shape",
      "delivery-bytes-reopen", "delivery-file-and-decoded-pixel-hash", "delivery-metadata-policy",
    ],
  },
  outcomeClasses: [
    "pass", "false-reject", "false-allow", "invalid", "failure", "timeout", "cancelled", "missing", "unknown",
  ],
  thresholds: {
    applicableAcceptanceRate: { operator: "exactly", value: 1 },
    defectRejectionRate: { operator: "exactly", value: 1 },
    identityMatchRate: { operator: "exactly", value: 1 },
    falseRejectRate: { operator: "exactly", value: 0 },
    falseAllowRate: { operator: "exactly", value: 0 },
    failureRate: { operator: "exactly", value: 0 },
    timeoutRate: { operator: "exactly", value: 0 },
    cancelledRate: { operator: "exactly", value: 0 },
    missingRate: { operator: "exactly", value: 0 },
    unknownRate: { operator: "exactly", value: 0 },
    catastrophicFailureTolerance: 0,
    allCategoriesMustPass: true,
  },
  productSupport: false,
  gateBState: "not-entered",
  evidenceBoundary: EVIDENCE_BOUNDARY,
});

const commonImplementation = Object.freeze({
  implementationState: "not-installed",
  adapterRef: null,
  adapterSha256: null,
  runnerRef: null,
  namedHardware: null,
  installed: false,
  executed: false,
  passthroughAllowed: false,
  fallbackAllowed: false,
  actualOutputBytesReopenRequired: true,
});

function makeContract({ contractId, operation, inputType, outputType, rowId }) {
  return freezeRecord({
    schemaVersion: "capability-contract.slice04.v0",
    contractId,
    recordVersion: "0.4.0",
    frozenAt: SLICE04_FROZEN_AT,
    capabilityId: "CAP-02",
    suiteId: "NORMALIZE-DELIVER",
    operation,
    status: "metadata-only-source-resolved-non-gate-b",
    candidateLockRef: ref("candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock, "candidateLockId"),
    formatTargetRef: ref("profiles/format-target.normalize-deliver.v0.4.0.json", formatTarget, "formatTargetId"),
    qaProfileRef: ref("preregistrations/qa-profile.normalize-deliver.v0.4.0.json", qaProfile, "qaProfileId"),
    formatRowId: rowId,
    input: {
      type: inputType,
      maxBytes: 1048576,
      maxWidth: 256,
      maxHeight: 256,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
    },
    output: {
      type: outputType,
      mediaType: "image/png",
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      metadataPolicy: "strip-all-except-color-contract",
    },
    implementation: commonImplementation,
    failureSemantics: {
      failClosed: true,
      artifactOnFailure: false,
      validResultRerunAllowed: false,
      unsupportedFormatsRejectBeforeDecodeOrEncode: true,
      stableErrorCodeRequired: true,
    },
    productSupport: false,
    gateBState: "not-entered",
    c1State: "not-evaluated",
    evidenceBoundary: EVIDENCE_BOUNDARY,
  });
}

const normalizeContract = makeContract({
  contractId: "CC-CAP02-NORMALIZE-PNG@0.4.0",
  operation: "normalize",
  inputType: "canonical-png-source-bytes",
  outputType: "NormalizedImage.slice04.v0",
  rowId: "input:png",
});

const exportContract = makeContract({
  contractId: "CC-CAP02-EXPORT-PNG@0.4.0",
  operation: "export",
  inputType: "NormalizedImage.slice04.v0",
  outputType: "DeliveryArtifact.slice04.v0",
  rowId: "output:png",
});

function categoryRows(operation, minimumApplicable, minimumRejection, minimumDifficult, defectSpecific) {
  const normalize = operation === "normalize";
  return {
    applicableCategories: [
      { categoryId: normalize ? (defectSpecific ? "injected-defect-control-opaque-source-png" : "canonical-opaque-source-png") : (defectSpecific ? "injected-defect-control-opaque-normalized-artifact" : "valid-opaque-normalized-artifact"), minimumIndependentSources: minimumApplicable },
      { categoryId: normalize ? (defectSpecific ? "injected-defect-control-partial-alpha-source-png" : "canonical-partial-alpha-source-png") : (defectSpecific ? "injected-defect-control-partial-alpha-normalized-artifact" : "valid-partial-alpha-normalized-artifact"), minimumIndependentSources: minimumApplicable },
      { categoryId: normalize ? (defectSpecific ? "injected-defect-control-alpha-holes-source-png" : "canonical-alpha-holes-source-png") : (defectSpecific ? "injected-defect-control-alpha-holes-normalized-artifact" : "valid-alpha-holes-normalized-artifact"), minimumIndependentSources: minimumApplicable },
    ],
    rejectionCategories: [
      { categoryId: normalize ? (defectSpecific ? "injected-container-signature-or-crc-defect" : "container-signature-or-crc-invalid") : (defectSpecific ? "injected-normalized-artifact-shape-or-contract-defect" : "normalized-artifact-shape-or-contract-invalid"), minimumIndependentSources: minimumRejection },
      { categoryId: normalize ? (defectSpecific ? "injected-pixel-layout-color-or-metadata-defect" : "pixel-layout-color-or-metadata-invalid") : (defectSpecific ? "injected-parent-identity-file-or-pixel-hash-defect" : "parent-identity-file-or-pixel-hash-invalid"), minimumIndependentSources: minimumRejection },
      { categoryId: normalize ? (defectSpecific ? "injected-resource-limit-or-unsupported-format-defect" : "resource-limit-or-unsupported-format") : (defectSpecific ? "injected-color-alpha-or-metadata-defect" : "color-alpha-or-metadata-invalid"), minimumIndependentSources: minimumRejection },
    ],
    difficultCategories: [
      { categoryId: normalize ? "one-pixel-source-boundary" : "one-pixel-normalized-artifact-boundary", minimumIndependentSources: minimumDifficult },
      { categoryId: normalize ? "maximum-dimension-source-boundary" : "maximum-dimension-normalized-artifact-boundary", minimumIndependentSources: minimumDifficult },
      { categoryId: normalize ? "source-alpha-extremes-and-thin-holes" : "normalized-alpha-extremes-and-thin-holes", minimumIndependentSources: minimumDifficult },
    ],
  };
}

const ALLOWED_INVALID_REASONS = Object.freeze([
  "runner-crash-before-result",
  "custody-interruption",
  "integrity-check-failure",
]);

function partitionRow({ operation, partition, total, applicable, rejection, categoryApplicable, categoryRejection, difficult, countKind }) {
  const defectSpecific = partition.startsWith("defect/");
  const escape = partition === "escape";
  const formal = partition === "holdout" || partition === "defect/holdout";
  const evidenceRole = partition === "dev/calibration" ? "open-calibration"
    : partition === "holdout" ? "sealed-independent-c1"
      : partition === "defect/calibration" ? "open-defect-calibration"
        : partition === "defect/holdout" ? "sealed-independent-c1-qa"
          : "diagnostic-invalidation-ledger";
  const sourceKind = operation === "normalize" ? "raw source PNG bytes" : "NormalizedImage.slice04.v0 artifact plus its bound RGBA pixel source";
  const finiteSemantics = {
    runRepetitionsPerSource: 3,
    deterministicOrStochastic: "deterministic-local-codec",
    unitOfAnalysis: "independent_source",
    sourceLevelAggregation: "all-three-planned-repetitions-must-pass; one allowed invalid rerun replaces only its no-result attempt",
    repeatPassRule: {
      plannedRepetitions: 3,
      requiredValidPasses: 3,
      majorityVoteAllowed: false,
      validNonPassRerunAllowed: false,
      maximumInvalidReplacementsPerSourceAcrossAllRepetitions: 1,
      invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt: true,
    },
    primaryEstimand: "proportion-of-registered-independent-sources-with-all-three-planned-repetitions-passing",
    secondaryEstimands: [
      "same-source-all-three-pass-after-at-most-one-total-validly-classified-no-result-replacement-per-source-across-all-three-planned-repetitions",
      "false-reject-rate-among-applicable-sources",
      "false-allow-rate-among-rejection-sources",
    ],
    confidenceMethod: "finite-stratum exact counts and descriptive rates only; no population inference",
    categoryFloor: "all three planned repetitions of every registered source in every category must pass",
    overallThreshold: "all registered sources pass all three repetitions with zero false allow, false reject, failure, timeout, cancellation, missing, or unknown",
    stoppingRule: "close exactly at the frozen registered source set; no early success, denominator reduction, majority vote, or data-dependent extension",
    maximumCollectionWindow: "P14D",
  };
  const escapeSemantics = {
    runRepetitionsPerSource: 0,
    deterministicOrStochastic: "diagnostic-event-ledger-not-a-success-estimand",
    unitOfAnalysis: "confirmed_contract_relevant_escape_event",
    sourceLevelAggregation: "not-applicable-no-c1-success-estimand",
    repeatPassRule: {
      plannedRepetitions: 0,
      requiredValidPasses: 0,
      majorityVoteAllowed: false,
      validNonPassRerunAllowed: false,
      maximumInvalidReplacementsPerSourceAcrossAllRepetitions: 0,
      invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt: false,
    },
    primaryEstimand: "not-applicable-diagnostic-invalidation-ledger",
    secondaryEstimands: [],
    confidenceMethod: "not-applicable-no-success-inference",
    categoryFloor: "not-applicable",
    overallThreshold: "not-applicable",
    stoppingRule: "append-only event adjudication; every confirmed contract-relevant escape invalidates dependent QA/C1 and requires a new version and new sealed holdout",
    maximumCollectionWindow: "unbounded-append-only-event-ledger",
  };
  return {
    suiteId: "NORMALIZE-DELIVER",
    suiteVersion: "0.4.0",
    operation,
    partition,
    evidenceRole,
    sourcePopulation: escape
      ? "future adjudicated production-like QA escapes with rights and privacy clearance"
      : defectSpecific
        ? `future project-original synthetic ${sourceKind} with exactly one registered purposefully injected ${operation}-specific defect plus separately registered valid controls`
        : `future project-original synthetic ${sourceKind} authored after Slice 04 freeze`,
    sourceFamilyRule: "one sourceFamilyId per independent construction lineage; derivatives remain in one partition",
    captureSessionRule: "one captureSessionId per generation session; sessions never cross partitions",
    ...(escape ? { applicableCategories: [], rejectionCategories: [], difficultCategories: [] }
      : categoryRows(operation, categoryApplicable, categoryRejection, difficult, defectSpecific)),
    minimumIndependentSourcesTotal: total,
    minimumApplicableSources: applicable,
    minimumRejectionSources: rejection,
    plannedIndependentSources: total,
    countKind,
    ...(escape ? escapeSemantics : finiteSemantics),
    eligibilityRule: escape
      ? "confirmed contract-relevant event with rights, privacy, family, session, immutable evidence, and independent adjudication"
      : "exactly one registered independent source with complete rights, family, session, category, and immutable asset hashes",
    exclusionRule: escape
      ? "events never disappear; rejected reports retain an append-only adjudication record and reason"
      : "only pre-run rights withdrawal, proven cross-partition lineage contamination, or corrupt custody; retain exclusion record in denominator ledger",
    invalidRunRule: escape
      ? "not-applicable to the C1 denominator; diagnostic reproduction attempts remain append-only and cannot erase an escape"
      : "only runner-crash-before-result, custody-interruption, or integrity-check-failure before a result; at most one total replacement per source across all three planned repetitions; it may replace only its corresponding no-result attempt; retain all attempts",
    allowedInvalidReasons: escape ? [] : ALLOWED_INVALID_REASONS,
    failureTimeoutCancelTreatment: escape
      ? "not-applicable to a success denominator; diagnostic reproduction failures, timeouts, and cancellations remain append-only event history"
      : "each remains a distinct non-pass outcome in its registered-source denominator",
    missingResultTreatment: escape
      ? "not-applicable to a success denominator; missing diagnostic reproduction remains append-only event history"
      : "missing remains a distinct non-pass outcome in its registered-source denominator",
    userExecutionRule: "not-applicable: offline evidence run has no user execution",
    internalRetryRule: escape
      ? "not-applicable to C1; reproduction attempts cannot erase, downgrade, or close a confirmed escape"
      : "zero retries for valid outcomes; maximum one replacement per source across all three repetitions only after a predeclared invalid no-result attempt",
    diagnosticRetryRule: escape
      ? "reproduction attempts are separately appended and never count as a C1 denominator or success"
      : "diagnostic runs are outside formal results and cannot replace or erase a registered attempt",
    catastrophicFailureDefinitions: [
      "candidate-oracle-identity-collision",
      "accepted-output-byte-or-decoded-pixel-identity-mismatch",
      "unsupported-or-defect-input-produces-an-artifact",
      "registered-result-is-lost-replaced-or-associated-with-the-wrong-source",
    ],
    escapePolicy: escape ? {
      appendOnly: true,
      confirmedContractRelevantEscapeAction: "invalidate-dependent-qa-and-c1; publish-new-version; create-new-sealed-holdout",
      reproductionAttemptsRecordedSeparately: true,
      reproductionAttemptsCountTowardC1: false,
      escapeCanSupportSuccessOrEarlyStopping: false,
    } : null,
    fixtureManifest: {
      manifestId: `FM-NORMALIZE-DELIVER-${operation.toUpperCase()}-${partition.replace("/", "-").toUpperCase()}@0.4.0`,
      requiredVersion: "0.4.0",
      state: "not-created-blocks-run",
    },
    frozenAt: SLICE04_FROZEN_AT,
    owners: ["role.evidence-owner"],
    approvers: ["role.independent-approver", "role.methodology-approver"],
    assetState: "not-created",
    formal,
    excludedFromInitialC1: !formal,
  };
}

function makePartitionPlan(operation) {
  return freezeRecord({
  schemaVersion: "partition-plan.slice04.v0",
  partitionPlanId: operation === "normalize" ? "PP-NORMALIZE-PNG@0.4.0" : "PP-EXPORT-PNG@0.4.0",
  recordVersion: "0.4.0",
  frozenAt: SLICE04_FROZEN_AT,
  suiteId: "NORMALIZE-DELIVER",
  suiteVersion: "0.4.0",
  operation,
  unitOfAnalysis: "independent_source",
  repeatsPerSource: 3,
  sourceLevelAggregation: "all-three-planned-repetitions-must-pass",
  lifecyclePlannedDenominators: { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18, escapeInitial: 0 },
  initialC1DecisionDenominators: { holdout: 30, defectHoldout: 18, total: 48, calibrationExcluded: true, escapeExcluded: true },
  partitions: [
    partitionRow({ operation, partition: "dev/calibration", total: 30, applicable: 18, rejection: 12, categoryApplicable: 6, categoryRejection: 4, difficult: 2, countKind: "finite-stratum" }),
    partitionRow({ operation, partition: "holdout", total: 30, applicable: 18, rejection: 12, categoryApplicable: 6, categoryRejection: 4, difficult: 2, countKind: "finite-stratum" }),
    partitionRow({ operation, partition: "defect/calibration", total: 18, applicable: 6, rejection: 12, categoryApplicable: 2, categoryRejection: 4, difficult: 2, countKind: "finite-stratum" }),
    partitionRow({ operation, partition: "defect/holdout", total: 18, applicable: 6, rejection: 12, categoryApplicable: 2, categoryRejection: 4, difficult: 2, countKind: "finite-stratum" }),
    partitionRow({ operation, partition: "escape", total: 0, applicable: 0, rejection: 0, categoryApplicable: 0, categoryRejection: 0, difficult: 0, countKind: "event-driven" }),
  ],
  isolation: {
    sourceFamilyUniqueAcrossPartitions: true,
    captureSessionUniqueAcrossPartitions: true,
    exactHashCrossPartitionForbidden: true,
    nearDuplicateCrossPartitionForbidden: true,
    derivativeCrossPartitionForbidden: true,
    priorSliceStructuralFixtureReuseForbidden: true,
  },
  denominatorPolicy: {
    registeredSourcesNeverSilentlyRemoved: true,
    failureIncluded: true,
    timeoutIncluded: true,
    cancelledIncluded: true,
    missingIncluded: true,
    unknownIncluded: true,
    correctRejectSeparateFromFalseReject: true,
    falseAllowSeparateFromExecutionFailure: true,
    finiteStratumPopulationInferenceAllowed: false,
  },
  comparisonPlan: {
    candidateCount: 1,
    candidateIds: ["REG-NORM-SHARP@0.4.0"],
    deterministicContractAlternativeEvidence: [
      "golden-byte-and-decoded-pixel-identities",
      `future-independent-${operation}-oracle-with-slice03-design-lineage`,
      "property-tests",
      "fault-injection",
    ],
    marketBenchmarkState: "not-applicable",
    marketBenchmarkReason: "deterministic codec conformance is judged against frozen bytes, properties, and a future operation-specific independent oracle rather than a market image editor",
  },
  reviewerPlan: {
    primaryReviewerCount: 2,
    primaryReviewerIds: ["role.blinded-reviewer-a", "role.blinded-reviewer-b"],
    candidateIdentityBlinded: true,
    sourceOrderBlindedAndFrozen: true,
    adjudicatorId: "role.independent-adjudicator",
    adjudicationRule: "any disagreement or unknown is adjudicated by the independent third reviewer; unresolved remains non-pass",
    agreementMetric: "raw-agreement-and-category-confusion-counts",
    originalRatingsRetained: true,
  },
  fixtureManifestState: "not-created-blocks-run",
  fixtureManifestRequiredVersion: "0.4.0",
  roleAssignmentState: "not-assigned",
  approvalState: "not-approved-blocks-formal-run",
  owners: ["role.evidence-owner", "role.partition-owner"],
  approvers: ["role.independent-approver", "role.methodology-approver"],
  formalHoldoutStatus: "not-created",
  formalDefectHoldoutStatus: "not-created",
  formalEscapeStatus: "not-created",
  fixturePixelsPresent: false,
  holdoutSeedsPresent: false,
  evidenceBoundary: EVIDENCE_BOUNDARY,
  });
}

const normalizePartitionPlan = makePartitionPlan("normalize");
const exportPartitionPlan = makePartitionPlan("export");

const distinctRoles = Object.freeze({
  candidateAuthor: "role.candidate-author",
  qaAuthor: "role.qa-author",
  oracleAuthor: "role.oracle-author",
  thresholdAuthor: "role.threshold-author",
  stoppingRuleAuthor: "role.stopping-author",
  custodian: "role.future-independent-custodian",
  approver: "role.independent-approver",
});

function makePreregistration({ preregistrationId, contract, contractPath, operation, partitionPlan, partitionPlanPath, oraclePrerequisiteId }) {
  return freezeRecord({
    schemaVersion: "preregistration.slice04.v0",
    preregistrationId,
    recordVersion: "0.4.0",
    frozenAt: SLICE04_FROZEN_AT,
    suiteId: "NORMALIZE-DELIVER",
    suiteVersion: "0.4.0",
    operation,
    researchQuestion: operation === "normalize"
      ? "Does the exact source-resolved composite candidate satisfy every frozen canonical-PNG normalization identity and rejection invariant on the registered independent-source strata?"
      : "Does the exact source-resolved composite candidate satisfy every frozen canonical-PNG export identity and rejection invariant on the registered independent-source strata?",
    decisionToInform: operation === "normalize"
      ? "whether CC-CAP02-NORMALIZE-PNG@0.4.0 may enter a later one-time independent formal C1 evaluation after adapter calibration and Gate B"
      : "whether CC-CAP02-EXPORT-PNG@0.4.0 may enter a later one-time independent formal C1 evaluation after adapter calibration and Gate B",
    decisionScope: "separate-capability-contract-decision",
    decisionState: "preregistered-metadata-only-not-run",
    candidateLockRef: ref("candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock, "candidateLockId"),
    formatTargetRef: ref("profiles/format-target.normalize-deliver.v0.4.0.json", formatTarget, "formatTargetId"),
    capabilityContractRef: ref(contractPath, contract, "contractId"),
    partitionPlanRef: ref(partitionPlanPath, partitionPlan, "partitionPlanId"),
    qaProfileRef: ref("preregistrations/qa-profile.normalize-deliver.v0.4.0.json", qaProfile, "qaProfileId"),
    oraclePrerequisiteBinding: {
      qaProfileContentHash: qaProfile.contentHash,
      prerequisiteId: oraclePrerequisiteId,
      operation,
      state: "not-created-blocks-gate-b",
    },
    evaluationPlanBinding: {
      bindingScope: "entire-partition-plan-including-all-suite-partition-fields",
      partitionPlanContentHash: partitionPlan.contentHash,
      lifecyclePlannedDenominators: { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18, escapeInitial: 0 },
      initialC1DecisionDenominators: { holdout: 30, defectHoldout: 18, total: 48 },
      calibrationExcludedFromInitialC1: true,
      escapeExcludedFromInitialC1: true,
      fixtureManifestState: "not-created-blocks-run",
      fixtureManifestRequiredVersion: "0.4.0",
      calibrationResultState: "not-created",
    },
    estimands: {
      primary: "holdout-source-level-all-three-planned-repetitions-all-pass",
      secondary: "same-source-all-three-pass-after-at-most-one-predeclared-no-result-replacement",
      firstAttemptPerPlannedRepetitionIsPrimary: true,
      allThreePlannedRepetitionsMustPass: true,
      majorityVoteAllowed: false,
      finiteStratumPopulationInferenceAllowed: false,
    },
    rerunPolicy: {
      validResultRerunAllowed: false,
      maximumInvalidRerunsPerSource: 1,
      allowedInvalidReasons: ALLOWED_INVALID_REASONS,
      invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt: true,
      validNonPassMayBeReplacedOrOverwritten: false,
      missingCountsInDenominator: true,
      timeoutCountsInDenominator: true,
      failureCountsInDenominator: true,
      cancelledCountsInDenominator: true,
      allAttemptHistoryRetained: true,
    },
    thresholds: qaProfile.thresholds,
    stoppingRule: {
      collectionWindow: "single-frozen-formal-window",
      lifecyclePlannedFiniteSources: { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18 },
      initialC1DecisionSources: { holdout: 30, defectHoldout: 18, total: 48 },
      escapeInitialSources: 0,
      dataDependentExtensionAllowed: false,
      earlySuccessAllowed: false,
      denominatorReductionAllowed: false,
      thresholdAdjustmentAfterObservationAllowed: false,
      insufficientOrContaminatedDisposition: "close-inconclusive-or-failed-and-version-new-plan",
    },
    comparisonBinding: {
      marketBenchmarkState: "not-applicable",
      marketBenchmarkReason: "deterministic codec conformance uses golden identities, properties, an independent observer, and fault injection",
      alternativeEvidenceRequired: true,
    },
    reviewBinding: {
      primaryReviewerCount: 2,
      candidateIdentityBlinded: true,
      independentAdjudicatorRequired: true,
      unresolvedDisagreementTreatment: "non-pass",
      agreementMetric: "raw-agreement-and-category-confusion-counts",
    },
    roles: distinctRoles,
    roleGovernance: {
      assignmentState: "not-assigned",
      approvalState: "not-approved",
      formalRunBlocked: true,
    },
    owners: ["role.evidence-owner", operation === "normalize" ? "role.normalize-contract-owner" : "role.export-contract-owner"],
    approvers: ["role.independent-approver", "role.methodology-approver"],
    formalPartitionsState: "not-created",
    candidateExecutionState: "not-run",
    productSupport: false,
    gateBState: "not-entered",
    c1Decision: "not-evaluated",
    evidenceBoundary: EVIDENCE_BOUNDARY,
  });
}

const normalizePreregistration = makePreregistration({
  preregistrationId: "PREREG-NORMALIZE-PNG@0.4.0",
  contract: normalizeContract,
  contractPath: "contracts/cc-cap02-normalize-png.v0.4.0.json",
  operation: "normalize",
  partitionPlan: normalizePartitionPlan,
  partitionPlanPath: "preregistrations/partition-plan.normalize-png.v0.4.0.json",
  oraclePrerequisiteId: "ORACLE-PREREQ-NORMALIZE-PNG@0.4.0",
});

const exportPreregistration = makePreregistration({
  preregistrationId: "PREREG-EXPORT-PNG@0.4.0",
  contract: exportContract,
  contractPath: "contracts/cc-cap02-export-png.v0.4.0.json",
  operation: "export",
  partitionPlan: exportPartitionPlan,
  partitionPlanPath: "preregistrations/partition-plan.export-png.v0.4.0.json",
  oraclePrerequisiteId: "ORACLE-PREREQ-EXPORT-PNG@0.4.0",
});

const sealIntent = freezeRecord({
  schemaVersion: "seal-intent.slice04.v0",
  sealIntentId: "SEAL-INTENT-NORMALIZE-DELIVER@0.4.0",
  recordVersion: "0.4.0",
  frozenAt: SLICE04_FROZEN_AT,
  suiteId: "NORMALIZE-DELIVER",
  suiteVersion: "0.4.0",
  candidateLockRef: ref("candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock, "candidateLockId"),
  formatTargetRef: ref("profiles/format-target.normalize-deliver.v0.4.0.json", formatTarget, "formatTargetId"),
  partitionPlanRefs: [
    ref("preregistrations/partition-plan.normalize-png.v0.4.0.json", normalizePartitionPlan, "partitionPlanId"),
    ref("preregistrations/partition-plan.export-png.v0.4.0.json", exportPartitionPlan, "partitionPlanId"),
  ],
  qaProfileRef: ref("preregistrations/qa-profile.normalize-deliver.v0.4.0.json", qaProfile, "qaProfileId"),
  capabilityContractRefs: [
    ref("contracts/cc-cap02-normalize-png.v0.4.0.json", normalizeContract, "contractId"),
    ref("contracts/cc-cap02-export-png.v0.4.0.json", exportContract, "contractId"),
  ],
  preregistrationRefs: [
    ref("preregistrations/preregistration.normalize-png.v0.4.0.json", normalizePreregistration, "preregistrationId"),
    ref("preregistrations/preregistration.export-png.v0.4.0.json", exportPreregistration, "preregistrationId"),
  ],
  sealPolicyRef: {
    implementationPath: "scripts/research-seal-ceremony-slice03.mjs",
    implementationSha256: "70c36d1d8eecd4099d11ffb7f04754b7c54bbd6d56c46a35a0d4850f8d8ac58a",
    schemaPaths: [
      "research/slice-03/schemas/seal-ceremony-bundle-manifest.v0.schema.json",
      "research/slice-03/schemas/seal-ceremony-custody-event.v0.schema.json",
      "research/slice-03/schemas/seal-ceremony-plan.v0.schema.json",
      "research/slice-03/schemas/seal-ceremony-result-summary.v0.schema.json",
      "research/slice-03/schemas/seal-ceremony-run-receipt.v0.schema.json",
      "research/slice-03/schemas/seal-ceremony-run-request.v0.schema.json",
    ],
    schemaTreeSha256: "dd4291953ac349d9a19ffe306a279e5efb51243794cdc81733104876fbb34ecb",
    requiredMode: "formal",
    externalTrustedPinsRequired: ["expectedPlanSha256", "expectedBundleSha256", "expectedCustodianId"],
    compatibilityState: "execution-envelope-reference-only",
  },
  allowedInvalidReasons: ALLOWED_INVALID_REASONS,
  requestStatus: "not-issued-awaiting-custodian-bundle",
  requestPolicyState: "execution-envelope-reference-only-not-runnable",
  formalRunPrerequisites: {
    actualRunnerState: "not-created",
    durableCrossProcessConsumedRequestLedgerState: "not-created",
    trustedAuthorityState: "not-created",
    operationSpecificOracleState: "not-created",
    roleAssignmentState: "not-assigned",
    approvalState: "not-approved",
    formalRunBlocked: true,
  },
  formalHoldoutStatus: "not-created",
  formalDefectHoldoutStatus: "not-created",
  formalEscapeStatus: "not-created",
  bundleState: "not-created",
  externalPinsState: "not-created",
  custodyLedgerState: "not-created",
  secretMaterialState: "none",
  pixelMaterialState: "none",
  candidateExecutionState: "not-run",
  productSupport: false,
  gateBState: "not-entered",
  evidenceManifestState: "not-created",
  evidenceBoundary: EVIDENCE_BOUNDARY,
});

const RECORDS = Object.freeze(new Map([
  ["candidate-locks/composite-sharp-win32-x64.v0.4.0.json", candidateLock],
  ["profiles/format-target.normalize-deliver.v0.4.0.json", formatTarget],
  ["contracts/cc-cap02-normalize-png.v0.4.0.json", normalizeContract],
  ["contracts/cc-cap02-export-png.v0.4.0.json", exportContract],
  ["preregistrations/partition-plan.normalize-png.v0.4.0.json", normalizePartitionPlan],
  ["preregistrations/partition-plan.export-png.v0.4.0.json", exportPartitionPlan],
  ["preregistrations/qa-profile.normalize-deliver.v0.4.0.json", qaProfile],
  ["preregistrations/preregistration.normalize-png.v0.4.0.json", normalizePreregistration],
  ["preregistrations/preregistration.export-png.v0.4.0.json", exportPreregistration],
  ["preregistrations/seal-intent.normalize-deliver.v0.4.0.json", sealIntent],
]));

function scalarSchema(value) {
  if (value === null) return { type: "null", const: null };
  if (typeof value === "string") return { type: "string", const: value };
  if (typeof value === "boolean") return { type: "boolean", const: value };
  if (Number.isInteger(value)) return { type: "integer", const: value };
  if (typeof value === "number") return { type: "number", const: value };
  throw new TypeError(`Unsupported schema scalar: ${String(value)}`);
}

function schemaForValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", minItems: 0, maxItems: 0, items: { const: "__slice04-no-items__" } };
    const primitive = value.every((entry) => entry === null || ["string", "boolean", "number"].includes(typeof entry));
    if (primitive) {
      const sameType = value.every((entry) => typeof entry === typeof value[0]);
      const base = sameType ? scalarSchema(value[0]) : {};
      delete base.const;
      return { type: "array", minItems: value.length, maxItems: value.length, uniqueItems: true, items: { ...base, enum: value } };
    }
    return {
      type: "array",
      minItems: value.length,
      maxItems: value.length,
      uniqueItems: true,
      items: { oneOf: value.map(schemaForValue) },
    };
  }
  if (value && typeof value === "object") {
    const properties = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, schemaForValue(entry)]));
    return {
      type: "object",
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
  }
  return scalarSchema(value);
}

function recordSchema(id, title, records) {
  const body = records.length === 1 ? schemaForValue(records[0]) : { oneOf: records.map(schemaForValue) };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://single-image-studio.invalid/research/slice-04/schemas/${id}`,
    title,
    ...body,
  };
}

const SCHEMAS = Object.freeze(new Map([
  ["candidate-lock.slice04.v0.schema.json", recordSchema("candidate-lock.slice04.v0.schema.json", "Slice 04 composite candidate lock", [candidateLock])],
  ["format-target.slice04.v0.schema.json", recordSchema("format-target.slice04.v0.schema.json", "Slice 04 format target", [formatTarget])],
  ["capability-contract.slice04.v0.schema.json", recordSchema("capability-contract.slice04.v0.schema.json", "Slice 04 metadata-only capability contract", [normalizeContract, exportContract])],
  ["partition-plan.slice04.v0.schema.json", recordSchema("partition-plan.slice04.v0.schema.json", "Slice 04 partition plan", [normalizePartitionPlan, exportPartitionPlan])],
  ["qa-profile.slice04.v0.schema.json", recordSchema("qa-profile.slice04.v0.schema.json", "Slice 04 offline evidence QA profile", [qaProfile])],
  ["preregistration.slice04.v0.schema.json", recordSchema("preregistration.slice04.v0.schema.json", "Slice 04 preregistration", [normalizePreregistration, exportPreregistration])],
  ["seal-intent.slice04.v0.schema.json", recordSchema("seal-intent.slice04.v0.schema.json", "Slice 04 seal intent", [sealIntent])],
]));

export const SLICE04_RECORD_PATHS = Object.freeze([...RECORDS.keys()]);
export const SLICE04_SCHEMA_FILES = Object.freeze([...SCHEMAS.keys()]);

export async function generateSlice04({ sliceRoot = DEFAULT_SLICE04_ROOT } = {}) {
  for (const directory of ["candidate-locks", "contracts", "profiles", "preregistrations", "schemas"]) {
    await mkdir(path.join(sliceRoot, directory), { recursive: true });
  }
  await rm(path.join(sliceRoot, "preregistrations/partition-plan.normalize-deliver.v0.4.0.json"), { force: true });
  for (const [relative, record] of RECORDS) {
    await writeFile(path.join(sliceRoot, relative), stableStringifySlice04(record), "utf8");
  }
  for (const [filename, schema] of SCHEMAS) {
    await writeFile(path.join(sliceRoot, "schemas", filename), stableStringifySlice04(schema), "utf8");
  }
  return {
    sliceRoot,
    records: RECORDS.size,
    schemas: SCHEMAS.size,
    candidateLockHash: candidateLock.contentHash,
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
}

if (isMainModule()) {
  const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SLICE04_ROOT;
  const result = await generateSlice04({ sliceRoot: requestedRoot });
  console.log(`Slice 04 generated: ${result.records} records, ${result.schemas} schemas; candidate ${result.candidateLockHash}.`);
}
