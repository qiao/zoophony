"""Puts crops of images side by side, each crop scaled 2x, with a label row.

uv run --no-project --with pillow python -I scratch/pair.py <out.png> <box x0,y0,x1,y1> <label>=<image>...
"""
import sys

from PIL import Image, ImageDraw

out, box = sys.argv[1], [int(v) for v in sys.argv[2].split(',')]
items = [arg.split('=', 1) for arg in sys.argv[3:]]
crops = []
for label, path in items:
    image = Image.open(path).convert('RGB').crop(box)
    image = image.resize((image.width * 2, image.height * 2), Image.LANCZOS)
    crops.append((label, image))
w = sum(c.width for _, c in crops) + 8 * (len(crops) - 1)
h = crops[0][1].height + 20
sheet = Image.new('RGB', (w, h), (255, 255, 255))
draw = ImageDraw.Draw(sheet)
x = 0
for label, crop in crops:
    sheet.paste(crop, (x, 20))
    draw.text((x + 4, 4), label, fill=(0, 0, 0))
    x += crop.width + 8
sheet.save(out)
print(out)
