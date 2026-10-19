"""Counts the vertices of the free left arm beyond each plane |x| = split (free_arm() of
tools/blender/rig_mesh.py), with the lowest and highest y and the smallest z.

    uv run --no-project --with numpy python -I free_arm.py <mesh.npz>
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
tip = np.array([0.2614, 0.3362, 0.1923])
for split in (0.10, 0.105, 0.11, 0.115, 0.12, 0.125, 0.13, 0.14):
    inside = v[:, 0] > split
    nb = [[] for _ in range(len(v))]
    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if inside[a] and inside[b]:
                nb[a].append(b); nb[b].append(a)
    start = int(np.argmin(np.linalg.norm(v - tip, axis=1)))
    seen = {start}; stack = [start]
    while stack:
        for n in nb[stack.pop()]:
            if n not in seen:
                seen.add(n); stack.append(n)
    p = v[sorted(seen)]
    print(f'split {split}: {len(p)} vertices, y {p[:,1].min():.3f}..{p[:,1].max():.3f}, z {p[:,2].min():+.3f}..{p[:,2].max():+.3f}, x max {p[:,0].max():.3f}; beyond plane total {int(inside.sum())}')
