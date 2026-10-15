"""Puts the screenshot of the cat violas of the user beside the rest of the red fox from the
front, the left, and the right (`pnpm close-views fox-violinist`), main above the branch. Usage:

    uv run --no-project --with pillow python -I rest_beside.py <user png> <main dir> <branch dir> <out>
"""
import sys
from PIL import Image, ImageDraw

user, main, branch, out = sys.argv[1:5]
height = 450
cat = Image.open(user).convert('RGB')
cat = cat.resize((int(cat.width * height / cat.height), height))
rows = []
for label, folder in (('main', main), ('branch', branch)):
    views = [Image.open(f'{folder}/fox-violinist-rest-{v}.png').convert('RGB') for v in ('front', 'left', 'right')]
    rows.append((label, views))
width = cat.width + sum(v.width for v in rows[0][1])
sheet = Image.new('RGB', (width, 2 * (height + 20)), 'white')
draw = ImageDraw.Draw(sheet)
for r, (label, views) in enumerate(rows):
    y = r * (height + 20)
    sheet.paste(cat, (0, y + 20))
    draw.text((4, y + 4), 'user: the cat violas at rest', fill='black')
    x = cat.width
    for view in views:
        sheet.paste(view, (x, y + 20))
        x += view.width
    draw.text((cat.width + 4, y + 4), f'{label}: red fox rest, front, left, right', fill='black')
sheet.save(out, quality=85)
print(out, sheet.size)
