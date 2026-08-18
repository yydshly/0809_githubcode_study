import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("upload specification combines local geometry, JPEG and target-size verification in one journey", async () => {
  const [catalog, main, styles, download, index] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("web/result-download.js", root), "utf8"),
    readFile(new URL("web/index.html", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-UPLOAD"[\s\S]*local-upload-specification-v1/);
  assert.match(main, /图片内容怎么保留[\s\S]*name="uploadContentMode"[\s\S]*name="uploadRatio"[\s\S]*name="uploadLongEdge"[\s\S]*name="uploadTargetKilobytes"/);
  assert.match(main, /name="uploadTargetKilobytes"[^>]*step="1"[^>]*value="1024"/);
  assert.match(main, /runUploadSpecification[\s\S]*composeCanvasFitResult[\s\S]*compressImageToTarget/);
  assert.match(main, /fitted\.byteLength <= targetBytes[\s\S]*compressionDecision/);
  assert.match(main, /上传规格全部达标[\s\S]*文件上限未达标/);
  assert.match(styles, /\.upload-plan/);
  assert.match(main, /UPLOAD_SPECIFICATION_PRESETS[\s\S]*data-upload-preset[\s\S]*uploadComplianceReport/);
  assert.match(index, /id="upload-compliance-card"[\s\S]*逐项核对处理结果/);
  assert.match(styles, /\.upload-presets[\s\S]*\.upload-compliance-list/);
  assert.match(download, /"UT-UPLOAD"[\s\S]*upload-ready-image[\s\S]*image\/jpeg/);
});
