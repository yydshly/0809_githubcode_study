# Slice 06 workspace

Current state: `scope-frozen / implementation-not-started / definition-not-frozen /
diagnostic-characterization-not-run / Gate-B-no-authority /
calibration-forbidden / non-C1 / non-product`.

The governing scope is [SLICE_06_CONTRACT.md](../SLICE_06_CONTRACT.md). This
directory currently contains this prose boundary only. There is no Slice 06
candidate lock, contract record, schema, plan, preregistration, manifest,
fixture wrapper, runtime or hardware observation, script, test, definition
index, or result.

## Authorized future shape

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

Future source wrappers must use new Slice 06 identities while pinning the exact
Slice 05 bytes as `regressionLineageRef`. They are not new independent sources
and cannot enter calibration, holdout, or C1. Candidate outputs may be retained
only as non-product diagnostic specimens or quarantine with complete worker and
independent-oracle records; they must never be published under `artifacts/`.

## Not authorized yet

Phase A does not authorize running Sharp on image bytes. Before any registered
characterization, implementation and strict fake-protocol tests must be
committed, then a fresh runtime inventory and results-zero machine definition
must be frozen, validated, committed, and pushed.

Do not invoke the Slice 05 smoke or calibration commands. `@0.5.0` is immutable
and closed. Slice 06 will have no calibration command or Gate-B decision record.
Even a complete 24-attempt diagnostic closure only informs candidate selection
for a later slice.

Formal holdout, defect-holdout, escape, real or user photos, third-party image
samples, model weights, product UI, server integration, and every evidence axis
remain out of scope and at zero.
