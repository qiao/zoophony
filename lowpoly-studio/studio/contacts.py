"""The contact and fold check of each clip: parts that go into the body, and faces that fold.

The check skins the mesh itself (studio/skinning.py) at each baked frame. For each arm it builds
an obstacle from the body faces that do not belong to that arm: the trunk, the head, the legs,
and the other arm. Then it measures how deep each test point lies inside the obstacle: the
nearest point on the obstacle, and the side of its face normal. The template and the role name
the test groups (contact_spec): for the conductor, the forearm and paw vertices of the arm, its
claws, and the baton.

Runs inside Blender (it uses mathutils.bvhtree). All values are in animal heights: the GLB animal
is 1 m tall, so 0.01 is 1 cm.
"""

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from studio.skinning import (FOLD_DOT, blend_matrices, dominant_dots, forward_kinematics, skin,
                             winding_number)


class ContactCheck:
    """The test points, the obstacles, and the skinning data of one body."""

    def __init__(self, skel, body_verts, body_tris, weights, details, spec, morphs, driver):
        """Stores the mesh in the bind pose (three.js axes) and sorts the test points.

        weights: (vertices, bones) in the order of skel.names. details: the detail dicts (each
        one is rigid on one bone). spec: {side: {'arm': bones of the arm, 'tests': [(part, kind,
        what)]}} with kind 'skin' (what: bones whose skin is tested), 'detail' (what: a name
        prefix of details), or 'prop' (what: the name of a prop detail). morphs: {shape name:
        delta}, the corrective shapes, and driver: a function pose -> {shape name: weight}.
        """
        self.skel = skel
        self.morphs = morphs or {}
        self.driver = driver
        self.names = list(skel.names)
        self.verts = np.asarray(body_verts, float)
        self.tris = np.asarray(body_tris, np.int64)
        self.w = np.asarray(weights, float)
        # The faces that folded over in any frame (indices into body_tris).
        self.folded = set()
        col = {n: i for i, n in enumerate(self.names)}

        def wsum(bones):
            return self.w[:, [col[b] for b in bones]].sum(axis=1)

        self.obstacles = {}
        self.tests = {}
        self.sides = list(spec)
        for side, s in spec.items():
            arm = wsum(s['arm'])
            free = arm < 0.5
            self.obstacles[side] = self.tris[free[self.tris].all(axis=1)]
            tests = []
            for part, kind, what in s['tests']:
                if kind == 'skin':
                    member = wsum(what) > 0.5
                    idx = np.nonzero(member)[0]
                    # The faces of the region add their centers as test points.
                    local = {v: i for i, v in enumerate(idx)}
                    faces = self.tris[member[self.tris].all(axis=1)]
                    faces = np.array([[local[v] for v in f] for f in faces], np.int64).reshape(-1, 3)
                    tests.append((part, None, self.verts[idx], self.w[idx], faces))
                    continue
                for d in details:
                    hit = d['name'].startswith(what) if kind == 'detail' else d['name'] == what
                    if hit:
                        tests.append((part, d['bone'] if kind == 'prop' else None, d['verts'],
                                      self._rigid(d['bone'], len(d['verts'])), d['faces']))
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

        Returns ({(side, part): deepest contact} in animal heights, (faces turned past 90
        degrees, faces folded past 120 degrees)).
        """
        D, H, S = forward_kinematics(self.skel, pose)
        rest = self.verts
        if self.morphs and self.driver:
            mw = self.driver(pose)
            rest = rest + sum(mw[s] * self.morphs[s] for s in self.morphs)
        A, t = blend_matrices(self.skel, self.w, pose)
        body = skin(A, t, rest)
        rotations = np.stack([D[n] for n in self.names])
        dots = dominant_dots(rest, self.tris, body, self.w, rotations)
        turned = (int(np.sum(dots < 0.0)), int(np.sum(dots < FOLD_DOT)))
        self.folded.update(np.nonzero(dots < FOLD_DOT)[0].tolist())
        result = {}
        for side in self.sides:
            tri = self.obstacles[side]
            tree = BVHTree.FromPolygons([Vector(v) for v in body], tri.tolist(), all_triangles=True)
            for part, prop_bone, pts, w, faces in self.tests[side]:
                posed = self._skin(pts, w, D, H, S)
                # A hidden prop (scale near 0) is not tested.
                if prop_bone and S[prop_bone] < 0.05:
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
                        # The obstacle is open where the arm joins it, so the side of the nearest
                        # face can be wrong. A winding number confirms the inside.
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
