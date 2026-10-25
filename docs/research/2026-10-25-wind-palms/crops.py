"""Crops the paws of a role from cells of `close-views --scale 3`: main above the branch.

Usage: crops.py <dir> <role> <moment> <out> <view>:<x>,<y>,<w> ...
The box is in the units of a cell of scale 1 (360 x 450): its top left corner and its width.
"""

import sys

from PIL import Image, ImageDraw

d, role, moment, out, specs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:]
size = 420
rows = []
for pre, lab in [(f'{role}-base', 'main'), (role, 'branch')]:
    cells = []
    for spec in specs:
        view, box = spec.split(':')
        x, y, w = (int(v) for v in box.split(','))
        im = Image.open(f'{d}/{pre}-{moment}-{view}.png').convert('RGB')
        k = im.width / 360
        im = im.crop((int(x * k), int(y * k), int((x + w) * k), int((y + w) * k))).resize((size, size), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{lab} {moment} {view}', fill=(255, 255, 0))
        cells.append(im)
    rows.append(cells)
s = Image.new('RGB', (size * len(specs), size * 2))
for r, cells in enumerate(rows):
    for c, im in enumerate(cells):
        s.paste(im, (c * size, r * size))
s.save(out, quality=85)
print(out, s.size)
