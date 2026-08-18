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
  context.putImageData = (imageData, x, y) => calls.push({ name: "putImageData", args: [imageData, x, y] });
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
    straighten: 4,
    flipHorizontal: true,
    crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.5 },
    resize: { width: 800, height: 800 },
    adjustments: { brightness: 10, contrast: -5, saturation: 20 },
    detailEnhancement: { denoise: 12, clarity: 18 },
  });
  const plan = buildRenderPlan({ sourceWidth: 4000, sourceHeight: 2000, editState });
  assert.deepEqual(plan.transformed, { width: 2000, height: 4000 });
  assert.deepEqual(plan.crop, { x: 500, y: 400, width: 1000, height: 2000 });
  assert.deepEqual(plan.output, { width: 400, height: 800 });
  assert.equal(plan.filter, "brightness(110%) contrast(95%) saturate(120%)");
  assert.deepEqual(plan.detailEnhancement, { denoise: 12, clarity: 18 });
  assert.equal(plan.alphaMode, "preserve");
  assert.equal(plan.straighten, 4);
  assert.ok(plan.straightenScale > 1);
});

test("straighten keeps the transformed canvas size and shares its cover transform with export", async () => {
  const editState = createEditState({ straighten: -5 });
  const plan = buildRenderPlan({ sourceWidth: 1600, sourceHeight: 900, editState });
  assert.deepEqual(plan.transformed, { width: 1600, height: 900 });
  assert.deepEqual(plan.output, { width: 1600, height: 900 });

  const factory = canvasFactory();
  await renderEditedImage({
    image: { naturalWidth: 16, naturalHeight: 9 },
    editState,
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: 16, height: 9, pixels: emptyPixels(16, 9) }),
  });
  const transformed = factory.canvases[0];
  assert.deepEqual(transformed.calls.find(({ name }) => name === "scale").args, [
    plan.straightenScale,
    plan.straightenScale,
  ]);
  assert.ok(Math.abs(transformed.calls.find(({ name }) => name === "rotate").args[0] + 5 * Math.PI / 180) < 1e-12);
});

test("vertical perspective adds one full-resolution geometry canvas and output samples it", async () => {
  const editState = createEditState({ verticalPerspective: 20 });
  const plan = buildRenderPlan({ sourceWidth: 100, sourceHeight: 3, editState });
  assert.equal(plan.verticalPerspective, 20);
  assert.equal(plan.verticalPerspectiveScale, 1.25);

  const factory = canvasFactory();
  await renderEditedImage({
    image: { naturalWidth: 100, naturalHeight: 3 },
    editState,
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: 100, height: 3, pixels: emptyPixels(100, 3) }),
  });
  assert.deepEqual(factory.canvases.map(({ role }) => role), ["transform", "perspective", "output"]);
  const perspective = factory.canvases[1];
  assert.equal(perspective.calls.filter(({ name }) => name === "drawImage").length, 3);
  assert.deepEqual(perspective.calls.find(({ name }) => name === "drawImage").args.slice(1), [0, 0, 100, 1, -25, 0, 150, 1]);
  const outputDraw = factory.canvases[2].calls.find(({ name }) => name === "drawImage");
  assert.equal(outputDraw.args[0], perspective);
});

test("four-corner rectification adds a full-resolution plane before the shared output canvas", async () => {
  const quad = {
    topLeft: { x: 0.1, y: 0.1 },
    topRight: { x: 0.9, y: 0.1 },
    bottomRight: { x: 1, y: 0.9 },
    bottomLeft: { x: 0, y: 0.9 },
  };
  const editState = createEditState({ rectification: { enabled: true, quad } });
  const plan = buildRenderPlan({ sourceWidth: 10, sourceHeight: 8, editState });
  const factory = canvasFactory();
  await renderEditedImage({
    image: { naturalWidth: 10, naturalHeight: 8 },
    editState,
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: plan.output.width, height: plan.output.height, pixels: emptyPixels(plan.output.width, plan.output.height) }),
  });
  assert.deepEqual(factory.canvases.map(({ role }) => role), ["transform", "rectification", "output"]);
  const rectification = factory.canvases[1];
  assert.deepEqual([rectification.width, rectification.height], [plan.rectified.width, plan.rectified.height]);
  assert.equal(rectification.calls.some(({ name }) => name === "putImageData"), true);
  assert.equal(factory.canvases[2].calls.find(({ name }) => name === "drawImage").args[0], rectification);
});

test("document scan mode is applied on the shared output canvas before encoding", async () => {
  const editState = createEditState({ documentScan: { mode: "grayscale" } });
  const plan = buildRenderPlan({ sourceWidth: 4, sourceHeight: 2, editState });
  assert.equal(plan.documentScan.mode, "grayscale");
  const factory = canvasFactory();
  await renderEditedImage({
    image: { naturalWidth: 4, naturalHeight: 2 },
    editState,
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: 4, height: 2, pixels: emptyPixels(4, 2) }),
  });
  const output = factory.canvases.find(({ role }) => role === "output");
  assert.equal(output.calls.filter(({ name }) => name === "putImageData").length, 1);
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

test("a custom size remains an upper bound and never enlarges a smaller crop", () => {
  const reduced = buildRenderPlan({
    sourceWidth: 1600,
    sourceHeight: 900,
    editState: createEditState({ resize: { width: 800, height: 450, mode: "custom" } }),
  });
  assert.deepEqual(reduced.output, { width: 800, height: 450 });

  const unchanged = buildRenderPlan({
    sourceWidth: 640,
    sourceHeight: 360,
    editState: createEditState({ resize: { width: 1200, height: 675, mode: "custom" } }),
  });
  assert.deepEqual(unchanged.output, { width: 640, height: 360 });
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

test("pixel detail enhancement runs on the output canvas before encoding", async () => {
  const factory = canvasFactory();
  await renderEditedImage({
    image: { naturalWidth: 3, naturalHeight: 1 },
    editState: createEditState({ detailEnhancement: { denoise: 20, clarity: 30 } }),
    createCanvas: (role) => factory.create(role),
    encode: async (_canvas, mime) => new Blob([minimalPngBytes()], { type: mime }),
    reopen: async () => ({ width: 3, height: 1, pixels: emptyPixels(3, 1) }),
  });
  const output = factory.canvases.find(({ role }) => role === "output");
  assert.equal(output.calls.filter(({ name }) => name === "putImageData").length, 1);
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
