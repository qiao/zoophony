"""Draws the bend plane cuts of `arm-rings.ts --plane` side by side, each in its own axes:
the upper arm along +x from the shoulder, the forearm side up.

    uv run --no-project --with pillow python -I scratch/plane.py <out.png> <json>...
"""
import json
import sys

from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]
S = 1800  # pixels per meter
W, H = 760, 760
sheet = Image.new('RGB', (W * len(files), H), 'white')
for k, f in enumerate(files):
    d = json.load(open(f))
    im = Image.new('RGB', (W, H), 'white')
    dr = ImageDraw.Draw(im)
    ox, oy = 120, 420
    for g in range(-4, 40):
        x = ox + g * 0.01 * S
        dr.line([(x, 0), (x, H)], fill=(235, 235, 235) if g % 5 else (200, 200, 200))
    for g in range(-25, 25):
        yy = oy - g * 0.01 * S
        dr.line([(0, yy), (W, yy)], fill=(235, 235, 235) if g % 5 else (200, 200, 200))
    for s in d['segs']:
        a = (ox + s[0] * S, oy - s[1] * S)
        b = (ox + s[2] * S, oy - s[3] * S)
        dr.line([a, b], fill=(0, 0, 0), width=2)
    js = [(ox + p[0] * S, oy - p[1] * S) for p in d['joints']]
    dr.line(js, fill=(220, 0, 0), width=1)
    for p in js:
        dr.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], outline=(220, 0, 0))
    dr.text((8, 8), d['label'], fill=(0, 0, 0))
    dr.text((8, 22), 'grid 1 cm, bold 5 cm', fill=(0, 0, 0))
    sheet.paste(im, (k * W, 0))
sheet.save(out)
