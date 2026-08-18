const state = {
  connected: false,
  mode: 'checking',
  sourceFile: null,
  sourceUrl: null,
  standardBase64: null,
  backgroundBase64: null,
  hdBase64: null,
  layoutBase64: null,
  runtimeHealth: null,
  running: false
};

window.__consoleErrors = [];
window.addEventListener('error', (event) => {
  window.__consoleErrors.push(String(event.message || event.error || 'Unknown error'));
});
window.addEventListener('unhandledrejection', (event) => {
  window.__consoleErrors.push(String(event.reason || 'Unhandled rejection'));
});

const elements = {
  connection: document.querySelector('#connection'),
  connectionLabel: document.querySelector('#connection-label'),
  modeNote: document.querySelector('#mode-note'),
  form: document.querySelector('#workflow-form'),
  file: document.querySelector('#source-file'),
  fixtureButton: document.querySelector('#load-fixture'),
  size: document.querySelector('#size-preset'),
  dpi: document.querySelector('#dpi'),
  model: document.querySelector('#matting-model'),
  faceModel: document.querySelector('#face-model'),
  faceAlign: document.querySelector('#face-align'),
  inferenceModes: [...document.querySelectorAll('input[name="inference-mode"]')],
  edgeCloudOption: document.querySelector('#edge-cloud-option'),
  edgeCloudNote: document.querySelector('#edge-cloud-note'),
  runtimeSummary: document.querySelector('#runtime-summary'),
  capabilityCards: [...document.querySelectorAll('[data-capability]')],
  beautyInputs: {
    whitening: document.querySelector('#whitening'),
    brightness: document.querySelector('#brightness'),
    contrast: document.querySelector('#contrast'),
    saturation: document.querySelector('#saturation'),
    sharpen: document.querySelector('#sharpen')
  },
  beautyOutputs: {
    whitening: document.querySelector('#whitening-value'),
    brightness: document.querySelector('#brightness-value'),
    contrast: document.querySelector('#contrast-value'),
    saturation: document.querySelector('#saturation-value'),
    sharpen: document.querySelector('#sharpen-value')
  },
  customColor: document.querySelector('#custom-color'),
  runButton: document.querySelector('#run-button'),
  runButtonLabel: document.querySelector('#run-button-label'),
  formMessage: document.querySelector('#form-message'),
  sourcePreview: document.querySelector('#source-preview'),
  sourceCanvas: document.querySelector('#source-canvas'),
  sourceEmpty: document.querySelector('#source-empty'),
  sourceMeta: document.querySelector('#source-meta'),
  resultPreview: document.querySelector('#result-preview'),
  resultCanvas: document.querySelector('#result-canvas'),
  resultEmpty: document.querySelector('#result-empty'),
  resultTitle: document.querySelector('#primary-result-title'),
  resultBadge: document.querySelector('#result-badge'),
  resultDownload: document.querySelector('#download-result'),
  hdDownload: document.querySelector('#download-hd'),
  layoutButton: document.querySelector('#layout-button'),
  paperSize: document.querySelector('#paper-size'),
  cropLine: document.querySelector('#crop-line'),
  layoutHelp: document.querySelector('#layout-help'),
  layoutCard: document.querySelector('#layout-preview-card'),
  layoutPreview: document.querySelector('#layout-preview'),
  layoutDownload: document.querySelector('#download-layout'),
  evidenceNote: document.querySelector('#evidence-note'),
  stages: [...document.querySelectorAll('[data-stage]')]
};

function dataUrl(base64) {
  if (!base64) return null;
  return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
}

function setMessage(message, error = false) {
  elements.formMessage.textContent = message;
  elements.formMessage.classList.toggle('error', error);
}

function setDownload(anchor, base64) {
  if (base64) {
    anchor.href = dataUrl(base64);
    anchor.classList.remove('disabled');
    anchor.setAttribute('aria-disabled', 'false');
  } else {
    anchor.removeAttribute('href');
    anchor.classList.add('disabled');
    anchor.setAttribute('aria-disabled', 'true');
  }
}

function setStage(current, completed = []) {
  for (const stage of elements.stages) {
    const id = stage.dataset.stage;
    stage.classList.toggle('active', id === current);
    stage.classList.toggle('complete', completed.includes(id));
  }
}

function selectedBackground() {
  const selected = document.querySelector('input[name="background"]:checked')?.value ?? 'transparent';
  return selected === 'custom' ? elements.customColor.value.replace('#', '') : selected;
}

function resetResults() {
  state.standardBase64 = null;
  state.backgroundBase64 = null;
  state.hdBase64 = null;
  state.layoutBase64 = null;
  elements.resultPreview.hidden = true;
  elements.resultPreview.removeAttribute('src');
  elements.resultEmpty.hidden = false;
  elements.resultCanvas.classList.add('empty');
  elements.resultTitle.textContent = '透明标准图';
  elements.resultBadge.textContent = '等待处理';
  elements.layoutCard.hidden = true;
  elements.layoutPreview.removeAttribute('src');
  elements.layoutButton.disabled = true;
  elements.layoutHelp.textContent = '需要先生成有底色的结果。';
  setDownload(elements.resultDownload, null);
  setDownload(elements.hdDownload, null);
  setDownload(elements.layoutDownload, null);
  setStage('source');
  elements.evidenceNote.innerHTML = '<strong>结果证据</strong><p>尚未运行。真实模式只显示 Hivision 返回结果；夹具模式只验证交互，不证明模型质量。</p>';
}

function updateRunAvailability() {
  const ready = state.connected && state.sourceFile && !state.running;
  elements.runButton.disabled = !ready;
  if (state.running) {
    elements.runButtonLabel.textContent = '正在运行工作流…';
  } else if (!state.connected) {
    elements.runButtonLabel.textContent = '等待 Hivision 连接';
  } else if (!state.sourceFile) {
    elements.runButtonLabel.textContent = '选择图片后开始';
  } else {
    elements.runButtonLabel.textContent = '生成证件照结果';
  }
}

function setCapability(cardId, label, className) {
  const card = elements.capabilityCards.find((item) => item.dataset.capability === cardId);
  if (!card) return;
  const pill = card.querySelector('.status-pill');
  pill.textContent = label;
  pill.className = `status-pill ${className}`;
}

function applyRuntimeHealth(status) {
  state.runtimeHealth = status;
  const capabilities = status.capabilities ?? {};
  const isReal = status.mode === 'real-hivision';
  const paperCount = Object.keys(capabilities.paper_sizes ?? {}).length;
  setCapability('offline', capabilities.offline_cpu_matting ? (isReal ? '真实可运行' : '夹具未运行') : '不可用', capabilities.offline_cpu_matting ? 'pass' : 'config');
  setCapability('sizes', capabilities.standard_sizes ? '已实现' : '不可用', capabilities.standard_sizes ? 'pass' : 'config');
  setCapability('papers', paperCount === 5 ? '五种已映射' : '未完成', paperCount === 5 ? 'pass' : 'config');
  setCapability('beauty', capabilities.beauty ? '已实现' : '夹具未运行', capabilities.beauty ? 'pass' : 'config');
  setCapability('cloud', capabilities.edge_cloud_face_plus ? '已配置' : '需要配置', capabilities.edge_cloud_face_plus ? 'pass' : 'config');
  setCapability('outfit', 'Waiting', 'waiting');

  const runtime = status.runtime ?? {};
  elements.runtimeSummary.textContent = isReal
    ? `真实运行：Python ${runtime.python} · OpenCV ${runtime.opencv} · ONNX Runtime ${runtime.onnxruntime} · ${runtime.onnx_device}。已安装模型 ${status.models?.length ?? 0} 个。`
    : '夹具模式只验证交互；启动真实 runtime 后显示 Python、ONNX 与 CPU 证据。';

  for (const option of elements.model.options) {
    option.disabled = isReal && !(status.models ?? []).includes(option.value);
  }
  const firstEnabledModel = [...elements.model.options].find((option) => !option.disabled);
  if (elements.model.selectedOptions[0]?.disabled && firstEnabledModel) elements.model.value = firstEnabledModel.value;

  const cloudReady = Boolean(capabilities.edge_cloud_face_plus);
  const facePlusOption = [...elements.faceModel.options].find((option) => option.value === 'face_plusplus');
  const edgeCloudRadio = elements.inferenceModes.find((item) => item.value === 'edge-cloud');
  facePlusOption.disabled = !cloudReady;
  edgeCloudRadio.disabled = !cloudReady;
  elements.edgeCloudOption.classList.toggle('disabled', !cloudReady);
  elements.edgeCloudNote.textContent = cloudReady ? '已配置；图片会发送给 Face++' : '未配置 API key，当前禁用';
  if (!cloudReady && edgeCloudRadio.checked) {
    elements.inferenceModes.find((item) => item.value === 'offline').checked = true;
    elements.faceModel.value = 'mtcnn';
  }
}

function applySourceFile(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    setMessage('只接受 PNG、JPEG 或 WebP 图片。', true);
    return;
  }
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    setMessage('图片必须大于 0 且不超过 10 MiB。', true);
    return;
  }
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
  state.sourceFile = file;
  state.sourceUrl = URL.createObjectURL(file);
  elements.sourcePreview.src = state.sourceUrl;
  elements.sourcePreview.hidden = false;
  elements.sourceEmpty.hidden = true;
  elements.sourceCanvas.classList.remove('empty');
  elements.sourceMeta.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KiB`;
  resetResults();
  setMessage(state.mode === 'fixture' ? '测试夹具已就绪；运行结果不会调用模型。' : '图片只在本机预览；点击运行后发送至本机 Hivision。');
  updateRunAvailability();
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || `HTTP_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function postForm(path, formData) {
  return readJsonResponse(await fetch(path, { method: 'POST', body: formData }));
}

async function checkStatus() {
  elements.connection.dataset.state = 'checking';
  try {
    const status = await readJsonResponse(await fetch('/api/hivision/status', { cache: 'no-store' }));
    state.connected = Boolean(status.connected);
    state.mode = status.mode;
    elements.connection.dataset.state = state.connected ? 'ready' : 'disconnected';
    elements.connectionLabel.textContent = status.label;
    if (status.mode === 'fixture') {
      elements.fixtureButton.hidden = false;
      elements.modeNote.textContent = '当前为项目原创交互夹具模式：可走完整流程，但未运行 Hivision 模型。';
      setMessage('夹具模式已就绪；可加载项目原创测试图片。');
    } else if (status.connected) {
      elements.fixtureButton.hidden = true;
      elements.modeNote.textContent = status.mode === 'real-hivision'
        ? '已连接固定 Hivision CPU runtime。图片只在本机 Demo 与本机 Python bridge 之间传递。'
        : '已连接本机 Hivision。输入图片将在当前设备上的两个本地服务之间传递。';
      setMessage(status.mode === 'real-hivision' ? '真实 Hivision CPU runtime 已连接，请选择图片。' : 'Hivision 已连接，请选择图片。');
    } else {
      elements.fixtureButton.hidden = true;
      elements.modeNote.textContent = '未检测到本机 Hivision；请先运行 python deploy_api.py，或使用夹具模式查看流程。';
      setMessage('Hivision 未连接，当前不会上传或生成任何结果。', true);
    }
    applyRuntimeHealth(status);
  } catch {
    state.connected = false;
    state.mode = 'upstream';
    elements.connection.dataset.state = 'disconnected';
    elements.connectionLabel.textContent = '状态检查失败';
    elements.modeNote.textContent = '无法确认本地服务状态。';
    setMessage('状态检查失败，请确认本地 Node Demo 正常。', true);
    applyRuntimeHealth({ connected: false, mode: 'upstream', capabilities: {}, models: [] });
  }
  updateRunAvailability();
}

elements.file.addEventListener('change', () => applySourceFile(elements.file.files?.[0]));

elements.fixtureButton.addEventListener('click', async () => {
  try {
    const response = await fetch('/fixture-source.png');
    if (!response.ok) throw new Error('FIXTURE_UNAVAILABLE');
    const blob = await response.blob();
    applySourceFile(new File([blob], 'project-fixture-portrait.png', { type: 'image/png' }));
  } catch {
    setMessage('无法加载测试夹具。', true);
  }
});

elements.customColor.addEventListener('input', () => {
  document.querySelector('input[name="background"][value="custom"]').checked = true;
});

for (const mode of elements.inferenceModes) {
  mode.addEventListener('change', () => {
    if (!mode.checked) return;
    elements.faceModel.value = mode.value === 'edge-cloud' ? 'face_plusplus' : 'mtcnn';
  });
}

elements.faceModel.addEventListener('change', () => {
  const target = elements.faceModel.value === 'face_plusplus' ? 'edge-cloud' : 'offline';
  const radio = elements.inferenceModes.find((item) => item.value === target);
  if (!radio.disabled) radio.checked = true;
});

for (const [name, input] of Object.entries(elements.beautyInputs)) {
  input.addEventListener('input', () => {
    elements.beautyOutputs[name].value = input.value;
  });
}

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.connected || !state.sourceFile || state.running) return;
  state.running = true;
  updateRunAvailability();
  setStage('matting', ['source']);
  setMessage(state.mode === 'fixture' ? '正在生成交互夹具结果…' : '正在调用本机 Hivision：人像抠图、检测与构图…');

  try {
    const [height, width] = elements.size.value.split('x').map(Number);
    const idPhotoForm = new FormData();
    idPhotoForm.append('input_image', state.sourceFile, state.sourceFile.name);
    idPhotoForm.append('height', String(height));
    idPhotoForm.append('width', String(width));
    idPhotoForm.append('human_matting_model', elements.model.value);
    idPhotoForm.append('face_detect_model', elements.faceModel.value);
    idPhotoForm.append('hd', 'true');
    idPhotoForm.append('dpi', elements.dpi.value);
    idPhotoForm.append('face_align', String(elements.faceAlign.checked));
    idPhotoForm.append('whitening_strength', elements.beautyInputs.whitening.value);
    idPhotoForm.append('brightness_strength', elements.beautyInputs.brightness.value);
    idPhotoForm.append('contrast_strength', elements.beautyInputs.contrast.value);
    idPhotoForm.append('saturation_strength', elements.beautyInputs.saturation.value);
    idPhotoForm.append('sharpen_strength', elements.beautyInputs.sharpen.value);

    const idPhoto = await postForm('/api/hivision/idphoto', idPhotoForm);
    if (!idPhoto?.status || !idPhoto.image_base64_standard) throw new Error('NO_SINGLE_FACE_OR_RESULT');
    state.standardBase64 = idPhoto.image_base64_standard;
    state.hdBase64 = idPhoto.image_base64_hd ?? null;
    setDownload(elements.hdDownload, state.hdBase64);

    const background = selectedBackground();
    if (background !== 'transparent') {
      setStage('background', ['source', 'matting']);
      setMessage('透明结果已生成，正在合成背景…');
      const backgroundForm = new FormData();
      backgroundForm.append('input_image_base64', state.standardBase64);
      backgroundForm.append('color', background);
      backgroundForm.append('dpi', elements.dpi.value);
      backgroundForm.append('render', '0');
      const backgroundResult = await postForm('/api/hivision/add-background', backgroundForm);
      if (!backgroundResult?.status || !backgroundResult.image_base64) throw new Error('BACKGROUND_RESULT_MISSING');
      state.backgroundBase64 = backgroundResult.image_base64;
      elements.resultTitle.textContent = '标准底色图';
      elements.resultPreview.src = dataUrl(state.backgroundBase64);
      elements.resultDownload.download = 'id-photo-background.png';
      setDownload(elements.resultDownload, state.backgroundBase64);
      elements.layoutButton.disabled = false;
      setStage('background', ['source', 'matting']);
    } else {
      state.backgroundBase64 = null;
      elements.resultTitle.textContent = '透明标准图';
      elements.resultPreview.src = dataUrl(state.standardBase64);
      elements.resultDownload.download = 'id-photo-transparent.png';
      setDownload(elements.resultDownload, state.standardBase64);
      elements.layoutButton.disabled = true;
      setStage('matting', ['source']);
    }

    elements.resultPreview.hidden = false;
    elements.resultEmpty.hidden = true;
    elements.resultCanvas.classList.remove('empty');
    elements.resultBadge.textContent = state.mode === 'fixture' ? '交互夹具' : 'Hivision 结果';
    elements.evidenceNote.innerHTML = state.mode === 'fixture'
      ? '<strong>结果证据</strong><p>项目原创几何夹具；没有运行人像模型，只证明上传、状态、换底、排版和下载交互可用。</p>'
      : `<strong>结果证据</strong><p>来自本机 Hivision；${idPhoto.mode === 'offline-cpu' ? '纯离线 CPU' : '端云'}，模型 ${elements.model.options[elements.model.selectedIndex].text}，检测 ${elements.faceModel.options[elements.faceModel.selectedIndex].text}，${width}×${height}px，${elements.dpi.value} DPI，上游处理 ${idPhoto.elapsed_ms ?? '未知'} ms。</p>`;
    setMessage(state.mode === 'fixture' ? '夹具流程完成；结果不代表模型质量。' : 'Hivision 处理完成；请检查边缘与构图后再下载。');
  } catch (error) {
    elements.resultBadge.textContent = '处理失败';
    setMessage(error.message === 'NO_SINGLE_FACE_OR_RESULT' ? 'Hivision 未返回单人有效结果；请检查是否清晰且只有一张脸。' : `处理失败：${error.message}`, true);
    elements.evidenceNote.innerHTML = '<strong>结果证据</strong><p>本次没有可用结果；旧结果未被保留，也不会自动重试。</p>';
  } finally {
    state.running = false;
    updateRunAvailability();
  }
});

elements.layoutButton.addEventListener('click', async () => {
  if (!state.backgroundBase64 || state.running) return;
  state.running = true;
  updateRunAvailability();
  elements.layoutButton.disabled = true;
  setStage('layout', ['source', 'matting', 'background']);
  setMessage('正在生成打印排版…');
  try {
    const [height, width] = elements.size.value.split('x').map(Number);
    const form = new FormData();
    form.append('input_image_base64', state.backgroundBase64);
    form.append('height', String(height));
    form.append('width', String(width));
    form.append('dpi', elements.dpi.value);
    form.append('fixture_color', selectedBackground());
    form.append('paper', elements.paperSize.value);
    form.append('crop_line', String(elements.cropLine.checked));
    const result = await postForm('/api/hivision/layout', form);
    if (!result?.status || !result.image_base64) throw new Error('LAYOUT_RESULT_MISSING');
    state.layoutBase64 = result.image_base64;
    elements.layoutPreview.src = dataUrl(state.layoutBase64);
    elements.layoutCard.hidden = false;
    elements.layoutCard.querySelector('h3').textContent = `${result.paper_label ?? elements.paperSize.selectedOptions[0].text}打印排版预览`;
    elements.layoutDownload.download = `id-photo-layout-${result.paper ?? elements.paperSize.value}.png`;
    setDownload(elements.layoutDownload, state.layoutBase64);
    setStage('layout', ['source', 'matting', 'background']);
    elements.layoutHelp.textContent = `${result.paper_label ?? elements.paperSize.selectedOptions[0].text} · ${result.layout_width ?? '夹具'}×${result.layout_height ?? '夹具'} px`;
    setMessage(state.mode === 'fixture' ? '夹具排版已生成；未运行模型。' : `${result.paper_label}打印排版已生成。`);
  } catch (error) {
    setMessage(`排版失败：${error.message}`, true);
  } finally {
    state.running = false;
    elements.layoutButton.disabled = !state.backgroundBase64;
    updateRunAvailability();
  }
});

elements.paperSize.addEventListener('change', () => {
  state.layoutBase64 = null;
  elements.layoutCard.hidden = true;
  elements.layoutHelp.textContent = state.backgroundBase64 ? '纸张已切换，请重新生成排版。' : '需要先生成有底色的结果。';
  setDownload(elements.layoutDownload, null);
});

window.addEventListener('beforeunload', () => {
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
});

resetResults();
checkStatus();
