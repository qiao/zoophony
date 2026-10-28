"""Builds the sheet of the original mesh: the side view of the reference sheet, the standing
bodies of standing_side.py from the left and the front, and the seated binds of seated_side.py.

    uv run --no-project --with pillow python -I source_sheet.py <out dir> <reference png> \
      <standing side png> <standing front png> <seated side png> <label>...

Each render of the probes holds one square column for each body, in the order of the labels.
The reference is the side view of `polar-bear-views.png`, mirrored so that the bear faces left,
as the bodies do.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

out, ref_path, side_path, front_path, seated_path = sys.argv[1:6]
labels = sys.argv[6:]
os.makedirs(out, exist_ok=True)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
except OSError:
    font = ImageFont.load_default()


def label(im, text):
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), text, font=font)
    d.rectangle((0, 0, box[2] + 12, box[3] + 10), fill=(0, 0, 0))
    d.text((6, 4), text, font=font, fill=(255, 255, 255))
    return im


def columns(path):
    im = Image.open(path).convert('RGB')
    n = len(labels)
    w = im.width // n
    return [im.crop((k * w, 0, (k + 1) * w, im.height)) for k in range(n)]


H = 440
rows = []
ref = Image.open(ref_path).convert('RGB').crop((400, 60, 880, 412))
ref = ImageOps.mirror(ref)
ref = ref.resize((round(ref.width * H / ref.height), H), Image.LANCZOS)
for path, what in ((side_path, 'standing, left'), (front_path, 'standing, front'),
                   (seated_path, 'seated bind, left')):
    cells = [label(c.resize((H, H), Image.LANCZOS), f'{name}: {what}')
             for c, name in zip(columns(path), labels)]
    rows.append(cells)
rows[0].insert(0, label(ref, 'reference side view, mirrored'))
blank = Image.new('RGB', (ref.width, H), (255, 255, 255))
for r in rows[1:]:
    r.insert(0, blank)
gap = 6
width = max(sum(c.width for c in r) + gap * (len(r) - 1) for r in rows)
sheet = Image.new('RGB', (width, H * len(rows) + gap * (len(rows) - 1)), (255, 255, 255))
for k, r in enumerate(rows):
    x = 0
    for c in r:
        sheet.paste(c, (x, k * (H + gap)))
        x += c.width + gap
sheet.save(os.path.join(out, 'source.png'))
sheet.save(os.path.join(out, 'source.webp'), quality=82)
print('wrote', os.path.join(out, 'source.webp'))
