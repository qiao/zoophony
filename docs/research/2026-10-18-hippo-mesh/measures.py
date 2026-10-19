"""Measures the parts of the hippo mesh for the joints of the rig config, in the units of the
studio (1 unit from the soles to the top of the ears, +z forward, +x the left side).

    uv run --no-project --with numpy python -I measures.py <mesh.npz>
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']


def cut(axis, h, keep):
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
    return [np.array(g) for g in loops.values() if len(g) >= 3 and keep(np.array(g).mean(0))]


def box(g):
    return (f'x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} y {g[:, 1].min():.3f}..{g[:, 1].max():.3f} '
            f'z {g[:, 2].min():+.3f}..{g[:, 2].max():+.3f}')


print('trunk: the cut at each height, the loop across the middle plane')
for y in np.arange(0.11, 0.73, 0.02):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.05):
        print(f'  y {y:.2f}: {box(g)} middle z {(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

print('left leg: the cut at each height')
for y in np.arange(0.005, 0.16, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.03):
        print(f'  y {y:.3f}: {box(g)} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}, widths {np.ptp(g[:, 0]):.3f} '
              f'{np.ptp(g[:, 2]):.3f}')
foot = v[(v[:, 0] > 0.03) & (v[:, 1] < 0.04)]
print(f'  left foot below y 0.04: toe tip {foot[np.argmax(foot[:, 2])].round(4)}, heel '
      f'{foot[np.argmin(foot[:, 2])].round(4)}')
print('crotch: the lowest vertex near the middle plane', v[np.abs(v[:, 0]) < 0.03][:, 1].min().round(4))

print('left leg: cuts at each x across the leg (x 0.06 to 0.22)')
for x in np.arange(0.06, 0.225, 0.02):
    for g in cut(0, x, lambda c: c[1] < 0.2):
        print(f'  x {x:.2f}: {box(g)}')

tail = v[(v[:, 2] < -0.19) & (np.abs(v[:, 0]) < 0.06) & (v[:, 1] < 0.26)]
print(f'tail and haunch: {len(tail)} vertices with z < -0.19, |x| < 0.06, y < 0.26: box {tail.min(0).round(4)} {tail.max(0).round(4)}')
for y in np.arange(0.15, 0.26, 0.01):
    band = v[(np.abs(v[:, 1] - y) < 0.005) & (np.abs(v[:, 0]) < 0.05)]
    if len(band):
        print(f'  y {y:.2f}: back-most z {band[:, 2].min():+.3f}')
for z in np.arange(-0.2, -0.245, -0.005):
    for g in cut(2, z, lambda c: abs(c[0]) < 0.05 and c[1] < 0.3):
        print(f'  z {z:+.3f}: {box(g)}')

ear = v[(v[:, 0] > 0.06) & (v[:, 1] > 0.93)]
print(f'left ear above y 0.93: {len(ear)} vertices, box {ear.min(0).round(4)} {ear.max(0).round(4)}')
for y in np.arange(0.93, 1.001, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.04):
        print(f'  y {y:.2f}: {box(g)}')
print('  ear tip (highest)', ear[np.argmax(ear[:, 1])].round(4))
head = v[v[:, 1] > 0.7]
mid = head[np.abs(head[:, 0]) < 0.03]
print('head: the highest vertex at |x| < 0.03:', mid[:, 1].max().round(4))
print('head: the front-most vertex', head[np.argmax(head[:, 2])].round(4))
for z in np.arange(0.12, 0.28, 0.02):
    for g in cut(2, z, lambda c: c[1] > 0.65):
        print(f'  head z {z:+.2f}: {box(g)}')
