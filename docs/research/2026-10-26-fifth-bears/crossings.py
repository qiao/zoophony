"""Counts the edges that pass through a face of the skin near the back of the seated left knee
(steps.py): the skin folds through itself there.

    uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-bears/crossings.py <step> <dir>...

The zone holds the faces of the left leg (thigh, shin, and foot weight above 0.5 on the mean)
whose middle lies within 0.15 units of the knee joint of the bind, behind the shin axis or below
the thigh axis: (m - K) . (T + S) > 0, with T the unit direction from the knee to the hip joint
and S from the knee to the ankle. An edge of the zone crosses a face of the zone when the face
does not hold either end of the edge and the segment passes through the triangle.
"""
import glob
import os
import sys

import numpy as np

step = sys.argv[1]


def unit(v):
    return v / np.linalg.norm(v)


for d in sys.argv[2:]:
    f = sorted(glob.glob(os.path.join(d, f'{step}*.npz')))[0]
    data = np.load(f)
    h = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    K = h['shin_L']
    T, S = unit(h['thigh_L'] - K), unit(h['foot_L'] - K)
    leg = data['thigh_L'] + data['shin_L'] + data['foot_L']
    mids = p[t].mean(axis=1)
    zone = (leg[t].mean(axis=1) > 0.5) & (np.linalg.norm(mids - K, axis=1) < 0.15) \
        & ((mids - K) @ (T + S) > 0)
    tz = t[zone]
    edges = {tuple(sorted((int(a), int(b)))) for tri in tz for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0]))}
    A, B, C = p[tz[:, 0]], p[tz[:, 1]], p[tz[:, 2]]
    e1, e2 = B - A, C - A
    crossing = 0
    for a, b in edges:
        o, dvec = p[a], p[b] - p[a]
        hvec = np.cross(dvec, e2)
        det = np.einsum('ij,ij->i', e1, hvec)
        ok = np.abs(det) > 1e-12
        inv = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
        s = o - A
        uu = np.einsum('ij,ij->i', s, hvec) * inv
        q = np.cross(s, e1)
        vv = (q @ dvec) * inv
        tt = np.einsum('ij,ij->i', e2, q) * inv
        hit = ok & (uu > 1e-6) & (vv > 1e-6) & (uu + vv < 1 - 1e-6) & (tt > 1e-6) & (tt < 1 - 1e-6)
        hit &= ~np.any(tz == a, axis=1) & ~np.any(tz == b, axis=1)
        crossing += int(hit.any())
    print(f'{os.path.basename(d.rstrip("/"))} {os.path.basename(f)[:-4]}: zone faces {len(tz)}, '
          f'edges {len(edges)}, edges through the skin {crossing}')
