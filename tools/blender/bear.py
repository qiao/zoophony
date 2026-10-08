"""The recipe of the brown bear on the podium (design 4.3): the measures of the bear family
(`ursine.py`), from the bear of `orchestra-latest.png` and `orchestra-side.png`.

The measures fit the skeleton of option A of `docs/research/2026-10-07-proportions.md`
(H = 0.45 m, the base of the torso 0.9 H above the floor, the shoulder joints 1.7 H and the head
center 2.45 H above it). The bear stands, so its body is a tall pear: a round head with round
ears and a short muzzle of the accent color, a wide body, short thick arms, and short thick legs.
Its nose and its foot pads are dark brown, and it has no visible claws.
"""

import ursine

#: The dark brown of the nose and the foot pads, as `NOSE_COLOR` of `models/species.ts`.
NOSE_COLOR = '#2a1d15'

#: The measures of the brown bear, in H.
MEASURES = ursine.Measures(
    head=(
        (0, 0.08, 0.02, 0.5, 0.43, 0.44),
        (0, 0.06, -0.24, 0.27, 0.25, 0.26),
        (0.26, -0.1, -0.1, 0.27, 0.24, 0.28),
        (0, -0.14, -0.36, 0.2, 0.17, 0.2),
        (0, -0.15, -0.48, 0.14, 0.12, 0.1),
        (0, -0.29, -0.2, 0.2, 0.11, 0.22),
    ),
    belly=(0, 0.72, -0.05, 0.72, 0.76, 0.6),
    chest=(0, 1.3, -0.05, 0.66, 0.55, 0.55),
    back=(0, 1.62, 0.15, 0.62, 0.5, 0.5),
    seat=(0, 0.35, 0.12, 0.78, 0.48, 0.5),
    yoke=(0, 0.0, 0.0, 0.58, 0.3, 0.45),
    neck=(0, -0.44, -0.02, 0.46, 0.38, 0.4),
    nose=(-0.13, 0.1, 0.075, 0.06),
    mouth=None,
    ear=(0.33, 0.44, 0.02, 0.12, 0.06),
    ear_turn=10,
    eye=(30, 0.08, 0.09, 0.1, 0.05),
    arm=(0.26, 0.22, 0.22, 0.18),
    palm=(0.12, 0.16, 0.15),
    fingers=(0.11, 0.15, 0.1),
    claws=None,
    haunch=(0.42, 0.42, 0.5, 0.15, 0.0),
    knee=(0.34, 0.32, 0.3, 0.0),
    shin=(0.37, 0.35, 0.0),
    foot=(0.25, 0.5, 0.3, 0.3),
    toe_claws=None,
    tail=(0, 0.05, -0.04, 0.15),
)

_RECIPE = ursine.Recipe(MEASURES, dark=NOSE_COLOR, light_muzzle=True)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
