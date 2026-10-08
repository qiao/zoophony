"""The recipe of the panda with the trombone (design 4.3): the measures of the bear family
(`ursine.py`), from the pandas of `orchestra-latest.png` and `orchestra-side.png`.

The panda keeps the default skeleton: its heights in the scenes are within 10% of ours
(`docs/research/2026-10-07-proportions.md`, section 4). The pattern follows the scenes: a white
round head with black round ears and black eye patches that point down and out, a short white
muzzle with a black nose, a black band over the shoulders and the upper chest that joins the
black arms, a white belly, and black legs.
"""

import ursine

#: The color of the nose, as `NOSE_COLOR` of `models/species.ts`.
NOSE_COLOR = '#2a1d15'

#: The measures of the panda, in H.
MEASURES = ursine.Measures(
    head=(
        (0, 0.06, 0.02, 0.44, 0.45, 0.46),
        (0.2, -0.12, -0.08, 0.25, 0.25, 0.3),
        (0, -0.16, -0.34, 0.2, 0.15, 0.2),
        (0, -0.17, -0.45, 0.13, 0.11, 0.08),
        (0, -0.3, -0.2, 0.2, 0.11, 0.22),
    ),
    belly=(0, 0.5, -0.08, 0.64, 0.55, 0.56),
    chest=(0, 0.82, -0.09, 0.6, 0.4, 0.42),
    back=(0, 0.95, -0.04, 0.55, 0.4, 0.28),
    seat=(0, 0.3, -0.04, 0.66, 0.35, 0.38),
    yoke=(0, 0.0, -0.04, 0.55, 0.25, 0.3),
    neck=(0, -0.46, 0.0, 0.42, 0.3, 0.38),
    trunk_triangles=500,
    leg_triangles=(120, 60, 70),
    nose=(-0.15, 0.085, 0.065, 0.05),
    mouth=None,
    ear=(0.36, 0.42, 0.02, 0.13, 0.07),
    ear_turn=15,
    eye=(28, 0.04, 0.08, 0.09, 0.05),
    arm=(0.22, 0.19, 0.19, 0.15),
    palm=(0.12, 0.14, 0.14),
    fingers=(0.11, 0.13, 0.1),
    claws=None,
    haunch=(0.36, 0.34, 0.52, 0.3, 0.04),
    knee=(0.27, 0.26, 0.24, 0.04),
    shin=(0.25, 0.23, 0.0),
    foot=(0.2, 0.4, 0.26, 0.26),
    toe_claws=None,
    tail=(0, 0.04, -0.04, 0.14),
    panda=True,
)

_RECIPE = ursine.Recipe(MEASURES, dark=NOSE_COLOR)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
