"""Tests of the reach checks of a role with a held instrument (studio/checks.py reach_checks and
reach_text). Run in lowpoly-studio/:

    python3 -m unittest tests.test_reach

No Blender: the tests give the data of the stage "clips" (studio/bake.py reach_report) by hand,
with the values of the rabbit violinist of round 1 and of round 4.
"""

import os
import sys
import unittest
from types import SimpleNamespace

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import checks  # noqa: E402

# The role [checks] with the defaults of the schema.
LIMITS = SimpleNamespace(instrument_reach=(0.9, 1.1), ik_reach=1.0)


def reach(palm, length, clips):
    """Makes the reach data of the stage "clips" for one held violin."""
    return {'ik': palm - 0.02, 'palm': palm, 'clips': clips,
            'instruments': [{'name': 'violin', 'kind': 'violin', 'length': length}]}


# The short arms of round 1: the bow paw asks for 1.13 of the reach in "ready".
ROUND_1 = reach(0.2247, 0.17, {'reference': {}, 'ready': {'L': [0.9641, 60], 'R': [1.1287, 24]},
                               'play': {'L': [0.9641, 120], 'R': [0.8665, 30]}})

# The arms of round 4 (1.4 times the reach), with a violin of a real player.
REAL = reach(0.3146, 0.31, {'ready': {'L': [0.7885, 48], 'R': [0.8145, 24]}})


def run(data):
    """Runs the reach checks on the data. Returns ({check name: check}, the reach line)."""
    r = checks.Report()
    line = checks.reach_checks(r, data, LIMITS, 30)
    return {c['name']: c for c in r.items}, line


class ReachChecksTest(unittest.TestCase):
    """The checks of the instrument length and of the IK targets."""

    def test_short_arms_fail_both_checks(self):
        found, _ = run(ROUND_1)
        self.assertFalse(found['instrument_reach.violin']['pass'])
        self.assertFalse(found['ik_reach.ready']['pass'])
        self.assertEqual(found['ik_reach.ready']['where']['side'], 'R')
        self.assertEqual(found['ik_reach.ready']['where']['frame'], 24)

    def test_targets_inside_the_reach_pass(self):
        found, _ = run(ROUND_1)
        self.assertTrue(found['ik_reach.play']['pass'])

    def test_a_violin_of_a_real_player_passes(self):
        found, _ = run(REAL)
        self.assertTrue(found['instrument_reach.violin']['pass'])
        self.assertTrue(found['ik_reach.ready']['pass'])

    def test_a_clip_with_no_ik_arm_has_no_check(self):
        found, _ = run(ROUND_1)
        self.assertNotIn('ik_reach.reference', found)

    def test_a_role_with_no_held_instrument_has_no_check(self):
        data = dict(ROUND_1, instruments=[])
        found, line = run(data)
        self.assertEqual(found, {})
        self.assertIsNone(line)


class ReachTextTest(unittest.TestCase):
    """The reach line of the summary and of the look report."""

    def test_line_gives_the_reach_the_length_and_the_ratio(self):
        _, line = run(REAL)
        text, bad = checks.reach_text({'reach': line})
        self.assertIn('the middle of the palm 0.3146', text)
        self.assertIn('the violin 0.31', text)
        self.assertIn('ratio 0.985', text)
        self.assertFalse(bad)

    def test_line_marks_a_blocker_and_a_missed_target(self):
        _, line = run(ROUND_1)
        text, bad = checks.reach_text({'reach': line})
        self.assertIn('a blocker for the app', text)
        self.assertIn('MORE THAN THE REACH', text)
        self.assertIn('1.1287', text)
        self.assertTrue(bad)

    def test_no_line_with_no_reach(self):
        self.assertEqual(checks.reach_text({}), (None, False))


if __name__ == '__main__':
    unittest.main()
