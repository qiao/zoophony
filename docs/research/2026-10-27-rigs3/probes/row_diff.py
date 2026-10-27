"""Prints the pixel difference of the base row and the round row of each sheet of close-views, below the label band of 40 px."""
import sys
import numpy as np
from PIL import Image
for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    h = a.shape[0] // 2
    d = np.abs(a[:h] - a[h:2 * h]).max(axis=2)
    d[:40] = 0  # the labels "base" and "round"
    print(f'{path}: pixels that differ by more than 8: {(d > 8).sum()}, largest {d.max()}')
