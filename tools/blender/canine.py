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

#: The color of the light of an eye, as `EYE_LIGHT_COLOR` of `models/species.ts`.
EYE_LIGHT_COLOR = '#f6f2ea'

#: The color of the dark upper lid of an eye with a white: a black brown, as the lids of
#: `fox-views.png`.
LID_COLOR = '#24160f'

#: The turn that points the poles of a part to the front: local z goes to -y, the front of
#: the animal in Blender axes.
FACING = Matrix.Rotation(math.radians(90), 3, 'X')

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

#: The height of the `neck` bone above the base of the torso on the default skeleton, in H
#: (`NECK` of `models/trunk.ts`).
NECK = 1.05


@dataclasses.dataclass(frozen=True)
class Measures:
    """The measures of one species of the dog family, in H.

    An ellipsoid is (x, y, z, rx, ry, rz): a center offset from the head center and its radii, in
    the model axes (rx across, ry up, rz along the head). A ball is (x, y, z, r).
    """

    #: The skull: a round ellipsoid around the head center, as the round heads of
    #: `fox-views.png`.
    skull: tuple = (0, 0.1, -0.06, 0.44, 0.44, 0.42)
    #: A flat ellipsoid on the top of the skull, for a flat crown. None for none.
    crown: tuple | None = None
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
    #: A ball of the cheek ruff at the chin, so that the lower edge of the face runs straight
    #: from the tuft to the chin, as the V face of `fox-views.png`. None for none.
    cheek_chin: tuple | None = None
    #: The pear of the torso: the belly and the chest, each (y, z, rx, ry, rz) from the middle of
    #: the base of the torso. The heights y are on the default skeleton (`Frame.torso()`).
    belly: tuple = (0.4, -0.02, 0.5, 0.4, 0.46)
    chest: tuple = (0.92, 0.0, 0.42, 0.3, 0.34)
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
    #: The back border of the white cheek, in H behind the head center at the height of
    #: `face_y` (a negative value is in front of it). The border leans back by 0.5 H for each H
    #: down, and the white goes up to `face_y` in front of it. With no value, the border drops
    #: behind the cheeks.
    cheek_back: float | None = None
    #: A bib with a pointed bottom in place of `bib`, as the bib of `fox-views.png`: the half
    #: width at the shoulder joints, the largest half width and its height, and the height of
    #: the point at the bottom. The heights are in H above the base of the torso on the skeleton
    #: of the species. The sides are straight lines, and the bottom is a V.
    bib_v: tuple | None = None
    #: The base of the right ear, from the ear bone: the inner and the outer corner across, and
    #: the back corner.
    ear_base: tuple = (-0.09, 0.17, 0.1)
    #: The tip of the right ear, from the ear bone.
    ear_tip: tuple = (0.2, 0.62, 0.02)
    #: The part of the ear height, from the tip, that has the accent color. 0 for none.
    ear_dark: float = 0.0
    #: The part of the ear height, from the tip, that has the accent color on the faces that
    #: point back and out. 0 for none.
    ear_back_dark: float = 0.0
    #: The turn of the base of the ear around the vertical, in degrees: the outer corner goes
    #: back, so that the inside faces to the front and out.
    ear_turn: float = 0.0
    #: The heights of the inner, the outer, and the back corner of the base of the ear, from
    #: the ear bone, in H. A lower outer corner sets the base along the side of the head, as
    #: the ears of `fox-views.png`.
    ear_heights: tuple = (-0.08, -0.08, -0.08)
    #: The move of the base of the ear to the front of the ear bone, in H. The tip keeps its
    #: place of `ear_tip`.
    ear_ahead: float = 0.0
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
    #: The move of the eye parts from the eye bone of the right side: out, up, and back, in H.
    eye_offset: tuple = (0.0, 0.0, 0.0)
    #: The half width and the half height of the iris of an eye with a white, in H. With no
    #: value, the iris is round, with a radius of 0.42 of the eye height plus 0.06 of its width.
    iris: tuple | None = None
    #: The half width of the pupil as a part of the half width of the iris.
    pupil: float = 0.55
    #: The radius of the white light on the iris of an eye with a white, in H. 0 for none.
    eye_light: float = 0.0
    #: The height of the dark upper lid at the top of the white of the eye, in H. 0 for none.
    lid: float = 0.0
    #: The half depth of the white of the eye, in H.
    eye_depth: float = 0.025
    #: The part of the forearm, from the wrist, that has the accent color of the hands. 0 for
    #: the hands only.
    glove: float = 0.0
    #: The color region of the hands and the glove in place of the accent color, for example
    #: 'belly' for the light hands of the wolves of `orchestra-side.png`. None for the accent
    #: parts of the species.
    hand_region: str | None = None
    #: The haunch: the radii across, up, and along the thigh, and its place along the thigh from
    #: the hip, in H.
    haunch: tuple = (0.36, 0.3, 0.5, 0.08)
    #: The radius of the leg at the knee.
    knee: float = 0.16
    #: The radii of the lower leg below the knee and at the hock.
    shin: tuple = (0.14, 0.085)
    #: The part of the lower leg, from the hock, that has the accent color of the lower legs. 0
    #: for the whole lower leg.
    sock: float = 0.0
    #: The rings of each ball of the lower leg. Fewer rings keep a sock in the budget.
    shin_rings: int = 4
    #: The paw: its distance in front of the hock, its half width, half height, and half length,
    #: and the radius of the ankle ball at the hock.
    paw: tuple = (0.28, 0.11, 0.075, 0.17, 0.08)
    #: The triangles of each leg after the decimate.
    leg_triangles: int = 120
    #: The tip of the tail from the `tail2` bone, and the radius of the brush.
    tail_tip: tuple = (0, -0.66, 0.3)
    tail_brush: float = 0.19
    #: The triangles of the tail shell after the decimate.
    tail_triangles: int = 110
    #: The radius of the tail at its tip.
    tail_end: float = 0.05
    #: The center of the brush from the `tail2` bone, for a tail that bends at the brush. With
    #: no value, the brush is on the straight way from the joint to the tip, and the tail is one
    #: convex form.
    tail_middle: tuple | None = None
    #: The part of the way from the joint to the tip (from the brush for a bent tail) before the
    #: white tip.
    tail_white: float = 0.72


def regions(f):
    """Gives the color regions of the species: a color and a finish each (design 4.5)."""
    colors = f.rig.colors
    found = {
        'fur': {'color': colors['fur'], 'finish': 'fur'},
        'belly': {'color': colors['belly'], 'finish': 'fur'},
        'accent': {'color': colors['accent'], 'finish': 'fur'},
        'nose': {'color': NOSE_COLOR, 'finish': 'matte'},
        'inner-ear': {'color': colors['belly'], 'finish': 'matte'},
        'iris': {'color': colors['iris'], 'finish': 'lacquer'},
        'pupil': {'color': EYE_COLOR, 'finish': 'lacquer'},
        'sclera': {'color': SCLERA_COLOR, 'finish': 'lacquer'},
    }
    if f.m.eye_light > 0:
        found['light'] = {'color': EYE_LIGHT_COLOR, 'finish': 'lacquer'}
    if f.m.lid > 0:
        found['lid'] = {'color': LID_COLOR, 'finish': 'lacquer'}
    return found


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
    # A ball at the chin in the cheek ruff, so that the lower face is a V from the tuft.
    chin = [] if m.cheek_chin is None else [f.ball(m.cheek_chin)]
    # A flat crown on the skull, as the flat top of the head of `fox-views.png`.
    crown = [] if m.crown is None else [f.ellipsoid(m.crown)]
    forms = [
        # The pear of the torso: a belly on the seat and a narrower chest.
        hull([
            (f.at(f.base, 0, y(py), pz), (rx * h, rz * h, ry * h))
            for py, pz, rx, ry, rz in (m.belly, m.chest)
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
        hull([f.ellipsoid(m.skull), f.ellipsoid(m.face), *crown]),
        # The muzzle, from the face to the nose.
        hull([f.ellipsoid(m.muzzle_base), f.ball(m.muzzle_tip)]),
        # The lower jaw, under the muzzle, to the mouth.
        hull([f.ball(m.jaw_back), f.ball(m.jaw_tip)]),
        # The cheek ruff of the right side: a full cheek with a tuft that points out and down.
        hull([f.ball(m.cheek), f.ball(m.cheek_tuft), *chin]),
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
    # The lowest part of the head colors: the height of the `neck` bone, from the head center.
    # It is 0.75 H below the head center on the default skeleton. On a skeleton with the
    # shoulder joints under the chin, a fixed 0.75 H gave the face colors to the upper chest.
    neck = f.torso(NECK) - f.proportions['headCenter']

    def head_part(p):
        _, y, z = f.local(p, c)
        return y > neck and z < 0.35

    def front(p):
        _, y, z = f.local(p, c)
        return z < -0.4 and y > neck + 0.05

    def back(p):
        x, y, z = f.local(p, c)
        return -0.5 < z < m.nape + 0.1 and y > neck and abs(x) > 0.12

    def nape(p):
        _, y, _ = f.local(p, c)
        return neck < y < -0.15

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
    ]
    cheek_back = m.cheek_back
    if cheek_back is None:
        cuts.append((front_point, back_normal, back))
    else:
        # The white cheek: level at `face_y` under the eyes, back to a border that leans back.
        def level(p):
            _, y, z = f.local(p, c)
            return -0.5 < z < cheek_back + 0.1 and face_y - 0.1 < y < face_y + 0.1

        def lean(p):
            _, y, z = f.local(p, c)
            return cheek_back - 0.15 < z < m.nape and neck < y < face_y + 0.05

        cuts.append((f.at(c, 0, face_y, 0), offset(0, 1, 0), level))
        cuts.append((f.at(c, 0, face_y, cheek_back), offset(0, 0.5, 1).normalized(), lean))

    # The width of the bib at a height above the base, and its cuts.
    # The back edge of the bib, in H from the axis of the torso: a pointed bib stays on the
    # front, so that the sides of the narrow shoulders keep the fur color.
    bib_back = 0.1 if m.bib_v is None else 0.0
    if m.bib_v is None:

        def bib_width(by):
            return low + slope * (by - bottom) if by > bottom else -1.0

        cuts.append((bib_point(1), bib_normal(1), bib))
        cuts.append((bib_point(-1), bib_normal(-1), bib))
        cuts.append((f.at(f.base, 0, bottom, 0), offset(0, 1, 0), bib_bottom))
    else:
        top_w, wide_w, wide_y, point_y = m.bib_v
        top_y = f.proportions['shoulderHeight']
        side_slope = (top_w - wide_w) / (top_y - wide_y)
        v_slope = wide_w / (wide_y - point_y)

        def bib_width(by):
            return min(wide_w + side_slope * (by - wide_y), v_slope * (by - point_y))

        def bib_front(p):
            x, y, z = f.local(p, f.base)
            return z < 0.0 and point_y - 0.1 < y < top_y + 0.4 and abs(x) < wide_w + 0.15

        for side in (1, -1):
            cuts.append((
                f.at(f.base, side * wide_w, wide_y, 0),
                offset(1.0, -side * side_slope, 0).normalized(),
                bib_front,
            ))
            cuts.append((
                f.at(f.base, 0, point_y, 0),
                offset(1.0, -side * v_slope, 0).normalized(),
                bib_front,
            ))
    cuts.append((f.at(c, 0, 0, m.nape), offset(0, 0, 1), nape))

    def rule(p):
        x, y, z = f.local(p, c)
        if z < nose_z and y > -0.45:
            return 'nose'
        if head_part(p):
            if z > m.nape:
                return 'fur'
            if z < -0.45:
                border = face_y + m.face_slope * (z + 0.45)
            elif cheek_back is None:
                border = face_y - 0.45 * (z + 0.45)
            else:
                inside = z < cheek_back + 0.5 * (face_y - y)
                return 'belly' if y < face_y and inside else 'fur'
            return 'belly' if y < border else 'fur'
        bx, by, bz = f.local(p, f.base)
        if bz < bib_back and abs(bx) < bib_width(by):
            return 'belly'
        return 'fur'

    return {'cuts': cuts, 'rule': rule}


def accent_or(f, part, color):
    """Gives 'accent' when the species has the accent part (design 4.5), else the color."""
    return 'accent' if part in f.rig.accent_parts else color


def hand_color(f):
    """Gives the color region of the hands: the region of the measures, or the accent rule."""
    if f.m.hand_region is not None:
        return f.m.hand_region
    return accent_or(f, 'hands', 'fur')


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
    # A glove: the color of the hands goes up the forearm, as `fox-views.png`.
    color = hand_color(f)
    glove = f.m.glove if color != 'fur' else 0.0
    axis = (wrist - elbow).normalized()
    cuff = wrist + (elbow - wrist) * glove
    if glove > 0:
        cut(fore_bm, cuff, axis)
    fore = Part('forearm' + side, fore_bm)
    fore.paint(lambda p: color if glove > 0 and (p - cuff).dot(axis) > 0 else 'fur')
    fore.rigid('forearm' + side)
    return [upper, fore]


def hand(f, side):
    """Builds the mitten of the right hand: a palm ball on `hand` and a finger ball on `fingers`."""
    h = f.h
    palm = f.rig.point('palm' + side)
    fingers = f.rig.point('fingerBlock' + side)
    color = hand_color(f)
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
    knee_radius, hock_radius = m.shin
    shin = Part('shin' + side, low_poly(
        [(knee, knee_radius * h), (hock, hock_radius * h)], segments=8, rings=m.shin_rings,
    ))
    lower = accent_or(f, 'lower-legs', 'fur')
    # A sock: the accent color of the lower legs ends at a part of the shin from the hock.
    sock = m.sock if lower == 'accent' else 0.0
    down = (hock - knee).normalized()
    top = hock + (knee - hock) * sock
    if sock > 0:
        cut(shin.bm, top, down)
    shin.paint(lambda p: lower if sock == 0 or (p - top).dot(down) > 0 else 'fur')
    shin.rigid('shin' + side)

    ahead, half_width, half_height, half_length, ankle = m.paw
    paw_center = Vector((hock.x, hock.y, 0)) + offset(0, half_height, -ahead) * h
    paw = Part('paw' + side, low_poly(
        [
            (hock, ankle * h),
            (paw_center, (half_width * h, half_length * h, half_height * h)),
        ],
        segments=6,
        rings=3,
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
    if m.tail_middle is None:
        middle = joint + (tip - joint) * 0.3
        forms = [hull([(root, 0.08 * h), (middle, m.tail_brush * h), (tip, m.tail_end * h)])]
    else:
        # Two forms that meet at the brush, so that the tail bends there.
        middle = f.at(joint, *m.tail_middle)
        forms = [
            hull([(root, 0.08 * h), (middle, m.tail_brush * h)]),
            hull([(middle, m.tail_brush * h), (tip, m.tail_end * h)]),
        ]
    # A tail on the middle plane is the mirror image of its right half.
    mirror = m.tail_tip[0] == 0
    bm = shell(
        'tail', forms, voxel=0.004, triangles=m.tail_triangles, smooth=0.5, smooth_steps=4,
        mirror=mirror,
    )
    # The white tip starts at a part of the way to the tip: from the joint, or from the brush of
    # a bent tail.
    start = joint if m.tail_middle is None else middle
    axis = (tip - start).normalized()
    white = start + (tip - start) * m.tail_white
    cut(bm, white, axis)
    part = Part('tail', bm)
    part.paint(lambda p: 'belly' if (p - white).dot(axis) > 0 else 'fur')
    part.skin_by(chain_skin([('tail1', root), ('tail2', joint), (None, tip)], band=0.08 * h))
    return part


def ear(f, side):
    """Builds the right ear: a pointed pyramid on the ear bone, with a light inside."""
    h = f.h
    m = f.m
    base = f.rig.bone('ear' + side)
    tip = f.at(base, *m.ear_tip)
    inner_x, outer_x, depth = m.ear_base
    mid_x = 0.5 * (inner_x + outer_x)
    inner_y, outer_y, back_y = m.ear_heights
    mid_y = 0.5 * (inner_y + outer_y)
    turn = math.radians(m.ear_turn)

    def at(x, y, z):
        # A point of the base, turned around the vertical line through the middle of the base,
        # so that the outer corner goes back.
        if turn == 0 and m.ear_ahead == 0:
            return f.at(base, x, y, z)
        dx = x - mid_x
        return f.at(
            base,
            mid_x + dx * math.cos(turn) - z * math.sin(turn),
            y,
            dx * math.sin(turn) + z * math.cos(turn) - m.ear_ahead,
        )

    bm = low_poly(
        [
            (at(inner_x, inner_y, -0.02), 0.06 * h),
            (at(outer_x, outer_y, -0.02), 0.06 * h),
            (at(mid_x, back_y, depth), 0.06 * h),
            (tip, 0.015 * h),
        ],
        segments=6,
        rings=2,
    )
    # The dark tip: the faces beyond a plane across the ear.
    root = at(mid_x, mid_y, 0.02)
    axis = (tip - root).normalized()
    border = tip + (root - tip) * m.ear_dark
    if m.ear_dark > 0:
        cut(bm, border, axis)
    part = Part('ear' + side, bm)
    bm.faces.ensure_lookup_table()
    size = m.ear_inside
    inner = {face.index for face in bm.faces if size == 0 and face.normal.y < -0.6}
    outer = accent_or(f, 'ears', 'fur')
    inside = accent_or(f, 'ears', accent_or(f, 'inner-ears', 'inner-ear'))
    # The back of the ear: the faces that point back and out are dark above a lower plane, as
    # the ears of the side view of `fox-views.png`.
    back_border = tip + (root - tip) * m.ear_back_dark
    out_back = (at(outer_x, outer_y, depth) - at(inner_x, inner_y, -0.02)).normalized()

    def paint(face):
        above = (face.calc_center_median() - border).dot(axis) > 0
        if m.ear_dark > 0 and above:
            return 'accent'
        if m.ear_back_dark > 0 and face.normal.dot(out_back) > 0.5:
            if (face.calc_center_median() - back_border).dot(axis) > 0:
                return 'accent'
        return inside if face.index in inner else outer

    part.regions = {face.index: paint(face) for face in bm.faces}
    part.rigid('ear' + side)
    if size == 0:
        return [part]

    # The inside: a flat wedge in front of the front face of the ear, smaller than the face, so
    # that a rim of fur shows around it.
    middle = at(mid_x, mid_y, -0.02)
    ahead = at(mid_x, mid_y, -0.055) - middle

    def toward(p, amount):
        return middle + (p - middle) * amount + ahead

    wedge = low_poly(
        [
            (toward(at(inner_x, inner_y, -0.02), size), 0.02 * h),
            (toward(at(outer_x, outer_y, -0.02), size), 0.02 * h),
            (toward(tip, 0.9 * size), 0.01 * h),
            (at(mid_x, mid_y, 0.01), 0.02 * h),
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
    m = f.m
    center = f.rig.bone('eye' + side) + offset(*m.eye_offset) * h
    width, height, out, tilt = m.eye
    # The eye turns out from the front, and its outer end is up.
    turn = (
        Matrix.Rotation(math.radians(-out), 3, 'Z') @ Matrix.Rotation(math.radians(tilt), 3, 'Y')
    )
    forward = turn @ Vector((0, -1, 0))

    def part(
        name, region, radii, ahead, segments, rings, rotation=turn, shift=(0, 0), facing=False,
    ):
        # The shift is across (out from the middle) and up, in H, in the plane of the eye. A
        # facing part has its poles to the front and to the back, so that its outline in the
        # front view is its widest ring.
        rx, depth, rz = radii
        across, up = shift
        place = center + forward * ahead * h + rotation @ Vector((-across, 0, up)) * h
        sphere = (place, (rx * h, depth * h, rz * h), rotation)
        if facing:
            sphere = (place, (rx * h, rz * h, depth * h), rotation @ FACING)
        made = Part(name + side, low_poly([sphere], segments=segments, rings=rings))
        made.paint(lambda p: region)
        made.rigid('eye' + side)
        return made

    if not m.sclera:
        return [
            part('iris', 'iris', (width / 2, 0.025, height / 2), 0, 10, 4),
            part('pupil', 'pupil', (0.03, 0.022, 0.042), 0.016, 6, 3),
        ]

    # The iris and the pupil are round, so they do not tilt with the white.
    level = Matrix.Rotation(math.radians(-out), 3, 'Z')
    if m.iris is None:
        iris = 0.42 * height + 0.06 * width
        iris_x, iris_y = iris, iris
    else:
        iris_x, iris_y = m.iris
    # The white is thin, so that the iris stands out of it to its rim.
    depth = m.eye_depth
    white = part(
        'sclera', 'sclera', (width / 2, depth, height / 2), 0, 12, 2, facing=True,
    )
    if m.lid > 0:
        # The dark upper lid: the top of the white has the lid color, as the dark line along
        # the upper edge of the eyes of `fox-views.png`.
        up = turn @ Vector((0, 0, 1))
        line = center + up * (height / 2 - m.lid) * h
        cut(white.bm, line, up)
        white.paint(lambda p: 'lid' if (p - line).dot(up) > 0 else 'sclera')
        white.rigid('eye' + side)
    parts = [
        white,
        part('iris', 'iris', (iris_x, 0.02, iris_y), depth - 0.005, 10, 2, level, facing=True),
        part(
            'pupil', 'pupil', (m.pupil * iris_x, 0.016, 1.09 * m.pupil * iris_y), depth + 0.02,
            8, 2, level, facing=True,
        ),
    ]
    if m.eye_light > 0:
        # The white light in front of the pupil, at its upper inner side.
        r = m.eye_light
        parts.append(part(
            'light', 'light', (r, 0.6 * r, r), depth + 0.032, 6, 2, level,
            shift=(-0.45 * iris_x, 0.45 * iris_y), facing=True,
        ))
    return parts


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
