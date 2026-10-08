"""The recipe of the red fox of the violins (design 4.3): the measures of the dog family
(`canine.py`), from `fox-views.png`."""

import canine

#: The measures of the red fox, in H.
MEASURES = canine.Measures(
    ear_base=(-0.12, 0.2, 0.12),
    ear_tip=(0.22, 0.7, 0.02),
    ear_dark=0.4,
    eye=(0.24, 0.15, 20, 8),
    sclera=True,
    glove=0.5,
    haunch=(0.34, 0.34, 0.48, 0.16),
    knee=0.17,
    leg_triangles=120,
    trunk_triangles=540,
    tail_tip=(0.45, -0.62, 0.3),
    tail_brush=0.23,
    tail_white=0.62,
)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
