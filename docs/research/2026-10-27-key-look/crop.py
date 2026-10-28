# Crops the floor and conductor regions of the orchestra frames, 2x, with the boxes drawn.
# Usage: python -I crop.py <out.png> <frame>...
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]
frames = sys.argv[2:]
box = (480, 420, 1000, 800)
boxes = [(540, 700, 630, 780), (830, 700, 950, 760), (690, 580, 770, 650)]
cells = []
for f in frames:
    im = Image.open(f).convert('RGB')
    d = ImageDraw.Draw(im)
    for b in boxes:
        d.rectangle(b, outline=(0, 255, 0))
    cells.append(im.crop(box))
w, h = cells[0].size
sheet = Image.new('RGB', (w * len(cells), h))
for i, c in enumerate(cells):
    sheet.paste(c, (i * w, 0))
sheet.save(out)
