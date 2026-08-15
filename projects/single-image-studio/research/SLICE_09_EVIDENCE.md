# Slice 09 definition-freeze evidence

## Outcome

Slice 09 `@0.9.0` is frozen at the definition boundary:

```text
definition-frozen
results-zero
Gate-B-smoke-not-run
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
- `postRun=null` because no registered result exists.

The seven Slice 09 suites pass `34 / 34`. Full `npm.cmd run verify` passes
`427 / 427`, including syntax checks. Adversarial coverage rejects unknown or
extra files, empty directories, an early result root, schema drift, self-hash
laundering, runtime drift and definition regeneration mismatch.

## Authorization boundary

No real Sharp worker, request, claim, ledger, artifact closure, summary or
Gate-B decision was created in this freeze. Calibration, formal holdout,
defect-holdout, escape, product UI/server integration and release material are
absent. All evidence axes remain zero, `productSupport=false`, and release is
`none / 0 / 0`.

The only next authorized state change is the single registered Slice 09 open
smoke, after a fresh clean/pushed admission check confirms this exact definition
commit and an absent result root. It is not a retry of Slice 08 and must not be
rerun or selectively supplemented.
