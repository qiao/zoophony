"""Measures the parts of the elephant mesh for the joints of the rig config, in the units of the
studio (1 unit from the soles to the top of the ears, +z forward, +x the left side).

    uv run --no-project --with numpy python -I measures.py <mesh.npz>

The npz file comes from dump.py.
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


print('trunk of the body: the cut at each height, the widest loop across the middle plane')
for y in np.arange(0.15, 0.80, 0.02):
    loops = cut(1, y, lambda c: abs(c[0]) < 0.1 and c[2] < 0.15)
    if loops:
        g = max(loops, key=len)
        print(f'  y {y:.2f}: {box(g)} middle z {(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

print('left leg: the cut at each height')
for y in np.arange(0.005, 0.2, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.02 and c[2] < 0.1):
        print(f'  y {y:.3f}: {box(g)} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}, widths {np.ptp(g[:, 0]):.3f} '
              f'{np.ptp(g[:, 2]):.3f}')
foot = v[(v[:, 0] > 0.02) & (v[:, 1] < 0.04)]
print(f'  left foot below y 0.04: toe tip {foot[np.argmax(foot[:, 2])].round(4)}, heel '
      f'{foot[np.argmin(foot[:, 2])].round(4)}')
mid = v[(np.abs(v[:, 0]) < 0.02) & (v[:, 2] < 0.1) & (v[:, 2] > -0.2)]
print('crotch: the lowest vertex near the middle plane under the body', mid[:, 1].min().round(4))

tail = v[(v[:, 2] < -0.24) & (np.abs(v[:, 0]) < 0.05) & (v[:, 1] < 0.3)]
print(f'tail: {len(tail)} vertices with z < -0.24, |x| < 0.05, y < 0.3: box {tail.min(0).round(4)} '
      f'{tail.max(0).round(4)}')
for y in np.arange(0.11, 0.30, 0.02):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.05 and c[2] < -0.23):
        print(f'  y {y:.2f}: {box(g)}')

print('trunk of the nose: the cut at each height in front of z 0.15')
for y in np.arange(0.33, 0.76, 0.03):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.06 and c[2] > 0.15):
        print(f'  y {y:.2f}: {box(g)} middle {(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')
nose = v[(v[:, 2] > 0.18) & (np.abs(v[:, 0]) < 0.06)]
print(f'  the nose in front of z 0.18: lowest {nose[np.argmin(nose[:, 1])].round(4)}, front '
      f'{nose[np.argmax(nose[:, 2])].round(4)}')

print('tusks: the loops beside the root of the nose')
for y in np.arange(0.67, 0.75, 0.01):
    for g in cut(1, y, lambda c: 0.05 < c[0] < 0.12 and c[2] > 0.15):
        print(f'  y {y:.2f}: {box(g)}')

print('left ear: the cut at each height beside the head')
for y in np.arange(0.66, 1.0, 0.03):
    for g in cut(1, y, lambda c: c[0] > 0.09 and c[2] > -0.08 and c[1] > 0.6):
        print(f'  y {y:.2f}: {box(g)}')
ear = v[(v[:, 0] > 0.15) & (v[:, 1] > 0.65)]
print(f'  left ear beyond x 0.15 above y 0.65: box {ear.min(0).round(4)} {ear.max(0).round(4)}, '
      f'lowest {ear[np.argmin(ear[:, 1])].round(4)}')

print('head: the cut at each height, the loop across the middle plane')
for y in np.arange(0.62, 1.0, 0.03):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.06):
        print(f'  y {y:.2f}: {box(g)}')
strip = v[np.abs(v[:, 0]) < 0.03]
print('skull top: the highest vertex within 0.03 u of the middle plane', strip[np.argmax(strip[:, 1])].round(4))
eyes = v[(v[:, 1] > 0.8) & (v[:, 1] < 0.92) & (v[:, 2] > 0.1) & (np.abs(v[:, 0]) > 0.04)]
print(f'front of the head beside the middle: {len(eyes)} vertices, box {eyes.min(0).round(4)} {eyes.max(0).round(4)}')
