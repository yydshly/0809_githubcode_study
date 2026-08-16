import assert from "node:assert/strict";
import test from "node:test";

import { createEditState } from "../web/edit-state.js";
import { buildRenderPlan, renderEditedImage } from "../web/editor-renderer.js";

function fakeCanvas(role) {
  const calls = [];
  let alphaMode = true;
  const context = {
    fillStyle: "",
    filter: "none",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  };
  for (const name of ["save", "restore", "translate", "scale", "rotate", "setTransform", "drawImage", "fillRect"]) {
    context[name] = (...args) => calls.push({ name, args, fillStyle: context.fillStyle, filter: context.filter });
  }
  context.getImageData = (_x, _y, width, height) => {
    const data = new Uint8ClampedArray(width * height * 4);
    if (!alphaMode) {
      for (let offset = 3; offset < data.length; offset += 4) data[offset] = 255;
    }
    return { data };
  };
  return {
    role,
    width: 0,
    height: 0,
    alpha: null,
    calls,
    context,
    getContext(kind, options) {
      assert.equal(kind, "2d");
      this.alpha = options.alpha;
      alphaMode = options.alpha;
      return context;
    },
    toBlob() {},
  };
}

function canvasFactory() {
  const canvases = [];
  return {
    canvases,
    create(role) {
      const canvas = fakeCanvas(role);
      canvases.push(canvas);
      return canvas;
    },
  };
}

function emptyPixels(width, height, alpha = 0) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = alpha;
  return pixels;
}

function minimalPngBytes() {
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 0, 73, 72, 68, 82, 0, 0, 0, 0,
    0, 0, 0, 0, 73, 68, 65, 84, 0, 0, 0, 0,
    0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0,
  ]);
}

function minimalJpegBytes() {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
}

test("render plan applies rotation before normalized crop and fits without distortion", () => {
  const editState = createEditState({
    rotation: 90,
    flipHorizontal: true,
    crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.5 },
    resize: { width: 800, height: 800 },
    adjustments: { brightness: 10, contrast: -5, saturation: 20 },
  });
  const plan = buildRenderPlan({ sourceWidth: 4000, sourceHeight: 2000, editState });
  assert.deepEqual(plan.transformed, { width: 2000, height: 4000 });
  assert.deepEqual(plan.crop, { x: 500, y: 400, width: 1000, height: 2000 });
  assert.deepEqual(plan.output, { width: 400, height: 800 });
  assert.equal(plan.filter, "brightness(110%) contrast(95%) saturate(120%)");
  assert.equal(plan.alphaMode, "preserve");
});

test("render plan enforces limits and applies EXIF orientation before user rotation", () => {
  const limited = buildRenderPlan({
    sourceWidth: 8000,
    sourceHeight: 8000,
    editState: createEditState({ resize: { maxEdge: 8192, maxPixels: 4_000_000 } }),
  });
  assert.deepEqual(limited.output, { width: 2000, height: 2000 });

  const noUpscale = buildRenderPlan({ sourceWidth: 320, sourceHeight: 200 });
  assert.deepEqual(noUpscale.output, { width: 320, height: 200 });
  const oriented = buildRenderPlan({
    sourceWidth: 400,
    sourceHeight: 300,
    sourceOrientation: 6,
    editState: createEditState({ rotation: 90 }),
  });
  assert.deepEqual(oriented.oriented, { width: 300, height: 400 });
  assert.deepEqual(oriented.transformed, { width: 400, height: 300 });
  assert.throws(() => buildRenderPlan({ sourceWidth: 320, sourceHeight: 200, sourceOrientation: 9 }), /1–8/);
});

test("orientation 6 is normalized on a dedicated transparent canvas", async () => {
  const factory = canvasFactory();
  await renderEditedImage({
    image: { width: 400, height: 300 },
    sourceOrientation: 6,
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: 300, height: 400, pixels: emptyPixels(300, 400) }),
  });
  assert.deepEqual(factory.canvases.map(({ role }) => role), ["orientation", "transform", "output"]);
  const orientation = factory.canvases[0];
  assert.deepEqual([orientation.width, orientation.height, orientation.alpha], [300, 400, true]);
  assert.deepEqual(orientation.calls[0], {
    name: "setTransform",
    args: [0, 1, -1, 0, 300, 0],
    fillStyle: "",
    filter: "none",
  });
});

test("all mirrored EXIF orientations use the frozen canvas matrices", async () => {
  const expected = new Map([
    [2, { size: [400, 300], matrix: [-1, 0, 0, 1, 400, 0] }],
    [3, { size: [400, 300], matrix: [-1, 0, 0, -1, 400, 300] }],
    [4, { size: [400, 300], matrix: [1, 0, 0, -1, 0, 300] }],
    [5, { size: [300, 400], matrix: [0, 1, 1, 0, 0, 0] }],
    [6, { size: [300, 400], matrix: [0, 1, -1, 0, 300, 0] }],
    [7, { size: [300, 400], matrix: [0, -1, -1, 0, 300, 400] }],
    [8, { size: [300, 400], matrix: [0, -1, 1, 0, 0, 400] }],
  ]);
  for (const [sourceOrientation, { size, matrix }] of expected) {
    const factory = canvasFactory();
    await renderEditedImage({
      image: { width: 400, height: 300 },
      sourceOrientation,
      createCanvas: (role) => factory.create(role),
      encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
      reopen: async () => ({ width: size[0], height: size[1], pixels: emptyPixels(size[0], size[1]) }),
    });
    const orientation = factory.canvases[0];
    assert.equal(orientation.role, "orientation");
    assert.deepEqual([orientation.width, orientation.height], size);
    assert.deepEqual(orientation.calls[0].args, matrix);
  }
});

test("PNG render keeps both canvases transparent and reopens encoded dimensions", async () => {
  const factory = canvasFactory();
  const image = { naturalWidth: 400, naturalHeight: 200 };
  const result = await renderEditedImage({
    image,
    editState: createEditState({ rotation: 90, flipVertical: true }),
    createCanvas: (role) => factory.create(role),
    encode: async (canvas, mime, quality) => {
      assert.equal(canvas.role, "output");
      assert.equal(mime, "image/png");
      assert.equal(quality, undefined);
      return new Blob([minimalPngBytes()], { type: mime });
    },
    reopen: async () => ({ width: 200, height: 400, pixels: emptyPixels(200, 400) }),
  });

  const [transformed, output] = factory.canvases;
  assert.equal(transformed.alpha, true);
  assert.equal(output.alpha, true);
  assert.equal(transformed.width, 200);
  assert.equal(transformed.height, 400);
  assert.equal(output.width, 200);
  assert.equal(output.height, 400);
  assert.deepEqual(transformed.calls.map(({ name }) => name), ["save", "translate", "scale", "rotate", "drawImage", "restore"]);
  assert.deepEqual(transformed.calls.find(({ name }) => name === "scale").args, [1, -1]);
  assert.equal(output.calls.some(({ name }) => name === "fillRect"), false);
  assert.equal(result.alphaMode, "preserve");
  assert.equal(result.byteLength, 44);
  assert.match(result.outputHash, /^[0-9a-f]{64}$/u);
  assert.match(result.validationSummary, /Alpha\/可见颜色/);
});

test("JPEG render uses an opaque context and explicit background before drawing", async () => {
  const factory = canvasFactory();
  const result = await renderEditedImage({
    image: { naturalWidth: 300, naturalHeight: 200 },
    editState: createEditState({ output: { format: "jpeg", jpegQuality: 0.75, jpegBackground: "#123456" } }),
    createCanvas: (role) => factory.create(role),
    encode: async (canvas, mime, quality) => {
      assert.equal(canvas.role, "output");
      assert.equal(mime, "image/jpeg");
      assert.equal(quality, 0.75);
      return new Blob([minimalJpegBytes()], { type: mime });
    },
    reopen: async () => ({ width: 300, height: 200, pixels: emptyPixels(300, 200, 255) }),
  });

  const output = factory.canvases[1];
  assert.equal(output.alpha, false);
  assert.deepEqual(output.calls.slice(0, 2).map(({ name }) => name), ["fillRect", "drawImage"]);
  assert.equal(output.calls[0].fillStyle, "#123456");
  assert.equal(result.alphaMode, "flatten-on-explicit-background");
});

test("renderer fails closed for invalid encoded bytes and reopened geometry", async () => {
  const image = { naturalWidth: 10, naturalHeight: 10 };
  const invalidFactory = canvasFactory();
  await assert.rejects(
    renderEditedImage({
      image,
      createCanvas: (role) => invalidFactory.create(role),
      encode: async () => new Blob([], { type: "image/png" }),
      reopen: async () => ({ width: 10, height: 10 }),
    }),
    /无效编码结果/,
  );

  const mismatchFactory = canvasFactory();
  await assert.rejects(
    renderEditedImage({
      image,
      createCanvas: (role) => mismatchFactory.create(role),
      encode: async () => new Blob([minimalPngBytes()], { type: "image/png" }),
      reopen: async () => ({ width: 9, height: 10 }),
    }),
    /重开尺寸/,
  );
});
