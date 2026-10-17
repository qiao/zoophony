"""Puts the four views of the cat sheet of the user above the standing cat of the app gallery from
the same four sides (front, left, back, three quarters), with labels, as one WebP image.

    uv run --no-project --with pillow python -I stand_sheet.py <sheet.png> <render dir> <out.webp>
"""
import sys

from PIL import Image, ImageDraw, ImageFont

sheet_path, renders, out = sys.argv[1:4]
W, H = 360, 520


def fit(im, w, h):
    im = im.copy()
    im.thumbnail((w, h))
    cell = Image.new('RGB', (w, h), (40, 40, 40))
    cell.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    return cell


def label(cell, text):
    d = ImageDraw.Draw(cell)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
    except OSError:
        font = ImageFont.load_default()
    box = d.textbbox((8, 6), text, font=font)
    d.rectangle((0, 0, box[2] + 8, box[3] + 6), fill=(0, 0, 0))
    d.text((8, 6), text, fill=(255, 255, 255), font=font)
    return cell


sheet = Image.open(sheet_path).convert('RGB')
quarter = sheet.width // 4
tops = [label(fit(sheet.crop((k * quarter, 150, (k + 1) * quarter, 860)), W, H), f'Sheet: {name}')
        for k, name in enumerate(('front', 'left', 'back', 'three quarters'))]
bottoms = [label(fit(Image.open(f'{renders}/stand-{name}.png').convert('RGB'), W, H), f'App: {text}')
           for name, text in (('front', 'front'), ('left', 'left'), ('back', 'back'),
                              ('q45', 'three quarters'))]
grid = Image.new('RGB', (4 * W, 2 * H))
for k, cell in enumerate(tops + bottoms):
    grid.paste(cell, ((k % 4) * W, (k // 4) * H))
grid.save(out, 'WEBP', quality=80)
