"""Crop pairs (base | tree) of the bow elbow from the full frames of `close-views --lineup`.

    pairs.py <dir> <out.webp> <moment> <base label> <tree label> [<view>=<x,y,w,h>]...

Each box is a part of the frame (x, y, width, height). The default boxes hold the right elbow in
each view of `--views back,150,right,front,left,35`.
"""
import sys
from PIL import Image, ImageDraw

BOXES = {
    'back': (0.45, 0.22, 0.4, 0.4), 'az150': (0.42, 0.22, 0.4, 0.4),
    'right': (0.42, 0.28, 0.4, 0.4), 'front': (0.12, 0.3, 0.4, 0.4),
    'left': (0.3, 0.28, 0.4, 0.4), 'az35': (0.25, 0.3, 0.4, 0.4),
}
d, out, moment, base_label, tree_label = sys.argv[1:6]
for spec in sys.argv[6:]:
    view, box = spec.split('=')
    BOXES[view] = tuple(map(float, box.split(',')))
rows = []
for view, (x, y, w, h) in BOXES.items():
    cells = []
    for tag, name in ((base_label, f'{d}/violinist-base-{moment}-{view}.png'),
                      (tree_label, f'{d}/violinist-{moment}-{view}.png')):
        im = Image.open(name).convert('RGB')
        W, H = im.size
        c = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
        # Each crop takes the height of 480 pixels, so that boxes of each size line up.
        c = c.resize((round(c.width * 480 / c.height), 480), Image.LANCZOS)
        ImageDraw.Draw(c).text((8, 8), f'{tag}: {moment}, {view}', fill=(255, 255, 0))
        cells.append(c)
    row = Image.new('RGB', (cells[0].width * 2 + 8, 480))
    row.paste(cells[0], (0, 0))
    row.paste(cells[1], (cells[0].width + 8, 0))
    rows.append(row)
cols = 2
w = max(r.width for r in rows)
hgt = 480
sheet = Image.new('RGB', (cols * w + 8 * (cols - 1), ((len(rows) + cols - 1) // cols) * (hgt + 8)))
for k, r in enumerate(rows):
    sheet.paste(r, ((k % cols) * (w + 8), (k // cols) * (hgt + 8)))
sheet.save(out, quality=80)
print(out, sheet.size)
