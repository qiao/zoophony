"""The recipe of the polar bear at the piano (design 4.3): the measures of the bear family
(`ursine.py`), from `polar-bear-views.png`.

The measures fit the skeleton of option A of `docs/research/2026-10-07-proportions.md`
(H = 0.41 m, the head center 2.4 H above the seat and 0.6 H in front of the torso, the shoulder
joints 1.51 H above the seat). The nose, the claws, and the pads have the accent color of the
nose.
"""

import ursine

#: The measures of the polar bear, in H.
MEASURES = ursine.Measures()

_RECIPE = ursine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
