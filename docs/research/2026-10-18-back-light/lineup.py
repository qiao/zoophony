# Makes lineup.webp (main and the three steps in the default view of Boulanger at 33.5 s, each with
# a crop of the back rows) and close-views.webp (the solo shots of the hippo and of the badger of
# the back row, main against step 2). Usage: python lineup.py <runs dir> <out dir>
import sys
from PIL import Image, ImageDraw, ImageFont

runs, out = sys.argv[1], sys.argv[2]
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except OSError:
    font = ImageFont.load_default()

def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, d.textlength(text, font=font) + 16, 32), fill=(0, 0, 0))
    d.text((8, 4), text, fill=(255, 255, 255), font=font)
    return im

STEPS = [
    ('main', 'main (d6485c4d): no back-row lights'),
    ('s1', 'step 1: back-row lights 1.69 lux'),
    ('s2', 'step 2 (the default): 2.25 lux'),
    ('s3', 'step 3: 2.81 lux'),
]
CROP = (330, 130, 1110, 340)
cell_w = 720
frame_h = 450
crop_h = round((CROP[3] - CROP[1]) * cell_w / (CROP[2] - CROP[0]))
sheet = Image.new('RGB', (2 * cell_w, 2 * (frame_h + crop_h)), (0, 0, 0))
for i, (name, text) in enumerate(STEPS):
    im = Image.open(f'{runs}/{name}/play-default.png').convert('RGB')
    x, y = (i % 2) * cell_w, (i // 2) * (frame_h + crop_h)
    sheet.paste(label(im.resize((cell_w, frame_h), Image.LANCZOS), text), (x, y))
    sheet.paste(im.crop(CROP).resize((cell_w, crop_h), Image.LANCZOS), (x, y + frame_h))
sheet.save(f'{out}/lineup.webp', quality=82)

SHOTS = [('close-hippo', 'hippo, solo at 234.5 s'), ('close-badger', 'badger, solo at 172.5 s')]
pairs = Image.new('RGB', (2 * cell_w, 2 * frame_h), (0, 0, 0))
for row, (shot, text) in enumerate(SHOTS):
    for col, (name, step) in enumerate([('main', 'main'), ('s2', 'step 2')]):
        im = Image.open(f'{runs}/{shot}/{name}.png').convert('RGB').resize((cell_w, frame_h), Image.LANCZOS)
        pairs.paste(label(im, f'{step}: {text}'), (col * cell_w, row * frame_h))
pairs.save(f'{out}/close-views.webp', quality=82)
