"""Measures the trunk of a mesh in meters from horizontal cuts: the width (x extent) of the cut
at the shoulder joints and at the hips joint, and the largest depth (z extent) of the cuts
between them. Each cut takes the largest loop across the middle plane.

    uv run --no-project --with numpy python -I trunk_cut.py <mesh.npz> <m/u> <shoulder y> <hips y>

The npz holds the vertices in the units of the rig (dump.py of
docs/research/2026-10-20-wolf-mesh/, then the proportions) and the triangles.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
scale, shoulder, hips = map(float, sys.argv[2:5])


def loop(y):
    """Gives the points of the largest loop of the cut at the height y that crosses x = 0."""
    d = v[:, 1] - y
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
    across = [np.array(g) for g in loops.values() if min(p[0] for p in g) < 0 < max(p[0] for p in g)]
    return max(across, key=len)


width_s = np.ptp(loop(shoulder)[:, 0]) * scale
width_h = np.ptp(loop(hips)[:, 0]) * scale
depths = [(np.ptp(loop(y)[:, 2]) * scale, y) for y in np.linspace(hips, shoulder, 40)]
depth, at = max(depths)
print(f'width at the shoulder joints {width_s:.4f} m, at the hips joint {width_h:.4f} m, '
      f'largest trunk depth {depth:.4f} m at y {at:.4f} u')
