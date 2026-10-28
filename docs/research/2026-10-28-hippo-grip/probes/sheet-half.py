"""Cuts a moment sheet of `close-views --sheet` (base row above the round row) into parts of a few
moments each, so that each part shows its cells large enough to look at.

Usage: python sheet-half.py <sheet.png> <moments in the sheet> <moments per part> <out prefix>
"""
import sys

from PIL import Image

path, count, per, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
im = Image.open(path).convert('RGB')
w, h = im.size
cell = w // count
for k in range(0, count, per):
    part = im.crop((k * cell, 0, min(w, (k + per) * cell), h))
    part.save(f'{out}-{k // per + 1}.png')
    print(f'{out}-{k // per + 1}.png', part.size)
