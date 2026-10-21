"""Crops the head of each view of `pnpm close-views <role> <dir> --target head --scale 3` and puts
the crops in one row for each moment: 4 times the scale of the head of the base views.

    uv run --no-project --with pillow python -I face_crops.py <dir> <role> <out.webp>
"""
import sys

from PIL import Image, ImageDraw

folder, role, out = sys.argv[1:4]
# The box of the head in a view of the base scale (360 x 450 px), for each view.
BOXES = {'front': (60, 100, 300, 340), 'front-60': (60, 100, 300, 340), 'side': (60, 100, 300, 340)}
rows = []
for moment in ('rest', 'note'):
    crops = []
    for view, (x0, y0, x1, y1) in BOXES.items():
        im = Image.open(f'{folder}/{role}-head-{moment}-{view}.png').convert('RGB')
        crop = im.crop((x0 * 3, y0 * 3, x1 * 3, y1 * 3))
        ImageDraw.Draw(crop).text((12, 12), f'{moment}, {view}', fill='white')
        crops.append(crop)
    rows.append(crops)
w, h = rows[0][0].size
sheet = Image.new('RGB', (w * 3, h * len(rows)))
for r, crops in enumerate(rows):
    for c, crop in enumerate(crops):
        sheet.paste(crop, (c * w, r * h))
sheet.save(out, quality=88)
