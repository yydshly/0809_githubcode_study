export function recoveryPresentation({ unknown = false, retryable = true, taskId = null } = {}) {
  const backgroundRemovalTask = ["UT-CUTOUT", "UT-PORTRAIT"].includes(taskId);
  const cutoutFailure = backgroundRemovalTask && !unknown;
  return Object.freeze({
    retryLabel: backgroundRemovalTask
      ? "返回并重新确认"
      : unknown ? "新建任务" : "再试一次",
    retryVisible: retryable,
    retryPrimary: retryable && !unknown && !cutoutFailure,
    recoverVisible: unknown,
    fallbackLabel: "改用本地编辑",
    fallbackVisible: cutoutFailure,
    fallbackPrimary: cutoutFailure,
    focusTarget: unknown ? "recover" : cutoutFailure ? "fallback" : retryable ? "retry" : "back",
  });
}

export function applyRecoveryPresentation({ retry, recover, fallback, back }, presentation, { focus = true } = {}) {
  retry.textContent = presentation.retryLabel;
  retry.hidden = !presentation.retryVisible;
  retry.classList.toggle("button-primary", presentation.retryPrimary);
  retry.classList.toggle("button-quiet", !presentation.retryPrimary);
  recover.hidden = !presentation.recoverVisible;
  if (fallback) {
    fallback.textContent = presentation.fallbackLabel;
    fallback.hidden = !presentation.fallbackVisible;
    fallback.classList.toggle("button-primary", presentation.fallbackPrimary);
    fallback.classList.toggle("button-quiet", !presentation.fallbackPrimary);
  }
  const target = { retry, recover, fallback, back }[presentation.focusTarget];
  if (focus) target?.focus();
  return target ?? null;
}
