"""Makes the 2x crop pairs of the round `cat-arm` (research of 2026-10-20).

Each pair puts the crop of `main` above the crop of the branch. Usage, from the root of the tree:

    uv run --no-project --with pillow python -I docs/research/2026-10-20-cat-left-arm/pairs.py \
        <out.png> <main.png> <branch.png> <x> <y> <w> <h> [<main.png> <branch.png> <x> <y> <w> <h>]...
"""
import sys

from PIL import Image, ImageDraw


def crop(path, x, y, w, h, label):
    """Crops a frame, scales it 2x, and writes its label at the top left."""
    im = Image.open(path).convert('RGB').crop((x, y, x + w, y + h)).resize((w * 2, h * 2), Image.LANCZOS)
    draw = ImageDraw.Draw(im)
    draw.rectangle((0, 0, 8 * len(label) + 10, 22), fill=(0, 0, 0))
    draw.text((5, 5), label, fill=(255, 255, 255))
    return im


out, rest = sys.argv[1], sys.argv[2:]
columns = []
for k in range(0, len(rest), 6):
    main, branch, x, y, w, h = rest[k:k + 6]
    box = tuple(int(v) for v in (x, y, w, h))
    top = crop(main, *box, 'main')
    bottom = crop(branch, *box, 'branch')
    column = Image.new('RGB', (top.width, top.height * 2))
    column.paste(top, (0, 0))
    column.paste(bottom, (0, top.height))
    columns.append(column)
grid = Image.new('RGB', (sum(c.width for c in columns), max(c.height for c in columns)), (40, 40, 40))
x = 0
for column in columns:
    grid.paste(column, (x, 0))
    x += column.width
grid.save(out)
