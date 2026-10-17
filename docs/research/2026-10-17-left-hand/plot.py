"""Plots the place of the left hand over time, main against the branch (research of 2026-10-17).

Usage, from the root of the worktree, after `hand-moves.ts --series` wrote the JSON files of
each tree into <dir> as <demo>-main.json and <demo>-branch.json:

    uv run --no-project --with matplotlib --with pillow python -I \
      docs/research/2026-10-17-left-hand/plot.py <dir> <out.webp> boulanger-matin bach-bwv1048
"""

import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

folder, out, *demos = sys.argv[1:]
parts = ["violin", "viola", "cello"]
fig, axes = plt.subplots(len(demos), len(parts), figsize=(15, 3.2 * len(demos)), squeeze=False)
for row, demo in enumerate(demos):
    trees = {}
    for tree in ("main", "branch"):
        with open(f"{folder}/{demo}-{tree}.json") as f:
            trees[tree] = json.load(f)
    for col, part in enumerate(parts):
        ax = axes[row][col]
        for tree, color, label in (("main", "#c0504d", "main"), ("branch", "#1f6fb2", "branch")):
            data = trees[tree]
            values = data["out"].get(part)
            if values is None:
                continue
            times = [k * data["step"] for k in range(len(values))]
            ax.plot(times, values, color=color, linewidth=1.0, label=label)
        ax.set_title(f"{demo}: first {part}s, player 0")
        ax.set_xlabel("Song time (s)")
        ax.set_ylabel("Left hand from the nut (mm)")
        ax.invert_yaxis()
        ax.grid(alpha=0.3)
        if row == 0 and col == 0:
            ax.legend(loc="lower right")
fig.suptitle("Place of the left hand on a real string of full size: main and branch", fontsize=13)
fig.tight_layout()
png = out.rsplit(".", 1)[0] + ".png"
fig.savefig(png, dpi=80)
if out.endswith(".webp"):
    from PIL import Image

    Image.open(png).save(out, "WEBP", quality=80)
print(out)
