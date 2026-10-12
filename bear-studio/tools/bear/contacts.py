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


class ContactCheck:
    """The test points, the obstacles, and the skinning data of the bear."""

    def __init__(self, skel, body_verts, body_tris, weights, details):
        """Stores the mesh in the bind pose (three.js axes) and sorts the test points.

        weights: (vertices, bones) in the order of skel.names. details: the detail dicts of
        details.py (each one is rigid on one bone).
        """
        self.skel = skel
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
            arm = wsum([f'upper_arm_{side}', f'forearm_{side}', f'hand_{side}', f'fingers_{side}'])
            free = arm < 0.5
            self.obstacles[side] = self.tris[free[self.tris].all(axis=1)]
            tests = []
            for part, bones in (('paw', [f'hand_{side}', f'fingers_{side}']),
                                ('forearm', [f'forearm_{side}'])):
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
        """Measures one frame. Returns {(side, part): deepest contact} in bear heights."""
        D, H, S = forward_kinematics(self.skel, pose)
        body = self._skin(self.verts, self.w, D, H, S)
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
        return result

    def clip(self, poses):
        """Measures each frame of a clip. Returns (worst depth, side, part, frame)."""
        worst = (0.0, '-', '-', 0)
        for i, pose in enumerate(poses):
            for (side, part), depth in self.frame(pose).items():
                if depth > worst[0]:
                    worst = (depth, side, part, i)
        return worst
