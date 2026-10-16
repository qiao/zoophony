"""Scores frames of `violins-search.ts` against the bottom cell of `user-camera.webp` (the frame of
the branch, rows 140 to 840 of 1440 x 900, scaled by 0.75). It skips the label and the bottom 60
rows of the cell, scales both images to 216 px wide, blurs them, and prints the 15 frames with
the largest normalized correlation of the gray values. Usage:

    uv run --no-project --with pillow --with numpy python -I score.py <user-camera.webp> <png>...
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

ref_path, *frames = sys.argv[1:]
ref = Image.open(ref_path).convert('L')
w, h = ref.size
cell = ref.crop((0, h // 2 + 22, w, h - 60))  # skip the label and the bottom rows


def prep(img):
    img = img.resize((216, int(216 * img.size[1] / img.size[0])), Image.BILINEAR)
    a = np.asarray(img.filter(ImageFilter.GaussianBlur(1)), dtype=float)
    return (a - a.mean()) / (a.std() + 1e-6)


r = prep(cell)
scores = []
for f in frames:
    img = Image.open(f).convert('L')
    # The cell is rows 140 to 840 of the frame, scaled by 0.75; skip the same rows.
    top = 140 + 22 / 0.75
    bottom = 840 - 60 / 0.75
    img = img.crop((0, int(round(top)), 1440, int(round(bottom))))
    a = prep(img)
    n = min(a.shape[0], r.shape[0])
    score = float((a[:n] * r[:n]).mean())
    scores.append((score, f))
for score, f in sorted(scores, reverse=True)[:15]:
    print(f'{score:.4f} {f}')
