"""Draws the faces near each old eye of a rig, seen along the normal of its fan, from the JSON of
brow-faces.ts: the fan in green, the circles of 1 and 2 radii in blue, and the dark faces of the
probe in red. A label row on top names each JSON file.

    uv run --no-project --with pillow python -I docs/research/2026-10-16-fox-brow/draw.py \
        <out.png> <label>=<json>...
"""
import json
import sys

from PIL import Image, ImageDraw

S = 300
REACH = 3.2


def srgb(c):
    return tuple(int(255 * (12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055))
                 for x in c)


rows = [arg.split('=', 1) for arg in sys.argv[2:]]
img = Image.new('RGB', (2 * 2 * S + 20, len(rows) * (2 * S + 24)), (40, 40, 40))
dr = ImageDraw.Draw(img)
for r, (label, path) in enumerate(rows):
    d = json.load(open(path))
    top = r * (2 * S + 24)
    dr.text((6, top + 6), label, fill=(255, 255, 255))
    for k, side in enumerate(['L', 'R']):
        # Draw the middle of the face to the left side of each panel, so that both panels show the
        # inner corner of the eye at the left.
        flip = -1 if side == 'L' else 1
        ox = k * (2 * S + 20) + S
        oy = top + 24 + S
        sc = S / REACH
        dark = set(d[side]['dark'])
        for f in sorted(d[side]['faces'], key=lambda f: f['depth']):
            pts = [(ox - flip * p[0] * sc, oy - p[1] * sc) for p in f['pts']]
            dr.polygon(pts, fill=srgb(f['color']), outline=(0, 0, 0))
        for f in d[side]['faces']:
            if f['i'] in dark:
                pts = [(ox - flip * p[0] * sc, oy - p[1] * sc) for p in f['pts']]
                dr.polygon(pts, outline=(255, 0, 0), width=3)
        for f in d[side]['fan']:
            pts = [(ox - flip * p[0] * sc, oy - p[1] * sc) for p in f]
            dr.polygon(pts, outline=(0, 255, 0))
        for radii in (1, 2):
            dr.ellipse((ox - radii * sc, oy - radii * sc, ox + radii * sc, oy + radii * sc),
                       outline=(80, 160, 255))
        dr.text((ox - S + 6, top + 26), f'eye {side}, inner corner at the left', fill=(255, 255, 255))
img.save(sys.argv[1])
