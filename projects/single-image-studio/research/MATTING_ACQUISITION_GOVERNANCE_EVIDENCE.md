# Matting acquisition and natural-person governance definition

## Outcome

`DEF-MATTE-ACQUISITION-GOVERNANCE@0.1.0` freezes the next candidate-neutral boundary without acquiring any model or natural image. The definition contains four strict schemas and five content-addressed records. It contains no image, checkpoint, dependency environment, inference result, holdout bundle, or product wiring.

The definition was frozen at `2026-08-16T02:29:17.919Z` with these material counts:

- selected natural images: 0;
- downloaded model artifacts: 0;
- installed candidate dependencies: 0;
- generated results: 0.

## Natural-person governance

`GOV-MATTE-NATURAL-PERSON@0.1.0` limits a future first population to consenting adults in exactly-one-person portrait research. Real user uploads, scraped search/social images, unclear rights, minors, sensitive inference, and automatic public-display or commercial-use assumptions are prohibited.

The planned independent-source minima are definition targets, not acquired fixtures:

| Partition | Minimum | Role | Current material |
| --- | ---: | --- | --- |
| `dev` | 24 | open calibration only | not created |
| `holdout` | 24 | sealed independent C1 | not created |
| `defect` | 12 | open defect calibration only | not created |
| `defect-holdout` | 12 | sealed independent C1 QA | not created |
| `escape` | 0 | event-driven invalidation ledger | not created |

Person identity, source family, capture session, near duplicate, crop, derivative, and sequence may not cross partitions. Holdout creation remains blocked until a final candidate and formal preregistration are frozen and an independent custodian is assigned.

## Candidate acquisition boundary

The official MODNet commit README describes an RGB portrait-matting model and states that repository code, models, and demos except `doc/gif` use Apache-2.0. That same fixed README exposes a Colab demo, not an immutable direct checkpoint locator. Therefore `modnet_photographic_portrait_matting.ckpt` remains `unresolved-official-direct-artifact` and acquisition is forbidden. See the [fixed MODNet README](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md) and its [license section](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md#license).

RVM v1.0.0 is pinned to commit `17d1774b032fd503bfe53c57d295db719f9e3da1`; the official release exposes assets and the selected direct path is `rvm_mobilenetv3.pth`. The exact bytes and SHA-256 remain unknown because no retrieval occurred. GPL review, a single-frame empty-state contract, dependency closure, and safe loader policy remain hard blockers. See the [official v1.0.0 release](https://github.com/PeterL1n/RobustVideoMatting/releases/tag/v1.0.0).

Both plans require a separately approved one-time retrieval record, resolved redirect chain, UTC, content type, byte length, SHA-256, license/notice capture, security inspection, exact dependency lock, SBOM, OS, hardware, and loader policy. All acquisition, import, inference, and product-distribution flags are false.

## Runtime boundary

`POLICY-MATTE-MODEL-RUNTIME@0.1.0` freezes an isolated self-hosted Python worker policy while explicitly recording that the runtime does not yet exist. Runtime network, automatic download, TorchHub, and remote code are disabled. Model bytes must live outside repository and product roots, be hashed before deserialization, and never supply executable code. Exact Python, PyTorch/transitive wheels, SBOM, hardware, loader implementation, resource limits, and process isolation remain unresolved; inference is therefore unauthorized.

## Exact pins

- Root: `research/matting-governance/acquisition-v0`.
- 10 files / 24,607 bytes.
- Tree SHA-256: `4eed75094547aa658ecea8b37d02749fd88df2bbbf5763bd9f7a2708eed24d19`.
- Definition index content / file SHA-256: `bd1be892f07a92896b7f7afbb62064b7045316a610075d3dccb7c6472f0f9d85` / `84dfbe8311019d5e3a0902c1ba08d91c8bf39a5c3927e4714024ae493255a4a7`.
- Natural-person governance content / file SHA-256: `a4e047b791e6b5f1419a1c0b78c6b6828187d3bc40a430047bdc6290ad91fdf9` / `37c5d266cb3757e291c326e6549a170dce9d39ac739d8e1707edbd84b040a9d3`.
- Runtime policy content / file SHA-256: `f707eebf28f8cd205c77fe739b4b6473249ca2155f671c559f32b950f01f8960` / `8a05240798d32482bb965e388b9422462dc041709e7098f91b6dfb1b578080cb`.
- MODNet plan content / file SHA-256: `1d22f4a01f667fc1d371655f98597bfa3e7761785e043b1e67d27e9570a3b70f` / `6b3248cafb5eb08b1b7ace1f960801d87f44ddd66de3f5f22b450e60c97e7afa`.
- RVM plan content / file SHA-256: `71a1267594018d42710332f7af9bea16cbbabe269ad4a45366108fdc61c96693` / `56d4051807f556baf6223f32a3d5ff0f83e9427605faed5b116d447cb6ef7eb2`.
- Generator SHA-256: `f6e580d9ff8442840191f896e9924423af297fc9611a012963b0014b4793efce`.
- Test SHA-256: `f27bd14e1736cb473c6e2fc9e12e42a58c127dadac41b3e7431ae91aa29dde28`.

The focused suite passes 4 / 4. It covers exact zero-material counts, recursively closed schemas, partition roles and minima, user-photo/runtime denials, two-root byte determinism, extra checkpoint rejection, and synchronized semantic-drift rejection.

## Evidence boundary and next action

This definition is governance only. It is not model acquisition, runtime readiness, natural-person evidence, Gate B, C1, product support, or release evidence. All evidence axes remain 0 and `productSupport=false`.

The only next authorized work is metadata resolution: locate an official immutable MODNet artifact, freeze exact Python/package/wheel candidates and their license metadata, define safe checkpoint inspection, and draft a one-time acquisition request. Model bytes and natural-image bytes must remain absent until those records pass independent review.

Subsequent results-zero work is recorded separately in [MATTING_RUNTIME_METADATA_EVIDENCE.md](MATTING_RUNTIME_METADATA_EVIDENCE.md). It found the fixed repository's official Google Drive folder but still no immutable MODNet object/hash, recorded RVM's fixed direct requirements and single-frame call shape, and froze a safe-loader policy plus an unissued HEAD/GET template. It does not alter this historical acquisition definition or authorize any request.
