"""Tests of the foreground rules of the intake (studio/intake.py). Run in lowpoly-studio/:

    python3 -m unittest tests.test_intake

Pillow only. The sheet tests read the sheets of the bear and the polar bear (about 10 s).
"""

import os
import sys
import unittest

from PIL import Image, ImageChops, ImageDraw

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import config, intake  # noqa: E402
from studio.schema import INTAKE  # noqa: E402

DIFFERENCE = config.Section({k: f.default for k, f in INTAKE.fields.items()},
                            foreground='difference')


def iou(a, b):
    """Calculates the IoU of two masks (mode L, 255 = on)."""
    inter = ImageChops.logical_and(a.convert('1'), b.convert('1')).histogram()[255]
    union = ImageChops.logical_or(a.convert('1'), b.convert('1')).histogram()[255]
    return inter / max(union, 1)


def white_figure():
    """Draws a neutral white figure on a gray gradient with a ground shadow.

    Returns (the sheet, the true mask, the sheet section of the config). The figure has faceted
    white fur (232 to 248, no color), a dark nose and dark eyes, two legs with a gap, and a
    neutral gray cast shadow on the ground between and under the feet.
    """
    w, h = 400, 500
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            v = int(197 + 14 * (x / w + y / h) / 2)
            px[x, y] = (v, v, v + 3)
    truth = Image.new('L', (w, h), 0)
    figure = ImageDraw.Draw(truth)
    figure.ellipse((120, 160, 280, 380), fill=255)
    figure.ellipse((150, 70, 250, 180), fill=255)
    figure.rectangle((140, 330, 190, 440), fill=255)
    figure.rectangle((210, 330, 260, 440), fill=255)
    draw = ImageDraw.Draw(im)
    draw.rectangle((120, 438, 280, 446), fill=(150, 150, 152))
    shades = [232, 240, 248, 236, 244]
    for i, y0 in enumerate(range(60, 450, 40)):
        band = Image.new('L', (w, h), 0)
        ImageDraw.Draw(band).rectangle((0, y0, w, y0 + 40), fill=255)
        v = shades[i % len(shades)]
        im.paste((v, v, v), mask=ImageChops.multiply(band, truth))
    draw.ellipse((185, 125, 215, 145), fill=(40, 40, 40))
    draw.ellipse((170, 100, 180, 110), fill=(30, 30, 30))
    draw.ellipse((220, 100, 230, 110), fill=(30, 30, 30))
    sheet = config.Section(background=tuple(intake.border_color(im)),
                           foreground=config.Section(min_saturation=14, max_dark_sum=390))
    return im, truth, sheet


class WhiteFigureTest(unittest.TestCase):
    """A neutral white figure separates from a gray background by the difference rule only."""

    def test_difference_rule_finds_the_white_figure(self):
        """The difference mask matches the drawn figure and leaves the ground shadow out."""
        im, truth, sheet = white_figure()
        figure = intake.figure_of(im, sheet, DIFFERENCE)
        mask = intake.make_mask(im, 0, im.size[0], sheet.foreground, figure)
        self.assertGreater(iou(mask, truth), 0.98)
        gap = mask.crop((195, 400, 205, 446)).histogram()[255]
        self.assertEqual(gap, 0, 'the gap between the legs must stay open')

    def test_colored_rule_misses_the_white_figure(self):
        """The colored rule keeps only the dark nose and eyes of a neutral white figure."""
        im, truth, sheet = white_figure()
        mask = intake.make_mask(im, 0, im.size[0], sheet.foreground)
        self.assertLess(iou(mask, truth), 0.1)


class SheetTest(unittest.TestCase):
    """On the sheets of the bear and the polar bear, both rules give nearly the same masks."""

    def test_difference_masks_match_colored_masks(self):
        """The IoU of the two masks of each view is at least 0.98."""
        for animal in ('bear', 'polar-bear'):
            cfg = config.load(animal)
            im = Image.open(cfg.paths.sheet).convert('RGB')
            figure = intake.figure_of(im, cfg.sheet, DIFFERENCE)
            for name, view in cfg.sheet.views.items():
                x0, x1 = view.columns
                old = intake.make_mask(im, x0, x1, cfg.sheet.foreground)
                new = intake.make_mask(im, x0, x1, cfg.sheet.foreground, figure)
                with self.subTest(animal=animal, view=name):
                    self.assertGreater(iou(old, new), 0.98)


if __name__ == '__main__':
    unittest.main()
