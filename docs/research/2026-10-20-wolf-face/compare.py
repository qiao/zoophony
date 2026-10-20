"""Puts the head crops and the lineups of close-views in one compare image: one column for each
state (0e7130db, the round, and the variant with no body change), with the rest front crop, the
rest crop at 60 degrees, the rest side crop, and the lineup beside the red fox and the dog, from
the top down.

    uv run --no-project --with pillow python -I compare.py <head dir> <head variant dir> \
        <lineup dir> <lineup variant dir> <out.webp>

A head dir is `pnpm close-views clarinetist <dir> --target head --base 0e7130db`, and a lineup
dir is `pnpm close-views lineup wolf,fox-red,dog <dir> --base 0e7130db`. The variant dirs take
`--glb <variant GLB>` in place of `--base`.
"""
import sys

from PIL import Image, ImageDraw

head, head_v, line, line_v, out = sys.argv[1:6]
W = 480
columns = [
    ('0e7130db', f'{head}/clarinetist-head-base', f'{line}/lineup-base.png'),
    ('round wolf-face', f'{head}/clarinetist-head', f'{line}/lineup.png'),
    ('no body change', f'{head_v}/clarinetist-head', f'{line_v}/lineup.png'),
]


def fit(path, crop=None):
    im = Image.open(path).convert('RGB')
    if crop:
        w, h = im.size
        im = im.crop((int(w * crop[0]), int(h * crop[1]), int(w * crop[2]), int(h * crop[3])))
    return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)


FACE = (0.1, 0.1, 0.9, 0.7)
cells = [[fit(f'{h}-rest-{v}.png', FACE) for v in ('front', 'front-60', 'side')] + [fit(ln)]
         for _, h, ln in columns]
height = 28 + sum(c.height for c in cells[0])
image = Image.new('RGB', (W * 3, height), (0, 0, 0))
draw = ImageDraw.Draw(image)
for i, (label, _, _) in enumerate(columns):
    draw.text((i * W + 8, 8), label, fill=(255, 255, 255))
    y = 28
    for cell in cells[i]:
        image.paste(cell, (i * W, y))
        y += cell.height
image.save(out, quality=82)
