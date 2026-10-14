"""Writes a crop of a reference image with a grid of the pixels of the source, so that a reader
can read the place of a point. Usage:

    uv run --no-project --with pillow python -I grid_crop.py <image> <out.png> x0 y0 x1 y1 scale step
"""
import sys

from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
scale, step = float(sys.argv[7]), int(sys.argv[8])
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
draw = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    px = (x - x0) * scale
    draw.line([(px, 0), (px, im.height)], fill=(0, 255, 255) if x % (5 * step) else (255, 0, 255))
    draw.text((px + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    py = (y - y0) * scale
    draw.line([(0, py), (im.width, py)], fill=(0, 255, 255) if y % (5 * step) else (255, 0, 255))
    draw.text((2, py + 2), str(y), fill=(255, 255, 0))
im.save(out)
print(im.size)
