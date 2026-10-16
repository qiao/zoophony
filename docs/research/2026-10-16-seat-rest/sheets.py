"""Puts the images of `views.ts` and `user-camera.ts` into labeled sheets as WebP files of at
most 300 kB. Usage:

    uv run --no-project --with pillow python -I sheets.py <views dir> <camera dir> <out dir>
"""
import os
import sys

from PIL import Image, ImageDraw

views, cameras, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)


def label(img, text):
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 8 + 7 * len(text), 16), fill='white')
    draw.text((4, 2), text, fill='black')
    return img


def save(sheet, name):
    path = os.path.join(out, name)
    for quality in (82, 74, 66, 58, 50):
        sheet.save(path, quality=quality)
        if os.path.getsize(path) <= 300_000:
            break
    print(path, os.path.getsize(path))


def grid(rows, cols, cell, name):
    w, h = cell
    sheet = Image.new('RGB', (w * len(cols), h * len(rows)), 'white')
    for r, (row_label, prefix) in enumerate(rows):
        for c, col in enumerate(cols):
            file = os.path.join(views, f'{prefix}-{col}.png')
            img = Image.open(file).convert('RGB').resize((w, h))
            sheet.paste(label(img, f'{row_label}: {col}'), (c * w, r * h))
    save(sheet, name)


knees = [('main', 'main'), ('knee +10', 'k10'), ('knee +20 (default)', 'k20'),
         ('knee +30', 'k30')]
grid(knees, ['fox-side', 'fox-front35', 'rabbit-side', 'rabbit-front35'], (240, 300),
     'knee-variants.webp')
backs = [('main (back 0.5 m, seat 0.36 m)', 'main'), ('back 0.5 m', 'b50'),
         ('back 0.45 m (default)', 'k20'), ('back 0.4 m', 'b40'), ('back 0.3 m', 'b30')]
grid(backs, ['lineup'], (1080, 450), 'chair-backs.webp')

frames = [('main', 'main'), ('branch (default)', 'k20')]
cells = []
for text, prefix in frames:
    img = Image.open(os.path.join(cameras, f'{prefix}-user-camera.png')).convert('RGB')
    img = img.crop((0, 140, 1440, 840)).resize((1080, 525))
    cells.append(label(img, text))
sheet = Image.new("RGB", (1080, 525 * len(cells)), "white")
for i, img in enumerate(cells):
    sheet.paste(img, (0, i * 525))
save(sheet, 'user-camera.webp')
