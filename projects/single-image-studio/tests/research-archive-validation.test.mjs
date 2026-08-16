import assert from "node:assert/strict";
import test from "node:test";

import { validateArchivedResearch } from "../scripts/research-validate-archive.mjs";

test("archived Slice 01-11 snapshots remain internally valid after product package scripts evolve", async () => {
  const report = await validateArchivedResearch();
  assert.equal(report.mode, "archived-immutable-snapshots");
  assert.equal(report.currentRuntimeComparedToFrozenPackageManifest, false);
  assert.equal(report.reports.length, 11);
  assert.deepEqual(report.reports.map(({ slice }) => slice), ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]);
  assert.equal(report.valid, true, JSON.stringify(report.reports.filter(({ valid }) => !valid), null, 2));
});
