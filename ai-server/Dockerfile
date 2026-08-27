FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SEWFORMER_ROOT=/opt/sewformer \
    SEWFORMER_CHECKPOINT=/opt/models/Detr2d-V6-final-dif-ce-focal-schd-agp_checkpoint_37.pth

WORKDIR /srv/patternshift-ai
COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt
COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
