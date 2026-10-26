"""Makes a pair sheet: for each moment, a row of main above a row of the branch.

Usage: pairs.py <dir> <role> <moments,...> <views,...> <out.webp> [cell width]
Each cell reads <dir>/<role>-base-<moment>-<view>.png (main) and <dir>/<role>-<moment>-<view>.png.
"""
import sys
from PIL import Image, ImageDraw

src, role, moments, views, out = sys.argv[1:6]
width = int(sys.argv[6]) if len(sys.argv) > 6 else 360
moments = moments.split(',')
views = views.split(',')
cells = []
for m in moments:
    for base in (True, False):
        row = []
        for v in views:
            name = f"{src}/{role}-{'base-' if base else ''}{m}-{v}.png"
            im = Image.open(name).convert('RGB')
            h = round(im.height * width / im.width)
            im = im.resize((width, h), Image.LANCZOS)
            d = ImageDraw.Draw(im)
            label = f"{'main' if base else 'branch'} {m} {v}"
            d.rectangle([0, 0, 8 * len(label) + 8, 18], fill=(0, 0, 0))
            d.text((4, 3), label, fill=(255, 255, 255))
            row.append(im)
        cells.append(row)
h = cells[0][0].height
sheet = Image.new('RGB', (width * len(views), h * len(cells)), 'white')
for r, row in enumerate(cells):
    for c, im in enumerate(row):
        sheet.paste(im, (c * width, r * h))
sheet.save(out, quality=80)
print(out, sheet.size)
