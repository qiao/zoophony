"""sheet.py <dir> <moment> <out> [views] [box]: 3x crops of the arm roots, base row above tree row.
Optional <dir2>: a second variant dir gives a third row (env DIR2)."""
import os, sys
from PIL import Image, ImageDraw
d, moment, out = sys.argv[1], sys.argv[2], sys.argv[3]
views = (sys.argv[4] if len(sys.argv) > 4 else 'back,az150,az-150,front,left,right').split(',')
box = [float(v) for v in (sys.argv[5] if len(sys.argv) > 5 else '0.22,0.28,0.76,0.53').split(',')]
dirs = [('base ca6d2f71', d, 'cellist-base-'), (os.path.basename(d), d, 'cellist-')]
if os.environ.get('DIR2'):
    for extra in os.environ['DIR2'].split(':'):
        dirs.append((os.path.basename(extra), extra, 'cellist-'))
rows = []
for label, folder, pre in dirs:
    cells = []
    for v in views:
        im = Image.open(f'{folder}/{pre}{moment}-{v}.png').convert('RGB')
        w, h = im.size
        c = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        c = c.resize((c.width * 3 // 2, c.height * 3 // 2), Image.LANCZOS)
        ImageDraw.Draw(c).text((6, 4), f'{label}: {moment}, {v}', fill=(255, 255, 255))
        cells.append(c)
    rows.append(cells)
cw, ch = rows[0][0].size
sheet = Image.new('RGB', (cw * len(views), ch * len(rows)))
for r, cells in enumerate(rows):
    for k, c in enumerate(cells):
        sheet.paste(c, (k * cw, r * ch))
sheet.save(out, quality=82)
print(out, sheet.size)
