# 静态效果图显示修复

```text
Current stage: Stage 3 / layout calibration
User phase: 5) 修复 GitHub Pages 透明标准图显示
Coverage item: 右侧结果图必须完整 contain，不得被固定高度舞台裁切
Browser environment: deployed GitHub Pages / Chromium / desktop
Observed evidence: natural image 295×413；img box 543.5×760.9；stage box 543.5×520
Problem category: clipping / overflow
Root cause: grid 内百分比高度参与循环尺寸计算，结果 img 高度超过固定 stage 约 241px，再被 overflow hidden 裁掉
Minimal intervention: stage 建立定位上下文，结果 img absolute inset 0，width/height 100%，object-fit contain
Adjacent regression surfaces: source, transparent, blue; desktop, 390px; caption/fact and download link
Observed result: desktop img/stage both 543.5×520；mobile both 289×340；source/transparent/blue share contain behavior；390px no overflow；browser errors empty
Decision: pass
Next executable action: none
New authority required: none
```

## 最终证据

| 字段 | 修复前 | 修复后 |
| --- | --- | --- |
| 透明图 natural | 295×413 | 295×413 |
| 桌面 img box | 543.5×760.9 | 543.5×520 |
| 桌面 stage | 543.5×520 | 543.5×520 |
| 移动 img / stage | 未记录 | 289×340 / 289×340 |
| 结果 | 下部被裁切 | 完整 `object-fit: contain` |

修复时间：2026-08-18T14:41:18+08:00。截图保留在项目外 visualization workspace：`display-bug-effect-live.png`、`display-fix-desktop.png`、`display-fix-mobile.png`。
