"""Prints the loops of single cuts of the dog mesh at given values of one axis.

    python -I cut_at.py <mesh.npz> <axis> <value>...
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
axis = 'xyz'.index(sys.argv[2])
others = [a for a in range(3) if a != axis]
for h in map(float, sys.argv[3:]):
    d = v[:, axis] - h
    points, parent = {}, {}

    def root(k):
        while parent[k] != k:
            k = parent[k]
        return k

    for t in tris:
        keys = []
        for i in range(3):
            a, b = t[i], t[(i + 1) % 3]
            if (d[a] < 0) != (d[b] < 0):
                key = (min(a, b), max(a, b))
                points[key] = v[a] + (v[b] - v[a]) * (d[a] / (d[a] - d[b]))
                parent.setdefault(key, key)
                keys.append(key)
        if len(keys) == 2:
            parent[root(keys[1])] = root(keys[0])
    loops = {}
    for key, p in points.items():
        loops.setdefault(root(key), []).append(p)
    text = []
    for g in sorted(loops.values(), key=lambda g: np.mean([p[others[0]] for p in g])):
        g = np.array(g)
        a, b = others
        text.append(f"{'xyz'[a]} {g[:, a].min():+.3f}..{g[:, a].max():+.3f} {'xyz'[b]} {g[:, b].min():+.3f}..{g[:, b].max():+.3f}")
    print(f"{'xyz'[axis]}={h:.3f}: " + ' | '.join(text))
