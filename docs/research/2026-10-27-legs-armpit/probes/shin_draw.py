"""Draws the left leg near the knee of saved rig steps (steps.py), flat shaded, from the azimuths
of knee-cams.ts (0 the front of the bear, -90 its left side), at a low elevation.

    shin_draw.py <out.png> <az,az,...> <dir:step>... [--label <v,v,...>] [--radius r] [--first n]

Ring faces (a corner from index <first>, default 2073) have a blue tint. The labelled vertices
show their index. The light comes from the camera. A red line is a hard edge: two faces that
turn more than 40 degrees, the crease angle of the app. --el sets the elevation in degrees (the
cameras of knee-cams.ts look up about 13 degrees: --el -13).
"""
import glob
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import numpy as np

args = sys.argv[1:]
opts = {'--label': '', '--radius': '0.3', '--first': '2073', '--el': '5'}
for k in list(opts):
    if k in args:
        i = args.index(k)
        opts[k] = args[i + 1]
        args = args[:i] + args[i + 2:]
out, azs, items = args[0], [float(a) for a in args[1].split(',')], args[2:]
labels = [int(v) for v in opts['--label'].split(',') if v]
radius, first, el = float(opts['--radius']), int(opts['--first']), np.radians(float(opts['--el']))

fig, axes = plt.subplots(len(items), len(azs), figsize=(4.2 * len(azs), 4.2 * len(items)),
                         squeeze=False)
for r, item in enumerate(items):
    d, step = item.rsplit(':', 1)
    data = np.load(sorted(glob.glob(os.path.join(d, f'{step}*.npz')))[0])
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    K = heads['shin_L'] + np.array([0, -0.05, 0.0])
    mids = p[t].mean(axis=1)
    keep = (np.linalg.norm(mids - K, axis=1) < radius) & (mids[:, 0] > 0.0)
    tk = t[keep]
    ring = (tk >= first).any(axis=1)
    for c, az in enumerate(azs):
        a = np.radians(az)
        view = np.array([-np.sin(a) * np.cos(el), np.sin(el), np.cos(a) * np.cos(el)])
        right = np.cross([0, 1, 0], view)
        right /= np.linalg.norm(right)
        up = np.cross(view, right)
        q = p - K
        x, y, z = q @ right, q @ up, q @ view
        cc = p[tk]
        n = np.cross(cc[:, 1] - cc[:, 0], cc[:, 2] - cc[:, 0])
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        facing = n @ view
        order = np.argsort(z[tk].mean(axis=1))
        polys, colors = [], []
        for f in order:
            if facing[f] <= 0:
                continue
            shade = 0.25 + 0.75 * facing[f]
            base = np.array([0.75, 0.82, 1.0]) if ring[f] else np.array([1.0, 0.92, 0.85])
            polys.append(np.stack([-x[tk[f]], y[tk[f]]], 1) * [-1, 1])
            colors.append(np.clip(base * shade, 0, 1))
        ax = axes[r, c]
        ax.add_collection(PolyCollection(polys, facecolors=colors, edgecolors='0.35', linewidths=0.3))
        # The hard edges (a turn above 40 degrees) between two front faces.
        nn = np.cross(p[t][:, 1] - p[t][:, 0], p[t][:, 2] - p[t][:, 0])
        nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-12)
        owner = {}
        for f in np.nonzero(keep)[0]:
            for k in range(3):
                key = tuple(sorted((int(t[f][k]), int(t[f][(k + 1) % 3]))))
                if key in owner:
                    g = owner[key]
                    if nn[f] @ nn[g] < np.cos(np.radians(40)) and (nn[f] @ view > 0 or nn[g] @ view > 0):
                        ax.plot(x[list(key)], y[list(key)], 'r-', lw=1.0)
                else:
                    owner[key] = f
        for v in labels:
            if (p[v] - K) @ view > -0.02 and np.linalg.norm(p[v] - K) < radius:
                ax.plot(x[v], y[v], 'r.', ms=4)
                ax.annotate(str(v), (x[v], y[v]), fontsize=6, color='red')
        ax.set_xlim(-radius, radius)
        ax.set_ylim(-radius, radius)
        ax.set_aspect('equal')
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_title(f'{os.path.basename(d.rstrip("/"))} {step} az {az:g}', fontsize=8)
plt.tight_layout()
plt.savefig(out, dpi=110)
print('wrote', out)
