"""flap_labels.py <dir> <name>: draws the vertex indices and codes of <name>.json on each render
<name>-<view>.png of flap_look.py (700 px, ortho, the camera of look() of cat_arms.py)."""
import json, math, os, sys
from PIL import Image, ImageDraw
d, name = sys.argv[1], sys.argv[2]
J = json.load(open(os.path.join(d, name + '.json')))
T = J['target']
for view, az, el in J['views']:
    a, e = math.radians(az), math.radians(el)
    dv = (math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))
    f = (-dv[0], -dv[1], -dv[2])
    def cross(x, y): return (x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0])
    def nz(x):
        l = math.sqrt(sum(c*c for c in x)); return tuple(c / l for c in x)
    right = nz(cross(f, (0, 0, 1)))
    up = cross(right, f)
    png = os.path.join(d, f'{name}-{view}.png')
    im = Image.open(png).convert('RGB')
    W = im.size[0]
    dr = ImageDraw.Draw(im)
    COL = {0: (90, 90, 90), 1: (0, 90, 255), 3: (0, 150, 0), 4: (230, 120, 0), 5: (220, 0, 0)}
    rows = []
    for k, (co, pa, rg, sp, fl) in J['verts'].items():
        r = [co[i] - T[i] for i in range(3)]
        u = sum(r[i] * right[i] for i in range(3)) / J['scale']
        v = sum(r[i] * up[i] for i in range(3)) / J['scale']
        depth = sum(r[i] * dv[i] for i in range(3))
        rows.append((depth, k, pa, rg, sp, fl, (0.5 + u) * W, (0.5 - v) * W))
    for depth, k, pa, rg, sp, fl, px, py in sorted(rows):
        c = COL.get(pa % 10, (0, 0, 0))
        lab = f'{k}' + (f' r{rg}s{sp}' if pa % 10 == 3 else f' p{pa}')
        dr.ellipse((px - 2, py - 2, px + 2, py + 2), fill=c)
        dr.text((px + 3, py - 5), lab, fill=c)
    im.save(os.path.join(d, f'{name}-{view}-lab.png'))
