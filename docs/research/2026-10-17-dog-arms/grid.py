"""Composes a grid of close view cells with a label above each row: grid.py <out.webp> <spec.json>"""
import json, sys
from PIL import Image, ImageDraw, ImageFont
out, spec = sys.argv[1], json.load(open(sys.argv[2]))
scale = spec.get('scale', 0.6)
cw, ch = int(360 * scale), int(450 * scale)
band = 30
rows = spec['rows']
cols = max(len(r['cells']) for r in rows)
W = cols * cw
H = sum(ch + band for _ in rows) + (40 if spec.get('title') else 0)
img = Image.new('RGB', (W, H), (24, 24, 24))
d = ImageDraw.Draw(img)
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 13)
y = 0
if spec.get('title'):
    d.text((8, 10), spec['title'], fill=(255, 255, 255), font=font)
    y = 40
for r in rows:
    d.text((8, y + 6), r['label'], fill=(255, 230, 160), font=font)
    y += band
    for k, c in enumerate(r['cells']):
        if c is None:
            continue
        cell = Image.open(c['file']).convert('RGB').resize((cw, ch), Image.LANCZOS)
        img.paste(cell, (k * cw, y))
        if c.get('label'):
            tw = d.textlength(c['label'], font=small)
            d.rectangle([k * cw + cw - tw - 10, y + ch - 22, k * cw + cw - 2, y + ch - 2], fill=(0, 0, 0))
            d.text((k * cw + cw - tw - 6, y + ch - 19), c['label'], fill=(255, 255, 255), font=small)
    y += ch
q = spec.get('quality', 80)
while True:
    img.save(out, 'WEBP', quality=q, method=6)
    import os
    if os.path.getsize(out) <= 300_000 or q <= 30:
        break
    q -= 8
print(out, img.size, os.path.getsize(out), 'q', q)
