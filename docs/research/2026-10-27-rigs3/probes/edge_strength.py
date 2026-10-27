"""Measures the sharp steps of the light on a calf of close-views play frames: the luminance
gradient (Sobel, 0 to 255 per pixel) inside a box, at the percentiles 95, 99, and 99.9, and the
share of pixels above 12, for main (play-base-<label>.png) and the round (play-<label>.png).

    edge_strength.py <dir> <label>:<x0,y0,x1,y1>...
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
d = sys.argv[1]
for item in sys.argv[2:]:
    label, box = item.split(':')
    box = tuple(int(v) for v in box.split(','))
    for tag, name in (('main', f'{d}/play-base-{label}.png'), ('round', f'{d}/play-{label}.png')):
        a = np.asarray(Image.open(name).convert('L').crop(box)).astype(float)
        a = ndimage.gaussian_filter(a, 1.0)
        g = np.hypot(ndimage.sobel(a, 0), ndimage.sobel(a, 1)) / 8
        p = np.percentile(g, [95, 99, 99.9])
        print(f'{label:6s} {tag:5s}: p95 {p[0]:5.2f}, p99 {p[1]:5.2f}, p99.9 {p[2]:5.2f}, above 12: {(g > 12).mean() * 100:5.2f}%')
