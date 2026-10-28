import sys
from PIL import Image, ImageDraw
# Usage: sheetcrop.py <sheet.png> <out.png> <x> <y> <w> <h> [factor]: crops the same box of each
# cell of a sheet (5 moments as columns, base row above the round row) at 2x and stacks
# base above round.
src, out = sys.argv[1], sys.argv[2]
x, y, w, h = (int(v) for v in sys.argv[3:7])
f = float(sys.argv[7]) if len(sys.argv) > 7 else 1.5
im = Image.open(src).convert('RGB')
cols, rows = 5, 2
cw, ch = im.width // cols, im.height // rows
W, H = int(w * f), int(h * f)
g = Image.new('RGB', (W * cols, H * rows), (0, 0, 0))
for r in range(rows):
    for c in range(cols):
        cell = im.crop((c * cw + x, r * ch + y, c * cw + x + w, r * ch + y + h)).resize((W, H), Image.LANCZOS)
        g.paste(cell, (c * W, r * H))
d = ImageDraw.Draw(g)
d.text((4, 2), 'main', fill=(255, 255, 0)); d.text((4, H + 2), 'round', fill=(255, 255, 0))
g.save(out)
