"""The recipe of the cat family (design 4.3): the forms, the color regions, and the skin of each
shell of the cats of the violas of `orchestra-side.png`, `orchestra-latest.png`, and
`lowpoly-animals.png`.

A species file (`cat.py`) gives its measures (`Measures`), and `Recipe` makes the three steps
that `build_sculpt.py` calls. All sizes are in H, the head height of the species. A point is a
bone or a body point of the rig plus an offset in the model axes: x to the right side of the
animal, y up, z to the back.

The cat shares the arms, the hands, the legs, the ears, and the eyes of the dog family
(`canine.py`). Its own parts are the head, the plain torso, the nose, and the thin tail: a wide
head with a flat crown and cheeks that flare out under the eyes, a short muzzle of two round
whisker pads with a light color, a small pink nose, a plain gray torso with no bib, light paws,
and a thin tail.
"""

import dataclasses

import bmesh

import canine
import kit
from kit import Part, chain_skin, cut, hull, offset, shell, split_joints


@dataclasses.dataclass(frozen=True)
class Measures(canine.Measures):
    """The measures of one species of the cat family, in H.

    The fields of `canine.Measures` keep their meaning. The fields `muzzle_base`, `muzzle_tip`,
    `jaw_back`, `jaw_tip`, `cheek`, `cheek_tuft`, `skull`, `crown`, `face`, `belly`, `chest`,
    `neck`, and `yoke` give the forms of the trunk. The cat does not use the color borders of the
    face and the bib of the dog family (`face_y`, `face_slope`, `cheek_back`, `bib`, `bib_v`), and
    its tail is its own (`tail_*` below).
    """

    #: The whisker pad of the right side of the muzzle: a ball (x, y, z, r) from the head center.
    #: The two pads make the round W of the muzzle under the nose.
    whisker_pad: tuple = (0.1, -0.22, -0.5, 0.12)
    #: The light muzzle: the height of its upper border from the head center, its back plane (a
    #: negative z is in front of the head center), and its half width.
    muzzle_light: tuple = (-0.12, -0.34, 0.26)
    #: The pink nose on the top of the front of the muzzle: its height from the head center, and
    #: its radii across, up, and along. It is a rounded triangle, wider at the top.
    nose: tuple = (-0.12, 0.07, 0.05, 0.04)
    #: The color region of the paws, or None for the color of the accent rule of the feet.
    paw_region: str | None = None
    #: The thin tail: its tip from the `tail2` bone, and its radii at the root, at the joint, and
    #: at the tip. The default tip is the tip of the thin parametric tail (`tailPath()` of
    #: `models/tails.ts`), so that the rows of the layout keep their depth.
    tail_tip: tuple = (0.057, -0.379, 0.114)
    tail_radii: tuple = (0.06, 0.05, 0.03)


def trunk(f):
    """Builds the torso, the neck, and the head with the cheeks and the short muzzle."""
    h = f.h
    m = f.m
    y = f.torso
    # The yoke ball over each shoulder joint, as the dog family (`canine.trunk()`).
    yoke = 0.33 + (f.proportions['shoulderSpread'] - canine.DEFAULT_SHOULDER_SPREAD)
    neck = m.neck
    ya, yu, yl, ma, mu, ml = m.yoke
    crown = [] if m.crown is None else [f.ellipsoid(m.crown)]
    forms = [
        # The pear of the torso: a belly on the seat and a narrower chest.
        hull([
            (f.at(f.base, 0, y(py), pz), (rx * h, rz * h, ry * h))
            for py, pz, rx, ry, rz in (m.belly, m.chest)
        ]),
        # The shoulder yoke, so that the ball of each upper arm sinks into the torso.
        hull([
            (f.at(f.base, yoke, y(0.98), 0.0), (ya * h, yl * h, yu * h)),
            (f.at(f.base, 0, y(0.98), 0.0), (ma * h, ml * h, mu * h)),
        ]),
        # The neck, from the shoulders to under the head.
        hull([
            (f.at(f.base, 0, y(1.12), 0.0), (neck[0] * h, neck[2] * h, neck[1] * h)),
            (f.at(f.center, 0, -0.32, 0.1), (neck[3] * h, neck[5] * h, neck[4] * h)),
        ]),
        # The wide skull with a flat crown and the flat face in front of it.
        hull([f.ellipsoid(m.skull), f.ellipsoid(m.face), *crown]),
        # The cheek of the right side: full under the eye, with a tuft that flares out.
        hull([f.ball(m.cheek), f.ball(m.cheek_tuft)]),
        # The bridge of the nose, from the face to the nose.
        hull([f.ellipsoid(m.muzzle_base), f.ball(m.muzzle_tip)]),
        # The whisker pad of the right side, and the small chin under the pads.
        hull([f.ball(m.whisker_pad), f.ball(m.jaw_tip)]),
        hull([f.ball(m.jaw_back), f.ball(m.jaw_tip)]),
    ]
    bm = shell(
        'trunk', forms, voxel=0.005, triangles=m.trunk_triangles, smooth=0.5, smooth_steps=4,
        mirror=True,
    )

    # The border of the light muzzle: a level plane under the eyes, a plane at its back, and a
    # plane at each side.
    top, back, half = m.muzzle_light
    c = f.center

    def near_muzzle(p):
        _, py, pz = f.local(p, c)
        return pz < back + 0.12 and -0.6 < py < top + 0.1

    cut(bm, f.at(c, 0, top, 0), offset(0, 1, 0), near_muzzle)
    cut(bm, f.at(c, 0, 0, back), offset(0, 0, 1), near_muzzle)
    for side in (1, -1):
        cut(bm, f.at(c, side * half, 0, 0), offset(1, 0, 0), near_muzzle)

    # The borders of the main bones (design 4.7): each triangle then follows one bone, or a bone
    # and its parent.
    levels = canine.trunk_levels(f)
    rule = canine.trunk_skin(f, levels)
    split_joints(
        bm, rule, ['hips', 'spine', 'chest', 'neck', 'head'], canine.level_planes(f, levels),
    )

    def paint(p):
        x, py, pz = f.local(p, c)
        lower_face = py > -0.6 and pz < back and py < top and abs(x) < half
        return 'belly' if lower_face else 'fur'

    part = Part('trunk', bm)
    part.paint(paint)
    part.skin_by(rule)
    return part


def nose(f, head):
    """Builds the small pink nose on the front of the muzzle, rigid on `head`."""
    h = f.h
    y, rx, ry, rz = f.m.nose
    tip, _ = kit.surface(head, f.at(f.center, 0, y, 0), offset(0, 0, -1), 2 * h)
    center = tip + offset(0, 0, 0.3 * rz) * h
    # Wider at the top: a wide flat ball above and a narrow ball below.
    bm = hull([
        (center + offset(0, 0.3 * ry, 0) * h, (rx * h, rz * h, 0.5 * ry * h)),
        (center + offset(0, -0.5 * ry, 0) * h, (0.35 * rx * h, 0.8 * rz * h, 0.35 * ry * h)),
    ], segments=8, rings=3)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    part = Part('nose', bm)
    part.paint(lambda p: 'nose')
    part.rigid('head')
    return part


def tail(f):
    """Builds the thin tail on two bones: a tube that bends at the joint."""
    h = f.h
    root_r, joint_r, tip_r = f.m.tail_radii
    root = f.rig.bone('tail1')
    joint = f.rig.bone('tail2')
    tip = f.at(joint, *f.m.tail_tip)
    bm = shell(
        'tail',
        [hull([(root, root_r * h), (joint, joint_r * h)]),
         hull([(joint, joint_r * h), (tip, tip_r * h)])],
        voxel=0.003, triangles=f.m.tail_triangles, smooth=0.5, smooth_steps=4,
    )
    part = Part('tail', bm)
    part.paint(lambda p: 'fur')
    part.skin_by(chain_skin([('tail1', root), ('tail2', joint), (None, tip)], band=0.06 * h))
    return part


def leg(f, side):
    """Builds the right leg of the dog family, with the paw in the paw region."""
    parts = canine.leg(f, side)
    if f.m.paw_region is not None:
        for part in parts:
            if part.name.startswith('paw'):
                part.paint(lambda p: f.m.paw_region)
    return parts


class Recipe:
    """The three steps of `build_sculpt.py` for one species of the cat family."""

    def __init__(self, measures):
        self.measures = measures

    def regions(self, rig):
        """Gives the color regions of the species."""
        return canine.regions(canine.Frame(rig, self.measures))

    def build_body(self, rig):
        """Builds the parts above the legs. Each stance shares them."""
        f = canine.Frame(rig, self.measures)
        body = trunk(f)
        right = [
            *canine.arm(f, 'R'), *canine.hand(f, 'R'), *canine.ear(f, 'R'), *canine.eye(f, 'R'),
        ]
        left = [canine.mirror_part(part) for part in right]
        return [body, nose(f, body.bm), tail(f), *right, *left]

    def build_legs(self, rig):
        """Builds the legs and the paws in the stance of the rig."""
        right = leg(canine.Frame(rig, self.measures), 'R')
        return [*right, *(canine.mirror_part(part) for part in right)]
