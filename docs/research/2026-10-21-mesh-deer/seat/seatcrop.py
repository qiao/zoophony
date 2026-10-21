"""Crops the seat of the deer harpist from the rest views of pnpm close-views harpist --scale 3
--elevation 10 (cells of 1080 x 1350 px): the side, the back, the back right, and the right side.

    python -I seatcrop.py <dir> <out.png> [label]
"""
import sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
label = sys.argv[3] if len(sys.argv) > 3 else ''
boxes = {'left': (0.28, 0.6, 0.68, 0.86), 'back': (0.28, 0.58, 0.72, 0.86), 'seat': (0.3, 0.56, 0.76, 0.86), 'right': (0.32, 0.6, 0.72, 0.86)}
crops = []
for name, (x0, y0, x1, y1) in boxes.items():
    im = Image.open(f'{d}/harpist-rest-{name}.png').convert('RGB')
    w, h = im.size
    c = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))).resize((480, 330), Image.LANCZOS)
    ImageDraw.Draw(c).text((6, 4), f'{label} rest {name}', fill=(255, 255, 255))
    crops.append(c)
o = Image.new('RGB', (480 * 2, 330 * 2))
for k, c in enumerate(crops):
    o.paste(c, ((k % 2) * 480, (k // 2) * 330))
o.save(out)
