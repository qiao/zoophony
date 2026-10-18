"""Median Oklab of the white fur pixels (Oklab L above 0.6) in boxes of one render:
python -I docs/research/2026-10-18-panda-folds/fur_white.py <png> <x0,y0,x1,y1>[;<x0,y0,x1,y1>]..."""
import sys
import numpy as np
from PIL import Image

def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def oklab(rgb):
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    return np.cbrt(lin(rgb) @ m1.T) @ m2.T

im = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float)
boxes = [tuple(int(v) for v in b.split(',')) for b in sys.argv[2].split(';')]
px = np.concatenate([im[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in boxes])
lab = oklab(px)
lab = lab[lab[:, 0] > 0.6]
L, a, b = np.median(lab, axis=0)
c = np.hypot(lab[:, 1], lab[:, 2])
print(f'{sys.argv[1].split("/")[-1]}: {len(lab)} px, L {L:.3f}, a {a:+.4f}, b {b:+.4f}, chroma {np.median(c):.3f}, hue {np.degrees(np.arctan2(b, a)) % 360:.0f} deg')
