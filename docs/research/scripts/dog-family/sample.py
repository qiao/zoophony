"""Prints the mean color of 7 x 7 px boxes: python3 sample.py <image> x,y[,label] ..."""
import colorsys
import sys

from PIL import Image

img = Image.open(sys.argv[1]).convert('RGB')
for arg in sys.argv[2:]:
    parts = arg.split(',')
    x, y = int(parts[0]), int(parts[1])
    label = parts[2] if len(parts) > 2 else ''
    px = [img.getpixel((x + dx, y + dy)) for dx in range(-3, 4) for dy in range(-3, 4)]
    r, g, b = (sum(p[k] for p in px) / len(px) for k in range(3))
    hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    print(f'{label:12} ({x},{y}) #{int(r):02x}{int(g):02x}{int(b):02x} value {max(r, g, b):.0f} '
          f'hue {hh * 360:.0f} sat {ss:.2f}')
