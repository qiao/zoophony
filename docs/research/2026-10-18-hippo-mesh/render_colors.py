"""Prints the Oklab medians of the body pixels of a render, in a lightness band of the fur and of
the belly. Body pixels: not the dark background, not the orange wood, not the floor.

    python -I render_colors.py <image> [x0,y0,x1,y1]
"""
import sys

import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float) / 255
if len(sys.argv) > 2:
    x0, y0, x1, y1 = (int(v) for v in sys.argv[2].split(','))
    im = im[y0:y1, x0:x1]
c = im.reshape(-1, 3)
lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
lab = np.cbrt(lin @ m1.T) @ m2.T
L, a, b = lab.T
ch = np.hypot(a, b)
hue = np.degrees(np.arctan2(b, a)) % 360
# Skin: not too dark, not the saturated orange wood (hue 40..80 with chroma above 0.09).
body = (L > 0.35) & ~((ch > 0.08) & (hue > 30) & (hue < 90))
for name, lo, hi in (('fur', 0.35, 0.62), ('belly', 0.62, 0.95)):
    m = body & (L >= lo) & (L < hi)
    print(f'{name} L {lo}..{hi}: {m.sum()} px, L {np.median(L[m]):.3f} a {np.median(a[m]):+.4f} b {np.median(b[m]):+.4f} chroma {np.median(ch[m]):.4f} hue {np.degrees(np.arctan2(np.median(b[m]), np.median(a[m]))) % 360:.0f}')
