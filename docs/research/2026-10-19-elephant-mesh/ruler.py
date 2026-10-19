"""Crops a region of a reference image with a pixel ruler every 10 pixels, at a zoom, for the
measures of the size of the animals in pixels.

    uv run --no-project --with pillow python -I ruler.py <image> <x0> <y0> <x1> <y1> <zoom> <out>
"""
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, z, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).convert('RGB')
c = im.crop((x0, y0, x1, y1)); c = c.resize((c.width * z, c.height * z))
d = ImageDraw.Draw(c)
for y in range(0, c.height, 10 * z):
    d.line([(0, y), (10, y)], fill=(255, 0, 0)); d.text((12, y - 5), str(y0 + y // z), fill=(255, 80, 80))
for x in range(0, c.width, 10 * z):
    d.line([(x, 0), (x, 10)], fill=(0, 255, 0)); d.text((x - 8, 12), str(x0 + x // z), fill=(80, 255, 80))
c.save(out)
