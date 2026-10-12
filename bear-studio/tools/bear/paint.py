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
    'fur': (120, 77, 52),
    'belly': (146, 94, 61),
    'muzzle': (214, 164, 108),
    'ear_inner': (96, 54, 33),
    'brow': (110, 68, 42),
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
    below zero, or when it goes below the ground. The arms move, so they block no rays.
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
            pts = start + dd * t
            hit |= (body.field_at(parts, pts) < 0) | (pts[:, 1] < 0)
        blocked += hit * cos
        weight_sum += cos
    return blocked / np.maximum(weight_sum, 1e-6)


def face_colors(parts, centers, normals, seed=7):
    """Colors each face of the body: fur, belly, muzzle, inner ears, occlusion, and jitter."""
    rng = np.random.default_rng(seed)
    n = len(centers)
    col = np.tile(_rgb('fur'), (n, 1))
    x, y, z = centers[:, 0], centers[:, 1], centers[:, 2]

    # A lighter belly and chest: forward faces near the middle.
    belly = (_smoothstep(0.1, 0.6, normals[:, 2]) * (1 - _smoothstep(0.08, 0.2, np.abs(x)))
             * _smoothstep(0.22, 0.32, y) * (1 - _smoothstep(0.62, 0.72, y)))
    col = col * (1 - belly[:, None]) + _rgb('belly') * belly[:, None]

    # The tan muzzle: inside a grown copy of the muzzle ellipsoid, in front of the eyes, and
    # below the eyes. The chin under the snout is tan too, as on the sheet.
    c, r = body.HEAD['muzzle']
    q = (centers - np.array(c)) / (np.array(r) * np.array([1.08, 1.25, 1.2]))
    inside = np.sum(q * q, axis=1) < 1.0
    front = z > 0.165
    muzzle = inside & front & (y < c[1] + 0.048)
    col[muzzle] = _rgb('muzzle')

    # The inner ears: the front faces of the ear hollow.
    for side in (1, -1):
        ec, er = body.HEAD['ear']
        ec = np.array(ec) * np.array([side, 1, 1])
        f = body.ear_frame(side)
        local = (centers - ec) @ f
        near = np.sum((local / np.array([0.032, 0.032, 0.03])) ** 2, axis=1) < 1.0
        facing = normals @ f[:, 2] > 0.35
        inner = near & facing & (local[:, 1] < 0.02)
        col[inner] = _rgb('ear_inner')

    # Darker brows above the eyes.
    ex, ey = body.HEAD['eye']
    for side in (1, -1):
        d = np.hypot((x - side * (ex + 0.004)) / 0.026, (y - (ey + 0.024)) / 0.010)
        brow = (d < 1.0) & (z > 0.12)
        col[brow] = col[brow] * 0.78

    # Baked occlusion and a small value jitter of each facet.
    ao = occlusion(parts, centers, normals)
    shade = 1.0 - 0.6 * _smoothstep(0.05, 0.6, ao)
    jitter = rng.uniform(0.95, 1.05, n)
    col = col * (shade * jitter)[:, None]
    return np.clip(col, 0.0, 1.0), ao


def facet_stats(verts, faces, height_px=528):
    """Calculates the median edge length of the triangles, in sheet pixels."""
    tri = verts[faces]
    e = np.linalg.norm(tri - np.roll(tri, 1, axis=1), axis=2).ravel()
    return float(np.median(e) * height_px), float(math.sqrt(np.mean(e * e)) * height_px)
