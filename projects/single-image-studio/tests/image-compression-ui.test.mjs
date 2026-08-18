import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("image compression is a target-size journey, not a copy of the old 9:16 tool", async () => {
  const [catalog, main, resultPresentation, styles, contract, download, index] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/result-presentation.js", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("IMAGE_COMPRESSION.md", root), "utf8"),
    readFile(new URL("web/result-download.js", root), "utf8"),
    readFile(new URL("web/index.html", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-COMPRESS"[\s\S]*图片太大无法上传或发送[\s\S]*local-image-compression-v1/);
  assert.match(main, /需要满足多大的文件限制[\s\S]*name="compressionTargetKilobytes"/);
  assert.match(main, /name="compressionTargetKilobytes"[^>]*step="1"/);
  assert.match(main, /name="outputLongEdge"[\s\S]*默认取当前原图最长边/);
  assert.match(main, /不裁切、不拉伸、不强制改成 9:16/);
  assert.match(main, /透明 PNG \/ WebP 的透明区域会填充为白色/);
  assert.match(main, /compressImageToTarget\([\s\S]*targetKilobytes:[\s\S]*maxLongEdge:/);
  assert.match(main, /原图[\s\S]*已经满足[\s\S]*无需降低画质/);
  assert.match(main, /图片已压缩并达到目标[\s\S]*图片已压缩，但未达到目标/);
  assert.match(resultPresentation, /"UT-COMPRESS": "调整压缩设置"[\s\S]*taskId === "UT-COMPRESS" \? "下载压缩图"/);
  assert.match(main, /compressionTargetPressure[\s\S]*体积要求[\s\S]*画质损失/);
  assert.match(main, /compressionImpactReport[\s\S]*pixelRetentionPercent[\s\S]*qualityPercent/);
  assert.match(index, /id="compression-impact-card"[\s\S]*体积压缩比例不等于画质损失比例[\s\S]*并排对比/);
  assert.match(styles, /\.compression-presets[\s\S]*\.compression-baseline[\s\S]*\.compression-impact-card/);
  assert.match(download, /"UT-COMPRESS"[\s\S]*prefix: "compressed-image"[\s\S]*mimeTypes: Object\.freeze\(\["image\/jpeg"\]\)/);
  assert.match(contract, /设置接收方允许的目标大小/);
  assert.match(contract, /未达标必须明确显示/);
});
