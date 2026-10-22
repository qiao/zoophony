"""Joins the side views of the leg variants into one sheet: one row for main and for each leg
factor, then the seated rabbit and red fox, with the chord and the rest from each side.

Usage: uv run --no-project --with pillow python -I knees.py <dir> <out> <scale> <tag>=<label>...
<dir>/<tag>/ holds the images of `pnpm close-views pianist <dir>/<tag> --lineup --glb <file>
--views left,right --moments chord,rest --with violinist,fox-violinist --base 2da5c8ec`.
"""
import sys

from PIL import Image, ImageDraw

src, out, scale = sys.argv[1], sys.argv[2], float(sys.argv[3])
tags = [arg.split('=', 1) for arg in sys.argv[4:]]
first = tags[0][0]
cells = [('chord', 'left'), ('chord', 'right'), ('rest', 'left'), ('rest', 'right')]
rows = [('main 2da5c8ec', [f'{src}/{first}/pianist-base-{m}-{v}.png' for m, v in cells])]
rows += [(label, [f'{src}/{tag}/pianist-{m}-{v}.png' for m, v in cells]) for tag, label in tags]
other = {'chord': 'frog', 'rest': 'rest'}
for role in ('violinist', 'fox-violinist'):
    rows.append((role, [f'{src}/{first}/{role}-{other[m]}-{v}.png' for m, v in cells]))
w, h = Image.open(rows[0][1][0]).size
cw, ch = int(w * scale), int(h * scale)
sheet = Image.new('RGB', (cw * len(cells), ch * len(rows)), 'black')
draw = ImageDraw.Draw(sheet)
for r, (label, files) in enumerate(rows):
    for c, path in enumerate(files):
        sheet.paste(Image.open(path).convert('RGB').resize((cw, ch)), (c * cw, r * ch))
        text = f'{label}: {cells[c][0]}, {cells[c][1]}'
        draw.rectangle((c * cw, r * ch, c * cw + 7 * len(text) + 8, r * ch + 18), fill='black')
        draw.text((c * cw + 4, r * ch + 4), text, fill='white')
sheet.save(out, quality=80)
