"""Stacks rows of view images into one sheet: sheet.py <out> <label>=<dir>/<prefix> ... --views a,b,c."""

import sys
from PIL import Image, ImageDraw

args = sys.argv[1:]
out = args[0]
views = None
rows = []
i = 1
while i < len(args):
    if args[i] == '--views':
        views = args[i + 1].split(',')
        i += 2
        continue
    label, prefix = args[i].split('=', 1)
    rows.append((label, prefix))
    i += 1

imgs = []
for label, prefix in rows:
    ims = [Image.open(f'{prefix}-{v}.png').convert('RGB') for v in views]
    w = sum(im.width for im in ims)
    h = ims[0].height
    row = Image.new('RGB', (w, h))
    x = 0
    for im in ims:
        row.paste(im, (x, 0))
        x += im.width
    d = ImageDraw.Draw(row)
    d.rectangle([0, h - 22, 200, h], fill=(0, 0, 0))
    d.text((6, h - 18), label, fill=(255, 255, 0))
    imgs.append(row)

sheet = Image.new('RGB', (max(r.width for r in imgs), sum(r.height for r in imgs)))
y = 0
for r in imgs:
    sheet.paste(r, (0, y))
    y += r.height
sheet.save(out)
print(out, sheet.size)
