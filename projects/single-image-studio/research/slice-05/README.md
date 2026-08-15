# Slice 05 local Gate B workspace

This directory contains the machine-readable definition layer for a narrow,
local-only `NORMALIZE-DELIVER` research exercise. It covers two independent
operations: canonical PNG normalization and PNG export from an independently
generated normalized artifact. It does not expose either operation through the
product UI or server path.

## Definition boundary

The definition layer records:

- the exact installed Sharp `0.35.3` Windows x64 runtime closure and native
  artifact inventory as `REG-NORM-SHARP@0.5.0`;
- separate normalize and export capability contracts, artifact schemas, and
  operation-specific independent-oracle bindings;
- a named local hardware/runtime profile without hostname or device serial;
- strict request, ledger, result, fault, Gate B, admission, and calibration
  result schemas;
- two operation-specific smoke manifests and four operation-specific open
  calibration manifests;
- 108 project-original synthetic sources, including 12 smoke sources and 96
  open calibration sources;
- independently generated export inputs and gold records that do not use the
  candidate pipeline.

The checked-in source and gold material is public, deterministic, synthetic,
and non-formal. It contains no real person, user upload, third-party image,
model, model weight, formal holdout, defect holdout, escape case, formal bundle,
formal run request, formal receipt, or EvidenceManifest. The dependency installation remains in
the ignored project-local `node_modules` directory; only the exact dependency
declarations, lockfile, runtime attestation, and research implementation are
versioned.

Slice 04 remains immutable source/provenance lineage. The nine differences
between its packaging metadata snapshot and the actually installed Windows x64
runtime are recorded explicitly in the Slice 05 candidate/runtime records;
they are not silently rewritten into Slice 04.

## Execution boundary

Definition validation and the normal project `verify` command never run the
Sharp image pipeline. Candidate execution requires an explicit manual command
after the definition commit exists:

```powershell
npm.cmd run research:smoke:slice05
```

Smoke is decided separately for normalize and export. Every registered case,
runtime/resource check, independent reopen check, idempotency check, and fault
semantics conjunct must pass for that operation. A non-pass or unknown result
keeps that operation outside Gate B. One operation cannot inherit the other
operation's decision.

Open calibration also requires an explicit operation-specific command and a
matching frozen `calibration-ready` admission produced by the smoke run:

```powershell
npm.cmd run research:calibrate:normalize:slice05
npm.cmd run research:calibrate:export:slice05
```

The runner must fail closed if the matching admission is absent or non-pass.
Each operation has 30 `dev/calibration` plus 18 `defect/calibration` sources,
with three planned repetitions per source. All 3/3 valid outcomes must pass;
at most one predeclared no-result attempt may be replaced per source across all
three repetitions. Valid pass and valid non-pass outcomes are never rerun or
overwritten.

Run records live under the registered Slice 05 `results` subtrees and are not
part of the immutable definition tree. They remain subject to strict file
allowlists, content hashes, append-only ledgers, runtime re-attestation, and
the central Slice 05 validator.

## Evidence truth

Dependency resolution, a successful definition validator, Gate B smoke, or
open calibration does not establish product support or formal capability
evidence. Throughout Slice 05:

```text
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
formal holdout/defect-holdout/escape=not-created
formal bundle/request/receipt/EvidenceManifest=not-created
```

See [the Slice 05 scope contract](../SLICE_05_CONTRACT.md) for the normative
authorization boundary. Passing local research checks must not be described as
real normalization, formal export, PNG product support, or a released product.

## Validation

Run from `projects/single-image-studio`:

```powershell
node --test tests/research-slice05-runtime.test.mjs
node --test tests/research-slice05-adapter.test.mjs
node --test tests/research-slice05-oracle.test.mjs
node --test tests/research-slice05-generator.test.mjs
node --test tests/research-slice05-runner.test.mjs
node --test tests/research-slice05.test.mjs
npm.cmd run research:validate
npm.cmd run verify
```

These checks prove only the registered local research boundary and its
recorded observations. They do not grant C1, Gate B product status, format
support, or release approval.
