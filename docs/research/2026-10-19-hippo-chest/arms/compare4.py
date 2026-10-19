"""Puts the screenshot of the user (the first cell of chest-compare.webp of the chest round) beside
the crops of three renders of the same view, with labels.

    uv run --no-project --with pillow python -I compare4.py <chest-compare.webp> <out webp> <png>:<label>...
"""
import sys

from PIL import Image, ImageDraw

compare_path, out_path, *specs = sys.argv[1:]
H = 978
shot = Image.open(compare_path).convert('RGB').crop((0, 40, 708, 40 + H))
box = (200, 119, 1200, 1500)
cells = [(shot, 'user screenshot')]
for spec in specs:
    path, label = spec.split(':', 1)
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
