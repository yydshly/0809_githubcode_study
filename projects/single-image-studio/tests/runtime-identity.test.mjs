import assert from "node:assert/strict";
import test from "node:test";

import {
  RUNTIME_ID_ERROR_CODES,
  RuntimeIdentityError,
  createRuntimeId,
} from "../web/runtime-identity.js";

async function withGlobalCrypto(value, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value,
  });
  try {
    return await operation();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      delete globalThis.crypto;
    }
  }
}

test("createRuntimeId prefers crypto.randomUUID", async () => {
  let randomBytesRequested = false;
  await withGlobalCrypto({
    randomUUID() {
      return "a0bd9355-141c-42c3-a06b-86c3aaaf8d59";
    },
    getRandomValues() {
      randomBytesRequested = true;
    },
  }, async () => {
    assert.equal(createRuntimeId(), "a0bd9355-141c-42c3-a06b-86c3aaaf8d59");
    assert.equal(randomBytesRequested, false);
  });
});

test("createRuntimeId builds a standards-compliant v4 UUID from secure random bytes", async () => {
  await withGlobalCrypto({
    getRandomValues(target) {
      for (let index = 0; index < target.length; index += 1) {
        target[index] = index;
      }
      return target;
    },
  }, async () => {
    const id = createRuntimeId();
    assert.equal(id, "00010203-0405-4607-8809-0a0b0c0d0e0f");
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

test("createRuntimeId falls back when randomUUID exists but fails", async () => {
  await withGlobalCrypto({
    randomUUID() {
      throw new Error("not available in this context");
    },
    getRandomValues(target) {
      target.fill(0xff);
      return target;
    },
  }, async () => {
    assert.equal(createRuntimeId(), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  });
});

test("createRuntimeId fails closed when no secure randomness is available", async () => {
  await withGlobalCrypto({}, async () => {
    assert.throws(
      () => createRuntimeId(),
      (error) => error instanceof RuntimeIdentityError
        && error.code === RUNTIME_ID_ERROR_CODES.SECURE_RANDOM_UNAVAILABLE,
    );
  });
});
