"""usage: pair.py <dir> <out> <moment,...> <view> <x0,y0,x1,y1> <scale>: base row above tree row."""
import os
import sys

from PIL import Image, ImageDraw

d, out, moments, view, box, scale = sys.argv[1:7]
box = [float(v) for v in box.split(',')]
scale = float(scale)
moments = moments.split(',')
rows = []
for prefix, label in (('bassist-base-', 'base'), ('bassist-', 'tree')):
    row = []
    for m in moments:
        im = Image.open(os.path.join(d, f'{prefix}{m}-{view}.png')).convert('RGB')
        w, h = im.size
        im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{label} {m} {view}', fill=(255, 255, 0))
        row.append(im)
    rows.append(row)
cw, ch = rows[0][0].size
g = Image.new('RGB', (cw * len(moments), ch * 2))
for i, row in enumerate(rows):
    for j, im in enumerate(row):
        g.paste(im, (j * cw, i * ch))
g.save(out)
print(out, g.size)
