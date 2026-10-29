"""Tests of the reach of a role with a held instrument: studio/reach.py reach_report, and
studio/checks.py reach_checks and reach_text. Run in lowpoly-studio/:

    python3 -m unittest tests.test_reach

No Blender: the tests give the data of the stage "clips" (studio/reach.py reach_report) by hand,
with values near those of the rabbit violinist.
"""

import os
import sys
import unittest
from types import SimpleNamespace

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import checks, reach as reach_mod  # noqa: E402

# The role [checks] with the defaults of the schema.
LIMITS = SimpleNamespace(instrument_reach=(0.9, 1.1), ik_reach=1.0)


def reach(arm, length, clips):
    """Makes the reach data of the stage "clips" for one held violin: the arm from the neck to
    the middle of the palm, and the length of the violin."""
    return {'ik': arm - 0.1, 'palm': arm - 0.08, 'arm': arm, 'clips': clips,
            'instruments': [{'name': 'violin', 'kind': 'violin', 'length': length}]}


# Short arms: the bow paw asks for 1.13 of the reach in "ready".
ROUND_1 = reach(0.2247, 0.17, {'reference': {}, 'ready': {'L': [0.9641, 60], 'R': [1.1287, 24]},
                               'play': {'L': [0.9641, 120], 'R': [0.8665, 30]}})

# Arms with 1.4 times the reach, with a violin of a real player.
REAL = reach(0.3146, 0.31, {'ready': {'L': [0.7885, 48], 'R': [0.8145, 24]}})


def run(data):
    """Runs the reach checks on the data. Returns ({check name: check}, the reach line)."""
    r = checks.Report()
    line = checks.reach_checks(r, data, LIMITS, 30)
    return {c['name']: c for c in r.items}, line


# A small left arm: the neck 0.1 from the inner end of the clavicle, the clavicle 0.1 long, the
# upper arm 0.3, the forearm 0.4, a paw of 0.1 to its finger bone, and a prop bone of the hand
# that is no finger.
HEADS = {'neck': (-0.2, 0.0, 0.0), 'clavicle_L': (-0.1, 0.0, 0.0),
         'upper_arm_L': (0.0, 0.0, 0.0), 'forearm_L': (0.3, 0.0, 0.0),
         'hand_L': (0.3, -0.4, 0.0), 'fingers_L': (0.3, -0.5, 0.0), 'violin': (0.3, -0.4, 0.5)}
PARENTS = {'neck': None, 'clavicle_L': None, 'upper_arm_L': 'clavicle_L',
           'forearm_L': 'upper_arm_L', 'hand_L': 'forearm_L',
           'fingers_L': 'hand_L', 'violin': 'hand_L'}
NAMES = list(HEADS)


class ReachReportTest(unittest.TestCase):
    """The reach of the arm and the largest share of each clip."""

    def setUp(self):
        asked = {'reference': [[]],
                 'ready': [[('L', 0.9), ('R', 0.7)], [('L', 1.05), ('R', 0.6)], [('L', 1.0)]]}
        self.report = reach_mod.reach_report(HEADS, PARENTS, NAMES, asked)

    def test_reach_of_the_upper_arm_and_the_forearm(self):
        self.assertAlmostEqual(self.report['ik'], 0.7)

    def test_palm_adds_half_the_paw_and_no_prop_bone(self):
        self.assertAlmostEqual(self.report['palm'], 0.75)

    def test_arm_of_a_violin_shop_starts_at_the_neck(self):
        self.assertAlmostEqual(self.report['arm'], 0.95)

    def test_largest_share_and_its_frame_of_each_side(self):
        self.assertEqual(self.report['clips']['ready'], {'L': [1.05, 1], 'R': [0.7, 0]})

    def test_clip_with_no_ik_arm_is_empty(self):
        self.assertEqual(self.report['clips']['reference'], {})


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
        self.assertIn('from the neck to the middle of the palm 0.3146', text)
        self.assertIn('the violin 0.31', text)
        self.assertIn('ratio 0.985', text)
        self.assertFalse(bad)

    def test_line_has_two_sentences(self):
        _, line = run(ROUND_1)
        text, _ = checks.reach_text({'reach': line})
        self.assertNotIn(';', text)
        self.assertIn('). The IK targets', text)
        self.assertTrue(text.endswith('.'))

    def test_line_marks_a_blocker_and_a_missed_target(self):
        _, line = run(ROUND_1)
        text, bad = checks.reach_text({'reach': line})
        self.assertIn('a blocker for the app', text)
        self.assertIn('MORE THAN THE REACH', text)
        self.assertIn('1.1287', text)
        self.assertTrue(bad)

    def test_line_flags_a_short_violin_with_targets_in_the_reach(self):
        _, line = run(reach(0.3146, 0.234, {'ready': {'L': [0.7885, 48], 'R': [0.8145, 24]}}))
        text, bad = checks.reach_text({'reach': line})
        self.assertIn('a blocker for the app', text)
        self.assertNotIn('MORE THAN THE REACH', text)
        self.assertTrue(bad)

    def test_no_line_with_no_reach(self):
        self.assertEqual(checks.reach_text({}), (None, False))


if __name__ == '__main__':
    unittest.main()
