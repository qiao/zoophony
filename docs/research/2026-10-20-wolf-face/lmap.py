"""Front map of the Oklab lightness of the head faces: each face drawn in gray by its L, with the
L value written at its center for front faces in a region. python -I lmap.py faces.json out.png x0 x1 y0 y1"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); x0, x1, y0, y1 = map(float, sys.argv[3:7]); PX = 6000
def L(c):
    r, g, b = c
    l = np.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b); m = np.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b); s = np.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b)
    return 0.2104542553*l+0.793617785*m-0.0040720468*s
W = int((x1-x0)*PX); H = int((y1-y0)*PX)
im = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(im)
fs = []
for f in d['faces']:
    p = np.array(f['p']); n = np.cross(p[1]-p[0], p[2]-p[0])
    if n[2] <= 0: continue
    fs.append((p[:, 2].mean(), f, p))
fs.sort(key=lambda t: t[0])
for z, f, p in fs:
    v = int(L(f['c'])*255) if f['f'] == 'matte' else 0
    col = (v, v, v) if f['f'] == 'matte' else (0, 0, 120)
    pts = [((x1-q[0])*PX, (y1-q[1])*PX) for q in p]
    dr.polygon(pts, fill=col, outline=(90, 60, 60))
for z, f, p in fs:
    c = p.mean(0)
    X, Y = (x1-c[0])*PX, (y1-c[1])*PX
    if 0 < X < W and 0 < Y < H and f['f'] == 'matte':
        dr.text((X-8, Y-4), f"{L(f['c']):.2f}", fill=(255, 0, 0))
for k in range(int(x0*100), int(x1*100)+1):
    x = (x1-k/100)*PX; dr.line([(x, 0), (x, 10)], fill=(0, 255, 0)); dr.text((x+2, 10), f'{k/100:.2f}', fill=(0, 255, 0))
for k in range(int(y0*100), int(y1*100)+1):
    y = (y1-k/100)*PX; dr.line([(0, y), (10, y)], fill=(0, 255, 0)); dr.text((12, y-5), f'{k/100:.2f}', fill=(0, 255, 0))
for e in d['eyes']:
    x = (x1-e[0])*PX; y = (y1-e[1])*PX; dr.ellipse([x-6, y-6, x+6, y+6], outline=(0, 160, 255), width=2)
im.save(sys.argv[2])
