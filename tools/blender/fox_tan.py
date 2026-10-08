"""The recipe of the tan fox of the flutes (design 4.3): the measures of the red fox
(`fox_red.py`) with the colors of the tan fox. Its accent ears are dark from the base to the tip,
so they get no dark tip and no light inside."""

import dataclasses

import canine
import fox_red

#: The measures of the tan fox, in H.
MEASURES = dataclasses.replace(fox_red.MEASURES, ear_dark=0.0, ear_inside=0.0)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
