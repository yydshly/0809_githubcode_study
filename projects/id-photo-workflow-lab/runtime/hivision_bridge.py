import asyncio
import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
UPSTREAM_ROOT = PROJECT_ROOT / "vendor" / "HivisionIDPhotos"
sys.path.insert(0, str(UPSTREAM_ROOT))

import cv2
import numpy as np
import onnxruntime
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from hivision import IDCreator
from hivision.creator.choose_handler import choose_handler
from hivision.creator.layout_calculator import generate_layout_array, generate_layout_image
from hivision.error import APIError, FaceError
from hivision.utils import (
    add_background,
    base64_2_numpy,
    bytes_2_base64,
    hex_to_rgb,
    save_image_dpi_to_bytes,
)

UPSTREAM_COMMIT = "5c191e2577f14755a69d9df6db415fab23aca484"
MODEL_DIR = UPSTREAM_ROOT / "hivision" / "creator" / "weights"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
PROCESS_LOCK = asyncio.Lock()

PAPER_SIZES = {
    "six-inch": {"label": "六寸", "height": 1205, "width": 1795},
    "five-inch": {"label": "五寸", "height": 1051, "width": 1500},
    "a4": {"label": "A4", "height": 2479, "width": 3508},
    "3r": {"label": "3R", "height": 1051, "width": 1500},
    "4r": {"label": "4R", "height": 1205, "width": 1795},
}

MODEL_FILES = {
    "modnet_photographic_portrait_matting": "modnet_photographic_portrait_matting.onnx",
    "hivision_modnet": "hivision_modnet.onnx",
    "birefnet-v1-lite": "birefnet-v1-lite.onnx",
}

app = FastAPI(title="ID Photo Workflow Lab Hivision Bridge", docs_url=None, redoc_url=None)


def available_models():
    return [name for name, filename in MODEL_FILES.items() if (MODEL_DIR / filename).is_file()]


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def decode_upload(image_bytes):
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("INVALID_IMAGE_SIZE")
    encoded = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("IMAGE_DECODE_FAILED")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def process_idphoto(
    image_bytes,
    height,
    width,
    human_matting_model,
    face_detect_model,
    hd,
    dpi,
    face_align,
    whitening_strength,
    brightness_strength,
    contrast_strength,
    sharpen_strength,
    saturation_strength,
):
    if human_matting_model not in available_models():
        raise ValueError("MODEL_NOT_INSTALLED")
    if face_detect_model == "face_plusplus" and not (
        os.getenv("FACE_PLUS_API_KEY") and os.getenv("FACE_PLUS_API_SECRET")
    ):
        raise ValueError("FACE_PLUS_NOT_CONFIGURED")
    if face_detect_model not in {"mtcnn", "retinaface-resnet50", "face_plusplus"}:
        raise ValueError("FACE_MODEL_UNSUPPORTED")

    image = decode_upload(image_bytes)
    creator = IDCreator()
    choose_handler(creator, human_matting_model, face_detect_model)
    started = time.perf_counter()
    result = creator(
        image,
        size=(clamp(int(height), 128, 2000), clamp(int(width), 128, 2000)),
        face_alignment=bool(face_align),
        whitening_strength=clamp(int(whitening_strength), 0, 15),
        brightness_strength=clamp(int(brightness_strength), -5, 25),
        contrast_strength=clamp(int(contrast_strength), -10, 50),
        sharpen_strength=clamp(int(sharpen_strength), 0, 5),
        saturation_strength=clamp(int(saturation_strength), -10, 50),
    )
    standard_bytes = save_image_dpi_to_bytes(result.standard, None, clamp(int(dpi), 72, 600))
    response = {
        "status": True,
        "mode": "edge-cloud" if face_detect_model == "face_plusplus" else "offline-cpu",
        "elapsed_ms": round((time.perf_counter() - started) * 1000),
        "image_base64_standard": bytes_2_base64(standard_bytes),
    }
    if hd:
        hd_bytes = save_image_dpi_to_bytes(result.hd, None, clamp(int(dpi), 72, 600))
        response["image_base64_hd"] = bytes_2_base64(hd_bytes)
    return response


def process_background(image_base64, color, dpi):
    image = base64_2_numpy(image_base64)
    rgb = hex_to_rgb(color)
    bgr = (rgb[2], rgb[1], rgb[0])
    result = add_background(image, bgr=bgr, mode="pure_color").astype(np.uint8)
    result = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
    result_bytes = save_image_dpi_to_bytes(result, None, clamp(int(dpi), 72, 600))
    return {"status": True, "image_base64": bytes_2_base64(result_bytes)}


def process_layout(image_base64, paper, height, width, dpi, crop_line):
    if paper not in PAPER_SIZES:
        raise ValueError("PAPER_UNSUPPORTED")
    image = base64_2_numpy(image_base64)
    selected = PAPER_SIZES[paper]
    photo_height = clamp(int(height), 128, 2000)
    photo_width = clamp(int(width), 128, 2000)
    typography, rotate = generate_layout_array(
        input_height=photo_height,
        input_width=photo_width,
        LAYOUT_HEIGHT=selected["height"],
        LAYOUT_WIDTH=selected["width"],
    )
    layout = generate_layout_image(
        image,
        typography,
        rotate,
        height=photo_height,
        width=photo_width,
        crop_line=bool(crop_line),
        LAYOUT_HEIGHT=selected["height"],
        LAYOUT_WIDTH=selected["width"],
    ).astype(np.uint8)
    layout = cv2.cvtColor(layout, cv2.COLOR_RGB2BGR)
    layout_bytes = save_image_dpi_to_bytes(layout, None, clamp(int(dpi), 72, 600))
    return {
        "status": True,
        "paper": paper,
        "paper_label": selected["label"],
        "layout_width": selected["width"],
        "layout_height": selected["height"],
        "image_base64": bytes_2_base64(layout_bytes),
    }


@app.get("/health")
def health():
    models = available_models()
    return {
        "connected": True,
        "mode": "real-hivision",
        "label": "Hivision CPU runtime 已连接",
        "upstream_commit": UPSTREAM_COMMIT,
        "runtime": {
            "python": ".".join(map(str, sys.version_info[:3])),
            "opencv": cv2.__version__,
            "onnxruntime": onnxruntime.__version__,
            "onnx_device": onnxruntime.get_device(),
            "providers": onnxruntime.get_available_providers(),
        },
        "capabilities": {
            "offline_cpu_matting": bool(models),
            "standard_sizes": True,
            "paper_sizes": PAPER_SIZES,
            "beauty": True,
            "edge_cloud_face_plus": bool(
                os.getenv("FACE_PLUS_API_KEY") and os.getenv("FACE_PLUS_API_SECRET")
            ),
            "formal_wear": {"state": "waiting", "implemented": False},
        },
        "models": models,
    }


@app.post("/idphoto")
async def idphoto(
    input_image: UploadFile = File(...),
    height: int = Form(413),
    width: int = Form(295),
    human_matting_model: str = Form("modnet_photographic_portrait_matting"),
    face_detect_model: str = Form("mtcnn"),
    hd: bool = Form(True),
    dpi: int = Form(300),
    face_align: bool = Form(False),
    whitening_strength: int = Form(0),
    brightness_strength: int = Form(0),
    contrast_strength: int = Form(0),
    sharpen_strength: int = Form(0),
    saturation_strength: int = Form(0),
):
    image_bytes = await input_image.read(MAX_IMAGE_BYTES + 1)
    try:
        async with PROCESS_LOCK:
            return await run_in_threadpool(
                process_idphoto,
                image_bytes,
                height,
                width,
                human_matting_model,
                face_detect_model,
                hd,
                dpi,
                face_align,
                whitening_strength,
                brightness_strength,
                contrast_strength,
                sharpen_strength,
                saturation_strength,
            )
    except (FaceError, APIError, ValueError) as error:
        return JSONResponse(
            status_code=422,
            content={"status": False, "error": str(error) or error.__class__.__name__},
        )


@app.post("/add_background")
async def add_background_route(
    input_image_base64: str = Form(...),
    color: str = Form("ffffff"),
    dpi: int = Form(300),
):
    try:
        async with PROCESS_LOCK:
            return await run_in_threadpool(process_background, input_image_base64, color, dpi)
    except (ValueError, cv2.error) as error:
        return JSONResponse(status_code=422, content={"status": False, "error": str(error)})


@app.post("/layout")
async def layout_route(
    input_image_base64: str = Form(...),
    paper: str = Form("six-inch"),
    height: int = Form(413),
    width: int = Form(295),
    dpi: int = Form(300),
    crop_line: bool = Form(False),
):
    try:
        async with PROCESS_LOCK:
            return await run_in_threadpool(
                process_layout,
                input_image_base64,
                paper,
                height,
                width,
                dpi,
                crop_line,
            )
    except (ValueError, cv2.error) as error:
        return JSONResponse(status_code=422, content={"status": False, "error": str(error)})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("HIVISION_BRIDGE_PORT", "8080")))
