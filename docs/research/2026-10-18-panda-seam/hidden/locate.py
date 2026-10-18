"""Prints where the pixels of a probe color are in a frame, and writes a crop: locate.py <png> <lo> <hi> <crop.png>"""
import sys
import numpy as np
from PIL import Image
im0 = Image.open(sys.argv[1]).convert('RGB')
im = np.asarray(im0, float) / 255.0
lo, hi = float(sys.argv[2]), float(sys.argv[3])
mx, mn = im.max(axis=2), im.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
d = np.maximum(mx - mn, 1e-9)
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
h = np.where(h > 350, h - 360, h)
m = (sat > 0.55) & (mx > 0.25) & (h >= lo) & (h <= hi)
ys, xs = np.nonzero(m)
print(len(xs), 'px', 'x', xs.min() if len(xs) else None, xs.max() if len(xs) else None, 'y', ys.min() if len(ys) else None, ys.max() if len(ys) else None)
if len(xs):
    cx, cy = int(np.median(xs)), int(np.median(ys))
    box = (max(0, cx - 120), max(0, cy - 90), min(1440, cx + 120), min(900, cy + 90))
    im0.crop(box).resize((480, 360), Image.NEAREST).save(sys.argv[4])
    print('crop', box)
