"""Samples the mean color of a box of 7 x 7 px at each point, and prints the hex color, the value
(the max of r, g, b), the hue, and the saturation (HSV).

Usage: sample.py <image> <name>:<x>,<y> ...
"""
import colorsys
import sys

from PIL import Image

im = Image.open(sys.argv[1]).convert('RGB')
for arg in sys.argv[2:]:
    name, place = arg.split(':')
    x, y = map(int, place.split(','))
    pixels = [im.getpixel((x + dx, y + dy)) for dx in range(-3, 4) for dy in range(-3, 4)]
    r, g, b = (sum(p[k] for p in pixels) / len(pixels) for k in range(3))
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    print(f'{name:14s} #{int(r):02x}{int(g):02x}{int(b):02x} value {max(r, g, b):5.1f} '
          f'hue {h * 360:5.1f} sat {s:4.2f}')
