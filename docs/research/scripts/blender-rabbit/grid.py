"""Crops an image, scales it up, and draws a pixel grid on it, to read the landmarks of a sheet.

    python3 grid.py <image> <out.png> <x0> <y0> <x1> <y1> <scale> <step>
"""

import sys

from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, scale, step = map(int, sys.argv[3:9])
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range(x0 - x0 % step + step, x1, step):
    X = (x - x0) * scale
    major = x % (step * 5) == 0
    d.line([(X, 0), (X, im.height)], fill=(255, 60, 60) if major else (0, 120, 200), width=1)
    if major:
        d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range(y0 - y0 % step + step, y1, step):
    Y = (y - y0) * scale
    major = y % (step * 5) == 0
    d.line([(0, Y), (im.width, Y)], fill=(255, 60, 60) if major else (0, 120, 200), width=1)
    if major:
        d.text((2, Y + 2), str(y), fill=(255, 255, 0))
im.save(out)
