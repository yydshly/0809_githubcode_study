# Slice 09 definition and registered Gate-B evidence

## Outcome

Slice 09 `@0.9.0` froze its definition and then completed its only registered
open smoke. Both operation decisions are `pass`, but the evidence boundary
remains research-only:

```text
definition-frozen
registered-smoke-closed
normalize-Gate-B-pass
export-Gate-B-pass
calibration-forbidden
non-C1
non-product
```

The definition was frozen at `2026-08-15T15:17:03.776Z` and committed as
`36d92844a2ea58113567a24482e5297ba8cdd9ab`. The commit was pushed to
`origin/main` before any registered request or real Sharp execution.

The first sandboxed generator invocation failed with `EPERM` while creating
the definition root. It left no partial canonical definition or result. The
same frozen input was then materialized once with the required workspace
permission.

## Frozen definition

The canonical tree contains:

- 18 strict schemas;
- 12 source-lineage records: six normalize and six export;
- six independent gold-identity records: three per operation;
- two operation manifests and two preregistrations;
- 36 planned attempts: six sources × three repetitions per operation;
- zero copied image bytes and zero generated results;
- 46 descendants, 47 machine files including the index, and 48 full files
  including the pinned README.

The manifest stores only a closed `{path,id}` gold-identity locator. The
definition index separately pins the complete identity record reference. This
keeps the manifest / identity graph acyclic while retaining exact content,
file, pixel, source and manifest identity checks.

## Core pins

| Item | SHA-256 |
| --- | --- |
| definition index content | `57de0c3d91d1945af61e052d8efda35dbe4dbb19714149e21dd17f949d8a00dd` |
| definition index file | `1303bdeca50a69918b58444efd0a540c20ee8eaf98c565b857fcae54112906c0` |
| descendant tree | `6523a3f9618bf18f669561a4789f4b23162d848402bc465ce94e1a783d7c597c` |
| schema tree | `1809f69199c9308c2799d8755892ed64e4fa60948827d516a5ab87b020cc83bf` |
| full definition tree | `a1c06dc040987b74ff457ec7e4670bfe5a081f6f99f50a4a695b3a8fb65bc6b1` |
| pinned README | `8c3a306cd090e4c117ad3ab77878575eb663358e609a31a1dd201ac75fbf7f48` |
| generator implementation | `3e1ac2c7cfe34c053281394b4451a6d594d1dd43f73a4943231889b7f62c75c9` |

Important record content / file SHA-256 pairs are:

| Record | Content hash | File SHA-256 |
| --- | --- | --- |
| candidate | `3e473dff9434d25d7d97bb577543ca18d6e771988d6b4184c776a179fa16885c` | `301237afdc9589a6862427e40977f96ea954009c3ffb3a0fd00e47b12d86cd82` |
| normalize contract | `9788a9cb9c9c539f502a2f01695be3f74d0a70868b44f6807561a8eb39d3fee5` | `895c51fde2224f69c8e999b68382090e12c023cc6f75dfa1950f33c48c2bee86` |
| export contract | `4bfd1de8baa2d312f68e208a1dc982b45e05c6ee252dbdfbc76085765544794e` | `71dc2ac0d6362a8a6415093d8c15b28296c04e0cfa6bfe1f6322685f136f974d` |
| runtime attestation | `be963d57e22744f760ec54cac7b83904ebe3878c4ec8e25b958aa1015ad8a3e5` | `4ee8d8a1bf356412a4ca5bbd9e42f242d94c997b45f348dfc50314ddb697d446` |
| Gate-B plan | `aea2d439720b21197f7d48538d8496422e955bb6017e5445612187dddb59463b` | `6d1fecc7a40b7f736ac4a73930740aa458017005957254b781345ef064a70277` |
| normalize preregistration | `ce09e9f42da9482a4b2fdaaafbdf5781d9aec6678fa219b96d2f51d2d43fc127` | `10e7bde5e9fa8c18538d10e8ded43dd8df430fc9aa011413a229aeb67feda0b2` |
| export preregistration | `4022d2aad1a59b6cf8e1bd2fdad5f1b644cc59c1b238a4fbf630231a8bb8255b` | `ecf03a17e832c8f855b30a2b65df67d07dc27c5addfe861b48c487fb5f17ef38` |

## Verification

The production central validator reports:

- `valid=true` and `issues=[]`;
- `pinsVerified=true`;
- `runtimeRechecked=true`;
- `regenerationVerified=true` from two fresh byte-identical temporary trees;
- an exact non-null definition reference;
- a strict, valid post-run closure after the registered result commit.

The seven Slice 09 suites pass `34 / 34`. Full `npm.cmd run verify` passes
`427 / 427`, including syntax checks. Adversarial coverage rejects unknown or
extra files, empty directories, an early result root, schema drift, self-hash
laundering, runtime drift and definition regeneration mismatch.

## Registered result closure

The first registered command was denied by the sandbox at the initial
`results/` directory creation with `EPERM`. It created no directory, request,
claim, ledger event or selectable outcome. After confirming the worktree and
result root were unchanged, the exact command was executed once with the
required workspace permission. That is the only registered invocation.

The immutable result commit is
`c91014c6bef8878277a8520d003b10684972087b`. The registered interval is:

- normalize: `2026-08-15T15:40:41.952Z`–`2026-08-15T15:40:45.872Z`;
- export: `2026-08-15T15:40:45.954Z`–`2026-08-15T15:40:50.487Z`.

The closed `research/slice-09/results` tree contains 186 regular files in 29
child directories, totals 312,983 bytes, and has tree SHA-256
`2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451`.
It includes 36 requests, 36 claims, 36 terminal results, 18 identity-bound
artifact closures, 18 PNG outputs, two 54-event ledgers, two summaries and two
decisions. There are no replacements, protocol failures, non-pass attempts,
staging remnants or extra result subtrees.

| Operation | Applicable artifact pass | Exact rejection pass | Source 3/3 pass | Decision |
| --- | ---: | ---: | ---: | --- |
| normalize | 9 / 9 | 9 / 9 | 6 / 6 | `pass` |
| export | 9 / 9 | 9 / 9 | 6 / 6 | `pass` |

All nine applicable attempts per operation have independent oracle pass,
confirmed worker exit and byte/pixel identity bound through the frozen gold
identity. All nine rejection attempts per operation return their exact frozen
code before artifact publication.

Durable result pins are:

| Record | Content hash | File SHA-256 |
| --- | --- | --- |
| normalize summary | `b84bade6bf4a263e709e1b36b639befd4224b004c76f6a492de9b3b86067d549` | `f66212eaf24fea16980f55635d6905830748da2f3efbb75400f577227e85ed38` |
| export summary | `43e5d21ec4be3e911fd2674ee9dcb1dca3764dfd4d0e63f45d4835c4a1422d39` | `29dd894e6e6ddaf7b38867c11d9e759ef8a2472b119f441f17344b387fe5260b` |
| normalize decision | `6f90fcb9e954ab3cc408d129f59966ebe77a38ca5789ca4582e05b95d406e3cc` | `e6e0ff5887f1bc2e4de0442f19e1c670e3ef5f907addf376ee158474577054d5` |
| export decision | `572c76a5e194b2ce3dc8800088a5da8bed60efb6697f6306bad3b9d029a840e6` | `52fdb53381ce70a37bf73bc9bec392a51d4944c119ffdd633f8013b36c62999c` |

The normalize / export ledger file SHA-256 values are
`bd361984a6665bdc98f989b421f923143a267f490bb3f02cc66e8920fa722e82`
and `06f2b6dd9ed8c08c33d8dfe8748e1498930cc2608b0db582c659d3ab0cc5b270`.
Their tail content hashes are
`239c2fff8c1bb09bd2e3874566b428e2eb2ae40984e4475c8deb23ddb5baee8d`
and `c050c014be4092f8285c1fdf92434936fed15c4c2b79b69dc11fff017027ac81`.

The central post-run validator independently reopens the complete closure and
reports `valid=true`, `issues=[]`, `generatedResults=186`, with both operations
valid. The seven Slice 09 suites pass `34 / 34` after the canonical lifecycle
test was updated to require this exact post-run closure rather than the earlier
results-zero state.

## Authorization boundary

The registered open smoke is closed and must not be rerun or selectively
supplemented. Although both Gate-B decisions pass, each record intentionally
keeps `calibrationAuthorized=false`; calibration needs a separate next-slice
authorization and frozen plan. Formal holdout, defect-holdout, escape, product
UI/server integration and release material remain absent. All evidence axes
remain zero, `productSupport=false`, and release is `none / 0 / 0`.
