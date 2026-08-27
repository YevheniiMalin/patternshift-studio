# PatternShift AI server

This directory contains the GPU API used by PatternShift Studio for full sewing-pattern reconstruction. It accepts a front garment image, runs the official SewFormer inference entrypoint, returns the predicted panels and stitches, and renders them as a measurable SVG.

## Important upstream boundary

PatternShift does **not** redistribute SewFormer source code, its 551 MB checkpoint or the 290 GB SewFactory dataset. As of 27 August 2026, the official source repository and Hugging Face model have no published licence or model card. Obtain permission or confirm acceptable use with the authors before production or commercial deployment.

Official resources:

- source: <https://github.com/sail-sg/sewformer>
- checkpoint: <https://huggingface.co/liulj/sewformer>
- dataset: <https://huggingface.co/datasets/liulj/sewfactory>
- paper: <https://arxiv.org/abs/2311.04218>

## Run with an NVIDIA GPU

This is the zero-hosting-cost path when you already have compatible NVIDIA hardware. PatternShift does not require or automatically create any paid cloud service.

1. Clone the official repository separately.
2. Download the official checkpoint separately.
3. Copy `.env.example` to `.env` and set both absolute paths.
4. Start the container:

```bash
docker compose up --build
```

5. Verify readiness:

```bash
curl http://localhost:8000/health
```

6. Run reconstruction:

```bash
curl -X POST http://localhost:8000/v1/reconstruct \
  -H "X-PatternShift-Key: your-key" \
  -F "image=@front.jpg" \
  -F "target_length_cm=105"
```

The response contains `patternSvg`, the full upstream `specification`, panel and stitch counts, physical canvas dimensions, scale metadata and warnings.

If the user changes the target garment length after reconstruction, reuse the returned `specification` without another GPU pass:

```bash
curl -X POST http://localhost:8000/v1/render \
  -H "Content-Type: application/json" \
  -H "X-PatternShift-Key: your-key" \
  -d '{"specification": {"pattern": {"panels": {}}}, "target_length_cm": 110}'
```

Use the real `specification` returned by `/v1/reconstruct`; the abbreviated object above only demonstrates the request shape.

## Deployment

The image builds on a CUDA 12.1 PyTorch runtime and requires one NVIDIA GPU. The server may run on your own machine; for access from the public GitHub Pages site it also needs an HTTPS address reachable by the browser. Configure CORS with `PATTERNSHIFT_ALLOWED_ORIGINS` and protect the endpoint with `PATTERNSHIFT_API_KEY` or a local gateway.

There is currently no permanent free public SewFormer inference endpoint. The repository therefore ships no preconfigured URL and incurs no hosting charge.

The current adapter deliberately serializes requests because the official inference command uses one GPU and writes output files. It loads the research model for each reconstruction, favouring reproducibility over throughput. A later warm-worker adapter can keep the model in memory after upstream licensing is clarified.

## Tests

The SVG conversion tests do not require the upstream model:

```bash
cd ai-server
PYTHONPATH=. python -m unittest discover -s tests -v
```
