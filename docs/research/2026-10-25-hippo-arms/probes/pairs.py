"""Pair sheets of close-views cells: for each view, the moments in columns, main above the tree.

usage: pairs.py <dir> <out prefix> [views] [moments] [crop box x0,y0,x1,y1 as shares] [scale]
"""
import os
import sys

from PIL import Image, ImageDraw

d, prefix = sys.argv[1], sys.argv[2]
views = (sys.argv[3] if len(sys.argv) > 3 else 'front,left,right,back').split(',')
moments = (sys.argv[4] if len(sys.argv) > 4 else 'frog,tip,crossing,rest,lift50,lower50').split(',')
box = [float(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
role = 'bassist'
for view in views:
    cells = []
    for m in moments:
        pair = []
        for tag in ('base-', ''):
            p = os.path.join(d, f'{role}-{tag}{m}-{view}.png')
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert('RGB')
            if box:
                w, h = im.size
                im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
            if scale != 1.0:
                im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
            ImageDraw.Draw(im).text((4, 4), f'{"main" if tag else "tree"} {m} {view}',
                                    fill=(255, 255, 0))
            pair.append(im)
        if pair:
            cells.append(pair)
    if not cells:
        continue
    w, h = cells[0][0].size
    out = Image.new('RGB', (w * len(cells), h * 2), (30, 30, 30))
    for i, pair in enumerate(cells):
        for j, im in enumerate(pair):
            out.paste(im, (i * w, j * h))
    path = f'{prefix}-{view}.png'
    out.save(path)
    print(path, out.size)
