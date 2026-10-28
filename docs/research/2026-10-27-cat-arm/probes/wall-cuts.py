"""Draws horizontal cuts of a cat arm copy (a GLB) near the left side wall: for each height, the
x (left) against z (forward) outline, in cm, with the plane of the seam as a red line.

    uv run --no-project --with numpy --with pillow python -I scratch/wall-cuts.py <out.png> <glb>...
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, 'scratch')
from importlib.machinery import SourceFileLoader  # noqa: E402

wr = SourceFileLoader('wr', 'scratch/wall-rim.py')
out, files = sys.argv[1], sys.argv[2:]
LEVELS = [0.50, 0.52, 0.54, 0.56, 0.58, 0.60]
S = 14  # pixels per cm
W, H = 420, 420
sheet = Image.new('RGB', (W * len(LEVELS), H * len(files)), 'white')
import json, struct  # noqa: E401,E402


def read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    start = 20 + n + 8
    def acc(i):
        a = j['accessors'][i]
        v = j['bufferViews'][a['bufferView']]
        off = start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        c = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2)}[a['componentType']]
        k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        return np.frombuffer(b[off:off + a['count'] * k * c[1]], dtype='<' + c[0]).reshape(-1, k)
    p = j['meshes'][0]['primitives'][0]
    return acc(p['attributes']['POSITION']).astype(float), acc(p['indices']).reshape(-1, 3)


for r, f in enumerate(files):
    pos, tris = read(f)
    lo, hi = pos[:, 1].min(), pos[:, 1].max()
    u = pos.copy()
    u[:, 1] -= lo
    u /= hi - lo
    for c, y in enumerate(LEVELS):
        im = Image.new('RGB', (W, H), 'white')
        d = ImageDraw.Draw(im)
        cx, cz = 0.10, 0.06  # the middle of the view, units
        def px(x, z):
            return (W / 2 + (z - cz) * 163.9 * S, H / 2 - (x - cx) * 163.9 * S)
        for g in range(-15, 16):
            d.line([(W / 2 + g * S, 0), (W / 2 + g * S, H)], fill=(235, 235, 235))
            d.line([(0, H / 2 + g * S), (W, H / 2 + g * S)], fill=(235, 235, 235))
        xp = 0.08 - 0.1 * (y - 0.6)
        d.line([px(xp, -0.2), px(xp, 0.3)], fill=(255, 120, 120))
        s = u[tris][:, :, 1] - y
        for t in np.nonzero((s > 0).any(axis=1) & (s < 0).any(axis=1))[0]:
            pts = []
            for i in range(3):
                a, b = tris[t, i], tris[t, (i + 1) % 3]
                da, db = u[a, 1] - y, u[b, 1] - y
                if (da < 0) != (db < 0):
                    q = u[a] + (u[b] - u[a]) * (da / (da - db))
                    pts.append(px(q[0], q[2]))
            if len(pts) == 2:
                d.line(pts, fill=(0, 0, 0), width=2)
        d.text((4, 4), f'{f.split("/")[-2]}/{f.split("/")[-1]} y {y:.2f} u', fill=(0, 0, 0))
        d.text((4, 18), 'up: left (x), right: forward (z), grid 1 cm', fill=(0, 0, 0))
        sheet.paste(im, (c * W, r * H))
sheet.save(out)
