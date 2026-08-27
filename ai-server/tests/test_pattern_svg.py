import unittest

from app.pattern_svg import render_pattern_svg


SPECIFICATION = {
    "pattern": {
        "panels": {
            "front": {
                "vertices": [[0, 0], [20, 0], [20, 40], [0, 40]],
                "edges": [
                    {"endpoints": [0, 1]},
                    {"endpoints": [1, 2]},
                    {"endpoints": [2, 3], "curvature": [0.5, 0.08]},
                    {"endpoints": [3, 0]},
                ],
            },
            "back": {
                "vertices": [[0, 0], [18, 0], [18, 40], [0, 40]],
                "edges": [
                    {"endpoints": [0, 1]},
                    {"endpoints": [1, 2]},
                    {"endpoints": [2, 3]},
                    {"endpoints": [3, 0]},
                ],
            },
        },
        "panel_order": ["front", "back"],
        "stitches": [[{"panel": "front", "edge": 1}, {"panel": "back", "edge": 3}]],
    }
}


class PatternSvgTests(unittest.TestCase):
    def test_renders_panels_stitches_and_control_square(self) -> None:
        rendered = render_pattern_svg(SPECIFICATION, target_length_cm=80)
        self.assertEqual(rendered.panel_count, 2)
        self.assertEqual(rendered.stitch_count, 1)
        self.assertEqual(rendered.applied_scale, 2)
        self.assertIn("FRONT", rendered.svg)
        self.assertIn("BACK", rendered.svg)
        self.assertIn("10 cm CONTROL", rendered.svg)
        self.assertIn(" Q ", rendered.svg)
        self.assertGreater(rendered.width_cm, 0)
        self.assertGreater(rendered.height_cm, 0)

    def test_rejects_empty_pattern(self) -> None:
        with self.assertRaisesRegex(ValueError, "empty"):
            render_pattern_svg({"pattern": {"panels": {}}})


if __name__ == "__main__":
    unittest.main()
