const OPENAI_PROVIDER = Object.freeze({
  id: "openai.images-edits",
  label: "OpenAI 图片编辑",
  model: "gpt-image-2",
  inputMode: "direct-upload",
  supportedTasks: Object.freeze(["CR1", "CR-RESTORE"]),
});

const MINIMAX_PROVIDER = Object.freeze({
  id: "minimax.image-01",
  label: "MiniMax image-01",
  model: "image-01",
  inputMode: "public-reference-url",
  supportedTasks: Object.freeze([]),
});

function hasCredential(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function candidate(provider, patch) {
  return Object.freeze({
    ...provider,
    supportedTasks: provider.supportedTasks,
    ...patch,
  });
}

/**
 * Provider admission is deliberately capability based. A credential alone does not
 * make a provider safe for the current direct-upload image-edit contract.
 */
export function resolveGenerativeProviderPolicy({
  previewMode = "local",
  openAiApiKey = "",
  minimaxTokenPlanKey = "",
  minimaxImageEnabled = false,
} = {}) {
  if (!new Set(["local", "lan"]).has(previewMode)) {
    throw new TypeError("previewMode must be local or lan");
  }
  if (typeof minimaxImageEnabled !== "boolean") {
    throw new TypeError("minimaxImageEnabled must be boolean");
  }

  const local = previewMode === "local";
  const openAiConfigured = hasCredential(openAiApiKey);
  const minimaxConfigured = hasCredential(minimaxTokenPlanKey);
  const openai = candidate(OPENAI_PROVIDER, {
    configured: openAiConfigured,
    enabled: true,
    available: local && openAiConfigured,
    reason: !local ? "lan_disabled" : openAiConfigured ? null : "credential_missing",
  });
  const minimax = candidate(MINIMAX_PROVIDER, {
    configured: minimaxConfigured,
    enabled: minimaxImageEnabled,
    available: false,
    reason: !local
      ? "lan_disabled"
      : !minimaxConfigured
        ? "credential_missing"
        : !minimaxImageEnabled
          ? "explicit_enable_required"
          : "public_reference_url_required",
  });
  const selected = openai.available ? openai : null;

  return Object.freeze({
    available: selected !== null,
    model: selected?.model ?? OPENAI_PROVIDER.model,
    provider: selected === null ? null : Object.freeze({
      id: selected.id,
      label: selected.label,
      model: selected.model,
      inputMode: selected.inputMode,
    }),
    candidates: Object.freeze([openai, minimax]),
    runStore: "memory",
    previewMode,
  });
}

export const GENERATIVE_PROVIDER_IDS = Object.freeze({
  OPENAI: OPENAI_PROVIDER.id,
  MINIMAX: MINIMAX_PROVIDER.id,
});
