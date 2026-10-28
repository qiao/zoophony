"""Plots the region of pit.json of scratch/pit_probe.py: the faces projected on the plane of the
seam (z forward, height up), the vertices with their index and part code, thin faces red.
    uv run --no-project --with matplotlib --with numpy python -I scratch/pit_plot.py <pit.json> <out.png> [<key>...]"""
import json, sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
data = json.load(open(sys.argv[1]))
keys = sys.argv[3:] or ['Lfront']
fig, axes = plt.subplots(1, len(keys), figsize=(11 * len(keys), 9))
axes = np.atleast_1d(axes)
COL = {0: 'gray', 1: 'tab:blue', 3: 'tab:green', 4: 'tab:orange', 5: 'red', 11: 'tab:blue', 13: 'tab:green', 14: 'tab:orange', 15: 'red'}
for ax, key in zip(axes, keys):
    d = data[key]
    V = {int(k): v for k, v in d['verts'].items()}
    def xy(i):
        x, h, z = V[i][:3]
        return z * 100, h * 100
    for f in d['faces']:
        pts = np.array([xy(i) for i in f])
        P = np.array([V[i][:3] for i in f])
        ang = []
        for k in range(len(f)):
            a, b = P[k - 1] - P[k], P[(k + 1) % len(f)] - P[k]
            ang.append(math.degrees(math.acos(np.clip(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12), -1, 1))))
        thin = min(ang) < 12
        ax.fill(pts[:, 0], pts[:, 1], color='red' if thin else 'none', alpha=0.25, edgecolor='k', lw=0.6)
    for i, v in V.items():
        x, y = xy(i)
        ax.plot(x, y, 'o', ms=3, color=COL.get(v[3], 'k'))
        lab = f'{i}' + (f' r{v[4]}s{v[5]}{"f" if v[6] else ""}' if v[3] in (3, 13) else f' p{v[3]}')
        ax.text(x, y, lab, fontsize=6)
    ax.set_title(f'{key}: z forward (cm units), height (cm units); red faces: a corner under 12 deg')
    ax.set_aspect('equal')
fig.tight_layout()
fig.savefig(sys.argv[2], dpi=110)
