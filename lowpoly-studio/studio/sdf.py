"""Signed distance primitives, smooth blends, and a surface-nets mesher (numpy only).

All points are numpy arrays of shape (..., 3) in model units (three.js axes: x left of the
animal, y up, z forward). A negative distance is inside.
"""

import numpy as np


def smin(a, b, k):
    """Blends two distances into a smooth union with the blend width k."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def smax(a, b, k):
    """Blends two distances into a smooth intersection with the blend width k."""
    return -smin(-a, -b, k)


def rot_axis(axis, angle):
    """Makes a 3x3 rotation matrix from an axis and an angle in radians."""
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    x, y, z = axis
    c, s = np.cos(angle), np.sin(angle)
    C = 1 - c
    return np.array([
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ])


def frame_from(y_axis, z_hint):
    """Makes an orthonormal frame (columns x, y, z) whose y column follows y_axis."""
    y = np.asarray(y_axis, float)
    y = y / np.linalg.norm(y)
    z = np.asarray(z_hint, float)
    z = z - y * np.dot(z, y)
    z = z / np.linalg.norm(z)
    x = np.cross(y, z)
    return np.stack([x, y, z], axis=1)


def ellipsoid(p, center, radii, rot=None):
    """Approximates the distance to an ellipsoid (inigo quilez bound)."""
    q = p - np.asarray(center, float)
    if rot is not None:
        q = q @ np.asarray(rot, float)
    r = np.asarray(radii, float)
    k0 = np.linalg.norm(q / r, axis=-1)
    k1 = np.linalg.norm(q / (r * r), axis=-1)
    return np.where(k1 > 1e-9, k0 * (k0 - 1.0) / np.maximum(k1, 1e-9), -np.min(r))


def round_cone(p, a, b, r1, r2, squash=None):
    """Calculates the distance to a cone with round ends from point a (radius r1) to b (r2).

    squash: optional (z_hint, factor). The cross-section is stretched by factor along the
    direction z_hint (made normal to the axis), so the limb gets an oval section.
    """
    a = np.asarray(a, float)
    b = np.asarray(b, float)
    q = p
    scale = 1.0
    if squash is not None:
        hint, factor = squash
        axis = (b - a) / np.linalg.norm(b - a)
        d = np.asarray(hint, float) - axis * np.dot(hint, axis)
        d = d / np.linalg.norm(d)
        rel = p - a
        along = rel @ d
        q = p - np.outer(along.ravel(), d).reshape(p.shape) * (1.0 - 1.0 / factor)
        scale = min(1.0, factor)
    ba = b - a
    l2 = float(np.dot(ba, ba))
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = q - a
    y = pa @ ba
    z = y - l2
    w = pa * l2 - y[..., None] * ba
    x2 = np.sum(w * w, axis=-1)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d_end = np.sqrt(x2 + z2) * il2 - r2
    d_start = np.sqrt(x2 + y2) * il2 - r1
    d_side = (np.sqrt(np.maximum(x2 * a2 * il2, 0.0)) + y * rr) * il2 - r1
    out = np.where(np.sign(y) * a2 * y2 < k, d_start, d_side)
    out = np.where(np.sign(z) * a2 * z2 > k, d_end, out)
    return out * scale


def loft(p, table):
    """Calculates the distance to a vertical loft of egg-shaped superellipse sections.

    table: dict of numpy arrays over the heights 'y': 'a' (half width in x), 'zb' (back z),
    'zf' (front z), 'zw' (the z of the widest x), 'nf' and 'nb' (the superellipse powers of
    the front half and of the back half; a power below 2 makes a pointed half).
    """
    ys = table['y']
    py = p[..., 1]
    a = np.interp(py, ys, table['a'])
    zb = np.interp(py, ys, table['zb'])
    zf = np.interp(py, ys, table['zf'])
    zw = np.interp(py, ys, table['zw'])
    dz = p[..., 2] - zw
    n = np.where(dz > 0, np.interp(py, ys, table['nf']), np.interp(py, ys, table['nb']))
    bz = np.where(dz > 0, zf - zw, zw - zb)
    a = np.maximum(a, 1e-4)
    bz = np.maximum(bz, 1e-4)
    u = np.abs(p[..., 0]) / a
    v = np.abs(dz) / bz
    r = (u ** n + v ** n) ** (1.0 / n)
    d = (r - 1.0) * np.minimum(a, bz)
    d = np.maximum(d, ys[0] - py)
    return np.maximum(d, py - ys[-1])


def surface_nets(field, origin, step):
    """Extracts the zero surface of a grid field as quads (naive surface nets).

    Returns (vertices (n, 3), quads (m, 4)), with outward winding (counterclockwise seen
    from outside).
    """
    f = field
    nx, ny, nz = f.shape
    inside = f < 0
    acc = np.zeros((nx - 1, ny - 1, nz - 1, 3), np.float32)
    cnt = np.zeros((nx - 1, ny - 1, nz - 1), np.float32)

    def edges(axis):
        sl0 = [slice(None)] * 3
        sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1)
        sl1[axis] = slice(1, None)
        f0 = f[tuple(sl0)]
        f1 = f[tuple(sl1)]
        cross = inside[tuple(sl0)] != inside[tuple(sl1)]
        t = np.where(cross, f0 / np.where(cross, f0 - f1, 1.0), 0.0).astype(np.float32)
        return cross, t, inside[tuple(sl0)]

    crosses = []
    for axis in range(3):
        cross, t, low_in = edges(axis)
        crosses.append((cross, low_in))
        others = [o for o in range(3) if o != axis]
        for d0 in (0, 1):
            for d1 in (0, 1):
                sl = [slice(None)] * 3
                sl[others[0]] = slice(d0, d0 + [nx, ny, nz][others[0]] - 1)
                sl[others[1]] = slice(d1, d1 + [nx, ny, nz][others[1]] - 1)
                c = cross[tuple(sl)].astype(np.float32)
                acc[..., axis] += c * t[tuple(sl)]
                acc[..., others[0]] += c * d0
                acc[..., others[1]] += c * d1
                cnt += c

    active = cnt > 0
    vid = np.full(active.shape, -1, np.int64)
    idx = np.nonzero(active)
    vid[idx] = np.arange(len(idx[0]))
    rel = acc[idx] / cnt[idx][:, None]
    verts = np.asarray(origin, float) + step * (np.stack(idx, axis=1) + rel)

    quads = []
    for axis in range(3):
        cross, low_in = crosses[axis]
        o0, o1 = [(1, 2), (2, 0), (0, 1)][axis]
        e = np.nonzero(cross)
        e = [arr for arr in e]
        keep = (e[o0] >= 1) & (e[o0] <= f.shape[o0] - 2) & (e[o1] >= 1) & (e[o1] <= f.shape[o1] - 2)
        e = [arr[keep] for arr in e]
        flip = low_in[tuple(e)]
        corners = []
        for a, b in ((0, 0), (1, 0), (1, 1), (0, 1)):
            c = [arr.copy() for arr in e]
            c[o0] = c[o0] - 1 + a
            c[o1] = c[o1] - 1 + b
            corners.append(vid[tuple(c)])
        q = np.stack(corners, axis=1)
        q[~flip] = q[~flip][:, ::-1]
        quads.append(q)
    quads = np.concatenate(quads, axis=0)
    return verts, quads
