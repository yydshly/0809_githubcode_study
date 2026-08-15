import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const DEFAULT_PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const NUL = Buffer.from([0]);

export const SLICE05_RUNTIME_INVENTORY_VERSION = "runtime-inventory.slice05.v0";

export const EXPECTED_DEV_DEPENDENCIES = Object.freeze({
  "@img/sharp-win32-x64": "0.35.3",
  sharp: "0.35.3",
});

export const EXPECTED_INSTALLED_PACKAGES = Object.freeze([
  "@img/colour",
  "@img/sharp-win32-x64",
  "detect-libc",
  "semver",
  "sharp",
]);

const EXPECTED_LOCK_PACKAGES = Object.freeze({
  "@img/colour": Object.freeze({
    version: "1.1.0",
    resolved: "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz",
    integrity: "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==",
  }),
  "@img/sharp-win32-x64": Object.freeze({
    version: "0.35.3",
    resolved: "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.3.tgz",
    integrity: "sha512-D4y1vNeZrIIJCN+uHaWVtH86B+aCrdMYYjicy9pXHvbGZeGYLLSd3wdVuC37FxVXlU1ARsk84eKWfWMXGYEqvA==",
  }),
  "detect-libc": Object.freeze({
    version: "2.1.2",
    resolved: "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
    integrity: "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
  }),
  semver: Object.freeze({
    version: "7.8.5",
    resolved: "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
    integrity: "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
  }),
  sharp: Object.freeze({
    version: "0.35.3",
    resolved: "https://registry.npmjs.org/sharp/-/sharp-0.35.3.tgz",
    integrity: "sha512-ej0zVHuZGHCiABXcNxeYhpRnPNPAcvbG8RMdBAhDAxLKkCRVSpK3Iyu7qbqw3JMzoj0REeM6f3tJLtVwl0023Q==",
  }),
});

const EXPECTED_NATIVE_ARTIFACTS = Object.freeze({
  "node_modules/@img/sharp-win32-x64/lib/libvips-42.dll": "6d8ec83a826a1b46ef25a670501fd186475568dd3e48893cb4f756d0f2f428d8",
  "node_modules/@img/sharp-win32-x64/lib/libvips-cpp-8.18.3.dll": "d6eb3395e6f7799c9e2c997aba38068f1ab0684dc08a853013dbe528649306b9",
  "node_modules/@img/sharp-win32-x64/lib/sharp-win32-x64-0.35.3.node": "45dbb968dff27a1e8d8870d2a34e6f5418fa2a1a4fe27a7ed13ab2fb3f895468",
});

const EXPECTED_ACTUAL_NATIVE_VERSIONS = Object.freeze({
  aom: "3.14.1",
  archive: "3.8.7",
  cairo: "1.18.4",
  cgif: "0.5.3",
  exif: "0.6.26",
  expat: "2.8.1",
  ffi: "3.5.2",
  fontconfig: "2.18.1",
  freetype: "2.14.3",
  fribidi: "1.0.16",
  glib: "2.89.0",
  harfbuzz: "14.2.1",
  heif: "1.23.0",
  highway: "1.4.0",
  imagequant: "2.4.1",
  lcms: "2.19.1",
  mozjpeg: "0826579",
  pango: "1.57.1",
  pixman: "0.46.4",
  png: "1.6.58",
  "proxy-libintl": "0.5",
  rsvg: "2.62.3",
  tiff: "732665c",
  uhdr: "13a058f",
  vips: "8.18.3",
  webp: "1.6.0",
  xml2: "2.15.3",
  "zlib-ng": "2.3.3",
});

const SLICE04_PACKAGING_METADATA_VERSIONS = Object.freeze({
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

const EXPECTED_PACKAGING_DIFFERENCE_IDS = Object.freeze([
  "archive",
  "expat",
  "ffi",
  "glib",
  "heif",
  "pango",
  "rsvg",
  "tiff",
  "uhdr",
]);

// Filled from the exact five-package installed tree using the canonical
// path+NUL+decimal-length+NUL+file-sha256+NUL algorithm below.
export const EXPECTED_INSTALLED_TREE_SHA256 = "a419af3606ca38f1878acb65d1ea273f0c129b0c156686b1e912bab1b167070e";
export const EXPECTED_PACKAGE_LOCK_SHA256 = "16963d711f878ea6295a278310e3aad579d099a60f1b5e73a6a91d26dc485a2c";

const FORBIDDEN_ARCHIVE_EXTENSIONS = new Set([
  ".7z", ".bz2", ".gz", ".rar", ".tar", ".tgz", ".xz", ".zip",
]);
const NATIVE_EXTENSIONS = new Set([".dll", ".dylib", ".node", ".so"]);

export class Slice05RuntimeInventoryError extends Error {
  constructor(issues) {
    super(`Slice 05 runtime inventory failed with ${issues.length} issue(s)`);
    this.name = "Slice05RuntimeInventoryError";
    this.issues = issues;
  }
}

function issue(issues, code, location, message) {
  issues.push({ code, location, message });
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join("/");
}

function projectRelative(projectRoot, filePath) {
  const relative = path.relative(projectRoot, filePath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new TypeError(`Path is outside the project root: ${filePath}`);
  }
  return normalizeRelative(relative);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalJsonSlice05(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJsonSlice05(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${canonicalJsonSlice05(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function readBytesAndHash(filePath) {
  const bytes = await fs.readFile(filePath);
  return { byteLength: bytes.byteLength, sha256: sha256(bytes), bytes };
}

async function readJson(filePath, issues, code) {
  try {
    const bytes = await fs.readFile(filePath);
    return { value: JSON.parse(bytes.toString("utf8")), bytes };
  } catch (error) {
    issue(issues, code, normalizeRelative(filePath), error instanceof Error ? error.message : String(error));
    return null;
  }
}

function exactStringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, entry]) => typeof key !== "string" || typeof entry !== "string")) return null;
  return Object.fromEntries(entries.sort(([a], [b]) => compareText(a, b)));
}

function mapsEqual(left, right) {
  return JSON.stringify(exactStringMap(left)) === JSON.stringify(exactStringMap(right));
}

async function enumerateInstalledPackages(projectRoot, issues) {
  const nodeModulesRoot = path.join(projectRoot, "node_modules");
  let rootEntries;
  try {
    rootEntries = await fs.readdir(nodeModulesRoot, { withFileTypes: true });
  } catch (error) {
    issue(issues, "NODE_MODULES_READ_FAILED", "node_modules", error instanceof Error ? error.message : String(error));
    return { installedPackages: [], ignoredEmptyScopes: [], nodeModulesRoot };
  }

  const installedPackages = [];
  const ignoredEmptyScopes = [];
  for (const entry of rootEntries.sort((a, b) => compareText(a.name, b.name))) {
    if (entry.name === ".bin" && entry.isDirectory()) continue;
    if (entry.name === ".package-lock.json" && entry.isFile()) continue;
    const entryPath = path.join(nodeModulesRoot, entry.name);
    if (entry.isSymbolicLink()) {
      issue(issues, "NODE_MODULES_SYMLINK_FORBIDDEN", `node_modules/${entry.name}`, "package and scope entries must not be symlinks or junctions");
      continue;
    }
    if (!entry.isDirectory()) {
      issue(issues, "NODE_MODULES_ENTRY_FORBIDDEN", `node_modules/${entry.name}`, "only package directories and npm support entries are allowed");
      continue;
    }
    if (!entry.name.startsWith("@")) {
      installedPackages.push({ name: entry.name, absolutePath: entryPath });
      continue;
    }

    const scopeEntries = await fs.readdir(entryPath, { withFileTypes: true });
    if (scopeEntries.length === 0) {
      ignoredEmptyScopes.push(entry.name);
      continue;
    }
    for (const child of scopeEntries.sort((a, b) => compareText(a.name, b.name))) {
      const relative = `node_modules/${entry.name}/${child.name}`;
      if (child.isSymbolicLink()) {
        issue(issues, "NODE_MODULES_SYMLINK_FORBIDDEN", relative, "package entries must not be symlinks or junctions");
      } else if (!child.isDirectory()) {
        issue(issues, "NODE_MODULES_SCOPE_ENTRY_FORBIDDEN", relative, "scope entries must be package directories");
      } else {
        installedPackages.push({ name: `${entry.name}/${child.name}`, absolutePath: path.join(entryPath, child.name) });
      }
    }
  }

  installedPackages.sort((a, b) => compareText(a.name, b.name));
  ignoredEmptyScopes.sort(compareText);
  return { installedPackages, ignoredEmptyScopes, nodeModulesRoot };
}

async function collectPackageFiles(projectRoot, packageRoot, issues, output = []) {
  let entries;
  try {
    entries = await fs.readdir(packageRoot, { withFileTypes: true });
  } catch (error) {
    issue(issues, "INSTALLED_PACKAGE_READ_FAILED", normalizeRelative(packageRoot), error instanceof Error ? error.message : String(error));
    return output;
  }
  for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
    const absolutePath = path.join(packageRoot, entry.name);
    const relativePath = projectRelative(projectRoot, absolutePath);
    if (entry.isSymbolicLink()) {
      issue(issues, "INSTALLED_PACKAGE_SYMLINK_FORBIDDEN", relativePath, "installed package trees must not contain symlinks or junctions");
    } else if (entry.isDirectory()) {
      await collectPackageFiles(projectRoot, absolutePath, issues, output);
    } else if (entry.isFile()) {
      const file = await readBytesAndHash(absolutePath);
      output.push({ path: relativePath, byteLength: file.byteLength, sha256: file.sha256 });
    } else {
      issue(issues, "INSTALLED_PACKAGE_ENTRY_FORBIDDEN", relativePath, "only regular files and directories are allowed");
    }
  }
  return output;
}

function digestFileRecords(files) {
  const digest = createHash("sha256");
  for (const file of [...files].sort((a, b) => compareText(a.path, b.path))) {
    digest.update(Buffer.from(file.path, "utf8"));
    digest.update(NUL);
    digest.update(Buffer.from(String(file.byteLength), "ascii"));
    digest.update(NUL);
    digest.update(Buffer.from(file.sha256, "ascii"));
    digest.update(NUL);
  }
  return digest.digest("hex");
}

export async function computeInstalledPackageTreeSlice05(projectRoot = DEFAULT_PROJECT_ROOT) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const issues = [];
  const { installedPackages, ignoredEmptyScopes } = await enumerateInstalledPackages(resolvedProjectRoot, issues);
  const actualNames = installedPackages.map(({ name }) => name);
  if (JSON.stringify(actualNames) !== JSON.stringify(EXPECTED_INSTALLED_PACKAGES)) {
    issue(issues, "INSTALLED_PACKAGE_ALLOWLIST_MISMATCH", "node_modules", `expected only ${EXPECTED_INSTALLED_PACKAGES.join(", ")}; got ${actualNames.join(", ")}`);
  }
  const files = [];
  for (const packageEntry of installedPackages.filter(({ name }) => EXPECTED_INSTALLED_PACKAGES.includes(name))) {
    await collectPackageFiles(resolvedProjectRoot, packageEntry.absolutePath, issues, files);
  }
  files.sort((a, b) => compareText(a.path, b.path));
  return {
    issues,
    installedPackages,
    ignoredEmptyScopes,
    files,
    sha256: digestFileRecords(files),
  };
}

async function scanForbiddenArtifacts(projectRoot, nodeModulesRoot, issues) {
  const allowedNativePaths = new Set(Object.keys(EXPECTED_NATIVE_ARTIFACTS));
  const nativeArtifacts = [];
  let scannedFiles = 0;

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = projectRelative(projectRoot, absolutePath);
      if (entry.isSymbolicLink()) {
        issue(issues, "NODE_MODULES_SYMLINK_FORBIDDEN", relativePath, "the locked win32-x64 runtime must contain no symlinks or junctions");
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      scannedFiles += 1;
      const lowerName = entry.name.toLowerCase();
      const extension = path.extname(lowerName);
      if (extension === ".wasm") {
        issue(issues, "WASM_ARTIFACT_FORBIDDEN", relativePath, "WASM artifacts are outside the locked win32-x64 runtime");
      } else if (extension === ".exe") {
        issue(issues, "EXECUTABLE_ARTIFACT_FORBIDDEN", relativePath, "executable artifacts are forbidden");
      } else if (FORBIDDEN_ARCHIVE_EXTENSIONS.has(extension)) {
        issue(issues, "ARCHIVE_ARTIFACT_FORBIDDEN", relativePath, "archives must not remain in the installed runtime tree");
      }
      if (NATIVE_EXTENSIONS.has(extension)) {
        const file = await readBytesAndHash(absolutePath);
        const expectedHash = EXPECTED_NATIVE_ARTIFACTS[relativePath];
        nativeArtifacts.push({ path: relativePath, byteLength: file.byteLength, sha256: file.sha256, expectedSha256: expectedHash ?? null });
        if (!allowedNativePaths.has(relativePath)) {
          issue(issues, "EXTRA_NATIVE_ARTIFACT_FORBIDDEN", relativePath, "only the three pinned win32-x64 native artifacts are allowed");
        } else if (file.sha256 !== expectedHash) {
          issue(issues, "NATIVE_ARTIFACT_SHA256_MISMATCH", relativePath, `expected ${expectedHash}, got ${file.sha256}`);
        }
      }
    }
  }

  try {
    await walk(nodeModulesRoot);
  } catch (error) {
    issue(issues, "FORBIDDEN_ARTIFACT_SCAN_FAILED", "node_modules", error instanceof Error ? error.message : String(error));
  }
  nativeArtifacts.sort((a, b) => compareText(a.path, b.path));
  for (const expectedPath of Object.keys(EXPECTED_NATIVE_ARTIFACTS)) {
    if (!nativeArtifacts.some(({ path: actualPath }) => actualPath === expectedPath)) {
      issue(issues, "NATIVE_ARTIFACT_MISSING", expectedPath, "required pinned native artifact is missing");
    }
  }
  return { scannedFiles, nativeArtifacts };
}

async function readNpmVersion() {
  const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd --version"] : ["--version"];
  const { stdout } = await execFileAsync(command, args, { timeout: 10_000, windowsHide: true });
  return stdout.trim();
}

function runtimeEnvironment(npmVersion) {
  const cpuModels = [...new Set(os.cpus().map(({ model }) => model.trim()).filter(Boolean))].sort(compareText);
  return {
    os: {
      platform: os.platform(),
      release: os.release(),
      version: os.version(),
      architecture: os.arch(),
    },
    cpu: {
      models: cpuModels,
      logicalProcessors: os.cpus().length,
    },
    memory: {
      totalBytes: os.totalmem(),
    },
    node: {
      version: process.version,
      abi: process.versions.modules,
      napi: process.versions.napi,
    },
    npm: {
      version: npmVersion,
    },
  };
}

function packagePath(name) {
  return `node_modules/${name}`;
}

function compareVersionMaps(actualVersions, sharpVersions, issues) {
  const actualMap = exactStringMap(actualVersions);
  const runtimeMap = exactStringMap(sharpVersions);
  if (!actualMap || !runtimeMap) {
    issue(issues, "RUNTIME_VERSION_MAP_INVALID", "versions", "versions.json and sharp.versions must be string maps");
    return { actualMap: actualMap ?? {}, runtimeMap: runtimeMap ?? {}, differences: [] };
  }
  if (!mapsEqual(actualMap, EXPECTED_ACTUAL_NATIVE_VERSIONS)) {
    issue(issues, "ACTUAL_NATIVE_VERSION_PIN_MISMATCH", "node_modules/@img/sharp-win32-x64/versions.json", "the 28 installed native versions differ from the pinned win32-x64 runtime");
  }
  const runtimeNativeMap = { ...runtimeMap };
  const runtimeSharpVersion = runtimeNativeMap.sharp;
  delete runtimeNativeMap.sharp;
  if (runtimeSharpVersion !== "0.35.3") {
    issue(issues, "SHARP_RUNTIME_VERSION_MISMATCH", "sharp.versions.sharp", `expected 0.35.3, got ${runtimeSharpVersion ?? "missing"}`);
  }
  if (!mapsEqual(runtimeNativeMap, actualMap)) {
    issue(issues, "VERSIONS_JSON_RUNTIME_MISMATCH", "sharp.versions", "sharp.versions native entries must exactly match the installed versions.json entries");
  }

  const keys = [...new Set([...Object.keys(SLICE04_PACKAGING_METADATA_VERSIONS), ...Object.keys(actualMap)])].sort(compareText);
  const differences = keys.filter((key) => SLICE04_PACKAGING_METADATA_VERSIONS[key] !== actualMap[key]).map((componentId) => ({
    componentId,
    slice04PackagingMetadataVersion: SLICE04_PACKAGING_METADATA_VERSIONS[componentId] ?? null,
    installedVersionsJsonVersion: actualMap[componentId] ?? null,
    sharpRuntimeVersion: runtimeNativeMap[componentId] ?? null,
    disposition: "reported-nonfatal-packaging-metadata-difference",
  }));
  const differenceIds = differences.map(({ componentId }) => componentId);
  if (JSON.stringify(differenceIds) !== JSON.stringify(EXPECTED_PACKAGING_DIFFERENCE_IDS)) {
    issue(issues, "PACKAGING_METADATA_DIFFERENCE_SET_UNEXPECTED", "versions.slice04PackagingMetadataDifferences", `expected the known nine differences ${EXPECTED_PACKAGING_DIFFERENCE_IDS.join(", ")}; got ${differenceIds.join(", ")}`);
  }
  return { actualMap, runtimeMap, differences };
}

function noEvidenceBoundary() {
  return {
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
  };
}

export async function inventorySharpRuntimeSlice05(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? DEFAULT_PROJECT_ROOT);
  const issues = [];
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageLockPath = path.join(projectRoot, "package-lock.json");

  const packageJsonResult = await readJson(packageJsonPath, issues, "PACKAGE_JSON_READ_FAILED");
  const packageLockResult = await readJson(packageLockPath, issues, "PACKAGE_LOCK_READ_FAILED");
  if (!packageJsonResult || !packageLockResult) throw new Slice05RuntimeInventoryError(issues);

  const packageJson = packageJsonResult.value;
  const packageLock = packageLockResult.value;
  const packageJsonHash = sha256(packageJsonResult.bytes);
  const packageLockHash = sha256(packageLockResult.bytes);
  if (!mapsEqual(packageJson.devDependencies, EXPECTED_DEV_DEPENDENCIES)
      || packageJson.dependencies !== undefined
      || packageJson.optionalDependencies !== undefined) {
    issue(issues, "PACKAGE_JSON_DEV_DEPENDENCIES_MISMATCH", "package.json", "devDependencies must contain exactly sharp and @img/sharp-win32-x64 at 0.35.3, with no runtime or optional dependency block");
  }
  if (packageLock.lockfileVersion !== 3 || packageLock.requires !== true || !packageLock.packages || typeof packageLock.packages !== "object") {
    issue(issues, "PACKAGE_LOCK_V3_INVALID", "package-lock.json", "lockfileVersion=3, requires=true and a packages object are required");
  }
  if (packageLockHash !== EXPECTED_PACKAGE_LOCK_SHA256) {
    issue(issues, "PACKAGE_LOCK_CANONICAL_SHA256_MISMATCH", "package-lock.json", `expected ${EXPECTED_PACKAGE_LOCK_SHA256}, got ${packageLockHash}`);
  }
  const lockRoot = packageLock.packages?.[""];
  if (!lockRoot || !mapsEqual(lockRoot.devDependencies, EXPECTED_DEV_DEPENDENCIES)
      || lockRoot.dependencies !== undefined || lockRoot.optionalDependencies !== undefined) {
    issue(issues, "PACKAGE_LOCK_ROOT_DEPENDENCIES_MISMATCH", "package-lock.json#packages['']", "the lock root must repeat the exact two devDependencies only");
  }

  for (const [name, expected] of Object.entries(EXPECTED_LOCK_PACKAGES)) {
    const location = packagePath(name);
    const locked = packageLock.packages?.[location];
    if (!locked || locked.version !== expected.version || locked.resolved !== expected.resolved
        || locked.integrity !== expected.integrity || locked.dev !== true) {
      issue(issues, "PACKAGE_LOCK_PIN_MISMATCH", location, `expected exact ${expected.version} resolved URL and integrity`);
    }
  }

  const tree = await computeInstalledPackageTreeSlice05(projectRoot);
  issues.push(...tree.issues);
  if (tree.sha256 !== EXPECTED_INSTALLED_TREE_SHA256) {
    issue(issues, "INSTALLED_TREE_SHA256_MISMATCH", "node_modules", `expected ${EXPECTED_INSTALLED_TREE_SHA256}, got ${tree.sha256}`);
  }

  const installedPackageRecords = [];
  for (const { name, absolutePath } of tree.installedPackages.filter(({ name }) => EXPECTED_INSTALLED_PACKAGES.includes(name))) {
    const manifestPath = path.join(absolutePath, "package.json");
    const manifestResult = await readJson(manifestPath, issues, "INSTALLED_PACKAGE_MANIFEST_READ_FAILED");
    if (!manifestResult) continue;
    const expected = EXPECTED_LOCK_PACKAGES[name];
    if (manifestResult.value.name !== name || manifestResult.value.version !== expected.version) {
      issue(issues, "INSTALLED_PACKAGE_IDENTITY_MISMATCH", projectRelative(projectRoot, manifestPath), `expected ${name}@${expected.version}`);
    }
    installedPackageRecords.push({
      name,
      version: manifestResult.value.version,
      path: projectRelative(projectRoot, absolutePath),
      packageJsonSha256: sha256(manifestResult.bytes),
    });
  }

  const forbiddenScan = await scanForbiddenArtifacts(projectRoot, path.join(projectRoot, "node_modules"), issues);
  const versionsPath = path.join(projectRoot, "node_modules", "@img", "sharp-win32-x64", "versions.json");
  const versionsResult = await readJson(versionsPath, issues, "VERSIONS_JSON_READ_FAILED");
  let sharpVersions = options.sharpVersionsOverride;
  if (!sharpVersions) {
    try {
      const projectRequire = createRequire(packageJsonPath);
      const sharp = projectRequire("sharp");
      sharpVersions = sharp.versions;
    } catch (error) {
      issue(issues, "SHARP_IMPORT_FAILED", "node_modules/sharp", error instanceof Error ? error.message : String(error));
      sharpVersions = {};
    }
  }
  const comparedVersions = compareVersionMaps(versionsResult?.value ?? {}, sharpVersions ?? {}, issues);

  let npmVersion = options.npmVersionOverride;
  if (!npmVersion) {
    try {
      npmVersion = await readNpmVersion();
    } catch (error) {
      issue(issues, "NPM_VERSION_READ_FAILED", "environment.npm", error instanceof Error ? error.message : String(error));
      npmVersion = "unknown";
    }
  }
  const environment = runtimeEnvironment(npmVersion);
  if (environment.os.platform !== "win32" || environment.os.architecture !== "x64") {
    issue(issues, "RUNTIME_PLATFORM_MISMATCH", "environment.os", `expected win32/x64, got ${environment.os.platform}/${environment.os.architecture}`);
  }
  if (!environment.node.abi || !environment.node.napi) {
    issue(issues, "NODE_ABI_OR_NAPI_MISSING", "environment.node", "Node ABI and N-API versions must be observable");
  }

  if (issues.length > 0) throw new Slice05RuntimeInventoryError(issues);

  const versionsJsonHash = versionsResult ? sha256(versionsResult.bytes) : null;
  const payload = {
    schemaVersion: SLICE05_RUNTIME_INVENTORY_VERSION,
    inventoryKind: "read-only-runtime-inventory-no-image-processing",
    sourceCandidateMetadataRef: "REG-NORM-SHARP@0.4.0",
    runtimeCandidateId: "REG-NORM-SHARP@0.5.0",
    gateBState: "not-evaluated-by-inventory",
    productSupport: false,
    evidenceBoundary: noEvidenceBoundary(),
    packageManifest: {
      path: "package.json",
      sha256: packageJsonHash,
      devDependencies: { ...EXPECTED_DEV_DEPENDENCIES },
    },
    packageLock: {
      path: "package-lock.json",
      sha256: packageLockHash,
      expectedSha256: EXPECTED_PACKAGE_LOCK_SHA256,
      lockfileVersion: 3,
      pins: Object.entries(EXPECTED_LOCK_PACKAGES).sort(([a], [b]) => compareText(a, b)).map(([name, pin]) => ({ name, ...pin })),
    },
    installed: {
      allowlist: [...EXPECTED_INSTALLED_PACKAGES],
      packages: installedPackageRecords.sort((a, b) => compareText(a.name, b.name)),
      ignoredEmptyScopeDirectories: tree.ignoredEmptyScopes,
      tree: {
        algorithm: "sha256(sorted(project-relative-path + NUL + decimal-byte-length + NUL + file-sha256 + NUL))",
        fileCount: tree.files.length,
        sha256: tree.sha256,
        expectedSha256: EXPECTED_INSTALLED_TREE_SHA256,
        files: tree.files,
      },
      forbiddenArtifactScan: {
        state: "pass",
        scannedFiles: forbiddenScan.scannedFiles,
        wasmAllowed: false,
        executableAllowed: false,
        archiveAllowed: false,
        extraNativeAllowed: false,
      },
      nativeArtifacts: forbiddenScan.nativeArtifacts,
    },
    versions: {
      installedVersionsJson: {
        path: "node_modules/@img/sharp-win32-x64/versions.json",
        sha256: versionsJsonHash,
        componentCount: Object.keys(comparedVersions.actualMap).length,
        values: comparedVersions.actualMap,
      },
      sharpRuntime: {
        importPerformed: options.sharpVersionsOverride === undefined,
        imageProcessingPerformed: false,
        componentCount: Object.keys(comparedVersions.runtimeMap).length,
        values: comparedVersions.runtimeMap,
        matchesInstalledVersionsJson: true,
      },
      slice04PackagingMetadataComparison: {
        state: "known-nine-differences-reported-nonfatal",
        packagingComponentCount: Object.keys(SLICE04_PACKAGING_METADATA_VERSIONS).length,
        differenceCount: comparedVersions.differences.length,
        differences: comparedVersions.differences,
      },
    },
    environment,
    privacyBoundary: {
      hostnameRecorded: false,
      serialRecorded: false,
    },
    executionBoundary: {
      imageBytesRead: false,
      imageDecoded: false,
      imageEncoded: false,
      candidatePipelineInvoked: false,
    },
  };
  return {
    ...payload,
    attestation: {
      canonicalization: "recursive-lexicographic-object-keys-preserve-array-order-utf8-json",
      payloadSha256: sha256(Buffer.from(canonicalJsonSlice05(payload), "utf8")),
    },
  };
}

async function main() {
  try {
    const inventory = await inventorySharpRuntimeSlice05();
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } catch (error) {
    if (error instanceof Slice05RuntimeInventoryError) {
      process.stderr.write(`${JSON.stringify({ error: error.message, issues: error.issues }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await main();
