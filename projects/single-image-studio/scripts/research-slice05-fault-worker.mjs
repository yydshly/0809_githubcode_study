/*
 * Deterministic fault-only child used by the post-freeze Slice 05 smoke run.
 * It never imports Sharp and never accepts image or artifact bytes.
 */

const PROTOCOL_VERSION = "fault-worker.slice05.v0";
const REQUEST_KEYS = Object.freeze(["protocolVersion", "attemptId", "mode"]);
const MODES = new Set([
  "timeout-hang",
  "cancel-hang",
  "exit-before-result",
  "malformed-result",
  "reported-reconciliation-unknown",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validRequest(request) {
  if (!isPlainObject(request)) return false;
  const keys = Object.keys(request);
  return keys.length === REQUEST_KEYS.length && REQUEST_KEYS.every((key) => Object.hasOwn(request, key))
    && request.protocolVersion === PROTOCOL_VERSION
    && typeof request.attemptId === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/.test(request.attemptId)
    && !request.attemptId.includes("..")
    && MODES.has(request.mode);
}

function send(payload) {
  if (typeof process.send !== "function" || !process.connected) {
    process.exitCode = 90;
    return;
  }
  process.send(payload, (error) => {
    process.exitCode = error ? 91 : 0;
    process.disconnect?.();
  });
}

let handled = false;
process.on("message", (request) => {
  if (handled || !validRequest(request)) {
    send({ protocolVersion: PROTOCOL_VERSION, status: "fault", code: "S05_FAULT_WORKER_PROTOCOL_INVALID" });
    return;
  }
  handled = true;

  if (request.mode === "exit-before-result") {
    process.exit(86);
  }
  if (request.mode === "malformed-result") {
    send({ malformed: true });
    return;
  }
  if (request.mode === "reported-reconciliation-unknown") {
    send({
      protocolVersion: PROTOCOL_VERSION,
      attemptId: request.attemptId,
      status: "fault",
      code: "S05_FAULT_RECONCILIATION_UNKNOWN",
    });
    return;
  }

  // timeout-hang and cancel-hang deliberately produce neither pixels nor a result.
  setInterval(() => {}, 1_000);
});
