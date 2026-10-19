"""Puts the front cells of the close views of the base (top row) and of the round (bottom row)
side by side, and writes the whole grid at half size.

    uv run --no-project --with pillow python -I front-cells.py <bassist-base-views.png> <out dir>
"""
import sys

from PIL import Image, ImageDraw

grid = Image.open(sys.argv[1]).convert('RGB')
out_dir = sys.argv[2]
W, H = 360, 450
rows = {'frog': 0, 'tip': 1, 'crossing': 2, 'lower50': 5}
half = grid.height // 2
sheet = Image.new('RGB', (W * len(rows), 2 * H + 60), 'white')
draw = ImageDraw.Draw(sheet)
for k, (name, row) in enumerate(rows.items()):
    for j, (top, label) in enumerate(((0, 'base bb2a8026'), (half, 'this round'))):
        cell = grid.crop((0, top + row * H, W, top + (row + 1) * H))
        sheet.paste(cell, (k * W, 30 + j * (H + 30)))
        draw.text((k * W + 6, 8 + j * (H + 30)), f'{name}, front, {label}', fill='black')
sheet.save(f'{out_dir}/close-views-front.webp', 'WEBP', quality=85)
grid.resize((grid.width // 2, grid.height // 2), Image.LANCZOS).save(
    f'{out_dir}/close-views-grid.webp', 'WEBP', quality=80)
print('ok')
