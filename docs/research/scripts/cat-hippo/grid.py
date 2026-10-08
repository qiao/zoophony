"""Crops a box of an image, scales it, and draws a grid with the pixel coordinates of the
original image.

Usage: grid.py <image> <x0> <y0> <x1> <y1> <scale> <step> <out>
"""
import sys

from PIL import Image, ImageDraw

path, x0, y0, x1, y1, scale, step, out = sys.argv[1:]
x0, y0, x1, y1, scale, step = map(int, (x0, y0, x1, y1, scale, step))
im = Image.open(path).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
draw = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    px = (x - x0) * scale
    major = x % (step * 5) == 0
    draw.line([(px, 0), (px, im.height)], fill=(0, 255, 255) if major else (0, 120, 120), width=1)
    if major:
        draw.text((px + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    py = (y - y0) * scale
    major = y % (step * 5) == 0
    draw.line([(0, py), (im.width, py)], fill=(0, 255, 255) if major else (0, 120, 120), width=1)
    if major:
        draw.text((2, py + 2), str(y), fill=(255, 255, 0))
im.save(out)
