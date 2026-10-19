"""Counts the parts, the open edges, the edges with more than two faces, and the thin faces of the
welded beaver mesh (the npz file of dump.py).

    uv run --no-project --with numpy python -I topology.py <mesh.npz>
"""
import sys
from collections import Counter

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
edges = Counter()
for t in tris:
    for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
        edges[(min(a, b), max(a, b))] += 1
parent = list(range(len(v)))


def root(k):
    while parent[k] != k:
        parent[k] = parent[parent[k]]
        k = parent[k]
    return k


for a, b in edges:
    parent[root(a)] = root(b)
parts = Counter(root(k) for k in range(len(v)))
print('vertices', len(v), 'triangles', len(tris))
print('parts', len(parts), 'sizes', sorted(parts.values(), reverse=True))
for r, n in parts.items():
    if n < max(parts.values()):
        p = v[[k for k in range(len(v)) if root(k) == r]]
        print('  small part', n, 'box', p.min(0).round(3), p.max(0).round(3))
openings = [e for e, n in edges.items() if n == 1]
print('open edges', len(openings), 'edges with more than two faces', sum(1 for n in edges.values() if n > 2))
if openings:
    mids = np.array([(v[a] + v[b]) / 2 for a, b in openings])
    print('  open edge middles box', mids.min(0).round(3), mids.max(0).round(3))
small = 0
for t in tris:
    p = v[t]
    for i in range(3):
        a, b = p[(i + 1) % 3] - p[i], p[(i + 2) % 3] - p[i]
        c = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12)
        if np.degrees(np.arccos(np.clip(c, -1, 1))) < 10:
            small += 1
            break
print('faces with a corner angle below 10 degrees', small)
