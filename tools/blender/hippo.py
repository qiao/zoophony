"""The recipe of the hippo of the contrabasses (design 4.3): the measures of the bear family
(`ursine.py`), from the hippos of `orchestra-latest.png`, `orchestra-side.png`, and
`lowpoly-animals.png`, and the parts of its own head.

The hippo of the scenes is a large round purple-gray body with a broad head: small eyes on knobs
on the top of the head, small round ears with pink insides, and a wide muzzle like a box with
two nostrils on the top of its front and a light tooth at each corner of the mouth. Its arms
and legs are thick, and light nails show at the front of the feet. The paws have no nails: on a
chair, the nails of the hanging paws of the bind pose went 0.009 m below the floor.

The forms of the bear family give the trunk, the arms, the legs, the ears, and the eyes. This
file adds the nostrils and the teeth, and gives the insides of the ears the accent color.
"""

import dataclasses

import bmesh

import kit
import ursine
from kit import Part, hull, low_poly, offset

#: The light color of the nails and the teeth, as the nails of the hippos of
#: `orchestra-latest.png`.
NAIL_COLOR = '#e6d2c2'

#: The color of the nostrils, as `NOSE_COLOR` of `models/species.ts`.
NOSTRIL_COLOR = '#2a1d15'


@dataclasses.dataclass(frozen=True)
class Measures(ursine.Measures):
    """The measures of the hippo, in H: the measures of the bear family and the parts of the
    muzzle."""

    #: The right nostril on the top of the front of the muzzle: its place (x, y) from the head
    #: center, and its radii across, up, and along. It lies on the surface of the muzzle.
    nostril: tuple = (0.15, -0.02, 0.05, 0.035, 0.04)
    #: The right tooth at the corner of the mouth: its place (x, y, z) from the head center, and
    #: its radius.
    tooth: tuple = (0.24, -0.5, -0.66, 0.045)


#: The measures of the hippo, in H.
MEASURES = Measures(
    head=(
        # The skull: its top is the crown, 0.52 H above the head center.
        (0, 0.12, 0.0, 0.4, 0.4, 0.4),
        # The forehead that runs into the top of the muzzle.
        (0, 0.1, -0.3, 0.36, 0.28, 0.3),
        # The knob of each eye on the top of the head.
        (0.2, 0.28, -0.3, 0.1, 0.1, 0.11),
        # The full cheeks.
        (0.22, -0.06, -0.12, 0.23, 0.2, 0.26),
        # The wide muzzle, as a box with round corners: the middle, the upper front corners
        # under the nostrils, and the lower front corners.
        (0, -0.2, -0.5, 0.4, 0.28, 0.34),
        (0.2, -0.1, -0.72, 0.2, 0.17, 0.18),
        (0.2, -0.32, -0.68, 0.2, 0.17, 0.2),
        # The deep lower jaw.
        (0, -0.44, -0.48, 0.32, 0.16, 0.32),
    ),
    belly=(0, 0.66, -0.05, 0.62, 0.72, 0.56),
    chest=(0, 0.82, -0.06, 0.47, 0.38, 0.48),
    back=(0, 1.1, 0.0, 0.42, 0.42, 0.4),
    seat=(0, 0.42, 0.0, 0.74, 0.48, 0.46),
    yoke=(0, -0.1, 0.0, 0.38, 0.24, 0.4),
    neck=(0, -0.6, 0.12, 0.28, 0.34, 0.36),
    trunk_triangles=660,
    leg_triangles=(130, 60, 80),
    ear=(0.32, 0.46, 0.06, 0.1, 0.05),
    ear_turn=20,
    ear_inside=0.6,
    eye=(24, 0.3, 0.075, 0.075, 0.04),
    arm=(0.2, 0.18, 0.17, 0.12),
    palm=(0.12, 0.16, 0.14),
    fingers=(0.12, 0.16, 0.08),
    claws=None,
    haunch=(0.4, 0.33, 0.5, 0.15, 0.0),
    knee=(0.32, 0.3, 0.28, 0.0),
    shin=(0.36, 0.34, 0.0),
    foot=(0.25, 0.45, 0.33, 0.28),
    toe_claws=(4, 0.04, 0.03, 0.4),
    tail=(0, 0.02, -0.04, 0.1),
)


def nostrils(f, head):
    """Builds the two nostrils on the top of the front of the muzzle, rigid on `head`."""
    h = f.h
    x, y, rx, ry, rz = f.m.nostril
    parts = []
    for side, sign in (('R', 1), ('L', -1)):
        hit, normal = kit.surface(head, f.at(f.center, sign * x, y, 0), offset(0, 0.4, -1), 2 * h)
        bm = low_poly([(hit - normal * 0.25 * rz * h, (rx * h, rz * h, ry * h))], segments=8,
                      rings=3)
        part = Part('nostril' + side, bm)
        part.paint(lambda p: 'nostril')
        part.rigid('head')
        parts.append(part)
    return parts


def teeth(f):
    """Builds the light tooth at each corner of the mouth, rigid on `jaw`."""
    h = f.h
    x, y, z, r = f.m.tooth
    parts = []
    for side, sign in (('R', 1), ('L', -1)):
        bm = hull([
            (f.at(f.center, sign * x, y, z), r * h),
            (f.at(f.center, sign * x, y + 0.08, z - 0.01), 0.4 * r * h),
        ], segments=6, rings=3)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        part = Part('tooth' + side, bm)
        part.paint(lambda p: 'dark')
        part.rigid('jaw')
        parts.append(part)
    return parts


class Recipe(ursine.Recipe):
    """The three steps of `build_sculpt.py` for the hippo: the bear family with the parts of the
    muzzle of the hippo, and the accent color in the ears."""

    def regions(self, rig):
        """Gives the color regions of the bear family and the color of the nostrils."""
        found = super().regions(rig)
        found['nostril'] = {'color': NOSTRIL_COLOR, 'finish': 'matte'}
        return found

    def build_body(self, rig):
        """Builds the parts above the legs. Each stance shares them."""
        f = self.frame(rig)
        m = self.measures
        body = ursine.trunk(f)
        arm_parts = kit.arm(f, 'R', radii=m.arm, soft=m.soft_arm)
        for part in arm_parts:
            part.paint(lambda p: 'fur')
        ears = ursine.ear(f, 'R', body.bm)
        for part in ears:
            if part.name.startswith('earInside'):
                part.paint(lambda p: 'accent')
        right = [*arm_parts, *ursine.hand(f, 'R'), *ears, *ursine.eye(f, 'R', body.bm)]
        left = [kit.mirror_part(part) for part in right]
        return [body, *nostrils(f, body.bm), *teeth(f), ursine.tail(f), *right, *left]


_RECIPE = Recipe(MEASURES, dark=NAIL_COLOR)
regions = _RECIPE.regions
build_body = _RECIPE.build_body
build_legs = _RECIPE.build_legs
