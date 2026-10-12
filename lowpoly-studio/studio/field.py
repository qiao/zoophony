"""The body field: parts that blend into one signed distance field, and the lofts from the masks.

numpy only. Model units: the animal is 1 unit tall (sole to ear top). Axes of three.js: x is the
left of the animal, y is up, z is forward.

A template (templates/<name>/body.py) builds the list of parts from the config. This module holds
the generic pieces: the Part, the vertical lofts whose sections come from the sheet masks (front
width, side depth), the sampling of the field on a grid, and the ray onto the surface.
"""

import json
import math

import numpy as np

from studio.sdf import smin


class Part:
    """One blended part of the field: a distance function, its box, and its blend width."""

    def __init__(self, name, fn, lo, hi, k):
        """Stores the distance function, the box corners, and the blend width."""
        self.name = name
        self.fn = fn
        self.lo = np.asarray(lo, float)
        self.hi = np.asarray(hi, float)
        self.k = k


def box_of_points(points, pad):
    """Calculates a box around points, grown by pad."""
    pts = np.asarray(points, float)
    return pts.min(axis=0) - pad, pts.max(axis=0) + pad


def load_profiles(path):
    """Reads the row profiles of the views that studio/intake.py wrote (measure.json)."""
    with open(path) as f:
        return json.load(f)['views']


def central_half_width(profile, y):
    """Returns the half width of the central run near height y, or None."""
    best = None
    for row in profile:
        if abs(row['y'] - y) < 0.0025 and 'central' in row:
            c = row['central']
            best = (c[1] - c[0]) / 2
    return best


def side_edges(profile, y):
    """Returns the back and front z of the widest side run near height y."""
    best = None
    for row in profile:
        if abs(row['y'] - y) < 0.0025 and row['runs']:
            r = max(row['runs'], key=lambda r: r[1] - r[0])
            best = (r[0], r[1])
    return best


def mask_half_width(views, y):
    """Calculates the mean half width of the front and the back masks at height y."""
    vals = [v for v in (central_half_width(views['front']['profile'], y),
                        central_half_width(views['back']['profile'], y)) if v]
    return sum(vals) / len(vals)


def smooth(values, ys, sigma):
    """Smooths a profile along y with a Gaussian of width sigma (the ends are held)."""
    step = ys[1] - ys[0]
    r = int(math.ceil(3 * sigma / step))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) * step / sigma) ** 2)
    k /= k.sum()
    padded = np.concatenate([np.full(r, values[0]), values, np.full(r, values[-1])])
    return np.convolve(padded, k, mode='valid')


def _interp(y, ctrl):
    """Interpolates control points [(height, value), ...] at height y."""
    return np.interp(y, [c[0] for c in ctrl], [c[1] for c in ctrl])


def trunk_table(c, views):
    """Builds the loft table of the trunk from the front, back, and side profiles.

    c: the config section field.trunk. Up to width_measured_to the half width is the mean of the
    front and back masks; above it the arms hide the sides of the trunk, so the width follows
    width_points. Up to front_measured_to the front follows the side mask; above it (the neck)
    it follows front_points. The back follows the hump line of the side view.
    """
    bottom, top, step = c.heights
    ys = np.round(np.arange(bottom, top + step / 50, step), 4)
    side = views['side']['profile']
    a_ctrl = [(c.width_measured_to, mask_half_width(views, c.width_measured_to))]
    a_ctrl += list(c.width_points)
    zf_ctrl = [(c.front_measured_to, side_edges(side, c.front_measured_to)[1])]
    zf_ctrl += list(c.front_points)
    a = np.zeros_like(ys)
    zb = np.zeros_like(ys)
    zf = np.zeros_like(ys)
    for i, y in enumerate(ys):
        if y <= c.width_measured_to:
            a[i] = mask_half_width(views, max(y, c.width_measure_floor))
        else:
            a[i] = _interp(y, a_ctrl)
        back, front = side_edges(side, min(max(y, c.side_measure_floor), top))
        zb[i] = back
        zf[i] = front if y <= c.front_measured_to else _interp(y, zf_ctrl)

    # Smooth the pixel steps of the masks, so the trunk gets no rings.
    a, zb, zf = (smooth(v, ys, c.smooth) for v in (a, zb, zf))

    # Round the bottom. The width shrinks over a longer span than the depth, so the bottom is a
    # keel between the thighs.
    cap_x, cap_z = c.bottom_cap
    zc = 0.5 * (zb + zf)
    for i, y in enumerate(ys):
        if y < bottom + cap_x:
            t = (bottom + cap_x - y) / cap_x
            a[i] *= math.sqrt(max(1.0 - t * t, 0.0))
        if y < bottom + cap_z:
            t = (bottom + cap_z - y) / cap_z
            f = math.sqrt(max(1.0 - t * t, 0.0))
            zb[i] = zc[i] + (zb[i] - zc[i]) * f
            zf[i] = zc[i] + (zf[i] - zc[i]) * f
    # Round the top (inside the head).
    tcap = c.top_cap
    for i, y in enumerate(ys):
        if y > top - tcap:
            t = (y - (top - tcap)) / tcap
            f = math.sqrt(max(1.0 - t * t, 0.0))
            a[i] *= max(f, c.top_cap_min)
            zc_i = 0.5 * (zb[i] + zf[i])
            zb[i] = zc_i + (zb[i] - zc_i) * max(f, c.top_cap_min)
            zf[i] = zc_i + (zf[i] - zc_i) * max(f, c.top_cap_min)
    # The widest point and the powers of the two halves. A power below 2 would make a sharp
    # ridge down the middle of the belly.
    zw = zb + np.interp(ys, [w[0] for w in c.widest], [w[1] for w in c.widest]) * (zf - zb)
    nf = np.interp(ys, [w[0] for w in c.front_power], [w[1] for w in c.front_power])
    nb = np.full_like(ys, c.back_power)
    return {'y': ys, 'a': a, 'zb': zb, 'zf': zf, 'zw': zw, 'nf': nf, 'nb': nb}


def head_table(c, views):
    """Builds the loft table of the head ball.

    c: the config section field.head. The width follows the front and back masks from the cheeks
    to the temples, where the outline is the head. Below the cheeks a quarter ellipse closes the
    head at the chin (bottom), so the head outline is close to a circle; above the temples a
    quarter ellipse makes the dome to the top. The front follows face_points beside the snout,
    then the side mask on the forehead; the back follows back_points, then the side mask.
    """
    ys = np.round(np.arange(c.bottom, c.top + 1e-6, c.step), 4)
    side = views['side']['profile']
    yc, ac = c.cheek
    a_temple = mask_half_width(views, c.temple)
    a = np.zeros_like(ys)
    zb = np.zeros_like(ys)
    zf = np.zeros_like(ys)
    face_end = c.face_points[-1]
    back_end = c.back_points[-1]
    zf_top = side_edges(side, c.forehead_top)[1]
    zb_top = side_edges(side, c.back_top)[0]
    for i, y in enumerate(ys):
        if y <= yc:
            t = (yc - y) / (yc - c.bottom)
            a[i] = ac * math.sqrt(max(1.0 - t * t, 0.0))
        elif y <= c.temple:
            a[i] = mask_half_width(views, y)
        else:
            t = (y - c.temple) / (c.top - c.temple)
            a[i] = a_temple * math.sqrt(max(1.0 - t * t, 0.0))
        if y < face_end[0]:
            zf[i] = float(_interp(y, c.face_points))
        elif y < c.face_join:
            zf[i] = float(_interp(y, [(face_end[0], face_end[1]),
                                      (c.face_join, side_edges(side, c.face_join)[1])]))
        elif y <= c.forehead_top:
            zf[i] = side_edges(side, y)[1]
        else:
            t = (y - c.forehead_top) / (c.top - c.forehead_top)
            zf[i] = c.dome_front + (zf_top - c.dome_front) * math.sqrt(max(1.0 - t * t, 0.0))
        if y < back_end[0]:
            zb[i] = float(_interp(y, c.back_points))
        elif y <= c.back_top:
            zb[i] = float(_interp(y, [(back_end[0], back_end[1]),
                                      (c.back_join, side_edges(side, c.back_join)[0])])) \
                if y < c.back_join else side_edges(side, y)[0]
        else:
            t = (y - c.back_top) / (c.top - c.back_top)
            zb[i] = c.dome_back + (zb_top - c.dome_back) * math.sqrt(max(1.0 - t * t, 0.0))
    # The dome: above the cap the width and the depth shrink together, as on an ellipsoid, so the
    # top is round. (A width that closed before the depth left a thin ridge on the crown, and the
    # faces across it pointed into the head.)
    k = int(np.searchsorted(ys, c.cap))
    zc = 0.5 * (zb[k] + zf[k])
    for i in range(k, len(ys)):
        t = (ys[i] - c.cap) / (c.top - c.cap)
        f = math.sqrt(max(1.0 - t * t, 0.0))
        a[i] = a[k] * f
        zf[i] = zc + (zf[k] - zc) * f
        zb[i] = zc - (zc - zb[k]) * f
    a, zb, zf = (smooth(v, ys, c.smooth) for v in (a, zb, zf))
    a[0] = 0.0
    a[-1] = 0.0
    zw = zb + c.widest * (zf - zb)
    return {'y': ys, 'a': a, 'zb': zb, 'zf': zf, 'zw': zw,
            'nf': np.full_like(ys, c.front_power), 'nb': np.full_like(ys, c.back_power)}


def field_on_grid(parts, step):
    """Samples the blended field on a grid that is symmetric about x = 0.

    Returns (field, origin, step).
    """
    lo = np.min([p.lo for p in parts], axis=0)
    hi = np.max([p.hi for p in parts], axis=0)
    half_x = max(abs(lo[0]), abs(hi[0]))
    nx = int(math.ceil(half_x / step)) * 2 + 1
    origin = np.array([-(nx - 1) / 2 * step, lo[1] - step, lo[2] - step])
    ny = int(math.ceil((hi[1] - origin[1]) / step)) + 2
    nz = int(math.ceil((hi[2] - origin[2]) / step)) + 2
    field = np.full((nx, ny, nz), 1.0, np.float32)
    for part in parts:
        pad = part.k + 2 * step
        i0 = np.maximum(np.floor((part.lo - pad - origin) / step).astype(int), 0)
        i1 = np.minimum(np.ceil((part.hi + pad - origin) / step).astype(int) + 1, [nx, ny, nz])
        xs = origin[0] + step * np.arange(i0[0], i1[0])
        ys = origin[1] + step * np.arange(i0[1], i1[1])
        zs = origin[2] + step * np.arange(i0[2], i1[2])
        P = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), axis=-1)
        d = part.fn(P).astype(np.float32)
        sub = (slice(i0[0], i1[0]), slice(i0[1], i1[1]), slice(i0[2], i1[2]))
        field[sub] = smin(field[sub], d, part.k) if part.k > 0 else np.minimum(field[sub], d)
    return field, origin, step


def field_at(parts, points):
    """Evaluates the blended field at any points (n, 3)."""
    pts = np.asarray(points, float)
    out = np.full(pts.shape[:-1], 1.0)
    for part in parts:
        d = part.fn(pts)
        out = smin(out, d, part.k) if part.k > 0 else np.minimum(out, d)
    return out


def field_gradient(parts, points, eps):
    """Calculates the central difference of the field at points (not normalized)."""
    return np.stack([field_at(parts, points + eps * e) - field_at(parts, points - eps * e)
                     for e in np.eye(3)], axis=1)


def surface_along(parts, start, direction, length=0.3, samples=600):
    """Finds the first surface point on a ray from start along direction."""
    start = np.asarray(start, float)
    direction = np.asarray(direction, float)
    direction = direction / np.linalg.norm(direction)
    ts = np.linspace(0.0, length, samples)
    pts = start + ts[:, None] * direction
    d = field_at(parts, pts)
    inside = np.nonzero(d < 0)[0]
    if len(inside) == 0:
        raise ValueError('the ray does not meet the surface')
    i = inside[0]
    t0, t1 = ts[i - 1], ts[i]
    d0, d1 = d[i - 1], d[i]
    t = t0 + (t1 - t0) * d0 / (d0 - d1)
    return start + t * direction
