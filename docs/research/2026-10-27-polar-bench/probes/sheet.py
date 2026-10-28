"""Builds the sheets of the round from the renders of render-variant.sh.

    DEFAULT_CROP=270,250,550,530 uv run --no-project --with pillow python -I sheet.py \
      <render root> <reference crop png> <out dir>

The render root holds v30, v34, and v38, each with play/, rest/, role/, default/, and
default-rest/. The frames of main come from the folder of v38. DEFAULT_CROP cuts the pianist out
of the default view. The sheets: views-play and views-rest (main above the variants), and side
(the reference side view beside the left side of each body).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

root, ref_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
VARIANTS = [('main', 'v38', True), ('bench 0.30 m', 'v30', False), ('bench 0.34 m', 'v34', False),
            ('bench 0.38 m', 'v38', False)]
if os.environ.get('VARIANTS'):
    # name:folder:base, separated by commas, such as main:final:1,round:final:0.
    VARIANTS = [(n, f, b == '1') for n, f, b in
                (v.split(':') for v in os.environ['VARIANTS'].split(','))]
STAGE = [('left', 'at-polar-bear-az-90'), ('back', 'at-polar-bear-az180'),
         ('image 47 angle', 'at-polar-bear-az-80')]
ROLE = [('front', 'role-front', 'front'), ('front 35', 'role', 'az35')]
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
    small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except OSError:
    font = small = ImageFont.load_default()


def frame(variant, moment, name, base):
    prefix = 'play-base-' if base else 'play-'
    return Image.open(os.path.join(root, variant, moment, f'{prefix}{name}.png')).convert('RGB')


def label(im, text, f=font):
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


# The default camera: crop the pianist from the stage frame.
CROP = tuple(int(v) for v in os.environ.get('DEFAULT_CROP', '0,0,0,0').split(','))

def role_frame(variant, moment, folder, view, base):
    m = 'chord' if moment == 'play' else 'rest'
    name = f"pianist-base-{m}-{view}.png" if base else f"pianist-{m}-{view}.png"
    return Image.open(os.path.join(root, variant, folder, name)).convert('RGB')


for moment in ('play', 'rest'):
    rows = []
    for name, variant, base in VARIANTS:
        cells = [label(fit(frame(variant, moment, v, base), 420), f'{name}: {t}', small)
                 for t, v in STAGE]
        cells += [label(fit(role_frame(variant, moment, f, v, base), 420), f'{name}: {t}', small)
                  for t, f, v in ROLE]
        dmoment = 'default' if moment == 'play' else 'default-rest'
        d = frame(variant, dmoment, 'default', base)
        if CROP[2] > 0:
            d = d.crop(CROP)
        cells.append(label(fit(d, 420), f'{name}: default view', small))
        rows.append(cells)
    save(grid(rows), f'views-{moment}')

# The side sheet: the reference side view beside the left side of each body.
ref = Image.open(ref_path).convert('RGB')
side = []
for moment in ('play', 'rest'):
    row = [label(fit(ref, 560), 'reference, mirrored')]
    for name, variant, base in VARIANTS:
        row.append(label(fit(frame(variant, moment, 'at-polar-bear-az-90', base), 560),
                         f'{name}, {moment}'))
    side.append(row)
save(grid(side), 'side')
print('wrote', out)
