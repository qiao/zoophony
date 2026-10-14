"""Tests of the ear box of the field (studio/config.py ear_box_pad). Run in lowpoly-studio/:

    python3 -m unittest tests.test_ear_box

No Blender: the tests read the configs and the rule.
"""

import os
import sys
import tomllib
import unittest
from types import SimpleNamespace

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import cli, config, like  # noqa: E402


class EarBoxTest(unittest.TestCase):
    """The half size of the box where the field samples an ear."""

    def test_long_ear_gets_a_box_that_holds_it(self):
        ears = SimpleNamespace(radii=[0.068, 0.135, 0.013], blend=0.012, box_pad=None)
        self.assertAlmostEqual(config.ear_box_pad(ears), 0.135 + 0.012 + 0.01)

    def test_small_ear_gets_a_small_box(self):
        ears = SimpleNamespace(radii=[0.027, 0.029, 0.019], blend=0.012, box_pad=None)
        self.assertLess(config.ear_box_pad(ears), 0.07)

    def test_a_given_pad_stays(self):
        ears = SimpleNamespace(radii=[0.068, 0.135, 0.013], blend=0.012, box_pad=0.07)
        self.assertEqual(config.ear_box_pad(ears), 0.07)

    def test_the_configs_that_give_a_pad_keep_it(self):
        for animal in ('bear', 'polar-bear', 'rabbit'):
            with open(os.path.join(config.animal_dir(animal), 'animal.toml'), 'rb') as f:
                pad = tomllib.load(f)['field']['ears']['box_pad']
            self.assertEqual(config.load(animal).field.ears.box_pad, pad, animal)


class LikeDropsTheEarBoxTest(unittest.TestCase):
    """The compact config of new --like drops the ear box of the like animal."""

    def test_compact_config_has_no_ear_box(self):
        with open(os.path.join(config.animal_dir('bear'), 'animal.toml')) as f:
            text = f.read()
        changes = cli.compact_changes('fox', 'Fox', 'conductor', 'reference/fox.png',
                                      [200, 200, 200], {}, [0, 10], [])
        out = like.compact(text, 'A test.', changes)
        self.assertNotIn('box_pad', tomllib.loads(out)['field']['ears'])
        self.assertIn('box_pad', tomllib.loads(out)['field']['tail'])


if __name__ == '__main__':
    unittest.main()
