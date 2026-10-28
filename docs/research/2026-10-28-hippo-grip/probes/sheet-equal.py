"""Counts the pixels that differ between the base row and the round row of each moment sheet.

Usage: python sheet-equal.py <sheet.png>...
"""
import sys
import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    h = im.shape[0] // 2
    d = np.abs(im[:h] - im[h:]).sum(axis=2)
    # The labels base and round at the top left of each cell differ.
    d[:40] = 0
    print(f'{path.split("/")[-1]}: {(d > 0).sum()} pixels differ, {(d > 30).sum()} by more than 30')
