"""Makes the final sheets of the round as WebP files of at most 300 kB: the play frame at the
camera of the user and the default view, main above the branch, and the rest of the red fox and
the rabbit beside the crops of the screenshot of the user. Usage:

    uv run --no-project --with pillow python -I final_sheets.py <camera dir> <default dir> <close dir> <user dir> <out dir>
"""
import os
import sys

from PIL import Image, ImageDraw

camera, default, close, user, out = sys.argv[1:6]


def label(img, text):
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 8 + 7 * len(text), 16), fill='white')
    draw.text((4, 2), text, fill='black')
    return img


def save(sheet, name):
    path = os.path.join(out, name)
    for quality in (82, 74, 66, 58, 50, 42):
        sheet.save(path, quality=quality)
        if os.path.getsize(path) <= 300_000:
            break
    print(path, os.path.getsize(path))


def stack(folder, name, box, width):
    cells = []
    for tree in ('main', 'branch'):
        img = Image.open(os.path.join(folder, f'{tree}-user-camera.png')).convert('RGB').crop(box)
        h = int(img.height * width / img.width)
        cells.append(label(img.resize((width, h)), tree))
    sheet = Image.new('RGB', (width, sum(c.height for c in cells)), 'white')
    y = 0
    for c in cells:
        sheet.paste(c, (0, y))
        y += c.height
    save(sheet, name)


stack(camera, 'user-camera.webp', (0, 140, 1440, 840), 1080)
stack(default, 'default-view.webp', (0, 0, 1440, 830), 1080)

rows = []
for role, crop, title in (('fox-violinist', 'crop-foxes.png', 'red fox'),
                          ('violinist', 'crop-rabbits.png', 'rabbit')):
    h = 300
    cells = []
    img = Image.open(os.path.join(user, crop)).convert('RGB')
    cells.append(label(img.resize((int(img.width * h / img.height), h)), f'user: {title} rest of main'))
    for tree, prefix in (('main', f'{role}-base-rest'), ('branch', f'{role}-rest')):
        for view in ('front', 'left'):
            cell = Image.open(os.path.join(close, f'{prefix}-{view}.png')).convert('RGB')
            cells.append(label(cell.resize((int(cell.width * h / cell.height), h)), f'{tree}: {view}'))
    row = Image.new('RGB', (sum(c.width for c in cells), h), 'white')
    x = 0
    for c in cells:
        row.paste(c, (x, 0))
        x += c.width
    rows.append(row)
width = max(r.width for r in rows)
sheet = Image.new('RGB', (width, sum(r.height for r in rows)), 'white')
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.height
save(sheet, 'rest-beside-user.webp')
