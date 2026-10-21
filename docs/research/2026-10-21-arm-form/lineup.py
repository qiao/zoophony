"""Makes the lineup of one animal: one row for each tree (main, the variants, the fox), the
cells of the play moment and the rest at the front and at the three-quarter view, and a second
image with 2x crops of the arms.

    python3 scratch/lineup.py <out-prefix> <play>,<rest> <crop x0,y0,x1,y1> <label>=<dir>/<role>...
"""
import sys
from PIL import Image, ImageDraw

out, moments, crop = sys.argv[1], sys.argv[2].split(','), [int(v) for v in sys.argv[3].split(',')]
rows = [a.split('=', 1) for a in sys.argv[4:]]
views = ['front', 'q34']
cw, ch = 360, 450
full = Image.new('RGB', (cw * 4, ch * len(rows)), 'white')
cx0, cy0, cx1, cy1 = crop
kw, kh = (cx1 - cx0), (cy1 - cy0)
crops = Image.new('RGB', (kw * 4, kh * len(rows)), 'white')
for r, (label, path) in enumerate(rows):
    d, role = path.rsplit('/', 1)
    for c, (m, v) in enumerate([(m, v) for m in moments for v in views]):
        if role == 'fox-violinist' and m == 'note':
            m = 'frog'
        im = Image.open(f'{d}/{role}-{m}-{v}.png').convert('RGB')
        a = im.resize((cw, ch))
        ImageDraw.Draw(a).text((6, 6), f'{label}: {m}, {v}', fill=(255, 255, 0))
        full.paste(a, (c * cw, r * ch))
        k = im.crop((cx0 // 2 * 2, cy0, cx1, cy1)) if False else im.crop((cx0, cy0, cx1, cy1))
        ImageDraw.Draw(k).text((6, 6), f'{label}: {m}, {v}', fill=(255, 255, 0))
        crops.paste(k, (c * kw, r * kh))
full.save(f'{out}-lineup.webp', quality=88)
crops.save(f'{out}-crops.webp', quality=90)
print('wrote', out)
