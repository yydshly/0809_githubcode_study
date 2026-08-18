export const ERROR_CATEGORIES = Object.freeze({
  BACKGROUND_REMOVAL_UNAVAILABLE: "background-removal-unavailable",
  PROVIDER_AUTH: "provider-auth",
  PROVIDER_BILLING: "provider-billing",
  PROVIDER_RATE_LIMIT: "provider-rate-limit",
  GENERATIVE_UNAVAILABLE: "generative-unavailable",
  MODERATION: "moderation",
  GENERIC: "generic",
});

export const ERROR_CONTEXTS = Object.freeze({
  INPUT: "input",
  SETTINGS: "settings",
  LOCAL_PROCESSING: "local-processing",
  OUTPUT_VALIDATION: "output-validation",
  REMOTE_FAILED: "remote-failed",
  REMOTE_UNKNOWN: "remote-unknown",
  NETWORK_UNAVAILABLE: "network-unavailable",
});

const DEFAULT_MESSAGE = "请保留原图并重试，失败结果不会进入下载。";

function errorFacts(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "",
    message: typeof error?.message === "string" ? error.message : "",
  };
}

export function friendlyErrorPresentation(error) {
  const { code, message } = errorFacts(error);

  if (code === "background_removal_unavailable" || /抠图服务.*未配置/i.test(message)) {
    return Object.freeze({
      category: ERROR_CATEGORIES.BACKGROUND_REMOVAL_UNAVAILABLE,
      message: "远程抠图服务尚未连接。原图和本地编辑功能不受影响。",
    });
  }
  if (code === "provider_auth_failed") {
    return Object.freeze({
      category: ERROR_CATEGORIES.PROVIDER_AUTH,
      message: "抠图服务凭据无效，请由项目维护者检查服务端配置。",
    });
  }
  if (code === "provider_billing_required") {
    return Object.freeze({
      category: ERROR_CATEGORIES.PROVIDER_BILLING,
      message: "抠图服务额度或计费状态不可用，当前图片没有被替换。",
    });
  }
  if (code === "provider_rate_limited") {
    return Object.freeze({
      category: ERROR_CATEGORIES.PROVIDER_RATE_LIMIT,
      message: "抠图服务当前请求较多，请稍后由你手动重试。",
    });
  }
  if (code === "generative_provider_unavailable"
    || code === "api_key_missing"
    || /OPENAI_API_KEY|未配置|not configured/i.test(message)) {
    return Object.freeze({
      category: ERROR_CATEGORIES.GENERATIVE_UNAVAILABLE,
      message: "创意生成服务尚未连接。你仍可选择“保真整理”，完成本地真实处理与下载。",
    });
  }
  if (code === "moderation_blocked") {
    return Object.freeze({
      category: ERROR_CATEGORIES.MODERATION,
      message: "当前图片或请求未通过图片服务的安全检查。请换一张图片或选择其他任务。",
    });
  }
  return Object.freeze({
    category: ERROR_CATEGORIES.GENERIC,
    message: message || DEFAULT_MESSAGE,
  });
}

export function friendlyErrorMessage(error) {
  return friendlyErrorPresentation(error).message;
}

const CONTEXT_COPY = Object.freeze({
  [ERROR_CONTEXTS.INPUT]: Object.freeze({
    title: "这张图片还不能读取",
    dataBoundary: "图片没有发送，也没有进入处理任务；原文件未被修改。",
    retrySafety: "可以安全地重新选择图片，不会产生远程调用。",
    actionHint: "检查文件格式、大小和完整性后，重新选择图片。",
  }),
  [ERROR_CONTEXTS.SETTINGS]: Object.freeze({
    title: "请先修正处理设置",
    dataBoundary: "任务尚未开始，图片没有因为这次设置错误被发送。",
    retrySafety: "修改标出的字段后可以安全生成。",
    actionHint: "返回设置并修正第一个错误字段。",
  }),
  [ERROR_CONTEXTS.LOCAL_PROCESSING]: Object.freeze({
    title: "本地处理没有完成",
    dataBoundary: "图片只在当前浏览器处理，原图仍然保留，没有远程上传。",
    retrySafety: "可以调整设置后手动重试；系统不会自动重复执行。",
    actionHint: "返回设置、降低尺寸或换用其他本地工具。",
  }),
  [ERROR_CONTEXTS.OUTPUT_VALIDATION]: Object.freeze({
    title: "结果没有通过下载检查",
    dataBoundary: "失败结果没有获得下载资格；原图和上一份有效结果未被替换。",
    retrySafety: "可以返回设置重新生成；不要使用未通过检查的临时结果。",
    actionHint: "返回设置重新生成，或换一个输出格式。",
  }),
  [ERROR_CONTEXTS.REMOTE_FAILED]: Object.freeze({
    title: "远程处理没有得到可用结果",
    dataBoundary: "图片可能已按本次确认发送到已连接服务；原图仍保留，失败结果不会采用。",
    retrySafety: "系统不会自动重试。再次远程处理前会重新确认，并可能产生新的调用。",
    actionHint: "优先改用本地编辑；需要远程重试时重新确认本次发送。",
  }),
  [ERROR_CONTEXTS.REMOTE_UNKNOWN]: Object.freeze({
    title: "处理状态暂时未知",
    dataBoundary: "图片可能已经发送，但当前无法确认原任务终态；原图仍保留。",
    retrySafety: "不要直接新建相同任务；先查询原任务，避免重复提交或重复计费。",
    actionHint: "查询原任务；仍未知时稍后再查或返回任务列表。",
  }),
  [ERROR_CONTEXTS.NETWORK_UNAVAILABLE]: Object.freeze({
    title: "远程服务暂时无法连接",
    dataBoundary: "当前无法确认远程服务状态；本地编辑能力不受影响。",
    retrySafety: "不要连续重复提交；可以稍后重新检查服务。",
    actionHint: "先使用本地工具，或稍后重新检查远程服务。",
  }),
});

const UNSENT_REMOTE_CODES = new Set(["background_removal_unavailable", "generative_provider_unavailable", "api_key_missing"]);

export function errorPagePresentation({ context, error = null, title = null, message = null, taskId = null, runId = null } = {}) {
  if (!Object.values(ERROR_CONTEXTS).includes(context)) throw new RangeError("错误 context 无效");
  const copy = CONTEXT_COPY[context];
  const friendly = friendlyErrorPresentation(error);
  const code = typeof error?.code === "string" && error.code.trim() ? error.code : friendly.category;
  let dataBoundary = copy.dataBoundary;
  if (context === ERROR_CONTEXTS.REMOTE_FAILED && UNSENT_REMOTE_CODES.has(error?.code)) {
    dataBoundary = "远程服务在发送前不可用；图片没有外发，原图仍保留。";
  }
  return Object.freeze({
    context,
    category: friendly.category,
    title: typeof title === "string" && title.trim() ? title : copy.title,
    message: typeof message === "string" && message.trim() ? message : friendly.message,
    dataBoundary,
    retrySafety: copy.retrySafety,
    actionHint: copy.actionHint,
    technicalCode: code,
    taskId: typeof taskId === "string" && taskId.trim() ? taskId : null,
    runId: typeof runId === "string" && runId.trim() ? runId : null,
  });
}

export function applyErrorPagePresentation(elements, presentation) {
  elements.title.textContent = presentation.title;
  elements.message.textContent = presentation.message;
  elements.dataBoundary.textContent = presentation.dataBoundary;
  elements.retrySafety.textContent = presentation.retrySafety;
  elements.actionHint.textContent = presentation.actionHint;
  elements.runRow.hidden = presentation.runId === null;
  elements.runId.textContent = presentation.runId ?? "";
  elements.technical.hidden = !presentation.technicalCode && !presentation.taskId;
  elements.technical.open = false;
  elements.technicalCode.textContent = presentation.technicalCode;
  elements.technicalTask.textContent = presentation.taskId ?? "未选择任务";
  return presentation;
}

export function settingsErrorFieldNames(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (/四个角|四角|裁正/u.test(message)) return Object.freeze(["rectifyTopLeftX", "rectifyTopLeftY"]);
  if (/文件大小|目标大小|文件上限|附件上限|KB/u.test(message)) return Object.freeze(["privacyTargetKilobytes", "uploadTargetKilobytes", "compressionTargetKilobytes"]);
  if (/最长边|输出宽高|输出尺寸|分辨率/u.test(message)) return Object.freeze(["privacyLongEdge", "uploadLongEdge", "canvasLongEdge", "outputLongEdge"]);
  if (/画面比例|目标比例|比例/u.test(message)) return Object.freeze(["uploadRatio", "canvasRatio", "ratio"]);
  if (/裁剪/u.test(message)) return Object.freeze(["cropLeft", "cropX", "ratio"]);
  if (/JPEG 质量|质量/u.test(message)) return Object.freeze(["jpegQuality"]);
  if (/颜色|底色|留白色/u.test(message)) return Object.freeze(["privacyBackground", "uploadBackground", "canvasCustomBackground", "jpegBackground"]);
  if (/格式/u.test(message)) return Object.freeze(["format"]);
  return Object.freeze([]);
}
