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
    'fur': (110, 66, 37),
    'belly': (134, 84, 50),
    'muzzle': (214, 164, 108),
}



ARM_PARTS = ('upper_arm', 'deltoid', 'forearm', 'forearm_bulge', 'paw')


def _rgb(name):
    """Returns a palette color as floats 0..1."""
    return np.array(PALETTE[name], float) / 255.0


def _smoothstep(e0, e1, x):
    """Calculates the smooth step from e0 to e1."""
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def occlusion(parts, centers, normals, rays=24, reach=0.16, steps=7, seed=3):
    """Bakes ambient occlusion: the part of the hemisphere above each face that the body blocks.

    The field is sampled along rays from each face center. A ray is blocked when the field goes
    below zero. The arms move, so they block no rays. The ground blocks no rays either (the
    viewer draws the shadow on the ground, and the feet of the sheet are lit to the sole).
    Returns values 0 (open) to 1 (closed).
    """
    parts = [p for p in parts if p.name not in ARM_PARTS]
    rng = np.random.default_rng(seed)
    dirs = rng.normal(size=(rays, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    n = len(centers)
    blocked = np.zeros(n)
    weight_sum = np.zeros(n)
    ts = reach * (np.arange(1, steps + 1) / steps) ** 1.5
    for d in dirs:
        cos = normals @ d
        dd = np.where(cos[:, None] < 0, d - 2 * cos[:, None] * normals, d)
        cos = np.abs(cos)
        start = centers + normals * 0.006
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

    # A lighter belly and chest: a soft ellipse on the front of the trunk.
    e = np.hypot(x / 0.17, (y - 0.47) / 0.22)
    belly = (1 - _smoothstep(0.55, 1.05, e)) * _smoothstep(0.0, 0.5, normals[:, 2]) * (z > 0)
    col = col * (1 - belly[:, None]) + _rgb('belly') * belly[:, None]

    # The tan muzzle: the faces on the snout capsule (near its surface, in front of z 0.17).
    # From the front this is a round disk 0.12 wide, and from the side it reaches back to the
    # base of the snout, as on the sheet.
    near = np.abs(body.snout(corners.reshape(-1, 3))).reshape(-1, 3) < 0.012
    muzzle = near.all(axis=1) & (corners[:, :, 2].min(axis=1) > 0.165)
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
