"""Gives the lit color of a body part in a box: the mean of the pixels whose value is between
the 70th and the 95th percentile of the box, so that the background, the shade, and the white
parts count less.

Usage: lit.py <image> <name>:<x0>,<y0>,<x1>,<y1> ...
"""
import colorsys
import sys

from PIL import Image

im = Image.open(sys.argv[1]).convert('RGB')
for arg in sys.argv[2:]:
    name, box = arg.split(':')
    x0, y0, x1, y1 = map(int, box.split(','))
    pixels = sorted(im.crop((x0, y0, x1, y1)).getdata(), key=max)
    n = len(pixels)
    chosen = pixels[int(0.7 * n):int(0.95 * n)]
    r, g, b = (sum(p[k] for p in chosen) / len(chosen) for k in range(3))
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    print(f'{name:14s} #{int(r):02x}{int(g):02x}{int(b):02x} value {max(r, g, b):5.1f} '
          f'hue {h * 360:5.1f} sat {s:4.2f}')
