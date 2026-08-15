import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSourceCardMattingBaselineBundle, materializeSourceCardMattingBaseline,
  validateSourceCardMattingBaseline,
} from "../scripts/research-run-sourcecard-matting-baseline.mjs";

test("SourceCard plus simple matting baseline deterministically closes the three original MATTE-GT fixtures", async () => {
  const first = await buildSourceCardMattingBaselineBundle();
  const second = await buildSourceCardMattingBaselineBundle();
  assert.deepEqual([...first.fileMap], [...second.fileMap]);
  assert.equal(first.report.cases.length, 3);
  assert.equal(first.report.evidenceBoundary.c1, 0);
  assert.equal(first.report.evidenceBoundary.productSupport, false);
  assert.ok(first.report.cases.every((entry) => entry.sourceCard.quality.blur.value === "unknown"));
  assert.ok(first.report.cases.every((entry) => entry.sourceCard.subject.primarySubjectType.value === "unknown"));
  assert.ok(first.report.cases.every((entry) => entry.metrics.pixelCount === 160 * 120));
  assert.ok(first.report.cases.every((entry) => entry.predicted.path.startsWith("results/sourcecard-matting-baseline-v0/predicted/")));
});

test("materialized SourceCard/matting baseline is byte-for-byte rebuildable and rejects extra output", async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "sourcecard-matting-baseline-"));
  const bundle = await materializeSourceCardMattingBaseline({ outputRoot });
  const report = await validateSourceCardMattingBaseline({ outputRoot });
  assert.equal(report.valid, true);
  assert.equal(report.fileCount, 4);
  assert.equal(report.contentHash, bundle.report.contentHash);
  await assert.rejects(() => materializeSourceCardMattingBaseline({ outputRoot }), { code: "EEXIST" });
});
