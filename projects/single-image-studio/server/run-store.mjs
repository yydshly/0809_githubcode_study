import { randomUUID } from "node:crypto";

export const RUN_STATUSES = Object.freeze([
  "queued",
  "running",
  "succeeded",
  "failed",
  "unknown",
]);

const STATUS_SET = new Set(RUN_STATUSES);
const TRANSITIONS = Object.freeze({
  queued: new Set(["running", "failed", "unknown"]),
  running: new Set(["succeeded", "failed", "unknown"]),
  unknown: new Set(["running", "succeeded", "failed"]),
  succeeded: new Set(),
  failed: new Set(),
});

function clone(value) {
  return structuredClone(value);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

export class InMemoryRunStore {
  #runs = new Map();

  create(metadata = {}, { id = randomUUID() } = {}) {
    assertPlainObject(metadata, "run metadata");
    if (typeof id !== "string" || !id) throw new TypeError("Run id must be a non-empty string");
    if (this.#runs.has(id)) throw new TypeError(`Run already exists: ${id}`);
    const now = new Date().toISOString();
    const run = {
      ...clone(metadata),
      id,
      status: "queued",
      requestId: null,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
    };
    this.#runs.set(run.id, run);
    return clone(run);
  }

  createOrGet({ id, inputFingerprint, metadata = {} }) {
    if (typeof id !== "string" || !id) throw new TypeError("Run id must be a non-empty string");
    if (typeof inputFingerprint !== "string" || !inputFingerprint) {
      throw new TypeError("Input fingerprint must be a non-empty string");
    }
    assertPlainObject(metadata, "run metadata");

    const existing = this.#runs.get(id);
    if (existing) {
      return {
        run: clone(existing),
        created: false,
        conflict: existing.inputFingerprint !== inputFingerprint,
      };
    }

    return {
      run: this.create({ ...metadata, inputFingerprint }, { id }),
      created: true,
      conflict: false,
    };
  }

  get(id) {
    const run = this.#runs.get(id);
    return run ? clone(run) : null;
  }

  delete(id) {
    return this.#runs.delete(id);
  }

  update(id, patch) {
    assertPlainObject(patch, "run patch");
    const current = this.#runs.get(id);
    if (!current) throw new Error(`Unknown run: ${id}`);

    if ("id" in patch || "createdAt" in patch) {
      throw new TypeError("Run identity and creation time are immutable");
    }

    if (patch.status !== undefined) {
      if (!STATUS_SET.has(patch.status)) {
        throw new TypeError(`Invalid run status: ${patch.status}`);
      }
      if (patch.status !== current.status && !TRANSITIONS[current.status].has(patch.status)) {
        throw new TypeError(`Invalid run transition: ${current.status} -> ${patch.status}`);
      }
    }

    const next = {
      ...current,
      ...clone(patch),
      updatedAt: new Date().toISOString(),
    };
    this.#runs.set(id, next);
    return clone(next);
  }
}
