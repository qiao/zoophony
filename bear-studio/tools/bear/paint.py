"""Face colors of the low-poly body: the palette of the sheet, the regions, and baked occlusion.

numpy only. The inputs are face centers and face normals in three.js axes, in the pose of the
mesh. The colors are sRGB in 0..1.
"""

import math

import numpy as np

import body

# The palette, measured as median colors of lit regions of the sheet and then tuned so that the
# renders of the viewer match the mean color of the sheet (tools/shoot.mjs compare).
PALETTE = {
    'fur': (117, 70, 38),
    'belly': (141, 88, 51),
    'muzzle': (214, 164, 108),
}



# The share of the baked occlusion that the faces of the arms keep.
ARM_AO = 0.3

ARM_PARTS = ('upper_arm', 'deltoid', 'forearm', 'forearm_bulge', 'paw')


# How much darker the underside of the belly is, at height 0.2 and below (0.2 = 20%).
UNDER_DARK = 0.08


def _rgb(name):
    """Returns a palette color as floats 0..1."""
    return np.array(PALETTE[name], float) / 255.0


def _smoothstep(e0, e1, x):
    """Calculates the smooth step from e0 to e1."""
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def occlusion(all_parts, centers, normals, rays=24, reach=0.16, steps=7, seed=3):
    """Bakes ambient occlusion: the part of the hemisphere above each face that the body blocks.

    The field is sampled along rays from each face center. A ray is blocked when the field goes
    below zero. The arms move, so the occlusion does not mix the arms and the rest: a face of
    an arm is blocked only by its own arm, and any other face only by the body without the arms.
    (In the bind pose the raised forearms lie against the trunk, and the inner arm would stay
    dark in every other pose.) The ground blocks no rays (the viewer draws the shadow on the
    ground, and the feet of the sheet are lit to the sole).
    Returns values 0 (open) to 1 (closed).
    """
    rest = [p for p in all_parts if p.name not in ARM_PARTS]
    arms = {s: [p for p in all_parts if p.name in ARM_PARTS and np.sign(p.lo[0] + p.hi[0]) == s]
            for s in (1.0, -1.0)}
    d_rest = body.field_at(rest, centers)
    out = occlusion_by(rest, centers, normals, rays, reach, steps, seed)
    for s, arm in arms.items():
        own = body.field_at(arm, centers) < d_rest
        if own.any():
            # The elbow is bent more in the bind pose than in most poses, so the arm keeps
            # only a light part of its own occlusion.
            out[own] = ARM_AO * occlusion_by(arm, centers[own], normals[own], rays, reach,
                                             steps, seed)
    return out


def occlusion_by(parts, centers, normals, rays, reach, steps, seed):
    """Bakes the occlusion of faces by one set of parts (see occlusion)."""
    rng = np.random.default_rng(seed)
    dirs = rng.normal(size=(rays, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    n = len(centers)
    blocked = np.zeros(n)
    weight_sum = np.zeros(n)
    ts = reach * (np.arange(1, steps + 1) / steps) ** 1.5
    # The flat facets cut the smooth surface, so the center of a facet on a concave place can
    # lie inside the body. Each ray starts outside: 0.004 above the surface, along the normal.
    start = centers + normals * 0.006
    for _ in range(3):
        depth = body.field_at(parts, start)
        start = start + normals * np.clip(0.004 - depth, 0.0, 0.03)[:, None]
    for d in dirs:
        cos = normals @ d
        dd = np.where(cos[:, None] < 0, d - 2 * cos[:, None] * normals, d)
        cos = np.abs(cos)
        hit = np.zeros(n, bool)
        for t in ts:
            hit |= body.field_at(parts, start + dd * t) < 0
        blocked += hit * cos
        weight_sum += cos
    return blocked / np.maximum(weight_sum, 1e-6)


def face_colors(parts, centers, normals, corners):
    """Colors each face of the body: fur, belly, muzzle, brows, and baked occlusion.

    corners: the three corners of each face (n, 3, 3). The ears and the tail are details
    (details.ears_and_tail) with colors of their own.
    """
    n = len(centers)
    col = np.tile(_rgb('fur'), (n, 1))
    x, y, z = centers[:, 0], centers[:, 1], centers[:, 2]

    # A lighter upper belly: a soft ellipse on the front of the trunk, centered at the height of
    # the brightest belly rows of the sheet (0.55).
    e = np.hypot(x / 0.17, (y - 0.54) / 0.15)
    belly = (1 - _smoothstep(0.2, 1.2, e)) * _smoothstep(-0.1, 0.6, normals[:, 2]) * (z > -0.05)
    col = col * (1 - belly[:, None]) + _rgb('belly') * belly[:, None]

    # A darker lower belly and underside: the sheet gets darker from height 0.45 down to 0.2.
    under = _smoothstep(0.45, 0.2, y) * (y > 0.12)
    col = col * (1.0 - UNDER_DARK * under)[:, None]

    # The tan muzzle: the faces on the snout capsule (near its surface, in front of z 0.17).
    # From the front this is a round disk 0.12 wide, and from the side it reaches back to the
    # base of the snout, as on the sheet.
    near = np.abs(body.snout(corners.reshape(-1, 3))).reshape(-1, 3) < 0.018
    muzzle = near.all(axis=1) & (corners[:, :, 2].min(axis=1) > 0.16)
    col[muzzle] = _rgb('muzzle')

    # Slightly darker brows above the eyes.
    ex, ey = body.HEAD['eye']
    for side in (1, -1):
        d = np.hypot((x - side * (ex + 0.004)) / 0.026, (y - (ey + 0.022)) / 0.010)
        brow = (d < 1.0) & (z > 0.12)
        col[brow] = col[brow] * 0.85

    # Baked occlusion. There is no random value jitter: the shading of the facets gives the
    # variation, as on the sheet.
    ao = occlusion(parts, centers, normals)
    shade = 1.0 - 0.6 * _smoothstep(0.05, 0.6, ao)
    col = col * shade[:, None]
    return np.clip(col, 0.0, 1.0), ao


def edge_quartiles(verts, faces, height_px=528):
    """Calculates the first and the third quartile of the triangle edge length, in sheet px."""
    tri = verts[faces]
    e = np.linalg.norm(tri - np.roll(tri, 1, axis=1), axis=2).ravel() * height_px
    return float(np.percentile(e, 25)), float(np.percentile(e, 75))


def facet_stats(verts, faces, height_px=528):
    """Calculates the median edge length of the triangles, in sheet pixels."""
    tri = verts[faces]
    e = np.linalg.norm(tri - np.roll(tri, 1, axis=1), axis=2).ravel()
    return float(np.median(e) * height_px), float(math.sqrt(np.mean(e * e)) * height_px)
