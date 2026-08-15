# Slice 11 workspace

状态：`scope-frozen / projection-case-lifecycle-protocol-and-durable-foundation / definition-not-created / results-not-created / calibration-not-run`。

Phase B 已在项目 `scripts/` 中实现 versioned expected projector / adapter、strict lifecycle record、generic case executor、request / terminal / ledger / summary runner，以及 durable claim / runtime observation / oracle facts / atomic attempt bridge / operation close；37 / 37 fake-only tests 不调用 Sharp。14 份 schema 递归关闭；request 先以 `wx` 持久化再 claim；applicable closure 原子发布六个文件，worker-free rejection 发布三个文件，pre-worker failure 发布两个文件。runner 等待每个 completion callback 才进入下一 slot；operation 层以 288-event fsynced publication hash chain、runtime start/end observation 与 atomic final close 收口 48×3 临时闭包；重放在首个 request 前阻断，post-rename 不确定性保留唯一 closure 并全局停止。当前目录仍只有治理 README；测试只在系统临时目录生成 fake closure，没有 canonical schema、machine record、source wrapper、request / result、真实 Sharp 图片输出、formal holdout、artifact 或产品接线。central validator 仍未实现。

范围与硬停止见 [Slice 11 合同](../SLICE_11_CONTRACT.md)，Slice 10 的不可改写失败事实见 [Slice 10 evidence](../SLICE_10_EVIDENCE.md)。在 scope commit 推送、实现完成、results-zero definition 冻结并单独推送以前，禁止执行真实 Sharp calibration。
