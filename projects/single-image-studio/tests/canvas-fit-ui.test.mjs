import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("whole-image canvas fit is a dedicated no-crop local journey", async () => {
  const [catalog, main, index, styles, download, contract] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/index.html", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("web/result-download.js", root), "utf8"),
    readFile(new URL("CANVAS_FIT.md", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-FIT"[\s\S]*local-canvas-fit-v1/);
  assert.match(main, /原图是[\s\S]*name="canvasRatio"[\s\S]*CANVAS_FIT_RATIOS\.map[\s\S]*name="canvasCustomWidth"[\s\S]*name="canvasMargin"[\s\S]*name="canvasBackground"/);
  assert.match(main, /name === "canvasMargin" \? 8/);
  assert.match(main, /composeCanvasFitResult[\s\S]*drawCanvasFit[\s\S]*verifyPixelRoundTrip/);
  assert.match(index, /id="canvas-fit-card"[\s\S]*整张图片已放入目标画布/);
  assert.match(styles, /\.editor-preview-frame\.is-canvas-fit/);
  assert.match(styles, /\.canvas-fit-card/);
  assert.match(download, /"UT-FIT"[\s\S]*prefix: "fitted-image"/);
  assert.match(contract, /不裁切、不放大小图、不生成画面外内容/);
});
