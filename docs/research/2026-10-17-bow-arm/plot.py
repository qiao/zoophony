"""Plots the bow of the first violins over time, main against the branch (research of 2026-10-17).

Usage, from the root of the worktree, after `bow-plan.ts --series <demo> <from> 20` wrote the JSON
files of each tree into <dir> as <demo>-<from>-main.json and <demo>-<from>-branch.json:

    uv run --no-project --with matplotlib --with pillow python -I \
      docs/research/2026-10-17-bow-arm/plot.py <dir> <out.webp> boulanger-matin-0 bach-bwv1048-0
"""

import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

folder, out, *runs = sys.argv[1:]
fig, axes = plt.subplots(2 * len(runs), 1, figsize=(15, 3.0 * 2 * len(runs)), squeeze=False)
for row, run in enumerate(runs):
    trees = {}
    for tree in ("main", "branch"):
        with open(f"{folder}/{run}-{tree}.json") as f:
            trees[tree] = json.load(f)
    for col, (key, label) in enumerate(
        (("bow", "Strings on the hair (0 frog, 1 tip)"), ("angle", "Bow turn around the strings (°)"))
    ):
        ax = axes[2 * row + col][0]
        for tree, color in (("main", "#c0504d"), ("branch", "#1f6fb2")):
            data = trees[tree]
            values = data[key]
            times = [data["from"] + k * data["step"] for k in range(len(values))]
            ax.plot(times, values, color=color, linewidth=0.9, label=tree)
        demo = trees["main"]["demo"]
        ax.set_title(f"{demo}: first violins, player 0. {label}")
        ax.set_xlabel("Song time (s)")
        ax.set_ylabel(label)
        ax.grid(alpha=0.3)
        if row == 0 and col == 0:
            ax.legend(loc="upper right")
fig.suptitle("Bow of the first violins: main (red) and branch (blue)", fontsize=13)
fig.tight_layout()
png = out.rsplit(".", 1)[0] + ".png"
fig.savefig(png, dpi=70)
if out.endswith(".webp"):
    from PIL import Image

    Image.open(png).save(out, "WEBP", quality=80)
print(out)
