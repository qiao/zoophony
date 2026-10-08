"""The recipe of the wolf of the clarinets (design 4.3): the measures of the dog family
(`canine.py`), from the wolves of `orchestra-side.png`, `orchestra-latest.png`, and
`lowpoly-animals.png`: a wedge head with a flat crown and a long muzzle, white cheek ruffs that
go down the throat, a broad torso with a light chest, and light hands."""

import canine

#: The measures of the wolf, in H.
MEASURES = canine.Measures(
    skull=(0, 0.09, -0.02, 0.44, 0.44, 0.44),
    crown=(0, 0.34, -0.02, 0.36, 0.16, 0.36),
    face=(0, -0.08, -0.34, 0.33, 0.27, 0.28),
    muzzle_base=(0, -0.12, -0.46, 0.24, 0.19, 0.2),
    muzzle_tip=(0, -0.18, -0.9, 0.07),
    jaw_back=(0, -0.3, -0.42, 0.15),
    jaw_tip=(0, -0.34, -0.78, 0.055),
    cheek=(0.26, -0.18, -0.2, 0.21),
    cheek_tuft=(0.48, -0.3, 0.0, 0.05),
    cheek_chin=(0.08, -0.36, -0.5, 0.06),
    nose_z=-0.91,
    face_y=-0.1,
    face_slope=0.3,
    cheek_back=-0.1,
    belly=(0.3, -0.04, 0.48, 0.36, 0.5),
    chest=(0.84, 0.0, 0.38, 0.3, 0.32),
    ear_base=(-0.1, 0.22, 0.24),
    ear_heights=(0.06, -0.16, -0.05),
    ear_tip=(0.24, 0.55, 0.0),
    ear_turn=15,
    ear_inside=0.7,
    hand_region='belly',
    glove=0.15,
    haunch=(0.34, 0.34, 0.48, 0.16),
    knee=0.17,
    trunk_triangles=500,
    tail_brush=0.21,
    bib_v=(0.3, 0.42, 0.8, 0.12),
)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
