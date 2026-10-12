"""The pose solver of the biped: turns a pose spec into local bone rotations (numpy, three.js
axes).

A pose spec holds:
    rot:    {bone: 3x3} relative rotations in the axes of the rest pose. The posed world rotation
            of a bone is D(bone) = D(parent) @ rot(bone).
    hips:   a 3-vector offset of the hips.
    arms:   {'L'|'R': {'wrist': point, 'pole': direction of the elbow,
                       'hand': (axis name, target direction, palm normal), 'twist': 0..1}}
            The arm is solved with two-bone IK. 'hand' sets the paw: the 'fingers' axis or the
            axis of a prop (for example 'baton') points at the target direction, and the palm
            faces the palm normal. The points and the directions are in the rest frame of the
            chest: they move with the posed chest, so the hands follow a sway or a bow.
            'twist' is the share of the paw twist that the forearm twist bone takes (the twist
            split), so the elbow skin does not twist like a candy wrapper.
    arm_fk: {'L'|'R': {'upper_arm': D, 'forearm': D, 'forearm_twist': D, 'hand': D}} world
            rotations of the arm bones (in place of 'arms').
    leg_fk: {'L'|'R': {'thigh': D, 'shin': D, 'foot': D}} world rotations of the leg bones (in
            place of 'legs'; the sheet pose of a seated bind pose uses it).
    <prop>_scale: a scale of the prop bone (0 hides the prop), for example baton_scale.
    legs:   'planted': the ankles stay on their rest points and the feet stay flat.

The clavicle follows a raised arm (config rig.clavicle). solve() returns ({bone: (quaternion w,
x, y, z of the local basis, location of the basis, uniform scale)}, world rotations D, posed
heads H).
"""

import math

import numpy as np

from studio.ik import align, quat_from_matrix, rot_axis, twist_angle, two_bone, unit

# The body bones of the template in parent order (each parent comes before its children), with
# one finger bone for each paw. The other bones are props.
BODY_BONES = [
    'root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
    'clavicle_L', 'upper_arm_L', 'forearm_L', 'forearm_twist_L', 'hand_L', 'fingers_L',
    'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R',
    'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail',
]


def finger_bones(side, count=1):
    """Lists the finger bones of one paw: 'fingers_L' for one finger bone (role.toml [rig]
    fingers = 1), or one digit bone for each claw, 'finger1_L' (the inner digit) to
    'finger4_L', all children of the hand."""
    if count == 1:
        return [f'fingers_{side}']
    return [f'finger{k}_{side}' for k in range(1, count + 1)]


def body_bones(count=1):
    """Lists the body bones in parent order with count finger bones for each paw."""
    out = []
    for name in BODY_BONES:
        out += finger_bones(name[-1], count) if name.startswith('fingers_') else [name]
    return out


def is_finger(name):
    """Tells if a bone is a finger bone of a paw (one finger bone or a digit)."""
    base = name[:-2]
    return name[-2:] in ('_L', '_R') and (base == 'fingers' or (
        base.startswith('finger') and base[6:].isdigit()))


class Skeleton:
    """The rest pose of the armature, and the solver of pose specs."""

    def __init__(self, names, parents, heads, rest_rots, extras, rig):
        """Stores the bone order, the parents, the rest heads, and the rest rotations.

        extras: the rest directions of the props and of the hand frames, in three.js axes.
        rig: the config section rig (the clavicle follow and the leg pole).
        """
        self.names = list(names)
        self.parents = dict(parents)
        self.heads = {n: np.asarray(h, float) for n, h in heads.items()}
        self.rest = {n: np.asarray(r, float) for n, r in rest_rots.items()}
        self.extras = extras
        self.clavicle = rig.clavicle
        self.leg_pole = rig.leg_pole
        self.props = [n for n in self.names if n not in BODY_BONES and not is_finger(n)]

    def _auto_clavicle(self, name, arm):
        """Turns the clavicle by a share of the swing of the arm toward the wrist target.

        A real shoulder girdle follows the arm, so the skin over the shoulder does not take the
        whole rotation at the shoulder joint, where it would fold. The rotation is in the axes of
        the rest pose (the frame of the chest). Only a raised arm moves the clavicle: from no
        share at the low wrist height (a hanging arm, where the arm-down corrective expects the
        clavicle at rest) to the full share.
        """
        c = self.clavicle
        side = name[-1]
        c0 = self.heads[name]
        v0 = unit(self.heads[f'hand_{side}'] - c0)
        v1 = unit(np.asarray(arm['wrist'], float) - c0)
        axis = np.cross(v0, v1)
        angle = math.atan2(np.linalg.norm(axis), float(np.dot(v0, v1)))
        lift = min(max((float(arm['wrist'][1]) - c.lift[0]) / c.lift[1], 0.0), 1.0)
        return rot_axis(axis, lift * min(c.share * angle, math.radians(c.max)))

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
        tb = f'forearm_twist_{side}'
        mid = np.linalg.norm(self.heads[tb] - E0) / l2

        D[up] = Du
        D[fo] = Df
        D[tb] = Df @ rot_axis(f0, share * tw)
        D[ha] = Dh
        H[fo] = E
        H[tb] = E + mid * (W - E)
        H[ha] = W

    def _leg(self, side, D, H):
        """Solves one leg so that the ankle stays on its rest point and the foot stays flat."""
        th, sh, ft = f'thigh_{side}', f'shin_{side}', f'foot_{side}'
        P0, K0, A0 = self.heads[th], self.heads[sh], self.heads[ft]
        l1 = np.linalg.norm(K0 - P0)
        l2 = np.linalg.norm(A0 - K0)
        P = H[th]
        lp = self.leg_pole
        pole = np.array([lp[0] if side == 'L' else -lp[0], lp[1], lp[2]])
        K, A = two_bone(P, A0, l1, l2, pole)
        side_axis = np.array([1.0, 0.0, 0.0])
        D[th] = align(unit(K0 - P0), side_axis, unit(K - P), side_axis)
        D[sh] = align(unit(A0 - K0), side_axis, unit(A - K), side_axis)
        D[ft] = np.eye(3)
        H[sh] = K
        H[ft] = A

    def solve(self, spec):
        """Turns a pose spec into local bases: {bone: (quaternion, location, scale)}."""
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
            if name.startswith('clavicle_') and side in spec.get('arms', {}):
                D[name] = D[parent] @ rot.get(name, np.eye(3)) @ self._auto_clavicle(
                    name, spec['arms'][side])
                continue
            if name.startswith('upper_arm_') and side in spec.get('arms', {}):
                self._arm(side, spec['arms'][side], D, H)
                continue
            if name.startswith(('forearm_', 'hand_')) and side in spec.get('arms', {}):
                continue
            fk = spec.get('arm_fk', {}).get(side)
            if fk and name.startswith(('upper_arm_', 'forearm_', 'hand_')):
                D[name] = fk[name[:-2]]
                continue
            lfk = spec.get('leg_fk', {}).get(side)
            if lfk and name.startswith(('thigh_', 'shin_', 'foot_')):
                D[name] = lfk[name[:-2]]
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
            if name in self.props:
                scale = spec.get(f'{name}_scale', 1.0)
            out[name] = (quat_from_matrix(basis), loc, scale)
        return out, D, H
