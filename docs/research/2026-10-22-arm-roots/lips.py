"""lips.py <dump base> <corners.json> <src.npz> <box x0,x1,y0,y1,z0,z1 (left side; mirrored for R)> [ring] [min depth u]:
the trunk vertices of the source (rig arm weight < 0.5) in the box of each side whose depth below the convex hull of the trunk vertices within ring is above the limit. Prints the vertex lists and the arm vertex list near them."""
import json, sys
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
base = sys.argv[1]; cs = json.load(open(sys.argv[2])); V = np.load(sys.argv[3])['v']; tree = cKDTree(V)
b = list(map(float, sys.argv[4].split(','))); ring = float(sys.argv[5]) if len(sys.argv) > 5 else 0.09; lim = float(sys.argv[6]) if len(sys.argv) > 6 else 0.004
m = json.load(open(base + '.json')); C = np.array(m['corners']).reshape(-1, 3); arm = np.array(m['arm'])
w = np.full(len(V), np.nan)
for f, t in enumerate(C):
    if f >= len(cs): continue
    for i, v in enumerate(t):
        s = int(tree.query(cs[f]['s'][i])[1]); w[s] = arm[v] if np.isnan(w[s]) else max(w[s], arm[v])
isarm = np.nan_to_num(w, nan=1.0) >= 0.5
for side, sign in (('L', 1), ('R', -1)):
    X = V * [sign, 1, 1]
    inbox = [i for i, p in enumerate(X) if b[0] < p[0] < b[1] and b[2] < p[1] < b[3] and b[4] < p[2] < b[5] and not isarm[i]]
    rows = []
    for i in inbox:
        nb = [j for j in tree.query_ball_point(V[i], ring) if not isarm[j]]
        if len(nb) < 6: continue
        h = ConvexHull(V[nb]); d = -float((h.equations[:, :3] @ V[i] + h.equations[:, 3]).max())
        if d > lim: rows.append((d, i))
    rows.sort(reverse=True)
    print(side, 'lips:', ','.join(str(i) for _, i in rows))
    print('   ', ' '.join(f'{i}:{d*165:.1f}cm' for d, i in rows))
    near = sorted({j for _, i in rows for j in tree.query_ball_point(V[i], ring) if isarm[j]})
    print(side, 'arm near:', ','.join(map(str, near)))
