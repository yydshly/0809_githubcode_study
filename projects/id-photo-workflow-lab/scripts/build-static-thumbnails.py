from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public-site" / "assets"

FILES = {
    "source-fictional-mannequin.png": 900,
    "result-transparent.png": 700,
    "result-blue.png": 700,
    "layout-six-inch.png": 1200,
    "layout-five-inch.png": 1200,
    "layout-a4.png": 1200,
    "layout-3r.png": 1200,
    "layout-4r.png": 1200,
}

for filename, max_side in FILES.items():
    source = ASSETS / filename
    target = ASSETS / f"{source.stem}-preview.webp"
    with Image.open(source) as image:
        image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=86, method=6)
    print(f"{target.name}: {target.stat().st_size} bytes")
