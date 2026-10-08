"""The recipe of the rabbit family (design 4.3): the forms, the color regions, and the skin of
each shell of the rabbit of `rabbit-views.png`.

A species file (`rabbit.py`) gives its measures (`Measures`), and `Recipe` makes the three steps
that `build_sculpt.py` calls. All sizes are in H, the head height of the species. A point is a
bone or a body point of the rig plus an offset in the model axes: x to the right side of the
animal, y up, z to the back.

The forms follow the sheet: a round soft head with a short muzzle, large dark eyes with a light,
a small pink nose, long upright ears with pink insides, an upright body that is slim at the
chest, round haunches on the seat, lower legs that hang to long feet on the floor, and a round
puff tail low on the back. The facets are small and turn against each other (`kit.jitter()`),
as in the sheet.
"""

import dataclasses
import math

from mathutils import Matrix, Vector

import kit
from kit import Part, cut, hull, low_poly, mirror_part, offset, shell

#: The color of the eyes, as `EYE_COLOR` of `models/species.ts`.
EYE_COLOR = '#15110e'

#: The color of the light in each eye (design 4.5).
LIGHT_COLOR = '#f6f2ea'


@dataclasses.dataclass(frozen=True)
class Measures:
    """The measures of one species of the rabbit family, in H.

    An ellipsoid is (x, y, z, rx, ry, rz): a center offset and its radii, in the model axes (rx
    across, ry up, rz along the body). A ball is (x, y, z, r). The forms of the head are offsets
    from the head center, and the forms of the torso are offsets from the base of the torso.
    """

    #: The soft forms of the head (`kit.blob()`), as ellipsoids from the head center: the round
    #: skull, the full cheek low on each side, the short muzzle, the chin, and the nape at the
    #: back of the head, which joins the skull to the neck with no step. A form with x > 0 has its
    #: mirror form at -x. The top of the skull is the crown, 0.5 H to 0.57 H above the head center
    #: (the head-top test of `species.test.ts`).
    head: tuple = (
        (0, 0.08, -0.12, 0.42, 0.46, 0.5),
        (0, 0.18, -0.48, 0.2, 0.22, 0.26),
        (0.18, 0.18, -0.06, 0.22, 0.2, 0.28),
        (0.21, -0.15, -0.22, 0.28, 0.18, 0.3),
        (0, -0.12, -0.6, 0.24, 0.19, 0.26),
        (0, -0.26, -0.42, 0.2, 0.12, 0.22),
        (0, -0.24, 0.06, 0.28, 0.2, 0.26),
    )
    #: The small pink nose on the front of the muzzle: its height from the head center, and its
    #: radii across, up, and along.
    nose: tuple = (-0.08, 0.075, 0.05, 0.04)
    #: The height of the border of the light muzzle at the front, from the head center, and the
    #: rise of the border for each H to the back.
    muzzle_border: tuple = (-0.2, 0.25)
    #: The belly on the seat and the slim chest.
    belly: tuple = (0, 0.58, -0.1, 0.6, 0.55, 0.5)
    chest: tuple = (0, 1.1, -0.08, 0.55, 0.42, 0.42)
    #: The half width, the half height, the half depth, and the place to the back of the
    #: shoulder yoke at the shoulder joints. The back of the shoulders is in front of the back of
    #: the haunches, as in the sheet. The torso is at least `spread - dome + overlap` wide there
    #: (0.38 H), so that the ball of each upper arm sinks into it (`SHOULDER_JOINT` of
    #: `models/body-frame.ts`).
    yoke: tuple = (0.5, 0.22, 0.34, -0.08)
    #: The neck under the head, from the head center: it fills the space from the shoulders to
    #: the chin, so that no neck shows.
    neck: tuple = (0, -0.52, -0.08, 0.36, 0.22, 0.36)
    #: The triangles of the trunk shell after the decimate.
    trunk_triangles: int = 760
    #: The largest seeded move of a vertex of the trunk and the thighs along its normal, so that
    #: the facets turn against each other as in the sheet (`kit.jitter()`).
    facet_jitter: float = 0.014
    #: The ear, in the plane of the ear from the ear bone: the half width and the height of the
    #: base, the half width and the height of the widest part, the height of the tip, and the
    #: half thickness.
    ear: tuple = (0.12, -0.06, 0.25, 0.4, 1.0, 0.045)
    #: The turns of the right ear, in degrees: out from the vertical, back from the vertical,
    #: and of its front face to the side, so that the sheet shows the pink inside from the front
    #: and from the side.
    ear_turn: tuple = (14, 12, 40)
    #: The place of the ear in front of the ear bone, so that the ears rise from the middle of
    #: the skull, as in the sheet. The ear turns around its bone.
    ear_forward: float = 0.12
    #: The pink inside of the ear as a part of the ear, so that a rim of fur shows around it.
    ear_inside: float = 0.72
    #: The eye: the turn out from the front of the line from the head center to the eye, in
    #: degrees, the width, the height, the depth, and the lift of the eye above the eye bone.
    #: The eye lies on the head surface. The eyes of the sheet are about 0.14 H higher than the
    #: eye bones of the skeleton. A blink scales the eye bone on y, so the eye then closes down
    #: to the bone, near its lower edge.
    eye: tuple = (40, 0.26, 0.32, 0.05, 0.14)
    #: The haunch: the radii across, up, and along the thigh, its place along the thigh from
    #: the hip, and its lift above the line from the hip to the knee, in H. The bottom of the
    #: haunch rests on the seat.
    haunch: tuple = (0.4, 0.36, 0.6, 0.1, 0.05)
    #: The middle of the thigh, so that the thigh stays thick to the knee: its place along the
    #: thigh from the hip, its radii across and up, and its lift, in H.
    thigh: tuple = (0.7, 0.32, 0.26, 0.0)
    #: The radius of the thigh at the knee.
    knee: float = 0.23
    #: The thick lower leg: its half width and half depth at the knee and at the ankle, and the
    #: move of its lower end to the back, so that it slants back to the heel as in the sheet.
    shin: tuple = (0.2, 0.26, 0.14, 0.2, 0.1)
    #: The triangles of each thigh after the decimate.
    leg_triangles: int = 150
    #: The long foot: the heel behind the ankle, the toes in front of it, the half width, and
    #: the height of the foot.
    foot: tuple = (0.42, 0.44, 0.29, 0.38)
    #: The radii of the arm capsules (`kit.arm()`) and of the palm ball of the hand mittens
    #: (`kit.hand()`). The bow stick lies 0.015 H to 0.03 H from the palm and the finger block
    #: (`pose/bow-hold.test.ts`).
    arm: tuple = (0.22, 0.18, 0.18, 0.14)
    palm: tuple = (0.12, 0.1, 0.14)
    #: The round puff tail: its center from the `tail2` bone, and its radius.
    tail: tuple = (0, 0.02, 0.06, 0.21)


def regions(f):
    """Gives the color regions of the species: a color and a finish each (design 4.5)."""
    colors = f.rig.colors
    return {
        'fur': {'color': colors['fur'], 'finish': 'fur'},
        'belly': {'color': colors['belly'], 'finish': 'fur'},
        'accent': {'color': colors['accent'], 'finish': 'matte'},
        'iris': {'color': colors['iris'], 'finish': 'lacquer'},
        'pupil': {'color': EYE_COLOR, 'finish': 'lacquer'},
        'light': {'color': LIGHT_COLOR, 'finish': 'lacquer'},
    }


class Frame(kit.Frame):
    """The points of the species in Blender axes. The base of the torso is on the seat, 0.3 H
    below the hip joints (`HIP_JOINT.seated` of `models/body-frame.ts`), on the axis of the
    torso."""

    def __init__(self, rig, measures):
        seat = kit.to_model(rig.bone('thighR'))[1] - 0.3 * rig.h
        base = rig.bone('hips')
        base.z = seat
        super().__init__(rig, measures, base)

    def from_base(self, values):
        """Gives the (center, radii) of an ellipsoid (x, y, z, rx, ry, rz) at the base."""
        x, y, z, rx, ry, rz = values
        return (self.at(self.base, x, y, z), (rx * self.h, rz * self.h, ry * self.h))


def head_forms(f):
    """Gives the (center, radii) of each soft form of the head, with the mirror forms."""
    forms = []
    for x, y, z, rx, ry, rz in f.m.head:
        for side in ((1, -1) if x > 0 else (1,)):
            forms.append(f.ellipsoid((side * x, y, z, rx, ry, rz)))
    return forms


def trunk(f):
    """Builds the torso, the neck, and the head with the cheeks and the muzzle."""
    m = f.m
    shoulder = f.local(f.rig.bone('upperArmR'), f.base)[1]
    yoke_x, yoke_y, yoke_z, yoke_back = m.yoke
    forms = [
        # The upright body: a round belly on the seat, a slim chest, and the shoulder yoke.
        hull([
            f.from_base(m.belly),
            f.from_base(m.chest),
            f.from_base((0, shoulder, yoke_back, yoke_x, yoke_y, yoke_z)),
            f.ellipsoid(m.neck),
        ]),
        # The head: soft round forms that melt into each other, with full cheeks.
        kit.blob(head_forms(f), resolution=0.006),
    ]
    bm = shell(
        'trunk', forms, voxel=0.005, triangles=m.trunk_triangles, smooth=0.5, smooth_steps=4,
        mirror=True,
    )
    kit.jitter(bm, m.facet_jitter * f.h, 'trunk')

    # The light muzzle: the lower face in front of the cheeks.
    level, rise = m.muzzle_border
    border = f.at(f.center, 0, level, -0.55)
    normal = offset(0, 1, -rise).normalized()

    def face(p):
        _, y, z = f.local(p, f.center)
        return z < -0.25 and -0.6 < y < 0.1

    cut(bm, border, normal, face)

    rule = kit.skin_trunk(f, bm)
    part = Part('trunk', bm)

    def paint(p):
        _, y, z = f.local(p, f.center)
        if face(p) and y < level + rise * (z + 0.55):
            return 'belly'
        return 'fur'

    part.paint(paint)
    part.skin_by(rule)
    return part


def nose(f, head):
    """Builds the small pink nose on the front of the muzzle, rigid on `head`.

    Args:
        f: The frame of the species.
        head: The trunk shell, whose surface carries the nose.
    """
    y, rx, ry, rz = f.m.nose
    tip, _ = kit.surface(head, f.at(f.center, 0, y, 0), offset(0, 0, -1), 2 * f.h)
    center = tip + offset(0, 0, 0.3 * rz) * f.h
    bm = low_poly([(center, (rx * f.h, rz * f.h, ry * f.h))], segments=6, rings=3)
    part = Part('nose', bm)
    part.paint(lambda p: 'accent')
    part.rigid('head')
    return part


def ear(f, side):
    """Builds the right ear: a long flat leaf on the ear bone, with a pink inside and a rim of
    fur around it."""
    h = f.h
    base_w, base_y, wide_w, wide_y, tip_y, thick = f.m.ear
    out, back, twist = f.m.ear_turn
    sign = 1 if side == 'R' else -1
    # The turns, from the last to the first: the face to the side around the ear, back, and out.
    turn = (
        Matrix.Rotation(math.radians(-sign * out), 3, 'Y')
        @ Matrix.Rotation(math.radians(-back), 3, 'X')
        @ Matrix.Rotation(math.radians(-sign * twist), 3, 'Z')
    )
    across = turn @ offset(sign, 0, 0)
    up = turn @ offset(0, 1, 0)
    behind = turn @ offset(0, 0, 1)
    root = f.rig.bone('ear' + side) + offset(0, 0, -f.m.ear_forward) * h

    def at(u, v, w=0.0):
        return root + (across * u + up * v + behind * w) * h

    blade = low_poly(
        [
            (at(-base_w, base_y), thick * h),
            (at(base_w, base_y), thick * h),
            (at(-wide_w, wide_y), thick * h),
            (at(wide_w, wide_y), thick * h),
            (at(0, tip_y), 0.4 * thick * h),
        ],
        segments=6,
        rings=2,
    )
    part = Part('ear' + side, blade)
    part.paint(lambda p: kit.accent_or(f, 'ears', 'fur'))
    part.rigid('ear' + side)

    # The pink inside: a thin leaf in front of the ear, smaller than the ear.
    size = f.m.ear_inside
    middle_y = 0.5 * (base_y + tip_y)

    def inner(u, v):
        return at(u * size, middle_y + (v - middle_y) * size, -0.75 * thick)

    lining = low_poly(
        [
            (inner(-base_w, base_y), 0.35 * thick * h),
            (inner(base_w, base_y), 0.35 * thick * h),
            (inner(-wide_w, wide_y), 0.35 * thick * h),
            (inner(wide_w, wide_y), 0.35 * thick * h),
            (inner(0, tip_y), 0.2 * thick * h),
        ],
        segments=4,
        rings=2,
    )
    inside = Part('earInside' + side, lining)
    inside.paint(lambda p: kit.accent_or(f, 'inner-ears', 'belly'))
    inside.rigid('ear' + side)
    return [part, inside]


def eye(f, side, head):
    """Builds the right eye: a large dark upright oval with a black pupil and one light at its
    upper outer side, rigid on the eye bone (design 4.5).

    Args:
        f: The frame of the species.
        side: 'R' or 'L'.
        head: The trunk shell. The eye faces out from its surface, and sinks into it by 0.2 of
            its depth.
    """
    h = f.h
    out, width, height, depth, lift = f.m.eye
    sign = 1 if side == 'R' else -1
    level = f.center.copy()
    level.z = f.rig.bone('eye' + side).z + lift * h
    line = Matrix.Rotation(math.radians(-sign * out), 3, 'Z') @ Vector((0, -1, 0))
    hit, normal = kit.surface(head, level, line, 2 * h)
    # The eye stays upright: it faces the level part of the surface normal.
    forward = Vector((normal.x, normal.y, 0)).normalized()
    turn = Matrix.Rotation(math.atan2(forward.x, -forward.y), 3, 'Z')
    side_axis = turn @ Vector((-sign, 0, 0))
    center = hit - forward * 0.2 * depth * h

    def part(name, region, center_point, radii, segments, rings):
        rx, ry, rz = radii
        made = Part(name + side, low_poly(
            [(center_point, (rx * h, ry * h, rz * h), turn)],
            segments=segments,
            rings=rings,
        ))
        made.paint(lambda p: region)
        made.rigid('eye' + side)
        return made

    up = Vector((0, 0, 1))
    light = center + (forward * 0.75 * depth + up * 0.22 * height + side_axis * 0.2 * width) * h
    return [
        part('iris', 'iris', center, (width / 2, depth, height / 2), 12, 4),
        part('pupil', 'pupil', center + forward * 0.25 * depth * h,
             (0.33 * width, 0.8 * depth, 0.36 * height), 6, 3),
        part('light', 'light', light, (0.04, 0.3 * depth, 0.04), 5, 2),
    ]


def leg(f, side):
    """Builds the right leg: the round haunch and the thigh, the lower leg, and the long foot.

    The thigh, the lower leg, and the foot are closed rigid shells that overlap at the joints.
    """
    h = f.h
    m = f.m
    hip = f.rig.bone('thigh' + side)
    knee = f.rig.bone('shin' + side)
    ankle = f.rig.bone('foot' + side)
    along = (knee - hip).normalized()
    across, up, length, place, lift = m.haunch
    haunch = (
        hip + along * place * h + offset(0, lift, 0) * h,
        (across * h, up * h, length * h),
        kit.frame_along(along),
    )
    middle_place, middle_across, middle_up, middle_lift = m.thigh
    middle = (
        hip + along * middle_place * h + offset(0, middle_lift, 0) * h,
        (middle_across * h, middle_up * h, middle_up * h),
        kit.frame_along(along),
    )
    thigh = Part('thigh' + side, shell(
        'thigh' + side, [hull([haunch, middle, (knee, m.knee * h)])], voxel=0.004,
        triangles=m.leg_triangles, smooth=0.5, smooth_steps=4,
    ))
    kit.jitter(thigh.bm, m.facet_jitter * h, 'thigh')
    thigh.paint(lambda p: 'fur')
    thigh.rigid('thigh' + side)

    top_w, top_d, low_w, low_d, slant = m.shin
    shin = Part('shin' + side, low_poly(
        [
            (knee, (top_w * h, top_d * h, top_w * h)),
            (ankle + offset(0, 0.06, slant) * h, (low_w * h, low_d * h, low_w * h)),
        ],
        segments=8,
        rings=4,
    ))
    shin.paint(lambda p: kit.accent_or(f, 'lower-legs', 'fur'))
    shin.rigid('shin' + side)

    heel, toes, half_width, height = m.foot
    floor = Vector((ankle.x, ankle.y, 0))
    # The ankle ball is the lower end of the lower leg, so that the two parts overlap there. The
    # heel is a ball, and the toes are a round pad as wide as the foot.
    heel_r = 0.5 * height
    toe_up = 0.42 * height
    foot = Part('foot' + side, low_poly(
        [
            (ankle + offset(0, 0.06, slant) * h, (low_w * h, low_d * h, low_w * h)),
            (floor + offset(0, heel_r, heel - heel_r) * h, heel_r * h),
            (floor + offset(0, toe_up, half_width - toes) * h,
             (half_width * h, half_width * h, toe_up * h)),
        ],
        segments=8,
        rings=3,
    ))
    foot.paint(lambda p: kit.accent_or(f, 'feet', 'fur'))
    foot.rigid('foot' + side)
    return [thigh, shin, foot]


def tail(f):
    """Builds the round puff tail, low on the back, rigid on `tail1`."""
    x, y, z, r = f.m.tail
    center = f.at('tail2', x, y, z)
    part = Part('tail', low_poly([(center, r * f.h)], segments=8, rings=4))
    part.paint(lambda p: 'belly')
    part.rigid('tail1')
    return part


class Recipe:
    """The three steps of `build_sculpt.py` for one species of the rabbit family."""

    def __init__(self, measures):
        self.measures = measures

    def regions(self, rig):
        """Gives the color regions of the species."""
        return regions(Frame(rig, self.measures))

    def build_body(self, rig):
        """Builds the parts above the legs. Each stance shares them."""
        f = Frame(rig, self.measures)
        m = self.measures
        body = trunk(f)
        right = [
            *kit.arm(f, 'R', radii=m.arm),
            *kit.hand(f, 'R', palm=m.palm),
            *ear(f, 'R'),
            *eye(f, 'R', body.bm),
        ]
        left = [mirror_part(part) for part in right]
        return [body, nose(f, body.bm), tail(f), *right, *left]

    def build_legs(self, rig):
        """Builds the legs and the feet in the stance of the rig."""
        right = leg(Frame(rig, self.measures), 'R')
        return [*right, *(mirror_part(part) for part in right)]
