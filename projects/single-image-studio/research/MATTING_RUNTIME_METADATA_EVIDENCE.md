# Matting runtime metadata definition

## Outcome

`DEF-MATTE-RUNTIME-METADATA@0.1.0` closes the source-metadata step that follows the acquisition-governance definition. It records ten fixed-commit upstream text observations, two still-blocked candidate runtime records, a default-deny checkpoint loader policy, and an unissued two-stage HEAD/GET request template. It contains no model, dependency environment, image, inference result, holdout material, or product wiring.

The definition was frozen at `2026-08-16T03:46:26.424Z`. Its material counts are:

- 4 recursively closed schemas;
- 4 content-addressed records plus the definition index;
- 10 registered upstream source-metadata texts;
- 0 model HEAD requests;
- 0 model body requests;
- 0 model bytes;
- 0 installed candidate dependencies;
- 0 natural images;
- 0 generated results.

## MODNet finding

The fixed MODNet repository contains an [official pretrained-model README](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/pretrained/README.md) that points to a Google Drive folder. This resolves an official folder-level locator, but not an immutable object URL, byte length, or SHA-256 for `modnet_photographic_portrait_matting.ckpt`. The official Colab remains sign-in gated and is not treated as a reproducible artifact locator.

The fixed [portrait inference source](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/demo/image_matting/colab/inference.py) imports NumPy, Pillow, PyTorch, and torchvision, constructs `MODNet`, then calls `torch.load`. The repository has no image-demo-specific exact dependency lock; the related webcam requirements only specify `torch >= 1.0.0` and leave the other direct packages unpinned. Therefore the checkpoint, runtime, loader, and inference all remain unauthorized. The fixed repository [license](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/LICENSE) is Apache-2.0, and the fixed root README states that repository code, models, and demos are covered except `doc/gif`; distribution still requires an independent artifact and dependency review.

## RVM finding

The fixed RVM v1.0.0 [TorchHub entry](https://github.com/PeterL1n/RobustVideoMatting/blob/17d1774b032fd503bfe53c57d295db719f9e3da1/hubconf.py) declares `torch` and `torchvision`, points at the official `rvm_mobilenetv3.pth` release URL, and can invoke `torch.hub.load_state_dict_from_url`. The fixed [inference requirements](https://github.com/PeterL1n/RobustVideoMatting/blob/17d1774b032fd503bfe53c57d295db719f9e3da1/requirements_inference.txt) publish `torch==1.9.0`, `torchvision==0.10.0`, `av==8.0.3`, `tqdm==4.61.1`, and `pims==0.5`. These are useful upstream declarations, not a complete Windows runtime lock: Python, platform wheels, transitive dependencies, package hashes, and SBOM are still absent.

The fixed README documents the single-frame boundary as four recurrent states initialized to `None`, followed by one call that returns foreground, alpha, and four next recurrent states. That observation is now recorded, but no adapter or inference was run. The selected release artifact still has unknown bytes and SHA-256 because no HEAD or body request occurred. The fixed repository license is GPL-3.0; product distribution remains blocked pending independent review.

## Safe loading and request boundary

`POLICY-MATTE-SAFE-CHECKPOINT-LOAD@0.1.0` forbids direct use of the upstream pickle-compatible loading calls. A future loader must first pin the original bytes, exact runtime, wheel hashes, transitive SBOM, hardware/resource profile, and its own implementation hash. Inspection must occur in a no-network subprocess and admit only a bounded tensor/state-dict inventory through a reviewed non-executable path. The loader implementation and its negative tests are both `not-created`.

`TEMPLATE-MATTE-MODEL-REQUEST@0.1.0` separates a metadata-only HEAD stage from a one-time body GET. Neither stage is authorized or issued. A future HEAD may capture final host, redirects, content type, and declared length without reading the model body. A future GET requires separate source, license, runtime, security, and custody approval; any bytes must enter a quarantine vault outside the repository, product, and system temp, and must not be loaded automatically.

## Exact pins

- Root: `research/matting-governance/runtime-metadata-v0`.
- 10 files / 33,076 bytes.
- Definition-subtree SHA-256: `2ede91f2ddd402a5404808a740b578f7021e829190760d5dae86f53554734e2b`.
- Full-tree SHA-256: `de1567e715d31ef3d373f94ac71a31d6549a485e934233b5ebdc64f3b0682b7e`.
- Index content / file SHA-256: `d9d84c0eab85c963d07dfb79416dc22a206d4f867f981b9e52f5365ff849053d` / `8e6d9ad61166755f02093d00fe276f3160780234f3ea3c008e7891277f06d99f`.
- MODNet metadata content / file SHA-256: `aca10d8447fd75248e4e6613341b7f5ebd4f37be8055df889122b8d0f45ca73e` / `8a5b83325d556663dd442a16c5b81a3a1df229374c41b3a25379ef7dfe709785`.
- RVM metadata content / file SHA-256: `08ed24e7288ff97b409c59fe8d9d2e6e5453d8680c1b7f9d8150a2bb53c796c7` / `a8dbff67e2b6200c5e323a2be54976aac212dc498ad0ba14457d7fd23dd51469`.
- Loader policy content / file SHA-256: `5b49263321783129db2dd0b748d6184a5856cb07533e75f23c65afd6fad74e87` / `e1cdfbf4e519a59078f3f5de7ca3e6eb4ad953c4074400dc77f29ee21f68066d`.
- Request template content / file SHA-256: `2a2ddc5380ec5e4ded8d8ea4a2ac8e6e046882c90879dbf28773860227e8ca6f` / `c6d7569e032ab1ae748a5b86223f19b47a6c4a367f48c7fdd4d386778a0d7657`.
- Generator SHA-256: `9118a07db9d7c6fc850539551fb9776cfab65add4727e1049e7ee74b92e63d3f`.
- Test SHA-256: `8d4c8757c28d85df0d015c9eac6e4a849579b4a3e50cfad7938656a274908c26`.

The focused suite passes 4 / 4. It checks recursively closed schemas, exact source observations, zero acquisition counters, the distinction between upstream declarations and runtime readiness, two-root byte determinism, extra checkpoint rejection, and synchronized authorization-drift rejection. The complete project `npm.cmd run verify` passes 540 / 540 tests; the new generator and test file also pass direct `node --check`.

## Evidence boundary and next action

This is source and policy metadata, not Gate A, runtime readiness, model acquisition, inference, natural-person evidence, Gate B, C1, product support, or release evidence. All evidence axes remain 0 and `productSupport=false`.

The next separately reviewable step is to select an exact candidate-specific Python/platform wheel set and produce a license/SBOM proposal. An independent reviewer may then issue a metadata-only HEAD request. Model body GET, dependency installation, checkpoint loading, inference, and natural-image access remain separately forbidden.
