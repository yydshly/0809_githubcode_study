import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonSlice05,
  EXPECTED_INSTALLED_PACKAGES,
  EXPECTED_INSTALLED_TREE_SHA256,
  EXPECTED_PACKAGE_LOCK_SHA256,
  inventorySharpRuntimeSlice05,
  Slice05RuntimeInventoryError,
} from "../scripts/research-inventory-sharp-slice05.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const INSTALLED_PACKAGE_PATHS = [
  ["@img", "colour"],
  ["@img", "sharp-win32-x64"],
  ["detect-libc"],
  ["semver"],
  ["sharp"],
];

let baselinePromise;

function baselineInventory() {
  baselinePromise ??= inventorySharpRuntimeSlice05();
  return baselinePromise;
}

async function tempRuntimeCopy(t, prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const projectRoot = path.join(wrapper, "single-image-studio");
  await mkdir(path.join(projectRoot, "node_modules"), { recursive: true });
  await Promise.all(["package.json", "package-lock.json"].map((name) => (
    cp(path.join(PROJECT_ROOT, name), path.join(projectRoot, name))
  )));
  for (const segments of INSTALLED_PACKAGE_PATHS) {
    const source = path.join(PROJECT_ROOT, "node_modules", ...segments);
    const target = path.join(projectRoot, "node_modules", ...segments);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
  }
  await mkdir(path.join(projectRoot, "node_modules", "@emnapi"), { recursive: true });
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  return projectRoot;
}

async function inventoryTemp(projectRoot) {
  const baseline = await baselineInventory();
  return inventorySharpRuntimeSlice05({
    projectRoot,
    sharpVersionsOverride: baseline.versions.sharpRuntime.values,
    npmVersionOverride: baseline.environment.npm.version,
  });
}

async function expectInventoryCodes(projectRoot, expectedCodes) {
  await assert.rejects(
    () => inventoryTemp(projectRoot),
    (error) => {
      assert.ok(error instanceof Slice05RuntimeInventoryError, String(error));
      const actualCodes = new Set(error.issues.map(({ code }) => code));
      for (const expectedCode of expectedCodes) {
        assert.ok(actualCodes.has(expectedCode), `${expectedCode}: ${JSON.stringify(error.issues)}`);
      }
      return true;
    },
  );
}

async function rewriteJson(filePath, mutate) {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  mutate(value);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("Slice 05 emits a canonical read-only runtime attestation without image processing", async () => {
  const first = await baselineInventory();
  const second = await inventorySharpRuntimeSlice05();

  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, "runtime-inventory.slice05.v0");
  assert.equal(first.inventoryKind, "read-only-runtime-inventory-no-image-processing");
  assert.equal(first.sourceCandidateMetadataRef, "REG-NORM-SHARP@0.4.0");
  assert.equal(first.runtimeCandidateId, "REG-NORM-SHARP@0.5.0");
  assert.equal(first.gateBState, "not-evaluated-by-inventory");
  assert.equal(first.productSupport, false);
  assert.deepEqual(first.packageManifest.devDependencies, {
    "@img/sharp-win32-x64": "0.35.3",
    sharp: "0.35.3",
  });
  assert.match(first.packageManifest.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(first.packageLock.lockfileVersion, 3);
  assert.equal(first.packageLock.pins.length, 5);
  assert.ok(first.packageLock.pins.every(({ resolved, integrity }) => (
    resolved.startsWith("https://registry.npmjs.org/") && integrity.startsWith("sha512-")
  )));
  assert.match(first.packageLock.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(first.packageLock.sha256, EXPECTED_PACKAGE_LOCK_SHA256);
  assert.equal(first.packageLock.expectedSha256, EXPECTED_PACKAGE_LOCK_SHA256);

  assert.deepEqual(first.installed.allowlist, EXPECTED_INSTALLED_PACKAGES);
  assert.deepEqual(first.installed.packages.map(({ name }) => name), EXPECTED_INSTALLED_PACKAGES);
  assert.deepEqual(first.installed.ignoredEmptyScopeDirectories, ["@emnapi"]);
  assert.equal(first.installed.tree.fileCount, 122);
  assert.equal(first.installed.tree.sha256, EXPECTED_INSTALLED_TREE_SHA256);
  assert.deepEqual(
    first.installed.tree.files.map(({ path: filePath }) => filePath),
    first.installed.tree.files.map(({ path: filePath }) => filePath).toSorted(),
  );
  assert.equal(first.installed.nativeArtifacts.length, 3);
  assert.ok(first.installed.nativeArtifacts.every(({ sha256, expectedSha256 }) => sha256 === expectedSha256));
  assert.equal(first.installed.forbiddenArtifactScan.state, "pass");

  assert.equal(first.versions.installedVersionsJson.componentCount, 28);
  assert.equal(first.versions.sharpRuntime.componentCount, 29);
  assert.equal(first.versions.sharpRuntime.values.sharp, "0.35.3");
  assert.equal(first.versions.sharpRuntime.imageProcessingPerformed, false);
  assert.equal(first.versions.slice04PackagingMetadataComparison.state, "known-nine-differences-reported-nonfatal");
  assert.deepEqual(
    first.versions.slice04PackagingMetadataComparison.differences.map(({ componentId }) => componentId),
    ["archive", "expat", "ffi", "glib", "heif", "pango", "rsvg", "tiff", "uhdr"],
  );

  assert.equal(first.environment.os.platform, "win32");
  assert.equal(first.environment.os.architecture, "x64");
  assert.ok(first.environment.cpu.logicalProcessors > 0);
  assert.ok(first.environment.memory.totalBytes > 0);
  assert.match(first.environment.node.version, /^v\d+/u);
  assert.match(first.environment.node.abi, /^\d+$/u);
  assert.match(first.environment.node.napi, /^\d+$/u);
  assert.match(first.environment.npm.version, /^\d+\.\d+\.\d+/u);
  assert.equal(Object.hasOwn(first.environment, "hostname"), false);
  assert.deepEqual(first.privacyBoundary, { hostnameRecorded: false, serialRecorded: false });
  assert.deepEqual(first.executionBoundary, {
    imageBytesRead: false,
    imageDecoded: false,
    imageEncoded: false,
    candidatePipelineInvoked: false,
  });
  assert.ok(Object.values(first.evidenceBoundary).filter((value) => typeof value === "number").every((value) => value === 0));

  const { attestation, ...payload } = first;
  const expectedPayloadHash = createHash("sha256").update(canonicalJsonSlice05(payload), "utf8").digest("hex");
  assert.deepEqual(attestation, {
    canonicalization: "recursive-lexicographic-object-keys-preserve-array-order-utf8-json",
    payloadSha256: expectedPayloadHash,
  });
});

test("canonical installed tree is relocation-independent and ignores an empty scope directory", async (t) => {
  const projectRoot = await tempRuntimeCopy(t, "single-image-slice05-tree-");
  await mkdir(path.join(projectRoot, "node_modules", "@another-empty-scope"));
  const result = await inventoryTemp(projectRoot);
  assert.equal(result.installed.tree.sha256, EXPECTED_INSTALLED_TREE_SHA256);
  assert.deepEqual(result.installed.ignoredEmptyScopeDirectories, ["@another-empty-scope", "@emnapi"]);
  assert.equal(result.versions.sharpRuntime.importPerformed, false);
  assert.equal(result.versions.sharpRuntime.imageProcessingPerformed, false);
});

test("package manifest ranges and package-lock integrity drift fail closed", async (t) => {
  const projectRoot = await tempRuntimeCopy(t, "single-image-slice05-lock-");
  await rewriteJson(path.join(projectRoot, "package.json"), (manifest) => {
    manifest.devDependencies.sharp = "^0.35.3";
  });
  await rewriteJson(path.join(projectRoot, "package-lock.json"), (lock) => {
    lock.packages["node_modules/sharp"].integrity = "sha512-tampered";
  });
  await expectInventoryCodes(projectRoot, [
    "PACKAGE_JSON_DEV_DEPENDENCIES_MISMATCH",
    "PACKAGE_LOCK_CANONICAL_SHA256_MISMATCH",
    "PACKAGE_LOCK_PIN_MISMATCH",
  ]);
});

test("extra package, WASM, native, executable, and archive artifacts are rejected", async (t) => {
  const projectRoot = await tempRuntimeCopy(t, "single-image-slice05-extra-");
  const rogueRoot = path.join(projectRoot, "node_modules", "rogue-package");
  await mkdir(rogueRoot);
  await Promise.all([
    writeFile(path.join(rogueRoot, "package.json"), "{\"name\":\"rogue-package\",\"version\":\"1.0.0\"}\n", "utf8"),
    writeFile(path.join(rogueRoot, "payload.wasm"), new Uint8Array([0, 97, 115, 109])),
    writeFile(path.join(rogueRoot, "payload.dll"), new Uint8Array([1, 2, 3])),
    writeFile(path.join(rogueRoot, "payload.exe"), new Uint8Array([4, 5, 6])),
    writeFile(path.join(rogueRoot, "payload.tgz"), new Uint8Array([7, 8, 9])),
  ]);
  await expectInventoryCodes(projectRoot, [
    "INSTALLED_PACKAGE_ALLOWLIST_MISMATCH",
    "WASM_ARTIFACT_FORBIDDEN",
    "EXTRA_NATIVE_ARTIFACT_FORBIDDEN",
    "EXECUTABLE_ARTIFACT_FORBIDDEN",
    "ARCHIVE_ARTIFACT_FORBIDDEN",
  ]);
});

test("pinned native bytes and the complete allowed-package tree both fail closed on tamper", async (t) => {
  const nativeRoot = await tempRuntimeCopy(t, "single-image-slice05-native-");
  await appendFile(
    path.join(nativeRoot, "node_modules", "@img", "sharp-win32-x64", "lib", "sharp-win32-x64-0.35.3.node"),
    new Uint8Array([0]),
  );
  await expectInventoryCodes(nativeRoot, [
    "INSTALLED_TREE_SHA256_MISMATCH",
    "NATIVE_ARTIFACT_SHA256_MISMATCH",
  ]);

  const regularRoot = await tempRuntimeCopy(t, "single-image-slice05-regular-");
  await appendFile(path.join(regularRoot, "node_modules", "sharp", "README.md"), "\ntampered\n", "utf8");
  await expectInventoryCodes(regularRoot, ["INSTALLED_TREE_SHA256_MISMATCH"]);
});

test("versions.json drift is detected against both exact 28-item pins and sharp.versions", async (t) => {
  const projectRoot = await tempRuntimeCopy(t, "single-image-slice05-versions-");
  const versionsPath = path.join(projectRoot, "node_modules", "@img", "sharp-win32-x64", "versions.json");
  await rewriteJson(versionsPath, (versions) => {
    versions.archive = "3.8.8";
  });
  await expectInventoryCodes(projectRoot, [
    "INSTALLED_TREE_SHA256_MISMATCH",
    "ACTUAL_NATIVE_VERSION_PIN_MISMATCH",
    "VERSIONS_JSON_RUNTIME_MISMATCH",
    "PACKAGING_METADATA_DIFFERENCE_SET_UNEXPECTED",
  ]);
});
