"""Puts cells of `pnpm close-views <role> --base main` in pairs: main above the branch.

Usage: pairs.py <dir> <role> <moment> <out> <view>[:<x>,<y>,<w>] ...
A view with no box takes the whole cell. A box is in the units of a cell of scale 1 (360 x 450):
its top left corner and its width, and the crop is square.
"""

import sys

from PIL import Image, ImageDraw

d, role, moment, out, specs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:]
rows = []
for pre, lab in [(f'{role}-base', 'main'), (role, 'branch')]:
    cells = []
    for spec in specs:
        view, _, box = spec.partition(':')
        im = Image.open(f'{d}/{pre}-{moment}-{view}.png').convert('RGB')
        k = im.width / 360
        if box:
            x, y, w = (int(v) for v in box.split(','))
            im = im.crop((int(x * k), int(y * k), int((x + w) * k), int((y + w) * k)))
            im = im.resize((420, 420), Image.LANCZOS)
        else:
            im = im.resize((360, 450), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{lab} {moment} {view}', fill=(255, 255, 0))
        cells.append(im)
    rows.append(cells)
w, h = rows[0][0].size
s = Image.new('RGB', (w * len(specs), h * 2))
for r, cells in enumerate(rows):
    for c, im in enumerate(cells):
        s.paste(im, (c * w, r * h))
s.save(out, quality=82)
print(out, s.size)
