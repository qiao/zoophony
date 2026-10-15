# Puts one row of close views for each body, with a label over each cell.
import sys
from PIL import Image, ImageDraw, ImageFont

root, out, views = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
rows = sys.argv[4].split(',')
labels = sys.argv[5].split(',')
cells = [[Image.open(f'{root}/{r}/pianist-{v}.png').convert('RGB') for v in views] for r in rows]
w, h = cells[0][0].size
pad = 28
img = Image.new('RGB', (w * len(views), (h + pad) * len(rows)), 'white')
draw = ImageDraw.Draw(img)
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 16)
for r, row in enumerate(cells):
    for c, cell in enumerate(row):
        img.paste(cell, (c * w, r * (h + pad) + pad))
        draw.text((c * w + 6, r * (h + pad) + 5), f'{labels[r]}  {views[c]}', fill='black', font=font)
img.save(out)
print(out, img.size)
