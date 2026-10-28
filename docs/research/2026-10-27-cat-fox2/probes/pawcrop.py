"""Crops a square around a point of each view, for each prefix (a row), and labels it.
python pawcrop.py <out> <size px> <zoom> <prefix:label>... -- <view:x:y>..."""
import sys
from PIL import Image, ImageDraw
k = sys.argv.index('--')
out, size, zoom = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
rows = [a.split(':') for a in sys.argv[4:k]]
views = [(v.split(':')[0], int(v.split(':')[1]), int(v.split(':')[2])) for v in sys.argv[k + 1:]]
cell = int(size * zoom)
sheet = Image.new('RGB', (cell * len(views), cell * len(rows)), (0, 0, 0))
for r, (prefix, label) in enumerate(rows):
    for c, (view, x, y) in enumerate(views):
        try:
            im = Image.open(f'{prefix}-{view}.png').convert('RGB')
        except FileNotFoundError:
            continue
        crop = im.crop((x - size // 2, y - size // 2, x + size // 2, y + size // 2)).resize((cell, cell), Image.LANCZOS)
        sheet.paste(crop, (c * cell, r * cell))
        d = ImageDraw.Draw(sheet)
        d.rectangle([c * cell, r * cell, c * cell + 150, r * cell + 16], fill=(0, 0, 0))
        d.text((c * cell + 3, r * cell + 2), f'{label}: {view}', fill=(255, 255, 255))
sheet.save(out)
print(sheet.size)
