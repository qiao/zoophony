"""Gives the gap of each vertex of the long tail of the mouse from the line of the two tail bones
(root, bend, tip), as `tail_weights()` of tools/blender/rig_mesh.py measures it.

    uv run --no-project --with numpy python -I tail_gap.py <mesh.npz> <root> <bend> <tip>
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v = m['v']
line = [np.array([float(x) for x in a.split(',')]) for a in sys.argv[2:5]]


def place(points, line):
    best = np.full(len(points), np.inf)
    at = np.zeros(len(points))
    start = 0.0
    for a, b in zip(line, line[1:]):
        d = b - a
        length = float(np.linalg.norm(d))
        t = np.clip((points - a) @ d / (length * length), 0.0, 1.0)
        gap = np.linalg.norm(points - (a + t[:, None] * d), axis=1)
        near = gap < best
        best[near] = gap[near]
        at[near] = start + t[near] * length
        start += length
    return at, best


tail = (v[:, 2] < -0.095) & (v[:, 1] < 0.2)
at, gap = place(v[tail], line)
print(f'{int(tail.sum())} vertices behind z -0.095 and below y 0.2; line length '
      f'{np.linalg.norm(line[1]-line[0]) + np.linalg.norm(line[2]-line[1]):.3f}')
for lo in np.arange(0, 0.6, 0.05):
    sel = (at >= lo) & (at < lo + 0.05)
    if sel.any():
        print(f'  place {lo:.2f}..{lo+0.05:.2f}: {int(sel.sum())} vertices, gap {gap[sel].min():.3f}..{gap[sel].max():.3f}')
far = np.argsort(-gap)[:10]
for k in far:
    print('  far', v[tail][k].round(3), f'gap {gap[k]:.3f} place {at[k]:.3f}')
