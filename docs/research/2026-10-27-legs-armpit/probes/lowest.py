"""Prints the lowest vertices of the last step of step dirs (steps.py), with the step that first
moves the lowest one.

    lowest.py <step dir>...
"""
import glob
import os
import sys

import numpy as np

for d in sys.argv[1:]:
    files = sorted(glob.glob(os.path.join(d, '[0-9]*.npz')))
    last = np.load(files[-1])['points']
    order = np.argsort(last[:, 1])[:3]
    print(d, [(int(v), round(float(last[v, 1]), 6)) for v in order])
    v = int(order[0])
    ys = [(os.path.basename(f)[:2], round(float(np.load(f)['points'][v, 1]), 6)) for f in files[1:]]
    print('   ', ys[0], ys[-3:])
