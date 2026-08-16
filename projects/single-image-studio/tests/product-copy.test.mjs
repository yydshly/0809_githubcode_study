import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, main, localProcessing, resultDownload, recoveryPresentation, maskOutputPresentation, styles, server, backgroundRemovalRuntime, envExample, packageJson] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/local-processing.js", import.meta.url), "utf8"),
  readFile(new URL("../web/result-download.js", import.meta.url), "utf8"),
  readFile(new URL("../web/recovery-presentation.js", import.meta.url), "utf8"),
  readFile(new URL("../web/mask-output-presentation.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../server/server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../server/providers/background-removal/runtime.mjs", import.meta.url), "utf8"),
  readFile(new URL("../.env.example", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
]);

test("product page uses plain-language internal-preview copy without claiming image analysis", () => {
  assert.match(html, /Single Image Studio · 内部试用版/);
  assert.match(html, /不会猜测图片内容或替你决定效果/);
  assert.doesNotMatch(html, /R0 工程探针|工程上可运行|工程校验完成/);
  for (const forbidden of ["确认并分析", "正在分析图片", "适合这张图", "可运行首版"]) {
    assert.doesNotMatch(html, new RegExp(forbidden));
  }

  assert.match(main, /不会判断图片内容或自动推荐效果/);
  assert.match(main, /当前有 \$\{availableCount\} 个可用操作/);
  assert.match(main, /processor: "在本机完成"/);
  assert.match(main, /processor: "远程创意处理"/);
  assert.match(main, /已核对文件格式、尺寸与像素；请比较确认画面内容/);
  assert.match(main, /已核对结果文件与本次任务；图片内容仍需要你比较确认/);
  assert.match(main, /backgroundRemovalProviderName/);
  assert.doesNotMatch(main, /processor: `\$\{finished\.result\.model/);
  assert.doesNotMatch(main, /processor: `\$\{providerSandbox[^\n]*provider\?\.id/);
  assert.doesNotMatch(main, /图片分析没有完成|已取消图片分析/);
});

test("editor usability states retain keyboard focus, mobile stacking and reduced-motion fallbacks", () => {
  assert.match(styles, /editor-preview-frame:focus-visible/);
  assert.match(styles, /editor-preview-image \{ position: absolute; left: 50%; top: 50%/);
  assert.match(styles, /data-crop-enabled="true"/);
  assert.match(styles, /editor-crop-box/);
  assert.match(styles, /object-fit: fill/);
  assert.match(styles, /@media \(max-width: 980px\)[\s\S]*settings-card \{ position: static/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*editor-preview-meta/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.choice-row label:has\(input:focus-visible\)/);
  assert.match(styles, /\.crop-resize-handle \{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;/);
  assert.match(styles, /\.crop-resize-handle::after/);
});

test("visible output copy distinguishes downloadable files from content quality", () => {
  assert.match(html, /文件可下载/);
  assert.doesNotMatch(html, /已通过结果检查/);
  assert.match(localProcessing, /未执行内容质量检查/);
  assert.match(main, /请比较确认画面内容|图片内容仍需要你比较确认|边缘细节仍需要你比较确认/);
  assert.match(resultDownload, /内容质量检查尚未实现/);
  assert.match(html, /id="compare-source-panel"[^>]*role="tabpanel"[^>]*data-layer="source"/);
  assert.match(html, /id="compare-result-panel"[^>]*role="tabpanel"[^>]*data-layer="result"/);
  assert.doesNotMatch(html, /id="result-image"/);
  assert.match(html, /id="compare-source-tab"[^>]*aria-controls="compare-source-panel"/);
  assert.match(html, /id="compare-split-tab"[^>]*data-layer="split"[^>]*aria-controls="compare-source-panel compare-result-panel"/);
  assert.match(html, /id="compare-result-tab"[^>]*aria-controls="compare-result-panel"/);
  assert.match(html, /id="result-stage"/);
  assert.match(html, />完整原图<.*>并排对比<.*>处理说明<.*>处理结果</s);
  assert.match(styles, /\.result-image-panel \{[^}]*min-width: 0;[^}]*min-height: 0;[^}]*place-items: center;[^}]*overflow: hidden;/);
  assert.match(styles, /\.result-image-panel > img \{[^}]*width: auto;[^}]*height: auto;[^}]*max-width: 100%;[^}]*max-height: 100%;[^}]*object-fit: contain;[^}]*object-position: center;/);
  assert.doesNotMatch(styles, /\.result-image-panel > img \{[^}]*object-fit: cover/);
  assert.match(styles, /\.source-caption \{[^}]*position: static;[^}]*border-top:/);
  assert.match(styles, /\.source-preview > img \{[^}]*object-fit: contain;[^}]*background-image:/);
  assert.match(styles, /\.result-stage \{[^}]*background-color: #d8ddd8;[^}]*background-image:/);
  assert.match(styles, /\.result-stage\.is-split \{[^}]*grid-template-columns: repeat\(2/);
  assert.match(styles, /\.result-section\.has-mask-tools \{[^}]*grid-template-columns:[^}]*grid-template-areas:/);
  assert.match(styles, /\.result-section\.has-mask-tools \.mask-correction-workspace \{[^}]*position: sticky/);
  assert.match(styles, /@media \(max-width: 980px\)[\s\S]*grid-template-areas: "heading" "tabs" "stage" "qa" "tools" "record"/);
  assert.match(html, /完整显示的原图/);
  assert.match(html, /完整显示的处理结果/);
  assert.match(main, /function selectComparisonLayer/);
  assert.match(main, /function syncComparisonStage/);
  assert.match(main, /comparisonLayerState/);
  assert.match(main, /并排对比 · 原图/);
  assert.match(main, /classList\.toggle\("has-mask-tools", showMaskTools\)/);
  assert.match(main, /matchMedia\("\(min-width: 981px\)"\)\.matches/);
  assert.match(main, /getBoundingClientRect\(\)\.width \+ 24/);
  assert.match(main, /resultInteractive = !viewAutomatic && selectedComparisonLayer === "result"/);
  assert.match(main, /session\.view !== "corrected" \|\| selectedComparisonLayer !== "result"/);
  assert.match(main, /完整原图 \$\{dimensions\.width\} × \$\{dimensions\.height\}/);
  assert.match(main, /"抠图结果"/);
  assert.match(main, /"编辑结果"/);
  assert.match(main, /fitComparisonStage/);
  assert.match(main, /ArrowRight/);
  assert.match(main, /event\.key === "Home"/);
});

test("local editor workspace exposes preview, history and strict-render controls without claiming cutout", () => {
  for (const id of [
    "editor-workspace",
    "editor-preview-frame",
    "editor-preview-image",
    "editor-crop-box",
    "editor-crop-resize",
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
  assert.match(html, /完整图片预览/);
  assert.match(html, /亮框会标出导出区域/);
  assert.match(main, /自由裁剪/);
  assert.match(main, /name="cropLeft"/);
  assert.match(main, /name="cropTop"/);
  assert.match(main, /name="cropWidth"/);
  assert.match(main, /name="cropHeight"/);
  assert.match(main, /name="cropX"/);
  assert.match(main, /name="cropY"/);
  assert.match(main, /data-crop-axis-control="horizontal"/);
  assert.match(main, /data-crop-axis-control="vertical"/);
  assert.match(main, /左右拖动亮框/);
  assert.match(main, /上下拖动亮框/);
  assert.match(main, /tabIndex = presentation\.cropEnabled \? 0 : -1/);
  assert.match(main, /导出分辨率/);
  assert.match(main, /预计实际导出/);
  assert.match(main, /预计实际导出 \$\{presentation\.output/);
  assert.match(main, /name="outputLongEdge"/);
  assert.match(main, /最长边上限/);
  assert.match(main, /导出分辨率上限，不是强制尺寸，也不改变裁剪构图/);
  assert.match(main, /裁剪区域本来较小时不会放大，所以结果可能不变/);
  assert.match(main, /透明区域填充色/);
  assert.match(main, /普通不透明照片不会变化；这不是抠图或换背景/);
  assert.match(main, /JPEG（透明像素需要填色）/);
  assert.doesNotMatch(main, /name="outputWidth"/);
  assert.doesNotMatch(main, /name="outputHeight"/);
  assert.match(main, /生成下载文件/);
  assert.match(main, /全部在本机完成/);
  assert.match(main, /createEditorWorkspace/);
  assert.match(main, /moveEditorCrop/);
  assert.match(main, /editor-output-validation-v1/);
  assert.match(main, /revokeIfBlob\(processed\.url\)/);
  assert.doesNotMatch(main, /processFaithful\(\{ sourceUrl/);
});

test("remote cutout stays explicit, informed, and disabled by default", () => {
  assert.match(main, /服务方：\$\{providerLabel\}/);
  assert.match(main, /只发送当前这张图片的 bytes/);
  assert.match(main, /可能按次计费/);
  assert.match(main, /当前是免费沙盒测试：结果会带水印/);
  assert.match(main, /沙盒抠图完成（带水印）/);
  assert.match(main, /name="remoteConsent"/);
  assert.match(main, /失败不会覆盖原图，也不会自动重复提交/);
  assert.match(main, /再次抠图前，请重新确认本次远程发送/);
  assert.match(main, /remoteConsent\.checked = false/);
  assert.match(main, /\? "重新抠图"/);
  assert.match(main, /\? "继续调整"/);
  assert.match(recoveryPresentation, /\? "返回并重新确认"/);
  assert.match(html, /id="fallback-editor-button"[^>]*>改用本地编辑</);
  assert.match(main, /switchToLocalEditor/);
  assert.match(main, /已保留当前图片；本地编辑不会上传/);
  assert.match(main, /returnToCutoutSettings\("再次抠图前/);
  assert.match(main, /applyRecoveryPresentation/);
  assert.match(recoveryPresentation, /focusTarget: unknown \? "recover" : cutoutFailure \? "fallback"/);
  assert.match(html, /返回任务列表/);
  assert.match(html, /本次远程处理记录/);
  assert.match(html, /清除本地处理记录/);
  assert.match(html, /不代表远程供应商已经删除其处理数据/);
  assert.match(main, /deleteBackgroundRemovalRecord/);
  assert.match(main, /未向远程供应商发送删除请求/);
  assert.match(server, /local-memory-run-record/);
  assert.match(backgroundRemovalRuntime, /background_removal_record_not_terminal/);
  assert.match(server, /PHOTOROOM_ENABLED === "true"/);
  assert.match(server, /photoroomEnabled && env\.PHOTOROOM_API_KEY/);
  assert.match(envExample, /PHOTOROOM_API_KEY=\s*\r?\nPHOTOROOM_ENABLED=false/);
  const scripts = JSON.parse(packageJson).scripts;
  assert.match(scripts.start, /--env-file-if-exists=\.env/);
  assert.match(scripts.dev, /--env-file-if-exists=\.env/);
});

test("remote cutout result exposes non-destructive mask correction and accessible inspection states", () => {
  for (const id of [
    "mask-correction-workspace",
    "mask-correction-canvas",
    "mask-erase-button",
    "mask-keep-button",
    "mask-brush-size",
    "mask-undo-button",
    "mask-redo-button",
    "mask-reset-button",
    "mask-correction-status",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /修改只作用于透明蒙版，不覆盖原图，也不会再次调用远程服务/);
  assert.match(html, /棋盘格/);
  assert.match(html, /白色/);
  assert.match(html, /黑色/);
  assert.match(html, /彩色/);
  assert.match(html, /id="mask-custom-background"[^>]*type="color"/);
  assert.match(html, /自定义背景会写入 JPEG/);
  assert.match(html, /方向键移动画笔/);
  assert.match(html, /棋盘格下载透明 PNG；白 \/ 黑 \/ 彩色 \/ 自定义背景会写入 JPEG/);
  assert.match(html, /data-mask-zoom="1"/);
  assert.match(html, /data-mask-zoom="2"/);
  assert.match(html, /data-mask-zoom="4"/);
  assert.match(html, /只改变查看倍率，不改变导出尺寸/);
  assert.match(html, /data-mask-view="automatic"/);
  assert.match(html, /data-mask-view="corrected"/);
  assert.match(html, /下载始终使用修正后版本/);
  assert.match(html, /最终下载内容/);
  assert.match(html, /id="mask-output-version"/);
  assert.match(html, /id="mask-output-background"/);
  assert.match(html, /id="mask-output-file"/);
  assert.match(main, /maskOutputPresentation/);
  assert.match(main, /initializeMaskCorrection/);
  assert.match(main, /exportMaskCorrection/);
  assert.match(main, /verifyPixelRoundTrip/);
  assert.match(maskOutputPresentation, /下载修正 PNG/);
  assert.match(maskOutputPresentation, /下载.*底.*JPEG/);
  assert.match(maskOutputPresentation, /下载自定义底 JPEG/);
  assert.match(main, /正在校验下载…/);
  assert.match(main, /下载前校验未通过，已阻止错误文件下载/);
  assert.match(main, /下载已开始/);
  assert.match(main, /composeSolidBackgroundPixels/);
  assert.match(main, /correctionZoomDimensions/);
  assert.match(main, /correctionViewMask/);
  assert.match(main, /正在查看未修正的自动结果/);
  assert.match(main, /当前修正已没有透明背景/);
  assert.match(main, /当前修正已把主体全部擦除/);
  assert.match(styles, /mask-correction-controls/);
  assert.match(styles, /\.result-image-panel > canvas/);
  assert.match(styles, /data-preview-background="black"/);
  assert.match(styles, /is-mask-zoomed/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*mask-tool-group/);
});
