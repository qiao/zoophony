"""usage: crop.py <dir> <out> <moment,...> <view,...> <x0,y0,x1,y1> [scale]: a grid of crops."""
import os
import sys

from PIL import Image, ImageDraw

d, out, moments, views, box = sys.argv[1:6]
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 1
box = [float(v) for v in box.split(',')]
moments = moments.split(',')
views = views.split(',')
cells = []
for m in moments:
    row = []
    for v in views:
        p = os.path.join(d, f'bassist-{m}-{v}.png')
        im = Image.open(p).convert('RGB')
        w, h = im.size
        im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{m} {v}', fill=(255, 255, 0))
        row.append(im)
    cells.append(row)
cw, ch = cells[0][0].size
g = Image.new('RGB', (cw * len(views), ch * len(moments)))
for i, row in enumerate(cells):
    for j, im in enumerate(row):
        g.paste(im, (j * cw, i * ch))
g.save(out)
print(out, g.size)
