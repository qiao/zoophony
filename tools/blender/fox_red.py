"""The recipe of the red fox of the violins (design 4.3): the measures of the dog family
(`canine.py`), from `fox-views.png`."""

import canine

#: The measures of the red fox, in H.
MEASURES = canine.Measures(
    skull=(0, 0.1, -0.04, 0.55, 0.44, 0.43),
    face=(0, -0.06, -0.3, 0.4, 0.28, 0.27),
    muzzle_base=(0, -0.14, -0.46, 0.22, 0.16, 0.2),
    muzzle_tip=(0, -0.17, -0.78, 0.055),
    jaw_back=(0, -0.3, -0.42, 0.14),
    jaw_tip=(0, -0.33, -0.7, 0.05),
    cheek=(0.34, -0.14, -0.18, 0.25),
    cheek_tuft=(0.6, -0.24, -0.04, 0.05),
    belly=(0.3, -0.04, 0.42, 0.34, 0.48),
    chest=(0.84, 0.0, 0.32, 0.28, 0.3),
    bib=(0.34, 0.12, 0.05),
    ear_base=(-0.17, 0.24, 0.13),
    ear_tip=(0.22, 0.56, 0.03),
    ear_dark=0.4,
    ear_inside=0.75,
    eye=(0.25, 0.21, 20, 8),
    face_y=-0.06,
    sclera=True,
    glove=0.75,
    haunch=(0.3, 0.36, 0.58, 0.06),
    knee=0.19,
    shin=(0.15, 0.11),
    paw=(0.2, 0.13, 0.08, 0.22, 0.1),
    leg_triangles=120,
    trunk_triangles=430,
    tail_tip=(0.45, -0.4, 0.33),
    tail_middle=(0.2, 0.0, 0.165),
    tail_brush=0.3,
    tail_triangles=95,
    tail_end=0.13,
    tail_white=0.62,
)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
