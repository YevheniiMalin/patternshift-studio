from __future__ import annotations

import os
from typing import Annotated

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.pattern_svg import render_pattern_svg
from app.providers.sewformer import InferenceError, ModelUnavailableError, SewFormerProvider


MAX_IMAGE_BYTES = 12 * 1024 * 1024
SUPPORTED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _origins() -> list[str]:
    configured = os.getenv(
        "PATTERNSHIFT_ALLOWED_ORIGINS",
        "https://yevheniimalin.github.io,https://patternshift-studio.malevge1985.chatgpt.site,http://localhost:3000,http://localhost:4173",
    )
    return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]


app = FastAPI(
    title="PatternShift AI",
    version="0.1.0",
    description="GPU inference adapter for sewing-pattern reconstruction models.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-PatternShift-Key"],
)
provider = SewFormerProvider()


class RenderRequest(BaseModel):
    specification: dict[str, object]
    target_length_cm: float = Field(ge=10, le=300)


def _authorize(value: str | None) -> None:
    expected = os.getenv("PATTERNSHIFT_API_KEY", "")
    if expected and value != expected:
        raise HTTPException(status_code=401, detail="Invalid PatternShift API key")


@app.get("/")
def root() -> dict[str, object]:
    return {"service": "PatternShift AI", "status": "online", "model": provider.health()}


@app.get("/health")
def health() -> dict[str, object]:
    model = provider.health()
    return {"status": "ready" if model["ready"] else "waiting_for_model", "model": model}


@app.post("/v1/reconstruct")
async def reconstruct(
    image: Annotated[UploadFile, File(description="Front garment image")],
    target_length_cm: Annotated[float | None, Form()] = None,
    x_patternshift_key: Annotated[str | None, Header()] = None,
) -> dict[str, object]:
    _authorize(x_patternshift_key)
    suffix = SUPPORTED_TYPES.get(image.content_type or "")
    if not suffix:
        raise HTTPException(status_code=415, detail="Use a PNG, JPEG or WebP image")
    payload = await image.read(MAX_IMAGE_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="The uploaded image is empty")
    if len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="The image exceeds 12 MB")
    if target_length_cm is not None and not 10 <= target_length_cm <= 300:
        raise HTTPException(status_code=422, detail="target_length_cm must be between 10 and 300")
    try:
        return provider.reconstruct(payload, suffix, target_length_cm)
    except ModelUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except InferenceError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/v1/render")
def render(
    request: RenderRequest,
    x_patternshift_key: Annotated[str | None, Header()] = None,
) -> dict[str, object]:
    """Re-render an existing prediction at a new physical scale without another GPU pass."""
    _authorize(x_patternshift_key)
    try:
        rendered = render_pattern_svg(
            request.specification,
            target_length_cm=request.target_length_cm,
        )
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "patternSvg": rendered.svg,
        "panelCount": rendered.panel_count,
        "stitchCount": rendered.stitch_count,
        "widthCm": rendered.width_cm,
        "heightCm": rendered.height_cm,
        "appliedScale": rendered.applied_scale,
    }
