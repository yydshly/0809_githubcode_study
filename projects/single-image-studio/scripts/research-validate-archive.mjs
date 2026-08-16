import { fileURLToPath } from "node:url";
import path from "node:path";

import { validateResearchTree } from "./research-validate-fixtures.mjs";
import { validateSlice02 } from "./research-validate-slice02.mjs";
import { validateSlice03 } from "./research-validate-slice03.mjs";
import { validateSlice04 } from "./research-validate-slice04.mjs";
import { validateSlice05Definition } from "./research-validate-slice05.mjs";
import { validateSlice06Definition } from "./research-validate-slice06.mjs";
import { validateSlice07Definition } from "./research-validate-slice07.mjs";
import { validateSlice08Definition } from "./research-validate-slice08.mjs";
import { validateSlice09Definition } from "./research-validate-slice09.mjs";
import { validateSlice10Definition } from "./research-validate-slice10.mjs";
import { validateSlice11Definition } from "./research-validate-slice11.mjs";

const EXPECTED_SLICE09_LIVE_MANIFEST_DRIFT = Object.freeze([
  Object.freeze({ code: "S09_FILE_BYTES_MISMATCH", location: "definition-index.v0.9.0.json" }),
  Object.freeze({ code: "S09_FILE_BYTES_MISMATCH", location: "runtime/runtime-attestation.v0.9.0.json" }),
]);

function exactExpectedIssues(actual, expected) {
  if (actual.length !== expected.length) return false;
  return expected.every(({ code, location }) => (
    actual.some((issue) => issue.code === code && issue.location === location)
  ));
}

export async function validateArchivedResearch() {
  const reports = [];
  const add = (slice, report, valid = report.ok ?? report.valid, warnings = []) => {
    reports.push(Object.freeze({
      slice,
      valid: Boolean(valid),
      issues: Object.freeze(Boolean(valid) ? [] : [...(report.issues ?? [])]),
      warnings: Object.freeze([...warnings]),
    }));
  };

  add("01", await validateResearchTree(undefined, { throwOnError: false }));
  add("02", await validateSlice02(undefined, { throwOnError: false }));
  add("03", await validateSlice03(undefined, { throwOnError: false }));
  add("04", await validateSlice04(undefined, { throwOnError: false }));

  const archivedOptions = Object.freeze({
    requirePins: true,
    recheckRuntime: false,
    regenerate: false,
  });
  add("05", await validateSlice05Definition(archivedOptions));
  add("06", await validateSlice06Definition(archivedOptions));
  add("07", await validateSlice07Definition(archivedOptions));
  add("08", await validateSlice08Definition(archivedOptions));

  const slice09 = await validateSlice09Definition(archivedOptions);
  const slice09ArchiveValid = slice09.pinsVerified === true
    && slice09.postRun?.valid === true
    && exactExpectedIssues(slice09.issues, EXPECTED_SLICE09_LIVE_MANIFEST_DRIFT);
  add("09", slice09, slice09ArchiveValid, slice09ArchiveValid ? slice09.issues : []);

  add("10", await validateSlice10Definition(archivedOptions));
  add("11", await validateSlice11Definition(archivedOptions));

  return Object.freeze({
    valid: reports.every(({ valid }) => valid),
    mode: "archived-immutable-snapshots",
    currentRuntimeComparedToFrozenPackageManifest: false,
    reports: Object.freeze(reports),
  });
}

async function main() {
  const report = await validateArchivedResearch();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
