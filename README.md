# PatternShift Studio

PatternShift Studio is a browser application with two guided workflows: resizing an existing sewing pattern and reconstructing a preliminary pattern from reference images, garment details and measurements. Image reconstruction supports a free local contour workflow and an optional self-hosted SewFormer GPU service.

## Current capabilities

- separate mode-selection page for existing patterns and image-based drafts
- PDF, SVG, PNG, JPG and WebP pattern upload
- single-page and tiled multi-page PDF import with page-range and grid controls
- women’s and men’s XXS–XXL reference charts
- EU, international, US and UK size equivalents
- petite, regular and tall stature conversion
- garment-specific proportional calculations
- fit, fabric stretch and designer-ease adjustments
- original-versus-target visual overlay
- physical width and height calibration
- tiled A4 PDF export with a 10 mm control square
- English interface by default, with Russian and Finnish translations
- first-visit walkthrough, guided three-step setup and contextual explanations
- one-click demonstration pattern for learning the workflow without a personal file
- fully local processing for the resize and contour modes
- image-reference wizard with explicit front, back, side and detail roles
- local pixel-based foreground and silhouette analysis with a contour preview
- optional SewFormer inference adapter for predicted panels and stitch relationships
- measurable SVG rendering with colour-coded stitch pairs
- secure browser-to-server configuration with an optional access key
- scale-only AI re-rendering without repeating GPU inference
- editable shoulder, waist, hip, hem and length proportions derived from the contour
- configurable darts, design ease and seam allowance
- construction report for seam compatibility, print calibration, sleeves, image quality and allowance range
- garment, silhouette, sleeve, neckline and closure specification
- measurement-driven preliminary SVG generation with confidence and assumption checks
- direct handoff of a generated SVG to the resizing studio

## Accuracy boundary

The resize workflow creates a proportional draft and does not yet identify and move professional grading anchor points independently. The local image workflow performs real contour analysis, but it cannot infer hidden seams, depth, fabric behaviour or internal construction from pixels alone. SewFormer mode predicts panels and stitch relationships, but remains a research reconstruction: it does not prove fit or add production-ready seam allowances. Before cutting final fabric, verify matching seams, grainline, darts, armholes, sleeve caps, hidden construction and fit with a test garment.

## AI reconstruction server

The optional service lives in [`ai-server`](./ai-server). It wraps the official SewFormer inference entrypoint behind a FastAPI API, validates uploads, serializes GPU jobs, converts the predicted specification to SVG and exposes health and scale-only rendering endpoints.

PatternShift does not bundle the upstream SewFormer source, checkpoint or SewFactory dataset. Their official pages currently publish no usage licence, so obtain permission before production or commercial use. The service requires an NVIDIA GPU and can be run without hosting fees on hardware you already own. GitHub Pages hosts only the static interface and cannot run the model.

See [`ai-server/README.md`](./ai-server/README.md) for setup and tests.

## Guided setup

First-time visitors receive a three-step walkthrough. They can upload their own pattern or load the built-in demonstration dress, confirm the source and target profile, review the calculated overlay, and then export tiled A4 pages. The guide and all contextual explanations are available in English, Russian and Finnish.

## Development

```bash
npm ci
npm run dev
```

The GitHub Pages workflow builds a static Next.js export automatically from the `main` branch.

## Roadmap

- multi-view AI fusion beyond SewFormer’s single-image workflow
- editable assumptions and construction anchors
- vector anchor-point editor for true multi-point grading
- DXF import
- custom brand and personal measurement charts
- seam-line and seam-allowance separation
- nested multi-size pattern export

## Author

Created by [Yevhenii Malin](https://github.com/YevheniiMalin).

Copyright © 2026 Yevhenii Malin. All rights reserved.
