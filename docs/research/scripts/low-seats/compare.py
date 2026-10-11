"""Makes the before and after images of the seated animals for the report of the low seats.

    uv run --no-project --with pillow python -I compare.py <before snapshot> <after snapshot> \
        <before sheet check> <after sheet check> <out dir>

A snapshot folder is the output of `pnpm snapshot` (`species-sheet.webp` and
`play-1440x900.webp`). A sheet check folder is the parent of the folders that
`pnpm sheet-check fox <dir>/fox` and `pnpm sheet-check rabbit <dir>/rabbit` wrote. The script
writes four images into the out dir. In each image, the top row is before and the bottom row is
after.
"""
import os
import sys

from PIL import Image, ImageDraw

before_snap, after_snap, before_sheet, after_sheet, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)

# The species sheet has 6 columns and 4 rows of tiles of 420 x 525 px.
TILE = (420, 525)
ROW_1 = [(0, 0), (0, 1), (0, 2), (0, 3)]  # rabbit, red fox, cat, dog
ROW_2 = [(1, 1), (1, 2), (1, 3), (1, 4), (1, 5)]  # tan fox, mouse, wolf, beaver, pig


def label(image: Image.Image, text: str) -> Image.Image:
    """Adds a band with a text above an image."""
    band = Image.new('RGB', (image.width, 28), (255, 255, 255))
    ImageDraw.Draw(band).text((8, 7), text, fill=(0, 0, 0))
    framed = Image.new('RGB', (image.width, image.height + 28), (255, 255, 255))
    framed.paste(band, (0, 0))
    framed.paste(image, (0, 28))
    return framed


def stack(top: Image.Image, bottom: Image.Image) -> Image.Image:
    """Puts one image above another with a white gap."""
    width = max(top.width, bottom.width)
    canvas = Image.new('RGB', (width, top.height + bottom.height + 8), (255, 255, 255))
    canvas.paste(top, (0, 0))
    canvas.paste(bottom, (0, top.height + 8))
    return canvas


def tiles(path: str, cells: list[tuple[int, int]]) -> Image.Image:
    """Puts the tiles of the species sheet side by side."""
    sheet = Image.open(path).convert('RGB')
    w, h = TILE
    row = Image.new('RGB', (w * len(cells), h))
    for i, (r, c) in enumerate(cells):
        row.paste(sheet.crop((c * w, r * h, c * w + w, r * h + h)), (i * w, 0))
    return row


def crop(path: str, box: tuple[int, int, int, int], scale: float) -> Image.Image:
    """Cuts a part of an image and scales it."""
    image = Image.open(path).convert('RGB').crop(box)
    return image.resize((int(image.width * scale), int(image.height * scale)), Image.LANCZOS)


def both(make, name: str, before_text: str, after_text: str) -> None:
    """Writes the before and after pair of one view."""
    top = label(make(before_snap, before_sheet), before_text)
    bottom = label(make(after_snap, after_sheet), after_text)
    stack(top, bottom).save(os.path.join(out, name))


both(
    lambda snap, _: tiles(os.path.join(snap, 'species-sheet.webp'), ROW_1),
    'species-row-1.png',
    'main: seat 0.92 H',
    'low seats: seat 0.75 H',
)
both(
    lambda snap, _: tiles(os.path.join(snap, 'species-sheet.webp'), ROW_2),
    'species-row-2.png',
    'main: seat 0.92 H',
    'low seats: seat 0.75 H',
)
both(
    lambda snap, _: crop(os.path.join(snap, 'play-1440x900.webp'), (230, 340, 1180, 720), 1.4),
    'play-front-rows.png',
    'main: the default demo, seat 0.92 H',
    'low seats: the default demo, seat 0.75 H',
)
both(
    lambda _, sheet: crop(os.path.join(sheet, 'rabbit', 'rabbit-render.png'), (430, 90, 800, 650), 1.0),
    'views-rabbit-side.png',
    'main: the side view of the rabbit page',
    'low seats: the side view of the rabbit page',
)
