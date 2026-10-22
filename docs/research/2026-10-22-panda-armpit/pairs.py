"""Puts crops of close-views images side by side: one row for each prefix, one column for each
view, at one moment. Usage: pairs.py <out.png> <box x0,y0,x1,y1 fractions> <moment>
<views,...> <label=dir/prefix>..."""
import sys

from PIL import Image, ImageDraw

out, box, moment, views = sys.argv[1], [float(v) for v in sys.argv[2].split(',')], sys.argv[3], sys.argv[4].split(',')
rows = [a.split('=', 1) for a in sys.argv[5:]]
cells = []
for label, prefix in rows:
    row = []
    for v in views:
        im = Image.open(f'{prefix}-{moment}-{v}.png').convert('RGB')
        W, H = im.size
        c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
        ImageDraw.Draw(c).text((6, 6), f'{label} {moment} {v}', fill=(255, 255, 0))
        row.append(c)
    cells.append(row)
w, h = cells[0][0].size
sheet = Image.new('RGB', (w * len(views), h * len(rows)))
for r, row in enumerate(cells):
    for k, c in enumerate(row):
        sheet.paste(c, (k * w, r * h))
sheet.save(out)
