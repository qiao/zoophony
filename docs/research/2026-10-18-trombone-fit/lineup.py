"""Composes the lineup of the slide variants: one row for each variant, one column for each view.

Usage: python -I scratch/lineup.py <out.png> <views,...> <label>=<dir> ...
Each <dir> holds panda-play-<view>.png of `pnpm close-views species panda`.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1])
views = sys.argv[2].split(",")
rows = [arg.split("=", 1) for arg in sys.argv[3:]]
cells = [[Image.open(Path(d) / f"species-panda-play-{v}.png").convert("RGB") for v in views] for _, d in rows]
w, h = cells[0][0].size
scale = 1.0
cw, ch = int(w * scale), int(h * scale)
label_h = 52
head_h = 30
sheet = Image.new("RGB", (cw * len(views), head_h + (ch + label_h) * len(rows)), "white")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17)
except OSError:
    font = ImageFont.load_default()
for j, v in enumerate(views):
    draw.text((j * cw + 10, 6), v, fill="black", font=font)
for i, (label, _) in enumerate(rows):
    y = head_h + i * (ch + label_h)
    for line_no, line in enumerate(label.split("|")):
        draw.text((10, y + 6 + line_no * 21), line.strip(), fill="black", font=font)
    for j, cell in enumerate(cells[i]):
        sheet.paste(cell.resize((cw, ch)), (j * cw, y + label_h))
sheet.save(out)
print(out, sheet.size)
