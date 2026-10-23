"""srender.py <src.npz> <az> <elev> <out.png> [--label v,...] [--zoom px/u] [--all r]: flat render
of the source near the right shoulder (app view: azimuth 90 is the right side), with labels."""
import sys
import numpy as np
from PIL import Image, ImageDraw
z = np.load(sys.argv[1]); P = z['v'] * [-1, 1, -1]; C = z['tris']
az, el, out = float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
o = dict(zip(sys.argv[5::2], sys.argv[6::2]))
J = np.array([0.075, 0.475, -0.016])
a, e = np.radians(az), np.radians(el)
dv = np.array([np.sin(a) * np.cos(e), np.sin(e), -np.cos(a) * np.cos(e)])
right = np.cross([0, 1, 0], dv); right /= np.linalg.norm(right); up = np.cross(dv, right)
W = H = 1000; zoom = float(o.get('--zoom', '4500'))
ctr = J + np.array([0, -0.03, -0.03])
sx = W / 2 + ((P - ctr) @ right) * zoom; sy = H / 2 - ((P - ctr) @ up) * zoom; sz = (P - ctr) @ dv
N = np.cross(P[C[:, 1]] - P[C[:, 0]], P[C[:, 2]] - P[C[:, 0]]); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
zb = np.full((H, W), -1e9); fid = np.full((H, W), -1, int)
for f, (i, j, k) in enumerate(C):
    xs, ys, zs = sx[[i, j, k]], sy[[i, j, k]], sz[[i, j, k]]
    x0, x1 = int(max(0, np.floor(xs.min()))), int(min(W - 1, np.ceil(xs.max())))
    y0, y1 = int(max(0, np.floor(ys.min()))), int(min(H - 1, np.ceil(ys.max())))
    if x1 < x0 or y1 < y0: continue
    den = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
    if abs(den) < 1e-9: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / den
    l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / den
    l2 = 1 - l0 - l1; ins = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
    zz = l0 * zs[0] + l1 * zs[1] + l2 * zs[2]; sub = zb[y0:y1 + 1, x0:x1 + 1]; t = ins & (zz > sub)
    sub[t] = zz[t]; fid[y0:y1 + 1, x0:x1 + 1][t] = f
light = np.array([0.4, 0.8, -0.45]); light /= np.linalg.norm(light)
sh = np.clip(N @ light, 0, 1) * 0.7 + 0.2
img = np.zeros((H, W, 3)) + 30; fs = fid >= 0; F = fid[fs]
col = np.array([215, 205, 190]) * sh[F][:, None]; col[(N[F] @ dv) < 0] = [40, 40, 220]; img[fs] = col
im = Image.fromarray(img.astype(np.uint8)); dr = ImageDraw.Draw(im)
vis = set(np.unique(C[F].ravel()))
lab = list(map(int, o['--label'].split(','))) if '--label' in o else []
if '--all' in o:
    r = float(o['--all']); lab += [int(v) for v in np.nonzero(np.linalg.norm(P - J, axis=1) < r)[0] if v in vis]
for v in set(lab):
    c = (0, 255, 0) if v in vis else (255, 80, 80)
    dr.ellipse([sx[v] - 2, sy[v] - 2, sx[v] + 2, sy[v] + 2], fill=c); dr.text((sx[v] + 3, sy[v] - 5), str(v), fill=c)
dr.text((10, 10), f'source az {az:g} el {el:g}', fill=(255, 255, 255))
im.save(out)
