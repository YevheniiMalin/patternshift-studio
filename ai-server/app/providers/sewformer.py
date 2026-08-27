from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import yaml

from app.pattern_svg import render_pattern_svg


CHECKPOINT_NAME = "Detr2d-V6-final-dif-ce-focal-schd-agp_checkpoint_37.pth"


class ModelUnavailableError(RuntimeError):
    pass


class InferenceError(RuntimeError):
    pass


class SewFormerProvider:
    """Adapter around the upstream SewFormer research inference command.

    The upstream source and checkpoint are intentionally not redistributed by
    PatternShift because neither currently carries a usage licence.
    """

    def __init__(self) -> None:
        self.source_root = Path(os.getenv("SEWFORMER_ROOT", "/opt/sewformer")).resolve()
        self.checkpoint = Path(
            os.getenv("SEWFORMER_CHECKPOINT", f"/opt/models/{CHECKPOINT_NAME}")
        ).resolve()
        self.timeout_seconds = int(os.getenv("SEWFORMER_TIMEOUT_SECONDS", "300"))
        self._lock = threading.Lock()

    @property
    def inference_script(self) -> Path:
        return self.source_root / "Sewformer" / "inference.py"

    @property
    def upstream_config(self) -> Path:
        return self.source_root / "Sewformer" / "configs" / "test.yaml"

    @property
    def ready(self) -> bool:
        return self.inference_script.is_file() and self.upstream_config.is_file() and self.checkpoint.is_file()

    def health(self) -> dict[str, Any]:
        return {
            "provider": "sewformer",
            "ready": self.ready,
            "sourceFound": self.inference_script.is_file(),
            "checkpointFound": self.checkpoint.is_file(),
            "checkpointName": self.checkpoint.name,
            "execution": "serialized-gpu-subprocess",
        }

    def _write_config(self, destination: Path) -> None:
        with self.upstream_config.open("r", encoding="utf-8") as handle:
            config = yaml.safe_load(handle)
        config.setdefault("NN", {})["pre-trained"] = str(self.checkpoint)
        config.setdefault("experiment", {})["local_dir"] = str(destination.parent / "experiment")
        with destination.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(config, handle, sort_keys=False)

    def reconstruct(self, image_bytes: bytes, suffix: str, target_length_cm: float | None) -> dict[str, Any]:
        if not self.ready:
            raise ModelUnavailableError(
                "SewFormer source or checkpoint is not mounted. See ai-server/README.md."
            )

        with self._lock, TemporaryDirectory(prefix="patternshift-") as temporary:
            work = Path(temporary)
            inputs = work / "inputs"
            outputs = work / "outputs"
            inputs.mkdir()
            outputs.mkdir()
            image_path = inputs / f"reference{suffix}"
            image_path.write_bytes(image_bytes)
            config_path = work / "test.runtime.yaml"
            self._write_config(config_path)

            environment = os.environ.copy()
            python_paths = [
                str(self.source_root / "SewFactory" / "packages"),
                str(self.source_root / "Sewformer"),
            ]
            environment["PYTHONPATH"] = os.pathsep.join(
                python_paths + ([environment["PYTHONPATH"]] if environment.get("PYTHONPATH") else [])
            )
            command = [
                sys.executable,
                str(self.inference_script),
                "-c",
                str(config_path),
                "-d",
                str(inputs),
                "-t",
                "real",
                "-o",
                str(outputs),
            ]
            try:
                completed = subprocess.run(
                    command,
                    cwd=self.source_root / "Sewformer",
                    env=environment,
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                )
            except subprocess.TimeoutExpired as error:
                raise InferenceError(f"SewFormer inference exceeded {self.timeout_seconds} seconds") from error
            if completed.returncode != 0:
                tail = "\n".join((completed.stderr or completed.stdout).splitlines()[-18:])
                raise InferenceError(f"SewFormer inference failed: {tail}")

            specifications = list(outputs.rglob("*_predicted_specification.json"))
            if not specifications:
                specifications = list(outputs.rglob("*specification.json"))
            if not specifications:
                raise InferenceError("SewFormer completed without a pattern specification")
            with specifications[0].open("r", encoding="utf-8") as handle:
                specification = json.load(handle)
            rendered = render_pattern_svg(specification, target_length_cm=target_length_cm)
            return {
                "model": "SewFormer",
                "modelVersion": "official-checkpoint-37",
                "patternSvg": rendered.svg,
                "panelCount": rendered.panel_count,
                "stitchCount": rendered.stitch_count,
                "widthCm": rendered.width_cm,
                "heightCm": rendered.height_cm,
                "appliedScale": rendered.applied_scale,
                "targetLengthCm": target_length_cm,
                "specification": specification,
                "warnings": [
                    "The model predicts seam lines, not production seam allowances.",
                    "Hidden construction and physical fit must be verified before cutting fabric.",
                ],
            }
