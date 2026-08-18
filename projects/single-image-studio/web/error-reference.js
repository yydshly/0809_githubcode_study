import { ERROR_CONTEXTS, applyErrorPagePresentation, errorPagePresentation } from "./error-presentation.js";
import { applyRecoveryPresentation, recoveryPresentation } from "./recovery-presentation.js";

const SCENARIOS = Object.freeze([
  Object.freeze({ id: "input", label: "输入不支持", context: ERROR_CONTEXTS.INPUT, error: { code: "image_mime_mismatch" }, taskId: null, runId: null, retryable: false }),
  Object.freeze({ id: "settings", label: "设置不合法", context: ERROR_CONTEXTS.SETTINGS, error: { code: "invalid_settings" }, taskId: "UT-UPLOAD", runId: null, retryable: true }),
  Object.freeze({ id: "local", label: "本地处理失败", context: ERROR_CONTEXTS.LOCAL_PROCESSING, error: { code: "local_render_failed" }, taskId: "UT-TUNE", runId: "local-example-run", retryable: true }),
  Object.freeze({ id: "output", label: "输出校验失败", context: ERROR_CONTEXTS.OUTPUT_VALIDATION, error: { code: "output_hash_mismatch" }, taskId: "UT-COMPRESS", runId: "output-example-run", retryable: true }),
  Object.freeze({ id: "remote-failed", label: "远程明确失败", context: ERROR_CONTEXTS.REMOTE_FAILED, error: { code: "provider_auth_failed", message: "provider raw response" }, taskId: "UT-CUTOUT", runId: "remote-failed-run", retryable: true }),
  Object.freeze({ id: "remote-unknown", label: "远程状态未知", context: ERROR_CONTEXTS.REMOTE_UNKNOWN, error: { code: "transport_unknown" }, taskId: "UT-CUTOUT", runId: "remote-unknown-run", retryable: true }),
  Object.freeze({ id: "network", label: "网络不可用", context: ERROR_CONTEXTS.NETWORK_UNAVAILABLE, error: { code: "network_unavailable" }, taskId: "CR1", runId: null, retryable: true }),
]);

function textElement(tag, text, className = null) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function fact(label) {
  const row = document.createElement("div");
  row.setAttribute("role", "listitem");
  row.append(textElement("span", label), document.createElement("strong"));
  return row;
}

function renderScenario(scenario) {
  const card = document.createElement("article");
  card.className = "error-reference-card";
  card.dataset.errorScenario = scenario.id;
  const heading = document.createElement("header");
  heading.append(textElement("h2", scenario.label), textElement("span", scenario.context));
  const message = document.createElement("p");
  const facts = document.createElement("div");
  facts.className = "error-facts";
  facts.setAttribute("role", "list");
  const data = fact("图片状态");
  const retrySafety = fact("安全重试");
  const action = fact("下一步");
  const runRow = fact("任务编号");
  facts.append(data, retrySafety, action, runRow);
  const technical = document.createElement("details");
  technical.className = "error-technical";
  technical.append(textElement("summary", "查看技术信息"));
  const list = document.createElement("dl");
  const codeRow = document.createElement("div");
  const taskRow = document.createElement("div");
  codeRow.append(textElement("dt", "错误类型"), document.createElement("dd"));
  taskRow.append(textElement("dt", "当前任务"), document.createElement("dd"));
  const code = document.createElement("code");
  const task = document.createElement("code");
  codeRow.querySelector("dd").append(code);
  taskRow.querySelector("dd").append(task);
  list.append(codeRow, taskRow);
  technical.append(list);
  const actions = document.createElement("div");
  actions.className = "inline-actions";
  const recover = textElement("button", "查询原任务", "button button-primary");
  const fallback = textElement("button", "改用本地编辑", "button button-primary");
  const retry = textElement("button", "再试一次", "button button-quiet");
  const back = textElement("button", "返回任务列表", "button button-quiet");
  for (const button of [recover, fallback, retry, back]) button.type = "button";
  actions.append(recover, fallback, retry, back);
  card.append(heading, message, facts, technical, actions);

  const presentation = errorPagePresentation(scenario);
  applyErrorPagePresentation({
    title: heading.querySelector("h2"), message,
    dataBoundary: data.querySelector("strong"), retrySafety: retrySafety.querySelector("strong"), actionHint: action.querySelector("strong"),
    runRow, runId: runRow.querySelector("strong"), technical, technicalCode: code, technicalTask: task,
  }, presentation);
  const unknown = scenario.context === ERROR_CONTEXTS.REMOTE_UNKNOWN;
  applyRecoveryPresentation({ retry, recover, fallback, back }, recoveryPresentation({ unknown, retryable: scenario.retryable, taskId: scenario.taskId, context: scenario.context }), { focus: false });
  return card;
}

const grid = document.querySelector("#error-reference-grid");
SCENARIOS.forEach((scenario) => grid.append(renderScenario(scenario)));
document.documentElement.dataset.errorReferenceReady = "true";
