"""Finds the ear flaps of the dog mesh: the connected parts of the faces whose corners all lie
below a cut height and outside a distance from the middle plane, and prints each part.

    python -I ear_parts.py <mesh.npz> <cut> <x_min>
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
cut, x_min = float(sys.argv[2]), float(sys.argv[3])
ok = (v[:, 1] < cut) & (np.abs(v[:, 0]) > x_min) & (v[:, 1] > 0.65)
parent = {}


def root(k):
    while parent.setdefault(k, k) != k:
        k = parent[k]
    return k


for t in tris:
    if ok[t].all():
        for a, b in ((t[0], t[1]), (t[1], t[2])):
            ra, rb = root(int(a)), root(int(b))
            if ra != rb:
                parent[ra] = rb
parts = {}
for k in parent:
    parts.setdefault(root(k), []).append(k)
for p in sorted(parts.values(), key=len, reverse=True)[:8]:
    q = v[p]
    print(len(p), 'box', q.min(0).round(3), q.max(0).round(3))
