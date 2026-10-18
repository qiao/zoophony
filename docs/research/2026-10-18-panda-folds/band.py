"""Measures the shadow band on the belly in a front close view: the share of the pixels in a box of
the white belly whose Oklab lightness is below a limit, and the rows of the box with such pixels.
python -I docs/research/2026-10-18-panda-folds/band.py <png> [x0,y0,x1,y1] [limit]"""
import sys
import numpy as np
from PIL import Image

def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lightness(rgb):
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    return (np.cbrt(lin(rgb) @ m1.T) @ np.array([0.2104542553, 0.7936177850, -0.0040720468]))

box = tuple(int(v) for v in (sys.argv[2] if len(sys.argv) > 2 else '160,215,240,265').split(','))
limit = float(sys.argv[3]) if len(sys.argv) > 3 else 0.45
im = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float)
x0, y0, x1, y1 = box
L = lightness(im[y0:y1, x0:x1])
dark = L < limit
rows = np.nonzero(dark.mean(axis=1) > 0.2)[0]
print(f'{sys.argv[1].split("/")[-1]}: box {box}, {dark.size} px, {int(dark.sum())} below L {limit} ({100 * dark.mean():.1f}%), '
      f'rows with more than 20% dark: {len(rows)}' + (f' (y {y0 + rows.min()} to {y0 + rows.max()})' if len(rows) else ''))
