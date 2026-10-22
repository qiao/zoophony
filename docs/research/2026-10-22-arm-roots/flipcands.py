"""flipcands.py <npz> <box>: edges in a box whose flip raises the smallest angle of their two faces (Delaunay), with the fold and the move."""
import sys
import numpy as np
m = np.load(sys.argv[1]); P, C = m['v'], m['tris']; b = list(map(float, sys.argv[2].split(',')))
def angles(t):
    out = []
    for i in range(3):
        a, u, v = P[t[i]], P[t[(i + 1) % 3]] - P[t[i]], P[t[(i + 2) % 3]] - P[t[i]]
        out.append(np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1))))
    return out
E = {}
for f, t in enumerate(C):
    for i in range(3):
        a, c = int(t[i]), int(t[(i + 1) % 3]); E.setdefault((min(a, c), max(a, c)), []).append(f)
for (a, c), fs in E.items():
    mid = (P[a] + P[c]) / 2
    if len(fs) != 2 or not (b[0] < mid[0] < b[1] and b[2] < mid[1] < b[3] and b[4] < mid[2] < b[5]): continue
    f, g = fs
    x = [v for v in C[f] if v not in (a, c)][0]; y = [v for v in C[g] if v not in (a, c)][0]
    old = min(angles(C[f]) + angles(C[g])); new = min(angles([x, a, y]) + angles([x, y, c]))
    n1 = np.cross(P[C[f][1]] - P[C[f][0]], P[C[f][2]] - P[C[f][0]]); n2 = np.cross(P[C[g][1]] - P[C[g][0]], P[C[g][2]] - P[C[g][0]])
    fold = np.degrees(np.arccos(np.clip(n1 @ n2 / np.linalg.norm(n1) / np.linalg.norm(n2), -1, 1)))
    if new > old + 5:
        print(f'edge {a}-{c} -> {x}-{y}: min angle {old:.1f} -> {new:.1f}, fold {fold:.0f}, len {np.linalg.norm(P[a]-P[c])*165:.1f} -> {np.linalg.norm(P[x]-P[y])*165:.1f} cm, mid {mid.round(3).tolist()}')
