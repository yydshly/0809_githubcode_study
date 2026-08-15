# Slice 05 定义冻结与真实 smoke 证据

> 记录日期：2026-08-15。Slice 05 机器定义于 `2026-08-15T04:23:38.389Z` 冻结；唯一注册的真实 Sharp smoke 于 `2026-08-15T04:52:05.490Z` 至 `2026-08-15T04:52:10.426Z` 运行并关闭为 non-pass。当前状态是 `definition-frozen / smoke-closed-non-pass / Gate-B-denied-not-entered / calibration-forbidden / non-C1 / non-product`。

## 结论

Slice 05 已在 [范围合同](SLICE_05_CONTRACT.md) 授权的边界内完成**定义冻结和一次注册 smoke**。normalize 与 export 仍是两个独立 operation，但两份 Gate B decision 都是 `denied-not-entered`，两者 `calibrationAuthorized=false`。本版本已经关闭，不得运行 calibration、选择性重跑或用未注册调用覆盖结果；smoke 结果也不能进入未来 C1 分母。

以下状态没有改变：

```text
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
formal holdout/defect-holdout/escape=not-created
formal bundle/request/receipt/result/EvidenceManifest=not-created
```

定义冻结测试中的 fake executor、临时 smoke / calibration closure 和对抗 mutation 只验证本地协议与 fail-closed 行为；它们不调用 Sharp 像素管线，也不是 Gate B 或 calibration 结果。本文后续单独登记的 `results/open-smoke/` 才是唯一注册的真实 smoke；它是 non-pass 负证据，不是能力证据。

## 定义根与完整性 pins

冻结 definition 位于 `research/slice-05/`，DAG 根为 `definition-index.v0.5.0.json` / `DEFINITION-INDEX-SLICE05@0.5.0`；后续 `results/` 是独立运行树，不进入以下 definition pins。

| Pin | SHA-256 / 数量 |
| --- | --- |
| freeze UTC | `2026-08-15T04:23:38.389Z` |
| definition index `contentHash` | `d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271` |
| definition index file | `8cbf1f0aaf018c54b95eaa5ef0f3a2f6cb11dc60529ea569408496514d582d96` / 108012 bytes |
| descendant machine tree | `8b340918e423043538997250c63b9b49b175b2d2b349c4835de48dd017ed82c0` / 366 files |
| schema tree | `8b5170c4026c930d4ac98e903d9b58902589869971f1fa013637c70eae6ebca6` / 25 files |
| frozen full definition tree（results absent） | `108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2` / 368 files / 36 directories |
| Slice 05 prose README | `1a22e17fb57cd23ab19da5e97fb2ed909dd4793e8800047371f8cf7bfd9330a7` / 4762 bytes |
| independent fixture generator | `bb636fc7cc9ab98c569a0d8d05ad0c27eaecbe6121762c2e19921258b25ff18d` |

tree hash 统一使用按 project-relative path 二进制排序的 `path + NUL + decimal byte length + NUL + file SHA-256 + NUL` 输入。definition index 为避免自循环而不进入 descendant tree；`README.md` 也从 descendant tree 排除，但以精确 byte length / file SHA-256 单独纳入 index 的 `contentHash`。冻结 full definition tree 包含 index 与 README，但不包含运行后才建立的 `results/`。

## 候选、合同与运行环境

| Record | ID | `contentHash` | File SHA-256 |
| --- | --- | --- | --- |
| installed runtime candidate | `REG-NORM-SHARP@0.5.0` | `bdd132233878decdf009919927290f1ba230d449f564d1b454966a33134acc8c` | `c117dc0717d436ef82a5102aa21885e80eca3acdd23c38a706dd1bd730c4c30e` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.5.0` | `48c3a5ec40798289ed66605ffdd80d08acdb8c8910540727a5f4ed08574beb01` | `78a7842095cd877bfa7b3388d4f960b5f37612a7827a9d763d19a947247dd068` |
| export contract | `CC-CAP02-EXPORT-PNG@0.5.0` | `9158ec6b07c3a877976fa48c5001a9f3c65ef746d5d1a99dca74696d58c1d278` | `c994b2307e8fc44a5078f864a3ac0c2d91c5a103967e29befee4640456074903` |
| runtime attestation | `RUNTIME-SHARP-WIN32-X64@0.5.0` | `8cc1073efbe5458aec8c49091554337061d64ebfa0fdb2654e0f3b2f89c18e47` | `acb3ba370b05c252ec6c4b2f237c10f54d8f31fa4c5cc75d98145ed8e5e80dc3` |
| named hardware | `HARDWARE-WIN32-X64@0.5.0` | `634ec49c338b7cff36b0d012070620b1b8b38cc9031cdc54f678619ade35528b` | `c9b4070a6219c91cccdb03a02496adc0f555e09d80a5dedde87c2717ebd47fbf` |
| open synthetic rights | `RIGHTS-OPEN-SYNTHETIC@0.5.0` | `fb49eb91058d4e2b355b5dc83c45125e0523bcfbc1ac19d951622565e1d11beb` | `afa997d4b52394b635dc3549b3eb12921268d0b302d410565b8bbef2015159e4` |

`REG-NORM-SHARP@0.5.0` 是实际安装闭包候选；它明确引用 Slice 04 的不可变来源 metadata `REG-NORM-SHARP@0.4.0`，没有覆盖历史记录。两份 `@0.5.0` 合同 pin operation artifact schema、candidate adapter、isolated worker、independent oracle、local runner、hardware / runtime、failure semantics 与禁止 fallback / passthrough 的边界；其冻结时 `gateB` 状态为 `not-evaluated`，后续真实 decision 均为 `denied-not-entered`，不回写冻结合同。

runtime inventory 的冻结事实为：

- `package.json` 只含 exact devDependencies `sharp@0.35.3` 与 `@img/sharp-win32-x64@0.35.3`，SHA-256 `8040895e4ed38f38b354a6e7431e5763027d3c8e15713d0dd5562b5a69dfdedb`；
- `package-lock.json` 为 lockfile v3，SHA-256 `16963d711f878ea6295a278310e3aad579d099a60f1b5e73a6a91d26dc485a2c`；
- 实际 installed allowlist 只有 `sharp`、`@img/sharp-win32-x64`、`@img/colour`、`detect-libc`、`semver`；空的 scope directory 被忽略，额外 package、WASM、native、exe 或 archive 会 fail closed；
- installed package tree SHA-256 为 `a419af3606ca38f1878acb65d1ea273f0c129b0c156686b1e912bab1b167070e`；三份 native file 分别逐 byte pin；
- actual `versions.json` 与 `sharp.versions` 的 28 项 runtime version 精确相等；同时如实保留 Slice 04 packaging metadata 的 9 项非致命差异，不把旧 metadata 改写成运行事实；
- inventory payload SHA-256 为 `4fa94c4c225c8ec18abe2751cf4b2344bb643377750503df45a3c65bcfcd0972`；只为读取 `sharp.versions` 导入 Sharp，没有读取、解码、编码图片或调用 candidate pipeline；
- hardware profile 记录 Windows x64、CPU / logical processors、RAM、Node / npm / ABI / N-API，但不记录 hostname 或 serial；它是本次命名机器事实，不是可移植性或 O1 声明。

`node_modules/` 是本地生成依赖目录，不进入 Git 或 definition tree；提交的是 exact dependency declaration、lockfile、runtime attestation 与 project-original research code / synthetic assets。没有模型、checkpoint、真实照片或第三方图片进入本切片。

另有一项**动态、非冻结**的依赖安全观测：`npm.cmd audit --omit=optional --json` 从 `2026-08-15T04:40:58.503Z` 运行至 `2026-08-15T04:41:00.846Z`，exit code 0、`auditReportVersion=2`；当时 `info/low/moderate/high/critical/total` vulnerability counts 全部为 0，dependency metadata 为 `prod=1 / dev=32 / optional=27 / peer=0 / peerOptional=0 / total=32`。该结果只表示 npm advisory 在该时刻对当前 lockfile 的 live response；它会随 advisory 数据变化，不纳入 canonical definition pins，不替代逐 package 许可 / provenance / runtime inventory，也不授予 Gate B、G1 或发布资格。

## 开放定义资产与分母

| Manifest | Sources | Applicable / rejection | Planned repetitions | `contentHash` | File SHA-256 |
| --- | ---: | ---: | ---: | --- | --- |
| normalize smoke | 6 | 3 / 3 | 每来源 3 | `792c7f641d26a9d5a30bb612e780683da8f58631ba56c46dedd717d7be1fb956` | `3aebda4055b08716560b8370d6a5c2806615cb28062c7210ac9ff470e5d63ebf` |
| export smoke | 6 | 3 / 3 | 每来源 3 | `83450daf67bf38c92cb5d92487ff541de36082e0b45433d4853523d5efcd286f` | `086c2d4bbda038f2026ce71848d834bdf7368cac46438e3e254127c697c9fd19` |
| normalize `dev/calibration` | 30 | 18 / 12 | 每来源 3 | `07b5a4ac1fd5e87c3c1d90f9eefd9ae1f97cdb5abbe816b59272397b8cd6ee7a` | `24db63148e59ef5362e3450bbc167b18b3d36bdbbe3684b15f205c1084aa6252` |
| normalize `defect/calibration` | 18 | 6 / 12 | 每来源 3 | `bce45a34550d8c4f9ad49fc306a7ad4bfc171be9ed15ca9db1c7ec50ca1369dc` | `c625b5a92aa09d62683fd70c60b0ba13462b8d559f6830a9966a553f71922304` |
| export `dev/calibration` | 30 | 18 / 12 | 每来源 3 | `1139c316250e5040b740bb8ea49b757c66c7e5fcad46c895d979b323749b6daf` | `a59117cb448b0aba5f2a08a993161b1a0dea91f612ab3001a52c1ebf764da8e0` |
| export `defect/calibration` | 18 | 6 / 12 | 每来源 3 | `40f2638d1145ce5f54aed277e563243ddd3fac249a79d7609208052974deffea` | `cde0031d585a32ea82bc9be718c8d0198508dc9eef08c337954557d4b5328526` |

定义树共含：

- 25 份 strict schema；
- 6 份 operation-specific manifest；
- 108 份 source provenance record 与 108 个项目原创 raw open asset，其中 12 个用于 smoke、96 个用于开放 calibration；
- 54 份 export `NormalizedImage` 输入 artifact record，全部 truthful 标记实际 producer；
- 54 份独立 gold record，只覆盖事前定义的 applicable / control；gold 不由 candidate 生成；
- definition freeze 时为 0 份 result、admission、ledger、summary 或 Gate B decision；后续 smoke result tree 与冻结 definition tree 分开保存。

normalize 与 export 的 family、session、source ID 和 manifest 全部隔离。export 的输入由 independent fixture generator 建立，不用 normalize candidate 输出生成 gold。所有 raw / artifact / gold bytes 都由不依赖 Sharp 的 project-original `crypto` / `zlib` generator 构造并经独立 oracle 自检。

## Gate B、计划与预注册

| Record | ID | `contentHash` | File SHA-256 |
| --- | --- | --- | --- |
| Gate B smoke plan | `GATE-B-SMOKE-NORMALIZE-EXPORT@0.5.0` | `2f8a889d87ca3e66829b47d204d41973f9b495a1770eeb871f393155bf9630f2` | `9468fa36d3c6e6bfc5069346e9759c0e0e78f0a82402029b738d89141ade9531` |
| normalize open partition plan | `PP-NORMALIZE-PNG@0.5.0` | `07896b0e9c9e2fc9bb8caa79f9a219875e2dc935d8d05ba86664b1e7ffcb9344` | `83feee14ccd8b39d19dfad2a6806b6b2cbeaaed0a170eafb0c11dfd4346a748e` |
| export open partition plan | `PP-EXPORT-PNG@0.5.0` | `5e1bf56908bf5c62235142478b3fa07f413c0fa0fdc540b9c6cc1e49a1732333` | `99898c8dcc94802b5050b6938306ed8172a2d35fe5dbb3200d7c901738d1133d` |
| normalize calibration preregistration | `PREREG-CALIBRATION-NORMALIZE-PNG@0.5.0` | `b825a2e52a5ed3727d4f27952b0515e43cfa2194fcfab0d459400b0c2943c115` | `d7a340f61f1ae1c0723779fd0175432a8e3b9b087f732de76d57ea82fabe205f` |
| export calibration preregistration | `PREREG-CALIBRATION-EXPORT-PNG@0.5.0` | `a9b7f85b4e408b6e0f16814afb5196f3d46fae84db65a51929e4c31d47486713` | `e528523f104a59a7b180d143b6665952f227339e9077decb02deead168e53a99` |

Gate B plan 为 normalize / export 各自固定 6 个 smoke source、逐 case expected disposition / exact error code、12 个 all-conjunctive gate、implementation / runtime / hardware / schema / manifest pins 与 result protocol。其冻结时状态是 `not-evaluated`；没有跨 operation 汇总字段可以把一项结果转授另一项。实际运行后两项分别作出 `denied-not-entered` 决定。

两份 calibration preregistration 已冻结开放 30 + 18 来源、每来源 3 次 planned repetition、错误 / no-result / replacement / denominator 语义，但当前版本没有任何 operation 通过 Gate B，`calibrationAuthorized=false`，所以这 96 个来源 / 288 次 planned repetition 全部禁止运行。正式 holdout、defect-holdout 与 escape 没有 manifest、asset 或 result。

## 唯一注册真实 smoke 结果

定义基线提交并推送后，首次调用因 sandbox `mkdir EPERM` 在任何 request、claim 或 result 建立之前停止。该调用没有进入注册分母，也没有留下可选择的 terminal outcome。随后获批的调用是**唯一注册 smoke**，不是看过结果后的选择性重跑；本版本不得再次运行以替换或挑选结果。

唯一注册运行的持久化边界为：

| 项目 | 精确事实 |
| --- | --- |
| 运行区间 | `2026-08-15T04:52:05.490Z` 至 `2026-08-15T04:52:10.426Z` |
| result root | [`slice-05/results/open-smoke/`](slice-05/results/open-smoke/) |
| result tree | 116 files / 8 directories / 357303 bytes；SHA-256 `e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b` |
| attempt records | 36 requests / 36 claims / 36 terminal results；两项 operation 各 6 sources × 3 repetitions |
| durable ledger | [`events.ndjson`](slice-05/results/open-smoke/ledger/events.ndjson)，72 events；file SHA-256 `7bcb9f3f2eded4aaedc59a6fc2473b6ad711ba3dc9a2ad00eaf162dd57b28d6a`；tail `contentHash=f8f2fe5e0356a801cbd59670c16d79dba976d2338a297e6e917a3f5ebf581828` |
| published artifacts | 0；没有 PNG、artifact record 或 oracle result 被发布 |
| calibration material | 0；`results/open-calibration/` 不存在 |

operation 结果与 pins 为：

| Operation | Summary | Attempt 结果 | Gate B decision |
| --- | --- | --- | --- |
| normalize | [`normalize.smoke-summary.slice05.v0.json`](slice-05/results/open-smoke/summaries/normalize.smoke-summary.slice05.v0.json)；`contentHash=4e03ecfcfc917bb5fc23ba50064f2876e75ce44c3a8a6e149b2d2e883d0652ec`；file SHA-256 `391fe2284dd05c2aff178b28bbf9eab3598ada0545fde3cc5cf9c0bc8df13a41` | 6 pass / 12 non-pass | [`normalize.gate-b-decision.slice05.v0.json`](slice-05/results/open-smoke/decisions/normalize.gate-b-decision.slice05.v0.json)；`contentHash=4f3c428ce3d9674054fe66e04dae8ec8a5157a666335d81694e570cd1f2a84e1`；file SHA-256 `42e69ef94d90c224e977052dee373f1d1d65a4fbedfc6b147a6a1336e150f71e`；`denied-not-entered` / `calibrationAuthorized=false` |
| export | [`export.smoke-summary.slice05.v0.json`](slice-05/results/open-smoke/summaries/export.smoke-summary.slice05.v0.json)；`contentHash=4d9f369f971e75ebf45e8c5b91d439503a9c212a365343dade7de49c19cfa6fd`；file SHA-256 `de76d6e038570b9a20977460176086484efcfda7ad473a8e15f35a2a1d625aa3` | 9 pass / 9 non-pass | [`export.gate-b-decision.slice05.v0.json`](slice-05/results/open-smoke/decisions/export.gate-b-decision.slice05.v0.json)；`contentHash=583307cd0d3d97876b54eb3b4c0dd3cc14c40536d53d2d8e25604c8bc7faa0ba`；file SHA-256 `201b017b12654b6c14c16599f04293aa868ba553804faa7928044674162e5227`；`denied-not-entered` / `calibrationAuthorized=false` |

normalize 的 9 次 applicable attempt 全部以 `S05_OUTPUT_ORACLE_REJECTED` 结束。三个预注册 rejection source 中，CRC 与 source declaration 两组共 6 次按预期 pass；sRGB 组 3 次预期 `S05_INPUT_SRGB_REQUIRED`，实际却为 `S05_INPUT_CHUNK_PROFILE_INVALID`，因此 non-pass。export 的 9 次 applicable attempt 也全部为 `S05_OUTPUT_ORACLE_REJECTED`；三个 rejection source 共 9 次全部按预期 pass。两项合计 15 pass / 21 non-pass，不能跨 operation 汇总为 Gate B 判断。

[`fault-semantics-result.slice05.v0.json`](slice-05/results/open-smoke/fault/fault-semantics-result.slice05.v0.json) 的 6 / 6 场景通过，`contentHash=b58fd247a3f399aeeaf175829c816a6e2d842cfbe77037f3906a6ce64d26c3d1`、file SHA-256 `19dfad18c3fa11e032ae346bf06f8063e8066c64a185199e8a72282df7526d91`。两份 summary 中 invalid no-result、timeout、cancelled、unknown reconciliation 与 replacement counts 全为 0；false allow / false reject 也均为 0。fault semantics 通过只证明预注册的故障协议工作，不抵消 applicable 与 rejection-code non-pass。

真实 smoke 的只读审计严重度为 `P1/P2/P3 = 0/2/0`。第一项 P2 是 18 次 applicable output 只留下 generic oracle rejection：失败 bytes、底层 oracle subtype、worker telemetry 与三次输出确定性没有持久化，无法离线定位 output-profile compliance；第二项 P2 是 normalize missing-sRGB 的实际错误码与冻结预注册不符。没有 P1 是因为 runner / oracle 正确 fail closed、没有错误授权或 artifact 发布；这不降低两项 Gate B non-pass 的阻断性。

持久化记录只支持这一最窄结论：worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝，因此没有 artifact 发布。进程退出确认未持久化（`workerExitConfirmed=null`）；terminal result 也没有保留 oracle 的具体子错误或足以重建该诊断的 worker / oracle payload，所以具体拒绝子因是 **unknown**。不得根据源码、环境或再次运行补猜历史原因。下一版本须同时纠正输出 profile 行为与 normalize sRGB rejection code，并把 worker / oracle 诊断持久化；这要求新的 candidate、contract、preregistration 与 definition freeze，不能原地修改 `@0.5.0`。

## 验证结果

最终 canonical 定义封口后的已运行检查为：

```text
central Slice 05 suite: 40/40
independent oracle suite: 15/15
generator + runtime inventory suites: 11/11
targeted runner + adapter + generator + oracle groups: 57/57
central validator CLI: valid=true; issues=[]
post-smoke full npm.cmd run verify: 228/228; research validators + syntax check passed
unresolved definition-freeze P1/P2/P3: 0
```

这些数字有重叠，不能相加：`57/57` 由 runner 19、adapter 18、generator 5、oracle 15 组成；`11/11` 由 generator 5 与 inventory 6 组成；oracle 的 15 项也单独列出以说明 independent decoder / provenance 覆盖。central 的 40 项另覆盖完整 definition DAG、fake 36-attempt smoke closure、fake normalize 48-source × 3 repetition calibration closure及其 adversarial mutations。fake closure 全部位于临时目录，结束后不构成 canonical evidence。真实结果写入后，测试临时副本默认排除 canonical `results/`，仅 post-run 专项显式保留它；该 test-harness 隔离修复不改 scripts、definition 或真实 results。这里的 P1/P2/P3=0 是 definition freeze 当时的审计结论，不覆盖后续真实 smoke 暴露的输出拒绝、错误码不符与诊断缺失。

定向测试验证的 fail-closed 范围包括：runtime package / lock / native / versions 漂移、额外 package / WASM / native / executable / archive、路径逃逸、schema 松绑、未登记文件、README-only 篡改、operation / family / session 交叉、manifest / gold / artifact provenance 漂移、错误码漂移、producer taint、幂等冲突、publication crash / reconciliation、分母删除、summary 自报、runtime observation 漂移、跨 results root 混用，以及把 smoke / calibration 写成能力或正式证据。

这些自动检查只证明研究定义和执行协议在已覆盖条件下保持一致。后续真实 smoke 又只证明 `@0.5.0` 在该冻结分母上 non-pass；它不证明 Sharp 输出获得 oracle 接受、PNG 已获产品支持、质量达到 C1、O1 / G1 成立，或用户可以使用该能力。

## 下一步与硬停止

1. `REG-NORM-SHARP@0.5.0` 与两份 `CapabilityContract@0.5.0` 已关闭为 non-pass；不得删除、改写或选择性重跑现有结果，也不得运行 normalize / export calibration。
2. 下一尝试必须使用新的 candidate、contract、adapter / runner diagnostics、preregistration 与版本化 definition tree；修复目标至少包括输出 profile、normalize sRGB rejection code 和 worker / oracle 诊断持久化。
3. 新版本重新冻结并取得不可变 Git baseline 后，才可从头运行其自己的 operation-specific smoke；仍须分别判断 normalize / export，不得继承或汇总。
4. 只有未来新版本某一 operation 的全部 Gate B conjunct 同时通过，才可运行该 operation 的开放 calibration；另一 operation 继续阻塞。
5. 现有 smoke 结果继续只属于本地开放研究，不能改写全轴 0、`productSupport=false` 或 formal material `not-created`。正式 holdout / defect-holdout / escape 仍禁止创建。

Slice 05 当前下一动作不是建立 formal holdout，也不是扩展 UI、Matting、SourceCard 内容理解、真实照片、模型权重或其他格式。
