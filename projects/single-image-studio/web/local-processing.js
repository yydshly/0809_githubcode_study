const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("浏览器无法导出图片")), type, quality);
});

export async function decodeImage(source) {
  const image = new Image();
  image.decoding = "async";
  image.src = source;
  await image.decode();
  return image;
}

function positiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} 必须是正数`);
  }
  return value;
}

export function outputDimensions(width, height, maxEdge = 2048) {
  positiveDimension(width, "图片宽度");
  positiveDimension(height, "图片高度");
  positiveDimension(maxEdge, "输出长边");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function coverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  positiveDimension(sourceWidth, "来源宽度");
  positiveDimension(sourceHeight, "来源高度");
  positiveDimension(targetWidth, "目标宽度");
  positiveDimension(targetHeight, "目标高度");
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return { sx: (sourceWidth - width) / 2, sy: 0, sw: width, sh: sourceHeight };
  }
  const height = sourceWidth / targetRatio;
  return { sx: 0, sy: (sourceHeight - height) / 2, sw: sourceWidth, sh: height };
}

function drawTone(ctx, width, height, tone) {
  if (tone === "mono") {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(28,43,35,.08)";
    ctx.fillRect(0, 0, width, height);
  } else if (tone === "warm") {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(241,178,98,.24)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  } else if (tone === "cool") {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(74,120,153,.2)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }
}

export async function processFaithful({
  sourceUrl,
  settings = {},
  canvas,
  decode = decodeImage,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
}) {
  if (!canvas || typeof canvas.getContext !== "function" || typeof canvas.toBlob !== "function") {
    throw new TypeError("需要可导出的 Canvas");
  }
  const image = await decode(sourceUrl);
  positiveDimension(image?.naturalWidth, "解码宽度");
  positiveDimension(image?.naturalHeight, "解码高度");
  const ratio = settings.ratio ?? "original";
  let dimensions;
  if (ratio === "square") dimensions = { width: 1600, height: 1600 };
  else if (ratio === "portrait") dimensions = { width: 1536, height: 1920 };
  else if (ratio === "landscape") dimensions = { width: 1920, height: 1280 };
  else dimensions = outputDimensions(image.naturalWidth, image.naturalHeight);

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("浏览器无法创建 2D 画布");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#f4f3ec";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const crop = coverCrop(image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
  ctx.filter = `brightness(${settings.brightness ?? 100}%) contrast(${settings.contrast ?? 100}%) saturate(${settings.saturation ?? 100}%)`;
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  drawTone(ctx, canvas.width, canvas.height, settings.tone ?? "natural");

  const format = settings.format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await canvasToBlob(canvas, format, format === "image/jpeg" ? 0.92 : undefined);
  if (blob.size <= 0 || blob.type !== format) {
    throw new Error("浏览器返回了无效的编码结果");
  }
  return {
    blob,
    url: createObjectUrl(blob),
    mime: format,
    extension: format === "image/jpeg" ? "jpg" : "png",
    width: canvas.width,
    height: canvas.height,
    validationSummary: "已生成并核对输出尺寸、格式与文件大小；未执行内容质量检查",
    processor: "local-canvas-faithful-v1",
  };
}

export async function createDemoImage(canvas) {
  canvas.width = 1440;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d", { alpha: false });
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#bed0c3");
  sky.addColorStop(.48, "#e4d49d");
  sky.addColorStop(1, "#253f36");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#486a57";
  ctx.beginPath();
  ctx.moveTo(0, 670);
  ctx.quadraticCurveTo(320, 410, 610, 690);
  ctx.quadraticCurveTo(980, 310, 1440, 650);
  ctx.lineTo(1440, 1080);
  ctx.lineTo(0, 1080);
  ctx.fill();
  ctx.fillStyle = "#172c25";
  ctx.beginPath();
  ctx.moveTo(0, 780);
  ctx.quadraticCurveTo(330, 650, 720, 790);
  ctx.quadraticCurveTo(1050, 620, 1440, 790);
  ctx.lineTo(1440, 1080);
  ctx.lineTo(0, 1080);
  ctx.fill();
  ctx.fillStyle = "#dce978";
  ctx.beginPath();
  ctx.arc(1050, 260, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(230, 710);
  ctx.bezierCurveTo(490, 630, 710, 910, 1190, 760);
  ctx.stroke();
  ctx.fillStyle = "#d96d3a";
  for (const [x, y, r] of [[270, 690, 23], [585, 760, 16], [920, 765, 20], [1175, 735, 14]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const blob = await canvasToBlob(canvas, "image/png");
  return new File([blob], "synthetic-hillside-demo.png", { type: "image/png" });
}
