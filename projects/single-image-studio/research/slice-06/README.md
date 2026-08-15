# Slice 06 workspace

Current state: `scope-frozen / implementation-and-fake-protocol-tests-ready /
definition-frozen / results-zero / diagnostic-characterization-not-run /
Gate-B-no-authority / calibration-forbidden / non-C1 / non-product`.

The governing scope is [SLICE_06_CONTRACT.md](../SLICE_06_CONTRACT.md). Phase B
has implemented the local diagnostic protocol without running the real Sharp
image path. Phase C has materialized the diagnostic-only candidate lock, two
contract records, two plans, two preregistrations, two manifests, eight
regression-lineage wrappers, fresh runtime / hardware observations and a
results-zero definition index. Diagnostic results remain `not-created`.

## Phase C results-zero definition

The canonical definition contains 26 recursively closed schemas, 23 non-index
machine records, the [definition index](definition-index.v0.6.0.json), and this
README. The 26 schemas are the thirteen Phase B protocol schemas plus thirteen
strict schemas for the Phase C definition records. The index pins 49 descendant
machine files; adding the index gives 50 machine files, and adding this README
gives a 51-file frozen definition tree.

The two manifests register exactly eight new Slice 06 source identities and 24
planned attempts. Their wrappers point to exact committed Slice 05 public
synthetic bytes and records; no image bytes are copied into Slice 06, and every
wrapper declares `independenceClaim=false`. The runtime and hardware records are
fresh observations for this definition, while the dependency and native-code
lineage remains the exact installed research-only Sharp closure already audited
in Slice 05.

The definition pins the generator, registered driver, Phase B adapter, worker,
independent diagnostic oracle, runner, runtime inventory helper, and Slice 05
regression decoder. It deliberately does not pin the central validator: that
validator embeds the final definition-tree pins and is therefore an external
admission and evidence-enforcement layer, not a self-referential member of the
definition DAG.

At definition freeze, `results/` is absent, copied image bytes are zero, and no
candidate pixel pipeline has run. The result protocol records one planned
driver invocation, two planned operation runs and 8 / 24 planned source / attempt
counts. Actual registered counts must be derived from completed operation runs;
a `protocol-failed` or `inconclusive` first operation globally stops the second
operation, consumes the version, and cannot be retried.

## Phase B protocol inventory

The implementation consists of a strict diagnostic adapter, an isolated worker,
an independent Node-builtins PNG diagnostic oracle and a durable local runner.
Three oracle-owned schemas are stored in this directory; the runner exports ten
additional strict schema documents for Phase C to materialize dynamically.
There are three fake-only test files. After the pre-definition lifecycle and
reconciliation hardening patch, the oracle, runner and runtime suites pass
`13 / 13 + 18 / 18 + 15 / 15 = 46 / 46`; all four scripts pass `node --check`.
The earlier Phase B baseline passed the full project `npm.cmd run verify` at
`270 / 270`; a fresh full-project count will be recorded after the Phase C
results-zero definition is frozen.
An independent read-only audit found `P1 / P2 / P3 = 0 / 0 / 0` and all 13
schema definitions recursively closed with exact Slice 06 `$id` values.

The deterministic set digest is
`b6371a5c09a9c834dc24f508df672b5c26adfd65684cadc6401108b12c4f0da4`,
computed from binary-sorted `path<TAB>sha256<LF>` records for these ten files:

| File | SHA-256 |
| --- | --- |
| [candidate-output-observation schema](schemas/candidate-output-observation.slice06.v0.schema.json) | `559ff94af62928af06e3b1edc715bd8441d16bd1e02af95724d157fe1f9dc834` |
| [diagnostic-envelope schema](schemas/diagnostic-envelope.slice06.v0.schema.json) | `6ab9655ff35264a317f229c134c2abfafa9cfeb1dd04cedbbfffad4de17d367a` |
| [oracle-diagnostic schema](schemas/oracle-diagnostic.slice06.v0.schema.json) | `25e8caa36b17487cef802dc0b254c20e5037c8137590f25b948e89bc311aecd7` |
| [diagnostic adapter](../../scripts/research-diagnostic-adapter-slice06.mjs) | `b442df039238fa919052b02fca88e7fa5010a632e66360849df98f3c2221534f` |
| [diagnostic PNG oracle](../../scripts/research-diagnostic-png-oracle-slice06.mjs) | `7780f218b4630f1b56e2f63b46986fb12dae553ca5cc6b1a74f00665c2dca591` |
| [diagnostic runner](../../scripts/research-run-slice06.mjs) | `92126b90afa4a9b68e5fe4ee1db7c11dc2eab8f9246dc1421bd06eb1db26e665` |
| [isolated Sharp worker](../../scripts/research-sharp-worker-slice06.mjs) | `0a7ef0bee97b67a4c67d02fa59c17b6cedff04c31e23bf14b252bfaeca1de38c` |
| [oracle fake-only tests](../../tests/research-slice06-oracle.test.mjs) | `a406beec762adf8def17400495350d725020f010e9dac8f4b1ef4f911649c73f` |
| [runner fake-only tests](../../tests/research-slice06-runner.test.mjs) | `d3975370af48382901a99598e7bba54507a4b042c92ebf43173a4a0f063ff03e` |
| [runtime fake-only tests](../../tests/research-slice06-runtime.test.mjs) | `77ad006163f9e1f72d0c3d4f6cc5b013ad907a08d7bd8eafa5e561a5daaee100` |

These checks construct only in-memory synthetic PNG bytes and system-temporary
fake closure / result trees using Node builtins, injected fake workers and
protocol faults. They do not download an image, invoke the real Sharp pixel
pipeline, or create / commit a canonical repository fixture, result or artifact.
`package.json` is intentionally unchanged so the frozen Slice 05 dependency
attestation remains byte-exact; Slice 06 syntax checks are explicit until the
Phase C definition owns its command surface.

## Authorized machine-definition shape

Slice 06 is a diagnostic-only bridge between the closed non-pass Slice 05 and a
future, separately scoped Gate-B attempt. It plans new `@0.6.0` candidate and
contract identities plus two operation-specific diagnostic preregistrations.
It does not have authority to make a Gate-B decision or run calibration.

The frozen scope plans exactly eight public-synthetic regression source units
and three repetitions per source:

| Operation | Applicable lineage | Preflight sentinel | Planned attempts |
| --- | ---: | ---: | ---: |
| normalize | 3 | 1 missing-sRGB | 12 |
| export | 3 independent `NormalizedImage` inputs | 1 invalid artifact | 12 |
| total | 6 | 2 | 24 |

Source wrappers must use new Slice 06 identities while pinning the exact
Slice 05 bytes as `regressionLineageRef`. They are not new independent sources
and cannot enter calibration, holdout, or C1. Candidate outputs may be retained
only as non-product diagnostic specimens or quarantine with complete worker and
independent-oracle records; they must never be published under `artifacts/`.

## Not authorized yet

The frozen definition does not itself authorize running Sharp on image bytes.
This exact 51-file definition, its generator, registered driver and central
validator must pass adversarial validation, then the containing commit must be
pushed with local `HEAD` equal to `origin/main`. Only after that admission may
one driver invocation register the normalize and export operation runs in their
frozen order. Any implementation, runtime, schema, lineage, definition, Git or
results-root drift stops before execution.

Do not invoke the Slice 05 smoke or calibration commands. `@0.5.0` is immutable
and closed. Slice 06 will have no calibration command or Gate-B decision record.
Even a complete 24-attempt diagnostic closure only informs candidate selection
for a later slice.

Formal holdout, defect-holdout, escape, real or user photos, third-party image
samples, model weights, product UI, server integration, and every evidence axis
remain out of scope and at zero.
