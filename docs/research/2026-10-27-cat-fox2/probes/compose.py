"""Puts views side by side at the same head height H, with the skull tops on one row, and draws a
line at each 0.5 H below the skull top. Each item: <file>:<label>:<x0>:<x1>:<top row>:<H px>.
python compose.py <out> <H out px> <rows of H> <item>..."""
import sys
from PIL import Image, ImageDraw

out, hpx, rows = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
items = []
for spec in sys.argv[4:]:
    f, label, x0, x1, top, h = spec.split(':')
    items.append((f, label, int(x0), int(x1), float(top), float(h)))
pad = int(0.6 * hpx)
height = int(rows * hpx) + pad + 30
tiles = []
for f, label, x0, x1, top, h in items:
    im = Image.open(f).convert('RGB')
    k = hpx / h
    y0 = max(0, int(top - pad / k))
    y1 = min(im.height, int(top + rows * h))
    crop = im.crop((x0, y0, x1, y1))
    crop = crop.resize((int(crop.width * k), int(crop.height * k)), Image.LANCZOS)
    off = pad - int((top - y0) * k)
    tiles.append((crop, off, label))
width = sum(t[0].width for t in tiles) + 10 * (len(tiles) + 1)
canvas = Image.new('RGB', (width, height), (200, 200, 205))
x = 10
for crop, off, label in tiles:
    canvas.paste(crop, (x, 30 + off))
    ImageDraw.Draw(canvas).text((x + 4, 4), label, fill=(0, 0, 0))
    x += crop.width + 10
d = ImageDraw.Draw(canvas)
n = 0
while n * 0.5 <= rows:
    y = 30 + pad + int(n * 0.5 * hpx)
    d.line([(0, y), (width, y)], fill=(220, 40, 40) if n % 2 == 0 else (90, 90, 240), width=1)
    d.text((2, y + 2), f'{n * 0.5:.1f} H', fill=(150, 0, 0))
    n += 1
canvas.save(out)
print(canvas.size)
