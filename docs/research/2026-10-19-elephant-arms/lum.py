"""Prints the mean and the dark share (luminance below 0.12) of a box of each image.
Usage: python lum.py x,y,w,h <image>..."""
import sys
import numpy as np
from PIL import Image
x, y, w, h = (int(v) for v in sys.argv[1].split(','))
for path in sys.argv[2:]:
    a = np.asarray(Image.open(path).convert('RGB'), dtype=float)[y:y + h, x:x + w] / 255
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    print(f'{path}: size {Image.open(path).size}, mean {lum.mean():.3f}, dark share {(lum < 0.12).mean():.3f}')
