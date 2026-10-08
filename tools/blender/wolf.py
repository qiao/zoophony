"""The recipe of the wolf of the clarinets (design 4.3): the measures of the dog family
(`canine.py`), from the wolves of `orchestra-side.png`, `orchestra-latest.png`, and
`lowpoly-animals.png`: a wedge head with a long muzzle and full cheek ruffs, and gray hands and
legs."""

import canine

#: The measures of the wolf, in H.
MEASURES = canine.Measures(
    skull=(0, 0.09, -0.02, 0.44, 0.44, 0.44),
    face=(0, -0.08, -0.34, 0.33, 0.27, 0.28),
    muzzle_base=(0, -0.12, -0.46, 0.24, 0.19, 0.2),
    muzzle_tip=(0, -0.18, -0.9, 0.07),
    jaw_back=(0, -0.3, -0.42, 0.15),
    jaw_tip=(0, -0.34, -0.78, 0.055),
    cheek=(0.27, -0.22, -0.2, 0.22),
    cheek_tuft=(0.58, -0.4, -0.04, 0.06),
    nose_z=-0.91,
    ear_tip=(0.18, 0.55, 0.05),
    haunch=(0.34, 0.34, 0.48, 0.16),
    knee=0.17,
    trunk_triangles=560,
    tail_brush=0.21,
    bib=(0.14, 0.26, 0.4),
)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
