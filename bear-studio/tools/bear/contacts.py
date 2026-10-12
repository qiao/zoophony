"""Checks each clip for parts that go into the body: paws, claws, forearms, and the baton.

The check skins the mesh itself (linear blend skinning, as three.js and Blender do) at each
baked frame. For each arm it builds an obstacle from the body faces that do not belong to
that arm: the trunk, the head, the legs, and the other arm. Then it measures how deep each test
point lies inside the obstacle: the nearest point on the obstacle, and the side of its face
normal. The test points are the forearm and paw vertices of the arm, its claws, and the baton.

Runs inside Blender (it uses mathutils.bvhtree). All values are in bear heights: the GLB bear
is 1 m tall, so 0.01 is 1 cm.
"""

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from pose import matrix_from_quat

# The deepest contact that a clip may have, in bear heights (1 cm on the 1 m bear).
LIMIT = 0.01


def winding_number(p, verts, tris):
    """Calculates the generalized winding number of a point for a triangle set (1 inside)."""
    a = verts[tris[:, 0]] - p
    b = verts[tris[:, 1]] - p
    c = verts[tris[:, 2]] - p
    la, lb, lc = (np.linalg.norm(v, axis=1) for v in (a, b, c))
    det = np.einsum('ij,ij->i', a, np.cross(b, c))
    den = (la * lb * lc + np.einsum('ij,ij->i', a, b) * lc + np.einsum('ij,ij->i', b, c) * la
           + np.einsum('ij,ij->i', c, a) * lb)
    return float(np.sum(2.0 * np.arctan2(det, den)) / (4.0 * np.pi))


def forward_kinematics(skel, pose):
    """Turns local bases {bone: (quat, loc, scale)} into world rotations (with scale) and heads."""
    D, H, S = {}, {}, {}
    for name in skel.names:
        q, loc, scale = pose[name]
        r0 = skel.rest[name]
        r = r0 @ matrix_from_quat(np.asarray(q, float)) @ r0.T
        parent = skel.parents[name]
        if parent is None:
            D[name] = r
            H[name] = skel.heads[name] + r0 @ np.asarray(loc, float)
            S[name] = scale
            continue
        D[name] = D[parent] @ r
        offset = skel.heads[name] - skel.heads[parent] + r0 @ np.asarray(loc, float)
        H[name] = H[parent] + D[parent] @ offset
        S[name] = S[parent] * scale
    return D, H, S


def blend_matrices(skel, weights, pose):
    """Calculates the blended skin transform of each vertex: posed = A @ rest + t."""
    D, H, S = forward_kinematics(skel, pose)
    n = weights.shape[0]
    A = np.zeros((n, 3, 3))
    t = np.zeros((n, 3))
    for j, name in enumerate(skel.names):
        w = weights[:, j]
        nz = w > 0
        if not nz.any():
            continue
        M = D[name] * S[name]
        A[nz] += w[nz, None, None] * M
        t[nz] += w[nz, None] * (H[name] - M @ skel.heads[name])
    return A, t


def skin(A, t, points):
    """Moves rest points with blended transforms."""
    return np.einsum('nij,nj->ni', A, points) + t


def face_normals(v, tris):
    """Calculates unit face normals."""
    n = np.cross(v[tris[:, 1]] - v[tris[:, 0]], v[tris[:, 2]] - v[tris[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


# A face is folded when its normal turns more than 120 degrees from its expected normal.
FOLD_DOT = -0.5


def turn_dots(rest, tris, A, posed):
    """Calculates, for each face, the cosine between its posed normal and its expected normal.

    The expected normal of a face is its rest normal carried by the mean skin transform of its
    corners (the inverse transpose). Below 0 the face is turned past 90 degrees (edge-on or
    further), and below FOLD_DOT it is folded over.
    """
    n0 = face_normals(rest, tris)
    Af = A[tris].mean(axis=1)
    expected = np.einsum('nji,nj->ni', np.linalg.inv(Af), n0)
    expected /= np.maximum(np.linalg.norm(expected, axis=1, keepdims=True), 1e-12)
    return np.sum(face_normals(posed, tris) * expected, axis=1)


def dominant_dots(rest, tris, posed, weights, rotations):
    """Calculates, for each face, the cosine between its posed normal and its rest normal
    turned by the rotation of its dominant bone (the bone with the most weight on its corners).

    Unlike turn_dots, this does not collapse where two bones turned far apart blend 50/50, so it
    finds the folds of a twist.
    """
    dom = np.argmax(weights[tris].mean(axis=1), axis=1)
    expected = np.einsum('nij,nj->ni', rotations[dom], face_normals(rest, tris))
    return np.sum(face_normals(posed, tris) * expected, axis=1)


def inverted_faces(rest, tris, A, posed):
    """Counts the faces turned past 90 degrees in a pose (see turn_dots)."""
    return int(np.sum(turn_dots(rest, tris, A, posed) < 0.0))


class ContactCheck:
    """The test points, the obstacles, and the skinning data of the bear."""

    def __init__(self, skel, body_verts, body_tris, weights, details, morphs=None, driver=None):
        """Stores the mesh in the bind pose (three.js axes) and sorts the test points.

        weights: (vertices, bones) in the order of skel.names. details: the detail dicts of
        details.py (each one is rigid on one bone). morphs: {'L': delta, 'R': delta}, the
        corrective shapes, and driver: the corrective.ArmDriver that weights them.
        """
        self.skel = skel
        self.morphs = morphs or {}
        self.driver = driver
        self.names = list(skel.names)
        self.verts = np.asarray(body_verts, float)
        self.tris = np.asarray(body_tris, np.int64)
        self.w = np.asarray(weights, float)
        col = {n: i for i, n in enumerate(self.names)}

        def wsum(bones):
            return self.w[:, [col[b] for b in bones]].sum(axis=1)

        self.obstacles = {}
        self.tests = {}
        for side in ('L', 'R'):
            arm = wsum([f'upper_arm_{side}', f'forearm_{side}', f'forearm_twist_{side}',
                        f'hand_{side}', f'fingers_{side}'])
            free = arm < 0.5
            self.obstacles[side] = self.tris[free[self.tris].all(axis=1)]
            tests = []
            for part, bones in (('paw', [f'hand_{side}', f'fingers_{side}']),
                                ('forearm', [f'forearm_{side}', f'forearm_twist_{side}'])):
                member = wsum(bones) > 0.5
                idx = np.nonzero(member)[0]
                # The faces of the region add their centers as test points.
                local = {v: i for i, v in enumerate(idx)}
                faces = self.tris[member[self.tris].all(axis=1)]
                faces = np.array([[local[v] for v in f] for f in faces], np.int64).reshape(-1, 3)
                tests.append((part, self.verts[idx], self.w[idx], faces))
            for d in details:
                if d['name'].startswith(f'claw_hand_{side}'):
                    tests.append(('claw', d['verts'], self._rigid(d['bone'], len(d['verts'])),
                                  d['faces']))
                if side == 'R' and d['name'] == 'baton_shaft':
                    tests.append(('baton', d['verts'], self._rigid(d['bone'], len(d['verts'])),
                                  d['faces']))
            self.tests[side] = tests

    def _rigid(self, bone, n):
        """Makes weights that give n points to one bone."""
        w = np.zeros((n, len(self.names)))
        w[:, self.names.index(bone)] = 1.0
        return w

    def _skin(self, points, weights, D, H, S):
        """Moves bind-pose points to the pose with linear blend skinning."""
        out = np.zeros_like(points)
        for j, name in enumerate(self.names):
            wj = weights[:, j]
            nz = wj > 0
            if not nz.any():
                continue
            moved = (points[nz] - self.skel.heads[name]) @ (D[name] * S[name]).T + H[name]
            out[nz] += wj[nz, None] * moved
        return out

    def frame(self, pose):
        """Measures one frame.

        Returns ({(side, part): deepest contact} in bear heights, (faces turned past 90
        degrees, faces folded past 120 degrees)).
        """
        D, H, S = forward_kinematics(self.skel, pose)
        rest = self.verts
        if self.morphs and self.driver:
            mw = self.driver.weights(pose)
            rest = rest + sum(mw[s] * self.morphs[s] for s in self.morphs)
        A, t = blend_matrices(self.skel, self.w, pose)
        body = skin(A, t, rest)
        rotations = np.stack([D[n] for n in self.names])
        dots = dominant_dots(rest, self.tris, body, self.w, rotations)
        turned = (int(np.sum(dots < 0.0)), int(np.sum(dots < FOLD_DOT)))
        result = {}
        for side in ('L', 'R'):
            tri = self.obstacles[side]
            tree = BVHTree.FromPolygons([Vector(v) for v in body], tri.tolist(), all_triangles=True)
            for part, pts, w, faces in self.tests[side]:
                posed = self._skin(pts, w, D, H, S)
                if part == 'baton' and S['baton'] < 0.05:
                    continue
                if len(faces):
                    posed = np.concatenate([posed, posed[faces].mean(axis=1)])
                deepest = 0.0
                for p in posed:
                    hit = tree.find_nearest(Vector(p))
                    if hit[0] is None:
                        continue
                    loc, normal, _, dist = hit
                    if dist > deepest and (Vector(p) - loc).dot(normal) < 0:
                        # The obstacle is open where the arm joins it, so the side of the
                        # nearest face can be wrong. A winding number confirms the inside.
                        if winding_number(p, body, tri) > 0.5:
                            deepest = dist
                key = (side, part)
                result[key] = max(result.get(key, 0.0), deepest)
        return result, turned

    def clip(self, poses):
        """Measures each frame of a clip.

        Returns (worst depth, side, part, frame, the most turned faces in one frame, the most
        folded faces in one frame).
        """
        worst = (0.0, '-', '-', 0)
        turned = folded = 0
        for i, pose in enumerate(poses):
            depths, (n_turned, n_folded) = self.frame(pose)
            turned = max(turned, n_turned)
            folded = max(folded, n_folded)
            for (side, part), depth in depths.items():
                if depth > worst[0]:
                    worst = (depth, side, part, i)
        return worst + (turned, folded)
