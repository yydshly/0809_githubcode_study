export const OLD_PHOTO_RESTORATION_TASK_ID = "CR-RESTORE";

export const OLD_PHOTO_RESTORATION_STRENGTHS = Object.freeze([
  Object.freeze({
    id: "restrained",
    label: "克制修复",
    instruction: "Use restrained restoration: correct fading and low contrast, and reduce only light dust, scratches, and noise. Keep natural grain and age cues.",
  }),
  Object.freeze({
    id: "standard",
    label: "标准修复",
    instruction: "Use standard restoration: correct fading and low contrast, and reduce visible dust, scratches, and noise without making surfaces plastic or newly photographed.",
  }),
]);

export const OLD_PHOTO_RESTORATION_PRIORITIES = Object.freeze([
  Object.freeze({
    id: "identity",
    label: "人物与身份特征",
    instruction: "Give highest priority to preserving every person's facial structure, apparent age, expression, pose, hairstyle, clothing, and identity cues.",
  }),
  Object.freeze({
    id: "composition",
    label: "构图与物件关系",
    instruction: "Give highest priority to preserving the exact crop, geometry, pose, object placement, and spatial relationships.",
  }),
  Object.freeze({
    id: "tone",
    label: "年代与原始色调",
    instruction: "Give highest priority to preserving the original monochrome, sepia, or color relationships and the photograph's period character.",
  }),
]);

function optionById(options, value, field) {
  const option = options.find((candidate) => candidate.id === value);
  if (!option) throw new TypeError(`${field} is not supported`);
  return option;
}

export function buildOldPhotoRestorationPrompt({ strength = "restrained", preserve = "identity" } = {}) {
  const strengthOption = optionById(OLD_PHOTO_RESTORATION_STRENGTHS, strength, "strength");
  const priorityOption = optionById(OLD_PHOTO_RESTORATION_PRIORITIES, preserve, "preserve");
  return [
    "Create a gently restored viewing copy of this single old photograph.",
    strengthOption.instruction,
    priorityOption.instruction,
    "Preserve the same people, facial proportions, age, expression, pose, clothing, objects, composition, crop, and historical era.",
    "Do not beautify, modernize, recolor a monochrome or sepia source, change age, add or remove people or objects, invent hidden details, rewrite text, or add typography, logos, frames, borders, or contact sheets.",
    "If a detail cannot be supported by the source, keep it subdued instead of inventing a crisp replacement.",
    "Return one complete image. This is a generative restoration copy and cannot guarantee exact identity, text, or historical detail.",
  ].join(" ");
}

const ALLOWED_PROMPTS = new Set(OLD_PHOTO_RESTORATION_STRENGTHS.flatMap((strength) => (
  OLD_PHOTO_RESTORATION_PRIORITIES.map((priority) => buildOldPhotoRestorationPrompt({
    strength: strength.id,
    preserve: priority.id,
  }))
)));

export function isOldPhotoRestorationPrompt(prompt) {
  return typeof prompt === "string" && ALLOWED_PROMPTS.has(prompt);
}
