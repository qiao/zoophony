"""The recipe of the dog family (design 4.3): the forms, the color regions, and the skin of each
shell of the foxes and the wolf.

A species file (for example `fox_red.py`) gives its measures (`Measures`), and `Recipe` makes
the three steps that `build_sculpt.py` calls. All sizes are in H, the head height of the species.
A point is a bone or a body point of the rig plus an offset in the model axes: x to the right side
of the animal, y up, z to the back.
"""

import dataclasses
import math

from mathutils import Matrix, Vector

import kit
from kit import Part, chain_skin, cut, hull, low_poly, mirrored, offset, shell, split_joints

#: The colors of the eyes and the nose, as `EYE_COLOR` and `NOSE_COLOR` of `models/species.ts`.
EYE_COLOR = '#15110e'
NOSE_COLOR = '#2a1d15'

#: The color of the white of an eye, as the eyes of `fox-views.png` (`#f5eadf`).
SCLERA_COLOR = '#f2e9df'

#: The tilt of the field of the trunk skin: a point 1 m in front counts as `TILT` m higher, so
#: that the muzzle and the jaw follow the head, and the nape follows the neck.
TILT = 0.3

#: The default skeleton, as `DEFAULT_PROPORTIONS` of `models/proportions.ts`: the shoulder joints
#: and the head center above the base of the torso, in H. The heights of the forms of the torso
#: are on this skeleton, and `Frame.torso()` moves them to the skeleton of the species.
DEFAULT_SHOULDER_HEIGHT = 0.98
DEFAULT_HEAD_CENTER = 1.8

#: The distance of each shoulder joint from the middle on the default skeleton, in H.
DEFAULT_SHOULDER_SPREAD = 0.52

#: The distance of the neck ring below the head center, in H (`HEAD_BONE_DROP` of
#: `models/trunk.ts`).
HEAD_BONE_DROP = 0.5

#: The height of the `hips` bone above the base of the torso on the default skeleton, in H.
HIPS = 0.15


@dataclasses.dataclass(frozen=True)
class Measures:
    """The measures of one species of the dog family, in H.

    An ellipsoid is (x, y, z, rx, ry, rz): a center offset from the head center and its radii, in
    the model axes (rx across, ry up, rz along the head). A ball is (x, y, z, r).
    """

    #: The skull: a round ellipsoid around the head center, as the round heads of
    #: `fox-views.png`.
    skull: tuple = (0, 0.1, -0.06, 0.44, 0.44, 0.42)
    #: The face in front of the skull, which carries the eyes.
    face: tuple = (0, -0.06, -0.32, 0.33, 0.28, 0.27)
    #: The base of the muzzle on the face.
    muzzle_base: tuple = (0, -0.13, -0.46, 0.22, 0.17, 0.2)
    #: The tip of the muzzle under the nose.
    muzzle_tip: tuple = (0, -0.15, -0.8, 0.06)
    #: The back of the lower jaw, and its front end at the mouth.
    jaw_back: tuple = (0, -0.3, -0.42, 0.14)
    jaw_tip: tuple = (0, -0.33, -0.72, 0.05)
    #: The cheek ruff of the right side: a full cheek, and a tuft that points out and down.
    cheek: tuple = (0.25, -0.2, -0.25, 0.21)
    cheek_tuft: tuple = (0.5, -0.32, -0.1, 0.05)
    #: The triangles of the trunk shell after the decimate.
    trunk_triangles: int = 640
    #: The plane of the nose, in H in front of the head center (a negative z).
    nose_z: float = -0.8
    #: The height of the border of the white lower face under the eyes, from the head center.
    face_y: float = -0.1
    #: The rise of the border of the white lower face along the muzzle, in H for each H to the
    #: front. The lower half of each side of the muzzle is white, as on the foxes of
    #: `lowpoly-animals.png`.
    face_slope: float = 0.24
    #: The plane of the nape, in H behind the head center. The fur behind it keeps the fur color.
    nape: float = 0.02
    #: The half width of the white bib at its bottom and at its top, and the height of its bottom
    #: above the base of the torso.
    bib: tuple = (0.2, 0.32, 0.25)
    #: The base of the right ear, from the ear bone: the inner and the outer corner across, and
    #: the back corner.
    ear_base: tuple = (-0.09, 0.17, 0.1)
    #: The tip of the right ear, from the ear bone.
    ear_tip: tuple = (0.2, 0.62, 0.02)
    #: The part of the ear height, from the tip, that has the accent color. 0 for none.
    ear_dark: float = 0.0
    #: The size of the light inside of the ear as a part of the ear, as the ears of
    #: `fox-views.png`: a flat part in front of the ear with a rim of fur around it. 0 gives the
    #: inner color to the front faces of the ear.
    ear_inside: float = 0.0
    #: The eye: the width and the height of the white of the eye, or of the iris with no white,
    #: and the turn out from the front and the tilt of the outer end, in degrees.
    eye: tuple = (0.17, 0.095, 20, 14)
    #: True for an eye with a white around a round iris, as `fox-views.png`. Else the eye is an
    #: almond iris with a pupil.
    sclera: bool = False
    #: The part of the forearm, from the wrist, that has the accent color of the hands. 0 for
    #: the hands only.
    glove: float = 0.0
    #: The haunch: the radii across, up, and along the thigh, and its place along the thigh from
    #: the hip, in H.
    haunch: tuple = (0.36, 0.3, 0.5, 0.08)
    #: The radius of the leg at the knee.
    knee: float = 0.16
    #: The triangles of each leg after the decimate.
    leg_triangles: int = 120
    #: The tip of the tail from the `tail2` bone, and the radius of the brush.
    tail_tip: tuple = (0, -0.66, 0.3)
    tail_brush: float = 0.19
    #: The part of the second bone of the tail, from the joint, before the white tip.
    tail_white: float = 0.72


def regions(f):
    """Gives the color regions of the species: a color and a finish each (design 4.5)."""
    colors = f.rig.colors
    return {
        'fur': {'color': colors['fur'], 'finish': 'fur'},
        'belly': {'color': colors['belly'], 'finish': 'fur'},
        'accent': {'color': colors['accent'], 'finish': 'fur'},
        'nose': {'color': NOSE_COLOR, 'finish': 'matte'},
        'inner-ear': {'color': colors['belly'], 'finish': 'matte'},
        'iris': {'color': colors['iris'], 'finish': 'lacquer'},
        'pupil': {'color': EYE_COLOR, 'finish': 'lacquer'},
        'sclera': {'color': SCLERA_COLOR, 'finish': 'lacquer'},
    }


class Frame:
    """The points of the species in Blender axes, from the rig and offsets in H."""

    def __init__(self, rig, measures):
        self.rig = rig
        self.m = measures
        self.h = rig.h
        self.proportions = rig.proportions
        self.base = rig.bone('hips') - Vector((0, 0, self.torso(HIPS) * rig.h))
        self.center = rig.point('headCenter')
        # The height where the field of the trunk skin starts to tilt, in meters: the middle of
        # the rigid band of the chest.
        self.switch = 0.5 * (self.height('chest') + self.height('neck'))

    def torso(self, y):
        """Gives the height on the skeleton of the species of a height of the default skeleton.

        The map is the map of `torsoHeights()` of `models/trunk.ts`: below the shoulder joints, a
        height scales with the joints. Above them, a height keeps its part of the way from the
        joints to the neck ring. The default skeleton keeps each height. Both heights are in H
        above the base of the torso.
        """
        joints = self.proportions['shoulderHeight']
        neck_ring = self.proportions['headCenter'] - HEAD_BONE_DROP
        default_neck_ring = DEFAULT_HEAD_CENTER - HEAD_BONE_DROP
        if y <= DEFAULT_SHOULDER_HEIGHT:
            # The scale is 1 exactly on the default skeleton, so the height has no rounding.
            return y * (joints / DEFAULT_SHOULDER_HEIGHT)
        stretch = (neck_ring - joints) / (default_neck_ring - DEFAULT_SHOULDER_HEIGHT)
        return y + (joints - DEFAULT_SHOULDER_HEIGHT) + (y - DEFAULT_SHOULDER_HEIGHT) * (stretch - 1)

    def height(self, bone):
        """Gives the height of a bone above the floor, in meters."""
        return kit.to_model(self.rig.bone(bone))[1]

    def at(self, base, x, y, z):
        """Gives a point: a base point plus an offset in H in the model axes."""
        if isinstance(base, str):
            base = self.rig.bone(base)
        return base + offset(x, y, z) * self.h

    def local(self, p, base):
        """Gives the offset of a point from a base point, in H in the model axes."""
        x, y, z = kit.to_model(p - base)
        return x / self.h, y / self.h, z / self.h

    def ellipsoid(self, values):
        """Gives the (center, radii) of an ellipsoid (x, y, z, rx, ry, rz) at the head center."""
        x, y, z, rx, ry, rz = values
        # The radii in Blender axes: across, along the head, and up.
        return (self.at(self.center, x, y, z), (rx * self.h, rz * self.h, ry * self.h))

    def ball(self, values):
        """Gives the (center, radius) of a ball (x, y, z, r) at the head center."""
        x, y, z, r = values
        return (self.at(self.center, x, y, z), r * self.h)


def trunk(f):
    """Builds the torso, the neck, and the head with the muzzle and the cheek ruffs."""
    h = f.h
    c = f.center
    m = f.m
    y = f.torso
    # The yoke ball over each shoulder joint: 0.19 H inside the joint, so that the torso is 0.5 H
    # wide at the joints with the default spread. The sum keeps 0.33 exact on that spread.
    yoke = 0.33 + (f.proportions['shoulderSpread'] - DEFAULT_SHOULDER_SPREAD)
    forms = [
        # The pear of the torso: a belly on the seat and a narrower chest.
        hull([
            (f.at(f.base, 0, y(0.4), -0.02), (0.5 * h, 0.46 * h, 0.4 * h)),
            (f.at(f.base, 0, y(0.92), 0.0), (0.42 * h, 0.34 * h, 0.3 * h)),
        ]),
        # The shoulder yoke: the torso is 0.5 H wide at the shoulder joints, so that the ball of
        # each upper arm sinks into it (design 4.5, `SHOULDER_JOINT`).
        hull([
            (f.at(f.base, yoke, y(0.98), 0.0), (0.17 * h, 0.15 * h, 0.13 * h)),
            (f.at(f.base, 0, y(0.98), 0.0), (0.3 * h, 0.3 * h, 0.2 * h)),
        ]),
        # The neck, from the shoulders to under the head.
        hull([
            (f.at(f.base, 0, y(1.12), 0.0), (0.3 * h, 0.28 * h, 0.2 * h)),
            (f.at(c, 0, -0.32, 0.1), (0.28 * h, 0.28 * h, 0.2 * h)),
        ]),
        # The skull: a wedge from the wide back of the head to the flat face.
        hull([f.ellipsoid(m.skull), f.ellipsoid(m.face)]),
        # The muzzle, from the face to the nose.
        hull([f.ellipsoid(m.muzzle_base), f.ball(m.muzzle_tip)]),
        # The lower jaw, under the muzzle, to the mouth.
        hull([f.ball(m.jaw_back), f.ball(m.jaw_tip)]),
        # The cheek ruff of the right side: a full cheek with a tuft that points out and down.
        hull([f.ball(m.cheek), f.ball(m.cheek_tuft)]),
    ]
    bm = shell(
        'trunk', forms, voxel=0.005, triangles=m.trunk_triangles, smooth=0.5, smooth_steps=4,
        mirror=True,
    )

    # The color borders.
    color = trunk_colors(f)
    for point, normal, where in color['cuts']:
        cut(bm, point, normal, where)

    # The borders of the main bones (design 4.7): each triangle then follows one bone, or a bone
    # and its parent.
    levels = trunk_levels(f)
    rule = trunk_skin(f, levels)
    planes = level_planes(f, levels)
    split_joints(bm, rule, ['hips', 'spine', 'chest', 'neck', 'head'], planes)

    part = Part('trunk', bm)
    part.paint(color['rule'])
    part.skin_by(rule)
    return part


def field(f, p):
    """Gives the field of the trunk skin at a point.

    Below the middle of the chest, it is the height, so that the borders of the hips, the spine,
    and the chest are level, as the rings of the parametric torso. Above it, the height counts
    more at the front (`TILT`), so that the jaw follows the head and the nape follows the neck.
    The chest is rigid at the switch, so the skin has no step.
    """
    _, y, z = kit.to_model(p)
    return y if y < f.switch else y - TILT * z


def trunk_levels(f):
    """Gives the anchors of the trunk skin: (field, bone), from the bottom up.

    Between two anchors of different bones, the weight changes linearly. The levels follow the
    parametric body: the torso below the chest follows `hips` and `spine`, the upper torso and
    the shoulders follow `chest`, a band follows `neck`, and the head is rigid (design 4.7).
    """
    h = f.h
    y = f.height
    return [
        (y('hips') + 0.12 * h, 'hips'),
        (y('spine') + 0.12 * h, 'spine'),
        (y('chest'), 'chest'),
        (y('neck') + 0.05 * h, 'chest'),
        (y('head'), 'neck'),
        (y('head') + 0.16 * h, 'head'),
    ]


def level_planes(f, levels):
    """Gives the (point, normal) of each plane where the main bone of the trunk changes."""
    planes = []
    for (low, lower), (high, upper) in zip(levels, levels[1:]):
        if lower == upper:
            continue
        middle = 0.5 * (low + high)
        normal = offset(0, 1, 0) if middle < f.switch else offset(0, 1, -TILT).normalized()
        planes.append((Vector((0, 0, middle)), normal))
    return planes


def trunk_skin(f, levels):
    """Makes the skin rule of the trunk from its anchors."""

    def rule(p):
        value = field(f, p)
        if value <= levels[0][0]:
            return (levels[0][1], levels[0][1], 0.0)
        for (low, lower), (high, upper) in zip(levels, levels[1:]):
            if value <= high:
                if lower == upper:
                    return (lower, lower, 0.0)
                weight = (value - low) / (high - low)
                # A corner on a cut between two main bones gets 0.5 exactly, so that it keeps
                # the parent as its main bone.
                if abs(weight - 0.5) < 1e-4:
                    weight = 0.5
                return kit.blend(lower, upper, weight)
        return (levels[-1][1], levels[-1][1], 0.0)

    return rule


def trunk_colors(f):
    """Gives the color cuts and the paint rule of the trunk (design 4.3, 4.5).

    - The nose: the tip of the muzzle.
    - The lower face: the belly color below a border that runs from the nose up the side of the
      muzzle to under the eyes, and drops behind the cheeks, as the white cheeks of
      `lowpoly-animals.png`. The nape keeps the fur color.
    - The chest: a white bib that narrows down, between the arms.
    """
    c = f.center
    m = f.m
    nose_z = m.nose_z
    face_y = m.face_y

    def head_part(p):
        _, y, z = f.local(p, c)
        return y > -0.75 and z < 0.35

    def front(p):
        _, y, z = f.local(p, c)
        return z < -0.4 and y > -0.7

    def back(p):
        x, y, z = f.local(p, c)
        return -0.5 < z < m.nape + 0.1 and y > -0.75 and abs(x) > 0.12

    def nape(p):
        _, y, _ = f.local(p, c)
        return -0.75 < y < -0.15

    # The bib heights are on the default skeleton. The map of the torso moves them.
    low, high, bottom = m.bib
    bottom = f.torso(bottom)
    top = f.torso(1.2)

    def bib(p):
        x, y, z = f.local(p, f.base)
        return z < 0.0 and f.torso(0.25) < y < f.torso(1.4) and abs(x) < 0.45

    def bib_bottom(p):
        x, y, z = f.local(p, f.base)
        return z < 0.0 and bottom - 0.1 < y < bottom + 0.1 and abs(x) < low + 0.12

    # The face border: level under the eyes at the front, up to the nose along the muzzle.
    front_point = f.at(c, 0, face_y, -0.45)
    front_normal = offset(0, 1, -m.face_slope).normalized()
    back_normal = offset(0, 1, 0.45).normalized()
    # The bib border at each side: from its bottom half width at its bottom to its top half
    # width at 1.2 H above the base on the default skeleton.
    slope = (high - low) / (top - bottom)

    def bib_point(side):
        return f.at(f.base, side * low, bottom, 0)

    def bib_normal(side):
        return offset(side * 1.0, -side * slope, 0).normalized()

    cuts = [
        (f.at(c, 0, 0, nose_z), offset(0, 0, 1), front),
        (front_point, front_normal, front),
        (front_point, back_normal, back),
        (bib_point(1), bib_normal(1), bib),
        (bib_point(-1), bib_normal(-1), bib),
        (f.at(f.base, 0, bottom, 0), offset(0, 1, 0), bib_bottom),
        (f.at(c, 0, 0, m.nape), offset(0, 0, 1), nape),
    ]

    def rule(p):
        x, y, z = f.local(p, c)
        if z < nose_z and y > -0.45:
            return 'nose'
        if head_part(p):
            if z > m.nape:
                return 'fur'
            if z < -0.45:
                border = face_y + m.face_slope * (z + 0.45)
            else:
                border = face_y - 0.45 * (z + 0.45)
            return 'belly' if y < border else 'fur'
        bx, by, bz = f.local(p, f.base)
        width = low + slope * (by - bottom)
        if bz < 0.1 and by > bottom and abs(bx) < width:
            return 'belly'
        return 'fur'

    return {'cuts': cuts, 'rule': rule}


def accent_or(f, part, color):
    """Gives 'accent' when the species has the accent part (design 4.5), else the color."""
    return 'accent' if part in f.rig.accent_parts else color


def arm(f, side):
    """Builds an arm: two rigid faceted capsules that overlap at the elbow.

    The upper arm has a ball around the shoulder joint, which sinks into the torso, and the
    forearm has a ball around the elbow joint, which fills the outer side of a bent elbow. A
    rigid part on each bone bends at the elbow with no fold, and a remeshed tube made long thin
    facets from the hand to the shoulder.
    """
    h = f.h
    shoulder = f.rig.bone('upperArm' + side)
    elbow = f.rig.bone('forearm' + side)
    wrist = f.rig.bone('hand' + side) + Vector((0, 0, 0.02 * h))
    upper = Part('upperArm' + side, low_poly(
        [(shoulder, 0.19 * h), (elbow, 0.145 * h)], segments=8, rings=4,
    ))
    upper.paint(lambda p: 'fur')
    upper.rigid('upperArm' + side)
    fore_bm = low_poly([(elbow, 0.15 * h), (wrist, 0.12 * h)], segments=8, rings=4)
    # A glove: the accent color of the hands goes up the forearm, as `fox-views.png`.
    glove = f.m.glove if 'hands' in f.rig.accent_parts else 0.0
    axis = (wrist - elbow).normalized()
    cuff = wrist + (elbow - wrist) * glove
    if glove > 0:
        cut(fore_bm, cuff, axis)
    fore = Part('forearm' + side, fore_bm)
    fore.paint(lambda p: 'accent' if glove > 0 and (p - cuff).dot(axis) > 0 else 'fur')
    fore.rigid('forearm' + side)
    return [upper, fore]


def hand(f, side):
    """Builds the mitten of the right hand: a palm ball on `hand` and a finger ball on `fingers`."""
    h = f.h
    palm = f.rig.point('palm' + side)
    fingers = f.rig.point('fingerBlock' + side)
    color = accent_or(f, 'hands', 'fur')
    palm_part = Part('palm' + side, low_poly(
        [(palm + Vector((0, 0, 0.02 * h)), (0.13 * h, 0.11 * h, 0.15 * h))], segments=6, rings=3,
    ))
    palm_part.paint(lambda p: color)
    palm_part.rigid('hand' + side)
    finger_part = Part('fingers' + side, low_poly(
        [(fingers, (0.12 * h, 0.1 * h, 0.1 * h))], segments=6, rings=3,
    ))
    finger_part.paint(lambda p: color)
    finger_part.rigid('fingers' + side)
    return [palm_part, finger_part]


def leg(f, side):
    """Builds the right leg: the haunch and the thigh, the lower leg, and the paw.

    The thigh and the lower leg are two closed rigid shells that overlap at the knee, as the
    arms. One shell across the knee had an open part on each bone.
    """
    h = f.h
    m = f.m
    hip = f.rig.bone('thigh' + side)
    knee = f.rig.bone('shin' + side)
    hock = f.rig.bone('foot' + side)
    along = (knee - hip).normalized()
    across, up, length, place = m.haunch
    haunch = (
        hip + along * place * h,
        (across * h, up * h, length * h),
        kit.frame_along(along),
    )
    thigh = Part('thigh' + side, shell(
        'thigh' + side, [hull([haunch, (knee, m.knee * h)])], voxel=0.004,
        triangles=m.leg_triangles, smooth=0.5, smooth_steps=4,
    ))
    thigh.paint(lambda p: 'fur')
    thigh.rigid('thigh' + side)
    shin = Part('shin' + side, low_poly(
        [(knee, 0.14 * h), (hock, 0.085 * h)], segments=8, rings=4,
    ))
    lower = accent_or(f, 'lower-legs', 'fur')
    shin.paint(lambda p: lower)
    shin.rigid('shin' + side)

    paw_center = Vector((hock.x, hock.y, 0)) + offset(0, 0.075, -0.28) * h
    paw = Part('paw' + side, low_poly(
        [(hock, 0.08 * h), (paw_center, (0.11 * h, 0.17 * h, 0.075 * h))], segments=6, rings=3,
    ))
    feet = accent_or(f, 'feet', 'fur')
    paw.paint(lambda p: feet)
    paw.rigid('foot' + side)
    return [thigh, shin, paw]


def tail(f):
    """Builds the bushy tail on two bones, with a tip of the belly color."""
    h = f.h
    m = f.m
    root = f.rig.bone('tail1')
    joint = f.rig.bone('tail2')
    tip = f.at(joint, *m.tail_tip)
    middle = joint + (tip - joint) * 0.3
    forms = [hull([(root, 0.08 * h), (middle, m.tail_brush * h), (tip, 0.05 * h)])]
    # A tail on the middle plane is the mirror image of its right half.
    mirror = m.tail_tip[0] == 0
    bm = shell(
        'tail', forms, voxel=0.004, triangles=110, smooth=0.5, smooth_steps=4, mirror=mirror,
    )
    axis = (tip - joint).normalized()
    white = joint + (tip - joint) * m.tail_white
    cut(bm, white, axis)
    part = Part('tail', bm)
    part.paint(lambda p: 'belly' if (p - white).dot(axis) > 0 else 'fur')
    part.skin_by(chain_skin([('tail1', root), ('tail2', joint), (None, tip)], band=0.08 * h))
    return part


def ear(f, side):
    """Builds the right ear: a pointed pyramid on the ear bone, with a light inside."""
    h = f.h
    base = f.rig.bone('ear' + side)
    tip = f.at(base, *f.m.ear_tip)
    inner_x, outer_x, depth = f.m.ear_base
    bm = low_poly(
        [
            (f.at(base, inner_x, -0.08, -0.02), 0.06 * h),
            (f.at(base, outer_x, -0.08, -0.02), 0.06 * h),
            (f.at(base, 0.5 * (inner_x + outer_x), -0.08, depth), 0.06 * h),
            (tip, 0.015 * h),
        ],
        segments=6,
        rings=2,
    )
    # The dark tip: the faces beyond a plane across the ear.
    root = f.at(base, 0.5 * (inner_x + outer_x), -0.08, 0.02)
    axis = (tip - root).normalized()
    border = tip + (root - tip) * f.m.ear_dark
    if f.m.ear_dark > 0:
        cut(bm, border, axis)
    part = Part('ear' + side, bm)
    bm.faces.ensure_lookup_table()
    size = f.m.ear_inside
    inner = {face.index for face in bm.faces if size == 0 and face.normal.y < -0.6}
    outer = accent_or(f, 'ears', 'fur')
    inside = accent_or(f, 'ears', accent_or(f, 'inner-ears', 'inner-ear'))

    def paint(face):
        if f.m.ear_dark > 0 and (face.calc_center_median() - border).dot(axis) > 0:
            return 'accent'
        return inside if face.index in inner else outer

    part.regions = {face.index: paint(face) for face in bm.faces}
    part.rigid('ear' + side)
    if size == 0:
        return [part]

    # The inside: a flat wedge in front of the front face of the ear, smaller than the face, so
    # that a rim of fur shows around it.
    middle = f.at(base, 0.5 * (inner_x + outer_x), -0.08, -0.02)
    ahead = offset(0, 0, -0.035) * h

    def toward(p, amount):
        return middle + (p - middle) * amount + ahead

    wedge = low_poly(
        [
            (toward(f.at(base, inner_x, -0.08, -0.02), size), 0.02 * h),
            (toward(f.at(base, outer_x, -0.08, -0.02), size), 0.02 * h),
            (toward(tip, 0.9 * size), 0.01 * h),
            (middle + offset(0, 0, 0.03) * h, 0.02 * h),
        ],
        segments=6,
        rings=2,
    )
    lining = Part('earInside' + side, wedge)
    lining.paint(lambda p: inside)
    lining.rigid('ear' + side)
    return [part, lining]


def eye(f, side):
    """Builds the right eye on its bone (design 4.5).

    With no white, the eye is an amber almond with a black pupil. With a white, it is a white
    almond with a round iris and a large black pupil in front of it, as `fox-views.png`.
    """
    h = f.h
    center = f.rig.bone('eye' + side)
    width, height, out, tilt = f.m.eye
    # The eye turns out from the front, and its outer end is up.
    turn = (
        Matrix.Rotation(math.radians(-out), 3, 'Z') @ Matrix.Rotation(math.radians(tilt), 3, 'Y')
    )
    forward = turn @ Vector((0, -1, 0))

    def part(name, region, radii, ahead, segments, rings, rotation=turn):
        rx, depth, rz = radii
        made = Part(name + side, low_poly(
            [(center + forward * ahead * h, (rx * h, depth * h, rz * h), rotation)],
            segments=segments,
            rings=rings,
        ))
        made.paint(lambda p: region)
        made.rigid('eye' + side)
        return made

    if not f.m.sclera:
        return [
            part('iris', 'iris', (width / 2, 0.025, height / 2), 0, 10, 4),
            part('pupil', 'pupil', (0.03, 0.022, 0.042), 0.016, 6, 3),
        ]

    # The iris and the pupil are round, so they do not tilt with the white.
    level = Matrix.Rotation(math.radians(-out), 3, 'Z')
    iris = 0.42 * height + 0.06 * width
    return [
        part('sclera', 'sclera', (width / 2, 0.025, height / 2), 0, 10, 4),
        part('iris', 'iris', (iris, 0.02, iris), 0.012, 8, 3, level),
        part('pupil', 'pupil', (0.55 * iris, 0.016, 0.6 * iris), 0.022, 6, 3, level),
    ]


def mirror_part(part, side_from='R', side_to='L'):
    """Gives the left part of a right part: the mirror image on the left bones."""
    name = part.name[:-1] + side_to if part.name.endswith(side_from) else part.name + side_to
    copy = Part(name, mirrored(part.bm))
    copy.regions = dict(part.regions)
    swap = lambda bone: bone[:-1] + side_to if bone.endswith(side_from) else bone
    copy.skin = {i: (swap(a), swap(b), w) for i, (a, b, w) in part.skin.items()}
    return copy


class Recipe:
    """The three steps of `build_sculpt.py` for one species of the dog family."""

    def __init__(self, measures):
        self.measures = measures

    def regions(self, rig):
        """Gives the color regions of the species."""
        return regions(Frame(rig, self.measures))

    def build_body(self, rig):
        """Builds the parts above the legs. Each stance shares them."""
        f = Frame(rig, self.measures)
        right = [*arm(f, 'R'), *hand(f, 'R'), *ear(f, 'R'), *eye(f, 'R')]
        left = [mirror_part(part) for part in right]
        return [trunk(f), tail(f), *right, *left]

    def build_legs(self, rig):
        """Builds the legs and the paws in the stance of the rig."""
        right = leg(Frame(rig, self.measures), 'R')
        return [*right, *(mirror_part(part) for part in right)]
