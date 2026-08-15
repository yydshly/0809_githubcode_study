import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  SLICE07_GATEB_POLICY,
  Slice07GateBError,
  createSlice07RawWorkerExecutor,
} from "./research-gateb-adapter-slice07.mjs";
import {
  SLICE11_EXPECTED_PROJECTION_ID,
  projectGoldExpectedSlice11,
  sha256Slice11,
  stableStringifySlice11,
} from "./research-expected-projection-slice11.mjs";

const WORKER_PATH = fileURLToPath(new URL("./research-sharp-raw-worker-slice07.mjs", import.meta.url));

export const SLICE11_GATEB_ADAPTER_ID = "ADAPTER-SHARP-CANONICAL-PNG@0.11.0";

export class Slice11GateBError extends Error {
  constructor(code, message, { cause, priorCode = null, expectedProjection = null, workerLifecycle } = {}) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "Slice11GateBError";
    this.code = code;
    this.priorCode = priorCode;
    this.expectedProjection = expectedProjection;
    this.workerLifecycle = workerLifecycle;
  }
}

function defaultWorkerEnvironment() {
  const inherited = {};
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "PATHEXT", "ComSpec", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"]) {
    if (typeof process.env[key] === "string") inherited[key] = process.env[key];
  }
  return {
    ...inherited,
    UV_THREADPOOL_SIZE: "1",
    VIPS_CONCURRENCY: "1",
    SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
    TZ: "UTC",
    LANG: "C",
    LC_ALL: "C",
  };
}

function defaultSpawnWorker() {
  return fork(WORKER_PATH, [], {
    env: defaultWorkerEnvironment(),
    execArgv: [`--max-old-space-size=${SLICE07_GATEB_POLICY.workerMaxOldSpaceMiB}`],
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
}

function observationHash(observation) {
  return observation === null ? null : sha256Slice11(Buffer.from(`${stableStringifySlice11(observation)}\n`, "utf8"));
}

function lifecycle({ spawnAttempted, observation = null }) {
  const messageReceived = observation?.messageReceived === true;
  const exitConfirmed = observation?.exitConfirmed === true;
  const stage = !spawnAttempted
    ? "preflight-not-started"
    : exitConfirmed
      ? "exit-confirmed"
      : messageReceived
        ? "ipc-message-received"
        : "spawn-attempted";
  return Object.freeze({
    stage,
    workerInvoked: spawnAttempted,
    workerExitConfirmed: spawnAttempted ? exitConfirmed : null,
    ipcMessageReceived: messageReceived,
    exitCode: exitConfirmed ? observation.exitCode : null,
    signal: exitConfirmed ? observation.signal : null,
    timedOut: observation?.timedOut === true,
    cancelled: observation?.cancelled === true,
    observationSha256: observationHash(observation),
  });
}

function remap(error, { spawnAttempted, expectedProjection }) {
  const observation = error instanceof Slice07GateBError ? error.workerObservation : null;
  const priorCode = typeof error?.code === "string" ? error.code : null;
  const code = priorCode?.replace(/^S07_/u, "S11_") ?? "S11_EXECUTION_UNCLASSIFIED_FAILURE";
  return new Slice11GateBError(code, "versioned raw-worker execution failed", {
    cause: error,
    priorCode,
    expectedProjection,
    workerLifecycle: lifecycle({ spawnAttempted, observation }),
  });
}

export function createSlice11RawWorkerExecutor({
  expectedRuntime,
  verifyOutput,
  spawnWorker = defaultSpawnWorker,
  encodePng,
  timeoutMs,
  messageDrainMs,
  killConfirmationMs,
} = {}) {
  if (typeof spawnWorker !== "function") {
    throw new Slice11GateBError("S11_ADAPTER_CONFIGURATION_INVALID", "spawnWorker must be a function", {
      workerLifecycle: lifecycle({ spawnAttempted: false }),
    });
  }
  return Object.freeze({
    async execute({ attemptId, operation, workerRequest, goldExpected, signal } = {}) {
      let expectedProjection;
      try {
        expectedProjection = projectGoldExpectedSlice11({
          projectionId: SLICE11_EXPECTED_PROJECTION_ID,
          goldExpected,
        });
      } catch (error) {
        throw new Slice11GateBError("S11_EXPECTED_PROJECTION_INVALID", "gold-to-adapter projection failed before worker start", {
          cause: error,
          priorCode: error?.code ?? null,
          workerLifecycle: lifecycle({ spawnAttempted: false }),
        });
      }
      let spawnAttempted = false;
      const trackingSpawn = () => {
        spawnAttempted = true;
        return spawnWorker();
      };
      const options = { expectedRuntime, verifyOutput, spawnWorker: trackingSpawn };
      if (encodePng !== undefined) options.encodePng = encodePng;
      if (timeoutMs !== undefined) options.timeoutMs = timeoutMs;
      if (messageDrainMs !== undefined) options.messageDrainMs = messageDrainMs;
      if (killConfirmationMs !== undefined) options.killConfirmationMs = killConfirmationMs;
      let delegate;
      try {
        delegate = createSlice07RawWorkerExecutor(options);
        const result = await delegate.execute({
          attemptId,
          operation,
          workerRequest,
          expected: expectedProjection.adapterExpected,
          signal,
        });
        return Object.freeze({
          ...result,
          expectedProjection,
          workerLifecycle: lifecycle({ spawnAttempted, observation: result.workerObservation }),
        });
      } catch (error) {
        throw remap(error, { spawnAttempted, expectedProjection });
      }
    },
  });
}
