"""Renders the dumps of arm-dump.ts: one row for each sample, and for main and the branch, three views.

uv run --no-project --with matplotlib --with numpy --with pillow python -I arm-render.py out.webp \
    <label>=<main.json>,<branch.json>,<time> ...

wrist-views.webp: the left arm, the paw, the chest, the head, and the viola of the first cat violist
of mozart-k191 at 223.3 s (fifth position), boulanger-matin at 59.13 s (fourth position), and
bach-bwv1048 at 265.5 s (third position). "main" is the branch with viola@cat.highTilt=0deg, which
poses the cat as main does (body-probe.txt of the rule commit: no pose set changes). The axes are the
model axes of the player: it faces -z, and its left is -x. The left arm and the paw have their own
colors, the body is gray, and the viola is brown. Each view is 0.22 m wide around the left wrist (the red cross).
"""

import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import PolyCollection
from PIL import Image


def view(toward, up0):
    """Gives the right axis, the up axis, and the axis toward the viewer of a view."""
    toward = np.array(toward, dtype=float)
    toward /= np.linalg.norm(toward)
    d = -toward
    up = np.array(up0, dtype=float)
    up -= (up @ d) * d
    up /= np.linalg.norm(up)
    right = np.cross(d, up)
    return right, up, toward


# (title, right axis, up axis, axis toward the viewer)
VIEWS = [
    ("front", *view([0, 0, -1.0], [0, 1.0, 0])),
    ("left side", *view([-1.0, 0, 0], [0, 1.0, 0])),
    ("above the left shoulder", *view([-0.5, 0.8, 0.4], [0, 0, -1.0])),
]
LIGHT = np.array([-0.3, 0.8, -0.5])
LIGHT /= np.linalg.norm(LIGHT)
HALF = 0.11

out = sys.argv[1]
rows = []
for arg in sys.argv[2:]:
    label, files = arg.split("=", 1)
    main, branch, time = files.split(",")
    rows.append((label, [("main", main), ("branch", branch)], time))

fig, axes = plt.subplots(len(rows), 6, figsize=(6 * 2.9, len(rows) * 3.1))
axes = np.atleast_2d(axes)
for r, (label, trees, time) in enumerate(rows):
    for t, (tree, path) in enumerate(trees):
        tris = np.array(json.load(open(path))[time]["tris"])
        pts = tris[:, :9].reshape(-1, 3, 3)
        cols = np.clip(tris[:, 9:12], 0, 1) ** (1 / 2.2)
        kind = tris[:, 12]
        near = np.any(np.linalg.norm(pts, axis=2) < 0.35, axis=1)
        pts, cols, kind = pts[near], cols[near], kind[near]
        normals = np.cross(pts[:, 1] - pts[:, 0], pts[:, 2] - pts[:, 0])
        normals /= np.linalg.norm(normals, axis=1, keepdims=True) + 1e-12
        shade = 0.4 + 0.6 * np.abs(normals @ LIGHT)
        base = np.where(
            kind[:, None] == 1,
            cols,
            np.where(kind[:, None] == 2, np.array([0.55, 0.3, 0.12]), np.array([0.72, 0.72, 0.72])),
        )
        colors = np.clip(base * shade[:, None], 0, 1)
        for v, (title, right, up, toward) in enumerate(VIEWS):
            ax = axes[r, t * 3 + v]
            depth = pts.mean(axis=1) @ toward
            order = np.argsort(depth)
            ax.add_collection(
                PolyCollection(
                    [np.stack([pts[i] @ right, pts[i] @ up], axis=1) for i in order],
                    facecolors=colors[order],
                    edgecolors="none",
                )
            )
            ax.plot([0], [0], marker="+", color="red", markersize=6)
            ax.set_xlim(-HALF, HALF)
            ax.set_ylim(-HALF, HALF)
            ax.set_aspect("equal")
            ax.set_xticks([])
            ax.set_yticks([])
            ax.set_title(f"{label} {time} s, {tree}\n{title}", fontsize=7)
plt.tight_layout()
png = out.rsplit(".", 1)[0] + ".png"
plt.savefig(png, dpi=80)
Image.open(png).save(out, "WEBP", quality=80)
