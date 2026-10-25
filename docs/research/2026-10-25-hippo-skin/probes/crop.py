"""Crops a box of several images, scales each by a factor, and puts them side by side.
Usage: crop.py <out.png> x0,y0,x1,y1 <scale> <png> [<png> ...]"""
import sys
from PIL import Image, ImageDraw
out, box, scale = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], int(sys.argv[3])
cells = []
for p in sys.argv[4:]:
    im = Image.open(p).convert('RGB').crop(box)
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    d = ImageDraw.Draw(im)
    # A grid each 10 source pixels, to read the place of a mark.
    for x in range(0, im.width, 10 * scale):
        d.line([(x, 0), (x, 4)], fill=(255, 255, 0))
    for y in range(0, im.height, 10 * scale):
        d.line([(0, y), (4, y)], fill=(255, 255, 0))
    cells.append(im)
W = sum(c.width for c in cells) + 4 * (len(cells) - 1)
sheet = Image.new('RGB', (W, cells[0].height), (0, 0, 0))
x = 0
for c in cells:
    sheet.paste(c, (x, 0))
    x += c.width + 4
sheet.save(out)
