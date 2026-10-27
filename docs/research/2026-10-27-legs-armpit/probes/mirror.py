"""Writes a mirrored copy of a step dir (steps.py): x -> -x, the right leg weights and heads as
the left ones, and each face in the reverse order, so that the left-leg probes read the right leg.

    mirror.py <step dir> <out dir>
"""
import glob
import os
import shutil
import sys

import numpy as np

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(src, '*.npz')):
    d = dict(np.load(f))
    name = os.path.basename(f)
    if 'points' in d:
        d['points'] = d['points'] * [-1, 1, 1]
        d['tris'] = d['tris'][:, ::-1]
        for k in ('thigh', 'shin', 'foot'):
            d[f'{k}_L'] = d[f'{k}_R']
    else:
        for k in ('thigh', 'shin', 'foot'):
            if f'{k}_R' in d:
                d[f'{k}_L'] = d[f'{k}_R'] * [-1, 1, 1]
    np.savez(os.path.join(out, name), **d)
for f in glob.glob(os.path.join(src, '*.npy')):
    shutil.copy(f, out)
print('wrote', out)
