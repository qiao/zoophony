"""The pose solver: turns a pose spec into local bone rotations (numpy only, three.js axes).

A pose spec holds:
    rot:    {bone: 3x3} relative rotations in the axes of the rest pose. The posed world rotation
            of a bone is D(bone) = D(parent) @ rot(bone).
    hips:   a 3-vector offset of the hips.
    arms:   {'L'|'R': {'wrist': point, 'pole': direction of the elbow,
                       'hand': (axis name, target direction, palm normal), 'twist': 0..1}}
            The arm is solved with two-bone IK. 'hand' sets the paw: the 'fingers' axis or the
            'baton' axis points at the target direction, and the palm faces the palm normal.
            The points and the directions are in the rest frame of the chest: they move with
            the posed chest, so the hands follow a sway or a bow.
    arm_fk: {'L'|'R': {'upper_arm': D, 'forearm': D, 'hand': D}} world rotations of the arm bones
            (in place of 'arms').
    baton_scale: a scale of the baton bone (0 hides the baton).
    legs:   'planted': the ankles stay on their rest points and the feet stay flat.

solve() returns ({bone: (quaternion w, x, y, z of the local basis, location of the basis,
uniform scale)}, world rotations D, posed heads H).
"""

import math

import numpy as np


def rot_axis(axis, angle):
    """Makes a rotation matrix from an axis and an angle in radians."""
    axis = np.asarray(axis, float)
    n = np.linalg.norm(axis)
    if n < 1e-12 or abs(angle) < 1e-12:
        return np.eye(3)
    x, y, z = axis / n
    c, s = math.cos(angle), math.sin(angle)
    C = 1 - c
    return np.array([
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ])


def euler(pitch=0.0, yaw=0.0, roll=0.0):
    """Makes a rotation from degrees: pitch about x (+ bends forward), yaw about y (+ turns to
    the bear's left), roll about z (+ leans to the bear's right)."""
    return (rot_axis((0, 1, 0), math.radians(yaw)) @ rot_axis((1, 0, 0), math.radians(pitch))
            @ rot_axis((0, 0, 1), math.radians(roll)))


def unit(v):
    """Normalizes a vector."""
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def frame(a, b):
    """Makes an orthonormal frame with columns (a, b', a x b'), where b' is b made normal to a."""
    a = unit(a)
    b = np.asarray(b, float) - a * np.dot(b, a)
    b = unit(b)
    return np.stack([a, b, np.cross(a, b)], axis=1)


def align(a_from, b_from, a_to, b_to):
    """Finds the rotation that turns the frame (a_from, b_from) into the frame (a_to, b_to)."""
    return frame(a_to, b_to) @ frame(a_from, b_from).T


def quat_from_matrix(m):
    """Converts a rotation matrix to a quaternion (w, x, y, z)."""
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [(m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s]
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s]
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def matrix_from_quat(q):
    """Converts a quaternion (w, x, y, z) to a rotation matrix."""
    w, x, y, z = q / np.linalg.norm(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def slerp(q0, q1, t):
    """Interpolates two quaternions on the shortest arc."""
    q0 = np.asarray(q0, float)
    q1 = np.asarray(q1, float)
    d = float(np.dot(q0, q1))
    if d < 0:
        q1, d = -q1, -d
    if d > 0.9995:
        q = q0 + t * (q1 - q0)
        return q / np.linalg.norm(q)
    th = math.acos(d)
    return (math.sin((1 - t) * th) * q0 + math.sin(t * th) * q1) / math.sin(th)


def twist_angle(m, axis):
    """Finds the angle of the twist part of rotation m about axis (swing-twist split)."""
    q = quat_from_matrix(m)
    return 2.0 * math.atan2(float(np.dot(q[1:], unit(axis))), q[0])


def two_bone(s, t, l1, l2, pole):
    """Solves a two-bone chain from s toward t with the bend toward pole.

    Returns (middle joint, end joint). The end joint is t, or the nearest reachable point.
    """
    d = t - s
    dist = np.linalg.norm(d)
    dist = min(max(dist, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    a = unit(d)
    cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    ang = math.acos(max(-1.0, min(1.0, cos_a)))
    p = np.asarray(pole, float) - a * np.dot(pole, a)
    p = unit(p)
    mid = s + l1 * (math.cos(ang) * a + math.sin(ang) * p)
    return mid, s + a * dist


class Skeleton:
    """The rest pose of the armature, and the solver of pose specs."""

    def __init__(self, names, parents, heads, rest_rots, extras):
        """Stores the bone order, the parents, the rest heads, and the rest rotations.

        extras: the rest directions of the baton and of the hand frames, in three.js axes.
        """
        self.names = list(names)
        self.parents = dict(parents)
        self.heads = {n: np.asarray(h, float) for n, h in heads.items()}
        self.rest = {n: np.asarray(r, float) for n, r in rest_rots.items()}
        self.extras = extras

    def _arm(self, side, spec, D, H):
        """Solves one arm: the upper arm, the forearm, and the hand."""
        up, fo, ha = f'upper_arm_{side}', f'forearm_{side}', f'hand_{side}'
        S0, E0, W0 = self.heads[up], self.heads[fo], self.heads[ha]
        l1 = np.linalg.norm(E0 - S0)
        l2 = np.linalg.norm(W0 - E0)
        S = H[up]
        Dc, Hc, c0 = D['chest'], H['chest'], self.heads['chest']
        wrist = Hc + Dc @ (np.asarray(spec['wrist'], float) - c0)
        pole = Dc @ np.asarray(spec['pole'], float)
        axis_name, target_dir, palm = spec['hand']
        target_dir = Dc @ np.asarray(target_dir, float)
        palm = Dc @ np.asarray(palm, float)
        E, W = two_bone(S, wrist, l1, l2, pole)
        u0, f0 = unit(E0 - S0), unit(W0 - E0)
        n0 = unit(np.cross(u0, f0))
        u, f = unit(E - S), unit(W - E)
        n = unit(np.cross(u, f))
        Du = align(u0, n0, u, n)
        Df = align(f0, n0, f, n)

        rest_axis = self.extras[f'{axis_name}_{side}']
        rest_palm = self.extras[f'palm_{side}']
        Dh = align(rest_axis, rest_palm, target_dir, palm)
        share = spec.get('twist', 0.5)
        rel = Df.T @ Dh
        tw = twist_angle(rel, f0)
        Df = Df @ rot_axis(f0, share * tw)

        D[up] = Du
        D[fo] = Df
        D[ha] = Dh
        H[fo] = E
        H[ha] = W

    def _leg(self, side, D, H):
        """Solves one leg so that the ankle stays on its rest point and the foot stays flat."""
        th, sh, ft = f'thigh_{side}', f'shin_{side}', f'foot_{side}'
        P0, K0, A0 = self.heads[th], self.heads[sh], self.heads[ft]
        l1 = np.linalg.norm(K0 - P0)
        l2 = np.linalg.norm(A0 - K0)
        P = H[th]
        pole = np.array([0.15 if side == 'L' else -0.15, 0.0, 1.0])
        K, A = two_bone(P, A0, l1, l2, pole)
        side_axis = np.array([1.0, 0.0, 0.0])
        D[th] = align(unit(K0 - P0), side_axis, unit(K - P), side_axis)
        D[sh] = align(unit(A0 - K0), side_axis, unit(A - K), side_axis)
        D[ft] = np.eye(3)
        H[sh] = K
        H[ft] = A

    def solve(self, spec):
        """Turns a pose spec into local bases: {bone: (quaternion, location)}."""
        rot = spec.get('rot', {})
        D = {}
        H = {}
        hips_offset = np.asarray(spec.get('hips', np.zeros(3)), float)
        for name in self.names:
            parent = self.parents[name]
            if parent is None:
                D[name] = rot.get(name, np.eye(3))
                H[name] = self.heads[name].copy()
                continue
            H[name] = H[parent] + D[parent] @ (self.heads[name] - self.heads[parent])
            if name == 'hips':
                H[name] = H[name] + hips_offset
            side = name[-1]
            if name.startswith('upper_arm_') and side in spec.get('arms', {}):
                self._arm(side, spec['arms'][side], D, H)
                continue
            if name.startswith(('forearm_', 'hand_')) and side in spec.get('arms', {}):
                continue
            fk = spec.get('arm_fk', {}).get(side)
            if fk and name.startswith(('upper_arm_', 'forearm_', 'hand_')):
                D[name] = fk[name[:-2]]
                continue
            if name.startswith('thigh_') and spec.get('legs') == 'planted':
                self._leg(side, D, H)
                continue
            if name.startswith(('shin_', 'foot_')) and spec.get('legs') == 'planted':
                continue
            D[name] = D[parent] @ rot.get(name, np.eye(3))

        out = {}
        for name in self.names:
            parent = self.parents[name]
            r = D[name] if parent is None else D[parent].T @ D[name]
            R0 = self.rest[name]
            basis = R0.T @ r @ R0
            loc = np.zeros(3)
            if name == 'hips':
                loc = R0.T @ hips_offset
            scale = 1.0
            if name == 'baton':
                scale = spec.get('baton_scale', 1.0)
            out[name] = (quat_from_matrix(basis), loc, scale)
        return out, D, H
