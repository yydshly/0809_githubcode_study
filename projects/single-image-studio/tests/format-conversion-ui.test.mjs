import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("format conversion is a dedicated local journey with truthful transparency and quality feedback", async () => {
  const [catalog, main, index, styles, download, contract] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/index.html", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("web/result-download.js", root), "utf8"),
    readFile(new URL("FORMAT_CONVERSION.md", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-CONVERT"[\s\S]*local-format-conversion-v1/);
  assert.match(main, /转成什么格式[\s\S]*name="format"[\s\S]*JPEG 质量[\s\S]*透明区域填充色/);
  assert.match(main, /formatConversionReport[\s\S]*conversion\.transparencySummary[\s\S]*conversion\.qualitySummary/);
  assert.match(index, /id="format-conversion-card"[\s\S]*格式、透明与画质变化/);
  assert.match(styles, /\.format-conversion-options[\s\S]*\.format-conversion-card/);
  assert.match(download, /"UT-CONVERT"[\s\S]*prefix: "converted-image"[\s\S]*image\/png[\s\S]*image\/jpeg/);
  assert.match(contract, /转换不会自动抠图[\s\S]*转成 PNG 不会恢复/);
});
