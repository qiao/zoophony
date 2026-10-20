import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for y in range(y0 - y0 % 10 + 10, y1, 10):
    L = 30 if y % 50 == 0 else 10
    d.line([(0, (y - y0) * k), (L, (y - y0) * k)], fill=(255, 0, 0), width=2)
    if y % 50 == 0: d.text((32, (y - y0) * k - 6), str(y), fill=(255, 60, 60))
for x in range(x0 - x0 % 10 + 10, x1, 10):
    L = 30 if x % 50 == 0 else 10
    d.line([((x - x0) * k, 0), ((x - x0) * k, L)], fill=(0, 255, 0), width=2)
    if x % 50 == 0: d.text(((x - x0) * k - 10, 32), str(x), fill=(60, 255, 60))
im.save(out)
