"""Measures the left paw of the rhino mesh beyond the wrist: its middle, spread, and the normal of
the palm (the smallest principal direction, inward), in the units of the studio.

    uv run --no-project --with numpy python -I paw.py <mesh.npz>
"""
import sys

import numpy as np

v = np.load(sys.argv[1])['v']
shoulder = np.array([0.175, 0.575, -0.045])
elbow = np.array([0.205, 0.45, -0.04])
wrist = np.array([0.215, 0.335, -0.002])
axis = (wrist - elbow) / np.linalg.norm(wrist - elbow)
# The paw is the free arm beyond the wrist plane, in front of the haunch (z > -0.07).
paw = v[((v - wrist) @ axis > 0.0) & (np.linalg.norm(v - wrist, axis=1) < 0.12) & (v[:, 0] > 0.15)
        & (v[:, 2] > -0.07)]
mid = paw.mean(0)
_, s, vt = np.linalg.svd(paw - mid)
normal = vt[2] if vt[2][0] < 0 else -vt[2]
tip = paw[np.argmax((paw - wrist) @ axis)]
print(f'forearm axis {axis.round(4)}; upper arm {np.linalg.norm(elbow - shoulder):.4f}, forearm '
      f'{np.linalg.norm(wrist - elbow):.4f}')
print(f'paw: {len(paw)} vertices beyond the wrist, middle {mid.round(4)}, spread {s.round(3)}, '
      f'normal of the palm {normal.round(3)}, second {vt[1].round(3)}, first {vt[0].round(3)}, '
      f'tip {tip.round(4)}, lowest {paw[np.argmin(paw[:, 1])].round(4)}, farthest '
      f'{((paw - wrist) @ axis).max():.4f}')
print(f'reach shoulder to the middle of the paw {np.linalg.norm(mid - shoulder):.4f} u')
for k in np.argsort(-((paw - wrist) @ axis))[:8]:
    print('  far vertex', paw[k].round(4), f'{(paw[k] - wrist) @ axis:.4f}')
