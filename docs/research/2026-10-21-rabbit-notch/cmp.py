"""Puts the frames of the user camera of several variants side by side. Usage: cmp.py <out> <var>..."""
import sys
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2:]
boxes = (('120', (650, 410, 846, 556)), ('90', (600, 400, 820, 560)), ('-120', (560, 380, 820, 560)))
rows = []
for az, box in boxes:
    cells = []
    for n in names:
        im = Image.open(f'scratch/var/{n}/play/play-at-rabbit-az{az}.png').convert('RGB').crop(box)
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
        d = ImageDraw.Draw(im); d.rectangle((0, 0, 150, 14), fill=(0, 0, 0)); d.text((3, 2), f'{n} az {az}', fill=(255, 255, 0))
        cells.append(im)
    row = Image.new('RGB', (sum(c.width for c in cells), cells[0].height))
    x = 0
    for c in cells:
        row.paste(c, (x, 0)); x += c.width
    rows.append(row)
o = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)))
y = 0
for r in rows:
    o.paste(r, (0, y)); y += r.height
o.save(out)
