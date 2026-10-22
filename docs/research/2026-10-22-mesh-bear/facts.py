"""Prints the facts of the welded bear mesh for the README: the connected parts, the open edges,
the edges with more than two faces, the faces with a corner below 10 degrees, and the box.

    uv run --no-project --with numpy python -I facts.py <mesh.npz>
"""
import sys
from collections import Counter

import numpy as np

m = np.load(sys.argv[1])
v, t = m['v'], m['tris']
parent = list(range(len(v)))


def root(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]
        a = parent[a]
    return a


for a, b, c in t:
    for x, y in ((a, b), (b, c)):
        parent[root(x)] = root(y)
parts = Counter(root(i) for i in range(len(v)))
print('vertices', len(v), 'triangles', len(t), 'parts', sorted(parts.values(), reverse=True))
edges = Counter(tuple(sorted(e)) for a, b, c in t for e in ((a, b), (b, c), (c, a)))
print('open edges', sum(1 for n in edges.values() if n == 1), 'edges with more than two faces',
      sum(1 for n in edges.values() if n > 2))
p = v[t]
small = 0
for k in range(3):
    e1 = p[:, (k + 1) % 3] - p[:, k]
    e2 = p[:, (k + 2) % 3] - p[:, k]
    cos = (e1 * e2).sum(1) / (np.linalg.norm(e1, axis=1) * np.linalg.norm(e2, axis=1) + 1e-12)
    small |= np.degrees(np.arccos(np.clip(cos, -1, 1))) < 10
print('faces with a corner below 10 degrees', int(small.sum()))
print('box', v.min(0).round(3), v.max(0).round(3))
