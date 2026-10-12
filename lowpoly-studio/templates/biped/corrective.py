"""Corrective shapes of the biped between the bind pose of the role and the pose of the sheet.

A role names the corrective kinds that it needs (role.toml [bind] correctives). The biped has:

- "arm_down": the mesh is bound with the arms raised (a conductor). When an arm comes down to the
  pose of the sheet, linear blend skinning squeezes the skin under the shoulder, and some faces
  fold. The corrective shape of each arm moves the skin of the shoulder region, in the sheet
  pose, onto the surface of the field built in the sheet pose (body.parts('reference')), and
  relaxes the faces that still fold. Each clip drives its weight from the angle of the upper
  arm: 0 at the bind pose, 1 at the sheet pose.

- "legs_straight": the mesh is bound with the legs bent (a seated player). When the legs come
  straight to the pose of the sheet, the skin of the thighs and the hips does not follow the
  standing forms. The corrective shape of each leg moves the leg skin, in the sheet pose, onto
  the surface of its own leg in the field of the sheet pose, spreads the change into the hips,
  and relaxes the faces that turn over. Each clip drives its weight from the angle of the thigh:
  0 at the bind pose, 1 at the sheet pose.

The shapes are stored in bind space (glTF morph targets, applied before the skinning).

numpy only, three.js axes.
"""

import numpy as np

from studio.field import field_at
from studio.skinning import blend_matrices, face_normals, forward_kinematics, inverted_faces, skin
from templates.biped.solver import is_finger

# The corrective kinds that this template can make.
KINDS = ('arm_down', 'legs_straight')

DEBUG = False

ARM_ROOT = ('clavicle', 'upper_arm')
ARM_LOW = ('forearm', 'forearm_twist', 'hand', 'fingers')


def _columns(names):
    """Makes a function (bone kind, side) -> the weight columns: 'fingers' is every finger bone
    of the paw (one, or the digits of role.toml [rig] fingers)."""
    col = {name: i for i, name in enumerate(names)}

    def cols(prefix, side):
        if prefix == 'fingers':
            return [col[n] for n in names if is_finger(n) and n.endswith('_' + side)]
        return [col[f'{prefix}_{side}']]

    return cols


def _neighbors(n, tris):
    """Lists the edge neighbors of each vertex."""
    nb = [set() for _ in range(n)]
    for a, b, c in tris:
        nb[a].update((b, c))
        nb[b].update((a, c))
        nb[c].update((a, b))
    return [np.array(sorted(s)) for s in nb]


def _grad(parts, p):
    """Calculates the unit gradient of the field at points."""
    eps = 1e-3
    g = np.stack([field_at(parts, p + eps * e) - field_at(parts, p - eps * e)
                  for e in np.eye(3)], axis=1)
    return g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-12)


def arm_down_shapes(skel, rest, tris, weights, pose_ref, parts_ref, project, rounds=60):
    """Makes the corrective shapes of the left and the right arm.

    Three steps, all in the sheet pose:
    1. The skin of each arm (upper arm and forearm weight 0.6 or more) moves onto
       the surface of its own arm in the field of the sheet pose. Only the parts of that arm
       count, so no vertex can jump to the trunk across the gap under the arm.
    2. The change spreads into the skin around it (the shoulder and the side of the trunk)
       with a few rounds of smoothing, so no step forms at the edge of the arm.
    3. The faces that still turn over against the skin relax toward the middle of their
       neighbors, until none does.
    The paws keep their skinned shape.

    project: a function (parts, points (n, 3)) that moves points onto the surface of parts.
    Returns (delta left, delta right, report). The deltas are in bind space.
    """
    names = list(skel.names)
    col = {name: i for i, name in enumerate(names)}
    cols = _columns(names)

    def wsum(prefixes, sides='LR'):
        return weights[:, [c for p in prefixes for s in sides for c in cols(p, s)]].sum(axis=1)

    A, t = blend_matrices(skel, weights, pose_ref)
    posed = skin(A, t, rest)
    nb = _neighbors(len(rest), tris)
    before = int(inverted_faces(rest, tris, A, posed))

    # The region: the skin that any arm bone moves, grown by two rings.
    region = wsum(ARM_ROOT + ARM_LOW) > 0.02
    for _ in range(2):
        grown = region.copy()
        for i in np.nonzero(region)[0]:
            grown[nb[i]] = True
        region = grown
    paw = wsum(('hand', 'fingers'))
    keep = 1.0 - np.clip((paw - 0.3) / 0.4, 0.0, 1.0)

    # 1. The arm skin onto its own arm.
    delta = np.zeros_like(posed)
    arm_names = ('upper_arm', 'deltoid', 'forearm', 'forearm_bulge', 'paw')
    for s, sign in (('L', 1.0), ('R', -1.0)):
        own = wsum(('upper_arm', 'forearm', 'forearm_twist'), s) >= 0.6
        own &= paw < 0.5
        idx = np.nonzero(own)[0]
        arm = [q for q in parts_ref if q.name in arm_names
               and np.sign(0.5 * (q.lo[0] + q.hi[0])) == sign]
        if len(idx):
            delta[idx] = project(arm, posed[idx]) - posed[idx]

    # 2. Spread the change into the skin around the arm.
    fixed = np.zeros(len(rest), bool)
    fixed[np.nonzero(np.linalg.norm(delta, axis=1) > 0)[0]] = True
    for _ in range(8):
        avg = np.array([delta[n].mean(axis=0) if len(n) else delta[i] for i, n in enumerate(nb)])
        free = region & ~fixed
        delta[free] = avg[free]
    target = posed + delta * keep[:, None]

    # 3. Relax the faces that still turn over against the skin. They lie in the narrow gap
    # between the arm and the trunk, where the field gradient flips, so they move toward the
    # middle of their neighbors with no projection onto the field.
    in_region = region[tris].any(axis=1)
    n0 = face_normals(rest, tris)
    Af = A[tris].mean(axis=1)
    expected = np.einsum('nji,nj->ni', np.linalg.inv(Af), n0)
    expected /= np.maximum(np.linalg.norm(expected, axis=1, keepdims=True), 1e-12)
    for _ in range(rounds):
        normals = face_normals(target, tris)
        turned = np.sum(normals * expected, axis=1)
        bad = np.nonzero((turned < 0.1) & in_region)[0]
        if DEBUG:
            print('relax round', _, 'bad faces', len(bad))
        if len(bad) == 0:
            break
        move = np.zeros(len(rest), bool)
        move[tris[bad].ravel()] = True
        move &= region & (keep > 0.5)
        ids = np.nonzero(move)[0]
        if len(ids) == 0:
            break
        mids = np.array([target[nb[i]].mean(axis=0) for i in ids])
        target[ids] = 0.5 * target[ids] + 0.5 * mids

    delta_posed = target - posed
    delta = np.linalg.solve(A, delta_posed[:, :, None])[:, :, 0]
    after_posed = skin(A, t, rest + delta)
    after = int(inverted_faces(rest, tris, A, after_posed))
    centers = after_posed[tris].mean(axis=1)
    dots = np.sum(face_normals(after_posed, tris) * _grad(parts_ref, centers), axis=1)
    inward = int(np.sum((dots < 0.0) & in_region))

    side = np.clip((rest[:, 0] + 0.02) / 0.04, 0.0, 1.0)
    side = side * side * (3 - 2 * side)
    report = {'region_vertices': int(region.sum()), 'inverted_before': before,
              'inverted_after': after, 'inward_after': inward,
              'max_delta': round(float(np.abs(delta).max()), 4)}
    return delta * side[:, None], delta * (1 - side)[:, None], report


LEG_BONES = ('thigh', 'shin', 'foot', 'toes')
LEG_PARTS = ('thigh', 'shin', 'foot', 'toe')


def legs_straight_shapes(skel, rest, tris, weights, pose_ref, parts_ref, project, rounds=60):
    """Makes the corrective shapes of the left and the right leg, all in the sheet pose:

    1. The skin of each leg (thigh and shin weight 0.6 or more) moves onto the surface of its own
       leg in the field of the sheet pose. Only the parts of that leg count, so no vertex jumps
       to the trunk or to the other leg.
    2. The skin of the hips that the thigh moves (thigh weight from 0.05) and that is not on its
       leg moves onto the whole field of the sheet pose, with a share of its thigh weight.
    3. The change spreads into the skin around it with a few rounds of smoothing.
    4. The faces that still turn over against the skin relax toward the middle of their
       neighbors.
    The feet keep their skinned shape (they are rigid on the foot and the toes).

    Returns (delta left, delta right, report). The deltas are in bind space.
    """
    names = list(skel.names)
    col = {name: i for i, name in enumerate(names)}
    cols = _columns(names)

    def wsum(prefixes, sides='LR'):
        return weights[:, [c for p in prefixes for s in sides for c in cols(p, s)]].sum(axis=1)

    A, t = blend_matrices(skel, weights, pose_ref)
    posed = skin(A, t, rest)
    nb = _neighbors(len(rest), tris)
    before = int(inverted_faces(rest, tris, A, posed))

    region = wsum(LEG_BONES) > 0.02
    for _ in range(2):
        grown = region.copy()
        for i in np.nonzero(region)[0]:
            grown[nb[i]] = True
        region = grown
    feet = wsum(('foot', 'toes'))
    keep = 1.0 - np.clip((feet - 0.3) / 0.4, 0.0, 1.0)

    delta = np.zeros_like(posed)
    for s, sign in (('L', 1.0), ('R', -1.0)):
        leg = [q for q in parts_ref if q.name.startswith(LEG_PARTS)
               and np.sign(0.5 * (q.lo[0] + q.hi[0])) == sign]
        own = (wsum(('thigh', 'shin'), s) >= 0.6) & (feet < 0.5)
        idx = np.nonzero(own)[0]
        if len(idx):
            delta[idx] = project(leg, posed[idx]) - posed[idx]
        hips = (wsum(('thigh',), s) >= 0.05) & ~own & (feet < 0.5)
        hips &= np.sign(rest[:, 0]) == sign
        idx = np.nonzero(hips)[0]
        if len(idx):
            share = np.clip(wsum(('thigh',), s)[idx] / 0.6, 0.0, 1.0)[:, None]
            delta[idx] = share * (project(parts_ref, posed[idx]) - posed[idx])

    fixed = np.linalg.norm(delta, axis=1) > 0
    for _ in range(8):
        avg = np.array([delta[n].mean(axis=0) if len(n) else delta[i] for i, n in enumerate(nb)])
        free = region & ~fixed
        delta[free] = avg[free]
    target = posed + delta * keep[:, None]

    in_region = region[tris].any(axis=1)
    n0 = face_normals(rest, tris)
    Af = A[tris].mean(axis=1)
    expected = np.einsum('nji,nj->ni', np.linalg.inv(Af), n0)
    expected /= np.maximum(np.linalg.norm(expected, axis=1, keepdims=True), 1e-12)
    for _ in range(rounds):
        normals = face_normals(target, tris)
        bad = np.nonzero((np.sum(normals * expected, axis=1) < 0.1) & in_region)[0]
        if len(bad) == 0:
            break
        move = np.zeros(len(rest), bool)
        move[tris[bad].ravel()] = True
        move &= region & (keep > 0.5)
        ids = np.nonzero(move)[0]
        if len(ids) == 0:
            break
        mids = np.array([target[nb[i]].mean(axis=0) for i in ids])
        target[ids] = 0.5 * target[ids] + 0.5 * mids

    delta = np.linalg.solve(A, (target - posed)[:, :, None])[:, :, 0]
    after = int(inverted_faces(rest, tris, A, skin(A, t, rest + delta)))
    side = np.clip((rest[:, 0] + 0.02) / 0.04, 0.0, 1.0)
    side = side * side * (3 - 2 * side)
    report = {'region_vertices': int(region.sum()), 'inverted_before': before,
              'inverted_after': after, 'max_delta': round(float(np.abs(delta).max()), 4)}
    return delta * side[:, None], delta * (1 - side)[:, None], report


def thigh_dirs(skel, pose):
    """Calculates the direction of each thigh in the frame of the hips."""
    D, _, _ = forward_kinematics(skel, pose)
    out = {}
    for s in 'LR':
        name = f'thigh_{s}'
        out[s] = D['hips'].T @ (D[name] @ skel.rest[name][:, 1])
    return out


class LegDriver:
    """Turns a pose into the weights of the legs-straight shapes (0 bind, 1 sheet pose)."""

    def __init__(self, skel, pose_bind, pose_ref):
        """Stores the thigh directions of the bind pose and of the sheet pose."""
        self.skel = skel
        self.bind = thigh_dirs(skel, pose_bind)
        self.ref = thigh_dirs(skel, pose_ref)

    def weights(self, pose):
        """Calculates the weight of each side: the projection of the thigh on the arc."""
        cur = thigh_dirs(self.skel, pose)
        out = {}
        for s in 'LR':
            span = self.ref[s] - self.bind[s]
            w = float(np.dot(cur[s] - self.bind[s], span) / np.dot(span, span))
            out[s] = min(max(w, 0.0), 1.0)
        return out


def upper_arm_dirs(skel, pose):
    """Calculates the direction of each upper arm in the frame of the chest."""
    D, _, _ = forward_kinematics(skel, pose)
    out = {}
    for s in 'LR':
        name = f'upper_arm_{s}'
        world = D[name] @ skel.rest[name][:, 1]
        out[s] = D['chest'].T @ world
    return out


class ArmDriver:
    """Turns a pose into the weights of the arm-down shapes (0 bind, 1 sheet pose)."""

    def __init__(self, skel, pose_bind, pose_ref):
        """Stores the upper arm directions of the bind pose and of the sheet pose."""
        self.skel = skel
        self.bind = upper_arm_dirs(skel, pose_bind)
        self.ref = upper_arm_dirs(skel, pose_ref)

    def weights(self, pose):
        """Calculates the weight of each side: the projection of the arm on the arc."""
        cur = upper_arm_dirs(self.skel, pose)
        out = {}
        for s in 'LR':
            span = self.ref[s] - self.bind[s]
            w = float(np.dot(cur[s] - self.bind[s], span) / np.dot(span, span))
            out[s] = min(max(w, 0.0), 1.0)
        return out


def make(kinds, skel, rest, tris, weights, pose_ref, parts_ref, project):
    """Makes the corrective shapes of the kinds that the role names.

    Returns ({shape name: delta in bind space}, {shape name: function pose -> weight}, a function
    pose -> {shape name: weight} for all shapes at once, report).
    """
    unknown = [k for k in kinds if k not in KINDS]
    if unknown:
        raise ValueError(f'the biped template has no corrective {unknown} yet (it has: '
                         f'{", ".join(KINDS)})')
    shapes, drivers, report = {}, {}, {}

    def weights_of(pose):
        return {}

    if 'arm_down' in kinds:
        dL, dR, report = arm_down_shapes(skel, rest, tris, weights, pose_ref, parts_ref, project)
        pose_bind = {n: (np.array([1.0, 0.0, 0.0, 0.0]), np.zeros(3), 1.0) for n in skel.names}
        driver = ArmDriver(skel, pose_bind, pose_ref)
        shapes = {'arm_down_L': dL, 'arm_down_R': dR}
        drivers = {'arm_down_L': lambda p: driver.weights(p)['L'],
                   'arm_down_R': lambda p: driver.weights(p)['R']}

        def weights_of(pose):
            w = driver.weights(pose)
            return {'arm_down_L': w['L'], 'arm_down_R': w['R']}

    if 'legs_straight' in kinds:
        lL, lR, leg_report = legs_straight_shapes(skel, rest, tris, weights, pose_ref, parts_ref,
                                                  project)
        pose_bind = {n: (np.array([1.0, 0.0, 0.0, 0.0]), np.zeros(3), 1.0) for n in skel.names}
        legs = LegDriver(skel, pose_bind, pose_ref)
        shapes = dict(shapes, legs_straight_L=lL, legs_straight_R=lR)
        drivers = dict(drivers, legs_straight_L=lambda p: legs.weights(p)['L'],
                       legs_straight_R=lambda p: legs.weights(p)['R'])
        arms_of = weights_of
        report = dict(report, legs_straight=leg_report)

        def weights_of(pose):
            w = legs.weights(pose)
            return dict(arms_of(pose), legs_straight_L=w['L'], legs_straight_R=w['R'])

    return shapes, drivers, weights_of, report
