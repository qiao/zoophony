"""Draws sagittal sections of a posed trunk OBJ (from belly.ts --obj): the outline of each cut at
x = const, in the side view (forward to the right, up to the top), for several OBJ files in
different colors, so that the lap compares.

    python sections.py <out.png> <obj> [<obj> ...] --x 0,0.03,0.06 --box z0,z1,y0,y1
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

args = sys.argv[1:]
out = args[0]
xs = [0.0, 0.03, 0.06]
box = None
objs = []
i = 1
while i < len(args):
    if args[i] == '--x':
        xs = [float(v) for v in args[i + 1].split(',')]; i += 2
    elif args[i] == '--box':
        box = [float(v) for v in args[i + 1].split(',')]; i += 2
    else:
        objs.append(args[i]); i += 1

def load(path):
    v, f = [], []
    for line in open(path):
        if line.startswith('v '):
            v.append([float(a) for a in line.split()[1:4]])
        elif line.startswith('f '):
            f.append([int(a.split('/')[0]) - 1 for a in line.split()[1:4]])
    return np.array(v), np.array(f)

def cut(v, f, x0):
    segs = []
    for t in f:
        p = v[t]
        s = p[:, 0] - x0
        pts = []
        for a in range(3):
            b = (a + 1) % 3
            if (s[a] < 0) != (s[b] < 0):
                r = s[a] / (s[a] - s[b])
                q = p[a] + (p[b] - p[a]) * r
                pts.append((-q[2], q[1]))  # forward = -z, up = y
        if len(pts) == 2:
            segs.append(pts)
    return segs

colors = [(255, 80, 80), (80, 200, 255), (120, 255, 120), (255, 220, 60)]
dashes = [None, None, None]
meshes = [load(p) for p in objs]
if box is None:
    v = meshes[0][0]
    box = [v[:, 2].min() * -1 - 0.3, v[:, 2].min() * -1, v[:, 1].min(), v[:, 1].max()]
z0, z1, y0, y1 = box
W = 900
H = int(W * (y1 - y0) / (z1 - z0))
img = Image.new('RGB', (W, H), (20, 20, 20))
d = ImageDraw.Draw(img)
def px(p):
    return ((p[0] - z0) / (z1 - z0) * W, H - (p[1] - y0) / (y1 - y0) * H)
# grid of 1 cm
for k in range(int(z0 * 100), int(z1 * 100) + 1):
    X = (k / 100 - z0) / (z1 - z0) * W
    d.line([(X, 0), (X, H)], fill=(45, 45, 45) if k % 5 else (80, 80, 80))
for k in range(int(y0 * 100), int(y1 * 100) + 1):
    Y = H - (k / 100 - y0) / (y1 - y0) * H
    d.line([(0, Y), (W, Y)], fill=(45, 45, 45) if k % 5 else (80, 80, 80))
for m, (v, f) in enumerate(meshes):
    for j, x0 in enumerate(xs):
        c = colors[m % len(colors)]
        shade = 1.0 - 0.3 * j
        c = tuple(int(a * shade) for a in c)
        for s in cut(v, f, x0):
            d.line([px(s[0]), px(s[1])], fill=c, width=2)
d.text((5, 5), ' '.join('%s=%s' % (k, o.split('/')[-2] if '/' in o else o) for k, o in zip('RBGY', objs)) + '  x=' + ','.join(map(str, xs)), fill=(255, 255, 255))
img.save(out)
print(out, W, H)
