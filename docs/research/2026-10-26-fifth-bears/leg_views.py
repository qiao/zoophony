"""Draws the left leg of the saved rig steps (steps.py) from several views, with flat shading.

    uv run --no-project --with numpy --with matplotlib python -I docs/research/2026-10-26-fifth-bears/leg_views.py \
        <step dir> <out.png> [weights|plain] [<step names, comma separated>] [<other step dir>]

The axes are the studio axes: +x the left side, y up, +z forward. With weights, red is the thigh,
blue the shin, green the hips, and white a vertex of other bones. A second step dir adds its rows
below.
"""
import glob
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import numpy as np

step_dir, out = sys.argv[1], sys.argv[2]
mode = sys.argv[3] if len(sys.argv) > 3 else 'weights'
names = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[4] else None
dirs = [step_dir] + sys.argv[5:]

# (name, azimuth in degrees around y from +x toward +z, elevation in degrees)
VIEWS = [('side', 0, 0), ('side-low', 0, -12), ('front', 90, 5), ('front-side', 45, 0),
         ('back-side', -40, 3), ('above', 0, 45), ('back', -90, 0), ('back-low', -60, -10), ('inner', 180, 0), ('front-low', 80, -8), ('front-in', 110, -5)]
if os.environ.get('VIEWS'):
    VIEWS = [v for v in VIEWS if v[0] in os.environ['VIEWS'].split(',')]
SIZE = float(os.environ.get('SIZE', '3.2'))


def load(path):
    d = np.load(path)
    return d


def view_basis(az, el):
    a, e = np.radians(az), np.radians(el)
    # The camera looks from the direction `toward` at the leg.
    toward = np.array([np.cos(a) * np.cos(e), np.sin(e), np.sin(a) * np.cos(e)])
    up0 = np.array([0.0, 1.0, 0.0])
    right = np.cross(up0, toward)
    right /= np.linalg.norm(right)
    up = np.cross(toward, right)
    return toward, right, up


rows = []
for d in dirs:
    files = sorted(glob.glob(os.path.join(d, '*.npz')))
    if names:
        files = [f for f in files if any(os.path.basename(f)[3:-4] == n or os.path.basename(f)[:2] == n
                                         for n in names)]
    rows += [(d, f) for f in files]

fig, axes = plt.subplots(len(rows), len(VIEWS), figsize=(SIZE * len(VIEWS), SIZE * len(rows)))
axes = np.atleast_2d(axes)
for r, (d, f) in enumerate(rows):
    data = load(f)
    pts, tris = data['points'], data['tris']
    leg = data['thigh_L'] + data['shin_L'] + data['foot_L']
    near = leg[tris].max(axis=1) > 0.05
    near &= pts[tris][:, :, 0].mean(axis=1) > 0.0
    # The faces of the left leg and the haunch and belly around it.
    lo = pts[tris[near]].reshape(-1, 3).min(axis=0) - 0.03
    hi = pts[tris[near]].reshape(-1, 3).max(axis=0) + 0.03
    mids = pts[tris].mean(axis=1)
    keep = np.all((mids >= lo - 0.05) & (mids <= hi + 0.05), axis=1) & (mids[:, 0] > -0.02)
    t = tris[keep]
    p = pts[t]
    n = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    w = np.stack([data['thigh_L'], data['shin_L'], data['hips']], axis=1)[t].mean(axis=1)
    for c, (vname, az, el) in enumerate(VIEWS):
        ax = axes[r, c]
        toward, right, up = view_basis(az, el)
        light = 0.8 * toward + 0.6 * up
        light /= np.linalg.norm(light)
        shade = 0.25 + 0.75 * np.clip(n @ light, 0, 1)
        facing = n @ toward > 0
        depth = p.mean(axis=1) @ toward
        order = np.argsort(depth)
        order = order[facing[order]]
        xy = np.stack([p @ right, p @ up], axis=-1)
        if mode == 'weights':
            base = np.ones((len(t), 3)) * 0.92
            base = base * (1 - w.sum(axis=1, keepdims=True).clip(0, 1)) + (
                w[:, :1] * np.array([0.95, 0.35, 0.3]) + w[:, 1:2] * np.array([0.3, 0.45, 0.95])
                + w[:, 2:3] * np.array([0.35, 0.8, 0.35]))
        else:
            base = np.ones((len(t), 3)) * 0.9
        colors = (base * shade[:, None]).clip(0, 1)
        ax.add_collection(PolyCollection(xy[order], facecolors=colors[order], edgecolors=(0, 0, 0, 0.15),
                                         linewidths=0.2))
        box = np.array([[lo[0], lo[1], lo[2]], [hi[0], hi[1], hi[2]]])
        corners = np.array([[x, y, z] for x in box[:, 0] for y in box[:, 1] for z in box[:, 2]])
        cx, cy = corners @ right, corners @ up
        ax.set_xlim(cx.min(), cx.max())
        ax.set_ylim(cy.min(), cy.max())
        ax.set_aspect('equal')
        ax.set_xticks([])
        ax.set_yticks([])
        if c == 0:
            ax.set_ylabel(os.path.basename(d) + '/' + os.path.basename(f)[:-4], fontsize=8)
        if r == 0:
            ax.set_title(vname, fontsize=9)
plt.tight_layout()
plt.savefig(out, dpi=90)
print('wrote', out)
