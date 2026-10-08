"""The recipe of the bear family (design 4.3): the forms, the color regions, and the skin of each
shell of the polar bear of `polar-bear-views.png`, the brown bear of the podium, and the panda of
`orchestra-latest.png`.

A species file (`polar_bear.py`, `bear.py`, `panda.py`) gives its measures (`Measures`), and
`Recipe` makes the three steps that `build_sculpt.py` calls. All sizes are in H, the head height
of the species. A point is a bone or a body point of the rig plus an offset in the model axes: x
to the right side of the animal, y up, z to the back.

The forms follow the polar bear sheet: a small round head with small round ears, small black
eyes, and a black nose on a long straight muzzle, a thick neck that leans forward, a large round
body with a round back, thick arms with wide paws and black claws, thick legs, and large feet
with black pads under them. The panda adds its black and white pattern: the eye patches, the
ears, the arms with a band over the shoulders, and the legs.
"""

import dataclasses
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import kit
from kit import Part, cut, hull, low_poly, mirror_part, offset, shell

#: The color of the eyes, as `EYE_COLOR` of `models/species.ts`.
EYE_COLOR = '#15110e'

#: The color of the light in each eye (design 4.5).
LIGHT_COLOR = '#f6f2ea'


@dataclasses.dataclass(frozen=True)
class Measures:
    """The measures of one species of the bear family, in H.

    An ellipsoid is (x, y, z, rx, ry, rz): a center offset and its radii, in the model axes (rx
    across, ry up, rz along the body). The forms of the head are offsets from the head center, and
    the forms of the torso are offsets from the base of the torso, on the seat under the hips. A
    form with x > 0 has its mirror form at -x.
    """

    #: The soft forms of the head (`kit.blob()`), from the head center: the round skull, the
    #: forehead that runs into the muzzle in one line, the cheeks, the long muzzle, its round tip,
    #: and the chin. The top of the skull is the crown, 0.5 H to 0.57 H above the head center (the
    #: head-top test of `species.test.ts`).
    head: tuple = (
        (0, 0.09, 0.02, 0.44, 0.43, 0.44),
        (0, 0.1, -0.3, 0.27, 0.26, 0.3),
        (0, 0.0, -0.4, 0.18, 0.21, 0.28),
        (0.2, -0.1, -0.12, 0.23, 0.24, 0.28),
        (0, -0.1, -0.42, 0.21, 0.2, 0.26),
        (0, -0.12, -0.56, 0.15, 0.14, 0.12),
        (0, -0.25, -0.34, 0.2, 0.12, 0.26),
    )
    #: The soft forms of the torso (`kit.blob()`), from the base of the torso: the wide belly on
    #: the seat, the chest, the round back behind the shoulders, and the shoulder yoke at the
    #: height of the shoulder joints (its y is from the joints).
    belly: tuple = (0, 0.66, 0.0, 0.74, 0.72, 0.72)
    chest: tuple = (0, 1.25, -0.06, 0.74, 0.55, 0.58)
    back: tuple = (0, 1.78, 0.3, 0.74, 0.62, 0.6)
    #: The round seat of the body: wide at the back and at the sides of the hips, as the pear of
    #: the back view of the sheet.
    seat: tuple = (0, 0.5, 0.3, 1.1, 0.55, 0.52)
    yoke: tuple = (0, 0.0, 0.0, 0.62, 0.32, 0.5)
    #: The thick neck, from the head center: it fills the space from the shoulders to the back of
    #: the head and to the chin, so that the head sits low on the shoulders.
    neck: tuple = (0, -0.42, 0.22, 0.56, 0.44, 0.5)
    #: The triangles of the trunk shell after the decimate.
    trunk_triangles: int = 720
    #: The largest seeded move of a vertex of the trunk along its normal, so that the facets turn
    #: against each other (`kit.jitter()`).
    facet_jitter: float = 0.012
    #: The black nose on the tip of the muzzle: its height from the head center, and its radii
    #: across, up, and along. It is a rounded triangle, wider at the top.
    nose: tuple = (-0.1, 0.14, 0.1, 0.08)
    #: The dark line of the mouth under the nose: its drop below the nose center, its half width,
    #: and its half height, or None for no mouth line.
    mouth: tuple = (0.17, 0.09, 0.012)
    #: The round ear: its place from the head center, its radius, and its half thickness. The ear
    #: turns out by `ear_turn` degrees from the front. The inside is a smaller disc in front of it.
    ear: tuple = (0.35, 0.42, 0.0, 0.11, 0.06)
    ear_turn: float = 15
    ear_inside: float = 0.6
    #: The small black eye: the turn of the line from the head center to the eye out from the
    #: front, in degrees, its height above the head center, its width and height, and its depth.
    #: It lies on the head surface, so that the front view and the side view both show it.
    eye: tuple = (28, 0.13, 0.1, 0.11, 0.05)
    #: The arm capsules (`kit.arm()`): the radii of the shoulder ball, the elbow end of the upper
    #: arm, the elbow ball, and the wrist, and the bulge and the triangles of the soft capsules.
    arm: tuple = (0.3, 0.25, 0.24, 0.19)
    soft_arm: tuple = (1.1, 70)
    #: The wide paw: the radii of the palm ball and of the finger ball (across the palm, to the
    #: front, and along the arm), and the growth toward the back of the hand (`kit.hand()`). In
    #: the bind pose the palm faces the body, so the paw is wide to the front.
    palm: tuple = (0.13, 0.2, 0.17)
    fingers: tuple = (0.12, 0.19, 0.11)
    paw_back: float = 0.04
    #: The claws at the front of each paw: their number, their length, their radius, and the
    #: spread of the row across the paw.
    claws: tuple = (5, 0.08, 0.025, 0.3)
    #: The round haunch: the radii across, up, and along the thigh, its place along the thigh
    #: from the hip, and its lift above the line from the hip to the knee.
    haunch: tuple = (0.54, 0.5, 0.78, 0.2, 0.08)
    #: The knee at the end of the thigh: its radii across, up, and along, and its place behind the
    #: knee bone.
    knee: tuple = (0.38, 0.36, 0.32, 0.05)
    #: The thick lower leg: its half width at the knee and at the ankle, and the move of its lower
    #: end to the back.
    shin: tuple = (0.33, 0.3, 0.02)
    #: The large foot: the heel behind the ankle, the toes in front of it, the half width, and the
    #: height of the foot.
    foot: tuple = (0.3, 0.58, 0.33, 0.36)
    #: The claws at the front of each foot: their number, length, radius, and spread.
    toe_claws: tuple = (4, 0.08, 0.025, 0.36)
    #: The triangles of each thigh, lower leg, and foot after the decimate.
    leg_triangles: tuple = (150, 70, 90)
    #: The small round tail: its center from the `tail2` bone, and its radius.
    tail: tuple = (0, 0.05, -0.04, 0.16)
    #: The color regions of the patterns of the panda (design 4.3), or False for one fur color: the
    #: eye patches, and the band over the shoulders that joins the black arms. The patch is an
    #: oval (x, y, width, height, turn in degrees) on the face around each eye.
    panda: bool = False
    patch: tuple = (0.2, 0.1, 0.26, 0.36, 40)
    #: The band over the shoulders of the panda: its lower edge at the front and at the back,
    #: above the base of the torso.
    band: tuple = (1.0, 1.2)


def regions(f):
    """Gives the color regions of the species: a color and a finish each (design 4.5)."""
    colors = f.rig.colors
    return {
        'fur': {'color': colors['fur'], 'finish': 'fur'},
        'belly': {'color': colors['belly'], 'finish': 'fur'},
        'accent': {'color': colors['accent'], 'finish': 'fur' if f.m.panda else 'matte'},
        'dark': {'color': f.dark or colors['accent'], 'finish': 'matte'},
        'iris': {'color': colors['iris'], 'finish': 'lacquer'},
        'pupil': {'color': EYE_COLOR, 'finish': 'lacquer'},
        'light': {'color': LIGHT_COLOR, 'finish': 'lacquer'},
    }


class Frame(kit.Frame):
    """The points of the species in Blender axes. The base of the torso is on the seat, 0.3 H
    below the hip joints (`HIP_JOINT.seated` of `models/body-frame.ts`), on the axis of the
    torso."""

    def __init__(self, rig, measures, dark, light_muzzle):
        hip = kit.to_model(rig.bone('thighR'))[1]
        seated = rig.stance != 'standing'
        seat = hip - (0.3 if seated else 0.17) * rig.h
        base = rig.bone('hips')
        base.z = seat
        super().__init__(rig, measures, base)
        #: The color of the nose, the mouth, the claws, and the pads.
        self.dark = dark
        #: True for a muzzle of the accent color, as the brown bear.
        self.light_muzzle = light_muzzle
        #: The height of the shoulder joints above the base of the torso, in H.
        self.shoulder = self.local(rig.bone('upperArmR'), base)[1]

    def from_base(self, values):
        """Gives the (center, radii) of an ellipsoid (x, y, z, rx, ry, rz) at the base."""
        x, y, z, rx, ry, rz = values
        return (self.at(self.base, x, y, z), (rx * self.h, rz * self.h, ry * self.h))


def mirrored_forms(f, forms, place):
    """Gives the (center, radii) of each form, with the mirror forms of the forms with x > 0."""
    out = []
    for x, y, z, rx, ry, rz in forms:
        for side in ((1, -1) if x > 0 else (1,)):
            out.append(place((side * x, y, z, rx, ry, rz)))
    return out


def trunk(f):
    """Builds the torso, the thick neck, and the head with the long muzzle."""
    m = f.m
    yx, yy, yz, yrx, yry, yrz = m.yoke
    forms = [
        kit.blob([
            f.from_base(m.belly),
            f.from_base(m.chest),
            f.from_base(m.back),
            f.from_base(m.seat),
            f.from_base((yx, f.shoulder + yy, yz, yrx, yry, yrz)),
            f.ellipsoid(m.neck),
        ], resolution=0.008),
        kit.blob(mirrored_forms(f, m.head, f.ellipsoid), resolution=0.006),
    ]
    bm = shell(
        'trunk', forms, voxel=0.006, triangles=m.trunk_triangles, smooth=0.5, smooth_steps=4,
        mirror=True,
    )
    kit.jitter(bm, m.facet_jitter * f.h, 'trunk')
    if m.panda:
        panda_cuts(f, bm)
    rule = kit.skin_trunk(f, bm)
    part = Part('trunk', bm)
    part.paint(lambda p: trunk_region(f, p))
    part.skin_by(rule)
    return part


def patch_test(f, side):
    """Gives a test of a point: inside the eye patch of one side of the panda (design 4.3)."""
    x, y, width, height, turn = f.m.patch
    angle = math.radians(turn)

    def inside(p):
        px, py, pz = f.local(p, f.center)
        if pz > -0.1 or side * px < 0:
            return False
        dx, dy = side * px - x, py - y
        # The patch turns so that its lower end points down and out.
        u = dx * math.cos(angle) + dy * math.sin(angle)
        v = -dx * math.sin(angle) + dy * math.cos(angle)
        return (u / (width / 2)) ** 2 + (v / (height / 2)) ** 2 <= 1

    return inside


def band_level(f, p):
    """Gives the height of the lower edge of the band over the shoulders at a point, in H above the
    base: lower at the front, higher at the back."""
    front, back = f.m.band
    _, _, z = f.local(p, f.base)
    t = min(1.0, max(0.0, (z + 0.6) / 1.2))
    return front + (back - front) * t


def in_band(f, p):
    """Tells if a point of the torso is in the black band over the shoulders of the panda."""
    _, y, z = f.local(p, f.base)
    neck_top = f.local(f.rig.bone('head'), f.base)[1]
    return band_level(f, p) < y < neck_top - 0.05 and y < f.shoulder + 0.45


def panda_cuts(f, bm):
    """Cuts the trunk along the borders of the band of the panda, so that each border is
    straight."""
    front, back = f.m.band
    normal = offset(0, 1.2, (back - front) / 1.2 * -1.0).normalized()
    cut(bm, f.at(f.base, 0, front + (back - front) * 0.5, 0), normal,
        lambda p: f.local(p, f.base)[1] < f.shoulder + 0.6)


def trunk_region(f, p):
    """Gives the color region of a face of the trunk."""
    if f.m.panda:
        for side in (1, -1):
            if patch_test(f, side)(p):
                return 'accent'
        if in_band(f, p):
            return 'accent'
        return 'fur'
    x, y, z = f.local(p, f.center)
    # The muzzle of the brown bear is lighter: the accent color in front of the eyes.
    if f.light_muzzle and z < -0.38 and y < 0.02 and abs(x) < 0.3:
        return 'accent'
    return 'fur'


def nose(f, head):
    """Builds the black nose on the tip of the muzzle, rigid on `head`, and the dark mouth line
    under it."""
    y, rx, ry, rz = f.m.nose
    tip, _ = kit.surface(head, f.at(f.center, 0, y, 0), offset(0, 0, -1), 2 * f.h)
    center = tip + offset(0, 0, 0.35 * rz) * f.h
    parts = []
    # The nose is wider at the top: a hull of a wide ball above and a narrow ball below.
    bm = hull([
        (center + offset(0, 0.25 * ry, 0) * f.h, (rx * f.h, rz * f.h, 0.7 * ry * f.h)),
        (center + offset(0, -0.35 * ry, 0) * f.h, (0.5 * rx * f.h, 0.8 * rz * f.h, 0.5 * ry * f.h)),
    ], segments=8, rings=3)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    nose_part = Part('nose', bm)
    nose_part.paint(lambda p: 'dark')
    nose_part.rigid('head')
    parts.append(nose_part)
    if f.m.mouth:
        drop, half_width, half_height = f.m.mouth
        below = f.at(f.center, 0, y - drop, 0)
        lip, _ = kit.surface(head, below, offset(0, 0, -1), 2 * f.h)
        line = low_poly([(lip, (half_width * f.h, 0.02 * f.h, half_height * f.h))],
                        segments=8, rings=2)
        mouth_part = Part('mouth', line)
        mouth_part.paint(lambda p: 'dark')
        mouth_part.rigid('jaw')
        parts.append(mouth_part)
    return parts


def ear(f, side, head):
    """Builds the right ear: a small round disc on the side of the crown with a lighter inside,
    rigid on the ear bone."""
    h = f.h
    x, y, z, radius, half = f.m.ear
    sign = 1 if side == 'R' else -1
    turn = Matrix.Rotation(math.radians(-sign * f.m.ear_turn), 3, 'Z')
    forward = turn @ Vector((0, -1, 0))
    base = f.at(f.center, sign * x, y, z)
    # The disc stands on the skull: its center is above the surface under it.
    rotation = turn @ Matrix.Rotation(math.radians(90), 3, 'X')
    disc = low_poly([(base, (radius * h, radius * h, half * h), rotation)], segments=10, rings=4)
    outer = Part('ear' + side, disc)
    outer.paint(lambda p: 'accent' if f.m.panda else 'fur')
    outer.rigid('ear' + side)
    inner_r = f.m.ear_inside * radius
    lining = low_poly([(base + forward * half * h * 0.9 + Vector((0, 0, -0.1 * radius * h)),
                        (inner_r * h, inner_r * h, 0.35 * half * h), rotation)],
                      segments=8, rings=3)
    inside = Part('earInside' + side, lining)
    inside.paint(lambda p: 'accent' if f.m.panda else 'belly')
    inside.rigid('ear' + side)
    return [outer, inside]


def eye(f, side, head):
    """Builds the right eye: a small black bead with one light at its upper outer side, rigid on
    the eye bone (design 4.5)."""
    h = f.h
    out, y, width, height, depth = f.m.eye
    sign = 1 if side == 'R' else -1
    level = f.at(f.center, 0, y, 0)
    line = Matrix.Rotation(math.radians(-sign * out), 3, 'Z') @ Vector((0, -1, 0))
    hit, normal = kit.surface(head, level, line, 2 * h)
    forward = Vector((normal.x, normal.y, 0)).normalized()
    turn = Matrix.Rotation(math.atan2(forward.x, -forward.y), 3, 'Z')
    pole = turn @ Matrix.Rotation(math.radians(90), 3, 'X')
    center = hit - forward * 0.2 * depth * h
    bead = Part('iris' + side, low_poly(
        [(center, (width / 2 * h, height / 2 * h, depth * h), pole)], segments=8, rings=3,
    ))
    bead.paint(lambda p: 'pupil')
    bead.rigid('eye' + side)
    side_axis = turn @ Vector((-sign, 0, 0))
    light_at = center + (forward * 0.85 * depth + Vector((0, 0, 0.2 * height))
                         + side_axis * 0.18 * width) * h
    light = Part('light' + side, low_poly(
        [(light_at, (0.02 * h, 0.022 * h, 0.012 * h), pole)], segments=6, rings=2,
    ))
    light.paint(lambda p: 'light')
    light.rigid('eye' + side)
    return [bead, light]


def joined(parts):
    """Joins some bmesh parts into one bmesh, and frees them."""
    bm = bmesh.new()
    for part in parts:
        mesh = bpy.data.meshes.new('part')
        part.to_mesh(mesh)
        part.free()
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return bm


def claws(f, name, bone, root, along, across, measures):
    """Builds a row of black claws: small cones that point along a direction, rigid on a bone.

    Args:
        f: The frame of the species.
        name: The name of the part.
        bone: The bone of the claws.
        root: The root of the middle claw, in Blender axes.
        along: The direction of the claws.
        across: The direction of the row.
        measures: The number of claws, the length and the root radius of each claw, and the
            width of the row, in H.
    """
    h = f.h
    count, length, radius, spread = measures
    cones = []
    for i in range(count):
        t = (i / (count - 1) - 0.5) if count > 1 else 0.0
        # The outer claws sit a little back, along the round front of the paw.
        at = root + across * t * spread * h - along * abs(t) * 0.3 * spread * h
        cones.append(hull([(at, radius * h), (at + along * length * h, 0.3 * radius * h)],
                          segments=5, rings=2))
    made = Part(name, joined(cones))
    made.paint(lambda p: 'dark')
    made.rigid(bone)
    return made


def paw_claws(f, side):
    """Builds the claws of the right paw, at the tip of the finger ball, rigid on `fingers`. They
    curl a little to the palm side, as the claws on the keys of the sheet."""
    fingers = f.rig.point('fingerBlock' + side)
    palm = f.rig.point('palm' + side)
    along = (fingers - palm).normalized()
    # The palm faces the middle of the body: +x in Blender axes for the right hand.
    palm_side = Vector((1 if side == 'R' else -1, 0, 0))
    root = fingers + along * 0.55 * f.m.fingers[2] * f.h + palm_side * 0.03 * f.h
    direction = (along + palm_side * 0.5).normalized()
    return claws(f, 'claws' + side, 'fingers' + side, root, direction, offset(0, 0, -1),
                 f.m.claws)


def hand(f, side):
    """Builds the wide paw: the palm ball, the finger ball, and the claws."""
    m = f.m
    parts = kit.hand(f, side, palm=m.palm, fingers=m.fingers, back=m.paw_back, segments=8)
    for part in parts:
        part.paint(lambda p: 'accent' if m.panda else 'fur')
    return [*parts, paw_claws(f, side)]


def leg(f, side):
    """Builds the right leg: the round haunch and the thigh, the thick lower leg, and the large
    foot with the black pad under it and the claws at its front."""
    h = f.h
    m = f.m
    thigh_triangles, shin_triangles, foot_triangles = m.leg_triangles
    hip = f.rig.bone('thigh' + side)
    knee = f.rig.bone('shin' + side)
    ankle = f.rig.bone('foot' + side)
    along = (knee - hip).normalized()
    across, up, length, place, lift = m.haunch
    region = 'accent' if m.panda else 'fur'
    thigh = Part('thigh' + side, shell(
        'thigh' + side,
        [kit.blob([
            (hip + along * place * h + offset(0, lift, 0) * h, (across * h, length * h, up * h)),
            (knee - along * m.knee[3] * h, (m.knee[0] * h, m.knee[2] * h, m.knee[1] * h)),
        ], resolution=0.007)],
        voxel=0.006, triangles=thigh_triangles, smooth=0.5, smooth_steps=4,
    ))
    kit.jitter(thigh.bm, m.facet_jitter * h, 'thigh')
    thigh.paint(lambda p: region)
    thigh.rigid('thigh' + side)

    top_w, low_w, slant = m.shin
    # The lower end of the lower leg is a flat ball inside the foot, above the floor.
    low = ankle + offset(0, 0.14, slant) * h
    low_radii = (low_w * h, low_w * h, 0.18 * h)
    shin = Part('shin' + side, shell(
        'shin' + side,
        [hull([
            (knee + offset(0, -0.05, 0) * h, (top_w * h, top_w * h, top_w * h)),
            (low, low_radii),
        ])],
        voxel=0.006, triangles=shin_triangles, smooth=0.5, smooth_steps=4,
    ))
    shin.paint(lambda p: region)
    shin.rigid('shin' + side)

    heel, toes, half_width, height = m.foot
    floor = Vector((ankle.x, ankle.y, 0))
    foot_bm = shell(
        'foot' + side,
        [kit.blob([
            (low, low_radii),
            (floor + offset(0, 0.45 * height, heel - 0.45 * height) * h,
             (0.9 * half_width * h, 0.45 * height * h, 0.45 * height * h)),
            (floor + offset(0, 0.42 * height, 0.15 - 0.5 * toes) * h,
             (half_width * h, 0.4 * toes * h, 0.42 * height * h)),
        ], resolution=0.006)],
        voxel=0.005, triangles=foot_triangles, smooth=0.5, smooth_steps=4,
    )
    # The sole lies flat on the floor, and its faces are the black pad.
    for v in foot_bm.verts:
        v.co.z = max(v.co.z, floor.z)
    foot = Part('foot' + side, foot_bm)
    foot.bm.normal_update()
    foot.bm.faces.ensure_lookup_table()
    pads = {face.index for face in foot.bm.faces if face.normal.z < -0.9}
    foot.paint(lambda p: region)
    for index in pads:
        foot.regions[index] = 'dark'
    foot.rigid('foot' + side)

    toe, _ = kit.surface(foot_bm, floor + offset(0, 0.3 * height, 0) * h, offset(0, 0, -1),
                         2 * h)
    toe_claws = claws(f, 'toeClaws' + side, 'foot' + side, toe + offset(0, 0, 0.03) * h,
                      offset(0, -0.4, -1).normalized(), offset(1, 0, 0), m.toe_claws)
    return [thigh, shin, foot, toe_claws]


def tail(f):
    """Builds the small round tail, low on the back, rigid on `tail1`."""
    x, y, z, r = f.m.tail
    center = f.at('tail2', x, y, z)
    part = Part('tail', low_poly([(center, r * f.h)], segments=8, rings=4))
    part.paint(lambda p: 'fur')
    part.rigid('tail1')
    return part


class Recipe:
    """The three steps of `build_sculpt.py` for one species of the bear family.

    Args:
        measures: The measures of the species.
        dark: The color of the nose, the claws, and the pads, or None for the accent color.
        light_muzzle: True for a muzzle of the belly color, as the brown bear.
    """

    def __init__(self, measures, dark=None, light_muzzle=False):
        self.measures = measures
        self.dark = dark
        self.light_muzzle = light_muzzle

    def frame(self, rig):
        """Gives the frame of the species in one stance."""
        return Frame(rig, self.measures, self.dark, self.light_muzzle)

    def regions(self, rig):
        """Gives the color regions of the species."""
        return regions(self.frame(rig))

    def build_body(self, rig):
        """Builds the parts above the legs. Each stance shares them."""
        f = self.frame(rig)
        m = self.measures
        body = trunk(f)
        arm_parts = kit.arm(f, 'R', radii=m.arm, soft=m.soft_arm)
        for part in arm_parts:
            part.paint(lambda p: 'accent' if m.panda else 'fur')
        right = [
            *arm_parts,
            *hand(f, 'R'),
            *ear(f, 'R', body.bm),
            *eye(f, 'R', body.bm),
        ]
        left = [mirror_part(part) for part in right]
        return [body, *nose(f, body.bm), tail(f), *right, *left]

    def build_legs(self, rig):
        """Builds the legs and the feet in the stance of the rig."""
        right = leg(self.frame(rig), 'R')
        return [*right, *(mirror_part(part) for part in right)]
