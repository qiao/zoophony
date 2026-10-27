"""Prints the turn of named edges after each saved rig step (steps.py).

    edge_steps.py <step dir> <a-b,a-b,...>
"""
import glob
import os
import sys

import numpy as np

d = sys.argv[1]
pairs = [tuple(int(v) for v in e.split('-')) for e in sys.argv[2].split(',')]
for f in sorted(glob.glob(os.path.join(d, '[0-9]*.npz'))):
    data = np.load(f)
    p, t = data['points'], data['tris']
    c = p[t]
    n = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    out = []
    for a, b in pairs:
        fs = np.nonzero((t == a).any(axis=1) & (t == b).any(axis=1))[0]
        if len(fs) != 2:
            out.append(f'{a}-{b}: -')
            continue
        ang = np.degrees(np.arccos(np.clip(n[fs[0]] @ n[fs[1]], -1, 1)))
        out.append(f'{a}-{b}: {ang:5.1f}')
    print(f'{os.path.basename(f)[:-4]:18s}', '  '.join(out))
