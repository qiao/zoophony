"""Crop pairs (base | tree) of one region of the full frames of close-views. pairs.py <dir> <out> <moment> <view:x,y,w,h>..."""
import sys
from PIL import Image, ImageDraw
d, out, moment = sys.argv[1:4]
rows = []
for spec in sys.argv[4:]:
    view, box = spec.split(':')
    x, y, w, h = map(float, box.split(','))
    cells = []
    for tag, name in (('51161830 (main)', f'{d}/violinist-base-{moment}-{view}.png'), ('dome share 1', f'{d}/violinist-{moment}-{view}.png')):
        im = Image.open(name).convert('RGB')
        W, H = im.size
        c = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
        c = c.resize((int(c.width * 1.5), int(c.height * 1.5)), Image.LANCZOS)  # A box of 1/3 of the width at 1.5 times the pixels.
        ImageDraw.Draw(c).text((8, 8), f'{tag}: {moment}, {view}', fill=(255, 255, 0))
        cells.append(c)
    row = Image.new('RGB', (sum(c.width for c in cells) + 8, max(c.height for c in cells)))
    row.paste(cells[0], (0, 0)); row.paste(cells[1], (cells[0].width + 8, 0))
    rows.append(row)
sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows) + 8 * len(rows)))
yy = 0
for r in rows:
    sheet.paste(r, (0, yy)); yy += r.height + 8
sheet.save(out, quality=82)
print(out, sheet.size)
