const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MS = 750;
const DEFAULT_POLL_TIMEOUT_MS = 60_000;

export const TERMINAL_RUN_STATUSES = Object.freeze([
  "SUCCEEDED",
  "FAILED",
  "BLOCKED",
  "UNKNOWN",
  "SUPERSEDED",
  "DETACHED",
  "CANCELLED",
]);
const terminalRunStatuses = new Set(TERMINAL_RUN_STATUSES);

/**
 * One error shape for every API operation.
 *
 * `outcome` is deliberately separate from `code`: a transport failure while a
 * run may already exist has an UNKNOWN outcome, while an HTTP rejection is a
 * definitive FAILED outcome and a caller cancellation is ABORTED.
 */
export class ApiClientError extends Error {
  constructor(
    message,
    {
      code = "API_ERROR",
      outcome = "FAILED",
      status = null,
      retryable = false,
      details = null,
      cause,
    } = {},
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiClientError";
    this.code = code;
    this.outcome = outcome;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }

  get isUnknown() {
    return this.outcome === "UNKNOWN";
  }
}

function assertFiniteDuration(value, name, { allowZero = false } = {}) {
  const lowerBound = allowZero ? 0 : Number.EPSILON;
  if (!Number.isFinite(value) || value < lowerBound) {
    throw new TypeError(`${name} must be ${allowZero ? "a non-negative" : "a positive"} number`);
  }
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string") {
    throw new TypeError("baseUrl must be a string");
  }
  return baseUrl.replace(/\/+$/, "");
}

function pathForRun(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new TypeError("runId must be a non-empty string");
  }
  return `/api/runs/${encodeURIComponent(runId)}`;
}

function pathForBackgroundRemovalRun(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new TypeError("runId must be a non-empty string");
  }
  return `/api/background-removal/runs/${encodeURIComponent(runId)}`;
}

function pathForBackgroundRemovalRecord(runId) {
  return `${pathForBackgroundRemovalRun(runId)}/record`;
}

function createRequestAbort(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let abortSource = null;

  const abortFromCaller = () => {
    abortSource = "caller";
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    abortSource = "timeout";
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    get abortSource() {
      return abortSource;
    },
    cleanup() {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (text === "") return null;

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ApiClientError("API returned invalid JSON", {
      code: "INVALID_RESPONSE",
      status: response.status,
      details: { body: text },
      cause,
    });
  }
}

function errorMessage(payload, fallback) {
  if (typeof payload?.error === "string" && payload.error) return payload.error;
  if (typeof payload?.error?.message === "string" && payload.error.message) {
    return payload.error.message;
  }
  if (typeof payload?.message === "string" && payload.message) return payload.message;
  return fallback;
}

function errorCode(payload) {
  if (typeof payload?.error?.code === "string") return payload.error.code;
  if (typeof payload?.code === "string") return payload.code;
  return "HTTP_ERROR";
}

function unwrapRun(payload) {
  const run = payload?.run ?? payload;
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    throw new ApiClientError("API response does not contain a run", {
      code: "INVALID_RESPONSE",
      details: payload,
    });
  }
  if (typeof run.status === "string") {
    return { ...run, status: run.status.toUpperCase() };
  }
  return run;
}

function abortError(runOutcomeUnknown = false) {
  return new ApiClientError("Request was aborted", {
    code: "ABORTED",
    outcome: "ABORTED",
    retryable: false,
    details: runOutcomeUnknown ? { runMayStillBeActive: true } : null,
  });
}

function wait(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (ms === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createApiClient({
  baseUrl = "",
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required");
  }
  assertFiniteDuration(requestTimeoutMs, "requestTimeoutMs");
  const apiBaseUrl = normalizeBaseUrl(baseUrl);

  async function request(
    path,
    {
      method = "GET",
      body,
      headers = {},
      signal,
      timeoutMs = requestTimeoutMs,
      outcomeUnknownOnTransport = false,
    } = {},
  ) {
    assertFiniteDuration(timeoutMs, "timeoutMs");
    const requestAbort = createRequestAbort(signal, timeoutMs);

    try {
      const response = await fetchImpl(`${apiBaseUrl}${path}`, {
        method,
        headers: body === undefined ? { Accept: "application/json", ...headers } : {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: requestAbort.signal,
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new ApiClientError(
          errorMessage(payload, `API request failed with status ${response.status}`),
          {
            code: errorCode(payload),
            status: response.status,
            retryable: response.status === 429 || response.status >= 500,
            details: payload,
          },
        );
      }

      return payload;
    } catch (cause) {
      if (cause instanceof ApiClientError) throw cause;
      if (requestAbort.abortSource === "caller" || signal?.aborted) {
        throw abortError(outcomeUnknownOnTransport);
      }

      const outcome = outcomeUnknownOnTransport ? "UNKNOWN" : "FAILED";
      const timedOut = requestAbort.abortSource === "timeout";
      throw new ApiClientError(
        timedOut ? "API request timed out" : "API request could not be completed",
        {
          code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
          outcome,
          retryable: true,
          cause,
        },
      );
    } finally {
      requestAbort.cleanup();
    }
  }

  async function getStatus({ signal, timeoutMs } = {}) {
    return request("/api/status", { signal, timeoutMs });
  }

  async function createRun(payload, { signal, timeoutMs } = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("run payload must be an object");
    }
    const response = await request("/api/runs", {
      method: "POST",
      body: payload,
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
    return unwrapRun(response);
  }

  async function getRun(runId, { signal, timeoutMs } = {}) {
    const response = await request(pathForRun(runId), {
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
    return unwrapRun(response);
  }

  async function getBackgroundRemovalStatus({ signal, timeoutMs } = {}) {
    return request("/api/background-removal/status", { signal, timeoutMs });
  }

  async function createBackgroundRemovalRun(payload, { signal, timeoutMs, accessToken } = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("background removal payload must be an object");
    }
    const response = await request("/api/background-removal/runs", {
      method: "POST",
      body: payload,
      headers: typeof accessToken === "string" && accessToken.length > 0
        ? { "X-Background-Removal-Access": accessToken }
        : {},
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
    return unwrapRun(response);
  }

  async function getBackgroundRemovalRun(runId, { signal, timeoutMs } = {}) {
    const response = await request(pathForBackgroundRemovalRun(runId), {
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
    return unwrapRun(response);
  }

  async function cancelBackgroundRemovalRun(runId, { signal, timeoutMs } = {}) {
    const response = await request(pathForBackgroundRemovalRun(runId), {
      method: "DELETE",
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
    return unwrapRun(response);
  }

  async function deleteBackgroundRemovalRecord(runId, { signal, timeoutMs } = {}) {
    return request(pathForBackgroundRemovalRecord(runId), {
      method: "DELETE",
      signal,
      timeoutMs,
      outcomeUnknownOnTransport: true,
    });
  }

  async function pollRun(
    runId,
    {
      signal,
      intervalMs = DEFAULT_POLL_INTERVAL_MS,
      timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
      onUpdate,
    } = {},
  ) {
    pathForRun(runId);
    assertFiniteDuration(intervalMs, "intervalMs", { allowZero: true });
    assertFiniteDuration(timeoutMs, "timeoutMs");
    if (onUpdate !== undefined && typeof onUpdate !== "function") {
      throw new TypeError("onUpdate must be a function");
    }

    const startedAt = Date.now();
    let lastRun = null;

    while (true) {
      if (signal?.aborted) throw abortError(Boolean(lastRun));
      const remainingMs = timeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        throw new ApiClientError("Run status is unknown after polling timed out", {
          code: "POLL_TIMEOUT",
          outcome: "UNKNOWN",
          retryable: true,
          details: { runId, lastRun },
        });
      }

      lastRun = await getRun(runId, {
        signal,
        timeoutMs: Math.min(requestTimeoutMs, remainingMs),
      });

      if (typeof lastRun.status !== "string") {
        throw new ApiClientError("Run response does not contain a status", {
          code: "INVALID_RESPONSE",
          details: lastRun,
        });
      }

      onUpdate?.(lastRun);
      if (terminalRunStatuses.has(lastRun.status)) return lastRun;

      const nextRemainingMs = timeoutMs - (Date.now() - startedAt);
      if (nextRemainingMs <= 0) continue;
      await wait(Math.min(intervalMs, nextRemainingMs), signal);
    }
  }

  async function pollBackgroundRemovalRun(
    runId,
    {
      signal,
      intervalMs = DEFAULT_POLL_INTERVAL_MS,
      timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
      onUpdate,
    } = {},
  ) {
    pathForBackgroundRemovalRun(runId);
    assertFiniteDuration(intervalMs, "intervalMs", { allowZero: true });
    assertFiniteDuration(timeoutMs, "timeoutMs");
    if (onUpdate !== undefined && typeof onUpdate !== "function") {
      throw new TypeError("onUpdate must be a function");
    }
    const startedAt = Date.now();
    let lastRun = null;
    while (true) {
      if (signal?.aborted) throw abortError(Boolean(lastRun));
      const remainingMs = timeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        throw new ApiClientError("Background removal status is unknown after polling timed out", {
          code: "POLL_TIMEOUT",
          outcome: "UNKNOWN",
          retryable: true,
          details: { runId, lastRun },
        });
      }
      lastRun = await getBackgroundRemovalRun(runId, {
        signal,
        timeoutMs: Math.min(requestTimeoutMs, remainingMs),
      });
      if (typeof lastRun.status !== "string") {
        throw new ApiClientError("Background removal response does not contain a status", {
          code: "INVALID_RESPONSE",
          details: lastRun,
        });
      }
      onUpdate?.(lastRun);
      if (terminalRunStatuses.has(lastRun.status)) return lastRun;
      const nextRemainingMs = timeoutMs - (Date.now() - startedAt);
      if (nextRemainingMs <= 0) continue;
      await wait(Math.min(intervalMs, nextRemainingMs), signal);
    }
  }

  return Object.freeze({
    getStatus,
    createRun,
    getRun,
    pollRun,
    getBackgroundRemovalStatus,
    createBackgroundRemovalRun,
    getBackgroundRemovalRun,
    cancelBackgroundRemovalRun,
    deleteBackgroundRemovalRecord,
    pollBackgroundRemovalRun,
  });
}

let defaultClient;
function getDefaultClient() {
  defaultClient ??= createApiClient();
  return defaultClient;
}

export function getApiStatus(options) {
  return getDefaultClient().getStatus(options);
}

export function getStatus(options) {
  return getApiStatus(options);
}

export function createRun(payload, options) {
  return getDefaultClient().createRun(payload, options);
}

export function getRun(runId, options) {
  return getDefaultClient().getRun(runId, options);
}

export function pollRun(runId, options) {
  return getDefaultClient().pollRun(runId, options);
}

export function getBackgroundRemovalStatus(options) {
  return getDefaultClient().getBackgroundRemovalStatus(options);
}

export function createBackgroundRemovalRun(payload, options) {
  return getDefaultClient().createBackgroundRemovalRun(payload, options);
}

export function getBackgroundRemovalRun(runId, options) {
  return getDefaultClient().getBackgroundRemovalRun(runId, options);
}

export function cancelBackgroundRemovalRun(runId, options) {
  return getDefaultClient().cancelBackgroundRemovalRun(runId, options);
}

export function deleteBackgroundRemovalRecord(runId, options) {
  return getDefaultClient().deleteBackgroundRemovalRecord(runId, options);
}

export function pollBackgroundRemovalRun(runId, options) {
  return getDefaultClient().pollBackgroundRemovalRun(runId, options);
}
