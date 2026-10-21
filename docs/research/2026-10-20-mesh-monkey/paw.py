"""Measures the left paw of the monkey mesh beyond the wrist: its middle, spread, and the normal of
the palm (the smallest principal direction, inward), in the units of the studio.

    uv run --no-project --with numpy python -I paw.py <mesh.npz>
"""
import sys

import numpy as np

v = np.load(sys.argv[1])['v']
shoulder = np.array([0.105, 0.59, -0.015])
elbow = np.array([0.178, 0.495, 0.003])
wrist = np.array([0.244, 0.403, 0.047])
axis = (wrist - elbow) / np.linalg.norm(wrist - elbow)
paw = v[((v - wrist) @ axis > 0.0) & (np.linalg.norm(v - wrist, axis=1) < 0.16) & (v[:, 0] > 0.2)
        & (v[:, 1] > 0.25) & (v[:, 1] < 0.42)]
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
