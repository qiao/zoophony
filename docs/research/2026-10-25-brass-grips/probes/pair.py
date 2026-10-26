# Makes pair sheets: the cells of main (the base) above the cells of the branch.
# Usage: pair.py <dir> <role> <moment> <views,...> <out.webp> [box x,y,w,h] [scale]
# The tool close-views writes <role>-base-<moment>-<view>.png (main) and <role>-<moment>-<view>.png.
import sys
from PIL import Image, ImageDraw

d, role, moment, views, out = sys.argv[1:6]
box = [float(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else [0, 0, 1, 1]
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0


def name(v):
    return 'az' + v if (v[0] == '-' or v[0].isdigit()) else v


rows = []
for label, prefix in (('main', f'{role}-base-'), ('branch', f'{role}-')):
    cells = []
    for v in views.split(','):
        im = Image.open(f'{d}/{prefix}{moment}-{name(v)}.png').convert('RGB')
        W, H = im.size
        x, y, w, h = box
        c = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
        if scale != 1.0:
            c = c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS)
        dr = ImageDraw.Draw(c)
        dr.rectangle((0, 0, 230, 18), fill=(0, 0, 0))
        dr.text((4, 3), f'{label} {moment} {name(v)}', fill=(255, 255, 0))
        cells.append(c)
    rows.append(cells)
cw, ch = rows[0][0].size
sheet = Image.new('RGB', (cw * len(rows[0]), ch * 2), (30, 30, 30))
for r, cells in enumerate(rows):
    for i, c in enumerate(cells):
        sheet.paste(c, (i * cw, r * ch))
sheet.save(out, quality=80)
print(out, sheet.size)
