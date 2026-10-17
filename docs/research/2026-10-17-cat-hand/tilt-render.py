"""Renders the dumps of arm-dump.ts at several tilts: one column for each tilt, one row for each
sample and view.

uv run --no-project --with matplotlib --with numpy --with pillow python -I tilt-render.py out.webp \
    <dir> <tilt>,<tilt>,... <demo>=<time> ...

<dir> holds <demo>-<tilt>.json from
`node arm-dump.ts <demo> <dir>/<demo>-<tilt>.json <time> --set 'viola@cat.highTilt=<tilt>deg'`.

tilt-views.webp: the left arm, the paw, the chest, the head, and the viola of the first cat violist of
mozart-k191 at 223.3 s (fifth position), boulanger-matin at 59.13 s (fourth position), and
bach-bwv1048 at 265.5 s (third position), with viola@cat.highTilt 0 (as main), 15, 20, 25, 30, and 45
degrees. Each label gives the depth of the left forearm in the viola and the bend of the wrist at the
sample. The views, the colors, and the crop are those of arm-render.py.
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
    return np.cross(d, up), up, toward


VIEWS = [
    ("front", *view([0, 0, -1.0], [0, 1.0, 0])),
    ("left side", *view([-1.0, 0, 0], [0, 1.0, 0])),
    ("above the left shoulder", *view([-0.5, 0.8, 0.4], [0, 0, -1.0])),
]
LIGHT = np.array([-0.3, 0.8, -0.5])
LIGHT /= np.linalg.norm(LIGHT)
HALF = 0.11

out, folder, tilts = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
samples = [arg.split("=", 1) for arg in sys.argv[4:]]
fig, axes = plt.subplots(
    len(samples) * len(VIEWS), len(tilts), figsize=(len(tilts) * 2.3, len(samples) * len(VIEWS) * 2.45)
)
axes = np.atleast_2d(axes)
for s, (demo, time) in enumerate(samples):
    for c, tilt in enumerate(tilts):
        data = json.load(open(f"{folder}/{demo}-{tilt}.json"))[time]
        tris = np.array(data["tris"])
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
            ax = axes[s * len(VIEWS) + v, c]
            order = np.argsort(pts.mean(axis=1) @ toward)
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
            name = "main" if tilt == "0" else f"tilt {tilt}°"
            ax.set_title(
                f"{demo} {time} s, {name}\n{title}: forearm {data['depth'] * 100:.1f} cm,"
                f" bend {data['bend']:.0f}°",
                fontsize=6,
            )
plt.tight_layout()
png = out.rsplit(".", 1)[0] + ".png"
plt.savefig(png, dpi=72)
Image.open(png).save(out, "WEBP", quality=78)
