const PRESETS = Object.freeze([
  Object.freeze({ id: "social-square", label: "方形分享", description: "1:1 · 最长边 1080 px", ratio: "square", outputLongEdge: 1080 }),
  Object.freeze({ id: "social-portrait", label: "竖版分享", description: "4:5 · 最长边 1350 px", ratio: "portrait", outputLongEdge: 1350 }),
  Object.freeze({ id: "wide-cover", label: "横版封面", description: "16:9 · 最长边 1920 px", ratio: "wide", outputLongEdge: 1920 }),
  Object.freeze({ id: "story", label: "竖屏故事", description: "9:16 · 最长边 1920 px", ratio: "story", outputLongEdge: 1920 }),
  Object.freeze({ id: "catalog-square", label: "商品方图", description: "1:1 · 最长边 1600 px", ratio: "square", outputLongEdge: 1600 }),
]);

export const SCENE_TEMPLATE_PRESETS = PRESETS;

export function sceneTemplateById(templateId) {
  const template = PRESETS.find((candidate) => candidate.id === templateId);
  if (!template) throw new RangeError("不支持的场景尺寸模板");
  return template;
}

export function applySceneTemplate(settings = {}, templateId = "social-square") {
  const template = sceneTemplateById(templateId);
  return Object.freeze({
    ...settings,
    ratio: template.ratio,
    sizeMode: "custom",
    outputLongEdge: template.outputLongEdge,
  });
}

export function matchSceneTemplate(settings = {}) {
  const match = PRESETS.find((template) => settings.ratio === template.ratio
    && settings.sizeMode === "custom"
    && Number(settings.outputLongEdge) === template.outputLongEdge);
  return match?.id ?? null;
}
