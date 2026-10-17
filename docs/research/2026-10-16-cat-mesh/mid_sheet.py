"""Joins the images of the mid-report of the cat rig into one WebP of at most 300 kB: the sheet of
the user, the rig preview of the standing body and of the seated bind from four sides, the head
close of the gallery with the pea eyes, and the front of the standing body at each arm factor.

    uv run --no-project --with pillow python -I mid_sheet.py <sheet.png> <worktree> <out.webp>
"""
import io
import sys

from PIL import Image, ImageDraw, ImageFont

sheet_path, root, out = sys.argv[1:4]
W = 1600
font = ImageFont.load_default(size=22)


def fit(im, width):
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def label(im, text):
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), text, font=font)
    d.rectangle((0, 0, box[2] + 16, box[3] + 12), fill=(0, 0, 0))
    d.text((8, 4), text, fill=(255, 255, 255), font=font)
    return im


rows = []
sheet_im = Image.open(sheet_path).convert('RGB')
sheet_im = sheet_im.crop((0, 180, sheet_im.width, 840))
rows.append(label(fit(sheet_im, W),
                  'Sheet of the user (cat-views.png): front, left, back, three quarters'))
rows.append(label(fit(Image.open(f'{root}/scratch/rig-final/standing.png').convert('RGB'), W),
                  'Rig preview, standing body (the source): front, right, back, 35 degrees'))
rows.append(label(fit(Image.open(f'{root}/scratch/rig-final/seated.png').convert('RGB'), W),
                  'Rig preview, seated bind on the chair of the rig: front, right, back, 35 degrees'))
cells = [Image.open(f'{root}/scratch/head/head-front.png').convert('RGB'),
         Image.open(f'{root}/scratch/head/head-q35.png').convert('RGB')]
names = ['App gallery, head with the pea eyes', 'Same, 35 degrees']
for folder, name in (('base', 'factor 1 (0.254 m)'), ('variant-1', '2.08 (rabbit 0.506 m)'),
                     ('variant-2', '2.24 (red fox 0.545 m)'), ('variant-3', '2.55 (viola 0.617 m)')):
    im = Image.open(f'{root}/scratch/rig-arms/{folder}/standing.png').convert('RGB')
    q = im.width // 4
    cells.append(im.crop((0, 0, q, im.height)).resize((300, 300), Image.LANCZOS))
    names.append(f'Arms {name}')
size = (W - 5 * 4) // 6
row = Image.new('RGB', (W, size), (40, 40, 40))
x = 0
for im, name in zip(cells, names):
    cell = im.resize((size, size), Image.LANCZOS)
    d = ImageDraw.Draw(cell)
    small = ImageFont.load_default(size=15)
    box = d.textbbox((0, 0), name, font=small)
    d.rectangle((0, size - box[3] - 10, box[2] + 10, size), fill=(0, 0, 0))
    d.text((5, size - box[3] - 6), name, fill=(255, 255, 255), font=small)
    row.paste(cell, (x, 0))
    x += size + 4
rows.append(row)
height = sum(r.height for r in rows) + 6 * (len(rows) - 1)
sheet = Image.new('RGB', (W, height), (20, 20, 20))
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.height + 6
for quality in range(90, 20, -5):
    buf = io.BytesIO()
    sheet.save(buf, 'WEBP', quality=quality)
    if buf.tell() <= 300_000:
        break
open(out, 'wb').write(buf.getvalue())
print(out, sheet.size, buf.tell(), 'bytes, quality', quality)
