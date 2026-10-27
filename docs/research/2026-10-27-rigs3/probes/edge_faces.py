"""Prints the faces at named edges of a step dir (steps.py): their corners, the move of each corner
in the knee smoothing (step 12 to 13, in mm of the unit 1.63455 m), the place along the shin and
the inner side from the knee joint, the corner angles, and the normals turn of each edge of the faces.

    edge_faces.py <step dir> <a-b,...>
"""
import glob
import os
import sys

import numpy as np

d = sys.argv[1]
files = sorted(glob.glob(os.path.join(d, '[0-9]*.npz')))
before = np.load([f for f in files if os.path.basename(f).startswith('12')][0])['points']
data = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
p, t = data['points'], data['tris']
heads = np.load(os.path.join(d, 'heads-2.npz'))
K = heads['shin_L']


def unit(v):
    return v / np.linalg.norm(v)


S, T = unit(heads['foot_L'] - K), unit(heads['thigh_L'] - K)
inner = unit(T + S)
n = np.cross(p[t][:, 1] - p[t][:, 0], p[t][:, 2] - p[t][:, 0])
n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
n0 = np.cross(before[t][:, 1] - before[t][:, 0], before[t][:, 2] - before[t][:, 0])
n0 /= np.maximum(np.linalg.norm(n0, axis=1, keepdims=True), 1e-12)
unit_mm = 1634.55
for e in sys.argv[2].split(','):
    a, b = (int(v) for v in e.split('-'))
    fs = np.nonzero((t == a).any(axis=1) & (t == b).any(axis=1))[0]
    print(f'edge {a}-{b}: faces {fs.tolist()}, turn {np.degrees(np.arccos(np.clip(n[fs[0]] @ n[fs[1]], -1, 1))):.1f} (before {np.degrees(np.arccos(np.clip(n0[fs[0]] @ n0[fs[1]], -1, 1))):.1f})')
    verts = sorted({int(v) for f in fs for v in t[f]})
    for v in verts:
        m = (p[v] - before[v]) * unit_mm
        print(f'  v{v}: move {np.linalg.norm(m):5.1f} mm, along shin {(before[v] - K) @ S:6.3f}, inner {(before[v] - K) @ inner:6.3f}, thigh {data["thigh_L"][v]:.2f} shin {data["shin_L"][v]:.2f}')
    for f in fs:
        c = p[t[f]]
        ang = [np.degrees(np.arccos(np.clip(unit(c[(k + 1) % 3] - c[k]) @ unit(c[(k + 2) % 3] - c[k]), -1, 1))) for k in range(3)]
        lens = [np.linalg.norm(c[(k + 1) % 3] - c[k]) for k in range(3)]
        print(f'  face {f}: {t[f].tolist()} corners {np.round(ang, 1).tolist()} edges {np.round(lens, 3).tolist()}')
