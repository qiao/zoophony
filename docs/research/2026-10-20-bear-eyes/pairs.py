# Makes the crop pairs of the round: for each view of the rest moment, the base commit above the
# tree, cropped at the head and enlarged. The folders come from pnpm close-views conductor <dir>
# --target head [...] --base 3a6932df.
# Usage: pairs.py <close-views dir> <out.webp> <factor> <view>=<x>,<y>,<w>,<h> ...
import sys
from PIL import Image, ImageDraw

folder, out, factor, specs = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4:]
cols = []
for spec in specs:
    view, box = spec.split('=')
    x, y, w, h = map(int, box.split(','))
    tiles = []
    for prefix in ('conductor-head-base-rest-', 'conductor-head-rest-'):
        im = Image.open(f'{folder}/{prefix}{view}.png').convert('RGB')
        tiles.append(im.crop((x, y, x + w, y + h)).resize((round(w * factor), round(h * factor)), Image.LANCZOS))
    cols.append((view, tiles))
pad = 6
W = sum(t[0].width for _, t in cols) + pad * (len(cols) - 1)
H = cols[0][1][0].height * 2 + pad + 22
g = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(g)
x0 = 0
for view, (a, b) in cols:
    d.text((x0 + 4, 5), f'{view}: 3a6932df above, the tree below', fill='black')
    g.paste(a, (x0, 22))
    g.paste(b, (x0, 22 + a.height + pad))
    x0 += a.width + pad
g.save(out, 'WEBP', quality=90)
