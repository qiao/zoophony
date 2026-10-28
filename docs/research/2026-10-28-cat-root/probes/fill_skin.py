"""The smoothing of the tries of `fill` (a key of a rule of `raise` during the round, removed after
the tries): `raise_shape()` of `tools/blender/rig_mesh.py` called it on the posed skin of the rule,
before the relax, and added the smoothed vertices to the vertices that the relax can move.

Each vertex of the source within `reach[1]` units of a point of `rule['points']` moves toward the
middle of its neighbors, `rounds` times: half of the way within `reach[0]` units, and a share that
falls to 0 at `reach[1]` units. A vertex of an edge whose valley in the source is sharper than
`keep` degrees keeps its place. The first tries (`s1f3r6` and the like) took the seed vertices
and `rings` rings of neighbors at full share and `fade` rings at a falling share, and the large
faces of the chest let 5 rings reach the right shoulder. The tries `n*` moved only along the
vertex normal.
"""
import numpy as np


def near_share(points, rule):
    seeds = np.asarray(rule['points'], float).reshape(-1, 3)
    near = np.linalg.norm(points[:, None, :] - seeds[None, :, :], axis=2).min(axis=1)
    full, none = rule['reach']
    return np.clip((none - near) / (none - full), 0.0, 1.0)


def valley_angles(points, tris, face_normals):
    normals = face_normals(points, tris)
    edges = {}
    for f, (a, b, c) in enumerate(tris):
        for u, v, w in ((a, b, c), (b, c, a), (c, a, b)):
            edges.setdefault((min(u, v), max(u, v)), []).append((f, w))
    out = np.zeros(len(points))
    for (u, v), faces in edges.items():
        if len(faces) != 2:
            continue
        (f0, _), (f1, far) = faces
        if (points[far] - (points[u] + points[v]) / 2) @ normals[f0] <= 0:
            continue
        angle = np.degrees(np.arccos(np.clip(normals[f0] @ normals[f1], -1.0, 1.0)))
        out[u] = max(out[u], angle)
        out[v] = max(out[v], angle)
    return out


def fill_skin(posed, points, tris, rule, face_normals):
    neighbors = [set() for _ in range(len(posed))]
    for a, b, c in tris:
        neighbors[a].update((b, c))
        neighbors[b].update((a, c))
        neighbors[c].update((a, b))
    neighbors = [np.array(sorted(n), int) for n in neighbors]
    share = near_share(points, rule)
    share[valley_angles(points, tris, face_normals) > rule.get('keep', 180)] = 0
    ids = np.nonzero(share > 0)[0]
    step = 0.5 * share[ids, None]
    out = posed.copy()
    for _ in range(rule['rounds']):
        mids = np.array([out[neighbors[v]].mean(axis=0) for v in ids])
        out[ids] = out[ids] + step * (mids - out[ids])
    return out, share > 0
