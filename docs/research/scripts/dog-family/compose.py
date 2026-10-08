"""Makes a side-by-side image of labeled rows.

    python3 compose.py <out.png> <row-height> '<title>|<img>[@x0,y0,x1,y1];<img>...' ...

Each row argument is a title, a bar, and a list of images separated by semicolons. An image can
have a crop box after @.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

out, height = sys.argv[1], int(sys.argv[2])
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except OSError:
    font = ImageFont.load_default()
BAR = 36
GAP = 8
rows = []
for arg in sys.argv[3:]:
    title, images = arg.split('|', 1)
    cells = []
    for item in images.split(';'):
        path, _, box = item.partition('@')
        img = Image.open(path).convert('RGB')
        if box:
            img = img.crop(tuple(int(v) for v in box.split(',')))
        cells.append(img.resize((int(img.width * height / img.height), height), Image.LANCZOS))
    width = sum(c.width for c in cells) + GAP * (len(cells) - 1)
    row = Image.new('RGB', (width, height), (17, 17, 17))
    x = 0
    for c in cells:
        row.paste(c, (x, 0))
        x += c.width + GAP
    rows.append((title, row))
width = max(r.width for _, r in rows)
canvas = Image.new('RGB', (width, sum(r.height + BAR for _, r in rows)), (17, 17, 17))
draw = ImageDraw.Draw(canvas)
y = 0
for title, row in rows:
    draw.text((10, y + 7), title, fill=(230, 225, 215), font=font)
    canvas.paste(row, (0, y + BAR))
    y += row.height + BAR
if canvas.width > 2400:
    canvas = canvas.resize((2400, int(canvas.height * 2400 / canvas.width)), Image.LANCZOS)
canvas.save(out, optimize=True)
print(canvas.size)
