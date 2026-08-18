import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, main, styles] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

test("social grid scene exposes overview, ordered tile preview and two download scopes", () => {
  assert.match(html, /data-feature-hint="social-grid"[^>]*><strong>新场景：<\/strong>上传并确认后，可在“场景技能”中选择“社交九宫格切图”/);
  assert.match(html, /id="social-grid-output-set"/);
  assert.match(html, /id="social-grid-show-overview"[^>]*>查看整图</);
  assert.match(html, /id="social-grid-download-selected"[^>]*>下载选中单图</);
  assert.match(html, /id="social-grid-download-all"[^>]*>下载九张 ZIP</);
  assert.equal((html.match(/data-social-grid-tile="tile-\d"/gu) ?? []).length, 9);
  assert.match(html, /按左到右、从上到下/);
  assert.match(html, /不会自动发布、识别主体或补画画面/);
  assert.match(styles, /\.social-grid-mosaic \{[^}]*grid-template-columns: repeat\(3/);
  assert.match(styles, /\.social-grid-mosaic button \{[^}]*aspect-ratio: 1/);
});

test("social grid runtime validates every PNG and refuses stale output publication", () => {
  assert.match(main, /taskId: "UT-GRID"/);
  assert.match(main, /九宫格总画面 · 方形 1:1/);
  assert.match(main, /gridTask[\s\S]*?<input type="hidden" name="format" value="png"/);
  assert.match(main, /min="\$\{gridTask \? 3 : 1\}"/);
  assert.match(main, /socialGridLayout\(currentResult\.width, currentResult\.height\)/);
  assert.match(main, /inspectOutputMetadata\(bytes, "image\/png"\)/);
  assert.match(main, /verifyPixelRoundTrip\(\{/);
  assert.match(main, /source\?\.hash !== expected\.sourceHash/);
  assert.match(main, /socialGridOutputSetToken !== expected\.token/);
  assert.match(main, /outputs\.size !== SOCIAL_GRID_TILE_COUNT/);
  assert.match(main, /createStoredZip\(outputs\.map/);
  assert.match(main, /social-grid-9-images-/);
});
