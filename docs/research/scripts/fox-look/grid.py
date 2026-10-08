"""Crops a box, scales it, and draws a labeled grid in the source pixel coordinates.

    python3 grid.py <in> <out> x0 y0 x1 y1 scale step
"""
import sys

from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
scale, step = float(sys.argv[7]), int(sys.argv[8])
img = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
d = ImageDraw.Draw(img)
for x in range((x0 // step + 1) * step, x1, step):
    px = (x - x0) * scale
    d.line([(px, 0), (px, img.height)], fill=(0, 255, 255), width=1)
    d.text((px + 2, 2), str(x), fill=(0, 255, 255))
for y in range((y0 // step + 1) * step, y1, step):
    py = (y - y0) * scale
    d.line([(0, py), (img.width, py)], fill=(255, 0, 255), width=1)
    d.text((2, py + 2), str(y), fill=(255, 0, 255))
img.save(out)
