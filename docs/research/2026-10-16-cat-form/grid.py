"""Builds a labeled grid image from cell images.

Usage: python3 grid.py <out.webp> <cell width> <cell height> <columns> <title> <label>=<png>|<label>=-...
Each item is one cell, row by row. "-" gives an empty cell. The output is WebP below 300 kB.
"""
import io
import sys

from PIL import Image, ImageDraw, ImageFont

out, cw, ch, cols, title, *items = sys.argv[1:]
cw, ch, cols = int(cw), int(ch), int(cols)
rows = (len(items) + cols - 1) // cols
head = 34
img = Image.new('RGB', (cw * cols, head + ch * rows), (24, 24, 28))
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 15)
    big = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 19)
except OSError:
    font = big = ImageFont.load_default()
draw.text((8, 7), title, fill=(255, 255, 255), font=big)
for i, item in enumerate(items):
    label, path = item.split('=', 1)
    x, y = (i % cols) * cw, head + (i // cols) * ch
    if path != '-':
        cell = Image.open(path).convert('RGB')
        scale = min(cw / cell.width, ch / cell.height)
        cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.LANCZOS)
        img.paste(cell, (x + (cw - cell.width) // 2, y + (ch - cell.height) // 2))
    if label:
        box = draw.textbbox((x + 6, y + 6), label, font=font)
        draw.rectangle((box[0] - 4, box[1] - 3, box[2] + 4, box[3] + 3), fill=(0, 0, 0))
        draw.text((x + 6, y + 6), label, fill=(255, 255, 255), font=font)
for quality in range(90, 20, -5):
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=quality, method=6)
    if buf.tell() <= 295_000:
        break
open(out, 'wb').write(buf.getvalue())
print(out, img.size, buf.tell(), 'bytes, quality', quality)
