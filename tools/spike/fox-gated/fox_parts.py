"""The parts of the blockout of the red fox, and their signed distance fields in numpy.

All values are meters in the coordinates of the fox (see `sheet_camera.py`): z up, the fox faces
-y, its left side is +x, and the origin is on the floor under the middle of the seat. Each value
comes from a landmark of `fox-views.png`. The brief of the report lists the landmarks.

A part is one of two simple volumes:

- `ellipsoid`: a center and three radii.
- `cone`: a round cone from a point with a radius to a point with a radius (a capsule when the
  two radii are equal). `flat` scales the cone down along one axis, for the flat ears.

The blockout is the hard union of the parts (phase 2). The forms join the parts with a smooth
union of radius `BLEND` (phase 3).
"""

import numpy as np

#: The parts: (name, group, kind, values). The group `tail` is free of the silhouette carve,
#: because the three views of the sheet show three different tails.
PARTS = [
    ('cranium', 'head', 'ellipsoid', ((-0.01, -0.08, 1.05), (0.185, 0.15, 0.12))),
    ('dome', 'head', 'ellipsoid', ((-0.015, -0.07, 1.12), (0.135, 0.13, 0.105))),
    ('face', 'head', 'ellipsoid', ((0.02, -0.13, 1.04), (0.13, 0.085, 0.08))),
    ('cheeks', 'head', 'ellipsoid', ((-0.005, -0.11, 0.97), (0.21, 0.11, 0.075))),
    ('tuft.R', 'head', 'ellipsoid', ((-0.17, -0.11, 0.975), (0.06, 0.07, 0.07))),
    ('tuft.L', 'head', 'ellipsoid', ((0.155, -0.11, 0.98), (0.055, 0.07, 0.07))),
    ('muzzle', 'head', 'cone', ((0.02, -0.15, 1.0), 0.08, (0.10, -0.345, 0.958), 0.02, None)),
    ('ear.R', 'ear', 'cone', ((-0.145, -0.10, 1.15), 0.10, (-0.195, -0.15, 1.33), 0.025,
                               ((0.0, 1.0, 0.0), 1.6))),
    ('ear.L', 'ear', 'cone', ((0.11, -0.10, 1.15), 0.10, (0.165, -0.12, 1.365), 0.025,
                               ((0.0, 1.0, 0.0), 1.6))),
    ('neck', 'body', 'cone', ((0.0, -0.05, 0.78), 0.12, (0.0, -0.09, 0.96), 0.11, None)),
    ('chest', 'body', 'ellipsoid', ((0.0, -0.05, 0.68), (0.15, 0.14, 0.16))),
    ('pelvis', 'body', 'ellipsoid', ((0.0, 0.01, 0.44), (0.155, 0.13, 0.12))),
    ('upper_arm.R', 'arm', 'cone', ((-0.14, -0.05, 0.77), 0.06, (-0.20, -0.08, 0.655), 0.05, None)),
    ('forearm.R', 'arm', 'cone', ((-0.20, -0.08, 0.655), 0.046, (-0.04, -0.28, 0.75), 0.04, None)),
    ('paw.R', 'arm', 'ellipsoid', ((0.0, -0.29, 0.75), (0.055, 0.05, 0.05))),
    ('upper_arm.L', 'arm', 'cone', ((0.14, -0.05, 0.77), 0.065, (0.245, -0.19, 0.67), 0.058, None)),
    ('forearm.L', 'arm', 'cone', ((0.245, -0.19, 0.67), 0.07, (0.37, -0.37, 0.80), 0.06, None)),
    ('paw.L', 'arm', 'ellipsoid', ((0.385, -0.385, 0.83), (0.055, 0.055, 0.085))),
    ('thigh.R', 'leg', 'cone', ((-0.095, -0.03, 0.445), 0.10, (-0.13, -0.27, 0.435), 0.09,
                                 ((0.0, 0.0, 1.0), 1.3))),
    ('thigh.L', 'leg', 'cone', ((0.095, -0.03, 0.445), 0.10, (0.13, -0.24, 0.435), 0.09,
                                 ((0.0, 0.0, 1.0), 1.3))),
    ('shin.R', 'leg', 'cone', ((-0.09, -0.26, 0.40), 0.055, (-0.055, -0.25, 0.13), 0.042, None)),
    ('shin.L', 'leg', 'cone', ((0.10, -0.25, 0.40), 0.055, (0.08, -0.25, 0.13), 0.042, None)),
    ('foot.R', 'leg', 'ellipsoid', ((-0.05, -0.32, 0.075), (0.048, 0.085, 0.042))),
    ('foot.L', 'leg', 'ellipsoid', ((0.075, -0.32, 0.075), (0.048, 0.085, 0.042))),
    ('tail_base', 'tail', 'cone', ((-0.04, 0.10, 0.41), 0.06, (-0.19, 0.13, 0.445), 0.105, None)),
    ('tail_end', 'tail', 'cone', ((-0.19, 0.13, 0.445), 0.105, (-0.31, 0.10, 0.39), 0.085, None)),
]

#: The views (0 front, 1 side, 2 back) that carve each group in phase 3. The three views of the
#: sheet do not agree on all parts: the back view shows a second tail that hangs down behind
#: the chair, hides the lower legs, and holds the violin arm lower. Thus the back view carves
#: only the head and the body, and no view carves the tail. The back view does not carve the
#: ears: with all three views, the ears of the front view lost about 30 mm of height, because
#: the back view shows smaller ears.
CARVE_VIEWS = {'head': (0, 1, 2), 'ear': (0, 1), 'body': (0, 1, 2), 'arm': (0, 1), 'leg': (0, 1),
               'tail': ()}

#: The radius of the smooth union of the parts inside one group, in meters.
BLEND = 0.025

#: The order of the groups in the forms, the radius of the smooth union that joins each group
#: to the groups before it, in meters, and True for a group that the blur skips. The arms join
#: with a small radius, so that a forearm in front of the chest stays a separate surface that
#: the skin can move. The blur skips the ears, because it rounds off their thin tips.
JOINS = [('body', 0.0, False), ('head', 0.03, False), ('leg', 0.02, False),
         ('arm', 0.006, False), ('tail', 0.02, True), ('ear', 0.015, True)]

#: The parts that keep a gap to the body: before the arms join, the forms cut the body back to
#: `SEPARATION` meters from these parts. Without the gap, the forearm in front of the chest
#: fused with the chest, and a raised arm pulled a sheet of chest skin with it. The blur of the
#: forms closes a gap of 15 mm, so the gap is 30 mm.
SEPARATE = ('forearm', 'paw')

#: The gap between the body and the parts of `SEPARATE`, in meters.
SEPARATION = 0.03

#: The growth of each group before the carve, in meters. The arms grow less, so that they stay
#: apart from the body.
GROW = {'head': 0.007, 'ear': 0.01, 'body': 0.015, 'arm': 0.008, 'leg': 0.015, 'tail': 0.0}

#: The box of the voxel grid: the low corner and the high corner, in meters.
BOX = ((-0.50, -0.56, 0.0), (0.50, 0.40, 1.42))


def ellipsoid(p, center, radii):
    """Calculates an approximate signed distance to an ellipsoid (exact on the axes)."""
    q = (p - np.asarray(center, np.float32)) / np.asarray(radii, np.float32)
    return (np.sqrt((q * q).sum(-1)) - 1.0) * float(min(radii))


def cone(p, a, ra, b, rb, flat):
    """Calculates an approximate signed distance to a round cone from `a` to `b`."""
    a = np.asarray(a, np.float32)
    b = np.asarray(b, np.float32)
    if flat:
        axis = np.asarray(flat[0], np.float32)
        axis = axis / np.linalg.norm(axis)
        mid = (a + b) * 0.5
        along = ((p - mid) * axis).sum(-1, keepdims=True)
        p = p + (flat[1] - 1.0) * along * axis
    ab = b - a
    length2 = float((ab * ab).sum())
    t = np.clip(((p - a) * ab).sum(-1) / length2, 0.0, 1.0)
    closest = a + t[..., None] * ab
    radius = ra + (rb - ra) * t
    d = np.sqrt(((p - closest) ** 2).sum(-1)) - radius
    if flat:
        d = d / flat[1]
    return d


def part_sdf(p, part):
    """Calculates the signed distance of the points `p` (..., 3) to one part."""
    _, _, kind, values = part
    if kind == 'ellipsoid':
        return ellipsoid(p, *values)
    return cone(p, *values)


def smooth_min(a, b, k):
    """Joins two distance fields with a polynomial smooth minimum of radius `k`."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def union(p, parts, blend):
    """Calculates the union of parts: a hard union when `blend` is 0, else a smooth union."""
    d = None
    for part in parts:
        e = part_sdf(p, part)
        if d is None:
            d = e
        elif blend > 0:
            d = smooth_min(d, e, blend)
        else:
            d = np.minimum(d, e)
    return d


def grid_points(voxel):
    """Gives the points of the voxel grid (nx, ny, nz, 3) and the low corner."""
    lo = np.asarray(BOX[0], np.float32)
    hi = np.asarray(BOX[1], np.float32)
    n = np.ceil((hi - lo) / voxel).astype(int) + 1
    axes = [lo[i] + voxel * np.arange(n[i], dtype=np.float32) for i in range(3)]
    gx, gy, gz = np.meshgrid(*axes, indexing='ij')
    return np.stack([gx, gy, gz], -1), lo
