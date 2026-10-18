"""Prints the vertices behind a plane by their distance to the tail line of the config and their
place along it: python -I tail_gap.py <mesh.npz> <config.json>"""
import json
import sys

import numpy as np

m = np.load(sys.argv[1])
v = m['v']
c = json.load(open(sys.argv[2]))
j = c['joints']
line = [np.array(j['tail']['head']), np.array(j['tail_tip']['head']), np.array(j['tail_tip']['tail'])]
best = np.full(len(v), np.inf)
place = np.zeros(len(v))
start = 0.0
for a, b in zip(line, line[1:]):
    d = b - a
    L = np.linalg.norm(d)
    t = np.clip((v - a) @ d / (L * L), 0, 1)
    gap = np.linalg.norm(v - (a + t[:, None] * d), axis=1)
    near = gap < best
    best[near] = gap[near]
    place[near] = start + t[near] * L
    start += L
behind = c['weights']['tail']['behind']
sel = (v[:, 2] <= behind) & (best < 0.14)
print('vertices behind z', behind, 'within 0.14 of the line:', int(sel.sum()))
for lo, hi in ((0, 0.04), (0.04, 0.06), (0.06, 0.08), (0.08, 0.1), (0.1, 0.12), (0.12, 0.14)):
    s = sel & (best >= lo) & (best < hi)
    q = v[s]
    if len(q):
        print(f'gap {lo:.2f}..{hi:.2f}: {int(s.sum())} vertices, |x| max {np.abs(q[:, 0]).max():.3f}, '
              f'place {place[s].min():.3f}..{place[s].max():.3f}, y {q[:, 1].min():.3f}..{q[:, 1].max():.3f}, z {q[:, 2].min():.3f}..{q[:, 2].max():.3f}')
# The haunch: the vertices with |x| > 0.05 behind the plane.
s = (v[:, 2] <= behind) & (np.abs(v[:, 0]) > 0.05)
q = v[s]
print('behind the plane and |x| > 0.05:', int(s.sum()), 'gap', best[s].min().round(3) if s.any() else '-', 'y', q[:, 1].min().round(3) if s.any() else '-', q[:, 1].max().round(3) if s.any() else '-')
