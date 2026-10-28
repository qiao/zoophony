"""Builds the sheets of phase 1 from the renders of render-variant.sh.

    DEFAULT_CROP=<l,t,r,b> uv run --no-project --with pillow python -I sheet.py \
      <render root> <out dir> <variant folder>:<label>...

The render root holds one folder for each variant, each with play/, rest/, role/, default/, and
default-rest/. The frames of main come from the folder of the first variant (each render has
main beside the tree). DEFAULT_CROP cuts the pianist out of the default view. The sheets:
views-play and views-rest, with main in the top row and one row for each variant.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

root, out = sys.argv[1], sys.argv[2]
given = [a.split(':', 1) for a in sys.argv[3:]]
os.makedirs(out, exist_ok=True)
VARIANTS = [('main', given[0][0], True)] + [(label, folder, False) for folder, label in given]
STAGE = [('left', 'at-polar-bear-az-90'), ('back', 'at-polar-bear-az180'),
         ('image 53 angle', 'at-polar-bear-az-75')]
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
    small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except OSError:
    font = small = ImageFont.load_default()


def frame(variant, moment, name, base):
    prefix = 'play-base-' if base else 'play-'
    return Image.open(os.path.join(root, variant, moment, f'{prefix}{name}.png')).convert('RGB')


def role_frame(variant, moment, view, base):
    m = 'chord' if moment == 'play' else 'rest'
    name = f'pianist-base-{m}-{view}.png' if base else f'pianist-{m}-{view}.png'
    return Image.open(os.path.join(root, variant, 'role', name)).convert('RGB')


def label(im, text, f=small):
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), text, font=f)
    d.rectangle((0, 0, box[2] + 12, box[3] + 10), fill=(0, 0, 0))
    d.text((6, 4), text, font=f, fill=(255, 255, 255))
    return im


def fit(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def grid(rows, gap=6, bg=(255, 255, 255)):
    width = max(sum(c.width for c in r) + gap * (len(r) - 1) for r in rows)
    height = sum(r[0].height for r in rows) + gap * (len(rows) - 1)
    sheet = Image.new('RGB', (width, height), bg)
    y = 0
    for r in rows:
        x = 0
        for c in r:
            sheet.paste(c, (x, y))
            x += c.width + gap
        y += r[0].height + gap
    return sheet


def save(im, name):
    im.save(os.path.join(out, name + '.png'))
    im.save(os.path.join(out, name + '.webp'), quality=82)


CROP = tuple(int(v) for v in os.environ.get('DEFAULT_CROP', '0,0,0,0').split(','))
for moment in ('play', 'rest'):
    rows = []
    for name, variant, base in VARIANTS:
        cells = [label(fit(frame(variant, moment, v, base), 420), f'{name}: {t}')
                 for t, v in STAGE]
        cells.append(label(fit(role_frame(variant, moment, 'az35', base), 420),
                           f'{name}: front 35'))
        d = frame(variant, 'default' if moment == 'play' else 'default-rest', 'default', base)
        if CROP[2] > 0:
            d = d.crop(CROP)
        cells.append(label(fit(d, 420), f'{name}: default view'))
        rows.append(cells)
    save(grid(rows), f'views-{moment}')
print('wrote', out)
