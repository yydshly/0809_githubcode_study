# 质量与兼容性合同

> 本文件冻结首轮桌面 Web 产品的质量范围、测试分层和兼容证据结构。它是 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 的从属合同，不改变 C1/U1/E1/R1/O1/G1/V1 的含义。当前所有正式兼容与 UI 质量证据均为 0；R0 工程探针在某台设备上打开，不能推出这里的任何支持结论。

## 1. 首轮支持边界

首轮冻结验证界面、正式产品界面与邀请 beta 只声明 **Windows 桌面浏览器**。候选目标为冻结日的 Chrome 最新稳定版和 Edge 最新稳定版；每次验证必须在版本化 `CompatibilityProfile` 中写入两个浏览器的精确版本，不能长期使用“最新版”作为可复现证据。

| 维度 | 首轮候选范围 | 判定规则 |
| --- | --- | --- |
| 操作系统 | Windows 桌面 | 精确版本、build、更新级别写入 profile；未登记的 Windows 版本不继承 |
| 浏览器 | Chrome stable、Edge stable | 两者都以冻结日精确版本验收；Chromium 同源不允许只测一个后推断另一个 |
| 最低 viewport | `1280 × 720` CSS px | 完整主流程必须可达、可读、可恢复；不是仅要求页面能加载 |
| 审查 viewport | `1440 × 900` CSS px | 主要视觉审查、比较视图和参考基线的标准尺寸 |
| 输入方式 | 键盘、鼠标或常规触控板 | 文件选择、设置、执行、对比、失败恢复、删除与下载均需可操作 |
| 缩放与 DPR | 待 profile 冻结 | 至少记录 100% 浏览器缩放、Windows 显示缩放、DPR；无记录不构成兼容证据 |

手机、平板、iPhone、Android、Safari、Firefox、HEIC/HEIF、完整响应式断点和触摸专用交互全部后置。后置不等于“已知不兼容”，也不能在首轮发布材料中称为支持。首轮页面在范围外客户端上的偶然可用不产生证据；若允许访问，必须明确显示未验证范围，且不能用 UA 判断替代服务端安全校验。

`1280 × 720` 是首轮最小桌面 viewport，不是图片像素限制或物理屏幕分辨率。浏览器工具栏、Windows 缩放和可用 viewport 必须实测记录。200% 缩放下至少要保证关键文字、表单、错误、删除和下载流程仍可到达；这项可访问性要求不等于承诺手机布局或完整响应式产品。

## 2. `CompatibilityProfile`

每个 R1-product-validation、R1-product-release 和相应 TestEvidenceManifest 必须引用不可变 profile：

```text
compatibility_profile_id + version + frozen_at
surface_scope = product-validation | product-release
interface_build + artifact_hash + api_schema_version
windows_edition + windows_version + os_build + update_level
browsers[{name, exact_version, engine_version, channel}]
viewports[{width_css_px, height_css_px, purpose}]
browser_zoom + windows_display_scale + device_pixel_ratio
locale + timezone + input_methods + screen_reader_and_version
gpu + driver + hardware_acceleration + color_display_assumption
input_format_matrix_version + output_format_matrix_version
color_policy_version + accessibility_target_version
explicitly_unsupported + known_limits
owner + approvers + freeze_hash
```

- “Chrome / Edge 最新稳定版”只用于选择待冻结候选；开始正式运行后必须写精确版本。
- 浏览器、Windows build、渲染引擎、硬件加速策略或关键图像编解码行为改变时，旧 profile 不自动迁移。安全补丁升级至少重跑预注册 smoke、浏览器矩阵和视觉差异集；差异越过冻结条件时发布新 profile 并完整重测。
- profile 只说明被测试的环境，不证明图片质量、运行容量或数据治理；这些仍分别由效果证据、O1 和 G1 决定。

## 3. 格式与色彩矩阵

下表是首轮**待验证候选**，不是当前支持声明。最终 allowlist、大小 / 像素 / 帧数、解码资源上限、输出编码器与拒绝文案由 CompatibilityProfile、CapabilityContract 和 DataPolicy 共同冻结。

| 方向 | 候选 | 首轮状态 | 必测内容 |
| --- | --- | --- | --- |
| 输入 | JPEG | `candidate/pending-evidence` | 魔数与 MIME、EXIF 方向、ICC、CMYK / 渐进式、损坏与压缩炸弹边界 |
| 输入 | PNG | `candidate/pending-evidence` | Alpha、预乘语义、位深、ICC、超大 chunk、损坏和解码预算 |
| 输入 | WebP | `candidate/pending-evidence` | lossy / lossless、Alpha、尺寸头、损坏与解码预算 |
| 输入 | HEIC / HEIF | `deferred` | 首轮应在上传前或网关处安全、明确拒绝；不得静默转码或只取首帧 |
| 输入 | AVIF、GIF / APNG、TIFF、SVG、PDF、RAW | `deferred` | 不进入首轮 allowlist；动画 / 多页不得静默降为第一帧 |
| 输出 | PNG | `candidate/pending-evidence` | Alpha / 不透明合同、ICC、元数据、重开像素、字节与 hash |
| 输出 | JPEG | `candidate/pending-evidence` | 不透明合同、背景处理、编码器 / 质量、ICC、元数据与重开像素 |
| 输出 | WebP 及其他格式 | `deferred unless separately frozen` | 只有效果合同、导出合同和证据全部覆盖后才能加入 |

首轮交付色彩目标候选为 8-bit sRGB。不得仅依赖浏览器预览宣称色彩正确：

- 带有效 sRGB profile 的输入验证规范解码、方向、归一化和重开结果；
- 无 profile 输入的解释规则必须在合同中写明并以独立夹具验证，不能默默猜测后仍称保真；
- Display-P3、Adobe RGB、CMYK、HDR / wide-gamut、16-bit 以及损坏或超大 ICC 在没有冻结转换证据前明确拒绝或维持研究态，不能以浏览器“看起来正常”放行；
- Alpha、premultiply、背景合成、透明 PNG 和 JPEG 不透明导出分别测试；文件 hash 不可替代解码后像素、颜色和元数据验证；
- 浏览器 preview 与最终 `DeliveryArtifact` 的差异必须有冻结容忍规则，最终判定以重新打开的交付文件为准。

R0 当前对 JPEG、PNG、WebP 的文件头检查只属于工程探针，不授予上述格式或色彩支持。

## 4. 测试分层

测试按从小到大的证据层执行；高层不能用低层替代，低层失败也不能被端到端偶然成功掩盖。

| 层 | 目的 | 最小覆盖 | 不能证明 |
| --- | --- | --- | --- |
| L0 文档 / schema | ID、合同、清单和版本关系可解析 | 链接、枚举、manifest schema、无悬空引用 | 运行实现正确 |
| L1 单元 / 性质 / golden | 纯函数、边界、状态和编码规则 | 尺寸、格式、hash、状态转换、序列化、随机性质与最小反例 | 浏览器集成或真实执行器 |
| L2 组件 / API 合同 | 浏览器、网关、队列、worker 的边界一致 | schema、幂等、鉴权、错误包、旧响应、下载绑定 | 完整真实链路 |
| L3 集成 / 真实管线 | 冻结执行器与 QA 真实运行 | 成功、拒绝、失败、超时、取消、重试、清理和故障注入 | 用户界面可用或跨浏览器一致 |
| L4 真浏览器功能 | 精确 build 在目标浏览器完成任务 | 文件选择、设置、执行、刷新 / 恢复、换图、删除、下载、console / network 错误 | 视觉正确、a11y 或容量 |
| L5 视觉回归 | 界面结构和关键状态未产生未批准变化 | 两浏览器、两个 viewport、关键状态、差异复核 | 生成图片审美或效果质量 |
| L6 无障碍 | 目标桌面输入与辅助技术可操作 | 键盘、焦点、名称 / 状态、对比度、错误、live region、缩放、减弱动画 | 其他辅助技术或移动端 |
| L7 兼容 / 性能 / 安全 | 发布 profile 的端到端硬门 | 格式色彩矩阵、浏览器矩阵、O1 profile、安全与恢复演练 | 未声明平台和输入 |

每个层次记录未执行、失败和排除项；`skipped` 不是 pass。使用 mock 的测试必须标明 mock 边界，不能进入真实管线或供应商成功率分母。

## 5. 真浏览器与视觉回归

真浏览器检查不能只运行 DOM 模拟器。每个冻结 Chrome / Edge 版本和目标 viewport 至少覆盖：

1. 空状态、选择文件、同意、格式拒绝、上传 / 分析、任务选择与设置；
2. 排队、执行、QA、成功、资格拒绝、可恢复 / 不可恢复错误、超时 / UNKNOWN；
3. 换图、换任务、换参数、迟到响应、刷新 / 重启恢复和删除优先；
4. 原图 / 参考 / 结果标签、同步查看、缩放或对比控件、下载格式和资产绑定；
5. 断网、恢复、重复提交、浏览器后退 / 前进、旧标签页与缓存版本冲突；
6. console error、unhandled rejection、失败请求、资源 404、混合内容和敏感信息泄漏检查。

视觉回归基线必须绑定 `interface_build + browser_exact_version + viewport + DPR + zoom + locale + fixture + state`。阈值、允许区域和人工裁决规则在运行前冻结：

- 使用确定性的自有夹具和冻结 UI 状态；生成结果的审美与效果质量继续由 U1/E1/QA 评估，不能用截图像素差替代；
- 动态时间、随机 ID、进度和受控结果画布只能按预声明规则屏蔽，不得遮掉错误、来源 / 结果标签、下载状态或关键布局；
- 像素差、结构差异和人工复核共同判定；不能靠不断更新 baseline 消除回归；
- baseline 更新要关联批准的设计 / 缺陷记录、旧新证据和 reviewer，不能覆盖历史失败。

## 6. 无障碍硬门

首轮候选目标为版本化的 WCAG 2.2 AA 范围；精确目标、自动规则集和人工检查表写入 CompatibilityProfile。至少验证：

- 页面标题、标题层级、landmark、控件可访问名称、输入说明和错误关联；
- 全程键盘可达，无焦点陷阱；焦点顺序、可见焦点、弹层返回焦点和异步更新后的焦点位置可预测；
- 拖放、滑杆、悬停和颜色选择均有键盘或标准表单替代；对比控件暴露来源 / 结果身份和当前值；
- 状态、进度、失败、QA 拒绝和下载就绪由适当 live region 传达，不只依赖颜色、动画或图片；
- 文本、控件、焦点和图形对比度按冻结规则检查；系统高对比 / forced-colors 下关键操作可见；
- 200% 缩放、文本放大、Windows 显示缩放和长中文文案下不遮挡关键操作；比较画布可滚动不等于表单或下载可以丢失；
- `prefers-reduced-motion` 下停止非必要动画；进度仍有非动画表达；
- 键盘人工走查和冻结版本的 Windows 屏幕阅读器走查均通过。自动扫描不能单独授予 pass。

任何使用户无法选择图、理解结果身份、取消 / 删除、处理错误或下载正确资产的问题，均为 R1-product 的阻断项，不能用总体通过率抵消。

## 7. `TestEvidenceManifest`

每个正式测试决定引用一份不可变清单：

```text
test_evidence_id + version + created_at + scope
claim_target + interface_build + artifact_hash + commit
compatibility_profile_id + r1_acceptance_matrix_id + o1_profile_id
suite_versions + runner_versions + commands + configuration_hash
os_and_browser_matrix + viewport_dpr_zoom_locale_matrix
hardware_gpu_driver + network_and_provider_environment
fixture_manifest_versions + fixture_hashes + data_policy_id
run_started_at + run_finished_at + raw_run_ids
unit_component_integration_results
real_browser_functional_results + console_and_network_results
visual_baseline_ids + diff_artifacts + visual_adjudication
accessibility_automated_results + keyboard_record + assistive_technology_record
format_color_results + performance_security_recovery_links
skipped_excluded_flaky_quarantined + rationale + expiry
known_defects + blocking_defects + decision
evidence_owner + reviewers + approved_at + invalidation_triggers
```

- `decision` 只能是 `not-run | pass | fail | invalid | inconclusive`；未覆盖矩阵、跳过硬门、无法复现或证据附件缺失时不能写 pass。
- 原始报告、截图 / 视频、diff、console / network 记录和运行日志使用内容 hash 关联；用户图片不得因此进入普通 CI artifact。
- flaky 用例按预注册规则计入，不得重复运行到通过；修复后产生新的运行和清单版本。
- TestEvidenceManifest 只对精确 build 和 CompatibilityProfile 有效。范围、关键依赖、浏览器版本、输出格式 / 色彩策略或测试基线实质变化时需要新证据。

## 8. 发布判定与退出条件

首轮 R1-product-validation 或 R1-product-release 的质量判定至少要求：

1. 两个目标浏览器、两个目标 viewport 的 CompatibilityProfile 已冻结；
2. 适用的 L0–L7 测试完成，所有硬门和零容忍不变量通过；
3. 真浏览器、视觉回归与无障碍均有非模拟证据；
4. 格式、色彩、Alpha、元数据、下载重开与错误拒绝矩阵通过；
5. 无阻断缺陷；其他已知缺陷有用户影响、owner、期限和书面接受决定；
6. TestEvidenceManifest 获批准，且未命中失效条件。

正式发布还必须满足 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md) 的 ReleaseManifest、N/N-1、灰度、kill switch、回滚和恢复门槛，以及 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md) 的 G1 门槛。任何一项仍为 `pending` 时保持 0，不得因桌面范围较窄而降低质量或安全要求。
