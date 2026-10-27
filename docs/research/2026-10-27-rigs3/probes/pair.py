"""Writes crop pairs of close-views play frames: pair.py <out.png> <scale> <dir>:<label>:<x0,y0,x1,y1>...
Each item gives one column: the frame play-base-<label>.png of <dir> above play-<label>.png."""
import sys
from PIL import Image, ImageDraw
out, scale = sys.argv[1], float(sys.argv[2])
cols = []
for item in sys.argv[3:]:
    d, label, box = item.split(':')
    box = tuple(int(v) for v in box.split(','))
    cells = []
    for name, tag in ((f'{d}/play-base-{label}.png', 'main'), (f'{d}/play-{label}.png', 'round')):
        im = Image.open(name).convert('RGB').crop(box)
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 4), f'{tag} {label}', fill=(255, 255, 255))
        cells.append(im)
    cols.append(cells)
w = sum(c[0].width for c in cols) + 6 * (len(cols) - 1)
h = max(c[0].height + c[1].height + 6 for c in cols)
sheet = Image.new('RGB', (w, h), 'white')
x = 0
for top, bottom in cols:
    sheet.paste(top, (x, 0))
    sheet.paste(bottom, (x, top.height + 6))
    x += top.width + 6
sheet.save(out)
