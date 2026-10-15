"""Tests of the lift of the sheet views (field.lift): the parts above the knees stand higher than on
the sheet, so the measures of the masks read the sheet lower. The body needs numpy, so run:
uv run --no-project --with numpy python3 -m unittest tests.test_lift
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio.field import lifted_views  # noqa: E402


VIEWS = {
    'front': {'height_px': 559, 'profile': [{'y': 0.30, 'runs': [[-0.2, 0.2]]},
                                            {'y': 0.31, 'runs': [[-0.21, 0.21]]}]},
    'side': {'height_px': 578, 'profile': [{'y': 0.30, 'runs': [[-0.1, 0.15]]}]},
}


class LiftTest(unittest.TestCase):
    def test_no_lift_keeps_the_views(self):
        self.assertIs(lifted_views(VIEWS, 0.0), VIEWS)

    def test_lift_moves_each_row_up(self):
        lifted = lifted_views(VIEWS, 0.0725)
        self.assertEqual([row['y'] for row in lifted['front']['profile']],
                         [0.30 + 0.0725, 0.31 + 0.0725])
        self.assertAlmostEqual(lifted['side']['profile'][0]['y'], 0.3725)

    def test_lift_keeps_the_runs_and_the_other_measures(self):
        lifted = lifted_views(VIEWS, 0.0725)
        self.assertEqual(lifted['front']['profile'][1]['runs'], [[-0.21, 0.21]])
        self.assertEqual(lifted['side']['height_px'], 578)
        self.assertEqual(VIEWS['front']['profile'][0]['y'], 0.30)


if __name__ == '__main__':
    unittest.main()
