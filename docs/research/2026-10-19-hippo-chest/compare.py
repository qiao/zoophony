"""Puts the screenshot of the user beside the crops of two renders of the same view, with labels.

    uv run --no-project --with pillow python -I compare.py <shot> <base png> <new png> <out webp>
"""
import sys

from PIL import Image, ImageDraw

shot_path, base_path, new_path, out_path = sys.argv[1:5]
H = 978
shot = Image.open(shot_path).convert('RGB')
shot = shot.resize((round(shot.width * H / shot.height), H), Image.LANCZOS)
# The crop of a 1200 x 1500 render with the aspect of the screenshot (236 x 326).
box = (200, 119, 1200, 1500)
cells = [(shot, 'user screenshot')]
for path, label in ((base_path, 'render, base bb2a8026'), (new_path, 'render, this round')):
    crop = Image.open(path).convert('RGB').crop(box)
    cells.append((crop.resize((round(crop.width * H / crop.height), H), Image.LANCZOS), label))
gap = 12
out = Image.new('RGB', (sum(c.width for c, _ in cells) + gap * (len(cells) - 1), H + 40), 'white')
draw = ImageDraw.Draw(out)
x = 0
for cell, label in cells:
    out.paste(cell, (x, 40))
    draw.text((x + 8, 12), label, fill='black')
    x += cell.width + gap
out.save(out_path, 'WEBP', quality=85)
print(out_path, out.size)
