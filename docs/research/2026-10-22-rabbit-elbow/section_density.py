"""Compares two ratios of one section of a posed OBJ (`elbow-look.ts --dump`): the covariance of the
edge crossings, as `pnpm arm-look` takes it, and the covariance of the same closed contour
resampled at equal steps of length, which does not depend on the count of edges.

    section_density.py <obj> <joints json [s,e,w]> <place along the upper arm>...
"""
import json
import sys

import numpy as np

obj, joints = sys.argv[1:3]
V, F = [], []
for line in open(obj):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('f '):
        F.append([int(x) - 1 for x in line.split()[1:4]])
V, F = np.array(V), np.array(F)
s, e, w = (np.array(p) for p in json.loads(joints))
axis = (e - s) / np.linalg.norm(e - s)


def ratio(points):
    """Gives the narrow over the wide axis of the covariance of 2D points."""
    q = points - points.mean(axis=0)
    values = np.linalg.eigvalsh(q.T @ q / len(q))
    return float(np.sqrt(max(values[0], 0) / values[1]))


for at in map(float, sys.argv[3:]):
    point = s + at * (e - s)
    d = (V - point) @ axis
    e1 = np.cross(axis, [0, 1, 0])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(axis, e1)
    segs = []
    for tri in F:
        pts = []
        for a in range(3):
            b = (a + 1) % 3
            if d[tri[a]] * d[tri[b]] < 0:
                t = d[tri[a]] / (d[tri[a]] - d[tri[b]])
                pts.append(V[tri[a]] + t * (V[tri[b]] - V[tri[a]]))
        if len(pts) == 2 and np.linalg.norm((pts[0] + pts[1]) / 2 - point) < 0.08:
            segs.append([((p - point) @ e1, (p - point) @ e2) for p in pts])
    segs = np.array(segs)
    crossings = segs.reshape(-1, 2)
    # The contour resampled at steps of 1 mm along each segment.
    even = []
    for a, b in segs:
        n = max(1, int(np.linalg.norm(b - a) / 0.001))
        even += [a + (b - a) * k / n for k in range(n)]
    print(f'upper {at:.2f}: crossings {len(segs)} segments, ratio of the crossings '
          f'{ratio(crossings):.2f}, ratio of the even contour {ratio(np.array(even)):.2f}')
