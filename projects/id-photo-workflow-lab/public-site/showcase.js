const effects = {
  source: {
    title: '原始输入',
    fact: '1254×1254 · 项目生成',
    preview: './assets/source-fictional-mannequin-preview.webp',
    full: './assets/source-fictional-mannequin.png',
    description: '原始图包含复杂植物、窗光和卷发细节，用于观察人像分离与构图。',
    checker: false
  },
  transparent: {
    title: '透明标准图',
    fact: '295×413 · RGBA',
    preview: './assets/result-transparent-preview.webp',
    full: './assets/result-transparent.png',
    description: 'MODNet 在 CPU 上预测连续 Alpha，MTCNN 再提供人脸几何用于标准构图。',
    checker: true
  },
  blue: {
    title: '蓝底标准图',
    fact: '295×413 · RGB',
    preview: './assets/result-blue-preview.webp',
    full: './assets/result-blue.png',
    description: '透明结果通过确定性 Alpha 合成写入蓝色背景；这一步不需要生成式 AI。',
    checker: false
  }
};

const papers = {
  'six-inch': { label: '六寸', size: '1795 × 1205', preview: './assets/layout-six-inch-preview.webp', full: './assets/layout-six-inch.png' },
  'five-inch': { label: '五寸', size: '1500 × 1051', preview: './assets/layout-five-inch-preview.webp', full: './assets/layout-five-inch.png' },
  a4: { label: 'A4', size: '3508 × 2479', preview: './assets/layout-a4-preview.webp', full: './assets/layout-a4.png' },
  '3r': { label: '3R', size: '1500 × 1051', preview: './assets/layout-3r-preview.webp', full: './assets/layout-3r.png' },
  '4r': { label: '4R', size: '1795 × 1205', preview: './assets/layout-4r-preview.webp', full: './assets/layout-4r.png' }
};

for (const button of document.querySelectorAll('[data-effect]')) {
  button.addEventListener('click', () => {
    const effect = effects[button.dataset.effect];
    for (const peer of document.querySelectorAll('[data-effect]')) peer.setAttribute('aria-pressed', String(peer === button));
    document.querySelector('#effect-title').textContent = effect.title;
    document.querySelector('#effect-fact').textContent = effect.fact;
    document.querySelector('#effect-image').src = effect.preview;
    document.querySelector('#effect-image').alt = effect.title;
    document.querySelector('#effect-description').textContent = effect.description;
    document.querySelector('#effect-download').href = effect.full;
    document.querySelector('#image-stage').classList.toggle('checker', effect.checker);
  });
}
for (const button of document.querySelectorAll('[data-paper]')) {
  button.addEventListener('click', () => {
    const paper = papers[button.dataset.paper];
    for (const peer of document.querySelectorAll('[data-paper]')) peer.setAttribute('aria-selected', String(peer === button));
    document.querySelector('#paper-label').textContent = paper.label;
    document.querySelector('#paper-size').textContent = paper.size;
    document.querySelector('#layout-image').src = paper.preview;
    document.querySelector('#layout-image').alt = `${paper.label}打印排版预览`;
    document.querySelector('#layout-download').href = paper.full;
  });
}
