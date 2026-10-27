"""Measures the left knee of the source mesh and of the seated bind of the polar bear rig, in units.

    uv run --no-project --with numpy python -I knee_shape.py <steps dir> [<step name>]

The source: the mesh of the user before the stretch of the legs (source-short.npy) and after it
(00-raw.npz), cut by a level plane at the knee joint: the width (x) and the depth (z) of the left
leg, and the front radius (the front of the leg to the knee joint). The front profile gives the z
of the front of the leg at heights around the knee.

The seated bind: the cut through the knee joint that holds the bend axis and the bisector of the
thigh and the shin: the width along the bend axis, the front reach (the farthest skin point along
the outward bisector from the joint), and the back reach. For a round bend the front reach is near
the front radius of the leg, and for a square block near 1.41 times it. The side cut (the plane of
the bend through the joint) gives the outer outline of the knee: the largest turn at one corner of
the outline within 0.1 units of the joint on the front side, and the front reach of the outline.
"""
import os
import sys
from collections import defaultdict

import numpy as np

d = sys.argv[1]
step = sys.argv[2] if len(sys.argv) > 2 else '13-knee_relax'


def unit(v):
    return v / np.linalg.norm(v)


def loops(p, t, origin, normal):
    """Cuts the mesh with a plane and gives the closed outlines as lists of points."""
    dist = (p - origin) @ normal
    node = {}
    pts = []
    adj = defaultdict(list)

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
        ends = []
        for k in range(3):
            a, b = tri[k], tri[(k + 1) % 3]
            if (dist[a] > 0) != (dist[b] > 0):
                ends.append(key(a, b))
        if len(ends) == 2:
            adj[ends[0]].append(ends[1])
            adj[ends[1]].append(ends[0])
    seen = set()
    out = []
    for start in list(adj):
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        out.append(np.array([pts[i] for i in loop]))
    return out


def leg_loop(lps, center):
    """Gives the outline whose middle is nearest to a point."""
    return min(lps, key=lambda L: np.linalg.norm(L.mean(axis=0) - center) if len(L) > 5 else 9)


short = np.load(os.path.join(d, 'source-short.npy'))
raw = np.load(os.path.join(d, '00-raw.npz'))
tris0 = raw['tris']
leg0 = (raw['thigh_L'] + raw['shin_L'] + raw['foot_L'])[tris0].mean(axis=1) > 0.5
for name, p, ky in (('source', short, 0.15), ('source stretched', raw['points'], 0.211)):
    lps = loops(p, tris0[leg0], np.array([0, ky, 0]), np.array([0, 1.0, 0]))
    L = leg_loop(lps, np.array([0.115, ky, -0.015]))
    w = L[:, 0].max() - L[:, 0].min()
    dep = L[:, 2].max() - L[:, 2].min()
    front = L[:, 2].max() - (-0.015)
    back = -0.015 - L[:, 2].min()
    print(f'{name}: knee cut y {ky}: width {w:.4f}, depth {dep:.4f}, front radius {front:.4f}, back {back:.4f}')
    prof = []
    for dy in (-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06):
        lps = loops(p, tris0[leg0], np.array([0, ky + dy, 0]), np.array([0, 1.0, 0]))
        if not lps:
            continue
        L = leg_loop(lps, np.array([0.115, ky + dy, -0.015]))
        mid = np.abs(L[:, 0] - L[:, 0].mean()) < 0.02
        prof.append(f'{dy:+.2f}: {L[mid, 2].max():.4f}' if mid.any() else f'{dy:+.2f}: -')
    print(f'  front z at the middle of the leg by height from the knee: {", ".join(prof)}')

data = np.load(os.path.join(d, f'{step}.npz'))
heads = np.load(os.path.join(d, 'heads-2.npz'))
p, t = data['points'], data['tris']
leg = (data['thigh_L'] + data['shin_L'] + data['foot_L'] + data['hips'])[t].mean(axis=1) > 0.9
t = t[leg]
K, H, A = heads['shin_L'], heads['thigh_L'], heads['foot_L']
Td, Sd = unit(H - K), unit(A - K)
axis = unit(np.cross(Td, Sd))
out = -unit(Td + Sd)
across = unit(Td - Sd)
lps = loops(p, t, K, across)
L = leg_loop(lps, K)
along_out = (L - K) @ out
along_axis = (L - K) @ axis
print(f'bind {step}: bend angle {np.degrees(np.arccos(Td @ Sd)):.1f} deg, knee {K.round(4)}')
print(f'  bisector cut: width {along_axis.max() - along_axis.min():.4f}, front reach {along_out.max():.4f}, back reach {-along_out.min():.4f}')
# The thigh top and the shin front radii: cuts across each bone 0.06 units from the joint.
for nm, dvec in (('thigh', Td), ('shin', Sd)):
    c = K + 0.06 * dvec
    lps = loops(p, t, c, dvec)
    Lb = leg_loop(lps, c)
    print(f'  {nm} cut 0.06 from the joint: width {np.ptp((Lb - c) @ axis):.4f}, outer radius {((Lb - c) @ out).max():.4f}')
# The side cut: the outline in the plane of the bend.
for off in (-0.02, 0.0, 0.02):
    lps = loops(p, t, K + off * axis, axis)
    Ls = leg_loop(lps, K + off * axis)
    rel = Ls - K
    near = np.linalg.norm(rel, axis=1) < 0.12
    front = (rel @ out) > 0.0
    worst = 0.0
    n = len(Ls)
    for i in range(n):
        if not (near[i] and front[i]):
            continue
        a, b, c2 = Ls[i - 1], Ls[i], Ls[(i + 1) % n]
        u, v = b - a, c2 - b
        if np.linalg.norm(u) < 1e-6 or np.linalg.norm(v) < 1e-6:
            continue
        ang = np.degrees(np.arccos(np.clip(unit(u) @ unit(v), -1, 1)))
        worst = max(worst, ang)
    print(f'  side cut at {off:+.2f} along the bend axis: front reach {(rel @ out).max():.4f}, largest turn at one outline corner on the front {worst:.1f} deg')

# Bone-normal radii and a drawing of the side outlines.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
for nm, dvec in (('thigh', Td), ('shin', Sd)):
    nrm = unit(out - (out @ dvec) * dvec)
    for dist_ in (0.03, 0.06, 0.09):
        c = K + dist_ * dvec
        Lb = leg_loop(loops(p, t, c, dvec), c)
        print(f'  {nm} cut {dist_:.2f} from the joint: outer radius along its own normal {((Lb - c) @ nrm).max():.4f}, inner {-((Lb - c) @ nrm).min():.4f}, width {np.ptp((Lb - c) @ axis):.4f}')
fig, ax = plt.subplots(1, 2, figsize=(10, 5))
for off, col in ((-0.02, 'tab:blue'), (0.0, 'k'), (0.02, 'tab:red')):
    Ls = leg_loop(loops(p, t, K + off * axis, axis), K + off * axis)
    rel = Ls - K
    u, v = rel @ (-Sd), rel @ Td  # u: forward along the thigh normal... draw in the bend plane
    ax[1].plot(np.append(u, u[0]), np.append(v, v[0]), '-', color=col, lw=1)
    ax[1].plot(u, v, '.', color=col, ms=2)
ax[1].plot([0], [0], 'g+', ms=12)
ax[1].set_aspect('equal'); ax[1].set_xlim(-0.2, 0.15); ax[1].set_ylim(-0.12, 0.25)
ax[1].set_title(f'bind {step}: side cuts (x: -shin dir, y: thigh dir)')
pl = raw['points']
for off, col in ((-0.02, 'tab:blue'), (0.0, 'k'), (0.02, 'tab:red')):
    c = np.array([0.115 + off, 0.211, -0.015])
    Ls = leg_loop(loops(pl, tris0[leg0], c, np.array([1.0, 0, 0])), c)
    rel = Ls - c
    ax[0].plot(np.append(rel[:, 2], rel[0, 2]), np.append(rel[:, 1], rel[0, 1]), '-', color=col, lw=1)
    ax[0].plot(rel[:, 2], rel[:, 1], '.', color=col, ms=2)
ax[0].plot([0], [0], 'g+', ms=12)
ax[0].set_aspect('equal'); ax[0].set_xlim(-0.2, 0.15); ax[0].set_ylim(-0.25, 0.25)
ax[0].set_title('source stretched: side cuts (x: z forward, y: up)')
fig.savefig(os.path.join(d, f'side-{step}.png'), dpi=110)
print('wrote', os.path.join(d, f'side-{step}.png'))
