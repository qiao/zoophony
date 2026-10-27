"""Draws the right elbow of the posed deer harpist, flat shaded, from the main triangles and from
the tree triangles (export.ts). A front face is skin color, shaded by its turn to the camera. A
back face is hidden. A folded face (the folds of export.ts) is red. The quad of the flip has a blue outline.

    elbow_draw.py <posed.json> <out.png> <az,az,...> [--el deg] [--radius m]

Azimuth 0 looks at the front of the deer, 90 at its right side, 180 at its back. The azimuth n
looks straight onto the patch, along its mean normal.
"""
import json
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import numpy as np

args = sys.argv[1:]
opts = {'--el': '20', '--radius': '0.09'}
for k in list(opts):
    if k in args:
        i = args.index(k)
        opts[k] = args[i + 1]
        args = args[:i] + args[i + 2:]
data = json.load(open(args[0]))
out, azs = args[1], [a if a == 'n' else float(a) for a in args[2].split(',')]
el, radius = np.radians(float(opts['--el'])), float(opts['--radius'])
QUAD = {231, 232, 247, 248}
rows = []
for row in data['rows']:
    for name in ('main', 'tree'):
        rows.append((row, name))
fig, axes = plt.subplots(len(rows), len(azs), figsize=(3.6 * len(azs), 3.6 * len(rows)), squeeze=False)
for r, (row, name) in enumerate(rows):
    p = np.array(row['posed']).reshape(-1, 3)
    t = np.array(data[name]).reshape(-1, 3)
    center = p[[231, 232, 247, 248]].mean(axis=0)
    mids = p[t].mean(axis=1)
    keep = np.linalg.norm(mids - center, axis=1) < radius
    tk = t[keep]
    cc = p[tk]
    n = np.cross(cc[:, 1] - cc[:, 0], cc[:, 2] - cc[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    quad = np.array([set(map(int, f)) <= QUAD for f in tk])
    folded = np.zeros(len(t), bool)
    folded[row["foldsMain" if name == "main" else "foldsTree"]] = True
    fk = folded[keep]
    for c, az in enumerate(azs):
        if az == 'n':
            # The mean normal of the patch, weighted by area: a view straight onto the skin.
            area = np.cross(cc[:, 1] - cc[:, 0], cc[:, 2] - cc[:, 0])
            view = area.sum(axis=0) / np.linalg.norm(area.sum(axis=0))
        else:
            a = np.radians(az)
            view = np.array([np.sin(a) * np.cos(el), np.sin(el), -np.cos(a) * np.cos(el)])
        right = np.cross([0, 1, 0], view)
        right /= np.linalg.norm(right)
        up = np.cross(view, right)
        q = p - center
        x, y, z = q @ right, q @ up, q @ view
        facing = n @ view
        order = np.argsort(z[tk].mean(axis=1))
        polys, colors, edges, widths = [], [], [], []
        for f in order:
            if facing[f] <= 0 and not fk[f]:
                continue
            shade = 0.3 + 0.7 * abs(facing[f])
            base = np.array([0.93, 0.66, 0.42]) if not fk[f] else np.array([0.85, 0.05, 0.05])
            polys.append(np.stack([-x[tk[f]], y[tk[f]]], 1))
            colors.append(np.clip(base * (1.0 if fk[f] else shade), 0, 1))
            edges.append((0.1, 0.3, 1.0) if quad[f] else (0.35, 0.35, 0.35))
            widths.append(1.6 if quad[f] else 0.3)
        ax = axes[r, c]
        ax.add_collection(PolyCollection(polys, facecolors=colors, edgecolors=edges, linewidths=widths))
        ax.set_xlim(-radius, radius)
        ax.set_ylim(-radius, radius)
        ax.set_aspect('equal')
        ax.set_xticks([])
        ax.set_yticks([])
        tag = 'main' if name == 'main' else 'round'
        ax.set_title(f"{tag}, {row['label']}, " + ("onto the patch" if az == 'n' else f"az {az:g}"), fontsize=9)
fig.tight_layout()
fig.savefig(out, dpi=110)
