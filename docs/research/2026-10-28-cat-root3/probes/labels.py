"""labels.py <png> <json> <tx,ty,tz> <scale> <az> <el> <out> [<radius m>]: draws the welded vertex
indices of the posed places (app axes) on a render of armwire.py (700 px, ortho)."""
import json, math, sys
from PIL import Image, ImageDraw
png, js, t, scale, az, el, out = sys.argv[1:8]
radius = float(sys.argv[8]) if len(sys.argv) > 8 else 0.05
tx, ty, tz = (float(v) for v in t.split(','))
scale, az, el = float(scale), math.radians(float(az)), math.radians(float(el))
# Blender axes: X = app x, Y = -app z, Z = app y. The camera looks along -d.
d = (math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))
up0 = (0, 0, 1)
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def norm(a):
    l = math.sqrt(sum(x*x for x in a)); return tuple(x / l for x in a)
right = norm(cross((-d[0], -d[1], -d[2]), up0))
up = cross(right, (-d[0], -d[1], -d[2]))
im = Image.open(png).convert('RGB')
W = im.size[0]
dr = ImageDraw.Draw(im)
P = json.load(open(js))
target = (tx, -tz, ty)
pts = []
for k, (x, y, z) in P.items():
    b = (x, -z, y)
    r = tuple(b[i] - target[i] for i in range(3))
    if math.sqrt(sum(c * c for c in r)) > radius:
        continue
    u = sum(r[i] * right[i] for i in range(3)) / scale
    v = sum(r[i] * up[i] for i in range(3)) / scale
    depth = sum(r[i] * d[i] for i in range(3))
    pts.append((depth, k, (0.5 + u) * W, (0.5 - v) * W))
for depth, k, px, py in sorted(pts):
    col = (255, 0, 0) if depth > 0 else (0, 0, 255)
    dr.ellipse((px - 2, py - 2, px + 2, py + 2), fill=col)
    dr.text((px + 3, py - 5), k, fill=col)
im.save(out)
