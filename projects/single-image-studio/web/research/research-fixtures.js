export const CATALOG_SCHEMA_VERSION = "review-catalog.v0";

export const ASSET_KEYS = Object.freeze([
  "source",
  "alpha",
  "foreground",
  "compositeBlack",
  "compositeWhite",
  "compositeSaturated",
]);

export const ASSET_LABELS = Object.freeze({
  source: "来源",
  alpha: "Alpha",
  foreground: "前景",
  compositeBlack: "黑底",
  compositeWhite: "白底",
  compositeSaturated: "彩底",
});

export const DEFECT_TAXONOMY_VERSION = "single-image-defect-taxonomy.v0";

export const DEFECT_TAXONOMY = Object.freeze([
  Object.freeze({
    id: "subject-integrity",
    label: "主体完整性",
    defects: Object.freeze([
      Object.freeze({ id: "subject-missing", label: "主体缺失" }),
      Object.freeze({ id: "over-removed", label: "误删" }),
      Object.freeze({ id: "holes", label: "孔洞" }),
      Object.freeze({ id: "detail-hair-loss", label: "细节 / 发丝丢失" }),
      Object.freeze({ id: "non-subject-residue", label: "非主体残留" }),
    ]),
  }),
  Object.freeze({
    id: "edge-alpha",
    label: "边缘与 Alpha",
    defects: Object.freeze([
      Object.freeze({ id: "jagged-edge", label: "锯齿" }),
      Object.freeze({ id: "fringe", label: "毛边" }),
      Object.freeze({ id: "halo", label: "光晕" }),
      Object.freeze({ id: "color-spill", label: "色边 / 溢色" }),
      Object.freeze({ id: "translucency-error", label: "半透明错误" }),
      Object.freeze({ id: "hard-edge", label: "硬边" }),
      Object.freeze({ id: "internal-alpha-error", label: "内部透明度错误" }),
    ]),
  }),
  Object.freeze({
    id: "composite",
    label: "合成",
    defects: Object.freeze([
      Object.freeze({ id: "background-residue", label: "背景残留" }),
      Object.freeze({ id: "edge-mismatch", label: "边缘不协调" }),
      Object.freeze({ id: "background-color-contamination", label: "底色污染" }),
      Object.freeze({ id: "position-scale-error", label: "位置 / 尺度错误" }),
      Object.freeze({ id: "export-alpha-error", label: "导出 Alpha 错误" }),
    ]),
  }),
  Object.freeze({
    id: "natural-enhance",
    label: "自然增强",
    defects: Object.freeze([
      Object.freeze({ id: "over-sharpened", label: "过度锐化" }),
      Object.freeze({ id: "color-cast", label: "色偏" }),
      Object.freeze({ id: "noise-amplification", label: "噪声放大" }),
      Object.freeze({ id: "identity-shift", label: "肤色 / 身份变化" }),
      Object.freeze({ id: "crop-damage", label: "裁切误伤" }),
      Object.freeze({ id: "no-effective-improvement", label: "无有效改善" }),
    ]),
  }),
  Object.freeze({
    id: "creative-edit",
    label: "创意编辑",
    defects: Object.freeze([
      Object.freeze({ id: "subject-drift", label: "主体 / 身份漂移" }),
      Object.freeze({ id: "structural-damage", label: "结构破坏" }),
      Object.freeze({ id: "reference-leakage", label: "参考泄漏" }),
      Object.freeze({ id: "fabricated-text-watermark", label: "虚构文字 / 水印" }),
      Object.freeze({ id: "must-keep-broken", label: "must-keep 破坏" }),
    ]),
  }),
  Object.freeze({
    id: "system",
    label: "系统问题",
    defects: Object.freeze([
      Object.freeze({ id: "candidate-mismatch", label: "候选错绑" }),
      Object.freeze({ id: "layer-misalignment", label: "图层错位" }),
      Object.freeze({ id: "asset-load-failure", label: "图片加载失败" }),
      Object.freeze({ id: "stale-response", label: "过期响应" }),
      Object.freeze({ id: "version-mismatch", label: "指标 / 图像版本不一致" }),
    ]),
  }),
]);

const DEFECT_IDS = new Set(
  DEFECT_TAXONOMY.flatMap((category) => category.defects.map((defect) => defect.id)),
);

export const REVIEW_SEVERITIES = Object.freeze(["none", "minor", "major", "critical"]);
export const REVIEW_CONCLUSIONS = Object.freeze(["usable", "usable-with-caveat", "reject"]);

export class FixtureCatalogError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = "FixtureCatalogError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, message) {
  throw new FixtureCatalogError(code, path, message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value, path) {
  if (!isRecord(value)) fail("invalid_type", path, `${path} 必须是对象`);
  return value;
}

function requireArray(value, path) {
  if (!Array.isArray(value)) fail("invalid_type", path, `${path} 必须是数组`);
  return value;
}

function requireField(record, key, path) {
  if (!Object.hasOwn(record, key)) {
    fail("missing_field", `${path}.${key}`, `目录缺少必需字段 ${path}.${key}`);
  }
  return record[key];
}

function requireString(value, path, { maxLength = 2_000 } = {}) {
  if (typeof value !== "string") fail("invalid_type", path, `${path} 必须是字符串`);
  const normalized = value.trim();
  if (!normalized) fail("invalid_value", path, `${path} 不能为空`);
  if (normalized.length > maxLength) {
    fail("invalid_value", path, `${path} 超出长度上限`);
  }
  return normalized;
}

function requireLiteral(value, expected, path) {
  if (value !== expected) {
    fail("unsupported_value", path, `${path} 必须是 ${JSON.stringify(expected)}`);
  }
  return value;
}

function normalizeEvidenceStatus(value, path) {
  const record = requireRecord(value, path);
  return Object.freeze({
    level: requireLiteral(requireField(record, "level", path), "C1=0", `${path}.level`),
    purpose: requireLiteral(
      requireField(record, "purpose", path),
      "method-rehearsal",
      `${path}.purpose`,
    ),
  });
}

function normalizeAssetUrl(value, path, fixtureId) {
  const url = requireString(value, path, { maxLength: 1_024 });
  const escapedFixtureId = fixtureId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expected = new RegExp(
    `^/research-assets/dev/calibration/MATTE-GT/${escapedFixtureId}/[A-Za-z0-9._-]+\\.png$`,
  );
  if (!expected.test(url)) {
    fail(
      "unsafe_asset_url",
      path,
      `${path} 必须指向当前 fixture 的冻结同源 PNG 路径`,
    );
  }
  return url;
}

function normalizeFacts(value, path) {
  const record = requireRecord(value, path);
  const edgeType = requireString(requireField(record, "edgeType", path), `${path}.edgeType`);
  if (!new Set(["hard", "hole", "soft"]).has(edgeType)) {
    fail("unsupported_value", `${path}.edgeType`, `${path}.edgeType 不是冻结枚举值`);
  }
  return Object.freeze({
    category: requireString(requireField(record, "category", path), `${path}.category`),
    edgeType,
    expectedUse: requireString(
      requireField(record, "expectedUse", path),
      `${path}.expectedUse`,
      { maxLength: 4_000 },
    ),
  });
}

function normalizeFixture(value, index, assetAllowlist) {
  const path = `fixtures[${index}]`;
  const record = requireRecord(value, path);
  const id = requireString(requireField(record, "id", path), `${path}.id`, { maxLength: 128 });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
    fail("invalid_value", `${path}.id`, `${path}.id 不是安全 ID`);
  }

  const suite = requireLiteral(requireField(record, "suite", path), "MATTE-GT", `${path}.suite`);
  const partition = requireLiteral(
    requireField(record, "partition", path),
    "dev/calibration",
    `${path}.partition`,
  );
  const visibility = requireLiteral(
    requireField(record, "visibility", path),
    "public-synthetic",
    `${path}.visibility`,
  );
  const assetsRecord = requireRecord(requireField(record, "assets", path), `${path}.assets`);
  const assets = {};
  for (const key of ASSET_KEYS) {
    const assetPath = `${path}.assets.${key}`;
    const url = normalizeAssetUrl(requireField(assetsRecord, key, `${path}.assets`), assetPath, id);
    if (!assetAllowlist.has(url)) {
      fail("asset_not_allowed", assetPath, `${assetPath} 不在目录 assetAllowlist 中`);
    }
    assets[key] = url;
  }

  return Object.freeze({
    id,
    label: requireString(requireField(record, "label", path), `${path}.label`),
    suite,
    partition,
    sourceRevision: requireString(
      requireField(record, "sourceRevision", path),
      `${path}.sourceRevision`,
      { maxLength: 256 },
    ),
    candidateAlias: requireString(
      requireField(record, "candidateAlias", path),
      `${path}.candidateAlias`,
      { maxLength: 128 },
    ),
    methodLabel: requireString(
      requireField(record, "methodLabel", path),
      `${path}.methodLabel`,
      { maxLength: 512 },
    ),
    methodDetails: requireString(
      requireField(record, "methodDetails", path),
      `${path}.methodDetails`,
      { maxLength: 4_000 },
    ),
    rightsRecordId: requireString(
      requireField(record, "rightsRecordId", path),
      `${path}.rightsRecordId`,
      { maxLength: 256 },
    ),
    visibility,
    evidenceStatus: normalizeEvidenceStatus(
      requireField(record, "evidenceStatus", path),
      `${path}.evidenceStatus`,
    ),
    assets: Object.freeze(assets),
    facts: normalizeFacts(requireField(record, "facts", path), `${path}.facts`),
  });
}

export function parseFixtureCatalog(value) {
  const record = requireRecord(value, "catalog");
  const schemaVersion = requireLiteral(
    requireField(record, "schemaVersion", "catalog"),
    CATALOG_SCHEMA_VERSION,
    "catalog.schemaVersion",
  );
  const evidenceStatus = normalizeEvidenceStatus(
    requireField(record, "evidenceStatus", "catalog"),
    "catalog.evidenceStatus",
  );

  const visibilityPolicyRecord = requireRecord(
    requireField(record, "visibilityPolicy", "catalog"),
    "catalog.visibilityPolicy",
  );
  const allowed = requireArray(
    requireField(visibilityPolicyRecord, "allowed", "catalog.visibilityPolicy"),
    "catalog.visibilityPolicy.allowed",
  );
  if (allowed.length !== 1 || allowed[0] !== "public-synthetic") {
    fail(
      "unsupported_visibility",
      "catalog.visibilityPolicy.allowed",
      "研究 UI 只接受 public-synthetic 夹具",
    );
  }

  const allowlistValues = requireArray(
    requireField(record, "assetAllowlist", "catalog"),
    "catalog.assetAllowlist",
  ).map((item, index) => requireString(item, `catalog.assetAllowlist[${index}]`, {
    maxLength: 1_024,
  }));
  const assetAllowlist = new Set(allowlistValues);
  if (assetAllowlist.size !== allowlistValues.length) {
    fail("duplicate_value", "catalog.assetAllowlist", "assetAllowlist 不能包含重复 URL");
  }

  const fixtures = requireArray(requireField(record, "fixtures", "catalog"), "catalog.fixtures")
    .map((fixture, index) => normalizeFixture(fixture, index, assetAllowlist));

  const ids = new Set();
  const aliases = new Set();
  for (const [index, fixture] of fixtures.entries()) {
    if (ids.has(fixture.id)) {
      fail("duplicate_value", `fixtures[${index}].id`, `fixture id ${fixture.id} 重复`);
    }
    if (aliases.has(fixture.candidateAlias)) {
      fail(
        "duplicate_value",
        `fixtures[${index}].candidateAlias`,
        `候选匿名编号 ${fixture.candidateAlias} 重复`,
      );
    }
    ids.add(fixture.id);
    aliases.add(fixture.candidateAlias);
  }

  const generatedAt = requireString(
    requireField(record, "generatedAt", "catalog"),
    "catalog.generatedAt",
    { maxLength: 64 },
  );
  if (!Number.isFinite(Date.parse(generatedAt))) {
    fail("invalid_value", "catalog.generatedAt", "catalog.generatedAt 必须是 ISO 日期时间");
  }

  return Object.freeze({
    schemaVersion,
    catalogId: requireString(requireField(record, "catalogId", "catalog"), "catalog.catalogId"),
    catalogVersion: requireString(
      requireField(record, "catalogVersion", "catalog"),
      "catalog.catalogVersion",
    ),
    generatedAt,
    evidenceStatus,
    visibilityPolicy: Object.freeze({ allowed: Object.freeze([...allowed]) }),
    assetAllowlist: Object.freeze([...assetAllowlist]),
    fixtures: Object.freeze(fixtures),
  });
}

export function emptyReviewDraft(fixtureId) {
  return {
    fixtureId,
    defects: [],
    severity: "",
    conclusion: "",
    notes: "",
  };
}

export function makeBlindFixturePresentation(fixture) {
  if (!fixture || typeof fixture !== "object") {
    throw new TypeError("fixture 必须是已校验的对象");
  }
  return Object.freeze({
    candidateAlias: fixture.candidateAlias,
    suitePartition: `${fixture.suite} / ${fixture.partition}`,
    evidenceLevel: fixture.evidenceStatus.level,
  });
}

export function validateReviewDraft(value, expectedFixtureId) {
  const errors = [];
  if (!isRecord(value)) return { valid: false, errors: ["评审草稿无效"] };
  if (value.fixtureId !== expectedFixtureId) errors.push("评审与当前 fixture 不匹配");
  if (!Array.isArray(value.defects)) {
    errors.push("缺陷选择无效");
  } else {
    const unique = new Set(value.defects);
    if (unique.size !== value.defects.length || value.defects.some((id) => !DEFECT_IDS.has(id))) {
      errors.push("缺陷选择包含未知或重复项");
    }
  }
  if (!REVIEW_SEVERITIES.includes(value.severity)) errors.push("请选择严重度");
  if (!REVIEW_CONCLUSIONS.includes(value.conclusion)) errors.push("请选择结论");
  if (typeof value.notes !== "string" || value.notes.length > 1_200) {
    errors.push("备注不能超过 1200 个字符");
  }
  if (Array.isArray(value.defects)) {
    if (value.defects.length > 0 && value.severity === "none") {
      errors.push("已标记缺陷时，严重度不能选择“无”");
    }
    if (value.defects.length === 0 && REVIEW_SEVERITIES.includes(value.severity)
      && value.severity !== "none") {
      errors.push("严重度不为“无”时，至少选择一个结构化缺陷");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function lockReviewDraft(value, expectedFixtureId) {
  const validation = validateReviewDraft(value, expectedFixtureId);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join("；"));
  }
  return Object.freeze({
    fixtureId: value.fixtureId,
    defects: Object.freeze([...value.defects]),
    severity: value.severity,
    conclusion: value.conclusion,
    notes: value.notes,
  });
}
