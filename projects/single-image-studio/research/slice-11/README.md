# Slice 11 workspace

状态：`scope-frozen / projection-case-and-lifecycle-foundation / definition-not-created / results-not-created / calibration-not-run`。

Phase B 已在项目 `scripts/` 中实现 versioned expected projector、lifecycle adapter、strict lifecycle record 与 generic case executor，并以 13 / 13 fake-only tests 验证；测试不调用 Sharp。case executor 将完整 gold 仅交给 versioned adapter，并把 request 精确绑定 frozen source / partition / disposition；rejection 保持 worker-free。当前目录仍只有治理 README；没有 materialized schema、machine record、source wrapper、request、result、图片 bytes、formal holdout、artifact 或产品接线。

范围与硬停止见 [Slice 11 合同](../SLICE_11_CONTRACT.md)，Slice 10 的不可改写失败事实见 [Slice 10 evidence](../SLICE_10_EVIDENCE.md)。在 scope commit 推送、实现完成、results-zero definition 冻结并单独推送以前，禁止执行真实 Sharp calibration。
