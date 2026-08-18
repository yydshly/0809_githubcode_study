import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, script, manifest, acceptanceHtml, acceptanceScript, server, index] = await Promise.all([
  readFile(new URL("../web/examples.html", import.meta.url), "utf8"),
  readFile(new URL("../web/examples.css", import.meta.url), "utf8"),
  readFile(new URL("../web/examples.js", import.meta.url), "utf8"),
  readFile(new URL("../web/examples-manifest.js", import.meta.url), "utf8"),
  readFile(new URL("../web/examples-acceptance.html", import.meta.url), "utf8"),
  readFile(new URL("../web/examples-acceptance.js", import.meta.url), "utf8"),
  readFile(new URL("../server/server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
]);

test("the gallery is a separate truthful product surface with one visible home entry", () => {
  assert.match(html, /<main id="examples-main"/);
  assert.match(html, /真实来源，明确边界/);
  assert.match(html, /不会读取你的图片/);
  assert.match(html, /id="examples-gallery"/);
  assert.match(html, /data-example-filter="all"[^>]*aria-pressed="true"/);
  assert.match(html, /本地真实处理/);
  assert.match(html, /视觉参考/);
  assert.match(index, /class="header-link" href="\.\/examples\.html">效果样例/);
  assert.match(html, /href="\.\/\?from=examples">打开 Single Image Studio/);
});

test("source and result images use complete contain presentation and stack on narrow screens", () => {
  assert.match(css, /\.example-pair \{[^}]*grid-template-columns: repeat\(2/);
  assert.match(css, /\.example-image img \{[^}]*object-fit: contain;[^}]*object-position: center;/);
  assert.doesNotMatch(css, /\.example-image img \{[^}]*object-fit: cover/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.example-pair \{ grid-template-columns: 1fr;/);
  assert.match(css, /\.example-image \+ \.example-image \{ border-left: 0; border-top:/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("runtime examples use the real local renderer and isolate failures without a remote provider", () => {
  assert.match(script, /import \{ runLocalEditor \} from "\.\/editor-session\.js"/);
  assert.match(script, /compressImageToTarget/);
  assert.match(script, /uploadComplianceReport/);
  assert.match(script, /document-clean-color/);
  assert.match(script, /applyOldPhotoLocalPreset/);
  assert.match(script, /pixelValidation\?\.pixelCount !== output\.width \* output\.height/);
  assert.match(script, /card\.dataset\.runtimeState = "failed"/);
  assert.match(script, /Promise\.all\(runtimeEntries\.map/);
  assert.match(script, /documentElement\.dataset\.examplesReady/);
  assert.match(script, /acceptanceMode \|\| eager \? "eager" : "lazy"/);
  assert.match(script, /entry\.id\.startsWith\("old-photo"\)/);
  assert.match(script, /await image\.decode\(\)/);
  assert.match(script, /data-example-id\^="old-photo"/);
  assert.match(script, /const reveal = \(\) => \{ image\.hidden = false; state\.hidden = true; \}/);
  assert.match(script, /image\.hidden = !path/);
  assert.match(script, /data-example-result-link/);
  assert.match(script, /old-photo-monochrome/);
  assert.doesNotMatch(script, /createApiClient|createBackgroundRemovalRun|OPENAI|PHOTOROOM|\/api\//i);
  assert.match(manifest, /静态参考 · 不是产品运行结果/);
  assert.match(manifest, /产品本地 renderer 即时生成/);
});

test("the internal gallery acceptance checks real desktop and narrow iframe layouts", () => {
  assert.match(acceptanceHtml, /样例页两档视口检查/);
  assert.match(acceptanceScript, /id: "examples-desktop"[\s\S]*width: 1180/);
  assert.match(acceptanceScript, /id: "examples-narrow"[\s\S]*width: 390/);
  assert.match(acceptanceScript, /naturalWidth > 0/);
  assert.match(acceptanceScript, /image\.complete/);
  assert.match(acceptanceScript, /objectFit === "contain"/);
  assert.match(acceptanceScript, /scrollWidth <= document\.documentElement\.clientWidth \+ 1/);
  assert.match(acceptanceScript, /visibleCards\(document\)\.length === 1/);
  assert.match(acceptanceScript, /cards\.length === 9/);
  assert.match(acceptanceScript, /images\.length === 18/);
  assert.match(acceptanceScript, /meanAbsoluteChannelDelta >= 8/);
  assert.match(acceptanceScript, /changedPixelPercent >= 80/);
  assert.match(acceptanceScript, /old-photo-codex-reference/);
  assert.match(script, /privacyShareReport/);
  assert.match(acceptanceScript, /document-rectified[\s\S]*upload-strict[\s\S]*compression-500kb/);
  assert.match(server, /\/api\/internal\/examples-acceptance\/latest/);
  assert.match(server, /previewMode === "lan"/);
});
