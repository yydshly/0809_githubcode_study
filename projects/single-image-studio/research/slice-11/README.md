# Slice 11 workspace

状态：`scope-frozen / projection-case-lifecycle-protocol-and-durable-foundation / definition-not-created / results-not-created / calibration-not-run`。

Phase B 已在项目 `scripts/` 中实现 versioned expected projector / adapter、strict lifecycle record、generic case executor、纯内存 request / terminal / ledger / summary runner，以及 durable claim / runtime observation / oracle facts / atomic publication primitives；27 / 27 fake-only tests 不调用 Sharp。10 份 schema 递归关闭；claim 对同一 request 幂等且冲突时 fail closed；applicable closure 在 intent 后原子发布 output / projection / lifecycle / oracle / terminal / publication 六个文件；pre-rename 失败清理 staging，post-rename 失败保留唯一 closure 并标记 reconciliation-unknown。当前目录仍只有治理 README；测试只在系统临时目录生成 fake closure，没有 canonical schema、machine record、source wrapper、request / result、真实 Sharp 图片输出、formal holdout、artifact 或产品接线。

范围与硬停止见 [Slice 11 合同](../SLICE_11_CONTRACT.md)，Slice 10 的不可改写失败事实见 [Slice 10 evidence](../SLICE_10_EVIDENCE.md)。在 scope commit 推送、实现完成、results-zero definition 冻结并单独推送以前，禁止执行真实 Sharp calibration。
