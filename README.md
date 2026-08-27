# PatternShift Studio

PatternShift Studio is a privacy-first browser application with two guided workflows: resizing an existing sewing pattern and reconstructing an editable parametric base pattern from reference images, garment details and measurements.

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
- fully local browser processing — uploaded patterns are not sent to a server
- image-reference wizard with explicit front, back, side and detail roles
- local pixel-based foreground and silhouette analysis with a contour preview
- editable shoulder, waist, hip, hem and length proportions derived from the contour
- configurable darts, design ease and seam allowance
- construction report for seam compatibility, print calibration, sleeves, image quality and allowance range
- garment, silhouette, sleeve, neckline and closure specification
- measurement-driven preliminary SVG generation with confidence and assumption checks
- direct handoff of a generated SVG to the resizing studio

## Accuracy boundary

The resize workflow creates a proportional draft and does not yet identify and move professional grading anchor points independently. The image workflow performs real local contour analysis, but it cannot infer hidden seams, depth, fabric behaviour or internal construction from pixels alone. Before cutting final fabric, verify matching seams, grainline, darts, armholes, sleeve caps, hidden construction and fit with a test garment.

## Guided setup

First-time visitors receive a three-step walkthrough. They can upload their own pattern or load the built-in demonstration dress, confirm the source and target profile, review the calculated overlay, and then export tiled A4 pages. The guide and all contextual explanations are available in English, Russian and Finnish.

## Development

```bash
npm ci
npm run dev
```

The GitHub Pages workflow builds a static Next.js export automatically from the `main` branch.

## Roadmap

- AI-assisted panel recognition from multiple garment views
- editable assumptions and construction anchors
- vector anchor-point editor for true multi-point grading
- DXF import
- custom brand and personal measurement charts
- seam-line and seam-allowance separation
- nested multi-size pattern export

## Author

Created by [Yevhenii Malin](https://github.com/YevheniiMalin).

Copyright © 2026 Yevhenii Malin. All rights reserved.
