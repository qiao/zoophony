# Joins crops of several images side by side, with a label above each crop.
# Usage: strip.py <out> <x0,y0,x1,y1> <scale> <label=path>...
import sys
from PIL import Image, ImageDraw
out, box, scale = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], float(sys.argv[3])
cells = []
for arg in sys.argv[4:]:
    label, path = arg.split('=', 1)
    im = Image.open(path).convert('RGB').crop(box)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGB', (im.width, im.height + 22), (0, 0, 0))
    canvas.paste(im, (0, 22))
    ImageDraw.Draw(canvas).text((4, 4), label, fill=(255, 255, 0))
    cells.append(canvas)
w = sum(c.width for c in cells)
h = max(c.height for c in cells)
sheet = Image.new('RGB', (w, h))
x = 0
for c in cells:
    sheet.paste(c, (x, 0))
    x += c.width
sheet.save(out)
