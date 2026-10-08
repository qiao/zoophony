"""The recipe of the tan fox of the flutes (design 4.3): the measures of the red fox
(`fox_red.py`) with the colors of the tan fox. Its accent ears are dark from the base to the tip,
so they need no dark tip."""

import dataclasses

import canine
import fox_red

#: The measures of the tan fox, in H.
MEASURES = dataclasses.replace(fox_red.MEASURES, ear_dark=0.0)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
