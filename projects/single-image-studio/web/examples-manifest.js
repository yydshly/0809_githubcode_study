export const EXAMPLE_ORIGINS = Object.freeze({
  PROJECT_ORIGINAL_AI: "project-original-ai",
  PRODUCT_RUNTIME: "product-runtime",
  DETERMINISTIC_PROJECT_OUTPUT: "deterministic-project-output",
  CODEX_REFERENCE: "codex-reference",
});

export const EXAMPLE_RESULT_KINDS = Object.freeze({
  RUNTIME_LOCAL: "runtime-local",
  STATIC_ASSET: "static-asset",
});

const TOP_LEVEL_KEYS = Object.freeze([
  "id", "taskId", "filter", "title", "summary", "source", "result", "processing", "parameters", "limits", "entryHref",
]);
const ASSET_KEYS = Object.freeze(["path", "label", "origin", "width", "height", "byteLength", "sha256"]);
const RESULT_KEYS = Object.freeze(["kind", ...ASSET_KEYS]);
const PROCESSING_KEYS = Object.freeze(["location", "runtimeGenerator", "provider", "truthfulLabel"]);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}必须是对象`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label}字段不完整或包含未知字段`);
  }
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label}必须是非空字符串`);
  return value;
}

function optionalText(value, label) {
  return value === null ? null : text(value, label);
}

function integer(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label}必须是正整数`);
  return value;
}

function hash(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new TypeError(`${label}必须是 SHA-256`);
  return value;
}

function path(value, label) {
  const normalized = text(value, label);
  if (!/^\.\/demo-assets\/[a-z0-9_./-]+\.png$/.test(normalized) || normalized.includes("..")) {
    throw new TypeError(`${label}必须指向登记的 demo-assets PNG`);
  }
  return normalized;
}

function stringList(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${label}必须是非空数组`);
  const items = value.map((item) => text(item, label));
  if (new Set(items).size !== items.length) throw new TypeError(`${label}不能重复`);
  return Object.freeze(items);
}

function asset(value, label) {
  exactKeys(value, ASSET_KEYS, label);
  return Object.freeze({
    path: path(value.path, `${label}.path`),
    label: text(value.label, `${label}.label`),
    origin: text(value.origin, `${label}.origin`),
    width: integer(value.width, `${label}.width`),
    height: integer(value.height, `${label}.height`),
    byteLength: integer(value.byteLength, `${label}.byteLength`),
    sha256: hash(value.sha256, `${label}.sha256`),
  });
}

function result(value) {
  exactKeys(value, RESULT_KEYS, "result");
  if (!Object.values(EXAMPLE_RESULT_KINDS).includes(value.kind)) throw new TypeError("result.kind 无效");
  if (value.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL) {
    for (const field of ["path", "width", "height", "byteLength", "sha256"]) {
      if (value[field] !== null) throw new TypeError(`runtime result.${field} 必须为 null`);
    }
    return Object.freeze({
      kind: value.kind,
      path: null,
      label: text(value.label, "result.label"),
      origin: text(value.origin, "result.origin"),
      width: null,
      height: null,
      byteLength: null,
      sha256: null,
    });
  }
  const staticAsset = asset(Object.fromEntries(ASSET_KEYS.map((key) => [key, value[key]])), "result");
  return Object.freeze({ kind: value.kind, ...staticAsset });
}

function processing(value) {
  exactKeys(value, PROCESSING_KEYS, "processing");
  if (!new Set(["local", "reference"]).has(value.location)) throw new TypeError("processing.location 无效");
  return Object.freeze({
    location: value.location,
    runtimeGenerator: optionalText(value.runtimeGenerator, "processing.runtimeGenerator"),
    provider: optionalText(value.provider, "processing.provider"),
    truthfulLabel: text(value.truthfulLabel, "processing.truthfulLabel"),
  });
}

export function defineExample(input) {
  exactKeys(input, TOP_LEVEL_KEYS, "example");
  if (!new Set(["local", "reference"]).has(input.filter)) throw new TypeError("example.filter 无效");
  if (!/^\.\/\?from=examples$/.test(input.entryHref)) throw new TypeError("example.entryHref 无效");
  const entry = Object.freeze({
    id: text(input.id, "example.id"),
    taskId: text(input.taskId, "example.taskId"),
    filter: input.filter,
    title: text(input.title, "example.title"),
    summary: text(input.summary, "example.summary"),
    source: asset(input.source, "source"),
    result: result(input.result),
    processing: processing(input.processing),
    parameters: stringList(input.parameters, "example.parameters"),
    limits: stringList(input.limits, "example.limits"),
    entryHref: input.entryHref,
  });
  if (entry.result.kind === EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL && entry.processing.location !== "local") {
    throw new TypeError("runtime-local 必须在本地处理");
  }
  return entry;
}

const oldPhotoSource = Object.freeze({
  path: "./demo-assets/old-photo-demo-v1.png", label: "项目原创虚构老照片", origin: EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI,
  width: 1448, height: 1086, byteLength: 2482568, sha256: "f14e3d5d4d503c8a6fa4a825b947ca22d4b68e9e8bc07d2b25ce6603f585621b",
});

const documentSource = Object.freeze({
  path: "./demo-assets/document-skewed-source-v1.png", label: "项目原创斜拍虚构文档", origin: EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI,
  width: 1536, height: 1024, byteLength: 2421915, sha256: "e3ddeb6d5a5e073ce951491c95293d4d0bdbbe6e398e21296ef14d05e8752004",
});

export const EXAMPLES = Object.freeze([
  defineExample({
    id: "straighten-local", taskId: "UT-TUNE", filter: "local", title: "把倾斜画面拉回水平", summary: "同一张工作室图片以手动 -5° 校正，并由产品 renderer 即时生成结果。",
    source: { path: "./demo-assets/straighten-studio-source.png", label: "项目原创合成工作室", origin: EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI, width: 1536, height: 1024, byteLength: 2089429, sha256: "24937430feba736e83b172462473404f2547a32aafdafbe8e63afc27a935b9a1" },
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时校正结果", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "straighten-minus-5", provider: null, truthfulLabel: "产品本地 renderer 即时生成" },
    parameters: ["完整比例", "拉直 -5°", "PNG"], limits: ["需要用户手动判断角度", "不会自动识别地平线或透视"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "old-photo-local", taskId: "UT-OLD-PHOTO", filter: "local", title: "老照片基础整理，不重绘人物", summary: "使用公开的褪色提层次参数改善观看效果，保留人物、文字与历史细节的原始像素关系。",
    source: oldPhotoSource,
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时基础整理", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "old-photo-faded", provider: null, truthfulLabel: "产品本地 renderer 即时生成" },
    parameters: ["亮度 +4", "对比度 +12", "饱和度 +3", "降噪 18", "清晰度 14"], limits: ["不会去除严重划痕", "不会修脸、恢复失焦或补全内容"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "document-rectified", taskId: "UT-DOC-ARCHIVE", filter: "local", title: "把斜拍文档裁正为清晰附件", summary: "四个纸角由预先登记的项目坐标裁正，再使用清晰彩色效果生成 JPEG。",
    source: documentSource,
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时文档裁正结果", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "document-clean-color", provider: null, truthfulLabel: "四角裁正 + 清晰彩色 + JPEG" },
    parameters: ["登记四角坐标", "清晰彩色", "最长边 1600 px", "JPEG ≤ 1 MB"], limits: ["不会自动找边或 OCR", "弯曲、反光和失焦不会被修复"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "privacy-share-local", taskId: "UT-PRIVACY-SHARE", filter: "local", title: "分享前清理文件 metadata", summary: "保持完整画面，在本机生成受限 JPEG，并确认输出不含当前禁止的私密 metadata。",
    source: documentSource,
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时隐私友好分享副本", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "privacy-share-balanced", provider: null, truthfulLabel: "metadata 清理 + 1600 px + JPEG ≤ 1 MB" },
    parameters: ["保持完整比例", "最长边 1600 px", "JPEG", "目标 ≤ 1 MB", "白色透明底"], limits: ["不会识别人脸、地址、车牌或文字", "文件信息清理不等于画面匿名"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "upload-strict", taskId: "UT-UPLOAD", filter: "local", title: "生成符合严格表单的上传 JPEG", summary: "完整保留文档画面，限制最长边 1200 px 和文件 1 MB，并重新核对真实输出。",
    source: documentSource,
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时上传规格结果", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "upload-strict-1mb", provider: null, truthfulLabel: "完整保留 + 1200 px + JPEG ≤ 1 MB" },
    parameters: ["保持原图比例", "最长边 1200 px", "JPEG", "目标 ≤ 1 MB"], limits: ["不会自动裁正文档", "符合技术参数不代表网站内容审核通过"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "compression-500kb", taskId: "UT-COMPRESS", filter: "local", title: "把大图压缩到 500 KB 内", summary: "保持完整比例，优先保留像素与质量；仍过大时才按公开档位继续降低。",
    source: documentSource,
    result: { kind: EXAMPLE_RESULT_KINDS.RUNTIME_LOCAL, path: null, label: "本机即时 500 KB 压缩结果", origin: EXAMPLE_ORIGINS.PRODUCT_RUNTIME, width: null, height: null, byteLength: null, sha256: null },
    processing: { location: "local", runtimeGenerator: "compression-500kb", provider: null, truthfulLabel: "本地 JPEG 多档压缩至 ≤ 500 KB" },
    parameters: ["保持完整比例", "最长边最高 1536 px", "JPEG", "目标 ≤ 500 KB"], limits: ["压缩率不等于画质损失比例", "文字和细线仍需放大检查"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "social-grid-suitable", taskId: "UT-GRID", filter: "local", title: "适合九宫格的完整环境构图", summary: "主体跨越多个格子但重要细节避开接缝，联系图展示最终九张切片的整体关系。",
    source: { path: "./demo-assets/social-grid-demo-v1/suitable-source.png", label: "项目原创合成静物", origin: EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI, width: 1254, height: 1254, byteLength: 2153282, sha256: "246ed1737a11343f218f9d32d32f41e3ba3c4d125cc7b1135fdec717457126c4" },
    result: { kind: EXAMPLE_RESULT_KINDS.STATIC_ASSET, path: "./demo-assets/social-grid-demo-v1/suitable-tiles-contact.png", label: "确定性九格联系图", origin: EXAMPLE_ORIGINS.DETERMINISTIC_PROJECT_OUTPUT, width: 1024, height: 1024, byteLength: 2056576, sha256: "5315b49a9c550981628ce6079c966feb0489e85798dbbfbe2471949660bd1d74" },
    processing: { location: "local", runtimeGenerator: null, provider: null, truthfulLabel: "项目冻结九宫格布局生成" },
    parameters: ["方形总图", "3 × 3 等分", "从左到右、从上到下"], limits: ["上传顺序仍需按平台预览核对", "不会自动发布"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "social-grid-boundary", taskId: "UT-GRID", filter: "local", title: "不适合直接九宫格的人像", summary: "接缝穿过眼睛、嘴部和商品时，即使切片正确，单格观看也可能破坏信息。",
    source: { path: "./demo-assets/social-grid-demo-v1/unsuitable-source.png", label: "项目原创虚构成人图", origin: EXAMPLE_ORIGINS.PROJECT_ORIGINAL_AI, width: 1254, height: 1254, byteLength: 2742044, sha256: "b5d959b8cfd16befa731d71b266b505f64502da11ed5ed156f61c8470127226c" },
    result: { kind: EXAMPLE_RESULT_KINDS.STATIC_ASSET, path: "./demo-assets/social-grid-demo-v1/unsuitable-grid-overlay.png", label: "确定性接缝检查图", origin: EXAMPLE_ORIGINS.DETERMINISTIC_PROJECT_OUTPUT, width: 1200, height: 1200, byteLength: 3900734, sha256: "42274e79971cb47b6b9caa2be05eadf43f7ad0b6bf2151b41a31a79f3ec8bf94" },
    processing: { location: "local", runtimeGenerator: null, provider: null, truthfulLabel: "项目冻结接缝覆盖生成" },
    parameters: ["方形总图", "接缝覆盖", "人工观察"], limits: ["系统不会判断主体是否被切断", "需要用户先观察九条边界"], entryHref: "./?from=examples",
  }),
  defineExample({
    id: "old-photo-codex-reference", taskId: "CR-RESTORE", filter: "reference", title: "生成式老照片修复方向参考", summary: "用于理解生成式修复可能带来的清理效果，同时提醒人物、文字和历史物件可能被重绘。",
    source: oldPhotoSource,
    result: { kind: EXAMPLE_RESULT_KINDS.STATIC_ASSET, path: "./demo-assets/old-photo-codex-reference-v1.png", label: "Codex 生成视觉参考", origin: EXAMPLE_ORIGINS.CODEX_REFERENCE, width: 1448, height: 1086, byteLength: 2328052, sha256: "9c7f11a319d19e49cdae4ad39d4a4910487f46fb0bac7d2cd03cc6cbb6960737" },
    processing: { location: "reference", runtimeGenerator: null, provider: "codex-imagegen", truthfulLabel: "静态参考 · 不是产品运行结果" },
    parameters: ["克制清理划痕与褪色", "尽量保留构图关系", "人工差异检查"], limits: ["产品 Provider 尚未运行", "不证明身份、文字或历史细节保真"], entryHref: "./?from=examples",
  }),
]);

const EXAMPLE_BY_ID = new Map(EXAMPLES.map((entry) => [entry.id, entry]));

export function exampleById(exampleId) {
  return EXAMPLE_BY_ID.get(exampleId) ?? null;
}

export function examplesForFilter(filter = "all") {
  if (filter === "all") return EXAMPLES;
  if (!new Set(["local", "reference"]).has(filter)) throw new RangeError("不支持的样例筛选");
  return Object.freeze(EXAMPLES.filter((entry) => entry.filter === filter));
}
