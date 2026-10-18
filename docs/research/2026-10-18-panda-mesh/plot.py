"""Draws the edges of the dog mesh in one projection with a grid of 0.05 units (labels at 0.1).

    python -I plot.py <mesh.npz> <out.png> <view> <a0> <a1> <b0> <b1> [filter]

view: 'front' (x right is the left side of the animal, y up), 'side' (z, y), 'top' (x, z).
filter: a Python expression of the vertex arrays x, y, z that keeps a triangle when all three
corners pass, such as 'x > 0.05'.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

path, out, view = sys.argv[1:4]
a0, a1, b0, b1 = map(float, sys.argv[4:8])
flt = sys.argv[8] if len(sys.argv) > 8 else 'True'
m = np.load(path)
v, tris = m['v'], m['tris']
x, y, z = v[:, 0], v[:, 1], v[:, 2]
keep = eval(flt) * np.ones(len(v), bool)
ax = {'front': (0, 1), 'side': (2, 1), 'top': (0, 2)}[view]
S = 2400 / max(a1 - a0, b1 - b0)
W, H = int((a1 - a0) * S) + 80, int((b1 - b0) * S) + 80
im = Image.new('RGB', (W, H), (255, 255, 255))
d = ImageDraw.Draw(im)
font = ImageFont.load_default(size=22)


def px(p):
    return (40 + (p[ax[0]] - a0) * S, H - 40 - (p[ax[1]] - b0) * S)


g = np.floor(a0 / 0.05) * 0.05
while g <= a1 + 1e-9:
    c = (200, 120, 120) if abs(round(g / 0.1) * 0.1 - g) < 1e-6 else (230, 230, 230)
    X = 40 + (g - a0) * S
    d.line([(X, 0), (X, H)], fill=c, width=1)
    if c[0] == 200:
        d.text((X + 2, H - 30), f'{g:.1f}', fill=(200, 0, 0), font=font)
    g += 0.05
g = np.floor(b0 / 0.05) * 0.05
while g <= b1 + 1e-9:
    c = (200, 120, 120) if abs(round(g / 0.1) * 0.1 - g) < 1e-6 else (230, 230, 230)
    Y = H - 40 - (g - b0) * S
    d.line([(0, Y), (W, Y)], fill=c, width=1)
    if c[0] == 200:
        d.text((2, Y - 24), f'{g:.1f}', fill=(200, 0, 0), font=font)
    g += 0.05
for t in tris:
    if not keep[t].all():
        continue
    p = [px(v[k]) for k in t]
    d.line(p + [p[0]], fill=(40, 40, 40), width=1)
im.thumbnail((1400, 1400))
im.save(out)
print(out, im.size)
