"""Crops one pixel box of several images, scales it up, and puts the crops side by side.
Usage: zoom.py <out.png> <x0,y0,x1,y1> <factor> <label=path>..."""
import sys

from PIL import Image, ImageDraw

out, box, k = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], int(sys.argv[3])
cells = []
for arg in sys.argv[4:]:
    label, path = arg.split('=', 1)
    c = Image.open(path).convert('RGB').crop(box)
    c = c.resize((c.width * k, c.height * k), Image.LANCZOS)
    ImageDraw.Draw(c).text((6, 6), label, fill=(255, 255, 0))
    cells.append(c)
sheet = Image.new('RGB', (sum(c.width for c in cells), cells[0].height))
x = 0
for c in cells:
    sheet.paste(c, (x, 0))
    x += c.width
sheet.save(out)
