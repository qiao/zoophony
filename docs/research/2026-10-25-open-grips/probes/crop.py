"""Crops boxes of cells and puts them in one sheet with labels.

Usage: python crop.py <out.png> <x,y,w,h> <cols> <label=path>...
The box is in shares of each cell. Each crop is scaled to 480 px wide.
"""

import sys

from PIL import Image, ImageDraw

out = sys.argv[1]
x, y, w, h = (float(v) for v in sys.argv[2].split(','))
cols = int(sys.argv[3])
prefix = sys.argv[4]
items = [(a, prefix + '-' + a + '.png') for a in sys.argv[5:]]
crops = []
for label, path in items:
    im = Image.open(path).convert('RGB')
    W, H = im.size
    c = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
    s = 480 / c.size[0]
    c = c.resize((480, int(c.size[1] * s)), Image.LANCZOS)
    d = ImageDraw.Draw(c)
    d.rectangle((0, 0, 8 * len(label) + 8, 16), fill=(0, 0, 0))
    d.text((4, 2), label, fill=(255, 255, 255))
    crops.append(c)
ch = crops[0].size[1]
rows = (len(crops) + cols - 1) // cols
sheet = Image.new('RGB', (480 * cols, ch * rows), (40, 40, 40))
for i, c in enumerate(crops):
    sheet.paste(c, ((i % cols) * 480, (i // cols) * ch))
sheet.save(out)
print(out, sheet.size)
