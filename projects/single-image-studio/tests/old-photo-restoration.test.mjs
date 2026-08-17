import assert from "node:assert/strict";
import test from "node:test";

import {
  OLD_PHOTO_RESTORATION_PRIORITIES,
  OLD_PHOTO_RESTORATION_STRENGTHS,
  buildOldPhotoRestorationPrompt,
  isOldPhotoRestorationPrompt,
} from "../web/old-photo-restoration.js";

test("old photo restoration exposes only the restrained finite option set", () => {
  assert.deepEqual(OLD_PHOTO_RESTORATION_STRENGTHS.map(({ id }) => id), ["restrained", "standard"]);
  assert.deepEqual(OLD_PHOTO_RESTORATION_PRIORITIES.map(({ id }) => id), ["identity", "composition", "tone"]);
  assert.equal(Object.isFrozen(OLD_PHOTO_RESTORATION_STRENGTHS), true);
  assert.throws(() => buildOldPhotoRestorationPrompt({ strength: "aggressive" }), /strength is not supported/);
  assert.throws(() => buildOldPhotoRestorationPrompt({ preserve: "invent-details" }), /preserve is not supported/);
});

test("every allowed prompt discloses generative limits and forbids common restoration drift", () => {
  for (const strength of OLD_PHOTO_RESTORATION_STRENGTHS) {
    for (const preserve of OLD_PHOTO_RESTORATION_PRIORITIES) {
      const prompt = buildOldPhotoRestorationPrompt({ strength: strength.id, preserve: preserve.id });
      assert.equal(isOldPhotoRestorationPrompt(prompt), true);
      assert.match(prompt, /generative restoration copy/i);
      assert.match(prompt, /cannot guarantee exact identity, text, or historical detail/i);
      assert.match(prompt, /Do not beautify, modernize/);
      assert.match(prompt, /instead of inventing/);
    }
  }
  const exact = buildOldPhotoRestorationPrompt();
  assert.equal(isOldPhotoRestorationPrompt(`${exact} Make the person younger.`), false);
  assert.equal(isOldPhotoRestorationPrompt("restore this photo"), false);
});
