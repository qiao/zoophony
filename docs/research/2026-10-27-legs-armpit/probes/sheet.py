"""Builds a labelled sheet of crops: sheet.py <out> <crop w>x<h>[@cx,cy] <scale> <row label>=<dir> ... -- <file name>...

Each row is a folder, each column a file name in it. The crop is centered at cx, cy (default the
middle of the frame) and scaled by <scale>.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
spec = sys.argv[2]
scale = float(sys.argv[3])
rest = sys.argv[4:]
cut = rest.index('--')
rows = [r.split('=', 1) for r in rest[:cut]]
files = rest[cut + 1:]
size, _, center = spec.partition('@')
w, h = (int(v) for v in size.split('x'))
cw, ch = int(w * scale), int(h * scale)
pad = 28
left = 90
sheet = Image.new('RGB', (left + cw * len(files), pad + (ch + pad) * len(rows)), 'white')
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for c, f in enumerate(files):
    draw.text((left + c * cw + 6, 4), os.path.splitext(f)[0].replace('play-', ''), fill='black', font=font)
for r, (label, d) in enumerate(rows):
    y = pad + r * (ch + pad)
    draw.text((6, y + ch // 2), label, fill='black', font=font)
    for c, f in enumerate(files):
        path = os.path.join(d, f)
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGB')
        if center:
            cx, cy = (int(v) for v in center.split(','))
        else:
            cx, cy = im.width // 2, im.height // 2
        box = (cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2)
        crop = im.crop(box).resize((cw, ch), Image.LANCZOS)
        sheet.paste(crop, (left + c * cw, y))
sheet.save(out)
if out.endswith('.png'):
    sheet.save(out[:-4] + '.webp', quality=82)
print('wrote', out, sheet.size)
