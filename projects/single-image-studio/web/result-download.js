const DOWNLOAD_POLICIES = Object.freeze({
  "UT-TUNE": Object.freeze({
    prefix: "fidelity-result",
    mimeTypes: Object.freeze(["image/png", "image/jpeg"]),
    alpha: "either",
  }),
  "UT-ENHANCE": Object.freeze({
    prefix: "enhanced-result",
    mimeTypes: Object.freeze(["image/png", "image/jpeg"]),
    alpha: "either",
  }),
  "LOCAL-FIDELITY": Object.freeze({
    prefix: "fidelity-result",
    mimeTypes: Object.freeze(["image/png"]),
    alpha: "either",
  }),
  "UT-CUTOUT": Object.freeze({
    prefix: "cutout-result",
    mimeTypes: Object.freeze(["image/png"]),
    alpha: "required",
  }),
  "UT-SOLID-BG": Object.freeze({
    prefix: "solid-background-result",
    mimeTypes: Object.freeze(["image/png", "image/jpeg"]),
    alpha: "opaque",
  }),
  "UT-PORTRAIT": Object.freeze({
    prefix: "portrait-result",
    mimeTypes: Object.freeze(["image/png", "image/jpeg"]),
    alpha: "opaque",
  }),
});

export const DOWNLOAD_ERROR_CODES = Object.freeze({
  MISSING_RESULT: "MISSING_RESULT",
  STALE_RESULT: "STALE_RESULT",
  RESULT_NOT_READY: "RESULT_NOT_READY",
  QA_NOT_PASSED: "QA_NOT_PASSED",
  UNSUPPORTED_TASK: "UNSUPPORTED_TASK",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  ALPHA_REQUIRED: "ALPHA_REQUIRED",
  OPAQUE_REQUIRED: "OPAQUE_REQUIRED",
  MISSING_OUTPUT_HASH: "MISSING_OUTPUT_HASH",
  INVALID_BYTE_LENGTH: "INVALID_BYTE_LENGTH",
});

function creativePolicy(taskId) {
  return /^CR[1-4]$/.test(taskId)
    ? { prefix: "creative-result", mimeTypes: ["image/png"], alpha: "either" }
    : null;
}

function denied(code, message) {
  return Object.freeze({ allowed: false, code, message, download: null });
}

function extensionFor(mimeType) {
  return mimeType === "image/jpeg" ? "jpg" : "png";
}

function safeTimeToken(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}-${match[4]}${match[5]}${match[6]}` : null;
}

function safeVersionToken(value) {
  const normalized = String(value ?? "v1")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return normalized || "v1";
}

/**
 * Returns inert metadata only. The caller may create an object URL and initiate a
 * browser download after this contract returns allowed=true.
 */
export function buildResultDownloadContract({ taskId, result, currentRunId } = {}) {
  if (!result) {
    return denied(DOWNLOAD_ERROR_CODES.MISSING_RESULT, "当前没有可下载的结果。");
  }
  if (!currentRunId || result.runId !== currentRunId) {
    return denied(DOWNLOAD_ERROR_CODES.STALE_RESULT, "结果不属于当前运行。");
  }
  if (result.status !== "ready") {
    return denied(DOWNLOAD_ERROR_CODES.RESULT_NOT_READY, "结果尚未通过完整校验。");
  }
  if (result.qaStatus !== "passed") {
    return denied(DOWNLOAD_ERROR_CODES.QA_NOT_PASSED, "结果尚未通过当前工程校验。内容质量检查尚未实现。");
  }

  const policy = DOWNLOAD_POLICIES[taskId] ?? creativePolicy(taskId);
  if (!policy) {
    return denied(DOWNLOAD_ERROR_CODES.UNSUPPORTED_TASK, "该任务没有冻结的下载契约。");
  }
  if (!policy.mimeTypes.includes(result.mimeType)) {
    return denied(DOWNLOAD_ERROR_CODES.UNSUPPORTED_FORMAT, "结果格式不符合任务契约。");
  }
  if (policy.alpha === "required" && result.hasAlpha !== true) {
    return denied(DOWNLOAD_ERROR_CODES.ALPHA_REQUIRED, "透明抠图必须包含真实 Alpha 通道。");
  }
  if (policy.alpha === "opaque" && result.hasAlpha === true) {
    return denied(DOWNLOAD_ERROR_CODES.OPAQUE_REQUIRED, "该任务必须导出不透明结果。");
  }
  if (!/^[a-f0-9]{64}$/i.test(String(result.outputHash ?? ""))) {
    return denied(DOWNLOAD_ERROR_CODES.MISSING_OUTPUT_HASH, "结果缺少有效的输出指纹。");
  }
  if (!Number.isSafeInteger(result.byteLength) || result.byteLength < 1) {
    return denied(DOWNLOAD_ERROR_CODES.INVALID_BYTE_LENGTH, "结果文件大小无效。");
  }

  const identity = safeTimeToken(result.completedAt)
    ?? safeVersionToken(result.version ?? result.outputHash.slice(0, 8));
  const extension = extensionFor(result.mimeType);
  return Object.freeze({
    allowed: true,
    code: null,
    message: null,
    download: Object.freeze({
      filename: `${policy.prefix}-${identity}.${extension}`,
      mimeType: result.mimeType,
      extension,
      byteLength: result.byteLength,
      outputHash: result.outputHash.toLowerCase(),
      runId: result.runId,
      resultId: result.id ?? null,
    }),
  });
}
