"""Puts crops of main above the same crops of the branch, as one WebP sheet.

Usage: python pair.py <out.webp> <x,y,w,h> <main prefix> <branch prefix> <cell>...
Each crop is the box of the cell, in shares, scaled to 480 px wide. The top row is main.
"""

import sys

from PIL import Image, ImageDraw

out = sys.argv[1]
x, y, w, h = (float(v) for v in sys.argv[2].split(','))
rows = [('main', sys.argv[3]), ('branch', sys.argv[4])]
cells = sys.argv[5:]


def crop(path: str, label: str) -> Image.Image:
    im = Image.open(path).convert('RGB')
    W, H = im.size
    c = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
    c = c.resize((480, int(c.size[1] * 480 / c.size[0])), Image.LANCZOS)
    d = ImageDraw.Draw(c)
    d.rectangle((0, 0, 7 * len(label) + 8, 14), fill=(0, 0, 0))
    d.text((4, 1), label, fill=(255, 255, 255))
    return c


tiles = [[crop(f'{p}-{cell}.png', f'{name} {cell}') for cell in cells] for name, p in rows]
ch = tiles[0][0].size[1]
sheet = Image.new('RGB', (480 * len(cells), ch * 2), (40, 40, 40))
for r, row in enumerate(tiles):
    for i, t in enumerate(row):
        sheet.paste(t, (i * 480, r * ch))
sheet.save(out, quality=80)
print(out, sheet.size)
