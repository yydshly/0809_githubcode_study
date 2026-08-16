export function recoveryPresentation({ unknown = false, retryable = true, taskId = null } = {}) {
  return Object.freeze({
    retryLabel: taskId === "UT-CUTOUT"
      ? "返回并重新确认"
      : unknown ? "新建任务" : "再试一次",
    retryVisible: retryable,
    retryPrimary: retryable && !unknown,
    recoverVisible: unknown,
    focusTarget: unknown ? "recover" : retryable ? "retry" : "back",
  });
}

export function applyRecoveryPresentation({ retry, recover, back }, presentation, { focus = true } = {}) {
  retry.textContent = presentation.retryLabel;
  retry.hidden = !presentation.retryVisible;
  retry.classList.toggle("button-primary", presentation.retryPrimary);
  retry.classList.toggle("button-quiet", !presentation.retryPrimary);
  recover.hidden = !presentation.recoverVisible;
  const target = { retry, recover, back }[presentation.focusTarget];
  if (focus) target?.focus();
  return target ?? null;
}
