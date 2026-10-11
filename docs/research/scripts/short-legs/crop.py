"""Cuts a part of an image, scales it, and draws a grid with the row and column numbers.

    uv run --no-project --with pillow python -I crop.py <image> <x0> <y0> <x1> <y1> <scale> \
        <step> <out.png>

The grid has a line each <step> pixels of the image, and a violet line each 5 steps.
"""
import sys
from PIL import Image, ImageDraw

src, x0, y0, x1, y1, scale, step, out = sys.argv[1:9]
x0, y0, x1, y1, scale, step = int(x0), int(y0), int(x1), int(y1), int(scale), int(step)
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * scale
    d.line([(X, 0), (X, im.height)], fill=(0, 255, 255) if x % (step * 5) else (255, 0, 255), width=1)
    d.text((X + 2, 2), str(x), fill=(0, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * scale
    d.line([(0, Y), (im.width, Y)], fill=(0, 255, 255) if y % (step * 5) else (255, 0, 255), width=1)
    d.text((2, Y + 2), str(y), fill=(0, 255, 0))
im.save(out)
