import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsRoot = path.join(projectRoot, "tests");
const scope = process.argv[2];

export const ARCHIVED_LIVE_RUNTIME_TEST_NAMES = Object.freeze([
  "operation-specific open calibration accepts a complete 48x3 independent fake closure",
  "open-calibration validator rejects denominator, inventory, operation, and quiescence drift",
  "frozen Slice 05 definition passes literal pins, fresh inventory, and two-temp regeneration",
  "generated Phase C definition passes full fresh-runtime and twin-regeneration validation with an exact index ref",
  "frozen Slice 06 definition passes central validation",
  "formal validation verifies every literal freeze pin",
  "frozen canonical definition passes literal pins, fresh runtime and regeneration",
  "canonical production definition and registered result closure pass pins, runtime recheck and twin regeneration",
  "canonical Slice 10 definition pins remain stable while the immutable failed result is rejected",
]);

if (!new Set(["product", "research"]).has(scope)) {
  console.error("Usage: node scripts/run-safe-test-scope.mjs <product|research>");
  process.exit(2);
}

const entries = await readdir(testsRoot, { withFileTypes: true });
const allTests = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "en"));

const selected = allTests.filter((name) => (
  scope === "research" ? name.startsWith("research-") : !name.startsWith("research-")
));

if (selected.length === 0) {
  console.error(`No ${scope} test files were found.`);
  process.exit(2);
}

console.log(`Running ${selected.length} ${scope} test files.`);
const testArguments = ["--test"];
if (scope === "research") {
  console.log(
    `Archived research mode excludes ${ARCHIVED_LIVE_RUNTIME_TEST_NAMES.length} live-runtime regeneration tests; `
      + "the immutable snapshots are validated separately.",
  );
}
testArguments.push(...selected.map((name) => path.join("tests", name)));
const run = spawnSync(
  process.execPath,
  testArguments,
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: scope === "research"
      ? { ...process.env, SINGLE_IMAGE_STUDIO_ARCHIVED_RESEARCH: "1" }
      : process.env,
  },
);

if (run.error) throw run.error;
process.exit(run.status ?? 1);
