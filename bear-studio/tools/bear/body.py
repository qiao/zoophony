"""The bear body: measured parts that blend into one signed distance field (numpy only).

Model units: the bear is 1 unit tall (sole to ear top). Axes of three.js: x is the left of
the bear, y is up, z is forward. All parts of the right side are mirrors of the left side.

The trunk is a loft whose sections come from the reference masks (front width, side depth).
The head, the limbs, the ears, and the tail are measured primitives. The arms are built in a
pose: 'reference' (the arms hang as on the sheet) or 'bind' (the arms are raised to the middle
of the conducting range, so that skinning bends them less).
"""

import json
import math
import os

import numpy as np

from sdf import ellipsoid, frame_from, loft, rot_axis, round_cone, smax, smin

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

# Joints of the left arm in the reference pose (measured on the front and side views).
ARM_REF = {
    'clavicle': (0.035, 0.70, 0.045),
    'shoulder': (0.16, 0.662, 0.015),
    'elbow': (0.271, 0.50, -0.025),
    'wrist': (0.331, 0.40, 0.045),
    'knuckle': (0.344, 0.335, 0.07),
}

# The deltoid bulge of the upper arm: the center in the upper arm frame, and the radii.
DELTOID = ((0.02, -0.07, 0.0), (0.066, 0.08, 0.07))

# The palm of the left paw faces the body and a little backward on the sheet.
PALM_REF = (-0.86, 0.0, -0.51)

# The bind pose of the arms: the rotations from the reference pose (degrees).
BIND = {'shoulder_flex': 40.0, 'shoulder_abduct': 10.0, 'elbow_flex': 25.0}

# Joints of the left leg (the same in all poses).
LEG = {
    'hip': (0.115, 0.30, 0.0),
    'knee': (0.125, 0.165, 0.012),
    'ankle': (0.133, 0.07, -0.01),
    'ball': (0.142, 0.03, 0.085),
    'toe': (0.146, 0.025, 0.13),
}

# Spine joints (x = 0).
SPINE = {
    'hips': (0.30, -0.035),
    'spine': (0.42, -0.04),
    'spine1': (0.54, -0.035),
    'chest': (0.64, -0.025),
    'neck': (0.75, -0.005),
    'head': (0.81, 0.03),
    'head_end': (0.99, 0.05),
}

HEAD = {
    'cranium': ((0.0, 0.878, 0.10), (0.112, 0.09, 0.105)),
    'jowls': ((0.0, 0.822, 0.075), (0.152, 0.07, 0.115)),
    'muzzle': ((0.0, 0.83, 0.2), (0.068, 0.06, 0.08)),
    'ear': ((0.087, 0.962, 0.06), (0.035, 0.035, 0.017)),
    'ear_yaw': 25.0,
    'eye': (0.043, 0.889),
    'eye_radius': 0.0155,
    'nose': (0.0, 0.842),
}

TAIL = ((0.0, 0.255, -0.14), (0.032, 0.036, 0.026))


def load_profiles():
    """Reads the row profiles that tools/measure.py wrote."""
    with open(os.path.join(ROOT, 'out', 'measure.json')) as f:
        return json.load(f)['views']


def _central_half_width(profile, y):
    """Returns the half width of the central run near height y, or None."""
    best = None
    for row in profile:
        if abs(row['y'] - y) < 0.0025 and 'central' in row:
            c = row['central']
            best = (c[1] - c[0]) / 2
    return best


def _side_edges(profile, y):
    """Returns the back and front z of the widest side run near height y."""
    best = None
    for row in profile:
        if abs(row['y'] - y) < 0.0025 and row['runs']:
            r = max(row['runs'], key=lambda r: r[1] - r[0])
            best = (r[0], r[1])
    return best


def trunk_table(views):
    """Builds the loft table of the trunk from the front, back, and side profiles."""
    ys = np.round(np.arange(0.150, 0.8851, 0.005), 4)
    # Above y 0.45 the arms hide the sides of the trunk, so the width follows control points.
    a_ctrl = [(0.45, None), (0.475, 0.2036), (0.52, 0.199), (0.58, 0.193), (0.64, 0.183),
              (0.70, 0.168), (0.76, 0.150), (0.82, 0.128), (0.885, 0.09)]
    zf_ctrl = [(0.74, None), (0.78, 0.18), (0.82, 0.14), (0.885, 0.08)]
    a = np.zeros_like(ys)
    zb = np.zeros_like(ys)
    zf = np.zeros_like(ys)

    def measured_a(y):
        vals = [v for v in (_central_half_width(views['front']['profile'], y),
                            _central_half_width(views['back']['profile'], y)) if v]
        return sum(vals) / len(vals)

    a_ctrl[0] = (0.45, measured_a(0.45))
    zf_ctrl[0] = (0.74, _side_edges(views['side']['profile'], 0.74)[1])
    for i, y in enumerate(ys):
        if y <= 0.45:
            a[i] = measured_a(max(y, 0.24))
        else:
            a[i] = np.interp(y, [c[0] for c in a_ctrl], [c[1] for c in a_ctrl])
        back, front = _side_edges(views['side']['profile'], min(max(y, 0.2), 0.885))
        zb[i] = back
        zf[i] = front if y <= 0.74 else np.interp(y, [c[0] for c in zf_ctrl],
                                                     [c[1] for c in zf_ctrl])

    # Smooth the pixel steps of the masks, so the trunk gets no rings.
    a, zb, zf = (smooth(v, ys, 0.012) for v in (a, zb, zf))

    # Round the bottom: the crotch is at y 0.153 on the front view. The width shrinks over a
    # longer span than the depth, so the bottom is a keel between the thighs.
    bottom, cap_x, cap_z = 0.150, 0.07, 0.075
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
    top, tcap = 0.885, 0.04
    for i, y in enumerate(ys):
        if y > top - tcap:
            t = (y - (top - tcap)) / tcap
            f = math.sqrt(max(1.0 - t * t, 0.0))
            a[i] *= max(f, 0.05)
            zc_i = 0.5 * (zb[i] + zf[i])
            zb[i] = zc_i + (zb[i] - zc_i) * max(f, 0.05)
            zf[i] = zc_i + (zf[i] - zc_i) * max(f, 0.05)
    # The widest point of the low belly is far back, so the front half is a long half
    # ellipse: a round pot belly over the legs, as on the sheet. The back is broad. A power
    # below 2 would make a sharp ridge down the middle of the belly.
    zw = zb + np.interp(ys, [0.15, 0.3, 0.45], [0.28, 0.36, 0.45]) * (zf - zb)
    nf = np.interp(ys, [0.15, 0.45, 0.6], [2.0, 2.1, 2.2])
    nb = np.full_like(ys, 2.35)
    return {'y': ys, 'a': a, 'zb': zb, 'zf': zf, 'zw': zw, 'nf': nf, 'nb': nb}


def smooth(values, ys, sigma):
    """Smooths a profile along y with a Gaussian of width sigma (the ends are held)."""
    step = ys[1] - ys[0]
    r = int(math.ceil(3 * sigma / step))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) * step / sigma) ** 2)
    k /= k.sum()
    padded = np.concatenate([np.full(r, values[0]), values, np.full(r, values[-1])])
    return np.convolve(padded, k, mode='valid')


def mirror(v):
    """Mirrors a point to the right side of the bear."""
    return np.array([-v[0], v[1], v[2]])


def arm_pose(pose):
    """Calculates the joints and the bone frames of the left arm in a pose.

    Returns a dict of joint positions and a dict of 3x3 frames (columns x, y, z, with y
    along the bone) for 'upper', 'fore', and 'hand'.
    """
    S = np.array(ARM_REF['shoulder'])
    E = np.array(ARM_REF['elbow'])
    W = np.array(ARM_REF['wrist'])
    K = np.array(ARM_REF['knuckle'])
    fwd = np.array([0.0, 0.0, 1.0])
    frames = {
        'upper': frame_from(E - S, fwd),
        'fore': frame_from(W - E, fwd),
        'hand': frame_from(K - W, PALM_REF),
    }
    if pose == 'bind':
        r1 = rot_axis((0, 0, 1), math.radians(BIND['shoulder_abduct'])) @ \
            rot_axis((1, 0, 0), -math.radians(BIND['shoulder_flex']))
        E2 = S + r1 @ (E - S)
        W1 = S + r1 @ (W - S)
        K1 = S + r1 @ (K - S)
        hinge = r1 @ np.array([1.0, 0.0, 0.0])
        r2 = rot_axis(hinge, -math.radians(BIND['elbow_flex']))
        W2 = E2 + r2 @ (W1 - E2)
        K2 = E2 + r2 @ (K1 - E2)
        frames = {
            'upper': r1 @ frames['upper'],
            'fore': r2 @ r1 @ frames['fore'],
            'hand': r2 @ r1 @ frames['hand'],
        }
        E, W, K = E2, W2, K2
    joints = {'clavicle': np.array(ARM_REF['clavicle']), 'shoulder': S, 'elbow': E,
              'wrist': W, 'knuckle': K}
    return joints, frames


def _local(frame, origin, v):
    """Moves a point from a bone frame to model space."""
    return origin + frame @ np.asarray(v, float)


class Part:
    """One blended part of the field: a distance function, its box, and its blend width."""

    def __init__(self, name, fn, lo, hi, k):
        """Stores the distance function, the box corners, and the blend width."""
        self.name = name
        self.fn = fn
        self.lo = np.asarray(lo, float)
        self.hi = np.asarray(hi, float)
        self.k = k


def _box_of_points(points, pad):
    """Calculates a box around points, grown by pad."""
    pts = np.asarray(points, float)
    return pts.min(axis=0) - pad, pts.max(axis=0) + pad


def arm_parts(pose, side):
    """Makes the parts of one arm (side +1 left, -1 right)."""
    joints, frames = arm_pose(pose)
    sx = np.array([side, 1.0, 1.0])

    def m(v):
        return np.asarray(v) * sx

    def mf(f):
        return np.diag(sx) @ f

    S, E, W, K = (m(joints[k]) for k in ('shoulder', 'elbow', 'wrist', 'knuckle'))
    fu, ff, fh = mf(frames['upper']), mf(frames['fore']), mf(frames['hand'])
    parts = []
    lo, hi = _box_of_points([S, E], 0.12)
    fwd = fu[:, 2]
    parts.append(Part('upper_arm', lambda p: round_cone(p, S, E, 0.076, 0.064, (fwd, 1.15)),
                      lo, hi, 0.035))
    delt_c = _local(fu, S, DELTOID[0])
    lo, hi = _box_of_points([delt_c], 0.10)
    parts.append(Part('deltoid', lambda p: ellipsoid(p, delt_c, DELTOID[1], fu),
                      lo, hi, 0.03))
    lo, hi = _box_of_points([E, W], 0.10)
    parts.append(Part('forearm', lambda p: round_cone(p, E, W, 0.068, 0.056), lo, hi, 0.03))
    fb_c = _local(ff, E, (0.008, 0.045, 0.004))
    lo, hi = _box_of_points([fb_c], 0.09)
    parts.append(Part('forearm_bulge',
                      lambda p: ellipsoid(p, fb_c, (0.062, 0.06, 0.064), ff), lo, hi, 0.025))
    paw_c = 0.5 * (W + K)
    lo, hi = _box_of_points([paw_c], 0.10)
    parts.append(Part('paw', lambda p: ellipsoid(p, paw_c, (0.061, 0.062, 0.045), fh),
                      lo, hi, 0.025))
    return parts


def leg_parts(side):
    """Makes the parts of one leg (side +1 left, -1 right)."""
    sx = np.array([side, 1.0, 1.0])
    H, Kn, A = (np.array(LEG[k]) * sx for k in ('hip', 'knee', 'ankle'))
    fwd = (0.0, 0.0, 1.0)
    parts = []
    lo, hi = _box_of_points([H, Kn], 0.16)
    parts.append(Part('thigh', lambda p: round_cone(p, H, Kn, 0.105, 0.088, (fwd, 1.14)),
                      lo, hi, 0.045))
    lo, hi = _box_of_points([Kn, A], 0.14)
    parts.append(Part('shin', lambda p: round_cone(p, Kn, A, 0.086, 0.072, (fwd, 1.18)),
                      lo, hi, 0.03))
    foot_c = np.array([0.145 * side, 0.028, 0.022])

    def foot(p):
        d = ellipsoid(p, foot_c, (0.077, 0.042, 0.112))
        return smax(d, -p[..., 1], 0.012)

    lo, hi = _box_of_points([foot_c], 0.14)
    parts.append(Part('foot', foot, lo, hi, 0.03))
    for i, off in enumerate((-0.045, -0.015, 0.015, 0.045)):
        c = np.array([(0.142 + off * 0.95) * side, 0.03, 0.098 - abs(off) * 0.35])
        lo, hi = _box_of_points([c], 0.06)
        parts.append(Part(f'toe{i}', lambda p, c=c: smax(
            ellipsoid(p, c, (0.021, 0.025, 0.03)), -p[..., 1], 0.006), lo, hi, 0.012))
    return parts


def ear_frame(side):
    """Calculates the frame of one ear: z is the normal of the ear's front face."""
    yaw = math.radians(HEAD['ear_yaw']) * side
    normal = np.array([math.sin(yaw), 0.15, math.cos(yaw)])
    return frame_from((0.0, 1.0, 0.0), normal)


def head_parts():
    """Makes the parts of the head: the cranium, the jowls, the muzzle, and the ears."""
    parts = []
    for name, k in (('cranium', 0.04), ('jowls', 0.05), ('muzzle', 0.03)):
        c, r = HEAD[name]
        lo, hi = _box_of_points([c], max(r) + 0.06)
        if name == 'muzzle':
            rot = rot_axis((1, 0, 0), math.radians(-10))
            parts.append(Part(name, lambda p, c=c, r=r, rot=rot: ellipsoid(p, c, r, rot),
                              lo, hi, k))
        else:
            parts.append(Part(name, lambda p, c=c, r=r: ellipsoid(p, c, r), lo, hi, k))
    for side in (1, -1):
        c, r = HEAD['ear']
        c = np.array(c) * np.array([side, 1, 1])
        f = ear_frame(side)
        hollow = c + f @ np.array([0.0, -0.002, 0.016])

        def ear(p, c=c, r=r, f=f, hollow=hollow):
            d = ellipsoid(p, c, r, f)
            h = ellipsoid(p, hollow, (0.022, 0.023, 0.012), f)
            return smax(d, -h, 0.006)

        lo, hi = _box_of_points([c], 0.07)
        parts.append(Part(f'ear_{side}', ear, lo, hi, 0.012))
    return parts


def all_parts(pose, views):
    """Lists every part of the body in a pose, the trunk first."""
    table = trunk_table(views)
    lo = np.array([-0.26, 0.14, -0.22])
    hi = np.array([0.26, 0.89, 0.30])
    parts = [Part('trunk', lambda p: loft(p, table), lo, hi, 0.0)]
    parts += head_parts()
    for side in (1, -1):
        parts += arm_parts(pose, side)
        parts += leg_parts(side)
    c, r = TAIL
    lo, hi = _box_of_points([c], 0.06)
    tilt = rot_axis((1, 0, 0), math.radians(-15))
    parts.append(Part('tail', lambda p: ellipsoid(p, c, r, tilt), lo, hi, 0.008))
    return parts


def detail_weights(points):
    """Weights the places that keep small facets: the face around the muzzle and the eyes."""
    p = np.asarray(points, float)
    w = np.zeros(len(p))

    def bump(center, radius):
        d = np.linalg.norm(p - np.asarray(center, float), axis=1) / radius
        return np.clip(1.5 - d, 0.0, 1.0)

    c, r = HEAD['muzzle']
    w = np.maximum(w, bump(np.array(c) + np.array([0, 0.03, -0.02]), 0.11) * (p[:, 2] > 0.08))
    return w


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
