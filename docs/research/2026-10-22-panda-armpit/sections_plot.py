"""Draws horizontal cuts of the source mesh of `arm_free.py` near the left arm: red for a face of
the free arm, orange for a face with corners in the arm and in the body, gray for the body, and
the marked faces in blue. Top of each panel is the back (-z), +x to the right.

    uv run --no-project --with numpy --with pillow python -I sections_plot.py <arm.npz> <out.png>
        <y0,y1,...> [--side L|R] [--mark f,f,...] [--box x0,x1,z0,z1]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

m = np.load(sys.argv[1])
v, t = m['v'], m['tris']
opts = dict(zip(sys.argv[4::2], sys.argv[5::2]))
side = opts.get('--side', 'L')
arm = m[side]
sign = 1.0 if side == 'L' else -1.0
X = v * [sign, 1, 1]
ys = [float(a) for a in sys.argv[3].split(',')]
mark = {int(a) for a in opts.get('--mark', '').split(',') if a}
x0, x1, z0, z1 = [float(a) for a in opts.get('--box', '0.05,0.4,-0.2,0.2').split(',')]
S = 380
ppu = S / max(x1 - x0, z1 - z0)
cols = 4
rows = (len(ys) + cols - 1) // cols
out = Image.new('RGB', (S * cols, S * rows), 'white')
for k, y in enumerate(ys):
    im = Image.new('RGB', (S, S), 'white')
    d = ImageDraw.Draw(im)
    for g in np.arange(np.floor(x0 * 50) / 50, x1, 0.02):
        d.line([((g - x0) * ppu, 0), ((g - x0) * ppu, S)], fill=(225, 225, 225))
    for g in np.arange(np.floor(z0 * 50) / 50, z1, 0.02):
        d.line([(0, (g - z0) * ppu), (S, (g - z0) * ppu)], fill=(225, 225, 225))
    for f, tri in enumerate(t):
        p = X[tri]
        if (p[:, 1] < y).all() or (p[:, 1] > y).all():
            continue
        pts = []
        for i in range(3):
            a, b = p[i], p[(i + 1) % 3]
            if (a[1] - y) * (b[1] - y) < 0:
                s = (y - a[1]) / (b[1] - a[1])
                q = a + s * (b - a)
                pts.append(((q[0] - x0) * ppu, (q[2] - z0) * ppu))
        if len(pts) != 2:
            continue
        a_ = arm[tri]
        col = (40, 80, 230) if f in mark else (220, 40, 40) if a_.all() else (240, 160, 30) if a_.any() else (90, 90, 90)
        d.line(pts, fill=col, width=3 if f in mark else 2)
    d.text((4, 4), f'{side} y={y:.3f} grid 0.02', fill='black')
    out.paste(im, ((k % cols) * S, (k // cols) * S))
out.save(sys.argv[2])
