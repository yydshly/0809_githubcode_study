import assert from "node:assert/strict";
import test from "node:test";

import { perspectivePreviewSize, renderPerspectivePreview } from "../web/perspective-preview.js";

function fakeCanvas(role = "output") {
  const calls = [];
  const context = { filter: "none" };
  for (const name of ["clearRect", "save", "restore", "translate", "scale", "rotate", "drawImage"]) {
    context[name] = (...args) => calls.push({ name, args, filter: context.filter });
  }
  return {
    role,
    width: 0,
    height: 0,
    calls,
    getContext: () => context,
  };
}

test("perspective preview has a bounded canvas while preserving aspect", () => {
  assert.deepEqual(perspectivePreviewSize({ width: 1600, height: 900 }), { width: 720, height: 405, scale: 0.45 });
  assert.deepEqual(perspectivePreviewSize({ width: 400, height: 800 }), { width: 360, height: 720, scale: 0.9 });
});

test("preview uses the same strip renderer after rotation and straighten", () => {
  const output = fakeCanvas();
  const bases = [];
  const visible = renderPerspectivePreview({
    canvas: output,
    image: { naturalWidth: 1600, naturalHeight: 900 },
    geometry: {
      oriented: { width: 1600, height: 900 },
      transformed: { width: 900, height: 1600 },
      rotation: 90,
      straighten: -3,
      straightenScale: 1.08,
      verticalPerspective: 10,
      flipHorizontal: false,
      flipVertical: true,
    },
    filter: "brightness(110%)",
    createCanvas: (role) => {
      const canvas = fakeCanvas(role);
      bases.push(canvas);
      return canvas;
    },
  });
  assert.equal(visible, true);
  assert.deepEqual([output.width, output.height], [405, 720]);
  assert.equal(bases[0].calls.find(({ name }) => name === "drawImage").filter, "brightness(110%)");
  const [scaleX, scaleY] = bases[0].calls.find(({ name }) => name === "scale").args;
  assert.ok(Math.abs(scaleX - 0.486) < 1e-12);
  assert.ok(Math.abs(scaleY + 0.486) < 1e-12);
  assert.equal(output.calls.filter(({ name }) => name === "drawImage").length, 720);
});

test("preview stays off before the source is ready or when correction is zero", () => {
  const geometry = {
    oriented: { width: 100, height: 100 }, transformed: { width: 100, height: 100 },
    rotation: 0, straighten: 0, straightenScale: 1, verticalPerspective: 0,
    flipHorizontal: false, flipVertical: false,
  };
  assert.equal(renderPerspectivePreview({ canvas: fakeCanvas(), image: { naturalWidth: 0 }, geometry }), false);
  assert.equal(renderPerspectivePreview({ canvas: fakeCanvas(), image: { naturalWidth: 100, naturalHeight: 100 }, geometry }), false);
});
