"""Prints the luminance across the arm of the side figure of the cat sheet, to find the front and
the back edge of the arm at points of its axis."""
import numpy as np
from PIL import Image
from scipy import ndimage

a = np.asarray(Image.open('docs/reference/cat-views.png').convert('L')).astype(float)
a = ndimage.gaussian_filter(a, 1.0)
S = np.array([606.0, 425.0]); W = np.array([643.0, 556.0])
ax = (W - S) / np.linalg.norm(W - S)
n = np.array([ax[1], -ax[0]])  # toward the front (+x) and up
for t in (0.3, 0.5, 0.6, 0.75, 0.9):
    p = S + t * (W - S)
    ss = np.arange(-40, 41)
    vals = [ndimage.map_coordinates(a, [[p[1] + s * n[1]], [p[0] + s * n[0]]], order=1)[0] for s in ss]
    g = np.gradient(vals)
    print(f't {t}: ({p[0]:.0f},{p[1]:.0f})')
    print('  ' + ' '.join(f'{int(v):3d}' for v in vals))
    top = sorted(range(len(g)), key=lambda i: -abs(g[i]))[:6]
    print('  edges (s, grad):', [(int(ss[i]), round(float(g[i]), 1)) for i in sorted(top)])
