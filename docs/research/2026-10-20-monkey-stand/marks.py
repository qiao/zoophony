"""Draws the side view of the posed trumpet monkey of each variant, with a mark of the center of
mass and of the support area of the soles: the gray silhouette of the posed faces, forward to the
left (as the view "note, left"), the center of mass as a red dot with a red line down to the floor,
the support area as a green bar on the floor, and its middle as a green tick. The input files come
from `balance.ts --dump <file>`.

Usage:
    uv run --no-project --with pillow python -I marks.py <out.webp> <label>=<dump.json>...
"""
import json
import sys

from PIL import Image, ImageDraw

SCALE = 420  # pixels for each meter
W, H = 440, 520
FLOOR = 490


def centroid_z(poly):
    """Gives the z of the area centroid of the support area, as `polygonCentroid()` of
    `balance.ts` does."""
    a = cz = 0.0
    for (x0, z0), (x1, z1) in zip(poly, poly[1:] + poly[:1]):
        f = x0 * z1 - x1 * z0
        a += f
        cz += (z0 + z1) * f
    return cz / (3 * a)


def panel(data, title):
    """Draws one side view: forward (-z) to the left, up (+y) up."""
    img = Image.new('RGB', (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)
    mid_z = centroid_z(data['area'])

    def at(z, y):
        return (W / 2 + (z - mid_z) * SCALE, FLOOR - y * SCALE)

    for t in data['triangles']:
        d.polygon([at(t[2], t[1]), at(t[5], t[4]), at(t[8], t[7])], fill=(150, 140, 132))
    d.line([(0, FLOOR), (W, FLOOR)], fill=(90, 90, 90), width=1)
    area = [p[1] for p in data['area']]
    lo, hi = min(area), max(area)
    d.line([at(lo, 0), at(hi, 0)], fill=(20, 150, 60), width=6)
    middle = centroid_z(data['area'])
    mx, my = at(middle, 0)
    d.line([(mx, my - 14), (mx, my + 6)], fill=(20, 150, 60), width=3)
    cx, cy = at(data['com'][2], data['com'][1])
    d.line([(cx, cy), (cx, FLOOR)], fill=(200, 30, 30), width=2)
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(200, 30, 30))
    off = (middle - data['com'][2]) * 100
    d.rectangle([0, 0, W, 34], fill=(0, 0, 0))
    d.text((6, 4), title, fill=(255, 255, 255))
    d.text((6, 19), f'center of mass {off:+.1f} cm forward of the middle', fill=(255, 255, 255))
    return img


def main():
    out = sys.argv[1]
    cols = [arg.split('=', 1) for arg in sys.argv[2:]]
    grid = Image.new('RGB', (W * len(cols), H * 2), (255, 255, 255))
    for i, (label, path) in enumerate(cols):
        data = json.load(open(path))
        for j, moment in enumerate(('note', 'rest')):
            grid.paste(panel(data[moment], f'{label}: {moment}, side'), (i * W, j * H))
    grid.save(out, quality=90)
    print(out, grid.size)


main()
