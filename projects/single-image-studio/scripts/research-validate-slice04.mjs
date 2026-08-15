import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  contentHashSlice04,
  DEFAULT_SLICE04_ROOT,
  generateSlice04,
  SLICE04_RECORD_PATHS,
  SLICE04_SCHEMA_FILES,
  stableStringifySlice04,
} from "./research-generate-slice04.mjs";
import { validateSlice03SchemaInstance } from "./research-validate-slice03.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

export const CANONICAL_SLICE04_FROZEN_AT = "2026-08-15T00:20:45.916Z";
export const CANONICAL_SLICE04_CANDIDATE_LOCK_HASH = "773c2a403a9cbeb418e6c1deb4ff7f6599165f444061e205a7a510376aeb1046";
export const CANONICAL_SLICE04_GENERATED_TREE_SHA256 = "5c851fa3233cac1ec7b140850091f6b575f8ce79046a5889239d3744a930973a";
export const CANONICAL_SLICE04_SCHEMA_TREE_SHA256 = "0be868b4206110e805c00f40ced132053b22d572a941fb094fe29590229b3b49";
export const CANONICAL_SLICE04_README_SHA256 = "9428d478f7c9d1ae1310eb96d5888fae5b6a2c626987937f2661e83645127551";
export const CANONICAL_SLICE04_FULL_TREE_SHA256 = "b916c0f18df6eb175d119673853cc929a9dcc6eb9621ead4e170874afc79ba29";

const SLICE03_OBSERVER_CONTRACT_HASH = "c9af17a228099f4da4e1e840b9ecaf876815bf906de18ae53cda69047259191a";
const SLICE03_OBSERVER_IMPLEMENTATION_HASH = "99596ad7030ae8db2e9861d0dae1689448221ca7876ef94fbf9e04f5fdbbf0e3";
const SLICE03_OBSERVER_FROZEN_AT = "2026-08-14T19:47:13.000Z";
const SLICE03_SEAL_IMPLEMENTATION_HASH = "70c36d1d8eecd4099d11ffb7f04754b7c54bbd6d56c46a35a0d4850f8d8ac58a";
const SLICE03_SEAL_SCHEMA_TREE_HASH = "dd4291953ac349d9a19ffe306a279e5efb51243794cdc81733104876fbb34ecb";

const EXPECTED_FILES = Object.freeze([
  ...SLICE04_RECORD_PATHS,
  ...SLICE04_SCHEMA_FILES.map((filename) => `schemas/${filename}`),
  "README.md",
].sort());
const EXPECTED_GENERATED_FILES = Object.freeze(EXPECTED_FILES.filter((relative) => relative !== "README.md"));
const EXPECTED_DIRECTORIES = Object.freeze([
  "candidate-locks", "contracts", "preregistrations", "profiles", "schemas",
]);
const SUPPORTED_SCHEMA_KEYWORDS = Object.freeze(new Set([
  "$schema", "$id", "$ref", "$defs", "title", "type", "const", "enum", "format", "pattern",
  "minLength", "minimum", "maximum", "minItems", "maxItems", "uniqueItems", "items", "oneOf",
  "properties", "required", "additionalProperties",
]));
const RECORD_SCHEMA = Object.freeze(new Map([
  ["candidate-locks/composite-sharp-win32-x64.v0.4.0.json", "candidate-lock.slice04.v0.schema.json"],
  ["profiles/format-target.normalize-deliver.v0.4.0.json", "format-target.slice04.v0.schema.json"],
  ["contracts/cc-cap02-normalize-png.v0.4.0.json", "capability-contract.slice04.v0.schema.json"],
  ["contracts/cc-cap02-export-png.v0.4.0.json", "capability-contract.slice04.v0.schema.json"],
  ["preregistrations/partition-plan.normalize-png.v0.4.0.json", "partition-plan.slice04.v0.schema.json"],
  ["preregistrations/partition-plan.export-png.v0.4.0.json", "partition-plan.slice04.v0.schema.json"],
  ["preregistrations/qa-profile.normalize-deliver.v0.4.0.json", "qa-profile.slice04.v0.schema.json"],
  ["preregistrations/preregistration.normalize-png.v0.4.0.json", "preregistration.slice04.v0.schema.json"],
  ["preregistrations/preregistration.export-png.v0.4.0.json", "preregistration.slice04.v0.schema.json"],
  ["preregistrations/seal-intent.normalize-deliver.v0.4.0.json", "seal-intent.slice04.v0.schema.json"],
]));
const ID_FIELDS = Object.freeze([
  "candidateLockId", "formatTargetId", "contractId", "partitionPlanId", "qaProfileId",
  "preregistrationId", "sealIntentId",
]);
const FORMAT_ROWS = Object.freeze([
  "input:png", "input:jpeg", "input:webp", "input:heic", "input:heif", "input:avif",
  "input:gif", "input:apng", "input:tiff", "input:svg", "input:pdf", "input:raw",
  "output:png", "output:jpeg", "output:webp",
]);
const FORMAT_MEDIA_TYPES = Object.freeze({
  png: ["image/png"], jpeg: ["image/jpeg"], webp: ["image/webp"], heic: ["image/heic"],
  heif: ["image/heif"], avif: ["image/avif"], gif: ["image/gif"], apng: ["image/apng"],
  tiff: ["image/tiff"], svg: ["image/svg+xml"], pdf: ["application/pdf"], raw: ["application/octet-stream"],
});
const FORMAT_EXTENSIONS = Object.freeze({
  png: [".png"], jpeg: [".jpg", ".jpeg"], webp: [".webp"], heic: [".heic"], heif: [".heif"],
  avif: [".avif"], gif: [".gif"], apng: [".apng"], tiff: [".tif", ".tiff"], svg: [".svg"],
  pdf: [".pdf"], raw: [".raw"],
});
const EXPECTED_ARTIFACTS = Object.freeze([
  ["npm:sharp@0.35.3", "sharp", "0.35.3", "https://registry.npmjs.org/sharp/-/sharp-0.35.3.tgz", "sha512-ej0zVHuZGHCiABXcNxeYhpRnPNPAcvbG8RMdBAhDAxLKkCRVSpK3Iyu7qbqw3JMzoj0REeM6f3tJLtVwl0023Q==", 214036, "53637f5503f81d10b02097eca6f94c44e69d92ba7ef759f268a0c4ea1d06ae54", "Apache-2.0", "javascript-wrapper-source-package"],
  ["npm:@img/sharp-win32-x64@0.35.3", "@img/sharp-win32-x64", "0.35.3", "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.3.tgz", "sha512-D4y1vNeZrIIJCN+uHaWVtH86B+aCrdMYYjicy9pXHvbGZeGYLLSd3wdVuC37FxVXlU1ARsk84eKWfWMXGYEqvA==", 8434051, "f0f81118ad4557cceb6c4f90adaf252926e7cd3f6cd3d7040053d4bba088e940", "Apache-2.0 AND LGPL-3.0-or-later", "win32-x64-native-addon-package"],
  ["npm:@img/sharp-libvips-win32-x64@1.3.2", "@img/sharp-libvips-win32-x64", "1.3.2", "https://registry.npmjs.org/@img/sharp-libvips-win32-x64/-/sharp-libvips-win32-x64-1.3.2.tgz", "sha512-T10FUimHrO/JzFNo26IS1N0wZBVGI9VCyxZHkkmhv8ayeUAHURaONXbqWK8S/uy0IDe5QCY7XuiCbMNovL1m6g==", 8209445, "bcae355919358e0406c1674d0beaf841e9b11f321f8a54b927cddf4935c27668", "LGPL-3.0-or-later", "packaging-provenance-only-not-runtime"],
  ["npm:@img/colour@1.1.0", "@img/colour", "1.1.0", "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz", "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==", 17410, "6c2df3ac33d4b8647191ad8942a579e6004be00c25846677eab85f04702d85b1", "MIT", "sharp-runtime-dependency"],
  ["npm:detect-libc@2.1.2", "detect-libc", "2.1.2", "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz", "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==", 7776, "270dec0fc06cff86481da8af2dd8f18dee6b602790b14ef0e1c2c18d7da39427", "Apache-2.0", "sharp-runtime-dependency"],
  ["npm:semver@7.8.5", "semver", "7.8.5", "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz", "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==", 29399, "d85045d4300d7d57c891336b95df532e73f34c22ffcd222452b6d08b9d127d5d", "ISC", "sharp-runtime-dependency"],
]);
const EXPECTED_DEPENDENCY_EDGES = Object.freeze([
  ["npm:sharp@0.35.3", "npm:@img/colour@1.1.0", "runtime"],
  ["npm:sharp@0.35.3", "npm:detect-libc@2.1.2", "runtime"],
  ["npm:sharp@0.35.3", "npm:semver@7.8.5", "runtime"],
  ["npm:sharp@0.35.3", "npm:@img/sharp-win32-x64@0.35.3", "platform-optional"],
  ["npm:@img/sharp-win32-x64@0.35.3", "npm:@img/sharp-libvips-win32-x64@1.3.2", "provenance-lock-not-runtime"],
]);
const ALLOWED_INVALID_REASONS = Object.freeze([
  "runner-crash-before-result", "custody-interruption", "integrity-check-failure",
]);
const FINITE_INVALID_RUN_RULE = "only runner-crash-before-result, custody-interruption, or integrity-check-failure before a result; at most one total replacement per source across all three planned repetitions; it may replace only its corresponding no-result attempt; retain all attempts";
const FINITE_SECONDARY_ESTIMANDS = Object.freeze([
  "same-source-all-three-pass-after-at-most-one-total-validly-classified-no-result-replacement-per-source-across-all-three-planned-repetitions",
  "false-reject-rate-among-applicable-sources",
  "false-allow-rate-among-rejection-sources",
]);
const SLICE03_SEAL_SCHEMA_PATHS = Object.freeze([
  "research/slice-03/schemas/seal-ceremony-bundle-manifest.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-custody-event.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-plan.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-result-summary.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-run-receipt.v0.schema.json",
  "research/slice-03/schemas/seal-ceremony-run-request.v0.schema.json",
]);
const SLICE03_SEAL_SCHEMA_FILE_HASHES = Object.freeze([
  "2d6f07860ff0fa979952dafd20b1c5e3179273b43ce5741166f8b0840eab7f61",
  "d9d93776b6fc9f7b1c40e8499dec1f7c8b799e4260721a161ccab1b636ccbe88",
  "812573bf922e7acc54238c3ff80b26db3740da5cb20094461280cfbac4f03425",
  "331b63e98f07d25adfdf91fade8bafb720af5c9ebb054008cee7cf2913f3e605",
  "c5ed2da6f4e7c24c24694513386b83efba81e5e2d1542dd1d3482021e5e40b2e",
  "efa5ce93615e36563dc635a15cfa6992f9a0cd0b4579599702b39ca724fc0dc0",
]);
const EXPECTED_NATIVE_VERSIONS = Object.freeze({
  aom: "3.14.1", archive: "3.8.8", cairo: "1.18.4", cgif: "0.5.3", exif: "0.6.26",
  expat: "2.8.2", ffi: "3.6.0", fontconfig: "2.18.1", freetype: "2.14.3", fribidi: "1.0.16",
  glib: "2.89.1", harfbuzz: "14.2.1", heif: "1.23.1", highway: "1.4.0", imagequant: "2.4.1",
  lcms: "2.19.1", mozjpeg: "0826579", pango: "1.58.0", pixman: "0.46.4", png: "1.6.58",
  "proxy-libintl": "0.5", rsvg: "2.62.90", tiff: "d01a94b", uhdr: "1acdbed", vips: "8.18.3",
  webp: "1.6.0", xml2: "2.15.3", "zlib-ng": "2.3.3",
});
const EXPECTED_NATIVE_LICENSES = Object.freeze([
  ["aom", "BSD-2-Clause + Alliance for Open Media Patent License 1.0"],
  ["archive", "BSD-2-Clause"], ["cairo", "MPL-2.0"], ["cgif", "MIT"],
  ["exif", "LGPLv3-via-upstream-any-later"], ["expat", "MIT"], ["ffi", "MIT"],
  ["fontconfig", "fontconfig-BSD-like"], ["freetype", "FreeType-BSD-like"],
  ["fribidi", "LGPLv3-via-upstream-any-later"], ["glib", "LGPLv3-via-upstream-any-later"],
  ["harfbuzz", "MIT"], ["heif", "LGPLv3-via-upstream-any-later"], ["highway", "BSD-3-Clause"],
  ["imagequant", "BSD-2-Clause"], ["lcms", "MIT"], ["mozjpeg", "zlib + IJG + BSD-3-Clause"],
  ["pango", "LGPLv3-via-upstream-any-later"], ["pixman", "MIT"], ["png", "libpng"],
  ["proxy-libintl", "LGPLv3-via-upstream-any-later"], ["rsvg", "LGPLv3-via-upstream-any-later"],
  ["tiff", "libtiff-BSD-like"], ["uhdr", "MIT"], ["vips", "LGPLv3-via-upstream-any-later"],
  ["webp", "New-BSD"], ["xml2", "MIT"], ["zlib-ng", "zlib"],
]);
const EXPECTED_EVIDENCE = Object.freeze({
  c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0,
  o1: 0, g1: 0, v1: 0, releaseAllowlist: "none", releaseRegistered: 0, releaseApproved: 0,
});

export class Slice04ValidationError extends Error {
  constructor(issues) {
    super(`Slice 04 validation failed with ${issues.length} issue(s)`);
    this.name = "Slice04ValidationError";
    this.issues = issues;
  }
}

function add(issues, code, location, message) {
  issues.push({ code, location, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left, right) {
  return stableStringifySlice04(left) === stableStringifySlice04(right);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function recordHashWithout(record, field) {
  const clone = structuredClone(record);
  delete clone[field];
  return sha256(Buffer.from(stableStringifySlice04(clone), "utf8"));
}

async function readJson(target, issues, location) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    add(issues, "JSON_READ_FAILED", location, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function listTree(root, issues, base = "") {
  const files = [];
  const directories = [];
  let entries;
  try {
    entries = await readdir(path.join(root, base), { withFileTypes: true });
  } catch (error) {
    add(issues, "DIRECTORY_READ_FAILED", base || ".", error instanceof Error ? error.message : String(error));
    return { files, directories };
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    const target = path.join(root, relative);
    let stats;
    try {
      stats = await lstat(target);
    } catch (error) {
      add(issues, "FILESYSTEM_STAT_FAILED", relative, error instanceof Error ? error.message : String(error));
      continue;
    }
    if (stats.isSymbolicLink()) add(issues, "SYMLINK_FORBIDDEN", relative, "symlinks and junctions are forbidden");
    else if (stats.isDirectory()) {
      directories.push(relative);
      const nested = await listTree(root, issues, relative);
      files.push(...nested.files);
      directories.push(...nested.directories);
    } else if (stats.isFile()) files.push(relative);
    else add(issues, "FILESYSTEM_ENTRY_FORBIDDEN", relative, "only regular files and directories are allowed");
  }
  return { files, directories };
}

async function treeDigest(root, files) {
  const digest = createHash("sha256");
  for (const relative of [...files].sort()) {
    digest.update(relative);
    digest.update("\0");
    digest.update(await readFile(path.join(root, relative)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function inspectSchemaNode(node, issues, location) {
  if (!isRecord(node)) {
    add(issues, "SCHEMA_NODE_INVALID", location, "schema nodes must be objects; boolean schemas are forbidden");
    return;
  }
  for (const keyword of Object.keys(node)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(keyword)) add(issues, "SCHEMA_KEYWORD_UNSUPPORTED", `${location}.${keyword}`, keyword);
  }
  if (node.type === "object") {
    if (!isRecord(node.properties) || !Array.isArray(node.required)) {
      add(issues, "SCHEMA_OBJECT_UNDECLARED", location, "object schemas must declare properties and required");
    } else {
      const propertyNames = Object.keys(node.properties).sort();
      const requiredNames = [...new Set(node.required)].sort();
      if (!deepEqual(propertyNames, requiredNames)) add(issues, "SCHEMA_REQUIRED_INCOMPLETE", location, "every property must be required exactly once");
    }
    if (node.additionalProperties !== false) add(issues, "SCHEMA_OBJECT_OPEN", location, "object schemas must set additionalProperties=false");
  }
  if (node.type === "array" && !isRecord(node.items)) add(issues, "SCHEMA_ARRAY_OPEN", location, "array schemas must declare an object items schema");
  if (isRecord(node.properties)) for (const [key, child] of Object.entries(node.properties)) inspectSchemaNode(child, issues, `${location}.properties.${key}`);
  if (isRecord(node.$defs)) for (const [key, child] of Object.entries(node.$defs)) inspectSchemaNode(child, issues, `${location}.$defs.${key}`);
  if (isRecord(node.items)) inspectSchemaNode(node.items, issues, `${location}.items`);
  if (Array.isArray(node.oneOf)) node.oneOf.forEach((child, index) => inspectSchemaNode(child, issues, `${location}.oneOf[${index}]`));
}

function recordId(record) {
  for (const field of ID_FIELDS) if (typeof record?.[field] === "string") return record[field];
  return null;
}

function collectReferences(value, location = "$", output = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectReferences(entry, `${location}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  for (const [key, entry] of Object.entries(value)) {
    const where = `${location}.${key}`;
    if (key.endsWith("Ref") && isRecord(entry) && ["path", "id", "contentHash"].every((field) => Object.hasOwn(entry, field))) {
      output.push({ ref: entry, location: where });
    } else if (key.endsWith("Refs") && Array.isArray(entry)) {
      entry.forEach((candidate, index) => {
        if (isRecord(candidate) && ["path", "id", "contentHash"].every((field) => Object.hasOwn(candidate, field))) {
          output.push({ ref: candidate, location: `${where}[${index}]` });
        }
      });
    }
    collectReferences(entry, where, output);
  }
  return output;
}

function forbiddenConcreteSealKeys(value, location = "$", output = []) {
  if (Array.isArray(value)) value.forEach((entry, index) => forbiddenConcreteSealKeys(entry, `${location}[${index}]`, output));
  else if (isRecord(value)) for (const [key, entry] of Object.entries(value)) {
    if (["bundleId", "bundleSha256", "requestId", "requestSha256", "pixelSha256", "seed", "seedId", "secretKey", "evidenceManifestId"].includes(key)) {
      output.push(`${location}.${key}`);
    }
    forbiddenConcreteSealKeys(entry, `${location}.${key}`, output);
  }
  return output;
}

function validateCandidate(candidate, issues) {
  if (!candidate) return;
  if (candidate.contentHash !== CANONICAL_SLICE04_CANDIDATE_LOCK_HASH) {
    add(issues, "CANDIDATE_CANONICAL_HASH_MISMATCH", "candidate.contentHash", `expected ${CANONICAL_SLICE04_CANDIDATE_LOCK_HASH}, got ${candidate.contentHash}`);
  }
  if (candidate.compositeCandidateCount !== 1 || !deepEqual(candidate.comparisonArmIds, ["REG-NORM-SHARP@0.4.0"])) {
    add(issues, "CANDIDATE_COUNT_INVALID", "candidate", "Sharp and bundled libvips are exactly one composite comparison arm");
  }
  if (candidate.frozenAt !== CANONICAL_SLICE04_FROZEN_AT || candidate.candidateKind !== "composite-sharp-with-bundled-libvips"
    || candidate.sourceState !== "source-resolved" || candidate.gateAState !== "source-resolved"
    || !deepEqual(candidate.targetPlatform, { os: "win32", cpu: "x64", libc: "not-applicable" })) {
    add(issues, "CANDIDATE_IDENTITY_INVALID", "candidate", "exact frozen win32-x64 composite source identity required");
  }
  const artifacts = candidate.artifacts ?? [];
  if (artifacts.length !== 6) add(issues, "CANDIDATE_ARTIFACT_SET_INVALID", "candidate.artifacts", `expected 6, got ${artifacts.length}`);
  for (const [index, expected] of EXPECTED_ARTIFACTS.entries()) {
    const artifact = artifacts[index];
    if (!artifact || !deepEqual(
      [artifact.artifactId, artifact.packageName, artifact.version, artifact.tarballUrl, artifact.npmIntegrity,
        artifact.byteLength, artifact.sha256, artifact.license, artifact.role],
      expected,
    ) || artifact.obtainedAt !== "2026-08-15"
      || artifact.acquisitionState !== "hash-verified-temporary-not-retained") {
      add(issues, "CANDIDATE_ARTIFACT_PIN_MISMATCH", `candidate.artifacts[${index}]`, JSON.stringify(expected));
    }
    if (artifact && /(?:latest|pending|[~^*]|\bx\b|\s(?:-|<|>)\s?)/iu.test(String(artifact.version))) {
      add(issues, "CANDIDATE_FLOATING_VERSION", `candidate.artifacts[${index}].version`, String(artifact.version));
    }
  }
  const repos = (candidate.sourceRepositories ?? []).map((entry) => [
    entry.componentId, entry.sourceUrl, entry.tag, entry.version, entry.commit, entry.license, entry.archiveDownloaded,
  ]);
  if (!deepEqual(repos, [
    ["sharp", "https://github.com/lovell/sharp", "v0.35.3", "0.35.3", "1018449164723ba0203c1beffaba0e21f7829c18", "Apache-2.0", false],
    ["sharp-libvips-packaging", "https://github.com/lovell/sharp-libvips", "v1.3.2", "1.3.2", "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6", "Apache-2.0", false],
    ["libvips-upstream", "https://github.com/libvips/libvips", "v8.18.3", "8.18.3", "3664cfc5dc2c5661288f5bf5a85ccc51c64c1626", "LGPL-2.1-or-later", false],
  ])) add(issues, "CANDIDATE_SOURCE_PIN_MISMATCH", "candidate.sourceRepositories", "exact Sharp, sharp-libvips and libvips source pins required");
  if (!deepEqual(candidate.bundledNativeVersionsSource?.versions, EXPECTED_NATIVE_VERSIONS)
    || candidate.bundledNativeVersionsSource?.nativeVersionCount !== 28) {
    add(issues, "NATIVE_VERSION_SET_MISMATCH", "candidate.bundledNativeVersionsSource", "all 28 native versions are required");
  }
  const native = candidate.bundledNativeVersionsSource ?? {};
  const versionsSource = native.metadataSources?.versionsProperties ?? {};
  const noticesSource = native.metadataSources?.thirdPartyNotices ?? {};
  const componentLicenses = (native.noticeSummary?.componentLicenses ?? []).map((entry) => [entry.componentId, entry.usedUnder]);
  if (native.actualRuntimeArtifactId !== "npm:@img/sharp-win32-x64@0.35.3"
    || native.packagingSourceArtifactId !== "npm:@img/sharp-libvips-win32-x64@1.3.2"
    || versionsSource.sourceCommit !== "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6"
    || versionsSource.sourcePath !== "versions.properties" || versionsSource.byteLength !== 599
    || versionsSource.sha256 !== "cebb421de9568ae3ce8cfd66be62c3da53c2d549232c2e4327d9a9f97276c237"
    || versionsSource.immutableRawUrl !== "https://raw.githubusercontent.com/lovell/sharp-libvips/4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6/versions.properties"
    || noticesSource.sourceCommit !== "4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6"
    || noticesSource.sourcePath !== "THIRD-PARTY-NOTICES.md" || noticesSource.byteLength !== 4230
    || noticesSource.sha256 !== "25ffcfa69e28b1913ced27ec778b90f24911a1bb3021253577e8b0af55db0d49"
    || noticesSource.immutableRawUrl !== "https://raw.githubusercontent.com/lovell/sharp-libvips/4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6/THIRD-PARTY-NOTICES.md"
    || native.noticeSummary?.bundledPackageDeclares !== "LGPL-3.0-or-later"
    || native.noticeSummary?.upstreamLibvipsDeclares !== "LGPL-2.1-or-later"
    || native.noticeSummary?.anyLaterExplanationSource !== "THIRD-PARTY-NOTICES.md lines 35-36"
    || !deepEqual(componentLicenses, EXPECTED_NATIVE_LICENSES)) {
    add(issues, "NATIVE_PROVENANCE_OR_NOTICE_MISMATCH", "candidate.bundledNativeVersionsSource", "runtime artifact, immutable provenance and notice summary must remain exact");
  }
  const edges = (candidate.dependencyEdges ?? []).map((edge) => [edge.from, edge.to, edge.kind]);
  if (!deepEqual(edges, EXPECTED_DEPENDENCY_EDGES)) {
    add(issues, "CANDIDATE_DEPENDENCY_GRAPH_INVALID", "candidate.dependencyEdges", "exact runtime versus provenance edges required");
  }
  if (candidate.artifacts?.[2]?.role !== "packaging-provenance-only-not-runtime") {
    add(issues, "BUNDLED_LIBVIPS_DOUBLE_COUNT_RISK", "candidate.artifacts[2].role", "packaging snapshot is provenance-only");
  }
  if (candidate.installationState !== "not-installed" || candidate.executionState !== "not-run"
    || candidate.gateBState !== "not-entered" || candidate.productSupport !== false
    || candidate.acquisitionBoundary?.packagesInstalled !== false || candidate.acquisitionBoundary?.tarballsExecuted !== false
    || candidate.acquisitionBoundary?.artifactsRetained !== false) {
    add(issues, "CANDIDATE_STATE_OVERCLAIM", "candidate", "candidate must remain uninstalled, unexecuted, non-Gate-B and non-product");
  }
}

function validateFormatTarget(formatTarget, issues) {
  if (!formatTarget) return;
  const rows = formatTarget.rows ?? [];
  const keys = rows.map((row) => row.rowId);
  if (!deepEqual(keys, FORMAT_ROWS) || formatTarget.rowCount !== 15 || formatTarget.suiteId !== "NORMALIZE-DELIVER"
    || formatTarget.productSupport !== false || formatTarget.gateBState !== "not-entered") {
    add(issues, "FORMAT_ROW_SET_INVALID", "formatTarget.rows", JSON.stringify(keys));
  }
  for (const row of rows) {
    const pngTarget = row.rowId === "input:png" || row.rowId === "output:png";
    const [direction, formatId] = String(row.rowId).split(":");
    if (row.productSupport !== false || row.gateBState !== "not-entered" || row.implementationState !== "not-installed"
      || row.executionState !== "not-run" || row.probeAllowed !== false || row.passthroughAllowed !== false
      || row.fallbackAllowed !== false || row.disposition !== (pngTarget ? "target-not-implemented" : "reject")
      || row.reopenRequired !== pngTarget || row.direction !== direction || row.formatId !== formatId
      || !deepEqual(row.mediaTypes, FORMAT_MEDIA_TYPES[formatId]) || !deepEqual(row.extensions, FORMAT_EXTENSIONS[formatId])
      || row.rejectionCode !== (pngTarget
        ? `S04_${direction.toUpperCase()}_PNG_TARGET_NOT_IMPLEMENTED`
        : `S04_${direction.toUpperCase()}_${formatId.toUpperCase()}_REJECTED`)) {
      add(issues, "FORMAT_POLICY_MISMATCH", `formatTarget.rows.${row.rowId}`, "only canonical PNG input/output may be target-not-implemented; every other format rejects");
    }
    if (pngTarget && (row.profile?.pngFilterPolicy !== "filter-0-only" || row.profile?.interlace !== "forbidden"
      || row.profile?.pixelLayout !== "RGBA8" || row.profile?.colorSpace !== "embedded-sRGB")) {
      add(issues, "CANONICAL_PNG_PROFILE_MISMATCH", `formatTarget.rows.${row.rowId}.profile`, "strict filter-0 non-interlaced RGBA8 sRGB required");
    }
    if (!pngTarget && row.profile !== null) add(issues, "REJECTED_FORMAT_PROFILE_INVALID", `formatTarget.rows.${row.rowId}.profile`, "rejected formats have no executable profile");
  }
}

function validateContracts(contracts, issues) {
  const expected = new Map([
    ["CC-CAP02-NORMALIZE-PNG@0.4.0", ["normalize", "input:png", "canonical-png-source-bytes", "NormalizedImage.slice04.v0"]],
    ["CC-CAP02-EXPORT-PNG@0.4.0", ["export", "output:png", "NormalizedImage.slice04.v0", "DeliveryArtifact.slice04.v0"]],
  ]);
  if (contracts.length !== 2) add(issues, "CONTRACT_SET_INVALID", "contracts", `expected 2, got ${contracts.length}`);
  for (const contract of contracts) {
    const target = expected.get(contract?.contractId);
    if (!target || contract.operation !== target[0] || contract.formatRowId !== target[1]
      || contract.input?.type !== target[2] || contract.output?.type !== target[3]
      || contract.output?.metadataPolicy !== "strip-all-except-color-contract"
      || contract.input?.maxBytes !== 1048576 || contract.input?.maxWidth !== 256 || contract.input?.maxHeight !== 256
      || contract.input?.pixelLayout !== "RGBA8" || contract.output?.pixelLayout !== "RGBA8"
      || contract.input?.colorSpace !== "embedded-sRGB" || contract.output?.colorSpace !== "embedded-sRGB"
      || contract.input?.orientation !== 1 || contract.output?.orientation !== 1
      || contract.input?.alphaMode !== "straight-unpremultiplied" || contract.output?.alphaMode !== "straight-unpremultiplied") {
      add(issues, "CONTRACT_ID_OR_OPERATION_MISMATCH", contract?.contractId ?? "unknown", "exact separate normalize/export artifact contracts required");
    }
    const implementation = contract?.implementation ?? {};
    if (implementation.implementationState !== "not-installed" || implementation.installed !== false
      || implementation.executed !== false || implementation.adapterRef !== null || implementation.adapterSha256 !== null
      || implementation.runnerRef !== null || implementation.namedHardware !== null
      || implementation.passthroughAllowed !== false || implementation.fallbackAllowed !== false
      || implementation.actualOutputBytesReopenRequired !== true
      || contract.failureSemantics?.artifactOnFailure !== false || contract.failureSemantics?.failClosed !== true
      || contract.productSupport !== false || contract.gateBState !== "not-entered" || contract.c1State !== "not-evaluated") {
      add(issues, "CONTRACT_IMPLEMENTATION_OVERCLAIM", contract?.contractId ?? "unknown", "metadata-only, no passthrough/fallback, independent reopen required");
    }
  }
}

function expectedPartitionCategories(operation, defectSpecific) {
  const normalize = operation === "normalize";
  const applicableFloor = defectSpecific ? 2 : 6;
  return {
    applicableCategories: [
      [normalize ? (defectSpecific ? "injected-defect-control-opaque-source-png" : "canonical-opaque-source-png") : (defectSpecific ? "injected-defect-control-opaque-normalized-artifact" : "valid-opaque-normalized-artifact"), applicableFloor],
      [normalize ? (defectSpecific ? "injected-defect-control-partial-alpha-source-png" : "canonical-partial-alpha-source-png") : (defectSpecific ? "injected-defect-control-partial-alpha-normalized-artifact" : "valid-partial-alpha-normalized-artifact"), applicableFloor],
      [normalize ? (defectSpecific ? "injected-defect-control-alpha-holes-source-png" : "canonical-alpha-holes-source-png") : (defectSpecific ? "injected-defect-control-alpha-holes-normalized-artifact" : "valid-alpha-holes-normalized-artifact"), applicableFloor],
    ],
    rejectionCategories: [
      [normalize ? (defectSpecific ? "injected-container-signature-or-crc-defect" : "container-signature-or-crc-invalid") : (defectSpecific ? "injected-normalized-artifact-shape-or-contract-defect" : "normalized-artifact-shape-or-contract-invalid"), 4],
      [normalize ? (defectSpecific ? "injected-pixel-layout-color-or-metadata-defect" : "pixel-layout-color-or-metadata-invalid") : (defectSpecific ? "injected-parent-identity-file-or-pixel-hash-defect" : "parent-identity-file-or-pixel-hash-invalid"), 4],
      [normalize ? (defectSpecific ? "injected-resource-limit-or-unsupported-format-defect" : "resource-limit-or-unsupported-format") : (defectSpecific ? "injected-color-alpha-or-metadata-defect" : "color-alpha-or-metadata-invalid"), 4],
    ],
    difficultCategories: [
      [normalize ? "one-pixel-source-boundary" : "one-pixel-normalized-artifact-boundary", 2],
      [normalize ? "maximum-dimension-source-boundary" : "maximum-dimension-normalized-artifact-boundary", 2],
      [normalize ? "source-alpha-extremes-and-thin-holes" : "normalized-alpha-extremes-and-thin-holes", 2],
    ],
  };
}

function validatePartitionPlan(plan, operation, issues) {
  if (!plan) return;
  const expectedId = operation === "normalize" ? "PP-NORMALIZE-PNG@0.4.0" : "PP-EXPORT-PNG@0.4.0";
  const expectedRows = [
    ["dev/calibration", 30, 18, 12, "open-calibration", false, true, "finite-stratum"],
    ["holdout", 30, 18, 12, "sealed-independent-c1", true, false, "finite-stratum"],
    ["defect/calibration", 18, 6, 12, "open-defect-calibration", false, true, "finite-stratum"],
    ["defect/holdout", 18, 6, 12, "sealed-independent-c1-qa", true, false, "finite-stratum"],
    ["escape", 0, 0, 0, "diagnostic-invalidation-ledger", false, true, "event-driven"],
  ];
  if (plan.partitionPlanId !== expectedId || plan.operation !== operation || plan.suiteId !== "NORMALIZE-DELIVER"
    || plan.suiteVersion !== "0.4.0" || plan.unitOfAnalysis !== "independent_source"
    || plan.repeatsPerSource !== 3 || plan.sourceLevelAggregation !== "all-three-planned-repetitions-must-pass"
    || !deepEqual(plan.lifecyclePlannedDenominators, { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18, escapeInitial: 0 })
    || !deepEqual(plan.initialC1DecisionDenominators, { holdout: 30, defectHoldout: 18, total: 48, calibrationExcluded: true, escapeExcluded: true })) {
    add(issues, "PARTITION_DENOMINATOR_MISMATCH", expectedId, "operation-specific 30/30/18/18/0 lifecycle and holdout-only 30+18 initial C1 denominators required");
  }
  if (!deepEqual((plan.partitions ?? []).map((row) => [
    row.partition, row.plannedIndependentSources, row.minimumApplicableSources, row.minimumRejectionSources,
    row.evidenceRole, row.formal, row.excludedFromInitialC1, row.countKind,
  ]), expectedRows)) add(issues, "PARTITION_ROLE_OR_COUNT_MISMATCH", expectedId, "exact five partition roles, counts and formal inclusion flags required");

  for (const row of plan.partitions ?? []) {
    const location = `${expectedId}.${row.partition}`;
    const finite = row.countKind === "finite-stratum";
    const defectSpecific = row.partition === "defect/calibration" || row.partition === "defect/holdout";
    const escape = row.partition === "escape";
    const requiredStrings = ["sourcePopulation", "sourceFamilyRule", "captureSessionRule", "eligibilityRule", "exclusionRule",
      "invalidRunRule", "primaryEstimand", "confidenceMethod", "stoppingRule", "maximumCollectionWindow"];
    if (row.suiteId !== "NORMALIZE-DELIVER" || row.suiteVersion !== "0.4.0" || row.operation !== operation
      || row.frozenAt !== CANONICAL_SLICE04_FROZEN_AT || requiredStrings.some((key) => typeof row[key] !== "string" || row[key].length === 0)
      || row.assetState !== "not-created" || row.fixtureManifest?.state !== "not-created-blocks-run"
      || row.fixtureManifest?.requiredVersion !== "0.4.0") {
      add(issues, "PARTITION_PREREG_FIELDS_INCOMPLETE", location, "suite, operation, freeze, population and not-created manifest fields must remain exact");
    }
    if (operation === "normalize" && !String(row.sourcePopulation).includes(escape ? "production-like" : "raw source PNG bytes")) {
      add(issues, "PARTITION_OPERATION_POPULATION_INVALID", location, "normalize plan must register raw source PNG byte strata");
    }
    if (operation === "export" && !String(row.sourcePopulation).includes(escape ? "production-like" : "NormalizedImage.slice04.v0 artifact")) {
      add(issues, "PARTITION_OPERATION_POPULATION_INVALID", location, "export plan must register NormalizedImage artifact/identity strata");
    }
    if (defectSpecific && (!row.sourcePopulation.includes("purposefully injected")
      || !(row.rejectionCategories ?? []).every((category) => category.categoryId.startsWith("injected-")))) {
      add(issues, "DEFECT_PARTITION_NOT_INJECTION_SPECIFIC", location, "defect strata must be purposefully injected and operation-specific");
    }
    if (finite) {
      const categories = [...(row.applicableCategories ?? []), ...(row.rejectionCategories ?? []), ...(row.difficultCategories ?? [])];
      if (!(row.minimumIndependentSourcesTotal > 0) || !(row.minimumApplicableSources > 0) || !(row.minimumRejectionSources > 0)
        || categories.length !== 9 || categories.some((category) => !Number.isInteger(category.minimumIndependentSources) || category.minimumIndependentSources <= 0)) {
        add(issues, "PARTITION_NATURAL_DENOMINATOR_INVALID", location, "finite strata require positive natural denominators and nine positive category floors");
      }
      const expectedCategories = expectedPartitionCategories(operation, defectSpecific);
      const observedCategories = Object.fromEntries(Object.keys(expectedCategories).map((key) => [
        key, (row[key] ?? []).map((entry) => [entry.categoryId, entry.minimumIndependentSources]),
      ]));
      if (!deepEqual(observedCategories, expectedCategories)) {
        add(issues, "PARTITION_OPERATION_CATEGORY_MISMATCH", location, "operation-specific applicable, rejection and difficult category IDs/floors must remain exact");
      }
      if (row.runRepetitionsPerSource !== 3 || row.unitOfAnalysis !== "independent_source"
        || row.repeatPassRule?.plannedRepetitions !== 3 || row.repeatPassRule?.requiredValidPasses !== 3
        || row.repeatPassRule?.majorityVoteAllowed !== false || row.repeatPassRule?.validNonPassRerunAllowed !== false
        || row.repeatPassRule?.maximumInvalidReplacementsPerSourceAcrossAllRepetitions !== 1
        || row.repeatPassRule?.invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt !== true
        || row.sourceLevelAggregation !== "all-three-planned-repetitions-must-pass; one allowed invalid rerun replaces only its no-result attempt"
        || row.primaryEstimand !== "proportion-of-registered-independent-sources-with-all-three-planned-repetitions-passing"
        || !deepEqual(row.secondaryEstimands, FINITE_SECONDARY_ESTIMANDS)
        || row.invalidRunRule !== FINITE_INVALID_RUN_RULE
        || row.allowedInvalidReasons == null || !deepEqual(row.allowedInvalidReasons, ALLOWED_INVALID_REASONS)
        || !row.internalRetryRule.includes("maximum one replacement per source across all three repetitions")) {
        add(issues, "PARTITION_REPEAT_AGGREGATION_INVALID", location, "3/3 pass and one no-result replacement per source across all repetitions are required; majority and valid-result reruns are forbidden");
      }
    } else if (escape) {
      if (!deepEqual(row.applicableCategories, []) || !deepEqual(row.rejectionCategories, []) || !deepEqual(row.difficultCategories, [])
        || row.runRepetitionsPerSource !== 0 || row.repeatPassRule?.plannedRepetitions !== 0
        || row.primaryEstimand !== "not-applicable-diagnostic-invalidation-ledger"
        || row.confidenceMethod !== "not-applicable-no-success-inference" || row.categoryFloor !== "not-applicable"
        || row.overallThreshold !== "not-applicable" || !deepEqual(row.allowedInvalidReasons, [])
        || row.escapePolicy?.appendOnly !== true || row.escapePolicy?.reproductionAttemptsCountTowardC1 !== false
        || row.escapePolicy?.escapeCanSupportSuccessOrEarlyStopping !== false
        || !String(row.escapePolicy?.confirmedContractRelevantEscapeAction).includes("invalidate-dependent-qa-and-c1")) {
        add(issues, "ESCAPE_STATISTICAL_SCOPE_INVALID", location, "escape must remain an append-only diagnostic invalidation ledger with no C1 success estimand");
      }
    }
  }
  const isolation = plan.isolation ?? {};
  if (Object.values(isolation).length !== 6 || Object.values(isolation).some((value) => value !== true)) add(issues, "PARTITION_ISOLATION_WEAKENED", expectedId, "all family/session/hash/near-duplicate/derivative/prior-fixture isolation flags are mandatory");
  if (plan.denominatorPolicy?.finiteStratumPopulationInferenceAllowed !== false
    || ["registeredSourcesNeverSilentlyRemoved", "failureIncluded", "timeoutIncluded", "cancelledIncluded", "missingIncluded", "unknownIncluded"].some((key) => plan.denominatorPolicy?.[key] !== true)) {
    add(issues, "PARTITION_OUTCOME_POLICY_INVALID", expectedId, "all failures and missing outcomes remain in denominator; no population inference");
  }
  if (plan.comparisonPlan?.candidateCount !== 1 || !deepEqual(plan.comparisonPlan?.candidateIds, ["REG-NORM-SHARP@0.4.0"])
    || plan.comparisonPlan?.marketBenchmarkState !== "not-applicable" || !String(plan.comparisonPlan?.marketBenchmarkReason ?? "").length) {
    add(issues, "COMPARISON_PLAN_INVALID", expectedId, "one exact composite candidate and concrete benchmark non-applicability reason required");
  }
  if (plan.reviewerPlan?.primaryReviewerCount !== 2 || plan.reviewerPlan?.candidateIdentityBlinded !== true
    || plan.reviewerPlan?.sourceOrderBlindedAndFrozen !== true || plan.reviewerPlan?.originalRatingsRetained !== true
    || plan.roleAssignmentState !== "not-assigned" || plan.approvalState !== "not-approved-blocks-formal-run") {
    add(issues, "REVIEW_OR_ROLE_PLAN_INVALID", expectedId, "blinded independent review remains unassigned and unapproved, blocking formal run");
  }
  if (plan.fixturePixelsPresent !== false || plan.holdoutSeedsPresent !== false || plan.fixtureManifestState !== "not-created-blocks-run"
    || plan.formalHoldoutStatus !== "not-created" || plan.formalDefectHoldoutStatus !== "not-created" || plan.formalEscapeStatus !== "not-created") {
    add(issues, "FORMAL_MATERIAL_OVERCLAIM", expectedId, "all formal materials remain not-created and no pixels/seeds are present");
  }
}

function validateQa(qa, issues) {
  if (!qa) return;
  const oracle = qa.oracle ?? {};
  const lineage = oracle.designLineageRef ?? {};
  if (oracle.source !== "future-operation-specific-independent-oracles-with-slice03-byte-observer-design-lineage"
    || lineage.observerContractRef !== "S03-TECHNICAL-OBSERVER@0.3.0"
    || lineage.observerContractSha256 !== SLICE03_OBSERVER_CONTRACT_HASH
    || lineage.observerImplementationRef !== `sha256:${SLICE03_OBSERVER_IMPLEMENTATION_HASH}`
    || lineage.observerDeclaredFrozenAt !== SLICE03_OBSERVER_FROZEN_AT
    || lineage.compatibilityState !== "reference-only-not-compatible-with-slice04-contracts"
    || !deepEqual(lineage.incompatibilities, [
      "hardcodes-CC-CAP02-NORMALIZE-at-0.2.0", "accepts-NormalizedImage-only-not-DeliveryArtifact",
    ]) || oracle.candidateMaySelfCertify !== false || oracle.candidateMayProduceGold !== false
    || oracle.candidateOutputMayDefineGold !== false || oracle.candidateDecoderMayBeSoleOracle !== false
    || oracle.actualBytesReopenRequired !== true || oracle.independentDecodedPixelIdentityRequired !== true) {
    add(issues, "QA_ORACLE_INDEPENDENCE_INVALID", "qaProfile.oracle", "Slice 03 is design lineage only; separate future independent operation oracles are required");
  }
  const expectedPrerequisites = [
    ["ORACLE-PREREQ-NORMALIZE-PNG@0.4.0", "normalize", "CC-CAP02-NORMALIZE-PNG@0.4.0", "NormalizedImage.slice04.v0", "normalized-image.slice04.v0.schema.json"],
    ["ORACLE-PREREQ-EXPORT-PNG@0.4.0", "export", "CC-CAP02-EXPORT-PNG@0.4.0", "DeliveryArtifact.slice04.v0", "delivery-artifact.slice04.v0.schema.json"],
  ];
  const observedPrerequisites = (oracle.operationPrerequisites ?? []).map((entry) => [
    entry.prerequisiteId, entry.operation, entry.requiredContractId, entry.requiredArtifactType, entry.requiredArtifactSchemaId,
  ]);
  if (!deepEqual(observedPrerequisites, expectedPrerequisites) || (oracle.operationPrerequisites ?? []).some((entry) => (
    entry.artifactSchemaState !== "not-created-blocks-gate-b" || entry.state !== "not-created-blocks-gate-b"
    || entry.independentImplementationHashState !== "not-created" || entry.independentGoldState !== "not-created"
  ))) {
    add(issues, "QA_OPERATION_ORACLE_PREREQUISITE_INVALID", "qaProfile.oracle.operationPrerequisites", "separate not-created normalize/export artifact schemas and independent oracles must block Gate B");
  }
  const thresholds = qa.thresholds ?? {};
  const ones = ["applicableAcceptanceRate", "defectRejectionRate", "identityMatchRate"];
  const zeros = ["falseRejectRate", "falseAllowRate", "failureRate", "timeoutRate", "cancelledRate", "missingRate", "unknownRate"];
  if (ones.some((key) => thresholds[key]?.operator !== "exactly" || thresholds[key]?.value !== 1)
    || zeros.some((key) => thresholds[key]?.operator !== "exactly" || thresholds[key]?.value !== 0)
    || thresholds.catastrophicFailureTolerance !== 0 || thresholds.allCategoriesMustPass !== true) {
    add(issues, "QA_THRESHOLD_MISMATCH", "qaProfile.thresholds", "exact all-pass and zero-failure thresholds required");
  }
  if (qa.frozenAt !== CANONICAL_SLICE04_FROZEN_AT || qa.implementationState !== "not-created" || qa.executionState !== "not-run"
    || qa.productSupport !== false || qa.gateBState !== "not-entered") add(issues, "QA_STATE_OVERCLAIM", "qaProfile", "QA remains unimplemented and unexecuted");
}

function validatePreregistrations(preregs, plansByOperation, qa, issues) {
  const expected = new Map([
    ["PREREG-NORMALIZE-PNG@0.4.0", ["normalize", "ORACLE-PREREQ-NORMALIZE-PNG@0.4.0", "CC-CAP02-NORMALIZE-PNG@0.4.0"]],
    ["PREREG-EXPORT-PNG@0.4.0", ["export", "ORACLE-PREREQ-EXPORT-PNG@0.4.0", "CC-CAP02-EXPORT-PNG@0.4.0"]],
  ]);
  if (preregs.length !== 2) add(issues, "PREREGISTRATION_SET_INVALID", "preregistrations", `expected 2, got ${preregs.length}`);
  for (const prereg of preregs) {
    const expectedEntry = expected.get(prereg?.preregistrationId);
    const operation = expectedEntry?.[0];
    const plan = plansByOperation.get(operation);
    if (!expectedEntry || prereg?.operation !== operation || prereg?.suiteId !== "NORMALIZE-DELIVER" || prereg?.suiteVersion !== "0.4.0"
      || prereg?.decisionScope !== "separate-capability-contract-decision" || prereg?.capabilityContractRef?.id !== expectedEntry?.[2]) {
      add(issues, "PREREGISTRATION_DECISION_NOT_SEPARATE", prereg?.preregistrationId ?? "unknown", "normalize and export require separate C1 decisions");
    }
    if (typeof prereg?.researchQuestion !== "string" || !prereg.researchQuestion.includes("exact source-resolved composite candidate")
      || typeof prereg?.decisionToInform !== "string" || !prereg.decisionToInform.includes("later one-time independent formal C1 evaluation")
      || prereg?.frozenAt !== CANONICAL_SLICE04_FROZEN_AT) {
      add(issues, "PREREGISTRATION_QUESTION_OR_FREEZE_INVALID", prereg?.preregistrationId ?? "unknown", "concrete research question, decision and actual UTC freeze are required");
    }
    if (prereg?.evaluationPlanBinding?.partitionPlanContentHash !== plan?.contentHash
      || prereg?.partitionPlanRef?.contentHash !== plan?.contentHash
      || prereg?.partitionPlanRef?.id !== plan?.partitionPlanId
      || !deepEqual(prereg?.evaluationPlanBinding?.lifecyclePlannedDenominators, { devCalibration: 30, holdout: 30, defectCalibration: 18, defectHoldout: 18, escapeInitial: 0 })
      || !deepEqual(prereg?.evaluationPlanBinding?.initialC1DecisionDenominators, { holdout: 30, defectHoldout: 18, total: 48 })
      || prereg?.evaluationPlanBinding?.calibrationExcludedFromInitialC1 !== true
      || prereg?.evaluationPlanBinding?.escapeExcludedFromInitialC1 !== true
      || prereg?.evaluationPlanBinding?.fixtureManifestState !== "not-created-blocks-run") {
      add(issues, "PREREGISTRATION_PLAN_BINDING_INVALID", prereg?.preregistrationId ?? "unknown", "entire evaluation plan hash and not-created manifest must be bound");
    }
    if (prereg?.oraclePrerequisiteBinding?.qaProfileContentHash !== qa?.contentHash
      || prereg?.oraclePrerequisiteBinding?.prerequisiteId !== expectedEntry?.[1]
      || prereg?.oraclePrerequisiteBinding?.operation !== operation
      || prereg?.oraclePrerequisiteBinding?.state !== "not-created-blocks-gate-b") {
      add(issues, "PREREGISTRATION_ORACLE_BINDING_INVALID", prereg?.preregistrationId ?? "unknown", "each operation binds its own not-created independent oracle prerequisite");
    }
    if (prereg?.estimands?.firstAttemptPerPlannedRepetitionIsPrimary !== true
      || prereg?.estimands?.allThreePlannedRepetitionsMustPass !== true || prereg?.estimands?.majorityVoteAllowed !== false
      || prereg?.estimands?.finiteStratumPopulationInferenceAllowed !== false
      || prereg?.rerunPolicy?.validResultRerunAllowed !== false || prereg?.rerunPolicy?.maximumInvalidRerunsPerSource !== 1
      || prereg?.rerunPolicy?.invalidReplacementMayReplaceOnlyCorrespondingNoResultAttempt !== true
      || prereg?.rerunPolicy?.validNonPassMayBeReplacedOrOverwritten !== false
      || !deepEqual(prereg?.rerunPolicy?.allowedInvalidReasons, ALLOWED_INVALID_REASONS)) {
      add(issues, "PREREGISTRATION_RERUN_OR_ESTIMAND_INVALID", prereg?.preregistrationId ?? "unknown", "each of 3 first attempts is primary; all 3 must pass; at most one enumerated no-result replacement per source");
    }
    if (["missingCountsInDenominator", "timeoutCountsInDenominator", "failureCountsInDenominator", "cancelledCountsInDenominator", "allAttemptHistoryRetained"]
      .some((key) => prereg?.rerunPolicy?.[key] !== true)) add(issues, "PREREGISTRATION_OUTCOME_DENOMINATOR_INVALID", prereg?.preregistrationId ?? "unknown", "missing/timeout/failure/cancel and all attempts must remain");
    if (!deepEqual(prereg?.thresholds, qa?.thresholds)
      || prereg?.stoppingRule?.thresholdAdjustmentAfterObservationAllowed !== false
      || prereg?.stoppingRule?.dataDependentExtensionAllowed !== false
      || prereg?.stoppingRule?.denominatorReductionAllowed !== false || prereg?.stoppingRule?.earlySuccessAllowed !== false) {
      add(issues, "PREREGISTRATION_THRESHOLD_OR_STOPPING_DRIFT", prereg?.preregistrationId ?? "unknown", "QA thresholds and no-adjustment stopping rule must remain frozen");
    }
    const roles = Object.values(prereg?.roles ?? {});
    if (roles.length !== 7 || new Set(roles).size !== roles.length
      || prereg?.roleGovernance?.assignmentState !== "not-assigned" || prereg?.roleGovernance?.approvalState !== "not-approved"
      || prereg?.roleGovernance?.formalRunBlocked !== true) {
      add(issues, "ROLE_CONFLICT", prereg?.preregistrationId ?? "unknown", "distinct placeholder roles remain unassigned and unapproved, blocking formal run");
    }
    if (prereg?.reviewBinding?.primaryReviewerCount !== 2 || prereg?.reviewBinding?.candidateIdentityBlinded !== true
      || prereg?.reviewBinding?.independentAdjudicatorRequired !== true || prereg?.reviewBinding?.unresolvedDisagreementTreatment !== "non-pass") {
      add(issues, "PREREGISTRATION_REVIEW_BINDING_INVALID", prereg?.preregistrationId ?? "unknown", "blinded review and independent adjudication are frozen");
    }
    if (prereg?.formalPartitionsState !== "not-created" || prereg?.candidateExecutionState !== "not-run"
      || prereg?.productSupport !== false || prereg?.gateBState !== "not-entered" || prereg?.c1Decision !== "not-evaluated") {
      add(issues, "PREREGISTRATION_STATE_OVERCLAIM", prereg?.preregistrationId ?? "unknown", "no formal assets, execution, Gate B, C1 or product support");
    }
  }
}

function validateSeal(seal, issues) {
  if (!seal) return;
  if (seal.requestStatus !== "not-issued-awaiting-custodian-bundle"
    || seal.requestPolicyState !== "execution-envelope-reference-only-not-runnable" || seal.bundleState !== "not-created"
    || seal.formalHoldoutStatus !== "not-created" || seal.formalDefectHoldoutStatus !== "not-created"
    || seal.formalEscapeStatus !== "not-created" || seal.secretMaterialState !== "none"
    || seal.pixelMaterialState !== "none" || seal.evidenceManifestState !== "not-created"
    || seal.externalPinsState !== "not-created" || seal.custodyLedgerState !== "not-created"
    || seal.candidateExecutionState !== "not-run" || seal.productSupport !== false || seal.gateBState !== "not-entered") {
    add(issues, "SEAL_INTENT_STATE_INVALID", "sealIntent", "request not issued; no bundle, pixels, secrets, execution, evidence or support");
  }
  for (const location of forbiddenConcreteSealKeys(seal)) add(issues, "SEAL_CONCRETE_MATERIAL_FORBIDDEN", location, "concrete request/bundle/pixel/seed/key/evidence IDs are forbidden");
  if ((seal.capabilityContractRefs ?? []).length !== 2 || (seal.partitionPlanRefs ?? []).length !== 2
    || (seal.preregistrationRefs ?? []).length !== 2) {
    add(issues, "SEAL_REFERENCE_SET_INVALID", "sealIntent", "both contracts, operation plans and preregistrations must be pinned");
  }
  const policy = seal.sealPolicyRef ?? {};
  if (policy.implementationPath !== "scripts/research-seal-ceremony-slice03.mjs"
    || policy.implementationSha256 !== SLICE03_SEAL_IMPLEMENTATION_HASH
    || !deepEqual(policy.schemaPaths, SLICE03_SEAL_SCHEMA_PATHS)
    || policy.schemaTreeSha256 !== SLICE03_SEAL_SCHEMA_TREE_HASH || policy.requiredMode !== "formal"
    || !deepEqual(policy.externalTrustedPinsRequired, ["expectedPlanSha256", "expectedBundleSha256", "expectedCustodianId"])
    || policy.compatibilityState !== "execution-envelope-reference-only"
    || !deepEqual(seal.allowedInvalidReasons, ALLOWED_INVALID_REASONS)) {
    add(issues, "SEAL_POLICY_PIN_INVALID", "sealIntent.sealPolicyRef", "exact Slice 03 execution envelope and compatible invalid enum are required");
  }
  const prerequisites = seal.formalRunPrerequisites ?? {};
  if (prerequisites.actualRunnerState !== "not-created"
    || prerequisites.durableCrossProcessConsumedRequestLedgerState !== "not-created"
    || prerequisites.trustedAuthorityState !== "not-created" || prerequisites.operationSpecificOracleState !== "not-created"
    || prerequisites.roleAssignmentState !== "not-assigned" || prerequisites.approvalState !== "not-approved"
    || prerequisites.formalRunBlocked !== true) {
    add(issues, "SEAL_FORMAL_PREREQUISITE_OVERCLAIM", "sealIntent.formalRunPrerequisites", "runner, durable ledger, authority, oracle, assignments and approval remain absent and block formal run");
  }
}

async function validateExternalPins(projectRoot, qa, seal, issues) {
  const observerContractPath = path.join(projectRoot, "research/slice-03/contracts/technical-observer.slice03.v0.3.0.json");
  const observerImplementationPath = path.join(projectRoot, "scripts/research-reference-adapters-slice03.mjs");
  const sealImplementationPath = path.join(projectRoot, "scripts/research-seal-ceremony-slice03.mjs");
  const contract = await readJson(observerContractPath, issues, "external.slice03ObserverContract");
  if (contract) {
    if (contract.observerContractId !== "S03-TECHNICAL-OBSERVER" || contract.contractVersion !== "0.3.0"
      || contract.contractHash !== SLICE03_OBSERVER_CONTRACT_HASH || recordHashWithout(contract, "contractHash") !== SLICE03_OBSERVER_CONTRACT_HASH
      || contract.frozenAt !== SLICE03_OBSERVER_FROZEN_AT
      || contract.implementation?.scriptPath !== "scripts/research-reference-adapters-slice03.mjs"
      || contract.implementation?.implementationSha256 !== SLICE03_OBSERVER_IMPLEMENTATION_HASH) {
      add(issues, "EXTERNAL_OBSERVER_CONTRACT_PIN_MISMATCH", "external.slice03ObserverContract", "actual Slice 03 observer contract identity, self hash, implementation and archival freeze must match the design-lineage pin");
    }
  }
  try {
    const actual = sha256(await readFile(observerImplementationPath));
    if (actual !== SLICE03_OBSERVER_IMPLEMENTATION_HASH
      || qa?.oracle?.designLineageRef?.observerImplementationRef !== `sha256:${actual}`) {
      add(issues, "EXTERNAL_OBSERVER_IMPLEMENTATION_PIN_MISMATCH", "external.slice03ObserverImplementation", `expected ${SLICE03_OBSERVER_IMPLEMENTATION_HASH}, got ${actual}`);
    }
  } catch (error) {
    add(issues, "EXTERNAL_OBSERVER_IMPLEMENTATION_READ_FAILED", "external.slice03ObserverImplementation", error instanceof Error ? error.message : String(error));
  }
  try {
    const actual = sha256(await readFile(sealImplementationPath));
    if (actual !== SLICE03_SEAL_IMPLEMENTATION_HASH || seal?.sealPolicyRef?.implementationSha256 !== actual) {
      add(issues, "EXTERNAL_SEAL_IMPLEMENTATION_PIN_MISMATCH", "external.slice03SealImplementation", `expected ${SLICE03_SEAL_IMPLEMENTATION_HASH}, got ${actual}`);
    }
  } catch (error) {
    add(issues, "EXTERNAL_SEAL_IMPLEMENTATION_READ_FAILED", "external.slice03SealImplementation", error instanceof Error ? error.message : String(error));
  }
  for (const [index, relative] of SLICE03_SEAL_SCHEMA_PATHS.entries()) {
    try {
      const actual = sha256(await readFile(path.join(projectRoot, relative)));
      if (actual !== SLICE03_SEAL_SCHEMA_FILE_HASHES[index]) {
        add(issues, "EXTERNAL_SEAL_SCHEMA_FILE_PIN_MISMATCH", relative, `expected ${SLICE03_SEAL_SCHEMA_FILE_HASHES[index]}, got ${actual}`);
      }
    } catch (error) {
      add(issues, "EXTERNAL_SEAL_SCHEMA_FILE_READ_FAILED", relative, error instanceof Error ? error.message : String(error));
    }
  }
  try {
    const actualTree = await treeDigest(projectRoot, SLICE03_SEAL_SCHEMA_PATHS);
    if (actualTree !== SLICE03_SEAL_SCHEMA_TREE_HASH || seal?.sealPolicyRef?.schemaTreeSha256 !== actualTree) {
      add(issues, "EXTERNAL_SEAL_SCHEMA_TREE_PIN_MISMATCH", "external.slice03SealSchemas", `expected ${SLICE03_SEAL_SCHEMA_TREE_HASH}, got ${actualTree}`);
    }
  } catch (error) {
    add(issues, "EXTERNAL_SEAL_SCHEMA_TREE_READ_FAILED", "external.slice03SealSchemas", error instanceof Error ? error.message : String(error));
  }
}

function validateChronology(records, plans, qa, nowMs, issues) {
  const freezeMs = Date.parse(CANONICAL_SLICE04_FROZEN_AT);
  if (!Number.isFinite(freezeMs) || new Date(freezeMs).toISOString() !== CANONICAL_SLICE04_FROZEN_AT) {
    add(issues, "CANONICAL_FREEZE_INVALID", "chronology.slice04", CANONICAL_SLICE04_FROZEN_AT);
  }
  if (!Number.isFinite(nowMs) || freezeMs > nowMs) {
    add(issues, "SLICE04_FREEZE_IN_FUTURE", "chronology.slice04", `${CANONICAL_SLICE04_FROZEN_AT} > ${Number.isFinite(nowMs) ? new Date(nowMs).toISOString() : String(nowMs)}`);
  }
  for (const [relative, record] of records) if (record?.frozenAt !== CANONICAL_SLICE04_FROZEN_AT) {
    add(issues, "RECORD_FREEZE_MISMATCH", `${relative}.frozenAt`, `expected ${CANONICAL_SLICE04_FROZEN_AT}, got ${record?.frozenAt}`);
  }
  for (const plan of plans) for (const row of plan?.partitions ?? []) if (row.frozenAt !== CANONICAL_SLICE04_FROZEN_AT) {
    add(issues, "PARTITION_FREEZE_MISMATCH", `${plan.partitionPlanId}.${row.partition}.frozenAt`, `expected ${CANONICAL_SLICE04_FROZEN_AT}, got ${row.frozenAt}`);
  }
  const dependencyMs = Date.parse(qa?.oracle?.designLineageRef?.observerDeclaredFrozenAt ?? "invalid");
  if (!Number.isFinite(dependencyMs) || qa?.oracle?.designLineageRef?.observerDeclaredFrozenAt !== SLICE03_OBSERVER_FROZEN_AT
    || dependencyMs > freezeMs) {
    add(issues, "DEPENDENCY_CHRONOLOGY_INVALID", "qaProfile.oracle.designLineageRef.observerDeclaredFrozenAt", "Slice 03 archival freeze must be exact and no later than Slice 04 freeze");
  }
}

async function compareGeneratedTrees(sliceRoot, currentFiles, issues) {
  const wrappers = await Promise.all([
    mkdtemp(path.join(tmpdir(), "single-image-slice04-a-")),
    mkdtemp(path.join(tmpdir(), "single-image-slice04-b-")),
  ]);
  const roots = wrappers.map((wrapper) => path.join(wrapper, "slice-04"));
  let currentHash = "unavailable";
  let generatedHashes = ["unavailable", "unavailable"];
  try {
    await Promise.all(roots.map((root) => generateSlice04({ sliceRoot: root })));
    const generatedTrees = await Promise.all(roots.map((root) => listTree(root, issues)));
    const generatedFiles = generatedTrees.map((tree) => tree.files.sort());
    if (!deepEqual(generatedFiles[0], EXPECTED_GENERATED_FILES) || !deepEqual(generatedFiles[1], EXPECTED_GENERATED_FILES)) {
      add(issues, "GENERATOR_FILE_SET_MISMATCH", "generator", "both independent roots must emit the exact 17-file generated set");
    }
    const currentGenerated = currentFiles.filter((relative) => relative !== "README.md").sort();
    currentHash = await treeDigest(sliceRoot, currentGenerated);
    generatedHashes = await Promise.all(roots.map((root, index) => treeDigest(root, generatedFiles[index])));
    for (const [index, value] of generatedHashes.entries()) if (value !== CANONICAL_SLICE04_GENERATED_TREE_SHA256) {
      add(issues, "GENERATOR_TREE_DIGEST_MISMATCH", `generator-root-${index + 1}`, `expected ${CANONICAL_SLICE04_GENERATED_TREE_SHA256}, got ${value}`);
    }
    if (currentHash !== CANONICAL_SLICE04_GENERATED_TREE_SHA256) add(issues, "CHECKED_IN_GENERATED_TREE_MISMATCH", "generated-tree", `expected ${CANONICAL_SLICE04_GENERATED_TREE_SHA256}, got ${currentHash}`);
    for (const relative of EXPECTED_GENERATED_FILES) {
      if (!currentGenerated.includes(relative) || !generatedFiles[0].includes(relative) || !generatedFiles[1].includes(relative)) continue;
      const [checkedIn, first, second] = await Promise.all([
        readFile(path.join(sliceRoot, relative)), readFile(path.join(roots[0], relative)), readFile(path.join(roots[1], relative)),
      ]);
      if (!checkedIn.equals(first) || !first.equals(second)) add(issues, "GENERATED_FILE_CONTENT_MISMATCH", relative, "checked-in and both independent generator outputs must be byte-identical");
    }
  } catch (error) {
    add(issues, "GENERATOR_COMPARISON_FAILED", "generator", error instanceof Error ? error.message : String(error));
  } finally {
    await Promise.all(wrappers.map((wrapper) => rm(wrapper, { recursive: true, force: true })));
  }
  return { currentHash, generatedHashes };
}

export async function validateSlice04(
  sliceRoot = DEFAULT_SLICE04_ROOT,
  { throwOnError = true, projectRoot = DEFAULT_PROJECT_ROOT, nowMs = Date.now() } = {},
) {
  const issues = [];
  const tree = await listTree(sliceRoot, issues);
  const files = tree.files.sort();
  const directories = tree.directories.sort();
  if (!deepEqual(files, EXPECTED_FILES)) add(issues, "FILE_SET_MISMATCH", "slice-04", `expected ${EXPECTED_FILES.length} exact files, got ${files.length}`);
  if (!deepEqual(directories, EXPECTED_DIRECTORIES)) add(issues, "DIRECTORY_SET_MISMATCH", "slice-04", `expected ${EXPECTED_DIRECTORIES.join(", ")}; got ${directories.join(", ")}`);
  for (const relative of [...files, ...directories]) {
    if (/(?:^|\/)(?:fixtures?|holdout|defect-holdout|escape|bundles?|requests?|receipts?|results?|seeds?|keys?|weights?|models?)(?:\/|\.|$)/iu.test(relative)
      || /\.(?:png|jpe?g|webp|gif|tiff?|avif|heic|heif|raw|bin|zip|tgz|tar|key|pem)$/iu.test(relative)) {
      add(issues, "FORBIDDEN_MATERIAL", relative, "no pixels, formal partitions, bundle/request/result, secret, binary, model or archive material may be checked in");
    }
  }
  let readmeHash = "unavailable";
  let fullTreeHash = "unavailable";
  try {
    const readmeBytes = await readFile(path.join(sliceRoot, "README.md"));
    readmeHash = sha256(readmeBytes);
    if (readmeHash !== CANONICAL_SLICE04_README_SHA256) {
      add(issues, "README_HASH_MISMATCH", "README.md", `expected ${CANONICAL_SLICE04_README_SHA256}, got ${readmeHash}`);
    }
    const readmeText = readmeBytes.toString("utf8");
    if (/(?:data:image\/[a-z0-9.+-]+;base64,|iVBORw0KGgo|-----BEGIN [A-Z ]*PRIVATE KEY-----)/u.test(readmeText)) {
      add(issues, "README_FORBIDDEN_MATERIAL", "README.md", "embedded image bytes or private-key material are forbidden");
    }
  } catch (error) {
    add(issues, "README_READ_FAILED", "README.md", error instanceof Error ? error.message : String(error));
  }
  try {
    fullTreeHash = await treeDigest(sliceRoot, files);
    if (fullTreeHash !== CANONICAL_SLICE04_FULL_TREE_SHA256) {
      add(issues, "FULL_TREE_DIGEST_MISMATCH", "slice-04", `expected ${CANONICAL_SLICE04_FULL_TREE_SHA256}, got ${fullTreeHash}`);
    }
  } catch (error) {
    add(issues, "FULL_TREE_READ_FAILED", "slice-04", error instanceof Error ? error.message : String(error));
  }

  const schemas = new Map();
  for (const filename of SLICE04_SCHEMA_FILES) {
    const schema = await readJson(path.join(sliceRoot, "schemas", filename), issues, `schemas/${filename}`);
    schemas.set(filename, schema);
    if (schema) inspectSchemaNode(schema, issues, `schemas/${filename}`);
  }
  const schemaPaths = SLICE04_SCHEMA_FILES.map((filename) => `schemas/${filename}`).sort();
  let schemaTreeHash = "unavailable";
  try {
    schemaTreeHash = await treeDigest(sliceRoot, schemaPaths);
    if (schemaTreeHash !== CANONICAL_SLICE04_SCHEMA_TREE_SHA256) add(issues, "SCHEMA_TREE_DIGEST_MISMATCH", "schemas", `expected ${CANONICAL_SLICE04_SCHEMA_TREE_SHA256}, got ${schemaTreeHash}`);
  } catch (error) {
    add(issues, "SCHEMA_TREE_READ_FAILED", "schemas", error instanceof Error ? error.message : String(error));
  }

  const records = new Map();
  for (const relative of SLICE04_RECORD_PATHS) {
    const record = await readJson(path.join(sliceRoot, relative), issues, relative);
    records.set(relative, record);
    if (!record) continue;
    if (record.contentHash !== contentHashSlice04(record)) add(issues, "SELF_CONTENT_HASH_MISMATCH", `${relative}.contentHash`, "must hash the stable record with contentHash removed");
    const schemaName = RECORD_SCHEMA.get(relative);
    const schema = schemas.get(schemaName);
    if (schema) for (const error of validateSlice03SchemaInstance(record, schema, relative)) {
      add(issues, "SCHEMA_INSTANCE_INVALID", error.location, error.message);
    }
    if (!deepEqual(record.evidenceBoundary, EXPECTED_EVIDENCE)) add(issues, "EVIDENCE_BOUNDARY_OVERCLAIM", `${relative}.evidenceBoundary`, "all axes remain zero and Release Gate none");
  }

  const ids = new Map();
  for (const [relative, record] of records) {
    const id = recordId(record);
    if (!id) add(issues, "RECORD_ID_MISSING", relative, "record must have one registered top-level ID");
    else if (ids.has(id)) add(issues, "RECORD_ID_DUPLICATE", relative, `${id} already registered by ${ids.get(id)}`);
    else ids.set(id, relative);
  }
  const graph = new Map([...records.keys()].map((relative) => [relative, []]));
  for (const [sourcePath, record] of records) for (const { ref: reference, location } of collectReferences(record, sourcePath)) {
    if (typeof reference.path !== "string" || reference.path.includes("\\") || path.posix.isAbsolute(reference.path)
      || reference.path.split("/").includes("..") || !records.has(reference.path)) {
      add(issues, "REFERENCE_PATH_INVALID", `${location}.path`, String(reference.path));
      continue;
    }
    const target = records.get(reference.path);
    if (reference.id !== recordId(target)) add(issues, "REFERENCE_ID_MISMATCH", `${location}.id`, `${reference.id} != ${recordId(target)}`);
    if (reference.contentHash !== target?.contentHash) add(issues, "REFERENCE_HASH_MISMATCH", `${location}.contentHash`, `${reference.contentHash} != ${target?.contentHash}`);
    graph.get(sourcePath).push(reference.path);
  }
  const sealPath = "preregistrations/seal-intent.normalize-deliver.v0.4.0.json";
  const reachable = new Set();
  const pending = [sealPath];
  while (pending.length) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  if (!deepEqual([...reachable].sort(), [...records.keys()].sort())) add(issues, "REFERENCE_GRAPH_NOT_CLOSED", "sealIntent", `reachable ${reachable.size} of ${records.size} records`);

  const candidate = records.get("candidate-locks/composite-sharp-win32-x64.v0.4.0.json");
  const formatTarget = records.get("profiles/format-target.normalize-deliver.v0.4.0.json");
  const contracts = [
    records.get("contracts/cc-cap02-normalize-png.v0.4.0.json"),
    records.get("contracts/cc-cap02-export-png.v0.4.0.json"),
  ].filter(Boolean);
  const normalizePlan = records.get("preregistrations/partition-plan.normalize-png.v0.4.0.json");
  const exportPlan = records.get("preregistrations/partition-plan.export-png.v0.4.0.json");
  const plans = [normalizePlan, exportPlan].filter(Boolean);
  const plansByOperation = new Map(plans.map((plan) => [plan.operation, plan]));
  const qa = records.get("preregistrations/qa-profile.normalize-deliver.v0.4.0.json");
  const preregs = [
    records.get("preregistrations/preregistration.normalize-png.v0.4.0.json"),
    records.get("preregistrations/preregistration.export-png.v0.4.0.json"),
  ].filter(Boolean);
  const seal = records.get(sealPath);
  validateCandidate(candidate, issues);
  validateFormatTarget(formatTarget, issues);
  validateContracts(contracts, issues);
  validatePartitionPlan(normalizePlan, "normalize", issues);
  validatePartitionPlan(exportPlan, "export", issues);
  validateQa(qa, issues);
  validatePreregistrations(preregs, plansByOperation, qa, issues);
  validateSeal(seal, issues);
  validateChronology(records, plans, qa, nowMs, issues);
  await validateExternalPins(projectRoot, qa, seal, issues);

  const generated = await compareGeneratedTrees(sliceRoot, files, issues);
  const result = {
    ok: issues.length === 0,
    issues,
    summary: {
      records: records.size,
      schemas: schemas.size,
      candidateLocks: candidate ? 1 : 0,
      compositeCandidates: candidate?.compositeCandidateCount ?? 0,
      artifacts: candidate?.artifacts?.length ?? 0,
      nativeVersions: Object.keys(candidate?.bundledNativeVersionsSource?.versions ?? {}).length,
      formatRows: formatTarget?.rows?.length ?? 0,
      contracts: contracts.length,
      partitionPlans: plans.length,
      partitionRows: plans.reduce((total, plan) => total + (plan.partitions?.length ?? 0), 0),
      preregistrations: preregs.length,
      sealIntents: seal ? 1 : 0,
      formalHoldoutStatus: "not-created",
      gateBState: "not-entered",
      candidateLockHash: candidate?.contentHash ?? "unknown",
      generatedSubsetTreeHash: generated.currentHash,
      schemaTreeHash,
      readmeHash,
      fullTreeHash,
    },
  };
  if (!result.ok && throwOnError) throw new Slice04ValidationError(issues);
  return result;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
}

if (isMainModule()) {
  const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SLICE04_ROOT;
  const result = await validateSlice04(requestedRoot, { throwOnError: false });
  if (!result.ok) {
    result.issues.forEach((issue) => console.error(`[${issue.code}] ${issue.location}: ${issue.message}`));
    console.error(`Slice 04 validation failed with ${result.issues.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Slice 04 valid: ${result.summary.records} metadata records, ${result.summary.schemas} schemas, ${result.summary.artifacts} source artifacts, ${result.summary.nativeVersions} native versions, ${result.summary.formatRows} format rows, ${result.summary.contracts} contracts, ${result.summary.partitionPlans} partition plans/${result.summary.partitionRows} rows, ${result.summary.preregistrations} preregistrations.`);
    console.log("Execution boundary: candidate source-resolved; installation=not-installed; execution=not-run; Gate B=not-entered.");
    console.log("Formal holdout: not-created; defect-holdout=not-created; escape diagnostic ledger=not-created; operation-specific artifact schemas/oracles=not-created.");
    console.log("Formal runner, durable consumed-request ledger, trust authority, role assignment and approval: not-created/not-assigned/not-approved; no pixels, seeds, bundle, request, receipt, result, key, model, weight, or EvidenceManifest is present.");
    console.log("Evidence boundary: C1=0; U1=0; E1=0; R1-pipeline=0; R1-product-validation=0; R1-product-release=0; O1=0; G1=0; V1=0.");
    console.log("Release Gate: allowlist=none; registered=0; approved=0; productSupport=false.");
  }
}
