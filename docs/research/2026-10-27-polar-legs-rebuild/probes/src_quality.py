"""Source quality of the new leg faces: small corners and edge turns, by side."""
import sys, numpy as np
from collections import defaultdict
from scipy.spatial import cKDTree
a = np.load('src-arms.npz'); b = np.load(sys.argv[1])
P, T = b['points'], b['tris']
d, _ = cKDTree(a['points']).query(P)
new = d > 1e-6
N = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); N /= np.linalg.norm(N, axis=1, keepdims=True)
def angles(t):
    out = []
    for k in range(3):
        u, v = P[t[(k + 1) % 3]] - P[t[k]], P[t[(k + 2) % 3]] - P[t[k]]
        out.append(np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1))))
    return min(out)
leg = new[T].any(axis=1)
ed = defaultdict(list)
for i, t in enumerate(T):
    for k in range(3):
        ed[tuple(sorted((t[k], t[(k + 1) % 3])))].append(i)
for s in (1, -1):
    f = np.nonzero(leg & (P[T].mean(axis=1)[:, 0] * s > 0))[0]
    mins = np.array([angles(T[i]) for i in f])
    fs = set(f.tolist())
    turns = [np.degrees(np.arccos(np.clip(N[x] @ N[y], -1, 1))) for e, (x, *r) in ed.items() if r and x in fs and r[0] in fs for y in r[:1]]
    turns = np.array(turns)
    print(f'side {s}: faces {len(f)}, corners <10: {(mins < 10).sum()}, <5: {(mins < 5).sum()}, min {mins.min():.1f}; edge turns >20: {(turns > 20).sum()}, >40: {(turns > 40).sum()}, max {turns.max():.1f}')
for e, fsx in ed.items():
    if len(fsx) == 2 and leg[fsx[0]] and leg[fsx[1]]:
        t = np.degrees(np.arccos(np.clip(N[fsx[0]] @ N[fsx[1]], -1, 1)))
        if t > 40:
            print(f'turn {t:.1f} at {P[e[0]].round(3)} - {P[e[1]].round(3)} new {new[list(e)]}')
