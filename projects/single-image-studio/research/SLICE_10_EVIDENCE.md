# Slice 10 开放 calibration 结果证据

## 结论

Slice 10 的唯一 registered open-calibration invocation 已于 `2026-08-15T18:34:17.311Z` 开始，并在首个 normalize applicable attempt 于 `2026-08-15T18:34:17.387Z` 写完 terminal ledger event 后关闭为 `protocol-failed`。同版本不得重跑。

实际闭包只有 1 request、1 claim、1 terminal 与 2 个 ledger events；export 未注册，summary、runtime-end、artifact、candidate output、oracle、publication 与 calibration decision 均未创建。计划分母仍为 96 sources / 288 attempts，但实际只注册并终结 1 / 288；不得把未运行的 287 个 slot 当作 pass、missing-at-random 或可补跑样本。

失败码为 `S10_EXPECTED_OUTPUT_INVALID`。只读源码追踪确定：Slice 10 case driver 把含 `fileSha256`、`mime`、`parentIdentity` 的完整 gold expected object 直接传给 Slice 07 raw adapter；后者的 `validateExpected()` 只接受 12 个 canonical output keys，并在 `spawnWorker()` 之前 exact-key fail closed。因此没有 Sharp child worker 或候选输出被创建。

同时发现一项独立证据完整性错误：Slice 10 的 `remapWorkerError()` 对所有 Slice 07 error 无条件记 `workerInvoked=true`，所以不可变 terminal 与实际 pre-worker 路径矛盾。中央 post-run validator 因 `RESULT_WORKER_LIFECYCLE_INVALID` 返回 overall `valid=false`；它仍可重算 request / claim / terminal self-hash、两事件 ledger 链、冻结定义和结果文件树。当前 result audit 为 `P1/P2/P3 = 2/0/0`：一项是 execution expected-shape 协议不相容导致整个分母无法运行，另一项是 durable worker lifecycle 失真。

## 不可变提交顺序

| 阶段 | Commit | 事实 |
| --- | --- | --- |
| results-zero definition | `86543a47bb5eea6a287861bf587fbffc3014ba1f` | 183 files / 22 schemas / 96 sources / 288 planned attempts / results 0 |
| post-run audit gate | `412e75d9897478869ce32de2e21fbbc1c99c911d` | 完整 288-attempt fake closure、global-stop prefix、目录、ledger、oracle、summary、runtime-end 与篡改负例；479 / 479 verify |
| immutable registered result | `13c40fce4404929104cbfd39048b47e1fd203e71` | 原样保存唯一 invocation 的 4 个文件；没有修写 terminal、没有补跑 export |

运行前 `HEAD == origin/main == 412e75d9897478869ce32de2e21fbbc1c99c911d`，worktree clean，`research/slice-10/results` 不存在；中央定义验证为 `valid=true`、`pinsVerified=true`、`runtimeRechecked=true`、`regenerationVerified=true`。

## 冻结定义 pins

- frozen UTC：`2026-08-15T18:03:39.680Z`
- definition content / file：`1b0ecac1b1d8b2320fc95fd92f53bf4ebdae79e7879be910d0c232cfeb56bcbc` / `c2b7ae163a1cd68656e16d97b00cacd295182b80ed1ae9021d9dc28b414b13c3`
- descendant 181 tree：`dc1cea563e069a645039c7f22b54eb34de298db45d3047703fdef333e1c80e8a`
- schema 22 tree：`ee7415e36739dea08b128c590741d40c9340a3e24cef72856a2912238923e24c`
- full results-zero 183 tree：`0250a743487d681e4282909a21804e142901e536dfc8a8ebee31a17f66cdd532`

## 结果树

- registered operation runs：normalize `1`；export `0`
- terminal attempts：`1`；pass `0`；non-pass / protocol-failed `1`
- applicable closures：`0`
- files / bytes：`4 / 6,919`
- result file-tree SHA-256：`225847d125c58ee6affaa087746101d469d7ae04109504f0bd6781f593b9ee9e`
- normalize subtree SHA-256：`6ec14a4d9cf140726d0cca4c466c8ad813fcb864f0999d1081730163469e56c6`
- ledger events / tail：`2` / `193e8af97dacb24b5fb4dd476662d7ecec4dd8f235f7bdb111258b735e822fa0`

| File | Bytes | File SHA-256 | Record contentHash |
| --- | ---: | --- | --- |
| `normalize/requests/request.s10.normalize.s10.normalize.dev.001.r1.a1.json` | 3,052 | `2d0f32fe64fa830b0311855beeb0d9837262e43c57eb38126e87f2fede629b98` | `d63655c057f0df6543f208853d4abaa4deb5ddbae45a68a99b7da1dc890aa02a` |
| `normalize/claims/request.s10.normalize.s10.normalize.dev.001.r1.a1.json` | 881 | `043f6156592f4db2c581e93de462f8b0a678542932624d3807ede8fe38765ec7` | `bd501a2ec98e32a6098e07e6534af3841bf7481af74f62e47e54d8b061efde8a` |
| `normalize/terminals/request.s10.normalize.s10.normalize.dev.001.r1.a1.json` | 1,081 | `cbe17ac9fbf3ea98a3ac1e404ac4a9b2b8f73ba2d4475b94baa79f0716820184` | `addaa7a928f40724632704610b44f0515ef4f17cb63975a34a81ed257032524d` |
| `normalize/ledger.ndjson` | 1,905 | `4ada8199a5e577869dec698f71af19a89ea5e88f4e49090a17fe71dbf1c0187a` | event 1 `49ba1ee4f63a3e72e32de150359b80f8b8627566deccbf208c645b6b5eaa6877`; tail见上 |

## 中央复核

中央验证继续确认 results-zero definition 的 literal pins、fresh runtime 与 deterministic regeneration 均未漂移。post-run 部分确认：

- 4 个文件均为 canonical bytes，3 个 JSON record self-hash 与 2 个 ledger event self-hash可重算；
- request / claim / terminal identities、idempotency、时间顺序、payload SHA 与 ledger predecessor chain 闭合；
- terminal 为全局停止状态，因而 export、summary、runtime-end 与 artifact closure 不得出现；
- file-tree digest 可重算为上述固定值；
- terminal 的 `workerInvoked=true` 与 `S10_EXPECTED_OUTPUT_INVALID` 的静态 pre-worker control flow 冲突，因此最终审计必须 fail closed，不能以“结果树结构闭合”替代 lifecycle 真实性。

## 后续硬边界

Slice 10 已永久关闭。不得删除或改写这 4 个文件，不得再次执行 `--execute-registered-open-calibration`，不得补跑 export，也不得把此次失败解释为候选像素质量结论。

若继续，必须新建 Slice 11 / `@0.11.0`：冻结一个明确的 `gold expected -> raw adapter expected` 投影合同，并让错误映射保留真实 `workerInvoked` / `workerExitConfirmed`；在新的 results-zero definition、中央负例、提交与推送之后，才可注册新的完整分母。formal holdout 仍为 `not-created`，C1 / U1 / E1 / R1 / O1 / G1 / V1 继续为 0，Release Gate 仍为 `none / 0 / 0`，`productSupport=false`。
