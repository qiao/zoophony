"""Puts the head crops and the lineups of close-views in one compare image: one column for each
state (980f2bf5, 98875452, and the round), with the rest front crop, the note side crop, and the
lineup beside the red fox and the dog, from the top down.

    uv run --no-project --with pillow python -I compare.py <head-980 dir> <head-988 dir> \
        <lineup-980 dir> <lineup-988 dir> <out.webp>

A head dir is `pnpm close-views clarinetist <dir> --target head --base <ref>`, and a lineup dir
is `pnpm close-views lineup wolf,fox-red,dog <dir> --base <ref>`. The round comes from the
working tree images of the 980f2bf5 dirs.
"""
import sys

from PIL import Image, ImageDraw

head980, head988, line980, line988, out = sys.argv[1:6]
W = 480
columns = [
    ('980f2bf5', f'{head980}/clarinetist-head-base', f'{line980}/lineup-base.png'),
    ('98875452', f'{head988}/clarinetist-head-base', f'{line988}/lineup-base.png'),
    ('round wolf-head', f'{head980}/clarinetist-head', f'{line980}/lineup.png'),
]


def fit(path):
    im = Image.open(path).convert('RGB')
    return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)


cells = [[fit(f'{h}-rest-front.png'), fit(f'{h}-note-side.png'), fit(line)] for _, h, line in columns]
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
