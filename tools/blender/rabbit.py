"""The recipe of the white rabbit of the first violins (design 4.3): the measures of the rabbit
family (`leporine.py`), from `rabbit-views.png`.

The measures fit the skeleton of option A of `docs/research/2026-10-07-proportions.md`
(H = 0.293 m, the head center 2.10 H and the shoulder joints 1.41 H above the seat). The note
`docs/research/2026-10-08-blender-rabbit.md` gives the steps that wire the sculpt in.
"""

import leporine

#: The measures of the rabbit, in H.
MEASURES = leporine.Measures()

_RECIPE = leporine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
