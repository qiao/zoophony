"""Prints the Oklab medians of the mauve pixels (hue 330 to 15 degrees, chroma above 0.02, lightness
above 0.3) of a crop of a reference image, in bands of lightness: the skin of the reference hippos.

    python -I ref_hippo.py <image> x0,y0,x1,y1
"""
import sys

import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float) / 255
x0, y0, x1, y1 = (int(v) for v in sys.argv[2].split(','))
c = im[y0:y1, x0:x1].reshape(-1, 3)
lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
L, a, b = (np.cbrt(lin @ m1.T) @ m2.T).T
ch = np.hypot(a, b)
hue = np.degrees(np.arctan2(b, a)) % 360
m = ((hue > 330) | (hue < 15)) & (ch > 0.02) & (L > 0.3)
print(f'mauve pixels: {m.sum()} of {len(L)}; L {np.median(L[m]):.3f} a {np.median(a[m]):+.4f} b {np.median(b[m]):+.4f} chroma {np.median(ch[m]):.4f}')
for lo in (0.3, 0.4, 0.5, 0.6, 0.7):
    k = m & (L >= lo) & (L < lo + 0.1)
    if k.sum():
        print(f'  L {lo:.1f}..{lo + 0.1:.1f}: {k.sum()} px, a {np.median(a[k]):+.4f} b {np.median(b[k]):+.4f} chroma {np.median(ch[k]):.4f} hue {np.degrees(np.arctan2(np.median(b[k]), np.median(a[k]))) % 360:.0f}')
