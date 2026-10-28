"""Compares the base row and the round row of each sheet: the mean and the largest pixel
difference (0 to 255), and the share of pixels that differ by more than 8, with the labels left
out.

    uv run --no-project --with pillow --with numpy python -I scratch/rowdiff.py <sheet.png>...
"""
import sys

import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.int16)
    h = im.shape[0] // 2
    a, b = im[:h], im[h:2 * h]
    d = np.abs(a - b).max(axis=2)
    d[:40] = 0
    print(f'{path}: mean {d.mean():.3f}, max {d.max()}, over 8: {(d > 8).mean() * 100:.3f}%')
