# Makes sheets of image pairs: main on the left, the branch on the right, one row for each cell.
# Usage: uv run --no-project --with pillow python -I pair.py <out.webp> [--scale <s>] <main>:<branch>...
# Each argument after the output names the image of main and the image of the branch, as files
# of `pnpm close-views` with `--base main` (the role views at zoom 2, or `play` frames).
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
args = sys.argv[2:]
scale = 1.0
if args[0] == '--scale':
    scale = float(args[1])
    args = args[2:]
rows = []
for arg in args:
    base, tree = arg.split(':')
    images = [Image.open(name).convert('RGB') for name in (base, tree)]
    images = [i.resize((round(i.width * scale), round(i.height * scale)), Image.LANCZOS) for i in images]
    w = max(i.width for i in images)
    h = max(i.height for i in images)
    pair = Image.new('RGB', (2 * w, h))
    for k, image in enumerate(images):
        pair.paste(image, (k * w, 0))
    draw = ImageDraw.Draw(pair)
    parts = base.split('/')
    label = parts[-1].replace('xylophonist-base-', '').replace('play-base-at-badger-xylophone-', '')
    label = label.replace('.png', '')
    if parts[-2].startswith('time-'):
        label = f'{parts[-2]}, {label}'
    draw.text((6, h - 16), f'main: {label}', fill=(255, 255, 255))
    draw.text((w + 6, h - 16), f'branch: {label}', fill=(255, 255, 255))
    rows.append(pair)
width = max(r.width for r in rows)
sheet = Image.new('RGB', (width, sum(r.height for r in rows)))
y = 0
for row in rows:
    sheet.paste(row, (0, y))
    y += row.height
sheet.save(out, quality=80)
print(out, sheet.size)
