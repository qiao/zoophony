# Makes 2x crop pairs of the close views: main on the left, the branch on the right.
# Usage: uv run --no-project --with pillow python -I pair.py <views dir> <out file> <x,y,w,h> <cell>...
# A cell is <moment>-<view>, such as lowest-front. Each cell gives one row of the sheet.
import sys
from PIL import Image, ImageDraw

folder, out, box = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]
cells = sys.argv[4:]
x, y, w, h = box
rows = []
for cell in cells:
    pair = Image.new('RGB', (4 * w, 2 * h))
    for k, name in enumerate([f'xylophonist-base-{cell}.png', f'xylophonist-{cell}.png']):
        crop = Image.open(f'{folder}/{name}').convert('RGB').crop((x, y, x + w, y + h))
        pair.paste(crop.resize((2 * w, 2 * h), Image.LANCZOS), (k * 2 * w, 0))
    draw = ImageDraw.Draw(pair)
    draw.text((6, 4), f'main: {cell}', fill=(255, 255, 255))
    draw.text((2 * w + 6, 4), f'branch: {cell}', fill=(255, 255, 255))
    rows.append(pair)
sheet = Image.new('RGB', (4 * w, 2 * h * len(rows)))
for i, row in enumerate(rows):
    sheet.paste(row, (0, i * 2 * h))
sheet.save(out, quality=82) if out.endswith('.webp') else sheet.save(out)
print(out, sheet.size)
