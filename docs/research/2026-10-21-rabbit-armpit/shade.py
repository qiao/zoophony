"""Renders the posed or bind mesh of an id probe json with flat Lambert shading, from a camera
around a point, and labels chosen faces. Usage:
shade.py <json> <posed|bind> <cx,cy,cz> <azimuth> <elevation> <dist> <out png> [faces to mark]"""
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw
m = json.load(open(sys.argv[1]))
P = np.array(m[sys.argv[2]]).reshape(-1, 3)
c = np.array([float(x) for x in sys.argv[3].split(',')])
az, el, dist = math.radians(float(sys.argv[4])), math.radians(float(sys.argv[5])), float(sys.argv[6])
out = sys.argv[7]
mark = set(int(x) for x in sys.argv[8].split(',')) if len(sys.argv) > 8 and sys.argv[8] else set()
C = np.array(m['corners']).reshape(-1, 3)
# The model faces +z. Azimuth 0 looks at the front, 90 from the right side (+x).
eye = c + dist * np.array([math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el)])
f = c - eye; f /= np.linalg.norm(f)
r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r); u = np.cross(r, f)
S, focal = 700, 700 / (2 * math.tan(math.radians(15)))
q = P - eye
z = q @ f; x = q @ r / z * focal + S / 2; y = -(q @ u) / z * focal + S / 2
img = np.zeros((S, S, 3)); dep = np.full((S, S), np.inf); idb = np.full((S, S), -1)
light = np.array([0.4, 0.8, 0.45]); light /= np.linalg.norm(light)
for t, (a, b, cc) in enumerate(C):
    n = np.cross(P[b] - P[a], P[cc] - P[a]); nn = np.linalg.norm(n)
    if nn == 0: continue
    n /= nn
    facing = n @ (-f) > 0 if True else True
    shade = 0.25 + 0.75 * max(0, n @ light)
    col = np.array([1, 0.95, 0.9]) * shade if facing else np.array([0.2, 0.2, 1.0])
    if t in mark: col = col * np.array([1, 0.55, 0.55])
    xs, ys = x[[a, b, cc]], y[[a, b, cc]]
    x0, x1 = max(0, int(xs.min())), min(S - 1, int(xs.max()) + 1)
    y0, y1 = max(0, int(ys.min())), min(S - 1, int(ys.max()) + 1)
    area = (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0])
    if abs(area) < 1e-9 or x1 < x0 or y1 < y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    w0 = ((xs[1] - gx) * (ys[2] - gy) - (xs[2] - gx) * (ys[1] - gy)) / area
    w1 = ((xs[2] - gx) * (ys[0] - gy) - (xs[0] - gx) * (ys[2] - gy)) / area
    w2 = 1 - w0 - w1
    inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
    d = w0 * z[a] + w1 * z[b] + w2 * z[cc]
    sub = dep[y0:y1 + 1, x0:x1 + 1]
    upd = inside & (d < sub)
    sub[upd] = d[upd]
    img[y0:y1 + 1, x0:x1 + 1][upd] = col
    idb[y0:y1 + 1, x0:x1 + 1][upd] = t
im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
dr = ImageDraw.Draw(im)
for t in np.unique(idb):
    if t < 0: continue
    ys_, xs_ = np.nonzero(idb == t)
    if len(xs_) > 150 or t in mark:
        dr.text((xs_.mean() - 8, ys_.mean() - 5), str(t), fill=(160, 0, 0))
im.save(out)
