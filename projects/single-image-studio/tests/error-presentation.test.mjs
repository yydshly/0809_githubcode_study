import assert from "node:assert/strict";
import test from "node:test";

import {
  ERROR_CATEGORIES,
  ERROR_CONTEXTS,
  applyErrorPagePresentation,
  errorPagePresentation,
  friendlyErrorMessage,
  friendlyErrorPresentation,
  settingsErrorFieldNames,
} from "../web/error-presentation.js";

test("provider failures map to stable user-facing categories without leaking raw configuration details", () => {
  assert.deepEqual(friendlyErrorPresentation({ code: "background_removal_unavailable" }), {
    category: ERROR_CATEGORIES.BACKGROUND_REMOVAL_UNAVAILABLE,
    message: "远程抠图服务尚未连接。原图和本地编辑功能不受影响。",
  });
  assert.equal(
    friendlyErrorPresentation({ message: "抠图服务当前未配置" }).category,
    ERROR_CATEGORIES.BACKGROUND_REMOVAL_UNAVAILABLE,
  );
  assert.equal(
    friendlyErrorPresentation({ code: "provider_auth_failed", message: "secret token rejected" }).category,
    ERROR_CATEGORIES.PROVIDER_AUTH,
  );
  assert.equal(
    friendlyErrorPresentation({ code: "provider_billing_required" }).category,
    ERROR_CATEGORIES.PROVIDER_BILLING,
  );
  assert.equal(
    friendlyErrorPresentation({ code: "provider_rate_limited" }).category,
    ERROR_CATEGORIES.PROVIDER_RATE_LIMIT,
  );
});

test("generative and moderation failures remain distinct from background removal failures", () => {
  assert.equal(
    friendlyErrorPresentation({ code: "generative_provider_unavailable" }).category,
    ERROR_CATEGORIES.GENERATIVE_UNAVAILABLE,
  );
  assert.equal(
    friendlyErrorPresentation({ code: "api_key_missing" }).category,
    ERROR_CATEGORIES.GENERATIVE_UNAVAILABLE,
  );
  assert.equal(
    friendlyErrorPresentation({ message: "OPENAI_API_KEY is not configured" }).category,
    ERROR_CATEGORIES.GENERATIVE_UNAVAILABLE,
  );
  assert.equal(
    friendlyErrorPresentation({ code: "moderation_blocked" }).category,
    ERROR_CATEGORIES.MODERATION,
  );
});

test("generic errors preserve useful messages and fail safely when no message exists", () => {
  const original = { message: "输出文件无法重开" };
  const presentation = friendlyErrorPresentation(original);
  assert.deepEqual(presentation, {
    category: ERROR_CATEGORIES.GENERIC,
    message: "输出文件无法重开",
  });
  assert.equal(Object.isFrozen(presentation), true);
  assert.equal(friendlyErrorMessage(original), "输出文件无法重开");
  assert.equal(friendlyErrorMessage(null), "请保留原图并重试，失败结果不会进入下载。");
});

test("seven strict error contexts state data boundaries, retry safety and next actions", () => {
  const contexts = Object.values(ERROR_CONTEXTS);
  assert.equal(contexts.length, 7);
  for (const context of contexts) {
    const presentation = errorPagePresentation({ context, error: { code: `${context}_code` } });
    assert.equal(presentation.context, context);
    assert.ok(presentation.title);
    assert.ok(presentation.message);
    assert.ok(presentation.dataBoundary);
    assert.ok(presentation.retrySafety);
    assert.ok(presentation.actionHint);
    assert.ok(presentation.technicalCode);
    assert.equal(Object.isFrozen(presentation), true);
  }
  assert.throws(() => errorPagePresentation({ context: "mystery" }), /context 无效/);
});

test("remote definitive and unknown outcomes never claim the same retry safety", () => {
  const unsent = errorPagePresentation({
    context: ERROR_CONTEXTS.REMOTE_FAILED,
    error: { code: "background_removal_unavailable" },
    taskId: "UT-CUTOUT",
  });
  assert.match(unsent.dataBoundary, /发送前不可用/);
  assert.match(unsent.dataBoundary, /没有外发/);

  const failed = errorPagePresentation({
    context: ERROR_CONTEXTS.REMOTE_FAILED,
    error: { code: "provider_auth_failed", message: "raw provider secret" },
    taskId: "UT-CUTOUT",
    runId: "run-1",
  });
  assert.match(failed.dataBoundary, /可能已/);
  assert.doesNotMatch(failed.message, /raw provider secret/);
  assert.match(failed.retrySafety, /不会自动重试/);

  const unknown = errorPagePresentation({
    context: ERROR_CONTEXTS.REMOTE_UNKNOWN,
    error: { code: "transport_unknown" },
    taskId: "UT-CUTOUT",
    runId: "run-1",
  });
  assert.match(unknown.retrySafety, /先查询原任务/);
  assert.match(unknown.retrySafety, /重复计费/);
  assert.notEqual(unknown.retrySafety, failed.retrySafety);
});

test("applying an error presentation resets technical disclosure and optional run identity", () => {
  const node = () => ({ textContent: "", hidden: false });
  const elements = {
    title: node(), message: node(), dataBoundary: node(), retrySafety: node(), actionHint: node(),
    runRow: node(), runId: node(), technical: { hidden: false, open: true }, technicalCode: node(), technicalTask: node(),
  };
  const presentation = errorPagePresentation({
    context: ERROR_CONTEXTS.OUTPUT_VALIDATION,
    error: { code: "output_hash_mismatch" },
    taskId: "UT-TUNE",
    runId: "run-2",
  });
  assert.equal(applyErrorPagePresentation(elements, presentation), presentation);
  assert.equal(elements.runRow.hidden, false);
  assert.equal(elements.runId.textContent, "run-2");
  assert.equal(elements.technical.open, false);
  assert.equal(elements.technicalCode.textContent, "output_hash_mismatch");

  applyErrorPagePresentation(elements, errorPagePresentation({ context: ERROR_CONTEXTS.INPUT }));
  assert.equal(elements.runRow.hidden, true);
  assert.equal(elements.runId.textContent, "");
});

test("settings errors map common validation language to the most relevant form controls", () => {
  assert.deepEqual(settingsErrorFieldNames({ message: "文件大小上限必须是 100–10240 KB" }), ["privacyTargetKilobytes", "uploadTargetKilobytes", "compressionTargetKilobytes"]);
  assert.deepEqual(settingsErrorFieldNames({ message: "最长边上限必须是 320–2048 像素" }), ["privacyLongEdge", "uploadLongEdge", "canvasLongEdge", "outputLongEdge"]);
  assert.deepEqual(settingsErrorFieldNames({ message: "不支持的画面比例" }), ["uploadRatio", "canvasRatio", "ratio"]);
  assert.deepEqual(settingsErrorFieldNames({ message: "四个角必须围成有效区域" }), ["rectifyTopLeftX", "rectifyTopLeftY"]);
  assert.deepEqual(settingsErrorFieldNames({ message: "未知设置" }), []);
});
