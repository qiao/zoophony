"""Tests of the ear measures of the bump method (studio/measure_features.py): the share of the
inner ear color and the lean of the outer edge. Run in lowpoly-studio/:

    python3 -m unittest tests.test_ear_checks

No Blender: each test draws an ear on a small image and measures it.
"""

import math
import os
import sys
import unittest
from types import SimpleNamespace

from PIL import Image, ImageDraw

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import measure_features as mf  # noqa: E402

BACKGROUND = (204, 204, 206)
FUR = (220, 208, 192)
PINK = (219, 175, 155)
STRONG_PINK = (237, 168, 145)

# The view frame: 200 px wide, the axis at x 100, the ground at row 290, 280 px to one height.
W, H = 200, 300
META = {'column': [0, W], 'axis_px': 100.0, 'ground_px': 290.0, 'height_px': 280.0}

# A bump feature with the default search rows of the schema.
FEATURE = SimpleNamespace(search=0.15, notch_span=0.2, notch_top=0.08)


def ear_picture(lean_deg, pink=None, pink_share=0.0, outer_is_low=True):
    """Draws a head with one ear in the left half of a view and returns its picture and box.

    The ear is a band 24 px wide from row 20 to row 90 (longer than the notch_span rows), and
    its outer edge leans out by lean_deg from the vertical. pink_share of the band width at its
    inner side gets the color pink."""
    im = Image.new('RGB', (W, H), BACKGROUND)
    draw = ImageDraw.Draw(im)
    draw.rectangle((10, 90, 99, 180), fill=FUR)
    shift = math.tan(math.radians(lean_deg))
    for y in range(20, 91):
        x_out = 40 - shift * (90 - y)
        draw.line((round(x_out), y, round(x_out) + 23, y), fill=FUR)
        if pink:
            draw.line((round(x_out) + 24 - round(24 * pink_share), y, round(x_out) + 23, y),
                      fill=pink)
    if not outer_is_low:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    px = im.load()
    mask = [[px[x, y] != BACKGROUND for x in range(W)] for y in range(H)]
    box = [0, 0, 100, 100] if outer_is_low else [100, 0, W, 100]
    return mf.Picture(im, mask, META), box


def pink_class(saturation_tol=0.12):
    """Makes the color class of the inner ear: the hue and the saturation of the pink."""
    spec = SimpleNamespace(max_under=None, max_over=None, over_background=None,
                           spread_under=None, median_over=None, median_under=None,
                           palette='ear_inner', hue_tol=20.0, saturation_tol=saturation_tol)
    cfg = SimpleNamespace(sheet=SimpleNamespace(background=list(BACKGROUND)),
                          paint=SimpleNamespace(palette={'ear_inner': list(PINK)}))
    return mf.ColorClass(spec, cfg)


def bump(pic, box, outer_is_low=True, inner=None, lean=True):
    """Measures the bump of a picture and returns its one item."""
    result = mf.measure_bump(pic, box, outer_is_low, FEATURE, None, inner, lean)
    return result['items'][0]


class LeanTest(unittest.TestCase):
    """The lean of the outer edge of an ear."""

    def test_upright_ear_has_no_lean(self):
        pic, box = ear_picture(0.0)
        self.assertAlmostEqual(bump(pic, box)['lean'], 0.0, delta=1.0)

    def test_ear_that_leans_out_gives_its_angle(self):
        pic, box = ear_picture(17.0)
        self.assertAlmostEqual(bump(pic, box)['lean'], 17.0, delta=1.5)

    def test_ear_that_leans_in_gives_a_negative_angle(self):
        pic, box = ear_picture(-10.0)
        self.assertAlmostEqual(bump(pic, box)['lean'], -10.0, delta=1.5)

    def test_outer_edge_at_the_high_x_gives_the_same_sign(self):
        pic, box = ear_picture(17.0, outer_is_low=False)
        self.assertAlmostEqual(bump(pic, box, outer_is_low=False)['lean'], 17.0, delta=1.5)

    def test_lean_needs_its_view(self):
        pic, box = ear_picture(17.0)
        self.assertNotIn('lean', bump(pic, box, lean=False))


class InnerShareTest(unittest.TestCase):
    """The share of the ear in the color of the inner ear."""

    def test_half_pink_ear_gives_half(self):
        pic, box = ear_picture(0.0, PINK, 0.5)
        self.assertAlmostEqual(bump(pic, box, inner=pink_class())['inner'], 0.5, delta=0.06)

    def test_strong_pink_is_in_the_class(self):
        pic, box = ear_picture(0.0, STRONG_PINK, 0.85)
        self.assertGreater(bump(pic, box, inner=pink_class())['inner'], 0.75)

    def test_cream_fur_is_not_in_the_class(self):
        pic, box = ear_picture(0.0)
        self.assertEqual(bump(pic, box, inner=pink_class())['inner'], 0.0)

    def test_inner_needs_its_class(self):
        pic, box = ear_picture(0.0, PINK, 0.5)
        self.assertNotIn('inner', bump(pic, box))


if __name__ == '__main__':
    unittest.main()
