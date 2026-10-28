"""Joins the view images of several labels into one sheet: one row for each label.

    uv run --no-project --with pillow python -I scratch/sheet.py <out> <name> <views> <label>...
"""
import sys

from PIL import Image, ImageDraw

out, name, views, labels = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4:]
size = 420
sheet = Image.new('RGB', (size * len(views), size * len(labels)), 'white')
for r, label in enumerate(labels):
    for c, v in enumerate(views):
        az, el = v.split(':')
        im = Image.open(f'../ov/{label}/{name}-az{az}-el{el}.png').convert('RGB').resize((size, size))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 200, 16], fill=(0, 0, 0))
        d.text((4, 2), f'{label} az{az} el{el}', fill=(255, 255, 255))
        sheet.paste(im, (c * size, r * size))
sheet.save(out)
