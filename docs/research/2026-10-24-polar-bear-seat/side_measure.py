"""Measures the side view of docs/reference/polar-bear-views.png: the floor, the top of the keys,
the head top of the bear, the bench top, and the front of the keys, in pixels, and writes a 2x
crop with a grid for a check by eye.
    python -I side_measure.py <repo>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

repo = sys.argv[1]
im = Image.open(repo + '/docs/reference/polar-bear-views.png').convert('RGB')
a = np.asarray(im).astype(int)
# The side view panel: x 400 to 860.
x0, x1 = 400, 860
panel = a[:, x0:x1]
r, g, b = panel[..., 0], panel[..., 1], panel[..., 2]
light = (r > 200) & (g > 190) & (b > 170) & (r - b > 8)  # cream fur, not the gray background
dark = (r < 60) & (g < 60) & (b < 60)
# The bear: cream pixels left of x 620.
bear = light.copy()
bear[:, 620 - x0:] = False
ys, xs = np.nonzero(bear)
print('bear cream: top y', ys.min(), 'bottom y', ys.max(), 'left x', xs.min() + x0, 'right x', xs.max() + x0)
# The floor: the lowest dark pixel of the piano feet and the bench legs (the gold caps end below).
dys, dxs = np.nonzero(dark)
print('lowest dark y', dys.max())
# Rows of the head top at each column band.
for y in range(95, 130, 5):
    row = np.nonzero(bear[y])[0]
    print('row', y, 'cream x', (row.min() + x0, row.max() + x0) if row.size else None)
crop = im.crop((400, 60, 860, 420)).resize((920, 720))
d = ImageDraw.Draw(crop)
for y in range(60, 420, 10):
    yy = (y - 60) * 2
    d.line([(0, yy), (12 if y % 50 else 30, yy)], fill=(255, 0, 0))
    if y % 50 == 0:
        d.text((34, yy - 6), str(y), fill=(255, 0, 0))
for x in range(400, 860, 10):
    xx = (x - 400) * 2
    d.line([(xx, 0), (xx, 12 if x % 50 else 30)], fill=(0, 0, 255))
    if x % 50 == 0:
        d.text((xx + 2, 32), str(x), fill=(0, 0, 255))
crop.save(repo + '/scratch/ref/side-grid.png')
