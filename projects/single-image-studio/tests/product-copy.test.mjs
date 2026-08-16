import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, main, localProcessing, resultDownload] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/local-processing.js", import.meta.url), "utf8"),
  readFile(new URL("../web/result-download.js", import.meta.url), "utf8"),
]);

test("R0 page identifies itself as an engineering probe and does not claim image analysis", () => {
  assert.match(html, /R0 工程探针/);
  assert.match(html, /尚未分析图片内容或判断适用性/);
  for (const forbidden of ["确认并分析", "正在分析图片", "适合这张图", "可运行首版"]) {
    assert.doesNotMatch(html, new RegExp(forbidden));
  }

  assert.match(main, /不分析图片内容或推荐适用效果/);
  assert.doesNotMatch(main, /图片分析没有完成|已取消图片分析/);
});

test("visible output copy distinguishes engineering validation from content quality", () => {
  assert.match(html, /工程校验完成/);
  assert.doesNotMatch(html, /已通过结果检查/);
  assert.match(localProcessing, /未执行内容质量检查/);
  assert.match(main, /未执行内容质量检查/);
  assert.match(resultDownload, /内容质量检查尚未实现/);
});
