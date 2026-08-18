# Static showcase asset provenance

## Source

- `source-fictional-mannequin.png`
- copied from the project-generated fixture registered at `projects/single-image-studio/provider-evaluation/sandbox-v0/generation-manifest.json`
- original SHA-256: `fb37e342480258b723c38d2c1887934a87e532ddc68603ad4d8bc288e6428bb2`
- generated with OpenAI built-in image generation; clearly fictional mannequin; no real person, user photo or third-party photo
- copied into this standalone research project for the user-authorized public static demonstration

## Hivision derivatives

The following PNGs were produced locally from that source through the fixed Hivision runtime recorded in `RUNTIME_RECEIPT.md`:

- `result-transparent.png`
- `result-blue.png`
- `layout-six-inch.png`
- `layout-five-inch.png`
- `layout-a4.png`
- `layout-3r.png`
- `layout-4r.png`

Runtime facts:

```text
Hivision commit 5c191e2577f14755a69d9df6db415fab23aca484
MODNet SHA-256 07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9
MODNet + MTCNN / offline CPU
295x413 / 300 DPI
beauty controls 2,2,3,2,1
blue background 4b8bc4
layout crop lines enabled
```

`*-preview.webp` files are project-generated display derivatives resized from the corresponding committed PNG by `scripts/build-static-thumbnails.py`.

These assets are research evidence, not official ID-photo examples, user photos, product-quality claims or upstream demo assets.
