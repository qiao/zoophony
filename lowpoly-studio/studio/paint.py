"""Face colors of the low-poly body: the palette of the sheet, the regions, and baked occlusion.

numpy only. The inputs are face centers and face normals in three.js axes, in the pose of the
mesh. The colors are sRGB in 0..1. The config section paint gives the palette, the regions, and
the occlusion.
"""

import math

import numpy as np

from studio.field import field_at


def smoothstep(e0, e1, x):
    """Calculates the smooth step from e0 to e1."""
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rgb(palette, name):
    """Returns a palette color as floats 0..1."""
    return np.array(palette[name], float) / 255.0


def occlusion(body, all_parts, centers, normals, c):
    """Bakes ambient occlusion: the part of the hemisphere above each face that the body blocks.

    The field is sampled along rays from each face center. A ray is blocked when the field goes
    below zero. The moving part groups of the template (the arms) do not mix with the rest: a
    face of an arm is blocked only by its own arm, and any other face only by the body without
    the arms. (In the bind pose the raised forearms lie against the trunk, and the inner arm
    would stay dark in every other pose.) The ground blocks no rays.
    c: the config section paint.occlusion. Returns values 0 (open) to 1 (closed).
    """
    rest, arms = body.moving_groups(all_parts)
    d_rest = field_at(rest, centers)
    out = occlusion_by(rest, centers, normals, c)
    for s, arm in arms.items():
        own = field_at(arm, centers) < d_rest
        if own.any():
            # The elbow is bent more in the bind pose than in most poses, so the arm keeps only a
            # light part of its own occlusion.
            out[own] = c.moving * occlusion_by(arm, centers[own], normals[own], c)
    return out


def occlusion_by(parts, centers, normals, c):
    """Bakes the occlusion of faces by one set of parts (see occlusion)."""
    rng = np.random.default_rng(c.seed)
    dirs = rng.normal(size=(c.rays, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    n = len(centers)
    blocked = np.zeros(n)
    weight_sum = np.zeros(n)
    ts = c.reach * (np.arange(1, c.steps + 1) / c.steps) ** 1.5
    # The flat facets cut the smooth surface, so the center of a facet on a concave place can lie
    # inside the body. Each ray starts outside: 0.004 above the surface, along the normal.
    start = centers + normals * 0.006
    for _ in range(3):
        depth = field_at(parts, start)
        start = start + normals * np.clip(0.004 - depth, 0.0, 0.03)[:, None]
    for d in dirs:
        cos = normals @ d
        dd = np.where(cos[:, None] < 0, d - 2 * cos[:, None] * normals, d)
        cos = np.abs(cos)
        hit = np.zeros(n, bool)
        for t in ts:
            hit |= field_at(parts, start + dd * t) < 0
        blocked += hit * cos
        weight_sum += cos
    return blocked / np.maximum(weight_sum, 1e-6)


def face_colors(cfg, body, parts, centers, normals, corners):
    """Colors each face of the body: fur, belly, underside, muzzle, and baked occlusion.

    corners: the three corners of each face (n, 3, 3). The ears and the tail are details with
    colors of their own. There is no random value jitter: the shading of the facets gives the
    variation, as on the sheet.
    """
    p = cfg.paint
    n = len(centers)
    col = np.tile(rgb(p.palette, 'fur'), (n, 1))
    x, y, z = centers[:, 0], centers[:, 1], centers[:, 2]

    # A lighter belly: a soft ellipse on the front of the trunk.
    b = p.belly
    e = np.hypot(x / b.radii[0], (y - b.center_y) / b.radii[1])
    belly = ((1 - smoothstep(b.edge[0], b.edge[1], e))
             * smoothstep(b.facing[0], b.facing[1], normals[:, 2]) * (z > b.min_z))
    col = col * (1 - belly[:, None]) + rgb(p.palette, 'belly') * belly[:, None]

    # A darker lower belly and underside.
    u = p.under
    under = smoothstep(u.heights[0], u.heights[1], y) * (y > u.floor)
    col = col * (1.0 - u.dark * under)[:, None]

    # The muzzle: the faces whose corners all lie near the snout cone and its base, down to the
    # chin. The soft front fill of the sheet keeps the lower muzzle light, so the faces that point
    # down get lighter.
    m = p.muzzle
    near = np.abs(body.part_distance(m.part, corners.reshape(-1, 3))).reshape(-1, 3) < m.near
    muzzle = (near.all(axis=1) & (corners[:, :, 2].min(axis=1) > m.min_z)
              & (corners[:, :, 1].min(axis=1) > m.min_y))
    lift = 1.0 + m.lift * np.clip(-normals[:, 1], 0.0, 1.0)
    col[muzzle] = np.clip(rgb(p.palette, 'muzzle')[None, :] * lift[muzzle, None], 0.0, 1.0)

    # Baked occlusion. The muzzle of the sheet is lit down to the chin, so it keeps only a little.
    o = p.occlusion
    ao = occlusion(body, parts, centers, normals, o)
    shade = 1.0 - o.strength * smoothstep(o.ramp[0], o.ramp[1], ao)
    shade[muzzle] = 1.0 - m.occlusion * smoothstep(o.ramp[0], o.ramp[1], ao[muzzle])
    col = col * shade[:, None]
    return np.clip(col, 0.0, 1.0), ao


def edge_quartiles(verts, faces, height_px):
    """Calculates the first and the third quartile of the triangle edge length, in sheet px."""
    tri = verts[faces]
    e = np.linalg.norm(tri - np.roll(tri, 1, axis=1), axis=2).ravel() * height_px
    return float(np.percentile(e, 25)), float(np.percentile(e, 75))


def facet_stats(verts, faces, height_px):
    """Calculates the median edge length of the triangles, in sheet pixels."""
    tri = verts[faces]
    e = np.linalg.norm(tri - np.roll(tri, 1, axis=1), axis=2).ravel()
    return float(np.median(e) * height_px), float(math.sqrt(np.mean(e * e)) * height_px)
