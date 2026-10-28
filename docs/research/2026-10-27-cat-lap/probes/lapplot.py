"""Plots the lap edges of lap.ts --json in the front view (x across, t up) and the side view
(d across, t up), colored by the angle: gray < 15, yellow < 25, orange < 35, red over 35.
    python lapplot.py <out.png> <edges.json> [<edges.json> ...]
"""
import json
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
files = sys.argv[2:]
S = 18  # px per cm
panels = []
for path in files:
    edges = json.load(open(path))
    W, H = int(24 * S), int(24 * S)
    front = Image.new('RGB', (W, H), (15, 15, 15))
    side = Image.new('RGB', (int(16 * S), H), (15, 15, 15))
    df, ds = ImageDraw.Draw(front), ImageDraw.Draw(side)
    for img, dr in ((front, df), (side, ds)):
        for k in range(0, 60):
            dr.line([(0, H - k * S), (img.width, H - k * S)], fill=(40, 40, 40) if k % 5 else (70, 70, 70))
    def color(a):
        return (90, 90, 90) if a < 15 else (220, 200, 40) if a < 25 else (240, 130, 30) if a < 35 else (255, 40, 40)
    for e in sorted(edges, key=lambda e: e['angle']):
        (x0, t0, d0), (x1, t1, d1) = e['ends']
        c = color(e['angle'])
        w = 1 if e['angle'] < 25 else 3
        # front view: t from -6 cm to 18 cm up
        df.line([((x0 * 100 + 12) * S, H - (t0 * 100 + 6) * S), ((x1 * 100 + 12) * S, H - (t1 * 100 + 6) * S)], fill=c, width=w)
        ds.line([((d0 * 100 - 6) * S, H - (t0 * 100 + 6) * S), ((d1 * 100 - 6) * S, H - (t1 * 100 + 6) * S)], fill=c, width=w)
    df.text((4, 4), path.split('/')[-1] + ' front (x, t)', fill=(255, 255, 255))
    ds.text((4, 4), 'side (d, t)', fill=(255, 255, 255))
    row = Image.new('RGB', (front.width + side.width + 10, H))
    row.paste(front, (0, 0)); row.paste(side, (front.width + 10, 0))
    panels.append(row)
o = Image.new('RGB', (max(p.width for p in panels), sum(p.height + 6 for p in panels)))
y = 0
for p in panels:
    o.paste(p, (0, y)); y += p.height + 6
o.save(out)
