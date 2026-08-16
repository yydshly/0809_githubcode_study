import { createHash } from "node:crypto";

import { InMemoryRunStore } from "../../run-store.mjs";
import {
  assertBackgroundRemovalProvider,
  BackgroundRemovalProviderError,
  validateBackgroundRemovalProviderOutput,
} from "./provider.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function publicError(error) {
  return {
    code: String(error?.code ?? "background_removal_status_unknown").slice(0, 100),
    message: String(error?.message ?? "无法确认抠图任务是否完成；不会自动重复提交").slice(0, 1000),
    httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
  };
}

export function createBackgroundRemovalRuntime({
  provider = null,
  store = new InMemoryRunStore(),
  timeoutMs = 30_000,
  now = () => new Date().toISOString(),
} = {}) {
  if (provider !== null) assertBackgroundRemovalProvider(provider);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("background removal timeout must be a positive integer");
  const controllers = new Map();
  const inflight = new Set();

  async function execute(runId, input) {
    const controller = new AbortController();
    controllers.set(runId, controller);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("Background removal timed out", "TimeoutError"));
    }, timeoutMs);
    store.update(runId, { status: "running", startedAt: now() });

    try {
      const providerCall = Promise.resolve().then(() => provider.removeBackground({
        source: {
          bytes: input.source.bytes,
          mime: input.source.mime,
          sha256: input.source.sha256,
          sourceRevision: input.sourceRevision,
          geometryRevision: input.geometryRevision,
        },
        signal: controller.signal,
        context: {
          runId,
          consentPolicyVersion: input.consent.policyVersion,
        },
      }));
      const aborted = new Promise((_resolve, reject) => {
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
      });
      const rawOutput = await Promise.race([providerCall, aborted]);
      const current = store.get(runId);
      if (!current || current.status === "cancelled") return;
      if (timedOut || controller.signal.aborted) {
        store.update(runId, {
          status: "unknown",
          completedAt: now(),
          error: publicError({ code: "background_removal_timeout" }),
        });
        return;
      }
      const output = validateBackgroundRemovalProviderOutput(rawOutput);
      store.update(runId, {
        status: "succeeded",
        requestId: output.providerRequestId,
        completedAt: now(),
        result: {
          image: `data:image/png;base64,${output.image.bytes.toString("base64")}`,
          imageSha256: sha256(output.image.bytes),
          imageBytes: output.image.bytes.length,
          mime: output.image.mime,
          hasAlpha: output.image.hasAlpha,
          width: output.image.width,
          height: output.image.height,
          provider: {
            id: provider.id,
            version: provider.version,
            mode: provider.mode,
            ...(provider.environment ? { environment: provider.environment } : {}),
          },
        },
      });
    } catch (error) {
      const current = store.get(runId);
      if (!current || current.status === "cancelled") return;
      if (timedOut || error?.name === "TimeoutError") {
        store.update(runId, {
          status: "unknown",
          completedAt: now(),
          error: publicError({ code: "background_removal_timeout" }),
        });
      } else if (error instanceof BackgroundRemovalProviderError && error.definitive) {
        store.update(runId, {
          status: "failed",
          completedAt: now(),
          error: publicError(error),
        });
      } else {
        store.update(runId, {
          status: "unknown",
          completedAt: now(),
          error: publicError({
            code: error instanceof BackgroundRemovalProviderError
              ? error.code
              : "background_removal_status_unknown",
            message: "无法确认抠图任务是否完成；不会自动重复提交",
          }),
        });
      }
    } finally {
      clearTimeout(timeout);
      controllers.delete(runId);
    }
  }

  return Object.freeze({
    status() {
      return provider === null
        ? Object.freeze({ available: false, provider: null, reason: "not_configured", runStore: "memory" })
        : Object.freeze({
          available: true,
          provider: Object.freeze({
            id: provider.id,
            version: provider.version,
            mode: provider.mode,
            ...(provider.environment ? { environment: provider.environment } : {}),
          }),
          reason: null,
          runStore: "memory",
        });
    },
    create({ id, inputFingerprint, input, metadata }) {
      if (provider === null) throw new BackgroundRemovalProviderError("background_removal_unavailable", "尚未配置抠图服务", { httpStatus: 503 });
      const resolved = store.createOrGet({ id, inputFingerprint, metadata });
      if (resolved.conflict || !resolved.created) return { ...resolved, started: false };
      const task = execute(id, input).finally(() => inflight.delete(task));
      inflight.add(task);
      return { ...resolved, started: true };
    },
    get(id) {
      return store.get(id);
    },
    cancel(id) {
      const run = store.get(id);
      if (!run) return null;
      if (new Set(["succeeded", "failed", "cancelled"]).has(run.status)) return { run, cancelled: false };
      controllers.get(id)?.abort(new DOMException("Cancelled", "AbortError"));
      const cancelled = store.update(id, {
        status: "cancelled",
        completedAt: now(),
        error: { code: "background_removal_cancelled", message: "抠图任务已取消", httpStatus: null },
      });
      return { run: cancelled, cancelled: true };
    },
    forget(id) {
      const run = store.get(id);
      if (!run) {
        return { runId: id, localRecordDeleted: true, alreadyAbsent: true, deletedAt: now() };
      }
      if (!new Set(["succeeded", "failed", "cancelled"]).has(run.status)) {
        throw new BackgroundRemovalProviderError(
          "background_removal_record_not_terminal",
          "任务仍在处理或状态未知，不能清除用于恢复的本地记录",
          { httpStatus: 409 },
        );
      }
      store.delete(id);
      return { runId: id, localRecordDeleted: true, alreadyAbsent: false, deletedAt: now() };
    },
    async waitForIdle() {
      await Promise.allSettled([...inflight]);
    },
    store,
  });
}
