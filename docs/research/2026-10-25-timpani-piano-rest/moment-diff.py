"""Gives the share of the pixels that change from the rest cell to each moment cell.

Usage: moment-diff.py <dir> <role> <view> <moments,...>
A pixel changes when a channel moves by more than 16 of 255. The base cells (main) and the tree
cells each compare with their own rest cell.
"""
import sys
import numpy as np
from PIL import Image

src, role, view, moments = sys.argv[1:5]
for tree in ('base-', ''):
    rest = np.asarray(Image.open(f'{src}/{role}-{tree}rest-{view}.png').convert('RGB')).astype(int)
    cells = []
    for m in moments.split(','):
        im = np.asarray(Image.open(f'{src}/{role}-{tree}{m}-{view}.png').convert('RGB')).astype(int)
        share = (np.abs(im - rest).max(axis=2) > 16).mean() * 100
        cells.append(f'{m} {share:.1f}%')
    print(f"{'main' if tree else 'branch'} {view}: " + ', '.join(cells))
