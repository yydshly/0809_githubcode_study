import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [asset, html, runtime, manifest, styles] = await Promise.all([
  readFile(new URL("../web/demo-assets/straighten-studio-source.png", import.meta.url)),
  readFile(new URL("../web/straighten-reference.html", import.meta.url), "utf8"),
  readFile(new URL("../web/straighten-reference.js", import.meta.url), "utf8"),
  readFile(new URL("../DEMO_ASSETS.md", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

test("straighten reference source is one frozen project-original PNG", () => {
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(asset.readUInt32BE(16), 1536);
  assert.equal(asset.readUInt32BE(20), 1024);
  assert.equal(asset.length, 2_089_429);
  assert.equal(
    createHash("sha256").update(asset).digest("hex"),
    "24937430feba736e83b172462473404f2547a32aafdafbe8e63afc27a935b9a1",
  );
  assert.match(manifest, /项目原创 AI 生成合成工作室照片/u);
  assert.match(manifest, /不得用来证明自动地平线、自动透视识别、四角扫描或镜头畸变校正/u);
});

test("reference page generates all three outputs through the real editor renderer", () => {
  assert.match(html, /下方结果不是预制示意图/u);
  assert.match(html, /data-demo-card="corrected"/u);
  assert.match(html, /data-demo-card="square"/u);
  assert.match(runtime, /import \{ runLocalEditor \} from "\.\/editor-session\.js"/u);
  assert.match(runtime, /straighten: -5/u);
  assert.match(runtime, /verticalPerspective: 12/u);
  assert.match(runtime, /ratio: "square",[\s\S]*rotation: 90/u);
  assert.match(runtime, /pixelValidation\.pixelCount !== corrected\.width \* corrected\.height/u);
  assert.match(runtime, /result\.renderPlan\.straightenScale/u);
  assert.doesNotMatch(runtime, /fetch\([^)]*api|\/api\//u);
});

test("reference comparison stays full-frame and stacks at the narrow viewport", () => {
  assert.match(styles, /\.straighten-reference-grid \{[^}]*grid-template-columns: repeat\(2/u);
  assert.match(styles, /\.straighten-reference-card figure img \{[^}]*object-fit: contain/u);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.straighten-reference-grid \{ grid-template-columns: 1fr;/u);
});
