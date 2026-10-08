"""Prints the mean color of small boxes of an image: hex, value, hue, saturation.

    python3 sample.py <image> name:x,y[,r] ...
"""
import colorsys
import sys

from PIL import Image

img = Image.open(sys.argv[1]).convert('RGB')
for arg in sys.argv[2:]:
    name, rest = arg.split(':')
    parts = [int(v) for v in rest.split(',')]
    x, y = parts[0], parts[1]
    r = parts[2] if len(parts) > 2 else 4
    px = [img.getpixel((i, j)) for i in range(x - r, x + r + 1) for j in range(y - r, y + r + 1)]
    m = [sum(p[k] for p in px) / len(px) for k in range(3)]
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in m))
    value = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]
    print(f'{name:14s} #{int(m[0]):02x}{int(m[1]):02x}{int(m[2]):02x}  value {value:5.1f}  '
          f'hue {h*360:5.1f}  sat {s:.2f}')
