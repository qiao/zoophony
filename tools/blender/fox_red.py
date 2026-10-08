"""The recipe of the red fox (design 4.3): the forms, the color regions, and the skin of each shell.

All sizes are in H, the head height of the species. A point is a bone or a body point of the rig
plus an offset in the model axes: x to the right side of the animal, y up, z to the back.
"""

import math

from mathutils import Matrix, Vector

import kit
from kit import Part, chain_skin, cut, hull, low_poly, mirrored, offset, shell, split_joints

#: The colors of the eyes and the nose, as `EYE_COLOR` and `NOSE_COLOR` of `models/species.ts`.
EYE_COLOR = '#15110e'
NOSE_COLOR = '#2a1d15'

#: The tilt of the field of the trunk skin: a point 1 m in front counts as `TILT` m higher, so
#: that the muzzle and the jaw follow the head, and the nape follows the neck.
TILT = 0.3

#: The rise of the border of the white lower face along the muzzle, in H for each H to the front.
#: The lower half of each side of the muzzle is white, as on the foxes of `lowpoly-animals.png`.
FACE_SLOPE = 0.24

#: The plane of the nape, in H behind the head center. The fur behind it keeps the fur color.
NAPE = 0.02


def regions(rig):
    """Gives the color regions of the fox: a color and a finish each (design 4.5)."""
    return {
        'fur': {'color': rig.colors['fur'], 'finish': 'fur'},
        'belly': {'color': rig.colors['belly'], 'finish': 'fur'},
        'accent': {'color': rig.colors['accent'], 'finish': 'fur'},
        'nose': {'color': NOSE_COLOR, 'finish': 'matte'},
        'inner-ear': {'color': rig.colors['belly'], 'finish': 'matte'},
        'iris': {'color': rig.colors['iris'], 'finish': 'lacquer'},
        'pupil': {'color': EYE_COLOR, 'finish': 'lacquer'},
    }


class Frame:
    """The points of the fox in Blender axes, from the rig and offsets in H."""

    def __init__(self, rig):
        self.rig = rig
        self.h = rig.h
        self.base = rig.bone('hips') - Vector((0, 0, 0.15 * rig.h))
        self.center = rig.point('headCenter')
        # The height where the field of the trunk skin starts to tilt, in meters: the middle of
        # the rigid band of the chest.
        self.switch = 0.5 * (self.height('chest') + self.height('neck'))

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


def trunk(f):
    """Builds the torso, the neck, and the head with the muzzle and the cheek ruffs."""
    h = f.h
    c = f.center
    forms = [
        # The pear of the torso: a belly on the seat and a narrower chest.
        hull([
            (f.at(f.base, 0, 0.4, -0.02), (0.5 * h, 0.46 * h, 0.4 * h)),
            (f.at(f.base, 0, 0.92, 0.0), (0.42 * h, 0.34 * h, 0.3 * h)),
        ]),
        # The shoulder yoke: the torso is 0.5 H wide at the shoulder joints, so that the ball of
        # each upper arm sinks into it (design 4.5, `SHOULDER_JOINT`).
        hull([
            (f.at(f.base, 0.33, 0.98, 0.0), (0.17 * h, 0.15 * h, 0.13 * h)),
            (f.at(f.base, 0, 0.98, 0.0), (0.3 * h, 0.3 * h, 0.2 * h)),
        ]),
        # The neck, from the shoulders to under the head.
        hull([
            (f.at(f.base, 0, 1.12, 0.0), (0.3 * h, 0.28 * h, 0.2 * h)),
            (f.at(c, 0, -0.32, 0.1), (0.28 * h, 0.28 * h, 0.2 * h)),
        ]),
        # The skull: a wedge from the wide back of the head to the flat face.
        hull([
            (f.at(c, 0, 0.1, 0.04), (0.4 * h, 0.4 * h, 0.42 * h)),
            (f.at(c, 0, -0.06, -0.32), (0.32 * h, 0.28 * h, 0.28 * h)),
        ]),
        # The long muzzle, from the face to the nose.
        hull([
            (f.at(c, 0, -0.12, -0.45), (0.22 * h, 0.2 * h, 0.19 * h)),
            (f.at(c, 0, -0.27, -1.0), 0.062 * h),
        ]),
        # The lower jaw, under the muzzle, to the mouth.
        hull([
            (f.at(c, 0, -0.31, -0.42), 0.15 * h),
            (f.at(c, 0, -0.36, -0.86), 0.05 * h),
        ]),
        # The cheek ruff of the right side: a full cheek with a tuft that points out and down.
        hull([
            (f.at(c, 0.27, -0.22, -0.22), 0.21 * h),
            (f.at(c, 0.58, -0.42, -0.04), 0.05 * h),
        ]),
    ]
    bm = shell('trunk', forms, voxel=0.005, triangles=640, smooth=0.5, smooth_steps=4, mirror=True)

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
    h = f.h
    c = f.center
    nose_z = -0.97
    face_y = -0.1

    def head_part(p):
        _, y, z = f.local(p, c)
        return y > -0.75 and z < 0.35

    def front(p):
        _, y, z = f.local(p, c)
        return z < -0.4 and y > -0.7

    def back(p):
        x, y, z = f.local(p, c)
        return -0.5 < z < NAPE + 0.1 and y > -0.75 and abs(x) > 0.12

    def nape(p):
        _, y, _ = f.local(p, c)
        return -0.75 < y < -0.15

    def bib(p):
        x, y, z = f.local(p, f.base)
        return z < 0.0 and 0.25 < y < 1.4 and abs(x) < 0.45

    def bib_bottom(p):
        x, y, z = f.local(p, f.base)
        return z < 0.0 and 0.25 < y < 0.45 and abs(x) < 0.25

    # The face border: level under the eyes at the front, up to the nose along the muzzle.
    front_point = f.at(c, 0, face_y, -0.45)
    front_normal = offset(0, 1, -FACE_SLOPE).normalized()
    back_normal = offset(0, 1, 0.45).normalized()
    # The bib border at each side: 0.13 H from the middle at 0.35 H above the base, and 0.32 H at
    # 1.2 H.
    slope = (0.32 - 0.13) / (1.2 - 0.35)

    def bib_point(side):
        return f.at(f.base, side * 0.13, 0.35, 0)

    def bib_normal(side):
        return offset(side * 1.0, -side * slope, 0).normalized()

    cuts = [
        (f.at(c, 0, 0, nose_z), offset(0, 0, 1), front),
        (front_point, front_normal, front),
        (front_point, back_normal, back),
        (bib_point(1), bib_normal(1), bib),
        (bib_point(-1), bib_normal(-1), bib),
        (f.at(f.base, 0, 0.35, 0), offset(0, 1, 0), bib_bottom),
        (f.at(c, 0, 0, NAPE), offset(0, 0, 1), nape),
    ]

    def rule(p):
        x, y, z = f.local(p, c)
        if z < nose_z and y > -0.45:
            return 'nose'
        if head_part(p):
            if z > NAPE:
                return 'fur'
            if z < -0.45:
                border = face_y + FACE_SLOPE * (z + 0.45)
            else:
                border = face_y - 0.45 * (z + 0.45)
            return 'belly' if y < border else 'fur'
        bx, by, bz = f.local(p, f.base)
        width = 0.13 + slope * (by - 0.35)
        if bz < 0.1 and by > 0.35 and abs(bx) < width:
            return 'belly'
        return 'fur'

    return {'cuts': cuts, 'rule': rule}


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
    fore = Part('forearm' + side, low_poly(
        [(elbow, 0.15 * h), (wrist, 0.12 * h)], segments=8, rings=4,
    ))
    fore.paint(lambda p: 'fur')
    fore.rigid('forearm' + side)
    return [upper, fore]


def hand(f, side):
    """Builds the mitten of the right hand: a palm ball on `hand` and a finger ball on `fingers`."""
    h = f.h
    palm = f.rig.point('palm' + side)
    fingers = f.rig.point('fingerBlock' + side)
    palm_part = Part('palm' + side, low_poly(
        [(palm + Vector((0, 0, 0.02 * h)), (0.13 * h, 0.11 * h, 0.15 * h))], segments=6, rings=3,
    ))
    palm_part.paint(lambda p: 'accent')
    palm_part.rigid('hand' + side)
    finger_part = Part('fingers' + side, low_poly(
        [(fingers, (0.12 * h, 0.1 * h, 0.1 * h))], segments=6, rings=3,
    ))
    finger_part.paint(lambda p: 'accent')
    finger_part.rigid('fingers' + side)
    return [palm_part, finger_part]


def leg(f, side):
    """Builds the right leg: the haunch and the thigh, the lower leg, and the paw."""
    h = f.h
    hip = f.rig.bone('thigh' + side)
    knee = f.rig.bone('shin' + side)
    hock = f.rig.bone('foot' + side)
    along = (knee - hip).normalized()
    haunch = (hip + along * 0.08 * h, (0.36 * h, 0.3 * h, 0.5 * h), kit.frame_along(along))
    forms = [
        hull([haunch, (knee, 0.16 * h)]),
        hull([(knee, 0.14 * h), (hock, 0.085 * h)]),
    ]
    bm = shell('leg' + side, forms, voxel=0.004, triangles=120, smooth=0.5, smooth_steps=4)

    # The lower leg has the accent color below the knee.
    border = knee.z - 0.06 * h
    cut(bm, Vector((0, 0, border)), Vector((0, 0, 1)))
    leg_part = Part('leg' + side, bm)
    leg_part.paint(lambda p: 'accent' if p.z < border else 'fur')
    leg_part.skin_by(chain_skin(
        [('thigh' + side, hip), ('shin' + side, knee), (None, hock)], band=0,
    ))

    paw_center = Vector((hock.x, hock.y, 0)) + offset(0, 0.075, -0.28) * h
    paw = Part('paw' + side, low_poly(
        [(hock, 0.08 * h), (paw_center, (0.11 * h, 0.17 * h, 0.075 * h))], segments=6, rings=3,
    ))
    paw.paint(lambda p: 'accent')
    paw.rigid('foot' + side)
    return [leg_part, paw]


def tail(f):
    """Builds the bushy tail on two bones, with a tip of the belly color."""
    h = f.h
    root = f.rig.bone('tail1')
    joint = f.rig.bone('tail2')
    tip = f.at(joint, 0, -0.66, 0.3)
    middle = joint + (tip - joint) * 0.3
    forms = [hull([(root, 0.08 * h), (middle, 0.19 * h), (tip, 0.05 * h)])]
    bm = shell('tail', forms, voxel=0.004, triangles=110, smooth=0.5, smooth_steps=4, mirror=True)
    axis = (tip - joint).normalized()
    white = joint + (tip - joint) * 0.72
    cut(bm, white, axis)
    part = Part('tail', bm)
    part.paint(lambda p: 'belly' if (p - white).dot(axis) > 0 else 'fur')
    part.skin_by(chain_skin([('tail1', root), ('tail2', joint), (None, tip)], band=0.08 * h))
    return part


def ear(f, side):
    """Builds the right ear: a pointed pyramid on the ear bone, with a light inner face."""
    h = f.h
    base = f.rig.bone('ear' + side)
    tip = f.at(base, 0.17, 0.5, 0.05)
    bm = low_poly(
        [
            (f.at(base, -0.09, -0.08, -0.02), 0.06 * h),
            (f.at(base, 0.17, -0.08, -0.02), 0.06 * h),
            (f.at(base, 0.04, -0.08, 0.1), 0.06 * h),
            (tip, 0.015 * h),
        ],
        segments=6,
        rings=2,
    )
    part = Part('ear' + side, bm)
    bm.faces.ensure_lookup_table()
    inner = {face.index for face in bm.faces if face.normal.y < -0.6}
    part.regions = {face.index: 'inner-ear' if face.index in inner else 'fur' for face in bm.faces}
    part.rigid('ear' + side)
    return part


def eye(f, side):
    """Builds the right eye on its bone: an amber almond with a black pupil (design 4.5)."""
    h = f.h
    center = f.rig.bone('eye' + side)
    # The eye turns out from the front by 20°, and its outer end is 14° up.
    turn = Matrix.Rotation(math.radians(-20), 3, 'Z') @ Matrix.Rotation(math.radians(14), 3, 'Y')
    forward = turn @ Vector((0, -1, 0))
    iris = Part('iris' + side, low_poly(
        [(center, (0.085 * h, 0.025 * h, 0.0475 * h), turn)], segments=10, rings=4,
    ))
    iris.paint(lambda p: 'iris')
    iris.rigid('eye' + side)
    pupil = Part('pupil' + side, low_poly(
        [(center + forward * 0.016 * h, (0.03 * h, 0.022 * h, 0.042 * h), turn)],
        segments=6,
        rings=3,
    ))
    pupil.paint(lambda p: 'pupil')
    pupil.rigid('eye' + side)
    return [iris, pupil]


def mirror_part(part, side_from='R', side_to='L'):
    """Gives the left part of a right part: the mirror image on the left bones."""
    name = part.name[:-1] + side_to if part.name.endswith(side_from) else part.name + side_to
    copy = Part(name, mirrored(part.bm))
    copy.regions = dict(part.regions)
    swap = lambda bone: bone[:-1] + side_to if bone.endswith(side_from) else bone
    copy.skin = {i: (swap(a), swap(b), w) for i, (a, b, w) in part.skin.items()}
    return copy


def build_body(rig):
    """Builds the parts of the fox above the legs. Each stance shares them."""
    f = Frame(rig)
    right = [*arm(f, 'R'), *hand(f, 'R'), ear(f, 'R'), *eye(f, 'R')]
    left = [mirror_part(part) for part in right]
    return [trunk(f), tail(f), *right, *left]


def build_legs(rig):
    """Builds the legs and the paws of the fox in the stance of the rig."""
    right = leg(Frame(rig), 'R')
    return [*right, *(mirror_part(part) for part in right)]
