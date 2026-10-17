"""Renders the dumps of paw-dump.ts: one row for each dump, one column for each moment and view.

MOMENTS=rest,play uv run --no-project --with matplotlib --with numpy python -I paw-render.py out.png a.json b.json ...

paw-grip.webp: the dumps of main (a copy of the tree of main) and of the branch for the cat, and of main for
the red fox and the rabbit, at the sample 40 of the play and the rest of the violist and violinist
sweeps of mozart-k525.
The axes are the axes of the right hand of the player: the arm goes up (+y), the palm faces -x.
"""

import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import PolyCollection

out = sys.argv[1]
files = sys.argv[2:]
import os
moments = os.environ.get("MOMENTS", "rest,play,lift50").split(",")
# (title, right axis, up axis, view direction toward the viewer)
views = [
    ("palm side", np.array([0, 0, 1.0]), np.array([0, 1.0, 0]), np.array([-1.0, 0, 0])),
    ("side", np.array([-1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, 1.0])),
    ("from fingers", np.array([0, 0, 1.0]), np.array([1.0, 0, 0]), np.array([0, -1.0, 0])),
]
light = np.array([0.3, 0.8, 0.5])
light /= np.linalg.norm(light)


def split(tri):
    """Splits a triangle until each edge is at most 1 cm."""
    a, b, c = tri
    edges = [np.linalg.norm(a - b), np.linalg.norm(b - c), np.linalg.norm(c - a)]
    if max(edges) <= 0.01:
        return [tri]
    k = int(np.argmax(edges))
    a, b, c = [(a, b, c), (b, c, a), (c, a, b)][k]
    m = (a + b) / 2
    return split(np.array([a, m, c])) + split(np.array([m, b, c]))


fig, axes = plt.subplots(
    len(files), len(moments) * len(views), figsize=(2.6 * len(moments) * len(views), 3.2 * len(files))
)
axes = np.atleast_2d(axes)
for row, f in enumerate(files):
    data = json.load(open(f))
    for mi, m in enumerate(moments):
        tris = np.array(data[m]["tris"])
        pts = tris[:, :9].reshape(-1, 3, 3)
        cols = tris[:, 9:12] ** (1 / 2.2)
        isbow = tris[:, 12] > 0
        near = np.any(np.linalg.norm(pts, axis=2) < 0.2, axis=1) | isbow
        polys, colors = [], []
        for p, c, b in zip(pts[near], cols[near], isbow[near]):
            n = np.cross(p[1] - p[0], p[2] - p[0])
            n /= np.linalg.norm(n) + 1e-12
            shade = 0.45 + 0.55 * abs(n @ light)
            color = np.array([0.75, 0.3, 0.05]) if b else np.clip(c * shade, 0, 1)
            pieces = split(p) if b else [p]
            for q in pieces:
                if np.all(np.abs(q) < 0.25):
                    polys.append(q)
                    colors.append(color)
        for vi, (title, right, up, toward) in enumerate(views):
            ax = axes[row, mi * len(views) + vi]
            depth = [q.mean(axis=0) @ toward for q in polys]
            order = np.argsort(depth)
            ax.add_collection(
                PolyCollection(
                    [np.stack([polys[i] @ right, polys[i] @ up], axis=1) for i in order],
                    facecolors=[colors[i] for i in order],
                    edgecolors="none",
                )
            )
            ax.set_xlim(-0.09, 0.09)
            ax.set_ylim(-0.12, 0.06)
            ax.set_aspect("equal")
            ax.set_xticks([])
            ax.set_yticks([])
            ax.set_title(f"{f.split('/')[-1][:-5]} {m}\n{title}", fontsize=8)
plt.tight_layout()
plt.savefig(out, dpi=90)
