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
ROOT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'animals', 'bear')

# Joints of the left arm in the reference pose (measured on the front and side views).
ARM_REF = {
    'clavicle': (0.035, 0.70, 0.045),
    'shoulder': (0.16, 0.662, 0.015),
    'elbow': (0.271, 0.50, 0.0),
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

# The head, measured on the sheet: the head ball is a loft of the front and side views
# (head_table), the dome reaches 0.975, the forehead is near vertical at z 0.20 from 0.89 to
# 0.93, the cheeks are widest (0.153) at 0.83, and the snout spans 0.775 to 0.89 with the nose
# tip at z 0.282. 'skull' is only the region that moves with the head bone (rig.py).
HEAD = {
    'skull': ((0.0, 0.865, 0.08), (0.15, 0.11, 0.125)),
    'brow': ((0.0, 0.912, 0.13), (0.088, 0.042, 0.062)),
    'muzzle': ((0.0, 0.838, 0.2), (0.062, 0.056, 0.08)),
    'ear': ((0.088, 0.9565, 0.058), (0.0405, 0.043, 0.027)),
    'ear_yaw': 35.0,
    'ear_roll': 10.0,
    'eye': (0.043, 0.892),
    'eye_radius': 0.0135,
    'nose': (0.0, 0.845),
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
    # Above y 0.77 the trunk is only the neck and the nape: narrower than the head, so the
    # head reads as a ball on the shoulders, with a groove under the cheeks.
    a_ctrl = [(0.45, None), (0.475, 0.2036), (0.52, 0.199), (0.58, 0.193), (0.64, 0.183),
              (0.70, 0.174), (0.73, 0.167), (0.755, 0.153), (0.775, 0.136), (0.795, 0.115),
              (0.83, 0.09), (0.885, 0.06)]
    zf_ctrl = [(0.74, None), (0.77, 0.16), (0.80, 0.125), (0.84, 0.08), (0.885, 0.04)]
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
        # The back follows the hump line of the side view up to the back of the head.
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


# The head ball. The front mask shows the head only from the cheeks up (0.83 and above): below,
# the cheek fur and the shoulders make one outline, so the head is analytic there. Its widest
# point is at the cheeks, at the height of the muzzle; a round cap closes it at HEAD_BOTTOM, so
# the jowls overhang the neck, and a round dome closes it at HEAD_TOP between the ears. A small
# blend leaves a soft groove where the head meets the neck and the hump, as on the sheet.
HEAD_BOTTOM = 0.75
HEAD_CHEEK = (0.83, 0.153)
HEAD_TEMPLE = 0.92
HEAD_CAP = 0.93
HEAD_TOP = 0.978
HEAD_BLEND = 0.035
# The front and the back of the head ball (z) by height, where the side mask does not show
# them: the face plane beside the snout, and the back of the skull in front of the hump line,
# so the head reads as a ball and not as one slope with the back.
HEAD_FACE = [(0.75, 0.09), (0.77, 0.15), (0.80, 0.178), (0.84, 0.188), (0.875, 0.192)]
HEAD_BACK = [(0.75, 0.05), (0.77, 0.0), (0.80, -0.03), (0.84, -0.038), (0.88, -0.03)]


def head_table(views):
    """Builds the loft table of the head ball.

    The width follows the front and back masks from the cheeks (0.83) to the temples (0.92),
    where the outline is the head. Below the cheeks a quarter ellipse closes the head at
    HEAD_BOTTOM, and above the temples a quarter ellipse makes the dome to HEAD_TOP. The front
    follows the side mask on the forehead (0.89 to 0.955), and the back follows it above 0.9.
    """
    ys = np.round(np.arange(HEAD_BOTTOM, HEAD_TOP + 1e-6, 0.0025), 4)
    side = views['side']['profile']
    yc, ac = HEAD_CHEEK

    def width(y):
        vals = [v for v in (_central_half_width(views['front']['profile'], y),
                            _central_half_width(views['back']['profile'], y)) if v]
        return sum(vals) / len(vals)

    a_temple = width(HEAD_TEMPLE)

    def interp(y, ctrl):
        return float(np.interp(y, [c[0] for c in ctrl], [c[1] for c in ctrl]))

    a = np.zeros_like(ys)
    zb = np.zeros_like(ys)
    zf = np.zeros_like(ys)
    forehead_top = 0.955
    zf_top = _side_edges(side, forehead_top)[1]
    zb_top = _side_edges(side, 0.93)[0]
    for i, y in enumerate(ys):
        if y <= yc:
            # A round cap: from the front, the cheeks turn under to the chin on a quarter
            # ellipse, so the head outline is close to a circle from the ear bases down.
            t = (yc - y) / (yc - HEAD_BOTTOM)
            a[i] = ac * math.sqrt(max(1.0 - t * t, 0.0))
        elif y <= HEAD_TEMPLE:
            a[i] = width(y)
        else:
            t = (y - HEAD_TEMPLE) / (HEAD_TOP - HEAD_TEMPLE)
            a[i] = a_temple * math.sqrt(max(1.0 - t * t, 0.0))
        if y < 0.875:
            zf[i] = interp(y, HEAD_FACE)
        elif y < 0.89:
            zf[i] = interp(y, [(0.875, HEAD_FACE[-1][1]), (0.89, _side_edges(side, 0.89)[1])])
        elif y <= forehead_top:
            zf[i] = _side_edges(side, y)[1]
        else:
            t = (y - forehead_top) / (HEAD_TOP - forehead_top)
            zf[i] = 0.07 + (zf_top - 0.07) * math.sqrt(max(1.0 - t * t, 0.0))
        if y < 0.88:
            zb[i] = interp(y, HEAD_BACK)
        elif y <= 0.93:
            zb[i] = interp(y, [(0.88, HEAD_BACK[-1][1]), (0.90, _side_edges(side, 0.90)[0])]) \
                if y < 0.90 else _side_edges(side, y)[0]
        else:
            t = (y - 0.93) / (HEAD_TOP - 0.93)
            zb[i] = 0.065 + (zb_top - 0.065) * math.sqrt(max(1.0 - t * t, 0.0))
    # The dome: above HEAD_CAP the width and the depth shrink together, as on an ellipsoid, so
    # the top is round. (A width that closed before the depth left a thin ridge on the crown,
    # and the faces across it pointed into the head.)
    k = int(np.searchsorted(ys, HEAD_CAP))
    zc = 0.5 * (zb[k] + zf[k])
    for i in range(k, len(ys)):
        t = (ys[i] - HEAD_CAP) / (HEAD_TOP - HEAD_CAP)
        f = math.sqrt(max(1.0 - t * t, 0.0))
        a[i] = a[k] * f
        zf[i] = zc + (zf[k] - zc) * f
        zb[i] = zc - (zc - zb[k]) * f
    a, zb, zf = (smooth(v, ys, 0.004) for v in (a, zb, zf))
    a[0] = 0.0
    a[-1] = 0.0
    zw = zb + 0.5 * (zf - zb)
    return {'y': ys, 'a': a, 'zb': zb, 'zf': zf, 'zw': zw,
            'nf': np.full_like(ys, 2.0), 'nb': np.full_like(ys, 2.1)}


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
    """Calculates the frame of one ear: z is the normal of the ear's front face.

    The ear turns out by ear_yaw (so it reads as a broad oval from the side, as on the sheet),
    and its top leans out by ear_roll.
    """
    yaw = math.radians(HEAD['ear_yaw']) * side
    roll = math.radians(HEAD['ear_roll']) * side
    normal = np.array([math.sin(yaw), 0.15, math.cos(yaw)])
    return frame_from((math.sin(roll), math.cos(roll), 0.0), normal)


# The snout: a short cone along z from its base to the center of its round front. Its axis
# tilts up toward the front, so the nose at the top reaches furthest (z 0.28 at height 0.85)
# and the chin recedes, as in the side view of the sheet. From the front it is a round tan
# disk 0.12 wide.
SNOUT = ((0.0, 0.832, 0.165), (0.0, 0.845, 0.232))
SNOUT_RADII = (0.06, 0.052)
SNOUT_SQUASH = 0.95


def snout(p):
    """Calculates the distance to the snout cone."""
    a, b = SNOUT
    return round_cone(p, a, b, SNOUT_RADII[0], SNOUT_RADII[1], ((0.0, 1.0, 0.0), SNOUT_SQUASH))


def head_parts(views=None):
    """Makes the parts of the head: the head ball, the brow, the muzzle, and the ears."""
    parts = []
    if views is not None:
        table = head_table(views)
        lo = np.array([-0.18, HEAD_BOTTOM - 0.01, -0.12])
        hi = np.array([0.18, HEAD_TOP + 0.01, 0.25])
        parts.append(Part('head', lambda p: loft(p, table), lo, hi, HEAD_BLEND))
    for name, k in (('brow', 0.02), ('muzzle', 0.022)):
        c, r = HEAD[name]
        lo, hi = _box_of_points([c], max(r) + 0.06)
        if name == 'muzzle':
            parts.append(Part(name, snout, lo, hi, k))
        else:
            parts.append(Part(name, lambda p, c=c, r=r: ellipsoid(p, c, r), lo, hi, k))
    for side in (1, -1):
        c, r = HEAD['ear']
        c = np.array(c) * np.array([side, 1, 1])
        f = ear_frame(side)
        hollow = c + f @ np.array([0.0, -0.002, 0.9 * r[2]])

        def ear(p, c=c, r=r, f=f, hollow=hollow):
            d = ellipsoid(p, c, r, f)
            h = ellipsoid(p, hollow, (0.65 * r[0], 0.65 * r[1], 0.55 * r[2]), f)
            return smax(d, -h, 0.006)

        lo, hi = _box_of_points([c], 0.07)
        parts.append(Part(f'ear_{side}', ear, lo, hi, 0.012))
    return parts


def all_parts(pose, views, small=True):
    """Lists every part of the body in a pose, the trunk first.

    small: also the ears and the tail. The low-poly surface leaves them out, because quads of
    the facet size cannot hold them; details.py makes them as separate low-poly pieces.
    """
    table = trunk_table(views)
    lo = np.array([-0.26, 0.14, -0.22])
    hi = np.array([0.26, 0.89, 0.30])
    parts = [Part('trunk', lambda p: loft(p, table), lo, hi, 0.0)]
    parts += [p for p in head_parts(views) if small or not p.name.startswith('ear')]
    for side in (1, -1):
        parts += arm_parts(pose, side)
        parts += leg_parts(side)
    if small:
        c, r = TAIL
        lo, hi = _box_of_points([c], 0.06)
        parts.append(Part('tail', lambda p: ellipsoid(p, c, r, tail_rotation()), lo, hi, 0.008))
    return parts


def tail_rotation():
    """Calculates the tilt of the tail: it points a little down."""
    return rot_axis((1, 0, 0), math.radians(-15))


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
