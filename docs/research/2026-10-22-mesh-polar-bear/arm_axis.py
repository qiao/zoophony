"""Cuts the left arm of a mesh of the user (here the polar bear) across an axis and prints each loop of each cut (its middle
and its widths across the axis), in units of the studio.

    python -I arm_axis.py <mesh.npz> <x_min> <y_min> <y_max> [<ax> <ay> <az> <px> <py> <pz>]

The polar bear: arm_axis.py <mesh.npz> 0.2 0.3 0.5 (arm-axis.txt).

The free arm is the part of the mesh at x > x_min and y_min < y < y_max. With no axis, the axis is
the first principal direction of the free arm, through its middle. With an axis and a point, the
cuts are across that axis, and s is the distance along it from the point.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
x_min, y_min, y_max = map(float, sys.argv[2:5])
arm = v[(v[:, 0] > x_min) & (v[:, 1] > y_min) & (v[:, 1] < y_max)]
if len(sys.argv) > 5:
    axis = np.array(list(map(float, sys.argv[5:8])))
    axis /= np.linalg.norm(axis)
    mid = np.array(list(map(float, sys.argv[8:11])))
else:
    mid = arm.mean(0)
    _, _, vt = np.linalg.svd(arm - mid)
    axis = vt[0] if vt[0][1] < 0 else -vt[0]
print('free arm vertices', len(arm), 'point', mid.round(4), 'axis (down the arm)', axis.round(4))
s = (arm - mid) @ axis
print('free arm along the axis', s.min().round(4), s.max().round(4))
side = np.cross(axis, [0, 0, 1.0])
side /= np.linalg.norm(side)
up = np.cross(axis, side)
for h in np.arange(-0.30, s.max() + 0.005, 0.01):
    d = (v - mid) @ axis - h
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
    for g in loops.values():
        g = np.array(g)
        c = g.mean(0)
        if len(g) < 3 or c[0] < 0.05:
            continue
        w1 = np.ptp((g - c) @ side)
        w2 = np.ptp((g - c) @ up)
        text.append(f'middle {c.round(3)} widths {w1:.3f} {w2:.3f} n {len(g)}')
    print(f's={h:+.3f}: ' + ' | '.join(text))
