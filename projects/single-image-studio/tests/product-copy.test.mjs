import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, main, localProcessing, resultDownload, styles] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/local-processing.js", import.meta.url), "utf8"),
  readFile(new URL("../web/result-download.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
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

test("editor usability states retain keyboard focus, mobile stacking and reduced-motion fallbacks", () => {
  assert.match(styles, /editor-preview-frame:focus-visible/);
  assert.match(styles, /editor-preview-image \{ position: absolute; left: 50%; top: 50%/);
  assert.match(styles, /data-crop-enabled="true"/);
  assert.match(styles, /@media \(max-width: 980px\)[\s\S]*settings-card \{ position: static/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*editor-preview-meta/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("visible output copy distinguishes engineering validation from content quality", () => {
  assert.match(html, /工程校验完成/);
  assert.doesNotMatch(html, /已通过结果检查/);
  assert.match(localProcessing, /未执行内容质量检查/);
  assert.match(main, /未执行内容质量检查/);
  assert.match(resultDownload, /内容质量检查尚未实现/);
});

test("local editor workspace exposes preview, history and strict-render controls without claiming cutout", () => {
  for (const id of [
    "editor-workspace",
    "editor-preview-frame",
    "editor-preview-image",
    "editor-undo",
    "editor-redo",
    "editor-reset",
    "editor-output-size",
    "editor-change-state",
    "editor-crop-hint",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /预览用于编辑反馈/);
  assert.match(html, /拖动画面或用方向键调整保留区域/);
  assert.match(main, /name="cropX"/);
  assert.match(main, /name="cropY"/);
  assert.match(main, /data-crop-axis-control="horizontal"/);
  assert.match(main, /data-crop-axis-control="vertical"/);
  assert.match(main, /当前只裁左右两侧/);
  assert.match(main, /当前只裁上下两侧/);
  assert.match(main, /tabIndex = presentation\.cropEnabled \? 0 : -1/);
  assert.match(main, /尺寸上限/);
  assert.match(main, /预计导出/);
  assert.doesNotMatch(main, /实际导出 \$\{presentation\.output/);
  assert.match(main, /name="outputWidth"/);
  assert.match(main, /name="outputHeight"/);
  assert.match(main, /生成并校验下载文件/);
  assert.match(main, /全部在本机完成/);
  assert.match(main, /createEditorWorkspace/);
  assert.match(main, /moveEditorCrop/);
  assert.match(main, /editor-output-validation-v1/);
  assert.match(main, /revokeIfBlob\(processed\.url\)/);
  assert.doesNotMatch(main, /processFaithful\(\{ sourceUrl/);
});
