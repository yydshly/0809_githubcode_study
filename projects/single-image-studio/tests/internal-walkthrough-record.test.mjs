import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERNAL_WALKTHROUGH_VERSION,
  summarizeInternalWalkthroughRecords,
  validateInternalWalkthroughRecord,
} from "../web/internal-walkthrough-record.js";

function validRecord() {
  return {
    version: INTERNAL_WALKTHROUGH_VERSION,
    sessionId: "IW-S01",
    buildCommit: "abcdef1",
    browserProfile: "Chrome desktop · 1440 × 900 · 100%",
    startedAt: "2026-08-18T08:00:00.000Z",
    completedAt: "2026-08-18T08:03:00.000Z",
    consentConfirmed: true,
    projectImagesOnly: true,
    tasks: [
      { taskId: "basic-edit", outcome: "completed-unassisted", durationSeconds: 70, helpCount: 0, entryFound: true, downloadObserved: true, boundaryUnderstood: true, confidence: 4, issueCode: "none", boundedNote: "" },
      { taskId: "privacy-share", outcome: "completed-assisted", durationSeconds: 95, helpCount: 1, entryFound: true, downloadObserved: true, boundaryUnderstood: false, confidence: 3, issueCode: "boundary-not-understood", boundedNote: "把清除元数据理解成隐藏画面文字。" },
    ],
    overallNote: "第二项需要更清楚的边界提示。",
  };
}

test("internal walkthrough record keeps the two tasks strict and anonymous", () => {
  const normalized = validateInternalWalkthroughRecord(validRecord());
  assert.equal(normalized.tasks.length, 2);
  assert.equal(normalized.tasks[1].issueCode, "boundary-not-understood");
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.tasks), true);
});

test("internal walkthrough record rejects unknown fields, missing consent, PII and task replay", () => {
  assert.throws(() => validateInternalWalkthroughRecord({ ...validRecord(), participantName: "not allowed" }), /不支持的字段/);
  assert.throws(() => validateInternalWalkthroughRecord({ ...validRecord(), consentConfirmed: false }), /必须确认同意/);
  const personal = validRecord(); personal.overallNote = "联系 test@example.com";
  assert.throws(() => validateInternalWalkthroughRecord(personal), /邮箱或手机号码/);
  const replay = validRecord(); replay.tasks = [replay.tasks[0], replay.tasks[0]];
  assert.throws(() => validateInternalWalkthroughRecord(replay), /任务顺序或身份无效/);
  const assistedWithoutHelp = validRecord(); assistedWithoutHelp.tasks[1] = { ...assistedWithoutHelp.tasks[1], helpCount: 0 };
  assert.throws(() => validateInternalWalkthroughRecord(assistedWithoutHelp), /求助次数必须大于 0/);
  const falseNoIssue = validRecord(); falseNoIssue.tasks[0] = { ...falseNoIssue.tasks[0], downloadObserved: false };
  assert.throws(() => validateInternalWalkthroughRecord(falseNoIssue), /不能记录为没有问题/);
});

test("small walkthrough summaries remain formative and cannot claim a pass", () => {
  const summary = summarizeInternalWalkthroughRecords([validRecord(), { ...validRecord(), sessionId: "IW-S02" }]);
  assert.equal(summary.sessions, 2);
  assert.equal(summary.taskSummaries[0].completedUnassisted, 2);
  assert.equal(summary.taskSummaries[0].entryFound, 2);
  assert.equal(summary.taskSummaries[1].issueCounts["boundary-not-understood"], 2);
  assert.deepEqual(summary.buildGroups, [{ buildCommit: "abcdef1", sessions: 2 }]);
  assert.equal(summary.mixedBuilds, false);
  assert.equal(summary.interpretation, "formative-only-no-pass-claim");
  assert.equal(JSON.stringify(summary).includes("第二项需要更清楚"), false);
  assert.equal(JSON.stringify(summary).includes("IW-S01"), false);
  assert.throws(() => summarizeInternalWalkthroughRecords([validRecord(), validRecord()]), /重复的匿名场次/);
  const mixed = summarizeInternalWalkthroughRecords([validRecord(), { ...validRecord(), sessionId: "IW-S02", buildCommit: "1234567" }]);
  assert.equal(mixed.mixedBuilds, true);
  assert.equal(mixed.buildGroups.length, 2);
});
