"""Builds the sheet of the default view of each demo: main on the left and the tree on the right,
one row for each demo (`demos/<id>/` of final-images.sh).

    uv run --no-project --with pillow python -I demos_sheet.py <demos dir> <out.webp> [<width>]
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

root, out = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 520
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except OSError:
    font = ImageFont.load_default()
rows = []
for demo in sorted(os.listdir(root)):
    cells = []
    for name, label in (('play-base-default.png', 'main'), ('play-default.png', 'round')):
        im = Image.open(os.path.join(root, demo, name)).convert('RGB')
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        text = f'{demo}: {label}'
        box = d.textbbox((0, 0), text, font=font)
        d.rectangle((0, 0, box[2] + 12, box[3] + 10), fill=(0, 0, 0))
        d.text((6, 4), text, font=font, fill=(255, 255, 255))
        cells.append(im)
    rows.append(cells)
gap = 6
h = rows[0][0].height
sheet = Image.new('RGB', (2 * width + gap, len(rows) * (h + gap) - gap), (255, 255, 255))
for k, (a, b) in enumerate(rows):
    sheet.paste(a, (0, k * (h + gap)))
    sheet.paste(b, (width + gap, k * (h + gap)))
sheet.save(out, quality=80)
print('wrote', out, sheet.size)
