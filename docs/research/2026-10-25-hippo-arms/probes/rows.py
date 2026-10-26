"""Rows of close-views cells: one row for each <label>=<dir>[:<tag>], the moments in columns.

usage: rows.py <out> <view> <x0,y0,x1,y1 shares> <scale> <moments> <label>=<dir>[:<tag>]...
A tag `base` reads the cells of the base commit of a --base run.
"""
import os
import sys

from PIL import Image, ImageDraw

out, view, box, scale, moments = sys.argv[1:6]
box = [float(v) for v in box.split(',')]
scale = float(scale)
rows = []
for spec in sys.argv[6:]:
    label, rest = spec.split('=', 1)
    folder, _, tag = rest.partition(':')
    row = []
    for m in moments.split(','):
        name = f'bassist-{tag + "-" if tag else ""}{m}-{view}.png'
        im = Image.open(os.path.join(folder, name)).convert('RGB')
        w, h = im.size
        im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        ImageDraw.Draw(im).text((4, 4), f'{label} {m} {view}', fill=(255, 255, 0))
        row.append(im)
    rows.append(row)
w, h = rows[0][0].size
sheet = Image.new('RGB', (w * len(rows[0]), h * len(rows)), (30, 30, 30))
for j, row in enumerate(rows):
    for i, im in enumerate(row):
        sheet.paste(im, (i * w, j * h))
sheet.save(out)
print(out, sheet.size)
