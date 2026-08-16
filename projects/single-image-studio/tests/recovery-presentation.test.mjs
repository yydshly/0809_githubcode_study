import assert from "node:assert/strict";
import test from "node:test";

import { recoveryPresentation } from "../web/recovery-presentation.js";

test("remote cutout failures return to fresh consent while unknown runs prioritize recovery", () => {
  assert.deepEqual(recoveryPresentation({ taskId: "UT-CUTOUT", retryable: true }), {
    retryLabel: "返回并重新确认",
    retryVisible: true,
    retryPrimary: false,
    recoverVisible: false,
    fallbackLabel: "改用本地编辑",
    fallbackVisible: true,
    fallbackPrimary: true,
    focusTarget: "fallback",
  });
  assert.deepEqual(recoveryPresentation({ taskId: "UT-CUTOUT", unknown: true, retryable: true }), {
    retryLabel: "返回并重新确认",
    retryVisible: true,
    retryPrimary: false,
    recoverVisible: true,
    fallbackLabel: "改用本地编辑",
    fallbackVisible: false,
    fallbackPrimary: false,
    focusTarget: "recover",
  });
});

test("local failure and non-retryable errors keep one unambiguous focus target", () => {
  assert.deepEqual(recoveryPresentation({ taskId: "UT-TUNE", retryable: true }), {
    retryLabel: "再试一次",
    retryVisible: true,
    retryPrimary: true,
    recoverVisible: false,
    fallbackLabel: "改用本地编辑",
    fallbackVisible: false,
    fallbackPrimary: false,
    focusTarget: "retry",
  });
  assert.equal(recoveryPresentation({ retryable: false }).focusTarget, "back");
});
