"""Tests of the prop rules of a role pack (studio/config.py): the attachments of each prop kind.
Run in lowpoly-studio/:

    python3 -m unittest tests.test_role_props

No numpy and no Blender: the tests read role.toml files and check them against the schema.
"""

import os
import sys
import tomllib
import unittest

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import config  # noqa: E402
from studio.schema import ROLE  # noqa: E402


def role_errors(raw):
    """Resolves a raw role table and returns the problems that the config checks find."""
    errors = []
    role = config._resolve(ROLE, raw, '', errors)
    if not errors:
        config._role_checks(role, errors)
    return errors


# A seated role with a violin in the left paw and a bow in the right paw.
HELD = """
[role]
name = "held"
stance = "seated"
doc = "Holds a violin and a bow."

[bind]
shoulder_flex = 40.0
shoulder_abduct = 18.0
elbow_flex = 70.0

[[props]]
name = "violin"
kind = "violin"
attach = { bone = "hand", side = "L" }
grip = [0.0, 0.008, 0.02]
direction = [-1.0, 0.0, 0.0]
strings = { top = [0.0, 1.0, 0.25] }
material = { roughness = 0.35, specular = 0.6 }

[[props]]
name = "bow"
kind = "bow"
attach = { bone = "hand", side = "R" }
grip = [0.0, 0.01, 0.018]
direction = [1.0, 0.15, 0.0]
strings = { bow_for = "violin" }
material = { roughness = 0.4, specular = 0.5 }

[targets]
shoulder = [0.07, 0.485, 0.025]
reach = 0.2
"""


def violinist_raw():
    """Parses the raw table of a role with a violin in a hand."""
    return tomllib.loads(HELD)


class HeldViolinTest(unittest.TestCase):
    """A violin stands in the scene, or a paw holds it at the neck."""

    def test_a_paw_holds_a_violin(self):
        """A violin in the left paw and a bow in the right paw pass the config checks."""
        self.assertEqual(role_errors(violinist_raw()), [])

    def test_a_violin_in_a_hand_gets_the_defaults_of_its_place(self):
        """The top plate and the neck share of a violin in a hand have defaults."""
        errors = []
        role = config._resolve(ROLE, violinist_raw(), '', errors)
        violin = next(p for p in role.props if p.kind == 'violin')
        self.assertEqual(errors, [])
        self.assertEqual(violin.strings.neck, 0.75)

    def test_a_violin_in_a_hand_needs_a_grip_and_a_direction(self):
        """A violin in a hand with no grip and no direction fails the config checks."""
        raw = violinist_raw()
        violin = next(p for p in raw['props'] if p['kind'] == 'violin')
        del violin['grip']
        del violin['direction']
        errors = role_errors(raw)
        self.assertTrue(any('grip: missing' in e for e in errors), errors)
        self.assertTrue(any('direction: missing' in e for e in errors), errors)

    def test_a_violin_does_not_attach_to_another_bone(self):
        """A violin on a bone that is not a hand and not the scene fails the config checks."""
        raw = violinist_raw()
        violin = next(p for p in raw['props'] if p['kind'] == 'violin')
        violin['attach']['bone'] = 'chest'
        errors = role_errors(raw)
        self.assertTrue(any('attach.bone' in e for e in errors), errors)

    def test_a_bow_stays_in_a_hand(self):
        """A bow in the scene fails the config checks."""
        raw = violinist_raw()
        bow = next(p for p in raw['props'] if p['kind'] == 'bow')
        bow['attach'] = {'bone': 'scene'}
        errors = role_errors(raw)
        self.assertTrue(any('a "bow" needs attach.bone = "hand"' in e for e in errors), errors)


if __name__ == '__main__':
    unittest.main()
