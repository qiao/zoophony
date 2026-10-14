"""Tests of the body height scale of `new --like` (studio/like.py crown, body_ratio, and
scale_changes). Run in lowpoly-studio/:

    python3 -m unittest tests.test_like_scale

No Blender: the tests read the config of the polar bear and small profiles.
"""

import os
import sys
import tomllib
import unittest

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import config, like  # noqa: E402


def profile(crown, ears=True):
    """Makes a front profile: a body up to the crown, and two ears above it apart from the axis."""
    rows = [{'y': round(y / 100, 2), 'runs': [[-0.1, 0.1]]} for y in range(0, int(crown * 100) + 1)]
    if ears:
        rows += [{'y': round(y / 100, 2), 'runs': [[-0.12, -0.05], [0.05, 0.12]]}
                 for y in range(int(crown * 100) + 1, 101)]
    return rows


def polar_bear():
    """Returns the config text of the polar bear."""
    with open(os.path.join(config.animal_dir('polar-bear'), 'animal.toml')) as f:
        return f.read()


class CrownTest(unittest.TestCase):
    """The body height of a sheet: the crown between the ears."""

    def test_crown_is_the_top_at_the_axis(self):
        self.assertEqual(like.crown(profile(0.77)), 0.77)

    def test_ratio_of_a_long_eared_sheet(self):
        new = {'front': {'profile': profile(0.77)}}
        old = {'front': {'profile': profile(0.99, ears=False)}}
        self.assertAlmostEqual(like.body_ratio(new, old), 0.77 / 0.99, places=4)


class ScaleTest(unittest.TestCase):
    """The scale of the values in animal heights."""

    def setUp(self):
        self.text = polar_bear()
        self.changes, self.scaled, self.left = like.scale_changes(self.text, 0.5, 'test')
        self.out = tomllib.loads(like.compact(self.text, None, self.changes))
        self.old = tomllib.loads(self.text)

    def test_lengths_scale(self):
        self.assertAlmostEqual(self.out['facets']['offset'], 0.5 * self.old['facets']['offset'])
        warp, old = self.out['facets']['warps'][0], self.old['facets']['warps'][0]
        self.assertAlmostEqual(warp['radius'], 0.5 * old['radius'])
        self.assertAlmostEqual(warp['center'][1], 0.5 * old['center'][1])
        self.assertAlmostEqual(self.out['rig']['spine']['hips'][0],
                               0.5 * self.old['rig']['spine']['hips'][0])
        self.assertAlmostEqual(self.out['rig']['weights']['armpit']['drop'],
                               0.5 * self.old['rig']['weights']['armpit']['drop'])

    def test_factors_and_names_stay(self):
        self.assertEqual(self.out['facets']['warps'][0]['factor'],
                         self.old['facets']['warps'][0]['factor'])
        self.assertEqual(self.out['rig']['weights']['armpit']['x_scale'],
                         self.old['rig']['weights']['armpit']['x_scale'])
        self.assertEqual(self.out['facets']['protect']['near']['part'],
                         self.old['facets']['protect']['near']['part'])

    def test_the_top_of_the_silhouette_stays(self):
        self.assertEqual(self.out['measure']['features']['ears'],
                         self.old['measure']['features']['ears'])
        self.assertIn('measure.features.ears.regions', self.left)

    def test_the_sheet_measures_stay(self):
        self.assertEqual(self.out['field'], self.old['field'])
        self.assertEqual(self.out['details'], self.old['details'])
        self.assertEqual(self.out['sheet'], self.old['sheet'])


if __name__ == '__main__':
    unittest.main()
