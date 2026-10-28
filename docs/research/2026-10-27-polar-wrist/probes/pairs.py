import sys
from PIL import Image, ImageDraw
# Usage: pairs.py <out> <dirA> <dirB> <name>...  Each row: A | B of one view, 320 px each.
out, da, db = sys.argv[1:4]
names = sys.argv[4:]
cw = 320
g = Image.new('RGB', (cw * 4, cw * ((len(names) + 1) // 2)), (0, 0, 0))
d = ImageDraw.Draw(g)
for k, n in enumerate(names):
    x, y = (k % 2) * 2 * cw, (k // 2) * cw
    for j, dd in enumerate((da, db)):
        im = Image.open(f'{dd}/play-{n}.png').convert('RGB').resize((cw, cw), Image.LANCZOS)
        g.paste(im, (x + j * cw, y))
        d.rectangle((x + j * cw, y, x + j * cw + 150, y + 13), fill=(0, 0, 0))
        d.text((x + j * cw + 2, y + 1), ('main ' if j == 0 else 'round ') + n, fill=(255, 255, 255))
g.save(out)
