"""The recipe of the dog of the cellos (design 4.3): the measures of the dog family
(`canine.py`), from the golden retriever of `dog-views.png`: one golden color, a broad head and
muzzle with a large black nose, dark eyes, soft hanging ears, and long fur at the chest, at the
backs of the forearms and the thighs, and on the tail, a plume that hangs behind the chair."""

import canine

#: The measures of the dog, in H.
MEASURES = canine.Measures(
    skull=(0, 0.06, 0.02, 0.5, 0.45, 0.48),
    crown=(0, 0.36, 0.0, 0.42, 0.14, 0.38),
    face=(0, -0.05, -0.32, 0.38, 0.3, 0.28),
    muzzle_base=(0, -0.16, -0.5, 0.3, 0.2, 0.22),
    muzzle_tip=(0, -0.14, -0.76, 0.15),
    jaw_back=(0, -0.32, -0.4, 0.16),
    jaw_tip=(0, -0.33, -0.7, 0.08),
    cheek=(0.24, -0.2, -0.3, 0.2),
    cheek_tuft=(0.3, -0.3, -0.2, 0.08),
    nose_z=-0.84,
    plain=True,
    belly=(0.3, -0.06, 0.55, 0.38, 0.5),
    chest=(0.95, -0.02, 0.6, 0.45, 0.42),
    neck=(0.5, 0.4, 0.45, 0.46, 0.35, 0.4),
    yoke=(0.3, 0.3, 0.32, 0.55, 0.4, 0.4),
    chest_ruff=(1.05, -0.34, 0.36, 0.34, 0.16, 0.6, -0.4, 0.06),
    ear_hang=(-0.1, 0.02, 0.0, 0.06, -0.55, -0.1, 0.42, 0.07),
    eye=(0.14, 0.11, 25, 0),
    eye_light=0.02,
    arm_radii=(0.24, 0.19, 0.17, 0.12),
    arm_feather=(0.1, 0.13, 0.07, 0.18, 0.1),
    hand_back=0.05,
    finger_lift=0.03,
    haunch=(0.46, 0.42, 0.66, 0.1),
    knee=0.24,
    shin=(0.22, 0.17),
    paw=(0.32, 0.19, 0.11, 0.34, 0.14),
    leg_feather=(0.5, 0.25, 0.15, 0.12, 0.2, 0.2),
    trunk_triangles=520,
    tail_middle=(0, -0.45, 0.25),
    tail_tip=(0, -0.78, 0.24),
    tail_brush=0.26,
    tail_end=0.08,
    tail_triangles=110,
)

_RECIPE = canine.Recipe(MEASURES)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
