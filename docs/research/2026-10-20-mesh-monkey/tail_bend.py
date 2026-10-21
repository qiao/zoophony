"""Finds the bend of the two tail bones of the monkey that gives the smallest largest gap of the
tail vertices from the line (root, bend, tip). The bend is a tail vertex.

    uv run --no-project --with numpy python -I tail_bend.py <mesh.npz>
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v = m['v']
root = np.array([0, 0.29, -0.08])
tip = np.array([-0.185, 0.083, -0.131])


def gaps(points, line):
    best = np.full(len(points), np.inf)
    for a, b in zip(line, line[1:]):
        d = b - a
        t = np.clip((points - a) @ d / (d @ d), 0.0, 1.0)
        best = np.minimum(best, np.linalg.norm(points - (a + t[:, None] * d), axis=1))
    return best


tail = v[(v[:, 2] < -0.06) & (v[:, 1] < 0.265)]
print("tail vertices", len(tail))
# The middle line of the tail: the mean of the tail vertices near each candidate point.
rows = []
for c in tail:
    near = tail[np.linalg.norm(tail - c, axis=1) < 0.02].mean(0)
    near[1] = max(near[1], 0.012)
    g = gaps(tail, [root, near, tip])
    rows.append((g.max(), np.percentile(g, 90), near))
rows.sort(key=lambda r: r[0])
for r in rows[:8]:
    print(f'bend {r[2].round(3)}: largest gap {r[0]:.3f}, 90% {r[1]:.3f}')
