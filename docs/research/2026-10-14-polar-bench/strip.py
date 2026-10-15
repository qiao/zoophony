# Puts the same close view of each bench side by side, with a label over each cell.
import sys
from PIL import Image, ImageDraw, ImageFont

root, out, views = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
benches = sys.argv[4].split(',')
labels = sys.argv[5].split(',')
cells = [[Image.open(f'{root}/{b}/pianist-{v}.png').convert('RGB') for b in benches] for v in views]
w, h = cells[0][0].size
pad = 28
img = Image.new('RGB', (w * len(benches), (h + pad) * len(views)), 'white')
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except OSError:
    font = ImageFont.load_default()
for r, row in enumerate(cells):
    for c, cell in enumerate(row):
        img.paste(cell, (c * w, r * (h + pad) + pad))
        draw.text((c * w + 6, r * (h + pad) + 4), f'{labels[c]}  {views[r]}', fill='black', font=font)
img.save(out)
print(out, img.size)
