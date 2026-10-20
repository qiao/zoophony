"""Checks the faces of the neck blend zone of the head keep (`proportioned()` of
`tools/blender/rig_mesh.py`): each face with a corner inside the zone, on the source, on the
source with the factors alone (round wolf-shape), and on the source with the head kept. It
prints the smallest corner angle, the largest turn of a face normal from the source, and the
largest and smallest change of an edge length against the factors alone.

    uv run --no-project --with numpy python -I blend_faces.py <mesh.npz> <low> <high>

The npz holds the vertices of the source, 1 unit high (dump.py of
docs/research/2026-10-20-wolf-mesh/), and the triangles.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
low, high = float(sys.argv[2]), float(sys.argv[3])
S = np.array([1.2, 0.9, 1.0])


def smoothstep(x):
    t = np.clip((x - low) / (high - low), 0.0, 1.0)
    return t * t * (3 - 2 * t)


anchor = np.array([0.0, high, 0.0])
scaled = v * S
share = smoothstep(v[:, 1])[:, None]
kept = scaled * (1 - share) + (v + anchor * S - anchor) * share
inside = ((v[tris, 1] > low) & (v[tris, 1] < high)).any(axis=1)
faces = tris[inside]


def normals(p):
    n = np.cross(p[faces[:, 1]] - p[faces[:, 0]], p[faces[:, 2]] - p[faces[:, 0]])
    return n / np.linalg.norm(n, axis=1)[:, None]


def smallest(p):
    out = []
    for f in faces:
        a = []
        for i in range(3):
            e1 = p[f[(i + 1) % 3]] - p[f[i]]
            e2 = p[f[(i + 2) % 3]] - p[f[i]]
            a.append(np.degrees(np.arccos(np.clip(e1 @ e2 / np.linalg.norm(e1) / np.linalg.norm(e2), -1, 1))))
        out.append(min(a))
    return np.array(out)


def edges(p):
    return np.linalg.norm(p[faces] - p[np.roll(faces, 1, axis=1)], axis=2)


base = normals(v)
print(f'blend zone y {low} to {high} u: {len(faces)} faces with a corner inside')
for name, p in (('source', v), ('factors alone', scaled), ('head kept', kept)):
    turn = np.degrees(np.arccos(np.clip((normals(p) * base).sum(axis=1), -1, 1)))
    print(f'  {name}: smallest corner angle {smallest(p).min():.1f} deg (median '
          f'{np.median(smallest(p)):.1f}), largest normal turn from the source {turn.max():.1f} deg')
ratio = edges(kept) / edges(scaled)
print(f'  edge length of head kept against factors alone: {ratio.min():.3f} to {ratio.max():.3f}')
print(f'  height of the zone: {np.ptp(kept[faces][:, :, 1]):.4f} u with the head kept, '
      f'{np.ptp(scaled[faces][:, :, 1]):.4f} u with the factors alone')
