"""The recipe of the cat of the violas (design 4.3): the measures of the cat family
(`feline.py`), from the cats of `orchestra-side.png`, `orchestra-latest.png`, and
`lowpoly-animals.png`: plain gray, a wide head with a flat crown, large ears with pink insides at
the top corners of the head, amber eyes, cheeks that flare out under the eyes, a short light
muzzle with a pink nose, light paws, and thin lower legs.

The cat keeps the default skeleton: the proportions report measured it within 10% of the scenes
(`docs/research/2026-10-07-proportions.md`, section 4).
"""

import feline

#: The measures of the cat, in H.
MEASURES = feline.Measures(
    skull=(0, 0.06, 0.0, 0.45, 0.42, 0.42),
    crown=(0, 0.38, 0.0, 0.4, 0.14, 0.34),
    face=(0, -0.06, -0.26, 0.4, 0.3, 0.3),
    cheek=(0.26, -0.14, -0.22, 0.22),
    cheek_tuft=(0.5, -0.16, -0.08, 0.06),
    muzzle_base=(0, -0.1, -0.44, 0.12, 0.1, 0.12),
    muzzle_tip=(0, -0.13, -0.58, 0.05),
    whisker_pad=(0.1, -0.22, -0.5, 0.12),
    jaw_back=(0, -0.3, -0.34, 0.13),
    jaw_tip=(0, -0.34, -0.48, 0.07),
    nose=(-0.12, 0.07, 0.05, 0.04),
    muzzle_light=(-0.12, -0.34, 0.26),
    ear_base=(-0.12, 0.2, 0.25),
    ear_heights=(0.1, -0.12, 0.0),
    ear_tip=(0.16, 0.42, 0.02),
    ear_turn=15,
    ear_inside=0.72,
    eye=(0.18, 0.11, 21, 8),
    eye_offset=(0.01, 0.05, 0.0),
    eye_light=0.02,
    hand_region='belly',
    glove=0.12,
    hand_back=0.05,
    finger_lift=0.03,
    paw_region='belly',
    neck=(0.32, 0.2, 0.28, 0.36, 0.2, 0.3),
    trunk_triangles=560,
)

_RECIPE = feline.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
