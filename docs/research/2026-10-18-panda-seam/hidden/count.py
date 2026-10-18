"""Counts the pixels of each probe color in the probe frames: count.py <dir> [<out.txt>]
A pixel counts for a face when its HSV saturation is above 0.55, its value above 0.25, and its
hue in the bin of the color of the face."""
import glob
import os
import sys

import numpy as np
from PIL import Image

BINS = {93: (90, 150), 2115: (210, 270), 308: (280, 320), 92: (165, 200), 98: (-10, 8)}
rows = []
worst = {f: (0, '') for f in BINS}
for path in sorted(glob.glob(os.path.join(sys.argv[1], '*.png'))):
    im = np.asarray(Image.open(path).convert('RGB'), float) / 255.0
    mx, mn = im.max(axis=2), im.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    d = np.maximum(mx - mn, 1e-9)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    h = np.where(h > 180 + 170, h - 360, h)
    strong = (sat > 0.55) & (mx > 0.25)
    counts = {}
    for f, (lo, hi) in BINS.items():
        counts[f] = int((strong & (h >= lo) & (h <= hi)).sum())
        if counts[f] > worst[f][0]:
            worst[f] = (counts[f], os.path.basename(path))
    rows.append((os.path.basename(path), counts))
lines = [f'{name}: ' + ', '.join(f'{f} {c}' for f, c in counts.items()) for name, counts in rows]
lines.append('largest: ' + '; '.join(f'face {f} {c} px in {where}' for f, (c, where) in worst.items()))
text = '\n'.join(lines)
print('\n'.join(lines[-1:]))
print(f'{len(rows)} frames')
if len(sys.argv) > 2:
    open(sys.argv[2], 'w').write(text + '\n')
