"""sheet.py <dir> <out prefix> [moments] [rows]: for each moment, a sheet of the right armpit crops
of each view (columns), base above the tree (rows), from the cells of close-views --lineup."""
import sys, os
from PIL import Image, ImageDraw
d, outp = sys.argv[1], sys.argv[2]
moments = (sys.argv[3] if len(sys.argv) > 3 else 'frog,tip,crossing,rest,lift50,lower50,stand').split(',')
rows = (sys.argv[4] if len(sys.argv) > 4 else 'base-,').split(',')
BOX = {'az35': (0.30, 0.40, 0.35, 0.27), 'az60': (0.28, 0.42, 0.35, 0.27), 'right': (0.30, 0.42, 0.35, 0.27),
       'front': (0.24, 0.42, 0.35, 0.27), 'az150': (0.36, 0.40, 0.35, 0.27), 'back': (0.42, 0.40, 0.35, 0.27),
       'left': (0.35, 0.40, 0.35, 0.27), 'az-150': (0.30, 0.40, 0.35, 0.27)}
for m in moments:
    views = [v for v in BOX if os.path.exists(f'{d}/violinist-{m}-{v}.png')]
    cells = []
    for r in rows:
        line = []
        for v in views:
            p = f'{d}/violinist-{r}{m}-{v}.png'
            if not os.path.exists(p): continue
            im = Image.open(p).convert('RGB'); w, h = im.size; x, y, bw, bh = BOX[v]
            c = im.crop((int(x * w), int(y * h), int((x + bw) * w), int((y + bh) * h)))
            ImageDraw.Draw(c).text((6, 6), f'{r or "tree "}{m} {v}', fill=(255, 255, 0))
            line.append(c)
        cells.append(line)
    cw, ch = cells[0][0].size
    s = Image.new('RGB', (cw * max(len(l) for l in cells), ch * len(cells)))
    for i, l in enumerate(cells):
        for j, c in enumerate(l): s.paste(c, (j * cw, i * ch))
    s.save(f'{outp}-{m}.png')
    print(f'{outp}-{m}.png')
