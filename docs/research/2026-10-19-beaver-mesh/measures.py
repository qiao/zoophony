"""Measures the parts of the beaver mesh for the joints of the rig config, in the units of the studio.

    uv run --no-project --with numpy python -I measures.py <mesh.npz>

It prints the middle of the trunk cut at each height, the middle of the left leg cut at each
height, the middle line of the left arm, the broad flat tail, the left ear, and the skull top.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']


def cut(axis, h, keep):
    """Gives the loops of the cut of the mesh at the plane v[axis] = h, as arrays of points, for
    the loops whose middle passes keep()."""
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
    return [np.array(g) for g in loops.values() if len(g) >= 6 and keep(np.array(g).mean(0))]


print('trunk: the cut at each height, the loop across the middle plane')
for y in np.arange(0.12, 0.80, 0.02):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.05 and c[2] > -0.05):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle z {(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

print('left leg: the cut at each height')
for y in np.arange(0.01, 0.15, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.04 and c[2] > -0.05):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}, widths {np.ptp(g[:, 0]):.3f} '
              f'{np.ptp(g[:, 2]):.3f}')
foot = v[(v[:, 0] > 0.04) & (v[:, 1] < 0.05) & (v[:, 2] > -0.05)]
print(f'  left foot below y 0.05: toe tip {foot[np.argmax(foot[:, 2])].round(4)}, heel '
      f'{foot[np.argmin(foot[:, 2])].round(4)}')
for x in np.arange(0.06, 0.24, 0.01):
    for g in cut(0, x, lambda c: c[1] < 0.3 and c[2] > -0.05):
        print(f'  leg x {x:.2f}: y {g[:, 1].min():.3f}..{g[:, 1].max():.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f}')

print('left arm: the middle of the cut at each x (vertical planes), the loop of the arm')
for x in np.arange(0.15, 0.32, 0.01):
    for g in cut(0, x, lambda c: c[1] > 0.33 and c[1] < 0.72 and c[2] > 0.0):
        print(f'  x {x:.2f}: y {g[:, 1].min():.3f}..{g[:, 1].max():.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 1].min() + g[:, 1].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')
print('left arm: the middle of the cut at each height, the loop of the free arm')
for y in np.arange(0.36, 0.70, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.17 and c[2] > 0.0):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

print('tail: the cut at each z behind the body, and the floor part')
for z in np.arange(-0.06, -0.40, -0.02):
    for g in cut(2, z, lambda c: c[1] < 0.3):
        print(f'  z {z:+.3f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} y {g[:, 1].min():.3f}..'
              f'{g[:, 1].max():.3f}')
for x in np.arange(-0.12, 0.13, 0.02):
    for g in cut(0, x, lambda c: c[1] < 0.25 and c[2] < -0.05):
        print(f'  x {x:+.3f}: z {g[:, 2].min():+.3f}..{g[:, 2].max():+.3f} y {g[:, 1].min():.3f}..'
              f'{g[:, 1].max():.3f}')
low = v[v[:, 2] < -0.06]
print('  tail tip (the back-most vertex)', low[np.argmin(low[:, 2])].round(4))

ear = v[(v[:, 0] > 0.1) & (v[:, 1] > 0.88) & (v[:, 2] < 0.2)]
print(f'left ear region: {len(ear)} vertices, box {ear.min(0).round(4)} {ear.max(0).round(4)}')
for y in np.arange(0.89, 0.97, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.1):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f}')
print('  ear tip (highest)', ear[np.argmax(ear[:, 1])].round(4))
head = v[v[:, 1] > 0.7]
strip = head[np.abs(head[:, 0]) < 0.03]
print('head: the highest vertex at |x| < 0.03:', strip[:, 1].max().round(4), 'at',
      strip[np.argmax(strip[:, 1])].round(4))
print('head: the front-most vertex at |x| < 0.03 (nose):', strip[np.argmax(strip[:, 2])].round(4))
print('head: the lowest vertex of the chin at |x| < 0.03 and z > 0.1:',
      v[(np.abs(v[:, 0]) < 0.03) & (v[:, 2] > 0.1) & (v[:, 1] > 0.6)][:, 1].min().round(4))
