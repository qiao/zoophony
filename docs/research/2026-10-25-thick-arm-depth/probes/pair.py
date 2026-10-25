"""Builds a 2x crop pair sheet: the same box of each cell of main (top) and of the tree (bottom).

uv run --no-project --with pillow python -I pair.py <dir> <role> <out.webp> <box> <cell>...
<box> is x0,y0,x1,y1 in the pixels of a cell. <cell> is the name of a cell, such as left-front:
the files are <dir>/<role>-base-<cell>.png and <dir>/<role>-<cell>.png.
"""
import sys

from PIL import Image, ImageDraw

folder, role, out, box = sys.argv[1:5]
cells = sys.argv[5:]
x0, y0, x1, y1 = (int(v) for v in box.split(','))
w, h = (x1 - x0) * 2, (y1 - y0) * 2
sheet = Image.new('RGB', (w * len(cells), h * 2), 'black')
for i, cell in enumerate(cells):
    for row, name in enumerate((f'{role}-base-{cell}', f'{role}-{cell}')):
        image = Image.open(f'{folder}/{name}.png').convert('RGB').crop((x0, y0, x1, y1))
        sheet.paste(image.resize((w, h), Image.LANCZOS), (i * w, row * h))
        label = ('main ' if row == 0 else 'tree ') + cell
        ImageDraw.Draw(sheet).text((i * w + 6, row * h + 6), label, fill='yellow')
sheet.save(out, quality=82)
print(out, sheet.size)
