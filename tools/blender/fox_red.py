"""The recipe of the red fox of the violins (design 4.3): the measures of the dog family
(`canine.py`), from `fox-views.png`."""

import canine

#: The measures of the red fox, in H.
MEASURES = canine.Measures(
    skull=(0, 0.1, -0.04, 0.47, 0.44, 0.43),
    crown=(0, 0.36, -0.02, 0.38, 0.16, 0.34),
    face=(0, -0.06, -0.3, 0.48, 0.28, 0.27),
    muzzle_base=(0, -0.14, -0.46, 0.22, 0.16, 0.2),
    muzzle_tip=(0, -0.17, -0.78, 0.07),
    jaw_back=(0, -0.27, -0.42, 0.14),
    jaw_tip=(0, -0.28, -0.66, 0.05),
    cheek=(0.24, -0.15, -0.24, 0.21),
    cheek_tuft=(0.62, -0.17, -0.06, 0.05),
    cheek_chin=(0.08, -0.32, -0.46, 0.06),
    nose_z=-0.77,
    belly=(0.3, -0.04, 0.4, 0.34, 0.48),
    chest=(0.84, 0.0, 0.3, 0.28, 0.3),
    bib=(0.34, 0.12, 0.05),
    bib_v=(0.24, 0.34, 0.66, 0.15),
    cheek_back=-0.15,
    ear_base=(-0.1, 0.26, 0.3),
    ear_heights=(0.1, -0.22, -0.05),
    ear_tip=(0.3, 0.58, -0.3),
    ear_dark=0.35,
    ear_back_dark=0.7,
    ear_turn=20,
    ear_ahead=0.08,
    ear_inside=0.75,
    eye=(0.34, 0.18, 20, 0),
    face_y=-0.08,
    face_slope=0.3,
    sclera=True,
    eye_offset=(0.05, -0.085, -0.02),
    iris=(0.088, 0.088),
    pupil=0.45,
    eye_light=0.022,
    lid=0.028,
    eye_depth=0.012,
    glove=0.25,
    haunch=(0.3, 0.36, 0.58, 0.06),
    knee=0.19,
    shin=(0.15, 0.11),
    sock=0.52,
    shin_rings=3,
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
