"""Renders posed meshes of scratch/dump-pose.ts with flat light, faces over a fold angle in red.

Usage: render.py <pose.json> <out.png> --az <deg> [--el <deg>] [--fold <deg>] [--box x0,y0,x1,y1]
[--label] [--sample <i>] [--size <px>] [--center x,y,z] [--span m]
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

a = sys.argv[1:]


def opt(k, d):
    return a[a.index(k) + 1] if k in a else d


data = json.load(open(a[0]))
out = a[1]
az = float(opt('--az', '0'))
el = float(opt('--el', '10'))
limit = float(opt('--fold', '60'))
size = int(opt('--size', '800'))
idx = int(opt('--sample', '0'))
labels = '--label' in a
s = data['samples'][idx]
P = np.array(s['posed']).reshape(-1, 3)
T = np.array(data['corners']).reshape(-1, 3)
folds = np.array(s['folds'])
# The camera turns around +y. Azimuth 0 looks at the front (+z) of the body, and a positive
# azimuth moves the camera to the right side of the animal (-x is the right side here? check).
t = np.radians(az)
e = np.radians(el)
fwd = np.array([-np.sin(t) * np.cos(e), -np.sin(e), -np.cos(t) * np.cos(e)])  # view direction
right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
up = np.cross(right, fwd)
if '--focus' in a:
    fs = [int(v) for v in opt('--focus', '').split(',')]
    c = P[T[fs]].reshape(-1, 3).mean(axis=0)
elif '--center' in a:
    c = np.array([float(v) for v in opt('--center', '').split(',')])
else:
    c = P.mean(axis=0)
span = float(opt('--span', str((P.max(0) - P.min(0)).max())))
Q = P - c
x = Q @ right
y = Q @ up
z = Q @ fwd
sx = (x / span + 0.5) * size
sy = (0.5 - y / span) * size
img = Image.new('RGB', (size, size), (40, 40, 48))
d = ImageDraw.Draw(img)
light = -fwd * 0.6 + up * 0.6 + right * 0.3
light /= np.linalg.norm(light)
n = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
nl = np.linalg.norm(n, axis=1, keepdims=True); nl[nl == 0] = 1
n = n / nl
depth = z[T].mean(axis=1)
order = np.argsort(-depth)
for k in order:
    facing = n[k] @ -fwd
    if facing < 0:
        continue
    lam = max(0.15, n[k] @ light)
    if folds[k] > 90:
        col = (int(60 + 60 * lam), int(60 + 60 * lam), int(200 * lam + 55))
    elif folds[k] > limit:
        col = (int(255 * lam), int(60 * lam), int(60 * lam))
    else:
        g = int(80 + 170 * lam)
        col = (g, g, int(g * 0.95))
    pts = [(sx[v], sy[v]) for v in T[k]]
    d.polygon(pts, fill=col, outline=(0, 0, 0) if labels else None)
if labels:
    for k in order:
        if (folds[k] > limit or '--all' in a) and n[k] @ -fwd > 0:
            m = (sx[T[k]].mean(), sy[T[k]].mean())
            d.text(m, str(k), fill=(255, 255, 0))
d.text((5, 5), f"{s['label']} az {az} el {el}, red > {limit:.0f} deg, blue folded", fill=(255, 255, 255))
img.save(out)
print(out)
