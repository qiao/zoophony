# Output: the joint places of `tools/mesh-rigs/panda.json`.
"""Measures the parts of the panda mesh for the joints of the rig config, in the units of the studio.

    uv run --no-project --with numpy python -I tools/rig/panda_measures.py <mesh.npz>

It prints the middle of the trunk cut at each height, the middle of the left leg cut at each
height, the middle line of the left arm, the left paw beyond the wrist (its middle, its spread,
the normal of the palm, and the tip), the stub tail, and the left ear.
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
    return [np.array(g) for g in loops.values() if len(g) >= 3 and keep(np.array(g).mean(0))]


print('trunk: the cut at each height, the loop across the middle plane')
for y in np.arange(0.17, 0.75, 0.02):
    for g in cut(1, y, lambda c: abs(c[0]) < 0.05):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle z {(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

print('left leg: the cut at each height')
for y in np.arange(0.01, 0.17, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.03):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}, widths {np.ptp(g[:, 0]):.3f} '
              f'{np.ptp(g[:, 2]):.3f}')
foot = v[(v[:, 0] > 0.03) & (v[:, 1] < 0.06)]
print(f'  left foot below y 0.06: toe tip {foot[np.argmax(foot[:, 2])].round(4)}, heel '
      f'{foot[np.argmin(foot[:, 2])].round(4)}')

print('left arm: the middle of the cut at each x (vertical planes), the loop of the arm')
for x in np.arange(0.18, 0.33, 0.01):
    for g in cut(0, x, lambda c: c[1] > 0.34 and c[1] < 0.7):
        print(f'  x {x:.2f}: y {g[:, 1].min():.3f}..{g[:, 1].max():.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 1].min() + g[:, 1].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')
print('left arm: the middle of the cut at each height, the loop of the free arm')
for y in np.arange(0.36, 0.49, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.2):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f} middle {(g[:, 0].min() + g[:, 0].max()) / 2:.3f} '
              f'{(g[:, 2].min() + g[:, 2].max()) / 2:+.3f}')

# The paw: the vertices beyond the plane of the wrist across the arm line.
shoulder = np.array([0.158, 0.609, -0.024])
wrist = np.array([0.286, 0.436, 0.064])
axis = (wrist - shoulder) / np.linalg.norm(wrist - shoulder)
paw = v[((v - wrist) @ axis > 0.0) & (np.linalg.norm(v - wrist, axis=1) < 0.15) & (v[:, 0] > 0.24) & (v[:, 1] > 0.345)]
mid = paw.mean(0)
_, s, vt = np.linalg.svd(paw - mid)
normal = vt[2] if vt[2][0] < 0 else -vt[2]
tip = paw[np.argmax((paw - wrist) @ axis)]
print(f'left arm line: shoulder {shoulder} wrist {wrist} axis {axis.round(4)}, length '
      f'{np.linalg.norm(wrist - shoulder):.4f}')
print(f'left paw: {len(paw)} vertices beyond the wrist, middle {mid.round(4)}, spread {s.round(3)}, '
      f'normal of the palm (smallest direction, inward) {normal.round(3)}, the second direction '
      f'{vt[1].round(3)}, the first {vt[0].round(3)}, tip along the arm {tip.round(4)}, lowest '
      f'{paw[np.argmin(paw[:, 1])].round(4)}, the farthest along the arm '
      f'{((paw - wrist) @ axis).max():.4f}')

tail = v[(v[:, 2] < -0.19) & (np.abs(v[:, 0]) < 0.08) & (v[:, 1] < 0.4) & (v[:, 1] > 0.18)]
print(f'tail: {len(tail)} vertices with z < -0.19; box {tail.min(0).round(4)} {tail.max(0).round(4)}')
for z in np.arange(-0.19, -0.245, -0.01):
    band = tail[np.abs(tail[:, 2] - z) < 0.005]
    if len(band):
        print(f'  z {z:+.3f}: y {band[:, 1].min():.3f}..{band[:, 1].max():.3f} x '
              f'{band[:, 0].min():+.3f}..{band[:, 0].max():+.3f}')
print('  tail tip (back-most)', tail[np.argmin(tail[:, 2])].round(4), 'lowest',
      tail[np.argmin(tail[:, 1])].round(4))

ear = v[(v[:, 0] > 0.06) & (v[:, 1] > 0.9)]
print(f'left ear and the top of the head above y 0.9: {len(ear)} vertices, box {ear.min(0).round(4)} '
      f'{ear.max(0).round(4)}')
for y in np.arange(0.90, 1.001, 0.01):
    for g in cut(1, y, lambda c: c[0] > 0.06):
        print(f'  y {y:.2f}: x {g[:, 0].min():+.3f}..{g[:, 0].max():+.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f}')
print('  ear tip (highest)', ear[np.argmax(ear[:, 1])].round(4))
for x in np.arange(0.08, 0.18, 0.01):
    for g in cut(0, x, lambda c: c[1] > 0.88):
        print(f'  x {x:.2f}: y {g[:, 1].min():.3f}..{g[:, 1].max():.3f} z {g[:, 2].min():+.3f}..'
              f'{g[:, 2].max():+.3f}')
head = v[v[:, 1] > 0.7]
print('head: the highest vertex at |x| < 0.03:', head[np.abs(head[:, 0]) < 0.03][:, 1].max().round(4))
