"""Counts the faces of the left leg that cross the knee joint in the stretched source of a rig
(the step `01-source-long.npz` of steps.py), in units.

    uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-bears/long_faces.py <step dir> <knee y>

The knee y is the height of the knee joint in the stretched source (0.201 for the polar bear: the
joint at 0.15 of the source, the leg factor 1.6, and the rise 0.129). A face crosses the joint when
its corners lie more than 2 cm below and above it.
"""
import os
import sys

import numpy as np

d = np.load(os.path.join(sys.argv[1], '01-source-long.npz'))
knee = float(sys.argv[2])
p, t = d['points'], d['tris']
y = p[t][:, :, 1]
leg = (d['thigh_L'] + d['shin_L'])[t].max(axis=1) > 0.05
leg &= p[t][:, :, 0].mean(axis=1) > 0.03
cross = leg & (y.min(axis=1) < knee - 0.02) & (y.max(axis=1) > knee + 0.02)
edges = np.stack([np.linalg.norm(p[t][:, k] - p[t][:, (k + 1) % 3], axis=1) for k in range(3)], 1)
span = y.max(axis=1) - y.min(axis=1)
print(f'left leg faces {leg.sum()}, faces across the knee joint {cross.sum()}, with a height span '
      f'above 0.15: {(cross & (span > 0.15)).sum()}')
print(f'longest edge: median {np.median(edges[cross].max(axis=1)):.3f} across the joint, '
      f'{np.median(edges[leg].max(axis=1)):.3f} on all leg faces, largest {edges[cross].max():.3f}')
