"""Tests of the sheet check (studio/consistency.py): the head checks describe the sheet, so a
tuned color class of the config does not move them. Run in lowpoly-studio/:

    python3 -m unittest tests.test_consistency

Pillow only. The tests read the sheets, the masks, and measure.json of the bear and the polar bear
(about 2 s). The intake makes measure.json first when git has none.
"""

import json
import os
import sys
import unittest

from PIL import Image

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import config, consistency  # noqa: E402
from studio.config import Section  # noqa: E402


def sheet_of(cfg):
    """Loads the sheet of a config and the views of its measure.json. Git does not keep
    measure.json, so the intake makes it first when it is missing (from the stage cache, or in
    about 3 s)."""
    if not os.path.exists(cfg.paths.measure):
        from studio import cli  # noqa: PLC0415
        cli.step_intake(cfg)
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']
    return Image.open(cfg.paths.sheet).convert('RGB'), meta


def head(cfg, sheet):
    """Runs the sheet check, and returns its head checks as {name: (value, views)}."""
    found = consistency.check(cfg, *sheet)['checks']
    return {c['name']: (c['value'], c['views']) for c in found
            if c['name'].startswith('head_turn')}


def with_measure(cfg, measure):
    """Returns a copy of a config with another measure table."""
    return Section(cfg, measure=measure)


def with_class(cfg, name, **values):
    """Returns a copy of a config with new values in one color class."""
    classes = Section(cfg.measure.classes)
    classes[name] = Section(classes[name], **values)
    return with_measure(cfg, Section(cfg.measure, classes=classes))


class TestHeadChecks(unittest.TestCase):
    """The head checks of the sheet check read no color class and no feature of the config."""

    @classmethod
    def setUpClass(cls):
        """Loads the configs and the pictures of the bear and the polar bear sheets."""
        cls.bear = config.load('bear')
        cls.polar = config.load('polar-bear')
        cls.bear_sheet = sheet_of(cls.bear)
        cls.polar_sheet = sheet_of(cls.polar)

    def test_both_head_checks_measured(self):
        """The front and the 3/4 head checks find the eyes and the nose on both sheets."""
        for cfg, sheet in ((self.bear, self.bear_sheet), (self.polar, self.polar_sheet)):
            with self.subTest(animal=cfg.animal.id):
                self.assertEqual(set(head(cfg, sheet)),
                                 {'head_turn.front', 'head_turn.three_quarter'})

    def test_calibrated_dark_class_does_not_move_the_head_turn(self):
        """The polar bear sheet with the measure table of the bear (a new animal like the bear):
        the dark class that calibrate sets (max_under 100 to 90) keeps the head checks."""
        like = with_measure(self.polar, self.bear.measure)
        before = head(like, self.polar_sheet)
        after = head(with_class(like, 'dark', max_under=90), self.polar_sheet)
        self.assertEqual(before, after)
        self.assertIn('head_turn.three_quarter', after)

    def test_head_turn_does_not_depend_on_the_features(self):
        """The eye and nose features of another animal give the same head checks."""
        own = head(self.polar, self.polar_sheet)
        like = head(with_measure(self.polar, self.bear.measure), self.polar_sheet)
        self.assertEqual(own, like)

    def test_head_turn_of_a_straight_head(self):
        """The bear sheet holds the head straight in the 3/4 view (no compare.head_turn): its
        measured turn is inside the limit of the check."""
        turn = head(self.bear, self.bear_sheet)['head_turn.three_quarter'][0]
        self.assertLessEqual(abs(turn), consistency.HEAD_TURN)


if __name__ == '__main__':
    unittest.main()
