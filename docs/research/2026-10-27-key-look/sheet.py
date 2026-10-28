# Builds a sheet of frames: one row for each folder, one column for each frame name.
# Usage: python -I sheet.py <out.webp> <cell width> <frame names, comma-separated>
#        <label>=<folder> ...
import sys
from PIL import Image, ImageDraw, ImageFont

out, width, names = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(',')
rows = [arg.split('=', 1) for arg in sys.argv[4:]]
first = Image.open(f'{rows[0][1]}/{names[0]}')
height = round(width * first.height / first.width)
label_h = 28
sheet = Image.new('RGB', (width * len(names), (height + label_h) * len(rows)), (16, 12, 10))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except OSError:
    font = ImageFont.load_default()
for r, (label, folder) in enumerate(rows):
    y = r * (height + label_h)
    draw.text((8, y + 4), label, fill=(240, 230, 210), font=font)
    for c, name in enumerate(names):
        cell = Image.open(f'{folder}/{name}').convert('RGB').resize((width, height), Image.LANCZOS)
        sheet.paste(cell, (c * width, y + label_h))
sheet.save(out, 'WEBP', quality=80, method=6)
print(out, sheet.size)
