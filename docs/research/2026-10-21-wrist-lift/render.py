# uv run ... python -I scratch/render.py <dump.json> <side L|R> <azimuth deg> <half-size m> <out.png> [frame indices]
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
src, side, az, half, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
d = json.load(open(src))
corners = np.array(d['corners']).reshape(-1, 3)
colors = np.array(d['colors']).reshape(-1, 3)
pick = [int(x) for x in sys.argv[6].split(',')] if len(sys.argv) > 6 else range(len(d['frames']))
a = math.radians(az)
# camera looks toward +z after a turn of the model by -az around y
R = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
light = np.array([-0.4, 0.6, -0.7]); light /= np.linalg.norm(light)
S = 220
import os
FRONT = os.environ.get('FRONT', '1') == '1'
tiles = []
for k in pick:
    f = d['frames'][k]
    P = np.array(f['positions']).reshape(-1, 3) @ R.T
    c = (np.mean(f['wrists'], axis=0) if side == 'B' else np.array(f['wrists'][0 if side == 'L' else 1])) @ R.T
    tri = P[corners]
    tcol = colors
    if 'extra' in f and os.environ.get('EXTRA', '1') == '1':
        X = np.array(f['extra']).reshape(-1, 3, 3) @ R.T
        tri = np.concatenate([tri, X]); tcol = np.concatenate([colors, np.array(d['extraColors']).reshape(-1, 3)])
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    depth = tri[:, :, 2].mean(axis=1)
    img = Image.new('RGB', (2 * S, 2 * S), (92, 94, 100))
    dr = ImageDraw.Draw(img)
    for i in (np.argsort(depth) if FRONT else np.argsort(-depth)):
        pts = [(((p[0] - c[0]) * (1 if FRONT else -1) / half + 1) * S, ((-(p[1] - c[1])) / half + 1) * S) for p in tri[i]]
        if max(abs(x - S) for x, _ in pts) > 3 * S:
            continue
        shade = 0.35 + 0.65 * abs(float(n[i] @ light))
        col = tuple(int(255 * min(1, (tcol[i, j] * shade) ** (1 / 2.2))) for j in range(3))
        dr.polygon(pts, fill=col)
    dr.text((6, 6), f"{f['w']:.2f} s", fill=(255, 230, 0))
    tiles.append(img)
W = Image.new('RGB', (2 * S * len(tiles), 2 * S))
for i, t in enumerate(tiles):
    W.paste(t, (i * 2 * S, 0))
W.save(out)
print(out, W.size)
