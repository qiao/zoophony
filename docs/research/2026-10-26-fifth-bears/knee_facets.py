"""Measures the facets of the seated left knee of a rig step (steps.py), in units and degrees.

    uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-bears/knee_facets.py <step dir>...

The knee zone holds the faces whose middle lies within 0.1 units of the knee joint of the bind,
on the faces of the hips and the left leg. It gives the number of faces, the longest edge, the
largest face, the faces with an edge above 0.1, and the angle between the normals of two faces
that share an edge (p90 and the largest), with the count above 40 degrees (a hard ridge).
"""
import glob
import os
import sys

import numpy as np

for d in sys.argv[1:]:
    step = sorted(glob.glob(os.path.join(d, '*crease_relax.npz')))[-1]
    data = np.load(step)
    knee = np.load(os.path.join(d, 'heads-2.npz'))['shin_L']
    p, t = data['points'], data['tris']
    lower = data['thigh_L'] + data['shin_L'] + data['foot_L'] + data['hips']
    keep = (lower[t].mean(axis=1) > 0.9) & (np.linalg.norm(p[t].mean(axis=1) - knee, axis=1) < 0.1)
    zone = np.nonzero(keep)[0]
    c = p[t[zone]]
    edges = np.stack([np.linalg.norm(c[:, (k + 1) % 3] - c[:, k], axis=1) for k in range(3)], 1)
    n = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    area = np.linalg.norm(n, axis=1) / 2
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    owner = {}
    angles = []
    for i, f in enumerate(zone):
        for k in range(3):
            key = tuple(sorted((int(t[f][k]), int(t[f][(k + 1) % 3]))))
            if key in owner:
                j = owner[key]
                angles.append(np.degrees(np.arccos(np.clip(n[i] @ n[j], -1, 1))))
            else:
                owner[key] = i
    angles = np.array(angles)
    print(f'{os.path.basename(d.rstrip("/"))}: faces {len(zone)}, longest edge {edges.max():.3f}, '
          f'largest face {area.max() * 1e4:.1f} cm2-u, edges above 0.1: {(edges.max(axis=1) > 0.1).sum()} '
          f'faces | ridge p90 {np.percentile(angles, 90):.1f} max {angles.max():.1f}, '
          f'above 40: {(angles > 40).sum()}')
