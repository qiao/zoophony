"""Builds a grid of close-view cells: one row for each cell name, one column for each folder.

uv run --no-project --with pillow python -I scratch/grid.py <out.png> <prefix> <cells> <scale> <label>=<dir>...
<cells> is a comma list such as frog-left,rest-front. Each image is <dir>/<prefix>-<cell>.png.
<scale> scales each cell, such as 0.6 or 1.
"""
import os
import sys

from PIL import Image, ImageDraw

out, prefix, cells, scale = sys.argv[1], sys.argv[2], sys.argv[3].split(','), float(sys.argv[4])
cols = [arg.split('=', 1) for arg in sys.argv[5:]]
tiles = {}
cw = ch = 0
for cell in cells:
    for label, folder in cols:
        own = folder.split('::')
        path = os.path.join(own[0], f"{own[1] if len(own) > 1 else prefix}-{cell}.png")
        image = Image.open(path).convert('RGB')
        image = image.resize((int(image.width * scale), int(image.height * scale)), Image.LANCZOS)
        tiles[(cell, label)] = image
        cw, ch = max(cw, image.width), max(ch, image.height)
sheet = Image.new('RGB', (len(cols) * (cw + 4), len(cells) * (ch + 16)), (255, 255, 255))
draw = ImageDraw.Draw(sheet)
for r, cell in enumerate(cells):
    for c, (label, _) in enumerate(cols):
        x, y = c * (cw + 4), r * (ch + 16)
        sheet.paste(tiles[(cell, label)], (x, y + 16))
        draw.text((x + 2, y + 2), f'{label} {cell}', fill=(0, 0, 0))
sheet.save(out)
print(out, sheet.size)
