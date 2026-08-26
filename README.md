# PatternShift Studio

PatternShift Studio is a privacy-first browser application for creating proportional sewing-pattern drafts. A user uploads a pattern, selects the source and target size, then refines the result by garment type, sizing system, stature, figure profile, fit, fabric stretch, and designer ease.

## Current capabilities

- SVG, PNG, JPG and WebP pattern upload
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

## Accuracy boundary

The current release creates a proportional draft. It does not yet identify and move professional grading anchor points independently. Before cutting final fabric, verify matching seams, grainline, darts, armholes, sleeve caps and fit with a test garment.

## Guided setup

First-time visitors receive a three-step walkthrough. They can upload their own pattern or load the built-in demonstration dress, confirm the source and target profile, review the calculated overlay, and then export tiled A4 pages. The guide and all contextual explanations are available in English, Russian and Finnish.

## Development

```bash
npm ci
npm run dev
```

The GitHub Pages workflow builds a static Next.js export automatically from the `main` branch.

## Roadmap

- vector anchor-point editor for true multi-point grading
- direct PDF and DXF import
- custom brand and personal measurement charts
- seam-line and seam-allowance separation
- nested multi-size pattern export

## Author

Created by [Yevhenii Malin](https://github.com/YevheniiMalin).

Copyright © 2026 Yevhenii Malin. All rights reserved.
