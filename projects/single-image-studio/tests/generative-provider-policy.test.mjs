import test from "node:test";
import assert from "node:assert/strict";

import {
  GENERATIVE_PROVIDER_IDS,
  resolveGenerativeProviderPolicy,
} from "../server/providers/generative/provider-policy.mjs";

test("OpenAI direct upload is the only currently admitted generative provider", () => {
  const status = resolveGenerativeProviderPolicy({
    openAiApiKey: "configured",
    minimaxTokenPlanKey: "also-configured",
    minimaxImageEnabled: true,
  });
  assert.equal(status.available, true);
  assert.deepEqual(status.provider, {
    id: GENERATIVE_PROVIDER_IDS.OPENAI,
    label: "OpenAI 图片编辑",
    model: "gpt-image-2",
    inputMode: "direct-upload",
  });
  assert.equal(status.candidates[0].available, true);
  assert.equal(status.candidates[1].available, false);
  assert.equal(status.candidates[1].reason, "public_reference_url_required");
  assert.deepEqual(status.candidates[1].supportedTasks, []);
});

test("a MiniMax token-plan key never silently enables direct user-photo upload", () => {
  const disabled = resolveGenerativeProviderPolicy({ minimaxTokenPlanKey: "configured" });
  assert.equal(disabled.available, false);
  assert.equal(disabled.candidates[1].reason, "explicit_enable_required");

  const enabled = resolveGenerativeProviderPolicy({
    minimaxTokenPlanKey: "configured",
    minimaxImageEnabled: true,
  });
  assert.equal(enabled.available, false);
  assert.equal(enabled.provider, null);
  assert.equal(enabled.candidates[1].inputMode, "public-reference-url");
  assert.equal(enabled.candidates[1].reason, "public_reference_url_required");
});

test("LAN preview disables every remote generative candidate", () => {
  const status = resolveGenerativeProviderPolicy({
    previewMode: "lan",
    openAiApiKey: "configured",
    minimaxTokenPlanKey: "configured",
    minimaxImageEnabled: true,
  });
  assert.equal(status.available, false);
  assert.equal(status.provider, null);
  assert.deepEqual(status.candidates.map((entry) => entry.reason), ["lan_disabled", "lan_disabled"]);
});

test("provider policy rejects ambiguous configuration types", () => {
  assert.throws(
    () => resolveGenerativeProviderPolicy({ minimaxImageEnabled: "true" }),
    /must be boolean/,
  );
  assert.throws(
    () => resolveGenerativeProviderPolicy({ previewMode: "public" }),
    /local or lan/,
  );
});
