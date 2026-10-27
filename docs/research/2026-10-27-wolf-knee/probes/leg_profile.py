"""Measures the form along the left leg of the polar bear: cuts across the thigh and the shin at
shares of each bone, in the source of the user (source-short.npy), the source with the legs 1.6
times longer (00-raw.npz), and a seated bind step. Each cut is a plane square to the bone through
a point of the bone, and takes the faces of the leg (thigh, shin, and foot weights above 0.5 on the
mean, plus the hips with `--hips`). It prints the width (across the leg, along the bend axis) and
the depth (in the bend plane, square to the bone) of the outline nearest to the bone axis, in units
of the rig (1 unit = the height of the user mesh, 1.63 m in the app).

    uv run --no-project --with numpy python -I leg_profile.py <steps dir> <bind step> [--hips]
"""
import os
import sys
from collections import defaultdict

import numpy as np

d, step = sys.argv[1], sys.argv[2]
with_hips = '--hips' in sys.argv


def unit(v):
    return v / np.linalg.norm(v)


def loops(p, t, origin, normal):
    dist = (p - origin) @ normal
    node, pts, adj = {}, [], defaultdict(list)

    def key(a, b):
        k = (min(a, b), max(a, b))
        if k not in node:
            s = dist[a] / (dist[a] - dist[b])
            node[k] = len(pts)
            pts.append(p[a] + s * (p[b] - p[a]))
        return node[k]
    for tri in t:
        dd = dist[tri]
        if (dd > 0).all() or (dd <= 0).all():
            continue
        ends = [key(tri[k], tri[(k + 1) % 3]) for k in range(3)
                if (dist[tri[k]] > 0) != (dist[tri[(k + 1) % 3]] > 0)]
        if len(ends) == 2:
            adj[ends[0]].append(ends[1])
            adj[ends[1]].append(ends[0])
    seen, out = set(), []
    for start in list(adj):
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        out.append(np.array([pts[i] for i in loop]))
    return out


def measure(label, p, t, keep, hip, knee, ankle, bend):
    """Prints the cuts of one mesh. `bend` is the bend axis (across the leg)."""
    t = t[keep]
    rows = []
    for name, a, b, shares in (('thigh', hip, knee, (0.1, 0.3, 0.5, 0.7, 0.9)),
                               ('knee', knee, knee, (0.0,)),
                               ('shin', knee, ankle, (0.25, 0.5, 0.75, 1.0))):
        for s in shares:
            if name == 'knee':
                axis = unit(unit(hip - knee) - unit(ankle - knee))  # the bisector plane normal
                c = knee
            else:
                axis = unit(b - a)
                c = a + s * (b - a)
            lps = [L for L in loops(p, t, c, axis) if len(L) > 5]
            if not lps:
                rows.append(f'{name} {s:.2f}: no cut')
                continue
            L = min(lps, key=lambda L: np.linalg.norm(L.mean(axis=0) - c))
            across = unit(bend - (bend @ axis) * axis)
            deep = np.cross(axis, across)
            w = np.ptp((L - c) @ across)
            dp = np.ptp((L - c) @ deep)
            rows.append(f'{name} {s:.2f}: width {w:.3f} depth {dp:.3f}')
    print(f'{label}: ' + ' | '.join(rows))


short = np.load(os.path.join(d, 'source-short.npy'))
raw = np.load(os.path.join(d, '00-raw.npz'))
legw = raw['thigh_L'] + raw['shin_L'] + raw['foot_L'] + (raw['hips'] if with_hips else 0)
keep0 = legw[raw['tris']].mean(axis=1) > 0.5
x = np.array([1.0, 0, 0])
measure('source', short, raw['tris'], keep0, np.array([0.11, 0.28, -0.01]),
        np.array([0.115, 0.15, -0.015]), np.array([0.113, 0.065, -0.035]), x)
measure('source x1.6', raw['points'], raw['tris'], keep0, np.array([0.11, 0.409, -0.01]),
        np.array([0.118, 0.201, -0.018]), np.array([0.115, 0.065, -0.05]), x)
data = np.load(os.path.join(d, f'{step}.npz'))
heads = np.load(os.path.join(d, 'heads-2.npz'))
w = data['thigh_L'] + data['shin_L'] + data['foot_L'] + (data['hips'] if with_hips else 0)
keep = w[data['tris']].mean(axis=1) > 0.5
H, K, A = heads['thigh_L'], heads['shin_L'], heads['foot_L']
bend = unit(np.cross(unit(H - K), unit(A - K)))
measure(f'bind {step}', data['points'], data['tris'], keep, H, K, A, bend)
