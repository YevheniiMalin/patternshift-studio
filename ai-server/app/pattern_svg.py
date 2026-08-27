from __future__ import annotations

from dataclasses import dataclass
from html import escape
from math import inf
from typing import Any


@dataclass(frozen=True)
class RenderedPattern:
    svg: str
    panel_count: int
    stitch_count: int
    width_cm: float
    height_cm: float
    applied_scale: float


def _as_pattern(specification: dict[str, Any]) -> dict[str, Any]:
    candidate = specification.get("pattern", specification)
    if not isinstance(candidate, dict) or not isinstance(candidate.get("panels"), dict):
        raise ValueError("The predicted specification does not contain pattern panels")
    return candidate


def _bounds(vertices: list[list[float]]) -> tuple[float, float, float, float]:
    if len(vertices) < 3:
        raise ValueError("A panel needs at least three vertices")
    xs = [float(point[0]) for point in vertices]
    ys = [float(point[1]) for point in vertices]
    return min(xs), min(ys), max(xs), max(ys)


def _edge_path(
    vertices: list[list[float]],
    edge: dict[str, Any],
    origin_x: float,
    origin_y: float,
    scale: float,
) -> str:
    start_index, end_index = edge["endpoints"]
    start = vertices[int(start_index)]
    end = vertices[int(end_index)]
    x1 = origin_x + float(start[0]) * scale
    y1 = origin_y - float(start[1]) * scale
    x2 = origin_x + float(end[0]) * scale
    y2 = origin_y - float(end[1]) * scale
    curvature = edge.get("curvature")
    if not isinstance(curvature, list) or len(curvature) < 2:
        return f"M {x1:.2f} {y1:.2f} L {x2:.2f} {y2:.2f}"
    along = float(curvature[0])
    offset = float(curvature[1])
    dx = x2 - x1
    dy = y2 - y1
    control_x = x1 + dx * along - dy * offset
    control_y = y1 + dy * along + dx * offset
    return f"M {x1:.2f} {y1:.2f} Q {control_x:.2f} {control_y:.2f} {x2:.2f} {y2:.2f}"


def render_pattern_svg(
    specification: dict[str, Any],
    target_length_cm: float | None = None,
) -> RenderedPattern:
    pattern = _as_pattern(specification)
    panels: dict[str, Any] = pattern["panels"]
    if not panels:
        raise ValueError("The model returned an empty pattern")

    panel_bounds: dict[str, tuple[float, float, float, float]] = {}
    longest_panel = 0.0
    for name, panel in panels.items():
        vertices = panel.get("vertices")
        if not isinstance(vertices, list):
            raise ValueError(f"Panel {name} has no vertices")
        bounds = _bounds(vertices)
        panel_bounds[name] = bounds
        longest_panel = max(longest_panel, bounds[3] - bounds[1])

    applied_scale = 1.0
    if target_length_cm and target_length_cm > 0 and longest_panel > 0:
        applied_scale = max(0.25, min(4.0, target_length_cm / longest_panel))

    units_per_cm = 10.0
    geometry_scale = units_per_cm * applied_scale
    margin = 55.0
    gap = 65.0
    max_row_width = 1500.0
    placements: dict[str, tuple[float, float]] = {}
    cursor_x = margin
    cursor_y = margin + 45
    row_height = 0.0
    canvas_width = 0.0

    ordered_names = pattern.get("panel_order") or list(panels)
    ordered_names = [name for name in ordered_names if name in panels] + [name for name in panels if name not in ordered_names]
    for name in ordered_names:
        minimum_x, minimum_y, maximum_x, maximum_y = panel_bounds[name]
        panel_width = (maximum_x - minimum_x) * geometry_scale
        panel_height = (maximum_y - minimum_y) * geometry_scale
        if cursor_x > margin and cursor_x + panel_width + margin > max_row_width:
            cursor_x = margin
            cursor_y += row_height + gap
            row_height = 0.0
        origin_x = cursor_x - minimum_x * geometry_scale
        origin_y = cursor_y + maximum_y * geometry_scale
        placements[name] = (origin_x, origin_y)
        cursor_x += panel_width + gap
        row_height = max(row_height, panel_height)
        canvas_width = max(canvas_width, cursor_x)

    canvas_height = cursor_y + row_height + 210
    canvas_width = max(canvas_width + margin, 520)

    stitch_palette = ["#a23c32", "#397257", "#386b91", "#9a6a20", "#75447f", "#347d83"]
    stitch_lookup: dict[tuple[str, int], int] = {}
    stitches = pattern.get("stitches") if isinstance(pattern.get("stitches"), list) else []
    for stitch_index, stitch in enumerate(stitches):
        if not isinstance(stitch, list):
            continue
        for reference in stitch:
            if isinstance(reference, dict) and "panel" in reference and "edge" in reference:
                stitch_lookup[(str(reference["panel"]), int(reference["edge"]))] = stitch_index

    panel_markup: list[str] = []
    for name in ordered_names:
        panel = panels[name]
        vertices = panel["vertices"]
        origin_x, origin_y = placements[name]
        minimum_x, minimum_y, maximum_x, maximum_y = panel_bounds[name]
        centre_x = origin_x + (minimum_x + maximum_x) * geometry_scale / 2
        centre_y = origin_y - (minimum_y + maximum_y) * geometry_scale / 2
        edge_markup: list[str] = []
        for edge_index, edge in enumerate(panel.get("edges", [])):
            stitch_index = stitch_lookup.get((name, edge_index))
            stroke = stitch_palette[stitch_index % len(stitch_palette)] if stitch_index is not None else "#332a37"
            width = 4.8 if stitch_index is not None else 3.0
            edge_markup.append(
                f'<path d="{_edge_path(vertices, edge, origin_x, origin_y, geometry_scale)}" '
                f'stroke="{stroke}" stroke-width="{width}" fill="none" stroke-linecap="round"/>'
            )
        grain_length = max(70.0, (maximum_y - minimum_y) * geometry_scale * 0.42)
        panel_markup.append(
            "".join(edge_markup)
            + f'<text x="{centre_x:.2f}" y="{centre_y:.2f}" text-anchor="middle" '
            f'font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#332a37">{escape(name.upper())}</text>'
            + f'<line x1="{centre_x:.2f}" y1="{centre_y + 25:.2f}" x2="{centre_x:.2f}" y2="{centre_y + 25 + grain_length:.2f}" '
            'stroke="#8a5b79" stroke-width="2.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>'
        )

    scale_notice = f"Model geometry scale × {applied_scale:.3f}"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_width / units_per_cm:.1f}cm" height="{canvas_height / units_per_cm:.1f}cm" viewBox="0 0 {canvas_width:.1f} {canvas_height:.1f}">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8a5b79"/></marker></defs>
  <rect width="100%" height="100%" fill="#fffdf9"/>
  <text x="55" y="42" font-family="Arial,sans-serif" font-size="21" font-weight="700" fill="#5b3b68">PATTERNSHIFT · SEWFORMER RECONSTRUCTION</text>
  {''.join(panel_markup)}
  <g transform="translate({canvas_width - 175:.1f} {canvas_height - 170:.1f})"><rect width="100" height="100" fill="none" stroke="#332a37" stroke-width="3"/><text x="0" y="125" font-family="Arial,sans-serif" font-size="14" fill="#332a37">10 cm CONTROL</text></g>
  <text x="55" y="{canvas_height - 48:.1f}" font-family="Arial,sans-serif" font-size="14" fill="#8a5b79">{escape(scale_notice)} · seam lines only · verify before cutting</text>
</svg>'''
    return RenderedPattern(
        svg=svg,
        panel_count=len(panels),
        stitch_count=len(stitches),
        width_cm=round(canvas_width / units_per_cm, 2),
        height_cm=round(canvas_height / units_per_cm, 2),
        applied_scale=round(applied_scale, 6),
    )
