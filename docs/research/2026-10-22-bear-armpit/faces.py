"""Renders the posed body of `dump.ts` in an orthographic view with flat shading, and colors
named faces, so that the faces of a mark get their indices. Writes a PNG and prints the faces
with the most pixels in a box of the image.

    uv run --no-project --with pillow --with numpy python -I faces.py <dump.json> <pose> \
        <azimuth> <out.png> [--mark caps|rim|<faces>] [--box x0,y0,x1,y1] [--elev deg]
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

path, pose, az, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
opts = dict(zip(sys.argv[5::2], sys.argv[6::2]))
m = json.load(open(path))
P = np.array(m['bind'] if pose == 'bind' else m['poses'][pose]).reshape(-1, 3)
C = np.array(m['corners']).reshape(-1, 3)
caps, rim = set(m['caps']), set(m['rim'])
elev = np.radians(float(opts.get('--elev', '8')))
a = np.radians(az)
# The front of the body is -z. The camera direction (from the body to the camera) at azimuth a
# turns the front around +y; azimuth 90 is the right side of the animal (+x of the app is right).
d = np.array([np.sin(a) * np.cos(elev), np.sin(elev), -np.cos(a) * np.cos(elev)])
up0 = np.array([0.0, 1.0, 0.0])
right = np.cross(up0, d)
right /= np.linalg.norm(right)
up = np.cross(d, right)
W, H = 900, 1100
lo = P[:, 1].min() if '--box' not in opts else 0
scale = 600
cx = (P[:, 0].max() + P[:, 0].min()) / 2
cz = (P[:, 2].max() + P[:, 2].min()) / 2
ctr = np.array([cx, 1.0, cz])
sx = W / 2 + ((P - ctr) @ right) * scale
sy = H / 2 - ((P - ctr) @ up) * scale
sz = (P - ctr) @ d
zbuf = np.full((H, W), -1e9)
fid = np.full((H, W), -1, int)
light = np.array([0.3, 0.8, -0.5]) if az % 360 < 90 or az % 360 > 270 else np.array([0.3, 0.8, 0.5])
light = light / np.linalg.norm(light)
norms = np.cross(P[C[:, 1]] - P[C[:, 0]], P[C[:, 2]] - P[C[:, 0]])
norms /= np.linalg.norm(norms, axis=1, keepdims=True) + 1e-12
for f, (i, j, k) in enumerate(C):
    xs, ys, zs = sx[[i, j, k]], sy[[i, j, k]], sz[[i, j, k]]
    x0, x1 = int(max(0, np.floor(xs.min()))), int(min(W - 1, np.ceil(xs.max())))
    y0, y1 = int(max(0, np.floor(ys.min()))), int(min(H - 1, np.ceil(ys.max())))
    if x1 < x0 or y1 < y0:
        continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    den = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
    if abs(den) < 1e-9:
        continue
    l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / den
    l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / den
    l2 = 1 - l0 - l1
    inside = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
    z = l0 * zs[0] + l1 * zs[1] + l2 * zs[2]
    sub = zbuf[y0:y1 + 1, x0:x1 + 1]
    take = inside & (z > sub)
    sub[take] = z[take]
    fid[y0:y1 + 1, x0:x1 + 1][take] = f
mark = opts.get('--mark', '')
named = set()
if mark == 'caps':
    named = caps
elif mark == 'rim':
    named = rim
elif mark:
    named = {int(x) for x in mark.split(',')}
img = np.zeros((H, W, 3), np.uint8) + 30
shade = np.clip(norms @ light, 0, 1) * 0.75 + 0.15
facing = norms @ d
for f in np.unique(fid[fid >= 0]):
    px = fid == f
    if f in named:
        col = np.array([230, 40, 40]) if f in caps else np.array([240, 170, 30])
        img[px] = (col * (0.4 + 0.6 * shade[f])).astype(np.uint8)
    elif facing[f] < 0:
        img[px] = [40, 40, 220]  # A back face.
    else:
        img[px] = (np.array([200, 150, 110]) * shade[f]).astype(np.uint8)
im = Image.fromarray(img)
dr = ImageDraw.Draw(im)
counts = {}
if '--box' in opts:
    x0, y0, x1, y1 = [int(v) for v in opts['--box'].split(',')]
    dr.rectangle([x0, y0, x1, y1], outline=(0, 255, 0))
    ids, n = np.unique(fid[y0:y1, x0:x1], return_counts=True)
    counts = {int(i): int(c) for i, c in zip(ids, n) if i >= 0}
for f in named:
    ys_, xs_ = np.nonzero(fid == f)
    if len(xs_):
        dr.text((xs_.mean() - 8, ys_.mean() - 5), str(f), fill=(255, 255, 255))
dr.text((10, 10), f'{pose} az {az:g}', fill=(255, 255, 255))
im.save(out)
for f, c in sorted(counts.items(), key=lambda t: -t[1])[:30]:
    kind = 'cap' if f in caps else 'rim' if f in rim else ''
    print(f'face {f} {kind} px {c} ny {norms[f][1]:.2f} facing {facing[f]:.2f} arm '
          + ','.join(f'{m["arm"][v]:.2f}' for v in C[f]))
if '--back' in opts:
    ids, n = np.unique(fid[fid >= 0], return_counts=True)
    for f, c in zip(ids, n):
        if facing[f] < 0 and c > 3:
            kind = 'cap' if f in caps else 'rim' if f in rim else ''
            mid = P[C[f]].mean(0)
            print(f'back face {f} {kind} px {c} mid {mid.round(3)} arm ' + ','.join(f'{m["arm"][v]:.2f}' for v in C[f]))
