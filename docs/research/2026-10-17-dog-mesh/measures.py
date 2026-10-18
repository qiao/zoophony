"""Measures the parts of the dog mesh for the joints of the rig config, in the units of the studio.

    python -I measures.py <mesh.npz>

It prints the left paw beyond the wrist (its middle, its spread, the normal of the palm, and the
tip), the middle line of the tail, the middle line of the left ear flap, and the middle of the
trunk cut at each height.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']

wrist = np.array([0.223, 0.46, 0.178])
axis = np.array([0.4762, -0.6491, 0.5931])
paw = v[((v - wrist) @ axis > 0.0) & (np.linalg.norm(v - wrist, axis=1) < 0.12) & (v[:, 0] > 0.15)]
mid = paw.mean(0)
_, s, vt = np.linalg.svd(paw - mid)
normal = vt[2] if vt[2][0] < 0 else -vt[2]
tip = paw[np.argmax((paw - wrist) @ axis)]
print(f'left paw: {len(paw)} vertices beyond the wrist, middle {mid.round(4)}, spread {s.round(3)}, '
      f'normal of the palm (smallest direction, inward) {normal.round(3)}, the second direction '
      f'{vt[1].round(3)}, tip {tip.round(4)}, lowest {paw[np.argmin(paw[:, 1])].round(4)}')

tail = v[(v[:, 2] < -0.06) & (np.abs(v[:, 0]) < 0.06) & (v[:, 1] < 0.45)]
print(f'tail: {len(tail)} vertices with z < -0.06, |x| < 0.06, y < 0.45; box {tail.min(0).round(4)} '
      f'{tail.max(0).round(4)}')
for z in np.arange(-0.07, -0.31, -0.02):
    band = tail[np.abs(tail[:, 2] - z) < 0.01]
    if len(band):
        print(f'  z {z:+.2f}: y {band[:, 1].min():.3f}..{band[:, 1].max():.3f} '
              f'(middle {(band[:, 1].min() + band[:, 1].max()) / 2:.3f}) x {band[:, 0].min():+.3f}..{band[:, 0].max():+.3f}')
print('  tail tip (back-most)', tail[np.argmin(tail[:, 2])].round(4), 'lowest', tail[np.argmin(tail[:, 1])].round(4))

ear = v[(v[:, 0] > 0.085) & (v[:, 1] > 0.73) & (v[:, 1] < 0.9) & (v[:, 2] < 0.15)]
print(f'left ear flap below 0.9: {len(ear)} vertices, box {ear.min(0).round(4)} {ear.max(0).round(4)}')
for y in np.arange(0.89, 0.73, -0.02):
    band = ear[np.abs(ear[:, 1] - y) < 0.01]
    if len(band):
        print(f'  y {y:.2f}: x {band[:, 0].min():+.3f}..{band[:, 0].max():+.3f} z {band[:, 2].min():+.3f}..{band[:, 2].max():+.3f} middle {band.mean(0).round(3)}')
print('  ear tip (lowest)', ear[np.argmin(ear[:, 1])].round(4))
