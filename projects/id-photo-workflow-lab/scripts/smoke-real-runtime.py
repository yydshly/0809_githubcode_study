import argparse
import base64
import io
import json
import time
from pathlib import Path

import requests
from PIL import Image

PAPERS = ["six-inch", "five-inch", "a4", "3r", "4r"]


def decode_data_url(value):
    encoded = value.split(",", 1)[1] if value.startswith("data:") else value
    return base64.b64decode(encoded)


def image_fact(value):
    payload = decode_data_url(value)
    with Image.open(io.BytesIO(payload)) as image:
        return {"mode": image.mode, "width": image.width, "height": image.height, "bytes": len(payload)}


def main():
    parser = argparse.ArgumentParser(description="Run one real Hivision CPU workflow smoke.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:8080")
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    source = Path(args.input)
    if not source.is_file():
        raise SystemExit(f"Input not found: {source}")
    output_dir = Path(args.output_dir) if args.output_dir else None
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()
    with source.open("rb") as handle:
        response = requests.post(
            f"{args.base_url}/idphoto",
            files={"input_image": (source.name, handle, "image/png")},
            data={
                "height": "413",
                "width": "295",
                "human_matting_model": "modnet_photographic_portrait_matting",
                "face_detect_model": "mtcnn",
                "hd": "true",
                "dpi": "300",
                "face_align": "false",
                "whitening_strength": "2",
                "brightness_strength": "2",
                "contrast_strength": "3",
                "saturation_strength": "2",
                "sharpen_strength": "1",
            },
            timeout=60,
        )
    response.raise_for_status()
    idphoto = response.json()
    standard = idphoto["image_base64_standard"]

    background_response = requests.post(
        f"{args.base_url}/add_background",
        data={"input_image_base64": standard, "color": "4b8bc4", "dpi": "300"},
        timeout=30,
    )
    background_response.raise_for_status()
    background = background_response.json()["image_base64"]

    layouts = {}
    for paper in PAPERS:
        paper_started = time.perf_counter()
        layout_response = requests.post(
            f"{args.base_url}/layout",
            data={
                "input_image_base64": background,
                "paper": paper,
                "height": "413",
                "width": "295",
                "dpi": "300",
                "crop_line": "true",
            },
            timeout=60,
        )
        layout_response.raise_for_status()
        layout = layout_response.json()
        layouts[paper] = {
            "label": layout["paper_label"],
            "elapsed_ms": round((time.perf_counter() - paper_started) * 1000),
            **image_fact(layout["image_base64"]),
        }
        if output_dir:
            (output_dir / f"layout-{paper}.png").write_bytes(decode_data_url(layout["image_base64"]))

    if output_dir:
        (output_dir / "standard.png").write_bytes(decode_data_url(standard))
        (output_dir / "background.png").write_bytes(decode_data_url(background))

    summary = {
        "source": source.name,
        "mode": idphoto["mode"],
        "idphoto_elapsed_ms": idphoto["elapsed_ms"],
        "total_elapsed_ms": round((time.perf_counter() - started) * 1000),
        "standard": image_fact(standard),
        "hd": image_fact(idphoto["image_base64_hd"]),
        "background": image_fact(background),
        "layouts": layouts,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
