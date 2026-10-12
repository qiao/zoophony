"""Corrective shapes for the arms down, and the check for folded faces in each clip.

The mesh is bound with the arms raised (rig.py). When an arm comes down to the pose of the
sheet, linear blend skinning squeezes the skin under the shoulder, and some faces fold. The
corrective shape of each arm moves the skin of the shoulder region, in the sheet pose, onto the
surface of the field built in the sheet pose (body.all_parts('reference')), and relaxes the
faces that still fold. The shape is stored in bind space (a glTF morph target, applied before
the skinning). Each clip drives its weight from the angle of the upper arm: 0 at the bind pose,
1 at the sheet pose.

numpy only, three.js axes.
"""

import numpy as np

import body
from contacts import blend_matrices, face_normals, forward_kinematics, inverted_faces, skin

DEBUG = False

ARM_ROOT = ('clavicle', 'upper_arm')
ARM_LOW = ('forearm', 'forearm_twist', 'hand', 'fingers')


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
    g = np.stack([body.field_at(parts, p + eps * e) - body.field_at(parts, p - eps * e)
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

    def wsum(prefixes, sides='LR'):
        return weights[:, [col[f'{p}_{s}'] for p in prefixes for s in sides]].sum(axis=1)

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
    """Turns a pose into the weights of the corrective shapes (0 bind, 1 sheet pose)."""

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
