import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("document archive combines manual rectification, document enhancement, JPEG and attachment limit", async () => {
  const [catalog, main, download] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/result-download.js", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-DOC-ARCHIVE"[\s\S]*local-document-archive-v1/);
  assert.match(main, /isRectificationTask[\s\S]*UT-DOC-ARCHIVE/);
  assert.match(main, /name="archiveTargetKilobytes"[\s\S]*runDocumentArchive[\s\S]*compressImageToTarget/);
  assert.match(main, /name=\"archiveTargetKilobytes\"[^>]*step=\"1\"[^>]*value=\"1024\"/);
  assert.match(main, /prepared\.byteLength <= targetBytes[\s\S]*compressionDecision/);
  assert.match(main, /UT-DOC-ARCHIVE" \? "clean-color" : "original"/);
  assert.match(main, /文档归档附件已达标[\s\S]*附件上限未达标/);
  assert.match(download, /"UT-DOC-ARCHIVE"[\s\S]*document-archive[\s\S]*image\/jpeg/);
});
