# Slice 09 workspace

Current state: `definition-frozen / results-zero / Gate-B-smoke-not-run /
calibration-forbidden / non-C1 / non-product`.

The governing scope is [SLICE_09_CONTRACT.md](../SLICE_09_CONTRACT.md). Slice 09
does not modify or replay Slice 08. It creates a new versioned gold-identity
boundary because Slice 08 stopped before its first worker when the driver read
`id` from a record whose frozen key is `goldRecordId`.

The first project-original implementation is
[`research-gateb-gold-identity-slice09.mjs`](../../scripts/research-gateb-gold-identity-slice09.mjs).
Its closed schema and runtime validator bind the exact record/file/pixel/source
identity and expose only `goldRecordId` plus frozen expected facts to the
applicable branch. Tests read the actual immutable Slice 05 gold JSON and pass
6 / 6; `.id` fallback, dual-key records, self-rehashed drift and rejection-side
gold access fail closed. Source/test SHA-256 values are
`2ae836fc9f0f85ce5b4a0adaf19f4f44e8bc2975f1fb0479a2aa289c4dd8365a` and
`d231f57e7fee02677ecadc55a51446a0c8653e3a994b8d7761915ba95b59000e`.
The repository-wide `npm.cmd run verify` passes `399 / 399` after adding this
layer.

Phase B now also adds
[`research-gateb-case-context-slice09.mjs`](../../scripts/research-gateb-case-context-slice09.mjs)
and
[`research-gateb-driver-slice09.mjs`](../../scripts/research-gateb-driver-slice09.mjs).
Their source SHA-256 values are
`1c3199677710a755e286e768de2a15d4e0a26ac11b4e0613e6dde11a477a46d2` and
`9fa740db95f192a8c03763d63ba28a49d52f6f03fb544ec5a4c1e8d030293d71`.
The three Slice 09 suites pass 14 / 14, including exact Slice 09 schema IDs and
recursive closure, both complete 3+3-by-3 operation denominators, production
callback shape, actual normalize/export gold records, rejection gold/worker
exclusion, byte/manifest/source drift and Slice 08 replay rejection. Tests use
only injected executors; they do not start the Sharp worker. After this Phase B
addition, the repository-wide `npm.cmd run verify` passes `407 / 407`.

Phase C adds
[`research-gateb-runner-slice09.mjs`](../../scripts/research-gateb-runner-slice09.mjs).
Its source SHA-256 is
`3b7da7d9113412a04e76b3029cefd1c62d26548130cfdfea353bd4d28f44e391`.
The runner exports eight strict Slice 09 schemas and durably binds 18 requests,
18 claims, a canonical hash-chain ledger, nine worker-free rejection terminals,
nine atomic applicable closures, one summary and one decision per operation.
Its fake-only suite passes 5 / 5; the four Slice 09 suites together pass 19 / 19.
Self-rehashed gold identity, summary and ledger drift, generic rejection errors,
partial roots and second invocation all fail closed. The tests write only to
system temporary directories and do not start Sharp. After adding the runner,
the repository-wide `npm.cmd run verify` passes `412 / 412`.

Phase D adds the registered admission driver, results-zero definition generator
and central validator:

- [`research-run-slice09.mjs`](../../scripts/research-run-slice09.mjs), SHA-256
  `6a67426264be0a97947788e97522ca8bb38eab031d935c43c5dee906c888afd9`;
- [`research-generate-slice09.mjs`](../../scripts/research-generate-slice09.mjs), SHA-256
  `3e1ac2c7cfe34c053281394b4451a6d594d1dd43f73a4943231889b7f62c75c9`;
- [`research-validate-slice09.mjs`](../../scripts/research-validate-slice09.mjs), SHA-256
  `ed383febaab86b70ea07252ccdf6cc62cd4a426c5ef4e977dae6c60b7bae8744`.

The three new suites pass 14 / 14; all seven Slice 09 suites pass 33 / 33.
Fixed-UTC twin previews are byte-identical and contain 18 schemas, 12 new source
lineage records, six complete gold identity records, 36 planned attempts, zero
copied image bytes and zero results. Manifests store only closed `{path,id}`
identity locators while the definition index separately pins all six immutable
identity refs; this removes the manifest/identity hash cycle without weakening
offline closure. The validator rejects extra files, empty directories,
unregistered result roots, self-hashed promotion, locator replay and unfrozen
literal pins. The repository-wide `npm.cmd run verify` passes `426 / 426` before
the canonical definition freeze.

This README is the human-readable boundary pinned by the canonical results-zero
definition. That definition contains metadata records and immutable references
only; it copies no image bytes and contains no request, result, decision,
calibration, formal material, model weight, third-party image, real-user image
or product integration. Real Sharp execution remains forbidden until the
definition is independently validated, committed and pushed.
