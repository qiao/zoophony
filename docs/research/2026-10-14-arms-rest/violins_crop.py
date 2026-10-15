"""Crops the rabbits and the red foxes of the Beethoven 9 demo from the frames of `frames.ts`, in
the rest before the play and after 6 s of play, main above the branch. Usage:

    uv run --no-project --with pillow python -I violins_crop.py <frames dir> <base label> <out>
"""
import sys
from PIL import Image, ImageDraw

frames, base, out = sys.argv[1:4]
crops = {'rest': (190, 220, 560, 520), 'play': (60, 280, 560, 700)}
cells = []
for tree, label in ((base, f'main ({base})'), ('branch', 'branch')):
    row = []
    for name, box in crops.items():
        img = Image.open(f'{frames}/beethoven-9-{name}-{tree}.png').convert('RGB').crop(box)
        scale = 400 / img.height
        row.append((f'{label}: {name}', img.resize((int(img.width * scale), 400))))
    cells.append(row)
width = sum(c.width for _, c in cells[0])
sheet = Image.new('RGB', (width, 2 * 420), 'white')
draw = ImageDraw.Draw(sheet)
for r, row in enumerate(cells):
    x = 0
    for label, img in row:
        sheet.paste(img, (x, r * 420 + 20))
        draw.text((x + 4, r * 420 + 4), label, fill='black')
        x += img.width
sheet.save(out, quality=82)
