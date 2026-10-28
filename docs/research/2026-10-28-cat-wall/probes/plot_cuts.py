"""Plots the cuts of wall_cuts2.py: one cell per level, trunk black, wall red, tube blue, bridge
green, the plane of the seam pink, grid 1 cm.

    uv run --no-project --with pillow python -I scratch/plot_cuts.py <out.png> <side> <json>...
"""
import json, sys
from PIL import Image, ImageDraw
out, side, files = sys.argv[1], sys.argv[2], sys.argv[3:]
S = float(__import__("os").environ.get("S", 22))
W, H = 440, 440
data = [json.load(open(f)) for f in files]
levels = data[0]['levels']
sheet = Image.new('RGB', (W * len(levels), H * len(files)), 'white')
col = {'trunk': (0, 0, 0), 'wall': (220, 0, 0), 'tube': (40, 90, 255), 'bridge': (0, 160, 0)}
for r, d in enumerate(data):
    for c, lv in enumerate(levels):
        im = Image.new('RGB', (W, H), 'white')
        dr = ImageDraw.Draw(im)
        cx, cz = float(__import__("os").environ.get("CX", 13)), float(__import__("os").environ.get("CZ", 5))
        def px(x, z):
            return (W / 2 + (z - cz) * S, H / 2 - (x - cx) * S)
        for g in range(-12, 13):
            dr.line([(W / 2 + g * S, 0), (W / 2 + g * S, H)], fill=(235, 235, 235))
            dr.line([(0, H / 2 + g * S), (W, H / 2 + g * S)], fill=(235, 235, 235))
        p = d['plane']
        xp = p['x'] - p['lean'] * (lv - p['armpit']) * 163.916
        dr.line([px(xp, -10), px(xp, 20)], fill=(255, 150, 200))
        for kind, pts, normal in d['cuts']['%s %.2f' % (side, lv)]:
            a, b = px(*pts[0]), px(*pts[1])
            dr.line([a, b], fill=col[kind], width=2)
            if kind in ('trunk', 'wall'):
                m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                dr.line([m, (m[0] + normal[1] * 8, m[1] - normal[0] * 8)], fill=(255, 170, 0))
        dr.text((4, 4), '%s %s h %.2f' % (files[r].split('/')[-1], side, lv), fill=(0, 0, 0))
        dr.text((4, 18), 'up: out (x), right: forward, grid 1 cm', fill=(0, 0, 0))
        sheet.paste(im, (c * W, r * H))
sheet.save(out)
