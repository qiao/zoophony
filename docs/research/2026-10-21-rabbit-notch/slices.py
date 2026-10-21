"""Draws horizontal cuts of the source trunk near the right armpit (x against z), with the faces of
the arm (x < -0.106) in blue, and marks the run of the body. Usage: slices.py <out> [json]"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
exec(open('scratch/src.py').read())
if len(sys.argv) > 2:
    V = np.array(json.load(open(sys.argv[2])))
body = [1020, 1025, 1008, 1012, 1011, 1018, 984, 982]
S = 3000; ox, oz = -0.20, -0.10
def px(x, z): return ((x - ox) * S, (0.16 - z) * S)
ims = []
for c in np.arange(0.36, 0.445, 0.01):
    im = Image.new('RGB', (360, 780), 'white'); d = ImageDraw.Draw(im)
    for t in T:
        p = V[t]; s = p[:, 1] - c
        pts = []
        for i in range(3):
            a, b = p[i], p[(i + 1) % 3]; sa, sb = s[i], s[(i + 1) % 3]
            if (sa < 0) != (sb < 0):
                q = a + (b - a) * (sa / (sa - sb)); pts.append(px(q[0], q[2]))
        if len(pts) == 2:
            arm = (p[:, 0] < -0.106).all()
            d.line(pts, fill=(60, 90, 255) if arm else (0, 0, 0), width=2)
    for v in body:
        if abs(V[v, 1] - c) < 0.006:
            x, y = px(V[v, 0], V[v, 2]); d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(220, 0, 0)); d.text((x + 5, y - 5), str(v), fill=(200, 0, 0))
    d.text((4, 4), f'y {c:.2f}', fill=(0, 0, 0))
    ims.append(im)
o = Image.new('RGB', (360 * len(ims), 780), 'white')
for i, im in enumerate(ims): o.paste(im, (i * 360, 0))
o.save(sys.argv[1])
