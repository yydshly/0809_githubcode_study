import { applyCanvasFitToEditorSettings } from "./canvas-fit.js";
import { normalizeCompressionTargetKilobytes } from "./image-compression.js";
import { privacyShareEditorSettings } from "./privacy-share.js";
import { normalizeSocialOverlaySettings } from "./social-card-overlay.js";
import { normalizeUploadSpecification, uploadSpecificationEditorSettings } from "./upload-specification.js";

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} is required`);
  return value;
}

export function assertWorkflowParameterContract(task, workflowDefinition) {
  if (workflowDefinition?.parameterContract !== undefined
    && workflowDefinition.parameterContract !== task?.contractVersion) {
    throw new Error("工作流定义与任务合同不一致");
  }
}

export function assertTaskConsent({ taskId, composedBackground = false, remoteConsent = false, generativeRestoreConsent = false } = {}) {
  if (composedBackground && remoteConsent !== true) {
    throw new Error(taskId === "UT-PRODUCT" ? "请先确认远程商品抠图处理" : "请先确认远程头像抠图处理");
  }
  if (taskId === "UT-CUTOUT" && remoteConsent !== true) throw new Error("请先确认远程抠图处理");
  if (taskId === "CR-RESTORE" && generativeRestoreConsent !== true) throw new Error("请先确认生成式老照片修复的风险");
}

export function normalizeEditorTaskSettings({ taskId, editorSettings, formSettings, composedBackground = false, remoteConsent = false } = {}) {
  const base = requireObject(editorSettings, "editorSettings");
  const form = requireObject(formSettings, "formSettings");
  const settings = { ...base };

  assertTaskConsent({ taskId, composedBackground, remoteConsent });
  if (composedBackground) settings.remoteConsent = true;

  if (taskId === "UT-TEMPLATE") {
    const overlay = normalizeSocialOverlaySettings(form);
    settings.socialTitle = overlay.text;
    settings.socialTitlePosition = overlay.position;
    settings.socialTitleAlignment = overlay.alignment;
    settings.socialTitleTone = overlay.tone;
  }
  if (taskId === "UT-UPLOAD") {
    const normalized = normalizeUploadSpecification(form);
    Object.assign(settings, uploadSpecificationEditorSettings(settings, form), {
      uploadSourceRatio: Number(form.uploadSourceRatio),
      canvasRatio: normalized.ratioId,
      canvasSourceRatio: Number(form.uploadSourceRatio),
      canvasLongEdge: normalized.outputLongEdge,
      canvasMargin: 0,
      canvasBackground: "custom",
      canvasCustomBackground: normalized.backgroundColor,
    });
  }
  if (taskId === "UT-PRIVACY-SHARE") Object.assign(settings, privacyShareEditorSettings(form));
  if (taskId === "UT-FIT") Object.assign(settings, applyCanvasFitToEditorSettings(settings, form));
  if (taskId === "UT-CONVERT") {
    if (settings.ratio !== "original" || settings.sizeMode !== "custom" || !["png", "jpeg"].includes(settings.format)) {
      throw new Error("格式转换必须保持完整比例并输出 PNG 或 JPEG");
    }
    settings.outputLongEdge = Number(form.outputLongEdge);
    if (!Number.isSafeInteger(settings.outputLongEdge) || settings.outputLongEdge < 1 || settings.outputLongEdge > 8192) {
      throw new Error("格式转换最长边必须是 1–8192 像素");
    }
    settings.formatConversion = "on";
  }
  if (taskId === "UT-COMPRESS") {
    if (settings.ratio !== "original" || settings.sizeMode !== "custom" || settings.format !== "jpeg") {
      throw new Error("图片压缩必须保持完整比例并输出 JPEG");
    }
    settings.outputLongEdge = Number(form.outputLongEdge);
    if (!Number.isSafeInteger(settings.outputLongEdge) || settings.outputLongEdge < 320 || settings.outputLongEdge > 8192) {
      throw new Error("最长边上限必须是 320–8192 像素");
    }
    settings.compressionTargetKilobytes = normalizeCompressionTargetKilobytes(form.compressionTargetKilobytes);
    settings.jpegQuality = 0.9;
  }
  if (taskId === "UT-DOC-ARCHIVE") {
    settings.compressionTargetKilobytes = normalizeCompressionTargetKilobytes(form.archiveTargetKilobytes);
    settings.outputLongEdge = Number(form.outputLongEdge);
    settings.sizeMode = "custom";
    settings.format = "jpeg";
    settings.jpegQuality = 0.9;
    settings.jpegBackground = "#ffffff";
  }
  return settings;
}
